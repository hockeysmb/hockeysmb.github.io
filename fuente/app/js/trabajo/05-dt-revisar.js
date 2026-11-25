// ================= Dirección Técnica =================
function dtRow(t) {
  const why = [!t.tipo ? 'sin clasificar' : '', !(t.smb && t.smb.validado) ? 'parte SMB sin validar' : ''].filter(Boolean).join(' · ');
  return `<li class="dt-row"><span class="dt-thumb">${diagramSVG(t.diagram || {}, t.title || '')}</span>
    <span class="dt-txt"><b>${esc(taskLabel(t))}</b><small>${esc(t.source === 'oller' ? OLLER : 'De ' + (t.author || 'un entrenador'))}${why ? ' · ' + why : ''}</small></span>
    <button class="btn small" type="button" data-dt-edit="${esc(t.id)}">Abrir</button></li>`;
}
let dtTab = 'resumen', dtSub = 'equipos';
const DT_TABS = [['resumen', 'Resumen'], ['revisar', 'Revisar'], ['banco', 'Banco'], ['equipo', 'Cuerpo técnico'], ['liga', 'Liga'], ['horario', 'Horario']];
function dtState() {
  const CL = window.SMB_CLOUD, t = isoToday(), d = dateOf(t); d.setDate(d.getDate() + 6);
  return { CL, pend: pendingDT(), nuevos: ejNuevos(), inbox: CL && CL.inboxCount ? CL.inboxCount() : 0, espera: CL && CL.waitingCount ? CL.waitingCount() : 0,
    sinPrep: entrenos(t, isoOf(d)).filter(it => !sesDe(it) && it.g.ent.length) };
}
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
function dtResumenHTML(X) {
  const items = [], it = (n, t, sub, btn, calm) => items.push(`<li${calm ? ' class="calm"' : ''}><span class="dt-n">${n}</span><span class="dt-txt"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span>${btn}</li>`);
  // «tab» puede llevar la subpestaña detrás de dos puntos: «equipo:acceso»
  const go = (tab, label, prim) => `<button class="btn small${prim ? ' primary' : ''}" type="button" data-dtgo="${tab}">${label}</button>`;
  if (X.inbox) it(X.inbox, 'Recibido de los entrenadores', 'Ejercicios o sesiones que te han mandado', go('banco', 'Revisar', true));
  if (X.nuevos.length) it(X.nuevos.length, 'Ejercicios nuevos del cuerpo técnico', 'De ' + esc([...new Set(X.nuevos.map(t => (t.author || '').split(' ')[0]).filter(Boolean))].join(', ')) + '. Aún no están en el banco', go('revisar', 'Revisar', true));
  if (X.pend.length) { const nt = X.pend.filter(t => !t.tipo).length; it(X.pend.length, 'Fichas por validar', [nt ? `${nt} sin clasificar` : '', X.pend.length - nt ? `${X.pend.length - nt} con «En SMB» sin validar` : ''].filter(Boolean).join(' · '), go('revisar', 'Revisar', true)); }
  if (X.espera) it(X.espera, X.espera === 1 ? 'Entrenador esperando acceso' : 'Entrenadores esperando acceso', 'Han creado su cuenta y no tienen acceso', go('equipo:acceso', 'Dar acceso', true));
  // la jornada del lunes ya no la juega la DT: la liga diaria se juega sola (16 oct)
  if (X.sinPrep.length) { const by = {}; X.sinPrep.forEach(e => e.g.ent.forEach(n => { by[n] = (by[n] || 0) + 1; })); it(X.sinPrep.length, 'Entrenos sin preparar en 7 días', Object.entries(by).sort((a, b) => b[1] - a[1]).map(([n, k]) => `${esc(n)} ${k}`).join(' · '), go('equipo:seg', 'Seguimiento'), true); }
  const B = (k, l, prim) => `<button class="btn${prim ? ' primary' : ''}" type="button" data-dtdo="${k}">${l}</button>`;
  // 13 nov: fuera las doce pastillas de «Qué puedes hacer». Repetían las pestañas de arriba y obligaban
  // a leer doce etiquetas iguales. Quedan los tres atajos del lunes y el resto está en su pestaña.
  return `<section class="ses-sec"><h2 class="h-sec">Te toca ${infoBtn('resumen')}</h2>${items.length ? `<ul class="dt-todo">${items.join('')}</ul>` : '<p class="dt-ok">Todo al día.</p>'}
      <div class="actions">${B('new', 'Crear un ejercicio', true)}${B('jornada', 'Jugar la jornada')}</div>
    </section>
    <section class="ses-sec"><h2 class="h-sec">Lo de siempre</h2><div class="actions">${B('code', 'Pegar un código')}${B('backup', 'Descargar copia del banco')}${B('puntos', 'Dar puntos')}${B('alta', X.CL ? 'Dar de alta a un entrenador' : 'Añadir entrenador al vestuario')}${B('hz-add', 'Añadir un entreno')}
      <a class="btn" id="dt-fem" href="https://hockeysmb.github.io/femenino/" target="_blank" rel="noopener">App de jugadoras</a></div></section>`;
}
function dtBancoHTML(X) {
  const nuevosHTML = X.nuevos.length ? `<section class="ses-sec"><div class="lt-head"><h2 class="h-sec">Nuevos del cuerpo técnico · ${X.nuevos.length}</h2>${X.nuevos.length > 1 ? `<button class="btn primary" type="button" id="dt-all-bank">Meter los ${X.nuevos.length} en el banco</button>` : ''}</div>
      <p class="sub">Están en «Mis ejercicios» de cada uno. Al meterlos quedan pendientes de validar.</p>
      <ul class="dt-list">${X.nuevos.map(t => `<li class="dt-row"><span class="dt-thumb">${diagramSVG(t.diagram || {}, t.title || '')}</span><span class="dt-txt"><b>${esc(t.title || 'Sin nombre')}</b><small>De ${esc(t.author || 'un entrenador')}${t.tipo ? ' · ' + esc(tipoName(t.tipo)) : ''}</small></span><span class="actions"><button class="btn small" type="button" data-dt-see="${esc(t.id)}">Ver</button><button class="btn small primary" type="button" data-dt-tobank="${esc(t.id)}">Meter en el banco</button></span></li>`).join('')}</ul></section>` : '';
  const noTipo = bank.tasks.filter(t => !t.tipo), noVal = bank.tasks.filter(t => t.tipo && !(t.smb && t.smb.validado));
  const pendHTML = `<section class="ses-sec"><div class="lt-head"><h2 class="h-sec">Por validar${X.pend.length ? ' · ' + X.pend.length : ''}</h2>${X.pend.length ? `<button class="btn primary" type="button" id="dt-serie">Validar en serie</button>` : ''}</div>
      ${X.pend.length ? `<p class="sub">En serie se abren una detrás de otra: revisas, marcas «Validado», guardas y pasa a la siguiente.</p>` : '<p class="sub">Todo validado.</p>'}
      ${noTipo.length ? `<h3 class="h-sub">Sin clasificar (${noTipo.length})</h3><ul class="dt-list">${noTipo.map(dtRow).join('')}</ul>` : ''}
      ${noVal.length ? `<h3 class="h-sub">«En SMB» sin validar (${noVal.length})</h3><ul class="dt-list">${noVal.map(dtRow).join('')}</ul>` : ''}</section>`;
  const recent = bank.tasks.filter(t => t.source !== 'oller').slice(-8).reverse();
  return nuevosHTML + pendHTML + `<section class="ses-sec"><h2 class="h-sec">El banco</h2>
      <p class="sub">${bank.tasks.length} ejercicios. <button class="btn small ghost" type="button" data-dtdo="bank">Verlos todos</button></p>
      ${recent.length ? `<details class="dt-more"><summary>Últimos del cuerpo técnico (${recent.length})</summary><ul class="dt-list">${recent.map(dtRow).join('')}</ul></details>` : ''}
      <details class="dt-more"><summary>Copia de seguridad</summary><p class="sub">Descarga una copia de vez en cuando por si alguien quita algo por error.</p>
      <div class="actions"><button class="btn" type="button" id="dt-backup">Descargar copia del banco</button></div>${X.CL && X.CL.restoreHTML ? X.CL.restoreHTML() : ''}</details></section>`;
}
// ---------- mesa de revisión (21 oct): todo lo pendiente en una pantalla, con el semáforo ----------
let rvSel = '', rvNoteOpen = false;
function rvQueue() {
  const no = bank.rvNo || {}, notas = bank.notas || [], list = [], waiting = [];
  ejNuevos().forEach(t => {
    const ts = t._ts || t.ts || 0;
    if (no[t.id] && no[t.id] >= ts) return;
    const nt = notas.filter(x => x.tid === t.id).sort((a, b) => b.ts - a.ts)[0];
    if (nt && ts <= nt.ts) { waiting.push({ t, nt }); return; }
    list.push({ k: 'c:' + t.id, kind: 'coach', t, ts, corrected: !!nt });
  });
  list.sort((a, b) => b.ts - a.ts);
  pendingDT().forEach(t => list.push({ k: 'b:' + t.id, kind: 'bank', t, ts: 0 }));
  list.forEach(x => { x.r = checkTask(x.t); });
  return { list, waiting };
}
function dtRevisarHTML() {
  const Q = rvQueue(), L = Q.list;
  if (!L.some(x => x.k === rvSel)) rvSel = L[0] ? L[0].k : '';
  const cur = L.find(x => x.k === rvSel), i = L.indexOf(cur);
  const row = x => `<li><button class="rv-row${x.k === rvSel ? ' on' : ''}" type="button" data-rv="sel" data-k="${esc(x.k)}">${rvDot(x.r)}<b>${esc(x.t.title || 'Sin nombre')}</b><small>${x.kind === 'coach' ? 'Propuesta de ' + esc(x.t.author || 'un entrenador') + (x.corrected ? ' · corregida' : '') : 'Banco · ' + (!x.t.tipo ? 'sin clasificar' : 'sin validar')}</small></button></li>`;
  const wait = Q.waiting.length ? `<details class="dt-more rv-wait"><summary>${Q.waiting.length} ${Q.waiting.length === 1 ? 'devuelto, esperando' : 'devueltos, esperando'} a que su autor lo cambie</summary><ul class="dt-list">${Q.waiting.map(({ t, nt }) => `<li class="dt-row"><span class="dt-txt"><b>${esc(t.title || 'Sin nombre')}</b><small>${esc(t.author || '')} · «${esc(rvShort(nt.txt))}»</small></span><button class="btn small ghost" type="button" data-rv="unnote" data-tid="${esc(t.id)}">Quitar la nota</button></li>`).join('')}</ul></details>` : '';
  if (!cur) return `<section class="ses-sec rv"><h2 class="h-sec">Revisar</h2><p class="sub">No hay nada pendiente: todo el banco está validado y no hay propuestas nuevas.</p>${wait}</section>`;
  const t = cur.t, m = t.smb || {}, tags = [tipoName(t.tipo), ...(t.fases || []), ...(t.cats || []).map(catName)].filter(Boolean);
  const txt = (lab, v) => v ? `<dt>${lab}</dt><dd>${esc(v)}</dd>` : `<dt>${lab}</dt><dd class="rv-empty">—</dd>`;
  const sugg = cur.r.items.map(x => '· ' + x.txt).join('\n');
  const acts = cur.kind === 'bank'
    ? `<button class="btn primary" type="button" data-rv="ok"${t.tipo ? '' : ' disabled title="Clasifícala antes con Editar"'}>Validar y siguiente <kbd>V</kbd></button><button class="btn" type="button" data-rv="edit">Editar <kbd>E</kbd></button>`
    : `<button class="btn primary" type="button" data-rv="ok">Meter en el banco y validar <kbd>V</kbd></button><button class="btn" type="button" data-rv="in">Meter sin validar</button><button class="btn" type="button" data-rv="note">Devolver con una nota <kbd>N</kbd></button><button class="btn ghost" type="button" data-rv="no">Descartar</button>`;
  return `<section class="ses-sec rv"><div class="lt-head"><h2 class="h-sec">Revisar · ${L.length}</h2><span class="sub rv-keys">← → para moverte · V valida${cur.kind === 'bank' ? ' · E edita' : ' · N nota'}</span></div>
    <div class="rv-grid"><ol class="rv-list">${L.map(row).join('')}</ol>
    <div class="rv-main" id="rv-main">
      <div class="rv-head"><span class="rv-k">${cur.kind === 'coach' ? `Propuesta de ${esc(t.author || 'un entrenador')}${cur.ts ? ' · ' + haceTxt(cur.ts) : ''}${cur.corrected ? ' · corregida tras tu nota' : ''}` : 'Banco · pendiente de validar'} · ${i + 1} de ${L.length}</span>
        <h3>${t.num ? 'nº ' + t.num + ' · ' : ''}${esc(t.title || 'Sin nombre')}</h3>${tags.length ? `<p class="rv-tags">${tags.map(x => `<span>${esc(x)}</span>`).join('')}</p>` : ''}${worksOf(t).length ? `<p class="sub">Trabaja: ${esc(worksOf(t).join(' · '))}</p>` : ''}</div>
      <div class="rv-check rv-c-${cur.r.lvl}">${rvDot(cur.r)}${rvListHTML(cur.r)}</div>
      <div class="actions rv-acts">${acts}<button class="btn ghost" type="button" data-rv="next">Saltar →</button></div>
      <div class="rv-note"${rvNoteOpen && cur.kind === 'coach' ? '' : ' hidden'}><label class="ses-f">Nota para ${esc(t.author || 'el autor')} (la verá en su app, junto al ejercicio)<textarea id="rv-note-t" rows="4">${esc(sugg)}</textarea></label><div class="actions"><button class="btn primary" type="button" data-rv="note-ok">Dejar la nota y siguiente</button><button class="btn ghost" type="button" data-rv="note-x">Cancelar</button></div></div>
      <div class="rv-body"><button class="rv-fig" type="button" data-rv="big" aria-label="Ver el gráfico en grande">${diagramSVG(t.diagram || {}, t.title || '')}</button>
        <div class="rv-txt"><h4>Normas</h4>${(t.rules || []).length ? `<ol>${t.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol>` : '<p class="rv-empty">Sin normas.</p>'}${t.notes ? `<h4>Notas y variantes</h4><p>${esc(t.notes)}</p>` : ''}
          <h4>En SMB</h4><dl class="rv-dl">${txt('Del modelo de juego', m.modelo)}${txt('Qué lee el jugador', m.lee)}<dt>Preguntas</dt><dd>${(m.preguntas || []).length ? `<ul>${m.preguntas.map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : '<span class="rv-empty">—</span>'}</dd>${txt('Más fácil', m.facil)}${txt('Más difícil', m.dificil)}</dl></div></div>
      <p class="msg" id="rv-msg" aria-live="polite"></p>
    </div></div>${wait}</section>`;
}
// Contenidos nuevos (18 nov): los que el cuerpo técnico escribe a mano en sus sesiones. La DT los pasa a la lista del club, los oculta o añade los suyos.
function ccPend() {
  const all = [...sessions.map(s => ({ s, autor: readAuthor() })), ...(bank.sesClub || []).filter(x => !x.mine).map(x => ({ s: x.s, autor: x.autor }))];
  const no = bank.contNo || {};
  return contSueltos(all).filter(x => !no[contKey(x.c)]);
}
function dtContHTML() {
  const L = ccPend(), club = bank.contClub || [], no = Object.entries(bank.contNo || {});
  const grupos = `<option value="">Dónde va…</option><optgroup label="Táctica (fase del juego)">${FASE_NAMES.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('')}</optgroup><optgroup label="Técnica (fundamento)">${TEC_NAMES.map(f => `<option value="tec:${esc(f)}">${esc(f)}</option>`).join('')}</optgroup>`;
  const quien = x => [...x.quien].slice(0, 3).join(', ') + (x.quien.size > 3 ? ' y ' + (x.quien.size - 3) + ' más' : '');
  return `<section class="ses-sec cc"><h2 class="h-sec">Contenidos nuevos${L.length ? ' · ' + L.length : ''}</h2>
    <p class="sub">Los que el cuerpo técnico escribe a mano en sus sesiones porque no están en la lista. Si pasas uno a la lista del club, sale a todos al preparar sesiones y planificar, y se puede marcar en los ejercicios.</p>
    ${L.length ? `<ul class="dt-list">${L.map(x => `<li class="cc-row"><span class="dt-txt"><b>${esc(x.c)}</b><small>${esc(quien(x) || 'Sin autor')} · ${x.n} ${x.n === 1 ? 'sesión' : 'sesiones'}</small></span>
      <span class="actions"><select aria-label="Dónde va «${esc(x.c)}»">${grupos}</select><button class="btn primary small" type="button" data-cc="add" data-c="${esc(x.c)}">Pasar a la lista</button><button class="btn ghost small" type="button" data-cc="no" data-c="${esc(x.c)}">Ocultar</button></span></li>`).join('')}</ul>`
      : '<p class="sub">No hay ninguno pendiente.</p>'}
    <div class="cc-add"><input type="text" id="cc-new" placeholder="Añadir uno tú" aria-label="Contenido nuevo para la lista del club" autocapitalize="sentences" autocomplete="off" maxlength="80"><select aria-label="Dónde va el contenido nuevo">${grupos}</select><button class="btn" type="button" data-cc="nuevo">Añadir</button></div>
    <p class="msg" id="cc-msg" aria-live="polite"></p>
    ${club.length ? `<details class="dt-more"><summary>En la lista del club · ${club.length} ${club.length === 1 ? 'añadido' : 'añadidos'} por ti</summary><ul class="dt-list">${club.map(x => `<li class="dt-row"><span class="dt-txt"><b>${esc(x.c)}</b><small>${esc(contGrupo(x.g))}</small></span><button class="btn small ghost" type="button" data-cc="del" data-c="${esc(x.c)}">Quitar</button></li>`).join('')}</ul></details>` : ''}
    ${no.length ? `<details class="dt-more"><summary>Ocultados · ${no.length}</summary><ul class="dt-list">${no.map(([k, c]) => `<li class="dt-row"><span class="dt-txt"><b>${esc(typeof c === 'string' ? c : k)}</b></span><button class="btn small ghost" type="button" data-cc="si" data-c="${esc(k)}">Recuperar</button></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
function ccAction(b) {
  const a = b.dataset.cc, msg = document.getElementById('cc-msg'), club = bank.contClub || [];
  const say = t => { if (msg) { msg.className = 'msg err'; msg.textContent = t; } };
  if (a === 'add' || a === 'nuevo') {
    const row = b.closest('.cc-row, .cc-add'), sel = row && row.querySelector('select'), g = sel ? sel.value : '';
    let c = a === 'nuevo' ? (document.getElementById('cc-new').value || '').replace(/\s+/g, ' ').trim() : b.dataset.c;
    if (!c) { say('Escribe el contenido.'); document.getElementById('cc-new').focus(); return; }
    if (!g) { say('Elige dónde va: una fase del juego (táctica) o un fundamento técnico.'); if (sel) sel.focus(); return; }
    if (contOficial(c)) { say('Ya está en la lista del club.'); return; }
    if (a === 'nuevo') c = c.charAt(0).toUpperCase() + c.slice(1);
    saveBank(bank.tasks, `«${c}» ya está en la lista del club, en ${contGrupo(g)}.`, null, { contClub: [...club, { c, g, ts: Date.now() }] });
  } else if (a === 'no') saveBank(bank.tasks, `«${b.dataset.c}» oculto. Lo tienes en «Ocultados».`, null, { contNo: Object.assign({}, bank.contNo || {}, { [contKey(b.dataset.c)]: b.dataset.c }) });
  else if (a === 'si') { const no = Object.assign({}, bank.contNo || {}); delete no[b.dataset.c]; saveBank(bank.tasks, 'Recuperado.', null, { contNo: no }); }
  else if (a === 'del') saveBank(bank.tasks, 'Quitado de la lista del club. Los ejercicios que ya lo tenían marcado lo conservan.', null, { contClub: club.filter(x => contKey(x.c) !== contKey(b.dataset.c)) });
}
function rvMove(d) { const L = rvQueue().list, i = L.findIndex(x => x.k === rvSel); if (!L.length) return; rvSel = L[(i + d + L.length) % L.length].k; rvNoteOpen = false; render(); const mm = document.getElementById('rv-main'); if (mm && window.innerWidth < 900) mm.scrollIntoView({ block: 'start' }); }
function rvAfter() { const L = rvQueue().list, i = L.findIndex(x => x.k === rvSel); const nx = L[i + 1] || L[i - 1]; return nx ? nx.k : ''; }
function rvAction(a, b) {
  const L = rvQueue().list, cur = L.find(x => x.k === rvSel), msg = document.getElementById('rv-msg');
  if (a === 'sel') { rvSel = b.dataset.k; rvNoteOpen = false; render(); const mm = document.getElementById('rv-main'); if (mm && window.innerWidth < 900) mm.scrollIntoView({ block: 'start' }); return; }
  if (a === 'unnote') { saveBank(bank.tasks, 'Nota quitada: vuelve a la cola.', msg, { notas: (bank.notas || []).filter(x => x.tid !== b.dataset.tid) }); return; }
  if (!cur) return;
  const t = cur.t;
  if (a === 'next') return rvMove(1);
  if (a === 'big') return openViewer(t);
  if (a === 'edit' && cur.kind === 'bank') return openEditor(clone(bank.tasks.find(x => x.id === t.id)), 'bank');
  if (a === 'note') { rvNoteOpen = true; render(); const ta = document.getElementById('rv-note-t'); if (ta) { ta.focus(); ta.select(); } return; }
  if (a === 'note-x') { rvNoteOpen = false; render(); return; }
  const next = rvAfter();
  if (a === 'ok' && cur.kind === 'bank') {
    if (!t.tipo) return;
    rvSel = next;
    saveBank(bank.tasks.map(x => x.id === t.id ? Object.assign({}, x, { smb: Object.assign({}, x.smb || {}, { validado: true }) }) : x), `Validado: «${t.title || 'ejercicio'}».`, null);
  } else if ((a === 'ok' || a === 'in') && cur.kind === 'coach') {
    const c = clone(t); delete c._club; delete c._ts; delete c.basedOn;
    c.orig = t.id; c.id = 'club-' + uid(); c.source = 'club'; c.updated = today(); c.smb = Object.assign({}, c.smb || {}, { validado: a === 'ok' && !!c.tipo });
    rvSel = next;
    saveBank([...bank.tasks, c], `«${t.title || 'Ejercicio'}» ya está en el banco${c.smb.validado ? ' y validado' : ''} (+${PTS.banco} puntos para ${t.author || 'su autor'}).`, null, { notas: (bank.notas || []).filter(x => x.tid !== t.id) });
  } else if (a === 'no' && cur.kind === 'coach') {
    rvSel = next;
    saveBank(bank.tasks, 'Descartado. Si su autor lo cambia, vuelve a la cola.', null, { rvNo: Object.assign({}, bank.rvNo || {}, { [t.id]: Date.now() }) });
  } else if (a === 'note-ok' && cur.kind === 'coach') {
    const txt = (document.getElementById('rv-note-t').value || '').trim(); if (!txt) return;
    rvSel = next; rvNoteOpen = false;
    const nota = { id: uid(), tid: t.id, autor: t.author || '', titulo: t.title || '', txt, ts: Date.now() };
    saveBank(bank.tasks, `Nota para ${t.author || 'el autor'} guardada. Lo verá en su app.`, null, { notas: [...(bank.notas || []).filter(x => x.tid !== t.id), nota] });
  }
}
document.addEventListener('keydown', e => {
  if (view.zone !== 'dt' || dtTab !== 'revisar' || !editor.hidden || !modal.hidden || document.querySelector('.viewer')) return;
  if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowright' || k === 'arrowdown' || k === 'j') { e.preventDefault(); rvMove(1); }
  else if (k === 'arrowleft' || k === 'arrowup' || k === 'k') { e.preventDefault(); rvMove(-1); }
  else if (k === 'v') { const b = document.querySelector('#rv-main [data-rv="ok"]:not([disabled])'); if (b) rvAction('ok', b); }
  else if (k === 'e') rvAction('edit');
  else if (k === 'n') rvAction('note');
});
// ---------- seguimiento por entrenador ----------
function planFor(it, name) {
  if (isMe(name) && !planEmpty(plan[it.key])) return plan[it.key];
  const o = (bank.planClub || []).find(x => isMe(name, x.autor) && !planEmpty((x.plan || {})[it.key]));
  return o ? o.plan[it.key] : null;
}
const haceTxt = ts => { if (!ts) return ''; const d = Math.floor((Date.now() - ts) / 864e5); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`; };
