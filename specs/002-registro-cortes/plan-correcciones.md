# Plan de correcciones — Spec 002 / revisión T89

Estado: **aprobado por el usuario**. Fecha: 2026-10-09.
Autorización actual: plan aprobado, R01 desglosado e inicio con T90 autorizado
posteriormente por el usuario. Continuación de las restantes con reviewer por
tarea autorizada: T90–T95 completas, **APROBADO R01 y T95**. Detenerse al
cambio de fase; próximos paquetes requieren desglose y aprobación de tareas.
Sin autorización de paquetes siguientes o despliegue.

Revisión independiente de planificación: **APTO PARA APROBACIÓN DEL PLAN**,
tras precisar sesión durable, referencias canónicas, compatibilidad monetaria
e imputación. El usuario aprueba después el plan y autoriza el desglose R01;
ninguna corrección está implementada por esa aprobación. T89 permanece bloqueado.

## 1. Contrato, evidencia y límites

Entradas leídas: `docs/constitution.md`, `AGENTS.md`, `MEMORY.md`, y
`spec.md`, `plan.md`, `tasks.md`, `cierre.md` de 002; hija 003 en borrador.
Se utiliza la exploración READ ONLY del checkout y comprobaciones de rutas/archivos.
Este documento no sustituye el contrato aprobado ni las decisiones posteriores
registradas en los paquetes. Corrige P1-1–P1-8 bajo los RF existentes: no es otra feature.

La evidencia previa es **histórica**, no reejecutada aquí: 356 backend, once scripts
frontend, build y cuatro recorridos E2E verdes; dos upgrades/current TEMP a head 012.
No acredita cumplimiento integral ni instalación legacy completa. T89 sigue pendiente.
Conservar los checks T1–T88, sus rojos/verdes, revisiones y límites; no desmarcarlos,
reescribirlos retrospectivamente o reutilizar su evidencia para aprobar estas correcciones.

Precedencia: sin React Query nuevo, bóveda ni protocolo PostgreSQL completo;
aislamiento simplificado no excusa atribución cruzada. Persistencia actual
`Numeric(10,2)`, incluidos movimientos: no describirla como INTEGER implementado.
Capacidad de devolución por concepto aprobada en paquete 9, ahora separada también
por asignación de comisión para no consumir dinero de otro profesional.
No introducir el ledger por fuente del plan histórico ni migración monetaria general.
Para las correcciones propuestas, este plan aprobado precisa y reemplaza las secciones
técnicas históricas incompatibles de `plan.md` (sesión, referencias, contratos e imputación),
sin cambiar la spec ni decisiones de negocio. La precedencia técnica está aprobada;
su implementación sigue requiriendo autorización por paquete.

Fuera: pull RF-55/90 días y sus dependencias de descarga/cobertura/revocación remota
en hija 003; bóveda, PG, locale, rediseño, reportes nuevos y reglas financieras nuevas.
La proyección de recursos ya conocidos necesaria para operar offline pertenece a 002;
no garantiza historial completo. Las revocaciones conocidas se aplican sin esperar pull.

## 2. Correcciones y trazabilidad

| Grupo | Resultado técnico buscado | RF principales / invariantes |
|---|---|---|
| P1-1 | Identidad persistida antes de red; mismo comando HTTP/sync y efecto único por operación | 8–10, 30, 32, 37, 51, 56, 57 |
| P1-2 | Claims recuperables con lease/fencing; retry sin mutar comando ni aplicar revisiones | 28–30, 32, 53, 57 |
| P1-3 | Resumen Pydantic con dinero string y formato exacto con signo | 12, 21; RNF-1/4 |
| P1-4 | Hash integral de entrada original, autorización antes de replay, asignación y correctivos coherentes | 14, 15, 32, 41, 43, 47, 48; RNF-5 |
| P1-5 | Actor/generación/token capturados y vigencia durable en lectura/envío/publicación | 33, 34; RNF-5 |
| P1-6 | UoW SQLite limpia antes de lecturas decisorias, todos los writers relevantes y commit único | 5, 23, 24, 34, 41, 49, 50 |
| P1-7 | Formularios reales personales/gestión, estados y operación offline con datos suficientes | 1, 2, 7, 10–13, 16–28, 35, 37–44, 46–48, 51, 53, 54, 56, 57 |
| P1-8 | Períodos Buenos Aires por instante correcto; snapshot cerrado intacto e imputación explícita | 12, 24, 39, 45, 49, 50, 52; RNF-1/2 |

RF-3/4/6, RF-31, RF-36/40 y todos los RNF se mantienen como regresión transversal:
reparto solo del servicio, snapshots, desactivación posterior, LWW permitido,
anulación autorizada terminal, compatibilidad, UX y evidencia reproducible.

## 3. Inventario futuro de archivos

M = modificar existente; C = crear. Es inventario, no permiso ni lista de tareas.
Los nombres nuevos son propuestas; antes de desglosar cada paquete se comprueba
su ausencia y se fija la lista exacta, sin comodines productivos.

| Acción / archivo | Responsabilidad | RF / grupo |
|---|---|---|
| C `backend/app/services/comando_corte.py` | Canonización pura versionada y marcadores de omisión | 32, 51, 57 / 1,4 |
| C `backend/app/schemas/operacion_corte.py` | Comandos/resultados discriminados Pydantic y validación de campos explícitos | 30,32,34,57 / 1,4 |
| M `backend/app/services/operacion_corte_service.py` | Ejecutor común, transiciones, replay autorizado y dependencias | 30,32,34,38,40,56,57 / 1,4 |
| M `backend/app/models/operacion_corte.py` | Versión/envelope original, referencia lógica y resolución verificable | 32,57 / 1,4 |
| C `backend/app/services/uow_cortes.py`; M `backend/app/database.py` | Fábrica de escritura limpia, exclusión y retry de comando completo | 5,23,34,41,49,50 / 6 |
| M `backend/app/dependencies.py` | Preflight sin trasladar ORM/session precargados a la UoW de escritura | 14,34 / 6 |
| M `backend/app/services/corte_service.py`, `edicion_corte_service.py` | Efectos sin commit, momento automático/manual, asignación y LWW existente | 1–10,22–27,36,40,42,46,47 / 1,4,6 |
| M `backend/app/services/movimiento_corte_service.py` | Hash/referencias correctivas, capacidad por concepto/asignación y efectos únicos | 16–21,32,38,41,43,47,53 / 4,6 |
| M `backend/app/models/finanzas_corte.py`, `corte.py`, `__init__.py` | Identidad técnica de asignación y vínculo movimiento/original; preservar dinero | 43,47,48 / 4 |
| M `backend/app/routers/cortes.py`, `sync.py`, `movimientos_corte.py` | Adaptadores al mismo ejecutor; filtros y listados admin separados | 1–27,30–34,38–44,46–48,51,53–57 / 1,4,6,7 |
| C `backend/app/schemas/resumen_cortes.py` | DTO exacto del nuevo `/mi/acumulados`; resúmenes legacy conservan serializer/keys | 12,13,44,52; RNF-3 / 3,8 |
| C `backend/app/schemas/movimiento_corte.py` | Extraer/centralizar DTOs actualmente en router, personales y gestión | 14–21,43,48,53 / 4,7 |
| M `backend/app/services/jornada_service.py`, `routers/jornadas.py` | Períodos, imputación elegible, snapshot y ajustes separados | 24,39,45,49,50,52 / 6,8 |
| M `backend/app/models/imputacion_corte.py`, `jornada_caja.py` | Solo invariantes/refs únicas necesarias de imputación y ajustes | 39,45,49,50 / 8 |
| M `backend/app/routers/servicios.py`, `usuarios.py`; M `services/admin_service.py`, `auditoria_service.py` | Writers catálogo/rol/activo/% y auditoría sin liberar UoW; invariante último admin | 5,34,41 / 6 + spec000 |
| M `backend/app/routers/cierre_caja.py`; M `backend/app/schemas/cierre_caja.py` | Writer legacy compatible y lectura aditiva `/resumen-exacto` Pydantic; no cambiar serializer previo | 24,39,45,49,52; RNF-1/3 / 6,8 |
| C `backend/alembic/versions/013_identidad_comandos.py`, `014_asignaciones_comision.py` | Expansión aditiva y diagnóstico conservador; números sujetos a head al desglosar | 32,43,47,48; RNF-3 / 1,4 |
| M `frontend/src/services/sesion.ts`, `store/authStore.ts`, `services/api.ts`, `cortesApi.ts` | Slot IDB autoridad, instalación CAS antes de setAuth, espejos no autoritativos y token explícito | 33,34; RNF-1/5 / 3,5 |
| M `frontend/src/services/db.ts`, `operacionesCortes.ts` | Singleton sesión, versiones secuenciales, slot/claims/proyección en misma tx y envelope durable | 28–33,37,51,57 / 1,2,5 |
| C `frontend/src/services/repositorioOutbox.ts`, `transporteCortes.ts`, `syncCortes.ts` | Claim/fencing, transporte único y recuperación; sin red dentro de Dexie | 29,30,32,33,53,57 / 1,2,5 |
| C `frontend/src/services/proyeccionesCortes.ts` | Recursos conocidos, acciones suficientes, estimación separada y cobertura incompleta | 7,12,21,28,44,52,53 / 7 |
| M `frontend/src/utils/formato.ts`, `services/saldosVista.ts`, `cajaVista.ts` | Formato por dígitos con signo, retirar Number monetario y estados exactos | 12,21,45,52; RNF-1 / 3,8 |
| M `frontend/src/pages/RegistroCortes.tsx`, `MisSaldos.tsx`, `DashboardBarbero.tsx`, `CierreCaja.tsx` | Captura, guards de carga, formularios propios, períodos y caja exacta | 1–28,33,37,45,50,52,53,57 / 1,3,5,7,8 |
| C `frontend/src/pages/GestionCortes.tsx`; M `frontend/src/App.tsx`, `components/Layout.tsx` | Gestión explícita admin sin volver global la vista personal | 2,10,26,38–40,43,47,54,56 / 7 |
| C `frontend/src/components/cortes/FormularioMovimiento.tsx`, `FormularioCorreccion.tsx`, `FormularioRevision.tsx`, `ResumenComisiones.tsx` | Parcial/restante, edición, correctivos/evidencia y estados accesibles con kit001 | 12,16–27,37–44,46–48,51,53,54 / 7 |
| C `backend/tests/test_comando_corte_aislado.py`, `test_uow_cortes.py`, `test_identidad_movimientos.py`, `test_concurrencia_cortes.py` | Canonización pura, identidad, permisos y conexiones independientes | 5,14,23,32,34,41,43,47–49,57 |
| M `backend/tests/test_cortes.py`, `test_sync_roles.py`, `test_jornadas.py`, `test_invariante_admin.py`, `test_usuarios_auditoria.py` | Regresión contratos, períodos, imputación y writers spec000 | RF de cada módulo; RNF-3/6 |
| C `frontend/scripts/correcciones-contratos-test.mjs`, `correcciones-outbox-test.mjs`, `correcciones-sesion-test.mjs` | Lógica ejecutable, no sustituto de navegador/UI | 12,29,30,32,33,52; RNF-1/6 |
| M `frontend/tests/e2e/cierre_produccion.py`, `README.md`; C `frontend/tests/e2e/correcciones_produccion.py` | Dist/SW y recorridos UI adversariales sintéticos, conservando evidencia T88 | grupos 1–8; RNF-4/5/6 |

