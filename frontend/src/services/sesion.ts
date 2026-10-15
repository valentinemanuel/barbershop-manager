/**
 * Sesión durable por cuenta (paquete 8, T53, RF-33 parcial, RNF-5).
 * Puro e inyectable: el store real es `localStorage`, los tests usan memoria.
 * Sin cifrado en este paquete (aislamiento simplificado aprobado): las filas
 * locales persisten por cuenta (`actorId`) y nunca se leen ni envían como
 * de otra; el cambio de cuenta invalida la generación para que respuestas
 * tardías no toquen datos de la cuenta nueva.
 */

export interface SesionCuenta {
  titularId: number | null;
  generacion: number;
  ultimoRol: string | null;
  actualizadoEn: string;
}

export interface AlmacenSesion {
  get: (clave: string) => string | null;
  set: (clave: string, valor: string) => void;
  del: (clave: string) => void;
}

const CLAVE = 'sesion-activa-cuenta';

function leer(store: AlmacenSesion): SesionCuenta {
  const raw = store.get(CLAVE);
  if (!raw) {
    return { titularId: null, generacion: 0, ultimoRol: null, actualizadoEn: '' };
  }
  try {
    const datos = JSON.parse(raw) as Partial<SesionCuenta>;
    return {
      titularId: typeof datos.titularId === 'number' ? datos.titularId : null,
      generacion: typeof datos.generacion === 'number' ? datos.generacion : 0,
      ultimoRol: typeof datos.ultimoRol === 'string' ? datos.ultimoRol : null,
      actualizadoEn: typeof datos.actualizadoEn === 'string' ? datos.actualizadoEn : '',
    };
  } catch {
    return { titularId: null, generacion: 0, ultimoRol: null, actualizadoEn: '' };
  }
}

function guardar(store: AlmacenSesion, sesion: SesionCuenta): SesionCuenta {
  store.set(CLAVE, JSON.stringify(sesion));
  return sesion;
}

/**
 * Instala la sesión del titular. Mismo titular reconectado conserva su
 * generación (sus pendientes siguen vigentes); titular distinto la sube
 * (los pendientes del anterior dejan de ser enviables/aplicables).
 */
export function instalarSesion(
  store: AlmacenSesion,
  titularId: number,
  rol: string,
  ahora: Date = new Date(),
): SesionCuenta {
  const previa = leer(store);
  const generacion =
    previa.titularId === titularId ? previa.generacion : previa.generacion + 1;
  return guardar(store, {
    titularId,
    generacion,
    ultimoRol: rol,
    actualizadoEn: ahora.toISOString(),
  });
}

/**
 * Cierra la sesión durable: sube la generación y deja sin titular.
 * Las filas locales persisten por cuenta (sin borrado), pero ninguna
 * respuesta en vuelo con generación anterior puede aplicarse después.
 */
export function invalidarSesion(
  store: AlmacenSesion,
  ahora: Date = new Date(),
): SesionCuenta {
  const previa = leer(store);
  return guardar(store, {
    titularId: null,
    generacion: previa.generacion + 1,
    ultimoRol: previa.ultimoRol,
    actualizadoEn: ahora.toISOString(),
  });
}

/** Una respuesta solo puede aplicarse si titular y generación coinciden. */
export function esRespuestaVigente(
  capturada: { titularId: number | null; generacion: number },
  actual: { titularId: number | null; generacion: number },
): boolean {
  return (
    capturada.titularId !== null &&
    capturada.titularId === actual.titularId &&
    capturada.generacion === actual.generacion
  );
}

/** Regla de alcance: la fila local solo pertenece a su actor. */
export function perteneceALaCuenta(actorFila: number, titularId: number | null): boolean {
  return titularId !== null && actorFila === titularId;
}

/** Lee la sesión durable del navegador (fuera de tests). */
export function leerSesionNavegador(): SesionCuenta {
  try {
    return leer({
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
      del: (k) => localStorage.removeItem(k),
    });
  } catch {
    return { titularId: null, generacion: 0, ultimoRol: null, actualizadoEn: '' };
  }
}

// ---------------------------------------------------------------------------
// T99 (R02a, RF-33/RNF-5 parciales, RNF-6): identidad, generación y
// decisiones puras del slot durable. CERO imports de db/repo/auth/storage,
// sin reloj, token ni rol: la parte aleatoria de la generación llega
// inyectada por el caller (crypto.randomUUID queda fuera de este módulo).
// Todo error es genérico y nunca hace eco de los datos validados.
// ---------------------------------------------------------------------------

const ERROR_SLOT = 'Slot de sesión inválido';
const ERROR_TRANSICION = 'Transición de sesión inválida';
const ERROR_EPOCH = 'Transición de sesión rechazada: epoch al máximo seguro';

// Campos exactos del slot: cualquier credencial o campo extra invalida la fila.
const CAMPOS_SLOT = ['clave', 'version', 'generacion', 'epoch', 'estado', 'actorId'] as const;

/** Fila única del slot, sin token, rol, usuario, timestamps ni negocio. */
export type SlotSesion =
  | {
      readonly clave: 'actual';
      readonly version: 1;
      readonly generacion: string;
      readonly epoch: number;
      readonly estado: 'activa';
      readonly actorId: number;
    }
  | {
      readonly clave: 'actual';
      readonly version: 1;
      readonly generacion: string;
      readonly epoch: number;
      readonly estado: 'locked';
      readonly actorId: null;
    };

