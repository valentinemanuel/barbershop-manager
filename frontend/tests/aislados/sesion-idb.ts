// T96: contrato sintético. T97 añade imports de la CLASE extraída, nunca
// del singleton db.ts (que sí instanciaría barberia_db). T98 usa Dexie para
// fabricar el legacy con el layout exacto de una instalación real. T99
// importa las decisiones puras nuevas de sesion.ts (sin DB/auth/storage).
// T100 importa el repositorio inyectado (sin singleton/auth/storage/red).
// T101 compone guard + efectos IDB en la MISMA transacción rw del repo.
// T102 verifica fallo cerrado y no reparación destructiva con fallos IDB
// controlados inyectados en fixtures nativas (borrado/escritura cruda del
// singleton y operación de lectura rota), nunca simulación con Map ni spies.
import Dexie from 'dexie'
import { BaseDatosLocal, type CorteLocal, type MapeoOperacionLocal, type OperacionCorteLocal, type SlotSesionLocal } from '../../src/services/baseDatosLocal'
import {
  instalarSesion, invalidarSesion, esRespuestaVigente, perteneceALaCuenta,
  validarSlotSesion, coincideSlot, esContextoActivo, prepararTransicion,
  type AlmacenSesion, type SlotSesion, type IdentidadSesion, type DestinoSesion,
  type ResultadoCAS,
} from '../../src/services/sesion'
import {
  RepoSesion,
  ERROR_USO_EN_TRANSACCION,
  ERROR_SESION_NO_VIGENTE,
  ERROR_TABLA_DECLARADA,
} from '../../src/services/repoSesion'

function afirmar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje)
}

// T97: la clase abre sin singleton ni nombre fijo; isOpen() permanece false
// hasta la primera operación IDB (Dexie es lazy) y refleja los stores v1/v2.
// T98 actualiza la aserción temporal de head/tables al nuevo schema v3.
async function compatibilidad(corrida: string): Promise<void> {
  const nombre = `r02_prueba_${corrida}`
  const base = new BaseDatosLocal(nombre, () => `0:${crypto.randomUUID()}`)
  afirmar(base.name === nombre, 'La clase no conserva el nombre explícito')
  afirmar(!base.isOpen(), 'Instanciar abrió la base (no lazy)')
  afirmar(base.verno === 3, 'Head Dexie esperado 3 tras T98')
  const tablas = base.tables.map(tabla => tabla.name).sort()
  const esperadas = ['consumibles', 'cortes', 'mapeoOperaciones', 'outboxOperaciones',
    'productos', 'servicios', 'slotSesion'].sort()
  afirmar(JSON.stringify(tablas) === JSON.stringify(esperadas),
    `Stores v3 incompatibles: ${JSON.stringify(tablas)}`)
  const fila: CorteLocal = {
    barbero_id: 1, servicio_id: 2, precio: 100, porcentaje_barbero: 10,
    parte_barbero: 10, metodo_pago: 'efectivo', fecha: '2026-10-09',
    sincronizado: false,
  }
  afirmar(typeof fila.parte_barbero === 'number', 'Tipo de CorteLocal alterado')
  base.close()
  afirmar(!base.isOpen(), 'close() dejó la base abierta')
  await limpiar(nombre, corrida)
}

function validarNombre(nombre: string, corrida: string): void {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  if (!nombre || nombre === 'barberia_db' || !uuid.test(corrida) ||
      nombre !== `r02_prueba_${corrida}`) throw new Error('Nombre de prueba no autorizado')
}

async function abrir(nombre: string, corrida: string): Promise<IDBDatabase> {
  validarNombre(nombre, corrida)
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(nombre, 1)
    solicitud.onupgradeneeded = () => solicitud.result.createObjectStore('smoke')
    solicitud.onsuccess = () => resolver(solicitud.result)
    solicitud.onerror = () => rechazar(new Error('No se pudo abrir IDB sintético'))
    solicitud.onblocked = () => rechazar(new Error('Apertura sintética bloqueada'))
  })
}

function terminar(tx: IDBTransaction, abortada: boolean): Promise<void> {
  return new Promise((resolver, rechazar) => {
    tx.oncomplete = () => abortada ? rechazar(new Error('Faltó rollback')) : resolver()
    tx.onabort = () => abortada ? resolver() : rechazar(new Error('Commit sintético abortado'))
    tx.onerror = () => { /* onabort determina el resultado durable. */ }
  })
}

async function escribir(nombre: string, corrida: string, abortada: boolean): Promise<void> {
  const db = await abrir(nombre, corrida)
  try {
    const tx = db.transaction('smoke', 'readwrite')
    const final = terminar(tx, abortada)
    const solicitud = tx.objectStore('smoke').put(abortada ? 'no durable' : 'persistido', 'dato')
    // Abortar después de una escritura IDB real, no antes de crear la solicitud.
    if (abortada) solicitud.onsuccess = () => tx.abort()
    await final
  } finally { db.close() }
}

async function leer(nombre: string, corrida: string): Promise<void> {
  const db = await abrir(nombre, corrida)
  try {
    const tx = db.transaction('smoke', 'readonly')
    const final = terminar(tx, false)
    const valor: unknown = await new Promise((resolver, rechazar) => {
      const solicitud = tx.objectStore('smoke').get('dato')
      solicitud.onsuccess = () => resolver(solicitud.result as unknown)
      solicitud.onerror = () => rechazar(new Error('Lectura sintética fallida'))
    })
    await final
    afirmar(valor === 'persistido', 'Persistencia/reapertura/rollback incorrectos')
  } finally { db.close() }
}

async function limpiar(nombre: string, corrida: string): Promise<void> {
  validarNombre(nombre, corrida)
  await new Promise<void>((resolver, rechazar) => {
    const solicitud = indexedDB.deleteDatabase(nombre)
    solicitud.onsuccess = () => resolver()
    solicitud.onerror = () => rechazar(new Error('Cleanup sintético fallido'))
    solicitud.onblocked = () => rechazar(new Error('Cleanup bloqueado por conexión abierta'))
  })
  const restantes = await indexedDB.databases()
  afirmar(!restantes.some(db => db.name === nombre), 'Cleanup no eliminó DB propia')
}

function negativas(corrida: string): void {
  for (const nombre of ['', 'barberia_db', `r02_prueba_${crypto.randomUUID()}`]) {
    let rechazado = false
    try { validarNombre(nombre, corrida) } catch { rechazado = true }
    afirmar(rechazado, 'Nombre prohibido aceptado')
  }
  afirmar(typeof indexedDB.open === 'function', 'IndexedDB nativo ausente')
}

// T98: base v2 legada con datos y base nueva; ambas conservan datos y
// crean un único slot locked con la generación inyectada por el caller.
// El legacy se fabrica CON Dexie (versiones 1 y 2 históricas), no a mano,
// para reproducir el layout exacto de una instalación real previa.
async function abrirLegacy(corrida: string): Promise<string> {
  validarNombre(`r02_prueba_${corrida}`, corrida)
  const nombre = `r02_prueba_${corrida}`
  const legacy = new Dexie(nombre)
  legacy.version(1).stores({
    cortes: '++id, barbero_id, servicio_id, fecha, sincronizado',
    servicios: 'id, nombre, activo',
    productos: 'id, nombre, activo',
    consumibles: 'id, nombre, activo',
  })
  legacy.version(2).stores({
    cortes: '++id, barbero_id, servicio_id, fecha, sincronizado',
    servicios: 'id, nombre, activo',
    productos: 'id, nombre, activo',
    consumibles: 'id, nombre, activo',
    outboxOperaciones: 'operacionUuid, actorId, estado, instanteCambio',
    mapeoOperaciones: 'operacionUuid',
  })
  await legacy.open()
  await legacy.transaction('rw',
    [legacy.table('cortes'), legacy.table('outboxOperaciones'), legacy.table('mapeoOperaciones')],
    async transaccion => {
      await transaccion.table('cortes').add({
        barbero_id: 7, servicio_id: 3, precio: 1000, porcentaje_barbero: 30,
        parte_barbero: 300, metodo_pago: 'efectivo', fecha: '2026-10-08',
        sincronizado: false,
      })
      for (const estado of ['pendiente', 'enviando', 'revision']) {
        await transaccion.table('outboxOperaciones').add({
          operacionUuid: `op-${estado}`, corteUuid: `corte-${estado}`, actorId: 7,
          servicioId: 3, metodoPago: 'efectivo', precioCentavos: 1000,
          porcentajeCentesimas: 30, modoCaptura: 'offline',
          instanteCambio: '2026-10-08T10:00:00Z', momentoReal: '2026-10-08T10:00:00Z',
          estado, intento: 0, actualizadoEn: '2026-10-08T10:00:00Z',
        })
      }
      await transaccion.table('mapeoOperaciones').add({
        operacionUuid: 'op-pendiente', corteIdServidor: 41,
      })
    })
  legacy.close()
  return nombre
}

async function inspeccionarCruda(nombre: string, tienda: string): Promise<number> {
  return new Promise<number>((resolver, rechazar) => {
    const solicitud = indexedDB.open(nombre)
    solicitud.onsuccess = () => {
      const base = solicitud.result
      const transaccion = base.transaction(tienda, 'readonly')
      const conteo = transaccion.objectStore(tienda).count()
      transaccion.oncomplete = () => {
        resolver(conteo.result)
        base.close()
      }
      transaccion.onerror = () => rechazar(new Error(`No se pudo contar ${tienda}`))
    }
    solicitud.onerror = () => rechazar(new Error('No se pudo inspeccionar la base cruda'))
  })
}