No editar revisiones Alembic históricas para fabricar identidad. No añadir dependencias
por defecto; si un harness necesario exige instalación, detener su paquete y solicitarla.
`create_admin` queda como mantenimiento offline sin servidor/writers concurrentes,
no como vía para eludir exclusión durante operación. No ampliar cambios a ventas/gastos.

## 4. Interfaces y funciones puras propuestas

El namespace lógico nuevo `cortes:v3` es constante e independiente de HTTP/sync.
Clave de comando: `(actor autenticado, namespace lógico, UUID)`; UUID global de
movimiento continúa protegida por su restricción, sin devolver filas de otro actor.
Versión nueva expresa contrato técnico, no nuevas reglas ni retiro de v1/v2.

`ComandoCorte`: versión, UUID, acción, modoCaptura inmutable, instanteCambio UTC,
referencia discriminada de corte original, dependencia opcional, campos explícitos,
bases LWW existentes, motivo/evidencia y `momento = automatico_capturado | manual_admin | omitido`.
El actor proviene de credencial, no del body. Token/generación no forman parte del hash.
Automático capturado no habilita introducir fecha manual al barbero: UI sin campo editable,
servidor conserva captura y aplica RF-51. Admin explícito conserva destino también en sync.
Modo online no se convierte en offline al perder respuesta o usar sync.

Referencia canónica **inmutable al primer guardado**: creación captura `corteUuid`
original local; dependientes eligen `{tipo:'uuid_creacion', uuid:corteUuid}` si conocen
esa creación, o `{tipo:'id_servidor', id}` para un recurso servidor ya conocido sin
creación local (incluido legacy). Nunca convertir una referencia a la otra al obtener
mapping. UUID de operación identifica el comando; `corteUuid` identifica el corte original;
`dependeDeOperacionUuid` identifica operación padre, no sustituye la referencia de corte.
HTTP y sync reciben el **mismo envelope guardado**, no reconstruyen aliases desde la UI.
Hint opcional `idServidorHint` queda fuera del hash: servidor verifica concordancia,
rechaza discrepancia genéricamente y nunca retargetea. No declarar aliases diferentes
canónicamente equivalentes: misma UUID de operación con referencia distinta es conflicto.

`ResultadoOperacion`: UUID, estado, causa segura, efecto autorizado/mapping, unidades
aplicadas/omitidas, estadoImputacion y resultados individuales de dependientes.
`SlotSesion` singleton Dexie: actorId o null, generación aleatoria nueva, epoch/fence
asignado transaccionalmente y estado `activa|locked`; **sin token**.
`ContextoSolicitud`: actorId, generación y epoch del slot, token capturado en memoria,
señal cancelable. Solo es usable si concuerda con slot activo, no con localStorage.
`ClaimOutbox`: UUID, actorId, generación/epoch, owner opaco, fencing monotónico, expiresAt;
claim no modifica UUID/envelope/modo/instantes. Mapping incluye actor y corte original.
Saldo conocido/desconocido es unión discriminada; unknown no se reconstruye de cero.
Dinero de contratos exactos es string decimal de dos posiciones; dominio backend
Decimal y cliente centavos. Resúmenes legacy numéricos mantienen su wire contract.

Rutas conservadas `/api`: POST `/cortes/`, PATCH `/cortes/{id}`, POST anular,
POST `/sync/`, GET/POST `/cortes/{id}/movimientos`, GET saldos y justificantes propios.
Adaptadores aceptan el comando versionado adicional; legacy sin identidad conserva
su capacidad y su límite explícito, sin prometer deduplicación retroactiva.
Cobro inicial nuevo es **hijo independiente**, nunca enviado también como cobro embedded.
El adaptador legacy embedded sigue siendo exclusivo de su ruta anterior.

Gestión aprovecha resolución/compensación/devolución bajo `/cortes/{id}/…`, evidencia
financiera y resolución de intervención existentes. Añadir GET de revisiones e
intervenciones pendientes y detalle de gestión en `/cortes/gestion/…`, con DTO Pydantic
admin y paginación filtrada antes de devolver datos. Registrar estáticas antes de IDs.
No reutilizar endpoints de listado personal como gestión.
Jornadas conservan `/api/jornadas/abrir`, `/cerrar`, `/resumen`, `/acumulados` y
POST `/jornadas/{fecha}/imputaciones` (la ruta real usa fecha, no un ID supuesto).
Agregar consulta personal exacta `/cortes/mi/acumulados?periodo=…` con DTO nuevo:
dinero string, estados y períodos; Dashboard migra a ella. `/mi/resumen/*` conserva
números, serializer y claves legacy; ningún cliente exacto nuevo consume esas respuestas.
Sus períodos pueden corregirse conforme RF-52 sin cambiar representación monetaria.
Los endpoints de jornadas admin no sustituyen el dashboard personal.
Caja usa lectura aditiva GET `/api/cierre-caja/resumen-exacto?fecha=…`, con los mismos
inputs/significado de negocio del resumen existente y schema Pydantic de dinero string.
Reutiliza proyección actual corregida, no otro reporte; serializer legacy permanece intacto.
Los contratos ya declarados Decimal/Pydantic string continúan exactos, sin cambios globales
de shape ni modificaciones de módulos ajenos para convertirlos a este DTO.

Funciones sin DB, red, reloj global ni UUID generado internamente:

