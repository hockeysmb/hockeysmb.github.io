# Rutas comunes de las pruebas (todo relativo al repositorio)
import os
P = os.path.dirname(os.path.abspath(__file__)) + '/'
F = os.path.dirname(P.rstrip('/')) + '/'
BANK = P + 'banco_prueba.json'          # banco inventado: el real no se sube nunca (el repositorio es público)
FAKEFB = P + 'fakefb.js'                # Firebase falso para la web
WEB = F + '_web'                        # web construida para probar
# el artifact se sirve por http (con file:// Chromium a veces pierde el localStorage al recargar)
import subprocess, atexit, socket, time
ART_PORT = 8770
def _art_server():
    with socket.socket() as s:
        if s.connect_ex(('127.0.0.1', ART_PORT)) == 0: return
    code = ("import http.server, functools, sys; H = http.server.SimpleHTTPRequestHandler; "
            "H.extensions_map['.html'] = 'text/html; charset=utf-8'; "
            "http.server.ThreadingHTTPServer(('', int(sys.argv[1])), functools.partial(H, directory=sys.argv[2])).serve_forever()")
    p = subprocess.Popen(['python3', '-c', code, str(ART_PORT), F + '_artifact'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    atexit.register(p.terminate); time.sleep(0.6)
_art_server()
ART_URL = f'http://localhost:{ART_PORT}/index.html'
MOCK_ART = open(P + 'mock_artifact.js').read()   # window.claude falso para el artifact
SHOTS = F + '_capturas/'
for d in ('', 'lav/after', 'club/shots', 'lg/shots', 'fx/shots', 'al/shots', 'rn/shots', 't5', 'tec2', 'bd'):
    os.makedirs(SHOTS + d, exist_ok=True)
