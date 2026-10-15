"""T96: runner exclusivo test-only, sin backend/app/dist/SW ni perfiles reales."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os
import subprocess
import tempfile
import traceback
import uuid

from playwright.sync_api import sync_playwright


FRONTEND = Path(__file__).resolve().parents[2]


class ServidorPrueba(SimpleHTTPRequestHandler):
    def log_message(self, formato: str, *argumentos: object) -> None:
        pass


def ejecutar() -> None:
    raiz_temp = Path(os.environ['TEMP']) / 'opencode'
    if not raiz_temp.is_dir():
        raise RuntimeError('TEMP aprobado ausente; no usar otra ubicación')
    artefactos = Path(tempfile.mkdtemp(prefix='t96_idb_', dir=raiz_temp))
    print('Artefactos:', artefactos, flush=True)
    corrida = str(uuid.uuid4())
    nombre = 'r02_prueba_' + corrida
    try:
        preparacion = subprocess.run(
            ['node', str(FRONTEND / 'scripts/correcciones-sesion-test.mjs'), str(artefactos)],
            cwd=FRONTEND, capture_output=True, text=True, timeout=60,
        )
        (artefactos / 'preparacion.log').write_text(
            preparacion.stdout + preparacion.stderr, encoding='utf-8')
        if preparacion.returncode:
            raise RuntimeError(f'Preparación fallida, salida {preparacion.returncode}; ver preparacion.log')
        servidor = ThreadingHTTPServer(
            ('127.0.0.1', 0), partial(ServidorPrueba, directory=str(artefactos / 'bundle')))
        hilo = Thread(target=servidor.serve_forever, daemon=True)
        hilo.start()
        origen = f'http://127.0.0.1:{servidor.server_port}'
        errores: list[str] = []
        solicitudes: list[str] = []
        try:
            with sync_playwright() as playwright:
                if not Path(playwright.chromium.executable_path).is_file():
                    raise RuntimeError('Chromium existente ausente; no instalar')
                navegador = playwright.chromium.launch()
                try:
                    contexto = navegador.new_context(service_workers='block')
                    contexto.route('**/*', lambda ruta: ruta.continue_()
                                   if ruta.request.url.startswith(origen + '/') else ruta.abort())
                    contexto.on('request', lambda solicitud: solicitudes.append(solicitud.url))
                    paginas = [contexto.new_page(), contexto.new_page()]
                    for pagina in paginas:
                        pagina.on('pageerror', lambda error: errores.append(str(error)))
                        pagina.goto(origen + '/')
                        pagina.wait_for_function('!!window.pruebasSesion')
                        assert pagina.evaluate('location.origin') == origen
                    argumentos = {'nombre': nombre, 'corrida': corrida}
                    corrida_repo = str(uuid.uuid4())
                    argumentos_repo = {'nombre': 'r02_prueba_' + corrida_repo, 'corrida': corrida_repo}
                    try:
                        paginas[0].evaluate('(p) => window.pruebasSesion.negativas(p.corrida)', argumentos)
                        paginas[0].evaluate('(p) => window.pruebasSesion.compatibilidad(p.corrida)', argumentos)
                        paginas[0].evaluate('() => window.pruebasSesion.migracion()')
                        paginas[0].evaluate('() => window.pruebasSesion.identidad()')
                        paginas[0].evaluate('() => window.pruebasSesion.legacy()')
                        paginas[0].evaluate('(p) => window.pruebasSesion.escribir(p.nombre,p.corrida,false)', argumentos)
                        paginas[1].evaluate('(p) => window.pruebasSesion.leer(p.nombre,p.corrida)', argumentos)
                        paginas[1].evaluate('(p) => window.pruebasSesion.escribir(p.nombre,p.corrida,true)', argumentos)
                        paginas[0].reload()
                        paginas[0].wait_for_function('!!window.pruebasSesion')
                        paginas[0].evaluate('(p) => window.pruebasSesion.leer(p.nombre,p.corrida)', argumentos)
                        paginas[1].evaluate('(p) => window.pruebasSesion.leer(p.nombre,p.corrida)', argumentos)
                        # T100: CAS durable con competencia real entre dos conexiones
                        # del mismo origen que capturan el MISMO snapshot esperado.
                        preparacion_repo = paginas[0].evaluate(
                            '(p) => window.pruebasSesion.repoPreparar(p.corrida)',
                            {'corrida': corrida_repo})
                        assert preparacion_repo['nombre'] == argumentos_repo['nombre'], preparacion_repo
                        snapshot = preparacion_repo['snapshot']
                        destino = {'estado': 'activa', 'actorId': 7}
                        transicion_ganadora = paginas[0].evaluate(
                            '(p) => window.pruebasSesion.repoTransicionar(p.corrida, p.snapshot, p.destino, p.aleatorio)',
                            {'corrida': corrida_repo, 'snapshot': snapshot,
                             'destino': destino, 'aleatorio': 'uuid-pagina-0'})
                        assert transicion_ganadora['resultado']['tipo'] == 'confirmada', transicion_ganadora
                        assert transicion_ganadora['resultado']['slot']['epoch'] == 1, transicion_ganadora
                        assert transicion_ganadora['resultado']['slot']['generacion'] == '1:uuid-pagina-0', transicion_ganadora
                        assert transicion_ganadora['lectura'] == transicion_ganadora['resultado']['slot'], transicion_ganadora
                        # La segunda conexión repite el MISMO snapshot: conflicto sin
                        # datos del ganador y sin escribir (su lectura posterior ve el
                        # slot ganador durable intacto).
                        transicion_perdedora = paginas[1].evaluate(
                            '(p) => window.pruebasSesion.repoTransicionar(p.corrida, p.snapshot, p.destino, p.aleatorio)',
                            {'corrida': corrida_repo, 'snapshot': snapshot,
                             'destino': destino, 'aleatorio': 'uuid-pagina-1'})
                        assert transicion_perdedora['resultado']['tipo'] == 'conflicto', transicion_perdedora
                        assert list(transicion_perdedora['resultado'].keys()) == ['tipo'], transicion_perdedora
                        assert 'uuid-pagina-0' not in json.dumps(transicion_perdedora['resultado']), transicion_perdedora
                        assert transicion_perdedora['lectura'] == transicion_ganadora['resultado']['slot'], transicion_perdedora
                        # Matriz local: login mismo actor y A->B->A rotan, stale logout
                        # no destruye la cuenta vigente, validaciones fuera de tx no
                        # escriben, defensa contra tx exterior y reapertura durable.
                        paginas[0].evaluate(
                            '(p) => window.pruebasSesion.repoLocal(p.corrida)',
                            {'corrida': str(uuid.uuid4())})
                        # T101: guard + efectos IDB compuestos en la MISMA
                        # transacción rw (durabilidad/rollback con lecturas
                        # nativas), guard atómico frente a transición
                        # concurrente y defensas de tx exterior/tabla ajena.
                        paginas[0].evaluate(
                            '(p) => window.pruebasSesion.repoEfectos(p.corrida)',
                            {'corrida': str(uuid.uuid4())})
                        paginas[0].evaluate(
                            '(p) => window.pruebasSesion.repoGuard(p.corrida)',
                            {'corrida': str(uuid.uuid4())})
                        paginas[0].evaluate(
                            '(p) => window.pruebasSesion.repoDefensas(p.corrida)',
                            {'corrida': str(uuid.uuid4())})
                        # T102: fallo cerrado y no reparacion destructiva: slot
                        # ausente/corrupto/version incompatible, overflow epoch,
                        # fallo de lectura IDB inyectado y aborto tras writes;
                        # fixtures nativas con fallos IDB controlados y
                        # verificaciones por lectura cruda posterior.
                        paginas[0].evaluate(
                            '(p) => window.pruebasSesion.falloCerrado(p.corrida)',
                            {'corrida': str(uuid.uuid4())})
                        paginas[0].evaluate(
                            '(p) => window.pruebasSesion.falloLecturaAborto(p.corrida)',
                            {'corrida': str(uuid.uuid4())})
                        assert not errores, errores
                        assert not contexto.service_workers
                        assert all(url in (origen + '/', origen + '/sesion.js') for url in solicitudes), solicitudes
                    except Exception:
                        paginas[0].screenshot(path=str(artefactos / 'fallo.png'))
                        raise
                    finally:
                        paginas[0].evaluate('(p) => window.pruebasSesion.limpiar(p.nombre,p.corrida)', argumentos)
                        paginas[0].evaluate('(p) => window.pruebasSesion.limpiar(p.nombre,p.corrida)', argumentos_repo)
                        contexto.close()
                finally:
                    navegador.close()
        finally:
            servidor.shutdown()
            servidor.server_close()
            hilo.join(timeout=5)
            (artefactos / 'navegador.json').write_text(json.dumps({
                'origen': origen, 'nombre': nombre, 'solicitudes': solicitudes,
                'errores': errores,
            }, indent=2), encoding='utf-8')
        resultado = ('VERDE R02a: nombres negativos, persistencia dos páginas, '
                     'rollback, reopen, cleanup propio, clase sin singleton, '
                     'migración v1/v2 a 3 conservadora, slot locked único, '
                     'identidad/CAS puros del slot, CAS durable con '
                     'competencia real, composición guard+efectos en la '
                     'misma transacción y fallo cerrado sin reparación '
                     'destructiva')
        (artefactos / 'resultado.txt').write_text(resultado, encoding='utf-8')
        print(resultado)
    except Exception:
        (artefactos / 'error.txt').write_text(traceback.format_exc(), encoding='utf-8')
        raise


if __name__ == '__main__':
    ejecutar()