| Firma conceptual | Responsabilidad |
|---|---|
| `canonizar_comando(entrada, actor_id) -> ComandoCanonico`; `firmar_comando(comando) -> str` | Referencia original discriminada sin DB/alias lookup; UTC preciso, dinero, omisión; excluir hint |
| `validar_momento(momento, origen, ahora) -> DecisionMomento` | Futuro admin rechazo, automático >ahora+5min revisión, pasado permitido |
| `periodo_utc(periodo, ahora, zona) -> Intervalo` | Día, lunes–domingo, mes `[inicio, fin)`; total sin límite inferior artificial |
| `filtrar_movimiento_personal(movimiento, actor, titular, asignacion) -> bool` | Cliente de corte vigente propio; comisión de identidad original propia |
| `validar_correctivo(entrada, original, asignacion, capacidad) -> Decision` | Corte/concepto/profesional/asignación/referencia coherentes; devolución limitada |
| `decidir_imputacion(real_conocida_o_desconocida, estado_origen, destino, ahora) -> Decision` | Unknown no imputable; conocida abierta ordinaria, cerrada/sin fila ajuste sin cierre inventado |
| `decidirClaim(fila, contexto, ahora) -> DecisionClaim`; `puedePublicar(claim, vigente, ahora) -> boolean` | Lease vencida y fencing; vigencia parametrizada |
| `proyectarComisiones(cortes, movimientos, pendientes, periodo, cobertura) -> Resumen` | Servicio por su instante; dinero por el suyo; estimado/unknown aparte |
| `parsearDecimalConSigno(texto) -> Centavos`; `formatearCentavos(centavos) -> string` | Dígitos y rango entero seguro, sin Number de pesos fraccionarios |

Reutilizar reparto/validadores monetarios cerrados y `fecha_negocio`/`rango_utc`;
extender sus fronteras, no sustituirlos con cálculo duplicado. El parser firmado es
para lectura/correctivos; formulario de abono ordinario sigue estrictamente positivo.

Props: `FormularioMovimiento(corte, concepto, saldo, metodoPropuesto, contexto,
ahora, onConfirmar, onCancelar)`; `FormularioCorreccion(corte, acciones, catalogo,
profesionalesGestion?, contexto, ahora, onConfirmar)`; `FormularioRevision(original,
tipoDecision, contextoGestion, ahora, onConfirmar)`; `ResumenComisiones(resumen,
estimadas, periodo, cobertura, onPeriodoCambio)`. Usar tipos discriminados, no `any`.

## 5. Algoritmos y decisiones

### A. UoW y ejecución común (P1-1/4/6)

```text
validar estructura/credencial de preflight; no usar sus ORM como estado decisorio
capturar ahora; abrir NUEVA conexión/Session de escritura sin transacción previa
BEGIN IMMEDIATE antes de SELECT decisorio (no BEGIN anidado tras auth autobegin)
releer actor activo/rol, titular, catálogo/%, saldos, original y jornadas necesarios
autorizar recurso vigente; ajeno e inexistente mismo 404, sin filtrar journal
canonizar entrada ORIGINAL; buscar journal lógico y referencias seguras
resolver referencia guardada bajo UoW/actor; verificar hint sin alterar hash/recurso
si identidad conflictiva: conflicto genérico sin payload/datos del existente
si terminal: devolver acuse autorizado actual sin recalcular ni ejecutar efecto
si revisión/intervención: conservar; solo resolución admin NUEVA puede decidir
si dependiente: comprobar actor + UUID padre + MISMO corte original y resolución
  si no habilitado: conservar sin ledger; si habilitado revalidar y ejecutar una vez
validar restricciones bajo exclusión; ejecutar efecto + journal + auditoría + imputación
COMMIT único; fallos hacen rollback de TODO; busy transitorio reintenta TODO acotadamente
```

No usar la Session autenticadora para el `BEGIN IMMEDIATE`: sus consultas ya disparan
autobegin. Separar autenticación de preflight y decisión protegida evita rollback de
datos ajenos y nested begin. Helpers hacen add/flush, no commit/retry parcial.
Usuarios/admin/auditoría actuales requieren quitar BEGIN/commit interiores en esta vía,
conservar permisos, auditoría y el invariante del último admin de 000.

Participan todos los writers relevantes: cortes POST/PATCH/anular/evidencia/intervención,
sync legacy/nuevo, abonos/resoluciones/compensaciones/devoluciones, abrir/cerrar/imputar,
servicios CRUD y usuarios rol/activo/porcentaje. Revisar cierres legacy para coexistencia
transaccional, **sin inferir nuevas pertenencias ni bloquear históricos por su fecha**.
No tomar lock de escritura indiscriminado en GET ni cambios ajenos al ledger.
SQLite serializa conexiones/procesos mediante DB; mutex Python o locks separados de
abono/devolución se descartan como garantía. No extrapolar esta corrección a PG.

Hash incluye actor, corte original, acción/tipo, concepto, importe, método, referencias,
modo, instantes, campos/bases/motivo/evidencia de entrada. Omitir método/momento deja
marcador estable; el default efectivo se calcula una vez y se guarda como salida.
No recomputar hash usando método vigente del corte, hora de retry o snapshot precio/%.
ISO equivalentes normalizan UTC preservando microsegundos; valores distintos colisionan.
Unificar namespace **solo** no sirve si los adaptadores producen entradas distintas.

Resolver `uuid_creacion` mediante envelope/resultado de operación de creación original
y mapping scoped al actor, revalidando permisos actuales; no adivinar desde `Corte.uuid`
ni equiparar UUID padre y UUID corte. `id_servidor` conserva su ID original y exige
autorización vigente. Canonizador puro no consulta DB ni inventa alias. Mapping/resultado
de creación se verifica contra ese mismo corte antes de habilitar un dependiente.
Hint discordante se rechaza también en replay terminal: no basta que el hash coincida.

Histórico web/sync con hashes/envelopes diferentes no se fusiona automáticamente.
Migración registra versión previa, conserva claves/resultado y diagnostica ambigüedad;
solo puente verificable a identidad original puede recuperar un acuse. Si falta evidencia,
detener conversión/reenvío de esas filas y pedir decisión sobre datos concretos.
No crear otro corte ni reemplazar UUID para ocultar una posible aceptación anterior.

### B. Asignación y privacidad monetaria (P1-4)

Añadir identidad técnica `AsignacionComision` por vigencia, no solo `profesional_id`.
A→B→A crea tres asignaciones: pagos de A inicial no saldan nueva obligación A.
Correctivo copia concepto/profesional/asignación **del original**, nunca del titular actual;
rechaza referencias discordantes. Capacidad se calcula en concepto y asignación original.
Lista personal: cliente del corte actualmente propio, comisión propia original permitida;
justificantes anteriores sanitizados sin datos del nuevo titular ni enlace a su detalle.
Admin gestión conserva su consulta completa separada. Replay reautoriza antes de devolver.
Backfill solo con secuencia/identidad demostrable; profesional actual por sí solo no prueba
asignación de movimientos anteriores. Ambiguos se conservan sin inventar ni sumar pagos
a una obligación nueva; el gate bloquea rollout de esos datos, no redefine RF-47.

### C. Captura, sesión y recuperación (P1-1/2/5)

Autoridad durable única: singleton `SlotSesion` en Dexie, no contador stale de localStorage.
Login/cambio/logout usan CAS con slot esperado (generación/epoch/estado) o lock propio
verificado; una tab no sobrescribe una transición ajena. Cada instalación/invalidez crea
generación aleatoria **nunca reutilizada**, más epoch/fence actualizado bajo transacción.
En la MISMA tx IDB: actualizar slot, invalidar claims anteriores y limpiar proyección
sensible de la sesión saliente propia, **sin borrar comandos pendientes ni inferir dueño**.
Confirmar commit antes de `setAuth`/publicar UI nueva; notificar después por BroadcastChannel
o storage. Esos avisos y espejos auth/sesion localStorage no autorizan ninguna operación.

R02/R03 incluyen `db.ts`, `sesion.ts`, `authStore.ts`: migraciones Dexie con versiones
secuenciales fijadas al desglosar (head local aún a comprobar), conservando pendientes
previos sin reasignarlos ni limpiarlos automáticamente. Slot ausente/incompatible o espejo
auth JSON desfasado tras crash => `locked`/fail closed y recuperación explícita/reconciliación;
no recrear slot desde un usuario/contador supuesto. Tokens solo en memoria o persistencia
auth existente, nunca slot/outbox; hidratación no adivina asociación actor+generación.
Fallo durable bloquea UI/lecturas sensibles/envío/confirmación hasta recuperación explícita.

```text
ANTES del primer await capturar actor/generación/token y ahora + UUIDs + modo
validar datos suficientes; elección cobro inicial explícita sin default
en MISMA tx Dexie slot+outbox+proyección: comprobar activa/actor/generación/epoch y guardar
si guardado falla: no confirmar; si funciona: anunciar pendiente, no aceptación
motor reclama fila en MISMA tx slot+outbox, comprobando contexto durable vigente
claim: owner + expiresAt + fencing nuevo; red FUERA de tx con token capturado
antes de enviar revalidar sesión; nunca reemplazar token por el de cuenta nueva
respuesta/error: en MISMA tx slot+outbox+mapping+proyección validar slot/claim y escribir
publicar solo contexto vigente; transición de sesión invalida memoria antes de mostrar otra
si aceptada: mapping scoped y resultado; si revision/rechazada: causa/importe aparte
transitorio o crash: conservar comando; recuperar lease vencida con nuevo fencing
```

