// Mascotas del reto (26 oct): animalitos que se compran con monedas y acompañan al personaje
// (en la liga, los duelos, su ficha y la partida). Dibujadas aquí mismo en SVG, estilo «kawaii».
// SMBMascotas.LISTA = [[id, nombre, rareza, precio]], SMBMascotas.svg(id), SMBMascotas.RAREZA
(function () {
  const RAREZA = { comun: ['Común', '#8a939c'], rara: ['Rara', '#2c7be5'], epica: ['Épica', '#8a3ffc'], legendaria: ['Legendaria', '#d99a00'] };
  const LISTA = [
    ['perro', 'Perrito', 'comun', 600], ['gato', 'Gatito', 'comun', 600], ['conejo', 'Conejito', 'comun', 700], ['pato', 'Patito', 'comun', 700],
    ['rana', 'Ranita', 'comun', 800], ['hamster', 'Hámster', 'comun', 800], ['cerdito', 'Cerdito', 'comun', 900],
    ['zorro', 'Zorrito', 'rara', 1600], ['panda', 'Panda', 'rara', 1800], ['pinguino', 'Pingüino', 'rara', 1800], ['koala', 'Koala', 'rara', 2000],
    ['buho', 'Búho', 'rara', 2000], ['tortuga', 'Tortuga', 'rara', 2200],
    ['axolote', 'Ajolote', 'epica', 4200], ['tigre', 'Tigre', 'epica', 4500], ['mapache', 'Mapache', 'epica', 4800], ['osopolar', 'Oso polar', 'epica', 5000], ['llama', 'Llama', 'epica', 5200],
    ['unicornio', 'Unicornio', 'legendaria', 10000], ['dragon', 'Dragón', 'legendaria', 12000], ['fenix', 'Fénix', 'legendaria', 13000], ['galactico', 'Gato galáctico', 'legendaria', 15000],
    // 27 oct: más animales (la mosca la pidieron ellas)
    ['mosca', 'Mosca', 'comun', 600], ['abeja', 'Abejita', 'comun', 700], ['mariquita', 'Mariquita', 'comun', 700], ['oveja', 'Ovejita', 'comun', 800],
    ['caracol', 'Caracol', 'rara', 1800], ['erizo', 'Erizo', 'rara', 1900], ['pulpo', 'Pulpo', 'rara', 2100],
    ['ballena', 'Ballena', 'epica', 4600], ['leon', 'León', 'epica', 4800], ['perezoso', 'Perezoso', 'epica', 5000],
    ['medusa', 'Medusa de neón', 'legendaria', 14000],
    // Halloween (quinto campo 'hw'): solo salen del cofre de Halloween, que está unos días
    ['calabaza', 'Calabacita', 'comun', 0, 'hw'], ['murcielago', 'Murciélago', 'comun', 0, 'hw'], ['arana', 'Arañita', 'comun', 0, 'hw'],
    ['fantasma', 'Fantasmita', 'rara', 0, 'hw'], ['gatobrujo', 'Gato brujo', 'rara', 0, 'hw'],
    ['momia', 'Momia', 'epica', 0, 'hw'], ['vampiro', 'Vampirito', 'epica', 0, 'hw'],
    ['reycalabaza', 'Rey calabaza', 'legendaria', 0, 'hw'],
  ];
  const EVENTOS = { hw: 'Halloween' };
  let n = 0;
  const E = (x, y, rx, ry, f, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${extra}/>`;
  const C = (x, y, r, f, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${extra}/>`;
  const Pth = (d, f, extra = '') => `<path d="${d}" fill="${f}" ${extra}/>`;
  // cara básica: ojos grandes con brillo, mofletes y boquita. MOOD (27 oct, tamagotchi): 'feliz', 'triste', 'dormido' o '' (normal)
  let MOOD = '';
  const ojoArco = (x, y, arriba, c) => `<path d="M${x - 4.2} ${y + (arriba ? 1.5 : -0.5)} Q${x} ${y + (arriba ? -4 : 3.2)} ${x + 4.2} ${y + (arriba ? 1.5 : -0.5)}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  function cara(o = {}) {
    const y = o.y || 54, dx = o.dx || 11, ec = o.ec || '#2a1d1a', r = o.r || 4.6;
    let s = '';
    if (o.mask) s += E(50 - dx, y, 9, 7, o.mask) + E(50 + dx, y, 9, 7, o.mask);
    const ojoC = o.mask ? '#fff' : (o.pupil || ec);
    if (MOOD === 'dormido') s += ojoArco(50 - dx, y, false, ojoC) + ojoArco(50 + dx, y, false, ojoC);
    else if (MOOD === 'feliz') s += ojoArco(50 - dx, y, true, ojoC) + ojoArco(50 + dx, y, true, ojoC);
    else if (o.pupil) [50 - dx, 50 + dx].forEach(x => { s += C(x, y, r, '#fff') + C(x + 0.6, y + 0.4, r * 0.62, o.pupil) + C(x + 1.4, y - 1, 1.1, '#fff'); });
    else s += C(50 - dx, y, r, ec) + C(50 + dx, y, r, ec) + C(50 - dx + 1.6, y - 1.8, 1.6, '#fff') + C(50 + dx + 1.6, y - 1.8, 1.6, '#fff');
    if (MOOD === 'triste') s += `<path d="M${50 - dx - 5} ${y - 7} L${50 - dx + 4} ${y - 10} M${50 + dx - 4} ${y - 10} L${50 + dx + 5} ${y - 7}" stroke="${ojoC}" stroke-width="1.8" stroke-linecap="round"/>` + `<path d="M${50 - dx - 1} ${y + 5} q-2.6 4.2 0 5.6 q2.6 -1.4 0 -5.6 Z" fill="#7cc4ff"/>`;
    if (!o.noBlush) s += E(50 - dx - 6, y + 8, 4.5, 2.6, o.blush || '#ff9fb0', 'opacity=".7"') + E(50 + dx + 6, y + 8, 4.5, 2.6, o.blush || '#ff9fb0', 'opacity=".7"');
    if (o.beak) s += Pth(`M${50 - 5} ${y + 5} L${50 + 5} ${y + 5} L50 ${y + 12} Z`, o.beak);
    else if (o.snout) s += E(50, y + 9, 8, 6, o.snout) + C(47, y + 9, 1.4, '#a84f5e') + C(53, y + 9, 1.4, '#a84f5e');
    else { const my = o.nose ? y + 10 : y + 9;
      if (o.nose) s += E(50, y + 6, 3, 2.2, o.nose);
      if (MOOD === 'feliz') s += Pth(`M45.5 ${my - 0.5} Q50 ${my + 7} 54.5 ${my - 0.5} Z`, '#8a2b3c') + E(50, my + 3.2, 2.4, 1.4, '#ff8fa6');
      else if (MOOD === 'triste') s += Pth(`M46 ${my + 2.5} Q50 ${my - 1.5} 54 ${my + 2.5}`, 'none', 'stroke="#2a1d1a" stroke-width="1.5" stroke-linecap="round"');
      else if (MOOD === 'dormido') s += E(50, my + 1, 1.8, 1.4, '#8a2b3c');
      else s += Pth(`M46 ${my} Q48 ${my + 2.5} 50 ${my} Q52 ${my + 2.5} 54 ${my}`, 'none', 'stroke="#2a1d1a" stroke-width="1.4" stroke-linecap="round"'); }
    return s;
  }
  const cuerpo = (c, b) => E(50, 76, 24, 16, c) + (b ? E(50, 79, 14, 10, b) : '') + C(50, 55, 27, c);
  const orejasGato = (c, i) => Pth('M27 44 L30 18 L46 32 Z', c) + Pth('M73 44 L70 18 L54 32 Z', c) + Pth('M31 38 L32 25 L41 32 Z', i) + Pth('M69 38 L68 25 L59 32 Z', i);
  const orejasRedondas = (c, i, r = 9) => C(29, 33, r, c) + C(71, 33, r, c) + (i ? C(29, 33, r * 0.55, i) + C(71, 33, r * 0.55, i) : '');
  const D = {
    perro: () => cuerpo('#d9a066', '#f3d7b3') + E(25, 52, 8, 16, '#8a5a2b', 'transform="rotate(18 25 52)"') + E(75, 52, 8, 16, '#8a5a2b', 'transform="rotate(-18 75 52)"') + E(62, 46, 7, 6, '#f3d7b3') + cara({ nose: '#2a1d1a' }),
    gato: () => orejasGato('#9aa3ad', '#ffc2cf') + cuerpo('#9aa3ad', '#e6eaee') + Pth('M30 54 L18 52 M30 58 L18 60 M70 54 L82 52 M70 58 L82 60', 'none', 'stroke="#5c6670" stroke-width="1.2"') + cara({ nose: '#ff8fa6' }),
    conejo: () => E(38, 22, 7, 18, '#f4f0ec') + E(62, 22, 7, 18, '#f4f0ec') + E(38, 23, 3.5, 13, '#ffc2cf') + E(62, 23, 3.5, 13, '#ffc2cf') + cuerpo('#f4f0ec', '#ffffff') + cara({ nose: '#ff8fa6' }),
    pato: () => cuerpo('#ffd84d', '#ffe98f') + Pth('M48 28 Q50 18 56 24 Q52 26 50 30 Z', '#ffd84d') + E(26, 74, 8, 12, '#f5c400', 'transform="rotate(-25 26 74)"') + E(74, 74, 8, 12, '#f5c400', 'transform="rotate(25 74 74)"') + cara({ beak: '#ff8c1a' }),
    rana: () => cuerpo('#6fcf6a', '#c9f0b8') + C(36, 30, 11, '#6fcf6a') + C(64, 30, 11, '#6fcf6a') + C(36, 30, 6.5, '#fff') + C(64, 30, 6.5, '#fff') + C(36, 31, 4, '#2a1d1a') + C(64, 31, 4, '#2a1d1a') + C(37.5, 29.5, 1.4, '#fff') + C(65.5, 29.5, 1.4, '#fff')
      + Pth('M38 62 Q50 72 62 62', 'none', 'stroke="#2a1d1a" stroke-width="1.8" stroke-linecap="round"') + E(30, 60, 4.5, 2.6, '#ff9fb0', 'opacity=".7"') + E(70, 60, 4.5, 2.6, '#ff9fb0', 'opacity=".7"'),
    hamster: () => orejasRedondas('#f2b36b', '#ffc2cf', 7) + cuerpo('#f2b36b', '#fff1dc') + E(34, 62, 8, 7, '#fff1dc') + E(66, 62, 8, 7, '#fff1dc') + cara({ nose: '#ff8fa6', dx: 10 }),
    cerdito: () => Pth('M28 38 L30 24 L42 33 Z', '#ffb3c4') + Pth('M72 38 L70 24 L58 33 Z', '#ffb3c4') + cuerpo('#ffc2cf', '#ffd9e1') + cara({ snout: '#ff99b0', y: 50 }),
    zorro: () => Pth('M25 46 L26 14 L46 32 Z', '#f08a3c') + Pth('M75 46 L74 14 L54 32 Z', '#f08a3c') + Pth('M29 38 L29 22 L40 32 Z', '#2a1d1a') + Pth('M71 38 L71 22 L60 32 Z', '#2a1d1a') + cuerpo('#f08a3c', '#fff4ea')
      + Pth('M24 56 Q38 74 50 66 Q62 74 76 56 Q66 80 50 80 Q34 80 24 56 Z', '#fff4ea') + cara({ nose: '#2a1d1a' }),
    panda: () => orejasRedondas('#2a2a2a', null, 9) + cuerpo('#fafafa', '#ffffff') + E(26, 80, 7, 9, '#2a2a2a') + E(74, 80, 7, 9, '#2a2a2a') + cara({ mask: '#2a2a2a', pupil: '#2a1d1a', r: 4, nose: '#2a1d1a' }),
    pinguino: () => cuerpo('#2b3442', null) + E(50, 60, 20, 21, '#ffffff') + E(26, 74, 6, 13, '#2b3442', 'transform="rotate(20 26 74)"') + E(74, 74, 6, 13, '#2b3442', 'transform="rotate(-20 74 74)"') + E(42, 92, 6, 3, '#ff8c1a') + E(58, 92, 6, 3, '#ff8c1a') + cara({ beak: '#ff8c1a' }),
    koala: () => C(25, 38, 13, '#a3adb8') + C(75, 38, 13, '#a3adb8') + C(25, 38, 7.5, '#e9edf1') + C(75, 38, 7.5, '#e9edf1') + cuerpo('#a3adb8', '#e9edf1') + E(50, 61, 6.5, 8, '#3b3f45') + cara({ y: 51 }).replace(/<path[^>]*Q48[^>]*\/>/, ''),
    buho: () => Pth('M28 36 L26 18 L40 30 Z', '#8a5a3c') + Pth('M72 36 L74 18 L60 30 Z', '#8a5a3c') + cuerpo('#a8714a', '#f2dcc3') + C(39, 52, 11, '#fff3d9') + C(61, 52, 11, '#fff3d9') + Pth('M60 72 Q66 74 70 70 M30 70 Q34 74 40 72', 'none', 'stroke="#8a5a3c" stroke-width="2"') + cara({ beak: '#f5a623', r: 5.4 }),
    tortuga: () => E(50, 72, 32, 20, '#3f9a5a') + Pth('M30 72 L40 60 L60 60 L70 72 L60 84 L40 84 Z', '#57b874') + Pth('M40 60 L50 52 L60 60 M30 72 L20 72 M70 72 L80 72', 'none', 'stroke="#2f7a45" stroke-width="2"') + C(50, 44, 21, '#9ad88a') + cara({ y: 44, dx: 8, r: 4 }),
    axolote: () => [[22, 34, -40], [18, 46, -10], [22, 58, 20], [78, 34, 40], [82, 46, 10], [78, 58, -20]].map(([x, y, r]) => E(x, y, 10, 3.6, '#ff6fa3', `transform="rotate(${r} ${x} ${y})"`)).join('') + cuerpo('#ffb3d1', '#ffd9e8') + cara({ dx: 13, blush: '#ff6fa3' }),
    tigre: () => orejasRedondas('#f39a2a', '#fff4ea', 9) + cuerpo('#f39a2a', '#fff4ea') + Pth('M50 28 L46 38 L54 38 Z M24 52 L34 54 L24 58 Z M76 52 L66 54 L76 58 Z M40 30 L44 38 L38 36 Z M60 30 L56 38 L62 36 Z', '#2a1d1a') + E(50, 64, 10, 7, '#fff4ea') + cara({ nose: '#ff8fa6' }),
    mapache: () => Pth('M27 42 L30 20 L45 32 Z', '#8e939a') + Pth('M73 42 L70 20 L55 32 Z', '#8e939a') + cuerpo('#9aa0a6', '#e6e8ea') + Pth('M26 52 Q38 44 50 54 Q62 44 74 52 Q62 64 50 58 Q38 64 26 52 Z', '#3b3f45') + E(50, 66, 10, 7, '#e6e8ea') + cara({ nose: '#2a1d1a', pupil: '#2a1d1a', r: 4 }),
    osopolar: () => orejasRedondas('#f6f8fb', '#dde3ea', 8) + cuerpo('#f6f8fb', '#ffffff') + E(50, 64, 9, 6.5, '#e9eef4') + cara({ nose: '#2a1d1a' }),
    llama: () => E(36, 20, 5, 13, '#f1e3c8') + E(64, 20, 5, 13, '#f1e3c8') + C(40, 30, 8, '#fff8ec') + C(50, 27, 9, '#fff8ec') + C(60, 30, 8, '#fff8ec') + cuerpo('#f1e3c8', '#fff8ec') + Pth('M28 74 h44 v6 h-44 Z', '#e05297') + Pth('M28 74 h44', 'none', 'stroke="#2fb5a5" stroke-width="2" stroke-dasharray="4 3"') + cara({ nose: '#a8714a' }),
    unicornio: () => Pth('M29 50 Q14 40 22 22 Q26 36 36 38 Z', '#ff8fd1') + Pth('M30 58 Q12 56 14 36 Q22 50 34 48 Z', '#9b8cff') + Pth('M31 66 Q16 70 12 54 Q24 62 34 58 Z', '#7fd6ff')
      + Pth('M40 32 L44 22 L50 30 Z', '#fff') + cuerpo('#fbfaff', '#ffffff') + Pth('M50 4 L44 30 L56 30 Z', '#ffd84d') + Pth('M47 22 L53 18 M46 27 L54 23 M48 14 L52 12', 'none', 'stroke="#e0a800" stroke-width="1.5"') + cara({ blush: '#ff8fd1', nose: '#ffc2cf' }),
    dragon: () => Pth('M24 60 Q4 40 14 22 Q22 38 32 44 Z', '#7a4fd1') + Pth('M76 60 Q96 40 86 22 Q78 38 68 44 Z', '#7a4fd1') + Pth('M36 32 L32 16 L42 28 Z M64 32 L68 16 L58 28 Z', '#ffd84d') + cuerpo('#6bcf8a', '#d6f5c2')
      + Pth('M44 28 L47 22 L50 28 L53 22 L56 28 Z', '#ff6f6f') + C(45, 63, 1.4, '#2f7a45') + C(55, 63, 1.4, '#2f7a45') + cara({ dx: 11 }),
    fenix: () => Pth('M24 66 Q2 50 10 28 Q20 46 32 52 Z', '#ff7a1a') + Pth('M76 66 Q98 50 90 28 Q80 46 68 52 Z', '#ff7a1a') + Pth('M50 6 Q42 20 46 30 Q50 18 54 30 Q58 20 50 6 Z', '#ffd21f') + Pth('M40 12 Q38 24 44 32 Q42 22 40 12 Z M60 12 Q62 24 56 32 Q58 22 60 12 Z', '#ff3b1f')
      + cuerpo('#ff5a3c', '#ffd28a') + cara({ beak: '#ffd21f' }),
    galactico: () => orejasGato('#3b2a7a', '#8a6cff') + cuerpo('#2c1f5e', '#4b3a99') + [[30, 70, 1.8], [66, 78, 1.4], [44, 82, 1.2], [70, 66, 1.6], [36, 40, 1.2], [62, 36, 1.4]].map(([x, y, r]) => C(x, y, r, '#fff6c8')).join('')
      + Pth('M50 36 l2 4 4 .6 -3 3 .8 4 -3.8 -2 -3.8 2 .8 -4 -3 -3 4 -.6 Z', '#ffd84d') + cara({ ec: '#1a1033', blush: '#ff8fd1', nose: '#ff8fd1' }).replace(/#2a1d1a/g, '#c9b8ff'),
  };
  const lineas = (d, c, w = 2) => Pth(d, 'none', `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`);
  const calabazaBase = () => E(31, 62, 16, 22, '#f07a10') + E(69, 62, 16, 22, '#f07a10') + E(50, 62, 21, 25, '#ff9a2e') + lineas('M40 42 Q36 62 40 84 M60 42 Q64 62 60 84', '#e0700c', 1.6)
    + Pth('M47 38 Q49 26 56 23 L57 29 Q53 31 53 39 Z', '#4f7a2a') + Pth('M55 30 Q66 22 70 30 Q62 34 55 30 Z', '#6fae3a');
  Object.assign(D, {
    mosca: () => E(29, 38, 17, 10, 'rgba(205,232,255,.8)', 'stroke="#9fc4e0" stroke-width="1.2" transform="rotate(-30 29 38)"') + E(71, 38, 17, 10, 'rgba(205,232,255,.8)', 'stroke="#9fc4e0" stroke-width="1.2" transform="rotate(30 71 38)"')
      + lineas('M44 30 Q40 18 33 15 M56 30 Q60 18 67 15', '#2a2d33') + lineas('M32 86 l-6 6 M42 90 l-2 6 M58 90 l2 6 M68 86 l6 6', '#2a2d33', 2.4) + cuerpo('#4a4f57', '#6b717a')
      + C(37, 51, 11, '#d63b3b') + C(63, 51, 11, '#d63b3b') + C(34, 47, 3.2, '#fff', 'opacity=".85"') + C(60, 47, 3.2, '#fff', 'opacity=".85"') + C(40, 55, 1.4, '#a32020') + C(66, 55, 1.4, '#a32020')
      + lineas('M45 67 Q50 71 55 67', '#1c1e22', 1.6) + E(28, 64, 4, 2.4, '#ff9fb0', 'opacity=".7"') + E(72, 64, 4, 2.4, '#ff9fb0', 'opacity=".7"'),
    abeja: () => E(30, 32, 13, 9, 'rgba(255,255,255,.85)', 'stroke="#cfe3f5" stroke-width="1.2" transform="rotate(-25 30 32)"') + E(70, 32, 13, 9, 'rgba(255,255,255,.85)', 'stroke="#cfe3f5" stroke-width="1.2" transform="rotate(25 70 32)"')
      + lineas('M44 30 Q42 20 36 18 M56 30 Q58 20 64 18', '#2a1d1a') + C(36, 18, 2.6, '#2a1d1a') + C(64, 18, 2.6, '#2a1d1a') + cuerpo('#ffd23f', null) + E(50, 74, 23, 3.2, '#2a1d1a') + E(50, 84, 18, 2.8, '#2a1d1a') + cara({}),
    mariquita: () => lineas('M44 31 Q41 20 35 18 M56 31 Q59 20 65 18', '#2a1d1a') + C(35, 18, 2.6, '#2a1d1a') + C(65, 18, 2.6, '#2a1d1a') + cuerpo('#e53935', '#ff6f61')
      + C(30, 42, 4.5, '#2a1d1a') + C(70, 42, 4.5, '#2a1d1a') + C(50, 33, 4, '#2a1d1a') + C(34, 76, 4, '#2a1d1a') + C(66, 76, 4, '#2a1d1a') + cara({ blush: '#ffc2cf' }),
    oveja: () => [[30, 36], [40, 29], [50, 27], [60, 29], [70, 36], [25, 49], [75, 49], [28, 72], [72, 72], [40, 84], [60, 84]].map(([x, y]) => C(x, y, 10, '#fbfbf6')).join('') + E(50, 78, 22, 12, '#fbfbf6')
      + E(27, 52, 8, 4, '#f2d9c4', 'transform="rotate(-20 27 52)"') + E(73, 52, 8, 4, '#f2d9c4', 'transform="rotate(20 73 52)"') + E(50, 57, 18, 17, '#f2d9c4') + cara({ y: 55, nose: '#c98a8a', dx: 9, r: 4 }),
    caracol: () => E(46, 84, 34, 9, '#bfe3a0') + C(62, 60, 23, '#e8a05a') + lineas('M62 60 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0', '#b8692a', 2.4)
      + C(28, 62, 15, '#bfe3a0') + lineas('M24 50 L20 36 M32 50 L36 36', '#9cc97c', 2.6) + C(20, 35, 3, '#9cc97c') + C(36, 35, 3, '#9cc97c')
      + C(23, 60, 3.4, '#2a1d1a') + C(33, 60, 3.4, '#2a1d1a') + C(24, 59, 1.1, '#fff') + C(34, 59, 1.1, '#fff') + lineas('M25 67 Q28 70 31 67', '#2a1d1a', 1.4) + E(18, 66, 3, 2, '#ff9fb0', 'opacity=".7"') + E(38, 66, 3, 2, '#ff9fb0', 'opacity=".7"'),
    erizo: () => Pth('M18 64 L14 50 L22 50 L18 36 L28 40 L28 26 L38 32 L42 18 L50 28 L58 18 L62 32 L72 26 L72 40 L82 36 L78 50 L86 50 L82 64 Z', '#7a5230') + E(50, 78, 24, 14, '#a0714a')
      + C(50, 56, 25, '#a0714a') + E(50, 62, 19, 15, '#f6e0c2') + cara({ y: 58, nose: '#2a1d1a', dx: 9 }),
    pulpo: () => [[28, 70, 'M28 66 Q18 80 26 90 Q32 92 30 86'], [40, 72, 'M40 70 Q34 86 42 94'], [60, 72, 'M60 70 Q66 86 58 94'], [72, 70, 'M72 66 Q82 80 74 90 Q68 92 70 86']].map(([, , d]) => lineas(d, '#b07ae0', 8)).join('')
      + C(50, 48, 28, '#b07ae0') + C(36, 30, 3, '#d4b3f5') + C(60, 26, 2.4, '#d4b3f5') + C(68, 38, 2, '#d4b3f5') + cara({ y: 52, blush: '#ff8fd1' }),
    ballena: () => Pth('M80 60 Q94 46 96 36 Q88 44 82 46 Q86 38 84 30 Q78 44 78 56 Z', '#3b7fc4') + E(48, 62, 36, 25, '#4a90d9') + E(48, 75, 27, 11, '#cfe6ff')
      + lineas('M48 36 Q44 24 36 22 M48 36 Q52 24 60 22 M48 38 L48 22', '#7fc8ff', 2.4) + E(26, 76, 8, 4, '#3b7fc4', 'transform="rotate(25 26 76)"') + cara({ y: 58, dx: 10 }),
    leon: () => E(50, 82, 22, 12, '#f2b155') + [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => { const x = 50 + 27 * Math.cos(a * Math.PI / 180), y = 53 + 27 * Math.sin(a * Math.PI / 180); return C(x.toFixed(1), y.toFixed(1), 12, a % 60 ? '#b8621f' : '#c9772c'); }).join('')
      + orejasRedondas('#f2b155', '#fff1dc', 7) + C(50, 55, 24, '#f2b155') + E(50, 65, 10, 7, '#fff1dc') + cara({ nose: '#6b3b1f', dx: 10 }),
    perezoso: () => lineas('M6 22 L94 22', '#7a5230', 7) + E(30, 30, 6, 12, '#a88b6b', 'transform="rotate(-25 30 30)"') + E(70, 30, 6, 12, '#a88b6b', 'transform="rotate(25 70 30)"') + E(50, 82, 22, 13, '#a88b6b')
      + C(50, 54, 28, '#a88b6b') + E(50, 58, 21, 17, '#e8d6bd') + E(39, 54, 8, 5.5, '#5a4632', 'transform="rotate(18 39 54)"') + E(61, 54, 8, 5.5, '#5a4632', 'transform="rotate(-18 61 54)"') + cara({ pupil: '#2a1d1a', r: 3.6, nose: '#5a4632' }),
    medusa: () => [['M32 52 Q26 66 34 76 Q40 86 32 96', '#7ff0ff'], ['M44 54 Q40 70 46 80 Q50 90 44 98', '#c48bff'], ['M56 54 Q60 70 54 80 Q50 90 56 98', '#7ff0ff'], ['M68 52 Q74 66 66 76 Q60 86 68 96', '#c48bff']].map(([d, c]) => lineas(d, c, 3.4)).join('')
      + Pth('M20 54 Q20 16 50 16 Q80 16 80 54 Q72 48 64 54 Q57 48 50 54 Q43 48 36 54 Q28 48 20 54 Z', '#ff7ad9') + E(40, 28, 8, 4, '#ffd1f3', 'opacity=".7"') + cara({ y: 38, dx: 10, blush: '#ffd1f3' }),
    calabaza: () => calabazaBase() + cara({ y: 60 }),
    murcielago: () => Pth('M30 52 Q18 34 2 40 Q10 48 8 56 Q16 52 20 60 Q24 54 32 60 Z', '#4a3a6b') + Pth('M70 52 Q82 34 98 40 Q90 48 92 56 Q84 52 80 60 Q76 54 68 60 Z', '#4a3a6b')
      + Pth('M34 40 L32 22 L44 34 Z M66 40 L68 22 L56 34 Z', '#5b4a80') + C(50, 54, 21, '#5b4a80') + E(50, 78, 14, 10, '#5b4a80') + cara({ y: 52, dx: 8, r: 4, pupil: '#2a1d1a', blush: '#ff8fd1' }) + Pth('M46 63 l2 4 l2 -4 Z M51 63 l2 4 l2 -4 Z', '#fff'),
    arana: () => lineas('M50 0 L50 32', '#c8c8d0', 1.2) + [[-1, 46], [-1, 56], [-1, 66], [-1, 76], [1, 46], [1, 56], [1, 66], [1, 76]].map(([sx, y]) => lineas(`M50 ${y} Q${50 + sx * 30} ${y - 14} ${50 + sx * 44} ${y + 4}`, '#2a2a33', 3)).join('')
      + C(50, 58, 24, '#3b3b46') + cara({ y: 56, pupil: '#2a1d1a', blush: '#ff8fd1' }) + C(38, 40, 2, '#fff', 'opacity=".5"'),
    fantasma: () => Pth('M24 88 L24 50 Q24 20 50 20 Q76 20 76 50 L76 88 Q70 82 63 88 Q57 82 50 88 Q43 82 37 88 Q31 82 24 88 Z', '#fbfbff', 'stroke="#d8d8ef" stroke-width="1.5"')
      + E(18, 60, 7, 4, '#fbfbff', 'stroke="#d8d8ef" stroke-width="1.5" transform="rotate(-30 18 60)"') + E(82, 60, 7, 4, '#fbfbff', 'stroke="#d8d8ef" stroke-width="1.5" transform="rotate(30 82 60)"') + cara({ y: 48, dx: 10 }) + E(50, 64, 4, 5, '#2a1d1a'),
    gatobrujo: () => orejasGato('#2b2b33', '#7a5aa0') + cuerpo('#2b2b33', '#44444f') + cara({ pupil: '#2a1d1a', nose: '#ff8fa6' }).replace(/#fff"/, '#ffe066"').replace(/r="4.6" fill="#fff"/g, 'r="4.6" fill="#ffe066"')
      + Pth('M28 30 L54 -2 L72 30 Z', '#6a3fb0') + E(50, 30, 28, 5, '#4b2a85') + Pth('M35 24 h31 v5 h-31 Z', '#ffb000') + C(56, 6, 2.2, '#ffe066'),
    momia: () => cuerpo('#efe7d6', '#e2d8c2') + lineas('M24 44 L76 36 M23 60 L77 50 M26 72 L74 66 M30 84 L70 80 M28 32 L60 26', '#d4c8ae', 3) + cara({ pupil: '#2a1d1a', r: 4.4 }),
    vampiro: () => Pth('M18 92 Q20 62 30 56 L70 56 Q80 62 82 92 Z', '#2a1d33') + Pth('M24 60 L18 40 L36 54 Z M76 60 L82 40 L64 54 Z', '#c62828') + C(50, 52, 25, '#ece8f7')
      + Pth('M25 46 Q28 24 50 24 Q72 24 75 46 Q64 36 50 44 Q36 36 25 46 Z', '#1f1a2b') + cara({ y: 54, blush: '#ff9fb0' }) + Pth('M45 64 l2 4.5 l2 -4.5 Z M51 64 l2 4.5 l2 -4.5 Z', '#fff'),
    reycalabaza: () => calabazaBase() + Pth('M34 34 L36 18 L43 26 L50 14 L57 26 L64 18 L66 34 Z', '#ffd21f', 'stroke="#c99a00" stroke-width="1.5"') + C(50, 20, 2.4, '#ff3b6b') + C(36, 22, 1.8, '#3bd1ff') + C(64, 22, 1.8, '#3bd1ff')
      + Pth('M36 56 L42 50 L48 56 Z M52 56 L58 50 L64 56 Z', '#5a2a00') + Pth('M38 66 Q50 76 62 66 L58 66 L55 70 L52 66 L48 66 L45 70 L42 66 Z', '#5a2a00') + E(32, 64, 4, 2.4, '#ff6f61', 'opacity=".7"') + E(68, 64, 4, 2.4, '#ff6f61', 'opacity=".7"'),
  });
  function svg(id, cls, mood) {
    const f = D[id]; if (!f) return '';
    MOOD = mood || ''; let cuerpoSVG = ''; try { cuerpoSVG = f(); } finally { MOOD = ''; }
    const zz = mood === 'dormido' ? '<g fill="#7a8cff" font-family="Arial,sans-serif" font-weight="900"><text x="70" y="26" font-size="11">z</text><text x="78" y="16" font-size="14">z</text><text x="88" y="8" font-size="10">z</text></g>' : '';
    const it = LISTA.find(x => x[0] === id), r = it ? it[2] : 'comun', k = 'msc' + (++n);
    const brillo = r === 'legendaria' ? `<defs><radialGradient id="${k}"><stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="55" r="48" fill="url(#${k})"/>` : '';
    return `<svg class="${cls || 'msc'}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${it ? it[1] : id}">${brillo}<ellipse cx="50" cy="95" rx="24" ry="4" fill="rgba(0,0,0,.12)"/>${cuerpoSVG}${zz}</svg>`;
  }
  window.SMBMascotas = { LISTA, RAREZA, EVENTOS, svg };
})();
