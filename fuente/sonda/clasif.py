# Sonda temporal 3: desde el calendario (que sí carga), buscar la pestaña de clasificación y ver qué pinta.
import json, re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(locale='es-ES', viewport={'width': 1400, 'height': 1000}).new_page()
    reqs = []
    pg.on('request', lambda r: reqs.append((r.method, r.url[:200], (r.post_data or '')[:200])) if ('sidgad' in r.url and '/assets/' not in r.url) else None)
    pg.goto('https://www.hockeypatines.fmp.es/?liga=4853&vista=calendar', wait_until='domcontentloaded', timeout=60000)
    for _ in range(50):
        if pg.evaluate("document.querySelectorAll('tr.sidgad-calendario-partido').length"): break
        pg.wait_for_timeout(500)
    print('FILAS', pg.evaluate("document.querySelectorAll('tr.sidgad-calendario-partido').length"))
    print('NAV', pg.evaluate("[...document.querySelectorAll('a,button,[role=tab],li,[data-vista],[data-view]')].map(x=>((x.textContent||'').trim().replace(/\\s+/g,' ')+' |'+(x.getAttribute('href')||'')+'|'+(x.getAttribute('data-vista')||x.getAttribute('data-view')||''))).filter(t=>t.length<90).slice(0,120)"))
    print('PETICIONES CALENDARIO'); [print(' ', *r) for r in reqs]; reqs.clear()
    ok = pg.evaluate("""() => { const b = [...document.querySelectorAll('a,button,[role=tab],li,span,div')].filter(x => /^\\s*CLASIFICACI/i.test(x.textContent||'') && (x.textContent||'').trim().length < 30); const t = b[b.length-1]; if (t) { t.click(); return (t.tagName + ' ' + t.className + ' ' + (t.textContent||'').trim()); } return null; }""")
    print('CLIC', ok); pg.wait_for_timeout(8000); print('URL', pg.url)
    print('PETICIONES CLASIF'); [print(' ', *r) for r in reqs]
    print('CLASES', pg.evaluate("[...new Set([...document.querySelectorAll('[class*=clasif]')].map(e=>e.tagName+'.'+e.className))].slice(0,40)"))
    print('TABLAS', json.dumps(pg.evaluate("[...document.querySelectorAll('table')].map(t => t.className + ' :: ' + t.innerText.replace(/\\s+/g,' ').slice(0,500)).slice(0,5)"), ensure_ascii=False, indent=1))
    h = pg.evaluate("() => { const t = [...document.querySelectorAll('table')].find(t => /PTS|Pts|PJ/.test(t.innerText)); return t ? t.outerHTML.slice(0, 6000) : null; }")
    print('HTML', h)
    for u in ['https://www.hockeypatines.fmp.es/?liga=4853&vista=clasificacion', 'https://www.hockeypatines.fmp.es/?liga=4853&vista=standings']:
        reqs.clear(); pg.goto(u, wait_until='domcontentloaded'); pg.wait_for_timeout(7000)
        print('DIRECTO', u, pg.evaluate("document.querySelectorAll('table').length"), [r[1] for r in reqs][:5])
    b.close()
