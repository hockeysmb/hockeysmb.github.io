import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
import asyncio, datetime
from playwright.async_api import async_playwright
MOCK=MOCK_ART
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    for owner,W in ((True,1200),(False,390)):
      ctx=await b.new_context(viewport={'width':W,'height':900})
      await ctx.add_init_script('const OWNER=%s;'%('true' if owner else 'false')+MOCK)
      pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(ART_URL); await pg.wait_for_timeout(700)
      print('inicio', (await pg.inner_text('.agenda')).replace('\n',' | ')[:300] if await pg.query_selector('.agenda') else 'NO AGENDA')
      await pg.screenshot(path=f't5/ag_inicio{W}.png', full_page=True)
      await pg.click('.agenda [data-ag="prep"]'); await pg.wait_for_timeout(300)
      print('nueva', await pg.input_value('[data-f="equipo"]'), await pg.input_value('[data-f="fecha"]'))
      await pg.click('#ses-save'); await pg.click('#ses-close'); await pg.wait_for_timeout(200)
      await pg.click('[data-nav="inicio"]'); await pg.wait_for_timeout(200)
      print('tras preparar', (await pg.inner_text('.agenda .ag-row')).replace('\n',' | '))
      await pg.click('[data-nav="sesiones"]'); await pg.click('[data-sview="cal"]'); await pg.wait_for_timeout(200)
      await pg.screenshot(path=f't5/ag_cal{W}.png', full_page=True)
      if owner:
        await pg.click('[data-nav="dt"]'); await pg.wait_for_timeout(200)
        print('dt', (await pg.inner_text('#dt-dyn'))[:200].replace('\n',' | '))
        await pg.click('[data-dttab="horario"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f't5/ag_dt{W}.png', full_page=True)
        await pg.click('[data-hz="new"]'); await pg.wait_for_timeout(200)
        await pg.select_option('#m-dia','6'); await pg.fill('#m-eq','Prueba A'); await pg.fill('#m-ent','Carlos'); await pg.click('#m-ok'); await pg.wait_for_timeout(400)
        print('sábado', 'Prueba A' in await pg.inner_text('#dt-dyn'))
      await ctx.close()
    print('errs',errs); await b.close()
asyncio.run(main())
