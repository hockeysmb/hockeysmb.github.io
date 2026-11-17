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

HAY_FILAS = "() => document.querySelectorAll('tr.sidgad-calendario-partido').length"
CLIC_CALENDARIO = """() => {
  const b = [...document.querySelectorAll('button,a,[role=tab],li')]
    .find(x => /CALENDARIO/i.test((x.textContent || '').trim()) && (x.textContent || '').trim().length < 40);
  if (b) { b.click(); return true; } return false;
}"""
DIAGNOSTICO = """() => ({
  titulo: document.title, url: location.href,
  cuenta: Object.fromEntries(['tr.sidgad-calendario-partido','.sidgad-calendario-jornada','table','tr',
    '.sidgad-partido-fila','[class*=calendario]','button'].map(s => [s, document.querySelectorAll(s).length])),
  texto: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 300)
})"""

# --- camino rápido: el endpoint de siempre ---------------------------------
# Sigue vivo; lo que le faltaba era la cookie de sesión. Es mil veces más barato que abrir un navegador,
# así que se prueba primero y solo si no contesta se tira del navegador.
import html as _H, urllib.request, urllib.parse, http.cookiejar
SG = 'https://www.server2.sidgad.es/fmp/'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
CABE = {'User-Agent': UA, 'Referer': 'https://www.hockeypatines.fmp.es/', 'Origin': 'https://www.hockeypatines.fmp.es',
        'Accept': 'text/html, */*; q=0.01', 'Accept-Language': 'es-ES,es;q=0.9',
        'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded'}
_ab = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
_portal_abierto = []
_estados = set()   # qué estados trae la federación; se imprime al final para poder afinar

def _abrir_portal():
    if _portal_abierto: return
    _portal_abierto.append(True)
    try: _ab.open(urllib.request.Request('https://www.hockeypatines.fmp.es/', headers={'User-Agent': UA}), timeout=40).read()
    except Exception as e: print(f'aviso: no se ha podido abrir la portada ({e!r})')

def por_http(idc):
    """Pide el calendario al endpoint de siempre y lo devuelve con la misma forma que la tabla."""
    _abrir_portal()
    datos = urllib.parse.urlencode({'idc': idc, 'tipo_stats': '', 'site_lang': 'es'}).encode()
    with _ab.open(urllib.request.Request(SG + f'fmp_cal_idc_{idc}_1.php', data=datos, headers=CABE), timeout=40) as r:
        h = r.read().decode('utf-8', 'replace')
    filas = []
    for g, cuerpo in re.findall(r'<tr[^>]*gamedate="(\d{8})"[^>]*>(.*?)</tr>', h, re.S):
        eq = [_H.unescape(x).strip() for x in re.findall(r'nombre_junto_logo">\s*([^<]+?)\s*</div>', cuerpo)]
        cl = re.findall(r'logos_clubes/(\d+)[._]', cuerpo)
        if len(eq) < 2 or g == '00000000' or any('DESCANSO' in e.upper() for e in eq): continue
        hora = re.search(r'<td[^>]*>\s*(\d{1,2}:\d{2})\s*</td>', cuerpo)
        jor = re.search(r'JORNADA\s+(\d+)', cuerpo)
        res = re.search(r'web_link_td"[^>]*>\s*(\d+)\s*-\s*(\d+)\s*</td>', cuerpo)
        # La federación pone 0-0 en los partidos que todavía no se han jugado, igual que en un 0-0 de
        # verdad. Si la fila dice en qué estado está, un 0-0 que no sea FINAL no es un resultado.
        est = re.search(r'>\s*(FINAL|PREVIA|APLAZADO|SUSPENDIDO|EN JUEGO|DESCANSO)\s*<', cuerpo, re.I)
        estado = est.group(1).upper() if est else ''
        _estados.add(estado or '(sin estado)')
        marcador = f'{res.group(1)}:{res.group(2)}' if res else ''
        if marcador == '0:0' and estado and estado != 'FINAL': marcador = ''
        filas.append({'j': int(jor.group(1)) if jor else None,
                      'dia': f'{g[6:]}/{g[4:6]}/{g[:4]}', 'hora': hora.group(1) if hora else '', 'pista': '',
                      'local': eq[0], 'visitante': eq[1],
                      'cLocal': cl[0] if len(cl) > 0 else '', 'cVisit': cl[1] if len(cl) > 1 else '',
                      'res': marcador})
    return filas

