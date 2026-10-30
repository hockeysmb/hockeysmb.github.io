import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Diario (30 oct): los días con hockey, el diario de hockey; los demás, «¿Qué tal el día?» en una línea, opcional.
# Viernes 30 (sin entreno): sale la línea, se guarda como libre, se puede jugar sin escribirla y la DT la ve. Jueves 29 (entreno): el de hockey.
import asyncio, subprocess, datetime, json
from playwright.async_api import async_playwright
from fem_reto import seed_reto
from fem_dt import CFG, ROOT, DT
O = SHOTS + 'fem_diario/'; os.makedirs(O, exist_ok=True)

async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8773', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  errs = []
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch()
      for dia in (30, 29):
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, service_workers='block')
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
        await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await ctx.route('**/femenino/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
        db0 = seed_reto()
        for k in ('2026-10-27', '2026-10-28', '2026-10-29'): db0.setdefault('registros/demo03/dias/' + k, {'ts': 1})['ses'] = [{'tipo': 'entreno', 'rpe': 6, 'min': 90, 'nota': '', 'ts': 1}]
        for k, v in list(db0.items()):
          if k.startswith('registros/demo03/dias/'):
            for pd in (v.get('partidos') or {}).values(): pd.setdefault('juega', 'no')
        if dia == 29: db0.setdefault('registros/demo03/dias/2026-10-29', {'ts': 1})['antes'] = {'sueno': 8, 'fatiga': 7, 'dolor': 8, 'estres': 7, 'animo': 8, 'esc': 10, 'ts': 1}
        users = {'demo03@ejemplo.com': {'uid': 'demo03', 'pass': 'hockey1'}}
        await ctx.add_init_script("if (!localStorage.getItem('__seeded')) { localStorage.setItem('__fakefem', " + json.dumps(json.dumps(db0)) + "); localStorage.setItem('__fakefemusers', " + json.dumps(json.dumps(users)) + "); localStorage.setItem('smbf-bienvenida-demo03', '1'); localStorage.setItem('smbf-sonido', 'no'); localStorage.setItem('__seeded', '1'); }")
        await ctx.add_init_script(path=P + 'fakefem.js')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.set_system_time(datetime.datetime(2026, 10, dia, 18, 0, 0))
        await pg.goto('http://localhost:8773/femenino/'); await pg.wait_for_timeout(700)
        await pg.fill('#l-email', 'demo03@ejemplo.com'); await pg.fill('#l-pass', 'hockey1'); await pg.click('[data-a="in"]'); await pg.wait_for_timeout(1000)
        f = '2026-10-%02d' % dia
        fila = ' '.join((await pg.locator('.tarea').filter(has=pg.locator('[data-a="gosemana"]')).first.text_content()).split()); print(f, 'en Hoy:', fila)
        await pg.click('.nav [data-v="reto"]'); await pg.wait_for_timeout(300); juega = await pg.locator('.rt-play[data-a="jugar"]:not([disabled])').count(); print(f, 'puede jugar sin el diario:', bool(juega))
        if not juega: errs.append(f + ': el diario no debería bloquear')
        await pg.click('.nav [data-v="semana"]'); await pg.wait_for_timeout(300)
        libre = await pg.locator('#d-linea').count(); hockey = await pg.locator('#d-mejor').count(); print(f, 'diario:', 'una línea' if libre else 'de hockey' if hockey else '¿?', '·', await pg.text_content('.diary-hero h1'))
        await pg.screenshot(path=O + f + '_diario.png', full_page=True)
        if dia == 30:
          if not libre or hockey: errs.append('un día sin hockey no sale la línea')
          await pg.click('[data-tiempo="4"]'); await pg.fill('#d-linea', 'He terminado el trabajo de biología'); await pg.click('[data-a="savedia"]'); await pg.wait_for_timeout(500)
          dd = await pg.evaluate("window.__fake.db()['registros/demo03/dias/2026-10-30'].diario"); print(f, 'guardado:', dd)
          if not dd or not dd.get('libre') or 'biología' not in dd.get('linea', ''): errs.append('no se guarda la línea del día')
          await pg.screenshot(path=O + f + '_guardado.png', full_page=True)
          # la DT lo ve en el buzón como «Su día»
          await out(pg); await pg.wait_for_timeout(400)
          await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-a="google"]'); await pg.wait_for_timeout(900)
          await pg.click('.nav [data-av="equipo"]'); await pg.wait_for_timeout(300); await pg.click('.jb [data-av="buzon"]'); await pg.wait_for_timeout(300)
          await pg.locator('.bzf').filter(has_text='Ana').first.click(); await pg.wait_for_timeout(300)
          t = ' '.join((await pg.text_content('main')).split()); print(f, 'la DT ve:', 'Su día' in t and 'biología' in t)
          if 'biología' not in t: errs.append('la DT no ve la línea del día')
        else:
          if not hockey or libre: errs.append('un día de entreno no sale el diario de hockey')
        await ctx.close()
      await b.close()
  finally: srv.terminate()
  print('errs', errs)
if __name__ == '__main__': asyncio.run(main())
