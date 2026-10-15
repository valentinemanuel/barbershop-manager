import { BaseDatosLocal } from './baseDatosLocal'

// T97: tipos y clase viven en baseDatosLocal (testable sin singleton).
// Este módulo conserva la exportación pública histórica `db` y su nombre.
export type {
  CorteLocal,
  ServicioLocal,
  ProductoLocal,
  ConsumibleLocal,
  EstadoOperacionLocal,
  OperacionCorteLocal,
  MapeoOperacionLocal,
} from './baseDatosLocal'

export const db = new BaseDatosLocal('barberia_db', () => `0:${crypto.randomUUID()}`)
