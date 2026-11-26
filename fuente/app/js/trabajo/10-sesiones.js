// ================= sesiones =================
// Ficha de sesión del club: datos, objetivos, cuatro bloques (los de la plantilla) y reflexión.
const SES_KEY = 'smb-banco-sesiones';
const SES_BLOQUES = [
  { tipo: 'calentamiento', n: 'Calentamiento', d: 'Habilidad motriz general o específica · patinaje y manejo de stick' },
  { tipo: 'tecnico', n: 'Parte principal I', d: 'Técnico-táctico · gesto técnico con decisión sencilla' },
  { tipo: 'decision', n: 'Parte principal II', d: 'Toma de decisión · 3c3 · máx. 4c4' },
  { tipo: 'global', n: 'Parte final', d: 'Juego global · aplicación real de lo trabajado' },
];
const SES_FIELDS = [
  ['org', 'Organización y espacio'],
  ['fin', 'Finalidad (objetivo del banco)'],
  ['desc', 'Descripción y reglas'],
  ['var', 'Variantes / progresiones'],
  ['claves', 'Claves de enseñanza / corrección'],
  ['portero', 'Trabajo del portero (qué hace aquí)'],
];
const SES_OBJ = [['tec', 'Objetivo técnico'], ['tac', 'Objetivo táctico'], ['fis', 'Objetivo físico'], ['psi', 'Objetivo psicológico'], ['sec', 'Objetivo secundario (fase contraria)']];
let sessions = loadSes();
let sesEd = null; // { s, isNew }
let downloadsApi = null;

