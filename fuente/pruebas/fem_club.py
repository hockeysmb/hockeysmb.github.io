import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Mi club (incremental del reto): la taquilla se llena con el tiempo, se cobra multiplicada por lo contestado hoy,
# se mejoran instalaciones, se asciende de categoría y las compañeras ven solo nombre, categoría y nivel. Equipo inventado.
import asyncio, subprocess, datetime, json
from playwright.async_api import async_playwright
from fem_dt import CFG, ROOT
from fem_reto import seed_reto
O = SHOTS + 'fem_club/'; os.makedirs(O, exist_ok=True)
T0 = datetime.datetime(2026, 10, 27, 18, 0, 0)

async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8784', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, service_workers='block')
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/femenino/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      db0 = seed_reto()
      # una compañera ya tiene club en Regional; otra, uno pequeño
      db0['juego/demo01']['club'] = {'n': [1, 1], 'af': 500, 'tot': 9000, 'ts': 1, 'asc': 1, 'i': {'pista': 3, 'gradas': 1, 'cantera': 0, 'cantina': 0, 'bus': 0}}
      db0['juego/demo05']['club'] = {'n': [0, 4], 'af': 0, 'tot': 300, 'ts': 1, 'asc': 0, 'i': {'pista': 2, 'gradas': 0, 'cantera': 0, 'cantina': 0, 'bus': 0}}
      users = {'demo03@ejemplo.com': {'uid': 'demo03', 'pass': 'hockey1'}}
      await ctx.add_init_script("if (!localStorage.getItem('__seeded')) { localStorage.setItem('__fakefem', " + json.dumps(json.dumps(db0)) + "); localStorage.setItem('__fakefemusers', " + json.dumps(json.dumps(users)) + "); localStorage.setItem('smbf-bienvenida-demo03', '1'); localStorage.setItem('__seeded', '1'); }")
      await ctx.add_init_script(path=P + 'fakefem.js')
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.clock.install(time=T0)
      await pg.goto('http://localhost:8784/femenino/'); await pg.wait_for_timeout(700)
      club = lambda: pg.evaluate("(window.__fake.db()['juego/demo03'] || {}).club")
      await pg.fill('#l-email', 'demo03@ejemplo.com'); await pg.fill('#l-pass', 'hockey1'); await pg.click('[data-a="in"]'); await pg.wait_for_timeout(1200)
      await pg.click('.nav [data-v="reto"]'); await pg.wait_for_timeout(400)
      tabs = await pg.evaluate("[...document.querySelectorAll('.rt-tabs button')].map(b => b.textContent.trim())"); print('pestañas del reto:', tabs)
      if not any('Mi club' in t for t in tabs): errs.append('no sale la pestaña Mi club')
      await pg.click('.rt-tabs [data-k="club"]'); await pg.wait_for_timeout(400)
      print('club al abrir:', ' '.join((await pg.text_content('.cb-hero')).split())[:150])
      await pg.screenshot(path=O + '1_nuevo.png', full_page=True)
      # pasan 3 horas: 40 por hora → 120 en taquilla; hoy tiene el diario (×2 en día de hockey)
      await pg.clock.fast_forward(3 * 3600 * 1000 - 5000); await pg.wait_for_timeout(300)
      m = await pg.text_content('.cb-m'); tq = await pg.text_content('#cb-tq'); print('multiplicador de hoy:', m, '· taquilla a las 3 h:', tq)
      mult = int(m.replace('×', ''))
      await pg.click('[data-a="cbcobrar"]'); await pg.wait_for_timeout(500)
      c = await club(); print('tras cobrar:', {k: c[k] for k in ('af', 'tot', 'asc')}, c['i'])
      if not c or abs(c['af'] - 120 * mult) > 4 * mult: errs.append('no cobra lo que toca (%s)' % (c and c['af']))
      await pg.screenshot(path=O + '2_cobrado.png', full_page=True)
      # la taquilla tiene tope: 20 horas después sigue habiendo 8 horas
      await pg.clock.fast_forward(20 * 3600 * 1000); await pg.wait_for_timeout(2500)
      tq = (await pg.text_content('.cb-tql')).strip(); print('20 h después:', ' '.join(tq.split()))
      if '320 / 320' not in tq.replace('\xa0', ' '): errs.append('la taquilla no tiene tope de 8 h')
      # mejorar la pista: con afición de sobra
      await pg.evaluate("() => { const d = window.__fake.db()['juego/demo03']; window.__fake.put('juego/demo03', { club: Object.assign({}, d.club, { af: 5000 }) }); }"); await pg.wait_for_timeout(400)
      await pg.click('[data-a="cbmejora"][data-k="pista"]'); await pg.wait_for_timeout(500)
      await pg.click('[data-a="cbmejora"][data-k="gradas"]'); await pg.wait_for_timeout(500)
      c = await club(); print('tras mejorar pista y gradas:', c['i'], 'afición', c['af'])
      if c['i']['pista'] != 2 or c['i']['gradas'] != 1 or c['af'] != 5000 + 320 - 200 - 800: errs.append('las mejoras no cuadran')
      cerr = await pg.locator('.cb-in.off').count(); print('instalaciones cerradas todavía:', cerr)
      if cerr != 2: errs.append('cantera y bus tendrían que estar cerradas')
      # nombre del club: de una lista, sin texto libre
      await pg.click('[data-a="cbnombre"]'); await pg.wait_for_timeout(200); await pg.click('[data-a="cbpon"][data-n="2"]'); await pg.wait_for_timeout(400); await pg.click('[data-a="cbpon"][data-p="1"]'); await pg.wait_for_timeout(400)
      nom = await pg.text_content('.cb-id h2'); print('nombre elegido:', nom, '· campos de texto:', await pg.locator('.cb-hero input, .cb-hero textarea').count())
      if nom != 'HC Rayos': errs.append('no cambia el nombre')
      await pg.screenshot(path=O + '3_nombre.png', full_page=True); await pg.click('[data-a="cbnombre"]')
      # ascenso
      await pg.evaluate("() => { const d = window.__fake.db()['juego/demo03']; window.__fake.put('juego/demo03', { club: Object.assign({}, d.club, { tot: 150000 }) }); }"); await pg.wait_for_timeout(400)
      await pg.click('[data-a="cbascenso"]'); await pg.wait_for_timeout(500)
      c = await club(); print('tras ascender:', {k: c[k] for k in ('af', 'tot', 'asc', 'n')}, c['i'])
      if c['asc'] != 1 or c['af'] != 0 or c['i']['pista'] != 1 or c['n'] != [1, 2]: errs.append('el ascenso no reinicia bien')
      await pg.screenshot(path=O + '4_ascenso.png', full_page=True)
      rank = await pg.evaluate("[...document.querySelectorAll('.cb-rank li')].map(li => li.innerText.replace(/\\s+/g, ' '))"); print('clubes del equipo:', rank)
      if len(rank) != 3 or 'me' not in (await pg.get_attribute('.cb-rank li:nth-child(2)', 'class') or ''): errs.append('la tabla de clubes no sale bien')
      # lo que ven las demás del club: solo nombre, categoría y nivel (nada de registros)
      txt = ' '.join(rank); print('en la tabla hay datos de bienestar:', any(w in txt.lower() for w in ['sueño', 'fatiga', 'rpe', 'diario']))
      print('errs', errs)
      await b.close()
  finally:
    srv.terminate()
asyncio.run(main())
