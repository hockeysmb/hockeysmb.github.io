import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json, base64, subprocess, sys
from playwright.async_api import async_playwright
W=int(sys.argv[1]) if len(sys.argv)>1 else 1280
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
      O2=SHOTS+'rv/'; os.makedirs(O2, exist_ok=True)
      async def salir(): 
        await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1000)
      async def dt():
        await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1500)
        await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="revisar"]'); await pg.wait_for_timeout(500)
      async def lucas():
        await pg.fill('#cl-email','lucas@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="in"]'); await pg.wait_for_timeout(1500)
      st = lambda: pg.evaluate("JSON.parse(window.__fake.db()['club/state'].j)")
      # 1. la DT ve la propuesta de Lucas y la devuelve con una nota
      await salir(); await dt()
      first=await pg.text_content('.rv-row'); print('1ª de la cola:', ' '.join(first.split()))
      if 'Rueda de Lucas' not in first: errs.append('la propuesta no sale la primera')
      await pg.click('#rv-main [data-rv="note"]'); await pg.wait_for_timeout(200)
      sug=await pg.input_value('#rv-note-t'); print('nota sugerida:', sug.replace('\n',' | ')[:140])
      await pg.fill('#rv-note-t','Pon dos preguntas abiertas: ¿cuándo sueltas el pase? ¿qué miras antes?')
      await pg.screenshot(path=O2+'web_nota.png')
      await pg.click('#rv-main [data-rv="note-ok"]'); await pg.wait_for_timeout(1000)
      s=await st(); print('notas en el club:', [(n['tid'], n['autor']) for n in s.get('notas',[])])
      print('cola tras la nota:', await pg.locator('.rv-row').count(), '| esperando:', await pg.locator('.rv-wait').count())
      # 2. Lucas ve el aviso, abre el ejercicio y lo corrige
      await salir(); await lucas()
      await pg.click('[data-nav="inicio"]'); await pg.wait_for_timeout(400)
      av=await pg.query_selector('.nota-n'); print('aviso en Inicio:', (await av.text_content()).strip() if av else None)
      if not av: errs.append('sin aviso de nota')
      else:
        await av.click(); await pg.wait_for_timeout(500)
        print('nota en el editor:', await pg.is_visible('#ed-nota'), '|', (await pg.text_content('#ed-nota'))[:80])
        await pg.fill('#f-smb-q','¿Cuándo sueltas el pase?\n¿Qué miras antes de recibir?'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=O2+'web_lucas_editor.png')
        await pg.click('#ed-save-mine'); await pg.wait_for_timeout(2000)
      # 3. la DT la ve corregida y la mete validada
      await salir(); await dt()
      first=await pg.text_content('.rv-row'); print('1ª de la cola:', ' '.join(first.split()))
      if 'corregida' not in first: errs.append('no sale como corregida')
      await pg.screenshot(path=O2+'web_corregida.png')
      await pg.click('#rv-main [data-rv="ok"]'); await pg.wait_for_timeout(1200)
      s=await st(); t=[x for x in s['tasks'] if x.get('orig')=='mine-abc'] if 'tasks' in s else None
      tk=await pg.evaluate("Object.entries(window.__fake.db()).filter(([k])=>k.startsWith('tasks/')).map(([k,v])=>JSON.parse(v.j)).filter(t=>t.orig==='mine-abc').map(t=>[t.title,t.smb&&t.smb.validado,(t.smb.preguntas||[]).length])")
      print('en el banco:', tk, '| notas:', len(s.get('notas',[])))
      if not tk or not tk[0][1] or s.get('notas'): errs.append('no entra validada o queda la nota')
      print('errs',errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
