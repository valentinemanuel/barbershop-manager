"""E2E integral de cierre (paquete 12, T88): prod-dev + backend TEMP.

Sin login fijo (usuarios frescos por corrida) y sin `import /src/` en
página: solo UI + API + lectura directa de la DB TEMP.
Uso: `python tests/e2e/cierre_integral.py` desde `frontend/`.
"""
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import time
import uuid

import httpx
from playwright.sync_api import sync_playwright

BACKEND_PORT = 8000
FRONT_PORT = 5173
API = f"http://localhost:{BACKEND_PORT}/api"
WEB = f"http://localhost:{FRONT_PORT}/"

fallos = []


def check(condicion, mensaje):
    print(('OK: ' if condicion else 'FALLO: ') + mensaje)
    if not condicion:
        fallos.append(mensaje)


def esperar(condicion, mensaje, timeout=20):
    inicio = time.time()
    while time.time() - inicio < timeout:
        try:
            if condicion():
                check(True, mensaje)
                return True
        except Exception:
            pass
        time.sleep(0.5)
    check(False, mensaje + f' (timeout {timeout}s)')
    return False


tmp = tempfile.mkdtemp(prefix='e2e_t88_')
db_path = os.path.join(tmp, 'e2e.db')
db_url = 'sqlite:///' + db_path
env = dict(os.environ, DATABASE_URL=db_url)
raiz = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
backend_dir = os.path.join(raiz, 'backend')

# --- Semilla fresca en DB TEMP (sin login fijo del repo) ---
semilla = (
    "from decimal import Decimal\n"
    "from app.database import Base, engine\n"
    "import app.models.usuario, app.models.servicio, app.models.corte\n"
    "import app.models.finanzas_corte, app.models.operacion_corte\n"
    "import app.models.auditoria_corte, app.models.intervencion_corte\n"
    "import app.models.jornada_caja, app.models.imputacion_corte\n"
    "from sqlalchemy.orm import sessionmaker\n"
    "from passlib.context import CryptContext\n"
    "from app.models.usuario import Usuario, Rol\n"
    "from app.models.servicio import Servicio\n"
    "Base.metadata.create_all(bind=engine)\n"
    "pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')\n"
    "db = sessionmaker(bind=engine)()\n"
    "db.add(Usuario(nombre='Admin', apellido='E2E', email='a@e.com', usuario='admine2e',"
    " hashed_password=pwd.hash('pass123'), rol=Rol.ADMIN, porcentaje_ganancia=0, activo=True))\n"
    "db.add(Usuario(nombre='Barb', apellido='Uno', email='b1@e.com', usuario='barb1e2e',"
    " hashed_password=pwd.hash('pass123'), rol=Rol.BARBERO, porcentaje_ganancia=50, activo=True))\n"
    "db.add(Usuario(nombre='Barb', apellido='Dos', email='b2@e.com', usuario='barb2e2e',"
    " hashed_password=pwd.hash('pass123'), rol=Rol.BARBERO, porcentaje_ganancia=50, activo=True))\n"
    "db.add(Servicio(nombre='Corte E2E', descripcion='x', precio=Decimal('100.00'), duracion_minutos=30, activo=True))\n"
    "db.commit()\nprint('semilla ok')\n"
)
r = subprocess.run(
    [sys.executable, '-c', semilla],
    cwd=backend_dir, env={**env, 'PYTHONPATH': backend_dir},
    capture_output=True, text=True,
)
assert 'semilla ok' in r.stdout, 'semilla:\n' + r.stdout + r.stderr

