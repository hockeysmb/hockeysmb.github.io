// ================= planificación: qué se quiere trabajar en cada entreno (mesociclo) =================
// Se guarda por entreno (clave fecha|franja). Lo de cada uno va en su cuenta; en la web lo ve también el cuerpo técnico.
const LS_PLAN = 'smb-banco-plan';
function loadPlan() { try { return JSON.parse(localStorage.getItem(LS_PLAN) || '{}') || {}; } catch (e) { return {}; } }
let plan = loadPlan();
let planT = null;
function savePlan(now) { try { localStorage.setItem(LS_PLAN, JSON.stringify(plan)); } catch (e) {} clearTimeout(planT); planT = setTimeout(() => cloudPush('meta'), now ? 0 : 800); }
const planEmpty = p => !p || (!(p.foco || '').trim() && !(p.fases || []).length && !(p.cont || []).length && !(p.tec || []).length);
// el plan de un entreno: el mío o, si no, el de un compañero que lleva ese mismo grupo
function planDe(it) {
  if (!planEmpty(plan[it.key])) return { p: plan[it.key], autor: '' };
  const o = (bank.planClub || []).find(x => !x.mine && !planEmpty((x.plan || {})[it.key]));
  return o ? { p: o.plan[it.key], autor: o.autor } : null;
}
const planTxt = p => [(p.foco || '').trim(), (p.fases || []).map(f => FASE_TXT[f] || f).join(' + '), [...(p.tec || []), ...(p.cont || [])].join(' · ')].filter(Boolean).join(' — ');
let planMonth = isoToday().slice(0, 7), planTeam = '';
function planRowHTML(it) {
  const p = plan[it.key] || {}, s = sesDe(it), past = it.fecha < isoToday(), conts = (p.fases || []).flatMap(f => FASES[f] || []);
  const other = planEmpty(p) ? planDe(it) : null;
  return `<li class="pl-row${past ? ' past' : ''}">
    <div class="pl-head"><span class="ag-when">${esc(DIAS[dateOf(it.fecha).getDay()].slice(0, 3))} ${dateOf(it.fecha).getDate()} · ${esc(it.g.ini)}</span><b>${esc(gLabel(it.g))}</b>
      ${s ? `<span class="ag-st ok">Sesión preparada</span>` : past ? '<span class="ag-st">Sin sesión</span>' : `<button class="btn small" type="button" data-ag="prep" data-key="${esc(it.key)}">Preparar la sesión</button>`}</div>
    <input type="text" class="pl-foco" data-plan-foco="${esc(it.key)}" value="${esc(p.foco || '')}" placeholder="${other ? esc('De ' + other.autor.split(' ')[0] + ': ' + planTxt(other.p)) : 'Qué quieres trabajar: estaciones de técnica (chutes y regates), transición ofensiva…'}" aria-label="Qué quieres trabajar el ${esc(fmtShort(it.fecha))} con ${esc(gLabel(it.g))}">
    <div class="pl-fases" role="group" aria-label="Fase del juego">${FASE_NAMES.map(f => `<button class="chip sm" type="button" data-plan-fase="${esc(it.key)}" data-f="${esc(f)}" aria-pressed="${(p.fases || []).includes(f)}">${esc(FASE_TXT[f])}</button>`).join('')}</div>
    ${conts.length ? `<details class="pl-cont"${(p.cont || []).length ? ' open' : ''}><summary>Contenidos del modelo${(p.cont || []).length ? ` · ${p.cont.length}` : ''}</summary><div class="opts">${conts.map(c => `<button class="chip sm" type="button" data-plan-cont="${esc(it.key)}" data-c="${esc(c)}" aria-pressed="${(p.cont || []).includes(c)}">${esc(c)}</button>`).join('')}</div></details>` : ''}
    ${(() => { const kc = catOf(gLabel(it.g)), tc = p.tec || []; return `<details class="pl-cont"${tc.length ? ' open' : ''}><summary>Técnica y táctica individual${kc ? ' · ' + esc(catName(kc)) : ''}${tc.length ? ` · ${tc.length}` : ''}</summary>${TEC_NAMES.map(f => `<div class="opts"><span class="sub">${esc(f)}:</span>${tecList(f, kc ? [kc] : null).map(c => `<button class="chip sm" type="button" data-plan-tec="${esc(it.key)}" data-c="${esc(c)}" aria-pressed="${tc.includes(c)}">${esc(c)}</button>`).join('')}</div>`).join('')}</details>`; })()}
  </li>`;
}
function planHTML() {
  const [y, m] = planMonth.split('-').map(Number), last = new Date(y, m, 0).getDate();
  const all = entrenos(`${planMonth}-01`, `${planMonth}-${String(last).padStart(2, '0')}`).filter(esMio);
  const teams = [...new Set(all.map(it => gLabel(it.g)))];
  if (planTeam && !teams.includes(planTeam)) planTeam = '';
  const L = all.filter(it => !planTeam || gLabel(it.g) === planTeam);
  const weeks = {}; L.forEach(it => { const k = mondayISO(dateOf(it.fecha)); (weeks[k] = weeks[k] || []).push(it); });
  const monthName = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const done = L.filter(it => !planEmpty(plan[it.key])).length;
  return `<section class="ses-sec plan">
    <div class="cal-head"><button class="btn small" type="button" data-pm="-1" aria-label="Mes anterior">←</button><h2 class="h-sec">${esc(monthName)}</h2><button class="btn small" type="button" data-pm="1" aria-label="Mes siguiente">→</button></div>
    <p class="sub">Qué quieres trabajar en cada entreno. ${infoBtn('planificar')}${L.length ? ` Planificados: ${done} de ${L.length}.` : ''}</p>
    ${teams.length > 1 ? `<div class="fgroup ses-teams" role="group" aria-label="Equipo"><button class="chip" type="button" data-pteam="" aria-pressed="${!planTeam}">Todos</button>${teams.map(x => `<button class="chip team-chip tc${teamIdx(x)}" type="button" data-pteam="${esc(x)}" aria-pressed="${planTeam === x}">${esc(x)}</button>`).join('')}</div>` : ''}
    ${!readAuthor() ? '<p>Pon tu nombre en Mi cuenta para ver tus entrenos.</p>' : !L.length ? `<p class="sub">${all.length ? 'No hay entrenos de este equipo este mes.' : 'Este mes no tienes entrenos en el horario del club. Si debería haberlos, avisa a la Dirección Técnica para que te ponga en el horario.'}</p>` : ''}
    ${(() => { const t = isoToday(), ks = Object.keys(weeks).sort(), past = ks.filter(wk => weeks[wk].every(it => it.fecha < t)), wkHTML = wk => `<div class="pl-week"><div class="lt-head"><h3 class="h-sub">Semana del ${esc(fmtShort(wk))}</h3><button class="btn small ghost" type="button" data-pcopy="${esc(wk)}">Copiar la semana anterior</button></div>
      <ul class="pl-list">${weeks[wk].map(planRowHTML).join('')}</ul></div>`;
      return (past.length ? `<details class="pl-past"><summary>Semanas pasadas (${past.length})</summary>${past.map(wkHTML).join('')}</details>` : '') + ks.filter(wk => !past.includes(wk)).map(wkHTML).join(''); })()}
  </section>`;
}
function planSet(key, fn) { const p = Object.assign({ foco: '', fases: [], cont: [] }, plan[key] || {}); fn(p); p.ts = Date.now(); if (planEmpty(p)) delete plan[key]; else plan[key] = p; savePlan(); }
document.getElementById('ses-list').addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.planFoco; if (k) planSet(k, p => { p.foco = e.target.value; }); });
document.getElementById('ses-list').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.pm) { const [y, m] = planMonth.split('-').map(Number), d = new Date(y, m - 1 + (+b.dataset.pm), 1); planMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; render(); }
  else if (b.dataset.pteam !== undefined) { planTeam = b.dataset.pteam; render(); }
  else if (b.dataset.planFase) { const f = b.dataset.f; planSet(b.dataset.planFase, p => { p.fases = p.fases.includes(f) ? p.fases.filter(x => x !== f) : [...p.fases, f]; const ok = new Set(p.fases.flatMap(x => FASES[x] || [])); p.cont = p.cont.filter(c => ok.has(c)); }); render(); }
  else if (b.dataset.planCont) { const c = b.dataset.c; planSet(b.dataset.planCont, p => { p.cont = p.cont.includes(c) ? p.cont.filter(x => x !== c) : [...p.cont, c]; }); render(); }
  else if (b.dataset.planTec) { const c = b.dataset.c; planSet(b.dataset.planTec, p => { p.tec = p.tec || []; p.tec = p.tec.includes(c) ? p.tec.filter(x => x !== c) : [...p.tec, c]; }); render(); }
  else if (b.dataset.pcopy) {
    const wk = b.dataset.pcopy, end = dateOf(wk); end.setDate(end.getDate() + 6);
    let n = 0;
    entrenos(wk, isoOf(end)).filter(esMio).filter(it => !planTeam || gLabel(it.g) === planTeam).forEach(it => {
      if (!planEmpty(plan[it.key])) return;
      const d = dateOf(it.fecha); d.setDate(d.getDate() - 7);
      const prev = plan[isoOf(d) + '|' + it.g.id]; if (planEmpty(prev)) return;
      plan[it.key] = { foco: prev.foco || '', fases: [...(prev.fases || [])], cont: [...(prev.cont || [])], ts: Date.now() }; n++;
    });
    savePlan(true); render(); toast(n ? `Copiados ${n} ${n === 1 ? 'entreno' : 'entrenos'} de la semana anterior. Cambia lo que quieras.` : 'No había nada que copiar (o esta semana ya estaba planificada).');
  }
});