async function migracion(): Promise<void> {
  // Vía 1: legacy v1 (solo tablas de corte, sin outbox/mapeo) → 3.
  const corridaV1 = crypto.randomUUID()
  const nombreV1 = `r02_prueba_${corridaV1}`
  validarNombre(nombreV1, corridaV1)
  const legadoV1 = new Dexie(nombreV1)
  legadoV1.version(1).stores({
    cortes: '++id, barbero_id, servicio_id, fecha, sincronizado',
    servicios: 'id, nombre, activo',
    productos: 'id, nombre, activo',
    consumibles: 'id, nombre, activo',
  })
  await legadoV1.open()
  await legadoV1.table('cortes').add({
    barbero_id: 4, servicio_id: 9, precio: 500, porcentaje_barbero: 20,
    parte_barbero: 100, metodo_pago: 'tarjeta', fecha: '2026-09-01',
    sincronizado: true,
  })
  legadoV1.close()
  afirmar(await inspeccionarCruda(nombreV1, 'cortes') === 1,
    'El fixture v1 no dejó 1 corte antes del upgrade')
  const baseV1 = new BaseDatosLocal(nombreV1, () => '0:v1-test')
  try {
    await baseV1.open()
    afirmar(baseV1.verno === 3, 'El upgrade v1 a 3 no alcanzó el head 3')
    const slot = await baseV1.table<SlotSesionLocal, string>('slotSesion').get('actual')
    afirmar(slot !== undefined && slot.clave === 'actual' && slot.version === 1,
      `El upgrade v1 no creó el slot: ${JSON.stringify(slot)}`)
    afirmar(slot.estado === 'locked' && slot.actorId === null && slot.epoch === 0,
      `Slot v1 no locked/actor null/epoch0: ${JSON.stringify(slot)}`)
    afirmar(slot.generacion === '0:v1-test',
      `Slot v1 sin la generación inyectada: ${slot.generacion}`)
    const cortesV1 = await baseV1.table('cortes').toArray()
    afirmar(cortesV1.length === 1 && cortesV1[0].barbero_id === 4 &&
      cortesV1[0].precio === 500 && cortesV1[0].sincronizado === true,
      `El upgrade v1 alteró los cortes: ${JSON.stringify(cortesV1)}`)
    afirmar(await inspeccionarCruda(nombreV1, 'outboxOperaciones') === 0,
      'El upgrade v1 inventó filas de outbox')
  } finally {
    baseV1.close()
  }
  await limpiar(nombreV1, corridaV1)

  // Vía 2: legacy v2 con outbox/mapping → 3.
  const corridaLegacy = crypto.randomUUID()
  const nombreLegacy = await abrirLegacy(corridaLegacy)
  afirmar(await inspeccionarCruda(nombreLegacy, 'outboxOperaciones') === 3,
    'El fixture legacy no dejó 3 filas de outbox antes del upgrade')
  afirmar(await inspeccionarCruda(nombreLegacy, 'cortes') === 1,
    'El fixture legacy no dejó 1 corte antes del upgrade')
  const legado = new BaseDatosLocal(nombreLegacy, () => '0:legacy-test')
  try {
    await legado.open()
    afirmar(legado.verno === 3, 'El upgrade no alcanzó el head 3')
    const slot = await legado.table<SlotSesionLocal, string>('slotSesion').get('actual')
    afirmar(slot !== undefined, 'El upgrade no creó el slot inicial')
    afirmar(slot.clave === 'actual' && slot.version === 1,
      'El slot no usa clave/version del contrato')
    afirmar(slot.estado === 'locked' && slot.actorId === null && slot.epoch === 0,
      `El slot inicial no está locked/actor null/epoch0: ${JSON.stringify(slot)}`)
    afirmar(slot.generacion === '0:legacy-test',
      `El slot no usa la generación inyectada: ${slot.generacion}`)
    const cortes = await legado.table('cortes').toArray()
    afirmar(cortes.length === 1 && cortes[0].barbero_id === 7 && cortes[0].precio === 1000,
      `El upgrade alteró cortes legados: ${JSON.stringify(cortes)}`)
    const outbox = await legado.table('outboxOperaciones').toArray()
    const estados = outbox.map(fila => fila.estado).sort()
    afirmar(JSON.stringify(estados) === JSON.stringify(['enviando', 'pendiente', 'revision']),
      `El upgrade alteró el outbox legado: ${JSON.stringify(estados)}`)
    const mapeo = await legado.table('mapeoOperaciones').toArray()
    afirmar(mapeo.length === 1 && mapeo[0].corteIdServidor === 41,
      'El upgrade alteró el mapeo legado')
  } finally {
    legado.close()
  }
  const reabierta = new BaseDatosLocal(nombreLegacy, () => '0:regenerada')
  try {
    await reabierta.open()
    const slot = await reabierta.table<SlotSesionLocal, string>('slotSesion').get('actual')
    afirmar(slot !== undefined && slot.generacion === '0:legacy-test',
      `Reabrir regeneró el slot: ${JSON.stringify(slot)}`)
  } finally {
    reabierta.close()
  }
  await limpiar(nombreLegacy, corridaLegacy)

  const corridaNueva = crypto.randomUUID()
  const nombreNueva = `r02_prueba_${corridaNueva}`
  const nueva = new BaseDatosLocal(nombreNueva, () => '0:fresh-test')
  try {
    await nueva.open()
    afirmar(nueva.verno === 3, 'La creación nueva no alcanzó el head 3')
    const slot = await nueva.table<SlotSesionLocal, string>('slotSesion').get('actual')
    afirmar(slot !== undefined && slot.clave === 'actual' && slot.version === 1,
      `populate no creó el slot inicial: ${JSON.stringify(slot)}`)
    afirmar(slot.estado === 'locked' && slot.actorId === null && slot.epoch === 0,
      `Slot fresh no locked/actor null/epoch0: ${JSON.stringify(slot)}`)
    afirmar(slot.generacion === '0:fresh-test',
      `Slot fresh sin la generación inyectada: ${slot.generacion}`)
    const tablas = await new Promise<string[]>((resolver, rechazar) => {
      const solicitud = indexedDB.open(nombreNueva)
      solicitud.onsuccess = () => {
        const nombres = solicitud.result.objectStoreNames
        resolver(Array.from(nombres))
        solicitud.result.close()
      }
      solicitud.onerror = () => rechazar(new Error('No se pudo inspeccionar la nueva'))
    })
    afirmar(!tablas.includes('usuarios') && !tablas.includes('sesion'),
      `La creación nueva inventó tablas ajenas: ${JSON.stringify(tablas)}`)
  } finally {
    nueva.close()
  }
  await limpiar(nombreNueva, corridaNueva)
}

// T99: base cruda mutable para la matriz de validación strict de unknown.
const SLOT_CERO: Record<string, unknown> = {
  clave: 'actual', version: 1, generacion: '0:fixture-fijo', epoch: 0,
  estado: 'locked', actorId: null,
}

function conmutar(campos: Record<string, unknown>): Record<string, unknown> {
  return { ...SLOT_CERO, ...campos }
}

// Toda entrada inválida debe rechazarse con el MISMO mensaje genérico, sin
// eco de ningún dato de la entrada (credenciales, IDs, epoch, etc.).
function rechaza(entrada: unknown, detalle: string): void {
  let capturado: string | null = null
  try {
    validarSlotSesion(entrada)
  } catch (error) {
    capturado = error instanceof Error ? error.message : 'sin-Error'
  }
  afirmar(capturado !== null, `Entrada invalida aceptada: ${detalle}`)
  afirmar(capturado === 'Slot de sesión inválido',
    `Mensaje no generico (${String(capturado)}) en: ${detalle}`)
}

function identidadDe(slot: SlotSesion): IdentidadSesion {
  return {
    clave: slot.clave,
    version: slot.version,
    generacion: slot.generacion,
    epoch: slot.epoch,
    estado: slot.estado,
    actorId: slot.actorId,
  }
}

