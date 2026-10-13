# MEMORY.md - Memoria del Proyecto

## Resumen Ejecutivo
Sistema de gestión para barbería con backend FastAPI + frontend React PWA. Permite registrar cortes, gestionar barberos con porcentajes, productos, consumibles, gastos y reportes. Funciona offline con sincronización.
- **Repo**: `valentinemanuel/barbershop-manager` (renombrado de `barberia-manager`, oct 2026)

## Decisiones Arquitectónicas
- **Backend**: FastAPI + SQLAlchemy 2.0 + SQLite (migrable a PostgreSQL)
- **Frontend**: React 18 + Vite + TypeScript + PWA
- **Auth**: JWT con refresh tokens, roles admin/barbero
- **Offline**: IndexedDB (Dexie) con sync bidireccional
- **Monedas**: Decimal en backend, cents (enteros) en frontend
- **Fechas**: UTC en backend, local en frontend; strings solo-fecha (`YYYY-MM-DD`) se parsean como fecha LOCAL (nunca como UTC, retrocedería un día)
- **Diseño frontend (spec 001)**: sistema propio "Tinta & hueso" — tokens CSS + kit `components/ui`, sin frameworks CSS; Archivo Variable self-hosted, iconos `lucide-react`
- **Herramientas MCP**: plantilla sin credenciales en `opencode.json.example` y guía en `docs/mcp.md`; Playwright para navegador, Context7 para documentación, SQLite y GitHub opcionales. No confundir configuración con conexión verificada.

## Estado Actual
- [x] Estructura del proyecto
- [x] Documentación base
- [x] Modelos de base de datos
- [x] Autenticación JWT
- [x] CRUD usuarios y servicios
- [x] Registro de cortes
- [x] Productos y consumibles
- [x] Gastos y cierre de caja
- [x] Reportes y dashboard
- [x] Frontend completo (spec 001: sistema de diseño unificado, T1–T11 verificadas)
- [x] PWA offline
- [x] Sincronización (E2E offline verde: encolar → reconectar → sincronizar)
- [ ] Tests (backend con pytest; frontend solo tests visuales/E2E Playwright en `frontend/tests/visuales/`)

## Pendientes Importantes
1. Spec 002: revisión T89 ejecutada; aceptación **bloqueada por P1-1–P1-8** de `specs/002-registro-cortes/cierre.md`. Regresión 356 backend + 11 scripts frontend + build/E2E verdes no equivale a cumplimiento. Pull RF-55/hija003 borrador, bóveda/PG/locale diferidos; no declarar «completa salvo pull» ni marcar T89 hecha.
   - Plan correctivo aprobado; R01 T90–T95 completas y reviewer **APROBADO R01 y T95**, 323 tests aislados verdes. R02a T96–T103 completas y reviewer de cierre **APROBADO R02a y T103** (2026-10-13): autoridad de slot aislada e inactiva, sin integración. R02b (authStore/commit-first/token-401) sin desglose ni autorización; todos los P1 abiertos.
2. Duda abierta spec 001: locale del formato de moneda (`$1,234.56` en-US vs `$1.234,56` es-AR)
3. `lucide-react`/`@fontsource-variable/archivo` quedaron dentro del commit de spec 000 (11ba0c9); moverlos al commit de spec 001 si se reordena el historial
4. Tests de integración backend

## Notas Críticas
- Porcentaje barbero SOLO a servicios, nunca productos/consumibles
- Barberos NUNCA ven totales brutos ni datos de otros
- Sincronización: last-write-wins con timestamp
- SQLite en desarrollo, PostgreSQL en producción
- IndexedDB: los booleanos NO son claves válidas → `where('sincronizado').equals(0)` devuelve siempre `[]`; usar `.filter()` en memoria (fix en `useSync.ts`, verificado 0 vs 1)
- Git flow: ramas de trabajo desde `dev` actualizado → PR a `dev`; releases mediante PR `dev` → `main`, decididas y ejecutadas por el propietario. Sin push directo a `dev` ni a `main`.

## Revisión de integraciones (2026-10-05)
- Specs 000 y 001 ya integradas: PR #6 y #7, respectivamente; ambas presentes en `origin/dev` y `origin/main`. La nota anterior de merges pendientes estaba desactualizada.
- PR #8 (flujo Git con `dev`) y #9 (`dev` → `main`) ya integrados. PR #10 (animación del login) también integrado en `main` mediante PR #11, comprobado al preparar la recuperación documental.
- Recuperación selectiva del commit documental histórico `b211ee5`: PR #12 (`docs/recover-mcp-documentation` → `dev`) preparado en worktree independiente. No se ha verificado aquí un merge posterior de ese PR. La rama histórica no se integró ni reescribió.

## Spec 002 — historial de borrador y clarificación (2026-10-05)
- Alcance confirmado: registro online/offline, fecha real, historial propio, edición/anulación, deuda del cliente y comisión del barbero con pagos parciales independientes.
- Valores actuales al aceptar un corte; servicios desactivados posteriormente no invalidan los cortes offline. Admin registra retroactivos para cualquier barbero sin valores históricos manuales.
- Primer cobro del cliente o pago de comisión, aunque parcial, o inclusión en cierre: bloquea edición/anulación del barbero. Correcciones administrativas con motivo y trazabilidad.
- Diez dudas abiertas documentadas para clarificación: redondeo; pagos offline y validaciones; reversos/cierres; estado inicial y movimientos; conflictos; recálculo al editar; entidades inactivas/eliminadas; fechas; datos históricos/historial offline; pagos posteriores al cierre.
- Primera revisión de `sdd-clarifier` realizada por solicitud del usuario: requiere iteración. Hallazgos registrados en la spec; respuestas de primera ronda incorporadas sin iniciar fases posteriores.
- Primera ronda confirmada: pesos argentinos (ARS), redondeo matemático al centavo; elegir cobro pendiente/parcial/completo al registrar; excesos offline pendientes de revisión administrativa; cierre original conservado con ajustes posteriores; edición offline recibida después del primer pago aceptado pendiente de intervención administrativa.
- RF-37 a RF-40 y RNF-1 actualizados; DA-1 a DA-5 acotadas a decisiones restantes. La spec continúa en borrador, sin plan, tareas ni implementación.
- Segunda ronda incorporada (RF-41 a RF-45): porcentajes 0–100 y abonos positivos con hasta dos decimales, rechazo de entradas inválidas/excesos online; recálculo con valores actuales al cambiar servicio, no al cambiar solo método; admin corrige fecha/barbero; históricos sin información sin pagos/deudas inventados; compensaciones con motivo y devoluciones explícitas; servicios separados de movimientos y ajustes en jornada abierta cuando la real ya cerró.
- DA-1 resuelta. Pendientes acotados incluyen resolución de revisiones/saldos, anulaciones/reasignaciones con dinero, datos de movimientos, conflictos y dependencias, entidades inactivas/inexistentes, fechas, cobertura offline y pertenencia a cierres.
- Segunda revisión de `sdd-clarifier`: requiere iteración. Cinco paquetes de políticas propuestos para aprobación, no adoptados: anulación/reasignación; jornadas/fechas; entidades inactivas/inexistentes; movimientos/conflictos; saldos/históricos/historial offline. Correcciones editoriales de RF-12/21/33/41 incorporadas sin introducir decisiones de negocio adicionales.
- Usuario acepta los cinco paquetes: incorporados RF-46 a RF-57 y reglas actualizadas; DA-1 a DA-10 cerradas con trazabilidad. Jornada `America/Argentina/Buenos_Aires`; fechas futuras administrativas rechazadas, retroactivos sin límite y reloj adelantado más de cinco minutos a revisión. Sin jornada abierta: movimiento aceptado pendiente de imputación conserva su saldo financiero.
- Anulación/reasignación conservan dinero como excedente cuando corresponda y no trasladan comisiones ya pagadas entre profesionales. Historial offline de 90 días propios más saldos abiertos y pendientes; importes en revisión/rechazados separados de saldos aceptados. Revisión final de clarificación pendiente, sin aprobación global ni fases posteriores.
- El alcance es transversal; el plan deberá evaluar si requiere división antes de producir más de diez tareas.

