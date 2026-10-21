import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Mesa de revisión de la DT (artifact): cola con semáforo, ficha completa, validar con V, editar, y semáforo en el editor
import asyncio
from playwright.async_api import async_playwright
O = SHOTS + 'rv/'; os.makedirs(O, exist_ok=True)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); errs = []
    for W, H in ((1366, 800), (390, 844)):
      ctx = await b.new_context(viewport={'width': W, 'height': H}, has_touch=W < 900, is_mobile=W < 900)
      await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
      await ctx.add_init_script('const OWNER=true;' + MOCK_ART)
      pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.goto(ART_URL); await pg.wait_for_timeout(800)
      await pg.click('[data-nav="dt"]'); await pg.wait_for_timeout(300)
      await pg.click('[data-dttab="revisar"]'); await pg.wait_for_timeout(400)
      n0 = await pg.locator('.rv-row').count(); first = await pg.text_content('.rv-main h3')
      dots = await pg.evaluate("[...document.querySelectorAll('.rv-row .rv-dot')].map(d=>d.className.split(' ').pop())")
      print(W, 'cola', n0, '| primera', first, '| semáforos', {k: dots.count(k) for k in set(dots)})
      print('   comprobaciones:', await pg.evaluate("[...document.querySelectorAll('.rv-main .rv-items li')].map(l=>l.textContent).slice(0,4)"))
      await pg.screenshot(path=O + f'mesa_{W}.png', full_page=W < 900)
      if W > 900:
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(200)
        second = await pg.text_content('.rv-main h3'); print('   → pasa a', second)
        await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(200)
        ok = await pg.locator('#rv-main [data-rv="ok"]:not([disabled])').count()
        if ok:
          await pg.keyboard.press('v'); await pg.wait_for_timeout(600)
          n1 = await pg.locator('.rv-row').count(); print('   validar con V:', n0, '→', n1, '| ahora', await pg.text_content('.rv-main h3'))
          if n1 != n0 - 1: errs.append('V no valida')
        await pg.keyboard.press('e'); await pg.wait_for_timeout(500)
        print('   E abre el editor:', await pg.is_visible('#editor'), '| semáforo:', (await pg.text_content('#ed-rv'))[:60])
        await pg.fill('#f-smb-q', '¿Has mirado?\n¿Cuándo sueltas el pase?'); await pg.wait_for_timeout(600)
        print('   pregunta de sí o no detectada:', 'sí o no' in await pg.text_content('#ed-rv'))
        await pg.screenshot(path=O + 'editor_semaforo.png')
    print('errs', errs); await b.close()
asyncio.run(main())