// T99: identidad, generación y decisiones puras del slot. Sin reloj, token
// ni rol: la parte aleatoria llega inyectada por el caller.
function identidad(): void {
  // 1) Validación estricta de unknown: tipos inválidos, campos extra,
  //    booleanos/decimales/seguros fuera de rango; siempre Error genérico.
  rechaza(null, 'null')
  rechaza(undefined, 'undefined')
  rechaza('slot', 'string')
  rechaza(42, 'numero')
  rechaza(true, 'booleano')
  rechaza([], 'arreglo')
  rechaza({}, 'objeto vacio')
  rechaza({ token: 'credencial-secreta' }, 'solo credencial extra')
  rechaza({ clave: 'actual', version: 1, epoch: 0, estado: 'locked', actorId: null }, 'sin generacion')
  rechaza({ clave: 'actual', version: 1, generacion: '0:x', epoch: 0, estado: 'locked' }, 'sin actorId')
  rechaza(conmutar({ clave: 'otra' }), 'clave ajena')
  rechaza(conmutar({ version: 2 }), 'version 2')
  rechaza(conmutar({ version: '1' }), 'version texto')
  rechaza(conmutar({ generacion: 42 }), 'generacion numero')
  rechaza(conmutar({ generacion: '' }), 'generacion vacia')
  rechaza(conmutar({ epoch: '0' }), 'epoch texto')
  rechaza(conmutar({ epoch: 1.5 }), 'epoch decimal')
  rechaza(conmutar({ epoch: -1 }), 'epoch negativo')
  rechaza(conmutar({ epoch: Number.NaN }), 'epoch NaN')
  rechaza(conmutar({ epoch: Number.POSITIVE_INFINITY }), 'epoch infinito')
  rechaza(conmutar({ epoch: Number.MAX_SAFE_INTEGER + 1 }), 'epoch inseguro')
  rechaza(conmutar({ epoch: true }), 'epoch booleano')
  rechaza(conmutar({ estado: 'inactiva' }), 'estado desconocido')
  rechaza(conmutar({ estado: 'activa' }), 'activa sin actor')
  rechaza(conmutar({ estado: 'activa', actorId: null }), 'activa con actor null')
  rechaza(conmutar({ estado: 'activa', actorId: 0 }), 'actor 0')
  rechaza(conmutar({ estado: 'activa', actorId: -3 }), 'actor negativo')
  rechaza(conmutar({ estado: 'activa', actorId: 2.5 }), 'actor decimal')
  rechaza(conmutar({ estado: 'activa', actorId: true }), 'actor booleano')
  rechaza(conmutar({ estado: 'activa', actorId: Number.MAX_SAFE_INTEGER + 1 }), 'actor inseguro')
  rechaza(conmutar({ estado: 'locked', actorId: 1 }), 'locked con actor')
  rechaza(conmutar({ estado: 'locked', actorId: undefined }), 'locked con actor undefined')
  rechaza(conmutar({ estado: 'locked', actorId: '7' }), 'locked con actor texto')
  rechaza(conmutar({ token: 'credencial-secreta' }), 'credencial extra')
  rechaza(conmutar({ rol: 'dueno', usuario: 'ana' }), 'rol y usuario extra')
  rechaza(conmutar({ actualizadoEn: '2026-10-09T00:00:00Z' }), 'timestamp extra')

  // 2) Ambas variantes válidas y fronteras seguras de epoch/actor.
  const bloqueado = validarSlotSesion(SLOT_CERO)
  afirmar(bloqueado.estado === 'locked' && bloqueado.actorId === null &&
    bloqueado.epoch === 0 && bloqueado.generacion === '0:fixture-fijo',
    'El slot bloqueado base no validó')
  const activo = validarSlotSesion(conmutar({ estado: 'activa', actorId: 7 }))
  afirmar(activo.estado === 'activa' && activo.actorId === 7 && activo.epoch === 0,
    'El slot activo base no validó')
  const enTope = validarSlotSesion(conmutar({
    estado: 'activa', actorId: Number.MAX_SAFE_INTEGER, epoch: Number.MAX_SAFE_INTEGER,
  }))
  afirmar(enTope.epoch === Number.MAX_SAFE_INTEGER && enTope.actorId === Number.MAX_SAFE_INTEGER,
    'Las fronteras seguras rechazaron un valor válido')

  // 3) Copia sin alias: mutar la entrada no muta la salida ni viceversa.
  const crudo = conmutar({ estado: 'activa', actorId: 3, generacion: '4:alias', epoch: 4 })
  const copia = validarSlotSesion(crudo)
  afirmar(!Object.is(copia, crudo), 'La validación devolvió la misma referencia')
  crudo['epoch'] = 55
  afirmar(copia.epoch === 4, 'Mutar la entrada alteró la salida')
  const copiaMutable = copia as unknown as { epoch: number }
  copiaMutable.epoch = 66
  afirmar(Number(crudo['epoch']) === 55, 'Mutar la salida alteró la entrada')

  // 4) CAS con esperado completo: UN campo distinto de los seis => conflicto.
  const ganador = validarSlotSesion(conmutar({
    estado: 'activa', actorId: 7, generacion: '2:uuid-ganador', epoch: 2,
  }))
  const esperado: IdentidadSesion = identidadDe(ganador)
  afirmar(coincideSlot(ganador, esperado), 'CAS rechazó identidad idéntica')
  afirmar(esContextoActivo(esperado, ganador), 'Contexto idéntico no quedó activo')
  const variaciones: Array<{ detalle: string; datos: Record<string, unknown> }> = [
    { detalle: 'clave', datos: { clave: 'otra' } },
    { detalle: 'version', datos: { version: 2 } },
    { detalle: 'generacion', datos: { generacion: '2:otro-uuid' } },
    { detalle: 'epoch', datos: { epoch: 1 } },
    { detalle: 'estado', datos: { estado: 'locked' } },
    { detalle: 'actorId', datos: { actorId: 9 } },
  ]
  for (const variacion of variaciones) {
    const variado = { ...esperado, ...variacion.datos } as unknown as IdentidadSesion
    afirmar(!coincideSlot(ganador, variado), `CAS ignora ${variacion.detalle}`)
    const paso = prepararTransicion(ganador, variado, { estado: 'locked', actorId: null }, 'perdedor')
    afirmar(paso.tipo === 'conflicto', `Transición confirmada con ${variacion.detalle} distinto`)
  }

  // 5) El conflicto solo expone "tipo": ni slot ni datos del ganador.
  const conflicto = prepararTransicion(
    ganador,
    { ...esperado, epoch: 1 } as unknown as IdentidadSesion,
    { estado: 'locked', actorId: null },
    'perdedor-uuid',
  )
  afirmar(conflicto.tipo === 'conflicto', 'El conflicto esperado no llegó')
  const claves = Object.keys(conflicto)
  afirmar(claves.length === 1 && claves[0] === 'tipo',
    `El conflicto expone campos: ${JSON.stringify(claves)}`)
  const serial = JSON.stringify(conflicto)
  afirmar(!serial.includes('slot') && !serial.includes('uuid-ganador') &&
    !serial.includes('actorId') && !serial.includes('epoch') && !serial.includes('7'),
    `El conflicto revela datos del ganador: ${serial}`)

  // 6) Transición a la MISMA cuenta/estado también rota la generación.
  const rotado = prepararTransicion(ganador, esperado, { estado: 'activa', actorId: 7 }, 'rotado-uuid')
  if (rotado.tipo !== 'confirmada') throw new Error('Transición misma cuenta sin confirmar')
  afirmar(rotado.slot.epoch === 3 && rotado.slot.generacion === '3:rotado-uuid',
    `Rotación con epoch/generación erróneos: ${rotado.slot.generacion}`)
  afirmar(rotado.slot.generacion !== ganador.generacion, 'Misma cuenta no rotó generación')
  afirmar(rotado.slot.estado === 'activa' && rotado.slot.actorId === 7, 'Rotación alteró el destino')
  afirmar(!Object.is(rotado.slot, ganador), 'La transición aliasó el slot de entrada')

  // 7) ABA imposible: A->B->A con el MISMO string aleatorio siempre rota,
  //    porque el prefijo es el epoch+1 monotónico.
  let enCadena: SlotSesion = validarSlotSesion(SLOT_CERO)
  const generaciones: string[] = [enCadena.generacion]
  const destinos: DestinoSesion[] = [
    { estado: 'activa', actorId: 7 },
    { estado: 'locked', actorId: null },
    { estado: 'activa', actorId: 7 },
  ]
  for (const destino of destinos) {
    const paso = prepararTransicion(enCadena, identidadDe(enCadena), destino, 'uuid-repetido')
    if (paso.tipo !== 'confirmada') throw new Error('Transición ABA sin confirmar')
    enCadena = paso.slot
    generaciones.push(paso.slot.generacion)
  }
  afirmar(generaciones.join('|') ===
    '0:fixture-fijo|1:uuid-repetido|2:uuid-repetido|3:uuid-repetido',
  `Generaciones ABA erróneas: ${generaciones.join('|')}`)
  afirmar(new Set(generaciones).size === generaciones.length, 'ABA: generación reutilizada')
  afirmar(enCadena.estado === 'activa' && enCadena.actorId === 7 && enCadena.epoch === 3,
    'El ciclo ABA no terminó en la cuenta A activa')

  // 8) Un contexto solo está activo si coincide Y el slot está activo.
  const saliendo = validarSlotSesion(conmutar({
    estado: 'locked', actorId: null, generacion: '5:salida', epoch: 5,
  }))
  afirmar(!esContextoActivo(esperado, saliendo), 'Contexto stale dio activo en locked')
  const otroActor = validarSlotSesion(conmutar({
    estado: 'activa', actorId: 9, generacion: '2:uuid-ganador', epoch: 2,
  }))
  afirmar(!esContextoActivo(esperado, otroActor), 'Contexto de otro actor activo')
  const generacionNueva = validarSlotSesion(conmutar({
    estado: 'activa', actorId: 7, generacion: '8:rotada', epoch: 8,
  }))
  afirmar(!esContextoActivo(esperado, generacionNueva), 'Contexto viejo activo tras rotar')

  // 9) MAX_SAFE_INTEGER: rechazo genérico sin wrap, sin éxito simulado y
  //    sin añadir una tercera variante a ResultadoCAS (contrato de dos).
  const agotado = validarSlotSesion(conmutar({
    epoch: Number.MAX_SAFE_INTEGER, estado: 'activa', actorId: 7,
    generacion: `${Number.MAX_SAFE_INTEGER}:tope`,
  }))
  let mensajeTope: string | null = null
  try {
    prepararTransicion(agotado, identidadDe(agotado), { estado: 'locked', actorId: null }, 'nuevo-uuid')
  } catch (error) {
    mensajeTope = error instanceof Error ? error.message : 'sin-Error'
  }
  afirmar(mensajeTope === 'Transición de sesión rechazada: epoch al máximo seguro',
    `Tope sin rechazo genérico: ${String(mensajeTope)}`)
  afirmar(agotado.epoch === Number.MAX_SAFE_INTEGER && agotado.generacion.endsWith(':tope'),
    'El rechazo del tope alteró el slot')
  const topeDesfasado = prepararTransicion(
    agotado,
    { ...identidadDe(agotado), epoch: 0 } as unknown as IdentidadSesion,
    { estado: 'locked', actorId: null },
    'nuevo-uuid',
  )
  afirmar(topeDesfasado.tipo === 'conflicto', 'CAS desfasado en el tope no fue conflicto')
}

// T99: las funciones legacy conservan su semántica exacta; R02a no las
// endurece por el slot locked. Sin leerSesionNavegador: el runner prohíbe
// leer/escribir localStorage.
function legacy(): void {
  const datos = new Map<string, string>()
  const almacen: AlmacenSesion = {
    get: (clave) => datos.get(clave) ?? null,
    set: (clave, valor) => { datos.set(clave, valor) },
    del: (clave) => { datos.delete(clave) },
  }
  const ahora = new Date('2026-10-09T12:00:00.000Z')
  const primera = instalarSesion(almacen, 7, 'barbero', ahora)
  afirmar(primera.titularId === 7 && primera.generacion === 1 &&
    primera.ultimoRol === 'barbero' && primera.actualizadoEn === ahora.toISOString(),
  'instalarSesion alteró la primera sesión')
  const misma = instalarSesion(almacen, 7, 'barbero', ahora)
  afirmar(misma.titularId === 7 && misma.generacion === 1,
    'instalarSesion cambió la generación con el mismo titular')
  const otra = instalarSesion(almacen, 9, 'dueno', ahora)
  afirmar(otra.titularId === 9 && otra.generacion === 2,
    'instalarSesion no subió la generación con otro titular')
  const invalidada = invalidarSesion(almacen, ahora)
  afirmar(invalidada.titularId === null && invalidada.generacion === 3 &&
    invalidada.ultimoRol === 'dueno', 'invalidarSesion alteró su semántica')
  afirmar(esRespuestaVigente({ titularId: 7, generacion: 1 }, { titularId: 7, generacion: 1 }),
    'esRespuestaVigente rechazó vigencia real')
  afirmar(!esRespuestaVigente({ titularId: 7, generacion: 0 }, { titularId: 7, generacion: 1 }),
    'esRespuestaVigente aceptó generación vieja')
  afirmar(!esRespuestaVigente({ titularId: null, generacion: 3 }, { titularId: null, generacion: 3 }),
    'esRespuestaVigente aceptó sin titular')
  afirmar(!esRespuestaVigente({ titularId: 7, generacion: 1 }, { titularId: 9, generacion: 1 }),
    'esRespuestaVigente mezcló titulares')
  afirmar(perteneceALaCuenta(7, 7), 'perteneceALaCuenta rechazó su actor')
  afirmar(!perteneceALaCuenta(7, 9), 'perteneceALaCuenta aceptó otro actor')
  afirmar(!perteneceALaCuenta(7, null), 'perteneceALaCuenta aceptó sesión sin titular')
}

// T100: lectura y CAS durable con competencia real. Las conexiones de cada
// página son instancias independientes de BaseDatosLocal sobre el MISMO
// origen; el snapshot esperado viaja intacto entre páginas para que las dos
// compitan con identidad idéntica sobre IndexedDB nativo (no Map ni storage).

interface PreparacionRepo {
  corrida: string
  nombre: string
  snapshot: IdentidadSesion
}

// Crea la DB de competencia (populate deja locked epoch0) y devuelve el
// snapshot inicial que AMBAS páginas usarán como esperado. Cierra su
// conexión: el slot leído es durable, no una caché de instancia.
async function repoPreparar(corrida: string): Promise<PreparacionRepo> {
  const nombre = `r02_prueba_${corrida}`
  validarNombre(nombre, corrida)
  const base = new BaseDatosLocal(nombre, () => '0:repo-inicio')
  try {
    const slot = await new RepoSesion(base).leerSlot()
    afirmar(slot.estado === 'locked' && slot.actorId === null && slot.epoch === 0,
      `repoPreparar: slot inicial alterado ${JSON.stringify(slot)}`)
    afirmar(slot.generacion === '0:repo-inicio',
      `repoPreparar: generacion inicial alterada ${slot.generacion}`)
    return { corrida, nombre, snapshot: identidadDe(slot) }
  } finally {
    base.close()
  }
}

interface ResultadoRepo {
  resultado: ResultadoCAS
  lectura: IdentidadSesion
}