## Spec 002 — resultado vigente de clarificación (2026-10-05)
- Revisión final de `sdd-clarifier`, solicitada expresamente por el usuario: **LISTA PARA PLAN**. No se necesitan nuevas preguntas de negocio ni otra iteración; las notas de rondas previas son históricas, no bloqueantes vigentes.
- Ajustes editoriales incorporados en las definiciones de sincronización y jornada. No se añadió atomicidad todo-o-nada de corte+pago; se mantienen resultados individuales de RF-57.
- Dictamen registrado en la spec, que sigue en borrador hasta aprobación explícita. No se creó `plan.md` ni `tasks.md` ni se modificó código de aplicación. El cambio ajeno en `.opencode/agents/coordinator.md` se preservó sin modificarlo.

## Spec 002 — resultado vigente de planificación (2026-10-05)
- El usuario aprobó la spec completa y autorizó planificar. Spec marcada aprobada; `sdd-planner` creó `specs/002-registro-cortes/plan.md` como borrador de plan global.
- Plan de 670 líneas: exploración, inventario de archivos, modelos/journal por profesional, exactitud Decimal/centavos, migraciones conservadoras, idempotencia por operación, aislamiento por cuenta, interfaces, pseudocódigo, tests y rollback. Matriz documental verificada: 57 RF y 6 RNF presentes, sin whitespace sobrante; no se ejecutaron tests de aplicación ni migraciones.
- Propuesta de ocho macroentregas A–H, no aprobada todavía: fundaciones/migración; registro/historial; outbox/sync/cuentas; abonos/saldos; correcciones/anulación; reasignación/históricos; jornadas/cierres; integración UX/PWA/regresión. No equivalen a ocho tareas pequeñas.
- Estimación global inicial del planner: 140–214 horas efectivas, amplia y provisional, a recalibrar. La propuesta de 35–60 paquetes fue retirada tras auditoría; no se crearon subspecs ni tareas. Se propone únicamente un primer paquete de funciones monetarias puras y tests aislados, 2–4 horas y ≤10 tareas, pendiente de aprobación de división.
- Riesgos explicitados: pendientes/cierres legacy ambiguos, convivencia de clientes v1/v2, protección de claves de almacenamiento local y concurrencia SQLite. Validación de copias sanitizadas y entornos efímeros se autorizará aparte; no acceder a datos reales por aprobar este plan.
- Pendiente aprobación del plan y su estrategia de división. Sin código, commits, push, tareas ni fases posteriores. Los cambios ajenos de coordinación y constitución se preservaron.

## Spec 002 — auditoría antes de tareas (2026-10-05)
- Usuario pide revisar el plan y generar tareas solo después de una revisión satisfactoria. No es posible garantizar cero errores por revisión documental; no se afirmó esa garantía ni se ejecutaron tests.
- `sdd-reviewer` detectó seis P1. Plan corregido por `sdd-planner`: orden global de bloqueos y writers, estados dependientes/idempotencia, origen online/offline estable, claves durables de sesión y compensaciones/capacidad real de devolución. Segunda auditoría considera cinco P1 documentalmente resueltos; LWW permanece bloqueante de negocio en DA-11.
- Precisiones adicionales incorporadas: versiones del lockfile, SQLite raw, pertenencias históricas no inferidas, jornadas ausentes/snapshot paginado y revocaciones aplicadas inmediatamente aun si el pull falla, sin restaurar detalle ya revocado.
- Falta confirmar anulación concurrente terminal vs LWW entre operaciones permitidas y unidad registro/campos acoplados. No se decidió prioridad por cuenta propia.
- Propuesta pendiente: primer paquete aislado `dinero_cortes.py` + test puro, sin API/DB/migración/cifrado/sync, cobertura parcial RF-3/RF-4/RF-41/RNF-1, 2–4h y ≤10 futuras tareas. El resto se divide progresivamente manteniendo el contrato global; no crear `tasks.md` global enorme ni macro-tareas disfrazadas.

## Spec 002 — resultado vigente de tareas (2026-10-05)
- Usuario acepta anulación autorizada terminal y LWW por método/fecha independientes y grupo financiero coherente, sin eludir permisos/pagos/cierre. RF-36/RF-40 y plan actualizados antes del desglose; DA-11 cerrada.
- Usuario autoriza división progresiva y creación de tareas únicamente para el primer paquete monetario puro. No se autoriza implementación ni paquetes posteriores.
- `sdd-reviewer` verifica coherencia de spec/plan: **LISTO PARA TAREAS DEL PAQUETE 1**. Creado `specs/002-registro-cortes/tasks.md`: seis tareas de 20–30 min (2–3h), dependencias, RF/RNF parciales, «Hecho cuando:», comando aislado y evidencia futura explícitamente no ejecutada.
- Segunda revisión de tareas: **TAREAS APTAS PARA EL PAQUETE 1**, sin bloqueantes. Precisión editorial incorporada sobre conservación de todos los parámetros del contexto Decimal.
- Archivos productivos futuros limitados a `backend/app/services/dinero_cortes.py` y `backend/tests/test_dinero_cortes_aislado.py`; no se crearon todavía. Sin API, datos, migraciones, nuevas dependencias ni suite global. Cobertura parcial RF-3/RF-4/RF-41/RNF-1, no cumplimiento integral de 57 RF.
- Próximo paso: aprobación explícita para implementar T1 con tests primero, verde, marcar únicamente esa tarea y parar. No se realizaron commits/push/merges ni modificaciones a cambios ajenos.

