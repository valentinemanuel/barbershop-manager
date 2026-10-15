import Dexie, { Table, Transaction } from 'dexie'
import type { BaseDatosLocal } from './baseDatosLocal'
import {
  esContextoActivo,
  prepararTransicion,
  validarSlotSesion,
  type DestinoSesion,
  type IdentidadSesion,
  type ResultadoCAS,
  type SlotSesion,
} from './sesion'

// ---------------------------------------------------------------------------
// T100 (R02a, RF-33/RNF-5 parciales, RNF-6): repositorio inyectado del slot
// de sesión. La instancia `BaseDatosLocal` llega por constructor: SIN
// importar el singleton db.ts, auth, localStorage ni red. Lectura y CAS
// durable viven dentro de UNA transacción `rw` de Dexie con `slotSesion`, y
// la promesa pública SOLO resuelve tras el commit exterior (en Dexie 3.2.7
// la promesa de `db.transaction()` espera a `trans._completion`, que se
// resuelve en `idbtrans.oncomplete`), nunca dentro del callback de la tx.
//
// T101 (R02a, RF-29/RF-33/RNF-5 parciales, RNF-6): composición de guard y
// efectos IDB en UNA MISMA transacción `rw`. `transicionar(..., efectos?)`
// une `slotSesion` + TODAS las tablas declaradas en el alcance de la tx; las
// tablas se validan por IDENTIDAD contra ESTA instancia antes de abrirla, y
// `efectos.aplicar` recibe la MISMA `Transaction` Dexie. Si el CAS es
// distinto se devuelve conflicto SIN invocar `efectos.aplicar` ni escribir;
// cualquier excepción (validación, efectos o escritura del slot) aborta la
// tx entera, efectos incluidos. `conSesionVigente<T>` exige un slot activo
// coincidente (`esContextoActivo`) y ejecuta `trabajo` en ESA MISMA tx: no
// existe check-leer-y-escribir en transacciones separadas. Los callbacks
// solo realizan operaciones IDB: sin fetch, timers, storage ni promesas
// ajenas, y nunca se anidan transacciones independientes.
//
// Defensa contra transacción exterior (Dexie 3.2.7 local): `Dexie.currentTransaction`
// es un getter estático sobre el constructor que devuelve `PSD.trans || null`
// (node_modules/dexie/dist/dexie.js). La zona PSD se instala de forma
// síncrona al entrar en el scope de `db.transaction` y se propaga con las
// promesas de Dexie, así que cualquier llamada a este repositorio hecha
// dentro de un scope transaccional (también tras await de operaciones Dexie)
// se detecta y se rechaza ANTES de leer o escribir: la resolución de una
// subtransacción nunca se confunde con commit durable.
//
// Todo error es genérico y seguro: sin recreate, sin epoch 0 por defecto y
// sin eco de los datos validados; un conflicto solo expone `{tipo:'conflicto'}`.
// ---------------------------------------------------------------------------

export const ERROR_USO_EN_TRANSACCION =
  'Uso del repositorio de sesión desde una transacción abierta'
export const ERROR_SESION_NO_VIGENTE = 'Contexto de sesión no vigente'
export const ERROR_TABLA_DECLARADA = 'Tabla declarada ajena a la base de la sesión'
const ERROR_TRANSICION = 'Transición de sesión inválida'
const ERROR_TRABAJO = 'Trabajo de sesión inválido'

/** Tablas que la composición declara ANTES de abrir la transacción. */
export type TablasDeclaradas = ReadonlyArray<Table<unknown, unknown>>

/**
 * Efectos IDB de una sesión saliente demostrada (CAS ya confirmado dentro de
 * la transacción): `tablas` se declara antes de iniciar y `aplicar` recibe la
 * MISMA `Transaction` Dexie que la transición del slot.
 */
export interface EfectosSesion {
  readonly tablas: TablasDeclaradas
  readonly aplicar: (transaccion: Transaction) => Promise<void>
}

export class RepoSesion {
  private readonly db: BaseDatosLocal

  constructor(db: BaseDatosLocal) {
    this.db = db
  }

  /**
   * Slot durable leído y validado con `validarSlotSesion`. Una fila ausente
   * o corrupta rechaza con el Error genérico del validador (nunca recrea ni
   * asume epoch 0); el caller decide la recuperación explícita.
   */
  async leerSlot(): Promise<SlotSesion> {
    this.rechazarSiEnTransaccion()
    const fila = await this.db.slotSesion.get('actual')
    return validarSlotSesion(fila)
  }

