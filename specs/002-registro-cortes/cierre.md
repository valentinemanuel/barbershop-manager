# Revisión de cierre — Spec 002 / T89

Estado: **REQUIERE CORRECCIONES** — revisión independiente emitida; aceptación integral bloqueada.

## Alcance autorizado

El usuario solicita terminar T89: regresión, cierre documental, borrador de
spec hija y revisión independiente. No se implementa pull ni bóveda, no se
migran datos reales y no se transforma el diferimiento de RF-55 en una
declaración de cumplimiento.

`specs/003-pull-offline/spec.md` recoge RF-55 y las partes dependientes de
historial/cobertura/revocaciones como **borrador**, sin plan, tareas ni código.
Las dudas de clarificación de esa hija no reabren las reglas financieras de 002.

## Protocolo de verificación

- Tests backend: un proceso pytest por cada `backend/tests/test_*.py`, con
  ruta de archivo explícita, cwd TEMP y `PYTHONPATH` del backend. Se fija
  `DATABASE_URL` a una base de bootstrap en TEMP antes de importar la app.
  Cada archivo conserva su fixture existente; separar procesos evita que
  compitan los overrides de dependencias. No se ejecuta `pytest tests/` global.
- SHA256 de `backend/barberia.db` antes/después, sin ejecutar consultas ni
  upgrades sobre esa base. Los logs por archivo y el resultado JSON se guardan
  fuera del repositorio en `TEMP/opencode/t89_regresion_*`.
- Frontend: todos los once `scripts/*-test.mjs`, `npm run build` y
  `python tests/e2e/cierre_produccion.py`, en ese orden.
- Migración: `python -m alembic upgrade head` dos veces y `current`, con
  `ALEMBIC_SQLALCHEMY_URL` de una base vacía en TEMP. Este gate demuestra que
  la cadena no falla en vacío; **no** acredita instalación productiva de todas
  las tablas legacy ni migración conservadora de datos reales.
- Revisión independiente: `sdd-reviewer`, lectura de implementación y contratos,
  sin alterar código ni conectarse a datos reales.

No se fabrican rojos en una tarea de revisión. Los fallos históricos T82–T88
se conservan en tasks.md; resultados actuales se registran separadamente.

## Evidencia de esta ejecución

| Gate | Resultado | Artefactos / límites |
|---|---|---|
| Backend por archivo | 356 passed en 10 procesos, todas las salidas 0 | `TEMP/opencode/t89_regresion_v15x_5aj`: logs + resultados.json; hash antes/después idéntico `8ca1788e3423205ad5462884549212ff533e8a30aaa80766dfaab3d28eea37ab` |
| Scripts frontend | 11/11 verdes, salida 0 | Codec, sesión, abono dependiente, catálogo/PWA, vistas, operaciones y fronteras monetarias; algunos scripts inspeccionan código, no prueban interacción de UI |
| Typecheck/build producción | Verde, salida 0 | Vite 5.4.21 / PWA 0.17.5; sin instalación ni lint inventado |
| E2E producción | Verde, salida 0 | `TEMP/opencode/t88_prod_oexu9eub`: log, screenshot y evidencia JSON; cuatro recorridos del README, no todos los RF |
| Alembic TEMP vacía | Dos upgrades + current verdes | `TEMP/opencode/t89_alembic_4q8hjd8y`, head `012_ajustes_cierre`; baseline legacy sigue siendo solo-inspección |
| Revisión independiente | REQUIERE CORRECCIONES | Ocho grupos P1 adicionales al pull; lectura y sonda pura, sin DB real ni cambios de código |

## Interpretación de cobertura

Un test verde prueba sus assertions, no todo el RF al que se lo relaciona.
La matriz siguiente identifica referencias de evidencia y límites pendientes;
no convierte capacidades de API en flujos de usuario implementados ni una
comprobación textual en E2E.

La frase prevista en T89 «completa salvo pull» solo es válida si no hay otras
brechas bloqueantes. El diferimiento previamente aprobado se limita a pull,
bóveda/protocolo PG/locale; no permite trasladar automáticamente otras
funcionalidades incompletas a la hija 003.

### Resultados backend por archivo