## Spec 002 — autorización vigente de implementación
- Usuario responde «Comienza» y luego confirma «Implementar las seis actuales» ante aclaración de alcance. Autoriza T1–T6 del paquete monetario, en orden; no redactar ni implementar paquetes globales adicionales.
- Cada ejecución de `sdd-implementer` aborda solo una tarea y para; el coordinador inicia la siguiente tras verificar evidencia y ausencia de bloqueantes. Se mantienen los dos archivos productivos, aislamiento de pytest y prohibición de DB/API/migraciones/dependencias.

## Spec 002 — resultado de implementación del paquete 1
- Ejecutadas seis invocaciones secuenciales de `sdd-implementer`, una por tarea. Creados solo `backend/app/services/dinero_cortes.py` y `backend/tests/test_dinero_cortes_aislado.py`; tres funciones puras Decimal y pruebas aisladas. T1–T6 marcadas con comandos y resultados en `tasks.md`.
- T1: módulo ausente en rojo → 33 verdes. T2: función ausente en rojo → 75 verdes. T3: función ausente en rojo → 117 verdes. T4: 125 verdes iniciales, sin fallo artificial. T5: 24 fallos/143 verdes iniciales → 167 verdes. T6: 167 verdes finales (0.12s, salida 0).
- Contexto privado de aritmética, redondeo explícito solo de comisión, barbería como resto exacto y contexto llamador intacto; sin convertir entradas ni aceptar no-Decimal/no finitos/precisión excesiva. Valores grandes representables y error explícito de límite técnico probados.
- Python 3.11.9/pytest 7.4.3 existentes; imports/configuración comprobados y runner aislado del plan, sin fixtures globales, `app.main`, DB, suite global ni instalaciones. No se cambiaron API/modelos/servicios existentes. Sin commits, push ni merges.
- Cobertura parcial RF-3/RF-4/RF-41/RNF-1 y evidencia RNF-6, no cumplimiento integral de la spec. Próximo paso inmediato: revisión de cierre documental/código/tests del paquete, sin implementar otra tarea o paquete ni iniciar validación integral de la spec.

## Spec 002 — cierre del paquete 1
- `sdd-reviewer` dictamina **APROBADO PAQUETE 1**, sin correcciones ni bloqueantes dentro del alcance. Verificación independiente de imports/configuración, firmas/contratos, aritmética/contexto y seis tareas/evidencia.
- Reejecución exclusiva del test puro con el runner aislado: `167 passed in 0.13s`. Los resultados rojos históricos se contrastaron documentalmente, no se reprodujeron rompiendo código.
- Cierre limitado al paquete de dos archivos; la aplicación todavía no usa esas funciones. No constituye validación integral de 57 RF/6 RNF ni autoriza paquete 2, API, DB, migraciones o frontend. Próximo paso: proponer el siguiente paquete solo si el usuario lo aprueba.
- Git flow: ramas de trabajo desde `dev` → PR a `dev`; `dev` → `main` por release

## Spec 002 — paquete 2 redactado (2026-10-06)
- Simplificación aprobada por el usuario: sin bóveda cifrada (stores por cuenta + wipe), sin barrera global de locks (UoW monoescritor `BEGIN IMMEDIATE`, protocolo completo diferido a PostgreSQL), sin escritura dual (centavos INTEGER solo en tablas nuevas, legacy congelado), pull por cursor+revisión sin manifests, LWW con marcadores por unidad en vez de tablas de candidatos, sin React Query y Vitest mínimo.
- Alcance del paquete 2 aprobado y `tasks.md` redactado (T7–T13, ~3h) en rama `feat/spec-002-paquete-2-fundaciones`: conectar `dinero_cortes` al registro, validación canónica, UoW única (commitean routers), validador en schema usuario, snapshot aplicado, esqueleto Alembic solo-inspección y regresión Decimal exacta. Excluye DTO personal (gate `parte_barberia`), `create_all`, sync, frontend y movimientos.
- Implementación T7–T13 completada (7 commits, pusheados a la misma rama): reparto puro conectado (fix real HALF_UP `0.02`→`0.03`), rechazo de precisión excesiva/no-Decimal con 400, UoW única, validador en schemas usuario, snapshot probado inmutable, Alembic solo-inspección y regresión exacta (36+4+167 verdes). `barberia.db` intacta en toda la secuencia (mismo hash). Hallazgo: el ORM oculta excesos de precisión al leer (raw 10.005 → `10.01`); resuelto con T8-bis (validador en `schemas/servicio.py`, decisión delegada por el usuario). Revisión de cierre ejecutada: **APROBADO PAQUETE 2** sin bloqueantes (4 P2 menores en `tasks.md`); no autoriza paquete 3 ni declara la spec implementada.

## Spec 002 — paquete 3 redactado (2026-10-06)
- Gate §11.2 (`parte_barberia` en DTO personal): el usuario rechaza documentar excepción y aprueba corregir ahora. Verificado: reportes solo admin, 3 endpoints personales afectados, frontend sin display en vistas barbero, sin consumidores externos.
- `tasks.md` con T14–T19 (~2–3h) en rama `feat/spec-002-paquete-3-contratos-personales`: DTO `CortePersonal`, 3 endpoints, test de privacidad integral, limpieza frontend y regresión. Decisión registrada: detalle compartido pasa a DTO personal; admin conserva listado + reportes.
- Revisión de cierre ejecutada: **APROBADO PAQUETE 3** sin correcciones (3 P2 informativos en `tasks.md`). No autoriza paquete 4 ni declara la spec implementada.

## Spec 002 — paquete 3 mergeado + paquete 4 redactado (2026-10-06)
- PR #22 mergeado a `dev` (paquete 3 integrado). `main` detrás: release `dev → main` a decisión del propietario.
- `tasks.md` con T20–T25 (~2–3h) en rama `feat/spec-002-paquete-4-registro-online`: destino admin, momento retroactivo admin, momento automático barbero, snapshot del destinatario, errores exactos y regresión. Decisiones: `barbero_id`/`momento_real` solo admin (403/400 si barbero los envía), destino inactivo permitido con porcentaje, sin precio/porcentaje manual.
- Implementación T20–T25 completada y pusheada a la misma rama (82 backend + 167 aislada en verde). `barberia.db` intacta (mismo hash).
- Revisión de cierre ejecutada: **APROBADO PAQUETE 4** sin correcciones (P2-1 destacado: destino sin validar rol —admin podría atribuir a otro admin— requiere tu decisión de spec). No autoriza paquete 5 ni declara la spec implementada.
- P1-2 reportado como **deuda bloqueante del paquete de auditoría**: edición admin en bloqueado exige motivo pero lo descarta y pisa valores (RF-26 parcial). Ver decisión del usuario en MEMORY.
- Decisión del usuario sobre P1-2 (delegada al coordinador): journal mínimo ahora en vez de deuda. Implementado T46-bis en la misma rama (tabla `auditoria_corte` + migración `005` + hooks en PATCH/anular, 120 + 167 verdes, DB con tabla vacía baseline `bd4c32af…`). P1-2 CERRADO.
- Decisión P2-1 tomada por el usuario: restringir destino a barberos (propio explícito permitido). Implementada en rama `fix/destino-solo-barberos` (rojo→verde, 58 passed, DB intacta).

