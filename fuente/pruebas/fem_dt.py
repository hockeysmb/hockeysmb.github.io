import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Panel de la DT de la app de jugadoras con un equipo inventado de doce jugadoras: que todo se pinte sin errores y capturas para revisar el diseño
import asyncio, subprocess, datetime, json, random
from playwright.async_api import async_playwright
ROOT = os.path.dirname(F.rstrip('/'))
O = SHOTS + 'fem_dt/'; os.makedirs(O, exist_ok=True)
CFG = "window.SMBF_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMBF_ADMIN=['adminuid0000000000000000001'];"
DT = {'uid': 'adminuid0000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano'}
HOY = datetime.date(2026, 10, 27)   # martes: entreno y partido del Sub-17

def seed():
  R = random.Random(7); db = {}
  db['equipos/femenino'] = {'dias': [1, 2, 4], 'sin': [], 'extra': []}
  # nombres inventados
  N = ['Lucía Prueba', 'Marta Prueba', 'Sara Prueba', 'Ana Prueba', 'Carla Prueba', 'Irene Prueba', 'Elena Prueba', 'Nerea Prueba', 'Paula Prueba', 'Claudia Prueba', 'Alba Prueba', 'Julia Prueba']
  skins = ['ffdbb4', 'edb98a', 'd08b5b', 'f8d25c', 'ae5d29', 'ffdbb4']; tops = ['straight02', 'bun', 'curly', 'bob', 'longButNotTooLong', 'miaWallace', 'bigHair', 'frida']; hairs = ['2c1b18', '724133', 'b58143', '4a312c', 'a55728', 'd6b370']
  for i, n in enumerate(N):
    u = 'demo%02d' % i
    db['jugadoras/' + u] = {'nombre': n, 'equipo': 'femenino', 'menor': i < 8, 'email': 'demo%02d@ejemplo.com' % i, 'acepta': {'ts': 1, 'v': '2026-10-23'}, 'av': {'skin': skins[i % 6], 'top': tops[i % 8], 'hairColor': hairs[i % 6]}}
    db['acceso/' + u] = {'activa': True, 'equipo': 'femenino', 'consentimiento': {'tipo': 'familia' if i < 8 else 'jugadora'}, 'ts': 1}
    if n.startswith('Nerea'): continue          # recién activada: sin datos
    base = R.uniform(6.5, 8.3)
    for back in range(35, -1, -1):
      d = HOY - datetime.timedelta(days=back)
      if d.weekday() not in (0, 1, 3): continue
      if n.startswith('Irene') and back < 6: continue     # lleva días sin responder
      if R.random() < 0.08: continue
      hard = back < 7 and n.startswith('Marta')
      s = base + R.uniform(-.8, .8)
      if n.startswith('Lucía') and back == 0: s = 3.6
      if n.startswith('Sara') and back < 3: s = base - 2.1
      v = lambda o=0: max(1, min(10, round(s + o + R.uniform(-1, 1))))
      a = {'sueno': v(), 'fatiga': v(-1 if hard else 0), 'dolor': v(-3 if n.startswith('Paula') and back == 0 else 0), 'estres': v(), 'animo': v(), 'esc': 10, 'ts': 1, 'nota': ''}
      if n.startswith('Lucía') and back == 0: a['nota'] = 'Tengo exámenes toda la semana y no duermo bien'
      if n.startswith('Elena') and back == 0: a['nota'] = 'Hoy llego un poco tarde, tengo médico'
      day = {'antes': a, 'ts': 1}
      if back > 0 or n.startswith('Ana'): day['ses'] = [{'tipo': 'entreno', 'rpe': R.choice([5, 6, 7]) + (2 if hard else 0), 'min': 90 + (30 if hard else 0), 'nota': '', 'ts': 1}]
      db['registros/%s/dias/%s' % (u, d.isoformat())] = day
    # diario de las semanas
    for w in (2, 1, 0):
      lunes = (HOY - datetime.timedelta(days=HOY.weekday() + 7 * w)).isoformat()
      if w == 0 and R.random() < 0.4: continue
      db['registros/%s/semanas/%s' % (u, lunes)] = {'tiempo': R.choice([3, 4, 4, 5, 2]), 'mejor': R.choice(['Buen 2c1', 'Presioné bien', 'Me atreví a tirar', '']), 'cambiar': '', 'compromiso': R.choice(['Pedir la bola de cara', 'Hablar más en defensa', 'Mirar antes de recibir', 'Llegar puntual']), 'area': R.choice(['Técnica', 'Equipo', 'Decisión', 'Actitud']), 'cumplida': R.choice(['si', 'si', 'medias', 'no']) if w < 2 else '', 'ts': 1}
    # partidos: Sub-15 del 23 (después) y Sub-17 de hoy (antes)
    k = 'registros/%s/dias/%s' % (u, '2026-10-23')
    if i % 3 == 0:
      db.setdefault(k, {'ts': 1})['partidos'] = {'s15-2': {'cat': 'Sub-15', 'rival': 'CP Alcorcón', 'pre': {'ganas': R.randint(6, 10), 'nervios': R.randint(3, 8), 'confianza': R.randint(5, 9), 'espera': 'ganar', 'importa': R.choice(['disfrutar', 'jugarbien', 'equipo']), 'objetivo': 'Pedir la bola libre', 'ts': 1},
        'juega': 'si', 'min': R.choice([15, 20, 25]), 'rpe': R.randint(6, 9), 'visto': R.randint(5, 9), 'disfrute': R.randint(6, 10), 'cumplido': R.choice(['si', 'medias']), 'emociones': R.sample(['Contenta', 'Orgullosa', 'Cansada', 'Con ganas de más'], 2), 'mejor': 'Cambiar de lado rápido', 'cambiar': '', 'llevo': 'Que si presionamos juntas roban', 'ts': 1}}
    if 3 <= i <= 8:
      kk = 'registros/%s/dias/%s' % (u, HOY.isoformat())
      if kk in db: db[kk]['partidos'] = {'s17-3': {'cat': 'Sub-17', 'rival': 'Tres Cantos PC', 'pre': {'ganas': R.randint(5, 10), 'nervios': R.randint(3, 9), 'confianza': 3 if n.startswith('Irene') else R.randint(4, 9), 'espera': R.choice(['igualado', 'dificil', 'ganar']), 'importa': R.choice(['jugarbien', 'aprender', 'ganar', 'disfrutar']), 'objetivo': R.choice(['Pedir la bola libre', 'Presionar el pase atrás', '']), 'ts': 1}}}
  return db

