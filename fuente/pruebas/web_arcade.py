# Recreativa en la app de entrenadores (10 nov): Liga → Recreativa, jugar, guardar el récord en el perfil y verlo en el top 3.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json, subprocess
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano'}
O = SHOTS + 'arcade/'; os.makedirs(O, exist_ok=True)
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8777', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.route('**/femenino/arcade.js*', lambda r: r.fulfill(path=ROOT + '/femenino/arcade.js', content_type='text/javascript; charset=utf-8'))
      await ctx.add_init_script(path=FAKEFB)
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.clock.set_system_time(__import__('datetime').datetime(2026, 11, 10, 18, 0, 0))
      await pg.goto('http://localhost:8777/'); await pg.wait_for_timeout(600)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(400)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(400)
      tabs = await pg.evaluate("[...document.querySelectorAll('[data-lgtab]')].map(b => b.dataset.lgtab)"); print('pestañas:', tabs)
      if 'recreativa' not in tabs: errs.append('no sale la pestaña Recreativa')
      await pg.click('.lg-tabs [data-lgtab="recreativa"]'); await pg.wait_for_timeout(300)
      print('juegos:', await pg.evaluate("[...document.querySelectorAll('.arc-card h3')].map(h => h.textContent)"))
      await pg.screenshot(path=O + 'web_recreativa.png', full_page=True)
      await pg.click('[data-arc="muro"]'); await pg.wait_for_selector('.ar-ov canvas', timeout=5000); await pg.wait_for_timeout(500)
      box = await pg.locator('.ar-ov canvas').bounding_box()
      for i in range(160):
        if not await pg.locator('.ar-ov').count(): break
        await pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * .75); await pg.wait_for_timeout(250)
        if i == 12: await pg.screenshot(path=O + 'web_muro.png')
      if await pg.locator('.ar-ov').count(): await pg.click('.ar-x'); await pg.wait_for_timeout(500)
      await pg.wait_for_timeout(1600)
      g = await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-personaje') || '{}').arc"); print('récord en el juego:', g)
      if not g or not g.get('muro'): errs.append('no guarda el récord')
      await pg.wait_for_timeout(1500)
      prof = await pg.evaluate("(() => { const p = window.__fake.db()['profiles/dtuid000000000000000000000001']; return p ? JSON.parse(p.j || '{}').arc : null; })()"); print('récord en el perfil:', prof)
      if not prof or prof.get('muro') != g.get('muro'): errs.append('el récord no llega al perfil')
      top = await pg.evaluate("[...document.querySelectorAll('.arc-card')][0].innerText.replace(/\\s+/g, ' ')"); print('ficha:', top[:200])
      if 'Carlos Manzano' not in top: errs.append('no sale en el top 3')
      await pg.screenshot(path=O + 'web_recreativa_2.png', full_page=True)
      print('errs', errs)
      await b.close()
  finally:
    srv.terminate()
asyncio.run(main())
