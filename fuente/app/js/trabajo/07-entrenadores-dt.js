// ================= el espacio de cada entrenador (16 nov) =================
// Lo que hace cada uno, junto y en un sitio. Las sesiones y los ejercicios ya los veía todo el
// cuerpo técnico; aquí se juntan por persona y se les añaden sus equipos y cómo va en la liga.
const espBox = document.getElementById('espacio');
let espName = null;
function openCoach(name) {
  if (!name) return;
  eqDock(false); espName = name; espEquipo = null; drawCoach(); espBox.hidden = false; document.body.style.overflow = 'hidden'; espBox.scrollTop = 0;
  const b = espBox.querySelector('[data-espclose]'); if (b) b.focus();
}
function closeCoach() { perfilSoltar(); eqDock(false); espBox.hidden = true; espName = null; espEquipo = null; fichaPid = null; if (detail.hidden && editor.hidden && sesBox.hidden) document.body.style.overflow = ''; }
function drawCoach() {
  const n = espName; if (!n) return;
  const c = coachOf(n) || (bank.coaches || []).find(x => isMe(n, x.name));
  const equipos = equiposMap(horario()).filter(x => x.coaches.some(e => isMe(e, n))).map(x => x.t);
  const ses = (bank.sesClub || []).filter(x => isMe(x.autor || '', n)).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const ejs = bank.tasks.filter(x => x.source !== 'oller' && x.author && isMe(n, x.author));
  const rows = (typeof standings === 'function' ? standings() : []);
  const pos = rows.findIndex(r => normName(r.name) === normName(n));
  const pts = clubPoints(c ? c.name : n), lvl = levelOf(pts);
  const yo = isMe(n, readAuthor() || '');
  espBox.innerHTML = `<div class="esp-top">
      <button class="pb-back" type="button" data-espclose><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Volver</button>
    </div>
    <div class="esp-head"><span class="esp-av">${avatarSVG(c ? c.avatar : null, lvl)}</span>
      <div><h1>${esc(c ? c.name : n)}${yo ? ' <small class="esp-yo">tú</small>' : ''}</h1>
        <p class="sub">${equipos.length ? esc(equipos.join(' · ')) : 'Sin equipos en el horario'}</p></div></div>
    <section class="ses-sec"><h2 class="h-sec">En la liga</h2>
      <div class="club-stats big"><span><b>${pos >= 0 ? pos + 1 + 'º' : '—'}</b><small>${rows.length ? 'de ' + rows.length : 'sin jornadas'}</small></span>
        <span><b>${lvl}</b><small>nivel · ${pts} puntos</small></span>
        <span><b>${ejs.length}</b><small>${ejs.length === 1 ? 'ejercicio suyo' : 'ejercicios suyos'} en el banco</small></span></div>
      <p class="sub">${esc(record(c ? c.name : n) || 'Todavía sin duelos')}</p></section>
    <section class="ses-sec"><h2 class="h-sec">Sus sesiones</h2>
      ${ses.length ? `<div class="ses-rows mini">${ses.slice(0, 12).map(x => `<button class="ses-row" type="button" data-espses="${esc(x.id)}"><span class="ses-thumb">${(x.s.bloques || []).some(b => b && b.task) ? diagramSVG(((x.s.bloques || []).find(b => b && b.task) || {}).task.diagram, '') : '<span class="ses-empty">Sin ejercicio</span>'}</span><span class="ses-bn">${esc(x.s.equipo || 'Sesión')}</span><span>${esc(x.s.fecha ? fmtShort(x.s.fecha) : '')}</span></button>`).join('')}</div>${ses.length > 12 ? `<p class="sub">Y ${ses.length - 12} más.</p>` : ''}`
        : '<p class="sub">Todavía no ha compartido ninguna sesión.</p>'}</section>
    <section class="ses-sec"><h2 class="h-sec">Sus ejercicios</h2>
      ${ejs.length ? `<div class="grid">${ejs.slice(0, 8).map(t => tcard(t, 'bank')).join('')}</div>${ejs.length > 8 ? `<p class="sub">Y ${ejs.length - 8} más en el banco.</p>` : ''}`
        : '<p class="sub">Todavía no tiene ejercicios en el banco.</p>'}</section>`;
}
espBox.addEventListener('input', e => { if (e.target.closest('[data-fh]')) fichaGuardar(); });
espBox.addEventListener('click', e => {
  if (e.target.closest('[data-espclose]')) { closeCoach(); return; }
  if (perfilClick(e)) return;
  const pji = e.target.closest('[data-pjugid]'); if (pji && espEquipo) { jugadorPerfil(pji.dataset.pjugid, espEquipo); return; }
  const tp = e.target.closest('[data-eqtipo]');
  if (tp && espEquipo && canWriteBank) { const t = espEquipo, v = tp.dataset.eqtipo, m = Object.assign({}, bank.eqTipo || {});
    if (v) m[t] = v; else delete m[t];
    saveBankExtra_({ eqTipo: m }, `${t}: ${v ? TIPO[v].toLowerCase() : 'tipo sin definir'}.`); return; }
  const st = e.target.closest('[data-eqsub]');
  if (st && espEquipo) { eqSub = st.dataset.eqsub; openEquipo(espEquipo); return; }
  const pj = e.target.closest('[data-pjug]');
  if (pj && espEquipo) { const j = plantillaDe(espEquipo)[+pj.dataset.pjug]; if (migrado() && j && j.id) jugadorPerfil(j.id, espEquipo); else jugadorModal(espEquipo, +pj.dataset.pjug); return; }
  if (e.target.closest('[data-palta]') && espEquipo) { jugadorEditar(espEquipo, -1); return; }
  const pz = e.target.closest('[data-fpaso]'); if (pz) { fichaPaso(+pz.dataset.fpaso); espBox.scrollTop = 0; return; }
  const pm = e.target.closest('[data-fpasomas]');
  if (pm) { const d = +pm.dataset.fpasomas;
    if (d > 0 && fhPaso === FH_PASOS.length - 1) { fichaGuardar(true); const q = espBox.querySelector('[data-fvolver]'); if (q) q.click(); return; }
    fichaPaso(fhPaso + d); espBox.scrollTop = 0; return; }
  const fp = e.target.closest('[data-fpart]');
  if (fp) { const vengoDe = espEquipo; partidoAbrir(fp.dataset.fpart); fichaVuelta = vengoDe; return; }
  if (e.target.closest('[data-fvolver]')) { if (fichaVuelta) { const t = fichaVuelta; fichaVuelta = null; fichaPid = null; openEquipo(t); } else closeCoach(); return; }
  // elegir una opción: una sola por grupo, y volver a tocarla la quita
  const op = e.target.closest('[data-fop]');
  if (op) { const ya = op.classList.contains('si');
    espBox.querySelectorAll(`[data-fop="${op.dataset.fop}"]`).forEach(b => b.classList.remove('si'));
    if (!ya) op.classList.add('si');
    fichaGuardar(); return; }
  // etiquetas de «qué pasó»: las que quieras
  const tg = e.target.closest('[data-ftag]');
  if (tg) { tg.classList.toggle('si'); fichaGuardar(); return; }
  // uno a uno: nada → bien → a mejorar → nada
  const jj = e.target.closest('[data-fj]');
  if (jj) { const n = jj.classList.contains('bien') ? 'mej' : jj.classList.contains('mej') ? '' : 'bien';
    jj.classList.remove('bien', 'mej'); if (n) jj.classList.add(n);
    fichaGuardar(); return; }
  const cv = e.target.closest('[data-fconv]');
  if (cv) { cv.classList.toggle('si'); cv.setAttribute('aria-pressed', cv.classList.contains('si')); fichaCuenta(); fichaGuardar(); return; }
  if (e.target.closest('[data-fconvtodos]') || e.target.closest('[data-fconvnadie]')) {
    const si = !!e.target.closest('[data-fconvtodos]');
    espBox.querySelectorAll('.cv-row').forEach(b => { b.classList.toggle('si', si); b.setAttribute('aria-pressed', si); });
    fichaCuenta(); fichaGuardar(); return;
  }
  if (e.target.closest('[data-fborrar]')) {
    const p = partidoPorId(fichaPid);
    confirmModal('¿Borrar la ficha?', `Se va lo que hayas escrito del partido con ${p ? p.rival : 'el rival'}.`, 'Borrar', () => {
      const CL = window.SMB_CLOUD;
      if (CL && CL.ficha) Promise.resolve(CL.ficha.del(fichaPid)).catch(() => {});
      const t = fichaVuelta; fichaVuelta = null; fichaPid = null;
      if (t) openEquipo(t, 'part'); else closeCoach();
    });
    return;
  }
  const s = e.target.closest('[data-espses]');
  if (s) { const x = (bank.sesClub || []).find(y => y.id === s.dataset.espses); if (x) { closeCoach(); openSheet(x.s); } return; }
  const t = e.target.closest('[data-open]');
  if (t) { const ta = bank.tasks.find(y => y.id === t.dataset.open); if (ta) { closeCoach(); openDetail(ta, 'bank'); } }
});
document.addEventListener('click', e => { const b = e.target.closest('[data-coach]'); if (b) openCoach(b.dataset.coach); });
// los partidos de la semana, desde Inicio: la capa está cerrada, así que el «Volver» cierra
document.addEventListener('click', e => { if (!espBox.hidden) return; const b = e.target.closest('[data-fpart]'); if (b) { fichaVuelta = null; partidoAbrir(b.dataset.fpart); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !espBox.hidden) closeCoach(); });
function dtSeguimientoHTML() {
  const H = horario(), names = [];
  (H.g || []).forEach(g => g.ent.forEach(n => { if (!names.some(x => deacc(x) === deacc(n))) names.push(n); }));
  if (!names.length) return '';
  const t = isoToday(), mon = mondayISO(), sun = dateOf(mon); sun.setDate(sun.getDate() + 6);
  const d7 = dateOf(t); d7.setDate(d7.getDate() + 6); const d14 = dateOf(t); d14.setDate(d14.getDate() + 13);
  const semana = entrenos(mon, isoOf(sun)), prox = entrenos(t, isoOf(d7)), quin = entrenos(t, isoOf(d14));
  const of = (L, n) => L.filter(it => it.g.ent.some(e => deacc(e) === deacc(n)));
  const rows = names.sort((a, b) => a.localeCompare(b, 'es')).map(n => {
    const c = (bank.coaches || []).find(x => isMe(n, x.name)), W = of(semana, n).filter(it => meToca(it, n)), P = of(prox, n), Q = of(quin, n);
    const prep = W.filter(it => sesDe(it)).length, sin = P.filter(it => !sesDe(it) && meToca(it, n)), pl = Q.filter(it => planFor(it, n)).length;
    const ej = bank.tasks.filter(x => x.source !== 'oller' && x.author && isMe(n, x.author)).length, ejN = ejNuevos().filter(x => x.author && isMe(n, x.author)).length;
    const acc = !c ? 'Sin cuenta' : c.uid ? 'Dentro' + (c.visto ? ' · ' + haceTxt(c.visto) : '') : c.email ? 'Dado de alta, sin entrar' : 'En el vestuario';
    const cell = (lab, val, cls) => `<span class="sg-c${cls ? ' ' + cls : ''}"><small>${lab}</small><b>${val}</b></span>`;
    const otro = c && !deacc(c.name).startsWith(deacc(n).split(' ')[0]);
    const libres = c ? [] : (bank.coaches || []).filter(x => (x.uid || x.email) && !names.some(m => isMe(m, x.name)));
    const link = alias()[deacc(n)] ? `<button class="btn small ghost" type="button" data-dt-alias="${esc(n)}" data-to="">Desvincular de ${esc(alias()[deacc(n)])}</button>`
      : libres.length ? `<label class="mini-in">Es la cuenta de<select data-dt-alias-sel="${esc(n)}"><option value="">Elegir…</option>${libres.map(x => `<option>${esc(x.name)}</option>`).join('')}</select></label>` : '';
    return `<li><details class="sg-row"><summary><span class="sg-name"><b>${esc(c ? c.name : n)}</b><small>${otro ? `«${esc(n)}» en el horario · ` : ''}${esc(acc)}</small></span>
      ${cell('Preparadas esta semana', W.length ? `${prep} de ${W.length}` : '—', W.length ? (prep === W.length ? 'good' : '') : '')}
      ${cell('Sin preparar, 7 días', P.length ? sin.length : '—', sin.length ? 'bad' : P.length ? 'good' : '')}
      ${cell('Planificados, 14 días', Q.length ? `${pl} de ${Q.length}` : '—', Q.length && pl === Q.length ? 'good' : '')}
      ${cell('Ejercicios en el banco', ej + (ejN ? ` <small>+${ejN} nuevos</small>` : ''))}</summary>
      <div class="sg-body">${P.length ? `<ul class="ag-list">${P.map(it => agRowHTML(it, false)).join('')}</ul>` : '<p class="sub">No tiene entrenos en los próximos 7 días.</p>'}
      <div class="actions">${c ? `<button class="btn small" type="button" data-dt-bonus="${esc(c.name)}">Dar puntos</button>` : ''}${link}</div></div></details></li>`;
  }).join('');
  return `<section class="ses-sec"><h2 class="h-sec">Seguimiento ${infoBtn('seguimiento')}</h2><p class="sub">Del horario. Pulsa un entrenador para ver sus entrenos de los próximos 7 días. Solo lo ves tú.</p><ul class="sg-list">${rows}</ul></section>`;
}
function renderDT() {
  const box = document.getElementById('dt-dyn'), tabs = document.getElementById('dt-tabs'), rv = document.getElementById('review');
  if (!canWriteBank) { box.innerHTML = '<div class="empty">Esta zona es solo para la Dirección Técnica.</div>'; rv.hidden = true; tabs.innerHTML = ''; return; }
  if (!DT_TABS.some(([k]) => k === dtTab)) dtTab = 'resumen';
  const X = dtState(), CL = X.CL, nb = X.pend.length + X.nuevos.length + X.inbox;
  document.getElementById('st-dt').textContent = `${bank.tasks.length} ejercicios en el banco · ${(bank.coaches || []).length} en el vestuario`;
  const badge = { banco: X.inbox, revisar: rvQueue().list.length + ccPend().length, equipo: X.espera };
  tabs.innerHTML = `<div class="seg wrap" role="group" aria-label="Partes de la Dirección Técnica">${DT_TABS.map(([k, l]) => `<button type="button" data-dttab="${k}" aria-pressed="${dtTab === k}">${l}${badge[k] ? ` · ${badge[k]}` : ''}</button>`).join('')}</div>`;
  rv.hidden = dtTab !== 'banco';
  if (!CL && !rv.dataset.init) { rv.open = true; rv.dataset.init = '1'; }
  document.getElementById('dt-pre').innerHTML = CL && dtTab === 'banco' && X.inbox ? CL.inboxHTML() : '';
  let h = '';
  if (dtTab === 'resumen') h = dtResumenHTML(X);
  else if (dtTab === 'revisar') h = dtRevisarHTML() + dtContHTML();
  else if (dtTab === 'banco') h = dtBancoHTML(X);
  else if (dtTab === 'liga') h = dtLigaHTML();
  else if (dtTab === 'equipo') {
    const subs = [['equipos', 'Equipos'], ['seg', 'Seguimiento'], ...(CL ? [['acceso', 'Acceso']] : []), ['vest', 'Vestuario']];
    if (!subs.some(x => x[0] === dtSub)) dtSub = 'equipos';
    const cuerpo = dtSub === 'equipos' ? dtEquiposHTML() : dtSub === 'seg' ? dtSeguimientoHTML() : dtSub === 'acceso' ? (CL ? CL.accessHTML() : '') : dtVestHTML();
    h = `<div class="seg dt-sub" role="group" aria-label="Cuerpo técnico">${subs.map(([k, l]) => `<button type="button" data-dtsub="${k}" aria-pressed="${dtSub === k}">${l}</button>`).join('')}</div>${cuerpo}`;
  }
  else if (dtTab === 'horario') h = dtHorarioHTML();
  box.innerHTML = h + '<p class="msg" id="dt-msg" aria-live="polite"></p>';
}
function goDT(tab, sel, open, sub) {
  dtTab = tab; if (sub) dtSub = sub; if (view.zone !== 'dt') navigate('dt'); else render();
  requestAnimationFrame(() => { const el = sel && document.querySelector(sel); if (!el) { scrollTo({ top: 0 }); return; } if (open) { if (el.tagName === 'DETAILS') el.open = true; const d = el.closest('details'); if (d) d.open = true; } el.scrollIntoView({ block: 'center' }); const f = el.matches('input,textarea,select') ? el : el.querySelector('input,textarea,select'); if (f) f.focus({ preventScroll: true }); });
}
function pickCoachModal() {
  const cs = [...(bank.coaches || [])].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (!cs.length) { toast('Todavía no hay nadie en el vestuario.'); return; }
  openModal(`<h2>Dar puntos</h2><ul class="pick-list">${cs.map(c => `<li><span><b>${esc(c.name)}</b><small>${clubPoints(c.name)} puntos</small></span><button class="btn small primary" type="button" data-pick="${esc(c.name)}">Elegir</button></li>`).join('')}</ul><div class="row"><button class="btn" id="m-no" type="button">Cerrar</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelector('.pick-list').onclick = e => { const b = e.target.closest('[data-pick]'); if (b) bonusModal(b.dataset.pick); };
}
function setAlias(n, to) {
  const A = Object.assign({}, alias()); if (to) A[deacc(n)] = to; else delete A[deacc(n)];
  saveBank(bank.tasks, to ? `«${n}» del horario es ahora ${to}.` : `«${n}» desvinculado.`, document.getElementById('dt-msg'), { alias: A });
}
document.getElementById('v-dt').addEventListener('change', e => { const n = e.target.dataset && e.target.dataset.dtAliasSel; if (n !== undefined && e.target.value) setAlias(n, e.target.value); });
document.getElementById('v-dt').addEventListener('change', e => {
  if (e.target.id !== 'pl-file') return;
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => { const ta = document.getElementById('pl-code'); if (ta) ta.value = String(r.result || ''); plantImportar(String(r.result || '')); }; r.readAsText(f);
});
async function dtBackup() {
  const msg = document.getElementById('dt-msg');
  if (!downloadsApi) { msg.className = 'msg err'; msg.textContent = 'Desde esta vista no se puede descargar.'; return; }
  try { await downloadsApi.save({ filename: `banco-smb-${isoToday()}.json`, data: JSON.stringify(bank, null, 1) }); msg.className = 'msg ok'; msg.textContent = 'Copia descargada.'; }
  catch (err) { if (!(err && err.code === 'declined')) { msg.className = 'msg err'; msg.textContent = 'No se ha podido descargar.'; } }
}
function dtDo(k) {
  const CL = window.SMB_CLOUD;
  if (k === 'new') openEditor(newTask(), 'mine-new');
  else if (k === 'serie') startSerie();
  else if (k === 'bank') { view.tab = 'banco'; navigate('ejercicios'); }
  else if (k === 'code') goDT('banco', '#review', true);
  else if (k === 'backup') { dtTab = 'banco'; render(); dtBackup(); }
  else if (k === 'seg') goDT('equipo', null, false, 'seg');
  else if (k === 'alta') { if (CL) goDT('equipo', '#cl-pre-name', false, 'acceso'); else addCoachModal(); }
  else if (k === 'puntos') pickCoachModal();
  else if (k === 'jornada') goDT('liga', '#dt-play');
  else if (k === 'hz-add') { goDT('horario'); hzModal(null); }
  else if (k === 'hz-sin') goDT('horario', '#hz-sd', true);
  else if (k === 'hz') goDT('horario');
}
const LS_SERIE = 'smb-dt-serie';
function serieGet() { try { return JSON.parse(localStorage.getItem(LS_SERIE) || 'null'); } catch (e) { return null; } }
function serieSet(v) { try { if (v) localStorage.setItem(LS_SERIE, JSON.stringify(v)); else localStorage.removeItem(LS_SERIE); } catch (e) {} }
function startSerie() { const ids = pendingDT().map(t => t.id); if (!ids.length) return; serieSet({ ids, total: ids.length, done: [] }); continueSerie(); }
function continueSerie() {
  const S = serieGet(); if (!S || !canWriteBank) return;
  const ids = S.ids.filter(id => !S.done.includes(id) && bank.tasks.some(t => t.id === id));
  if (!ids.length) { serieSet(null); if (!editor.hidden) closeEditor(); toast('Serie terminada.'); render(); return; }
  S.ids = ids; serieSet(S);
  openEditor(clone(bank.tasks.find(x => x.id === ids[0])), 'bank', { title: `Validar · ${S.total - ids.length + 1} de ${S.total}` });
  document.getElementById('ed-skip').hidden = false;
}
function serieDone(id) { const S = serieGet(); if (!S || S.ids[0] !== id) return false; S.done.push(id); S.ids.shift(); serieSet(S); continueSerie(); return true; }
document.getElementById('v-dt').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.cc) { ccAction(b); return; }
  if (b.dataset.dttab) { dtTab = b.dataset.dttab; render(); scrollTo({ top: 0 }); return; }
  if (b.dataset.dtsub) { dtSub = b.dataset.dtsub; render(); scrollTo({ top: 0 }); return; }
  if (b.dataset.dtgo) { const [t, sb] = b.dataset.dtgo.split(':'); goDT(t, null, false, sb); return; }
  if (b.dataset.dtAlias !== undefined) { setAlias(b.dataset.dtAlias, b.dataset.to); return; }
  if (b.dataset.dtdo) { dtDo(b.dataset.dtdo); return; }
  if (b.id === 'dt-serie') { dtTab = 'revisar'; render(); scrollTo({ top: 0 }); return; }
  if (b.dataset.rv) { rvAction(b.dataset.rv, b); return; }
  if (b.dataset.dtEdit) { const t = bank.tasks.find(x => x.id === b.dataset.dtEdit); if (t) openEditor(clone(t), 'bank'); }
  else if (b.dataset.dtSee) { const t = ejClub().find(x => x.id === b.dataset.dtSee); if (t) openDetail(t, 'club'); }
  else if (b.dataset.dtTobank) { const t = ejClub().find(x => x.id === b.dataset.dtTobank); if (t) { b.disabled = true; toBank(t, document.getElementById('dt-msg')).then(ok => { if (!ok) b.disabled = false; }); } }
  else if (b.id === 'dt-all-bank') {
    const L = ejNuevos();
    confirmModal(`¿Meter los ${L.length} en el banco?`, `Entran todos y quedan pendientes de validar. Cada autor suma ${PTS.banco} puntos por ejercicio.`, 'Meter todos', () => {
      const add = L.map(t => { const c = clone(t); delete c._club; delete c._ts; delete c.basedOn; c.orig = t.id; c.id = 'club-' + uid(); c.source = 'club'; c.updated = today(); c.smb = Object.assign({}, c.smb || {}, { validado: false }); return c; });
      saveBank([...bank.tasks, ...add], `${add.length} ejercicios metidos en el banco. Ya puedes validarlos en serie.`, document.getElementById('dt-msg'));
    });
  }
  else if (b.id === 'dt-backup') dtBackup();
});

