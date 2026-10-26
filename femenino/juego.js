// «Patina y marca»: el minijuego de la app de jugadoras (26 oct).
// Tu jugadora baja la pista por tres carriles: esquiva rivales y conos, recoge bolas y marca en las porterías.
// Todo lo que aparece sale de una semilla: en un duelo, las dos juegan exactamente la misma pista.
// Uso: SMBJuego.start({ avatarSrc, seed, estela, titulo, onEnd({ puntos, bolas, goles, segundos, salida }) })
(function () {
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const ESTELAS = { granate: ['#681825', '#a8394b'], rosa: ['#f59797', '#ffc9c9'], menta: ['#4fbf9f', '#a6ead6'], oro: ['#e0b23c', '#fff1b8'],
    arcoiris: ['#ff5a5a', '#ffb84d', '#ffe44d', '#5ad16b', '#4da6ff', '#a36bff'], fuego: ['#ff3b1f', '#ff9a1f', '#ffd21f'] };

  function start(o) {
    const ov = document.createElement('div'); ov.className = 'jg-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Patina y marca');
    ov.innerHTML = `<div class="jg-top"><span class="jg-tt">${(o.titulo || 'Patina y marca').replace(/</g, '&lt;')}</span><span class="jg-sc" aria-live="off">0</span><span class="jg-lv" aria-label="Vidas"></span><button type="button" class="jg-x">Salir</button></div>
      <div class="jg-cv"><canvas></canvas><div class="jg-big"></div><div class="jg-hint">Toca a la izquierda o a la derecha para cambiar de carril</div></div>`;
    document.body.appendChild(ov); document.body.classList.add('jg-on');
    const cv = ov.querySelector('canvas'), cx = cv.getContext('2d'), big = ov.querySelector('.jg-big'), scEl = ov.querySelector('.jg-sc'), lvEl = ov.querySelector('.jg-lv'), hint = ov.querySelector('.jg-hint');
    const R = rng(o.seed || 1), colsE = ESTELAS[o.estela] || ESTELAS.granate;
    let W = 0, H = 0, S = 1, dpr = 1;
    function size() {
      const box = ov.querySelector('.jg-cv').getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.min(box.width, 520); H = box.height; S = Math.min(W / 380, H / 640);
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size);
    const img = new Image(); let imgOk = false; img.onload = () => { imgOk = true; }; img.src = o.avatarSrc || '';
    const laneX = i => W * (0.2 + 0.3 * i), PY = () => H * 0.8;
    // estado
    let lane = 1, px = null, lives = 3, inv = 0, t = 0, dist = 0, nextRow = 0, rows = 0, puntos = 0, bolas = 0, goles = 0, ents = [], parts = [], txt = null, alive = true, started = false, cnt = 3, cntT = 0, last = 0, paused = false, salida = false;
    const v0 = 300;
    const speed = () => v0 * S * Math.min(2.3, 1 + t * 0.028);
    function spawnRow() {
      rows++;
      const y = -60 * S;
      if (rows % 12 === 0) { ents.push({ k: 'goal', gk: Math.floor(R() * 3), y, hit: false }); return; }
      const r = R();
      const free = [0, 1, 2];
      if (r < 0.62) {
        const nObs = rows > 10 && R() < 0.38 ? 2 : 1;
        for (let i = 0; i < nObs; i++) { const j = Math.floor(R() * free.length), l = free.splice(j, 1)[0]; ents.push({ k: R() < 0.7 ? 'rival' : 'cono', l, y, wob: R() * 6.28 }); }
      }
      free.forEach(l => { if (R() < (r < 0.62 ? 0.35 : 0.55)) ents.push({ k: 'bola', l, y }); });
    }
    function say(s, cls) { txt = { s, cls, t: 0.9 }; }
    function hearts() { lvEl.textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, 3 - lives)); }
    hearts();
    function move(d) { if (!alive || !started) return; lane = Math.max(0, Math.min(2, lane + d)); hint.classList.add('off'); }
    const onPtr = e => { if (e.target.closest('.jg-x')) return; e.preventDefault(); const r = cv.getBoundingClientRect(); move((e.clientX - r.left) < r.width / 2 ? -1 : 1); };
    const onKey = e => { if (e.key === 'ArrowLeft') { move(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { move(1); e.preventDefault(); } else if (e.key === 'Escape') fin(true); };
    cv.addEventListener('pointerdown', onPtr); addEventListener('keydown', onKey);
    const onVis = () => { paused = document.hidden; last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    ov.querySelector('.jg-x').addEventListener('click', () => fin(true));
    // dibujo
    function rink() {
      cx.fillStyle = '#eaf1f8'; cx.fillRect(0, 0, W, H);
      cx.fillStyle = '#681825'; cx.fillRect(0, 0, 8 * S, H); cx.fillRect(W - 8 * S, 0, 8 * S, H);
      const off = (dist % (160 * S));
      cx.strokeStyle = 'rgba(104,24,37,.12)'; cx.lineWidth = 2; cx.setLineDash([18 * S, 22 * S]);
      [W * 0.35, W * 0.65].forEach(x => { cx.beginPath(); cx.moveTo(x, -40 * S + off % (40 * S)); cx.lineTo(x, H); cx.stroke(); });
      cx.setLineDash([]);
      const lc = (dist % (900 * S)); if (lc < H + 200 * S) { const y = lc - 100 * S; cx.strokeStyle = 'rgba(200,40,60,.25)'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); cx.beginPath(); cx.arc(W / 2, y, 46 * S, 0, 6.29); cx.stroke(); }
    }
    function drawEnt(e) {
      if (e.k === 'bola') { cx.fillStyle = '#ff7a1a'; cx.beginPath(); cx.arc(laneX(e.l), e.y, 9 * S, 0, 6.29); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.arc(laneX(e.l) - 3 * S, e.y - 3 * S, 3 * S, 0, 6.29); cx.fill(); return; }
      if (e.k === 'cono') { const x = laneX(e.l); cx.fillStyle = '#ff8c1a'; cx.beginPath(); cx.moveTo(x, e.y - 20 * S); cx.lineTo(x + 15 * S, e.y + 14 * S); cx.lineTo(x - 15 * S, e.y + 14 * S); cx.closePath(); cx.fill(); cx.fillStyle = '#fff'; cx.fillRect(x - 9 * S, e.y - 2 * S, 18 * S, 5 * S); return; }
      if (e.k === 'rival') {
        const x = laneX(e.l) + Math.sin(t * 3 + e.wob) * 6 * S;
        cx.strokeStyle = '#3b2a1a'; cx.lineWidth = 4 * S; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x + 10 * S, e.y + 4 * S); cx.lineTo(x + 18 * S, e.y + 26 * S); cx.stroke();
        cx.fillStyle = '#2c5fb3'; cx.beginPath(); cx.arc(x, e.y, 19 * S, 0, 6.29); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 2.5 * S; cx.stroke();
        cx.fillStyle = '#f2d2b6'; cx.beginPath(); cx.arc(x, e.y - 4 * S, 8 * S, 0, 6.29); cx.fill(); return;
      }
      if (e.k === 'goal') {
        const y = e.y; cx.fillStyle = 'rgba(255,255,255,.85)'; cx.fillRect(W * 0.06, y - 18 * S, W * 0.88, 26 * S);
        cx.strokeStyle = '#c8283c'; cx.lineWidth = 5 * S; cx.strokeRect(W * 0.06, y - 18 * S, W * 0.88, 26 * S);
        cx.strokeStyle = 'rgba(0,0,0,.12)'; cx.lineWidth = 1; for (let x = W * 0.06; x < W * 0.94; x += 10 * S) { cx.beginPath(); cx.moveTo(x, y - 18 * S); cx.lineTo(x, y + 8 * S); cx.stroke(); }
        const gx = laneX(e.gk); cx.fillStyle = '#1f1f1f'; roundRect(gx - 28 * S, y - 14 * S, 56 * S, 30 * S, 10 * S); cx.fill();
        cx.fillStyle = '#ffd21f'; roundRect(gx - 22 * S, y - 10 * S, 44 * S, 10 * S, 4 * S); cx.fill();
        cx.fillStyle = '#681825'; cx.font = `700 ${11 * S}px Inter, sans-serif`; cx.textAlign = 'center'; cx.fillText('PORTERÍA', W / 2, y - 24 * S);
      }
    }
    function roundRect(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
    function drawPlayer() {
      const y = PY(), r = 26 * S;
      parts.forEach(p => { cx.globalAlpha = Math.max(0, p.a); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.29); cx.fill(); }); cx.globalAlpha = 1;
      if (inv > 0 && Math.floor(inv * 10) % 2) return;
      cx.strokeStyle = '#2b1d14'; cx.lineWidth = 4 * S; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(px + 14 * S, y + 6 * S); cx.lineTo(px + 22 * S, y - 26 * S); cx.stroke();
      cx.save(); cx.beginPath(); cx.arc(px, y, r, 0, 6.29); cx.closePath(); cx.fillStyle = '#e6c6cb'; cx.fill(); cx.clip();
      if (imgOk) cx.drawImage(img, px - r * 1.18, y - r * 1.12, r * 2.36, r * 2.36);
      cx.restore(); cx.strokeStyle = '#681825'; cx.lineWidth = 4 * S; cx.beginPath(); cx.arc(px, y, r, 0, 6.29); cx.stroke();
    }
    function hit(e) { const x = e.k === 'goal' ? laneX(e.gk) : laneX(e.l); return Math.abs(px - x) < 30 * S && Math.abs(e.y - PY()) < (e.k === 'bola' ? 26 : 30) * S; }
    function frame(now) {
      if (!ov.isConnected) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (!paused) step(dt);
      draw();
      if (alive) requestAnimationFrame(frame);
    }
    function step(dt) {
      if (px == null) px = laneX(lane);
      px += (laneX(lane) - px) * Math.min(1, dt * 16);
      if (!started) { cntT += dt; if (cntT >= 0.75) { cntT = 0; cnt--; } big.textContent = cnt > 0 ? String(cnt) : '¡Ya!'; if (cnt <= 0 && cntT > 0.4) { started = true; big.textContent = ''; } return; }
      t += dt; const v = speed(), dy = v * dt; dist += dy;
      if (dist >= nextRow) { spawnRow(); nextRow += 165 * S; }
      puntos += dt * 10; if (inv > 0) inv -= dt;
      ents.forEach(e => {
        e.y += dy;
        if (e.done) return;
        if (e.k === 'goal') { if (e.y >= PY()) { e.done = true; if (lane === e.gk) say('¡Parada!', 'mal'); else { goles++; puntos += 100; say('¡GOL!', 'bien'); burst(px, PY(), 26); } } return; }
        if (hit(e)) {
          if (e.k === 'bola') { e.done = true; e.gone = true; bolas++; puntos += 10; burst(px, PY() - 10 * S, 6); }
          else if (inv <= 0) { e.done = true; lives--; inv = 1.3; hearts(); say(lives > 0 ? '¡Ay!' : 'Fin', 'mal'); if (navigator.vibrate) try { navigator.vibrate(60); } catch (er) {} if (lives <= 0) fin(false); }
        }
      });
      ents = ents.filter(e => e.y < H + 80 * S && !e.gone);
      if (Math.random() < 0.9) parts.push({ x: px + (Math.random() - 0.5) * 16 * S, y: PY() + 22 * S, r: (3 + Math.random() * 4) * S, a: 0.9, c: colsE[Math.floor(Math.random() * colsE.length)], vy: v * 0.9 });
      parts.forEach(p => { p.y += (p.vy || dy / dt) * dt; p.a -= dt * 1.6; if (p.vx) p.x += p.vx * dt; });
      parts = parts.filter(p => p.a > 0);
      if (txt) txt.t -= dt;
      scEl.textContent = Math.round(puntos).toLocaleString('es-ES');
    }
    function burst(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.29, s = (60 + Math.random() * 160) * S; parts.push({ x, y, r: (2 + Math.random() * 3) * S, a: 1, c: colsE[i % colsE.length], vx: Math.cos(a) * s, vy: Math.sin(a) * s }); } }
    function draw() {
      rink(); ents.forEach(e => { if (!e.gone && !(e.k !== 'goal' && e.done && e.k !== 'bola')) drawEnt(e); }); drawPlayer();
      if (txt && txt.t > 0) { cx.globalAlpha = Math.min(1, txt.t * 2); cx.fillStyle = txt.cls === 'bien' ? '#2e6b46' : '#a3261d'; cx.font = `700 ${40 * S}px Fraunces, Georgia, serif`; cx.textAlign = 'center'; cx.fillText(txt.s, W / 2, H * 0.42); cx.globalAlpha = 1; }
    }
    function fin(sal) {
      if (!alive) return; alive = false; salida = sal;
      removeEventListener('keydown', onKey); removeEventListener('resize', size); document.removeEventListener('visibilitychange', onVis);
      const res = { puntos: Math.round(puntos), bolas, goles, segundos: Math.round(t), salida: sal };
      setTimeout(() => { ov.remove(); document.body.classList.remove('jg-on'); o.onEnd && o.onEnd(res); }, sal ? 0 : 900);
    }
    requestAnimationFrame(frame);
    return { stop: () => fin(true) };
  }
  window.SMBJuego = { start, ESTELAS };
})();
