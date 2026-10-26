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
open(os.path.join(OUT, 'log.txt'), 'w').write('\n'.join(log))
print('\n'.join(log))