// Transición CAS desde UNA conexión propia y lectura inmediata del slot
// durable: el ganador confirma epoch+1; el perdedor recibe solo conflicto y
// su lectura posterior demuestra que NO escribió ni sobrescribió al ganador.
async function repoTransicionar(
  corrida: string,
  esperadoCrudo: unknown,
  destinoCrudo: unknown,
  aleatorio: string,
): Promise<ResultadoRepo> {
  const nombre = `r02_prueba_${corrida}`
  validarNombre(nombre, corrida)
  const base = new BaseDatosLocal(nombre, () => '0:no-debe-inicializar')
  try {
    const repo = new RepoSesion(base)
    const resultado = await repo.transicionar(
      esperadoCrudo as IdentidadSesion,
      destinoCrudo as DestinoSesion,
      aleatorio,
    )
    const lectura = await repo.leerSlot()
    return { resultado, lectura: identidadDe(lectura) }
  } finally {
    base.close()
  }
}

// Toda promesa del repo debe rechazar con el mensaje genérico exacto.
async function rechazaRepo(promesa: Promise<unknown>, esperado: string, detalle: string): Promise<void> {
  let capturado: string | null = null
  try {
    await promesa
  } catch (error) {
    capturado = error instanceof Error ? error.message : 'sin-Error'
  }
  afirmar(capturado === esperado,
    `repo: ${detalle} sin rechazo generico (obtenido: ${String(capturado)})`)
}

// Matriz local sobre DB propia: login mismo actor rota, A->B->A rota, stale
// logout no destruye la cuenta vigente, validaciones fuera de tx no escriben,
// defensa contra transacción exterior y reapertura conserva el ganador.
async function repoLocal(corrida: string): Promise<void> {
  const nombre = `r02_prueba_${corrida}`
  validarNombre(nombre, corrida)
  const base = new BaseDatosLocal(nombre, () => '0:local-inicio')
  try {
    const repo = new RepoSesion(base)
    const inicial = await repo.leerSlot()
    afirmar(inicial.estado === 'locked' && inicial.epoch === 0,
      `repoLocal: slot inicial alterado ${JSON.stringify(inicial)}`)
    const e0 = identidadDe(inicial)

    // 1) Login del actor 7: CAS confirma y rota a epoch 1.
    const login = await repo.transicionar(e0, { estado: 'activa', actorId: 7 }, 'uuid-login')
    afirmar(login.tipo === 'confirmada', 'repoLocal: login no confirmo')
    if (login.tipo !== 'confirmada') throw new Error('repoLocal: login sin confirmar')
    afirmar(login.slot.epoch === 1 && login.slot.generacion === '1:uuid-login' &&
      login.slot.estado === 'activa' && login.slot.actorId === 7,
      `repoLocal: slot tras login errones ${JSON.stringify(login.slot)}`)

    // 2) Login del MISMO actor tambien rota la generacion.
    const mismo = await repo.transicionar(
      identidadDe(login.slot), { estado: 'activa', actorId: 7 }, 'uuid-mismo')
    if (mismo.tipo !== 'confirmada') throw new Error('repoLocal: login del mismo actor sin confirmar')
    afirmar(mismo.slot.epoch === 2 && mismo.slot.generacion === '2:uuid-mismo',
      'repoLocal: login del mismo actor no roto generacion')

    // 3) Cuenta nueva (actor 9): epoch 3.
    const cuenta9 = await repo.transicionar(
      identidadDe(mismo.slot), { estado: 'activa', actorId: 9 }, 'uuid-cuenta-9')
    if (cuenta9.tipo !== 'confirmada') throw new Error('repoLocal: cuenta nueva sin confirmar')
    afirmar(cuenta9.slot.epoch === 3 && cuenta9.slot.estado === 'activa' && cuenta9.slot.actorId === 9,
      `repoLocal: slot tras cuenta nueva errones ${JSON.stringify(cuenta9.slot)}`)

    // 4) Logout stale con el snapshot de la cuenta vieja: conflicto SIN
    //    destruir la sesion vigente de la cuenta nueva.
    const stale = await repo.transicionar(
      identidadDe(login.slot), { estado: 'locked', actorId: null }, 'uuid-stale')
    afirmar(stale.tipo === 'conflicto', 'repoLocal: logout stale confirmo')
    const trasStale = await repo.leerSlot()
    afirmar(trasStale.estado === 'activa' && trasStale.actorId === 9 && trasStale.epoch === 3,
      `repoLocal: logout stale altero la cuenta vigente ${JSON.stringify(trasStale)}`)

    // 5) A->B->A con el MISMO string aleatorio: epoch monotónico => las tres
    //    generaciones son únicas (ABA imposible a nivel de duración).
    const salida = await repo.transicionar(
      identidadDe(cuenta9.slot), { estado: 'locked', actorId: null }, 'uuid-aba')
    if (salida.tipo !== 'confirmada') throw new Error('repoLocal: salida a locked sin confirmar')
    afirmar(salida.slot.epoch === 4 && salida.slot.generacion === '4:uuid-aba' &&
      salida.slot.estado === 'locked', `repoLocal: slot de salida errones ${JSON.stringify(salida.slot)}`)
    const regreso = await repo.transicionar(
      identidadDe(salida.slot), { estado: 'activa', actorId: 9 }, 'uuid-aba')
    if (regreso.tipo !== 'confirmada') throw new Error('repoLocal: regreso a la cuenta A sin confirmar')
    afirmar(regreso.slot.epoch === 5 && regreso.slot.generacion === '5:uuid-aba' &&
      regreso.slot.estado === 'activa' && regreso.slot.actorId === 9,
      `repoLocal: slot de regreso errones ${JSON.stringify(regreso.slot)}`)
    const rota = await repo.transicionar(
      identidadDe(regreso.slot), { estado: 'activa', actorId: 9 }, 'uuid-aba')
    if (rota.tipo !== 'confirmada') throw new Error('repoLocal: rotacion sin confirmar')
    afirmar(rota.slot.epoch === 6 && rota.slot.generacion === '6:uuid-aba',
      'repoLocal: login repetido no roto tras A->B->A')
    // Unicidad runtime de las tres generaciones (mismo string aleatorio).
    const generaciones: string[] = [salida.slot.generacion, regreso.slot.generacion, rota.slot.generacion]
    afirmar(new Set(generaciones).size === generaciones.length,
      `repoLocal: generacion reutilizada en A->B->A: ${generaciones.join('|')}`)

    // 6) Validación de parámetros FUERA de tx: error genérico y sin escritura.
    const e6 = identidadDe(rota.slot)
    await rechazaRepo(repo.transicionar(
      { ...e6, actorId: true } as unknown as IdentidadSesion,
      { estado: 'locked', actorId: null }, 'uuid-x'),
    'Slot de sesión inválido', 'esperado con actor booleano')
    await rechazaRepo(repo.transicionar(
      { ...e6, epoch: 1.5 } as unknown as IdentidadSesion,
      { estado: 'locked', actorId: null }, 'uuid-x'),
    'Slot de sesión inválido', 'esperado con epoch decimal')
    await rechazaRepo(repo.transicionar(
      { ...e6, token: 'credencial-secreta' } as unknown as IdentidadSesion,
      { estado: 'locked', actorId: null }, 'uuid-x'),
    'Slot de sesión inválido', 'esperado con credencial extra')
    await rechazaRepo(repo.transicionar(
      e6, { estado: 'activa', actorId: 0 } as unknown as DestinoSesion, 'uuid-x'),
    'Transición de sesión inválida', 'destino con actor 0')
    await rechazaRepo(repo.transicionar(
      e6, { estado: 'locked', actorId: 7 } as unknown as DestinoSesion, 'uuid-x'),
    'Transición de sesión inválida', 'destino locked con actor')
    await rechazaRepo(repo.transicionar(e6, { estado: 'activa', actorId: 7 }, ''),
      'Transición de sesión inválida', 'aleatorio vacio')
    const trasValidacion = await repo.leerSlot()
    afirmar(trasValidacion.epoch === 6 && trasValidacion.generacion === '6:uuid-aba' &&
      trasValidacion.estado === 'activa' && trasValidacion.actorId === 9,
      'repoLocal: una validacion rechazada escribio el slot')

    // 7) Defensa contra transacción exterior: rechazo ANTES de escribir, con
    //    la rw realmente abierta y con una lectura IDB en vuelo.
    await base.transaction('rw', [base.slotSesion], async transaccion => {
      const filaCruda = await transaccion.table('slotSesion').get('actual')
      afirmar(filaCruda !== undefined, 'repoLocal: transaccion exterior sin fila de slot')
      await rechazaRepo(repo.leerSlot(), ERROR_USO_EN_TRANSACCION, 'leerSlot dentro de tx')
      await rechazaRepo(
        repo.transicionar(e6, { estado: 'locked', actorId: null }, 'interno'),
        ERROR_USO_EN_TRANSACCION, 'transicionar dentro de tx')
    })
    const trasDefensa = await repo.leerSlot()
    afirmar(trasDefensa.epoch === 6 && trasDefensa.generacion === '6:uuid-aba',
      'repoLocal: la defensa de tx exterior permitio escribir')

    // 8) Cerrar y reabrir la conexión: el slot ganador se conserva durable.
    base.close()
    const reabierta = new BaseDatosLocal(nombre, () => '0:reabrir')
    try {
      const final = await new RepoSesion(reabierta).leerSlot()
      afirmar(final.epoch === 6 && final.estado === 'activa' && final.actorId === 9 &&
        final.generacion === '6:uuid-aba',
        `repoLocal: reapertura no conservo el slot ganador ${JSON.stringify(final)}`)
    } finally {
      reabierta.close()
    }
  } finally {
    base.close()
    await limpiar(nombre, corrida)
  }
}

// ---------------------------------------------------------------------------
// T101 (R02a, RF-29/RF-33/RNF-5 parciales, RNF-6): composición de guard y
// efectos IDB en UNA MISMA transacción rw del repositorio. Todas las
// assertions de durabilidad/rollback son IDB NATIVAS: lectura de la fila real
// con una conexión cruda independiente (`leerFilaCruda`) después del commit o
// del abort, nunca spies/Map ni búsqueda textual.
// ---------------------------------------------------------------------------

// Fila sintética del outbox CON actor explícito (RF-57: el actor viaja en la
// fila; R02a no inventa claims ni toca filas productivas).
function filaOutboxT101(operacionUuid: string, actorId: number): OperacionCorteLocal {
  return {
    operacionUuid,
    corteUuid: `corte-${operacionUuid}`,
    actorId,
    servicioId: 3,
    metodoPago: 'efectivo',
    precioCentavos: 1500,
    porcentajeCentesimas: 30,
    modoCaptura: 'offline',
    instanteCambio: '2026-10-12T10:00:00Z',
    momentoReal: '2026-10-12T10:00:00Z',
    estado: 'pendiente',
    intento: 0,
    actualizadoEn: '2026-10-12T10:00:00Z',
  }
}

