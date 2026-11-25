// ================= vestuario: personaje, puntos y tienda =================
// Personajes: Avataaars de Pablo Stanley (uso libre personal y comercial) a través de DiceBear (MIT).
// Diez niveles (decidido el 7 oct): pensados para que el más activo llegue arriba hacia febrero-marzo y uno normal acabe por el 6.
const LEVELS = [
  { n: 'En prácticas', min: 0, frame: '' }, { n: 'Monitor', min: 50, frame: '' }, { n: 'Ayudante', min: 120, frame: '#c47a3a' },
  { n: 'Segundo entrenador', min: 220, frame: '#c47a3a' }, { n: 'Titular', min: 350, frame: '#9aa3ad' }, { n: 'Entrenador de cantera', min: 520, frame: '#9aa3ad' },
  { n: 'Referente', min: 730, frame: '#e0b23c' }, { n: 'Formador de formadores', min: 1000, frame: '#e0b23c' }, { n: 'Mito del vestuario', min: 1350, frame: '#681825' },
  { n: 'Leyenda del SMB', min: 1800, frame: 'leyenda' },
];
const BANCO_SEMANA = 2; // ejercicios por semana que suman puntos al entrar en el banco
const duelLvl = k => Math.floor(k / 2); // en los duelos el nivel suma la mitad (0 a 4), para que el dado siga mandando
// reequilibrado el 8 oct: subir de nivel cuesta el doble y las monedas extra se dan con cuentagotas
const PTS = { banco: 15, smb: 10, destacado: 25, ejercicio: 5, sesion: 15, pista: 5, copia: 5 };
const LS_GAME = 'smb-banco-personaje';
// mismo nombre aunque cambien tildes, mayúsculas o espacios («Jorge Cosín» = «Jorge Cosin»; 10 nov: Jorge se quedó fuera de la liga por la tilde)
const normName = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const CLUB_COLORS = [['681825', 'Granate'], ['ffffff', 'Blanco'], ['3f4a6e', 'Azul marino'], ['262e33', 'Negro'], ['929598', 'Gris']];
const ALL_COLORS = ['262e33', '65c9ff', '5199e4', '25557c', 'e6e6e6', '929598', '3c4f5c', 'b1e2ff', 'a7ffc4', 'ffdeb5', 'ffafb9', 'ffffb1', 'ff488e', 'ff5c5c', 'ffffff', '681825', '3f4a6e'];
const SKINS = ['ffdbb4', 'edb98a', 'f8d25c', 'fd9841', 'd08b5b', 'ae5d29', '614335'];
const HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'ecdcbf', 'e8e1e1', 'c93305', 'f59797'];
// catálogo: cada opción es gratis (p:0) o se compra (p>0); lv = nivel mínimo
// catálogo: [valor, nombre, precio, nivel mínimo]
const CAT = {
  top: { n: 'Peinado o gorro', opts: [
    ['shortFlat', 'Corto', 0], ['shortRound', 'Corto redondo', 0], ['shortWaved', 'Ondulado corto', 0], ['shortCurly', 'Rizado corto', 0], ['theCaesar', 'César', 0], ['theCaesarAndSidePart', 'César con raya', 0],
    ['sides', 'Entradas', 0], ['straight01', 'Liso', 0], ['straight02', 'Liso largo', 0], ['bob', 'Melena corta', 0], ['bun', 'Moño', 0], ['curly', 'Rizado', 0],
    ['longButNotTooLong', 'Media melena', 0], ['bigHair', 'Melena', 0], ['hijab', 'Hiyab', 0], ['turban', 'Turbante', 0],
    ['dreads01', 'Rastas cortas', 40], ['dreads02', 'Rastas', 40], ['dreads', 'Rastas largas', 50], ['fro', 'Afro', 40], ['froBand', 'Afro con cinta', 50], ['frizzle', 'Encrespado', 40],
    ['shaggy', 'Despeinado', 40], ['shaggyMullet', 'Mullet', 60], ['shavedSides', 'Rapado lateral', 50], ['miaWallace', 'Flequillo recto', 50], ['frida', 'Trenzas con flores', 60], ['curvy', 'Ondas', 40], ['straightAndStrand', 'Liso con mechón', 40],
    ['winterHat1', 'Gorro de lana', 50], ['winterHat02', 'Gorro con pompón', 50], ['winterHat03', 'Gorro nórdico', 60], ['winterHat04', 'Gorro con orejeras', 70], ['hat', 'Sombrero', 60]] },
  head: { n: 'En la cabeza (hockey)', opts: [['', 'Nada', 0], ['cinta', 'Cinta SMB', 30], ['gorra', 'Gorra SMB granate', 50], ['gorraB', 'Gorra SMB blanca', 50], ['auriculares', 'Auriculares de banquillo', 70],
    ['casco', 'Casco granate', 80], ['cascoB', 'Casco blanco', 80], ['cascoP', 'Casco de portero', 140]] },
  eyes: { n: 'Ojos', opts: [['default', 'Normales', 0], ['happy', 'Felices', 0], ['squint', 'Entornados', 0], ['side', 'De lado', 0], ['wink', 'Guiño', 0], ['closed', 'Cerrados', 0],
    ['surprised', 'Sorpresa', 20], ['eyeRoll', 'En blanco', 20], ['winkWacky', 'Guiño loco', 30], ['xDizzy', 'Mareado', 30], ['hearts', 'Corazones', 40]] },
  eyebrows: { n: 'Cejas', opts: [['default', 'Normales', 0], ['defaultNatural', 'Naturales', 0], ['raisedExcited', 'Levantadas', 0], ['flatNatural', 'Rectas', 0], ['upDown', 'Una arriba', 0], ['angryNatural', 'Enfadadas', 0], ['sadConcernedNatural', 'Preocupadas', 0], ['unibrowNatural', 'Uniceja', 0]] },
  mouth: { n: 'Boca', opts: [['smile', 'Sonrisa', 0], ['default', 'Normal', 0], ['serious', 'Seria', 0], ['twinkle', 'Pícara', 0], ['concerned', 'Preocupada', 0],
    ['screamOpen', '¡Un paso!', 30], ['tongue', 'Lengua', 20], ['disbelief', 'Incrédula', 20], ['grimace', 'Mueca', 20], ['eating', 'Comiendo', 20]] },
  faceItem: { n: 'En la cara', opts: [['', 'Nada', 0], ['pintura', 'Pintura del SMB', 25], ['tirita', 'Tirita deportiva', 15], ['ambas', 'Pintura y tirita', 35]] },
  facialHair: { n: 'Barba', opts: [['', 'Sin barba', 0], ['beardLight', 'Barba de tres días', 0], ['beardMedium', 'Barba', 0], ['beardMajestic', 'Barba épica', 50], ['moustacheFancy', 'Bigote elegante', 40], ['moustacheMagnum', 'Bigote Magnum', 40]] },
  accessories: { n: 'Gafas', opts: [['', 'Sin gafas', 0], ['prescription01', 'Graduadas', 30], ['prescription02', 'Graduadas finas', 30], ['round', 'Redondas', 40], ['kurt', 'Retro', 50], ['wayfarers', 'Wayfarer', 60], ['sunglasses', 'De sol', 60], ['eyepatch', 'Parche pirata', 80]] },
  kit: { n: 'Equipaciones del SMB', opts: [['', 'Sin equipación', 0], ['petoA', 'Peto amarillo', 30], ['petoN', 'Peto naranja', 30], ['petoV', 'Peto verde', 30], ['polo', 'Polo de entrenador', 60],
    ['chandal', 'Chaqueta de chándal', 80], ['smb2', 'Segunda equipación', 90], ['smb1', 'Primera equipación', 100], ['retro', 'Camiseta retro', 120], ['portero', 'Equipación de portero', 120],
    ['plumifero', 'Plumífero de banquillo', 150], ['leyenda', 'Camiseta dorada', 0, 9]] },
  clothing: { n: 'Otra ropa', opts: [['hoodie', 'Sudadera', 0], ['shirtCrewNeck', 'Camiseta', 40], ['shirtVNeck', 'Camiseta de pico', 40], ['shirtScoopNeck', 'Camiseta ancha', 40], ['graphicShirt', 'Camiseta con dibujo', 60],
    ['collarAndSweater', 'Jersey con cuello', 80], ['overall', 'Peto vaquero', 80], ['blazerAndShirt', 'Americana y camisa', 150, 4], ['blazerAndSweater', 'Americana y jersey', 150, 4]] },
  graphic: { n: 'Dibujo de la camiseta', opts: [['bear', 'Oso', 0], ['deer', 'Ciervo', 0], ['diamond', 'Diamante', 0], ['pizza', 'Pizza', 0], ['hola', 'Hola', 0], ['cumbia', 'Cumbia', 0], ['bat', 'Murciélago', 0]] },
  neck: { n: 'Al cuello', opts: [['', 'Nada', 0], ['silbato', 'Silbato', 20], ['crono', 'Cronómetro', 40], ['toalla', 'Toalla', 50], ['acreditacion', 'Acreditación de entrenador', 60], ['bufanda', 'Bufanda SMB', 70]] },
  chest: { n: 'En el pecho y el brazo', opts: [['', 'Nada', 0], ['escudo', 'Escudo del SMB', 0], ['brazalete', 'Brazalete de capitán', 0, 6], ['medalla', 'Medalla de leyenda', 0, 9]] },
  back: { n: 'A la espalda y al hombro', opts: [['', 'Nada', 0], ['bolas', 'Red de bolas', 70], ['stick', 'Stick al hombro', 80], ['mochila', 'Mochila', 90], ['patines', 'Patines colgados', 120], ['sticks', 'Dos sticks cruzados', 160, 4]] },
  bg: { n: 'Fondo', opts: [['rosa', 'Rosa SMB', 0], ['gris', 'Gris', 0], ['azul', 'Azul', 0], ['pista', 'La pista', 80], ['banquillo', 'El banquillo', 90], ['pizarra', 'Pizarra táctica', 100], ['gradas', 'Las gradas', 110],
    ['vestuario', 'El vestuario', 120], ['atardecer', 'Pista al atardecer', 130], ['noche', 'Pabellón de noche', 150], ['vitrina', 'Vitrina de trofeos', 180, 6], ['palco', 'El palco', 200, 6]] },
  fx: { n: 'Efectos', opts: [['', 'Sin efectos', 0], ['confeti', 'Confeti', 100], ['estrellas', 'Destellos', 120], ['focos', 'Focos', 150, 6]] },
  mascota: { n: 'Mascota al hombro', opts: [['', 'Sin mascota', 0], ['gato', 'Gato', 150], ['perro', 'Perro', 150], ['hamster', 'Hámster', 180], ['rana', 'Rana', 200], ['erizo', 'Erizo', 220],
    ['buho', 'Búho', 240], ['pinguino', 'Pingüino', 240], ['conejo', 'Conejo', 260], ['zorro', 'Zorro', 280], ['koala', 'Koala', 320], ['perezoso', 'Perezoso', 340], ['panda', 'Panda', 380], ['mono', 'Mono', 400],
    ['unicornio', 'Unicornio', 700, 6], ['dragon', 'Dragón', 1000, 8]] },
  mano: { n: 'En la mano', opts: [['', 'Nada', 0], ['cafe', 'Café', 60], ['mate', 'Mate', 70], ['piruleta', 'Piruleta', 70], ['globo', 'Globo', 80], ['donut', 'Dónut', 80], ['batido', 'Batido', 90], ['helado', 'Helado', 90],
    ['pizarra', 'Carpeta de entrenador', 100], ['crono', 'Cronómetro', 100], ['palomitas', 'Palomitas', 120], ['stick', 'Stick y bola', 120], ['micro', 'Micrófono', 140], ['megafono', 'Megáfono', 160],
    ['cohete', 'Cohete', 300, 4], ['trofeo', 'Trofeo', 450, 5]] },
  broma: { n: 'De broma (para ahorrar)', opts: [['', 'Nada', 0], ['bocata', 'Bocata de calamares', 300], ['patito', 'Patito de goma en la cabeza', 400], ['chancla', 'Chancla voladora', 500],
    ['taza', 'Taza «Mejor míster del mundo»', 650], ['nariz', 'Gafas con nariz y bigote', 800], ['botijo', 'Botijo', 900], ['corona', 'Corona de cartón', 1100],
    ['loro', 'Loro al hombro', 1400], ['peluca', 'Peluca de payaso', 1700], ['jamon', 'Pata de jamón', 2500]] },
};
const PALETTE_PRICE = 60;
const JERSEYS = ['petoA', 'petoN', 'petoV', 'smb1', 'smb2', 'retro', 'portero', 'leyenda'];
const optOf = (cat, v) => (CAT[cat].opts.find(o => o[0] === v) || []);
const defaultAvatar = () => ({ v: 2, broma: '', mascota: '', mano: '', skin: 'edb98a', top: 'shortFlat', hairColor: '2c1b18', hatColor: '681825', eyes: 'default', eyebrows: 'default', mouth: 'smile', faceItem: '', head: '', facialHair: '', accessories: '', accColor: '262e33', kit: '', dorsal: '7', clothing: 'hoodie', clothesColor: '681825', graphic: 'bear', neck: '', chest: 'escudo', back: '', bg: 'rosa', fx: '' });
function loadGame() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(LS_GAME) || 'null'); } catch (e) {}
  g = Object.assign({ owned: [], spent: 0, log: [] }, g || {});
  // lo comprado en versiones anteriores pasa a su equivalente
  const map = { pasta: 'accessories:prescription01', sol: 'accessories:sunglasses', gorro: 'top:winterHat02', gorra: 'head:gorra', visera: 'head:gorra', polo: 'kit:polo', chandal: 'kit:chandal', retro: 'kit:retro', chaqueta: 'clothing:blazerAndShirt', silbato: 'neck:silbato', crono: 'neck:crono', bufanda: 'neck:bufanda', carpeta: 'bg:pizarra', stick: 'back:stick', patines: 'back:patines', pista: 'bg:pista', vestuario: 'bg:vestuario', palco: 'bg:palco',
    'hand:stick': 'back:stick', 'hand:carpeta': 'bg:pizarra', 'shoulder:patines': 'back:patines' };
  g.owned = [...new Set((g.owned || []).map(x => map[x] || x))];
  if (!g.av || g.av.v !== 2) g.av = defaultAvatar();
  if (g.av.hand === 'stick' || g.av.shoulder === 'patines') g.av.back = g.av.hand === 'stick' ? 'stick' : 'patines';
  delete g.av.hand; delete g.av.shoulder;
  return g;
}
let game = loadGame();
function saveGame() { try { localStorage.setItem(LS_GAME, JSON.stringify(game)); cloudPush('meta'); return true; } catch (e) { return false; } }