Startup, reconexión, foco, `pageshow`/BFCache, reanudación y expiración disparan recuperación.
Nunca reset global de `enviando`: otra pestaña puede tener un claim válido. Owner/fencing
impiden que un sender viejo publique después de takeover; idempotencia servidor evita
doble efecto aunque ambas solicitudes lleguen. Renovar lease solo si owner/contexto siguen
vigentes; retry con backoff acotado no cambia modo ni convierte revisión en pendiente.
Dependientes se reevaluarán solo para su padre original habilitado. Abono de corte servidor
ya conocido no requiere inventar creación local ni padre outbox inexistente.

R15 reutiliza este slot/transacciones de R02/R03, no crea otra autoridad de sesión.
Check slot y escritura de claims/proyecciones son atómicos IDB; red nunca está en tx.
Entre último check y red puede cambiar sesión: token capturado asegura que solicitud A
jamás sale como B. No se puede retractar una solicitud A ya despachada; su efecto/replay
queda en A, y ningún resultado/401 suyo publica en B. Abort complementa, no reemplaza guards.
Cargas de Registro/MisSaldos/Dashboard/Caja usan contexto capturado y guard tras cada await;
invalidar datos en memoria al cambiar sesión y revalidar tabs suspendidas al retomar.
Mapeos/proyecciones se leen por actor; tokens nunca en outbox. No afirmar privacidad física
de stores plaintext/bóveda ni revocación remota instantánea offline por estos guards.

### D. Moneda, períodos y caja (P1-3/8)

Schemas de endpoints exactos nuevos/ya typed serializan strings, incluido `Decimal('0.00')`.
No reemplazar el serializer numérico de resúmenes legacy para resolver P1-3/RNF-3.
Validar JSON en frontera frontend: no reconstruir strings desde números recibidos;
respuesta inválida produce error controlado, no trim sobre number ni éxito silencioso.
Formato admite negativos correctivos por dígitos; retirar `Number` de `textoExcedente`
y usar cliente exacto en Caja, no el conversor recursivo legacy.

Acumulados personales filtran actor antes de agregar; admin jornadas es otra proyección.
Devengado/comisión por momento servicio; cobros/pagos/compensaciones/devoluciones por
momento movimiento. Total considera todo histórico autorizado, no desde primera apertura.
Fechas desconocidas identificadas fuera de ventanas fechadas. Sumar filas autorizadas en
Python con Decimal y semilla exacta, no SQL SUM fraccionario SQLite como autoridad.
No migrar Numeric a centavos por conveniencia: discrepancias raw exigen diagnóstico/gate.

```text
calcular intervalo BA [inicio, fin) con ahora inyectado; seleccionar cada familia por SU instante
separar confirmado, pagado, pendiente conocido, estimado local, revisión/rechazo y unknown
imputar: revalidar admin/destino ABIERTO bajo UoW; elegir solo pendientes elegibles
  momento real DESCONOCIDO: conservar marca/evidencia, no imputable; solicitar evidencia admin
  momento conocido, jornada real abierta == destino: imputación ordinaria SIN AjusteCierre
  momento conocido, jornada real cerrada o SIN FILA: ajuste a destino abierto actual
    referenciar cierre original solo si existe; sin fila NO inventar cierre/jornada de origen
  conservar real y referencia única; no crear dinero ni cambiar saldo; replay no duplica
resumen cerrado: usar snapshot original, excluir es_tardio de pertenencias originales
  mostrar ajustes posteriores aparte sin mutar ni resumar sobre snapshot
```

Caja ofrece abrir y **acción explícita** de imputar pendientes elegibles mediante endpoint
existente; abrir solo no autoriza otra operación. Se descarta autoimputar todos silenciosamente.
Aceptar movimiento genera tanto imputación como ajuste referenciado cuando corresponde:
una fila ImputacionMovimiento no acredita por sí sola que exista AjusteCierre.
Fecha real desconocida no equivale a instante conocido sin fila JornadaCaja. No usar
`ahora`/fecha de registro administrativo como fecha real efectiva. El flujo existente de
evidencia admin debe documentar el instante mediante operación nueva trazable, conservando
original/marca desconocida; solo entonces evaluar imputación del instante evidenciado.
Mientras falta evidencia, dinero reconocido y saldo permanecen; no se pierde ni se imputa
ficticiamente. Unknown y falta de fila requieren fixtures/decisiones de dominio distintas.

### E. PWA usable (P1-7)

Registro admin: propio/otro barbero (inactivo recuperable incluido) y retroactivo sin
precio/% manuales; barbero momento automático. Cobro pendiente/parcial/completo exige
selección consciente y método de movimiento propio. Completo captura precio mostrado,
no un monto recalculado al sincronizar. Corte/hijo muestran resultados independientes.
MisSaldos: abonos cliente/comisión parcial/restante con métodos propios, edición de
servicio/método permitida, bloqueo explicado; fecha/barbero/motivo solo gestión admin.
Gestión: listas de revisiones/intervenciones, reconocer íntegro o corregir erróneo con
motivo/evidencia, compensar/devolver explícitamente, completar evidencia histórica.
No usar APIs en E2E como sustituto de estos formularios.
Dashboard: día/semana/mes/total, confirmado/estimado/pagado/pendiente/unknown separados.
Proyección local conocida conserva aceptados y pendientes sin descontar estos de saldos;
si insuficiente/desconocida impide confirmar acción inválida y explica limitación.
Cobertura incompleta nunca etiquetada total definitivo ni RF-55 satisfecho.

## 6. División incremental propuesta (no tasks)

Cada paquete futuro tendrá **≤10 tareas de 20–30 minutos**, tests primero y revisión;
si no cabe, reducir/dividir antes de redactar tareas. Rangos provisionales incluyen
verificación local; preparación/revisión integrada y sorpresas pueden exigir más paquetes.
No se promete que ocho P1 equivalgan a ocho tareas ni una cantidad final cerrada.

| Paquete | Alcance acotado / dependencia | Futuras tareas estimadas / horas |
|---|---|---|
| R01, primer paquete pequeño | Canonización pura y tests aislados (omisión/UTC/hash), sin DB/API/frontend | 4–6 / 1.5–3 |
| R02 | Slot Dexie/CAS + db/sesion/authStore, transición commit-first y token/401; sin R01 | 8–10 / 3–5 |
| R03 | Espejos/hidratación fail closed, fallos sesión y cargas/multi-tab/BFCache; R02 | 8–10 / 3–5 |
| R04 | UoW limpia + harness dos conexiones; sin migrar writers todavía | 6–8 / 2–4 |
| R05 | Writers cortes/edición/sync sin commit interno y decisión protegida; R04 | 8–10 / 3–5 |
| R06 | Writers movimientos/correctivos/resolución y capacidad; R04 | 8–10 / 3–5 |
| R07 | Writers jornadas y coexistencia cierre legacy; R04 | 6–9 / 2.5–4.5 |
| R08 | Writers catálogo/usuarios/admin/auditoría + invariante000; R04 | 8–10 / 3–5 |
| R09 | Pruebas cruzadas de writers y retry completo; R05–R08 | 6–9 / 2.5–4.5 |
| R10 | Envelope/journal v3 y adaptadores creación HTTP/sync, diagnóstico histórico; R01,R09 | 8–10 / 3–5 |
| R11 | Replay integral movimientos/correctivos/ediciones e intervención; R10 | 8–10 / 3–5 |
| R12 | Asignación técnica/backfill conservador; R06,R11 | 8–10 / 3–5 |
| R13 | Filtros personales/justificantes y correctivos originales; R12 | 6–9 / 2.5–4.5 |
| R14 | Persist-first y transporte único frontend (creación/hijo/edición); R02,R10,R11 | 8–10 / 3–5 |
| R15 | Claims/fencing con MISMO slot R02 y recuperación navegador; R03,R14 | 8–10 / 3–5 |
| R16 | DTO nuevo `/mi/acumulados`, Dashboard exacto/codec firmado y compat legacy | 6–9 / 2.5–4.5 |
| R17 | Períodos personales/admin por instante y total; R13,R16 | 6–9 / 2.5–4.5 |
| R18 | Unknown vs sin fila, ajustes/imputación, `/resumen-exacto` y Caja/compat legacy; R07,R17 | 8–10 / 3–5 |
| R19 | Registro destino/retroactivo/selección explícita y proyección conocida; R14–R16 | 6–9 / 2.5–4.5 |
| R20 | Formularios parciales/restante/edición propia y dashboard estados; R13,R15,R17,R19 | 8–10 / 3–5 |
| R21 | Consultas/gestión y formulario revisión/intervención; R11,R13,R20 | 8–10 / 3–5 |
| R22 | Formularios compensar/devolver/evidencia/reasignar y trazas; R12,R18,R21 | 8–10 / 3–5 |
| R23 | E2E adversarial producción y nueva revisión T89; todos los anteriores | 8–10 / 3–5 |

