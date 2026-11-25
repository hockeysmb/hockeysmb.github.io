// ================= Equipos: los equipos del club y quién los lleva (16 nov) =================
// Lo pidió Carlos: que el espacio de cada entrenador no esté escondido. Es una zona de la barra
// de abajo, con dos pestañas: los equipos y las personas.
let eqTab = 'equipos', eqFiltro = 'todos';
const FICHAS_DESDE = '2026-11-16';   // el día que salió la ficha de partido
const eqAbiertas = new Set();   // categorías que el usuario ha abierto o cerrado a mano
const anchoEq = () => window.matchMedia && window.matchMedia('(min-width: 1000px)').matches;
const fmtCorta = iso => { const d = dateOf(iso); return `${DIAS[d.getDay()].slice(0, 3).toLowerCase()} ${d.getDate()}`; };
// color del resultado, como en las apps de equipos: verde gana, ámbar empata, rojo pierde
const resCls = p => { if (!p || !p.res) return ''; const [a, b] = p.res.split('-').map(Number); return a > b ? 'gana' : a < b ? 'pierde' : 'empata'; };
const eqSigla = t => { const s = String(t || '').trim(), w = s.split(/\s+/).filter(Boolean);
  const sub = s.match(/^sub\s*-?(\d+)/i); if (sub) return sub[1];   // Sub15 → 15, no «SU»
  return (w.length > 1 ? w.map(x => x[0]).join('') : (w[0] || '??').slice(0, 2)).toUpperCase().slice(0, 3); };
// ---------- plantillas: quién está en cada equipo ----------
// Los nombres viven en Firestore, nunca en el repositorio: son menores.
// Hasta el 17 nov: club/state.plant = { equipo: [{n, a, p, nt}] } (una ficha por equipo, la toca solo la DT).
// Desde la fase 1 del módulo Equipos: colección «jugadores», una ficha por persona con su equipo
// principal (eq) y los demás (otros), que cada entrenador toca en los equipos que lleva.
// Mientras no se migre, todo sigue leyendo la plantilla vieja.
const migrado = () => (bank.jugadores || []).length > 0;
const TEMPORADA = '2026/27';
const miUid = () => { const c = window.SMB_CLOUD; return (c && c.jug && c.jug.me && c.jug.me()) || ''; };
const llevoEq = t => !!miUid() && ((bank.eqUids || {})[t] || []).includes(miUid());
const puedoPlantilla = t => canWriteBank || (migrado() && llevoEq(t));
const plantillaDe = t => migrado()
  ? bank.jugadores.filter(j => j.eq === t || (j.otros || []).includes(t)).sort((a, b) => String(a.n).localeCompare(String(b.n), 'es'))
  : ((bank.plant || {})[t] || []);
const plantTotal = () => migrado() ? bank.jugadores.length : Object.values(bank.plant || {}).reduce((n, L) => n + L.length, 0);
const equiposConPlantilla = () => migrado()
  ? [...new Set(bank.jugadores.flatMap(j => [j.eq, ...(j.otros || [])]).filter(Boolean))]
  : Object.keys(bank.plant || {});
// En qué otros equipos está (los Sub13/15/17 salen de Alevín, Infantil y Juvenil). Acepta la ficha o el nombre.
const tambienEn = (p, salvo) => {
  if (p && typeof p === 'object' && p.id && migrado()) return [p.eq, ...(p.otros || [])].filter(t => t && t !== salvo);
  const nombre = typeof p === 'string' ? p : (p || {}).n;
  return Object.entries(bank.plant || {}).filter(([t, L]) => t !== salvo && L.some(x => normName(x.n) === normName(nombre))).map(([t]) => t);
};
// Quién lleva cada equipo, en las dos direcciones, para que lo lean las reglas de Firestore.
// Se calcula del horario (y de lo que haya cambiado la DT en «Equipos y entrenadores») cada vez que la DT guarda.
function calcEq(b) {
  const eqUids = {}, uidEqs = {};
  const cs = (b.coaches || []).filter(c => c.uid);
  equiposMap(b.horario || HORARIO_2627, b.equipos || {}).forEach(x => {
    const us = [...new Set(x.coaches.flatMap(n => cs.filter(c => isMe(n, c.name)).map(c => c.uid)))];
    if (us.length) { eqUids[x.t] = us; us.forEach(u => (uidEqs[u] = uidEqs[u] || []).push(x.t)); }
  });
  return { eqUids, uidEqs };
}
const iniciales = n => (String(n).trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('') || '?').toUpperCase();

// ---------- partidos de la federación (16 nov) ----------
// Los lee femenino/partidos.json, que actualiza fuente/partidos_fmp.py cada mañana.
let partidos = null, partidosAct = '', clasifs = {};
// la clasificación de la liga de un equipo (la calcula fuente/partidos_fmp.py con los resultados de la federación)
const clasifsDe = t => Object.values(clasifs || {}).filter(c => (c.tabla || []).some(x => x.smb && normName(x.smb) === normName(t)));
const clasifDe = t => clasifsDe(t)[0] || null;
// partidos.json lo escribe fuente/partidos_fmp.py con todos los equipos. Si todavía no está (o se lee
// una copia vieja), se tira del de las jugadoras, que solo trae las tres competiciones femeninas.
const PART_EQ = { 'Sub-15': 'Sub15', 'Sub-17': 'Sub17', '1ª Autonómica': 'Senior Fem' };
const cargarPartidos = ruta => fetch(ruta, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
  if (!j || !Array.isArray(j.partidos) || !j.partidos.length) return false;
  partidosAct = j.actualizado || '';
  clasifs = j.clasif || {};
  partidos = j.partidos.map(p => Object.assign({}, p, { eq: p.eq || PART_EQ[p.cat] || p.cat }));
  if (!espBox.hidden && espEquipo) openEquipo(espEquipo);
  return true;
}).catch(() => false);
cargarPartidos('partidos.json').then(ok => { if (!ok) cargarPartidos('femenino/partidos.json'); });
const partidosDe = t => (partidos || []).filter(p => normName(p.eq) === normName(t))
  .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
const partidoPorId = id => (partidos || []).find(p => p.id === id);

// ---------- la ficha de partido (16 nov) ----------
// La estructura sale de los modelos de juego: antes, dos ideas (una ofensiva y una defensiva);
// en el descanso, dos correcciones que se dicen y no se explican; después, tres preguntas y no
// un discurso. Igual para todos los equipos: a día de hoy la distinción competición/formación
// no da para separarlas. Nada es obligatorio y se guarda solo.
const FICHA = { ideas: 2, corr: 2, preg: 3 };
const fichaDe = id => (bank.fichas || []).find(f => f.pid === id) || null;
// Quién ha ido convocado y quién lleva tiempo sin ir: sale solo de las fichas ya hechas.
// Sirve para lo que el club pide en Funcionamiento 7.6, repartir con criterio y no por turno ciego.
function convHist(equipo, salvoPid) {
  const F = (bank.fichas || []).filter(f => normName(f.eq) === normName(equipo) && f.pid !== salvoPid && f.conv)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const ult = F.slice(0, 5);   // los cinco últimos partidos con convocatoria hecha
  const por = new Map();
  plantillaDe(equipo).forEach(j => por.set(j.n, { n: 0, ultima: '', seguidos: 0 }));
  ult.forEach(f => (f.conv || []).forEach(n => { const x = por.get(n); if (x) { x.n++; if (!x.ultima) x.ultima = f.fecha; } }));
  // partidos seguidos sin ir, de más reciente hacia atrás
  por.forEach((x, n) => { for (const f of ult) { if ((f.conv || []).includes(n)) break; x.seguidos++; } });
  return { de: ult.length, por };
}
// Las cinco reglas del modelo, las de colgar en el banquillo: valen de idea y de corrección.
// Las ideas, para elegir con el dedo. Salen del modelo, pero aquí se tocan, no se escriben.
const IDEAS = {
  ata: ['La bola no se tira nunca', 'Aclarar: si viene a mi sitio, se lo dejo', 'Al recuperar, el de arriba corre',
        'Recorrido completo antes de tirar', 'Buscar la ventaja antes que el tiro', 'Ataque directo'],
  def: ['Al perder, un paso adelante', 'Encimar antes de presionar', 'No retroceder al área antes que ellos',
        'No meter el stick si me está mirando', 'Presión alta', 'Cada uno con el suyo'],
};
// Qué pasó: lo que un entrenador quiere marcar y no escribir.
const PASO = ['Salimos dormidos', 'Buen primer tiempo', 'Nos vinimos abajo', 'Remontamos', 'Mucha pérdida',
  'Bien en defensa', 'Nos costó finalizar', 'Gran portero', 'Árbitro raro', 'Marcador a 10', 'Pocos jugadores'];

// ---------- lo que se ve de un equipo de un vistazo (fase 1) ----------
const CAT_EQ = [[/^prebenjam/, 'Prebenjamín'], [/^benjam/, 'Benjamín'], [/^alev/, 'Alevín'], [/^infantil/, 'Infantil'],
  [/^junior/, 'Júnior'], [/^(sub|senior fem)/, 'Femenino'], [/./, 'Sénior']];
const catDe = t => (CAT_EQ.find(([r]) => r.test(deacc(t))) || [, ''])[1];
const TIPO = { comp: 'Competición', form: 'Formación' };
const tipoDe = t => (bank.eqTipo || {})[t] || '';
// Próximo partido, último resultado y cuántos de los últimos jugados tienen ficha.
function estadoEq(t) {
  const PT = partidosDe(t), hoy = isoToday();
  const prox = PT.find(p => p.fecha >= hoy && !p.res) || null;
  const jug = PT.filter(p => p.fecha < hoy || p.res);
  const ult = jug[jug.length - 1] || null;
  const ult4 = jug.slice(-4), conFicha = ult4.filter(p => fichaDe(p.id)).length;
  return { prox, ult, seg: ult4.length ? { hechas: conFicha, de: ult4.length } : null };
}
const resTxt = p => { if (!p || !p.res) return ''; const [a, b] = p.res.split('-').map(Number); return (a > b ? 'Ganado' : a < b ? 'Perdido' : 'Empate') + ' ' + p.res; };

