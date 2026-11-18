import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Auditoría de accesibilidad y estética del módulo Equipos: cada pantalla en claro y oscuro, con medidas
# (botones pequeños, letra pequeña, contraste) y axe-core si está instalado. No es una prueba: es un informe.
# Uso: python3 fuente/pruebas/auditoria_equipos.py [ancho] [carpeta] [ruta de axe.min.js]
import asyncio, json, subprocess
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
O = SHOTS + (sys.argv[2] if len(sys.argv) > 2 else 'auditoria') + '/'; os.makedirs(O, exist_ok=True)
AXE = sys.argv[3] if len(sys.argv) > 3 else ''
CFG = "window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT = {'uid': 'dtuid000000000000000000000001', 'email': 'dt@smb.es', 'name': 'Carlos Manzano', 'verified': True}
NOMBRES = ['Ada Ruiz', 'Bea Soto', 'Carla Gil', 'Dani Prieto', 'Eloy Mora', 'Fran León', 'Gael Ríos', 'Hugo Vidal', 'Iker Sanz', 'Jon Mena', 'Leo Cano']
PLANT = {'Benjamín D': [{'n': n, 'a': '2017', **({'p': 1} if i == 0 else {})} for i, n in enumerate(NOMBRES)],
         'Benjamín A': [{'n': 'Mía Ortega', 'a': '2016'}, {'n': 'Noa Varela', 'a': '2016'}]}
