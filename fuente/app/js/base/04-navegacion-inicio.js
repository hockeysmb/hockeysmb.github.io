// ================= navegación =================
const ZONES = ['inicio', 'ejercicios', 'sesiones', 'equipos', 'liga', 'vestuario', 'dt'];
view.zone = 'inicio';
function navigate(z) {
  if (z === 'perfil') z = 'vestuario';
  if (!ZONES.includes(z)) z = 'inicio';
  if (z === 'dt' && !canWriteBank) z = 'inicio';
  if (z !== 'equipos' && document.body.classList.contains('eq-dock')) closeCoach();   // el equipo abierto a la derecha no se queda encima de otra zona
  view.zone = z;
  try { history.replaceState(null, '', '#' + z); } catch (e) {}
  render(); window.scrollTo(0, 0);
}
function render() {
  contClubApply();
  try { if (readAuthor()) cofresSync(); } catch (e) {}
  try { if (readAuthor()) clubSync(); } catch (e) {}
  try { if (readAuthor()) lgSync(); } catch (e) {}
  document.querySelectorAll('[data-nav]').forEach(b => b.setAttribute('aria-current', b.dataset.nav === view.zone ? 'page' : 'false'));
  document.querySelector('[data-nav="dt"]').hidden = !canWriteBank;
  ZONES.forEach(z => { document.getElementById('v-' + z).hidden = z !== view.zone; });
  if (view.zone === 'inicio') renderHome();
  else if (view.zone === 'ejercicios') renderGrid();
  else if (view.zone === 'sesiones') renderSessions();
  else if (view.zone === 'equipos') renderEquipos();
  else if (view.zone === 'liga') renderLiga();
  else if (view.zone === 'vestuario') renderVestuario();
  else if (view.zone === 'dt') renderDT();
  if (detailState && !detail.hidden) drawDetail();
  updateChrome();
}
let meKey = '';
function updateChrome() {
  const mb = document.getElementById('me-btn'), name = readAuthor();
  const k = JSON.stringify(game.av) + myLevel();
  if (k !== meKey) { meKey = k; mb.querySelector('.me-btn-av').innerHTML = avatarSVG(game.av, myLevel()); }
  mb.setAttribute('aria-current', view.zone === 'vestuario' ? 'page' : 'false');
  mb.classList.toggle('alert', !name || pjPending(name));
  document.querySelector('[data-nav="liga"]').classList.toggle('has-dot', view.zone !== 'liga' && amNew().length > 0);
  const dtb = document.querySelector('[data-nav="dt"]'), n = canWriteBank ? pendingDT().length + ejNuevos().length : 0;
  let bd = dtb.querySelector('.nbadge'); if (!bd) { bd = document.createElement('i'); bd.className = 'nbadge'; dtb.appendChild(bd); }
  bd.textContent = n > 99 ? '99+' : String(n); bd.hidden = !n;
  const se = document.getElementById('st-ej'); if (se) se.textContent = `${bank.tasks.length} en el banco del club · ${mine.length} ${mine.length === 1 ? 'tuyo' : 'tuyos'}`;
}
document.getElementById('nav').addEventListener('click', e => { const b = e.target.closest('[data-nav]'); if (b) navigate(b.dataset.nav); });
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) navigate(b.dataset.go); });
document.querySelector('.brand').addEventListener('click', () => navigate('inicio'));