## Spec 002 — paquete 5 implementado y aprobado (2026-10-06)
- Alcance T26–T33 (~3–4h) en rama `feat/spec-002-paquete-5-idempotencia`: journal idempotente mínimo, ejecutor get-or-create + hash, camino POST con UUID opcional, conflicto 409, replay sin recalcular, doble envío simultáneo, UUID en sync y regresión. Decisiones: UUID opcional (legacy intacto), namespace web/sync, solo estados terminales. Gate: ningún `upgrade` contra base real sin aprobación + backup verificado.
- T26–T33 en verde + `sdd-reviewer`: **APROBADO PAQUETE 5**. Aplicados P2 del reviewer: header/tasks al día, `ReintentosAgotados` → 500 en POST y sync (test determinista), redacción T27. Divulgación vigente: `barberia.db` ganó la tabla vacía `operaciones_corte` por `create_all` histórico (0 filas, legacy intacto). No autoriza paquete 6 ni declara la spec implementada.

## Spec 002 — paquete 6 redactado (2026-10-06)
- `tasks.md` con T34–T41 (~3–4h) en rama `feat/spec-002-paquete-6-abonos-saldos`: tabla movimientos + migración 003, abonos por concepto, independencia, saldos/estados, cobro inicial, exceso online + bloqueo calculado, privacidad y regresión. Decisiones: UUID por movimiento, obligación = precio/parte_barbero, sin excedentes/unknown/revisión en este paquete, endpoint de saldos separado, gate de migración real vigente.
- T34–T41 en verde + `sdd-reviewer`: **APROBADO PAQUETE 6**. Corrección de la revisión: `uuid` de movimiento validado como `UUID` + test 422. Divulgación verificada: `barberia.db` ganó la tabla vacía `movimientos_corte` por `create_all` histórico (0 filas, legacy intacto, baseline `4c7f1b19…`). P2 para futuro: carrera concurrente de abonos sin lock, UUID duplicada sin 409 ante distinto payload, rama offline sin revisión RF-38 todavía. No autoriza paquete 7 ni declara la spec implementada.

## Spec 002 — paquete 7 redactado (2026-10-06)
- `tasks.md` con T42–T49 (~3–4h) en rama `feat/spec-002-paquete-7-edicion-anulacion`: columnas de anulación + migración 004, edición propia con recálculo RF-42, bloqueo 409, anulación con motivo admin, fuera de devengado + sin abonos al anulado, privacidad y regresión. Decisiones: 409 bloqueado/anulado, motivo obligatorio admin en bloqueado, admin conserva listado + reportes, sin compensaciones/revisión/jornadas en este paquete. Implementación pendiente de aprobación.

## Spec 002 — paquete 7 implementado y revisado (2026-10-06)
- T42–T49 en verde + `sdd-reviewer`: REQUIERE CORRECCIONES → P1-1 (resúmenes personales contaban anulados) corregido por la revisión y verificado por el coordinador; P2 aplicados (downgrade FK, redacción T46). Tras correcciones: **APROBADO PAQUETE 7**.
- P1-2 reportado como **deuda bloqueante del paquete de auditoría**: edición admin en bloqueado exige motivo pero lo descarta y pisa valores (RF-26 parcial). Requiere decisión del usuario antes del merge (aceptar deuda o journal mínimo).
- Divulgación vigente: `barberia.db` estable (`4c7f1b19…`). No autoriza paquete 8 ni declara la spec implementada.

## Spec 002 — paquete 8 redactado (2026-10-07)
- `tasks.md` con T50–T57 en rama `feat/spec-002-paquete-8-outbox-sync`: outbox Dexie v2 persist-first, push cortes/abonos con UUID obligatoria v2 + estados, exceso/reloj a revisión, aislamiento simplificado por cuenta, cobro inicial offline con resultados individuales, catálogo que no se pierde + PWA sin api-cache, revalidación al sincronizar y regresión. Decisiones del usuario: cortes+abonos, UUID obligatoria v2, simplificado, pull diferido, LWW diferido. Prohibidos: pull RF-55, LWW/RF-40, jornadas, bóveda, upgrades reales. Implementación pendiente de aprobación.

## Spec 002 — paquete 8 implementado y revisado (2026-10-07)
- T50–T57 en verde + `sdd-reviewer`: **APROBADO PAQUETE 8** con 4 P1 corregidos por la revisión y re-verificados por el coordinador (reloj solo adelantado, lote v2 sin abonos, cadena por `corteUuid`, fin de la doble escritura offline). Backend 299 + frontend 4 node + build OK; `barberia.db` estable (`bd4c32af…`).
- Deuda no bloqueante registrada: puentes float en el camino nuevo (`toFixed`/`Math.round` + conversor global `Number()`); el cliente typed 002 queda para el paquete UX. P2: `String(9)` vs `Enum` en PostgreSQL, `window.alert` legacy, 202 sin journal, POST online sin UUID.
- No autoriza paquete 9 ni declara la spec implementada.

## Spec 002 — paquete 9 implementado y revisado (2026-10-08)
- T58–T65 en verde + `sdd-reviewer`: **APROBADO PAQUETE 9** sin correcciones (re-ejecutó 147 + 167 en verde; aritmética y códigos verificados). `barberia.db` estable (`bd4c32af…`).
- P2 no bloqueantes (ver cierre en tasks): erroneo re-ejecutable sin UUID, compensación positiva sin evidencia, replay real→409, estado pagado en anulado-sin-dinero, concepto vs original sin validar, deuda float-display heredada.
- No autoriza paquete 10 ni declara la spec implementada.

## Spec 002 — paquete 10 implementado y revisado (2026-10-08)
- T66–T73 en verde + `sdd-reviewer`: **APROBADO PAQUETE 10** sin correcciones (re-ejecutó 140 + 22 + 167 + 6 node + build; migraciones en TEMP; aritmética y códigos verificados). `barberia.db` estable (`79facc3f…`, solo tabla vacía 009 por `create_all`).
- P2 no bloqueantes (ver cierre en tasks): bases/version informativas, empate sin tiebreak, aplicar-intervención gana LWW, backfill 008 ante create_all, resúmenes sin desconocido, deudas heredadas paquete 9.
- No autoriza paquete 11 ni declara la spec implementada.

## Spec 002 — paquete 11 implementado y revisado (2026-10-09)
- T74–T81 en verde + `sdd-reviewer`: **APROBADO PAQUETE 11** (re-ejecutó 182 + 167 + 8 node + build; 2 tests de cobertura agregados por la revisión y re-verificados). `barberia.db` estable (`8ca1788e…`, solo tablas vacías nuevas por `create_all`).
- P2 no bloqueantes (ver cierre en tasks): imputar pendientes al abrir, acumulados por momento servicio, hash momento sin normalizar, TEMP vacía falla en 008, anulados post-cierre, test de sensibles.
- Cambios ajenos de otra sesión (MCP SQLite en AGENTS/MEMORY/mcp/plantilla) preservados sin commitear.
- No autoriza paquete 12 ni declara la spec implementada.

