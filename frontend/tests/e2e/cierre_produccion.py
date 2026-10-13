"""T88: producción/PWA + API y datos sintéticos en TEMP.

Ejecutar desde frontend: python tests/e2e/cierre_produccion.py
Requiere npm run build y Chromium de Playwright ya instalados.
No importa /src/ ni usa usuarios o bases reales. Conserva artefactos en TEMP.
"""
from datetime import datetime, timezone
from functools import partial
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import socket
import sqlite3
import subprocess
import sys
import tempfile
from threading import Thread
import time
import uuid

import httpx
from playwright.sync_api import expect, sync_playwright


RAIZ = Path(__file__).resolve().parents[3]
DIST = RAIZ / 'frontend' / 'dist'
REAL = RAIZ / 'backend' / 'barberia.db'


def hash_real() -> str | None:
    return sha256(REAL.read_bytes()).hexdigest() if REAL.exists() else None


def puerto_libre() -> int:
    with socket.socket() as conexion:
        conexion.bind(('127.0.0.1', 0))
        return conexion.getsockname()[1]


def esperar(consulta, descripcion: str, timeout: int = 30):
    limite = time.monotonic() + timeout
    while time.monotonic() < limite:
        resultado = consulta()
        if resultado:
            return resultado
        time.sleep(0.1)  # Poll de condición, no espera fija de éxito.
    raise AssertionError('Timeout: ' + descripcion)


def outbox(page) -> list[dict]:
    return page.evaluate("""async () => {
      const db = await new Promise((res, rej) => {
        const q = indexedDB.open('barberia_db');
        q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
      });
      try {
        return await new Promise((res, rej) => {
          const q = db.transaction('outboxOperaciones').objectStore('outboxOperaciones').getAll();
          q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
        });
      } finally { db.close(); }
    }""")


