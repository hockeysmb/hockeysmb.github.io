import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# La ficha de partido: convocatoria, antes, descanso y después; se guarda sola y la ve otro entrenador
import asyncio, json, subprocess
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
O = SHOTS + 'ficha/'; os.makedirs(O, exist_ok=True)
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano', 'verified': True}
PLANT = {'Sub15': [{'n': 'Ada Lovelace', 'a': '2012'}, {'n': 'Cora Pérez', 'a': '2012', 'p': 1}, {'n': 'Fátima Soto', 'a': '2012'}]}
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8783', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
      await pg.goto('http://localhost:8783/'); await pg.wait_for_timeout(600)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1000)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      await pg.evaluate("p=>window.SMB.saveBankExtra({plant:p},'ok')", PLANT); await pg.wait_for_timeout(800)

      # entrar en un partido desde la pestaña Partidos del equipo
      await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
      await pg.locator('[data-equipo="Sub15"]:visible').first.click(); await pg.wait_for_timeout(500)
      await pg.locator('[data-eqsub="part"]').first.click(); await pg.wait_for_timeout(500)
      n = await pg.evaluate("document.querySelectorAll('#espacio [data-fpart]').length")
      print('partidos con ficha para abrir:', n)
      if not n: errs.append('no hay partidos donde entrar'); print('errs', errs); sys.exit(1)
      pid = await pg.evaluate("document.querySelector('#espacio [data-fpart]').dataset.fpart")
      await pg.locator('#espacio [data-fpart]').first.click(); await pg.wait_for_timeout(600)
      cab = await pg.text_content('#espacio .eq-cab')
      print('ficha de:', ' '.join(cab.split())[:70])
      secciones = await pg.evaluate("[...document.querySelectorAll('#espacio .h-sec')].map(h=>h.textContent)")
      print('secciones:', secciones)
      for q in ('Convocatoria', 'El plan', 'Cómo fue', 'Uno a uno'):
        if q not in secciones: errs.append(f'falta la sección {q}')
      # lo que cuenta es que no haya que escribir de entrada: los campos opcionales van plegados
      escribir = await pg.evaluate("[...document.querySelectorAll('#espacio input[type=text], #espacio textarea')].filter(e=>!e.closest('details')).length")
      tocar = await pg.evaluate("document.querySelectorAll('#espacio [data-fop], #espacio [data-ftag], #espacio [data-fj]').length")
      print('campos de escribir a la vista:', escribir, '| cosas que tocar:', tocar)
      if escribir: errs.append(f'hay {escribir} campos de texto sin plegar: esto era para tocar, no para escribir')
      if tocar < 20: errs.append('hay muy poco que tocar')

      # convocar a todos de un toque
      await pg.locator('[data-fconvtodos]').first.click(); await pg.wait_for_timeout(500)
      conv = await pg.text_content('#cv-cuenta'); print('convocatoria:', conv)
      if '3' not in conv: errs.append('«convocar a todos» no marca a los tres')
      # el plan: una idea con bola y una sin bola, de un toque
      await pg.click('[data-fpaso="1"]'); await pg.wait_for_timeout(200)   # la ficha va por pasos
      await pg.locator('[data-fop="ata"]').first.click(); await pg.wait_for_timeout(300)
      await pg.locator('[data-fop="def"]').nth(1).click(); await pg.wait_for_timeout(300)
      # solo puede quedar una elegida por grupo
      await pg.locator('[data-fop="ata"]').nth(2).click(); await pg.wait_for_timeout(300)
      marcadas = await pg.evaluate("[...document.querySelectorAll('[data-fop=\"ata\"].si')].length")
      print('ideas de ataque marcadas a la vez:', marcadas)
      if marcadas != 1: errs.append('se puede marcar más de una idea de ataque')
      # cómo fue, etiquetas y uno a uno
      await pg.click('[data-fpaso="2"]'); await pg.wait_for_timeout(200)
      await pg.locator('[data-fop="comofue"]').nth(3).click(); await pg.wait_for_timeout(300)
      await pg.locator('[data-ftag]').first.click(); await pg.wait_for_timeout(300)
      await pg.click('[data-fpaso="3"]'); await pg.wait_for_timeout(200)
      await pg.locator('[data-fj]').first.click(); await pg.wait_for_timeout(300)
      await pg.locator('[data-fj]').nth(1).click(); await pg.wait_for_timeout(200)
      await pg.locator('[data-fj]').nth(1).click(); await pg.wait_for_timeout(400)
      estados = await pg.evaluate("[...document.querySelectorAll('[data-fj]')].map(e=>e.className.replace('fh-j','').trim())")
      print('uno a uno:', estados)
      if estados[0] != 'bien' or estados[1] != 'mej': errs.append(f'el toque del uno a uno no cicla bien: {estados}')
      await pg.evaluate("document.querySelectorAll('.fh-mas').forEach(d=>d.open=true)")
      await pg.fill('[data-fh="salio"]', 'Lo vieron a la segunda.')
      await pg.wait_for_timeout(1500)
      msg = await pg.text_content('#fh-msg'); print('aviso:', msg.strip())
      if 'Guardado' not in msg: errs.append('no dice que se haya guardado solo')
      await pg.screenshot(path=O + 'ficha.png', full_page=True)

      # ha llegado a la nube y vuelve al recargar
      guardado = await pg.evaluate("(window.SMB.getBank().fichas||[]).map(f=>({pid:f.pid,eq:f.eq,conv:(f.conv||[]).length,ata:f.ata,comofue:f.comofue,tags:f.tags,unoa:f.unoa,salio:f.salio}))")
      print('en la nube:', json.dumps(guardado, ensure_ascii=False)[:220])
      if not guardado: errs.append('la ficha no ha llegado a la nube')
      elif guardado[0]['conv'] != 3: errs.append('la convocatoria no se ha guardado')
      await pg.reload(); await pg.wait_for_timeout(2500)
      await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
      await pg.locator('[data-equipo="Sub15"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub="part"]').first.click(); await pg.wait_for_timeout(500)
      conficha = await pg.evaluate("[...document.querySelectorAll('#espacio [data-fpart]')].filter(b=>/con ficha/.test(b.innerText)).length")
      print('partidos marcados «con ficha» tras recargar:', conficha)
      if conficha != 1: errs.append('la ficha no se ve al volver')
      await pg.locator('#espacio [data-fpart]').first.click(); await pg.wait_for_timeout(600)
      await pg.click('[data-fpaso="3"]'); await pg.wait_for_timeout(200)
      await pg.evaluate("document.querySelectorAll('.fh-mas').forEach(d=>d.open=true)")
      vuelta = await pg.input_value('[data-fh="salio"]')
      print('lo que salió, al volver:', vuelta)
      if 'segunda' not in vuelta: errs.append('no recupera lo escrito')

      # el partido también sale en la semana de Inicio
      await pg.locator('#espacio [data-fvolver]').first.click(); await pg.wait_for_timeout(500)   # vuelve al equipo
      await pg.locator('#espacio [data-espclose]').first.click(); await pg.wait_for_timeout(400)   # y cierra
      await pg.click('[data-nav="inicio"]'); await pg.wait_for_timeout(600)
      sem = await pg.evaluate("[...document.querySelectorAll('.ag-part')].map(r=>r.innerText.replace(/\\n/g,' · '))")
      print('partidos en la semana:', sem)
      if not sem: errs.append('el partido no sale en la semana de Inicio sin desplegar')
      await pg.screenshot(path=O + 'semana.png', full_page=True)

      # el recuento de convocatorias: una ficha anterior con solo dos de las tres
      # dos partidos anteriores en los que Fátima no fue: con dos seguidos ya avisa
      await pg.evaluate("""async () => {
        for (const [pid, fecha] of [['s15-Sub15-1','2026-10-17'], ['s15-Sub15-2','2026-10-23']])
          await window.SMB_CLOUD.ficha.save(pid, {pid, eq:'Sub15', fecha, rival:'Rival',
            conv:['Ada Lovelace','Cora Pérez'], ideas:[], corr:[], preg:[], salio:''});
      }""")
      await pg.wait_for_timeout(1200)
      await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
      await pg.locator('[data-equipo="Sub15"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub="part"]').first.click(); await pg.wait_for_timeout(500)
      await pg.locator('#espacio [data-fpart]').first.click(); await pg.wait_for_timeout(700)
      cuentas = await pg.evaluate("[...document.querySelectorAll('#espacio .cv-row')].map(r=>r.innerText.replace(/\\n/g,' · '))")
      print('convocatorias por jugadora:', cuentas)
      if not any('2 de los últimos 2' in c for c in cuentas): errs.append('no cuenta las convocatorias anteriores')
      if not any('0 de los últimos 2' in c for c in cuentas): errs.append('no cuenta a quien no fue')
      if not any('sin ir' in c for c in cuentas): errs.append('no avisa de quien lleva partidos sin ir')
      await pg.screenshot(path=O + 'convocatoria.png')

      print('errs', errs)
      await b.close()
      if errs: sys.exit(1)
  finally:
    srv.terminate()
asyncio.run(main())
