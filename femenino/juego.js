// «Patina y marca»: el minijuego de la app de jugadoras (26 oct; más divertido el 26 por la tarde).
// Tu jugadora baja la pista por tres carriles: esquiva rivales y conos, regatea (desliza hacia arriba), recoge bolas,
// coge potenciadores (imán, escudo, puntos dobles) y marca leyendo a la portera, que se mueve. Cada 25 s sube de nivel.
// Todo lo que aparece sale de una semilla: en un duelo, las dos juegan exactamente la misma pista.
// Uso: SMBJuego.start({ avatarSrc, seed, estela, cele, titulo, onEnd({ puntos, bolas, goles, regates, combo, nivel, segundos, salida }) })
(function () {
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const ESTELAS = { granate: ['#681825', '#a8394b'], rosa: ['#f59797', '#ffc9c9'], menta: ['#4fbf9f', '#a6ead6'], oro: ['#e0b23c', '#fff1b8'],
    arcoiris: ['#ff5a5a', '#ffb84d', '#ffe44d', '#5ad16b', '#4da6ff', '#a36bff'], fuego: ['#ff3b1f', '#ff9a1f', '#ffd21f'] };
  // niveles: cambian la pista y la dificultad
  const ZONAS = [
    { n: 'La pista del cole', bg: '#eaf1f8', ln: 'rgba(104,24,37,.14)', cc: 'rgba(200,40,60,.25)', tx: '#681825' },
    { n: 'Pabellón de noche', bg: '#22304f', ln: 'rgba(255,255,255,.14)', cc: 'rgba(120,200,255,.35)', tx: '#ffffff' },
    { n: 'Pista al atardecer', bg: '#ffe3cf', ln: 'rgba(160,60,20,.18)', cc: 'rgba(230,90,40,.35)', tx: '#8a3a1c' },
    { n: 'La gran final', bg: '#1d0f14', ln: 'rgba(224,178,60,.22)', cc: 'rgba(224,178,60,.45)', tx: '#e0b23c' },
  ];
  const POT = { iman: { c: '#4da6ff', s: 'U', n: '¡Imán!' }, escudo: { c: '#5ad16b', s: '✚', n: '¡Escudo!' }, x2: { c: '#ffb800', s: '×2', n: '¡Puntos dobles!' } };
  let AC = null;
  function beep(kind) {
    try {
      if (localStorage.getItem('smbf-sonido') === 'no') return;
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { bola: [[880, 0.05]], gol: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.18]], golpe: [[140, 0.18]], regate: [[440, 0.06], [660, 0.08]], pot: [[660, 0.07], [990, 0.12]], nivel: [[392, 0.1], [523, 0.1], [784, 0.2]], parada: [[300, 0.08], [220, 0.14]] }[kind] || [];
      let t = AC.currentTime;
      notes.forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = kind === 'golpe' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9; });
    } catch (e) {}
  }

  function start(o) {
    const ov = document.createElement('div'); ov.className = 'jg-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Patina y marca');
    const sOn = () => localStorage.getItem('smbf-sonido') !== 'no';
    ov.innerHTML = `<div class="jg-top"><span class="jg-tt">${(o.titulo || 'Patina y marca').replace(/</g, '&lt;')}</span><span class="jg-mu"></span><span class="jg-sc" aria-live="off">0</span><span class="jg-lv" aria-label="Vidas"></span>
        <button type="button" class="jg-snd" aria-label="Sonido">${sOn() ? '♪' : '♪̸'}</button><button type="button" class="jg-x">Salir</button></div>
      <div class="jg-cv"><canvas></canvas><div class="jg-big"></div><div class="jg-hint">Toca a un lado para cambiar de carril · Desliza hacia arriba para regatear</div></div>`;
    document.body.appendChild(ov); document.body.classList.add('jg-on');
    const cv = ov.querySelector('canvas'), cx = cv.getContext('2d'), big = ov.querySelector('.jg-big'), scEl = ov.querySelector('.jg-sc'), lvEl = ov.querySelector('.jg-lv'), muEl = ov.querySelector('.jg-mu'), hint = ov.querySelector('.jg-hint');
    ov.querySelector('.jg-snd').addEventListener('click', e => { try { localStorage.setItem('smbf-sonido', sOn() ? 'no' : 'si'); } catch (er) {} e.currentTarget.textContent = sOn() ? '♪' : '♪̸'; });
    const R = rng(o.seed || 1), colsE = ESTELAS[o.estela] || ESTELAS.granate, cele = o.cele || '¡GOL!';
    let W = 0, H = 0, S = 1, dpr = 1;
    function size() {
      const box = ov.querySelector('.jg-cv').getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.min(box.width, 520); H = box.height; S = Math.min(W / 380, H / 640);
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size);
    const img = new Image(); let imgOk = false; img.onload = () => { imgOk = true; }; img.src = o.avatarSrc || '';
    // la mascota la acompaña patinando a su lado
    const mimg = new Image(); let mOk = false; mimg.onload = () => { mOk = true; }; if (o.mascotaSrc) mimg.src = o.mascotaSrc;
    let mx = null;
    const laneX = i => W * (0.2 + 0.3 * i), PY = () => H * 0.8;
    let lane = 1, px = null, lives = 3, inv = 0, t = 0, dist = 0, nextRow = 0, rows = 0, puntos = 0, bolas = 0, goles = 0, regates = 0, combo = 0, mult = 1, maxMult = 1;
    let ents = [], parts = [], floats = [], txt = null, alive = true, started = false, cnt = 3, cntT = 0, last = 0, paused = false, salto = 0, shake = 0, flash = 0;
    let nivel = 0, iman = 0, escudo = false, x2 = 0, banner = 0;
    const speed = () => 300 * S * Math.min(2.4, 1 + t * 0.026);
    function spawnRow() {
      rows++;
      const y = -60 * S, lv = nivel;
      if (rows % 11 === 0) { ents.push({ k: 'goal', y, ph: R() * 6.28, vel: 1.1 + lv * 0.35 + R() * 0.4 }); return; }
      const r = R(), free = [0, 1, 2];
      if (r < 0.64) {
        const nObs = rows > 8 && R() < 0.3 + lv * 0.08 ? 2 : 1;
        for (let i = 0; i < nObs; i++) {
          const j = Math.floor(R() * free.length), l = free.splice(j, 1)[0], k = R() < 0.72 ? 'rival' : 'cono';
          // desde el nivel 2, algunas rivales cambian de carril a media pista (se avisa con una flecha)
          const cambia = k === 'rival' && lv >= 1 && nObs === 1 && R() < 0.3 ? (l === 0 ? 1 : l === 2 ? -1 : (R() < 0.5 ? -1 : 1)) : 0;
          ents.push({ k, l, y, wob: R() * 6.28, cambia, lx: l });
        }
      }
      if (R() < 0.07 && free.length) { const l = free[Math.floor(R() * free.length)], ks = Object.keys(POT); ents.push({ k: 'pot', p: ks[Math.floor(R() * ks.length)], l, y }); return; }
      free.forEach(l => { if (R() < (r < 0.64 ? 0.38 : 0.6)) ents.push({ k: 'bola', l, y }); });
    }
    const say = (s, cls, dur = 0.9) => { txt = { s, cls, t: dur }; };
    const flt = (s, x, y, c) => floats.push({ s, x, y, c: c || '#681825', t: 0.8 });
    function hud() { lvEl.textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, 3 - lives)) + (escudo ? ' ✚' : ''); muEl.textContent = mult > 1 || x2 > 0 ? `×${mult * (x2 > 0 ? 2 : 1)}` : ''; }
    hud();
    function move(d) { if (!alive || !started) return; lane = Math.max(0, Math.min(2, lane + d)); hint.classList.add('off'); }
    function regatear() { if (!alive || !started || salto > 0) return; salto = 0.6; beep('regate'); hint.classList.add('off'); }
    let p0 = null;
    const onDown = e => { if (e.target.closest('button')) return; e.preventDefault(); p0 = { x: e.clientX, y: e.clientY }; };
    const onUp = e => {
      if (!p0) return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y, r = cv.getBoundingClientRect(); const st = p0; p0 = null;
      if (dy < -30 && Math.abs(dy) > Math.abs(dx)) regatear();
      else if (Math.abs(dx) > 30) move(dx < 0 ? -1 : 1);
      else move((st.x - r.left) < r.width / 2 ? -1 : 1);
    };
    const onKey = e => { if (e.key === 'ArrowLeft') { move(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { move(1); e.preventDefault(); } else if (e.key === 'ArrowUp' || e.key === ' ') { regatear(); e.preventDefault(); } else if (e.key === 'Escape') fin(true); };
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); addEventListener('keydown', onKey);
    const onVis = () => { paused = document.hidden; last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    ov.querySelector('.jg-x').addEventListener('click', () => fin(true));
    const Z = () => ZONAS[nivel % ZONAS.length];
    function rink() {
      const z = Z(); cx.fillStyle = z.bg; cx.fillRect(0, 0, W, H);
      cx.fillStyle = '#681825'; cx.fillRect(0, 0, 8 * S, H); cx.fillRect(W - 8 * S, 0, 8 * S, H);
      const off = dist % (40 * S);
      cx.strokeStyle = z.ln; cx.lineWidth = 2; cx.setLineDash([18 * S, 22 * S]);
      [W * 0.35, W * 0.65].forEach(x => { cx.beginPath(); cx.moveTo(x, -40 * S + off); cx.lineTo(x, H); cx.stroke(); });
      cx.setLineDash([]);
      const lc = dist % (900 * S); if (lc < H + 200 * S) { const y = lc - 100 * S; cx.strokeStyle = z.cc; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); cx.beginPath(); cx.arc(W / 2, y, 46 * S, 0, 6.29); cx.stroke(); }
    }
    const rx = e => { if (!e.cambia) return laneX(e.l); const f = Math.max(0, Math.min(1, (e.y - H * 0.25) / (H * 0.2))); return laneX(e.lx) + (laneX(e.lx + e.cambia) - laneX(e.lx)) * f; };
    const gkx = e => { const s = Math.sin(e.ph + t * e.vel); return W / 2 + s * W * 0.3; };
    function drawEnt(e) {
      if (e.k === 'bola') { const x = e.x != null ? e.x : laneX(e.l); cx.fillStyle = '#ff7a1a'; cx.beginPath(); cx.arc(x, e.y, 9 * S, 0, 6.29); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.arc(x - 3 * S, e.y - 3 * S, 3 * S, 0, 6.29); cx.fill(); return; }
      if (e.k === 'pot') { const x = laneX(e.l), P = POT[e.p], pul = 1 + Math.sin(t * 8) * 0.08; cx.fillStyle = P.c; cx.globalAlpha = 0.25; cx.beginPath(); cx.arc(x, e.y, 22 * S * pul, 0, 6.29); cx.fill(); cx.globalAlpha = 1; cx.beginPath(); cx.arc(x, e.y, 15 * S, 0, 6.29); cx.fill(); cx.fillStyle = '#fff'; cx.font = `800 ${13 * S}px Inter, sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(P.s, x, e.y + 1); cx.textBaseline = 'alphabetic'; return; }
      if (e.k === 'cono') { const x = laneX(e.l); cx.fillStyle = '#ff8c1a'; cx.beginPath(); cx.moveTo(x, e.y - 20 * S); cx.lineTo(x + 15 * S, e.y + 14 * S); cx.lineTo(x - 15 * S, e.y + 14 * S); cx.closePath(); cx.fill(); cx.fillStyle = '#fff'; cx.fillRect(x - 9 * S, e.y - 2 * S, 18 * S, 5 * S); return; }
      if (e.k === 'rival') {
        const x = rx(e) + (e.cambia ? 0 : Math.sin(t * 3 + e.wob) * 6 * S);
        if (e.cambia && e.y < H * 0.3) { cx.fillStyle = '#ff3b1f'; cx.font = `800 ${16 * S}px Inter, sans-serif`; cx.textAlign = 'center'; cx.fillText(e.cambia > 0 ? '→' : '←', x, e.y - 26 * S); }
        cx.strokeStyle = '#3b2a1a'; cx.lineWidth = 4 * S; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x + 10 * S, e.y + 4 * S); cx.lineTo(x + 18 * S, e.y + 26 * S); cx.stroke();
        cx.fillStyle = '#2c5fb3'; cx.beginPath(); cx.arc(x, e.y, 19 * S, 0, 6.29); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 2.5 * S; cx.stroke();
        cx.fillStyle = '#f2d2b6'; cx.beginPath(); cx.arc(x, e.y - 4 * S, 8 * S, 0, 6.29); cx.fill(); return;
      }
      if (e.k === 'goal') {
        const y = e.y; cx.fillStyle = 'rgba(255,255,255,.9)'; cx.fillRect(W * 0.06, y - 18 * S, W * 0.88, 26 * S);
        cx.strokeStyle = '#c8283c'; cx.lineWidth = 5 * S; cx.strokeRect(W * 0.06, y - 18 * S, W * 0.88, 26 * S);
        cx.strokeStyle = 'rgba(0,0,0,.12)'; cx.lineWidth = 1; for (let x = W * 0.06; x < W * 0.94; x += 10 * S) { cx.beginPath(); cx.moveTo(x, y - 18 * S); cx.lineTo(x, y + 8 * S); cx.stroke(); }
        const g = e.done ? e.gx : gkx(e); cx.fillStyle = '#1f1f1f'; roundRect(g - 30 * S, y - 14 * S, 60 * S, 30 * S, 10 * S); cx.fill();
        cx.fillStyle = '#ffd21f'; roundRect(g - 24 * S, y - 10 * S, 48 * S, 10 * S, 4 * S); cx.fill();
        cx.fillStyle = Z().tx; cx.font = `800 ${11 * S}px Inter, sans-serif`; cx.textAlign = 'center'; cx.fillText('¡LEE A LA PORTERA!', W / 2, y - 26 * S);
      }
    }
    function roundRect(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
    function drawPlayer() {
      const y = PY(), j = salto > 0 ? Math.sin((0.6 - salto) / 0.6 * Math.PI) : 0, r = 26 * S * (1 + j * 0.3);
      parts.forEach(p => { cx.globalAlpha = Math.max(0, p.a); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.29); cx.fill(); }); cx.globalAlpha = 1;
      if (mOk) { mx = mx == null ? px : mx + (px - mx) * 0.08; const ms = 42 * S, side = px > W * 0.6 ? -1 : 1; cx.drawImage(mimg, mx + side * 34 * S - ms / 2, y + 4 * S + Math.sin(t * 9) * 3 * S - ms / 2, ms, ms); }
      if (inv > 0 && Math.floor(inv * 10) % 2) return;
      if (j > 0) { cx.fillStyle = 'rgba(0,0,0,.18)'; cx.beginPath(); cx.ellipse(px, y + 22 * S, 22 * S, 7 * S, 0, 0, 6.29); cx.fill(); }
      const yy = y - j * 22 * S;
      if (iman > 0) { cx.strokeStyle = 'rgba(77,166,255,.5)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(px, yy, r + 14 * S + Math.sin(t * 10) * 3, 0, 6.29); cx.stroke(); }
      if (escudo) { cx.strokeStyle = 'rgba(90,209,107,.85)'; cx.lineWidth = 4 * S; cx.beginPath(); cx.arc(px, yy, r + 7 * S, 0, 6.29); cx.stroke(); }
      cx.strokeStyle = '#2b1d14'; cx.lineWidth = 4 * S; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(px + 14 * S, yy + 6 * S); cx.lineTo(px + 22 * S, yy - 26 * S); cx.stroke();
      cx.save(); cx.beginPath(); cx.arc(px, yy, r, 0, 6.29); cx.closePath(); cx.fillStyle = '#e6c6cb'; cx.fill(); cx.clip();
      if (imgOk) cx.drawImage(img, px - r * 1.18, yy - r * 1.12, r * 2.36, r * 2.36);
      cx.restore(); cx.strokeStyle = x2 > 0 ? '#ffb800' : '#681825'; cx.lineWidth = 4 * S; cx.beginPath(); cx.arc(px, yy, r, 0, 6.29); cx.stroke();
    }
    function frame(now) {
      if (!ov.isConnected) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (!paused) step(dt);
      draw();
      if (alive) requestAnimationFrame(frame);
    }
    const ganar = (base, x, y, c) => { const v = Math.round(base * mult * (x2 > 0 ? 2 : 1)); puntos += v; flt('+' + v, x, y, c); };
    function step(dt) {
      if (px == null) px = laneX(lane);
      px += (laneX(lane) - px) * Math.min(1, dt * 16);
      if (!started) { cntT += dt; if (cntT >= 0.75) { cntT = 0; cnt--; } big.textContent = cnt > 0 ? String(cnt) : '¡Ya!'; if (cnt <= 0 && cntT > 0.4) { started = true; big.textContent = ''; } return; }
      t += dt; const v = speed(), dy = v * dt; dist += dy;
      const nv = Math.floor(t / 25); if (nv > nivel) { nivel = nv; banner = 2.2; beep('nivel'); }
      if (dist >= nextRow) { spawnRow(); nextRow += 165 * S; }
      puntos += dt * 10 * (x2 > 0 ? 2 : 1);
      [inv, salto, shake, flash, banner] = [inv, salto, shake, flash, banner].map(x => Math.max(0, x - dt));
      if (iman > 0) iman -= dt; if (x2 > 0) x2 -= dt;
      const pyy = PY();
      ents.forEach(e => {
        e.y += dy;
        if (e.done) return;
        if (e.k === 'bola' && iman > 0 && e.y > pyy - 260 * S && e.y < pyy + 20 * S) { const x0 = e.x != null ? e.x : laneX(e.l); e.x = x0 + (px - x0) * Math.min(1, dt * 7); e.y += (pyy - e.y) * Math.min(1, dt * 5); }
        if (e.k === 'goal') {
          if (e.y >= pyy) { e.done = true; e.gx = gkx(e);
            if (Math.abs(px - e.gx) < 40 * S) { say('¡Parada!', 'mal'); beep('parada'); combo = 0; mult = 1; }
            else { goles++; ganar(100, px, pyy - 40 * S, '#2e6b46'); say(cele, 'bien', 1.1); beep('gol'); flash = 0.35; burst(px, pyy - 20 * S, 40, true); } }
          return;
        }
        const x = e.k === 'rival' ? rx(e) : e.x != null ? e.x : laneX(e.l), near = Math.abs(px - x) < 30 * S, dyy = Math.abs(e.y - pyy);
        if (e.k === 'bola') { if (near && dyy < 28 * S) { e.gone = true; e.done = true; bolas++; combo++; mult = Math.min(5, 1 + Math.floor(combo / 6)); maxMult = Math.max(maxMult, mult); ganar(10, px, pyy - 34 * S); beep('bola'); burst(px, pyy - 10 * S, 5); } return; }
        if (e.k === 'pot') { if (near && dyy < 30 * S) { e.gone = true; e.done = true; const P = POT[e.p]; say(P.n, 'bien', 0.8); beep('pot'); if (e.p === 'iman') iman = 7; else if (e.p === 'escudo') escudo = true; else x2 = 8; burst(px, pyy, 14); } return; }
        if (near && dyy < 28 * S) {
          if (salto > 0.08) { if (!e.reg && e.k === 'rival') { e.reg = true; regates++; ganar(25, px, pyy - 50 * S, '#2c5fb3'); say('¡Regate!', 'bien', 0.6); } return; }
          if (inv > 0 || window.__jgDios) return;   // __jgDios: solo para las capturas de las pruebas
          e.done = true;
          if (escudo) { escudo = false; inv = 0.8; say('¡Salvada!', 'bien', 0.6); beep('pot'); return; }
          lives--; inv = 1.3; shake = 0.35; combo = 0; mult = 1; beep('golpe'); say(lives > 0 ? '¡Ay!' : 'Fin', 'mal');
          if (navigator.vibrate) try { navigator.vibrate(70); } catch (er) {}
          if (lives <= 0) fin(false);
        }
      });
      ents = ents.filter(e => e.y < H + 80 * S && !e.gone);
      if (Math.random() < 0.9) parts.push({ x: px + (Math.random() - 0.5) * 16 * S, y: pyy + 22 * S, r: (3 + Math.random() * 4) * S, a: 0.9, c: colsE[Math.floor(Math.random() * colsE.length)], vy: v * 0.9 });
      parts.forEach(p => { p.y += p.vy * dt; p.a -= dt * (p.conf ? 0.8 : 1.6); if (p.vx) p.x += p.vx * dt; if (p.conf) p.vy += 300 * S * dt; });
      parts = parts.filter(p => p.a > 0);
      floats.forEach(f => { f.y -= 60 * S * dt; f.t -= dt; }); floats = floats.filter(f => f.t > 0);
      if (txt) txt.t -= dt;
      scEl.textContent = Math.round(puntos).toLocaleString('es-ES'); hud();
    }
    function burst(x, y, n, conf) { const C = conf ? ['#ff5a5a', '#ffb84d', '#ffe44d', '#5ad16b', '#4da6ff', '#a36bff', '#ffffff'] : colsE; for (let i = 0; i < n; i++) { const a = Math.random() * 6.29, s = (60 + Math.random() * (conf ? 320 : 160)) * S; parts.push({ x, y, r: (2 + Math.random() * (conf ? 4 : 3)) * S, a: 1, c: C[i % C.length], vx: Math.cos(a) * s, vy: Math.sin(a) * s - (conf ? 200 * S : 0), conf }); } }
    function draw() {
      cx.save();
      if (shake > 0) cx.translate((Math.random() - 0.5) * 14 * shake / 0.35, (Math.random() - 0.5) * 14 * shake / 0.35);
      rink(); ents.forEach(e => { if (!e.gone && !(e.k !== 'goal' && e.done)) drawEnt(e); }); drawPlayer();
      floats.forEach(f => { cx.globalAlpha = Math.min(1, f.t * 2); cx.fillStyle = f.c; cx.font = `800 ${15 * S}px Inter, sans-serif`; cx.textAlign = 'center'; cx.fillText(f.s, f.x, f.y); }); cx.globalAlpha = 1;
      cx.restore();
      if (flash > 0) { cx.fillStyle = `rgba(255,255,255,${flash})`; cx.fillRect(0, 0, W, H); }
      if (txt && txt.t > 0) { cx.globalAlpha = Math.min(1, txt.t * 2); cx.fillStyle = txt.cls === 'bien' ? (Z().bg === '#eaf1f8' || Z().bg === '#ffe3cf' ? '#2e6b46' : '#7dffa8') : '#ff4d4d'; cx.font = `700 ${40 * S}px Fraunces, Georgia, serif`; cx.textAlign = 'center'; cx.fillText(txt.s, W / 2, H * 0.42); cx.globalAlpha = 1; }
      if (banner > 0) { const a = Math.min(1, banner * 2); cx.globalAlpha = a; cx.fillStyle = 'rgba(104,24,37,.92)'; cx.fillRect(0, H * 0.18, W, 64 * S); cx.fillStyle = '#ffd21f'; cx.font = `800 ${13 * S}px Inter, sans-serif`; cx.textAlign = 'center'; cx.fillText(`NIVEL ${nivel + 1}`, W / 2, H * 0.18 + 24 * S); cx.fillStyle = '#fff'; cx.font = `700 ${22 * S}px Fraunces, Georgia, serif`; cx.fillText(Z().n, W / 2, H * 0.18 + 50 * S); cx.globalAlpha = 1; }
    }
    function fin(sal) {
      if (!alive) return; alive = false;
      removeEventListener('keydown', onKey); removeEventListener('resize', size); document.removeEventListener('visibilitychange', onVis);
      const res = { puntos: Math.round(puntos), bolas, goles, regates, combo: maxMult, nivel: nivel + 1, segundos: Math.round(t), salida: sal };
      setTimeout(() => { ov.remove(); document.body.classList.remove('jg-on'); o.onEnd && o.onEnd(res); }, sal ? 0 : 900);
    }
    requestAnimationFrame(frame);
    return { stop: () => fin(true) };
  }
  window.SMBJuego = { start, ESTELAS };
})();