  /**
   * CAS durable sobre los SEIS campos de identidad, dentro de UNA transacción
   * `rw` con `slotSesion` + las tablas declaradas por `efectos`. El esperado
   * que no valide se rechaza con Error genérico antes de abrir la tx (nunca
   * puede convertirse en éxito falso); un esperado válido pero desfasado
   * devuelve `{tipo:'conflicto'}` SIN invocar `efectos.aplicar`, sin escribir
   * nada y sin datos del ganador. `efectos.aplicar` corre en la MISMA tx y
   * recibe la MISMA `Transaction`; si lanza, el abort revierte también la
   * escritura del slot. La promesa pública solo resuelve tras el commit de la
   * transacción exterior.
   */
  async transicionar(
    esperado: IdentidadSesion,
    destino: DestinoSesion,
    aleatorio: string,
    efectos?: EfectosSesion,
  ): Promise<ResultadoCAS> {
    // Defensa y validaciones FUERA de tx, antes de cualquier escritura.
    this.rechazarSiEnTransaccion()
    validarSlotSesion(esperado)
    this.validarDestino(destino)
    if (typeof aleatorio !== 'string' || aleatorio.length === 0) {
      throw new Error(ERROR_TRANSICION)
    }
    if (efectos !== undefined && typeof efectos.aplicar !== 'function') {
      throw new Error(ERROR_TRANSICION)
    }
    // Las tablas declaradas se validan ANTES de abrir la transacción: una
    // tabla de otra instancia DB se rechaza sin escribir nada.
    const alcance = this.construirAlcance(efectos ? efectos.tablas : [])
    return this.db.transaction('rw', alcance, async transaccion => {
      const tabla = transaccion.table<SlotSesion, string>('slotSesion')
      const fila = await tabla.get('actual')
      // Ausente o corrupto => Error genérico; la tx aborta sin reparar.
      const actual = validarSlotSesion(fila)
      const paso = prepararTransicion(actual, esperado, destino, aleatorio)
      if (paso.tipo === 'conflicto') {
        // Sin efectos, sin escrituras y sin identidad del ganador: la rw
        // termina en un commit de solo lectura y la promesa resuelve tras él.
        return paso
      }
      // Orden del contrato: los efectos se PIDEN antes de guardar el slot,
      // pero su promesa se espera DESPUÉS de pedir la escritura del slot.
      // Así, una excepción del callback se propaga con AMBAS mutaciones ya
      // emitidas en ESTA transacción y el abort las revierte juntas; si el
      // `put` del slot fallara, la promesa de efectos queda observada y su
      // error no se pierde (el abort la revierte igualmente).
      const aplicacion = efectos ? efectos.aplicar(transaccion) : null
      if (aplicacion) {
        void aplicacion.catch(() => undefined)
      }
      await tabla.put(paso.slot)
      if (aplicacion) {
        await aplicacion
      }
      return paso
    })
  }

  /**
   * Guard de sesión vigente: dentro de UNA transacción `rw` con `slotSesion`
   * + las tablas declaradas, lee y valida el slot, exige que el contexto esté
   * ACTIVO y coincidente (`esContextoActivo`) y ejecuta `trabajo` en ESA MISMA
   * transacción. Un contexto locked o desfasado rechaza con Error genérico
   * SIN invocar el callback; no hay check-leer-y-escribir en transacciones
   * separadas, por lo que una transición concurrente no puede intercalar el
   * check y la escritura. El resultado solo se devuelve tras el commit
   * exterior.
   */
  async conSesionVigente<T>(
    contexto: IdentidadSesion,
    tablas: TablasDeclaradas,
    trabajo: (transaccion: Transaction) => Promise<T>,
  ): Promise<T> {
    this.rechazarSiEnTransaccion()
    validarSlotSesion(contexto)
    if (typeof trabajo !== 'function') {
      throw new Error(ERROR_TRABAJO)
    }
    const alcance = this.construirAlcance(tablas)
    return this.db.transaction('rw', alcance, async transaccion => {
      const tabla = transaccion.table<SlotSesion, string>('slotSesion')
      const fila = await tabla.get('actual')
      const actual = validarSlotSesion(fila)
      if (!esContextoActivo(contexto, actual)) {
        // Sin callback y sin escrituras: la rw termina en un commit de solo
        // lectura y la promesa resuelve tras él.
        throw new Error(ERROR_SESION_NO_VIGENTE)
      }
      return await trabajo(transaccion)
    })
  }

  private rechazarSiEnTransaccion(): void {
    if (Dexie.currentTransaction) {
      throw new Error(ERROR_USO_EN_TRANSACCION)
    }
  }

  // Alcance de la transacción: `slotSesion` + TODAS las tablas declaradas,
  // sin duplicados, resueltas a SUS NOMBRES de store. La pertenencia se
  // comprueba por IDENTIDAD de instancia (`tabla.db === this.db`, una tabla
  // de otra DB con el mismo nombre sigue siendo ajena) y por nombre de store
  // en esta base. En Dexie 3.2.7 `db.<tabla>` y `db.tables[i]` son envolventes
  // distintas del mismo store (la crea `setApiOnPlace`), por eso NO se exige
  // identidad con `db.tables[i]`. El rechazo ocurre antes de abrir la
  // transacción, es decir, antes de escribir.
  private construirAlcance(tablas: TablasDeclaradas): string[] {
    if (!Array.isArray(tablas)) {
      throw new Error(ERROR_TABLA_DECLARADA)
    }
    const nombres: string[] = ['slotSesion']
    for (const tabla of tablas) {
      if (!tabla || typeof tabla.name !== 'string' || tabla.db !== this.db) {
        throw new Error(ERROR_TABLA_DECLARADA)
      }
      if (!this.db.tables.some(propia => propia.name === tabla.name)) {
        throw new Error(ERROR_TABLA_DECLARADA)
      }
      if (!nombres.includes(tabla.name)) {
        nombres.push(tabla.name)
      }
    }
    return nombres
  }

  // El destino se valida aquí con el MISMO criterio del slot resultante
  // (estado/actor emparejados y rangos seguros), con Error genérico propio
  // de transición y fuera de la tx, antes de escribir.
  private validarDestino(destino: DestinoSesion): void {
    const crudo = destino as unknown as Record<string, unknown> | null
    if (typeof crudo !== 'object' || crudo === null) {
      throw new Error(ERROR_TRANSICION)
    }
    const estado = crudo['estado']
    const actorId = crudo['actorId']
    const valido =
      (estado === 'activa' && typeof actorId === 'number' &&
        Number.isSafeInteger(actorId) && actorId >= 1) ||
      (estado === 'locked' && actorId === null)
    if (!valido) {
      throw new Error(ERROR_TRANSICION)
    }
  }
}