def esperar_filas(pg, segundos=40):
    """La web es una aplicación de JavaScript: las filas tardan en aparecer. Esperamos a que las haya,
    sin pedir que sean «visibles» (al cargar en frío van dentro de un contenedor todavía oculto)."""
    for _ in range(int(segundos * 2)):
        if pg.evaluate(HAY_FILAS): return True
        pg.wait_for_timeout(500)
    return False

def abrir(pg, idc, ver=False):
    """Abre la página de una competición y devuelve sus filas."""
    pg.goto(PORTAL.format(idc), wait_until='domcontentloaded', timeout=60000)
    if not esperar_filas(pg, 25):
        # en frío puede abrirse en la portada de la competición: hay que entrar en «Calendario y resultados»
        pg.evaluate(CLIC_CALENDARIO)
        if not esperar_filas(pg, 25):
            print(f'  {idc}: no aparece la tabla. Lo que ve el navegador:')
            print('   ', json.dumps(pg.evaluate(DIAGNOSTICO), ensure_ascii=False)[:900])
            raise RuntimeError('no aparece la tabla del calendario')
    pg.wait_for_timeout(500)
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

# --- clasificación -----------------------------------------------------------
# El portal no da la clasificación sin su token (sondas del 17 nov: la página no la pinta fuera de un
# navegador de verdad y las rutas antiguas dan 403). El calendario sí trae todos los partidos de la
# competición con su resultado, así que la tabla se calcula: 3 puntos la victoria, 1 el empate, 0 la
# derrota; a igualdad, diferencia de goles y goles a favor. La oficial (con sanciones y desempate
# particular) es la de la federación, y la app lo dice. Las ligas XS puntúan por tiempos (reglamento
# Hockey XS 25/26: un punto por tiempo ganado), así que no se calculan.
SIN_CLASIF = {'pxs'}
def clasificacion(filas, equipos):
    hoy = datetime.date.today().isoformat()
    T = {}
    def fila(nombre, club):
        k = re.sub(r'\s+', ' ', nombre.strip().upper())
        if k not in T: T[k] = {'n': bonito(nombre.strip()), 'pj': 0, 'g': 0, 'e': 0, 'p': 0, 'gf': 0, 'gc': 0, 'pts': 0, 'smb': ''}
        if club == CLUB_SMB or re.search(r'BLANCA', nombre, re.I):
            letra = (re.search(r'\b([A-E])$', nombre.strip()) or [None, ''])[1]
            T[k]['smb'] = equipos.get(letra, '') or T[k]['smb']
        return T[k]
    for f in filas:
        if not f.get('local') or not f.get('visitante'): continue
        if any('DESCANSO' in x.upper() for x in (f['local'], f['visitante'])): continue
        a, b = fila(f['local'], f.get('cLocal', '')), fila(f['visitante'], f.get('cVisit', ''))
        d, m, y = (f.get('dia', '').split('/') + ['', '', ''])[:3]
        if not (y and m and d) or f'{y}-{m}-{d}' > hoy: continue   # lo que todavía no se ha jugado no cuenta
        g = re.match(r'^\s*(\d+)\s*[:\-]\s*(\d+)\s*$', f.get('res') or '')
        if not g: continue
        ga, gb = int(g.group(1)), int(g.group(2))
        if f'{y}-{m}-{d}' == hoy and ga == gb == 0: continue   # la federación pone 0:0 a lo que aún no se ha jugado
        for x, gf, gc in ((a, ga, gb), (b, gb, ga)):
            x['pj'] += 1; x['gf'] += gf; x['gc'] += gc
            if gf > gc: x['g'] += 1; x['pts'] += 3
            elif gf == gc: x['e'] += 1; x['pts'] += 1
            else: x['p'] += 1
    # una competición con grupos trae todos en el mismo calendario: cada grupo es el conjunto de equipos
    # que se enfrentan entre sí (contando también los partidos por jugar), y cada uno tiene su tabla
    ady = {k: set() for k in T}
    for f in filas:
        if not f.get('local') or not f.get('visitante') or any('DESCANSO' in x.upper() for x in (f['local'], f['visitante'])): continue
        a_, b_ = (re.sub(r'\s+', ' ', f[x].strip().upper()) for x in ('local', 'visitante'))
        ady[a_].add(b_); ady[b_].add(a_)
    grupos, visto = [], set()
    for k in T:
        if k in visto: continue
        pila, g = [k], []
        while pila:
            x = pila.pop()
            if x in visto: continue
            visto.add(x); g.append(x); pila.extend(ady[x] - visto)
        grupos.append(sorted((T[x] for x in g), key=lambda x: (-x['pts'], -(x['gf'] - x['gc']), -x['gf'], x['n'])))
    return grupos