## Spec 002 — paquete 12 redactado (2026-10-09)
- `tasks.md` con T82–T89 en rama `feat/spec-002-paquete-12-cierre-integral`: typed core, pantallas 002, resto app, imputar al abrir, idempotencia dura, UoW + fix 008, E2E integral, cierre + spec hija 003. Decisiones: pull diferido, typed toda app, imputar incluido, deudas duras a intentar (bóveda a hija), E2E incluido. Ajenos MCP SQLite a salvo en `backup/ajenos-mcp-sqlite-2026-10-09` (+TEMP). Implementación pendiente de aprobación.

## Spec 002 — continuación y T88 verificada (2026-10-09)
- Al continuar por solicitud del usuario, T82–T87 ya estaban implementadas en seis commits (HEAD inicial `9e0763d`). Se completó solo T88 conforme al protocolo una tarea por ejecución; T89 sigue pendiente.
- Nuevo runner `frontend/tests/e2e/cierre_produccion.py`: dist real + SW, proxy/API en puertos efímeros, SQLite/cuentas/contraseña/perfil Chromium sintéticos en TEMP. El borrador previo ajeno `frontend/tests/e2e/cierre_integral.py` se preserva intacto; no usarlo como aceptación (arranca dev).
- Dos fallos productivos rojo→verde: sync perdía milisegundos del momento real (normalizar UTC sin truncar); sender de cortes enviaba ediciones/anulaciones como nuevos cortes (filtro por tipo en `useSync.ts`). Regresión halló un test de jornadas dependiente de UTC: ayer se calcula ahora en Buenos Aires.
- Verde: E2E producción con recarga profunda y cierre/reapertura de Chromium offline, UUID/replay sin duplicados y momento exacto; exceso/revisión/resolución/excedente; bloqueo/intervención/aplicar; privacidad DTO/404/admin y caches sin API. Artefactos finales `TEMP/opencode/t88_prod_mw4iybud`.
- Regresión aislada por archivo y proceso con cwd/DATABASE_URL TEMP: 21 sync + 97 cortes + 22 jornadas + 167 dinero = 307 verdes. Once scripts node verdes y build OK. Hash de `barberia.db` intacto; sin migraciones reales, suite pytest global, instalaciones, commits ni push.
- Límites/deudas explícitos en `frontend/tests/e2e/README.md` y tasks: no probar todo RF por cuatro recorridos; resolución admin vía API, historial offline/pull diferido, bóveda/PG diferidos, pendientes matriz y revisión T89. Bootstrap `create_all` productivo no retirado; no afirmar cierre completo.

## Spec 002 — revisión T89 ejecutada, cierre bloqueado (2026-10-09)
- Usuario autoriza terminar T89. Creado `cierre.md` con matriz documental de 57 RF/6 RNF, resultados reproducibles, límites y dictamen independiente; creada hija `specs/003-pull-offline/spec.md` únicamente en borrador (RF-55 y dependencias de descarga/cobertura/revocaciones, no correcciones de transporte/outbox). Actualizados estado vigente spec/plan/tasks; el contrato original y su historial se conservan.
- Regresión completa disponible por archivo/proceso con cwd y DATABASE_URL TEMP: **356 passed** (10 archivos), 11 scripts node verdes, build y E2E producción/reapertura offline verdes. Logs `TEMP/opencode/t89_regresion_v15x_5aj`, artefactos E2E `t88_prod_oexu9eub`. Dos upgrades/current Alembic en TEMP vacía verdes a head 012 (`t89_alembic_4q8hjd8y`), no certifican instalación legacy integral. SHA256 de DB real antes/después idéntico `8ca1788e3423205ad5462884549212ff533e8a30aaa80766dfaab3d28eea37ab`.
- `sdd-reviewer`: **REQUIERE CORRECCIONES**, ocho grupos bloqueantes: P1-1 UUID online ausente/duplicación; P1-2 enviando sin recuperación; P1-3 dashboard números vs strings/negativos; P1-4 identidad payload incompleta y datos monetarios ajenos; P1-5 actor/token/cuenta tras awaits; P1-6 exclusión SQLite incompleta; P1-7 formularios/estados PWA faltantes; P1-8 períodos/caja/imputación. Segunda revisión documental confirma registro apto de cierre bloqueado, no aprobación funcional.
- T89 permanece `[ ]`: su revisión/documentación se ejecutó pero «Hecho cuando» no se cumple. Spec continúa aprobada con implementación parcial, no «implementada salvo pull». Nuevas correcciones requieren desglose/autorización, no se trasladan por defecto a hija003. Persistencia financiera efectiva aún Numeric(10,2), no atribuir INTEGER a una propuesta histórica.
- Esta ejecución no modifica código de aplicación, no migra bases reales, no instala dependencias ni hace commits/push. Cambios de T88 y borrador ajeno E2E preservados.

## Spec 002 — plan correctivo preparado (2026-10-09)
- Usuario autoriza únicamente preparar el plan de corrección. `sdd-explore` investigó en lectura; `sdd-planner` creó `plan-correcciones.md` para P1-1–P1-8 bajo RF existentes, sin nuevas funcionalidades ni traslado de fallos a hija003.
- Inventario, interfaces/algoritmos, decisiones/alternativas, pruebas adversariales, expansión conservadora y rollout. Propone 23 paquetes progresivos (no tareas), rangos orientativos 65–105h sujetos a desglose/gates; cada paquete deberá dividirse en ≤10 tareas de 20–30min o reducirse. Primer paquete recomendado R01: canonización pura aislada, 4–6 futuras tareas; no se han redactado.
- Primera auditoría documental exigió cuatro precisiones, incorporadas: autoridad de sesión singleton Dexie con CAS/generación y transacciones compartidas; referencia canónica inmutable UUID/ID y mapping separado; DTOs exactos aditivos preservando serializer legacy; momento desconocido no imputable sin evidencia, distinto de jornada inexistente y sin ajuste ficticio en jornada abierta propia.
- Segunda revisión `sdd-reviewer`: **APTO PARA APROBACIÓN DEL PLAN** sin bloqueantes documentales. Plan permanece borrador; no equivale a aprobación del usuario ni implementación. Pull/bóveda/PG/locale siguen diferidos, P1-1–P1-8 abiertos y T89 sin marcar.
- Solo documentos modificados en esta fase; cambios previos de T88 preservados. Sin nuevas tareas, código, tests ejecutados, migraciones, instalaciones, commits ni push. Próximo paso: aprobación del plan y autorización independiente para redactar únicamente el primer paquete de tareas.

