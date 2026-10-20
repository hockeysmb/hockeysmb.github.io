import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Flechas arrastrando (ordenador): se pegan a los jugadores, la conducción sale curva, dos clics también valen y el asa del medio curva
import asyncio, math
from playwright.async_api import async_playwright
O = SHOTS + 'pc/'; os.makedirs(O, exist_ok=True)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); errs = []
    ctx = await b.new_context(viewport={'width': 1366, 'height': 768})
    await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    await ctx.add_init_script('const OWNER=false;' + MOCK_ART)
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    await pg.click('[data-nav="ejercicios"]'); await pg.click('#btn-new'); await pg.wait_for_timeout(400)
    await pg.click('#canvas'); await pg.wait_for_timeout(400)
    box = await pg.locator('#canvas').bounding_box()
    # la pista va de -2 a 102 en x y de -2 a 52 en y (viewBox 104 x 54)
    X = lambda u: box['x'] + (u + 2) / 104 * box['width']; Y = lambda v: box['y'] + (v + 2) / 54 * box['height']
    D = lambda: pg.evaluate("window.SMB.edDiagram()")
    await pg.click('#bd-panel [data-bdt="atk"]')
    for u, v in ((30, 25), (55, 12), (60, 38)): await pg.mouse.click(X(u), Y(v))
    # pase arrastrando de un jugador a otro (sin acertar el centro)
    await pg.click('#bd-panel [data-bdt="pase"]')
    await pg.mouse.move(X(30.8), Y(25.6)); await pg.mouse.down(); await pg.mouse.move(X(45), Y(18), steps=6); await pg.mouse.move(X(54.4), Y(12.7), steps=6); await pg.mouse.up()
    d = await D(); a = d['arrows'][-1]; print('pase', a['pts'])
    da = math.hypot(a['pts'][0][0] - 30, a['pts'][0][1] - 25); db = math.hypot(a['pts'][1][0] - 55, a['pts'][1][1] - 12)
    if not (1.5 < da < 2.5 and 1.5 < db < 2.6) or len(a['pts']) != 2: errs.append('el pase no se pega a los jugadores')
    # conducción con curva
    await pg.click('#bd-panel [data-bdt="cond"]')
    await pg.mouse.move(X(60), Y(38)); await pg.mouse.down()
    for k in range(1, 21):
      t = k / 20; await pg.mouse.move(X(60 + 25 * t), Y(38 - 18 * math.sin(math.pi * t)))
    await pg.mouse.up()
    d = await D(); a = d['arrows'][-1]; print('conducción', len(a['pts']), 'puntos')
    if a['kind'] != 'cond' or len(a['pts']) < 3: errs.append('la conducción no sale curva')
    # movimiento con dos clics
    await pg.click('#bd-panel [data-bdt="mov"]')
    await pg.mouse.click(X(20), Y(40)); hint = await pg.text_content('#ed-hint'); await pg.mouse.click(X(40), Y(45))
    d = await D(); a = d['arrows'][-1]; print('movimiento a dos clics', a['kind'], len(a['pts']), '| aviso:', hint[:30])
    if a['kind'] != 'mov' or len(a['pts']) != 2: errs.append('dos clics no hacen flecha')
    await pg.screenshot(path=O + 'flechas.png')
    # elegir el pase y curvarlo con el asa del medio
    await pg.click('#bd-panel [data-bd="select"]')
    await pg.mouse.click(X(42.5), Y(18.6)); await pg.wait_for_timeout(150)
    m = pg.locator('#canvas [data-i="m"]'); print('asa del medio', await m.count())
    if await m.count():
      bb = await m.bounding_box(); await pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await pg.mouse.down(); await pg.mouse.move(X(40), Y(10), steps=5); await pg.mouse.up()
    d = await D(); print('pase curvado', len(d['arrows'][0]['pts']), 'puntos')
    if len(d['arrows'][0]['pts']) != 3: errs.append('el asa del medio no curva')
    await pg.screenshot(path=O + 'flechas_curva.png')
    print('errs', errs); await b.close()
asyncio.run(main())
