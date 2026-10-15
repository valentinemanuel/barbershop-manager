import Dexie, { Table } from 'dexie'

// T97: schema y clase SIN singleton. El nombre es explícito y el proveedor de
// generación inicial se inyecta para que T98 pueda crear el slot en populate
// sin importar auth ni adivinar identidad. Ningún open al importar.
export type ProveedorGeneracionInicial = () => string

export interface CorteLocal {
  id?: number
  barbero_id: number
  servicio_id: number
  precio: number
  porcentaje_barbero: number
  parte_barbero: number
  metodo_pago: string
  fecha: string
  sincronizado: boolean
  rechazado?: boolean
  error_sync?: string
}

export interface ServicioLocal {
  id: number
  nombre: string
  descripcion: string
  precio: number
  duracion_minutos: number
  activo: boolean
}

export interface ProductoLocal {
  id: number
  nombre: string
  descripcion: string
  precio: number
  stock: number
  stock_minimo: number
  activo: boolean
}

export interface ConsumibleLocal {
  id: number
  nombre: string
  descripcion: string
  precio: number
  stock: number
  stock_minimo: number
  activo: boolean
}

export type EstadoOperacionLocal =
  | 'pendiente'
  | 'enviando'
  | 'aceptada'
  | 'rechazada'
  | 'revision'
  | 'dependiente'

export interface OperacionCorteLocal {
  operacionUuid: string
  corteUuid: string
  actorId: number
  servicioId: number
  metodoPago: string
  precioCentavos: number
  porcentajeCentesimas: number
  modoCaptura: 'online' | 'offline'
  instanteCambio: string
  momentoReal: string
  estado: EstadoOperacionLocal
  intento: number
  ultimoError?: string
  idServidor?: number
  actualizadoEn: string
  // Abono encadenado (T54, RF-37/RF-57): solo en filas tipo abono.
  // Campos opcionales: sin cambio de índices ni versión Dexie.
  tipo?: 'corte' | 'abono' | 'edicion' | 'anulacion'
  concepto?: 'cliente' | 'comision'
  importeCentavos?: number
  dependeDe?: string
  // Edición/anulación offline (T72, RF-36/RF-40): acción y cambios
  // explícitos por unidad; el instante va en instanteCambio.
  accion?: 'editar' | 'anular'
  cambios?: { servicio_id?: number; metodo_pago?: string }
  // Id servidor conocido (T72): ediciones encoladas desde datos ya
  // sincronizados (historial) conocen el corte; si falta, se resuelve
  // por cadena corteUuid como en T54.
  corteIdServidor?: number
}

export interface MapeoOperacionLocal {
  operacionUuid: string
  corteIdServidor: number
}

// T98 (R02a): fila única del slot de sesión, clave fija 'actual'. Estado
// 'locked' significa que nadie ha reivindicado la identidad todavía; la
// autoridad de las transiciones de estado llega en T99 (sesion.ts).
export interface SlotSesionLocal {
  clave: 'actual'
  version: 1
  generacion: string
  epoch: number
  estado: 'locked'
  actorId: number | null
}

export class BaseDatosLocal extends Dexie {
  cortes!: Table<CorteLocal>
  servicios!: Table<ServicioLocal>
  productos!: Table<ProductoLocal>
  consumibles!: Table<ConsumibleLocal>
  outboxOperaciones!: Table<OperacionCorteLocal, string>
  mapeoOperaciones!: Table<MapeoOperacionLocal, string>
  slotSesion!: Table<SlotSesionLocal, string>

  readonly proveedorGeneracionInicial: ProveedorGeneracionInicial

  constructor(nombre: string, proveedorGeneracionInicial: ProveedorGeneracionInicial) {
    super(nombre)
    this.proveedorGeneracionInicial = proveedorGeneracionInicial
    this.version(1).stores({
      cortes: '++id, barbero_id, servicio_id, fecha, sincronizado',
      servicios: 'id, nombre, activo',
      productos: 'id, nombre, activo',
      consumibles: 'id, nombre, activo',
    })
    // v2 aditiva (paquete 8, T50): conserva v1 y agrega outbox + mapeo
    // por cuenta. Índices string/number, nunca boolean como clave.
    this.version(2).stores({
      cortes: '++id, barbero_id, servicio_id, fecha, sincronizado',
      servicios: 'id, nombre, activo',
      productos: 'id, nombre, activo',
      consumibles: 'id, nombre, activo',
      outboxOperaciones: 'operacionUuid, actorId, estado, instanteCambio',
      mapeoOperaciones: 'operacionUuid',
    })
    // v3 aditiva (R02a, T98): agrega el slot único de sesión. Solo añade
    // tablas/índices; nunca toca claves históricas ni filas existentes.
    // La generación inicial proviene SOLO del proveedor inyectado por el
    // caller: sin leer auth-storage, localStorage, barbero_id ni timestamp.
    this.version(3).stores({
      cortes: '++id, barbero_id, servicio_id, fecha, sincronizado',
      servicios: 'id, nombre, activo',
      productos: 'id, nombre, activo',
      consumibles: 'id, nombre, activo',
      outboxOperaciones: 'operacionUuid, actorId, estado, instanteCambio',
      mapeoOperaciones: 'operacionUuid',
      slotSesion: 'clave',
    }).upgrade(transaccion => this.inicializarSlot(transaccion.table('slotSesion')))
    // Creación nueva: Dexie dispara populate y NO los upgraders de datos.
    this.on('populate', transaccion => this.inicializarSlot(transaccion.table('slotSesion')))
  }

  // Slot inicial locked/actor null/epoch 0; solo si aún no existe. Cualquier
  // fallo (generación, escritura) propaga y aborta la tx de Dexie entera.
  private async inicializarSlot(
    tabla: Table<SlotSesionLocal, string>,
  ): Promise<void> {
    const existente = await tabla.get('actual')
    if (existente !== undefined) return
    await tabla.add(construirSlotInicial(this.proveedorGeneracionInicial()))
  }
}

// Constructor puro del slot inicial; la generación llega inyectada, fuera de
// cualquier dependencia de IDB/auth-storage.
function construirSlotInicial(generacion: string): SlotSesionLocal {
  return {
    clave: 'actual',
    version: 1,
    generacion,
    epoch: 0,
    estado: 'locked',
    actorId: null,
  }
}
