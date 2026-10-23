import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# App de jugadoras (femenino/): alta, activación con consentimiento, objetivos, respuestas, panel de la DT y borrado
import asyncio, subprocess, datetime, json
from playwright.async_api import async_playwright
ROOT = os.path.dirname(F.rstrip('/'))
O = SHOTS + 'fem/'; os.makedirs(O, exist_ok=True)
CFG = "window.SMBF_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMBF_ADMIN=['adminuid0000000000000000001'];"
DT = {'uid': 'adminuid0000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano'}
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8768', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, accept_downloads=True)
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/femenino/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.add_init_script(path=P + 'fakefem.js')
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.clock.set_system_time(datetime.datetime(2026, 10, 26, 18, 0, 0))   # lunes: entrena el Sub17
      U = 'http://localhost:8768/femenino/'
      async def go(): await pg.goto(U); await pg.wait_for_timeout(700)
      async def salir():
        if await pg.query_selector('[data-v="datos"]'): await pg.click('[data-v="datos"]')
        await pg.click('[data-a="out"]'); await pg.wait_for_timeout(500)
      await go(); await pg.screenshot(path=O + '0_entrar.png')
      # 1. alta de Ana (menor)
      await pg.fill('#l-email', 'ana@ejemplo.com'); await pg.fill('#l-pass', 'hockey1'); await pg.click('[data-a="up"]'); await pg.wait_for_timeout(600)
      await pg.fill('#a-nombre', 'Ana Prueba'); await pg.click('[data-eq="sub17"]'); await pg.check('#a-menor'); await pg.check('#a-ok')
      await pg.click('[data-a="alta"]'); await pg.wait_for_timeout(300); print('sin firma de la familia:', await pg.text_content('#msg'))
      await pg.check('#a-fam'); await pg.screenshot(path=O + '1_alta.png', full_page=True); await pg.click('[data-a="alta"]'); await pg.wait_for_timeout(600)
      print('espera:', (await pg.text_content('.gate h2')))
      uid = await pg.evaluate("window.__fake.uidOf('ana@ejemplo.com')")
      # sin activar no puede escribir respuestas
      try:
        await pg.evaluate(f"window.SMBF_BACKEND.set('registros/{uid}/dias/2026-10-26', {{x:1}})"); errs.append('escribe sin estar activa')
      except Exception: print('sin activar no puede escribir: ok')
      await pg.click('[data-a="out"]'); await pg.wait_for_timeout(400)
      # 2. la DT la activa y pone objetivos
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-a="google"]'); await pg.wait_for_timeout(800)
      await pg.click('[data-av="acceso"]'); await pg.wait_for_timeout(300)
      print('pendiente:', ' '.join((await pg.text_content('.list .li')).split()))
      await pg.click(f'[data-a="activar"][data-u="{uid}"]'); await pg.wait_for_timeout(500)
      await pg.click('[data-av="semana"]'); await pg.wait_for_timeout(300)
      await pg.fill('#o-sub17-0', 'Presionar al pase atrás'); await pg.fill('#o-sub17-1', 'Fijar y pasar en el 2c1'); await pg.click('[data-a="saveobj"][data-eq="sub17"]'); await pg.wait_for_timeout(400)
      print('acceso:', json.dumps(await pg.evaluate(f"window.__fake.db()['acceso/{uid}']"))[:120])
      # historial de 4 semanas para Ana (como si lo hubiera ido respondiendo), con la última semana más cargada
      await pg.evaluate("""uid => { const d0 = new Date(2026, 9, 26); for (let i = 1; i <= 30; i++) { const d = new Date(d0); d.setDate(d.getDate() - i); const dow = d.getDay(); if (![1, 2, 6].includes(dow)) continue;
        const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const hard = i <= 7;
        window.__fake.put('registros/' + uid + '/dias/' + k, { antes: { sueno: 4, fatiga: hard ? 3 : 4, dolor: 4, estres: 4, animo: 4, ts: 1 }, ses: [{ tipo: dow === 6 ? 'partido' : 'entreno', rpe: hard ? 8 : 5, min: dow === 6 ? 50 : 90, nota: '', ts: 1 }], ts: 1 }); } }""", uid)
      await pg.click('[data-a="out"]'); await pg.wait_for_timeout(400)
      # 3. Ana responde hoy
      await pg.fill('#l-email', 'ana@ejemplo.com'); await pg.fill('#l-pass', 'hockey1'); await pg.click('[data-a="in"]'); await pg.wait_for_timeout(900)
      print('hoy:', (await pg.text_content('h1')))
      await pg.screenshot(path=O + '2a_hoy.png', full_page=True)
      await pg.click('[data-a="startantes"]'); await pg.wait_for_timeout(200)
      await pg.screenshot(path=O + '2_antes.png')
      for k, v in (('sueno', 2), ('fatiga', 2), ('dolor', 2), ('estres', 3), ('animo', 3)):
        await pg.click(f'[data-fw="{k}"][data-v="{v}"]'); await pg.wait_for_timeout(450)
      print('tras antes:', await pg.text_content('.toast'))
      await pg.click('[data-lvl="3"]'); await pg.click('[data-minc="otro"]'); await pg.click('[data-min="-5"]'); await pg.fill('#s-nota', 'Me molestaba el gemelo')
      await pg.screenshot(path=O + '3_despues.png', full_page=True)
      await pg.click('[data-a="saveses"]'); await pg.wait_for_timeout(500)
      for i in (0, 1):
        await pg.click(f'[data-so="{i}"][data-sk="decide"][data-v="2"]'); await pg.click(f'[data-so="{i}"][data-sk="ejecuta"][data-v="{i + 2}"]')
      await pg.fill('#s-resp', 'Ver antes de recibir.'); await pg.fill('#s-meta', 'Pedir la bola de cara'); await pg.click('[data-a="savesem"]'); await pg.wait_for_timeout(500)
      await pg.screenshot(path=O + '4_hoy_hecho.png', full_page=True)
      d = await pg.evaluate(f"window.__fake.db()['registros/{uid}/dias/2026-10-26']"); s = await pg.evaluate(f"window.__fake.db()['registros/{uid}/semanas/2026-10-26']")
      print('guardado hoy:', d['antes']['sueno'], d['ses'][0]['rpe'], d['ses'][0]['min'], '| semana:', s and s['meta'])
      await pg.click('[data-v="yo"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O + '5_jugadora.png', full_page=True)
      print('nivel:', ' '.join((await pg.text_content('.me-info')).split())[:90])
      await pg.click('[data-a="editav"]'); await pg.wait_for_timeout(200)
      await pg.click('[data-avk="top"][data-avv="bun"]'); await pg.click('[data-avk="ropa"][data-avv="shirtCrewNeck:ffffff"]')
      locked = await pg.locator('.seg button.locked').count(); print('cosas bloqueadas:', locked)
      await pg.screenshot(path=O + '5b_editar.png', full_page=True)
      await pg.click('[data-a="saveav"]'); await pg.wait_for_timeout(400)
      av = await pg.evaluate(f"window.__fake.db()['jugadoras/{uid}'].av"); print('personaje:', av['top'], av['ropa'])
      if av['top'] != 'bun': errs.append('no se guarda el personaje')
      if not await pg.evaluate("!!document.querySelector('.me-av svg.av svg')"): errs.append('no se dibuja el personaje')
      await salir()
      # 4. panel de la DT (en el ordenador)
      await pg.set_viewport_size({'width': 1280, 'height': 900})
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-a="google"]'); await pg.wait_for_timeout(900)
      print('resumen DT:', ' | '.join(' '.join(t.split()) for t in await pg.locator('.tile').all_inner_texts()))
      print('avisos:', ' | '.join(' '.join(t.split()) for t in await pg.locator('.al-row').all_inner_texts()))
      await pg.screenshot(path=O + '6a_dt_resumen.png', full_page=True)
      await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(200); await pg.screenshot(path=O + '6b_dt_resumen_movil.png', full_page=True)
      await pg.set_viewport_size({'width': 1280, 'height': 900})
      await pg.click('[data-av="equipo"]'); await pg.wait_for_timeout(300)
      row = await pg.text_content('tbody tr'); print('fila DT:', ' '.join(row.split()))
      await pg.screenshot(path=O + '6_dt_tabla.png', full_page=True)
      await pg.click('tbody tr'); await pg.wait_for_timeout(400)
      print('motivos:', await pg.evaluate("[...document.querySelectorAll('.card ul.info li')].map(l=>l.textContent)"))
      await pg.click('[data-val="2026-10-26|0|decide|3"]'); await pg.wait_for_timeout(300)
      print('valoración DT:', await pg.evaluate(f"JSON.stringify(window.__fake.db()['valoraciones/{uid}/semanas/2026-10-26'])"))
      await pg.screenshot(path=O + '7_dt_detalle.png', full_page=True)
      await pg.click('[data-av="acceso"]'); await pg.wait_for_timeout(300)
      async with pg.expect_download() as dl: await pg.click('[data-a="csv"]')
      path = await (await dl.value).path(); lines = open(path, encoding='utf-8-sig').read().splitlines(); print('CSV:', len(lines), 'líneas |', lines[0][:80])
      await pg.click('[data-a="out"]'); await pg.wait_for_timeout(400)
      # 5. Ana borra sus datos
      await pg.set_viewport_size({'width': 390, 'height': 844})
      await pg.fill('#l-email', 'ana@ejemplo.com'); await pg.fill('#l-pass', 'hockey1'); await pg.click('[data-a="in"]'); await pg.wait_for_timeout(900)
      await pg.click('[data-v="datos"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O + '8_datos.png', full_page=True)
      await pg.click('[data-a="borrartodo"]'); await pg.click('[data-a="borrartodo"]'); await pg.wait_for_timeout(700)
      left = await pg.evaluate(f"Object.keys(window.__fake.db()).filter(k=>k.includes('{uid}') && !k.startsWith('acceso') && !k.startsWith('valoraciones'))"); print('quedan de Ana:', left)
      if left: errs.append('no se borra todo')
      print('errs', errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