// ================= inicio =================
function setAuthor(n) {
  const cur = readAuthor(); let old = cur;
  try { if (!old) old = localStorage.getItem('smb-banco-autor-prev') || ''; if (!n && cur) localStorage.setItem('smb-banco-autor-prev', cur); localStorage.setItem('smb-banco-autor', n); } catch (e) {}
  // el propio entrenador se cambia el nombre: lo suyo pasa al nombre nuevo y la DT lo lleva al resto del club
  if (n && old && normName(old) !== normName(n)) {
    try { localStorage.setItem('smb-banco-nombre-ts', String(Date.now())); localStorage.removeItem('smb-banco-autor-prev'); } catch (e) {}
    mine = renameDeep(mine, old, n); sessions = renameDeep(sessions, old, n); game = renameDeep(game, old, n);
    saveMine(); saveSes(); saveGame();
  }
  cloudPush('meta');
}
const ICON = {
  ses: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 2.5v3M16 2.5v3M7.5 10h9M7.5 14h9M7.5 18h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  find: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  new: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 7l3 3" stroke="currentColor" stroke-width="1.8"/></svg>',
};
const fmtShort = iso => { if (!iso) return 'sin fecha'; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }); };
const sesSorted = () => [...sessions].sort((a, b) => (b.ts || 0) - (a.ts || 0) || (b.fecha || '').localeCompare(a.fecha || ''));
const pendingDT = () => bank.tasks.filter(t => !t.tipo || !(t.smb && t.smb.validado));
function nextSession() {
  const t = isoToday();
  const up = sessions.filter(s => (s.fecha || '') >= t).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (b.ts || 0) - (a.ts || 0));
  return up[0] ? { s: up[0], up: true } : (sesSorted()[0] ? { s: sesSorted()[0], up: false } : null);
}
function relDay(iso) {
  if (!iso) return 'Sin fecha';
  const d = new Date(); d.setDate(d.getDate() + 1);
  const tom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return iso === isoToday() ? 'Hoy' : iso === tom ? 'Mañana' : fmtShort(iso);
}
function firstSteps() {
  const name = readAuthor();
  return [
    { ok: !!name, t: 'Pon tu nombre', d: 'Firma tus ejercicios y tus sesiones.', btn: '', act: '' },
    { ok: !!(name && coachOf(name)), t: window.SMB_CLOUD ? 'Crea tu personaje' : 'Crea tu personaje y mándalo a la DT', d: 'Así entras en el vestuario del club y en la liga.', btn: 'Crear mi personaje', act: 'perfil' },
    { ok: sessions.length > 0, t: 'Prepara tu primera sesión', d: 'Un ejercicio por bloque de la plantilla del club, y el PDF listo.', btn: 'Preparar sesión', act: 'new-ses' },
  ];
}
const fl3 = e => FLU3D[e] ? `<img src="${FLU3D[e]}" alt="" aria-hidden="true">` : '';
// 16 nov: los dos avisos de Inicio que son iconos (cofre y borrador a medias)
const ICO_COFRE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="18" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9h19M12 9v11" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 9C10 5 8 4 6.6 4.8 5.3 5.6 5.6 8 8 9M12 9c2-4 4-5 5.4-4.2 1.3.8 1 3.2-1.4 4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICO_BORRADOR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10a2.1 2.1 0 0 0-3-3L5 17v3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const HC_IC = { get lv() { return fl3('⭐'); }, get pt() { return fl3('🏆'); }, get mo() { return fl3('🪙'); }, get cf() { return fl3('🎁'); } };
function renderHome() {
  const name = readAuthor(), nx = nextSession(), pend = canWriteBank ? pendingDT().length + ejNuevos().length : 0, steps = firstSteps();
  const drafts = mine.filter(t => t.borrador);
  const hero = nx ? (() => { const s = nx.s; return `<section class="ses-sec next-ses">
      <div class="nx-top"><span class="nx-k">${nx.up ? 'Tu próximo entreno' : 'Tu última sesión'}</span><span class="nx-day">${esc(nx.up ? relDay(s.fecha) : fmtShort(s.fecha))}</span></div>
      <h2>${esc(s.equipo || 'Sin equipo')}</h2>
      <p class="sub">${isTec(s) ? 'Tecnificación · ' : ''}${sesTotal(s) ? sesTotal(s) + ' min · ' : ''}${s.bloques.filter(b => b.task).length} de ${nB(s)} ${isTec(s) ? 'ejercicios' : 'bloques'}${fundamentoText(s) ? ' · ' + esc(fundamentoText(s)) : ''}</p>
      <div class="nx-strip">${s.bloques.slice(0, 4).map((b, i) => `<div class="nx-b"><div class="ses-thumb">${b.task ? diagramSVG(b.task.diagram, taskLabel(b.task)) : '<div class="ses-empty">Sin ejercicio</div>'}</div><span>${isTec(s) ? esc(blk(s, i).n) : esc(SES_BLOQUES[i].n)}</span></div>`).join('')}</div>
      <div class="actions">${sesComplete(s) ? `<button class="btn primary big" type="button" data-home="pista" data-id="${s.id}">Empezar entrenamiento</button><button class="btn" type="button" data-home="edit-ses" data-id="${s.id}">Editar</button>` : `<button class="btn primary big" type="button" data-home="edit-ses" data-id="${s.id}">Seguir preparándola</button><button class="btn" type="button" data-home="pista" data-id="${s.id}">Empezar igualmente</button>`}<button class="btn ghost" type="button" data-go="sesiones">Todas mis sesiones</button></div>
    </section>`; })() : '';
  const todo = steps.filter(x => !x.ok).length;
  const guide = todo ? `<section class="ses-sec steps"><h2 class="h-sec">Primeros pasos</h2><p class="sub">${3 - todo} de 3 hechos.</p>
      <ol class="step-list">${steps.map((x, i) => `<li class="${x.ok ? 'done' : ''}"><span class="st-n">${x.ok ? '✓' : i + 1}</span><span class="st-t"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span>${!x.ok && x.act && (i === 0 || steps[0].ok) ? `<button class="btn small${steps.findIndex(y => !y.ok) === i ? ' primary' : ''}" type="button" data-home="${x.act}">${esc(x.btn)}</button>` : ''}</li>`).join('')}</ol>
      ${!name ? `<div class="row-in"><input id="home-name" type="text" placeholder="Tu nombre" aria-label="Tu nombre" autocomplete="given-name"><button class="btn primary" type="button" data-home="name">Guardar</button></div>` : ''}
    </section>` : '';
  // 13 nov: un solo aviso a la vista, el más urgente. Los demás, detrás de «y N más».
  // 16 nov: en la banda solo va el trabajo. El cofre y el borrador son dos iconos al lado del
  // saludo: el del cofre está siempre (aunque sea para decir cuánto falta) y así no se come
  // una pantalla entera por un penalti gratis.
  const avisos = [
    pend ? `<button class="notice" type="button" data-go="dt">Tienes ${pend} ${pend === 1 ? 'cosa pendiente' : 'cosas pendientes'} en Dirección Técnica${ejNuevos().length ? ` (${ejNuevos().length} ${ejNuevos().length === 1 ? 'ejercicio nuevo' : 'ejercicios nuevos'} del cuerpo técnico)` : ''} <span aria-hidden="true">→</span></button>` : '',
    name ? notasHomeHTML() : '',
  ].filter(x => x && x.trim());
  const nCof = typeof cofresN === 'function' ? cofresN() : 0;
  const iconos = !name ? '' : `<div class="hicons">
    <button class="hi${nCof || penFree() ? ' hot' : ''}" type="button" data-cofre aria-label="${nCof ? `Tienes ${nCof} ${nCof === 1 ? 'cofre' : 'cofres'}: tira el penalti` : penFree() ? 'Penalti gratis listo' : `Próximo penalti gratis en ${esc(penCd(penFreeIn()))}`}">${ICO_COFRE}${nCof ? `<i class="hi-n">${nCof}</i>` : ''}</button>
    ${drafts.length ? `<button class="hi hot" type="button" data-home="draft" data-id="${esc(drafts[drafts.length - 1].id)}" aria-label="${drafts.length === 1 ? `Tienes un ejercicio a medias${drafts[0].title ? ': ' + esc(drafts[0].title) : ''}. Seguir` : `Tienes ${drafts.length} ejercicios a medias. Seguir`}">${ICO_BORRADOR}${drafts.length > 1 ? `<i class="hi-n">${drafts.length}</i>` : ''}</button>` : ''}
  </div>`;
  const avisoHTML = !avisos.length ? '' : avisos[0] + (avisos.length > 1
    ? `<details class="avisos-mas"><summary>y ${avisos.length - 1} ${avisos.length === 2 ? 'aviso más' : 'avisos más'}</summary>${avisos.slice(1).join('')}</details>` : '');
  // El orden: primero el trabajo (el entreno que viene, la semana, las tres acciones) y después el juego.
  document.getElementById('v-inicio').innerHTML = `
    ${name ? `<div class="hello"><div><p class="h-date">${esc(new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1>Hola, ${esc(name)}</h1></div>${iconos}</div>`
      : `<div class="hello"><div><h1>Banco de situaciones SMB</h1><p class="sub">Ejercicios del club, sesiones con la plantilla del club y la liga del cuerpo técnico.</p></div></div>`}
    ${avisoHTML}
    ${hero}
    ${myWeekHTML()}
    <div class="tiles">
      <button class="tile${nx ? '' : ' main'}" type="button" data-home="new-ses">${ICON.ses}<b>Preparar una sesión</b><span>Un ejercicio por bloque de la plantilla y el PDF listo para compartir.</span></button>
      <button class="tile" type="button" data-go="ejercicios">${ICON.find}<b>Buscar un ejercicio</b><span>${bank.tasks.length} ejercicios del club por tipo de tarea y fase del juego.</span></button>
      <button class="tile" type="button" data-home="new-ex">${ICON.new}<b>Crear un ejercicio</b><span>${window.SMB_CLOUD ? 'Dibújalo en la pista. Lo ve todo el cuerpo técnico y la DT puede meterlo en el banco.' : 'Dibújalo en la pista y mándaselo a la Dirección Técnica.'}</span></button>
    </div>
    ${guide}
    <div class="home-2">${misionesHTML()}${ligaTeaserHTML()}</div>
`;
}
document.getElementById('v-inicio').addEventListener('click', e => {
  const b = e.target.closest('[data-home]'); if (!b) return;
  const a = b.dataset.home;
  if (a === 'draft') { const L = mine.filter(t => t.borrador); if (L.length === 1) openEditor(clone(L[0]), 'mine'); else { view.tab = 'mias'; navigate('ejercicios'); } return; }
  if (a === 'name') { const v = document.getElementById('home-name').value.trim(); if (v) { setAuthor(v); render(); } }
  else if (a === 'rename') { setAuthor(''); render(); const i = document.getElementById('home-name'); if (i) i.focus(); }
  else if (a === 'new-ses') openSes(newSession(), true);
  else if (a === 'perfil') { vest.tab = 'personalizar'; navigate('vestuario'); }
  else if (a === 'new-ex') openEditor(newTask(), 'mine-new');
  else if (a === 'pista') { const s = sessions.find(x => x.id === b.dataset.id); if (s) openPista(s); }
  else if (a === 'edit-ses') { const s = sessions.find(x => x.id === b.dataset.id); if (s) openSes(clone(s), false); }
  else if (a === 'backup') backupModal();
  else if (a === 'restore') restoreModal();
});
document.getElementById('v-inicio').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'home-name') { const v = e.target.value.trim(); if (v) { setAuthor(v); render(); } } });

