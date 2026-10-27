import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Los tres juegos del reto jugados de verdad en un móvil, hasta que se acaban solos (sin pulsar «Salir»):
# patina el 26, penaltis el 27 y portera el 28. Comprueba que se guarda la partida, que da monedas y que se puede volver a jugar.
import asyncio, subprocess, datetime, json, random
from playwright.async_api import async_playwright
from fem_reto import seed_reto
from fem_dt import CFG, ROOT
O = SHOTS + 'fem_juegos/'; os.makedirs(O, exist_ok=True)

async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8772', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  errs = []
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch()
      for dia, modo in ((26, 'patina'), (27, 'penaltis'), (28, 'portera')):
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, service_workers='block')
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
        await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await ctx.route('**/femenino/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
        db0 = seed_reto(); f = '2026-10-%02d' % dia
        k = 'registros/demo03/dias/' + f
        db0.setdefault(k, {'ts': 1}).update({'diario': {'tiempo': 4, 'mejor': 'Presioné bien', 'cambiar': '', 'como': '', 'ts': 1}, 'antes': {'sueno': 8, 'fatiga': 7, 'dolor': 8, 'estres': 7, 'animo': 8, 'esc': 10, 'ts': 1}})
        users = {'demo03@ejemplo.com': {'uid': 'demo03', 'pass': 'hockey1'}}
        await ctx.add_init_script("if (!localStorage.getItem('__seeded')) { localStorage.setItem('__fakefem', " + json.dumps(json.dumps(db0)) + "); localStorage.setItem('__fakefemusers', " + json.dumps(json.dumps(users)) + "); localStorage.setItem('smbf-bienvenida-demo03', '1'); localStorage.setItem('smbf-sonido', 'no'); localStorage.setItem('__seeded', '1'); }")
        await ctx.add_init_script(path=P + 'fakefem.js')
        pg = await ctx.new_page(); pe = []; pg.on('pageerror', lambda e: pe.append(str(e)))
        await pg.clock.set_system_time(datetime.datetime(2026, 10, dia, 18, 0, 0))
        await pg.goto('http://localhost:8772/femenino/'); await pg.wait_for_timeout(700)
        await pg.fill('#l-email', 'demo03@ejemplo.com'); await pg.fill('#l-pass', 'hockey1'); await pg.click('[data-a="in"]'); await pg.wait_for_timeout(1000)
        await pg.click('.nav [data-v="reto"]'); await pg.wait_for_timeout(400)
        h1 = (await pg.text_content('.rt-hero h1')).strip(); dis = await pg.locator('.rt-play[disabled]').count()
        print(f, 'juego del día:', h1, '· jugar bloqueado:', bool(dis), (await pg.text_content('.rt-gate') or '').strip()[:80] if dis else '')
        if dis: errs.append(f + ': no deja jugar con todo contestado'); await ctx.close(); continue
        for vez in (1, 2):
          j0 = await pg.evaluate("window.__fake.db()['juego/demo03'] || {}")
          await pg.click('.rt-play'); await pg.wait_for_selector('.jg-ov'); await pg.wait_for_timeout(2600)
          box = await pg.locator('.jg-ov canvas').bounding_box(); t0 = asyncio.get_event_loop().time(); n = 0
          # juega «a lo loco» hasta que se acaba sola (máx. 2 min)
          while await pg.locator('.jg-ov').count() and asyncio.get_event_loop().time() - t0 < 120:
            n += 1
            if modo == 'patina': await pg.keyboard.press(random.choice(['ArrowLeft', 'ArrowRight', 'ArrowUp'])); await pg.wait_for_timeout(700)
            elif modo == 'penaltis': await pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.6); await pg.wait_for_timeout(random.randint(250, 900))
            else: await pg.touchscreen.tap(box['x'] + box['width'] * random.choice([0.15, 0.5, 0.85]), box['y'] + box['height'] * 0.7); await pg.wait_for_timeout(500)
            if n == 6: await pg.screenshot(path=O + f'{modo}_{vez}_jugando.png')
          await pg.wait_for_timeout(1500)
          j1 = await pg.evaluate("window.__fake.db()['juego/demo03'] || {}")
          res = await pg.locator('.rt-res').count(); txt = ' '.join((await pg.text_content('.rt-res') or '').split())[:120] if res else ''
          print(f'  partida {vez}: {round(asyncio.get_event_loop().time() - t0)} s · {n} toques · resultado en pantalla: {bool(res)} · {txt}')
          print(f'    guardado: partidas {j0.get("partidas")} → {j1.get("partidas")} · bolas {j0.get("bolas")} → {j1.get("bolas")} · récords {j1.get("recs")} · liga hoy {(j1.get("dias") or {}).get(f)}')
          if (j1.get('partidas') or 0) != (j0.get('partidas') or 0) + 1: errs.append(f'{f} {modo}: no se guarda la partida {vez}')
          if not res: errs.append(f'{f} {modo}: no sale el resultado')
          await pg.screenshot(path=O + f'{modo}_{vez}_resultado.png', full_page=True)
        if pe: errs.append(f'{f} {modo}: errores {pe[:3]}')
        await ctx.close()
      await b.close()
  finally: srv.terminate()
  print('errs', errs)
if __name__ == '__main__': asyncio.run(main())