async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8769', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      for W, H, tag in ((390, 844, 'movil'), (1280, 900, 'ancho')):
        ctx = await b.new_context(viewport={'width': W, 'height': H}, has_touch=W < 500, is_mobile=W < 500, service_workers='block')
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
        await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await ctx.route('**/femenino/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
        await ctx.add_init_script("if (!localStorage.getItem('__seeded')) { localStorage.setItem('__fakefem', " + json.dumps(json.dumps(seed())) + "); localStorage.setItem('__seeded', '1'); }")
        await ctx.add_init_script(path=P + 'fakefem.js')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.set_system_time(datetime.datetime(2026, 10, 27, 18, 0, 0))
        await pg.goto('http://localhost:8769/femenino/'); await pg.wait_for_timeout(700)
        await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-a="google"]'); await pg.wait_for_timeout(900)
        await pg.screenshot(path=O + tag + '_1_equipo.png', full_page=True)
        await pg.click('[data-av="equipo"]'); await pg.wait_for_timeout(400); await pg.screenshot(path=O + tag + '_2_jugadoras.png', full_page=True)
        await pg.click('[data-jug="demo00"]'); await pg.wait_for_timeout(400); await pg.screenshot(path=O + tag + '_3_ficha.png', full_page=True)
        await pg.click('[data-av="partidos"]'); await pg.wait_for_timeout(300); await pg.click('[data-part="s17-3"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=O + tag + '_4_partido.png', full_page=True)
        print(tag, 'ok')
        await ctx.close()
      print('errs', errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
