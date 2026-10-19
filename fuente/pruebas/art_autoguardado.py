import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, json
from playwright.async_api import async_playwright
MOCK=MOCK_ART
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.add_init_script('const OWNER=false;'+MOCK)
    pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    n0=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-sesiones')||'[]').length")
    await pg.click('[data-nav="sesiones"]'); await pg.click('#btn-new-ses'); await pg.wait_for_timeout(400)
    print('estado inicial:', await pg.text_content('#ses-auto'))
    n1=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-sesiones')||'[]').length"); print('sin cambios no guarda:', n0, n1)
    await pg.fill('[data-f="equipo"]','Alevín C'); await pg.wait_for_timeout(300)
    print('mientras:', await pg.text_content('#ses-auto'))
    await pg.wait_for_timeout(1500)
    print('tras 1,5 s:', await pg.text_content('#ses-auto'))
    S=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-sesiones')||'[]')"); print('guardadas', len(S), S[-1]['equipo'])
    await pg.select_option('#ses-fund-add', index=1); await pg.wait_for_timeout(1600)
    S=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-sesiones')||'[]')"); print('fund', S[-1]['fundamentos'])
    # recarga a mitad: simula cerrar la app
    await pg.fill('[data-f="micro"]','M3'); 
    await pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    await pg.reload(); await pg.wait_for_timeout(800)
    S=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-sesiones')||'[]')"); print('tras recargar', len(S), S[-1].get('micro'))
    await pg.click('[data-nav="sesiones"]'); await pg.wait_for_timeout(300)
    await pg.click('#btn-new-ses'); await pg.wait_for_timeout(300); await pg.fill('[data-f="equipo"]','Benjamín A'); await pg.click('#ses-close'); await pg.wait_for_timeout(400)
    S=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-sesiones')||'[]')"); print('cerrar guarda', len(S), S[-1]['equipo'])
    await pg.screenshot(path='tec2/auto.png')
    print('errs',errs); await b.close()
asyncio.run(main())