// ================= pizarra: el plan de partido de cada uno (jornada y retos cuando no estás) =================
function pizarraHTML() {
  if (!readAuthor()) return '';
  const P = pzNorm(game.pizarra) || { at: '', de: '', desesp: true };
  const opt = (k, j) => `<button class="pz-opt" type="button" data-pz="${k}" data-v="${j.id}" aria-pressed="${P[k] === j.id}">${jugIcon(j.ic)}<b>${esc(j.n)}</b><span class="dz">${esc(j.dado)}</span></button>`;
  return `<section class="ses-sec pizarra"><div class="lt-head"><h2 class="h-sec">Tu pizarra ${infoBtn('pizarra')}</h2><span class="sub">${game.pizarra && game.pizarra.ts ? 'Guardada' : 'Sin preparar'}</span></div>
    <p class="sub">Lo que juega tu personaje cuando no estás. ${infoBtn('partido')}</p>
    <h3 class="h-min">Con bola</h3><div class="pz-opts">${ATAQUES.filter(j => !j.last).map(j => opt('at', j)).join('')}</div>
    <h3 class="h-min">Sin bola</h3><div class="pz-opts">${DEFENSAS.map(j => opt('de', j)).join('')}</div>
    <h3 class="h-min">Si vas perdiendo al final</h3><div class="opts"><button class="chip" type="button" data-pz="desesp" data-v="1" aria-pressed="${P.desesp !== false}">A la desesperada</button><button class="chip" type="button" data-pz="desesp" data-v="0" aria-pressed="${P.desesp === false}">Seguir igual</button></div>
    <p class="sub"><button class="linkb" type="button" data-info="jugadas">Qué hace cada jugada</button></p></section>`;
}
document.getElementById('v-liga').addEventListener('click', e => {
  const b = e.target.closest('[data-pz]'); if (!b) return;
  const P = pzNorm(game.pizarra) || { at: 'J', de: 'P', desesp: true };
  if (b.dataset.pz === 'desesp') P.desesp = b.dataset.v === '1'; else P[b.dataset.pz] = b.dataset.v;
  P.ts = Date.now(); game.pizarra = P; saveGame(); render();
});

