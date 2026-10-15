# Cierre integral — T88

Desde `frontend/`, con Python/Playwright/Chromium y npm ya instalados:

```bash
npm run build
python tests/e2e/cierre_produccion.py
```

El runner sirve **dist**, con fallback de rutas profundas y proxy a una API
efímera; no ejecuta Vite dev ni importa módulos `/src/` en el navegador.
Usa puertos libres, cuentas y contraseña aleatorias, SQLite y perfil Chromium
en TEMP. Conserva log backend, screenshot y `evidencia.json`; comprueba el
SHA256 de `backend/barberia.db` antes/después. No migraciones ni datos reales.
La semilla usa `create_all` únicamente en la base sintética: esto **no valida**
la migración ni resuelve el bootstrap productivo existente.

## Recorridos comprobados

- Registro offline, recarga de ruta profunda y cierre/reapertura de Chromium
  offline con perfil persistente: catálogo y misma operación siguen disponibles.
- Reconexión: mapping a corte aceptado, momento real exacto (milisegundos
  incluidos), comisión y DTO personal; replay no crea otro corte.
- Cobro offline de 150 sobre precio 100: conserva importe en revisión; admin
  reconoce el dinero y la UI muestra excedente 50.
- Corrección offline de método sobre corte bloqueado: intervención pendiente,
  sin aplicación automática; admin aplica con motivo.
- API personal sin `parte_barberia`, otro barbero recibe el mismo 404 que para
  recurso inexistente; admin personal vacío y global autorizado. CacheStorage
  no contiene respuestas `/api/`.

## Límites de esta evidencia

No constituye cumplimiento integral de los 57 RF. El borrador previo
`cierre_integral.py` se conserva sin modificar, pero usa Vite dev y no es el
runner de aceptación. La UI administrativa de resolución no está cubierta:
las resoluciones del recorrido se efectúan por API.

Pendientes para la matriz/revisión de cierre T89: pruebas de fechas
retroactivas/servicios desactivados con valores nuevos; pagos parciales de
ambos conceptos y devoluciones/reasignación; cierres/jornadas e imputación;
concurrencia, fallos postcommit y cambio de cuenta con respuestas en vuelo;
accesibilidad y móvil. Existen tests de paquetes previos, pero este runner
no los sustituye ni certifica todos esos criterios.

Diferidos acordados: pull/historial offline RF-55 (90 días, saldos abiertos,
revocaciones y cobertura), bóveda cifrada y protocolo PostgreSQL completo.
La reapertura probada es registro con catálogo/outbox, **no** lectura offline
de `MisSaldos`, que continúa consultando la API.