// Lectura cruda de UNA fila con conexión IDB nativa independiente: solo ve la
// fila si el commit exterior ya ocurrió; una transacción abortada devuelve
// `undefined`. Solo se abren DBs propias `r02_prueba_<UUID>` y se cierran.
async function leerFilaCruda(
  nombre: string, corrida: string, tienda: string, clave: IDBValidKey,
): Promise<unknown> {
  validarNombre(nombre, corrida)
  return new Promise<unknown>((resolver, rechazar) => {
    const solicitud = indexedDB.open(nombre)
    solicitud.onsuccess = () => {
      const base = solicitud.result
      const transaccion = base.transaction(tienda, 'readonly')
      const lectura = transaccion.objectStore(tienda).get(clave)
      let valor: unknown = undefined
      lectura.onsuccess = () => { valor = lectura.result as unknown }
      transaccion.oncomplete = () => { base.close(); resolver(valor) }
      transaccion.onerror = () => { base.close(); rechazar(new Error('Lectura cruda fallida')) }
      transaccion.onabort = () => { base.close(); rechazar(new Error('Lectura cruda abortada')) }
    }
    solicitud.onerror = () => rechazar(new Error('No se pudo abrir IDB para lectura cruda'))
    solicitud.onblocked = () => rechazar(new Error('Lectura cruda bloqueada'))
  })
}

// T101.1-3: efectos IDB sobre el outbox compuestos con la transición del slot.
async function repoEfectos(corrida: string): Promise<void> {
  const nombre = `r02_prueba_${corrida}`
  validarNombre(nombre, corrida)
  const base = new BaseDatosLocal(nombre, () => '0:efectos-inicio')
  try {
    const repo = new RepoSesion(base)
    const inicial = await repo.leerSlot()
    const e0 = identidadDe(inicial)

    // 1) Efectos + slot se confirman JUNTOS: ambos durables tras el commit.
    let invocaciones = 0
    const transicion = await repo.transicionar(
      e0, { estado: 'activa', actorId: 7 }, 'uuid-efectos', {
        tablas: [base.outboxOperaciones],
        aplicar: async transaccion => {
          invocaciones += 1
          await transaccion.table<OperacionCorteLocal, string>('outboxOperaciones')
            .put(filaOutboxT101('op-efectos-1', 7))
        },
      })
    if (transicion.tipo !== 'confirmada') {
      throw new Error('T101: la transicion con efectos no confirmo')
    }
    afirmar(invocaciones === 1, `T101: efectos invocados ${invocaciones} veces`)
    const slot1 = await leerFilaCruda(nombre, corrida, 'slotSesion', 'actual') as SlotSesion | undefined
    afirmar(slot1 !== undefined && slot1.epoch === 1 && slot1.generacion === '1:uuid-efectos' &&
      slot1.estado === 'activa' && slot1.actorId === 7,
    `T101: slot no durable tras commit ${JSON.stringify(slot1)}`)
    const outbox1 = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', 'op-efectos-1') as
      OperacionCorteLocal | undefined
    afirmar(outbox1 !== undefined && outbox1.actorId === 7 && outbox1.estado === 'pendiente' &&
      outbox1.corteUuid === 'corte-op-efectos-1',
    `T101: fila de efectos no durable tras commit ${JSON.stringify(outbox1)}`)

    // 2) CAS desfasado: conflicto y los efectos NUNCA se invocan (el flag del
    //    callback demuestra que no se llamó, no solo que no escribió).
    let invocacionesStale = 0
    const conflicto = await repo.transicionar(
      e0, { estado: 'locked', actorId: null }, 'uuid-perdedor', {
        tablas: [base.outboxOperaciones],
        aplicar: async transaccion => {
          invocacionesStale += 1
          await transaccion.table<OperacionCorteLocal, string>('outboxOperaciones')
            .put(filaOutboxT101('op-perdedor', 7))
        },
      })
    afirmar(conflicto.tipo === 'conflicto', 'T101: el CAS desfasado no devolvio conflicto')
    afirmar(Object.keys(conflicto).length === 1, 'T101: el conflicto expone campos de mas')
    afirmar(invocacionesStale === 0, 'T101: el CAS desfasado INVOCO los efectos')
    const outboxPerdedor = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', 'op-perdedor')
    afirmar(outboxPerdedor === undefined, 'T101: el conflicto escribio la fila de efectos')
    const slotTrasConflicto = await leerFilaCruda(nombre, corrida, 'slotSesion', 'actual') as
      SlotSesion | undefined
    afirmar(slotTrasConflicto !== undefined && slotTrasConflicto.epoch === 1 &&
      slotTrasConflicto.generacion === '1:uuid-efectos',
    `T101: el conflicto altero el slot ${JSON.stringify(slotTrasConflicto)}`)

    // 3) Excepcion inyectada tras mutar la fila de efectos y tras pedir el
    //    slot: ROLLBACK de ambos segun lectura nativa posterior.
    let rechazo: string | null = null
    try {
      await repo.transicionar(
        identidadDe(transicion.slot), { estado: 'locked', actorId: null }, 'uuid-fallo', {
          tablas: [base.outboxOperaciones],
          aplicar: async transaccion => {
            await transaccion.table<OperacionCorteLocal, string>('outboxOperaciones')
              .put(filaOutboxT101('op-fallo', 7))
            throw new Error('fallo-t101')
          },
        })
    } catch (error) {
      rechazo = error instanceof Error ? error.message : 'sin-Error'
    }
    afirmar(rechazo === 'fallo-t101',
      `T101: la excepcion inyectada no se propago (${String(rechazo)})`)
    const outboxFallo = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', 'op-fallo')
    afirmar(outboxFallo === undefined, 'T101: la excepcion NO reverso la fila de outbox')
    const slotFallo = await leerFilaCruda(nombre, corrida, 'slotSesion', 'actual') as
      SlotSesion | undefined
    afirmar(slotFallo !== undefined && slotFallo.epoch === 1 && slotFallo.generacion === '1:uuid-efectos' &&
      slotFallo.estado === 'activa' && slotFallo.actorId === 7,
    `T101: la excepcion NO reverso el slot ${JSON.stringify(slotFallo)}`)
    // El rollback no puede destruir lo ya confirmado en el commit anterior.
    const outboxDurable = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', 'op-efectos-1')
    afirmar(outboxDurable !== undefined, 'T101: el rollback destruyo la fila confirmada')
  } finally {
    base.close()
    await limpiar(nombre, corrida)
  }
}

// T101.4: conSesionVigente exige slot activo coincidente y escribe la fila
// del trabajo en ESA MISMA transacción; una transición concurrente no puede
// intercalar el check y la escritura.
async function repoGuard(corrida: string): Promise<void> {
  const nombre = `r02_prueba_${corrida}`
  validarNombre(nombre, corrida)
  const base = new BaseDatosLocal(nombre, () => '0:guard-inicio')
  const baseConcurrencia = new BaseDatosLocal(nombre, () => '0:guard-competencia')
  try {
    const repo = new RepoSesion(base)
    const repoConcurrencia = new RepoSesion(baseConcurrencia)
    const inicial = await repo.leerSlot()
    const e0 = identidadDe(inicial)
    afirmar(inicial.estado === 'locked' && inicial.epoch === 0,
      'T101: el guard no arranca con el slot locked inicial')

    // a) El contexto COINCIDE pero el slot NO esta activo: rechazo sin
    //    callback (usa esContextoActivo, no solo coincideSlot).
    let invocacionesBloqueadas = 0
    await rechazaRepo(repo.conSesionVigente(e0, [base.outboxOperaciones], async () => {
      invocacionesBloqueadas += 1
    }), ERROR_SESION_NO_VIGENTE, 'contexto coincide pero slot locked')
    afirmar(invocacionesBloqueadas === 0, 'T101: el guard invoco el trabajo con slot locked')

    // b) Contexto activo: el trabajo escribe y el resultado llega tras commit.
    const login = await repo.transicionar(e0, { estado: 'activa', actorId: 7 }, 'uuid-guard-login')
    if (login.tipo !== 'confirmada') throw new Error('T101: login del guard no confirmo')
    const e1 = identidadDe(login.slot)
    let invocaciones = 0
    let tiendas: string[] = []
    let mismaTransaccion = false
    const valor = await repo.conSesionVigente(e1, [base.outboxOperaciones], async transaccion => {
      invocaciones += 1
      tiendas = [...transaccion.storeNames]
      mismaTransaccion = Dexie.currentTransaction === transaccion
      await transaccion.table<OperacionCorteLocal, string>('outboxOperaciones')
        .put(filaOutboxT101('op-guard-1', 7))
      return 'guard-ok'
    })
    afirmar(valor === 'guard-ok', 'T101: el guard no devolvio el resultado del trabajo')
    afirmar(invocaciones === 1, 'T101: el trabajo no se invoco exactamente una vez')
    afirmar(mismaTransaccion, 'T101: el trabajo no corrio en la transaccion del repo')
    tiendas.sort()
    afirmar(JSON.stringify(tiendas) === JSON.stringify(['outboxOperaciones', 'slotSesion']),
      `T101: la transaccion del guard no declara ambas tablas: ${JSON.stringify(tiendas)}`)
    const filaGuard = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', 'op-guard-1') as
      OperacionCorteLocal | undefined
    afirmar(filaGuard !== undefined && filaGuard.actorId === 7,
      `T101: la fila del guard no es durable tras commit ${JSON.stringify(filaGuard)}`)
    const slotGuard = await leerFilaCruda(nombre, corrida, 'slotSesion', 'actual') as
      SlotSesion | undefined
    afirmar(slotGuard !== undefined && slotGuard.epoch === 1 && slotGuard.estado === 'activa' &&
      slotGuard.actorId === 7,
    `T101: el guard altero el slot ${JSON.stringify(slotGuard)}`)

    // c) Contexto desfasado tras rotar: rechazo SIN invocar el callback y sin
    //    escribir (ausencia de callback stale demostrada por el flag).
    const salida = await repo.transicionar(e1, { estado: 'locked', actorId: null }, 'uuid-guard-salida')
    if (salida.tipo !== 'confirmada') throw new Error('T101: salida del guard no confirmo')
    let invocacionesStale = 0
    await rechazaRepo(repo.conSesionVigente(e1, [base.outboxOperaciones], async transaccion => {
      invocacionesStale += 1
      await transaccion.table<OperacionCorteLocal, string>('outboxOperaciones')
        .put(filaOutboxT101('op-guard-stale', 7))
    }), ERROR_SESION_NO_VIGENTE, 'contexto desfasado')
    afirmar(invocacionesStale === 0, 'T101: el guard desfasado INVOCO el trabajo')
    const filaStale = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', 'op-guard-stale')
    afirmar(filaStale === undefined, 'T101: el guard desfasado escribio')

    // d) Transición CONCURRENTE: la pareja (guard con el contexto actual +
    //    transición con el MISMO contexto) se lanza en el MISMO tick sobre dos
    //    conexiones independientes. La composición es atómica dentro de UNA tx
    //    rw, así que solo caben dos órdenes consistentes: o el guard gana (fila
    //    durable y la transición confirma DESPUÉS) o la transición gana (el
    //    guard rechaza sin invocar el trabajo y no hay fila). Cualquier fila
    //    presente con la transición resuelta PRIMERO sería un check y una
    //    escritura intercalados.
    const ronda = async (contexto: IdentidadSesion, etiqueta: string, guardPrimero: boolean):
      Promise<void> => {
      const orden: string[] = []
      let trabajoInvocado = false
      const ejecutarGuard = (): Promise<unknown> => repo.conSesionVigente(
        contexto, [base.outboxOperaciones], async transaccion => {
          trabajoInvocado = true
          await transaccion.table<OperacionCorteLocal, string>('outboxOperaciones')
            .put(filaOutboxT101(`op-${etiqueta}`, 7))
          return 'ok'
        }).then(
          () => { orden.push('guard'); return null },
          (error: unknown) => { orden.push('guard'); return error },
        )
      const ejecutarTransicion = (): Promise<ResultadoCAS> => repoConcurrencia.transicionar(
        contexto, { estado: 'locked', actorId: null }, `uuid-${etiqueta}`).then(
        resultado => { orden.push('transicion'); return resultado },
      )
      let guardPendiente: Promise<unknown>
      let transicionPendiente: Promise<ResultadoCAS>
      if (guardPrimero) {
        guardPendiente = ejecutarGuard()
        transicionPendiente = ejecutarTransicion()
      } else {
        transicionPendiente = ejecutarTransicion()
        guardPendiente = ejecutarGuard()
      }
      const [resultadoGuard, resultadoTransicion] =
        await Promise.all([guardPendiente, transicionPendiente])
      afirmar(orden.length === 2, `T101: ronda ${etiqueta} incompleta ${JSON.stringify(orden)}`)
      afirmar(resultadoTransicion.tipo === 'confirmada',
        `T101: ronda ${etiqueta}: la transicion concurrente no confirmo`)
      const fila = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', `op-${etiqueta}`)
      if (orden[0] === 'guard') {
        afirmar(resultadoGuard === null, `T101: ronda ${etiqueta}: el guard ganador rechazo`)
        afirmar(trabajoInvocado, `T101: ronda ${etiqueta}: el guard ganador no invoco el trabajo`)
        afirmar(fila !== undefined,
          `T101: ronda ${etiqueta}: la fila del guard ganador no es durable`)
      } else {
        afirmar(orden[0] === 'transicion', `T101: ronda ${etiqueta}: orden ${orden.join('|')}`)
        afirmar(!trabajoInvocado,
          `T101: ronda ${etiqueta}: callback stale tras la transicion (check/escritura intercalados)`)
        afirmar(resultadoGuard instanceof Error &&
          resultadoGuard.message === ERROR_SESION_NO_VIGENTE,
        `T101: ronda ${etiqueta}: el guard perdedor no rechazo con mensaje generico`)
        afirmar(fila === undefined,
          `T101: ronda ${etiqueta}: la transicion gano pero existio la fila (intercalacion)`)
      }
      const slotRonda = await leerFilaCruda(nombre, corrida, 'slotSesion', 'actual') as
        SlotSesion | undefined
      afirmar(slotRonda !== undefined && slotRonda.estado === 'locked',
        `T101: ronda ${etiqueta}: slot final ${JSON.stringify(slotRonda)}`)
    }

    // Ronda 1: el guard se lanza primero.
    const previa1 = await repo.leerSlot()
    const activa1 = await repo.transicionar(
      identidadDe(previa1), { estado: 'activa', actorId: 7 }, 'uuid-guard-ronda-1')
    if (activa1.tipo !== 'confirmada') throw new Error('T101: activacion ronda 1 no confirmo')
    await ronda(identidadDe(activa1.slot), 'conc-1', true)

    // Ronda 2: la transición se lanza primero.
    const previa2 = await repo.leerSlot()
    const activa2 = await repo.transicionar(
      identidadDe(previa2), { estado: 'activa', actorId: 7 }, 'uuid-guard-ronda-2')
    if (activa2.tipo !== 'confirmada') throw new Error('T101: activacion ronda 2 no confirmo')
    await ronda(identidadDe(activa2.slot), 'conc-2', false)
  } finally {
    base.close()
    baseConcurrencia.close()
    await limpiar(nombre, corrida)
  }
}

