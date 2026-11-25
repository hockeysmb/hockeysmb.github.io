// ================= ver en grande =================
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act="view-big"]'); if (!b) return;
  const id = b.dataset.id;
  const t = [...bank.tasks, ...mine].find(x => x.id === id) || (reviewTask && reviewTask.id === id ? reviewTask : null);
  if (t) openViewer(t);
});
function openViewer(t) {
  const v = document.createElement('div');
  v.className = 'viewer'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', t.title || 'Gráfico');
  v.innerHTML = `<div class="viewer-bar"><span>${esc((t.num ? 'nº ' + t.num + ' · ' : '') + (t.title || ''))}</span><button class="btn" type="button">Cerrar</button></div>
    <svg viewBox="-1 -1 102 52" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${diagramInner(t.diagram || {})}</svg>`;
  const close = () => { v.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc_); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  v.querySelector('button').onclick = close;
  v.querySelector('svg').onclick = close;
  document.addEventListener('keydown', esc_);
  document.body.appendChild(v); document.body.style.overflow = 'hidden';
  try { if (v.requestFullscreen) v.requestFullscreen().catch(() => {}); } catch (e) {}
  v.querySelector('button').focus();
}

// ================= modales =================
const modal = document.getElementById('modal'), modalCard = document.getElementById('modal-card');
function openModal(html) { modalCard.innerHTML = html; modal.hidden = false; const f = modalCard.querySelector('button, textarea, input'); if (f) f.focus(); }
function closeModal() { modal.hidden = true; modalCard.innerHTML = ''; }
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
function confirmModal(title, text, okLabel, onOk) {
  openModal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button class="btn" id="m-no" type="button">Cancelar</button><button class="btn primary" id="m-ok" type="button">${esc(okLabel)}</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelector('#m-ok').onclick = () => { closeModal(); onOk(); };
}
function encodeTask(t) {
  const payload = { v: 1, t: { title: t.title, bloque: t.bloque, rules: t.rules, notes: t.notes, smb: t.smb, tipo: t.tipo, fases: t.fases, contenidos: t.contenidos, tec: t.tec, cats: t.cats, author: t.author, basedOn: t.basedOn, diagram: t.diagram } };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return 'SMB1:' + btoa(bin);
}
function decodeTask(code) {
  const raw = code.trim().replace(/^SMB1:/, '').replace(/\s+/g, '');
  const bin = atob(raw), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const p = JSON.parse(new TextDecoder().decode(bytes));
  if (!p || !p.t || !p.t.diagram) throw new Error('bad');
  return p.t;
}
function proposeModal(t) {
  sendModal({ kind: 'ej', ref: t.id, title: t.title || 'Ejercicio sin nombre', code: encodeTask(t), head: 'Mandar a la DT',
    text: `Tu ejercicio «${t.title || 'sin nombre'}». La Dirección Técnica lo ve tal cual y puede meterlo en el banco del club (+${PTS.banco} puntos).` });
}
// ---------- mandar a la DT: un solo camino para todo ----------
const LS_ENV = 'smb-banco-envios';
function loadEnv() { try { return JSON.parse(localStorage.getItem(LS_ENV) || '[]'); } catch (e) { return []; } }
function logEnvio(kind, ref, title) {
  const env = loadEnv().filter(x => !(x.kind === kind && x.ref === ref));
  env.push({ kind, ref, title, autor: readAuthor(), date: isoToday() });
  try { localStorage.setItem(LS_ENV, JSON.stringify(env.slice(-60))); } catch (e) {}
  cloudPush('meta');
}
function sendModal(o) {
  logEnvio(o.kind, o.ref, o.title);
  if (window.SMB_CLOUD) { window.SMB_CLOUD.send(o).then(() => { toast(o.kind === 'pj' ? 'Tu personaje ya está al día en el club.' : o.kind === 'ses' ? 'Propuesta enviada a la Dirección Técnica. Síguela en Mi perfil → Propuestas.' : 'Enviado a la Dirección Técnica. Síguelo en Mi perfil → Propuestas.'); render(); }, () => toast('No se ha podido enviar. Inténtalo en un momento.')); return; }
  const wa = encodeURIComponent(o.code).length < 7000 ? `https://wa.me/?text=${encodeURIComponent(o.code)}` : '';
  openModal(`<h2>${esc(o.head)}</h2><p>${esc(o.text)}</p>
    <ol class="send-steps"><li>Copia el código.</li><li>Pégalo en un WhatsApp o un correo a la Dirección Técnica.</li><li>Sigue cómo va en Mi perfil → Envíos.</li></ol>
    <textarea class="code" id="m-code" readonly aria-label="Código para la Dirección Técnica">${esc(o.code)}</textarea>
    <p class="msg" id="m-msg" aria-live="polite"></p>
    <div class="row"><button class="btn" id="m-close" type="button">Cerrar</button>${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">Abrir WhatsApp</a>` : ''}<button class="btn primary" id="m-copy" type="button">Copiar código</button></div>`);
  modalCard.querySelector('#m-close').onclick = closeModal;
  modalCard.querySelector('#m-copy').onclick = () => copyWithFallback(o.code, modalCard.querySelector('#m-code'), modalCard.querySelector('#m-msg'), 'Código copiado. Pégalo en el mensaje a la Dirección Técnica.');
}
function envStatus(x) {
  const me = normName(x.autor || readAuthor()), H = bank.historial || [];
  if (x.kind === 'ej') {
    const t = bank.tasks.find(b => b.source !== 'oller' && normName(b.author) === me && normName(b.title) === normName(x.title));
    if (!t) return ['Enviado', 'Pendiente de que la DT lo revise'];
    if (H.some(h => h.ej && h.ej.id === t.id)) return ['Elegido de la semana', 'Lo eligió el cuerpo técnico'];
    if (t.smb && t.smb.validado) return ['Validado', 'En el banco del club, con la parte «En SMB» validada'];
    return ['En el banco', 'Ya lo ve todo el cuerpo técnico'];
  }
  if (x.kind === 'ses') {
    if (H.some(h => h.ses && h.ses.s && h.ses.s.id === x.ref)) return ['Elegida de la semana', 'Lo votó el cuerpo técnico'];
    if (S && (S.ses || []).some(c => c.s && c.s.id === x.ref)) return ['Candidata', 'Se está votando esta semana'];
    return ['Enviada', 'La DT decide si entra en la votación'];
  }
  const st = syncState(readAuthor());
  return st === 'al-dia' ? ['Al día', 'Tu personaje está en el vestuario del club'] : st === 'cambiado' ? ['Desactualizado', 'Lo has cambiado después: vuelve a mandarlo'] : ['Enviado', 'Pendiente de que la DT lo añada'];
}
function enviosHTML() {
  const env = loadEnv().slice().reverse();
  const K = { ej: 'Ejercicio', ses: 'Sesión', pj: 'Personaje' };
  return `<p class="sub">Lo que has mandado a la Dirección Técnica desde este móvil y en qué punto está.</p>
    ${env.length ? `<ul class="env-list">${env.map(x => { const [st, d] = envStatus(x), good = !/^Envi|Desact/.test(st);
      return `<li><span class="env-k">${K[x.kind] || ''}</span><span class="env-t"><b>${esc(x.title)}</b><small>${esc(fmtShort(x.date))} · ${esc(d)}</small></span><span class="env-st${good ? ' ok' : ''}">${esc(st)}</span></li>`; }).join('')}</ul>`
    : (window.SMB_CLOUD ? '<p>Todavía no has propuesto nada. Desde una sesión: «Más…» → «Proponer para la votación».</p>' : '<p>Todavía no has mandado nada. Desde un ejercicio tuyo, una sesión o tu personaje: «Mandar a la DT».</p>')}`;
}

// ================= revisar propuesta =================
let reviewTask = null;
document.getElementById('btn-review').addEventListener('click', () => {
  const out = document.getElementById('review-out');
  try {
    const rawCode = document.getElementById('review-code').value.trim();
    if (rawCode.startsWith('SMB3:')) { reviewAvatar(rawCode, out); return; }
    if (rawCode.startsWith('SMB4:')) { reviewSession(rawCode, out); return; }
    if (rawCode.startsWith('SMB5:') || rawCode.startsWith('{')) { reviewLote(rawCode, out); return; }
    reviewTask = decodeTask(rawCode);
    reviewTask.id = 'prop-' + uid(); reviewTask.source = 'mine';
    out.innerHTML = `<div class="list">${taskCard(reviewTask, 'review')}</div>
      <div class="actions" style="margin-top:12px">
        ${canWriteBank ? '<button class="btn primary" id="rv-add" type="button">Añadir al banco del club</button>' : ''}
        <button class="btn" id="rv-mine" type="button">Guardar en mis ejercicios</button>
      </div><p class="msg" id="rv-msg" aria-live="polite"></p>`;
    const add = document.getElementById('rv-add');
    if (add) add.onclick = () => {
      const t = clone(reviewTask); t.id = 'club-' + uid(); t.source = 'club'; t.updated = today(); t.bloque = t.bloque || 'Del cuerpo técnico';
      saveBank([...bank.tasks, t], 'Añadido al banco del club.', document.getElementById('rv-msg'));
    };
    document.getElementById('rv-mine').onclick = () => {
      const t = clone(reviewTask); t.id = 'mine-' + uid(); t.updated = today(); mine.push(t);
      const ok = saveMine(); const m = document.getElementById('rv-msg');
      m.className = ok ? 'msg ok' : 'msg err'; m.textContent = ok ? 'Guardado en «Mis ejercicios».' : 'Este navegador no deja guardar. Prueba con otro o fuera del modo privado.';
      render();
    };
  } catch (e) {
    out.innerHTML = '<p class="msg err">Ese código no es válido. Comprueba que se ha copiado entero, empezando por «SMB1:».</p>';
  }
});
const today = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
// ---------- varios ejercicios de una vez (un manual, una tanda): archivo .json o código SMB5: ----------
// {v: 5, nombre, autor, tasks: [...]}; cada ejercicio lleva `orig` para no meterlo dos veces.
document.getElementById('review-file').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { reviewLote(String(r.result || ''), document.getElementById('review-out')); e.target.value = ''; };
  r.readAsText(f);
});
function reviewLote(raw, out) {
  let p;
  try { p = raw.startsWith('SMB5:') ? JSON.parse(fromB64(raw.slice(5).replace(/\s+/g, ''))) : JSON.parse(raw); } catch (e) { p = null; }
  if (!p || p.v !== 5 || !Array.isArray(p.tasks) || !p.tasks.every(t => t && t.title && t.diagram)) { out.innerHTML = '<p class="msg err">Ese archivo no es una tanda de ejercicios de la app.</p>'; return; }
  const hay = new Set(bank.tasks.map(t => t.orig).filter(Boolean));
  const nuevos = p.tasks.filter(t => !t.orig || !hay.has(t.orig)), ya = p.tasks.length - nuevos.length;
  const L = nuevos.map((t, i) => Object.assign(clone(t), { id: 'lote-' + i, source: 'club', author: p.autor || t.author || '' }));
  out.innerHTML = `<div class="ses-sec"><h3 class="h-sec">${esc(p.nombre || 'Ejercicios')}</h3>
    <p class="sub">${nuevos.length} ${nuevos.length === 1 ? 'ejercicio nuevo' : 'ejercicios nuevos'}${ya ? ` · ${ya} ya ${ya === 1 ? 'estaba' : 'estaban'} en el banco` : ''}. ${nuevos.length ? 'Entran sin validar y los tienes en «Revisar».' : 'No hay nada que meter.'}</p>
    ${L.length ? `<details class="dt-more"><summary>Verlos antes</summary><div class="list">${L.map(t => taskCard(t, 'review')).join('')}</div></details>` : ''}
    <div class="actions" style="margin-top:12px">${canWriteBank && L.length ? `<button class="btn primary" id="rv-lote" type="button">Meter los ${L.length} en el banco</button>` : ''}</div>
    <p class="msg" id="rv-msg" aria-live="polite"></p></div>`;
  const b = document.getElementById('rv-lote');
  if (b) b.onclick = () => confirmModal(`¿Meter los ${L.length} en el banco?`, `Entran como ejercicios de ${p.autor || 'fuera del club'}, sin validar. Los vas aprobando en «Revisar».`, 'Meter todos', () => {
    const add = L.map(t => { const c = clone(t); c.id = 'club-' + uid(); c.updated = today(); c.smb = Object.assign({}, c.smb || {}, { validado: false }); return c; });
    b.disabled = true;
    saveBank([...bank.tasks, ...add], `${add.length} ejercicios metidos en el banco. Ya puedes revisarlos.`, document.getElementById('rv-msg')).then(ok => { if (ok) { document.getElementById('review-code').value = ''; } else b.disabled = false; });
  });
}

// ================= guardar en el banco (solo Dirección Técnica) =================
async function saveBank(tasks, okText, msgEl, extra) {
  const show = (cls, t) => { const m = msgEl || document.getElementById('ed-msg'); if (m && m.isConnected && m.offsetParent) { m.className = 'msg ' + cls; m.textContent = t; } else toast(t); };
  if (!artifactApi) { show('err', 'Esta vista no puede guardar en el banco.'); return false; }
  const before = new Set(bank.tasks.map(t => t.id));
  tasks = tasks.map(t => !before.has(t.id) && t.source !== 'oller' && !t.alta ? Object.assign({}, t, { alta: isoToday() }) : t);
  const next = Object.assign({}, bank, { updated: new Date().toISOString().slice(0, 10), tasks }, extra || {});
  if (canWriteBank) { try { Object.assign(next, calcEq(next)); } catch (e) {} }
  try {
    await artifactApi.publish({ 'data/banco.json': JSON.stringify(next) });
    bank = next; render(); show('ok', okText); return true;
  } catch (e) {
    const code = e && e.code;
    if (code === 'not_writer' || code === 'not_granted' || code === 'capability_disabled' || code === 'not_declared') {
      canWriteBank = false; render(); show('err', 'Esta vista es de solo lectura: solo la Dirección Técnica puede guardar en el banco.');
    } else if (code === 'conflict') show('err', 'Alguien ha guardado el banco a la vez. La página se está actualizando; vuelve a intentarlo.');
    else if (code === 'rate_limited') show('err', 'Demasiados guardados seguidos. Espera un momento y vuelve a guardar.');
    else if (code === 'offline') show('err', 'Sin conexión: no se ha guardado. Vuelve a guardar cuando tengas internet.');
    else show('err', 'No se ha podido guardar. Inténtalo de nuevo en un momento.');
    return false;
  }
}