// ---------- dibujo ----------
// Coordenadas del personaje Avataaars (280 × 280): cabeza x 84–196, y 36–148; ojos (112,112) y (168,112);
// nariz (140,128); boca (140,150); cuello hasta y 200; camiseta desde y 199 (escote 107–174).
let avSeq = 0;
const G = '#681825', W = '#ffffff', INK = '#262e33';
const SHIRT = 'M132.5 51.83c18.5 0 33.5-9.62 33.5-21.48 0-.36-.01-.7-.04-1.06A72 72 0 0 1 232 101.04V110H32v-8.95a72 72 0 0 1 67.05-71.83c-.03.37-.05.75-.05 1.13 0 11.86 15 21.48 33.5 21.48Z';
const crest = (x, y, r) => typeof LOGO === 'string' ? `<circle cx="${x}" cy="${y}" r="${r + 1.5}" fill="#fff"/><image href="${LOGO}" x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}"/>` : '';
const numTxt = (n, x, y, size, fill, stroke) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="800" font-family="Arial Black, Arial, sans-serif" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1.5" paint-order="stroke"` : ''}>${esc(String(n || '').slice(0, 2))}</text>`;
function sceneSVG(bg, id) {
  if (bg === 'pista') return `<rect width="280" height="280" fill="#dfe8f3"/><rect y="200" width="280" height="80" fill="#c8d6e6"/><line x1="0" y1="200" x2="280" y2="200" stroke="#fff" stroke-width="4"/><path d="M248,150 a22,22 0 0 1 0,44 z" fill="#fff" stroke="#f26a1b" stroke-width="4"/><circle cx="40" cy="44" r="4" fill="#1b1b1b"/><path d="M14,180 L38,180 L26,160 Z" fill="#1f3cff"/>`;
  if (bg === 'banquillo') return `<rect width="280" height="280" fill="#e9e4dc"/><rect y="0" width="280" height="120" fill="#c9c1b6"/><text x="140" y="70" text-anchor="middle" font-size="40" font-weight="800" fill="#b3a99b" font-family="Arial Black, Arial, sans-serif">SMB</text><rect y="150" width="280" height="22" fill="#681825"/><rect y="172" width="280" height="10" fill="#4d111b"/>${[0, 1, 2, 3].map(k => `<rect x="${16 + k * 70}" y="182" width="8" height="40" fill="#4d111b"/>`).join('')}<rect y="222" width="280" height="58" fill="#c8d6e6"/>`;
  if (bg === 'pizarra') return `<rect width="280" height="280" fill="#7a5233"/><rect x="10" y="10" width="260" height="230" rx="6" fill="#2f5d48"/><g stroke="#e8efe9" stroke-width="2.4" fill="none" opacity=".85"><rect x="20" y="20" width="240" height="210" rx="10"/><line x1="140" y1="20" x2="140" y2="230"/><circle cx="140" cy="125" r="24"/><path d="M40,60 l12,12 m0,-12 l-12,12 M214,170 l12,12 m0,-12 l-12,12"/><circle cx="60" cy="180" r="8"/><circle cx="220" cy="60" r="8"/><path d="M52,72 Q90,110 120,96" stroke-dasharray="6 5"/><path d="M118,92 l4,6 l-7,1" /></g><rect y="240" width="280" height="40" fill="#5c3c22"/>`;
  if (bg === 'gradas') return `<rect width="280" height="280" fill="#4b4f63"/>${Array.from({ length: 6 }, (_, r) => `<rect y="${r * 34}" width="280" height="30" fill="${r % 2 ? '#585d74' : '#62677f'}"/>${Array.from({ length: 12 }, (_, k) => `<circle cx="${12 + k * 23 + (r % 2) * 11}" cy="${r * 34 + 14}" r="8" fill="${['#681825', '#f2e5e7', '#e6c6cb', '#ffffff', '#3f4a6e', '#f2c14e'][(k + r) % 6]}"/>`).join('')}`).join('')}<rect y="204" width="280" height="76" fill="#c8d6e6"/>`;
  if (bg === 'vestuario') return `<rect width="280" height="280" fill="#d9d2c9"/>${[0, 1, 2, 3, 4, 5].map(k => `<rect x="${4 + k * 46}" y="14" width="40" height="196" rx="4" fill="${k % 2 ? '#7d8a9e' : '#8c99ad'}"/><rect x="${11 + k * 46}" y="36" width="26" height="4" fill="#5d687a"/><rect x="${11 + k * 46}" y="48" width="26" height="4" fill="#5d687a"/><circle cx="${36 + k * 46}" cy="110" r="3" fill="#cfd5de"/>`).join('')}<rect y="210" width="280" height="70" fill="#b8a99a"/><rect x="20" y="196" width="240" height="14" rx="3" fill="#8b6a4a"/>`;
  if (bg === 'atardecer') return `<defs><linearGradient id="${id}sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a5a"/><stop offset=".6" stop-color="#ffcf7a"/><stop offset="1" stop-color="#ffe6b0"/></linearGradient></defs><rect width="280" height="280" fill="url(#${id}sun)"/><circle cx="140" cy="170" r="70" fill="#fff3c4" opacity=".7"/><path d="M0,180 L60,150 L110,175 L170,140 L230,170 L280,150 L280,280 L0,280 Z" fill="#9b5a6a" opacity=".55"/><rect y="210" width="280" height="70" fill="#5b7fa8"/><line x1="0" y1="210" x2="280" y2="210" stroke="#fff" stroke-width="3"/>${[0, 1, 2, 3, 4, 5, 6].map(k => `<line x1="${k * 46}" y1="196" x2="${k * 46}" y2="210" stroke="#3a3a3a" stroke-width="2"/>`).join('')}<line x1="0" y1="198" x2="280" y2="198" stroke="#3a3a3a" stroke-width="2"/>`;
  if (bg === 'noche') return `<rect width="280" height="280" fill="#1c2340"/>${[[40, 30], [120, 18], [210, 40], [250, 90], [24, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#fff6c8" opacity=".9"/><circle cx="${x}" cy="${y}" r="32" fill="#fff6c8" opacity=".15"/>`).join('')}<rect y="210" width="280" height="70" fill="#2e3a66"/><line x1="0" y1="210" x2="280" y2="210" stroke="#7d8fc9" stroke-width="3"/>`;
  if (bg === 'vitrina') return `<rect width="280" height="280" fill="#3a2a22"/><rect x="10" y="10" width="260" height="220" fill="#56402f" stroke="#c9a46a" stroke-width="4"/>${[60, 130, 200].map(y => `<rect x="14" y="${y}" width="252" height="6" fill="#c9a46a"/>`).join('')}${[[40, 60], [100, 60], [180, 60], [240, 60], [30, 130], [90, 130], [190, 130], [250, 130], [50, 200], [230, 200]].map(([x, y], k) => `<g fill="${k % 3 === 0 ? '#f2c14e' : k % 3 === 1 ? '#c9ccd3' : '#c47a3a'}"><path d="M${x - 10},${y - 34} h20 v8 a10,10 0 0 1 -20,0 z"/><rect x="${x - 3}" y="${y - 18}" width="6" height="10"/><rect x="${x - 8}" y="${y - 8}" width="16" height="7"/></g>`).join('')}<rect y="230" width="280" height="50" fill="#2a1e18"/>`;
  if (bg === 'palco') return `<rect width="280" height="280" fill="#2d2440"/>${Array.from({ length: 70 }, (_, k) => `<circle cx="${10 + (k % 14) * 20}" cy="${16 + Math.floor(k / 14) * 26}" r="8" fill="${['#681825', '#f2e5e7', '#e3949f', '#ffffff', '#f2c14e'][k % 5]}" opacity=".85"/>`).join('')}<rect y="140" width="280" height="140" fill="#3a2f52"/>`;
  const c = { rosa: '#e6c6cb', gris: '#d9d2d3', azul: '#b8c4dd' }[bg] || '#e6c6cb';
  return `<rect width="280" height="280" fill="${c}"/><circle cx="140" cy="150" r="112" fill="#ffffff" opacity=".18"/>`;
}
const KIT_BASE = { petoA: null, petoN: null, petoV: null, polo: 'ffffff', chandal: '681825', smb1: '681825', smb2: 'ffffff', retro: 'ffffff', portero: '4a4f5a', plumifero: '25303f', leyenda: 'e0b23c' };
function kitSVG(av, id) {
  const k = av.kit; if (!k) return '';
  const n = av.dorsal, clip = `${id}k`;
  const neck = c => `<path d="M107,199.5 C107,212 122,222 140.5,222 C159,222 174,212 174,199.5" fill="none" stroke="${c}" stroke-width="5"/>`;
  let d = '';
  if (k.startsWith('peto')) {
    const c = { petoA: '#e8f23a', petoN: '#ff8a1f', petoV: '#46d36a' }[k];
    d = `<path d="M96,204 C104,224 176,224 184,204 L206,214 C200,236 198,256 200,280 L80,280 C82,256 80,236 74,214 Z" fill="${c}" opacity=".93"/><g opacity=".22" fill="#000">${Array.from({ length: 60 }, (_, i) => `<circle cx="${84 + (i % 12) * 10}" cy="${226 + Math.floor(i / 12) * 10}" r="1.6"/>`).join('')}</g><path d="M96,204 C104,224 176,224 184,204" fill="none" stroke="#00000033" stroke-width="3"/>${numTxt(n, 140, 266, 30, '#1b1b1b')}`;
  } else if (k === 'smb1') d = `<path d="M112,204 L52,262 M169,204 L229,262" stroke="${W}" stroke-width="9"/><path d="M112,204 L52,262 M169,204 L229,262" stroke="${G}" stroke-width="3"/>${neck(W)}${numTxt(n, 140.5, 268, 32, W)}${crest(106, 240, 9)}`;
  else if (k === 'smb2') d = `<rect x="0" y="232" width="280" height="14" fill="${G}"/>${neck(G)}${numTxt(n, 140, 274, 26, G)}${crest(106, 262, 8)}`;
  else if (k === 'retro') d = `${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${44 + i * 26}" y="196" width="12" height="90" fill="${G}"/>`).join('')}<path d="M107,199 L140.5,232 L174,199 L162,198 L140.5,220 L119,198 Z" fill="${W}" stroke="${G}" stroke-width="2"/>${crest(104, 242, 9)}`;
  else if (k === 'portero') d = `<rect x="0" y="196" width="280" height="90" fill="#5a606d"/>${[232, 248, 264].map(y => `<path d="M40,${y} Q140,${y + 8} 240,${y}" fill="none" stroke="#3b404b" stroke-width="3"/>`).join('')}<rect x="98" y="228" width="85" height="52" rx="10" fill="#6c7280" stroke="#3b404b" stroke-width="2"/>${neck('#3b404b')}${numTxt(n, 140.5, 266, 26, W, '#3b404b')}`;
  else if (k === 'polo') d = `<path d="M107,199 L122,226 L136,214 Z M174,199 L159,226 L145,214 Z" fill="${G}"/><line x1="140.5" y1="216" x2="140.5" y2="244" stroke="#d9d2d3" stroke-width="2"/><circle cx="140.5" cy="226" r="2.2" fill="#a9a1a2"/><circle cx="140.5" cy="237" r="2.2" fill="#a9a1a2"/>${crest(186, 238, 9)}<rect x="30" y="268" width="220" height="12" fill="${G}" opacity=".9"/>`;
  else if (k === 'chandal') d = `<path d="M100,196 C104,212 177,212 181,196 L181,206 C176,222 105,222 100,206 Z" fill="${G}" stroke="${W}" stroke-width="2"/><line x1="140.5" y1="214" x2="140.5" y2="286" stroke="#d9d2d3" stroke-width="3"/><rect x="137" y="216" width="7" height="10" rx="2" fill="#c0c4cc"/><path d="M107,206 L52,252 M174,206 L229,252" stroke="${W}" stroke-width="4"/>${crest(112, 244, 8)}<text x="174" y="250" text-anchor="middle" font-size="12" font-weight="800" fill="${W}" font-family="Arial, sans-serif">SMB</text>`;
  else if (k === 'plumifero') d = `${[226, 246, 266].map(y => `<path d="M36,${y} Q140,${y + 10} 244,${y}" fill="none" stroke="#3a4760" stroke-width="4"/>`).join('')}<path d="M96,186 C100,214 181,214 185,186 L187,206 C182,228 99,228 94,206 Z" fill="#2d3a52" stroke="#1b2333" stroke-width="2"/><line x1="140.5" y1="222" x2="140.5" y2="286" stroke="#9aa3b5" stroke-width="3"/>${crest(112, 248, 8)}`;
  else if (k === 'leyenda') d = `<path d="M30,276 L250,276" stroke="${G}" stroke-width="10"/>${neck(G)}${numTxt(n, 140, 266, 30, G)}<path d="M98,232 l3,7 l7,0 l-5.5,4.5 l2,7 l-6.5,-4 l-6.5,4 l2,-7 l-5.5,-4.5 l7,0 z" fill="${G}"/>`;
  return `<clipPath id="${clip}"><path transform="translate(8 170)" d="${SHIRT}"/></clipPath><g clip-path="url(#${clip})">${d}</g>`;
}
function backSVG(av) {
  const b = av.back;
  if (b === 'stick') return `<path d="M188,300 L262,40" stroke="#6b4a2f" stroke-width="11" stroke-linecap="round"/><path d="M262,40 Q272,14 248,10 L232,12" fill="none" stroke="#1b1b1b" stroke-width="12" stroke-linecap="round"/><path d="M226,170 L238,128" stroke="${G}" stroke-width="12"/>`;
  if (b === 'sticks') return `<path d="M30,290 L246,26" stroke="#6b4a2f" stroke-width="10" stroke-linecap="round"/><path d="M250,290 L34,26" stroke="#6b4a2f" stroke-width="10" stroke-linecap="round"/><path d="M246,26 Q258,4 236,2 L222,6" fill="none" stroke="#1b1b1b" stroke-width="11" stroke-linecap="round"/><path d="M34,26 Q22,4 44,2 L58,6" fill="none" stroke="#1b1b1b" stroke-width="11" stroke-linecap="round"/><path d="M58,214 L48,226 M222,214 L232,226" stroke="${G}" stroke-width="12"/>`;
  if (b === 'patines') return fimg('patines', -2, 170, 100, 'rotate(-14 48 220)');
  if (b === 'mochila') return fimg('mochila', -2, 166, 104, 'rotate(-8 50 216)');
  if (b === 'bolas') return `<g><path d="M200,214 C196,180 212,148 236,146 C262,148 274,176 270,214 Z" fill="#ffffff22" stroke="#1b1b1b" stroke-width="2"/>${[[218, 196], [240, 196], [262, 198], [228, 176], [252, 176], [238, 158], [212, 212], [256, 212]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#f26a1b" stroke="#c4541a" stroke-width="1.5"/>`).join('')}<path d="M206,170 L266,206 M208,200 L262,164 M200,190 L270,190 M236,146 L236,214" stroke="#1b1b1b" stroke-width="1.2" opacity=".6"/></g>`;
  return '';
}
function frontSVG(av) {
  let s = '';
  if (av.back === 'mochila') s += `<path d="M100,203 C84,206 70,196 58,184" fill="none" stroke="#c2185b" stroke-width="8" stroke-linecap="round"/>`;
  if (av.back === 'patines') s += `<path d="M100,203 C80,206 62,200 46,200" fill="none" stroke="#1b1b1b" stroke-width="3"/>`;
  if (av.back === 'bolas') s += `<path d="M174,203 C192,196 206,184 214,168" fill="none" stroke="#1b1b1b" stroke-width="3"/>`;
  if (av.chest === 'escudo' && !['smb1', 'smb2', 'retro', 'polo', 'chandal', 'plumifero'].includes(av.kit)) s += crest(100, 248, 12);
  if (av.chest === 'brazalete') s += `<g transform="rotate(-24 60 232)"><rect x="42" y="224" width="38" height="17" rx="3" fill="#f2c14e" stroke="#b8860b" stroke-width="1.5"/><text x="61" y="238" text-anchor="middle" font-size="14" font-weight="800" fill="#2b2023" font-family="Arial, sans-serif">C</text></g>`;
  if (av.chest === 'medalla') s += fimg('medalla', 108, 190, 66);
  if (av.neck === 'silbato') s += `<path d="M120,200 L140.5,240 L161,200" fill="none" stroke="#f2c14e" stroke-width="3"/><rect x="131" y="238" width="22" height="12" rx="5" fill="#c9ccd3" stroke="#8a8f99" stroke-width="1.5"/><circle cx="135" cy="244" r="3" fill="#8a8f99"/>`;
  if (av.neck === 'crono') s += `<path d="M120,200 L140.5,234 L161,200" fill="none" stroke="${INK}" stroke-width="3"/>${fimg('crono', 116, 222, 50)}`;
  if (av.neck === 'acreditacion') s += `<path d="M114,200 L134,246 M167,200 L147,246" stroke="${G}" stroke-width="5"/><rect x="122" y="244" width="37" height="40" rx="3" fill="#fff" stroke="#c9c1c2" stroke-width="1.5"/><rect x="122" y="244" width="37" height="10" rx="3" fill="${G}"/><text x="140.5" y="252" text-anchor="middle" font-size="7" font-weight="800" fill="#fff" font-family="Arial, sans-serif">SMB</text><rect x="127" y="258" width="11" height="13" fill="#e6c6cb"/><path d="M142,260 h12 M142,265 h12 M142,270 h9" stroke="#9a9293" stroke-width="2"/>`;
  if (av.neck === 'toalla') s += `<path d="M98,196 Q140,226 183,196 L190,212 Q140,246 91,212 Z" fill="#fff" stroke="#d6dbe3" stroke-width="2"/><path d="M93,210 L95,276 L113,276 L112,222 Z" fill="#fff" stroke="#d6dbe3" stroke-width="2"/><path d="M188,210 L186,276 L168,276 L169,222 Z" fill="#fff" stroke="#d6dbe3" stroke-width="2"/><path d="M95,262 h17 M169,262 h17" stroke="#5199e4" stroke-width="4"/>`;
  if (av.neck === 'bufanda') s += `<path d="M98,192 Q140,214 183,192 L183,208 Q140,230 98,208 Z" fill="${G}"/>${[0, 1, 2, 3].map(k => `<rect x="${108 + k * 18}" y="${198 + (k === 1 || k === 2 ? 8 : 4)}" width="7" height="10" fill="${W}" opacity=".9"/>`).join('')}<rect x="150" y="208" width="22" height="62" fill="${G}"/>${[0, 1, 2].map(k => `<rect x="150" y="${220 + k * 15}" width="22" height="5" fill="${W}"/>`).join('')}`;
  return s;
}
function faceSVG(av) {
  let s = '';
  if (av.faceItem === 'pintura' || av.faceItem === 'ambas') s += `${[[94, 132], [164, 132]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="5" rx="2.5" fill="${G}"/><rect x="${x}" y="${y + 7}" width="22" height="5" rx="2.5" fill="${W}"/><rect x="${x}" y="${y + 14}" width="22" height="5" rx="2.5" fill="${G}"/>`).join('')}`;
  if (av.faceItem === 'tirita' || av.faceItem === 'ambas') s += `<rect x="124" y="124" width="33" height="8" rx="4" fill="#f0c9a4" stroke="#d3a882" stroke-width="1"/><g fill="#d3a882"><circle cx="133" cy="128" r=".9"/><circle cx="140.5" cy="128" r=".9"/><circle cx="148" cy="128" r=".9"/></g>`;
  return s;
}
// objetos de Fluent dentro del personaje: imagen con sombra suave
const fimg = (k, x, y, w, extra) => FLU[k] ? `<g filter="url(#avds)"${extra ? ` transform="${extra}"` : ''}><image href="${FLU[k]}" x="${x}" y="${y}" width="${w}" height="${w}"/></g>` : '';
function propsSVG(av) {
  let s = '';
  if (av.mascota) s += fimg(av.mascota, 168, 138, 110);
  if (av.mano) s += fimg(av.mano, -2, 164, 110, 'rotate(-10 54 218)');
  return s;
}
function bromaSVG(av) {
  const b = av.broma; if (!b) return '';
  const K = '#1b1b1b';
  if (b === 'bocata') return fimg('bocata', -10, 156, 132, 'rotate(-22 58 222)');
  if (b === 'patito') return fimg('patito', 102, -4, 80);
  if (b === 'chancla') return `${fimg('chancla', 188, 4, 80, 'rotate(28 228 44)')}<path d="M178,40 l-22,6 M182,58 l-24,2 M184,76 l-20,-2" stroke="${K}" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>`;
  if (b === 'taza') return `<g><rect x="196" y="214" width="58" height="62" rx="8" fill="#ffffff" stroke="${K}" stroke-width="2.5"/><path d="M254,228 C276,228 276,262 254,262" fill="none" stroke="${K}" stroke-width="5"/><text x="225" y="238" text-anchor="middle" font-size="9" font-weight="800" fill="#7a1f2e" font-family="Arial, sans-serif">MEJOR</text><text x="225" y="250" text-anchor="middle" font-size="9" font-weight="800" fill="#7a1f2e" font-family="Arial, sans-serif">MÍSTER</text><path d="M210,206 q4,-8 0,-14 M226,206 q4,-8 0,-14 M242,206 q4,-8 0,-14" fill="none" stroke="#9aa" stroke-width="2.5" stroke-linecap="round"/></g>`;
  if (b === 'nariz') return `<g><circle cx="118" cy="112" r="17" fill="none" stroke="${K}" stroke-width="5"/><circle cx="162" cy="112" r="17" fill="none" stroke="${K}" stroke-width="5"/><path d="M135,110 h10" stroke="${K}" stroke-width="5"/><path d="M140,112 C126,130 128,146 142,148 C154,148 156,134 140,112 Z" fill="#f1b7a1" stroke="${K}" stroke-width="2.5"/><path d="M108,160 C120,148 134,150 140,156 C146,150 160,148 172,160 C160,166 150,162 140,160 C130,162 120,166 108,160 Z" fill="#3a2516"/></g>`;
  if (b === 'botijo') return fimg('botijo', 176, 166, 108);
  if (b === 'corona') return fimg('corona', 92, -14, 96);
  if (b === 'loro') return fimg('loro', -110, 132, 108, 'scale(-1 1)');
  if (b === 'peluca') return `<g>${[[70, 70, '#ff4d4d'], [62, 100, '#ffb84d'], [70, 130, '#f4f04d'], [210, 70, '#4dff88'], [218, 100, '#4db8ff'], [210, 130, '#a64dff'], [100, 44, '#ff4fa3'], [180, 44, '#ff8a1f'], [140, 32, '#2fb35a']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="22" fill="${c}" stroke="${K}" stroke-width="2"/>`).join('')}<circle cx="140" cy="142" r="9" fill="#e8102f" stroke="${K}" stroke-width="2"/></g>`;
  if (b === 'jamon') return fimg('jamon', 156, 154, 126, 'rotate(12 222 216)');
  return '';
}
function headSVG(av) {
  const h = av.head; if (!h) return '';
  if (h === 'cinta') return `<path d="M83,76 Q140,60 198,76 L198,92 Q140,76 83,92 Z" fill="${G}"/><text x="140" y="86" text-anchor="middle" font-size="10" font-weight="800" fill="${W}" font-family="Arial, sans-serif">SMB</text>`;
  if (h === 'gorra' || h === 'gorraB') { const c = h === 'gorra' ? G : W, t = h === 'gorra' ? W : G;
    return `<path d="M82,86 C80,44 106,26 140,26 C174,26 200,44 198,86 Z" fill="${c}" stroke="${h === 'gorraB' ? '#d9d2d3' : '#4d111b'}" stroke-width="2"/><path d="M110,30 Q140,26 140,86 M170,30 Q140,26 140,86" fill="none" stroke="#00000022" stroke-width="2"/><circle cx="140" cy="27" r="4" fill="${t}"/><text x="140" y="72" text-anchor="middle" font-size="17" font-weight="800" fill="${t}" font-family="Arial Black, Arial, sans-serif">SMB</text><ellipse cx="140" cy="88" rx="66" ry="10" fill="${h === 'gorra' ? '#4d111b' : '#e8e1e1'}"/>`; }
  if (h === 'auriculares') return `<path d="M76,118 C74,40 206,40 204,118" fill="none" stroke="${INK}" stroke-width="9"/><rect x="62" y="98" width="24" height="38" rx="9" fill="${INK}"/><rect x="194" y="98" width="24" height="38" rx="9" fill="${INK}"/><rect x="66" y="104" width="16" height="26" rx="6" fill="${G}"/><path d="M206,134 C206,160 186,162 166,156" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="163" cy="155" r="6" fill="${INK}"/>`;
  if (h === 'casco' || h === 'cascoB' || h === 'cascoP') { const c = h === 'casco' ? G : W, e = h === 'casco' ? '#4d111b' : '#c9c1c2';
    let out = `<path d="M78,128 C74,56 104,26 140,26 C176,26 206,56 202,128 L188,132 C188,108 186,94 180,84 L100,84 C94,94 92,108 92,132 Z" fill="${c}" stroke="${e}" stroke-width="2.5"/><path d="M104,40 L104,58 M124,32 L124,52 M156,32 L156,52 M176,40 L176,58" stroke="${e}" stroke-width="4" stroke-linecap="round"/><path d="M92,130 L140,178 L188,130" fill="none" stroke="#1b1b1b" stroke-width="2.5"/>`;
    if (h === 'casco') out += `<text x="140" y="74" text-anchor="middle" font-size="14" font-weight="800" fill="${W}" font-family="Arial Black, Arial, sans-serif">SMB</text>`;
    if (h === 'cascoP') out += `<rect x="94" y="84" width="93" height="100" rx="18" fill="none" stroke="#9aa0aa" stroke-width="4"/><g stroke="#9aa0aa" stroke-width="3">${[110, 125, 140.5, 156, 171].map(x => `<line x1="${x}" y1="86" x2="${x}" y2="182"/>`).join('')}${[104, 124, 144, 164].map(y => `<line x1="96" y1="${y}" x2="185" y2="${y}"/>`).join('')}</g>`;
    return out; }
  return '';
}
function fxSVG(fx, front) {
  if (fx === 'focos' && !front) return `<g opacity=".35" fill="#fff8d0"><path d="M0,0 L60,0 L180,280 L110,280 Z"/><path d="M280,0 L220,0 L100,280 L170,280 Z"/></g>`;
  if (!front) return '';
  if (fx === 'confeti') return Array.from({ length: 34 }, (_, i) => { const x = (i * 83) % 270 + 5, y = (i * 47) % 120 + (i % 3) * 50 + 4; if (x > 70 && x < 210 && y > 30 && y < 200) return ''; return `<rect x="${x}" y="${y}" width="7" height="12" rx="2" fill="${['#681825', '#f2c14e', '#ffffff', '#3f4a6e', '#ff5c5c'][i % 5]}" transform="rotate(${(i * 37) % 180} ${x + 3} ${y + 6})"/>`; }).join('');
  if (fx === 'estrellas') return [[40, 50, 9], [236, 40, 12], [250, 150, 8], [26, 160, 10], [60, 100, 6], [222, 96, 6]].map(([x, y, r]) => `<path d="M${x},${y - r * 2} Q${x},${y} ${x + r * 2},${y} Q${x},${y} ${x},${y + r * 2} Q${x},${y} ${x - r * 2},${y} Q${x},${y} ${x},${y - r * 2} Z" fill="#fff6c8" stroke="#f2c14e" stroke-width="1.5"/>`).join('');
  return '';
}
function frameSVG(lvl) {
  const f = LEVELS[lvl] && LEVELS[lvl].frame; if (!f) return '';
  if (f === 'leyenda') return `<rect x="5" y="5" width="270" height="270" rx="30" fill="none" stroke="#681825" stroke-width="10"/><rect x="11" y="11" width="258" height="258" rx="25" fill="none" stroke="#e0b23c" stroke-width="5"/>${[[24, 24], [256, 24], [24, 256], [256, 256]].map(([x, y]) => `<path d="M${x},${y - 10} L${x + 3},${y - 3} L${x + 10},${y - 3} L${x + 4},${y + 2} L${x + 6},${y + 10} L${x},${y + 5} L${x - 6},${y + 10} L${x - 4},${y + 2} L${x - 10},${y - 3} L${x - 3},${y - 3} Z" fill="#e0b23c"/>`).join('')}`;
  return `<rect x="5" y="5" width="270" height="270" rx="30" fill="none" stroke="${f}" stroke-width="9"/>`;
}
function avatarSVG(av, lvl) {
  av = (av && av.v === 2) ? Object.assign(defaultAvatar(), av) : defaultAvatar();
  const id = 'av' + (++avSeq);
  const helmet = ['casco', 'cascoB', 'cascoP'].includes(av.head);
  let face = '';
  if (typeof window.SMBAvatar === 'function') {
    const kitBase = av.kit ? (KIT_BASE[av.kit] || av.clothesColor) : av.clothesColor;
    const o = { seed: 'smb', randomizeIds: true, backgroundColor: [], skinColor: [av.skin], top: [av.top], hairColor: [av.hairColor], hatColor: [av.hatColor], topProbability: helmet ? 0 : 100,
      eyes: [av.eyes], eyebrows: [av.eyebrows], mouth: [av.mouth], nose: ['default'],
      facialHair: av.facialHair ? [av.facialHair] : ['beardLight'], facialHairColor: [av.hairColor], facialHairProbability: av.facialHair ? 100 : 0,
      accessories: av.accessories ? [av.accessories] : ['round'], accessoriesColor: [av.accColor], accessoriesProbability: av.accessories ? 100 : 0,
      clothing: [av.kit ? 'shirtCrewNeck' : av.clothing], clothesColor: [kitBase], clothingGraphic: [av.graphic] };
    try { face = window.SMBAvatar(o).replace(/^<svg /, '<svg x="0" y="0" width="280" height="280" '); } catch (e) { face = ''; }
  }
  return `<svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Personaje"><defs><filter id="avds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".28"/></filter></defs><clipPath id="${id}c"><rect width="280" height="280" rx="32"/></clipPath><g clip-path="url(#${id}c)">${sceneSVG(av.bg, id)}${fxSVG(av.fx, false)}${backSVG(av)}${face}${kitSVG(av, id)}${frontSVG(av)}${faceSVG(av)}${headSVG(av)}${propsSVG(av)}${bromaSVG(av)}${fxSVG(av.fx, true)}</g>${frameSVG(lvl || 0)}</svg>`;
}

// ---------- puntos ----------
const smbComplete = t => !!(t.smb && t.smb.lee && (t.smb.preguntas || []).length && (t.smb.facil || t.smb.dificil));
function clubLog(name) {
  const n = normName(name); if (!n) return [];
  const out = [];
  const porSemana = {};
  bank.tasks.filter(t => t.source !== 'oller' && normName(t.author) === n).forEach(t => {
    if (t.alta) { const w = mondayISO(t.alta); porSemana[w] = (porSemana[w] || 0) + 1; if (porSemana[w] > BANCO_SEMANA) { out.push({ pts: 0, why: `Ejercicio en el banco: ${taskLabel(t)} (fuera del tope de ${BANCO_SEMANA} por semana)` }); return; } }
    out.push({ pts: PTS.banco, why: `Ejercicio en el banco: ${taskLabel(t)}` });
    if (t.smb && t.smb.validado && smbComplete(t)) out.push({ pts: PTS.smb, why: `Parte «En SMB» validada: ${taskLabel(t)}` });
    if (t.destacado) out.push({ pts: PTS.destacado, why: `Ejercicio destacado (${t.destacado}): ${taskLabel(t)}` });
  });
  const c = (bank.coaches || []).find(x => normName(x.name) === n);
  ((c && c.bonus) || []).forEach(b => out.push({ pts: +b.pts || 0, why: b.why || 'Premio de la Dirección Técnica' }));
  (bank.historial || []).forEach(h => {
    if (h.ej && !h.ej.oller && normName(h.ej.autor) === n) out.push({ pts: PTS_SEM.semana, why: `Ejercicio de la semana: ${h.ej.title}` });
    if (h.ses && normName(h.ses.autor) === n) out.push({ pts: PTS_SEM.semana, why: `Sesión de la semana: ${h.ses.title}` });
  });
  (bank.liga || []).forEach(j => j.duels.forEach(d => { if (normName(d.win) === n) out.push({ pts: PTS_SEM.duelo, why: `Duelo ganado a ${normName(d.a.name) === n ? d.b.name : d.a.name} (jornada ${j.n})` }); }));
  return out;
}
const clubPoints = name => clubLog(name).reduce((a, x) => a + x.pts, 0);
const localPoints = () => game.log.reduce((a, x) => a + x.pts, 0);
const levelOf = pts => { let k = 0; LEVELS.forEach((L, i) => { if (pts >= L.min) k = i; }); return k; };
const myLevel = () => levelOf(clubPoints(readAuthor()));
const balance = () => clubPoints(readAuthor()) + localPoints() - game.spent;
function award(key, pts, why) {
  if (game.log.some(x => x.key === key)) return;
  game.log.push({ key, pts, why, date: isoToday() }); saveGame();
  toast(`+${pts} monedas · ${why}`);
}
function toast(text) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
  document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3200);
}
const sesComplete = s => s.bloques.length && s.bloques.every(b => b.task);

// ---------- pantalla ----------
let vest = { tab: 'personalizar', cat: 'cara' };
const VCATS = [['cara', 'Cara', ['eyes', 'eyebrows', 'mouth', 'faceItem']], ['pelo', 'Pelo y cabeza', ['top', 'head']], ['barba', 'Barba y gafas', ['facialHair', 'accessories']], ['ropa', 'Ropa', ['kit', 'clothing', 'graphic']], ['hockey', 'Hockey', ['neck', 'chest', 'back']], ['extras', 'Mascota y mano', ['mascota', 'mano']], ['fondo', 'Fondo y efectos', ['bg', 'fx']], ['broma', 'De broma', ['broma']]];
const TOGGLE = ['neck', 'chest', 'back', 'accessories', 'facialHair', 'head', 'faceItem', 'fx', 'kit', 'broma', 'mascota', 'mano'];
function previewWith(cat, v) {
  const p = Object.assign({}, game.av, { [cat]: v });
  if (cat === 'clothing') p.kit = '';
  if (cat === 'graphic') { p.clothing = 'graphicShirt'; p.kit = ''; }
  return p;
}
// lo que desbloquea cada nivel: marco, objetos de la tienda y poderes
function levelPerks(i) {
  const FR = { '#c47a3a': 'marco de bronce', '#9aa3ad': 'marco de plata', '#e0b23c': 'marco de oro', '#681825': 'marco granate', leyenda: 'marco de leyenda' };
  const parts = [];
  if (LEVELS[i].frame && (!i || LEVELS[i - 1].frame !== LEVELS[i].frame)) parts.push(FR[LEVELS[i].frame] || 'marco nuevo');
  const items = Object.values(CAT).flatMap(c => c.opts.filter(o => o[3] === i).map(o => o[1].toLowerCase()));
  if (items.length) parts.push(items.join(', '));
  const pw = PODERES.filter(p => p.lv === i && i > 0).map(p => 'poder «' + p.n + '»');
  if (pw.length) parts.push(pw.join(', '));
  if (i && duelLvl(i) > duelLvl(i - 1)) parts.push(`+${duelLvl(i)} en los duelos`);
  return parts.join(' · ');
}
function levelBar(pts) {
  const k = levelOf(pts), L = LEVELS[k], N = LEVELS[k + 1];
  const pct = N ? Math.round((pts - L.min) / (N.min - L.min) * 100) : 100;
  return `<div class="lvl"><div class="lvl-top"><b>${esc(L.n)}</b><span>${N ? `${N.min - pts} puntos del club para «${esc(N.n)}»` : 'Nivel máximo'}</span></div><div class="lvl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div></div>`;
}
const isOwned = (cat, v) => { const o = optOf(cat, v); return !o[2] || game.owned.includes(cat + ':' + v); };
function tileHTML(cat, o) {
  const [v, label, price, lv] = o, lvl = myLevel(), on = String(game.av[cat] ?? '') === String(v);
  const locked = lv && lvl < lv, owned = isOwned(cat, v) && !locked;
  const prev = previewWith(cat, v);
  let tag = '';
  if (locked) tag = `<span class="t-lock">Desde «${esc(LEVELS[lv].n)}»</span>`;
  else if (!owned) { const bal = balance(); tag = `<span class="t-price">${price} monedas${price > bal ? ` · te faltan ${price - bal}` : ''}</span>`; }
  else if (on) tag = '<span class="t-on">Puesto</span>';
  return `<button class="vtile${on ? ' on' : ''}${locked ? ' locked' : ''}${!owned && !locked ? ' buy' : ''}" type="button" data-opt="${cat}" data-v="${esc(v)}" aria-pressed="${on}"${locked ? ' disabled' : ''}>
    <span class="vt-pv">${avatarSVG(prev)}</span><span class="vt-n">${esc(label)}</span>${tag}</button>`;
}
function colorRow(key, label, cols, opts = {}) {
  const cur = game.av[key];
  return `<div class="ses-f">${esc(label)}<div class="opts">${cols.map(c => { const [hex, name] = Array.isArray(c) ? c : [c, '#' + c];
    const lockedCol = opts.palette && !CLUB_COLORS.some(x => x[0] === hex) && !game.owned.includes('pal:full');
    return `<button class="sw${lockedCol ? ' sw-lock' : ''}" type="button" data-col="${key}" data-v="${hex}" aria-pressed="${cur === hex}" aria-label="${esc(name)}${lockedCol ? ' (paleta completa)' : ''}" style="background:#${hex}"${lockedCol ? ' disabled' : ''}></button>`; }).join('')}</div></div>`;
}
const stable = o => JSON.stringify(o, Object.keys(o || {}).sort());
function syncState(name) {
  const c = coachOf(name); if (!c) return 'fuera';
  const same = stable(Object.assign(defaultAvatar(), c.avatar || {})) === stable(Object.assign(defaultAvatar(), game.av)) && (game.poder || c.poder || 'garra') === (c.poder || 'garra');
  return same ? 'al-dia' : 'cambiado';
}
const AUTO_PJ = () => !!window.SMB_CLOUD; // en la web el personaje viaja solo con la cuenta
const pjSig = () => stable(Object.assign(defaultAvatar(), game.av)) + '|' + (game.poder || '');
const pjSentNow = () => { try { return localStorage.getItem('smb-pj-enviado') === pjSig(); } catch (e) { return false; } };
const pjPending = name => !AUTO_PJ() && syncState(name) !== 'al-dia' && !pjSentNow();
function syncHTML(name) {
  const st = syncState(name);
  if (AUTO_PJ()) return '<p class="sync ok">✓ Tu personaje y tu poder se guardan solos en el club.</p>';
  if (st === 'al-dia') return '<p class="sync ok">✓ Tu personaje y tu poder están al día en el vestuario del club.</p>';
  if (pjSentNow()) return '<p class="sync ok">✓ Enviado a la DT. Aparece en el vestuario en cuanto lo añada.</p>';
  return `<div class="sync warn"><span>${st === 'fuera' ? 'Todavía no estás en el vestuario del club. Manda tu personaje a la DT para entrar en la liga.' : 'Has cambiado tu personaje o tu poder. Mándalo otra vez para que lo vea el resto.'}</span><button class="btn small primary" type="button" data-vest="send">Mandar a la DT</button></div>`;
}
const PERFIL_TABS = [['personalizar', 'Personaje'], ['coleccion', 'Colección'], ['poderes', 'Poderes'], ['puntos', 'Puntos'], ['envios', 'Envíos'], ['datos', 'Mis datos']];
function renderVestuario() {
  const box = document.getElementById('v-vestuario'), name = readAuthor();
  if (!name) {
    box.innerHTML = `<div class="vhead"><div><h1>Mi perfil</h1><p class="sub">Tu personaje, tus puntos y tus datos.</p></div></div><section class="ses-sec welcome"><p>Para tener tu personaje, primero dinos cómo te llamas. Es el mismo nombre que firma tus ejercicios.</p>
      <div class="row-in"><input id="vest-name" type="text" placeholder="Tu nombre" aria-label="Tu nombre"><button class="btn primary" type="button" data-vest="name">Guardar</button></div>${window.SMB_CLOUD ? window.SMB_CLOUD.accountHTML() : ''}</section>`;
    return;
  }
  const cp = clubPoints(name), lvl = levelOf(cp), bal = balance();
  let pane = '';
  if (vest.tab === 'personalizar') {
    const C = VCATS.find(c => c[0] === vest.cat) || VCATS[0];
    let extra = '';
    if (C[0] === 'cara') extra = colorRow('skin', 'Piel', SKINS);
    if (C[0] === 'pelo') extra = colorRow('hairColor', 'Color del pelo y la barba', HAIR_COLORS) + (/[Hh]at/.test(game.av.top) ? colorRow('hatColor', 'Color del gorro', ALL_COLORS, { palette: true }) : '') + (['casco', 'cascoB', 'cascoP'].includes(game.av.head) ? '<p class="sub">Con casco no se ve el peinado.</p>' : '');
    if (C[0] === 'barba' && game.av.accessories) extra = colorRow('accColor', 'Color de las gafas', ALL_COLORS, { palette: true });
    if (C[0] === 'ropa') extra = (JERSEYS.includes(game.av.kit) ? `<label class="ses-f dorsal-f">Dorsal<input type="text" inputmode="numeric" maxlength="2" id="dorsal" value="${esc(game.av.dorsal || '')}"></label>` : '')
      + (!game.av.kit || game.av.kit.startsWith('peto') ? colorRow('clothesColor', game.av.kit ? 'Color de la camiseta de debajo del peto' : 'Color de la ropa', ALL_COLORS, { palette: true }) : '')
      + (game.owned.includes('pal:full') ? '' : `<div class="pal-buy"><span>Los colores del club son gratis. <b>Paleta completa</b>: todos los colores para ropa, gorros y gafas.</span><button class="btn small" type="button" data-palette${bal < PALETTE_PRICE ? ' disabled' : ''}>Comprar · ${PALETTE_PRICE} monedas</button></div>`);
    pane = `<div class="vcats" role="group" aria-label="Qué personalizar">${VCATS.map(([k, l]) => `<button class="chip" type="button" data-vcat="${k}" aria-pressed="${vest.cat === k}">${l}</button>`).join('')}</div>
      ${extra}
      ${C[2].filter(cat => cat !== 'graphic' || (game.av.clothing === 'graphicShirt' && !game.av.kit)).map(cat => `<h3 class="h-sub">${esc(CAT[cat].n)}</h3><div class="vgrid">${CAT[cat].opts.map(o => tileHTML(cat, o)).join('')}</div>`).join('')}
      <p class="sub credit">Personajes: Avataaars, de Pablo Stanley (uso libre), con DiceBear. Mascotas y objetos: Microsoft Fluent Emoji (MIT). Equipaciones, objetos de hockey y fondos: SMB.</p>`;
  } else if (vest.tab === 'coleccion') {
    pane = coleccionHTML();
  } else if (vest.tab === 'poderes') {
    pane = poderesHTML(name);
  } else if (vest.tab === 'envios') {
    pane = enviosHTML();
  } else if (vest.tab === 'datos') {
    pane = `<h3 class="h-sub">Tu nombre</h3><p class="sub">Firma tus ejercicios y tus sesiones. Si lo cambias, la Dirección Técnica tiene que saberlo para que tus puntos sigan contando.</p>
      <div class="row-in"><input id="pf-name" type="text" value="${esc(name)}" aria-label="Tu nombre"><button class="btn" type="button" data-pf="rename">Cambiar</button></div>
      ${window.SMB_CLOUD ? `<details class="dt-more"><summary>¿Venías del banco antiguo?</summary><p class="sub">Lo tuyo (${mine.length} ${mine.length === 1 ? 'ejercicio' : 'ejercicios'} y ${sessions.length} ${sessions.length === 1 ? 'sesión' : 'sesiones'}) ya se guarda en tu cuenta. Si tenías un código «SMB2:» del banco antiguo, tráelo aquí.</p><div class="actions"><button class="btn" type="button" data-pf="restore">Recuperar copia</button></div></details>${window.SMB_CLOUD.accountHTML()}` : `<h3 class="h-sub">Copia de seguridad</h3>
      <p class="sub">${window.SMB_CLOUD ? `${mine.length} ${mine.length === 1 ? 'ejercicio' : 'ejercicios'} y ${sessions.length} ${sessions.length === 1 ? 'sesión' : 'sesiones'}, guardados en tu cuenta. «Recuperar copia» sirve para traer lo que tenías en la versión anterior del banco.` : `${mine.length} ${mine.length === 1 ? 'ejercicio' : 'ejercicios'} y ${sessions.length} ${sessions.length === 1 ? 'sesión' : 'sesiones'} guardados solo en este navegador. Si cambias de móvil o se borran los datos del navegador, se pierden: guarda una copia de vez en cuando (+${PTS.copia} monedas, una vez por semana).`}</p>
      <div class="actions"><button class="btn primary" type="button" data-pf="backup">Guardar copia</button><button class="btn" type="button" data-pf="restore">Recuperar copia</button></div>`}`;
  } else {
    const cl = clubLog(name), lo = [...game.log].reverse();
    pane = `<div class="pts-cols">
      <section><h3 class="h-sub">Puntos · ${cp}</h3><p class="sub">Del club: los ve todo el cuerpo técnico y marcan tu nivel y el marco de tu personaje.</p>
        ${cl.length ? `<ul class="pts-list">${cl.map(x => `<li><span>${esc(x.why)}</span><b>+${x.pts}</b></li>`).join('')}</ul>` : `<p class="sub">Todavía ninguno. ${window.SMB_CLOUD ? 'Crea un ejercicio' : 'Manda un ejercicio a la Dirección Técnica'}: si entra en el banco, son ${PTS.banco}.</p>`}</section>
      <section><h3 class="h-sub">Monedas · ${bal} ${infoBtn('monedas')}</h3><p class="sub">Para la tienda del personaje. Cada punto del club es también una moneda, y además ganas monedas con las misiones, los amistosos y los entrenos. Gastadas: ${game.spent}.</p>
        ${lo.length ? `<ul class="pts-list">${lo.map(x => `<li><span>${esc(x.why)}</span><b>+${x.pts}</b></li>`).join('')}</ul>` : '<p class="sub">Todavía ninguna extra.</p>'}</section>
      </div>
      <section class="ses-sec"><h3 class="h-sub">Puntos del club</h3><ul class="pts-list">
        <li><span>Ejercicio tuyo que entra en el banco del club (suman los ${BANCO_SEMANA} primeros de cada semana)</span><b>+${PTS.banco}</b></li>
        <li><span>…con la parte «En SMB» completa y validada</span><b>+${PTS.smb}</b></li>
        <li><span>Premios de la Dirección Técnica</span><b>varía</b></li></ul>
        <h3 class="h-sub">Monedas extra (este móvil)</h3><ul class="pts-list">
        <li><span>Crear un ejercicio</span><b>+${PTS.ejercicio}</b></li>
        <li><span>Completar una sesión, con todos sus bloques</span><b>+${PTS.sesion}</b></li>
        <li><span>Terminar un entrenamiento en modo pista (una vez al día por sesión)</span><b>+${PTS.pista}</b></li>
        <li><span>Guardar copia de tus datos (una vez por semana)</span><b>+${PTS.copia}</b></li></ul>
        <h3 class="h-sub">Niveles</h3><ul class="pts-list">${LEVELS.map((L, i) => `<li><span>${esc(L.n)}${levelPerks(i) ? ' · ' + esc(levelPerks(i)) : ''}</span><b>${L.min}</b></li>`).join('')}</ul></section>`;
  }
  box.innerHTML = `<div class="vhead"><div><h1>Mi perfil</h1><p class="sub">Tu personaje, tus puntos y tus datos.</p></div></div>
    <section class="ses-sec me">
      <div class="me-av">${avatarSVG(game.av, lvl)}</div>
      <div class="me-info"><h2>${esc(name)}</h2>${levelBar(cp)}
        <p class="me-bal"><b>${cp}</b> puntos · <b>${bal}</b> monedas</p>
        ${syncHTML(name)}</div>
    </section>
    <div class="seg wrap" role="group" aria-label="Partes del perfil">${PERFIL_TABS.map(([k, l]) => `<button type="button" data-vtab="${k}" aria-pressed="${vest.tab === k}">${k === 'envios' && window.SMB_CLOUD ? 'Propuestas' : l}</button>`).join('')}</div>
    <section class="ses-sec">${pane}</section>`;
}
function teamHTML() {
  const cs = [...(bank.coaches || [])].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return `<section class="ses-sec"><h2 class="h-sec">Cuerpo técnico</h2>
    ${cs.length ? `<div class="team">${cs.map(c => { const p = clubPoints(c.name), n = bank.tasks.filter(t => t.source !== 'oller' && normName(t.author) === normName(c.name)).length, d = bank.tasks.filter(t => t.destacado && normName(t.author) === normName(c.name)).length;
      return `<div class="mate"><div class="mate-av">${avatarSVG(c.avatar, levelOf(p))}</div><b>${esc(c.name)}</b><span class="badge">${esc(LEVELS[levelOf(p)].n)}</span><small>${n} ${n === 1 ? 'ejercicio' : 'ejercicios'} en el banco${d ? ` · ${d} ${d === 1 ? 'destacado' : 'destacados'}` : ''}</small><small>${esc(poderOf(c.poder).n)}${record(c.name) ? ' · ' + record(c.name) : ''}</small>${readAuthor() && normName(c.name) !== normName(readAuthor()) ? `<button class="btn small" type="button" data-am="retar" data-name="${esc(c.name)}">Retar</button>` : ''}</div>`; }).join('')}</div>`
      : `<p class="sub">${AUTO_PJ() ? 'Todavía no hay nadie: cada entrenador aparece aquí en cuanto entra con su cuenta.' : 'Todavía no hay nadie. Cada entrenador manda su personaje a la Dirección Técnica y aparece aquí.'}</p>`}
  </section>`;
}
function buyModal(label, price, onOk) {
  const bal = balance();
  if (bal < price) { openModal(`<h2>Te faltan monedas</h2><p>«${esc(label)}» cuesta ${price} monedas y tienes ${bal}. Crea ejercicios, completa sesiones, haz las misiones y ${window.SMB_CLOUD ? 'gana amistosos' : 'manda tus mejores ejercicios a la Dirección Técnica'}.</p><div class="row"><button class="btn primary" id="m-no" type="button">Entendido</button></div>`); modalCard.querySelector('#m-no').onclick = closeModal; return; }
  confirmModal(`¿Comprar «${label}»?`, `Cuesta ${price} monedas. Te quedarán ${bal - price}.`, 'Comprar', onOk);
}
document.getElementById('v-vestuario').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.vest === 'name') { const v = document.getElementById('vest-name').value.trim(); if (v) { setAuthor(v); render(); } return; }
  if (b.dataset.vtab) { vest.tab = b.dataset.vtab; render(); return; }
  if (b.dataset.vcat) { vest.cat = b.dataset.vcat; render(); return; }
  if (b.dataset.col) { game.av[b.dataset.col] = b.dataset.v; saveGame(); render(); return; }
  if (b.hasAttribute('data-palette')) { buyModal('Paleta completa', PALETTE_PRICE, () => { game.owned.push('pal:full'); game.spent += PALETTE_PRICE; saveGame(); render(); toast('¡Paleta completa desbloqueada!'); }); return; }
  if (b.dataset.opt) {
    const cat = b.dataset.opt, v = b.dataset.v, o = optOf(cat, v);
    const wear = () => { game.av[cat] = v; if (cat === 'clothing') game.av.kit = ''; if (cat === 'graphic') { game.av.clothing = 'graphicShirt'; game.av.kit = ''; } saveGame(); render(); };
    if (isOwned(cat, v)) { if (game.av[cat] === v && TOGGLE.includes(cat)) { game.av[cat] = ''; saveGame(); render(); return; } return wear(); }
    buyModal(o[1], o[2], () => { game.owned.push(cat + ':' + v); game.spent += o[2]; wear(); toast(`¡${o[1]} es tuyo!`); });
    return;
  }
  if (b.dataset.vest === 'send') {
    sendModal({ kind: 'pj', ref: 'pj', title: 'Tu personaje y tu poder', code: 'SMB3:' + toB64(JSON.stringify({ v: 3, name: readAuthor(), avatar: game.av, poder: game.poder || ((coachOf(readAuthor()) || {}).poder) || 'garra' })),
      head: 'Mandar mi personaje a la DT', text: 'Cuando la Dirección Técnica lo añada, tu personaje aparece en el cuerpo técnico y juega la liga con el poder que hayas elegido.' });
    try { localStorage.setItem('smb-pj-enviado', pjSig()); } catch (e) {}
    render();
  }
});
document.getElementById('v-vestuario').addEventListener('click', e => {
  const b = e.target.closest('[data-pf]'); if (!b) return;
  if (b.dataset.pf === 'backup') backupModal();
  else if (b.dataset.pf === 'restore') restoreModal();
  else if (b.dataset.pf === 'rename') { const v = document.getElementById('pf-name').value.trim(); if (v) { setAuthor(v); render(); toast('Nombre cambiado.'); } }
});
document.getElementById('v-vestuario').addEventListener('change', e => {
  if (e.target.id === 'dorsal') { game.av.dorsal = e.target.value.replace(/\D/g, '').slice(0, 2); saveGame(); render(); }
});
document.getElementById('v-vestuario').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'vest-name') { const v = e.target.value.trim(); if (v) { setAuthor(v); render(); } } });

