# Rutas comunes de las pruebas (todo relativo al repositorio)
import os
P = os.path.dirname(os.path.abspath(__file__)) + '/'
F = os.path.dirname(P.rstrip('/')) + '/'
BANK = P + 'banco_prueba.json'          # banco inventado: el real no se sube nunca (el repositorio es público)
FAKEFB = P + 'fakefb.js'                # Firebase falso para la web
WEB = F + '_web'                        # web construida para probar
ART_URL = 'file://' + F + '_artifact/index.html'
MOCK_ART = open(P + 'mock_artifact.js').read()   # window.claude falso para el artifact
SHOTS = F + '_capturas/'
for d in ('', 'lav/after', 'club/shots', 'lg/shots', 'fx/shots', 'al/shots', 'rn/shots', 't5', 'tec2', 'bd'):
    os.makedirs(SHOTS + d, exist_ok=True)
