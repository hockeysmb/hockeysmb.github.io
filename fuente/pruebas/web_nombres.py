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
      await pg.clock.set_system_time(__import__('datetime').datetime(2026,10,16,12,0,0))
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
      import datetime
      O2=SHOTS+'lg/shots/'
      async def nav(z): await pg.click(f'[data-nav="{z}"]'); await pg.wait_for_timeout(400)
      async def tab(k): await pg.click(f'[data-lgtab="{k}"]'); await pg.wait_for_timeout(400)
      await nav('liga'); await pg.wait_for_timeout(600)
      await pg.screenshot(path=O2+'0_pre.png', full_page=True)
      print('pre:', (await pg.text_content('#v-liga .vhead .sub')))
      await pg.clock.set_system_time(datetime.datetime(2026,10,19,15,0,0)); await tab('hoy')
      print('lunes:', (await pg.text_content('#v-liga .vhead .sub')))
      await pg.screenshot(path=O2+'1_hoy.png', full_page=True)
      await tab('calendario'); await pg.screenshot(path=O2+'2_cal.png', full_page=True)
      await pg.clock.set_system_time(datetime.datetime(2026,10,21,10,0,0)); await tab('hoy'); await pg.wait_for_timeout(600)
      print('miércoles:', (await pg.text_content('#v-liga .vhead .sub')))
      await pg.screenshot(path=O2+'3_hoy_fin.png', full_page=True)
      await tab('calendario'); await pg.screenshot(path=O2+'4_cal_fin.png', full_page=True)
      await tab('clasificacion'); await pg.screenshot(path=O2+'5_clas.png', full_page=True)
      res1=await pg.evaluate("[...document.querySelectorAll('.lg-tbl tbody tr')].map(r=>r.innerText.replace(/\\s+/g,' '))"); print('tabla Lucas', res1)
      g=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-personaje'))"); print('log liga', [x for x in g['log'] if str(x['key']).startswith('lg')], 'paid', g.get('lgPaid'))
      await tab('calendario'); await pg.click('[data-lg="ver"] >> nth=0'); await pg.wait_for_timeout(500); await pg.screenshot(path=O2+'6_ver.png')
      await pg.keyboard.press('Escape')
      prof=await pg.evaluate("m=>{const p=window.__fake.db()['profiles/'+m]; const j=JSON.parse(p.j); return [j.lgJoin, Object.keys(j.lgs||{})]}", await pg.evaluate("window.SMB_CLOUD.mk.me()")); print('perfil Lucas', prof)
      # el DT entra y congela
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1000)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1500)
      await nav('liga'); await tab('clasificacion'); await pg.wait_for_timeout(1500)
      res2=await pg.evaluate("[...document.querySelectorAll('.lg-tbl tbody tr')].map(r=>r.innerText.replace(/\\s+/g,' '))"); print('tabla DT', res2)
      fz=await pg.evaluate("(()=>{const st=window.__fake.db()['club/state']; const j=JSON.parse(st.j); return j.lg? {seasons:j.lg.seasons, res:Object.fromEntries(Object.entries(j.lg.res).map(([s,v])=>[s,Object.fromEntries(Object.entries(v).map(([k,g])=>[k,g.map(x=>x.a+' '+x.d.ga+'-'+x.d.gb+' '+x.b)]))]))}:null})()"); print('congelado', fz)
      # la DT cambia el nombre de Lucas
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(400)
      await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
      await pg.click('[data-cl="ren"][data-name="Lucas"]'); await pg.wait_for_timeout(200)
      await pg.screenshot(path=SHOTS+'rn/shots/0_ren.png', full_page=False)
      await pg.fill('.cl-ren input','Lucas Pérez'); await pg.click('[data-cl="ren-ok"]'); await pg.wait_for_timeout(1500)
      st=await pg.evaluate("(()=>{const j=JSON.parse(window.__fake.db()['club/state'].j); return [j.coaches.map(c=>[c.name,!!c.nameSet]), j.lg.seasons, JSON.stringify(j).includes('\"Lucas\"')]})()"); print('club tras cambio', st)
      await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
      print('fila', await pg.evaluate("[...document.querySelectorAll('.dt-row b')].map(x=>x.textContent)"))
      await nav('liga'); await tab('clasificacion'); await pg.wait_for_timeout(600)
      print('tabla DT tras cambio', await pg.evaluate("[...document.querySelectorAll('.lg-tbl tbody tr')].map(r=>r.innerText.replace(/\\s+/g,' '))"))
      # Lucas entra y adopta el nombre
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1000)
      await pg.fill('#cl-email','lucas@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="in"]'); await pg.wait_for_timeout(2500)
      print('autor Lucas', await pg.evaluate("localStorage.getItem('smb-banco-autor')"))
      print('mine author', await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-mis-versiones')||'[]').map(t=>t.author)"))
      sh=await pg.evaluate("Object.entries(window.__fake.db()).filter(([k])=>k.startsWith('shared/')).map(([k,v])=>v.autor)"); print('shared autores', sh)
      prof=await pg.evaluate("m=>window.__fake.db()['profiles/'+m].name", await pg.evaluate("window.SMB_CLOUD.mk.me()")); print('perfil', prof)
      await nav('liga'); await tab('clasificacion'); await pg.wait_for_timeout(600)
      print('tabla Lucas tras cambio', await pg.evaluate("[...document.querySelectorAll('.lg-tbl tbody tr')].map(r=>r.innerText.replace(/\\s+/g,' '))"))
      # Lucas se lo cambia él: la DT lo propaga al abrir
      await pg.evaluate("(()=>{const i=document.getElementById('pf-name')||document.getElementById('vest-name'); return !!i})()")
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.wait_for_timeout(300)
      ok=await pg.query_selector('#pf-name'); print('pf-name visible', bool(ok))
      await pg.fill('#pf-name','Lucas P.'); await pg.click('[data-pf="rename"]'); await pg.wait_for_timeout(1500)
      print('mine tras cambio propio', await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-mis-versiones')||'[]').map(t=>t.author)"))
      await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1000)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(2500)
      st=await pg.evaluate("(()=>{const j=JSON.parse(window.__fake.db()['club/state'].j); return [j.coaches.map(c=>c.name), j.lg.seasons]})()"); print('club tras cambio propio', st)
      print('errs',errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