// T101.5: defensas. Uso desde transacción exterior abierta y tablas de OTRA
// instancia DB se rechazan ANTES de escribir y sin invocar ningún callback.
async function repoDefensas(corrida: string): Promise<void> {
  const nombre = `r02_prueba_${corrida}`
  validarNombre(nombre, corrida)
  const corridaAjena = crypto.randomUUID()
  const nombreAjeno = `r02_prueba_${corridaAjena}`
  validarNombre(nombreAjeno, corridaAjena)
  const base = new BaseDatosLocal(nombre, () => '0:defensas-inicio')
  const ajena = new BaseDatosLocal(nombreAjeno, () => '0:ajena-inicio')
  try {
    const repo = new RepoSesion(base)
    const inicial = await repo.leerSlot()
    const login = await repo.transicionar(
      identidadDe(inicial), { estado: 'activa', actorId: 7 }, 'uuid-defensas')
    if (login.tipo !== 'confirmada') throw new Error('T101: login de defensas no confirmo')
    const e1 = identidadDe(login.slot)
    let invocaciones = 0

    // a) Tabla de OTRA instancia DB: rechazo con mensaje generico antes de
    //    escribir y sin invocar el callback (ni en efectos ni en trabajo).
    await rechazaRepo(repo.transicionar(
      e1, { estado: 'locked', actorId: null }, 'uuid-ajena', {
        tablas: [ajena.outboxOperaciones],
        aplicar: async () => { invocaciones += 1 },
      }), ERROR_TABLA_DECLARADA, 'efectos con tabla de otra DB')
    await rechazaRepo(repo.conSesionVigente(
      e1, [ajena.outboxOperaciones], async () => { invocaciones += 1 }),
    ERROR_TABLA_DECLARADA, 'trabajo con tabla de otra DB')
    afirmar(invocaciones === 0, 'T101: una tabla ajena llego a invocar el callback')
    const slotAjeno = await leerFilaCruda(nombre, corrida, 'slotSesion', 'actual') as
      SlotSesion | undefined
    afirmar(slotAjeno !== undefined && slotAjeno.epoch === 1 && slotAjeno.estado === 'activa' &&
      slotAjeno.actorId === 7,
    `T101: el rechazo de tabla ajena escribio el slot ${JSON.stringify(slotAjeno)}`)
    const filaAjena = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', 'op-ajena')
    afirmar(filaAjena === undefined, 'T101: el rechazo de tabla ajena dejo filas')

    // b) Uso desde transaccion exterior abierta: rechazo ANTES de escribir,
    //    con la rw realmente abierta y con una lectura IDB en vuelo.
    await base.transaction('rw', [base.slotSesion], async transaccion => {
      const filaCruda = await transaccion.table<SlotSesionLocal, string>('slotSesion').get('actual')
      afirmar(filaCruda !== undefined, 'T101: transaccion exterior sin fila de slot')
      await rechazaRepo(repo.conSesionVigente(
        e1, [base.outboxOperaciones], async () => { invocaciones += 1 }),
      ERROR_USO_EN_TRANSACCION, 'conSesionVigente dentro de tx')
      await rechazaRepo(repo.transicionar(
        e1, { estado: 'locked', actorId: null }, 'interna', {
          tablas: [base.outboxOperaciones],
          aplicar: async () => { invocaciones += 1 },
        }), ERROR_USO_EN_TRANSACCION, 'transicionar con efectos dentro de tx')
    })
    afirmar(invocaciones === 0, 'T101: una defensa de tx exterior invoco el callback')
    const slotDefensa = await leerFilaCruda(nombre, corrida, 'slotSesion', 'actual') as
      SlotSesion | undefined
    afirmar(slotDefensa !== undefined && slotDefensa.epoch === 1,
      `T101: la defensa de tx exterior permitio escribir ${JSON.stringify(slotDefensa)}`)
    const filaDefensa = await leerFilaCruda(nombre, corrida, 'outboxOperaciones', 'op-defensa')
    afirmar(filaDefensa === undefined, 'T101: la defensa de tx exterior dejo filas')
  } finally {
    base.close()
    ajena.close()
    await limpiar(nombre, corrida)
    await limpiar(nombreAjeno, corridaAjena)
  }
}

// ---------------------------------------------------------------------------
// T102 (R02a, RF-29/RF-33/RNF-5 parciales, RNF-6): fallo cerrado y NO
// reparación destructiva. Fixtures NATIVAS IDB con fallos IDB controlados
// inyectados: la fila singleton se borra/escribe con CONEXIÓN CRUDA (para
// fabricar los estados imposibles que el repositorio jamás produce) y el
// fallo de lectura se inyecta rompiendo la operación real del pipeline de
// lectura sobre IDB nativo. Toda consecuencia se verifica con lectura cruda
// posterior (conexión nativa independiente): sin confirmación parcial, sin
// callback stale con éxito, originales preservados y sin fallback storage.
// ---------------------------------------------------------------------------

// Escribe (o sobrescribe) una fila con conexión cruda nativa; la clave viene
// del keyPath de la tienda, como en cualquier instalación real.
async function escribirFilaCruda(
  nombre: string, corrida: string, tienda: string, valor: unknown,
): Promise<void> {
  validarNombre(nombre, corrida)
  await new Promise<void>((resolver, rechazar) => {
    const solicitud = indexedDB.open(nombre)
    solicitud.onsuccess = () => {
      const base = solicitud.result
      const transaccion = base.transaction(tienda, 'readwrite')
      transaccion.objectStore(tienda).put(valor)
      transaccion.oncomplete = () => { base.close(); resolver() }
      transaccion.onerror = () => { base.close(); rechazar(new Error('Escritura cruda fallida')) }
      transaccion.onabort = () => { base.close(); rechazar(new Error('Escritura cruda abortada')) }
    }
    solicitud.onerror = () => rechazar(new Error('No se pudo abrir IDB para escritura cruda'))
    solicitud.onblocked = () => rechazar(new Error('Escritura cruda bloqueada'))
  })
}

// Borra una fila con conexión cruda nativa (la DB ya está en v3).
async function borrarFilaCruda(
  nombre: string, corrida: string, tienda: string, clave: IDBValidKey,
): Promise<void> {
  validarNombre(nombre, corrida)
  await new Promise<void>((resolver, rechazar) => {
    const solicitud = indexedDB.open(nombre)
    solicitud.onsuccess = () => {
      const base = solicitud.result
      const transaccion = base.transaction(tienda, 'readwrite')
      transaccion.objectStore(tienda).delete(clave)
      transaccion.oncomplete = () => { base.close(); resolver() }
      transaccion.onerror = () => { base.close(); rechazar(new Error('Borrado crudo fallido')) }
      transaccion.onabort = () => { base.close(); rechazar(new Error('Borrado crudo abortado')) }
    }
    solicitud.onerror = () => rechazar(new Error('No se pudo abrir IDB para borrado crudo'))
    solicitud.onblocked = () => rechazar(new Error('Borrado crudo bloqueado'))
  })
}

// Mensaje del rechazo (null si la promesa RESUELVE): para un fallo inyectado
// el caller debe ver el fallo, nunca una confirmación simulada.
async function capturarRechazo(promesa: Promise<unknown>): Promise<string | null> {
  try {
    await promesa
  } catch (error) {
    return error instanceof Error ? error.message : 'sin-Error'
  }
  return null
}

