"""Construye la versión artifact (una sola página con el banco dentro).
Uso: python3 fuente/construir_artifact.py [banco.json] [salida.html]
Por defecto usa el banco de prueba y escribe fuente/_artifact/index.html (no se sube al repositorio)."""
import json, base64, sys, os
F = os.path.dirname(os.path.abspath(__file__)) + '/'
bank = sys.argv[1] if len(sys.argv) > 1 else F + 'pruebas/banco_prueba.json'
out = sys.argv[2] if len(sys.argv) > 2 else F + '_artifact/index.html'
os.makedirs(os.path.dirname(out), exist_ok=True)
s = open(F + 'plantilla.html').read()
logo = 'data:image/jpeg;base64,' + base64.b64encode(open(F + 'lib/logo_s.jpg', 'rb').read()).decode()
lib = open(F + 'lib/avatar.bundle.js').read()
d = json.load(open(bank))
open(out, 'w').write(s.replace('__AVATAR_LIB__', lib).replace('__LOGO__', logo).replace('__BANK__', json.dumps(d, ensure_ascii=False).replace('</', '<\\/')))
print('artifact en', out)
