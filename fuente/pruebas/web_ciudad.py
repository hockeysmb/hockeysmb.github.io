# Ciudad deportiva (12 nov): el incremental de la plantilla de los entrenadores. Taquilla con tope, cobro multiplicado por el trabajo
# de la semana, instalaciones con ventajas (un entreno más, juvenil de la cantera el lunes, más mercado) y concentración.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json, subprocess, datetime
from playwright.async_api import async_playwright
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano'}
O = SHOTS + 'ciudad/'; os.makedirs(O, exist_ok=True)
G = "JSON.parse(localStorage.getItem('smb-banco-personaje'))"
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8785', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.add_init_script(path=FAKEFB)
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.clock.install(time=datetime.datetime(2026, 11, 11, 10, 0, 0))   # miércoles
      await pg.goto('http://localhost:8785/'); await pg.wait_for_timeout(600)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(400)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(400)
      if not await pg.locator('[data-club="ciudad"]').count(): errs.append('no sale la ciudad deportiva en la Liga')
      await pg.screenshot(path=O + '0_liga.png', full_page=True)
      await pg.click('[data-club="ciudad"]'); await pg.wait_for_timeout(400)
      print('pestañas del club:', await pg.evaluate("[...document.querySelectorAll('#club-ov [data-cltab]')].map(b => b.textContent)"))
      # 3 horas: 50 por hora → 150; sin trabajo esta semana, ×1
      await pg.clock.fast_forward(3 * 3600 * 1000); await pg.wait_for_timeout(2500)
      print('a las 3 h:', ' '.join((await pg.text_content('.cd-tq')).split()), '|', (await pg.text_content('.cd-go')).strip(), '|', (await pg.text_content('.cd-m')))
      await pg.click('[data-cd="cobrar"]'); await pg.wait_for_timeout(400)
      cd = (await pg.evaluate(G))['club']['cd']; print('tras cobrar:', cd['p'], cd['i'])
      if abs(cd['p'] - 150) > 3: errs.append('no cobra 150')
      # trabajo de la semana: una sesión completa y un entreno en pista → ×3
      await pg.evaluate("() => { const g = " + G + "; g.log.push({ key: 'ses:x1', pts: 1, why: 'x', date: '2026-11-10' }, { key: 'pista:x1:2026-11-11', pts: 1, why: 'x', date: '2026-11-11' }, { key: 'ses:vieja', pts: 1, why: 'x', date: '2026-11-03' }); g.club.cd.p = 60000; localStorage.setItem('smb-banco-personaje', JSON.stringify(g)); window.SMB.reloadLocal(); }")
      await pg.wait_for_timeout(300); await pg.click('[data-club="ciudad"]') if not await pg.locator('#club-ov').count() else None
      await pg.click('#club-ov [data-cltab="ciudad"]'); await pg.wait_for_timeout(300)
      m = await pg.text_content('.cd-m'); print('multiplicador con sesión y pista esta semana:', m)
      if m != '×3': errs.append('el multiplicador de la semana no es ×3')
      await pg.screenshot(path=O + '1_ciudad.png', full_page=True)
      # gimnasio: un entreno más al día
      await pg.click('[data-cd="up"][data-k="gim"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-cd="up"][data-k="cantera"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-cd="up"][data-k="ojeo"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-cd="up"][data-k="fisio"]'); await pg.wait_for_timeout(300)
      g = await pg.evaluate(G); cd = g['club']['cd']; n0 = len(g['club']['squad']); print('instalaciones:', cd['i'], 'presupuesto', cd['p'], 'juv', cd.get('juv'))
      if cd['i']['gim'] != 1 or cd['i']['cantera'] != 1 or cd['p'] != 60000 - 3000 - 4000 - 2500 - 2000: errs.append('las mejoras no cuadran')
      await pg.click('#club-ov [data-cltab="entrenar"]'); await pg.wait_for_timeout(300)
      ent = ' '.join((await pg.text_content('#club-ov')).split()); print('entrenar:', ent[ent.find('Entrenar'):][:160])
      left = await pg.evaluate("document.querySelectorAll('#club-ov [data-cltrain]:not([disabled])').length"); print('botones de entreno activos:', left)
      # concentración
      await pg.evaluate("() => { const g = " + G + "; g.club.squad.forEach(p => p.forma = 60); localStorage.setItem('smb-banco-personaje', JSON.stringify(g)); window.SMB.reloadLocal(); }"); await pg.wait_for_timeout(300)
      await pg.click('[data-club="ciudad"]') if not await pg.locator('#club-ov').count() else None
      await pg.click('#club-ov [data-cltab="ciudad"]'); await pg.wait_for_timeout(300); await pg.click('[data-cd="conc"]'); await pg.wait_for_timeout(300)
      g = await pg.evaluate(G); print('forma tras la concentración:', sorted(set(p['forma'] for p in g['club']['squad'])), '· otra vez hoy:', await pg.is_disabled('[data-cd="conc"]'))
      if any(p['forma'] != 100 for p in g['club']['squad']): errs.append('la concentración no recupera la forma')
      await pg.screenshot(path=O + '2_mejorada.png', full_page=True)
      # el lunes sube un juvenil y el mercado trae uno más
      await pg.click('[data-club="x"]'); await pg.clock.fast_forward(5 * 24 * 3600 * 1000 + 3600 * 1000); await pg.wait_for_timeout(500)
      await pg.click('[data-nav="inicio"]'); await pg.wait_for_timeout(300); await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(600)
      g = await pg.evaluate(G); print('plantilla el lunes:', n0, '→', len(g['club']['squad']), '|', [l['txt'] for l in g['club']['log'] if 'cantera' in l['txt']])
      if len(g['club']['squad']) != n0 + 1: errs.append('no sube el juvenil el lunes')
      await pg.click('[data-club="mercado"]'); await pg.wait_for_timeout(400)
      mk = await pg.locator('#club-ov [data-clbuy]').count(); print('jugadores en el mercado:', mk)
      if mk < 7: errs.append('los ojeadores no añaden jugadores al mercado')
      print('errs', errs)
      await b.close()
  finally:
    srv.terminate()
asyncio.run(main())