// T102.1-4: slot ausente, corrupto, versión incompatible y overflow epoch en
// DBs ya v3; rechazo genérico fail-closed sin recreate, repair ni wrap.
async function falloCerrado(corrida: string): Promise<void> {
  // 1) SLOT AUSENTE: borrar el singleton con conexión cruda en una DB ya v3.
  const n1 = `r02_prueba_${corrida}`
  validarNombre(n1, corrida)
  const creacion1 = new BaseDatosLocal(n1, () => '0:ausente-inicio')
  try {
    const inicial1 = await new RepoSesion(creacion1).leerSlot()
    afirmar(inicial1.estado === 'locked' && inicial1.epoch === 0,
      `T102: la fixture de slot ausente no arranca locked epoch0 ${JSON.stringify(inicial1)}`)
  } finally {
    creacion1.close()
  }
  await borrarFilaCruda(n1, corrida, 'slotSesion', 'actual')
  const ausente = new BaseDatosLocal(n1, () => '0:no-debe-crearse')
  try {
    const repo = new RepoSesion(ausente)
    const rechazoLeer = await capturarRechazo(repo.leerSlot())
    afirmar(rechazoLeer === 'Slot de sesión inválido',
      `T102: leerSlot con slot ausente no rechazo con error generico (${String(rechazoLeer)})`)
    let efectos1 = 0
    const rechazoTransicion = await capturarRechazo(repo.transicionar(
      { ...SLOT_CERO } as unknown as IdentidadSesion,
      { estado: 'activa', actorId: 7 }, 'uuid-ausente', {
        tablas: [ausente.outboxOperaciones],
        aplicar: async () => { efectos1 += 1 },
      }))
    afirmar(rechazoTransicion === 'Slot de sesión inválido',
      `T102: transicionar con slot ausente no rechazo con error generico (${String(rechazoTransicion)})`)
    afirmar(efectos1 === 0, 'T102: el slot ausente llego a invocar efectos')
  } finally {
    ausente.close()
  }
  // NINGUNA recreación automática: otra reapertura tampoco repuebla epoch0.
  const reintento = new BaseDatosLocal(n1, () => '0:tampoco-ahora')
  try {
    await reintento.open()
  } finally {
    reintento.close()
  }
  const crudo1 = await leerFilaCruda(n1, corrida, 'slotSesion', 'actual')
  afirmar(crudo1 === undefined, `T102: el slot ausente fue recreado ${JSON.stringify(crudo1)}`)
  afirmar(await inspeccionarCruda(n1, 'slotSesion') === 0,
    'T102: el slot ausente dejo mas de una fila singleton')
  afirmar(await inspeccionarCruda(n1, 'outboxOperaciones') === 0,
    'T102: el intento con slot ausente escribio outbox')
  afirmar(await inspeccionarCruda(n1, 'mapeoOperaciones') === 0,
    'T102: el intento con slot ausente escribio mapeos')
  await limpiar(n1, corrida)

  // 2) SLOT CORRUPTO: filas crudas con tipado, estado desconocido y epoch no
  //    entero; rechazo genérico, fila corrupta intacta y nada más escrito.
  const corrida2 = crypto.randomUUID()
  const n2 = `r02_prueba_${corrida2}`
  validarNombre(n2, corrida2)
  const creacion2 = new BaseDatosLocal(n2, () => '0:corrupto-inicio')
  try {
    const inicial2 = await new RepoSesion(creacion2).leerSlot()
    afirmar(inicial2.epoch === 0, 'T102: la fixture corrupta no arranca en epoch0')
  } finally {
    creacion2.close()
  }
  const corruptos: Array<{ detalle: string; fila: Record<string, unknown> }> = [
    { detalle: 'tipado', fila: { clave: 'actual', version: 1, generacion: 42, epoch: 0, estado: 'locked', actorId: null } },
    { detalle: 'estado desconocido', fila: { clave: 'actual', version: 1, generacion: '0:x', epoch: 0, estado: 'zombie', actorId: null } },
    { detalle: 'epoch no entero', fila: { clave: 'actual', version: 1, generacion: '0:x', epoch: 1.5, estado: 'locked', actorId: null } },
  ]
  for (const corrupto of corruptos) {
    await escribirFilaCruda(n2, corrida2, 'slotSesion', corrupto.fila)
    const base = new BaseDatosLocal(n2, () => '0:no-reparar')
    try {
      const repo = new RepoSesion(base)
      const rechazoLeer = await capturarRechazo(repo.leerSlot())
      afirmar(rechazoLeer === 'Slot de sesión inválido',
        `T102: slot corrupto (${corrupto.detalle}) no rechazo en leerSlot (${String(rechazoLeer)})`)
      let efectos2 = 0
      const rechazoTransicion = await capturarRechazo(repo.transicionar(
        { ...SLOT_CERO } as unknown as IdentidadSesion,
        { estado: 'locked', actorId: null }, 'uuid-corrupto', {
          tablas: [base.outboxOperaciones],
          aplicar: async () => { efectos2 += 1 },
        }))
      afirmar(rechazoTransicion === 'Slot de sesión inválido',
        `T102: slot corrupto (${corrupto.detalle}) no rechazo en transicionar (${String(rechazoTransicion)})`)
      afirmar(efectos2 === 0,
        `T102: el slot corrupto (${corrupto.detalle}) llego a invocar efectos`)
    } finally {
      base.close()
    }
    // La fila corrupta queda INTACTA: sin "reparación" ni sobrescritura.
    const cruda = await leerFilaCruda(n2, corrida2, 'slotSesion', 'actual') as
      Record<string, unknown> | undefined
    afirmar(cruda !== undefined,
      `T102: la fila corrupta desaparecio (${corrupto.detalle})`)
    afirmar(Object.keys(cruda).length === 6,
      `T102: la fila corrupta cambio de campos (${corrupto.detalle})`)
    for (const llave of ['clave', 'version', 'generacion', 'epoch', 'estado', 'actorId']) {
      afirmar(cruda[llave] === corrupto.fila[llave],
        `T102: la fila corrupta fue reparada en ${llave} (${corrupto.detalle})`)
    }
    afirmar(await inspeccionarCruda(n2, 'slotSesion') === 1,
      `T102: el slot corrupto multiplico el singleton (${corrupto.detalle})`)
    afirmar(await inspeccionarCruda(n2, 'outboxOperaciones') === 0,
      `T102: el slot corrupto dejo filas de outbox (${corrupto.detalle})`)
    afirmar(await inspeccionarCruda(n2, 'mapeoOperaciones') === 0,
      `T102: el slot corrupto dejo mapeos (${corrupto.detalle})`)
  }
  await limpiar(n2, corrida2)

  // 3) VERSIÓN INCOMPATIBLE (version !== 1): rechazo sin migrar ni recreate
  //    silencioso al reabrir.
  const corrida3 = crypto.randomUUID()
  const n3 = `r02_prueba_${corrida3}`
  validarNombre(n3, corrida3)
  const creacion3 = new BaseDatosLocal(n3, () => '0:version-inicio')
  try {
    const inicial3 = await new RepoSesion(creacion3).leerSlot()
    afirmar(inicial3.epoch === 0, 'T102: la fixture de version no arranca en epoch0')
  } finally {
    creacion3.close()
  }
  const filaVersion: Record<string, unknown> = {
    clave: 'actual', version: 2, generacion: '0:futura', epoch: 0,
    estado: 'locked', actorId: null,
  }
  await escribirFilaCruda(n3, corrida3, 'slotSesion', filaVersion)
  const base3 = new BaseDatosLocal(n3, () => '0:no-migrar')
  try {
    const repo = new RepoSesion(base3)
    const rechazoLeer = await capturarRechazo(repo.leerSlot())
    afirmar(rechazoLeer === 'Slot de sesión inválido',
      `T102: version incompatible no rechazo en leerSlot (${String(rechazoLeer)})`)
    let efectos3 = 0
    const rechazoTransicion = await capturarRechazo(repo.transicionar(
      { ...SLOT_CERO } as unknown as IdentidadSesion,
      { estado: 'locked', actorId: null }, 'uuid-version', {
        tablas: [base3.outboxOperaciones],
        aplicar: async () => { efectos3 += 1 },
      }))
    afirmar(rechazoTransicion === 'Slot de sesión inválido',
      `T102: version incompatible no rechazo en transicionar (${String(rechazoTransicion)})`)
    afirmar(efectos3 === 0, 'T102: la version incompatible llego a invocar efectos')
  } finally {
    base3.close()
  }
  // Reapertura con otra instancia: SIN upgrade/recreate silencioso.
  const reapertura3 = new BaseDatosLocal(n3, () => '0:no-recreate')
  try {
    await reapertura3.open()
    afirmar(reapertura3.verno === 3, 'T102: la version incompatible provoco un bump')
  } finally {
    reapertura3.close()
  }
  const cruda3 = await leerFilaCruda(n3, corrida3, 'slotSesion', 'actual') as
    Record<string, unknown> | undefined
  afirmar(cruda3 !== undefined && cruda3['version'] === 2 && cruda3['generacion'] === '0:futura',
    `T102: la version incompatible fue migrada/recreada ${JSON.stringify(cruda3)}`)
  await limpiar(n3, corrida3)

  // 4) OVERFLOW EPOCH: transición rechazada sin wrap; slot y filas intactos
  //    verificados por lectura nativa posterior.
  const corrida4 = crypto.randomUUID()
  const n4 = `r02_prueba_${corrida4}`
  validarNombre(n4, corrida4)
  const creacion4 = new BaseDatosLocal(n4, () => '0:tope-inicio')
  try {
    const inicial4 = await new RepoSesion(creacion4).leerSlot()
    afirmar(inicial4.epoch === 0, 'T102: la fixture de tope no arranca en epoch0')
  } finally {
    creacion4.close()
  }
  const tope: Record<string, unknown> = {
    clave: 'actual', version: 1,
    generacion: `${Number.MAX_SAFE_INTEGER}:tope`,
    epoch: Number.MAX_SAFE_INTEGER,
    estado: 'activa', actorId: 7,
  }
  await escribirFilaCruda(n4, corrida4, 'slotSesion', tope)
  await escribirFilaCruda(n4, corrida4, 'outboxOperaciones', filaOutboxT101('op-t102-tope', 7))
  const base4 = new BaseDatosLocal(n4, () => '0:no-wrap')
  try {
    const repo = new RepoSesion(base4)
    const slotTop = await repo.leerSlot()
    afirmar(slotTop.epoch === Number.MAX_SAFE_INTEGER && slotTop.estado === 'activa' &&
      slotTop.actorId === 7,
    `T102: el slot al tope no es legible ${JSON.stringify(slotTop)}`)
    const rechazoTope = await capturarRechazo(repo.transicionar(
      identidadDe(slotTop), { estado: 'locked', actorId: null }, 'uuid-tope'))
    afirmar(rechazoTope === 'Transición de sesión rechazada: epoch al máximo seguro',
      `T102: el overflow no rechazo sin wrap (${String(rechazoTope)})`)
    let efectos4 = 0
    const rechazoTopeEfectos = await capturarRechazo(repo.transicionar(
      identidadDe(slotTop), { estado: 'activa', actorId: 9 }, 'uuid-tope-2', {
        tablas: [base4.outboxOperaciones],
        aplicar: async () => { efectos4 += 1 },
      }))
    afirmar(rechazoTopeEfectos === 'Transición de sesión rechazada: epoch al máximo seguro',
      `T102: el overflow con efectos no rechazo sin wrap (${String(rechazoTopeEfectos)})`)
    afirmar(efectos4 === 0, 'T102: el overflow llego a invocar efectos')
  } finally {
    base4.close()
  }
  const slot4 = await leerFilaCruda(n4, corrida4, 'slotSesion', 'actual') as
    SlotSesion | undefined
  afirmar(slot4 !== undefined && slot4.epoch === Number.MAX_SAFE_INTEGER &&
    slot4.generacion === `${Number.MAX_SAFE_INTEGER}:tope` && slot4.estado === 'activa' &&
    slot4.actorId === 7,
  `T102: el overflow altero el slot ${JSON.stringify(slot4)}`)
  const outbox4 = await leerFilaCruda(n4, corrida4, 'outboxOperaciones', 'op-t102-tope') as
    OperacionCorteLocal | undefined
  afirmar(outbox4 !== undefined && outbox4.estado === 'pendiente' && outbox4.actorId === 7 &&
    outbox4.corteUuid === 'corte-op-t102-tope',
  `T102: el overflow altero las filas ${JSON.stringify(outbox4)}`)
  afirmar(await inspeccionarCruda(n4, 'slotSesion') === 1,
    'T102: el overflow multiplico el singleton')
  afirmar(await inspeccionarCruda(n4, 'mapeoOperaciones') === 0,
    'T102: el overflow escribio mapeos')
  await limpiar(n4, corrida4)
}

