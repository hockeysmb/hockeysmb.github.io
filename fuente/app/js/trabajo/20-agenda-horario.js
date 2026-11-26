// ================= agenda: el horario del club y los entrenos de cada uno =================
// Horario 2026/27 (Excel «Equipos 26_27», corregido por la DT el 7 oct). La DT lo cambia en Dirección Técnica → Horario.
const HG = (dia, ini, fin, eq, ent) => ({ id: `${dia}-${ini}-${eq.join('+')}`.replace(/[^\w+:-]/g, ''), dia, ini, fin, eq, ent });
const HORARIO_2627 = {
  desde: '2026-09-07', hasta: '2027-06-18',
  sin: [{ d: '2026-10-12', n: 'Hispanidad' }, { d: '2026-11-02', n: 'Todos los Santos' }, { d: '2026-11-09', n: 'La Almudena' }, { d: '2026-12-07', n: 'Constitución' }, { d: '2026-12-08', n: 'Inmaculada' },
    { d: '2026-12-23', h: '2027-01-10', n: 'Navidad' }, { d: '2027-02-12', h: '2027-02-15', n: 'Semana blanca' }, { d: '2027-03-19', h: '2027-03-29', n: 'Semana Santa' }],
  g: [
    HG(1, '17:35', '19:00', ['Prebenjamín A'], ['Nico']), HG(1, '17:35', '19:00', ['Benjamín D'], ['Jacobo']), HG(1, '17:35', '19:00', ['Benjamín A', 'Alevín A'], ['Jorge']), HG(1, '17:35', '20:15', ['Porteros'], []),
    HG(1, '18:45', '20:15', ['Infantil A', 'Infantil B'], ['Nico', 'Jacobo']), HG(1, '18:45', '20:15', ['Sub17', 'Senior Fem'], ['Carlos']), HG(1, '20:00', '21:30', ['Autonómica', 'Junior'], ['Jorge']),
    HG(2, '17:35', '19:00', ['Benjamín B'], ['David']), HG(2, '17:35', '19:00', ['Prebenjamín B'], ['Carlos']), HG(2, '17:35', '19:00', ['Benjamín C'], ['Lucas']), HG(2, '17:35', '19:00', ['Benjamín E'], ['Leire']),
    HG(2, '18:45', '20:15', ['Alevín B'], ['David']), HG(2, '18:45', '20:15', ['Alevín C'], ['Lucas']), HG(2, '18:45', '20:15', ['Sub17', 'Senior Fem'], ['Carlos']),
    HG(3, '17:35', '19:00', ['Prebenjamín A'], ['Nico']), HG(3, '17:35', '19:00', ['Benjamín D'], ['Jacobo']), HG(3, '17:35', '19:00', ['Benjamín A'], ['Jorge']),
    HG(3, '18:45', '20:15', ['Infantil A', 'Infantil B'], ['Nico', 'Jacobo']), HG(3, '18:45', '20:15', ['Alevín A'], ['Jorge']), HG(3, '20:00', '21:30', ['Autonómica'], ['Jorge']),
    HG(4, '17:35', '19:00', ['Benjamín B'], ['David']), HG(4, '17:35', '19:00', ['Prebenjamín B'], ['Carlos']), HG(4, '17:35', '19:00', ['Benjamín C'], ['Lucas']), HG(4, '17:35', '19:00', ['Benjamín E'], ['Leire']),
    HG(4, '18:45', '20:15', ['Alevín B'], ['David']), HG(4, '18:45', '20:15', ['Alevín C'], ['Lucas']), HG(4, '20:00', '21:30', ['Junior', 'Senior Fem'], ['Carlos', 'Mario']),
    HG(5, '16:45', '17:45', ['Prebenjamín A'], ['Nico']), HG(5, '16:45', '17:45', ['Benjamín E'], ['Leire']), HG(5, '16:45', '17:45', ['Benjamín C'], ['Lucas']), HG(5, '16:45', '17:45', ['Benjamín D'], ['Leire']),
    HG(5, '17:30', '18:45', ['Benjamín A'], ['Jorge']), HG(5, '17:30', '18:45', ['Benjamín B'], ['David']), HG(5, '17:30', '18:45', ['Alevín C'], ['Lucas']), HG(5, '17:30', '18:45', ['Alevín B'], ['David']),
    HG(5, '18:30', '19:45', ['Alevín A'], ['Jorge']), HG(5, '18:30', '19:45', ['Infantil A'], ['Nico']), HG(5, '18:30', '19:45', ['Infantil B'], ['Jacobo']),
  ],
};
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const deacc = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const horario = () => bank.horario || HORARIO_2627;
// nombre del horario -> nombre con el que entra en la app, cuando no se parecen («Mario» es «GomezZz»)
const ALIAS_2627 = { mario: 'GomezZz' };
const alias = () => bank.alias || ALIAS_2627;
// ¿este nombre del horario («Nico», «Jorge») es esta persona de la app («Nicolás Martí», «Jorge Cosin»)?
function isMe(ent, who) {
  const a = deacc(ent), b = deacc(who === undefined ? readAuthor() : who); if (!a || !b) return false;
  if (a === b) return true;
  const al = alias()[a]; if (al && deacc(al) === b) return true;
  const bt = b.split(' '); return a.split(' ').every(x => bt.some(y => y.startsWith(x)));
}
function eqMatch(sesEq, team) {
  const T = deacc(team); return deacc(sesEq).split(/\s*[+,/]\s*|\s+y\s+/).filter(Boolean).some(p => p === T || T.startsWith(p + ' '));
}
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateOf = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const sinEntreno = iso => (horario().sin || []).find(x => iso >= x.d && iso <= (x.h || x.d)) || null;
const gLabel = g => g.eq.join(' + ');
function entrenos(desde, hasta) {
  const H = horario(), out = []; if (!H || !(H.g || []).length) return out;
  for (let d = dateOf(desde > H.desde ? desde : H.desde); isoOf(d) <= hasta && isoOf(d) <= H.hasta; d.setDate(d.getDate() + 1)) {
    const iso = isoOf(d); if (sinEntreno(iso)) continue;
    H.g.filter(g => g.dia === d.getDay()).sort((a, b) => a.ini.localeCompare(b.ini)).forEach(g => out.push({ key: iso + '|' + g.id, fecha: iso, g }));
  }
  return out;
}
// la sesión (mía o de un compañero) que ya prepara ese entreno
function sesDe(it) {
  const pool = [...sessions, ...((window.SMB_CLOUD && clubSes()) || []).map(x => Object.assign({}, x.s, { _club: x }))];
  return pool.find(s => s.fecha === it.fecha && it.g.eq.some(t => eqMatch(s.equipo, t))) || null;
}
const esMio = it => it.g.ent.some(e => isMe(e));
// 22 oct: en los entrenos con varios entrenadores, la DT dice quién prepara la sesión (o que se turnan cada semana)
const semIdx = iso => Math.floor((dateOf(iso).getTime() / 864e5 + 3) / 7);
function prepOf(it) {
  const g = it.g; if (!g.prep || g.ent.length < 2) return '';
  if (g.prep === '*turno') return g.ent[((semIdx(it.fecha) % g.ent.length) + g.ent.length) % g.ent.length];
  return g.ent.find(e => deacc(e) === deacc(g.prep)) || '';
}
// ¿le toca preparar este entreno a «quien»? (sin «quien»: a mí)
const meToca = (it, quien) => { const p = prepOf(it); return !p || (quien ? isMe(p, quien) || deacc(p) === deacc(quien) : isMe(p)); };
const prepTxt = g => !g.prep || g.ent.length < 2 ? '' : g.prep === '*turno' ? 'se turnan cada semana' : 'la prepara ' + g.prep;
const entTxt = g => g.ent.length ? g.ent.join(' y ') : 'Sin entrenador asignado';
function agRowHTML(it, showWho) {
  const s = sesDe(it), mine = esMio(it), t = isoToday(), past = it.fecha < t;
  const when = `${DIAS[dateOf(it.fecha).getDay()].slice(0, 3)} ${dateOf(it.fecha).getDate()} · ${it.g.ini}`;
  let st, act = '';
  if (s && !s._club) { st = `<span class="ag-st ok">Preparada${isDone(s) ? ' · hecha' : ''}</span>`; act = `<button class="btn small" type="button" data-ag="open" data-sid="${esc(s.id)}">Abrir</button>`; }
  else if (s) { st = `<span class="ag-st ok">Preparada por ${esc((s._club.autor || '').split(' ')[0])}</span>`; act = `<button class="btn small" type="button" data-ag="see" data-cid="${esc(s._club.id)}">Ver</button>`; }
  else if (prepOf(it) && mine && !meToca(it)) { st = `<span class="ag-st">La prepara ${esc(prepOf(it))}</span>`; if (!past) act = `<button class="btn small ghost" type="button" data-ag="prep" data-key="${esc(it.key)}">Prepararla yo</button>`; }
  else { st = `<span class="ag-st ${past ? '' : 'todo'}">${past ? 'Sin sesión' : 'Sin preparar'}${prepOf(it) && !mine ? ' · la prepara ' + esc(prepOf(it)) : ''}</span>`; if (mine && !past) act = `<button class="btn small primary" type="button" data-ag="prep" data-key="${esc(it.key)}">Prepararla</button>`; }
  const pl = planDe(it);
  return `<li class="ag-row${mine ? ' mine' : ''}"><span class="ag-when">${esc(when)}</span><span class="ag-t"><b>${esc(gLabel(it.g))}</b><small>${showWho ? esc(entTxt(it.g)) + ' · ' : ''}${esc(it.g.ini)}–${esc(it.g.fin)}</small>${pl ? `<small class="ag-plan">Plan: ${esc(planTxt(pl.p))}</small>` : ''}</span>${st}${act}</li>`;
}
// Mis equipos: los que llevo según el horario (y lo que haya puesto la DT en bank.equipos).
const misEquipos = () => equiposMap(horario()).filter(x => x.coaches.some(c => isMe(c))).map(x => x.t);
// Mis partidos de aquí a una semana, para que salgan junto a los entrenos.
function misPartidos(desde, hasta) {
  const E = misEquipos();
  return (partidos || []).filter(p => p.fecha >= desde && p.fecha <= hasta && E.some(t => normName(t) === normName(p.eq)))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.hora).localeCompare(String(b.hora)));
}
function agPartidoHTML(p) {
  const d = dateOf(p.fecha), f = fichaDe(p.id);
  const when = `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()}${p.hora ? ' · ' + p.hora : ''}`;
  return `<li class="ag-row mine ag-part"><span class="ag-when">${esc(when)}</span>
    <span class="ag-t"><b>${esc(p.eq)} ${p.casa ? 'vs' : 'en'} ${esc(p.rival)}</b><small>Partido${p.j ? ' · jornada ' + p.j : ''}${p.hora ? '' : ' · sin hora'}</small></span>
    <span class="ag-st ${f ? 'ok' : 'todo'}">${f ? 'Con ficha' : 'Sin preparar'}</span>
    <button class="btn small ${f ? '' : 'primary'}" type="button" data-fpart="${esc(p.id)}">${f ? 'Abrir' : 'Prepararlo'}</button></li>`;
}
function myWeekHTML() {
  if (!readAuthor()) return '';
  const t = isoToday(), d = dateOf(t); d.setDate(d.getDate() + 6);
  const hasta = isoOf(d);
  const L = entrenos(t, hasta).filter(esMio), P = misPartidos(t, hasta);
  if (!L.length && !P.length) return '';
  // entrenos y partidos juntos, por día
  const items = [...L.map(it => ({ f: it.fecha, h: it.g.ini, html: agRowHTML(it, false) })),
                 ...P.map(p => ({ f: p.fecha, h: p.hora || '23:59', part: true, html: agPartidoHTML(p) }))]
    .sort((a, b) => a.f.localeCompare(b.f) || String(a.h).localeCompare(String(b.h)));
  const todo = L.filter(it => !sesDe(it) && meToca(it)).length;
  const resumen = [todo ? `${todo} sin preparar` : '', P.length ? `${P.length} ${P.length === 1 ? 'partido' : 'partidos'}` : ''].filter(Boolean).join(' · ') || 'Todo preparado';
  // un partido no se esconde nunca detrás de «ver más», aunque caiga el domingo
  const ver = new Set(items.slice(0, 4));
  items.forEach(x => { if (x.part) ver.add(x); });
  const dentro = items.filter(x => ver.has(x)), fuera = items.filter(x => !ver.has(x));
  return `<section class="ses-sec agenda"><div class="lt-head"><h2 class="h-sec">Tu semana ${infoBtn('agenda')}</h2><span class="sub">${esc(resumen)}</span></div>
    <ul class="ag-list">${dentro.map(x => x.html).join('')}</ul>
    ${fuera.length ? `<details class="dt-more ag-more"><summary>Ver ${fuera.length} más</summary><ul class="ag-list">${fuera.map(x => x.html).join('')}</ul></details>` : ''}</section>`;
}
function agFind(key) { const [f] = key.split('|'); return entrenos(f, f).find(x => x.key === key) || null; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ag]'); if (!b) return;
  if (b.dataset.ag === 'prep') { const it = agFind(b.dataset.key); if (!it) return; const s = newSession(); s.equipo = gLabel(it.g); s.fecha = it.fecha; s.hora = it.g.ini; s.entrenador = readAuthor() || s.entrenador;
    const pl = planDe(it); if (pl) { const p = pl.p; s.fundamentos = [...(p.tec || []), ...(p.cont || [])]; s.fundamento = (p.foco || '').trim(); const F = p.fases || []; s.fase = F.some(f => f === 'Ataque' || f === 'Recuperación') && !F.some(f => f === 'Defensa' || f === 'Pérdida') ? 'ataque' : F.some(f => f === 'Defensa' || f === 'Pérdida') && !F.some(f => f === 'Ataque' || f === 'Recuperación') ? 'defensa' : ''; }
    openSes(s, true); }
  else if (b.dataset.ag === 'open') { const s = sessions.find(x => x.id === b.dataset.sid); if (s) openSes(clone(s), false); }
  else if (b.dataset.ag === 'see') { const x = clubSes().find(y => y.id === b.dataset.cid); if (x) openSheet(x.s); }
});

