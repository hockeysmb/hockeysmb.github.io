// ================= dibujo (simbología del libro) =================
const COL = { atk: 'var(--g-atk)', def: 'var(--g-def)' };
const DRAW_COL = { ink: 'var(--g-ink)', atk: 'var(--g-atk)', def: 'var(--g-def)', red: 'var(--g-coach)' };
const DRAW_NAMES = { ink: 'Negro', atk: 'Atacante', def: 'Defensor', red: 'Rojo' };
// conos de colores: la pista es papel, así que los colores son fijos en los dos temas
const CONE_COL = { azul: '#1f3cff', rojo: '#e01b1b', amarillo: '#f5c400', verde: '#1f9d55', naranja: '#ff7a00', blanco: '#ffffff' };
const CONE_NAMES = { azul: ['Azul', 'azul', 'azules'], rojo: ['Rojo', 'rojo', 'rojos'], amarillo: ['Amarillo', 'amarillo', 'amarillos'], verde: ['Verde', 'verde', 'verdes'], naranja: ['Naranja', 'naranja', 'naranjas'], blanco: ['Blanco', 'blanco', 'blancos'] };
const CONE_FEM = { azul: ['Azul', 'azul', 'azules'], rojo: ['Roja', 'roja', 'rojas'], amarillo: ['Amarilla', 'amarilla', 'amarillas'], verde: ['Verde', 'verde', 'verdes'], naranja: ['Naranja', 'naranja', 'naranjas'], blanco: ['Blanca', 'blanca', 'blancas'] };
const coneKey = it => CONE_COL[it && it.c] ? it.c : 'azul';
const coneFill = it => it && CONE_COL[it.c] ? CONE_COL[it.c] : 'var(--g-cone)';
const coneStroke = k => k === 'blanco' || k === 'amarillo' ? ' stroke="#2b2b2b" stroke-width="0.12" stroke-linejoin="round"' : '';
function simplify(pts, eps) {
  // Ramer-Douglas-Peucker: deja el trazo con pocos puntos sin cambiar su forma
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0, max = 0;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / L;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}
const FONT = 'Barlow, Arial, sans-serif';
const LOGO = '__LOGO__';
let svgSeq = 0;

