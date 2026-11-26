// ================= listado de ejercicios =================
function taskSrcHTML(t) {
  return t.source === 'oller'
    ? `Marc Oller, <i>365 exercicis d’hoquei patins</i>, ejercicio ${t.num}${t.page ? ` (página ${t.page} del PDF)` : ''}${t.bloque ? `, bloque «${esc(t.bloque)}»` : ''}.`
    : (t.basedOn ? `Versión de ${esc(t.author || 'un entrenador')} a partir de ${esc(t.basedOn)}.` : `Ejercicio de ${esc(t.author || 'un entrenador')}.`);
}
function taskCard(t, where) {
  // ficha completa (se usa al revisar una propuesta)
  const num = t.num ? `nº ${t.num} · ` : '';
  const rules = (t.rules || []).filter(Boolean);
  return `<article class="task" id="card-${t.id}">
    <div class="task-head">
      <div class="meta"><span class="badge">${esc(tipoName(t.tipo) || 'Sin clasificar')}</span><span class="tags">${(t.fases || []).map(f => `<span class="tag">${esc(faseTxt(f))}</span>`).join('')}</span>${t.source !== 'oller' ? `<span>De ${esc(authorOf(t))}</span>` : ''}</div>
      <h2>${esc(num)}${esc(t.title || 'Sin nombre')}</h2>
      ${(t.contenidos || []).length ? `<p class="works"><b>Qué se trabaja:</b> ${t.contenidos.map(esc).join(' · ')}</p>` : ''}
      ${(t.tec || []).length ? `<p class="works"><b>Técnica y táctica individual:</b> ${t.tec.map(esc).join(' · ')}</p>` : ''}
      ${(t.cats || []).length ? `<p class="works"><b>Para:</b> ${t.cats.map(catName).join(', ')}</p>` : ''}
    </div>
    <div class="task-body">
      <div class="task-fig">${diagramSVG(t.diagram || {}, 'Gráfico: ' + (t.title || ''))}<button class="btn small fig-big" type="button" data-act="view-big" data-id="${t.id}">Ver en grande</button></div>
      <div class="task-text">
        <div><h3>Normas</h3>${rules.length ? `<ul>${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p class="src">Sin normas escritas.</p>'}</div>
        ${smbBlock(t.smb)}
        ${t.notes ? `<div><h3>Notas y variantes</h3><p>${esc(t.notes)}</p></div>` : ''}
        <p class="src">${taskSrcHTML(t)}</p>
      </div>
    </div>
  </article>`;
}
function smbBlock(m) {
  if (!m || !(m.lee || (m.preguntas || []).length || m.facil || m.dificil)) return '';
  const q = (m.preguntas || []).filter(Boolean);
  return `<section class="smb" aria-label="Cómo la usamos en SMB">
    <div class="smb-head"><h3>En SMB</h3>${!m.validado && canWriteBank ? '<span class="smb-tag">Propuesta · sin validar</span>' : ''}</div>
    ${m.modelo ? `<p class="smb-mod">Del modelo de juego: ${esc(m.modelo)}</p>` : ''}
    ${m.lee ? `<div><h4>Qué tiene que leer el jugador</h4><p>${esc(m.lee)}</p></div>` : ''}
    ${q.length ? `<div><h4>Preguntas para parar la tarea</h4><ul class="q">${q.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${m.facil || m.dificil ? `<dl>${m.facil ? `<dt>Más fácil</dt><dd>${esc(m.facil)}</dd>` : ''}${m.dificil ? `<dt>Más difícil</dt><dd>${esc(m.dificil)}</dd>` : ''}</dl>` : ''}
  </section>`;
}
function orgShort(dg) {
  const it = (dg && dg.items) || [], n = t => it.filter(i => i.type === t).length;
  const p = n('atk') + n('def'), gk = n('gk'), parts = [];
  if (p) parts.push(`${p} ${p === 1 ? 'jugador' : 'jugadores'}`);
  if (gk) parts.push(gk === 1 ? '1 portero' : `${gk} porteros`);
  const xs = [...it.map(i => i.x), ...((dg && dg.arrows) || []).flatMap(a => a.pts.map(q => q[0]))];
  if (xs.length) { const lo = Math.min(...xs), hi = Math.max(...xs); parts.push(hi <= 52 || lo >= 48 ? 'media pista' : 'pista entera'); }
  return parts.join(' · ');
}
function matches(t, skip) {
  const q = view.q.trim().toLowerCase();
  return (skip === 'tipo' || !view.tipo || t.tipo === view.tipo)
    && (skip === 'fase' || !view.fase || (t.fases || []).includes(view.fase))
    && (skip === 'cont' || !view.cont || worksOf(t).includes(view.cont))
    && (skip === 'cat' || !view.cat || (t.cats || []).includes(view.cat))
    && (skip === 'autor' || !view.autor || authorOf(t) === view.autor)
    && (skip === 'bloque' || !view.bloque || t.bloque === view.bloque)
    && (!q || String(t.num || '').includes(q) || (t.title || '').toLowerCase().includes(q) || authorOf(t).toLowerCase().includes(q) || worksOf(t).some(c => c.toLowerCase().includes(q)));
}
function fillSelect(id, all, current, values) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value=""${current ? '' : ' selected'}>${esc(all)}</option>` + values;
  sel.value = current;
}
function tcard(t, where) {
  const warn = false;   // 13 nov: el estado «Pendiente» se queda en Revisar, que es donde distingue algo
  return `<button class="tcard" type="button" data-open="${esc(t.id)}" data-where="${where}">
    <span class="tthumb">${diagramSVG(t.diagram || {}, t.title || '', { mini: true })}</span>
    <span class="tbadges">${t.destacado ? '<span class="badge star">★ Destacado</span>' : ''}${where === 'bank' && t.tipo ? '' : `<span class="badge">${esc(tipoName(t.tipo) || 'Sin clasificar')}</span>`}${where === 'mine' ? `<span class="badge mine">${t.borrador ? 'Borrador' : 'Mío'}</span>` : ''}${where === 'club' ? `<span class="badge mine">${esc(t.author || '')}</span>${inBank(t) ? '<span class="badge">En el banco</span>' : canWriteBank ? '<span class="badge warn">Nuevo</span>' : ''}` : ''}${warn ? '<span class="badge warn">Pendiente</span>' : ''}</span>
    <span class="ttitle">${esc((t.num ? 'nº ' + t.num + ' · ' : '') + (t.title || 'Sin nombre'))}</span>
    ${orgShort(t.diagram) || (t.fases || []).length ? `<span class="tsub">${esc([orgShort(t.diagram), (t.fases || []).map(faseTxt).join(' · ')].filter(Boolean).join(' · '))}</span>` : ''}
  </button>`;
}
// ejercicios del resto del cuerpo técnico (web): los ve todo el mundo; la DT los mete en el banco
const inBank = t => bank.tasks.some(b => (b.orig && b.orig === t.id) || (b.source !== 'oller' && normName(b.author) === normName(t.author) && normName(b.title) === normName(t.title)));
const ejClub = () => (bank.ejClub || []).filter(x => !x.mine && x.t && x.t.id).map(x => Object.assign({}, x.t, { author: x.t.author || x.autor, _club: x.id, _ts: x.ts }));
const ejNuevos = () => ejClub().filter(t => !inBank(t));
function toBank(t, msgEl) {
  const c = clone(t); delete c._club; delete c._ts; delete c.basedOn;
  c.orig = t.id; c.id = 'club-' + uid(); c.source = 'club'; c.updated = today();
  c.smb = Object.assign({}, c.smb || {}, { validado: false });
  return saveBank([...bank.tasks, c], `«${t.title || 'Ejercicio'}» ya está en el banco (+${PTS.banco} puntos para ${t.author || 'su autor'}). Queda pendiente de validar.`, msgEl);
}
function renderGrid() {
  const clubOn = !!window.SMB_CLOUD; document.getElementById('tab-club').hidden = !clubOn; if (!clubOn && view.tab === 'club') view.tab = 'banco';
  const nNew = canWriteBank ? ejNuevos().length : 0;
  document.getElementById('tab-club').textContent = `Cuerpo técnico${nNew ? ` · ${nNew}` : ''}`;
  document.getElementById('tab-banco').setAttribute('aria-pressed', String(view.tab === 'banco'));
  document.getElementById('tab-mias').setAttribute('aria-pressed', String(view.tab === 'mias'));
  document.getElementById('tab-club').setAttribute('aria-pressed', String(view.tab === 'club'));
  document.querySelectorAll('#f-tipo .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === view.tipo)));
  document.querySelectorAll('#f-fase .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === view.fase)));
  const src = view.tab === 'banco' ? bank.tasks : view.tab === 'club' ? ejClub() : mine;
  const count = (skip, key) => { const c = {}; src.filter(t => matches(t, skip)).forEach(t => [].concat(key(t)).forEach(k => { if (k) c[k] = (c[k] || 0) + 1; })); return c; };
  const cc = count('cont', t => worksOf(t));
  fillSelect('f-cont', 'Todo', view.cont, (view.fase ? [view.fase] : FASE_NAMES).map(f => {
    const items = FASES[f].filter(c => cc[c] || c === view.cont);
    return items.length ? `<optgroup label="${esc(faseTxt(f))}">${items.map(c => `<option value="${esc(c)}">${esc(c)} (${cc[c] || 0})</option>`).join('')}</optgroup>` : '';
  }).join('') + (view.fase ? '' : TEC_NAMES.map(f => {
    const items = tecList(f).filter(c => cc[c] || c === view.cont);
    return items.length ? `<optgroup label="Técnica · ${esc(f)}">${items.map(c => `<option value="${esc(c)}">${esc(c)} (${cc[c] || 0})</option>`).join('')}</optgroup>` : '';
  }).join('')));
  const fp = fundProx(), fd = document.getElementById('f-dia');
  fd.hidden = !fp;
  fd.innerHTML = fp ? `<span class="sub">${fp.fut ? 'Para tu sesión del ' + esc(fmtShort(fp.s.fecha)) : 'De tu última sesión'}${fp.s.equipo ? ' (' + esc(fp.s.equipo) + ')' : ''}:</span>${fp.c.map(c => `<button class="chip sm" type="button" data-fdia="${esc(c)}" aria-pressed="${view.cont === c}">${esc(c)}</button>`).join('')}` : '';
  const kc = count('cat', t => t.cats || []);
  fillSelect('f-cat', 'Todas', view.cat, CATS.map(([k, n]) => `<option value="${k}">${esc(n)} (${kc[k] || 0})</option>`).join(''));
  const ac = count('autor', t => authorOf(t));
  const authors = Object.keys(ac).sort((a, b) => a === OLLER ? 1 : b === OLLER ? -1 : a.localeCompare(b, 'es'));
  if (view.autor && !authors.includes(view.autor)) authors.push(view.autor);
  fillSelect('f-autor', 'Todos', view.autor, authors.map(a => `<option value="${esc(a)}">${esc(a)} (${ac[a] || 0})</option>`).join(''));
  const bc = count('bloque', t => t.bloque);
  fillSelect('f-bloque', 'Todos', view.bloque, BLOQUES.filter(b => bc[b] || b === view.bloque).map(b => `<option value="${esc(b)}">${esc(b)} (${bc[b] || 0})</option>`).join(''));
  const more = [view.fase, view.cont, view.cat, view.autor, view.bloque].filter(Boolean).length;
  document.getElementById('f-more').textContent = more ? `Más filtros (${more})` : 'Más filtros';
  const tags = [['tipo', view.tipo && tipoName(view.tipo)], ['fase', view.fase && faseTxt(view.fase)], ['cont', view.cont], ['cat', view.cat && catName(view.cat)], ['autor', view.autor], ['bloque', view.bloque && 'Libro: ' + view.bloque], ['q', view.q.trim() && '«' + view.q.trim() + '»']].filter(x => x[1]);
  const shown = src.filter(t => matches(t));
  document.getElementById('factive').innerHTML = `<span class="count">${shown.length} ${shown.length === 1 ? 'ejercicio' : 'ejercicios'}</span>`
    + tags.map(([k, l]) => `<button class="ftag" type="button" data-clear="${k}" aria-label="Quitar filtro ${esc(l)}">${esc(l)} <span aria-hidden="true">×</span></button>`).join('')
    + (tags.length > 1 ? '<button class="btn small ghost" type="button" id="f-clear">Quitar todos</button>' : '');
  const grid = document.getElementById('grid');
  if (!shown.length) {
    grid.innerHTML = view.tab === 'mias' && !mine.length
      ? `<div class="empty">Aquí aparecen los ejercicios que creas y tus versiones de los del club. ${window.SMB_CLOUD ? 'Se guardan en tu cuenta y los ve el resto del cuerpo técnico.' : 'Se guardan en este navegador.'} Pulsa «+ Crear ejercicio» o abre uno del club y «Hacer mi versión».</div>`
      : view.tab === 'club' && !src.length ? '<div class="empty">Todavía no hay ejercicios de otros entrenadores. Aparecen aquí solos en cuanto alguien guarda uno en «Mis ejercicios».</div>'
      : '<div class="empty">No hay ejercicios con estos filtros.</div>';
  } else grid.innerHTML = (view.tab === 'club' ? `<p class="sub grid-note">Los ejercicios que el resto del cuerpo técnico tiene en «Mis ejercicios».${canWriteBank ? ' Ábrelos y pulsa «Meter en el banco» para que entren en el banco del club.' : ' Los que la Dirección Técnica valida pasan al banco del club.'}</p>` : '')
    + shown.sort((a, b) => view.tab === 'club' ? (inBank(a) - inBank(b)) || (b._ts || 0) - (a._ts || 0) : 0).map(t => tcard(t, view.tab === 'mias' ? 'mine' : view.tab === 'club' ? 'club' : 'bank')).join('');
}
(function filters() {
  const box = document.getElementById('f-tipo');
  [{ v: '', n: 'Todos' }, ...TIPOS].forEach(o => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = o.n; b.dataset.v = o.v; if (o.d) b.title = o.d;
    b.addEventListener('click', () => { view.tipo = o.v; render(); });
    box.appendChild(b);
  });
  const fb = document.getElementById('f-fase');
  [{ v: '', n: 'Todas' }, ...FASE_NAMES.map(f => ({ v: f, n: faseTxt(f) }))].forEach(o => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip sm'; b.textContent = o.n; b.dataset.v = o.v;
    b.addEventListener('click', () => { view.fase = o.v; view.cont = ''; render(); });
    fb.appendChild(b);
  });
  [['f-cont', 'cont'], ['f-cat', 'cat'], ['f-autor', 'autor'], ['f-bloque', 'bloque']].forEach(([id, key]) => document.getElementById(id).addEventListener('change', e => { view[key] = e.target.value; render(); }));
  document.getElementById('q').addEventListener('input', e => { view.q = e.target.value; render(); });
  document.getElementById('f-dia').addEventListener('click', e => { const b = e.target.closest('[data-fdia]'); if (!b) return; view.cont = view.cont === b.dataset.fdia ? '' : b.dataset.fdia; view.fase = ''; render(); });
  document.getElementById('f-more').addEventListener('click', () => {
    const p = document.getElementById('fmore'); p.hidden = !p.hidden;
    document.getElementById('f-more').setAttribute('aria-expanded', String(!p.hidden));
  });
  document.getElementById('factive').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'f-clear') { Object.assign(view, { tipo: '', fase: '', cont: '', cat: '', autor: '', bloque: '', q: '' }); document.getElementById('q').value = ''; }
    else if (b.dataset.clear) { view[b.dataset.clear] = ''; if (b.dataset.clear === 'q') document.getElementById('q').value = ''; }
    render();
  });
  document.getElementById('tab-banco').addEventListener('click', () => { view.tab = 'banco'; render(); });
  document.getElementById('tab-mias').addEventListener('click', () => { view.tab = 'mias'; render(); });
  document.getElementById('tab-club').addEventListener('click', () => { view.tab = 'club'; render(); });
  document.getElementById('grid').addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    const t = (b.dataset.where === 'mine' ? mine : b.dataset.where === 'club' ? ejClub() : bank.tasks).find(x => x.id === b.dataset.open);
    if (t) openDetail(t, b.dataset.where);
  });
})();
const newTask = (extra = {}) => Object.assign({ id: 'mine-' + uid(), source: 'mine', title: '', bloque: '', rules: [], notes: '', fases: [], contenidos: [], tec: [], cats: [], diagram: { items: [], arrows: [] } }, extra);
document.getElementById('btn-new').addEventListener('click', () => openEditor(newTask(), 'mine-new'));

// ================= ficha de un ejercicio =================
const detail = document.getElementById('detail');
let detailState = null;
function openDetail(t, where, tab) {
  detailState = { t, where, tab: tab || 'montaje' };
  drawDetail(); detail.hidden = false; document.body.style.overflow = 'hidden'; detail.scrollTop = 0;
  const b = detail.querySelector('[data-dclose]'); if (b) b.focus();
}
function closeDetail() { detail.hidden = true; detailState = null; if (editor.hidden && sesBox.hidden) document.body.style.overflow = ''; }
function drawDetail() {
  const { t, where, tab } = detailState;
  const rules = (t.rules || []).filter(Boolean);
  const ca = t.rulesCa && t.rulesCa.length ? `<details class="ca"><summary>Original en catalán</summary><ul>${t.rulesCa.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>` : '';
  const panes = {
    montaje: `<div class="d-fig">${diagramSVG(t.diagram || {}, 'Gráfico: ' + (t.title || ''))}</div>
      ${t.approx ? `<p class="approx">${esc(t.approx)}</p>` : ''}
      <div class="d-row"><p class="d-org"><b>Organización:</b> ${esc(orgText(t.diagram) || '—')}</p><button class="btn small" type="button" data-act="view-big" data-id="${t.id}">Ver en grande</button></div>
      <details class="legend-d"><summary>¿Qué significa cada símbolo?</summary><div class="legend">${LEGEND_HTML}</div></details>`,
    normas: `<div class="task-text d-text"><div><h3>Normas</h3>${rules.length ? `<ul>${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p class="src">Sin normas escritas.</p>'}${ca}</div>
      ${t.notes ? `<div><h3>Notas y variantes</h3><p>${esc(t.notes)}</p></div>` : ''}<p class="src">${taskSrcHTML(t)}</p></div>`,
    smb: `<div class="task-text d-text">${smbBlock(t.smb) || '<p class="sub">Esta ficha todavía no tiene la parte de SMB (qué lee el jugador, preguntas, más fácil y más difícil).</p>'}</div>`,
  };
  let actions = '';
  if (where === 'bank') actions = `<button class="btn primary" type="button" data-act="add-ses">Añadir a una sesión</button><button class="btn" type="button" data-act="edit-copy">Hacer mi versión</button>`
    + (canWriteBank ? `<div class="d-dt"><span class="d-dt-k">Dirección Técnica</span><div class="actions"><button class="btn small" type="button" data-act="edit-bank">Editar y validar</button><button class="btn small ghost" type="button" data-act="del-bank">Quitar del banco</button></div></div>` : '');
  else if (where === 'club') actions = `<button class="btn primary" type="button" data-act="add-ses">Añadir a una sesión</button><button class="btn" type="button" data-act="edit-copy">Hacer mi versión</button>`
    + (canWriteBank ? `<div class="d-dt"><span class="d-dt-k">Dirección Técnica</span><div class="actions">${inBank(t) ? '<span class="sub">Ya está en el banco.</span>' : `<button class="btn small primary" type="button" data-act="to-bank">Meter en el banco</button>`}</div><p class="msg" id="d-msg" aria-live="polite"></p></div>` : '');
  else if (where === 'mine' && t.borrador) actions = `<button class="btn primary" type="button" data-act="edit-mine">Seguir editando</button><button class="btn ghost" type="button" data-act="del-mine">Borrar</button><p class="sub">Está a medias: cuando lo termines y pulses «Guardar en mis ejercicios», ${window.SMB_CLOUD ? 'lo verá el resto del cuerpo técnico y la Dirección Técnica podrá meterlo en el banco' : 'podrás usarlo en sesiones y mandarlo a la DT'}.</p>`;
  else if (where === 'mine') actions = `<button class="btn primary" type="button" data-act="add-ses">Añadir a una sesión</button><button class="btn" type="button" data-act="edit-mine">Editar</button>${canWriteBank ? (inBank(t) ? '' : '<button class="btn" type="button" data-act="to-bank">Meter en el banco</button>') : window.SMB_CLOUD ? '' : '<button class="btn" type="button" data-act="propose">Mandar a la DT</button>'}<button class="btn ghost" type="button" data-act="del-mine">Borrar</button>${window.SMB_CLOUD ? '<p class="sub">Lo ve el resto del cuerpo técnico en «Del cuerpo técnico», y la Dirección Técnica puede meterlo en el banco del club.</p>' : ''}`;
  const tabs = [['montaje', 'Montaje'], ['normas', 'Normas'], ['smb', 'En SMB']];
  detail.innerHTML = `<div class="d-wrap">
    <div class="d-bar"><button class="btn" type="button" data-dclose>← Volver</button></div>
    <header class="d-head">
      <div class="meta">${t.destacado ? `<span class="badge star">★ Destacado · ${esc(t.destacado)}</span>` : ''}<span class="badge">${esc(tipoName(t.tipo) || 'Sin clasificar')}</span>${where === 'mine' ? `<span class="badge mine">${t.borrador ? 'Borrador' : 'Mío'}</span>` : ''}${where === 'club' ? '<span class="badge mine">Del cuerpo técnico</span>' : ''}<span class="tags">${(t.fases || []).map(f => `<span class="tag">${esc(faseTxt(f))}</span>`).join('')}</span>${t.source !== 'oller' ? `<span>De ${esc(authorOf(t))}</span>` : ''}</div>
      <h2>${esc((t.num ? 'nº ' + t.num + ' · ' : '') + (t.title || 'Sin nombre'))}</h2>
      ${(t.contenidos || []).length ? `<p class="works"><b>Qué se trabaja:</b> ${t.contenidos.map(esc).join(' · ')}</p>` : ''}
      ${(t.tec || []).length ? `<p class="works"><b>Técnica y táctica individual:</b> ${t.tec.map(esc).join(' · ')}</p>` : ''}
      ${(t.cats || []).length ? `<p class="works"><b>Para:</b> ${t.cats.map(catName).join(', ')}</p>` : ''}
    </header>
    <div class="seg" role="tablist" aria-label="Partes de la ficha">${tabs.map(([k, l]) => `<button type="button" role="tab" data-dtab="${k}" aria-selected="${k === tab}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div>
    <div class="d-pane" role="tabpanel">${panes[tab]}</div>
    ${actions ? `<div class="d-actions">${actions}</div>` : ''}
  </div>`;
}
detail.addEventListener('click', e => {
  if (!detailState) return;
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-dclose')) { closeDetail(); return; }
  if (b.dataset.dtab) { detailState.tab = b.dataset.dtab; drawDetail(); return; }
  const act = b.dataset.act; if (!act || act === 'view-big') return;
  const { t } = detailState, id = t.id;
  if (act === 'add-ses') addToSession(t);
  else if (act === 'edit-copy') {
    const c = clone(t); delete c._club; delete c._ts; delete c.orig;
    c.id = 'mine-' + uid(); c.source = 'mine'; c.basedOn = t.num ? `Oller nº ${t.num}` : (t.title || 'un ejercicio del banco'); delete c.rulesCa; delete c.page;
    closeDetail(); openEditor(c, 'mine-new');
  } else if (act === 'edit-mine') { closeDetail(); openEditor(clone(t), 'mine'); }
  else if (act === 'del-mine') confirmModal('¿Borrar este ejercicio?', window.SMB_CLOUD ? 'Se borra de tu cuenta. Si ya estaba en el banco del club, allí sigue.' : 'Se borra solo de este navegador. No afecta al banco del club.', 'Borrar', () => { mine = mine.filter(x => x.id !== id); saveMine(); closeDetail(); render(); });
  else if (act === 'propose') proposeModal(t);
  else if (act === 'edit-bank') { closeDetail(); openEditor(clone(t), 'bank'); }
  else if (act === 'to-bank') { b.disabled = true; toBank(t, document.getElementById('d-msg') || document.getElementById('ed-msg')).then(ok => { if (ok) { closeDetail(); view.tab = 'banco'; render(); } else b.disabled = false; }); }
  else if (act === 'feature') {
    const month = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const tasks = bank.tasks.map(x => { if (x.id !== id) return x; const c = clone(x); if (c.destacado) delete c.destacado; else c.destacado = month; return c; });
    closeDetail(); saveBank(tasks, t.destacado ? 'Destacado quitado.' : `Destacado de ${month}: +${PTS.destacado} puntos para ${t.author || 'su autor'}.`);
  }
  else if (act === 'del-bank') confirmModal('¿Quitar este ejercicio del banco?', 'Desaparece del banco para todos los entrenadores. Sus versiones guardadas no se borran.', 'Quitar', () => { closeDetail(); saveBank(bank.tasks.filter(x => x.id !== id), 'Ejercicio quitado del banco.'); });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && detailState && modal.hidden && editor.hidden && !document.querySelector('.viewer')) closeDetail(); });

