"""Actualiza femenino/partidos.json con el calendario de la Federación Madrileña de Patinaje (portal de sidgad).
Lo ejecuta GitHub Actions cada mañana (.github/workflows/partidos-fmp.yml) y guarda solo si hay cambios.
Uso local: python3 fuente/partidos_fmp.py [--local CARPETA_CON_cal_IDC.html] [--seco]
- Por liga: POST a fmp/fmp_cal_idc_{idc}_1.php (hay que mandar Referer y Origin del portal o devuelve vacío).
- Cada partido es un <tr gamedate="AAAAMMDD"> con hora, «JORNADA n», los dos equipos (el primero juega en casa) y el resultado.
- Si una liga no se puede leer o sale rara (menos de la mitad de partidos), se dejan los que había: nunca se vacía."""
import os, re, sys, json, html as H, urllib.request, urllib.parse
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON = os.path.join(RAIZ, 'femenino', 'partidos.json')
PORTAL = 'https://www.hockeypatines.fmp.es'
SG = 'https://www.server2.sidgad.es/fmp/'
LIGAS = [('4853', 'Sub-15', 's15'), ('4836', 'Sub-17', 's17'), ('4864', '1ª Autonómica', 'af')]
CLUB_SMB = '428'
CABE = {'User-Agent': 'Mozilla/5.0 (compatible; SMB-femenino/1.0; +https://hockeysmb.github.io)', 'Referer': PORTAL + '/', 'Origin': PORTAL,
        'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded'}

def descargar(idc):
    datos = urllib.parse.urlencode({'idc': idc, 'tipo_stats': '', 'site_lang': 'es'}).encode()
    with urllib.request.urlopen(urllib.request.Request(SG + f'fmp_cal_idc_{idc}_1.php', data=datos, headers=CABE), timeout=40) as r:
        return r.read().decode('utf-8', 'replace')

MINUS = {'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y'}
def bonito(n):
    n = re.sub(r'\bSTA\.? Mª', 'SANTA MARÍA', n)
    out = []
    for i, w in enumerate(n.split()):
        if w in MINUS and i: out.append(w.lower())
        elif len(w) <= 3 and w.isalpha() and not re.search(r'[AEIOUÁÉÍÓÚ]', w): out.append(w)   # CP, RH, PC, HC
        else: out.append(w[:1] + w[1:].lower())
    return ' '.join(out)

def leer(h):
    """Devuelve los partidos del SMB: {j, fecha, hora, casa, rival, res, idp}"""
    P = []
    for tr in re.findall(r'<tr[^>]*gamedate="(\d{8})"[^>]*>(.*?)</tr>', h, re.S):
        g, cuerpo = tr
        equipos = [H.unescape(x).strip() for x in re.findall(r'nombre_junto_logo">\s*([^<]+?)\s*</div>', cuerpo)]
        clubes = re.findall(r'logos_clubes/(\d+)[._]', cuerpo)
        if len(equipos) < 2 or g == '00000000' or any('DESCANSO' in e.upper() for e in equipos): continue
        smb = [i for i in (0, 1) if (len(clubes) > i and clubes[i] == CLUB_SMB) or 'BLANCA' in equipos[i].upper()]
        if not smb: continue
        casa = smb[0] == 0
        hora = re.search(r'<td[^>]*>\s*(\d{1,2}:\d{2})\s*</td>', cuerpo)
        jor = re.search(r'JORNADA\s+(\d+)', cuerpo)
        res = re.search(r'web_link_td"[^>]*>\s*(\d+)\s*-\s*(\d+)\s*</td>', cuerpo)
        idp = re.search(r'fichapartido_(\d+)', cuerpo)
        P.append({'j': int(jor.group(1)) if jor else None, 'fecha': f'{g[:4]}-{g[4:6]}-{g[6:]}', 'hora': hora.group(1) if hora else '',
                  'casa': casa, 'rival': equipos[1 if casa else 0], 'res': (f'{res.group(1)}-{res.group(2)}' if casa else f'{res.group(2)}-{res.group(1)}') if res else '',
                  'idp': idp.group(1) if idp else ''})
    return P

def main():
    args = sys.argv[1:]; local = args[args.index('--local') + 1] if '--local' in args else None; seco = '--seco' in args
    viejo = json.load(open(JSON, encoding='utf-8'))
    antes = {x['id']: x for x in viejo['partidos']}
    nuevos, log = [], []
    for idc, cat, pre in LIGAS:
        previos = [x for x in viejo['partidos'] if x['id'].startswith(pre + '-')]
        try:
            h = open(os.path.join(local, f'cal_{idc}_calendario_btn.html'), encoding='utf-8').read() if local else descargar(idc)
            L = leer(h)
        except Exception as e:
            L = []; log.append(f'{cat}: no se ha podido leer ({e!r})')
        if not L or len(L) < len(previos) / 2:
            log.append(f'{cat}: {len(L)} partidos leídos (había {len(previos)}): se dejan los de antes'); nuevos += previos; continue
        for x in L:
            pid = f'{pre}-{x["j"]}' if x['j'] else f'{pre}-{x["fecha"]}'
            a = antes.get(pid, {})
            # el nombre del rival se deja como estaba si es el mismo equipo (está escrito a mano y bonito)
            rival = a['rival'] if a and __import__('difflib').SequenceMatcher(None, bonito(x['rival']).lower(), a.get('rival', '').lower()).ratio() >= 0.6 else bonito(x['rival'])
            nuevos.append({'id': pid, 'cat': cat, 'j': x['j'], 'fecha': x['fecha'], 'hora': x['hora'], 'rival': rival, 'casa': x['casa'], 'res': x['res']})
        log.append(f'{cat}: {len(L)} partidos')
    orden = {'s15': 0, 's17': 1, 'af': 2}; nuevos.sort(key=lambda x: (orden.get(x['id'].split('-')[0], 3), x['fecha'], x['hora']))
    cambios = []
    for x in nuevos:
        a = antes.get(x['id'])
        if not a: cambios.append(f'nuevo {x["id"]} {x["fecha"]} {x["rival"]}')
        else:
            d = [f'{k}: {a.get(k)!r} → {x[k]!r}' for k in ('fecha', 'hora', 'res', 'rival', 'casa') if a.get(k) != x[k]]
            if d: cambios.append(f'{x["id"]} ' + ', '.join(d))
    for k in antes:
        if k not in {x['id'] for x in nuevos}: cambios.append(f'quitado {k}')
    print('\n'.join(log)); print('\n'.join(cambios) or 'Sin cambios')
    if cambios and not seco:
        viejo['partidos'] = nuevos; viejo['actualizado'] = __import__('datetime').date.today().isoformat()
        viejo['nota'] = 'res = goles del SMB - goles del rival. hora vacía = la federación todavía no la ha puesto. Se actualiza solo cada mañana (fuente/partidos_fmp.py).'
        txt = '{\n' + ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in viejo.items() if k != 'partidos')
        txt += ',\n  "partidos": [\n' + ',\n'.join('    ' + json.dumps(x, ensure_ascii=False).replace('", "', '", "') for x in nuevos) + '\n  ]\n}\n'
        open(JSON, 'w', encoding='utf-8').write(txt)
if __name__ == '__main__': main()
