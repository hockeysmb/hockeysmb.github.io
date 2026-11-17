import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Fase 1 del módulo Equipos: migración a una ficha por jugador (con dudas), permisos por equipo
# comprobados con las reglas (no solo escondiendo botones), tarjetas por categoría y Resumen.
import asyncio, json, subprocess
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
O = SHOTS + 'fase1/'; os.makedirs(O, exist_ok=True)
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano', 'verified': True}
JAC = {'uid': 'ujacobo00000000000000000001', 'email': 'jacobo@example.com', 'name': 'Jacobo', 'verified': True}
# nombres inventados; con una duda de cada clase
PLANT = {
  'Benjamín A': [{'n': 'Ada Lovelace', 'a': '2016'}, {'n': 'Teo Duplo', 'a': '2017'}],
  'Benjamín D': [{'n': 'Darío Ruiz', 'a': '2017'}, {'n': 'Elsa Mora', 'a': '2016'}],
  'Benjamín E': [{'n': 'Teo Duplo', 'a': '2017'}],                                   # dos equipos base
  'Sub15': [{'n': 'Elsa Mora', 'a': '2016'}, {'n': 'Lía Sola', 'a': '2012'}],        # Elsa: se junta sola
  'Sub17': [{'n': 'Lía Sola', 'a': '2012'}, {'n': 'Nora Prieto', 'a': '2011'}],      # Lía: solo selecciones
  'Senior Fem': [{'n': 'Nora', 'a': '2011'}],                                         # ¿Nora = Nora Prieto?
}
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8785', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
      await pg.goto('http://localhost:8785/'); await pg.wait_for_timeout(600)
      async def google(u):
        await pg.evaluate('d=>{window.__nextGoogle=d}', u); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1300)
      async def out():
        await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1300)
      db = lambda: pg.evaluate("window.__fake.db()")

      # la DT: banco, alta de Jacobo por correo y la plantilla vieja
      await google(DT)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(300)
      await pg.locator('[data-dtsub="acceso"]:visible').first.click(); await pg.wait_for_timeout(300)
      await pg.fill('#cl-pre-name', 'Jacobo'); await pg.fill('#cl-pre-email', JAC['email']); await pg.click('[data-cl="prereg"]'); await pg.wait_for_timeout(600)
      await pg.evaluate("p=>window.SMB.saveBankExtra({plant:p},'ok')", PLANT); await pg.wait_for_timeout(800)
      # antes de migrar, un entrenador no puede tocar la plantilla
      await out(); await google(JAC)
      print('Jacobo dentro:', await pg.is_hidden('#cl-gate'))
      await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
      await pg.locator('[data-equipo="Benjamín D"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub="plant"]').first.click(); await pg.wait_for_timeout(300)
      antes = await pg.locator('#espacio [data-palta]').count()
      print('antes de migrar, Jacobo puede añadir:', bool(antes))
      if antes: errs.append('antes de migrar un entrenador no debería poder añadir')
      await pg.click('[data-espclose]'); await pg.wait_for_timeout(300)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)")
      await out(); await google(DT)

      # la migración, con sus dudas
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(300)
      await pg.locator('[data-dtsub="equipos"]:visible').first.click(); await pg.wait_for_timeout(400)
      aviso = await pg.text_content('.pl-mig'); print('aviso:', ' '.join(aviso.split())[:200])
      await pg.locator('[data-pl="migrar"]').first.click(); await pg.wait_for_timeout(400)
      dudas = await pg.evaluate("[...document.querySelectorAll('.mg-duda p')].map(p=>p.innerText)")
      print('dudas:', dudas)
      if len(dudas) != 3: errs.append(f'esperaba 3 dudas y hay {len(dudas)}')
      boton = await pg.text_content('#m-ok'); print('botón sin decidir:', boton)
      if not await pg.is_disabled('#m-ok'): errs.append('deja pasar sin decidir las dudas')
      await pg.screenshot(path=O + 'dudas.png')
      for k, v in [('teo duplo', 'Benjamín A'), ('lia sola', 'Sub15'), ('nora|nora prieto', 'si')]:
        await pg.click(f'[data-mgk="{k}"][data-mgv="{v}"]'); await pg.wait_for_timeout(150)
      await pg.click('#m-ok'); await pg.wait_for_timeout(2000)
      d = await db()
      J = {k.split('/')[1]: v for k, v in d.items() if k.startswith('jugadores/')}
      fichas = sorted((v['n'], v['eq'], tuple(v.get('otros', []))) for v in J.values())
      print('jugadores:', fichas)
      if len(J) != 6: errs.append(f'esperaba 6 personas y hay {len(J)}')
      if ('Elsa Mora', 'Benjamín D', ('Sub15',)) not in fichas: errs.append('Elsa no se ha juntado sola con Benjamín D de principal')
      if ('Teo Duplo', 'Benjamín A', ('Benjamín E',)) not in fichas: errs.append('Teo no tiene Benjamín A de principal')
      if not any(f[0] == 'Nora Prieto' and set(f[2]) | {f[1]} == {'Sub17', 'Senior Fem'} for f in fichas): errs.append('Nora y Nora Prieto no se han juntado')
      eq = d['club/state'].get('eqUids', {})
      print('quién lleva Benjamín D:', eq.get('Benjamín D'))
      if JAC['uid'] not in eq.get('Benjamín D', []): errs.append('Jacobo no sale como entrenador de Benjamín D para las reglas')
      if 'plant' not in json.loads(d['club/state']['j']): errs.append('la plantilla vieja no se ha conservado')
      if '"fichas"' in d['club/state']['j']: errs.append('las fichas de partido se están guardando dentro de club/state')

      # tarjetas por categoría y el tipo, que pone la DT
      await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
      cats = await pg.evaluate("[...document.querySelectorAll('#v-equipos .eq-grupo')].map(d=>d.dataset.cat)")
      print('categorías:', cats)
      if 'Benjamín' not in cats or 'Femenino' not in cats: errs.append('las tarjetas no van agrupadas por categoría')
      await pg.locator('[data-equipo="Benjamín D"]:visible').first.click(); await pg.wait_for_timeout(500)
      res = await pg.text_content('#espacio .eq-grid'); print('resumen:', ' '.join(res.split())[:160])
      await pg.click('[data-eqtipo="comp"]'); await pg.wait_for_timeout(900)
      await pg.screenshot(path=O + 'resumen.png', full_page=True)
      await pg.click('[data-espclose]'); await pg.wait_for_timeout(400)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)")
      pill = await pg.evaluate("[...document.querySelectorAll('[data-equipo]')].filter(b=>b.dataset.equipo==='Benjamín D').map(b=>b.innerText)[0]")
      print('tarjeta:', ' | '.join(pill.split('\n')))
      if 'Competición' not in pill: errs.append('el tipo no sale en la tarjeta')
      await pg.screenshot(path=O + 'tarjetas.png', full_page=True)

      # Jacobo: su equipo sí, los demás no, y comprobado contra las reglas
      await out(); await google(JAC)
      await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
      await pg.locator('[data-equipo="Benjamín D"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub="plant"]').first.click(); await pg.wait_for_timeout(300)
      await pg.locator('#espacio [data-palta]').first.click(); await pg.wait_for_timeout(300)
      await pg.fill('#pj-n', 'Gael Nuevo'); await pg.fill('#pj-a', '2017'); await pg.click('#m-ok'); await pg.wait_for_timeout(1200)
      bd = await pg.evaluate("[...document.querySelectorAll('#espacio .jg-row')].map(r=>r.innerText.split('\\n')[1])")
      print('Benjamín D, por Jacobo:', bd)
      if 'Gael Nuevo' not in bd: errs.append('Jacobo no ha podido añadir en su equipo')
      await pg.click('[data-espclose]'); await pg.wait_for_timeout(300)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)")
      await pg.locator('[data-equipo="Benjamín A"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub="plant"]').first.click(); await pg.wait_for_timeout(300)
      ajeno = await pg.locator('#espacio [data-palta]').count()
      print('en Benjamín A, Jacobo ve «Añadir»:', bool(ajeno))
      if ajeno: errs.append('Jacobo ve «Añadir» en un equipo que no lleva')
      ada = [k for k, v in J.items() if v['n'] == 'Ada Lovelace'][0]
      r = await pg.evaluate("""async id => { const C = window.SMB_CLOUD.jug, out = {};
        try { await C.save('jx' + Date.now(), {n:'Intruso', a:'2016', p:false, nt:'', eq:'Benjamín A', otros:[], temp:'2026/27'}); out.crearAjeno = 'dejó'; } catch (e) { out.crearAjeno = 'no'; }
        const ada = window.SMB.getBank().jugadores.find(j => j.id === id), base = {n:ada.n, a:ada.a, p:ada.p, nt:ada.nt, eq:ada.eq, otros:ada.otros, temp:ada.temp};
        try { await C.save(id, Object.assign({}, base, {otros: ['Benjamín D']})); out.meterEnSuyo = 'dejó'; } catch (e) { out.meterEnSuyo = 'no'; }
        try { await C.save(id, Object.assign({}, base, {otros: ['Benjamín D'], n: 'Ada Cambiada'})); out.cambiarNombre = 'dejó'; } catch (e) { out.cambiarNombre = 'no'; }
        return out; }""", ada)
      print('reglas con Jacobo:', r)
      if r != {'crearAjeno': 'no', 'meterEnSuyo': 'dejó', 'cambiarNombre': 'no'}: errs.append(f'las reglas no hacen lo que deben: {r}')

      print('errs', errs)
      await b.close()
      if errs: sys.exit(1)
  finally:
    srv.terminate()
asyncio.run(main())