// ================= copia de seguridad (por navegador) =================
function toB64(str) { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin); }
function fromB64(b64) { const bin = atob(b64), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); }
function copyWithFallback(text, ta, msg, okText) {
  const fallback = () => { ta.focus(); ta.select(); msg.className = 'msg'; msg.textContent = 'Texto seleccionado: cópialo con el menú de tu móvil o con Ctrl+C.'; };
  try { navigator.clipboard.writeText(text).then(() => { msg.className = 'msg ok'; msg.textContent = okText; }, fallback); } catch (e) { fallback(); }
}
function backupModal() {
  const data = { v: 2, autor: readAuthor(), mine, sessions, game, envios: loadEnv() };
  const code = 'SMB2:' + toB64(JSON.stringify(data));
  openModal(`<h2>Guardar copia</h2>
    <p>Esta copia lleva tus ${mine.length} ejercicios, tus ${sessions.length} sesiones, tu personaje y tus monedas. Cópiala y mándatela por WhatsApp o correo${downloadsApi ? ', o descárgala como archivo' : ''}. Si cambias de móvil, la pegas en «Recuperar copia».</p>
    <textarea class="code" id="m-code" readonly aria-label="Código de la copia">${esc(code)}</textarea>
    <p class="msg" id="m-msg" aria-live="polite"></p>
    <div class="row"><button class="btn" id="m-close" type="button">Cerrar</button>${downloadsApi ? '<button class="btn" id="m-file" type="button">Descargar archivo</button>' : ''}<button class="btn primary" id="m-copy" type="button">Copiar</button></div>`);
  modalCard.querySelector('#m-close').onclick = closeModal;
  const weekKey = 'copia:' + Math.floor(Date.now() / 604800000);
  modalCard.querySelector('#m-copy').onclick = () => { copyWithFallback(code, modalCard.querySelector('#m-code'), modalCard.querySelector('#m-msg'), 'Copia copiada. Pégala en un mensaje para ti.'); award(weekKey, PTS.copia, 'Copia de seguridad'); };
  const f = modalCard.querySelector('#m-file');
  if (f) f.onclick = async () => {
    const msg = modalCard.querySelector('#m-msg');
    try { await downloadsApi.save({ filename: `copia-smb-${isoToday()}.json`, data: JSON.stringify(data) }); msg.className = 'msg ok'; msg.textContent = 'Archivo descargado.'; award(weekKey, PTS.copia, 'Copia de seguridad'); }
    catch (e) { if (!(e && e.code === 'declined')) { msg.className = 'msg err'; msg.textContent = 'No se ha podido descargar aquí. Usa «Copiar».'; } }
  };
}
function mergeGame(g) {
  if (!g || !g.av) return false;
  const fresh = !(game.log || []).length && !(game.owned || []).length && !game.spent;
  if (fresh) game = Object.assign({ owned: [], spent: 0, log: [] }, clone(g));
  else {
    game.owned = [...new Set([...(game.owned || []), ...(g.owned || [])])];
    const keys = new Set((game.log || []).map(x => x.key));
    (g.log || []).forEach(x => { if (!keys.has(x.key)) game.log.push(x); });
    game.spent = Math.max(game.spent || 0, g.spent || 0);
    if (!game.poder && g.poder) game.poder = g.poder;
  }
  saveGame(); return true;
}
function restoreModal() {
  openModal(`<h2>Recuperar copia</h2>
    <p>Pega el código de tu copia (empieza por «SMB2:») o elige el archivo que descargaste. Se añade a lo que ya tienes; no se borra nada.</p>
    <textarea class="code" id="m-in" aria-label="Código de la copia" placeholder="SMB2:..."></textarea>
    <label class="ses-f">O el archivo<input type="file" id="m-filein" accept=".json,.txt,application/json,text/plain"></label>
    <p class="msg" id="m-msg" aria-live="polite"></p>
    <div class="row"><button class="btn" id="m-close" type="button">Cerrar</button><button class="btn primary" id="m-go" type="button">Recuperar</button></div>`);
  const msg = modalCard.querySelector('#m-msg');
  modalCard.querySelector('#m-close').onclick = closeModal;
  modalCard.querySelector('#m-filein').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { modalCard.querySelector('#m-in').value = String(r.result || ''); }; r.readAsText(f); };
  modalCard.querySelector('#m-go').onclick = () => {
    const raw = modalCard.querySelector('#m-in').value.trim();
    let p;
    try { p = raw.startsWith('SMB2:') ? JSON.parse(fromB64(raw.slice(5).replace(/\s+/g, ''))) : JSON.parse(raw); if (!p || p.v !== 2) throw 0; }
    catch (e) { msg.className = 'msg err'; msg.textContent = 'Esa copia no es válida. Comprueba que se ha pegado entera.'; return; }
    let a = 0, b = 0;
    (p.mine || []).forEach(t => { if (t && t.id && !mine.some(x => x.id === t.id)) { mine.push(t); a++; } });
    (p.sessions || []).forEach(s => { if (s && s.id && !sessions.some(x => x.id === s.id)) { sessions.push(s); b++; } });
    if (p.autor && !readAuthor()) setAuthor(p.autor);
    const pj = mergeGame(p.game);
    if (Array.isArray(p.envios)) { const env = loadEnv(); p.envios.forEach(x => { if (x && !env.some(y => y.kind === x.kind && y.ref === x.ref)) env.push(x); }); try { localStorage.setItem(LS_ENV, JSON.stringify(env.slice(-60))); } catch (e) {} cloudPush('meta'); }
    const ok = saveMine() && saveSes();
    msg.className = ok ? 'msg ok' : 'msg err';
    msg.textContent = ok ? `Recuperados ${a} ${a === 1 ? 'ejercicio' : 'ejercicios'} y ${b} ${b === 1 ? 'sesión' : 'sesiones'}${pj ? ', tu personaje y tus monedas' : ''}.` : 'Este navegador no deja guardar (¿modo privado?).';
    render();
  };
}

