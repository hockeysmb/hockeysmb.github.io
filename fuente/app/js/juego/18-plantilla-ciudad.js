// ================= plantilla: jugadores, entrenamientos y fichajes (16 oct, idea de la DT a partir de Online Soccer Manager) =================
// Cada entrenador es el míster de una plantilla de jugadores inventados (y, como cartas especiales, los personajes de otros entrenadores).
// Sus medias suman en los partidos de -2 a +2: ataque de los cuatro de pista contra la defensa rival (pista y portero).
const CL_MAX = 10, CL_TRAIN_DAY = 1, CL_FORMA_PARTIDO = 8, CL_FORMA_DIA = 6, CL_VENTA_CLUB = 0.6;
const CL_NOMBRES = ['Álex', 'Bruno', 'Carla', 'Dani', 'Elena', 'Fran', 'Gael', 'Hugo', 'Irene', 'Iker', 'Jara', 'Leo', 'Lola', 'Marco', 'Nora', 'Óscar', 'Paula', 'Rai', 'Sara', 'Teo', 'Unai', 'Vega', 'Yago', 'Zoe', 'Adri', 'Berta', 'Ciro', 'Dalia', 'Enzo', 'Gala', 'Isma', 'Lía', 'Mauro', 'Olga', 'Pau', 'Rocío', 'Saúl', 'Tina', 'Ares', 'Noa'];
const CL_APELLIDOS = ['Rebote', 'Gancho', 'Charlot', 'Freno', 'Pared', 'Rueda', 'Cuchara', 'Pala', 'Valla', 'Scoop', 'Remate', 'Patín', 'Tacos', 'Bola', 'Pista', 'Cono', 'Contra', 'Bloqueo', 'Zona', 'Escuadra', 'Palo', 'Fondo', 'Media Vuelta', 'Picada', 'Arrastre'];
const CL_ATTR = { pat: 'Patinaje', tec: 'Técnica', dis: 'Disparo', def: 'Defensa', ref: 'Reflejos' };
const CL_FOCOS = [['pat', 'Patinaje', 'Velocidad, apoyos y frenadas'], ['tec', 'Técnica', 'Conducción, pase y control'], ['dis', 'Disparo', 'Disparo y remate'], ['def', 'Defensa', '1c1 defensivo y ayudas'], ['ref', 'Porteros', 'Reflejos y colocación del portero']];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clOvr = p => p.pos === 'gk' ? Math.round(0.7 * p.a.ref + 0.3 * p.a.pat) : Math.round((p.a.pat + p.a.tec + p.a.dis + p.a.def) / 4);
const clVal = p => Math.round((0.035 * clOvr(p) ** 2 + 1.5 * Math.max(0, p.pot - clOvr(p))) * (p.coach ? 1.4 : 1));
const clForma = p => clamp(p.forma == null ? 90 : p.forma, 40, 100);
function clMake(R, pos, base, extra = {}) {
  const v = () => clamp(Math.round(base + (R() - 0.5) * 16), 20, 92);
  const a = pos === 'gk' ? { pat: v(), tec: v() - 10, dis: v() - 15, def: v() - 5, ref: v() + 4 } : { pat: v(), tec: v(), dis: v(), def: v(), ref: 10 };
  Object.keys(a).forEach(k => { a[k] = clamp(a[k], 10, 92); });
  const p = Object.assign({ id: 'pl-' + Math.floor(R() * 1e9).toString(36) + Date.now().toString(36).slice(-3), n: `${CL_NOMBRES[Math.floor(R() * CL_NOMBRES.length)]} ${CL_APELLIDOS[Math.floor(R() * CL_APELLIDOS.length)]}`, d: String(2 + Math.floor(R() * 20)), pos, a, forma: 90 }, extra);
  if (pos === 'gk') p.d = '1';
  p.pot = clamp(clOvr(p) + 6 + Math.floor(R() * 20), clOvr(p) + 2, 96);
  return p;
}
function clubOf() {
  if (!game.club || !Array.isArray(game.club.squad)) {
    const R = rng('club|' + (readAuthor() || 'yo') + '|' + Date.now());
    const squad = [clMake(R, 'gk', 44), ...[0, 1, 2, 3, 4, 5].map(() => clMake(R, 'jug', 42))];
    game.club = { v: 1, squad: [], xi: [], tr: { day: '', n: 0, extra: 0 }, mk: { day: '', list: [] }, venta: [], of: {}, dia: isoToday(), log: [] };
    squad.forEach(p => { game.club.squad.push(p); clDorsal(game.club, p); });
    saveGame();
  }
  const c = game.club; c.venta = c.venta || []; c.of = c.of || {}; c.tr = c.tr || { day: '', n: 0, extra: 0 }; c.log = c.log || [];
  return c;
}
// alineación por puestos (16 oct, a lo OSM): formación, portero y cuatro de pista, cada uno en su puesto
const CL_ROLES = { G: { n: 'Portero', wa: 0, wd: 0 }, C: { n: 'Cierre', wa: 0.5, wd: 1.4 }, A: { n: 'Ala', wa: 1, wd: 1 }, P: { n: 'Pivote', wa: 1.4, wd: 0.5 } };
const CL_FORMS = {
  rombo: { n: 'Rombo', d: '1-2-1 · equilibrada', roles: ['C', 'A', 'A', 'P'], pos: [[50, 70], [20, 48], [80, 48], [50, 25]], ma: 0, md: 0 },
  cuadrado: { n: 'Cuadrado', d: '2-2 · sólida y directa', roles: ['C', 'C', 'P', 'P'], pos: [[28, 68], [72, 68], [28, 33], [72, 33]], ma: 0, md: 1 },
  ofensiva: { n: 'Ofensiva', d: '1-3 · todos arriba', roles: ['C', 'A', 'A', 'P'], pos: [[50, 68], [19, 40], [81, 40], [50, 21]], ma: 3, md: -3 },
  defensiva: { n: 'Defensiva', d: '3-1 · cerrar atrás', roles: ['C', 'C', 'A', 'P'], pos: [[24, 68], [76, 68], [50, 47], [50, 25]], ma: -3, md: 3 },
};
const clAtk = p => 0.3 * p.a.pat + 0.4 * p.a.tec + 0.3 * p.a.dis;
const clRoleRating = (p, r) => Math.round(r === 'G' ? 0.7 * p.a.ref + 0.3 * p.a.pat : r === 'C' ? 0.55 * p.a.def + 0.25 * p.a.pat + 0.2 * p.a.tec : r === 'A' ? 0.4 * p.a.pat + 0.35 * p.a.tec + 0.25 * p.a.dis : 0.45 * p.a.dis + 0.35 * p.a.tec + 0.2 * p.a.pat);
const clBestRole = p => p.pos === 'gk' ? 'G' : ['C', 'A', 'P'].sort((x, y) => clRoleRating(p, y) - clRoleRating(p, x))[0];
const clLineup = c => { c.lineup = c.lineup || { form: 'rombo', s: [] }; if (!CL_FORMS[c.lineup.form]) c.lineup.form = 'rombo'; return c.lineup; };
// los cinco que juegan: los colocados y, en los huecos, el mejor disponible para ese puesto
function clXI(c) {
  const L = clLineup(c), F = CL_FORMS[L.form], sq = c.squad, used = new Set(), score = (p, r) => clRoleRating(p, r) * (0.7 + 0.3 * clForma(p) / 100);
  const at = i => { const id = (L.s || [])[i], p = id && sq.find(x => x.id === id); return p && !used.has(p.id) && (i === 0 ? p.pos === 'gk' : p.pos !== 'gk') ? p : null; };
  const slots = [0, 1, 2, 3, 4].map(i => { const p = at(i); if (p) used.add(p.id); return p; });
  [0, 1, 2, 3, 4].forEach(i => { if (slots[i]) return; const r = i === 0 ? 'G' : F.roles[i - 1]; const c2 = sq.filter(p => !used.has(p.id) && (i === 0 ? p.pos === 'gk' : p.pos !== 'gk')).sort((x, y) => score(y, r) - score(x, r))[0]; if (c2) { slots[i] = c2; used.add(c2.id); } });
  return { gk: slots[0] || null, f: slots.slice(1).filter(Boolean), slots, roles: ['G', ...F.roles], form: L.form };
}
function clSummary(c) {
  if (!c) return null;
  const X = clXI(c), F = CL_FORMS[X.form], ff = p => 0.7 + 0.3 * clForma(p) / 100;
  if (!X.f.length) return null;
  let sa = 0, wa = 0, sd = 0, wd = 0;
  X.slots.slice(1).forEach((p, i) => { if (!p) return; const r = CL_ROLES[F.roles[i]]; sa += clAtk(p) * ff(p) * r.wa; wa += r.wa; sd += p.a.def * ff(p) * r.wd; wd += r.wd; });
  const g = X.gk ? X.gk.a.ref * ff(X.gk) : 30;
  return { atk: Math.round(sa / (wa || 1) + F.ma), def: Math.round(0.6 * sd / (wd || 1) + 0.4 * g + F.md), form: X.form, xi: X.slots.filter(Boolean).map((p, i) => ({ n: p.n, d: p.d, pos: p.pos, o: clOvr(p), coach: p.coach || '', r: X.roles[i] })) };
}
function clDorsal(c, p) {
  const used = new Set(c.squad.filter(x => x !== p).map(x => x.d));
  if (p.pos === 'gk' && !used.has('1')) { p.d = '1'; return p; }
  if (p.coach || (p.d && p.d !== '1' && !used.has(p.d))) return p;
  for (let k = 2; k < 40; k++) if (!used.has(String(k))) { p.d = String(k); break; }
  return p;
}
const sqBonus = (x, y) => (x && y) ? clamp(Math.round((x.atk - y.def) / 12), -2, 2) : 0;
// lo que se comparte con el cuerpo técnico (va en el perfil): resumen y jugadores en venta
function clPublic() {
  const c = game.club; if (!c) return null;
  const s = clSummary(c); if (!s) return null;
  s.venta = (c.venta || []).map(v => { const p = c.squad.find(x => x.id === v.pid); return p ? { pid: p.id, price: v.price, p } : null; }).filter(Boolean);
  return s;
}
const sqOf = name => normName(name) === normName(readAuthor()) ? (game.club ? clSummary(game.club) : null) : ((coachOf(name) || {}).club || null);
// paso de los días: la forma se recupera sola un poco cada día
function clDays(c) {
  const t = isoToday(); if (c.dia === t) return;
  const n = c.dia ? Math.min(7, Math.round((dateOf(t) - dateOf(c.dia)) / 864e5)) : 0;
  if (n > 0) c.squad.forEach(p => { p.forma = clamp(clForma(p) + Math.round(CL_FORMA_DIA * (1 + 0.2 * cdLv('fisio', c))) * n, 40, 100); });
  c.dia = t;
}
function clFatigue(k = CL_FORMA_PARTIDO) {
  if (!game.club) return;
  const { gk, f } = clXI(game.club); [gk, ...f].filter(Boolean).forEach(p => { p.forma = clamp(clForma(p) - k, 40, 100); });
}
// mercado de libres: se renueva cada día (6 jugadores y, a veces, la carta de un entrenador del club)
function clMarket(c) {
  const t = isoToday();
  if (c.mk && c.mk.day === t) return c.mk.list;
  const R = rng('mk|' + t + '|' + normName(readAuthor())), base = 40 + 3 * myLevel();
  const list = [clMake(R, 'gk', base + (R() - 0.5) * 12), ...Array.from({ length: 5 + cdLv('ojeo', c) }, () => clMake(R, 'jug', base + (R() - 0.5) * 18))];
  const me = normName(readAuthor()), cs = (bank.coaches || []).filter(x => x.avatar && normName(x.name) !== me && !c.squad.some(p => normName(p.coach) === normName(x.name)));
  if (cs.length && R() < 0.4) {
    const k = cs[Math.floor(R() * cs.length)], lv = levelOf(clubPoints(k.name));
    list.push(clMake(R, 'jug', 62 + 3 * lv, { coach: k.name, n: k.name, d: '★' }));
  }
  c.mk = { day: t, list, bought: [] };
  return list;
}
function clubSync() {
  if (!readAuthor() || !game.club) return;
  const c = game.club; clDays(c); if (cdJuvenil(c)) saveGame();
  const CLD = window.SMB_CLOUD && window.SMB_CLOUD.mk, me = CLD && CLD.me();
  if (!CLD || !me) return;
  let ch = false;
  // respuestas a mis ofertas
  Object.entries(c.of).forEach(([oid, o]) => {
    const ac = (bank.mkAc || []).find(x => x.d && x.d.of === o.doc);
    if (!ac) return;
    if (ac.d.ok && c.squad.length < CL_MAX + 2) { const np = Object.assign({}, o.p, { id: o.p.id + '-' + Date.now().toString(36).slice(-3), forma: 85 }); c.squad.push(np); clDorsal(c, np); c.log.push({ t: Date.now(), txt: `Fichado: ${o.p.n} (de ${o.seller}) por ${o.price}` }); toast(`¡Fichado! ${o.p.n} ya es de tu plantilla.`); }
    else { game.log.push({ key: 'ofdev:' + oid, pts: o.price, why: `Oferta no aceptada por ${o.p.n}: te devuelven las monedas`, date: isoToday() }); if (!ac.d.ok) toast(`${o.seller} no acepta tu oferta por ${o.p.n}. Te devolvemos las monedas.`); }
    delete c.of[oid]; CLD.del(o.doc).catch(() => {}); ch = true;
  });
  // limpiar mis respuestas cuando el comprador ya las ha visto (su oferta ya no existe)
  (bank.mkAc || []).filter(x => x.mine && !(bank.mkOf || []).some(o => o.id === x.d.of)).forEach(x => CLD.del(x.id).catch(() => {}));
  if (ch) saveGame();
}
const clOffersIn = () => { const CLD = window.SMB_CLOUD && window.SMB_CLOUD.mk, me = CLD && CLD.me(); return me ? (bank.mkOf || []).filter(o => o.d && o.d.to === me && !(bank.mkAc || []).some(a => a.mine && a.d.of === o.id)) : []; };
function clTrainsLeft(c) { const t = isoToday(); if (c.tr.day !== t) { c.tr.day = t; c.tr.n = 0; } return Math.max(0, clTrainDay(c) - c.tr.n) + (c.tr.extra || 0); }
const clTrainDay = c => CL_TRAIN_DAY + cdLv('gim', c);   // el gimnasio de la ciudad deportiva da entrenos de más
// entreno real en modo pista: entrenamiento extra y doble (una vez al día)
function clPistaBonus() {
  if (!readAuthor()) return false;
  const c = clubOf(), k = 'tr:' + isoToday();
  if ((c.log || []).some(l => l.k === k)) return false;
  c.tr.extra = (c.tr.extra || 0) + 1; c.log.push({ k, t: Date.now(), txt: 'Entreno en pista: entrenamiento extra y doble' });
  return true;
}
function clTrain(foco) {
  const c = clubOf(); if (!clTrainsLeft(c)) return null;
  const doble = c.tr.n >= clTrainDay(c) && c.tr.extra > 0;
  if (doble) c.tr.extra--; else c.tr.n++;
  const R = rng('tr|' + Date.now()), ups = [];
  c.squad.forEach(p => {
    p.forma = clamp(clForma(p) + 10, 40, 100);
    const ok = foco === 'ref' ? p.pos === 'gk' : p.pos !== 'gk' || foco === 'pat';
    if (!ok) return;
    const k = foco, cur = p.a[k], room = p.pot - cur; if (room <= 0) return;
    const g = Math.min(room, (1 + Math.floor(R() * 3)) * (doble ? 2 : 1) * (room < 6 ? 0.5 : 1));
    const gi = Math.max(1, Math.round(g)); p.a[k] = Math.min(p.pot, cur + gi); ups.push({ p, k, g: gi });
  });
  c.log.push({ t: Date.now(), txt: `Entrenamiento de ${CL_ATTR[foco] === 'Reflejos' ? 'porteros' : CL_ATTR[foco].toLowerCase()}${doble ? ' (doble)' : ''}` });
  saveGame();
  return { ups, doble };
}