## Spec 002 — plan aprobado y tareas R01 redactadas (2026-10-09)
- Usuario: «Apruebo el plan y autorizo», en respuesta a aprobar el plan y desglosar R01. Registrada aprobación en plan/plan-correcciones; no se interpreta como autorización de implementación o paquetes posteriores. La sección anterior conserva el historial de la fase de planificación.
- Añadidas T90–T95 al final de `tasks.md`: seis tareas de 20–30 min (2–3h), dependencias, RF parciales, Hecho cuando y evidencia vacía. Contrato técnico R01 en anexo de `plan-correcciones.md`: sobre tipado, referencias/omisión, árbol original, Decimal exacto firmado, UTC micropreciso y SHA256 determinista.
- Solo dos archivos productivos futuros autorizados en el desglose: `backend/app/services/comando_corte.py` y `backend/tests/test_comando_corte_aislado.py`. Sin API/DB/ORM/frontend/adaptadores ni integración; runner exclusivo aislado con gate de revisión de imports/config antes de ejecutar.
- `sdd-reviewer`: **APTO PARA APROBACIÓN DE TAREAS**, sin bloqueantes documentales. Precisado incremento UTC mínimo T90→normalización T93; discriminante automático/manual deberá conservarse y firmarse en datos por futuros adaptadores, sin validar negocio en R01.
- Todos los checks R01 vacíos, T89 pendiente y ocho P1 abiertos. Solo documentos; sin código, tests ejecutados, consultas DB, migraciones, instalaciones, commits ni push. Cambios previos preservados. Próximo paso: autorización explícita para implementar R01, una tarea por ejecución empezando T90; no iniciar R02.

## Spec 002 — T90 implementada, R01 parcial (2026-10-09)
- Usuario «Autorizo» responde a iniciar implementación con T90. `sdd-implementer` ejecutó exclusivamente T90; creados `backend/app/services/comando_corte.py` (139 líneas) y `backend/tests/test_comando_corte_aislado.py` (207 líneas). Sin conectar a API/sync/journal.
- Gate de lectura: cadena de tres __init__ vacíos, sin conftest/config pytest en backend/ascendientes; runner exclusivo de tasks con autoload/plugins/cache/bytecode deshabilitados. Tests primero: rojo real por módulo ausente (1 error, exit2); luego **60 passed**, exit0. Comando/evidencia detallados en tasks T90; no otros tests/build/imports de app ni DB.
- Sobre común frozen/kw-only, tipos estrictos, actor inyectado, referencias UUID/ID diferenciadas, omisión/null, metadata hint excluida del JSON y UTC mínimo micropreciso. Limitación temporal explícita: solo datos={} y rechazo seguro de datos no vacíos; árbol, Decimal, matriz temporal y hash pendientes T91–T94. No frontera productiva completa ni deduplicación efectiva.
- `sdd-reviewer` READ ONLY: **T90 conforme, sin bloqueantes**; no reejecutó tests y no constituye revisión integral de R01. Solo T90 marcada; T91–T95 pendientes, P1-1–P1-8 abiertos y T89 sin marcar.
- Cambios previos preservados; sin DB/migraciones/instalaciones/commits/push. Ejecución detenida tras una tarea. Próximo paso: continuar con T91 cuando el usuario lo indique.

## Spec 002 — T91 implementada, R01 parcial (2026-10-09)
- Usuario autoriza «Sigue con la T91». Ejecutada únicamente T91 con tests primero: rojo real **66 failed / 62 passed**, exit1; verde **128 passed**, exit0, incluyendo regresión T90 con runner exclusivo aislado de tasks. Gate READ ONLY de imports/config/entorno antes de ejecutar; sin app/DB.
- `comando_corte.py` admite árbol null/bool/int/string/dict/list de tipos exactos y UUID explícito. Copia lógica sin mutación, claves canónicas, orden de listas significativo, strings sin heurísticas/defaults, omisión/null, salida textual frozen; detección de ciclos por rama activa con limpieza y aceptación de subárboles compartidos.
- Rechazo seguro recursivo de float/no finitos, sentinel anidado, claves no string y tipos no admitidos. Limitación temporal del test T90 datos no vacíos actualizada a aceptación T91; evidencia histórica T90 conservada. Decimal/datetime dentro de datos siguen fail closed para T92/T93; SHA256 pendiente T94. Sin integración ni deduplicación efectiva.
- `sdd-reviewer` READ ONLY: **T91 conforme, sin bloqueantes**, sin reejecutar tests. T90/T91 marcadas; T92–T95 pendientes. P1-1–P1-8 y T89 siguen abiertos; no aprobación integral R01/spec.
- Solo par código/tests autorizado, tasks y documentos de estado; cambios anteriores preservados. Sin DB, migraciones, instalaciones, otros tests/build, commits ni push. Detenido tras T91; siguiente tarea T92 cuando el usuario lo indique.

## Spec 002 — R01 completado y revisado por tarea (2026-10-09)
- Usuario autoriza continuar las restantes hasta desbloquear T89 con reviewer después de cada Tx. Una sola autorización; no se atribuyen nuevas respuestas del usuario entre T92–T95. Ejecutadas individualmente y detenidas/revisadas entre incrementos.
- T92: Decimal exacto firmado por dígitos, contexto/flags/traps intactos; rojo 84 failed/129 passed → 213 passed. Reviewer READ ONLY **APROBADO T92**.
- T93: datetime tipado en árbol con UTC aware micropreciso, offsets/naive/overflow; rojo 25 failed/245 passed → 270 passed. Reviewer READ ONLY **APROBADO T93**.
- T94: SHA256 UTF-8, vector literal/matriz identidad y errores seguros; rojo colección por función ausente → 323 passed. Reviewer READ ONLY **APROBADO T94**.
- T95: verificación final sin rojo artificial, 323 passed. Reviewer final reejecutó únicamente runner aislado tras su gate y obtuvo **323 passed in 0.25s**: **APROBADO R01 y T95**, sin bloqueantes dentro de ese alcance.
- T90–T95 marcadas; cobertura parcial RF/RNF sin integración HTTP/sync/journal/UoW ni deduplicación efectiva. Los ocho P1 continúan abiertos, T89 sin marcar y spec002 parcialmente implementada. Actualizada evidencia tasks y estado planes.
- Solo par puro de código/tests y documentos de estado; cambios anteriores preservados. Sin DB, otros tests/build, instalaciones, migraciones, commits ni push. Siguiente gate: desglosar/aprobar tareas de R02 del plan aprobado antes de nueva implementación; no inventar tareas ni saltar fases por la autorización de continuidad.

