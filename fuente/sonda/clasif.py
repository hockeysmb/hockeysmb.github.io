# Sonda temporal 2: cómo pide los datos el código de la clasificación del portal.
import re, urllib.request, urllib.parse, http.cookiejar
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
ab = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def get(u, data=None, extra={}):
    h = {'User-Agent': UA, 'Referer': 'https://www.hockeypatines.fmp.es/', 'Origin': 'https://www.hockeypatines.fmp.es'}; h.update(extra)
    with ab.open(urllib.request.Request(u, data=data, headers=h), timeout=40) as r: return r.status, r.read().decode('utf-8', 'replace')
try: get('https://www.hockeypatines.fmp.es/')
except Exception as e: print('portada', e)
for js in ['sidgad-clasificacion.js', 'sidgad-league.js', 'sidgad-core.js', 'sidgad-router.js']:
    try:
        st, t = get(f'https://www.server2.sidgad.es/new_portal/assets/js/{js}?v=1794825281')
        print('==', js, st, len(t))
        for m in sorted(set(re.findall(r"[`'\"]([^`'\"\s]*(?:\.php|api\.sidgad|/api/|endpoint|clasif)[^`'\"\s]*)[`'\"]", t)))[:60]: print('   ', m)
        for m in re.finditer(r'(fetch|ajax|\$\.post|\$\.get|XMLHttpRequest)\s*\(', t):
            print('  CALL', t[max(0, m.start()-150):m.start()+250].replace('\n', ' '))
            break
        i = t.find('clasif'); print('  CTX', t[max(0, i-300):i+700].replace('\n', ' ') if i >= 0 else '-')
    except Exception as e: print(js, repr(e)[:200])
