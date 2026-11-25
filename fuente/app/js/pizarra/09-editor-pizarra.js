// ================= editor =================
const editor = document.getElementById('editor'), canvas = document.getElementById('canvas');
const TOOLS = [
  { id: 'select', label: 'Mover', icon: `<path d="M8,2 L8,15 L11,12 L13.5,16.5 L15,15.7 L12.6,11.3 L16.5,11 Z" fill="var(--g-ink)"/>` },
  { sep: true },
  { id: 'atk', label: 'Atacante', icon: `<g transform="translate(13 9) scale(2.6) translate(-13 -9)">${ringSVG(13, 9, COL.atk, '')}</g>` },
  { id: 'def', label: 'Defensor', icon: `<g transform="translate(13 9) scale(2.6) translate(-13 -9)">${ringSVG(13, 9, COL.def, '')}</g>` },
  { id: 'gk', label: 'Portero', icon: `<g transform="translate(13 9) scale(2.6) translate(-13 -9)">${ringSVG(13, 9, 'var(--g-gk)', '')}</g>` },
  { id: 'coach', label: 'Entrenador', icon: `<g transform="translate(13 9) scale(2.6) translate(-13 -9)">${ringSVG(13, 9, 'var(--g-coach)', '')}</g>` },
  { id: 'ball', label: 'Bola', icon: `<circle cx="13" cy="9" r="2.6" fill="var(--g-ink)"/>` },
  { id: 'cone', mat: true, label: 'Material', icon: `<path d="M13,4 L17,13 L9,13 Z" fill="var(--g-cone)"/>` },
  { id: 'label', label: 'Texto', icon: `<text x="13" y="13.5" font-size="10" font-weight="700" text-anchor="middle" fill="var(--g-ink)" font-family="${FONT}">Aa</text>` },
  { id: 'text', label: 'Número', icon: `<text x="13" y="14" font-size="12" font-weight="700" text-anchor="middle" fill="var(--g-ink)" font-family="${FONT}">1</text>` },
  { sep: true },
  { id: 'pase', label: 'Pase', icon: `<line x1="2" y1="9" x2="19" y2="9" stroke="var(--g-ink)" stroke-width="1.5" stroke-dasharray="3 2"/><path d="M19,5.5 L25,9 L19,12.5 Z" fill="var(--g-ink)"/>` },
  { id: 'tiro', label: 'Tiro', icon: `<line x1="2" y1="7.5" x2="20" y2="7.5" stroke="var(--g-ink)" stroke-width="1.2"/><line x1="2" y1="10.5" x2="20" y2="10.5" stroke="var(--g-ink)" stroke-width="1.2"/><path d="M19,5 L25,9 L19,13 Z" fill="var(--g-ink)"/>` },
  { id: 'cond', label: 'Conducción', icon: `<line x1="2" y1="9" x2="19" y2="9" stroke="var(--g-atk)" stroke-width="2" stroke-dasharray="0.3 2.6" stroke-linecap="round"/><path d="M19,5.5 L25,9 L19,12.5 Z" fill="var(--g-atk)"/>` },
  { id: 'draw', label: 'Dibujo libre', icon: `<path d="M3,13 C7,3 11,15 15,7 S21,4 24,9" fill="none" stroke="var(--g-coach)" stroke-width="1.8" stroke-linecap="round"/>` },
  { id: 'mov', label: 'Movimiento', icon: `<line x1="2" y1="9" x2="19" y2="9" stroke="var(--g-atk)" stroke-width="1.6"/><path d="M19,5.5 L25,9 L19,12.5 Z" fill="var(--g-atk)"/>` },
];
const ARROW_TOOLS = ['pase', 'tiro', 'cond', 'mov'];
const ITEM_TOOLS = ['atk', 'def', 'gk', 'coach', 'ball', 'text', 'label', ...MATERIALS];
let drawPref = { color: 'red', head: false }, conePref = 'azul', matPref = 'cone';
let ed = null; // { task, mode, tool, sel:{kind,id}, drawing:[], history:[], arrowTeam }

(function buildTools() {
  const box = document.getElementById('ed-tools');
  box.innerHTML = TOOLS.map(t => t.sep ? '<span class="sep" aria-hidden="true"></span>'
    : `<button class="tool" type="button" id="tool-${t.mat ? 'mat' : t.id}" data-tool="${t.mat ? 'mat' : t.id}" aria-pressed="false"><svg viewBox="0 0 26 18" aria-hidden="true">${t.icon}</svg>${t.label}</button>`).join('')
    + `<span class="sep" aria-hidden="true"></span>
       <button class="tool" type="button" id="tool-undo">Deshacer</button>
       <button class="tool" type="button" id="tool-redo" disabled>Rehacer</button>
       <button class="tool" type="button" id="tool-del" disabled>Borrar selección</button>
       <button class="tool" type="button" id="tool-finish" hidden>Terminar flecha</button>`;
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tool) setTool(b.dataset.tool);
    else if (b.id === 'tool-undo') undo();
    else if (b.id === 'tool-redo') redo();
    else if (b.id === 'tool-del') deleteSel();
    else if (b.id === 'tool-finish') finishArrow();
  });
})();

