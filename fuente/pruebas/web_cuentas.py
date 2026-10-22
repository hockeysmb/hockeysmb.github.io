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
      # segunda cuenta de la misma persona
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1000)
      await pg.fill('#cl-email','lucas.otra@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="up"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("window.__fake.verify('lucas.otra@smb.es')"); await pg.click('[data-cl="verified"]'); await pg.wait_for_timeout(600)
      await pg.fill('#cl-name','Lucas'); await pg.click('[data-cl="name"]'); await pg.wait_for_timeout(300)
      await pg.click('#cl-gate [data-cl="out"]'); await pg.wait_for_timeout(1000)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1200)
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(400)
      tw=await pg.query_selector('.cl-twin'); print('aviso de cuenta repetida:', (await tw.text_content())[:90] if tw else None)
      if not tw: errs.append('sin aviso de repetida')
      await pg.click('[data-cl="hide"]'); await pg.wait_for_timeout(800)
      txt=await pg.inner_text('#dt-dyn')
      print('esperando tras descartar:', 'Esperando acceso' in txt, '| descartadas:', 'Cuentas descartadas (1)' in txt)
      if 'Esperando acceso' in txt or 'Cuentas descartadas (1)' not in txt: errs.append('descartar no funciona')
      await pg.click('details:has-text("Cuentas descartadas") summary'); await pg.click('[data-cl="unhide"]'); await pg.wait_for_timeout(800)
      print('recuperada:', 'Esperando acceso (1)' in await pg.inner_text('#dt-dyn'))
      print('errs',errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
