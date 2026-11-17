# Sonda temporal 4: leer el código del portal desde la propia página (con las cabeceras del navegador)
import json, re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--disable-blink-features=AutomationControlled'])
    ctx = b.new_context(locale='es-ES', viewport={'width': 1400, 'height': 1000},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    pg = ctx.new_page(); reqs = []
    pg.on('request', lambda r: reqs.append(r.url[:220] + ' ' + (r.post_data or '')[:150]) if ('/assets/' not in r.url and 'google' not in r.url and 'gstatic' not in r.url) else None)
    pg.goto('https://www.hockeypatines.fmp.es/', wait_until='domcontentloaded', timeout=60000); pg.wait_for_timeout(6000)
    print('PORTADA texto:', re.sub(r'\s+', ' ', pg.evaluate("document.body.innerText"))[:500])
    print('ENLACES:', pg.evaluate("[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(Boolean).slice(0,60)"))
    for js in ['sidgad-router.js', 'sidgad-clasificacion.js', 'sidgad-league.js']:
        t = pg.evaluate("u => fetch(u).then(r => r.status + ' ' + r.headers.get('content-type') + '\\n' + r.text().then ? '' : '').catch(e => 'ERR ' + e)", 'x')
        t = pg.evaluate("async u => { try { const r = await fetch(u); return r.status + '|' + (await r.text()); } catch (e) { return 'ERR ' + e; } }", f'https://www.server2.sidgad.es/new_portal/assets/js/{js}?v=1794825281')
        st, _, body = t.partition('|')
        print('==', js, st, len(body))
        for m in sorted(set(re.findall(r"""[`'"]([^`'"\s]{0,80}(?:\.php|api|clasif|standing|vista|route|#/)[^`'"\s]{0,80})[`'"]""", body)))[:80]: print('   ', m)
        i = body.find('fetch('); print('  FETCH', body[max(0, i-300):i+400].replace('\n', ' ') if i >= 0 else '-')
    print('PETICIONES:'); [print(' ', r) for r in reqs[:60]]
    b.close()
