import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio
from playwright.async_api import async_playwright
MOCK=MOCK_ART
O=SHOTS+'bd/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    ctx=await b.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    await ctx.add_init_script('const OWNER=false;'+MOCK)
    pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    await pg.click('[data-nav="ejercicios"]'); await pg.wait_for_timeout(300)
    await pg.click('#btn-new'); await pg.wait_for_timeout(400)
    await pg.screenshot(path=O+'0_form.png')
    bb=await pg.locator('#canvas').bounding_box()
    await pg.tap('#canvas', position={'x':bb['width']/2,'y':bb['height']/2}); await pg.wait_for_timeout(500)
    await pg.screenshot(path=O+'1_board.png')
    await pg.tap('[data-bdg="jug"]'); await pg.wait_for_timeout(400); await pg.screenshot(path=O+'2_sheet.png')
    await pg.tap('#bd-sheet [data-bdt="atk"]'); await pg.wait_for_timeout(200)
    bb=await pg.locator('#canvas').bounding_box()
    # three attackers near top (should be left side of rink)
    for fx,fy in ((.3,.2),(.7,.25),(.5,.4)):
      await pg.tap('#canvas', position={'x':bb['width']*fx,'y':bb['height']*fy}); await pg.wait_for_timeout(150)
    await pg.tap('[data-bdg="jug"]'); await pg.tap('#bd-sheet [data-bdt="def"]')
    await pg.tap('#canvas', position={'x':bb['width']*.5,'y':bb['height']*.6}); await pg.wait_for_timeout(150)
    await pg.tap('[data-bdg="mat"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O+'3_mat.png'); await pg.tap('#bd-sheet [data-bdt="cone"]')
    await pg.tap('#canvas', position={'x':bb['width']*.2,'y':bb['height']*.8}); await pg.wait_for_timeout(150)
    await pg.tap('[data-bdg="fle"]'); await pg.tap('#bd-sheet [data-bdt="pase"]')
    await pg.tap('#canvas', position={'x':bb['width']*.3,'y':bb['height']*.2}); await pg.tap('#canvas', position={'x':bb['width']*.7,'y':bb['height']*.25}); await pg.wait_for_timeout(200)
    await pg.screenshot(path=O+'4_drawing.png')
    if await pg.is_visible('.bd-finish'): await pg.tap('.bd-finish')
    await pg.wait_for_timeout(200)
    await pg.screenshot(path=O+'5_done.png')
    d=await pg.evaluate("document.getElementById('canvas').innerHTML.length")
    await pg.tap('[data-bd="done"]'); await pg.wait_for_timeout(400)
    await pg.screenshot(path=O+'6_back.png')
    await pg.set_viewport_size({'width':844,'height':390}); await pg.wait_for_timeout(200)
    await pg.tap('[data-bd="open"]') if await pg.is_visible('[data-bd="open"]') else await pg.click('#ed-big')
    await pg.wait_for_timeout(400); await pg.screenshot(path=O+'7_land.png')
    print('errs',errs); await b.close()
asyncio.run(main())