servidor = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'app.main:app', '--port', str(BACKEND_PORT)],
    cwd=backend_dir, env={**env, 'PYTHONPATH': backend_dir},
    stdout=open(os.path.join(tmp, 'uvicorn.log'), 'w'),
    stderr=subprocess.STDOUT,
)
front = subprocess.Popen(
    ['npm', 'run', 'dev', '--', '--port', str(FRONT_PORT), '--strictPort'],
    cwd=os.path.join(raiz, 'frontend'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    shell=os.name == 'nt',
)

try:
    for _ in range(40):
        try:
            httpx.get(f'http://localhost:{BACKEND_PORT}/openapi.json', timeout=1)
            break
        except Exception:
            time.sleep(0.5)
    else:
        raise RuntimeError('backend TEMP no arrancó')

    http = httpx.Client(base_url=API, timeout=10)

    def login(usuario):
        resp = http.post('/auth/login', data={'username': usuario, 'password': 'pass123'})
        assert resp.status_code == 200, resp.text
        return resp.json()['access_token']

    token_admin = login('admine2e')
    token_b1 = login('barb1e2e')
    token_b2 = login('barb2e2e')
    servicio_id = http.get(
        '/servicios/', headers={'Authorization': f'Bearer {token_admin}'}
    ).json()[0]['id']

    with sync_playwright() as p:
        navegador = p.chromium.launch(headless=True)

        def pagina_como(usuario, clave):
            ctx = navegador.new_context()
            pg = ctx.new_page()
            pg.goto(WEB)
            pg.fill('#usuario', usuario)
            pg.fill('#password', clave)
            pg.click("button[type=submit]")
            pg.wait_for_selector('.shell__rail', timeout=15000)
            return ctx, pg

        # --- 1. Offline → sync → historial con momento real ---
        ctx1, page = pagina_como('barb1e2e', 'pass123')
        page.goto(WEB + 'cortes')
        page.wait_for_selector('.ui-tarjeta-seleccion', timeout=15000)
        ctx1.set_offline(True)
        page.locator('.ui-tarjeta-seleccion').first.click()
        page.locator("button[type=submit]").click()
        esperar(
            lambda: page.locator('.registro__pendiente').count() > 0,
            '1. pendiente durable visible offline',
        )
        ctx1.set_offline(False)
        esperar(
            lambda: page.locator('.registro__pendiente').count() == 0,
            '1. pendiente sincronizada al reconectar',
        )
        page.goto(WEB + 'saldos')
        esperar(
            lambda: page.locator('text=Deuda del cliente:').count() > 0,
            '1. historial con deuda del cliente',
        )
        texto = page.content()
        check('$100.00' in texto, '1. deuda $100.00 con momento real conservado')
        ctx1.close()

        # --- 2. Exceso offline → revisión → resolución con excedente ---
        ctx2, page = pagina_como('barb1e2e', 'pass123')
        page.goto(WEB + 'cortes')
        page.wait_for_selector('.ui-tarjeta-seleccion', timeout=15000)
        ctx2.set_offline(True)
        page.locator('.ui-tarjeta-seleccion').first.click()
        page.get_by_role('radio', name='Parcial').click()
        page.fill('#importe-cobro', '150')
        page.locator("button[type=submit]").click()
        page.wait_for_timeout(1000)
        print('DBG tras submit:', page.evaluate(
            """async () => {
              const db = await new Promise((res, rej) => {
                const q = indexedDB.open('barberia_db');
                q.onsuccess = () => res(q.result);
                q.onerror = () => rej(q.error);
              });
              const filas = await new Promise((res, rej) => {
                const tx = db.transaction('outboxOperaciones', 'readonly');
                const rq = tx.objectStore('outboxOperaciones').getAll();
                rq.onsuccess = () => res(rq.result);
                rq.onerror = () => rej(rq.error);
              });
              db.close();
              return JSON.stringify(filas.map(f => ({t: f.tipo, e: f.estado})));
            }"""
        ))
        ctx2.set_offline(False)
        for _ in range(30):
            page.goto(WEB + 'saldos')
            page.wait_for_timeout(1000)
            if page.locator('text=Revisión: $').count() > 0:
                break
        check(
            page.locator('text=Revisión: $').count() > 0,
            '2. exceso en revisión (no silencio)',
        )
        if page.locator('text=Revisión: $').count() == 0:
            con_dbg = sqlite3.connect(db_path)
            print('DBG cortes:', con_dbg.execute('select id from cortes').fetchall())
            print('DBG movs:', con_dbg.execute('select uuid, estado, importe from movimientos_corte').fetchall())
            con_dbg.close()
            outbox = page.evaluate(
                """async () => {
                  const db = await new Promise((res, rej) => {
                    const q = indexedDB.open('barberia_db');
                    q.onsuccess = () => res(q.result);
                    q.onerror = () => rej(q.error);
                  });
                  const filas = await new Promise((res, rej) => {
                    const tx = db.transaction('outboxOperaciones', 'readonly');
                    const rq = tx.objectStore('outboxOperaciones').getAll();
                    rq.onsuccess = () => res(rq.result);
                    rq.onerror = () => rej(rq.error);
                  });
                  db.close();
                  return JSON.stringify(filas.map(f => ({t: f.tipo, e: f.estado, u: f.ultimoError})));
                }"""
            )
            print('DBG outbox:', outbox)
        # Admin resuelve por API (sin UI de back-office en este paquete).
        revisiones = [
            r for r in http.post(
                '/sync/', headers={'Authorization': f'Bearer {token_b1}'},
                json={'operaciones': []},
            ).json()['resultados']
        ]
        con = sqlite3.connect(db_path)
        todas = con.execute('select uuid, estado, importe from movimientos_corte').fetchall()
        print('movimientos en TEMP:', todas)
        print('cortes en TEMP:', con.execute('select id from cortes').fetchall())
        fila = con.execute(
            "select uuid, corte_id from movimientos_corte where estado='REVISION' order by id desc limit 1"
        ).fetchone()
        assert fila, 'sin revisión en DB TEMP'
        mov_uuid, corte_rev = fila
        resp = http.post(
            f'/cortes/{corte_rev}/revisiones/{mov_uuid}/resolver',
            headers={'Authorization': f'Bearer {token_admin}'},
            json={'veredicto': 'real', 'motivo': 'e2e verificado'},
        )
        check(resp.status_code == 200, '2. admin resuelve real')
        for _ in range(30):
            page.goto(WEB + 'saldos')
            page.wait_for_timeout(1000)
            if 'Excedente $50.00' in page.content():
                break
        check(
            'Excedente $50.00' in page.content(),
            '2. excedente $50.00 visible tras resolución',
        )
        con.close()
        ctx2.close()

        # --- 3. Bloqueo → intervención → aplicar ---
        ctx3, page = pagina_como('barb1e2e', 'pass123')
        page.goto(WEB + 'cortes')
        page.wait_for_selector('.ui-tarjeta-seleccion', timeout=15000)
        page.locator('.ui-tarjeta-seleccion').first.click()
        page.get_by_role('radio', name='Completo').click()
        page.locator("button[type=submit]").click()
        page.wait_for_timeout(1500)
        # Corte bloqueado (cobro completo): editar offline va a intervención.
        page.goto(WEB + 'saldos')
        page.wait_for_selector('text=Deuda del cliente:', timeout=15000)
        ctx3.set_offline(True)
        if page.locator('text=Guardar corrección').count() > 0:
            page.get_by_role('radio', name='Tarjeta').first.click()
            page.locator('text=Guardar corrección').first.click()
            page.wait_for_timeout(800)
        ctx3.set_offline(False)
        page.wait_for_timeout(4000)
        con = sqlite3.connect(db_path)
        print('movs f3:', con.execute(
            "select uuid, estado, importe from movimientos_corte order by id desc limit 3"
        ).fetchall())
        outbox = page.evaluate(
            """async () => {
              const abrir = () => new Promise((res, rej) => {
                const q = indexedDB.open('barberia_db');
                q.onsuccess = () => res(q.result);
                q.onerror = () => rej(q.error);
              });
              const db = await abrir();
              const filas = await new Promise((res, rej) => {
                const tx = db.transaction('outboxOperaciones', 'readonly');
                const rq = tx.objectStore('outboxOperaciones').getAll();
                rq.onsuccess = () => res(rq.result);
                rq.onerror = () => rej(rq.error);
              });
              db.close();
              return JSON.stringify(filas.map(f => ({t: f.tipo, e: f.estado, u: f.ultimoError})));
            }"""
        )
        print('outbox f3:', outbox)
        interv = con.execute(
            "select uuid from intervenciones_corte where estado='PENDIENTE' order by id desc limit 1"
        ).fetchone()
        check(interv is not None, '3. edición bloqueada en intervención (no aplicada sola)')
        if interv:
            resp = http.post(
                f'/cortes/intervenciones/{interv[0]}/resolver',
                headers={'Authorization': f'Bearer {token_admin}'},
                json={'decision': 'aplicar', 'motivo': 'e2e aplica'},
            )
            check(resp.status_code == 200, '3. admin aplica intervención')
        con.close()
        ctx3.close()

        # --- 4. Apertura sin conexión con datos previos ---
        ctx4, page = pagina_como('barb1e2e', 'pass123')
        page.goto(WEB + 'cortes')
        page.wait_for_selector('.ui-tarjeta-seleccion', timeout=15000)
        ctx4.set_offline(True)
        page.locator('.ui-tarjeta-seleccion').first.click()
        page.locator("button[type=submit]").click()
        page.wait_for_timeout(800)
        page.reload()
        esperar(
            lambda: page.locator('.registro__pendiente').count() > 0,
            '4. recarga offline conserva pendiente durable',
        )
        ctx4.set_offline(False)
        ctx4.close()

        # --- 5. Privacidad barbero/admin ---
        _, page = pagina_como('barb2e2e', 'pass123')
        page.goto(WEB + 'saldos')
        esperar(
            lambda: page.locator('text=Sin cortes').count() > 0,
            '5. barbero nuevo no ve cortes ajenos',
        )
        global_ = http.get('/cortes/', headers={'Authorization': f'Bearer {token_admin}'}).json()
        check(len(global_) >= 2, f'5. admin ve global ({len(global_)} cortes)')
        navegador.close()
finally:
    front.terminate()
    servidor.terminate()

print()
if fallos:
    print(f'ROJO T88: {len(fallos)} fallos')
    for f in fallos:
        print(' - ' + f)
    sys.exit(1)
print('VERDE T88: e2e integral en verde (5 recorridos)')