function openEditor(task, mode, opts = {}) {
  task.diagram = task.diagram || { items: [], arrows: [] };
  (task.diagram.items || []).forEach(i => { if (!i.id) i.id = uid(); });
  (task.diagram.arrows || []).forEach(a => { if (!a.id) a.id = uid(); });
  ed = { task, mode, tool: 'select', sel: null, drawing: null, history: [], arrowTeam: 'atk', drag: null, fromSes: opts.fromSes ?? null };
  document.getElementById('ed-title').textContent = opts.title || (mode === 'bank' ? 'Editar en el banco del club' : (mode === 'mine-new' ? 'Mi versión' : 'Editar mi versión'));
  document.getElementById('ed-save-mine').textContent = ed.fromSes != null ? 'Guardar en mis ejercicios y usar en la sesión' : 'Guardar en mis ejercicios';
  document.getElementById('ed-save-newbank').hidden = !(mode === 'mine-new' && canWriteBank);
  document.getElementById('ed-save-newbank').textContent = ed.fromSes != null ? 'Guardar en el banco y usar en la sesión' : 'Guardar en el banco del club';
  document.getElementById('f-title').value = task.title || '';
  document.getElementById('f-rules').value = (task.rules || []).join('\n');
  document.getElementById('f-notes').value = task.notes || '';
  // en el banco es el autor de la ficha; en «mis ejercicios», quien lo guarda
  document.getElementById('f-author').value = mode === 'bank' ? (task.author || '') : (readAuthor() || task.author || '');
  document.getElementById('f-author-l').textContent = mode === 'bank' ? 'Autor de la ficha' : 'Tu nombre';
  const m = task.smb || {};
  document.getElementById('f-smb-modelo').value = m.modelo || '';
  document.getElementById('f-smb-lee').value = m.lee || '';
  document.getElementById('f-smb-q').value = (m.preguntas || []).join('\n');
  document.getElementById('f-smb-facil').value = m.facil || '';
  document.getElementById('f-smb-dificil').value = m.dificil || '';
  document.getElementById('f-smb-ok').checked = !!m.validado;
  document.getElementById('f-smb-ok-l').hidden = mode !== 'bank';
  document.getElementById('ed-save-mine').hidden = mode === 'bank';
  document.getElementById('ed-save-draft').hidden = mode === 'bank';
  document.getElementById('ed-save-bank').hidden = mode !== 'bank';
  document.getElementById('ed-msg').textContent = '';
  document.getElementById('ed-skip').hidden = true;
  if (task.borrador && !opts.title) document.getElementById('ed-title').textContent = 'Seguir el ejercicio a medias';
  editor.hidden = false; document.body.style.overflow = 'hidden';
  setTool('select'); drawCanvas(); drawClass(); edNota(); edRv(true);
  ed.sig = edSig();
}
function drawClass() {
  const t = ed.task, box = document.getElementById('ed-class');
  t.fases = t.fases || []; t.contenidos = t.contenidos || []; t.tec = t.tec || []; t.cats = t.cats || [];
  if (!ed.tecOpen) ed.tecOpen = TEC_NAMES.filter(f => t.tec.some(c => tecList(f).includes(c)));
  const pressed = c => `aria-pressed="${c}"`;
  box.innerHTML = `<h3>Dónde va este ejercicio</h3>
    <div class="grp"><b>Tipo de tarea</b><p class="sub">La parte de la sesión en la que encaja, según la plantilla del club.</p><div class="opts">
      ${TIPOS.map(o => `<button class="chip tipo-opt" type="button" data-tipo="${o.v}" ${pressed(t.tipo === o.v)}>${esc(o.n)}<small>${esc(o.d)}</small></button>`).join('')}</div></div>
    <div class="grp"><b>Fase del juego</b><p class="sub">Puedes marcar más de una.</p><div class="opts">
      ${FASE_NAMES.map(f => `<button class="chip sm" type="button" data-fase="${esc(f)}" ${pressed(t.fases.includes(f))}>${esc(f)}</button>`).join('')}</div></div>
    ${t.fases.length ? `<div class="grp"><b>Qué se trabaja</b><p class="sub">Del modelo de juego. Marca lo principal, no todo.</p>
      ${t.fases.map(f => `<div class="opts" role="group" aria-label="${esc(f)}"><span class="sub">${esc(f)}:</span>${FASES[f].map(c => `<button class="chip sm" type="button" data-cont="${esc(c)}" data-cf="${esc(f)}" ${pressed(t.contenidos.includes(c))}>${esc(c)}</button>`).join('')}</div>`).join('')}</div>` : ''}
    <div class="grp tec-grp"><b>Técnica y táctica individual</b><p class="sub">De los objetivos por categoría del club. Marca para qué categoría es y lo principal que se trabaja.</p>
      <div class="opts" role="group" aria-label="Categoría"><span class="sub">Categoría:</span>${CATS.map(([k, n]) => `<button class="chip sm" type="button" data-tcat="${k}" ${pressed(t.cats.includes(k))}>${esc(n)}</button>`).join('')}</div>
      <div class="opts" role="group" aria-label="Fundamento técnico"><span class="sub">Fundamento:</span>${TEC_NAMES.map(f => { const k = t.tec.filter(c => tecList(f).includes(c)).length; return `<button class="chip sm tf" type="button" data-tf="${esc(f)}" aria-expanded="${ed.tecOpen.includes(f)}">${esc(f)}${k ? ` · ${k}` : ''}</button>`; }).join('')}</div>
      ${ed.tecOpen.map(f => { const L = tecList(f, t.cats), extra = t.tec.filter(c => tecList(f).includes(c) && !L.includes(c)); return `<div class="opts" role="group" aria-label="${esc(f)}"><span class="sub">${esc(f)}${t.cats.length ? '' : ' (todas las categorías)'}:</span>${[...L, ...extra].map(c => `<button class="chip sm" type="button" data-tec="${esc(c)}" ${pressed(t.tec.includes(c))}>${esc(c)}</button>`).join('')}</div>`; }).join('')}
    </div>`;
  edRv();
  box.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => { t.tipo = b.dataset.tipo; drawClass(); });
  box.querySelectorAll('[data-tcat]').forEach(b => b.onclick = () => { const k = b.dataset.tcat; t.cats = t.cats.includes(k) ? t.cats.filter(x => x !== k) : CATS.map(c => c[0]).filter(x => x === k || t.cats.includes(x)); drawClass(); });
  box.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => { const f = b.dataset.tf; ed.tecOpen = ed.tecOpen.includes(f) ? ed.tecOpen.filter(x => x !== f) : [...ed.tecOpen, f]; drawClass(); });
  box.querySelectorAll('[data-tec]').forEach(b => b.onclick = () => { const c = b.dataset.tec; t.tec = t.tec.includes(c) ? t.tec.filter(x => x !== c) : [...t.tec, c]; drawClass(); });
  box.querySelectorAll('[data-fase]').forEach(b => b.onclick = () => {
    const f = b.dataset.fase;
    if (t.fases.includes(f)) {
      t.fases = t.fases.filter(x => x !== f);
      const still = new Set(t.fases.flatMap(x => FASES[x]));
      t.contenidos = t.contenidos.filter(c => still.has(c));
    } else t.fases = FASE_NAMES.filter(x => x === f || t.fases.includes(x));
    drawClass();
  });
  box.querySelectorAll('[data-cont]').forEach(b => b.onclick = () => {
    const c = b.dataset.cont;
    t.contenidos = t.contenidos.includes(c) ? t.contenidos.filter(x => x !== c) : [...t.contenidos, c];
    drawClass();
  });
}
function setBig(on) {
  editor.classList.toggle('big', on);
  const b = document.getElementById('ed-big');
  b.setAttribute('aria-pressed', String(on));
  b.textContent = on ? 'Volver al formulario' : 'Pizarra grande';
  try {
    if (on && editor.requestFullscreen && !document.fullscreenElement) editor.requestFullscreen().catch(() => {});
    else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch (e) {}
  editor.scrollTop = 0;
}
// pizarra a pantalla completa: en vertical se gira la pista para que ocupe todo el alto
const bdPortrait = () => editor.classList.contains('board') && window.innerHeight > window.innerWidth;
const BD_GROUPS = [['jug', 'Jugadores', ['atk', 'def', 'gk', 'coach', 'ball']], ['mat', 'Material', MATERIALS], ['fle', 'Flechas', ['pase', 'tiro', 'cond', 'mov', 'draw']], ['txt', 'Texto', ['label', 'text']]];
const bdIcon = id => MATERIALS.includes(id) ? matIcon(id) : (TOOLS.find(t => t.id === id) || {}).icon || '';
const bdName = id => MATERIALS.includes(id) ? MAT_NAMES[id] : (TOOLS.find(t => t.id === id) || {}).label || '';
let bdOpen = '';
function drawBoard() {
  if (!ed) return;
  const t = ed.tool, bar = document.getElementById('bd-bar'), sh = document.getElementById('bd-sheet');
  bar.innerHTML = `<button class="bd-t" type="button" data-bd="select" aria-pressed="${t === 'select'}"><svg viewBox="0 0 26 18" aria-hidden="true">${bdIcon('select')}</svg><span>Mover</span></button>`
    + BD_GROUPS.map(([k, l, ids]) => { const on = ids.includes(t); return `<button class="bd-t" type="button" data-bdg="${k}" aria-pressed="${on}" aria-expanded="${bdOpen === k}"><svg viewBox="0 0 26 18" aria-hidden="true">${bdIcon(on ? t : ids[0])}</svg><span>${esc(on ? bdName(t) : l)}</span></button>`; }).join('');
  const G = BD_GROUPS.find(g => g[0] === bdOpen);
  sh.hidden = !G;
  sh.innerHTML = G ? `<div class="bd-sh-h"><span>${esc(G[1])}</span><button type="button" data-bd="shx" aria-label="Cerrar">×</button></div><div class="bd-grid">${G[2].map(id => `<button class="bd-pick" type="button" data-bdt="${id}" aria-pressed="${t === id}"><svg viewBox="0 0 26 18" aria-hidden="true">${bdIcon(id)}</svg>${esc(bdName(id))}</button>`).join('')}</div>` : '';
  document.getElementById('bd-cur').textContent = t === 'select' ? 'Mover y seleccionar' : 'Poniendo: ' + bdName(t);
  const tile = (id, l, cls) => `<button class="bd-tile${cls ? ' ' + cls : ''}" type="button" ${id === 'select' ? 'data-bd="select"' : `data-bdt="${id}"`} aria-pressed="${t === id}"><svg viewBox="0 0 26 18" aria-hidden="true">${bdIcon(id)}</svg><span>${esc(l)}</span></button>`;
  document.getElementById('bd-panel').innerHTML = tile('select', 'Mover o elegir', 'wide')
    + BD_GROUPS.map(([k, l, ids]) => `<p class="bd-g">${esc(l)}</p><div class="bd-tiles">${ids.map(id => tile(id, bdName(id))).join('')}</div>`).join('');
}
const bdWide = () => window.matchMedia('(min-width: 900px) and (min-height: 560px)').matches;
const bdRail = () => !bdWide() && window.matchMedia('(max-height: 540px) and (orientation: landscape) and (pointer: coarse), (max-height: 540px) and (orientation: landscape) and (max-width: 1000px)').matches;
function bdState() {
  if (!ed) return;
  const q = k => document.querySelector(`#bd-top [data-bd="${k}"]`);
  q('undo').disabled = !ed.history.length; q('redo').disabled = !(ed.future || []).length; q('del').disabled = !ed.sel;
  document.querySelector('.bd-finish').hidden = true;
  const d = ed.task.diagram, emp = document.getElementById('bd-empty'), empty = !((d.items || []).length || (d.arrows || []).length);
  emp.hidden = !empty || !editor.classList.contains('board') || ed.tool !== 'select';
  if (!emp.hidden) emp.textContent = bdWide() ? 'Elige a la izquierda qué quieres poner (un jugador, un cono, una flecha…) y pulsa en la pista.' : bdRail() ? 'Elige a la derecha qué quieres poner y toca la pista.' : 'Elige abajo qué quieres poner y toca la pista.';
}
function setBoard(on) {
  editor.classList.toggle('board', on);
  bdOpen = '';
  try {
    if (on && !bdWide() && editor.requestFullscreen && !document.fullscreenElement) editor.requestFullscreen().catch(() => {});
    else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch (e) {}
  if (ed) { drawCanvas(); drawBoard(); }
  editor.scrollTop = 0;
}
editor.addEventListener('click', e => {
  const b = e.target.closest('[data-bd], [data-bdg], [data-bdt]'); if (!b || !ed) return;
  if (b.dataset.bdg) { bdOpen = bdOpen === b.dataset.bdg ? '' : b.dataset.bdg; drawBoard(); return; }
  if (b.dataset.bdt) { bdOpen = ''; setTool(b.dataset.bdt); return; }
  const a = b.dataset.bd;
  if (a === 'open') setBoard(true);
  else if (a === 'done') setBoard(false);
  else if (a === 'select') { bdOpen = ''; setTool('select'); }
  else if (a === 'shx') { bdOpen = ''; drawBoard(); }
  else if (a === 'undo') undo();
  else if (a === 'redo') redo();
  else if (a === 'del') deleteSel();
  else if (a === 'finish') finishArrow();
});
// en el móvil, tocar la pista pequeña abre la pizarra grande
canvas.addEventListener('pointerdown', e => {
  if (!ed || editor.classList.contains('board')) return;
  e.preventDefault(); e.stopImmediatePropagation(); setBoard(true);
}, true);
window.addEventListener('resize', () => { if (ed && editor.classList.contains('board')) { drawCanvas(); drawBoard(); } });
document.getElementById('ed-big').addEventListener('click', () => setBoard(!editor.classList.contains('board')));
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && editor.classList.contains('board')) setBoard(false); });
// firma de lo que hay en el editor, para saber si se va a perder algo al cerrar
function edSig() { const v = id => (document.getElementById(id) || {}).value || ''; return ed ? JSON.stringify([ed.task.diagram, ed.task.tipo, ed.task.fases, ed.task.contenidos, ed.task.tec, ed.task.cats, ['f-title', 'f-rules', 'f-notes', 'f-smb-modelo', 'f-smb-lee', 'f-smb-q', 'f-smb-facil', 'f-smb-dificil'].map(v)]) : ''; }
function saveDraft() {
  if (ed.drawing) finishArrow();
  const t = clone(collectText()); t.borrador = true; t.ts = Date.now();
  const i = mine.findIndex(x => x.id === t.id);
  if (i >= 0) mine[i] = t; else mine.push(t);
  if (!saveMine()) { toast('Este navegador no deja guardar.'); return false; }
  const fromSes = ed.fromSes; closeEditor();
  toast(`Guardado a medias${t.title ? ': «' + t.title + '»' : ''}. Lo tienes en Mis ejercicios para seguir.`);
  if (fromSes == null) { view.tab = 'mias'; navigate('ejercicios'); }
  return true;
}
function closeEditor() {
  const back = !!(ed && ed.fromSes != null && sesEd);
  if (editor.classList.contains('big')) setBig(false); if (editor.classList.contains('board')) setBoard(false); editor.hidden = true; document.body.style.overflow = ''; ed = null;
  if (back) { sesBox.hidden = false; document.body.style.overflow = 'hidden'; }
}
document.querySelector('#editor .ed-side').addEventListener('input', () => edRv());
document.getElementById('ed-cancel').addEventListener('click', () => {
  if (serieGet()) { serieSet(null); toast('Serie parada. Puedes seguir otro día desde Dirección Técnica.'); closeEditor(); return; }
  if (!ed || ed.sig === edSig()) { closeEditor(); return; }
  const mineMode = ed.mode !== 'bank';
  openModal(`<h2>¿Salir sin guardar?</h2><p>Has hecho cambios en este ejercicio.${mineMode ? ' Puedes guardarlo a medias y seguir otro día desde «Mis ejercicios».' : ''}</p>
    <div class="row"><button class="btn" id="m-keep" type="button">Seguir editando</button><button class="btn ghost" id="m-drop" type="button">Salir sin guardar</button>${mineMode ? '<button class="btn primary" id="m-draft" type="button">Guardar a medias</button>' : ''}</div>`);
  modalCard.querySelector('#m-keep').onclick = closeModal;
  modalCard.querySelector('#m-drop').onclick = () => { closeModal(); closeEditor(); };
  const md = modalCard.querySelector('#m-draft'); if (md) md.onclick = () => { closeModal(); saveDraft(); };
});
document.getElementById('ed-save-draft').addEventListener('click', () => { if (ed) saveDraft(); });
document.getElementById('ed-skip').addEventListener('click', () => { if (ed && !serieDone(ed.task.id)) closeEditor(); });
function readAuthor() { try { return localStorage.getItem('smb-banco-autor') || ''; } catch (e) { return ''; } }

