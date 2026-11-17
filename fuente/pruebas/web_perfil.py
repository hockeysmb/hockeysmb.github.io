import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# El perfil de cada jugador: lo que ha jugado (de las fichas), y, cuando la DT lo activa, evaluación con
# los instrumentos del Plan de acción, objetivos y apuntes, que solo ven sus entrenadores y la DT.
import asyncio, json, subprocess
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
O = SHOTS + 'perfil/'; os.makedirs(O, exist_ok=True)
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano', 'verified': True}
JAC = {'uid': 'ujacobo00000000000000000001', 'email': 'jacobo@example.com', 'name': 'Jacobo', 'verified': True}
PLANT = {'Benjamín A': [{'n': 'Ada Lovelace', 'a': '2016'}], 'Benjamín D': [{'n': 'Darío Ruiz', 'a': '2017'}, {'n': 'Elsa Mora', 'a': '2017'}]}
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8786', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
      await pg.clock.set_system_time(__import__('datetime').datetime(2026, 11, 17, 10, 0, 0))
      await pg.goto('http://localhost:8786/'); await pg.wait_for_timeout(600)
      async def google(u):
        await pg.wait_for_selector('[data-cl="google"]', timeout=15000)   # tras salir, la pantalla de acceso tarda un poco
        await pg.evaluate('d=>{window.__nextGoogle=d}', u); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1300)
      async def out():
        await pg.evaluate("document.querySelector('#espacio [data-pvolver]')&&document.querySelector('#espacio [data-pvolver]').click(); document.querySelector('#espacio [data-espclose]')&&document.querySelector('#espacio [data-espclose]').click()")
        await pg.wait_for_timeout(300)
        await pg.wait_for_selector('#cl-gate', state='hidden', timeout=15000)   # que haya terminado de entrar
        await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1300)
      async def perfil(equipo, nombre):
        await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(500)
        await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
        await pg.locator(f'[data-equipo="{equipo}"]:visible').first.click(); await pg.wait_for_timeout(400)
        await pg.locator('[data-eqsub="plant"]').first.click(); await pg.wait_for_timeout(300)
        await pg.locator('#espacio .jg-row', has_text=nombre).first.click(); await pg.wait_for_timeout(500)
      async def foto(n):   # el perfil va en una capa con su propio scroll: se hace alta la ventana para verlo entero
        h = await pg.evaluate("document.getElementById('espacio').scrollHeight")
        await pg.set_viewport_size({'width': W, 'height': min(4000, max(860, h + 40))}); await pg.wait_for_timeout(200)
        await pg.screenshot(path=O + n + '.png'); await pg.set_viewport_size({'width': W, 'height': 860})
      tabs = lambda: pg.evaluate("[...document.querySelectorAll('#espacio .eq-tabs [data-ptab]')].map(b=>b.textContent)")
      seg = lambda: pg.evaluate("Object.entries(window.__fake.db()).filter(([k])=>/^jugadores\\/[^/]+\\/seg\\//.test(k)).map(([k,v])=>({k, tipo:v.tipo, uid:v.uid}))")
      cerrar = lambda: pg.evaluate("document.querySelector('#espacio [data-pvolver]')&&document.querySelector('#espacio [data-pvolver]').click(); document.querySelector('#espacio [data-espclose]')&&document.querySelector('#espacio [data-espclose]').click()")

      # la DT: banco, Jacobo, plantilla migrada y dos fichas de partido de Benjamín D
      await google(DT)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(300)
      await pg.locator('[data-dtsub="acceso"]:visible').first.click(); await pg.wait_for_timeout(300)
      await pg.fill('#cl-pre-name', 'Jacobo'); await pg.fill('#cl-pre-email', JAC['email']); await pg.click('[data-cl="prereg"]'); await pg.wait_for_timeout(600)
      await pg.evaluate("p=>window.SMB.saveBankExtra({plant:p},'ok')", PLANT); await pg.wait_for_timeout(800)
      await out(); await google(JAC); await out(); await google(DT)   # Jacobo entra una vez: ya se sabe su cuenta
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(300)
      await pg.locator('[data-dtsub="equipos"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-pl="migrar"]').first.click(); await pg.wait_for_timeout(400)
      await pg.click('#m-ok'); await pg.wait_for_timeout(2000)
      await pg.evaluate("""async () => {
        await window.SMB_CLOUD.ficha.save('d1', {pid:'d1', eq:'Benjamín D', fecha:'2026-11-08', rival:'Rival Uno', conv:['Darío Ruiz','Elsa Mora'], unoa:{'Darío Ruiz':'bien'}, ideas:[], corr:[], preg:[], salio:''});
        await window.SMB_CLOUD.ficha.save('d2', {pid:'d2', eq:'Benjamín D', fecha:'2026-11-15', rival:'Rival Dos', conv:['Elsa Mora'], ideas:[], corr:[], preg:[], salio:''});
      }"""); await pg.wait_for_timeout(1200)

      # el perfil: lo que ha jugado, sin evaluación hasta que la DT la active
      await perfil('Benjamín D', 'Darío Ruiz')
      txt = ' '.join((await pg.text_content('#espacio')).split())
      print('perfil:', txt[:260])
      if '1 de 2' not in txt: errs.append('no cuenta las convocatorias (1 de 2)')
      if '1 bien' not in txt: errs.append('no cuenta el uno a uno')
      if 'no fue' not in txt: errs.append('no dice a qué partido no fue')
      t0 = await tabs(); print('pestañas sin activar:', t0)
      if any('Evaluación' in x for x in t0): errs.append('la evaluación se ve sin que la DT la active')
      if not await pg.locator('#espacio [data-segon="ver"]').count(): errs.append('la DT no ve cómo activarla')
      await foto('resumen')
      # activar pide confirmar lo del colegio en la propia página
      await pg.click('#espacio [data-segon="ver"]'); await pg.wait_for_timeout(200)
      av = await pg.text_content('#espacio .eq-box.aviso'); print('al activar:', ' '.join(av.split())[:160])
      if 'colegio' not in av: errs.append('activar no recuerda lo de la privacidad del colegio')
      await pg.click('#espacio [data-segon="si"]'); await pg.wait_for_timeout(1200)
      t1 = await tabs(); print('pestañas activadas:', t1)
      for q in ('Evolución', 'Objetivos', 'Historial'):
        if not any(q in x for x in t1): errs.append(f'al activar no sale {q}')

      # evaluación de tocar: decide 3 y ejecuta 1 en una situación -> «cabeza lista, gesto verde»
      await pg.locator('#espacio [data-ptab="evaluar"]').first.click(); await pg.wait_for_timeout(300)
      sits = await pg.evaluate("[...document.querySelectorAll('#espacio .sg-fila > span:first-child')].map(e=>e.textContent)")
      print('situaciones y técnica:', sits)
      if '1c1 leyendo a la defensa' not in sits: errs.append('no salen las situaciones del foco de Benjamín')
      if not await pg.is_disabled('[data-sgguardar]'): errs.append('deja guardar una evaluación vacía')
      await pg.click('[data-sgd="0"][data-v="3"]'); await pg.wait_for_timeout(150)
      await pg.click('[data-sge="0"][data-v="1"]'); await pg.wait_for_timeout(150)
      await pg.click('[data-sgr="patin"][data-v="2"]'); await pg.wait_for_timeout(150)
      await pg.click('[data-sgr="pase"][data-v="1"]'); await pg.wait_for_timeout(150)
      mz = await pg.text_content('.sg-matriz'); print('matriz:', mz)
      if 'gesto técnico' not in mz: errs.append('la matriz no dice qué entrenar')
      escribir = await pg.evaluate("[...document.querySelectorAll('#espacio input[type=text]')].filter(e=>!e.closest('details')&&!e.closest('.sg-nuevo')).length")
      if escribir: errs.append('la evaluación pide escribir: tenía que ser de tocar')
      await foto('evaluacion')
      await pg.click('[data-sgguardar]'); await pg.wait_for_timeout(900)
      ev = ' '.join((await pg.text_content('#espacio .pf-ev')).split()); print('tarjeta de evaluación:', ev[:160])
      if 'Decide' not in ev or '3,0' not in ev or 'gesto técnico' not in ev: errs.append('el Resumen no enseña la última evaluación')
      # segunda toma, en enero, para que haya evolución
      await pg.locator('#espacio [data-ptab="evaluar"]').first.click(); await pg.wait_for_timeout(300)
      await pg.click('[data-sgven="ene"]'); await pg.click('[data-sgd="0"][data-v="3"]'); await pg.click('[data-sge="0"][data-v="3"]')
      await pg.click('[data-sgr="patin"][data-v="3"]'); await pg.click('[data-sgr="pase"][data-v="2"]'); await pg.click('[data-sgguardar]'); await pg.wait_for_timeout(900)
      await pg.locator('#espacio .eq-tabs [data-ptab="evol"]').click(); await pg.wait_for_timeout(300)
      grafica = await pg.locator('#espacio .pf-evol polyline').count()
      flechas = await pg.evaluate("[...document.querySelectorAll('#espacio .pf-fl.sube')].length")
      print('evolución: líneas', grafica, '· cosas que suben', flechas)
      if grafica < 2 or not flechas: errs.append('la evolución no enseña la gráfica o lo que sube')
      await foto('evolucion')
      # objetivos: dos como mucho
      await pg.locator('#espacio .eq-tabs [data-ptab="obj"]').click(); await pg.wait_for_timeout(300)
      for o in ['Conducir con la cabeza alta', 'Pasar antes de que le cierren']:
        await pg.fill('#sg-objtxt', o); await pg.click('[data-sgobjnuevo]'); await pg.wait_for_timeout(700)
      tercero = await pg.locator('#sg-objtxt').count(); print('se puede abrir un tercer objetivo:', bool(tercero))
      if tercero: errs.append('deja más de dos objetivos activos')
      await pg.locator('[data-sgobj][data-est="logrado"]').first.click(); await pg.wait_for_timeout(700)
      if not await pg.locator('#sg-objtxt').count(): errs.append('al cerrar uno no deja abrir otro')
      # un apunte de la DT, en el historial
      await pg.locator('#espacio .eq-tabs [data-ptab="hist"]').click(); await pg.wait_for_timeout(300)
      await pg.fill('#sg-nota', 'Pierde la bola cuando le presionan en la salida.'); await pg.click('[data-sgnota]'); await pg.wait_for_timeout(800)
      tipos = await pg.evaluate("[...document.querySelectorAll('#espacio .pf-h')].map(e=>e.className.replace('pf-h','').trim())")
      print('historial:', tipos)
      for k in ('ev', 'nota', 'obj', 'part'):
        if k not in tipos: errs.append(f'el historial no tiene {k}')
      S = await seg(); print('en la nube:', [(x['tipo'], x['uid'][:5]) for x in S])
      if sorted(x['tipo'] for x in S) != ['ev', 'ev', 'nota', 'obj', 'obj']: errs.append(f'no está todo en la nube: {S}')
      await pg.locator('#espacio .eq-tabs [data-ptab="resumen"]').click(); await pg.wait_for_timeout(300)
      await foto('resumen_activo')
      await cerrar(); await pg.wait_for_timeout(300)

      # Jacobo lleva Benjamín D: ve lo de Darío, apunta lo suyo, no borra lo de la DT
      await out(); await google(JAC)
      await perfil('Benjamín D', 'Darío Ruiz')
      t2 = await tabs(); print('Jacobo, pestañas de Darío:', t2)
      if not any('Historial' in x for x in t2): errs.append('Jacobo no ve el seguimiento de uno de su equipo')
      await pg.locator('#espacio .eq-tabs [data-ptab="hist"]').click(); await pg.wait_for_timeout(300)
      if await pg.locator('#espacio .pf-h.nota').count() != 1: errs.append('Jacobo no ve el apunte de la DT')
      if await pg.locator('#espacio [data-sgborrar]').count(): errs.append('Jacobo puede borrar el apunte de la DT')
      await pg.fill('#sg-nota', 'Hoy ha ayudado a recoger el material.'); await pg.click('[data-sgnota]'); await pg.wait_for_timeout(800)
      if await pg.input_value('#sg-nota'): errs.append('al guardar el apunte, el texto se queda en la caja')
      borrar = await pg.locator('#espacio [data-sgborrar]').count(); print('Jacobo puede borrar lo suyo:', bool(borrar))
      if borrar != 1: errs.append('Jacobo no puede borrar su propio apunte')
      await pg.locator('#espacio [data-sgborrar]').first.click(); await pg.wait_for_timeout(200)
      await pg.locator('#espacio [data-sgborrar][data-ya]').click(); await pg.wait_for_timeout(800)
      if len(await seg()) != 5: errs.append('borrar su apunte no lo ha quitado')
      await foto('historial')
      # el Resumen del equipo: tabla de jugadores, técnica del equipo y qué reforzar
      await pg.locator('#espacio [data-pvolver]').click(); await pg.wait_for_timeout(300)
      await pg.locator('[data-eqsub="resumen"]').first.click(); await pg.wait_for_timeout(1200)
      tabla = await pg.evaluate("[...document.querySelectorAll('#espacio .eq-ind tbody tr')].map(r=>r.innerText.replace(/\\t|\\n/g,' | '))")
      print('tabla del equipo:', tabla)
      if not any('Darío' in r and '3,0' in r and 'Al día' not in r for r in tabla) and not any('Darío' in r and '3,0' in r for r in tabla): errs.append('la tabla del equipo no enseña la evaluación de Darío')
      if not await pg.locator('#espacio .eq-radar').count(): errs.append('falta la técnica del equipo')
      focos = await pg.evaluate("[...document.querySelectorAll('#espacio .eq-focos li')].map(e=>e.innerText.replace(/\\n/g,' '))")
      print('qué reforzar:', focos)
      if not any('Pase y control' in f for f in focos): errs.append('«qué reforzar» no saca lo más bajo (pase y control)')
      await foto('equipo')
      await pg.locator('#espacio .eq-ind [data-pjugid]').first.click(); await pg.wait_for_timeout(400)
      if not await pg.locator('#espacio .pf-cab').count(): errs.append('tocar un nombre de la tabla no abre su perfil')
      await cerrar(); await pg.wait_for_timeout(300)
      # Ada es de Benjamín A, que no lleva Jacobo: ni pestañas ni lectura (lo comprueban las reglas)
      await perfil('Benjamín A', 'Ada Lovelace')
      t3 = await tabs(); print('Jacobo, pestañas de Ada:', t3)
      if t3: errs.append('Jacobo ve el seguimiento de un jugador que no lleva')
      ada = await pg.evaluate("window.SMB.getBank().jugadores.find(j=>j.n==='Ada Lovelace').id")
      r = await pg.evaluate("id=>window.SMB_CLOUD.seg.save(id,'x1',{tipo:'nota',txt:'x'}).then(()=>'escrito',e=>'rechazado')", ada)
      print('Jacobo escribe en el seguimiento de Ada:', r)
      if r != 'rechazado': errs.append('las reglas dejan a Jacobo escribir en un jugador ajeno')
      print('errs', errs)
      await b.close()
      if errs: sys.exit(1)
  finally:
    srv.terminate()
asyncio.run(main())
