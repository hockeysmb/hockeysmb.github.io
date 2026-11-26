// cuatro jugadores y un portero por equipo
const RINK = { A: [[112, 58], [112, 142], [170, 82], [170, 118]], B: [[288, 58], [288, 142], [230, 82], [230, 118]], gA: [32, 100], gB: [368, 100], shift: 80 };
const PLANETS = {
  mercurio: ['#b9b3ab', '#7d766d'], tierra: ['#4db8ff', '#1f6fb5', '#5cc46a'], marte: ['#e0643a', '#9c3a1b'], jupiter: ['#e8c39a', '#b98458', '#d08a5a'], saturno: ['#efd59a', '#c8a15a'],
};
// una ficha: clásica (número), dorsal, dibujo (emoji) o planeta; el portero lleva máscara
function fichaSVG(it, i, x, y, team, gk) {
  const r = gk ? 12 : 11, num = gk ? 1 : i + 2;
  const ring = `<circle cx="${x}" cy="${y + 1.5}" r="${r}" class="tk-sh"/>`;
  if (it && it.sym) {
    const sym = it.sym[gk ? 4 : i % 4];
    if (it.id === 'fic-numeros') return `${ring}<circle cx="${x}" cy="${y}" r="${r}" class="tk-b ${team}"/><text x="${x}" y="${y + 4}" class="tk-n big">${esc(sym)}</text>`;
    const art = FLU3D[sym];
    return `${ring}<circle cx="${x}" cy="${y}" r="${r + 1}" class="tk-ring ${team}"/>${art ? `<image href="${art}" x="${x - 12}" y="${y - 15}" width="24" height="24"/>` : `<text x="${x}" y="${y + 5}" class="tk-e">${sym}</text>`}`;
  }
  if (it && it.planets) {
    const k = it.planets[gk ? 4 : i % 4], c = PLANETS[k], gid = `pl-${k}`;
    const body = `<circle cx="${x}" cy="${y}" r="${r - 1}" fill="${c[0]}"/>${k === 'jupiter' ? `<path d="M${x - 9},${y - 3}h18M${x - 10},${y + 2}h20M${x - 8},${y + 6}h16" stroke="${c[2]}" stroke-width="2"/>` : ''}${k === 'tierra' ? `<path d="M${x - 5},${y - 6} q5,3 2,8 q-4,2 -3,6 M${x + 3},${y - 2} q4,1 3,6" stroke="${c[2]}" stroke-width="3" fill="none" stroke-linecap="round"/>` : ''}<circle cx="${x - 3}" cy="${y - 3}" r="${r - 5}" fill="#fff" opacity=".18"/>`;
    const ring2 = k === 'saturno' ? `<ellipse cx="${x}" cy="${y}" rx="${r + 5}" ry="4" fill="none" stroke="${c[1]}" stroke-width="2.5" transform="rotate(-20 ${x} ${y})"/>` : '';
    return `${ring}<circle cx="${x}" cy="${y}" r="${r + 1}" class="tk-ring ${team}"/>${body}${ring2}`;
  }
  return `${ring}<circle cx="${x}" cy="${y}" r="${r}" class="tk-b ${team}"/>${gk ? `<rect x="${x - 7}" y="${y - 3}" width="14" height="6" rx="2" class="tk-mask"/>` : `<text x="${x}" y="${y + 4}" class="tk-n">${num}</text>`}<path d="M${x + (team === 'a' ? 8 : -8)},${y + 6} l${team === 'a' ? 7 : -7},7 h${team === 'a' ? 5 : -5}" class="tk-stick"/>`;
}
function rinkSVG(fa, fb) {
  const A = estItem(fa), B = estItem(fb);
  const tok = (team, it, [x, y], i, gk) => `<g class="tk ${team}${gk ? ' gk' : ''}">${fichaSVG(it, i, x, y, team, gk)}</g>`;
  return `<svg class="lv-svg" viewBox="0 0 400 200" role="img" aria-label="Pista de hockey"><defs><linearGradient id="bal-rb" x1="0" x2="1"><stop offset="0" stop-color="#ff4d4d"/><stop offset=".25" stop-color="#ffb84d"/><stop offset=".5" stop-color="#f4f04d"/><stop offset=".75" stop-color="#4db8ff"/><stop offset="1" stop-color="#a64dff"/></linearGradient>
      <radialGradient id="rk-glow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect x="3" y="3" width="394" height="194" rx="34" class="rk-floor"/><rect x="3" y="3" width="394" height="194" rx="34" fill="url(#rk-glow)"/>
    <rect x="1.5" y="1.5" width="397" height="197" rx="35" class="rk-boards"/>
    <text x="200" y="112" class="rk-logo">SMB</text>
    <g class="rk-l"><line x1="200" y1="3" x2="200" y2="197"/><circle cx="200" cy="100" r="26"/><circle cx="200" cy="100" r="2.5" class="rk-dot"/>
      <rect x="14" y="52" width="58" height="96"/><rect x="328" y="52" width="58" height="96"/>
      <circle cx="78" cy="100" r="2.5" class="rk-dot"/><circle cx="322" cy="100" r="2.5" class="rk-dot"/></g>
    <rect x="16" y="88" width="10" height="24" class="rk-goal" id="lv-goal-a"/><rect x="374" y="88" width="10" height="24" class="rk-goal" id="lv-goal-b"/>
    <g class="lv-team ta" id="lv-ta">${RINK.A.map((p, i) => tok('a', A, p, i, false)).join('')}</g>${tok('a', A, RINK.gA, 0, true)}
    <g class="lv-team tb" id="lv-tb">${RINK.B.map((p, i) => tok('b', B, p, i, false)).join('')}</g>${tok('b', B, RINK.gB, 0, true)}
    <g class="lv-ballg" id="lv-ball" style="transform:translate(200px,100px)"><circle r="6" cx="0" cy="0" class="lv-ball"/><circle r="2" cx="-2" cy="-2" fill="#fff" opacity=".7"/></g>
  </svg>`;
}
// ---------- retar: 3 retos gratis al día; luego cuesta monedas ----------
function retosHoy() { const r = game.retos || {}; return r.d === isoToday() ? r.n || 0 : 0; }
function retar(rival) {
  const me = readAuthor(); if (!me) { toast('Antes, pon tu nombre en Mi cuenta.'); navigate('perfil'); return; }
  if (normName(rival) === normName(me)) return;
  const n = retosHoy(), go = () => { game.retos = { d: isoToday(), n: n + 1 }; saveGame(); startReto(rival); };
  if (n < RETOS_GRATIS) { go(); return; }
  const bal = balance();
  if (bal < PRECIO_RETO) { openModal(`<h2>Hoy ya has hecho ${n} retos</h2><p>Los ${RETOS_GRATIS} primeros de cada día son gratis; los demás cuestan ${PRECIO_RETO} monedas y tienes ${bal}. Crea ejercicios o prepara sesiones para ganar más.</p><div class="row"><button class="btn primary" id="m-no" type="button">Entendido</button></div>`); modalCard.querySelector('#m-no').onclick = closeModal; return; }
  confirmModal(`¿Reto número ${n + 1} de hoy?`, `Los ${RETOS_GRATIS} primeros de cada día son gratis. Este cuesta ${PRECIO_RETO} monedas: te quedarán ${bal - PRECIO_RETO}.`, `Retar · ${PRECIO_RETO} monedas`, () => { game.spent += PRECIO_RETO; go(); });
}
const pizarraDe = name => { const c = coachOf(name), pz = normName(name) === normName(readAuthor()) ? game.pizarra : c && c.pizarra; return pz ? planDePizarra(pz, 'pz|' + name + '|' + Date.now()) : null; };
function startReto(rival) {
  const me = readAuthor(), id = 'am-' + Date.now().toString(36) + uid().slice(0, 4);
  const PA = amPlayer(me, true), PB = amPlayer(rival, false);
  const CL = window.SMB_CLOUD, c = coachOf(rival), myUid = CL && CL.match && CL.match.me();
  const cfg = { id, PA, PB, side: 'a', rivalPlan: pizarraDe(rival) || planAzar(id + '|rv') };
  if (CL && CL.match && c && c.uid && myUid && c.uid !== myUid) {
    cfg.online = { uid: c.uid };
    CL.match.create({ id, a: myUid, b: c.uid, an: PA.name, bn: PB.name, pA: JSON.stringify(PA), pB: JSON.stringify(PB), estado: 'invitado' }).catch(() => {});
  }
  openMatch(cfg);
}
// el rival acepta un reto en directo (lo llama la capa web)
function acceptReto(m) {
  const cfg = { id: m.id, PA: JSON.parse(m.pA), PB: JSON.parse(m.pB), side: 'b', online: { uid: m.a, accepted: true } };
  window.SMB_CLOUD.match.update(m.id, { estado: 'jugando' }).catch(() => {});
  openMatch(cfg);
}
function inviteReto(m) {
  if (document.getElementById('live')) return;
  openModal(`<h2>${esc(m.an)} te reta en directo</h2><p>Amistoso a la vez: 8 posesiones y en cada una elegís a la vez. Si dices que no, juega contra tu pizarra.</p>
    <div class="row"><button class="btn" id="m-no" type="button">Ahora no</button><button class="btn primary" id="m-ok" type="button">Aceptar</button></div>`);
  modalCard.querySelector('#m-no').onclick = () => { closeModal(); window.SMB_CLOUD.match.update(m.id, { estado: 'rechazado' }).catch(() => {}); };
  modalCard.querySelector('#m-ok').onclick = () => { closeModal(); acceptReto(m); };
}
function saveAmResult(x, mySide) {
  const me = readAuthor(), d = x.r, rival = mySide === 'a' ? d.b.name : d.a.name;
  if (normName(d.win) === normName(me) && amCoinsToday() < AM_DAY) { game.log.push({ key: 'am:' + isoToday() + ':' + x.id, pts: PTS_AM, why: 'Amistoso ganado a ' + rival, date: isoToday() }); x.coins = PTS_AM; }
  if (normName(d.win) === normName(me) && cofreGrant('am:' + isoToday(), 'primer amistoso ganado hoy', true)) x.cofre = true;
  game.amis = [...(game.amis || []).filter(y => y.id !== x.id), x].slice(-20);
  clFatigue();
  saveGame();
}

