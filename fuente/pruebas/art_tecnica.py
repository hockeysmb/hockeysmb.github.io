import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio
from playwright.async_api import async_playwright
MOCK=MOCK_ART
O=SHOTS+'tec2/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    ctx=await b.new_context(viewport={'width':1200,'height':900})
    await ctx.add_init_script('const OWNER=false;'+MOCK)
    pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    await pg.click('[data-nav="ejercicios"]'); await pg.click('#btn-new'); await pg.wait_for_timeout(300)
    await pg.fill('#f-title','Pase y control con oposición')
    await pg.click('[data-tipo="tecnico"]')
    await pg.click('[data-tcat="ben"]'); await pg.click('[data-tf="Pase y control"]'); await pg.click('[data-tf="1c1 en defensa"]')
    await pg.click('[data-tec="Pase de pala y cuchara con oposición dinámica"]'); await pg.click('[data-tec="No ir a buscar la bola"]')
    el=await pg.query_selector('.tec-grp'); await el.scroll_into_view_if_needed(); await el.screenshot(path=O+'editor.png')
    await pg.fill('#f-author','Lucas'); await pg.click('#ed-save-mine'); await pg.wait_for_timeout(500); print('msg', await pg.evaluate("document.getElementById('ed-msg').textContent"), await pg.evaluate('document.getElementById("editor").hidden'))
    if await pg.query_selector('#m-no'): pass
    await pg.click('#tab-mias'); await pg.wait_for_timeout(300)
    await pg.click('#grid .tcard'); await pg.wait_for_timeout(300)
    txt=await pg.evaluate("document.body.innerText"); print('ficha ok', 'Técnica y táctica individual' in txt, 'Para: Benjamín' in txt)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.click('#f-more'); 
    opts=await pg.evaluate("[...document.querySelectorAll('#f-cont optgroup')].map(g=>g.label)"); print('cont groups', opts)
    await pg.select_option('#f-cat','ben'); await pg.wait_for_timeout(200)
    print('count', await pg.evaluate("document.querySelector('#factive .count').textContent"))
    # sesion
    await pg.click('[data-nav="sesiones"]'); await pg.wait_for_timeout(300)
    btn=await pg.query_selector('[data-ses="new"], #btn-ses-new, [data-sesnew]')
    print('ses btn', bool(btn))
    print('errs',errs); await b.close()
asyncio.run(main())
