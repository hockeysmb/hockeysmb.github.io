# Recreativa (femenino/arcade.js): los cinco juegos en un móvil, jugados hasta el final (o hasta «Salir»).
# Comprueba que cada uno arranca, se dibuja, responde, termina y devuelve su resultado; deja capturas en _capturas/arcade/.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, subprocess, json
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
O = SHOTS + 'arcade/'; os.makedirs(O, exist_ok=True)
AV = "data:image/svg+xml;charset=utf-8," + "%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23f2c9a5'/%3E%3Ccircle cx='35' cy='45' r='6'/%3E%3Ccircle cx='65' cy='45' r='6'/%3E%3C/svg%3E"
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8775', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.goto('http://localhost:8775/femenino/arcade.js')
      await pg.set_content('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff"><script src="/femenino/arcade.js"></script></body></html>')
      await pg.wait_for_function('window.SMBArcade')
      print('juegos:', await pg.evaluate('SMBArcade.JUEGOS.map(j => j[0])'))
      async def jugar(modo, accion, limite):
        await pg.evaluate("([m, av]) => { window.__res = null; SMBArcade.jugar({ modo: m, avatarSrc: av, seed: 12345, titulo: 'Prueba', cele: '¡GOL!', onEnd: r => { window.__res = r; } }); }", [modo, AV])
        await pg.wait_for_selector('.ar-ov canvas'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=O + modo + '_0.png')
        box = await pg.locator('.ar-ov canvas').bounding_box()
        t = 0; foto = False
        while t < limite:
          try: await accion(box, t)
          except Exception: pass  # la partida ha terminado entre dos toques
          await pg.wait_for_timeout(250); t += .25
          if not foto and t >= 3: await pg.screenshot(path=O + modo + '_1.png'); foto = True
          if await pg.evaluate('!!window.__res'): break
        if not await pg.evaluate('!!window.__res'):
          await pg.screenshot(path=O + modo + '_2.png'); await pg.click('.ar-x'); await pg.wait_for_timeout(300)
        await pg.wait_for_function('!!window.__res', timeout=5000)
        r = await pg.evaluate('window.__res'); print(modo, '→', json.dumps(r, ensure_ascii=False))
        if r.get('modo') != modo or not isinstance(r.get('puntos'), int) or 'bolas' not in r: errs.append(modo + ': resultado raro')
        if await pg.locator('.ar-ov').count(): errs.append(modo + ': no se cierra')
        return r
      # muro: saca y no mueve el stick; pierde las tres bolas
      async def a_muro(box, t):
        await pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * .7)
      r = await jugar('muro', a_muro, 60)
      if r.get('salida'): errs.append('muro: no termina solo')
      # cruza: siempre hacia arriba
      async def a_cruza(box, t): await pg.click('.ar-pad [data-k="arriba"]', timeout=1500)
      r = await jugar('cruza', a_cruza, 60)
      if r.get('salida'): errs.append('cruza: no termina solo')
      # conduce: recto hasta la valla
      async def a_conduce(box, t):
        if t == 0: await pg.click('.ar-pad [data-k="arriba"]', timeout=1500)
      r = await jugar('conduce', a_conduce, 30)
      if r.get('salida'): errs.append('conduce: no termina solo')
      # invasión: se mueve de lado a lado arrastrando; si dura mucho, sale
      async def a_inv(box, t):
        x = box['x'] + box['width'] * (.2 + .6 * ((int(t * 4) // 8) % 2))
        await pg.mouse.move(x, box['y'] + box['height'] * .8); await pg.mouse.down(); await pg.mouse.move(x + 5, box['y'] + box['height'] * .8); await pg.mouse.up()
      await jugar('invasion', a_inv, 25)
      # tetris: gira y deja caer
      async def a_tet(box, t):
        await pg.click('.ar-pad [data-k="rota"]', timeout=1500) if int(t * 4) % 3 == 0 else None
        await pg.click('.ar-pad [data-k="cae"]', timeout=1500)
      r = await jugar('tetris', a_tet, 60)
      if r.get('salida'): errs.append('tetris: no termina solo')
      # teclado y pausa
      await pg.evaluate("() => { window.__res = null; SMBArcade.jugar({ modo: 'tetris', seed: 7, titulo: 'Teclado', onEnd: r => { window.__res = r; } }); }")
      await pg.wait_for_selector('.ar-ov canvas'); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowUp'); await pg.keyboard.press(' '); await pg.wait_for_timeout(400)
      await pg.keyboard.press('Escape'); await pg.wait_for_function('!!window.__res', timeout=3000); print('teclado →', await pg.evaluate('window.__res'))
      print('errs', errs)
      await b.close()
  finally:
    srv.terminate()
asyncio.run(main())