// ================= misiones del día: tres al día, cada una +5 monedas y +10 si haces las tres =================
const MISIONES = [
  { id: 'ej', n: 'Crea un ejercicio', ok: () => (game.log || []).some(l => String(l.key).startsWith('ex:') && l.date === isoToday()) },
  { id: 'ses', n: 'Deja una sesión completa', ok: () => (game.log || []).some(l => String(l.key).startsWith('ses:') && l.date === isoToday()) },
  { id: 'plan', n: 'Planifica 3 entrenos', ok: () => Object.values(plan).filter(p => p.ts && isoOf(new Date(p.ts)) === isoToday()).length >= 3 },
  { id: 'reto', n: 'Juega un amistoso', ok: () => (game.amis || []).some(x => x.fecha === isoToday()) },
  { id: 'pista', n: 'Termina un entreno en modo pista', ok: () => (game.log || []).some(l => String(l.key).startsWith('pista:') && l.date === isoToday()) },
  { id: 'piz', n: 'Prepara o cambia tu pizarra', ok: () => !!(game.pizarra && game.pizarra.ts && isoOf(new Date(game.pizarra.ts)) === isoToday()) },
  { id: 'smb', n: 'Completa la parte «En SMB» de un ejercicio tuyo', ok: () => mine.some(t => t.ts && isoOf(new Date(t.ts)) === isoToday() && t.smb && t.smb.lee && (t.smb.preguntas || []).length) },
];
const PTS_MISION = 5, PTS_MISIONES = 10;
function misionesHoy() {
  const R = rng(isoToday() + '|' + normName(readAuthor())), pool = [...MISIONES], out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  return out;
}
function misionesSync() {
  if (!readAuthor()) return;
  const L = misionesHoy(), t = isoToday();
  L.forEach(m => { if (m.ok()) award(`mis:${t}:${m.id}`, PTS_MISION, 'Misión del día: ' + m.n); });
  if (L.every(m => m.ok())) { award(`mis:${t}:todas`, PTS_MISIONES, 'Las tres misiones del día'); if (cofreGrant('mis:' + t, 'las tres misiones')) saveGame(); }
}
function misionesHTML() {
  if (!readAuthor()) return '';
  misionesSync();
  const L = misionesHoy(), done = L.filter(m => m.ok()).length;
  return `<section class="ses-sec misiones"><div class="lt-head"><h2 class="h-sec">Misiones de hoy ${infoBtn('misiones')}</h2><span class="sub">${done} de ${L.length} · +${PTS_MISION} cada una · las tres: +${PTS_MISIONES} y un cofre</span></div>
    <div class="mis-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${L.length}" aria-valuenow="${done}"><i style="width:${Math.round(done / L.length * 100)}%"></i></div>
    <ul class="mis-list">${L.map(m => `<li class="${m.ok() ? 'ok' : ''}"><span class="mis-c" aria-hidden="true">${m.ok() ? '✓' : ''}</span><span>${esc(m.n)}</span></li>`).join('')}</ul></section>`;
}

