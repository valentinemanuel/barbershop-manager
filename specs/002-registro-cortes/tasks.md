# Tareas 002 — Paquete 1: reparto y validación monetaria puros

Estado: **paquete monetario implementado y revisión de cierre aprobada (T1–T6)**. Sin autorización de paquetes posteriores ni validación integral de la spec.

## Alcance y límites

- División progresiva aprobada por el usuario. Este archivo contiene únicamente el primer paquete, no todas las tareas de la spec 002.
- Seis tareas de 20–30 minutos: estimación del desglose 2–3 horas, dentro del rango provisional de 2–4 horas del paquete.
- Únicos archivos de código/tests que podrá crear este paquete cuando se autorice implementar:
  - `backend/app/services/dinero_cortes.py`.
  - `backend/tests/test_dinero_cortes_aislado.py`.
- Interfaces y contratos: `plan.md`, sección 2, «Interfaces exactas del primer paquete».
- Cobertura **parcial** de RF-3, RF-4, RF-41 y RNF-1; RNF-6 aporta verificación por tarea. No afirmar cumplimiento integral, aceptación de cortes ni funcionamiento offline por completar este paquete.
- No modificar API, modelos, `corte_service.py`, dependencias, configuración, fixtures globales ni datos; no conectar todavía las funciones al flujo productivo. No migrar ni ejecutar suites que importen la aplicación o abran bases.
- Paquetes posteriores, tareas adicionales y su implementación requieren aprobación independiente. No crear specs hijas por cuenta propia.

## Protocolo de ejecución futura

1. Aprobación recibida: «Comienza» y confirmación posterior «Implementar las seis actuales». No ampliar el alcance.
2. Una tarea cada vez: escribir tests primero, obtener y registrar el fallo pertinente en rojo, implementar lo mínimo, ejecutar en verde y la regresión aislada del paquete, marcar solo esa tarea y parar esa ejecución. El coordinador puede iniciar después la siguiente tarea autorizada; ante bloqueantes, detener la secuencia y consultar.
3. Si un caso ya está cubierto y pasa antes de tocar código, registrar ese hecho; no introducir fallos artificiales ni afirmar un rojo inexistente. Una verificación final no exige romper código correcto.
4. Registrar en la evidencia de cada tarea el comando, resultado inicial/final y casos verificados; no marcar un checkbox por intención o solo por revisión documental.
5. Si aparecen imports/configuración con posibles efectos sobre DB o el alcance excede los dos archivos, detenerse y consultar. No resolverlo ejecutando la suite global ni ampliando el paquete.

