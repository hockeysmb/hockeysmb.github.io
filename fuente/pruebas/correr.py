"""Construye la web y el artifact de prueba y pasa todas las pruebas (o las que se nombren).
Uso: python3 fuente/pruebas/correr.py [web_liga art_agenda ...]
Necesita Python con playwright y Chromium. Las capturas quedan en fuente/_capturas/."""
import sys, os, subprocess, re, glob, time
P = os.path.dirname(os.path.abspath(__file__)) + '/'
F = os.path.dirname(P.rstrip('/')) + '/'
subprocess.run([sys.executable, F + 'construir_web.py', F + '_web'], check=True)
subprocess.run([sys.executable, F + 'construir_artifact.py'], check=True)
names = sys.argv[1:] or sorted(os.path.basename(x)[:-3] for x in glob.glob(P + 'web_*.py') + glob.glob(P + 'art_*.py'))
bad = []
for n in names:
    t = time.time()
    r = subprocess.run([sys.executable, P + n + '.py'], capture_output=True, text=True, timeout=600)
    out = r.stdout + r.stderr
    errs = [l for l in out.splitlines() if re.match(r'^\s*(errs|errors)\s*\[', l)]
    real = [l for l in errs if re.sub(r"'console:Failed to load resource: net::ERR_FAILED',?\s*", '', l).strip() not in ('errs []', 'errors []')]
    ok = r.returncode == 0 and errs and not real
    print(('OK   ' if ok else 'FALLA'), n, f'({time.time() - t:.0f} s)')
    if not ok:
        bad.append(n); print('\n'.join(out.splitlines()[-12:]))
print('\nTodo bien.' if not bad else '\nFallan: ' + ', '.join(bad))
sys.exit(1 if bad else 0)
