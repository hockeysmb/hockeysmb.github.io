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
O=SHOTS+'lav/after/'
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
      O2=SHOTS+'club/shots/'
      async def nav(z): await pg.click(f'[data-nav="{z}"]'); await pg.wait_for_timeout(300)
      ks=await pg.evaluate("Object.keys(window.__fake.db()).filter(k=>k.startsWith('profiles/'))"); print('profiles', ks)
      me=await pg.evaluate("window.SMB_CLOUD.mk.me()"); print('me', me)
      await nav('liga'); await pg.wait_for_timeout(500)
      await pg.click('.club-t [data-club="plantilla"]'); await pg.wait_for_timeout(300)
      # poner a la venta el primero de pista
      await pg.click('.pl-list >> nth=1 >> [data-clsell] >> nth=0'); await pg.wait_for_timeout(200)
      await pg.fill('#m-price','77'); await pg.click('#m-list'); await pg.wait_for_timeout(1200)
      g=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-personaje')).club"); pid=g['venta'][0]['pid']; print('venta', g['venta'])
      prof=await pg.evaluate("m=>JSON.parse(window.__fake.db()['profiles/'+m].j).club", me); print('perfil club venta', [v['price'] for v in prof['venta']], prof['atk'], prof['def'])
      # el DT hace una oferta por ese jugador
      DTU='dtuid000000000000000000000001'
      await pg.evaluate("a=>window.__fake.put('shared/'+a.dt+'_of_o1',{uid:a.dt,k:'of',autor:'Carlos Manzano',ts:Date.now(),j:JSON.stringify({to:a.me,pid:a.pid,price:90,p:a.p})})", {'dt':DTU,'me':me,'pid':pid,'p':[x for x in g['squad'] if x['id']==pid][0]})
      await pg.wait_for_timeout(800)
      await pg.click('[data-cltab="ofertas"]'); await pg.wait_for_timeout(300)
      await pg.screenshot(path=O2+'web_ofertas.png')
      bal0=await pg.evaluate("document.querySelector('.club-in').innerText.length")
      await pg.click('[data-clacc]'); await pg.wait_for_timeout(800)
      print('aceptar:', await pg.text_content('.club-in .msg'))
      ac=await pg.evaluate("Object.entries(window.__fake.db()).filter(([k,v])=>k.startsWith('shared/')&&v.k==='ac').map(([k,v])=>JSON.parse(v.j))"); print('ac docs', ac)
      g=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-personaje'))"); print('tiene jugador?', any(x['id']==pid for x in g['club']['squad']), 'log', g['log'][-1])
      # comprar al DT: inyectar venta en su perfil
      dp=await pg.evaluate("d=>window.__fake.db()['profiles/'+d]", DTU)
      import json as J
      pj=J.loads(dp['j']) if dp and dp.get('j') else {}
      sp={'id':'pl-dt1','n':'Gael Rebote','d':'9','pos':'jug','a':{'pat':70,'tec':72,'dis':68,'def':60,'ref':10},'pot':80,'forma':90}
      pj['club']={'atk':60,'def':55,'xi':[],'venta':[{'pid':'pl-dt1','price':60,'p':sp}]}
      await pg.evaluate("a=>window.__fake.put('profiles/'+a.d,Object.assign({},a.dp,{j:a.j}))", {'d':DTU,'dp':dp or {'name':'Carlos Manzano'},'j':J.dumps(pj)})
      await pg.wait_for_timeout(800)
      await pg.click('[data-cltab="mercado"]'); await pg.wait_for_timeout(300)
      await pg.screenshot(path=O2+'web_mercado.png', full_page=True)
      await pg.click('[data-cloffer]'); await pg.wait_for_timeout(200); await pg.click('#m-ok'); await pg.wait_for_timeout(800)
      print('oferta:', await pg.text_content('.club-in .msg'))
      of=await pg.evaluate("Object.entries(window.__fake.db()).filter(([k,v])=>k.startsWith('shared/')&&v.k==='of'&&v.uid!=='dtuid000000000000000000000001').map(([k,v])=>[k,JSON.parse(v.j).price])"); print('mis ofertas', of)
      # el DT acepta
      await pg.evaluate("a=>window.__fake.put('shared/'+a.dt+'_ac_x1',{uid:a.dt,k:'ac',autor:'Carlos Manzano',ts:Date.now(),j:JSON.stringify({of:a.of,to:a.me,ok:true})})", {'dt':DTU,'me':me,'of':of[0][0].replace('shared/','')})
      await pg.wait_for_timeout(1200)
      g=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-personaje'))"); print('fichado?', [x['n'] for x in g['club']['squad'] if x['n']=='Gael Rebote'], 'of pendientes', list(g['club']['of'].keys()))
      left=await pg.evaluate("Object.keys(window.__fake.db()).filter(k=>k.includes('_of_'))"); print('of docs quedan', left)
      await pg.click('[data-club="x"]'); await pg.wait_for_timeout(300)
      # amistoso contra Carlos
      await pg.click('[data-lgtab="amistosos"]'); await pg.wait_for_timeout(300)
      await pg.click('.am-rival >> nth=0'); await pg.wait_for_timeout(1500)
      if await pg.query_selector('[data-lv="vspiz"]'): await pg.click('[data-lv="vspiz"]'); await pg.wait_for_timeout(800)
      for k in range(4):
        if await pg.query_selector('[data-lv-o]:not([disabled])'): await pg.click('[data-lv-o]:not([disabled]) >> nth=0'); await pg.wait_for_timeout(300)
      if await pg.query_selector('[data-lv="skip"]'): await pg.click('[data-lv="skip"]'); await pg.wait_for_timeout(1500)
      r=await pg.evaluate("(()=>{const g=JSON.parse(localStorage.getItem('smb-banco-personaje')); const a=(g.amis||[]).slice(-1)[0]; return a? {sqa:a.r.a.sq, sqb:a.r.b.sq&&{atk:a.r.b.sq.atk,def:a.r.b.sq.def}, pw:a.r.P.flatMap(p=>p.pw.map(x=>x.t)).filter(t=>/lantilla/.test(t))}:null})()"); print('partido', r)
      print('errs',errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