// T102.5-6: fallo de lectura IDB inyectado (el caller ve el fallo durable,
// sin confirmación simulada) y aborto tras writes (rollback total con
// generación/pending/mapping intactos), ambos verificados en crudo.
async function falloLecturaAborto(corrida: string): Promise<void> {
  // 5) FALLO DE LECTURA IDB controlado: se rompe la operación de lectura
  //    real del singleton en el pipeline de Dexie sobre IDB nativo.
  const n5 = `r02_prueba_${corrida}`
  validarNombre(n5, corrida)
  const base5 = new BaseDatosLocal(n5, () => '0:lectura-rota-inicio')
  const lecturaRota = (): never => { throw new Error('operacion-lectura-rota') }
  try {
    const repo = new RepoSesion(base5)
    const inicial5 = await repo.leerSlot()
    const e5 = identidadDe(inicial5)
    base5.slotSesion.hook('reading', lecturaRota)

    // a) leerSlot rechaza: el caller VE el fallo, nunca éxito simulado.
    const rechazoLeer = await capturarRechazo(repo.leerSlot())
    afirmar(rechazoLeer === 'operacion-lectura-rota',
      `T102: leerSlot no propago el fallo de lectura (${String(rechazoLeer)})`)

    // b) transicionar rechaza SIN invocar efectos ni escribir.
    let efectos5 = 0
    const rechazoTransicion = await capturarRechazo(repo.transicionar(
      e5, { estado: 'activa', actorId: 7 }, 'uuid-lectura-rota', {
        tablas: [base5.outboxOperaciones],
        aplicar: async () => { efectos5 += 1 },
      }))
    afirmar(rechazoTransicion === 'operacion-lectura-rota',
      `T102: transicionar no propago el fallo de lectura (${String(rechazoTransicion)})`)
    afirmar(efectos5 === 0, 'T102: el fallo de lectura llego a invocar efectos')

    // c) conSesionVigente rechaza SIN invocar el trabajo: sin activación
    //    parcial de la autoridad.
    let trabajo5 = 0
    const rechazoGuard = await capturarRechazo(repo.conSesionVigente(
      e5, [base5.outboxOperaciones], async () => { trabajo5 += 1 }))
    afirmar(rechazoGuard === 'operacion-lectura-rota',
      `T102: conSesionVigente no propago el fallo de lectura (${String(rechazoGuard)})`)
    afirmar(trabajo5 === 0, 'T102: el fallo de lectura llego a invocar el trabajo')
  } finally {
    base5.slotSesion.hook('reading').unsubscribe(lecturaRota)
    base5.close()
  }
  // Inyección retirada: la lectura vuelve y el slot sigue INTACTO (sin
  // recreate, sin epoch0 por defecto y sin nada escrito por el fallo).
  const recuperada5 = new BaseDatosLocal(n5, () => '0:lectura-recuperada')
  let slot5: SlotSesion | undefined
  try {
    slot5 = await new RepoSesion(recuperada5).leerSlot()
  } finally {
    recuperada5.close()
  }
  afirmar(slot5 !== undefined && slot5.epoch === 0 && slot5.estado === 'locked' &&
    slot5.generacion === '0:lectura-rota-inicio',
  `T102: el fallo de lectura altero el slot ${JSON.stringify(slot5)}`)
  afirmar(await inspeccionarCruda(n5, 'slotSesion') === 1,
    'T102: el fallo de lectura multiplico el singleton')
  afirmar(await inspeccionarCruda(n5, 'outboxOperaciones') === 0,
    'T102: el fallo de lectura dejo filas de outbox')
  afirmar(await inspeccionarCruda(n5, 'mapeoOperaciones') === 0,
    'T102: el fallo de lectura dejo mapeos')
  await limpiar(n5, corrida)

  // 6) ABORTO TRAS WRITES: excepción DESPUÉS de que efectos + put del slot
  //    completaron (el callback relee el slot en ESA MISMA tx y solo lanza
  //    cuando epoch 2 ya está aplicado a nivel de petición IDB).
  const corrida6 = crypto.randomUUID()
  const n6 = `r02_prueba_${corrida6}`
  validarNombre(n6, corrida6)
  const base6 = new BaseDatosLocal(n6, () => '0:aborto-inicio')
  try {
    const repo = new RepoSesion(base6)
    const inicial6 = await repo.leerSlot()
    // Transición previa con efectos: filas durables de referencia.
    const previa = await repo.transicionar(
      identidadDe(inicial6), { estado: 'activa', actorId: 7 }, 'uuid-t102-previa', {
        tablas: [base6.outboxOperaciones, base6.mapeoOperaciones],
        aplicar: async transaccion => {
          await transaccion.table<OperacionCorteLocal, string>('outboxOperaciones')
            .put(filaOutboxT101('op-t102-durable', 7))
          await transaccion.table<MapeoOperacionLocal, string>('mapeoOperaciones')
            .put({ operacionUuid: 'op-t102-durable', corteIdServidor: 71 })
        },
      })
    if (previa.tipo !== 'confirmada') throw new Error('T102: la transicion previa no confirmo')
    afirmar(previa.slot.epoch === 1 && previa.slot.generacion === '1:uuid-t102-previa' &&
      previa.slot.estado === 'activa' && previa.slot.actorId === 7,
    `T102: la transicion previa quedo rara ${JSON.stringify(previa.slot)}`)

    let invocaciones6 = 0
    const rechazo6 = await capturarRechazo(repo.transicionar(
      identidadDe(previa.slot), { estado: 'locked', actorId: null }, 'uuid-t102-aborto', {
        tablas: [base6.outboxOperaciones, base6.mapeoOperaciones],
        aplicar: async transaccion => {
          invocaciones6 += 1
          await transaccion.table<OperacionCorteLocal, string>('outboxOperaciones')
            .put(filaOutboxT101('op-t102-rollback', 7))
          await transaccion.table<MapeoOperacionLocal, string>('mapeoOperaciones')
            .put({ operacionUuid: 'op-t102-rollback', corteIdServidor: 72 })
          // Relectura en la MISMA tx: el put del slot ya está aplicado aquí
          // (las peticiones IDB se ejecutan en orden dentro de la tx).
          const visto = await transaccion.table<SlotSesionLocal, string>('slotSesion')
            .get('actual')
          if (visto === undefined || visto.epoch !== 2 ||
              visto.generacion !== '2:uuid-t102-aborto') {
            throw new Error('t102-put-pendiente')
          }
          throw new Error('fallo-t102')
        },
      }))
    // El callback NO se reporta como éxito: la promesa rechaza con la
    // excepción inyectada, no resuelve confirmada.
    afirmar(rechazo6 === 'fallo-t102',
      `T102: la excepcion tras writes no se propago al caller (${String(rechazo6)})`)
    afirmar(invocaciones6 === 1, 'T102: los efectos no se invocaron exactamente una vez')
  } finally {
    base6.close()
  }
  // Rollback total por lectura nativa posterior: generación/pending/mapping.
  const slot6 = await leerFilaCruda(n6, corrida6, 'slotSesion', 'actual') as
    SlotSesion | undefined
  afirmar(slot6 !== undefined && slot6.epoch === 1 && slot6.generacion === '1:uuid-t102-previa' &&
    slot6.estado === 'activa' && slot6.actorId === 7,
  `T102: el aborto no revirtio el slot ${JSON.stringify(slot6)}`)
  const outboxRollback = await leerFilaCruda(n6, corrida6, 'outboxOperaciones', 'op-t102-rollback')
  afirmar(outboxRollback === undefined, 'T102: el aborto no revirtio la fila de outbox')
  const mapeoRollback = await leerFilaCruda(n6, corrida6, 'mapeoOperaciones', 'op-t102-rollback')
  afirmar(mapeoRollback === undefined, 'T102: el aborto no revirtio la fila de mapeo')
  const outboxDurable = await leerFilaCruda(n6, corrida6, 'outboxOperaciones', 'op-t102-durable') as
    OperacionCorteLocal | undefined
  afirmar(outboxDurable !== undefined && outboxDurable.estado === 'pendiente' &&
    outboxDurable.actorId === 7 && outboxDurable.corteUuid === 'corte-op-t102-durable',
  `T102: el aborto destruyo la fila confirmada ${JSON.stringify(outboxDurable)}`)
  const mapeoDurable = await leerFilaCruda(n6, corrida6, 'mapeoOperaciones', 'op-t102-durable') as
    MapeoOperacionLocal | undefined
  afirmar(mapeoDurable !== undefined && mapeoDurable.corteIdServidor === 71,
    `T102: el aborto destruyo el mapeo confirmado ${JSON.stringify(mapeoDurable)}`)
  await limpiar(n6, corrida6)
}

const pruebasSesion = {
  negativas, escribir, leer, limpiar, compatibilidad, migracion, identidad, legacy,
  repoPreparar, repoTransicionar, repoLocal, repoEfectos, repoGuard, repoDefensas,
  falloCerrado, falloLecturaAborto,
}
declare global {
  interface Window { pruebasSesion: typeof pruebasSesion }
}
window.pruebasSesion = pruebasSesion
export {}