function renderEquipos() {
  const H = horario(), L = equiposMap(H).filter(x => !/^porter/.test(deacc(x.t)));
  // Equipos que solo salen de la plantilla (Sub13, Sub15): no tienen franja propia en el horario.
  equiposConPlantilla().forEach(t => { if (!L.some(x => x.t === t)) L.push({ t, franjas: [], coaches: [], todos: [], solo: [], raros: [] }); });
  L.sort((a, b) => eqRank(a.t) - eqRank(b.t) || a.t.localeCompare(b.t, 'es'));
  const box = document.getElementById('v-equipos');
  const porEnt = new Map();
  L.forEach(x => x.coaches.forEach(c => { if (!porEnt.has(c)) porEnt.set(c, []); porEnt.get(c).push(x.t); }));
  const tabs = `<div class="seg" role="group" aria-label="Qué ver">${[['equipos', `Equipos · ${L.length}`], ['gente', `Entrenadores · ${porEnt.size}`]].map(([k, l]) => `<button type="button" data-eqtab="${k}" aria-pressed="${eqTab === k}">${l}</button>`).join('')}</div>`;
  const fr = g => `${DIA_C[g.dia]} ${g.ini}`;
  const cuerpo = eqTab === 'gente'
    ? `<ul class="eq-cards">${[...porEnt.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([c, T]) => {
        const co = coachOf(c) || (bank.coaches || []).find(x => isMe(c, x.name));
        return `<li><button class="eq-card" type="button" data-coach="${esc(c)}"><span class="eq-av">${avatarSVG(co ? co.avatar : null, co ? levelOf(clubPoints(co.name)) : 0)}</span><span class="eq-txt"><b>${esc(co ? co.name : c)}</b><small>${esc(T.join(' · '))}</small></span><span class="chev" aria-hidden="true">›</span></button></li>`;
      }).join('')}</ul>`
    : (() => {
        // filas de una línea, agrupadas por categoría y plegables: la lista entera cabe en poco más de una pantalla
        const mios = new Set(misEquipos());
        const filtra = x => eqFiltro === 'mios' ? mios.has(x.t) : eqFiltro === 'comp' || eqFiltro === 'form' ? tipoDe(x.t) === eqFiltro : true;
        const fila = x => { const E = estadoEq(x.t), tp = tipoDe(x.t);
          const prox = E.prox ? `${esc(fmtCorta(E.prox.fecha))} ${E.prox.casa ? 'vs' : 'en'} ${esc(E.prox.rival)}` : (x.coaches.length ? esc(x.coaches.join(' · ')) : 'Sin partidos próximos');
          return `<li><button class="eq-fila${espEquipo === x.t ? ' on' : ''}" type="button" data-equipo="${esc(x.t)}"><span class="eq-esc" aria-hidden="true">${esc(eqSigla(x.t))}</span>
            <span class="eq-txt"><b>${esc(x.t)}${tp ? ` <span class="eq-tipo ${tp}">${TIPO[tp]}</span>` : ''}</b><small>${prox}</small></span>
            ${E.ult && E.ult.res ? `<span class="res-chip ${resCls(E.ult)}" title="Último: ${esc(E.ult.rival)}">${esc(E.ult.res)}</span>` : ''}<span class="eq-chev" aria-hidden="true">›</span></button></li>`; };
        const ordenCat = c => CAT_EQ.findIndex(([, n]) => n === c);
        const V = L.filter(filtra);
        const cats = [...new Set(V.map(x => catDe(x.t)))].sort((a, b) => ordenCat(a) - ordenCat(b));
        // de entrada, abiertas las categorías de mis equipos (o todas en pantalla ancha, o si filtro)
        const abierta = c => eqAbiertas.has(c) || (!eqAbiertas.size && (anchoEq() || eqFiltro !== 'todos' || V.some(x => catDe(x.t) === c && mios.has(x.t)) || !mios.size));
        // cifras arriba: solo lo que existe de verdad (las evaluaciones llegan en la fase 3)
        const hoy = isoToday(), d7 = isoOf((d => (d.setDate(d.getDate() + 6), d))(dateOf(hoy)));
        const jugados = (partidos || []).filter(p => p.fecha < hoy && p.fecha >= FICHAS_DESDE);   // desde que existen las fichas
        const conFicha = jugados.filter(p => fichaDe(p.id)).length;
        const kpis = [[L.length, 'equipos'], [plantTotal(), 'jugadores'], [(partidos || []).filter(p => p.fecha >= hoy && p.fecha <= d7).length, 'partidos esta semana'],
          ...(jugados.length ? [[Math.round(100 * conFicha / jugados.length) + ' %', 'partidos con ficha']] : [])];
        const filtros = [['todos', 'Todos'], ...(mios.size ? [['mios', 'Mis equipos']] : []), ['comp', 'Competición'], ['form', 'Formación']];
        return `<div class="eq-kpis" tabindex="0" role="region" aria-label="Cifras de los equipos">${kpis.map(([n, l]) => `<div class="eq-kpi"><b>${n}</b><small>${l}</small></div>`).join('')}</div>
          <div class="eq-filtros">${filtros.map(([k, l]) => `<button class="chip sm" type="button" data-eqfil="${k}" aria-pressed="${eqFiltro === k}">${l}</button>`).join('')}</div>
          ${cats.length ? cats.map(c => { const T = V.filter(x => catDe(x.t) === c), sem = T.filter(x => { const E = estadoEq(x.t); return E.prox && E.prox.fecha <= d7; }).length;
            return `<details class="eq-grupo" data-cat="${esc(c)}"${abierta(c) ? ' open' : ''}><summary><b>${esc(c)}</b><small>${T.length} ${T.length === 1 ? 'equipo' : 'equipos'}${sem ? ` · ${sem} ${sem === 1 ? 'juega' : 'juegan'} esta semana` : ''}</small></summary>
              <ul class="eq-filas">${T.map(fila).join('')}</ul></details>`; }).join('')
            : `<p class="sub">${eqFiltro === 'comp' || eqFiltro === 'form' ? 'Ningún equipo marcado como ' + TIPO[eqFiltro].toLowerCase() + '. El tipo se pone en el Resumen de cada equipo.' : 'No hay equipos.'}</p>`}`;
      })();
  box.innerHTML = `<div class="vhead"><div><h1>Equipos ${infoBtn('equipos')}</h1><p class="sub">Temporada ${TEMPORADA}.</p></div></div>
    ${tabs}${cuerpo}`;
}
document.getElementById('v-equipos').addEventListener('toggle', e => {
  const d = e.target.closest && e.target.closest('.eq-grupo'); if (!d) return;
  if (!eqAbiertas.size) document.querySelectorAll('#v-equipos .eq-grupo[open]').forEach(g => eqAbiertas.add(g.dataset.cat));
  if (d.open) eqAbiertas.add(d.dataset.cat); else eqAbiertas.delete(d.dataset.cat);
  if (!eqAbiertas.size) eqAbiertas.add('—');   // «todas cerradas» también es una elección
}, true);
document.getElementById('v-equipos').addEventListener('click', e => {
  const f = e.target.closest('[data-eqfil]'); if (f) { eqFiltro = f.dataset.eqfil; eqAbiertas.clear(); render(); return; }
  const t = e.target.closest('[data-eqtab]'); if (t) { eqTab = t.dataset.eqtab; render(); return; }
  const q = e.target.closest('[data-equipo]'); if (q) openEquipo(q.dataset.equipo);
});
let espEquipo = null, eqSub = 'resumen';
function repintarEquipo() {
  if (typeof espBox === 'undefined' || espBox.hidden || !modal.hidden) return;
  if (perfilJid) { const y = espBox.scrollTop; segEscucharSiCambia(); jugadorPerfil(perfilJid, perfilEq, true); espBox.scrollTop = y; return; }
  if (!espEquipo || fichaPid) return;
  const y = espBox.scrollTop; openEquipo(espEquipo, null, true); espBox.scrollTop = y;
}
// En pantalla ancha (y desde la zona Equipos) el equipo se abre a la derecha de la lista, sin taparla.
function eqDock(on) {
  document.body.classList.toggle('eq-dock', !!on);
  if (on) { const ab = document.querySelector('.appbar'); document.documentElement.style.setProperty('--eq-top', (ab ? Math.round(ab.getBoundingClientRect().bottom) : 0) + 'px'); }
}
function openEquipo(t, sub, quieto) {
  if (typeof perfilSoltar === 'function') perfilSoltar();
  if (!quieto) segEq = { t: null, por: null, cargando: false };
  const L = equiposMap(horario());
  // Sub13 y Sub15 no tienen franja propia en el horario: salen de Alevín e Infantil.
  const x = L.find(y => y.t === t) || ((plantillaDe(t).length || partidosDe(t).length) ? { t, franjas: [], coaches: [] } : null);
  if (!x) return;
  espName = null; espEquipo = t; if (sub) eqSub = sub;
  const P = plantillaDe(t), PT = partidosDe(t);
  const ses = (bank.sesClub || []).filter(y => normName(y.s.equipo || '') === normName(t)).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const fr = g => `${DIA_C[g.dia]} ${g.ini}–${g.fin || ''}`;
  const tabs = [['resumen', 'Resumen'], ['plant', `Plantilla${P.length ? ' · ' + P.length : ''}`], ['part', `Partidos${PT.length ? ' · ' + PT.length : ''}`], ['entr', `Entrenos${ses.length ? ' · ' + ses.length : ''}`]];

  let cuerpo = '';
  if (eqSub === 'resumen') {
    // tarjetas pequeñas en cuadrícula: una columna en el móvil, dos o tres en pantallas anchas
    const E = estadoEq(t), tp = tipoDe(t), H = convHist(t), hoy = isoToday();
    const sinIr = [...H.por.entries()].filter(([, v]) => v.seguidos >= 2);
    const jugados = PT.filter(p => p.fecha < hoy || p.res), ult3 = jugados.slice(-3).reverse();
    const barra = (l, n, de) => `<div class="eq-barra"><span>${l}</span><b>${n} de ${de}</b><i style="--p:${de ? Math.round(100 * n / de) : 0}%"></i></div>`;
    const caja = (ico, tit, html, extra = '') => `<section class="eq-box${extra}"><h3><span aria-hidden="true">${ico}</span>${tit}</h3>${html}</section>`;
    const cajas = [];
    cajas.push(caja('◷', 'Próximo partido', E.prox
      ? `<button class="eq-prox" type="button" data-fpart="${esc(E.prox.id)}"><b>${E.prox.casa ? 'vs' : 'en'} ${esc(E.prox.rival)}</b>
          <small>${esc(fmtShort(E.prox.fecha))}${E.prox.hora ? ' · ' + esc(E.prox.hora) : ' · sin hora'} · ${E.prox.casa ? 'en casa' : 'fuera'}${E.prox.j ? ' · J' + E.prox.j : ''}</small>
          <span class="eq-prox-act">${fichaDe(E.prox.id) ? 'Ver ficha' : 'Prepararlo'} ›</span></button>`
      : '<p class="sub">Sin partidos en el calendario.</p>'));
    if (ult3.length) cajas.push(caja('▤', 'Últimos partidos', `<ul class="eq-ult">${ult3.map(p => `<li><button type="button" data-fpart="${esc(p.id)}"><span>${p.casa ? 'vs' : 'en'} ${esc(p.rival)}</span><span class="res-chip ${resCls(p)}">${esc(p.res || '—')}</span></button></li>`).join('')}</ul>`));
    cajas.push(caja('◎', 'Estado del equipo', `${barra('Fichas de partido', E.seg ? E.seg.hechas : 0, E.seg ? E.seg.de : 0)}
      ${H.de ? barra('Convocatorias al día', [...H.por.values()].filter(v => v.seguidos < 2).length, H.por.size) : ''}
      <p class="sub eq-dato">${P.length} ${P.length === 1 ? 'jugador' : 'jugadores'}${P.filter(p => p.p).length ? ' · ' + P.filter(p => p.p).length + ' portero' : ''}</p>`));
    if (sinIr.length) cajas.push(caja('!', 'Convocatorias', `<p class="sub">${sinIr.map(([n, v]) => `<b class="fh-mej">${esc(n)}</b> lleva ${v.seguidos} sin ir`).join('<br>')}</p>`, ' aviso'));
    cajas.push(caja('◆', 'Tipo', canWriteBank
      ? `<div class="fh-esc">${[['', 'Sin definir'], ['comp', 'Competición'], ['form', 'Formación']].map(([v, l]) => `<button class="fh-eop${tp === v ? ' si' : ''}" type="button" data-eqtipo="${v}">${l}</button>`).join('')}</div>`
      : `<p class="sub">${tp ? TIPO[tp] : 'Sin definir'}. Lo pone la Dirección Técnica.</p>`));
    // jugadores del equipo en una tabla, y lo que dicen sus evaluaciones (si se ven)
    const actEq = segActivo() && (canWriteBank || llevoEq(t)), PJ = P.filter(j => j.id);
    if (actEq && PJ.length) segEqCargar(t);
    const SE = actEq && segEq.t === t && segEq.por ? segEq.por : null;
    const hayEv = !!SE && PJ.some(j => (SE[j.id] || []).some(x => x.tipo === 'ev'));
    const ultEv = j => SE ? ((SE[j.id] || []).filter(x => x.tipo === 'ev').sort((a, b) => (b.ts || 0) - (a.ts || 0))[0] || null) : null;
    if (PJ.length) {
      const FT = (bank.fichas || []).filter(f => f.eq === t && Array.isArray(f.conv));
      const fila = j => { const nn = normName(j.n), fue = FT.filter(f => f.conv.some(x => normName(x) === nn)).length;
        const ua = v => FT.filter(f => Object.entries(f.unoa || {}).some(([k, w]) => normName(k) === nn && w === v)).length;
        const ev = ultEv(j), n = ev && evNums(ev);
        return `<tr><td><button type="button" data-pjugid="${esc(j.id)}">${esc(j.n)}</button></td><td>${FT.length ? fue + '/' + FT.length : '—'}</td><td>${ua('bien') || ua('mej') ? `<span class="fh-bien">${ua('bien')}</span> · <span class="fh-mej">${ua('mej')}</span>` : '—'}</td>
          ${hayEv ? `<td>${n ? coma(n.d) : '—'}</td><td>${n ? coma(n.e) : '—'}</td><td>${n ? coma(n.tec) : '—'}</td><td>${ev && ev.ven === segVenHoy() ? '<span class="est ok">Al día</span>' : '<span class="est no">Pendiente</span>'}</td>` : ''}</tr>`; };
      cajas.push(caja('☰', 'Jugadores', `<div class="eq-ind" tabindex="0" role="region" aria-label="Jugadores del equipo"><table><thead><tr><th>Jugador</th><th>Convocado</th><th>Uno a uno</th>${hayEv ? '<th>Decide</th><th>Ejecuta</th><th>Técnica</th><th>Evaluación</th>' : ''}</tr></thead><tbody>${PJ.map(fila).join('')}</tbody></table></div>
        <p class="sub eq-dato">Convocado: de los partidos con ficha. Uno a uno: veces bien · a mejorar.${hayEv ? ` Evaluación de ${esc(venDe(segVenHoy()).toLowerCase())}.` : SE ? ' Todavía nadie evaluado.' : actEq ? ' Cargando evaluaciones…' : ''} Toca un nombre para ver su perfil.</p>`, ' ancho'));
    }
    if (SE) {
      const evs = PJ.map(ultEv).filter(Boolean);
      if (evs.length) {
        const prom = k => media(evs.map(ev => (ev.rub || {})[k]).filter(Boolean));
        const CORTO = { patin: 'Patín', cond: 'Conducción', pase: 'Pase', disp: 'Disparo', uno: '1c1' };
        const ax = SEG_RUB.map(([k]) => [CORTO[k], prom(k)]), C = 150, R = 72, ang = i => -Math.PI / 2 + 2 * Math.PI * i / ax.length;
        const pt = (i, r) => [C + r * Math.cos(ang(i)), 110 + r * Math.sin(ang(i))].map(v => v.toFixed(1)).join(',');
        const radar = ax.some(([, v]) => v != null) ? `<svg class="eq-radar" viewBox="0 0 300 220" role="img" aria-label="Rúbrica técnica media del equipo">
          ${[1, 2, 3].map(v => `<polygon class="red" points="${ax.map((_, i) => pt(i, R * v / 3)).join(' ')}"/>`).join('')}
          <polygon class="val" points="${ax.map(([, v], i) => pt(i, R * (v || 0) / 3)).join(' ')}"/>
          ${ax.map(([l, v], i) => { const [x, y] = pt(i, R + 16).split(',').map(Number); return `<text x="${x}" y="${y + 4}" text-anchor="${Math.abs(x - C) < 8 ? 'middle' : x < C ? 'end' : 'start'}">${esc(l)}${v != null ? ' ' + coma(v) : ''}</text>`; }).join('')}</svg>` : '';
        if (radar) cajas.push(caja('⬠', 'Técnica del equipo', `${radar}<p class="sub eq-dato">Media de la última evaluación de ${evs.length} ${evs.length === 1 ? 'jugador' : 'jugadores'}, de 1 a 3.</p>`));
        // qué reforzar: lo más bajo del equipo, de las situaciones y de la técnica
        const items = new Map();
        evs.forEach(ev => { (ev.sit || []).forEach(x => { [['d', 'decide'], ['e', 'ejecuta']].forEach(([k, l]) => { if (x[k]) { const key = x.s + ' · ' + l; items.set(key, [...(items.get(key) || []), x[k]]); } }); });
          SEG_RUB.forEach(([k, l]) => { const v = (ev.rub || {})[k]; if (v) items.set(l, [...(items.get(l) || []), v]); }); });
        const bajos = [...items.entries()].map(([k, L]) => [k, media(L)]).filter(([, v]) => v != null && v <= 2).sort((a, b) => a[1] - b[1]).slice(0, 3);
        cajas.push(caja('↗', 'Qué reforzar', bajos.length ? `<ul class="eq-focos">${bajos.map(([k, v]) => `<li><span>${esc(k)}</span><b>${coma(v)}</b></li>`).join('')}</ul><p class="sub eq-dato">Lo más bajo de las últimas evaluaciones: lo que se evalúa es lo que se entrena.</p>` : '<p class="sub">Nada por debajo de 2 en las últimas evaluaciones.</p>'));
      }
    }
    // el tipo, al final: se pone una vez y ya
    const it = cajas.findIndex(c => c.includes('</span>Tipo</h3>')); if (it >= 0) cajas.push(cajas.splice(it, 1)[0]);
    cuerpo = `<div class="eq-grid">${cajas.join('')}</div>`;
  }
  else if (eqSub === 'plant') cuerpo = P.length
    ? `<ul class="jg-list">${P.map((p, i) => { const otros = tambienEn(p, t);
        return `<li><button class="jg-row" type="button" data-pjug="${i}"><span class="jg-ini" aria-hidden="true">${esc(iniciales(p.n))}</span><span class="jg-txt"><b>${esc(p.n)}</b><small>${[p.a ? (p.a === 'Senior' ? 'Senior' : p.a) : '', p.p ? 'Portero' : '', otros.length ? 'También en ' + otros.join(' y ') : ''].filter(Boolean).join(' · ') || '&nbsp;'}</small></span><span class="chev" aria-hidden="true">›</span></button></li>`;
      }).join('')}</ul>
      ${puedoPlantilla(t) ? '<div class="actions"><button class="btn" type="button" data-palta>Añadir jugador</button></div>' : ''}
      <p class="sub">${P.filter(p => p.p).length ? P.filter(p => p.p).length + ' portero. ' : ''}Toca un nombre para ver su ficha${puedoPlantilla(t) ? ' o cambiarlo' : ''}.</p>
      ${(() => { const H = convHist(t); if (!H.de) return '';
        const L = [...H.por.entries()].sort((a, b) => a[1].n - b[1].n || b[1].seguidos - a[1].seguidos);
        const sin = L.filter(([, x]) => x.seguidos >= 2);
        return `<details class="dt-more"${sin.length ? ' open' : ''}><summary>Convocatorias · últimos ${H.de} partidos${sin.length ? ` · ${sin.length} sin ir desde hace 2 o más` : ''}</summary>
          <ul class="pts-list">${L.map(([n, x]) => `<li><span>${esc(n)}</span><span>${x.n} de ${H.de}${x.seguidos >= 2 ? ` · <b class="cv-toca">${x.seguidos} seguidos sin ir</b>` : ''}</span></li>`).join('')}</ul>
          <p class="sub">Sale de las convocatorias que habéis guardado en las fichas de partido.</p></details>`; })()}`
    : `<p class="sub">Todavía no hay plantilla de este equipo.</p>${puedoPlantilla(t) ? '<div class="actions"><button class="btn primary" type="button" data-palta>Añadir el primer jugador</button></div>' : '<p class="sub">La pone quien lleva el equipo o la Dirección Técnica.</p>'}`;

  else if (eqSub === 'part') {
    if (!PT.length) cuerpo = `<p class="sub">${partidos ? 'Este equipo no tiene partidos en el calendario de la federación.' : 'Todavía no se han podido leer los partidos de la federación.'}</p>`;
    else {
      // lo que viene primero, por fecha y hora; lo jugado, del más reciente al más antiguo; de cada uno, solo
      // unos pocos a la vista y el resto plegado
      const hoy = isoToday(), clave = p => p.fecha + ' ' + (p.hora || '99:99');
      const fut = PT.filter(p => !p.res && p.fecha >= hoy).sort((a, b) => clave(a).localeCompare(clave(b)));
      const jug = PT.filter(p => p.res || p.fecha < hoy).sort((a, b) => clave(b).localeCompare(clave(a)));
      const fila = p => { const f = fichaDe(p.id);
        return `<li><button class="pt-row${p.res || p.fecha < hoy ? ' hecho' : ''}" type="button" data-fpart="${esc(p.id)}"><span class="pt-cuando"><b>${esc(fmtShort(p.fecha))}</b><small>${p.hora ? esc(p.hora) : 'sin hora'}</small></span><span class="pt-rival"><b>${esc(p.rival)}</b><small>${p.casa ? 'En casa' : 'Fuera'}${p.j ? ' · J' + p.j : ''}${f ? ' · con ficha' : ''}</small></span>${p.res ? `<span class="res-chip ${resCls(p)}">${esc(p.res)}</span>` : p.fecha < hoy ? '<span class="res-chip">—</span>' : ''}<span aria-hidden="true">›</span></button></li>`; };
      const lista = (L, n, mas) => `<ul class="pt-list">${L.slice(0, n).map(fila).join('')}</ul>${L.length > n ? `<details class="dt-more"><summary>${mas} · ${L.length - n}</summary><ul class="pt-list">${L.slice(n).map(fila).join('')}</ul></details>` : ''}`;
      const box = (ico, tit, html, extra = '') => `<section class="eq-box${extra}"><h3><span aria-hidden="true">${ico}</span>${tit}</h3>${html}</section>`;
      const R = jug.filter(p => p.res).map(p => p.res.split('-').map(Number));
      const G = R.filter(([a, b]) => a > b).length, E = R.filter(([a, b]) => a === b).length, Pp = R.filter(([a, b]) => a < b).length;
      const GF = R.reduce((n, [a]) => n + a, 0), GC = R.reduce((n, [, b]) => n + b, 0);
      const C = clasifDe(t), pos = C ? C.tabla.findIndex(x => normName(x.smb) === normName(t)) : -1;
      const cajas = [];
      const pr = fut[0];
      cajas.push(box('◷', 'Próximo partido', pr
        ? `<button class="eq-prox" type="button" data-fpart="${esc(pr.id)}"><b>${pr.casa ? 'vs' : 'en'} ${esc(pr.rival)}</b>
            <small>${esc(fmtShort(pr.fecha))}${pr.hora ? ' · ' + esc(pr.hora) : ' · sin hora'} · ${pr.casa ? 'en casa' : 'fuera'}${pr.j ? ' · J' + pr.j : ''}</small>
            <span class="eq-prox-act">${fichaDe(pr.id) ? 'Ver ficha' : 'Prepararlo'} ›</span></button>`
        : '<p class="sub">No quedan partidos en el calendario.</p>'));
      cajas.push(box('▤', 'Temporada', R.length
        ? `<div class="pt-bal"><span><b>${G}</b>ganados</span><span><b>${E}</b>empatados</span><span><b>${Pp}</b>perdidos</span></div>
           <p class="sub eq-dato">${GF} goles a favor y ${GC} en contra${pos >= 0 ? ` · <b>${esc(C.tabla[pos].pos || pos + 1)}.º de ${C.tabla.length}</b>` : ''}.</p>`
        : '<p class="sub">Todavía sin resultados.</p>'));
      clasifsDe(t).forEach(C => {
        const T = C.tabla.filter(x => !/^descanso\b/i.test(String(x.n).trim())), n = T.length, pos = T.findIndex(x => normName(x.smb) === normName(t));
        // con muchas filas, las de arriba y las de alrededor del equipo; la tabla entera, plegada
        const ver = n <= 8 ? T.map((_, k) => k) : [...new Set([0, 1, 2, pos - 1, pos, pos + 1].filter(k => k >= 0 && k < n))].sort((a, b) => a - b);
        const tr = k => { const x = T[k], yo = normName(x.smb) === normName(t), otro = !yo && x.smb;
          return `<tr class="${yo ? 'yo' : otro ? 'smb' : ''}"><td>${esc(x.pos || k + 1)}</td><td>${esc(x.n)}</td><td>${x.pj}</td><td>${x.g}</td><td>${x.e}</td><td>${x.p}</td><td>${x.gf - x.gc > 0 ? '+' : ''}${x.gf - x.gc}</td><td><b>${x.pts}</b></td></tr>`; };
        const cab = '<thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th></tr></thead>';
        const cortes = ver.map((k, z) => (z && k !== ver[z - 1] + 1 ? '<tr class="corte"><td colspan="8">···</td></tr>' : '') + tr(k)).join('');
        cajas.push(box('≡', `Clasificación <small class="meta">${esc(C.cat)}</small>`, `<div class="pt-clas" tabindex="0" role="region" aria-label="Clasificación"><table>${cab}<tbody>${cortes}</tbody></table></div>
          ${n > ver.length ? `<details class="dt-more"><summary>Ver la tabla entera · ${n} equipos</summary><div class="pt-clas" tabindex="0" role="region" aria-label="Clasificación completa"><table>${cab}<tbody>${T.map((_, k) => tr(k)).join('')}</tbody></table></div></details>` : ''}
          <p class="sub eq-dato">${C.oficial ? 'La de la federación' : 'Calculada con los resultados de la federación (3 puntos la victoria y 1 el empate; a igualdad, diferencia de goles), porque hoy no se ha podido leer la oficial'}${partidosAct ? ', al ' + esc(fmtShort(partidosAct)) : ''}. <a href="https://www.hockeypatines.fmp.es/?liga=${esc(C.liga)}&vista=clasificaciones" target="_blank" rel="noopener">Ver en la federación</a>.</p>`, ' ancho'));
      });
      if (fut.length) cajas.push(box('→', `Lo que viene <small>· ${fut.length}</small>`, lista(fut, 3, 'Ver los siguientes'), ' pt-caja'));
      if (jug.length) cajas.push(box('✓', `Jugados <small>· ${jug.length}</small>`, lista(jug, 3, 'Ver los anteriores'), ' pt-caja'));
      cuerpo = `<div class="eq-grid">${cajas.join('')}</div>
        <p class="sub">De la federación${partidosAct ? ', al ' + esc(fmtShort(partidosAct)) : ''}; se actualiza solo dos veces al día. Los horarios los cambia la federación sin avisar: antes de un partido, confírmalo.</p>`;
    }
  }

  else cuerpo = `<h2 class="h-sec">Cuándo entrena</h2>
    <ul class="pts-list">${x.franjas.map(g => `<li><span>${esc(fr(g))}</span><span>${esc(hzTeams(g).join(' + '))}</span></li>`).join('') || '<li><span>No está en el horario.</span></li>'}</ul>
    <h2 class="h-sec">Entrenadores</h2>
    <ul class="eq-cards">${x.coaches.map(c => { const co = coachOf(c) || (bank.coaches || []).find(y => isMe(c, y.name));
      return `<li><button class="eq-card" type="button" data-coach="${esc(c)}"><span class="eq-av">${avatarSVG(co ? co.avatar : null, 0)}</span><span class="eq-txt"><b>${esc(co ? co.name : c)}</b></span><span class="chev" aria-hidden="true">›</span></button></li>`; }).join('') || '<li><p class="sub">Nadie asignado todavía.</p></li>'}</ul>
    <h2 class="h-sec">Sus sesiones</h2>
    ${ses.length ? `<div class="ses-rows mini">${ses.slice(0, 12).map(y => `<button class="ses-row" type="button" data-espses="${esc(y.id)}"><span class="ses-thumb">${(y.s.bloques || []).some(b => b && b.task) ? diagramSVG(((y.s.bloques || []).find(b => b && b.task) || {}).task.diagram, '') : '<span class="ses-empty">Sin ejercicio</span>'}</span><span class="ses-bn">${esc(y.autor || '')}</span><span>${esc(y.s.fecha ? fmtShort(y.s.fecha) : '')}</span></button>`).join('')}</div>`
      : '<p class="sub">Todavía no hay sesiones compartidas de este equipo.</p>'}`;

  espBox.innerHTML = `<div class="esp-top"><button class="pb-back" type="button" data-espclose><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Volver</button></div>
    <div class="eq-cab"><span class="eq-esc grande" aria-hidden="true">${esc(eqSigla(t))}</span>
      <div><h1>${esc(t)}</h1><p class="sub">${[tipoDe(t) ? TIPO[tipoDe(t)] : '', catDe(t), P.length ? P.length + (P.length === 1 ? ' jugador' : ' jugadores') : '', x.coaches.length ? x.coaches.join(' y ') : (x.franjas.length ? 'sin entrenador' : 'sin franja propia')].filter(Boolean).map(esc).join(' · ')}</p></div></div>
    <div class="seg eq-tabs" role="group" aria-label="Qué ver del equipo">${tabs.map(([k, l]) => `<button type="button" data-eqsub="${k}" aria-pressed="${eqSub === k}">${l}</button>`).join('')}</div>
    ${eqSub === 'resumen' || (eqSub === 'part' && PT.length) ? cuerpo : `<section class="ses-sec">${cuerpo}</section>`}`;
  const dock = view.zone === 'equipos' && anchoEq();
  eqDock(dock);
  espBox.hidden = false; document.body.style.overflow = dock ? '' : 'hidden';
  if (dock && !quieto) renderEquipos();   // marca en la lista el equipo abierto
  if (quieto) return;
  espBox.scrollTop = 0;
  const b = espBox.querySelector('[data-espclose]'); if (b) b.focus();
}

