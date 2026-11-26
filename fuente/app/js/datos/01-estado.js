// ================= estado =================
const BLOQUES = ['Patinaje', 'Control stick-bola', 'Tiros y remates', 'Pases', 'Táctica individual', 'Táctica colectiva', 'Bonus'];
const LS_KEY = 'smb-banco-mis-versiones';
let bank = JSON.parse(document.getElementById('bank-default').textContent);
let mine = loadMine();
// Tipo de tarea = los cuatro bloques de la plantilla de sesión del club
const TIPOS = [
  { v: 'calentamiento', n: 'Calentamiento', d: 'Patinaje y manejo de stick' },
  { v: 'tecnico', n: 'Técnico-táctico', d: 'Gesto técnico con decisión sencilla' },
  { v: 'decision', n: 'Toma de decisión', d: '3c3, máximo 4c4' },
  { v: 'global', n: 'Juego global', d: 'Aplicación real de lo trabajado' },
  { v: 'tecnificacion', n: 'Tecnificación', d: 'Ejercicios de las sesiones de tecnificación' },
];
// Fases y qué se trabaja = las progresiones del modelo de juego general
const FASES = {
  'Defensa': ['Marca individual sin cambios', 'Reconocer lado fuerte y lado débil', 'Ayuda desde el carril central', 'Doblar en zona 4', 'Cambios de marca en los bloqueos', 'Escalonamiento', 'Defensa zonal y mixta', 'Encimar', 'Presión de contención', 'Presión de recuperación en zona 4', 'Sistemas de presión'],
  'Recuperación': ['No tirar la bola', 'Recupero, miro, decido', 'Distinguir forzada y de rebote', 'Los cuatro roles de la salida', 'Contraataque en superioridad (2c1, 3c2)', 'Modular la velocidad de salida y de llegada'],
  'Ataque': ['Proteger', 'Desbordar', 'Leer al defensor', 'El 1c1 como recurso, no como finalidad', 'Fijar al defensor y soltarla', 'Pasar y cortar', '2c1: quién fija y quién recibe', 'Triangulaciones', 'Pasar, cortar y llenar', 'Bloqueo directo y continuación', 'Aclarar', 'Tirar de la cuerda', 'Desmarque para ganar posición', 'Apoyo y desmarque en espacios cortos', '¿Dónde está la portería?', '¿Quién tiene la ventaja?', 'Reciclar', 'Estirar y comprimir la defensa'],
  'Pérdida': ['Dar el paso adelante', 'Los cuatro se activan', 'Encimar', 'Pasar a presionar cuando los cuatro están encima', 'Elegir entre presión y repliegue'],
  'Situaciones especiales': ['Bola parada a favor', 'Bola parada en contra', 'Superioridad', 'Inferioridad', 'Falta directa y penalti'],
};
const FASE_NAMES = Object.keys(FASES);
// 25 nov: en pantalla, «Transición ofensiva/defensiva» (decisión de la DT). Por dentro se siguen guardando como «Recuperación» y «Pérdida»: no cambia ningún dato.
const FASE_TXT = { 'Defensa': 'Defensa', 'Recuperación': 'Transición ofensiva', 'Ataque': 'Ataque', 'Pérdida': 'Transición defensiva', 'Situaciones especiales': 'Situaciones especiales' };
const faseTxt = f => FASE_TXT[f] || f;
// Técnica y táctica individual por categoría: del Excel «Objetivos por categoría» de la DT (14 oct)
const CATS = [['pre', 'Prebenjamín'], ['ben', 'Benjamín'], ['ale', 'Alevín'], ['inf', 'Infantil y mayores']];
const catName = k => (CATS.find(c => c[0] === k) || [])[1] || '';
const catOf = name => { const n = String(name || '').toLowerCase(); return /prebenj/.test(n) ? 'pre' : /benj/.test(n) ? 'ben' : /alev/.test(n) ? 'ale' : /infan|juven|junior|cadete|sub ?1|senior|auton|absolut/.test(n) ? 'inf' : ''; };
const TEC = {
  'Patinaje': {
    pre: ['Coordinación', 'Motricidad: movimientos específicos y generales', 'Técnica de patinaje (hincapié en los apoyos)'],
    ben: ['Motricidad: movimientos específicos y generales', 'Técnica de patinaje (todas las habilidades)'],
    ale: ['Técnica de patinaje específica y general', 'Patinaje con intensidad y exigencia'],
    inf: ['Patinaje con velocidad y coordinación'] },
  'Conducción': {
    pre: ['Conducción frontal y lateral con 1 y 2 piernas (apoyos)', 'Fintas', 'Ganchos', 'Conducción con 1 mano y protección', 'Conducción atrás-delante, lateral y diagonal', 'Vueltas de 360º sin tacos'],
    ben: ['Conducción con la cabeza levantada', 'Enlazar ganchos y contraganchos', 'Conducción entre piernas en dinámico', 'Enlazar pase con una habilidad de conducción', 'Visión periférica'],
    ale: ['Conducción con la cabeza levantada (ver sin mirar la bola)', 'Cambios de dirección y de sentido con bola', 'Giros con bola', 'Conducción dinámica con la bola por detrás del cuerpo', 'Enlazar pase, conducción y nuevo pase', 'Levantar y picar la bola'],
    inf: ['Conducción junto con elementos tácticos', 'Dribling stick-patín', 'Visión periférica adquirida'] },
  'Pase y control': {
    pre: ['Pase de pala y cuchara dinámico con rebotes', 'Pase y control de pala y cuchara con compañeros', 'Pase y control con las dos caras del stick'],
    ben: ['Pase con multibolas', 'Pase de pala y cuchara con rebotes e intensidad', 'Pase de pala y cuchara con oposición dinámica', 'Pase de pala y cuchara de media vuelta en dinámico'],
    ale: ['Pase arrastrado', 'Pase de pala y cuchara alto y raso', 'Pase y control orientado', 'Pase de pala y cuchara de media vuelta en dinámico'],
    inf: ['Multibolas con tantas bolas como jugadores', 'Especialización del pase con toma de decisiones', 'Pase en superioridad numérica', 'Control orientado y disparo'] },
  'Disparo': {
    pre: ['Disparo de cuchara y pala con golpeo', 'Disparo de cuchara arrastrado', 'Disparo con pase previo y distancia'],
    ben: ['Disparo de cuchara y pala con golpeo', 'Disparo de cuchara y pala arrastrado', 'Disparo con pase previo acortando distancia'],
    ale: ['Disparo de cuchara y pala con golpeo', 'Disparo de cuchara y pala arrastrado y scoop', 'Disparo con pase en estático y control orientado'],
    inf: ['Toda la secuencia del disparo en las dos posiciones, y bajar a defender', 'Tiro de media vuelta girando, sin frenar'] },
  'Remate': {
    pre: ['Remate de pala y cuchara en estático'],
    ben: ['Remate de pala y cuchara en dinámico'],
    ale: ['Remate de pala y cuchara en charlot y frenada', 'Frenada y salida con valla frontal'],
    inf: ['Remate alto y raso de pala y cuchara con frenada', 'Remate con desmarque previo y entrada'] },
  '1c1 en ataque': {
    pre: ['Protección de bola (de espaldas a la portería)', 'Desbordar con el defensor cerca', '1 contra portero', 'Mismo peso en las dos piernas'],
    ben: ['Protección de bola con cambios de dirección', 'Desbordar con el defensor alejado', '1 contra portero con cambios de dirección', 'Interpretar los movimientos de la defensa'],
    ale: ['Desbordar con cambios de dirección', '1 contra portero con varios cambios de dirección', '1c1 sin bola para recibir'],
    inf: ['Salida de presión en media pista', 'Salida de presión en zonas de fondo', 'Regate rápido (defensor con stick cambiado) y disparo'] },
  '1c1 en defensa': {
    pre: ['Uso del stick y distancias', 'Defender con el culo abajo', 'Conocer las líneas de interceptación de pase'],
    ben: ['Posición base defensiva', 'No ir a buscar la bola', 'Punto y final dentro del área', 'Defender perpendicular a la portería'],
    ale: ['Esperar y no definir', 'Distancia de seguridad y stick', 'Defender en relación con la portería', 'Cambio de mano defendiendo'],
    inf: ['Uso del cuerpo en las acciones', 'Cerrar el rebote', 'Reforzar el cambio de mano defendiendo', 'Seguir al jugador de cerca (no flotar)', 'Ver la dirección de los patines del atacante'] },
};
const TEC_NAMES = Object.keys(TEC);
// contenidos de un fundamento técnico para unas categorías (sin categorías: todas), sin repetir y en orden de etapa
const tecList = (f, cats) => [...new Set(CATS.map(c => c[0]).filter(k => !cats || !cats.length || cats.includes(k)).flatMap(k => TEC[f][k] || []))];
const TEC_ALL = new Set(TEC_NAMES.flatMap(f => tecList(f)));
const worksOf = t => [...(t.contenidos || []), ...(t.tec || [])];
// Contenidos que la DT añade a la lista del club (18 nov): bank.contClub [{c, g: fase | 'tec:' + fundamento, ts}].
// Se suman a FASES y TEC al cargar el banco, así salen en la sesión, en la planificación, al clasificar ejercicios y en los filtros.
const FASES_BASE = JSON.parse(JSON.stringify(FASES)), TEC_BASE = JSON.parse(JSON.stringify(TEC));
let contSig = null;
function contClubApply() {
  const L = Array.isArray(bank.contClub) ? bank.contClub : [];
  const sig = JSON.stringify(L); if (sig === contSig) return; contSig = sig;
  FASE_NAMES.forEach(f => { FASES[f] = [...FASES_BASE[f]]; });
  TEC_NAMES.forEach(f => CATS.forEach(([k]) => { TEC[f][k] = [...(TEC_BASE[f][k] || [])]; }));
  L.forEach(x => {
    if (!x || !x.c) return;
    if (FASES[x.g]) { if (!FASES[x.g].includes(x.c)) FASES[x.g].push(x.c); }
    else if (/^tec:/.test(x.g || '') && TEC[x.g.slice(4)]) { const f = x.g.slice(4); CATS.forEach(([k]) => { if (!TEC[f][k].includes(x.c)) TEC[f][k].push(x.c); }); }
  });
  TEC_ALL.clear(); TEC_NAMES.flatMap(f => tecList(f)).forEach(c => TEC_ALL.add(c));
}
const contKey = c => String(c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const contOficial = c => { const k = contKey(c); return TEC_NAMES.some(f => tecList(f).some(x => contKey(x) === k)) || FASE_NAMES.some(f => FASES[f].some(x => contKey(x) === k)); };
const contGrupo = g => FASES[g] ? 'Táctica · ' + faseTxt(g) : /^tec:/.test(g || '') ? 'Técnica · ' + g.slice(4) : '';
// contenidos escritos a mano en unas sesiones (no están en la lista del club): [{c, n, quien: Set, ts}], los más recientes primero
function contSueltos(list) {
  const m = new Map();
  list.forEach(({ s, autor }) => [...(s.fundamentos || []), s.fundamento].forEach(c => {
    c = String(c || '').trim(); if (!c || contOficial(c)) return;
    const k = contKey(c), e = m.get(k) || { c, n: 0, quien: new Set(), ts: 0 };
    e.n++; if (autor) e.quien.add(autor); e.ts = Math.max(e.ts, s.ts || 0); m.set(k, e);
  }));
  return [...m.values()].sort((a, b) => b.ts - a.ts);
}
const misCont = () => contSueltos(sessions.map(s => ({ s })));
// fundamentos (de la lista del club) de tu próxima sesión con fecha; si no hay, de la última que tocaste
function fundProx() {
  const hoy = isoToday(), con = sessions.filter(s => (s.fundamentos || []).some(contOficial));
  const fut = con.filter(s => s.fecha && s.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const s = fut || con.sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];
  return s ? { s, fut: !!fut, c: s.fundamentos.filter(contOficial) } : null;
}

// ================= revisión automática (21 oct): el semáforo de cada ejercicio =================
// Mira estructura y redacción con lo que ya hay en la app (tipos de tarea, modelo de juego, objetivos por categoría). No juzga si el ejercicio es bueno.
const RV_ABIERTA = /(^|[\s¿¡])(qu[eé]|c[oó]mo|cu[aá]ndo|d[oó]nde|ad[oó]nde|por ?qu[eé]|cu[aá]l(es)?|qui[eé]n(es)?|cu[aá]nt[oa]s?|para qu[eé])(?=[\s?,]|$)/i;
const RV_DECIDE = /(^|\s)(si |elige|eligen|decide|deciden|según|puede[n]? (pasar|tirar|conducir|elegir)|opción|opciones)/i;
const rvShort = q => q.length > 60 ? q.slice(0, 57) + '…' : q;
function rvCount(t) { const it = (t.diagram && t.diagram.items) || []; const n = k => it.filter(i => i.type === k).length; return { atk: n('atk'), def: n('def'), gk: n('gk') }; }
const rvSig = t => ((t.diagram && t.diagram.items) || []).filter(i => ['atk', 'def', 'gk', 'ball'].includes(i.type)).map(i => i.type + Math.round(i.x / 5) + '.' + Math.round(i.y / 5)).sort().join('|');
function rvDup(t) {
  const same = b => b.id === t.id || (b.orig && b.orig === t.id) || (t.orig && t.orig === b.id);
  const ti = deacc(t.title || '').trim(), sg = rvSig(t), np = sg ? sg.split('|').length : 0;
  return bank.tasks.find(b => !same(b) && ((ti && deacc(b.title || '').trim() === ti) || (np >= 3 && rvSig(b) === sg))) || null;
}
function checkTask(t) {
  const L = [], add = (lvl, txt) => L.push({ lvl, txt });
  const m = t.smb || {}, n = rvCount(t), rules = (t.rules || []).filter(x => String(x).trim()), qs = (m.preguntas || []).filter(x => String(x).trim());
  const cats = t.cats || [], tec = t.tec || [];
  // completo
  if (!(t.title || '').trim()) add('bad', 'Sin nombre.');
  if (!n.atk && !n.def && !n.gk) add('bad', 'El gráfico no tiene jugadores.');
  if (!rules.length) add('bad', 'Sin normas.');
  if (!t.tipo) add('bad', 'Sin tipo de tarea (calentamiento, técnico-táctico, toma de decisión…).');
  if (!cats.length) add('warn', 'Sin categoría: no se puede comprobar si encaja con la edad.');
  if (!(t.fases || []).length && !tec.length) add('warn', 'No dice qué trabaja: marca una fase del juego o un contenido técnico.');
  if (cats.length && tec.length) { const out = tec.filter(c => !TEC_NAMES.some(f => tecList(f, cats).includes(c))); if (out.length) add('warn', `Contenido técnico que no es de ${cats.map(catName).join(' ni ')}: ${out.join(', ')}.`); }
  // encaja con el tipo
  if (t.tipo === 'decision') { if (!n.def || n.atk < 2) add('warn', 'Toma de decisión sin oposición: pide atacantes y defensores (de 3c3 a 4c4).'); else if (Math.max(n.atk, n.def) > 4) add('warn', `Toma de decisión con ${n.atk}c${n.def}: el máximo es 4c4.`); }
  if (t.tipo === 'tecnico' && !n.def && !rules.some(r => RV_DECIDE.test(r))) add('warn', 'Técnico-táctico sin oposición ni ninguna norma que obligue a elegir.');
  if (t.tipo === 'global' && (n.atk < 3 || n.def < 3)) add('warn', `Juego global con ${n.atk}c${n.def}: pide al menos 3 por equipo.`);
  // feedback interrogativo y progresión
  if (qs.length < 2) add('warn', qs.length ? 'Solo una pregunta para parar la tarea: pon al menos dos.' : 'Sin preguntas para parar la tarea (feedback interrogativo).');
  qs.forEach(q => { if (!/\?/.test(q)) add('warn', `No parece una pregunta: «${rvShort(q)}».`); else if (!RV_ABIERTA.test(q) && !/\s[ou]\s/i.test(q)) add('warn', `Pregunta de sí o no: «${rvShort(q)}». Mejor abierta: ¿qué…?, ¿cuándo…?, ¿cómo…?`); });
  if (!(m.lee || '').trim()) add('warn', 'Falta qué tiene que leer el jugador.');
  if (!(m.facil || '').trim() || !(m.dificil || '').trim()) add('warn', 'Falta la versión más fácil o la más difícil.');
  // que se pueda explicar el martes en pista
  if (rules.length > 6) add('warn', `${rules.length} normas: demasiadas para explicarlas en pista.`);
  const long = rules.filter(r => String(r).split(/\s+/).length > 30).length;
  if (long) add('warn', long === 1 ? 'Una norma muy larga (más de 30 palabras).' : `${long} normas muy largas (más de 30 palabras).`);
  // repetidos
  const dup = rvDup(t); if (dup) add('warn', `Se parece mucho a «${dup.title || 'sin nombre'}» del banco${dup.num ? ' (nº ' + dup.num + ')' : ''}.`);
  return { lvl: L.some(x => x.lvl === 'bad') ? 'bad' : L.length ? 'warn' : 'ok', items: L };
}
const RV_LBL = { ok: 'Cumple', warn: 'Revisar', bad: 'Falta algo' };
const rvDot = r => `<span class="rv-dot rv-${r.lvl}">${RV_LBL[r.lvl]}${r.items.length ? ' · ' + r.items.length : ''}</span>`;
const rvListHTML = r => r.items.length ? `<ul class="rv-items">${r.items.map(x => `<li class="rv-${x.lvl}">${esc(x.txt)}</li>`).join('')}</ul>` : '<p class="rv-allok">Todo en orden según las comprobaciones automáticas.</p>';
// notas de la DT a los entrenadores (van en el club; las ve el autor en su app)
const notasDe = tid => (bank.notas || []).filter(x => x.tid === tid);

const OLLER = 'Marc Oller (libro)';
const tipoName = v => (TIPOS.find(x => x.v === v) || {}).n || '';
const authorOf = t => t.source === 'oller' ? OLLER : (t.author || 'Sin nombre');
const view = { tab: 'banco', tipo: '', fase: '', cont: '', cat: '', autor: '', bloque: '', q: '' };
let canWriteBank = false, artifactApi = null;

function loadMine() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; } }
const cloudPush = k => { try { if (window.SMB_CLOUD) window.SMB_CLOUD.push(k); } catch (e) {} };
function saveMine() { try { localStorage.setItem(LS_KEY, JSON.stringify(mine)); cloudPush('mine'); return true; } catch (e) { return false; } }
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);