function matIcon(k) {
  const it = { type: k, x: 13, y: 9, c: conePref, rot: 0 };
  if (k === 'cone') return `<path d="M13,4 L17,13 L9,13 Z" fill="${CONE_COL[conePref]}"${coneStroke(conePref).replace('0.12', '0.8')}/>`;
  if (k === 'bidon') return `<g transform="translate(13 9) scale(3.2) translate(-13 -9)">${bidonSVG(13, 9)}</g>`;
  if (k === 'goal') return `<path d="M16,3.5 A5.5,5.5 0 0 0 16,14.5 Z" fill="#fff" stroke="var(--g-goal)" stroke-width="1.4"/>`;
  return `<g transform="translate(13 9) scale(${k === 'escalera' ? 2.2 : 3.4}) translate(-13 -9)">${matSVG(it)}</g>`;
}
function paintMatTool() { const b = document.getElementById('tool-mat'); if (b) b.querySelector('svg').innerHTML = matIcon(matPref); }
function setTool(t) {
  if (ed.drawing) finishArrow();
  if (t === 'mat') t = matPref;
  if (MATERIALS.includes(t)) { matPref = t; paintMatTool(); }
  ed.tool = t;
  document.querySelectorAll('#ed-tools .tool[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t || (b.dataset.tool === 'mat' && MATERIALS.includes(t)))));
  const hints = {
    select: 'Arrastra para mover. Pulsa algo para elegirlo o borrarlo. En una flecha, arrastra sus puntos: el del medio la curva.',
    atk: 'Pulsa en la pista para colocar un atacante. Se numera solo; puedes cambiar el número abajo.',
    def: 'Pulsa en la pista para colocar un defensor. Se numera solo; puedes cambiar el número abajo.',
    gk: 'Pulsa en la pista para colocar un portero.', coach: 'Pulsa en la pista para colocar al entrenador.',
    ball: 'Pulsa en la pista para colocar una bola.', cone: 'Elige el color abajo y pulsa en la pista para colocar un cono.', bidon: 'Pulsa en la pista para colocar un bidón.',
    goal: 'Pulsa en la pista para colocar una portería portátil. Abajo puedes girarla en cualquier dirección.',
    chino: 'Elige el color abajo y pulsa en la pista para colocar un chino.', aro: 'Elige el color abajo y pulsa en la pista para colocar un aro.', pica: 'Elige el color abajo y pulsa en la pista para colocar una pica.',
    valla: 'Pulsa en la pista para colocar una valla. Abajo eliges el color y la giras.', stick: 'Pulsa en la pista para colocar un stick en el suelo. Abajo puedes girarlo.', escalera: 'Pulsa en la pista para colocar una escalera de coordinación. Abajo puedes girarla.',
    label: 'Pulsa en la pista donde quieras el texto y escríbelo abajo. Por ejemplo: «Zona 1», «salida», «3 toques».',
    text: 'Pulsa en la pista para poner un número de orden. Abajo puedes cambiarlo.',
    pase: ARROW_HINT.pase,
    tiro: ARROW_HINT.tiro,
    cond: ARROW_HINT.cond,
    draw: 'Arrastra el dedo o el ratón sobre la pista para dibujar. Elige abajo el color y si lleva punta de flecha.',
    mov: ARROW_HINT.mov,
  };
  document.getElementById('ed-hint').textContent = hints[t] || '';
  if (t !== 'select' && ed.sel) { ed.sel = null; drawCanvas(); }
  drawProps(); drawBoard();
}
function snapshot() { ed.history.push(JSON.stringify(ed.task.diagram)); if (ed.history.length > 60) ed.history.shift(); ed.future = []; }
function undo() { if (!ed.history.length) return; (ed.future = ed.future || []).push(JSON.stringify(ed.task.diagram)); ed.task.diagram = JSON.parse(ed.history.pop()); ed.sel = null; ed.drawing = null; drawCanvas(); drawProps(); }
function redo() { if (!(ed.future || []).length) return; ed.history.push(JSON.stringify(ed.task.diagram)); ed.task.diagram = JSON.parse(ed.future.pop()); ed.sel = null; ed.drawing = null; drawCanvas(); drawProps(); }
function deleteSel() {
  if (!ed.sel) return; snapshot();
  const d = ed.task.diagram;
  if (ed.sel.kind === 'item') d.items = d.items.filter(i => i.id !== ed.sel.id);
  else d.arrows = d.arrows.filter(a => a.id !== ed.sel.id);
  ed.sel = null; drawCanvas(); drawProps();
}
function nextNumber(type) {
  const used = ed.task.diagram.items.filter(i => i.type === type && i.n).map(i => +i.n || 0);
  return String(used.length ? Math.max(...used) + 1 : 1);
}
function svgPoint(evt) {
  const pt = canvas.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform((document.getElementById('cv-rot') || canvas).getScreenCTM().inverse());
  return [Math.round(Math.max(-1, Math.min(101, p.x)) * 10) / 10, Math.round(Math.max(-1, Math.min(51, p.y)) * 10) / 10];
}
function drawCanvas() {
  if (!ed) return;
  const d = ed.task.diagram;
  const attrs = (kind, obj) => `data-kind="${kind}" data-id="${obj.id}" style="cursor:${ed.tool === 'select' ? 'grab' : 'crosshair'}"`;
  let html = diagramInner(d, { attrs, pid: 'net-ed' });
  if (ed.sel) {
    if (ed.sel.kind === 'item') {
      const it = d.items.find(i => i.id === ed.sel.id);
      if (it) html += `<circle cx="${it.x}" cy="${it.y}" r="2.6" fill="none" stroke="var(--g-sel)" stroke-width="0.3" stroke-dasharray="0.8 0.5" pointer-events="none"/>`;
    } else {
      const a = d.arrows.find(x => x.id === ed.sel.id);
      if (a && a.kind === 'draw') html += (`<path d="${curvePath(a.pts)}" fill="none" stroke="var(--g-sel)" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round" pointer-events="none"/>`);
      else if (a) {
        a.pts.forEach((p, i) => { html += `<circle cx="${p[0]}" cy="${p[1]}" r="1.1" fill="#ffffff" stroke="var(--g-sel)" stroke-width="0.35" data-kind="handle" data-id="${a.id}" data-i="${i}" style="cursor:move"/>`; });
        if (a.pts.length === 2) { const m = [(a.pts[0][0] + a.pts[1][0]) / 2, (a.pts[0][1] + a.pts[1][1]) / 2]; html += `<circle cx="${m[0]}" cy="${m[1]}" r="0.95" fill="var(--g-sel)" fill-opacity=".25" stroke="var(--g-sel)" stroke-width="0.3" stroke-dasharray="0.5 0.35" data-kind="handle" data-id="${a.id}" data-i="m" style="cursor:move"><title>Arrastra para curvar</title></circle>`; }
      }
    }
  }
  if (ed.free && ed.free.length > 1) html += arrowSVG({ kind: 'draw', color: drawPref.color, head: drawPref.head, pts: ed.free }, 'pointer-events="none"');
  if (ed.drawing && ed.drawing.pts.length) {
    const tmp = { kind: ed.drawing.kind, team: ed.arrowTeam, pts: ed.drawing.pts };
    html += ed.drawing.pts.length > 1 ? arrowSVG(tmp, 'opacity="0.7" pointer-events="none"') : '';
    html += `<circle cx="${ed.drawing.pts[0][0]}" cy="${ed.drawing.pts[0][1]}" r="0.7" fill="var(--g-sel)" pointer-events="none"/>`;
  }
  const rot = bdPortrait();
  canvas.setAttribute('viewBox', rot ? '-2 -2 54 104' : '-2 -2 104 54');
  // con la pista girada, los números y textos se enderezan para leerlos de pie
  if (rot) html = html.replace(/<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"/g, (m, x, y, f) => `${m} transform="rotate(-90 ${x} ${(+y - f * 0.35).toFixed(2)})"`);
  canvas.innerHTML = rot ? `<g id="cv-rot" transform="translate(50 0) rotate(90)">${html}</g>` : html;
  document.getElementById('tool-del').disabled = !ed.sel;
  bdState();
  document.getElementById('tool-undo').disabled = !ed.history.length;
  document.getElementById('tool-redo').disabled = !(ed.future || []).length;
  document.getElementById('tool-finish').hidden = true;
  if (!editor.hidden) edRv();
}
function drawProps() {
  const box = document.getElementById('props'); if (!ed) return;
  const d = ed.task.diagram;
  let html = '';
  const colorChips = (cur, attr) => `<span>Color:</span>${Object.keys(DRAW_COL).map(k => `<button class="chip" type="button" ${attr}="${k}" aria-pressed="${cur === k}"><svg viewBox="0 0 10 10" width="12" height="12" aria-hidden="true" style="vertical-align:-1px;margin-right:5px"><circle cx="5" cy="5" r="4.5" fill="${DRAW_COL[k]}"/></svg>${DRAW_NAMES[k]}</button>`).join('')}`;
  const coneChips = cur => `<span>Color:</span>${Object.keys(CONE_COL).map(k => `<button class="chip" type="button" data-ccol="${k}" aria-pressed="${cur === k}"><svg viewBox="0 0 10 10" width="12" height="12" aria-hidden="true" style="vertical-align:-1px;margin-right:5px"><path d="M5,0.6 L9.4,9.2 L0.6,9.2 Z" fill="${CONE_COL[k]}" stroke="#2b2b2b" stroke-width="${k === 'blanco' || k === 'amarillo' ? 0.8 : 0}"/></svg>${CONE_NAMES[k][0]}</button>`).join('')}`;
  const selItem = ed.sel && ed.sel.kind === 'item' ? d.items.find(i => i.id === ed.sel.id) : null;
  const matChips = cur => `<span>Material:</span>${MATERIALS.map(k => `<button class="chip mat-chip" type="button" data-mat="${k}" aria-pressed="${cur === k}"><svg viewBox="0 0 26 18" width="22" height="15" aria-hidden="true">${matIcon(k)}</svg>${esc(MAT_NAMES[k])}</button>`).join('')}`;
  const rotChips = (r, isGoal) => `<span>${isGoal ? 'Hacia dónde mira la portería:' : 'Orientación:'}</span>
        ${isGoal ? `<button class="chip" type="button" data-rot="180" aria-pressed="${r === 180}">← Izquierda</button>
        <button class="chip" type="button" data-rot="0" aria-pressed="${r === 0}">Derecha →</button>
        <button class="chip" type="button" data-rot="270" aria-pressed="${r === 270}">↑ Arriba</button>
        <button class="chip" type="button" data-rot="90" aria-pressed="${r === 90}">Abajo ↓</button>`
        : `<button class="chip" type="button" data-rot="0" aria-pressed="${r === 0 || r === 180}">Horizontal</button><button class="chip" type="button" data-rot="90" aria-pressed="${r === 90 || r === 270}">Vertical</button><button class="chip" type="button" data-rot="45" aria-pressed="${r === 45}">Diagonal ↗</button><button class="chip" type="button" data-rot="135" aria-pressed="${r === 135}">Diagonal ↘</button>`}
        <label for="p-rot" class="rot-l">Giro libre <output id="p-rot-v">${r}°</output></label>
        <input type="range" id="p-rot" min="0" max="355" step="5" value="${r}">`;
  if (MATERIALS.includes(ed.tool)) {
    html += matChips(ed.tool) + (COLORED.includes(ed.tool) ? coneChips(conePref) : '') + (selItem && ROTATABLE.includes(selItem.type) ? rotChips(selItem.type === 'goal' ? goalRot(selItem) : rotOf(selItem), selItem.type === 'goal') : '') + '<span class="hint">Para cambiar el color de uno ya puesto: «Mover», tócalo y elige el color.</span>';
  } else if (ed.tool === 'draw') {
    html += colorChips(drawPref.color, 'data-dcol') + `<button class="chip" type="button" id="p-dhead" aria-pressed="${drawPref.head}">Con punta de flecha</button>`;
  } else if (ARROW_TOOLS.includes(ed.tool) && (ed.tool === 'cond' || ed.tool === 'mov')) {
    html += `<span>Color de la flecha:</span>
      <button class="chip" type="button" data-team="atk" aria-pressed="${ed.arrowTeam === 'atk'}">Atacante</button>
      <button class="chip" type="button" data-team="def" aria-pressed="${ed.arrowTeam === 'def'}">Defensor</button>`;
  } else if (ed.sel && ed.sel.kind === 'item') {
    const it = d.items.find(i => i.id === ed.sel.id);
    if (it && ['atk', 'def'].includes(it.type)) html += `<label for="p-n">Número</label><input type="text" id="p-n" maxlength="3" value="${esc(it.n || '')}"><span class="hint">Déjalo vacío para un jugador sin número.</span>`;
    if (it && it.type === 'text') html += `<label for="p-t">Número</label><input type="text" id="p-t" maxlength="4" value="${esc(it.text || '')}">`;
    if (it && it.type === 'label') html += `<label for="p-l">Texto</label><input type="text" id="p-l" maxlength="40" value="${esc(it.text || '')}"><span class="hint">Arrástralo para colocarlo donde quieras.</span>`;
    if (it && COLORED.includes(it.type)) html += coneChips(coneKey(it));
    if (it && ROTATABLE.includes(it.type)) html += rotChips(it.type === 'goal' ? goalRot(it) : rotOf(it), it.type === 'goal');
  } else if (ed.sel && ed.sel.kind === 'arrow') {
    const a = d.arrows.find(x => x.id === ed.sel.id);
    if (a && (a.kind === 'cond' || a.kind === 'mov')) html += `<span>Color:</span>
      <button class="chip" type="button" data-arrow-team="atk" aria-pressed="${a.team !== 'def'}">Atacante</button>
      <button class="chip" type="button" data-arrow-team="def" aria-pressed="${a.team === 'def'}">Defensor</button>`;
    if (a && a.kind === 'draw') html += colorChips(a.color || 'ink', 'data-acol') + `<button class="chip" type="button" id="p-ahead" aria-pressed="${!!a.head}">Con punta de flecha</button>`;
    if (a && a.kind === 'pase') html += `<button class="chip" type="button" id="p-both" aria-pressed="${!!a.both}">Ida y vuelta (pared)</button>`;
    html += `<span class="hint">${a && a.kind === 'draw' ? 'Arrastra el trazo para moverlo. «Borrar selección» lo quita.' : 'Arrastra los puntos blancos para cambiar el recorrido.'}</span>`;
  }
  box.innerHTML = html;
  box.querySelectorAll('[data-team]').forEach(b => b.onclick = () => { ed.arrowTeam = b.dataset.team; drawProps(); drawCanvas(); });
  box.querySelectorAll('[data-arrow-team]').forEach(b => b.onclick = () => { const a = d.arrows.find(x => x.id === ed.sel.id); if (a) { snapshot(); a.team = b.dataset.arrowTeam; drawCanvas(); drawProps(); } });
  const pn = box.querySelector('#p-n'); if (pn) pn.oninput = () => { const it = d.items.find(i => i.id === ed.sel.id); if (it) { it.n = pn.value.trim(); drawCanvas(); } };
  const pt = box.querySelector('#p-t'); if (pt) pt.oninput = () => { const it = d.items.find(i => i.id === ed.sel.id); if (it) { it.text = pt.value; drawCanvas(); } };
  const pl = box.querySelector('#p-l'); if (pl) { let sn = false; pl.oninput = () => { const it = d.items.find(i => i.id === ed.sel.id); if (it) { if (!sn) { snapshot(); sn = true; } it.text = pl.value; drawCanvas(); } }; }
  box.querySelectorAll('[data-mat]').forEach(b => b.onclick = () => setTool(b.dataset.mat));
  box.querySelectorAll('[data-dcol]').forEach(b => b.onclick = () => { drawPref.color = b.dataset.dcol; drawProps(); });
  box.querySelectorAll('[data-ccol]').forEach(b => b.onclick = () => {
    const k = b.dataset.ccol; conePref = k; paintMatTool();
    const it = !MATERIALS.includes(ed.tool) && ed.sel && ed.sel.kind === 'item' && d.items.find(i => i.id === ed.sel.id && COLORED.includes(i.type));
    if (it) { snapshot(); if (k === 'azul') delete it.c; else it.c = k; drawCanvas(); }
    drawProps();
  });
  const dh = box.querySelector('#p-dhead'); if (dh) dh.onclick = () => { drawPref.head = !drawPref.head; drawProps(); };
  const selArrow = () => ed.sel && d.arrows.find(x => x.id === ed.sel.id);
  box.querySelectorAll('[data-acol]').forEach(b => b.onclick = () => { const a = selArrow(); if (a) { snapshot(); a.color = b.dataset.acol; drawPref.color = a.color; drawCanvas(); drawProps(); } });
  const ah = box.querySelector('#p-ahead'); if (ah) ah.onclick = () => { const a = selArrow(); if (a) { snapshot(); a.head = !a.head; drawCanvas(); drawProps(); } };
  const pb = box.querySelector('#p-both'); if (pb) pb.onclick = () => { const a = d.arrows.find(x => x.id === ed.sel.id); if (a) { snapshot(); if (a.both) delete a.both; else a.both = true; drawCanvas(); drawProps(); } };
  const selGoal = () => ed.sel && d.items.find(i => i.id === ed.sel.id && ROTATABLE.includes(i.type));
  box.querySelectorAll('[data-rot]').forEach(b => b.onclick = () => { const it = selGoal(); if (it) { snapshot(); it.rot = +b.dataset.rot; delete it.face; drawCanvas(); drawProps(); } });
  const pr = box.querySelector('#p-rot');
  if (pr) {
    let snapped = false;
    pr.oninput = () => { const it = selGoal(); if (!it) return; if (!snapped) { snapshot(); snapped = true; } it.rot = +pr.value; delete it.face; box.querySelector('#p-rot-v').textContent = pr.value + '°'; drawCanvas(); };
    pr.onchange = () => { snapped = false; drawProps(); };
  }
}
// 20 oct: las flechas se hacen arrastrando; si empiezan o acaban encima de un jugador, se pegan a él
const SNAP_TYPES = ['atk', 'def', 'gk', 'coach', 'ball'];
function snapArrow(pts) {
  if (pts.length < 2) return pts;
  const items = ed.task.diagram.items.filter(i => SNAP_TYPES.includes(i.type));
  const near = (q, skip) => { let best = null, bd = 2.8; items.forEach(i => { if (i === skip) return; const dd = Math.hypot(i.x - q[0], i.y - q[1]); if (dd < bd) { bd = dd; best = i; } }); return best; };
  const out = pts.map(q => [q[0], q[1]]), n = out.length;
  const edge = (it, toward, r) => { const dx = toward[0] - it.x, dy = toward[1] - it.y, L = Math.hypot(dx, dy) || 1; return [Math.round((it.x + dx / L * r) * 10) / 10, Math.round((it.y + dy / L * r) * 10) / 10]; };
  const a = near(out[0]); if (a) out[0] = edge(a, out[1], a.type === 'ball' ? 0.9 : 2);
  const b = near(out[n - 1], a); if (b) out[n - 1] = edge(b, out[n - 2], b.type === 'ball' ? 0.9 : 2.1);
  return Math.hypot(out[n - 1][0] - out[0][0], out[n - 1][1] - out[0][1]) < 1 ? pts : out;
}
const arrowFromPath = (kind, path) => {
  const a = path[0], b = path[path.length - 1];
  if (kind === 'pase' || kind === 'tiro' || path.length < 3) return [a, b];
  const sp = simplify(path, 0.9); return (sp.length > 5 ? simplify(path, 1.6) : sp).map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
};
function finishArrow() {
  if (!ed || !ed.drawing) return;
  if (ed.drawing.pts.length >= 2) {
    snapshot();
    const a = { id: uid(), kind: ed.drawing.kind, pts: snapArrow(ed.drawing.pts) };
    if (a.kind === 'cond' || a.kind === 'mov') a.team = ed.arrowTeam;
    ed.task.diagram.arrows.push(a);
  }
  ed.drawing = null; drawCanvas(); arrowHint();
}
function arrowHint(second) {
  const h = document.getElementById('ed-hint'); if (!h || !ed) return;
  if (second) { h.textContent = 'Ahora pulsa donde acaba. (También puedes arrastrar: pulsa, mantén y suelta donde acaba.)'; return; }
  if (ARROW_TOOLS.includes(ed.tool)) h.textContent = ARROW_HINT[ed.tool];
}
const ARROW_HINT = {
  pase: 'Arrastra desde donde sale el pase hasta donde llega. Se pega solo a los jugadores.',
  tiro: 'Arrastra desde donde sale el tiro hasta donde acaba. Se pega solo al jugador.',
  cond: 'Arrastra dibujando el recorrido: si haces curva, sale curva. Abajo, el color del equipo.',
  mov: 'Arrastra dibujando el recorrido: si haces curva, sale curva. Abajo, el color del equipo.',
};
canvas.addEventListener('pointerdown', e => {
  if (!ed) return;
  const p = svgPoint(e);
  const target = e.target.closest('[data-kind]');
  // las asas de la flecha elegida se pueden arrastrar con cualquier herramienta; la del medio la curva
  if (target && target.dataset.kind === 'handle') {
    const a = ed.task.diagram.arrows.find(x => x.id === target.dataset.id); if (!a) return;
    snapshot();
    let i = target.dataset.i; if (i === 'm') { a.pts.splice(1, 0, p); i = 1; }
    ed.drag = { kind: 'handle', id: a.id, i: +i, start: p, moved: i === 1 && target.dataset.i === 'm' };
    canvas.setPointerCapture(e.pointerId); drawCanvas(); return;
  }
  if (ed.tool === 'draw') {
    ed.free = [p]; canvas.setPointerCapture(e.pointerId); return;
  }
  if (ITEM_TOOLS.includes(ed.tool)) {
    snapshot();
    const it = { id: uid(), type: ed.tool, x: p[0], y: p[1] };
    if (ed.tool === 'atk' || ed.tool === 'def') it.n = nextNumber(ed.tool);
    if (ed.tool === 'text') it.text = String(ed.task.diagram.items.filter(i => i.type === 'text').length + 1);
    if (ed.tool === 'goal') it.rot = p[0] < 50 ? 0 : 180;
    if (COLORED.includes(ed.tool) && conePref !== 'azul') it.c = conePref;
    if (ed.tool === 'label') it.text = 'Texto';
    ed.task.diagram.items.push(it);
    ed.sel = { kind: 'item', id: it.id };
    drawCanvas(); drawProps();
    if (it.type === 'label') { const pl = document.getElementById('p-l'); if (pl) { pl.focus(); pl.select(); } }
    return;
  }
  if (ARROW_TOOLS.includes(ed.tool)) {
    if (ed.drawing && ed.drawing.click) { ed.drawing.pts = [ed.drawing.pts[0], p]; finishArrow(); return; }
    ed.drawing = { kind: ed.tool, pts: [p], path: [p], live: true };
    canvas.setPointerCapture(e.pointerId); drawCanvas(); return;
  }
  // mover
  if (!target) { ed.sel = null; drawCanvas(); drawProps(); return; }
  const kind = target.dataset.kind, id = target.dataset.id;
  snapshot();
  if (kind === 'handle') ed.drag = { kind, id, i: +target.dataset.i, start: p, moved: false };
  else { ed.sel = { kind, id }; ed.drag = { kind, id, start: p, moved: false }; }
  canvas.setPointerCapture(e.pointerId);
  drawCanvas(); drawProps();
});
canvas.addEventListener('pointermove', e => {
  if (ed && ed.drawing && ed.drawing.live) {
    const p = svgPoint(e), D = ed.drawing, last = D.path[D.path.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.3) { D.path.push(p); D.pts = arrowFromPath(D.kind, D.path); drawCanvas(); }
    return;
  }
  if (ed && ed.free) {
    const p = svgPoint(e), last = ed.free[ed.free.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.35) { ed.free.push(p); drawCanvas(); }
    return;
  }
  if (!ed || !ed.drag) return;
  const p = svgPoint(e), dx = p[0] - ed.drag.start[0], dy = p[1] - ed.drag.start[1];
  if (Math.abs(dx) + Math.abs(dy) < 0.05) return;
  const d = ed.task.diagram;
  if (ed.drag.kind === 'item') { const it = d.items.find(i => i.id === ed.drag.id); if (it) { it.x = Math.round((it.x + dx) * 10) / 10; it.y = Math.round((it.y + dy) * 10) / 10; } }
  else if (ed.drag.kind === 'arrow') { const a = d.arrows.find(x => x.id === ed.drag.id); if (a) a.pts = a.pts.map(q => [Math.round((q[0] + dx) * 10) / 10, Math.round((q[1] + dy) * 10) / 10]); }
  else if (ed.drag.kind === 'handle') { const a = d.arrows.find(x => x.id === ed.drag.id); if (a) a.pts[ed.drag.i] = p; }
  ed.drag.start = p; ed.drag.moved = true; drawCanvas();
});
const endDrag = () => {
  if (ed && ed.drawing && ed.drawing.live) {
    const D = ed.drawing, a = D.path[0], b = D.path[D.path.length - 1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1.5) { ed.drawing = { kind: D.kind, pts: [a], click: true }; drawCanvas(); arrowHint(true); return; }
    D.pts = arrowFromPath(D.kind, D.path); finishArrow(); return;
  }
  if (ed && ed.free) {
    let len = 0; for (let i = 1; i < ed.free.length; i++) len += Math.hypot(ed.free[i][0] - ed.free[i - 1][0], ed.free[i][1] - ed.free[i - 1][1]);
    const pts = simplify(ed.free, 0.3).map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
    ed.free = null;
    if (pts.length >= 2 && len > 0.8) {
      snapshot();
      const a = { id: uid(), kind: 'draw', color: drawPref.color, pts };
      if (drawPref.head) a.head = true;
      ed.task.diagram.arrows.push(a);
    }
    drawCanvas(); return;
  }
  if (ed && ed.drag) { if (!ed.drag.moved) ed.history.pop(); ed.drag = null; } };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('dblclick', () => { if (ed && ed.drawing) finishArrow(); });
document.addEventListener('keydown', e => {
  if (!ed || editor.hidden || !modal.hidden) return;
  const inField = /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName);
  if (e.key === 'Enter' && ed.drawing) { e.preventDefault(); finishArrow(); }
  else if (e.key === 'Escape' && ed.drawing) { ed.drawing = null; drawCanvas(); }
  else if (e.key === 'Escape' && editor.classList.contains('board') && !bdOpen && ed.tool !== 'select') setTool('select');
  else if (e.key === 'Escape' && editor.classList.contains('board') && !bdOpen) setBoard(false);
  else if (e.key === 'Escape' && bdOpen) { bdOpen = ''; drawBoard(); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && !inField && ed.sel) { e.preventDefault(); deleteSel(); }
  else if ((e.ctrlKey || e.metaKey) && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') && !inField) { e.preventDefault(); redo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); undo(); }
});

// el semáforo del editor se calcula con lo que hay escrito, sin guardar nada
function edDraftTask() {
  const v = id => (document.getElementById(id) || {}).value || '';
  return Object.assign({}, ed.task, { title: v('f-title').trim(), rules: v('f-rules').split('\n').map(x => x.trim()).filter(Boolean), notes: v('f-notes').trim(),
    smb: { modelo: v('f-smb-modelo').trim(), lee: v('f-smb-lee').trim(), preguntas: v('f-smb-q').split('\n').map(x => x.trim()).filter(Boolean), facil: v('f-smb-facil').trim(), dificil: v('f-smb-dificil').trim() } });
}
let edRvT = 0;
function edRv(now) {
  clearTimeout(edRvT);
  const go = () => { if (!ed) return; const box = document.getElementById('ed-rv'), r = checkTask(edDraftTask());
    box.className = 'ed-rv rv-c-' + r.lvl;
    box.innerHTML = `<div class="ed-rv-h"><b>Revisión automática</b>${rvDot(r)}</div>${r.items.length ? rvListHTML(r) : '<p class="rv-allok">Cumple lo que se pide. La DT lo revisará igualmente.</p>'}`; };
  if (now) go(); else edRvT = setTimeout(go, 350);
}
function edNota() {
  const box = document.getElementById('ed-nota'), N = ed ? notasDe(ed.task.id) : [];
  box.hidden = !N.length || ed.mode === 'bank';
  if (!box.hidden) box.innerHTML = N.map(n => `<p><b>Nota de la Dirección Técnica</b> · ${esc(haceTxt(n.ts))}</p><p class="ed-nota-t">${esc(n.txt)}</p>`).join('') + '<p class="sub">Cuando lo cambies y lo guardes, la DT lo vuelve a ver.</p>';
}
function collectText() {
  const t = ed.task;
  t.title = document.getElementById('f-title').value.trim();
  t.rules = document.getElementById('f-rules').value.split('\n').map(s => s.trim()).filter(Boolean);
  t.notes = document.getElementById('f-notes').value.trim();
  t.author = document.getElementById('f-author').value.trim();
  const v = id => document.getElementById(id).value.trim();
  const m = { modelo: v('f-smb-modelo'), lee: v('f-smb-lee'), preguntas: v('f-smb-q').split('\n').map(x => x.trim()).filter(Boolean), facil: v('f-smb-facil'), dificil: v('f-smb-dificil') };
  if (ed.mode === 'bank') m.validado = document.getElementById('f-smb-ok').checked;
  else { // la versión de un entrenador conserva la validación solo si no ha tocado este bloque
    const prev = t.smb || {}, key = x => JSON.stringify([x.modelo || '', x.lee || '', x.preguntas || [], x.facil || '', x.dificil || '']);
    m.validado = !!prev.validado && key(prev) === key(m);
  }
  t.smb = m;
  // el nombre propio solo se toma del editor la primera vez, y nunca al editar fichas del banco (son de otros)
  if (ed.mode !== 'bank' && t.author && !readAuthor()) setAuthor(t.author);
  t.updated = today();
  return t;
}
document.getElementById('ed-save-mine').addEventListener('click', () => {
  if (ed.drawing) finishArrow();
  const t = collectText();
  const msg = document.getElementById('ed-msg');
  if (!t.title) { msg.className = 'msg err'; msg.textContent = 'Ponle un nombre al ejercicio antes de guardar.'; return; }
  if (!t.tipo || !((t.fases || []).length || (t.tec || []).length)) { msg.className = 'msg err'; msg.textContent = 'Elige el tipo de tarea y, en «Dónde va este ejercicio», al menos una fase del juego o un contenido de técnica.'; document.getElementById('ed-class').scrollIntoView({ block: 'center' }); return; }
  const i = mine.findIndex(x => x.id === t.id), wasDraft = !!t.borrador || (i >= 0 && mine[i].borrador);
  delete t.borrador; t.ts = Date.now();
  if (i >= 0) mine[i] = clone(t); else mine.push(clone(t));
  if (!saveMine()) { msg.className = 'msg err'; msg.textContent = 'Este navegador no deja guardar (¿modo privado?). Usa «Enviar a la Dirección Técnica» para no perderlo.'; return; }
  if (ed.mode === 'mine-new' || wasDraft) award('ex:' + t.id, PTS.ejercicio, 'Ejercicio creado: ' + t.title);
  if (ed.fromSes != null) { const i = ed.fromSes; closeEditor(); backToSes(i, t, false); return; }
  closeEditor(); view.tab = 'mias'; navigate('ejercicios');
});
document.getElementById('ed-save-newbank').addEventListener('click', async () => {
  if (ed.drawing) finishArrow();
  const msg = document.getElementById('ed-msg');
  const t = clone(collectText());
  if (!t.title) { msg.className = 'msg err'; msg.textContent = 'Ponle un nombre al ejercicio antes de guardar.'; return; }
  if (!t.tipo || !((t.fases || []).length || (t.tec || []).length)) { msg.className = 'msg err'; msg.textContent = 'Elige el tipo de tarea y, en «Dónde va este ejercicio», al menos una fase del juego o un contenido de técnica.'; document.getElementById('ed-class').scrollIntoView({ block: 'center' }); return; }
  t.id = 'club-' + uid(); t.source = 'club'; t.updated = today(); delete t.basedOn;
  if (t.smb) t.smb.validado = true; // lo crea la Dirección Técnica
  const fromSes = ed.fromSes;
  if (fromSes != null && sesEd) { prefill(sesEd.s.bloques[fromSes], t); commitSes(msg); } // la página se recarga al guardar en el banco: la sesión queda guardada antes
  msg.className = 'msg'; msg.textContent = 'Guardando en el banco…';
  const ok = await saveBank([...bank.tasks, t], 'Guardado en el banco del club.');
  if (!ok) return;
  if (fromSes != null && ed) { closeEditor(); backToSes(fromSes, t, true); }
  else if (ed) { closeEditor(); view.tab = 'banco'; navigate('ejercicios'); }
});
document.getElementById('ed-save-bank').addEventListener('click', async () => {
  if (ed.drawing) finishArrow();
  const t = clone(collectText());
  if (!t.tipo || !((t.fases || []).length || (t.tec || []).length)) { const msg = document.getElementById('ed-msg'); msg.className = 'msg err'; msg.textContent = 'Elige el tipo de tarea y, en «Dónde va este ejercicio», al menos una fase del juego o un contenido de técnica.'; document.getElementById('ed-class').scrollIntoView({ block: 'center' }); return; }
  const tasks = bank.tasks.map(x => x.id === t.id ? t : x);
  const ok = await saveBank(tasks, 'Guardado en el banco del club.');
  if (ok && !serieDone(t.id)) closeEditor();
});

// ================= botón para volver a los filtros =================
(function toTop() {
  const btn = document.getElementById('to-top'), bar = document.getElementById('filters');
  const update = () => { btn.hidden = view.zone !== 'ejercicios' || !editor.hidden || !detail.hidden || bar.getBoundingClientRect().bottom > 0; };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  new MutationObserver(update).observe(editor, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(update).observe(detail, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(update).observe(document.getElementById('v-ejercicios'), { attributes: true, attributeFilter: ['hidden'] });
  btn.addEventListener('click', () => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    bar.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  });
  update();
})();