## Spec 002 — R02 desglosado documentalmente (2026-10-09)
- Usuario «Sí» autoriza preparar tareas R02, no implementación. Planner investigó en lectura y añadió anexo Contrato exacto R02 en plan-correcciones y ocho tareas T96–T103 en tasks, todas vacías, 20–30min, RF parciales/Hecho cuando/evidencia futura.
- Propone división R02a/R02b pendiente de aprobación: R02a slot/schema aditivo/CAS aislado y pruebas IDB nativas; R02b conserva authStore, commit-first, callers y token/401. No trasladar integración a R03 ni declarar R02 completo con primitivas aisladas. Estimación R02a 2h40–4h, coordinación/reviewer aparte; si una tarea no cabe detener/reducir.
- Head actual schema Dexie 2, nueva v3 propuesta; extracción baseDatosLocal sin singleton para harness, generación con epoch/CAS, slot inicial locked, sin tokens ni inferencia desde localStorage. Conservar filas/pendientes y propietarios ambiguos sin wipe/reasignación; autoridad nueva inactiva hasta integración aprobada.
- Harness propuesto test-only TEMP con Vite/tsc instalados y Playwright/Chromium nativo en contexto nuevo y origen efímero, DBs prefijo UUID de corrida; sin DB real, backend/dist/SW/perfiles reales ni nuevas dependencias. Runner futuro python tests/aislados/sesion_idb.py no ejecutado. Context7 Dexie consultado por planner; tipos/API se contrastarán con versión local 3.2.7 antes de ejecutar.
- Reviewer READ ONLY **APTO PARA APROBACIÓN DE TAREAS R02a Y DE LA DIVISIÓN R02a/R02b**, sin bloqueantes. Precisadas fixtures incrementales T96–T98 sin importar módulos futuros. Sin nuevas decisiones de negocio pendientes.
- Solo documentos modificados; sin código, pruebas/build ejecutados, DB/imports de aplicación, instalaciones, commits ni push. R01 aprobado conservado; P1 y T89 abiertos. Próximo gate: aprobación explícita de división/tareas y autorización de implementación, empezando T96 con reviewer por Tx.

## Spec 002 — R02a en curso: T96–T98 aprobadas (2026-10-09)
- Usuario «Sí, autorizo» implementar R02a con reviewer tras cada Tx. Ejecutadas T96–T98 una a la vez, tests primero con rojo real, verde y reviewer READ ONLY tras cada una; cambios sin commit.
- T96 (harness test-only nativo): el intento previo de `sdd-implementer` falló por límite de uso; el coordinador retomó los dos archivos parciales existentes, registró rojo real (script Node ausente) y creó `frontend/scripts/correcciones-sesion-test.mjs` (Vite programático `configFile:false, publicDir:false` + tsc local acotado, destino bajo `TEMP/opencode`). Verde con servidor loopback efímero, Chromium `service_workers=block`, dos páginas mismo origen, ruta que aborta ajeno, DBs `r02_prueba_<UUID>` propias con cleanup. Reviewer **APROBADO T96**.
- T97 (extracción sin singleton): `src/services/baseDatosLocal.ts` con tipos/clase extraídos, constructor `(nombre, proveedorGeneracionInicial)`, versions 1/2 byte-idénticas; `db.ts` reexporta los 7 tipos y conserva `export const db = new BaseDatosLocal('barberia_db', ...)`. Rojo real TS2307; verde runner + typecheck acotado y completo. Reviewer **APROBADO T97**.
- T98 (v3 + slot locked): añadido `SlotSesionLocal` y `slotSesion:'clave'` en v3 aditiva; `.upgrade()` para previas y `on('populate')` para fresh comparten constructor puro con generación solo del proveedor inyectado (sin mirrors/auth/localStorage); fallo propaga y aborta la tx. Fixture con las tres vías (fresh, v1→3, v2→3) + reopen sin regenerar. Hallazgo propio: el legacy fabricado con API cruda perdía outbox/mapeo al recrear Dexie las tiendas; corregido fabricando el legacy con Dexie versiones 1/2 históricas. Rojo real TS2305 y runtime; verde `VERDE R02a...` y typecheck completo. Reviewer **APROBADO T98**.
- Aprendizajes: tsc acotado debe usar `-p` o `--lib/--target` (sin ellos falla por lib ES5); la consola cp1252 rompe con `→` y no-ASCII raro (un carácter cirílico U+0435 se coló en un índice y lo detectó una inspección Unicode); mensaje de `resultado.txt` debe reflejar las comprobaciones reales.
- Autoridad de sesión sigue inactiva: sin conexión a auth/UI/sync; head de app es ahora Dexie 3 pero `db.ts` no abre nada al importar. R02a no cierra RF-33, P1-5 ni T89. Pendientes: T99–T103; R02b requiere su propio desglose/aprobación.
- Ejecución detenida tras T98; siguiente tarea T99 cuando el usuario lo indique. Runner exclusivo: `python tests/aislados/sesion_idb.py` desde `frontend` (nunca mientras se redacta).

## Spec 002 — R02a en curso: T99 aprobada (2026-10-12)
- Usuario «continúa con las features…» reactiva la autorización vigente de R02a (reviewer por Tx). Ejecutada T99: gate READ ONLY verificado (sesion.ts sin imports; Vite 5.4.21/tsc 5.9.3/Playwright+Chromium locales; package/lock intactos; baseline tsc exit0).
- Rojo real tests primero: exit1 con TS2724 (`validarSlotSesion`→sugerencia `invalidarSesion`) + 6 TS2305 en `t96_idb_lkbicp59/preparacion.log`. Verde: runner exit0 (`t96_idb_rc87eqn9`, mensaje VERDE con identidad/CAS puros) + `tsc --noEmit -p tsconfig.json` exit0.
- `sesion.ts`: +163 líneas/0 borrados al final — `SlotSesion` readonly activa/locked (actor seguro ≥1 / null), `IdentidadSesion` (6 campos), `DestinoSesion`, `ResultadoCAS` (2 variantes, conflicto sin datos del ganador), `validarSlotSesion` (unknown estricto, mensaje único genérico), `coincideSlot`, `esContextoActivo`, `prepararTransicion` (aleatorio inyectado, `E:UUID` monotónico, rotación misma cuenta, ABA imposible con UUID repetido, MAX_SAFE_INTEGER → Error genérico sin wrap ni tercera variante). Cero imports nuevos; legacy intacto.
- Fixture `sesion-idb.ts`: `identidad()` (matriz 36 unknown + CAS 6 campos + alias + tope) y `legacy()` (semántica legacy); runner invoca ambas. `correcciones-sesion-test.mjs` sin cambios (typecheck transitivo).
- `sdd-reviewer`: **APROBADO T99**, sin P1 (P3: redacción «siete TS2305» vs 6+1; orden tope>aleatorio documentado; MEMORY al cierre de R02a). Reejecutó runner (`t96_idb_8zjfp19y`) y tsc, ambos exit0.
- Límites: autoridad del slot sigue inactiva; RF-33/RNF-5/P1-5/T89 siguen abiertos. T100–T103 pendientes. Sin commits/installs/DB.