Orden de prioridad: R01 prepara identidad sin riesgo; R02–R03 privacidad inmediata;
R04–R13 integridad/privacidad servidor antes de habilitar nuevos senders/formularios.
R16 puede adelantarse para corregir crash monetario. R23 incluye gates integrales,
pero cada paquete prueba sus propios riesgos, no posterga toda evidencia al final.
Estimación orientativa total de esta propuesta: **67–110 horas efectivas**, no presupuesto
ni compromiso; el desglose autorizado y los gates de datos pueden cambiarla. Aprobar
este plan no aprueba todos los paquetes ni su implementación. Siguiente propuesta
recomendable: solo tareas de R01, previa aprobación explícita; luego parar y revisar.

## 7. Evidencia futura y rollout seguro

| Prueba adversarial requerida | RF / paquetes |
|---|---|
| Perder respuesta DESPUÉS del commit HTTP, retry sync y viceversa; un efecto, valores actuales cambiados no recalculan; creación/hijo independientes | 5,6,32,37,57 / R10,R11,R14,R23 |
| Omisión de método/momento replay estable; ISO equivalente conserva precisión; colisiones actor/corte/tipo/concepto/método/importe/instante/motivo/referencia no devuelven datos | 14,15,32,51 / R01,R11,R13 |
| Misma UUID/ref original por HTTP/sync, hint correcto añadido no cambia hash; hint discordante rechaza, cambiar ref UUID→ID colisiona; fixtures legacy sin alias demostrable no se fusionan | 14,32,57; RNF-3 / R01,R10,R11 |
| Reasignación A→B→A, pagos A inicial no saldan nueva A; correctivos mantienen original; nuevo titular no ve comisión anterior, replay revocado seguro | 41,43,47,48 / R12,R13,R22 |
| Dos pestañas, crash/suspensión durante envío, lease vencida/takeover/fencing, respuesta vieja no publica; revisión no autoaplica; hijo se habilita una vez para mismo padre | 29,30,32,53,57 / R15,R23 |
| A→B durante await Dexie y antes de respuesta; token real A no reemplazado por B, abort/401 viejo/BFCache, no mutación de B | 33; RNF-5 / R02,R03,R15,R23 |
| Login/logout simultáneos CAS, generación nunca repetida; falla commit slot/claim/proyección, crash entre IDB y espejo auth; slot ausente/locked no se reconstruye ni pierde pendientes legacy | 29,33; RNF-5 / R02,R03,R15 |
| Dos conexiones SQLite con barreras: abono vs anulación/reasignación/cierre; devolución vs devolución; corte vs precio/%/rol/activo; cierre vs tardío; último admin intacto | 5,23,24,34,41,49 / R04–R09 |
| Dashboard real vacío/cero/positivo, justificante compensatorio negativo; JSON strings y Caja sin Number; inputs positivos siguen rechazando negativos | 12,21; RNF-1/4 / R16,R18,R20 |
| Resúmenes legacy mantienen claves/números/serializer; nuevo acumulado y resumen-exacto strings cero/positivo/negativo y mismo significado, Dashboard/Caja consumen solo exactos | RNF-1/3 / R16–R18 |
| Corte antiguo y pago nuevo en períodos distintos; medianoche BA exacta, lunes/mes, total anterior a primera jornada; +5min exacto y un microsegundo más | 45,51,52; RNF-2 / R01,R17 |
| Instante conocido cerrada/sin fila → abierta distinta sin cierre inventado; real abierta ordinaria sin ajuste; instante unknown no imputable hasta evidencia nueva, saldo intacto; replay/snapshot/es_tardio | 39,45,49,50,54 / R18 |
| UI admin propio/otro/inactivo/retroactivo, dos parciales de cada concepto, bloqueo/edición servicio, revisión/correctivos/evidencia/motivo y journal autor/antes/después reales | 2,10,16–27,38–44,46–48,54,56 / R19–R23 |

Ejecución futura solo autorizada por paquete: pytest en subprocess **por archivo**, cwd TEMP,
`DATABASE_URL` bootstrap TEMP fijada **antes de import**, PYTHONPATH explícito y overrides
aislados. Nunca importar app ni leer DB real para planificar; no suite global con overrides
competidores. Tests puros R01 importan solo canonización/stdlib, sin database/routers.
Runner R01 futuro, mismo aislamiento del paquete 1, desde `backend` (no ejecutado aquí):
```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_comando_corte_aislado.py -q
```
Antes verificar `__init__`/cadena imports, conftest/config/plugins y que módulo puro no
importe app/database; si hay efectos, detener, no confiar solo en flags ni ampliar alcance.
Alembic TEMP: dos upgrades/current y fixtures legacy/parciales sintéticos; verificar
contenido, referencias y snapshots conservados. Vacía verde no prueba instalación legacy.
E2E dist/SW/API/perfil/usuarios sintéticos, puertos efímeros, recarga profunda y cerrar/reabrir
offline; UI verdadera para gestión, no endpoint directo como assertion de formulario.
Conservar once scripts y recorridos T88, agregando pruebas ejecutables y artefactos separados.

Rollout futuro: expansión compatible primero, writers/executor completos después,
frontend versionado y habilitación solo tras gates. Diagnosticar journals/asignaciones
ambiguos en copia autorizada/sanitizada; sin merge, pagos, fechas ni titularidades inventados.
Migraciones reales requieren autorización separada, backup/restauración verificados y
ventana de mantenimiento; aprobación documental no concede acceso a datos reales.
No habilitar v3 parcial si writers viejos pueden evitar exclusión o el frontend reenvía
UUID históricas ambiguas. Controlar convivencia PWA vieja: no consumir sus pendientes
como comandos nuevos; preservar y reconciliar identidad demostrable.
Rollback de aplicación conserva journal, asignaciones, outbox y dinero; deshabilita nuevas
escrituras, sin downgrade destructivo ni restauración silenciosa que pierda operaciones.
Si datos/contratos no permiten una transición segura, detener rollout y consultar el caso.

**Gate final obligatorio:** nueva revisión independiente T89 con matriz RF/RNF actualizada,
evidencia de P1-1–P1-8 y regresión reproducible. Mantener T89 sin marcar hasta satisfacer
su aceptación; ninguna tabla de este borrador significa «corregido» o «implementado».
RF-55/hija003 y otras deudas diferidas siguen explícitas, no satisfechas ni autorizadas.
Autorización posterior: plan aprobado y tareas R01 permitidas; al terminar ese
desglose detenerse, sin código, tests ejecutados ni otras fases.

## Contrato exacto del paquete R01

Este contrato concreta únicamente el sobre común y las primitivas deterministas
de §4/§5.A. No es el DTO HTTP ni el validador completo de acciones v3. El usuario
autorizó su desglose documental y posteriormente iniciar con T90. Seis tareas T90–T95 en
`tasks.md`, 20–30 min cada una (2–3 h); si no caben, detener y reducir/reproponer.

### Archivos y frontera

- Crear en el futuro `backend/app/services/comando_corte.py`: módulo puro stdlib,
  tipos y canonización/hash; sin imports de otros módulos de aplicación.
- Crear en el futuro `backend/tests/test_comando_corte_aislado.py`: stdlib, pytest
  existente y ese módulo exclusivamente. No modificar `dinero_cortes.py` ni su test.
- Lectura al desglosar (2026-10-09): ambas rutas ausentes; `app/__init__.py`,
  `app/services/__init__.py` y `tests/__init__.py` vacíos. Búsqueda de configuración
  pytest/conftest del checkout sin coincidencias; no acredita configuración externa
  ni seguridad futura. Volver a revisar cadena/config/entorno antes de ejecutar.
- Sin Pydantic, ORM, DB, `app.main`, routers, reloj, red, UUID generado ni efectos.
  No API nueva ni conexión al ejecutor. No permisos/roles, saldos, positividad de
  abono, límites persistentes, fechas futuras/reloj adelantado, LWW ni mapping.
  Esas validaciones quedan en sus paquetes de dominio/adaptación, no satisfechas.

