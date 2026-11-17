# Sonda temporal 6: portada y luego, dentro de la página, a ?liga=4853&vista=clasificaciones
import json, re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--disable-blink-features=AutomationControlled'])
    ctx = b.new_context(locale='es-ES', viewport={'width': 1400, 'height': 1000},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    pg = ctx.new_page()
    pg.goto('https://www.hockeypatines.fmp.es/', wait_until='domcontentloaded', timeout=60000); pg.wait_for_timeout(5000)
    for liga in ['4853', '4857']:
        pg.evaluate("q => { history.pushState({}, '', '/?' + q); window.dispatchEvent(new PopStateEvent('popstate')); }", f'liga={liga}&vista=clasificaciones')
        pg.wait_for_timeout(7000)
        print('==', liga, pg.url)
        print('CLASES', pg.evaluate("[...new Set([...document.querySelectorAll('[class*=clasif]')].map(e=>e.tagName+'.'+String(e.className).slice(0,60)))].slice(0,30)"))
        print('TEXTO', re.sub(r'\s+', ' ', pg.evaluate("(document.querySelector('[class*=clasif]')||document.body).innerText"))[:1500])
        print('HTML', (pg.evaluate("() => { const t = document.querySelector('.sidgad-clasif-tabla') || document.querySelector('[class*=clasif-tabla]'); return t ? t.outerHTML : null; }") or '')[:3500])
    b.close()
