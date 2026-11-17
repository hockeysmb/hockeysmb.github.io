# Sonda temporal: cómo da la federación la clasificación (qué pide la página y qué tabla pinta).
import json, re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(locale='es-ES', viewport={'width': 1400, 'height': 1000}).new_page()
    reqs = []
    pg.on('request', lambda r: reqs.append((r.method, r.url, (r.post_data or '')[:200])) if 'sidgad' in r.url else None)
    for vista in ['clasificacion', 'standings', 'clasification']:
        pg.goto(f'https://www.hockeypatines.fmp.es/?liga=4853&vista={vista}', wait_until='domcontentloaded', timeout=60000)
        pg.wait_for_timeout(6000)
        print('VISTA', vista, pg.url)
        print(' clases:', pg.evaluate("[...new Set([...document.querySelectorAll('[class*=clasif],[class*=standing],[class*=tabla]')].map(e=>e.className))].slice(0,30)"))
    # pestañas
    print('BOTONES', pg.evaluate("[...document.querySelectorAll('button,a,[role=tab],li')].map(x=>(x.textContent||'').trim()).filter(t=>t&&t.length<40).slice(0,80)"))
    ok = pg.evaluate("""() => { const b = [...document.querySelectorAll('button,a,[role=tab],li')].find(x => /CLASIFICACI/i.test((x.textContent||'').trim()) && (x.textContent||'').trim().length < 40); if (b) { b.click(); return (b.textContent||'').trim(); } return null; }""")
    print('CLIC', ok); pg.wait_for_timeout(8000)
    print('URL', pg.url)
    html = pg.evaluate("""() => { const t = [...document.querySelectorAll('table')].map(t => t.outerHTML.length + ' ' + t.className + ' :: ' + t.innerText.replace(/\\s+/g,' ').slice(0,400)); return t.slice(0,6); }""")
    print('TABLAS', json.dumps(html, ensure_ascii=False, indent=1))
    t1 = pg.evaluate("""() => { const t = [...document.querySelectorAll('table')].find(t => /PTS|PUNTOS|Pts/i.test(t.innerText)); return t ? t.outerHTML.slice(0, 5000) : null; }""")
    print('TABLA_CLASIF_HTML', t1)
    print('PETICIONES')
    for m, u, d in reqs: print(' ', m, u, d)
    b.close()
# y por HTTP, las rutas que siguen el patrón del calendario
import urllib.request, urllib.parse, http.cookiejar
ab = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
H = {'User-Agent': UA, 'Referer': 'https://www.hockeypatines.fmp.es/', 'Origin': 'https://www.hockeypatines.fmp.es', 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded'}
try: ab.open(urllib.request.Request('https://www.hockeypatines.fmp.es/', headers={'User-Agent': UA}), timeout=40).read()
except Exception as e: print('portada', e)
for ruta in ['fmp_clasif_idc_4853_1.php', 'fmp_clas_idc_4853_1.php', 'fmp_clasificacion_idc_4853_1.php', 'fmp_standings_idc_4853_1.php', 'fmp_cla_idc_4853_1.php']:
    try:
        with ab.open(urllib.request.Request('https://www.server2.sidgad.es/fmp/' + ruta, data=urllib.parse.urlencode({'idc': 4853, 'site_lang': 'es'}).encode(), headers=H), timeout=30) as r:
            h = r.read().decode('utf-8', 'replace'); print('HTTP', ruta, r.status, len(h), re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', h))[:600])
    except Exception as e: print('HTTP', ruta, repr(e)[:120])