def ejecutar() -> None:
    assert (DIST / 'sw.js').exists(), 'Ejecutar npm run build primero'
    original = hash_real()
    preferido = Path(os.environ.get('TEMP', tempfile.gettempdir())) / 'opencode'
    tmp = Path(tempfile.mkdtemp(prefix='t88_prod_', dir=preferido if preferido.exists() else None))
    print('Artefactos:', tmp, flush=True)
    puerto = puerto_libre()
    api = f'http://127.0.0.1:{puerto}'
    clave = uuid.uuid4().hex
    usuarios = {rol: f'{rol}_{uuid.uuid4().hex[:10]}' for rol in ('admin', 'barbero', 'otro')}
    entorno = dict(os.environ, DATABASE_URL='sqlite:///' + (tmp / 'e2e.db').as_posix(),
                   PYTHONPATH=str(RAIZ / 'backend'))
    semilla = '''
from decimal import Decimal
from app.database import Base, engine, SessionLocal
from app import models
from app.models.usuario import Usuario, Rol
from app.models.servicio import Servicio
from passlib.context import CryptContext
import json, os
Base.metadata.create_all(engine)
pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')
with SessionLocal() as db:
    for rol, nombre in json.loads(os.environ['E2E_USUARIOS']).items():
        db.add(Usuario(nombre=rol, apellido='Sintetico', email=nombre+'@example.com',
            usuario=nombre, hashed_password=pwd.hash(os.environ['E2E_CLAVE']),
            rol=Rol.ADMIN if rol == 'admin' else Rol.BARBERO,
            porcentaje_ganancia=Decimal('50.00'), activo=True))
    db.add(Servicio(nombre='Servicio sintetico', descripcion='E2E',
        precio=Decimal('100.00'), duracion_minutos=30, activo=True))
    db.commit()
'''
    subprocess.run([sys.executable, '-c', semilla], cwd=RAIZ / 'backend',
                   env={**entorno, 'E2E_USUARIOS': json.dumps(usuarios), 'E2E_CLAVE': clave}, check=True)

    class Produccion(SimpleHTTPRequestHandler):
        def log_message(self, *_args) -> None:
            pass

        def servir(self) -> None:
            if self.path.startswith('/api/'):
                cuerpo = self.rfile.read(int(self.headers.get('Content-Length', '0')))
                headers = {k: v for k, v in self.headers.items()
                           if k.lower() not in ('host', 'content-length', 'connection')}
                with httpx.Client() as cliente:
                    respuesta = cliente.request(self.command, api + self.path, content=cuerpo, headers=headers)
                self.send_response(respuesta.status_code)
                self.send_header('Content-Type', respuesta.headers.get('content-type', 'application/json'))
                self.send_header('Content-Length', str(len(respuesta.content)))
                self.end_headers()
                try:
                    self.wfile.write(respuesta.content)
                except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
                    pass  # Navegación/offline cancela peticiones en vuelo.
            else:
                if not Path(self.translate_path(self.path)).is_file():
                    self.path = '/index.html'
                super().do_GET()

        do_GET = servir
        do_POST = servir
        do_PATCH = servir
        do_PUT = servir
        do_DELETE = servir

    log = (tmp / 'backend.log').open('w', encoding='utf-8')
    servidor = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app',
                                 '--host', '127.0.0.1', '--port', str(puerto)],
                                cwd=RAIZ / 'backend', env=entorno, stdout=log, stderr=log)
    web = ThreadingHTTPServer(('127.0.0.1', 0), partial(Produccion, directory=str(DIST)))
    Thread(target=web.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{web.server_port}/'
    evidencias = []
    try:
        with httpx.Client(base_url=api + '/api', timeout=10) as http:
            def listo():
                assert servidor.poll() is None, 'Backend terminó: consultar backend.log'
                try:
                    return http.get('/../health').is_success
                except httpx.TransportError:
                    return False
            esperar(listo, 'backend TEMP')
            tokens = {}
            for rol, nombre in usuarios.items():
                respuesta = http.post('/auth/login', data={'username': nombre, 'password': clave})
                assert respuesta.is_success, respuesta.text
                tokens[rol] = {'Authorization': 'Bearer ' + respuesta.json()['access_token']}

            def historial(rol='barbero'):
                r = http.get('/cortes/mi/historial', headers=tokens[rol])
                assert r.is_success, r.text
                return r.json()

            with sync_playwright() as pw:
                perfil = tmp / 'perfil'
                contexto = pw.chromium.launch_persistent_context(str(perfil), headless=True)
                page = contexto.new_page()
                page.goto(url)
                page.fill('#usuario', usuarios['barbero'])
                page.fill('#password', clave)
                page.get_by_role('button', name='Ingresar', exact=False).click()
                expect(page.locator('.shell__rail')).to_be_visible()
                page.goto(url + 'cortes')
                expect(page.locator('.ui-tarjeta-seleccion')).to_have_count(1)
                page.wait_for_function('navigator.serviceWorker.controller !== null')
                page.wait_for_function("""async () => {
                  const db = await new Promise(r => {const q=indexedDB.open('barberia_db'); q.onsuccess=()=>r(q.result)});
                  try {return await new Promise(r => {const q=db.transaction('servicios').objectStore('servicios').count();q.onsuccess=()=>r(q.result>0)})}
                  finally {db.close()}
                }""")

                def registrar(cobro='Pendiente', importe=None):
                    page.locator('.ui-tarjeta-seleccion').click()
                    page.get_by_role('radio', name=cobro, exact=True).click()
                    if importe:
                        page.fill('#importe-cobro', importe)
                    page.get_by_role('button', name='Registrar corte', exact=True).click()
                    expect(page.locator('.registro__pendiente')).to_be_visible()

                # 1. Recarga profunda realmente offline + misma UUID/fecha tras sync.
                contexto.set_offline(True)
                registrar()
                fila = esperar(lambda: next((o for o in outbox(page) if o['tipo'] == 'corte'), None), 'outbox durable')
                page.reload()
                expect(page.locator('.registro__pendiente')).to_be_visible()
                expect(page.locator('.ui-tarjeta-seleccion')).to_have_count(1)
                assert any(o['operacionUuid'] == fila['operacionUuid'] for o in outbox(page))
                contexto.close()
                contexto = pw.chromium.launch_persistent_context(str(perfil), headless=True, offline=True)
                page = contexto.new_page()
                page.goto(url + 'cortes')
                expect(page.locator('.registro__pendiente')).to_be_visible()
                expect(page.locator('.ui-tarjeta-seleccion')).to_have_count(1)
                assert any(o['operacionUuid'] == fila['operacionUuid'] for o in outbox(page))
                contexto.set_offline(False)
                aceptada = esperar(lambda: next((o for o in outbox(page) if o['operacionUuid'] == fila['operacionUuid'] and o['estado'] == 'aceptada'), None), 'sync corte')
                corte = next(c for c in historial() if c['id'] == aceptada['idServidor'])
                fecha = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00')).replace(tzinfo=timezone.utc)
                assert fecha(corte['fecha']) == fecha(fila['momentoReal'])
                assert corte['parte_barbero'] == '50.00' and 'parte_barberia' not in corte
                replay = http.post('/sync/', headers=tokens['barbero'], json={'operaciones': [{
                    'id': fila['operacionUuid'], 'accion': 'crear_corte_v2', 'datos': {
                        'operacion_uuid': fila['operacionUuid'], 'servicio_id': fila['servicioId'],
                        'metodo_pago': fila['metodoPago'], 'modo_captura': fila['modoCaptura'],
                        'instante_cambio': fila['instanteCambio'], 'momento_real': fila['momentoReal'],
                    }}]})
                assert replay.is_success, replay.text
                assert replay.json()['resultados'][0]['corte_id'] == corte['id']
                assert len(historial()) == 1
                page.goto(url + 'saldos')
                expect(page.get_by_text('Deuda del cliente:', exact=False)).to_be_visible()
                evidencias.append('offline + recarga/reapertura Chromium SW + UUID/replay y momento real + historial personal')

                # 2. Importe real excesivo conservado; revisión y excedente explícito.
                page.goto(url + 'cortes')
                expect(page.locator('.ui-tarjeta-seleccion')).to_have_count(1)
                contexto.set_offline(True)
                registrar('Parcial', '150')
                abono = esperar(lambda: next((o for o in outbox(page) if o['tipo'] == 'abono'), None), 'abono durable')
                contexto.set_offline(False)
                padre = esperar(lambda: next((o for o in outbox(page) if o['tipo'] == 'corte' and o['corteUuid'] == abono['corteUuid'] and o['estado'] == 'aceptada'), None), 'segundo corte')
                corte2 = next(c for c in historial() if c['id'] == padre['idServidor'])
                def revision():
                    r = http.get(f"/cortes/{corte2['id']}/movimientos", headers=tokens['barbero'])
                    return next((m for m in r.json() if m['estado'] == 'revision'), None)
                movimiento = esperar(revision, 'exceso en revision')
                assert movimiento['importe'] == '150.00'
                page.goto(url + 'saldos')
                expect(page.get_by_text('Revisión:', exact=False)).to_be_visible()
                r = http.post(f"/cortes/{corte2['id']}/revisiones/{movimiento['uuid']}/resolver",
                              headers=tokens['admin'], json={'veredicto': 'real', 'motivo': 'Evidencia sintetica'})
                assert r.is_success, r.text
                page.reload()
                expect(page.get_by_text('Excedente $50.00', exact=True)).to_be_visible()
                evidencias.append('exceso 150 conservado + revision + resolucion admin + excedente 50')

                # 3. Editar offline un corte bloqueado nunca elude el pago.
                contexto.set_offline(True)
                tarjeta = page.locator('.ui-tarjeta').filter(has_text=f"Corte #{corte2['id']} ·")
                tarjeta.get_by_role('radio', name='Tarjeta', exact=True).click()
                tarjeta.get_by_role('button', name='Guardar corrección').click()
                esperar(lambda: any(o['tipo'] == 'edicion' for o in outbox(page)), 'edicion durable')
                contexto.set_offline(False)
                def intervencion():
                    operaciones = outbox(page)
                    edicion = next(o for o in operaciones if o['tipo'] == 'edicion')
                    assert edicion['estado'] != 'dependiente', edicion
                    with sqlite3.connect(tmp / 'e2e.db') as conexion:
                        conexion.row_factory = sqlite3.Row
                        fila = conexion.execute('SELECT uuid FROM intervenciones_corte WHERE corte_id=? AND estado=?',
                                                (corte2['id'], 'PENDIENTE')).fetchone()
                        return dict(fila) if fila else None
                try:
                    interv = esperar(intervencion, 'intervencion administrativa')
                except AssertionError:
                    print('Diagnostico outbox:', outbox(page))
                    raise
                assert next(c for c in historial() if c['id'] == corte2['id'])['metodo_pago'] == 'efectivo'
                r = http.post(f"/cortes/intervenciones/{interv['uuid']}/resolver", headers=tokens['admin'],
                              json={'decision': 'aplicar', 'motivo': 'Correccion sintetica autorizada'})
                assert r.is_success, r.text
                assert next(c for c in historial() if c['id'] == corte2['id'])['metodo_pago'] == 'tarjeta'
                evidencias.append('bloqueo + intervencion sin aplicar + resolucion admin')

                # 4. Privacidad verificable en JSON y API, no solo pantalla.
                assert historial('otro') == [] and historial('admin') == []
                ajeno = http.get(f"/cortes/{corte['id']}", headers=tokens['otro'])
                inexistente = http.get('/cortes/9999999', headers=tokens['otro'])
                assert ajeno.status_code == inexistente.status_code == 404
                assert ajeno.json() == inexistente.json()
                globales = http.get('/cortes/', headers=tokens['admin'])
                assert globales.is_success and len(globales.json()) == 2
                assert http.get('/cortes/', headers=tokens['barbero']).status_code == 403
                assert all('parte_barberia' not in c for c in historial())
                caches = page.evaluate('async () => (await Promise.all((await caches.keys()).map(async k => (await (await caches.open(k)).keys()).map(r=>r.url)))).flat()')
                assert not any('/api/' in u for u in caches), caches
                page.screenshot(path=str(tmp / 'saldos.png'), full_page=True)
                evidencias.append('404 uniforme + admin personal/global + sin API en CacheStorage')
                contexto.close()
        (tmp / 'evidencia.json').write_text(json.dumps(evidencias, ensure_ascii=False, indent=2), encoding='utf-8')
        print('VERDE T88:', '; '.join(evidencias), flush=True)
    finally:
        web.shutdown()
        web.server_close()
        servidor.terminate()
        try:
            servidor.wait(timeout=10)
        except subprocess.TimeoutExpired:
            servidor.kill()
            servidor.wait()
        log.close()
        assert hash_real() == original, 'La DB real cambió durante la prueba'


if __name__ == '__main__':
    ejecutar()
