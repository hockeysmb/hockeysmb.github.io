import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Equipos y entrenadores (DT): resumen por entrenador, aviso de días que no coinciden y cambio de entrenador de un equipo
import asyncio, json
from playwright.async_api import async_playwright
O = SHOTS + 'eq/'; os.makedirs(O, exist_ok=True)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); errs = []
    ctx = await b.new_context(viewport={'width': 1280, 'height': 900})
    await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    await ctx.add_init_script('const OWNER=true;' + MOCK_ART)
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(400)
    by = await pg.evaluate("[...document.querySelectorAll('.eq-by li')].map(l=>l.innerText.replace(/\\n/g,': '))"); print('por entrenador:', by)
    raros = await pg.evaluate("[...document.querySelectorAll('.eq-row')].filter(r=>r.querySelector('.eq-raro')).map(r=>r.querySelector('b').textContent+' → '+r.querySelector('.eq-raro').textContent)"); print('no coinciden:', raros)
    await pg.screenshot(path=O + 'equipos.png', full_page=True)
    await pg.click('[data-eq="edit"][data-team="Benjamín D"]'); await pg.wait_for_timeout(300)
    # dejar solo a Jacobo
    for n in await pg.evaluate("[...document.querySelectorAll('[data-eqn][aria-pressed=\"true\"]')].map(b=>b.dataset.eqn)"):
      if n != 'Jacobo': await pg.click(f'[data-eqn="{n}"]')
    if not await pg.locator('[data-eqn="Jacobo"][aria-pressed="true"]').count(): await pg.click('[data-eqn="Jacobo"]')
    await pg.screenshot(path=O + 'modal.png')
    await pg.click('#m-ok'); await pg.wait_for_timeout(500)
    pub = await pg.evaluate("window.__pub.length ? JSON.parse(window.__pub[window.__pub.length-1]['data/banco.json']) : null")
    bd = [(g['dia'], g['ini'], g['ent']) for g in pub['horario']['g'] if 'Benjamín D' in ' '.join(g['eq'])] if pub else None
    print('Benjamín D en el horario:', bd, '| equipos:', pub and pub.get('equipos'))
    if not bd or any(e != ['Jacobo'] for _, _, e in bd): errs.append('Benjamín D no queda con Jacobo')
    raros2 = await pg.evaluate("[...document.querySelectorAll('.eq-row')].filter(r=>r.querySelector('.eq-raro')).map(r=>r.querySelector('b').textContent)"); print('siguen sin coincidir:', raros2)
    print('errs', errs); await b.close()
asyncio.run(main())
