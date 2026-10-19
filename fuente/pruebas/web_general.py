import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json, base64, subprocess, sys
from playwright.async_api import async_playwright
W=int(sys.argv[1]) if len(sys.argv)>1 else 390
LIVE=BANK
bank=json.load(open(LIVE))
t=bank['tasks'][5]
mine={**t,'id':'mine-abc','title':'Rueda de Lucas','source':'mine','author':'Lucas'}
ses={'id':'ses-l1','kind':'','equipo':'Benjamín B','fecha':'2026-10-20','entrenador':'Lucas','obj':{},'fundamentos':[],'fase':'','reflexion':'','bloques':[{'task':bank['tasks'][i],'min':'15'} for i in range(4)]}
game={'owned':['head:gorra'],'spent':50,'log':[{'key':'k1','pts':200,'why':'x','date':'2026-10-06'}],'poder':'presion','av':{'v':2,'skin':'edb98a','top':'curly','head':'gorra','bg':'pista','kit':'smb1','dorsal':'9'}}
code='SMB2:'+base64.b64encode(json.dumps({'v':2,'autor':'Lucas','mine':[mine],'sessions':[ses],'game':game,'envios':[]}).encode()).decode()
CFG="window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT={'uid':'dtuid000000000000000000000001','email':'dt@smb.es','name':'Carlos Manzano'}
async def main():
  srv=subprocess.Popen(['python3','-m','http.server','8765','-d',WEB],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b=await p.chromium.launch(); errs=[]
      ctx=await b.new_context(viewport={'width':W,'height':860})
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.add_init_script(path=FAKEFB)
      pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append('console:'+m.text))
      U='http://localhost:8765/'
      await pg.goto(U); await pg.wait_for_timeout(600)
      await pg.screenshot(path=f'login{W}.png')
      # 1. DT entra por primera vez e importa el banco
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(400)
      print('1 gate:', (await pg.inner_text('#cl-gate'))[:60].replace('\n',' | '))
      await pg.set_input_files('#cl-bankfile', LIVE); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(800)
      print('1 gate hidden', await pg.is_hidden('#cl-gate'), 'dt nav', await pg.is_visible('[data-nav="dt"]'))
      print('1 tasks in db', len([k for k in (await pg.evaluate('Object.keys(window.__fake.db())')) if k.startswith('tasks/')]))
      # DT propone un candidato
      await pg.click('[data-nav="ejercicios"]'); await pg.wait_for_timeout(200)
      await pg.click('#grid .tcard'); await pg.wait_for_timeout(200); await pg.click('[data-act="cand"]'); await pg.wait_for_timeout(500)
      print('1 semana', (await pg.evaluate("JSON.parse(window.__fake.db()['club/state'].j).semana.ej")))
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1200)
      # 2. Lucas crea su cuenta
      await pg.fill('#cl-email','lucas@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="up"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("window.__fake.verify('lucas@smb.es')"); await pg.click('[data-cl="verified"]'); await pg.wait_for_timeout(700)
      print('2 gate:', (await pg.inner_text('#cl-gate'))[:70].replace('\n',' | '))
      await pg.fill('#cl-name','Lucas'); await pg.click('[data-cl="name"]'); await pg.wait_for_timeout(300)
      await pg.screenshot(path=f'pending{W}.png')
      await pg.click('#cl-gate [data-cl="out"]'); await pg.wait_for_timeout(1200)
      # 3. DT le da acceso
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1000)
      await pg.click('[data-nav="dt"]'); await pg.wait_for_timeout(300)
      print('3 te toca', (await pg.inner_text('.dt-todo')).replace('\n',' | ')[:160], '| tab', await pg.inner_text('[data-dttab="equipo"]'))
      await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(300)
      await pg.screenshot(path=f'acceso{W}.png', full_page=True)
      await pg.click('[data-cl="grant"]:not([data-uid="dtuid000000000000000000000001"])'); await pg.wait_for_timeout(600)
      st=await pg.evaluate("window.__fake.db()['club/state']"); print('3 members', st['memberUids'], [c['name'] for c in json.loads(st['j'])['coaches']])
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1200)
      print('3 local cleared', await pg.evaluate("localStorage.getItem('smb-banco-autor')"))
      # 4. Lucas entra, recupera su copia, vota y manda un ejercicio
      await pg.fill('#cl-email','lucas@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="in"]'); await pg.wait_for_timeout(900)
      print('4 gate hidden', await pg.is_hidden('#cl-gate'), 'dt hidden', await pg.is_hidden('[data-nav="dt"]'))
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('.dt-more summary') if await pg.query_selector('.dt-more summary') else None; await pg.click('[data-pf="restore"]')
      await pg.fill('#m-in', code); await pg.click('#m-go'); await pg.wait_for_timeout(300); print('4', await pg.inner_text('#m-msg')); await pg.click('#m-close')
      await pg.wait_for_timeout(1200)
      keys=await pg.evaluate('Object.keys(window.__fake.db())'); print('4 cloud personal', [k for k in keys if k.startswith('users/')])
      await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300); await pg.click('[data-lgtab="votacion"]'); await pg.wait_for_timeout(300); 
      await pg.click('[data-wk="vote"]'); await pg.wait_for_timeout(400)
      print('4 votes', [k for k in (await pg.evaluate('Object.keys(window.__fake.db())')) if k.startswith('votes/')])
      await pg.click('[data-nav="ejercicios"]'); await pg.click('#tab-mias'); await pg.wait_for_timeout(200)
      await pg.click('#grid .tcard'); await pg.wait_for_timeout(300)
      print('4 ficha mía', (await pg.inner_text('.d-actions')).replace('\n',' | '))
      await pg.keyboard.press('Escape'); await pg.click('#me-btn'); await pg.wait_for_timeout(300)
      print('4 sync', await pg.inner_text('.me .sync'))
      await pg.screenshot(path=f'perfil{W}.png', full_page=True)
      await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1200)
      # 5. DT revisa la bandeja y lo mete en el banco
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1000)
      await pg.click('[data-nav="dt"]'); await pg.wait_for_timeout(300)
      await pg.screenshot(path=f'resumen{W}.png', full_page=True)
      print('5 te toca', (await pg.inner_text('.dt-todo')).replace('\n',' | ')[:200])
      await pg.click('[data-dtgo="banco"]'); await pg.wait_for_timeout(300)
      await pg.screenshot(path=f'bandeja{W}.png', full_page=True)
      print('5 nuevos', (await pg.inner_text('#dt-dyn'))[:120].replace('\n',' | '))
      await pg.click('[data-dt-tobank]'); await pg.wait_for_timeout(800)
      print('5 tasks', len([k for k in (await pg.evaluate('Object.keys(window.__fake.db())')) if k.startswith('tasks/')]))
      await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300)
      await pg.screenshot(path=f'liga{W}.png', full_page=True)
      await pg.click('[data-lgtab="amistosos"]'); await pg.wait_for_timeout(300); 
      print('5 team', await pg.inner_text('.team') if await pg.query_selector('.team') else 'none')
      # 5-ej. ejercicios del cuerpo técnico
      print('5ej shared ej', [k for k,v in (await pg.evaluate('window.__fake.db()')).items() if k.startswith('shared/') and v.get('k')=='ej'])
      await pg.click('[data-nav="ejercicios"]'); await pg.click('#tab-club'); await pg.wait_for_timeout(300)
      print('5ej tab', await pg.inner_text('#tab-club'), '|', (await pg.inner_text('#grid'))[:120].replace('\n',' | '))
      await pg.screenshot(path=f'club_ej{W}.png')
      print('5ej badge dt', await pg.evaluate("(document.querySelector('[data-nav=dt] .nbadge')||{}).textContent"))
      # 5a. directorio de sesiones: la DT ve la de Lucas y la copia
      print('5a shared en db', [k for k in (await pg.evaluate('Object.keys(window.__fake.db())')) if k.startswith('shared/')])
      await pg.click('[data-nav="sesiones"]'); await pg.click('[data-scope="club"]'); await pg.wait_for_timeout(300)
      print('5a club', (await pg.inner_text('#ses-list'))[:160].replace('\n',' | '))
      await pg.click('[data-sview="cal"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-day="2026-10-20"]') if await pg.query_selector('[data-day="2026-10-20"]') else None
      print('5a cal', (await pg.inner_text('.cal-key')), '|', (await pg.inner_text('#cal-day'))[:80].replace('\n',' | '))
      await pg.screenshot(path=f'club_cal{W}.png', full_page=True)
      await pg.click('[data-sview="list"]'); await pg.wait_for_timeout(200)
      await pg.screenshot(path=f'club{W}.png', full_page=True)
      await pg.click('[data-sc="copy"]'); await pg.wait_for_timeout(500)
      print('5a copia abierta', await pg.is_visible('#ses-wrap'))
      await pg.keyboard.press('Escape'); await pg.goto(U); await pg.wait_for_timeout(1500)
      print('5a mis sesiones', await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-sesiones')||'[]').map(s=>s.entrenador+':'+s.equipo)"))
      await pg.wait_for_timeout(1000)
      print('5a shared tras copia', [k.split('/')[1][:6] for k in (await pg.evaluate('Object.keys(window.__fake.db())')) if k.startswith('shared/')])
      await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300)
      # 5b. la DT está en el vestuario sin mandar nada y reta a Lucas
      await pg.click('[data-lgtab="equipo"]'); await pg.wait_for_timeout(300); print('5b sync DT', await pg.inner_text('.my-liga .ml-line'))
      await pg.click('[data-lgtab="amistosos"]'); await pg.wait_for_timeout(300); await pg.click('.am-rival[data-name="Lucas"]'); await pg.wait_for_timeout(1500); await pg.click('[data-lv="skip"]'); await pg.click('[data-lv="vspiz"]'); await pg.wait_for_timeout(200)
      for i in range(8): await pg.wait_for_selector('[data-lv-o]:not([disabled])', timeout=10000); await pg.click('[data-lv-o]:not([disabled]) >> nth=0'); await pg.wait_for_timeout(150)
      await pg.wait_for_selector('.lv-res', timeout=10000)
      print('5b res', await pg.inner_text('.lv-res')); await pg.click('.lv-act [data-lv="close"]'); await pg.wait_for_timeout(1500)
      prof=await pg.evaluate("window.__fake.db()['profiles/dtuid000000000000000000000001']"); print('5b amis en perfil', len(json.loads(prof['j']).get('amis',[])))
      await pg.click('#me-btn'); await pg.wait_for_timeout(200); print('5b me sync', await pg.inner_text('.me .sync'), '| alert', await pg.evaluate("document.getElementById('me-btn').classList.contains('alert')"))
      await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1200)
      await pg.fill('#cl-email','lucas@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="in"]'); await pg.wait_for_timeout(1200)
      print('5c liga dot', await pg.evaluate("document.querySelector('[data-nav=liga]').classList.contains('has-dot')"), '| teaser', await pg.inner_text('.lt-row.hot') if await pg.query_selector('.lt-row.hot') else 'none')
      await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-lgtab="amistosos"]'); await pg.wait_for_timeout(300); 
      print('5c lista', (await pg.inner_text('.amis .duels')).replace('\n',' '))
      await pg.locator('.amis').scroll_into_view_if_needed(); await pg.screenshot(path=f'amis_lucas{W}.png')
      # 6. un intruso sin acceso no ve nada
      await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1200)
      await pg.fill('#cl-email','intruso@x.es'); await pg.fill('#cl-pass','123456'); await pg.click('[data-cl="up"]'); await pg.wait_for_timeout(500)
      print('6 gate', (await pg.inner_text('#cl-gate'))[:40].replace('\n',' | '))
      print('errors', errs)
      await b.close()
  finally: srv.terminate()
asyncio.run(main())
