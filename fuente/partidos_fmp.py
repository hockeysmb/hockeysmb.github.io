"""Actualiza femenino/partidos.json con los partidos de la Federación Madrileña de Patinaje.

Lo ejecuta GitHub Actions dos veces al día (.github/workflows/partidos-fmp.yml) y guarda solo si hay cambios.
Uso local: python3 fuente/partidos_fmp.py [--seco] [--liga 4853] [--ver]

La federación cambió el portal el 28 de octubre de 2026. Antes se podía pedir el calendario con un POST
a fmp/fmp_cal_idc_{idc}_1.php; ahora el portal es una aplicación de JavaScript que pide los datos a
api.sidgad.com con un token suyo. Como no vamos a usar un token que no es nuestro, abrimos la misma
página pública que ve cualquiera (hockeypatines.fmp.es/?liga=NNNN&vista=calendar) con un navegador
y leemos la tabla.

La tabla: cada <tr class="sidgad-calendario-partido"> trae el día, la hora, la pista, los dos equipos
con su logo (el número del logo es el club: el SMB es el 428) y el resultado «2:5». La jornada está en
el <tr class="sidgad-calendario-jornada"> de encima.

Si una competición no se puede leer o sale rara (menos de la mitad de partidos), se dejan los que había:
nunca se vacía.
"""
import os, re, sys, json, datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Dos ficheros, de una sola lectura:
#  - femenino/partidos.json: solo Sub-15, Sub-17 y 1ª Autonómica femenina, con los mismos campos y los
#    mismos identificadores de siempre (s15-3, af-2...). Las jugadoras tienen guardado lo que contaron
#    de cada partido con esa clave: si cambia el identificador, se quedan huérfanos.
#  - partidos.json (raíz): todos los equipos, para la app de entrenadores.
JSON = os.path.join(RAIZ, 'femenino', 'partidos.json')
JSON_TODOS = os.path.join(RAIZ, 'partidos.json')
FEM = {'s15': 'Sub-15', 's17': 'Sub-17', 'af': '1ª Autonómica'}   # lo que ve la app de jugadoras
PORTAL = 'https://www.hockeypatines.fmp.es/?liga={}&vista=calendar'
CLUB_SMB = '428'

# Las competiciones de 2026/27 y a qué equipo nuestro corresponde cada letra.
# «STA Mª LA BLANCA A» en Benjamín 1ª división es nuestro Benjamín A. Los nombres de la derecha
# son los del horario (los mismos que salen en la zona Equipos de la app).
# pre = cómo empiezan los identificadores de esa competición en el json.
LIGAS = [
    ('4870', 'Prebenjamín XS',          'pxs', {'': 'Prebenjamín B', 'B': 'Prebenjamín B'}),
    ('4861', 'Prebenjamín 1ª',          'pre', {'': 'Prebenjamín A', 'A': 'Prebenjamín A'}),
    ('4854', 'Benjamín 1ª',             'be1', {'A': 'Benjamín A', 'B': 'Benjamín B'}),
    ('4857', 'Benjamín 2ª',             'be2', {'C': 'Benjamín C', 'D': 'Benjamín D', 'E': 'Benjamín E'}),
    ('4829', 'Alevín 1ª',               'al1', {'A': 'Alevín A', '': 'Alevín A'}),
    ('4847', 'Alevín 2ª',               'al2', {'B': 'Alevín B', 'C': 'Alevín C'}),
    ('4842', 'Infantil 1ª',             'in1', {'A': 'Infantil A', '': 'Infantil A'}),
    ('4844', 'Infantil 2ª',             'in2', {'B': 'Infantil B', '': 'Infantil B'}),
    ('4826', 'Júnior',                  'jun', {'': 'Junior', 'A': 'Junior'}),
    ('4834', 'Sub-13',                  's13', {'': 'Sub13'}),
    ('4853', 'Sub-15',                  's15', {'': 'Sub15'}),
    ('4836', 'Sub-17',                  's17', {'': 'Sub17'}),
    ('4864', '1ª Autonómica',           'af',  {'': 'Senior Fem'}),
    ('4835', '1ª Autonómica masculina', 'am',  {'': 'Autonómica'}),
]
# Sin equipo nuestro: 4913 Micro XS, 4837 Juvenil, 4865 2ª Autonómica masculina.

