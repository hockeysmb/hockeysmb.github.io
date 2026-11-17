import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Plantillas y partidos dentro de la página de un equipo: importar, ver las fichas y el calendario
import asyncio, json, subprocess
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
O = SHOTS + 'jug/'; os.makedirs(O, exist_ok=True)
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano', 'verified': True}
NICO = {'uid': 'unico000000000000000000000001', 'email': 'nico@example.com', 'name': 'Nico', 'verified': True}
# plantillas inventadas: en el repositorio no hay nombres de jugadores de verdad
PLANT = {
  'Prebenjamín A': [{'n': 'Ada Lovelace', 'a': '2018'}, {'n': 'Blas Infante', 'a': '2018'}, {'n': 'Cora Pérez', 'a': '2019', 'p': 1}],
  'Benjamín D': [{'n': 'Darío Ruiz', 'a': '2017'}, {'n': 'Elsa Mora', 'a': '2016'}],
  'Sub15': [{'n': 'Elsa Mora', 'a': '2016'}, {'n': 'Fátima Soto', 'a': '2012'}],
}
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8771', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': W, 'height': 860})
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.add_init_script(path=FAKEFB)
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.clock.set_system_time(__import__('datetime').datetime(2026, 11, 16, 10, 0, 0))
      await pg.goto('http://localhost:8771/'); await pg.wait_for_timeout(600)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1000)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)

      # 1. importar las plantillas desde el panel de la DT
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(400)
      await pg.evaluate("document.querySelectorAll('#pl-sec details').forEach(d=>d.open=true)")
      await pg.fill('#pl-code', json.dumps(PLANT, ensure_ascii=False))
      await pg.locator('[data-pl="import"]:visible').first.click(); await pg.wait_for_timeout(300)
      await pg.screenshot(path=O + 'importar.png', full_page=True)
      await pg.click('#m-ok'); await pg.wait_for_timeout(700)
      total = await pg.evaluate("[...document.querySelectorAll('#pl-sec .dt-row')].map(r=>r.innerText.replace(/\\n/g,' · '))")
      print('plantillas guardadas:', total)
      if len(total) != 3: errs.append(f'esperaba 3 equipos con plantilla, hay {len(total)}')
      guardado = await pg.evaluate("Object.keys((window.SMB.getBank().plant)||{})")
      print('en el banco:', guardado)

      # 2. la plantilla desde la zona Equipos
      await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(400)
      await pg.locator('[data-equipo="Prebenjamín A"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub=\"plant\"]').first.click(); await pg.wait_for_timeout(300)
      pest = await pg.evaluate("[...document.querySelectorAll('[data-eqsub]')].map(b=>b.textContent)")
      print('pestañas:', pest)
      if len(pest) != 4: errs.append('faltan pestañas en la página del equipo')
      fichas = await pg.evaluate("[...document.querySelectorAll('.jg-row')].map(r=>r.innerText.replace(/\\n/g,' · '))")
      print('fichas:', fichas)
      if len(fichas) != 3: errs.append(f'esperaba 3 fichas en Prebenjamín A, hay {len(fichas)}')
      if not any('Portero' in f for f in fichas): errs.append('no se ve el portero')
      await pg.screenshot(path=O + 'plantilla.png', full_page=True)
      # la ficha de un jugador
      await pg.locator('.jg-row').first.click(); await pg.wait_for_timeout(300)
      ficha = await pg.text_content('#modal-card')
      print('ficha:', ' · '.join(x.strip() for x in ficha.split('\n') if x.strip())[:160])
      if 'Ada Lovelace' not in ficha: errs.append('la ficha no abre')
      await pg.screenshot(path=O + 'ficha.png')
      await pg.click('#m-no'); await pg.wait_for_timeout(200)

      # 3. "también en": Elsa Mora está en Benjamín D y en Sub15
      await pg.click('[data-espclose]'); await pg.wait_for_timeout(300)
      await pg.locator('[data-equipo="Benjamín D"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub=\"plant\"]').first.click(); await pg.wait_for_timeout(300)
      bd = await pg.evaluate("[...document.querySelectorAll('.jg-row')].map(r=>r.innerText.replace(/\\n/g,' · '))")
      print('Benjamín D:', bd)
      if not any('Sub15' in x for x in bd): errs.append('no dice que Elsa Mora está también en Sub15')

      # 4. los partidos
      await pg.locator('[data-eqsub="part"]').first.click(); await pg.wait_for_timeout(300)
      txt = await pg.text_content('#espacio')
      bd_part = await pg.evaluate("[...document.querySelectorAll('.pt-row')].map(r=>r.innerText.replace(/\\n/g,' · '))")
      vacio = 'no tiene partidos en el calendario' in txt or 'no se han podido leer' in txt.lower()
      print('partidos de Benjamín D:', len(bd_part), bd_part[:2] if bd_part else '(avisa de que no hay)' if vacio else txt[:70])
      # o trae sus partidos de la federación o avisa de que no los hay: lo que no vale es salir en blanco
      if not bd_part and not vacio: errs.append('Benjamín D no enseña partidos ni avisa de que no tiene')
      await pg.click('[data-espclose]'); await pg.wait_for_timeout(300)
      await pg.locator('[data-equipo="Sub15"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub="part"]').first.click(); await pg.wait_for_timeout(400)
      filas = await pg.evaluate("[...document.querySelectorAll('.pt-row')].map(r=>r.innerText.replace(/\\n/g,' · '))")
      print('partidos de Sub15:', len(filas), filas[:3])
      if not filas: errs.append('Sub15 no enseña ningún partido')
      await pg.evaluate("document.querySelectorAll('#espacio details').forEach(d=>d.open=true)")
      await pg.screenshot(path=O + 'partidos.png', full_page=True)

      # 5. altas, cambios y bajas desde la misma pantalla (volviendo a Benjamín D)
      await pg.click('[data-espclose]'); await pg.wait_for_timeout(300)
      await pg.locator('[data-equipo="Benjamín D"]:visible').first.click(); await pg.wait_for_timeout(500)
      await pg.locator('[data-eqsub="plant"]').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-palta]').first.click(); await pg.wait_for_timeout(400)
      await pg.fill('#pj-n', 'Gael Nuevo'); await pg.fill('#pj-a', '2017')
      await pg.check('#pj-p')
      await pg.screenshot(path=O + 'alta.png')
      await pg.click('#m-ok'); await pg.wait_for_timeout(900)
      bd2 = await pg.evaluate("[...document.querySelectorAll('.jg-row')].map(r=>r.innerText.replace(/\\n/g,' · '))")
      print('Benjamín D tras el alta:', len(bd2), [x for x in bd2 if 'Gael' in x])
      if not any('Gael Nuevo' in x and 'Portero' in x for x in bd2): errs.append('no se ha añadido Gael como portero')
      # no deja repetir
      await pg.locator('[data-palta]').first.click(); await pg.wait_for_timeout(300)
      await pg.fill('#pj-n', 'Darío Ruiz'); await pg.click('#m-ok'); await pg.wait_for_timeout(700)
      await pg.screenshot(path=O + 'repetido.png')
      repe = await pg.evaluate("(document.querySelector('#pj-msg')||{}).textContent || 'NO HAY MODAL'")
      print('repetido:', repe)
      if 'ya está' not in (repe or ''): errs.append('deja meter dos veces al mismo')
      await pg.click('#m-no'); await pg.wait_for_timeout(300)
      # cambiar de equipo: Gael pasa a Prebenjamín A
      await pg.locator('.jg-row', has_text='Gael Nuevo').first.click(); await pg.wait_for_timeout(300)
      await pg.click('#m-ed'); await pg.wait_for_timeout(300)
      await pg.select_option('#pj-eq', 'Prebenjamín A'); await pg.click('#m-ok'); await pg.wait_for_timeout(900)
      bd3 = await pg.evaluate("[...document.querySelectorAll('.jg-row')].map(r=>r.innerText)")
      guardado = await pg.evaluate("Object.fromEntries(Object.entries(window.SMB.getBank().plant).map(([k,v])=>[k,v.map(p=>p.n)]))")
      print('Gael en Prebenjamín A:', 'Gael Nuevo' in guardado.get('Prebenjamín A', []), '| sigue en Benjamín D:', any('Gael' in x for x in bd3))
      if 'Gael Nuevo' not in guardado.get('Prebenjamín A', []): errs.append('el cambio de equipo no ha ido')
      if any('Gael' in x for x in bd3): errs.append('Gael sigue en Benjamín D después de cambiarlo')
      # baja
      await pg.click('[data-espclose]'); await pg.wait_for_timeout(300)
      await pg.locator('[data-equipo="Prebenjamín A"]:visible').first.click(); await pg.wait_for_timeout(500)
      await pg.locator('[data-eqsub=\"plant\"]').first.click(); await pg.wait_for_timeout(300)
      await pg.locator('.jg-row', has_text='Gael Nuevo').first.click(); await pg.wait_for_timeout(300)
      await pg.click('#m-ed'); await pg.wait_for_timeout(300)
      await pg.click('#m-baja'); await pg.wait_for_timeout(400)
      await pg.click('#m-ok'); await pg.wait_for_timeout(900)
      fin = await pg.evaluate("(window.SMB.getBank().plant['Prebenjamín A']||[]).map(p=>p.n)")
      print('Prebenjamín A tras la baja:', len(fin), '| queda Gael:', 'Gael Nuevo' in fin)
      if 'Gael Nuevo' in fin: errs.append('la baja no ha ido')
      await pg.click('[data-espclose]'); await pg.wait_for_timeout(300)

      # 6. Sub15 sale en la lista de equipos aunque no tenga franja propia en el horario
      tarjetas = await pg.evaluate("[...document.querySelectorAll('[data-equipo]')].map(b=>b.innerText.replace(/\\n/g,' · '))")
      s15 = [x for x in tarjetas if 'Sub15' in x]
      print('equipos en la lista:', len(tarjetas), '| Sub15:', s15)
      if not s15: errs.append('Sub15 no sale en la lista de equipos')
      elif 'Sin franja propia' not in s15[0]: errs.append('Sub15 no explica que no tiene franja propia')
      await pg.screenshot(path=O + 'lista.png', full_page=True)

      print('errs', errs)
      await b.close()
      if errs: sys.exit(1)
  finally:
    srv.terminate()
asyncio.run(main())