function loadSes() { try { return JSON.parse(localStorage.getItem(SES_KEY) || '[]'); } catch (e) { return []; } }
function saveSes() { try { localStorage.setItem(SES_KEY, JSON.stringify(sessions)); cloudPush('sessions'); return true; } catch (e) { return false; } }
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDate = iso => { if (!iso) return 'Sin fecha'; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
const sesTotal = s => s.bloques.reduce((a, b) => a + (parseInt(b.min, 10) || 0), 0) || (parseInt(s.dur, 10) || 0);
const emptyB = () => ({ min: '', task: null, org: '', fin: '', desc: '', var: '', claves: '', portero: '' });
function newSession(kind) {
  const s = { id: 'ses-' + uid(), equipo: '', fecha: isoToday(), micro: '', entrenador: readAuthor(), fundamento: '', fundamentos: [], fase: '',
    obj: { tec: '', tac: '', fis: '', psi: '', sec: '' }, bloques: SES_BLOQUES.map(emptyB), reflexion: '' };
  if (kind === 'tec') { s.kind = 'tec'; s.dur = ''; s.bloques = [emptyB()]; }
  return s;
}
const isTec = s => s && s.kind === 'tec';
// qué es cada bloque: los cuatro de la plantilla, o «Ejercicio n» en una sesión de tecnificación
function blk(s, i) { return isTec(s) ? { n: `Ejercicio ${i + 1}`, d: 'Tecnificación', tipo: 'tecnificacion', label: 'Ejercicio', head: `Ejercicio ${i + 1}` } : Object.assign({ label: 'Bloque', head: `Bloque ${i + 1} · ${SES_BLOQUES[i].n}` }, SES_BLOQUES[i]); }
const nB = s => s.bloques.length;

// --- lo que se puede deducir del gráfico ---
function orgText(dg) {
  const it = (dg && dg.items) || [], n = t => it.filter(i => i.type === t).length;
  const atk = n('atk'), def = n('def'), gk = n('gk'), parts = [];
  if (atk && def) parts.push(`${atk + def} jugadores (${atk} ${atk === 1 ? 'atacante' : 'atacantes'} y ${def} ${def === 1 ? 'defensor' : 'defensores'})`);
  else if (atk + def) parts.push(`${atk + def} jugadores`);
  if (gk) parts.push(gk === 1 ? '1 portero' : `${gk} porteros`);
  [['ball', 'bola', 'bolas'], ['cone', 'cono', 'conos'], ['chino', 'chino', 'chinos'], ['aro', 'aro', 'aros'], ['pica', 'pica', 'picas'], ['valla', 'valla', 'vallas'], ['stick', 'stick en el suelo', 'sticks en el suelo'], ['escalera', 'escalera de coordinación', 'escaleras de coordinación'], ['bidon', 'bidón', 'bidones'], ['goal', 'portería portátil', 'porterías portátiles']].forEach(([t, s1, s2]) => {
    const k = n(t); if (!k) return;
    let txt = `${k} ${k === 1 ? s1 : s2}`;
    if (COLORED.includes(t)) { const by = {}, NM = ['pica', 'valla'].includes(t) ? CONE_FEM : CONE_NAMES; it.filter(i => i.type === t).forEach(i => { const c = coneKey(i); by[c] = (by[c] || 0) + 1; }); const ks = Object.keys(by);
      if (ks.length > 1 || ks[0] !== 'azul') txt = ks.length === 1 ? `${txt} ${NM[ks[0]][k === 1 ? 1 : 2]}` : `${txt} (${ks.map(c => `${by[c]} ${NM[c][by[c] === 1 ? 1 : 2]}`).join(', ')})`; }
    parts.push(txt);
  });
  const xs = [...it.map(i => i.x), ...((dg && dg.arrows) || []).flatMap(a => a.pts.map(p => p[0]))];
  if (xs.length) { const lo = Math.min(...xs), hi = Math.max(...xs); parts.push(hi <= 52 || lo >= 48 ? 'media pista' : 'pista entera'); }
  return parts.join(' · ');
}
function prefill(b, t) {
  const m = t.smb || {};
  b.task = { id: t.id, num: t.num || null, title: t.title || '', source: t.source, author: t.author || '', tipo: t.tipo || '', diagram: clone(t.diagram || { items: [], arrows: [] }) };
  b.org = orgText(t.diagram);
  b.fin = [worksOf(t).join(' · '), m.lee ? 'Qué tiene que leer el jugador: ' + m.lee : ''].filter(Boolean).join('\n');
  b.desc = (t.rules || []).map(r => '- ' + r).join('\n');
  b.var = [m.facil ? 'Más fácil: ' + m.facil : '', m.dificil ? 'Más difícil: ' + m.dificil : '', t.notes || ''].filter(Boolean).join('\n');
  b.claves = (m.preguntas || []).length ? 'Preguntas para parar la tarea:\n' + m.preguntas.map(q => '- ' + q).join('\n') : '';
  b.portero = '';
}
const taskLabel = t => t ? `${t.num ? 'nº ' + t.num + ' · ' : ''}${t.title || 'Sin nombre'}` : '';
const taskSource = t => !t ? '' : t.source === 'oller' ? `Marc Oller, 365 exercicis d’hoquei patins, ejercicio ${t.num}.` : `Ejercicio de ${t.author || 'un entrenador'}.`;

// --- listado ---
function fundamentoText(s) { return [...(s.fundamentos || []), s.fundamento].filter(Boolean).join(' · '); }
let sesTeam = '';
function sesCard(s) {
  return `<article class="task ses-card" id="card-${s.id}">
    <div class="task-head">
      <div class="meta"><span class="badge">${isTec(s) ? 'Tecnificación' : 'Sesión'}</span>${!sesComplete(s) ? `<span class="badge warn">A medias · ${s.bloques.filter(b => b.task).length} de ${nB(s)}</span>` : ''}${isDone(s) ? `<span class="badge done-b">✓ Hecha el ${esc(fmtShort(s.hechas[s.hechas.length - 1]))}</span>` : ''}<span>${esc(fmtDate(s.fecha))}</span>${s.micro ? `<span>Microciclo ${esc(s.micro)}</span>` : ''}${sesTotal(s) ? `<span>${sesTotal(s)} min</span>` : ''}${s.entrenador ? `<span>${esc(s.entrenador)}</span>` : ''}</div>
      <h2>${esc(s.equipo || 'Sin equipo')}</h2>
      ${fundamentoText(s) ? `<p class="works"><b>Fundamento del día:</b> ${esc(fundamentoText(s))}</p>` : ''}
    </div>
    <div class="ses-rows">${s.bloques.map((b, i) => `<div class="ses-row">
      <div class="ses-thumb">${b.task ? diagramSVG(b.task.diagram, taskLabel(b.task)) : '<div class="ses-empty">Sin ejercicio</div>'}</div>
      <div><div class="ses-bn">${isTec(s) ? esc(blk(s, i).n) : (i + 1) + ' · ' + esc(SES_BLOQUES[i].n)}${b.min ? ` · ${esc(b.min)} min` : ''}</div><div>${esc(taskLabel(b.task) || '—')}</div></div>
    </div>`).join('')}</div>
    <div class="actions ses-actions">
      ${sesComplete(s) ? `<button class="btn primary" type="button" data-ses="pista" data-id="${s.id}">Empezar entrenamiento</button>
      <button class="btn" type="button" data-ses="edit" data-id="${s.id}">Editar</button>` : `<button class="btn primary" type="button" data-ses="edit" data-id="${s.id}">Seguir preparándola</button>
      <button class="btn" type="button" data-ses="pista" data-id="${s.id}">Empezar igualmente</button>`}
      <button class="btn" type="button" data-ses="more" data-id="${s.id}" aria-haspopup="dialog">Más…</button>
      <p class="msg" id="msg-${s.id}" aria-live="polite"></p>
    </div>
  </article>`;
}
let sesView = (() => { try { return localStorage.getItem('smb-ses-view') || 'cal'; } catch (e) { return 'cal'; } })();
let calMonth = isoToday().slice(0, 7), calDay = isoToday();
const teamIdx = n => { let h = 0; for (const ch of String(n || '').trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 6; };
const isDone = s => (s.hechas || []).length > 0;
// color fijo por entrenador (orden alfabético del cuerpo técnico), para que no cambie al filtrar
const coachIdx = n => { const L = [...new Set([readAuthor(), ...(bank.sesClub || []).map(x => x.autor), ...(bank.coaches || []).map(c => c.name)].filter(Boolean).map(normName))].sort(); const i = L.indexOf(normName(n)); return i < 0 ? teamIdx(n) : i % 8; };
function calendarHTML(shown, club) {
  // club: calendario del cuerpo técnico; cada sesión ajena lleva _club (la entrada del directorio) y el color es el del entrenador
  const who = s => s._club ? (s._club.autor || s.entrenador || '') : (readAuthor() || s.entrenador || '');
  const chipCls = s => club ? coachIdx(who(s)) : teamIdx(s.equipo);
  const chipTxt = s => club ? `${s._club ? esc(who(s).split(' ')[0]) : 'Tú'} · ${esc(s.equipo || (isTec(s) ? 'Tecnif.' : 'Sesión'))}` : esc(s.equipo || (isTec(s) ? 'Tecnificación' : 'Sesión'));
  const [y, m] = calMonth.split('-').map(Number), t = isoToday();
  const first = new Date(y, m - 1, 1), start = (first.getDay() + 6) % 7, days = new Date(y, m, 0).getDate();
  const byDay = {}; shown.forEach(s => { if (s.fecha) (byDay[s.fecha] = byDay[s.fecha] || []).push(s); });
  // entrenos del horario sin sesión: los míos en mi calendario; todos (o los del filtrado) en el del cuerpo técnico
  const agAll = entrenos(`${y}-${String(m).padStart(2, '0')}-01`, `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`)
    .filter(it => club ? (!clubAutor || it.g.ent.some(e => isMe(e, clubAutor))) : esMio(it));
  const agDay = {}; agAll.forEach(it => { (agDay[it.fecha] = agDay[it.fecha] || []).push(it); });
  const todoOf = k => (agDay[k] || []).filter(it => k >= t && !sesDe(it) && (club ? true : meToca(it)));
  const iso = d => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const cells = [];
  for (let i = 0; i < start; i++) cells.push('<span class="cal-cell out" aria-hidden="true"></span>');
  for (let d = 1; d <= days; d++) {
    const k = iso(d), L = byDay[k] || [], TD = todoOf(k);
    cells.push(`<button class="cal-cell${k === t ? ' today' : ''}${k === calDay ? ' sel' : ''}${k < t ? ' past' : ''}" type="button" data-day="${k}" aria-pressed="${k === calDay}" aria-label="${esc(fmtDate(k))}${L.length ? ': ' + L.length + (L.length === 1 ? ' sesión' : ' sesiones') : ''}"><span class="cal-n">${d}</span><span class="cal-items">${L.slice(0, 3).map(s => `<span class="cal-chip tc${chipCls(s)}${isDone(s) ? ' done' : ''}">${isDone(s) ? '✓ ' : ''}${chipTxt(s)}</span>`).join('')}${TD.slice(0, Math.max(0, 3 - L.length)).map(it => `<span class="cal-chip todo tc${club ? coachIdx(it.g.ent[0] || '') : teamIdx(gLabel(it.g))}">${club ? esc((it.g.ent[0] || '?').split(' ')[0]) + ' · ' : ''}${esc(gLabel(it.g))}</span>`).join('')}${L.length + TD.length > 3 ? `<span class="cal-more">+${L.length + TD.length - 3}</span>` : ''}</span></button>`);
  }
  const monthName = first.toLocaleDateString('es-ES', { month: 'long' }) + ' ' + y;
  const daySes = byDay[calDay] || [], noDate = shown.filter(s => !s.fecha).length;
  return `<section class="ses-sec cal">
      <div class="cal-head"><button class="btn small" type="button" data-cal="-1" aria-label="Mes anterior">←</button><h2 class="h-sec">${esc(monthName)}</h2><button class="btn small" type="button" data-cal="1" aria-label="Mes siguiente">→</button><button class="btn small ghost" type="button" data-cal="hoy">Hoy</button></div>
      <div class="cal-grid">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => `<span class="cal-dow" aria-hidden="true">${x}</span>`).join('')}${cells.join('')}</div>
      <p class="sub cal-key">${agAll.length ? '<span class="cal-chip todo tc0">Entreno</span> sin preparar · ' : ''}${club ? [...new Set(shown.map(who).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')).map(n => `<span class="cal-chip tc${coachIdx(n)}">${esc(normName(n) === normName(readAuthor()) ? 'Tú' : n)}</span>`).join(' ') + ' · ✓ hecha' : `<span class="cal-chip tc0">Equipo</span> planificada <span class="cal-chip tc0 done">✓ Equipo</span> hecha`}${noDate ? ` · ${noDate} sin fecha: están en «Lista»` : ''}</p>
    </section>
    <section class="cal-day" id="cal-day"><div class="lt-head"><h2 class="h-sec">${esc(fmtDate(calDay))}</h2><div class="actions"><button class="btn small primary" type="button" data-cal-new="">+ Sesión de equipo</button><button class="btn small" type="button" data-cal-new="tec">+ Tecnificación</button></div></div>
      ${(agDay[calDay] || []).length ? `<ul class="ag-list">${agDay[calDay].map(it => agRowHTML(it, club)).join('')}</ul>` : ''}
      ${daySes.length ? daySes.map(x => x._club ? clubSesCard(x._club) : sesCard(x)).join('') : (agDay[calDay] || []).length ? '' : `<p class="sub">${sinEntreno(calDay) ? 'Sin entreno: ' + esc(sinEntreno(calDay).n) + '.' : calDay < t ? 'No hubo sesión este día.' : 'Nada planificado este día.'}</p>`}</section>`;
}
// --- directorio: las sesiones del resto del cuerpo técnico (solo en la web) ---
let sesScope = (() => { try { return localStorage.getItem('smb-ses-scope') || 'mias'; } catch (e) { return 'mias'; } })(), clubAutor = '', clubN = 20;
const clubSes = () => (bank.sesClub || []).filter(x => !x.mine && (x.s.bloques || []).some(b => b && b.task));
const clubDate = x => x.s.fecha || new Date(x.ts || 0).toISOString().slice(0, 10);
function clubSesCard(x) {
  const s = x.s, nueva = Date.now() - (x.ts || 0) < 7 * 864e5;
  return `<article class="task ses-card club">
    <div class="task-head">
      <div class="meta"><span class="badge mine">${esc(x.autor || s.entrenador || 'Entrenador')}</span><span class="badge">${isTec(s) ? 'Tecnificación' : 'Sesión'}</span>${nueva ? '<span class="badge warn">Nueva</span>' : ''}<span>${esc(fmtDate(s.fecha))}</span>${sesTotal(s) ? `<span>${sesTotal(s)} min</span>` : ''}${isDone(s) ? '<span>✓ Hecha</span>' : ''}</div>
      <h2>${esc(s.equipo || 'Sin equipo')}</h2>
      ${fundamentoText(s) ? `<p class="works"><b>Fundamento del día:</b> ${esc(fundamentoText(s))}</p>` : ''}
    </div>
    <div class="ses-rows">${s.bloques.map((b, i) => `<div class="ses-row">
      <div class="ses-thumb">${b.task ? diagramSVG(b.task.diagram, taskLabel(b.task)) : '<div class="ses-empty">Sin ejercicio</div>'}</div>
      <div><div class="ses-bn">${isTec(s) ? esc(blk(s, i).n) : (i + 1) + ' · ' + esc(SES_BLOQUES[i].n)}${b.min ? ` · ${esc(b.min)} min` : ''}</div><div>${esc(taskLabel(b.task) || '—')}</div></div>
    </div>`).join('')}</div>
    <div class="actions ses-actions">
      <button class="btn" type="button" data-sc="view" data-id="${esc(x.id)}">Ver ficha</button>
      <button class="btn primary" type="button" data-sc="copy" data-id="${esc(x.id)}">Copiar a mis sesiones</button>
      <button class="btn" type="button" data-sc="pdf" data-id="${esc(x.id)}">PDF</button>
      <p class="msg" id="msg-${esc(x.id)}" aria-live="polite"></p>
    </div>
  </article>`;
}
function clubHTML() {
  const all = clubSes(), autores = [...new Set(all.map(x => x.autor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  if (clubAutor && !autores.includes(clubAutor)) clubAutor = '';
  const shown = all.filter(x => !clubAutor || x.autor === clubAutor).sort((a, b) => clubDate(b).localeCompare(clubDate(a)) || (b.ts || 0) - (a.ts || 0));
  if (!all.length) return '<div class="empty">Todavía no hay sesiones de otros entrenadores. Aparecen aquí solas en cuanto alguien guarda una sesión con algún ejercicio.</div>';
  return `<p class="sub">Todas las sesiones del cuerpo técnico, al momento. Para usar una, «Copiar a mis sesiones» y cámbiale el equipo y la fecha.</p>
    ${autores.length > 1 ? `<div class="fgroup ses-teams" role="group" aria-label="Entrenador"><button class="chip" type="button" data-cautor="" aria-pressed="${!clubAutor}">Todos</button>${autores.map(a => `<button class="chip" type="button" data-cautor="${esc(a)}" aria-pressed="${clubAutor === a}">${esc(a)} · ${all.filter(x => x.autor === a).length}</button>`).join('')}</div>` : ''}
    ${shown.slice(0, clubN).map(clubSesCard).join('')}
    ${shown.length > clubN ? `<div class="actions"><button class="btn" type="button" data-cmore>Ver más (${shown.length - clubN})</button></div>` : ''}`;
}
function renderSessions() {
  const list = document.getElementById('ses-list'), st = document.getElementById('st-ses');
  const scopeOn = !!window.SMB_CLOUD; if (!scopeOn && sesScope === 'club') sesScope = 'mias';
  const bar = v => `<div class="ses-bar">${scope}${v || ''}</div>`;
  const scope = `<div class="seg scope wrap" role="group" aria-label="Qué ver"><button type="button" data-scope="mias" aria-pressed="${sesScope === 'mias'}">Mis sesiones</button><button type="button" data-scope="plan" aria-pressed="${sesScope === 'plan'}">Planificar</button>${scopeOn ? `<button type="button" data-scope="club" aria-pressed="${sesScope === 'club'}">Cuerpo técnico${clubSes().length ? ` · ${clubSes().length}` : ''}</button>` : ''}</div>`;
  if (sesScope === 'plan') {
    const fk = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.planFoco, sel = fk ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    if (st) st.textContent = 'Qué quieres trabajar en cada entreno';
    list.innerHTML = bar() + planHTML();
    if (fk) { const el = list.querySelector(`[data-plan-foco="${CSS.escape(fk)}"]`); if (el) { el.focus(); try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
    return;
  }
  if (sesScope === 'club') {
    if (st) st.textContent = `${clubSes().length} ${clubSes().length === 1 ? 'sesión' : 'sesiones'} de otros entrenadores`;
    const segC = `<div class="seg" role="group" aria-label="Cómo ver las sesiones"><button type="button" data-sview="cal" aria-pressed="${sesView === 'cal'}">Calendario</button><button type="button" data-sview="list" aria-pressed="${sesView === 'list'}">Lista</button></div>`;
    if (sesView === 'cal') {
      const me = readAuthor(), all = [...clubSes().map(x => Object.assign({}, x.s, { _club: x })), ...sessions];
      const names = [...new Set([me, ...clubSes().map(x => x.autor)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
      if (clubAutor && !names.includes(clubAutor)) clubAutor = '';
      const shownC = all.filter(s => !clubAutor || (s._club ? s._club.autor : me) === clubAutor);
      const chipsC = names.length > 1 ? `<div class="fgroup ses-teams" role="group" aria-label="Entrenador"><button class="chip" type="button" data-cautor="" aria-pressed="${!clubAutor}">Todos</button>${names.map(a => `<button class="chip team-chip tc${coachIdx(a)}" type="button" data-cautor="${esc(a)}" aria-pressed="${clubAutor === a}">${esc(normName(a) === normName(me) ? 'Tú' : a)}</button>`).join('')}</div>` : '';
      list.innerHTML = bar(segC) + `<p class="sub">Las sesiones de todo el cuerpo técnico en un solo calendario, cada entrenador con su color. Toca un día para verlas.</p>` + chipsC + calendarHTML(shownC, true);
      return;
    }
    list.innerHTML = bar(segC) + clubHTML(); return;
  }
  const t = isoToday(), nx = sessions.filter(s => (s.fecha || '') >= t).length;
  if (st) st.textContent = sessions.length ? `${sessions.length} ${sessions.length === 1 ? 'sesión' : 'sesiones'}${nx ? ` · ${nx} ${nx === 1 ? 'próxima' : 'próximas'}` : ''}` : 'Todavía ninguna sesión.';
  const seg = `<div class="seg" role="group" aria-label="Cómo ver las sesiones"><button type="button" data-sview="cal" aria-pressed="${sesView === 'cal'}">Calendario</button><button type="button" data-sview="list" aria-pressed="${sesView === 'list'}">Lista</button></div>`;
  const teams = [...new Set(sessions.map(s => (s.equipo || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  if (sesTeam && !teams.includes(sesTeam)) sesTeam = '';
  const shown = sessions.filter(s => !sesTeam || (s.equipo || '').trim() === sesTeam);
  const chips = teams.length > 1 ? `<div class="fgroup ses-teams" role="group" aria-label="Equipo"><button class="chip" type="button" data-team="" aria-pressed="${!sesTeam}">Todos</button>${teams.map(x => `<button class="chip team-chip tc${teamIdx(x)}" type="button" data-team="${esc(x)}" aria-pressed="${sesTeam === x}">${esc(x)}</button>`).join('')}</div>` : '';
  if (sesView === 'cal') { list.innerHTML = bar(seg) + chips + calendarHTML(shown); return; }
  if (!sessions.length) {
    list.innerHTML = bar(seg) + '<div class="empty">Todavía no tienes sesiones. Pulsa «+ Sesión de equipo»: vas paso a paso, eliges un ejercicio para cada bloque de la plantilla del club y la descargas en PDF.</div>';
    return;
  }
  const up = shown.filter(s => (s.fecha || '') >= t).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const past = shown.filter(s => (s.fecha || '') < t).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.ts || 0) - (a.ts || 0));
  list.innerHTML = `${scope}${seg}${chips}
    ${up.length ? `<h2 class="h-sec">Próximas</h2>${up.map(sesCard).join('')}` : ''}
    ${past.length ? `<h2 class="h-sec">Anteriores</h2>${past.map(sesCard).join('')}` : ''}`;
}
function sesMore(s) {
  openModal(`<h2>${esc(s.equipo || 'Sesión')}</h2><p class="sub">${esc(fmtDate(s.fecha))}</p>
    <div class="pick-list">
      <button class="btn pick-opt" type="button" data-sm="pdf"><b>Descargar PDF</b><small>Para compartirla o imprimirla.</small></button>
      <button class="btn pick-opt" type="button" data-sm="view"><b>Ver ficha</b><small>La plantilla del club, rellena.</small></button>
      <button class="btn pick-opt" type="button" data-sm="done"><b>${isDone(s) ? 'Quitar «hecha»' : 'Marcar como hecha'}</b><small>${isDone(s) ? 'Vuelve a salir como planificada.' : 'Se marca sola al terminar en modo pista.'}</small></button>
      <button class="btn pick-opt" type="button" data-sm="dup"><b>Duplicar</b><small>Una copia con la fecha de hoy.</small></button>
      <button class="btn pick-opt" type="button" data-sm="semana"><b>${canWriteBank ? 'Proponer como sesión de la semana' : window.SMB_CLOUD ? 'Proponer para la votación' : 'Mandar a la DT'}</b><small>${canWriteBank ? 'Entra en la votación del cuerpo técnico.' : 'Para la votación de la sesión de la semana.'}</small></button>
      <button class="btn pick-opt danger" type="button" data-sm="del"><b>Borrar</b></button>
    </div>
    <div class="row"><button class="btn" id="m-no" type="button">Cerrar</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelectorAll('[data-sm]').forEach(b => b.onclick = () => { const a = b.dataset.sm; if (a !== 'del') closeModal(); sesAction(a, s); });
}
function sesAction(act, s) {
  if (act === 'pista') openPista(s);
  else if (act === 'more') sesMore(s);
  else if (act === 'edit') openSes(clone(s), false);
  else if (act === 'pdf') downloadSes(s, document.getElementById('msg-' + s.id));
  else if (act === 'view') openSheet(s);
  else if (act === 'semana') proposeSession(s);
  else if (act === 'done') { const r = sessions.find(x => x.id === s.id); if (!r) return; r.hechas = isDone(r) ? [] : [isoToday()]; saveSes(); render(); toast(isDone(r) ? 'Sesión marcada como hecha.' : 'Marca quitada.'); }
  else if (act === 'dup') { const c = clone(s); delete c.hechas; c.id = 'ses-' + uid(); c.fecha = isoToday(); c.ts = Date.now(); sessions.push(c); saveSes(); render(); }
  else if (act === 'del') confirmModal('¿Borrar esta sesión?', window.SMB_CLOUD ? 'Se borra de tu cuenta y del directorio del cuerpo técnico.' : 'Se borra solo de este navegador.', 'Borrar', () => { sessions = sessions.filter(x => x.id !== s.id); saveSes(); render(); });
}
document.getElementById('ses-list').addEventListener('click', e => {
  const sc = e.target.closest('[data-scope]'); if (sc) { sesScope = sc.dataset.scope; clubN = 20; try { localStorage.setItem('smb-ses-scope', sesScope); } catch (er) {} render(); return; }
  const ca = e.target.closest('[data-cautor]'); if (ca) { clubAutor = ca.dataset.cautor; clubN = 20; render(); return; }
  if (e.target.closest('[data-cmore]')) { clubN += 20; render(); return; }
  const cb = e.target.closest('[data-sc]'); if (cb) {
    const x = clubSes().find(y => y.id === cb.dataset.id); if (!x) return;
    if (cb.dataset.sc === 'view') openSheet(x.s);
    else if (cb.dataset.sc === 'pdf') downloadSes(x.s, document.getElementById('msg-' + x.id));
    else { const c = clone(x.s); delete c.hechas; c.id = 'ses-' + uid(); c.ts = Date.now(); c.fecha = isoToday(); c.entrenador = readAuthor() || c.entrenador; sessions.push(c); const ok = saveSes();
      if (ok) { sesScope = 'mias'; sesView = 'list'; render(); toast(`Copiada de ${x.autor || 'un entrenador'}: cámbiale el equipo y la fecha.`); openSes(clone(c), false); } else toast('Este navegador no deja guardar.'); }
    return;
  }
  const tb = e.target.closest('[data-team]'); if (tb) { sesTeam = tb.dataset.team; render(); return; }
  const v = e.target.closest('[data-sview]'); if (v) { sesView = v.dataset.sview; try { localStorage.setItem('smb-ses-view', sesView); } catch (er) {} render(); return; }
  const cn = e.target.closest('[data-cal]'); if (cn) {
    if (cn.dataset.cal === 'hoy') { calDay = isoToday(); calMonth = calDay.slice(0, 7); }
    else { const [y, m] = calMonth.split('-').map(Number), d = new Date(y, m - 1 + (+cn.dataset.cal), 1); calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
    render(); return;
  }
  const dy = e.target.closest('[data-day]'); if (dy) { calDay = dy.dataset.day; render(); const p = document.getElementById('cal-day'); if (p && window.innerWidth < 760) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const nw = e.target.closest('[data-cal-new]'); if (nw) { const s = newSession(nw.dataset.calNew); s.fecha = calDay; openSes(s, true); return; }
  const b = e.target.closest('button[data-ses]'); if (!b) return;
  const s = sessions.find(x => x.id === b.dataset.id); if (s) sesAction(b.dataset.ses, s);
});
document.getElementById('btn-new-ses').addEventListener('click', () => openSes(newSession(), true));
document.getElementById('btn-new-tec').addEventListener('click', () => openSes(newSession('tec'), true));

// --- editor de sesión ---
const sesWrap = document.getElementById('ses-wrap'), sesBox = document.getElementById('ses-ed');
const fieldHTML = (path, label, val, rows) => `<label class="ses-f">${esc(label)}<textarea data-f="${path}" rows="${rows || 2}" autocapitalize="sentences" spellcheck="true">${esc(val || '')}</textarea></label>`;
function bloqueHTML(i) {
  const s = sesEd.s, b = s.bloques[i], B = blk(s, i);
  return `<section class="ses-sec ses-b" id="ses-b-${i}">
    <div class="ses-b-head"><div><h3>${esc(B.head)}</h3><p class="sub">${esc(B.d)}</p>${isTec(s) && nB(s) > 1 ? `<button class="linkb" type="button" data-delb="${i}">Quitar este ejercicio de la sesión</button>` : ''}</div>
      <label class="ses-f ses-min">Tiempo (min)<input type="number" inputmode="numeric" min="0" max="120" data-f="b.${i}.min" value="${esc(b.min)}"></label></div>
    ${b.task ? `<div class="ses-task">
        <div class="ses-thumb big">${diagramSVG(b.task.diagram, taskLabel(b.task))}</div>
        <div class="ses-tinfo"><b>${esc(taskLabel(b.task))}</b><span class="src">${esc(taskSource(b.task))}</span>
          <div class="actions"><button class="btn small" type="button" data-pick="${i}">Cambiar ejercicio</button><button class="btn small" type="button" data-create="${i}">Crear uno nuevo</button><button class="btn small ghost" type="button" data-unpick="${i}">Quitar</button></div></div>
      </div>` : `<div class="actions"><button class="btn primary" type="button" data-pick="${i}">Elegir ejercicio del banco</button><button class="btn" type="button" data-create="${i}">+ Crear un ejercicio nuevo</button></div>`}
    ${detallesHTML(i, b)}
  </section>`;
}
// 13 nov: los detalles de la ficha van plegados. Si el ejercicio viene del banco ya están rellenos
// (lo hace `prefill`), así que lo normal es no tener que abrirlos.
function detallesHTML(i, b) {
  const puestos = SES_FIELDS.filter(([k]) => String(b[k] || '').trim()).length;
  const avance = (SES_FIELDS.find(([k]) => String(b[k] || '').trim()) || [])[0];
  const texto = avance ? String(b[avance]).replace(/^-\s*/, '').split('\n')[0].slice(0, 46) : '';
  const abierto = sesEd && sesEd.det && sesEd.det[i];
  return `<details class="ses-det" data-det="${i}"${abierto ? ' open' : ''}>
    <summary><span class="sd-t">${puestos ? `Detalles de la ficha · ${puestos} de ${SES_FIELDS.length}` : 'Añadir detalles'}</span>${texto ? `<span class="sd-p">${esc(texto)}${String(b[avance]).length > 46 ? '…' : ''}</span>` : '<span class="sd-p">Organización, finalidad, reglas, variantes, claves y portero</span>'}</summary>
    <div class="ses-fields">${SES_FIELDS.map(([k, l]) => fieldHTML(`b.${i}.${k}`, l, b[k], k === 'desc' || k === 'claves' || k === 'var' ? 4 : 2)).join('')}</div>
  </details>`;
}
const sesSteps = s => ['Datos y objetivos', ...s.bloques.map((_, i) => isTec(s) ? blk(s, i).n : SES_BLOQUES[i].n), 'Cierre'];
function openSes(s, isNew, step = 0) {
  s.fundamentos = s.fundamentos || [];
  sesEd = { s, isNew, fresh: isNew, step, det: {}, sig: JSON.stringify(s) };
  sesBox.hidden = false; document.body.style.overflow = 'hidden';
  renderSesStep();
}
function stepDone(s, k) {
  if (k === 0) return !!(s.equipo && fundamentoText(s));
  if (k <= nB(s)) return !!s.bloques[k - 1].task;
  return !!s.reflexion;
}
function renderSesStep(msgHtml, msgCls) {
  const { s, isNew, step } = sesEd, O = s.obj;
  let body = '';
  if (step === 0) {
    const sc = catOf(s.equipo);
    const tuyos = misCont().map(x => x.c).filter(c => !s.fundamentos.includes(c));
    const avail = (tuyos.length ? `<optgroup label="Tuyos (escritos a mano)">${tuyos.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</optgroup>` : '') + TEC_NAMES.map(f => { const it = tecList(f, sc ? [sc] : null).filter(c => !s.fundamentos.includes(c)); return it.length ? `<optgroup label="Técnica · ${esc(f)}${sc ? ' (' + esc(catName(sc)) + ')' : ''}">${it.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</optgroup>` : ''; }).join('')
      + FASE_NAMES.map(f => { const it = FASES[f].filter(c => !s.fundamentos.includes(c)); return it.length ? `<optgroup label="Táctica · ${esc(faseTxt(f))}">${it.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</optgroup>` : ''; }).join('');
    body = `<section class="ses-sec"><h3>Datos</h3><div class="ses-grid">
      <label class="ses-f">Equipo / categoría<input type="text" data-f="equipo" value="${esc(s.equipo)}" placeholder="Por ejemplo: Alevín B" autocapitalize="words" autocomplete="off" enterkeyhint="next"></label>
      <label class="ses-f">Fecha<input type="date" data-f="fecha" value="${esc(s.fecha)}"></label>
      <label class="ses-f">Microciclo<input type="text" data-f="micro" value="${esc(s.micro)}" autocapitalize="sentences" autocomplete="off" enterkeyhint="next"></label>
      <label class="ses-f">Entrenador<input type="text" data-f="entrenador" value="${esc(s.entrenador)}" autocapitalize="words" autocomplete="name" enterkeyhint="done"></label>
      ${isTec(s) ? `<label class="ses-f">Duración (min)<input type="number" inputmode="numeric" min="0" data-f="dur" value="${esc(s.dur || '')}"></label>` : ''}
    </div></section>
    <section class="ses-sec"><h3>Objetivos de la sesión</h3><p class="sub">Una sesión completa trabaja las cuatro dimensiones. Mínimo: un objetivo técnico y uno táctico. Si atacas, define qué defensa va enlazada (y viceversa).</p>
      <div class="ses-f">Fundamento(s) del día
        <span class="sub">Uno técnico y uno táctico. Salen primero los ejercicios que los trabajan.</span>
        ${s.fundamentos.length ? `<div class="opts">${s.fundamentos.map(f => `<button class="chip sm" type="button" aria-pressed="true" data-unfund="${esc(f)}" aria-label="Quitar ${esc(f)}">${esc(f)} <span aria-hidden="true">×</span></button>`).join('')}</div>` : ''}
        <select id="ses-fund-add" aria-label="Añadir un fundamento del modelo"><option value="">+ Añadir un fundamento técnico o táctico…</option>${avail}</select>
        ${s.fundamento ? `<input type="text" data-f="fundamento" value="${esc(s.fundamento)}" placeholder="Otro (escríbelo si no está en la lista)" aria-label="Otro fundamento" autocapitalize="sentences" autocomplete="off" enterkeyhint="done">` : ''}
        <span class="ses-own"><input type="text" id="ses-fund-own" placeholder="¿No está? Escríbelo aquí" aria-label="Fundamento escrito a mano" autocapitalize="sentences" autocomplete="off" enterkeyhint="done" maxlength="80"><button class="btn" type="button" data-fund-own>Añadir</button></span>
        <span class="sub">Te vuelve a salir en «Tuyos» y lo ve la Dirección Técnica.</span>
      </div>
      <div class="ses-f">Fase de juego priorizada<div class="opts"><button class="chip" type="button" data-fase-s="ataque" aria-pressed="${s.fase === 'ataque'}">Ataque</button><button class="chip" type="button" data-fase-s="defensa" aria-pressed="${s.fase === 'defensa'}">Defensa</button></div></div>
      <p class="sub">Los cinco son opcionales: rellena los que te sirvan.</p>
      <div class="ses-fields">${SES_OBJ.map(([k, l]) => fieldHTML('obj.' + k, l, O[k], 2)).join('')}</div>
    </section>`;
  } else if (step <= nB(s)) body = bloqueHTML(step - 1) + (isTec(s) && step === nB(s) ? '<div class="actions"><button class="btn" type="button" data-addb>+ Añadir otro ejercicio</button></div>' : '');
  else body = `<section class="ses-sec">${fieldHTML('reflexion', 'Reflexión y recuperación (valoración · estiramientos, hidratación, vuelta a la calma)', s.reflexion, 3)}</section>
    <section class="ses-sec"><h3>Resumen</h3><p class="sub"><b>${esc(s.equipo || 'Sin equipo')}</b> · ${esc(fmtDate(s.fecha))} · <output id="ses-total">${sesTotal(s)} min</output>${fundamentoText(s) ? ' · ' + esc(fundamentoText(s)) : ''}</p>
      <div class="ses-rows mini">${s.bloques.map((b, i) => `<button class="ses-row ses-jump" type="button" data-step="${i + 1}"><span class="ses-thumb">${b.task ? diagramSVG(b.task.diagram, taskLabel(b.task)) : '<span class="ses-empty">Sin ejercicio</span>'}</span><span class="ses-bn">${isTec(s) ? esc(blk(s, i).n) : (i + 1) + ' · ' + esc(SES_BLOQUES[i].n)}${b.min ? ' · ' + esc(b.min) + ' min' : ''}</span><span>${esc(taskLabel(b.task) || '—')}</span></button>`).join('')}</div>
      <div class="actions"><button class="btn primary" type="button" id="ses-finish">Guardar sesión</button><button class="btn" type="button" id="ses-pista">Empezar entrenamiento</button><button class="btn" type="button" id="ses-pdf">Descargar PDF</button><button class="btn" type="button" id="ses-view">Ver ficha</button></div>
    </section>`;
  sesWrap.innerHTML = `<div class="ed-bar ses-bar"><h2>${isNew ? 'Nueva sesión' : 'Editar sesión'}${isTec(s) ? ' de tecnificación' : ''}${s.equipo ? ' · ' + esc(s.equipo) : ''}</h2>
      <div class="actions"><span class="ses-auto" id="ses-auto" aria-live="polite">${sessions.some(x => x.id === s.id) ? 'Guardada ✓' : 'Se guarda sola mientras la preparas'}</span><button class="btn primary" type="button" id="ses-save">${sesComplete(s) ? 'Guardar' : 'Guardar a medias'}</button><button class="btn ghost" type="button" id="ses-close">Cerrar</button></div></div>
    <p class="paso-de">Paso ${step + 1} de ${sesSteps(s).length}</p>
    <nav class="stepper" aria-label="Pasos de la sesión">${sesSteps(s).map((n, k) => `<button type="button" class="step${k === step ? ' on' : ''}${stepDone(s, k) ? ' done' : ''}" data-step="${k}"${k === step ? ' aria-current="step"' : ''}><span class="step-n">${stepDone(s, k) && k !== step ? '✓' : k + 1}</span><span class="step-t">${esc(n)}</span></button>`).join('')}</nav>
    <p class="msg${msgCls ? ' ' + msgCls : ''}" id="ses-msg" aria-live="polite">${msgHtml || ''}</p>
    ${body}
    <div class="step-nav">${step > 0 ? `<button class="btn" type="button" data-step="${step - 1}">← Anterior</button>` : '<span></span>'}${step <= nB(s) ? `<button class="btn primary" type="button" data-step="${step + 1}">Siguiente: ${esc(sesSteps(s)[step + 1])} →</button>` : ''}</div>`;
  sesBox.scrollTop = 0;
  const cur = sesWrap.querySelector('.step.on'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  sesAutoSave();
}
// guardado automático de la sesión mientras se prepara (14 oct): a los 1,2 s del último cambio, y al cerrar o salir de la app
let sesAutoT = null;
const sesHasContent = s => !!(s.equipo || (s.fundamentos || []).length || s.fundamento || (s.bloques || []).some(b => b.task) || s.reflexion);
function sesAutoSave(now) {
  clearTimeout(sesAutoT); sesAutoT = null;
  if (!sesEd || sesEd.sig === JSON.stringify(sesEd.s) || !sesHasContent(sesEd.s)) return false;
  const go = () => {
    if (!sesEd || sesEd.sig === JSON.stringify(sesEd.s) || !sesHasContent(sesEd.s)) return false;
    const ok = commitSes(document.getElementById('ses-msg') || document.createElement('p'));
    const e = document.getElementById('ses-auto'); if (e) e.textContent = ok ? 'Guardada ✓' : 'No se ha podido guardar';
    const sv = document.getElementById('ses-save'); if (sv) sv.textContent = sesComplete(sesEd.s) ? 'Guardar' : 'Guardar a medias';
    return ok;
  };
  if (now) return go();
  const e = document.getElementById('ses-auto'); if (e) e.textContent = 'Guardando…';
  sesAutoT = setTimeout(go, 1200);
  return false;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sesAutoSave(true); });
window.addEventListener('pagehide', () => sesAutoSave(true));
function setPath(obj, path, val) { const k = path.split('.'); let o = obj; for (let i = 0; i < k.length - 1; i++) o = o[k[i] === 'b' ? 'bloques' : k[i]]; o[k[k.length - 1]] = val; }
sesWrap.addEventListener('change', e => {
  if (e.target.id === 'ses-fund-add' && e.target.value && sesEd) { sesEd.s.fundamentos.push(e.target.value); renderSesStep(); }
});
// fundamento escrito a mano: entra como uno más (chip); si ya existe en la lista del club, se usa el de la lista
function sesFundOwn() {
  const inp = document.getElementById('ses-fund-own'); if (!inp || !sesEd) return;
  const raw = inp.value.replace(/\s+/g, ' ').trim(); if (!raw) { inp.focus(); return; }
  const k = contKey(raw), s = sesEd.s;
  const ofi = [...TEC_ALL, ...FASE_NAMES.flatMap(f => FASES[f]), ...misCont().map(x => x.c)].find(c => contKey(c) === k);
  const c = ofi || raw.charAt(0).toUpperCase() + raw.slice(1);
  if (!s.fundamentos.some(x => contKey(x) === k)) s.fundamentos.push(c);
  renderSesStep(ofi && !contOficial(ofi) ? '' : ofi ? `«${esc(c)}» ya estaba en la lista del club: lo he puesto de ahí.` : '', 'ok');
  const n = document.getElementById('ses-fund-own'); if (n) n.focus();
}
sesWrap.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ses-fund-own') { e.preventDefault(); sesFundOwn(); } });
sesWrap.addEventListener('input', e => {
  const el = e.target.closest('[data-f]'); if (!el || !sesEd) return;
  setPath(sesEd.s, el.dataset.f, el.value); sesAutoSave();
  const tot = document.getElementById('ses-total'); if (tot && /\.min$/.test(el.dataset.f)) tot.textContent = sesTotal(sesEd.s) + ' min';
});
function commitSes(msgEl) {
  const s = sesEd.s; s.updated = today(); s.ts = Date.now();
  const i = sessions.findIndex(x => x.id === s.id);
  if (i >= 0) sessions[i] = clone(s); else sessions.push(clone(s));
  sesEd.isNew = false; sesEd.sig = JSON.stringify(sesEd.s);
  if (!saveSes()) { msgEl.className = 'msg err'; msgEl.textContent = 'Este navegador no deja guardar (¿modo privado?). Descarga el PDF para no perderla.'; return false; }
  if (sesComplete(s)) award('ses:' + s.id, PTS.sesion, 'Sesión completa: ' + (s.equipo || 'sin equipo') + ' · ' + fmtShort(s.fecha));
  return true;
}
sesWrap.addEventListener('toggle', e => {
  const d = e.target.closest && e.target.closest('[data-det]');
  if (d && sesEd) sesEd.det[d.dataset.det] = d.open;
}, true);
sesWrap.addEventListener('click', e => {
  if (!sesEd) return;
  const s = sesEd.s, msg = document.getElementById('ses-msg');
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.faseS) { s.fase = s.fase === b.dataset.faseS ? '' : b.dataset.faseS; sesWrap.querySelectorAll('[data-fase-s]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.faseS === s.fase))); sesAutoSave(); return; }
  if (b.dataset.pick !== undefined) { openPicker(+b.dataset.pick); return; }
  if (b.dataset.create !== undefined) { createForBloque(+b.dataset.create); return; }
  if (b.dataset.propose) { const t = mine.find(x => x.id === b.dataset.propose); if (t) proposeModal(t); return; }
  if (b.dataset.unpick !== undefined) { const i = +b.dataset.unpick; s.bloques[i].task = null; renderSesStep(); return; }
  if (b.dataset.step !== undefined) { sesEd.step = +b.dataset.step; renderSesStep(); return; }
  if (b.hasAttribute('data-addb')) { s.bloques.push(emptyB()); sesEd.step = nB(s); renderSesStep(); return; }
  if (b.dataset.delb !== undefined) { s.bloques.splice(+b.dataset.delb, 1); sesEd.step = Math.min(sesEd.step, nB(s)); renderSesStep(); return; }
  if (b.dataset.unfund) { s.fundamentos = s.fundamentos.filter(x => x !== b.dataset.unfund); renderSesStep(); return; }
  if (b.hasAttribute('data-fund-own')) { sesFundOwn(); return; }
  if (b.id === 'ses-finish') { if (commitSes(msg)) { closeSes(); navigate('sesiones'); } return; }
  if (b.id === 'ses-pista') { if (commitSes(msg)) { const saved = sessions.find(x => x.id === s.id); closeSes(); navigate('sesiones'); openPista(saved); } return; }
  if (b.id === 'ses-close') {
    const wasNew = sesEd.fresh;
    const failed = sesEd.sig !== JSON.stringify(s) && sesHasContent(s) && !sesAutoSave(true);
    closeSes();
    if (failed) { toast('Este navegador no deja guardar: no se ha guardado la sesión.'); return; }
    if (wasNew && sessions.some(x => x.id === s.id)) { navigate('sesiones'); toast(sesComplete(s) ? 'Sesión guardada.' : 'Guardada a medias: la sigues desde Sesiones.'); }
    return;
  }
  if (b.id === 'ses-save') { if (commitSes(msg)) { renderSesStep(sesComplete(s) ? 'Sesión guardada.' : 'Guardada a medias. Puedes cerrar y seguir otro día: está en Sesiones.', 'ok'); } return; }
  if (b.id === 'ses-pdf') { commitSes(msg); downloadSes(s, msg); return; }
  if (b.id === 'ses-view') { openSheet(s); return; }
});
function closeSes() { clearTimeout(sesAutoT); sesAutoT = null; sesBox.hidden = true; document.body.style.overflow = ''; sesEd = null; }

// --- elegir ejercicio ---
const picker = document.getElementById('picker');
let pick = null;
function openPicker(i) {
  pick = { i, onlyTipo: true, src: 'banco', q: '', fund: '' };
  picker.hidden = false; drawPicker();
  const q = picker.querySelector('#pk-q'); if (q) q.focus();
}
function drawPicker() {
  const B = blk(sesEd.s, pick.i);
  const pool = pick.src === 'banco' ? bank.tasks : mine;
  const q = pick.q.trim().toLowerCase();
  const fund = new Set((sesEd && sesEd.s.fundamentos) || []);
  const fk = new Set([...fund].map(contKey));
  const hits = t => worksOf(t).filter(c => fk.has(contKey(c)));
  if (pick.fund && !fund.has(pick.fund)) pick.fund = '';
  const items = pool.filter(t => (!pick.onlyTipo || t.tipo === B.tipo) && (!pick.fund || worksOf(t).some(c => contKey(c) === contKey(pick.fund))) && (!q || String(t.num || '').includes(q) || (t.title || '').toLowerCase().includes(q) || worksOf(t).some(c => c.toLowerCase().includes(q))))
    .sort((a, b) => hits(b).length - hits(a).length);
  const funds = [...fund];
  const vacio = pick.fund && !contOficial(pick.fund)
    ? `Ningún ejercicio está marcado con «${esc(pick.fund)}»: lo escribiste a mano. Cuando la Dirección Técnica lo pase a la lista del club, se podrá marcar en los ejercicios.`
    : `No hay ejercicios con este filtro.${pick.fund ? ' Prueba con «Cualquiera».' : ''}${pick.onlyTipo ? ' Prueba a quitar «Solo ' + esc(tipoName(B.tipo).toLowerCase()) + '».' : ''}`;
  picker.innerHTML = `<div class="pk-wrap">
    <div class="ed-bar"><h2>${esc(B.head)}</h2><div class="actions"><button class="btn primary" type="button" id="pk-create">+ Crear un ejercicio nuevo</button><button class="btn ghost" type="button" id="pk-close">Cancelar</button></div></div>
    <div class="fsel">
      <div class="opts"><button class="chip sm" type="button" data-pk-src="banco" aria-pressed="${pick.src === 'banco'}">Banco del club</button><button class="chip sm" type="button" data-pk-src="mias" aria-pressed="${pick.src === 'mias'}">Mis ejercicios</button></div>
      <button class="chip sm" type="button" id="pk-tipo" aria-pressed="${pick.onlyTipo}">Solo ${esc(tipoName(B.tipo).toLowerCase())}</button>
      <input class="search" id="pk-q" type="search" placeholder="Buscar" aria-label="Buscar ejercicio" value="${esc(pick.q)}">
    </div>
    ${funds.length ? `<div class="pk-fund" role="group" aria-label="Que trabaje un fundamento del día"><span class="sub">Que trabaje:</span><button class="chip sm" type="button" data-pk-fund="" aria-pressed="${!pick.fund}">Cualquiera</button>${funds.map(f => `<button class="chip sm" type="button" data-pk-fund="${esc(f)}" aria-pressed="${pick.fund === f}">${esc(f)}</button>`).join('')}</div>` : ''}
    <p class="sub pk-n" aria-live="polite">${items.length} ${items.length === 1 ? 'ejercicio' : 'ejercicios'}</p>
    <div class="pk-grid">${items.length ? items.map(t => `<button class="pk-item" type="button" data-pk="${t.id}">
      ${diagramSVG(t.diagram || {}, taskLabel(t))}${hits(t).length ? `<span class="match">Trabaja: ${esc(hits(t).join(', '))}</span>` : ''}<b>${esc(taskLabel(t))}</b><span class="src">${esc(tipoName(t.tipo) || 'Sin clasificar')}${(t.fases || []).length ? ' · ' + esc(t.fases.map(faseTxt).join(', ')) : ''}</span></button>`).join('')
      : `<div class="empty">${vacio}</div>`}</div>
  </div>`;
}
picker.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !pick) return;
  if (b.id === 'pk-close') { picker.hidden = true; pick = null; return; }
  if (b.id === 'pk-create') { createForBloque(pick.i); return; }
  if (b.id === 'pk-tipo') { pick.onlyTipo = !pick.onlyTipo; drawPicker(); return; }
  if (b.dataset.pkSrc) { pick.src = b.dataset.pkSrc; drawPicker(); return; }
  if (b.dataset.pkFund !== undefined) { pick.fund = pick.fund === b.dataset.pkFund ? '' : b.dataset.pkFund; drawPicker(); return; }
  if (b.dataset.pk) {
    const t = (pick.src === 'banco' ? bank.tasks : mine).find(x => x.id === b.dataset.pk); if (!t) return;
    const i = pick.i; prefill(sesEd.s.bloques[i], t);
    picker.hidden = true; pick = null;
    renderSesStep();
  }
});
picker.addEventListener('input', e => { if (e.target.id === 'pk-q' && pick) { pick.q = e.target.value; const pos = e.target.selectionStart; drawPicker(); const q = picker.querySelector('#pk-q'); q.focus(); q.setSelectionRange(pos, pos); } });

// --- crear un ejercicio nuevo desde la sesión ---
function createForBloque(i) {
  picker.hidden = true; pick = null;
  sesBox.hidden = true;
  const B = blk(sesEd.s, i);
  openEditor({ id: 'mine-' + uid(), source: 'mine', title: '', bloque: '', rules: [], notes: '', tipo: B.tipo, fases: [], contenidos: [],
    author: (sesEd && sesEd.s.entrenador) || readAuthor(), diagram: { items: [], arrows: [] } }, 'mine-new',
    { fromSes: i, title: `Ejercicio nuevo · ${B.head}` });
}
function backToSes(i, t, inBank) {
  if (!sesEd) return;
  prefill(sesEd.s.bloques[i], t);
  sesBox.hidden = false; document.body.style.overflow = 'hidden';
  sesEd.step = i + 1;
  renderSesStep(inBank
    ? `Ejercicio guardado en el banco y puesto en ${isTec(sesEd.s) ? 'el ejercicio ' + (i + 1) : 'el bloque ' + (i + 1)}.`
    : `Ejercicio guardado en «Mis ejercicios» y puesto en ${isTec(sesEd.s) ? 'el ejercicio ' + (i + 1) : 'el bloque ' + (i + 1)}. ${window.SMB_CLOUD ? 'Lo ve el cuerpo técnico y la Dirección Técnica puede meterlo en el banco.' : `Para que entre en el banco del club, mándaselo a la Dirección Técnica: <button class="btn small" type="button" data-propose="${esc(t.id)}">Enviar a la Dirección Técnica</button>`}`, 'ok');
}

// --- ver ficha en la página ---
function openSheet(s) {
  const v = document.createElement('div');
  v.className = 'sheet'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Ficha de sesión');
  const O = s.obj, val = x => x ? esc(x) : '<span class="dash">—</span>';
  v.innerHTML = `<div class="sheet-bar"><button class="btn" type="button" data-close>Cerrar</button></div>
  <div class="paper">
    <header class="p-head"><img src="${LOGO}" alt="Escudo del CHP Santa María la Blanca" width="64" height="64"><div><div class="p-eyebrow">CHP Santa María la Blanca · Dirección Técnica</div><h2>${isTec(s) ? 'Sesión de tecnificación' : 'Ficha de sesión'}</h2><div>${esc(s.equipo || 'Sin equipo')} · ${esc(fmtDate(s.fecha))}</div></div></header>
    <table class="p-data"><tr><th>Equipo / categoría</th><th>Fecha</th><th>Microciclo</th><th>Entrenador</th><th>Tiempo</th></tr>
      <tr><td>${val(s.equipo)}</td><td>${val(s.fecha ? s.fecha.split('-').reverse().join('/') : '')}</td><td>${val(s.micro)}</td><td>${val(s.entrenador)}</td><td>${sesTotal(s) ? sesTotal(s) + ' min' : val('')}</td></tr></table>
    <section class="p-sec"><h3>Objetivos de la sesión</h3>
      <dl class="p-dl"><dt>Fundamento(s) del día</dt><dd>${val(fundamentoText(s))}</dd><dt>Fase priorizada</dt><dd>${s.fase === 'ataque' ? '☒ Ataque ☐ Defensa' : s.fase === 'defensa' ? '☐ Ataque ☒ Defensa' : '☐ Ataque ☐ Defensa'}</dd>
      ${SES_OBJ.map(([k, l]) => `<dt>${esc(l.replace('Objetivo ', '').replace(/^./, c => c.toUpperCase()))}</dt><dd>${val(O[k])}</dd>`).join('')}</dl></section>
    ${s.bloques.map((b, i) => `<section class="p-sec p-b"><h3 class="p-bar"><span>${esc(blk(s, i).head)}</span><span>${b.min ? esc(b.min) + ' min' : ''}</span></h3><p class="p-sub">${esc(blk(s, i).d)}</p>
      <p class="p-task"><b>${esc(taskLabel(b.task) || 'Sin ejercicio elegido')}</b>${b.task ? ` <span>${esc(taskSource(b.task))}</span>` : ''}</p>
      ${b.task ? `<div class="p-fig">${diagramSVG(b.task.diagram, taskLabel(b.task))}</div>` : ''}
      <dl class="p-dl">${SES_FIELDS.map(([k, l]) => `<dt>${esc(l)}</dt><dd>${val(b[k])}</dd>`).join('')}</dl></section>`).join('')}
    <section class="p-sec"><h3>Reflexión y recuperación</h3><p class="p-pre">${val(s.reflexion)}</p></section>
    ${pistaRegHTML(s)}
    <footer class="p-foot">SMB · Ficha de sesión · Hockey sobre patines</footer>
  </div>`;
  const close = () => { v.remove(); if (sesBox.hidden && editor.hidden) document.body.style.overflow = ''; document.removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape') close(); };
  v.querySelector('[data-close]').onclick = close;
  document.addEventListener('keydown', k);
  document.body.appendChild(v); document.body.style.overflow = 'hidden';
  v.querySelector('[data-close]').focus();
}

// --- PDF ---
let jsPdfLoading = null;
function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPdfLoading) return jsPdfLoading;
  const srcs = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'];
  const tryLoad = i => new Promise((res, rej) => {
    if (i >= srcs.length) return rej(new Error('no-lib'));
    const sc = document.createElement('script'); sc.src = srcs[i];
    sc.onload = () => window.jspdf && window.jspdf.jsPDF ? res(window.jspdf.jsPDF) : tryLoad(i + 1).then(res, rej);
    sc.onerror = () => tryLoad(i + 1).then(res, rej);
    document.head.appendChild(sc);
  });
  jsPdfLoading = tryLoad(0).catch(e => { jsPdfLoading = null; throw e; });
  return jsPdfLoading;
}
function resolvedSVG(dg) {
  const cs = getComputedStyle(document.documentElement);
  return diagramSVG(dg, '').replace('<svg ', '<svg width="1400" height="714" ').replace(/var\((--[a-z0-9-]+)\)/g, (_, n) => cs.getPropertyValue(n).trim() || '#000');
}
function svgToJpeg(dg) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 1400; c.height = 714;
      const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      try { res(c.toDataURL('image/jpeg', 0.9)); } catch (e) { rej(e); }
    };
    img.onerror = () => rej(new Error('img'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(resolvedSVG(dg));
  });
}
const pdfTxt = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/→/g, '->').replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, '');
async function sesPDF(s) {
  const jsPDF = await loadJsPDF();
  const imgs = await Promise.all(s.bloques.map(b => b.task ? svgToJpeg(b.task.diagram).catch(() => null) : null));
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ACC = [104, 24, 37], MUT = [107, 97, 99], INK = [34, 28, 29], LN = [226, 216, 217], SOFT = [242, 229, 231];
  const M = 12, W = 186, BOTTOM = 283;
  let y = M;
  const color = c => doc.setTextColor(c[0], c[1], c[2]);
  const font = (st, sz) => { doc.setFont('helvetica', st); doc.setFontSize(sz); };
  const ensure = h => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
  const lines = (t, w) => doc.splitTextToSize(pdfTxt(t), w);
  function field(label, value, x, w, opts = {}) {
    // etiqueta + texto; corta de página línea a línea si hace falta
    font('bold', 7.5); color(ACC); ensure(9); doc.text(pdfTxt(label.toUpperCase()), x, y + 3); y += 4.6;
    font('normal', 9.5); color(value ? INK : MUT);
    const ls = value ? lines(value, w) : ['-'];
    ls.forEach(l => { ensure(4.4); doc.text(l, x, y + 3.2); y += 4.3; });
    y += opts.gap ?? 2.2;
  }
  // cabecera
  try { doc.addImage(LOGO, 'JPEG', M, y, 17, 17); } catch (e) {}
  font('normal', 7.5); color(MUT); doc.text(pdfTxt('CHP SANTA MARÍA LA BLANCA · DIRECCIÓN TÉCNICA'), M + 21, y + 4);
  font('bold', 19); color(ACC); doc.text(pdfTxt(isTec(s) ? 'Sesión de tecnificación' : 'Ficha de sesión'), M + 21, y + 11.5);
  font('normal', 10); color(INK); doc.text(pdfTxt(`${s.equipo || 'Sin equipo'} · ${fmtDate(s.fecha)}`), M + 21, y + 16.5);
  y += 21; doc.setDrawColor(ACC[0], ACC[1], ACC[2]); doc.setLineWidth(0.8); doc.line(M, y, M + W, y); y += 4;
  // datos
  const cols = [['Equipo / categoría', s.equipo, 46], ['Fecha', s.fecha ? s.fecha.split('-').reverse().join('/') : '', 26], ['Microciclo', s.micro, 38], ['Entrenador', s.entrenador, 52], ['Tiempo', sesTotal(s) ? sesTotal(s) + ' min' : '', 24]];
  let x = M; doc.setDrawColor(LN[0], LN[1], LN[2]); doc.setLineWidth(0.3);
  cols.forEach(([l, v, w]) => {
    doc.rect(x, y, w, 12);
    font('bold', 7); color(MUT); doc.text(pdfTxt(l.toUpperCase()), x + 2, y + 4);
    font('normal', 9.5); color(INK); doc.text(lines(v || '-', w - 4)[0] || '-', x + 2, y + 9.5);
    x += w;
  });
  y += 17;
  // objetivos
  const bar = (title, right) => {
    ensure(16); doc.setFillColor(ACC[0], ACC[1], ACC[2]); doc.rect(M, y, W, 7.5, 'F');
    font('bold', 10); doc.setTextColor(255, 255, 255); doc.text(pdfTxt(title.toUpperCase()), M + 2.5, y + 5.2);
    if (right) doc.text(pdfTxt(right), M + W - 2.5, y + 5.2, { align: 'right' });
    y += 10;
  };
  bar('Objetivos de la sesión');
  field('Fundamento(s) del día', fundamentoText(s), M, W);
  font('bold', 7.5); color(ACC); doc.text('FASE DE JUEGO PRIORIZADA', M, y + 3); y += 4.6;
  font('normal', 9.5); color(INK);
  [['ataque', 'Ataque', M], ['defensa', 'Defensa', M + 32]].forEach(([k, l, bx]) => { doc.rect(bx, y + 0.4, 3.4, 3.4); if (s.fase === k) { doc.setLineWidth(0.5); doc.line(bx + 0.6, y + 1, bx + 2.8, y + 3.2); doc.line(bx + 2.8, y + 1, bx + 0.6, y + 3.2); doc.setLineWidth(0.3); } doc.text(l, bx + 5, y + 3.3); });
  y += 7;
  const half = (W - 6) / 2;
  for (let i = 0; i < 4; i += 2) {
    const y0 = y; field(SES_OBJ[i][1], s.obj[SES_OBJ[i][0]], M, half); const y1 = y;
    y = y0; field(SES_OBJ[i + 1][1], s.obj[SES_OBJ[i + 1][0]], M + half + 6, half); y = Math.max(y, y1);
  }
  field(SES_OBJ[4][1], s.obj.sec, M, W, { gap: 4 });
  // estructura
  bar('Estructura de la sesión');
  s.bloques.forEach((b, i) => {
    ensure(6); font('bold', 9.5); color(INK); doc.text(pdfTxt(isTec(s) ? blk(s, i).n : `${i + 1} · ${SES_BLOQUES[i].n}`), M, y + 3.2);
    font('normal', 9.5); color(MUT); doc.text(b.min ? `${b.min} min` : '-', M + 44, y + 3.2);
    color(INK); doc.text(lines(taskLabel(b.task) || 'Sin ejercicio elegido', W - 62)[0], M + 62, y + 3.2); y += 5.4;
  });
  y += 3;
  // bloques
  s.bloques.forEach((b, i) => {
    if (y > M + 2 && y + 95 > BOTTOM) { doc.addPage(); y = M; }
    bar(blk(s, i).head, b.min ? `${b.min} min` : '');
    font('italic', 8.5); color(MUT); doc.text(pdfTxt(blk(s, i).d), M, y); y += 5;
    font('bold', 11); color(INK); doc.text(lines(taskLabel(b.task) || 'Sin ejercicio elegido', W)[0], M, y + 1); y += 4.5;
    if (b.task) { font('normal', 7.5); color(MUT); doc.text(pdfTxt(taskSource(b.task)), M, y + 1); y += 4; }
    const top = y + 1;
    if (imgs[i]) {
      const iw = 112, ih = iw * 714 / 1400;
      doc.addImage(imgs[i], 'JPEG', M, top, iw, ih); doc.setDrawColor(LN[0], LN[1], LN[2]); doc.rect(M, top, iw, ih);
      y = top; const rx = M + iw + 5, rw = W - iw - 5;
      field('Organización y espacio', b.org, rx, rw); field('Finalidad', b.fin, rx, rw);
      y = Math.max(y, top + ih + 4);
    } else { field('Organización y espacio', b.org, M, W); field('Finalidad', b.fin, M, W); }
    field('Descripción y reglas', b.desc, M, W);
    field('Variantes / progresiones', b.var, M, W);
    field('Claves de enseñanza / corrección', b.claves, M, W);
    field('Trabajo del portero', b.portero, M, W, { gap: 5 });
  });
  bar('Reflexión y recuperación');
  field('Valoración · estiramientos, hidratación, vuelta a la calma', s.reflexion, M, W);
  // pie
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p); doc.setDrawColor(LN[0], LN[1], LN[2]); doc.setLineWidth(0.3); doc.line(M, 287, M + W, 287);
    font('normal', 7.5); color(MUT); doc.text(pdfTxt('SMB · Ficha de sesión · Hockey sobre patines'), M, 291); doc.text(`Página ${p} de ${n}`, M + W, 291, { align: 'right' });
  }
  return doc.output('blob');
}
async function downloadSes(s, msgEl) {
  const show = (cls, t) => { if (msgEl) { msgEl.className = 'msg ' + cls; msgEl.textContent = t; } };
  if (!downloadsApi) { show('err', 'Desde esta vista no se puede descargar el PDF. Usa «Ver ficha» o abre el banco en otro navegador.'); return; }
  show('', 'Preparando el PDF…');
  let blob;
  try { blob = await sesPDF(s); } catch (e) { show('err', 'No se ha podido preparar el PDF (no carga la herramienta de PDF). Prueba otra vez con conexión.'); return; }
  const name = `Sesion ${s.equipo || 'SMB'} ${s.fecha || ''}`.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() + '.pdf';
  try { await downloadsApi.save({ filename: name, data: blob }); show('ok', 'PDF descargado.'); }
  catch (e) {
    const c = e && e.code;
    if (c === 'declined') show('', '');
    else if (c === 'rate_limited') show('err', 'Ya hay una descarga pendiente. Espera un momento y vuelve a probar.');
    else show('err', 'Desde esta vista no se puede descargar el PDF. Usa «Ver ficha».');
  }
}
if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(d => { downloadsApi = d; }).catch(() => {});


// --- modo pista: la sesión en la pista, un bloque por pantalla ---
// Pensado para el móvil o la tableta en la valla: reloj grande con aviso, «Parar la tarea» con las preguntas en grande,
// el gráfico a pantalla completa para enseñarlo, apuntes y valoración al final. Si se cierra la app, sigue donde estaba.
let pista = null;
const LS_PISTA = 'smb-pista';
const fmtClock = ms => { const neg = ms < 0, t = Math.floor(Math.abs(ms) / 1000); return (neg ? '+' : '') + String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
function timerNow(tm) { return tm.elapsed + (tm.start ? Date.now() - tm.start : 0); }
const pistaQs = b => (b.claves || '').replace(/^Preguntas para parar la tarea:\s*/, '').split('\n').map(x => x.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
let pistaAudio = null;
function pistaBeep(n, long) {
  try {
    pistaAudio = pistaAudio || new (window.AudioContext || window.webkitAudioContext)();
    const A = pistaAudio; if (A.state === 'suspended') A.resume();
    for (let k = 0; k < n; k++) { const o = A.createOscillator(), g = A.createGain(), t = A.currentTime + k * 0.35; o.frequency.value = 880; o.connect(g); g.connect(A.destination); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (long ? 0.3 : 0.15)); o.start(t); o.stop(t + 0.32); }
  } catch (e) {}
  if (n) try { navigator.vibrate && navigator.vibrate(long ? [300, 150, 300, 150, 300] : [200]); } catch (e) {}
}
function pistaSave() {
  if (!pista) return;
  const { s, i, timers, stops, notas, val } = pista;
  try { localStorage.setItem(LS_PISTA, JSON.stringify({ sid: s.id, day: isoToday(), i, timers, stops, notas, val })); } catch (e) {}
}
function pistaLoad(s) { try { const x = JSON.parse(localStorage.getItem(LS_PISTA) || 'null'); return x && x.sid === s.id && x.day === isoToday() ? x : null; } catch (e) { return null; } }
const pistaClear = () => { try { localStorage.removeItem(LS_PISTA); } catch (e) {} };
const pistaWake = () => { try { if (pista && navigator.wakeLock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then(w => { if (pista) pista.wake = w; }).catch(() => {}); } catch (e) {} };
function openPista(s) {
  if (!s) return;
  const el = document.createElement('div');
  el.className = 'pista'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Entrenamiento en pista');
  const N = s.bloques.length, prev = pistaLoad(s);
  pista = { s, i: 0, el, wake: null, iv: null, buzzed: {}, warned: {}, stopAt: null, big: false,
    timers: s.bloques.map(b => ({ total: (parseInt(b.min, 10) || 0) * 60000, elapsed: 0, start: null })),
    stops: s.bloques.map(() => ({ n: 0, ms: 0 })), notas: s.bloques.map(() => ''), val: { como: '', fund: '', obs: '', nota: '' } };
  if (prev && Array.isArray(prev.timers) && prev.timers.length === N) { Object.assign(pista, { i: prev.i || 0, timers: prev.timers, stops: prev.stops || pista.stops, notas: prev.notas || pista.notas, val: Object.assign(pista.val, prev.val || {}) }); pista.resumed = true; pista.timers.forEach((tm, k) => { if (tm.total && timerNow(tm) >= tm.total) pista.buzzed[k] = pista.warned[k] = true; }); }
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  pistaWake(); document.addEventListener('visibilitychange', pistaWake);
  pista.iv = setInterval(tickPista, 250);
  if (pista.resumed && pista.timers.some(tm => timerNow(tm) > 0)) toast(`Sigues donde lo dejaste: ${fmtClock(sesSpent()).replace('+', '')} de entreno.`);
  el.addEventListener('click', onPistaClick);
  el.addEventListener('input', e => { const t = e.target; if (!pista) return; if (t.dataset.pnote !== undefined) pista.notas[+t.dataset.pnote] = t.value; else if (t.id === 'p-vnota') pista.val.nota = t.value; else if (t.id === 'p-vobs') pista.val.obs = t.value; else return; pistaSave(); });
  let sx = null, sy = null;
  el.addEventListener('pointerdown', e => { if (e.target.closest('button, summary, a, textarea, input, .pz-big, .pz-stopov')) return; sx = e.clientX; sy = e.clientY; });
  el.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 70 && Math.abs(dy) < 50) goPista(pista.i + (dx < 0 ? 1 : -1)); });
  document.addEventListener('keydown', pistaKeys);
  drawPista();
}
function closePista(keep) {
  if (!pista) return;
  if (keep) pistaSave(); else pistaClear();
  clearInterval(pista.iv); try { if (pista.wake) pista.wake.release(); } catch (e) {}
  document.removeEventListener('visibilitychange', pistaWake);
  pista.el.remove(); document.removeEventListener('keydown', pistaKeys); pista = null;
  if (editor.hidden && sesBox.hidden && detail.hidden) document.body.style.overflow = '';
}
function pistaKeys(e) {
  if (!pista || !modal.hidden || /TEXTAREA|INPUT/.test((document.activeElement || {}).tagName || '')) return;
  if (pista.big || pista.stopAt) { if (e.key === 'Escape') { if (pista.stopAt) endStop(); else { pista.big = false; drawPista(); } } return; }
  if (e.key === 'ArrowRight') goPista(pista.i + 1); else if (e.key === 'ArrowLeft') goPista(pista.i - 1); else if (e.key === 'Escape') closePista(true);
  else if (e.key === ' ' && pista.i >= 1 && pista.i <= nB(pista.s)) { e.preventDefault(); toggleTimer(); }
}
function goPista(i) { if (!pista) return; const n = Math.max(0, Math.min(nB(pista.s) + 1, i)); if (n !== pista.i) { pista.i = n; pista.big = false; pistaSave(); drawPista(); pista.el.querySelector('.pista-body').scrollTop = 0; } }
const sesSpent = () => pista.timers.reduce((a, tm) => a + timerNow(tm), 0);
const sesLeftTxt = () => { const plan = sesTotal(pista.s) * 60000; return plan ? fmtClock(plan - sesSpent()) : fmtClock(sesSpent()).replace('+', ''); };
function tickPista() {
  if (!pista) return;
  const clk = pista.el.querySelector('#p-ses'); if (clk) { clk.textContent = sesLeftTxt(); clk.classList.toggle('over', sesTotal(pista.s) * 60000 - sesSpent() < 0); }
  const so = pista.el.querySelector('#p-stopt'); if (so && pista.stopAt) so.textContent = fmtClock(Date.now() - pista.stopAt);
  // avisos de todos los bloques, aunque estés mirando otro
  pista.timers.forEach((tm, k) => {
    if (!tm.total || !tm.start) return;
    const left = tm.total - timerNow(tm);
    if (left <= 60000 && left > 0 && !pista.warned[k] && tm.total > 120000) { pista.warned[k] = true; pistaBeep(1); }
    if (left <= 0 && !pista.buzzed[k]) { pista.buzzed[k] = true; pista.warned[k] = true; pistaBeep(3, true); if (pista.i === k + 1) drawPista(); }
  });
  if (pista.i < 1 || pista.i > nB(pista.s)) return;
  const k = pista.i - 1, tm = pista.timers[k], out = pista.el.querySelector('#p-time'); if (!out) return;
  const t = timerNow(tm), left = tm.total ? tm.total - t : t;
  out.textContent = fmtClock(left);
  out.classList.toggle('over', !!tm.total && left < 0);
  out.classList.toggle('soon', !!tm.total && left >= 0 && left <= 60000);
  const bar = pista.el.querySelector('#p-bar'); if (bar && tm.total) bar.style.width = Math.min(100, t / tm.total * 100) + '%';
}
function toggleTimer() {
  const tm = pista.timers[pista.i - 1];
  if (tm.start) { tm.elapsed += Date.now() - tm.start; tm.start = null; } else { tm.start = Date.now(); pistaBeep(0); }
  pistaSave(); drawPista();
}
function endStop() {
  if (!pista || !pista.stopAt) return;
  const st = pista.stops[pista.i - 1]; st.n++; st.ms += Date.now() - pista.stopAt; pista.stopAt = null; pistaSave(); drawPista();
}
function drawPista() {
  const { s, i } = pista, NB = nB(s), total = NB + 2;
  const dots = Array.from({ length: total }, (_, k) => `<span class="dot${k === i ? ' on' : ''}${k >= 1 && k <= NB && pista.timers[k - 1] && timerNow(pista.timers[k - 1]) ? ' done' : ''}"></span>`).join('');
  const txt = v => v ? `<p class="pre">${esc(v)}</p>` : '<p class="sub">—</p>';
  const plan = sesTotal(s);
  let top = '', body = '', next = '';
  if (i === 0) {
    top = 'Antes de empezar';
    const anyTime = pista.timers.some(tm => timerNow(tm) > 0);
    body = `<div class="pista-intro">
      ${pista.resumed && anyTime ? `<p class="pz-resume">Sigues donde lo dejaste: llevas ${esc(fmtClock(sesSpent()))} de entreno.</p>` : ''}
      <h2>${esc(s.equipo || 'Sesión')}</h2><p class="sub">${esc(fmtDate(s.fecha))}${plan ? ' · ' + plan + ' min' : ''}</p>
      ${fundamentoText(s) ? `<p class="p-big"><b>Fundamento del día:</b> ${esc(fundamentoText(s))}</p>` : ''}
      ${s.fase ? `<p class="pz-line"><b>Fase priorizada:</b> ${s.fase === 'ataque' ? 'Ataque' : 'Defensa'}</p>` : ''}
      ${SES_OBJ.some(([k]) => s.obj[k]) ? `<dl class="p-dl">${SES_OBJ.filter(([k]) => s.obj[k]).map(([k, l]) => `<dt>${esc(l)}</dt><dd>${esc(s.obj[k])}</dd>`).join('')}</dl>` : ''}
      <ol class="pz-plan">${s.bloques.map((b, k) => `<li><button type="button" data-pgo="${k + 1}"><span class="pz-n">${k + 1}</span><span><b>${esc(blk(s, k).n)}${b.min ? ' · ' + esc(b.min) + ' min' : ''}</b><small>${esc(taskLabel(b.task) || 'sin ejercicio')}</small>${b.org ? `<small class="pz-org">${esc(b.org)}</small>` : ''}</span>${timerNow(pista.timers[k]) ? '<span class="pz-ok" aria-label="Empezado">✓</span>' : ''}</button></li>`).join('')}</ol>
      <p class="pz-id">Se juega como se entrena: postura, patinaje, técnica y modales.</p>
      <button class="btn primary big" type="button" data-pgo="${anyTime ? Math.min(NB, Math.max(1, pista.i || 1)) : 1}">${anyTime ? 'Seguir' : 'Empezar'}: ${esc(blk(s, 0).n)} →</button></div>`;
    next = `Después: ${blk(s, 0).n}`;
  } else if (i <= NB) {
    const k = i - 1, b = s.bloques[k], tm = pista.timers[k], run = !!tm.start, qs = pistaQs(b), st = pista.stops[k], t = timerNow(tm);
    top = isTec(s) ? `Ejercicio ${i} de ${NB}` : `${i} de ${NB} · ${SES_BLOQUES[k].n}`;
    const left = tm.total ? tm.total - t : t;
    body = `<h2>${esc(taskLabel(b.task) || 'Sin ejercicio elegido')}</h2>
      <div class="pista-main">
        <div class="pista-fig">${b.task ? `<button class="pz-figbtn" type="button" data-pbig aria-label="Ver el gráfico a pantalla completa">${diagramSVG(b.task.diagram, taskLabel(b.task))}<span class="pz-zoom">Ver en grande</span></button>` : '<div class="ses-empty">Sin gráfico</div>'}
          <div class="pista-timer${run ? ' run' : ''}">
            <div class="pz-clock"><output id="p-time" class="${tm.total && left < 0 ? 'over' : tm.total && left <= 60000 ? 'soon' : ''}" aria-live="off">${fmtClock(left)}</output><small>${tm.total ? (left < 0 ? 'te estás pasando' : 'quedan de ' + b.min + ' min') : 'cronómetro'}</small></div>
            ${tm.total ? `<div class="pz-bar"><i id="p-bar" style="width:${Math.min(100, t / tm.total * 100)}%"></i></div>` : ''}
            <div class="pz-tbtns"><button class="btn primary big" type="button" data-ptimer="run">${run ? 'Pausa' : (t ? 'Seguir' : 'Empezar')}</button><button class="btn" type="button" data-ptimer="reset"${t ? '' : ' disabled'}>Reiniciar</button></div>
          </div>
          <div class="pz-stopline"><button class="btn big pz-stopbtn" type="button" data-pstop>Parar la tarea</button><span class="sub">${st.n ? `${st.n} ${st.n === 1 ? 'parada' : 'paradas'} · ${fmtClock(st.ms)} parados` : 'Para, pregunta y vuelve a jugar.'}</span></div>
        </div>
        <div class="pista-text">
          ${qs.length ? `<section class="pq"><h3>Preguntas para parar la tarea</h3><ul class="pz-qs">${qs.map(q => `<li>${esc(q)}</li>`).join('')}</ul></section>` : ''}
          <details open><summary>Finalidad</summary>${txt(b.fin)}</details>
          <details><summary>Normas</summary>${txt(b.desc)}</details>
          <details><summary>Más fácil · más difícil</summary>${txt(b.var)}</details>
          <details><summary>Organización y portero</summary>${txt(b.org)}${b.portero ? txt('Portero: ' + b.portero) : ''}</details>
          <details${pista.notas[k] ? ' open' : ''}><summary>Apunte de este bloque</summary><textarea class="pz-note" data-pnote="${k}" rows="3" placeholder="Qué ha funcionado, qué cambiarías, quién ha destacado…">${esc(pista.notas[k] || '')}</textarea></details>
        </div>
      </div>
      ${pista.stopAt ? `<div class="pz-stopov" role="dialog" aria-modal="true" aria-label="Tarea parada"><div class="pz-stopin"><p class="pz-stopk">Tarea parada · <output id="p-stopt">${fmtClock(Date.now() - pista.stopAt)}</output></p>
        ${qs.length ? `<ul class="pz-bigqs">${qs.map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : `<p class="pz-bigqs">¿Qué has visto? ¿Qué podías haber hecho? ¿Por qué?</p>`}
        <p class="sub">Pregunta y espera la respuesta. No la des tú.</p><button class="btn primary big" type="button" data-pstopend>Volver a jugar</button></div></div>` : ''}
      ${pista.big && b.task ? `<div class="pz-big" role="dialog" aria-modal="true" aria-label="Gráfico a pantalla completa" data-pbigclose>${diagramSVG(b.task.diagram, taskLabel(b.task))}<button class="btn" type="button" data-pbigclose>Cerrar</button></div>` : ''}`;
    next = i < NB ? `Después: ${blk(s, i).n}${s.bloques[i].min ? ' · ' + s.bloques[i].min + ' min' : ''}` : 'Después: cierre';
  } else {
    top = 'Cierre';
    const V = pista.val, chip = (k, v, l) => `<button class="chip" type="button" data-pval="${k}" data-v="${v}" aria-pressed="${V[k] === v}">${l}</button>`;
    const nS = pista.stops.reduce((a, x) => a + x.n, 0), mS = pista.stops.reduce((a, x) => a + x.ms, 0);
    body = `<div class="pista-intro"><h2>Cierre</h2>
      <p class="sub">${esc(fmtClock(sesSpent()).replace('+', ''))} de entreno${plan ? ` (previstos ${plan} min)` : ''}${nS ? ` · ${nS} ${nS === 1 ? 'parada' : 'paradas'} para preguntar (${esc(fmtClock(mS))})` : ''}.</p>
      ${s.reflexion ? `<section class="pq"><h3>Reflexión con el equipo</h3>${txt(s.reflexion)}</section>` : ''}
      <p class="sub">Vuelta a la calma: estiramientos e hidratación.</p>
      <div class="pz-val"><b>¿Cómo ha ido?</b><div class="opts">${chip('como', 'bien', 'Bien')}${chip('como', 'regular', 'Regular')}${chip('como', 'mal', 'Mal')}</div></div>
      ${fundamentoText(s) ? `<div class="pz-val"><b>¿Se ha trabajado «${esc(fundamentoText(s))}»?</b><div class="opts">${chip('fund', 'si', 'Sí')}${chip('fund', 'medias', 'A medias')}${chip('fund', 'no', 'No')}</div></div>` : ''}
      <label class="ses-f">Observaciones de la sesión<textarea id="p-vobs" rows="6" placeholder="Cómo han respondido a las tareas, qué ha costado, actitud, jugadores a seguir, incidencias…">${esc(V.obs || '')}</textarea></label>
      <label class="ses-f">Para la próxima sesión<textarea id="p-vnota" rows="2" placeholder="Lo que quieres recordar o cambiar la próxima vez.">${esc(V.nota || '')}</textarea></label>
      ${pista.notas.some(Boolean) ? `<details><summary>Tus apuntes de los bloques</summary><ul class="pz-notes">${pista.notas.map((n, k) => n ? `<li><b>${esc(blk(s, k).n)}:</b> ${esc(n)}</li>` : '').join('')}</ul></details>` : ''}
      <button class="btn primary big" type="button" data-pfinish>Terminar y guardar</button></div>`;
  }
  pista.el.innerHTML = `<div class="pista-top"><span>${esc(top)}</span><span class="pz-ses" title="${plan ? 'Lo que queda de sesión' : 'Tiempo de entreno'}">${plan ? 'Quedan ' : ''}<output id="p-ses" class="${plan && plan * 60000 - sesSpent() < 0 ? 'over' : ''}">${esc(sesLeftTxt())}</output>${plan ? ` de ${plan} min` : ''}</span><button class="btn" type="button" data-pclose>Salir</button></div>
    <div class="pista-body">${body}</div>
    <div class="pista-nav"><button class="btn" type="button" data-pgo="${i - 1}"${i === 0 ? ' disabled' : ''}>← Anterior</button><div class="pz-mid"><div class="dots" aria-hidden="true">${dots}</div>${next ? `<small>${esc(next)}</small>` : ''}</div><button class="btn primary" type="button" data-pgo="${i + 1}"${i === NB + 1 ? ' disabled' : ''}>Siguiente →</button></div>`;
}
function finishPista() {
  const s = pista.s, V = pista.val, mins = Math.round(sesSpent() / 60000);
  const reg = { fecha: isoToday(), min: mins, como: V.como || '', fund: V.fund || '', obs: (V.obs || '').trim(), nota: (V.nota || '').trim(), notas: pista.notas.map(x => (x || '').trim()), paradas: pista.stops.map(x => x.n) };
  closePista(false);
  const r = sessions.find(x => x.id === s.id);
  if (r) { if (!(r.hechas || []).includes(isoToday())) r.hechas = [...(r.hechas || []), isoToday()]; r.pista = reg; saveSes(); render(); }
  award('pista:' + s.id + ':' + isoToday(), PTS.pista, 'Entrenamiento en pista: ' + (s.equipo || 'sesión'));
  if (cofreGrant('pista:' + isoToday(), 'entreno en pista', true)) saveGame();
  if (clPistaBonus()) { saveGame(); setTimeout(() => toast('Tu plantilla gana un entrenamiento extra y doble.'), 2600); }
  toast('Entreno guardado' + (reg.obs || reg.nota || reg.como ? ' con tus observaciones.' : '.'));
}
function onPistaClick(e) {
  if (!pista) return;
  if (e.target.closest('[data-pbigclose]')) { pista.big = false; drawPista(); return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-pfinish')) { finishPista(); return; }
  if (b.hasAttribute('data-pclose')) { closePista(true); return; }
  if (b.hasAttribute('data-pbig')) { pista.big = true; drawPista(); return; }
  if (b.hasAttribute('data-pstop')) { pista.stopAt = Date.now(); drawPista(); return; }
  if (b.hasAttribute('data-pstopend')) { endStop(); return; }
  if (b.dataset.pval) { pista.val[b.dataset.pval] = pista.val[b.dataset.pval] === b.dataset.v ? '' : b.dataset.v; pistaSave(); drawPista(); return; }
  if (b.dataset.pgo !== undefined) { goPista(+b.dataset.pgo); return; }
  if (b.dataset.ptimer) {
    const k = pista.i - 1, tm = pista.timers[k];
    if (b.dataset.ptimer === 'run') { toggleTimer(); return; }
    tm.elapsed = 0; tm.start = null; pista.buzzed[k] = false; pista.warned[k] = false; pistaSave(); drawPista();
  }
}
const PISTA_COMO = { bien: 'Bien', regular: 'Regular', mal: 'Mal' }, PISTA_FUND = { si: 'Sí', medias: 'A medias', no: 'No' };
function pistaRegHTML(s) {
  const P = s.pista; if (!P) return '';
  const notas = (P.notas || []).map((n, k) => n ? `<li><b>${esc(blk(s, k).n)}:</b> ${esc(n)}</li>` : '').join('');
  return `<section class="p-sec"><h3>En pista · ${esc(fmtShort(P.fecha))}</h3><dl class="p-dl"><dt>Duración</dt><dd>${P.min} min</dd>${P.como ? `<dt>Cómo ha ido</dt><dd>${esc(PISTA_COMO[P.como] || P.como)}</dd>` : ''}${P.fund ? `<dt>Fundamento trabajado</dt><dd>${esc(PISTA_FUND[P.fund] || P.fund)}</dd>` : ''}${P.obs ? `<dt>Observaciones</dt><dd class="pre">${esc(P.obs)}</dd>` : ''}${P.nota ? `<dt>Para la próxima</dt><dd>${esc(P.nota)}</dd>` : ''}</dl>${notas ? `<ul class="pz-notes">${notas}</ul>` : ''}</section>`;
}

