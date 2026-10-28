// Juegos del reto con Phaser (27 oct, tarde): «Patina y marca», «Tanda de penaltis» y «La portera».
// Misma lógica que los de antes (juego.js y juegos2.js), dibujados con el motor Phaser (lib/phaser.min.js, MIT)
// y los dibujos 3D de img/ (Fluent Emoji, MIT). Phaser se carga solo la primera vez que se juega.
// Todo lo que pasa sale de la semilla: en un duelo, las dos juegan exactamente lo mismo.
// Uso: SMBJuego.jugar({ modo, avatarSrc, mascotaSrc, seed, estela, cele, titulo, onEnd(resultado) })
(function () {
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const ESTELAS = { granate: ['#681825', '#a8394b'], rosa: ['#f59797', '#ffc9c9'], menta: ['#4fbf9f', '#a6ead6'], oro: ['#e0b23c', '#fff1b8'],
    arcoiris: ['#ff5a5a', '#ffb84d', '#ffe44d', '#5ad16b', '#4da6ff', '#a36bff'], fuego: ['#ff3b1f', '#ff9a1f', '#ffd21f'] };
  const JUEGOS = [['patina', 'Patina y marca', 'Esquiva, regatea y marca leyendo a la portera'], ['penaltis', 'Tanda de penaltis', 'Apunta y elige la altura. ¿Cuántos seguidos?'], ['portera', 'La portera', 'Hoy paras tú. Ojo con los amagos']];
  const delDia = fecha => { const [y, m, d] = fecha.split('-').map(Number), n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 9, 26)) / 864e5); return JUEGOS[((n % 3) + 3) % 3]; };
  const hex = c => parseInt(c.replace('#', ''), 16);
  // sonidos sencillos (sin archivos)
  let AC = null;
  function beep(kind) {
    try {
      if (localStorage.getItem('smbf-sonido') === 'no') return;
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { bola: [[880, 0.05]], gol: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.18]], golpe: [[140, 0.18]], regate: [[440, 0.06], [660, 0.08]], pot: [[660, 0.07], [990, 0.12]], nivel: [[392, 0.1], [523, 0.1], [784, 0.2]], parada: [[300, 0.08], [220, 0.12]] }[kind] || [[600, 0.05]];
      let t = AC.currentTime;
      notes.forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = kind === 'golpe' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9; });
    } catch (e) {}
  }
  // Phaser: se carga la primera vez
  let phaserP = null;
  function cargarPhaser() {
    if (window.Phaser) return Promise.resolve();
    if (!phaserP) phaserP = new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'lib/phaser.min.js?v=4.2.1'; s.onload = () => ok(); s.onerror = () => { phaserP = null; mal(new Error('phaser')); }; document.head.appendChild(s); });
    return phaserP;
  }
  const cargaImg = src => new Promise(ok => { if (!src) return ok(null); const i = new Image(); const to = setTimeout(() => ok(null), 2500); i.onload = () => { clearTimeout(to); ok(i); }; i.onerror = () => { clearTimeout(to); ok(null); }; i.src = src; });
  const FX = ['cono', 'iman', 'escudo', 'x2', 'estrella', 'chispa', 'trofeo', 'fuego', 'guante', 'stick', 'corazon', 'moneda'];

  // la capa a pantalla completa (marcador, vidas, sonido y salir en HTML; el campo, en Phaser)
  function marco(o, hintTxt) {
    const ov = document.createElement('div'); ov.className = 'jg-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', o.titulo || 'Juego');
    const sOn = () => { try { return localStorage.getItem('smbf-sonido') !== 'no'; } catch (e) { return true; } };
    ov.innerHTML = `<div class="jg-top"><span class="jg-tt">${(o.titulo || '').replace(/</g, '&lt;')}</span><span class="jg-mu"></span><span class="jg-sc">0</span><span class="jg-lv" aria-label="Vidas"></span>
        <button type="button" class="jg-snd" aria-label="Sonido">${sOn() ? '♪' : '♪̸'}</button><button type="button" class="jg-x">Salir</button></div>
      <div class="jg-cv"><div class="jg-big"></div><div class="jg-hint">${hintTxt}</div><div class="jg-load">Cargando…</div></div>`;
    document.body.appendChild(ov); document.body.classList.add('jg-on');
    ov.querySelector('.jg-snd').addEventListener('click', e => { try { localStorage.setItem('smbf-sonido', sOn() ? 'no' : 'si'); } catch (er) {} e.currentTarget.textContent = sOn() ? '♪' : '♪̸'; });
    const cont = ov.querySelector('.jg-cv'), box = cont.getBoundingClientRect(), D = Math.min(2, window.devicePixelRatio || 1), Wc = Math.min(box.width || 380, 520), Hc = box.height || 640;
    const M = { ov, cont, D, W: Math.round(Wc * D), H: Math.round(Hc * D), S: D * Math.min(Wc / 380, Hc / 640), big: ov.querySelector('.jg-big'), hint: ov.querySelector('.jg-hint'), alive: true };
    M.score = v => { ov.querySelector('.jg-sc').textContent = Math.round(v).toLocaleString('es-ES'); };
    M.lives = (n, max = 3, extra = '') => { ov.querySelector('.jg-lv').textContent = '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, max - n)) + extra; };
    M.mu = t => { ov.querySelector('.jg-mu').textContent = t || ''; };
    M.salir = fn => { ov.querySelector('.jg-x').addEventListener('click', fn); };
    M.cerrar = (res, sal, cb) => {
      if (!M.alive) return; M.alive = false; (M.limpia || []).forEach(f => { try { f(); } catch (e) {} });
      setTimeout(() => { try { M.game && M.game.destroy(true); } catch (e) {} ov.remove(); document.body.classList.remove('jg-on'); cb && cb(res); }, sal ? 0 : 1100);
    };
    // arranca Phaser con la escena; antes carga el motor, su personaje y la mascota
    M.arrancar = async (escena, fondo) => {
      try { await cargarPhaser(); } catch (e) { ov.querySelector('.jg-load').textContent = 'No se ha podido cargar el juego. Revisa la conexión.'; return; }
      const [av, pet] = await Promise.all([cargaImg(o.avatarSrc), cargaImg(o.mascotaSrc)]);
      if (!M.alive) return;
      M.imgAv = av; M.imgPet = pet;
      M.game = new Phaser.Game({ type: Phaser.AUTO, parent: cont, width: M.W, height: M.H, backgroundColor: fondo || '#eaf1f8', banner: false,
        scale: { mode: Phaser.Scale.NONE, zoom: 1 / D }, input: { keyboard: false }, audio: { noAudio: true }, render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' }, fps: { target: 60, smoothStep: true },
        scene: { preload() { FX.forEach(k => this.load.image(k, 'img/' + k + '.webp')); }, create() { ov.querySelector('.jg-load').remove(); comunes(this, M); escena.create.call(this); }, update(t, dl) { if (M.alive) escena.update.call(this, Math.min(0.05, dl / 1000)); } } });
      M.canvas = () => cont.querySelector('canvas');
    };
    return M;
  }
  // texturas propias dibujadas a mano (a doble tamaño: se ven nítidas)
  function lienzo(sc, key, w, h, dibuja) { if (sc.textures.exists(key)) sc.textures.remove(key); const t = sc.textures.createCanvas(key, w, h), c = t.getContext(); dibuja(c, w, h); t.refresh(); return key; }
  function comunes(sc, M) {
    const S = M.S;
    lienzo(sc, 'punto', 32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
    lienzo(sc, 'conf', 12, 18, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 12, 18); });
    lienzo(sc, 'bola', 64, 64, (c) => { const g = c.createRadialGradient(24, 22, 4, 32, 32, 30); g.addColorStop(0, '#ffc08a'); g.addColorStop(0.45, '#ff7a1a'); g.addColorStop(1, '#c4500a'); c.fillStyle = g; c.beginPath(); c.arc(32, 32, 29, 0, 6.29); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(23, 21, 8, 5, -0.6, 0, 6.29); c.fill(); });
    lienzo(sc, 'sombra', 64, 24, (c) => { const g = c.createRadialGradient(32, 12, 2, 32, 12, 30); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 24); });
    lienzo(sc, 'brillo', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
    // su personaje en un círculo con borde granate
    lienzo(sc, 'yo', 160, 160, (c) => { c.save(); c.beginPath(); c.arc(80, 80, 72, 0, 6.29); c.closePath(); c.fillStyle = '#e6c6cb'; c.fill(); c.clip(); if (M.imgAv) c.drawImage(M.imgAv, 80 - 72 * 1.18, 80 - 72 * 1.12, 144 * 1.18, 144 * 1.18); c.restore(); c.lineWidth = 9; c.strokeStyle = '#681825'; c.beginPath(); c.arc(80, 80, 74, 0, 6.29); c.stroke(); c.lineWidth = 3; c.strokeStyle = '#fff'; c.beginPath(); c.arc(80, 80, 79, 0, 6.29); c.stroke(); });
    if (M.imgPet) lienzo(sc, 'pet', 160, 160, (c) => c.drawImage(M.imgPet, 0, 0, 160, 160));
    // rival (vista desde arriba): camiseta azul, cara y stick
    lienzo(sc, 'rival', 128, 128, (c) => { c.strokeStyle = '#3b2a1a'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(80, 70); c.lineTo(100, 118); c.stroke(); const g = c.createRadialGradient(54, 52, 8, 64, 64, 44); g.addColorStop(0, '#5b8ee6'); g.addColorStop(1, '#1f4a99'); c.fillStyle = g; c.beginPath(); c.arc(64, 64, 42, 0, 6.29); c.fill(); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke(); c.fillStyle = '#f2d2b6'; c.beginPath(); c.arc(64, 54, 18, 0, 6.29); c.fill(); c.fillStyle = '#4a2f1d'; c.beginPath(); c.arc(64, 48, 18, Math.PI, 0); c.fill(); c.fillStyle = '#2a1d1a'; c.beginPath(); c.arc(57, 57, 2.6, 0, 6.29); c.arc(71, 57, 2.6, 0, 6.29); c.fill(); });
    // cuerpos vistos desde arriba: camiseta con hombros y manos; patín con ruedas; cabeza de rival
    const cuerpo = (key, c1, c2, txt) => lienzo(sc, key, 160, 110, (c) => { const g = c.createLinearGradient(0, 0, 0, 110); g.addColorStop(0, c1); g.addColorStop(1, c2);
      c.fillStyle = g; c.beginPath(); c.ellipse(80, 58, 62, 38, 0, 0, 6.29); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(64, 42, 30, 12, -0.3, 0, 6.29); c.fill();
      c.fillStyle = '#f2d2b6'; c.beginPath(); c.arc(18, 52, 11, 0, 6.29); c.arc(142, 52, 11, 0, 6.29); c.fill();
      if (txt) { c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '900 22px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.fillText(txt, 80, 80); } });
    cuerpo('cuerpoP', '#a8394b', '#681825', 'SMB'); cuerpo('cuerpoR', '#5b8ee6', '#1f4a99', '');
    lienzo(sc, 'patinT', 40, 80, (c) => { c.fillStyle = '#2b2b33'; c.beginPath(); c.roundRect ? c.roundRect(6, 4, 28, 72, 12) : c.rect(6, 4, 28, 72); c.fill(); c.fillStyle = '#ff5a7a'; [14, 30, 46, 62].forEach(y => { c.beginPath(); c.arc(20, y, 6, 0, 6.29); c.fill(); }); });
    lienzo(sc, 'cabezaR', 96, 96, (c) => { c.fillStyle = '#f2d2b6'; c.beginPath(); c.arc(48, 50, 34, 0, 6.29); c.fill(); c.fillStyle = '#4a2f1d'; c.beginPath(); c.arc(48, 42, 35, Math.PI * 1.02, Math.PI * 1.98); c.fill(); c.fillRect(13, 36, 70, 8);
      c.fillStyle = '#2a1d1a'; c.beginPath(); c.arc(37, 56, 4, 0, 6.29); c.arc(59, 56, 4, 0, 6.29); c.fill(); c.strokeStyle = '#2a1d1a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(41, 70); c.quadraticCurveTo(48, 75, 55, 70); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(48, 50, 35, 0, 6.29); c.stroke(); });
    // una patinadora completa (contenedor): patines que se mueven al patinar, cuerpo, stick y cabeza
    sc.patinadora = (x, y, T, rival) => { const c = sc.add.container(x, y), sh = sc.add.image(0, T * 0.45, 'sombra').setDisplaySize(T * 1.4, T * 0.4),
        p1 = sc.add.image(-T * 0.24, T * 0.18, 'patinT').setDisplaySize(T * 0.24, T * 0.48), p2 = sc.add.image(T * 0.24, T * 0.18, 'patinT').setDisplaySize(T * 0.24, T * 0.48),
        cu = sc.add.image(0, T * 0.12, rival ? 'cuerpoR' : 'cuerpoP').setDisplaySize(T * 1.2, T * 0.82), st = sc.add.image(T * 0.42, -T * 0.3, 'stick').setDisplaySize(T * 0.85, T * 0.85).setAngle(rival ? 150 : -20),
        cab = sc.add.image(0, -T * 0.02, rival ? 'cabezaR' : 'yo').setDisplaySize(T * 0.8, T * 0.8);
      c.add([sh, p1, p2, cu, st, cab]); c.T = T; c.p = { sh, p1, p2, cu, st, cab };
      c.paso = (fase, amp = 1) => { const a = Math.sin(fase) * T * 0.1 * amp; p1.y = T * 0.18 + a; p2.y = T * 0.18 - a; p1.angle = -6 - Math.sin(fase) * 8 * amp; p2.angle = 6 - Math.sin(fase) * 8 * amp; cu.y = T * 0.12 + Math.abs(Math.sin(fase)) * T * 0.02; };
      return c; };
    // portera de frente (peto, guantes y espinilleras)
    lienzo(sc, 'portero', 160, 200, (c) => { const r = (x, y, w, h, rr, f) => { c.fillStyle = f; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, rr) : c.rect(x, y, w, h); c.fill(); };
      r(38, 132, 34, 64, 10, '#ffd21f'); r(88, 132, 34, 64, 10, '#ffd21f'); r(46, 70, 68, 70, 16, '#1f1f1f'); r(54, 82, 52, 8, 4, '#ffd21f'); r(8, 70, 36, 40, 12, '#ffd21f'); r(116, 70, 36, 40, 12, '#ffd21f');
      const g = c.createRadialGradient(72, 34, 4, 80, 42, 30); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b8bec6'); c.fillStyle = g; c.beginPath(); c.arc(80, 42, 28, 0, 6.29); c.fill(); c.strokeStyle = '#444'; c.lineWidth = 3; for (let i = -14; i <= 14; i += 7) { c.beginPath(); c.moveTo(80 + i, 22); c.lineTo(80 + i, 62); c.stroke(); } c.beginPath(); c.moveTo(56, 44); c.lineTo(104, 44); c.stroke(); });
    // portería de frente con red
    sc.porteriaTex = (key, w, h) => lienzo(sc, key, w, h, (c) => { const p = Math.max(6, w * 0.022); c.fillStyle = 'rgba(255,255,255,.92)'; c.fillRect(p, p, w - 2 * p, h - p); c.strokeStyle = 'rgba(0,0,0,.10)'; c.lineWidth = 1.5; const st = Math.max(10, w / 30);
      for (let x = p; x <= w - p; x += st) { c.beginPath(); c.moveTo(x, p); c.lineTo(x, h); c.stroke(); } for (let y = p; y <= h; y += st) { c.beginPath(); c.moveTo(p, y); c.lineTo(w - p, y); c.stroke(); }
      const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#b01e2f'); g.addColorStop(0.5, '#e8384c'); g.addColorStop(1, '#b01e2f'); c.strokeStyle = g; c.lineWidth = p * 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(p, h); c.lineTo(p, p); c.lineTo(w - p, p); c.lineTo(w - p, h); c.stroke(); });
    // la grada: cabezas de colores sobre fondo oscuro (para los pabellones)
    lienzo(sc, 'grada', 512, 96, (c) => { const g = c.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#1b2440'); c.fillStyle = g; c.fillRect(0, 0, 512, 96);
      const C = ['#681825', '#a8394b', '#ffffff', '#ffd21f', '#4da6ff', '#f2d2b6', '#c98a5a', '#2c5fb3']; let k = 7; const rr = () => (k = (k * 16807) % 2147483647) / 2147483647;
      for (let row = 0; row < 4; row++) for (let x = (row % 2) * 9; x < 520; x += 18) { const y = 18 + row * 22 + rr() * 4; c.fillStyle = C[Math.floor(rr() * C.length)]; c.beginPath(); c.arc(x, y + 8, 9, Math.PI, 0); c.fill(); c.fillStyle = '#f2d2b6'; c.beginPath(); c.arc(x, y, 6, 0, 6.29); c.fill(); } });
    // cartel de la banda con el nombre del club
    [['banda', -1, 28], ['bandaD', 1, 0]].forEach(([k, gira, borde]) => lienzo(sc, k, 32, 256, (c) => { c.fillStyle = '#681825'; c.fillRect(0, 0, 32, 256); c.save(); c.translate(gira < 0 ? 22 : 10, 128); c.rotate(gira * Math.PI / 2); c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '800 18px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.fillText('SANTA MARÍA', 0, 0); c.restore(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(borde, 0, 4, 256); }));
    // utilidades de la escena
    sc.pop = (s, x, y, color, size = 18) => { const t = sc.add.text(x, y, s, { fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(size * S) + 'px', fontStyle: '800', color: color || '#681825', stroke: '#ffffff', strokeThickness: Math.round(4 * S) }).setOrigin(0.5).setDepth(50);
      sc.tweens.add({ targets: t, y: y - 70 * S, alpha: 0, duration: 850, ease: 'Cubic.easeOut', onComplete: () => t.destroy() }); };
    sc.grita = (s, bien, fondo) => { if (sc._grito) sc._grito.destroy(); const t = sc.add.text(M.W / 2, M.H * 0.42, s, { fontFamily: 'Fraunces, Georgia, serif', fontSize: Math.round(42 * S) + 'px', fontStyle: '700', color: bien ? '#2fbf6a' : '#ff4d4d', stroke: fondo === 'oscuro' ? '#0b1224' : '#ffffff', strokeThickness: Math.round(7 * S), align: 'center' }).setOrigin(0.5).setDepth(60).setScale(0.4);
      sc._grito = t; sc.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' }); sc.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 350, onComplete: () => t.destroy() }); };
    sc.chispas = sc.add.particles(0, 0, 'punto', { speed: { min: 80 * S, max: 260 * S }, lifespan: 600, scale: { start: 0.55 * S, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false }).setDepth(40);
    sc.confeti = sc.add.particles(0, 0, 'conf', { speed: { min: 150 * S, max: 460 * S }, angle: { min: 200, max: 340 }, gravityY: 700 * S, lifespan: 1400, rotate: { min: 0, max: 360 }, scale: { min: 0.5 * S, max: 0.9 * S }, tint: [0xff5a5a, 0xffb84d, 0xffe44d, 0x5ad16b, 0x4da6ff, 0xa36bff, 0xffffff], emitting: false }).setDepth(45);
  }
  const cuenta = (M, dt, st) => { st.ct += dt; if (st.ct >= 0.7) { st.ct = 0; st.cnt--; } M.big.textContent = st.cnt > 0 ? st.cnt : '¡Ya!'; if (st.cnt <= 0 && st.ct > 0.35) { M.big.textContent = ''; return true; } return false; };

  // ================= Patina y marca =================
  const POT = { iman: { img: 'iman', n: '¡Imán!', c: 0x4da6ff }, escudo: { img: 'escudo', n: '¡Escudo!', c: 0x5ad16b }, x2: { img: 'x2', n: '¡Puntos dobles!', c: 0xffb800 } };
  const ZONAS = [{ n: 'La pista del cole', bg: '#eaf1f8', ln: 0x681825, la: 0.14, tx: '#681825' }, { n: 'Pabellón de noche', bg: '#22304f', ln: 0xffffff, la: 0.16, tx: '#ffffff' }, { n: 'Pista al atardecer', bg: '#ffe3cf', ln: 0xa03c14, la: 0.2, tx: '#8a3a1c' }, { n: 'La gran final', bg: '#1d0f14', ln: 0xe0b23c, la: 0.25, tx: '#e0b23c' }];
  function patina(o) {
    const M = marco(o, 'Toca a un lado para cambiar de carril · Desliza hacia arriba para regatear'), R = rng(o.seed || 1), colsE = (ESTELAS[o.estela] || ESTELAS.granate).map(hex), cele = o.cele || '¡GOL!';
    const { W, H, S } = M, laneX = i => W * (0.2 + 0.3 * i), PY = H * 0.8;
    let lane = 1, px = laneX(1), lives = 3, inv = 0, t = 0, dist = 0, nextRow = 0, rows = 0, puntos = 0, bolas = 0, goles = 0, regates = 0, combo = 0, mult = 1, maxMult = 1;
    let ents = [], started = false, salto = 0, nivel = 0, iman = 0, escudo = false, x2 = 0, sc = null, yo, sombra, pet, estela, fondo, lineas, circulo, aura, st = { cnt: 3, ct: 0 };
    const speed = () => 300 * S * Math.min(2.4, 1 + t * 0.026);
    const hud = () => { M.lives(lives, 3, escudo ? ' ✚' : ''); M.mu(mult > 1 || x2 > 0 ? `×${mult * (x2 > 0 ? 2 : 1)}` : ''); };
    hud();
    function spawnRow() {
      rows++; const y = -70 * S, lv = nivel;
      if (rows % 11 === 0) { const e = { k: 'goal', y, ph: R() * 6.28, vel: 1.1 + lv * 0.35 + R() * 0.4 };
        e.red = sc.add.image(W / 2, y, sc.porteriaTex('redp' + rows, Math.round(W * 0.88), Math.round(46 * S))).setDepth(5);
        e.gk = sc.add.image(W / 2, y, 'portero').setDisplaySize(64 * S, 80 * S).setDepth(6);
        e.tx = sc.add.text(W / 2, y - 44 * S, '¡LEE A LA PORTERA!', { fontFamily: 'Inter, Arial', fontSize: Math.round(12 * S) + 'px', fontStyle: '800', color: ZONAS[nivel % 4].tx }).setOrigin(0.5).setDepth(6);
        ents.push(e); return; }
      const r = R(), free = [0, 1, 2];
      if (r < 0.64) {
        const nObs = rows > 8 && R() < 0.3 + lv * 0.08 ? 2 : 1;
        for (let i = 0; i < nObs; i++) {
          const j = Math.floor(R() * free.length), l = free.splice(j, 1)[0], k = R() < 0.72 ? 'rival' : 'cono';
          const cambia = k === 'rival' && lv >= 1 && nObs === 1 && R() < 0.3 ? (l === 0 ? 1 : l === 2 ? -1 : (R() < 0.5 ? -1 : 1)) : 0;
          const e = { k, l, y, wob: R() * 6.28, cambia, lx: l };
          e.sh = sc.add.image(laneX(l), y + 22 * S, 'sombra').setDisplaySize(50 * S, 16 * S).setDepth(3);
          e.sp = k === 'rival' ? sc.patinadora(laneX(l), y, 54 * S, true).setDepth(8) : sc.add.image(laneX(l), y, 'cono').setDisplaySize(50 * S, 50 * S).setDepth(8);
          if (k === 'rival') { e.sh.setVisible(false); e.fase = R() * 6; }
          if (cambia) e.fl = sc.add.text(laneX(l), y - 34 * S, cambia > 0 ? '→' : '←', { fontFamily: 'Inter, Arial', fontSize: Math.round(22 * S) + 'px', fontStyle: '900', color: '#ff3b1f', stroke: '#fff', strokeThickness: Math.round(4 * S) }).setOrigin(0.5).setDepth(9);
          ents.push(e);
        }
      }
      if (R() < 0.07 && free.length) { const l = free[Math.floor(R() * free.length)], ks = Object.keys(POT), p = ks[Math.floor(R() * ks.length)], e = { k: 'pot', p, l, y };
        e.gl = sc.add.image(laneX(l), y, 'brillo').setDisplaySize(70 * S, 70 * S).setTint(POT[p].c).setDepth(7); e.sp = sc.add.image(laneX(l), y, POT[p].img).setDisplaySize(40 * S, 40 * S).setDepth(8);
        sc.tweens.add({ targets: e.gl, scale: e.gl.scale * 1.25, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 }); ents.push(e); return; }
      free.forEach(l => { if (R() < (r < 0.64 ? 0.38 : 0.6)) { const e = { k: 'bola', l, y }; e.sp = sc.add.image(laneX(l), y, 'bola').setDisplaySize(22 * S, 22 * S).setDepth(7); ents.push(e); } });
    }
    const rx = e => { if (!e.cambia) return laneX(e.l); const f = Math.max(0, Math.min(1, (e.y - H * 0.25) / (H * 0.2))); return laneX(e.lx) + (laneX(e.lx + e.cambia) - laneX(e.lx)) * f; };
    const gkx = e => W / 2 + Math.sin(e.ph + t * e.vel) * W * 0.3;
    const quita = e => { ['sp', 'sh', 'gl', 'fl', 'red', 'gk', 'tx'].forEach(k => { if (e[k]) { e[k].destroy(); e[k] = null; } }); };
    function move(d) { if (!M.alive || !started) return; lane = Math.max(0, Math.min(2, lane + d)); M.hint.classList.add('off'); }
    function regatear() { if (!M.alive || !started || salto > 0) return; salto = 0.6; beep('regate'); M.hint.classList.add('off'); }
    let p0 = null;
    const onDown = e => { if (e.target.closest && e.target.closest('button')) return; e.preventDefault(); p0 = { x: e.clientX, y: e.clientY }; };
    const onUp = e => { if (!p0) return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y, r = M.cont.getBoundingClientRect(), s0 = p0; p0 = null;
      if (dy < -30 && Math.abs(dy) > Math.abs(dx)) regatear(); else if (Math.abs(dx) > 30) move(dx < 0 ? -1 : 1); else move((s0.x - r.left) < r.width / 2 ? -1 : 1); };
    const onKey = e => { if (e.key === 'ArrowLeft') { move(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { move(1); e.preventDefault(); } else if (e.key === 'ArrowUp' || e.key === ' ') { regatear(); e.preventDefault(); } else if (e.key === 'Escape') fin(true); };
    M.cont.addEventListener('pointerdown', onDown); M.cont.addEventListener('pointerup', onUp); addEventListener('keydown', onKey);
    M.limpia = [() => removeEventListener('keydown', onKey)];
    M.salir(() => fin(true));
    const ganar = (base, x, y, c) => { const v = Math.round(base * mult * (x2 > 0 ? 2 : 1)); puntos += v; sc.pop('+' + v, x, y, c); };
    function zona() { const z = ZONAS[nivel % 4]; sc.cameras.main.setBackgroundColor(z.bg); lineas.clear(); lineas.lineStyle(3 * S, z.ln, z.la); [0.35, 0.65].forEach(f => { for (let y = 0; y < H + 80 * S; y += 40 * S) lineas.lineBetween(W * f, y, W * f, y + 18 * S); }); circulo.clear(); circulo.lineStyle(4 * S, z.ln, z.la * 1.6); circulo.lineBetween(0, 0, W, 0); circulo.strokeCircle(W / 2, 0, 46 * S); }
    function fin(sal) { if (!M.alive) return; const res = { modo: 'patina', puntos: Math.round(puntos), bolas, goles, regates, combo: maxMult, nivel: nivel + 1, segundos: Math.round(t), salida: sal }; M.cerrar(res, sal, o.onEnd); }
    M.arrancar({
      create() {
        sc = this;
        lineas = sc.add.graphics().setDepth(1); circulo = sc.add.graphics().setDepth(1); zona();
        // bandas de la pista con el cartel del club (corren con la pista) y brillo del suelo
        sc.brilloPista = sc.add.image(W / 2, H * 0.25, 'brillo').setDisplaySize(W * 1.4, H * 0.7).setAlpha(0.28).setDepth(0);
        sc.bandaI = sc.add.tileSprite(0, 0, 32, H / (16 * S / 32), 'banda').setOrigin(0, 0).setScale(16 * S / 32).setDepth(20);
        sc.bandaD = sc.add.tileSprite(W - 16 * S, 0, 32, H / (16 * S / 32), 'bandaD').setOrigin(0, 0).setScale(16 * S / 32).setDepth(20);
        estela = sc.add.particles(0, 0, 'punto', { speedY: { min: 180 * S, max: 320 * S }, speedX: { min: -30 * S, max: 30 * S }, lifespan: 520, scale: { start: 0.65 * S, end: 0 }, alpha: { start: 0.95, end: 0 }, tint: colsE, frequency: 14 }).setDepth(9);
        sombra = { setScale() {}, x: 0 };
        if (sc.textures.exists('pet')) pet = sc.add.image(px + 40 * S, PY + 8 * S, 'pet').setDisplaySize(46 * S, 46 * S).setDepth(10);
        aura = sc.add.image(px, PY, 'brillo').setDisplaySize(96 * S, 96 * S).setDepth(10).setAlpha(0);
        yo = sc.patinadora(px, PY, 60 * S, false).setDepth(11);
        estela.startFollow(yo, 0, 30 * S);
        sc.cameras.main.filters && sc.cameras.main.filters.external.addVignette(0.5, 0.5, 0.95, 0.25);
      },
      update(dt) {
        px += (laneX(lane) - px) * Math.min(1, dt * 16);
        if (!started) { if (cuenta(M, dt, st)) started = true; yo.x = px; yo.paso(performance.now() / 120, 0.3); return; }
        t += dt; const v = speed(), dy = v * dt; dist += dy;
        const nv = Math.floor(t / 25); if (nv > nivel) { nivel = nv; beep('nivel'); zona(); banner(); }
        if (dist >= nextRow) { spawnRow(); nextRow += 165 * S; }
        puntos += dt * 10 * (x2 > 0 ? 2 : 1);
        inv = Math.max(0, inv - dt); salto = Math.max(0, salto - dt); if (iman > 0) iman -= dt; if (x2 > 0) x2 -= dt;
        lineas.y = (dist % (40 * S)) - 40 * S; sc.bandaI.tilePositionY -= dy / (16 * S / 32); sc.bandaD.tilePositionY -= dy / (16 * S / 32); const lc = dist % (900 * S); circulo.setVisible(lc < H + 200 * S); circulo.y = lc - 100 * S;
        ents.forEach(e => {
          e.y += dy; if (e.done && e.k !== 'goal') return;
          if (e.k === 'bola' && iman > 0 && e.y > PY - 260 * S && e.y < PY + 20 * S) { const x0 = e.x != null ? e.x : laneX(e.l); e.x = x0 + (px - x0) * Math.min(1, dt * 7); e.y += (PY - e.y) * Math.min(1, dt * 5); }
          if (e.k === 'goal') { const gx = e.done ? e.gx : gkx(e); e.red.y = e.y; e.gk.x = gx; e.gk.y = e.y - 4 * S; e.tx.y = e.y - 44 * S;
            if (!e.done && e.y >= PY) { e.done = true; e.gx = gkx(e);
              if (Math.abs(px - e.gx) < 40 * S) { sc.grita('¡Parada!', false); beep('parada'); combo = 0; mult = 1; sc.tweens.add({ targets: e.gk, angle: px < e.gx ? -25 : 25, yoyo: true, duration: 180 }); }
              else { goles++; ganar(100, px, PY - 50 * S, '#2e6b46'); sc.grita(cele, true, nivel % 2 ? 'oscuro' : ''); beep('gol'); sc.cameras.main.flash(250, 255, 255, 255); sc.confeti.explode(60, px, PY - 30 * S); } }
            return; }
          const x = e.k === 'rival' ? rx(e) + (e.cambia ? 0 : Math.sin(t * 3 + e.wob) * 6 * S) : e.x != null ? e.x : laneX(e.l);
          if (e.sp) { if (e.k === 'rival' && e.sp.paso) { const vx = (x - e.sp.x) / Math.max(dt, 0.001); e.sp.angle += (Math.max(-20, Math.min(20, vx / (8 * S))) - e.sp.angle) * Math.min(1, dt * 8); if (!e.done) { e.fase += dt * 10; e.sp.paso(e.fase); } } e.sp.x = x; e.sp.y = e.y; } if (e.sh) { e.sh.x = x; e.sh.y = e.y + 24 * S; } if (e.gl) { e.gl.x = x; e.gl.y = e.y; } if (e.fl) { e.fl.x = x; e.fl.y = e.y - 36 * S; e.fl.setVisible(e.y < H * 0.32); }
          if (e.k === 'bola') e.sp.angle += dt * 360;
          const near = Math.abs(px - x) < 30 * S, dyy = Math.abs(e.y - PY);
          if (e.k === 'bola') { if (near && dyy < 28 * S) { e.gone = true; bolas++; combo++; mult = Math.min(5, 1 + Math.floor(combo / 6)); maxMult = Math.max(maxMult, mult); ganar(10, px, PY - 40 * S); beep('bola'); sc.chispas.setParticleTint(colsE[0]); sc.chispas.explode(8, px, PY - 10 * S); } return; }
          if (e.k === 'pot') { if (near && dyy < 30 * S) { e.gone = true; const P = POT[e.p]; sc.grita(P.n, true, nivel % 2 ? 'oscuro' : ''); beep('pot'); if (e.p === 'iman') iman = 7; else if (e.p === 'escudo') escudo = true; else x2 = 8; sc.chispas.setParticleTint(P.c); sc.chispas.explode(18, px, PY); } return; }
          if (near && dyy < 28 * S) {
            if (salto > 0.08) { if (!e.reg && e.k === 'rival') { e.reg = true; regates++; ganar(25, px, PY - 60 * S, '#2c5fb3'); sc.pop('¡Regate!', px, PY - 90 * S, '#2c5fb3', 16); } return; }
            if (inv > 0 || window.__jgDios) return;
            e.done = true;
            if (escudo) { escudo = false; inv = 0.8; sc.grita('¡Salvada!', true); beep('pot'); return; }
            lives--; inv = 1.3; combo = 0; mult = 1; beep('golpe'); sc.cameras.main.shake(260, 0.012); sc.grita(lives > 0 ? '¡Ay!' : 'Fin', false);
            if (e.sp) sc.tweens.add({ targets: e.sp, angle: e.k === 'rival' ? 200 : 40, scale: 0.8, alpha: 0.35, duration: 450, ease: 'Cubic.easeOut' });
            sc.tweens.add({ targets: yo, angle: (px < x ? -1 : 1) * 35, duration: 120, yoyo: true });
            if (navigator.vibrate) try { navigator.vibrate(70); } catch (er) {}
            if (lives <= 0) fin(false);
          }
        });
        ents = ents.filter(e => { const fuera = e.y > H + 90 * S || e.gone; if (fuera) quita(e); return !fuera; });
        const j = salto > 0 ? Math.sin((0.6 - salto) / 0.6 * Math.PI) : 0;
        // inclinación hacia donde cambia de carril, zancada que va más rápida con la velocidad y salto en el regate
        const lean = Math.max(-1, Math.min(1, (laneX(lane) - px) / (W * 0.15)));
        yo.x = px; yo.y = PY - j * 26 * S; yo.angle += (lean * 22 - yo.angle) * Math.min(1, dt * 12); yo.setScale(1 + j * 0.28); yo.setAlpha(inv > 0 && Math.floor(inv * 10) % 2 ? 0.25 : 1);
        yo.paso(t * (9 + v / (60 * S)), salto > 0 ? 0 : 1); yo.p.sh.setAlpha(1 - j * 0.6); yo.p.st.angle = -20 + Math.sin(t * 6) * 6 + (salto > 0 ? -40 * j : 0);
        aura.x = px; aura.y = yo.y; aura.setAlpha(iman > 0 || escudo || x2 > 0 ? 0.55 + Math.sin(t * 10) * 0.15 : 0); aura.setTint(escudo ? 0x5ad16b : x2 > 0 ? 0xffb800 : 0x4da6ff);
        if (pet) { const side = px > W * 0.6 ? -1 : 1; pet.x += (px + side * 42 * S - pet.x) * 0.08; pet.y = PY + 10 * S + Math.sin(t * 9) * 3 * S; }
        M.score(puntos); hud();
      },
    }, ZONAS[0].bg);
    function banner() { const z = ZONAS[nivel % 4], c = sc.add.container(0, H * 0.18).setDepth(55), r = sc.add.rectangle(0, 0, W, 70 * S, 0x681825, 0.94).setOrigin(0, 0),
        a = sc.add.text(W / 2, 22 * S, 'NIVEL ' + (nivel + 1), { fontFamily: 'Inter, Arial', fontSize: Math.round(13 * S) + 'px', fontStyle: '800', color: '#ffd21f' }).setOrigin(0.5),
        b = sc.add.text(W / 2, 48 * S, z.n, { fontFamily: 'Fraunces, Georgia, serif', fontSize: Math.round(24 * S) + 'px', fontStyle: '700', color: '#ffffff' }).setOrigin(0.5);
      c.add([r, a, b]); c.x = -W; sc.tweens.add({ targets: c, x: 0, duration: 350, ease: 'Back.easeOut' }); sc.tweens.add({ targets: c, x: W, delay: 1700, duration: 300, onComplete: () => c.destroy() }); }
  }

  // ================= Tanda de penaltis =================
  function penaltis(o) {
    const M = marco(o, 'Toca para fijar a dónde tiras y vuelve a tocar para elegir la altura'), R = rng(o.seed || 1), { W, H, S } = M;
    let fase = 'cuenta', st = { cnt: 3, ct: 0 }, t = 0, tp = 0, mx = 0, my = 0, dir = 1, vy = 1, tx = 0, ty = 0, bt = 0, tiro = 0, vidas = 3, puntos = 0, goles = 0, racha = 0, maxR = 0, escuadras = 0, gk = { x: 0.5, tx: 0.5, ty: 0.65 };
    let sc, gw, gh, gx, gy, keeper, ball, bsh, flecha, mira, linea, rotulo, yo, pet, red;
    M.lives(vidas);
    const vel = () => 0.9 + tiro * 0.07;
    function tap() {
      if (!M.alive) return; M.hint.classList.add('off');
      if (fase === 'x') { tx = mx; fase = 'y'; vy = 1; my = 0; beep('bola'); }
      else if (fase === 'y') { ty = my; fase = 'tiro'; bt = 0; beep('regate');
        // golpeo: el stick va atrás y chuta, y el cuerpo acompaña
        sc.tweens.add({ targets: yo.p.st, angle: -70, duration: 90, yoyo: false, onComplete: () => sc.tweens.add({ targets: yo.p.st, angle: 25, duration: 110, ease: 'Back.easeOut', onComplete: () => sc.tweens.add({ targets: yo.p.st, angle: -20, duration: 300, delay: 250 }) }) });
        sc.tweens.add({ targets: yo, angle: (tx - 0.5) * 24, duration: 160, yoyo: true, hold: 300 });
        const guess = R() < Math.min(0.62, 0.22 + tiro * 0.045);
        gk.tx = guess ? Math.max(0.12, Math.min(0.88, tx)) : (tx < 0.5 ? 0.62 + R() * 0.26 : 0.12 + R() * 0.26); gk.ty = guess ? ty : 0.55 + R() * 0.3;
        // la portera se tira (a la altura y al lado que ha elegido)
        sc.tweens.add({ targets: keeper, x: gx + gk.tx * gw, y: gy + gh * (0.42 + gk.ty * 0.42), angle: (gk.tx - 0.5) * 70, duration: 380, ease: 'Cubic.easeOut' }); }
    }
    const onKey = e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') { tap(); e.preventDefault(); } else if (e.key === 'Escape') fin(true); };
    const onDown = e => { if (e.target.closest && e.target.closest('button')) return; e.preventDefault(); tap(); };
    M.cont.addEventListener('pointerdown', onDown); addEventListener('keydown', onKey); M.limpia = [() => removeEventListener('keydown', onKey)];
    M.salir(() => fin(true));
    function resolver() {
      const fuera = tx < 0.02 || tx > 0.98 || ty < 0.03, dx = Math.abs(tx - gk.tx), dy = Math.abs(ty - gk.ty), alto = ty < 0.33, alcanza = alto ? dx < 0.11 && dy < 0.3 : dx < 0.19;
      const bx = gx + tx * gw, by = gy + ty * gh;
      if (fuera) { sc.grita('¡Fuera!', false, 'oscuro'); vidas--; racha = 0; beep('golpe'); sc.tweens.add({ targets: ball, y: by - 80 * S, alpha: 0, duration: 400 }); }
      else if (alcanza) { sc.grita('¡Parada!', false, 'oscuro'); vidas--; racha = 0; beep('parada'); sc.cameras.main.shake(200, 0.008); sc.tweens.add({ targets: ball, x: bx + (bx < W / 2 ? -1 : 1) * 120 * S, y: by + 140 * S, alpha: 0, duration: 500, ease: 'Quad.easeOut' }); }
      else { goles++; racha++; maxR = Math.max(maxR, racha); const esq = alto && (tx < 0.18 || tx > 0.82), mult = 1 + Math.floor(racha / 3); if (esq) escuadras++;
        const v = (100 + (esq ? 60 : 0)) * mult; puntos += v; sc.grita(esq ? '¡A la escuadra!' : (o.cele || '¡GOL!'), true, 'oscuro'); sc.pop('+' + v, W / 2, H * 0.52, '#ffd21f', 22); beep('gol'); sc.confeti.explode(70, bx, by); sc.cameras.main.flash(220, 255, 255, 255);
        sc.tweens.add({ targets: red, scaleY: red.scaleY * 1.04, scaleX: red.scaleX * 1.02, yoyo: true, duration: 120, repeat: 1 }); }
      M.lives(vidas); M.mu(racha >= 3 ? '×' + (1 + Math.floor(racha / 3)) : ''); M.score(puntos); tiro++; fase = 'pausa'; tp = 0;
      rotulo.setText('Lanzamiento ' + (tiro + 1));
    }
    function fin(sal) { if (!M.alive) return; M.cerrar({ modo: 'penaltis', puntos: Math.round(puntos), goles, racha: maxR, escuadras, lanzamientos: tiro, bolas: Math.floor(goles * 3 + escuadras * 2), segundos: Math.round(t), salida: sal }, sal, o.onEnd); }
    M.arrancar({
      create() {
        sc = this; gw = W * 0.82; gh = gw * 0.6; gx = (W - gw) / 2; gy = H * 0.15;
        // pabellón: grada oscura, focos y pista
        const g = sc.add.graphics(); g.fillGradientStyle(0x0f1a33, 0x0f1a33, 0x22304f, 0x22304f, 1); g.fillRect(0, 0, W, gy + gh);
        sc.add.tileSprite(0, 0, W / (gy / 96), 96, 'grada').setOrigin(0, 0).setScale(gy / 96).setAlpha(0.9);
        [0.12, 0.88].forEach(f => sc.add.image(W * f, gy * 0.1, 'brillo').setDisplaySize(gw * 0.7, gw * 0.7).setAlpha(0.35).setTint(0xfff3c4));
        g.fillGradientStyle(0x3b4b73, 0x3b4b73, 0x2a3757, 0x2a3757, 1); g.fillRect(0, gy + gh, W, H - gy - gh);
        g.lineStyle(3 * S, 0xffffff, 0.22); g.beginPath(); g.arc(W / 2, gy + gh, gw * 0.55, 0, Math.PI); g.strokePath(); g.fillStyle(0xffffff, 0.5); g.fillCircle(W / 2, H * 0.72, 5 * S);
        red = sc.add.image(W / 2, gy + gh, sc.porteriaTex('redpen', Math.round(gw), Math.round(gh))).setOrigin(0.5, 1).setDepth(2);
        keeper = sc.add.image(gx + gw / 2, gy + gh * 0.7, 'portero').setDisplaySize(gw * 0.3, gw * 0.375).setDepth(4);
        linea = sc.add.graphics().setDepth(5);
        flecha = sc.add.triangle(0, gy + gh + 30 * S, 0, 22 * S, 11 * S, 0, 22 * S, 22 * S, 0xffd21f).setDepth(6);
        mira = sc.add.image(0, 0, 'brillo').setDisplaySize(38 * S, 38 * S).setTint(0xffd21f).setDepth(6).setVisible(false);
        bsh = sc.add.image(W / 2, H * 0.74, 'sombra').setDisplaySize(40 * S, 12 * S).setDepth(6);
        ball = sc.add.image(W / 2, H * 0.72, 'bola').setDisplaySize(26 * S, 26 * S).setDepth(7);
        if (sc.textures.exists('pet')) pet = sc.add.image(W / 2 + 62 * S, H * 0.86, 'pet').setDisplaySize(52 * S, 52 * S).setDepth(8);
        yo = sc.patinadora(W / 2, H * 0.86, 76 * S, false).setDepth(8);
        sc.cameras.main.filters && sc.cameras.main.filters.external.addVignette(0.5, 0.45, 0.9, 0.3);
        rotulo = sc.add.text(W / 2, gy + gh + 64 * S, 'Lanzamiento 1', { fontFamily: 'Inter, Arial', fontSize: Math.round(14 * S) + 'px', fontStyle: '700', color: 'rgba(255,255,255,.75)' }).setOrigin(0.5).setDepth(6);
      },
      update(dt) {
        if (fase === 'cuenta') { if (cuenta(M, dt, st)) { fase = 'x'; mx = 0; dir = 1; } return; }
        t += dt;
        if (fase === 'x') { mx += dir * dt * vel() * 0.9; if (mx > 1.08) { mx = 1.08; dir = -1; } if (mx < -0.08) { mx = -0.08; dir = 1; } }
        if (fase === 'y') { my += vy * dt * vel() * 1.1; if (my > 1) { my = 1; vy = -1; } if (my < -0.06) { my = -0.06; vy = 1; } }
        if (fase === 'tiro') { bt += dt / 0.45; const k = Math.min(1, bt), ex = gx + tx * gw, ey = gy + ty * gh, sx = W / 2, sy = H * 0.72;
          ball.x = sx + (ex - sx) * k; ball.y = sy + (ey - sy) * k - Math.sin(k * Math.PI) * 40 * S * (1 - ty); ball.setDisplaySize((26 - 12 * k) * S, (26 - 12 * k) * S); ball.angle += dt * 900;
          bsh.x = ball.x; bsh.y = sy + 14 * S + (ey + 10 * S - sy) * k * 0.5; bsh.setAlpha(1 - k);
          if (bt >= 1) resolver(); }
        if (fase === 'pausa') { tp += dt; if (tp > 1.15) { if (vidas <= 0) { fin(false); return; }
          fase = 'x'; mx = R() < 0.5 ? -0.08 : 1.08; dir = mx < 0 ? 1 : -1; gk = { x: 0.5, tx: 0.5, ty: 0.65 };
          sc.tweens.add({ targets: keeper, x: gx + gw / 2, y: gy + gh * 0.7, angle: 0, duration: 300 }); ball.setPosition(W / 2, H * 0.72).setAlpha(1).setDisplaySize(26 * S, 26 * S); bsh.setPosition(W / 2, H * 0.74).setAlpha(1); } }
        const ax = gx + mx * gw; flecha.setVisible(fase === 'x' || fase === 'y'); flecha.x = ax; linea.clear();
        if (fase === 'y') { const lx = gx + tx * gw, ly = gy + my * gh; linea.lineStyle(3 * S, 0xffd21f, 0.55); for (let yy = gy; yy < gy + gh; yy += 14 * S) linea.lineBetween(lx, yy, lx, yy + 7 * S); mira.setVisible(true).setPosition(lx, ly); flecha.x = lx; }
        else mira.setVisible(false);
        if (fase === 'x' || fase === 'y') keeper.x = gx + gw / 2 + Math.sin(t * 2.5) * 10 * S;
        yo.y = H * 0.86 + (fase === 'tiro' ? -6 * S : Math.sin(t * 3) * 2 * S); yo.paso(t * 2.5, 0.25); if (pet) pet.y = H * 0.87 + Math.sin(t * 6) * 3 * S;
        M.score(puntos);
      },
    }, '#0f1a33');
  }

  // ================= La portera =================
  function portera(o) {
    const M = marco(o, 'Toca izquierda, centro o derecha para llegar al tiro'), R = rng(o.seed || 1), { W, H, S } = M;
    let fase = 'cuenta', st = { cnt: 3, ct: 0 }, t = 0, lane = 1, px = null, vidas = 3, puntos = 0, paradas = 0, racha = 0, maxR = 0, tiros = [], next = 1.5, n = 0, sc, yo, guantes, zonas, dianas, pet;
    M.lives(vidas);
    const LX = i => W * (0.2 + 0.3 * i), GY = () => H * 0.82;
    function nuevo() {
      n++; const desde = 0.15 + R() * 0.7, a = Math.floor(R() * 3), amaga = n > 8 && R() < Math.min(0.4, 0.08 + n * 0.015);
      const b = amaga ? (a + 1 + Math.floor(R() * 2)) % 3 : a, aviso = Math.max(0.45, 1.1 - n * 0.02), vuelo = Math.max(0.6, 1.3 - n * 0.02);
      const s = { sx: desde, a, b, aviso, vuelo, t: 0, amaga, fin: false };
      s.sp = sc.patinadora(W * desde, H * 0.16, 50 * S, true).setDepth(5).setAlpha(0); s.sp.p.st.setAngle(200); sc.tweens.add({ targets: s.sp, alpha: 1, duration: 200 });
      s.ln = sc.add.graphics().setDepth(4); s.bola = sc.add.image(W * desde, H * 0.16, 'bola').setDisplaySize(24 * S, 24 * S).setDepth(6).setVisible(false);
      tiros.push(s); next = Math.max(0.7, 2 - n * 0.035) + (R() < 0.2 && n > 12 ? -0.35 : 0);
    }
    function ir(l) { if (!M.alive || fase !== 'juego') return; lane = Math.max(0, Math.min(2, l)); M.hint.classList.add('off'); }
    const onDown = e => { if (e.target.closest && e.target.closest('button')) return; e.preventDefault(); const r = M.cont.getBoundingClientRect(), f = (e.clientX - r.left) / r.width; ir(f < 0.34 ? 0 : f < 0.66 ? 1 : 2); };
    const onKey = e => { if (e.key === 'ArrowLeft') { ir(lane - 1); e.preventDefault(); } else if (e.key === 'ArrowRight') { ir(lane + 1); e.preventDefault(); } else if (e.key === 'ArrowDown' || e.key === ' ') { ir(1); e.preventDefault(); } else if (e.key === 'Escape') fin(true); };
    M.cont.addEventListener('pointerdown', onDown); addEventListener('keydown', onKey); M.limpia = [() => removeEventListener('keydown', onKey)];
    M.salir(() => fin(true));
    function fin(sal) { if (!M.alive) return; M.cerrar({ modo: 'portera', puntos: Math.round(puntos), paradas, racha: maxR, bolas: Math.floor(paradas * 1.5), segundos: Math.round(t), salida: sal }, sal, o.onEnd); }
    M.arrancar({
      create() {
        sc = this;
        const g = sc.add.graphics(); g.fillGradientStyle(0xf3f7fb, 0xf3f7fb, 0xdfe8f2, 0xdfe8f2, 1); g.fillRect(0, 0, W, H);
        sc.add.tileSprite(0, 0, W / (H * 0.08 / 96), 96, 'grada').setOrigin(0, 0).setScale(H * 0.08 / 96).setDepth(1);
        g.lineStyle(3 * S, 0x681825, 0.12); g.lineBetween(0, H * 0.3, W, H * 0.3); g.strokeCircle(W / 2, H * 0.3, 44 * S);
        sc.add.image(W / 2, H * 0.45, 'brillo').setDisplaySize(W * 1.2, H * 0.5).setAlpha(0.35);
        g.fillStyle(0x681825, 1); g.fillRect(0, 0, 9 * S, H); g.fillRect(W - 9 * S, 0, 9 * S, H);
        g.lineStyle(4 * S, 0xc8283c, 0.25); g.beginPath(); g.arc(W / 2, GY(), W * 0.36, Math.PI, 0); g.strokePath();
        zonas = sc.add.graphics().setDepth(1);
        sc.add.image(W / 2, GY() + 34 * S, sc.porteriaTex('redpor', Math.round(W * 0.9), Math.round(40 * S))).setOrigin(0.5, 1).setDepth(2);
        dianas = sc.add.graphics().setDepth(3);
        if (sc.textures.exists('pet')) pet = sc.add.image(LX(1) + 40 * S, GY() - 20 * S, 'pet').setDisplaySize(46 * S, 46 * S).setDepth(6);
        guantes = [sc.add.image(0, 0, 'guante').setDisplaySize(32 * S, 32 * S).setDepth(8).setFlipX(true), sc.add.image(0, 0, 'guante').setDisplaySize(32 * S, 32 * S).setDepth(8)];
        yo = sc.patinadora(LX(1), GY() - 40 * S, 66 * S, false).setDepth(7); yo.p.st.setVisible(false);
        sc.cameras.main.filters && sc.cameras.main.filters.external.addVignette(0.5, 0.5, 0.95, 0.22);
        guantes[0].setPosition(LX(1) - 34 * S, GY() - 34 * S); guantes[1].setPosition(LX(1) + 34 * S, GY() - 34 * S);
      },
      update(dt) {
        if (fase === 'cuenta') { if (cuenta(M, dt, st)) fase = 'juego'; return; }
        t += dt; puntos += dt * 5; next -= dt; if (next <= 0) nuevo();
        if (px == null) px = LX(lane); px += (LX(lane) - px) * Math.min(1, dt * 18);
        zonas.clear(); [0, 1, 2].forEach(i => { zonas.fillStyle(0x681825, i === lane ? 0.07 : 0.02); zonas.fillRect(W * i / 3, H * 0.62, W / 3, H * 0.38); });
        dianas.clear();
        tiros.forEach(s => {
          if (s.fin) return; s.t += dt;
          const x0 = W * s.sx, y0 = H * 0.16;
          s.ln.clear();
          if (s.t < s.aviso) { const cambio = s.amaga && s.t > s.aviso * 0.55, l = cambio ? s.b : s.a; s.ln.lineStyle(4 * S, 0xff3b1f, cambio ? 0.95 : 0.55);
            const tx = LX(l), ty = GY() - 44 * S, segs = 14; for (let i = 0; i < segs; i += 2) { const f0 = i / segs, f1 = (i + 1) / segs; s.ln.lineBetween(x0 + (tx - x0) * f0, y0 + 26 * S + (ty - y0 - 26 * S) * f0, x0 + (tx - x0) * f1, y0 + 26 * S + (ty - y0 - 26 * S) * f1); }
            dianas.lineStyle(3 * S, 0xff3b1f, 0.9); dianas.strokeCircle(LX(l), GY() - 40 * S, 34 * S * (1 + 0.12 * Math.sin(t * 14))); }
          else { if (!s.chut) { s.chut = true; sc.tweens.add({ targets: s.sp.p.st, angle: 140, duration: 80, yoyo: true }); sc.tweens.add({ targets: s.sp, angle: (LX(s.b) - W * s.sx) / W * 30, duration: 150 }); }
            const k = (s.t - s.aviso) / s.vuelo; s.bola.setVisible(true).setPosition(x0 + (LX(s.b) - x0) * k, y0 + (GY() - 20 * S - y0) * k); s.bola.angle += dt * 720; s.bola.setDisplaySize((20 + 10 * k) * S, (20 + 10 * k) * S);
            dianas.lineStyle(3 * S, 0xff3b1f, 0.9); dianas.strokeCircle(LX(s.b), GY() - 40 * S, 34 * S); }
          if (s.t >= s.aviso + s.vuelo) { s.fin = true;
            if (lane === s.b) { paradas++; racha++; maxR = Math.max(maxR, racha); const v = 50 * (1 + Math.floor(racha / 5)); puntos += v; sc.grita(s.amaga ? '¡No te ha engañado!' : '¡Paradón!', true); sc.pop('+' + v, LX(s.b), GY() - 100 * S, '#2e6b46'); beep('gol'); sc.chispas.setParticleTint(0xffd21f); sc.chispas.explode(18, LX(s.b), GY() - 40 * S);
              sc.tweens.add({ targets: s.bola, y: s.bola.y - 160 * S, x: s.bola.x + (R() - 0.5) * 120 * S, alpha: 0, duration: 450 }); sc.tweens.add({ targets: guantes, scale: '*=1.35', duration: 90, yoyo: true }); }
            else { vidas--; racha = 0; sc.cameras.main.shake(260, 0.012); sc.grita('¡Gol en contra!', false); beep('golpe'); M.lives(vidas); sc.tweens.add({ targets: s.bola, y: GY() + 20 * S, alpha: 0, duration: 300 }); if (vidas <= 0) setTimeout(() => fin(false), 450); }
            sc.tweens.add({ targets: s.sp, alpha: 0, delay: 250, duration: 250 }); s.ln.clear(); setTimeout(() => { try { s.sp.destroy(); s.ln.destroy(); s.bola.destroy(); } catch (e) {} }, 700); }
        });
        tiros = tiros.filter(s => !s.fin);
        // se estira hacia el lado al que va (más cuanto más lejos está) y vuelve
        const tira = Math.max(-1, Math.min(1, (LX(lane) - px) / (W * 0.12)));
        yo.x = px; yo.y = GY() - 40 * S; yo.angle += (tira * 28 - yo.angle) * Math.min(1, dt * 14); yo.scaleX = 1 + Math.abs(tira) * 0.12; yo.paso(t * 4, 0.3);
        guantes[0].setPosition(px - (36 + (tira < 0 ? -tira * 18 : 0)) * S, GY() - (36 + Math.abs(tira) * 6) * S).setAngle(-20 + tira * 20); guantes[1].setPosition(px + (36 + (tira > 0 ? tira * 18 : 0)) * S, GY() - (36 + Math.abs(tira) * 6) * S).setAngle(20 + tira * 20);
        if (pet) { pet.x += (px + (lane === 2 ? -64 : 64) * S - pet.x) * 0.1; pet.y = GY() - 14 * S + Math.sin(t * 7) * 3 * S; }
        M.mu(racha >= 5 ? '×' + (1 + Math.floor(racha / 5)) : ''); M.score(puntos);
      },
    }, '#f3f7fb');
  }

  const jugar = o => o.modo === 'penaltis' ? penaltis(o) : o.modo === 'portera' ? portera(o) : patina(o);
  window.SMBJuego = { jugar, start: patina, penaltis, portera, ESTELAS, JUEGOS, delDia, cargarPhaser, _rng: rng, _beep: beep };
})();
