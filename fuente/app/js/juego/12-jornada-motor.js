// ================= la semana: votación y jornada del vestuario =================
const PTS_SEM = { semana: 25, duelo: 5 };
const PODERES = [
  { id: 'garra', n: 'Garra', lv: 0, d: '+2 al atacar en la 2ª parte.' },
  { id: 'presion', n: 'Defensa presionante', lv: 2, d: '+3 al defender en la 1ª parte.' },
  { id: 'directo', n: 'Instinto de gol', lv: 2, d: '+3 en tu último ataque.' },
  { id: 'parada', n: 'Especialista en bola parada', lv: 3, d: '+2 en faltas directas y penaltis. +1 en la tanda.' },
  { id: 'lectura', n: 'Lectura de juego', lv: 4, d: 'La primera vez que sacas 3 o menos, repites.' },
  { id: 'muro', n: 'Portería a cero', lv: 4, d: 'Para el primer gol que te meten por 1 o 2.' },
  { id: 'contra', n: 'Contraataque', lv: 5, d: 'Si paras su ataque, tu siguiente ataque +3.' },
  { id: 'rotaciones', n: 'Rotaciones', lv: 6, d: 'Último minuto: repites los dados de 4 o menos.' },
  { id: 'ptp', n: 'Presión tras pérdida', lv: 7, d: 'Anula el poder del rival en la 2ª parte.' },
  { id: 'pizarra', n: 'Pizarra del míster', lv: 8, d: 'Copia el poder del rival.' },
  { id: 'leyenda', n: 'Se juega como se entrena', lv: 9, d: '+1 en cada ataque y cada defensa.' },
];
const PARTES = ['1ª parte', '2ª parte', 'Último minuto'];
const poderOf = id => PODERES.find(p => p.id === id) || PODERES[0];
function mondayISO(d) {
  const x = d ? new Date(d) : new Date(); x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
const fmtDay = iso => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); };
const coachOf = name => (bank.coaches || []).find(x => normName(x.name) === normName(name));
const liga = () => bank.liga || [];
const lastJornada = () => liga()[liga().length - 1] || null;
const thisWeekPlayed = () => liga().some(j => j.week === mondayISO());


// ---------- candidatos ----------
const sesTitle = c => `${c.s.equipo || 'Sesión'}${c.s.fecha ? ' · ' + fmtShort(c.s.fecha) : ''}`;
function proposeSession(s) {
  if (!sesComplete(s)) { openModal(`<h2>Sesión sin terminar</h2><p>Para mandarla a la Dirección Técnica tiene que tener un ejercicio en cada bloque.</p><div class="row"><button class="btn primary" id="m-no" type="button">Entendido</button></div>`); modalCard.querySelector('#m-no').onclick = closeModal; return; }
  sendModal({ kind: 'ses', ref: s.id, title: sesTitle({ s }), code: 'SMB4:' + toB64(JSON.stringify({ v: 4, autor: readAuthor() || s.entrenador || '', s })), head: 'Mandar a la DT',
    text: `Tu sesión «${sesTitle({ s })}», para que la vea la Dirección Técnica.` });
}
function sesStrip(s) {
  return `<div class="cand-strip">${s.bloques.slice(0, 4).map(b => `<span>${b.task ? diagramSVG(b.task.diagram, taskLabel(b.task)) : ''}</span>`).join('')}</div>`;
}
function reviewSession(raw, out) {
  let p;
  try { p = JSON.parse(fromB64(raw.slice(5).replace(/\s+/g, ''))); if (!p || p.v !== 4 || !p.s || !Array.isArray(p.s.bloques)) throw 0; }
  catch (e) { out.innerHTML = '<p class="msg err">Ese código de sesión no es válido. Comprueba que se ha copiado entero.</p>'; return; }
  const s = p.s;
  out.innerHTML = `<div class="cand"><div class="cand-fig">${sesStrip(s)}</div><div class="cand-txt"><b>${esc(sesTitle({ s }))}</b><small>De ${esc(p.autor || 'un entrenador')}${fundamentoText(s) ? ' · ' + esc(fundamentoText(s)) : ''}</small></div></div>
    <div class="actions"><button class="btn" id="rv-sheet" type="button">Ver ficha</button><button class="btn" id="rv-ses" type="button">Guardar en mis sesiones</button></div><p class="msg" id="rv-msg" aria-live="polite"></p>`;
  document.getElementById('rv-sheet').onclick = () => openSheet(s);
  document.getElementById('rv-ses').onclick = () => { const m = document.getElementById('rv-msg'); const ok = copySession(s); m.className = ok ? 'msg ok' : 'msg err'; m.textContent = ok ? 'Guardada en tus sesiones.' : 'Este navegador no deja guardar.'; };
}
function copySession(s) { const c = clone(s); c.id = 'ses-' + uid(); c.ts = Date.now(); c.fecha = isoToday(); sessions.push(c); const ok = saveSes(); render(); return ok; }

// ---------- jornada: duelos ----------