| Archivo en backend/tests | Passed |
|---|---|
| test_auditoria_router.py | 2 |
| test_auth.py | 2 |
| test_cortes.py | 97 |
| test_dinero_cortes_aislado.py | 167 |
| test_invariante_admin.py | 8 |
| test_jornadas.py | 22 |
| test_roles_permisos.py | 23 |
| test_sync_roles.py | 21 |
| test_t9_t10_t11.py | 10 |
| test_usuarios_auditoria.py | 4 |

Warnings existentes de Pydantic/SQLAlchemy, no fallos. Esta ejecución no
retira `create_all` ni demuestra que sea seguro importar app sin override.

### Matriz de evidencia RF/RNF

La exploración independiente leyó los cuerpos y assertions; el coordinador
ejecutó los diez archivos y once scripts. Las referencias siguientes son
evidencia **parcial** por requisito; «directa» solo describe la assertion
citada, no aceptación del RF completo en PWA. E2E se refiere a
`frontend/tests/e2e/cierre_produccion.py`; scripts a `frontend/scripts/`.

Abreviaturas: C=`backend/tests/test_cortes.py`, D=`test_dinero_cortes_aislado.py`,
S=`test_sync_roles.py`, J=`test_jornadas.py`, R=`test_roles_permisos.py`,
T=`test_t9_t10_t11.py`, Fnn=`frontend/scripts/tnn-test.mjs`.