// La ficha de un jugador: lo que sabemos de él y en qué equipos está.
function jugadorModal(t, i) {
  const p = plantillaDe(t)[i]; if (!p) return;
  const otros = tambienEn(p, t), datos = [['Año', p.a || 'sin año'], ['Puesto', p.p ? 'Portero' : 'Jugador de pista']];
  if (otros.length) datos.push(['También en', otros.join(' · ')]);
  if (p.nt) datos.push(['Nota del listado', p.nt]);
  openModal(`<div class="esp-head"><span class="jg-ini grande" aria-hidden="true">${esc(iniciales(p.n))}</span><div><h1>${esc(p.n)}</h1><p class="sub">${esc(t)}</p></div></div>
    <ul class="pts-list">${datos.map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('')}</ul>
    <p class="sub">${puedeFicha(p, t) ? '' : `La cambia quien lleva ${esc(migrado() ? p.eq : t)}${migrado() ? '' : ' (de momento, solo la Dirección Técnica)'}. `}Las evaluaciones llegan en la fase 3.</p>
    <div class="row">${puedeFicha(p, t) ? '<button class="btn primary" id="m-ed" type="button">Cambiar</button>' : ''}<button class="btn" id="m-no" type="button">Cerrar</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
  const ed = modalCard.querySelector('#m-ed'); if (ed) ed.onclick = () => jugadorEditar(t, i);
}

// ---------- el perfil de cada jugador: lo que ha jugado, cómo va y apuntes ----------
// Lo que ha jugado sale de las fichas de partido (convocatorias y uno a uno). La evaluación usa los
// instrumentos del Plan de acción 2026/27, línea 5: hoja de observación decide / ejecuta 1–3 sobre las
// situaciones del foco de su categoría, rúbrica técnica 1–3 y la matriz de qué entrenar. No hay nota final
// ni ranking. Evaluación, objetivos y apuntes van en jugadores/{id}/seg y solo los leen sus entrenadores
// y la DT. Están detrás de bank.segOn: la DT los activa cuando el colegio confirme la privacidad.
const SEG_ESC = ['Apenas lo logra', 'A veces', 'Con soltura'];
const SEG_RUB = [['patin', 'Patín'], ['cond', 'Conducción'], ['pase', 'Pase y control'], ['disp', 'Disparo y remate'], ['uno', '1c1']];
const SEG_SIT = {
  pre: { foco: 'Disfrute y manejo básico: sobre todo, ejecución.', s: ['1c1: desbordar', '1 contra portero', '2c0: asociarse'] },
  ben: { foco: 'Ejecución y la decisión «¿conduzco o paso?».', s: ['1c1 leyendo a la defensa', 'Inicio del 2c1', 'Pasar y cortar', 'Finalizar al 2.º palo'] },
  ale: { foco: 'Decisión en superioridades.', s: ['2c1 según la defensa', '1c1 sin bola para recibir', 'Pasar y cortar', '3c1 y 3c2'] },
  inf: { foco: 'Decidir con y sin bola en colectivo.', s: ['2c2 y 3c2', 'Transiciones', 'Lado fuerte y débil', 'Salida de presión'] },
  juv: { foco: 'El juego completo.', s: ['Sistemas', 'Presión y repliegue', 'Bola parada', 'Posición'] },
};
const segCat = t => { const d = deacc(t); return /^prebenjam/.test(d) ? 'pre' : /^benjam/.test(d) ? 'ben' : /^(alev|sub13)/.test(d) ? 'ale' : /^(infantil|sub15)/.test(d) ? 'inf' : 'juv'; };
// tres tomas por temporada, como en los modelos de juego: al empezar, en enero y en junio
const SEG_VEN = [['ini', 'Inicio de temporada'], ['ene', 'Enero'], ['jun', 'Junio']];
const segVenHoy = () => { const m = new Date().getMonth() + 1; return m >= 7 && m <= 11 ? 'ini' : m >= 4 && m <= 6 ? 'jun' : 'ene'; };
// la matriz del Plan de acción; «bien» es una media por encima de 2 (más cerca de «con soltura» que de «apenas»)
const SEG_MATRIZ = { bb: 'Talento de juego: decide y ejecuta. Súbele el reto.', bm: 'Cabeza lista, gesto verde: entrena el gesto técnico.',
  mb: 'Buen gesto, mala lectura: entrena la decisión, con juegos con rival y opciones.', mm: 'Vuelta a lo básico: situaciones simples, primero decidir y luego ejecutar.' };
const media = L => { const v = L.filter(x => x >= 1 && x <= 3); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const coma = x => x == null ? '—' : x.toFixed(1).replace('.', ',');
function segMatriz(sit) {
  const d = media((sit || []).map(x => x.d)), e = media((sit || []).map(x => x.e));
  if (d == null || e == null) return null;
  return { d, e, txt: SEG_MATRIZ[(d > 2 ? 'b' : 'm') + (e > 2 ? 'b' : 'm')] };
}
const segActivo = () => !!bank.segOn && !!(window.SMB_CLOUD && window.SMB_CLOUD.seg);
// lo de todos los jugadores de un equipo, para la tabla y la rúbrica del Resumen (se recarga al abrir el equipo)
let segEq = { t: null, por: null, cargando: false };
function segEqCargar(t) {
  if (segEq.t === t && (segEq.por || segEq.cargando)) return;
  segEq = { t, por: null, cargando: true };
  const P = plantillaDe(t).filter(j => j.id);
  Promise.all(P.map(j => window.SMB_CLOUD.seg.get(j.id).then(L => [j.id, L]).catch(() => [j.id, []])))
    .then(R => { if (segEq.t !== t) return; segEq = { t, por: Object.fromEntries(R), cargando: false };
      if (espEquipo === t && !perfilJid && !fichaPid && eqSub === 'resumen' && !espBox.hidden) { const y = espBox.scrollTop; openEquipo(t, null, true); espBox.scrollTop = y; } });
}
// el seguimiento de un jugador lo ven sus entrenadores (de cualquiera de sus equipos) y la DT; igual que las reglas
const segMio = j => segActivo() && (canWriteBank || [j.eq, ...(j.otros || [])].some(llevoEq));
// lo que ha jugado esta temporada en todos sus equipos, sacado de las fichas
function jugStats(j) {
  const eqs = [j.eq, ...(j.otros || [])].filter(Boolean), n = normName(j.n);
  const F = (bank.fichas || []).filter(f => eqs.includes(f.eq) && Array.isArray(f.conv)).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const fue = f => f.conv.some(x => normName(x) === n), ua = f => { const k = Object.keys(f.unoa || {}).find(x => normName(x) === n); return k ? f.unoa[k] : ''; };
  const filas = F.map(f => ({ f, fue: fue(f), ua: ua(f), p: partidoPorId(f.pid) }));
  const H = j.eq ? convHist(j.eq) : null, h = H && [...H.por.entries()].find(([k]) => normName(k) === n);
  return { de: F.length, fue: filas.filter(x => x.fue).length, bien: filas.filter(x => x.ua === 'bien').length, mej: filas.filter(x => x.ua === 'mej').length,
    seguidos: h ? h[1].seguidos : 0, filas, eqs };
}
let perfilJid = null, perfilEq = null, perfilTab = 'resumen', segItems = null, segUnsub = null, segForm = null, segBorrar = null;
function segEscuchar(jid) {
  if (segUnsub) { try { segUnsub(); } catch (e) {} segUnsub = null; }
  segItems = null;
  const j = (bank.jugadores || []).find(x => x.id === jid);
  segEscuchando = j && segMio(j) ? jid : '';
  if (!segEscuchando) return;
  segUnsub = window.SMB_CLOUD.seg.listen(jid, L => { if (perfilJid !== jid) return; segItems = L; jugadorPerfil(jid, perfilEq, true); });
}
function segNueva() { return { ven: segVenHoy(), sit: {}, rub: {}, quede: '' }; }
// si la DT activa o desactiva, o cambian los equipos del jugador, se vuelve a escuchar
let segEscuchando = '';
function segEscucharSiCambia() { const j = (bank.jugadores || []).find(x => x.id === perfilJid), k = j && segMio(j) ? perfilJid : '';
  if (k !== segEscuchando) { segEscuchando = k; segEscuchar(perfilJid); } }
// lo que dice una evaluación, en números: decide y ejecuta (media de las situaciones) y cada punto de la rúbrica
function evNums(ev) {
  const m = segMatriz(ev.sit) || {}, R = ev.rub || {};
  return { d: m.d ?? null, e: m.e ?? null, txt: m.txt || '', tec: media(Object.values(R)), ...Object.fromEntries(SEG_RUB.map(([k]) => [k, R[k] || null])) };
}
const EV_FILAS = [['d', 'Decide'], ['e', 'Ejecuta'], ...SEG_RUB];
const venDe = v => (SEG_VEN.find(x => x[0] === v) || [, v || ''])[1];
const fechaTs = ts => fmtShort(new Date(ts || Date.now()).toISOString().slice(0, 10));
// barras de 1 a 3, como las de la imagen pero con la escala del club
const barras3 = (filas, n) => `<div class="pf-barras">${filas.filter(([k]) => n[k] != null).map(([k, l]) =>
  `<div class="pf-b"><span>${esc(l)}</span><i style="--p:${Math.round(100 * n[k] / 3)}%"></i><b>${coma(n[k])}</b></div>`).join('')}</div>`;
// evolución: una línea por cosa (decide, ejecuta, técnica) a lo largo de las tomas
function evolSVG(EVc) {
  if (EVc.length < 2) return '';
  const W = 320, H = 150, L = 26, R = 10, T = 12, B = 30, x = i => L + (W - L - R) * i / (EVc.length - 1), y = v => T + (H - T - B) * (3 - v) / 2;
  const serie = (k, cls) => { const pts = EVc.map((ev, i) => [x(i), evNums(ev)[k]]).filter(([, v]) => v != null);
    return pts.length ? `<polyline class="${cls}" points="${pts.map(([a, v]) => a + ',' + y(v)).join(' ')}"/>${pts.map(([a, v]) => `<circle class="${cls}" cx="${a}" cy="${y(v)}" r="3.5"/>`).join('')}` : ''; };
  return `<svg class="pf-evol" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de decide, ejecuta y técnica">
    ${[1, 2, 3].map(v => `<line class="ej" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
    ${EVc.map((ev, i) => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(venDe(ev.ven).split(' ')[0])}</text>`).join('')}
    ${serie('d', 'l-d')}${serie('e', 'l-e')}${serie('tec', 'l-t')}</svg>
    <p class="pf-ley"><span class="l-d">Decide</span><span class="l-e">Ejecuta</span><span class="l-t">Técnica</span></p>`;
}
function jugadorPerfil(jid, t, quieto) {
  const j = (bank.jugadores || []).find(x => x.id === jid); if (!j) return;
  // lo que esté escribiendo no se pierde al repintar
  const guarda = quieto ? ['#sg-nota', '#sg-objtxt', '#sg-objrev', '[data-sgq]'].map(q => { const el = espBox.querySelector(q); return el ? [q, el.value] : null; }).filter(Boolean) : [];
  if (perfilJid !== jid) { perfilJid = jid; perfilTab = 'resumen'; segForm = segNueva(); segBorrar = null; segEscuchar(jid); }
  perfilEq = t || j.eq;
  const S = jugStats(j), act = segMio(j), puedo = puedeFicha(j, perfilEq);
  const I = segItems || [], EV = I.filter(x => x.tipo === 'ev').sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const OB = I.filter(x => x.tipo === 'obj').sort((a, b) => (b.ts || 0) - (a.ts || 0)), NT = I.filter(x => x.tipo === 'nota').sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const activos = OB.filter(o => o.estado === 'activo'), cerrados = OB.filter(o => o.estado !== 'activo');
  const tabs = [['resumen', 'Resumen'], ...(act ? [['evol', 'Evolución'], ['obj', `Objetivos${activos.length ? ' · ' + activos.length : ''}`], ['hist', 'Historial']] : [])];
  if (perfilTab !== 'evaluar' && !tabs.some(([k]) => k === perfilTab)) perfilTab = 'resumen';
  if (perfilTab === 'evaluar' && !act) perfilTab = 'resumen';
  const caja = (ico, tit, html, extra = '', mas = '') => `<section class="eq-box${extra}"><h3><span aria-hidden="true">${ico}</span>${tit}${mas ? `<button class="pf-mas" type="button" data-ptab="${mas}">Ver ›</button>` : ''}</h3>${html}</section>`;
  const barra = (l, n, de) => `<div class="eq-barra"><span>${l}</span><b>${n} de ${de}</b><i style="--p:${de ? Math.round(100 * n / de) : 0}%"></i></div>`;
  const quien = x => esc(x.autor || 'Sin nombre');
  const objLi = o => `<li><b>${esc(o.txt)}</b><small>revisar el ${esc(fmtShort(o.rev))}</small></li>`;
  let cuerpo = '';
  if (perfilTab === 'resumen') {
    const cajas = [];
    if (act) {
      const ult = EV[0], n = ult && evNums(ult);
      cajas.push(caja('✓', `Evaluación${ult ? ` <small class="meta">${esc(venDe(ult.ven))}, ${esc(fechaTs(ult.ts))}</small>` : ''}`, ult
        ? `${barras3(EV_FILAS, n)}${n.txt ? `<p class="sg-matriz">${esc(n.txt)}</p>` : ''}<button class="btn" type="button" data-ptab="evaluar">Nueva evaluación</button>`
        : `<p class="sub">Sin evaluar todavía. Se evalúa con las situaciones de su categoría: decide y ejecuta, de 1 a 3, y la técnica.</p><button class="btn primary" type="button" data-ptab="evaluar">Evaluar</button>`, ' pf-ev', ult ? 'evol' : ''));
      cajas.push(caja('◎', 'Objetivos activos', activos.length ? `<ul class="pf-obj">${activos.map(objLi).join('')}</ul>` : '<p class="sub">Ninguno. Como mucho, dos a la vez.</p>', '', 'obj'));
    }
    cajas.push(caja('◷', 'Temporada', S.de
      ? `${barra('Convocado', S.fue, S.de)}
         <p class="sub eq-dato">${S.bien || S.mej ? `Uno a uno: <b class="fh-bien">${S.bien} bien</b> · <b class="fh-mej">${S.mej} a mejorar</b>. ` : ''}${S.seguidos >= 2 ? `<b class="cv-toca">Lleva ${S.seguidos} seguidos sin ir.</b>` : ''}</p>
         <ul class="eq-ult">${S.filas.slice(0, 3).map(x => `<li><button type="button" data-fpart="${esc(x.f.pid)}"><span>${esc(x.f.rival || (x.p && x.p.rival) || '')}<small class="sub"> · ${esc(fmtShort(x.f.fecha))} · ${x.fue ? (x.ua === 'bien' ? 'bien' : x.ua === 'mej' ? 'a mejorar' : 'convocado') : 'no fue'}</small></span>${x.p && x.p.res ? `<span class="res-chip ${resCls(x.p)}">${esc(x.p.res)}</span>` : ''}</button></li>`).join('')}</ul>`
      : '<p class="sub">Todavía no hay fichas de partido con convocatoria en sus equipos.</p>'));
    if (act) cajas.push(caja('✎', 'Último apunte', NT[0] ? `<p class="pf-nota">${esc(NT[0].txt)}</p><p class="sub eq-dato">${quien(NT[0])}, ${esc(fechaTs(NT[0].ts))}</p>` : '<p class="sub">Ninguno todavía.</p>', '', 'hist'));
    cajas.push(caja('◆', 'Ficha', `<ul class="pts-list">${[['Año', j.a || 'sin año'], ['Puesto', j.p ? 'Portero' : 'Jugador de pista'], ['Equipo principal', j.eq || '—'], ...((j.otros || []).length ? [['También en', j.otros.join(' · ')]] : []), ...(j.nt ? [['Nota del listado', j.nt]] : [])].map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('')}</ul>
      ${puedo ? '<button class="btn" type="button" data-pcambiar>Cambiar</button>' : `<p class="sub eq-dato">La cambia quien lleva ${esc(j.eq)}.</p>`}`));
    if (canWriteBank && !segActivo()) cajas.push(caja('!', 'Evaluación y apuntes', segForm && segForm.activar
      ? `<p class="sub">Actívalo solo si el colegio ha confirmado que su política de privacidad cubre las evaluaciones deportivas y los apuntes de jugadores menores, y cuánto tiempo se guardan. Necesita las reglas nuevas de Firestore pegadas en la consola.</p>
         <div class="row"><button class="btn" type="button" data-segon="no">Todavía no</button><button class="btn primary" type="button" data-segon="si">Está confirmado: activar</button></div>`
      : `<p class="sub">Preparados y sin activar. Solo lo ves tú.</p><div class="row"><button class="btn" type="button" data-segon="ver">Activar</button></div>`, ' aviso'));
    cuerpo = `<div class="eq-grid">${cajas.join('')}</div>`;
  } else if (perfilTab === 'evol') {
    const EVc = EV.slice().reverse();
    const cols = EVc.slice(-4);
    cuerpo = EVc.length ? `${EVc.length > 1 ? `<section class="eq-box">${evolSVG(EVc)}</section>` : '<p class="sub">Con una sola evaluación todavía no hay evolución: sale a partir de la segunda toma.</p>'}
      <div class="pf-tabla" tabindex="0" role="region" aria-label="Evolución por toma"><table><thead><tr><th></th>${cols.map(ev => `<th>${esc(venDe(ev.ven).split(' ')[0])}<small>${esc(fechaTs(ev.ts))}</small></th>`).join('')}</tr></thead>
      <tbody>${EV_FILAS.map(([k, l]) => `<tr><th>${esc(l)}</th>${cols.map((ev, i) => { const v = evNums(ev)[k], a = i ? evNums(cols[i - 1])[k] : null;
        return `<td>${coma(v)}${v != null && a != null ? `<span class="pf-fl ${v > a ? 'sube' : v < a ? 'baja' : ''}">${v > a ? '↑' : v < a ? '↓' : '='}</span>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      <h2 class="h-sec">Situación por situación, la última vez</h2>
      <ul class="pf-sit">${(EV[0].sit || []).map(x => `<li><span>${esc(x.s)}</span><span>decide <b>${x.d || '—'}</b> · ejecuta <b>${x.e || '—'}</b></span></li>`).join('') || '<li><span class="sub">Sin situaciones puntuadas.</span></li>'}</ul>
      <p class="sub">Escala del club: 1 ${SEG_ESC[0].toLowerCase()} · 2 ${SEG_ESC[1].toLowerCase()} · 3 ${SEG_ESC[2].toLowerCase()}. Sin nota final ni comparaciones con otros.</p>`
      : `<p class="sub">Todavía no hay evaluaciones.</p><button class="btn primary" type="button" data-ptab="evaluar">Evaluar</button>`;
  } else if (perfilTab === 'evaluar') {
    const K = segCat(j.eq || perfilEq), SIT = SEG_SIT[K], F = segForm;
    const tres = (attr, val) => `<div class="fh-esc">${[1, 2, 3].map(v => `<button class="fh-eop${val === v ? ' si' : ''}" type="button" ${attr}="${v}" aria-pressed="${val === v}" title="${SEG_ESC[v - 1]}">${v}</button>`).join('')}</div>`;
    const sitArr = SIT.s.map((n, i) => Object.assign({ s: n }, F.sit[i] || {})).filter(x => x.d || x.e), M = segMatriz(sitArr);
    cuerpo = `<h2 class="h-sec">Nueva evaluación</h2>
      <div class="fh-esc">${SEG_VEN.map(([v, l]) => `<button class="fh-eop${F.ven === v ? ' si' : ''}" type="button" data-sgven="${v}" aria-pressed="${F.ven === v}">${l}</button>`).join('')}</div>
      <p class="sub">Foco de ${esc(catDe(j.eq || perfilEq) || 'su categoría')}: ${esc(SIT.foco)} Puntúa solo lo que hayas visto. 1 ${SEG_ESC[0].toLowerCase()} · 2 ${SEG_ESC[1].toLowerCase()} · 3 ${SEG_ESC[2].toLowerCase()}.</p>
      <h3 class="sg-h">En juego</h3>
      <ul class="sg-list">${SIT.s.map((n, i) => { const x = F.sit[i] || {};
        return `<li class="sg-fila"><span>${esc(n)}</span><span class="sg-par"><small>Decide</small>${tres(`data-sgd="${i}" data-v`, x.d)}</span><span class="sg-par"><small>Ejecuta</small>${tres(`data-sge="${i}" data-v`, x.e)}</span></li>`; }).join('')}</ul>
      ${M ? `<p class="sg-matriz">${esc(M.txt)}</p>` : ''}
      <h3 class="sg-h">Técnica</h3>
      <ul class="sg-list">${SEG_RUB.map(([k, l]) => `<li class="sg-fila rub"><span>${esc(l)}</span><span class="sg-par">${tres(`data-sgr="${k}" data-v`, F.rub[k])}</span></li>`).join('')}</ul>
      <details class="fh-mas"${F.quede ? ' open' : ''}><summary>Añadir una frase</summary><input type="text" maxlength="160" data-sgq value="${esc(F.quede)}" placeholder="Qué entrenar con él, en una línea"></details>
      <div class="fh-nav"><button class="btn" type="button" data-ptab="resumen">Cancelar</button><button class="btn primary" type="button" data-sgguardar${sitArr.length || Object.keys(F.rub).length ? '' : ' disabled'}>Guardar evaluación</button></div>
      <p class="sub" id="sg-msg" role="status"></p>`;
  } else if (perfilTab === 'obj') {
    cuerpo = `${activos.length ? `<ul class="sg-list">${activos.map(o => `<li class="sg-obj"><span><b>${esc(o.txt)}</b><small>revisar el ${esc(fmtShort(o.rev))} · ${quien(o)}</small></span><span class="row"><button class="btn" type="button" data-sgobj="${esc(o.id)}" data-est="logrado">Logrado</button><button class="btn" type="button" data-sgobj="${esc(o.id)}" data-est="aparcado">Aparcar</button></span></li>`).join('')}</ul>` : '<p class="sub">Ninguno activo.</p>'}
      ${activos.length < 2 ? `<div class="sg-nuevo"><label class="sg-lab" for="sg-objtxt">Nuevo objetivo</label><input type="text" maxlength="120" id="sg-objtxt" placeholder="Concreto y que se vea en pista"><label class="sg-lab" for="sg-objrev">Revisarlo el</label><input type="date" id="sg-objrev" value="${esc(new Date(Date.now() + 42 * 864e5).toISOString().slice(0, 10))}"><button class="btn" type="button" data-sgobjnuevo>Añadir objetivo</button></div>` : '<p class="sub">Dos activos como mucho: cierra uno para abrir otro.</p>'}
      <p class="sub" id="sg-msg" role="status"></p>
      ${cerrados.length ? `<h2 class="h-sec">Cerrados</h2><ul class="pts-list">${cerrados.map(o => `<li><span>${esc(o.txt)}</span><span>${o.estado === 'logrado' ? 'logrado' : 'aparcado'}${o.cerrado ? ' · ' + esc(fmtShort(o.cerrado)) : ''}</span></li>`).join('')}</ul>` : ''}`;
  } else {
    // historial: todo lo de este jugador en una línea de tiempo, con los apuntes
    const T = [...EV.map(x => ({ ts: x.ts, k: 'ev', x })), ...NT.map(x => ({ ts: x.ts, k: 'nota', x })), ...OB.map(x => ({ ts: x.ts, k: 'obj', x })),
      ...S.filas.map(f => ({ ts: new Date(f.f.fecha + 'T12:00').getTime(), k: 'part', x: f }))].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const li = ({ k, x, ts }) => {
      if (k === 'ev') { const n = evNums(x); return `<li class="pf-h ev"><small>${esc(fechaTs(ts))} · evaluación · ${quien(x)}</small><p>${esc(venDe(x.ven))}: decide ${coma(n.d)}, ejecuta ${coma(n.e)}, técnica ${coma(n.tec)}.${x.quede ? ` «${esc(x.quede)}»` : ''}</p></li>`; }
      if (k === 'obj') return `<li class="pf-h obj"><small>${esc(fechaTs(ts))} · objetivo · ${quien(x)}</small><p>${esc(x.txt)}${x.estado !== 'activo' ? ` <b>(${x.estado === 'logrado' ? 'logrado' : 'aparcado'})</b>` : ''}</p></li>`;
      if (k === 'part') return `<li class="pf-h part"><small>${esc(fmtShort(x.f.fecha))} · partido</small><p>${esc(x.f.rival || '')}: ${x.fue ? (x.ua === 'bien' ? 'convocado, bien' : x.ua === 'mej' ? 'convocado, a mejorar' : 'convocado') : 'no fue'}${x.p && x.p.res ? ` · ${esc(x.p.res)}` : ''}</p></li>`;
      return `<li class="pf-h nota"><small>${esc(fechaTs(ts))} · apunte · ${quien(x)}</small><p>${esc(x.txt)}</p>
        ${x.uid === miUid() || canWriteBank ? (segBorrar === x.id ? `<span class="row"><button class="btn" type="button" data-sgborrar="">No</button><button class="btn danger" type="button" data-sgborrar="${esc(x.id)}" data-ya>Sí, borrar</button></span>` : `<button class="linkb" type="button" data-sgborrar="${esc(x.id)}">Borrar</button>`) : ''}</li>`;
    };
    cuerpo = `<div class="pf-apunte"><label class="sg-lab" for="sg-nota">Nuevo apunte</label><textarea id="sg-nota" rows="3" maxlength="600" placeholder="Algo que hayas visto en pista, en un partido o con el grupo"></textarea><button class="btn primary" type="button" data-sgnota>Guardar apunte</button></div>
      <p class="sub" id="sg-msg" role="status"></p>
      ${T.length ? `<ul class="pf-hist">${T.map(li).join('')}</ul>` : '<p class="sub">Todavía no hay nada.</p>'}
      <p class="sub">Lo ven solo sus entrenadores y la Dirección Técnica. Escribe lo que viste, no etiquetas: «pierde la bola cuando le presionan en la salida» dice más que «le falta técnica». Nada de salud ni de la familia.</p>`;
  }
  espBox.innerHTML = `<div class="esp-top pf-top"><button class="pb-back" type="button" data-pvolver><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(perfilEq || 'Volver')}</button></div>
    <div class="pf-cab"><span class="jg-ini grande" aria-hidden="true">${esc(iniciales(j.n))}</span>
      <div><h1>${esc(j.n)}</h1><p class="sub">${[j.eq, j.a].filter(Boolean).map(esc).join(' · ')}</p>
        <p class="pf-chips"><span>${j.p ? 'Portero' : 'Jugador de pista'}</span>${(j.otros || []).map(x => `<span>También ${esc(x)}</span>`).join('')}</p></div>
      ${act && perfilTab !== 'evaluar' ? '<button class="btn primary pf-evaluar" type="button" data-ptab="evaluar">Evaluar</button>' : ''}</div>
    ${tabs.length > 1 && perfilTab !== 'evaluar' ? `<div class="seg eq-tabs" role="group" aria-label="Qué ver del jugador">${tabs.map(([k, l]) => `<button type="button" data-ptab="${k}" aria-pressed="${perfilTab === k}">${l}</button>`).join('')}</div>` : ''}
    ${perfilTab === 'resumen' ? cuerpo : `<section class="ses-sec">${cuerpo}</section>`}`;
  guarda.forEach(([q, v]) => { const el = espBox.querySelector(q); if (el) el.value = v; });
  espBox.hidden = false;
  if (!quieto) espBox.scrollTop = 0;
}
function perfilSoltar() { if (!perfilJid) return; if (segUnsub) { try { segUnsub(); } catch (e) {} segUnsub = null; } perfilJid = null; segItems = null; segEscuchando = ''; }
function perfilCerrar() { const t = perfilEq; perfilSoltar(); if (t) openEquipo(t); else closeCoach(); }
const segId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
async function segGuardar(obj, ok) {
  const CL = window.SMB_CLOUD, jid = perfilJid, m = document.getElementById('sg-msg');
  const { id, ...datos } = obj;
  try { await CL.seg.save(jid, id || segId(), Object.assign({ autor: readAuthor() || '' }, datos)); toast(ok); return true; }
  catch (e) { if (m) m.textContent = /permission/i.test((e && (e.code || e.message)) || '') ? 'No se ha guardado: faltan las reglas nuevas en la consola de Firebase, o no llevas este equipo.' : 'No se ha guardado. Inténtalo de nuevo.'; return false; }
}
// los toques del perfil
function perfilClick(e) {
  if (!perfilJid) return false;
  if (e.target.closest('[data-pvolver]')) { perfilCerrar(); return true; }
  const tb = e.target.closest('[data-ptab]'); if (tb) { perfilTab = tb.dataset.ptab; jugadorPerfil(perfilJid, perfilEq); return true; }
  if (e.target.closest('[data-pcambiar]')) { const t = perfilEq, i = plantillaDe(t).findIndex(x => x.id === perfilJid); if (i >= 0) jugadorEditar(t, i); return true; }
  const on = e.target.closest('[data-segon]');
  if (on && canWriteBank) { const v = on.dataset.segon;
    if (v === 'ver') segForm.activar = true; else if (v === 'no') segForm.activar = false;
    else { segForm.activar = false; saveBankExtra_({ segOn: isoToday() }, 'Evaluación y apuntes activados.'); return true; }
    jugadorPerfil(perfilJid, perfilEq, true); return true; }
  const F = segForm, n = x => +x;
  const vn = e.target.closest('[data-sgven]'); if (vn) { F.ven = vn.dataset.sgven; jugadorPerfil(perfilJid, perfilEq, true); return true; }
  const d = e.target.closest('[data-sgd]'), ex = e.target.closest('[data-sge]'), r = e.target.closest('[data-sgr]');
  if (d || ex) { const b = d || ex, i = b.dataset.sgd ?? b.dataset.sge, k = d ? 'd' : 'e', v = n(b.dataset.v);
    F.sit[i] = Object.assign({}, F.sit[i]); F.sit[i][k] = F.sit[i][k] === v ? 0 : v; jugadorPerfil(perfilJid, perfilEq, true); return true; }
  if (r) { const v = n(r.dataset.v); if (F.rub[r.dataset.sgr] === v) delete F.rub[r.dataset.sgr]; else F.rub[r.dataset.sgr] = v; jugadorPerfil(perfilJid, perfilEq, true); return true; }
  if (e.target.closest('[data-sgguardar]')) {
    const j = (bank.jugadores || []).find(x => x.id === perfilJid), SIT = SEG_SIT[segCat(j.eq || perfilEq)];
    const q = espBox.querySelector('[data-sgq]'); if (q) F.quede = q.value.trim();
    const sit = SIT.s.map((s, i) => ({ s, d: (F.sit[i] || {}).d || 0, e: (F.sit[i] || {}).e || 0 })).filter(x => x.d || x.e);
    segGuardar({ tipo: 'ev', ven: F.ven, eq: j.eq, sit, rub: Object.assign({}, F.rub), quede: F.quede, fecha: isoToday() }, 'Evaluación guardada.')
      .then(ok => { if (ok) { segForm = segNueva(); perfilTab = 'resumen'; jugadorPerfil(perfilJid, perfilEq); } });
    return true; }
  if (e.target.closest('[data-sgobjnuevo]')) {
    const txt = (document.getElementById('sg-objtxt').value || '').trim(), rev = document.getElementById('sg-objrev').value || isoToday();
    if (!txt) { document.getElementById('sg-msg').textContent = 'Escribe el objetivo.'; return true; }
    segGuardar({ tipo: 'obj', txt, rev, estado: 'activo', fecha: isoToday() }, 'Objetivo añadido.').then(ok => { const el = document.getElementById('sg-objtxt'); if (ok && el) el.value = ''; }); return true; }
  const ob = e.target.closest('[data-sgobj]');
  if (ob) { const o = (segItems || []).find(x => x.id === ob.dataset.sgobj); if (o) segGuardar(Object.assign({}, o, { estado: ob.dataset.est, cerrado: isoToday() }), ob.dataset.est === 'logrado' ? 'Objetivo logrado.' : 'Objetivo aparcado.'); return true; }
  if (e.target.closest('[data-sgnota]')) {
    const txt = (document.getElementById('sg-nota').value || '').trim(); if (!txt) return true;
    segGuardar({ tipo: 'nota', txt, fecha: isoToday() }, 'Apunte guardado.').then(ok => { const el = document.getElementById('sg-nota'); if (ok && el) el.value = ''; }); return true; }
  const br = e.target.closest('[data-sgborrar]');
  if (br) { const id = br.dataset.sgborrar;
    if (br.hasAttribute('data-ya')) { window.SMB_CLOUD.seg.del(perfilJid, id).then(() => toast('Apunte borrado.')).catch(() => { const m = document.getElementById('sg-msg'); if (m) m.textContent = 'No se ha podido borrar.'; }); segBorrar = null; }
    else segBorrar = id || null;
    jugadorPerfil(perfilJid, perfilEq, true); return true; }
  return false;
}

// ---------- la ficha de un partido: antes, descanso y después ----------
let fichaPid = null, fichaVuelta = null;
const fichaCuenta = () => { const e = document.getElementById('cv-cuenta'); if (e) e.textContent = espBox.querySelectorAll('.cv-row.si').length + ' convocados'; };
const FH_PASOS = ['Convocar', 'Plan', 'Cómo fue', 'Uno a uno'];
let fhPaso = 0;
function fichaPaso(i) {
  fhPaso = Math.max(0, Math.min(FH_PASOS.length - 1, i));
  espBox.querySelectorAll('.fh-paso').forEach(e => { e.hidden = +e.dataset.paso !== fhPaso; });
  espBox.querySelectorAll('[data-fpaso]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.fpaso === fhPaso));
  const ant = espBox.querySelector('[data-fpasomas="-1"]'), sig = espBox.querySelector('[data-fpasomas="1"]');
  if (ant) ant.disabled = fhPaso === 0;
  if (sig) { sig.textContent = fhPaso === FH_PASOS.length - 1 ? 'Hecho' : 'Siguiente ›'; }
}
function partidoAbrir(id) {
  perfilSoltar();
  const p = partidoPorId(id); if (!p) return;
  fichaPid = id;
  const N = FICHA, f = fichaDe(id) || {}, hoy = isoToday();
  const jug = plantillaDe(p.eq), conv = f.conv || null;   // null = todavía sin convocatoria
  const hueco = (clase, i, val, ph) => `<label class="ses-f"><input type="text" data-fh="${clase}" data-i="${i}" value="${esc(val || '')}" placeholder="${esc(ph)}" maxlength="90"></label>`;
  const jugado = p.fecha < hoy || p.res;
  espName = null; espEquipo = null;
  espBox.innerHTML = `<div class="esp-top pf-top"><button class="pb-back" type="button" data-fvolver><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Volver</button></div>
    <div class="eq-cab"><span class="eq-esc grande" aria-hidden="true">${esc(eqSigla(p.eq))}</span>
      <div><h1>${esc(p.casa ? 'vs ' : 'en ')}${esc(p.rival)}</h1>
        <p class="sub">${esc(p.eq)} · ${esc(fmtShort(p.fecha))}${p.hora ? ' · ' + esc(p.hora) : ' · sin hora'} · ${p.casa ? 'en casa' : 'fuera'}${p.j ? ' · jornada ' + p.j : ''}</p></div>
      ${p.res ? `<span class="res-chip grande ${resCls(p)}">${esc(p.res)}</span>` : ''}</div>
    <div class="seg fh-pasos" role="group" aria-label="Pasos de la ficha">${FH_PASOS.map((l, i) => `<button type="button" data-fpaso="${i}">${l}</button>`).join('')}</div>

    <section class="ses-sec fh-paso" data-paso="0"><div class="lt-head"><h2 class="h-sec">Convocatoria</h2><span class="sub" id="cv-cuenta">${conv ? conv.length + ' convocados' : jug.length + ' en la plantilla'}</span></div>
      ${jug.length ? (() => { const H = convHist(p.eq, id);
        const pie = j => { const x = H.por.get(j.n) || { n: 0, seguidos: 0 };
          if (!H.de) return j.p ? 'Portero' : '';
          const toca = x.seguidos >= 2;
          return `${j.p ? 'Portero · ' : ''}${x.n} de los últimos ${H.de}${toca ? ` · <b class="cv-toca">lleva ${x.seguidos} sin ir</b>` : ''}`;
        };
        return `<div class="vb-chips"><button class="chip sm" type="button" data-fconvtodos>Convocar a todos</button><button class="chip sm" type="button" data-fconvnadie>Quitar a todos</button></div>
        <ul class="cv-list">${jug.map(j => `<li><button class="cv-row${conv && conv.includes(j.n) ? ' si' : ''}" type="button" data-fconv="${esc(j.n)}" aria-pressed="${!!(conv && conv.includes(j.n))}"><span class="jg-ini" aria-hidden="true">${esc(iniciales(j.n))}</span><span class="jg-txt"><b>${esc(j.n)}</b>${pie(j) ? `<small>${pie(j)}</small>` : ''}</span><span class="cv-mark" aria-hidden="true"></span></button></li>`).join('')}</ul>
        <p class="sub">${H.de ? `Las cuentas son de los últimos ${H.de} partidos con convocatoria hecha. ` : ''}Asistencia, actitud, puntualidad, esfuerzo, evolución y contexto. Todos participan; no todos los mismos minutos.</p>`; })()
        : '<p class="sub">Este equipo todavía no tiene plantilla. Se pone en la pestaña Plantilla.</p>'}</section>

    <section class="ses-sec fh-paso" data-paso="1"><h2 class="h-sec">El plan</h2>
      <p class="sub">Una idea en ataque y una en defensa. Toca; no hace falta escribir.</p>
      <h3 class="h-sub">Con bola</h3>
      <div class="fh-grid">${IDEAS.ata.map(o => `<button class="fh-op${f.ata === o ? ' si' : ''}" type="button" data-fop="ata" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <h3 class="h-sub">Sin bola</h3>
      <div class="fh-grid">${IDEAS.def.map(o => `<button class="fh-op${f.def === o ? ' si' : ''}" type="button" data-fop="def" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <details class="dt-more"${f.otra ? ' open' : ''}><summary>Otra idea, con mis palabras</summary>
        <label class="ses-f"><input type="text" data-fh="otra" value="${esc(f.otra || '')}" placeholder="La tuya" maxlength="90"></label></details></section>

    <section class="ses-sec fh-paso" data-paso="2"><h2 class="h-sec">Cómo fue</h2>
      <p class="sub">Para después del partido. Un toque en cada cosa.</p>
      <h3 class="h-sub">¿Se vio el plan?</h3>
      <div class="fh-esc">${['No', 'A ratos', 'Sí'].map(o => `<button class="fh-eop${f.visto === o ? ' si' : ''}" type="button" data-fop="visto" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <h3 class="h-sub">El partido</h3>
      <div class="fh-esc">${['Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien'].map(o => `<button class="fh-eop${f.comofue === o ? ' si' : ''}" type="button" data-fop="comofue" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <h3 class="h-sub">Qué pasó</h3>
      <div class="fh-jug fh-tags">${PASO.map(o => `<button class="fh-j${(f.tags || []).includes(o) ? ' si' : ''}" type="button" data-ftag="${esc(o)}">${esc(o)}</button>`).join('')}</div></section>

    <section class="ses-sec fh-paso" data-paso="3"><h2 class="h-sec">Uno a uno</h2>
      <p class="sub">Opcional. Toca un nombre: una vez para <b class="cv-toca">bien</b>, otra para <b class="fh-mej">a mejorar</b>, otra para quitarlo.</p>
      ${jug.length ? `<div class="fh-jug">${jug.map(j => `<button class="fh-j ${((f.unoa || {})[j.n]) || ''}" type="button" data-fj="${esc(j.n)}">${esc(j.n)}</button>`).join('')}</div>`
        : '<p class="sub">Este equipo todavía no tiene plantilla.</p>'}</section>

    <details class="dt-more fh-mas fh-paso" data-paso="3"><summary>Escribir algo más</summary>
      <label class="ses-f">Lo que quieras recordar<textarea data-fh="salio" rows="3" placeholder="Una pregunta que hiciste y qué contestaron, algo que viste…">${esc(f.salio || '')}</textarea></label>
      <p class="sub">Del modelo: tres preguntas, no un discurso. Por ejemplo «¿quién tenía la ventaja ahí?», «¿a quién llevabas tú en el segundo gol?», «¿qué hicimos bien que quieras repetir?».</p>
      <p class="sub">Si la diferencia llega a 10 el marcador se cierra: se exige algo concreto del modelo, ni bajar los brazos ni seguir goleando.</p></details>

    <div class="fh-nav"><button class="btn" type="button" data-fpasomas="-1">‹ Anterior</button><button class="btn primary" type="button" data-fpasomas="1">Siguiente ›</button></div>
    <p class="sub fh-msg" id="fh-msg" role="status">${f.autor ? 'La empezó ' + esc(f.autor) + '. ' : ''}Se guarda solo.${bank.fichasNo ? ' Ojo: faltan las reglas de Firestore, así que de momento no se guarda.' : ''}</p>
    ${f.pid ? '<div class="actions fh-paso" data-paso="3"><button class="btn ghost" type="button" data-fborrar>Borrar la ficha</button></div>' : ''}`;
  // de entrada: si el partido ya se ha jugado, a «Cómo fue»; si no, a la convocatoria
  fichaPaso(jugado ? 2 : 0);
  espBox.hidden = false; document.body.style.overflow = document.body.classList.contains('eq-dock') ? '' : 'hidden'; espBox.scrollTop = 0;
  const b = espBox.querySelector('[data-fvolver]'); if (b) b.focus();
}
function fichaRecoger() {
  const p = partidoPorId(fichaPid); if (!p) return null;
  const sel = c => { const e = espBox.querySelector(`[data-fop="${c}"].si`); return e ? e.dataset.v : ''; };
  const txt = c => { const e = espBox.querySelector(`[data-fh="${c}"]`); return e ? e.value.trim() : ''; };
  const unoa = {};
  espBox.querySelectorAll('.fh-j').forEach(e => { const v = e.classList.contains('bien') ? 'bien' : e.classList.contains('mej') ? 'mej' : ''; if (v) unoa[e.dataset.fj] = v; });
  const hay = espBox.querySelector('.cv-row');
  return { pid: fichaPid, eq: p.eq, fecha: p.fecha, rival: p.rival,
    ata: sel('ata'), def: sel('def'), otra: txt('otra'),
    visto: sel('visto'), comofue: sel('comofue'),
    tags: [...espBox.querySelectorAll('[data-ftag].si')].map(e => e.dataset.ftag),
    unoa, salio: txt('salio'),
    conv: hay ? [...espBox.querySelectorAll('.cv-row.si')].map(e => e.dataset.fconv) : null };
}
const fichaVacia = f => !f || (!(f.conv || []).length && !(f.tags || []).length && !Object.keys(f.unoa || {}).length
  && ![f.ata, f.def, f.otra, f.visto, f.comofue, f.salio].some(x => x));
// Se guarda sola: nada de botón de guardar, que es justo lo que da pereza.
let fichaT = null;
function fichaGuardar(yaMismo) {
  clearTimeout(fichaT);
  const hacer = () => {
    const f = fichaRecoger(); if (!f || fichaVacia(f)) return;
    const msg = document.getElementById('fh-msg'), CL = window.SMB_CLOUD;
    if (!CL || !CL.ficha) { if (msg) msg.textContent = 'La copia de claude.ai no guarda fichas; la web sí.'; return; }
    if (msg) msg.textContent = 'Guardando…';
    Promise.resolve(CL.ficha.save(f.pid, f))
      .then(() => { if (msg) msg.textContent = 'Guardado.'; })
      .catch(e => { if (msg) msg.textContent = 'No se ha podido guardar' + (bank.fichasNo ? ': faltan las reglas de Firestore.' : '. ' + ((e && e.message) || '')); });
  };
  if (yaMismo) hacer(); else fichaT = setTimeout(hacer, 900);
}
// ---------- altas, bajas y cambios (16 nov) ----------
// La plantilla vive en club/state, donde solo escribe la DT: por eso esto solo sale si canWriteBank.
function plantGuardar(mapa, texto) {
  const limpio = {};
  Object.entries(mapa).forEach(([k, L]) => { if (L && L.length) limpio[k] = L; });
  // la capa del equipo no se repinta sola al guardar: está fuera de render()
  return Promise.resolve(saveBank(bank.tasks, texto, null, { plant: limpio }))
    .then(r => { if (!espBox.hidden && espEquipo) openEquipo(espEquipo); return r; });
}
const equiposParaPlantilla = () => [...new Set([...equiposMap(horario()).map(x => x.t).filter(t => !/^porter/.test(deacc(t))),
  ...Object.keys(bank.plant || {})])].sort((a, b) => eqRank(a) - eqRank(b) || a.localeCompare(b, 'es'));

// Quién puede abrir «Cambiar»: la DT siempre; tras la migración, quien lleva su equipo principal
// (todo) o uno de sus otros equipos (solo meterlo o sacarlo del suyo).
const puedeFicha = (p, t) => canWriteBank || (migrado() && (llevoEq(p.eq) || (p.otros || []).some(llevoEq)));
const nuevoId = () => 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function jugadorEditar(t, i) {
  const nuevo = i < 0, p = nuevo ? { n: '', a: '', p: 0, eq: t, otros: [] } : plantillaDe(t)[i];
  if (!p) return;
  const eqs = equiposParaPlantilla();
  const M = migrado();
  // con fichas únicas: quien lleva el principal (o la DT) lo cambia todo; quien solo lleva uno de
  // los otros equipos solo puede meterlo o sacarlo del suyo
  const todo = canWriteBank || nuevo || (M && llevoEq(p.eq));
  const principal = M ? (p.eq || t) : t;
  const otrosIni = M ? (p.otros || []) : [];
  const chips = M ? eqs.filter(e => e !== principal).map(e => {
    const puedo = todo || llevoEq(e), on = otrosIni.includes(e);
    return `<button class="fh-j${on ? ' si' : ''}" type="button" data-pjo="${esc(e)}"${puedo ? '' : ' disabled'} aria-pressed="${on}">${esc(e)}</button>`;
  }).join('') : '';
  const ro = todo ? '' : ' disabled';
  openModal(`<h2>${nuevo ? 'Añadir jugador' : 'Cambiar jugador'}</h2><p class="sub">${esc(t)}</p>
    <label class="ses-f">Nombre<input type="text" id="pj-n" value="${esc(p.n)}" autocomplete="off" placeholder="Nombre y apellido"${ro}></label>
    <div class="pj-fila">
      <label class="ses-f">Año de nacimiento<input type="text" id="pj-a" value="${esc(p.a || '')}" inputmode="numeric" placeholder="2016 o Senior"${ro}></label>
      <label class="ses-f">${M ? 'Equipo principal' : 'Equipo'}<select id="pj-eq"${ro}>${eqs.map(e => `<option value="${esc(e)}"${e === principal ? ' selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
    </div>
    <label class="pj-check"><input type="checkbox" id="pj-p"${p.p ? ' checked' : ''}${ro}> Es portero</label>
    ${M ? `<h3 class="h-sub">También juega en</h3><div class="fh-jug pj-otros">${chips}</div>` : ''}
    <label class="ses-f">Nota corta (opcional)<input type="text" id="pj-nt" value="${esc(p.nt || '')}" maxlength="60" placeholder="Lo que haga falta recordar"${ro}></label>
    ${todo ? '' : `<p class="sub">Su ficha la cambia quien lleva ${esc(p.eq)}. Tú puedes meterlo o sacarlo de tu equipo.</p>`}
    <p class="sub" id="pj-msg" role="status"></p>
    <div class="row">${nuevo ? '' : '<button class="btn ghost" id="m-baja" type="button">Quitar de ' + esc(t) + '</button>'}<button class="btn" id="m-no" type="button">Cancelar</button><button class="btn primary" id="m-ok" type="button">Guardar</button></div>`);
  const v = id => (modalCard.querySelector(id).value || '').trim();
  const msg = modalCard.querySelector('#pj-msg');
  modalCard.querySelector('#m-no').onclick = closeModal;
  modalCard.querySelectorAll('[data-pjo]').forEach(b => b.onclick = () => { b.classList.toggle('si'); b.setAttribute('aria-pressed', b.classList.contains('si')); });
  if (todo) modalCard.querySelector('#pj-n').focus();

  modalCard.querySelector('#m-ok').onclick = () => {
    const nombre = v('#pj-n');
    if (!nombre) { msg.textContent = 'Le falta el nombre.'; modalCard.querySelector('#pj-n').focus(); return; }
    const destino = v('#pj-eq') || principal;
    if (!M) {   // plantilla vieja: solo la DT, como hasta ahora
      const ficha = { n: nombre }; const anio = v('#pj-a'); if (anio) ficha.a = anio;
      if (modalCard.querySelector('#pj-p').checked) ficha.p = 1; const nota = v('#pj-nt'); if (nota) ficha.nt = nota;
      const repe = plantillaDe(destino).some((y, j) => normName(y.n) === normName(nombre) && !(destino === t && j === i));
      if (repe) { msg.textContent = `${nombre} ya está en ${destino}.`; return; }
      const mapa = clone(bank.plant || {});
      if (!nuevo) mapa[t] = (mapa[t] || []).filter((_, j) => j !== i);
      mapa[destino] = (mapa[destino] || []).concat([ficha]);
      closeModal();
      plantGuardar(mapa, nuevo ? `${nombre}, añadido a ${destino}.` : destino === t ? `${nombre}, cambiado.` : `${nombre} pasa a ${destino}.`);
      return;
    }
    const otros = [...modalCard.querySelectorAll('[data-pjo].si')].map(b => b.dataset.pjo).filter(e => e !== destino);
    const repe = bank.jugadores.some(y => y.id !== p.id && normName(y.n) === normName(nombre) && [y.eq, ...(y.otros || [])].some(e => e === destino || otros.includes(e)));
    if (repe) { msg.textContent = `Ya hay un ${nombre} en ese equipo.`; return; }
    const doc = todo
      ? { n: nombre, a: v('#pj-a'), p: modalCard.querySelector('#pj-p').checked, nt: v('#pj-nt'), eq: destino, otros, temp: p.temp || TEMPORADA }
      : Object.assign({}, limpiaJug(p), { otros });   // solo cambia «otros»: lo demás, tal cual
    closeModal();
    jugGuardar(nuevo ? nuevoId() : p.id, doc, nuevo ? `${nombre}, añadido a ${destino}.` : destino !== principal ? `${nombre} pasa a ${destino}.` : `${nombre}, guardado.`);
  };

  const baja = modalCard.querySelector('#m-baja');
  if (baja) baja.onclick = () => {
    closeModal();
    if (!M) {
      const resto = tambienEn(p, t);
      confirmModal(`¿Quitar a ${p.n} de ${t}?`, resto.length ? `Sigue en ${resto.join(' y ')}.` : 'No está en ningún otro equipo.', 'Quitar', () => {
        const mapa = clone(bank.plant || {}); mapa[t] = (mapa[t] || []).filter((_, j) => j !== i);
        plantGuardar(mapa, `${p.n}, fuera de ${t}.`);
      });
      return;
    }
    const otros = (p.otros || []).filter(e => e !== t);
    if (t !== p.eq) {   // sale de uno de sus otros equipos
      confirmModal(`¿Quitar a ${p.n} de ${t}?`, `Sigue en ${[p.eq, ...otros].join(' y ')}.`, 'Quitar',
        () => jugGuardar(p.id, Object.assign({}, limpiaJug(p), { otros }), `${p.n}, fuera de ${t}.`));
    } else if (otros.length) {   // sale de su equipo principal pero sigue en otros: el primero pasa a principal
      confirmModal(`¿Quitar a ${p.n} de ${t}?`, `Sigue en ${otros.join(' y ')}; su equipo principal pasa a ser ${otros[0]}.`, 'Quitar',
        () => jugGuardar(p.id, Object.assign({}, limpiaJug(p), { eq: otros[0], otros: otros.slice(1) }), `${p.n}, fuera de ${t}.`));
    } else {
      confirmModal(`¿Dar de baja a ${p.n}?`, 'No está en ningún otro equipo: se borra su ficha.', 'Dar de baja',
        () => jugBorrar(p.id, `${p.n}, de baja.`));
    }
  };
}
// Lo que se guarda de un jugador: campos normales, sin el id ni lo que pone la nube.
const limpiaJug = p => ({ n: p.n || '', a: p.a || '', p: !!p.p, nt: p.nt || '', eq: p.eq || '', otros: p.otros || [], temp: p.temp || TEMPORADA });
function jugGuardar(id, doc, texto) {
  const CL = window.SMB_CLOUD;
  if (!CL || !CL.jug) { toast('La copia de claude.ai no guarda jugadores; la web sí.'); return Promise.resolve(false); }
  return Promise.resolve(CL.jug.save(id, doc)).then(() => { toast(texto); return true; })
    .catch(e => { toast(bank.jugadoresNo ? 'Faltan las reglas de Firestore de los jugadores.' : 'No se ha podido guardar: no llevas ese equipo.'); return false; });
}
function jugBorrar(id, texto) {
  const CL = window.SMB_CLOUD; if (!CL || !CL.jug) return Promise.resolve(false);
  return Promise.resolve(CL.jug.del(id)).then(() => { toast(texto); return true; }).catch(() => { toast('No se ha podido borrar.'); return false; });
}

