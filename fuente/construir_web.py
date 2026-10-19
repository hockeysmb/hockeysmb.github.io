"""Construye la web (GitHub Pages) a partir de la plantilla.
Uso: python3 fuente/construir_web.py [carpeta_salida]   (por defecto, la raíz del repositorio)
No sobrescribe firebase-config.js ni firestore.rules si ya existen en la salida."""
import json, base64, sys, shutil, os, time
F = os.path.dirname(os.path.abspath(__file__)) + '/'
ROOT = os.path.dirname(F.rstrip('/')) + '/'
W = F + 'web/'
OUT = (sys.argv[1].rstrip('/') + '/') if len(sys.argv) > 1 else ROOT
FB = '12.19.0'
os.makedirs(OUT, exist_ok=True)
s = open(F + 'plantilla.html').read()
logo = 'data:image/jpeg;base64,' + base64.b64encode(open(F + 'lib/logo_s.jpg', 'rb').read()).decode()
lib = open(F + 'lib/avatar.bundle.js').read()
empty = json.dumps({'updated': '', 'tasks': []})   # el banco nunca va en el código público: vive en Firestore
s = s.replace('__AVATAR_LIB__', lib).replace('__LOGO__', logo).replace('__BANK__', empty)
i = s.index('<div class="app"')
head, body = s[:i], s[i:]
reset = ('<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
         'body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>')
meta = ('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="theme-color" content="#681825"><meta name="apple-mobile-web-app-capable" content="yes">'
        '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Banco SMB">'
        '<meta name="apple-mobile-web-app-status-bar-style" content="default">'
        '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><link rel="icon" href="icons/icon-192.png">')
fb = ''.join(f'<script src="https://www.gstatic.com/firebasejs/{FB}/firebase-{m}-compat.js"></script>' for m in ('app', 'auth', 'firestore'))
V = time.strftime('%Y%m%d%H%M%S')
cloud = (f'<style>{open(W + "cloud.css").read()}</style>' + fb +
         f'<script>window.SMB_LOGO={json.dumps(logo)};</script><script src="firebase-config.js?v={V}"></script><script src="cloud.js?v={V}"></script>')
sw = "<script>if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));</script>"
html = f'<!doctype html><html lang="es"><head>{meta}{reset}{head}{cloud}</head><body>{body}{sw}</body></html>'
open(OUT + 'index.html', 'w').write(html)
for f in ('cloud.js', 'manifest.webmanifest'):
    shutil.copy(W + f, OUT + f)
for f in ('firestore.rules', 'firebase-config.js'):
    if not os.path.exists(OUT + f) and os.path.exists(ROOT + f) and os.path.abspath(OUT) != os.path.abspath(ROOT):
        shutil.copy(ROOT + f, OUT + f)
open(OUT + 'sw.js', 'w').write(open(W + 'sw.js').read().replace('__VERSION__', V))
shutil.copytree(W + 'icons', OUT + 'icons', dirs_exist_ok=True)
open(OUT + '.nojekyll', 'w').write('')
print('web en', OUT, round(len(html) / 1024), 'KB')