| RF | Referencia concreta de evidencia | Límite de cierre |
|---|---|---|
| 1 | C `test_crear_corte_calcula_porcentaje`, `test_barbero_no_puede_enviar_destino_403` | No matriz UI de los tres métodos |
| 2 | C `test_registro_admin_para_otro_barbero`, `test_destino_propio_explicito_del_admin_201` | API directa; UI admin pendiente P1-7 |
| 3 | D `test_reparto_nominal_es_decimal_al_centavo_y_conserva_entradas` | Cálculo exacto directo; contratos runtime P1-3 |
| 4 | D `test_reparto_nominal_es_decimal_al_centavo_y_conserva_entradas` | No escenario de registro con productos/consumibles presentes |
| 5 | C `test_corte_conserva_snapshot_ante_cambio_posterior_de_porcentaje`; S `test_crear_corte_v2_reintento_no_duplica_y_trae_mapping` | No precio/% cambiado durante desconexión antes de primera aceptación |
| 6 | C `test_replay_con_catalogo_cambiado_no_recalcula` | Replay API directo, no todo camino online UI |
| 7 | F50 bloque comisión HALF_UP; F83 inspección de páginas | No assertion visual estimada/confirmada |
| 8 | C `test_barbero_no_puede_enviar_momento_400`, `test_registro_sin_momento_usa_fecha_automatica` | API automática compara día, no instante preciso del registro |
| 9 | J `test_momento_sync_se_conserva`; E2E momento exacto | E2E actual prueba milisegundos; API fecha antigua separada |
| 10 | C `test_registro_admin_retroactivo_conserva_fecha` | UI administrativa pendiente P1-7 |
| 11 | C `test_historial_propio_sin_parte_barberia`; E2E | No shape completo con sincronización y ambos saldos en un DTO |
| 12 | J `test_acumulados_separan_revision_y_desconocido`; R `test_rf8_resumen_barbero_solo_agregados_propios` | Acumulados admin no sustituyen estados del dashboard personal P1-3/7 |
| 13 | C `test_abono_no_mueve_otro_concepto`; F64 agrupación conceptos | Directa por corte, no agregado personal multicorte |
| 14 | C `test_detalle_ajeno_sigue_404`, `test_movimientos_respetan_privacidad`; E2E 404 uniforme | Colisiones UUID/subrecursos P1-4 pendientes |
| 15 | C `test_contratos_personales_sin_datos_del_negocio`; T detector servicios/productos/consumibles | Detector no cubre todos los datos de otros profesionales P1-4 |
| 16 | C `test_abono_no_mueve_otro_concepto` | API no sustituye formularios de movimientos P1-7 |
| 17 | C `test_abono_parcial_por_concepto_201`, `test_saldar_restante_exacta_paga_sin_flags` | Falta assertion conjunta autor/momento/métodos sucesivos |
| 18 | C `test_abono_no_mueve_otro_concepto` | Assertion directa: cliente no paga comisión |
| 19 | C `test_abono_no_mueve_otro_concepto` | Assertion directa: comisión no paga cliente |
| 20 | C `test_saldar_restante_exacta_paga_sin_flags`, `test_matriz_pendiente_parcial_pagado` | Movimientos API, no formulario restante en PWA |
| 21 | C `test_matriz_pendiente_parcial_pagado`, `test_revision_no_mueve_saldos_ni_excedente`; F64 | No dos parciales sucesivos de comisión ni render completo combinado |
| 22 | C `test_editar_metodo_conserva_importes`, `test_editar_servicio_recalcula_valores_actuales` | UI solo método/anular P1-7 |
| 23 | C `test_corte_bloqueado_desde_primer_abono`, `test_editar_bloqueado_409_y_abono_sigue_201` | Bloqueo probado por cliente, no parcial inicial comisión/carrera P1-6 |
| 24 | J `test_cierre_bloquea_cortes_para_barbero` | API sin pagos; no cierre contra writers concurrentes |
| 25 | C `test_editar_bloqueado_409_y_abono_sigue_201`, `test_correctivos_admin_al_anulado_201` | No completar pago bloqueado únicamente por cierre |
| 26 | C `test_journal_conserva_antes_despues_motivo_autor` | Comprueba antes/después/motivo/momento; nombre no acredita assertion autor |
| 27 | C `test_anulado_fuera_de_devengado`, `test_resumen_personal_excluye_anulados` | Conteos no prueban toda obligación/comisión monetaria anulada |
| 28 | F50/F54/F72 constructores; E2E registro y corrección offline | Historial a 003; formularios financieros offline faltantes P1-7 |
| 29 | E2E misma outbox al recargar/reabrir Chromium offline | No recuperación de estado enviando P1-2 |
| 30 | S `test_usuario_desactivado_offline_se_rechaza_con_409_y_notifica`; E2E reconexión | No retry real tras fallo durante envío P1-2 |
| 31 | S `test_sync_corte_servicio_desactivado_se_acepta_con_valores_actuales` | No captura previa con cambios de precio/% durante desconexión |
| 32 | C `test_doble_envio_simultaneo_un_solo_corte`, `test_abono_uuid_duplicado_un_solo_movimiento`; E2E replay | UI sin UUID, retry atascado y hash incompleto P1-1/2/4 |
| 33 | F53 generación/vigencia en memoria | No transporte real A→B durante await P1-5 |
| 34 | S `test_rol_degradado_offline_rechaza_operacion_no_permitida`, `test_sync_edicion_tras_bloqueo_a_intervencion_sin_aplicar` | No bloqueo por cierre en sync ni aceptación bajo UoW integral |
| 35 | F55 inspección transacción/catálogo; E2E catálogo al reabrir offline | No fallo de actualización de catálogo adversarial |
| 36 | C `test_lww_unidades_independientes_y_grupo_integro`, `test_anulacion_prevalece_sobre_edicion_tardia` | Casos secuenciales; faltan unidad momento y ambos órdenes autorizados |
| 37 | C `test_cobro_inicial_pendiente_sin_abono`, `test_cobro_inicial_parcial_y_completo` | No completo offline con nuevo precio definitivo; selección default pendiente |
| 38 | S `test_abono_offline_exceso_a_revision_sin_mover_saldo`; E2E 150/precio100 | Falta exceso comisión/precio cacheado distinto |
| 39 | J `test_correccion_sobre_cerrado_genera_ajuste`, `test_resumen_cerrada_usa_snapshot_congelado` | Corrección método, no anulación/reasignación cerrada integral |
| 40 | S `test_sync_edicion_tras_bloqueo_a_intervencion_sin_aplicar`; E2E intervención | No intervención por comisión/cierre posteriores |
| 41 | D validadores; C `test_abono_concurrente_no_supera_saldo`, `test_devolucion_concurrente_solo_una_consume` | Casos cliente y candados limitados; payload/UoW P1-4/6 |
| 42 | C `test_editar_servicio_recalcula_valores_actuales`, `test_reasignar_conserva_precio_y_aplica_porcentaje_nuevo` | No todos los cambios combinados/corrección fecha válida con ajustes |
| 43 | C `test_compensacion_corrige_sin_borrar_original`, `test_devolucion_limite_y_capacidad` | No circuito equivalente comisión/coherencia referencia-concepto exhaustiva |
| 44 | C `test_historico_desconocido_no_inventa_deuda` | Corte sintético nuevo marcado unknown, no migración legacy real |
| 45 | J `test_real_cerrada_ajusta_a_abierta_actual`, `test_resumen_separa_devengado_de_caja` | Casos cobro; acumulados por movimiento P1-8 |
| 46 | C `test_anular_cancela_obligaciones_y_neto_a_excedente`, `test_sin_abonos_al_anulado_y_movimientos_conservados` | No anulación unknown ni ambos conceptos íntegros |
| 47 | C `test_pagos_previos_no_se_trasladan_al_nuevo`, `test_justificantes_solo_propios_y_limpios` | Falta excedente anterior y servicio+barbero juntos; lista P1-4 |
| 48 | C `test_reasignado_pierde_acceso_total`, `test_justificantes_solo_propios_y_limpios` | No invalidación local conocida: parte dependiente a 003; filtrado API P1-4 |
| 49 | J `test_tardio_vinculado_por_ajuste_sin_tocar_snapshot`, `test_cierre_bloquea_cortes_para_barbero` | Test tardío no compara snapshot antes/después; carrera P1-6 |
| 50 | J `test_imputar_pendientes_al_abrir`, `test_imputar_solo_su_jornada_y_403`; F80 | Misma jornada, no ajuste pendiente a otra abierta P1-8 |
| 51 | C `test_registro_admin_futuro_rechazado_400`; S `test_abono_offline_reloj_adelantado_a_revision` | +10min, no frontera exacta +5min ni todos los originales persistidos |
| 52 | J `test_acumulados_dia_semana_mes`, `test_fecha_negocio_zona_buenos_aires` | Datos misma jornada; falta servicio/movimiento en períodos distintos P1-8; cobertura local a 003 |
| 53 | C `test_resolver_revision_erronea_crea_compensatoria`; E2E reconocer real/excedente | No estados envío/rechazo con importe/causa integral; recuperación P1-2 |
| 54 | C `test_admin_completa_con_evidencia_sin_tocar_fecha` | No fecha histórica desconocida ni contenido/autor journal exhaustivo |
| 55 | Sin prueba de descarga 90 días + anteriores abiertos + pendientes | Diferido a 003; no satisfecho |
| 56 | C `test_registro_destino_inactivo_con_porcentaje_201`; S `test_sync_corte_servicio_inexistente_a_revision` | No profesional inexistente/dependientes conservados completos |
| 57 | F54 dependencia/importe; E2E corte aceptado + abono revisión | No postcommit perdido ni todos los errores/reintentos P1-1/2/4 |