### Interfaz Python exacta futura (no código implementado)

Todos los tipos y funciones llevan type hints, sin `Any`. Solo estas estructuras
comunes, no una jerarquía de DTOs por acción:

| Nombre | Contrato exacto |
|---|---|
| `Ausente` / `AUSENTE` | Enum stdlib con único miembro `Ausente.VALOR`; constante `AUSENTE = Ausente.VALOR`. Marcador de omisión, no JSON ni null. |
| `ValorEntrada` | Alias recursivo: `None | bool | int | str | Decimal | UUID | datetime | list[ValorEntrada] | dict[str, ValorEntrada]`. No float, tupla, set, bytes, date sin hora, objeto arbitrario ni claves no string. |
| `ReferenciaUuidCreacion` | Dataclass `frozen=True, kw_only=True`: único campo `uuid: UUID`; discriminante JSON fijo `uuid_creacion`. |
| `ReferenciaIdServidor` | Dataclass `frozen=True, kw_only=True`: único campo `id: int` positivo, bool rechazado; discriminante JSON fijo `id_servidor`. |
| `ReferenciaCorte` | Unión de las dos referencias anteriores, sin alias lookup. |
| `ComandoCorte` | Dataclass `frozen=True, kw_only=True`, campos obligatorios: `version: Literal[3]`, `operacion_uuid: UUID`, `accion: str`, `modo_captura: Literal['online', 'offline']`, `instante_cambio: datetime`, `referencia_corte: ReferenciaCorte`, `datos: dict[str, ValorEntrada]`. Opcionales con default `AUSENTE`: `depende_de_operacion_uuid: UUID | None | Ausente`, `momento_real: datetime | None | Ausente`, `id_servidor_hint: int | None | Ausente`. No otros campos root. |
| `ComandoCanonico` | Dataclass `frozen=True, kw_only=True`, único campo `json_canonico: str`. Salida recursivamente inmutable por ser texto, sin retener referencias a colecciones de entrada. |
| `NAMESPACE_CORTES` | Constante `cortes:v3`; no parámetro configurable ni obtenido del transporte. |
| `canonizar_comando(entrada: ComandoCorte, actor_id: int) -> ComandoCanonico` | Valida estructura común y convierte una copia lógica de la entrada original. Actor entero positivo estricto, inyectado desde autenticación por un futuro caller, nunca del body. |
| `firmar_comando(comando: ComandoCanonico) -> str` | SHA256 del `json_canonico.encode('utf-8')`, `hexdigest()` de 64 caracteres lowercase. No HMAC, firma de autorización ni registro idempotente. |

`accion` debe ser string no vacío, conservado literalmente sin trim/casefold;
R01 no enumera acciones ni valida sus campos de negocio. Versión exactamente int 3
(no bool); modo exactamente uno de los dos literales. IDs comunes rechazan bool.
UUID comunes solo aceptan objetos `UUID`, sin exigir versión UUID específica ni
prohibir el UUID nulo por una regla no acordada. No se convierten strings en UUID,
datetime o Decimal: futuros adaptadores podrán parsear **campos declarados** antes
de llamar a esta frontera. Tipos escalares/contenedores de `ValorEntrada` son los
tipos concretos enumerados, no coerciones de enums o clases arbitrarias.

`datos` contiene los campos originales específicos de acción (incluidos campos
explícitos, bases, motivo/evidencia, método y referencias monetarias cuando apliquen).
R01 conserva sus claves/valores, **no fija esquemas ni allowlists por acción**.
El discriminante de origen temporal automático/manual del contrato global deberá
conservarse explícitamente en `datos` por los futuros adaptadores y participar
en el hash; no inferirlo del rol, transporte o instante. Su esquema/validación
por acción se precisará al desglosar adaptación v3, no dentro de R01.
La futura validación Pydantic/adaptadores deberá excluir actor/credenciales y
rechazar campos de negocio no permitidos; un `datos` libre aquí no sustituye esa
frontera. No existe campo actor/token/generación de transporte en `ComandoCorte`.
No admitir un dict root ni recoger extras con `**kwargs`: el caller entrega la
dataclass exacta; no hay parser genérico de bodies en este paquete.

Las tres identidades no se intercambian: UUID de operación, UUID de corte en
`ReferenciaUuidCreacion` y UUID de operación padre tienen posiciones distintas.
R01 no impone desigualdad entre sus valores ni comprueba dependencias/ciclos de
operaciones. Referencia UUID e ID con mapping posterior siguen siendo comandos
distintos; no inferir concordancia a partir de iguales valores o strings parecidos.

### JSON canónico y validaciones primitivas

- Objeto root exacto: `namespace`, `actor_id`, `version`, `operacion_uuid`, `accion`,
  `modo_captura`, `instante_cambio`, `referencia_corte`, `datos`, y opcionalmente
  `depende_de_operacion_uuid`/`momento_real` cuando no sean `AUSENTE`.
  Referencia exacta: `{"tipo":"uuid_creacion","uuid":"<UUID>"}` o
  `{"tipo":"id_servidor","id":<entero>}`. Keys snake_case de este JSON interno
  no definen/renombran keys del futuro wire contract.
- `id_servidor_hint` corresponde al futuro `idServidorHint`: validar solo su tipo
  entero positivo/null/ausente, **excluirlo del JSON y del hash**. No conservarlo
  como autoridad, consultar DB, comprobar concordancia ni retargetear; el caller
  conserva la metadata original para el guard externo posterior incluso en replay.
- `AUSENTE` solo se admite en los tres campos opcionales comunes. Para padre y
  momento: ausente omite key; null escribe JSON null. En `datos`, una key no enviada
  permanece omitida y una key con `None` permanece null; sentinel anidado se rechaza.
  No rellenar método, momento, bases o campos omitidos con defaults/snapshot actual.
- UUID tipado → `str(uuid)` estándar lowercase con guiones. Strings arbitrarios
  (incluidos `"001"`, `"1.00"`, UUID/ISO aparentes) quedan idénticos: no inferir tipos.
- Datetime tipado requiere timezone con `utcoffset()` no nulo; naive se rechaza,
  nunca adivinar UTC. Normalizar offset a UTC y escribir
  `YYYY-MM-DDTHH:MM:SS.ffffffZ` (seis dígitos aun cuando sean cero), preservando
  microsegundos. Aplica a instante común y datetime dentro de `datos`; no compara
  con hoy/ahora ni juzga si es manual/automático/autorizado.
- Decimal tipado financiero: finito, exponente representado ≥−2; `1.000` se
  rechaza aunque equivalga a 1. Canonizar a string de pesos con dos decimales,
  exacto en centavos, sin float, redondeo ni aritmética dependiente del contexto
  Decimal del caller. `1`, `1.0`, `1.00` → `"1.00"`; `1E+2` → `"100.00"`;
  negativos se conservan; `-0`/`-0.00` → `"0.00"` por equivalencia numérica de cero,
  sin prohibición financiera nueva. No limitar rango/positividad ni usar validador
  de abono ordinario. No modificar inputs ni contexto/flags/traps de Decimal.
- None/bool/int/string mantienen JSON null/boolean/entero/string; bool se permite
  en `datos`, no como actor/ID/versión. Listas conservan orden; dicts con keys string
  ordenan por clave; ninguna normalización Unicode/trim de cadenas. Contenedores
  cíclicos se rechazan; referencias compartidas no cíclicas se aceptan sin mutarlas.
- Serialización stdlib exacta: `json.dumps` con `sort_keys=True`,
  `separators=(',', ':')`, `ensure_ascii=True`, `allow_nan=False`, sin newline.
  SHA256 sobre esos bytes UTF-8, no sobre `repr`, `hash()` ni JSON de efectos aplicados.
  Decimal/UUID/datetime tipados y sus strings ya canónicos pueden producir el mismo
  JSON: decisión de representación JSON normalizada, no preservación del tipo Python.
- Rechazar float recursivamente (también NaN/infinidades), Decimal no finito,
  precisión excesiva y tipos no admitidos. `TypeError('Tipo de comando no admitido')`
  para tipo/clave/sentinel fuera de sitio; `ValueError('Entrada de comando inválida')`
  para valor común inválido, Decimal inválido, naive, ciclo o normalización temporal
  no representable. No eco del input, ruta, ID, importe o excepción interna; si se
  traduce una excepción, suprimir chaining visible. La firma valida tipo de salida
  y texto; no recanoniza ni certifica un `ComandoCanonico` fabricado por otro caller.

### Algoritmo y decisiones acotadas

