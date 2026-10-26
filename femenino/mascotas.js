// Mascotas del reto (26 oct): animalitos que se compran con monedas y acompañan al personaje
// (en la liga, los duelos, su ficha y la partida). Dibujadas aquí mismo en SVG, estilo «kawaii».
// SMBMascotas.LISTA = [[id, nombre, rareza, precio]], SMBMascotas.svg(id), SMBMascotas.RAREZA
(function () {
  const RAREZA = { comun: ['Común', '#8a939c'], rara: ['Rara', '#2c7be5'], epica: ['Épica', '#8a3ffc'], legendaria: ['Legendaria', '#d99a00'] };
  const LISTA = [
    ['perro', 'Perrito', 'comun', 60], ['gato', 'Gatito', 'comun', 60], ['conejo', 'Conejito', 'comun', 70], ['pato', 'Patito', 'comun', 70],
    ['rana', 'Ranita', 'comun', 80], ['hamster', 'Hámster', 'comun', 80], ['cerdito', 'Cerdito', 'comun', 90],
    ['zorro', 'Zorrito', 'rara', 160], ['panda', 'Panda', 'rara', 180], ['pinguino', 'Pingüino', 'rara', 180], ['koala', 'Koala', 'rara', 200],
    ['buho', 'Búho', 'rara', 200], ['tortuga', 'Tortuga', 'rara', 220],
    ['axolote', 'Ajolote', 'epica', 420], ['tigre', 'Tigre', 'epica', 450], ['mapache', 'Mapache', 'epica', 480], ['osopolar', 'Oso polar', 'epica', 500], ['llama', 'Llama', 'epica', 520],
    ['unicornio', 'Unicornio', 'legendaria', 1000], ['dragon', 'Dragón', 'legendaria', 1200], ['fenix', 'Fénix', 'legendaria', 1300], ['galactico', 'Gato galáctico', 'legendaria', 1500],
  ];
  let n = 0;
  const E = (x, y, rx, ry, f, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${extra}/>`;
  const C = (x, y, r, f, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${extra}/>`;
  const Pth = (d, f, extra = '') => `<path d="${d}" fill="${f}" ${extra}/>`;
  // cara básica: ojos grandes con brillo, mofletes y boquita
  function cara(o = {}) {
    const y = o.y || 54, dx = o.dx || 11, ec = o.ec || '#2a1d1a', r = o.r || 4.6;
    let s = '';
    if (o.mask) s += E(50 - dx, y, 9, 7, o.mask) + E(50 + dx, y, 9, 7, o.mask);
    if (o.pupil) [50 - dx, 50 + dx].forEach(x => { s += C(x, y, r, '#fff') + C(x + 0.6, y + 0.4, r * 0.62, o.pupil) + C(x + 1.4, y - 1, 1.1, '#fff'); });
    else s += C(50 - dx, y, r, ec) + C(50 + dx, y, r, ec) + C(50 - dx + 1.6, y - 1.8, 1.6, '#fff') + C(50 + dx + 1.6, y - 1.8, 1.6, '#fff');
    if (!o.noBlush) s += E(50 - dx - 6, y + 8, 4.5, 2.6, o.blush || '#ff9fb0', 'opacity=".7"') + E(50 + dx + 6, y + 8, 4.5, 2.6, o.blush || '#ff9fb0', 'opacity=".7"');
    if (o.beak) s += Pth(`M${50 - 5} ${y + 5} L${50 + 5} ${y + 5} L50 ${y + 12} Z`, o.beak);
    else if (o.snout) s += E(50, y + 9, 8, 6, o.snout) + C(47, y + 9, 1.4, '#a84f5e') + C(53, y + 9, 1.4, '#a84f5e');
    else if (o.nose) s += E(50, y + 6, 3, 2.2, o.nose) + Pth(`M46 ${y + 10} Q48 ${y + 12.5} 50 ${y + 10} Q52 ${y + 12.5} 54 ${y + 10}`, 'none', 'stroke="#2a1d1a" stroke-width="1.4" stroke-linecap="round"');
    else s += Pth(`M46 ${y + 9} Q48 ${y + 11.5} 50 ${y + 9} Q52 ${y + 11.5} 54 ${y + 9}`, 'none', 'stroke="#2a1d1a" stroke-width="1.4" stroke-linecap="round"');
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
  function svg(id, cls) {
    const f = D[id]; if (!f) return '';
    const it = LISTA.find(x => x[0] === id), r = it ? it[2] : 'comun', k = 'msc' + (++n);
    const brillo = r === 'legendaria' ? `<defs><radialGradient id="${k}"><stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="55" r="48" fill="url(#${k})"/>` : '';
    return `<svg class="${cls || 'msc'}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${it ? it[1] : id}">${brillo}<ellipse cx="50" cy="95" rx="24" ry="4" fill="rgba(0,0,0,.12)"/>${f()}</svg>`;
  }
  window.SMBMascotas = { LISTA, RAREZA, svg };
})();
