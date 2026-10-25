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
  let PART = [];
  const CATS = ['Sub-15', 'Sub-17', '1ª Autonómica', 'Otro'];
  function cargarPartidos() { fetch('partidos.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { if (j && Array.isArray(j.partidos)) { PART = j.partidos; render(); } }).catch(() => {}); }
  const allPart = cal => [...PART, ...(((cal || {}).extra) || [])].sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  const partDe = (cal, d) => allPart(cal).filter(x => x.fecha === d);
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
  const PTS = { antes: 10, despues: 10, partido: 10, semana: 20, revisar: 15 };
  const NIVELES = [['Novata', 0], ['Calentando', 30], ['En pista', 80], ['Titular', 150], ['Imprescindible', 250], ['Referente', 380], ['Capitana', 550], ['Veterana', 750], ['Mito', 1000], ['Leyenda del SMB', 1300]];
  function puntos(dias, semanas) {
    let p = 0;
    Object.values(dias || {}).forEach(d => { if (!d) return; if (d.antes) p += PTS.antes; if ((d.ses || []).some(z => !z.pid)) p += PTS.despues; Object.values(d.partidos || {}).forEach(pd => { if (pd && pd.pre) p += PTS.partido; if (pd && pd.juega) p += PTS.partido; }); });
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
    const R = [], add = (lvl, txt, c, ic) => R.push({ lvl, txt, c, ic });
    const a = (dias[ref] || {}).antes, s = wellScore(a), base = baseline(dias, ref), L = loads(dias, ref), last = lastAnswer(dias);
    if (s != null && s <= 4.5) add('bad', `Llega mal hoy (${fmt1(s)} de 10).`, `Llega ${fmt1(s)}`, 'baja');
    else if (s != null && base != null && s <= base - 1.8) add('warn', `Hoy está por debajo de lo normal en ella (${fmt1(s)}; suele estar en ${fmt1(base)}).`, `${fmt1(s)} · suele ${fmt1(base)}`, 'baja');
    if (a && diez(a.dolor, a) <= 3) add('warn', 'Molestias musculares altas.', `Molestias ${Math.round(diez(a.dolor, a))}`, 'dolor');
    if (a && a.nota) add('info', `Ha escrito: «${a.nota}»`, 'Ha escrito', 'nota');
    Object.keys(dias).filter(k => k <= ref && daysBetween(k, ref) <= 2).forEach(k => Object.values((dias[k] || {}).partidos || {}).forEach(pd => {
      const m = (pd.emociones || []).filter(e => EMOC_MAL.includes(e));
      if (m.length) add('info', `Después del partido contra ${pd.rival || '—'} se siente ${m.join(', ').toLowerCase()}.`, m.join(', '), 'partido');
      if (k === ref && pd.pre && pd.pre.confianza <= 3) add('info', `Llega al partido con poca confianza (${pd.pre.confianza} de 10).`, `Confianza ${pd.pre.confianza}`, 'partido');
    }));
    if (L.ratio != null && L.ratio > 1.5) add('bad', `La carga de esta semana se dispara: ${fmt1(L.ratio)} veces su media del mes.`, `Carga ×${fmt1(L.ratio)}`, 'carga');
    else if (L.ratio != null && L.ratio > 1.3) add('warn', `Carga alta esta semana: ${fmt1(L.ratio)} veces su media del mes.`, `Carga ×${fmt1(L.ratio)}`, 'carga');
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
    acceso: '<circle cx="10" cy="8.5" r="3.6"/><path d="M3.5 20c1.2-3.4 3.6-5.2 6.5-5.2 1.6 0 3 .5 4.1 1.5M17.5 13.5v6M14.5 16.5h6"/>',
  };
  const ico = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ''}</svg>`;
  const navJ = () => `<nav class="nav" aria-label="Secciones">${[['hoy', 'Hoy'], ['partidos', 'Partidos'], ['semana', 'Semana'], ['yo', 'Mi jugadora'], ['datos', 'Mis datos']].map(([k, l]) => `<button type="button" data-v="${k}" aria-current="${view === k || (view === 'partido' && k === 'partidos') ? 'page' : 'false'}">${ico(k)}${l}</button>`).join('')}</nav>`;
  const calJ = () => calOf(U.equipo);
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
    const L = (diaHoy().ses || []).map((z, i) => Object.assign({}, z, { i })).filter(z => !z.pid), d = draft.ses;
    const done = L.length ? `<ul class="list">${L.map(s => `<li class="li"><span><b>${esc((TIPOS.find(t => t.k === s.tipo) || TIPOS[0]).n)} · esfuerzo ${s.rpe} de 10 (${esc(RPE[s.rpe] || '')})</b><small>${s.min} min${s.nota ? ' · ' + esc(s.nota) : ''}</small></span><button class="btn ghost small" type="button" data-a="delses" data-i="${s.i}">Quitar</button></li>`).join('')}</ul>` : '';
    if (!L.length && !draft.openDesp) return `<section class="card desp-mini"><div><h2>Después del entreno</h2><p class="sub">Cuando acabes: lo duro que ha sido y los minutos.</p></div><button class="btn primary" type="button" data-a="opendesp">Ya he entrenado</button></section>`;
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
  function respuestasHTML() {
    const R = Object.entries((U.acceso || {}).resp || {}).filter(([, v]) => v && v.t && Date.now() - (v.ts || 0) < 14 * 864e5).sort((a, b) => b[1].ts - a[1].ts).slice(0, 3);
    if (!R.length) return '';
    return `<section class="card msg-card"><h2>Carlos te ha contestado</h2>${R.map(([k, v]) => `<div class="msg-it"><span class="kicker">${k[0] === 's' ? 'A tu diario de la semana del ' + esc(fmtShort(k.slice(2))) : k[0] === 'p' ? 'A tu partido del ' + esc(fmtDay(k.slice(2, 12))) : 'A lo que contaste el ' + esc(fmtDay(k.slice(2)))}</span><p>${esc(v.t)}</p></div>`).join('')}</section>`;
  }
  function semanaMini() {
    const mine = U.semanas[mondayOf(today())];
    if (mine) return `<section class="card done"><div class="card-h"><h2>Tu diario</h2>${stHTML('ok').replace('Bien', 'Hecho')}</div><p class="sub">La semana que viene vas a: ${esc(compOf(mine))}</p></section>`;
    return `<section class="card"><div class="card-h"><h2>Tu diario</h2><span class="sub">1 minuto</span></div><p class="sub">Qué tal ha ido la semana y a qué te comprometes. Mejor al final de la semana.</p><button class="btn" type="button" data-a="gosemana">Escribir mi semana</button></section>`;
  }
  function diarioView() {
    const lunes = mondayOf(today()), mine = U.semanas[lunes], prevK = addDays(lunes, -7), edit = !mine || draft.editSem;
    if (edit && (!draft.sem || draft.sem.lunes !== lunes)) draft.sem = Object.assign({ tiempo: 0, mejor: '', cambiar: '', como: '', compromiso: '', area: '', cumplida: '' }, mine ? clone(mine) : {}, { lunes });
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
      ${pg('d-como', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>', 'Cómo lo voy a hacer', d.como || '')}
      <section class="pledge"><div class="row between"><span class="pl-h">La semana que viene voy a…</span>${!edit && d.area ? `<span class="tag">${esc(d.area)}</span>` : ''}</div>
        ${edit ? `<input type="text" id="d-comp" class="pl-in" maxlength="140" value="${esc(compOf(d))}" placeholder="algo concreto que dependa de ti" aria-label="La semana que viene voy a">
        <div class="seg dark" role="group" aria-label="De qué va">${AREAS.map(a => `<button type="button" data-area="${a}" aria-pressed="${d.area === a}">${a}</button>`).join('')}</div>` : `<p class="pl-t">${esc(compOf(d))}</p>`}</section>
      ${(r => r ? `<section class="card msg-card"><span class="kicker">Carlos te ha contestado</span><p>${esc(r.t)}</p></section>` : '')(respOf(U.acceso, 's:' + lunes))}
      ${hist.length ? `<div class="row between"><span class="kicker">Mis compromisos</span>${evald.length ? `<span class="sub">${si} de ${evald.length} cumplidos</span>` : ''}</div><div class="tks">${hist.map(ticket).join('')}</div>` : ''}
      ${edit ? `<div class="row"><button class="btn primary big grow" type="button" data-a="savesem">Guardar mi semana</button>${mine ? '<button class="btn ghost" type="button" data-a="noeditsem">Cancelar</button>' : ''}</div><p class="msg" id="msg"></p>` : '<button class="btn" type="button" data-a="editsem">Cambiar</button>'}`, { nav: navJ() });
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
  const pdOf = x => ((U.dias[x.fecha] || {}).partidos || {})[x.id];
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
      const D = U.dias[x.fecha] || {}, pd = (D.partidos || {})[id] || {};
      draft.mf = { kind, id, fecha: x.fecha, i: 0, vals: clone(kind === 'pre' ? pd.pre || {} : pd.juega ? pd : {}), well: kind === 'pre' && !D.antes, obj: (pd.pre || {}).objetivo || '', back: view === 'partido' ? 'partido' : 'hoy' };
    }
    view = 'mflow'; render(); scrollTo({ top: 0 });
  }
  actions.prepart = async b => startMf('pre', b.dataset.id);
  actions.postpart = async b => startMf('post', b.dataset.id);
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
      ${pre.objetivo ? `<p class="nota-p">Te vas a fijar en: «${esc(pre.objetivo)}»</p>` : ''}<p class="sub">Cuando acabe, cuéntanos cómo lo has vivido. Un minuto.</p>
      <div class="row"><button class="btn primary" type="button" data-a="postpart" data-id="${id}">Contar el partido</button><button class="btn ghost small" type="button" data-a="prepart" data-id="${id}">Cambiar lo de antes</button></div></section>`;
    if (!hoy) return `<section class="card part-card">${head('<span class="sub">Un minuto</span>')}<p>¿Qué tal fue? Cuéntanos cómo lo viviste.</p>
      <div class="row"><button class="btn primary" type="button" data-a="postpart" data-id="${id}">Contar el partido</button><button class="btn ghost" type="button" data-a="nojuego" data-id="${id}">No jugué</button></div></section>`;
    const seguir = draft.mf && draft.mf.id === id && draft.mf.kind === 'pre';
    return `<section class="card part-card">${head('<span class="sub">40 segundos</span>')}<p>Antes de calentar: cómo llegas, con qué ganas y en qué te vas a fijar.</p>
      <button class="btn primary big" type="button" data-a="prepart" data-id="${id}">${seguir ? 'Seguir' : 'Antes del partido'}</button>
      <div class="row"><button class="btn ghost small" type="button" data-a="postpart" data-id="${id}">Ya ha terminado: contarlo</button><button class="btn ghost small" type="button" data-a="nojuego" data-id="${id}">No juego</button></div></section>`;
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
    if (x.fecha === t) return `<span class="pst-j now">${pd.pre ? 'Antes hecho · falta el después' : 'Hoy'}</span>`;
    if (x.fecha < t) return pd.pre ? '<span class="pst-j due">Falta el después</span>' : ls.get(`smbf-nojuego-${me.uid}-${x.id}`) ? '' : '<span class="pst-j">Sin contar</span>';
    const n = daysBetween(t, x.fecha); return `<span class="pst-j">${n === 1 ? 'Mañana' : 'En ' + n + ' días'}</span>`;
  }
  function partidosJView() {
    const t = today(), cat = ls.get('smbf-pcat') || 'todas', mes = draft.mes || t.slice(0, 7), [y, m] = mes.split('-').map(Number);
    const all = allPart(calJ()).filter(x => cat === 'todas' || x.cat === cat), P = all.filter(x => x.fecha.startsWith(mes));
    const first = new Date(y, m - 1, 1), off = (first.getDay() + 6) % 7, nd = new Date(y, m, 0).getDate();
    const cells = []; for (let i = 0; i < off; i++) cells.push('<span class="cd e"></span>');
    for (let d = 1; d <= nd; d++) { const k = `${mes}-${String(d).padStart(2, '0')}`, L = P.filter(x => x.fecha === k), done = L.length && L.every(x => (pdOf(x) || {}).juega), due = L.some(x => x.fecha < t && !(pdOf(x) || {}).juega && (pdOf(x) || {}).pre);
      cells.push(L.length ? `<button type="button" class="cd has${k === t ? ' hoy' : ''}${draft.cday === k ? ' sel' : ''}${done ? ' done' : ''}${due ? ' due' : ''}" data-cday="${k}" aria-label="${esc(fmtDay(k))}: ${L.length} ${L.length === 1 ? 'partido' : 'partidos'}"><b>${d}</b><span class="dots">${L.map(x => `<i class="${catCls(x.cat)}"></i>`).join('')}</span></button>`
        : `<span class="cd${k === t ? ' hoy' : ''}"><b>${d}</b></span>`); }
    const vis = draft.cday && draft.cday.startsWith(mes) ? P.filter(x => x.fecha === draft.cday) : P;
    const pend = all.filter(x => x.fecha < t && !(pdOf(x) || {}).juega && (pdOf(x) || {}).pre);
    const mv = k => { const d = new Date(y, m - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
    shell(`<div><span class="kicker">Sección femenina</span><h1>Partidos</h1></div>
      <div class="seg cat-f" role="group" aria-label="Categoría">${[['todas', 'Todas'], ['Sub-15', 'Sub-15'], ['Sub-17', 'Sub-17'], ['1ª Autonómica', '1ª Autonómica']].map(([k, l]) => `<button type="button" data-pcatj="${k}" aria-pressed="${cat === k}">${l}</button>`).join('')}</div>
      ${pend.length ? `<section class="card part-card"><h2>Te falta contar</h2><div class="tkts col">${pend.map(x => ticketHTML(x, estadoPartJ(x), `data-pp="${x.id}"`)).join('')}</div></section>` : ''}
      <section class="card calm"><div class="cal-h"><button type="button" class="btn ghost small" data-pmes="${mv(-1)}" aria-label="Mes anterior">‹</button><h2>${MESES_L[m - 1]} ${y}</h2><button type="button" class="btn ghost small" data-pmes="${mv(1)}" aria-label="Mes siguiente">›</button></div>
        <div class="cal-g">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span class="cw">${d}</span>`).join('')}${cells.join('')}</div>
        <div class="cal-leg"><span><i class="c15"></i>Sub-15</span><span><i class="c17"></i>Sub-17</span><span><i class="caf"></i>1ª Aut.</span></div></section>
      <section class="strip"><div class="strip-h"><h2>${draft.cday && draft.cday.startsWith(mes) ? esc(fmtDay(draft.cday)) : 'Este mes'}</h2>${draft.cday ? '<button class="btn ghost small" type="button" data-cday="">Ver todo el mes</button>' : ''}</div>
        ${vis.length ? `<div class="tkts col">${vis.map(x => ticketHTML(x, estadoPartJ(x), `data-pp="${x.id}"`)).join('')}</div>` : '<p class="sub">No hay partidos este mes.</p>'}</section>`, { nav: navJ() });
  }
  function partidoJView() {
    const x = partById(draft.part); if (!x) { view = 'partidos'; return partidosJView(); }
    const t = today(), pd = pdOf(x) || {}, p = pd.pre, r = resOf(x), rsp = respOf(U.acceso, 'p:' + x.fecha + ':' + x.id), id = x.id;
    const preSum = p ? `<div class="pre-sum"><span>Ganas<b>${p.ganas}</b></span><span>Nervios<b>${p.nervios}</b></span><span>Confianza<b>${p.confianza}</b></span></div>
      <div class="rchips">${p.espera ? `<span class="rchip info">${esc(lbl(ESPERA, p.espera))}</span>` : ''}${p.importa ? `<span class="rchip info">Me importa: ${esc(lbl(IMPORTA, p.importa).toLowerCase())}</span>` : ''}</div>${p.objetivo ? `<p class="nota-p">Me fijo en: «${esc(p.objetivo)}»</p>` : ''}` : '';
    const pre = x.fecha > t ? `<section class="card"><h2>Antes del partido</h2><p class="sub">Lo podrás contestar el día del partido.</p></section>`
      : x.fecha === t ? `<section class="card"><div class="card-h"><h2>Antes del partido</h2>${p ? stHTML('ok').replace('Bien', 'Hecho') : '<span class="sub">40 segundos</span>'}</div>${p ? preSum + `<button class="btn small" type="button" data-a="prepart" data-id="${id}">Cambiar</button>` : `<button class="btn primary big" type="button" data-a="prepart" data-id="${id}">Empezar</button>`}</section>`
      : p ? `<section class="card"><h2>Antes del partido</h2>${preSum}</section>` : '';
    const post = x.fecha > t ? '' : pd.juega ? `<section class="strip"><div class="strip-h"><h2>Cómo lo viviste</h2><button class="btn ghost small" type="button" data-a="postpart" data-id="${id}">Cambiar</button></div><div class="cromos one">${cromoHTML(x.fecha, id, pd, x, 'yo')}</div>
        ${pd.mejor || pd.cambiar ? `<section class="card">${pd.mejor ? `<p class="dw-m"><span>La decisión que mejor me salió</span>${esc(pd.mejor)}</p>` : ''}${pd.cambiar ? `<p class="dw-m"><span>Una que cambiaría</span>${esc(pd.cambiar)}</p>` : ''}</section>` : ''}</section>`
      : `<section class="card part-card"><div class="card-h"><h2>Después del partido</h2><span class="sub">Un minuto</span></div><p>${x.fecha === t ? 'Cuando acabe, cuéntanos cómo lo has vivido.' : '¿Qué tal fue? Cuéntanos cómo lo viviste.'}</p><button class="btn primary big" type="button" data-a="postpart" data-id="${id}">Contar el partido</button></section>`;
    shell(`<button class="btn ghost small back" type="button" data-v2="partidos">← Partidos</button>
      <div class="tkts col big">${ticketHTML(x, r ? `<span class="res ${r.k}">${r.l} ${r.a}–${r.b}</span>` : '')}</div>
      ${rsp ? `<section class="card msg-card"><span class="kicker">Carlos te ha contestado</span><p>${esc(rsp.t)}</p></section>` : ''}
      ${pre}${post}`, { nav: navJ() });
  }
  function hoyView() {
    const t = today(), dia = diaHoy(), vis = partDe(calJ(), t).filter(partVis), hayPart = vis.length > 0, ent = entrena(calJ(), t), cards = partidosHoyHTML();
    const show = ent || hayPart || draft.showDia || dia.antes || (dia.ses || []).length;
    const nombre = (U.perfil.nombre || '').split(' ')[0], p = puntos(U.dias, U.semanas), lv = nivelDe(p);
    const pHoy = vis[0], lineaHoy = pHoy ? `Hoy juegas · ${pHoy.cat} contra ${pHoy.rival}${pHoy.hora ? ', ' + pHoy.hora : ''}` : ent ? 'Hoy hay entreno. ¿Cómo llegas?' : 'Hoy no hay entreno. Descansa bien.';
    // día de partido: el «antes» del día va dentro del antes del partido (si ya está contestado, se enseña hecho)
    const antes = dia.antes || !hayPart ? antesHTML() : '';
    shell(`<section class="hero"><div class="hi"><span class="kicker">${esc(fmtDay(t))}</span><h1>Hola, ${esc(nombre)}</h1><p class="today">${esc(lineaHoy)}</p></div>
        <button class="me-chip" type="button" data-v="yo" aria-label="Mi jugadora: nivel ${lv + 1}, ${p} puntos">${avatarSVG(U.perfil.av, lv)}<span><b>Nivel ${lv + 1}</b><small>${p} pts</small></span></button></section>
      ${respuestasHTML()}
      ${show ? antes + cards + (ent || draft.showDia || (dia.ses || []).some(z => !z.pid) ? despuesHTML() : '') : `${cards}<section class="card"><h2>Hoy no hay entreno</h2><p class="sub">Si has entrenado por tu cuenta, apúntalo.</p><button class="btn" type="button" data-a="showdia">Apuntar un entreno de hoy</button></section>`}
      ${semanaMini()}${proximoHTML()}`, { nav: navJ() });
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
        <li><span>Responder antes del entreno</span><b>+${PTS.antes}</b></li><li><span>Responder después</span><b>+${PTS.despues}</b></li><li><span>Antes y después de cada partido</span><b>+${PTS.partido} y +${PTS.partido}</b></li>
        <li><span>Escribir tu diario de la semana</span><b>+${PTS.semana}</b></li><li><span>Decir si cumpliste tu compromiso</span><b>+${PTS.revisar}</b></li></ul>
        <p class="sub">Da igual lo que contestes: puntúa responder, no las notas. Cada nivel desbloquea ropa, gafas, fondos o marcos.</p></section>
      <section class="card"><h2>Cómo llegas a los entrenos</h2><p class="sub">Media de tus cinco respuestas, del 1 al 10, en los últimos 28 días.${baseline(U.dias, t) != null ? ' La franja es lo normal en ti.' : ''}</p>${wellChart(U.dias, t)}</section>
      <section class="card"><h2>Tu carga por semana</h2><p class="sub">Esfuerzo × minutos de cada sesión, sumado por semana. La barra clara es la semana en curso.</p>${loadChart(U.dias, t)}</section>
      ${(L => L.length ? `<section class="strip"><div class="strip-h"><h2>Mis partidos</h2><span class="sub">${L.length === 1 ? '1 partido' : L.length + ' partidos'}</span></div><div class="cromos">${L.slice(0, 20).map(([k, id, pd]) => cromoHTML(k, id, pd, allPart(calJ()).find(y => y.id === id), 'yo-btn')).join('')}</div></section>` : '')(misPartidos(U.dias))}
      <section class="strip"><div class="strip-h"><h2>Tus compromisos</h2></div>${sem.length ? `<div class="notes">${sem.map(k => { const x = U.semanas[k], nx = U.semanas[addDays(k, 7)]; return `<div class="note"><span class="d">Semana del ${esc(fmtShort(k))}</span><span class="t">${esc(compOf(x) || '—')}</span>${nx && nx.cumplida ? `<span class="stamp ${nx.cumplida}">${esc(STAMP[nx.cumplida] || '')}</span>` : ''}</div>`; }).join('')}</div>` : '<p class="sub">Aquí saldrán los compromisos de tu diario.</p>'}</section>`, { nav: navJ() });
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
      <button class="btn" type="button" data-a="verbienvenida">Cómo funciona y cómo instalarla</button>
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
    draft.ses = { tipo: 'entreno', rpe: null, min: eqMin(), nota: '' }; draft.moreSes = false; draft.openDesp = false; premio(p0); render();
  };
  actions.delses = async b => { const L = (diaHoy().ses || []).filter((_, i) => i !== +b.dataset.i); await B.merge(`registros/${me.uid}/dias/${today()}`, { ses: L, ts: Date.now() }); U.dias[today()] = Object.assign({}, diaHoy(), { ses: L }); render(); };
  actions.moreses = async () => { draft.moreSes = true; render(); };
  actions.opendesp = async () => { draft.openDesp = true; render(); };
  actions.lessses = async () => { draft.moreSes = false; render(); };
  actions.showdia = async () => { draft.showDia = true; render(); };
  actions.editsem = async () => { draft.editSem = true; render(); };
  actions.noeditsem = async () => { draft.editSem = false; draft.sem = null; render(); };
  actions.gosemana = async () => { view = 'semana'; render(); scrollTo({ top: 0 }); };
  actions.savesem = async () => {
    const lunes = mondayOf(today()), d = draft.sem, m = $('#msg'), err = t => { m.className = 'msg err'; m.textContent = t; };
    const val = id => ((document.getElementById(id) || {}).value || '').trim();
    d.mejor = val('d-mejor'); d.cambiar = val('d-cambiar'); d.como = val('d-como'); d.compromiso = val('d-comp');
    if (!d.tiempo) return err('Elige qué tiempo ha hecho en la pista.');
    if (!d.compromiso) return err('Escribe a qué te comprometes la semana que viene.');
    const doc = { tiempo: d.tiempo, mejor: d.mejor, cambiar: d.cambiar, como: d.como || '', compromiso: d.compromiso, area: d.area || '', cumplida: d.cumplida || '', ts: Date.now() };
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
    if (b.dataset.pp) { goPart(b.dataset.pp); return; }
    if (b.dataset.v2) { view = b.dataset.v2; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.pcatj) { ls.set('smbf-pcat', b.dataset.pcatj); draft.cday = ''; render(); return; }
    if (b.dataset.pmes) { draft.mes = b.dataset.pmes; draft.cday = ''; render(); return; }
    if (b.dataset.cday != null && b.classList.contains('cd') || b.dataset.cday === '') { draft.cday = draft.cday === b.dataset.cday ? '' : b.dataset.cday; render(); return; }
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
    if (b.dataset.tiempo && draft.sem) { draft.sem.tiempo = +b.dataset.tiempo; const y = scrollY; render(); scrollTo({ top: y }); return; }
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
    cargarPartidos();
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
  const navA = () => `<nav class="nav" aria-label="Secciones">${[['resumen', 'Equipo'], ['equipo', 'Jugadoras'], ['partidos', 'Partidos'], ['acceso', 'Altas']].map(([k, l]) => `<button type="button" data-av="${k}" aria-current="${view === k || (view === 'detalle' && k === 'equipo') ? 'page' : 'false'}">${ico(k)}${l}${k === 'acceso' && pendientes().length ? ` · ${pendientes().length}` : ''}</button>`).join('')}</nav>`;
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
    const rows = U2.map(u => ({ u, e: estado(diasDe(u), t) })).sort((a, b) => ({ bad: 0, warn: 1, none: 2, ok: 3 }[a.e.lvl] - { bad: 0, warn: 1, none: 2, ok: 3 }[b.e.lvl]) || (A.jug[a.u].nombre || '').localeCompare(A.jug[b.u].nombre || '', 'es'));
    const n = { bad: 0, warn: 0 }; rows.forEach(r => { if (n[r.e.lvl] != null) n[r.e.lvl]++; });
    shell(`<div><span class="kicker">${esc(fmtDay(t))}</span><h1>Jugadoras</h1><p class="sub">${rows.length} ${rows.length === 1 ? 'activa' : 'activas'}${n.bad ? ` · ${n.bad} para revisar` : ''}${n.warn ? ` · ${n.warn} con algo que mirar` : ''}. Solo lo ves tú.</p></div>
      <div class="row between"><div class="seg" role="group" aria-label="Filtrar">${[['todas', `Todas · ${rows.length}`], ['mirar', `Para mirar · ${rows.filter(r => r.e.lvl === 'bad' || r.e.lvl === 'warn').length}`], ['sin', `Sin responder · ${rows.filter(r => r.e.lvl === 'none' || (r.e.last && daysBetween(r.e.last, t) >= 4)).length}`]].map(([k, l]) => `<button type="button" data-pf="${k}" aria-pressed="${(A.pf || 'todas') === k}">${l}</button>`).join('')}</div>
        <button class="btn ghost small" type="button" data-a="tabla">${A.tabla ? 'Ver tarjetas' : 'Ver tabla'}</button></div>
      ${A.tabla ? '' : `<div class="pcards">${rows.filter(r => (A.pf || 'todas') === 'todas' || (A.pf === 'mirar' ? (r.e.lvl === 'bad' || r.e.lvl === 'warn') : (r.e.lvl === 'none' || (r.e.last && daysBetween(r.e.last, t) >= 4)))).map(pcardHTML).join('') || '<p class="sub">Nadie en este grupo.</p>'}</div>`}
      <section class="card"${A.tabla || !rows.length ? '' : ' hidden'}>${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Jugadora</th><th>Estado</th><th class="num">Llega hoy</th><th class="num">Su media</th><th class="num">Carga 7 días</th><th class="num">Semana / mes</th><th>Última respuesta</th><th>Semana</th></tr></thead><tbody>
        ${rows.map(({ u, e }) => `<tr class="click" data-jug="${u}" tabindex="0"><td><b>${esc(A.jug[u].nombre)}</b></td><td>${stHTML(e.lvl)}</td><td class="num">${fmt1(e.s)}</td><td class="num">${fmt1(e.base)}</td><td class="num">${fmtInt(e.L.acute)}</td><td class="num">${e.L.ratio == null ? '—' : fmt1(e.L.ratio)}</td><td>${e.last ? esc(e.last === t ? 'hoy' : fmtShort(e.last)) : '—'}</td><td>${semDe(u)[lunes] ? 'Hecha' : '—'}</td></tr>`).join('')}</tbody></table></div>
        <p class="chart-note">«Llega hoy»: media de sus cinco respuestas de hoy (1 a 10). «Semana / mes»: carga de los últimos 7 días dividida por su media semanal del último mes; avisa por encima de 1,3 o por debajo de 0,8 (necesita 3 semanas de datos).</p>` : `<p class="sub">${activas().length ? '' : 'Todavía no hay jugadoras activas. Actívalas en «Altas» cuando tengas su consentimiento firmado.'}</p>`}</section>`, { nav: navA(), wide: true, right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
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
  function resumenView() {
    const t = today(), cal = calOf(A.cal);
    let ref = t; for (let i = 0; i < 7; i++) { const d = addDays(t, -i); if (entrena(cal, d)) { ref = d; break; } }
    const us = activas();
    const resp = us.filter(u => (diasDe(u)[ref] || {}).antes).length;
    const media = mean(us.map(u => wellScore((diasDe(u)[ref] || {}).antes)).filter(x => x != null));
    // el equipo como si fuera una jugadora: su media de cada día
    const teamDias = {};
    for (let i = 0; i < 40; i++) { const d = addDays(t, -i), m = mean(us.map(u => wellScore((diasDe(u)[d] || {}).antes)).filter(x => x != null)); if (m != null) teamDias[d] = { antes: Object.assign(Object.fromEntries(WELL.map(w => [w.k, m])), { esc: 10 }) }; }
    const base = baseline(teamDias, ref);
    let acute = 0, chronic = 0, conDatos = 0; us.forEach(u => { const L = loads(diasDe(u), t); acute += L.acute; chronic += L.chronic; if (L.span >= 21) conDatos++; });
    const ratio = chronic > 0 && conDatos ? acute / chronic : null, pctC = ratio == null ? null : Math.round((ratio - 1) * 100);
    const rows = us.map(u => ({ u, e: estado(diasDe(u), t) })).sort((a, b) => ORD[a.e.lvl] - ORD[b.e.lvl] || (a.e.s ?? 99) - (b.e.s ?? 99));
    const cnt = k => rows.filter(r => r.e.lvl === k).length, mirar = rows.filter(r => r.e.lvl === 'bad' || r.e.lvl === 'warn');
    const lunes = mondayOf(t), cerradas = us.filter(u => semDe(u)[lunes]).length;
    // las cinco de hoy frente a lo normal en el equipo (28 días)
    const cinco = WELL.map(w => { const v = mean(us.map(u => { const a = (diasDe(u)[ref] || {}).antes; return a && a[w.k] >= 1 ? diez(a[w.k], a) : null; }).filter(x => x != null));
      const B0 = []; us.forEach(u => { for (let i = 1; i <= 28; i++) { const a = (diasDe(u)[addDays(ref, -i)] || {}).antes; if (a && a[w.k] >= 1) B0.push(diez(a[w.k], a)); } });
      const b = B0.length >= 7 ? mean(B0) : null, dl = v != null && b != null ? v - b : null;
      return `<div class="c5 ${hcls(v == null ? null : Math.round(v))}"><span class="c5-f">${face(v == null ? 3 : Math.max(1, Math.min(5, Math.ceil(v / 2))))}</span><b>${fmt1(v)}</b><small>${esc(w.s)}</small>${dl != null && Math.abs(dl) >= 0.5 ? `<span class="dl ${dl < 0 ? 'down' : 'up'}">${dl < 0 ? '↓' : '↑'}${fmt1(Math.abs(dl))}</span>` : '<span class="dl"></span>'}</div>`; }).join('');
    const notas = us.filter(u => ((diasDe(u)[ref] || {}).antes || {}).nota);
    const prox = allPart(A.cal).filter(x => x.fecha >= t && daysBetween(t, x.fecha) <= 3).slice(0, 2);
    const nR = x => { const L = us.map(u => respPart(u, x)).filter(Boolean); return `<span class="hoy">${L.filter(p => p.pre).length} antes · ${L.filter(p => p.juega).length} después</span>`; };
    const sem = us.map(u => semDe(u)[lunes]).filter(Boolean), ti = sem.map(x => x.tiempo).filter(Boolean), cu = sem.map(x => x.cumplida).filter(Boolean);
    const cuN = k => cu.filter(x => x === k).length;
    const pf = ({ u, e }) => { const r = top1(e); return `<button type="button" class="pf ${e.lvl}" data-jug="${u}"><span class="pf-av">${avDe(u)}${r && e.lvl !== 'ok' ? `<i class="pf-b ${r.lvl}">${ric(r.ic)}</i>` : ''}</span><b>${esc(nom1(u))}</b><small>${e.s != null ? fmt1(e.s) : '—'}</small></button>`; };
    shell(`<div class="dt-h"><div><span class="kicker">${ref === t ? 'Hoy' : 'Último entreno'} · ${esc(fmtDay(ref))}</span><h1>Equipo</h1></div></div>
      ${us.length ? `<section class="card pulse">
        <div class="p-g">${gaugeSVG(media, base, 'Cómo llegan')}<span class="p-l">Cómo llegan</span></div>
        <div class="p-s">
          <div class="pst">${ringSVG(resp / us.length, `${resp}/${us.length}`, `Han respondido ${resp} de ${us.length}`)}<span>Responden</span></div>
          <div class="pst"><span class="big ${pctC == null ? '' : pctC > 30 ? 'bad' : pctC > 15 ? 'warn' : pctC < -20 ? 'warn' : 'ok'}">${pctC == null ? '—' : (pctC > 0 ? '+' : '') + pctC + '%'}</span><span>Carga · semana</span></div>
          <div class="pst">${ringSVG(cerradas / us.length, `${cerradas}/${us.length}`, `Diarios de la semana: ${cerradas} de ${us.length}`)}<span>Diarios</span></div>
        </div></section>
      <section class="card"><div class="card-h"><h2>Cada una</h2><span class="leg">${['bad', 'warn', 'ok', 'none'].map(k => cnt(k) ? `<span class="lg ${k}"><i></i>${cnt(k)}</span>` : '').join('')}</span></div>
        <div class="pfs">${rows.map(pf).join('')}</div></section>
      ${mirar.length ? `<section class="card"><h2>Para mirar</h2><div class="mir">${mirar.map(({ u, e }) => `<button type="button" class="mr ${e.lvl}" data-jug="${u}"><span class="mr-av">${avDe(u)}</span><span class="mr-b"><b>${esc(nom1(u))}</b>${chipsHTML(e.R.filter(r => r.lvl !== 'none').sort((a, b) => (ORD[a.lvl] ?? 4) - (ORD[b.lvl] ?? 4)))}</span></button>`).join('')}</div></section>` : ''}
      <section class="card"><div class="card-h"><h2>Las cinco</h2><span class="sub">hoy · ↑↓ frente a lo normal</span></div><div class="cinco">${cinco}</div></section>
      ${notas.length ? `<section class="card"><h2>Te han contado</h2><div class="bubs">${notas.map(u => bubHTML(u, diasDe(u)[ref].antes.nota)).join('')}</div></section>` : ''}
      ${prox.length ? `<section class="strip"><div class="strip-h"><h2>${prox[0].fecha === t ? 'Partido de hoy' : 'Próximo partido'}</h2></div><div class="tkts">${prox.map(x => ticketHTML(x, nR(x), `data-part="${x.id}"`)).join('')}</div></section>` : ''}
      <section class="card"><h2>4 semanas</h2>${wellChart(teamDias, t)}</section>
      ${cuadranteHTML(us, ref)}
      <section class="card"><div class="card-h"><h2>Diario</h2><span class="sub">${cerradas} de ${us.length}</span></div>
        ${ti.length ? `<div class="wx-sum">${TIEMPO.map(([v, l]) => `<span class="${ti.includes(v) ? '' : 'off'}">${wx(v)}<b>${ti.filter(x => x === v).length}</b><small>${l}</small></span>`).join('')}</div>` : '<p class="sub">Nadie ha escrito todavía esta semana.</p>'}
        ${cu.length ? `<div class="segbar" role="img" aria-label="Compromiso anterior: ${cuN('si')} cumplidos, ${cuN('medias')} a medias, ${cuN('no')} no">${['si', 'medias', 'no'].map(k => cuN(k) ? `<i class="${k}" style="flex:${cuN(k)}"></i>` : '').join('')}</div>
          <div class="seg-leg"><span><i class="si"></i>${cuN('si')} cumplidos</span><span><i class="medias"></i>${cuN('medias')} a medias</span><span><i class="no"></i>${cuN('no')} no</span></div>` : ''}</section>`
      : `<section class="card"><p class="sub">Todavía no hay jugadoras activas. Actívalas en «Altas» cuando tengas su consentimiento firmado.</p></section>`}`,
      { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  function respBox(u, k) {
    const r = respOf(A.acc[u], k), ek = u + '|' + k, id = 'r-' + (A.view2 === 'partido' ? u + '-' : '') + k;
    if (r && !A.editResp[ek]) return `<div class="resp-done"><span><b>Tu respuesta:</b> ${esc(r.t)}</span><button class="btn ghost small" type="button" data-a="editresp" data-u="${u}" data-k="${k}">Cambiar</button></div>`;
    return `<div class="resp-box"><textarea id="${id}" maxlength="400" rows="2" placeholder="Contéstale: lo verá en su app. Mejor con una pregunta." aria-label="Tu respuesta">${esc(r ? r.t : '')}</textarea><button class="btn small primary" type="button" data-a="resp" data-u="${u}" data-k="${k}" data-in="${id}">Enviar</button></div>`;
  }
  actions.editresp = async b => { A.editResp[b.dataset.u + '|' + b.dataset.k] = true; render(); };
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
    const L = []; for (let i = 0; i < 21; i++) { const k = addDays(t, -i), d = D[k] || {}, n = [(d.antes || {}).nota, ...(d.ses || []).map(x => x.nota)].filter(Boolean); if (n.length) L.push([k, n]); }
    return L.length ? `<section class="card"><h2>Te ha contado</h2>${L.map(([k, n]) => `<div class="said"><div class="said-q"><span class="kicker">${esc(fmtDay(k))}</span><p class="nota-p">«${esc(n.join(' · '))}»</p></div>${respBox(u, 'd:' + k)}</div>`).join('')}</section>` : '';
  }
  function detalleView() {
    A.view2 = 'detalle';
    const u = A.sel, J = A.jug[u]; if (!J) { view = 'equipo'; return equipoView(); }
    const t = today(), D = diasDe(u), S = semDe(u), e = estado(D, t), a = (D[t] || {}).antes;
    const semanas = Object.keys(S).sort().reverse().slice(0, 6), p = puntos(D, S), lv = nivelDe(p);
    let resp = 0, ent = 0; for (let i = 0; i < 14; i++) { const d = addDays(t, -i); if (entrena(calOf(A.cal), d)) { ent++; if ((D[d] || {}).antes) resp++; } }
    let racha = 0, k0 = mondayOf(t); if (!S[k0]) k0 = addDays(k0, -7); while (S[k0]) { racha++; k0 = addDays(k0, -7); }
    const dl = e.s != null && e.base != null ? e.s - e.base : null;
    shell(`<button class="btn ghost small back" type="button" data-av="equipo">← Jugadoras</button>
      <section class="fhead ${e.lvl}"><span class="fh-av">${avatarSVG(J.av, lv, J.nombre)}</span>
        <div class="fh-b"><span class="kicker">Nivel ${lv + 1} · ${esc(NIVELES[lv][0])}</span><h1>${esc(J.nombre)}</h1>${stHTML(e.lvl)}</div></section>
      ${e.R.length ? chipsHTML(e.R) : ''}
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
      <section class="card"><h2>Su diario</h2>
        ${semanas.length ? `<div class="dweeks">${semanas.map(k => { const x = S[k]; return `<div class="dw"><div class="dw-h">${x.tiempo ? `<span class="dw-wx" title="${esc(TIEMPO[x.tiempo - 1][1])}">${wx(x.tiempo)}</span>` : ''}<span class="kicker">Semana del ${esc(fmtShort(k))}</span>${x.cumplida ? `<span class="stamp ${x.cumplida}">${esc(STAMP[x.cumplida] || '')}</span>` : ''}</div>
          ${x.mejor ? `<p class="dw-m"><span>Lo mejor</span>${esc(x.mejor)}</p>` : ''}${x.cambiar ? `<p class="dw-m"><span>Cambiaría</span>${esc(x.cambiar)}</p>` : ''}${x.como ? `<p class="dw-m"><span>Cómo lo hará</span>${esc(x.como)}</p>` : ''}${x.resp ? `<p class="dw-m"><span>${esc(x.pregunta || 'Respuesta')}</span>${esc(x.resp)}</p>` : ''}
          <div class="note dw-n"><span class="d">Se compromete a${x.area ? ' · ' + esc(x.area) : ''}</span><span class="t">${esc(compOf(x) || '—')}</span></div>${respBox(u, 's:' + k)}</div>`; }).join('')}</div>` : '<p class="sub">Todavía no ha escrito en su diario.</p>'}</section>`, { nav: navA(), wide: true, right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  const respPart = (u, x) => (diasDe(u)[x.fecha] || {}).partidos && diasDe(u)[x.fecha].partidos[x.id];
  function partidosView() {
    const t = today(), cat = A.pcat || 'todas', all = allPart(A.cal), L = all.filter(x => cat === 'todas' || x.cat === cat);
    const fut = L.filter(x => x.fecha >= t), pas = L.filter(x => x.fecha < t).reverse(), nResp = x => activas().filter(u => respPart(u, x)).length;
    const bal = c => { const R = all.filter(x => x.cat === c).map(resOf).filter(Boolean), n = k => R.filter(r => r.k === k).length;
      return `<button type="button" class="bal-c ${catCls(c)}" data-pcat="${c}" aria-pressed="${cat === c}"><span>${esc(c)}</span><b>${n('g')}<i>·</i>${n('e')}<i>·</i>${n('p')}</b><small>ganados · empates · perdidos</small></button>`; };
    shell(`<div><span class="kicker">Sección femenina</span><h1>Partidos</h1></div>
      <div class="bal" role="group" aria-label="Filtrar por categoría">${['Sub-15', 'Sub-17', '1ª Autonómica'].map(bal).join('')}</div>
      ${cat !== 'todas' ? `<button class="btn ghost small" type="button" data-pcat="todas">Ver todas las categorías</button>` : ''}
      <section class="strip"><div class="strip-h"><h2>Próximos</h2>${fut.length > 1 ? '<span class="sub">Desliza</span>' : ''}</div>${fut.length ? `<div class="tkts">${fut.slice(0, 10).map(x => ticketHTML(x, x.fecha === t ? `<span class="hoy">Hoy · ${nResp(x)} ${nResp(x) === 1 ? 'ha contestado' : 'han contestado'}</span>` : '', `data-part="${x.id}"`)).join('')}</div>` : '<p class="sub">No hay partidos por delante.</p>'}</section>
      <section class="strip"><div class="strip-h"><h2>Jugados</h2></div>${pas.length ? `<div class="mrcs">${pas.map(x => marcadorHTML(x, nResp(x))).join('')}</div>` : '<p class="sub">Todavía ninguno.</p>'}</section>
      <section class="card"><h2>Añadir un partido</h2><p class="sub">Los de liga vienen del calendario de la federación. Aquí puedes añadir amistosos, torneos o de copa.</p>
        <div class="row"><input type="date" id="np-fecha" class="date-in" aria-label="Fecha"><input type="time" id="np-hora" class="date-in" aria-label="Hora">
        <select id="np-cat" class="date-in" aria-label="Categoría">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="row"><input type="text" id="np-rival" class="date-in grow" placeholder="Rival" aria-label="Rival" maxlength="60"><label class="check"><input type="checkbox" id="np-casa"> En casa</label></div>
        <button class="btn small" type="button" data-a="addpart">Añadir</button>
        ${((A.cal || {}).extra || []).length ? `<ul class="list">${A.cal.extra.map(x => `<li class="li"><span><b>${esc(fmtShort(x.fecha))} · ${esc(x.cat)}</b><small>${esc(x.rival)}</small></span><button class="btn ghost small" type="button" data-a="delpart" data-id="${x.id}">Quitar</button></li>`).join('')}</ul>` : ''}</section>
      <p class="sub">Calendario de la Federación Madrileña de Patinaje. Las horas que faltan las pone la federación más adelante.</p>`, { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  function partidoView() {
    A.view2 = 'partido';
    const x = allPart(A.cal).find(y => y.id === A.part); if (!x) { view = 'partidos'; return partidosView(); }
    const R = activas().map(u => [u, respPart(u, x)]).filter(r => r[1]), pre = R.filter(r => r[1].pre), post = R.filter(r => r[1].juega), jug = post.filter(r => r[1].juega === 'si');
    const m = (L, f) => mean(L.map(r => f(r[1])).filter(v => v != null && v !== ''));
    // reparto de una respuesta de opciones: barras con el número de jugadoras
    const dist = (vals, opts) => { const n = vals.length, rows = opts.map(([k, l]) => [l, vals.filter(v => v === k).length]).filter(r => r[1]).sort((a, b) => b[1] - a[1]);
      return rows.length ? `<ul class="dist">${rows.map(([l, c]) => `<li><span>${esc(l)}</span><i><b style="width:${Math.round(c / n * 100)}%"></b></i><em>${c}</em></li>`).join('')}</ul>` : '<p class="sub">Nadie todavía.</p>'; };
    const emos = post.flatMap(r => r[1].emociones || []), cumpl = jug.map(r => r[1].cumplido).filter(Boolean);
    const ficha = ([u, pd]) => { const p = pd.pre, k = 'p:' + x.fecha + ':' + x.id, txt = (p && p.objetivo) || pd.mejor || pd.cambiar || pd.llevo;
      return `<div class="obj"><span class="kicker">${esc((A.jug[u].nombre || '').split(' ')[0])}</span>
        ${p ? `<p><b>Antes:</b> ganas ${p.ganas} · nervios ${p.nervios} · confianza ${p.confianza} · cree que irá: ${esc(lbl(ESPERA, p.espera).toLowerCase())} · le importa: ${esc(lbl(IMPORTA, p.importa).toLowerCase())}</p>${p.objetivo ? `<p><b>Se iba a fijar en:</b> ${esc(p.objetivo)}</p>` : ''}` : '<p class="sub">No contestó el antes.</p>'}
        ${pd.juega ? `<p><b>Después:</b> ${esc(partLinea(pd, 'se vio', 'disfrutó'))}${pd.cumplido ? ` · lo que se propuso: ${esc(lbl(CUMPLIDO, pd.cumplido).toLowerCase())}` : ''}</p>${emoHTML(pd.emociones)}` : '<p class="sub">Todavía no ha contado el después.</p>'}
        ${pd.mejor ? `<p><b>Mejor decisión:</b> ${esc(pd.mejor)}</p>` : ''}${pd.cambiar ? `<p><b>Cambiaría:</b> ${esc(pd.cambiar)}</p>` : ''}${pd.llevo ? `<p><b>Se lleva:</b> ${esc(pd.llevo)}</p>` : ''}
        ${txt ? respBox(u, k) : ''}</div>`; };
    shell(`<button class="btn ghost small back" type="button" data-av="partidos">← Partidos</button>
      <div><span class="kicker">${esc(x.cat)} · jornada ${x.j || '—'} · ${esc(fmtDay(x.fecha))}${x.hora ? ' · ' + esc(x.hora) : ''}</span><h1>${x.casa ? 'SMB – ' + esc(x.rival) : esc(x.rival) + ' – SMB'}</h1>${x.res ? `<p class="sub">Resultado (SMB primero): ${esc(x.res)}</p>` : ''}</div>
      ${R.length ? `<div class="tiles four"><div class="tile"><span class="k">Han contestado</span><b class="v">${pre.length} · ${post.length}</b><span class="s">antes · después</span></div>
        <div class="tile"><span class="k">Ganas</span><b class="v">${fmt1(m(pre, pd => pd.pre.ganas))}</b><span class="s">confianza ${fmt1(m(pre, pd => pd.pre.confianza))} · nervios ${fmt1(m(pre, pd => pd.pre.nervios))}</span></div>
        <div class="tile"><span class="k">Disfrute</span><b class="v">${fmt1(m(post, pd => pd.disfrute))}</b><span class="s">del 1 al 10</span></div>
        <div class="tile"><span class="k">Cómo se han visto</span><b class="v">${fmt1(m(jug, pd => pd.visto))}</b><span class="s">esfuerzo ${fmt1(m(jug, pd => pd.rpe))}</span></div></div>
      <div class="grid2"><section class="card"><h2>Lo que más les importaba</h2>${dist(pre.map(r => r[1].pre.importa), IMPORTA)}</section>
        <section class="card"><h2>Cómo creían que iría</h2>${dist(pre.map(r => r[1].pre.espera), ESPERA)}</section>
        <section class="card"><h2>Cómo se sienten después</h2>${emos.length ? `${dist(emos, EMOC.map(e => [e, e]))}<p class="sub">Cada una elige hasta tres.</p>` : '<p class="sub">Nadie todavía.</p>'}</section>
        <section class="card"><h2>Lo que se propusieron</h2>${cumpl.length ? dist(cumpl, CUMPLIDO.map(([k, l]) => [k, l === 'Sí' ? 'Lo consiguió' : l === 'No' ? 'No lo consiguió' : l])) : '<p class="sub">Nadie todavía.</p>'}</section></div>
      <section class="card"><h2>Lo que cuenta cada una</h2>${R.map(ficha).join('')}</section>`
      : `<section class="card"><p class="sub">${x.fecha > today() ? 'Todavía no se ha jugado.' : 'Nadie lo ha contado todavía.'}</p></section>`}`, { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
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
    shell(`<div><span class="kicker">Cuentas y consentimientos</span><h1>Altas</h1></div>
      <section class="card"><h2>Esperando a que las actives${P.length ? ' · ' + P.length : ''}</h2>
        <p class="sub">Actívala cuando tengas la hoja de consentimiento firmada${P.some(u => A.jug[u].menor) ? ' (en las menores, por la familia)' : ''}.</p>
        ${P.length ? `<ul class="list">${P.map(u => li(u, `<span class="row"><select id="c-${u}" aria-label="Quién ha firmado"><option value="${A.jug[u].menor ? 'familia' : 'jugadora'}">${A.jug[u].menor ? 'Firmado por la familia' : 'Firmado por ella'}</option><option value="${A.jug[u].menor ? 'jugadora' : 'familia'}">${A.jug[u].menor ? 'Firmado por ella' : 'Firmado por la familia'}</option></select><button class="btn primary small" type="button" data-a="activar" data-u="${u}">Activar</button></span>`)).join('')}</ul>` : '<p class="sub">Nadie esperando. Cuando una jugadora se da de alta, sale aquí.</p>'}</section>
      <section class="card"><h2>Activas · ${act.length}</h2>${act.length ? `<ul class="list">${act.map(u => li(u, `<span class="row"><button class="btn small" type="button" data-a="desactivar" data-u="${u}">Desactivar</button><button class="btn small danger" type="button" data-a="borrarjug" data-u="${u}">Borrar sus datos</button></span>`)).join('')}</ul>` : '<p class="sub">Ninguna todavía.</p>'}</section>
      ${des.length ? `<section class="card"><h2>Desactivadas · ${des.length}</h2><ul class="list">${des.map(u => li(u, `<span class="row"><button class="btn small" type="button" data-a="reactivar" data-u="${u}">Activar otra vez</button><button class="btn small danger" type="button" data-a="borrarjug" data-u="${u}">Borrar sus datos</button></span>`)).join('')}</ul></section>` : ''}
      ${calHTML()}
      <section class="card"><h2>Datos de todas</h2><p class="sub">Para tu archivo o para analizarlos en una hoja de cálculo.</p><div class="row"><button class="btn" type="button" data-a="csv">Descargar en CSV</button></div>
        <p class="sub">A final de temporada (30 de junio de 2027) hay que borrarlo todo.</p><div class="row"><button class="btn danger" type="button" data-a="borrartemporada">Borrar todos los datos de la temporada</button></div><p class="msg" id="msg"></p></section>`, { nav: navA(), right: '<button class="btn ghost small" type="button" data-a="out">Salir</button>' });
  }
  actions.activar = async b => { const u = b.dataset.u, tipo = $('#c-' + u).value; await B.set('acceso/' + u, { activa: true, equipo: EQ, consentimiento: { tipo, fecha: today() }, ts: Date.now() }); toast(`${A.jug[u].nombre} ya puede usar la app.`); };
  actions.desactivar = async b => { const u = b.dataset.u; await B.merge('acceso/' + u, { activa: false, ts: Date.now() }); toast('Desactivada. Sus datos siguen guardados.'); };
  actions.reactivar = async b => { const u = b.dataset.u; await B.merge('acceso/' + u, { activa: true, equipo: EQ, ts: Date.now() }); toast('Activada otra vez.'); };
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
    await B.batch(['sub17', 'senior', EQ].map(e => ({ op: 'del', path: 'equipos/' + e }))); toast('Temporada borrada.');
  };
  actions.csv = async () => {
    const rows = [['jugadora', 'equipo', 'fecha', ...WELL.map(w => w.n), 'bienestar (media)', 'sesiones', 'esfuerzo', 'minutos', 'carga', 'notas', 'partido', 'minutos jugados', 'se vio (1-10)', 'mejor decisión', 'cambiaría', 'ganas (antes)', 'nervios (antes)', 'confianza (antes)', 'cree que irá', 'le importa', 'se fija en', 'disfrute', 'lo consiguió', 'cómo se siente', 'se lleva']];
    activas().concat(desactivadas()).forEach(u => Object.keys(diasDe(u)).sort().forEach(k => { const d = diasDe(u)[k], a = d.antes || {}, L = d.ses || [];
      rows.push([A.jug[u].nombre, eqName(eqDe(u)), k, ...WELL.map(w => a[w.k] >= 1 ? r1(diez(a[w.k], a)) : ''), wellScore(a) == null ? '' : r1(wellScore(a)), L.map(s => s.tipo).join(' + '), L.map(s => s.rpe).join(' + '), L.map(s => s.min).join(' + '), L.length ? dayLoad(d) : '', [a.nota, ...L.map(s => s.nota)].filter(Boolean).join(' · '), ...(pp => [pp.map(x => x.cat + ' ' + x.rival).join(' + '), pp.map(x => x.min).join(' + '), pp.map(x => x.visto ?? '').join(' + '), pp.map(x => x.mejor).filter(Boolean).join(' · '), pp.map(x => x.cambiar).filter(Boolean).join(' · '), ...['ganas', 'nervios', 'confianza'].map(c => pp.map(x => (x.pre || {})[c] ?? '').join(' + ')), pp.map(x => lbl(ESPERA, (x.pre || {}).espera)).join(' + '), pp.map(x => lbl(IMPORTA, (x.pre || {}).importa)).join(' + '), pp.map(x => (x.pre || {}).objetivo).filter(Boolean).join(' · '), pp.map(x => x.disfrute ?? '').join(' + '), pp.map(x => lbl(CUMPLIDO, x.cumplido)).join(' + '), pp.map(x => (x.emociones || []).join(', ')).join(' + '), pp.map(x => x.llevo).filter(Boolean).join(' · ')])(Object.values(d.partidos || {}))]); }));
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
    if (b.dataset.part) { A.part = b.dataset.part; view = 'partido'; render(); scrollTo({ top: 0 }); return; }
    if (b.dataset.jug) { A.sel = b.dataset.jug; view = 'detalle'; render(); scrollTo({ top: 0 }); return; }
  });
  root.addEventListener('keydown', e => { if (isAdmin() && (e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.jug && e.target.tagName !== 'BUTTON') { e.preventDefault(); A.sel = e.target.dataset.jug; view = 'detalle'; render(); scrollTo({ top: 0 }); } });
  function startAdmin() {
    view = 'resumen';
    unsub.push(B.listenCol('jugadoras', L => { A.jug = Object.fromEntries(L.map(x => [x.id, x.data])); syncRegs(); render(); }, () => {}));
    unsub.push(B.listenDoc('equipos/' + EQ, d => { A.cal = d; render(); }, () => {}));
    cargarPartidos();
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
    if (isAdmin()) { if (view === 'detalle') return detalleView(); if (view === 'temporada') return temporadaView(); if (view === 'partidos') return partidosView(); if (view === 'partido') return partidoView(); if (view === 'acceso') return accesoView(); if (view === 'equipo') return equipoView(); return resumenView(); }
    if (U.perfil === undefined || U.acceso === undefined) { gate('<p class="sub" style="text-align:center">Cargando…</p>'); return; }
    if (!U.perfil || !U.perfil.acepta || U.editAlta) return altaView();
    if (!U.acceso || !U.acceso.activa) return esperaView();
    if (view === 'bienvenida' || !ls.get(bienvenidaKey())) return bienvenidaView();
    if (view === 'antes') return antesFlowView();
    if (view === 'mflow' && draft.mf) return mfView();
    if (view === 'partidos') return partidosJView(); if (view === 'partido') return partidoJView();
    if (view === 'semana') return diarioView(); if (view === 'yo' || view === 'evol') return yoView(); if (view === 'datos') return datosView();
    return hoyView();
  }
  me = undefined; render();
  if (B) B.onAuth(u => {
    stop(); datosOn = false;
    Object.assign(U, { perfil: undefined, acceso: undefined, equipo: null, dias: {}, semanas: {}, editAlta: false });
    Object.assign(A, { jug: {}, acc: {}, regs: {}, equipos: {}, val: {}, sel: '', cal: null, editResp: {} });
    me = u || null; view = 'hoy';
    if (me && ADMIN.includes(me.uid)) startAdmin(); else if (me && ADMIN.length) startJugadora();
    render();
  });
})();