// ---------- partidos antiguos (tres jugadas): solo para ver las repeticiones ----------
function openMatchV2(cfg) {
  closeLive(false);
  const replay = cfg.replay || null, mySide = cfg.side || 'a', me = normName(readAuthor());
  const id = replay ? replay.id : cfg.id;
  const d0 = replay ? replay.r : playDuel(cfg.PA, cfg.PB, id);
  const A = d0.a.name, B = d0.b.name, rivalName = mySide === 'a' ? B : A;
  const R = rng(id + '|narra'), pick = arr => arr[Math.floor(R() * arr.length)];
  const pw = p => `${esc(poderOf(p.poder).n)}${p.uses !== p.poder ? ` (copia ${esc(poderOf(p.uses).n)})` : ''}`;
  const el = document.createElement('div'); el.id = 'live'; el.className = 'live';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Amistoso: ${A} contra ${B}`);
  const tagTxt = replay ? 'Amistoso · repetición' : cfg.online ? 'Amistoso · a la vez' : 'Amistoso · en directo';
  el.innerHTML = `<div class="lv-in">
    <div class="lv-top"><span class="lv-tag"><i class="lv-rec" aria-hidden="true"></i><span id="lv-tag">${tagTxt}</span></span><button class="lv-x" type="button" data-lv="close" aria-label="Cerrar">×</button></div>
    <div class="lv-board">
      <div class="lv-p"><span class="duel-av">${avatarSVG(normName(A) === me ? game.av : (coachOf(A) || {}).avatar, d0.a.lvl)}</span><b class="lv-na">${esc(A)}</b><small>+${d0.a.lvl} · ${pw(d0.a)}</small></div>
      <div class="lv-mid"><output class="lv-score" id="lv-score">0–0</output><span class="lv-clock" id="lv-clock">Calentamiento</span></div>
      <div class="lv-p"><span class="duel-av">${avatarSVG(normName(B) === me ? game.av : (coachOf(B) || {}).avatar, d0.b.lvl)}</span><b class="lv-nb">${esc(B)}</b><small>+${d0.b.lvl} · ${pw(d0.b)}</small></div>
    </div>
    <div class="lv-rink">${rinkSVG()}<div class="lv-flash" id="lv-flash" aria-hidden="true"></div></div>
    <div class="lv-dice"><div class="lv-die"><span class="die a" id="lv-da">·</span><small id="lv-ca">&nbsp;</small></div><span class="lv-phase" id="lv-phase">Saque inicial</span><div class="lv-die"><span class="die b" id="lv-db">·</span><small id="lv-cb">&nbsp;</small></div></div>
    <div class="lv-act" id="lv-act"></div>
    <ol class="lv-feed" id="lv-feed" aria-live="polite"></ol>
    <div class="lv-skip"><button class="btn small ghost" type="button" data-lv="skip">Sin animaciones</button></div>
  </div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  const $ = q => el.querySelector('#' + q);
  const ball = $('lv-ball'), feed = $('lv-feed'), flash = $('lv-flash'), ta = $('lv-ta'), tb = $('lv-tb');
  let instant = false, ga = 0, gb = 0, closed = false;
  const say = (min, txt, cls) => { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = `<span class="lv-min">${esc(min)}</span><span>${txt}</span>`; feed.prepend(li); };
  const ballTo = pt => { ball.style.transform = `translate(${pt[0]}px,${pt[1]}px)`; };
  const shift = s => { ta.style.transform = s === 'a' ? `translateX(${RINK.shift}px)` : s === 'b' ? 'translateX(-40px)' : ''; tb.style.transform = s === 'b' ? `translateX(-${RINK.shift}px)` : s === 'a' ? 'translateX(40px)' : ''; };
  const pos = (s, i) => { const p = (s === 'a' ? RINK.A : RINK.B)[i]; return [p[0] + (s === 'a' ? RINK.shift : -RINK.shift), p[1]]; };
  const calc = (p, i) => `dado ${p.r && p.r[i] !== p.d[i] ? `${p.r[i]} (cuenta ${p.d[i]})` : p.d[i]}${p.lvl ? ` + nivel ${p.lvl}` : ''}${p.e[i] ? ` ${p.e[i] > 0 ? '+' : '−'} ${Math.abs(p.e[i])}` : ''} = <b>${p.t[i]}</b>`;
  const lastDice = {};
  const spin = (n, fin, cls) => { lastDice[n] = fin; const e = $(n); e.className = 'die ' + cls; if (instant) { e.textContent = fin; return; } e.classList.add('roll'); let k = 0; const iv = setInterval(() => { e.textContent = 1 + Math.floor(Math.random() * 10); if (++k > 9) { clearInterval(iv); e.textContent = fin; e.classList.remove('roll'); } }, 80); liveT.push(iv); };
  const goal = s => { if (instant) return; flash.textContent = '¡GOL!'; flash.className = 'lv-flash on ' + s; const g = $(s === 'a' ? 'lv-goal-b' : 'lv-goal-a'); g.classList.add('hit'); goalFx(document.querySelector('#live .lv-rink'), s, $('lv-score'), document.querySelectorAll('#live .lv-p')[s === 'a' ? 0 : 1]); liveT.push(setTimeout(() => { flash.className = 'lv-flash'; g.classList.remove('hit'); }, 1300)); };
  const BUILD = {
    presion: ['{W} muerde arriba: presión alta, robo en campo contrario.', 'Defensa presionante de {W}: el rival no puede ni girarse.'],
    directo: ['Recupera {W} y sale directo: dos pases y ya está en el área.', 'Ataque directo de {W}, sin pausa, en vertical.'],
    garra: ['{W} no da ninguna bola por perdida.', 'Bola dividida en la valla y la gana {W} a base de garra.'],
    lectura: ['{W} lee la jugada antes que nadie y se adelanta al pase.', '{W} ve el hueco que nadie más ve.'],
    leyenda: ['{W} juega como entrena: postura baja, patinaje limpio.', 'Jugada de manual de {W}: fija, pasa y aparece.'],
    jJ: ['{W} mueve la bola con paciencia, fija y encuentra el hueco.', 'Circulación de {W} por fuera y pase interior al pasillo central.'],
    jA: ['{W} duerme el partido: posesión larga y al final, la ocasión.'],
    jD: ['Recupera {W} y sale directo: dos pases y ya está en el área.', 'Ataque directo de {W}: robo, vertical y remate.'],
    jP: ['{W} muerde arriba: presión alta y el rival no puede ni girarse.', 'Defensa presionante de {W}: robo en campo contrario.'],
    jZ: ['{W} cierra la zona, roba en su campo y sale con ventaja.'],
    jT: ['¡Tengo arriba! El defensa de {W} sale como loco a robar… ¡y la roba!'],
    x: ['{W} mueve la bola por fuera y busca el pasillo central.', 'Pared en la frontal y {W} encara al portero.', '{W} gana la espalda a la defensa con un pase largo.', 'Bola dividida en el centro de la pista: se la lleva {W}.'],
  };
  const GOAL = ['¡Gol de {W}! A la escuadra.', '¡Dentro! {W} define por bajo, entre las piernas del portero.', '¡Gol de {W}! Disparo seco desde la frontal.', '¡Gol! {W} remata el rechace.'];
  const NONE = ['Llegan los dos y nadie acierta: paradón y bola fuera.', '¡Al palo! Se queda como estaba.', 'El portero se hace enorme. Nadie marca.'];
  const CLOSED = ['Partido cerrado: nadie arriesga y la bola muere en el centro.', 'Posesión larga, ninguna ocasión. Sigue igual.'];
  const MIN = [8 + Math.floor(R() * 12), 27 + Math.floor(R() * 14), 49];
  // reproductor por tramos: cada tramo es una lista de pasos con su espera
  let cur = [], curDone = null;
  const finishCur = () => { cur.forEach(c => { if (!c.done) { c.done = true; c.fn(); } }); const dn = curDone; curDone = null; if (dn) dn(); };
  const play = (steps, done) => {
    cur = steps.map(s => ({ fn: s.fn, done: false })); curDone = done || null;
    if (instant) { finishCur(); return; }
    let t = 0; steps.forEach((s, k) => { t += s.dt; liveT.push(setTimeout(() => { const c = cur[k]; if (c && !c.done) { c.done = true; c.fn(); } }, t)); });
    liveT.push(setTimeout(() => { if (curDone) finishCur(); }, t + 40));
  };
  const seg = () => { const S = []; S.at = (dt, fn) => S.push({ dt, fn }); return S; };
  function segIntro() { const S = seg(); S.at(300, () => say("0'", replay ? `Repetición del amistoso entre <b>${esc(A)}</b> y <b>${esc(B)}</b>.` : `Empieza el amistoso: <b>${esc(A)}</b> reta a <b>${esc(B)}</b>.`)); return S; }
  function segJugada(d, i) {
    const S = seg();
    const w = golDe(d, i), att = w || (R() < .5 ? 'a' : 'b'), W = att === 'a' ? A : B, P = att === 'a' ? d.a : d.b;
    const via = pick([0, 1]), path = [pos(att, via), pos(att, 2 + pick([0, 1]))];
    S.at(700, () => { $('lv-clock').textContent = MIN[i] + "'"; $('lv-phase').textContent = PARTES[i]; $('lv-da').textContent = '·'; $('lv-db').textContent = '·'; $('lv-ca').innerHTML = '&nbsp;'; $('lv-cb').innerHTML = '&nbsp;'; ballTo([200, 100]); shift(null);
      say(MIN[i] + "'", i === 0 ? pick(['Arranca el partido.', 'Saque inicial. Primeras piernas.']) : i === 1 ? pick(['Empieza la segunda parte.', 'Vuelven del descanso con ganas.']) : 'Último minuto. Todo o nada.'); });
    if ((d.a.o || [])[i] || (d.b.o || [])[i]) S.at(600, () => say(MIN[i] + "'", `<em>Pizarra: ${esc(A)} juega «${esc(ordenN(d.a.o[i]) || '—')}» · ${esc(B)} juega «${esc(ordenN(d.b.o[i]) || '—')}».</em>`, 'pw'));
    (d.ev || []).filter(e => e.i === i && e.k === 'azul').forEach(e => S.at(600, () => say(MIN[i] + "'", `<em>${esc(evText(d, e))}</em>`, 'pw')));
    [d.a, d.b].forEach(p => { if (p.note[i]) S.at(500, () => say(MIN[i] + "'", `<em>${esc(p.name)}: ${esc(p.note[i])}</em>`, 'pw')); });
    S.at(500, () => { spin('lv-da', d.a.r ? d.a.r[i] : d.a.d[i], 'a'); spin('lv-db', d.b.r ? d.b.r[i] : d.b.d[i], 'b'); });
    S.at(1000, () => { $('lv-ca').innerHTML = calc(d.a, i); $('lv-cb').innerHTML = calc(d.b, i); shift(att); const key = w && P.o && BUILD['j' + P.o[i]] && R() < .7 ? 'j' + P.o[i] : (BUILD[P.uses] && P.note[i] ? P.uses : 'x'); say(MIN[i] + "'", pick(BUILD[key] || BUILD.x).replace('{W}', `<b>${esc(W)}</b>`)); });
    S.at(600, () => ballTo(path[0]));
    S.at(600, () => ballTo(path[1]));
    S.at(600, () => ballTo(w ? (att === 'a' ? [380, 100] : [20, 100]) : (att === 'a' ? [356, 112] : [44, 112])));
    S.at(500, () => {
      if (w) { if (w === 'a') ga++; else gb++; $('lv-score').textContent = `${ga}–${gb}`; goal(w); say(MIN[i] + "'", `${pick(GOAL).replace('{W}', `<b>${esc(W)}</b>`)} <b>${ga}–${gb}</b>`, 'gol'); }
      else { ballTo(att === 'a' ? [300, 150] : [100, 150]); say(MIN[i] + "'", pick(d.a.o && (d.a.o[i] === 'A' || d.b.o[i] === 'A') ? CLOSED : NONE)); }
    });
    (d.ev || []).filter(e => e.i === i && e.k !== 'azul').forEach(e => {
      const right = e.s === 'a', spot = e.k === 'penalti' ? (right ? [322, 100] : [78, 100]) : (right ? [300, 70] : [100, 70]);
      S.at(1200, () => { shift(null); ballTo(spot); say(MIN[i] + "'", `${EV_TXT[e.k]} a favor de <b>${esc(e.s === 'a' ? A : B)}</b>.`); });
      S.at(900, () => { ballTo(e.gol ? (right ? [380, 100] : [20, 100]) : (right ? [358, 92] : [42, 92]));
        if (e.gol) { if (e.s === 'a') ga++; else gb++; $('lv-score').textContent = `${ga}–${gb}`; goal(e.s); }
        say(MIN[i] + "'", `${esc(evText(d, e))} <b>${ga}–${gb}</b>`, e.gol ? 'gol' : ''); });
    });
    S.at(700, () => {});
    return S;
  }
  function segEnd(d, x) {
    const S = seg();
    if (d.pen) {
      S.at(500, () => { $('lv-clock').textContent = 'Penaltis'; $('lv-phase').textContent = 'Penaltis'; shift(null); say("50'", `Empate a ${d.ga}. <b>Penaltis</b>: un dado cada uno hasta que uno saque más.`); });
      d.pens.forEach(([pa, pb], k) => {
        S.at(700, () => { ballTo([322, 100]); spin('lv-da', pa, 'a'); spin('lv-db', pb, 'b'); $('lv-ca').innerHTML = `penalti ${k + 1}`; $('lv-cb').innerHTML = `penalti ${k + 1}`; });
        S.at(1000, () => { const sw = pa > pb ? 'a' : pb > pa ? 'b' : null; ballTo(sw === 'b' ? [20, 100] : [380, 100]); if (sw) goal(sw);
          say('Pen.', sw ? `<b>${esc(sw === 'a' ? A : B)}</b> marca (${pa}–${pb}) y su rival falla.` : `Los dos marcan (${pa}–${pb}). Otro.`, sw ? 'gol' : ''); });
      });
    }
    S.at(800, () => {
      $('lv-score').textContent = scoreTxt(d); $('lv-clock').textContent = 'Final'; $('lv-phase').textContent = 'Final'; shift(null); ballTo([200, 100]);
      const meIn = normName(A) === me || normName(B) === me, won = normName(d.win) === me;
      say('Final', `Final: <b>${esc(d.win)}</b> gana ${scoreTxt(d)}.`, 'fin');
      $('lv-act').innerHTML = `<p class="lv-res">${meIn ? (won ? `<b>¡Has ganado!</b>${x && x.coins ? ` +${x.coins} monedas.` : ''}` : `<b>Has perdido.</b> Pide la revancha.`) : `<b>Gana ${esc(d.win)}</b>`}</p>
        <div class="row">${meIn ? `<button class="btn" type="button" data-lv="rev" data-name="${esc(rivalName)}">Revancha</button>` : ''}<button class="btn primary" type="button" data-lv="close">Cerrar</button></div>`;
      if (!replay && x && x.coins && !instant) toast(`+${x.coins} monedas · Amistoso ganado`);
    });
    return S;
  }
  // ---- decisiones del míster ----
  const myPlan = { o: [], charla: -1, estrella: -1 }, rivPicks = {};
  let rivPlan = cfg.online ? null : (cfg.rivalPlan || null);
  const planOf = side => side === mySide ? myPlan : (rivPlan || { o: [0, 1, 2].map(i => (rivPicks[i] || {}).o || ''), charla: [0, 1, 2].find(i => (rivPicks[i] || {}).c) ?? -1, estrella: [0, 1, 2].find(i => (rivPicks[i] || {}).e) ?? -1 });
  const duelNow = () => playDuel(Object.assign({}, cfg.PA, { plan: planOf('a') }), Object.assign({}, cfg.PB, { plan: planOf('b') }), id);
  let sel = { o: '', c: false, e: false };
  function promptHTML(i, wait) {
    if (wait) return `<p class="lv-wait">Esperando a que ${esc(rivalName.split(' ')[0])} elija…</p><div class="row"><button class="btn small ghost" type="button" data-lv="vspiz">Jugar contra su pizarra</button></div>`;
    const canE = myPlan.estrella < 0 && balance() >= PRECIO_ESTRELLA, canC = myPlan.charla < 0;
    const usedT = myPlan.o.includes('T');
    return `<p class="lv-q"><b>${esc(PARTES[i])}:</b> ¿qué jugada pides? <span class="sub">Vais ${ga}–${gb}${mySide === 'b' ? ' (tú, a la derecha)' : ''}.</span></p>
      <div class="lv-ord">${['Con bola', 'Sin bola'].map(c => `<span class="lv-grp">${c}</span>${JUGADAS.filter(j => j.c === c).map(j => `<button class="lv-o" type="button" data-lv-o="${j.id}" aria-pressed="${sel.o === j.id}"${j.id === 'T' && usedT ? ' disabled' : ''}><b>${esc(j.n)}</b><span class="dz">Dado ${esc(j.dado)}</span><small>${esc(j.id === 'T' && usedT ? 'Ya la has usado en este partido.' : j.d)}</small></button>`).join('')}`).join('')}</div>
      <div class="lv-cards"><button class="chip" type="button" data-lv-card="c" aria-pressed="${sel.c}"${canC ? '' : ' disabled'}>Charla motivacional · +2${canC ? '' : ' (usada)'}</button>
        <button class="chip" type="button" data-lv-card="e" aria-pressed="${sel.e}"${canE || sel.e ? '' : ' disabled'}>Jugador estrella · ${PRECIO_ESTRELLA} monedas${myPlan.estrella >= 0 ? ' (usada)' : balance() < PRECIO_ESTRELLA ? ' (no te llega)' : ''}</button></div>
      <div class="row"><button class="btn primary" type="button" data-lv="go"${sel.o ? '' : ' disabled'}>${sel.o ? `Jugar la ${i === 0 ? '1ª parte' : i === 1 ? '2ª parte' : 'última jugada'}` : 'Elige una jugada'}</button></div>`;
  }
  let step = 0, waiting = false, unsub = null, fallbackT = null, finished = false;
  const showPrompt = () => { sel = { o: '', c: false, e: false }; $('lv-act').innerHTML = promptHTML(step, false); };
  function runJugada(i) {
    const d = duelNow();
    $('lv-act').innerHTML = '';
    play(segJugada(d, i), () => { if (i < 2) { step = i + 1; showPrompt(); } else finish(d); });
  }
  function finish(d) {
    if (finished) return; finished = true;
    const x = { id, ts: Date.now(), fecha: isoToday(), r: d };
    saveAmResult(x, mySide);
    if (cfg.online && window.SMB_CLOUD) window.SMB_CLOUD.match.update(id, { estado: 'fin' }).catch(() => {});
    if (unsub) { unsub(); unsub = null; }
    play(segEnd(d, x));
  }
  const tryResolve = () => { if (waiting && rivPicks[step]) { waiting = false; clearTimeout(fallbackT); runJugada(step); } };
  function vsPizarra() {
    if (rivPlan) return;
    rivPlan = pizarraDe(rivalName) || planAzar(id + '|rv');
    [0, 1, 2].forEach(i => { if (rivPicks[i]) rivPlan.o[i] = rivPicks[i].o; });
    $('lv-tag').textContent = 'Amistoso · contra su pizarra';
    if (cfg.online && window.SMB_CLOUD) window.SMB_CLOUD.match.update(id, { estado: 'pizarra' }).catch(() => {});
    if (unsub) { unsub(); unsub = null; }
    if (waiting) { waiting = false; clearTimeout(fallbackT); runJugada(step); }
  }
  function choose() {
    myPlan.o[step] = sel.o; if (sel.c) myPlan.charla = step; if (sel.e) { myPlan.estrella = step; game.spent += PRECIO_ESTRELLA; saveGame(); }
    if (!cfg.online || rivPlan) { runJugada(step); return; }
    window.SMB_CLOUD.match.update(id, { [mySide + step]: `${sel.o}|${sel.c ? 1 : 0}|${sel.e ? 1 : 0}` }).catch(() => {});
    waiting = true; $('lv-act').innerHTML = promptHTML(step, true);
    fallbackT = setTimeout(() => { if (waiting) vsPizarra(); }, 60000);
    tryResolve();
  }
  // ---- arranque según el modo ----
  if (replay) {
    const d = replay.r, steps = [...segIntro(), ...[0, 1, 2].flatMap(i => segJugada(d, i)), ...segEnd(d, replay)];
    $('lv-act').innerHTML = '';
    play(steps);
  } else if (cfg.online) {
    const other = mySide === 'a' ? 'b' : 'a';
    unsub = window.SMB_CLOUD.match.listen(id, m => {
      if (!m || closed) return;
      [0, 1, 2].forEach(i => { const v = m[other + i]; if (v && !rivPicks[i]) { const [o, c, e] = v.split('|'); rivPicks[i] = { o, c: c === '1', e: e === '1' }; } });
      if (mySide === 'a' && step === 0 && !cfg.online.accepted) {
        if (m.estado === 'jugando') { cfg.online.accepted = true; $('lv-tag').textContent = 'Amistoso · a la vez'; say("0'", `<b>${esc(B)}</b> acepta el reto. ¡A jugar a la vez!`); showPrompt(); }
        else if (m.estado === 'rechazado') { say("0'", `${esc(B)} no puede ahora: juegas contra su pizarra.`); vsPizarra(); showPrompt(); }
      }
      if (m.estado === 'pizarra' && !rivPlan && mySide === 'b') { say("—", `${esc(A)} se ha ido: el partido sigue contra su pizarra.`); rivPlan = pizarraDe(A) || planAzar(id + '|rv'); [0, 1, 2].forEach(i => { if (rivPicks[i]) rivPlan.o[i] = rivPicks[i].o; }); tryResolveP(); }
      tryResolve();
    });
    const tryResolveP = () => { if (waiting) { waiting = false; clearTimeout(fallbackT); runJugada(step); } };
    play(segIntro(), () => {
      if (mySide === 'a' && !cfg.online.accepted) {
        $('lv-act').innerHTML = `<p class="lv-wait">Le ha llegado el reto a ${esc(B.split(' ')[0])}. Si tiene la app abierta, jugáis a la vez.</p><div class="row"><button class="btn small" type="button" data-lv="vspiz">No esperar: jugar contra su pizarra</button></div>`;
        fallbackT = setTimeout(() => { if (!cfg.online.accepted && !rivPlan) { say("0'", `${esc(B)} no contesta: juegas contra su pizarra.`); vsPizarra(); showPrompt(); } }, 60000);
      } else showPrompt();
    });
  } else play(segIntro(), showPrompt);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-lv], [data-lv-o], [data-lv-card]'); if (!b) return;
    if (b.dataset.lvO) { sel.o = b.dataset.lvO; $('lv-act').innerHTML = promptHTML(step, false); return; }
    if (b.dataset.lvCard) { sel[b.dataset.lvCard] = !sel[b.dataset.lvCard]; $('lv-act').innerHTML = promptHTML(step, false); return; }
    const a = b.dataset.lv;
    if (a === 'close') { closed = true; if (unsub) unsub(); clearTimeout(fallbackT); if (cfg.online && !finished && window.SMB_CLOUD) window.SMB_CLOUD.match.update(id, { estado: 'pizarra' }).catch(() => {}); closeLive(); }
    else if (a === 'skip') { liveT.forEach(clearTimeout); liveT = []; instant = true; el.classList.add('instant'); flash.className = 'lv-flash'; finishCur(); ['lv-da', 'lv-db'].forEach(n => { const q = $(n); q.classList.remove('roll'); if (lastDice[n] != null) q.textContent = lastDice[n]; }); }
    else if (a === 'go') { if (sel.o) choose(); }
    else if (a === 'vspiz') { clearTimeout(fallbackT); const first = step === 0 && !waiting && mySide === 'a' && cfg.online && !cfg.online.accepted; vsPizarra(); if (first) showPrompt(); }
    else if (a === 'rev') { const n = b.dataset.name; closed = true; if (unsub) unsub(); closeLive(false); retar(n); }
  });
  liveKey = e => { if (e.key === 'Escape') el.querySelector('[data-lv="close"]').click(); };
  document.addEventListener('keydown', liveKey);
  el.querySelector('.lv-x').focus();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { instant = true; el.classList.add('instant'); }
}
