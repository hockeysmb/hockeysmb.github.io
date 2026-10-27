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
  // un solo grupo (23 oct): toda la sección femenina, de Sub-15 para arriba, va junta como «Femenino»
  const EQ = 'femenino', EQ_N = 'Femenino';
  const eqName = () => EQ_N;
  // días de entreno: los pone la DT (equipos/femenino); dias = días de la semana (0 domingo … 6 sábado), sin = fechas sin entreno
  const CAL_DEF = { dias: [1, 2, 4], sin: [] };
  const calOf = c => ({ dias: (c && Array.isArray(c.dias)) ? c.dias : CAL_DEF.dias, sin: (c && Array.isArray(c.sin)) ? c.sin : [] });
  const entrena = (cal, d) => cal.dias.includes(dateOf(d).getDay()) && !cal.sin.includes(d);
  // partidos: el calendario de la federación (partidos.json, lo actualiza quien mantiene la app) y los que añade la DT (equipos/femenino.extra)
  let PART = [], PART_AT = '';
  const CATS = ['Sub-15', 'Sub-17', '1ª Autonómica', 'Otro'];
  function cargarPartidos() { fetch('partidos.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { if (j && Array.isArray(j.partidos)) { const nuevo = JSON.stringify(j.partidos) !== JSON.stringify(PART); PART = j.partidos; PART_AT = j.actualizado || ''; if (nuevo) render(); } }).catch(() => {}); }
  // cambios a mano de la DT (equipos/femenino.cambios: [{id, fecha, hora, res}]) por encima del calendario de la federación; «orig» = la fecha de la federación
  const conCambio = (x, C) => { const c = C.find(z => z.id === x.id); if (!c) return x; const o = Object.fromEntries(['fecha', 'hora', 'res'].filter(k => c[k]).map(k => [k, c[k]])); return Object.assign({}, x, o, { orig: x.fecha, cambiado: true }); };
  // al volver a la app (estaba en segundo plano) se vuelve a mirar el calendario por si la federación lo ha cambiado
  document.addEventListener('visibilitychange', () => { if (!document.hidden && PART.length) cargarPartidos(); });
  const allPart = cal => [...PART, ...(((cal || {}).extra) || [])].map(x => conCambio(x, ((cal || {}).cambios) || [])).sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  const partDe = (cal, d) => allPart(cal).filter(x => x.fecha === d);
  // lo que contó una jugadora de un partido: normalmente en el día del partido; si la fecha cambió, en la de antes o en cualquier otro día
  function pdAt(dias, x) {
    for (const k of [x.fecha, x.orig].filter(Boolean)) { const pd = ((dias[k] || {}).partidos || {})[x.id]; if (pd) return { k, pd }; }
    for (const k of Object.keys(dias)) { const pd = ((dias[k] || {}).partidos || {})[x.id]; if (pd) return { k, pd }; }
    return { k: x.fecha, pd: null };
  }
  const partTxt = x => `${x.cat} · ${x.rival} (${x.casa ? 'en casa' : 'fuera'})`;
  const PJUEGA = [['si', 'He jugado'], ['conv', 'Convocada, sin jugar']];
  // antes y después del partido (25 oct)
  const L10 = o => v => ({ 10: o[4], 8: o[3], 5: o[2], 3: o[1], 1: o[0] })[v];
  const ESPERA = [['ganar', 'Lo vamos a ganar'], ['igualado', 'Igualado'], ['dificil', 'Va a ser difícil'], ['nose', 'No lo sé']];
  const IMPORTA = [['ganar', 'Ganar'], ['jugarbien', 'Jugar bien'], ['disfrutar', 'Disfrutar'], ['aprender', 'Aprender algo'], ['minutos', 'Tener minutos'], ['equipo', 'Ayudar al equipo']];
  const CUMPLIDO = [['si', 'Sí'], ['medias', 'A medias'], ['no', 'No']];
  const EMOC = ['Orgullosa', 'Contenta', 'Tranquila', 'Con ganas de más', 'Cansada', 'Frustrada', 'Decepcionada', 'Enfadada', 'Triste', 'Nerviosa'];
  const EMOC_MAL = ['Frustrada', 'Decepcionada', 'Enfadada', 'Triste'];
  const PMINS = [5, 10, 15, 20, 25, 30, 40, 50];
  const lbl = (L, k) => (L.find(x => x[0] === k) || [0, ''])[1];
  // respuestas de la DT: en acceso/{uid}.resp (la jugadora lo lee, solo la DT lo escribe; no hacen falta reglas nuevas)
  // claves: «d:AAAA-MM-DD» (lo que contó ese día) y «s:AAAA-MM-DD» (su diario de esa semana)
  const respOf = (acc, k) => ((acc || {}).resp || {})[k];
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const DOW = [[1, 'L', 'lunes'], [2, 'M', 'martes'], [3, 'X', 'miércoles'], [4, 'J', 'jueves'], [5, 'V', 'viernes'], [6, 'S', 'sábado'], [0, 'D', 'domingo']];
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
  const PTS = { antes: 10, despues: 10, partido: 10, semana: 20, revisar: 15, diario: 5 };
  const NIVELES = [['Novata', 0], ['Calentando', 30], ['En pista', 80], ['Titular', 150], ['Imprescindible', 250], ['Referente', 380], ['Capitana', 550], ['Veterana', 750], ['Mito', 1000], ['Leyenda del SMB', 1300]];
  function puntos(dias, semanas) {
    let p = 0;
    Object.values(dias || {}).forEach(d => { if (!d) return; if (d.antes) p += PTS.antes; if ((d.ses || []).some(z => !z.pid)) p += PTS.despues; if (d.diario) p += PTS.diario; Object.values(d.partidos || {}).forEach(pd => { if (pd && pd.pre) p += PTS.partido; if (pd && pd.juega) p += PTS.partido; }); });
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
  const AV_DEF = { skin: 'edb98a', top: 'straight02', hairColor: '4a312c', eyes: 'default', mouth: 'smile', ropa: 'hoodie:681825', gafas: '', gorro: '', fondo: 'rosa', marco: '', barba: '' };
  const BARBAS = [['', 'Sin barba'], ['beardLight', 'Barba corta'], ['beardMedium', 'Barba'], ['beardMajestic', 'Barbaza'], ['moustacheFancy', 'Bigote'], ['moustacheMagnum', 'Bigotón']];
  // lo de la tienda del reto vale siempre (se compra con monedas, no va por nivel)
  const itemOk = (cat, v, lv) => { if (typeof TIENDA !== 'undefined' && TIENDA.some(x => x[0] === cat && x[1] === v)) return true; const it = ITEMS.find(x => x[0] === cat && x[1] === v); return !!it && it[3] <= lv + 1; };
  function avNorm(av, lv) {
    const a = Object.assign({}, AV_DEF, av || {});
    ['ropa', 'gafas', 'gorro', 'fondo', 'marco'].forEach(c => { if (!itemOk(c, a[c], lv)) a[c] = AV_DEF[c]; });
    return a;
  }
  function fondoSVG(bg, id) {
    if (bg === 'pista') return `<rect width="280" height="280" fill="#dfe8f3"/><rect y="200" width="280" height="80" fill="#c8d6e6"/><line x1="0" y1="200" x2="280" y2="200" stroke="#fff" stroke-width="4"/><path d="M248,150 a22,22 0 0 1 0,44 z" fill="#fff" stroke="#f26a1b" stroke-width="4"/><circle cx="40" cy="44" r="4" fill="#1b1b1b"/>`;
    if (bg === 'atardecer') return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a5a"/><stop offset=".6" stop-color="#ffcf7a"/><stop offset="1" stop-color="#ffe6b0"/></linearGradient></defs><rect width="280" height="280" fill="url(#${id}s)"/><circle cx="140" cy="170" r="70" fill="#fff3c4" opacity=".7"/><rect y="210" width="280" height="70" fill="#5b7fa8"/><line x1="0" y1="210" x2="280" y2="210" stroke="#fff" stroke-width="3"/>`;
    if (bg === 'espacio') return `<rect width="280" height="280" fill="#0f1030"/>${Array.from({ length: 30 }, (_, k) => `<circle cx="${(k * 97) % 280}" cy="${(k * 53) % 280}" r="${1 + k % 3}" fill="#fff" opacity="${0.4 + (k % 5) / 8}"/>`).join('')}<circle cx="230" cy="60" r="26" fill="#ff8fd1"/><ellipse cx="230" cy="60" rx="40" ry="8" fill="none" stroke="#ffd84d" stroke-width="4"/>`;
    if (bg === 'bosque') return `<rect width="280" height="280" fill="#cfeedd"/>${[[30, 150], [90, 130], [200, 140], [250, 160]].map(([x, y]) => `<path d="M${x} ${y - 90} L${x - 40} ${y + 10} L${x + 40} ${y + 10} Z" fill="#3f9a5a"/><rect x="${x - 6}" y="${y + 10}" width="12" height="30" fill="#8a5a2b"/>`).join('')}<rect y="230" width="280" height="50" fill="#7cc576"/>`;
    if (bg === 'nieve') return `<rect width="280" height="280" fill="#dbe9f7"/>${Array.from({ length: 34 }, (_, k) => `<circle cx="${(k * 71) % 280}" cy="${(k * 43) % 230}" r="${2 + k % 3}" fill="#fff"/>`).join('')}<path d="M0 230 Q70 200 140 228 T280 222 V280 H0 Z" fill="#fff"/>`;
    if (bg === 'playa') return `<rect width="280" height="280" fill="#8fd3f4"/><circle cx="222" cy="58" r="30" fill="#ffe27a"/><rect y="170" width="280" height="40" fill="#3fa7d6"/><rect y="205" width="280" height="75" fill="#f3dca2"/>`;
    if (bg === 'neon') return `<rect width="280" height="280" fill="#1a1033"/>${[['#ff3ea5', 60], ['#3ef0ff', 120], ['#b45cff', 180], ['#ff3ea5', 240]].map(([c, y]) => `<line x1="0" y1="${y}" x2="280" y2="${y - 40}" stroke="${c}" stroke-width="5" opacity=".8"/>`).join('')}`;
    if (bg === 'noche') return `<rect width="280" height="280" fill="#1c2340"/>${[[40, 30], [120, 18], [210, 40], [250, 90], [24, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#fff6c8" opacity=".9"/><circle cx="${x}" cy="${y}" r="32" fill="#fff6c8" opacity=".15"/>`).join('')}<rect y="210" width="280" height="70" fill="#2e3a66"/><line x1="0" y1="210" x2="280" y2="210" stroke="#7d8fc9" stroke-width="3"/>`;
    if (bg === 'confeti') return `<rect width="280" height="280" fill="#681825"/>${Array.from({ length: 46 }, (_, k) => `<rect x="${(k * 61) % 270}" y="${(k * 37) % 270}" width="8" height="4" rx="1" transform="rotate(${(k * 47) % 180} ${(k * 61) % 270 + 4} ${(k * 37) % 270 + 2})" fill="${['#f2c14e', '#ffffff', '#e3949f', '#8fd0a8'][k % 4]}"/>`).join('')}`;
    const c = { rosa: '#e6c6cb', gris: '#d9d2d3' }[bg] || '#e6c6cb';
    return `<rect width="280" height="280" fill="${c}"/><circle cx="140" cy="150" r="112" fill="#ffffff" opacity=".2"/>`;
  }
  function marcoSVG(m) {
    if (m === 'estrellas') return `<rect x="5" y="5" width="270" height="270" rx="30" fill="none" stroke="#2c1f5e" stroke-width="10"/>${[[20, 20], [260, 20], [20, 260], [260, 260], [140, 8], [140, 272]].map(([x, y]) => `<path d="M${x} ${y - 12} l3.5 8 8.5 1 -6.5 6 2 8.5 -7.5 -4.5 -7.5 4.5 2 -8.5 -6.5 -6 8.5 -1 Z" fill="#ffd84d"/>`).join('')}`;
    if (m === 'arcoiris') return `<defs><linearGradient id="mra" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a5a"/><stop offset=".25" stop-color="#ffb84d"/><stop offset=".5" stop-color="#5ad16b"/><stop offset=".75" stop-color="#4da6ff"/><stop offset="1" stop-color="#a36bff"/></linearGradient></defs><rect x="5" y="5" width="270" height="270" rx="30" fill="none" stroke="url(#mra)" stroke-width="10"/>`;
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
          eyes: [a.eyes], eyebrows: ['defaultNatural'], mouth: [a.mouth], nose: ['default'], facialHair: a.barba ? [a.barba] : ['beardLight'], facialHairColor: [a.hairColor], facialHairProbability: a.barba ? 100 : 0,
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
    const R = [], add = (lvl, txt, c, ic) => R.push({ lvl, txt, c, ic });
    const a = (dias[ref] || {}).antes, s = wellScore(a), base = baseline(dias, ref), L = loads(dias, ref), last = lastAnswer(dias);
    if (s != null && s <= 4.5) add('bad', `Llega mal hoy (${fmt1(s)} de 10).`, `Llega ${fmt1(s)}`, 'baja');
    else if (s != null && base != null && s <= base - 1.8) add('warn', `Hoy está por debajo de lo normal en ella (${fmt1(s)}; suele estar en ${fmt1(base)}).`, `${fmt1(s)} · suele ${fmt1(base)}`, 'baja');
    if (a && diez(a.dolor, a) <= 3) add('warn', 'Molestias musculares altas.', `Molestias ${Math.round(diez(a.dolor, a))}`, 'dolor');
    if (a && a.nota) add('info', `Ha escrito: «${a.nota}»`, 'Ha escrito', 'nota');
    // «Mi rincón» del diario (27 oct): lo que no ha ido bien o le ronda la cabeza; de hoy o de ayer
    [ref, addDays(ref, -1)].forEach(k => { const r = ((dias[k] || {}).diario || {}).rincon; if (r) add('info', `En su rincón${k === ref ? '' : ' (ayer)'}: «${r}»`, 'Su rincón', 'nota'); });
    Object.keys(dias).filter(k => k <= ref && daysBetween(k, ref) <= 2).forEach(k => Object.values((dias[k] || {}).partidos || {}).forEach(pd => {
      const m = (pd.emociones || []).filter(e => EMOC_MAL.includes(e));
      if (m.length) add('info', `Después del partido contra ${pd.rival || '—'} se siente ${m.join(', ').toLowerCase()}.`, m.join(', '), 'partido');
      if (k === ref && pd.pre && pd.pre.confianza <= 3) add('info', `Llega al partido con poca confianza (${pd.pre.confianza} de 10).`, `Confianza ${pd.pre.confianza}`, 'partido');
    }));
    // la subida de carga sola no predice lesiones (no hay pruebas de una «zona segura»): pesa más si además llega peor de lo normal en ella
    const peor = s != null && base != null && s < base - 0.5;
    if (L.ratio != null && L.ratio > 1.5) add(peor ? 'bad' : 'warn', `La carga de esta semana se dispara: ${fmt1(L.ratio)} veces su media del mes${peor ? ' y llega peor de lo normal' : ''}.`, `Carga ×${fmt1(L.ratio)}`, 'carga');
    else if (L.ratio != null && L.ratio > 1.3) add(peor ? 'warn' : 'info', `Carga alta esta semana: ${fmt1(L.ratio)} veces su media del mes${peor ? ' y llega peor de lo normal' : ''}.`, `Carga ×${fmt1(L.ratio)}`, 'carga');
    // contestó en menos de 6 segundos y todo igual: puede que no lo haya pensado
    if (a && a.seg != null && a.seg < 6 && new Set(WELL.map(w => a[w.k])).size === 1) add('info', `Ha contestado en ${a.seg} s y todo igual: puede que no lo haya pensado.`, 'Muy rápido', 'reloj');
    else if (L.ratio != null && L.ratio < 0.8) add('info', `Carga baja esta semana: ${fmt1(L.ratio)} veces su media del mes.`, `Carga ×${fmt1(L.ratio)}`, 'carga');
    if (!last) add('none', 'Todavía no ha respondido nada.', 'Sin respuestas', 'reloj');
    else if (daysBetween(last, ref) >= 4) add('warn', `Lleva ${daysBetween(last, ref)} días sin responder.`, `${daysBetween(last, ref)} días sin responder`, 'reloj');
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
  const A = { jug: {}, acc: {}, regs: {}, equipos: {}, val: {}, sel: '', subs: {}, cal: null, editResp: {} }; // DT
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
      else if (/permission/i.test((er && (er.code || er.message)) || '') && /^(reto|avdt)$/.test(view)) { J.sinReglas = true; toast(isAdmin() ? 'No se ha guardado: faltan las reglas del reto en Firebase.' : 'Todavía no se puede guardar: el reto no está activo.'); render(); }
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
      <label class="check"><input type="checkbox" id="a-menor"${p.menor ? ' checked' : ''}> Soy menor de edad</label>
      <label class="check"><input type="checkbox" id="a-ok"> He leído la información y quiero usar la app.</label>
      <label class="check" id="a-fam-l"${p.menor ? '' : ' hidden'}><input type="checkbox" id="a-fam"> Mi familia ha firmado (o va a firmar) la hoja de consentimiento.</label>
      <button class="btn primary" type="button" data-a="alta">Continuar</button>
      <p class="msg" id="msg"></p>
      <button class="btn ghost small" type="button" data-a="out">Salir</button>`);
    $('#a-menor').onchange = e => { $('#a-fam-l').hidden = !e.target.checked; };
  }
  actions.alta = async () => {
    const nombre = $('#a-nombre').value.trim(), menor = $('#a-menor').checked, m = $('#msg');
    const err = t => { m.className = 'msg err'; m.textContent = t; };
    if (!nombre) return err('Escribe tu nombre.');
    if (!$('#a-ok').checked) return err('Marca que has leído la información.');
    if (menor && !$('#a-fam').checked) return err('Si eres menor de edad, tu familia tiene que firmar la hoja de consentimiento.');
    await B.set('jugadoras/' + me.uid, { nombre, equipo: EQ, menor, email: me.email || '', acepta: { ts: Date.now(), v: INFO_V }, ts: Date.now() });
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
  const ICON = {
    hoy: '<path d="M4 11.5 12 4.5l8 7V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    semana: '<path d="M6 4h9.5A2.5 2.5 0 0 1 18 6.5V20H8.5A2.5 2.5 0 0 1 6 17.5z"/><path d="M6 17.5A2.5 2.5 0 0 1 8.5 15H18"/><path d="M10 8h4"/>',
    yo: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.4-3.7 4.2-5.6 7.5-5.6s6.1 1.9 7.5 5.6"/>',
    datos: '<path d="M12 3.5 19 6v5.3c0 4.4-2.9 7.6-7 9.2-4.1-1.6-7-4.8-7-9.2V6z"/><path d="m9 12 2 2 4-4"/>',
    resumen: '<circle cx="9" cy="9" r="3.2"/><circle cx="16.5" cy="10" r="2.6"/><path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6M14.2 15.2c.7-.4 1.5-.6 2.3-.6 2 0 3.5 1.3 4.1 3.6"/>',
    equipo: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    partidos: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4.5 9.5h15M4.5 14.5h15"/>',
    reto: '<path d="M7 8h10a5 5 0 0 1 0 10c-1.6 0-2.4-1-3.2-2h-3.6c-.8 1-1.6 2-3.2 2A5 5 0 0 1 7 8z"/><path d="M8 11v4M6 13h4"/><circle cx="15.5" cy="12" r=".9"/><circle cx="17.5" cy="14.3" r=".9"/>',
    buzon: '<path d="M4 13.5 6.6 5.2A1 1 0 0 1 7.5 4.5h9a1 1 0 0 1 .9.7l2.6 8.3V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13.5h4.6l1.3 2.6h4.2l1.3-2.6H20"/>',
    acceso: '<circle cx="10" cy="8.5" r="3.6"/><path d="M3.5 20c1.2-3.4 3.6-5.2 6.5-5.2 1.6 0 3 .5 4.1 1.5M17.5 13.5v6M14.5 16.5h6"/>',
  };
  const ico = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ''}</svg>`;
  const navJ = () => `<nav class="nav" aria-label="Secciones">${[['hoy', 'Hoy'], ['partidos', 'Partidos'], ['reto', 'Reto'], ['semana', 'Diario'], ['yo', 'Mi jugadora']].map(([k, l]) => `<button type="button" data-v="${k}" aria-current="${view === k || (view === 'partido' && k === 'partidos') || (view === 'datos' && k === 'yo') ? 'page' : 'false'}">${ico(k)}${l}</button>`).join('')}</nav>`;
  const calJ = () => calOf(U.equipo);
  const diaHoy = () => U.dias[today()] || {};
  const draft = { antes: {}, ses: { tipo: 'entreno', rpe: null, min: 90, nota: '' }, sem: null, showDia: false };

  function antesHTML() {
    const a = diaHoy().antes;
    if (a && !draft.editAntes) return `<section class="card done"><div class="card-h"><h2>Antes del entreno</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div>
      <div class="faces">${WELL.map(w => { const v = Math.round(diez(a[w.k], a)); return `<span class="mf">${face(Math.ceil(v / 2))}<b>${esc(w.s)}</b><small>${v} de 10</small></span>`; }).join('')}</div>${a.nota ? `<p class="nota-p">«${esc(a.nota)}»</p>${vistoTag('d:' + today())}` : ''}<button class="btn small" type="button" data-a="editantes">Cambiar</button></section>`;
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
  function despuesHTML(f) {
    const ayer = !!f && f !== today(), dia = ayer ? U.dias[f] || {} : diaHoy();
    const L = (dia.ses || []).map((z, i) => Object.assign({}, z, { i })).filter(z => !z.pid), d = draft.ses;
    const done = L.length ? `<ul class="list">${L.map(s => `<li class="li"><span><b>${esc((TIPOS.find(t => t.k === s.tipo) || TIPOS[0]).n)} · esfuerzo ${s.rpe} de 10 (${esc(RPE[s.rpe] || '')})</b><small>${s.min} min${s.nota ? ' · ' + esc(s.nota) : ''}</small></span><button class="btn ghost small" type="button" data-a="delses" data-i="${s.i}">Quitar</button></li>`).join('')}</ul>` : '';
    if (!L.length && !draft.openDesp && !ayer) return `<section class="card desp-mini"><div><h2>Después del entreno</h2><p class="sub">Cuando acabes: lo duro que ha sido y los minutos.</p></div><button class="btn primary" type="button" data-a="opendesp">Ya he entrenado</button></section>`;
    if (L.length && !draft.moreSes) return `<section class="card done"><div class="card-h"><h2>Después del entreno</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div>${done}${!(diaHoy().antes || {}).nota && L.some(z => z.nota) ? vistoTag('d:' + today()) : ''}<button class="btn small" type="button" data-a="moreses">Añadir otra sesión de hoy</button></section>`;
    const otro = d.otroMin || !MINS.includes(d.min);
    return `<section class="card" id="c-desp"><div class="card-h"><h2>${ayer ? 'El entreno de ayer' : 'Después del entreno'}</h2><span class="sub">${ayer ? esc(fmtDay(f)) : '¿Qué tal ha sido?'}</span></div>${done}
      <div class="seg" role="group" aria-label="Tipo">${TIPOS.map(t => `<button type="button" data-tipo="${t.k}" aria-pressed="${d.tipo === t.k}">${t.n}</button>`).join('')}</div>
      <div class="q"><div class="q-h"><span>¿Lo duro que ha sido?</span><small>del 1 al 10</small></div>${escalera(v => `data-rpe="${v}"`, d.rpe, v => ({ 10: 'Al límite', 7: 'Muy duro', 5: 'Duro', 4: 'Algo duro', 3: 'Normal', 2: 'Suave', 1: 'Muy suave' })[v])}</div>
      <div class="q"><div class="q-h"><span>Minutos</span></div><div class="seg" role="group" aria-label="Minutos">${MINS.map(m => `<button type="button" data-minc="${m}" aria-pressed="${!otro && d.min === m}">${m}</button>`).join('')}<button type="button" data-minc="otro" aria-pressed="${otro}">Otro</button></div>
        ${otro ? `<span class="stepper"><button type="button" data-min="-5" aria-label="5 minutos menos">−</button><output id="min-o">${d.min}</output><button type="button" data-min="5" aria-label="5 minutos más">+</button></span>` : ''}</div>
      <label class="field">¿Algo que contar? (opcional)<input type="text" id="s-nota" value="${esc(d.nota)}" maxlength="200" placeholder="Por ejemplo: me molestaba el tobillo"></label>
      <div class="row"><button class="btn primary" type="button" data-a="saveses">Guardar</button>${L.length || ayer ? '<button class="btn ghost" type="button" data-a="lessses">Cancelar</button>' : ''}</div></section>`;
  }
  // el después de ayer (26 oct, noche): contarlo hasta 24 h después sigue siendo fiable (Phibbs y otros, 2017)
  function ayerHTML() {
    const ay = addDays(today(), -1), d = U.dias[ay] || {};
    if (!entrena(calJ(), ay) || (d.ses || []).some(z => !z.pid)) return '';
    if (draft.sesFecha !== ay) return `<section class="card desp-mini"><div><h2>¿Y el entreno de ayer?</h2><p class="sub">No contaste el después. Todavía estás a tiempo.</p></div><button class="btn" type="button" data-a="ayerdesp">Contarlo</button></section>`;
    return despuesHTML(ay);
  }
  actions.ayerdesp = async () => { draft.sesFecha = addDays(today(), -1); draft.openDesp = false; draft.ses = { tipo: 'entreno', rpe: null, min: eqMin(), nota: '' }; render(); };
  function racha() { let n = 0, k = mondayOf(today()); if (!U.semanas[k]) k = addDays(k, -7); while (U.semanas[k]) { n++; k = addDays(k, -7); } return n; }
  // lo que escribió ella con esa clave (para enseñarlo junto a la respuesta de Carlos)
  function miTexto(k) {
    if (k[0] === 's') { const x = U.semanas[k.slice(2)] || {}; return x.mejor || compOf(x) || ''; }
    const d = U.dias[k.slice(2, 12)] || {};
    if (k[0] === 'p') { const pd = (d.partidos || {})[k.slice(13)] || {}; return pd.llevo || pd.mejor || pd.cambiar || (pd.pre || {}).objetivo || ''; }
    return (d.antes || {}).nota || ((d.ses || []).find(z => z.nota) || {}).nota || (d.diario || {}).mejor || '';
  }
  // «Carlos lo ha leído»: cuando la DT lo marca como leído sin escribir nada
  const VISTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12.5 4.5 4.5L20 6"/></svg>';
  const vistoTag = k => { const r = respOf(U.acceso, k); return r && !r.t ? `<span class="visto">${VISTO}Carlos lo ha leído</span>` : ''; };
  function respuestasHTML() {
    const R = Object.entries((U.acceso || {}).resp || {}).filter(([, v]) => v && v.t && Date.now() - (v.ts || 0) < 14 * 864e5).sort((a, b) => b[1].ts - a[1].ts).slice(0, 3);
    if (!R.length) return '';
    return `<section class="card msg-card"><h2>Carlos te ha contestado</h2>${R.map(([k, v]) => { const yo = miTexto(k); return `<div class="msg-it"><span class="kicker">${k[0] === 's' ? 'A tu diario de la semana del ' + esc(fmtShort(k.slice(2))) : k[0] === 'p' ? 'A tu partido del ' + esc(fmtDay(k.slice(2, 12))) : 'A lo que contaste el ' + esc(fmtDay(k.slice(2)))}</span>${yo ? `<p class="yo">Tú: «${esc(yo.length > 120 ? yo.slice(0, 117) + '…' : yo)}»</p>` : ''}<p>${esc(v.t)}</p></div>`; }).join('')}</section>`;
  }
  // el diario es de cada día desde el 27 oct (antes era semanal): registros/{uid}/dias/{fecha}.diario = {tiempo, mejor, cambiar, como, ts}
  // el compromiso sigue siendo de la semana: registros/{uid}/semanas/{lunes} = {compromiso, area, cumplida (la de la semana anterior), ts}
  function semanaMini() {
    const x = diaHoy().diario;
    if (x) return `<section class="card done"><div class="card-h"><h2>Tu diario de hoy</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div><p class="sub dia-l">${wx(x.tiempo)}${esc(x.mejor || '')}</p></section>`;
    return `<section class="card"><div class="card-h"><h2>Tu diario de hoy</h2><span class="sub">1 minuto</span></div><p class="sub">Tu día de hockey: qué tal, lo mejor y lo que cambiarías.</p><button class="btn primary" type="button" data-a="gosemana">Escribir mi diario</button></section>`;
  }
  function rachaDia() { let n = 0, k = today(); if (!(U.dias[k] || {}).diario) k = addDays(k, -1); while ((U.dias[k] || {}).diario) { n++; k = addDays(k, -1); } return n; }
  const IC_MEJOR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';
  const IC_RINCON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>';
  const IC_CAMB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>';
  const IC_COMO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>';
  function diarioView() {
    const t = today(), lunes = mondayOf(t), hoyD = (U.dias[t] || {}).diario, edit = !hoyD || draft.editDia;
    if (edit && (!draft.dia || draft.dia.f !== t)) draft.dia = Object.assign({ tiempo: 0, mejor: '', rincon: '', cambiar: '', como: '' }, hoyD ? clone(hoyD) : {}, { f: t });
    const d = edit ? draft.dia : hoyD, r = rachaDia(), ver = draft.verDia && draft.verDia !== t ? draft.verDia : null;
    // la semana en una tira: el tiempo de cada día
    const tira = `<div class="dsem" role="group" aria-label="Tu semana">${[0, 1, 2, 3, 4, 5, 6].map(i => { const k = addDays(lunes, i), x = (U.dias[k] || {}).diario, fut = k > t;
      return `<button type="button" class="dsd${k === t ? ' hoy' : ''}${x ? ' ok' : ''}${fut ? ' fut' : ''}${k === (ver || t) ? ' sel' : ''}" data-verdia="${k}"${fut ? ' disabled' : ''} aria-label="${esc(fmtDay(k))}${x ? ': ' + TIEMPO[(x.tiempo || 3) - 1][1] : ''}"><small>${DOW.find(z => z[0] === dateOf(k).getDay())[1]}</small><span class="dsd-i">${x ? wx(x.tiempo) : k === t ? '<i class="dot"></i>' : ''}</span><b>${dateOf(k).getDate()}</b></button>`; }).join('')}</div>`;
    const ln = (ic, tit, v) => v ? `<div class="dl-r"><i>${ic}</i><span><b>${tit}</b>${esc(v)}</span></div>` : '';
    const entrada = (k, x) => `<article class="dentry"><div class="de-h"><span class="de-wx">${wx(x.tiempo)}</span><span><b>${esc(k === t ? 'Hoy' : fmtDay(k))}</b><small>${esc(TIEMPO[(x.tiempo || 3) - 1][1])}</small></span></div>
      ${ln(IC_MEJOR, 'Lo mejor', x.mejor)}${ln(IC_RINCON, 'Mi rincón', x.rincon)}${ln(IC_CAMB, 'Cambiaría', x.cambiar)}${ln(IC_COMO, 'Cómo lo voy a hacer', x.como)}
      ${(rr => rr && rr.t ? `<div class="de-resp"><span class="kicker">Carlos te ha contestado</span><p>${esc(rr.t)}</p></div>` : '')(respOf(U.acceso, 'd:' + k))}${vistoTag('d:' + k)}</article>`;
    const fld = (id, ic, tit, ph, val) => `<label class="dfield"><span class="df-h"><i>${ic}</i>${tit}</span><textarea id="${id}" rows="2" maxlength="300" placeholder="${ph}">${esc(val)}</textarea></label>`;
    const form = `<section class="card dform"><div class="card-h"><h2>¿Qué tal hoy en el hockey?</h2><span class="sub">${esc(fmtDay(t))}</span></div>
        <p class="sub d-tip">Es tu diario de hockey: el entreno, el partido, cómo te has sentido en la pista o algo del juego que hayas visto o pensado. ${entrena(calJ(), t) || partDe(calJ(), t).length ? '' : 'Si hoy no hay entreno, piensa en el último o en el próximo.'}</p>
        <div class="wxs dk" role="group" aria-label="Qué tal hoy en el hockey">${TIEMPO.map(([v, l]) => `<button type="button" class="wx" data-tiempo="${v}" aria-pressed="${d.tiempo === v}" aria-label="${l}">${wx(v)}</button>`).join('')}</div>
        <span class="wx-l">${d.tiempo ? esc(TIEMPO[d.tiempo - 1][1]) : 'De tormenta a sol: elige uno'}</span>
        ${fld('d-mejor', IC_MEJOR, 'Lo mejor', 'Una acción, una decisión, algo que te salió…', d.mejor || '')}
        <label class="dfield rincon"><span class="df-h"><i>${IC_RINCON}</i>Mi rincón</span><small class="df-s">Lo que no ha ido bien o te ronda la cabeza. Opcional. Solo lo lee Carlos.</small><textarea id="d-rincon" rows="2" maxlength="500" placeholder="Algo que no te salió, algo que te frustró o te preocupa…">${esc(d.rincon || '')}</textarea></label>
        ${fld('d-cambiar', IC_CAMB, 'Lo que cambiaría', 'Algo de tu juego que harías distinto (opcional)', d.cambiar || '')}
        ${fld('d-como', IC_COMO, 'Cómo lo voy a hacer', 'Qué vas a probar en el próximo entreno (opcional)', d.como || '')}
        <div class="row"><button class="btn primary big grow" type="button" data-a="savedia">Guardar mi diario</button>${hoyD ? '<button class="btn ghost" type="button" data-a="noeditdia">Cancelar</button>' : ''}</div><p class="msg" id="msg"></p></section>`;
    // compromiso de la semana (opcional) y si se cumplió el de la anterior
    const prevK = addDays(lunes, -7), cs = U.semanas[lunes], cp = U.semanas[prevK], editC = !compOf(cs) || draft.editSem;
    if (editC && (!draft.sem || draft.sem.lunes !== lunes)) draft.sem = Object.assign({ compromiso: '', area: '', cumplida: '' }, cs ? clone(cs) : {}, { lunes });
    const c = editC ? draft.sem : cs;
    const pledge = `<section class="pledge"><div class="row between"><span class="pl-h">Esta semana me comprometo a…</span>${!editC && c.area ? `<span class="tag">${esc(c.area)}</span>` : ''}</div>
      ${compOf(cp) ? `<div class="pl-prev"><span>La semana pasada: «${esc(compOf(cp))}»</span>${editC ? `<div class="row tight">${META_OK.map(([v, l]) => `<button type="button" class="mini" data-cumplida="${v}" aria-pressed="${c.cumplida === v}">${l}</button>`).join('')}</div>` : c.cumplida ? `<span class="stamp ${c.cumplida}">${esc(STAMP[c.cumplida])}</span>` : ''}</div>` : ''}
      ${editC ? `<input type="text" id="d-comp" class="pl-in" maxlength="140" value="${esc(compOf(c))}" placeholder="algo concreto que dependa de ti" aria-label="Esta semana me comprometo a">
        <div class="seg dark" role="group" aria-label="De qué va">${AREAS.map(a => `<button type="button" data-area="${a}" aria-pressed="${c.area === a}">${a}</button>`).join('')}</div>
        <div class="row"><button class="btn small" type="button" data-a="savesem">Guardar compromiso</button>${compOf(cs) ? '<button class="btn small ghost dk" type="button" data-a="noeditsem">Cancelar</button>' : ''}</div><p class="msg" id="msg-c"></p>`
      : `<p class="pl-t">${esc(compOf(c))}</p><button class="btn small ghost dk" type="button" data-a="editsem">Cambiar</button>`}
      ${(rr => rr && rr.t ? `<p class="pl-resp"><b>Carlos:</b> ${esc(rr.t)}</p>` : '')(respOf(U.acceso, 's:' + lunes))}</section>`;
    const hist = Object.keys(U.dias).filter(k => k < t && (U.dias[k] || {}).diario).sort().reverse().slice(0, draft.diaMas ? 60 : 7);
    const nHist = Object.keys(U.dias).filter(k => k < t && (U.dias[k] || {}).diario).length;
    const hoyBloque = ver ? ((U.dias[ver] || {}).diario ? entrada(ver, U.dias[ver].diario) : `<section class="card"><p class="sub">El ${esc(fmtDay(ver))} no escribiste.</p></section>`) + '<button class="btn ghost small" type="button" data-verdia="' + t + '">Volver a hoy</button>'
      : edit ? form : entrada(t, hoyD) + '<button class="btn small" type="button" data-a="editdia">Cambiar lo de hoy</button>';
    shell(`<section class="diary-hero"><div class="row between"><span class="kicker">Mi diario</span>${r > 1 ? `<span class="sm">${r} días seguidos</span>` : ''}</div>
        <h1>${hoyD ? 'Hoy ya has escrito' : 'Tu día de hockey'}</h1>${tira}</section>
      ${hoyBloque}
      ${pledge}
      ${hist.length && !ver ? `<div class="row between"><span class="kicker">Días anteriores</span><span class="sub">${nHist} ${nHist === 1 ? 'día' : 'días'}</span></div><div class="dentries">${hist.map(k => entrada(k, U.dias[k].diario)).join('')}</div>${nHist > 7 && !draft.diaMas ? '<button class="btn ghost" type="button" data-a="diamas">Ver todos</button>' : ''}` : ''}`, { nav: navJ() });
  }
  // ================= partidos: un antes y un después (25 oct) =================
  // antes (unos 40 s): cómo llegan (las cinco de siempre si ese día no las han contestado), ganas, nervios, confianza,
  // cómo creen que irá, qué les importa más y en qué se van a fijar. Después: si han jugado y minutos, esfuerzo,
  // cómo se han visto, disfrute, si han conseguido lo que se propusieron, cómo se sienten (hasta tres) y tres preguntas abiertas.
  // ================= partidos en tarjetas (25 oct): entradas para los próximos, marcadores para los jugados y cromos para lo que contó cada una =================
  const DIAS3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const catCls = c => ({ 'Sub-15': 'c15', 'Sub-17': 'c17', '1ª Autonómica': 'caf' })[c] || 'cot';
  // res siempre con el SMB primero
  const resOf = x => { const m = /^(\d+)\s*-\s*(\d+)$/.exec((x && x.res) || ''); if (!m) return null; const a = +m[1], b = +m[2]; return { a, b, k: a > b ? 'g' : a < b ? 'p' : 'e', l: a > b ? 'Ganado' : a < b ? 'Perdido' : 'Empate' }; };
  const IC_CASA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/></svg>';
  const IC_FUERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 7l5 5-5 5"/></svg>';
  const CUMPL_SELLO = { si: 'Conseguido', medias: 'A medias', no: 'No conseguido' };
  function ticketHTML(x, extra = '', attrs = '') {
    const d = dateOf(x.fecha), tag = attrs ? 'button' : 'article';
    return `<${tag} class="tkt ${catCls(x.cat)}"${attrs ? ` type="button" ${attrs}` : ''}>
      <span class="tkt-d"><small>${DIAS3[d.getDay()]}</small><b>${d.getDate()}</b><small>${MESES[d.getMonth()]}</small></span>
      <span class="tkt-b"><span class="cat">${esc(x.cat)}${x.j ? ' · jornada ' + x.j : ''}</span><b class="riv">${esc(x.rival)}</b>
        <span class="meta">${x.casa ? IC_CASA + 'En casa' : IC_FUERA + 'Fuera'} · ${esc(x.hora || 'hora por confirmar')}</span>${extra}</span></${tag}>`;
  }
  function marcadorHTML(x, n) {
    const r = resOf(x), d = dateOf(x.fecha);
    return `<button type="button" class="mrc ${catCls(x.cat)}" data-part="${x.id}"><span class="top"><span>${esc(x.cat)}</span><span>${d.getDate()} ${MESES[d.getMonth()]}</span></span>
      <b class="sc">${r ? `${r.a}<i>–</i>${r.b}` : '—'}</b><span class="riv">${esc(x.rival)}<small>${x.casa ? 'en casa' : 'fuera'}</small></span>
      <span class="ft">${r ? `<span class="res ${r.k}">${r.l}</span>` : '<span class="res">Sin resultado</span>'}<span>${n} ${n === 1 ? 'cuenta' : 'cuentan'}</span></span></button>`;
  }
  // cromo: un partido tal y como lo vivió una jugadora (who: 'yo' en su app, 'dt' en la ficha)
  function cromoHTML(k, id, pd, x, who) {
    const r = resOf(x), d = dateOf(k), yo = who === 'yo' || who === 'yo-btn', dt = who === 'dt', tag = dt || who === 'yo-btn' ? 'button' : 'article';
    const num = (v, l) => `<span class="cn"><b>${v ?? '—'}</b><small>${l}</small></span>`, q = pd.llevo || (pd.pre && pd.pre.objetivo);
    return `<${tag} class="cromo ${catCls(pd.cat)}"${dt ? ` type="button" data-part="${id}"` : who === 'yo-btn' ? ` type="button" data-pp="${id}"` : ''}>
      <span class="cr-top"><span>${esc(pd.cat)}</span><span>${d.getDate()} ${MESES[d.getMonth()]}</span></span>
      <span class="cr-b"><b class="riv">${esc(pd.rival)}</b>${r ? `<span class="res ${r.k}">${r.l} ${r.a}–${r.b}</span>` : ''}
        ${pd.juega === 'si' ? `<span class="cnums">${num(pd.min, 'minutos')}${num(pd.visto, yo ? 'te viste' : 'se vio')}${num(pd.disfrute, yo ? 'disfrute' : 'disfrute')}</span>`
          : pd.juega ? `<span class="cr-s">Convocada, sin jugar${pd.disfrute ? ` · disfrute ${pd.disfrute}` : ''}</span>` : `<span class="cr-s">Solo ${yo ? 'contaste' : 'contó'} el antes</span>`}
        ${emoHTML(pd.emociones)}${q ? `<span class="cr-q">«${esc(q)}»</span>` : ''}
        ${pd.cumplido ? `<span class="stamp ${pd.cumplido}">${CUMPL_SELLO[pd.cumplido] || ''}</span>` : ''}</span></${tag}>`;
  }
  const misPartidos = D => { const L = []; Object.keys(D).sort().reverse().forEach(k => Object.entries(D[k].partidos || {}).forEach(([id, pd]) => L.push([k, id, pd]))); return L; };
  const partLinea = (pd, visto, disf) => [pd.juega === 'si' ? `${pd.min} min · esfuerzo ${pd.rpe} · ${visto} ${pd.visto}` : pd.juega ? 'convocada, sin jugar' : 'solo el antes', pd.disfrute ? `${disf} ${pd.disfrute}` : ''].filter(Boolean).join(' · ');
  const pdOf = x => pdAt(U.dias, x).pd || undefined;
  const partById = id => allPart(calJ()).find(y => y.id === id);
  const emoHTML = L => (L || []).length ? `<span class="emos">${L.map(e => `<span class="emo${EMOC_MAL.includes(e) ? ' low' : ''}">${esc(e)}</span>`).join('')}</span>` : '';
  function mfSteps(f) {
    const v = f.vals, S = [], lad = (k, q, o, sub) => S.push({ k, t: 'ladder', q, lab: L10(o), sub });
    if (f.kind === 'pre') {
      if (f.well) WELL.forEach(w => S.push({ k: w.k, t: 'ladder', q: w.q, lab: n => ANCLA[n] != null ? w.o[ANCLA[n]] : '' }));
      lad('ganas', '¿Con cuántas ganas llegas al partido?', ['Ninguna', 'Pocas', 'Normal', 'Muchas', 'Muchísimas']);
      lad('nervios', '¿Cómo de nerviosa estás?', ['Nada', 'Poco', 'Algo', 'Bastante', 'Muchísimo'], 'Estar nerviosa no es malo: es para saber cómo llegas.');
      lad('confianza', '¿Cuánta confianza tienes hoy en ti?', ['Ninguna', 'Poca', 'Normal', 'Mucha', 'Total']);
      S.push({ k: 'espera', t: 'one', q: '¿Cómo crees que va a ir el partido?', o: ESPERA });
      S.push({ k: 'importa', t: 'one', q: '¿Qué es lo que más te importa hoy?', o: IMPORTA, sub: 'Elige solo una.' });
      S.push({ k: 'objetivo', t: 'text', q: '¿En qué te vas a fijar tú en este partido?', sub: 'Algo concreto que dependa de ti. Después del partido te preguntaremos si lo has conseguido.', ph: 'Por ejemplo: pedir la bola siempre que esté libre' });
    } else {
      const jug = v.juega !== 'conv';
      S.push({ k: 'juega', t: 'one', q: '¿Has jugado?', o: PJUEGA });
      if (jug) { S.push({ k: 'min', t: 'min', q: '¿Cuántos minutos has jugado, más o menos?' });
        lad('rpe', '¿Lo duro que ha sido?', ['Muy suave', 'Normal', 'Duro', 'Muy duro', 'Al límite']);
        lad('visto', '¿Cómo te has visto?', ['Mal', 'Regular', 'Normal', 'Bien', 'Genial']); }
      lad('disfrute', '¿Cuánto has disfrutado?', ['Nada', 'Poco', 'Normal', 'Mucho', 'Muchísimo']);
      if (jug && f.obj) S.push({ k: 'cumplido', t: 'one', q: '¿Lo has conseguido?', quote: f.obj, o: CUMPLIDO });
      S.push({ k: 'emociones', t: 'multi', q: '¿Cómo te sientes ahora?', o: EMOC, max: 3 });
      S.push({ k: 'textos', t: 'texts', q: 'Para acabar', f: jug ? [['mejor', 'La decisión que mejor te salió', 'Por ejemplo: presionar al pase atrás en el segundo tiempo'], ['cambiar', 'Una que cambiarías', 'Por ejemplo: tirar antes en el 2 contra 1'], ['llevo', '¿Qué te llevas de este partido?', 'Algo que hayas aprendido, visto o sentido']] : [['llevo', '¿Qué te llevas de este partido?', 'Algo que hayas aprendido, visto o sentido']] });
    }
    return S;
  }
  function mfView() {
    const f = draft.mf, S = mfSteps(f), N = S.length, i = f.i = Math.min(f.i, N - 1), s = S[i], v = f.vals, x = partById(f.id) || {};
    const pre = f.kind === 'pre', kick = `${pre ? 'Antes del partido' : 'Después del partido'} · ${i + 1} de ${N}`;
    let body;
    if (s.t === 'ladder') body = `${escalera(n => `data-mf="${s.k}" data-v="${n}"`, v[s.k], s.lab)}<p class="sub center">${s.sub ? esc(s.sub) + ' ' : ''}Del 1 al 10. Al tocar, pasa sola a la siguiente.</p>`;
    else if (s.t === 'one') body = `${s.quote ? `<p class="nota-p">Te propusiste: «${esc(s.quote)}»</p>` : ''}<div class="opts">${s.o.map(([k, l]) => `<button type="button" class="opt" data-mf="${s.k}" data-v="${k}" aria-pressed="${v[s.k] === k}">${esc(l)}</button>`).join('')}</div>${s.sub ? `<p class="sub center">${esc(s.sub)}</p>` : ''}`;
    else if (s.t === 'min') body = `<div class="opts four">${PMINS.map(m => `<button type="button" class="opt" data-mf="min" data-v="${m}" aria-pressed="${v.min === m}">${m}</button>`).join('')}</div><p class="sub center">Elige lo más parecido.</p>`;
    else if (s.t === 'multi') { const sel = v[s.k] || []; body = `<div class="opts chips">${s.o.map(e => `<button type="button" class="opt" data-mm="${s.k}" data-v="${esc(e)}" aria-pressed="${sel.includes(e)}">${esc(e)}</button>`).join('')}</div><p class="sub center">Elige hasta ${s.max}.</p><button class="btn primary big" type="button" data-a="mfnext">Siguiente</button>`; }
    else if (s.t === 'text') body = `<p class="sub">${esc(s.sub)}</p><textarea class="nota-in" id="mf-${s.k}" maxlength="300" rows="4" placeholder="${esc(s.ph)}" aria-label="${esc(s.q)}">${esc(v[s.k] || '')}</textarea><button class="btn primary big" type="button" data-a="mfsave">Guardar</button><p class="sub center">Si no quieres escribir nada, pulsa Guardar igualmente.</p>`;
    else body = `${s.f.map(([k, l, ph]) => `<label class="field">${esc(l)}<textarea class="nota-in sm" id="mf-${k}" maxlength="300" rows="2" placeholder="${esc(ph)}">${esc(v[k] || '')}</textarea></label>`).join('')}<button class="btn primary big" type="button" data-a="mfsave">Guardar</button><p class="sub center">Son opcionales. Solo lo lee Carlos.</p>`;
    root.innerHTML = `<div class="flow"><header class="flow-top"><button class="btn ghost small" type="button" data-a="mfback"${i ? '' : ' style="visibility:hidden"'}>Atrás</button>
        <div class="dots" role="img" aria-label="Paso ${i + 1} de ${N}">${S.map((_, k) => `<span${k <= i ? ' class="on"' : ''}></span>`).join('')}</div>
        <button class="btn ghost small" type="button" data-a="mfclose">Cerrar</button></header>
      <main class="wrap flow-in"><div><span class="kicker">${esc(kick)}</span><p class="flow-m">${esc(x.cat || '')} · ${esc(x.rival || '')}</p><h1 class="flow-q">${esc(s.q)}</h1></div>${body}</main></div>`;
  }
  const keepMf = () => { if (!draft.mf) return; root.querySelectorAll('textarea[id^="mf-"]').forEach(el => { draft.mf.vals[el.id.slice(3)] = el.value; }); };
  function startMf(kind, id) {
    const x = partById(id); if (!x) return;
    if (!(draft.mf && draft.mf.id === id && draft.mf.kind === kind)) {
      const D = U.dias[pdAt(U.dias, x).k] || {}, pd = (D.partidos || {})[id] || {};
      draft.mf = { kind, id, fecha: pdAt(U.dias, x).k, i: 0, vals: clone(kind === 'pre' ? pd.pre || {} : pd.juega ? pd : {}), well: kind === 'pre' && !D.antes, obj: (pd.pre || {}).objetivo || '', back: view === 'partido' ? 'partido' : 'hoy' };
    }
    view = 'mflow'; render(); scrollTo({ top: 0 });
  }
  actions.prepart = async b => startMf('pre', b.dataset.id);
  // el después del partido se abre al acabar (27 oct): a la hora del partido más 75 min (dos partes de 25 min, paradas y descanso).
  // Si no se sabe la hora, se abre todo el día; los partidos pasados, siempre.
  const POST_MIN = 75;
  function postAbre(x) {
    const t = today(); if (!x || x.fecha < t) return 0; if (x.fecha > t) return Infinity;
    const m = /^(\d{1,2})[:.](\d{2})/.exec(x.hora || ''); if (!m) return 0;
    const d = dateOf(x.fecha); d.setHours(+m[1], +m[2] + POST_MIN, 0, 0); return d.getTime();
  }
  const postListo = x => Date.now() >= postAbre(x);
  const postHora = x => { const d = new Date(postAbre(x)); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const postCerradoHTML = x => `<p class="post-wait">${ric('reloj')}El después se abre al acabar el partido, a las ${postHora(x)}.</p>`;
  actions.postpart = async b => { const x = partById(b.dataset.id); if (x && !(pdOf(x) || {}).juega && !postListo(x)) { toast(postAbre(x) === Infinity ? 'Podrás contarlo cuando se haya jugado.' : `Podrás contarlo a partir de las ${postHora(x)}, al acabar el partido.`); return; } startMf('post', b.dataset.id); };
  actions.mfnext = async () => { keepMf(); const n = mfSteps(draft.mf).length; if (draft.mf.i < n - 1) draft.mf.i++; render(); scrollTo({ top: 0 }); };
  actions.mfback = async () => { keepMf(); if (draft.mf.i > 0) { draft.mf.i--; render(); } else actions.mfclose(); };
  actions.mfclose = async () => { keepMf(); view = (draft.mf && draft.mf.back) || 'hoy'; render(); scrollTo({ top: 0 }); };
  actions.mfsave = async () => {
    keepMf(); const f = draft.mf, S = mfSteps(f), v = f.vals;
    const miss = S.findIndex(s => ['ladder', 'one', 'min'].includes(s.t) && (v[s.k] == null || v[s.k] === ''));
    if (miss >= 0) { f.i = miss; render(); toast('Te falta esta.'); return; }
    const x = partById(f.id) || {}, D = U.dias[f.fecha] || {}, old = (D.partidos || {})[f.id] || {}, tx = k => String(v[k] || '').trim(), p0 = puntos(U.dias, U.semanas), now = Date.now();
    const upd = { ts: now }, base = { cat: x.cat || old.cat || '', rival: x.rival || old.rival || '' }; let pd;
    if (f.kind === 'pre') {
      pd = Object.assign({}, old, base, { pre: { ganas: v.ganas, nervios: v.nervios, confianza: v.confianza, espera: v.espera, importa: v.importa, objetivo: tx('objetivo'), ts: now } });
      if (f.well) { upd.antes = { esc: 10, nota: '', ts: now }; WELL.forEach(w => { upd.antes[w.k] = v[w.k]; }); }
    } else {
      const jug = v.juega === 'si';
      pd = Object.assign({}, old, base, { juega: v.juega, min: jug ? v.min : 0, rpe: jug ? v.rpe : null, visto: jug ? v.visto : null, disfrute: v.disfrute, cumplido: jug && f.obj ? v.cumplido : '',
        emociones: (v.emociones || []).slice(0, 3), mejor: jug ? tx('mejor') : '', cambiar: jug ? tx('cambiar') : '', llevo: tx('llevo'), ts: now });
      // la carga del partido va con las demás sesiones del día (una por partido)
      const ses = (D.ses || []).filter(z => z.pid !== f.id); if (jug && pd.min > 0) ses.push({ tipo: 'partido', rpe: pd.rpe, min: pd.min, nota: '', pid: f.id, ts: now }); upd.ses = ses;
    }
    upd.partidos = Object.assign({}, D.partidos || {}, { [f.id]: pd });
    await B.merge(`registros/${me.uid}/dias/${f.fecha}`, upd);
    U.dias[f.fecha] = Object.assign({}, D, upd); view = f.back || 'hoy'; draft.mf = null; premio(p0); render(); scrollTo({ top: 0 });
  };
  function partidoHTML(x) {
    const pd = pdOf(x) || {}, pre = pd.pre, hoy = x.fecha === today(), id = x.id;
    const head = st => `<div class="card-h"><h2>Partido · ${esc(x.cat)}</h2>${st}</div><p class="part-l"><b>${esc(x.rival)}</b> · ${x.casa ? 'en casa' : 'fuera'}${x.hora ? ' · ' + esc(x.hora) : ''}${hoy ? '' : ' · ' + esc(fmtDay(x.fecha))}</p>`;
    if (pd.juega) return `<section class="card done part-card">${head(stHTML('ok').replace('Bien', 'Contado'))}
      <p class="sub">${pd.juega === 'si' ? `${pd.min} min · esfuerzo ${pd.rpe} · te viste ${pd.visto} de 10` : 'Convocada, sin jugar'}${pd.disfrute ? ` · disfrutaste ${pd.disfrute} de 10` : ''}</p>${emoHTML(pd.emociones)}
      ${pd.llevo || pd.mejor ? `<p class="nota-p">«${esc(pd.llevo || pd.mejor)}»</p>` : ''}<button class="btn small" type="button" data-a="postpart" data-id="${id}">Cambiar</button></section>`;
    if (pre) return `<section class="card part-card">${head('<span class="sub">Antes: hecho</span>')}
      <div class="pre-sum"><span>Ganas<b>${pre.ganas}</b></span><span>Nervios<b>${pre.nervios}</b></span><span>Confianza<b>${pre.confianza}</b></span></div>
      ${pre.objetivo ? `<p class="nota-p">Te vas a fijar en: «${esc(pre.objetivo)}»</p>` : ''}${postListo(x) ? '<p class="sub">Cuéntanos cómo lo has vivido. Un minuto.</p>' : postCerradoHTML(x)}
      <div class="row">${postListo(x) ? `<button class="btn primary" type="button" data-a="postpart" data-id="${id}">Contar el partido</button>` : ''}<button class="btn ghost small" type="button" data-a="prepart" data-id="${id}">Cambiar lo de antes</button></div></section>`;
    if (!hoy) return `<section class="card part-card">${head('<span class="sub">Un minuto</span>')}<p>¿Qué tal fue? Cuéntanos cómo lo viviste.</p>
      <div class="row"><button class="btn primary" type="button" data-a="postpart" data-id="${id}">Contar el partido</button><button class="btn ghost" type="button" data-a="nojuego" data-id="${id}">No jugué</button></div></section>`;
    const seguir = draft.mf && draft.mf.id === id && draft.mf.kind === 'pre';
    return `<section class="card part-card">${head('<span class="sub">40 segundos</span>')}<p>Antes de calentar: cómo llegas, con qué ganas y en qué te vas a fijar.</p>
      <button class="btn primary big" type="button" data-a="prepart" data-id="${id}">${seguir ? 'Seguir' : 'Antes del partido'}</button>
      <div class="row">${postListo(x) ? `<button class="btn ghost small" type="button" data-a="postpart" data-id="${id}">Ya ha terminado: contarlo</button>` : ''}<button class="btn ghost small" type="button" data-a="nojuego" data-id="${id}">No juego</button></div></section>`;
  }
  const partVis = x => !ls.get(`smbf-nojuego-${me.uid}-${x.id}`) || pdOf(x);
  // hoy: los partidos de hoy; ayer: solo los que tienen el antes hecho y falta el después (se cuenta al día siguiente)
  function partidosHoyHTML() {
    const t = today(), ayer = partDe(calJ(), addDays(t, -1)).filter(x => { const pd = pdOf(x); return pd && pd.pre && !pd.juega; });
    return [...ayer, ...partDe(calJ(), t).filter(partVis)].map(partidoHTML).join('');
  }
  function proximoHTML() {
    const t = today(), n = allPart(calJ()).filter(x => x.fecha > t).slice(0, 5);
    return n.length ? `<section class="strip"><div class="strip-h"><h2>Próximos partidos</h2>${n.length > 1 ? '<span class="sub">Desliza</span>' : ''}</div><div class="tkts">${n.map(x => ticketHTML(x, '', `data-pp="${x.id}"`)).join('')}</div></section>` : '';
  }

  actions.nojuego = async b => { ls.set(`smbf-nojuego-${me.uid}-${b.dataset.id}`, '1'); toast('Vale. Si al final juegas, apúntalo en «Después del entreno» como partido.'); render(); };
  // ================= partidos de la jugadora (25 oct): calendario y la página de cada partido =================
  // desde el calendario puede ir a cualquier partido y contar el antes (el mismo día) o el después (ese día o más tarde)
  const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const goPart = id => { draft.part = id; view = 'partido'; render(); scrollTo({ top: 0 }); };
  function estadoPartJ(x) {
    const t = today(), pd = pdOf(x) || {};
    if (pd.juega) return '<span class="pst-j ok">Contado</span>';
    if (x.fecha === t) return `<span class="pst-j now">${pd.pre ? (postListo(x) ? 'Antes hecho · falta el después' : 'Antes hecho · después a las ' + postHora(x)) : 'Hoy'}</span>`;
    if (x.fecha < t) return pd.pre ? '<span class="pst-j due">Falta el después</span>' : ls.get(`smbf-nojuego-${me.uid}-${x.id}`) ? '' : '<span class="pst-j">Sin contar</span>';
    const n = daysBetween(t, x.fecha); return `<span class="pst-j">${n === 1 ? 'Mañana' : 'En ' + n + ' días'}</span>`;
  }
  // calendario de un mes: días con partido marcados por categoría; done/due deciden el color del día
  function mesHTML(all, mes, cday, done, due) {
    const t = today(), [y, m] = mes.split('-').map(Number), P = all.filter(x => x.fecha.startsWith(mes));
    const first = new Date(y, m - 1, 1), off = (first.getDay() + 6) % 7, nd = new Date(y, m, 0).getDate();
    const sel = cday && cday.startsWith(mes) ? cday : ((P.find(x => x.fecha >= t) || P[P.length - 1] || {}).fecha || '');
    const cells = []; for (let i = 0; i < off; i++) cells.push('<span class="cd e"></span>');
    for (let d = 1; d <= nd; d++) { const k = `${mes}-${String(d).padStart(2, '0')}`, L = P.filter(x => x.fecha === k), ok = L.length && L.every(done), mal = L.some(due);
      cells.push(L.length ? `<button type="button" class="cd has${k === t ? ' hoy' : ''}${sel === k ? ' sel' : ''}${ok ? ' done' : ''}${mal ? ' due' : ''}" data-cday="${k}" aria-label="${esc(fmtDay(k))}: ${L.length} ${L.length === 1 ? 'partido' : 'partidos'}"><b>${d}</b><span class="dots">${L.map(x => `<i class="${catCls(x.cat)}"></i>`).join('')}</span></button>`
        : `<span class="cd${k === t ? ' hoy' : ''}"><b>${d}</b></span>`); }
    const mv = k => { const d = new Date(y, m - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
    return { sel, P, html: `<section class="card cal-c"><div class="cal-h"><button type="button" class="btn ghost small" data-pmes="${mv(-1)}" aria-label="Mes anterior">‹</button><h2>${MESES_L[m - 1]} ${y}</h2><button type="button" class="btn ghost small" data-pmes="${mv(1)}" aria-label="Mes siguiente">›</button></div>
      <div class="cal-g">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span class="cw">${d}</span>`).join('')}${cells.join('')}</div></section>` };
  }
  function partidosJView() {
    const t = today(), cat = ls.get('smbf-pcat') || 'todas', modo = ls.get('smbf-pmodo') || 'lista';
    const all = allPart(calJ()).filter(x => cat === 'todas' || x.cat === cat);
    const pend = all.filter(x => x.fecha < t && !(pdOf(x) || {}).juega && (pdOf(x) || {}).pre);
    const hoy = all.filter(x => x.fecha === t), fut = all.filter(x => x.fecha > t), pas = all.filter(x => x.fecha < t && !pend.includes(x)).reverse();
    const tk = (x, cls = '') => ticketHTML(x, estadoPartJ(x) + (resOf(x) ? `<span class="res ${resOf(x).k}">${resOf(x).l} ${resOf(x).a}–${resOf(x).b}</span>` : ''), `data-pp="${x.id}"`).replace('class="tkt ', `class="tkt ${cls} `);
    const sec = (tit, L, cls = '', extra = '') => L.length ? `<section class="strip"><div class="strip-h"><h2>${tit}</h2>${extra}</div><div class="tkts col${cls ? ' ' + cls : ''}">${L.map(x => tk(x)).join('')}</div></section>` : '';
    let cuerpo;
    if (modo === 'lista') {
      cuerpo = sec('Te falta contar', pend) + sec('Hoy', hoy) + sec('Próximos', fut.slice(0, draft.pmas ? 99 : 3), '', fut.length > 3 ? `<span class="sub">${fut.length} por jugar</span>` : '')
        + (fut.length > 3 && !draft.pmas ? '<button class="btn ghost" type="button" data-a="pmasj">Ver todos los próximos</button>' : '')
        + sec('Jugados', pas.slice(0, draft.pjmas ? 99 : 4), 'mini') + (pas.length > 4 && !draft.pjmas ? '<button class="btn ghost" type="button" data-a="pjmasj">Ver todos los jugados</button>' : '')
        + (!all.length ? '<p class="sub">No hay partidos.</p>' : '');
    } else {
      const { html: mesH, sel, P } = mesHTML(all, draft.mes || t.slice(0, 7), draft.cday, x => (pdOf(x) || {}).juega, x => pend.includes(x));
      const delDia = P.filter(x => x.fecha === sel);
      cuerpo = `${mesH}
        ${delDia.length ? `<div class="tkts col">${delDia.map(x => tk(x)).join('')}</div>` : `<p class="sub">${P.length ? 'Toca un día con partido.' : 'No hay partidos este mes.'}</p>`}`;
    }
    shell(`<div class="dt-h"><div><span class="kicker">Sección femenina</span><h1>Partidos</h1></div>
        <div class="seg etab" role="tablist">${[['lista', 'Lista'], ['cal', 'Calendario']].map(([k, l]) => `<button type="button" role="tab" data-pmodo="${k}" aria-pressed="${modo === k}" aria-selected="${modo === k}">${l}</button>`).join('')}</div></div>
      <div class="chips-cat" role="group" aria-label="Categoría">${[['todas', 'Todas'], ['Sub-15', 'Sub-15'], ['Sub-17', 'Sub-17'], ['1ª Autonómica', '1ª Aut.']].map(([k, l]) => `<button type="button" class="cc ${k === 'todas' ? '' : catCls(k)}" data-pcatj="${k}" aria-pressed="${cat === k}">${k === 'todas' ? '' : '<i></i>'}${l}</button>`).join('')}</div>
      ${cuerpo}
      <p class="sub">Calendario de la Federación Madrileña${PART_AT ? `, revisado el ${esc(fmtDay(PART_AT))}` : ''}.</p>`, { nav: navJ() });
  }
  actions.pmasj = async () => { draft.pmas = true; render(); };
  actions.pjmasj = async () => { draft.pjmas = true; render(); };
  function partidoJView() {
    const x = partById(draft.part); if (!x) { view = 'partidos'; return partidosJView(); }
    const t = today(), pd = pdOf(x) || {}, p = pd.pre, r = resOf(x), rsp = respOf(U.acceso, 'p:' + pdAt(U.dias, x).k + ':' + x.id), id = x.id;
    const preSum = p ? `<div class="pre-sum"><span>Ganas<b>${p.ganas}</b></span><span>Nervios<b>${p.nervios}</b></span><span>Confianza<b>${p.confianza}</b></span></div>
      <div class="rchips">${p.espera ? `<span class="rchip info">${esc(lbl(ESPERA, p.espera))}</span>` : ''}${p.importa ? `<span class="rchip info">Me importa: ${esc(lbl(IMPORTA, p.importa).toLowerCase())}</span>` : ''}</div>${p.objetivo ? `<p class="nota-p">Me fijo en: «${esc(p.objetivo)}»</p>` : ''}` : '';
    const pre = x.fecha > t ? `<section class="card"><h2>Antes del partido</h2><p class="sub">Lo podrás contestar el día del partido.</p></section>`
      : x.fecha === t ? `<section class="card"><div class="card-h"><h2>Antes del partido</h2>${p ? stHTML('ok').replace('Bien', 'Hecho') : '<span class="sub">40 segundos</span>'}</div>${p ? preSum + `<button class="btn small" type="button" data-a="prepart" data-id="${id}">Cambiar</button>` : `<button class="btn primary big" type="button" data-a="prepart" data-id="${id}">Empezar</button>`}</section>`
      : p ? `<section class="card"><h2>Antes del partido</h2>${preSum}</section>` : '';
    const post = x.fecha > t ? '' : pd.juega ? `<section class="strip"><div class="strip-h"><h2>Cómo lo viviste</h2><button class="btn ghost small" type="button" data-a="postpart" data-id="${id}">Cambiar</button></div><div class="cromos one">${cromoHTML(x.fecha, id, pd, x, 'yo')}</div>
        ${pd.mejor || pd.cambiar ? `<section class="card">${pd.mejor ? `<p class="dw-m"><span>La decisión que mejor me salió</span>${esc(pd.mejor)}</p>` : ''}${pd.cambiar ? `<p class="dw-m"><span>Una que cambiaría</span>${esc(pd.cambiar)}</p>` : ''}</section>` : ''}</section>`
      : !postListo(x) ? `<section class="card part-card"><div class="card-h"><h2>Después del partido</h2><span class="sub">Un minuto</span></div>${postCerradoHTML(x)}</section>`
      : `<section class="card part-card"><div class="card-h"><h2>Después del partido</h2><span class="sub">Un minuto</span></div><p>${x.fecha === t ? 'Ya ha acabado: cuéntanos cómo lo has vivido.' : '¿Qué tal fue? Cuéntanos cómo lo viviste.'}</p><button class="btn primary big" type="button" data-a="postpart" data-id="${id}">Contar el partido</button></section>`;
    shell(`<button class="btn ghost small back" type="button" data-v2="partidos">← Partidos</button>
      <div class="tkts col big">${ticketHTML(x, r ? `<span class="res ${r.k}">${r.l} ${r.a}–${r.b}</span>` : '')}</div>
      ${rsp && rsp.t ? `<section class="card msg-card"><span class="kicker">Carlos te ha contestado</span><p>${esc(rsp.t)}</p></section>` : rsp ? `<p>${vistoTag('p:' + pdAt(U.dias, x).k + ':' + x.id)}</p>` : ''}
      ${pre}${post}`, { nav: navJ() });
  }
  function hoyView() {
    const t = today(), dia = diaHoy(), vis = partDe(calJ(), t).filter(partVis), hayPart = vis.length > 0, ent = entrena(calJ(), t), cards = partidosHoyHTML();
    const show = ent || hayPart || draft.showDia || dia.antes || (dia.ses || []).length;
    const nombre = (U.perfil.nombre || '').split(' ')[0], p = puntos(U.dias, U.semanas), lv = nivelDe(p);
    const pHoy = vis[0], lineaHoy = pHoy ? `Hoy juegas · ${pHoy.cat} contra ${pHoy.rival}${pHoy.hora ? ', ' + pHoy.hora : ''}` : ent ? 'Hoy hay entreno. ¿Cómo llegas?' : 'Hoy no hay entreno. Descansa bien.';
    // día de partido: el «antes» del día va dentro del antes del partido (si ya está contestado, se enseña hecho)
    const antes = dia.antes || ent || !hayPart ? antesHTML() : '';   // el día de entreno sale siempre (también si hay partido: no todas juegan)
    shell(`<section class="hero"><div class="hi"><span class="kicker">${esc(fmtDay(t))}</span><h1>Hola, ${esc(nombre)}</h1><p class="today">${esc(lineaHoy)}</p></div>
        <button class="me-chip" type="button" data-v="yo" aria-label="Mi jugadora: nivel ${lv + 1}, ${p} puntos">${avatarSVG(U.perfil.av, lv)}<span><b>Nivel ${lv + 1}</b><small>${p} pts</small></span></button></section>
      ${respuestasHTML()}${retoAvisoHTML()}
      ${show ? antes + cards + (ent || draft.showDia || (dia.ses || []).some(z => !z.pid) ? despuesHTML() : '') : `${cards}<section class="card"><h2>Hoy no hay entreno</h2><p class="sub">Si has entrenado por tu cuenta, apúntalo.</p><button class="btn" type="button" data-a="showdia">Apuntar un entreno de hoy</button></section>`}
      ${ayerHTML()}${semanaMini()}${proximoHTML()}`, { nav: navJ() });
  }
  function yoView() {
    const t = today(), sem = Object.keys(U.semanas).sort().reverse().slice(0, 8);
    const p = puntos(U.dias, U.semanas), lv = nivelDe(p), next = NIVELES[lv + 1];
    const nuevos = next ? ITEMS.filter(x => x[3] === lv + 2).map(x => x[2]) : [];
    const pct = next ? Math.round((p - NIVELES[lv][1]) / (next[1] - NIVELES[lv][1]) * 100) : 100;
    if (draft.editAv) return editAvView(lv);
    shell(`<div class="dt-h"><div><span class="kicker">Lo tuyo</span><h1>Mi jugadora</h1></div><button class="btn small" type="button" data-v2="datos">${ico('datos')}Mis datos</button></div>
      <section class="card me-card"><div class="me-av">${avatarSVG(U.perfil.av, lv)}${mscH(yoJ().mascota, 'msc hero')}</div>
        <div class="me-info"><span class="kicker">Nivel ${lv + 1} de ${NIVELES.length}</span><b class="me-lv">${esc(NIVELES[lv][0])}</b>
          <div class="prog" role="img" aria-label="${pct} % hasta el siguiente nivel"><i style="width:${pct}%"></i></div>
          <span class="sub">${next ? `${p} de ${next[1]} puntos.${nuevos.length ? ` Próximo: ${esc(nuevos.join(', ').toLowerCase())}.` : ''}` : `${p} puntos. Has llegado arriba del todo.`}</span>
          <button class="btn small" type="button" data-a="editav">Cambiar mi jugadora</button></div></section>
      <section class="card"><h2>Cómo se ganan puntos</h2><ul class="pts">
        <li><span>Responder antes del entreno</span><b>+${PTS.antes}</b></li><li><span>Responder después</span><b>+${PTS.despues}</b></li><li><span>Antes y después de cada partido</span><b>+${PTS.partido} y +${PTS.partido}</b></li>
        <li><span>Escribir tu diario de la semana</span><b>+${PTS.semana}</b></li><li><span>Decir si cumpliste tu compromiso</span><b>+${PTS.revisar}</b></li></ul>
        <p class="sub">Da igual lo que contestes: puntúa responder, no las notas. Cada nivel desbloquea ropa, gafas, fondos o marcos.</p></section>
      <section class="card"><h2>Cómo llegas a los entrenos</h2><p class="sub">Media de tus cinco respuestas, del 1 al 10, en los últimos 28 días.${baseline(U.dias, t) != null ? ' La franja es lo normal en ti.' : ''}</p>${wellChart(U.dias, t)}</section>
      <section class="card"><h2>Tu carga por semana</h2><p class="sub">Esfuerzo × minutos de cada sesión, sumado por semana. La barra clara es la semana en curso.</p>${loadChart(U.dias, t)}</section>
      ${(L => L.length ? `<section class="strip"><div class="strip-h"><h2>Mis partidos</h2><span class="sub">${L.length === 1 ? '1 partido' : L.length + ' partidos'}</span></div><div class="cromos">${L.slice(0, 20).map(([k, id, pd]) => cromoHTML(k, id, pd, allPart(calJ()).find(y => y.id === id), 'yo-btn')).join('')}</div></section>` : '')(misPartidos(U.dias))}
      <section class="strip"><div class="strip-h"><h2>Tus compromisos</h2></div>${sem.length ? `<div class="notes">${sem.map(k => { const x = U.semanas[k], nx = U.semanas[addDays(k, 7)]; return `<div class="note"><span class="d">Semana del ${esc(fmtShort(k))}</span><span class="t">${esc(compOf(x) || '—')}</span>${nx && nx.cumplida ? `<span class="stamp ${nx.cumplida}">${esc(STAMP[nx.cumplida] || '')}</span>` : ''}</div>`; }).join('')}</div>` : '<p class="sub">Aquí saldrán los compromisos de tu diario.</p>'}</section>`, { nav: navJ() });
  }
  function editAvView(lv) {
    if (isAdmin()) lv = 9;
    const a = draft.av = draft.av || avNorm(isAdmin() ? miAv() : U.perfil.av, lv);
    const sw = (cat, list) => `<div class="swatches">${list.map(c => `<button type="button" class="sw" data-avk="${cat}" data-avv="${c}" aria-pressed="${a[cat] === c}" style="background:#${c}" aria-label="Color ${c}"></button>`).join('')}</div>`;
    const ch = (cat, list) => `<div class="seg">${list.map(([v, n]) => `<button type="button" data-avk="${cat}" data-avv="${v}" aria-pressed="${a[cat] === v}">${esc(n)}</button>`).join('')}</div>`;
    const it = cat => `<div class="seg">${ITEMS.filter(x => x[0] === cat).map(([, v, n, l]) => l <= lv + 1 ? `<button type="button" data-avk="${cat}" data-avv="${v}" aria-pressed="${a[cat] === v}">${esc(n)}</button>` : `<button type="button" disabled class="locked">${esc(n)} · nivel ${l}</button>`).join('')}${TIENDA.filter(x => x[0] === cat && tiene(cat, x[1])).map(([, v, n]) => `<button type="button" data-avk="${cat}" data-avv="${v}" aria-pressed="${a[cat] === v}">${esc(n)}</button>`).join('')}</div>`;
    shell(`<div><span class="kicker">${isAdmin() ? 'Tu personaje en el reto' : 'Mi jugadora'}</span><h1>${isAdmin() ? 'Cámbialo a tu gusto' : 'Cámbiala a tu gusto'}</h1></div>
      <section class="card av-edit"><div class="me-av big">${avatarSVG(a, lv)}</div>
        <div class="q"><span class="q-h">Piel</span>${sw('skin', SKINS)}</div>
        <div class="q"><span class="q-h">Pelo</span>${ch('top', HAIRS)}</div>
        <div class="q"><span class="q-h">Color de pelo</span>${sw('hairColor', HAIR_COLORS)}</div>
        <div class="q"><span class="q-h">Ojos</span>${ch('eyes', EYES)}</div>
        <div class="q"><span class="q-h">Boca</span>${ch('mouth', MOUTHS)}</div>
        ${isAdmin() ? `<div class="q"><span class="q-h">Barba</span>${ch('barba', BARBAS)}</div>` : ''}
        <div class="q"><span class="q-h">Ropa</span>${it('ropa')}</div>
        <div class="q"><span class="q-h">Gafas</span>${it('gafas')}</div>
        <div class="q"><span class="q-h">Gorro</span>${it('gorro')}</div>
        <div class="q"><span class="q-h">Fondo</span>${it('fondo')}</div>
        <div class="q"><span class="q-h">Marco</span>${it('marco')}</div>
        <div class="row"><button class="btn primary" type="button" data-a="saveav">Guardar</button><button class="btn ghost" type="button" data-a="noeditav">Cancelar</button></div></section>`, { nav: isAdmin() ? navA() : navJ() });
  }
  actions.editav = async () => { draft.editAv = true; draft.av = null; render(); scrollTo({ top: 0 }); };
  actions.noeditav = async () => { draft.editAv = false; draft.av = null; if (isAdmin()) view = 'reto'; else if (draft.avBack) { view = draft.avBack; draft.avBack = null; } render(); };
  actions.saveav = async () => {
    const av = Object.assign({}, draft.av);
    if (isAdmin()) { await B.merge('juego/' + me.uid, Object.assign(perfilJ(), { av })); J.todos[me.uid] = Object.assign({}, yoJ(), { av }); draft.editAv = false; draft.av = null; view = 'reto'; render(); scrollTo({ top: 0 }); toast('Guardado.'); return; }
    await B.merge('jugadoras/' + me.uid, { av }); U.perfil = Object.assign({}, U.perfil, { av }); jSync();
    if (draft.avBack) { view = draft.avBack; draft.avBack = null; }
    U.perfil = Object.assign({}, U.perfil, { av }); draft.editAv = false; draft.av = null; toast('Guardada.'); render(); scrollTo({ top: 0 });
  };
  // tras guardar algo: los puntos que suma y, si sube de nivel, lo que desbloquea
  function premio(antes) {
    const p = puntos(U.dias, U.semanas), d = p - antes, l0 = nivelDe(antes), l1 = nivelDe(p);
    if (l1 > l0) { const n = ITEMS.filter(x => x[3] === l1 + 1).map(x => x[2].toLowerCase()); toast(`¡Nivel ${l1 + 1}: ${NIVELES[l1][0]}!${n.length ? ' Nuevo: ' + n.join(', ') + '.' : ''}`); }
    else toast(d > 0 ? `Guardado. +${d} puntos.` : 'Guardado. Gracias.');
  }
  const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const avPrefs = () => { let o = {}; try { o = JSON.parse(ls.get('smbf-avisos') || '{}') || {}; } catch (e) {} return Object.assign({ antes: '17:00', despues: '21:00', diario: true }, o); };
  const compact = (d, hm) => d.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00';
  const addMin = (hm, m) => { const [h, mi] = hm.split(':').map(Number), x = h * 60 + mi + m; return `${pad(Math.floor(x / 60) % 24)}:${pad(x % 60)}`; };
  // los avisos: antes y después en los días de entreno y, si quiere, el diario los domingos
  function avisos() {
    const c = calJ(), P = avPrefs(), dias = DOW.map(x => x[0]).filter(n => c.dias.includes(n));
    const first = days => { for (let i = 0; i < 7; i++) { const d = addDays(today(), i); if (days.includes(dateOf(d).getDay())) return d; } return today(); };
    const L = [];
    if (dias.length) {
      L.push({ id: 'antes', t: 'SMB · ¿Cómo llegas hoy?', hm: P.antes, days: dias });
      L.push({ id: 'despues', t: 'SMB · ¿Qué tal el entreno?', hm: P.despues, days: dias });
    }
    if (P.diario) L.push({ id: 'diario', t: 'SMB · Tu diario de la semana', hm: '20:00', days: [0] });
    return L.map(x => Object.assign(x, { d: first(x.days), rule: `FREQ=WEEKLY;BYDAY=${x.days.map(n => BYDAY[n]).join(',')};UNTIL=20270630T215959Z` }));
  }
  const APP_URL = 'https://hockeysmb.github.io/femenino/';
  const gcal = x => 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(x.t) + '&dates=' + compact(x.d, x.hm) + '/' + compact(x.d, addMin(x.hm, 10)) + '&ctz=Europe/Madrid&recur=' + encodeURIComponent('RRULE:' + x.rule) + '&details=' + encodeURIComponent('Abre la app: ' + APP_URL);
  function avisosHTML() {
    const c = calJ(), P = avPrefs(), A2 = avisos(), nom = DOW.filter(x => c.dias.includes(x[0])).map(x => x[2]);
    const lbl = { antes: 'Aviso antes', despues: 'Aviso después', diario: 'Aviso del diario' };
    return `<p class="sub">La app no puede mandarte avisos sola. Ponlos en el calendario de tu móvil y te saltarán los días de entreno${nom.length ? ` (${esc(nom.join(', '))})` : ''}.</p>
      <div class="row"><label class="field tm">Antes del entreno<input type="time" id="av-antes" value="${esc(P.antes)}"></label><label class="field tm">Después<input type="time" id="av-despues" value="${esc(P.despues)}"></label></div>
      <label class="check"><input type="checkbox" id="av-diario"${P.diario ? ' checked' : ''}> El diario, los domingos a las 20:00</label>
      <div class="q"><span class="q-h">iPhone u otro calendario</span><button class="btn primary" type="button" data-a="ics">Añadir los avisos</button></div>
      <div class="q"><span class="q-h">Google Calendar (Android): uno a uno</span><div class="row">${A2.map(x => `<a class="btn small" href="${esc(gcal(x))}" target="_blank" rel="noopener">${lbl[x.id]}</a>`).join('')}</div></div>
      <p class="sub">Si cambian los días de entreno, vuelve a ponerlos.</p>`;
  }
  actions.ics = async () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const ev = avisos().map(x => ['BEGIN:VEVENT', `UID:smbf-${x.id}-${me.uid}@hockeysmb`, `DTSTAMP:${stamp}`, `DTSTART:${compact(x.d, x.hm)}`, 'DURATION:PT10M', `RRULE:${x.rule}`, `SUMMARY:${x.t}`, `DESCRIPTION:Abre la app: ${APP_URL}`, `URL:${APP_URL}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${x.t}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SMB//Femenino//ES', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })); a.download = 'avisos-smb-femenino.ics'; document.body.appendChild(a); a.click(); a.remove();
    toast('Ábrelo y pulsa «Añadir todo» en tu calendario.');
  };
  root.addEventListener('change', e => {
    if (!/^av-/.test(e.target.id || '')) return;
    const P = avPrefs(); if (e.target.id === 'av-diario') P.diario = e.target.checked; else if (e.target.value) P[e.target.id.slice(3)] = e.target.value;
    ls.set('smbf-avisos', JSON.stringify(P)); const y = scrollY; render(); scrollTo({ top: y });
  });

  // ---------- bienvenida (una vez por móvil; también desde «Mis datos») ----------
  const instalada = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent || '');
  function bienvenidaView() {
    const nombre = (U.perfil.nombre || '').split(' ')[0];
    shell(`<div><span class="kicker">Bienvenida</span><h1>Hola, ${esc(nombre)}. Tres pasos y listo</h1></div>
      <section class="card step-card"><div class="card-h"><h2><span class="num">1</span>Ponla en tu pantalla de inicio</h2></div>
        ${instalada() ? '<p>Ya la tienes instalada. Perfecto.</p>' : `<p>Así se abre como una app más, sin buscarla en el navegador.</p>
        <ul class="info"><li${ios() ? ' class="me"' : ''}><b>iPhone (Safari):</b> pulsa el botón Compartir (el cuadrado con la flecha hacia arriba) y luego «Añadir a pantalla de inicio».</li>
        <li${ios() ? '' : ' class="me"'}><b>Android (Chrome):</b> pulsa el menú de los tres puntos y luego «Instalar aplicación» o «Añadir a pantalla de inicio».</li></ul>`}</section>
      <section class="card step-card"><div class="card-h"><h2><span class="num">2</span>Pon los avisos</h2></div>${avisosHTML()}</section>
      <section class="card step-card"><div class="card-h"><h2><span class="num">3</span>Cómo funciona</h2></div>
        <ul class="info"><li><b>Antes del entreno:</b> cinco preguntas del 1 al 10 y, si quieres, algo que contar. 15 segundos.</li>
        <li><b>Después:</b> lo duro que ha sido, del 1 al 10, y los minutos.</li>
        <li><b>Los días de partido:</b> unas preguntas antes (con qué ganas llegas y en qué te vas a fijar) y otras después (cómo lo has vivido).</li>
        <li><b>Una vez a la semana:</b> tu diario y un compromiso para la siguiente.</li>
        <li><b>Tu jugadora:</b> sube de nivel cuando respondes. Da igual lo que contestes: puntúa responder.</li>
        <li><b>Solo lo ve Carlos.</b> A veces te contestará aquí mismo.</li></ul></section>
      <button class="btn primary big" type="button" data-a="bienvenidaok">Empezar</button>`, { nav: '' });
  }
  const bienvenidaKey = () => 'smbf-bienvenida-' + (me ? me.uid : '');
  actions.bienvenidaok = async () => { ls.set(bienvenidaKey(), '1'); view = 'hoy'; render(); scrollTo({ top: 0 }); };
  actions.verbienvenida = async () => { view = 'bienvenida'; render(); scrollTo({ top: 0 }); };
  function datosView() {
    const p = U.perfil, c = (U.acceso || {}).consentimiento || {};
    shell(`<div><span class="kicker">Tu cuenta</span><h1>Mis datos</h1></div>
      <section class="card"><h2>${esc(p.nombre)}</h2><p class="sub">${esc(EQ_N)} · ${esc(me.email || '')}</p>
        <p class="sub">Aceptaste la información el ${esc(fmtDay(isoOf(new Date((p.acepta || {}).ts || Date.now()))))}.${c.tipo ? ` Consentimiento firmado por ${c.tipo === 'familia' ? 'tu familia' : 'ti'}.` : ''}</p></section>
      <section class="card"><h2>Avisos en tu calendario</h2>${avisosHTML()}</section>
      <section class="card"><h2>El reto</h2><p class="sub">En la liga y en los duelos tus compañeras ven tu nombre, tu personaje y tus puntos del juego. Nunca lo que contestas.</p><button class="btn small" type="button" data-a="ocultaj">${yoJ().oculta ? 'Volver a salir en la liga y los duelos' : 'No salir en la liga ni en los duelos'}</button></section>
      <button class="btn" type="button" data-a="verbienvenida">Cómo funciona y cómo instalarla</button>
      <section class="card"><h2>Quién ve tus datos</h2><p>Solo Carlos Manzano, Director Técnico, y tú. No se ceden a nadie y se borran el 30 de junio de 2027.</p></section>
      <section class="card"><h2>Llevarte o borrar tus datos</h2>
        <div class="row"><button class="btn" type="button" data-a="export">Descargar mis datos</button></div>
        <p class="sub">Borrar quita todo lo que has respondido y tu alta. No tiene ninguna consecuencia en el equipo.</p>
        <div class="row"><button class="btn danger" type="button" data-a="borrartodo">Borrar todos mis datos</button></div></section>
      <button class="btn ghost" type="button" data-a="out">Cerrar sesión</button>
      <p class="sub center">Versión ${esc(APP_V)}</p>`, { nav: navJ() });
  }
  const firstEmpty = () => { const i = WELL.findIndex(w => !(draft.antes[w.k] >= 1)); return i < 0 ? 0 : i; };
  actions.startantes = async () => { draft.paso = firstEmpty(); draft.t0 = draft.t0 || Date.now(); view = 'antes'; render(); scrollTo({ top: 0 }); };
  actions.editantes = async () => { draft.editAntes = true; const a0 = diaHoy().antes || {}; draft.antes = { nota: a0.nota || '' }; WELL.forEach(w => { if (a0[w.k] >= 1) draft.antes[w.k] = Math.round(diez(a0[w.k], a0)); }); draft.paso = 0; view = 'antes'; render(); scrollTo({ top: 0 }); };
  actions.flowback = async () => { keepFNota(); if (draft.paso > 0) { draft.paso--; render(); } else actions.flowclose(); };
  const keepFNota = () => { const el = document.getElementById('f-nota'); if (el) draft.antes.nota = el.value; };
  actions.saveantes = async () => { keepFNota(); await saveAntes(); };
  actions.flowclose = async () => { keepFNota(); view = 'hoy'; draft.editAntes = false; render(); };
  async function saveAntes() {
    const d = draft.antes; if (WELL.some(w => !(d[w.k] >= 1))) { draft.paso = firstEmpty(); render(); return; }
    const p0 = puntos(U.dias, U.semanas), a = Object.assign({}, d, { esc: 10, nota: String(d.nota || '').trim(), ts: Date.now() });
    // segundos que ha tardado (sirve para ver si contesta sin pensar; no es un dato de salud)
    if (draft.t0) { a.seg = Math.round((Date.now() - draft.t0) / 1000); draft.t0 = null; }
    await B.merge(`registros/${me.uid}/dias/${today()}`, { antes: a, ts: Date.now() });
    U.dias[today()] = Object.assign({}, U.dias[today()] || {}, { antes: a });
    draft.editAntes = false; draft.antes = {}; view = 'hoy'; premio(p0); render(); scrollTo({ top: 0 });
  }
  actions.saveses = async () => {
    const d = draft.ses; if (d.rpe == null) { toast('Elige lo duro que ha sido.'); return; }
    const s = { tipo: d.tipo, rpe: d.rpe, min: d.min, nota: ($('#s-nota') || {}).value ? $('#s-nota').value.trim() : '', ts: Date.now() };
    const f = draft.sesFecha || today(), p0 = puntos(U.dias, U.semanas), L = [...((U.dias[f] || {}).ses || []), s];
    await B.merge(`registros/${me.uid}/dias/${f}`, { ses: L, ts: Date.now() });
    U.dias[f] = Object.assign({}, U.dias[f] || {}, { ses: L });
    draft.ses = { tipo: 'entreno', rpe: null, min: eqMin(), nota: '' }; draft.moreSes = false; draft.openDesp = false; draft.sesFecha = null; premio(p0); render();
  };
  actions.delses = async b => { const L = (diaHoy().ses || []).filter((_, i) => i !== +b.dataset.i); await B.merge(`registros/${me.uid}/dias/${today()}`, { ses: L, ts: Date.now() }); U.dias[today()] = Object.assign({}, diaHoy(), { ses: L }); render(); };
  actions.moreses = async () => { draft.moreSes = true; render(); };
  actions.opendesp = async () => { draft.openDesp = true; draft.sesFecha = null; render(); };
  actions.lessses = async () => { draft.moreSes = false; draft.sesFecha = null; render(); };
  actions.showdia = async () => { draft.showDia = true; render(); };
  actions.editsem = async () => { draft.editSem = true; render(); };
  // lo escrito no se pierde al repintar (al elegir el tiempo)
  const keepDia = () => { if (!draft.dia) return; ['mejor', 'rincon', 'cambiar', 'como'].forEach(k => { const el = document.getElementById('d-' + k); if (el) draft.dia[k] = el.value; }); const c = document.getElementById('d-comp'); if (c && draft.sem) draft.sem.compromiso = c.value; };
  actions.editdia = async () => { draft.editDia = true; render(); };
  actions.noeditdia = async () => { draft.editDia = false; draft.dia = null; render(); };
  actions.diamas = async () => { draft.diaMas = true; render(); };
  actions.savedia = async () => {
    const t = today(), d = draft.dia, m = $('#msg'), err = x => { m.className = 'msg err'; m.textContent = x; };
    const val = id => ((document.getElementById(id) || {}).value || '').trim();
    d.mejor = val('d-mejor'); d.rincon = val('d-rincon'); d.cambiar = val('d-cambiar'); d.como = val('d-como');
    if (!d.tiempo) return err('Elige qué tal ha ido hoy.');
    if (!d.mejor) return err('Escribe lo mejor de hoy en el hockey.');
    const doc = { tiempo: d.tiempo, mejor: d.mejor, rincon: d.rincon || '', cambiar: d.cambiar, como: d.como, ts: Date.now() }, p0 = puntos(U.dias, U.semanas);
    await B.merge(`registros/${me.uid}/dias/${t}`, { diario: doc, ts: Date.now() });
    U.dias[t] = Object.assign({}, U.dias[t] || {}, { diario: doc }); draft.editDia = false; draft.dia = null; premio(p0); render(); scrollTo({ top: 0 });
  };
  actions.noeditsem = async () => { draft.editSem = false; draft.sem = null; render(); };
  actions.gosemana = async () => { view = 'semana'; render(); scrollTo({ top: 0 }); };
  actions.savesem = async () => {
    const lunes = mondayOf(today()), d = draft.sem, m = $('#msg-c'), err = t => { m.className = 'msg err'; m.textContent = t; };
    d.compromiso = ((document.getElementById('d-comp') || {}).value || '').trim();
    if (!d.compromiso) return err('Escribe a qué te comprometes esta semana.');
    // se conservan los campos del diario semanal antiguo si los había
    const doc = Object.assign({}, U.semanas[lunes] || {}, { compromiso: d.compromiso, area: d.area || '', cumplida: d.cumplida || '', ts: Date.now() });
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
    const ops = [...Object.keys(U.dias).map(k => ({ op: 'del', path: `registros/${me.uid}/dias/${k}` })), ...Object.keys(U.semanas).map(k => ({ op: 'del', path: `registros/${me.uid}/semanas/${k}` })), { op: 'del', path: 'jugadoras/' + me.uid }, ...(J.todos[me.uid] ? [{ op: 'del', path: 'juego/' + me.uid }] : []), ...duelosMios().map(d => ({ op: 'del', path: 'duelos/' + d.id }))];
    await B.batch(ops); U.dias = {}; U.semanas = {}; toast('Tus datos están borrados.');
  };
  const eqMin = () => 90;
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || isAdmin()) return;
    if (b.dataset.pp) { goPart(b.dataset.pp); return; }
    if (b.dataset.v2) { view = b.dataset.v2; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.pcatj) { ls.set('smbf-pcat', b.dataset.pcatj); draft.cday = ''; render(); return; }
    if (b.dataset.pmes) { draft.mes = b.dataset.pmes; draft.cday = ''; render(); return; }
    if (b.dataset.pmodo) { ls.set('smbf-pmodo', b.dataset.pmodo); render(); return; }
    if (b.dataset.cday != null) { draft.cday = b.dataset.cday; render(); return; }
    if (b.dataset.v && (b.closest('.nav') || b.classList.contains('me-chip'))) { view = b.dataset.v; draft.editSem = false; draft.editAv = false; draft.av = null; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.fw) {
      if (draft.busy) return;
      draft.antes[b.dataset.fw] = +b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      draft.busy = true;
      setTimeout(async () => { try { draft.paso++; render(); } catch (er) { console.error(er); toast('No se ha podido guardar. Revisa la conexión e inténtalo otra vez.'); } finally { draft.busy = false; } }, 230);
      return;
    }
    if (b.dataset.mf && draft.mf) {
      if (draft.busy) return;
      draft.mf.vals[b.dataset.mf] = /^\d+$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      draft.busy = true; setTimeout(() => { try { actions.mfnext(); } finally { draft.busy = false; } }, 230); return;
    }
    if (b.dataset.mm && draft.mf) {
      const L = draft.mf.vals[b.dataset.mm] = draft.mf.vals[b.dataset.mm] || [], j = L.indexOf(b.dataset.v);
      if (j >= 0) L.splice(j, 1); else if (L.length < 3) L.push(b.dataset.v); else { toast('Elige hasta tres.'); return; }
      b.setAttribute('aria-pressed', String(j < 0)); return;
    }
    const keepNota = () => { draft.ses.nota = ($('#s-nota') || {}).value || ''; };
    if (b.dataset.rpe) { draft.ses.rpe = +b.dataset.rpe; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (b.dataset.tipo) { keepNota(); draft.ses.tipo = b.dataset.tipo; draft.ses.min = (TIPOS.find(t => t.k === b.dataset.tipo) || TIPOS[0]).min; draft.ses.otroMin = false; render(); return; }
    if (b.dataset.minc) { keepNota(); if (b.dataset.minc === 'otro') draft.ses.otroMin = true; else { draft.ses.min = +b.dataset.minc; draft.ses.otroMin = false; } render(); return; }
    if (b.dataset.min) { draft.ses.min = Math.max(5, Math.min(240, draft.ses.min + +b.dataset.min)); $('#min-o').textContent = draft.ses.min; return; }
    if (b.dataset.avk && draft.av) { draft.av[b.dataset.avk] = b.dataset.avv; const y = scrollY; render(); scrollTo({ top: y }); return; }
    if (b.dataset.tiempo && draft.dia) { keepDia(); draft.dia.tiempo = +b.dataset.tiempo; const y = scrollY; render(); scrollTo({ top: y }); return; }
    if (b.dataset.verdia) { draft.verDia = b.dataset.verdia; render(); return; }
    if (b.dataset.area && draft.sem) { draft.sem.area = draft.sem.area === b.dataset.area ? '' : b.dataset.area; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.area === draft.sem.area))); return; }
    if (b.dataset.cumplida && draft.sem) { draft.sem.cumplida = b.dataset.cumplida; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
  });
  root.addEventListener('input', e => { if (!draft.sem) return; const k = { 'd-mejor': 'mejor', 'd-cambiar': 'cambiar', 'd-como': 'como', 'd-comp': 'compromiso' }[e.target.id]; if (k) draft.sem[k] = e.target.value; });

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
    unsub.push(B.listenDoc('equipos/' + EQ, d => { U.equipo = d; render(); }, () => {}));
    cargarPartidos(); jStart();
  }

  // ================= El reto (26 oct): minijuego con su personaje, duelos 1 contra 1 y liga de la semana =================
  // juego/{uid}: {n, av, lv, adm, oculta, bolas (recogidas en total), gastado, compras: ['cat|valor'], estela, dias: {fecha: mejor partida}, rec, partidas}
  // duelos/{id}: {a, b, seed, pa, pb, ts}: a reta a b; pa y pb son los puntos de cada una (null = sin jugar). Las dos juegan la misma semilla.
  // Monedas = la mitad de los puntos por responder la app + las bolas recogidas − lo gastado. La DT solo tiene las bolas.
  // En la liga y en los duelos solo se ve nombre de pila, personaje y puntos del juego. Nunca nada de lo que responden.
  // versión de la app (sale en «Mis datos» y en «Altas»: sirve para saber si el móvil ya tiene la última)
  const APP_V = (((document.currentScript || {}).src || '').split('v=')[1] || '').slice(0, 12);
  const J = { todos: {}, duelos: {}, on: false, synced: false, sinReglas: false };
  const TIENDA = [
    ['estela', 'rosa', 'Estela rosa', 60], ['estela', 'menta', 'Estela menta', 60], ['estela', 'oro', 'Estela dorada', 150], ['estela', 'arcoiris', 'Estela arcoíris', 300], ['estela', 'fuego', 'Estela de fuego', 450],
    ['ropa', 'shirtVNeck:2fb5a5', 'Camiseta turquesa', 90], ['ropa', 'shirtScoopNeck:f2c14e', 'Camiseta amarilla', 90], ['ropa', 'hoodie:e05297', 'Sudadera fucsia', 120], ['ropa', 'overall:5b6cff', 'Peto azul', 180],
    ['gafas', 'prescription02', 'Gafas de pasta', 80], ['gafas', 'wayfarers', 'Gafas de moda', 140],
    ['gorro', 'winterHat1', 'Gorro de lana', 130], ['gorro', 'hat', 'Sombrero', 200],
    ['ropa', 'hoodie:2c7be5', 'Sudadera azul', 110], ['ropa', 'graphicShirt:111111', 'Camiseta negra con dibujo', 140], ['ropa', 'collarAndSweater:6fcf6a', 'Jersey verde', 130], ['ropa', 'blazerAndSweater:8a3ffc', 'Americana morada', 260],
    ['gafas', 'kurt', 'Gafas retro', 120], ['gorro', 'winterHat04', 'Gorro de invierno', 160],
    ['fondo', 'playa', 'Playa', 220], ['fondo', 'neon', 'Neón', 250], ['fondo', 'bosque', 'Bosque', 220], ['fondo', 'nieve', 'Nieve', 240], ['fondo', 'espacio', 'Espacio', 350],
    ['marco', 'arcoiris', 'Marco arcoíris', 400], ['marco', 'estrellas', 'Marco de estrellas', 450],
    ['cele', '¡Golazo!', '¡Golazo!', 50], ['cele', '¡Para casa!', '¡Para casa!', 70], ['cele', '¡A la escuadra!', '¡A la escuadra!', 100], ['cele', '¡Imparable!', '¡Imparable!', 150], ['cele', '¡Santa María!', '¡Santa María!', 200],
  ];
  // misiones del día: las mismas para todas (salen de la fecha); cada una da monedas una vez al día
  const MISIONES = [
    { k: 'goles3', t: 'Marca 3 goles en una partida', p: 30, ok: r => r.goles >= 3 }, { k: 'bolas25', t: 'Recoge 25 bolas en una partida', p: 30, ok: r => r.bolas >= 25 },
    { k: 'regates4', t: 'Haz 4 regates en una partida', p: 30, ok: r => r.regates >= 4 }, { k: 'pts1500', t: 'Llega a 1.500 puntos', p: 40, ok: r => r.puntos >= 1500 },
    { k: 'combo3', t: 'Consigue un combo ×3', p: 30, ok: r => r.combo >= 3 }, { k: 'nivel3', t: 'Llega al nivel 3', p: 40, ok: r => r.nivel >= 3 },
    { k: 'duelo', t: 'Juega un duelo', p: 20, ok: (r, d) => !!d, m: '*' }, { k: 'gol1', t: 'Marca un gol', p: 15, ok: r => r.goles >= 1 },
    // tanda de penaltis
    { m: 'penaltis', k: 'pen3', t: 'Marca 3 penaltis en una partida', p: 20, ok: r => r.goles >= 3 }, { m: 'penaltis', k: 'pen8', t: 'Marca 8 penaltis en una partida', p: 40, ok: r => r.goles >= 8 },
    { m: 'penaltis', k: 'esc1', t: 'Mete uno a la escuadra', p: 30, ok: r => r.escuadras >= 1 }, { m: 'penaltis', k: 'esc3', t: 'Tres a la escuadra en una partida', p: 50, ok: r => r.escuadras >= 3 },
    { m: 'penaltis', k: 'rpen4', t: 'Marca 4 seguidos', p: 30, ok: r => r.racha >= 4 }, { m: 'penaltis', k: 'ppen1000', t: 'Llega a 1.000 puntos', p: 40, ok: r => r.puntos >= 1000 },
    // la portera
    { m: 'portera', k: 'par10', t: 'Para 10 tiros', p: 20, ok: r => r.paradas >= 10 }, { m: 'portera', k: 'par25', t: 'Para 25 tiros en una partida', p: 40, ok: r => r.paradas >= 25 },
    { m: 'portera', k: 'rpar8', t: 'Para 8 seguidos', p: 30, ok: r => r.racha >= 8 }, { m: 'portera', k: 'seg40', t: 'Aguanta 40 segundos', p: 30, ok: r => r.segundos >= 40 },
    { m: 'portera', k: 'seg75', t: 'Aguanta 75 segundos', p: 50, ok: r => r.segundos >= 75 }, { m: 'portera', k: 'ppor1000', t: 'Llega a 1.000 puntos', p: 40, ok: r => r.puntos >= 1000 },
  ];
  // el juego de cada día (26 oct, noche): rota entre «Patina y marca», «Tanda de penaltis» y «La portera»; el mismo para todas
  const JUEGOS = [['patina', 'Patina y marca', 'Esquiva, regatea y marca leyendo a la portera'], ['penaltis', 'Tanda de penaltis', 'Apunta y elige la altura. ¿Cuántos seguidos?'], ['portera', 'La portera', 'Hoy paras tú. Ojo con los amagos']];
  const juegoDe = f => (window.SMBJuego && window.SMBJuego.delDia) ? window.SMBJuego.delDia(f) : JUEGOS[0];
  const modoN = m => (JUEGOS.find(x => x[0] === m) || JUEGOS[0])[1];
  const misionesHoy = f => { const md = juegoDe(f)[0]; let h = 0; for (const c of f) h = (h * 31 + c.charCodeAt(0)) >>> 0; const L = MISIONES.filter(m => m.m === '*' || (m.m || 'patina') === md), out = []; while (out.length < 3 && L.length) { h = (h * 1103515245 + 12345) >>> 0; out.push(L.splice(h % L.length, 1)[0]); } return out; };
  // partidas sin límite y todas dan monedas (27 oct)
  const recDe = (d, m) => ((d || {}).recs || {})[m] != null ? d.recs[m] : m === 'patina' ? (d || {}).rec || 0 : 0;
  // lo que toca contestar hoy antes de poder jugar: el antes del entreno (el antes del partido también lo cuenta), el después a partir de la hora del aviso y el diario del día.
  // Los partidos no bloquean (27 oct): salen todos los de la sección y la app no sabe quién juega cada uno.
  function tocaHoy() {
    if (isAdmin() || !U.perfil) return [];
    const t = today(), dia = diaHoy(), vis = partDe(calJ(), t).filter(partVis), ent = entrena(calJ(), t), L = [], n = new Date();
    const hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    if (ent && !dia.antes) L.push({ t: 'Antes del entreno', at: 'data-a="startantes"' });
    if (ent && hm >= (avPrefs().despues || '21:00') && !(dia.ses || []).some(z => !z.pid)) L.push({ t: 'Después del entreno', at: 'data-a="irdespues"' });
    if (!dia.diario) L.push({ t: 'Tu diario de hoy', at: 'data-a="gosemana"' });
    return L;
  }
  actions.irdespues = async () => { view = 'hoy'; draft.openDesp = true; render(); const el = document.getElementById('c-desp'); if (el) el.scrollIntoView({ block: 'start' }); };
  const puedeJugar = (contestaDuelo) => {
    const T = tocaHoy(); if (T.length) { toast('Antes de jugar, contesta lo de hoy: ' + T.map(x => x.t.toLowerCase()).join(' y ') + '.'); return false; }
    return true;
  };
  const premioDia = racha => 5 + 5 * Math.min(6, racha);
  // mascotas (mascotas.js): se compran como lo demás ('mascota|id') y se lleva una puesta (juego.mascota)
  const MSC = () => window.SMBMascotas || { LISTA: [], RAREZA: {}, svg: () => '' };
  const mscH = (id, cls = 'msc') => id ? MSC().svg(id, cls) : '';
  // la campeona de la semana pasada lleva corona toda esta semana
  function campeona() { const lp = addDays(mondayOf(today()), -7); let best = null; Object.entries(J.todos).forEach(([u, d]) => { if (!d || d.oculta || !d.n) return; const p = semPts(d, lp); if (p > 0 && (!best || p > best.p)) best = { u, p }; }); return best; }
  const CORONA = '<svg class="crown" viewBox="0 0 24 24" role="img" aria-label="Campeona de la semana pasada"><path d="M3 18h18l-1.6-10-4.4 4-3-7-3 7-4.4-4z" fill="#ffcf33" stroke="#a87800" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="4.6" r="1.4" fill="#ffcf33"/></svg>';
  const CAT_N = { mascota: 'Mascota', estela: 'Estela', ropa: 'Ropa', gafas: 'Gafas', gorro: 'Gorro', fondo: 'Fondo', marco: 'Marco', cele: 'Celebración de gol' };
  const DT_AV = { skin: 'edb98a', top: 'shortFlat', hairColor: '2c1b18', eyes: 'default', mouth: 'smile', ropa: 'hoodie:681825', gafas: '', gorro: '', fondo: 'pista', marco: 'oro' };
  const meU = () => me && me.uid, yoJ = () => J.todos[meU()] || {};
  const miNombre = () => isAdmin() ? 'Carlos' : ((U.perfil || {}).nombre || '').split(' ')[0];
  const miAv = () => isAdmin() ? Object.assign({}, DT_AV, yoJ().av || {}) : Object.assign({}, (U.perfil || {}).av || {});
  const miLv = () => isAdmin() ? 9 : nivelDe(puntos(U.dias, U.semanas));
  const perfilJ = () => ({ n: miNombre(), av: miAv(), lv: miLv(), adm: isAdmin() });
  const monedas = () => { const y = yoJ(); return (isAdmin() ? 0 : Math.floor(puntos(U.dias, U.semanas) / 2)) + (y.bolas || 0) + (y.premios || 0) - (y.gastado || 0); };
  const semPts = (d, l) => { let s = 0; for (let i = 0; i < 7; i++) s += (d.dias || {})[addDays(l, i)] || 0; return s; };
  const rachaJ = d => { let n = 0, k = today(); if (!(d.dias || {})[k]) k = addDays(k, -1); while ((d.dias || {})[k]) { n++; k = addDays(k, -1); } return n; };
  const tiene = (c, v) => (c === 'estela' && v === 'granate') || (c === 'cele' && v === '¡GOL!') || (yoJ().compras || []).includes(c + '|' + v);
  const puesto = (c, v) => c === 'mascota' ? yoJ().mascota === v : c === 'estela' ? (yoJ().estela || 'granate') === v : c === 'cele' ? (yoJ().cele || '¡GOL!') === v : miAv()[c] === v;
  const avSrc = (av, lv, n) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSVG(av, lv, n).replace('<svg class="av"', '<svg width="280" height="280" class="av"'));
  function jStart() {
    if (J.on) return; J.on = true;
    // si las reglas del reto no están publicadas en Firebase, se avisa en la pantalla del reto
    const err = e => { if (e && /permission/i.test(e.code || e.message || '')) { J.sinReglas = true; renderSoon(); } };
    unsub.push(B.listenCol('juego', L => { J.sinReglas = false; J.todos = Object.fromEntries(L.map(x => [x.id, x.data])); jSync(); renderSoon(); }, err));
    unsub.push(B.listenCol('duelos', L => { J.duelos = Object.fromEntries(L.map(x => [x.id, x.data])); renderSoon(); }, err));
  }
  // su ficha del juego al día (nombre, personaje y nivel) para que las demás la vean en la liga y la puedan retar
  function jSync() {
    if (!me || (!isAdmin() && !U.perfil)) return;
    const y = J.todos[meU()], p = perfilJ();
    if (!y || y.n !== p.n || y.lv !== p.lv || JSON.stringify(y.av || {}) !== JSON.stringify(p.av)) { if (J.synced === JSON.stringify(p)) return; J.synced = JSON.stringify(p); B.merge('juego/' + meU(), p).catch(() => {}); }
  }
  function jugar(seed, duelo) {
    if (!window.SMBJuego) { toast('No se ha podido cargar el juego. Vuelve a abrir la app.'); return; }
    const modo = duelo ? ((J.duelos[duelo] || {}).modo || 'patina') : juegoDe(today())[0];
    (window.SMBJuego.jugar || window.SMBJuego.start)({ modo, avatarSrc: avSrc(miAv(), miLv(), miNombre()), mascotaSrc: yoJ().mascota ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mscH(yoJ().mascota).replace('<svg class="msc"', '<svg width="100" height="100" class="msc"')) : '', seed, estela: yoJ().estela || 'granate', cele: yoJ().cele || '¡GOL!', titulo: duelo ? 'Duelo contra ' + ((J.todos[(J.duelos[duelo] || {}).a === meU() ? J.duelos[duelo].b : (J.duelos[duelo] || {}).a] || {}).n || '') : modoN(modo), onEnd: r => terminar(Object.assign({ modo }, r), duelo) });
  }
  async function terminar(r, duelo) {
    const t = today(), y = yoJ(), dias = {}, prev = (y.dias || {})[t] || 0, md = r.modo || 'patina', delDia = md === juegoDe(t)[0];
    // a la liga solo va el juego del día (un duelo de otro día, con otro juego, no cuenta para la tabla)
    Object.entries(y.dias || {}).forEach(([k, v]) => { if (daysBetween(k, t) <= 60) dias[k] = v; }); if (delDia) dias[t] = Math.max(prev, r.puntos); else if (prev) dias[t] = prev;
    
    // premio por entrar a diario (la primera partida del día) y misiones del día
    const prim = !prev && delDia, rch = rachaJ(Object.assign({}, y, { dias })), pd = prim ? premioDia(rch) : 0;
    const mis = (y.mis && y.mis.f === t) ? { f: t, h: [...(y.mis.h || [])] } : { f: t, h: [] }, nuevas = misionesHoy(t).filter(m => !mis.h.includes(m.k) && (m.m === '*' || (m.m || 'patina') === md) && m.ok(r, duelo));
    nuevas.forEach(m => mis.h.push(m.k)); const pm = nuevas.reduce((a, m) => a + m.p, 0);
    const doc = Object.assign({}, y, perfilJ(), { bolas: (y.bolas || 0) + r.bolas, premios: (y.premios || 0) + pd + pm, mis, dias, rec: md === 'patina' ? Math.max(y.rec || 0, r.puntos) : (y.rec || 0), recs: Object.assign({}, y.recs || {}, { [md]: Math.max(recDe(y, md), r.puntos) }), partidas: (y.partidas || 0) + 1, ts: Date.now() });
    draft.res = Object.assign({}, r, { duelo, nuevoRec: r.puntos > recDe(y, md) && recDe(y, md) > 0, mejorHoy: delDia && r.puntos > prev && prev > 0, pd, rch, nuevas });
    J.todos[meU()] = doc; view = 'reto'; draft.rtab = duelo ? 'duelos' : draft.rtab; render(); scrollTo({ top: 0 });
    try {
      await B.set('juego/' + meU(), doc);
      if (duelo && J.duelos[duelo]) { const d = J.duelos[duelo], k = d.a === meU() ? 'pa' : 'pb'; if (d[k] == null) { await B.merge('duelos/' + duelo, { [k]: r.puntos }); J.duelos[duelo] = Object.assign({}, d, { [k]: r.puntos }); render(); } }
    } catch (e) { console.error(e); if (/permission/i.test(e.code || e.message || '')) { J.sinReglas = true; render(); toast(isAdmin() ? 'No se ha guardado: faltan las reglas del reto en Firebase.' : 'La partida no se ha guardado: el reto todavía no está activo.'); } else toast('No se ha podido guardar la partida. Revisa la conexión.'); }
  }
  actions.jugar = async () => { if (puedeJugar(false)) jugar(Math.floor(Math.random() * 2e9), null); };
  actions.editavj = async () => { view = 'yo'; draft.editAv = true; draft.av = null; draft.avBack = 'reto'; render(); scrollTo({ top: 0 }); };
  actions.editavdt = async () => { view = 'avdt'; draft.editAv = true; draft.av = null; render(); scrollTo({ top: 0 }); };
  actions.retar = async b => {
    if (!puedeJugar(false)) return;
    const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d = { a: meU(), b: b.dataset.u, seed: Math.floor(Math.random() * 2e9), modo: juegoDe(today())[0], pa: null, pb: null, ts: Date.now() };
    await B.set('duelos/' + id, d); J.duelos[id] = d; jugar(d.seed, id);
  };
  actions.jugarduelo = async b => { const d = J.duelos[b.dataset.id]; if (d && puedeJugar(d.b === meU())) jugar(d.seed, b.dataset.id); };
  actions.cerrarres = async () => { draft.res = null; render(); };
  actions.rtab = async b => { draft.rtab = b.dataset.k; render(); };
  actions.ttab = async b => { draft.ttab = b.dataset.k; render(); };
  // ================= cofres de mascotas (26 oct, noche): las mascotas ya no se compran sueltas, salen de cofres =================
  // Probabilidades a la vista. Las repetidas devuelven monedas. Garantías: épica o mejor cada 20 cofres sin ella; legendaria a los 60 sin ella.
  const COFRES = [
    { k: 'madera', n: 'Cofre de madera', p: 250, o: { comun: 72, rara: 22, epica: 5, legendaria: 1 }, c: ['#b5793e', '#7a4a1e'] },
    { k: 'plata', n: 'Cofre de plata', p: 600, o: { comun: 35, rara: 45, epica: 16, legendaria: 4 }, c: ['#c9d1d9', '#7d8892'] },
    { k: 'oro', n: 'Cofre de oro', p: 1400, o: { comun: 0, rara: 45, epica: 42, legendaria: 13 }, c: ['#ffd84d', '#c99a00'] },
    // de temporada (27 oct): solo trae las mascotas de su evento y desaparece después de la fecha (las que tengas, te las quedas)
    { k: 'halloween', n: 'Cofre de Halloween', p: 500, o: { comun: 50, rara: 30, epica: 15, legendaria: 5 }, c: ['#ff8c1a', '#4a2a6b'], ev: 'hw', hasta: '2026-11-03' },
  ];
  const REPE = { comun: 15, rara: 40, epica: 100, legendaria: 250 };
  const cofreSVG = (c, cls = 'cofre') => `<svg class="${cls}" viewBox="0 0 100 90" aria-hidden="true"><ellipse cx="50" cy="84" rx="36" ry="5" fill="rgba(0,0,0,.15)"/><rect x="12" y="38" width="76" height="44" rx="8" fill="${c.c[0]}"/><rect x="12" y="38" width="76" height="44" rx="8" fill="none" stroke="${c.c[1]}" stroke-width="4"/>
    <path d="M12 40 Q12 12 50 12 Q88 12 88 40 Z" fill="${c.c[0]}" stroke="${c.c[1]}" stroke-width="4"/><rect x="44" y="34" width="12" height="16" rx="3" fill="${c.c[1]}"/><circle cx="50" cy="42" r="2.4" fill="${c.c[0]}"/>
    <path d="M24 46 v30 M76 46 v30" stroke="${c.c[1]}" stroke-width="3" opacity=".5"/>${c.k === 'halloween' ? `<path d="M30 58 l6 -6 l6 6 Z M58 58 l6 -6 l6 6 Z M34 68 Q50 78 66 68 L62 68 L59 72 L55 68 L45 68 L41 72 L38 68 Z" fill="${c.c[1]}"/>` : ''}${c.k === 'oro' ? '<path d="M30 20 l2 4 4 .6 -3 3 .7 4 -3.7 -2 -3.7 2 .7 -4 -3 -3 4 -.6 Z M70 22 l1.6 3.2 3.2 .5 -2.4 2.3 .6 3.2 -3 -1.6 -3 1.6 .6 -3.2 -2.4 -2.3 3.2 -.5 Z" fill="#fff"/>' : ''}</svg>`;
  function tirar(c, y) {
    const sinEp = y.sinEp || 0, sinLeg = y.sinLeg || 0;
    let r;
    if (!c.ev && sinLeg >= 59) r = 'legendaria';
    else if (!c.ev && sinEp >= 19) r = Math.random() < 0.2 ? 'legendaria' : 'epica';
    else { let x = Math.random() * 100; r = 'comun'; for (const k of ['legendaria', 'epica', 'rara', 'comun']) { x -= c.o[k]; if (x < 0) { r = k; break; } } }
    const L = MSC().LISTA.filter(m => m[2] === r && (c.ev ? m[4] === c.ev : !m[4])), m = L[Math.floor(Math.random() * L.length)];
    return { id: m[0], n: m[1], r };
  }
  actions.abrircofre = async b => {
    const c = COFRES.find(x => x.k === b.dataset.k), y = yoJ(); if (!c || (c.hasta && today() > c.hasta)) return;
    if (monedas() < c.p) { toast('Te faltan monedas. ¡A jugar!'); return; }
    const sale = tirar(c, y), nueva = !tiene('mascota', sale.id), dev = nueva ? 0 : REPE[sale.r];
    const doc = Object.assign({}, perfilJ(), { gastado: (y.gastado || 0) + c.p - dev, compras: nueva ? [...(y.compras || []), 'mascota|' + sale.id] : (y.compras || []), cofres: (y.cofres || 0) + 1,
      // las garantías (épica a los 20, legendaria a los 60) solo cuentan los cofres normales
      sinEp: c.ev ? (y.sinEp || 0) : ['epica', 'legendaria'].includes(sale.r) ? 0 : (y.sinEp || 0) + 1, sinLeg: c.ev ? (y.sinLeg || 0) : sale.r === 'legendaria' ? 0 : (y.sinLeg || 0) + 1 });
    if (nueva && (sale.r === 'epica' || sale.r === 'legendaria')) doc.ultima = { id: sale.id, ts: Date.now() };
    J.todos[meU()] = Object.assign({}, y, doc);
    abrirAnim(c, sale, nueva, dev);
    try { await B.merge('juego/' + meU(), doc); } catch (e) { J.todos[meU()] = y; render(); throw e; }
  };
  // la animación de abrir: el cofre tiembla, se abre y sale la mascota
  function abrirAnim(c, sale, nueva, dev) {
    const R = MSC().RAREZA[sale.r] || ['', '#999'], ov = document.createElement('div'); ov.className = 'cf-ov ' + sale.r;
    ov.innerHTML = `<div class="cf-box">${cofreSVG(c, 'cofre cf-shake')}</div><div class="cf-res" hidden><span class="cf-rz" style="background:${R[1]}">${R[0]}</span>${mscH(sale.id, 'msc cf-pet')}<b>${esc(sale.n)}</b>
      <span class="cf-st">${nueva ? '¡Nueva para tu colección!' : `Repetida: te devolvemos ${dev} monedas`}</span>
      <div class="row center">${nueva ? `<button class="btn primary" type="button" data-cf="poner" data-v="${sale.id}">Llevarla</button>` : ''}<button class="btn${nueva ? '' : ' primary'}" type="button" data-cf="otro" data-k="${c.k}">Otro cofre</button><button class="btn ghost" type="button" data-cf="cerrar">Cerrar</button></div></div>`;
    document.body.appendChild(ov);
    try { if (window.SMBJuego && localStorage.getItem('smbf-sonido') !== 'no') {} } catch (e) {}
    setTimeout(() => { ov.querySelector('.cf-box').classList.add('abre'); }, 1300);
    setTimeout(() => { ov.querySelector('.cf-box').hidden = true; ov.querySelector('.cf-res').hidden = false; }, 1750);
    ov.addEventListener('click', async e => {
      const t = e.target.closest('[data-cf]'); if (!t) return;
      ov.remove(); render();
      if (t.dataset.cf === 'poner') await actions.ponerj({ dataset: { c: 'mascota', v: t.dataset.v } });
      if (t.dataset.cf === 'otro') await actions.abrircofre({ dataset: { k: t.dataset.k } });
    });
  }
  actions.comprar = async b => {
    const c = b.dataset.c, v = b.dataset.v, p = +b.dataset.p, y = yoJ();
    if (tiene(c, v)) return; if (monedas() < p) { toast('Te faltan monedas. ¡A jugar!'); return; }
    const doc = Object.assign({}, perfilJ(), { gastado: (y.gastado || 0) + p, compras: [...(y.compras || []), c + '|' + v] });
    J.todos[meU()] = Object.assign({}, y, doc); render(); await B.merge('juego/' + meU(), doc); toast('¡Comprado! Ya te lo puedes poner.');
  };
  actions.ponerj = async b => {
    const c = b.dataset.c, v = b.dataset.v;
    if (c === 'estela' || c === 'cele' || c === 'mascota') { J.todos[meU()] = Object.assign({}, yoJ(), { [c]: v }); render(); await B.merge('juego/' + meU(), { [c]: v }); toast(c === 'cele' ? 'Así celebrarás tus goles.' : c === 'mascota' ? (v ? '¡Ya te acompaña!' : 'Vale, sin mascota.') : '¡Te queda genial!'); return; }
    const av = Object.assign({}, miAv(), { [c]: v });
    if (isAdmin()) { J.todos[meU()] = Object.assign({}, yoJ(), { av }); render(); await B.merge('juego/' + meU(), { av }); }
    else { U.perfil = Object.assign({}, U.perfil, { av }); render(); await B.merge('jugadoras/' + me.uid, { av }); jSync(); }
    toast('¡Te queda genial!');
  };
  actions.ocultaj = async () => { const o = !yoJ().oculta; J.todos[meU()] = Object.assign({}, yoJ(), { oculta: o }); render(); await B.merge('juego/' + meU(), Object.assign(perfilJ(), { oculta: o })); toast(o ? 'Ya no sales en la liga ni te pueden retar.' : 'Vuelves a salir en la liga.'); };
  const duelosMios = () => Object.entries(J.duelos).map(([id, d]) => Object.assign({ id }, d)).filter(d => d.a === meU() || d.b === meU()).sort((a, b) => b.ts - a.ts);
  const caducado = d => Date.now() - d.ts > 7 * 864e5;
  const retosPend = () => duelosMios().filter(d => d.b === meU() && d.pb == null && d.pa != null && !caducado(d));
  // aviso en «Hoy»: te han retado
  function retoAvisoHTML() {
    const R = retosPend(); if (!R.length) return '';
    return `<section class="card rt-reto"><span class="rt-ra">${avatarSVG((J.todos[R[0].a] || {}).av, (J.todos[R[0].a] || {}).lv || 0, '')}</span><div><b>${esc((J.todos[R[0].a] || {}).n || 'Alguien')} te ha retado${R.length > 1 ? ` (y ${R.length - 1} más)` : ''}</b><span class="sub">Ha hecho ${fmtInt(R[0].pa)} puntos. ¿Le ganas?</span></div><button class="btn primary" type="button" data-a="jugarduelo" data-id="${R[0].id}">Jugar</button></section>`;
  }
  function retoView() {
    const y = yoJ(), t = today(), lunes = mondayOf(t), yo_ = meU(), tab = draft.rtab || 'liga', res = draft.res;
    const todos = Object.entries(J.todos).filter(([, d]) => d && d.n && !d.oculta);
    const avJ = d => avatarSVG(d.av, d.lv || 0, d.n), ch = campeona(), cw = u => ch && ch.u === u ? CORONA : '', pet = d => mscH(d.mascota, 'msc chico');
    const liga = todos.map(([u, d]) => ({ u, d, p: semPts(d, lunes) })).filter(r => r.p > 0).sort((a, b) => b.p - a.p);
    const Ds = duelosMios(), otro = d => d.a === yo_ ? d.b : d.a, mio = d => d.a === yo_ ? d.pa : d.pb, suyo = d => d.a === yo_ ? d.pb : d.pa;
    const est = d => mio(d) == null ? (caducado(d) ? ['cad', 'Caducado'] : ['tuyo', 'Te toca']) : suyo(d) == null ? (caducado(d) ? ['cad', 'Caducado'] : ['esp', 'Esperando']) : mio(d) > suyo(d) ? ['g', 'Ganado'] : mio(d) < suyo(d) ? ['p', 'Perdido'] : ['e', 'Empate'];
    const vsDT = Ds.filter(d => (J.todos[otro(d)] || {}).adm && mio(d) != null && suyo(d) != null && mio(d) > suyo(d)).length;
    const dots = d => `<span class="lg-dots">${[0, 1, 2, 3, 4, 5, 6].map(i => `<i class="${(d.dias || {})[addDays(lunes, i)] ? 'on' : ''}${addDays(lunes, i) === t ? ' hoy' : ''}"></i>`).join('')}</span>`;
    const pod = liga.slice(0, 3), podOrd = [pod[1], pod[0], pod[2]];
    const ligaH = liga.length ? `<div class="podio">${podOrd.map((r, i) => r ? `<div class="pd p${[2, 1, 3][i]}${r.u === yo_ ? ' me' : ''}"><span class="pd-av">${avJ(r.d)}${pet(r.d)}</span><b>${cw(r.u)}${esc(r.d.n)}</b><small>${fmtInt(r.p)}</small><span class="pd-base">${[2, 1, 3][i]}</span></div>` : '<div class="pd vacio"></div>').join('')}</div>
        ${liga.length > 3 ? `<ol class="lg-rows" start="4">${liga.slice(3).map((r, i) => `<li class="${r.u === yo_ ? 'me' : ''}"><span class="lg-n">${i + 4}</span><span class="lg-av">${avJ(r.d)}${pet(r.d)}</span><b>${cw(r.u)}${esc(r.d.n)}</b>${dots(r.d)}<span class="lg-p">${fmtInt(r.p)}</span></li>`).join('')}</ol>` : ''}
        ${!liga.some(r => r.u === yo_) ? '<p class="sub">Todavía no has jugado esta semana. Cada día cuenta tu mejor partida.</p>' : ''}`
      : '<p class="sub">Nadie ha jugado esta semana. ¡Estrena la tabla!</p>';
    const duelosH = `<section class="card"><div class="card-h"><h2>Retar a…</h2>${vsDT ? `<span class="pill">Le has ganado a Carlos ${vsDT} ${vsDT === 1 ? 'vez' : 'veces'}</span>` : ''}</div>
        ${todos.filter(([u]) => u !== yo_).length ? `<div class="pfs">${todos.filter(([u]) => u !== yo_).sort((a, b) => (b[1].adm ? 1 : 0) - (a[1].adm ? 1 : 0)).map(([u, d]) => `<button type="button" class="pf ok" data-a="retar" data-u="${u}"><span class="pf-av">${avJ(d)}${pet(d)}</span><b>${cw(u)}${esc(d.n)}</b><small>${d.adm ? 'el jefe final' : 'récord ' + fmtInt(recDe(d, juegoDe(t)[0]))}${(d.compras || []).filter(x => x.startsWith('mascota|')).length ? ` · ${(d.compras || []).filter(x => x.startsWith('mascota|')).length} mascotas` : ''}</small></button>`).join('')}</div>` : '<p class="sub">Todavía no hay nadie más. En cuanto entren tus compañeras, salen aquí.</p>'}
        <p class="sub">El duelo es del juego de hoy (${esc(juegoDe(t)[1])}). Las dos jugáis exactamente lo mismo; gana quien saque más puntos. Tiene 7 días para contestar.</p></section>
      ${Ds.length ? `<section class="card"><h2>Tus duelos</h2><div class="dls">${Ds.slice(0, 12).map(d => { const o = J.todos[otro(d)] || {}, [k, l] = est(d); return `<div class="dl-r"><span class="lg-av">${avJ(o)}${pet(o)}</span><span class="dl-b"><b>${esc(o.n || '—')}</b><small>${esc(modoN(d.modo || 'patina'))} · ${mio(d) == null ? '—' : fmtInt(mio(d))} – ${suyo(d) == null ? '—' : fmtInt(suyo(d))}</small></span>${k === 'tuyo' ? `<button class="btn small primary" type="button" data-a="jugarduelo" data-id="${d.id}">Jugar</button>` : `<span class="res ${k}">${l}</span>`}</div>`; }).join('')}</div></section>` : ''}`;
    const tt = draft.ttab || 'mascotas', mis = MSC().LISTA.filter(([id]) => tiene('mascota', id)).length;
    const itemCard = ([c, v, n, p]) => { const own = tiene(c, v), on = own && puesto(c, v);
      const prev = c === 'cele' ? `<span class="sh-c">${esc(v)}</span>` : c === 'estela' ? `<span class="sh-e" style="background:linear-gradient(90deg,${(window.SMBJuego ? window.SMBJuego.ESTELAS[v] : ['#681825']).join(',')})"></span>` : avatarSVG(Object.assign({}, miAv(), { [c]: v }), 9, n);
      return `<div class="sh${own ? ' own' : ''}"><span class="sh-p">${prev}</span><b>${esc(n)}</b><small>${CAT_N[c]}</small>${own ? (on ? '<span class="pill">Puesto</span>' : `<button class="btn small" type="button" data-a="ponerj" data-c="${c}" data-v="${v}">Ponérmelo</button>`) : `<button class="btn small${monedas() >= p ? ' primary' : ''}" type="button" data-a="comprar" data-c="${c}" data-v="${v}" data-p="${p}">${p} monedas</button>`}</div>`; };
    const petCard = ([id, n, r, , ev]) => { const own = tiene('mascota', id), on = own && puesto('mascota', id), R = MSC().RAREZA[r] || ['', '#999'];
      return `<div class="sh pet ${r}${own ? ' own' : ' falta'}"><span class="rz" style="background:${R[1]}">${R[0]}</span><span class="sh-p">${own ? mscH(id, 'msc big') : `<span class="sil">${mscH(id, 'msc big')}<i>?</i></span>`}</span><b>${own ? esc(n) : '???'}</b>${own ? (on ? '<span class="pill">Te acompaña</span>' : `<button class="btn small" type="button" data-a="ponerj" data-c="mascota" data-v="${id}">Llevarla</button>`) : `<small>${ev ? 'Cofre de ' + esc((MSC().EVENTOS || {})[ev] || '') : 'Sale en cofres'}</small>`}</div>`; };
    const y0 = yoJ(), cofresH = `<div class="cofres">${COFRES.filter(c => !c.hasta || today() <= c.hasta).sort((a, b) => (b.ev ? 1 : 0) - (a.ev ? 1 : 0)).map(c => `<div class="cf ${c.k}">${c.hasta ? `<span class="cf-ev">Hasta el ${esc(fmtShort(c.hasta))}</span>` : ''}${cofreSVG(c)}<b>${c.n}</b><span class="cf-odds">${Object.entries(c.o).filter(([, v]) => v).map(([r, v]) => `<i style="color:${(MSC().RAREZA[r] || [])[1]}">${(MSC().RAREZA[r] || [''])[0]} ${v}%</i>`).join('')}</span><button class="btn small${monedas() >= c.p ? ' primary' : ''}" type="button" data-a="abrircofre" data-k="${c.k}">${fmtInt(c.p)} monedas</button></div>`).join('')}</div>
      <p class="sub">Las repetidas te devuelven monedas. Si llevas 20 cofres sin épica, el siguiente trae épica o legendaria${(y0.sinLeg || 0) > 0 ? `; legendaria asegurada en ${60 - (y0.sinLeg || 0)} cofres` : ''}.</p>`;
    const tiendaH = `<section class="card"><div class="card-h"><h2>Tienda</h2><span class="pill coin">${fmtInt(monedas())} monedas</span></div>
        <p class="sub">${isAdmin() ? 'Ganas monedas recogiendo bolas, con las misiones y entrando a diario.' : 'Ganas monedas recogiendo bolas, con las misiones, entrando a diario y contestando la app.'}</p>
        <div class="chips-cat">${[['mascotas', 'Mascotas'], ['personaje', 'Personaje'], ['estelas', 'Estelas'], ['goles', 'Celebraciones']].map(([k, l]) => `<button type="button" class="cc" data-a="ttab" data-k="${k}" aria-pressed="${tt === k}">${l}</button>`).join('')}</div>
        ${tt === 'mascotas' ? `${cofresH}<h3 class="rz-h">Tu colección · ${mis} de ${MSC().LISTA.length}</h3><p class="sub">Te acompañan en la liga, en los duelos y patinando a tu lado.</p>
          ${Object.entries(MSC().EVENTOS || {}).map(([ev, en]) => `<h3 class="rz-h ev">${esc(en)} <small>${MSC().LISTA.filter(x => x[4] === ev && tiene('mascota', x[0])).length} de ${MSC().LISTA.filter(x => x[4] === ev).length}</small></h3><div class="shop">${MSC().LISTA.filter(x => x[4] === ev).map(petCard).join('')}</div>`).join('')}
          ${Object.entries(MSC().RAREZA).map(([r, [rn, rc]]) => `<h3 class="rz-h" style="color:${rc}">${rn}${r === 'legendaria' ? 's' : r === 'comun' ? 'es' : 's'}</h3><div class="shop">${MSC().LISTA.filter(x => x[2] === r && !x[4]).map(petCard).join('')}</div>`).join('')}
          ${yoJ().mascota ? '<button class="btn ghost small" type="button" data-a="ponerj" data-c="mascota" data-v="">Ir sin mascota</button>' : ''}`
        : `<div class="shop">${TIENDA.filter(([c]) => tt === 'personaje' ? !['estela', 'cele'].includes(c) : tt === 'estelas' ? c === 'estela' : c === 'cele').map(itemCard).join('')}</div>
          <div class="row">${tt === 'estelas' && (yoJ().estela || 'granate') !== 'granate' ? '<button class="btn ghost small" type="button" data-a="ponerj" data-c="estela" data-v="granate">Volver a la estela granate</button>' : ''}${tt === 'goles' && (yoJ().cele || '¡GOL!') !== '¡GOL!' ? '<button class="btn ghost small" type="button" data-a="ponerj" data-c="cele" data-v="¡GOL!">Volver a «¡GOL!»</button>' : ''}</div>`}</section>`;
    const resH = res ? (() => { const d = res.duelo && J.duelos[res.duelo], o = d ? J.todos[otro(d)] || {} : null, su = d ? suyo(d) : null;
      return `<section class="card rt-res"><button class="rt-cl" type="button" data-a="cerrarres" aria-label="Cerrar">×</button><span class="kicker">${res.duelo ? 'Duelo contra ' + esc((o || {}).n || '') : 'Tu partida'}</span>
        <b class="rt-pts">${fmtInt(res.puntos)}<small> puntos</small></b>
        <div class="rt-st sm">${(res.modo === 'penaltis' ? [[res.goles, res.goles === 1 ? 'gol' : 'goles'], [res.escuadras || 0, 'a la escuadra'], [res.racha || 0, 'seguidos'], [res.lanzamientos || 0, 'tiros']]
          : res.modo === 'portera' ? [[res.paradas || 0, 'paradas'], [res.racha || 0, 'seguidas'], [res.segundos || 0, 'segundos']]
          : [[res.bolas, 'bolas'], [res.goles, res.goles === 1 ? 'gol' : 'goles'], [res.regates || 0, 'regates'], ['×' + (res.combo || 1), 'combo'], [res.nivel || 1, 'nivel']]).map(([v, l]) => `<span><b>${v}</b>${l}</span>`).join('')}</div>
        <div class="rt-coins"><span class="pill coin">+${res.bolas + (res.pd || 0) + (res.nuevas || []).reduce((a, m) => a + m.p, 0)} monedas</span>${res.pd ? `<span class="sub">incluye ${res.pd} por ${res.rch} ${res.rch === 1 ? 'día' : 'días seguidos'}</span>` : ''}</div>
        ${(res.nuevas || []).map(m => `<span class="rt-badge mis">Misión cumplida: ${esc(m.t)} · +${m.p}</span>`).join('')}
        ${res.nuevoRec ? '<span class="rt-badge">¡Nuevo récord!</span>' : res.mejorHoy ? '<span class="rt-badge">Tu mejor partida de hoy</span>' : ''}
        ${d ? (su == null ? `<p class="sub">Ahora le toca a ${esc(o.n || '')}. Lo verá al entrar.</p>` : `<p class="rt-vs ${res.puntos > su ? 'g' : res.puntos < su ? 'p' : 'e'}">${res.puntos > su ? '¡Has ganado!' : res.puntos < su ? 'Esta vez gana ' + esc(o.n || '') : '¡Empate!'} · ${fmtInt(res.puntos)} – ${fmtInt(su)}</p>`) : ''}
        <div class="row"><button class="btn primary" type="button" data-a="jugar">Otra vez</button>${d && su != null ? `<button class="btn" type="button" data-a="retar" data-u="${otro(d)}">Revancha</button>` : ''}</div></section>`; })() : '';
    shell(`<section class="rt-hero"><button type="button" class="rt-av" data-a="${isAdmin() ? 'editavdt' : 'editavj'}" aria-label="Cambiar mi personaje">${avatarSVG(miAv(), miLv(), miNombre())}<span class="rt-ed">Cambiar</span>${mscH(y.mascota, 'msc hero')}</button>
        <div class="rt-b"><span class="kicker">El reto · juego de hoy</span><h1>${esc(juegoDe(t)[1])}</h1><span class="rt-desc">${esc(juegoDe(t)[2])}</span>${(campeona() || {}).u === yo_ ? `<span class="rt-camp">${CORONA}${isAdmin() ? 'Campeón' : 'Campeona'} de la semana pasada</span>` : ''}
          <div class="rt-st"><span><b>${fmtInt(monedas())}</b>monedas</span><span><b>${fmtInt(recDe(y, juegoDe(t)[0]))}</b>récord</span><span><b>${rachaJ(y)}</b>${rachaJ(y) === 1 ? 'día' : 'días'} seguidos</span></div></div>
        ${(() => { const T = tocaHoy();
          if (T.length) return `<div class="rt-gate"><b>Antes de jugar, contesta lo de hoy</b><div class="row">${T.map(x => `<button class="btn small primary" type="button" ${x.at}>${esc(x.t)}</button>`).join('')}</div></div><button class="btn big rt-play" type="button" disabled aria-disabled="true">Jugar</button>`;
          return `<button class="btn big rt-play" type="button" data-a="jugar">Jugar</button>`; })()}
        <span class="rt-next">Mañana: ${esc(juegoDe(addDays(t, 1))[1])}</span></section>
      ${J.sinReglas ? `<section class="card aviso-reglas"><h2>${isAdmin() ? 'Faltan las reglas del reto' : 'El reto todavía no está listo'}</h2><p>${isAdmin() ? 'Firebase no deja guardar nada del juego (partidas, duelos, tienda ni tu personaje) porque las reglas nuevas no están publicadas. Ve a la consola de Firebase, Firestore → Reglas, pega el archivo <b>firestore.rules</b> y pulsa «Publicar».' : 'Puedes jugar, pero todavía no se guardan las partidas. Carlos lo activa en breve.'}</p></section>` : ''}
      ${resH}
      ${(() => { const f = today(), mh = (y.mis && y.mis.f === f) ? y.mis.h || [] : [], L = misionesHoy(f), pr = !(y.dias || {})[f];
        return `<section class="card rt-mis"><div class="card-h"><h2>Misiones de hoy</h2><span class="sub">${mh.length} de 3</span></div>
          <ul>${L.map(m => `<li class="${mh.includes(m.k) ? 'ok' : ''}"><i>${mh.includes(m.k) ? '✓' : ''}</i><span>${esc(m.t)}</span><b>+${m.p}</b></li>`).join('')}</ul>
          ${pr ? `<p class="sub">Tu primera partida de hoy da <b>${premioDia(rachaJ(y) + 1)} monedas</b> de premio por entrar a diario.</p>` : ''}</section>`; })()}
      ${retosPend().map(d => `<section class="card rt-reto"><span class="rt-ra">${avJ(J.todos[d.a] || {})}</span><div><b>${esc((J.todos[d.a] || {}).n || 'Alguien')} te ha retado</b><span class="sub">Ha hecho ${fmtInt(d.pa)} puntos. ¿Le ganas?</span></div><button class="btn primary" type="button" data-a="jugarduelo" data-id="${d.id}">Jugar el duelo</button></section>`).join('')}
      <div class="seg etab rt-tabs" role="tablist">${[['liga', 'Liga'], ['duelos', 'Duelos'], ['tienda', 'Tienda']].map(([k, l]) => `<button type="button" role="tab" data-a="rtab" data-k="${k}" aria-pressed="${tab === k}">${l}${k === 'duelos' && retosPend().length ? ` · ${retosPend().length}` : ''}</button>`).join('')}</div>
      ${tab === 'liga' ? (() => { const F = Object.entries(J.todos).filter(([, d]) => d && d.ultima && !d.oculta && Date.now() - d.ultima.ts < 4 * 864e5).sort((a, b) => b[1].ultima.ts - a[1].ultima.ts).slice(0, 4);
          return F.length ? `<section class="card hall"><h2>Lo último que ha salido</h2>${F.map(([u, d]) => { const m = MSC().LISTA.find(x => x[0] === d.ultima.id) || [], R = MSC().RAREZA[m[2]] || ['', '#999']; return `<div class="hl">${mscH(d.ultima.id, 'msc hl-p')}<span><b>${esc(d.n)}</b> ha sacado ${/a$/.test(m[1] || '') ? 'una' : 'un'} <b style="color:${R[1]}">${esc(m[1] || '')}</b> <small>${R[0].toLowerCase()}</small></span></div>`; }).join('')}</section>` : ''; })() : ''}
      ${tab === 'liga' ? `<section class="card"><div class="card-h"><h2>Liga de la semana</h2><span class="sub">tu mejor partida de cada día · se reinicia el lunes</span></div>${ligaH}</section>` : tab === 'duelos' ? duelosH : tiendaH}
      ${y.oculta ? '<p class="sub">No sales en la liga ni te pueden retar. Lo cambias en «Mis datos».</p>' : ''}`, { nav: isAdmin() ? navA() : navJ(), right: isAdmin() ? '<button class="btn ghost small" type="button" data-a="out">Salir</button>' : '' });
  }

  // ================= piezas visuales del panel (25 oct): más dibujo y menos texto =================
  const RIC = {
    baja: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    dolor: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>',
    nota: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    partido: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4.5 9.5h15M4.5 14.5h15"/>',
    carga: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    reloj: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  };
  const ric = k => `<svg class="ric" viewBox="0 0 24 24" aria-hidden="true">${RIC[k] || RIC.nota}</svg>`;
  const chipsHTML = R => R.length ? `<span class="rchips">${R.map(r => `<span class="rchip ${r.lvl}">${ric(r.ic)}${esc(r.c || r.txt)}</span>`).join('')}</span>` : '';
  const nom1 = u => ((A.jug[u] || {}).nombre || '').split(' ')[0];
  const avDe = u => avatarSVG((A.jug[u] || {}).av, nivelDe(puntos(diasDe(u), semDe(u))), nom1(u));
  const ORD = { bad: 0, warn: 1, none: 2, ok: 3 };
  const top1 = e => e.R.slice().sort((a, b) => (ORD[a.lvl] ?? 4) - (ORD[b.lvl] ?? 4))[0];
  // medidor de 270°: cómo llegan, del 1 al 10, con una marca en lo normal
  function gaugeSVG(v, base, label) {
    const R = 50, cx = 64, cy = 62, a0 = Math.PI * 0.75, sp = Math.PI * 1.5, P = (f, r = R) => [cx + r * Math.cos(a0 + sp * f), cy + r * Math.sin(a0 + sp * f)];
    const arc = (f0, f1) => { const [x0, y0] = P(f0), [x1, y1] = P(f1); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 ${(f1 - f0) * sp > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
    const lvl = v == null ? 'none' : v <= 4.5 ? 'bad' : base != null && v <= base - 1 ? 'warn' : 'ok', f = v == null ? 0 : Math.max(0.01, (v - 1) / 9);
    const tick = base != null ? (([x0, y0], [x1, y1]) => `<line class="g-base" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`)(P((base - 1) / 9, R - 11), P((base - 1) / 9, R + 11)) : '';
    return `<svg class="gauge ${lvl}" viewBox="0 0 128 112" role="img" aria-label="${esc(label)}: ${fmt1(v)} de 10${base != null ? ', suele ' + fmt1(base) : ''}"><path class="g-bg" d="${arc(0, 1)}"/>${v != null ? `<path class="g-v" d="${arc(0, f)}"/>` : ''}${tick}
      <text x="64" y="68" class="g-n">${fmt1(v)}</text><text x="64" y="86" class="g-s">${base != null ? 'suele ' + fmt1(base) : 'de 10'}</text></svg>`;
  }
  // anillo pequeño: una fracción (responden, diarios)
  function ringSVG(fr, txt, label) {
    const r = 19, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, fr || 0));
    return `<svg class="ring" viewBox="0 0 48 48" role="img" aria-label="${esc(label)}"><circle class="r-bg" cx="24" cy="24" r="${r}"/><circle class="r-v" cx="24" cy="24" r="${r}" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 24 24)"/><text x="24" y="28">${esc(txt)}</text></svg>`;
  }
  // color de una casilla del 1 al 10 (10 = lo mejor)
  const hcls = v => v == null ? 'h0' : v <= 3 ? 'h1' : v <= 5 ? 'h2' : v <= 6 ? 'h3' : v <= 8 ? 'h4' : 'h5';
  // mapa de los últimos días: una columna por día con respuesta, una fila por pregunta
  function heatHTML(D, t) {
    const ks = []; for (let i = 20; i >= 0; i--) { const k = addDays(t, -i), d = D[k]; if (d && (d.antes || (d.ses || []).length)) ks.push(k); }
    const K = ks.slice(-8); if (!K.length) return '<p class="sub">Sin respuestas en las últimas tres semanas.</p>';
    const cell = (v, cls, tit) => `<td class="${cls}" title="${esc(tit)}">${v ?? ''}</td>`;
    const rows = WELL.map(w => `<tr><th scope="row">${esc(w.s)}</th>${K.map(k => { const a = (D[k] || {}).antes, v = a && a[w.k] >= 1 ? Math.round(diez(a[w.k], a)) : null; return cell(v, hcls(v), `${w.n} · ${fmtShort(k)}: ${v ?? '—'}`); }).join('')}</tr>`).join('');
    const rpe = `<tr class="sep"><th scope="row">Esfuerzo</th>${K.map(k => { const L = (D[k] || {}).ses || [], v = L.length ? Math.max(...L.map(s => +s.rpe || 0)) : null; return `<td class="${v ? 'e' + Math.min(5, Math.ceil(v / 2)) : 'h0'}" title="Esfuerzo · ${fmtShort(k)}: ${v ?? '—'}">${v ?? ''}</td>`; }).join('')}</tr>`;
    const mins = `<tr><th scope="row">Minutos</th>${K.map(k => { const L = (D[k] || {}).ses || []; return `<td class="mn">${L.length ? L.reduce((s, x) => s + (+x.min || 0), 0) : ''}</td>`; }).join('')}</tr>`;
    const nota = `<tr><th scope="row">Escribe</th>${K.map(k => { const d = D[k] || {}, n = [(d.antes || {}).nota, ...(d.ses || []).map(x => x.nota)].filter(Boolean); return `<td class="nt">${n.length ? `<span title="${esc(n.join(' · '))}">${ric('nota')}</span>` : ''}</td>`; }).join('')}</tr>`;
    const head = `<tr><th></th>${K.map(k => { const d = dateOf(k); return `<th scope="col"><small>${DIAS3[d.getDay()][0].toUpperCase()}</small>${d.getDate()}</th>`; }).join('')}</tr>`;
    return `<div class="heat-wrap"><table class="heat"><thead>${head}</thead><tbody>${rows}${rpe}${mins}${nota}</tbody></table></div>
      <div class="heat-leg"><span><i class="h1"></i>1–3</span><span><i class="h2"></i>4–5</span><span><i class="h3"></i>6</span><span><i class="h4"></i>7–8</span><span><i class="h5"></i>9–10</span></div>`;
  }
  // una burbuja con lo que ha escrito una jugadora
  const bubHTML = (u, txt, sub) => `<button type="button" class="bub" data-jug="${u}"><span class="bav">${avDe(u)}</span><span class="bt"><b>${esc(nom1(u))}${sub ? ` <small>${esc(sub)}</small>` : ''}</b><span>«${esc(txt)}»</span></span></button>`;

  // ================= Dirección Técnica =================
  // pestañas de la DT (26 oct, noche): Altas pasa a estar dentro de «Jugadoras» y entra el «Buzón»
  const navA = () => { const nb = buzonItems(today()).filter(x => x.pend).length, na = pendientes().length;
    return `<nav class="nav" aria-label="Secciones">${[['resumen', 'Equipo'], ['buzon', 'Buzón'], ['equipo', 'Jugadoras'], ['partidos', 'Partidos'], ['reto', 'Reto']].map(([k, l]) => `<button type="button" data-av="${k}" aria-current="${view === k || ((view === 'detalle' || view === 'acceso') && k === 'equipo') || (view === 'partido' && k === 'partidos') ? 'page' : 'false'}">${ico(k)}${l}${k === 'buzon' && nb ? `<i class="nbad">${nb}</i>` : ''}${k === 'equipo' && na ? `<i class="nbad">${na}</i>` : ''}</button>`).join('')}</nav>`; };
  const activas = () => Object.keys(A.jug).filter(u => (A.acc[u] || {}).activa).sort((a, b) => (A.jug[a].nombre || '').localeCompare(A.jug[b].nombre || '', 'es'));
  const pendientes = () => Object.keys(A.jug).filter(u => !(A.acc[u] || {}).activa && !(A.acc[u] || {}).ts);
  const desactivadas = () => Object.keys(A.jug).filter(u => (A.acc[u] || {}).activa === false && (A.acc[u] || {}).ts);
  const eqDe = u => (A.acc[u] || {}).equipo || (A.jug[u] || {}).equipo;
  const diasDe = u => (A.regs[u] || {}).dias || {};
  const semDe = u => (A.regs[u] || {}).semanas || {};
  // tarjeta de una jugadora: su personaje, cómo está y su línea de las últimas sesiones
  function pcardHTML({ u, e }) {
    const D = diasDe(u), t = today(), ks = Object.keys(D).filter(k => k <= t && wellScore((D[k] || {}).antes) != null).sort().slice(-8);
    const v = ks.map(k => wellScore(D[k].antes)), Y = x => 31 - (x - 1) / 9 * 28, X = i => 4 + i * (132 / Math.max(1, 7));
    const col = { bad: 'var(--bad)', warn: 'var(--warn)', ok: 'var(--accent)', none: 'var(--muted)' }[e.lvl];
    const band = e.base != null ? `<rect x="0" y="${Y(Math.min(10, e.base + 0.9)).toFixed(1)}" width="140" height="${(Y(Math.max(1, e.base - 0.9)) - Y(Math.min(10, e.base + 0.9))).toFixed(1)}" rx="4" style="fill:var(--blush)"/>` : '';
    const line = v.length > 1 ? `<polyline points="${v.map((x, i) => X(i).toFixed(1) + ',' + Y(x).toFixed(1)).join(' ')}" style="fill:none;stroke:${col};stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/>` : '';
    const dot = v.length ? `<circle cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="3.2" style="fill:${col}"/>` : '';
    let resp = 0, ent = 0; for (let i = 0; i < 14; i++) { const d = addDays(t, -i); if (entrena(calOf(A.cal), d)) { ent++; if ((D[d] || {}).antes) resp++; } }
    return `<button type="button" class="pcard" data-jug="${u}"><span class="top2">${avatarSVG((A.jug[u] || {}).av, nivelDe(puntos(D, semDe(u))), 'Su jugadora')}<span style="min-width:0"><span class="nm">${esc((A.jug[u].nombre || '').split(' ')[0])}</span>${stHTML(e.lvl)}</span></span>
      <svg class="spark" viewBox="0 0 140 34" preserveAspectRatio="none" role="img" aria-label="Cómo ha llegado en sus últimas respuestas">${band}${line}${dot}</svg>
      <span class="nums"><span>Llega<b>${fmt1(e.s)}</b></span><span>Carga<b>${e.L.ratio == null ? '—' : '×' + fmt1(e.L.ratio)}</b></span><span>Responde<b>${resp}/${ent}</b></span></span></button>`;
  }
  actions.tabla = async () => { A.tabla = !A.tabla; render(); };
  function equipoView() {
    const t = today(), lunes = mondayOf(t), U2 = activas();
    const rows = ordenadas(t);
    const n = { bad: 0, warn: 0 }; rows.forEach(r => { if (n[r.e.lvl] != null) n[r.e.lvl]++; });
    shell(`<div class="dt-h"><div><span class="kicker">${esc(fmtDay(t))}</span><h1>Jugadoras</h1></div><button class="btn small${pendientes().length ? ' primary' : ''}" type="button" data-av="acceso">${ico('acceso')}Altas${pendientes().length ? ' · ' + pendientes().length : ''}</button></div><div><p class="sub">${rows.length} ${rows.length === 1 ? 'activa' : 'activas'}${n.bad ? ` · ${n.bad} para revisar` : ''}${n.warn ? ` · ${n.warn} con algo que mirar` : ''}. Solo lo ves tú.</p></div>
      <div class="row between"><div class="seg" role="group" aria-label="Filtrar">${[['todas', `Todas · ${rows.length}`], ['mirar', `Para mirar · ${rows.filter(r => r.e.lvl === 'bad' || r.e.lvl === 'warn').length}`], ['sin', `Sin responder · ${rows.filter(r => r.e.lvl === 'none' || (r.e.last && daysBetween(r.e.last, t) >= 4)).length}`]].map(([k, l]) => `<button type="button" data-pf="${k}" aria-pressed="${(A.pf || 'todas') === k}">${l}</button>`).join('')}</div>
        <button class="btn ghost small" type="button" data-a="tabla">${A.tabla ? 'Ver tarjetas' : 'Ver tabla'}</button></div>
      ${A.tabla ? '' : `<div class="pcards">${rows.filter(r => (A.pf || 'todas') === 'todas' || (A.pf === 'mirar' ? (r.e.lvl === 'bad' || r.e.lvl === 'warn') : (r.e.lvl === 'none' || (r.e.last && daysBetween(r.e.last, t) >= 4)))).map(pcardHTML).join('') || '<p class="sub">Nadie en este grupo.</p>'}</div>`}
      <section class="card"${A.tabla || !rows.length ? '' : ' hidden'}>${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Jugadora</th><th>Estado</th><th class="num">Llega hoy</th><th class="num">Su media</th><th class="num">Carga 7 días</th><th class="num">Semana / mes</th><th>Última respuesta</th><th>Semana</th></tr></thead><tbody>
        ${rows.map(({ u, e }) => `<tr class="click" data-jug="${u}" tabindex="0"><td><b>${esc(A.jug[u].nombre)}</b></td><td>${stHTML(e.lvl)}</td><td class="num">${fmt1(e.s)}</td><td class="num">${fmt1(e.base)}</td><td class="num">${fmtInt(e.L.acute)}</td><td class="num">${e.L.ratio == null ? '—' : fmt1(e.L.ratio)}</td><td>${e.last ? esc(e.last === t ? 'hoy' : fmtShort(e.last)) : '—'}</td><td>${semDe(u)[lunes] ? 'Hecha' : '—'}</td></tr>`).join('')}</tbody></table></div>
        <p class="chart-note">«Llega hoy»: media de sus cinco respuestas de hoy (1 a 10). «Semana / mes»: carga de los últimos 7 días dividida por su media semanal del último mes; necesita 3 semanas de datos. Es una referencia, no un predictor de lesiones: solo da aviso fuerte si además llega peor de lo normal en ella.</p>` : `<p class="sub">${activas().length ? '' : 'Todavía no hay jugadoras activas. Actívalas en «Altas» cuando tengas su consentimiento firmado.'}</p>`}</section>`, { nav: navA(), wide: true, right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  // resumen de un equipo: cuántas han respondido, cómo llega el equipo, su esfuerzo y a quién mirar
  const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  // cuadrante: horizontal, cómo llega frente a lo normal en ella; vertical, carga de la semana frente a su mes
  function cuadranteHTML(us, ref) {
    const t = today(), P = [], sin = [];
    us.forEach(u => { const D = diasDe(u), e = estado(D, ref), L = loads(D, t); if (e.s != null && e.base != null && L.ratio != null) P.push({ u, x: Math.max(-2.7, Math.min(2.7, e.s - e.base)), y: Math.max(0.66, Math.min(1.74, L.ratio)), lvl: e.lvl }); else sin.push(u); });
    if (!P.length) return `<section class="card"><h2>Cómo llegan y cuánto cargan</h2><p class="sub">Saldrá cuando haya unas semanas de respuestas: necesita lo normal de cada una y su carga del mes.</p></section>`;
    const X = x => 34 + (x + 3) / 6 * 320, Y = y => 8 + (1.8 - y) / 1.2 * 322, xm = X(0), ym = Y(1.3);
    const col = { bad: 'var(--bad)', warn: 'var(--warn)', ok: 'var(--accent)', none: 'var(--muted)' };
    const dots = P.map(p => { const n = (A.jug[p.u].nombre || '?').trim(), ini = n.slice(0, 2); return `<g data-jug="${p.u}" tabindex="0" role="button" aria-label="${esc(n)}"><circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="13" style="fill:${col[p.lvl]};stroke:var(--surface);stroke-width:2"/><text x="${X(p.x).toFixed(1)}" y="${(Y(p.y) + 4).toFixed(1)}" text-anchor="middle" style="fill:var(--accent-ink);font-size:10.5px;font-weight:700">${esc(ini)}</text></g>`; }).join('');
    return `<section class="card"><h2>Cómo llegan y cuánto cargan</h2>
      <svg class="quad" viewBox="0 0 360 372" role="img" aria-label="Cuadrante de cómo llegan y cuánto cargan">
        <rect x="34" y="8" width="${(xm - 35).toFixed(1)}" height="${(ym - 9).toFixed(1)}" rx="10" style="fill:var(--bad-soft)"/>
        <rect x="${(xm + 1).toFixed(1)}" y="8" width="${(354 - xm - 1).toFixed(1)}" height="${(ym - 9).toFixed(1)}" rx="10" style="fill:var(--warn-soft)"/>
        <rect x="34" y="${(ym + 1).toFixed(1)}" width="${(xm - 35).toFixed(1)}" height="${(330 - ym - 1).toFixed(1)}" rx="10" style="fill:var(--lilac)"/>
        <rect x="${(xm + 1).toFixed(1)}" y="${(ym + 1).toFixed(1)}" width="${(354 - xm - 1).toFixed(1)}" height="${(330 - ym - 1).toFixed(1)}" rx="10" style="fill:var(--sage)"/>
        <text class="q-l" x="42" y="26" style="fill:var(--bad)">Cargada y peor</text><text class="q-l" x="${(xm + 9).toFixed(1)}" y="26" style="fill:var(--warn)">Cargada, pero bien</text>
        <text class="q-l" x="42" y="320" style="fill:var(--fg)">Peor sin cargar: ¿algo fuera?</text><text class="q-l" x="${(xm + 9).toFixed(1)}" y="320" style="fill:var(--good)">Fresca</text>
        <text class="ax" x="28" y="18" text-anchor="end">×1,8</text><text class="ax" x="28" y="${(ym + 4).toFixed(1)}" text-anchor="end">×1,3</text><text class="ax" x="28" y="330" text-anchor="end">×0,6</text>
        ${dots}
        <text class="ax" x="194" y="350" text-anchor="middle">← Llega peor que lo normal en ella · Mejor →</text>
        <text class="ax" x="194" y="366" text-anchor="middle">Arriba: más carga que su media del mes</text></svg>
      ${sin.length ? `<p class="sub">${sin.length} sin datos suficientes todavía.</p>` : ''}</section>`;
  }
  // ================= lo importante (26 oct): orden de prioridad, respuestas pendientes y paso de una ficha a otra =================
  // lo que han escrito en los últimos 7 días y todavía no has contestado (notas, partidos y el diario de esta semana)
  // (desde el 26 oct, noche, sale del buzón: lo de los últimos 14 días sin contestar ni marcar como leído)
  function porContestar(u, t) { return itemsDe(u, t).filter(x => x.pend).map(x => x.k); }
  // ================= buzón (26 oct, noche): todo lo que cuentan en un sitio, para contestar rápido =================
  // claves de acceso/{uid}.resp: d:fecha (antes y después de ese día), p:fecha:id (un partido), s:lunes (diario de la semana)
  // «Leído» guarda {visto: true, ts} sin texto: ella ve que lo has leído aunque no le escribas nada
  const BUZ_DIAS = 14;
  const PREG = ['¿Qué crees que lo ha provocado?', '¿Qué podrías probar la próxima vez?', '¿Cómo te puedo ayudar?', '¿Qué harías distinto?', '¿Qué te ha funcionado?', '¿Cómo lo vas a notar en el próximo entreno?'];
  function itemsDe(u, t, n = BUZ_DIAS) {
    const D = diasDe(u), S = semDe(u), out = [];
    for (let i = 0; i < n; i++) { const k = addDays(t, -i), d = D[k] || {}, tx = [];
      if ((d.antes || {}).nota) tx.push(['Antes del entreno', d.antes.nota]);
      (d.ses || []).filter(z => z.nota && !z.pid).forEach(z => tx.push([`Después · esfuerzo ${z.rpe}, ${z.min} min`, z.nota]));
      if (d.diario) { const x = d.diario; [['Diario · ' + (TIEMPO[(x.tiempo || 3) - 1] || [])[1] + ' · lo mejor', x.mejor], ['Mi rincón', x.rincon], ['Cambiaría', x.cambiar], ['Cómo lo hará', x.como]].forEach(z => { if (z[1]) tx.push(z); }); }
      if (tx.length) out.push({ u, k: 'd:' + k, f: k, tit: '', tx });   // la fecha ya va en el título del grupo
      Object.entries(d.partidos || {}).forEach(([id, pd]) => { if (!pd) return; const tp = [['Antes: se fija en', (pd.pre || {}).objetivo], ['Mejor decisión', pd.mejor], ['Cambiaría', pd.cambiar], ['Se lleva', pd.llevo]].filter(x => x[1]);
        if (tp.length) out.push({ u, k: 'p:' + k + ':' + id, f: k, tit: `Partido · ${pd.cat || ''} contra ${pd.rival || ''}`, tx: tp }); }); }
    Object.keys(S).filter(l => l <= t && daysBetween(l, t) < n + 6).forEach(l => { const x = S[l] || {}, tx = [['Lo mejor', x.mejor], ['Cambiaría', x.cambiar], ['Cómo lo hará', x.como], ['Se compromete a', compOf(x)]].filter(z => z[1]);
      if (tx.length) out.push({ u, k: 's:' + l, f: addDays(l, 6) > t ? t : addDays(l, 6), tit: 'Diario · semana del ' + fmtShort(l), tx }); });
    out.forEach(x => { x.r = respOf(A.acc[u], x.k); x.pend = !x.r; });
    return out;
  }
  const TRK = { d: 0, p: 1, s: 2 };
  const buzonItems = t => activas().flatMap(u => itemsDe(u, t)).sort((a, b) => b.f.localeCompare(a.f) || (a.pend === b.pend ? 0 : a.pend ? -1 : 1) || TRK[a.k[0]] - TRK[b.k[0]] || nom1(a.u).localeCompare(nom1(b.u), 'es'));
  function buzRespHTML(x, id) {
    const r = x.r, ek = x.u + '|' + x.k;
    if (r && !A.editResp[ek]) return `<div class="resp-done">${r.t ? `<span><b>Tu respuesta:</b> ${esc(r.t)}</span>` : `<span class="bz-ok">${ric('ok')}Leído</span>`}<button class="btn ghost small" type="button" data-a="editresp" data-u="${x.u}" data-k="${x.k}">${r.t ? 'Cambiar' : 'Escribirle'}</button></div>`;
    // cerrado: solo dos botones (el buzón se lee de un vistazo); al tocar «Contestar» salen las preguntas y la caja
    if (!r && !A.editResp[ek]) return `<div class="bz-acts"><button class="btn small primary" type="button" data-a="editresp" data-u="${x.u}" data-k="${x.k}" data-foco="${id}">Contestar</button><button class="btn small" type="button" data-a="leido" data-u="${x.u}" data-k="${x.k}">${ric('ok')}Leído</button></div>`;
    return `<div class="bz-chips" role="group" aria-label="Preguntas rápidas">${PREG.map((q, i) => `<button type="button" class="bz-chip" data-a="pregunta" data-in="${id}" data-q="${i}">${esc(q)}</button>`).join('')}</div>
      <div class="resp-box"><textarea id="${id}" maxlength="400" rows="2" placeholder="Contéstale: lo verá en su app. Mejor con una pregunta." aria-label="Tu respuesta a ${esc(nom1(x.u))}">${esc(r && r.t ? r.t : '')}</textarea>
        <span class="bz-acts"><button class="btn small primary" type="button" data-a="resp" data-u="${x.u}" data-k="${x.k}" data-in="${id}">Enviar</button>${r ? '' : `<button class="btn small ghost" type="button" data-a="leido" data-u="${x.u}" data-k="${x.k}">Leído</button>`}</span></div>`;
  }
  const buzItemHTML = x => { const id = ('bz-' + x.u + '-' + x.k).replace(/[^a-z0-9-]/gi, '');
    return `<article class="bz${x.pend ? ' pend' : ''}"><header class="bz-h"><button type="button" class="bz-who" data-jug="${x.u}"><span class="bav">${avDe(x.u)}</span><b>${esc(nom1(x.u))}</b></button>${x.tit ? `<span class="bz-t">${esc(x.tit)}</span>` : ''}</header>
      ${x.tx.map(([l, v]) => `<p class="bz-q"><span>${esc(l)}</span>«${esc(v)}»</p>`).join('')}${buzRespHTML(x, id)}</article>`; };
  function buzonView() {
    const t = today(), L = buzonItems(t), P = L.filter(x => x.pend), tab = A.btab || (P.length ? 'pend' : 'todo'), V = tab === 'pend' ? P : L;
    const fechas = [...new Set(V.map(x => x.f))];
    shell(`<div class="dt-h"><div><span class="kicker">Lo que te cuentan · últimos ${BUZ_DIAS} días</span><h1>Buzón</h1></div>
        <div class="seg etab" role="tablist">${[['pend', `Por contestar${P.length ? ' · ' + P.length : ''}`], ['todo', 'Todo']].map(([k, l]) => `<button type="button" role="tab" data-btab="${k}" aria-pressed="${tab === k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div></div>
      <p class="sub">Mejor contestar con una pregunta: les hace pensar. Si no hace falta escribir, «Leído»: verán que lo has leído.</p>
      ${tab === 'pend' && P.length > 5 ? `<button class="btn ghost small" type="button" data-a="leertodo">Marcar las ${P.length} como leídas</button>` : ''}
      ${V.length ? fechas.map(f => `<h3 class="bz-d">${esc(f === t ? 'Hoy' : fmtDay(f))}</h3><div class="bzs">${V.filter(x => x.f === f).map(buzItemHTML).join('')}</div>`).join('')
        : tab === 'pend' ? `<section class="card"><p class="calm">${ric('ok')}Todo contestado.</p></section>` : '<section class="card"><p class="sub">Nadie ha escrito nada en estos días.</p></section>'}`,
      { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  actions.pregunta = async b => { const el = document.getElementById(b.dataset.in); if (!el) return; const q = PREG[+b.dataset.q] || ''; el.value = (el.value.trim() ? el.value.trim() + ' ' : '') + q; el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
  actions.leertodo = async b => {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Pulsa otra vez: todas verán «Leído»'; return; }
    const P = buzonItems(today()).filter(x => x.pend), ts = Date.now(), por = {};
    P.forEach(x => { por[x.u] = por[x.u] || Object.assign({}, (A.acc[x.u] || {}).resp || {}); por[x.u][x.k] = { visto: true, ts }; });
    for (const [u, resp] of Object.entries(por)) { await B.merge('acceso/' + u, { resp }); A.acc[u] = Object.assign({}, A.acc[u] || {}, { resp }); }
    toast('Todo marcado como leído.'); render();
  };
  actions.leido = async b => {
    const u = b.dataset.u, k = b.dataset.k, resp = Object.assign({}, (A.acc[u] || {}).resp || {}); resp[k] = { visto: true, ts: Date.now() };
    await B.merge('acceso/' + u, { resp }); A.acc[u] = Object.assign({}, A.acc[u] || {}, { resp }); toast('Marcado como leído.'); render();
  };
  // todas en orden de prioridad: revisar, atención, algo que contar o por contestar, sin datos, bien
  // la carga baja es solo información: no hace a nadie «importante»; tampoco un diario sin contestar (eso va al contador)
  const suave = x => x.lvl === 'info' && (x.ic === 'carga' || x.c === 'Muy rápido');
  function ordenadas(t) {
    const rk = r => r.e.lvl === 'bad' ? 0 : r.e.lvl === 'warn' ? 1 : (r.e.R.some(x => x.lvl === 'info' && !suave(x)) || r.pc.some(k => k[0] !== 's')) ? 2 : r.e.lvl === 'none' ? 3 : 4;
    return activas().map(u => ({ u, e: estado(diasDe(u), t), pc: porContestar(u, t) })).map(r => Object.assign(r, { rk: rk(r) }))
      .sort((a, b) => a.rk - b.rk || (a.e.s ?? 99) - (b.e.s ?? 99) || nom1(a.u).localeCompare(nom1(b.u), 'es'));
  }
  const byOrd = (a, b) => (ORD[a.lvl] ?? (a.lvl === 'info' ? 2.5 : 4)) - (ORD[b.lvl] ?? (b.lvl === 'info' ? 2.5 : 4));
  function impHTML({ u, e, pc }) {
    const R = e.R.filter(r => r.lvl !== 'none' && !suave(r)).sort(byOrd), r0 = R[0], nota = ((diasDe(u)[today()] || {}).antes || {}).nota;
    return `<button type="button" class="imp ${e.lvl}" data-jug="${u}"><span class="imp-av">${avDe(u)}</span>
      <span class="imp-b"><span class="imp-t"><b>${esc(nom1(u))}</b>${pc.length ? `<span class="pc" title="Por contestar">${ric('nota')}${pc.length}</span>` : ''}</span>
        ${r0 ? `<span class="imp-h ${r0.lvl}">${ric(r0.ic)}${esc(r0.c || r0.txt)}</span>` : `<span class="imp-h info">${ric('nota')}${pc.length === 1 ? 'Te ha escrito: contéstale' : `${pc.length} cosas por contestar`}</span>`}
        ${R.length > 1 ? chipsHTML(R.slice(1)) : ''}${nota ? `<span class="imp-q">«${esc(nota)}»</span>` : ''}</span><span class="imp-go" aria-hidden="true">›</span></button>`;
  }
  const irFicha = (u, from) => { A.sel = u; if (from) A.from = from; view = 'detalle'; render(); scrollTo({ top: 0 }); };
  function fichaVecina(d) { const L = ordenadas(today()).map(r => r.u), i = L.indexOf(A.sel); if (!L.length) return; irFicha(L[(i + d + L.length) % L.length]); }
  function resumenView() {
    const t = today(), cal = calOf(A.cal), tab = A.etab || 'hoy';
    let ref = t; for (let i = 0; i < 7; i++) { const d = addDays(t, -i); if (entrena(cal, d)) { ref = d; break; } }
    const us = activas(), rows = ordenadas(t);
    const resp = us.filter(u => (diasDe(u)[ref] || {}).antes).length;
    const media = mean(us.map(u => wellScore((diasDe(u)[ref] || {}).antes)).filter(x => x != null));
    const teamDias = {};
    for (let i = 0; i < 40; i++) { const d = addDays(t, -i), m = mean(us.map(u => wellScore((diasDe(u)[d] || {}).antes)).filter(x => x != null)); if (m != null) teamDias[d] = { antes: Object.assign(Object.fromEntries(WELL.map(w => [w.k, m])), { esc: 10 }) }; }
    const base = baseline(teamDias, ref), mLvl = media == null ? '' : media <= 4.5 ? 'bad' : base != null && media <= base - 1 ? 'warn' : 'ok';
    let acute = 0, chronic = 0, conDatos = 0; us.forEach(u => { const L = loads(diasDe(u), t); acute += L.acute; chronic += L.chronic; if (L.span >= 21) conDatos++; });
    const ratio = chronic > 0 && conDatos ? acute / chronic : null, pctC = ratio == null ? null : Math.round((ratio - 1) * 100);
    const imp = rows.filter(r => r.rk <= 2), pcTot = rows.reduce((s, r) => s + r.pc.length, 0), cnt = k => rows.filter(r => r.e.lvl === k).length;
    // diario de cada día (desde el 27 oct): cuántas lo han escrito hoy y el tiempo de toda la semana; el compromiso sigue siendo semanal
    const lunes = mondayOf(t), nd = daysBetween(lunes, t) + 1, diaDe = (u, k) => (diasDe(u)[k] || {}).diario;
    const dHoy = us.filter(u => diaDe(u, t)).length, dSem = us.reduce((a, u) => a + [...Array(nd)].filter((_, i) => diaDe(u, addDays(lunes, i))).length, 0);
    const cerradas = us.filter(u => compOf(semDe(u)[lunes])).length;
    const sem = us.map(u => semDe(u)[lunes]).filter(Boolean), ti = us.flatMap(u => [...Array(nd)].map((_, i) => (diaDe(u, addDays(lunes, i)) || {}).tiempo)).filter(Boolean), cu = sem.map(x => x.cumplida).filter(Boolean), cuN = k => cu.filter(x => x === k).length;
    const prox = allPart(A.cal).filter(x => x.fecha >= t && daysBetween(t, x.fecha) <= 3).slice(0, 2);
    const nR = x => { const L = us.map(u => respPart(u, x)).filter(Boolean); return `<span class="hoy">${L.filter(p => p.pre).length} antes · ${L.filter(p => p.juega).length} después</span>`; };
    const ks = (v, l, cls = '', sub = '') => `<div class="ks ${cls}"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const cinco = WELL.map(w => { const v = mean(us.map(u => { const a = (diasDe(u)[ref] || {}).antes; return a && a[w.k] >= 1 ? diez(a[w.k], a) : null; }).filter(x => x != null));
      const B0 = []; us.forEach(u => { for (let i = 1; i <= 28; i++) { const a = (diasDe(u)[addDays(ref, -i)] || {}).antes; if (a && a[w.k] >= 1) B0.push(diez(a[w.k], a)); } });
      const b = B0.length >= 7 ? mean(B0) : null, dl = v != null && b != null ? v - b : null;
      return `<div class="c5 ${hcls(v == null ? null : Math.round(v))}"><span class="c5-f">${face(v == null ? 3 : Math.max(1, Math.min(5, Math.ceil(v / 2))))}</span><b>${fmt1(v)}</b><small>${esc(w.s)}</small>${dl != null && Math.abs(dl) >= 0.5 ? `<span class="dl ${dl < 0 ? 'down' : 'up'}">${dl < 0 ? '↓' : '↑'}${fmt1(Math.abs(dl))}</span>` : '<span class="dl"></span>'}</div>`; }).join('');
    const pf = ({ u, e }) => { const r = e.R.slice().sort(byOrd)[0]; return `<button type="button" class="pf ${e.lvl}" data-jug="${u}"><span class="pf-av">${avDe(u)}${r && e.lvl !== 'ok' ? `<i class="pf-b ${r.lvl}">${ric(r.ic)}</i>` : ''}</span><b>${esc(nom1(u))}</b><small>${e.s != null ? fmt1(e.s) : '—'}</small></button>`; };
    // después del entreno (26 oct, noche): cuántas lo han contado, su esfuerzo frente a lo normal en ellas, minutos, carga y lo que han escrito
    const despDe = u => ((diasDe(u)[ref] || {}).ses || []).filter(z => !z.pid), conD = us.filter(u => despDe(u).length);
    const rpeDe = u => Math.max(...despDe(u).map(z => +z.rpe || 0)), minDe = u => despDe(u).reduce((a, z) => a + (+z.min || 0), 0), cargaDe = u => despDe(u).reduce((a, z) => a + (+z.rpe || 0) * (+z.min || 0), 0);
    const suele = u => { const v = []; for (let i = 1; i <= 28; i++) ((diasDe(u)[addDays(ref, -i)] || {}).ses || []).filter(z => !z.pid).forEach(z => v.push(+z.rpe)); return v.length >= 3 ? mean(v) : null; };
    const rM = mean(conD.map(rpeDe)), sM = mean(conD.map(suele).filter(x => x != null)), dR = rM != null && sM != null ? rM - sM : null;
    const notasD = conD.flatMap(u => despDe(u).filter(z => z.nota).map(z => [u, z.nota]));
    const efH = conD.map(u => ({ u, r: rpeDe(u), s: suele(u) })).sort((a, b) => b.r - a.r).map(({ u, r, s: su }) => `<button type="button" class="ef${r >= 9 || (su != null && r - su >= 2) ? ' alto' : ''}" data-jug="${u}"><span class="ef-av">${avDe(u)}</span><b class="ef-n" style="background:${RAMP[Math.max(1, Math.min(10, r)) - 1]};color:${r > 5 ? '#fff' : '#221c1d'}">${r}</b><small>${esc(nom1(u))}</small></button>`).join('');
    const faltan = us.filter(u => !despDe(u).length && (diasDe(u)[ref] || {}).antes);
    const despH = entrena(cal, ref) || conD.length ? `<section class="card desp-dt"><div class="card-h"><h2>Después del entreno</h2><span class="sub">${conD.length} de ${us.length} lo han contado</span></div>
      ${conD.length ? `<div class="dstats"><span><b>${fmt1(rM)}</b>esfuerzo${dR != null && Math.abs(dR) >= 0.5 ? `<i class="dl ${dR > 0 ? 'up' : 'down'}">${dR > 0 ? '↑' : '↓'}${fmt1(Math.abs(dR))}</i>` : ''}<small>${sM != null ? 'suelen ' + fmt1(sM) : 'del 1 al 10'}</small></span><span><b>${fmtInt(mean(conD.map(minDe)))}</b>minutos<small>de media</small></span><span><b>${fmtInt(mean(conD.map(cargaDe)))}</b>carga<small>esfuerzo × minutos</small></span></div>
        <div class="efs">${efH}</div>${faltan.length ? `<p class="sub">Contaron el antes pero no el después: ${faltan.map(u => esc(nom1(u))).join(', ')}.</p>` : ''}
        ${notasD.length ? `<div class="bubs">${notasD.slice(0, 4).map(([u, n]) => bubHTML(u, n, 'después')).join('')}</div>${notasD.length > 4 ? `<button class="btn ghost small" type="button" data-av="buzon">Ver las ${notasD.length} en el buzón</button>` : ''}` : ''}`
        : `<p class="sub">${ref === t ? 'Todavía nadie lo ha contado. Les llega el aviso al acabar (a las 21:00 si no lo han cambiado).' : 'Nadie contó el después de ese entreno.'}</p>`}</section>` : '';
    const hoy = `<div class="kstrip">${ks(fmt1(media), 'Cómo llegan', mLvl, base != null ? 'suele ' + fmt1(base) : 'del 1 al 10')}${ks(`${resp}/${us.length}`, 'Antes', resp < us.length / 2 ? 'warn' : '', `después ${conD.length} · diario ${us.filter(u => (diasDe(u)[t] || {}).diario).length}`)}<button type="button" class="ks ks-b ${pcTot ? 'info' : ''}" data-av="buzon"><b>${pcTot}</b><span>Por contestar</span><small>abrir el buzón ›</small></button></div>
      ${pendientes().length ? `<button type="button" class="aviso-altas" data-av="acceso">${ico('acceso')}<span><b>${pendientes().length === 1 ? '1 cuenta espera' : pendientes().length + ' cuentas esperan'} el alta</b><small>Actívalas cuando tengas el consentimiento firmado</small></span>›</button>` : ''}
      <section class="card imp-card"><div class="card-h"><h2>Lo importante</h2><span class="leg">${['bad', 'warn'].map(k => cnt(k) ? `<span class="lg ${k}"><i></i>${cnt(k)}</span>` : '').join('')}</span></div>
        ${imp.length ? `<div class="imps">${imp.map(impHTML).join('')}</div>` : `<p class="calm">${ric('ok')}Todo en orden. Nadie con avisos ni nada por contestar.</p>`}</section>
      ${despH}
      ${prox.length ? `<section class="strip"><div class="strip-h"><h2>${prox[0].fecha === t ? 'Partido de hoy' : 'Próximo partido'}</h2></div><div class="tkts">${prox.map(x => ticketHTML(x, nR(x), `data-part="${x.id}"`)).join('')}</div></section>` : ''}
      <section class="card"><div class="card-h"><h2>Cada una</h2><span class="sub">toca para ver su ficha</span></div><div class="pfs">${rows.map(pf).join('')}</div></section>
      <section class="card"><div class="card-h"><h2>Las cinco</h2><span class="sub">hoy · ↑↓ frente a lo normal</span></div><div class="cinco">${cinco}</div></section>`;
    const semana = `<div class="kstrip">${ks(pctC == null ? '—' : (pctC > 0 ? '+' : '') + pctC + '%', 'Carga', pctC == null ? '' : pctC > 30 ? 'bad' : pctC > 15 || pctC < -20 ? 'warn' : 'ok', 'frente a su mes')}${ks(us.length ? Math.round(dSem / (us.length * nd) * 100) + '%' : '—', 'Diarios', dSem < us.length * nd / 2 ? 'warn' : '', 'de los días posibles')}${ks(cu.length ? Math.round(cuN('si') / cu.length * 100) + '%' : '—', 'Compromisos', '', 'cumplidos')}</div>
      <section class="card"><h2>Cómo llegan · 4 semanas</h2>${wellChart(teamDias, t)}</section>
      ${cuadranteHTML(us, ref)}
      <section class="card"><div class="card-h"><h2>Diario de la semana</h2><span class="sub">hoy ${dHoy} de ${us.length} · ${cerradas} con compromiso</span></div>
        ${ti.length ? `<div class="wx-sum">${TIEMPO.map(([v, l]) => `<span class="${ti.includes(v) ? '' : 'off'}">${wx(v)}<b>${ti.filter(x => x === v).length}</b><small>${l}</small></span>`).join('')}</div>` : '<p class="sub">Nadie ha escrito todavía esta semana.</p>'}
        ${cu.length ? `<div class="segbar" role="img" aria-label="Compromiso anterior: ${cuN('si')} cumplidos, ${cuN('medias')} a medias, ${cuN('no')} no">${['si', 'medias', 'no'].map(k => cuN(k) ? `<i class="${k}" style="flex:${cuN(k)}"></i>` : '').join('')}</div>
          <div class="seg-leg"><span><i class="si"></i>${cuN('si')} cumplidos</span><span><i class="medias"></i>${cuN('medias')} a medias</span><span><i class="no"></i>${cuN('no')} no</span></div>` : ''}</section>`;
    shell(`<div class="dt-h"><div><span class="kicker">${ref === t ? 'Hoy' : 'Último entreno'} · ${esc(fmtDay(ref))}</span><h1>Equipo</h1></div>
        <div class="seg etab" role="tablist">${[['hoy', 'Hoy'], ['semana', 'Semana']].map(([k, l]) => `<button type="button" role="tab" data-etab="${k}" aria-pressed="${tab === k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div></div>
      ${us.length ? (tab === 'hoy' ? hoy : semana) : `<section class="card"><p class="sub">Todavía no hay jugadoras activas. Actívalas en «Altas» cuando tengas su consentimiento firmado.</p></section>`}`,
      { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  function respBox(u, k) {
    const r = respOf(A.acc[u], k), ek = u + '|' + k, id = 'r-' + (A.view2 === 'partido' ? u + '-' : '') + k;
    if (r && !A.editResp[ek]) return `<div class="resp-done">${r.t ? `<span><b>Tu respuesta:</b> ${esc(r.t)}</span>` : `<span class="bz-ok">${ric('ok')}Leído</span>`}<button class="btn ghost small" type="button" data-a="editresp" data-u="${u}" data-k="${k}">${r.t ? 'Cambiar' : 'Escribirle'}</button></div>`;
    return `<div class="resp-box"><textarea id="${id}" maxlength="400" rows="2" placeholder="Contéstale: lo verá en su app. Mejor con una pregunta." aria-label="Tu respuesta">${esc(r && r.t ? r.t : '')}</textarea><button class="btn small primary" type="button" data-a="resp" data-u="${u}" data-k="${k}" data-in="${id}">Enviar</button></div>`;
  }
  actions.editresp = async b => { A.editResp[b.dataset.u + '|' + b.dataset.k] = true; render(); const el = b.dataset.foco && document.getElementById(b.dataset.foco); if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); } };
  actions.resp = async b => {
    const k = b.dataset.k, u = b.dataset.u || A.sel, txt = ((document.getElementById(b.dataset.in || ('r-' + k)) || {}).value || '').trim(), prev = respOf(A.acc[u], k);
    if (!txt && !prev) { toast('Escribe algo antes de enviar.'); return; }
    const resp = Object.assign({}, (A.acc[u] || {}).resp || {});
    if (txt) resp[k] = { t: txt, ts: Date.now() }; else delete resp[k];
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    await B.merge('acceso/' + u, { resp });
    A.acc[u] = Object.assign({}, A.acc[u] || {}, { resp }); A.editResp[u + '|' + k] = false; toast(txt ? 'Enviado. Lo verá en su app.' : 'Respuesta quitada.'); render();
  };
  function susPartidosHTML(D) {
    const L = misPartidos(D);
    return L.length ? `<section class="strip"><div class="strip-h"><h2>Sus partidos</h2><span class="sub">Toca uno para ver el partido</span></div><div class="cromos">${L.slice(0, 20).map(([k, id, pd]) => cromoHTML(k, id, pd, allPart(A.cal).find(y => y.id === id), 'dt')).join('')}</div></section>` : '';
  }

  function contadoHTML(u, D, t) {
    const L = []; for (let i = 0; i < 21; i++) { const k = addDays(t, -i), d = D[k] || {}, n = [(d.antes || {}).nota, ...(d.ses || []).map(x => x.nota)].filter(Boolean); if (n.length || d.diario) L.push([k, n, d.diario]); }
    const dl = (l, v) => v ? `<p class="dw-m"><span>${l}</span>${esc(v)}</p>` : '';
    return L.length ? `<section class="card"><h2>Te ha contado</h2>${L.map(([k, n, x]) => `<div class="said"><div class="said-q"><span class="kicker">${x ? `<span class="dw-wx" title="${esc(TIEMPO[(x.tiempo || 3) - 1][1])}">${wx(x.tiempo)}</span>` : ''}${esc(fmtDay(k))}</span>${n.length ? `<p class="nota-p">«${esc(n.join(' · '))}»</p>` : ''}${x ? dl('Lo mejor', x.mejor) + dl('Su rincón', x.rincon) + dl('Cambiaría', x.cambiar) + dl('Cómo lo hará', x.como) : ''}</div>${respBox(u, 'd:' + k)}</div>`).join('')}</section>` : '';
  }
  function detalleView() {
    A.view2 = 'detalle';
    const u = A.sel, J = A.jug[u]; if (!J) { view = 'equipo'; return equipoView(); }
    const t = today(), D = diasDe(u), S = semDe(u), e = estado(D, t), a = (D[t] || {}).antes;
    const semanas = Object.keys(S).sort().reverse().slice(0, 6), p = puntos(D, S), lv = nivelDe(p);
    let resp = 0, ent = 0; for (let i = 0; i < 14; i++) { const d = addDays(t, -i); if (entrena(calOf(A.cal), d)) { ent++; if ((D[d] || {}).antes) resp++; } }
    let racha = 0, k0 = mondayOf(t); if (!S[k0]) k0 = addDays(k0, -7); while (S[k0]) { racha++; k0 = addDays(k0, -7); }
    const dl = e.s != null && e.base != null ? e.s - e.base : null;
    const L = ordenadas(t).map(r => r.u), ix = L.indexOf(u), nx = L.length > 1 ? L[(ix + 1) % L.length] : null, pc = porContestar(u, t);
    const fnav = `<span class="fnav"><button type="button" class="fn" data-jnav="-1" aria-label="Jugadora anterior">‹</button><span class="fn-p">${ix + 1}/${L.length}</span><button type="button" class="fn" data-jnav="1" aria-label="Jugadora siguiente">›</button></span>`;
    shell(`<button class="btn ghost small back" type="button" data-av="${['equipo', 'buzon'].includes(A.from) ? A.from : 'resumen'}">← ${A.from === 'equipo' ? 'Jugadoras' : A.from === 'buzon' ? 'Buzón' : 'Equipo'}</button>
      <section class="fhead ${e.lvl}"><span class="fh-av">${avatarSVG(J.av, lv, J.nombre)}</span>
        <div class="fh-b"><span class="kicker">Nivel ${lv + 1} · ${esc(NIVELES[lv][0])}</span><h1>${esc(J.nombre)}</h1><span class="fh-st">${stHTML(e.lvl)}${pc.length ? `<span class="pc">${ric('nota')}${pc.length} por contestar</span>` : ''}</span></div></section>
      ${e.R.length ? chipsHTML(e.R.slice().sort(byOrd)) : ''}
      <div class="kpis">
        <div class="kpi">${ric('baja')}<b>${fmt1(e.s)}</b><span>Llega hoy${dl != null ? ` <em class="${dl < -1 ? 'bad' : dl > 0.5 ? 'ok' : ''}">${dl < 0 ? '↓' : '↑'}${fmt1(Math.abs(dl))}</em>` : ''}</span></div>
        <div class="kpi">${ric('carga')}<b>${e.L.ratio == null ? '—' : '×' + fmt1(e.L.ratio)}</b><span>Carga / mes</span></div>
        <div class="kpi">${ric('ok')}<b>${resp}/${ent}</b><span>Responde</span></div>
        <div class="kpi">${ric('nota')}<b>${racha}</b><span>${racha === 1 ? 'Semana de diario' : 'Semanas de diario'}</span></div>
      </div>
      ${a ? `<section class="card"><div class="card-h"><h2>Hoy</h2><span class="sub">del 1 al 10</span></div><div class="faces">${WELL.map(w => { const v = Math.round(diez(a[w.k], a)); return `<span class="mf ${hcls(v)}">${face(Math.ceil(v / 2))}<b>${esc(w.s)}</b><small>${v}</small></span>`; }).join('')}</div></section>` : ''}
      ${contadoHTML(u, D, t)}
      <section class="card"><div class="card-h"><h2>Últimas respuestas</h2><button class="btn ghost small" type="button" data-a="temporada">Temporada</button></div>${heatHTML(D, t)}</section>
      ${susPartidosHTML(D)}
      <div class="two">
        <section class="card"><h2>Cómo llega · 4 semanas</h2>${wellChart(D, t)}</section>
        <section class="card"><h2>Carga por semana</h2>${loadChart(D, t)}</section>
      </div>
      <section class="card"><h2>Sus compromisos</h2>
        ${semanas.length ? `<div class="dweeks">${semanas.map(k => { const x = S[k]; return `<div class="dw"><div class="dw-h">${x.tiempo ? `<span class="dw-wx" title="${esc(TIEMPO[x.tiempo - 1][1])}">${wx(x.tiempo)}</span>` : ''}<span class="kicker">Semana del ${esc(fmtShort(k))}</span>${x.cumplida ? `<span class="stamp ${x.cumplida}">${esc(STAMP[x.cumplida] || '')}</span>` : ''}</div>
          ${x.mejor ? `<p class="dw-m"><span>Lo mejor</span>${esc(x.mejor)}</p>` : ''}${x.cambiar ? `<p class="dw-m"><span>Cambiaría</span>${esc(x.cambiar)}</p>` : ''}${x.como ? `<p class="dw-m"><span>Cómo lo hará</span>${esc(x.como)}</p>` : ''}${x.resp ? `<p class="dw-m"><span>${esc(x.pregunta || 'Respuesta')}</span>${esc(x.resp)}</p>` : ''}
          <div class="note dw-n"><span class="d">Se compromete a${x.area ? ' · ' + esc(x.area) : ''}</span><span class="t">${esc(compOf(x) || '—')}</span></div>${respBox(u, 's:' + k)}</div>`; }).join('')}</div>` : '<p class="sub">Todavía no se ha puesto ningún compromiso.</p>'}</section>
      ${nx ? `<button class="btn big next-j" type="button" data-jnav="1"><span class="nj-av">${avDe(nx)}</span>Siguiente: ${esc(nom1(nx))} ›</button>` : ''}`, { nav: navA(), wide: true, right: fnav });
  }
  const respPart = (u, x) => pdAt(diasDe(u), x).pd;
  // quién ha contestado un partido: verde antes y después, ámbar solo el antes, gris nada
  const respEst = (u, x) => { const pd = respPart(u, x) || {}; return pd.juega ? 'post' : pd.pre ? 'pre' : ''; };
  const iniDe = u => { const n = nom1(u); return n.slice(0, 2); };
  const whoDots = x => `<span class="who" aria-label="Quién ha contestado">${activas().map(u => `<i class="${respEst(u, x)}" title="${esc(nom1(u))}">${esc(iniDe(u))}</i>`).join('')}</span>`;
  const whoCount = x => { const us = activas(), a = us.filter(u => respEst(u, x)).length, d = us.filter(u => respEst(u, x) === 'post').length; return `<span class="whoc"><b>${a}</b>/${us.length} antes · <b>${d}</b> después</span>`; };
  const WHO_LEG = '<span class="who-leg"><span><i class="post"></i>antes y después</span><span><i class="pre"></i>solo antes</span><span><i></i>nada</span></span>';
  function partidosView() {
    const t = today(), cat = A.pcat || 'todas', all = allPart(A.cal), L = all.filter(x => cat === 'todas' || x.cat === cat), tab = A.ptabs || 'proximos';
    const fut = L.filter(x => x.fecha >= t), pas = L.filter(x => x.fecha < t).reverse();
    const bal = c => { const R = all.filter(x => x.cat === c).map(resOf).filter(Boolean), n = k => R.filter(r => r.k === k).length;
      return `<button type="button" class="bal-c ${catCls(c)}" data-pcat="${c}" aria-pressed="${cat === c}"><span>${esc(c)}</span><b>${n('g')}<i>·</i>${n('e')}<i>·</i>${n('p')}</b></button>`; };
    const extra = (A.cal || {}).extra || [];
    // jugados: los de los últimos 10 días con quién ha contestado; los anteriores, en marcador
    const recientes = pas.filter(x => daysBetween(x.fecha, t) <= 10), viejos = pas.filter(x => daysBetween(x.fecha, t) > 10);
    const tk = x => ticketHTML(x, (x.fecha <= t ? whoCount(x) + whoDots(x) : '') + (resOf(x) ? `<span class="res ${resOf(x).k}">${resOf(x).l} ${resOf(x).a}–${resOf(x).b}</span>` : ''), `data-part="${x.id}"`);
    shell(`<div class="dt-h"><div><span class="kicker">Sección femenina · G · E · P</span><h1>Partidos</h1></div>
        <div class="seg etab" role="tablist">${[['proximos', `Próximos`], ['jugados', `Jugados`], ['cal', 'Calendario']].map(([k, l]) => `<button type="button" role="tab" data-ptabs="${k}" aria-pressed="${tab === k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div></div>
      <div class="bal" role="group" aria-label="Filtrar por categoría">${['Sub-15', 'Sub-17', '1ª Autonómica'].map(bal).join('')}</div>
      ${cat !== 'todas' ? `<button class="btn ghost small" type="button" data-pcat="todas">Ver todas las categorías</button>` : ''}
      ${tab === 'cal' ? (() => { const us = activas(), { html, sel, P } = mesHTML(L, A.mes || t.slice(0, 7), A.cday, x => x.fecha < t && us.length && us.every(u => respEst(u, x) === 'post'), x => false), dd = P.filter(x => x.fecha === sel);
        return `${html}${dd.length ? `${dd.some(x => x.fecha <= t) ? WHO_LEG : ''}<div class="tkts col">${dd.map(tk).join('')}</div>` : `<p class="sub">${P.length ? 'Toca un día con partido.' : 'No hay partidos este mes.'}</p>`}`; })()
      : tab === 'proximos' ? `${fut.some(x => x.fecha === t) || recientes.length ? WHO_LEG : ''}
        ${fut.length ? `<div class="tkts col">${fut.slice(0, A.pmas ? 99 : 5).map(tk).join('')}</div>${fut.length > 5 && !A.pmas ? `<button class="btn ghost" type="button" data-a="pmas">Ver los ${fut.length - 5} siguientes</button>` : ''}` : '<p class="sub">No hay partidos por delante.</p>'}
        <details class="card add-p"${A.addOpen ? ' open' : ''}><summary><h2>Añadir un partido</h2><span class="sub">amistosos, torneos, copa</span></summary>
          <div class="row"><input type="date" id="np-fecha" class="date-in" aria-label="Fecha"><input type="time" id="np-hora" class="date-in" aria-label="Hora">
          <select id="np-cat" class="date-in" aria-label="Categoría">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
          <div class="row"><input type="text" id="np-rival" class="date-in grow" placeholder="Rival" aria-label="Rival" maxlength="60"><label class="check"><input type="checkbox" id="np-casa"> En casa</label></div>
          <button class="btn small" type="button" data-a="addpart">Añadir</button>
          ${extra.length ? `<ul class="list">${extra.map(x => `<li class="li"><span><b>${esc(fmtShort(x.fecha))} · ${esc(x.cat)}</b><small>${esc(x.rival)}</small></span><button class="btn ghost small" type="button" data-a="delpart" data-id="${x.id}">Quitar</button></li>`).join('')}</ul>` : ''}</details>`
      : `${recientes.length ? `${WHO_LEG}<div class="tkts col">${recientes.map(tk).join('')}</div>` : ''}
        ${viejos.length ? `<div class="mrcs">${viejos.map(x => marcadorHTML(x, activas().filter(u => respPart(u, x)).length)).join('')}</div>` : ''}${!pas.length ? '<p class="sub">Todavía ninguno.</p>' : ''}`}
      <p class="sub">Calendario de la Federación Madrileña: se revisa solo cada mañana${PART_AT ? ` (último cambio: ${esc(fmtDay(PART_AT))})` : ''}. Si algo cambia a última hora, entra en el partido y cámbialo a mano.</p>`, { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  actions.pmas = async () => { A.pmas = true; render(); };
  function partidoView() {
    A.view2 = 'partido';
    const x = allPart(A.cal).find(y => y.id === A.part); if (!x) { view = 'partidos'; return partidosView(); }
    const R = activas().map(u => [u, respPart(u, x)]).filter(r => r[1]), pre = R.filter(r => r[1].pre), post = R.filter(r => r[1].juega), jug = post.filter(r => r[1].juega === 'si');
    const m = (L, f) => mean(L.map(r => f(r[1])).filter(v => v != null && v !== ''));
    // reparto de una respuesta de opciones: barras con el número de jugadoras
    const dist = (vals, opts) => { const n = vals.length, rows = opts.map(([k, l]) => [l, vals.filter(v => v === k).length]).filter(r => r[1]).sort((a, b) => b[1] - a[1]);
      return rows.length ? `<ul class="dist">${rows.map(([l, c]) => `<li><span>${esc(l)}</span><i><b style="width:${Math.round(c / n * 100)}%"></b></i><em>${c}</em></li>`).join('')}</ul>` : '<p class="sub">Nadie todavía.</p>'; };
    const emos = post.flatMap(r => r[1].emociones || []), cumpl = jug.map(r => r[1].cumplido).filter(Boolean);
    const ficha = ([u, pd]) => { const p = pd.pre, k = 'p:' + pdAt(diasDe(u), x).k + ':' + x.id, txt = (p && p.objetivo) || pd.mejor || pd.cambiar || pd.llevo;
      return `<div class="obj" id="pc-${u}"><span class="obj-h"><span class="mr-av">${avDe(u)}</span><b>${esc(nom1(u))}</b></span>
        ${p ? `<p><b>Antes:</b> ganas ${p.ganas} · nervios ${p.nervios} · confianza ${p.confianza} · cree que irá: ${esc(lbl(ESPERA, p.espera).toLowerCase())} · le importa: ${esc(lbl(IMPORTA, p.importa).toLowerCase())}</p>${p.objetivo ? `<p><b>Se iba a fijar en:</b> ${esc(p.objetivo)}</p>` : ''}` : '<p class="sub">No contestó el antes.</p>'}
        ${pd.juega ? `<p><b>Después:</b> ${esc(partLinea(pd, 'se vio', 'disfrutó'))}${pd.cumplido ? ` · lo que se propuso: ${esc(lbl(CUMPLIDO, pd.cumplido).toLowerCase())}` : ''}</p>${emoHTML(pd.emociones)}` : '<p class="sub">Todavía no ha contado el después.</p>'}
        ${pd.mejor ? `<p><b>Mejor decisión:</b> ${esc(pd.mejor)}</p>` : ''}${pd.cambiar ? `<p><b>Cambiaría:</b> ${esc(pd.cambiar)}</p>` : ''}${pd.llevo ? `<p><b>Se lleva:</b> ${esc(pd.llevo)}</p>` : ''}
        ${txt ? respBox(u, k) : ''}</div>`; };
    shell(`<button class="btn ghost small back" type="button" data-av="partidos">← Partidos</button>
      <div><span class="kicker">${esc(x.cat)} · jornada ${x.j || '—'} · ${esc(fmtDay(x.fecha))}${x.hora ? ' · ' + esc(x.hora) : ''}</span><h1>${x.casa ? 'SMB – ' + esc(x.rival) : esc(x.rival) + ' – SMB'}</h1>${x.res ? `<p class="sub">Resultado (SMB primero): ${esc(x.res)}</p>` : ''}</div>
      ${editPartHTML(x)}
      ${(() => { const us = activas(); if (x.fecha > today() && !R.length) return ''; return `<section class="card"><div class="card-h"><h2>Quién ha contestado</h2>${whoCount(x)}</div>
        <div class="pfs who-g">${us.map(u => { const e = respEst(u, x); return `<button type="button" class="pf ${e === 'post' ? 'ok' : e === 'pre' ? 'warn' : 'none'}" data-pcu="${e ? u : ''}" ${e ? '' : 'data-jug="' + u + '"'}><span class="pf-av">${avDe(u)}</span><b>${esc(nom1(u))}</b><small>${e === 'post' ? 'antes · después' : e === 'pre' ? 'solo antes' : '—'}</small></button>`; }).join('')}</div>${WHO_LEG}</section>`; })()}
      ${R.length ? `<div class="seg etab" role="tablist">${[['resumen', 'Resumen'], ['cada', 'Lo que cuenta cada una']].map(([k, l]) => `<button type="button" role="tab" data-ptab="${k}" aria-pressed="${(A.ptab || 'resumen') === k}">${l}</button>`).join('')}</div>
      ${(A.ptab || 'resumen') === 'resumen' ? `<div class="tiles four"><div class="tile"><span class="k">Han contestado</span><b class="v">${pre.length} · ${post.length}</b><span class="s">antes · después</span></div>
        <div class="tile"><span class="k">Ganas</span><b class="v">${fmt1(m(pre, pd => pd.pre.ganas))}</b><span class="s">confianza ${fmt1(m(pre, pd => pd.pre.confianza))} · nervios ${fmt1(m(pre, pd => pd.pre.nervios))}</span></div>
        <div class="tile"><span class="k">Disfrute</span><b class="v">${fmt1(m(post, pd => pd.disfrute))}</b><span class="s">del 1 al 10</span></div>
        <div class="tile"><span class="k">Cómo se han visto</span><b class="v">${fmt1(m(jug, pd => pd.visto))}</b><span class="s">esfuerzo ${fmt1(m(jug, pd => pd.rpe))}</span></div></div>
      <div class="grid2"><section class="card"><h2>Lo que más les importaba</h2>${dist(pre.map(r => r[1].pre.importa), IMPORTA)}</section>
        <section class="card"><h2>Cómo creían que iría</h2>${dist(pre.map(r => r[1].pre.espera), ESPERA)}</section>
        <section class="card"><h2>Cómo se sienten después</h2>${emos.length ? `${dist(emos, EMOC.map(e => [e, e]))}<p class="sub">Cada una elige hasta tres.</p>` : '<p class="sub">Nadie todavía.</p>'}</section>
        <section class="card"><h2>Lo que se propusieron</h2>${cumpl.length ? dist(cumpl, CUMPLIDO.map(([k, l]) => [k, l === 'Sí' ? 'Lo consiguió' : l === 'No' ? 'No lo consiguió' : l])) : '<p class="sub">Nadie todavía.</p>'}</section></div>`
      : `<section class="card"><h2>Lo que cuenta cada una</h2>${R.map(ficha).join('')}</section>`}`

      : `<section class="card"><p class="sub">${x.fecha > today() ? 'Todavía no se ha jugado.' : 'Nadie lo ha contado todavía.'}</p></section>`}`, { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  function editPartHTML(x) {
    const c = ((A.cal || {}).cambios || []).find(z => z.id === x.id), extra = ((A.cal || {}).extra || []).some(z => z.id === x.id);
    if (!A.editPart) return `<div class="row"><button class="btn small" type="button" data-a="editpartdt">Cambiar fecha, hora o resultado</button>${c ? `<span class="pill">Cambiado a mano</span>` : ''}</div>`;
    return `<section class="card"><h2>Cambiar el partido</h2>
      <div class="row"><label class="field">Fecha<input type="date" id="ep-fecha" class="date-in" value="${esc(x.fecha)}"></label><label class="field">Hora<input type="time" id="ep-hora" class="date-in" value="${esc(x.hora || '')}"></label><label class="field">Resultado<input type="text" id="ep-res" class="date-in" value="${esc(x.res || '')}" placeholder="3-1" maxlength="7" inputmode="numeric"></label></div>
      <p class="sub">Resultado con el SMB primero, por ejemplo 3-1. Las jugadoras lo ven al momento.${extra ? '' : ' Si la federación lo cambia después, manda lo que pongas aquí hasta que lo quites.'}</p>
      <div class="row"><button class="btn primary small" type="button" data-a="savepartdt" data-id="${x.id}">Guardar</button><button class="btn ghost small" type="button" data-a="noeditpartdt">Cancelar</button>${c ? `<button class="btn ghost small" type="button" data-a="delcambio" data-id="${x.id}">Volver a lo de la federación</button>` : ''}</div></section>`;
  }
  actions.editpartdt = async () => { A.editPart = true; render(); };
  actions.noeditpartdt = async () => { A.editPart = false; render(); };
  async function saveCambios(L) { A.cal = Object.assign({}, A.cal || {}, { cambios: L }); A.editPart = false; render(); await B.merge('equipos/' + EQ, { cambios: L }); }
  actions.savepartdt = async b => {
    const v = id => ((document.getElementById(id) || {}).value || '').trim(), fecha = v('ep-fecha'), hora = v('ep-hora'), res = v('ep-res').replace(/\s/g, '').replace(/[–—:]/g, '-'), id = b.dataset.id;
    if (!fecha) { toast('Pon la fecha.'); return; }
    if (res && !/^\d{1,2}-\d{1,2}$/.test(res)) { toast('El resultado, así: 3-1 (el SMB primero).'); return; }
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    const ex = (A.cal || {}).extra || [];
    if (ex.some(z => z.id === id)) { const extra = ex.map(z => z.id === id ? Object.assign({}, z, { fecha, hora, res }) : z); A.cal = Object.assign({}, A.cal || {}, { extra }); A.editPart = false; render(); await B.merge('equipos/' + EQ, { extra }); toast('Partido cambiado.'); return; }
    await saveCambios([...((A.cal || {}).cambios || []).filter(z => z.id !== id), { id, fecha, hora, res, ts: Date.now() }]); toast('Partido cambiado. Las jugadoras ya lo ven.');
  };
  actions.delcambio = async b => { await saveCambios(((A.cal || {}).cambios || []).filter(z => z.id !== b.dataset.id)); toast('Vuelve a estar como en la federación.'); };
  actions.addpart = async () => {
    const v = id => ((document.getElementById(id) || {}).value || '').trim(), fecha = v('np-fecha'), rival = v('np-rival');
    if (!fecha || !rival) { toast('Pon la fecha y el rival.'); return; }
    const extra = [...((A.cal || {}).extra || []), { id: 'x-' + Date.now().toString(36), cat: v('np-cat') || 'Otro', j: null, fecha, hora: v('np-hora'), rival, casa: !!(document.getElementById('np-casa') || {}).checked, res: '' }];
    A.cal = Object.assign({}, A.cal || {}, { extra }); render(); await B.merge('equipos/' + EQ, { extra }); toast('Partido añadido.');
  };
  actions.delpart = async b => { const extra = ((A.cal || {}).extra || []).filter(x => x.id !== b.dataset.id); A.cal = Object.assign({}, A.cal || {}, { extra }); render(); await B.merge('equipos/' + EQ, { extra }); };
  function temporadaView() {
    const u = A.sel, J = A.jug[u]; if (!J) { view = 'equipo'; return equipoView(); }
    const t = today(), D = diasDe(u), S = semDe(u), ks = Object.keys(D).filter(k => D[k] && (D[k].antes || (D[k].ses || []).length)).sort();
    const desde = ks[0] || t, nDias = Math.min(300, Math.max(28, daysBetween(desde, t) + 1)), nSem = Math.min(44, Math.max(8, Math.ceil((daysBetween(mondayOf(desde), t) + 1) / 7)));
    const conAntes = ks.filter(k => D[k].antes).length, ses = ks.reduce((a, k) => a + (D[k].ses || []).length, 0), mins = ks.reduce((a, k) => a + (D[k].ses || []).reduce((b, x) => b + (+x.min || 0), 0), 0);
    const meses = {}; ks.forEach(k => { const m = k.slice(0, 7), w = wellScore(D[k].antes), r = (D[k].ses || []).map(x => +x.rpe).filter(x => x > 0); meses[m] = meses[m] || { w: [], r: [], n: 0 }; if (w != null) meses[m].w.push(w); meses[m].r.push(...r); meses[m].n += (D[k].ses || []).length; });
    const sk = Object.keys(S).sort(), comp = sk.filter(k => compOf(S[k])), mejor = sk.filter(k => S[k].mejor);
    const p = puntos(D, S), lv = nivelDe(p);
    const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    shell(`<button class="btn ghost small back no-print" type="button" data-a="volverficha">← Su ficha</button>
      <div class="season-h"><div><span class="kicker">Resumen de temporada 2026-27 · ${esc(EQ_N)}</span><h1>${esc(J.nombre)}</h1><p class="sub">Del ${esc(fmtDay(desde))} al ${esc(fmtDay(t))}</p></div>
        <div class="me-av sm">${avatarSVG(J.av, lv, 'Su jugadora')}</div></div>
      <div class="tiles four"><div class="tile"><span class="k">Entrenos con respuesta</span><b class="v">${conAntes}</b></div><div class="tile"><span class="k">Sesiones apuntadas</span><b class="v">${ses}</b></div>
        <div class="tile"><span class="k">Minutos</span><b class="v">${fmtInt(mins)}</b></div><div class="tile"><span class="k">Semanas de diario</span><b class="v">${sk.length}</b></div>
        ${(() => { const P = []; ks.forEach(k => Object.values(D[k].partidos || {}).forEach(pd => { if (pd.juega === 'si') P.push(pd); })); return `<div class="tile"><span class="k">Partidos jugados</span><b class="v">${P.length}</b></div><div class="tile"><span class="k">Minutos en partido</span><b class="v">${fmtInt(P.reduce((a, x) => a + (+x.min || 0), 0))}</b></div><div class="tile"><span class="k">Cómo se ha visto (media)</span><b class="v">${fmt1(mean(P.map(x => x.visto)))}</b></div>`; })()}</div>
      <section class="card"><h2>Mes a mes</h2><div class="tbl-wrap"><table><thead><tr><th>Mes</th><th class="num">Cómo llega (1–10)</th><th class="num">Esfuerzo medio (1–10)</th><th class="num">Sesiones</th></tr></thead><tbody>
        ${Object.keys(meses).sort().map(m => `<tr><td>${MES[+m.slice(5) - 1]} ${m.slice(0, 4)}</td><td class="num">${fmt1(mean(meses[m].w))}</td><td class="num">${fmt1(mean(meses[m].r))}</td><td class="num">${meses[m].n}</td></tr>`).join('') || '<tr><td colspan="4" class="sub">Sin datos.</td></tr>'}</tbody></table></div></section>
      <div class="two"><section class="card"><h2>Cómo ha llegado</h2>${wellChart(D, t, nDias)}</section><section class="card"><h2>Carga por semana</h2>${loadChart(D, t, nSem)}</section></div>
      <section class="card"><h2>Sus compromisos</h2>${comp.length ? `<ul class="list">${comp.map(k => { const c = (S[addDays(k, 7)] || {}).cumplida; return `<li class="li"><span><b>${esc(compOf(S[k]))}</b><small>Semana del ${esc(fmtShort(k))}${S[k].area ? ' · ' + esc(S[k].area) : ''}</small></span>${c ? `<span class="stamp ${c}">${esc(STAMP[c])}</span>` : ''}</li>`; }).join('')}</ul>
        <p class="sub">${(n => n + (n === 1 ? ' cumplido' : ' cumplidos'))(comp.filter(k => (S[addDays(k, 7)] || {}).cumplida === 'si').length)}, ${comp.filter(k => (S[addDays(k, 7)] || {}).cumplida === 'medias').length} a medias.</p>` : '<p class="sub">Sin compromisos.</p>'}</section>
      <section class="card"><h2>Lo mejor de su temporada</h2>${mejor.length ? mejor.map(k => `<p class="nota-p">«${esc(S[k].mejor)}» <small class="sub">· ${esc(fmtShort(k))}</small></p>`).join('') : '<p class="sub">Sin entradas.</p>'}</section>
      <p class="sub">Nivel alcanzado en la app: ${lv + 1} de ${NIVELES.length} (${esc(NIVELES[lv][0])}).</p>
      <div class="row no-print"><button class="btn primary" type="button" data-a="imprimir">Imprimir o guardar en PDF</button></div>`, { nav: navA(), wide: true, right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  actions.temporada = async () => { view = 'temporada'; render(); scrollTo({ top: 0 }); };
  actions.volverficha = async () => { view = 'detalle'; render(); scrollTo({ top: 0 }); };
  actions.imprimir = async () => { window.print(); };
  function calHTML() {
    const c = calOf(A.cal), prox = c.sin.filter(d => d >= today()).sort();
    return `<section class="card"><h2>Días de entreno</h2><p class="sub">Esos días la app les pregunta cómo llegan y qué tal ha ido. Toca para quitar o poner.</p>
      <div class="seg" role="group" aria-label="Días de entreno">${DOW.map(([n, , l]) => `<button type="button" data-cdia="${n}" aria-pressed="${c.dias.includes(n)}">${l}</button>`).join('')}</div>
      <div class="q"><span class="q-h">Días sin entreno (festivos, puentes…)</span>${prox.length ? `<ul class="list">${prox.map(d => `<li class="li"><span><b>${esc(fmtDay(d))}</b></span><button class="btn ghost small" type="button" data-a="delsin" data-d="${d}">Quitar</button></li>`).join('')}</ul>` : '<p class="sub">Ninguno.</p>'}
        <div class="row"><input type="date" id="c-sin" aria-label="Fecha sin entreno" class="date-in"><button class="btn small" type="button" data-a="addsin">Añadir</button></div></div></section>`;
  }
  async function saveCal(c) { A.cal = Object.assign({}, A.cal || {}, c); render(); await B.merge('equipos/' + EQ, c); }
  actions.addsin = async () => { const v = ($('#c-sin') || {}).value; if (!v) { toast('Elige una fecha.'); return; } const c = calOf(A.cal); if (!c.sin.includes(v)) await saveCal({ dias: c.dias, sin: [...c.sin, v].sort() }); toast('Día sin entreno añadido.'); };
  actions.delsin = async b => { const c = calOf(A.cal); await saveCal({ dias: c.dias, sin: c.sin.filter(d => d !== b.dataset.d) }); };
  function accesoView() {
    const P = pendientes(), act = activas(), des = desactivadas();
    const li = (u, inner) => `<li class="li"><span><b>${esc(A.jug[u].nombre)}</b><small>${esc(A.jug[u].email || '')}${A.jug[u].menor ? ' · menor de edad' : ''}</small></span>${inner}</li>`;
    shell(`<button class="btn ghost small back" type="button" data-av="equipo">← Jugadoras</button><div><span class="kicker">Cuentas y consentimientos</span><h1>Altas</h1></div>
      <section class="card"><h2>Esperando a que las actives${P.length ? ' · ' + P.length : ''}</h2>
        <p class="sub">Actívala cuando tengas la hoja de consentimiento firmada${P.some(u => A.jug[u].menor) ? ' (en las menores, por la familia)' : ''}.</p>
        ${P.length ? `<ul class="list">${P.map(u => li(u, `<span class="row"><select id="c-${u}" aria-label="Quién ha firmado"><option value="${A.jug[u].menor ? 'familia' : 'jugadora'}">${A.jug[u].menor ? 'Firmado por la familia' : 'Firmado por ella'}</option><option value="${A.jug[u].menor ? 'jugadora' : 'familia'}">${A.jug[u].menor ? 'Firmado por ella' : 'Firmado por la familia'}</option></select><button class="btn primary small" type="button" data-a="activar" data-u="${u}">Activar</button></span>`)).join('')}</ul>` : '<p class="sub">Nadie esperando. Cuando una jugadora se da de alta, sale aquí.</p>'}</section>
      <section class="card"><h2>Activas · ${act.length}</h2>${act.length ? `<ul class="list">${act.map(u => li(u, `<span class="row"><button class="btn small" type="button" data-a="desactivar" data-u="${u}">Desactivar</button><button class="btn small danger" type="button" data-a="borrarjug" data-u="${u}">Borrar sus datos</button></span>`)).join('')}</ul>` : '<p class="sub">Ninguna todavía.</p>'}</section>
      ${des.length ? `<section class="card"><h2>Desactivadas · ${des.length}</h2><ul class="list">${des.map(u => li(u, `<span class="row"><button class="btn small" type="button" data-a="reactivar" data-u="${u}">Activar otra vez</button><button class="btn small danger" type="button" data-a="borrarjug" data-u="${u}">Borrar sus datos</button></span>`)).join('')}</ul></section>` : ''}
      ${calHTML()}
      <section class="card"><h2>Datos de todas</h2><p class="sub">Para tu archivo o para analizarlos en una hoja de cálculo.</p><div class="row"><button class="btn" type="button" data-a="csv">Descargar en CSV</button></div>
        <p class="sub">A final de temporada (30 de junio de 2027) hay que borrarlo todo.</p><div class="row"><button class="btn danger" type="button" data-a="borrartemporada">Borrar todos los datos de la temporada</button></div><p class="msg" id="msg"></p></section>
      <p class="sub center">Versión de la app ${esc(APP_V)}${J.sinReglas ? ' · faltan las reglas del reto en Firebase' : ''}</p>`, { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  actions.activar = async b => { const u = b.dataset.u, tipo = $('#c-' + u).value; await B.set('acceso/' + u, { activa: true, equipo: EQ, consentimiento: { tipo, fecha: today() }, ts: Date.now() }); toast(`${A.jug[u].nombre} ya puede usar la app.`); };
  actions.desactivar = async b => { const u = b.dataset.u; await B.merge('acceso/' + u, { activa: false, ts: Date.now() }); toast('Desactivada. Sus datos siguen guardados.'); };
  actions.reactivar = async b => { const u = b.dataset.u; await B.merge('acceso/' + u, { activa: true, equipo: EQ, ts: Date.now() }); toast('Activada otra vez.'); };
  async function borrarJug(u) {
    const [d, s, v] = await Promise.all([B.getCol(`registros/${u}/dias`), B.getCol(`registros/${u}/semanas`), B.getCol(`valoraciones/${u}/semanas`).catch(() => [])]);
    await B.batch([...d.map(x => ({ op: 'del', path: `registros/${u}/dias/${x.id}` })), ...s.map(x => ({ op: 'del', path: `registros/${u}/semanas/${x.id}` })), ...v.map(x => ({ op: 'del', path: `valoraciones/${u}/semanas/${x.id}` })), { op: 'del', path: 'acceso/' + u }, { op: 'del', path: 'jugadoras/' + u }, ...(J.todos[u] ? [{ op: 'del', path: 'juego/' + u }] : []), ...Object.entries(J.duelos).filter(([, d]) => d.a === u || d.b === u).map(([id]) => ({ op: 'del', path: 'duelos/' + id }))]);
    delete A.regs[u]; delete A.val[u];
  }
  actions.borrarjug = async b => {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Pulsa otra vez: se borra todo'; return; }
    const n = A.jug[b.dataset.u].nombre; await borrarJug(b.dataset.u); toast(`Datos de ${n} borrados.`);
  };
  actions.borrartemporada = async b => {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Pulsa otra vez: se borran los datos de todas'; return; }
    for (const u of Object.keys(A.jug)) await borrarJug(u);
    await B.batch(['sub17', 'senior', EQ].map(e => ({ op: 'del', path: 'equipos/' + e }))); toast('Temporada borrada.');
  };
  actions.csv = async () => {
    const rows = [['jugadora', 'equipo', 'fecha', ...WELL.map(w => w.n), 'bienestar (media)', 'sesiones', 'esfuerzo', 'minutos', 'carga', 'notas', 'partido', 'minutos jugados', 'se vio (1-10)', 'mejor decisión', 'cambiaría', 'ganas (antes)', 'nervios (antes)', 'confianza (antes)', 'cree que irá', 'le importa', 'se fija en', 'disfrute', 'lo consiguió', 'cómo se siente', 'se lleva', 'diario: el día (1-5)', 'diario: lo mejor', 'diario: mi rincón', 'diario: cambiaría', 'diario: cómo lo hará']];
    activas().concat(desactivadas()).forEach(u => Object.keys(diasDe(u)).sort().forEach(k => { const d = diasDe(u)[k], a = d.antes || {}, L = d.ses || [];
      rows.push([A.jug[u].nombre, eqName(eqDe(u)), k, ...WELL.map(w => a[w.k] >= 1 ? r1(diez(a[w.k], a)) : ''), wellScore(a) == null ? '' : r1(wellScore(a)), L.map(s => s.tipo).join(' + '), L.map(s => s.rpe).join(' + '), L.map(s => s.min).join(' + '), L.length ? dayLoad(d) : '', [a.nota, ...L.map(s => s.nota)].filter(Boolean).join(' · '), ...(pp => [pp.map(x => x.cat + ' ' + x.rival).join(' + '), pp.map(x => x.min).join(' + '), pp.map(x => x.visto ?? '').join(' + '), pp.map(x => x.mejor).filter(Boolean).join(' · '), pp.map(x => x.cambiar).filter(Boolean).join(' · '), ...['ganas', 'nervios', 'confianza'].map(c => pp.map(x => (x.pre || {})[c] ?? '').join(' + ')), pp.map(x => lbl(ESPERA, (x.pre || {}).espera)).join(' + '), pp.map(x => lbl(IMPORTA, (x.pre || {}).importa)).join(' + '), pp.map(x => (x.pre || {}).objetivo).filter(Boolean).join(' · '), pp.map(x => x.disfrute ?? '').join(' + '), pp.map(x => lbl(CUMPLIDO, x.cumplido)).join(' + '), pp.map(x => (x.emociones || []).join(', ')).join(' + '), pp.map(x => x.llevo).filter(Boolean).join(' · ')])(Object.values(d.partidos || {})), ...(x => [x.tiempo || '', x.mejor || '', x.rincon || '', x.cambiar || '', x.como || ''])(d.diario || {})]); }));
    const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `smb-femenino-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  };
  root.addEventListener('click', async e => {
    if (!isAdmin()) return;
    const b = e.target.closest('button, tr[data-jug], g[data-jug]'); if (!b) return;
    if (b.dataset.pf) { A.pf = b.dataset.pf; render(); return; }
    if (b.dataset.pcat) { A.pcat = b.dataset.pcat === A.pcat ? 'todas' : b.dataset.pcat; render(); return; }
    if (b.dataset.av) { view = b.dataset.av; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.cdia) { const c = calOf(A.cal), n = +b.dataset.cdia, dias = c.dias.includes(n) ? c.dias.filter(x => x !== n) : [...c.dias, n].sort(); try { await saveCal({ dias, sin: c.sin }); } catch (er) { toast('No se ha podido guardar.'); } return; }
    if (b.dataset.part) { A.part = b.dataset.part; A.editPart = false; view = 'partido'; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.avk && draft.av) { draft.av[b.dataset.avk] = b.dataset.avv; const y = scrollY; render(); scrollTo({ top: y }); return; }
    if (b.dataset.jnav) { fichaVecina(+b.dataset.jnav); return; }
    if (b.dataset.etab) { A.etab = b.dataset.etab; render(); return; }
    if (b.dataset.btab) { A.btab = b.dataset.btab; render(); return; }
    if (b.dataset.ptabs) { A.ptabs = b.dataset.ptabs; render(); return; }
    if (b.dataset.pmes) { A.mes = b.dataset.pmes; A.cday = ''; render(); return; }
    if (b.dataset.cday != null && view === 'partidos') { A.cday = b.dataset.cday; render(); return; }
    if (b.dataset.ptab) { A.ptab = b.dataset.ptab; render(); return; }
    if (b.dataset.pcu) { A.ptab = 'cada'; render(); const el = document.getElementById('pc-' + b.dataset.pcu); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (b.dataset.jug) { irFicha(b.dataset.jug, ['equipo', 'resumen', 'buzon'].includes(view) ? view : A.from); return; }
  });
  root.addEventListener('keydown', e => { if (isAdmin() && (e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.jug && e.target.tagName !== 'BUTTON') { e.preventDefault(); A.sel = e.target.dataset.jug; view = 'detalle'; render(); scrollTo({ top: 0 }); } });
  // en la ficha: deslizar a los lados o las flechas del teclado pasan a la jugadora anterior o siguiente
  let sw0 = null;
  root.addEventListener('touchstart', e => { sw0 = isAdmin() && view === 'detalle' && !e.target.closest('.heat-wrap, .cromos, .tkts, textarea, input') && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  root.addEventListener('touchend', e => { if (!sw0) return; const t0 = e.changedTouches[0], dx = t0.clientX - sw0.x, dy = t0.clientY - sw0.y; sw0 = null; if (Math.abs(dx) > 80 && Math.abs(dy) < 50) fichaVecina(dx < 0 ? 1 : -1); }, { passive: true });
  document.addEventListener('keydown', e => { if (!isAdmin() || view !== 'detalle' || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return; if (e.key === 'ArrowRight') fichaVecina(1); else if (e.key === 'ArrowLeft') fichaVecina(-1); });
  function startAdmin() {
    view = 'resumen';
    unsub.push(B.listenCol('jugadoras', L => { A.jug = Object.fromEntries(L.map(x => [x.id, x.data])); syncRegs(); render(); }, () => {}));
    unsub.push(B.listenDoc('equipos/' + EQ, d => { A.cal = d; render(); }, () => {}));
    cargarPartidos(); jStart();
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
    if (isAdmin()) { if (view === 'detalle') return detalleView(); if (view === 'temporada') return temporadaView(); if (view === 'partidos') return partidosView(); if (view === 'partido') return partidoView(); if (view === 'reto') return retoView(); if (view === 'avdt') return editAvView(9); if (view === 'acceso') return accesoView(); if (view === 'equipo') return equipoView(); if (view === 'buzon') return buzonView(); return resumenView(); }
    if (U.perfil === undefined || U.acceso === undefined) { gate('<p class="sub" style="text-align:center">Cargando…</p>'); return; }
    if (!U.perfil || !U.perfil.acepta || U.editAlta) return altaView();
    if (!U.acceso || !U.acceso.activa) return esperaView();
    if (view === 'bienvenida' || !ls.get(bienvenidaKey())) return bienvenidaView();
    if (view === 'antes') return antesFlowView();
    if (view === 'mflow' && draft.mf) return mfView();
    if (view === 'partidos') return partidosJView(); if (view === 'partido') return partidoJView(); if (view === 'reto') return retoView();
    if (view === 'semana') return diarioView(); if (view === 'yo' || view === 'evol') return yoView(); if (view === 'datos') return datosView();
    return hoyView();
  }
  me = undefined; render();
  if (B) B.onAuth(u => {
    stop(); datosOn = false; Object.assign(J, { todos: {}, duelos: {}, on: false, synced: false }); draft.res = null;
    Object.assign(U, { perfil: undefined, acceso: undefined, equipo: null, dias: {}, semanas: {}, editAlta: false });
    Object.assign(A, { jug: {}, acc: {}, regs: {}, equipos: {}, val: {}, sel: '', cal: null, editResp: {} });
    me = u || null; view = 'hoy';
    if (me && ADMIN.includes(me.uid)) startAdmin(); else if (me && ADMIN.length) startJugadora();
    render();
  });
})();