# La oficial: la misma página que ve cualquiera (portada y, dentro de ella, ?liga=N&vista=clasificaciones).
# Si se puede leer, manda; si no, se queda la calculada. Sondas del 17 nov: entrando directo por la URL la
# página no carga la liga; hay que abrir la portada y cambiar de vista dentro, como hace al pulsar.
LEER_CLASIF = """(idc) => [...document.querySelectorAll('section.sidgad-clasif-bloque')].map(sec => ({
  titulo: ((sec.querySelector('.sidgad-clasif-titulo') || {}).textContent || '').trim(),
  filas: [...sec.querySelectorAll('table.sidgad-clasif-tabla tbody tr')].map(tr => {
    const td = [...tr.querySelectorAll('td')].map(x => x.textContent.trim());
    const img = tr.querySelector('.sidgad-clasif-equipo img'), a = tr.querySelector('a.sidgad-team-link');
    const m = img && (img.getAttribute('src') || '').match(/logos_clubes\\/(\\d+)/);
    return { pos: td[0], n: ((tr.querySelector('.sidgad-clasif-nombre') || {}).textContent || '').trim(), club: m ? m[1] : '',
             liga: a && (a.getAttribute('href') || '').includes('liga=' + idc), num: td.slice(2) };
  })
}))"""
def oficiales(pagina, log, ver=False):
    """Devuelve {idc: [bloques]} con la clasificación de la federación de cada liga que se pueda leer."""
    out = {}
    try:
        pg = pagina()
        pg.goto('https://www.hockeypatines.fmp.es/', wait_until='domcontentloaded', timeout=60000)
        pg.wait_for_timeout(4000)
    except Exception as e:
        log.append(f'clasificaciones oficiales: no abre la portada ({e!r})'); return out
    for idc, cat, pre, equipos in LIGAS:
        try:
            pg.evaluate("q => { history.pushState({}, '', '/?' + q); window.dispatchEvent(new PopStateEvent('popstate')); }", f'liga={idc}&vista=clasificaciones')
            bloques = []
            for _ in range(30):   # hasta 15 s a que pinte la tabla de esta liga (no la de la anterior)
                pg.wait_for_timeout(500)
                bloques = pg.evaluate(LEER_CLASIF, idc)
                if bloques and all(f['liga'] for b in bloques for f in b['filas']) and any(b['filas'] for b in bloques): break
            else: bloques = []
            if bloques: out[idc] = bloques
            if ver: print(f'  clasificación oficial {idc}: {sum(len(b["filas"]) for b in bloques)} filas en {len(bloques)} bloques')
        except Exception as e:
            log.append(f'{cat}: no se ha podido leer la clasificación oficial ({e!r})')
    return out

def tabla_oficial(bloques, equipos):
    """Los bloques de la federación con equipos nuestros, en la forma de la app."""
    res = []
    for b in bloques:
        T = []
        for f in b['filas']:
            num = [int(x) if re.match(r'^-?\d+$', x or '') else 0 for x in f['num']] + [0] * 8
            pts, pj, g, e, p, gf, gc = num[:7]
            smb = ''
            if f['club'] == CLUB_SMB or re.search(r'BLANCA', f['n'], re.I):
                letra = (re.search(r'\b([A-E])$', f['n'].strip()) or [None, ''])[1]
                smb = equipos.get(letra, '')
            T.append({'pos': f['pos'], 'n': bonito(f['n']), 'pj': pj, 'g': g, 'e': e, 'p': p, 'gf': gf, 'gc': gc, 'pts': pts, 'smb': smb})
        if any(x['smb'] for x in T): res.append((b['titulo'], T))
    return res

