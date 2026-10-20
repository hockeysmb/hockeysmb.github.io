"""Revisión de que todo cabe: 12 tamaños (móviles en vertical y horizontal, tablets, ventanas de ordenador).
No es una prueba de correr.py: imprime lo que se sale de la pantalla y deja capturas en fuente/_capturas/vp/.
Uso: python3 fuente/construir_artifact.py && python3 fuente/pruebas/revisar_pantallas.py"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import asyncio, conf, json
from playwright.async_api import async_playwright
O=conf.SHOTS+'vp/'; os.makedirs(O, exist_ok=True)
VPS=[('se320',320,568,True),('and360',360,740,True),('iph390',390,844,True),('iph430',430,932,True),('land844',844,390,True),('land932',932,430,True),
     ('ipadP',768,1024,True),('ipadL',1180,820,True),('pcwin800',800,700,False),('pc1024',1024,640,False),('pc1366',1366,768,False),('pc1920',1920,1080,False)]
CHECK="""(()=>{const W=innerWidth,H=innerHeight,o=[];
 const sw=document.documentElement.scrollWidth; if(sw>W+1) o.push('scrollX '+sw+'>'+W);
 const wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return r.width>0&&r.right>W+2&&cs.position!=='fixed'&&!e.closest('[style*=overflow],.ses-steps,.stepper,.seg,.opts')&&cs.visibility!=='hidden'}).slice(0,3).map(e=>e.tagName+'.'+(e.className.baseVal??e.className)+' r='+Math.round(e.getBoundingClientRect().right));
 if(wide.length) o.push('fuera: '+wide.join(' | '));
 const cards=[...document.querySelectorAll('.ses-sec, .card, section')].filter(c=>c.offsetParent!==null); const sob=[]; cards.forEach(c=>{const r=c.getBoundingClientRect(); if(r.width<50) return; [...c.querySelectorAll('input,textarea,select,.btn,.ses-fields,.ses-grid')].forEach(e=>{const q=e.getBoundingClientRect(); if(q.width>0&&q.right>r.right+1&&!e.closest('.stepper,.seg,.opts,[class*=scroll]')) sob.push((e.className||e.tagName)+' '+Math.round(q.right)+'>'+Math.round(r.right))})}); if(sob.length) o.push('sobresale: '+[...new Set(sob)].slice(0,3).join(' | '));
 return o})()"""
BOARD="""(()=>{const W=innerWidth,H=innerHeight,o=[],R=s=>{const e=document.querySelector(s);return e&&e.offsetParent!==null?e.getBoundingClientRect():null};
 const c=R('#canvas'),bar=R('#bd-bar'),pan=R('#bd-panel'),top=R('#bd-top');
 for(const [n,r] of [['canvas',c],['bar',bar],['panel',pan],['top',top]]) if(r&&(r.left<-1||r.top<-1||r.right>W+1||r.bottom>H+1)) o.push(n+' fuera '+[r.left,r.top,r.right,r.bottom].map(Math.round));
 if(c){ // tamaño real de la pista dentro del svg
   const g=document.querySelector('#canvas').getBBox?null:null; o.push('pista '+Math.round(c.width)+'x'+Math.round(c.height)+' ('+Math.round(100*c.width*c.height/(W*H))+'% pantalla)')}
 if(bar&&c&&c.bottom>bar.top+1) o.push('pista bajo la barra');
 return o})()"""
async def run(p, name, W, H, mob):
  b=await p.chromium.launch()
  ctx=await b.new_context(viewport={'width':W,'height':H}, has_touch=mob, is_mobile=mob and W<1000, device_scale_factor=2 if mob else 1)
  await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
  await ctx.add_init_script('const OWNER=false;'+conf.MOCK_ART)
  pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
  await pg.goto(conf.ART_URL); await pg.wait_for_timeout(900)
  res={}
  async def shot(k):
    await pg.wait_for_timeout(250); res[k]=await pg.evaluate(CHECK); await pg.screenshot(path=f'{O}{name}_{k}.png')
  click = (lambda s: pg.tap(s)) if mob else (lambda s: pg.click(s))
  await shot('inicio')
  for nav in ('ejercicios','sesiones','liga'):
    await click(f'[data-nav="{nav}"]'); await shot(nav)
  async def tryc(sel, k):
    try:
      await pg.locator(sel).first.click(timeout=3000); await shot(k)
    except Exception as e: res[k]=['no se pudo: '+sel]
  await click('[data-nav="liga"]')
  for t in ('calendario','clasificacion','equipo','amistosos'): await tryc(f'[data-lgtab="{t}"]', 'liga_'+t)
  await tryc('.club-t [data-club="plantilla"], [data-club="plantilla"]', 'club')
  try: await pg.locator('[data-club="x"]').first.click(timeout=2000)
  except Exception: pass
  await tryc('#me-btn', 'perfil')
  await click('[data-nav="ejercicios"]'); await tryc('.task-card, .card[data-id], [data-open]', 'detalle')
  await pg.keyboard.press('Escape')
  await click('[data-nav="sesiones"]'); await click('#btn-new-ses'); await shot('ses0')
  await pg.fill('[data-f="equipo"]','Alevín B'); await click('[data-step="1"]'); await shot('ses1')
  await click('[data-create="0"]'); await pg.wait_for_timeout(300); await shot('ficha')
  await click('[data-bd="open"]'); await pg.wait_for_timeout(500); res['board']=await pg.evaluate(BOARD); await pg.screenshot(path=f'{O}{name}_board.png')
  if await pg.is_visible('[data-bdg="jug"]'):
    await click('[data-bdg="jug"]'); await pg.wait_for_timeout(300); res['sheet']=await pg.evaluate(BOARD); await pg.screenshot(path=f'{O}{name}_sheet.png')
  res['errs']=errs; await b.close(); return res
async def main():
  async with async_playwright() as p:
    for v in VPS:
      r=await run(p,*v)
      bad={k:x for k,x in r.items() if x}
      print(v[0], json.dumps(bad, ensure_ascii=False))
asyncio.run(main())
