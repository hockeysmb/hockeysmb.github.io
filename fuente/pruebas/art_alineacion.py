import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio
from playwright.async_api import async_playwright
MOCK=MOCK_ART
O=SHOTS+'al/shots/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    ctx=await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2); await ctx.add_init_script('const OWNER=false;'+MOCK)
    pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    await pg.click('[data-nav="liga"]'); await pg.wait_for_timeout(300)
    await pg.click('[data-lgtab="equipo"]'); await pg.wait_for_timeout(400)
    el=await pg.query_selector('.al-sec'); await el.screenshot(path=O+'0.png')
    s0=await pg.evaluate("[...document.querySelectorAll('.club-stats.big b')].map(x=>x.textContent)"); print('rombo', s0)
    await pg.click('[data-alform="ofensiva"]'); await pg.wait_for_timeout(300)
    s1=await pg.evaluate("[...document.querySelectorAll('.club-stats.big b')].map(x=>x.textContent)"); print('ofensiva', s1)
    await pg.click('.al-slot[data-al="4"]'); await pg.wait_for_timeout(300)
    el=await pg.query_selector('.al-sec'); await el.screenshot(path=O+'1_pick.png')
    await pg.click('.al-list button >> nth=-1'); await pg.wait_for_timeout(300)
    s2=await pg.evaluate("[...document.querySelectorAll('.club-stats.big b')].map(x=>x.textContent)"); print('cambio', s2)
    g=await pg.evaluate("JSON.parse(localStorage.getItem('smb-banco-personaje')).club.lineup"); print('lineup', g)
    await pg.click('[data-al="auto"]'); await pg.wait_for_timeout(300)
    s3=await pg.evaluate("[...document.querySelectorAll('.club-stats.big b')].map(x=>x.textContent)"); print('auto', s3)
    print('errs',errs); await b.close()
asyncio.run(main())