MEDIR = r"""(raiz) => {
  const R = document.querySelector(raiz) || document.body, out = { peq: [], letra: [], contraste: [] };
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('details:not([open]) > :not(summary)'); };
  const rgb = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map(x => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const fondo = e => { let base = null, capas = []; for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; let c = rgb(s.backgroundColor); if (/gradient/.test(s.backgroundImage)) { const m = s.backgroundImage.match(/rgba?\([^)]+\)/); if (m) c = rgb(m[0]); } if (c && c.a > 0) { capas.push(c); if (c.a >= 1) { base = c; break; } } } if (!base) base = { r: 255, g: 255, b: 255, a: 1 }; let r = base; for (let i = capas.length - 2; i >= 0; i--) { const c = capas[i]; r = { r: c.r * c.a + r.r * (1 - c.a), g: c.g * c.a + r.g * (1 - c.a), b: c.b * c.a + r.b * (1 - c.a), a: 1 }; } if (capas.length === 1 && capas[0].a < 1) { const c = capas[0]; r = { r: c.r * c.a + 255 * (1 - c.a), g: c.g * c.a + 255 * (1 - c.a), b: c.b * c.a + 255 * (1 - c.a) }; } return r; };
  const nombre = e => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' «' + (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '»');
  R.querySelectorAll('button, a[href], summary, input, select, textarea, [role=tab], [tabindex]').forEach(e => {
    if (!vis(e)) return; const r = e.getBoundingClientRect();
    if (e.tagName === 'A' && getComputedStyle(e).display === 'inline') return;   // enlaces dentro de un texto
    if (r.height < 40 || (r.width < 40 && e.tagName !== 'INPUT')) out.peq.push(nombre(e) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
  });
  R.querySelectorAll('*').forEach(e => {
    if (!vis(e)) return; const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!t) return; const s = getComputedStyle(e), fs = parseFloat(s.fontSize);
    if (fs < 12) out.letra.push(nombre(e) + ` ${fs}px`);
    const c = rgb(s.color), f = fondo(e); if (!c || !f) return;
    const cc = { r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a) };
    const L1 = lum(cc), L2 = lum(f), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const grande = fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 700), min = grande ? 3 : 4.5;
    if (ratio < min) out.contraste.push(nombre(e) + ` ${ratio.toFixed(2)}:1`);
  });
  out.alto = R.scrollHeight;
  return out;
}"""
async def main():
  srv = subprocess.Popen(['python3', '-m', 'http.server', '8789', '-d', WEB], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  informe = {}
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(); errs = []
      for tema in ('light', 'dark'):
        ctx = await b.new_context(viewport={'width': W, 'height': 860}, color_scheme=tema)
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
        await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
        await ctx.add_init_script(path=FAKEFB)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.set_system_time(__import__('datetime').datetime(2026, 11, 18, 10, 0, 0))
        await pg.goto('http://localhost:8789/'); await pg.wait_for_timeout(600)
        await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1200)
        await pg.set_input_files('#cl-bankfile', BANK); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
        await pg.evaluate("p=>window.SMB.saveBankExtra({plant:p, segOn:'2026-11-18'},'ok')", PLANT); await pg.wait_for_timeout(800)
        await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(300)
        await pg.locator('[data-dtsub="equipos"]:visible').first.click(); await pg.wait_for_timeout(400)
        await pg.locator('[data-pl="migrar"]').first.click(); await pg.wait_for_timeout(400)
        await pg.click('#m-ok'); await pg.wait_for_timeout(2000)
        pids = await pg.evaluate("(window.SMB.getBank && 0) || null")
        # dos fichas de partido reales de Benjamín D (las dos últimas jugadas)
        await pg.evaluate("""async (N) => { const P = (await (await fetch('partidos.json')).json()).partidos.filter(p => p.eq === 'Benjamín D' && p.res).slice(-2);
          for (const [i, p] of P.entries()) await window.SMB_CLOUD.ficha.save(p.id, {pid: p.id, eq: p.eq, fecha: p.fecha, rival: p.rival, conv: N.slice(0, 9 - i), unoa: {[N[1]]: 'bien', [N[2]]: 'mej'}, ideas: [], corr: [], preg: [], salio: ''}); }""", NOMBRES)
        await pg.wait_for_timeout(1000)
        async def mide(n, raiz='#espacio'):
          await pg.wait_for_timeout(400)
          m = await pg.evaluate(MEDIR, raiz)
          if AXE:
            await pg.add_script_tag(path=AXE)
            r = await pg.evaluate("""async (raiz) => { const r = await axe.run(document.querySelector(raiz) || document, { runOnly: ['wcag2a', 'wcag2aa'] }); return r.violations.map(v => v.id + ' ×' + v.nodes.length + ' · ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')); }""", raiz)
            m['axe'] = r
          h = await pg.evaluate(f"(document.querySelector('{raiz}') || document.body).scrollHeight")
          await pg.set_viewport_size({'width': W, 'height': min(5000, max(860, h + 60))}); await pg.wait_for_timeout(250)
          await pg.screenshot(path=f'{O}{W}_{tema}_{n}.png'); await pg.set_viewport_size({'width': W, 'height': 860})
          informe[f'{tema} {n}'] = m
        await pg.click('[data-nav="equipos"]'); await pg.wait_for_timeout(600)
        await mide('01lista', 'main')
        await pg.evaluate("document.querySelectorAll('.eq-grupo').forEach(d=>d.open=true)"); await pg.wait_for_timeout(150)
        await pg.locator('[data-equipo="Benjamín D"]:visible').first.click(); await pg.wait_for_timeout(800)
        await mide('02resumen')
        for k, n in (('plant', '03plantilla'), ('part', '04partidos'), ('entr', '05entrenos')):
          await pg.locator(f'#espacio [data-eqsub="{k}"]').first.click(); await pg.wait_for_timeout(500); await mide(n)
        await pg.locator('#espacio [data-eqsub="part"]').first.click(); await pg.wait_for_timeout(400)
        await pg.locator('#espacio .pt-caja [data-fpart]').first.click(); await pg.wait_for_timeout(700)
        for i in range(4):
          await pg.click(f'[data-fpaso="{i}"]'); await pg.wait_for_timeout(250); await mide(f'06ficha{i}')
        await pg.locator('#espacio [data-fvolver]').first.click(); await pg.wait_for_timeout(500)
        await pg.locator('#espacio [data-eqsub="plant"]').first.click(); await pg.wait_for_timeout(400)
        await pg.locator('#espacio .jg-row', has_text='Bea Soto').first.click(); await pg.wait_for_timeout(700)
        await pg.locator('#espacio [data-ptab="evaluar"]').first.click(); await pg.wait_for_timeout(300)
        await mide('07evaluar')
        await pg.click('[data-sgd="0"][data-v="3"]'); await pg.click('[data-sge="0"][data-v="2"]'); await pg.click('[data-sgr="patin"][data-v="2"]'); await pg.click('[data-sgr="pase"][data-v="1"]')
        await pg.click('[data-sgguardar]'); await pg.wait_for_timeout(900)
        await pg.locator('#espacio .eq-tabs [data-ptab="obj"]').click(); await pg.wait_for_timeout(300)
        await pg.fill('#sg-objtxt', 'Pasar antes de que le cierren'); await pg.click('[data-sgobjnuevo]'); await pg.wait_for_timeout(700)
        await pg.locator('#espacio .eq-tabs [data-ptab="hist"]').click(); await pg.wait_for_timeout(300)
        await pg.fill('#sg-nota', 'Pierde la bola cuando le presionan en la salida.'); await pg.click('[data-sgnota]'); await pg.wait_for_timeout(800)
        for k, n in (('resumen', '08perfil'), ('evol', '09evolucion'), ('obj', '10objetivos'), ('hist', '11historial')):
          await pg.locator(f'#espacio .eq-tabs [data-ptab="{k}"]').click(); await pg.wait_for_timeout(400); await mide(n)
        await ctx.close()
      await b.close()
  finally:
    srv.terminate()
  json.dump(informe, open(O + f'informe_{W}.json', 'w'), ensure_ascii=False, indent=1)
  for k, m in informe.items():
    print(f"{k:22} alto {m['alto']:5}  peq {len(m['peq']):2}  letra {len(m['letra']):2}  contraste {len(m['contraste']):2}  axe {len(m.get('axe', [])):2}")
  print('errs', errs)
asyncio.run(main())
