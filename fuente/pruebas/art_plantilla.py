import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio
from playwright.async_api import async_playwright
MOCK=MOCK_ART
O=SHOTS+'club/shots/'
G="localStorage.setItem('smb-banco-personaje', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('smb-banco-personaje')||'{}'),{v:2,owned:[],spent:0,log:[{key:'x',pts:800,why:'x',date:'2026-10-01'}]})));"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    ctx=await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2); await ctx.add_init_script('const OWNER=false;'+MOCK+G)
    pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(400)
    el=await pg.query_selector('.club-t'); await el.screenshot(path=O+'teaser.png')
    await pg.click('.club-t [data-club="plantilla"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O+'plantilla.png', full_page=True)
    await pg.click('[data-cltab="entrenar"]'); await pg.click('[data-cltrain="tec"]'); await pg.wait_for_timeout(200)
    print('train:', (await pg.text_content('.club-in .msg'))[:160])
    await pg.screenshot(path=O+'entrenar.png')
    await pg.click('[data-cltab="mercado"]'); await pg.wait_for_timeout(200); await pg.screenshot(path=O+'mercado.png', full_page=True)
    await pg.click('[data-clbuy] >> nth=0'); await pg.wait_for_timeout(200); await pg.click('#m-ok')
    await pg.wait_for_timeout(300); print('buy:', await pg.text_content('.club-in .msg'))
    await pg.click('[data-cltab="plantilla"]'); await pg.wait_for_timeout(200)
    await pg.click('[data-clsell] >> nth=0'); await pg.wait_for_timeout(200); await pg.click('#m-club'); await pg.wait_for_timeout(200)
    print('sell:', await pg.text_content('.club-in .msg'))
    print('titulares:', await pg.locator('.club-in :text("Titular")').count())
    g=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-personaje')).club"); print('squad', len(g['squad']), 'tr', g['tr'])
    await pg.click('[data-club="x"]'); await pg.wait_for_timeout(300)
    # amistoso
    await pg.click('.am-rival >> nth=0') if await pg.query_selector('.am-rival') else print('sin rivales')
    await pg.wait_for_timeout(1500)
    if await pg.query_selector('[data-lv="skip"]'): await pg.click('[data-lv="skip"]'); await pg.wait_for_timeout(800)
    txt=await pg.evaluate("document.body.innerText"); print('plantilla en partido:', 'Plantilla' in txt or 'Defensa de su plantilla' in txt)
    print('errs',errs); await b.close()
asyncio.run(main())