// ================= añadir un ejercicio a una sesión =================
function addToSession(t) {
  const list = sesSorted().slice(0, 8);
  openModal(`<h2>Añadir a una sesión</h2><p class="sub">${esc(taskLabel(t))}</p>
    <div class="pick-list">${list.map(s => `<button class="btn pick-opt" type="button" data-sid="${s.id}"><b>${esc(s.equipo || 'Sin equipo')}</b><small>${isTec(s) ? 'Tecnificación · ' : ''}${esc(fmtShort(s.fecha))} · ${s.bloques.filter(b => b.task).length} de ${nB(s)} ${isTec(s) ? 'ejercicios' : 'bloques'}</small></button>`).join('')}
      <button class="btn primary pick-opt" type="button" data-sid="new"><b>+ Nueva sesión</b></button></div>
    <div class="row"><button class="btn" id="m-no" type="button">Cancelar</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => {
    const isNew = b.dataset.sid === 'new';
    addToSessionBloque(t, isNew ? newSession(t.tipo === 'tecnificacion' ? 'tec' : '') : sessions.find(x => x.id === b.dataset.sid), isNew);
  });
}
function addToSessionBloque(t, s, isNew) {
  const rec = isTec(s) ? -1 : SES_BLOQUES.findIndex(B => B.tipo === t.tipo);
  const empty = isTec(s) ? s.bloques.findIndex(b => !b.task) : -1;
  openModal(`<h2>${isTec(s) ? '¿Dónde lo pongo?' : '¿En qué bloque?'}</h2><p class="sub">${esc(s.equipo || (isNew ? 'Nueva sesión' : 'Sin equipo'))} · ${esc(fmtShort(s.fecha))}</p>
    <div class="pick-list">${isTec(s) ? `<button class="btn pick-opt primary" type="button" data-bi="${empty >= 0 ? empty : 'add'}"><b>${empty >= 0 ? esc(blk(s, empty).n) + ' (vacío)' : '+ Como ejercicio nuevo'}</b></button>` : ''}
      ${s.bloques.map((b, i) => isTec(s) && !b.task ? '' : `<button class="btn pick-opt${i === rec ? ' primary' : ''}" type="button" data-bi="${i}"><b>${esc(isTec(s) ? blk(s, i).n : (i + 1) + ' · ' + blk(s, i).n)}${i === rec ? ' · recomendado' : ''}</b>${isTec(s) ? '' : `<small>${esc(blk(s, i).d)}</small>`}${b.task ? `<small>Ahora: ${esc(taskLabel(b.task))} (se sustituye)</small>` : ''}</button>`).join('')}</div>
    <div class="row"><button class="btn" id="m-no" type="button">Cancelar</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelectorAll('[data-bi]').forEach(b => b.onclick = () => {
    if (b.dataset.bi === 'add') s.bloques.push(emptyB());
    const i = b.dataset.bi === 'add' ? s.bloques.length - 1 : +b.dataset.bi;
    prefill(s.bloques[i], t); s.ts = Date.now(); s.updated = today();
    if (isNew) sessions.push(s);
    const ok = saveSes();
    openModal(`<h2>${ok ? 'Añadido' : 'No se ha podido guardar'}</h2><p>${ok ? `${esc(taskLabel(t))} está en ${isTec(s) ? 'el ejercicio ' + (i + 1) : 'el bloque ' + (i + 1)} de «${esc(s.equipo || 'Nueva sesión')}».` : 'Este navegador no deja guardar (¿modo privado?).'}</p>
      <div class="row"><button class="btn" id="m-no" type="button">Seguir buscando</button><button class="btn primary" id="m-open" type="button">Abrir la sesión</button></div>`);
    modalCard.querySelector('#m-no').onclick = closeModal;
    modalCard.querySelector('#m-open').onclick = () => { closeModal(); closeDetail(); openSes(clone(s), false, i + 1); };
  });
}