Comando aislado, desde `backend` en bash, a verificar antes de ejecutar según las precauciones de `plan.md` §2:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_dinero_cortes_aislado.py -q
```

Este comando y los tests **no se han ejecutado** al redactar las tareas. Verificar primero la cadena de imports y la configuración; no asumir que las opciones protegen de código externo desconocido.

## Tareas en orden de dependencia

- [x] **T1. Validar porcentajes Decimal sin normalización.** RF-41 (rango/precisión parcial), RNF-1, RNF-6. **20–30 min.**
  - Dependencias: ninguna; revisar aislamiento de imports antes de cualquier ejecución.
  - Escribir tests de `validar_porcentaje(valor: Decimal) -> Decimal` y después crear la función pura: límites 0 y 100, `50.25`, notación `1E+2` y cero negativo; retornar el mismo objeto Decimal, sin cambiar escala/signo.
  - Cubrir fuera de rango, precisión representada superior a dos decimales —incluido `50.000`—, NaN/sNaN/infinidades y tipos no Decimal, con orden de validación y errores en español establecidos en el plan.
  - Hecho cuando: los casos válidos e inválidos pasan por ejecución aislada, se rechazan sin conversión/redondeo silencioso y queda registrada evidencia rojo/verde del nuevo validador, sin importar aplicación ni DB.

- [x] **T2. Validar importes de abono positivos y exactos.** RF-41 (validación de entrada parcial), RNF-1, RNF-6. **20–30 min.**
  - Dependencias: T1, por el módulo y harness aislados; no introducir acoplamiento entre porcentaje y abono.
  - Escribir tests y crear `validar_importe_abono(importe: Decimal) -> Decimal`: importes positivos con hasta dos decimales conservan identidad/representación; cero —incluido signo negativo—, negativos, precisión excesiva, no finitos y tipos no Decimal se rechazan conforme al plan.
  - La función no recibe ni consulta saldo, método, usuario, origen online/offline o DB; no afirma que un pago sea aceptable financieramente.
  - Hecho cuando: matriz de validación y tests de T1 pasan con el comando aislado, se registra evidencia del nuevo contrato y no hay aceptación financiera ni conversiones desde float/cadenas.

- [x] **T3. Calcular reparto nominal y validar el precio canónico.** RF-3/RF-4 (aritmética y base de servicio parciales), RF-41 (porcentaje reutilizado), RNF-1, RNF-6. **20–30 min.**
  - Dependencias: T1 y T2.
  - Escribir tests y crear `calcular_partes(precio: Decimal, porcentaje_barbero: Decimal) -> tuple[Decimal, Decimal]`, usando exclusivamente el precio del servicio y el validador de porcentaje.
  - Cubrir 100 pesos al 50 % → 50/50, porcentajes 0/100, precio cero y retornos Decimal al centavo. Validar precio finito, no negativo y escala máxima de dos decimales; rechazar tipos/precisión inválidos sin corregirlos.
  - No agregar productos/consumibles a la firma ni importar sus modelos; no conectar al servicio de registro actual ni imponer un máximo comercial nuevo.
  - Hecho cuando: casos nominales, precio inválido y validadores anteriores pasan; ambos importes son Decimal y suman el precio exacto; evidencia registrada y solo los dos archivos permitidos contienen cambios de código/tests.

- [x] **T4. Verificar redondeo matemático y resto exacto.** RF-3/RF-4 (parciales), RNF-1, RNF-6. **20–30 min.**
  - Dependencias: T3.
  - Añadir vectores parametrizados: precio `0.08` al 30 % → `0.02/0.06`; `0.05` al 50 % → `0.03/0.02`; `1.01` al 50 % → `0.51/0.50`; `0.03` al 50 % → `0.02/0.01`.
  - Verificar `ROUND_HALF_UP` explícito para comisión y barbería como resto exacto, sin redondear ambas partes de forma independiente. Los valores intermedios con tres decimales no se usan como precios/abonos válidos.
  - Hecho cuando: vectores y regresión T1–T3 pasan con suma exacta y formato al centavo; documentar si los casos revelaron un fallo o ya estaban cubiertos, sin fabricar un rojo. Ningún resultado depende del redondeo predeterminado del llamador.

- [x] **T5. Aislar la aritmética del contexto Decimal del llamador.** RF-3/RF-41 (parciales), RNF-1, RNF-6. **20–30 min.**
  - Dependencias: T4.
  - Escribir casos con precisión llamadora baja, redondeo distinto y traps `Inexact`/`Rounded` activos, además de un precio exacto grande como `1000000000000.01`, sin usar float.
  - Garantizar contexto privado suficiente para producto/división/redondeo/resta y salida al centavo; el contexto llamador completo —precisión, redondeo, `Emin`, `Emax`, `capitals`, `clamp`, traps y flags— se conserva antes/después, también ante excepción.
  - No llamar `setcontext` ni convertir el rango persistente de un modelo en límite comercial de esta función; un límite técnico no representable se informa conforme al contrato del plan, nunca se trunca.
  - Hecho cuando: resultados exactos coinciden bajo los contextos probados, el contexto original queda intacto y regresión T1–T4 pasa; se registra evidencia sin introducir estado global ni efectos externos.

- [x] **T6. Verificar aislamiento y cerrar evidencia del paquete.** RF-3/RF-4/RF-41 y RNF-1 (cobertura parcial), RNF-6. **20–30 min.**
  - Dependencias: T1–T5.
  - Revisar y comprobar que el test importa solo stdlib, pytest y el módulo puro, sin `app.main`, database, routers, modelos o tests ajenos; verificar cadena de `__init__`/configuración antes de ejecutar y parar si dejó de ser segura.
  - Ejecutar únicamente la suite aislada completa; revisar type hints, errores en español, ausencia de conversiones float, conservación de entradas y límites de alcance. No ejecutar pytest global, coverage de toda app, migraciones ni instalar dependencias.
  - Registrar comandos/resultados y pruebas relevantes en la evidencia y actualizar el estado del paquete al finalizar, sin marcar la spec completa como implementada.
  - Hecho cuando: suite aislada completa en verde con evidencia reproducible, solo los dos archivos autorizados cambiaron productivamente y no se tocaron API/DB/configuración; revisión del paquete confirma su cobertura parcial y queda solicitado el siguiente paso al usuario. Esta tarea es de verificación, no autoriza código adicional ni requiere un fallo artificial.

## Evidencia futura

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T1 | Rojo real: 1 error de colección en 0.13s, salida 2; `ModuleNotFoundError: No module named 'app.services.dinero_cortes'` antes de crear el módulo | Verde: `33 passed in 0.03s`, salida 0 | Desde `backend`, ambas ejecuciones: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_dinero_cortes_aislado.py -q`. Python 3.11.9, pytest 7.4.3 existentes; `python` resolvió a `C:\Users\TiendaOP\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe` (sin venv ni instalación). Tres `__init__` vacíos revisados; no encontrados conftest/config pytest de proyecto ni ascendientes revisados. Casos: identidad/escala/signo, 0/100, 50.25, 1E+2, -0.00; no finitos, precisión antes de rango y tipos sin convertir; mensajes exactos en español. Imports solo Decimal/pytest/módulo puro; sin aplicación, DB, suite global ni caches generadas. |
| T2 | Rojo real: 1 error de colección en 0.08s, salida 2; `ImportError: cannot import name 'validar_importe_abono'` antes de crear la función | Verde: `75 passed in 0.05s`, salida 0; 42 casos nuevos y 33 de regresión T1 | Desde `backend`, ambas ejecuciones: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_dinero_cortes_aislado.py -q`. Python 3.11.9/pytest 7.4.3 existentes, ejecutable vuelto a comprobar: `C:\Users\TiendaOP\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe`. Tres `__init__` vacíos e imports seguros revisados; sin config pytest/conftest de proyecto ni ascendientes revisados. Verificados identidad/escala, positivos, ceros de ambos signos, negativos, no finitos, precisión antes de positividad, tipos sin convertir, mensajes exactos y contexto Decimal intacto ante éxito/error. Solo validador puro y tests, sin saldo/origen/aceptación financiera ni reparto; sin DB, instalaciones, suite global ni caches generadas. |
| T3 | Rojo real: 1 error de colección en 0.09s, salida 2; `ImportError: cannot import name 'calcular_partes'` antes de crear la función | Verde: `117 passed in 0.08s`, salida 0; 42 casos nuevos y 75 de regresión T1–T2 | Desde `backend`, ambas ejecuciones: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_dinero_cortes_aislado.py -q`. Python 3.11.9/pytest 7.4.3 existentes, ejecutable vuelto a comprobar: `C:\Users\TiendaOP\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe`. Imports y tres `__init__` vacíos revisados; sin config pytest/conftest de proyecto ni ascendientes revisados. Casos nominales 100/50, porcentajes 0/100/-0.00, precio cero/-0.00 y notación exponencial; tupla Decimal al centavo, suma exacta y entradas intactas. Precio: tipo/finitud/precisión/no negativo con mensajes exactos; porcentaje reutiliza su validador. ROUND_HALF_UP explícito y barbería como resto; localcontext básico, sin tope comercial. Vectores T4 y robustez del contexto T5 pendientes, sin adelantar sus tests. Solo dos archivos productivos; sin DB/API/instalaciones/configuración/suite global ni caches generadas. |
| T4 | Verde inicial real tras añadir tests: `125 passed in 0.09s`, salida 0; código T3 ya satisfacía los vectores, sin rojo artificial | Mismo verde, única ejecución; 8 casos nuevos (4 vectores × 2 redondeos) y 117 de regresión T1–T3; sin cambio de implementación | Desde `backend`: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_dinero_cortes_aislado.py -q`. Python 3.11.9/pytest 7.4.3 existentes, ejecutable vuelto a comprobar: `C:\Users\TiendaOP\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe`. Imports y tres `__init__` vacíos revisados; sin config pytest/conftest de proyecto ni ascendientes revisados. Vectores 0.08/30→0.02/0.06, 0.05/50→0.03/0.02, 1.01/50→0.51/0.50 y 0.03/50→0.02/0.01 bajo ROUND_DOWN y ROUND_HALF_EVEN del llamador. Verificados Decimal al centavo, comisión matemática, barbería como resto y suma exacta; redondeo llamador conservado. Solo test y evidencia T4 modificados en esta ejecución; sin pruebas de precisión baja/traps de T5, DB/API/dependencias/configuración/suite global ni caches generadas. |
| T5 | Rojo real: `24 failed, 143 passed in 0.33s`, salida 1; contexto heredado provocaba Rounded/Inexact/Overflow y límites técnicos sin ValueError contractual | Verde: `167 passed in 0.13s`, salida 0; 42 casos nuevos y 125 de regresión T1–T4 (18 nuevos ya pasaban inicialmente, sin rojo artificial) | Desde `backend`, ambas ejecuciones: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_dinero_cortes_aislado.py -q`. Python 3.11.9/pytest 7.4.3 existentes, ejecutable vuelto a comprobar: `C:\Users\TiendaOP\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe`. Imports y tres `__init__` vacíos revisados; sin config pytest/conftest de proyecto ni ascendientes revisados. Contexto llamador prec=2, ROUND_DOWN/HALF_EVEN, Emin=-2/Emax=2, capitals=0/clamp=1, traps y flags preestablecidos: resultados exactos incluidos precio 1000000000000.01 y vectores T4; todos los parámetros/traps/flags e identidad del contexto intactos ante éxito/errores de precio/porcentaje/límite técnico. Context privado completo con precisión derivada del producto y precio al centavo, MIN_EMIN/MAX_EMAX, flags propios y traps de exactitud; solo comisión admite ROUND_HALF_UP. MAX_PREC se verifica antes de aritmética/asignación gigante; DecimalException→ValueError español contractual, sin máximo comercial ni setcontext. Ceros con exponente MAX_EMAX siguen representables sin cambiar entradas. Solo dos archivos productivos y evidencia T5; sin DB/API/dependencias/configuración/suite global ni caches generadas. T6 pendiente. |
| T6 | Verificación final; sin rojo artificial ni tests/código adicionales. AST y aislamiento: OK, salida 0 | Suite completa aislada: `167 passed in 0.12s`, salida 0; 0 casos nuevos, 167 de regresión | Desde `backend`: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_dinero_cortes_aislado.py -q`. Python 3.11.9, ejecutable existente `C:\Users\TiendaOP\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe`. Script inline `PYTHONDONTWRITEBYTECODE=1 python -` con ast/pathlib/hashlib/sys: tres __init__ vacíos; ninguna config pytest/conftest en backend ni ascendientes hasta raíz; producto importa solo decimal, test solo decimal/pytest/módulo puro; tres firmas públicas exactas, 3 funciones de producto y 25 de test con type hints, 13 mensajes contractuales españoles. Sin float/conversiones/estado global/efectos de módulo; cuatro literales float exclusivamente en casos de rechazo no-Decimal (líneas 67/116/195/249), no aritmética de negocio. Revisión de pureza, preservación de entradas/contexto, precisión derivada y resto exacto coherente con tests. SHA256 antes/después de ejecución iguales: producto `a25b1e7856b3de4b7c272360fbfe386990c39a5aa3eec5ab7de91ec8ed624648`, test `ee660625ba657fd2c27fddc491052ddc74d81f064e40c648050e33001f94edc3`. `git status --short`, `git diff --name-only`, `git ls-files --others --exclude-standard backend` y `git diff --check`: solo dos archivos productivos nuevos del paquete; cambios ajenos en coordinator/MEMORY/constitution y spec/plan preservados. Advertencias Git LF→CRLF, sin errores de whitespace. T6 modifica únicamente este documento; sin DB/API/dependencias/configuración/suite global ni caches generadas. |

## Criterio de cierre y continuidad

Revisión de cierre independiente por `sdd-reviewer`: **APROBADO PAQUETE 1**, sin bloqueantes dentro del alcance. Verificó imports/configuración y ejecutó el comando aislado: `167 passed in 0.13s`. Los rojos previos constan como evidencia registrada durante implementación, no como fallos reproducidos por la revisión final. No se accedió a DB ni se ejecutó la suite global.

Completar este paquete aporta funciones puras comprobadas, **no** registro de cortes mejorado, pagos, API, offline, migración ni sincronización. Mantener el contrato global de 57 RF/6 RNF como pendiente de implementación integral. La siguiente división se propone después de medir este paquete y necesita aprobación; no añadir tareas posteriores por iniciativa del implementador.

Cierre T6: paquete monetario en verde, con cobertura parcial RF-3/RF-4/RF-41/RNF-1 y verificación RNF-6; no se declara implementada la spec completa. Se solicita al coordinador la validación independiente con reviewer y la decisión del usuario sobre el siguiente paso. Ejecución detenida, sin redactar ni implementar paquetes adicionales.

---

## Paquete 2 — Fundaciones de registro (dinero conectado + UoW única)

Estado: **tareas redactadas, pendientes de aprobación para implementar**. Paquete 1 (T1–T6) cerrado, no rehacer.

Aprobación recibida: revisión de simplificación aprobada por el usuario y alcance del paquete 2 aprobado para redactar tareas. No se autoriza implementación por esta redacción.

### Alcance y límites

- Siete tareas de 20–30 minutos: estimación 3–4 horas. Si una tarea excede, reducir/reproponer antes de continuar.
- Cobertura **parcial**: RF-3/RF-4/RF-5 (registro con dinero exacto y snapshot aplicado), RF-41 (validación de entrada de precio/porcentaje), RF-32 (una sola escritura por operación), RNF-1 (redondeo real) y RNF-3 (compatibilidad legacy + esqueleto Alembic). No afirma movimientos, saldos, edición/anulación, sync/offline ni cumplimiento integral.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - M `backend/app/services/corte_service.py`.
  - M `backend/app/routers/cortes.py` (solo commit de la UoW en registro).
  - M `backend/app/routers/sync.py` (solo commit de la UoW en `crear_corte`; hoy persiste gracias al commit interno del servicio).
  - M `backend/app/schemas/usuario.py` (solo validador de porcentaje).
  - C `backend/alembic.ini`, C `backend/alembic/env.py`, C `backend/alembic/script.py.mako`, C `backend/alembic/versions/001_base_legacy.py` (base solo-inspección, sin secretos ni URL real).
  - M `backend/tests/test_cortes.py` (solo assertions a Decimal exacto, sin cambiar fixtures).
- Prohibido en este paquete: modificar `dinero_cortes.py` y su test (cerrados, solo reutilizar); tocar el DTO personal `CorteResponse` (gate `parte_barberia`/privacidad de plan §11.2, detenido hasta aclaración); tocar `create_all`/`main.py`/`database.py` (gate 9, suite actual dependiente); frontend, movimientos, cierres, outbox, cifrado, barrera global y escritura dual.
- Colisión de nombres conocida: `corte_service.calcular_partes` (redondeo del contexto, ambas partes quantizadas) vs `dinero_cortes.calcular_partes` (contrato del paquete 1). T7 la resuelve importando el puro y eliminando el duplicado.
- Precaución DB real: `app/main.py:22` ejecuta `create_all` sobre `backend/barberia.db` al importar, y los tests por archivo importan la app. Antes de cada ejecución registrar hash/tamaño de `backend/barberia.db`; al terminar verificar que no cambió su contenido (solo `create_all` idempotente sobre tablas existentes) y que `git status` no muestra más que los archivos autorizados (`*.db` está ignorado). Prohibido `pytest tests/` global y prohibido cualquier `upgrade` Alembic contra base real.

Comandos desde `backend` en bash:

```bash
# Regresión del paquete 1 (aislado, sin app ni DB)
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_dinero_cortes_aislado.py -q
# Tests por archivo del paquete 2 (importan la app; ver precaución DB real arriba)
python -m pytest tests/test_cortes.py -q
python -m pytest tests/test_sync_roles.py tests/test_roles_permisos.py -q
```

### Tareas en orden de dependencia

- [x] **T7. Conectar el reparto puro al registro y eliminar el duplicado.** RF-3/RF-4 (parciales), RNF-1.
  - Dependencias: ninguna dentro del paquete; reutiliza `dinero_cortes` cerrado sin modificarlo.
  - Tests primero: POST `/cortes/` con servicio 100.00 y barbero 50% responde `"50.00"`/`"50.00"` exactos; caso servicio 0.05 al 50% → `0.03`/`0.02` (ROUND_HALF_UP y resto exacto, no HALF_EVEN ni doble quantize).
  - Implementar: `crear_corte` usa `dinero_cortes.calcular_partes`; eliminar el `calcular_partes` local de `corte_service.py`.
  - Hecho cuando: tests nuevos en verde, suite aislada del paquete 1 sigue en 167 verdes y el registro real usa el contrato puro.

- [x] **T8. Validar precio canónico y porcentaje a la entrada del registro.** RF-41 (parcial).
  - Dependencias: T7.
  - Tests primero: servicio con precio/porcentaje de precisión excesiva se rechaza con `ValueError` en español (el router lo vuelve 400); un float infiltrado también se rechaza como `ValueError`, nunca `TypeError` (500). Hallazgo: a nivel API con filas persistidas no se puede provocar, porque el ORM redondea a escala 2 al leer `Numeric` (verificado: raw 10.005 → ORM `Decimal('10.01')`); por eso la prueba es a nivel servicio con objetos transient. El rechazo en la carga del catálogo (`schemas/servicio.py`) excede los archivos autorizados y queda como decisión pendiente del usuario.
  - Implementar: `crear_corte` envuelve `(TypeError, ValueError)` de `calcular_partes` en `ValueError` con el mismo mensaje (el router ya mapea a 400); el guard de precisión lo aporta T7.
  - Hecho cuando: entradas inválidas rechazadas con mensaje exacto y las válidas conservan identidad/escala.

- [x] **T8-bis. Validar precio en la carga del catálogo (extensión aprobada).** RF-41.
  - El usuario delegó la decisión pendiente de T8: se incluye la extensión mínima (un archivo: `schemas/servicio.py`).
  - Tests primero: `ServicioCrear`/`ServicioActualizar` con `"10.005"` pasaban (rojo `DID NOT RAISE`); válidos `"100.00"`/`"0.05"` conservan representación.
  - Implementar: `field_validator("precio")` en Crear/Actualizar (no en Base/Response): finito y ≤2 decimales, mensajes en español; la positividad sigue en `Field(gt=0)`; el router devuelve 422 automáticamente.
  - Hecho cuando: precisión excesiva rechazada en la entrada del catálogo y el resto de suites sigue verde.

- [x] **T9. Unidad de trabajo única: quitar el commit interno.** RF-32 (una escritura por operación), RNF-3.
  - Dependencias: T7 (mismo archivo).
  - Tests primero: POST `/cortes/` persiste el corte; `sync` con `crear_corte` persiste (hoy depende del commit interno del servicio).
  - Implementar: retirar `db.commit()` de `corte_service.py` (conservar `flush`/`refresh` necesarios); commitean `routers/cortes.py` y `routers/sync.py`. Verificar con grep que `services/corte_service.py` no contiene `commit`.
  - Hecho cuando: ambos caminos persisten con un solo commit por operación y `test_cortes.py` + `test_sync_roles.py` pasan.

- [x] **T10. Validador de porcentaje en el schema de usuario.** RF-41 (parcial).
  - Dependencias: ninguna (archivo distinto); reutiliza `validar_porcentaje` sin duplicar reglas.
  - Tests primero: crear/actualizar usuario con 100.001 o `50.000` → 422; 50.25 y 100 pasan sin normalización.
  - Hecho cuando: el schema rechaza precisión/rango inválidos con mensaje en español y los válidos conservan representación.

- [x] **T11. Snapshot aplicado del registro (RF-5 parcial).** RF-5 (parcial).
  - Dependencias: T7–T8.
  - Tests primero: el corte creado conserva `precio`, `porcentaje_barbero`, `parte_barbero`, `parte_barberia` iguales a los valores validados/aplicados; cambiar después el porcentaje del barbero no altera el corte existente.
  - Hecho cuando: tests verdes sin agregar columnas nuevas (las columnas ya existen) y sin exponer nada nuevo en el DTO personal.

- [x] **T12. Esqueleto Alembic y base solo-inspección.** RNF-3.
  - Dependencias: ninguna (archivos nuevos).
  - Crear `alembic.ini` (sin URL real ni secretos), `env.py` (no importa `app.main`, no abre DB), `script.py.mako` y `versions/001_base_legacy.py` que solo inspecciona el schema existente y se detiene ante diferencias, sin crear ni modificar nada.
  - Hecho cuando: `alembic history` muestra la base sin errores ni conexión a base real; prohibido ejecutar `upgrade` contra cualquier base real en este paquete.

- [x] **T13. Regresión exacta y cierre del paquete.** RF-3/RF-4/RF-5/RF-41 (parciales), RNF-1/RNF-3/RNF-6.
  - Dependencias: T7–T12.
  - Convertir las assertions con `float()` de `test_cortes.py` a comparación Decimal exacta (`"50.00"`); ejecutar por archivo `test_cortes.py`, `test_sync_roles.py`, `test_roles_permisos.py` y la suite aislada del paquete 1, todo en verde, con precaución DB real registrada.
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 3, API nueva, sync ni frontend.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Cierre del paquete 2 (revisión independiente)

`sdd-reviewer`: **APROBADO PAQUETE 2**, sin correcciones bloqueantes. Verificó `tasks.md`, diff `dev...HEAD` y los 12 archivos; reejecutó la suite aislada (`167 passed`). Confirmó "Hecho cuando" T7–T13+T8-bis, cobertura declarada parcial sin overclaim, gates §11 intactos (DTO personal, `create_all`, sin upgrade real, sin sync/frontend/movimientos, `dinero_cortes` intacto) y constitución. Observaciones P2 no bloqueantes para paquetes futuros: falta `db.rollback()` en rutas de error; fallback silencioso preexistente de `metodo_pago` a `EFECTIVO` en `sync.py:119-122`; stub `_DbNula` no reutilizable en caminos exitosos; coerción float→Decimal de Pydantic 2.5.2 no verificada (cubierta por guard T8). El cierre no autoriza paquete 3 ni declara la spec implementada.

### Evidencia futura (paquete 2)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T7 | Rojo real: `1 failed, 2 passed`; `AssertionError: assert '0.02' == '0.03'` en `test_crear_corte_redondeo_matematico_mitad_hacia_arriba` (quantize del contexto HALF_EVEN antes del fix) | Verde: `3 passed` en `tests/test_cortes.py` + `167 passed` suite aislada paquete 1 | Desde `backend`: `python -m pytest tests/test_cortes.py -q` y comando aislado del paquete 1. `barberia.db` hash idéntico antes/después (`3fe8caa6…f924a9`); `git status` solo `corte_service.py` + `test_cortes.py`. Cambio: `crear_corte` importa `dinero_cortes.calcular_partes`, eliminado duplicado local e import Decimal sin uso. |
| T8 | Rojo parcial real: 2 API-tests iniciales devolvían 201 (supuesto falso: el ORM oculta el exceso al leer); reescritos a nivel servicio. Tras reescribir: 5 passed + 1 failed con `TypeError: El precio del servicio debe ser Decimal` (habría sido 500) | Verde: `6 passed` en `tests/test_cortes.py` + `167 passed` aislada | Desde `backend`: `python -m pytest tests/test_cortes.py -q`. Sonda SQLite en TEMP (sin tocar repo): raw conserva 10.005/50.001, ORM devuelve `Decimal('10.01')`/`Decimal('50.00')`. `barberia.db` hash idéntico (`3fe8caa6…f924a9`); solo `corte_service.py` + `test_cortes.py`. Cambio: wrap `(TypeError, ValueError)` → `ValueError` mismo mensaje. Pendiente decisión usuario: validación en carga de catálogo (`schemas/servicio.py`, fuera de autorizados). |
| T9 | Rojo real: la otra conexión SÍ veía el corte (`assert <Corte object> is None` falló) porque el servicio commiteaba | Verde: `10 passed` (`test_cortes.py` + `test_sync_roles.py`) + `167 passed` aislada | Desde `backend`: `python -m pytest tests/test_cortes.py tests/test_sync_roles.py -q`. `barberia.db` hash idéntico (`3fe8caa6…f924a9`); grep confirma cero `db.commit` en `corte_service.py`. Cambio: servicio con `flush`+`refresh` sin commit; commitean `routers/cortes.py` (+refresh) y `routers/sync.py` por operación. Solo archivos autorizados. |
| T10 | Rojo real: `Failed: DID NOT RAISE ValidationError` para `'50.000'`/50.001 (rango válido, precisión excesiva aceptada) | Verde: `39 passed` (`test_cortes.py` + `test_sync_roles.py` + `test_roles_permisos.py` + `test_usuarios_auditoria.py`) + `167 passed` aislada | Desde `backend`: pytest por archivo. `barberia.db` hash idéntico (`3fe8caa6…f924a9`); solo `schemas/usuario.py` + `test_cortes.py`. Cambio: `field_validator` en `UsuarioCrear`/`UsuarioActualizar` reutilizando `validar_porcentaje` (TypeError→ValueError); `UsuarioResponse` intacto. Tests a nivel schema (sin DB). |
| T11 | Verde inicial real: `10 passed` incluyendo el test nuevo (código T7–T8 ya conservaba el snapshot; sin rojo artificial ni cambio de implementación) | Mismo verde, única ejecución | Desde `backend`: `python -m pytest tests/test_cortes.py -q`. Test: corte 100.00/50% conserva `100.00`/`50.00`/`50.00` tras subir el porcentaje a 60. Sin columnas nuevas ni cambios al DTO personal. `barberia.db` sin cambios de contenido; solo `test_cortes.py` + este documento. |
| T12 | Rojo real: `No config file 'alembic.ini' found` y `alembic: command not found` (se usa `python -m alembic`; 1.13.0 instalado) | Verde: `history` muestra `001_base_legacy`; `upgrade head` en TEMP vacía no crea tablas de app (solo `alembic_version`); en TEMP con legacy informa `schema legacy completo (9 tablas)` | `alembic.ini` con placeholder inerte + override `ALEMBIC_SQLALCHEMY_URL`; `env.py` no importa `app.main`. `barberia.db` hash idéntico (`3fe8caa6…f924a9`); prohibido `upgrade` contra base real. Solo 4 archivos nuevos. |
| T8-bis | Rojo real: `DID NOT RAISE ValidationError` para `"10.005"` en Crear/Actualizar | Verde: suite completa por archivo (`42 + 2 + 8 + 10 + 2`) + `167 passed` aislada | `field_validator("precio")` solo en entrada; `barberia.db` hash idéntico; `git status` solo `schemas/servicio.py` + `test_cortes.py` + este documento. |
| T13 | Sin rojo: conversión directa de 2 assertions `float()` a strings exactos en el test legacy | Verde: `36 passed` (`test_cortes.py` + `test_sync_roles.py` + `test_roles_permisos.py`) + `4 passed` extra (`test_usuarios_auditoria.py`) + `167 passed` aislada | Desde `backend`: pytest por archivo (comandos del paquete). `barberia.db` hash idéntico (`3fe8caa6…f924a9`); `git status` solo `test_cortes.py` + este documento. Paquete 2 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 3. |

---

## Paquete 3 — Contratos personales sin parte de la barbería (cierre del gate §11.2)

Estado: **tareas redactadas, pendientes de aprobación para implementar**. Paquetes 1 y 2 cerrados, no rehacer.

Aprobación recibida: el usuario aprueba corregir (no documentar excepción) y redactar estas tareas. No se autoriza implementación por esta redacción.

Decisión del gate registrada: se crea el DTO personal `CortePersonal` (= `CorteResponse` sin `parte_barberia`) y lo usan los 3 endpoints personales. El listado global de admin (`GET /cortes/`) y reportes conservan el contrato completo. El detalle compartido `GET /{id}` pasa al DTO personal para ambos roles: el admin conserva listado global + reportes para ver la parte de la barbería. Sin versionado de API: no existen consumidores externos (único cliente: la PWA propia).

### Alcance y límites

- Seis tareas de 20–30 minutos: estimación 2–3 horas.
- Cobertura **parcial**: RF-11 (shape del historial propio), RF-14 (404 ajeno, regresión), RF-15 (sin brutos del negocio), RNF-3 (compat admin intacta), RNF-5, RNF-6. No afirma movimientos, saldos, sync/offline, jornadas ni cumplimiento integral.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - M `backend/app/schemas/corte.py` (solo agregar `CortePersonal`; `CorteResponse` intacto).
  - M `backend/app/routers/cortes.py` (solo `response_model` de `/mi/historial`, `/{id}` y `POST /`).
  - M `backend/tests/test_cortes.py` (solo tests nuevos de privacidad).
  - M `frontend/src/services/db.ts` (solo tipo local `CorteLocal`).
  - M `frontend/src/pages/RegistroCortes.tsx` (solo retirar el cálculo local de `parte_barberia` offline; `parte_barbero` se conserva).
- Prohibido: tocar `CorteResponse`, endpoints admin, reportes, modelos, servicios, sync, resto del frontend, migraciones y `create_all`.
- Precaución DB real vigente (igual que paquete 2): `main.py:22` ejecuta `create_all` al importar; registrar hash de `backend/barberia.db` antes/después, pytest solo por archivo, prohibido `pytest tests/` global.
- Verificación frontend: `npm run build` en `frontend/` (tsc + vite).

### Tareas en orden de dependencia

- [x] **T14. Crear el DTO personal sin parte de la barbería.** RF-11/RF-15 (parciales), RNF-3.
  - Dependencias: ninguna dentro del paquete.
  - Tests primero: `CortePersonal` acepta un corte completo y su `.model_dump()` no contiene `parte_barberia`; `CorteResponse` sigue intacto con el campo (compat admin).
  - Implementar: agregar `CortePersonal` en `schemas/corte.py` (mismos campos menos `parte_barberia`); no modificar `CorteResponse`.
  - Hecho cuando: tests schema-level en verde sin DB y el contrato admin no cambia.

- [x] **T15. Historial propio con DTO personal.** RF-11/RF-15 (parciales).
  - Dependencias: T14.
  - Tests primero: `GET /mi/historial` como barbero no incluye `parte_barberia` en ningún ítem y sí incluye `parte_barbero`, servicio, momento real, método y estados; como admin en `/mi/historial` ve solo lo propio.
  - Implementar: `response_model=list[CortePersonal]` en `mis_cortes`.
  - Hecho cuando: tests API en verde y el listado global de admin sigue devolviendo el contrato completo.

- [x] **T16. Detalle y registro con DTO personal.** RF-11/RF-14/RF-15 (parciales).
  - Dependencias: T14.
  - Tests primero: `GET /{id}` propio y `POST /` responden sin `parte_barberia`; `GET /{id}` ajeno como barbero sigue 404 (regresión RF-14); el admin conserva listado global + reportes para la parte de la barbería (decisión registrada arriba).
  - Implementar: `response_model=CortePersonal` en `obtener_corte` y `registrar_corte`.
  - Hecho cuando: tests API en verde, 404 ajeno intacto y ningún endpoint admin modificado.

- [x] **T17. Test de privacidad integral de contratos personales.** RF-15 (parcial), RNF-5/RNF-6.
  - Dependencias: T15–T16.
  - Tests primero (deben fallar si algún campo prohibido aparece): recorrer las respuestas de `/mi/historial`, `/{id}` propio, `POST /` y resúmenes `/mi/resumen/*` y afirmar ausencia de `parte_barberia`, `costo`, `margen`, `bruto`, `total_cortes` globales o datos de otro barbero.
  - Hecho cuando: el test falla ante cualquier filtración futura y pasa con los contratos del paquete; sin cambiar código productivo en esta tarea salvo lo necesario para el test.

- [x] **T18. Limpiar la parte local de la barbería en el frontend.** RF-15 (parcial), RNF-1.
  - Dependencias: T15–T16 (el backend ya no la envía).
  - Verificar primero con grep que nada renderiza `parte_barberia` en vistas de barbero (constatado: solo cálculo local + tipos).
  - Implementar: retirar el cálculo de `parte_barberia` en el guardado offline de `RegistroCortes.tsx` (conservar `parte_barbero` estimada) y el campo en `CorteLocal` (`db.ts`) si nada más lo lee; el tipo de admin (`DashboardAdmin.tsx`) no se toca.
  - Hecho cuando: `npm run build` en verde y ningún código de barbero referencia `parte_barberia`.

- [x] **T19. Regresión y cierre del paquete.** RF-11/RF-14/RF-15 (parciales), RNF-3/RNF-5/RNF-6.
  - Dependencias: T14–T18.
  - Ejecutar por archivo las suites tocadas (`test_cortes.py`, `test_roles_permisos.py`, `test_sync_roles.py`, `test_usuarios_auditoria.py`) + suite aislada del paquete 1, todo en verde, con precaución DB real registrada; `npm run build` en verde.
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 4 ni declara el gate de otros paquetes.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Evidencia futura (paquete 3)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T14 | Rojo real: `ImportError: cannot import name 'CortePersonal'` | Verde: `14 passed` en `tests/test_cortes.py` | Desde `backend`: `python -m pytest tests/test_cortes.py -q`. Schema-level sin DB; `barberia.db` hash idéntico (`3fe8caa6…f924a9`); solo `schemas/corte.py` + `test_cortes.py`. Cambio: `CortePersonal` agregado, `CorteResponse` intacto. |
| T15 | Rojo real: 2 failed (`"parte_barberia" not in items[0]` con `CorteResponse`) | Verde: `39 passed` (`test_cortes.py` + `test_roles_permisos.py`) | Desde `backend`: pytest por archivo. `barberia.db` hash idéntico; solo `routers/cortes.py` + `test_cortes.py`. Cambio: `response_model=list[CortePersonal]` en `mis_cortes`; listado global admin intacto. |
| T16 | Rojo real: ausencia de `parte_barberia` falló en detalle/registro con `CorteResponse` | Verde: `44 passed` (3 archivos) | Efecto colateral honesto: 4 assertions viejas (T7/T11/legacy) esperaban el campo en la API y se migraron al contrato nuevo (el resto exacto se verifica en fila DB + suite aislada). `barberia.db` hash idéntico; solo `routers/cortes.py` + `test_cortes.py`. Cambio: `response_model=CortePersonal` en detalle y registro; 404 ajeno intacto; admin conserva listado + reportes. |
| T17 | Verde inicial real: contratos ya limpios tras T15–T16 (sin rojo artificial ni cambio productivo) | Mismo verde | Sensibilidad del detector verificada una vez sin commitear: detecta `parte_barberia` en `CorteResponse` (contrato admin). Recorre registro/historial/detalle/3 resúmenes. Solo `test_cortes.py` + este documento. |
| T18 | Rojo: grep hallaba `parte_barberia` en `db.ts` y `RegistroCortes.tsx` (código de barbero) | Verde: `npm run build` (tsc + vite) OK; grep limpio en código de barbero | Retirados cálculo offline y campo `CorteLocal`; tipo de admin intacto; filas Dexie viejas con el campo se ignoran sin migrar (propiedad extra tolerada). Solo `db.ts` + `RegistroCortes.tsx` + este documento. |
| T19 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde: `49 + 2 + 8 + 10 + 2` por archivo (toda la suite backend) + `167 passed` aislada + `npm run build` OK | `barberia.db` hash idéntico (`3fe8caa6…f924a9`); `git status` solo este documento. Paquete 3 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 4. |

### Cierre del paquete 3 (revisión independiente)

`sdd-reviewer`: **APROBADO PAQUETE 3**, sin correcciones (ningún P1; no tocó archivos). Verificó "Hecho cuando" T14–T19, cobertura parcial sin overclaim, gate §11.2 cerrado respetando la decisión registrada (detalle compartido a DTO personal; admin conserva listado + reportes; sin versionado por no haber consumidores externos), constitución (Decimal, % solo servicios, privacidad, compat admin) y legitimidad de la migración de assertions viejas (resto exacto en fila DB + suite aislada). Reejecutó: `test_cortes.py` 19 passed, resto 30 passed, aislada 167 passed, `npm run build` OK, hash DB idéntico. P2 informativos para futuro: T17 no asserts explícitos de totales globales; `Math.round` float preexistente en estimada offline (`RegistroCortes.tsx:81`, corresponde a paquete frontend); P2 del paquete 2 vigentes. El cierre no autoriza paquete 4 ni declara la spec implementada.

---

## Paquete 4 — Registro online: destino y momento real

Estado: **tareas redactadas, pendientes de aprobación para implementar**. Paquetes 1–3 cerrados, no rehacer.

Aprobación recibida: alcance aprobado por el usuario (RF-1/RF-2/RF-8/RF-10 online). No se autoriza implementación por esta redacción.

### Alcance y límites

- Seis tareas de 20–30 minutos: estimación 2–3 horas.
- Cobertura **parcial**: RF-1 (registro propio con servicio/método), RF-2 (destino admin), RF-8 (momento automático barbero), RF-10 (retroactivo admin con valores actuales), RF-56 (destino inactivo permitido si existe con porcentaje). No afirma offline/sync, momentos al sincronizar (RF-9), comisión estimada (RF-7), ni cumplimiento integral.
- Decisiones registradas:
  - `barbero_id` opcional en el body, **solo admin**; si lo envía un barbero → 403 (no silencioso). Destino inexistente → 404. Destino inactivo permitido si existe con porcentaje (RF-56); sin porcentaje recuperable → 400.
  - `momento_real` opcional, **solo admin**; pasado sin límite, futuro → 400. Si lo envía un barbero → 400 (RF-8: sin fecha manual). Nunca precio/porcentaje manual en este flujo (fuera de alcance de la spec).
  - El momento se guarda en `Corte.fecha` (UTC naive, contrato existente; RNF-2 pleno con zona/jornadas corresponde a paquete de jornadas).
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - M `backend/app/schemas/corte.py` (solo campos `barbero_id`/`momento_real` opcionales en `CorteCrear`).
  - M `backend/app/services/corte_service.py` (solo destino + momento en `crear_corte`).
  - M `backend/app/routers/cortes.py` (solo autorización destino/momento en `registrar_corte`).
  - M `backend/tests/test_cortes.py` (solo tests nuevos).
- Prohibido: DTOs de respuesta, endpoints admin existentes, sync, frontend, modelos nuevos, migraciones, `create_all`.
- Precaución DB real vigente: hash de `backend/barberia.db` antes/después, pytest solo por archivo, prohibido `pytest tests/` global.

### Tareas en orden de dependencia

- [x] **T20. Destino admin en el registro.** RF-1/RF-2 (parciales), RF-56 (parcial).
  - Dependencias: ninguna dentro del paquete.
  - Tests primero: admin registra con `barbero_id` de otro → 201 asociado al destino con su porcentaje; `barbero_id` inexistente → 404; barbero que envía `barbero_id` (incluso propio) → 403; destino inactivo con porcentaje → 201.
  - Implementar: `barbero_id: Optional[int]` en `CorteCrear`; `crear_corte` resuelve destinatario (propio por defecto); router exige rol admin si viene destino.
  - Hecho cuando: tests API en verde y el registro propio del barbero no cambia de comportamiento.

- [x] **T21. Momento retroactivo solo admin.** RF-8/RF-10 (parciales).
  - Dependencias: T20 (mismo flujo de registro).
  - Tests primero: admin registra con `momento_real` pasado → 201 con esa `fecha`; futuro → 400; barbero que envía `momento_real` → 400; sin momento → `fecha` automática (≈ ahora UTC).
  - Implementar: `momento_real: Optional[datetime]` en `CorteCrear`; validación pasado/futuro; el servicio usa el momento o el automático.
  - Hecho cuando: tests API en verde, sin precio/porcentaje manual en ningún caso.

- [x] **T22. Snapshot con valores actuales del destinatario.** RF-5 (parcial), RF-6.
  - Dependencias: T20–T21.
  - Tests primero: admin registra retroactivo para barbero con % distinto → reparto con el porcentaje **actual del destinatario**, no del admin; cambio posterior de catálogo/porcentaje no altera el corte (ya probado en T11, regresión).
  - Implementar: verificar que el reparto usa precio actual del servicio + porcentaje actual del destinatario (el código ya lo hace; ajustar solo si un test revela lo contrario, sin rojo artificial).
  - Hecho cuando: tests verdes que fijan destinatario-valores-actuales para propio, admin-propio y admin-tercero.

- [x] **T23. Errores exactos y sin filtraciones.** RF-14 (regresión), RNF-5.
  - Dependencias: T20–T21.
  - Tests primero: destino inexistente → 404 idéntico a corte inexistente (sin revelar existencia); `barbero_id` de barbero por barbero → 403; `momento_real` futuro por admin → 400 con mensaje en español; cuerpo con tipos inválidos → 422.
  - Hecho cuando: cada rechazo con su código exacto y sin datos ajenos en mensajes.

- [x] **T24. Regresión de contratos personales.** RF-11/RF-15 (regresión).
  - Dependencias: T20–T23.
  - Tests: historial/detalle/registro con destino y momento responden sin `parte_barberia` (reutilizar detector T17); listado global admin intacto con contrato completo.
  - Hecho cuando: verdes sin cambios productivos nuevos salvo ajustes exigidos por un rojo real.

- [x] **T25. Regresión total y cierre del paquete.** RF-1/RF-2/RF-8/RF-10/RF-56 (parciales), RNF-3/RNF-6.
  - Dependencias: T20–T24.
  - Ejecutar por archivo las suites tocadas + suite aislada del paquete 1, todo en verde, con precaución DB real registrada.
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 5.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Evidencia futura (paquete 4)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T20 | Rojo real: 4 failed (el body ignoraba `barbero_id`; sin 403/404) | Verde: `26 passed` (`test_cortes.py` + `test_sync_roles.py`) | Desde `backend`: pytest por archivo. `barberia.db` hash idéntico; solo `schemas/corte.py` + `corte_service.py` + `routers/cortes.py` + `test_cortes.py`. Cambio: `barbero_id` opcional solo admin (403 barbero, 404 inexistente, inactivo con % permitido); reparto con valores del destinatario; registro propio intacto; sync sin destino sigue propio. Seguimiento P2-1 (decisión del usuario: restringir a barberos): admin→otro admin → 400, propio explícito → 201; rama `fix/destino-solo-barberos`. |
| T21 | Rojo real: 3 failed (momento ignorado: 201 con fecha automática en vez de 2020; sin 400 a futuro ni a barbero) | Verde: `30 passed` (`test_cortes.py` + `test_sync_roles.py`) | Desde `backend`: pytest por archivo. `barberia.db` hash idéntico; solo `schemas/corte.py` + `corte_service.py` + `routers/cortes.py` + `test_cortes.py`. Cambio: `momento_real` opcional solo admin (pasado sin límite, futuro 400, barbero 400, tz normalizada a UTC naive); servicio lo guarda en `fecha`. |
| T22 | Verde inicial real (cubierto por implementación T20; sin rojo artificial ni cambio productivo) | Mismo verde | Test: admin retroactivo 2021 para barbero 30% sobre 200.00 → `60.00` + fecha conservada (no el 0% del admin). Solo `test_cortes.py` + este documento. |
| T23 | Verde inicial real (cubierto por T20–T21; sin rojo artificial ni cambio productivo) | Mismo verde | Test: 404 `Barbero no encontrado`, 403 con `admin`, 400 con `futuro`, 422 en tipos inválidos; sin datos ajenos. Solo `test_cortes.py` + este documento. |
| T24 | Verde inicial real (detector T17 + listado admin intactos; sin rojo artificial ni cambio productivo) | Mismo verde | Test nuevo: listado global admin conserva `parte_barberia`. Solo `test_cortes.py` + este documento. |
| T25 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde: `60 + 2 + 8 + 10 + 2` por archivo (toda la suite backend) + `167 passed` aislada | `barberia.db` hash idéntico (`3fe8caa6…f924a9`); `git status` solo este documento. Paquete 4 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 5. |

### Cierre del paquete 4 (revisión independiente)

`sdd-reviewer`: **APROBADO PAQUETE 4**, sin P1 ni archivos tocados. Verificó "Hecho cuando" T20–T25, cobertura parcial sin overclaim, constitución (Decimal, % solo servicios, privacidad, compat: sync y DTOs intactos) y legitimidad de verdes iniciales. Reejecutó: 30 + 30 + 22 + 167 verdes, hash DB idéntico. P2 para futuro: (1) no se valida `destino.rol` — un admin podría atribuir un corte a otro admin; RF-2 dice "cualquier barbero", requiere decisión de spec, no corrección unilateral; (2) sin `rollback()` en rutas de error (heredado); (3) imprecisión menor de redacción en evidencia T23. El cierre no autoriza paquete 5 ni declara la spec implementada.

---

## Paquete 5 — Idempotencia y reintentos seguros

Estado: **implementado (T26–T33 en verde) y aprobado por `sdd-reviewer`; pendiente integración a `dev` vía PR**. Paquetes 1–4 cerrados, no rehacer.

Aprobación recibida: alcance aprobado por el usuario (RF-32 + base RF-30). No se autoriza implementación por esta redacción.

### Alcance y límites

- Ocho tareas de 20–30 minutos: estimación 3–4 horas.
- Cobertura **parcial**: RF-32 (sin duplicados ante reintento), RF-30 (resultado individual por operación), RF-57 (resultado conservado por operación, parcial). No afirma offline/outbox frontend, revisión/dependientes, movimientos, jornadas ni cumplimiento integral.
- Decisiones registradas:
  - Clave idempotente = `(actor_id, namespace_cliente, operacion_id)`; `operacion_id` es UUID cliente obligatoria solo cuando se usa el camino idempotente.
  - `operacion_uuid` opcional en `CorteCrear`; sin UUID → camino legacy intacto (RNF-3). Namespace por defecto `"web"` en POST directo; sync aportará el suyo (paquete de sync).
  - Misma clave + mismo hash → acuse guardado sin reejecutar. Misma clave + hash distinto → 409 conflicto de identidad, sin efecto.
  - Solo estado terminal en este paquete (`aceptada`/`rechazada`); revisión/dependientes corresponden a paquetes posteriores.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - C `backend/app/models/operacion_corte.py` (solo tabla mínima de journal idempotente).
  - M `backend/app/models/__init__.py` (solo registro del modelo).
  - C `backend/app/services/operacion_corte_service.py` (solo ejecutor get-or-create + hash).
  - M `backend/app/services/corte_service.py` (solo delegar en el ejecutor cuando hay UUID; camino sin UUID intacto).
  - M `backend/app/routers/cortes.py` (solo pasar UUID/namespace al servicio).
  - M `backend/app/routers/sync.py` (solo aceptar `operacion_uuid` opcional en datos de `crear_corte`; sin él, comportamiento legacy documentado sin promesa de deduplicación retroactiva).
  - C `backend/alembic/versions/002_operaciones_corte.py` (solo crea la tabla nueva; idempotente; sin tocar legacy).
  - M `backend/tests/test_cortes.py` (solo tests nuevos).
- Prohibido: modificar tablas/columnas legacy, DTOs de respuesta, otros routers/servicios, frontend, `create_all`, estados no terminales.
- **Gate de migración real**: el archivo de migración es código (seguro commitear); APLICAR `upgrade` contra `barberia.db` u otra base real exige aprobación explícita + backup verificado/restaurable + validación previa en copia temporal (plan §4). Durante el paquete, `upgrade` solo contra DBs temporales (`ALEMBIC_SQLALCHEMY_URL`); los tests usan sus DBs locales como siempre. Hash de `barberia.db` antes/después de cada ejecución.

### Tareas en orden de dependencia

- [x] **T26. Tabla mínima de journal idempotente + migración 002.** RF-32 (base), RNF-3.
  - Dependencias: ninguna dentro del paquete.
  - Tests primero: `alembic history` muestra `002` tras `001`; `upgrade head` en TEMP vacía crea solo `operaciones_corte` (+ `alembic_version`); en TEMP con legacy no toca tablas existentes; repetir `upgrade` es no-op.
  - Implementar: modelo `OperacionCorte` (actor_id, namespace_cliente, operacion_id UUID, accion, hash, modo_captura, estado, resultado JSON, recibida_en UTC; única la tupla clave) + revisión `002_operaciones_corte.py` solo-creación.
  - Hecho cuando: ambos escenarios TEMP verificados y prohibido aplicar contra base real en este paquete.

- [x] **T27. Ejecutor idempotente (get-or-create + hash).** RF-32 (parcial).
  - Dependencias: T26.
  - Tests primero: primera ejecución con clave+hash crea y devuelve resultado; segunda con misma clave + mismo hash devuelve el acuse guardado sin reejecutar (el efecto ocurre una sola vez: un solo corte en DB).
  - Implementar: `operacion_corte_service.ejecutar` (lookup por clave; si existe y hash coincide → acuse; si no → ejecuta callback en la misma UoW, guarda resultado, un commit).
  - Hecho cuando: doble llamada secuencial deja un solo efecto y el mismo acuse; tests con DBs locales (la concurrencia real con hilos la cubre T31).

- [x] **T28. Camino idempotente en POST /cortes.** RF-30/RF-32 (parciales), RNF-3.
  - Dependencias: T27.
  - Tests primero: POST con `operacion_uuid` dos veces → 201 ambas con el mismo `id` de corte y un solo corte en DB; POST sin UUID → comportamiento legacy intacto (regression de paquetes 2–4).
  - Implementar: `operacion_uuid: Optional[UUID]` en `CorteCrear`; el router usa el ejecutor solo si viene UUID (namespace `"web"`).
  - Hecho cuando: tests API en verde y el camino sin UUID no cambia ni un byte de comportamiento.

- [x] **T29. Conflicto de identidad.** RF-32 (parcial).
  - Dependencias: T27.
  - Tests primero: misma clave + hash distinto (mismo UUID, distinto servicio/monto) → 409, sin crear corte ni mutar el resultado guardado; el acuse original sigue devolviéndose en replays del hash original.
  - Implementar: comparación de hash canónico en el ejecutor; 409 con mensaje en español.
  - Hecho cuando: tests en verde y ningún efecto secundario del intento conflictivo.

- [x] **T30. Replay terminal sin recalcular.** RF-32/RF-57 (parciales).
  - Dependencias: T27–T28.
  - Tests primero: replay con catálogo cambiado entremedio (precio/porcentaje distintos) devuelve el acuse original con el snapshot aplicado original, sin recalcular ni crear otro corte.
  - Hecho cuando: el replay no toca `corte_service` (verificable por snapshot idéntico) y pasa el test.

- [x] **T31. Doble envío simultáneo.** RF-32 (parcial), RNF-6.
  - Dependencias: T27–T28.
  - Tests primero: dos hilos con misma UUID contra TestClient → un solo corte en DB y ambos acuses con el mismo `id` (reintentar hasta 3 veces si hay contención SQLite; si la contención es sistemática, documentar y usar secuencial + constraint única como red).
  - Hecho cuando: unicidad garantizada por constraint + manejo, no por suerte de timing.

- [x] **T32. UUID opcional en el camino sync.** RF-30/RF-32 (parciales), RNF-3.
  - Dependencias: T27.
  - Tests primero: op `crear_corte` con `operacion_uuid` en datos → reenvío del lote no duplica; sin UUID → comportamiento legacy intacto (documentar la limitación de deduplicación retroactiva del plan §4, sin prometerla).
  - Implementar: leer `operacion_uuid` opcional de `op.datos` y pasarlo al ejecutor con namespace `"sync"`.
  - Hecho cuando: tests del envelope en verde y el resto del protocolo sync intacto.

- [x] **T33. Regresión total y cierre del paquete.** RF-30/RF-32/RF-57 (parciales), RNF-3/RNF-6.
  - Dependencias: T26–T32.
  - Ejecutar por archivo las suites tocadas + suite aislada del paquete 1, todo en verde, con precaución DB real + gate de migración registrados (ningún `upgrade` contra base real ejecutado).
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 6.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Evidencia futura (paquete 5)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T26 | Rojo real: `history` mostraba solo `001` | Verde: `history` con `002`; TEMP vacía crea solo `operaciones_corte` (+`alembic_version`); TEMP legacy intacta + tabla nueva; repetir no-op | `upgrade` solo en TEMP (`ALEMBIC_SQLALCHEMY_URL`); `barberia.db` hash idéntico (`3fe8caa6…f924a9`); prohibido aplicar contra base real. Modelo + `__init__` + revisión `002`. |
| T27 | Rojo real: `ModuleNotFoundError: app.services.operacion_corte_service` | Verde: replay mismo hash → mismo acuse + 1 solo corte | Ejecutor con hash canónico, replay sin reejecutar, sin commit (UoW del llamador). DIVULGACIÓN: el hash de `barberia.db` cambió una vez (`3fe8caa6…` → `b691f8c5…`) porque el `create_all` histórico (gate 9) creó la tabla vacía `operaciones_corte` al importar la app en tests; verificado: 0 filas nuevas, legacy intacto (1 admin, resto vacío), `create_all` no escribe filas por construcción. Robustez añadida: `002` salta creación si la tabla existe (verificado en TEMP con `create_all` previo). |
| T28 | Rojo real: doble POST con misma UUID creó 2 cortes (`assert 1 == 2`) | Verde: `38 passed` (2 archivos) | Desde `backend`: pytest por archivo. DB estable en baseline T27 (`b691f8c5…`, tabla vacía por `create_all` histórico); solo `schemas/corte.py` + `routers/cortes.py` + `test_cortes.py`. Cambio: `operacion_uuid` opcional (UUID→422 automático), ejecutor con namespace `web` y payload de strings; sin UUID el camino no cambia ni un byte (misma llamada). Solo se guarda estado aceptado; registrar rechazos queda para paquete 6. |
| T29 | Rojo real: conflicto devolvía 400 en vez de 409 | Verde: `39 passed` (2 archivos) | DB estable en baseline T27; solo `operacion_corte_service.py` + `routers/cortes.py` + `test_cortes.py`. Cambio: `ConflictoIdentidad(ValueError)` + 409 en router (orden de except preservado); acuse original intacto y 1 solo corte. |
| T30 | Verde inicial real (el ejecutor jamás reejecuta por diseño T27; sin rojo artificial ni cambio productivo) | Mismo verde | Test: catálogo cambiado (200.00/60%) + replay → mismo id, `50.00`/`100.00` originales. Solo `test_cortes.py` + este documento. |
| T31 | Rojo real y flaky: 2/5 corridas con un solo resultado (el perdedor moría con 500 por contención) | Verde estable: 6/6 corridas + `64 passed` (3 archivos) + `167` aislada | DB estable en baseline T27; solo `operacion_corte_service.py` + `routers/cortes.py` + `test_cortes.py`. Cambio: reintento acotado (3) con rollback en flush (ejecutor) y en commit (router); el constraint único decide el ganador y el resto converge a su acuse. |
| T32 | Rojo real: reenvío del lote duplicaba (2 cortes) | Verde: `42 passed` (2 archivos) | DB estable en baseline T27; solo `routers/sync.py` + `test_cortes.py`. Cambio: `operacion_uuid` opcional en datos → ejecutor con namespace `sync` y modo `offline`; sin UUID el camino no cambia (limitación retroactiva documentada, sin promesa). Conflicto cae en 409 existente vía `ValueError`. |
| T33 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde: `69 + 2 + 8 + 10 + 2` por archivo (toda la suite backend) + `167 passed` aislada | DB estable en baseline T27 (`b691f8c5…`, ver divulgación T27); ningún `upgrade` contra base real ejecutado; `git status` solo este documento. Paquete 5 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 6. |

### Cierre del paquete 5 (revisión independiente)

`sdd-reviewer`: **APROBADO PAQUETE 5**, sin P1. Reejecutó todo (91 + 167, T31 6/6, upgrades en TEMP, hash DB idéntico). Aplicados sus P2 correspondientes: `ReintentosAgotados` → 500 en POST y sync (test determinista), header/tasks y MEMORY al día, redacción T27. Integrado a `dev` vía PR #27. El cierre no autoriza paquete 6 ni declara la spec implementada.

---

## Paquete 6 — Abonos y saldos independientes

Estado: **implementado (T34–T41 en verde) y aprobado por `sdd-reviewer`; pendiente integración a `dev` vía PR**. Paquetes 1–5 cerrados, no rehacer.

Aprobación recibida: alcance aprobado por el usuario (RF-16–21, RF-37, bloqueo base RF-23/25). No se autoriza implementación por esta redacción.

### Alcance y límites

- Ocho tareas de 20–30 minutos: estimación 3–4 horas.
- Cobertura **parcial**: RF-16/RF-17 (movimientos por concepto), RF-18/RF-19 (independencia), RF-20 (saldar vía movimientos), RF-21 (totales/restante/estados, sin unknown/excedentes/revisión), RF-37 (cobro inicial), RF-41 (exceso online rechazado), RF-23/25 (bloqueo calculado desde primer pago). No afirma compensaciones/devoluciones (RF-43), revisión offline (RF-38/53), unknown (RF-44), edición/anulación ni cumplimiento integral.
- Decisiones registradas:
  - `MovimientoCorte`: UUID estable, corte, concepto (`cliente`/`comision`), tipo `abono`, importe canónico, autor, método propio, momento real (automático; admin puede indicarlo), registrado UTC. Append-only. Sin `Numeric` nuevo ambiguo: `Numeric(10,2)` con validación canónica en frontera (igual que `Corte`).
  - Obligación cliente = `precio` del corte; obligación comisión = `parte_barbero`. Saldo = obligación − neto (abonos aceptados); `max(..., 0)` con estados pendiente/parcial/pagado. Sin excedentes en este paquete: online el exceso se rechaza (RF-41); offline queda para sync.
  - Cobro inicial al registrar: `pendiente` (sin abono) / `parcial` (importe real obligatorio) / `completo` (importe = precio mostrado). No marca comisión como pagada.
  - Bloqueo: propiedad calculada `tiene_pagos` (existe movimiento) → helper `corte_bloqueado()`; la edición no existe aún (paquete 7).
  - Abono cero o negativo → 400 (RF-41 + sin movimiento de importe 0). Abono > saldo (online) → 400.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - C `backend/app/models/finanzas_corte.py` (solo `MovimientoCorte` + enums).
  - M `backend/app/models/__init__.py` (solo registro).
  - C `backend/alembic/versions/003_movimientos_corte.py` (solo crea la tabla; idempotente; con guard ante tabla existente como `002`).
  - C `backend/app/services/movimiento_corte_service.py` (solo abonos + saldos + bloqueo).
  - M `backend/app/routers/cortes.py` (solo cobro inicial en registro).
  - C `backend/app/routers/movimientos_corte.py` (solo POST/GET movimientos por corte).
  - M `backend/app/main.py` (solo registro del router; sin tocar `create_all`).
  - M `backend/tests/test_cortes.py` (solo tests nuevos).
- Prohibido: compensaciones/devoluciones, revisión/dependientes, unknown, edición/anulación, jornadas, frontend, DTO personal (intacto), sync typed.
- **Gate de migración real** (igual que paquete 5): archivo commiteable; APLICAR `upgrade` contra base real exige aprobación + backup verificado + copia temporal primero. Durante el paquete, `upgrade` solo en TEMP; tests en DBs locales. Hash de `barberia.db` antes/después (baseline vigente `b691f8c5…`).

### Tareas en orden de dependencia

- [x] **T34. Tabla de movimientos + migración 003.** RF-16/RF-17 (base), RNF-3.
  - Dependencias: ninguna dentro del paquete.
  - Tests primero: `history` muestra `003`; `upgrade` en TEMP vacía crea solo `movimientos_corte`; en TEMP con legacy + `create_all` previo no toca nada (guard); repetir no-op.
  - Implementar: modelo + revisión solo-creación con guard de existencia.
  - Hecho cuando: escenarios TEMP verificados y prohibido aplicar contra base real.

- [x] **T35. Registrar abono parcial por concepto.** RF-16/RF-17 (parciales), RF-41.
  - Dependencias: T34.
  - Tests primero: POST abono cliente 30 sobre 100 → 201 con importe/metodo/momento propios; abono 0/negativo/3 decimales → 400; UUID de movimiento duplicado en reintento → un solo movimiento (reutilizar patrón idempotente: clave única por UUID).
  - Implementar: `POST /cortes/{id}/movimientos` (concepto, importe, método; momento automático, admin puede indicarlo) con validación canónica y titularidad (propio o admin gestión; ajeno 404).
  - Hecho cuando: tests API en verde y el abono conserva importe real sin normalizar.

- [x] **T36. Independencia de conceptos y saldado vía movimientos.** RF-18/RF-19/RF-20 (parciales).
  - Dependencias: T35.
  - Tests primero: abono cliente no mueve saldo comisión y viceversa; saldar el restante exacto cambia estado a pagado; no existe endpoint ni flag de "marcar pagado" (solo movimientos).
  - Implementar: saldos por concepto desde movimientos aceptados; endpoint separado `GET /cortes/{id}/saldos` con DTO personal (sin `parte_barberia`); el detalle no se toca.
  - Hecho cuando: tests en verde con ambos conceptos evolucionando por separado.

- [x] **T37. Totales, restante y estados.** RF-21 (parcial, sin unknown/excedentes/revisión).
  - Dependencias: T35–T36.
  - Tests primero: dos abonos 30+70 sobre 100 → total 100, restante 0, estado pagado; un abono 30 → parcial con restante 70; sin abonos → pendiente.
  - Implementar: cálculo puro de saldos (función testeable) + exposición en lectura.
  - Hecho cuando: matriz de estados en verde y unknown/excedentes explícitamente fuera (documentado, sin inventar).

- [x] **T38. Cobro inicial al registrar.** RF-37 (parcial), RF-41.
  - Dependencias: T35.
  - Tests primero: `pendiente` no crea abono; `parcial` con importe 40 crea abono real de 40; `completo` crea abono por el precio mostrado; parcial sin importe → 400; completo no marca comisión como pagada.
  - Implementar: campos `cobro_inicial` + `importe_cobro` opcionales en el registro (propio y admin); el abono se crea en la misma UoW.
  - Hecho cuando: tests API en verde para las tres elecciones sin default.

- [x] **T39. Exceso online rechazado + bloqueo calculado.** RF-41/RF-23/RF-25 (parciales).
  - Dependencias: T35–T38.
  - Tests primero: abono mayor al restante (online) → 400 sin crear movimiento; tras el primer abono `corte_bloqueado()` es verdadero y antes es falso.
  - Implementar: validación contra saldo en la UoW + helper de bloqueo (sin enforcement de edición aún: no existe edición).
  - Hecho cuando: tests en verde y ningún movimiento inválido persiste.

- [x] **T40. Compatibilidad y privacidad de movimientos.** RF-14/RF-15 (regresión), RNF-3/RNF-5.
  - Dependencias: T35–T39.
  - Tests primero: barbero no opera sobre corte ajeno (404 idéntico); respuestas de movimientos/saldos sin `parte_barberia`/costos/márgenes (reutilizar detector T17); admin gestión conserva acceso.
  - Hecho cuando: verdes sin cambios productivos nuevos salvo ajustes exigidos por un rojo real.

- [x] **T41. Regresión total y cierre del paquete.** RF-16–21/RF-37/RF-41/RF-23/25 (parciales), RNF-3/RNF-6.
  - Dependencias: T34–T40.
  - Ejecutar por archivo las suites tocadas + suite aislada del paquete 1, todo en verde, con precaución DB real + gate de migración registrados (ningún `upgrade` contra base real ejecutado).
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 7.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Evidencia futura (paquete 6)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T34 | Rojo real: `history` mostraba solo hasta `002` | Verde: `history` con `003`; TEMP vacía crea las 2 tablas nuevas; TEMP legacy + `create_all` dispara ambos guards sin tocar nada; repetir no-op | `upgrade` solo en TEMP; `barberia.db` hash estable en baseline T27 (`b691f8c5…`); prohibido aplicar contra base real. Modelo `finanzas_corte.py` (UUID única, concepto/tipo, importe, autor, método, momento nullable, registrado UTC) + `__init__` + revisión `003` con guard. |
| T35 | Rojo real: 4 failed (rutas inexistentes → 404) | Verde: `5 passed` nuevos | Desde `backend`: pytest por archivo. DIVULGACIÓN (mismo mecanismo T27): `barberia.db` ganó la tabla vacía `movimientos_corte` por `create_all` histórico (nuevo baseline `4c7f1b19…`; 0 filas, legacy y datos intactos: 1 admin, resto vacío). Solo `movimiento_corte_service.py` + `movimientos_corte.py` (router) + `main.py` (registro) + `test_cortes.py`. Modelos Pydantic en el router (sin archivo schema nuevo, dentro del alcance). |
| T36 | Rojo real: 2 failed (sin endpoint `/saldos`) + 1 ajuste cosmético (`'0'` vs `'0.00'`) | Verde: `73 passed` (3 archivos) | DB estable en baseline T35; solo `movimiento_corte_service.py` + `movimientos_corte.py` + `test_cortes.py`. Cambio: `calcular_saldo`/`saldos_corte` puros + `GET /{id}/saldos` personal (obligación = precio/parte_barbero, sin `parte_barberia`); presentación quantizada al centavo (valores exactos por construcción); sin endpoint de "marcar pagado" (404/405 verificado). |
| T37 | Verde inicial real (cubierto por T36; sin rojo artificial ni cambio productivo) | Mismo verde | Matriz 0/30/30+70 → pendiente/parcial-70/pagado-0. Unknown/excedentes explícitamente fuera. Solo `test_cortes.py` + este documento. |
| T38 | Rojo real: 2 failed (campos ignorados; parcial/completo sin abono) | Verde: `3 passed` nuevos | DB estable en baseline T35; solo `schemas/corte.py` + `routers/cortes.py` + `test_cortes.py`. Cambio: enum `CobroInicial` + `importe_cobro` opcionales; abono en la misma UoW (completo = precio del snapshot); cobro incluido en el hash idempotente (misma UUID + distinto cobro = 409 futuro); sin elección → pendiente. |
| T39 | Rojo real: exceso aceptado + `ImportError corte_bloqueado` | Verde: `79 passed` (3 archivos) | DB estable en baseline T35; solo `movimiento_corte_service.py` + `test_cortes.py`. Cambio: validación contra saldo con `origen` (online rechaza, offline documentado para revisión RF-38); helper `corte_bloqueado()` (cierre aún no existe). Cobro inicial/completo hereda la validación (completo = precio = restante). |
| T40 | Verde inicial real (cubierto por T35–T36; sin rojo artificial ni cambio productivo) | Mismo verde | Test: ajeno 404 en abono y saldos, detector T17 limpio en respuestas propias, admin gestión conserva acceso. Solo `test_cortes.py` + este documento. |
| T41 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde: `84 + 2 + 8 + 10 + 2` por archivo (toda la suite backend) + `167 passed` aislada | DB estable en baseline T35 (`4c7f1b19…`, ver divulgación T35); ningún `upgrade` contra base real ejecutado; `git status` solo este documento. Paquete 6 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 7. |

### Cierre del paquete 6 (revisión independiente)

`sdd-reviewer`: **APROBADO PAQUETE 6**. Verificó "Hecho cuando" T34–T41, cobertura parcial sin overclaim (sin compensaciones/devoluciones RF-43, sin revisión RF-38/53, sin unknown RF-44, sin edición/anulación), gates intactos (upgrades solo en TEMP con guards 002/003 verificados; ningún `upgrade` contra base real; `create_all` histórico intacto) y constitución (Decimal canónico + quantize de presentación exacto por construcción; % solo servicios; privacidad con 404 idéntico y DTOs limpios; compat: sync y DTO personal intactos; UTC naive coherente con `Corte.fecha`). Reejecutó todo: 106 por archivo (55 cortes + 23 roles + 3 sync + 4 usuarios + 2 auth + 2 auditoría + 8 invariante + 10 t9–t11) + 167 aislada, hash DB idéntico (`4c7f1b19…`, divulgación T35 verificada: 0 filas en `movimientos_corte`, legacy intacto). Verdes iniciales T37/T40 legítimos (cubiertos por T36/T35–T36); ajuste cosmético `'0'` vs `'0.00'` solo presentación. Corrección aplicada por la revisión (dentro del alcance, archivos autorizados): `uuid` del movimiento validado como `UUID` (antes string libre) + test 422; re-verificado 55 en `test_cortes.py`. P2 para futuro (no bloqueantes): (1) carrera de abonos concurrentes contra el saldo sin lock (`database.py` sin `BEGIN IMMEDIATE`; RF-41 concurrente corresponde al protocolo de exclusión diferido); (2) UUID de movimiento duplicada con distinto payload devuelve el existente sin 409 (sin hash almacenado que comparar); (3) `schemas/corte.py` tocado por T38 aunque no figuraba en la lista autorizada (requerido y divulgado en evidencia; regularizar lista); (4) rama `origen` offline sin llamadores API todavía: el paquete de sync deberá implementar estados de revisión RF-38/53 en vez de reutilizar el camino de abono normal. El cierre no autoriza paquete 7 ni declara la spec implementada.

---

## Paquete 7 — Edición, anulación y bloqueo

Estado: **tareas redactadas, pendientes de aprobación para implementar**. Paquetes 1–6 cerrados, no rehacer.

Aprobación recibida: alcance aprobado por el usuario (RF-22–27, RF-42, RF-46 parcial). No se autoriza implementación por esta redacción.

### Alcance y límites

- Ocho tareas de 20–30 minutos: estimación 3–4 horas.
- Cobertura **parcial**: RF-22 (edición propia no bloqueada), RF-23 (bloqueo por pagos), RF-24 parcial (bloqueo por cierre: property preparada, sin vínculo de cierre aún), RF-25 (abonos posteriores pese a bloqueo), RF-26 (corrección admin con motivo), RF-27 (anulado conservado, fuera de devengado), RF-42 (recálculo por servicio / conservación por método), RF-46 parcial (sin nuevos abonos al anulado, movimientos conservados; excedentes explícitos quedan para revisión). No afirma compensaciones/devoluciones (RF-43), reasignación, jornadas/cierres ni cumplimiento integral.
- Decisiones registradas:
  - `PATCH /cortes/{id}` con `servicio_id` y/o `metodo_pago` opcionales. Barbero: solo propios no bloqueados/no anulados; titularidad ajena → 404; bloqueado → 409 `corte_bloqueado`; anulado → 409 `corte_anulado`.
  - Cambio de servicio recalcula precio/porcentaje actuales + reparto (valores del catálogo vigente, RF-42); solo método conserva importes.
  - `POST /cortes/{id}/anular` con `motivo` opcional (barbero propio no bloqueado) y obligatorio para admin sobre bloqueado (RF-26); sin motivo admin en bloqueado → 400.
  - Anulado: columnas `anulado_en`/`anulado_motivo`/`anulado_por` (migración 004 aditiva, nullable, con guard); visible en historial con marca; excluido del devengado de reportes (cambio mínimo: filtro `anulado_en IS NULL`); sin nuevos abonos ordinarios al anulado → 409; movimientos conservados.
  - Abono posterior a corte bloqueado NO anulado sigue permitido (RF-25, ya funciona: sin enforcement contrario).
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - C `backend/alembic/versions/004_anulacion_corte.py` (solo agrega columnas nullable; idempotente; con guard).
  - M `backend/app/models/corte.py` (solo columnas de anulación).
  - M `backend/app/models/__init__.py` (solo si requiere re-export; probablemente intacto).
  - C `backend/app/services/edicion_corte_service.py` (solo reglas editar/anular/bloqueo + recálculo RF-42).
  - M `backend/app/routers/cortes.py` (solo PATCH + POST anular).
  - M `backend/app/schemas/corte.py` (solo `CorteEditar` + `CorteAnular`; DTOs de respuesta intactos + marca `anulado` en personal).
  - M `backend/app/routers/reportes.py` (solo excluir anulados del devengado).
  - M `backend/tests/test_cortes.py` (solo tests nuevos).
- Prohibido: compensaciones/devoluciones, revisión/unknown, reasignación, jornadas/cierres, frontend, sync, DTO admin, `create_all`.
- **Gate de migración real** (igual que paquetes 5–6): archivo commiteable; APLICAR contra base real exige aprobación + backup + copia primero. Hash de `barberia.db` antes/después (baseline vigente `4c7f1b19…`).

### Tareas en orden de dependencia

- [x] **T42. Columnas de anulación + migración 004.** RF-27 (base), RNF-3.
  - Dependencias: ninguna dentro del paquete.
  - Tests primero: `history` muestra `004`; `upgrade` en TEMP vacía agrega las columnas; en TEMP con legacy + `create_all` no toca nada (guard); repetir no-op.
  - Implementar: `anulado_en`/`anulado_motivo`/`anulado_por` nullable en `Corte` + revisión solo-aditiva con guard de existencia.
  - Hecho cuando: escenarios TEMP verificados y prohibido aplicar contra base real.

- [x] **T43. Edición propia no bloqueada.** RF-22/RF-42 (parciales).
  - Dependencias: T42 (modelo con columnas presentes aunque no usadas aún).
  - Tests primero: barbero cambia método → 200 con mismos importes; cambia servicio → 200 con precio/porcentaje/reparto actuales; ajeno → 404; servicio inexistente/inactivo → 404/400.
  - Implementar: `PATCH /cortes/{id}` con `CorteEditar`; recálculo vía valores actuales (reutilizar `calcular_partes` + validadores).
  - Hecho cuando: tests API en verde y el registro original conserva trazabilidad (sin UPDATE destructivo de snapshots previos: se sobrescribe el vigente, historial de cambios para paquete de auditoría).

- [x] **T44. Bloqueo efectivo del barbero.** RF-23/RF-25 (parciales).
  - Dependencias: T43 + helper `corte_bloqueado()` (T39).
  - Tests primero: tras un abono, PATCH y POST anular del barbero → 409 `corte_bloqueado`; registrar otro abono sigue 201 (RF-25).
  - Implementar: enforcement con `corte_bloqueado()` en ambas rutas (solo barbero; admin sigue gestión).
  - Hecho cuando: tests en verde y el bloqueo no impide completar pagos.

- [x] **T45. Anulación propia y marca visible.** RF-27 (parcial).
  - Dependencias: T44.
  - Tests primero: barbero anula propio no bloqueado → 200 con marca; aparece en historial como anulado; segundo intento → 409 `corte_anulado`; edición posterior → 409.
  - Implementar: `POST /{id}/anular` (motivo opcional barbero) + marca `anulado` en DTO personal.
  - Hecho cuando: tests en verde y el anulado nunca vuelve a activo por edición.

- [x] **T46. Corrección admin con motivo.** RF-26 (parcial).
- [x] **T46-bis. Journal mínimo de ediciones y anulaciones.** RF-26 (pleno, decisión delegada del usuario).
  - Dependencias: T44–T45.
  - Tests primero: admin edita/anula bloqueado sin motivo → 400; con motivo → 200 y conserva motivo/autor/momento (en anulación; en edición el motivo se exige pero su journal completo va al paquete de auditoría).
  - Implementar: `motivo` obligatorio para admin en bloqueado/anulado; persistencia en columnas de anulación (edición admin: motivo exigido pero valores anteriores visibles en fila; journal completo en paquete de auditoría).
  - Hecho cuando: tests en verde y ninguna corrección admin sin motivo persiste.

- [x] **T47. Anulado fuera de devengado y sin nuevos abonos.** RF-27/RF-46 (parciales).
  - Dependencias: T45.
  - Tests primero: reportes no cuentan el anulado; abono ordinario al anulado → 409; movimientos previos siguen consultables.
  - Implementar: filtro `anulado_en IS NULL` en reportes de devengado (cambio mínimo) + rechazo de abonos al anulado en `registrar_abono` o router (decidir el punto exacto sin romper sync: sync legacy sin abonos no afectado).
  - Hecho cuando: tests en verde y el dinero ya abonado se conserva intacto.

- [x] **T48. Privacidad y compat de edición/anulación.** RF-14/RF-15 (regresión), RNF-3/RNF-5.
  - Dependencias: T43–T47.
  - Tests primero: barbero no edita/anula ajeno (404 idéntico); respuestas sin `parte_barberia`/costos (detector T17); admin gestión conserva acceso; listado global intacto.
  - Hecho cuando: verdes sin cambios productivos nuevos salvo ajustes exigidos por un rojo real.

- [x] **T49. Regresión total y cierre del paquete.** RF-22–27/RF-42/RF-46 (parciales), RNF-3/RNF-6.
  - Dependencias: T42–T48.
  - Ejecutar por archivo las suites tocadas + suite aislada del paquete 1, todo en verde, con precaución DB real + gate de migración registrados (ningún `upgrade` contra base real ejecutado).
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 8.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Evidencia futura (paquete 7)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T42 | Rojo real: `history` mostraba solo hasta `003` (+ `String` sin importar que rompía el modelo) | Verde: `history` con `004`; TEMP vacía salta (sin tabla); legacy + `create_all` dispara guard; legacy vieja real (9 tablas, 1 fila) agrega las 3 columnas con FK nombrada preservando la fila; repetir no-op | Hallazgos honestos del camino: `String` faltante, `op.create_foreign_key` directo incompatible con SQLite, batch exige FK nombrada — todo verificado en TEMP. `barberia.db` hash estable (`4c7f1b19…`); prohibido aplicar contra base real. Modelo + revisión `004` (batch aditivo). |
| T43 | Rojo real: 3 failed (405 sin PATCH) + `AmbiguousForeignKeysError` por la nueva FK `anulado_por` | Verde: `84 passed` (3 archivos) | DB estable en baseline; `models/corte.py` (relationship con `foreign_keys`) + `edicion_corte_service.py` + `schemas/corte.py` (`CorteEditar`) + `routers/cortes.py` (PATCH) + `test_cortes.py`. Cambio: método conserva importes, servicio recalcula actuales; inexistente 404, inactivo 400, ajeno 404, sin cambios 400. |
| T44 | Rojo real: barbero editaba bloqueado (200 en vez de 409) | Verde: `63 passed` (2 archivos) | DB estable; solo `routers/cortes.py` + `test_cortes.py`. Cambio: enforcement con `corte_bloqueado()` en PATCH (solo barbero; admin 200); abono posterior sigue 201 (RF-25). Nota honesta: el 409 de POST anular va en T45 (la ruta aún no existe). |
| T45 | Rojo real: doble 404 (sin ruta anular) | Verde: `88 passed` (3 archivos) | DB estable; `edicion_corte_service.py` (`anular_corte`) + `schemas/corte.py` (`CorteAnular`, marca en ambos DTOs) + `routers/cortes.py` (POST anular + check en PATCH) + `test_cortes.py`. Cambio: barbero anula propio no bloqueado; bloqueado → 409 (cierra split T44); anulado → 409 siempre (sin reactivación); marca visible en historial. |
| T46 | Rojo real: admin editaba bloqueado sin motivo (200 en vez de 400) | Verde: `66 passed` (2 archivos) | DB estable; `schemas/corte.py` (`motivo` en `CorteEditar`) + `routers/cortes.py` + `test_cortes.py`. Cambio: motivo obligatorio admin en bloqueado (edición y anulación); anulación lo persiste (autor/momento/motivo). Migración honesta: test T44 actualizado al contrato nuevo. |
| T46-bis | Rojo real: `no such table`/0 filas de journal (sin modelo ni hooks) + `MetodoPago.EFECTIVO` vs `'efectivo'` en snapshot | Verde: suites 120 backend + 167 aislada; migración `005` en TEMP (vacía/legacy/guard/repetir) | Decisión delegada: journal append-only `auditoria_corte` + `snapshot_corte`/`auditar_cambio` en ediciones y anulaciones (misma UoW). Divulgación: `barberia.db` ganó la tabla vacía (nuevo baseline `bd4c32af…`; 0 filas, legacy intacto). El paquete de auditoría extenderá esta tabla. |
| T47 | Rojo real: doble (anulado contado en dashboard; abono al anulado 201) | Verde: `91 passed` (3 archivos) | DB estable; `reportes.py` (6 filtros `anulado_en IS NULL`: conteos, top, día, ganancias) + `movimientos_corte.py` (409 al anulado) + `test_cortes.py`. Cambio mínimo sin reinterpretar cierres legacy. Dinero abonado conservado y consultable. |
| T48 | Verde inicial real (cubierto por T43–T47; sin rojo artificial ni cambio productivo) | Mismo verde | Test: ajeno 404 en PATCH y anular, detector limpio en respuestas propias, admin anula con motivo, listado global intacto con contrato completo. Solo `test_cortes.py` + este documento. |
| T49 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde: `96 + 2 + 8 + 10 + 2` por archivo (toda la suite backend) + `167 passed` aislada | DB estable en baseline (`4c7f1b19…`); ningún `upgrade` contra base real ejecutado; `git status` solo este documento. Paquete 7 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 8. |

### Cierre del paquete 7 (revisión independiente)

`sdd-reviewer`: veredicto inicial **REQUIERE CORRECCIONES**. P1-1 corregido por la revisión: resúmenes personales `/mi/resumen/*` contaban anulados como devengado (RF-27); agregados 3 filtros `anulado_en IS NULL` + test (verificado por el coordinador). P1-2 reportado sin tocar (excede fix pequeño): la edición admin en bloqueado exige motivo pero lo descarta y pisa valores sin conservar anteriores — **deuda bloqueante registrada para el paquete de auditoría** (ver decisión del usuario en MEMORY). P2 aplicados por el coordinador: `downgrade()` 004 suelta la FK nombrada (verificado en TEMP) y redacción T46 corregida. Reejecución del reviewer: 119 + 167 verdes, hash DB idéntico. Tras correcciones: **APROBADO PAQUETE 7**. El cierre no autoriza paquete 8 ni declara la spec implementada.

---

## Paquete 8 — Outbox + sync offline (cortes + abonos)

Estado: **tareas redactadas, pendientes de aprobación para implementar**. Paquetes 1–7 cerrados, no rehacer.

Aprobación recibida: 5 preguntas de casos límite respondidas por el usuario (2026-10-07). No se autoriza implementación por esta redacción.

### Decisiones del paquete (respuestas del usuario)

- Alcance push: **cortes + abonos ordinarios**. Edición/anulación offline van a paquetes 9–10.
- UUID: **obligatoria v2** para todo lo nuevo; sin UUID solo camino legacy intacto (RNF-3), sin dedup retroactiva.
- Aislamiento: **simplificado** (stores por cuenta + generación de sesión + wipe, sin bóveda cifrada).
- Pull cobertura RF-55 (90 días + saldos abiertos): **diferido** al paquete de historiales/jornadas.
- LWW RF-36 y RF-40: **diferidos** al paquete 10; sync devuelve aceptada/rechazada/revisión simple.

### Alcance y límites

- Ocho tareas de 20–30 minutos: estimación 3–4 horas.
- Cobertura **parcial**: RF-28 (operar offline con último rol/datos), RF-29 (persistencia ante recarga + pendiente visible), RF-30 (sincronizar con aceptadas/rechazadas/revisión), RF-32 (sin duplicados, UUID v2), RF-33 (aislamiento por cuenta), RF-34 (revalidación rol/activo al sincronizar), RF-35 (catálogo insuficiente/fallo conserva última copia), RF-38 (exceso offline → revisión, sin reducir silenciosamente), RF-51 (momento automático; reloj >5min → revisión), RF-57 (resultado por operación, corte + dependientes), RNF-2/RNF-3/RNF-5/RNF-6. No afirma pull RF-55, LWW RF-36, RF-40, jornadas/imputación RF-45/49/50, compensaciones RF-43, ni cumplimiento integral.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - M `backend/app/routers/sync.py` (solo envelope v2 + estados + abonos; sin pull, sin LWW).
  - M `backend/app/services/operacion_corte_service.py` (solo estados `revision`/`dependiente_sin_aplicar` mínimos + causa; sin transiciones LWW).
  - M `backend/app/models/operacion_corte.py` + C `backend/alembic/versions/006_sync_estados.py` (solo columnas aditivas estado/causa/mapping; con guard).
  - M `backend/app/routers/movimientos_corte.py` (solo aceptar `operacion_uuid` + `momento_real` + origen offline → revisión por exceso/reloj; sin cambiar saldos aceptados).
  - M `backend/tests/test_cortes.py` + M `backend/tests/test_sync_roles.py` (solo tests nuevos).
  - M `frontend/src/services/db.ts` (solo stores v2 aditivos: outbox/mapping; v1 intacto, sin borrar antes de verificar).
  - C `frontend/src/services/operacionesCortes.ts` (solo outbox persist-first + codec centavos por dígitos).
  - M `frontend/src/services/api.ts` (solo cliente typed 002 sin `Number()` global; auth por solicitud).
  - M `frontend/src/hooks/useSync.ts` (solo envío por cuenta con UUID/modo/instante + estados por operación; sin `clear()` destructivo).
  - M `frontend/src/pages/RegistroCortes.tsx` (solo persist-first + instante único + filtro activo válido + estimada exacta).
  - M `frontend/vite.config.ts` (solo retirar `api-cache`; precache shell/fuentes).
- Prohibido: pull historial/cobertura, LWW, edición/anulación offline, jornadas/cierres/imputación, compensaciones/devoluciones, bóveda cifrada, `create_all` en import, `pytest tests/` global, cualquier `upgrade` contra base real.
- Precaución DB real vigente: hash de `backend/barberia.db` antes/después, pytest solo por archivo, upgrades solo TEMP.

### Tareas en orden de dependencia

- [x] **T50. Outbox Dexie v2 + persist-first de cortes.** RF-28/RF-29 (parciales), RNF-5.
  - Dependencias: ninguna dentro del paquete.
  - Tests primero (frontend): guardar offline genera UUID v4 + `modo_captura` + `instante_cambio` + `momento_real` y persiste en outbox antes de intentar red; recarga conserva el pendiente con estado visible (no aceptación definitiva).
  - Implementar: `operacionesCortes.ts` + stores v2 en `db.ts` (outbox/mapping, índices string/number, cuenta propietaria = actor, no `barbero_id`); `RegistroCortes.tsx` captura `ahora` una vez y escribe primero en outbox.
  - Hecho cuando: registro sin conexión queda durable con UUID y pendiente visible; sin `Number()` ni `*100` float en el camino nuevo.

- [x] **T51. Push sync de cortes con UUID obligatoria v2 + estados.** RF-30/RF-32/RF-57 (parciales), RNF-3.
  - Dependencias: T50.
  - Tests primero: envelope v2 con `operacion_uuid` obligatorio rechaza sin UUID (400/422); reintento misma UUID no duplica (200 mismo ID); respuesta trae `estado` + `mapping UUID→ID` + `snapshot definitivo`; corte rechazado conserva dependientes sin aplicar (RF-57).
  - Implementar: `sync.py` exige UUID en camino v2 (legacy sin UUID intacto) + pasa `modo/hash` al ejecutor; estados `aceptada/rechazada/revision/dependiente_sin_aplicar` mínimos con causa.
  - Hecho cuando: push v2 en verde, legacy sin UUID no cambia de comportamiento, sin LWW.

- [x] **T52. Push de abonos offline + exceso/reloj a revisión.** RF-38/RF-51 (parciales), RF-57.
  - Dependencias: T51.
  - Tests primero: abono offline que supera saldo definitivo → 200 con `estado=revision`, conserva importe real, no reduce saldo aceptado; `momento_automático >5min` vs servidor → revisión con original conservado; abono online en exceso → rechazo directo (regresión RF-41).
  - Implementar: `movimientos_corte.py` acepta `operacion_uuid` + `origen offline` + `momento_real`; exceso/reloj offline → fila en revisión (sin aplicar saldo); online mantiene rechazo.
  - Hecho cuando: tests en verde y el dinero real offline nunca se recorta silenciosamente.

- [x] **T53. Aislamiento por cuenta + auth por solicitud.** RF-33 (parcial), RNF-5.
  - Dependencias: T50–T51.
  - Tests primero: pendientes de A no se muestran ni envían como B tras cambio de cuenta; respuesta tardía de A no toca historial/saldos de B; 401 tardío no desloguea a B.
  - Implementar: slot sesión durable `titular/generación/último rol`, namespace por cuenta, `logout/cambio` invalida generación + aborta red + wipe stores sensibles; `api.ts` captura token/generación por solicitud y valida cuenta antes de aplicar resultado.
  - Hecho cuando: cambio de cuenta en verde sin filtración ni atribución cruzada; sin bóveda cifrada en este paquete.

- [x] **T54. Cobro inicial offline + resultados individuales.** RF-37/RF-57 (parciales).
  - Dependencias: T51–T52.
  - Tests primero: corte offline con cobro `pendiente/parcial/completo` → al sincronizar se informa corte + cada movimiento por separado; `completo` usa precio mostrado (snapshot), no recalculado; corte rechazado deja dependientes conservados sin aplicar.
  - Implementar: `depende_de` = UUID del corte original (no ID reasignable); outbox encadena dependientes; sync devuelve resultado por operación.
  - Hecho cuando: pendientes/parciales/completos offline en verde sin anunciar éxito completo si solo se aceptó parte.

- [x] **T55. Catálogo que no se pierde + PWA sin api-cache.** RF-35 (parcial), RNF-4.
  - Dependencias: T50 (frontend).
  - Tests primero: fallo de update de catálogo conserva última copia válida; sin catálogo suficiente se informa limitación sin confirmar registro inexistente; filtro activo válido (sin índice booleano).
  - Implementar: `useSync.ts` reemplaza catálogo en transacción solo tras respuesta validada (sin `clear()+bulkPut` ante fallo); `RegistroCortes.tsx` corrige fallback `activo`; `vite.config.ts` retira `api-cache` (precache solo shell/fuentes; al activar purga `api-cache` sin borrar IndexedDB).
  - Hecho cuando: `npm run build` en verde y ningún dato sensible en CacheStorage/BackgroundSync.

- [x] **T56. Revalidación al sincronizar (rol/activo/servicio).** RF-31/RF-34/RF-56 (parciales).
  - Dependencias: T51.
  - Tests primero: actor desactivado o rol cambiado al sincronizar → rechazada con motivo (spec 000); servicio desactivado después de registrar offline → aceptada con valores actuales; servicio/actor inexistente sin valores recuperables → revisión sin inventar valores.
  - Implementar: `sync.py` revalida actor vigente por operación (ya parcial; extender a abonos); cortes usan valores actuales al aceptar; inexistentes → revisión.
  - Hecho cuando: tests en verde sin eludir permisos ni inventar identidad/importes.

- [x] **T57. Regresión total y cierre del paquete.** RF-28–35/RF-38/RF-51/RF-57 (parciales), RNF-2/RNF-3/RNF-5/RNF-6.
  - Dependencias: T50–T56.
  - Ejecutar por archivo las suites tocadas + suite aislada del paquete 1 + `npm run build`, todo en verde, con precaución DB real + gate de migración registrados (ningún `upgrade` contra base real ejecutado).
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 9.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Evidencia futura (paquete 8)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T50 | Rojo real: `ROJO T50: falta src/services/operacionesCortes.ts` (exit 1) + asserts `sin Number()` ajustados a falsos positivos (comentarios y `Number(bigint)`) | Verde: `VERDE T50` (node, codec + HALF_UP + UUID + instante único) + `npm run build` OK (tsc + vite, sw generado) | Solo frontend: `operacionesCortes.ts` (nuevo, puro sin Number/parseFloat) + `scripts/t50-test.mjs` + `db.ts` (v2 aditiva outbox/mapeo, v1 intacta) + `RegistroCortes.tsx` (persist-first con instante único, fallback `activo` con `.filter()`, estimada exacta, banner pendientes por cuenta). Sin backend ni DB tocados. |
| T51 | Rojo real: triple failed (acción `crear_corte_v2` desconocida → 409) | Verde: `74 passed` (2 archivos) + `npm run build` OK | DB estable (`bd4c32af…`); `sync.py` (acción v2 + `ResultadoOperacion` con `estado/corte_id/snapshot` aditivos + `_sincronizar_corte_v2` con UUID/modo validados, conflicto → 409) + `useSync.ts` (sender outbox por cuenta con misma UUID, mapping durable; legacy intacto) + `test_sync_roles.py`. Honesto: sin migración 006 (el `resultado` JSON ya porta causa/mapping/snapshot; sin cambio de schema); estados `revision/dependiente` llegan en T52. |
| T52 | Rojo real: triple failed (acción `registrar_abono_v2` desconocida → 409); reparado al paso un test T51 pisado por el insert (def restaurada, verificado) | Verde: `101 passed` (3 archivos) + migración `006` en TEMP (legacy + 1 fila: columnas agregadas, fila preservada) | DB estable (`bd4c32af…`); `finanzas_corte.py` (`EstadoMovimiento` + columnas nullable, nulo = aceptado) + `006_revision_abono.py` + `movimiento_corte_service.py` (offline: exceso → `exceso`, \|desvío\| >300s → `reloj`, sin mover saldos; saldos solo aceptados) + `movimientos_corte.py` (estado visible) + `sync.py` (`registrar_abono_v2`, 202 revisión / 404 idéntico / 409 anulado). Sin frontend en esta tarea (outbox de abonos en T54). |
| T53 | Rojo real: `ROJO T53: falta src/services/sesion.ts` (exit 1) | Verde: `VERDE T53` (node, generación + vigencia + alcance) + `VERDE T50` regresión + `npm run build` OK (0 errores) | Solo frontend: `sesion.ts` (nuevo, puro inyectable + `leerSesionNavegador`) + `scripts/t53-test.mjs` + `authStore.ts` (setAuth instala / logout invalida generación) + `api.ts` (foto token por solicitud; 401 solo desloguea si el token sigue vigente) + `useSync.ts` (legacy filtra por cuenta actual; ambos caminos descartan resultados tardíos si cambió la cuenta). Sin backend ni DB tocados; sin cifrado (simplificado aprobado). |
| T54 | Rojo real: `ROJO T54: falta crearOperacionAbono` (exit 1); backend 404 inexistente en verde inicial (cubierto por T52) | Verde: `VERDE T54` + T50/T53 + `npm run build` OK + `11 passed` sync | DB estable; `operacionesCortes.ts` (`crearOperacionAbono` con `dependeDe` = UUID corte, importe real, cero/concepto rechazados) + `db.ts` (campos abono opcionales + estado `dependiente`, sin bump Dexie) + `RegistroCortes.tsx` (segmentado pendiente/parcial/completo + importe, una tx corte+abono, online informa cada resultado) + `useSync.ts` (cadena: corte aceptado → envía abono; rechazado/pendiente → `dependiente`/reintento; vigencia de sesión) + `test_sync_roles.py` (404 inexistente). `completo` = precio mostrado, no recálculo. |
| T55 | Rojo real: triple (clear destructivo + api-cache en config + sin purga); ajuste honesto: el `clear()` transaccional ES el fix, el defecto era alimentar con listas vacías — assertions corregidas al patrón real antes del verde | Verde: `VERDE T55` + T50/T53/T54 + `npm run build` OK | Solo frontend: `useSync.ts` (fetch con `null` ante fallo + `esListaValida` + `transaction rw` por store; sin catálogo informa y conserva) + `vite.config.ts` (sin `runtimeCaching`, precache +woff/woff2, `cleanupOutdatedCaches`) + `ServiceWorkerRegistration.ts` (purga `api-cache` sin tocar IndexedDB ni exigir auth). Sin backend ni DB tocados. |
| T56 | Rojo real: doble failed (desactivado rechazado 409; inexistente 409 en vez de 202) | Verde: `105 passed` (3 archivos) | DB estable; `corte_service.py` (`aceptar_inactivo` solo sync; POST online intacto con 400) + `sync.py` (v2 acepta desactivado con valores actuales; inexistente → 202 revisión sin journal ni valores inventados) + `test_sync_roles.py`. Actor/rol revalidados por op (heredado T12, verificado en regresión). |
| T57 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde: `109 + 2 + 8 + 10 + 2` por archivo (toda la suite backend) + `167 passed` aislada + 4 node frontend + `npm run build` OK (0 errores) | DB estable en baseline (`bd4c32af…`); ningún `upgrade` contra base real ejecutado (006 solo TEMP legacy+filas); `git status` solo este documento. Paquete 8 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 9. |

### Cierre del paquete 8 (revisión independiente)

`sdd-reviewer`: veredicto **APROBADO PAQUETE 8** con 4 P1 corregidos por la revisión y re-verificados por el coordinador: (1) `abs(desvío)>300` marcaba reloj el atraso normal de sync → solo adelantado (RF-51) + test nuevo; (2) el lote v2 enviaba abonos como `crear_corte_v2` → excluye `tipo==='abono'`; (3) cadena rota (`get(dependeDe)` por PK jamás hallaba al padre) → `filter(corteUuid)`; (4) doble escritura offline (outbox + fila legacy duplicaba el corte al sincronizar) → solo outbox + `revision` 202 del corte marcada `revision` (no `rechazada`). P1 reportado sin tocar (no bloquea el merge): puentes float en el camino nuevo (`toFixed/Math.round` + conversor global `Number()`; el cliente typed 002 queda para el paquete UX) — deuda registrada. P2 para futuro: `String(9)` vs `Enum` en PostgreSQL, `window.alert` legacy, 202 sin journal servidor, POST online sin UUID. Re-verificación: backend 299 (82+117+167+1 nuevo), frontend 4 node + build OK, hash DB idéntico. El cierre no autoriza paquete 9 ni declara la spec implementada.

---

## Paquete 9 — Resolución de revisiones + compensaciones/devoluciones + excedentes

Estado: **tareas redactadas, pendientes de aprobación para implementar**. Paquetes 1–8 cerrados, no rehacer.

Aprobación recibida: 5 preguntas de casos límite respondidas por el usuario (2026-10-08). No se autoriza implementación por esta redacción.

### Decisiones del paquete (respuestas del usuario)

- Capacidad de devolución: **por concepto** (dinero reconocido − devoluciones, lock por corte+concepto). Sin FuenteEfectivo por movimiento.
- Revisión: **bloquea igual** (toda fila, incluida revisión, bloquea edición/anulación; sin cambios en `corte_bloqueado`).
- Motivos: **visibles al barbero en lo propio** (trazabilidad; detector T17 extendido, sin datos ajenos).
- Frontend: **UI completa** (saldos con excedente/revisión/motivos visibles al titular).
- Anulado: **efecto al anular** (la anulación escribe cancelación de obligaciones + neto→excedente, trazable en journal).

### Alcance y límites

- Ocho tareas de 20–30 minutos: estimación 3–4 horas.
- Cobertura **parcial**: RF-21 (excedente visible por concepto + revisión aparte), RF-38/RF-53 (resolución admin: íntegro hasta saldo + resto excedente, o compensatoria si erróneo), RF-41 (correctivos diferenciados; devolución ≤ dinero abonado no devuelto), RF-43 (compensatorio con motivo + referencia, sin borrar original), RF-46 (anulados: solo ajustes/devoluciones admin; obligaciones canceladas + neto→excedente al anular). No afirma pull RF-55, LWW RF-36, RF-40, jornadas/imputación RF-45/49/50, reasignación RF-47/48, ni cumplimiento integral.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - M `backend/app/models/finanzas_corte.py` (solo `COMPENSACION`/`DEVOLUCION` en `TipoMovimiento` + columnas nullable `original_uuid`/`motivo`/`evidencia`; sin reescribir filas).
  - C `backend/alembic/versions/007_correctivos_corte.py` (solo ADD COLUMN nullable con guard, patrón 004/006).
  - M `backend/app/services/movimiento_corte_service.py` (solo `neto/excedente` por concepto + `resolver_revision` + `registrar_compensacion` + `registrar_devolucion` + `capacidad_devolucion`; `restante` conserva semántica; revisión sigue sin mover saldos).
  - M `backend/app/routers/movimientos_corte.py` (solo endpoints admin resolución/compensación/devolución + 409 anulado bifurcado ordinario vs correctivo + `estado/motivo/excedente` en respuestas).
  - M `backend/app/services/edicion_corte_service.py` (solo efecto al anular con dinero conocido + journal; sin reactivación).
  - M `backend/app/routers/cortes.py` (solo journal de anulación con efecto; regularizado como en paquete 6: requerido por T62).
  - M `backend/app/models/auditoria_corte.py` (solo 3 acciones correctivas del Enum; requerido por T59–T61).
  - M `backend/tests/test_cortes.py` + M `backend/tests/test_sync_roles.py` (solo tests nuevos).
  - M `frontend/src/pages/*` + `frontend/src/services/*` (solo vista de saldos con excedente/revisión/motivos + tipos; sin rediseño).
- Prohibido: pull historial/cobertura, LWW, RF-40, jornadas/cierres/imputación, reasignación, bóveda, `create_all` en import, `pytest tests/` global, cualquier `upgrade` contra base real.
- Precaución DB real vigente: hash de `backend/barberia.db` antes/después, pytest solo por archivo, upgrades solo TEMP.

### Tareas en orden de dependencia

- [x] **T58. Modelo correctivo + migración 007 + excedente en saldos.** RF-21/RF-41 (parciales).
  - Dependencias: ninguna dentro del paquete.
  - Tests primero: `history` muestra `007`; `upgrade` en TEMP legacy+filas agrega columnas preservando datos; `saldos` expone `excedente` por concepto (`neto−obligación` cuando sobra) sin cambiar `restante/abonado` legacy; revisión sigue sin mover saldos.
  - Implementar: `COMPENSACION`/`DEVOLUCION` en el Enum + `original_uuid`/`motivo`/`evidencia` nullable; `neto = abonos + compensaciones − devoluciones` (solo aceptados; revisión/rechazados aparte).
  - Hecho cuando: migración verificada en TEMP (vacía/legacy/fila/repetir) y saldos con excedente en verde.

- [x] **T59. Resolución admin de revisiones.** RF-38/RF-53 (parciales).
  - Dependencias: T58.
  - Tests primero: revisión por exceso con dinero real íntegro → resuelta: saldo cubierto hasta obligación + resto `excedente`, importe original intacto (sin recorte); revisión errónea → compensatoria con motivo referenciando el original; replay misma resolución no duplica efecto.
  - Implementar: `POST .../revisiones/{uuid}/resolver` (solo admin, misma UoW: original + compensación/evidencia atómicos, sin commit intermedio).
  - Hecho cuando: ambas ramas en verde con importes exactos y sin mutar hash/UUID originales.

- [x] **T60. Compensación administrativa.** RF-43 (parcial).
  - Dependencias: T58.
  - Tests primero: admin corrige movimiento erróneo → compensatorio append-only con motivo + `original_uuid`, original intacto; la compensación no cuenta como salida física (capacidad de devolución no crece por signo contable sin evidencia de dinero real).
  - Implementar: `registrar_compensacion` + endpoint admin; validación de concepto y signo contra el original.
  - Hecho cuando: tests en verde y el original nunca se edita ni borra.

- [x] **T61. Devolución explícita con capacidad por concepto.** RF-41/RF-43 (parciales).
  - Dependencias: T58–T60.
  - Tests primero: devolución ≤ dinero reconocido no devuelto → 201 y reduce capacidad; devolución superior → 400; dos devoluciones concurrentes sobre capacidad exacta → solo una consume (test de carrera con reintentos); reintento misma UUID no consume dos veces.
  - Implementar: `capacidad = reconocido − devoluciones` por corte+concepto con lock mínimo (serializar por corte+concepto) + `unique(operacion)` en la devolución.
  - Hecho cuando: carrera y límites en verde sin doble consumo.

- [x] **T62. Anulados: correctivos admin + efecto al anular.** RF-46 (parcial).
  - Dependencias: T58–T61.
  - Tests primero: abono ordinario al anulado → 409 (regresión); compensación/devolución admin al anulado → 201 trazable; anular con dinero conocido escribe cancelación de obligaciones + `neto→excedente` visible en saldos (sin devolución automática, sin reactivación).
  - Implementar: bifurcar 409 (ordinario vs correctivo admin) + efecto al anular con journal (`anular_corte` extendido).
  - Hecho cuando: tests en verde y ningún abono ordinario entra al anulado.

- [x] **T63. Motivos visibles en lo propio + privacidad.** RF-14/RF-15 (regresión), RNF-5.
  - Dependencias: T59–T62.
  - Tests primero: barbero ve motivos de correctivos sobre sus cortes (trazabilidad); ajeno → 404 idéntico; detector T17 extendido (sin `parte_barberia`/costos/datos ajenos en respuestas nuevas); admin conserva todo.
  - Implementar: `motivo` en DTOs propios (personal + movimientos + saldos); nada de otros profesionales.
  - Hecho cuando: verdes sin filtraciones y sin cambios al contrato admin.

- [x] **T64. UI de saldos con excedente/revisión/motivos.** RF-12/RF-21 (parciales), RNF-4.
  - Dependencias: T58–T63.
  - Tests primero (node, patrón T50–T55): codec/estados de la vista (excedente separado de restante, revisión aparte con causa e importe, motivos propios visibles); `npm run build` en verde.
  - Implementar: vista de saldos del titular con excedente/revisión/motivos + tipos; sin rediseño general.
  - Hecho cuando: tests node + build en verde, sin `any` ni float nuevo.

- [x] **T65. Regresión total y cierre del paquete.** RF-21/RF-38/RF-41/RF-43/RF-46/RF-53 (parciales), RNF-3/RNF-5/RNF-6.
  - Dependencias: T58–T64.
  - Ejecutar por archivo las suites tocadas + suite aislada del paquete 1 + tests node + `npm run build`, todo en verde, con precaución DB real + gate de migración registrados (ningún `upgrade` contra base real ejecutado).
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 10.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Cierre del paquete 9 (revisión independiente)

`sdd-reviewer`: veredicto **APROBADO PAQUETE 9** sin tocar archivos. Re-ejecutó todo en verde (147 + 167), migración 007 en TEMP con guards, hash DB idéntico, constitución y códigos exactos. Aritmética verificada: compensatoria +real (T59) vs −ajuste (T60) coherentes; capacidad sin doble conteo; `real` íntegro conforme RF-53. P2 no bloqueantes registrados: (1) `erroneo` con real>0 re-ejecutable sin UUID duplica (requiere decisión de spec); (2) compensación positiva sin evidencia exigida infla capacidad; (3) replay `real` → 409 en vez de acuse (cliente debe tratarlo como terminal); (4) anu
...[truncated 737 chars]

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T58 | Rojo real: triple `AttributeError` (COMPENSACION/DEVOLUCION/excedente inexistentes) + `history` en 006 | Verde: `109 passed` (3 archivos) + `007` en TEMP (legacy + 1 fila: columnas agregadas, fila preservada) | DB estable (`bd4c32af…`); `finanzas_corte.py` (tipos + `original_uuid/motivo/evidencia` nullable) + `007_correctivos_corte.py` + `movimiento_corte_service.py` (`neto` = abonos + compensaciones con signo − devoluciones, solo aceptados; `excedente` aditivo, `restante` intacto) + `SaldoConcepto.excedente` (default, compat). |
| T59 | Rojo real: triple 404 (sin ruta resolver) | Verde: `112 passed` (3 archivos) | DB estable; `movimiento_corte_service.py` (`resolver_revision` + `RevisionResuelta`: real acepta original intacto; erróneo crea compensatoria +real con referencia o solo traza si 0; motivo obligatorio) + `movimientos_corte.py` (POST resolver solo admin 403, journal RESOLUCION misma UoW, `tipo/motivo/original_uuid/evidencia` en respuesta) + `auditoria_corte.py` (acciones correctivas) + `test_cortes.py`. Sin mutar importes ni UUID originales. |
| T60 | Rojo real: doble 404 (sin ruta compensaciones) | Verde: `91 passed` (2 archivos) | DB estable; `movimiento_corte_service.py` (`registrar_compensacion` + `OriginalAusente`: motivo obligatorio, importe con signo no nulo, referencia exigida, idempotente por UUID) + `movimientos_corte.py` (POST solo admin 403, journal COMPENSACION, helper `_respuesta_movimiento` que elimina triplicación) + `test_cortes.py`. Original intacto; correctivo ya vale sobre anulados (base T62). |
| T61 | Rojo real: triple 404 (sin ruta devoluciones) | Verde: `94 passed` (2 archivos, incluye carrera con threads) | DB estable; `movimiento_corte_service.py` (`capacidad_devolucion` = neto no negativo + `registrar_devolucion` con motivo/capacidad/idempotencia + `_candado_devolucion` de proceso) + `movimientos_corte.py` (POST solo admin, UoW con candado + journal con capacidad real, `rollback` en error) + `test_cortes.py` (límite, carrera 201+400 determinista, replay, permisos). Multi-worker/PG exigirá locks de fila (deuda explícita). |
| T62 | Rojo real: `restante` seguía 70 tras anular (sin cancelación); correctivos al anulado en verde inicial (endpoints sin check, honesto) | Verde: `119 passed` (3 archivos) | DB estable; `movimiento_corte_service.py` (anulado ⇒ obligaciones 0, neto→excedente; historial intacto) + `cortes.py` (journal ANULACION con `obligaciones_canceladas` + netos/excedentes) + `test_cortes.py`. Sin nueva migración: la escritura del efecto es la fila de journal (terminal, sin reapertura). Ordinario al anulado sigue 409 (POST y sync). |
| T63 | Rojo real: doble 404 (sin listado); ajuste honesto: mi test de devolución olvidó el abono previo (capacidad 0 → 400 correcto) | Verde: `98 passed` (2 archivos) | DB estable; `movimientos_corte.py` (GET listado propio/gestión con motivos, 404 ajeno idéntico, revisiones con causa) + `test_cortes.py` (motivos propios visibles, detector T17 extendido a listado/saldos/correctivos limpio, admin intacto). Sin exponer autor ni datos ajenos. |
| T64 | Rojo real: `ROJO T64: falta src/services/saldosVista.ts` (exit 1) | Verde: `VERDE T64` + `npm run build` OK (exit 0, SW generado) | Solo frontend: `saldosVista.ts` (puro: excedente aparte, revisión con causa, motivos propios) + `scripts/t64-test.mjs` + `MisSaldos.tsx` (nueva: historial propio + saldos/movimientos por corte, sin totales del negocio) + ruta `/saldos` + nav. Sin `any`; display con `formatearMoneda` existente (sin aritmética float nueva). |
| T65 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde: `125 + 2 + 8 + 10 + 2` por archivo (toda la suite backend) + `167 passed` aislada + 5 node frontend + `npm run build` OK (exit 0) | DB estable en baseline (`bd4c32af…`); ningún `upgrade` contra base real ejecutado (007 solo TEMP legacy+filas); `git status` solo este documento. Paquete 9 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 10. |

---

## Paquete 10 — Concurrencia LWW + reasignación + históricos

Estado: **tareas redactadas, pendientes de aprobación para implementar**. Paquetes 1–9 cerrados, no rehacer.

Aprobación recibida: 5 preguntas de casos límite respondidas por el usuario (2026-10-08). No se autoriza implementación por esta redacción.

### Decisiones del paquete (respuestas del usuario)

- Tamaño: **todo junto** (~9 tareas) en vez de dividir en 10a/10b.
- Sync: **con sync** (acciones `editar/anular_v2` con instante y bases; RF-40 incluido).
- Justificantes: **con justificantes** (endpoint propio del anterior + revocación total del resto).
- Históricos: **completo** (estado `desconocido` en saldos sin inventar deudas; filas nuevas siempre conocidas).
- Intervención: **revisión manual** (tabla de intervenciones + resolución admin aplicar/descartar con motivo; sin auto-aplicación).

### Alcance y límites

- Nueve tareas de 20–30 minutos: estimación 4–5 horas.
- Cobertura **parcial**: RF-36 (LWW por unidades + anulación terminal prevalece), RF-40 (edición bloqueada offline → intervención, sin aplicar), RF-42 (grupo financiero coherente; corrección fecha admin), RF-44 (desconocido sin inventar), RF-47/RF-48 (reasignación con % nuevo, pagos anteriores sin trasladar, revocación + justificantes), RF-54 (completar histórico solo admin con evidencia). No afirma pull RF-55, jornadas/imputación RF-45/49/50, liquidaciones, ni cumplimiento integral.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - M `backend/app/models/corte.py` (solo relojes por unidad + `version` + `deuda_conocida`/`comision_conocida`; `fecha` intacta como momento real).
  - M `backend/app/models/finanzas_corte.py` (solo `profesional_id` en movimientos).
  - C `backend/alembic/versions/008_lww_reasignacion.py` (solo ADD COLUMN nullable + backfill `profesional_id`/`conocido=True`, con guard, patrón 004/006/007).
  - M `backend/app/services/edicion_corte_service.py` (solo LWW por unidades + reasignación + fecha admin + journal).
  - M `backend/app/services/movimiento_corte_service.py` (solo saldos por asignación + desconocido; `corte_bloqueado` intacto).
  - M `backend/app/routers/cortes.py` (solo PATCH con instante/bases/unidades + `barbero_id`/`momento_real` admin + `GET /mi/justificantes`).
  - M `backend/app/routers/sync.py` (solo `editar/anular_v2` + intervenciones; sin pull).
  - C `backend/app/models/intervencion_corte.py` (solo tabla pendiente de intervención).
  - M `backend/app/schemas/corte.py` (solo campos LWW/reasignación + DTO justificantes; `CortePersonal` intacto).
  - M `backend/tests/test_cortes.py` + M `backend/tests/test_sync_roles.py` (solo tests nuevos).
  - M/C frontend outbox edición (solo `crearOperacionEdicion/Anulacion`, sender, mini-form en MisSaldos, estados) + `npm run build`.
- Prohibido: pull historial/cobertura, jornadas/cierres/imputación, reasignación fuera de admin+motivo, reapertura de cierres, `create_all` en import, `pytest tests/` global, cualquier `upgrade` contra base real.
- Precaución DB real vigente: hash de `backend/barberia.db` antes/después, pytest solo por archivo, upgrades solo TEMP.

### Tareas en orden de dependencia

- [x] **T66. Relojes LWW + migración 008.** RF-36 (base).
  - Dependencias: ninguna dentro del paquete.
  - Tests primero: `history` muestra `008`; `upgrade` en TEMP legacy+filas agrega columnas (`version`, 3 relojes por unidad, `profesional_id`, `deuda/comision_conocida`) con backfill (profesional = titular actual en comisionadas, conocido = sí) preservando datos; repetir no-op.
  - Implementar: columnas nullable + `version` default 1; sin tocar `fecha` ni snapshots.
  - Hecho cuando: escenarios TEMP verificados y prohibido aplicar contra base real.

- [x] **T67. LWW en PATCH online.** RF-36/RF-42 (parciales).
  - Dependencias: T66.
  - Tests primero: dos ediciones concurrentes de método (instantes distintos) → gana la tardía; método + servicio concurrentes → ambas se conservan (unidades distintas); dos del grupo financiero → ganador íntegro (sin mezclar precio de uno con % de otro); edición con instante anterior al ganador → omitida con causa; anulado + edición tardía → 409 (terminal prevalece).
  - Implementar: `instante_cambio` + `bases` por unidad en PATCH; grupo financiero atómico; respuesta con unidades aplicadas/omitidas; journal con `operacion_uuid`.
  - Hecho cuando: tests en verde y ningún silencio ante conflicto (omitida con causa).

- [x] **T68. Sync editar/anular_v2 + RF-40.** RF-30/RF-32/RF-36/RF-40 (parciales).
  - Dependencias: T67.
  - Tests primero: edición offline con bases viejas → LWW igual que online; edición que llega tras bloqueo/pago → 202 `pendiente_intervencion` conservada sin aplicar (no 409, no auto-aplicación); anulación no autorizada tras bloqueo → no terminaliza; replay misma UUID no duplica intervención.
  - Implementar: acciones sync + tabla `intervenciones_corte` + `POST .../intervenciones/{uuid}/resolver` admin (aplicar con motivo o descartar con motivo, journaled).
  - Hecho cuando: tests en verde y ninguna edición bloqueada se aplica sola.

- [x] **T69. Reasignación admin.** RF-47 (parcial).
  - Dependencias: T66–T67.
  - Tests primero: admin cambia barbero con motivo → 200 con precio conservado + % actual del nuevo + reparto nuevo; pagos anteriores del profesional previo siguen en journal sin trasladarse (saldos del nuevo parten de su propio neto); fecha futura → 400; barbero → 403.
  - Implementar: `barbero_id` + `momento_real` en PATCH (solo admin + motivo); grupo financiero incluye barbero; journal con antes/después de titular.
  - Hecho cuando: tests en verde y el nuevo neto no hereda pagos ajenos.

- [x] **T70. Revocación + justificantes.** RF-48 (parcial), RNF-5.
  - Dependencias: T69.
  - Tests primero: anterior → `GET /{id}` 404 + historial sin el corte; `GET /mi/justificantes` → solo sus filas comisionadas con importes propios (detector T17 limpio); nuevo titular no ve nada del anterior y viceversa.
  - Implementar: filtro por titular vigente + endpoint justificantes (filas `profesional_id` propio); mismo aislamiento en outbox local (solo filas propias).
  - Hecho cuando: verdes sin filtraciones en ningún sentido.

- [x] **T71. Históricos desconocidos + evidencia admin.** RF-44/RF-54 (parciales).
  - Dependencias: T66 (columnas).
  - Tests primero: corte marcado desconocido → saldos con estado `desconocido`, restante/excedente 0, obligación registrada visible pero no como deuda; admin completa con evidencia → conocido + journal (sin sustituir fecha por `now()`); barbero no puede completar (403).
  - Implementar: `deuda/comision_conocida` en saldos/DTOs + `POST .../evidencia-financiera` solo admin.
  - Hecho cuando: tests en verde y ningún histórico inventa deuda.

- [x] **T72. Frontend: edición offline + estados.** RF-28–30/RF-57 (parciales), RNF-4.
  - Dependencias: T67–T68.
  - Tests primero (node, patrón T50–T64): `crearOperacionEdicion/Anulacion` (UUID + instante único + bases); `npm run build` en verde.
  - Implementar: outbox + sender con cadena + mini-form de corrección en MisSaldos (servicio/método sobre no bloqueados) + estados (omitida/intervención/desconocido/justificantes visibles).
  - Hecho cuando: tests node + build en verde, sin `any` ni aritmética float nueva.

- [x] **T73. Regresión total y cierre del paquete.** RF-36/RF-40/RF-42/RF-44/RF-47/RF-48/RF-54 (parciales), RNF-3/RNF-5/RNF-6.
  - Dependencias: T66–T72.
  - Ejecutar por archivo las suites tocadas + suite aislada del paquete 1 + tests node + `npm run build`, todo en verde, con precaución DB real + gate de migración registrados (ningún `upgrade` contra base real ejecutado).
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 11.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Evidencia futura (paquete 10)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T66 | Rojo real: `AttributeError` (version/relojes/profesional inexistentes) + `history` en 007 | Verde: `122 passed` (3 archivos) + `008` en TEMP (legacy + filas: 6 columnas + backfill version 1 y profesional solo comisionada; repetir no-op) | DB estable; `corte.py` (version + 3 relojes + conocido nullable) + `finanzas_corte.py` (profesional_id) + `008` (ADD nullable + backfill solo nulos) + abonos/compensaciones/devoluciones nuevas con titular (cliente NULL). `fecha` intacta. |
| T67 | Rojo real: doble failed (`unidades` ausente; grupo mezclable); anulación prevalece ya en verde (T45) | Verde: `125 passed` (3 archivos) | DB estable; `schemas/corte.py` (`instante/bases/operacion_uuid` + `CorteEdicionResponse` aditivo) + `edicion_corte_service.py` (LWW por unidad, grupo atómico, version+1 por cambio aplicado) + `cortes.py` (journal con unidades/op/bases). Resolución solo por instante (bases informativas en journal); empate aplica al último. |
| T68 | Rojo real: cuádruple failed (acciones desconocidas → 409) + `NameError: MetodoPago` en el resolvedor | Verde: `106 passed` (2 archivos) + `009` en TEMP (vacía/legacy/repetir) | Divulgación: `barberia.db` ganó la tabla vacía `intervenciones_corte` por `create_all` histórico (0 filas, legacy intacto; nuevo baseline `79facc3f…`). `sync.py` (editar/anular_v2 con LWW por instante; bloqueado barbero → 202 intervención idempotente; admin exige motivo; anulado → 409) + `intervencion_corte.py` + `009` (nueva, con guard) + resolvedor manual aplicar/descartar con journal + tests. Desvío honesto: migración `009` no estaba en la lista del paquete (regularizada aquí, como P2-6 del paquete 9). |
| T69 | Rojo real: triple failed (422 sin `barbero_id/momento_real` en schema) | Verde: `132 passed` (3 archivos) | DB estable; `schemas/corte.py` (`barbero_id/momento_real`) + `edicion_corte_service.py` (barbero entra al grupo financiero: precio conservado + % nuevo; momento con reloj propio) + `cortes.py` (403 barbero reasigna, 400 barbero fecha / futuro / sin motivo) + `saldos` comisión solo del titular vigente (cliente intacto; sin regresiones: filas API siempre con profesional). Inactivo con % permitido (sin check de activo, RF-56). |
| T70 | Rojo real: 404 sin listado (revocación ya en verde por titularidad T69) | Verde: `134 passed` (3 archivos) | DB estable; `cortes.py` (GET `/mi/justificantes` por `profesional_id`, antes de `/{corte_id}`) + `schemas/corte.py` (`JustificanteResponse` sin titular ni ajenos) + `test_cortes.py` (404 + historial limpio + justificantes propios/detector/B vacío). Outbox local ya aísla por actor (T53, sin código nuevo). |
| T71 | Rojo real: doble 404 (sin endpoint evidencia) | Verde: `136 passed` (3 archivos) | DB estable; `movimientos_corte.py` (`conocido` en DTO) + `movimiento_corte_service.py` (desconocido: sin restante/excedente, importes visibles, fecha intacta) + `cortes.py` (POST evidencia solo admin 403 + journal EVIDENCIA) + `schemas/auditoria` (acción EVIDENCIA, sin migración en SQLite) + tests. Nulo = conocido (filas nuevas siempre conocidas). |
| T72 | Rojo real: `ROJO T72: faltan crearOperacionEdicion/Anulacion` (exit 1) | Verde: `VERDE T72` + T50/T54 + `npm run build` OK (exit 0) | Solo frontend: `operacionesCortes.ts` (edición con cambios validados + anulación terminal) + `scripts/t72-test.mjs` + `db.ts` (`edicion/anulacion` + `corteIdServidor`, sin bump) + `useSync.ts` (sender con id conocido o cadena + 202→revisión) + `MisSaldos.tsx` (mini-form método + anular con confirm + badge desconocido + justificantes). Sin `any`; sin aritmética float nueva. |
| T73 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde: `140 + 2 + 8 + 10 + 2` por archivo (toda la suite backend) + `167 passed` aislada + 6 node frontend + `npm run build` OK (exit 0) | DB estable en baseline (`79facc3f…` tras tabla vacía 009 por `create_all`); ningún `upgrade` contra base real ejecutado (008/009 solo TEMP); `git status` solo este documento (+ journal efímero de test retirado). Paquete 10 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 11. |

### Cierre del paquete 10 (revisión independiente)

`sdd-reviewer`: veredicto **APROBADO PAQUETE 10** sin tocar archivos. Re-ejecutó todo (140 + 22 + 167 + 6 node + build), migraciones 008/009 en copia TEMP con guards, hash DB idéntico, constitución y códigos exactos. Grupo atómico sin mezcla; unknown sobre anulado en orden correcto; saldos por titular sin traslados. P2 no bloqueantes: (1) `bases`/`version` informativas (trazabilidad futura); (2) empate sin tiebreak por UUID (aceptable; considerar en pull); (3) aplicar-intervención gana LWW con now (corrección autorizada, trazada); (4) endurecer backfill 008 ante `create_all` previo en rollout; (5) resúmenes sin `desconocido` (pendiente paquete acumulados/jornadas); (6) deudas P2 heredadas del paquete 9. El cierre no autoriza paquete 11 ni declara la spec implementada.

---

## Paquete 11 — Jornadas, cierres inmutables e imputación

Estado: **tareas redactadas, pendientes de aprobación para implementar**. Paquetes 1–10 cerrados, no rehacer.

Aprobación recibida: 5 preguntas de casos límite respondidas por el usuario (2026-10-09). No se autoriza implementación por esta redacción.

### Decisiones del paquete (respuestas del usuario)

- Tamaño: **todo junto** (~8 tareas) en vez de dividir en 11a/11b.
- Legacy: **intacto + nuevo** (cierre actual sin tocar; jornada/cierre nuevo en tablas y endpoints nuevos).
- Sync: **corregirlo** (`crear_corte_v2` conserva `momento_real`; base de jornada real y tardíos).
- Acumulados: **nuevos** (endpoints versionados; resúmenes/reportes existentes intactos).
- Frontend: **UI completa** (caja admin con apertura/cierre/pendientes/devengado vs caja + estados en vistas barbero).

### Alcance y límites

- Ocho tareas de 20–30 minutos: estimación 4–5 horas.
- Cobertura **parcial**: RF-24 (bloqueo por pertenencia), RF-39 (ajustes sobre cerrados sin reabrir), RF-45 (servicios vs dinero por jornada real + ajuste), RF-49 (tardíos vinculados por ajuste), RF-50 (pendiente de imputación con saldo + pide apertura), RF-51 (momento full: reloj + sync), RF-52/RF-12 (acumulados nuevos día/semana/mes/total, devengado vs caja, desconocidos aparte). No afirma pull RF-55, liquidaciones/nómina, reaperturas, ni cumplimiento integral.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - C `backend/app/models/jornada_caja.py` (`JornadaCaja` + `PertenenciaCierre`) y C `backend/app/models/imputacion_corte.py` (`ImputacionMovimiento` + `AjusteCierre`).
  - C `backend/alembic/versions/010_jornadas_caja.py` y C `backend/alembic/versions/011_imputacion_corte.py` (solo CREATE TABLE con guard, patrón 009).
  - C `backend/app/services/jornada_service.py` (solo `fecha_negocio` pura con zoneinfo + regla de imputación; sin commit).
  - M `backend/app/services/movimiento_corte_service.py` (solo hook de imputación al aceptar; saldos intactos).
  - M `backend/app/services/corte_service.py` (solo conservar `momento_real` recibido; sin jornada en el servicio).
  - M `backend/app/routers/sync.py` (solo `momento_real` en `crear_corte_v2` + jornada en respuestas; sin pull).
  - C `backend/app/routers/jornadas.py` (solo apertura/cierre/resumen-caja/imputar/acumulados nuevos; legacy intacto).
  - M `backend/app/routers/cortes.py` (solo guards de pertenencia en PATCH/anular + sync-edición; resúmenes viejos intactos).
  - M `backend/tests/test_cortes.py` + M `backend/tests/test_sync_roles.py` + C `backend/tests/test_jornadas.py` (solo tests nuevos).
  - M `frontend/src/pages/CierreCaja.tsx` (nuevo flujo) + M `frontend/src/pages/MisSaldos.tsx` (estados imputación) + C `frontend/src/services/cajaVista.ts` + C `frontend/scripts/t81-test.mjs` (patrón node).
- Prohibido: tocar `cierre_caja.py`/router/schema legacy, reinterpretar `total_cortes`, inferir pertenencias por fecha, apertura automática o por recibir dinero, reapertura de cierres, `create_all` en import, `pytest tests/` global, cualquier `upgrade` contra base real.
- Precaución DB real vigente: hash de `backend/barberia.db` antes/después, pytest solo por archivo, upgrades solo TEMP.

### Tareas en orden de dependencia

- [x] **T74. JornadaCaja + fecha de negocio.** RF-45 (base), RNF-2.
  - Dependencias: ninguna dentro del paquete.
  - Tests primero: `history` muestra `010`; `fecha_negocio` pura (`2026-10-08T02:59Z` → jornada 07, `03:01Z` → 08, zona `America/Argentina/Buenos_Aires`); apertura admin crea `abierta`, segunda apertura → 409; cierre deja `cerrada` inmutable; barbero abre/cierra → 403.
  - Implementar: `models/jornada_caja.py` + `010` (CREATE con guard) + `services/jornada_service.py` + `POST /api/jornadas/abrir|cerrar` solo admin.
  - Hecho cuando: TEMP + tests en verde y ninguna apertura automática existe en el código.

- [x] **T75. Imputación al aceptar.** RF-45/RF-50 (parciales).
  - Dependencias: T74.
  - Tests primero: abono con jornada real abierta → `imputado` allí; real cerrada + abierta actual → ajuste a la actual con referencia; sin abierta → `pendiente` + pide apertura (saldo igual se mueve); `history` con `011`.
  - Implementar: `models/imputacion_corte.py` + `011` + regla en `jornada_service` + hook en `registrar_abono`/sync (misma UoW, sin commit).
  - Hecho cuando: tests en verde y ningún dinero aceptado queda sin estado de imputación.

- [x] **T76. Pertenencia, bloqueo y tardíos + momento en sync.** RF-24/RF-49/RF-51 (parciales).
  - Dependencias: T74–T75.
  - Tests primero: cierre de jornada bloquea sus cortes para el barbero (PATCH/anular/sync-edición → 409 o intervención); corte tardío aceptado después → vinculado por ajuste sin tocar el snapshot (RF-49); `crear_corte_v2` con `momento_real` pasado lo conserva (no `now`); fecha compartida con cierre legacy NO bloquea (sin evidencia no hay pertenencia).
  - Implementar: `PertenenciaCierre` + guards + `momento_real` en `_sincronizar_corte_v2` + `AjusteCierre` para tardíos.
  - Hecho cuando: tests en verde y ningún histórico se bloquea por fecha inferida.

- [x] **T77. Resumen de caja nuevo + cierre inmutable.** RF-39/RF-45 (parciales), RNF-3.
  - Dependencias: T74–T76.
  - Tests primero: `GET /api/jornadas/resumen` separa devengado (servicios) de cobros/pagos por método + ajustes + desconocidos aparte; corrección sobre cerrado genera `AjusteCierre` referenciado sin mutar el original; `total_cortes` legacy intacto en su endpoint.
  - Implementar: resumen nuevo + cierre del protocolo (snapshot propio, no aportado) + `AjusteCierre` en correcciones.
  - Hecho cuando: tests en verde y el cierre original nunca muta.

- [x] **T78. Acumulados nuevos.** RF-52/RF-12 (parciales).
  - Dependencias: T74–T77.
  - Tests primero: `GET /api/jornadas/acumulados` con día/semana Lun–Dom/mes/total en jornada de negocio; comisiones por momento servicio, dinero por momento movimiento; imputación aparte si difiere; pendientes/revisión/desconocidos sin mezclarse con confirmados; resúmenes viejos intactos.
  - Implementar: endpoints nuevos versionados con límites explícitos (semana cerrada Lun–Dom, mes calendario, total acotado).
  - Hecho cuando: tests en verde y ningún acumulado incompleto se presenta como definitivo.

- [x] **T79. UI caja admin.** RNF-4.
  - Dependencias: T74–T78.
  - Tests primero (node, patrón T50–T72): `cajaVista.ts` (estados jornada, devengado vs caja, pendientes con acción); `npm run build` en verde.
  - Implementar: `CierreCaja.tsx` con apertura/cierre/pendientes/resumen nuevo (sin `parseFloat` nuevo); legacy del formulario snapshot retirado del flujo (endpoint viejo intacto).
  - Hecho cuando: tests node + build en verde, sin `any` ni aritmética float nueva.

- [x] **T80. UI barbero: imputación y cobertura.** RF-12/RF-53 (parciales), RNF-4.
  - Dependencias: T75–T78.
  - Tests primero: `MisSaldos.tsx` muestra pendiente de imputación con saldo + motivo de solicitud de apertura; desconocidos ya visibles (T64/T71) sin cambios; build en verde.
  - Implementar: badges/estados desde los endpoints nuevos; sin rediseño.
  - Hecho cuando: build + tests en verde y ningún estado financiero queda sin mostrar.

- [x] **T81. Regresión total y cierre del paquete.** RF-24/RF-39/RF-45/RF-49/RF-50/RF-51/RF-52 (parciales), RNF-2/RNF-3/RNF-5/RNF-6.
  - Dependencias: T74–T80.
  - Ejecutar por archivo las suites tocadas + suite aislada del paquete 1 + tests node + `npm run build`, todo en verde, con precaución DB real + gate de migración registrados (ningún `upgrade` contra base real ejecutado).
  - Registrar comandos/resultados en la evidencia de abajo y actualizar el estado sin declarar implementada la spec completa. El cierre requiere revisión independiente (`sdd-reviewer`) y no autoriza paquete 12.
  - Hecho cuando: todo lo anterior en verde, solo los archivos autorizados cambiaron y queda solicitada la revisión de cierre.

### Evidencia futura (paquete 11)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T74 | Rojo real: cuádruple failed (404 sin router/modelo) + `ZoneInfoNotFoundError` en Windows | Verde: `27 passed` (2 archivos) + `010` en TEMP (vacía/guard/repetir) | Divulgación: `barberia.db` ganó tablas vacías `jornadas_caja` + `pertenencias_cierre` por `create_all` (0 filas, legacy intacto; baseline `8c5a43be…`). `jornada_caja.py` + `010` + `jornada_service.py` (fecha_negocio pura, abrir/cerrar con 409, sin apertura automática) + `jornadas.py` (solo admin 403) + `main.py` (registro) + `requirements.txt` (`tzdata`, solo datos de zona). |
| T75 | Rojo real: cuádruple failed (sin modelo/regla/hook) | Verde: `102 passed` (2 archivos) + `011` en TEMP (vacía/guard/repetir) | Divulgación: `barberia.db` ganó tabla vacía `imputaciones_movimiento` por `create_all` (0 filas; baseline `86e6ea41…`). `imputacion_corte.py` + `011` + `jornada_service` (real abierta → allí; cerrada + abierta actual → ajuste; sin abierta → pendiente; una sola abierta) + hook en abono/compensación/devolución/resolución + `imputacion` en respuesta. Saldos intactos (pendiente igual mueve saldo). |
| T76 | Rojo real: cuádruple failed (sin pertenencia/vínculo/momento); 2 ajustes honestos en tests (corte dentro de la jornada vía retroactivo admin; campo legacy faltante) | Verde: `106 passed` (2 archivos) + `012` en TEMP (vacía/guard/repetir) | Divulgación: `barberia.db` ganó tabla vacía `ajustes_cierre` por `create_all` (0 filas; baseline `8ca1788e…`). `jornada_caja.py` (`es_tardio` + `AjusteCierre`) + `012` + `jornada_service` (incorporar al cerrar, tardío por ajuste, `corte_en_cierre`) + `corte_bloqueado` con pertenencia verificada + momento en sync v2 (con hash; sin journals viejos con UUID en producción). Legacy-fecha no bloquea por construcción. |
| T77 | Rojo real: doble failed (404 sin resumen + sin ajuste); legacy intacto en verde | Verde: `109 passed` (2 archivos) | DB estable; `jornadas.py` (GET resumen: devengado por snapshot si cerrada / vivo si abierta, cobros/pagos netos por imputación destino + métodos, ajustes/desconocidos/pendientes aparte) + `jornada_service` (`ajuste_por_correccion`) + hooks PATCH/anular (solo con pertenencia). Cierre original nunca muta; `total_cortes` legacy intacto. |
| T78 | Rojo real: doble 404 (sin endpoint); corrección honesta al paso (revisiones por ventana, no globales) | Verde: `112 passed` (2 archivos) | DB estable; `jornadas.py` (GET acumulados día/semana-Lun–Dom/mes/total acotado: comisiones por servicio, dinero por saldos, revisión/excedentes/desconocidos aparte) + tests. Resúmenes viejos intactos; estimada de sync sigue solo-dispositivo (sin pull). |
| T79 | Rojo real: `ROJO T79: falta src/services/cajaVista.ts` (exit 1); función enredada simplificada antes del verde | Verde: `VERDE T79` + `npm run build` OK (exit 0) | Solo frontend: `cajaVista.ts` (puro, sin float) + `scripts/t79-test.mjs` + `CierreCaja.tsx` reescrita (apertura/cierre/pendientes/resumen nuevo, 0 `parseFloat`; formulario snapshot legacy fuera de la pantalla, endpoint intacto). Sin `any`. |
| T80 | Rojo real: `ROJO T80: falta resumenImputacion` (exit 1) | Verde: `VERDE T80` + T64 + `npm run build` OK (exit 0) | Solo frontend: `saldosVista.ts` (`resumenImputacion` + campo) + `scripts/t80-test.mjs` + `MisSaldos.tsx` (aviso con saldo y solicitud de apertura). Desconocidos ya visibles (T64/T71, sin cambios). |
| T81 | Sin rojo: solo verificación final, sin cambios productivos nuevos | Verde por archivo verificada por revisión: `test_cortes` 94 + `test_sync_roles` 19 + `test_roles_permisos` 23 + `test_t9_t10_t11` 10 + `test_invariante_admin` 8 + `test_auth` 2 + `test_usuarios_auditoria` 4 + `test_auditoria_router` 2 + `test_jornadas` 18 = 180 total (el `154 + 14 + 12` original no reproduce ese desglose) + `167 passed` aislada + 8 node frontend (T50/T53/T54/T55/T64/T72/T79/T80, reejecutados en verde por la revisión) + `npm run build` OK (exit 0). Revisión agregó 2 tests (`resumen_cerrada_usa_snapshot_congelado`, `test_jornadas_lecturas_solo_admin`): `test_jornadas` 20, total 182. | DB estable en baseline (`8ca1788e…` tras tabla vacía 012 por `create_all`); ningún `upgrade` contra base real ejecutado (010/011/012 solo TEMP); cambios ajenos en AGENTS/MEMORY/mcp/plantilla preservados sin tocar. Paquete 11 completo en cobertura parcial, sin declarar spec implementada; cierre pendiente de revisión independiente (`sdd-reviewer`), que no autoriza paquete 12. |

### Cierre del paquete 11 (revisión independiente)

`sdd-reviewer`: veredicto **APROBADO PAQUETE 11**. Re-ejecutó todo (182 + 167 + 8 node + build), migraciones 010/011/012 en TEMP con guards, hash DB idéntico, constitución y códigos exactos. Correcciones aplicadas por la revisión y re-verificadas por el coordinador: 2 tests de cobertura (snapshot congelado en cerrada + 403 barbero en lecturas) y fila T81 con desglose real. P2 no bloqueantes: (1) sin endpoint para imputar pendientes al abrir; (2) acumulados agrupan por momento servicio (no movimiento); (3) hash sync con momento sin normalizar; (4) `upgrade` en TEMP vacía falla en 008 (deuda paquete 10); (5) anulados post-cierre en devengado; (6) sin test de ausencia de sensibles (riesgo bajo, admin-only). El cierre no autoriza paquete 12 ni declara la spec implementada.

---

## Paquete 12 — Cierre integral (posible último de la spec)

Estado: **T82–T88 con avances implementados; revisión T89 ejecutada y cierre bloqueado**. Dictamen independiente: REQUIERE CORRECCIONES (P1-1–P1-8 de `cierre.md`). No declarar spec implementada ni aceptar el paquete integral por los tests verdes.

Aprobación recibida: 5 preguntas de casos límite respondidas por el usuario (2026-10-09). No se autoriza implementación por esta redacción.

Continuación autorizada posteriormente: el usuario solicita continuar la resolución del último paquete y verificar funcionamiento. Esta ejecución completa únicamente T88 siguiendo el protocolo de una tarea por ejecución; T82–T87 ya estaban commiteadas al comenzar.

### Decisiones del paquete (respuestas del usuario)

- Pull RF-55: **diferir a spec hija** (`specs/003-pull-offline/`). «Completa salvo pull» era el objetivo condicionado a no encontrar otros bloqueantes; no es el resultado de T89. El dictamen detectó brechas adicionales no transferidas a la hija.
- Cliente typed: **toda la app** (no solo pantallas 002; `api.ts` legacy intacto donde no llegue).
- Imputar al abrir: **incluir** (`POST /jornadas/{id}/imputaciones`, idempotente + test).
- Deudas duras: **intentar** (endurecer UoW SQLite + fix 008 TEMP vacía + documentar límite multi-worker/PG; bóveda cifrada a spec hija por superficie criptográfica propia).
- E2E: **incluir** (Playwright prod + backend TEMP como evidencia de cierre).

### Alcance y límites

- Ocho tareas de 20–30 minutos: estimación 4–5 horas.
- Cobertura: RF-7/RF-12 (estimada/confirmada/pagada/pendiente), RF-33/RNF-5 (cuentas), RF-35 (catálogo), RF-41/RNF-1 (exactitud global frontend), RF-50 (imputar al abrir), RF-53 (revisión resuelta), RF-57 (resultados), RNF-2/RNF-3/RNF-4/RNF-6. Deudas que se intentan: erroneo-idempotente, evidencia en compensación positiva, replay-acuse, UUID-409, normalizar momento, carrera abonos (UoW), 008 vacía. Diferidos a spec hija: pull RF-55 completo, bóveda cifrada, protocolo PG completo, locale moneda.
- Archivos que podrá tocar este paquete cuando se autorice implementar:
  - C `frontend/src/services/cortesApi.ts` (solo fetch typed + codecs; `api.ts` intacto salvo lo listado).
  - M `frontend/src/pages/RegistroCortes.tsx`, `MisSaldos.tsx`, `DashboardBarbero.tsx`, `GestionProductos.tsx`, `GestionServicios.tsx`, `GestionUsuarios.tsx`, `CierreCaja.tsx` (solo exactitud; sin rediseño).
  - M `frontend/src/utils/formato.ts` (solo sobrecarga string-exacto; locale intacto).
  - M `backend/app/routers/jornadas.py` + M `backend/app/services/jornada_service.py` (solo imputar al abrir).
  - M `backend/app/routers/movimientos_corte.py` + M `backend/app/services/movimiento_corte_service.py` + M `backend/app/routers/sync.py` (solo idempotencia dura + normalización).
  - M `backend/alembic/versions/008_lww_reasignacion.py` (solo fix TEMP vacía; sin tocar upgrades verificados).
   - C `frontend/tests/e2e/*` (solo suite integral prod + TEMP) + C `specs/003-pull-offline/spec.md` (solo esqueleto de spec hija).
   - Correcciones mínimas encontradas por la verificación T88: M `frontend/src/hooks/useSync.ts` (excluir ediciones/anulaciones del sender de nuevos cortes) y M `backend/tests/test_jornadas.py` (ayer de negocio, no UTC). `routers/sync.py` conserva milisegundos al normalizar UTC, dentro del alcance de normalización existente. Sin requisitos de negocio nuevos.
- Prohibido: pull completo, bóveda, migración PG, reinterpretar legacy, `create_all` en import, `pytest tests/` global, cualquier `upgrade` contra base real.
- Precaución DB real vigente: hash de `backend/barberia.db` antes/después, pytest solo por archivo, upgrades solo TEMP.

### Tareas en orden de dependencia

- [x] **T82. Cliente typed core.** RNF-1/RNF-6.
  - Dependencias: ninguna dentro del paquete.
  - Tests primero (node, patrón T50–T80): `cortesApi.ts` conserva strings exactos del API (sin `Number()` global), codec dígitos en ambos sentidos, `formatearMoneda` acepta string exacto; `npm run build` en verde.
  - Implementar: fetch typed para 002 + sobrecarga `formatearMoneda(string)`; `api.ts` intacto.
  - Hecho cuando: tests node + build en verde y ningún string monetario pasa por float en el camino nuevo.

- [x] **T83. Pantallas 002 sin float.** RF-7/RF-12 (parciales), RNF-1.
  - Dependencias: T82.
  - Tests primero: `RegistroCortes` (estimada y cobro en centavos/centésimas puros, sin `toFixed/Math.round/*100`), `MisSaldos` y `DashboardBarbero` (display desde strings, `Number()` solo conteos); build en verde.
  - Hecho cuando: grep sin `parseFloat/toFixed(*100)/Math.round(*100)` en pantallas 002 y build en verde.

- [x] **T84. Resto de la app sin float.** RNF-1/RNF-4.
  - Dependencias: T82.
  - Tests primero: formularios y caja sin `Number(e.target.value)` monetario (codec de frontera), build en verde; locale y diseño intactos.
  - Hecho cuando: ningún input monetario de la app convierte por float y build en verde.

- [x] **T85. Imputar pendientes al abrir.** RF-50 (cierre), RNF-6.
  - Dependencias: ninguna (backend puro).
  - Tests primero: pendientes con real en la jornada que se abre → `IMPUTADA` con destino (idempotente, replay no duplica); sin real en ella → siguen pendientes; barbero → 403.
  - Implementar: `POST /api/jornadas/{id}/imputaciones` solo admin (misma UoW, sin auto-aplicar nada más).
  - Hecho cuando: tests en verde y ningún pendiente queda sin estado tras abrir su jornada.

- [x] **T86. Idempotencia dura.** RF-32/RF-41/RF-53 (cierre).
  - Dependencias: ninguna (backend puro).
  - Tests primero: erroneo re-ejecutable exige UUID (sin UUID → 409, no duplica); compensación positiva exige evidencia; replay `real` devuelve acuse (no 409); UUID movimiento con distinto payload → 409; momento normalizado (ISO equivalentes, mismo hash).
  - Implementar: normalizar `momento.isoformat()`, comparar hash en abonos, UUID obligatoria en resolución-erroneo, evidencia si compensación > 0.
  - Hecho cuando: tests en verde y ningún replay crea ni recalcula de más.

- [x] **T87. UoW dura SQLite + fix 008.** RNF-6 + gate despliegue.
  - Dependencias: ninguna.
  - Tests primero: carrera de abonos ordinarios paralelos no supera el saldo (serialización); `upgrade head` en TEMP vacía llega a head (008 tolera tablas ausentes); documentar límite multi-worker/PG en `plan.md`/tasks.
  - Implementar: serialización mínima en registro crítico + guard 008; sin protocolo PG (deuda de spec hija).
  - Hecho cuando: carrera y TEMP vacía en verde + límite documentado.

- [x] **T88. E2E integral.** Criterios de finalización, RNF-6.
  - Dependencias: T82–T87.
  - Tests primero (Playwright prod + backend TEMP, sin login fijo ni `import /src/`): barbero offline→sync→historial con momento real; exceso→revisión→resolución con excedente; bloqueo→intervención→aplicar; apertura sin conexión con datos previos; privacidad barbero/admin.
  - Hecho cuando: suite E2E en verde y cada criterio tiene evidencia o deuda explícita.

- [ ] **T89. Cierre documental + spec hija.** Cierre, RNF-6.
  - Dependencias: T82–T88.
  - Esqueleto `specs/003-pull-offline/spec.md` (alcance RF-55 + diseño plan §6.F–§7, en borrador, sin implementar); regresión total (suites + node + build); actualizar `tasks.md`/`MEMORY.md`/`spec.md` (estado implementada salvo pull); revisión `sdd-reviewer` de cierre.
  - Hecho cuando: todo en verde, spec 002 declarada completa salvo pull con hija redactada, y revisión de cierre emitida.
  - Resultado vigente: regresión, documentación y revisión realizadas; **criterio de aceptación NO satisfecho** por P1-1–P1-8. Se conserva el checkbox sin marcar en vez de redefinir «Hecho cuando» para fabricar cierre. Correcciones funcionales requieren un siguiente desglose autorizado.

### Evidencia futura (paquete 12)

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T82 | Rojo real: `ROJO T82` (exit 1) + harness (nodenext/extensión/import + firma fábrica) | Verde: `VERDE T82` + `npm run build` OK (exit 0) | Solo frontend: `cortesApi.ts` (nuevo, parseo exacto + codec reexportado, http inyectado) + `formato.ts` (`formatearMonedaExacta` por dígitos; `formatearMoneda(number)` intacto) + `scripts/t82-test.mjs`. `api.ts` intacto. |
| T83 | Rojo real: 8 puentes (toFixed redondeo, Math.round, Number, display) | Verde: `VERDE T83` + T82 + `npm run build` OK (exit 0) | Solo frontend + opt-out aditivo en `api.ts` (`X-Exacto`, default intacto): 3 páginas por `apiExacta` (strings), estimada/cobro en centavos, display con `formatearMonedaExacta`, `porcentajeACentesimas`/`numeroCatalogoACentavos` documentados. DB intacta. |
| T84 | Rojo real: 9 puentes (3 inputs + 3 displays + duplicado de interfaz) | Verde: `VERDE T84` + T82/T83 + `npm run build` OK (exit 0) | Solo frontend: `cortesApi.ts` (`validarPorcentajeStr`) + Gestion* (precio/porcentaje como strings validados, display exacto; conteos enteros intactos) + Reportes (vía exacta + interfaz única). Incidente honesto: script con `≤` truncó GestionUsuarios (consola Windows); restaurado por git y rehecho con ediciones. Locale/diseño intactos. |
| T85 | Rojo real: doble 404 (sin endpoint) | Verde: `116 passed` (2 archivos) | DB estable; `jornada_service.py` (`imputar_pendientes` idempotente por estado) + `jornadas.py` (POST solo admin 403/404) + tests (imputa, replay 0, solo su jornada, 403). Sin auto-aplicar nada más. |
| T86 | Rojo real: múltiple (409/400/acuse/hash sin implementar) | Verde histórico: `140 passed` (3 archivos) | DB estable; endurecimientos de UUID/evidencia/acuse y momento. Precisión de cierre: los casos 409 probados cubren concepto/importe, no comparación integral de corte/actor/tipo/método/momento ni colisión ajena (P1-4). No interpretar la evidencia histórica como garantía universal de payload. T88 corrigió la normalización para conservar milisegundos, sin truncar el instante real. |
| T87 | Rojo: carrera sin cobertura (test nuevo) + 008 fallaba en vacía (P2-4 confirmado); incidente: no-op unió def+docstring (reparado, sintaxis ok) | Verde: `118 passed` (2 archivos) + TEMP vacía a head | DB estable; `_candado_abono` en POST + sync (check+insert+commit; carrera 201+400 determinista) + guard backfill 008 (solo con tabla cortes). Límite monoproceso/multi-worker/PG documentado aquí y en código; sin protocolo PG. |
| T88 | Rojo del harness: import inexistente y email reservado en semilla (corregidos, no fallos productivos). Rojos productivos: comparación exacta del momento real falla por truncar microsegundos; corrección offline queda en revisión `servicio_inexistente` por enviarse como creación. Regresión: jornada de ayer UTC colisiona con hoy AR (409). | Verde final: `python tests/e2e/cierre_produccion.py` (salida 0, 4 recorridos con recarga y reapertura offline reales); backend `21 + 97 + 22 + 167 = 307 passed` por archivo; 11 scripts node verdes; `npm run build` OK. | Desde frontend: build + runner de producción (dist, proxy/API TEMP, puertos libres y cuentas aleatorias). Artefactos finales en `TEMP/opencode/t88_prod_mw4iybud` (log, screenshot, evidencia JSON); SHA256 de DB real intacto en cada corrida. `sync.py` normaliza UTC sin truncar milisegundos; `useSync.ts` separa tipos antes del envío; test de jornada usa fecha de negocio. Pytest por archivo en procesos separados, cwd y DATABASE_URL en TEMP: `test_sync_roles.py`, `test_cortes.py`, `test_jornadas.py`, `test_dinero_cortes_aislado.py`. Primera jornada: 1 fallo/21 verdes → corrección del test → 22 verdes. Node: todos `frontend/scripts/*-test.mjs`. Borrador ajeno `cierre_integral.py` preservado sin ejecutar ni modificar. Límites/criterios no cubiertos aquí explícitos en README y apartado siguiente. |
| T89 | Tarea documental/verificación, sin rojo artificial. Revisión detecta 8 grupos P1 adicionales al diferimiento RF-55; el Hecho cuando no es satisfecho por regresión verde. | **Regresión verde; aceptación bloqueada — REQUIERE CORRECCIONES.** 356 tests backend en 10 procesos por archivo + 11 scripts node + build + E2E producción; dos upgrades/current Alembic TEMP vacía a 012 verdes. | Documento `cierre.md` con matriz 57 RF/6 RNF, evidencias/limitaciones y reporte P1-1–P1-8; hija 003 en borrador, sin código/plan/tareas. `sdd-reviewer` independiente y segunda revisión documental: apta para registrar cierre bloqueado, no aprobación funcional. Logs backend `TEMP/opencode/t89_regresion_v15x_5aj`, E2E `t88_prod_oexu9eub`, migración `t89_alembic_4q8hjd8y`; hash real idéntico `8ca1788e3423205ad5462884549212ff533e8a30aaa80766dfaab3d28eea37ab`. Estado spec aprobada/implementación parcial; checkbox T89 sin marcar. Sin modificaciones funcionales en esta ejecución, migraciones reales, instalaciones, commits ni push. |

### Alcance probado y deudas de aceptación T88

- Evidencia E2E real: registro offline → recarga profunda → cerrar/reabrir Chromium offline → reconexión; misma UUID, momento real exacto y comisión personal; replay sin duplicado. Cobro 150/precio 100 → revisión visible → resolución administrativa API → excedente 50. Edición bloqueada → intervención sin autoaplicar → admin aplica. Privacidad en JSON/404, separación admin personal/global y ausencia de API en CacheStorage.
- No se atribuye cobertura de todos los criterios de finalización a esos cuatro recorridos. Matriz y revisión independiente T89 ejecutadas en `cierre.md`; dictamen REQUIERE CORRECCIONES, no aceptación integral.
- Pendientes de evidencia integrada T89: retroactivos y actualización/desactivación del catálogo; parciales cliente/comisión; compensaciones, devoluciones, anulación y reasignación; cierres/imputaciones; cambio de cuenta/respuestas tardías/concurrencia; accesibilidad y móvil. Los tests previos existen, no se declara aquí su validación integral.
- Diferidos por decisión previa: RF-55/pull e historial offline completo, bóveda y protocolo PG. La reapertura verificada usa registro/catálogo/outbox; `MisSaldos` aún depende de API. Resolución admin vía API, no UI administrativa.
- Bootstrap productivo `create_all` al importar sigue existente; la suite lo ejecuta solo con `DATABASE_URL` TEMP. No se ejecutó upgrade real ni pytest global, no se hicieron commits/push, y no se marca la spec completa como implementada.

---

## Paquete correctivo R01 — Sobre común y canonización pura aislada

Estado: **T90–T95 ejecutadas; APROBADO R01 y T95 por revisión independiente**.
Autorizaciones: T90 «Autorizo»; T91 «Sigue con la T91»; continuación de tareas
restantes con reviewer entre incrementos mediante una única autorización:
«Continúa con las que queden hasta desbloquear a T89». T92, T93 y T94 se
ejecutaron por separado y se revisaron antes de iniciar la siguiente tarea;
T95 verificada y revisada después. No hubo nuevas respuestas del usuario entre ellas.
Revisión del incremento READ ONLY `sdd-reviewer`: **T90 conforme, sin
bloqueantes**. No reejecutó tests ni aprueba el paquete R01 integral.
Revisión documental independiente: **APTO PARA APROBACIÓN DE TAREAS**,
sin bloqueantes R01. No es ejecución ni autorización de implementación.
Plan correctivo aprobado por el usuario. Solo T90–T95; T89 sigue `[ ]` y bloqueada
por P1-1–P1-8. Se preservan tareas/evidencias históricas, no se reutilizan como
resultados de R01. No se redactan tareas R02 ni posteriores.

### Alcance y límites

- Seis tareas de **20–30 min cada una**, estimación 2–3 h. Contrato obligatorio:
  `plan-correcciones.md`, sección final «Contrato exacto del paquete R01».
- Únicos archivos de código/tests FUTUROS: C
  `backend/app/services/comando_corte.py` y C
  `backend/tests/test_comando_corte_aislado.py`. Confirmados ausentes en lectura;
  tres `__init__.py` de la cadena vacíos. El par fue creado únicamente al ejecutar T90.
- Sobre común tipado y primitivas deterministas, no esquemas por acción v3.
  RF-32/RF-57 solo identidad original; RF-9/RF-51 solo precisión temporal;
  RF-41 solo precisión Decimal, RNF-1/RNF-2 parciales, RNF-6 verificación.
  No deduplicación efectiva, aceptación financiera, replay autorizado ni cumplimiento
  integral de esos RF. Los ocho P1 siguen abiertos tras el desglose.
- Sin API, DB, ORM/Pydantic, imports de aplicación ajenos al módulo puro, fixtures,
  dependencias/configuración, migraciones, frontend, saldo/roles, política de reloj,
  mapping o concordancia de hint. No modificar módulos/tests existentes ni conectar
  el nuevo módulo al flujo productivo. `dinero_cortes.py` queda intacto.
- Si una tarea excede su tiempo/alcance, detener y reducir/reproponer; no absorber
  DTOs/adaptadores, todo v3 ni trabajo posterior dentro de estas seis tareas.

### Protocolo futuro (requiere aprobación independiente)

1. Antes de ejecutar: revisar en lectura la cadena `app/__init__.py`,
   `app/services/__init__.py`, `tests/__init__.py`, imports del módulo/test y
   conftest/config/plugins/entorno de pytest, incluidos ascendientes pertinentes.
   La búsqueda sin coincidencias al desglosar no garantiza seguridad futura.
   Si algo puede importar app/abrir DB, parar; no cambiar config fuera de alcance.
2. Una tarea cada vez: tests primero, registrar rojo real, mínimo código, verde
   y regresión de este único archivo; marcar solo la tarea cumplida y parar.
   Si ya pasa, registrar verde inicial honesto, nunca fabricar fallos.
3. Imports del test exclusivamente stdlib, pytest existente y
   `app.services.comando_corte`; imports productivos exclusivamente stdlib.
   No importar `app.main`, database, modelos, routers, dinero ni tests ajenos.
4. Runner exclusivo desde `backend` en bash, idénticos flags al paquete 1:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_comando_corte_aislado.py -q
```

**No ejecutado en esta fase.** No pytest global/otros archivos, coverage de app,
node/build, instalaciones, consultas DB, migraciones ni imports-sonda de aplicación.
La evidencia futura registra comando, resultado inicial/final y límites reales;
ningún checkbox se marca por plan/revisión documental.

### Tareas en orden de dependencia

- [x] **T90. Fijar el sobre común tipado, referencias y omisión.** RF-32/RF-57 (identidad parcial), RNF-6. **20–30 min.**
  - Dependencias: ninguna de ejecución; gate de imports/config anterior antes de cualquier test.
  - Tests primero y creación futura de tipos comunes/`AUSENTE`/`NAMESPACE_CORTES` y `canonizar_comando` mínimo, conforme al contrato exacto; root dataclass, no parser de body ni DTOs por acción. Usar `datos={}` en esta tarea.
  - Instante obligatorio: fixture aware UTC y representación mínima exacta; normalización de offsets y casos temporales ampliados quedan para T93.
  - Verificar actor inyectado int positivo (bool/0/negativo/string rechazados), versión int 3, acción no vacía, modo online/offline; UUID operación/corte/padre en posiciones distintas. Referencias frozen UUID/ID son distintas, no aliases; ID bool/0 inválido.
  - Padre/momento: omisión distinta de null; hint valida solo estructura y queda fuera del JSON. Rechazar root dict/tipos comunes inválidos con errores genéricos sin eco. No validar concordancia, autorización ni negocio.
  - Hecho cuando: casos comunes aislados pasan con JSON root exacto, opcionales y referencias contratados, evidencia inicial/final registrada y ningún archivo ajeno al par autorizado modificado productivamente.

- [x] **T91. Canonizar el árbol original sin inferir tipos ni mutar entradas.** RF-32 (payload original parcial), RNF-6. **20–30 min.**
  - Dependencias: T90.
  - Tests primero para `ValorEntrada`: null/bool/int/string, dict anidado/listas, keys ordenadas sin importar inserción y listas con orden significativo. `"001"`, `"1.00"`, strings ISO/UUID aparentes y Unicode se conservan; sin trim ni defaults.
  - Omisión de key en `datos` difiere de null; `AUSENTE` anidado, float (también no finito), keys no string y tipos no admitidos se rechazan. Cubrir ciclo y colección compartida no cíclica; no hacer validación de campos por acción.
  - Verificar `json.dumps` con parámetros fijados, salida texto frozen sin referencias mutables y datos originales intactos; modificar el caller después no cambia la salida ya obtenida. Mantener errores seguros del contrato.
  - Hecho cuando: vectores de árbol/orden/rechazo/no mutación y regresión T90 pasan en el archivo aislado, con evidencia real; no conversión heurística ni nuevas dependencias.

- [x] **T92. Representar Decimal exacto firmado, sin reglas de abono.** RF-41 (solo precisión parcial), RNF-1 (representación parcial), RNF-6. **20–30 min.**
  - Dependencias: T91.
  - Tests primero: Decimal `1`/`1.0`/`1.00` → `"1.00"`, `1E+2` → `"100.00"`, `-12.30` conserva signo, ceros de ambos signos → `"0.00"`; valor grande como `1000000000000.01` sin tope comercial nuevo.
  - Rechazar `1.000`, fracciones subcentavo, NaN/sNaN/infinidades sin redondear. Cero/negativos válidos aquí no autorizan abono ordinario: no usar/importar su validador ni introducir positividad/rango/saldo.
  - Verificar contexto Decimal completo intacto con precisión baja, rounding/traps/flags distintos antes/después de éxito/error; conversión exacta por representación, no float/quantize dependiente del caller, inputs conservados.
  - Hecho cuando: vectores monetarios, errores genéricos y regresión T90–T91 pasan aisladamente y hay evidencia inicial/final sin negocio financiero ni modificación de `dinero_cortes`.

- [x] **T93. Normalizar instantes aware a UTC con microsegundos.** RF-9/RF-51 (representación parcial), RNF-2 (parcial), RNF-6. **20–30 min.**
  - Dependencias: T92.
  - Tests primero para instante común, momento opcional y datetime en `datos`: offsets distintos del mismo instante producen `YYYY-MM-DDTHH:MM:SS.ffffffZ` idéntico; un microsegundo distinto permanece distinto, también al cruzar día en UTC.
  - Rechazar naive/offset desconocido, date sin hora y normalización no representable con errores seguros. String que parece fecha permanece string, no parseado. No consultar hoy/reloj ni validar futuro/admin/desvío +5min.
  - Hecho cuando: equivalencia UTC, seis dígitos/microprecisión y rechazo sin zona pasan con regresión T90–T92, instantes de entrada intactos y evidencia registrada sin política temporal nueva.

- [x] **T94. Firmar JSON determinista y verificar la matriz de identidad.** RF-32/RF-57 (identidad parcial), RNF-6. **20–30 min.**
  - Dependencias: T90–T93.
  - Tests primero y `firmar_comando`: fixture pequeña con JSON literal esperado y SHA256 independiente de sus bytes UTF-8; 64 hex lowercase. Misma entrada/reordenar dict/offset equivalente/Decimal equivalente → mismos JSON/hash; reorder lista → distintos.
  - Parametrizar cambio de actor, UUID operación, referencia UUID/ID/corte, padre, acción, modo, instante/momento, key omitida/null y en `datos` concepto/tipo/importe/método/bases/motivo/evidencia/referencia original → JSON/hash distintos cuando cambia su representación normalizada.
  - Añadir/cambiar hint válido no altera JSON/hash, cambiar referencia UUID→ID sí; no consultar/afirmar mapping correcto. No usar hora del retry, defaults efectivos, snapshots ni token/transporte en la firma. Tipo de salida/texto inválido se rechaza genéricamente.
  - Hecho cuando: matriz y vector independiente pasan con regresión aislada; evidencia registrada distingue identidad de autorización/efecto único (no probados), y no hay integración HTTP/sync/journal.

- [x] **T95. Verificar aislamiento, contrato y evidencia exclusiva de R01.** RF-32/RF-57/RF-9/RF-51/RF-41 y RNF-1/RNF-2 (solo partes anteriores), RNF-6. **20–30 min.**
  - Dependencias: T90–T94.
  - Revisión en lectura de imports/config antes de ejecutar únicamente la suite del par nuevo; comprobar type hints, mensajes seguros, stdlib/pureza, entrada/contexto intactos, salida inmutable y límites del diff. No código de integración ni tests adicionales de otros paquetes.
  - Registrar resultados reproducibles en evidencia R01 y solicitar revisión independiente del paquete; no rojo artificial en verificación final. Ninguna evidencia histórica sustituye esta ejecución futura.
  - Hecho cuando: suite exclusiva verde con evidencia, solo el par autorizado cambiado productivamente, revisión de límites/contrato documentada y solicitud de cierre emitida. No significa aprobación independiente automática, cierre P1/T89/spec ni autorización de otra tarea/paquete; detenerse.

### Evidencia R01 (T90–T95 ejecutadas; cierre independiente aprobado)

Revisión de T91 READ ONLY `sdd-reviewer`: **conforme, sin bloqueantes**;
sin reejecutar tests ni validar integralmente el paquete/spec.

T95 ejecutada como verificación final, con verde inicial honesto; no se fabricó rojo.
Se solicita al coordinador revisión independiente `sdd-reviewer` de cierre R01.
Esta solicitud satisface la parte documental de T95, no acredita dictamen ya emitido.

Resultado posterior del coordinador: reviewer **APROBADO T92**, **APROBADO T93**,
**APROBADO T94** y finalmente **APROBADO R01 y T95**, sin bloqueantes acotados.
La revisión final reejecutó el runner exclusivo tras su propio gate READ ONLY:
**323 passed in 0.25s**. Las revisiones T92–T94 fueron READ ONLY sin reejecución.
No acredita deduplicación efectiva, autorización, mapping ni cierre de los ocho P1.

| Tarea | Resultado inicial / causa | Resultado final | Comando / observaciones |
|---|---|---|---|
| T90 | Rojo real: `1 error in 0.15s`, salida 2; colección falla con `ModuleNotFoundError: No module named 'app.services.comando_corte'` tras crear primero el test | Verde: `60 passed in 0.06s`, salida 0 | 2026-10-09, desde `backend`, ambas ejecuciones: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_comando_corte_aislado.py -q`. Gate READ ONLY: tres `__init__` vacíos, sin conftest/config pytest en backend ni ascendientes hasta raíz; Python 3.11.9/pytest 7.4.3 existentes, entrypoint instalado `anyio` deshabilitado por runner; variables pytest/PYTHONPATH/PYTHONSTARTUP sin valores inyectados. Sin imports-sonda de app. Tipos frozen/kw-only y campos exactos, marcador Enum, root exacto, actor/versión/acción/modo estrictos, refs UUID/ID distintas, UUID lowercase y nulo permitido, padre/momento omitidos vs null, identidades en posiciones distintas sin exigir desigualdad, hint positivo/null/ausente excluido sin comprobar concordancia, fixture UTC con seis dígitos y inputs intactos. Errores genéricos sin eco. Limitación temporal T90 explícita: solo `datos={}`; dict no vacío produce `ValueError('Entrada de comando inválida')`, nunca descarte silencioso, hasta T91; no allowlist de negocio. UTC aware mínimo común, sin matriz ampliada T93. Sin árbol T91, Decimal T92, firma T94 ni integración/autoridad/efecto único. Diff de esta ejecución: solo par nuevo (139/207 líneas) y este documento; cambios anteriores preservados, MEMORY no editada. Rama comprobada `feat/spec-002-paquete-12-cierre-integral`; sin commit/fetch/checkout, DB, otros tests, build, instalaciones ni migraciones. `git diff --check` limpio (advertencias LF/CRLF solamente). |
| T91 | Rojo real: `66 failed, 62 passed in 0.63s`, salida 1. El guard temporal T90 de datos no vacíos impedía aceptación y devolvía ValueError en vez de TypeError para tipos/keys inválidos. Los tres ciclos ya daban el error esperado por aquel guard, sin atribuirles detección de ciclos implementada. | Verde: `128 passed in 0.10s`, salida 0; regresión del archivo completo, incluidos los casos comunes T90 conservados. | 2026-10-09, cwd `backend`, rojo/verde con runner exclusivo: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_comando_corte_aislado.py -q`. Gate READ ONLY: cadena de tres __init__ vacíos; búsqueda sin conftest/config pytest ni AGENTS adicionales dentro de backend, config/ascendientes hasta raíz sin coincidencias; variables PYTEST/PYTHON sin inyección; Python 3.11.9/pytest 7.4.3, entrypoint anyio deshabilitado. Imports revisados: stdlib y único módulo puro + pytest; metadata de instalación consultada sin importar app. Copia lógica recursiva nueva, pila de IDs activos con finally (ciclos dict/list/mixtos rechazados; subárboles compartidos no cíclicos aceptados), null/bool/int/str exactos, UUID tipado convertido explícitamente a str, keys exactas str; listas significativas y dict ordenado por json.dumps con args fijos. Strings aparentes numéricos/ISO/UUID/Unicode/espacios intactos, omisión distinta de null y sin defaults. Float finito/NaN/infinidades, sentinel anidado, tuple/set/frozenset/bytes/bytearray/date/objeto/subclases/enums rechazados genéricamente sin eco; salida frozen texto sin alias y caller intacto antes de mutación posterior. Test del guard TEMPORAL T90 actualizado a aceptación T91, sin reescribir la evidencia histórica T90. Decimal y datetime en datos siguen explícitamente fail closed hasta T92/T93; UTC común mínimo T90 intacto, sin matriz temporal ampliada ni hash T94. RecursionError técnico traducido a ValueError genérico from None, sin límites nuevos de nodos/profundidad. Solo par autorizado y este documento editados; MEMORY a cargo del coordinador. Sin DB/imports de app ajenos, otros tests/build, instalaciones, migraciones ni commits. |
| T92 | Rojo real: `84 failed, 129 passed in 1.14s`, salida 1; el guard temporal T91 rechazaba todo Decimal con TypeError, tanto valores válidos como inválidos que requieren ValueError. La subclase Decimal ya se rechazaba correctamente. | Verde: `213 passed in 0.16s`, salida 0; 85 casos nuevos y 128 de regresión T90–T91, archivo completo. | 2026-10-09, desde `backend`, ambas ejecuciones: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_comando_corte_aislado.py -q`. Gate READ ONLY: tres __init__ vacíos, sin conftest/config pytest en backend/ascendientes hasta raíz; AST imports solo stdlib y pytest/módulo puro; Python 3.11.9/pytest 7.4.3 existentes, plugin anyio deshabilitado. Entorno sin PYTEST inyectado; PYTHONUSERBASE existente, runner fija PYTHONPATH/bytecode. Decimal exacto concreto por as_tuple y dígitos string, exponente entero >=-2 (no finitos con exponente simbólico rechazados), sin arithmetic/quantize/normalize/contexto privado ni conversión a entero gigante/float. Dos decimales, signo negativo y cero normalizado; 1/1.0/1.00 equivalentes, 1E+2, negativos y grandes 1000000000000.01, 1E+100 y 5000 dígitos; cero con exponente MAX_EMAX sin expansión gigante. Precisión excesiva incluso ceros, NaN/sNaN con payload/infinidades -> ValueError genérico seguro, subclase -> TypeError, sin eco/chaining. Identidad/as_tuple conservados y aceptación recursiva. Contexto completo/identidad intactos bajo prec=1, Emin=-2/Emax=2, ROUND_DOWN/UP, capitals=0/clamp=1, todos traps activos/inactivos y flags mixtos, ante éxito/error incluido sNaN. No existía un test separado invalidDecimal TEMP en el checkout T91: su guard temporal productivo se sustituye por el contrato T92 y se añade matriz ValueError, preservando íntegra evidencia histórica T91. Solo par autorizado y tasks; MEMORY a cargo del coordinador. Sin datetime en datos T93, hash T94, negocio de abonos/positividad/saldo/tope, dinero_cortes, DB/import app.main, otros tests/build/install/migraciones/commits/push. Hecho cuando verificado; solicitar reviewer antes del próximo incremento. |
| T93 | Rojo real: `25 failed, 245 passed in 0.59s`, salida 1; el guard temporal rechazaba datetime en datos con TypeError (válidos e inválidos que requieren ValueError). Los casos comunes ya pasaban, sin rojo artificial. | Verde: `270 passed in 0.21s`, salida 0; 57 casos nuevos y 213 de regresión T90–T92. | 2026-10-09, desde `backend`, ambas ejecuciones: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_comando_corte_aislado.py -q`. Gate READ ONLY: tres __init__ vacíos; sin conftest/config pytest en backend ni ascendientes hasta raíz; sin AGENTS adicional backend; AST de imports stdlib/pytest/único módulo puro. Python 3.11.9/pytest 7.4.3 existentes, entrypoint anyio deshabilitado; entorno sin PYTEST inyectado, PYTHONUSERBASE existente y runner fija PYTHONPATH/bytecode. Único cambio funcional: datetime exacto en árbol reutiliza helper UTC común existente (isoformat microseconds, año 0001 correctamente rellenado); helper ya normalizaba offsets y suprimía chaining con from None. Matriz en instante_cambio/momento_real/datos directos y anidados: offsets -03:00/+05:30 y subsegundo equivalentes, cruces día/año, seis dígitos incluidos ceros, microsegundo distinto, años 1/9999 representables; identidad/atributos de entrada intactos. Naive/utcoffset None, zona con error confidencial/offset inválido y overflow UTC por extremos rechazados con ValueError genérico, sin causa visible; date y subclase datetime con TypeError. Strings ISO no parseados; datetime y string canónico equivalen solo por representación. Solo par autorizado y tasks; MEMORY a cargo del coordinador, cambios ajenos conservados. Sin reloj/futuro/roles/política manual, SHA256 T94 ni integración; sin app.main/DB/otros tests/build/instalaciones/migraciones/commits/push. |
| T94 | Rojo real: `1 error in 0.14s`, salida 2; colección falla con `ImportError: cannot import name 'firmar_comando'` tras escribir primero los tests. No se atribuyen fallos de canonización a casos anteriores ni se fabricó un rojo por caso. | Verde: `323 passed in 0.27s`, salida 0; 53 casos nuevos y 270 de regresión T90–T93, archivo exclusivo. | 2026-10-09, desde `backend`, rojo/verde: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_comando_corte_aislado.py -q`. Gate READ ONLY anterior: tres __init__ vacíos; sin conftest/config pytest en backend y ascendientes hasta raíz ni AGENTS adicional backend; AST imports stdlib/pytest/único módulo puro. Python 3.11.9/pytest 7.4.3 existentes, plugin anyio deshabilitado, sin entorno PYTEST inyectado; PYTHONUSERBASE existente, runner fija PYTHONPATH/bytecode. Firma exacta del ComandoCanonico concreto/texto str concreto; SHA256 hexdigest sobre UTF-8, sin JSON parsing/recanonización ni certificación de texto fabricado (incluido vacío). UTF-8 surrogate inválido -> ValueError genérico, sin eco ni chaining visible; tipos/subclases inválidos -> TypeError genérico. Vector JSON literal con Unicode escapado/Decimal y SHA256 independiente calculado desde bytes del literal esperado, 64 hex lowercase. Matriz actor/UUID operación/referencia UUID o ID/corte/padre/acción/modo/instante y momento microprecisos/omisión-null; datos concepto/tipo/importe/método/bases/motivo/evidencia/ref original/origen temporal/lista. Dict insertion order, Decimal equivalentes y offsets equivalentes conservan JSON/hash; lista reordenada y cambios normalizados alteran ambos. Hints ausente/null/positivos no cambian hash ni prueban mapping. Datos/contexto Decimal completos intactos, salida no cambia tras mutación posterior. Solo par autorizado y tasks; MEMORY a cargo del coordinador, cambios anteriores preservados. Identidad parcial, no HMAC/autorización/deduplicación efectiva ni firma de snapshots/credenciales/transporte; sin integración HTTP/sync/journal, app.main, DB, otros tests/build/instalaciones/migraciones/commits/push. |
| T95 | Verificación final: verde inicial honesto, sin rojo artificial ni código/tests nuevos. | `323 passed in 0.28s`, salida 0; única ejecución del archivo completo T90–T94. | 2026-10-09, cwd `backend`: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTEST_ADDOPTS='' PYTEST_PLUGINS='' python -m pytest --confcutdir=tests --noconftest -p no:cacheprovider -o addopts= tests/test_comando_corte_aislado.py -q`. Gate READ ONLY previo: tres __init__ de cadena con 0 bytes/0 statements AST; búsqueda sin conftest/config pytest en backend ni ascendientes hasta raíz, sin AGENTS adicional backend. AST productivo: dataclasses/datetime/decimal/enum/hashlib/json/typing/uuid, exclusivamente stdlib; test: stdlib/pytest/único módulo puro. Todas las funciones revisadas con hints de parámetros/retorno, sin Any. Python 3.11.9/pytest 7.4.3 por metadata, entrypoint anyio deshabilitado; sin variables PYTEST inyectadas, PYTHONUSERBASE presente, runner fija PYTHONPATH/bytecode y vacía plugins/addopts. Contrato leído: tipos concretos/frozen/kw-only, actor inyectado, UUID/ID sin alias lookup, hint estructural excluido, omisión/null, copia lógica sin alias mutable, ciclo activo/compartidos, Decimal por dígitos sin contexto/arithmetic, UTC micropreciso sin reloj/política, JSON fijo y SHA256 UTF-8; errores genéricos sin eco y traducciones from None. Suite verifica entrada/contexto intactos y salida texto inmutable. Par ya creado por T90–T94, aún untracked (git diff --stat no lo incluye): 202/669 líneas; SHA256 antes/después idénticos: módulo `970a6474d615f3c330f030bfe5669b2386c45540656ab8829812d61ea990b4b1`, test `c2feb106718901b5f94d9a81e72c12b907443720ac9f942b4d60360da4bcd02e`. No código modificado en T95; solo este documento. Diff de archivos existentes sync.py/test_jornadas.py/useSync.ts ya presente al inicio, coincide con cambios T88 documentados y no se atribuye a R01; no afirmar checkout global limpio ni reconstrucción independiente de cada diff histórico sin baseline. Único código R01 es el par según alcance/evidencias T90–T94; ningún import/integración API/DB/ORM/HTTP/sync/journal. git diff --check limpio (advertencias LF/CRLF). Solicitud de revisión independiente final R01 emitida, dictamen pendiente; identidad/representación no prueban permisos, efecto único ni deduplicación efectiva. Sin otros tests/build/DB/migraciones/instalaciones/commits/push; MEMORY a cargo del coordinador. |

Ejecución detenida tras verificar «Hecho cuando» y marcar solo T95 (T90–T94 previas conservadas).
Revisión independiente final R01 emitida posteriormente: APROBADO R01 y T95.
R02 y fases siguientes no se inician sin el siguiente desglose/aprobación;
P1-1–P1-8 y T89 continúan bloqueados, sin declaración de spec implementada.

---

## Paquete correctivo R02 — Primer tramo R02a: slot durable/CAS aislado

Estado: **división/tareas aprobadas; implementación R02a autorizada con reviewer por Tx**.
Autorización posterior: «Sí, autorizo», al aprobar división, T96–T103 e
implementación R02a. No autoriza R02b ni otros paquetes.
Revisión independiente documental: **APTO PARA APROBACIÓN DE TAREAS R02a
Y DE LA DIVISIÓN R02a/R02b**, sin bloqueantes. No autoriza implementación.
Usuario «Sí» autoriza preparar las tareas R02, **no implementarlas**. R01 aprobado,
T90–T95 y su evidencia se conservan. El alcance completo de la fila R02 contiene
authStore/commit-first/token/401 y no cabe honestamente con el harness en diez
tareas de 20–30 min. Se propone R02a primero y R02b después, **sin mover esa
integración a R03**, sin tareas de R02b/R03+ ni nuevos paquetes globales.

### Alcance, archivos y gates futuros

- Contrato obligatorio: anexo final **«Contrato exacto R02»** de plan-correcciones.md.
  Ocho tareas T96–T103, **20–30 min cada una**, 2 h 40–4 h efectivas; coordinación
  y reviewer aparte. Si un incremento excede 30 min, parar y reducir/reproponer,
  no esconder integración completa o instalación dentro de una tarea.
- Fixtures incrementales: T96 sin importar módulos futuros, T97 sin repo aún
  inexistente y T98 con inicializador local disponible sin depender de T99.
- Archivos futuros exactos: C `frontend/src/services/baseDatosLocal.ts`, M
  `frontend/src/services/db.ts`, M `frontend/src/services/sesion.ts`, C
  `frontend/src/services/repoSesion.ts`, C
  `frontend/scripts/correcciones-sesion-test.mjs`, C
  `frontend/tests/aislados/sesion-idb.ts`, C
  `frontend/tests/aislados/sesion_idb.py`. Responsabilidades y ausencia comprobada
  de rutas nuevas en el contrato. No comodines productivos.
- Schema futuro v3 sobre head actual 2; slot inicial locked, sin tokens, epoch
  seguro y generación aleatoria con prefijo monotónico. Pendientes y filas
  ambiguas conservadas, no inferir actor desde auth/barbero_id. Sin wipe/reenvío.
- **No activar autoridad nueva** ni conectar login/logout/senders/vistas en R02a.
  authStore/api/cortesApi/useSync/UI y guards legacy permanecen intactos. No
  endurecer esRespuestaVigente legacy para bloquear usuarios por el slot locked
  aditivo. R02b requiere desglose/autorización posterior; R02a no completa R02.
- Cobertura parcial RF-29/RF-33/RNF-5 (infraestructura IDB, no flujo integrado),
  RNF-3 compatibilidad de exports/schema y RNF-6. P1-5 y todos los P1/T89 abiertos.
- Solo tras autorización para implementar: gate READ ONLY de imports/harness/config
  y herramientas existentes; una tarea, tests primero, registrar rojo/verde real,
  marcar solo esa tarea, parar y reviewer `sdd-reviewer` después de **cada Tx**.
  No fabricar rojo si ya pasa. Revisión final independiente del tramo, no automática.
- Runner futuro exclusivo desde frontend: `python tests/aislados/sesion_idb.py`.
  Invoca Node/script exacto para typecheck y bundle **test-only TEMP**, sin Vite
  config/PWA/App ni build productivo, y Chromium/IndexedDB nativos en perfil/contexto
  sintético y puerto/origen efímeros. DB `r02_prueba_<UUID>`, jamás barberia_db;
  dos páginas/conexiones del mismo origen para carreras. Sin API/backend/SQLite,
  localStorage, browserprofile real, dist/SW, suite global ni imports-sonda de app.
  Si faltan Vite/tsc/Playwright/Chromium existentes, parar; no instalaciones,
  fake-indexeddb nuevo, cambios package/lock ni npx con descarga. Más detalle en anexo.
- **En esta fase no ejecutar ninguno** de esos comandos, tests/build ni DB.
  Modificaciones/untracked anteriores preservados; no MEMORY/index (coordinador).

### Tareas futuras en orden de dependencia

- [x] **T96. Preparar harness test-only nativo y aislamiento verificable.** RNF-6. **20–30 min.**
  - Dependencias: aprobación de este desglose/división; gate READ ONLY de herramientas/imports antes de ejecutar.
  - Tests primero: smoke assertion de IDB nativo, rollback de una transacción sintética y reapertura de DB con nombre exclusivo; negativa para nombre vacío/barberia_db. Preparar solo script Node, runner Python y fixture TS.
  - Usar Vite/tsc locales para bundle test-only/typecheck acotado TEMP sin config/PWA/app, Playwright existente sin backend/build/dist; dos páginas del mismo origen en contexto nuevo. Smoke no acredita CAS productivo.
  - Hecho cuando: comando exclusivo ejecuta smoke nativo con salida reproducible, aislamiento/nombre/origen/imports/cleanup comprobados, sin tocar datos/perfiles reales ni instalar dependencias; evidencia y reviewer T96 registrados antes de seguir.

- [x] **T97. Extraer clase/schema sin singleton en la cadena de tests.** RNF-3 (parcial), RNF-6. **20–30 min.**
  - Dependencias: T96 revisada.
  - Tests primero: imports de clase sin abrir DB ni singleton; instanciar nombre sintético y comprobar schemas v1/v2/exports públicos equivalentes. Clase nueva recibe nombre explícito y proveedor de generación inicial preparado para T98.
  - Extraer a baseDatosLocal.ts tipos/clase actuales; db.ts reexporta tipos y mantiene singleton barberia_db, sin nuevos callers/open explícito. La fixture importa solo clase, sesion y luego repo, nunca db.ts.
  - Hecho cuando: compatibilidad de tipos/exportaciones y fixtures de schemas previos pasan con typecheck acotado; imports de harness no construyen/abren DB productiva; diff limitado, evidencia y reviewer T97 registrados.

- [x] **T98. Añadir v3 e inicializar slot locked conservando datos.** RF-29/RF-33 (infraestructura parcial), RNF-3/RNF-6. **20–30 min.**
  - Dependencias: T97 revisada; comprobar head sigue 2 o parar y corregir documentación.
  - Tests primero: instalación nueva y fixtures v1/v2→3 con cortes legacy sin actor demostrado, outbox pendiente/enviando/revisión y mapping; comprobar fila singleton locked actor null epoch0, valores/cantidades/UUID previos intactos y reopen sin reinicializar generación.
  - Inicializar en upgrade para previas y populate para fresh, dentro de tx nativa; generación inicial inyectada fuera de tx. Sin leer mirrors/auth ni inferir dueño/conversión/wipe/reset enviando.
  - Hecho cuando: tres vías de inicialización conservadora y reapertura pasan con un solo slot; autoridad no conectada a auth/UI/sync; evidencia y reviewer T98 registrados.

- [x] **T99. Fijar identidad, generación y decisiones puras del slot.** RF-33/RNF-5 (parciales), RNF-6. **20–30 min.**
  - Dependencias: T98 revisada.
  - Tests primero en sesion.ts: unión readonly activa/locked, validación unknown estricta, actor positivo seguro/epoch≥0, expected completo, CAS distinto sin revelar ganador; activa exige actor, locked null. Rechazar tipos inválidos/extra credenciales, copiar sin alias.
  - Transición misma cuenta también rota; generación E:UUID nuevo con epoch monotónico incluso UUID repetido en fixture, identidad ABA imposible; MAX_SAFE_INTEGER no incrementa/wrap; sin reloj/token/rol. Conservar funciones legacy sin cambios.
  - Hecho cuando: matriz pura y typecheck pasan, errores genéricos sin datos y ningún import DB/auth/storage nuevo en sesión; evidencia y reviewer T99 registrados.

- [x] **T100. Implementar lectura y CAS durable con competencia real.** RF-33/RNF-5 (parciales), RNF-6. **20–30 min.**
  - Dependencias: T99 revisada.
  - Tests primero para repoSesion inyectado: dos páginas/conexiones con mismo snapshot esperado compiten, una confirmada y otra conflicto; stale logout no invalida nueva cuenta; login mismo actor y A→B→A rotan; cerrar/reabrir conexión conserva slot ganador.
  - Leer/validar/comparar/escribir dentro de una rw del slot, resolver solo al commit exterior; no import singleton ni localStorage. Rechazar uso desde tx exterior, no éxito de subtransacción.
  - Hecho cuando: CAS y durabilidad nativos pasan, perdedor no escribe ni recibe datos del ganador, sin auth integration; evidencia y reviewer T100 registrados.

- [x] **T101. Componer guard y efectos IDB en la misma transacción.** RF-29/RF-33/RNF-5 (parciales), RNF-6. **20–30 min.**
  - Dependencias: T100 revisada.
  - Tests primero: efectos sobre fila outbox sintética con actor explícito y slot se confirman juntos; excepción tras mutación/slot provoca rollback de ambos; CAS desfasado nunca llama efectos. conSesionVigente comprueba slot activo y escribe fila en esa misma tx; transición concurrente no intercala check y escritura.
  - Implementar callbacks tipados/tablas declaradas de la misma instancia, sin any, nested tx independiente ni awaits de red/timer. Tabla de otra DB rechazada antes de escribir. Sin claims/proyección nuevos ni limpieza productiva de cortes legacy.
  - Hecho cuando: assertions IDB nativas comprueban contenido antes/después/rollback y ausencia de callback stale, no solo spies/Map o búsqueda textual; evidencia y reviewer T101 registrados.

- [x] **T102. Verificar fallo cerrado y no reparación destructiva.** RF-29/RF-33/RNF-5 (parciales), RNF-6. **20–30 min.**
  - Dependencias: T101 revisada.
  - Tests primero: slot ausente/corrupto/version incompatible en v3, overflow epoch, fallo lectura y aborto después de writes; ninguna confirmación ni callback stale, generación/pending/mapping intactos. Inyectar falla IDB controlada en fixtures nativas, no simular commit exitoso con Map.
  - Ajustar solo primitivas/repositorio/schema dentro del contrato; no recreate desde espejo ni inicializar epoch0 ante corrupción runtime. Locked válido solo recuperable por transición explícita CAS de login en futura integración, no autoauth aquí.
  - Hecho cuando: casos adversariales y regresión exclusiva pasan con fallo durable visible al caller y originales preservados; no fallback/storage ni activación parcial; evidencia y reviewer T102 registrados.

- [x] **T103. Cerrar evidencia del tramo aislado y solicitar revisión independiente.** RF-29/RF-33/RNF-5/RNF-3 (solo partes anteriores), RNF-6. **20–30 min.**
  - Dependencias: T96–T102 revisadas.
  - Revisar READ ONLY imports/config/diff y ejecutar únicamente runner R02a con fixtures nuevas; verde inicial honesto, sin rojo artificial ni nuevo código de integración. Registrar comandos/resultados/artifacts/aislamiento por tarea y solicitar reviewer de cierre.
  - Hecho cuando: runner exclusivo/typecheck acotado verdes, archivos/DBs sintéticos y preservación previa comprobados, límites y solicitud de revisión emitidos. Dictamen posterior se registra por separado; detenerse, sin R02b/R03+ ni cierre RF33/P1-5/T89.

### Evidencia futura R02a — vacía, ninguna ejecución autorizada por este desglose

| Tarea | Resultado inicial / causa | Resultado final | Comando / artefactos / límites | Reviewer posterior al incremento |
|---|---|---|---|---|
| T96 | Rojo real: `Preparación fallida, salida 1` (exit1); `preparacion.log` = `Cannot find module ...\scripts\correcciones-sesion-test.mjs` por script Node ausente. Tras corregir un error propio del script (raíz TEMP mal calculada con `dirname`), salida 1 de validación de destino; no se fabricó fallo. | `VERDE T96: nombres negativos, persistencia dos páginas, rollback, reopen y cleanup propios` (exit0), dos corridas verdes tras activar `publicDir:false`. | 2026-10-09, desde `frontend`: `python tests/aislados/sesion_idb.py`. Artefactos TEMP `t96_idb_69mzgzk8` y definitivo `t96_idb__j1jheka`. Script Node usa Vite programático `configFile:false, publicDir:false` + tsc local `--noEmit --strict` acotado al fixture, escribe solo `<artefactos>/bundle` (index.html + sesion.js) y valida destino bajo `TEMP/opencode`. Runner: servidor loopback efímero, contexto Chromium nuevo `service_workers=block`, dos páginas mismo origen, ruta aborta todo lo ajeno; solo se solicitaron `/` y `/sesion.js`, `errores=[]`, `barberia_db` solo como negación, cleanup de DB `r02_prueba_<UUID>` propia y verificación de ausencia. Sin instalaciones, cambios package/lock, backend/dist/SW/perfiles reales ni imports de aplicación. Diff de esta ejecución: script nuevo + par tests nuevos; `useSync.ts` previo ajeno preservado. Reviewer posterior `sdd-reviewer`: **APROBADO T96**, reejecutó el runner con exit0 (artefacto `t96_idb_4dks1duz`) y confirmó rojo/verde previos, repo intacto y aislamiento. Hallazgos no bloqueantes: rojo ejercita canal de fallo del runner (no assertions, sin fabricar fallo); `assert` de Python insensible a `python -O`; cleanup en `finally` podría enmascarar la excepción original (perfil temporal se elimina igual); fixture sintético sin imports de T97+ coherente con fixtures incrementales; artefactos TEMP acumulativos por corrida y `console.error` no capturado. |
| T97 | Rojo real: `Preparación fallida, salida 1` (exit1); tsc acotado reporta `TS2307 Cannot find module '../../src/services/baseDatosLocal'` (+ TS7006 derivado) en `t96_idb_4xr34rtm/preparacion.log`. | Verde: `VERDE T96...` (exit0) con el runner exclusivo (`t96_idb_aoh5x58b`); typecheck acotado de `db.ts + baseDatosLocal.ts` exit0 y typecheck completo `tsc --noEmit -p tsconfig.json` exit0. | 2026-10-09, desde `frontend`: `python tests/aislados/sesion_idb.py`; comandos de compatibilidad `node node_modules/typescript/bin/tsc --noEmit --strict ... src/services/db.ts src/services/baseDatosLocal.ts` y `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. Creado `src/services/baseDatosLocal.ts` con tipos/clase extraídos sin singleton: constructor `(nombre, proveedorGeneracionInicial)`, `readonly proveedorGeneracionInicial` preparado para T98, versions 1/2 byte-a-byte iguales al original. `db.ts` reexporta los siete tipos con `export type` y conserva `export const db = new BaseDatosLocal('barberia_db', ...)` con el mismo nombre/exports; los tres consumidores existentes (`useSync`, `MisSaldos`, `RegistroCortes`) siguen importando `{ db }` sin cambios. Fixture T97 importa **solo la clase** (nunca `db.ts`): nombre explícito sintético, `isOpen()===false` tras instanciar (lazy), `verno===2`, seis stores v2 exactos, `CorteLocal` tipado y `close()`; sin abrir DB productiva. `publicDir:false` mantiene bundle sin assets de app. Diff: `baseDatosLocal.ts` nuevo, `db.ts` reescrito con exports equivalentes, fixture/runner ampliados con `compatibilidad`; ningún otro archivo productivo. Sin instalaciones, DB real, backend, build ni commits. Reviewer posterior `sdd-reviewer`: **APROBADO T97**; reejecutó el runner con exit0 (artefacto `t96_idb_x6xupnxp`), verificó por diff `git show HEAD:frontend/src/services/db.ts` que los bloques version(1)/(2) son idénticos byte-a-byte, export set equivalente, 3 consumidores intactos, bundle sin `export const db` y timeline tests-first rojo→verde. Hallazgos no bloqueantes: `limpiar` sin await en `compatibilidad` (promesa flotante), proveedor de generación sin aserción runtime (nota para T98), logs tsc no persistidos en TEMP (los debe persistir T103), índices verificados solo por diff no por assertion, `resultado.txt` aún dice "VERDE T96" en corridas T97 (cosmético), `crypto.randomUUID()` exige contexto seguro y T98 lo invocará. |
| T98 | Rojo real 1: tsc acotado `TS2305 has no exported member 'SlotSesionLocal'` (exit1), `t96_idb_m2tdumiq`. Rojo real 2 (tras añadir tipo/tabla): runtime `El upgrade alteró el outbox legado: []` (exit1), `t96_idb_m2tdumiq`/`t96_idb_fa50mo32`; verificación cruda demostró que el legacy sintético escrito con API cruda perdía outbox/mapeo (0 filas) porque Dexie recreó las tiendas al detectar layout distinto. | Verde: `VERDE R02a: nombres negativos, persistencia dos páginas, rollback, reopen, cleanup propio, clase sin singleton, migración v1/v2 a 3 conservadora y slot locked único` (exit0), corrida definitiva `t96_idb_chz4lw9v` (además verdes intermedios `b6ud018y` y `yp9735pt`). | 2026-10-09, desde `frontend`: `python tests/aislados/sesion_idb.py`. `baseDatosLocal.ts`: añadido `SlotSesionLocal` (`clave:'actual'`, `version:1`, `generacion`, `epoch`, `estado:'locked'`, `actorId:null`), `slotSesion!: Table<SlotSesionLocal,string>`, v3 aditiva con `slotSesion:'clave'` (claves/índices v1/v2 byte-idénticos), `.upgrade(tx => inicializarSlot(...))` para previas y `this.on('populate', ...)` para fresh — ambas vías comparten el constructor puro `construirSlotInicial(generacion)` con la generación **solo** del proveedor inyectado (sin auth-storage/localStorage/barbero_id/timestamp), y cualquier fallo propaga abortando la tx. Fixture: tres vías —legacy v1 (cortes sin actor demostrable, verificado 1 fila cruda antes y después, outbox inexistente = 0, sin filas inventadas), legacy v2 fabricado **con Dexie** versiones 1/2 históricas (corte + outbox pendiente/enviando/revisión + mapping 41, verificado 3/1 crudas antes del upgrade y conservados en valores/UUID/estados), y fresh (sin tablas ajenas `usuarios`/`sesion`)—, más reopen con proveedor distinto que no regenera la generación. Slot comprobado locked/actor null/epoch0/generación inyectada en cada vía. Correcciones propias durante T98: `count()` era `IDBRequest` (usar `.result`), carácter cirílico U+0435 infiltrado en el índice `instanteCambio` (detectado con inspección Unicode y corregido), `→` rompía consola cp1252 (sustituido) y mensaje `resultado.txt` actualizado a las comprobaciones reales (hallazgo cosmético de T97). Typecheck completo `tsc --noEmit -p tsconfig.json` exit0. Diff: `baseDatosLocal.ts` y fixture/runner; ningún otro archivo productivo. `db.ts` y sus 3 consumidores intactos. Sin instalaciones, DB real, backend, build ni commits. Reviewer posterior `sdd-reviewer`: **APROBADO T98**; reejecutó el runner con exit0 (artefacto `t96_idb_ablu5n_t`) y el typecheck completo exit0, corroboró rojos reales en disco (`m2tdumiq/preparacion.log` TS2305, `fa50mo32/error.txt` runtime), v1/v2 byte-idénticos a T97, ausencia de lecturas de mirrors/auth y conservación de filas en las tres vías. Hallazgos no bloqueantes: tsc acotado sin `-p` falla por lib ES5 (usar `-p` o `--lib/--target` en futuros acotados); `count()` crudo leerse en `onsuccess` si se añaden asserts; validación de forma de la generación delegada a T99. |
| T99 | Rojo real: `Preparación fallida, salida 1` (exit1); typecheck acotado con `TS2724 ... has no exported member named 'validarSlotSesion'. Did you mean 'invalidarSesion'?` y siete `TS2305 ... no exported member` (`coincideSlot`, `esContextoActivo`, `prepararTransicion`, `SlotSesion`, `IdentidadSesion`, `DestinoSesion`) en `t96_idb_lkbicp59/preparacion.log`; fallo real por funciones ausentes, sin fabricar rojo. | Verde: `VERDE R02a: nombres negativos, persistencia dos páginas, rollback, reopen, cleanup propio, clase sin singleton, migración v1/v2 a 3 conservadora, slot locked único e identidad/CAS puros del slot` (exit0), corrida definitiva `t96_idb_rc87eqn9`; typecheck completo `tsc --noEmit -p tsconfig.json` exit0 (y baseline previo también exit0). | 2026-10-09, desde `frontend`: `python tests/aislados/sesion_idb.py` y `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. Artefactos TEMP `t96_idb_lkbicp59` (rojo) y `t96_idb_rc87eqn9` (verde; `errores=[]`, solo `/` y `/sesion.js`, DB propia `r02_prueba_<UUID>` limpiada). Gate READ ONLY previo: `sesion.ts` sin ningún import/export-from (grep sin coincidencias), Vite 5.4.21 y tsc 5.9.3 locales en `node_modules` (script invoca tsc por ruta exacta, sin npx), Playwright Python + Chromium 1243 existentes, package.json/lock sin diff ni estado, TEMP/opencode presente. `sesion.ts`: añadidos tipos `SlotSesion` (unión readonly `activa`/`locked`, `clave:'actual'`, `version:1`, `generacion`, `epoch` seguro ≥0, `actorId` number seguro ≥1 / null; sin token/rol/usuario/timestamps/negocio), `IdentidadSesion` (snapshot readonly de los seis campos), `DestinoSesion` y `ResultadoCAS` (exactamente dos variantes) más las cuatro funciones puras del contrato: `validarSlotSesion(entrada: unknown)` (llaves exactas las seis; rechaza extra/credenciales, booleanos como IDs, decimales/NaN/Infinity/seguridad fuera de rango, `activa` sin actor o con actor <1, `locked` con actor, con único `Error` genérico `Slot de sesión inválido` sin eco de datos y copia nueva sin alias), `coincideSlot` (compara los seis campos), `esContextoActivo` (coincide Y estado activo) y `prepararTransicion(actual, esperado, destino, aleatorio)` (CAS primero incluso en el tope; generación `${epoch+1}:${aleatorio}` con aleatorio inyectado por el caller, sin crypto.randomUUID ni reloj; misma cuenta/estado rota; resultado revalidado y copia sin alias). **Decisión de tope**: en `epoch === Number.MAX_SAFE_INTEGER` lanza `Error` genérico `'Transición de sesión rechazada: epoch al máximo seguro'` —sin wrap, sin éxito simulado y sin inventar una tercera variante de `ResultadoCAS`— documentada en comentario; un CAS desfasado en el tope sigue devolviendo `conflicto`. Cero imports runtime nuevos (tampoco de db/repo/auth/storage); las funciones y tipos legacy (`instalarSesion`, `invalidarSesion`, `esRespuestaVigente`, `perteneceALaCuenta`, `leerSesionNavegador`, `SesionCuenta`, `AlmacenSesion`) intactos. Fixture: nuevas `identidad()` (matriz: 36 entradas unknown rechazadas con mensaje único, variantes válidas y fronteras MAX_SAFE, copia sin alias en ambos sentidos, CAS de los seis campos con un solo campo variado, conflicto solo `{tipo:'conflicto'}` sin fugas del ganador, rotación misma cuenta, ABA A→B→A con UUID repetido (`0/1/2/3:uuid-repetido` siempre distintos), contexto activo solo si coincide+activa, tope sin wrap) y `legacy()` (semántica exacta de `instalarSesion`/`invalidarSesion`/`esRespuestaVigente`/`perteneceALaCuenta` con almacén en memoria y `Date` inyectado; sin `leerSesionNavegador` ni localStorage, prohibidos por el runner); ambas exportadas en `window.pruebasSesion` e invocadas desde el runner, cuyo mensaje VERDE se extendió. Typecheck acotado sin cambios (el fixture importa `sesion.ts`, que queda cubierto transitivamente). Sin instalaciones, cambios package/lock, `barberia_db` (solo negación), backend/DB real, authStore/api/cortesApi/useSync/UI, MEMORY.md ni commits. | Revisión posterior `sdd-reviewer`: **APROBADO T99**; verificó diff de solo adición al final en `sesion.ts` (legacy intacto, cero imports), tipos/puras contra el Contrato exacto R02, matriz de `identidad()`/`legacy()` y artefactos rojo `t96_idb_lkbicp59` (1 TS2724 + 6 TS2305, exit1) y verde `t96_idb_rc87eqn9` (errores=[], solo `/` y `/sesion.js`); reejecutó el runner con exit0 (artefacto `t96_idb_8zjfp19y`) y typecheck completo exit0. Sin alcance ajeno; T100–T103 siguen pendientes. Hallazgos no bloqueantes: (P3) la evidencia del rojo dice «siete TS2305» cuando el log muestra 6 TS2305 + 1 TS2724; (P3) en `prepararTransicion` el rechazo por epoch al tope se evalúa antes que la validez de `aleatorio`; (P3) `MEMORY.md` quedó desactualizado (declara T99 pendiente): actualizar en el cierre de R02a. |
| T100 | Rojo real: `Preparación fallida, salida 1` (exit1); `t96_idb_gw_tx7z7/preparacion.log` = `tests/aislados/sesion-idb.ts(14,54): error TS2307: Cannot find module '../../src/services/repoSesion'` por módulo aún ausente, sin fabricar rojo. (Correcciones propias intermedias, no rojo de spec: dos `TS2367` por comparación literal sobre-estrechida tras `asserts`; se sustituyeron por unicidad runtime con `Set` en A→B→A y cadenas exactas en login mismo actor.) | Verde: `VERDE R02a: nombres negativos, persistencia dos páginas, rollback, reopen, cleanup propio, clase sin singleton, migración v1/v2 a 3 conservadora, slot locked único, identidad/CAS puros del slot y CAS durable con competencia real` (exit0), corrida definitiva `t96_idb_54nml6px` (`errores=[]`, solo `/` y `/sesion.js`, DBs propias `r02_prueba_<UUID>` limpiadas verificadas); typecheck completo `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` exit0. | 2026-10-12, desde `frontend`: `python tests/aislados/sesion_idb.py` y `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. Artefactos TEMP `t96_idb_gw_tx7z7` (rojo) y `t96_idb_54nml6px` (verde). Gate READ ONLY previo: `repoSesion.ts` ausente (de nuevo), `sesion.ts` sin imports (grep sin coincidencias), runner solo Vite/tsc/Playwright locales (script por ruta exacta, sin npx), package.json/lock sin diff, Dexie local 3.2.7 con API de transacciones contrastada contra SU dist: `Dexie.currentTransaction` = getter estático `PSD.trans || null` (dexie.js:5077) y promesa de `db.transaction()` resuelve tras `trans._completion`/`idbtrans.oncomplete` (commit). Creado `src/services/repoSesion.ts`: repositorio INYECTADO (constructor `(db: BaseDatosLocal)` con import type-only; sin singleton db.ts, auth, localStorage ni red). `leerSlot()` rechaza uso en tx exterior, lee y valida con `validarSlotSesion` (ausente/corrupto => Error genérico `Slot de sesión inválido`, sin recreate ni epoch0). `transicionar(esperado, destino, aleatorio)`: valida los tres parámetros FUERA de tx antes de escribir (esperado vía `validarSlotSesion` — rechaza credenciales extra, tipos y rangos con Error genérico, conservador: un esperado inválido jamás puede causar éxito falso; destino/aleatorio con Error genérico `Transición de sesión inválida`), y después lee+compara+escribe dentro de UNA `rw` con `slotSesion`; CAS distinto => `{tipo:'conflicto'}` sin escrituras ni datos del ganador; CAS coincide => slot siguiente con `prepararTransicion` (epoch+1, generación nueva) escrito en la misma tx; la promesa pública SOLO resuelve tras commit exterior. Defensa contra transacción exterior abierta: `Dexie.currentTransaction` (zona PSD instalada síncrona al entrar en el scope y propagada por promesas Dexie) rechaza `leerSlot`/`transicionar` ANTES de leer o escribir, evitando confundir resolución de subtransacción con commit durable; testeada con la rw realmente abierta, lectura IDB en vuelo y slot intacto tras el rechazo. **Decisión de alcance**: T100 NO acepta aún `efectos` ni `conSesionVigente` (composición de tablas declaradas/guard = T101); la rw abre únicamente `slotSesion`, firma mínima que cumple T100 sin adelantar T101. Fixture nativo (`repoPreparar`/`repoTransicionar`/`repoLocal`, Dexie real e IDB Chromium, no Map/localStorage): dos conexiones independientes (dos páginas del mismo origen) compiten con el MISMO snapshot — ganador confirma epoch1 `1:uuid-pagina-0`, perdedor recibe conflicto con exactamente la clave `tipo` (sin 'uuid-pagina-0' ni campos del ganador en el resultado) y su lectura posterior es igual al slot ganador (no escribió); stale logout con snapshot viejo => conflicto sin destruir la cuenta nueva vigente (actor 9, epoch 3 intacto); login del mismo actor rota generación (epoch 2) y A→B→A con el MISMO aleatorio produce Set de tres generaciones únicas (epoch 4/5/6); esperado/destino/aleatorio inválidos rechazan genérico sin escribir (slot epoch6 intacto); cerrar/reabrir conexión conserva el slot ganador. Sin auth integration; diff limitado a `repoSesion.ts` nuevo + fixture/runner ampliados; singleton/db.ts/baseDatosLocal/sesion.ts intactos; sin instalaciones, DB real, backend, build ni commits; paquetes y lock intactos. Reejecución del coordinador para cerrar los P2 del reviewer (2026-10-12): runner exit0 (`t96_idb_0wrg3r9o`, mensaje VERDE literal idéntico) y `tsc --noEmit -p tsconfig.json` exit0; `git status --short`/`git diff --stat` confirman alcance solo T100 (`repoSesion.ts` nuevo, fixture/runner/tasks) con diffs preexistentes intactos. Reviewer posterior `sdd-reviewer`: **APROBADO T100**, sin P1; verificó contrato, commit post-tx, defensa tx exterior, competencia nativa (perdedor sin fuga/escritura) y rojo/verde por artefactos; P2 de proceso (reejecución/diff) cerrados por el coordinador; P3 informativos: competencia secuencial no intercalada (cobertura T101/T102), `assert` insensible a `-O`, estado «B» locked en A→B→A, MEMORY al cierre R02a, `leerSlot` en tx implícita. |
| T101 | Rojo real: `Preparación fallida, salida 1` (exit1), artefacto `t96_idb_nysuz1ua`; `preparacion.log` con `TS2305 ... has no exported member 'ERROR_SESION_NO_VIGENTE'` y `'ERROR_TABLA_DECLARADA'`, `TS2339 Property 'conSesionVigente' does not exist on type 'RepoSesion'`, `TS2554 Expected 3 arguments, but got 4` (más `TS7006`/`TS2347` derivados de los callbacks aún sin tipar), sin fabricar rojo. Corrección propia intermedia, no rojo de spec: un `TS2367` por estrechamiento de `invocaciones` tras `asserts` (mismo patrón que T100) → contador separado. Correcciones propias durante el verde: `TS2769` porque el alcance `Table<unknown, unknown>[]` no es asignable a la sobrecarga `string[]` → alcance resuelto a Nombres de store; y fallo runtime `Tabla declarada ajena a la base de la sesión` en la primera llamada propia porque en Dexie 3.2.7 `db.<tabla>` y `db.tables[i]` son envolventes distintas del mismo store (`setApiOnPlace`, dexie.js:3642-3643) → validación por identidad de instancia (`tabla.db === this.db`) + pertenencia por nombre en esta base. | Verde: `VERDE R02a: nombres negativos, persistencia dos páginas, rollback, reopen, cleanup propio, clase sin singleton, migración v1/v2 a 3 conservadora, slot locked único, identidad/CAS puros del slot, CAS durable con competencia real y composición guard+efectos en la misma transacción` (exit0), corrida definitiva `t96_idb_kqochnyt` (`errores=[]`, solo `/` y `/sesion.js`, DBs propias `r02_prueba_<UUID>` limpiadas); typecheck acotado del fixture exit0 y typecheck completo `tsc --noEmit -p tsconfig.json` exit0. | 2026-10-12, desde `frontend`: `python tests/aislados/sesion_idb.py` y `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. Artefactos TEMP `t96_idb_nysuz1ua` (rojo) y `t96_idb_kqochnyt` (verde). Gate READ ONLY previo: `sesion.ts` sin imports (grep sin coincidencias) y NO modificado; `repoSesion.ts` sin singleton/auth/localStorage/red (solo mención en comentario); runner/script solo Vite 5.4.21 y tsc 5.9.3 locales por ruta exacta (sin npx ni installs) + Playwright Python existente; package.json/lock sin diff; Dexie local 3.2.7 contrastado contra SU dist: `Dexie.currentTransaction` (dexie.js:5077, `PSD.trans || null`), `Dexie.prototype._transaction` (dexie.js:4839: con `PSD.trans` ajeno/sin `!` crea alcance propio, por eso la defensa es obligatoria), `Table X not part of transaction` (1340/2837), `Table.db`/`Table.name` (d.ts:589-591, `createTableConstructor` dexie.js:1701-1703), `Transaction.storeNames`/`table<T,Key>` (d.ts:389-401, dist:2852) y promesa de `db.transaction()` que resuelve en `trans._completion`/`idbtrans.oncomplete` (commit). Ampliado `src/services/repoSesion.ts` con la firma del contrato: `transicionar(esperado, destino, aleatorio, efectos?)` con `EfectosSesion { tablas, aplicar(transaccion) }` — `aplicar` recibe la MISMA `Transaction` Dexie; las tablas se declaran y validan ANTES de abrir la tx (identidad de instancia + nombre de store) y se unen con `slotSesion` en UNA rw deduplicadas; CAS distinto → conflicto SIN invocar `aplicar` ni escribir (flag del callback a 0); orden del contrato: los efectos se PIDEN antes del `put` del slot y su promesa se espera DESPUÉS, de modo que una excepción del callback se propaga con AMBAS mutaciones ya emitidas y aborta la tx entera (rollback conjunto, sin perder el error si fallara el `put`); `conSesionVigente<T>(contexto, tablas, trabajo)` genérico que exige slot activo coincidente con `esContextoActivo` y ejecuta `trabajo` en ESA MISMA tx, resolviendo SOLO tras commit exterior; defensa de transacción exterior heredada T100 y rechazo de tablas de OTRA instancia antes de escribir; sin `any`, sin nested tx independiente, sin awaits de red/timer en callbacks. Tests primero (fixtures nativos con lectura cruda `leerFilaCruda` de la fila real tras commit/abort, no solo spies): `repoEfectos` (1: efectos sobre fila `outboxOperaciones` sintética con actor explícito + slot DURABLES juntos tras commit; 2: CAS desfasado → `conflicto` con `aplicar` NUNCA invocado y sin fila; 3: excepción `fallo-t101` tras mutar la fila y tras pedir el slot → ROLLBACK de ambos según lectura nativa, con la fila confirmada previa intacta), `repoGuard` (contexto que coincide en locked → rechazo sin callback; happy path con `storeNames` exactamente `[outboxOperaciones, slotSesion]` y `Dexie.currentTransaction === transaccion` dentro del trabajo; desfasado tras rotar → rechazo sin callback stale ni fila; DOS rondas concurrentes guard-primero y transición-primero sobre dos conexiones, con invariante orden↔fila: fila durable solo si el guard resuelve primero, y fila ausente + callback no invocado si la transición resuelve primero), `repoDefensas` (tabla de otra instancia DB rechazada con mensaje genérico antes de escribir y sin invocar callbacks, en `transicionar` y en `conSesionVigente`; uso desde rw exterior abierta con lectura IDB en vuelo rechazado sin escribir). Diff de esta ejecución: `tests/aislados/sesion-idb.ts` (+helper y tres tests + registro en `pruebasSesion`), `tests/aislados/sesion_idb.py` (+3 invocaciones y mensaje de verde), `src/services/repoSesion.ts` ampliado; `sesion.ts` intacto. Sin instalaciones, sin package/lock, sin DB real/backend/migraciones, sin claims/proyecciones ni limpieza de cortes legacy, sin authStore/api/cortesApi/useSync/UI/db.ts, sin MEMORY.md, sin commits; DBs solo `r02_prueba_<UUID>` propias y cerradas. Límites: R02a no cierra RF-33/RNF-5 ni P1-5, nada de R02b/R03+, sin T102. Reviewer posterior `sdd-reviewer`: **APROBADO T101**; reejecutó el runner con exit0 (artefacto `t96_idb_j_zp4wgg`, `errores=[]`, solo `/` y `/sesion.js`, DBs `r02_prueba_<UUID>` limpiadas) y typecheck completo `tsc --noEmit -p tsconfig.json` exit0; verificó rojo previo real (`t96_idb_nysuz1ua/preparacion.log` con TS2305/TS2554/TS2339 afirmados, exit1), composición atómica (tablas validadas por identidad+nombre ANTES de la tx, orden efectos→put del slot con espera de la promesa, rollback conjunto por lectura IDB nativa, conflicto sin invocar efectos), guard atómico con rondas concurrencia orden↔fila, defensas de tx exterior y tabla ajena sin callbacks, alcance limpio (sin cambios de T101 en sesion.ts/db.ts/authStore/api/cortesApi/useSync/UI/package/lock). Hallazgos no bloqueantes: P3 `construirAlcance` rechaza `tablas` no-array con el mensaje `ERROR_TABLA_DECLARADA` (genérico y seguro pero impreciso para ese caso); P3 en `transicionar` un `efectos.tablas` que incluya `slotSesion` se deduplica silenciosamente (aceptable); P3 rojo intermedio `TS2367` del log corresponde a la corrección propia ya declarada en esta fila. |
| T102 | Rojo intentado primero y no fabricado: salida literal `VERDE R02a: nombres negativos, persistencia dos páginas, rollback, reopen, cleanup propio, clase sin singleton, migración v1/v2 a 3 conservadora, slot locked único, identidad/CAS puros del slot, CAS durable con competencia real, composición guard+efectos en la misma transacción y fallo cerrado sin reparación destructiva` (exit0), artefacto `t96_idb_nz_ztgmb` → verde inicial honesto: los seis casos adversariales pasaron a la primera contra el código ya existente (T100/T101 ya era fail-closed dentro del contrato); sin funcionalidad ausente que produzca rojo real (ni TS2305/TS2307 ni fallo runtime), sin rojo artificial. | Verde: misma salida literal (exit0) en la corrida de confirmación `t96_idb_l43l8kvb` (`errores=[]`, solo `/` y `/sesion.js`, DBs propias `r02_prueba_<UUID>` limpiadas y verificadas, `sin error.txt` en ambas); typecheck completo `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` exit0, además del typecheck acotado del fixture dentro de la preparación. | 2026-10-12/13, desde `frontend` (gate y redacción el 12; corridas tras medianoche con reloj 2026-10-13 00:2x): `python tests/aislados/sesion_idb.py` y `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. Artefactos TEMP `t96_idb_nz_ztgmb` (inicial) y `t96_idb_l43l8kvb` (confirmación). Gate READ ONLY previo: `sesion.ts` sin imports (grep sin coincidencias) y NO modificado; `repoSesion.ts` solo dexie + tipos (sin singleton/auth/localStorage/red, solo comentarios); Vite 5.4.21 y tsc 5.9.3 locales, Playwright Python + Chromium existentes; package.json/lock sin diff; Dexie local 3.2.7 contrastada: `Table.get` aplica `hook.reading.fire` (dexie.js:1361-1362), los hooks se comparten entre `db.<tabla>`, `_allTables` y las tablas atadas a tx (dexie.js:1707), `Transaction._promise` propaga rechazos sin envolver (2757+) y `DexieEvent.unsubscribe` tipado (dexie.d.ts:39-45). Solo tests: `frontend/tests/aislados/sesion-idb.ts` (helpers `escribirFilaCruda`, `borrarFilaCruda`, `capturarRechazo` y funciones `falloCerrado` (casos 1-4) y `falloLecturaAborto` (5-6)) y `frontend/tests/aislados/sesion_idb.py` (dos invocaciones + mensaje final); CERO cambios de código de producto (ningún ajuste necesario: los rechazos ya eran fail-closed dentro del contrato). Inyecciones de fallo IDB controladas en fixtures nativas, sin Map ni spies: (1) slot ausente = borrado crudo del singleton en DB ya v3 → `leerSlot`/`transicionar` rechazan con el genérico `Slot de sesión inválido`, sin recreate en aperturas posteriores, sin epoch0 por defecto, sin overwrite, outbox/mapeo en 0; (2) slot corrupto = tres filas crudas (tipado `generacion: 42`, `estado: 'zombie'`, `epoch: 1.5`) → rechazo genérico, fila idéntica campo a campo con sus 6 campos (no reparada), singleton en 1 y nada más escrito; (3) `version: 2` crudo → rechazo genérico, reapertura v3 sin bump ni migración/recreate silencioso, fila intacta; (4) `epoch = Number.MAX_SAFE_INTEGER` crudo con outbox previo → transición rechazada con `Transición de sesión rechazada: epoch al máximo seguro` sin wrap (con y sin efectos, estos invocados 0 veces), slot y outbox intactos por lectura nativa posterior; (5) fallo de lectura = hook `reading` de Dexie roto sobre la operación real de IDB (`operacion-lectura-rota`), inyectado y retirado → `leerSlot`, `transicionar` (efectos 0) y `conSesionVigente` (trabajo 0) rechazan con ESE mensaje exacto propagado al caller (ninguna confirmación simulada ni activación parcial de la autoridad) y, tras retirarlo, el slot original sigue intacto; (6) aborto tras writes = excepción en efectos DESPUÉS de una relectura en ESA MISMA tx que confirma que el `put` del slot ya está aplicado (epoch 2 visible; si no, `t102-put-pendiente`) → rechazo con `fallo-t102` (callback nunca reportado como éxito) y rollback total verificado en crudo: slot epoch 1/generación `1:uuid-t102-previa`, outbox y mapeo sintéticos ausentes, outbox+mapeo durables y generación intactos. Límites: sin instalaciones, package/lock, DB real/backend/migraciones; sin tocar authStore/api/cortesApi/useSync/UI/db.ts/MEMORY.md; sin claims/proyecciones ni limpieza de cortes legacy; sin autoauth ni recreate desde espejo; diffs preexistentes preservados sin commit. Reejecución del reviewer: runner exit0 (`t96_idb_85uiphvo`) y tsc exit0. Reviewer posterior `sdd-reviewer`: **APROBADO T102**, sin P1 ni P2; verificó verde inicial honesto por mtimes y sustancia de los tests (~420 líneas, 6 casos con assertions crudas nativas), inyección nativa vía hook `reading` con `unsubscribe` y aborto por relectura en la misma tx, y ausencia de reparación destructiva. P3 no bloqueantes: `localStorage` no assertado directamente (fallback ausente es estructural), atribución «cero producto» por mtimes (R02a sin commits aún), `errores=[]` no captura `console.error`. |
| T103 | Rojo intentado primero y no fabricado: el runner exclusivo R02a ya estaba completo y verde a la primera sobre el código del tramo (T96–T102); sin funcionalidad ausente que produzca rojo real → verde inicial honesto, salida literal `VERDE R02a: nombres negativos, persistencia dos páginas, rollback, reopen, cleanup propio, clase sin singleton, migración v1/v2 a 3 conservadora, slot locked único, identidad/CAS puros del slot, CAS durable con competencia real, composición guard+efectos en la misma transacción y fallo cerrado sin reparación destructiva` (exit0), artefacto `t96_idb_x3apviod`; sin rojo artificial ni código nuevo. | Misma salida literal (exit0) en la corrida de cierre `t96_idb_x3apviod` (`resultado.txt` con el mensaje completo, sin `error.txt`; artefactos `bundle`, `navegador.json`, `preparacion.log`, `resultado.txt`); typecheck completo `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` exit0. | 2026-10-13, desde `frontend`: `python tests/aislados/sesion_idb.py` y `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. **Revisión READ ONLY del tramo T96–T102** (previa a la ejecución): `git status --short` + `git diff --stat` — tracked del tramo limitado a `sesion.ts` (+163, solo exports añadidos sin imports) y `db.ts` (clase extraída → reexport de los siete tipos + singleton `barberia_db` conservado con generación inyectada); untracked nuevos revisados: `baseDatosLocal.ts` (solo `import Dexie, { Table }`, versiones 1/2 byte-lógicas intactas + v3), `repoSesion.ts` (solo dexie + `import type` de la clase + imports de `sesion`, sin singleton/auth/localStorage/red), `scripts/correcciones-sesion-test.mjs` (Vite/tsc locales por ruta exacta, destino bajo `TEMP/opencode` validado, sin vite.config/PWA/App), `tests/aislados/` (fixture importa solo clase/sesion/repo, nunca `db.ts` ni authStore/api/useSync; runner stdlib+Playwright con `service_workers='block'`, servidor loopback y DBs propias `r02_prueba_<UUID>`, rechazando `barberia_db`). Integridad de fixtures: los cuatro artefactos del runner presentes, sin `error.txt`. **Sin tocar** authStore/api/cortesApi/páginas/UI/package.json/lock/backend ni `barberia.db`; diffs ajenos preexistentes preservados sin modificación por R02a (`MEMORY.md` +87, `sync.py` ±5, `test_jornadas.py` ±5, `useSync.ts` ±4, `plan.md` +23, `spec.md` +19) y untracked ajenos de T88/R01 intactos (`comando_corte.py`, `test_comando_corte_aislado.py`, `tests/e2e/`, `cierre.md`, `plan-correcciones.md`, `specs/003-pull-offline/`). **Síntesis del tramo T96–T103**: T96 creó `scripts/correcciones-sesion-test.mjs` + `tests/aislados/sesion_idb.py` + `tests/aislados/sesion-idb.ts` (harness sin DB real); T97 creó `src/services/baseDatosLocal.ts` y reescribió `src/services/db.ts` (compatibilidad de exports, tres consumidores intactos); T98 añadió `SlotSesionLocal`/v3 e inicialización locked/actor null/epoch0 en las tres vías (`baseDatosLocal.ts`); T99 añadió tipos `SlotSesion`/`IdentidadSesion`/`DestinoSesion`/`ResultadoCAS` y las cuatro funciones puras en `src/services/sesion.ts`; T100 creó `src/services/repoSesion.ts` (lectura+transición CAS durable con competencia real); T101 añadió `conSesionVigente` y composición guard+efectos en la misma transacción (`repoSesion.ts`); T102 solo amplió el fixture con casos adversariales (sin producto); T103 solo evidencia. Cobertura del tramo: RF-29/RF-33/RNF-5 **solo parciales** (infraestructura/identidad/CAS/fallo cerrado en fixtures aisladas), RNF-3 parcial (extracción compatible), RNF-6 (aislamiento del harness). **Límites declarados**: R02a NO cierra RF-33/RNF-5/P1-5/T89; la autoridad del slot queda **INACTIVA** — sin consumidores fuera del fixture (authStore/api/cortesApi/useSync/UI siguen en el camino legacy sin tocar); R02b/R03+ no iniciados; pull/bóveda cifrada/PostgreSQL/locale diferidos. **Solicitud de revisión independiente de cierre R02a emitida** (sdd-reviewer); dictamen pendiente. | Reviewer de cierre `sdd-reviewer`: **APROBADO R02a y T103** (sustituye al dictamen pendiente de esta fila). Reejecución independiente 2026-10-13 desde `frontend`: `python tests/aislados/sesion_idb.py` exit0 con mensaje literal `VERDE R02a: nombres negativos, persistencia dos páginas, rollback, reopen, cleanup propio, clase sin singleton, migración v1/v2 a 3 conservadora, slot único → slot locked único, identidad/CAS puros del slot, CAS durable con competencia real, composición guard+efectos en la misma transacción y fallo cerrado sin reparación destructiva` (artefacto `t96_idb__6tmsn_8`, `errores=[]`, solo `/` y `/sesion.js`, sin `error.txt`, DBs `r02_prueba_<UUID>` limpiadas) y `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` exit0. Verificado: T96–T103 `[x]` con evidencia coherente con la matriz del contrato y veredicto APROBADO registrado en cada fila; alcance sin integración (ningún consumidor de `RepoSesion` fuera del fixture; authStore, api, cortesApi, useSync, UI, package.json y lock intactos; `esRespuestaVigente` legacy sin endurecer; autoridad del slot INACTIVA); límites correctos (RF-29/RF-33/RNF-5 solo parciales y NO cerrados, RNF-3 parcial, RNF-6; todos los P1 y T89 abiertos; R02b/R03+ no iniciados; spec 002 NO implementada). Hallazgos no bloqueantes: (P2) en T96, T97, T98, T100, T101 y T102 la celda del revisor quedó fusionada al final de la columna Comando/artefactos (4 columnas en vez de 5; solo T99 y T103 tienen celda propia), aunque el veredicto APROBADO consta escrito en la fila; (P3) el literal con doble barra de Dexie citado en T100/T101 sin escapar rompe columnas al renderizar en GFM; (P3) `SlotSesionLocal` admite solo `estado:'locked'` en la capa DB mientras el repo escribe filas `activa` tipadas a nivel de tx, coherente hoy con la autoridad inactiva, a revisar en R02b. Nada de R02b/R03+, sin cierre RF-33/P1-5/T89. |

Revisión de cierre R02a solicitada (sdd-reviewer); dictamen posterior se registra por separado. Detenerse, sin R02b/R03+ ni cierre RF-33/P1-5/T89.

El gate documental quedó aprobado posteriormente por el usuario. Ejecutar
una tarea y revisar antes de la siguiente; no se rehace T89 ni se atribuye
evidencia histórica a R02.
