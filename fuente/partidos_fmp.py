"""Lee el calendario de la Federación Madrileña de Patinaje y actualiza femenino/partidos.json.
Lo ejecuta GitHub Actions cada mañana (.github/workflows/partidos-fmp.yml). Primera versión: solo explora la web
y guarda lo que encuentra en fuente/_fmp_muestra/ para escribir el lector."""
import os, re, urllib.request, ssl, json
BASE = 'https://www.hockeypatines.fmp.es'
LIGAS = {'4853': 'Sub-15', '4836': 'Sub-17', '4864': '1ª Autonómica'}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_fmp_muestra')
os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (compatible; SMB-femenino/1.0; +https://hockeysmb.github.io)'}
def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.geturl(), r.read().decode('utf-8', 'replace')
log = []
try:
    st, fin, home = get(BASE + '/')
    log.append(f'home {st} {fin} {len(home)}')
    open(os.path.join(OUT, 'home.html'), 'w').write(home)
    links = sorted(set(re.findall(r'href=["\']([^"\']+)["\']', home)))
    open(os.path.join(OUT, 'links.txt'), 'w').write('\n'.join(links))
    cand = [l for l in links if any(k in l for k in LIGAS)]
    log.append('candidatos: ' + ' '.join(cand[:40]))
    for l in cand[:12]:
        u = l if l.startswith('http') else BASE + ('' if l.startswith('/') else '/') + l
        try:
            st, fin, h = get(u); n = re.sub(r'[^a-z0-9]+', '_', u.lower())[-80:]
            open(os.path.join(OUT, n + '.html'), 'w').write(h); log.append(f'{st} {fin} {len(h)} BLANCA={h.upper().count("BLANCA")}')
        except Exception as e: log.append(f'ERROR {u} {e!r}')
    for lid in LIGAS:
        for pat in ('/league/{}', '/liga/{}', '/competicion/{}', '/calendar/{}', '/?league={}'):
            u = BASE + pat.format(lid)
            try:
                st, fin, h = get(u); n = re.sub(r'[^a-z0-9]+', '_', u.lower())[-80:]
                log.append(f'{st} {fin} {len(h)} BLANCA={h.upper().count("BLANCA")}')
                if 'BLANCA' in h.upper(): open(os.path.join(OUT, n + '.html'), 'w').write(h)
            except Exception as e: log.append(f'ERROR {u} {e!r}')
except Exception as e:
    log.append(f'ERROR home {e!r}')
# paso 2: el portal se pinta con portales.js de sidgad; guardarlo para ver qué ficheros pide
for u in ('https://www.server2.sidgad.es/portales.js?v=123',):
    try:
        st, fin, h = get(u); open(os.path.join(OUT, 'portales.js'), 'w').write(h); log.append(f'portales.js {st} {len(h)}')
        log.append('php: ' + ' '.join(sorted(set(re.findall(r"[\w'+ ]*_\w*\.php", h)))[:80]))
    except Exception as e: log.append(f'ERROR {u} {e!r}')
# paso 3: listado de competiciones -> cabecera de cada liga -> botón del calendario
import urllib.parse, html as H
SG = 'https://www.server2.sidgad.es/'
def post(url, data):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(), headers=dict(UA, **{'Content-Type': 'application/x-www-form-urlencoded', 'Referer': BASE + '/', 'X-Requested-With': 'XMLHttpRequest'}))
    with urllib.request.urlopen(req, timeout=30) as r: return r.read().decode('utf-8', 'replace')
def attrs(tag): return {k: H.unescape(v) for k, v in re.findall(r'([\w-]+)=["\']([^"\']*)["\']', tag)}
try:
    ls = ''
    for nombre, fn in (('get+ref', lambda: urllib.request.urlopen(urllib.request.Request(SG + 'fmp/fmp_ls_1.php', headers=dict(UA, Referer=BASE + '/', Origin=BASE)), timeout=30).read().decode('utf-8', 'replace')),
                       ('post', lambda: post(SG + 'fmp/fmp_ls_1.php', {})), ('post+temp', lambda: post(SG + 'fmp/fmp_ls_1.php', {'temp': '41', 'idm': '1', 'site_lang': 'es'})),
                       ('get temp', lambda: get(SG + 'fmp/fmp_ls_1.php?temp=41')[2]), ('get ls_41', lambda: get(SG + 'fmp/fmp_ls_41.php')[2])):
        try: r = fn(); log.append(f'ls {nombre}: {len(r)} 4853={"4853" in r}'); ls = ls or (r if '4853' in r else '')
        except Exception as e: log.append(f'ls {nombre}: ERROR {e!r}')
    open(os.path.join(OUT, 'ls.html'), 'w').write(ls)
    for idc in LIGAS:
        m = re.search(r'<[^>]*\bid=["\']' + idc + r'["\'][^>]*>', ls); log.append(f'{idc} fila: {m.group(0)[:300] if m else None}')
        if not m: continue
        a = attrs(m.group(0)); ta = re.search(r'id=["\']teams_array_' + idc + r'["\'][^>]*value=["\']([^"\']*)', ls) or re.search(r'value=["\']([^"\']*)["\'][^>]*id=["\']teams_array_' + idc, ls)
        hd = post(SG + 'competicion_header_creator.php', {'config_params': a.get('config_params', ''), 'idm': '1', 'teams_array': ta.group(1) if ta else '', 'cliente': 'fmp', 'temp': '41', 'idc': idc, 'logo': a.get('logo', ''), 'site_lang': 'es'})
        open(os.path.join(OUT, f'header_{idc}.html'), 'w').write(hd); log.append(f'{idc} header {len(hd)} acceso={a.get("acceso")}')
        for b in re.findall(r'<[^>]*\bfile=["\'][^"\']+["\'][^>]*>', hd):
            ba = attrs(b); log.append(f'   btn id={ba.get("id")} file={ba.get("file")}')
            if 'cal' in (ba.get('id', '') + ba.get('file', '')).lower():
                c = post(SG + 'fmp/fmp_' + ba['file'], {'idc': idc, 'tipo_stats': '', 'site_lang': 'es'})
                open(os.path.join(OUT, f'cal_{idc}_{ba.get("id")}.html'), 'w').write(c); log.append(f'   -> {len(c)} BLANCA={c.upper().count("BLANCA")}')
except Exception as e: log.append(f'ERROR paso 3 {e!r}')
open(os.path.join(OUT, 'log.txt'), 'w').write('\n'.join(log))
print('\n'.join(log))