/** Snapshot readonly de los seis campos: el CAS compara TODOS, no solo actor. */
export interface IdentidadSesion {
  readonly clave: 'actual';
  readonly version: 1;
  readonly generacion: string;
  readonly epoch: number;
  readonly estado: 'activa' | 'locked';
  readonly actorId: number | null;
}

/** Estado destino explícito de una transición. */
export type DestinoSesion =
  | { readonly estado: 'activa'; readonly actorId: number }
  | { readonly estado: 'locked'; readonly actorId: null };

/** Confirmada solo tras commit (T100); conflicto SIN datos del ganador. */
export type ResultadoCAS =
  | { readonly tipo: 'confirmada'; readonly slot: SlotSesion }
  | { readonly tipo: 'conflicto' };

/**
 * Validación estricta de `unknown` (fila leída de IDB o construida por un
 * caller): rechaza tipos inválidos, campos/credenciales extra, booleanos
 * como IDs, epoch/actor no enteros seguros o fuera de rango, `activa` sin
 * actor y `locked` con actor. Siempre Error genérico sin eco de datos.
 */
export function validarSlotSesion(entrada: unknown): SlotSesion {
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
    throw new Error(ERROR_SLOT);
  }
  const fila = entrada as Record<string, unknown>;
  const llaves = Object.keys(fila);
  const incompleta = CAMPOS_SLOT.some(
    (campo) => !Object.prototype.hasOwnProperty.call(fila, campo),
  );
  if (llaves.length !== CAMPOS_SLOT.length || incompleta) {
    throw new Error(ERROR_SLOT);
  }
  if (fila['clave'] !== 'actual' || fila['version'] !== 1) {
    throw new Error(ERROR_SLOT);
  }
  const generacion = fila['generacion'];
  if (typeof generacion !== 'string' || generacion.length === 0) {
    throw new Error(ERROR_SLOT);
  }
  const epoch = fila['epoch'];
  if (typeof epoch !== 'number' || !Number.isSafeInteger(epoch) || epoch < 0) {
    throw new Error(ERROR_SLOT);
  }
  const estado = fila['estado'];
  const actorId = fila['actorId'];
  if (estado === 'activa') {
    if (typeof actorId !== 'number' || !Number.isSafeInteger(actorId) || actorId < 1) {
      throw new Error(ERROR_SLOT);
    }
    return { clave: 'actual', version: 1, generacion, epoch, estado: 'activa', actorId };
  }
  if (estado === 'locked') {
    if (actorId !== null) {
      throw new Error(ERROR_SLOT);
    }
    return { clave: 'actual', version: 1, generacion, epoch, estado: 'locked', actorId: null };
  }
  throw new Error(ERROR_SLOT);
}

/** CAS de identidad: comparan los seis campos, no solo actor o generación. */
export function coincideSlot(actual: SlotSesion, esperado: IdentidadSesion): boolean {
  return (
    actual.clave === esperado.clave &&
    actual.version === esperado.version &&
    actual.generacion === esperado.generacion &&
    actual.epoch === esperado.epoch &&
    actual.estado === esperado.estado &&
    actual.actorId === esperado.actorId
  );
}

/** El contexto capturado solo está activo si coincide Y el slot está activo. */
export function esContextoActivo(contexto: IdentidadSesion, actual: SlotSesion): boolean {
  return coincideSlot(actual, contexto) && actual.estado === 'activa';
}

/**
 * Decisión pura de transición (sin escribir nada): CAS sobre el esperado
 * completo y, si coincide, nueva generación `${epoch+1}:${aleatorio}` con
 * epoch monotónico. El string aleatorio lo inyecta el caller; aquí jamás
 * hay crypto.randomUUID ni reloj. Misma cuenta/estado también rota
 * (ABA A→B→A imposible: el prefijo es el nuevo epoch). El conflicto solo
 * expone `{ tipo: 'conflicto' }`, sin identidad ni datos del ganador.
 *
 * Orden de decisiones: primero CAS (un CAS desfasado es conflicto, incluso
 * en el tope de epoch); después el tope; después los parámetros.
 */
export function prepararTransicion(
  actual: SlotSesion,
  esperado: IdentidadSesion,
  destino: DestinoSesion,
  aleatorio: string,
): ResultadoCAS {
  // Slot corrupto en runtime => Error genérico, nunca conflicto aparente.
  const slotActual = validarSlotSesion(actual);
  if (!coincideSlot(slotActual, esperado)) {
    return { tipo: 'conflicto' };
  }
  // Toda transición confirmada exige epoch+1: en MAX_SAFE_INTEGER no hay
  // incremento posible. Se lanza Error genérico (sin wrap, sin simular
  // éxito y sin inventar una tercera variante de ResultadoCAS, que el
  // contrato R02 fija en exactamente dos).
  if (slotActual.epoch >= Number.MAX_SAFE_INTEGER) {
    throw new Error(ERROR_EPOCH);
  }
  if (typeof aleatorio !== 'string' || aleatorio.length === 0) {
    throw new Error(ERROR_TRANSICION);
  }
  const epoch = slotActual.epoch + 1;
  // El resultado se revalida entero: un destino malformado (actor inválido)
  // se rechaza con el mismo Error genérico y sin alias con la entrada.
  const siguiente = validarSlotSesion({
    clave: 'actual',
    version: 1,
    generacion: `${epoch}:${aleatorio}`,
    epoch,
    estado: destino.estado,
    actorId: destino.actorId,
  });
  return { tipo: 'confirmada', slot: siguiente };
}