// ---------- Dirección Técnica: vestuario y premios ----------
function dtVestHTML() {
  const cs = [...(bank.coaches || [])].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return `<section class="ses-sec"><h2 class="h-sec">Vestuario y puntos</h2>
    <details class="dt-more"><summary>Cómo se suman los puntos</summary><p class="sub">Solos: ${PTS.banco} por ejercicio que entra en el banco y ${PTS.smb} más si su parte «En SMB» está completa y validada; los elegidos de la semana +${PTS_SEM.semana}; los duelos ganados +${PTS_SEM.duelo}. Aquí das los premios a mano.</p></details>
    ${cs.length ? `<ul class="dt-list">${cs.map(c => `<li class="dt-row vest-row"><span class="dt-thumb">${avatarSVG(c.avatar)}</span><span class="dt-txt"><b>${esc(c.name)}</b><small>${clubPoints(c.name)} puntos del club · ${esc(LEVELS[levelOf(clubPoints(c.name))].n)}</small></span><span class="actions"><button class="btn small" type="button" data-dt-bonus="${esc(c.name)}">Dar puntos</button><button class="btn small ghost" type="button" data-dt-unvest="${esc(c.name)}">Quitar</button></span></li>`).join('')}</ul>`
      : `<p class="sub">Todavía no hay nadie en el vestuario. ${window.SMB_CLOUD ? 'Aparecen solos cuando entran con su cuenta.' : 'Cuando un entrenador te mande su código de personaje (empieza por «SMB3:»), pégalo en Banco → «Pegar un código».'}</p>`}
    <div class="actions"><button class="btn small" type="button" data-dt-addcoach>+ Añadir entrenador sin personaje</button></div>
  </section>`;
}
function saveCoaches(coaches, okText, msgEl) { return saveBank(bank.tasks, okText, msgEl, { coaches }); }
function upsertCoach(name, avatar, poder) {
  const cs = clone(bank.coaches || []), c = cs.find(x => normName(x.name) === normName(name));
  const pw = PODERES.some(x => x.id === poder) ? poder : '';
  if (c) { c.avatar = avatar || c.avatar; if (pw) c.poder = pw; } else cs.push(Object.assign({ name: name.trim(), avatar: avatar || defaultAvatar(), bonus: [] }, pw ? { poder: pw } : {}));
  return cs;
}
function bonusModal(name) {
  openModal(`<h2>Dar puntos a ${esc(name)}</h2>
    <label class="ses-f">Puntos<input type="number" id="m-pts" inputmode="numeric" value="20"></label>
    <label class="ses-f">Por qué (lo verá en su vestuario)<input type="text" id="m-why" placeholder="Por ejemplo: sesión del martes muy bien llevada"></label>
    <p class="msg" id="m-msg" aria-live="polite"></p>
    <div class="row"><button class="btn" id="m-no" type="button">Cancelar</button><button class="btn primary" id="m-ok" type="button">Dar puntos</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelector('#m-ok').onclick = () => {
    const pts = parseInt(modalCard.querySelector('#m-pts').value, 10), why = modalCard.querySelector('#m-why').value.trim();
    if (!pts) { const m = modalCard.querySelector('#m-msg'); m.className = 'msg err'; m.textContent = 'Pon cuántos puntos.'; return; }
    const cs = clone(bank.coaches || []), c = cs.find(x => normName(x.name) === normName(name)); if (!c) return;
    c.bonus = c.bonus || []; c.bonus.push({ pts, why: why || 'Premio de la Dirección Técnica', date: isoToday() });
    closeModal(); saveCoaches(cs, `${pts} puntos para ${name}.`, document.getElementById('dt-msg'));
  };
}
function addCoachModal() {
  openModal(`<h2>Añadir entrenador</h2><p class="sub">Con el mismo nombre con el que firma sus ejercicios.</p>
    <label class="ses-f">Nombre<input type="text" id="m-name"></label>
    <div class="row"><button class="btn" id="m-no" type="button">Cancelar</button><button class="btn primary" id="m-ok" type="button">Añadir</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelector('#m-ok').onclick = () => { const n = modalCard.querySelector('#m-name').value.trim(); if (!n) return; closeModal(); saveCoaches(upsertCoach(n, null), `${n} añadido al vestuario.`, document.getElementById('dt-msg')); };
}
document.getElementById('v-dt').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.dtBonus) bonusModal(b.dataset.dtBonus);
  else if (b.dataset.dtUnvest) confirmModal(`¿Quitar a ${b.dataset.dtUnvest} del vestuario?`, 'Se quita su personaje y sus premios. Sus ejercicios siguen en el banco.', 'Quitar', () => saveCoaches((bank.coaches || []).filter(x => normName(x.name) !== normName(b.dataset.dtUnvest)), 'Quitado del vestuario.', document.getElementById('dt-msg')));
  else if (b.hasAttribute('data-dt-addcoach')) addCoachModal();
});
function reviewAvatar(raw, out) {
  let p;
  try { p = JSON.parse(fromB64(raw.slice(5).replace(/\s+/g, ''))); if (!p || p.v !== 3 || !p.name) throw 0; }
  catch (e) { out.innerHTML = '<p class="msg err">Ese código de personaje no es válido. Comprueba que se ha copiado entero.</p>'; return; }
  const exists = (bank.coaches || []).some(x => normName(x.name) === normName(p.name));
  out.innerHTML = `<div class="mate rv-mate"><div class="mate-av">${avatarSVG(p.avatar)}</div><b>${esc(p.name)}</b><small>${exists ? 'Ya está en el vestuario: se actualiza su personaje.' : 'Entra nuevo en el vestuario.'}${p.poder ? ' Poder: ' + esc(poderOf(p.poder).n) + '.' : ''}</small></div>
    <div class="actions">${canWriteBank ? `<button class="btn primary" id="rv-vest" type="button">${exists ? 'Actualizar personaje' : 'Añadir al vestuario'}</button>` : ''}</div><p class="msg" id="rv-msg" aria-live="polite"></p>`;
  const bt = document.getElementById('rv-vest');
  if (bt) bt.onclick = () => saveCoaches(upsertCoach(p.name, p.avatar, p.poder), `${p.name} está en el vestuario.`, document.getElementById('rv-msg'));
}


