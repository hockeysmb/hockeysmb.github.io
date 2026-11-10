// Recreativa SMB (10 nov): cinco clásicos de recreativa con tema de hockey, para las dos apps (jugadoras y entrenadores).
// Canvas 2D sin librerías; todo lo que pasa sale de la semilla (en un duelo, las dos juegan lo mismo).
// Uso: SMBArcade.jugar({ modo, avatarSrc, seed, titulo, sonido: 'clave de localStorage', onEnd(resultado) })
// Modos: muro (Breakout), cruza (Frogger), conduce (Snake), invasion (Space Invaders), tetris (Tetris).
(function () {
  const JUEGOS = [
    ['muro', 'Rompe la defensa', 'Rebota la bola con el stick, tumba la defensa y marca'],
    ['cruza', 'Cruza la pista', 'Llega a la portería sin chocar con las rivales'],
    ['conduce', 'Conduce y recoge', 'Recoge bolas sueltas sin chocar con las vallas'],
    ['invasion', 'Invasión rival', 'Para la oleada de rivales antes de que lleguen a tu portería'],
    ['tetris', 'Tetris de hockey', 'Encaja las piezas y limpia líneas'],
  ];
  const rng = seed => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const C = { granate: '#681825', granate2: '#8e2236', pista: '#eef3f8', linea: '#c9d6e4', azul: '#2f6fd6', rojo: '#d93a3a', bola: '#ff7a1a', oro: '#ffcf33', tinta: '#1d1418', rival: '#24426e', rival2: '#3b6aa8', blanco: '#ffffff', verde: '#2fae6b' };

  // ---------- estilos (una vez) ----------
  function css() {
    if (document.getElementById('ar-css')) return;
    const s = document.createElement('style'); s.id = 'ar-css';
    s.textContent = `.ar-ov{position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;background:#1b0b10;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
body.ar-on{overflow:hidden}
.ar-top{display:flex;align-items:center;gap:10px;padding:10px 14px;color:#fff;font-weight:700}
.ar-tt{flex:1;min-width:0;font-size:13px;color:rgba(255,255,255,.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ar-mu{font-size:14px;font-weight:800;color:#ffd21f;min-width:20px;text-align:right}
.ar-sc{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums}
.ar-lv{color:#ff6b81;font-size:17px;letter-spacing:2px}
.ar-b{border:0;border-radius:12px;padding:8px 12px;background:rgba(255,255,255,.14);color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer}
.ar-cv{position:relative;flex:1;min-height:0;display:flex;justify-content:center;align-items:stretch}
.ar-cv canvas{display:block;touch-action:none;border-radius:16px 16px 0 0}
.ar-big{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font:800 54px system-ui,sans-serif;color:#681825;text-shadow:0 2px 0 #fff,0 0 18px rgba(255,255,255,.8);opacity:0;transition:opacity .2s}
.ar-big.on{opacity:1}
.ar-hint{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:max-content;max-width:90%;text-align:center;font-size:13px;font-weight:600;color:#fff;background:rgba(0,0,0,.6);padding:8px 12px;border-radius:12px;pointer-events:none;transition:opacity .3s}
.ar-hint.off{opacity:0}
.ar-pad{display:flex;justify-content:center;gap:10px;padding:10px 12px 12px;background:#1b0b10}
.ar-pad button{flex:1;max-width:84px;height:54px;border:0;border-radius:14px;background:rgba(255,255,255,.14);color:#fff;font:700 22px system-ui,sans-serif;touch-action:none;cursor:pointer}
.ar-pad button:active{background:rgba(255,255,255,.3)}`;
    document.head.appendChild(s);
  }

  // ---------- sonido (sin archivos) ----------
  let AC = null;
  function beeper(key) {
    const on = () => { try { return localStorage.getItem(key) !== 'no'; } catch (e) { return true; } };
    const N = { bola: [[880, .05]], gol: [[523, .09], [659, .09], [784, .09], [1047, .18]], golpe: [[140, .18]], toque: [[520, .04]], linea: [[660, .07], [880, .07], [1175, .12]], nivel: [[392, .1], [523, .1], [784, .2]], salto: [[300, .04], [420, .04]], tiro: [[990, .03]], cae: [[220, .05]] };
    return { on, beep(k) {
      try { if (!on()) return; AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
        let t = AC.currentTime; (N[k] || N.toque).forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = k === 'golpe' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02); t += d * .9; });
      } catch (e) {}
    } };
  }
  const cargaImg = src => new Promise(ok => { if (!src) return ok(null); const i = new Image(); const to = setTimeout(() => ok(null), 2500); i.onload = () => { clearTimeout(to); ok(i); }; i.onerror = () => { clearTimeout(to); ok(null); }; i.src = src; });

  // ---------- el marco: capa a pantalla completa, lienzo, bucle, pausa y entradas ----------
  // pad: lista de [clave, texto] para botones táctiles debajo del campo
  function marco(o, hint, pad) {
    css();
    const snd = beeper(o.sonido || 'smb-arcade-sonido');
    const ov = document.createElement('div'); ov.className = 'ar-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', o.titulo || 'Juego');
    const esc = t => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    ov.innerHTML = `<div class="ar-top"><span class="ar-tt">${esc(o.titulo)}</span><span class="ar-mu"></span><span class="ar-sc">0</span><span class="ar-lv" aria-label="Vidas"></span>
      <button type="button" class="ar-b ar-snd" aria-label="Sonido">${snd.on() ? '♪' : '♪̸'}</button><button type="button" class="ar-b ar-x">Salir</button></div>
      <div class="ar-cv"><canvas></canvas><div class="ar-big"></div><div class="ar-hint">${esc(hint)}</div></div>
      ${pad ? `<div class="ar-pad">${pad.map(([k, t]) => `<button type="button" data-k="${k}" aria-label="${k}">${t}</button>`).join('')}</div>` : ''}`;
    document.body.appendChild(ov); document.body.classList.add('ar-on');
    ov.querySelector('.ar-snd').addEventListener('click', e => { try { localStorage.setItem(o.sonido || 'smb-arcade-sonido', snd.on() ? 'no' : 'si'); } catch (er) {} e.currentTarget.textContent = snd.on() ? '♪' : '♪̸'; });
    const cont = ov.querySelector('.ar-cv'), cv = cont.querySelector('canvas'), ctx = cv.getContext('2d');
    const box = cont.getBoundingClientRect(), D = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.min(box.width || 380, 520), chAvail = box.height || 600;
    const W = 360, H = Math.round(Math.max(520, Math.min(780, chAvail * W / cw))), k = Math.min(cw / W, chAvail / H);
    cv.width = Math.round(W * k * D); cv.height = Math.round(H * k * D); cv.style.width = Math.round(W * k) + 'px'; cv.style.height = Math.round(H * k) + 'px';
    ctx.setTransform(k * D, 0, 0, k * D, 0, 0);
    const big = ov.querySelector('.ar-big'), hintEl = ov.querySelector('.ar-hint');
    const M = { ov, cv, ctx, W, H, k, alive: true, paused: false, started: false, beep: snd.beep, t: 0, shake: 0, parts: [], textos: [] };
    M.score = v => { ov.querySelector('.ar-sc').textContent = Math.round(v).toLocaleString('es-ES'); };
    M.lives = (n, max = 3) => { ov.querySelector('.ar-lv').textContent = '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, max - n)); };
    M.mu = t => { ov.querySelector('.ar-mu').textContent = t || ''; };
    let bigT = null;
    M.big = (t, ms = 900) => { big.textContent = t; big.classList.add('on'); clearTimeout(bigT); bigT = setTimeout(() => big.classList.remove('on'), ms); };
    M.hint = t => { if (t) { hintEl.textContent = t; hintEl.classList.remove('off'); } else hintEl.classList.add('off'); };
    // partículas y textos flotantes
    M.chispas = (x, y, col, n = 10) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 40 + Math.random() * 120; M.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, d: .5 + Math.random() * .3, col }); } };
    M.flota = (x, y, txt, col = C.granate) => M.textos.push({ x, y, txt, col, t: 0 });
    M.fx = dt => {
      M.parts = M.parts.filter(p => (p.t += dt) < p.d); M.textos = M.textos.filter(p => (p.t += dt) < .9);
      M.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; ctx.globalAlpha = 1 - p.t / p.d; ctx.fillStyle = p.col; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); });
      ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.font = '800 16px system-ui,sans-serif';
      M.textos.forEach(p => { ctx.globalAlpha = 1 - p.t / .9; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(p.txt, p.x, p.y - p.t * 40); ctx.fillStyle = p.col; ctx.fillText(p.txt, p.x, p.y - p.t * 40); });
      ctx.globalAlpha = 1;
    };
    // entradas: teclas, botones, toques y deslizamientos
    const H_ = { key: [], pad: [], down: [], move: [], up: [], swipe: [], tap: [] };
    M.on = (ev, fn) => { H_[ev].push(fn); };
    const emit = (ev, ...a) => { if (!M.alive) return; if (M.paused) { if (ev === 'tap' || ev === 'key' || ev === 'pad') reanudar(); return; } if (!M.started && (ev === 'tap' || ev === 'key' || ev === 'pad' || ev === 'swipe')) { M.started = true; M.hint(''); } H_[ev].forEach(f => f(...a)); };
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    let st = null;
    const pd = e => { e.preventDefault(); const [x, y] = pos(e); st = { x, y, t: performance.now() }; emit('down', x, y); };
    const pm = e => { if (!st) return; e.preventDefault(); const [x, y] = pos(e); emit('move', x, y); };
    const pu = e => { if (!st) return; const [x, y] = pos(e), dx = x - st.x, dy = y - st.y, dt = performance.now() - st.t; st = null; emit('up', x, y);
      if (Math.hypot(dx, dy) > 22 && dt < 600) emit('swipe', Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : (dy > 0 ? 'abajo' : 'arriba')); else emit('tap', x, y); };
    cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu); window.addEventListener('pointercancel', pu);
    const KEYS = { ArrowLeft: 'izq', ArrowRight: 'der', ArrowUp: 'arriba', ArrowDown: 'abajo', ' ': 'accion', Enter: 'accion', a: 'izq', d: 'der', w: 'arriba', s: 'abajo' };
    const held = new Set();
    const kd = e => { if (e.key === 'Escape') { M.fin(true); return; } const k2 = KEYS[e.key]; if (!k2) return; e.preventDefault(); if (!held.has(k2)) emit('key', k2); held.add(k2); };
    const ku = e => { const k2 = KEYS[e.key]; if (k2) held.delete(k2); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    M.held = k2 => held.has(k2);
    ov.querySelectorAll('.ar-pad button').forEach(b => {
      let rep = null;
      b.addEventListener('pointerdown', e => { e.preventDefault(); const k2 = b.dataset.k; held.add(k2); emit('pad', k2); if (b.dataset.k !== 'rota' && b.dataset.k !== 'cae') rep = setInterval(() => emit('pad', k2, true), 140); });
      const off = () => { held.delete(b.dataset.k); clearInterval(rep); rep = null; };
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
    // pausa si se cambia de app
    const reanudar = () => { M.paused = false; M.hint(''); last = performance.now(); };
    const vis = () => { if (document.hidden && M.started && M.alive) { M.paused = true; M.hint('En pausa. Toca para seguir'); } };
    document.addEventListener('visibilitychange', vis);
    // bucle
    let last = performance.now(), raf = 0;
    M.correr = (update, draw) => {
      const tick = now => {
        if (!M.alive) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (M.started && !M.paused) { M.t += dt; update(dt); }
        ctx.save(); if (M.shake > 0) { M.shake -= dt; ctx.translate((Math.random() - .5) * 6, (Math.random() - .5) * 6); }
        draw(dt); M.fx(M.paused ? 0 : dt); ctx.restore();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    M.cerrar = (res, sal) => {
      if (!M.alive) return; M.alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('pointerup', pu); window.removeEventListener('pointercancel', pu); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', vis);
      setTimeout(() => { ov.remove(); if (!document.querySelector('.ar-ov')) document.body.classList.remove('ar-on'); o.onEnd && o.onEnd(res); }, sal ? 0 : 1300);
    };
    M.fin = () => {}; // cada juego la define
    ov.querySelector('.ar-x').addEventListener('click', () => M.fin(true));
    return M;
  }

  // ---------- dibujos comunes ----------
  function pista(M, conLineas = true) {
    const { ctx, W, H } = M;
    ctx.fillStyle = C.pista; ctx.fillRect(0, 0, W, H);
    if (!conLineas) return;
    ctx.strokeStyle = C.linea; ctx.lineWidth = 2; ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.strokeStyle = 'rgba(217,58,58,.35)'; ctx.beginPath(); ctx.moveTo(6, H / 2); ctx.lineTo(W - 6, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 38, 0, 6.283); ctx.stroke();
  }
  function bola(ctx, x, y, r = 6, col = C.bola) {
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + r * .8, r, r * .45, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, r * .32, 0, 6.283); ctx.fill();
  }
  // jugadora vista desde arriba: camiseta, casco y stick; con foto del personaje si la hay
  function jugadora(ctx, x, y, r, col, img, ang = -Math.PI / 2, stick = true) {
    if (stick) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * .2, r * .6); ctx.lineTo(r * 1.55, r * .7); ctx.stroke(); ctx.strokeStyle = C.tinta; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 1.5, r * .7); ctx.quadraticCurveTo(r * 1.9, r * .7, r * 1.85, r * 1.15); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + r * .9, r, r * .4, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    if (img) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 2.5, 0, 6.283); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.drawImage(img, x - r * 1.05, y - r * 1.05, r * 2.1, r * 2.1); ctx.restore(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * .55, 0, 6.283); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * .3, 0, 6.283); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
  }
  function cono(ctx, x, y, s = 14) {
    ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(x, y - s * .7); ctx.lineTo(x + s * .5, y + s * .45); ctx.lineTo(x - s * .5, y + s * .45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - s * .24, y - s * .05, s * .48, s * .14);
    ctx.fillStyle = '#d96a10'; ctx.fillRect(x - s * .6, y + s * .42, s * 1.2, s * .14);
  }
  function porteria(ctx, x, y, w, h, abajo = false) {
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
    for (let i = x + 6; i < x + w; i += 7) { ctx.beginPath(); ctx.moveTo(i, y); ctx.lineTo(i, y + h); ctx.stroke(); }
    for (let j = y + 6; j < y + h; j += 7) { ctx.beginPath(); ctx.moveTo(x, j); ctx.lineTo(x + w, j); ctx.stroke(); }
    ctx.strokeStyle = C.rojo; ctx.lineWidth = 4; ctx.beginPath();
    if (abajo) { ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); } else { ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y); }
    ctx.stroke();
  }
  function rect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // =====================================================================
  // 1. ROMPE LA DEFENSA (Breakout): la defensa es un muro de vallas y defensoras; detrás, la portería
  // =====================================================================
  async function muro(o) {
    const M = marco(o, 'Mueve el stick con el dedo. Toca para sacar');
    const img = await cargaImg(o.avatarSrc), R = rng(o.seed || 1), { ctx, W, H } = M;
    const GX = W / 2 - 55, GW = 110, GY = 14, TOP = 70;
    let nivel = 1, vidas = 3, puntos = 0, goles = 0, tumbadas = 0, racha = 0, maxR = 0, px = W / 2, pw = 74, largo = 0;
    let bolas = [], ladr = [], premios = [];
    const PY = H - 70;
    function muroNuevo() {
      ladr = []; const cols = 8, filas = Math.min(7, 3 + nivel), bw = (W - 24) / cols;
      for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) {
        const def = f < Math.min(2, nivel - 1) || (R() < .12 * nivel && f < 3); // defensoras: dos toques
        if (R() < .08 && f > 0) continue;
        ladr.push({ x: 12 + c * bw + 2, y: TOP + f * 22, w: bw - 4, h: 18, vida: def ? 2 : 1, def });
      }
    }
    const nuevaBola = () => { bolas = [{ x: px, y: PY - 14, vx: 0, vy: 0, pegada: true }]; };
    muroNuevo(); nuevaBola(); M.lives(vidas); M.score(0);
    const vel = () => 300 + nivel * 28 + Math.min(120, M.t * 1.2);
    const saca = () => bolas.forEach(b => { if (b.pegada) { M.hint(''); b.pegada = false; const a = -Math.PI / 2 + (R() - .5) * .8; b.vx = Math.cos(a) * vel(); b.vy = Math.sin(a) * vel(); M.beep('toque'); } });
    M.on('down', x => { px = x; }); M.on('move', x => { px = x; }); M.on('tap', saca);
    M.on('key', k => { if (k === 'accion' || k === 'arriba') saca(); });
    M.fin = sal => M.cerrar({ modo: 'muro', puntos: Math.round(puntos), bolas: Math.floor(tumbadas / 4) + goles * 3, goles, nivel, combo: maxR, segundos: Math.round(M.t), salida: !!sal }, sal);
    function update(dt) {
      if (M.held('izq')) px -= 420 * dt; if (M.held('der')) px += 420 * dt;
      const w = pw + (largo > 0 ? 40 : 0); largo = Math.max(0, largo - dt);
      px = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, px));
      bolas.forEach(b => {
        if (b.pegada) { b.x = px; b.y = PY - 14; return; }
        const pasos = 3; for (let s = 0; s < pasos; s++) {
          b.x += b.vx * dt / pasos; b.y += b.vy * dt / pasos;
          if (b.x < 12) { b.x = 12; b.vx = Math.abs(b.vx); } if (b.x > W - 12) { b.x = W - 12; b.vx = -Math.abs(b.vx); }
          if (b.y < GY + 34) { // arriba: portería o banda
            if (b.x > GX + 6 && b.x < GX + GW - 6) { if (!b.dentro) { b.dentro = true; goles++; const p = 100 * nivel; puntos += p; M.flota(b.x, GY + 50, '¡GOL! +' + p); M.big(o.cele || '¡GOL!'); M.chispas(b.x, GY + 30, C.oro, 24); M.beep('gol'); } if (b.y < GY + 6) { b.y = GY + 6; b.vy = Math.abs(b.vy); } }
            else if (b.y < 12) { b.y = 12; b.vy = Math.abs(b.vy); }
          } else b.dentro = false;
          // stick
          if (b.vy > 0 && b.y > PY - 12 && b.y < PY + 8 && Math.abs(b.x - px) < w / 2 + 8) {
            const off = (b.x - px) / (w / 2), a = -Math.PI / 2 + off * 1.05, v = vel();
            b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.y = PY - 12; racha = 0; M.beep('toque');
          }
          // muro
          for (const l of ladr) {
            if (l.vida <= 0) continue;
            if (b.x > l.x - 6 && b.x < l.x + l.w + 6 && b.y > l.y - 6 && b.y < l.y + l.h + 6) {
              const dx = Math.min(Math.abs(b.x - (l.x - 6)), Math.abs(b.x - (l.x + l.w + 6))), dy = Math.min(Math.abs(b.y - (l.y - 6)), Math.abs(b.y - (l.y + l.h + 6)));
              if (dx < dy) b.vx = -b.vx; else b.vy = -b.vy;
              l.vida--; M.beep(l.vida ? 'golpe' : 'bola');
              if (!l.vida) { tumbadas++; racha++; maxR = Math.max(maxR, racha); const p = (l.def ? 25 : 10) * nivel * (racha >= 5 ? 2 : 1); puntos += p; M.chispas(l.x + l.w / 2, l.y + 9, l.def ? C.rival2 : '#fff', 10); if (racha >= 5 && racha % 5 === 0) M.flota(l.x + l.w / 2, l.y, 'Racha ×2', C.oro);
                if (R() < .1) premios.push({ x: l.x + l.w / 2, y: l.y + 9, k: R() < .7 ? 'largo' : 'vida' }); }
              break;
            }
          }
        }
      });
      // bolas perdidas
      const antes = bolas.length; bolas = bolas.filter(b => b.y < H + 20);
      if (antes && !bolas.length) { vidas--; M.lives(vidas); M.shake = .3; M.beep('golpe'); racha = 0; if (vidas <= 0) { M.big('Fin'); M.fin(false); return; } nuevaBola(); M.hint('Toca para sacar'); }
      // premios que caen
      premios.forEach(p => { p.y += 130 * dt; if (p.y > PY - 12 && p.y < PY + 12 && Math.abs(p.x - px) < w / 2 + 10) { p.ok = true; if (p.k === 'vida') { vidas = Math.min(4, vidas + 1); M.lives(vidas, Math.max(3, vidas)); M.flota(p.x, PY - 20, '+1 vida', C.verde); } else { largo = 10; M.flota(p.x, PY - 20, 'Stick largo', C.azul); } M.beep('nivel'); } });
      premios = premios.filter(p => !p.ok && p.y < H + 20);
      // muro tumbado: siguiente nivel
      if (!ladr.some(l => l.vida > 0)) { nivel++; puntos += 200; M.big('Nivel ' + nivel); M.beep('nivel'); muroNuevo(); nuevaBola(); M.hint('Toca para sacar'); }
      M.score(puntos); M.mu('N' + nivel);
    }
    function draw() {
      pista(M, false);
      ctx.strokeStyle = C.linea; ctx.lineWidth = 2; ctx.strokeRect(6, 6, W - 12, H - 12);
      porteria(ctx, GX, GY, GW, 24);
      ladr.forEach(l => { if (l.vida <= 0) return;
        if (l.def) { rect(ctx, l.x, l.y, l.w, l.h, 6); ctx.fillStyle = l.vida > 1 ? C.rival : C.rival2; ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(l.x + l.w / 2, l.y + l.h / 2, 5, 0, 6.283); ctx.fill(); }
        else { rect(ctx, l.x, l.y, l.w, l.h, 3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.fillStyle = C.rojo; for (let i = 0; i < 3; i++) ctx.fillRect(l.x + 4 + i * (l.w - 8) / 3, l.y + 2, (l.w - 8) / 6, l.h - 4); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.stroke(); }
      });
      premios.forEach(p => { ctx.fillStyle = p.k === 'vida' ? C.rojo : C.azul; rect(ctx, p.x - 13, p.y - 9, 26, 18, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(p.k === 'vida' ? '♥' : '↔', p.x, p.y + 4); });
      const w = pw + (largo > 0 ? 40 : 0);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px - w / 2, PY); ctx.lineTo(px + w / 2, PY); ctx.stroke();
      ctx.strokeStyle = '#a8703a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - w / 2 + 4, PY); ctx.lineTo(px + w / 2 - 4, PY); ctx.stroke();
      jugadora(ctx, px, PY + 26, 17, C.granate, img, 0, false);
      bolas.forEach(b => bola(ctx, b.x, b.y, 6));
    }
    M.correr(update, draw);
  }

  // =====================================================================
  // 2. CRUZA LA PISTA (Frogger): de tu área a la portería contraria, esquivando filas de rivales
  // =====================================================================
  async function cruza(o) {
    const M = marco(o, 'Desliza o usa las flechas. Llega a una portería', [['izq', '◀'], ['arriba', '▲'], ['abajo', '▼'], ['der', '▶']]);
    const img = await cargaImg(o.avatarSrc), R = rng(o.seed || 1), { ctx, W, H } = M;
    const COLS = 9, FILAS = 13, CW = W / COLS, CH = (H - 10) / FILAS, Y0 = 5;
    const HUECOS = [1, 4, 7];
    let nivel = 1, vidas = 3, puntos = 0, goles = 0, mejor = FILAS - 1, llenos = [], tiempo = 30, cx = 4, cy = FILAS - 1, salto = 0, muerta = 0, carriles = [];
    function nivelNuevo() {
      carriles = [];
      for (let f = 1; f < FILAS - 1; f++) {
        if (f === 6) { carriles[f] = null; continue; } // medio campo: se descansa
        const dir = (f % 2 ? 1 : -1) * (R() < .5 ? 1 : -1), v = (34 + R() * 40 + f * 2) * (1 + (nivel - 1) * .16) * dir;
        const tipo = f < 6 ? 'rival' : (R() < .4 ? 'carro' : 'rival'), largo = tipo === 'carro' ? 2 + Math.floor(R() * 2) : (R() < .35 ? 2 : 1);
        const n = tipo === 'carro' ? 2 : (largo > 1 ? 2 : 3) + (R() < .3 ? 1 : 0), hueco = W / n, obs = [];
        for (let i = 0; i < n; i++) obs.push({ x: i * hueco + R() * hueco * .4, w: largo * CW * .9 });
        carriles[f] = { v, tipo, obs, largo };
      }
    }
    nivelNuevo(); M.lives(vidas); M.score(0);
    const rowY = f => Y0 + f * CH + CH / 2;
    const reset = () => { cx = 4; cy = FILAS - 1; mejor = FILAS - 1; tiempo = Math.max(18, 32 - nivel * 2); };
    const morir = txt => { if (muerta) return; muerta = .8; vidas--; M.lives(vidas); M.shake = .3; M.beep('golpe'); M.flota(cx * CW + CW / 2, rowY(cy), txt, C.rojo); if (vidas <= 0) { M.big('Fin'); setTimeout(() => M.fin(false), 500); } };
    const mover = d => {
      if (muerta || !M.alive) return;
      const nx = cx + (d === 'izq' ? -1 : d === 'der' ? 1 : 0), ny = cy + (d === 'arriba' ? -1 : d === 'abajo' ? 1 : 0);
      if (nx < 0 || nx >= COLS || ny >= FILAS) return;
      if (ny === 0) { // la línea de las porterías
        if (!HUECOS.includes(nx) || llenos.includes(nx)) { M.beep('golpe'); M.flota(nx * CW + CW / 2, rowY(0) + 10, llenos.includes(nx) ? 'Ya está' : 'Fuera', C.rojo); return; }
        cx = nx; cy = 0; goles++; llenos.push(nx); const p = 200 + Math.round(tiempo) * 5; puntos += p; M.big(o.cele || '¡GOL!'); M.beep('gol'); M.chispas(nx * CW + CW / 2, rowY(0), C.oro, 24); M.flota(nx * CW + CW / 2, rowY(0) + 20, '+' + p, C.granate);
        if (llenos.length === HUECOS.length) { nivel++; llenos = []; puntos += 500; setTimeout(() => { M.big('Nivel ' + nivel); M.beep('nivel'); nivelNuevo(); }, 600); }
        setTimeout(reset, 450); return;
      }
      cx = nx; cy = ny; salto = .12; M.beep('salto');
      if (cy < mejor) { mejor = cy; puntos += 10; }
    };
    M.on('swipe', mover); M.on('key', k => mover(k)); M.on('pad', mover);
    M.on('tap', (x, y) => { const pxp = cx * CW + CW / 2, pyp = rowY(cy), dx = x - pxp, dy = y - pyp; if (Math.abs(dx) < CW * .6 && Math.abs(dy) < CH * .6) return mover('arriba'); mover(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : (dy > 0 ? 'abajo' : 'arriba')); });
    M.fin = sal => M.cerrar({ modo: 'cruza', puntos: Math.round(puntos), bolas: goles * 4 + Math.floor(puntos / 400), goles, nivel, segundos: Math.round(M.t), salida: !!sal }, sal);
    function update(dt) {
      salto = Math.max(0, salto - dt);
      carriles.forEach(c => { if (!c) return; c.obs.forEach(ob => { ob.x += c.v * dt; if (c.v > 0 && ob.x > W + 10) ob.x -= W + ob.w + 20; if (c.v < 0 && ob.x + ob.w < -10) ob.x += W + ob.w + 20; }); });
      if (muerta) { muerta -= dt; if (muerta <= 0) { muerta = 0; if (vidas > 0) reset(); } }
      else if (cy > 0) {
        tiempo -= dt; if (tiempo <= 0) morir('¡Tiempo!');
        const c = carriles[cy];
        if (c) { const x0 = cx * CW + CW * .2, x1 = cx * CW + CW * .8; if (c.obs.some(ob => x1 > ob.x && x0 < ob.x + ob.w)) morir('¡Choque!'); }
      }
      M.score(puntos); M.mu(Math.max(0, Math.ceil(tiempo)) + ' s');
    }
    function draw() {
      pista(M, false);
      for (let f = 0; f < FILAS; f++) { const y = Y0 + f * CH; ctx.fillStyle = f === 0 ? '#f8e9ec' : f === 6 ? '#fde9ea' : f === FILAS - 1 ? '#e6f4ec' : f % 2 ? '#eef3f8' : '#e7eef6'; ctx.fillRect(0, y, W, CH); }
      ctx.strokeStyle = 'rgba(217,58,58,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, rowY(6)); ctx.lineTo(W, rowY(6)); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = '600 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('MEDIO CAMPO', 6, rowY(6) - 4); ctx.fillText('TU ÁREA', 6, rowY(FILAS - 1) + 4);
      HUECOS.forEach(h => { porteria(ctx, h * CW + 3, Y0 + 2, CW - 6, CH - 8); if (llenos.includes(h)) bola(ctx, h * CW + CW / 2, rowY(0) - 2, 7); });
      carriles.forEach((c, f) => { if (!c) return; const y = rowY(f);
        c.obs.forEach(ob => {
          if (c.tipo === 'carro') { rect(ctx, ob.x, y - CH * .32, ob.w, CH * .64, 6); ctx.fillStyle = '#5b6b7d'; ctx.fill(); for (let i = 0; i < c.largo * 2; i++) bola(ctx, ob.x + 8 + i * (ob.w - 16) / Math.max(1, c.largo * 2 - 1), y, 5); }
          else for (let i = 0; i < Math.round(ob.w / (CW * .9)); i++) jugadora(ctx, ob.x + CW * .45 + i * CW * .9, y, CH * .3, f < 6 ? C.rival : C.rojo, null, c.v > 0 ? 0 : Math.PI);
        });
      });
      const px = cx * CW + CW / 2, py = rowY(cy) - salto * 30;
      if (!muerta || Math.floor(M.t * 12) % 2) jugadora(ctx, px, py, CH * .34, C.granate, img, -Math.PI / 2);
    }
    M.correr(update, draw);
  }

  // =====================================================================
  // 3. CONDUCE Y RECOGE (Snake): conduces la bola; cada bola suelta suma una compañera a la fila
  // =====================================================================
  async function conduce(o) {
    const M = marco(o, 'Desliza para girar. Recoge bolas sin chocar', [['izq', '◀'], ['arriba', '▲'], ['abajo', '▼'], ['der', '▶']]);
    const img = await cargaImg(o.avatarSrc), R = rng(o.seed || 1), { ctx, W, H } = M;
    const CS = 24, COLS = Math.floor((W - 16) / CS), ROWS = Math.floor((H - 16) / CS), OX = (W - COLS * CS) / 2, OY = (H - ROWS * CS) / 2;
    let fila = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) + 2 }, { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) + 3 }, { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) + 4 }];
    let dir = [0, -1], cola = [], paso = 0, puntos = 0, recogidas = 0, conos = [], comida = null, oro = null, vivo = true, prev = fila.map(p => ({ ...p }));
    const libre = (x, y) => !fila.some(p => p.x === x && p.y === y) && !conos.some(c => c.x === x && c.y === y) && !(comida && comida.x === x && comida.y === y);
    const sitio = () => { for (let i = 0; i < 400; i++) { const x = Math.floor(R() * COLS), y = Math.floor(R() * ROWS); if (libre(x, y) && Math.abs(x - fila[0].x) + Math.abs(y - fila[0].y) > 2) return { x, y }; } return { x: 0, y: 0 }; };
    comida = sitio(); M.lives(1, 1); M.score(0);
    const nivel = () => 1 + Math.floor(recogidas / 5), velo = () => Math.max(.065, .16 - recogidas * .0035);
    const girar = d => { const v = { izq: [-1, 0], der: [1, 0], arriba: [0, -1], abajo: [0, 1] }[d]; if (!v) return; const ult = cola.length ? cola[cola.length - 1] : dir; if (v[0] === -ult[0] && v[1] === -ult[1]) return; if (cola.length < 3) cola.push(v); };
    M.on('swipe', girar); M.on('key', girar); M.on('pad', (k, rep) => { if (!rep) girar(k); });
    M.on('tap', (x, y) => { const h = fila[0], hx = OX + h.x * CS + CS / 2, hy = OY + h.y * CS + CS / 2, dx = x - hx, dy = y - hy; if (dir[0]) girar(dy > 0 ? 'abajo' : 'arriba'); else girar(dx > 0 ? 'der' : 'izq'); });
    M.fin = sal => M.cerrar({ modo: 'conduce', puntos: Math.round(puntos), bolas: recogidas, nivel: nivel(), combo: fila.length, segundos: Math.round(M.t), salida: !!sal }, sal);
    function update(dt) {
      if (!vivo) return;
      if (oro) { oro.t -= dt; if (oro.t <= 0) oro = null; }
      paso += dt; if (paso < velo()) return; paso = 0;
      if (cola.length) dir = cola.shift();
      prev = fila.map(p => ({ ...p }));
      const h = { x: fila[0].x + dir[0], y: fila[0].y + dir[1] };
      const choca = h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || conos.some(c => c.x === h.x && c.y === h.y) || fila.slice(0, -1).some(p => p.x === h.x && p.y === h.y);
      if (choca) { vivo = false; M.shake = .4; M.beep('golpe'); M.big('Fin'); M.chispas(OX + fila[0].x * CS + CS / 2, OY + fila[0].y * CS + CS / 2, C.rojo, 20); setTimeout(() => M.fin(false), 300); return; }
      fila.unshift(h);
      if (comida && h.x === comida.x && h.y === comida.y) {
        recogidas++; const p = 10 * nivel(); puntos += p; M.beep('bola'); M.flota(OX + h.x * CS + CS / 2, OY + h.y * CS, '+' + p); M.chispas(OX + h.x * CS + CS / 2, OY + h.y * CS + CS / 2, C.bola, 8);
        if (recogidas % 5 === 0) { conos.push(sitio()); M.big('Nivel ' + nivel(), 700); M.beep('nivel'); }
        if (!oro && R() < .18) oro = Object.assign(sitio(), { t: 6 });
        comida = sitio();
      } else if (oro && h.x === oro.x && h.y === oro.y) { puntos += 50 * nivel(); M.flota(OX + h.x * CS + CS / 2, OY + h.y * CS, '+' + 50 * nivel(), C.oro); M.beep('gol'); M.chispas(OX + h.x * CS + CS / 2, OY + h.y * CS + CS / 2, C.oro, 16); oro = null; fila.pop(); }
      else fila.pop();
      prev.length = fila.length; for (let i = 0; i < fila.length; i++) if (!prev[i]) prev[i] = { ...fila[i] };
      M.score(puntos); M.mu(fila.length + ' en fila');
    }
    function draw() {
      pista(M, false);
      ctx.fillStyle = '#e4ecf5'; for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if ((x + y) % 2) ctx.fillRect(OX + x * CS, OY + y * CS, CS, CS);
      ctx.strokeStyle = C.granate; ctx.lineWidth = 5; ctx.strokeRect(OX - 3, OY - 3, COLS * CS + 6, ROWS * CS + 6);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; for (let x = OX; x < OX + COLS * CS; x += 18) { ctx.beginPath(); ctx.moveTo(x, OY - 5); ctx.lineTo(x + 8, OY - 5); ctx.stroke(); }
      conos.forEach(c => cono(ctx, OX + c.x * CS + CS / 2, OY + c.y * CS + CS / 2, 18));
      if (comida) bola(ctx, OX + comida.x * CS + CS / 2, OY + comida.y * CS + CS / 2 + Math.sin(M.t * 6) * 1.5, 7);
      if (oro) { ctx.globalAlpha = oro.t < 2 ? (Math.floor(M.t * 8) % 2 ? .4 : 1) : 1; bola(ctx, OX + oro.x * CS + CS / 2, OY + oro.y * CS + CS / 2, 9, C.oro); ctx.globalAlpha = 1; }
      const f = vivo ? Math.min(1, paso / velo()) : 1;
      for (let i = fila.length - 1; i >= 0; i--) {
        const a = prev[i] || fila[i], b = fila[i], x = OX + (a.x + (b.x - a.x) * f) * CS + CS / 2, y = OY + (a.y + (b.y - a.y) * f) * CS + CS / 2;
        if (i === 0) { jugadora(ctx, x, y, 11, C.granate, img, Math.atan2(dir[1], dir[0])); bola(ctx, x + dir[0] * 13, y + dir[1] * 13, 5); }
        else jugadora(ctx, x, y, 8.5, i % 2 ? C.granate2 : C.granate, null, 0, false);
      }
    }
    M.correr(update, draw);
  }

  // =====================================================================
  // 4. INVASIÓN RIVAL (Space Invaders): defiendes tu portería de oleadas de rivales que bajan tirando
  // =====================================================================
  async function invasion(o) {
    const M = marco(o, 'Arrastra para moverte. Tiras sola');
    const img = await cargaImg(o.avatarSrc), R = rng(o.seed || 1), { ctx, W, H } = M;
    const PY = H - 86, GY = H - 46;
    let px = W / 2, vidas = 3, puntos = 0, oleada = 1, elim = 0, inv = 0, tiros = [], bajan = [], filas = [], dx = 1, cad = 0, cadR = 1.2, arb = null, arbT = 9, muros = [], bajar = 0;
    function oleadaNueva() {
      filas = []; const cols = 7, nf = Math.min(5, 3 + Math.floor((oleada - 1) / 2));
      for (let f = 0; f < nf; f++) for (let c = 0; c < cols; c++) filas.push({ x: 50 + c * 42, y: 70 + f * 38, f, vivo: true });
      dx = 1; cadR = Math.max(.45, 1.2 - oleada * .1);
    }
    function murosNuevos() { muros = []; [W * .2, W * .5, W * .8].forEach(cx => { for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if (!(j === 2 && (i === 2 || i === 3))) muros.push({ x: cx - 27 + i * 9, y: PY - 58 + j * 9, v: 2 }); }); }
    oleadaNueva(); murosNuevos(); M.lives(vidas); M.score(0);
    M.on('down', x => { px = x; }); M.on('move', x => { px = x; });
    M.fin = sal => M.cerrar({ modo: 'invasion', puntos: Math.round(puntos), bolas: Math.floor(elim / 3) + (oleada - 1) * 5, eliminadas: elim, nivel: oleada, segundos: Math.round(M.t), salida: !!sal }, sal);
    const pierde = () => { vidas--; M.lives(vidas); inv = 1.6; M.shake = .4; M.beep('golpe'); M.flota(px, PY - 20, '¡Te han dado!', C.rojo); if (vidas <= 0) { M.big('Fin'); setTimeout(() => M.fin(false), 400); } };
    function update(dt) {
      if (vidas <= 0) return;
      if (M.held('izq')) px -= 300 * dt; if (M.held('der')) px += 300 * dt;
      px = Math.max(20, Math.min(W - 20, px)); inv = Math.max(0, inv - dt);
      // tiras sola
      cad -= dt; if (cad <= 0 && !tiros.length) { tiros.push({ x: px, y: PY - 18 }); cad = .3; M.beep('tiro'); } // como en la original: un tiro cada vez
      tiros.forEach(t => { t.y -= 520 * dt; });
      // la oleada se mueve en bloque
      const vivos = filas.filter(r => r.vivo), vel = (26 + oleada * 7) * (1 + (1 - vivos.length / Math.max(1, filas.length)) * 1.6);
      let borde = false; vivos.forEach(r => { r.x += dx * vel * dt; if (r.x < 22 || r.x > W - 22) borde = true; });
      if (borde) { dx = -dx; vivos.forEach(r => { r.x = Math.max(22, Math.min(W - 22, r.x)); r.y += 16; }); }
      if (vivos.some(r => r.y > PY - 30)) { vidas = 0; M.lives(0); M.big('¡Te han pasado!'); M.beep('golpe'); setTimeout(() => M.fin(false), 600); return; }
      // las rivales tiran
      bajar -= dt; if (bajar <= 0 && vivos.length) { const cols = {}; vivos.forEach(r => { const k = Math.round(r.x / 10); if (!cols[k] || cols[k].y < r.y) cols[k] = r; }); const L = Object.values(cols), q = L[Math.floor(R() * L.length)]; bajan.push({ x: q.x, y: q.y + 14, v: 170 + oleada * 14 }); bajar = cadR * (.6 + R() * .8); }
      bajan.forEach(b => { b.y += b.v * dt; });
      // árbitro que cruza arriba (premio)
      arbT -= dt; if (arbT <= 0 && !arb) { arb = { x: R() < .5 ? -20 : W + 20 }; arb.v = arb.x < 0 ? 90 : -90; arbT = 12 + R() * 8; }
      if (arb) { arb.x += arb.v * dt; if (arb.x < -30 || arb.x > W + 30) arb = null; }
      // impactos de tus tiros
      tiros.forEach(t => {
        if (t.y < 0) t.ok = true;
        for (const r of vivos) if (!t.ok && Math.abs(t.x - r.x) < 15 && Math.abs(t.y - r.y) < 15) { r.vivo = false; t.ok = true; elim++; const p = (3 - Math.min(2, Math.floor(r.f / 2))) * 10 * oleada; puntos += p; M.chispas(r.x, r.y, C.rival2, 12); M.flota(r.x, r.y, '+' + p); M.beep('bola'); }
        if (!t.ok && arb && Math.abs(t.x - arb.x) < 18 && Math.abs(t.y - 40) < 16) { t.ok = true; puntos += 150 * oleada; M.flota(arb.x, 50, '+' + 150 * oleada, C.oro); M.chispas(arb.x, 40, C.oro, 20); M.beep('gol'); arb = null; }
        for (const m of muros) if (!t.ok && m.v > 0 && Math.abs(t.x - (m.x + 4.5)) < 6 && Math.abs(t.y - (m.y + 4.5)) < 6) { m.v--; t.ok = true; }
      });
      bajan.forEach(b => {
        if (b.y > H) b.ok = true;
        for (const m of muros) if (!b.ok && m.v > 0 && Math.abs(b.x - (m.x + 4.5)) < 6 && Math.abs(b.y - (m.y + 4.5)) < 6) { m.v--; b.ok = true; }
        if (!b.ok && !inv && Math.abs(b.x - px) < 16 && Math.abs(b.y - PY) < 16) { b.ok = true; pierde(); }
      });
      tiros = tiros.filter(t => !t.ok); bajan = bajan.filter(b => !b.ok);
      if (!vivos.some(r => r.vivo)) { oleada++; puntos += 300; M.big('Oleada ' + oleada); M.beep('nivel'); oleadaNueva(); bajan = []; if (oleada % 3 === 1) murosNuevos(); }
      M.score(puntos); M.mu('O' + oleada);
    }
    function draw() {
      pista(M);
      porteria(ctx, W / 2 - 50, GY, 100, 26, true);
      if (arb) { jugadora(ctx, arb.x, 40, 13, '#222', null, 0, false); ctx.fillStyle = '#fff'; ctx.fillRect(arb.x - 9, 36, 18, 3); ctx.fillRect(arb.x - 9, 42, 18, 3); }
      filas.forEach(r => { if (!r.vivo) return; jugadora(ctx, r.x, r.y + Math.sin(M.t * 6 + r.x) * 1.5, 13, r.f < 2 ? C.rival : r.f < 4 ? C.rival2 : '#5a8fd6', null, Math.PI / 2); });
      muros.forEach(m => { if (m.v <= 0) return; ctx.fillStyle = m.v > 1 ? '#ff8a1f' : '#ffc28a'; ctx.fillRect(m.x, m.y, 8.5, 8.5); });
      tiros.forEach(t => bola(ctx, t.x, t.y, 5));
      bajan.forEach(b => bola(ctx, b.x, b.y, 5, C.rival2));
      if (!inv || Math.floor(M.t * 12) % 2) jugadora(ctx, px, PY, 16, C.granate, img, -Math.PI / 2);
    }
    M.correr(update, draw);
  }

  // =====================================================================
  // 5. TETRIS DE HOCKEY: piezas con los colores del club; cada línea limpia, «¡línea!»
  // =====================================================================
  async function tetris(o) {
    const M = marco(o, 'Toca para girar, desliza para mover. Abajo: cae', [['izq', '◀'], ['rota', '⟳'], ['abajo', '▼'], ['cae', '⤓'], ['der', '▶']]);
    const R = rng(o.seed || 1), { ctx, W, H } = M;
    const COLS = 10, ROWS = 20, CS = Math.floor(Math.min((W - 110) / COLS, (H - 20) / ROWS)), OX = 10, OY = Math.round((H - ROWS * CS) / 2);
    const P = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] };
    const COL = { I: '#2f6fd6', O: '#ffcf33', T: '#681825', S: '#2fae6b', Z: '#d93a3a', J: '#24426e', L: '#ff8a1f' };
    const ICO = { I: 'stick', O: 'bola', T: 'casco', S: 'cono', Z: 'cono', J: 'casco', L: 'bola' };
    let tablero = Array.from({ length: ROWS }, () => Array(COLS).fill(null)), bolsa = [], pieza = null, sig = null, caer = 0, puntos = 0, lineas = 0, nivel = 1, limpiando = null, acabado = false;
    const saca = () => { if (!bolsa.length) { bolsa = Object.keys(P); for (let i = bolsa.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]]; } } return bolsa.pop(); };
    // giro a la derecha dentro de su caja (4×4 la I, 3×3 las demás; la O no gira)
    const celdas = p => P[p.t].map(([x, y]) => { let a = x, b = y; const n = p.t === 'I' ? 4 : 3; if (p.t !== 'O') for (let r = 0; r < p.r; r++) [a, b] = [n - 1 - b, a]; return [p.x + a, p.y + b]; });
    const cabe = p => celdas(p).every(([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || !tablero[y][x]));
    const nueva = () => { pieza = { t: sig || saca(), r: 0, x: 3, y: -1 }; sig = saca(); if (!cabe(pieza)) { acabado = true; M.big('Fin'); M.beep('golpe'); setTimeout(() => M.fin(false), 500); } };
    nueva(); M.lives(1, 1); M.score(0);
    const prueba = (dx, dy, dr) => { if (!pieza || limpiando || acabado) return false; const q = { ...pieza, x: pieza.x + dx, y: pieza.y + dy, r: (pieza.r + dr + 4) % 4 }; for (const k of dr ? [0, -1, 1, -2, 2] : [0]) { const q2 = { ...q, x: q.x + k }; if (cabe(q2)) { pieza = q2; return true; } } return false; };
    const fija = () => {
      celdas(pieza).forEach(([x, y]) => { if (y >= 0) tablero[y][x] = pieza.t; });
      if (celdas(pieza).some(([, y]) => y < 0)) { acabado = true; M.big('Fin'); M.beep('golpe'); setTimeout(() => M.fin(false), 500); return; }
      const llenas = tablero.map((f, i) => f.every(Boolean) ? i : -1).filter(i => i >= 0);
      if (llenas.length) { limpiando = { filas: llenas, t: .3 }; M.beep('linea'); const pts = [0, 40, 100, 300, 800][llenas.length] * nivel; puntos += pts; M.flota(OX + COLS * CS / 2, OY + llenas[0] * CS, (llenas.length === 4 ? '¡Póquer! ' : '¡Línea! ') + '+' + pts, llenas.length === 4 ? C.oro : C.granate); if (llenas.length === 4) M.big('¡Póquer!'); llenas.forEach(i => M.chispas(OX + COLS * CS / 2, OY + i * CS + CS / 2, C.oro, 14)); }
      else { M.beep('cae'); nueva(); }
    };
    const baja = () => { if (!prueba(0, 1, 0) && pieza && !limpiando && !acabado) fija(); };
    const tirar = () => { if (!pieza || limpiando || acabado) return; let n = 0; while (prueba(0, 1, 0)) n++; puntos += n * 2; fija(); M.shake = .1; };
    const accion = (k, rep) => { if (k === 'izq') prueba(-1, 0, 0); else if (k === 'der') prueba(1, 0, 0); else if (k === 'abajo') { if (prueba(0, 1, 0)) puntos += 1; } else if (k === 'rota' || k === 'arriba' || k === 'accion') { if (!rep && prueba(0, 0, 1)) M.beep('toque'); } else if (k === 'cae' && !rep) tirar(); };
    M.on('key', k => accion(k === 'arriba' ? 'rota' : k === 'accion' ? 'cae' : k)); M.on('pad', accion);
    let arr = null, movido = false;
    M.on('tap', () => { if (!movido) accion('rota'); });
    M.on('down', x => { arr = { x, n: 0 }; movido = false; }); M.on('move', x => { if (!arr) return; const d = Math.trunc((x - arr.x) / CS) - arr.n; if (d) { for (let i = 0; i < Math.abs(d); i++) prueba(Math.sign(d), 0, 0); arr.n += d; arr.mov = true; } });
    M.on('up', () => { movido = !!(arr && arr.mov); arr = null; }); M.on('swipe', d => { if (d === 'abajo') tirar(); });
    M.fin = sal => M.cerrar({ modo: 'tetris', puntos: Math.round(puntos), bolas: lineas * 2, lineas, nivel, segundos: Math.round(M.t), salida: !!sal }, sal);
    function update(dt) {
      if (acabado) return;
      if (limpiando) { limpiando.t -= dt; if (limpiando.t <= 0) { const L = limpiando.filas; tablero = tablero.filter((_, i) => !L.includes(i)); while (tablero.length < ROWS) tablero.unshift(Array(COLS).fill(null)); lineas += L.length; const nv = 1 + Math.floor(lineas / 10); if (nv > nivel) { nivel = nv; M.big('Nivel ' + nivel); M.beep('nivel'); } limpiando = null; nueva(); } return; }
      caer += dt * (M.held('abajo') ? 8 : 1); const v = Math.max(.08, .8 * Math.pow(.85, nivel - 1)); if (caer >= v) { caer = 0; baja(); }
      M.score(puntos); M.mu(lineas + ' líneas');
    }
    function bloque(x, y, t, a = 1) {
      const X = OX + x * CS, Y = OY + y * CS; ctx.globalAlpha = a;
      rect(ctx, X + 1, Y + 1, CS - 2, CS - 2, 4); ctx.fillStyle = COL[t]; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(X + 3, Y + 3, CS - 6, 3); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(X + 3, Y + CS - 5, CS - 6, 2);
      const c = ICO[t], mx = X + CS / 2, my = Y + CS / 2; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
      if (c === 'bola') { ctx.beginPath(); ctx.arc(mx, my, CS * .16, 0, 6.283); ctx.fill(); }
      else if (c === 'stick') { ctx.beginPath(); ctx.moveTo(mx - CS * .2, my - CS * .2); ctx.lineTo(mx + CS * .1, my + CS * .15); ctx.quadraticCurveTo(mx + CS * .22, my + CS * .25, mx + CS * .25, my + CS * .1); ctx.stroke(); }
      else if (c === 'cono') { ctx.beginPath(); ctx.moveTo(mx, my - CS * .2); ctx.lineTo(mx + CS * .15, my + CS * .15); ctx.lineTo(mx - CS * .15, my + CS * .15); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(mx, my + 1, CS * .18, Math.PI, 0); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    function draw() {
      ctx.fillStyle = '#2a1218'; ctx.fillRect(0, 0, W, H);
      rect(ctx, OX - 4, OY - 4, COLS * CS + 8, ROWS * CS + 8, 8); ctx.fillStyle = C.pista; ctx.fill();
      ctx.strokeStyle = C.linea; ctx.lineWidth = 1; for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(OX + x * CS, OY); ctx.lineTo(OX + x * CS, OY + ROWS * CS); ctx.stroke(); }
      for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(OX, OY + y * CS); ctx.lineTo(OX + COLS * CS, OY + y * CS); ctx.stroke(); }
      tablero.forEach((f, y) => f.forEach((t, x) => { if (t) bloque(x, y, t, limpiando && limpiando.filas.includes(y) ? .3 + Math.abs(Math.sin(M.t * 30)) * .7 : 1); }));
      if (pieza && !limpiando && !acabado) {
        let g = { ...pieza }; while (cabe({ ...g, y: g.y + 1 })) g.y++;
        celdas(g).forEach(([x, y]) => { if (y >= 0) bloque(x, y, pieza.t, .22); });
        celdas(pieza).forEach(([x, y]) => { if (y >= 0) bloque(x, y, pieza.t); });
      }
      // lado: la siguiente, nivel y líneas
      const SX = OX + COLS * CS + 14; ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('SIGUIENTE', SX, OY + 12);
      rect(ctx, SX, OY + 20, 80, 60, 8); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
      if (sig) { const ox = OX, oy = OY, cs = CS; P[sig].forEach(([x, y]) => { const X = SX + 12 + x * cs * .6, Y = OY + 34 + y * cs * .6; rect(ctx, X, Y, cs * .6 - 2, cs * .6 - 2, 3); ctx.fillStyle = COL[sig]; ctx.fill(); }); void ox; void oy; }
      ctx.fillStyle = '#fff'; ctx.fillText('NIVEL', SX, OY + 108); ctx.font = '800 22px system-ui'; ctx.fillText(String(nivel), SX, OY + 132);
      ctx.font = '700 12px system-ui'; ctx.fillText('LÍNEAS', SX, OY + 162); ctx.font = '800 22px system-ui'; ctx.fillText(String(lineas), SX, OY + 186);
    }
    M.correr(update, draw);
  }

  const MODOS = { muro, cruza, conduce, invasion, tetris };
  const jugar = o => (MODOS[o.modo] || muro)(o);
  window.SMBArcade = { jugar, JUEGOS, MODOS: Object.keys(MODOS), _rng: rng };
})();