| RNF | Referencia | Límite de cierre |
|---|---|---|
| 1 | D aritmética/contexto; F50/F82 codecs; F83/F84 estáticos; build | No todo el flujo exacto runtime/caja P1-3/8 |
| 2 | J zona/fecha sync; F50/F54/F72 UTC | No todos los displays locales ni períodos movimiento/servicio P1-8 |
| 3 | C `test_post_sin_uuid_camino_legacy_intacto`; J `test_legacy_resumen_intacto` | Regresiones por rutas no acreditan todo contrato ni datos reales |
| 4 | F64/F79/F80 etiquetas; screenshot E2E | No visuales accesibilidad/móvil integrales ni dashboard runtime P1-3 |
| 5 | C privacidad DTO/404; E2E caches y API; F53 | Almacenamiento offline/cambio de cuenta/subrecursos P1-4/5; bóveda diferida no excusa aislamiento |
| 6 | 356 backend + 11 scripts + build + 4 recorridos E2E | No prueba de todos los RF; faltan escenarios de bloqueantes y RF55 |

## Dictamen y próximos pasos

`sdd-reviewer` dictamina **REQUIERE CORRECCIONES**. No aprueba spec integral
ni el cierre «implementada salvo pull». Reconoce las mejoras acotadas
T82–T88, pero no considera sus checkboxes evidencia de cumplimiento global.

### Bloqueantes encontrados (no diferidos por autorización)

