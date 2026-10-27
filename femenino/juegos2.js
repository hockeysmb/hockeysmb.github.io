// Más juegos del reto (26 oct, noche): cada día toca uno distinto, como en los juegos de moda.
//  · «Tanda de penaltis»: apuntas (toca para fijar dónde) y eliges la altura (otro toque). La portera adivina cada vez mejor. 3 fallos y fuera.
//  · «La portera»: eres tú la que para. La rival amaga y tira a un lado; toca la zona (izquierda, centro, derecha) para llegar. 3 goles en contra y fuera.
// Todo sale de la semilla, como «Patina y marca»: en un duelo las dos juegan lo mismo.
// Uso: SMBJuego.jugar({ modo: 'patina' | 'penaltis' | 'portera', ...lo mismo que start })
(function () {
  const SJ = window.SMBJuego; if (!SJ) return;
  const rng = SJ._rng, beep = SJ._beep, ES = SJ.ESTELAS;
  // la capa a pantalla completa, igual que la de «Patina y marca»
  function marco(o, hintTxt) {
    const ov = document.createElement('div'); ov.className = 'jg-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', o.titulo || 'Juego');
    const sOn = () => { try { return localStorage.getItem('smbf-sonido') !== 'no'; } catch (e) { return true; } };
    ov.innerHTML = `<div class="jg-top"><span class="jg-tt">${(o.titulo || '').replace(/</g, '&lt;')}</span><span class="jg-mu"></span><span class="jg-sc">0</span><span class="jg-lv" aria-label="Vidas"></span>
        <button type="button" class="jg-snd" aria-label="Sonido">${sOn() ? '♪' : '♪̸'}</button><button type="button" class="jg-x">Salir</button></div>
      <div class="jg-cv"><canvas></canvas><div class="jg-big"></div><div class="jg-hint">${hintTxt}</div></div>`;
    document.body.appendChild(ov); document.body.classList.add('jg-on');
    ov.querySelector('.jg-snd').addEventListener('click', e => { try { localStorage.setItem('smbf-sonido', sOn() ? 'no' : 'si'); } catch (er) {} e.currentTarget.textContent = sOn() ? '♪' : '♪̸'; });
    const cv = ov.querySelector('canvas'), cx = cv.getContext('2d'), M = { ov, cv, cx, W: 0, H: 0, S: 1, big: ov.querySelector('.jg-big'), hint: ov.querySelector('.jg-hint') };
    M.size = () => { const b = ov.querySelector('.jg-cv').getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); M.W = Math.min(b.width, 520); M.H = b.height; M.S = Math.min(M.W / 380, M.H / 640); cv.width = M.W * d; cv.height = M.H * d; cv.style.width = M.W + 'px'; cv.style.height = M.H + 'px'; cx.setTransform(d, 0, 0, d, 0, 0); };
    M.size(); addEventListener('resize', M.size);
    M.score = v => { ov.querySelector('.jg-sc').textContent = Math.round(v).toLocaleString('es-ES'); };
    M.lives = (n, max = 3) => { ov.querySelector('.jg-lv').textContent = '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, max - n)); };
    M.mu = t => { ov.querySelector('.jg-mu').textContent = t || ''; };
    M.img = src => { const i = new Image(); i.ok = false; i.onload = () => { i.ok = true; }; if (src) i.src = src; return i; };
    M.cerrar = (res, sal, cb) => { removeEventListener('resize', M.size); setTimeout(() => { ov.remove(); document.body.classList.remove('jg-on'); cb && cb(res); }, sal ? 0 : 1000); };
    M.circAv = (img, x, y, r, ring) => { const c = cx; c.save(); c.beginPath(); c.arc(x, y, r, 0, 6.29); c.closePath(); c.fillStyle = '#e6c6cb'; c.fill(); c.clip(); if (img.ok) c.drawImage(img, x - r * 1.18, y - r * 1.12, r * 2.36, r * 2.36); c.restore(); c.strokeStyle = ring || '#681825'; c.lineWidth = 4 * M.S; c.beginPath(); c.arc(x, y, r, 0, 6.29); c.stroke(); };
    M.text = (t, x, y, size, color, font) => { cx.fillStyle = color; cx.font = `${font || '700'} ${size * M.S}px ${font ? 'Inter, sans-serif' : 'Fraunces, Georgia, serif'}`; cx.textAlign = 'center'; cx.fillText(t, x, y); };
    M.confeti = (parts, x, y, n) => { const C = ['#ff5a5a', '#ffb84d', '#ffe44d', '#5ad16b', '#4da6ff', '#a36bff', '#ffffff']; for (let i = 0; i < n; i++) { const a = Math.random() * 6.29, s = (80 + Math.random() * 300) * M.S; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 180 * M.S, r: (2 + Math.random() * 4) * M.S, c: C[i % C.length], a: 1 }); } };
    M.parts = (parts, dt) => { parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * M.S * dt; p.a -= dt * 0.9; }); for (let i = parts.length - 1; i >= 0; i--) if (parts[i].a <= 0) parts.splice(i, 1); parts.forEach(p => { cx.globalAlpha = Math.max(0, p.a); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.r, p.r); }); cx.globalAlpha = 1; };
    return M;
  }
  // portería vista de frente (la de hockey: 1,70 × 1,05)
  function porteria(M, gx, gy, gw, gh) {
    const c = M.cx; c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(gx, gy, gw, gh);
    c.strokeStyle = 'rgba(0,0,0,.10)'; c.lineWidth = 1; for (let x = gx; x <= gx + gw; x += 12 * M.S) { c.beginPath(); c.moveTo(x, gy); c.lineTo(x, gy + gh); c.stroke(); } for (let y = gy; y <= gy + gh; y += 12 * M.S) { c.beginPath(); c.moveTo(gx, y); c.lineTo(gx + gw, y); c.stroke(); }
    c.strokeStyle = '#d6281c'; c.lineWidth = 7 * M.S; c.beginPath(); c.moveTo(gx, gy + gh); c.lineTo(gx, gy); c.lineTo(gx + gw, gy); c.lineTo(gx + gw, gy + gh); c.stroke();
  }
  function portera(M, x, y, s, estira) {   // y = pies; estira: -1..1 (hacia dónde se tira)
    const c = M.cx, S = M.S * s, inc = estira * 0.5;
    c.save(); c.translate(x, y); c.rotate(inc);
    c.fillStyle = '#ffd21f'; c.fillRect(-26 * S, -30 * S, 22 * S, 30 * S); c.fillRect(4 * S, -30 * S, 22 * S, 30 * S);           // espinilleras
    c.fillStyle = '#1f1f1f'; c.fillRect(-24 * S, -74 * S, 48 * S, 46 * S);                                                         // peto
    c.fillStyle = '#ffd21f'; c.fillRect(-46 * S, -74 * S, 20 * S, 26 * S); c.fillRect(26 * S, -74 * S, 20 * S, 26 * S);             // guantes
    c.fillStyle = '#e8e8e8'; c.beginPath(); c.arc(0, -88 * S, 15 * S, 0, 6.29); c.fill(); c.strokeStyle = '#555'; c.lineWidth = 2 * S; for (let i = -8; i <= 8; i += 5) { c.beginPath(); c.moveTo(i * S, -98 * S); c.lineTo(i * S, -78 * S); c.stroke(); }
    c.restore();
  }

  // ---------------- Tanda de penaltis ----------------
  function penaltis(o) {
    const M = marco(o, 'Toca para fijar a dónde tiras y vuelve a tocar para elegir la altura'), R = rng(o.seed || 1), cx = M.cx;
    const av = M.img(o.avatarSrc), pet = M.img(o.mascotaSrc);
    let fase = 'cuenta', cnt = 3, ct = 0, t = 0, tp = 0, mx = 0, my = 0, dir = 1, vy = 1, tx = 0, ty = 0, bt = 0, tiro = 0, vidas = 3, puntos = 0, goles = 0, racha = 0, maxR = 0, escuadras = 0, msg = null, gk = { x: 0.5, tx: 0.5, ty: 0.65, est: 0 }, parts = [], alive = true, last = 0;
    M.lives(vidas);
    const G = () => { const gw = M.W * 0.8, gh = gw * 0.62; return { gx: (M.W - gw) / 2, gy: M.H * 0.16, gw, gh }; };
    const vel = () => 0.9 + tiro * 0.07;
    function tap() {
      if (!alive) return; M.hint.classList.add('off');
      if (fase === 'x') { tx = mx; fase = 'y'; vy = 1; my = 0; beep('bola'); }
      else if (fase === 'y') { ty = my; fase = 'tiro'; bt = 0; beep('regate');
        // la portera: cada vez acierta más (sale de la semilla)
        const guess = R() < Math.min(0.62, 0.22 + tiro * 0.045);
        gk.tx = guess ? Math.max(0.12, Math.min(0.88, tx)) : (tx < 0.5 ? 0.62 + R() * 0.26 : 0.12 + R() * 0.26); gk.ty = guess ? ty : 0.55 + R() * 0.3; }
    }
    const onKey = e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') { tap(); e.preventDefault(); } else if (e.key === 'Escape') fin(true); };
    M.cv.addEventListener('pointerdown', e => { e.preventDefault(); tap(); }); addEventListener('keydown', onKey);
    M.ov.querySelector('.jg-x').addEventListener('click', () => fin(true));
    function resolver() {
      const fuera = tx < 0.02 || tx > 0.98 || ty < 0.03;
      const dx = Math.abs(tx - gk.tx), dy = Math.abs(ty - gk.ty), alto = ty < 0.33, alcanza = alto ? dx < 0.11 && dy < 0.3 : dx < 0.19;
      if (fuera) { msg = { t: '¡Fuera!', c: '#ff4d4d', s: 1 }; vidas--; racha = 0; beep('golpe'); }
      else if (alcanza) { msg = { t: '¡Parada!', c: '#ff4d4d', s: 1 }; vidas--; racha = 0; beep('parada'); }
      else { goles++; racha++; maxR = Math.max(maxR, racha); const esq = alto && (tx < 0.18 || tx > 0.82), mult = 1 + Math.floor(racha / 3); if (esq) escuadras++;
        const v = (100 + (esq ? 60 : 0)) * mult; puntos += v; msg = { t: esq ? '¡A la escuadra!' : (o.cele || '¡GOL!'), c: '#7dffa8', s: 1, v: '+' + v }; beep('gol'); const g = G(); M.confeti(parts, g.gx + tx * g.gw, g.gy + ty * g.gh, 40); }
      M.lives(vidas); M.mu(racha >= 3 ? '×' + (1 + Math.floor(racha / 3)) : ''); M.score(puntos); tiro++;
      fase = 'pausa'; tp = 0;
    }
    function step(dt) {
      if (fase === 'cuenta') { ct += dt; if (ct >= 0.7) { ct = 0; cnt--; } M.big.textContent = cnt > 0 ? cnt : '¡Ya!'; if (cnt <= 0 && ct > 0.35) { M.big.textContent = ''; fase = 'x'; mx = 0; dir = 1; } return; }
      t += dt;
      if (fase === 'x') { mx += dir * dt * vel() * 0.9; if (mx > 1.08) { mx = 1.08; dir = -1; } if (mx < -0.08) { mx = -0.08; dir = 1; } }
      if (fase === 'y') { my += vy * dt * vel() * 1.1; if (my > 1) { my = 1; vy = -1; } if (my < -0.06) { my = -0.06; vy = 1; } }
      if (fase === 'tiro') { bt += dt / 0.45; gk.x += (gk.tx - gk.x) * Math.min(1, dt * 7); gk.est = (gk.tx - 0.5) * 2; if (bt >= 1) resolver(); }
      if (fase === 'pausa') { tp += dt; if (tp > 1.1) { if (vidas <= 0) return fin(false); fase = 'x'; mx = R() < 0.5 ? -0.08 : 1.08; dir = mx < 0 ? 1 : -1; gk = { x: 0.5, tx: 0.5, ty: 0.65, est: 0 }; msg = null; } }
    }
    function draw() {
      const { W, H, S } = M, g = G(); cx.fillStyle = '#22304f'; cx.fillRect(0, 0, W, H);
      cx.fillStyle = '#3b4b73'; cx.fillRect(0, g.gy + g.gh, W, H); cx.strokeStyle = 'rgba(255,255,255,.25)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(W / 2, g.gy + g.gh, g.gw * 0.55, 0, Math.PI); cx.stroke();
      porteria(M, g.gx, g.gy, g.gw, g.gh);
      portera(M, g.gx + gk.x * g.gw, g.gy + g.gh - 2 * S, g.gw / 330, fase === 'tiro' || fase === 'pausa' ? gk.est : Math.sin(t * 3) * 0.05);
      // indicadores
      if (fase === 'x' || fase === 'y') { cx.fillStyle = 'rgba(255,255,255,.18)'; cx.fillRect(g.gx - 0.08 * g.gw, g.gy + g.gh + 16 * S, g.gw * 1.16, 8 * S); cx.fillStyle = '#ffd21f'; const ax = g.gx + mx * g.gw; cx.beginPath(); cx.moveTo(ax, g.gy + g.gh + 10 * S); cx.lineTo(ax - 9 * S, g.gy + g.gh + 30 * S); cx.lineTo(ax + 9 * S, g.gy + g.gh + 30 * S); cx.fill(); }
      if (fase === 'y') { const ax = g.gx + tx * g.gw, ay = g.gy + my * g.gh; cx.strokeStyle = 'rgba(255,210,31,.5)'; cx.setLineDash([6 * S, 6 * S]); cx.beginPath(); cx.moveTo(ax, g.gy); cx.lineTo(ax, g.gy + g.gh); cx.stroke(); cx.setLineDash([]); cx.fillStyle = '#ffd21f'; cx.beginPath(); cx.arc(ax, ay, 10 * S, 0, 6.29); cx.fill(); cx.strokeStyle = '#681825'; cx.lineWidth = 3 * S; cx.stroke(); }
      // la lanzadora y la bola
      const sx = W / 2, sy = H * 0.86, r = 30 * S;
      if (pet.ok) cx.drawImage(pet, sx + 40 * S, sy - 10 * S, 46 * S, 46 * S);
      M.circAv(av, sx, sy, r);
      if (fase === 'tiro') { const ex = g.gx + tx * g.gw, ey = g.gy + ty * g.gh, k = Math.min(1, bt), bx = sx + (ex - sx) * k, by = sy - 36 * S + (ey - sy + 36 * S) * k; cx.fillStyle = '#ff7a1a'; cx.beginPath(); cx.arc(bx, by, (10 - 5 * k) * S, 0, 6.29); cx.fill(); }
      M.parts(parts, 1 / 60);
      if (msg) { M.text(msg.t, W / 2, H * 0.6, 40, msg.c); if (msg.v) M.text(msg.v, W / 2, H * 0.6 + 34 * S, 20, '#ffd21f', '800'); }
      M.text(`Lanzamiento ${tiro + (fase === 'pausa' ? 0 : 1)}`, W / 2, H * 0.1, 13, 'rgba(255,255,255,.7)', '700');
    }
    function frame(now) { if (!M.ov.isConnected || !alive) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; step(dt); draw(); requestAnimationFrame(frame); }
    function fin(sal) { if (!alive) return; alive = false; removeEventListener('keydown', onKey); M.cerrar({ modo: 'penaltis', puntos: Math.round(puntos), goles, racha: maxR, escuadras, lanzamientos: tiro, bolas: Math.floor(goles * 3 + escuadras * 2), segundos: Math.round(t), salida: sal }, sal, o.onEnd); }
    requestAnimationFrame(frame);
  }

  // ---------------- La portera ----------------
  function porteraJ(o) {
    const M = marco(o, 'Toca izquierda, centro o derecha para llegar al tiro'), R = rng(o.seed || 1), cx = M.cx;
    const av = M.img(o.avatarSrc), pet = M.img(o.mascotaSrc);
    let fase = 'cuenta', cnt = 3, ct = 0, t = 0, lane = 1, px = null, vidas = 3, puntos = 0, paradas = 0, racha = 0, maxR = 0, tiros = [], next = 1.5, n = 0, parts = [], msg = null, alive = true, last = 0, shake = 0;
    M.lives(vidas);
    const LX = i => M.W * (0.2 + 0.3 * i), GY = () => M.H * 0.82;
    function nuevo() {
      // 27 oct: más fácil al principio (las jugadoras decían que se acababa enseguida); los amagos, desde el tiro 9
      n++; const desde = 0.15 + R() * 0.7, a = Math.floor(R() * 3), amaga = n > 8 && R() < Math.min(0.4, 0.08 + n * 0.015);
      const b = amaga ? (a + 1 + Math.floor(R() * 2)) % 3 : a, aviso = Math.max(0.45, 1.1 - n * 0.02), vuelo = Math.max(0.6, 1.3 - n * 0.02);
      tiros.push({ sx: desde, a, b, aviso, vuelo, t: 0, amaga, fin: false });
      next = Math.max(0.7, 2 - n * 0.035) + (R() < 0.2 && n > 12 ? -0.35 : 0);
    }
    function ir(l) { if (!alive || fase !== 'juego') return; lane = Math.max(0, Math.min(2, l)); M.hint.classList.add('off'); }
    M.cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = M.cv.getBoundingClientRect(), f = (e.clientX - r.left) / r.width; ir(f < 0.34 ? 0 : f < 0.66 ? 1 : 2); });
    const onKey = e => { if (e.key === 'ArrowLeft') { ir(lane - 1); e.preventDefault(); } else if (e.key === 'ArrowRight') { ir(lane + 1); e.preventDefault(); } else if (e.key === 'ArrowDown' || e.key === ' ') { ir(1); e.preventDefault(); } else if (e.key === 'Escape') fin(true); };
    addEventListener('keydown', onKey); M.ov.querySelector('.jg-x').addEventListener('click', () => fin(true));
    function step(dt) {
      if (fase === 'cuenta') { ct += dt; if (ct >= 0.7) { ct = 0; cnt--; } M.big.textContent = cnt > 0 ? cnt : '¡Ya!'; if (cnt <= 0 && ct > 0.35) { M.big.textContent = ''; fase = 'juego'; } return; }
      t += dt; puntos += dt * 5; next -= dt; if (next <= 0) nuevo(); if (shake > 0) shake -= dt;
      if (px == null) px = LX(lane); px += (LX(lane) - px) * Math.min(1, dt * 18);
      tiros.forEach(s => {
        if (s.fin) return; s.t += dt;
        if (s.t >= s.aviso + s.vuelo) { s.fin = true;
          if (lane === s.b) { paradas++; racha++; maxR = Math.max(maxR, racha); const v = 50 * (1 + Math.floor(racha / 5)); puntos += v; msg = { t: s.amaga ? '¡No te ha engañado!' : '¡Paradón!', c: '#7dffa8', k: 0.8 }; beep('gol'); M.confeti(parts, LX(s.b), GY() - 30 * M.S, 18); }
          else { vidas--; racha = 0; shake = 0.3; msg = { t: '¡Gol en contra!', c: '#ff4d4d', k: 0.8 }; beep('golpe'); M.lives(vidas); if (vidas <= 0) setTimeout(() => fin(false), 400); } }
      });
      tiros = tiros.filter(s => !s.fin || s.t < s.aviso + s.vuelo + 0.4);
      if (msg) msg.k -= dt; M.mu(racha >= 5 ? '×' + (1 + Math.floor(racha / 5)) : ''); M.score(puntos);
    }
    function draw() {
      const { W, H, S } = M; cx.save(); if (shake > 0) cx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
      cx.fillStyle = '#eaf1f8'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#681825'; cx.fillRect(0, 0, 8 * S, H); cx.fillRect(W - 8 * S, 0, 8 * S, H);
      cx.strokeStyle = 'rgba(200,40,60,.25)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(W / 2, GY(), W * 0.36, Math.PI, 0); cx.stroke();
      [0.35, 0.65].forEach(f => { cx.strokeStyle = 'rgba(104,24,37,.08)'; cx.setLineDash([10 * S, 12 * S]); cx.beginPath(); cx.moveTo(W * f, H * 0.35); cx.lineTo(W * f, H); cx.stroke(); }); cx.setLineDash([]);
      porteria(M, W * 0.06, GY() + 8 * S, W * 0.88, 24 * S);
      // las tres zonas que se tocan: la tuya, marcada
      [0, 1, 2].forEach(i => { cx.fillStyle = i === lane ? 'rgba(104,24,37,.08)' : 'rgba(104,24,37,.025)'; cx.fillRect(W * i / 3, H * 0.62, W / 3, H * 0.38); });
      // a dónde va cada tiro: un círculo en la portería
      tiros.forEach(s => { if (s.fin) return; const l = s.t < s.aviso ? (s.amaga && s.t > s.aviso * 0.55 ? s.b : s.a) : s.b, pulso = 1 + 0.12 * Math.sin(t * 14);
        cx.strokeStyle = '#ff3b1f'; cx.lineWidth = 3 * S; cx.beginPath(); cx.arc(LX(l), GY() - 40 * S, 34 * S * pulso, 0, 6.29); cx.stroke(); });
      tiros.forEach(s => {
        const x0 = W * s.sx, y0 = H * 0.16;
        cx.fillStyle = '#2c5fb3'; cx.beginPath(); cx.arc(x0, y0, 18 * S, 0, 6.29); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 2.5 * S; cx.stroke(); cx.fillStyle = '#f2d2b6'; cx.beginPath(); cx.arc(x0, y0 - 4 * S, 7 * S, 0, 6.29); cx.fill();
        if (s.t < s.aviso) { const l = s.amaga && s.t > s.aviso * 0.55 ? s.b : s.a, tx = LX(l); cx.strokeStyle = s.amaga && s.t > s.aviso * 0.55 ? '#ff3b1f' : 'rgba(255,59,31,.55)'; cx.lineWidth = 4 * S; cx.setLineDash([10 * S, 8 * S]); cx.beginPath(); cx.moveTo(x0, y0 + 20 * S); cx.lineTo(tx, GY() - 40 * S); cx.stroke(); cx.setLineDash([]); }
        else if (!s.fin) { const k = (s.t - s.aviso) / s.vuelo, bx = x0 + (LX(s.b) - x0) * k, by = y0 + (GY() - 16 * S - y0) * k; cx.fillStyle = '#ff7a1a'; cx.beginPath(); cx.arc(bx, by, 10 * S, 0, 6.29); cx.fill(); }
      });
      if (pet.ok) cx.drawImage(pet, px + (lane === 2 ? -78 : 34) * S, GY() - 30 * S, 44 * S, 44 * S);
      cx.fillStyle = '#ffd21f'; cx.fillRect(px - 40 * S, GY() - 18 * S, 80 * S, 14 * S);
      M.circAv(av, px, GY() - 40 * S, 28 * S);
      cx.restore(); M.parts(parts, 1 / 60);
      if (msg && msg.k > 0) M.text(msg.t, W / 2, H * 0.48, 34, msg.c === '#7dffa8' ? '#2e6b46' : msg.c);
    }
    function frame(now) { if (!M.ov.isConnected || !alive) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; step(dt); draw(); requestAnimationFrame(frame); }
    function fin(sal) { if (!alive) return; alive = false; removeEventListener('keydown', onKey); M.cerrar({ modo: 'portera', puntos: Math.round(puntos), paradas, racha: maxR, bolas: Math.floor(paradas * 1.5), segundos: Math.round(t), salida: sal }, sal, o.onEnd); }
    requestAnimationFrame(frame);
  }

  SJ.penaltis = penaltis; SJ.portera = porteraJ;
  SJ.jugar = o => o.modo === 'penaltis' ? penaltis(o) : o.modo === 'portera' ? porteraJ(o) : SJ.start(o);
  // el juego de cada día (el mismo para todas): va rotando
  SJ.JUEGOS = [['patina', 'Patina y marca', 'Esquiva, regatea y marca leyendo a la portera'], ['penaltis', 'Tanda de penaltis', 'Apunta y elige la altura. ¿Cuántos seguidos?'], ['portera', 'La portera', 'Hoy paras tú. Ojo con los amagos']];
  SJ.delDia = fecha => { const [y, m, d] = fecha.split('-').map(Number), n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 9, 26)) / 864e5); return SJ.JUEGOS[((n % 3) + 3) % 3]; };
})();
