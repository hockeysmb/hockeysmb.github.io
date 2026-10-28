import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# El reto (minijuego de la app de jugadoras): partida, duelos 1 contra 1 (con la DT), liga de la semana y tienda. Equipo inventado.
import asyncio, subprocess, datetime, json
from playwright.async_api import async_playwright
from fem_dt import seed, CFG, DT, ROOT
O = SHOTS + 'fem_reto/'; os.makedirs(O, exist_ok=True)

def seed_reto():
  db = seed()
  for i in range(9):
    u = 'demo%02d' % i; j = db['jugadoras/' + u]
    if i == 3: continue   # Ana empieza sin ficha de juego
    db['juego/' + u] = {'n': j['nombre'].split()[0], 'av': j['av'], 'lv': i % 7, 'adm': False, 'bolas': 40 * i, 'gastado': 0, 'compras': [], 'rec': 900 + 137 * i,
                        'dias': {'2026-10-26': 400 + 90 * i, **({'2026-10-27': 300 + 55 * i} if i % 2 else {}), '2026-10-21': 2000 if i == 5 else 300}, 'partidas': 5 + i,
                        'mascota': ['perro', 'zorro', 'axolote', '', 'gato', 'dragon', 'panda', 'pinguino', 'conejo'][i]}
  db['registros/demo03/dias/2026-10-27']['diario'] = {'tiempo': 4, 'mejor': 'Me salió el 2c1', 'cambiar': '', 'como': '', 'ts': 1}
  db['duelos/dprueba1'] = {'a': 'demo01', 'b': 'demo03', 'seed': 12345, 'pa': 860, 'pb': None, 'ts': 1793100000000}
  return db

