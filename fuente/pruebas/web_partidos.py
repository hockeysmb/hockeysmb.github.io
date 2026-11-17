import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# La pestaña Partidos de un equipo: próximo, balance, clasificación (calculada por el robot) y listas cortas
# con el resto plegado, bien ordenadas.
import asyncio, json, subprocess
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
O = SHOTS + 'partidos/'; os.makedirs(O, exist_ok=True)
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano', 'verified': True}
# partidos y clasificación inventados (equipos rivales de mentira)
P = [{'id': f'be2-BenjamínD-{j}', 'eq': 'Benjamín D', 'cat': 'Benjamín 2ª', 'j': j, 'fecha': f, 'hora': h, 'pista': '', 'rival': r, 'casa': c, 'res': res}
     for j, f, h, r, c, res in [(1, '2026-10-04', '10:00', 'Rival Uno', True, '3-1'), (2, '2026-10-11', '11:00', 'Rival Dos', False, '2-2'),
                               (3, '2026-10-18', '12:00', 'Rival Tres', True, '0-4'), (4, '2026-10-25', '10:00', 'Rival Cuatro', False, '5-0'),
                               (5, '2026-11-08', '09:00', 'Rival Cinco', True, '1-2'), (6, '2026-11-21', '', 'Rival Seis', True, ''),
                               (7, '2026-11-28', '10:00', 'Rival Siete', False, ''), (8, '2026-12-05', '10:00', 'Rival Ocho', True, ''),
                               (9, '2026-12-12', '10:00', 'Rival Nueve', False, ''), (10, '2026-11-20', '19:00', 'Rival Diez', False, '')]]
T = [{'n': f'Equipo {k}', 'pj': 5, 'g': 5 - k // 3, 'e': 0, 'p': k // 3, 'gf': 20 - k, 'gc': k, 'pts': 15 - k, 'smb': ''} for k in range(12)]
T[7] = dict(T[7], n='Santa María la Blanca D', smb='Benjamín D'); T[3] = dict(T[3], n='Santa María la Blanca C', smb='Benjamín C')
DATOS = {'fuente': 'x', 'actualizado': '2026-11-17', 'clasif': {'be2': {'cat': 'Benjamín 2ª', 'liga': '4857', 'tabla': T}}, 'partidos': P}
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8787', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': W, 'height': 860})
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.route('**/partidos.json*', lambda r: r.fulfill(body=json.dumps(DATOS), content_type='application/json'))
      await ctx.add_init_script(path=FAKEFB)
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.clock.set_system_time(__import__('datetime').datetime(2026, 11, 17, 10, 0, 0))
      await pg.goto('http://localhost:8787/'); await pg.wait_for_timeout(600)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1200)
      await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
      await pg.locator('[data-equipo="Benjamín D"]:visible').first.click(); await pg.wait_for_timeout(400)
      await pg.locator('[data-eqsub="part"]').first.click(); await pg.wait_for_timeout(500)
      prox = ' '.join((await pg.text_content('#espacio .eq-prox')).split()); print('próximo:', prox)
      if 'Rival Diez' not in prox: errs.append('el próximo no es el más cercano (Rival Diez, el 20)')
      bal = ' '.join((await pg.inner_text('#espacio .pt-bal')).split()); print('balance:', bal)
      if not bal.startswith('2 ganados 1 empatados 2 perdidos'): errs.append('el balance no cuadra (2-1-2)')
      dato = await pg.text_content('#espacio .pt-bal + .eq-dato'); print('goles y puesto:', ' '.join(dato.split()))
      if '8.º de 12' not in dato or '11 goles a favor y 9 en contra' not in dato: errs.append('no salen los goles o el puesto')
      filas = await pg.evaluate("[...document.querySelectorAll('#espacio .pt-clas')[0].querySelectorAll('tbody tr')].map(r=>r.className+'|'+r.innerText.replace(/\\t/g,' '))")
      print('clasificación a la vista:', filas)
      if not any(r.startswith('yo|8') for r in filas): errs.append('la fila del equipo no está marcada')
      if not any('corte' in r for r in filas): errs.append('con 12 equipos debería cortar la tabla')
      if not await pg.locator('#espacio summary', has_text='Ver la tabla entera').count(): errs.append('no se puede ver la tabla entera')
      if not await pg.locator('#espacio a[href*="liga=4857"]').count(): errs.append('falta el enlace a la federación')
      vista = await pg.evaluate("[...document.querySelectorAll('#espacio .pt-list')].filter(u=>!u.closest('details')).map(u=>[...u.querySelectorAll('.pt-rival b')].map(b=>b.textContent))")
      print('listas a la vista:', vista)
      if vista != [['Rival Diez', 'Rival Seis', 'Rival Siete'], ['Rival Cinco', 'Rival Cuatro', 'Rival Tres']]: errs.append('las listas no están bien ordenadas o enseñan de más')
      plegados = await pg.evaluate("[...document.querySelectorAll('#espacio details.dt-more summary')].map(s=>s.textContent)")
      print('plegado:', plegados)
      if not any('siguientes · 2' in x for x in plegados) or not any('anteriores · 2' in x for x in plegados): errs.append('el resto no está plegado y contado')
      h = await pg.evaluate("document.getElementById('espacio').scrollHeight")
      await pg.set_viewport_size({'width': W, 'height': min(4000, h + 40)}); await pg.wait_for_timeout(200)
      await pg.screenshot(path=O + 'partidos.png'); await pg.set_viewport_size({'width': W, 'height': 860})
      print('errs', errs)
      await b.close()
      if errs: sys.exit(1)
  finally:
    srv.terminate()
asyncio.run(main())
