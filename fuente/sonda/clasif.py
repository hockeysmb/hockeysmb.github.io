# Sonda temporal 5: como una persona: portada -> competición -> Clasificación, y leer la tabla
import json, re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--disable-blink-features=AutomationControlled'])
    ctx = b.new_context(locale='es-ES', viewport={'width': 1400, 'height': 1000},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    pg = ctx.new_page()
    r = pg.evaluate("async () => (await (await fetch('https://www.server2.sidgad.es/new_portal/assets/js/sidgad-router.js?v=1794825281')).text())") if False else None
    pg.goto('https://www.hockeypatines.fmp.es/', wait_until='domcontentloaded', timeout=60000); pg.wait_for_timeout(6000)
    rt = pg.evaluate("async () => { const r = await fetch('https://www.server2.sidgad.es/new_portal/assets/js/sidgad-router.js?v=1794825281'); return await r.text(); }")
    for m in re.finditer(r'vista|liga|location|pushState|hash', rt):
        pass
    i = rt.find('vista'); print('ROUTER', rt[max(0, i-600):i+900].replace('\n', ' '))
    # entrar en Sub-15 desde la portada
    ok = pg.evaluate("""() => { const c = [...document.querySelectorAll('*')].filter(e => e.children.length < 3 && /SUB[- ]?15/i.test(e.textContent || '') && (e.textContent||'').trim().length < 60);
      const t = c[c.length - 1]; if (!t) return null; (t.closest('a,button,[onclick],li,div') || t).click(); return t.tagName + ' ' + (t.textContent||'').trim(); }""")
    print('CLIC SUB15', ok); pg.wait_for_timeout(7000); print('URL', pg.url)
    print('TEXTO', re.sub(r'\s+', ' ', pg.evaluate("document.body.innerText"))[:600])
    ok2 = pg.evaluate("""() => { const c = [...document.querySelectorAll('*')].filter(e => e.children.length < 3 && /^\\s*CLASIFICACI/i.test(e.textContent || '') && (e.textContent||'').trim().length < 30);
      const t = c[c.length - 1]; if (!t) return null; (t.closest('a,button,li,[role=tab]') || t).click(); return t.tagName + ' ' + (t.textContent||'').trim(); }""")
    print('CLIC CLASIF', ok2); pg.wait_for_timeout(7000); print('URL', pg.url)
    print('BLOQUES', pg.evaluate("document.querySelectorAll('.sidgad-clasif-tabla, .sidgad-clasif-bloque').length"))
    print('TABLA', pg.evaluate("""() => [...document.querySelectorAll('.sidgad-clasif-tabla, table')].slice(0,3).map(t => t.innerText.replace(/\\t/g,' | ').slice(0, 1500))"""))
    h = pg.evaluate("() => { const t = document.querySelector('.sidgad-clasif-tabla, .sidgad-clasif-bloque'); return t ? t.outerHTML.slice(0, 4000) : null; }")
    print('HTML', h)
    b.close()
