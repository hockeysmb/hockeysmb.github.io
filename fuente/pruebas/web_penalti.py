import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json, base64, subprocess, sys
from playwright.async_api import async_playwright
W=int(sys.argv[1]) if len(sys.argv)>1 else 390
LIVE=BANK
bank=json.load(open(LIVE)); T=bank['tasks']
mine=[{**T[5],'id':'mine-abc','title':'Rueda de Lucas','source':'mine','author':'Lucas'}]
ses=[{'id':'ses-l1','kind':'','equipo':'Benjamín C','fecha':'2026-10-08','entrenador':'Lucas','obj':{},'fundamentos':['Pase'],'fase':'ataque','reflexion':'','bloques':[{'task':T[i],'min':'15'} for i in range(4)]}]
game={'owned':['head:gorra'],'spent':0,'log':[{'key':'k1','pts':40,'why':'x','date':'2026-10-06'}],'poder':'garra','av':{'v':2,'skin':'edb98a','top':'curly','head':'gorra','bg':'pista','kit':'smb1','dorsal':'9'}}
code='SMB2:'+base64.b64encode(json.dumps({'v':2,'autor':'Lucas','mine':mine,'sessions':ses,'game':game,'envios':[]}).encode()).decode()
CFG="window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT={'uid':'dtuid000000000000000000000001','email':'dt@smb.es','name':'Carlos Manzano'}
O=SHOTS+'fx/shots/'
async def main():
  srv=subprocess.Popen(['python3','-m','http.server','8766','-d',WEB],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b=await p.chromium.launch(); errs=[]
      ctx=await b.new_context(viewport={'width':W,'height':860})
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.add_init_script(path=FAKEFB)
      pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
      U='http://localhost:8766/'
      await pg.goto(U); await pg.wait_for_timeout(600)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(400)
      await pg.set_input_files('#cl-bankfile', LIVE); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(800)
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1000)
      await pg.fill('#cl-email','lucas@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="up"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("window.__fake.verify('lucas@smb.es')"); await pg.click('[data-cl="verified"]'); await pg.wait_for_timeout(600)
      await pg.fill('#cl-name','Lucas'); await pg.click('[data-cl="name"]'); await pg.wait_for_timeout(300)
      await pg.click('#cl-gate [data-cl="out"]'); await pg.wait_for_timeout(1000)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(900)
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-cl="grant"]'); await pg.wait_for_timeout(600)
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1000)
      await pg.fill('#cl-email','lucas@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="in"]'); await pg.wait_for_timeout(900)
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('.dt-more summary') if await pg.query_selector('.dt-more summary') else None; await pg.click('[data-pf="restore"]')
      await pg.fill('#m-in', code); await pg.click('#m-go'); await pg.wait_for_timeout(300); await pg.click('#m-close'); await pg.wait_for_timeout(1200)
      await pg.keyboard.press('Escape')
      async def shot(n, full=False): await pg.screenshot(path=f'{O}{W}_{n}.png', full_page=full)
      async def nav(z): await pg.click(f'[data-nav="{z}"]'); await pg.wait_for_timeout(300)
      async def addc(n):
        await pg.evaluate("n=>{const k=Object.keys(localStorage).find(k=>{try{const g=JSON.parse(localStorage.getItem(k));return g&&g.log&&'spent' in g}catch(e){return false}}); const g=JSON.parse(localStorage.getItem(k)); g.cofres=Object.assign({n:0,keys:[]},g.cofres||{}); g.cofres.n=n; localStorage.setItem(k,JSON.stringify(g)); SMB.reloadLocal();}", n)
      async def setg(js):
        await pg.evaluate("js=>{const k='smb-banco-personaje'; const g=JSON.parse(localStorage.getItem(k)); new Function('g',js)(g); localStorage.setItem(k,JSON.stringify(g)); SMB.reloadLocal();}", js)
      await setg("g.cofres=Object.assign({n:0,keys:[]},g.cofres||{}); g.cofres.n=0; g.penAt=Date.now()-3600e3*7.5; g.log.push({key:'rich',pts:200,why:'x',date:'2026-10-10'})")
      await nav('inicio'); await pg.wait_for_timeout(400); await pg.screenshot(path=f'{O}{W}_w_home.png', clip={'x':0,'y':0,'width':W,'height':420})
      await nav('liga'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'{O}{W}_w_liga.png', clip={'x':0,'y':0,'width':W,'height':520})
      await pg.click('[data-lgtab="equipo"]'); await pg.wait_for_timeout(300); await pg.click('#v-liga [data-cofre]'); await pg.wait_for_timeout(700); await shot('w_cofre')
      bal0=await pg.evaluate("document.querySelector('.cf-hint') && document.querySelector('.cf-hint').textContent")
      print('hint', bal0)
      await pg.click('[data-cf="pagar"]'); await pg.wait_for_timeout(500); await shot('w_pagar')
      dis=await pg.evaluate("[...document.querySelectorAll('.cf-z')].map(z=>z.disabled)"); print('zones disabled', dis)
      await pg.click('.cf-z.cf-bd'); await pg.wait_for_timeout(2600); await shot('w_res')
      await pg.click('[data-cf="x"]'); await pg.wait_for_timeout(400)
      await setg("g.penAt=0")
      await nav('inicio'); await pg.wait_for_timeout(400); await pg.screenshot(path=f'{O}{W}_w_home_free.png', clip={'x':0,'y':0,'width':W,'height':420})
      g=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-personaje'))"); print('spent', g.get('spent'), 'penAt', g.get('penAt'))
      await nav('vestuario') if await pg.query_selector('[data-nav="vestuario"]') else None
      await pg.click('#me-btn'); await pg.wait_for_timeout(300)
      if await pg.query_selector('[data-vtab="personalizar"]'): await pg.click('[data-vtab="personalizar"]')
      await pg.click('[data-vcat="extras"]'); await pg.wait_for_timeout(400); await shot('w_extras', True)
      print('errs',errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
