import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json, subprocess, sys
from playwright.async_api import async_playwright
W=int(sys.argv[1]) if len(sys.argv)>1 else 390
LIVE=BANK
CFG="window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT={'uid':'dtuid000000000000000000000001','email':'dt@smb.es','name':'Carlos Manzano','verified':True}
ANA={'uid':'uana000000000000000000000001','email':'Ana.Prueba@example.com','name':'Ana Prueba','verified':True}
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
      await pg.goto('http://localhost:8766/'); await pg.wait_for_timeout(600)
      async def google(u):
        await pg.evaluate('d=>{window.__nextGoogle=d}', u); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(1000)
      async def out():
        await pg.click('#me-btn'); await pg.click('[data-vtab="datos"]'); await pg.click('[data-cl="out"]'); await pg.wait_for_timeout(1300)
      await google(DT)
      await pg.set_input_files('#cl-bankfile', LIVE); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      await pg.click('[data-nav="dt"]'); await pg.click('[data-dttab="equipo"]'); await pg.wait_for_timeout(300)
      for n,e in [('Ana Prueba','ana.prueba@example.com'),('Marta','marta@smb.es')]:
        await pg.fill('#cl-pre-name',n); await pg.fill('#cl-pre-email',e); await pg.click('[data-cl="prereg"]'); await pg.wait_for_timeout(600)
      st=await pg.evaluate("window.__fake.db()['club/state']"); print('emails', st.get('memberEmails'), [ (c['name'],c.get('email')) for c in json.loads(st['j'])['coaches']])
      await pg.screenshot(path=f'prereg{W}.png', full_page=True)
      await out()
      await google(ANA)
      print('ana gate hidden', await pg.is_hidden('#cl-gate'), 'autor', await pg.evaluate("localStorage.getItem('smb-banco-autor')"))
      await out()
      await pg.fill('#cl-email','marta@smb.es'); await pg.fill('#cl-pass','hockey1'); await pg.click('[data-cl="up"]'); await pg.wait_for_timeout(700)
      print('marta gate:', (await pg.inner_text('#cl-gate'))[:60].replace('\n',' | '))
      await pg.click('[data-cl="verified"]'); await pg.wait_for_timeout(400); print('msg', await pg.inner_text('#cl-msg'))
      await pg.evaluate("window.__fake.verify('marta@smb.es')")
      await pg.click('[data-cl="verified"]'); await pg.wait_for_timeout(1200)
      print('marta gate hidden', await pg.is_hidden('#cl-gate'), 'autor', await pg.evaluate("localStorage.getItem('smb-banco-autor')"))
      await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300)
      print('team', (await pg.inner_text('.team')).replace('\n',' / ')[:200] if await pg.query_selector('.team') else 'none')
      await out()
      await pg.fill('#cl-email','intruso@x.es'); await pg.fill('#cl-pass','123456'); await pg.click('[data-cl="up"]'); await pg.wait_for_timeout(500)
      await pg.evaluate("window.__fake.verify('intruso@x.es')"); await pg.click('[data-cl="verified"]'); await pg.wait_for_timeout(700)
      print('intruso gate', (await pg.inner_text('#cl-gate'))[:40].replace('\n',' | '))
      print('errors', errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