```text
validar dataclass root, actor, versión/acción/modo y referencias comunes
validar opcionales y hint estructural (sin concordancia)
construir objeto NUEVO con namespace constante y actor inyectado
añadir opcionales presentes; no incluir hint, ni valores efectivos del servidor
recorrer datos y comunes: normalizar solo tipos explícitos; detectar ciclos activos
serializar JSON con parámetros fijados; retornar texto frozen sin alias mutables
firmar ese texto UTF-8 con SHA256, sin reloj/DB/red ni modificación del caller
```

Se elige dataclass común + árbol tipado, en lugar de DTOs de todas las acciones,
para que R01 quepa en seis tareas; autorización y esquemas siguen fuera. Texto
inmutable evita una segunda jerarquía de colecciones frozen. UTC aware evita la
alternativa de atribuir zona a naive. Conversión Decimal por representación exacta
evita quantize dependiente del contexto y validadores que prohíban correctivos.
Omisión por keys/sentinel limitado evita colisionar con un objeto JSON del usuario.
Hint excluido permite añadir mapping sin cambiar identidad, pero no acredita que
ese mapping sea correcto. JSON normalizado no es archivo forense del raw HTTP.

### Pruebas y alcance de evidencia futura

T90 estructura/referencias/omisión y actor: RF-32/RF-57 parciales. T91 árbol/orden,
strings y rechazo seguro: RF-32 parcial. T92 Decimal: RF-41 solo precisión y RNF-1
parcial (no abono aceptable). T93 UTC: RF-9/RF-51 y RNF-2 solo representación
precisa (no política temporal). T94 SHA256/matriz de cambios: RF-32/RF-57 parciales;
actor separa identidad, no acredita RF-14/15/33/34 ni autorización. T95 aislamiento
y regresión exclusiva: RNF-6. Todos con inputs intactos y límites verificables.
No tests ni comandos de ejecución del paquete al redactar; evidencia futura vacía.
Runner y gate de revisión READ ONLY antes de ejecución: §7, mismo aislamiento del
paquete 1. Completar R01 no cierra P1-1/P1-4, T89 ni la spec, y no autoriza R02.

## Contrato exacto R02

### Desglose autorizado y reducción propuesta

El usuario responde «Sí» a preparar las tareas de R02. Autoriza **solo esta fase
documental**, no implementación, instalaciones ni ejecución de pruebas. La fila R02
de §6 incluye **db/sesion/authStore, commit-first y token/401**; R03 comprende
espejos/hidratación/fallos/cargas/multi-tab/BFCache. No trasladar arbitrariamente
login o token/401 a R03 ni declarar completo R02 con solo un repositorio aislado.

La exploración demuestra que R02 completo requiere además adaptar los callers
actuales síncronos y el transporte. No cabe honestamente junto al harness IDB en
diez incrementos de 20–30 min. Se propone dividir **solo R02**:

- **R02a, primer tramo con tareas T96–T103:** schema aditivo, primitives puras,
  repositorio CAS componible y pruebas IndexedDB nativas aisladas; ocho tareas,
  2 h 40–4 h de ejecución efectiva, revisión/coordinación aparte. Nueva autoridad
  **inactiva**, sin conectar auth/senders/vistas ni endurecer guards legacy.
- **R02b, sin tareas redactadas ni autorización:** integración db/sesion/authStore
  commit-first, callers login/logout, token capturado/401 scoped y pruebas de esos
  adaptadores. Orientativamente otros 6–9 incrementos, 2–4.5 h, por recalibrar al
  desglosar. Dependencia R02a revisado y nueva aprobación. R03 conserva su alcance.

Esta reducción es una **propuesta pendiente de aprobación de tareas/división**,
no modificación silenciosa de la fila aprobada. No añade otros paquetes globales.
Revisión documental independiente: **APTO PARA APROBACIÓN DE TAREAS R02a
Y DE LA DIVISIÓN R02a/R02b**, sin bloqueantes. No equivale a aprobación del
usuario ni habilita implementación. Fixtures de T96–T98 deben usar únicamente
módulos ya disponibles en ese incremento, sin imports de etapas futuras.
Si el harness o una tarea excede 30 min, detener y reproponer antes de extenderla.
R02a no cierra P1-5 ni RF-33/RNF-5; R02 no está completo hasta R02b y sus gates.

### Exploración READ ONLY y archivos futuros exactos de R02a

Comprobado el 2026-10-09: `db.ts` contiene head **Dexie 2**, no 3; tablas v1
`cortes/servicios/productos/consumibles`, v2 `outboxOperaciones/mapeoOperaciones`.
Clase privada con constructor sin parámetros y singleton `barberia_db` al importar.
`sesion.ts` es standalone, generación numérica/localStorage y tests de memoria;
`authStore.ts` instala/invalida síncronamente y oculta errores storage. `api.ts`
obtiene token global en interceptor, 401 compara solo token. Son brechas vigentes,
no corregidas por este anexo. Once scripts Node, sin npm test; `t53-test.mjs`
compila solo sesión y comprueba funciones legacy. Playwright Python/Chromium
utilizados históricamente en T88; disponibilidad futura requiere gate, no instalación.
Lockfile e instalación leídos: Dexie **3.2.7**, Vite **5.4.21**, TypeScript **5.9.3**;
sin fake-indexeddb en package/lockfile. No ejecutar ni instalar para comprobarlo aquí.

| Acción / ruta exacta | Responsabilidad de R02a |
|---|---|
| C `frontend/src/services/baseDatosLocal.ts` | Extraer tipos/clase/esquemas actuales sin singleton; constructor con nombre explícito y proveedor de generación inicial; nueva tabla v3 e inicialización. Ningún open al importar. |
| M `frontend/src/services/db.ts` | Reexportar tipos actuales y conservar singleton/nombre/exports existentes a partir de la clase extraída. No cambiar callers ni abrir explícitamente la DB. |
| M `frontend/src/services/sesion.ts` | Añadir tipos/validadores/decisiones puras del nuevo slot; mantener exportaciones y semántica legacy hasta integración autorizada. Sin import runtime de db/repo/auth. |
| C `frontend/src/services/repoSesion.ts` | Repositorio inyectado con instancia DB; lectura/guard/transición transaccionales, sin importar singleton, auth, localStorage ni red. |
| C `frontend/scripts/correcciones-sesion-test.mjs` | Preparar bundle **solo de tests** en TEMP usando Vite instalado, sin cargar vite.config/PWA/App, y typecheck acotado con tsc local; no npx descargable. |
| C `frontend/tests/aislados/sesion-idb.ts` | Assertions ejecutables sobre clase/repo/funciones reales; fixtures nativas IndexedDB, conexiones independientes, migración/rollback/competencia. |
| C `frontend/tests/aislados/sesion_idb.py` | Runner stdlib + Playwright Python existente: bundle TEMP, servidor loopback efímero, perfil/contexto Chromium nuevo y dos páginas del mismo origen; sin API/backend/dist/SW. |

Las cinco rutas nuevas se comprobaron ausentes al desglosar. No tocar authStore,
api, cortesApi, useSync, páginas, package.json/lock ni tests T88 en R02a. Inventario
R02b se fijará al desglosarlo; no está autorizado por enumerarlo aquí.
Extraer schema a clase separada evita importar el singleton en pruebas y ciclos
db→sesion→db. Todos los exports actuales desde db permanecen compatibles.

### Tipos e interfaz exacta propuesta (sin código)

- `SlotSesion` unión readonly, `clave: 'actual'`, `version: 1`,
  `generacion: string`, `epoch: number`; variante `estado: 'activa'` con
  `actorId: number` positivo seguro; variante `estado: 'locked'` con `actorId: null`.
  No token, rol, usuario, timestamp financiero ni datos de negocio. Epoch entero
  seguro ≥0; no booleanos como IDs ni índices.
- Generación inicial `0:<UUID aleatorio>`; cada transición confirmada a epoch E
  usa `E:<UUID aleatorio nuevo>`. La parte aleatoria se obtiene **fuera de tx**
  mediante crypto.randomUUID en el futuro caller y se inyecta. El prefijo monotónico
  garantiza que el string completo nunca se reutilice aunque repita un UUID de test;
  no UUID timestamp ni contador localStorage. No reutilizar epoch, ni reset/downgrade.
- `IdentidadSesion`: snapshot readonly de actorId/generacion/epoch/estado/version/clave
  de un slot válido; CAS compara todos, no solo actor o token. Login del mismo actor
  también crea nueva generación. Un logout exitoso cambia a locked y rota generación.
- `DestinoSesion`: `{estado:'activa', actorId:number}` o `{estado:'locked', actorId:null}`.
  `ResultadoCAS`: `{tipo:'confirmada', slot:SlotSesion}` o `{tipo:'conflicto'}`;
  conflicto sin devolver identidad/datos del ganador. Fallo durable/slot inválido
  rechaza con error genérico seguro, no simula éxito ni escribe localStorage.
