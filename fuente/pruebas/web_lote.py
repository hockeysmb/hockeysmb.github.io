# La DT mete una tanda de ejercicios de una vez (archivo .json con {v:5, nombre, autor, tasks}).
# Usa ejercicios inventados del banco de prueba: el material de fuera del club nunca va al repositorio.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json, subprocess
from playwright.async_api import async_playwright
bank = json.load(open(BANK)); T = bank['tasks']
lote = {'v': 5, 'nombre': 'Manual de prueba · Pases', 'autor': 'Club de prueba', 'tasks': []}
for i, t in enumerate(T[:4]):
    c = {k: v for k, v in t.items() if k not in ('id', 'num', 'source', 'rulesCa')}
    c.update({'orig': 'prueba-lote-%d' % i, 'title': 'Ejercicio de la tanda %d' % (i + 1), 'page': 10 + i})
    lote['tasks'].append(c)
LF = SHOTS + 'lote_prueba.json'; json.dump(lote, open(LF, 'w'), ensure_ascii=False)
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano'}
O = SHOTS + 'lote/'; os.makedirs(O, exist_ok=True)
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8774', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
      await pg.goto('http://localhost:8774/'); await pg.wait_for_timeout(600)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(400)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      ntasks = lambda: pg.evaluate("Object.keys(window.__fake.db()).filter(k => k.startsWith('tasks/')).length")
      n0 = await ntasks(); print('tareas en el banco:', n0)
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="banco"]'); await pg.wait_for_timeout(300)
      await pg.evaluate("document.getElementById('review').open = true")
      await pg.set_input_files('#review-file', LF); await pg.wait_for_timeout(400)
      txt = ' '.join((await pg.text_content('#review-out')).split()); print('vista previa:', txt[:160])
      if '4 ejercicios nuevos' not in txt: errs.append('no cuenta los 4 nuevos')
      await pg.click('#review-out summary'); await pg.wait_for_timeout(200)
      print('fichas en la vista previa:', await pg.locator('#review-out .task').count())
      await pg.locator('#review-out').screenshot(path=O + 'vista_previa.png')
      await pg.click('#rv-lote'); await pg.wait_for_timeout(200); await pg.click('#m-ok'); await pg.wait_for_timeout(1200)
      msg = await pg.text_content('#rv-msg'); print('mensaje:', msg)
      n1 = await ntasks(); print('tareas después:', n1)
      if n1 != n0 + 4: errs.append('no se han guardado los 4')
      db = await pg.evaluate("window.__fake.db()")
      nuevas = [json.loads(v['j']) if 'j' in v else v for k, v in db.items() if k.startswith('tasks/club-')]
      print('ejemplo guardado:', [(t.get('author'), t.get('source'), t.get('orig'), (t.get('smb') or {}).get('validado')) for t in nuevas][:4])
      if not nuevas or any(t.get('author') != 'Club de prueba' or t.get('source') != 'club' or (t.get('smb') or {}).get('validado') for t in nuevas): errs.append('datos de los nuevos mal')
      # en Revisar
      await pg.click('[data-dttab="revisar"]'); await pg.wait_for_timeout(400)
      rows = ' | '.join(' '.join(x.split()) for x in await pg.locator('.rv-row').all_text_contents())
      print('cola de Revisar:', rows[:200])
      if 'Ejercicio de la tanda 1' not in rows: errs.append('no salen en Revisar')
      await pg.screenshot(path=O + 'revisar.png')
      # el mismo archivo otra vez: no duplica
      await pg.click('[data-dttab="banco"]'); await pg.wait_for_timeout(300)
      await pg.evaluate("document.getElementById('review').open = true")
      await pg.set_input_files('#review-file', LF); await pg.wait_for_timeout(400)
      txt = ' '.join((await pg.text_content('#review-out')).split()); print('otra vez:', txt[:120])
      if '0 ejercicios nuevos' not in txt or await pg.query_selector('#rv-lote'): errs.append('deja meterlos dos veces')
      # un archivo que no es una tanda
      await pg.fill('#review-code', '{"v":1}'); await pg.click('#btn-review'); await pg.wait_for_timeout(200)
      print('archivo malo:', (await pg.text_content('#review-out')).strip())
      print('errs', errs)
      await b.close()
  finally:
    srv.terminate()
asyncio.run(main())