// cambiar el nombre de un entrenador en todo el club (lo hace la DT): cada texto que sea exactamente su nombre pasa al nuevo
function renameDeep(v, from, to) {
  const f = normName(from);
  const walk = x => typeof x === 'string' ? (normName(x) === f ? to : x) : Array.isArray(x) ? x.map(walk) : (x && typeof x === 'object') ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y)])) : x;
  return walk(v);
}
function renameCoach(uid, from, to, okText) {
  to = String(to || '').trim(); if (!to || !from || String(from).trim() === to) return Promise.resolve(false); // vale cambiar solo una tilde
  if ((bank.coaches || []).some(c => normName(c.name) === normName(to) && !(uid && c.uid === uid))) { toast(`Ya hay un entrenador que se llama ${to}.`); return Promise.resolve(false); }
  const skip = ['memberUids', 'dtUids', 'memberEmails', 'amistosos', 'sesClub', 'ejClub', 'planClub', 'mkOf', 'mkAc', 'coaches', 'tasks'];
  const extra = {}; Object.keys(bank).forEach(k => { if (!skip.includes(k)) extra[k] = renameDeep(bank[k], from, to); });
  const ts = Date.now();
  extra.coaches = (bank.coaches || []).map(c => ((uid && c.uid === uid) || normName(c.name) === normName(from)) ? Object.assign({}, c, { name: to, nameSet: ts }) : c);
  lgCache = null; lgRes.clear();
  return saveBank(renameDeep(bank.tasks, from, to), okText || `Ahora es ${to}. Cambia en todo el club.`, null, extra);
}