def main():
    args = sys.argv[1:]
    seco, ver = '--seco' in args, '--ver' in args
    solo = args[args.index('--liga') + 1] if '--liga' in args else None
    fem_viejo = json.load(open(JSON, encoding='utf-8'))
    viejo = json.load(open(JSON_TODOS, encoding='utf-8')) if os.path.exists(JSON_TODOS) else {'partidos': []}
    antes = {x['id']: x for x in viejo['partidos']}

    # El navegador solo se abre si hace falta: casi siempre basta con el camino corto.
    nav = {'p': None, 'pg': None}
    def pagina():
        if nav['pg'] is None:
            from playwright.sync_api import sync_playwright
            nav['p'] = sync_playwright().start()
            b = nav['p'].chromium.launch()
            nav['pg'] = b.new_context(locale='es-ES', viewport={'width': 1400, 'height': 1000}).new_page()
            print('  (abriendo el navegador)')
        return nav['pg']

    nuevos, log = [], []
    clasif = dict(viejo.get('clasif') or {})   # si una liga no se lee, se queda la tabla de antes
    try:
        for idc, cat, pre, equipos in LIGAS:
            if solo and idc != solo: continue
            previos = [x for x in viejo['partidos'] if x['id'].startswith(pre + '-')]
            filas, como = [], ''
            try:
                filas = por_http(idc); como = 'http'
            except Exception as e:
                log.append(f'{cat}: el camino corto no va ({e!r}); se abre el navegador')
            if not filas:
                try:
                    filas = abrir(pagina(), idc, ver); como = 'navegador'
                except Exception as e:
                    log.append(f'{cat}: tampoco con el navegador ({e!r})')
            if filas and pre not in SIN_CLASIF:
                try:
                    grupos = [g for g in clasificacion(filas, equipos) if any(x['smb'] for x in g) and len(g) >= 2]
                    for k in [k for k in clasif if k == pre or k.startswith(pre + '-g')]: del clasif[k]
                    for n, tabla in enumerate(grupos, 1):
                        clasif[pre if len(grupos) == 1 else f'{pre}-g{n}'] = {'cat': cat + (' · su grupo' if len(grupos) > 1 else ''), 'liga': idc, 'tabla': tabla}
                    if not grupos: log.append(f'{cat}: la clasificación no tiene al SMB; no se guarda')
                    elif len(grupos) > 1: log.append(f'{cat}: {len(grupos)} grupos con equipos nuestros')
                except Exception as e: log.append(f'{cat}: no se ha podido calcular la clasificación ({e!r})')
            try:
                L = nuestros(filas, equipos, cat, log) if filas else []
                if ver and filas: print(f'  {idc} ({como}): {len(filas)} filas, {len(L)} del SMB')
            except Exception as e:
                L = []; log.append(f'{cat}: no se ha podido entender la tabla ({e!r})')
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
        # la clasificación oficial manda sobre la calculada
        if True:
            O = oficiales(pagina, log, ver)
            for idc, cat, pre, equipos in LIGAS:
                if solo and idc != solo: continue
                if idc not in O: 
                    if pre in SIN_CLASIF: continue
                    log.append(f'{cat}: sin clasificación oficial; se usa la calculada'); continue
                grupos = tabla_oficial(O[idc], equipos)
                if not grupos: continue
                for k in [k for k in clasif if k == pre or k.startswith(pre + '-g')]: del clasif[k]
                for n, (tit, tabla) in enumerate(grupos, 1):
                    gr = '' if re.search(r'GENERAL', tit, re.I) or not tit else ' · ' + tit.capitalize()
                    clasif[pre if len(grupos) == 1 else f'{pre}-g{n}'] = {'cat': cat + gr, 'liga': idc, 'tabla': tabla, 'oficial': True}
    finally:
        if nav['p']:
            try: nav['p'].stop()
            except Exception: pass

    if solo:
        print('\n'.join(log)); print(json.dumps(nuevos, ensure_ascii=False, indent=1))
        print(json.dumps(clasif, ensure_ascii=False, indent=1)); return

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
    if clasif != (viejo.get('clasif') or {}): cambios.append('clasificaciones: ' + ', '.join(v['cat'] for k, v in clasif.items() if (viejo.get('clasif') or {}).get(k) != v))
    print('Estados que trae la federación:', ', '.join(sorted(_estados)) or 'ninguno')
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
            guardar(JSON_TODOS, {'fuente': fuente, 'actualizado': hoy, 'nota': nota, 'clasif': clasif}, nuevos)
            print(f'Guardados {len(nuevos)} partidos de {len({x["eq"] for x in nuevos})} equipos.')
        if femin and cambioF:
            fem_viejo.update({'fuente': fuente, 'actualizado': hoy, 'nota': nota})
            guardar(JSON, fem_viejo, femin)
            print(f'Jugadoras: guardados {len(femin)} partidos.')

if __name__ == '__main__': main()
