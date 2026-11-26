import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Bloque 1 de pulido (25 nov): lo que se arregló no vuelve. Móvil de 390 px.
import asyncio
from playwright.async_api import async_playwright
O = SHOTS + 'pulido/'; os.makedirs(O, exist_ok=True)
def ok(c, t):
  print(('  ok ' if c else 'FALLO ') + t)
  if not c: raise SystemExit(1)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); errs = []
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    await ctx.add_init_script('const OWNER=true;' + MOCK_ART)
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(900)
    # Inicio: sin el cofre ni las misiones
    ok(not await pg.locator('#v-inicio [data-cofre], #v-inicio .misiones').count(), 'Inicio sin cofre ni misiones')
    # Ejercicios: el vacío de «Mis ejercicios» ocupa todo el ancho; el pie legal es una línea
    await pg.click('[data-nav="ejercicios"]'); await pg.click('#tab-mias'); await pg.wait_for_timeout(300)
    w = await pg.evaluate("document.querySelector('#grid .empty').getBoundingClientRect().width / document.getElementById('grid').getBoundingClientRect().width")
    ok(w > .95, f'el vacío ocupa todo el ancho ({w:.2f})')
    ok(await pg.locator('#v-ejercicios footer.foot p').count() == 1, 'pie legal en una línea')
    # fases: en pantalla «Transición ofensiva/defensiva»; por dentro siguen igual
    await pg.click('#tab-banco'); await pg.click('#f-more'); await pg.wait_for_timeout(200)
    ch = await pg.evaluate("[...document.querySelectorAll('#f-fase .chip')].map(b => b.textContent + '=' + b.dataset.v)")
    ok('Transición ofensiva=Recuperación' in ch and 'Transición defensiva=Pérdida' in ch, f'fases en pantalla: {ch}')
    # editor: «Nuevo ejercicio» al crear; «Mi versión» al hacer la tuya de uno del club
    await pg.click('#btn-new'); await pg.wait_for_timeout(300)
    ok(await pg.text_content('#ed-title') == 'Nuevo ejercicio', 'el editor nuevo se titula «Nuevo ejercicio»')
    await pg.click('#ed-cancel'); await pg.wait_for_timeout(300)
    # DT: sin «Jugar la jornada» en el resumen
    await pg.click('[data-nav="dt"]'); await pg.wait_for_timeout(300)
    ok(not await pg.locator('#v-dt [data-dtdo="jornada"]').count(), 'el resumen de la DT no tiene «Jugar la jornada»')
    # Mi cuenta (el personaje de arriba) aparte de Mi personaje (Liga)
    await pg.click('#me-btn'); await pg.wait_for_timeout(300)
    tabs = await pg.evaluate("[...document.querySelectorAll('#v-vestuario .seg [data-vtab]')].map(b => b.dataset.vtab)")
    ok(tabs == ['datos', 'envios'] and await pg.text_content('#v-vestuario h1') == 'Mi cuenta' and not await pg.locator('#v-vestuario .me').count(), f'Mi cuenta solo con cuenta: {tabs}')
    await pg.screenshot(path=O + 'mi_cuenta.png', full_page=True)
    await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300)
    ok(await pg.locator('#v-liga .misiones').count() == 1, 'las misiones están en el pabellón')
    await pg.click('[data-liga="personaje"]'); await pg.wait_for_timeout(300)
    tabs = await pg.evaluate("[...document.querySelectorAll('#v-vestuario .seg [data-vtab]')].map(b => b.dataset.vtab)")
    ok(await pg.text_content('#v-vestuario h1') == 'Mi personaje' and 'datos' not in tabs, f'Mi personaje sin la cuenta: {tabs}')
    await pg.screenshot(path=O + 'mi_personaje.png', full_page=True)
    # Liga: Clasificación con mensaje antes de empezar; «Tu plantilla» cabe en 390
    await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300)
    await pg.locator('#v-liga [data-lgtab="hoy"]').first.click(); await pg.wait_for_timeout(300)
    await pg.locator('#v-liga .lg-tabs button', has_text='Clasificación').click(); await pg.wait_for_timeout(300)
    ok(len((await pg.text_content('#v-liga')).strip()) > 0 and await pg.locator('#v-liga .ses-sec').count() > 0, 'la Clasificación no sale en blanco')
    await pg.evaluate("document.querySelector('[data-club=\"entrenar\"]') ? document.querySelector('[data-club=\"entrenar\"]').click() : null"); await pg.wait_for_timeout(400)
    for t in ('entrenar', 'mercado', 'ciudad', 'plantilla'):
      bt = pg.locator(f'#club-ov [data-cltab="{t}"]')
      if await bt.count(): await bt.click(); await pg.wait_for_timeout(250)
      sw = await pg.evaluate("(() => { const o = document.getElementById('club-ov'); return o ? o.scrollWidth : 0 })()")
      ok(0 < sw <= 390, f'«Tu plantilla» · {t}: {sw} px de ancho')
    await pg.screenshot(path=O + 'tu_plantilla.png')
    print('errs', errs); await b.close()
asyncio.run(main())
