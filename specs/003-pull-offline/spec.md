# Spec 003 — Historial propio y actualización offline

Estado: borrador

## Contexto y objetivo

La spec 002 permite conservar operaciones locales y enviarlas al reconectar,
pero no garantiza la descarga y conservación completa del historial propio.
Este borrador recoge el diferimiento aprobado de RF-55 y sus dependencias de
privacidad, cobertura y actualización. No constituye aprobación de una nueva
fase ni autoriza implementación.

La reconciliación y el aislamiento definidos aquí se aplican a la futura
descarga. No trasladan las brechas de transporte, identidad online, recuperación
de outbox, colisiones de UUID ni cambio de cuenta actuales: P1-1/P1-2/P1-4/P1-5
del cierre de 002 siguen perteneciendo a 002. Un requisito compartido de
privacidad no elimina esas correcciones pendientes.

El objetivo es consultar sin conexión información previamente disponible,
sin confundir un conjunto local incompleto con un total definitivo, ni
conservar acceso a detalles cuya autorización haya sido revocada al actualizar.

## Usuarios

- Barbero: consulta sus cortes, saldos, operaciones y justificantes propios.
- Admin en vista personal: consulta únicamente su información propia.

## Historias de usuario

- HU-1. Como barbero, quiero consultar mi historial sin conexión para revisar
  mis servicios y saldos aunque el servidor no esté disponible.
- HU-2. Como barbero, quiero conocer la cobertura y última actualización para
  no interpretar datos locales incompletos como totales confirmados.
- HU-3. Como usuario, quiero actualizar mis datos sin exponer información de
  otra cuenta ni perder operaciones pendientes.

## Definiciones

- **Cobertura local:** período y conjunto de información disponible en el
  dispositivo; no implica que la información siga actualizada sin conexión.
- **Actualización completa:** información propia reconciliada, incluidas las
  revocaciones conocidas, que permite identificar la cobertura y su fecha.
- **Revocación conocida:** pérdida de acceso a un recurso previamente propio
  comunicada al actualizar; no revela datos del nuevo titular.

## Requisitos funcionales

- RF-1: MIENTRAS se consulte el historial offline, EL SISTEMA mantendrá
  disponibles los últimos 90 días propios y, adicionalmente, cortes anteriores
  con saldos conocidos abiertos y todas las operaciones pendientes. Hereda
  RF-55 de la spec 002.
- RF-2: CUANDO se consulte información local, EL SISTEMA mostrará su cobertura
  y última actualización, sin presentar una suma incompleta como total
  definitivo. Hereda RF-52/RF-55.
- RF-3: CUANDO se actualice el historial, EL SISTEMA reconciliará cortes,
  movimientos, saldos y justificantes propios sin duplicar operaciones ni
  borrar pendientes que todavía no tengan resultado. Hereda RF-11/RF-29/RF-32.
- RF-4: SI una actualización se interrumpe o deja de ser válida, ENTONCES EL
  SISTEMA no anunciará cobertura completa y conservará únicamente información
  previamente disponible cuyo acceso no haya sido revocado de forma conocida.
- RF-5: CUANDO se reciba una revocación, EL SISTEMA retirará el detalle afectado
  antes de exponer información actualizada, incluso si el resto de la
  actualización falla; conservará justificantes propios autorizados sin datos
  posteriores del nuevo titular. Hereda RF-48.
- RF-6: CUANDO se cambie de cuenta, EL SISTEMA impedirá que historial,
  pendientes o respuestas tardías de la cuenta anterior se atribuyan o se
  muestren como propios de la nueva. Hereda RF-33/RNF-5.
- RF-7: MIENTRAS existan operaciones pendientes, en revisión o rechazadas, EL
  SISTEMA las distinguirá de saldos aceptados y conservará causas e importes;
  una descarga no convertirá por sí sola esas operaciones en aceptadas.
  Hereda RF-21/RF-53/RF-57.

## Requisitos no funcionales

- RNF-1: EL SISTEMA conservará la privacidad de la spec 000 y de RF-14/RF-15
  de la spec 002 tanto con conexión como sin ella.
- RNF-2: EL SISTEMA conservará la exactitud monetaria y los momentos reales,
  sin recalcular snapshots aceptados al actualizar información local.
- RNF-3: EL SISTEMA permitirá verificar recarga y cierre/reapertura sin
  conexión, actualizaciones interrumpidas, reasignaciones y cambios de cuenta
  con datos sintéticos; no bastará desconectar una pantalla ya abierta.
- RNF-4: EL SISTEMA no prometerá conocer revocaciones remotas mientras el
  dispositivo esté totalmente desconectado.

## Casos límite

- Corte anterior a 90 días con saldo abierto o una operación pendiente.
- Históricos con saldo desconocido: no inventar una deuda para retenerlos.
- Pago, cambio de fecha o reasignación durante una actualización incompleta.
- Revocación recibida seguida de interrupción: no restaurar el detalle retirado.
- Cambio de cuenta con una respuesta de la sesión anterior en vuelo.
- Reapertura offline después de una actualización válida o interrumpida.

## Fuera de alcance

- Nuevas reglas financieras, nuevos roles o nuevos reportes globales.
- Implementación del diferimiento por redactar este borrador.
- Reinterpretación de datos históricos sin evidencia.
- Cambios de moneda, locale o protocolo de despliegue PostgreSQL.
- Bóveda cifrada: deuda técnica distinta; su alcance y dependencia de esta
  spec deben aclararse antes de planificar, no se considera resuelta aquí.

## Criterios de finalización

- RF-55 y las partes offline dependientes de RF-11/RF-28/RF-48/RF-52 tienen
  evidencia explícita, sin ocultar límites de cobertura.
- Se consultan datos propios después de recargar y reabrir sin conexión.
- Una actualización interrumpida no certifica un total ni restaura revocados.
- El cambio de cuenta no expone ni envía operaciones de otro titular.
- Pendientes y justificantes autorizados se conservan sin duplicar dinero.

## Dudas abiertas

- [NECESITA ACLARACIÓN] Delimitar la dependencia de protección local/bóveda y
  recuperación de pendientes al cerrar sesión; mantener el diferimiento no
  equivale a aprobar privacidad basada únicamente en ocultar la pantalla.
- [NECESITA ACLARACIÓN] Precisar el límite inclusivo de los 90 días, la
  retención de revocaciones y el comportamiento ante información local antigua
  cuya autorización ya no pueda revalidarse.
- [NECESITA ACLARACIÓN] Confirmar la división de tareas y los criterios de
  aceptación de una actualización consistente antes de redactar el plan.

## Trazabilidad

Origen: decisión del paquete 12 y T89 de la spec 002. El diseño histórico de
su plan (§6.F–§7) es referencia para futura planificación, no una solución
técnica aprobada por este borrador. Las simplificaciones posteriores y el
estado real de implementación se contrastarán durante clarificación.