MINUS = {'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y'}
def bonito(n):
    n = re.sub(r'\bSTA\.? Mª', 'SANTA MARÍA', n)
    out = []
    for i, w in enumerate(n.split()):
        if w in MINUS and i: out.append(w.lower())
        elif len(w) <= 3 and w.isalpha() and not re.search(r'[AEIOUÁÉÍÓÚ]', w): out.append(w)   # CP, RH, PC, HC
        else: out.append(w[:1] + w[1:].lower())
    return ' '.join(out)

LEER_TABLA = """() => {
  const txt = (e, s) => { const x = e.querySelector(s); return x ? x.textContent.trim() : ''; };
  const club = (e, lado) => {
    const img = e.querySelector('.sidgad-col-logo-' + lado + ' img');
    const m = img && (img.getAttribute('src') || '').match(/logos_clubes\\/(\\d+)/);
    return m ? m[1] : '';
  };
  const filas = [...document.querySelectorAll('tr.sidgad-calendario-jornada, tr.sidgad-calendario-partido')];
  let jor = null; const out = [];
  for (const f of filas) {
    if (f.classList.contains('sidgad-calendario-jornada')) {
      const m = (f.textContent || '').match(/(\\d+)/); jor = m ? +m[1] : null; continue;
    }
    out.push({ j: jor, dia: txt(f, '.sidgad-col-dia'), hora: txt(f, '.sidgad-col-hora'),
               pista: txt(f, '.sidgad-col-pista'),
               local: txt(f, '.sidgad-col-equipo-home'), visitante: txt(f, '.sidgad-col-equipo-away'),
               cLocal: club(f, 'home'), cVisit: club(f, 'away'), res: txt(f, '.sidgad-col-resultado') });
  }
  return out;
}"""

def abrir(pg, idc, ver=False):
    """Abre la página de una competición y devuelve sus filas."""
    pg.goto(PORTAL.format(idc), wait_until='domcontentloaded', timeout=60000)
    pg.wait_for_selector('tr.sidgad-calendario-partido', timeout=45000)
    pg.wait_for_timeout(600)
    filas = pg.evaluate(LEER_TABLA)
    if ver: print(f'  {idc}: {len(filas)} filas en la tabla')
    return filas

def nuestros(filas, equipos, cat, log):
    """De todas las filas, las del SMB, ya repartidas por equipo nuestro."""
    P, sueltos = [], set()
    for f in filas:
        if not f['dia']: continue
        for lado, otro in (('local', 'visitante'), ('visitante', 'local')):
            club = f['cLocal'] if lado == 'local' else f['cVisit']
            nombre = f[lado]
            if club != CLUB_SMB and not re.search(r'BLANCA', nombre, re.I): continue
            letra = (re.search(r'\b([A-E])$', nombre.strip()) or [None, ''])[1]
            eq = equipos.get(letra)
            if not eq: sueltos.add(f'{nombre} (letra {letra or "sin letra"})'); continue
            d, m, a = (f['dia'].split('/') + ['', '', ''])[:3]
            if not (a and m and d): continue
            goles = re.match(r'^\s*(\d+)\s*[:\-]\s*(\d+)\s*$', f['res'] or '')
            res = ''
            if goles:
                g = (goles.group(1), goles.group(2))
                res = f'{g[0]}-{g[1]}' if lado == 'local' else f'{g[1]}-{g[0]}'
            P.append({'eq': eq, 'cat': cat, 'j': f['j'], 'fecha': f'{a}-{m}-{d}',
                      'hora': f['hora'].strip(), 'pista': f['pista'].strip(),
                      'rival': bonito(f[otro]), 'casa': lado == 'local', 'res': res})
    for s in sorted(sueltos): log.append(f'{cat}: «{s}» no sé de qué equipo nuestro es')
    return P