// ---------- Dirección Técnica: el horario ----------
const hzMin = x => { const [h, m] = String(x || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
// choques: el mismo entrenador en dos entrenos del mismo día que se pisan más de 20 minutos (el relevo de 15 minutos es normal)
function hzClashes(H) {
  const out = [], G = H.g || [];
  for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
    const a = G[i], b = G[j]; if (a.dia !== b.dia) continue;
    if (Math.min(hzMin(a.fin), hzMin(b.fin)) - Math.max(hzMin(a.ini), hzMin(b.ini)) <= 20) continue;
    a.ent.forEach(n => { if (b.ent.some(e => deacc(e) === deacc(n))) out.push({ n, a, b }); });
  }
  return out;
}
function dtHorarioHTML() {
  const H = horario(), own = !!bank.horario, CH = hzClashes(H), bad = new Set(CH.flatMap(c => [c.a.id, c.b.id]));
  const names = [...new Set((H.g || []).flatMap(g => g.ent.map(deacc)))].sort();
  const dias = [1, 2, 3, 4, 5, 6].filter(dd => dd < 6 || (H.g || []).some(g => g.dia === dd));
  const col = dd => { const L = (H.g || []).filter(g => g.dia === dd).sort((a, b) => a.ini.localeCompare(b.ini) || gLabel(a).localeCompare(gLabel(b)));
    return `<div class="hz-col"><h3>${DIAS[dd]} · ${L.length}</h3>${L.map(g => `<button type="button" class="hz-chip tc${g.ent.length ? names.indexOf(deacc(g.ent[0])) % 8 : 0}${bad.has(g.id) ? ' clash' : ''}" data-hz="edit" data-id="${esc(g.id)}"><span class="t">${esc(g.ini)}–${esc(g.fin)}</span><b>${esc(gLabel(g))}</b><span class="w">${esc(g.ent.length ? g.ent.join(' y ') : 'Sin entrenador')}</span></button>`).join('') || '<p class="sub">Sin entrenos.</p>'}</div>`; };
  const sin = (H.sin || []).slice().sort((a, b) => a.d.localeCompare(b.d));
  return `<section class="ses-sec"><div class="lt-head"><h2 class="h-sec">Horario de entrenos ${infoBtn('horario')}</h2><button class="btn primary" type="button" data-hz="new">Añadir un entreno</button></div>
    <p class="sub">Pulsa un entreno para cambiarlo o quitarlo. Los entrenadores van con el nombre por el que se les conoce («Nico», «Jorge»).${own ? '' : ' Cargado del Excel «Equipos 26_27» con tus correcciones del 7 de octubre.'}</p>
    ${CH.length ? `<div class="hz-warn"><b>${plural(CH.length, 'choque', 'choques')} en el horario</b>${CH.map(c => `<span>${esc(c.n)}, el ${esc(DIAS[c.a.dia].toLowerCase())}: ${esc(gLabel(c.a))} (${esc(c.a.ini)}–${esc(c.a.fin)}) y ${esc(gLabel(c.b))} (${esc(c.b.ini)}–${esc(c.b.fin)})</span>`).join('')}</div>` : ''}
    <div class="hz-grid" style="--hz-n:${dias.length}">${dias.map(col).join('')}</div></section>
    <section class="ses-sec"><details class="dt-more" id="hz-temp"><summary>Temporada y días sin entreno · ${esc(fmtShort(H.desde))} a ${esc(fmtShort(H.hasta))} · ${sin.length} periodos sin entreno</summary>
    <div class="hz-form"><label class="ses-f">Primer día<input type="date" id="hz-desde" value="${esc(H.desde)}"></label><label class="ses-f">Último día<input type="date" id="hz-hasta" value="${esc(H.hasta)}"></label></div>
    <div class="actions"><button class="btn" type="button" data-hz="temp">Guardar fechas</button></div>
    <ul class="dt-list">${sin.map(x => `<li class="dt-row hz-row"><span class="dt-txt"><b>${esc(x.n || 'Sin entreno')}</b><small>${esc(fmtShort(x.d))}${x.h && x.h !== x.d ? ' – ' + esc(fmtShort(x.h)) : ''}</small></span><button class="btn small ghost" type="button" data-hz="unsin" data-d="${esc(x.d)}">Quitar</button></li>`).join('')}</ul>
    <h3 class="h-sub">Añadir días sin entreno</h3>
    <div class="hz-form"><label class="ses-f">Desde<input type="date" id="hz-sd"></label><label class="ses-f">Hasta (si es más de un día)<input type="date" id="hz-sh"></label><label class="ses-f hz-wide">Motivo<input type="text" id="hz-sn" placeholder="Puente, torneo, excursión…"></label></div>
    <div class="actions"><button class="btn" type="button" data-hz="sin">Añadir</button></div>
    <p class="sub">Partimos del calendario escolar de la Comunidad de Madrid 2026/27.</p></details></section>`;
}
// ---------- equipos y entrenadores (22 oct): quién lleva cada equipo, y cambiarlo desde la app ----------
const hzTeams = g => (g.eq || []).flatMap(e => String(e).split(/\s*[,+]\s*/)).map(x => x.trim()).filter(Boolean);
const EQ_ORD = ['prebenjam', 'benjam', 'alev', 'infantil', 'sub', 'juvenil', 'junior', 'senior', 'auton', 'porter'];
const eqRank = t => { const d = deacc(t), i = EQ_ORD.findIndex(k => d.startsWith(k)); return (i < 0 ? 99 : i) * 100 + (d.charCodeAt(d.length - 1) || 0); };
const DIA_C = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function equiposMap(H, asigIn) {
  const M = new Map(), asig = asigIn || bank.equipos || {};
  (H.g || []).forEach(g => { const T = hzTeams(g); T.forEach(t => { if (!M.has(t)) M.set(t, { t, franjas: [], solo: [], todos: [] }); const x = M.get(t); x.franjas.push(g); g.ent.forEach(e => { if (!x.todos.includes(e)) x.todos.push(e); if (T.length === 1 && !x.solo.includes(e)) x.solo.push(e); }); }); });
  M.forEach(x => {
    const own = x.franjas.filter(g => hzTeams(g).length === 1), cnt = new Map();
    own.forEach(g => { const k = g.ent.join('|'); cnt.set(k, (cnt.get(k) || 0) + 1); });
    const top = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
    x.coaches = asig[x.t] || (top ? (top[0] ? top[0].split('|') : []) : x.todos);
    x.raros = own.filter(g => g.ent.join('|') !== x.coaches.join('|'));
  });
  return [...M.values()].sort((a, b) => eqRank(a.t) - eqRank(b.t) || a.t.localeCompare(b.t, 'es'));
}
function dtEquiposHTML() {
  const H = horario(), L = equiposMap(H).filter(x => !/^porter/.test(deacc(x.t)));
  const by = new Map(); L.forEach(x => x.coaches.forEach(c => { if (!by.has(c)) by.set(c, []); by.get(c).push(x.t); }));
  const fr = g => `${DIA_C[g.dia]} ${g.ini}`;
  return `<section class="ses-sec eq-sec" id="eq-sec"><h2 class="h-sec">Equipos y entrenadores</h2>
    <p class="sub">Quién lleva cada equipo. Al cambiarlo se cambia en el horario, en la agenda de cada entrenador y en el seguimiento.</p>
    <ul class="eq-by">${[...by.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([c, T]) => `<li><button class="esp-link" type="button" data-coach="${esc(c)}">${esc(c)}</button><span>${T.map(esc).join(' · ')}</span></li>`).join('')}</ul>
    <details class="dt-more"${L.some(x => x.raros.length) ? ' open' : ''}><summary>Por equipo · ${L.length}${L.some(x => x.raros.length) ? ` · ${L.filter(x => x.raros.length).length} con algún día distinto` : ''}</summary>
    <ul class="dt-list">${L.map(x => `<li class="dt-row eq-row"><span class="dt-txt"><b>${esc(x.t)}</b><small>${x.franjas.map(fr).join(' · ')}</small>${x.franjas.filter(g => g.ent.length > 1).map(g => `<button class="linkb eq-prep" type="button" data-hz="edit" data-id="${esc(g.id)}">${esc(fr(g))} · ${esc(gLabel(g))}: ${prepTxt(g) ? esc(prepTxt(g)) : '<b>¿quién la prepara?</b>'}</button>`).join('')}${x.raros.length ? `<small class="eq-raro">No coincide: ${x.raros.map(g => `${esc(fr(g))} lo lleva ${esc(g.ent.join(' y ') || 'nadie')}`).join('; ')}</small>` : ''}</span><span class="eq-ents">${x.coaches.length ? x.coaches.map(c => `<span class="chip sm">${esc(c)}</span>`).join('') : '<span class="sub">Sin entrenador</span>'}</span><button class="btn small" type="button" data-eq="edit" data-team="${esc(x.t)}">Cambiar</button></li>`).join('')}</ul></details></section>
    ${dtPlantillasHTML()}`;
}
// Las plantillas: se importan aquí y se guardan en Firestore, nunca en el repositorio.
function dtPlantillasHTML() {
  const M = migrado(), T = equiposConPlantilla().sort((a, b) => eqRank(a) - eqRank(b)), n = plantTotal();
  const fila = t => { const L = plantillaDe(t), pt = L.filter(p => p.p).length;
    return `<li class="dt-row"><span class="dt-txt"><b>${esc(t)}</b><small>${L.length} ${L.length === 1 ? 'jugador' : 'jugadores'}${pt ? ' · ' + pt + ' portero' : ''}</small></span><button class="btn small ghost" type="button" data-pl="ver" data-team="${esc(t)}">Ver</button></li>`; };
  const plan = !M && Object.keys(bank.plant || {}).length ? migrarPlan() : null;
  return `<section class="ses-sec" id="pl-sec"><h2 class="h-sec">Plantillas</h2>
    <p class="sub">Quién está en cada equipo. Los nombres se guardan solo en la nube del club, nunca en el repositorio, porque son menores.</p>
    ${plan ? `<div class="pl-mig"><h3 class="h-sub">Pasar a una ficha por jugador</h3>
      <p class="sub">Una ficha por persona, y <b>cada entrenador cambia las plantillas de sus equipos</b>.</p>
      <p class="sub">${plan.personas} personas. ${plan.juntadas} ${plan.juntadas === 1 ? 'repetida se junta sola' : 'repetidas se juntan solas'}. ${plan.dudas.length ? `<b>${plan.dudas.length} dudas</b> las decides tú antes de pasar.` : 'Ninguna duda.'} La plantilla de ahora se guarda como copia.</p>
      <div class="actions"><button class="btn primary" type="button" data-pl="migrar">Revisar y pasar</button></div></div>` : ''}
    ${M ? `<p class="sub">Una ficha por jugador desde el ${esc(fmtShort(bank.plantMigrada || isoToday()))}: ${n} personas. Cada entrenador cambia las de sus equipos.</p>
      <details class="dt-more"><summary>Quién puede cambiar cada plantilla</summary>
        <ul class="pts-list">${(() => { const E = calcEq(bank).eqUids, nom = u => ((bank.coaches || []).find(c => c.uid === u) || {}).name || 'cuenta sin nombre';
          return T.map(t => `<li><span>${esc(t)}</span><span>${(E[t] || []).map(nom).map(esc).join(', ') || 'solo la DT'}</span></li>`).join(''); })()}</ul>
        <p class="sub">Sale del horario y de las cuentas. ${infoBtn('permisos')}</p>
        <div class="actions"><button class="btn small" type="button" data-pl="permisos">Actualizar</button></div></details>` : ''}
    ${n ? `<ul class="dt-list">${T.map(fila).join('')}</ul>` : '<p class="sub">Todavía no hay ninguna plantilla.</p>'}
    ${M ? '' : `<details class="dt-more"><summary>Importar las plantillas</summary>
      <p class="sub">Pega el código de las plantillas (o elige el archivo). Sustituye las que haya.</p>
      <label class="ses-f">Archivo (.json)<input type="file" id="pl-file" accept=".json,application/json"></label>
      <label class="ses-f">Código<textarea id="pl-code" rows="4" placeholder="{&quot;Benjamín A&quot;: [{&quot;n&quot;: &quot;Nombre&quot;, &quot;a&quot;: &quot;2016&quot;}]}"></textarea></label>
      <div class="actions"><button class="btn primary" type="button" data-pl="import">Importar</button>${n ? '<button class="btn ghost" type="button" data-pl="borrar">Borrar todas</button>' : ''}</div>
      <p class="sub" id="pl-msg" role="status"></p></details>`}</section>`;
}

// ---------- la migración: de una ficha por equipo a una ficha por persona (fase 1) ----------
// Junta solo lo que está claro (mismo nombre, mismo año, un solo equipo de su categoría). Lo demás
// no se adivina: sale como duda y lo decide la DT.
const EQ_BASE = /^(prebenjam|benjam|alev|infantil|junior)/;
function migrarPlan() {
  const grupos = new Map();
  Object.entries(bank.plant || {}).forEach(([t, L]) => L.forEach(p => {
    const k = normName(p.n); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push({ t, p }); }));
  const ficha = (es, principal) => { const ts = [...new Set(es.map(e => e.t))];
    return { n: es.map(e => e.p.n).sort((a, b) => b.length - a.length)[0], a: es.map(e => e.p.a).filter(Boolean)[0] || '',
      p: es.some(e => !!e.p.p), nt: es.map(e => e.p.nt).filter(Boolean)[0] || '', eq: principal, otros: ts.filter(t => t !== principal), temp: TEMPORADA }; };
  const claras = new Map(), dudas = []; let juntadas = 0;
  grupos.forEach((es, k) => {
    const ts = [...new Set(es.map(e => e.t))].sort((a, b) => eqRank(a) - eqRank(b));
    const anios = [...new Set(es.map(e => e.p.a).filter(Boolean))];
    const base = ts.filter(t => EQ_BASE.test(deacc(t)));
    if (es.length === 1) { claras.set(k, { es, principal: ts[0] }); return; }
    if (anios.length > 1) { dudas.push({ k, tipo: 'anios', es, ops: ts }); return; }
    if (base.length === 1) { claras.set(k, { es, principal: base[0] }); juntadas++; return; }
    dudas.push({ k, tipo: base.length > 1 ? 'base' : 'sel', es, ops: base.length > 1 ? base : ts });
  });
  // un nombre corto que puede ser la misma persona que uno largo, con el mismo año
  const anioDe = k => [...new Set((grupos.get(k) || []).map(e => e.p.a).filter(Boolean))];
  const ks = [...grupos.keys()];
  ks.forEach(a => ks.forEach(b => {
    if (a === b || !b.startsWith(a + ' ')) return;
    const ya = anioDe(a), yb = anioDe(b);
    if (ya.length && yb.length && ya.some(x => yb.includes(x))) dudas.push({ k: a + '|' + b, tipo: 'misma', corto: a, largo: b });
  }));
  return { grupos, claras, dudas, ficha, juntadas, personas: grupos.size };
}
const DUDA_TXT = {
  anios: d => `<b>${esc(d.es[0].p.n)}</b> sale con años distintos (${d.es.map(e => `${esc(e.t)}: ${esc(e.p.a || 'sin año')}`).join(', ')}). ¿Es la misma persona?`,
  base: d => `<b>${esc(d.es[0].p.n)}</b> está en ${d.ops.map(esc).join(' y ')}. ¿Cuál es su equipo principal?`,
  sel: d => `<b>${esc(d.es[0].p.n)}</b> está en ${d.ops.map(esc).join(', ')} y en ningún equipo de su categoría. ¿Cuál es su equipo principal?`,
  misma: (d, P) => { const a = P.grupos.get(d.corto)[0], b = P.grupos.get(d.largo)[0];
    return `¿<b>${esc(a.p.n)}</b> (${esc(a.t)}) y <b>${esc(b.p.n)}</b> (${esc(b.t)}) son la misma persona? Mismo año.`; },
};
function migrarAbrir() {
  const P = migrarPlan(), dec = {};
  const ops = d => d.tipo === 'misma' ? [['si', 'Sí, la misma'], ['no', 'No, son dos']]
    : d.tipo === 'anios' ? [['dos', 'Son personas distintas'], ...d.ops.map(t => [t, `La misma; principal ${t}`])]
    : [...d.ops.map(t => [t, t]), ...(d.tipo === 'base' ? [['dos', 'Son personas distintas']] : [])];
  const pinta = () => {
    const faltan = P.dudas.filter(d => !dec[d.k]).length;
    modalCard.querySelector('#mg-lista').innerHTML = P.dudas.map(d => `<li class="mg-duda"><p>${DUDA_TXT[d.tipo](d, P)}</p>
      <div class="fh-jug">${ops(d).map(([v, l]) => `<button class="fh-j${dec[d.k] === v ? ' si' : ''}" type="button" data-mgk="${esc(d.k)}" data-mgv="${esc(v)}">${esc(l)}</button>`).join('')}</div></li>`).join('');
    const ok = modalCard.querySelector('#m-ok'); ok.disabled = faltan > 0;
    ok.textContent = faltan ? `Faltan ${faltan}` : `Pasar ${P.personas} personas`;
  };
  openModal(`<h2>Pasar a una ficha por jugador</h2>
    <p class="sub">${P.juntadas} ${P.juntadas === 1 ? 'repetida se junta sola' : 'repetidas se juntan solas'} (mismo nombre y año, y un solo equipo de su categoría, que queda como principal). ${P.dudas.length ? 'Estas no las adivino:' : ''}</p>
    <ul class="mg-lista" id="mg-lista"></ul>
    <p class="sub">La plantilla de ahora se queda guardada como copia. Después, cada entrenador cambia las plantillas de sus equipos.</p>
    <p class="sub" id="mg-msg" role="status"></p>
    <div class="row"><button class="btn" id="m-no" type="button">Cancelar</button><button class="btn primary" id="m-ok" type="button">Pasar</button></div>`);
  pinta();
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelector('#mg-lista').onclick = e => { const b = e.target.closest('[data-mgk]'); if (!b) return; dec[b.dataset.mgk] = b.dataset.mgv; pinta(); };
  modalCard.querySelector('#m-ok').onclick = async () => {
    const docs = migrarDocs(P, dec);
    const msg = modalCard.querySelector('#mg-msg'), CL = window.SMB_CLOUD;
    if (!CL || !CL.jug) { msg.textContent = 'La migración solo se hace desde la web.'; return; }
    modalCard.querySelector('#m-ok').disabled = true; msg.textContent = `Pasando ${docs.length} personas…`;
    try {
      // primero quién lleva cada equipo (sale de guardar el banco), después los jugadores
      await saveBankExtra_({ plantMigrada: isoToday() }, 'Plantillas pasadas a una ficha por jugador.');
      await CL.jug.lote(docs);
      closeModal(); toast(`${docs.length} jugadores con ficha única.`);
    } catch (e) {
      msg.textContent = bank.jugadoresNo ? 'Faltan las reglas de Firestore de los jugadores: pégalas en la consola y vuelve a intentarlo.' : 'No se ha podido terminar: ' + ((e && e.message) || 'error');
      modalCard.querySelector('#m-ok').disabled = false;
    }
  };
}
// Las decisiones convertidas en fichas. Devuelve [{id, data}].
function migrarDocs(P, dec) {
  const fichas = new Map();   // clave de persona -> ficha
  P.claras.forEach((c, k) => fichas.set(k, P.ficha(c.es, c.principal)));
  P.dudas.filter(d => d.tipo !== 'misma').forEach(d => {
    const v = dec[d.k];
    if (v === 'dos') d.es.forEach((e, i) => fichas.set(d.k + '#' + i, P.ficha([e], e.t)));
    else fichas.set(d.k, P.ficha(d.es, v));
  });
  // juntar las que la DT ha dicho que son la misma persona: se queda el nombre largo
  P.dudas.filter(d => d.tipo === 'misma' && dec[d.k] === 'si').forEach(d => {
    const a = fichas.get(d.corto), b = fichas.get(d.largo); if (!a || !b) return;
    const ts = [...new Set([b.eq, ...b.otros, a.eq, ...a.otros])];
    fichas.set(d.largo, Object.assign({}, b, { p: a.p || b.p, nt: b.nt || a.nt, otros: ts.filter(t => t !== b.eq) }));
    fichas.delete(d.corto);
  });
  let i = 0;
  return [...fichas.values()].map(f => ({ id: 'j' + Date.now().toString(36) + (i++).toString(36).padStart(3, '0'), data: limpiaJug(f) }));
}
function plantImportar(txt) {
  const msg = document.getElementById('pl-msg');
  let j; try { j = JSON.parse(txt); } catch (e) { if (msg) msg.textContent = 'Ese código no se entiende: tiene que ser el .json de las plantillas.'; return; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) { if (msg) msg.textContent = 'Ese archivo no son plantillas.'; return; }
  const limpio = {}; let n = 0;
  Object.entries(j).forEach(([t, L]) => {
    if (!Array.isArray(L)) return;
    const F = L.map(p => {
      const nombre = String((p && (p.n || p.nombre)) || '').trim(); if (!nombre) return null;
      const f = { n: nombre }, a = String((p && (p.a || p.anio || p.año)) || '').trim();
      if (a) f.a = a; if (p && (p.p || /^porter/i.test(String(p.puesto || '')))) f.p = 1;
      if (p && p.nt) f.nt = String(p.nt).slice(0, 60);
      return f;
    }).filter(Boolean);
    if (F.length) { limpio[String(t).trim()] = F; n += F.length; }
  });
  if (!n) { if (msg) msg.textContent = 'No he encontrado ninguna ficha dentro.'; return; }
  const eqs = Object.keys(limpio), conocidos = new Set(equiposMap(horario()).map(x => x.t));
  const raros = eqs.filter(t => !conocidos.has(t));
  confirmModal('¿Importar las plantillas?',
    `${n} fichas en ${eqs.length} ${eqs.length === 1 ? 'equipo' : 'equipos'}. Sustituye las plantillas que haya ahora.${raros.length ? ` Ojo: ${raros.join(', ')} no ${raros.length === 1 ? 'está' : 'están'} en el horario, así que ${raros.length === 1 ? 'solo se verá' : 'solo se verán'} aquí.` : ''}`,
    'Importar', () => saveBankExtra_({ plant: limpio }, `${n} fichas importadas.`));
}
function eqModal(team) {
  const H = horario(), L = equiposMap(H), x = L.find(y => y.t === team); if (!x) return;
  const names = [...new Set([...(H.g || []).flatMap(g => g.ent), ...Object.values(bank.equipos || {}).flat()])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
  let sel = [...x.coaches];
  const others = (g, chosen) => { const T = hzTeams(g); return [...new Set(T.flatMap(t => t === team ? chosen : ((L.find(y => y.t === t) || {}).coaches || [])))]; };
  const draw = () => {
    modalCard.querySelector('#eq-names').innerHTML = names.map(n => `<button class="chip" type="button" data-eqn="${esc(n)}" aria-pressed="${sel.includes(n)}">${esc(n)}</button>`).join('');
    modalCard.querySelector('#eq-fr').innerHTML = x.franjas.map((g, i) => { const joint = hzTeams(g).length > 1, nv = joint ? others(g, sel) : sel;
      return `<li><label class="ed-check"><input type="checkbox" data-eqf="${i}" checked> <span><b>${esc(DIA_C[g.dia])} ${esc(g.ini)}</b> · ${esc(gLabel(g))}<br><small>Ahora: ${esc(g.ent.join(', ') || 'nadie')} → ${joint ? `<input type="text" class="eq-joint" data-eqj="${i}" value="${esc(nv.join(', '))}" aria-label="Entrenadores del entreno conjunto">` : `quedará: ${esc(nv.join(', ') || 'nadie')}`}</small></span></label></li>`; }).join('');
    modalCard.querySelectorAll('[data-eqn]').forEach(b => b.onclick = () => { const n = b.dataset.eqn; sel = sel.includes(n) ? sel.filter(y => y !== n) : [...sel, n]; draw(); });
  };
  openModal(`<h2>${esc(team)}: entrenadores</h2><p class="sub">Marca quién lo lleva. Debajo, los entrenos del horario donde se cambia (desmarca los que no).</p>
    <div class="opts" id="eq-names"></div><div class="row-in"><input type="text" id="eq-otro" placeholder="Otro (nombre corto, como en el horario)" aria-label="Otro entrenador"><button class="btn" type="button" id="eq-add">Añadir</button></div>
    <ul class="eq-fr" id="eq-fr"></ul>
    <div class="row"><button class="btn" id="m-no" type="button">Cancelar</button><button class="btn primary" id="m-ok" type="button">Guardar</button></div>`);
  draw();
  modalCard.querySelector('#eq-add').onclick = () => { const v = modalCard.querySelector('#eq-otro').value.trim(); if (!v) return; if (!names.includes(v)) names.push(v); if (!sel.includes(v)) sel.push(v); modalCard.querySelector('#eq-otro').value = ''; draw(); };
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelector('#m-ok').onclick = () => {
    const H2 = clone(H), byId = new Map(H2.g.map(g => [g.id, g]));
    x.franjas.forEach((g, i) => {
      if (!modalCard.querySelector(`[data-eqf="${i}"]`).checked) return;
      const j = modalCard.querySelector(`[data-eqj="${i}"]`), g2 = byId.get(g.id); if (!g2) return;
      g2.ent = j ? j.value.split(',').map(y => y.trim()).filter(Boolean) : [...sel];
    });
    closeModal();
    saveBankExtra_({ horario: H2, equipos: Object.assign({}, bank.equipos || {}, { [team]: [...sel] }) }, `${team}: ${sel.join(' y ') || 'sin entrenador'}.`);
  };
}
function hzModal(g) {
  const v = g || { dia: 1, ini: '17:35', fin: '19:00', eq: [], ent: [] };
  openModal(`<h2>${g ? 'Cambiar entreno' : 'Añadir un entreno'}</h2><div class="hz-form">
    <label class="ses-f">Día<select id="m-dia">${[1, 2, 3, 4, 5, 6].map(dd => `<option value="${dd}"${dd === v.dia ? ' selected' : ''}>${DIAS[dd]}</option>`).join('')}</select></label>
    <label class="ses-f">Empieza<input type="time" id="m-ini" value="${esc(v.ini)}"></label><label class="ses-f">Acaba<input type="time" id="m-fin" value="${esc(v.fin)}"></label>
    <label class="ses-f hz-wide">Equipos (si entrenan juntos, sepáralos con «+»)<input type="text" id="m-eq" value="${esc(v.eq.join(' + '))}" placeholder="Benjamín A + Alevín A"></label>
    <label class="ses-f hz-wide">Entrenadores (si son varios, sepáralos con «,»)<input type="text" id="m-ent" value="${esc(v.ent.join(', '))}" placeholder="Jorge"></label>
    <label class="ses-f hz-wide" id="m-prep-l"${v.ent.length > 1 ? '' : ' hidden'}>Quién prepara la sesión<select id="m-prep"><option value="">Cualquiera (cuenta como pendiente para todos)</option>${v.ent.map(e => `<option value="${esc(e)}"${v.prep === e ? ' selected' : ''}>${esc(e)}</option>`).join('')}<option value="*turno"${v.prep === '*turno' ? ' selected' : ''}>Se turnan cada semana</option></select><span class="sub">Al que no le toca no le sale como pendiente.</span></label></div>
    <div class="row">${g ? '<button class="btn ghost" id="m-del" type="button">Quitar del horario</button>' : ''}<button class="btn" id="m-no" type="button">Cancelar</button><button class="btn primary" id="m-ok" type="button">${g ? 'Guardar' : 'Añadir'}</button></div>`);
  const q = id => modalCard.querySelector(id).value;
  modalCard.querySelector('#m-ent').oninput = () => { const ent = q('#m-ent').split(/,| y /).map(x => x.trim()).filter(Boolean), l = modalCard.querySelector('#m-prep-l'), sel = modalCard.querySelector('#m-prep'), cur = sel.value;
    l.hidden = ent.length < 2; sel.innerHTML = `<option value="">Cualquiera (cuenta como pendiente para todos)</option>${ent.map(e => `<option value="${esc(e)}"${cur === e ? ' selected' : ''}>${esc(e)}</option>`).join('')}<option value="*turno"${cur === '*turno' ? ' selected' : ''}>Se turnan cada semana</option>`; };
  modalCard.querySelector('#m-no').onclick = closeModal;
  if (g) modalCard.querySelector('#m-del').onclick = () => { closeModal(); const H = clone(horario()); H.g = H.g.filter(x => x.id !== g.id); saveHorario(H, 'Entreno quitado del horario.'); };
  modalCard.querySelector('#m-ok').onclick = () => {
    const eq = q('#m-eq').split('+').map(x => x.trim()).filter(Boolean), ent = q('#m-ent').split(/,| y /).map(x => x.trim()).filter(Boolean), dia = +q('#m-dia'), ini = q('#m-ini'), fin = q('#m-fin');
    if (!eq.length || !ini || !fin) { toast('Pon al menos el equipo y las horas.'); return; }
    const pr = (modalCard.querySelector('#m-prep') || {}).value || '', prep = ent.length > 1 && (pr === '*turno' || ent.includes(pr)) ? pr : '';
    const H = clone(horario()); closeModal();
    if (g) { const x = H.g.find(y => y.id === g.id); if (!x) return; Object.assign(x, { dia, ini, fin, eq, ent }); if (prep) x.prep = prep; else delete x.prep; saveHorario(H, `Guardado: ${DIAS[dia]} ${ini} · ${gLabel(x)}.`); }
    else { const n = HG(dia, ini, fin, eq, ent); if (H.g.some(x => x.id === n.id)) n.id += '-' + uid().slice(0, 3); H.g.push(n); saveHorario(H, `Añadido: ${DIAS[dia]} ${ini} · ${gLabel(n)}.`); }
  };
}
function saveHorario(H, okText) { return saveBankExtra_({ horario: H }, okText); }
const saveBankExtra_ = (extra, okText) => saveBank(bank.tasks, okText, document.getElementById('dt-msg'), extra);
document.getElementById('v-dt').addEventListener('click', e => {
  const p = e.target.closest('[data-pl]');
  if (p) {
    if (p.dataset.pl === 'ver') openEquipo(p.dataset.team, 'plant');
    else if (p.dataset.pl === 'migrar') migrarAbrir();
    else if (p.dataset.pl === 'permisos') saveBankExtra_({}, 'Permisos de las plantillas actualizados.');
    else if (p.dataset.pl === 'import') plantImportar((document.getElementById('pl-code').value || '').trim());
    else if (p.dataset.pl === 'borrar') confirmModal('¿Borrar todas las plantillas?', 'Se van los nombres de todos los equipos. Habría que volver a importarlos.', 'Borrar', () => saveBankExtra_({ plant: {} }, 'Plantillas borradas.'));
    return;
  }
  const q = e.target.closest('[data-eq]'); if (q && q.dataset.eq === 'edit') { eqModal(q.dataset.team); return; }
  const b = e.target.closest('[data-hz]'); if (!b) return;
  const H = clone(horario()), v = id => (document.getElementById(id) || {}).value || '';
  if (b.dataset.hz === 'new') hzModal(null);
  else if (b.dataset.hz === 'edit') { const g = H.g.find(x => x.id === b.dataset.id); if (g) hzModal(g); }
  else if (b.dataset.hz === 'del') { H.g = H.g.filter(g => g.id !== b.dataset.id); saveHorario(H, 'Entreno quitado del horario.'); }
  else if (b.dataset.hz === 'add') {
    const eq = v('hz-eq').split('+').map(x => x.trim()).filter(Boolean), ent = v('hz-ent').split(/,| y /).map(x => x.trim()).filter(Boolean), dia = +v('hz-dia'), ini = v('hz-ini'), fin = v('hz-fin');
    if (!eq.length || !ini || !fin) { toast('Pon al menos el equipo y las horas.'); return; }
    const g = HG(dia, ini, fin, eq, ent); if (H.g.some(x => x.id === g.id)) g.id += '-' + uid().slice(0, 3);
    H.g.push(g); saveHorario(H, `Añadido: ${DIAS[dia]} ${ini} · ${gLabel(g)}.`);
  }
  else if (b.dataset.hz === 'temp') { if (!v('hz-desde') || !v('hz-hasta')) return; H.desde = v('hz-desde'); H.hasta = v('hz-hasta'); saveHorario(H, 'Fechas de la temporada guardadas.'); }
  else if (b.dataset.hz === 'sin') { if (!v('hz-sd')) { toast('Elige el día.'); return; } const x = { d: v('hz-sd'), n: v('hz-sn').trim() || 'Sin entreno' }; if (v('hz-sh') && v('hz-sh') > x.d) x.h = v('hz-sh'); H.sin = [...(H.sin || []), x]; saveHorario(H, 'Días sin entreno añadidos.'); }
  else if (b.dataset.hz === 'unsin') { H.sin = (H.sin || []).filter(x => x.d !== b.dataset.d); saveHorario(H, 'Quitado.'); }
});