function curvePath(pts) {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0]},${p2[1]}`;
  }
  return d;
}
function lastDir(pts) {
  // dirección final de la curva (para la punta de flecha)
  if (pts.length === 2) return [pts[0], pts[1]];
  const n = pts.length, p1 = pts[n - 2], p2 = pts[n - 1], p0 = pts[n - 3] || p1;
  const c2 = [p2[0] - (p2[0] - p1[0]) / 6, p2[1] - (p2[1] - p1[1]) / 6];
  const from = Math.hypot(p2[0] - c2[0], p2[1] - c2[1]) < 0.05 ? p1 : c2;
  return [from, p2];
}
function head(tip, from, color, size) {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const l = [tip[0] - size * Math.cos(a - 0.45), tip[1] - size * Math.sin(a - 0.45)];
  const r = [tip[0] - size * Math.cos(a + 0.45), tip[1] - size * Math.sin(a + 0.45)];
  return `<path d="M${l[0].toFixed(2)},${l[1].toFixed(2)} L${tip[0]},${tip[1]} L${r[0].toFixed(2)},${r[1].toFixed(2)} Z" fill="${color}"/>`;
}
function arrowSVG(a, attrs = '') {
  const pts = a.pts;
  if (!pts || pts.length < 2) return '';
  if (a.kind === 'draw') {
    const c = DRAW_COL[a.color] || DRAW_COL.ink, d = curvePath(pts);
    let hd = '';
    if (a.head) { const [from, tip] = lastDir(pts); hd = head(tip, from, c, 1.35); }
    return `<g ${attrs}><path d="${d}" fill="none" stroke="transparent" stroke-width="2.4"/><path d="${d}" fill="none" stroke="${c}" stroke-width="0.45" stroke-linecap="round" stroke-linejoin="round"/>${hd}</g>`;
  }
  const [from, tip] = lastDir(pts);
  if (a.kind === 'tiro') {
    const p = pts[0], ang = Math.atan2(tip[1] - p[1], tip[0] - p[0]), nx = -Math.sin(ang) * 0.38, ny = Math.cos(ang) * 0.38;
    const back = [tip[0] - Math.cos(ang) * 1.1, tip[1] - Math.sin(ang) * 1.1];
    return `<g ${attrs}><line x1="${p[0]}" y1="${p[1]}" x2="${tip[0]}" y2="${tip[1]}" stroke="transparent" stroke-width="2.4"/><g stroke="var(--g-ink)" stroke-width="0.34"><line x1="${p[0] + nx}" y1="${p[1] + ny}" x2="${back[0] + nx}" y2="${back[1] + ny}"/><line x1="${p[0] - nx}" y1="${p[1] - ny}" x2="${back[0] - nx}" y2="${back[1] - ny}"/></g>${head(tip, p, 'var(--g-ink)', 1.5)}</g>`;
  }
  const c = a.kind === 'pase' ? 'var(--g-ink)' : (COL[a.team] || COL.atk);
  const style = a.kind === 'pase' ? 'stroke-dasharray="1.3 0.9" stroke-width="0.36"'
    : a.kind === 'cond' ? 'stroke-dasharray="0.12 0.62" stroke-linecap="round" stroke-width="0.5"'
    : 'stroke-width="0.4"';
  const d = curvePath(pts);
  return `<g ${attrs}><path d="${d}" fill="none" stroke="transparent" stroke-width="2.4"/><path d="${d}" fill="none" stroke="${c}" ${style}/>${head(tip, from, c, 1.35)}${a.both ? head(pts[0], pts[1], c, 1.35) : ''}</g>`;
}
function ringSVG(x, y, color, label, labelColor) {
  // símbolo del libro: anillo grueso abierto con el número dentro
  const r = 1.55, a1 = -Math.PI / 4 + 0.55, a2 = -Math.PI / 4 - 0.55 + 2 * Math.PI;
  const s = [x + r * Math.cos(a1), y + r * Math.sin(a1)], e = [x + r * Math.cos(a2), y + r * Math.sin(a2)];
  let out = `<circle cx="${x}" cy="${y}" r="1.95" fill="transparent"/><circle cx="${x}" cy="${y}" r="1.15" fill="var(--g-paper)"/>`;
  out += `<path d="M${s[0].toFixed(2)},${s[1].toFixed(2)} A${r},${r} 0 1 1 ${e[0].toFixed(2)},${e[1].toFixed(2)}" fill="none" stroke="${color}" stroke-width="0.8"/>`;
  if (label) out += `<text x="${x}" y="${(y + 0.58).toFixed(2)}" font-size="1.6" font-weight="700" fill="${labelColor || color}" text-anchor="middle" font-family="${FONT}">${esc(label)}</text>`;
  return out;
}
function goalSVG(x, y, face, pid) {
  // portería: red naranja semicircular detrás de la línea de gol; face = hacia dónde mira la boca
  const r = 3.6, back = face === 'right' ? -1 : 1;
  const sweep = face === 'right' ? 0 : 1;
  return `<path d="M${x},${y - r} A${r},${r} 0 0 ${sweep} ${x},${y + r} Z" fill="url(#${pid})" stroke="var(--g-goal)" stroke-width="0.45"/><line x1="${x}" y1="${y - r}" x2="${x}" y2="${y + r}" stroke="var(--g-goal)" stroke-width="0.5"/>`;
}
function goalRot(it) {
  // 0 = la boca mira a la derecha; 90 = abajo; 180 = izquierda; 270 = arriba
  if (typeof it.rot === 'number') return ((it.rot % 360) + 360) % 360;
  return it.face === 'left' ? 180 : 0;
}
function bidonSVG(x, y) {
  // bidón visto desde arriba: círculo azul con borde y reflejo, distinto del cono triangular
  return `<circle cx="${x}" cy="${y}" r="1.4" fill="transparent"/><circle cx="${x}" cy="${y}" r="1.05" fill="var(--g-bidon)" stroke="var(--g-bidon-rim)" stroke-width="0.32"/><circle cx="${x}" cy="${y}" r="0.42" fill="none" stroke="var(--g-bidon-rim)" stroke-width="0.2"/>`;
}
// material de entrenamiento (visto desde arriba, a escala: 2,5 unidades = 1 m)
const COLORED = ['cone', 'chino', 'aro', 'pica', 'valla'];
const ROTATABLE = ['goal', 'stick', 'valla', 'escalera'];
const MATERIALS = ['cone', 'chino', 'aro', 'pica', 'valla', 'stick', 'escalera', 'bidon', 'goal'];
const MAT_NAMES = { cone: 'Cono', chino: 'Chino (platillo)', aro: 'Aro', pica: 'Pica', valla: 'Valla', stick: 'Stick', escalera: 'Escalera', bidon: 'Bidón', goal: 'Portería' };
const rotOf = it => typeof it.rot === 'number' ? ((it.rot % 360) + 360) % 360 : 0;
function matSVG(it) {
  const x = it.x, y = it.y, col = coneFill(it), st = coneStroke(coneKey(it)), rot = `transform="rotate(${rotOf(it)} ${x} ${y})"`;
  switch (it.type) {
    case 'chino': return `<circle cx="${x}" cy="${y}" r="1.2" fill="transparent"/><circle cx="${x}" cy="${y}" r="0.6" fill="${col}"${st}/><circle cx="${x}" cy="${y}" r="0.2" fill="#ffffff"/>`;
    case 'aro': return `<circle cx="${x}" cy="${y}" r="1.4" fill="transparent"/><circle cx="${x}" cy="${y}" r="1.05" fill="none" stroke="${col}" stroke-width="0.3"/>`;
    case 'pica': return `<circle cx="${x}" cy="${y}" r="1.1" fill="transparent"/><circle cx="${x}" cy="${y}" r="0.42" fill="${col}" stroke="#2b2b2b" stroke-width="0.12"/>`;
    case 'valla': return `<g ${rot}><rect x="${x - 2}" y="${y - 1}" width="4" height="2" fill="transparent"/><rect x="${x - 1.6}" y="${y - 0.25}" width="3.2" height="0.5" rx="0.12" fill="${col}"${st}/><rect x="${x - 1.75}" y="${y - 0.7}" width="0.28" height="1.4" fill="#2b2b2b"/><rect x="${x + 1.47}" y="${y - 0.7}" width="0.28" height="1.4" fill="#2b2b2b"/></g>`;
    case 'stick': return `<g ${rot}><rect x="${x - 2.3}" y="${y - 1}" width="4.7" height="2.2" fill="transparent"/><line x1="${x - 2}" y1="${y}" x2="${x + 1.3}" y2="${y}" stroke="#8a5a2b" stroke-width="0.4" stroke-linecap="round"/><path d="M${x + 1.3},${y} Q${x + 2.1},${y} ${x + 2.1},${y + 0.95}" fill="none" stroke="#1b1b1b" stroke-width="0.55" stroke-linecap="round"/></g>`;
    case 'escalera': { let rungs = ''; for (let k = -2; k <= 2; k += 0.8) rungs += `<line x1="${x + k}" y1="${y - 0.62}" x2="${x + k}" y2="${y + 0.62}" stroke="#2b2b2b" stroke-width="0.12"/>`;
      return `<g ${rot}><rect x="${x - 2.6}" y="${y - 1}" width="5.2" height="2" fill="transparent"/><rect x="${x - 2.4}" y="${y - 0.62}" width="4.8" height="1.24" fill="none" stroke="#2b2b2b" stroke-width="0.14"/>${rungs}</g>`; }
  }
  return '';
}
function itemSVG(it, attrs = '', pid = '') {
  if (['chino', 'aro', 'pica', 'valla', 'stick', 'escalera'].includes(it.type)) return `<g ${attrs}>${matSVG(it)}</g>`;
  switch (it.type) {
    case 'atk': return `<g ${attrs}>${ringSVG(it.x, it.y, COL.atk, it.n)}</g>`;
    case 'def': return `<g ${attrs}>${ringSVG(it.x, it.y, COL.def, it.n)}</g>`;
    case 'gk': return `<g ${attrs}>${ringSVG(it.x, it.y, 'var(--g-gk)', '')}</g>`;
    case 'coach': return `<g ${attrs}>${ringSVG(it.x, it.y, 'var(--g-coach)', 'C')}</g>`;
    case 'ball': return `<g ${attrs}><circle cx="${it.x}" cy="${it.y}" r="1.4" fill="transparent"/><circle cx="${it.x}" cy="${it.y}" r="0.55" fill="var(--g-ink)"/></g>`;
    case 'cone': return `<g ${attrs}><circle cx="${it.x}" cy="${it.y}" r="1.4" fill="transparent"/><path d="M${it.x},${it.y - 0.95} L${it.x + 0.9},${it.y + 0.65} L${it.x - 0.9},${it.y + 0.65} Z" fill="${coneFill(it)}"${coneStroke(coneKey(it))}/></g>`;
    case 'text': return `<g ${attrs}><circle cx="${it.x}" cy="${it.y - 0.5}" r="1.4" fill="transparent"/><text x="${it.x}" y="${it.y}" font-size="1.7" font-weight="700" fill="var(--g-ink)" text-anchor="middle" font-family="${FONT}">${esc(it.text || '')}</text></g>`;
    case 'label': { const tx = esc(it.text || ''), w = Math.max(3, (it.text || '').length * 1.0);
      return `<g ${attrs}><rect x="${it.x - w / 2 - 0.3}" y="${it.y - 1.8}" width="${w + 0.6}" height="2.5" fill="transparent"/><text x="${it.x}" y="${it.y}" font-size="1.9" font-weight="700" fill="var(--g-ink)" stroke="var(--g-paper)" stroke-width="0.55" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" font-family="${FONT}">${tx}</text></g>`; }
    case 'goal': return `<g ${attrs}><rect x="${it.x - 3.8}" y="${it.y - 3.8}" width="7.6" height="7.6" fill="transparent"/><g transform="rotate(${goalRot(it)} ${it.x} ${it.y})">${goalSVG(it.x, it.y, 'right', pid)}</g></g>`;
    case 'bidon': return `<g ${attrs}>${bidonSVG(it.x, it.y)}</g>`;
  }
  return '';
}
function pitchSVG(pid) {
  const area = x0 => `<rect x="${x0}" y="13.3" width="13.9" height="22.9" fill="var(--g-area)" stroke="#8a8f99" stroke-width="0.14"/>`;
  return `<defs><pattern id="${pid}" width="0.7" height="0.7" patternUnits="userSpaceOnUse"><rect width="0.7" height="0.7" fill="#ffffff"/><path d="M0,0 V0.7 M0,0 H0.7" stroke="#8a8f99" stroke-width="0.09"/></pattern></defs>
    <rect x="0" y="0" width="100" height="50" rx="2.4" fill="var(--g-paper)" stroke="var(--g-line)" stroke-width="0.45"/>
    <line x1="50" y1="0" x2="50" y2="50" stroke="var(--g-line)" stroke-width="0.14"/>
    <circle cx="50" cy="25" r="7.4" fill="var(--g-paper)" stroke="var(--g-line)" stroke-width="0.14"/>
    ${area(7.4)}${area(78.7)}
    <path d="M7.4,21.4 A3.6,3.6 0 0 1 7.4,28.6" fill="none" stroke="#8a8f99" stroke-width="0.12"/>
    <path d="M92.6,21.4 A3.6,3.6 0 0 0 92.6,28.6" fill="none" stroke="#8a8f99" stroke-width="0.12"/>
    ${goalSVG(7.4, 25, 'right', pid)}${goalSVG(92.6, 25, 'left', pid)}
    <circle cx="21.3" cy="25" r="0.2" fill="var(--g-line)"/><circle cx="25.9" cy="25" r="0.2" fill="var(--g-line)"/>
    <circle cx="78.7" cy="25" r="0.2" fill="var(--g-line)"/><circle cx="74.1" cy="25" r="0.2" fill="var(--g-line)"/>`;
}
function diagramInner(dg, opts = {}) {
  const pid = opts.pid || ('net' + (++svgSeq));
  const parts = [pitchSVG(pid)];
  const items = dg.items || [], arrows = dg.arrows || [];
  items.filter(i => i.type === 'goal').forEach(i => parts.push(itemSVG(i, opts.attrs ? opts.attrs('item', i) : '', pid)));
  items.filter(i => MATERIALS.includes(i.type) && i.type !== 'goal').forEach(i => parts.push(itemSVG(i, opts.attrs ? opts.attrs('item', i) : '')));
  arrows.forEach(a => parts.push(arrowSVG(a, opts.attrs ? opts.attrs('arrow', a) : '')));
  items.filter(i => !MATERIALS.includes(i.type)).forEach(i => parts.push(itemSVG(i, opts.attrs ? opts.attrs('item', i) : '')));
  return parts.join('');
}
function diagramSVG(dg, label, opts) {
  // 13 nov: en las tarjetas del banco el dibujo se hace más gordo (`mini`). A 170 px, con el trazo
  // normal, un ejercicio no se distinguía del de al lado.
  const mini = opts && opts.mini ? ' class="dg-mini"' : '';
  return `<svg viewBox="-1 -1 102 52"${mini} role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${diagramInner(dg)}</svg>`;
}

