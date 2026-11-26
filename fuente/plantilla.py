"""Junta la app de entrenadores a partir de sus partes en fuente/app/.

Antes era un solo archivo (fuente/plantilla.html, unas 9.200 líneas). Ahora está partido por zonas:

  app/cabecera.html          título y fuentes de Google
  app/estilos/<zona>/NN-*.css los estilos
  app/cuerpo.html            el armazón de la página (barra, vistas, capas vacías)
  app/js/<zona>/NN-*.js      el programa

Zonas: base (armazón, navegación, capas comunes), datos, trabajo (ejercicios, sesiones, equipos, agenda,
Dirección Técnica), pizarra y juego (vestuario, liga, plantilla, cofres, amistosos).

El orden importa (en el CSS manda lo último; en el JS, una constante tiene que existir antes de usarse):
los archivos se juntan por su número NN, sin mirar la carpeta. Para añadir uno, dale el número que le
toca; si va entre el 05 y el 06, renumera los siguientes. Los números no se pueden repetir.

Todo el JS va dentro de una sola función con 'use strict' que pone este archivo; cada parte es un
trozo de esa función, así que una parte suelta no se ejecuta por sí misma.

El resultado lleva las marcas que sustituyen los builds: /* @sistema */, __AVATAR_LIB__, __LOGO__ y __BANK__.
Lo usan construir_web.py y construir_artifact.py.
Uso suelto: python3 fuente/plantilla.py [salida.html]   (escribe la página entera, sin sustituir las marcas)."""
import os, re, sys
F = os.path.dirname(os.path.abspath(__file__)) + '/'
A = F + 'app/'
NOMBRE = re.compile(r'^(\d\d)-[a-z0-9-]+\.(css|js)$')

def partes(tipo):
    """Archivos de app/<tipo>/ (por zonas, en subcarpetas), ordenados por su número."""
    fs = []
    for d, _, ns in os.walk(A + tipo):
        for n in ns:
            if n.startswith('.'): continue
            m = NOMBRE.match(n)
            if not m: raise SystemExit(f'fuente/app/{tipo}: «{n}» no sigue el formato NN-nombre.{ "css" if tipo == "estilos" else "js" }')
            fs.append((m.group(1), os.path.join(d, n)))
    nums = [k for k, _ in fs]
    rep = sorted({k for k in nums if nums.count(k) > 1})
    if rep: raise SystemExit(f'fuente/app/{tipo}: número repetido {", ".join(rep)}')
    return [p for _, p in sorted(fs)]

def leer(p): return open(p, encoding='utf-8', newline='').read()

def plantilla():
    """La página completa, igual que la antigua fuente/plantilla.html."""
    return (leer(A + 'cabecera.html')
            + '<style>\n' + ''.join(leer(p) for p in partes('estilos')) + '</style>\n'
            + leer(A + 'cuerpo.html')
            + '<script>__AVATAR_LIB__</script>\n'
            + '<script type="application/json" id="bank-default">__BANK__</script>\n'
            + "<script>\n(() => {\n'use strict';\n" + ''.join(leer(p) for p in partes('js')) + '})();\n</script>\n')

if __name__ == '__main__':
    s = plantilla()
    if len(sys.argv) > 1: open(sys.argv[1], 'w', encoding='utf-8', newline='').write(s); print(sys.argv[1], round(len(s) / 1024), 'KB')
    else: sys.stdout.write(s)