| ID | Problema y referencia del checkout revisado | RF/RNF afectados | Escenario que debe verificar una corrección futura |
|---|---|---|---|
| P1-1 | Los POST online omiten identidad durable: `RegistroCortes.tsx:209–226`; correcciones directas también omiten identidad/timestamp en `MisSaldos.tsx:125,164` | 32, 57 | Aceptar en servidor, perder respuesta y reintentar por sync: mismo corte/movimiento, sin doble efecto |
| P1-2 | Senders seleccionan solo pendiente y catch no restaura/reconcilia enviando: `useSync.ts:36,113,191` y catch `91–93,178–180,260–262` | 29, 30, 32 | Fallo de red o cierre durante envío; reapertura/reconexión permite retry con la misma UUID |
| P1-3 | Dashboard espera strings pero resúmenes sin response schema serializan Decimal a número (`cortes.py:537–626`); formateador llama trim y rechaza negativos (`formato.ts:50–54`) presentes en justificantes (`MisSaldos.tsx:292`) | RNF-1, RNF-4, 12 | Dashboard vacío/con cortes y justificantes compensatorios negativos sin excepción ni aritmética float |
| P1-4 | Replay UUID global compara payload incompleto y puede devolver otro movimiento (`movimiento_corte_service.py:59–71,313–316,412–423,480–491`); listado no filtra pagos del anterior profesional tras reasignar (`movimientos_corte.py:190–197`) | 14, 15, 32, 41, 47, 48; RNF-5 | UUID ajena/otro corte/tipo/método/momento → conflicto seguro, sin datos ajenos; nuevo titular no ve pagos del anterior |
| P1-5 | Sync captura actor A pero axios toma token vigente B después de awaits (`useSync.ts:28–46`, `api.ts:11–20`); cargas de vistas no comprueban generación antes de actualizar | 33; RNF-5 | Cambiar A→B entre lectura Dexie y envío, y antes de respuesta: no se atribuye ni presenta información de A a B |
| P1-6 | Candado local de abonos no serializa todos los writers ni revalida estado bajo exclusión (`movimiento_corte_service.py:24–33`, `movimientos_corte.py:105–123,243–273,310–337`, `jornadas.py:39–68`) | 23, 41, 49 | Abono contra anulación/reasignación/cierre en conexiones independientes; SQLite no elude bloqueo ni saldo. La deuda PG no resuelve este caso |
| P1-7 | PWA no ofrece registro admin destino/fecha; abonos posteriores/comisión/edición de servicio y gestión de correctivos no tienen formularios; Dashboard no distingue estados requeridos (`RegistroCortes.tsx:310–397`, `MisSaldos.tsx:256–279`, `DashboardBarbero.tsx:87–125`) | 2, 10, 12, 16–22, 28 y HU administrativas | Completar los flujos en UI, no solo invocar endpoints backend por API en un test |
| P1-8 | Resúmenes propios usan medianoche UTC; acumulados suman pagos de cortes por fecha del servicio; imputar exige fecha real igual a la abierta; caja no invoca imputación y conserva conversor Number (`cortes.py:543–613`, `jornadas.py:235–301`, `jornada_service.py:278–296`, `CierreCaja.tsx:58–83`) | 45, 50, 52; RNF-1/2 | Límites Buenos Aires, pago de corte antiguo en jornada nueva, ajuste de jornada cerrada a abierta distinta, caja por strings exactos |

La sonda pura del reviewer comprobó que el encoder entrega `0`/`50.0` y el
formateador exacto lanza TypeError ante ambos. Los restantes hallazgos se
basan en lectura de código y contratos; no se atribuye a esta revisión la
ejecución de cada escenario adversarial futuro.

### Resultado de T89

Regresión, borrador de hija y revisión documental se ejecutan, pero el
**criterio de aceptación de T89 no está satisfecho**: se mantiene sin marcar
en tasks.md y la spec continúa aprobada con implementación parcial. Cambiar
el checkbox o renombrar requisitos no solucionaría los bloqueantes.

La hija 003 no absorberá estos ocho grupos por defecto. El próximo paso
requiere autorización de un plan de correcciones dividido en tareas pequeñas
y dependientes, usando los RF ya aprobados; no una nueva redefinición del
producto ni un paquete de código añadido a esta tarea documental.

Actualización de planificación: el usuario solicitó preparar ese plan.
`plan-correcciones.md` redactado y auditado: **APTO PARA APROBACIÓN DEL PLAN**,
todavía en borrador. Propone paquetes dependientes y un primer paquete puro
R01, sin crear tareas ni implementar. Los ocho P1 siguen abiertos y T89
sin marcar; la aprobación documental no es una nueva aceptación integral.

Actualización posterior: el usuario aprobó el plan y autorizó desglosar R01.
T90–T95 redactadas y revisadas documentalmente: **APTO PARA APROBACIÓN DE
TAREAS**, pendientes de autorización para implementar. El párrafo anterior
conserva el historial de planificación; no cambia el dictamen funcional T89.