// ================= leyenda =================
let LEGEND_HTML = '';
(function legend() {
  const L = (inner, t) => `<span class="item"><svg viewBox="0 0 20 9" aria-hidden="true">${inner}</svg>${t}</span>`;
  const ring = (c, lbl) => { const s = 2.2; return `<g transform="translate(10 4.5) scale(${s}) translate(-10 -4.5)">${ringSVG(10, 4.5, c, lbl)}</g>`; };
  const hd = c => `<path d="M14,2 L18.5,4.5 L14,7 Z" fill="${c}"/>`;
  LEGEND_HTML = [
    L(ring(COL.atk, '1'), 'Atacante'), L(ring(COL.def, '1'), 'Defensor'), L(ring('var(--g-gk)', ''), 'Portero'), L(ring('var(--g-coach)', 'C'), 'Entrenador'),
    L(`<line x1="1" y1="4.5" x2="15" y2="4.5" stroke="var(--g-ink)" stroke-width="0.8" stroke-dasharray="2.2 1.4"/>${hd('var(--g-ink)')}`, 'Pase'),
    L(`<line x1="5" y1="4.5" x2="15" y2="4.5" stroke="var(--g-ink)" stroke-width="0.8" stroke-dasharray="2.2 1.4"/>${hd('var(--g-ink)')}<path d="M6,2 L1.5,4.5 L6,7 Z" fill="var(--g-ink)"/>`, 'Pase de ida y vuelta'),
    L(`<line x1="1" y1="3.6" x2="15" y2="3.6" stroke="var(--g-ink)" stroke-width="0.7"/><line x1="1" y1="5.4" x2="15" y2="5.4" stroke="var(--g-ink)" stroke-width="0.7"/>${hd('var(--g-ink)')}`, 'Tiro, regate'),
    L(`<line x1="1" y1="4.5" x2="15" y2="4.5" stroke="var(--g-atk)" stroke-width="1.1" stroke-dasharray="0.2 1.3" stroke-linecap="round"/>${hd('var(--g-atk)')}`, 'Conducción'),
    L(`<line x1="1" y1="4.5" x2="15" y2="4.5" stroke="var(--g-atk)" stroke-width="0.9"/>${hd('var(--g-atk)')}`, 'Movimiento sin bola'),
    L(`<path d="M1,6 C4,1 7,8 10,4 S16,2 18,5" fill="none" stroke="var(--g-coach)" stroke-width="0.9" stroke-linecap="round"/>`, 'Dibujo libre'),
    L(`<circle cx="10" cy="4.5" r="1.5" fill="var(--g-ink)"/>`, 'Bola'),
    L(`<path d="M5,1.6 L7.6,6.8 L2.4,6.8 Z" fill="var(--g-cone)"/><path d="M10,1.6 L12.6,6.8 L7.4,6.8 Z" fill="${CONE_COL.rojo}"/><path d="M15,1.6 L17.6,6.8 L12.4,6.8 Z" fill="${CONE_COL.amarillo}"${coneStroke('amarillo').replace('0.12', '0.3')}/>`, 'Conos (de colores)'),
    L(`<g transform="translate(10 4.5) scale(2.4) translate(-10 -4.5)">${bidonSVG(10, 4.5)}</g>`, 'Bidón'),
    L(`<g transform="translate(10 4.5) scale(3) translate(-10 -4.5)">${matSVG({ type: 'chino', x: 10, y: 4.5 })}</g>`, 'Chino (platillo)'),
    L(`<g transform="translate(10 4.5) scale(2.6) translate(-10 -4.5)">${matSVG({ type: 'aro', x: 10, y: 4.5, c: 'rojo' })}</g>`, 'Aro'),
    L(`<g transform="translate(10 4.5) scale(3) translate(-10 -4.5)">${matSVG({ type: 'pica', x: 10, y: 4.5, c: 'amarillo' })}</g>`, 'Pica'),
    L(`<g transform="translate(10 4.5) scale(2.6) translate(-10 -4.5)">${matSVG({ type: 'valla', x: 10, y: 4.5, c: 'rojo' })}</g>`, 'Valla'),
    L(`<g transform="translate(10 4.5) scale(2.4) translate(-10 -4.5)">${matSVG({ type: 'stick', x: 10, y: 4.5 })}</g>`, 'Stick en el suelo'),
    L(`<g transform="translate(10 4.5) scale(1.6) translate(-10 -4.5)">${matSVG({ type: 'escalera', x: 10, y: 4.5 })}</g>`, 'Escalera de coordinación'),
    L(`<text x="10" y="6.3" font-size="5" font-weight="600" fill="var(--g-ink)" text-anchor="middle" font-family="${FONT}">Zona 1</text>`, 'Texto'),
    L(`<defs><pattern id="net-leg" width="0.7" height="0.7" patternUnits="userSpaceOnUse"><rect width="0.7" height="0.7" fill="#ffffff"/><path d="M0,0 V0.7 M0,0 H0.7" stroke="#8a8f99" stroke-width="0.09"/></pattern></defs><g transform="translate(10 4.5) scale(0.95) translate(-10 -4.5)">${goalSVG(8.6, 4.5, 'right', 'net-leg')}</g>`, 'Portería (gira en cualquier dirección)'),
    L(`<text x="10" y="7.2" font-size="7" font-weight="700" fill="var(--g-ink)" text-anchor="middle" font-family="${FONT}">1</text>`, 'Orden de los pases'),
  ].join('');
  document.getElementById('legend').innerHTML = LEGEND_HTML;
})();

