/* Seguimiento SMB · Femenino
   App de las jugadoras de los equipos femeninos: cómo llegan (bienestar), cómo entrenan (carga) y cómo se ven
   (diario de la semana) y un personaje que sube de nivel por responder. Solo la Dirección Técnica ve los datos de todas; cada jugadora ve y borra los suyos.
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
  // n: nombre para la DT; s: corto; q: la pregunta (una por pantalla); o: respuestas de 1 (peor) a 5 (mejor)
  const WELL = [
    { k: 'sueno', n: 'Sueño', s: 'Sueño', q: '¿Has dormido bien?', o: ['Fatal', 'Poco', 'Normal', 'Bien', 'Genial'] },
    { k: 'fatiga', n: 'Cansancio', s: 'Piernas', q: '¿Cómo tienes las piernas?', o: ['Sin fuerza', 'Cansadas', 'Normal', 'Bien', 'Frescas'] },
    { k: 'dolor', n: 'Molestias musculares', s: 'Molestias', q: '¿Te duele algo?', o: ['Me duele mucho', 'Bastante', 'Alguna molestia', 'Casi nada', 'Nada'] },
    { k: 'estres', n: 'Estrés', s: 'Cabeza', q: '¿Cómo vas de cabeza?', o: ['Muy agobiada', 'Agobiada', 'Normal', 'Tranquila', 'Muy tranquila'] },
    { k: 'animo', n: 'Ánimo', s: 'Ánimo', q: '¿Y de ánimo?', o: ['Muy bajo', 'Bajo', 'Normal', 'Bien', 'Muy bien'] },
  ];
  // escala CR-10 de esfuerzo percibido (Foster), agrupada en cinco niveles que se afinan con un segundo toque
  const RPE = ['Reposo', 'Muy suave', 'Suave', 'Normal', 'Algo duro', 'Duro', 'Duro', 'Muy duro', 'Muy duro', 'Al límite', 'Al límite'];
  // todas las escaleras van del 1 al 10 (decidido el 23 oct). Bienestar: 10 = lo mejor. Esfuerzo: 10 = al límite.
  const RAMP = ['#f6eef0', '#efdfe2', '#e6cdd2', '#dbb8bf', '#cea1aa', '#bf8692', '#ad6a78', '#974e5d', '#823645', '#681825'];
  const ANCLA = { 10: 4, 8: 3, 5: 2, 3: 1, 1: 0 };          // escalón → palabra de WELL[].o
  // lo guardado antes del 23 oct iba de 1 a 5 (sin «esc»): se pasa a 1–10 para compararlo
  const diez = (v, a) => v >= 1 ? (a && a.esc === 10 ? v : (v - 1) * 2.25 + 1) : null;
  function escalera(attrs, val, label) {
    return `<div class="ladder">${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(v => `<button type="button" class="step" ${attrs(v)} aria-pressed="${val === v}"><span class="n" style="background:${RAMP[v - 1]};color:${v > 5 ? '#fff' : '#221c1d'}">${v}</span><span class="w">${esc(label(v) || '')}</span></button>`).join('')}</div>`;
  }
  const TIPOS = [{ k: 'entreno', n: 'Entreno', min: 90 }, { k: 'partido', n: 'Partido', min: 50 }, { k: 'otro', n: 'Otro', min: 60 }];
  const MINS = [50, 60, 75, 90, 120];
  // caras de 1 (peor) a 5 (mejor)
  const MOUTH = ['M8 17 Q12 13 16 17', 'M8.5 16.5 Q12 14.5 15.5 16.5', 'M8.5 15.5 L15.5 15.5', 'M8.5 14.5 Q12 16.5 15.5 14.5', 'M8 14 Q12 18.5 16 14'];
  const face = v => `<svg class="face" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle class="e" cx="9" cy="10" r="1.2"/><circle class="e" cx="15" cy="10" r="1.2"/><path d="${MOUTH[(v || 3) - 1]}"/></svg>`;
  const bars = k => `<span class="bars" aria-hidden="true">${[6, 11, 16, 20, 24].map((h, i) => `<i style="height:${h}px"${i <= k ? ' class="f"' : ''}></i>`).join('')}</span>`;

  // ================= juego: puntos por responder (nunca por lo que se responde) =================
  const PTS = { antes: 10, despues: 10, semana: 20, revisar: 15 };
  const NIVELES = [['Novata', 0], ['Calentando', 30], ['En pista', 80], ['Titular', 150], ['Imprescindible', 250], ['Referente', 380], ['Capitana', 550], ['Veterana', 750], ['Mito', 1000], ['Leyenda del SMB', 1300]];
  function puntos(dias, semanas) {
    let p = 0;
    Object.values(dias || {}).forEach(d => { if (!d) return; if (d.antes) p += PTS.antes; if ((d.ses || []).length) p += PTS.despues; });
    Object.values(semanas || {}).forEach(s => { if (!s) return; p += PTS.semana; if (s.cumplida || String(s.resp || '').trim()) p += PTS.revisar; });
    return p;
  }
  const nivelDe = p => { let i = 0; NIVELES.forEach(([, m], k) => { if (p >= m) i = k; }); return i; };
  // personaje: lo que es de ella (piel, pelo, cara) es libre; ropa, gafas, fondos y marcos se desbloquean por nivel (1 a 10)
  const SKINS = ['ffdbb4', 'edb98a', 'f8d25c', 'fd9841', 'd08b5b', 'ae5d29', '614335'];
  const HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'ecdcbf', 'e8e1e1', 'c93305', 'f59797'];
  const HAIRS = [['straight02', 'Liso largo'], ['straight01', 'Liso'], ['straightAndStrand', 'Liso con mechón'], ['longButNotTooLong', 'Media melena'], ['bigHair', 'Melena'], ['bob', 'Melena corta'],
    ['bun', 'Moño'], ['curly', 'Rizado'], ['curvy', 'Ondas'], ['miaWallace', 'Flequillo recto'], ['frida', 'Trenzas con flores'], ['fro', 'Afro'], ['froBand', 'Afro con cinta'], ['dreads01', 'Rastas'],
    ['shaggy', 'Despeinado'], ['shortWaved', 'Corto ondulado'], ['shortCurly', 'Corto rizado'], ['shortFlat', 'Corto'], ['hijab', 'Hiyab'], ['turban', 'Turbante']];
  const EYES = [['default', 'Normales'], ['happy', 'Felices'], ['squint', 'Entornados'], ['side', 'De lado'], ['wink', 'Guiño']];
  const MOUTHS = [['smile', 'Sonrisa'], ['default', 'Normal'], ['twinkle', 'Pícara'], ['serious', 'Seria']];
  // [categoría, valor, nombre, nivel]
  const ITEMS = [
    ['ropa', 'hoodie:681825', 'Sudadera granate', 1], ['ropa', 'shirtCrewNeck:681825', 'Camiseta granate', 1], ['fondo', 'rosa', 'Rosa', 1], ['fondo', 'gris', 'Gris', 1], ['gafas', '', 'Sin gafas', 1], ['gorro', '', 'Sin gorro', 1], ['marco', '', 'Sin marco', 1],
    ['ropa', 'shirtCrewNeck:ffffff', 'Camiseta blanca', 2], ['gafas', 'round', 'Gafas redondas', 2],
    ['fondo', 'pista', 'La pista', 3], ['ropa', 'hoodie:262e33', 'Sudadera negra', 3],
    ['gafas', 'sunglasses', 'Gafas de sol', 4], ['gorro', 'winterHat02', 'Gorro con pompón', 4],
    ['fondo', 'atardecer', 'Pista al atardecer', 5], ['ropa', 'graphicShirt:681825', 'Camiseta con dibujo', 5],
    ['marco', 'plata', 'Marco plateado', 6], ['ropa', 'collarAndSweater:3f4a6e', 'Jersey azul marino', 6],
    ['fondo', 'noche', 'Pabellón de noche', 7], ['gafas', 'kurt', 'Gafas retro', 7],
    ['marco', 'oro', 'Marco dorado', 8], ['gorro', 'winterHat03', 'Gorro nórdico', 8],
    ['fondo', 'confeti', 'Confeti', 9], ['ropa', 'blazerAndShirt:681825', 'Americana', 9],
    ['marco', 'leyenda', 'Marco de leyenda', 10],
  ];
  const AV_DEF = { skin: 'edb98a', top: 'straight02', hairColor: '4a312c', eyes: 'default', mouth: 'smile', ropa: 'hoodie:681825', gafas: '', gorro: '', fondo: 'rosa', marco: '' };
  const itemOk = (cat, v, lv) => { const it = ITEMS.find(x => x[0] === cat && x[1] === v); return !!it && it[3] <= lv + 1; };
  function avNorm(av, lv) {
    const a = Object.assign({}, AV_DEF, av || {});
    ['ropa', 'gafas', 'gorro', 'fondo', 'marco'].forEach(c => { if (!itemOk(c, a[c], lv)) a[c] = AV_DEF[c]; });
    return a;
  }
  function fondoSVG(bg, id) {
    if (bg === 'pista') return `<rect width="280" height="280" fill="#dfe8f3"/><rect y="200" width="280" height="80" fill="#c8d6e6"/><line x1="0" y1="200" x2="280" y2="200" stroke="#fff" stroke-width="4"/><path d="M248,150 a22,22 0 0 1 0,44 z" fill="#fff" stroke="#f26a1b" stroke-width="4"/><circle cx="40" cy="44" r="4" fill="#1b1b1b"/>`;
    if (bg === 'atardecer') return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a5a"/><stop offset=".6" stop-color="#ffcf7a"/><stop offset="1" stop-color="#ffe6b0"/></linearGradient></defs><rect width="280" height="280" fill="url(#${id}s)"/><circle cx="140" cy="170" r="70" fill="#fff3c4" opacity=".7"/><rect y="210" width="280" height="70" fill="#5b7fa8"/><line x1="0" y1="210" x2="280" y2="210" stroke="#fff" stroke-width="3"/>`;
    if (bg === 'noche') return `<rect width="280" height="280" fill="#1c2340"/>${[[40, 30], [120, 18], [210, 40], [250, 90], [24, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#fff6c8" opacity=".9"/><circle cx="${x}" cy="${y}" r="32" fill="#fff6c8" opacity=".15"/>`).join('')}<rect y="210" width="280" height="70" fill="#2e3a66"/><line x1="0" y1="210" x2="280" y2="210" stroke="#7d8fc9" stroke-width="3"/>`;
    if (bg === 'confeti') return `<rect width="280" height="280" fill="#681825"/>${Array.from({ length: 46 }, (_, k) => `<rect x="${(k * 61) % 270}" y="${(k * 37) % 270}" width="8" height="4" rx="1" transform="rotate(${(k * 47) % 180} ${(k * 61) % 270 + 4} ${(k * 37) % 270 + 2})" fill="${['#f2c14e', '#ffffff', '#e3949f', '#8fd0a8'][k % 4]}"/>`).join('')}`;
    const c = { rosa: '#e6c6cb', gris: '#d9d2d3' }[bg] || '#e6c6cb';
    return `<rect width="280" height="280" fill="${c}"/><circle cx="140" cy="150" r="112" fill="#ffffff" opacity=".2"/>`;
  }
  function marcoSVG(m) {
    if (m === 'leyenda') return `<rect x="5" y="5" width="270" height="270" rx="30" fill="none" stroke="#681825" stroke-width="10"/><rect x="11" y="11" width="258" height="258" rx="25" fill="none" stroke="#e0b23c" stroke-width="5"/>`;
    const c = { plata: '#9aa3ad', oro: '#e0b23c' }[m];
    return c ? `<rect x="5" y="5" width="270" height="270" rx="30" fill="none" stroke="${c}" stroke-width="9"/>` : '';
  }
  let avSeq = 0;
  function avatarSVG(av, lv, label) {
    const a = avNorm(av, lv), id = 'fav' + (++avSeq), [cl, cc] = a.ropa.split(':');
    let body = '';
    if (typeof window.SMBAvatar === 'function') {
      try {
        body = window.SMBAvatar({ seed: 'smbf', randomizeIds: true, backgroundColor: [], skinColor: [a.skin], top: [a.gorro || a.top], hairColor: [a.hairColor], hatColor: ['681825'], topProbability: 100,
          eyes: [a.eyes], eyebrows: ['defaultNatural'], mouth: [a.mouth], nose: ['default'], facialHairProbability: 0,
          accessories: a.gafas ? [a.gafas] : ['round'], accessoriesColor: ['262e33'], accessoriesProbability: a.gafas ? 100 : 0,
          clothing: [cl], clothesColor: [cc], clothingGraphic: ['diamond'] }).replace(/^<svg /, '<svg x="0" y="0" width="280" height="280" ');
      } catch (e) { body = ''; }
    }
    return `<svg class="av" viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label || 'Tu jugadora')}"><clipPath id="${id}c"><rect width="280" height="280" rx="32"/></clipPath><g clip-path="url(#${id}c)">${fondoSVG(a.fondo, id)}${body}</g>${marcoSVG(a.marco)}</svg>`;
  }
  // diario de la semana: el tiempo que ha hecho en la pista (1 tormenta … 5 sol), lo mejor, lo que cambiaría y un compromiso
  const TIEMPO = [
    [1, 'Tormenta', '<path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 15z"/><path d="M12 14l-2 4h3l-2 4"/>'],
    [2, 'Lluvia', '<path d="M7 14a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 8 3.5 3.5 0 0 1 17 14z"/><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3"/>'],
    [3, 'Nublado', '<path d="M7 18a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 18.5 11 3.5 3.5 0 0 1 18 18z"/>'],
    [4, 'Sol y nubes', '<circle cx="9" cy="8" r="3"/><path d="M9 2v1.5M3 8h1.5M4.8 3.8l1 1M13.2 3.8l-1 1"/><path d="M9 19a3.5 3.5 0 1 1 .9-6.9A4.5 4.5 0 0 1 18.4 13 3 3 0 0 1 18 19z"/>'],
    [5, 'Sol', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'],
  ];
  const wx = v => `<svg class="wx-i" viewBox="0 0 24 24" aria-hidden="true">${(TIEMPO[v - 1] || TIEMPO[2])[2]}</svg>`;
  const AREAS = ['Patinaje', 'Técnica', 'Decisión', 'Actitud', 'Equipo'];
  const STAMP = { si: 'Cumplido', medias: 'A medias', no: 'No' };
  const compOf = x => x ? (x.compromiso || x.meta || '') : '';   // «meta» es el nombre de antes del diario
  const INFO_V = '2026-10-23';
  const META_OK = [['si', 'Sí'], ['medias', 'A medias'], ['no', 'No']];

  // ================= cálculos =================
  const wellScore = a => { if (!a) return null; const v = WELL.map(w => diez(a[w.k], a)).filter(x => x != null); return v.length === WELL.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
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
    if (s != null && s <= 4.5) add('bad', `Llega mal hoy (${fmt1(s)} de 10).`);
    else if (s != null && base != null && s <= base - 1.8) add('warn', `Hoy está por debajo de lo normal en ella (${fmt1(s)}; suele estar en ${fmt1(base)}).`);
    if (a && diez(a.dolor, a) <= 3) add('warn', 'Molestias musculares altas.');
    if (a && a.nota) add('info', `Ha escrito: «${a.nota}»`);
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
    const X = i => L + (n === 1 ? iw / 2 : i * iw / (n - 1)), Y = v => T + (10 - v) / 9 * ih;
    const pts = []; for (let i = 0; i < n; i++) { const day = addDays(ref, i - n + 1), s = wellScore((dias[day] || {}).antes); pts.push({ i, day, s }); }
    // los días sin respuesta no cortan la línea: se responde los días de entreno
    let path = ''; pts.filter(p => p.s != null).forEach((p, k) => { path += `${k ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.s).toFixed(1)}`; });
    const base = baseline(dias, ref);
    const grid = [1, 4, 7, 10].map(v => `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('');
    const xl = [0, Math.floor((n - 1) / 2), n - 1].map(i => `<text x="${X(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${fmtShort(addDays(ref, i - n + 1))}</text>`).join('');
    const band = base != null ? `<rect class="band" x="${L}" y="${Y(Math.min(10, base + 0.9))}" width="${iw}" height="${Y(Math.max(1, base - 0.9)) - Y(Math.min(10, base + 0.9))}"/>` : '';
    const marks = pts.filter(p => p.s != null).map(p => `<g class="m"><circle class="hit" cx="${X(p.i)}" cy="${Y(p.s)}" r="11"/><circle class="dot" cx="${X(p.i)}" cy="${Y(p.s)}" r="4"/>${tip(X(p.i), Y(p.s), `${fmtShort(p.day)}: ${fmt1(p.s)}`, W)}</g>`).join('');
    const has = pts.some(p => p.s != null);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cómo llega a los entrenos, últimos ${n} días, de 1 a 10">${grid}${band}${has ? `<path class="ln" d="${path}"/>` : `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Sin respuestas en estos días</text>`}${marks}${xl}</svg>`;
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
      <ul><li><b>Qué se guarda:</b> tu nombre, tu equipo y lo que respondes (cómo llegas, esfuerzo del entreno y tu diario de la semana) y cómo es tu personaje.</li>
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
  const navJ = () => `<nav class="nav" aria-label="Secciones">${[['hoy', 'Hoy'], ['semana', 'Semana'], ['yo', 'Mi jugadora'], ['datos', 'Mis datos']].map(([k, l]) => `<button type="button" data-v="${k}" aria-current="${view === k ? 'page' : 'false'}">${l}</button>`).join('')}</nav>`;
  const eqObj = () => (EQUIPOS.find(e => e.id === (U.acceso.equipo || U.perfil.equipo)) || EQUIPOS[0]);
  const diaHoy = () => U.dias[today()] || {};
  const draft = { antes: {}, ses: { tipo: 'entreno', rpe: null, min: 90, nota: '' }, sem: null, showDia: false };

  function antesHTML() {
    const a = diaHoy().antes;
    if (a && !draft.editAntes) return `<section class="card done"><div class="card-h"><h2>Antes del entreno</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div>
      <div class="faces">${WELL.map(w => { const v = Math.round(diez(a[w.k], a)); return `<span class="mf">${face(Math.ceil(v / 2))}<b>${esc(w.s)}</b><small>${v} de 10</small></span>`; }).join('')}</div>${a.nota ? `<p class="nota-p">«${esc(a.nota)}»</p>` : ''}<button class="btn small" type="button" data-a="editantes">Cambiar</button></section>`;
    const n = WELL.filter(w => draft.antes[w.k] >= 1).length;
    return `<section class="card" id="c-antes"><div class="card-h"><h2>Antes del entreno</h2><span class="sub">¿Cómo llegas hoy?</span></div>
      <button class="btn primary big" type="button" data-a="startantes">${n ? `Seguir · ${n} de 5` : 'Empezar · 15 segundos'}</button></section>`;
  }
  // antes del entreno: una pregunta por pantalla; al tocar pasa sola a la siguiente y guarda al acabar
  function antesFlowView() {
    const N = WELL.length, i = Math.min(draft.paso || 0, N), d = draft.antes, nota = i === N, w = WELL[i];
    root.innerHTML = `<div class="flow"><header class="flow-top"><button class="btn ghost small" type="button" data-a="flowback"${i ? '' : ' style="visibility:hidden"'}>Atrás</button>
        <div class="dots" role="img" aria-label="Paso ${i + 1} de ${N + 1}">${Array.from({ length: N + 1 }, (_, k) => `<span${k <= i ? ' class="on"' : ''}></span>`).join('')}</div>
        <button class="btn ghost small" type="button" data-a="flowclose">Cerrar</button></header>
      <main class="wrap flow-in">${nota ? `<div><span class="kicker">Antes del entreno · para acabar</span><h1 class="flow-q">¿Algo que quieras contar?</h1></div>
        <p class="sub">Lo que quieras, con tus palabras: cómo estás, algo que te preocupa o algo que te ha pasado. Es opcional y solo lo lee Carlos.</p>
        <textarea class="nota-in" id="f-nota" maxlength="500" rows="5" placeholder="Escribe aquí…" aria-label="Algo que quieras contar">${esc(d.nota || '')}</textarea>
        <button class="btn primary big" type="button" data-a="saveantes">Guardar</button><p class="sub center">Si no quieres escribir nada, pulsa Guardar igualmente.</p>`
      : `<div><span class="kicker">Antes del entreno · ${i + 1} de ${N}</span><h1 class="flow-q">${esc(w.q)}</h1></div>
        ${escalera(v => `data-fw="${w.k}" data-v="${v}"`, d[w.k], v => ANCLA[v] != null ? w.o[ANCLA[v]] : '')}
        <p class="sub center">Del 1 al 10. Al tocar, pasa sola a la siguiente.</p>`}</main></div>`;
  }
  function despuesHTML() {
    const L = diaHoy().ses || [], d = draft.ses;
    const done = L.length ? `<ul class="list">${L.map((s, i) => `<li class="li"><span><b>${esc((TIPOS.find(t => t.k === s.tipo) || TIPOS[0]).n)} · esfuerzo ${s.rpe} de 10 (${esc(RPE[s.rpe] || '')})</b><small>${s.min} min${s.nota ? ' · ' + esc(s.nota) : ''}</small></span><button class="btn ghost small" type="button" data-a="delses" data-i="${i}">Quitar</button></li>`).join('')}</ul>` : '';
    if (L.length && !draft.moreSes) return `<section class="card done"><div class="card-h"><h2>Después del entreno</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div>${done}<button class="btn small" type="button" data-a="moreses">Añadir otra sesión de hoy</button></section>`;
    const otro = d.otroMin || !MINS.includes(d.min);
    return `<section class="card" id="c-desp"><div class="card-h"><h2>Después del entreno</h2><span class="sub">¿Qué tal ha sido?</span></div>${done}
      <div class="seg" role="group" aria-label="Tipo">${TIPOS.map(t => `<button type="button" data-tipo="${t.k}" aria-pressed="${d.tipo === t.k}">${t.n}</button>`).join('')}</div>
      <div class="q"><div class="q-h"><span>¿Lo duro que ha sido?</span><small>del 1 al 10</small></div>${escalera(v => `data-rpe="${v}"`, d.rpe, v => ({ 10: 'Al límite', 7: 'Muy duro', 5: 'Duro', 4: 'Algo duro', 3: 'Normal', 2: 'Suave', 1: 'Muy suave' })[v])}</div>
      <div class="q"><div class="q-h"><span>Minutos</span></div><div class="seg" role="group" aria-label="Minutos">${MINS.map(m => `<button type="button" data-minc="${m}" aria-pressed="${!otro && d.min === m}">${m}</button>`).join('')}<button type="button" data-minc="otro" aria-pressed="${otro}">Otro</button></div>
        ${otro ? `<span class="stepper"><button type="button" data-min="-5" aria-label="5 minutos menos">−</button><output id="min-o">${d.min}</output><button type="button" data-min="5" aria-label="5 minutos más">+</button></span>` : ''}</div>
      <label class="field">¿Algo que contar? (opcional)<input type="text" id="s-nota" value="${esc(d.nota)}" maxlength="200" placeholder="Por ejemplo: me molestaba el tobillo"></label>
      <div class="row"><button class="btn primary" type="button" data-a="saveses">Guardar</button>${L.length ? '<button class="btn ghost" type="button" data-a="lessses">Cancelar</button>' : ''}</div></section>`;
  }
  function racha() { let n = 0, k = mondayOf(today()); if (!U.semanas[k]) k = addDays(k, -7); while (U.semanas[k]) { n++; k = addDays(k, -7); } return n; }
  function semanaMini() {
    const mine = U.semanas[mondayOf(today())];
    if (mine) return `<section class="card done"><div class="card-h"><h2>Tu diario</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div><p class="sub">La semana que viene vas a: ${esc(compOf(mine))}</p></section>`;
    return `<section class="card"><div class="card-h"><h2>Tu diario</h2><span class="sub">1 minuto</span></div><p class="sub">Qué tal ha ido la semana y a qué te comprometes. Mejor al final de la semana.</p><button class="btn" type="button" data-a="gosemana">Escribir mi semana</button></section>`;
  }
  function diarioView() {
    const lunes = mondayOf(today()), mine = U.semanas[lunes], prevK = addDays(lunes, -7), edit = !mine || draft.editSem;
    if (edit && (!draft.sem || draft.sem.lunes !== lunes)) draft.sem = Object.assign({ tiempo: 0, mejor: '', cambiar: '', compromiso: '', area: '', cumplida: '' }, mine ? clone(mine) : {}, { lunes });
    const d = edit ? draft.sem : mine, n = Object.keys(U.semanas).length + (mine ? 0 : 1), r = racha();
    const hist = Object.keys(U.semanas).filter(k => k < lunes && compOf(U.semanas[k])).sort().reverse().slice(0, 8);
    const nextOf = k => k === prevK ? d : U.semanas[addDays(k, 7)];
    const evald = hist.filter(k => (nextOf(k) || {}).cumplida), si = evald.filter(k => nextOf(k).cumplida === 'si').length;
    const ticket = k => { const ask = k === prevK && edit, c = (nextOf(k) || {}).cumplida;
      return `<div class="tk"><span class="d">${esc(fmtShort(k))}${ask ? ' · ¿Lo hiciste?' : ''}</span><span class="t">${esc(compOf(U.semanas[k]))}</span>${ask ? `<div class="row tight">${META_OK.map(([v, l]) => `<button type="button" class="mini" data-cumplida="${v}" aria-pressed="${d.cumplida === v}">${l}</button>`).join('')}</div>` : c ? `<span class="stamp ${c}">${esc(STAMP[c])}</span>` : ''}</div>`; };
    const pg = (id, ic, tit, val) => `<section class="pg"><div class="pg-h"><i>${ic}</i>${tit}</div>${edit ? `<textarea class="ln" id="${id}" rows="2" maxlength="300" placeholder="Toca para escribir…" aria-label="${tit}">${esc(val)}</textarea>` : `<p class="ln">${esc(val) || '—'}</p>`}</section>`;
    shell(`<section class="diary-hero"><div class="row between"><span class="kicker">Mi diario · semana ${n}</span>${r > 1 ? `<span class="sm">${r} semanas seguidas</span>` : ''}</div>
        <h1>¿Qué tiempo ha hecho en la pista?</h1>
        <div class="wxs" role="group" aria-label="Qué tiempo ha hecho">${TIEMPO.map(([v, l]) => `<button type="button" class="wx" data-tiempo="${v}" aria-pressed="${d.tiempo === v}" aria-label="${l}"${edit ? '' : ' disabled'}>${wx(v)}</button>`).join('')}</div>
        <span class="wx-l">${d.tiempo ? esc(TIEMPO[d.tiempo - 1][1]) : 'De tormenta a sol: elige uno'}</span></section>
      ${pg('d-mejor', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>', 'Lo mejor', d.mejor || '')}
      ${pg('d-cambiar', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>', 'Lo que cambiaría', d.cambiar || '')}
      <section class="pledge"><div class="row between"><span class="pl-h">La semana que viene voy a…</span>${!edit && d.area ? `<span class="tag">${esc(d.area)}</span>` : ''}</div>
        ${edit ? `<input type="text" id="d-comp" class="pl-in" maxlength="140" value="${esc(compOf(d))}" placeholder="algo concreto que dependa de ti" aria-label="La semana que viene voy a">
        <div class="seg dark" role="group" aria-label="De qué va">${AREAS.map(a => `<button type="button" data-area="${a}" aria-pressed="${d.area === a}">${a}</button>`).join('')}</div>` : `<p class="pl-t">${esc(compOf(d))}</p>`}</section>
      ${hist.length ? `<div class="row between"><span class="kicker">Mis compromisos</span>${evald.length ? `<span class="sub">${si} de ${evald.length} cumplidos</span>` : ''}</div><div class="tks">${hist.map(ticket).join('')}</div>` : ''}
      ${edit ? `<div class="row"><button class="btn primary big grow" type="button" data-a="savesem">Guardar mi semana</button>${mine ? '<button class="btn ghost" type="button" data-a="noeditsem">Cancelar</button>' : ''}</div><p class="msg" id="msg"></p>` : '<button class="btn" type="button" data-a="editsem">Cambiar</button>'}`, { nav: navJ() });
  }
  function hoyView() {
    const t = today(), dow = dateOf(t).getDay(), E = eqObj(), entrena = E.dias.includes(dow), dia = diaHoy();
    const show = entrena || draft.showDia || dia.antes || (dia.ses || []).length;
    const nombre = (U.perfil.nombre || '').split(' ')[0], p = puntos(U.dias, U.semanas), lv = nivelDe(p);
    shell(`<div class="hola"><div><span class="kicker">${esc(fmtDay(t))} · ${esc(E.n)}</span><h1>Hola, ${esc(nombre)}</h1></div>
        <button class="me-chip" type="button" data-v="yo" aria-label="Mi jugadora: nivel ${lv + 1}, ${p} puntos">${avatarSVG(U.perfil.av, lv)}<span><b>Nivel ${lv + 1}</b><small>${p} pts</small></span></button></div>
      ${show ? antesHTML() + despuesHTML() : `<section class="card"><h2>Hoy no tienes entreno con el equipo</h2><p class="sub">Si has jugado un partido o has entrenado por tu cuenta, apúntalo.</p><button class="btn" type="button" data-a="showdia">Apuntar un entreno o partido de hoy</button></section>`}
      ${semanaMini()}`, { nav: navJ() });
  }
  function yoView() {
    const t = today(), sem = Object.keys(U.semanas).sort().reverse().slice(0, 8);
    const p = puntos(U.dias, U.semanas), lv = nivelDe(p), next = NIVELES[lv + 1];
    const nuevos = next ? ITEMS.filter(x => x[3] === lv + 2).map(x => x[2]) : [];
    const pct = next ? Math.round((p - NIVELES[lv][1]) / (next[1] - NIVELES[lv][1]) * 100) : 100;
    if (draft.editAv) return editAvView(lv);
    shell(`<div><span class="kicker">Lo tuyo</span><h1>Mi jugadora</h1></div>
      <section class="card me-card"><div class="me-av">${avatarSVG(U.perfil.av, lv)}</div>
        <div class="me-info"><span class="kicker">Nivel ${lv + 1} de ${NIVELES.length}</span><b class="me-lv">${esc(NIVELES[lv][0])}</b>
          <div class="prog" role="img" aria-label="${pct} % hasta el siguiente nivel"><i style="width:${pct}%"></i></div>
          <span class="sub">${next ? `${p} de ${next[1]} puntos.${nuevos.length ? ` Próximo: ${esc(nuevos.join(', ').toLowerCase())}.` : ''}` : `${p} puntos. Has llegado arriba del todo.`}</span>
          <button class="btn small" type="button" data-a="editav">Cambiar mi jugadora</button></div></section>
      <section class="card"><h2>Cómo se ganan puntos</h2><ul class="pts">
        <li><span>Responder antes del entreno</span><b>+${PTS.antes}</b></li><li><span>Responder después</span><b>+${PTS.despues}</b></li>
        <li><span>Escribir tu diario de la semana</span><b>+${PTS.semana}</b></li><li><span>Decir si cumpliste tu compromiso</span><b>+${PTS.revisar}</b></li></ul>
        <p class="sub">Da igual lo que contestes: puntúa responder, no las notas. Cada nivel desbloquea ropa, gafas, fondos o marcos.</p></section>
      <section class="card"><h2>Cómo llegas a los entrenos</h2><p class="sub">Media de tus cinco respuestas, del 1 al 10, en los últimos 28 días.${baseline(U.dias, t) != null ? ' La franja es lo normal en ti.' : ''}</p>${wellChart(U.dias, t)}</section>
      <section class="card"><h2>Tu carga por semana</h2><p class="sub">Esfuerzo × minutos de cada sesión, sumado por semana. La barra clara es la semana en curso.</p>${loadChart(U.dias, t)}</section>
      <section class="card"><h2>Tus compromisos</h2>${sem.length ? `<ul class="list">${sem.map(k => { const x = U.semanas[k], nx = U.semanas[addDays(k, 7)]; return `<li class="li"><span><b>${esc(compOf(x) || '—')}</b><small>Semana del ${esc(fmtShort(k))}${nx && nx.cumplida ? ' · ' + esc(STAMP[nx.cumplida] || '') : ''}</small></span></li>`; }).join('')}</ul>` : '<p class="sub">Aquí saldrán los compromisos de tu diario.</p>'}</section>`, { nav: navJ() });
  }
  function editAvView(lv) {
    const a = draft.av = draft.av || avNorm(U.perfil.av, lv);
    const sw = (cat, list) => `<div class="swatches">${list.map(c => `<button type="button" class="sw" data-avk="${cat}" data-avv="${c}" aria-pressed="${a[cat] === c}" style="background:#${c}" aria-label="Color ${c}"></button>`).join('')}</div>`;
    const ch = (cat, list) => `<div class="seg">${list.map(([v, n]) => `<button type="button" data-avk="${cat}" data-avv="${v}" aria-pressed="${a[cat] === v}">${esc(n)}</button>`).join('')}</div>`;
    const it = cat => `<div class="seg">${ITEMS.filter(x => x[0] === cat).map(([, v, n, l]) => l <= lv + 1 ? `<button type="button" data-avk="${cat}" data-avv="${v}" aria-pressed="${a[cat] === v}">${esc(n)}</button>` : `<button type="button" disabled class="locked">${esc(n)} · nivel ${l}</button>`).join('')}</div>`;
    shell(`<div><span class="kicker">Mi jugadora</span><h1>Cámbiala a tu gusto</h1></div>
      <section class="card av-edit"><div class="me-av big">${avatarSVG(a, lv)}</div>
        <div class="q"><span class="q-h">Piel</span>${sw('skin', SKINS)}</div>
        <div class="q"><span class="q-h">Pelo</span>${ch('top', HAIRS)}</div>
        <div class="q"><span class="q-h">Color de pelo</span>${sw('hairColor', HAIR_COLORS)}</div>
        <div class="q"><span class="q-h">Ojos</span>${ch('eyes', EYES)}</div>
        <div class="q"><span class="q-h">Boca</span>${ch('mouth', MOUTHS)}</div>
        <div class="q"><span class="q-h">Ropa</span>${it('ropa')}</div>
        <div class="q"><span class="q-h">Gafas</span>${it('gafas')}</div>
        <div class="q"><span class="q-h">Gorro</span>${it('gorro')}</div>
        <div class="q"><span class="q-h">Fondo</span>${it('fondo')}</div>
        <div class="q"><span class="q-h">Marco</span>${it('marco')}</div>
        <div class="row"><button class="btn primary" type="button" data-a="saveav">Guardar</button><button class="btn ghost" type="button" data-a="noeditav">Cancelar</button></div></section>`, { nav: navJ() });
  }
  actions.editav = async () => { draft.editAv = true; draft.av = null; render(); scrollTo({ top: 0 }); };
  actions.noeditav = async () => { draft.editAv = false; draft.av = null; render(); };
  actions.saveav = async () => {
    const av = Object.assign({}, draft.av); await B.merge('jugadoras/' + me.uid, { av });
    U.perfil = Object.assign({}, U.perfil, { av }); draft.editAv = false; draft.av = null; toast('Guardada.'); render(); scrollTo({ top: 0 });
  };
  // tras guardar algo: los puntos que suma y, si sube de nivel, lo que desbloquea
  function premio(antes) {
    const p = puntos(U.dias, U.semanas), d = p - antes, l0 = nivelDe(antes), l1 = nivelDe(p);
    if (l1 > l0) { const n = ITEMS.filter(x => x[3] === l1 + 1).map(x => x[2].toLowerCase()); toast(`¡Nivel ${l1 + 1}: ${NIVELES[l1][0]}!${n.length ? ' Nuevo: ' + n.join(', ') + '.' : ''}`); }
    else toast(d > 0 ? `Guardado. +${d} puntos.` : 'Guardado. Gracias.');
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
  const firstEmpty = () => { const i = WELL.findIndex(w => !(draft.antes[w.k] >= 1)); return i < 0 ? 0 : i; };
  actions.startantes = async () => { draft.paso = firstEmpty(); view = 'antes'; render(); scrollTo({ top: 0 }); };
  actions.editantes = async () => { draft.editAntes = true; const a0 = diaHoy().antes || {}; draft.antes = { nota: a0.nota || '' }; WELL.forEach(w => { if (a0[w.k] >= 1) draft.antes[w.k] = Math.round(diez(a0[w.k], a0)); }); draft.paso = 0; view = 'antes'; render(); scrollTo({ top: 0 }); };
  actions.flowback = async () => { keepFNota(); if (draft.paso > 0) { draft.paso--; render(); } else actions.flowclose(); };
  const keepFNota = () => { const el = document.getElementById('f-nota'); if (el) draft.antes.nota = el.value; };
  actions.saveantes = async () => { keepFNota(); await saveAntes(); };
  actions.flowclose = async () => { keepFNota(); view = 'hoy'; draft.editAntes = false; render(); };
  async function saveAntes() {
    const d = draft.antes; if (WELL.some(w => !(d[w.k] >= 1))) { draft.paso = firstEmpty(); render(); return; }
    const p0 = puntos(U.dias, U.semanas), a = Object.assign({}, d, { esc: 10, nota: String(d.nota || '').trim(), ts: Date.now() });
    await B.merge(`registros/${me.uid}/dias/${today()}`, { antes: a, ts: Date.now() });
    U.dias[today()] = Object.assign({}, U.dias[today()] || {}, { antes: a });
    draft.editAntes = false; draft.antes = {}; view = 'hoy'; premio(p0); render(); scrollTo({ top: 0 });
  }
  actions.saveses = async () => {
    const d = draft.ses; if (d.rpe == null) { toast('Elige lo duro que ha sido.'); return; }
    const s = { tipo: d.tipo, rpe: d.rpe, min: d.min, nota: ($('#s-nota') || {}).value ? $('#s-nota').value.trim() : '', ts: Date.now() };
    const p0 = puntos(U.dias, U.semanas), L = [...(diaHoy().ses || []), s];
    await B.merge(`registros/${me.uid}/dias/${today()}`, { ses: L, ts: Date.now() });
    U.dias[today()] = Object.assign({}, U.dias[today()] || {}, { ses: L });
    draft.ses = { tipo: 'entreno', rpe: null, min: eqMin(), nota: '' }; draft.moreSes = false; premio(p0); render();
  };
  actions.delses = async b => { const L = (diaHoy().ses || []).filter((_, i) => i !== +b.dataset.i); await B.merge(`registros/${me.uid}/dias/${today()}`, { ses: L, ts: Date.now() }); U.dias[today()] = Object.assign({}, diaHoy(), { ses: L }); render(); };
  actions.moreses = async () => { draft.moreSes = true; render(); };
  actions.lessses = async () => { draft.moreSes = false; render(); };
  actions.showdia = async () => { draft.showDia = true; render(); };
  actions.editsem = async () => { draft.editSem = true; render(); };
  actions.noeditsem = async () => { draft.editSem = false; draft.sem = null; render(); };
  actions.gosemana = async () => { view = 'semana'; render(); scrollTo({ top: 0 }); };
  actions.savesem = async () => {
    const lunes = mondayOf(today()), d = draft.sem, m = $('#msg'), err = t => { m.className = 'msg err'; m.textContent = t; };
    const val = id => ((document.getElementById(id) || {}).value || '').trim();
    d.mejor = val('d-mejor'); d.cambiar = val('d-cambiar'); d.compromiso = val('d-comp');
    if (!d.tiempo) return err('Elige qué tiempo ha hecho en la pista.');
    if (!d.compromiso) return err('Escribe a qué te comprometes la semana que viene.');
    const doc = { tiempo: d.tiempo, mejor: d.mejor, cambiar: d.cambiar, compromiso: d.compromiso, area: d.area || '', cumplida: d.cumplida || '', ts: Date.now() };
    const p0 = puntos(U.dias, U.semanas);
    await B.set(`registros/${me.uid}/semanas/${lunes}`, doc);
    U.semanas[lunes] = doc; draft.editSem = false; draft.sem = null; premio(p0); render(); scrollTo({ top: 0 });
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
    if (b.dataset.v && (b.closest('.nav') || b.classList.contains('me-chip'))) { view = b.dataset.v; draft.editSem = false; draft.editAv = false; draft.av = null; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.fw) {
      if (draft.busy) return;
      draft.antes[b.dataset.fw] = +b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      draft.busy = true;
      setTimeout(async () => { try { draft.paso++; render(); } catch (er) { console.error(er); toast('No se ha podido guardar. Revisa la conexión e inténtalo otra vez.'); } finally { draft.busy = false; } }, 230);
      return;
    }
    const keepNota = () => { draft.ses.nota = ($('#s-nota') || {}).value || ''; };
    if (b.dataset.rpe) { draft.ses.rpe = +b.dataset.rpe; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (b.dataset.tipo) { keepNota(); draft.ses.tipo = b.dataset.tipo; draft.ses.min = (TIPOS.find(t => t.k === b.dataset.tipo) || TIPOS[0]).min; draft.ses.otroMin = false; render(); return; }
    if (b.dataset.minc) { keepNota(); if (b.dataset.minc === 'otro') draft.ses.otroMin = true; else { draft.ses.min = +b.dataset.minc; draft.ses.otroMin = false; } render(); return; }
    if (b.dataset.min) { draft.ses.min = Math.max(5, Math.min(240, draft.ses.min + +b.dataset.min)); $('#min-o').textContent = draft.ses.min; return; }
    if (b.dataset.avk && draft.av) { draft.av[b.dataset.avk] = b.dataset.avv; const y = scrollY; render(); scrollTo({ top: y }); return; }
    if (b.dataset.tiempo && draft.sem) { draft.sem.tiempo = +b.dataset.tiempo; const y = scrollY; render(); scrollTo({ top: y }); return; }
    if (b.dataset.area && draft.sem) { draft.sem.area = draft.sem.area === b.dataset.area ? '' : b.dataset.area; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.area === draft.sem.area))); return; }
    if (b.dataset.cumplida && draft.sem) { draft.sem.cumplida = b.dataset.cumplida; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
  });
  root.addEventListener('input', e => { if (!draft.sem) return; const k = { 'd-mejor': 'mejor', 'd-cambiar': 'cambiar', 'd-comp': 'compromiso' }[e.target.id]; if (k) draft.sem[k] = e.target.value; });

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
  }

  // ================= Dirección Técnica =================
  const navA = () => `<nav class="nav" aria-label="Secciones">${[['resumen', 'Equipo'], ['equipo', 'Jugadoras'], ['acceso', 'Altas']].map(([k, l]) => `<button type="button" data-av="${k}" aria-current="${view === k || (view === 'detalle' && k === 'equipo') ? 'page' : 'false'}">${l}${k === 'acceso' && pendientes().length ? ` · ${pendientes().length}` : ''}</button>`).join('')}</nav>`;
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
        <p class="chart-note">«Llega hoy»: media de sus cinco respuestas de hoy (1 a 10). «Semana / mes»: carga de los últimos 7 días dividida por su media semanal del último mes; avisa por encima de 1,3 o por debajo de 0,8 (necesita 3 semanas de datos).</p>` : `<p class="sub">${activas().length ? 'No hay jugadoras activas en este equipo.' : 'Todavía no hay jugadoras activas. Actívalas en «Altas» cuando tengas su consentimiento firmado.'}</p>`}</section>`, { nav: navA(), wide: true, right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  // resumen de un equipo: cuántas han respondido, cómo llega el equipo, su esfuerzo y a quién mirar
  const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  function resumenView() {
    const eq = A.req || EQUIPOS[0].id, E = EQUIPOS.find(x => x.id === eq) || EQUIPOS[0], t = today();
    let ref = t; for (let i = 0; i < 7; i++) { const d = addDays(t, -i); if (E.dias.includes(dateOf(d).getDay())) { ref = d; break; } }
    const us = activas().filter(u => eqDe(u) === eq);
    const resp = us.filter(u => (diasDe(u)[ref] || {}).antes).length;
    const media = mean(us.map(u => wellScore((diasDe(u)[ref] || {}).antes)).filter(x => x != null));
    // el equipo como si fuera una jugadora: su media de cada día
    const teamDias = {};
    for (let i = 0; i < 40; i++) { const d = addDays(t, -i), m = mean(us.map(u => wellScore((diasDe(u)[d] || {}).antes)).filter(x => x != null)); if (m != null) teamDias[d] = { antes: Object.assign(Object.fromEntries(WELL.map(w => [w.k, m])), { esc: 10 }) }; }
    const base = baseline(teamDias, ref);
    let acute = 0, chronic = 0, conDatos = 0; us.forEach(u => { const L = loads(diasDe(u), t); acute += L.acute; chronic += L.chronic; if (L.span >= 21) conDatos++; });
    const ratio = chronic > 0 && conDatos ? acute / chronic : null, pctC = ratio == null ? null : Math.round((ratio - 1) * 100);
    const rows = us.map(u => ({ u, e: estado(diasDe(u), t) }));
    const bad = rows.filter(r => r.e.lvl === 'bad'), warn = rows.filter(r => r.e.lvl === 'warn');
    const cerradas = us.filter(u => semDe(u)[mondayOf(t)]).length;
    const al = r => `<li><button type="button" class="al-row" data-jug="${r.u}"><b>${esc((A.jug[r.u].nombre || '').split(' ')[0])}</b><span>${esc((r.e.R.find(x => x.lvl === r.e.lvl) || r.e.R[0] || {}).txt || '')}</span></button></li>`;
    shell(`<div><span class="kicker">${ref === t ? 'Hoy · ' : 'Último entreno · '}${esc(fmtDay(ref))}</span><h1>El equipo de un vistazo</h1></div>
      <div class="seg" role="group" aria-label="Equipo">${EQUIPOS.map(x => `<button type="button" data-req="${x.id}" aria-pressed="${eq === x.id}">${x.n}</button>`).join('')}</div>
      ${us.length ? `<div class="tiles">
        <div class="tile"><span class="k">Han respondido${ref === t ? ' hoy' : ''}</span><b class="v">${resp}/${us.length}</b><span class="s">${Math.round(resp / us.length * 100)} %</span></div>
        <div class="tile"><span class="k">Cómo llega el equipo</span><b class="v">${fmt1(media)}</b><span class="s">${base != null ? 'Suele ' + fmt1(base) : 'del 1 al 10'}</span></div>
        <div class="tile"><span class="k">Esfuerzo de la semana</span><b class="v">${pctC == null ? '—' : (pctC > 0 ? '+' : '') + pctC + ' %'}</b><span class="s">${pctC == null ? 'Faltan semanas de datos' : 'frente a su mes'}</span></div></div>
      <section class="card"><h2>Cómo llega el equipo · 4 semanas</h2><p class="sub">Media del equipo en cada entreno.${base != null ? ' La franja es lo normal en el equipo.' : ''}</p>${wellChart(teamDias, t)}</section>
      ${(() => { const ns = us.filter(u => ((diasDe(u)[ref] || {}).antes || {}).nota); return ns.length ? `<section class="card"><h2>Lo que te han contado${ref === t ? ' hoy' : ''}</h2><ul class="al-list">${ns.map(u => `<li><button type="button" class="al-row" data-jug="${u}"><b>${esc((A.jug[u].nombre || '').split(' ')[0])}</b><span>«${esc(diasDe(u)[ref].antes.nota)}»</span></button></li>`).join('')}</ul></section>` : ''; })()}
      <section class="card"><h2>A quién mirar</h2>
        ${bad.length ? `<div class="al-h bad">${ST_IC.bad}Habla con ella · ${bad.length}</div><ul class="al-list">${bad.map(al).join('')}</ul>` : ''}
        ${warn.length ? `<div class="al-h warn">${ST_IC.warn}Échale un ojo · ${warn.length}</div><ul class="al-list">${warn.map(al).join('')}</ul>` : ''}
        ${!bad.length && !warn.length ? '<p class="sub">Nadie con avisos. Todo en orden.</p>' : ''}</section>
      <section class="card"><h2>Su diario</h2><p>${cerradas} de ${us.length} han escrito su semana.</p>${(() => {
        const sem = us.map(u => semDe(u)[mondayOf(t)]).filter(Boolean), ti = sem.map(x => x.tiempo).filter(Boolean), cu = sem.map(x => x.cumplida).filter(Boolean);
        return (ti.length ? `<div class="wx-sum">${TIEMPO.map(([v, l]) => { const c = ti.filter(x => x === v).length; return c ? `<span>${wx(v)}<b>${c}</b><small>${l}</small></span>` : ''; }).join('')}</div>` : '')
          + (cu.length ? `<p class="sub">Compromiso de la semana pasada: ${['si', 'medias', 'no'].map(k => `${cu.filter(x => x === k).length} ${STAMP[k].toLowerCase()}`).join(' · ')}.</p>` : ''); })()}</section>`
      : `<section class="card"><p class="sub">${activas().length ? 'No hay jugadoras activas en este equipo.' : 'Todavía no hay jugadoras activas. Actívalas en «Altas» cuando tengas su consentimiento firmado.'}</p></section>`}`,
      { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  function detalleView() {
    const u = A.sel, J = A.jug[u]; if (!J) { view = 'equipo'; return equipoView(); }
    const t = today(), D = diasDe(u), S = semDe(u), e = estado(D, t);
    const last14 = []; for (let i = 0; i < 14; i++) last14.push(addDays(t, -i));
    const semanas = Object.keys(S).sort().reverse().slice(0, 6);
    shell(`<button class="btn ghost small back" type="button" data-av="equipo">← Todas las jugadoras</button>
      <div><span class="kicker">${esc(eqName(eqDe(u)))}</span><h1>${esc(J.nombre)}</h1></div>
      <section class="card"><div class="card-h"><h2>Hoy</h2>${stHTML(e.lvl)}</div>${e.R.length ? `<ul class="info" style="padding-left:18px;margin:0">${e.R.map(x => `<li>${esc(x.txt)}</li>`).join('')}</ul>` : '<p class="sub">Nada que destacar.</p>'}</section>
      <div class="two">
        <section class="card"><h2>Cómo llega</h2><p class="sub">Media del 1 al 10, últimos 28 días.${e.base != null ? ' Franja: lo normal en ella.' : ''}</p>${wellChart(D, t)}</section>
        <section class="card"><h2>Carga por semana</h2><p class="sub">Esfuerzo × minutos. Barra clara: semana en curso.</p>${loadChart(D, t)}</section>
      </div>
      <section class="card"><h2>Últimos 14 días</h2><div class="tbl-wrap"><table><thead><tr><th>Día</th>${WELL.map(w => `<th class="num">${w.n.split(' ')[0]}</th>`).join('')}<th class="num">Esfuerzo</th><th class="num">Min</th><th class="num">Carga</th><th>Nota</th></tr></thead><tbody>
        ${last14.map(k => { const d = D[k] || {}, a = d.antes || {}, L = d.ses || []; if (!d.antes && !L.length) return ''; return `<tr><td>${esc(fmtShort(k))}</td>${WELL.map(w => `<td class="num">${a[w.k] >= 1 ? fmtInt(diez(a[w.k], a)) : '—'}</td>`).join('')}<td class="num">${L.map(s => s.rpe).join(' + ') || '—'}</td><td class="num">${L.map(s => s.min).join(' + ') || '—'}</td><td class="num">${L.length ? fmtInt(dayLoad(d)) : '—'}</td><td class="nota-td">${esc([a.nota, ...L.map(s => s.nota)].filter(Boolean).join(' · '))}</td></tr>`; }).join('') || `<tr><td colspan="${WELL.length + 5}" class="sub">Sin respuestas en estos 14 días.</td></tr>`}</tbody></table></div></section>
      <section class="card"><h2>Su diario</h2>
        ${semanas.length ? semanas.map(k => { const x = S[k]; return `<div class="obj"><span class="kicker">Semana del ${esc(fmtShort(k))}</span>
          ${x.tiempo ? `<span class="wx-line">${wx(x.tiempo)}${esc(TIEMPO[x.tiempo - 1][1])}</span>` : ''}
          ${x.cumplida ? `<span class="sub">Su compromiso anterior: ${esc(STAMP[x.cumplida] || '')}</span>` : ''}
          ${x.mejor ? `<p><b>Lo mejor:</b> ${esc(x.mejor)}</p>` : ''}${x.cambiar ? `<p><b>Lo que cambiaría:</b> ${esc(x.cambiar)}</p>` : ''}${x.resp ? `<p><b>${esc(x.pregunta || 'Respuesta')}</b><br>${esc(x.resp)}</p>` : ''}
          <p><b>Se compromete a:</b> ${esc(compOf(x) || '—')}${x.area ? ` <span class="pill">${esc(x.area)}</span>` : ''}</p></div>`; }).join('') : '<p class="sub">Todavía no ha escrito en su diario.</p>'}</section>`, { nav: navA(), wide: true, right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
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
      rows.push([A.jug[u].nombre, eqName(eqDe(u)), k, ...WELL.map(w => a[w.k] >= 1 ? r1(diez(a[w.k], a)) : ''), wellScore(a) == null ? '' : r1(wellScore(a)), L.map(s => s.tipo).join(' + '), L.map(s => s.rpe).join(' + '), L.map(s => s.min).join(' + '), L.length ? dayLoad(d) : '', [a.nota, ...L.map(s => s.nota)].filter(Boolean).join(' · ')]); }));
    const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `smb-femenino-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  };
  root.addEventListener('click', async e => {
    if (!isAdmin()) return;
    const b = e.target.closest('button, tr[data-jug]'); if (!b) return;
    if (b.dataset.av) { view = b.dataset.av; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.aeq) { A.eq = b.dataset.aeq; render(); return; }
    if (b.dataset.req) { A.req = b.dataset.req; render(); return; }
    if (b.dataset.jug) { A.sel = b.dataset.jug; view = 'detalle'; render(); scrollTo({ top: 0 }); return; }
  });
  root.addEventListener('keydown', e => { if (isAdmin() && e.key === 'Enter' && e.target.dataset && e.target.dataset.jug) e.target.click(); });
  root.addEventListener('change', async e => {
    if (!isAdmin() || !e.target.dataset.chgeq) return;
    const u = e.target.dataset.chgeq; try { await B.merge('acceso/' + u, { equipo: e.target.value, ts: Date.now() }); toast('Equipo cambiado.'); } catch (er) { toast('No se ha podido cambiar.'); }
  });
  function startAdmin() {
    view = 'resumen';
    unsub.push(B.listenCol('jugadoras', L => { A.jug = Object.fromEntries(L.map(x => [x.id, x.data])); syncRegs(); render(); }, () => {}));
    unsub.push(B.listenCol('acceso', L => { A.acc = Object.fromEntries(L.map(x => [x.id, x.data])); syncRegs(); render(); }, () => {}));
  }
  // escucha lo de cada jugadora con alta
  function syncRegs() {
    Object.keys(A.jug).forEach(u => {
      if (A.subs[u]) return;
      A.regs[u] = A.regs[u] || { dias: {}, semanas: {} };
      const s1 = B.listenCol(`registros/${u}/dias`, L => { A.regs[u].dias = Object.fromEntries(L.map(x => [x.id, x.data])); renderSoon(); }, () => {});
      const s2 = B.listenCol(`registros/${u}/semanas`, L => { A.regs[u].semanas = Object.fromEntries(L.map(x => [x.id, x.data])); renderSoon(); }, () => {});
      A.subs[u] = () => { s1(); s2(); };
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
    if (isAdmin()) { if (view === 'detalle') return detalleView(); if (view === 'acceso') return accesoView(); if (view === 'equipo') return equipoView(); return resumenView(); }
    if (U.perfil === undefined || U.acceso === undefined) { gate('<p class="sub" style="text-align:center">Cargando…</p>'); return; }
    if (!U.perfil || !U.perfil.acepta || U.editAlta) return altaView();
    if (!U.acceso || !U.acceso.activa) return esperaView();
    if (view === 'antes') return antesFlowView();
    if (view === 'semana') return diarioView(); if (view === 'yo' || view === 'evol') return yoView(); if (view === 'datos') return datosView();
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
