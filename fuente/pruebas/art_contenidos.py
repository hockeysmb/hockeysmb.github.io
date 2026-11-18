import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); os.chdir(__import__('conf').SHOTS)
from conf import *
# Contenidos escritos a mano en la sesión (18 nov): el entrenador los añade y le vuelven a salir; la DT los pasa a la lista del club
# y entonces salen al clasificar ejercicios. Filtro «Que trabaje» al elegir ejercicio y atajo de la sesión en Ejercicios.
import asyncio
from playwright.async_api import async_playwright
O = SHOTS + 'cont/'; os.makedirs(O, exist_ok=True)
MIO = 'Salir de la presión con un apoyo cercano'
def ok(c, t):
  print(('  ok ' if c else 'FALLO ') + t)
  if not c: raise SystemExit(1)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); errs = []
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    await ctx.add_init_script('const OWNER=true;' + MOCK_ART)
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(ART_URL); await pg.wait_for_timeout(800)
    # 1. el entrenador escribe uno a mano y elige otro de la lista
    await pg.click('[data-nav="sesiones"]'); await pg.click('#btn-new-ses'); await pg.wait_for_timeout(400)
    await pg.fill('[data-f="equipo"]', 'Benjamín B')
    await pg.fill('[data-f="fecha"]', '2099-01-15')
    await pg.fill('#ses-fund-own', MIO.lower()); await pg.press('#ses-fund-own', 'Enter'); await pg.wait_for_timeout(200)
    chips = await pg.evaluate("[...document.querySelectorAll('[data-unfund]')].map(b=>b.dataset.unfund)")
    ok(chips == [MIO], f'el escrito a mano entra como fundamento, con mayúscula: {chips}')
    await pg.fill('#ses-fund-own', 'pasar y cortar'); await pg.click('[data-fund-own]'); await pg.wait_for_timeout(200)
    chips = await pg.evaluate("[...document.querySelectorAll('[data-unfund]')].map(b=>b.dataset.unfund)")
    ok('Pasar y cortar' in chips, 'si ya está en la lista del club, usa el de la lista')
    await pg.screenshot(path=O + 'sesion.png', full_page=True)
    await pg.wait_for_timeout(1600)
    # 2. filtro «Que trabaje» al elegir ejercicio
    await pg.click('.step[data-step="2"]'); await pg.wait_for_timeout(300)
    await pg.click('[data-pick]'); await pg.wait_for_timeout(300)
    await pg.click('#pk-tipo'); await pg.wait_for_timeout(200)
    n_all = await pg.locator('.pk-item').count()
    ok(await pg.locator('[data-pk-fund]').count() == 3, 'salen «Cualquiera» y los dos fundamentos del día')
    await pg.click('[data-pk-fund="Pasar y cortar"]'); await pg.wait_for_timeout(200)
    n_f = await pg.locator('.pk-item').count()
    todos = await pg.evaluate("[...document.querySelectorAll('.pk-item')].every(i=>(i.querySelector('.match')||{}).textContent?.includes('Pasar y cortar'))")
    ok(0 < n_f < n_all and todos, f'filtra por el fundamento: {n_all} → {n_f}, todos lo trabajan')
    await pg.screenshot(path=O + 'elegir.png')
    await pg.click(f'[data-pk-fund="{MIO}"]'); await pg.wait_for_timeout(200)
    ok(await pg.locator('.pk-item').count() == 0 and 'lo escribiste a mano' in await pg.text_content('.pk-grid'), 'con uno escrito a mano explica por qué no hay ejercicios')
    await pg.click('#pk-close'); await pg.click('#ses-close'); await pg.wait_for_timeout(400)
    # 3. le vuelve a salir en otra sesión, en «Tuyos»
    await pg.click('#btn-new-ses'); await pg.wait_for_timeout(300)
    tuyos = await pg.evaluate("[...document.querySelectorAll('#ses-fund-add optgroup')].filter(g=>g.label.startsWith('Tuyos')).flatMap(g=>[...g.children].map(o=>o.value))")
    ok(tuyos == [MIO], f'en otra sesión sale en «Tuyos»: {tuyos}')
    await pg.click('#ses-close'); await pg.wait_for_timeout(300)
    # 4. atajo en Ejercicios: los fundamentos de la próxima sesión
    await pg.click('[data-nav="ejercicios"]'); await pg.wait_for_timeout(300)
    dia = await pg.evaluate("[...document.querySelectorAll('#f-dia [data-fdia]')].map(b=>b.dataset.fdia)")
    ok(dia == ['Pasar y cortar'] and not await pg.locator('#f-dia').is_hidden(), f'Ejercicios ofrece los de la sesión (solo los de la lista): {dia}')
    n0 = await pg.text_content('#factive .count')
    await pg.click('[data-fdia="Pasar y cortar"]'); await pg.wait_for_timeout(200)
    n1 = await pg.text_content('#factive .count')
    ok(n0 != n1 and await pg.locator('#factive [data-clear="cont"]').count() == 1, f'un toque filtra: {n0} → {n1}')
    await pg.screenshot(path=O + 'ejercicios.png')
    await pg.click('[data-fdia="Pasar y cortar"]'); await pg.wait_for_timeout(200)
    ok(await pg.text_content('#factive .count') == n0, 'otro toque lo quita')
    # 5. la DT lo ve en Revisar y lo pasa a la lista del club
    await pg.click('[data-nav="dt"]'); await pg.wait_for_timeout(300)
    await pg.click('[data-dttab="revisar"]'); await pg.wait_for_timeout(300)
    row = pg.locator('.cc-row', has_text=MIO)
    ok(await row.count() == 1, 'la DT lo ve en «Contenidos nuevos»')
    await row.locator('[data-cc="add"]').click(); await pg.wait_for_timeout(200)
    ok('Elige dónde va' in await pg.text_content('#cc-msg'), 'sin elegir dónde va, lo pide')
    await row.locator('select').select_option('Ataque'); await row.locator('[data-cc="add"]').click(); await pg.wait_for_timeout(600)
    ok(await pg.locator('.cc-row', has_text=MIO).count() == 0 and 'En la lista del club · 1' in await pg.text_content('.cc'), 'pasa a la lista del club')
    await pg.fill('#cc-new', 'conducir mirando al compañero'); await pg.locator('.cc-add select').select_option('tec:Conducción'); await pg.click('[data-cc="nuevo"]'); await pg.wait_for_timeout(600)
    ok('En la lista del club · 2' in await pg.text_content('.cc'), 'la DT añade uno suyo')
    await pg.screenshot(path=O + 'dt.png', full_page=True)
    # 6. ya sale al clasificar un ejercicio y en la técnica de cada categoría
    await pg.click('[data-nav="ejercicios"]'); await pg.click('#btn-new'); await pg.wait_for_timeout(300)
    await pg.click('[data-fase="Ataque"]'); await pg.wait_for_timeout(200)
    ok(await pg.locator(f'[data-cont="{MIO}"]').count() == 1, 'sale al clasificar un ejercicio (Ataque)')
    await pg.click('[data-tipo="tecnico"]'); await pg.click('[data-tcat="ben"]'); await pg.click('[data-tf="Conducción"]'); await pg.wait_for_timeout(200)
    tec = await pg.locator('[data-tec="Conducir mirando al compañero"]').count() == 1
    ok(tec, 'el técnico entra en Conducción para todas las categorías')
    # 7. quitarlo de la lista
    await pg.click('#ed-cancel'); await pg.wait_for_timeout(300)
    for sel in ('#m-drop',):
      if await pg.locator(sel).count() and await pg.locator(sel).is_visible(): await pg.click(sel); await pg.wait_for_timeout(300); break
    await pg.click('[data-nav="dt"]'); await pg.wait_for_timeout(300); await pg.click('[data-dttab="revisar"]'); await pg.wait_for_timeout(300)
    await pg.click('.cc details summary'); await pg.locator('.cc .dt-row', has_text='Conducir mirando').locator('[data-cc="del"]').click(); await pg.wait_for_timeout(600)
    ok('En la lista del club · 1' in await pg.text_content('.cc'), 'se puede quitar')
    print('errs', errs); await b.close()
asyncio.run(main())