- Puras en sesion.ts: `validarSlotSesion(entrada: unknown): SlotSesion`,
  `coincideSlot(actual: SlotSesion, esperado: IdentidadSesion): boolean`,
  `esContextoActivo(contexto: IdentidadSesion, actual: SlotSesion): boolean`,
  `prepararTransicion(actual, esperado, destino, aleatorio): ResultadoCAS`.
  Tipos explícitos, sin any; copia de salida sin alias mutable. No requieren hoy
  porque no hay expiración/lease; no añadir reloj por conveniencia.
- Repositorio: `leerSlot(): Promise<SlotSesion>`;
  `transicionar(esperado, destino, aleatorio, efectos?): Promise<ResultadoCAS>`;
  `conSesionVigente(contexto, tablas, trabajo): Promise<T>` (genérico tipado).
  DB se inyecta al construir repositorio. `trabajo`/`efectos.aplicar` reciben la
  **misma Transaction Dexie**; sus tablas se declaran antes de iniciar, pertenecen
  a esa instancia y se unen con slotSesion. Callbacks solo realizan operaciones
  IDB; no fetch/timers/storage/promesas ajenas. `efectos` no se llama si CAS falla.
  La promesa pública resuelve únicamente tras commit de transacción exterior.
  No aceptar llamada desde transacción ya abierta: rechazarla antes de escribir
  para no confundir resolución de subtransacción con commit durable.

No endpoints, props o UI nuevos. `ContextoSolicitud` con **token en memoria** se
conserva como contrato global para R02b: caller captura token/actor/generación/epoch
antes de su primer await; nunca cambia A por token B. Un 401/error/resultado A solo
puede invalidar/publicar mediante contexto vigente y CAS, jamás logout global
incondicional. R02a prueba identidad/CAS, **no** transporte ni 401 productivo.

### Migración secuencial y fallo cerrado

La futura versión **3** añade `slotSesion: 'clave'`; mantener completas v1/v2
sin alterar claves/índices históricos. Si head cambia antes de T98, parar y ajustar
documentación: no usar 3 sobre otro head ni varios bumps arbitrarios. `Table` de
Dexie 3, no EntityTable de versiones nuevas.

- Upgrade v1→3 y v2→3 crea único slot inicial **locked, actor null, epoch 0**.
  Instalación nueva usa populate; Dexie no ejecuta upgrade de datos en creación
  nueva. Ambas vías comparten constructor de slot inicial puro/generación inyectada.
  Inicialización y esquema quedan en tx de upgrade/populate; fallo aborta todo.
- Nunca reconstruir slot desde auth-storage/sesion-activa-cuenta, propietario
  aparente, barbero_id, timestamp o usuario conectado. Upgrade no lee localStorage.
- Conservar byte/valor lógico de todas las filas previas, incluyendo pendientes,
  estado enviando/revisión, UUID, importes, mappings y filas v1 sin actor demostrable.
  No reset enviando, reasignación, wipe ni conversiones financieras. Filas sin
  propietario verificable quedan **en custodia en su store original**, lógicamente
  fuera del futuro repositorio autorizado: no se transfieren ni reenvían. R02a no
  añade UI de migración ni conecta guards al camino legacy; esta cuarentena no
  acredita protección de los lectores actuales ni privacidad física plaintext.
- Slot ausente/corrupto/incompatible al leer una DB ya v3: error/bloqueo, **no**
  recreate/overwrite automático ni epoch=0 por defecto. Recuperación de sesión
  normal solo mediante login explícito y CAS sobre un slot locked válido; estructura
  irreparable exige detener/reconciliar con autorización futura, no borrar pendientes.
- Epoch MAX_SAFE_INTEGER: transición rechazada sin wrap, slot/filas intactos;
  no fallback de almacenamiento. Fallo abrir/leer/commit bloquea los nuevos callers.
  Recuperación/hidratación/mensajes de aplicación no se implementan en R02a.

### Algoritmo atómico y composición futura

```text
validar parámetros y UUID aleatorio preparados fuera de tx; comprobar tablas de la DB
rechazar transacción exterior existente
abrir rw con slotSesion + TODAS las tablas declaradas por efectos/trabajo
  leer único slot; validar (ausente/incompatible => abortar, no reparar)
  comparar esperado completo bajo esa misma tx
  si CAS distinto: devolver conflicto sin ejecutar efectos ni escribir nada
  construir siguiente slot: epoch+1 seguro, generación nueva y destino explícito
  aplicar efectos IDB declarados para sesión saliente demostrada, si los hay
  guardar slot nuevo en la misma tx; cualquier excepción aborta también efectos
esperar commit exterior; SOLO entonces resolver confirmada al futuro caller
```

`conSesionVigente` sigue igual apertura/lectura, exige slot activo coincidente y
ejecuta trabajo en **misma tx**; desfasado rechaza sin callback. No check-read-then-write
en transacciones separadas. Esta composición permitirá en integración actualizar
slot + invalidar claims anteriores + limpiar proyección **con propietario demostrado**
atómicamente, preservando comandos. R02a no inventa claims/proyecciones todavía
inexistentes, no deduce dueño del store cortes legacy y no tiene callback productivo
de limpieza. R14/R15 deberán declarar slot/outbox/mapping/proyecciones juntos al
guardar/reclamar/publicar; este repositorio no es una garantía si evaden esa tx.
Avisos BroadcastChannel/storage y espejos se hacen **después de commit**, nunca
como autoridad. R02b instalará auth después de commit y sus guards correspondientes;
R03 reconciliará mirrors/hidratación y memoria al reanudar sin otra autoridad.

### Decisiones, pruebas reales y runner aislado

Se elige IndexedDB **nativo Chromium** con Dexie real, frente a Map/localStorage
que no prueban CAS durable/rollback. No fake-indexeddb instalado: no introducirlo
ni añadir Vitest/otra dependencia por defecto. No tomar T88 integral como harness:
requiere backend/DB/build/SW innecesarios aquí. El runner nuevo prepara solamente
bundle test-only mediante instalación local de Vite (config de aplicación desactivada,
sin plugin PWA), tsc local estricto acotado, y sirve desde TEMP; no escribe dist.
Este bundle no es build productivo ni E2E de usuario.

Comando futuro único desde `frontend`, **no ejecutado al desglosar**:
`python tests/aislados/sesion_idb.py`. Este runner invoca por ruta exacta
`node scripts/correcciones-sesion-test.mjs <directorio_TEMP>`; el script solo compila
y prepara fixtures. No npm install/npx descargable ni npm run build. La raíz TEMP
es `TEMP/opencode`, output exclusivo por corrida. Chromium/contexto nuevo sin perfil
del usuario, origen/puerto efímero, DBs `r02_prueba_<UUID>`; rechazar nombre vacío o
`barberia_db` en harness. Test imports solo clase sin singleton, repo y sesion, no
authStore/App/api/useSync. No leer/escribir localStorage ni cargar aplicación o backend.
Cerrar conexiones y borrar únicamente DBs del prefijo/UUID de la corrida propia;
reapertura preserva ese origen/contexto, no reutiliza perfiles reales.

Antes de ejecutar en futura implementación: gate READ ONLY de imports, scripts,
config, instalación local y Playwright/Chromium existentes. Si falta herramienta,
parar y consultar, **no instalar**. No sondas de imports de aplicación. No cambiar
package/lock. Docs Context7 `/dexie/dexie.js` consultadas para transacciones/upgrade;
ejemplos actuales EntityTable no se adoptan: contrastar API con Dexie 3.2.7 local.

Matriz futura: T96 harness sin DB real (RNF-6); T97 compat extracción (RNF-3 parcial);
T98 fresh/v1/v2→3 conservador y reopen locked (RF-29/RF-33 infraestructura parcial);
T99 tipos/identidad/epoch/no tokens (RF-33/RNF-5 parciales); T100 dos conexiones/páginas
CAS simultáneo mismo esperado, un ganador, login mismo actor rota, ABA A→B→A y
reopen (RF-33 parcial); T101 callback IDB + slot rollback y guard/escritura en tx
única (RF-29/RF-33 parciales); T102 fallo durable/corrupto/desfasado/overflow sin
destrucción (RF-29/RF-33 parciales); T103 regresión exclusiva/revisión (RNF-6).
No prometer token/401/cambio real de pantalla/multi-tab auth/BFCache ni RF-34 servidor.
Pruebas por tarea primero, rojo real o verde inicial honesto; reviewer tras cada
incremento y cierre independiente. Evidencia vacía hasta ejecutar con autorización.