// ---------- Liga → Equipo: la pista con tu alineación ----------
let alSel = -1;
function alineacionHTML() {
  if (!readAuthor()) return '';
  const c = clubOf(), X = clXI(c), L = clLineup(c), F = CL_FORMS[L.form], s = clSummary(c);
  const posOf = i => i === 0 ? [50, 92] : F.pos[i - 1];
  const chip = (p, i) => { const r = X.roles[i], rr = p ? clRoleRating(p, r) : 0, best = p && clBestRole(p) === r;
    const face = p && p.coach && coachOf(p.coach) ? `<span class="al-face">${avatarSVG(coachOf(p.coach).avatar, 0)}</span>` : `<span class="al-face num ${i === 0 ? 'gk' : ''}">${p ? esc(p.d) : '+'}</span>`;
    return `<button class="al-slot${alSel === i ? ' sel' : ''}${p && !best && i ? ' off' : ''}" type="button" data-al="${i}" style="left:${posOf(i)[0]}%;top:${posOf(i)[1]}%" aria-label="${esc(CL_ROLES[r].n)}: ${p ? esc(p.n) : 'vacío'}">${face}<b>${p ? esc(p.n.split(' ')[0]) : 'Vacío'}</b><small>${esc(CL_ROLES[r].n)}${p ? ` · ${rr}` : ''}</small>${p ? `<i class="al-fm" style="--f:${clForma(p)}%"></i>` : ''}</button>`; };
  const onField = new Set(X.slots.filter(Boolean).map(p => p.id)), bench = c.squad.filter(p => !onField.has(p.id));
  const r = alSel >= 0 ? X.roles[alSel] : '';
  const pick = alSel >= 0 ? c.squad.filter(p => alSel === 0 ? p.pos === 'gk' : p.pos !== 'gk').sort((x, y) => clRoleRating(y, r) - clRoleRating(x, r)) : [];
  return `<section class="ses-sec al-sec"><div class="lt-head"><h2 class="h-sec">Alineación ${infoBtn('alineacion')}</h2><button class="btn small" type="button" data-al="auto">Automática</button></div>
    <div class="al-forms" role="group" aria-label="Formación">${Object.entries(CL_FORMS).map(([k, f]) => `<button class="al-form" type="button" data-alform="${k}" aria-pressed="${L.form === k}"><b>${esc(f.n)}</b><small>${esc(f.d)}</small></button>`).join('')}</div>
    <div class="club-stats big"><span><b>${s ? s.atk : '–'}</b><small>ataque${F.ma ? ` (${F.ma > 0 ? '+' : ''}${F.ma} formación)` : ''}</small></span><span><b>${s ? s.def : '–'}</b><small>defensa${F.md ? ` (${F.md > 0 ? '+' : ''}${F.md} formación)` : ''}</small></span></div>
    <div class="al-pitch"><svg viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="121" rx="14" class="al-floor"/><line x1="2" y1="62.5" x2="98" y2="62.5" class="al-ln"/><circle cx="50" cy="62.5" r="9" class="al-ln"/><rect x="30" y="2" width="40" height="17" class="al-ln"/><rect x="30" y="106" width="40" height="17" class="al-ln"/><path d="M44 2v3a6 6 0 0 0 12 0V2M44 123v-3a6 6 0 0 1 12 0v3" class="al-goal"/></svg>
      ${X.slots.map((p, i) => chip(p, i)).join('')}<span class="al-dir" aria-hidden="true">▲ ataque</span></div>
    ${alSel >= 0 ? `<div class="al-pick"><div class="lt-head"><h3 class="h-sub">${esc(CL_ROLES[r].n)}: elige quién juega</h3><button class="btn small" type="button" data-al="x">Cerrar</button></div>
      <ul class="al-list">${pick.map(p => { const sl = X.slots.findIndex(q => q && q.id === p.id); return `<li><button type="button" data-alp="${p.id}" class="${sl === alSel ? 'on' : ''}"><span class="al-face num${p.pos === 'gk' ? ' gk' : ''}">${esc(p.d)}</span><span class="al-lt"><b>${esc(p.n)}</b><small>${sl >= 0 ? (sl === alSel ? 'Juega aquí' : 'Juega de ' + CL_ROLES[X.roles[sl]].n.toLowerCase()) : 'Suplente'} · mejor de ${CL_ROLES[clBestRole(p)].n.toLowerCase()} · forma ${clForma(p)}</small></span><span class="al-rr">${clRoleRating(p, r)}</span></button></li>`; }).join('')}</ul></div>`
      : `<p class="sub">Toca un jugador para cambiarlo.</p>`}
    <h3 class="h-sub">Suplentes</h3>${bench.length ? `<div class="al-bench">${bench.map(p => `<span class="al-b"><span class="al-face num${p.pos === 'gk' ? ' gk' : ''}">${esc(p.d)}</span><b>${esc(p.n.split(' ')[0])}</b><small>${p.pos === 'gk' ? 'Portero' : CL_ROLES[clBestRole(p)].n} · ${clOvr(p)} · forma ${clForma(p)}</small></span>`).join('')}</div>` : '<p class="sub">No tienes suplentes. Ficha en el mercado.</p>'}
    <div class="club-acts"><button class="btn" type="button" data-club="entrenar">Entrenar</button><button class="btn" type="button" data-club="mercado">Mercado</button><button class="btn" type="button" data-club="plantilla">Toda la plantilla</button></div>
  </section>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-al], [data-alform], [data-alp]'); if (!b || !game.club) return;
  const c = game.club, L = clLineup(c), X = clXI(c);
  if (b.dataset.alform) { const cur = X.slots.map(p => p && p.id); L.form = b.dataset.alform; L.s = cur; alSel = -1; saveGame(); render(); return; }
  if (b.dataset.alp) {
    const cur = X.slots.map(p => p && p.id), from = cur.indexOf(b.dataset.alp);
    if (from >= 0 && from !== alSel) cur[from] = cur[alSel];
    cur[alSel] = b.dataset.alp; L.s = cur; alSel = -1; saveGame(); render(); return;
  }
  const a = b.dataset.al;
  if (a === 'auto') { L.s = []; alSel = -1; saveGame(); render(); toast('Alineación automática: los mejores para cada puesto.'); return; }
  if (a === 'x') { alSel = -1; render(); return; }
  if (a != null && a !== '') { const i = +a; alSel = alSel === i ? -1 : i; render(); const pk = document.querySelector('.al-pick'); if (pk && alSel >= 0) pk.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
});

// ---------- vista ----------
function clCard(p, opts = {}) {
  const o = clOvr(p), c = p.coach ? coachOf(p.coach) : null;
  const face = c && c.avatar ? `<span class="pl-face">${avatarSVG(c.avatar, levelOf(clubPoints(p.coach)))}</span>` : `<span class="pl-face num ${p.pos}">${esc(p.d)}</span>`;
  const attrs = (p.pos === 'gk' ? ['ref', 'pat'] : ['pat', 'tec', 'dis', 'def']).map(k => `<span class="pl-at"><small>${CL_ATTR[k].slice(0, 3)}</small><i style="--v:${p.a[k]}%"></i><b>${p.a[k]}</b></span>`).join('');
  return `<div class="pl-card${p.coach ? ' coach' : ''}${opts.xi ? ' xi' : ''}">${face}<div class="pl-main"><div class="pl-top"><b class="pl-n">${esc(p.n)}</b><span class="pl-o">${o}</span></div>
    <small class="pl-sub">${p.pos === 'gk' ? 'Portero' : 'Jugador de pista'}${p.coach ? ' · carta de entrenador' : ''} · potencial ${p.pot}${opts.forma !== false ? ` · forma ${clForma(p)}` : ''}</small>
    <div class="pl-ats">${attrs}</div>${opts.foot || ''}</div></div>`;
}
function clubTeaserHTML() {
  if (!readAuthor()) return '';
  const c = clubOf(), s = clSummary(c), left = clTrainsLeft(c), inc = clOffersIn().length;
  return `<section class="ses-sec club-t"><div class="lt-head"><h2 class="h-sec">Tu plantilla ${infoBtn('plantilla')}</h2><button class="btn small primary" type="button" data-club="plantilla">Gestionar</button></div>
    <div class="club-stats"><span><b>${s ? s.atk : '–'}</b><small>ataque</small></span><span><b>${s ? s.def : '–'}</b><small>defensa</small></span><span><b>${c.squad.length}</b><small>jugadores</small></span></div>
    <div class="club-acts"><button class="btn${left ? ' primary' : ''}" type="button" data-club="entrenar">${left ? `Entrenar · ${left} ${left === 1 ? 'disponible' : 'disponibles'}` : 'Entrenado hoy'}</button><button class="btn" type="button" data-club="mercado">Mercado</button>${inc ? `<button class="btn primary" type="button" data-club="ofertas">Ofertas · ${inc}</button>` : ''}</div></section>`;
}
// ================= ciudad deportiva (12 nov): el incremental de la plantilla =================
// La ciudad deportiva produce presupuesto sola; la taquilla se llena en 8 horas. Al cobrar se multiplica por el trabajo real
// de la semana (ejercicio nuevo, sesión completa, entreno en modo pista: ×1 a ×4). El presupuesto solo sirve aquí.
// Las instalaciones dan ventajas pequeñas y con tope en la plantilla. game.club.cd = {p, ts, i: {grada, tienda, gim, fisio, cantera, ojeo}, juv, conc}.
const CD_INST = [
  ['grada', 'Gradas', { c: 300, g: 1.6 }, lv => `+${50 * lv} de presupuesto por hora`],
  ['tienda', 'Tienda del club', { c: 1000, g: 1.65 }, lv => lv ? `+${80 * lv} de presupuesto por hora` : '+80 de presupuesto por hora por nivel'],
  ['gim', 'Gimnasio', { c: 3000, g: 4, max: 2 }, lv => lv ? `${1 + lv} entrenos al día en vez de 1` : 'Un entreno más al día por nivel'],
  ['fisio', 'Fisioterapia', { c: 2000, g: 2.5, max: 3 }, lv => lv ? `La forma se recupera un ${20 * lv} % antes` : 'La forma se recupera un 20 % antes por nivel'],
  ['cantera', 'Cantera', { c: 4000, g: 2.2, max: 5 }, lv => lv ? `Un juvenil cada lunes (nivel ${lv})` : 'Un juvenil nuevo cada lunes, si hay sitio'],
  ['ojeo', 'Ojeadores', { c: 2500, g: 3.2, max: 2 }, lv => lv ? `${lv} ${lv === 1 ? 'jugador' : 'jugadores'} más en el mercado` : 'Un jugador más en el mercado por nivel']];
const CD_HORAS = 8, CD_CONC = 1500;
const cdMonday = () => { const d = dateOf(isoToday()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return lgIso(d.getTime()); };
function cdOf(c) { c = c || clubOf(); if (!c.cd || !c.cd.i) c.cd = { p: 0, ts: Date.now(), i: {} }; const d = c.cd; d.i = Object.assign({ grada: 1, tienda: 0, gim: 0, fisio: 0, cantera: 0, ojeo: 0 }, d.i); if (!(d.ts <= Date.now())) d.ts = Date.now(); return d; }
const cdLv = (k, c) => (c && c.cd && c.cd.i && c.cd.i[k]) || 0;   // nivel de una instalación sin crear nada (para las ventajas)
const cdRate = d => 50 * d.i.grada + 80 * d.i.tienda;
const cdNivel = d => Object.values(d.i).reduce((a, b) => a + b, 0);
const cdCoste = (k, d) => { const I = CD_INST.find(x => x[0] === k)[2]; return Math.round(I.c * Math.pow(I.g, d.i[k] - (k === 'grada' ? 1 : 0)) / 10) * 10; };
const cdTaq = d => { const h = clamp((Date.now() - d.ts) / 36e5, 0, CD_HORAS); return { h, base: Math.floor(cdRate(d) * h), cap: cdRate(d) * CD_HORAS }; };
// el trabajo de esta semana (de lunes a domingo)
function cdSemana() {
  const L = cdMonday(), me = normName(readAuthor()), has = p => game.log.some(x => String(x.key).startsWith(p) && (x.date || '') >= L);
  const ej = has('ex:') || (bank.tasks || []).some(t => t.source !== 'oller' && normName(t.author) === me && (t.alta || '') >= L);
  const chips = [['Ejercicio nuevo', ej], ['Sesión completa', has('ses:')], ['Entreno en modo pista', has('pista:')]];
  return { m: 1 + chips.filter(x => x[1]).length, chips };
}
// la cantera: un juvenil cada lunes, si hay sitio
function cdJuvenil(c) {
  const lv = cdLv('cantera', c); if (!lv) return false;
  const d = c.cd, L = cdMonday(); if (d.juv === L) return false;
  if (!d.juv) { d.juv = L; return true; }                         // recién construida: el primero llega el lunes que viene
  d.juv = L;
  if (c.squad.length >= CL_MAX) { c.log.push({ t: Date.now(), txt: 'La cantera tenía un juvenil, pero la plantilla está llena' }); return true; }
  const R = rng('juv|' + L + '|' + normName(readAuthor())), p = clMake(R, R() < 0.18 ? 'gk' : 'jug', 34 + 4 * lv, { forma: 95 });
  p.pot = clamp(p.pot + 4 + 2 * lv, clOvr(p) + 6, 96);
  c.squad.push(p); clDorsal(c, p); c.log.push({ t: Date.now(), txt: `Sube de la cantera: ${p.n}` }); toast(`Sube de la cantera: ${p.n}.`);
  return true;
}
function ciudadHTML(c) {
  const d = cdOf(c), T = cdTaq(d), S = cdSemana(), min = Math.ceil((CD_HORAS - T.h) * 60), hoyC = d.conc === isoToday();
  return `<div class="cd-hero"><div class="cd-h"><b>Ciudad deportiva · nivel ${cdNivel(d)}</b></div>
      <div class="cd-p"><b id="cd-p">${d.p.toLocaleString('es-ES')}</b><span>de presupuesto · +${cdRate(d)} por hora</span></div>
      <div class="cd-tq"><span>Taquilla <b id="cd-tq">${T.base.toLocaleString('es-ES')}</b> / ${T.cap.toLocaleString('es-ES')}</span><span>${min <= 0 ? 'Llena: cobra para que siga' : `Llena en ${min >= 60 ? Math.floor(min / 60) + ' h ' : ''}${min % 60} min`}</span></div>
      <div class="cd-bar"><i id="cd-bar" style="width:${Math.round(T.h / CD_HORAS * 100)}%"></i></div>
      <button class="btn cd-go" type="button" data-cd="cobrar"${T.base >= 1 ? '' : ' disabled'}>Cobrar ${(T.base * S.m).toLocaleString('es-ES')}${S.m > 1 ? ' · ×' + S.m : ''}</button></div>
    <div class="cd-sem"><div class="cd-sh"><b>Tu trabajo de esta semana</b><b class="cd-m">×${S.m}</b></div>
      <div class="cd-ch">${S.chips.map(([l, ok]) => `<span class="${ok ? 'ok' : ''}">${ok ? '✓' : '+1'} ${l}</span>`).join('')}</div>
      <p class="sub">${S.m >= 4 ? 'Semana completa: la ciudad deportiva produce al máximo hasta el lunes.' : 'Cada cosa que haces esta semana sube 1 el multiplicador.'}</p></div>
    <h3 class="h-sub">Instalaciones</h3><p class="sub">Se mejoran con presupuesto. Las ventajas de la plantilla tienen tope.</p>
    <div class="cd-ins">${CD_INST.map(([k, n, I, txt]) => { const lv = d.i[k], max = I.max && lv >= I.max, p = cdCoste(k, d);
      return `<div class="cd-in"><span><b>${n}${lv ? ' · nivel ' + lv : ''}${I.max ? ` <small>de ${I.max}</small>` : ''}</b><small>${txt(lv)}</small></span>${max ? '<span class="pl-tag on">Al máximo</span>' : `<button class="btn small${d.p >= p ? ' primary' : ''}" type="button" data-cd="up" data-k="${k}"${d.p >= p ? '' : ' disabled'}>${p.toLocaleString('es-ES')}</button>`}</div>`; }).join('')}</div>
    <h3 class="h-sub">Concentración</h3><div class="cd-in"><span><b>Fin de semana de concentración</b><small>Toda la plantilla recupera la forma. Una vez al día.</small></span><button class="btn small${d.p >= CD_CONC && !hoyC ? ' primary' : ''}" type="button" data-cd="conc"${d.p >= CD_CONC && !hoyC ? '' : ' disabled'}>${hoyC ? 'Hecha hoy' : CD_CONC.toLocaleString('es-ES')}</button></div>`;
}
function cdClick(b, c, done) {
  const d = cdOf(c), a = b.dataset.cd;
  if (a === 'cobrar') { const T = cdTaq(d), S = cdSemana(), g = T.base * S.m; if (g < 1) return; d.p += g; d.ts = Date.now(); done(`+${g.toLocaleString('es-ES')} de presupuesto${S.m > 1 ? ` (×${S.m} por tu semana)` : ''}.`); }
  else if (a === 'up') { const k = b.dataset.k, I = (CD_INST.find(x => x[0] === k) || [])[2]; if (!I || (I.max && d.i[k] >= I.max)) return; const p = cdCoste(k, d); if (d.p < p) return;
    const T = cdTaq(d); d.p += T.base - p; d.ts = Date.now(); d.i[k]++;   // antes de mejorar se cobra la taquilla al ritmo viejo, sin multiplicar
    if (k === 'cantera') cdJuvenil(c);
    c.log.push({ t: Date.now(), txt: `Ciudad deportiva: ${CD_INST.find(x => x[0] === k)[1]} a nivel ${d.i[k]}` });
    done(k === 'ojeo' ? 'Mejorado. Los jugadores de más salen en el mercado desde mañana.' : k === 'cantera' && d.i[k] === 1 ? 'Cantera abierta. El primer juvenil sube el lunes.' : 'Mejorado.'); }
  else if (a === 'conc') { if (d.p < CD_CONC || d.conc === isoToday()) return; d.p -= CD_CONC; d.conc = isoToday(); c.squad.forEach(p => { p.forma = 100; }); done('Concentración hecha: toda la plantilla al 100 % de forma.'); }
}
setInterval(() => { const el = document.getElementById('cd-tq'); if (!el || !game.club) return; const d = cdOf(game.club), T = cdTaq(d), b = document.getElementById('cd-bar'), go = document.querySelector('.cd-go');
  el.textContent = T.base.toLocaleString('es-ES'); if (b) b.style.width = Math.round(T.h / CD_HORAS * 100) + '%'; if (go && T.base >= 1 && go.disabled) drawClub(); }, 2000);
function ciudadTeaserHTML() {
  if (!readAuthor()) return '';
  const d = cdOf(), T = cdTaq(d), S = cdSemana(), llena = T.h >= CD_HORAS;
  return `<section class="ses-sec club-t"><div class="lt-head"><h2 class="h-sec">Ciudad deportiva</h2><button class="btn small${llena ? ' primary' : ''}" type="button" data-club="ciudad">${llena ? 'Cobrar' : 'Entrar'}</button></div>
    <div class="club-stats"><span><b>${cdNivel(d)}</b><small>nivel</small></span><span><b>${Math.round(T.h / CD_HORAS * 100)} %</b><small>taquilla</small></span><span><b>×${S.m}</b><small>tu semana</small></span></div></section>`;
}
let clTab = 'plantilla', clMsg = '';
function openClub(tab) {
  clTab = tab || 'plantilla'; clMsg = '';
  let el = document.getElementById('club-ov');
  if (!el) { el = document.createElement('div'); el.id = 'club-ov'; el.className = 'club-ov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Tu plantilla'); document.body.appendChild(el); el.addEventListener('click', onClubClick); }
  document.body.style.overflow = 'hidden';
  drawClub();
}
function closeClub() { const el = document.getElementById('club-ov'); if (el) el.remove(); document.body.style.overflow = ''; render(); }
function drawClub() {
  const el = document.getElementById('club-ov'); if (!el) return;
  const c = clubOf(), s = clSummary(c), web = !!(window.SMB_CLOUD && window.SMB_CLOUD.mk), inc = clOffersIn();
  const tabs = [['plantilla', 'Plantilla'], ['entrenar', 'Entrenar'], ['mercado', 'Mercado'], ['ciudad', 'Ciudad deportiva'], ...(web ? [['ofertas', `Ofertas${inc.length ? ' · ' + inc.length : ''}`]] : [])];
  let body = '';
  if (clTab === 'ciudad') body = ciudadHTML(c);
  else if (clTab === 'plantilla') {
    const X = clXI(c), xi = new Map(X.slots.map((p, i) => p ? [p.id, X.roles[i]] : null).filter(Boolean));
    const row = p => clCard(p, { xi: xi.has(p.id), foot: `<div class="pl-foot"><span class="pl-tag${xi.has(p.id) ? ' on' : ''}">${xi.has(p.id) ? 'Titular · ' + CL_ROLES[xi.get(p.id)].n : 'Suplente'}</span>
      ${(c.venta || []).some(v => v.pid === p.id) ? `<span class="pl-tag">En venta por ${c.venta.find(v => v.pid === p.id).price}</span><button class="btn small" type="button" data-clunsell="${p.id}">Quitar de la venta</button>` : `<button class="btn small" type="button" data-clsell="${p.id}">Vender</button>`}</div>` });
    body = `<p class="sub">Juegan 4 de pista y el portero. Alineación: <button class="linkb" type="button" data-lgtab="equipo">Vestuario</button>.</p>
      <div class="club-stats big"><span><b>${s ? s.atk : '–'}</b><small>ataque de los titulares</small></span><span><b>${s ? s.def : '–'}</b><small>defensa (pista y portero)</small></span></div>
      <h3 class="h-sub">Portería</h3><div class="pl-list">${c.squad.filter(p => p.pos === 'gk').map(row).join('') || '<p class="sub">No tienes portero: ficha uno en el mercado.</p>'}</div>
      <h3 class="h-sub">Pista</h3><div class="pl-list">${c.squad.filter(p => p.pos !== 'gk').map(row).join('')}</div>`;
  } else if (clTab === 'entrenar') {
    const left = clTrainsLeft(c), doble = c.tr.n >= clTrainDay(c) && c.tr.extra > 0;
    body = `<p class="sub">${clTrainDay(c) > 1 ? clTrainDay(c) + ' entrenamientos al día' : 'Un entrenamiento al día'}; con el <b>modo pista</b>, uno extra y doble. ${infoBtn('plantilla')}</p>
      <p class="club-left">${left ? `Te ${left === 1 ? 'queda' : 'quedan'} <b>${left}</b> ${left === 1 ? 'entrenamiento' : 'entrenamientos'} hoy${doble ? ' · <b>el siguiente es doble</b>' : (c.tr.extra ? ` · ${c.tr.extra} extra y doble por el modo pista` : '')}.` : 'Hoy ya has entrenado. Mañana más, o da tu entreno en el modo pista para uno extra.'}</p>
      <div class="cl-focos">${CL_FOCOS.map(([k, n, d]) => `<button class="cl-foco" type="button" data-cltrain="${k}"${left ? '' : ' disabled'}><b>${n}</b><small>${d}</small></button>`).join('')}</div>`;
  } else if (clTab === 'mercado') {
    const list = clMarket(c), bal = balance(), bought = new Set(c.mk.bought || []), full = c.squad.length >= CL_MAX;
    const others = web ? (bank.coaches || []).filter(x => x.club && (x.club.venta || []).length && normName(x.name) !== normName(readAuthor())) : [];
    const mineOf = new Set(Object.values(c.of).map(o => o.sid));
    body = `<p class="sub">Tienes <b>${bal}</b> monedas y ${c.squad.length} de ${CL_MAX} jugadores. Los libres cambian cada día.</p>
      <h3 class="h-sub">Jugadores libres de hoy</h3><div class="pl-list">${list.map(p => clCard(p, { forma: false, foot: `<div class="pl-foot"><span class="pl-price">${clVal(p)} monedas</span>${bought.has(p.id) ? '<span class="pl-tag">Fichado</span>' : `<button class="btn small primary" type="button" data-clbuy="${p.id}"${bal < clVal(p) || full ? ' disabled' : ''}>Fichar</button>`}</div>` })).join('')}</div>
      ${web ? `<h3 class="h-sub">En venta en el cuerpo técnico</h3>${others.length ? `<div class="pl-list">${others.flatMap(x => x.club.venta.map(v => clCard(v.p, { forma: false, foot: `<div class="pl-foot"><span class="pl-price">${esc(x.name.split(' ')[0])} pide ${v.price}</span>${mineOf.has(x.uid + '|' + v.pid) ? '<span class="pl-tag">Oferta hecha</span>' : `<button class="btn small primary" type="button" data-cloffer="${esc(x.uid)}|${esc(v.pid)}"${full ? ' disabled' : ''}>Hacer oferta</button>`}</div>` }))).join('')}</div>` : '<p class="sub">Nadie tiene jugadores en venta ahora mismo.</p>'}` : ''}`;
  } else if (clTab === 'ofertas') {
    const mine = Object.values(c.of);
    body = `<h3 class="h-sub">Te ofrecen</h3>${inc.length ? `<div class="pl-list">${inc.map(o => { const p = c.squad.find(x => x.id === o.d.pid); return clCard(o.d.p, { forma: false, foot: `<div class="pl-foot"><span class="pl-price">${esc(o.autor || 'Alguien')} ofrece ${o.d.price}</span>${p ? `<button class="btn small primary" type="button" data-clacc="${esc(o.id)}">Aceptar</button>` : '<span class="pl-tag">Ya no lo tienes</span>'}<button class="btn small" type="button" data-clrej="${esc(o.id)}">Rechazar</button></div>` }); }).join('')}</div>` : '<p class="sub">No tienes ofertas. Pon jugadores en venta desde Plantilla → «Vender».</p>'}
      <h3 class="h-sub">Tus ofertas</h3>${mine.length ? `<div class="pl-list">${mine.map(o => clCard(o.p, { forma: false, foot: `<div class="pl-foot"><span class="pl-price">${o.price} a ${esc(o.seller)}</span><span class="pl-tag">Esperando respuesta</span><button class="btn small" type="button" data-clcancel="${esc(o.id)}">Retirar</button></div>` })).join('')}</div>` : '<p class="sub">No has hecho ofertas. Las monedas de una oferta quedan reservadas hasta que te contesten.</p>'}`;
  }
  el.innerHTML = `<div class="club-in"><div class="cf-top"><b>Tu plantilla</b><span>${s ? `Ataque ${s.atk} · defensa ${s.def}` : ''}</span><button class="lv-x" type="button" data-club="x" aria-label="Cerrar">×</button></div>
    <div class="seg wrap" role="group">${tabs.map(([k, l]) => `<button type="button" data-cltab="${k}" aria-pressed="${clTab === k}">${l}</button>`).join('')}</div>
    ${clMsg ? `<p class="msg ok">${clMsg}</p>` : ''}${body}</div>`;
}
function onClubClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const c = clubOf(), CLD = window.SMB_CLOUD && window.SMB_CLOUD.mk;
  const done = (m) => { clMsg = m || ''; saveGame(); drawClub(); };
  if (b.dataset.club === 'x') { closeClub(); return; }
  if (b.dataset.lgtab) { closeClub(); return; }
  if (b.dataset.cltab) { clTab = b.dataset.cltab; clMsg = ''; drawClub(); return; }
  if (b.dataset.cd) { cdClick(b, c, done); return; }
  if (b.dataset.clsell) {
    const p = c.squad.find(x => x.id === b.dataset.clsell); if (!p) return;
    const club = Math.round(clVal(p) * CL_VENTA_CLUB);
    openModal(`<h2>Vender a ${esc(p.n)}</h2><p>Vale ${clVal(p)} monedas.</p>
      <div class="row"><button class="btn" id="m-club" type="button">Al club ya · ${club} monedas</button></div>
      ${CLD ? `<p class="sub">O ponlo a la venta para el cuerpo técnico y espera ofertas:</p><div class="row-in"><input id="m-price" type="number" inputmode="numeric" min="1" value="${clVal(p)}" aria-label="Precio"><button class="btn primary" id="m-list" type="button">Poner a la venta</button></div>` : ''}
      <div class="row"><button class="btn ghost" id="m-no" type="button">Cancelar</button></div>`);
    modalCard.querySelector('#m-no').onclick = closeModal;
    modalCard.querySelector('#m-club').onclick = () => { closeModal(); c.squad = c.squad.filter(x => x.id !== p.id); c.venta = c.venta.filter(v => v.pid !== p.id); c.xi = (c.xi || []).filter(id => id !== p.id); game.log.push({ key: 'clventa:' + p.id, pts: club, why: `Venta al club: ${p.n}`, date: isoToday() }); c.log.push({ t: Date.now(), txt: `Vendido al club: ${p.n} por ${club}` }); done(`Vendido. +${club} monedas.`); };
    const ls = modalCard.querySelector('#m-list');
    if (ls) ls.onclick = () => { const pr = Math.max(1, Math.round(+modalCard.querySelector('#m-price').value || 0)); closeModal(); c.venta = [...c.venta.filter(v => v.pid !== p.id), { pid: p.id, price: pr }]; done(`${p.n} está a la venta por ${pr}. Te avisamos cuando haya ofertas.`); };
    return;
  }
  if (b.dataset.clunsell) { c.venta = c.venta.filter(v => v.pid !== b.dataset.clunsell); done('Quitado de la venta.'); return; }
  if (b.dataset.cltrain) {
    const r = clTrain(b.dataset.cltrain); if (!r) return;
    const top = r.ups.sort((x, y) => y.g - x.g).slice(0, 6);
    clMsg = `${r.doble ? 'Entrenamiento doble. ' : ''}${top.length ? top.map(u => `${esc(u.p.n.split(' ')[0])} +${u.g} ${CL_ATTR[u.k].toLowerCase()}`).join(' · ') : 'Ya están en su techo en esto: prueba otro foco.'}${r.ups.length > 6 ? ` y ${r.ups.length - 6} más` : ''}. Todos recuperan forma.`;
    drawClub(); return;
  }
  if (b.dataset.clbuy) {
    const p = (c.mk.list || []).find(x => x.id === b.dataset.clbuy); if (!p) return;
    const v = clVal(p); if (balance() < v) { done('No te llegan las monedas.'); return; }
    if (c.squad.length >= CL_MAX) { done(`La plantilla está llena (${CL_MAX}). Vende a alguien antes.`); return; }
    confirmModal(`¿Fichar a ${p.n}?`, `Cuesta ${v} monedas: te quedarán ${balance() - v}.`, `Fichar · ${v}`, () => {
      game.spent += v; const np = Object.assign({}, p, { forma: 85 }); c.squad.push(np); clDorsal(c, np); c.mk.bought = [...(c.mk.bought || []), p.id]; c.log.push({ t: Date.now(), txt: `Fichado: ${p.n} por ${v}` }); done(`¡${p.n} ya es de tu plantilla!`);
    });
    return;
  }
  if (b.dataset.cloffer && CLD) {
    const [uidS, pid] = b.dataset.cloffer.split('|'), seller = (bank.coaches || []).find(x => x.uid === uidS), v = seller && seller.club && seller.club.venta.find(x => x.pid === pid);
    if (!v) return;
    openModal(`<h2>Oferta por ${esc(v.p.n)}</h2><p>${esc(seller.name)} pide ${v.price}. Las monedas quedan reservadas hasta que conteste; si dice que no, te las devolvemos.</p>
      <div class="row-in"><input id="m-price" type="number" inputmode="numeric" min="1" value="${v.price}" aria-label="Tu oferta"><button class="btn primary" id="m-ok" type="button">Enviar oferta</button></div><div class="row"><button class="btn ghost" id="m-no" type="button">Cancelar</button></div>`);
    modalCard.querySelector('#m-no').onclick = closeModal;
    modalCard.querySelector('#m-ok').onclick = () => {
      const pr = Math.max(1, Math.round(+modalCard.querySelector('#m-price').value || 0)); closeModal();
      if (balance() < pr) { done('No te llegan las monedas.'); return; }
      const oid = 'o' + Date.now().toString(36);
      CLD.put('of', oid, { to: uidS, pid, price: pr, p: v.p }).then(docId => {
        game.spent += pr; c.of[oid] = { id: oid, doc: docId, sid: uidS + '|' + pid, to: uidS, seller: seller.name, pid, price: pr, p: v.p }; done(`Oferta enviada a ${seller.name}. Te avisamos cuando conteste.`);
      }).catch(() => done('No se ha podido enviar la oferta. Prueba otra vez.'));
    };
    return;
  }
  if (b.dataset.clcancel && CLD) { const o = c.of[b.dataset.clcancel]; if (!o) return; CLD.del(o.doc).catch(() => {}); delete c.of[o.id]; game.log.push({ key: 'ofdev:' + o.id, pts: o.price, why: `Oferta retirada por ${o.p.n}: te devuelven las monedas`, date: isoToday() }); done('Oferta retirada. Te devolvemos las monedas.'); return; }
  if ((b.dataset.clacc || b.dataset.clrej) && CLD) {
    const o = clOffersIn().find(x => x.id === (b.dataset.clacc || b.dataset.clrej)); if (!o) return;
    const ok = !!b.dataset.clacc, p = c.squad.find(x => x.id === o.d.pid);
    if (ok && !p) return;
    CLD.put('ac', 'a' + Date.now().toString(36), { of: o.id, to: o.uid, ok }).then(() => {
      if (ok) {
        c.squad = c.squad.filter(x => x.id !== p.id); c.venta = c.venta.filter(v => v.pid !== p.id); c.xi = (c.xi || []).filter(id => id !== p.id);
        game.log.push({ key: 'clof:' + o.id, pts: o.d.price, why: `Traspaso de ${p.n} a ${o.autor}`, date: isoToday() }); c.log.push({ t: Date.now(), txt: `Traspasado: ${p.n} a ${o.autor} por ${o.d.price}` });
        // el resto de ofertas por el mismo jugador, rechazadas
        clOffersIn().filter(x => x.id !== o.id && x.d.pid === p.id).forEach(x => CLD.put('ac', 'a' + Date.now().toString(36) + x.id.slice(-4), { of: x.id, to: x.uid, ok: false }).catch(() => {}));
        done(`Traspaso hecho: +${o.d.price} monedas.`);
      } else done('Oferta rechazada.');
    }).catch(() => done('No se ha podido contestar. Prueba otra vez.'));
  }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-club]'); if (!b || b.closest('#club-ov')) return; openClub(b.dataset.club); });

