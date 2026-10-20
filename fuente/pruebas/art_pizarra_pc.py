import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Pizarra en el ordenador: panel de herramientas a la izquierda, sin barra de 18 botones en la ficha
import asyncio
from playwright.async_api import async_playwright
O = SHOTS + 'pc/'; os.makedirs(O, exist_ok=True)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); errs = []
    ctx = await b.new_context(viewport={'width': 1366, 'height': 768})
    await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    await ctx.add_init_script('const OWNER=false;' + MOCK_ART)
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    await pg.click('[data-nav="sesiones"]'); await pg.click('#btn-new-ses'); await pg.wait_for_timeout(300)
    await pg.fill('[data-f="equipo"]', 'Alevín B'); await pg.click('[data-step="1"]'); await pg.wait_for_timeout(300)
    await pg.click('[data-create="0"]'); await pg.wait_for_timeout(500)
    print('barra vieja visible:', await pg.is_visible('#ed-tools'))
    await pg.click('#canvas'); await pg.wait_for_timeout(400)
    print('pizarra:', await pg.evaluate("document.getElementById('editor').classList.contains('board')"), '| panel:', await pg.is_visible('#bd-panel'), '| aviso:', await pg.is_visible('#bd-empty'))
    box = await pg.locator('#canvas').bounding_box()
    await pg.click('#bd-panel [data-bdt="atk"]')
    for fx, fy in ((.35, .5), (.55, .3)): await pg.mouse.click(box['x'] + box['width'] * fx, box['y'] + box['height'] * fy)
    await pg.click('#bd-panel [data-bdt="pase"]')
    await pg.mouse.click(box['x'] + box['width'] * .36, box['y'] + box['height'] * .5); await pg.mouse.click(box['x'] + box['width'] * .54, box['y'] + box['height'] * .31)
    await pg.wait_for_timeout(200); await pg.screenshot(path=O + 'pizarra.png')
    print('aviso tras poner:', await pg.is_visible('#bd-empty'))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100)
    print('Esc vuelve a Mover:', await pg.text_content('#bd-cur'))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    d = await pg.evaluate("(()=>{const k={};document.querySelectorAll('#canvas [data-kind]').forEach(e=>{if(e.dataset.id)k[e.dataset.kind+'|'+e.dataset.id]=e.dataset.kind});const v=Object.values(k);return [v.filter(x=>x!=='arrow').length,v.filter(x=>x==='arrow').length]})()")
    print('vuelta a la ficha:', not await pg.evaluate("document.getElementById('editor').classList.contains('board')"), '| elementos', d)
    if d != [2, 1]: errs.append('diagrama inesperado %s' % d)
    print('errs', errs); await b.close()
asyncio.run(main())