def main():
    args = sys.argv[1:]
    seco, ver = '--seco' in args, '--ver' in args
    solo = args[args.index('--liga') + 1] if '--liga' in args else None
    fem_viejo = json.load(open(JSON, encoding='utf-8'))
    viejo = json.load(open(JSON_TODOS, encoding='utf-8')) if os.path.exists(JSON_TODOS) else {'partidos': []}
    antes = {x['id']: x for x in viejo['partidos']}
    from playwright.sync_api import sync_playwright

    nuevos, log = [], []
    with sync_playwright() as p:
        nav = p.chromium.launch()
        ctx = nav.new_context(locale='es-ES', viewport={'width': 1400, 'height': 1000})
        pg = ctx.new_page()
        for idc, cat, pre, equipos in LIGAS:
            if solo and idc != solo: continue
            previos = [x for x in viejo['partidos'] if x['id'].startswith(pre + '-')]
            try:
                L = nuestros(abrir(pg, idc, ver), equipos, cat, log)
            except Exception as e:
                L = []; log.append(f'{cat}: no se ha podido leer ({e!r})')
            if not L or (previos and len(L) < len(previos) / 2):
                log.append(f'{cat}: {len(L)} partidos leídos (había {len(previos)}): se dejan los de antes')
                nuevos += previos; continue
            for x in L:
                # un equipo puede jugar dos veces la misma jornada (torneos), así que el id lleva la fecha
                base = f'{pre}-{x["eq"].replace(" ", "")}-{x["j"] or x["fecha"]}'
                pid, n = base, 2
                while any(y['id'] == pid for y in nuevos): pid = f'{base}_{n}'; n += 1
                a = antes.get(pid, {})
                # el nombre del rival se deja como estaba si es el mismo equipo (está escrito a mano y bonito)
                import difflib
                rival = a['rival'] if a and difflib.SequenceMatcher(None, x['rival'].lower(), a.get('rival', '').lower()).ratio() >= 0.6 else x['rival']
                nuevos.append({'id': pid, 'eq': x['eq'], 'cat': cat, 'j': x['j'], 'fecha': x['fecha'],
                               'hora': x['hora'], 'pista': x['pista'], 'rival': rival, 'casa': x['casa'], 'res': x['res']})
            log.append(f'{cat}: {len(L)} partidos')
        nav.close()

    if solo:
        print('\n'.join(log)); print(json.dumps(nuevos, ensure_ascii=False, indent=1)); return

    orden = {pre: i for i, (_, _, pre, _) in enumerate(LIGAS)}
    nuevos.sort(key=lambda x: (orden.get(x['id'].split('-')[0], 99), x['fecha'], x['hora']))
    cambios = []
    for x in nuevos:
        a = antes.get(x['id'])
        if not a: cambios.append(f'nuevo {x["id"]} {x["fecha"]} {x["rival"]}')
        else:
            d = [f'{k}: {a.get(k)!r} → {x[k]!r}' for k in ('fecha', 'hora', 'res', 'rival', 'casa') if a.get(k) != x[k]]
            if d: cambios.append(f'{x["id"]} ' + ', '.join(d))
    for k in antes:
        if k not in {x['id'] for x in nuevos}: cambios.append(f'quitado {k}')
    print('\n'.join(log)); print('\n'.join(cambios[:60]) or 'Sin cambios')
    if len(cambios) > 60: print(f'... y {len(cambios) - 60} cambios más')

    # el de las jugadoras: solo sus tres competiciones, con los identificadores de siempre
    femin = []
    for x in nuevos:
        pre = x['id'].split('-')[0]
        if pre not in FEM: continue
        femin.append({'id': f'{pre}-{x["j"]}' if x['j'] else f'{pre}-{x["fecha"]}', 'cat': FEM[pre], 'j': x['j'],
                      'fecha': x['fecha'], 'hora': x['hora'], 'rival': x['rival'], 'casa': x['casa'], 'res': x['res']})
    antesF = {x['id']: x for x in fem_viejo['partidos']}
    cambioF = any(antesF.get(x['id']) != x for x in femin) or len(femin) != len(antesF)
    if femin and not cambioF: print('Jugadoras: sin cambios')

    def guardar(ruta, cab, lista):
        txt = '{\n' + ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}'
                                 for k, v in cab.items() if k != 'partidos')
        txt += ',\n  "partidos": [\n' + ',\n'.join('    ' + json.dumps(x, ensure_ascii=False) for x in lista) + '\n  ]\n}\n'
        open(ruta, 'w', encoding='utf-8').write(txt)

    if not seco:
        hoy = datetime.date.today().isoformat()
        nota = ('res = goles del SMB - goles del rival. hora vacía = la federación todavía no la ha puesto. '
                'Se actualiza solo dos veces al día (fuente/partidos_fmp.py).')
        fuente = 'Federación Madrileña de Patinaje (hockeypatines.fmp.es)'
        if cambios:
            guardar(JSON_TODOS, {'fuente': fuente, 'actualizado': hoy, 'nota': nota}, nuevos)
            print(f'Guardados {len(nuevos)} partidos de {len({x["eq"] for x in nuevos})} equipos.')
        if femin and cambioF:
            fem_viejo.update({'fuente': fuente, 'actualizado': hoy, 'nota': nota})
            guardar(JSON, fem_viejo, femin)
            print(f'Jugadoras: guardados {len(femin)} partidos.')

if __name__ == '__main__': main()