## Spec 002 — R02a en curso: T100 aprobada (2026-10-12)
- T100 «lectura y CAS durable con competencia real»: gate READ ONLY (repoSesion.ts ausente, sesion.ts sin imports, Vite/tsc/Playwright locales, package/lock intactos, API Dexie 3.2.7 contrastada contra SU dist: `Dexie.currentTransaction=PSD.trans||null`, promesa de `db.transaction()` resuelve en `oncomplete`).
- Rojo real TS2307 (`repoSesion` ausente) en `t96_idb_gw_tx7z7`; verde runner exit0 `t96_idb_54nml6px` + tsc exit0. Creado `frontend/src/services/repoSesion.ts`: repo inyectado (constructor `(db: BaseDatosLocal)`, import type-only; sin singleton/auth/localStorage/red). `leerSlot()` valida con `validarSlotSesion` (ausente/corrupto → Error genérico, sin recreate); `transicionar(esperado, destino, aleatorio)` en tx rw solo `slotSesion`, conflicto sin escritura ni datos del ganador, promesa resuelve solo tras commit. Defensa tx exterior con `Dexie.currentTransaction` testeada con rx real.
- Decisión T100: firma SIN `efectos` ni `conSesionVigente` (composición queda en T101, sin adelantar). Competencia real entre las dos páginas del runner: ganador `confirmada`/perdedor `conflicto` con verificación nativa posterior; stale logout, A→B→A y login mismo actor rotan; reopen conserva ganador.
- `sdd-reviewer`: **APROBADO T100**, sin P1. P2 de proceso (reejecución/diff no ejecutados por el reviewer) cerrados por el coordinador: runner exit0 (`t96_idb_0wrg3r9o`), tsc exit0, alcance solo T100 confirmado por `git diff --stat`. P3: competencia secuencial no intercalada (→T101/T102), `assert` insensible a `-O`, MEMORY al cierre R02a.
- Límites: RF-33/RNF-5 parciales, P1-5/T89 abiertos, autoridad inactiva. Pendientes T101–T103. Sin commits/installs/DB.

## Spec 002 — R02a completada y aprobada (2026-10-13)
- T101 «guard+efectos en la misma transacción»: rojo real TS2305/TS2554/TS2339 (`t96_idb_nysuz1ua`) → verde `t96_idb_kqochnyt` + tsc. `repoSesion.ts` ampliado: `transicionar(..., efectos?)` con `EfectosSesion` (tablas declaradas validadas ANTES de abrir tx: `tabla.db === this.db` + pertenencia por nombre; hallazgo Dexie 3.2.7: `db.<tabla>` y `db.tables[i]` son envolventes distintas por `setApiOnPlace`), orden efectos→put con espera de la promesa tras el put (rollback conjunto si falla), y `conSesionVigente<T>` genérico en MISMA tx. Concurrencia probada en ambos órdenes con invariante orden↔fila. Reviewer **APROBADO T101** (reexit `t96_idb_j_zp4wgg`).
- T102 «fallo cerrado y no reparación destructiva»: **verde inicial honesto** (rojo intentado, no fabricado: los 6 casos ya pasaban porque T100/T101 eran fail-closed) — solo tests nuevos, CERO cambios de producto. Casos: slot ausente/corrupto(3 variantes)/versión incompatible/overflow MAX_SAFE-INTEGER/fallo de lectura (hook `reading` roto con `unsubscribe`, mensaje exacto propagado)/aborto tras writes (relectura en la misma tx prueba el put antes de abortar). Reviewer **APROBADO T102**, sin P1/P2 (reexit `t96_idb_85uiphvo`).
- T103 «cierre de evidencia»: revisión READ ONLY del tramo (ámbito: `sesion.ts` +163 solo adición, `db.ts` extracción T97; ajenos T88/R01 preservados), runner exit0 (`t96_idb_x3apviod`) + tsc exit0, síntesis T96–T103 y límites en tasks, solicitud de revisión emitida.
- **Revisión de cierre independiente: APROBADO R02a y T103**, sin P1. Reexit del reviewer: runner exit0 (`t96_idb__6tmsn_8`) + tsc exit0; nadie importa `repoSesion` fuera del fixture (autoridad INACTIVA verificada); T96–T103 todas `[x]` con veredictos; cobertura vs matriz del contrato confirmada.
- P2/P3 del cierre (cosméticos, no bloqueantes): en 6 de 8 filas de evidencia la celda del reviewer quedó fusionada a la columna de comandos (veredictos escritos y verificables); pipes sin escapar (`PSD.trans || null`) rompen columnas GFM; `SlotSesionLocal` (DB) solo admite `locked` mientras `transicionar` escribe `activa` a nivel de transición → revisar la unión de tipos en R02b; «dictamen pendiente» residual en columna 4 de T103.
- Límites de cierre: RF-29/RF-33/RNF-5 **parciales, NO cerrados**; RNF-3 parcial, RNF-6 verde; P1-1–P1-8 y T89 abiertos; spec 002 NO implementada (`Estado: aprobada`, implementación parcial); R02b/R03+ sin tareas ni autorización; pull/bóveda/PG/locale diferidos.
- Próximo gate: desglosar/approbar R02b (integración authStore/commit-first/token-401) — requiere aprobación nueva. Sin commits hasta la orden del usuario.

## Recuperación documental (2026-10-05)
- Recuperado el contenido útil de `b211ee5` en una rama nueva desde `dev`, sin cherry-pick ni reescritura de la rama histórica `feat/mcp-config-y-offline`.
- Conservados el estado y los pendientes actuales; no se recupera la afirmación antigua de que todos los tests están completos.
- Plantilla MCP adaptada a la documentación de OpenCode V2 (`mcp.servers`, `disabled`, credenciales por entorno). La configuración local existente no se modifica. La conexión de los servidores de la plantilla queda por verificar en cada entorno.

## MCP SQLite corregido y verificado (2026-10-09)
- El servidor `sqlite` fallaba al iniciar con dos errores según el pin: `ImportError: cannot import name 'eval_type_backport'` (con `mcp==1.2.0` y sin pin, porque `uvx` resuelve `pydantic` 2.14) y `AttributeError: 'Server' object has no attribute 'list_resources'` (con el `mcp` más nuevo, ≥1.16).
- Causa: `mcp-server-sqlite` 2025.4.25 (última versión en PyPI, requiere `mcp[cli]>=1.6.0`) usa `@server.list_resources()`, eliminado en `mcp` ≥1.16; y `mcp` ≤1.15 importa `eval_type_backport` de internals de `pydantic`, eliminado en `pydantic` ≥2.12.
- Solución verificada: `--with mcp==1.9.4 --with pydantic==2.11.7` junto a `--from mcp-server-sqlite`. Handshake `initialize`, `tools/list` (6 herramientas) y `read_query` real sobre `backend/barberia.db` funcionan.
- Configuración actualizada en `opencode.json` (local, usa ruta absoluta del `uvx.exe` del Python de Microsoft Store porque `uvx` no está en el PATH) y en `opencode.json.example` (con `uvx` plano, sigue `disabled: true`). Documentación al día en `docs/mcp.md` y `AGENTS.md`.
- Pendiente: agregar el directorio `Scripts` del Python de Microsoft Store al PATH del usuario para poder usar `uvx` plano; revisar que el token de GitHub de `opencode.json` local esté por entorno (`{env:GITHUB_PERSONAL_ACCESS_TOKEN}`) en vez de literal, como exige la plantilla.
