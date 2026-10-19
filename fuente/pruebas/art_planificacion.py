import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio
from playwright.async_api import async_playwright
MOCK=MOCK_ART
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    for W in (1200,390):
      ctx=await b.new_context(viewport={'width':W,'height':900})
      await ctx.add_init_script('const OWNER=false;'+MOCK)
      pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(ART_URL); await pg.wait_for_timeout(700)
      await pg.click('[data-nav="sesiones"]'); await pg.click('[data-scope="plan"]'); await pg.wait_for_timeout(200)
      print('plan', (await pg.inner_text('.plan'))[:220].replace('\n',' | '))
      f=pg.locator('[data-plan-foco]:visible').first
      await f.click(); await pg.keyboard.type('Estaciones de técnica: chutes y regates', delay=5)
      print('focus kept', await pg.evaluate("document.activeElement.dataset.planFoco||''"))
      await pg.locator('[data-plan-fase]:visible').nth(2).click(); await pg.wait_for_timeout(100)  # Ataque
      await pg.locator('.pl-cont summary:visible').first.click(); await pg.locator('[data-plan-cont]:visible').first.click(); await pg.wait_for_timeout(100)
      print("plan LS", (await pg.evaluate("localStorage.getItem('smb-banco-plan')"))[:200])
      await pg.locator('[data-pcopy]:visible').nth(1).click(); await pg.wait_for_timeout(200)
      print('tras copiar', await pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('smb-banco-plan'))).length"))
      await pg.screenshot(path=f't5/plan{W}.png', full_page=True)
      await pg.locator('.pl-row [data-ag="prep"]:visible').first.click(); await pg.wait_for_timeout(300)
      print('sesión', await pg.input_value('[data-f="equipo"]'), '|', await pg.input_value('[data-f="fundamento"]'), '|', await pg.inner_text('.ses-f .opts') if await pg.query_selector('.ses-f .opts') else '')
      await pg.click('#ses-close'); 
      if await pg.query_selector('#m-drop'): await pg.click('#m-drop')
      await pg.click('[data-nav="inicio"]'); await pg.wait_for_timeout(200)
      print('inicio', (await pg.inner_text('.agenda'))[:260].replace('\n',' | '))
      await ctx.close()
    print('errs',errs); await b.close()
asyncio.run(main())
