#!/usr/bin/env python3
# Pasa las 41 mascotas de ChatGPT a webp para la app de jugadoras:
# recorta al contenido, limpia el borde semitransparente, las deja todas del mismo
# tamaño en un lienzo cuadrado y apoyadas abajo, como el dibujo que sustituyen.
import os, io
from PIL import Image
import numpy as np

# Uso: python3 fuente/mascotas.py <carpeta con los mascota_<nombre>_normal.png>
import sys
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'femenino', 'img', 'mascotas')
LADO, ALTO_MAX, ANCHO_MAX = 256, 0.92, 0.96   # ocupa casi todo el lienzo

MAPA = {  # id en mascotas.js -> archivo
  'abeja': 'abejita', 'axolote': 'ajolote', 'arana': 'aranita', 'ballena': 'ballena', 'buho': 'buho',
  'calabaza': 'calabacita', 'caracol': 'caracol', 'cerdito': 'cerdito', 'dragon': 'dragon', 'erizo': 'erizo',
  'fantasma': 'fantasmita', 'fenix': 'fenix', 'gatobrujo': 'gato_brujo', 'galactico': 'gato_galactico',
  'hamster': 'hamster', 'koala': 'koala', 'leon': 'leon', 'llama': 'llama', 'mapache': 'mapache',
  'mariquita': 'mariquita', 'medusa': 'medusa_neon', 'momia': 'momia', 'mosca': 'mosca',
  'murcielago': 'murcielago', 'osopolar': 'oso_polar', 'oveja': 'ovejita', 'panda': 'panda',
  'perezoso': 'perezoso', 'pinguino': 'pinguino', 'pulpo': 'pulpo', 'reycalabaza': 'rey_calabaza',
  'tigre': 'tigre', 'tortuga': 'tortuga', 'unicornio': 'unicornio', 'vampiro': 'vampirito', 'zorro': 'zorrito',
  'conejo': 'conejito', 'gato': 'gatito', 'pato': 'patito', 'perro': 'perrito', 'rana': 'ranita',
}
CARPETAS = [SRC, SRC + '/mascotas', SRC + '/banco-ilustraciones/mascotas-prueba']

def busca(nombre):
  for c in CARPETAS:
    p = os.path.join(c, 'mascota_%s_normal.png' % nombre)
    if os.path.exists(p): return p
  return None

def limpia(im):
  """Quita el halo: los píxeles casi transparentes fuera y el color de fondo que se cuela."""
  a = np.array(im.convert('RGBA')).astype(np.float32)
  al = a[..., 3] / 255.0
  al = np.where(al < 0.06, 0.0, al)                 # fuera la bruma
  al = np.clip((al - 0.06) / 0.94, 0, 1)            # y el resto, más opaco
  a[..., 3] = al * 255
  return Image.fromarray(a.astype(np.uint8), 'RGBA')

os.makedirs(OUT, exist_ok=True)
faltan, total = [], 0
for mid, nombre in sorted(MAPA.items()):
  p = busca(nombre)
  if not p: faltan.append(mid); continue
  im = limpia(Image.open(p))
  caja = im.getbbox()
  if caja: im = im.crop(caja)
  w, h = im.size
  k = min(LADO * ALTO_MAX / h, LADO * ANCHO_MAX / w)
  im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
  lienzo = Image.new('RGBA', (LADO, LADO), (0, 0, 0, 0))
  lienzo.paste(im, ((LADO - im.width) // 2, LADO - im.height - 4), im)   # apoyada abajo
  d = os.path.join(OUT, mid + '.webp')
  lienzo.save(d, 'WEBP', quality=80, method=6)
  total += os.path.getsize(d)
print('mascotas:', len(MAPA) - len(faltan), 'de', len(MAPA), '·', total // 1024, 'KB en total')
if faltan: print('FALTAN:', faltan)