function rng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function pairings(names, round) {
  const L = [...names]; if (L.length % 2) L.push(null);
  const n = L.length, rest = L.slice(1), r = round % (n - 1);
  const arr = [L[0], ...rest.slice(r), ...rest.slice(0, r)], out = [];
  for (let i = 0; i < n / 2; i++) out.push([arr[i], arr[n - 1 - i]]);
  return out;
}
// jugadas del míster: cada una juega con un dado distinto. Más caras = más riesgo; menos caras = más seguro.
const JUGADAS = [
  { id: 'J', n: 'Juego posicional', dado: '1–10, +1', c: 'Con bola', d: 'Mover la bola hasta encontrar el hueco. Lo de siempre.' },
  { id: 'A', n: 'Asegurar la bola', dado: '3–8', c: 'Con bola', d: 'Posesión larga, sin riesgos. Partido cerrado: en esa jugada solo hay gol si alguien gana por 3 o más.' },
  { id: 'D', n: 'Ataque directo', dado: '1–12', c: 'Con bola', d: 'Robar y salir en vertical. Con 1 o 2 pierdes la bola (cuenta 0). La presión del rival no te afecta.' },
  { id: 'P', n: 'Presión alta', dado: '1–8', c: 'Sin bola', d: 'Defensa presionante: el rival tira dos dados y se queda con el peor (salvo si sale en Ataque directo).' },
  { id: 'Z', n: 'Cerrar la zona', dado: '1–8, +1', c: 'Sin bola', d: 'Repliegue y bloque bajo: al rival su dado no le cuenta más de 7.' },
  { id: 'T', n: 'Tengo arriba', dado: '1–20', c: 'Sin bola', d: 'Un defensa sale a robar como loco. Del 1 al 8 falla y te quedas con tres (cuentas 0 y el rival +3). Del 15 al 20 roba: ocasión clarísima, +4. Una vez por partido.' },
];
const JUG_DIE = { J: [1, 10], A: [3, 8], D: [1, 12], T: [1, 20], P: [1, 8], Z: [1, 8] };
const OLD_O = { C: 'J', X: 'D' };   // pizarras de antes: Combinar → Juego posicional, Salir a la contra → Ataque directo
const normO = o => OLD_O[o] || o || '';
const golDe = (d, i) => d.g ? d.g[i] : d.a.t[i] > d.b.t[i] ? 'a' : d.b.t[i] > d.a.t[i] ? 'b' : null;
const PRECIO_ESTRELLA = 15, RETOS_GRATIS = 3, PRECIO_RETO = 10;
const JUG_IC = {
  pos: '<path d="M4 17h4l3-6 3 6h6M6 7h2M12 4v2M18 7h-2"/>',
  dir: '<path d="M4 19 19 4M12 4h7v7"/>',
  ens: '<path d="M5 5h4v4H5zM15 15h4v4h-4zM9 7h6v8"/>',
  tiro: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  des: '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',
  pre: '<path d="M4 12h9M9 7l5 5-5 5M17 5v14"/>',
  zona: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  ind: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/><path d="M10.5 10.5l3 3"/>',
  arr: '<path d="M12 20V6M6 11l6-6 6 6M5 20h14"/>',
};
const jugIcon = k => JUG_IC[k] ? `<svg class="jug-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${JUG_IC[k]}</svg>` : '';
// ================= el partido: 8 posesiones, 4 para cada uno =================
// Con bola eliges cómo atacar; sin bola, cómo defender. Cada jugada tira su dado.
// Todo se decide posesión a posesión y con dados propios: lo que eliges después nunca cambia lo anterior.
const POS_N = 8;
const ATAQUES = [
  { id: 'J', n: 'Posicional', dado: '1–10 +1', d: 'Seguro. Mueve y busca el hueco.', ic: 'pos' },
  { id: 'D', n: 'Ataque directo', dado: '1–12', d: 'Salta la presión. Con 1–2 la pierdes.', ic: 'dir' },
  { id: 'E', n: 'Jugada ensayada', dado: '1–8 +3', d: 'Una vez por partido.', ic: 'ens', once: true },
  { id: 'T', n: 'Tiro exterior', dado: '1–20', d: 'Del 1 al 10, fuera.', ic: 'tiro' },
  { id: 'X', n: 'A la desesperada', dado: '1–20 +2', d: 'Solo perdiendo al final. Con 1–6, contra.', ic: 'des', last: true },
];
const DEFENSAS = [
  { id: 'P', n: 'Presión alta', dado: '1–10 +1', d: 'Tira dos y se queda el peor.', ic: 'pre' },
  { id: 'Z', n: 'Cerrar la zona', dado: '1–8 +3', d: 'Su dado no pasa de 7.', ic: 'zona' },
  { id: 'I', n: 'Individual', dado: '1–10 +2', d: 'Le quitas sus bonus.', ic: 'ind' },
  { id: 'A', n: 'Tengo arriba', dado: '1–20', d: '1–8 fallas (+3 suyo). 15–20 robas.', ic: 'arr', once: true },
];
const JUG3 = Object.fromEntries([...ATAQUES, ...DEFENSAS].map(j => [j.id, j]));
const DIE3 = { J: [1, 10, 1], D: [1, 12, 0], E: [1, 8, 3], T: [1, 20, 0], X: [1, 20, 2], P: [1, 10, 1], Z: [1, 8, 3], I: [1, 10, 2], A: [1, 20, 0] };
const posAtk = p => (p % 2 === 0 ? 'a' : 'b');
const PARTE3 = p => (p < 4 ? '1ª parte' : p < 6 ? '2ª parte' : 'Último minuto');
const MIN3 = [6, 13, 19, 24, 31, 38, 45, 49];
const jugN = id => (JUG3[id] || JUGADAS.find(j => j.id === normO(id)) || {}).n || '';
const ordenN = jugN;
// pizarra: ataque y defensa habituales, y si se la juega cuando va perdiendo al final
function pzNorm(pz) {
  if (!pz) return null;
  if (pz.at || pz.de) return { at: ATAQUES.some(j => j.id === pz.at && !j.last) ? pz.at : 'J', de: DEFENSAS.some(j => j.id === pz.de) ? pz.de : 'P', desesp: pz.desesp !== false, ts: pz.ts || 0 };
  const o = (pz.o || []).map(normO); // pizarras de antes (tres jugadas)
  return { at: o.includes('D') ? 'D' : 'J', de: o.includes('Z') ? 'Z' : o.includes('T') ? 'A' : 'P', desesp: true, ts: pz.ts || 0 };
}
function planAzar(seed) { const R = rng(seed); return { rand: seed, at: 'JDET'[Math.floor(R() * 4)], de: 'PZIA'[Math.floor(R() * 4)], desesp: R() < 0.6, o: [], charla: -1, estrella: -1 }; }
const randPick = (pl, p, L) => { const R = rng(pl.rand + '|' + p); return L[Math.floor(R() * L.length)]; };
function planDePizarra(pz, seed) { const P = pzNorm(pz); return P ? Object.assign({ o: [], charla: -1, estrella: -1 }, P) : planAzar(seed); }
function playDuel(A, B, seed) {
  const Re = rng(seed + '|ev'), Rx = rng(seed + '|x');
  const d10 = R => 1 + Math.floor(R() * 10);
  const die = (o, R) => { const [lo, hi] = DIE3[o]; return lo + Math.floor(R() * (hi - lo + 1)); };
  const real = (p, q) => p === 'pizarra' ? (q === 'pizarra' ? 'garra' : q) : p;
  const side = (P, pw, k) => ({ k, name: P.name, lvl: P.lvl || 0, forma: P.forma || 0, sq: P.sq || null, poder: P.poder, uses: pw, est: P.est || null, plan: P.plan || planAzar(seed + '|' + k), usedE: false, usedA: false, lect: false, muro: false, contra: false, perd: false });
  const a = side(A, real(A.poder, B.poder), 'a'), b = side(B, real(B.poder, A.poder), 'b'), S = { a, b };
  const pwOn = (x, y, p) => !(p >= 4 && y.uses === 'ptp' && x.uses !== 'ptp');   // presión tras pérdida: anula el poder del rival en la 2ª parte
  const P = [];
  let ga = 0, gb = 0;
  for (let p = 0; p < POS_N; p++) {
    const ak = posAtk(p), dk = ak === 'a' ? 'b' : 'a', x = S[ak], y = S[dk];
    const goalsX = ak === 'a' ? ga : gb, goalsY = ak === 'a' ? gb : ga, lastAtk = p >= POS_N - 2;
    const pw = [], add = (s, t) => pw.push({ s, t });
    // 1. qué juega cada uno
    let oa = (x.plan.o || [])[p] || (x.plan.rand ? randPick(x.plan, p, 'JJJDDTE') : x.plan.at) || 'J';
    if (oa === 'X' && !(lastAtk && goalsX < goalsY)) oa = x.plan.at && x.plan.at !== 'X' ? x.plan.at : 'J';
    if (!(x.plan.o || [])[p] && lastAtk && goalsX < goalsY && x.plan.desesp) oa = 'X';
    if (oa === 'E' && x.usedE) oa = 'J';
    if (!DIE3[oa] || !ATAQUES.some(j => j.id === oa)) oa = 'J';
    let od = (y.plan.o || [])[p] || (y.plan.rand ? randPick(y.plan, p, 'PPPZZIA') : y.plan.de) || 'P';
    if (od === 'A' && y.usedA) od = 'P';
    if (!DEFENSAS.some(j => j.id === od)) od = 'P';
    if (oa === 'E') x.usedE = true; if (od === 'A') y.usedA = true;
    // 2. situación: tarjeta azul (el que juega con uno más tira dos y se queda el mejor), falta directa o penalti
    let ev = null;
    if (Re() < 0.18) { const r = Re(); ev = { k: r < 0.45 ? 'azul' : r < 0.78 ? 'falta' : 'penalti', s: Re() < 0.5 ? 'a' : 'b' }; }
    // 3. los dados
    const Ra = rng(seed + '|pa' + p), Rd = rng(seed + '|pd' + p);
    const a1 = die(oa, Ra), a2 = die(oa, Ra), d1 = die(od, Rd), d2 = die(od, Rd);
    let ra = a1, rd = d1;
    const azA = ev && ev.k === 'azul' && ev.s === ak, azD = ev && ev.k === 'azul' && ev.s === dk;
    const pres = od === 'P' && oa !== 'D';
    if (pres && !azA) { ra = Math.min(a1, a2); add(dk, 'Presión: dos dados, el peor'); }
    else if (azA && !pres) ra = Math.max(a1, a2);
    if (azD) rd = Math.max(d1, d2);
    // lectura de juego: la primera vez que sacas 3 o menos, repites
    [[x, 'ra'], [y, 'rd']].forEach(([z, w]) => {
      const v = w === 'ra' ? ra : rd;
      if (z.uses === 'lectura' && !z.lect && v <= 3 && pwOn(z, z === x ? y : x, p)) { z.lect = true; const n2 = die(w === 'ra' ? oa : od, Rx); if (n2 > v) { if (w === 'ra') ra = n2; else rd = n2; add(z.k, `Lectura de juego: repite (${v} → ${n2})`); } }
      const v2 = w === 'ra' ? ra : rd;
      if (z.uses === 'rotaciones' && lastAtk && v2 <= 4 && pwOn(z, z === x ? y : x, p)) { const n2 = die(w === 'ra' ? oa : od, Rx); if (n2 > v2) { if (w === 'ra') ra = n2; else rd = n2; add(z.k, `Rotaciones: repite (${v2} → ${n2})`); } }
    });
    // jugador estrella: repite tu dado y te quedas el mejor
    [[x, 'ra', oa], [y, 'rd', od]].forEach(([z, w, o]) => { if (z.plan.estrella === p) { const n2 = die(o, rng(seed + '|est' + z.k + p)), v = w === 'ra' ? ra : rd; if (n2 > v) { if (w === 'ra') ra = n2; else rd = n2; } add(z.k, `Jugador estrella: ${v} → ${Math.max(v, n2)}`); } });
    // 4. lo que hace cada jugada
    let res = null, va = ra, vd = rd, ba = DIE3[oa][2], bd = DIE3[od][2];
    if (od === 'Z' && va > 7) { va = 7; add(dk, `Zona: su ${ra} cuenta 7`); }
    if (od === 'I' && ba) { add(dk, `Individual: le quita el +${ba}`); ba = 0; }
    if (oa === 'D' && ra <= 2) res = 'perdida';
    if (oa === 'T' && va <= 10 && !res) res = 'fuera';
    if (oa === 'X' && ra <= 6 && !res) res = 'contraX';
    if (od === 'A' && !res) { if (rd <= 8) { vd = 0; bd = 0; ba += 3; add(dk, 'Tengo arriba: falla y se queda con tres'); } else if (rd >= 15) res = 'robo'; else vd = rd - 3; }
    // 5. bonus: nivel, forma, poderes, garra del que pierde, charla, contra
    let ta = va + ba + x.lvl + x.forma, td = vd + bd;
    const pa = (v, t) => { ta += v; add(ak, t); }, pd = (v, t) => { td += v; add(dk, t); };
    const sb = sqBonus(x.sq, y.sq);
    if (sb > 0) pa(sb, `Plantilla +${sb}`); else if (sb < 0) pd(-sb, `Defensa de su plantilla +${-sb}`);
    if (goalsX < goalsY) pa(Math.min(2, goalsY - goalsX), `Garra del que pierde +${Math.min(2, goalsY - goalsX)}`);
    if (x.contraNext) { x.contraNext = false; if (pwOn(x, y, p)) pa(3, 'Contraataque +3'); }
    if (x.bonusPerd) { x.bonusPerd = false; pa(2, 'Tras su pérdida +2'); }
    if (pwOn(x, y, p)) {
      if (x.uses === 'garra' && p >= 4) pa(2, 'Garra +2');
      if (x.uses === 'directo' && lastAtk) pa(3, 'Instinto de gol +3');
      if (x.uses === 'leyenda') pa(1, 'Se juega como se entrena +1');
    }
    if (pwOn(y, x, p)) {
      if (y.uses === 'presion' && p < 4) pd(3, 'Defensa presionante +3');
      if (y.uses === 'leyenda') pd(1, 'Se juega como se entrena +1');
    }
    if (x.plan.charla === p) pa(2, 'Charla +2');
    if (y.plan.charla === p) pd(2, 'Charla +2');
    // 6. ¿gol?
    let gol = false, golDef = false, contra = null;
    if (!res) {
      if (ta > td) {
        if (y.uses === 'muro' && !y.muro && ta - td <= 2 && pwOn(y, x, p)) { y.muro = true; res = 'parada'; add(dk, '¡Paradón! Portería a cero'); }
        else { res = 'gol'; gol = true; }
      } else { res = 'parada'; }
    }
    if (res === 'perdida') { y.bonusPerd = true; }
    if (res === 'robo' || res === 'contraX') { const r = d10(Re); contra = { r, gol: r >= 4 }; golDef = contra.gol; }
    if (res === 'parada' && y.uses === 'contra' && pwOn(y, x, p)) { y.contraNext = true; add(dk, 'Contraataque: su próximo ataque +3'); }
    if (gol) { if (ak === 'a') ga++; else gb++; }
    if (golDef) { if (dk === 'a') ga++; else gb++; }
    // falta directa o penalti, después de la jugada
    if (ev && ev.k !== 'azul') { const z = S[ev.s]; ev.r = d10(Re); ev.bonus = z.uses === 'parada' ? 2 : 0; ev.need = ev.k === 'falta' ? 8 : 6; ev.gol = ev.r + ev.bonus >= ev.need; if (ev.gol) { if (ev.s === 'a') ga++; else gb++; } }
    P.push({ p, at: ak, oa, od, ra, rd, va, vd, ta, td, res, gol, contra, ev, pw: pw.filter(z => z.t), ga, gb });
  }
  let pen = null, pens = [];
  if (ga === gb) { for (let k = 0; k < 12 && !pen; k++) { const u = d10(Re) + (a.uses === 'parada' ? 1 : 0), v = d10(Re) + (b.uses === 'parada' ? 1 : 0); pens.push([u, v]); if (u !== v) pen = u > v ? 'a' : 'b'; } if (!pen) pen = 'a'; }
  const win = ga > gb || pen === 'a' ? a.name : b.name;
  const pack = x => ({ name: x.name, lvl: x.lvl, forma: x.forma, sq: x.sq || null, poder: x.poder, uses: x.uses, est: x.est || null });
  return { v: 3, a: pack(a), b: pack(b), ga, gb, P, pen, pens, win };
}
function playJornada(finde) {
  const cs = [...(bank.coaches || [])].sort((x, y) => x.name.localeCompare(y.name, 'es'));
  const n = liga().length + 1, week = mondayISO();
  const P = c => ({ name: c.name, lvl: duelLvl(levelOf(clubPoints(c.name))), forma: 2 * Math.min(2, +finde[c.name] || 0), sq: sqOf(c.name), est: estiloDe(c.name), poder: c.poder && poderOf(c.poder).lv <= levelOf(clubPoints(c.name)) ? c.poder : 'garra',
    plan: planDePizarra(normName(c.name) === normName(readAuthor()) ? (game.pizarra || c.pizarra) : c.pizarra, week + '|pz|' + c.name) });
  const duels = [], rest = [];
  pairings(cs.map(c => c.name), n - 1).forEach(([x, y]) => {
    if (!x || !y) { rest.push(x || y); return; }
    duels.push(playDuel(P(coachOf(x)), P(coachOf(y)), week + '|' + x + '|' + y));
  });
  return { n, week, fecha: isoToday(), finde: clone(finde), duels, rest };
}
const ligaWins = name => liga().reduce((a, j) => a + j.duels.filter(d => normName(d.win) === normName(name)).length, 0);
const ligaPlayed = name => liga().reduce((a, j) => a + j.duels.filter(d => normName(d.a.name) === normName(name) || normName(d.b.name) === normName(name)).length, 0);
function record(name) { const p = ligaPlayed(name), w = ligaWins(name); return p ? `${w} ${w === 1 ? 'victoria' : 'victorias'} · ${p - w} ${p - w === 1 ? 'derrota' : 'derrotas'}` : ''; }
function scoreTxt(d) { return `${d.ga}–${d.gb}${d.pen ? ' (pen.)' : ''}`; }
function miniAv(name) { const c = coachOf(name); return `<span class="duel-av">${avatarSVG(c ? c.avatar : defaultAvatar(), levelOf(clubPoints(name)))}</span>`; }
function jornadaHTML() {
  const J = lastJornada(), nC = (bank.coaches || []).length;
  if (!J) return nC >= 2 ? `<section class="ses-sec jornada"><h2 class="h-sec">Jornada del vestuario ${infoBtn('jornada')}</h2><p class="sub">Cada lunes los personajes del cuerpo técnico juegan un partido de 8 posesiones con su pizarra. La primera jornada se juega el próximo lunes: elige tu poder en <button class="linkb" type="button" data-go="perfil">Mi perfil</button>.</p></section>` : '';
  const me = normName(readAuthor());
  return `<section class="ses-sec jornada"><div class="j-head"><h2 class="h-sec">Jornada ${J.n} del vestuario ${infoBtn('jornada')}</h2><span class="sub">${esc(fmtDay(J.fecha))}</span></div>
    <ul class="duels">${J.duels.map((d, i) => { const mine = me && (normName(d.a.name) === me || normName(d.b.name) === me);
      return `<li class="duel${mine ? ' mine' : ''}"><button type="button" data-wk="duel" data-j="${J.n}" data-i="${i}" aria-label="Ver el duelo ${esc(d.a.name)} contra ${esc(d.b.name)}">
        <span class="duel-side${normName(d.win) === normName(d.a.name) ? ' w' : ''}">${miniAv(d.a.name)}<span>${esc(d.a.name)}</span></span>
        <span class="duel-score">${scoreTxt(d)}<small>Ver</small></span>
        <span class="duel-side r${normName(d.win) === normName(d.b.name) ? ' w' : ''}"><span>${esc(d.b.name)}</span>${miniAv(d.b.name)}</span></button></li>`; }).join('')}</ul>
    ${J.rest.length ? `<p class="sub">Descansa: ${J.rest.map(esc).join(', ')}.</p>` : ''}
    <p class="sub">Ganar un duelo: +${PTS_SEM.duelo} puntos del club. Tu poder y tu forma, en <button class="linkb" type="button" data-go="perfil">Mi perfil</button>.</p>
  </section>`;
}
const EV_TXT = { azul: 'Tarjeta azul', falta: 'Falta directa', penalti: 'Penalti' };
function evText(d, e) {
  const X = e.s === 'a' ? d.a : d.b, Y = e.s === 'a' ? d.b : d.a;
  if (e.k === 'azul') return `Tarjeta azul a ${Y.name}: ${X.name} juega con uno más (tira dos dados y se queda el mejor).`;
  return `${EV_TXT[e.k]} para ${X.name}: dado ${e.r}${e.bonus ? ' + ' + e.bonus + ' de bola parada' : ''}${e.gol ? ' — ¡gol!' : ' — lo para el portero.'}`;
}
function playLine(d, i) {
  const s = (x, t) => `<span class="pl-s"><b>${esc(x.name)}</b>${x.o && x.o[i] ? ` <small class="pl-j">${esc(jugN(x.o[i]))}</small>` : ''} <span class="pl-calc">dado ${x.r && x.r[i] !== x.d[i] ? `${x.r[i]} (cuenta ${x.d[i]})` : x.d[i]}${x.lvl ? ` + nivel ${x.lvl}` : ''}${x.forma ? ` + forma ${x.forma}` : ''}${x.e[i] ? ` ${x.e[i] > 0 ? '+' : '−'} ${Math.abs(x.e[i])}` : ''} = <b>${t[i]}</b></span>${x.note[i] ? `<em>${esc(x.note[i])}</em>` : ''}</span>`;
  const gw = golDe(d, i), r = gw === 'a' ? `Gol de ${d.a.name}` : gw === 'b' ? `Gol de ${d.b.name}` : (d.a.o && (d.a.o[i] === 'A' || d.b.o[i] === 'A') ? 'Partido cerrado: nadie marca' : 'Nadie marca');
  const evs = (d.ev || []).filter(e => e.i === i);
  return `<li class="play"><span class="pl-k">${PARTES[i]}</span>${s(d.a, d.a.t)}${s(d.b, d.b.t)}<span class="pl-r">${esc(r)}</span>${evs.map(e => `<span class="pl-ev">${esc(evText(d, e))}</span>`).join('')}</li>`;
}
// ---------- el partido por posesiones, en la jornada ----------
function posLine(d, x) {
  const N = { a: d.a.name, b: d.b.name }, A = N[x.at], Dn = N[x.at === 'a' ? 'b' : 'a'];
  const c = x.contra ? (x.contra.gol ? ` ¡Gol de ${Dn} a la contra!` : ' Pero no marca.') : '';
  return ({ gol: `¡Gol de ${A}!`, parada: `Para ${Dn}.`, fuera: 'Fuera.', perdida: `${A} la pierde.`, robo: `¡Robo de ${Dn}!${c}`, contraX: `${A} se la juega y la pierde.${c}` })[x.res] || '';
}
function evLine(d, x) {
  const e = x.ev; if (!e) return '';
  const S = e.s === 'a' ? d.a.name : d.b.name;
  if (e.k === 'azul') return `Tarjeta azul: ${S} juega con uno más.`;
  return `${e.k === 'falta' ? 'Falta directa' : 'Penalti'} para ${S}: ${e.r}${e.bonus ? '+' + e.bonus : ''} — ${e.gol ? '¡gol!' : 'lo para el portero.'}`;
}
function openDuel3(J, d) {
  const N = { a: d.a.name, b: d.b.name }, pw = x => `${esc(poderOf(x.poder).n)}${x.uses !== x.poder ? ` (copia ${esc(poderOf(x.uses).n)})` : ''}`;
  const side = (k, o, t, r) => `<span class="p3-s ${k}${r ? ' r' : ''}">${r ? `<b class="p3-t">${t}</b>` : ''}<span class="p3-j">${jugIcon((JUG3[o] || {}).ic)}<span>${esc(jugN(o))}</span></span>${r ? '' : `<b class="p3-t">${t}</b>`}</span>`;
  openModal(`<div class="duel-modal"><h2>${J ? 'Jornada ' + J.n : 'Partido'}</h2>
    <div class="dm-head"><div class="dm-p">${miniAv(d.a.name)}<b>${esc(d.a.name)}</b><small>${pw(d.a)}</small></div>
      <div class="dm-score" id="dm-score">0–0</div>
      <div class="dm-p">${miniAv(d.b.name)}<b>${esc(d.b.name)}</b><small>${pw(d.b)}</small></div></div>
    <ol class="plays p3" id="dm-plays">${d.P.map(x => { const at = x.at, l = at === 'a'; return `<li class="play${x.gol || (x.contra && x.contra.gol) || (x.ev && x.ev.gol) ? ' g' : ''}"><span class="pl-k">${MIN3[x.p]}'</span><span class="p3-row">${l ? side('a', x.oa, x.ta) : side('a', x.od, x.td)}<span class="p3-arrow" aria-label="${l ? 'ataca ' + esc(N.a) : 'ataca ' + esc(N.b)}">${l ? '→' : '←'}</span>${l ? side('b', x.od, x.td, 1) : side('b', x.oa, x.ta, 1)}</span><span class="pl-r">${esc(posLine(d, x))}${x.ev && x.ev.k !== 'azul' ? ' ' + esc(evLine(d, x)) : ''}</span>${x.pw.length || (x.ev && x.ev.k === 'azul') ? `<span class="pl-ev">${[...(x.ev && x.ev.k === 'azul' ? [evLine(d, x)] : []), ...x.pw.map(z => z.t)].map(esc).join(' · ')}</span>` : ''}</li>`; }).join('')}</ol>
    <p class="dm-end" id="dm-end" hidden>${d.pen ? `Empate a ${d.ga}. Penaltis: ${d.pens.map(p => p.join('–')).join(', ')}. ` : ''}<b>Gana ${esc(d.win)}</b>${J ? ` · +${PTS_SEM.duelo} puntos del club` : ''}</p>
    <div class="row"><button class="btn" id="m-skip" type="button">Ver resultado</button><button class="btn primary" id="m-close" type="button">Cerrar</button></div></div>`);
  const plays = [...modalCard.querySelectorAll('.play')], score = modalCard.querySelector('#dm-score'), end = modalCard.querySelector('#dm-end');
  let k = 0, timer = null;
  const fin = () => { end.hidden = false; score.textContent = scoreTxt(d); modalCard.querySelector('#m-skip').hidden = true; };
  const step = () => { if (k < plays.length) { plays[k].classList.add('on'); score.textContent = `${d.P[k].ga}–${d.P[k].gb}`; k++; timer = setTimeout(step, 700); } else fin(); };
  modalCard.querySelector('#m-skip').onclick = () => { clearTimeout(timer); plays.forEach(p => p.classList.add('on')); fin(); };
  modalCard.querySelector('#m-close').onclick = () => { clearTimeout(timer); closeModal(); };
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) modalCard.querySelector('#m-skip').click(); else timer = setTimeout(step, 400);
}
function openDuel(J, d) {
  if (d.v === 3) return openDuel3(J, d);
  const pw = x => `${esc(poderOf(x.poder).n)}${x.uses !== x.poder ? ` (copia ${esc(poderOf(x.uses).n)})` : ''}`;
  openModal(`<div class="duel-modal"><h2>Jornada ${J.n}</h2>
    <div class="dm-head"><div class="dm-p">${miniAv(d.a.name)}<b>${esc(d.a.name)}</b><small>Nivel ${d.a.lvl} · forma ${d.a.forma} · ${pw(d.a)}</small></div>
      <div class="dm-score" id="dm-score">0–0</div>
      <div class="dm-p">${miniAv(d.b.name)}<b>${esc(d.b.name)}</b><small>Nivel ${d.b.lvl} · forma ${d.b.forma} · ${pw(d.b)}</small></div></div>
    <ol class="plays" id="dm-plays">${[0, 1, 2].map(i => playLine(d, i)).join('')}</ol>
    <p class="dm-end" id="dm-end" hidden>${d.pen ? `Empate a ${d.ga}. Penaltis: ${d.pens.map(p => p.join('–')).join(', ')}. ` : ''}<b>Gana ${esc(d.win)}</b> · +${PTS_SEM.duelo} puntos del club</p>
    <div class="row"><button class="btn" id="m-skip" type="button">Ver resultado</button><button class="btn primary" id="m-close" type="button">Cerrar</button></div></div>`);
  const plays = [...modalCard.querySelectorAll('.play')], score = modalCard.querySelector('#dm-score'), end = modalCard.querySelector('#dm-end');
  let ga = 0, gb = 0, k = 0, timer = null;
  const step = () => {
    if (k < 3) { plays[k].classList.add('on'); { const gw = golDe(d, k); if (gw === 'a') ga++; else if (gw === 'b') gb++; } (d.ev || []).filter(e => e.i === k && e.gol).forEach(e => { if (e.s === 'a') ga++; else gb++; }); score.textContent = `${ga}–${gb}`; k++; timer = setTimeout(step, 1300); }
    else { end.hidden = false; score.textContent = scoreTxt(d); modalCard.querySelector('#m-skip').hidden = true; }
  };
  const all = () => { clearTimeout(timer); while (k <= 3) { if (k < 3) { plays[k].classList.add('on'); } k++; } end.hidden = false; score.textContent = scoreTxt(d); modalCard.querySelector('#m-skip').hidden = true; };
  modalCard.querySelector('#m-skip').onclick = all;
  modalCard.querySelector('#m-close').onclick = () => { clearTimeout(timer); closeModal(); };
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) all(); else timer = setTimeout(step, 500);
}

// ---------- Inicio: clics ----------
const wkClick = e => {
  const b = e.target.closest('[data-wk]'); if (!b) return;
  const a = b.dataset.wk;
  if (a === 'see-ej') { const t = bank.tasks.find(x => x.id === b.dataset.id); if (t) openDetail(t, 'bank'); }
  else if (a === 'see-pal') { const h = (bank.historial || []).find(x => x.id === b.dataset.h); if (h && h.ses) openSheet(h.ses.s); }
  else if (a === 'duel') { const J = liga().find(x => x.n === +b.dataset.j); if (J) openDuel(J, J.duels[+b.dataset.i]); }
};
['v-inicio', 'v-liga'].forEach(id => document.getElementById(id).addEventListener('click', wkClick));

// ---------- Vestuario: poderes ----------
function poderesHTML(name) {
  const lvl = levelOf(clubPoints(name)), c = coachOf(name), cur = game.poder || (c && c.poder) || 'garra', J = lastJornada();
  const myD = J && J.duels.find(d => normName(d.a.name) === normName(name) || normName(d.b.name) === normName(name));
  const forma = myD ? (normName(myD.a.name) === normName(name) ? myD.a.forma : myD.b.forma) : 0;
  const clubP = c && c.poder;
  const sqS = clSummary(clubOf()); let lgRow = null;
  try { const N = lgNow(); if (N.cur) lgRow = lgTable(N.cur, N.fx).find(r => normName(r.name) === normName(name)) || null; } catch (e) {}
  return `<div class="pw-stats"><div><span>Nivel ${lvl}</span><b>+${duelLvl(lvl)}</b><small>Suma en cada jugada</small></div><div><span>Plantilla</span><b>${sqS ? sqS.atk + '/' + sqS.def : '—'}</b><small>Ataque/defensa</small></div><div><span>Liga</span><b>${lgRow ? lgRow.g + '–' + lgRow.p : '—'}</b><small>${lgRow ? lgRow.pts + ' puntos esta temporada' : 'Victorias–derrotas'}</small></div></div>
    ${myD ? `<div class="actions"><button class="btn" type="button" data-vpw-duel="${J.duels.indexOf(myD)}">Ver mi duelo de la jornada ${J.n} · ${scoreTxt(myD)}</button></div>` : ''}
    <h3 class="h-sub">Tu poder ${infoBtn('poderes')}</h3>
    ${AUTO_PJ() ? '<p class="sub">Eliges uno y se guarda solo: cuenta en la próxima jornada y en los amistosos.</p>' : `<p class="sub">Eliges uno. Para que cuente en la jornada, manda tu personaje a la DT («Mandar a la DT», arriba): el poder va dentro.${c ? ` Ahora mismo en el vestuario del club tienes «${esc(poderOf(clubP).n)}».` : ' Todavía no estás en el vestuario del club.'}</p>
    ${c && clubP !== cur && (clubP || cur !== 'garra') && !pjSentNow() ? '<p class="notice-s">Has cambiado de poder: vuelve a enviar tu personaje para que cuente.</p>' : ''}`}
    <div class="pw-list">${PODERES.map(p => { const lock = p.lv > lvl; return `<button class="pw${cur === p.id ? ' on' : ''}" type="button" data-pw="${p.id}" aria-pressed="${cur === p.id}"${lock ? ' disabled' : ''}><b>${esc(p.n)}</b><span>${esc(p.d)}</span>${lock ? `<small>Desde «${esc(LEVELS[p.lv].n)}»</small>` : cur === p.id ? '<small>Elegido</small>' : ''}</button>`; }).join('')}</div>
    <h3 class="h-sub">Cómo es un partido de liga</h3>
    <ul class="pts-list"><li><span>Un partido cada día a las ${LG_HOUR}:00. Juega lo que tengas a esa hora: pizarra, poder, nivel y alineación.</span></li>
      <li><span>8 posesiones, 4 cada uno. Con bola juega tu ataque y sin bola tu defensa. Ataque más alto que defensa: gol.</span></li>
      <li><span>Tu plantilla suma o resta hasta 2 en cada jugada: tu ataque contra la defensa del rival.</span></li>
      <li><span>Puede haber tarjeta azul, falta directa o penalti. Empate: penaltis a un dado.</span></li>
      <li><span>Ganar un partido de liga (monedas)</span><b>+${LG_WIN}</b></li></ul>`;
}
document.getElementById('v-vestuario').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.pw) { game.poder = b.dataset.pw; saveGame(); render(); toast(`Poder elegido: ${poderOf(b.dataset.pw).n}`); }
  else if (b.dataset.vpwDuel) { const J = lastJornada(); if (J) openDuel(J, J.duels[+b.dataset.vpwDuel]); }
});

// ---------- Dirección Técnica: la jornada de la liga ----------
const dtWeek = { finde: {} };
function dtLigaHTML() {
  const cs = [...(bank.coaches || [])].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const J = thisWeekPlayed(), n = liga().length + 1;
  return `<section class="ses-sec"><h2 class="h-sec">Jornada ${n} de la liga</h2>
    ${cs.length < 2 ? '<p class="sub">Hacen falta al menos dos entrenadores en el vestuario.</p>' : J ? `<p class="sub">La jornada de esta semana ya está jugada. Se ve en Inicio.</p>` : `
      <p class="sub">Apunta los partidos del fin de semana ganados o, en formación, con el objetivo cumplido. Cuenta hasta 2 (+2 de forma cada uno).</p>
      <ul class="dt-list">${cs.map(c => `<li class="dt-row finde-row"><span class="dt-thumb">${avatarSVG(c.avatar)}</span><span class="dt-txt"><b>${esc(c.name)}</b><small>${esc(poderOf(c.poder).n)} · nivel ${levelOf(clubPoints(c.name))}</small></span>
        <span class="stepper"><button class="btn small" type="button" data-dt-finde="${esc(c.name)}" data-d="-1" aria-label="Uno menos">−</button><b>${+(dtWeek.finde[c.name] || 0)}</b><button class="btn small" type="button" data-dt-finde="${esc(c.name)}" data-d="1" aria-label="Uno más">+</button></span></li>`).join('')}</ul>
      <div class="actions"><button class="btn primary" type="button" id="dt-play">Jugar la jornada ${n}</button></div>`}
    <p class="msg" id="dt-wk-msg" aria-live="polite"></p>
  </section>`;
}
document.getElementById('v-dt').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const msg = document.getElementById('dt-wk-msg');
  if (b.dataset.dtFinde) { const k = b.dataset.dtFinde; dtWeek.finde[k] = Math.max(0, Math.min(2, (+dtWeek.finde[k] || 0) + (+b.dataset.d))); render(); }
  else if (b.id === 'dt-play') {
    const J = playJornada(dtWeek.finde);
    confirmModal(`¿Jugar la jornada ${J.n}?`, `${J.duels.length} ${J.duels.length === 1 ? 'duelo' : 'duelos'}${J.rest.length ? ', descansa ' + J.rest.join(', ') : ''}. El resultado queda fijo y sale en Inicio.`, 'Jugar', () => {
      dtWeek.finde = {};
      saveBank(bank.tasks, `Jornada ${J.n} jugada. Resultados en Inicio.`, msg, { liga: [...liga(), J] });
    });
  }
});