async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8771', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, service_workers='block')
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/femenino/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      users = {'demo03@ejemplo.com': {'uid': 'demo03', 'pass': 'hockey1'}}
      await ctx.add_init_script("if (!localStorage.getItem('__seeded')) { localStorage.setItem('__fakefem', " + json.dumps(json.dumps(seed_reto())) + "); localStorage.setItem('__fakefemusers', " + json.dumps(json.dumps(users)) + "); localStorage.setItem('smbf-bienvenida-demo03', '1'); localStorage.setItem('__seeded', '1'); }")
      await ctx.add_init_script(path=P + 'fakefem.js')
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.clock.set_system_time(datetime.datetime(2026, 10, 27, 18, 0, 0))
      rr = await pg.goto('http://localhost:8771/femenino/'); print('goto', rr.status if rr else None, ROOT); await pg.wait_for_timeout(700)
      db = lambda path: pg.evaluate(f"window.__fake.db()['{path}']")
      async def partida(s=3500, teclas=True):
        await pg.wait_for_selector('.jg-ov'); await pg.wait_for_timeout(2600)
        if teclas:
          for k in ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowLeft']: await pg.keyboard.press(k); await pg.wait_for_timeout(s // 6)
        await pg.screenshot(path=O + f'partida_{len(os.listdir(O))}.png'); await pg.click('.jg-x'); await pg.wait_for_timeout(500)
      # 1. Ana entra: le avisan del reto en «Hoy»
      await pg.fill('#l-email', 'demo03@ejemplo.com'); await pg.fill('#l-pass', 'hockey1'); await pg.click('[data-a="in"]'); await pg.wait_for_timeout(1200)
      av = await pg.locator('.rt-reto').count(); print('aviso de reto en Hoy:', av); await pg.screenshot(path=O + '1_hoy.png', full_page=True)
      if not av: errs.append('no sale el aviso del reto')
      ja = await db('juego/demo03'); print('ficha de juego creada al entrar:', bool(ja), (ja or {}).get('n'))
      if not ja: errs.append('no se crea su ficha de juego')
      # 1b. el después de ayer se puede contar hoy
      await pg.evaluate("window.__fake.put('registros/demo03/dias/2026-10-26', { ses: [] })"); await pg.wait_for_timeout(400)
      ay = await pg.locator('[data-a="ayerdesp"]').count(); print('tarjeta del entreno de ayer:', ay)
      if not ay: errs.append('no deja contar el después de ayer')
      else:
        await pg.click('[data-a="ayerdesp"]'); await pg.wait_for_timeout(300); await pg.click('#c-desp [data-rpe="6"]'); await pg.click('#c-desp [data-a="saveses"]'); await pg.wait_for_timeout(400)
        d26 = await db('registros/demo03/dias/2026-10-26'); print('después de ayer guardado:', [(x['rpe'], x['min']) for x in d26.get('ses', [])], '· hoy sin tocar:', len((await db('registros/demo03/dias/2026-10-27')).get('ses', [])))
        if len(d26.get('ses', [])) != 1: errs.append('no se guarda el después de ayer')
      # 1c. la mascota (tamagotchi): primera gratis, comer, jugar, bañar y mimos
      await pg.click('.nav [data-v="yo"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O + '1c_primera_mascota.png', full_page=True)
      await pg.click('[data-a="primera"][data-k="gato"]'); await pg.wait_for_timeout(400)
      await pg.evaluate("() => { const d = window.__fake.db()['juego/demo03']; window.__fake.put('juego/demo03', { tama: { gato: Object.assign({}, d.tama.gato, { h: 30 }) } }); }"); await pg.wait_for_timeout(300)
      await pg.click('[data-a="tcomida"]'); await pg.wait_for_timeout(200); await pg.click('[data-a="tcomer"][data-k="manzana"]'); await pg.wait_for_timeout(2000)
      await pg.click('[data-a="tcomida"]') if not await pg.locator('[data-a="tcomer"]').count() else None; await pg.wait_for_timeout(200); await pg.click('[data-a="tcomer"][data-k="pescado"]'); await pg.wait_for_timeout(700); await pg.screenshot(path=O + '1d_comiendo.png'); await pg.wait_for_timeout(1200)
      await pg.click('[data-a="tjuguetes"]'); await pg.wait_for_timeout(200); await pg.click('[data-a="tjugar"][data-k="pelota"]'); await pg.wait_for_timeout(2000)
      await pg.click('[data-a="tbanar"]'); await pg.wait_for_timeout(900); await pg.screenshot(path=O + '1e_banando.png'); await pg.wait_for_timeout(1500)
      await pg.click('.tm-pet'); await pg.wait_for_timeout(1000)
      # siesta en la cama (la manzana de antes es gratis: tres al día)
      await pg.click('.tm-suelo2'); await pg.wait_for_timeout(1500); await pg.screenshot(path=O + '1e2_siesta.png'); await pg.wait_for_timeout(4500)
      jt = await db('juego/demo03'); g = (jt.get('tama') or {}).get('gato') or {}; print('tamagotchi:', jt.get('mascota'), {k: g.get(k) for k in ('h', 'a', 'l', 'xp', 'jg', 'mi', 'gr', 'si')}, 'gastado', jt.get('gastado'))
      if jt.get('mascota') != 'gato' or not g or g.get('xp', 0) < 8 or g.get('l') != 100 or (jt.get('gastado') or 0) != 15: errs.append('el tamagotchi no guarda bien')
      if (g.get('gr') or {}).get('n') != 1: errs.append('la comida gratis no cuenta')
      if (g.get('si') or {}).get('n') != 1: errs.append('no se echa la siesta en la cama')
      # decorar: tema de playa y un sofá para dormir
      bol0 = (await db('juego/demo03')).get('bolas') or 0; await pg.evaluate("b => window.__fake.put('juego/demo03', { bolas: b })", bol0 + 500); await pg.wait_for_timeout(300)
      await pg.click('[data-a="tdeco"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O + '1e3_decorar.png', full_page=True)
      await pg.click('[data-a="comprar"][data-c="tema"][data-v="playa"]'); await pg.wait_for_timeout(500)
      await pg.click('[data-a="comprar"][data-c="mueble"][data-v="suelo2:sofa"]'); await pg.wait_for_timeout(500)
      jt = await db('juego/demo03'); print('habitación:', jt.get('casa'), [c for c in jt.get('compras', []) if c.startswith(('tema', 'mueble'))], 'gastado', jt.get('gastado'))
      if (jt.get('casa') or {}).get('tema') != 'playa' or ((jt.get('casa') or {}).get('m') or {}).get('suelo2') != 'sofa' or jt.get('gastado') != 515: errs.append('no se decora la habitación')
      await pg.click('[data-a="tdeco"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O + '1e4_playa.png', full_page=True)
      await pg.evaluate("b => window.__fake.put('juego/demo03', { bolas: b, gastado: 15 })", bol0); await pg.wait_for_timeout(300)
      await pg.screenshot(path=O + '1f_mascota.png', full_page=True)
      # cuatro días sin cuidarla: baja todo, avisa en la pestaña y se pone triste
      await pg.evaluate("ts => { const d = window.__fake.db()['juego/demo03']; window.__fake.put('juego/demo03', { tama: { gato: Object.assign({}, d.tama.gato, { ts }) } }); }", 1793120400000 - 4 * 864e5); await pg.wait_for_timeout(400)
      dot = await pg.locator('.nav [data-v="yo"] .ndot').count(); triste = await pg.locator('.tm-pet.triste').count(); print('tras 4 días sin cuidarla: aviso en la pestaña', bool(dot), '· triste', bool(triste), '·', ' '.join((await pg.text_content('.tbs')).split()))
      if not dot or not triste: errs.append('la mascota no se resiente si no la cuidas')
      await pg.screenshot(path=O + '1g_mascota_descuidada.png', full_page=True)
      await pg.click('.nav [data-v="hoy"]'); await pg.wait_for_timeout(300)
      # 2. el reto: liga
      await pg.click('.nav [data-v="reto"]'); await pg.wait_for_timeout(500); await pg.screenshot(path=O + '2_reto_liga.png', full_page=True)
      print('liga:', await pg.locator('.pd:not(.vacio)').count(), 'en el podio ·', await pg.locator('.lg-rows li').count(), 'en la tabla')
      h1 = await pg.text_content('.rt-hero h1'); print('juego de hoy (27 oct):', h1, '·', ' '.join((await pg.text_content('.rt-desc') or '').split()))
      if 'penaltis' not in h1: errs.append('no rota el juego del día')
      # 2b. sin contestar lo de hoy no se puede jugar
      await pg.evaluate("window.__fake.put('registros/demo03/dias/2026-10-27', { antes: null, partidos: {}, diario: null })"); await pg.wait_for_timeout(400)
      g = await pg.locator('.rt-gate').count(); dis = await pg.locator('.rt-play[disabled]').count(); print('sin contestar:', 'bloqueado' if g and dis else 'NO bloquea', '·', ' '.join((await pg.text_content('.rt-gate') or '').split()) if g else '')
      if not (g and dis): errs.append('deja jugar sin contestar lo de hoy')
      await pg.screenshot(path=O + '2b_sin_contestar.png')
      await pg.evaluate("window.__fake.put('registros/demo03/dias/2026-10-27', " + json.dumps({'antes': seed_reto()['registros/demo03/dias/2026-10-27']['antes'], 'partidos': {}, 'diario': seed_reto()['registros/demo03/dias/2026-10-27']['diario']}) + ")"); await pg.wait_for_timeout(400)
      ok = await pg.locator('.rt-play[data-a="jugar"]:not([disabled])').count(); print('día de partido, sin el antes del partido pero con el entreno y el diario: puede jugar', bool(ok))
      if not ok: errs.append('el partido de otras bloquea el juego')
      # 3. una partida (hoy, penaltis: se tira con la flecha arriba)
      await pg.click('.rt-play'); await partida()
      j = await db('juego/demo03'); print('tras la partida:', j.get('dias'), 'bolas', j.get('bolas'), 'partidas', j.get('partidas'), 'premios', j.get('premios'), 'misiones', j.get('mis'))
      if not j.get('premios'): errs.append('no da el premio diario')
      if '2026-10-27' not in (j.get('dias') or {}) or not j.get('partidas'): errs.append('no se guarda la partida')
      print('récords', j.get('recs'))
      await pg.screenshot(path=O + '3_resultado.png', full_page=True)
      # 4. jugar el duelo pendiente
      await pg.click('[data-a="jugarduelo"][data-id="dprueba1"]'); await partida()
      d = await db('duelos/dprueba1'); print('duelo pendiente:', d.get('pa'), '-', d.get('pb'))
      # sin límite y todas dan monedas
      for v in (1, 2):
        b0 = (await db('juego/demo03')).get('bolas') or 0; await pg.click('[data-a="cerrarres"]') if await pg.locator('[data-a="cerrarres"]').count() else None; await pg.wait_for_timeout(200)
        await pg.click('.rt-play'); await partida(); j = await db('juego/demo03'); print('otra partida más:', 'bolas', b0, '→', j.get('bolas'), '· partidas', j.get('partidas'))
      if await pg.locator('.rt-play[disabled]').count(): errs.append('limita las partidas')
      await pg.screenshot(path=O + '4b_sin_limite.png', full_page=True)
      if d.get('pb') is None: errs.append('no se guarda el duelo')
      await pg.screenshot(path=O + '4_duelo.png', full_page=True)
      # 5. retar a Carlos
      await pg.click('[data-a="rtab"][data-k="duelos"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O + '5_duelos.png', full_page=True)
      await pg.click(f'[data-a="retar"][data-u="{DT["uid"]}"]') if await pg.locator(f'[data-a="retar"][data-u="{DT["uid"]}"]').count() else print('Carlos todavía no ha entrado: no sale para retarle')
      # 6. tienda
      await pg.evaluate("window.__fake.put('juego/demo03', { bolas: 500 })"); await pg.wait_for_timeout(300)
      await pg.click('.nav [data-v="yo"]'); await pg.wait_for_timeout(300); await pg.click('[data-ytab="tienda"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-a="ttab"][data-k="personaje"]'); await pg.wait_for_timeout(200)
      await pg.click('[data-a="comprar"][data-c="gafas"][data-v="prescription02"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-a="ponerj"][data-c="gafas"][data-v="prescription02"]'); await pg.wait_for_timeout(400)
      await pg.click('[data-a="ttab"][data-k="estelas"]'); await pg.wait_for_timeout(200)
      await pg.click('[data-a="comprar"][data-c="estela"][data-v="oro"]'); await pg.wait_for_timeout(300); await pg.click('[data-a="ponerj"][data-c="estela"][data-v="oro"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-a="ttab"][data-k="mascotas"]'); await pg.wait_for_timeout(200); await pg.evaluate("window.__fake.put('juego/demo03', { bolas: 2500 })"); await pg.wait_for_timeout(300)
      await pg.screenshot(path=O + '6a_cofres.png', full_page=True)
      await pg.click('[data-a="abrircofre"][data-k="oro"]'); await pg.wait_for_timeout(700); await pg.screenshot(path=O + '6c_cofre_abriendo.png')
      await pg.wait_for_timeout(1500); await pg.screenshot(path=O + '6d_cofre_sale.png')
      if await pg.locator('[data-cf="poner"]').count(): await pg.click('[data-cf="poner"]')
      else: await pg.click('[data-cf="cerrar"]')
      await pg.wait_for_timeout(400); j3 = await db('juego/demo03')
      # cofre de Halloween: solo trae mascotas de Halloween y no toca las garantías
      await pg.evaluate("window.__fake.put('juego/demo03', { bolas: 6000 })"); await pg.wait_for_timeout(300)
      hw = await pg.locator('[data-a="abrircofre"][data-k="halloween"]').count(); print('cofre de Halloween a la vista:', hw)
      if not hw: errs.append('no sale el cofre de Halloween')
      else:
        sin0 = (await db('juego/demo03')).get('sinEp')
        await pg.click('[data-a="abrircofre"][data-k="halloween"]'); await pg.wait_for_timeout(2200); await pg.screenshot(path=O + '6e_halloween.png')
        await pg.click('[data-cf="cerrar"]') if await pg.locator('[data-cf="cerrar"]').count() else None; await pg.wait_for_timeout(300)
        jh = await db('juego/demo03'); hwp = [x for x in jh.get('compras', []) if x.split('|')[-1] in ('calabaza', 'murcielago', 'arana', 'fantasma', 'gatobrujo', 'momia', 'vampiro', 'reycalabaza')]
        print('del cofre de Halloween:', hwp, '· garantía sin tocar:', jh.get('sinEp') == sin0)
        if not hwp or jh.get('sinEp') != sin0: errs.append('el cofre de Halloween no va bien')
      print('cofre:', j3.get('cofres'), [x for x in j3.get('compras', []) if x.startswith('mascota|')], 'puesta', j3.get('mascota'), 'ultima', j3.get('ultima'))
      if j3.get('cofres') != 1 or not any(x.startswith('mascota|') for x in j3.get('compras', [])) or not j3.get('mascota'): errs.append('no se abre el cofre')
      await pg.screenshot(path=O + '6b_mascotas.png', full_page=True)
      await pg.click('[data-a="ttab"][data-k="personaje"]'); await pg.wait_for_timeout(200)
      jg, ju = await db('juego/demo03'), await db('jugadoras/demo03'); print('tienda:', jg.get('compras'), 'gastado', jg.get('gastado'), '| gafas puestas:', ju['av'].get('gafas'), '| estela', jg.get('estela'))
      if ju['av'].get('gafas') != 'prescription02' or jg.get('estela') != 'oro': errs.append('no se compra o no se pone lo de la tienda')
      await pg.screenshot(path=O + '6_tienda.png', full_page=True)
      # 6b. los otros juegos se cargan y terminan bien
      for m in ('portera', 'patina'):
        await pg.evaluate("m => SMBJuego.jugar({ modo: m, seed: 7, titulo: m, onEnd: r => { window.__rp = r; } })", m); await partida(); rp = await pg.evaluate('window.__rp'); print(m + ':', rp)
        if not rp or rp.get('puntos') is None: errs.append('el juego ' + m + ' no acaba bien')
      # 7. la DT entra, juega y reta a Ana
      await pg.click('.nav [data-v="yo"]'); await pg.wait_for_timeout(200); await pg.click('[data-v2="datos"]'); await pg.wait_for_timeout(200); await pg.click('[data-a="out"]'); await pg.wait_for_timeout(500)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-a="google"]'); await pg.wait_for_timeout(900)
      await pg.click('.nav [data-av="reto"]'); await pg.wait_for_timeout(500); await pg.screenshot(path=O + '7_dt_reto.png', full_page=True)
      await pg.click('[data-a="editavdt"]'); await pg.wait_for_timeout(300); await pg.click('[data-avk="gafas"][data-avv="kurt"]'); await pg.click('[data-avk="barba"][data-avv="beardMedium"]'); await pg.wait_for_timeout(200); await pg.screenshot(path=O + '7b_dt_personaje.png', full_page=True)
      await pg.click('[data-a="saveav"]'); await pg.wait_for_timeout(400)
      jd = await db('juego/' + DT['uid']); print('personaje de la DT:', (jd or {}).get('av', {}).get('gafas'), (jd or {}).get('av', {}).get('barba'))
      if (jd or {}).get('av', {}).get('barba') != 'beardMedium': errs.append('la DT no puede ponerse barba')
      if (jd or {}).get('av', {}).get('gafas') != 'kurt': errs.append('la DT no puede cambiar su personaje')
      await pg.click('.rt-play'); await partida(teclas=False)
      await pg.click('[data-a="rtab"][data-k="duelos"]'); await pg.wait_for_timeout(300); await pg.click('[data-a="retar"][data-u="demo03"]'); await partida(teclas=False)
      ds = [v for k, v in (await pg.evaluate("window.__fake.db()")).items() if k.startswith('duelos/') and v.get('a') == DT['uid']]; print('duelo de Carlos a Ana:', [(x['pa'], x['pb']) for x in ds])
      if not ds or ds[0]['pa'] is None: errs.append('la DT no puede retar')
      await pg.screenshot(path=O + '8_dt_duelos.png', full_page=True)
      # 8. Ana ve que Carlos la ha retado
      await pg.click('[data-a="out"]'); await pg.wait_for_timeout(400)
      await pg.fill('#l-email', 'demo03@ejemplo.com'); await pg.fill('#l-pass', 'hockey1'); await pg.click('[data-a="in"]'); await pg.wait_for_timeout(1000)
      t = ' '.join((await pg.text_content('.rt-reto') or '').split()); print('Ana ve:', t[:80])
      if 'Carlos' not in t: errs.append('Ana no ve el reto de Carlos')
      # 9. borrar sus datos borra también lo del juego
      await pg.click('.nav [data-v="yo"]'); await pg.click('[data-v2="datos"]'); await pg.wait_for_timeout(200)
      await pg.click('[data-a="borrartodo"]'); await pg.click('[data-a="borrartodo"]'); await pg.wait_for_timeout(600)
      left = await pg.evaluate("Object.entries(window.__fake.db()).filter(([k, v]) => k === 'juego/demo03' || (k.startsWith('duelos/') && (v.a === 'demo03' || v.b === 'demo03'))).map(([k]) => k)"); print('queda del juego de Ana:', left)
      if left: errs.append('al borrar sus datos queda lo del juego')
      print('errs', errs); await b.close()
  finally: srv.terminate()
if __name__ == '__main__': asyncio.run(main())
