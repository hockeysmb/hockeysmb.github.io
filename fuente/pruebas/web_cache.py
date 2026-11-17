import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Lo que pasó el 17 nov: un dispositivo abre la app con la copia vieja del banco (de antes de importar la
# plantilla) y, antes de que llegue lo del servidor, guarda el banco entero y borra la plantilla.
# Ahora, mientras lo que hay es la copia del dispositivo, no se escribe club/state.
import asyncio, json, subprocess
from playwright.async_api import async_playwright
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano', 'verified': True}
PLANT = {'Sub15': [{'n': 'Ada Lovelace', 'a': '2012'}, {'n': 'Cora Pérez', 'a': '2012'}]}
STALE = "try { const s = localStorage.getItem('__stale'); if (s) { localStorage.removeItem('__stale'); window.__fakeStale = { 'club/state': JSON.parse(s) }; } } catch (e) {}"
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8784', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': 390, 'height': 860})
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.add_init_script(path=FAKEFB)
      await ctx.add_init_script(STALE)
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.goto('http://localhost:8784/'); await pg.wait_for_timeout(600)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1000)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      viejo = await pg.evaluate("JSON.stringify(window.__fake.db()['club/state'])")   # la copia que se queda en el móvil
      await pg.evaluate("p=>window.SMB.saveBankExtra({plant:p},'ok')", PLANT); await pg.wait_for_timeout(800)
      tiene = lambda: pg.evaluate("!!JSON.parse(window.__fake.db()['club/state'].j).plant")
      print('plantilla en el servidor tras importarla:', await tiene())
      if not await tiene(): errs.append('la plantilla no llegó al servidor')

      # el móvil abre con la copia vieja, todavía sin red
      await pg.evaluate("s=>localStorage.setItem('__stale', s)", viejo)
      await pg.reload(); await pg.wait_for_timeout(2500)
      enPantalla = await pg.evaluate("!!window.SMB.getBank().plant")
      print('plantilla en pantalla con la copia vieja:', enPantalla)
      # cualquier guardado del banco entero (el de la liga incluido) tiene que negarse
      r = await pg.evaluate("window.SMB.saveBankExtra({prueba: 1}, 'ok')")
      print('guardar con la copia vieja:', r)
      print('plantilla en el servidor:', await tiene())
      if not await tiene(): errs.append('con la copia vieja se ha pisado la plantilla del servidor')
      aviso = await pg.evaluate("(document.querySelector('.toast, #toast, .msg-err, [role=status]')||{}).textContent||document.body.innerText.match(/Sin conexión[^\\n]*/)?.[0]||''")
      print('aviso:', aviso.strip()[:90])
      if 'Sin conexión' not in aviso: errs.append('no avisa de que no se ha guardado por no tener conexión')

      # llega lo del servidor: ya se ve la plantilla y se puede guardar
      await pg.evaluate("window.__fakeOnline()"); await pg.wait_for_timeout(1200)
      enPantalla = await pg.evaluate("!!window.SMB.getBank().plant")
      print('plantilla en pantalla con red:', enPantalla)
      if not enPantalla: errs.append('al llegar lo del servidor no se ve la plantilla')
      await pg.evaluate("window.SMB.saveBankExtra({prueba: 2}, 'ok')"); await pg.wait_for_timeout(800)
      j = await pg.evaluate("JSON.parse(window.__fake.db()['club/state'].j)")
      print('tras guardar con red: prueba =', j.get('prueba'), '| plantilla:', bool(j.get('plant')))
      if j.get('prueba') != 2 or not j.get('plant'): errs.append('con red no guarda bien')
      print('errs', errs)
      await b.close()
      if errs: sys.exit(1)
  finally:
    srv.terminate()
asyncio.run(main())
