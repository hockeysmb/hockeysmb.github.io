import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json, subprocess, time
from playwright.async_api import async_playwright
LIVE=BANK
CFG="window.SMB_FIREBASE={apiKey:'x',authDomain:'x',projectId:'demo',appId:'x'};window.SMB_DT_UIDS=['dtuid000000000000000000000001'];"
DT={'uid':'dtuid000000000000000000000001','email':'dt@smb.es','name':'Carlos Manzano'}
async def main():
  srv=subprocess.Popen(['python3','-m','http.server','8767','-d',WEB],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  await asyncio.sleep(1)
  try:
    async with async_playwright() as p:
      b=await p.chromium.launch(); errs=[]
      ctx=await b.new_context(viewport={'width':390,'height':860})
      await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(body='', content_type='text/javascript'))
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.route('**/firebase-config.js*', lambda r: r.fulfill(body=CFG, content_type='text/javascript'))
      await ctx.add_init_script(path=FAKEFB)
      pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto('http://localhost:8767/'); await pg.wait_for_timeout(500)
      await pg.evaluate('d=>{window.__nextGoogle=d}', DT); await pg.click('[data-cl="google"]'); await pg.wait_for_timeout(400)
      await pg.set_input_files('#cl-bankfile', LIVE); await pg.click('[data-cl="import"]'); await pg.wait_for_timeout(900)
      # Lucas: miembro con perfil (inyectado)
      await pg.evaluate("""()=>{const st=window.__fake.db()['club/state']; window.__fake.put('club/state',{memberUids:[...(st.memberUids||[]),'ulucas']}); window.__fake.put('profiles/ulucas',{name:'Lucas',email:'l@x.es',ts:Date.now(),j:JSON.stringify({poder:'garra',pizarra:{o:['C','C','C'],charla:0}})});}""")
      await pg.wait_for_timeout(500)
      await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-lgtab="amistosos"]'); await pg.wait_for_timeout(300); await pg.click('.am-rival[data-name="Lucas"]'); await pg.wait_for_timeout(1500)
      ids=[k for k in (await pg.evaluate('Object.keys(window.__fake.db())')) if k.startswith('partidas/')]; print('A: partida', ids, (await pg.inner_text('#lv-act'))[:80])
      pid=ids[0]
      await pg.evaluate("p=>window.__fake.put(p,{estado:'jugando'})", pid); await pg.wait_for_timeout(400)
      print('A: tras aceptar', (await pg.inner_text('#lv-act'))[:40].replace('\n',' '))
      await pg.click('[data-lv="skip"]')
      for i in range(8):
        await pg.wait_for_selector('[data-lv-o]:not([disabled])', timeout=10000); await pg.click('[data-lv-o]:not([disabled]) >> nth=0'); await pg.wait_for_timeout(200)
        if i<2: print(f'A: posesión {i} esperando', 'Esperando' in await pg.inner_text('#lv-act'))
        await pg.evaluate("([p,i])=>window.__fake.put(p,{['b'+i]:(i%2?'D':'Z')+'|0|0'})", [pid,i]); await pg.wait_for_timeout(400)
      await pg.wait_for_selector('.lv-res', timeout=10000)
      print('A: res', await pg.inner_text('.lv-res'))
      print('A: doc', {k:v for k,v in (await pg.evaluate("p=>window.__fake.db()[p]", pid)).items() if k in ('estado','a0','b0','a7','b7')})
      await pg.click('.lv-act [data-lv="close"]'); await pg.wait_for_timeout(300)
      # B: me retan a mí
      await pg.evaluate("""()=>window.__fake.put('partidas/am-test1',{id:'am-test1',a:'ulucas',b:'dtuid000000000000000000000001',an:'Lucas',bn:'Carlos Manzano',pA:JSON.stringify({name:'Lucas',lvl:0,forma:0,poder:'garra'}),pB:JSON.stringify({name:'Carlos Manzano',lvl:1,forma:0,poder:'garra'}),estado:'invitado',ts:Date.now()})""")
      await pg.wait_for_timeout(500)
      print('B: invitación', (await pg.inner_text('#modal-card'))[:40].replace('\n',' '))
      await pg.click('#m-ok'); await pg.wait_for_timeout(300); await pg.click('[data-lv="skip"]'); await pg.wait_for_timeout(300)
      for i in range(8):
        await pg.evaluate("i=>window.__fake.put('partidas/am-test1',{['a'+i]:(i%2?'P':'D')+'|0|0'})", i)
        await pg.wait_for_selector('[data-lv-o]:not([disabled])', timeout=10000); await pg.click('[data-lv-o]:not([disabled]) >> nth=-1'); await pg.wait_for_timeout(400)
      await pg.wait_for_selector('.lv-res', timeout=10000)
      print('B: res', await pg.inner_text('.lv-res'), '| estado', (await pg.evaluate("()=>window.__fake.db()['partidas/am-test1'].estado")))
      print('errs', errs); await b.close()
  finally: srv.terminate()
asyncio.run(main())
