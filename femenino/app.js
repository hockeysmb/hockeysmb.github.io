/* Seguimiento SMB · Femenino
   App de las jugadoras de los equipos femeninos: cómo llegan (bienestar), cómo entrenan (carga) y cómo se ven
   (autoevaluación y metas). Solo la Dirección Técnica ve los datos de todas; cada jugadora ve y borra los suyos.
   Datos en un proyecto de Firebase propio (no el del banco). Reglas en firestore.rules. */
(() => {
  'use strict';
  // ================= utilidades =================
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = dateOf(s); d.setDate(d.getDate() + n); return isoOf(d); };
  const today = () => isoOf(new Date());
  const mondayOf = s => { const d = dateOf(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoOf(d); };
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fmtDay = s => { const d = dateOf(s); return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`; };
  const fmtShort = s => { const d = dateOf(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
  const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 864e5);
  const r1 = x => Math.round(x * 10) / 10;
  const fmt1 = x => x == null || isNaN(x) ? '—' : r1(x).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtInt = x => x == null || isNaN(x) ? '—' : Math.round(x).toLocaleString('es-ES');
  const clone = o => JSON.parse(JSON.stringify(o));
  let toastT = 0;
  function toast(t) { let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); } el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

  // ================= backend: Firebase (o uno simulado en las pruebas) =================
  function firebaseBackend() {
    firebase.initializeApp(window.SMBF_FIREBASE);
    const auth = firebase.auth(), db = firebase.firestore();
    try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
    const user = u => u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null;
    return {
      onAuth: cb => auth.onAuthStateChanged(u => cb(user(u))),
      google: () => { const p = new firebase.auth.GoogleAuthProvider(); return auth.signInWithPopup(p).catch(e => { if (e && /popup|operation-not-supported/.test(e.code || '')) return auth.signInWithRedirect(p); throw e; }); },
      emailIn: (email, pass) => auth.signInWithEmailAndPassword(email, pass),
      emailUp: (email, pass) => auth.createUserWithEmailAndPassword(email, pass),
      reset: email => auth.sendPasswordResetEmail(email),
      signOut: () => auth.signOut(),
      listenDoc: (p, cb, er) => db.doc(p).onSnapshot(s => cb(s.exists ? s.data() : null), er),
      listenCol: (p, cb, er) => db.collection(p).onSnapshot(s => cb(s.docs.map(d => ({ id: d.id, data: d.data() }))), er),
      getCol: p => db.collection(p).get().then(s => s.docs.map(d => ({ id: d.id, data: d.data() }))),
      getDoc: p => db.doc(p).get().then(s => s.exists ? s.data() : null),
      set: (p, d) => db.doc(p).set(d),
      merge: (p, d) => db.doc(p).set(d, { merge: true }),
      del: p => db.doc(p).delete(),
      batch: async ops => { for (let i = 0; i < ops.length; i += 400) { const b = db.batch(); ops.slice(i, i + 400).forEach(o => o.op === 'del' ? b.delete(db.doc(o.path)) : b.set(db.doc(o.path), o.data)); await b.commit(); } },
    };
  }
  const configured = !!(window.SMBF_BACKEND || (window.SMBF_FIREBASE && window.SMBF_FIREBASE.apiKey && window.SMBF_FIREBASE.apiKey !== 'PENDIENTE'));
  const B = window.SMBF_BACKEND || (configured ? firebaseBackend() : null);
  const ADMIN = window.SMBF_ADMIN || [];
  const authErr = e => {
    const c = (e && e.code) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'Correo o contraseña incorrectos.';
    if (/email-already-in-use/.test(c)) return 'Ya hay una cuenta con ese correo: pulsa «Entrar».';
    if (/weak-password/.test(c)) return 'La contraseña tiene que tener al menos 6 caracteres.';
    if (/popup-closed|cancelled-popup/.test(c)) return 'Se ha cerrado la ventana de Google antes de terminar.';
    if (/network/.test(c)) return 'Sin conexión. Inténtalo cuando tengas internet.';
    return 'No se ha podido entrar. Inténtalo otra vez.';
  };

  // ================= lo que se pregunta =================
  const EQUIPOS = [{ id: 'sub17', n: 'Sub17', dias: [1, 2] }, { id: 'senior', n: 'Senior Fem', dias: [1, 2, 4] }];
  const eqName = id => (EQUIPOS.find(e => e.id === id) || {}).n || '—';
  const WELL = [
    { k: 'sueno', n: 'Sueño', lo: 'Muy mal', hi: 'Muy bien' },
    { k: 'fatiga', n: 'Cansancio', lo: 'Agotada', hi: 'Muy fresca' },
    { k: 'dolor', n: 'Molestias musculares', lo: 'Muchas', hi: 'Ninguna' },
    { k: 'estres', n: 'Estrés', lo: 'Mucho', hi: 'Nada' },
    { k: 'animo', n: 'Ánimo', lo: 'Muy bajo', hi: 'Muy bueno' },
  ];
  // escala CR-10 de esfuerzo percibido (Foster)
  const RPE = ['Reposo', 'Muy, muy suave', 'Suave', 'Moderado', 'Algo duro', 'Duro', 'Duro', 'Muy duro', 'Muy duro', 'Casi al máximo', 'Máximo'];
  const TIPOS = [{ k: 'entreno', n: 'Entreno', min: 90 }, { k: 'partido', n: 'Partido', min: 50 }, { k: 'otro', n: 'Otro', min: 45 }];
  const ESC3 = ['Todavía no', 'A veces', 'Casi siempre'];
  const PREGUNTAS = [
    '¿Qué te ha funcionado esta semana?',
    '¿En qué momento de un entreno decidiste mejor? ¿Qué viste?',
    '¿Qué harías distinto la próxima vez que te pase lo mismo?',
    '¿Qué te ha costado más y por qué crees que ha sido?',
    '¿Qué has aprendido de una compañera esta semana?',
  ];
  const INFO_V = '2026-10-23';
  const META_OK = [['si', 'Sí'], ['medias', 'A medias'], ['no', 'No']];

  // ================= cálculos =================
  const wellScore = a => { if (!a) return null; const v = WELL.map(w => a[w.k]).filter(x => x >= 1); return v.length === WELL.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const dayLoad = d => ((d && d.ses) || []).reduce((s, x) => s + (+x.rpe || 0) * (+x.min || 0), 0);
  const lastAnswer = dias => Object.keys(dias).filter(k => dias[k] && (dias[k].antes || (dias[k].ses || []).length)).sort().pop() || '';
  function baseline(dias, ref) {
    const v = []; for (let i = 1; i <= 28; i++) { const s = wellScore((dias[addDays(ref, -i)] || {}).antes); if (s != null) v.push(s); }
    return v.length >= 7 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }
  function loads(dias, ref) {
    let acute = 0, total = 0;
    for (let i = 0; i < 28; i++) { const l = dayLoad(dias[addDays(ref, -i)]); total += l; if (i < 7) acute += l; }
    const first = Object.keys(dias).filter(k => dayLoad(dias[k]) > 0).sort()[0];
    const span = first ? daysBetween(first, ref) + 1 : 0;
    const chronic = total / 4, ratio = chronic > 0 && span >= 21 ? acute / chronic : null;
    return { acute, chronic, ratio, span };
  }
  // estado de una jugadora: ok / warn (atención) / bad (revisar), con los motivos
  function estado(dias, ref) {
    const R = [], add = (lvl, txt) => R.push({ lvl, txt });
    const a = (dias[ref] || {}).antes, s = wellScore(a), base = baseline(dias, ref), L = loads(dias, ref), last = lastAnswer(dias);
    if (s != null && s <= 2.5) add('bad', `Llega mal hoy (${fmt1(s)} de 5).`);
    else if (s != null && base != null && s <= base - 0.8) add('warn', `Hoy está por debajo de lo normal en ella (${fmt1(s)}; suele estar en ${fmt1(base)}).`);
    if (a && a.dolor <= 2) add('warn', 'Molestias musculares altas.');
    if (L.ratio != null && L.ratio > 1.5) add('bad', `La carga de esta semana se dispara: ${fmt1(L.ratio)} veces su media del mes.`);
    else if (L.ratio != null && L.ratio > 1.3) add('warn', `Carga alta esta semana: ${fmt1(L.ratio)} veces su media del mes.`);
    else if (L.ratio != null && L.ratio < 0.8) add('warn', `Carga baja esta semana: ${fmt1(L.ratio)} veces su media del mes.`);
    if (!last) add('none', 'Todavía no ha respondido nada.');
    else if (daysBetween(last, ref) >= 4) add('warn', `Lleva ${daysBetween(last, ref)} días sin responder.`);
    const lvl = R.some(x => x.lvl === 'bad') ? 'bad' : R.some(x => x.lvl === 'warn') ? 'warn' : !last ? 'none' : 'ok';
    return { lvl, R, s, base, L, last };
  }
  const ST_LBL = { ok: 'Bien', warn: 'Atención', bad: 'Revisar', none: 'Sin datos' };
  const ST_IC = {
    ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5l6 11H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 6.5v3.2M8 11.6v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    bad: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 4.8v4M8 11v.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    none: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.4 2"/></svg>',
  };
  const stHTML = lvl => `<span class="st ${lvl}">${ST_IC[lvl]}${ST_LBL[lvl]}</span>`;

  // ================= gráficos (una serie, sin leyenda: lo dice el título) =================
  function tip(x, y, txt, W) { const w = Math.max(40, txt.length * 6.4 + 14), tx = Math.min(Math.max(x - w / 2, 0), W - w); return `<g class="tipg"><rect x="${tx}" y="${y - 30}" width="${w}" height="22" rx="6"/><text x="${tx + w / 2}" y="${y - 15}" text-anchor="middle">${esc(txt)}</text></g>`; }
  function wellChart(dias, ref, n = 28) {
    const W = 360, H = 170, L = 22, Rr = 6, T = 30, Bt = 22, iw = W - L - Rr, ih = H - T - Bt;
    const X = i => L + (n === 1 ? iw / 2 : i * iw / (n - 1)), Y = v => T + (5 - v) / 4 * ih;
    const pts = []; for (let i = 0; i < n; i++) { const day = addDays(ref, i - n + 1), s = wellScore((dias[day] || {}).antes); pts.push({ i, day, s }); }
    // los días sin respuesta no cortan la línea: se responde los días de entreno
    let path = ''; pts.filter(p => p.s != null).forEach((p, k) => { path += `${k ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.s).toFixed(1)}`; });
    const base = baseline(dias, ref);
    const grid = [1, 3, 5].map(v => `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('');
    const xl = [0, Math.floor((n - 1) / 2), n - 1].map(i => `<text x="${X(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${fmtShort(addDays(ref, i - n + 1))}</text>`).join('');
    const band = base != null ? `<rect class="band" x="${L}" y="${Y(Math.min(5, base + 0.4))}" width="${iw}" height="${Y(Math.max(1, base - 0.4)) - Y(Math.min(5, base + 0.4))}"/>` : '';
    const marks = pts.filter(p => p.s != null).map(p => `<g class="m"><circle class="hit" cx="${X(p.i)}" cy="${Y(p.s)}" r="11"/><circle class="dot" cx="${X(p.i)}" cy="${Y(p.s)}" r="4"/>${tip(X(p.i), Y(p.s), `${fmtShort(p.day)}: ${fmt1(p.s)}`, W)}</g>`).join('');
    const has = pts.some(p => p.s != null);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cómo llega a los entrenos, últimos ${n} días, de 1 a 5">${grid}${band}${has ? `<path class="ln" d="${path}"/>` : `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Sin respuestas en estos días</text>`}${marks}${xl}</svg>`;
  }
  function loadChart(dias, ref, weeks = 8) {
    const W = 360, H = 170, L = 34, Rr = 6, T = 30, Bt = 22, iw = W - L - Rr, ih = H - T - Bt;
    const m0 = mondayOf(ref), data = [];
    for (let k = weeks - 1; k >= 0; k--) { const m = addDays(m0, -7 * k); let s = 0; for (let i = 0; i < 7; i++) s += dayLoad(dias[addDays(m, i)]); data.push({ m, s, now: k === 0 }); }
    const max = Math.max(...data.map(d => d.s), 1), nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p) * p; })();
    const bw = iw / weeks, Y = v => T + ih - v / nice * ih;
    const grid = [0, nice / 2, nice].map(v => `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${fmtInt(v)}</text>`).join('');
    const bars = data.map((d, i) => { const x = L + i * bw + bw * 0.18, w = bw * 0.64, h = Math.max(0, ih - (Y(d.s) - T)), y = Y(d.s);
      return `<g class="m"><rect class="hit" x="${L + i * bw}" y="${T}" width="${bw}" height="${ih}"/>${d.s > 0 ? `<path class="bar${d.now ? ' now' : ''}" d="M${x},${T + ih} V${y + 4} q0,-4 4,-4 h${w - 8} q4,0 4,4 V${T + ih} Z"/>` : ''}${tip(x + w / 2, y, `Semana del ${fmtShort(d.m)}: ${fmtInt(d.s)}${d.now ? ' (en curso)' : ''}`, W)}<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${fmtShort(d.m)}</text></g>`; }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Carga por semana (esfuerzo por minutos), últimas ${weeks} semanas">${grid}${bars}</svg>`;
  }

  // ================= estado de la app =================
  const root = $('#root');
  let me = null, unsub = [];
  const U = { perfil: undefined, acceso: undefined, equipo: null, dias: {}, semanas: {} };     // jugadora
  const A = { jug: {}, acc: {}, regs: {}, equipos: {}, val: {}, eq: 'todas', sel: '', subs: {} }; // DT
  let view = 'hoy';
  const isAdmin = () => !!me && ADMIN.includes(me.uid);
  const stop = () => { unsub.forEach(f => { try { f(); } catch (e) {} }); unsub = []; Object.values(A.subs).forEach(f => { try { f(); } catch (e) {} }); A.subs = {}; };

  // ================= entrada =================
  function shell(inner, opts = {}) {
    root.innerHTML = `<header class="top"><div class="top-in"><div class="brand"><img src="../icons/icon-192.png" alt=""><div><small>CHP Santa María la Blanca</small><b>Femenino · Seguimiento</b></div></div>${opts.right || ''}</div></header>
      <main class="wrap${opts.wide ? ' wide' : ''}">${inner}</main>${opts.nav || ''}`;
  }
  function gate(inner) { root.innerHTML = `<div class="gate"><div class="card"><div class="gate-logo"><img src="../icons/icon-192.png" alt=""><span class="kicker">CHP Santa María la Blanca</span><h1>Femenino · Seguimiento</h1></div>${inner}</div></div>`; }
  function loginView(msg) {
    gate(`<p class="sub" style="text-align:center">Cómo llegas, cómo entrenas y cómo te ves. Menos de un minuto al día.</p>
      <button class="btn primary" type="button" data-a="google">Entrar con Google</button>
      <div class="or">o con tu correo</div>
      <label class="field">Correo<input type="email" id="l-email" autocomplete="email"></label>
      <label class="field">Contraseña<input type="password" id="l-pass" autocomplete="current-password"></label>
      <div class="row"><button class="btn primary" type="button" data-a="in">Entrar</button><button class="btn" type="button" data-a="up">Crear cuenta</button></div>
      <button class="btn ghost small" type="button" data-a="reset">He olvidado mi contraseña</button>
      <p class="msg${msg ? ' err' : ''}" id="l-msg">${esc(msg || '')}</p>`);
  }
  function notReady() {
    gate(`<p>La app todavía no está conectada a su base de datos.</p><p class="sub">La Dirección Técnica tiene que crear el proyecto de Firebase y copiar su configuración en <b>firebase-config.js</b>. Los pasos están en la guía del proyecto.</p>`);
  }
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, v = id => (document.getElementById(id) || {}).value || '', say = (t, err) => { const m = $('#l-msg') || $('#msg'); if (m) { m.textContent = t; m.className = 'msg ' + (err ? 'err' : 'ok'); } };
    try {
      if (a === 'google') await B.google();
      else if (a === 'in') await B.emailIn(v('l-email').trim(), v('l-pass'));
      else if (a === 'up') await B.emailUp(v('l-email').trim(), v('l-pass'));
      else if (a === 'reset') { if (!v('l-email').trim()) return say('Escribe tu correo arriba y vuelve a pulsar.', true); await B.reset(v('l-email').trim()); say('Te hemos mandado un correo para cambiar la contraseña.'); }
      else if (a === 'out') { stop(); await B.signOut(); }
      else if (actions[a]) await actions[a](b);
    } catch (er) {
      if (['google', 'in', 'up', 'reset'].includes(a)) say(authErr(er), true);
      else { console.error(er); toast('No se ha podido guardar. Revisa la conexión e inténtalo otra vez.'); }
    }
  });
  const actions = {};

  // ================= jugadora: alta y espera =================
  function altaView() {
    const p = U.perfil || {};
    gate(`<h2>Antes de empezar</h2>
      <div class="info"><p>Esta app sirve para que la Dirección Técnica cuide cómo llegas a los entrenos y cómo los vives, y para que tú veas tu evolución.</p>
      <ul><li><b>Qué se guarda:</b> tu nombre, tu equipo y lo que respondes (cómo llegas, esfuerzo del entreno, autoevaluación y metas).</li>
      <li><b>Quién lo ve:</b> solo Carlos Manzano, Director Técnico. Tú ves lo tuyo.</li>
      <li><b>Hasta cuándo:</b> hasta el 30 de junio de 2027. Puedes borrarlo todo antes desde «Mis datos».</li>
      <li><b>Es voluntario:</b> quien no la usa entrena y juega igual.</li></ul>
      <p class="sub">La hoja completa de información te la da Carlos en papel, con la de consentimiento.</p></div>
      <label class="field">Nombre y apellidos<input type="text" id="a-nombre" value="${esc(p.nombre || me.name || '')}" autocomplete="name"></label>
      <div class="field">Equipo<div class="seg" id="a-eq">${EQUIPOS.map(e => `<button type="button" data-eq="${e.id}" aria-pressed="${p.equipo === e.id}">${e.n}</button>`).join('')}</div></div>
      <label class="check"><input type="checkbox" id="a-menor"${p.menor ? ' checked' : ''}> Soy menor de edad</label>
      <label class="check"><input type="checkbox" id="a-ok"> He leído la información y quiero usar la app.</label>
      <label class="check" id="a-fam-l"${p.menor ? '' : ' hidden'}><input type="checkbox" id="a-fam"> Mi familia ha firmado (o va a firmar) la hoja de consentimiento.</label>
      <button class="btn primary" type="button" data-a="alta">Continuar</button>
      <p class="msg" id="msg"></p>
      <button class="btn ghost small" type="button" data-a="out">Salir</button>`);
    root.querySelectorAll('#a-eq [data-eq]').forEach(b => b.onclick = () => root.querySelectorAll('#a-eq [data-eq]').forEach(x => x.setAttribute('aria-pressed', String(x === b))));
    $('#a-menor').onchange = e => { $('#a-fam-l').hidden = !e.target.checked; };
  }
  actions.alta = async () => {
    const nombre = $('#a-nombre').value.trim(), eqb = root.querySelector('#a-eq [aria-pressed="true"]'), menor = $('#a-menor').checked, m = $('#msg');
    const err = t => { m.className = 'msg err'; m.textContent = t; };
    if (!nombre) return err('Escribe tu nombre.');
    if (!eqb) return err('Elige tu equipo.');
    if (!$('#a-ok').checked) return err('Marca que has leído la información.');
    if (menor && !$('#a-fam').checked) return err('Si eres menor de edad, tu familia tiene que firmar la hoja de consentimiento.');
    await B.set('jugadoras/' + me.uid, { nombre, equipo: eqb.dataset.eq, menor, email: me.email || '', acepta: { ts: Date.now(), v: INFO_V }, ts: Date.now() });
  };
  function esperaView() {
    const p = U.perfil, inactiva = U.acceso && U.acceso.activa === false && U.acceso.ts;
    gate(`<h2>${inactiva ? 'Tu cuenta está desactivada' : 'Casi está'}</h2>
      <p>${inactiva ? 'La Dirección Técnica ha desactivado tu cuenta. Si crees que es un error, habla con Carlos.' : `Gracias, ${esc((p.nombre || '').split(' ')[0])}. Carlos activará tu cuenta en cuanto tenga tu hoja de consentimiento firmada${p.menor ? ' por tu familia' : ''}.`}</p>
      <p class="sub">Esta pantalla cambia sola cuando esté activada.</p>
      <div class="row"><button class="btn" type="button" data-a="editalta">Cambiar mis datos</button><button class="btn ghost" type="button" data-a="out">Salir</button></div>
      <button class="btn ghost small danger" type="button" data-a="borraralta">Borrar mi alta</button>`);
  }
  actions.editalta = async () => { U.editAlta = true; render(); };
  actions.borraralta = async b => {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Pulsa otra vez para borrarla'; return; }
    await B.del('jugadoras/' + me.uid); toast('Alta borrada.');
  };

  // ================= jugadora: la app =================
  const navJ = () => `<nav class="nav" aria-label="Secciones">${[['hoy', 'Hoy'], ['semana', 'Semana'], ['evol', 'Mi evolución'], ['datos', 'Mis datos']].map(([k, l]) => `<button type="button" data-v="${k}" aria-current="${view === k ? 'page' : 'false'}">${l}</button>`).join('')}</nav>`;
  const eqObj = () => (EQUIPOS.find(e => e.id === (U.acceso.equipo || U.perfil.equipo)) || EQUIPOS[0]);
  const diaHoy = () => U.dias[today()] || {};
  const draft = { antes: {}, ses: { tipo: 'entreno', rpe: null, min: 90, nota: '' }, sem: null, showDia: false };

  function antesHTML() {
    const a = diaHoy().antes;
    if (a && !draft.editAntes) return `<section class="card done"><div class="card-h"><h2>Antes del entreno</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div>
      <div class="summary">${WELL.map(w => `<span class="pill">${w.n}: ${a[w.k]}</span>`).join('')}</div><button class="btn small" type="button" data-a="editantes">Cambiar</button></section>`;
    const d = draft.antes;
    return `<section class="card" id="c-antes"><div class="card-h"><h2>Antes del entreno</h2><span class="sub">¿Cómo llegas hoy? De 1 a 5.</span></div>
      ${WELL.map(w => `<div class="q"><div class="q-h"><span>${w.n}</span></div><div class="scale" role="group" aria-label="${w.n}">${[1, 2, 3, 4, 5].map(v => `<button type="button" data-w="${w.k}" data-v="${v}" aria-pressed="${d[w.k] === v}">${v}</button>`).join('')}</div><div class="scale-ends"><span>${w.lo}</span><span>${w.hi}</span></div></div>`).join('')}
      <button class="btn primary" type="button" data-a="saveantes">Guardar</button></section>`;
  }
  function despuesHTML() {
    const L = diaHoy().ses || [], d = draft.ses;
    const done = L.length ? `<ul class="list">${L.map((s, i) => `<li class="li"><span><b>${esc((TIPOS.find(t => t.k === s.tipo) || TIPOS[0]).n)} · esfuerzo ${s.rpe} (${esc(RPE[s.rpe])})</b><small>${s.min} min · carga ${fmtInt(s.rpe * s.min)}${s.nota ? ' · ' + esc(s.nota) : ''}</small></span><button class="btn ghost small" type="button" data-a="delses" data-i="${i}">Quitar</button></li>`).join('')}</ul>` : '';
    if (L.length && !draft.moreSes) return `<section class="card done"><div class="card-h"><h2>Después del entreno</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div>${done}<button class="btn small" type="button" data-a="moreses">Añadir otra sesión de hoy</button></section>`;
    return `<section class="card" id="c-desp"><div class="card-h"><h2>Después del entreno</h2><span class="sub">¿Lo duro que ha sido? De 0 a 10.</span></div>${done}
      <div class="seg" role="group" aria-label="Tipo">${TIPOS.map(t => `<button type="button" data-tipo="${t.k}" aria-pressed="${d.tipo === t.k}">${t.n}</button>`).join('')}</div>
      <div class="q"><div class="scale s11" role="group" aria-label="Esfuerzo">${RPE.map((_, v) => `<button type="button" data-rpe="${v}" aria-pressed="${d.rpe === v}">${v}</button>`).join('')}</div>
        <div class="scale-ends"><span>Reposo</span><span>Máximo</span></div><p class="rpe-lbl" id="rpe-lbl">${d.rpe == null ? '' : esc(RPE[d.rpe])}</p></div>
      <div class="row"><span class="sub">Minutos</span><span class="stepper"><button type="button" data-min="-5" aria-label="5 minutos menos">−</button><output id="min-o">${d.min}</output><button type="button" data-min="5" aria-label="5 minutos más">+</button></span></div>
      <label class="field">Algo que quieras contar (opcional)<input type="text" id="s-nota" value="${esc(d.nota)}" maxlength="200" placeholder="Por ejemplo: me molestaba el tobillo"></label>
      <div class="row"><button class="btn primary" type="button" data-a="saveses">Guardar</button>${L.length ? '<button class="btn ghost" type="button" data-a="lessses">Cancelar</button>' : ''}</div></section>`;
  }
  function semanaHTML(full) {
    const lunes = mondayOf(today()), E = (U.equipo && U.equipo.sem && U.equipo.sem[lunes]) || null, mine = U.semanas[lunes];
    const prev = U.semanas[addDays(lunes, -7)], metaPrev = prev && prev.meta;
    if (!E || !(E.obj || []).filter(Boolean).length) return full ? `<section class="card"><h2>Esta semana</h2><p class="sub">Carlos todavía no ha puesto los objetivos de esta semana.</p>${metaPrev ? `<p><b>Tu meta para esta semana:</b> ${esc(metaPrev)}</p>` : ''}</section>` : (metaPrev ? `<section class="card"><span class="kicker">Tu meta de esta semana</span><p>${esc(metaPrev)}</p></section>` : '');
    if (mine && !draft.editSem && !full) return `<section class="card done"><div class="card-h"><h2>Esta semana</h2>${stHTML('ok').replace('Bien', 'Hecha')}</div><p class="sub">Tu meta para la semana que viene: ${esc(mine.meta || '—')}</p></section>`;
    if (!draft.sem || draft.sem.lunes !== lunes) draft.sem = Object.assign({ lunes, obj: E.obj.map(() => ({})), meta: '', cumplida: '', resp: '' }, mine ? clone(mine) : {}, { lunes });
    const d = draft.sem;
    if (mine && !draft.editSem) return `<section class="card done"><div class="card-h"><h2>Esta semana</h2>${stHTML('ok').replace('Bien', 'Hecha')}</div>
      ${E.obj.filter(Boolean).map((o, i) => `<div class="obj"><b>${esc(o)}</b><span class="sub">Decido: ${esc(ESC3[(mine.obj[i] || {}).decide - 1] || '—')} · Ejecuto: ${esc(ESC3[(mine.obj[i] || {}).ejecuta - 1] || '—')}</span></div>`).join('')}
      <p><b>Tu meta para la semana que viene:</b> ${esc(mine.meta || '—')}</p><button class="btn small" type="button" data-a="editsem">Cambiar</button></section>`;
    const preg = E.pregunta || PREGUNTAS[Math.floor(daysBetween('2026-01-05', lunes) / 7) % PREGUNTAS.length];
    return `<section class="card" id="c-sem"><div class="card-h"><h2>Esta semana</h2><span class="sub">Cómo te ves. Mejor al final de la semana.</span></div>
      ${E.obj.filter(Boolean).map((o, i) => `<div class="obj"><b>${esc(o)}</b>
        <div class="q"><div class="q-h"><span>Decido bien</span><small>¿Eliges la buena opción?</small></div><div class="scale s3">${ESC3.map((t, k) => `<button type="button" data-so="${i}" data-sk="decide" data-v="${k + 1}" aria-pressed="${(d.obj[i] || {}).decide === k + 1}">${t}</button>`).join('')}</div></div>
        <div class="q"><div class="q-h"><span>Lo ejecuto bien</span><small>¿Te sale como querías?</small></div><div class="scale s3">${ESC3.map((t, k) => `<button type="button" data-so="${i}" data-sk="ejecuta" data-v="${k + 1}" aria-pressed="${(d.obj[i] || {}).ejecuta === k + 1}">${t}</button>`).join('')}</div></div></div>`).join('')}
      ${metaPrev ? `<div class="q"><div class="q-h"><span>Tu meta era: «${esc(metaPrev)}». ¿La has cumplido?</span></div><div class="seg">${META_OK.map(([k, l]) => `<button type="button" data-cumplida="${k}" aria-pressed="${d.cumplida === k}">${l}</button>`).join('')}</div></div>` : ''}
      <label class="field">${esc(preg)}<textarea id="s-resp" maxlength="600">${esc(d.resp)}</textarea></label>
      <label class="field">Tu meta para la semana que viene<input type="text" id="s-meta" maxlength="160" value="${esc(d.meta)}" placeholder="Algo concreto que quieras mejorar"></label>
      <div class="row"><button class="btn primary" type="button" data-a="savesem" data-preg="${esc(preg)}">Guardar</button>${mine ? '<button class="btn ghost" type="button" data-a="noeditsem">Cancelar</button>' : ''}</div><p class="msg" id="msg"></p></section>`;
  }
  function hoyView() {
    const t = today(), dow = dateOf(t).getDay(), E = eqObj(), entrena = E.dias.includes(dow), dia = diaHoy();
    const show = entrena || draft.showDia || dia.antes || (dia.ses || []).length;
    const nombre = (U.perfil.nombre || '').split(' ')[0];
    shell(`<div><span class="kicker">${esc(fmtDay(t))} · ${esc(E.n)}</span><h1>Hola, ${esc(nombre)}</h1></div>
      ${show ? antesHTML() + despuesHTML() : `<section class="card"><h2>Hoy no tienes entreno con el equipo</h2><p class="sub">Si has jugado un partido o has entrenado por tu cuenta, apúntalo.</p><button class="btn" type="button" data-a="showdia">Apuntar un entreno o partido de hoy</button></section>`}
      ${semanaHTML(false)}`, { nav: navJ() });
  }
  function semanaView() { shell(`<div><span class="kicker">Semana del ${esc(fmtShort(mondayOf(today())))}</span><h1>Esta semana</h1></div>${semanaHTML(true)}`, { nav: navJ() }); }
  function evolView() {
    const t = today(), sem = Object.keys(U.semanas).sort().reverse().slice(0, 8);
    shell(`<div><span class="kicker">Lo tuyo</span><h1>Mi evolución</h1></div>
      <section class="card"><h2>Cómo llegas a los entrenos</h2><p class="sub">Media de tus cinco respuestas, de 1 a 5, en los últimos 28 días.${baseline(U.dias, t) != null ? ' La franja es lo normal en ti.' : ''}</p>${wellChart(U.dias, t)}</section>
      <section class="card"><h2>Tu carga por semana</h2><p class="sub">Esfuerzo × minutos de cada sesión, sumado por semana. La barra clara es la semana en curso.</p>${loadChart(U.dias, t)}</section>
      <section class="card"><h2>Tus metas</h2>${sem.length ? `<ul class="list">${sem.map(k => { const s = U.semanas[k], next = U.semanas[addDays(k, 7)]; return `<li class="li"><span><b>${esc(s.meta || '—')}</b><small>Puesta la semana del ${esc(fmtShort(k))}${next && next.cumplida ? ' · ' + esc((META_OK.find(x => x[0] === next.cumplida) || [])[1] || '') : ''}</small></span></li>`; }).join('')}</ul>` : '<p class="sub">Aquí saldrán las metas que te pongas cada semana.</p>'}</section>`, { nav: navJ() });
  }
  function datosView() {
    const p = U.perfil, c = (U.acceso || {}).consentimiento || {};
    shell(`<div><span class="kicker">Tu cuenta</span><h1>Mis datos</h1></div>
      <section class="card"><h2>${esc(p.nombre)}</h2><p class="sub">${esc(eqName(U.acceso.equipo || p.equipo))} · ${esc(me.email || '')}</p>
        <p class="sub">Aceptaste la información el ${esc(fmtDay(isoOf(new Date((p.acepta || {}).ts || Date.now()))))}.${c.tipo ? ` Consentimiento firmado por ${c.tipo === 'familia' ? 'tu familia' : 'ti'}.` : ''}</p></section>
      <section class="card"><h2>Quién ve tus datos</h2><p>Solo Carlos Manzano, Director Técnico, y tú. No se ceden a nadie y se borran el 30 de junio de 2027.</p></section>
      <section class="card"><h2>Llevarte o borrar tus datos</h2>
        <div class="row"><button class="btn" type="button" data-a="export">Descargar mis datos</button></div>
        <p class="sub">Borrar quita todo lo que has respondido y tu alta. No tiene ninguna consecuencia en el equipo.</p>
        <div class="row"><button class="btn danger" type="button" data-a="borrartodo">Borrar todos mis datos</button></div></section>
      <button class="btn ghost" type="button" data-a="out">Cerrar sesión</button>`, { nav: navJ() });
  }
  actions.editantes = async () => { draft.editAntes = true; draft.antes = clone(diaHoy().antes || {}); render(); };
  actions.saveantes = async () => {
    const d = draft.antes; if (WELL.some(w => !(d[w.k] >= 1))) { toast('Contesta las cinco antes de guardar.'); return; }
    const a = Object.assign({}, d, { ts: Date.now() });
    await B.merge(`registros/${me.uid}/dias/${today()}`, { antes: a, ts: Date.now() });
    U.dias[today()] = Object.assign({}, U.dias[today()] || {}, { antes: a });
    draft.editAntes = false; draft.antes = {}; toast('Guardado. Gracias.'); render();
  };
  actions.saveses = async () => {
    const d = draft.ses; if (d.rpe == null) { toast('Elige lo duro que ha sido, de 0 a 10.'); return; }
    const s = { tipo: d.tipo, rpe: d.rpe, min: d.min, nota: ($('#s-nota') || {}).value ? $('#s-nota').value.trim() : '', ts: Date.now() };
    const L = [...(diaHoy().ses || []), s];
    await B.merge(`registros/${me.uid}/dias/${today()}`, { ses: L, ts: Date.now() });
    U.dias[today()] = Object.assign({}, U.dias[today()] || {}, { ses: L });
    draft.ses = { tipo: 'entreno', rpe: null, min: eqMin(), nota: '' }; draft.moreSes = false; toast('Guardado. Gracias.'); render();
  };
  actions.delses = async b => { const L = (diaHoy().ses || []).filter((_, i) => i !== +b.dataset.i); await B.merge(`registros/${me.uid}/dias/${today()}`, { ses: L, ts: Date.now() }); U.dias[today()] = Object.assign({}, diaHoy(), { ses: L }); render(); };
  actions.moreses = async () => { draft.moreSes = true; render(); };
  actions.lessses = async () => { draft.moreSes = false; render(); };
  actions.showdia = async () => { draft.showDia = true; render(); };
  actions.editsem = async () => { draft.editSem = true; render(); };
  actions.noeditsem = async () => { draft.editSem = false; draft.sem = null; render(); };
  actions.savesem = async b => {
    const lunes = mondayOf(today()), E = U.equipo.sem[lunes], d = draft.sem, m = $('#msg');
    d.resp = $('#s-resp').value.trim(); d.meta = $('#s-meta').value.trim();
    const objs = E.obj.filter(Boolean);
    if (objs.some((_, i) => !(d.obj[i] || {}).decide || !(d.obj[i] || {}).ejecuta)) { m.className = 'msg err'; m.textContent = 'Valórate en cada objetivo (decido y ejecuto).'; return; }
    if (!d.meta) { m.className = 'msg err'; m.textContent = 'Ponte una meta para la semana que viene.'; return; }
    const doc = { obj: objs.map((t, i) => ({ t, decide: d.obj[i].decide, ejecuta: d.obj[i].ejecuta })), meta: d.meta, resp: d.resp, pregunta: b.dataset.preg, cumplida: d.cumplida || '', ts: Date.now() };
    await B.set(`registros/${me.uid}/semanas/${lunes}`, doc);
    U.semanas[lunes] = doc; draft.editSem = false; draft.sem = null; toast('Semana guardada.'); render();
  };
  actions.export = async () => {
    const data = { jugadora: U.perfil, acceso: U.acceso, dias: U.dias, semanas: U.semanas, descargado: new Date().toISOString() };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'mis-datos-smb-femenino.json'; document.body.appendChild(a); a.click(); a.remove();
  };
  actions.borrartodo = async b => {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Pulsa otra vez para borrarlo todo'; return; }
    const ops = [...Object.keys(U.dias).map(k => ({ op: 'del', path: `registros/${me.uid}/dias/${k}` })), ...Object.keys(U.semanas).map(k => ({ op: 'del', path: `registros/${me.uid}/semanas/${k}` })), { op: 'del', path: 'jugadoras/' + me.uid }];
    await B.batch(ops); U.dias = {}; U.semanas = {}; toast('Tus datos están borrados.');
  };
  const eqMin = () => 90;
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || isAdmin()) return;
    if (b.dataset.v && b.closest('.nav')) { view = b.dataset.v; draft.editSem = false; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.w) { draft.antes[b.dataset.w] = +b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (b.dataset.rpe) { draft.ses.rpe = +b.dataset.rpe; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); const l = $('#rpe-lbl'); if (l) l.textContent = RPE[draft.ses.rpe]; return; }
    if (b.dataset.tipo) { draft.ses.tipo = b.dataset.tipo; draft.ses.min = (TIPOS.find(t => t.k === b.dataset.tipo) || TIPOS[0]).min; draft.ses.nota = ($('#s-nota') || {}).value || ''; render(); return; }
    if (b.dataset.min) { draft.ses.min = Math.max(5, Math.min(240, draft.ses.min + +b.dataset.min)); $('#min-o').textContent = draft.ses.min; return; }
    if (b.dataset.so) { const i = +b.dataset.so; draft.sem.obj[i] = Object.assign({}, draft.sem.obj[i] || {}, { [b.dataset.sk]: +b.dataset.v }); b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (b.dataset.cumplida) { draft.sem.cumplida = b.dataset.cumplida; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
  });
  root.addEventListener('input', e => { if (!draft.sem) return; if (e.target.id === 's-resp') draft.sem.resp = e.target.value; if (e.target.id === 's-meta') draft.sem.meta = e.target.value; });

  function startJugadora() {
    unsub.push(B.listenDoc('jugadoras/' + me.uid, d => { U.perfil = d; if (d) U.editAlta = false; render(); }, () => {}));
    unsub.push(B.listenDoc('acceso/' + me.uid, d => {
      const was = U.acceso && U.acceso.activa; U.acceso = d;
      if (d && d.activa && !was) startDatos();
      render();
    }, () => { U.acceso = null; render(); }));
  }
  let datosOn = false;
  function startDatos() {
    if (datosOn) return; datosOn = true;
    unsub.push(B.listenCol(`registros/${me.uid}/dias`, L => { U.dias = Object.fromEntries(L.map(x => [x.id, x.data])); render(); }, () => {}));
    unsub.push(B.listenCol(`registros/${me.uid}/semanas`, L => { U.semanas = Object.fromEntries(L.map(x => [x.id, x.data])); render(); }, () => {}));
    unsub.push(B.listenDoc('equipos/' + (U.acceso.equipo || U.perfil.equipo), d => { U.equipo = d; render(); }, () => {}));
  }

  // ================= Dirección Técnica =================
  const navA = () => `<nav class="nav" aria-label="Secciones">${[['equipo', 'Jugadoras'], ['semana', 'Objetivos'], ['acceso', 'Altas']].map(([k, l]) => `<button type="button" data-av="${k}" aria-current="${view === k || (view === 'detalle' && k === 'equipo') ? 'page' : 'false'}">${l}${k === 'acceso' && pendientes().length ? ` · ${pendientes().length}` : ''}</button>`).join('')}</nav>`;
  const activas = () => Object.keys(A.jug).filter(u => (A.acc[u] || {}).activa).sort((a, b) => (A.jug[a].nombre || '').localeCompare(A.jug[b].nombre || '', 'es'));
  const pendientes = () => Object.keys(A.jug).filter(u => !(A.acc[u] || {}).activa && !(A.acc[u] || {}).ts);
  const desactivadas = () => Object.keys(A.jug).filter(u => (A.acc[u] || {}).activa === false && (A.acc[u] || {}).ts);
  const eqDe = u => (A.acc[u] || {}).equipo || (A.jug[u] || {}).equipo;
  const diasDe = u => (A.regs[u] || {}).dias || {};
  const semDe = u => (A.regs[u] || {}).semanas || {};
  function equipoView() {
    const t = today(), lunes = mondayOf(t), U2 = activas().filter(u => A.eq === 'todas' || eqDe(u) === A.eq);
    const rows = U2.map(u => ({ u, e: estado(diasDe(u), t) })).sort((a, b) => ({ bad: 0, warn: 1, none: 2, ok: 3 }[a.e.lvl] - { bad: 0, warn: 1, none: 2, ok: 3 }[b.e.lvl]) || (A.jug[a.u].nombre || '').localeCompare(A.jug[b.u].nombre || '', 'es'));
    const n = { bad: 0, warn: 0 }; rows.forEach(r => { if (n[r.e.lvl] != null) n[r.e.lvl]++; });
    shell(`<div><span class="kicker">${esc(fmtDay(t))}</span><h1>Jugadoras</h1><p class="sub">${rows.length} ${rows.length === 1 ? 'activa' : 'activas'}${n.bad ? ` · ${n.bad} para revisar` : ''}${n.warn ? ` · ${n.warn} con algo que mirar` : ''}. Solo lo ves tú.</p></div>
      <div class="seg" role="group" aria-label="Equipo">${[['todas', 'Todas'], ...EQUIPOS.map(e => [e.id, e.n])].map(([k, l]) => `<button type="button" data-aeq="${k}" aria-pressed="${A.eq === k}">${l}</button>`).join('')}</div>
      <section class="card">${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Jugadora</th><th>Estado</th><th class="num">Llega hoy</th><th class="num">Su media</th><th class="num">Carga 7 días</th><th class="num">Semana / mes</th><th>Última respuesta</th><th>Semana</th></tr></thead><tbody>
        ${rows.map(({ u, e }) => `<tr class="click" data-jug="${u}" tabindex="0"><td><b>${esc(A.jug[u].nombre)}</b><br><span class="sub">${esc(eqName(eqDe(u)))}</span></td><td>${stHTML(e.lvl)}</td><td class="num">${fmt1(e.s)}</td><td class="num">${fmt1(e.base)}</td><td class="num">${fmtInt(e.L.acute)}</td><td class="num">${e.L.ratio == null ? '—' : fmt1(e.L.ratio)}</td><td>${e.last ? esc(e.last === t ? 'hoy' : fmtShort(e.last)) : '—'}</td><td>${semDe(u)[lunes] ? 'Hecha' : '—'}</td></tr>`).join('')}</tbody></table></div>
        <p class="chart-note">«Llega hoy»: media de sus cinco respuestas de hoy (1 a 5). «Semana / mes»: carga de los últimos 7 días dividida por su media semanal del último mes; avisa por encima de 1,3 o por debajo de 0,8 (necesita 3 semanas de datos).</p>` : `<p class="sub">${activas().length ? 'No hay jugadoras activas en este equipo.' : 'Todavía no hay jugadoras activas. Actívalas en «Altas» cuando tengas su consentimiento firmado.'}</p>`}</section>`, { nav: navA(), wide: true, right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  function detalleView() {
    const u = A.sel, J = A.jug[u]; if (!J) { view = 'equipo'; return equipoView(); }
    const t = today(), D = diasDe(u), S = semDe(u), e = estado(D, t), V = A.val[u] || {};
    const last14 = []; for (let i = 0; i < 14; i++) last14.push(addDays(t, -i));
    const semanas = Object.keys(S).sort().reverse().slice(0, 6);
    shell(`<button class="btn ghost small back" type="button" data-av="equipo">← Todas las jugadoras</button>
      <div><span class="kicker">${esc(eqName(eqDe(u)))}</span><h1>${esc(J.nombre)}</h1></div>
      <section class="card"><div class="card-h"><h2>Hoy</h2>${stHTML(e.lvl)}</div>${e.R.length ? `<ul class="info" style="padding-left:18px;margin:0">${e.R.map(x => `<li>${esc(x.txt)}</li>`).join('')}</ul>` : '<p class="sub">Nada que destacar.</p>'}</section>
      <div class="two">
        <section class="card"><h2>Cómo llega</h2><p class="sub">Media de 1 a 5, últimos 28 días.${e.base != null ? ' Franja: lo normal en ella.' : ''}</p>${wellChart(D, t)}</section>
        <section class="card"><h2>Carga por semana</h2><p class="sub">Esfuerzo × minutos. Barra clara: semana en curso.</p>${loadChart(D, t)}</section>
      </div>
      <section class="card"><h2>Últimos 14 días</h2><div class="tbl-wrap"><table><thead><tr><th>Día</th>${WELL.map(w => `<th class="num">${w.n.split(' ')[0]}</th>`).join('')}<th class="num">Esfuerzo</th><th class="num">Min</th><th class="num">Carga</th><th>Nota</th></tr></thead><tbody>
        ${last14.map(k => { const d = D[k] || {}, a = d.antes || {}, L = d.ses || []; if (!d.antes && !L.length) return ''; return `<tr><td>${esc(fmtShort(k))}</td>${WELL.map(w => `<td class="num">${a[w.k] || '—'}</td>`).join('')}<td class="num">${L.map(s => s.rpe).join(' + ') || '—'}</td><td class="num">${L.map(s => s.min).join(' + ') || '—'}</td><td class="num">${L.length ? fmtInt(dayLoad(d)) : '—'}</td><td>${esc(L.map(s => s.nota).filter(Boolean).join(' · '))}</td></tr>`; }).join('') || `<tr><td colspan="${WELL.length + 5}" class="sub">Sin respuestas en estos 14 días.</td></tr>`}</tbody></table></div></section>
      <section class="card"><h2>Autoevaluación y metas</h2><p class="sub">Lo que ella dice y, al lado, tu valoración (solo la ves tú).</p>
        ${semanas.length ? semanas.map(k => { const s = S[k], v = V[k] || { obj: [] }; return `<div class="obj"><span class="kicker">Semana del ${esc(fmtShort(k))}</span>
          ${s.obj.map((o, i) => `<div class="q"><b>${esc(o.t)}</b><span class="sub">Ella: decide «${esc(ESC3[o.decide - 1])}», ejecuta «${esc(ESC3[o.ejecuta - 1])}»</span>
            <div class="row"><span class="sub">Tú, decide:</span><div class="seg">${ESC3.map((l, n) => `<button type="button" data-val="${k}|${i}|decide|${n + 1}" aria-pressed="${(v.obj[i] || {}).decide === n + 1}">${l}</button>`).join('')}</div></div>
            <div class="row"><span class="sub">Tú, ejecuta:</span><div class="seg">${ESC3.map((l, n) => `<button type="button" data-val="${k}|${i}|ejecuta|${n + 1}" aria-pressed="${(v.obj[i] || {}).ejecuta === n + 1}">${l}</button>`).join('')}</div></div></div>`).join('')}
          ${s.cumplida ? `<p>Meta anterior: ${esc((META_OK.find(x => x[0] === s.cumplida) || [])[1] || '')}</p>` : ''}${s.resp ? `<p><b>${esc(s.pregunta || 'Respuesta')}</b><br>${esc(s.resp)}</p>` : ''}<p><b>Su meta:</b> ${esc(s.meta || '—')}</p></div>`; }).join('') : '<p class="sub">Todavía no ha hecho ninguna autoevaluación.</p>'}</section>`, { nav: navA(), wide: true, right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  function objetivosView() {
    const lunes = mondayOf(today()), sig = addDays(lunes, 7), wk = A.semWk || lunes;
    shell(`<div><span class="kicker">Lo que se autoevalúa cada semana</span><h1>Objetivos</h1></div>
      <div class="seg" role="group" aria-label="Semana">${[[lunes, 'Esta semana'], [sig, 'La que viene']].map(([k, l]) => `<button type="button" data-awk="${k}" aria-pressed="${wk === k}">${l} · ${esc(fmtShort(k))}</button>`).join('')}</div>
      ${EQUIPOS.map(E => { const cur = ((A.equipos[E.id] || {}).sem || {})[wk] || {}, prev = ((A.equipos[E.id] || {}).sem || {})[addDays(wk, -7)];
        return `<section class="card"><div class="card-h"><h2>${E.n}</h2>${prev ? `<button class="btn small" type="button" data-a="copiarsem" data-eq="${E.id}">Copiar la semana anterior</button>` : ''}</div>
        ${[0, 1, 2].map(i => `<label class="field">Objetivo ${i + 1}${i ? ' (opcional)' : ''}<input type="text" id="o-${E.id}-${i}" maxlength="120" value="${esc((cur.obj || [])[i] || '')}" placeholder="${i === 0 ? 'Por ejemplo: presionar al pase atrás' : ''}"></label>`).join('')}
        <label class="field">Pregunta para pensar (opcional)<input type="text" id="p-${E.id}" maxlength="160" value="${esc(cur.pregunta || '')}" placeholder="${esc(PREGUNTAS[0])}"></label>
        <button class="btn primary" type="button" data-a="saveobj" data-eq="${E.id}">Guardar ${E.n}</button></section>`; }).join('')}
      <p class="sub">Cada jugadora se valora en cada objetivo con «decido» y «ejecuto», de «Todavía no» a «Casi siempre». Si no pones pregunta, sale una de la lista.</p>`, { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  function accesoView() {
    const P = pendientes(), act = activas(), des = desactivadas();
    const li = (u, inner) => `<li class="li"><span><b>${esc(A.jug[u].nombre)}</b><small>${esc(eqName(eqDe(u)))} · ${esc(A.jug[u].email || '')}${A.jug[u].menor ? ' · menor de edad' : ''}</small></span>${inner}</li>`;
    shell(`<div><span class="kicker">Cuentas y consentimientos</span><h1>Altas</h1></div>
      <section class="card"><h2>Esperando a que las actives${P.length ? ' · ' + P.length : ''}</h2>
        <p class="sub">Actívala cuando tengas la hoja de consentimiento firmada${P.some(u => A.jug[u].menor) ? ' (en las menores, por la familia)' : ''}.</p>
        ${P.length ? `<ul class="list">${P.map(u => li(u, `<span class="row"><select id="c-${u}" aria-label="Quién ha firmado"><option value="${A.jug[u].menor ? 'familia' : 'jugadora'}">${A.jug[u].menor ? 'Firmado por la familia' : 'Firmado por ella'}</option><option value="${A.jug[u].menor ? 'jugadora' : 'familia'}">${A.jug[u].menor ? 'Firmado por ella' : 'Firmado por la familia'}</option></select><button class="btn primary small" type="button" data-a="activar" data-u="${u}">Activar</button></span>`)).join('')}</ul>` : '<p class="sub">Nadie esperando. Cuando una jugadora se da de alta, sale aquí.</p>'}</section>
      <section class="card"><h2>Activas · ${act.length}</h2>${act.length ? `<ul class="list">${act.map(u => li(u, `<span class="row"><select data-chgeq="${u}" aria-label="Equipo">${EQUIPOS.map(e => `<option value="${e.id}"${eqDe(u) === e.id ? ' selected' : ''}>${e.n}</option>`).join('')}</select><button class="btn small" type="button" data-a="desactivar" data-u="${u}">Desactivar</button><button class="btn small danger" type="button" data-a="borrarjug" data-u="${u}">Borrar sus datos</button></span>`)).join('')}</ul>` : '<p class="sub">Ninguna todavía.</p>'}</section>
      ${des.length ? `<section class="card"><h2>Desactivadas · ${des.length}</h2><ul class="list">${des.map(u => li(u, `<span class="row"><button class="btn small" type="button" data-a="reactivar" data-u="${u}">Activar otra vez</button><button class="btn small danger" type="button" data-a="borrarjug" data-u="${u}">Borrar sus datos</button></span>`)).join('')}</ul></section>` : ''}
      <section class="card"><h2>Datos de todas</h2><p class="sub">Para tu archivo o para analizarlos en una hoja de cálculo.</p><div class="row"><button class="btn" type="button" data-a="csv">Descargar en CSV</button></div>
        <p class="sub">A final de temporada (30 de junio de 2027) hay que borrarlo todo.</p><div class="row"><button class="btn danger" type="button" data-a="borrartemporada">Borrar todos los datos de la temporada</button></div><p class="msg" id="msg"></p></section>`, { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  actions.activar = async b => { const u = b.dataset.u, tipo = $('#c-' + u).value; await B.set('acceso/' + u, { activa: true, equipo: A.jug[u].equipo, consentimiento: { tipo, fecha: today() }, ts: Date.now() }); toast(`${A.jug[u].nombre} ya puede usar la app.`); };
  actions.desactivar = async b => { const u = b.dataset.u; await B.merge('acceso/' + u, { activa: false, ts: Date.now() }); toast('Desactivada. Sus datos siguen guardados.'); };
  actions.reactivar = async b => { const u = b.dataset.u; await B.merge('acceso/' + u, { activa: true, ts: Date.now() }); toast('Activada otra vez.'); };
  async function borrarJug(u) {
    const [d, s, v] = await Promise.all([B.getCol(`registros/${u}/dias`), B.getCol(`registros/${u}/semanas`), B.getCol(`valoraciones/${u}/semanas`).catch(() => [])]);
    await B.batch([...d.map(x => ({ op: 'del', path: `registros/${u}/dias/${x.id}` })), ...s.map(x => ({ op: 'del', path: `registros/${u}/semanas/${x.id}` })), ...v.map(x => ({ op: 'del', path: `valoraciones/${u}/semanas/${x.id}` })), { op: 'del', path: 'acceso/' + u }, { op: 'del', path: 'jugadoras/' + u }]);
    delete A.regs[u]; delete A.val[u];
  }
  actions.borrarjug = async b => {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Pulsa otra vez: se borra todo'; return; }
    const n = A.jug[b.dataset.u].nombre; await borrarJug(b.dataset.u); toast(`Datos de ${n} borrados.`);
  };
  actions.borrartemporada = async b => {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Pulsa otra vez: se borran los datos de todas'; return; }
    for (const u of Object.keys(A.jug)) await borrarJug(u);
    await B.batch(EQUIPOS.map(e => ({ op: 'del', path: 'equipos/' + e.id }))); toast('Temporada borrada.');
  };
  actions.csv = async () => {
    const rows = [['jugadora', 'equipo', 'fecha', ...WELL.map(w => w.n), 'bienestar (media)', 'sesiones', 'esfuerzo', 'minutos', 'carga', 'notas']];
    activas().concat(desactivadas()).forEach(u => Object.keys(diasDe(u)).sort().forEach(k => { const d = diasDe(u)[k], a = d.antes || {}, L = d.ses || [];
      rows.push([A.jug[u].nombre, eqName(eqDe(u)), k, ...WELL.map(w => a[w.k] || ''), wellScore(a) == null ? '' : r1(wellScore(a)), L.map(s => s.tipo).join(' + '), L.map(s => s.rpe).join(' + '), L.map(s => s.min).join(' + '), L.length ? dayLoad(d) : '', L.map(s => s.nota).filter(Boolean).join(' · ')]); }));
    const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `smb-femenino-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  };
  actions.saveobj = async b => {
    const eq = b.dataset.eq, wk = A.semWk || mondayOf(today());
    const obj = [0, 1, 2].map(i => $(`#o-${eq}-${i}`).value.trim()).filter(Boolean), pregunta = $(`#p-${eq}`).value.trim();
    if (!obj.length) { toast('Pon al menos un objetivo.'); return; }
    await B.merge('equipos/' + eq, { sem: Object.assign({}, (A.equipos[eq] || {}).sem || {}, { [wk]: { obj, pregunta } }) });
    toast(`Objetivos de ${eqName(eq)} guardados.`);
  };
  actions.copiarsem = async b => {
    const eq = b.dataset.eq, wk = A.semWk || mondayOf(today()), prev = (((A.equipos[eq] || {}).sem || {})[addDays(wk, -7)]) || {};
    [0, 1, 2].forEach(i => { $(`#o-${eq}-${i}`).value = (prev.obj || [])[i] || ''; }); $(`#p-${eq}`).value = prev.pregunta || '';
  };
  root.addEventListener('click', async e => {
    if (!isAdmin()) return;
    const b = e.target.closest('button, tr[data-jug]'); if (!b) return;
    if (b.dataset.av) { view = b.dataset.av; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.aeq) { A.eq = b.dataset.aeq; render(); return; }
    if (b.dataset.awk) { A.semWk = b.dataset.awk; render(); return; }
    if (b.dataset.jug) { A.sel = b.dataset.jug; view = 'detalle'; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.val) {
      const [k, i, key, v] = b.dataset.val.split('|'), u = A.sel, cur = clone((A.val[u] || {})[k] || { obj: [] });
      cur.obj[+i] = Object.assign({}, cur.obj[+i] || {}, { [key]: +v }); cur.ts = Date.now();
      A.val[u] = Object.assign({}, A.val[u] || {}, { [k]: cur }); render();
      try { await B.set(`valoraciones/${u}/semanas/${k}`, cur); } catch (er) { toast('No se ha podido guardar tu valoración.'); }
    }
  });
  root.addEventListener('keydown', e => { if (isAdmin() && e.key === 'Enter' && e.target.dataset && e.target.dataset.jug) e.target.click(); });
  root.addEventListener('change', async e => {
    if (!isAdmin() || !e.target.dataset.chgeq) return;
    const u = e.target.dataset.chgeq; try { await B.merge('acceso/' + u, { equipo: e.target.value, ts: Date.now() }); toast('Equipo cambiado.'); } catch (er) { toast('No se ha podido cambiar.'); }
  });
  function startAdmin() {
    view = 'equipo';
    unsub.push(B.listenCol('jugadoras', L => { A.jug = Object.fromEntries(L.map(x => [x.id, x.data])); syncRegs(); render(); }, () => {}));
    unsub.push(B.listenCol('acceso', L => { A.acc = Object.fromEntries(L.map(x => [x.id, x.data])); syncRegs(); render(); }, () => {}));
    unsub.push(B.listenCol('equipos', L => { A.equipos = Object.fromEntries(L.map(x => [x.id, x.data])); render(); }, () => {}));
  }
  // escucha lo de cada jugadora con alta
  function syncRegs() {
    Object.keys(A.jug).forEach(u => {
      if (A.subs[u]) return;
      A.regs[u] = A.regs[u] || { dias: {}, semanas: {} };
      const s1 = B.listenCol(`registros/${u}/dias`, L => { A.regs[u].dias = Object.fromEntries(L.map(x => [x.id, x.data])); renderSoon(); }, () => {});
      const s2 = B.listenCol(`registros/${u}/semanas`, L => { A.regs[u].semanas = Object.fromEntries(L.map(x => [x.id, x.data])); renderSoon(); }, () => {});
      const s3 = B.listenCol(`valoraciones/${u}/semanas`, L => { A.val[u] = Object.fromEntries(L.map(x => [x.id, x.data])); renderSoon(); }, () => {});
      A.subs[u] = () => { s1(); s2(); s3(); };
    });
    Object.keys(A.subs).forEach(u => { if (!A.jug[u]) { A.subs[u](); delete A.subs[u]; } });
  }
  let rsT = 0; const renderSoon = () => { clearTimeout(rsT); rsT = setTimeout(render, 60); };

  // ================= pintar =================
  function render() {
    // no repintar mientras se escribe en un campo de texto (se perdería el foco)
    const ae = document.activeElement; if (ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && root.contains(ae) && ae.type !== 'checkbox') { renderSoon(); return; }
    if (!configured) return notReady();
    if (me === undefined) { gate('<p class="sub" style="text-align:center">Cargando…</p>'); return; }
    if (!me) return loginView();
    if (!ADMIN.length) return gate(`<h2>Falta un paso de configuración</h2><p>Copia este código y ponlo en <b>firebase-config.js</b> (SMBF_ADMIN) y en las reglas (ADMIN_UID). Es tu código de usuario: con él la app sabe que eres la Dirección Técnica.</p><p class="code">${esc(me.uid)}</p><button class="btn ghost" type="button" data-a="out">Salir</button>`);
    if (isAdmin()) { if (view === 'detalle') return detalleView(); if (view === 'semana') return objetivosView(); if (view === 'acceso') return accesoView(); return equipoView(); }
    if (U.perfil === undefined || U.acceso === undefined) { gate('<p class="sub" style="text-align:center">Cargando…</p>'); return; }
    if (!U.perfil || !U.perfil.acepta || U.editAlta) return altaView();
    if (!U.acceso || !U.acceso.activa) return esperaView();
    if (view === 'semana') return semanaView(); if (view === 'evol') return evolView(); if (view === 'datos') return datosView();
    return hoyView();
  }
  me = undefined; render();
  if (B) B.onAuth(u => {
    stop(); datosOn = false;
    Object.assign(U, { perfil: undefined, acceso: undefined, equipo: null, dias: {}, semanas: {}, editAlta: false });
    Object.assign(A, { jug: {}, acc: {}, regs: {}, equipos: {}, val: {}, sel: '' });
    me = u || null; view = 'hoy';
    if (me && ADMIN.includes(me.uid)) startAdmin(); else if (me && ADMIN.length) startJugadora();
    render();
  });
})();
