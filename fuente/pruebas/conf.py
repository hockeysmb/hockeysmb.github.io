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
    # sirve la página como la publica claude.ai: con doctype y meta viewport (sin ellos el móvil se emula a 980 px)
    code = ("import http.server, functools, sys\n"
            "SK = b'<!doctype html><html><head><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"></head><body>'\n"
            "class H(http.server.SimpleHTTPRequestHandler):\n"
            "    def do_GET(self):\n"
            "        if self.path.split('?')[0] in ('/', '/index.html'):\n"
            "            b = SK + open(sys.argv[2] + '/index.html', 'rb').read() + b'</body></html>'\n"
            "            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return\n"
            "        return super().do_GET()\n"
            "http.server.ThreadingHTTPServer(('', int(sys.argv[1])), functools.partial(H, directory=sys.argv[2])).serve_forever()")
    p = subprocess.Popen(['python3', '-c', code, str(ART_PORT), F + '_artifact'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    atexit.register(p.terminate); time.sleep(0.6)
_art_server()
ART_URL = f'http://localhost:{ART_PORT}/index.html'
MOCK_ART = open(P + 'mock_artifact.js').read()   # window.claude falso para el artifact
SHOTS = F + '_capturas/'
for d in ('', 'lav/after', 'club/shots', 'lg/shots', 'fx/shots', 'al/shots', 'rn/shots', 't5', 'tec2', 'bd'):
    os.makedirs(SHOTS + d, exist_ok=True)
