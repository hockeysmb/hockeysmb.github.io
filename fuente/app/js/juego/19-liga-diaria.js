// ================= liga diaria (16 oct, a lo Online Soccer Manager) =================
// Una jornada cada día a las 22:00, liga a ida y vuelta entre todo el cuerpo técnico; al acabar, nueva temporada el lunes siguiente.
// Sin servidor: cada uno deja en su perfil cómo juega en la próxima jornada (pizarra, poder, nivel y plantilla) y todos calculan
// los mismos resultados con el mismo motor y la misma semilla. Cuando la DT abre la app, congela equipos y resultados en el club.
const LG_START = '2026-10-19', LG_HOUR = 22, LG_WIN = 8, LG_WINP = 5, LG_LOSSP = 2, LG_PRIZE = [100, 60, 30];
const lgAt = (iso, h = LG_HOUR) => { const d = dateOf(iso); d.setHours(h, 0, 0, 0); return d.getTime(); };
const lgIso = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const lgAddDays = (iso, n) => { const d = dateOf(iso); d.setDate(d.getDate() + n); return lgIso(d.getTime()); };
const lgNextMonday = iso => { const d = dateOf(iso); const k = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + k); return lgIso(d.getTime()); };
const lgFrozen = () => bank.lg || { seasons: {}, res: {} };
// quién juega: los que han abierto la liga antes de que empiece la temporada (o lo que dejó congelado la DT)
function lgJoinOf(c) { return normName(c.name) === normName(readAuthor()) ? (game.lgJoin || c.lgJoin || 0) : (c.lgJoin || 0); }
function lgTeamsAt(startT) {
  const all = [...(bank.coaches || [])];
  if (readAuthor() && !all.some(c => normName(c.name) === normName(readAuthor()))) all.push({ name: readAuthor() });
  return all.filter(c => { const j = lgJoinOf(c); return j && j < startT; }).map(c => c.name).sort((a, b) => a.localeCompare(b, 'es'));
}
let lgCache = null;
function lgSeasons() {
  const key = JSON.stringify([(bank.coaches || []).map(c => [c.name, c.lgJoin || 0]), game.lgJoin || 0, Object.keys(lgFrozen().seasons || {}), isoToday()]);
  if (lgCache && lgCache.key === key) return lgCache.list;
  const out = [], now = Date.now();
  let start = LG_START;
  for (let s = 1; s < 200; s++) {
    const fz = (lgFrozen().seasons || {})[s];
    const startT = lgAt(start, 0);
    if (startT > now && !fz) { out.push({ s, start, teams: lgTeamsAt(now), L: 0, future: true }); break; }
    const teams = fz ? fz.teams : lgTeamsAt(startT), n = teams.length;
    if (n < 2) { const nx = lgNextMonday(start); if (lgAt(nx, 0) > now) { out.push({ s, start, teams, L: 0, empty: true, nextStart: nx }); break; } start = nx; s--; continue; }
    const L = n % 2 ? 2 * n : 2 * (n - 1), end = lgAddDays(start, L - 1);
    out.push({ s, start, end, teams, L });
    start = lgNextMonday(end);
    if (lgAt(start, 0) > now) { out.push({ s: s + 1, start, teams: lgTeamsAt(now), L: 0, future: true }); break; }
  }
  lgCache = { key, list: out };
  return out;
}
// calendario por el método del círculo; la segunda vuelta, con los campos cambiados
function lgFixtures(S) {
  const t = [...S.teams]; if (t.length % 2) t.push(null);
  const R = rng('lgfix|' + S.s); for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
  const n = t.length, rounds = [];
  let arr = [...t];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; pairs.push(r % 2 ? [b, a] : [a, b]); }
    rounds.push(pairs);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  const all = [...rounds, ...rounds.map(p => p.map(([a, b]) => [b, a]))];
  return all.map((pairs, k) => ({ k: k + 1, date: lgAddDays(S.start, k), t: lgAt(lgAddDays(S.start, k)), games: pairs.filter(([a, b]) => a && b), rest: pairs.filter(([a, b]) => !a || !b).map(([a, b]) => a || b) }));
}
// cómo juega cada uno en una jornada: la foto que dejó para esa jornada o, si no, la última anterior
const lgDefault = { plan: null, poder: 'garra', lvl: 0, sq: null, est: null };
function lgSnap(name, s, k) {
  const me = normName(name) === normName(readAuthor()), c = coachOf(name) || {};
  const L = (me ? game.lgs : c.lgs) || {};
  let best = null, bk = -1;
  Object.entries(L).forEach(([key, v]) => { const [ss, kk] = key.split('|').map(Number); const ord = ss * 1000 + kk; if (ord <= s * 1000 + k && ord > bk) { bk = ord; best = v; } });
  return best || lgDefault;
}
function lgSide(name, s, k) {
  const sn = lgSnap(name, s, k), seed = `lg|${s}|${k}|pz|${name}`;
  return { name, lvl: sn.lvl || 0, forma: 0, sq: sn.sq || null, est: sn.est || null, poder: sn.poder || 'garra', plan: planDePizarra(sn.plan, seed) };
}
const lgRes = new Map();
function lgDuel(S, md, a, b) {
  const fz = ((lgFrozen().res || {})[S.s] || {})[md.k];
  const f = fz && fz.find(x => x.a === a && x.b === b);
  if (f && f.d) return f.d;
  const key = `${S.s}|${md.k}|${a}|${b}`;
  if (!lgRes.has(key)) lgRes.set(key, playDuel(lgSide(a, S.s, md.k), lgSide(b, S.s, md.k), 'lg|' + key));
  return lgRes.get(key);
}
const lgPlayed = md => md.t <= Date.now();
function lgTable(S, fx) {
  const T = {}; S.teams.forEach(n => { T[n] = { name: n, pj: 0, g: 0, p: 0, gf: 0, gc: 0, pts: 0, racha: [] }; });
  (fx || lgFixtures(S)).filter(lgPlayed).forEach(md => md.games.forEach(([a, b]) => {
    const d = lgDuel(S, md, a, b), A = T[a], B = T[b]; if (!A || !B) return;
    const pen = d.ga === d.gb, wa = normName(d.win) === normName(a);
    A.pj++; B.pj++; A.gf += d.ga; A.gc += d.gb; B.gf += d.gb; B.gc += d.ga;
    if (wa) { A.g++; B.p++; A.pts += pen ? 2 : 3; B.pts += pen ? 1 : 0; } else { B.g++; A.p++; B.pts += pen ? 2 : 3; A.pts += pen ? 1 : 0; }
    A.racha.push(wa ? 'G' : 'P'); B.racha.push(wa ? 'P' : 'G');
  }));
  return Object.values(T).sort((x, y) => y.pts - x.pts || (y.gf - y.gc) - (x.gf - x.gc) || y.gf - x.gf || x.name.localeCompare(y.name, 'es'));
}
function lgNow() {
  const list = lgSeasons(), cur = [...list].reverse().find(S => S.L && lgAt(S.start, 0) <= Date.now()) || null;
  const fx = cur ? lgFixtures(cur) : [];
  const next = fx.find(md => !lgPlayed(md)) || null, last = [...fx].reverse().find(lgPlayed) || null;
  const upcoming = list.find(S => S.future || S.empty) || null;
  return { list, cur, fx, next, last, upcoming, over: cur && !next };
}
// la foto para la próxima jornada (va en el perfil; la de una jornada que ya ha empezado no se toca)
function lgTouch() {
  if (!readAuthor()) return null;
  if (!game.lgJoin) game.lgJoin = Date.now();
  const N = lgNow();
  let s = 0, k = 0;
  if (N.next) { s = N.cur.s; k = N.next.k; } else if (N.upcoming) { s = N.upcoming.s; k = 1; }
  if (s) {
    const lvl = levelOf(clubPoints(readAuthor())), p = game.poder;
    game.lgs = Object.assign({}, game.lgs || {}, { [s + '|' + k]: { plan: game.pizarra || null, poder: p && poderOf(p).lv <= lvl ? p : 'garra', lvl: duelLvl(lvl), sq: game.club ? clSummary(game.club) : null, est: estiloDe(readAuthor()), ts: Date.now() } });
    const keys = Object.keys(game.lgs).sort((x, y) => { const [a1, a2] = x.split('|').map(Number), [b1, b2] = y.split('|').map(Number); return a1 * 1000 + a2 - (b1 * 1000 + b2); });
    keys.slice(0, Math.max(0, keys.length - 6)).forEach(k2 => delete game.lgs[k2]);
  }
  try { localStorage.setItem(LS_GAME, JSON.stringify(game)); } catch (e) {}
  return { join: game.lgJoin, lgs: game.lgs || {} };
}
// premios y cansancio de mis partidos (una vez por jornada) y, para la DT, congelar equipos y resultados
let lgFreezing = false;
function lgSync() {
  const me = readAuthor(); if (!me) return;
  if (!game.lgJoin) { game.lgJoin = Date.now(); saveGame(); }
  const N = lgNow(); if (!N.cur) return;
  const paid = new Set(game.lgPaid || []), news = [];
  N.fx.filter(lgPlayed).forEach(md => md.games.forEach(([a, b]) => {
    if (normName(a) !== normName(me) && normName(b) !== normName(me)) return;
    const key = `${N.cur.s}|${md.k}`; if (paid.has(key)) return;
    const d = lgDuel(N.cur, md, a, b), win = normName(d.win) === normName(me), pen = d.ga === d.gb, riv = normName(a) === normName(me) ? b : a;
    const pts = win ? (pen ? LG_WINP : LG_WIN) : (pen ? LG_LOSSP : 0);
    if (pts) game.log.push({ key: 'lg:' + key, pts, why: `Liga · jornada ${md.k}: ${win ? 'victoria' : 'derrota en los penaltis'} contra ${riv}`, date: isoToday() });
    if (game.club && Date.now() - md.t < 3 * 864e5) clFatigue(6);
    paid.add(key); news.push(`Jornada ${md.k}: ${win ? 'has ganado' : 'has perdido'} ${normName(a) === normName(me) ? d.ga + '–' + d.gb : d.gb + '–' + d.ga} a ${riv}${pts ? ` (+${pts})` : ''}`);
  }));
  // fin de temporada: premios a los tres primeros
  N.list.filter(S => S.L && S.end && lgAt(S.end) <= Date.now()).forEach(S => {
    const key = 'fin|' + S.s; if (paid.has(key)) return;
    const tb = lgTable(S), pos = tb.findIndex(r => normName(r.name) === normName(me));
    if (pos >= 0 && pos < 3) { game.log.push({ key: 'lgfin:' + S.s, pts: LG_PRIZE[pos], why: `Liga · temporada ${S.s}: ${['campeón', 'subcampeón', 'tercero'][pos]}`, date: isoToday() }); if (pos === 0) cofreGrant('lgfin:' + S.s, 'campeón de la liga'); news.push(`Temporada ${S.s}: ¡${['campeón', 'subcampeón', 'tercero'][pos]}! +${LG_PRIZE[pos]}`); }
    paid.add(key);
  });
  if (news.length) { game.lgPaid = [...paid].slice(-120); saveGame(); news.slice(-2).forEach(avisoJuego); }
  // la DT congela en el club los equipos de cada temporada y los resultados ya jugados
  if (canWriteBank && window.SMB_CLOUD && artifactApi && !lgFreezing) {
    const F = JSON.parse(JSON.stringify(lgFrozen())); F.seasons = F.seasons || {}; F.res = F.res || {}; let ch = false;
    N.list.filter(S => S.L).forEach(S => {
      if (!F.seasons[S.s]) { F.seasons[S.s] = { start: S.start, teams: S.teams }; ch = true; }
      lgFixtures(S).filter(lgPlayed).forEach(md => { F.res[S.s] = F.res[S.s] || {}; if (!F.res[S.s][md.k]) { F.res[S.s][md.k] = md.games.map(([a, b]) => ({ a, b, d: lgDuel(S, md, a, b) })); ch = true; } });
    });
    // de las temporadas viejas solo quedan los marcadores
    Object.keys(F.res).forEach(s => { if (N.cur && +s < N.cur.s - 1) Object.values(F.res[s]).forEach(g => g.forEach(x => { if (x.d && x.d.P) x.d = { ga: x.d.ga, gb: x.d.gb, win: x.d.win, a: { name: x.d.a.name }, b: { name: x.d.b.name } }; })); });
    if (ch) { lgFreezing = true; const next = Object.assign({}, bank, { lg: F }); artifactApi.publish({ 'data/banco.json': JSON.stringify(next) }).then(() => { bank = next; }).catch(() => {}).finally(() => { lgFreezing = false; }); }
  }
}
// ---------- vista ----------
const lgCd = t => { const ms = t - Date.now(); if (ms <= 0) return 'ya'; const m = Math.ceil(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24); return d ? `${d} d ${h % 24} h` : h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
const lgDay = md => `${DIAS[dateOf(md.date).getDay()].slice(0, 3).toLowerCase()} ${dateOf(md.date).getDate()} · ${LG_HOUR}:00`;
let ligaTab = 'pabellon', lgOnlyMine = false;   // al abrir la app, la Liga empieza siempre en el pabellón
function lgGameRow(S, md, a, b) {
  const me = normName(readAuthor()), mine = normName(a) === me || normName(b) === me, pl = lgPlayed(md), d = pl ? lgDuel(S, md, a, b) : null;
  const wA = d && normName(d.win) === normName(a), wB = d && !wA;
  return `<li class="lg-g${mine ? ' mine' : ''}">${pl ? `<button type="button" data-lg="ver" data-s="${S.s}" data-k="${md.k}" data-a="${esc(a)}" data-b="${esc(b)}">` : '<div>'}
    <span class="lg-t${wA ? ' w' : ''}">${miniAv(a)}<span>${esc(a.split(' ')[0])}</span></span>
    <span class="lg-sc">${d ? `${d.ga}–${d.gb}${d.ga === d.gb ? '<small>pen.</small>' : ''}` : '<small>vs</small>'}</span>
    <span class="lg-t r${wB ? ' w' : ''}"><span>${esc(b.split(' ')[0])}</span>${miniAv(b)}</span>${pl ? '</button>' : '</div>'}</li>`;
}
function lgTableHTML(S, mini) {
  const me = normName(readAuthor()), tb = lgTable(S); let rows = tb.map((r, i) => ({ r, i }));
  if (mini) { const pos = tb.findIndex(r => normName(r.name) === me); rows = rows.filter(({ i }) => i < 3 || i === pos); }
  return `<div class="lg-tbl-w"><table class="lg-tbl"><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>P</th>${mini ? '' : '<th>GF</th><th>GC</th>'}<th>DG</th><th>Pts</th>${mini ? '' : '<th>Racha</th>'}</tr></thead><tbody>
    ${rows.map(({ r, i }) => `<tr class="${normName(r.name) === me ? 'me' : ''}${i === 0 && r.pj ? ' first' : ''}"><td>${i + 1}</td><td class="lg-tn"><button class="esp-link" type="button" data-coach="${esc(r.name)}">${miniAv(r.name)}<span>${esc(r.name)}</span></button></td><td>${r.pj}</td><td>${r.g}</td><td>${r.p}</td>${mini ? '' : `<td>${r.gf}</td><td>${r.gc}</td>`}<td>${r.gf - r.gc > 0 ? '+' : ''}${r.gf - r.gc}</td><td><b>${r.pts}</b></td>${mini ? '' : `<td class="lg-racha">${r.racha.slice(-5).map(x => `<i class="${x}">${x}</i>`).join('')}</td>`}</tr>`).join('')}</tbody></table></div>`;
}
function lgHoyHTML(N) {
  const me = readAuthor(); if (!me) return '<section class="ses-sec"><p>Pon tu nombre en Mi cuenta para entrar en la liga.</p></section>';
  if (!N.cur) {
    const U = N.upcoming;
    return `<section class="ses-sec lg-hero"><span class="lg-k">${U ? `Temporada ${U.s}` : 'Liga'}</span><h2>${U ? `Empieza el ${esc(fmtDay(U.nextStart || U.start))}` : 'Muy pronto'}</h2>
      <p class="sub">Un partido cada día a las ${LG_HOUR}:00. Prepara tu plantilla y tu pizarra. ${infoBtn('liga')}</p>${U && U.teams.length ? `<p class="sub">Apuntados: ${U.teams.map(esc).join(', ')}.</p>` : ''}
      <div class="row"><button class="btn" type="button" data-lgtab="pizarra">Pizarra y poder</button><button class="btn" type="button" data-lgtab="amistosos">Jugar un amistoso</button></div></section>${clubTeaserHTML()}${ciudadTeaserHTML()}`;
  }
  const inS = N.cur.teams.some(t => normName(t) === normName(me));
  const mdNext = N.next, g = mdNext && mdNext.games.find(([a, b]) => normName(a) === normName(me) || normName(b) === normName(me));
  const riv = g ? (normName(g[0]) === normName(me) ? g[1] : g[0]) : '';
  const c = clubOf(), s = clSummary(c), rs = riv ? sqOf(riv) : null, left = clTrainsLeft(c);
  const pz = pzNorm(game.pizarra), pw = poderOf(game.poder || 'garra');
  const lastG = N.last && N.last.games.find(([a, b]) => normName(a) === normName(me) || normName(b) === normName(me));
  const check = (ok, t, act, btn) => `<li class="${ok ? 'ok' : ''}"><span class="lg-ck" aria-hidden="true">${ok ? '✓' : '!'}</span><span>${t}</span>${act}</li>`;
  return `${!inS ? `<section class="notice">Esta temporada empezó sin ti. Entras en la siguiente, que empieza el ${esc(fmtDay(lgNextMonday(N.cur.end)))}.</section>` : ''}
    <section class="ses-sec lg-hero"><span class="lg-k">Temporada ${N.cur.s} · ${mdNext ? `jornada ${mdNext.k} de ${N.cur.L}` : 'terminada'}</span>
      ${mdNext ? `<div class="lg-vs">${miniAv(me)}<div class="lg-mid"><b data-lgcd="${mdNext.t}">${lgCd(mdNext.t)}</b><small>${esc(lgDay(mdNext))}</small></div>${riv ? miniAv(riv) : '<span class="duel-av lg-rest">—</span>'}</div>
        <h2>${riv ? `Contra ${esc(riv)}` : 'Esta jornada descansas'}</h2>
        ${riv && s ? `<p class="sub lg-cmp">Tu equipo: ataque <b>${s.atk}</b> · defensa <b>${s.def}</b>${rs ? ` — el suyo: ataque <b>${rs.atk}</b> · defensa <b>${rs.def}</b>` : ''}</p>` : ''}
        ${inS ? `<h3 class="h-sub">Antes del partido</h3><ul class="lg-check">
          ${check(true, `Alineación: ${esc(CL_FORMS[clLineup(c).form].n)}${s ? ` · ataque ${s.atk}, defensa ${s.def}` : ''}`, '<button class="btn small" type="button" data-lgtab="equipo">Cambiar</button>')}
          ${check(!!(pz && pz.at && pz.de), pz && pz.at ? `Pizarra: ${esc(jugN(pz.at))} con bola y ${esc(jugN(pz.de))} sin bola` : 'Pizarra sin preparar: jugarás al azar', '<button class="btn small" type="button" data-lgtab="equipo">Pizarra</button>')}
          ${check(true, `Poder: ${esc(pw.n)}`, '<button class="btn small" type="button" data-liga="poderes">Cambiar</button>')}
          ${check(!left, left ? `Te ${left === 1 ? 'queda un entrenamiento' : `quedan ${left} entrenamientos`} hoy` : 'Entrenamiento de hoy hecho', left ? '<button class="btn small primary" type="button" data-club="entrenar">Entrenar</button>' : '')}
        </ul><p class="sub">Lo que tengas a las ${LG_HOUR}:00 es lo que juega. Hasta entonces puedes cambiarlo todo.</p>` : ''}`
      : `<h2>Temporada terminada</h2><p class="sub">La siguiente empieza el ${esc(fmtDay(lgNextMonday(N.cur.end)))}.</p>`}
    </section>
    ${lastG ? (() => { const d = lgDuel(N.cur, N.last, lastG[0], lastG[1]), w = normName(d.win) === normName(me); return `<section class="ses-sec lg-last"><div class="lt-head"><h2 class="h-sec">Último partido</h2><span class="sub">Jornada ${N.last.k} · ${esc(lgDay(N.last))}</span></div>
      <ul class="lg-games">${lgGameRow(N.cur, N.last, lastG[0], lastG[1])}</ul><p class="lg-res ${w ? 'w' : 'l'}">${w ? '¡Victoria!' : 'Derrota'}${d.ga === d.gb ? ' en los penaltis' : ''}</p></section>`; })() : ''}
    <section class="ses-sec"><div class="lt-head"><h2 class="h-sec">Clasificación</h2><button class="btn small" type="button" data-lgtab="clasificacion">Completa</button></div>${lgTableHTML(N.cur, true)}</section>
    ${clubTeaserHTML()}`;
}
function lgCalHTML(N) {
  if (!N.cur) return `<section class="ses-sec"><p class="sub">El calendario sale cuando empiece la temporada.</p></section>`;
  const me = normName(readAuthor());
  return `<section class="ses-sec"><div class="lt-head"><h2 class="h-sec">Temporada ${N.cur.s} · calendario</h2><button class="chip sm" type="button" data-lg="mine" aria-pressed="${lgOnlyMine}">Solo mis partidos</button></div>
    <p class="sub">Del ${esc(fmtDay(N.cur.start))} al ${esc(fmtDay(N.cur.end))}. Cada día a las ${LG_HOUR}:00. Toca un partido jugado para verlo.</p>
    <ol class="lg-cal">${N.fx.map(md => { const gs = md.games.filter(([a, b]) => !lgOnlyMine || normName(a) === me || normName(b) === me); const restMe = md.rest.some(r => normName(r) === me);
      if (lgOnlyMine && !gs.length && !restMe) return '';
      return `<li class="lg-md${md === N.next ? ' next' : ''}${lgPlayed(md) ? ' played' : ''}" id="lgmd-${md.k}"><div class="lg-mdh"><b>Jornada ${md.k}${md.k === N.fx.length / 2 + 1 ? ' · vuelta' : ''}</b><span>${esc(lgDay(md))}${md === N.next ? ` · <b data-lgcd="${md.t}">${lgCd(md.t)}</b>` : ''}</span></div>
        <ul class="lg-games">${gs.map(([a, b]) => lgGameRow(N.cur, md, a, b)).join('')}</ul>${md.rest.length && (!lgOnlyMine || restMe) ? `<p class="sub lg-restp">Descansa: ${md.rest.map(esc).join(', ')}</p>` : ''}</li>`; }).join('')}</ol></section>`;
}
function lgClasHTML(N) {
  const past = N.list.filter(S => S.L && S.end && lgAt(S.end) <= Date.now()).reverse();
  return `${N.cur ? `<section class="ses-sec"><h2 class="h-sec">Temporada ${N.cur.s}</h2><p class="sub">Victoria 3 puntos; en los penaltis, 2 al que gana y 1 al que pierde.</p>${lgTableHTML(N.cur)}</section>` : ''}
    ${past.length ? `<section class="ses-sec"><h2 class="h-sec">Palmarés</h2><ul class="pts-list">${past.map(S => { const tb = lgTable(S); return `<li><span>Temporada ${S.s} · ${esc(fmtDay(S.start))}</span><b>🏆 ${esc(tb[0] ? tb[0].name : '—')}</b></li>`; }).join('')}</ul></section>` : ''}
    ${liga().length ? `<details class="ses-sec"><summary><b>Liga de los lunes (la de antes)</b></summary>${standingsHTML()}${oldJornadasHTML()}</details>` : ''}`;
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-lgtab]'); if (t) { ligaTab = t.dataset.lgtab; try { localStorage.setItem('smb-liga-tab', ligaTab); } catch (er) {} if (view.zone !== 'liga') navigate('liga'); else render(); window.scrollTo(0, 0); return; }
  const b = e.target.closest('[data-lg]'); if (!b) return;
  if (b.dataset.lg === 'mine') { lgOnlyMine = !lgOnlyMine; render(); return; }
  if (b.dataset.lg === 'ver') { const S = lgSeasons().find(x => x.s === +b.dataset.s), md = S && lgFixtures(S).find(m => m.k === +b.dataset.k); if (md) openDuel3({ n: md.k }, lgDuel(S, md, b.dataset.a, b.dataset.b)); }
});
setInterval(() => {
  const els = document.querySelectorAll('[data-lgcd]'); if (!els.length) return;
  let due = false; els.forEach(e => { const t = +e.dataset.lgcd; if (t <= Date.now()) due = true; e.textContent = lgCd(t); });
  if (due && !document.querySelector('.modal:not([hidden]), #live, .cofre, #club-ov')) { lgCache = null; render(); }
}, 30000);

function lgSubTxt(N) {
  if (!N.cur) { const U = N.upcoming; return U ? `Temporada ${U.s}: empieza el ${fmtDay(U.nextStart || U.start)}` : `Un partido cada día a las ${LG_HOUR}:00`; }
  if (!N.next) return `Temporada ${N.cur.s} terminada · la siguiente, el ${fmtDay(lgNextMonday(N.cur.end))}`;
  return `Temporada ${N.cur.s} · jornada ${N.next.k} de ${N.cur.L} · ${N.next.date === isoToday() ? 'hoy' : fmtDay(N.next.date)} a las ${LG_HOUR}:00`;
}
function lgTeaserTxt() {
  const me = readAuthor(), N = lgNow();
  if (!N.cur) return lgSubTxt(N);
  if (!N.next) return lgSubTxt(N);
  const g = N.next.games.find(([a, b]) => normName(a) === normName(me) || normName(b) === normName(me));
  const riv = g ? (normName(g[0]) === normName(me) ? g[1] : g[0]) : '';
  return riv ? `Jornada ${N.next.k}: ${N.next.date === isoToday() ? 'hoy' : fmtDay(N.next.date)} a las ${LG_HOUR}:00 contra ${riv}` : `Jornada ${N.next.k}: descansas`;
}

function cofresSync() {
  const me = readAuthor(); if (!me) return;
  let n = 0;
  if (cofreGrant('hola', 'bienvenida', true)) n++;
  const lvl = levelOf(clubPoints(me));
  for (let k = 1; k <= lvl; k++) if (cofreGrant('lv' + k, 'nivel ' + k, true)) n++;
  const J = lastJornada(), d = J && J.duels.find(x => normName(x.a.name) === normName(me) || normName(x.b.name) === normName(me));
  if (d && normName(d.win) === normName(me) && cofreGrant('j' + J.n, 'jornada ' + J.n, true)) n++;
  bank.tasks.filter(t => t.source !== 'oller' && t.author && normName(t.author) === normName(me) && (t.alta || '') >= '2026-10-10').forEach(t => { if (cofreGrant('bk:' + t.id, 'ejercicio en el banco', true)) n++; });
  if (n) { saveGame(); avisoJuego(n === 1 ? 'Tienes un cofre nuevo: tira el penalti.' : `Tienes ${n} cofres nuevos: tira los penaltis.`); }
}
const cofresN = () => (game.cofres || {}).n || 0;
// penalti gratis cada 12 h y penalti de pago (10 oct)
const PEN_FREE_H = 12, PEN_PRICE = 50;
const penFreeIn = () => Math.max(0, (game.penAt || 0) + PEN_FREE_H * 3600e3 - Date.now());
const penFree = () => penFreeIn() === 0;
const penCd = ms => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
function misNotas() { const ids = new Set(mine.map(t => t.id)); return (bank.notas || []).filter(n => ids.has(n.tid)); }
function notasHomeHTML() {
  const N = misNotas(); if (!N.length) return '';
  const pend = N.filter(n => { const t = mine.find(x => x.id === n.tid); return t && (t.ts || 0) <= n.ts; });
  if (!pend.length) return '';
  return `<button class="notice nota-n" type="button" data-nota="${esc(pend[0].tid)}">La DT te ha dejado ${pend.length === 1 ? `una nota en «${esc(pend[0].titulo || 'tu ejercicio')}»` : pend.length + ' notas en tus ejercicios'}: ábrelo <span aria-hidden="true">→</span></button>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-nota]'); if (!b) return; const t = mine.find(x => x.id === b.dataset.nota); if (t) openEditor(clone(t), 'mine'); });
const penBtnLabel = () => cofresN() ? `Tirar penalti · ${cofresN()} ${cofresN() === 1 ? 'cofre' : 'cofres'}` : penFree() ? 'Penalti gratis' : `Penalti gratis en <span data-pencd>${penCd(penFreeIn())}</span>`;
setInterval(() => {
  const els = document.querySelectorAll('[data-pencd]'); if (!els.length) return;
  const ms = penFreeIn();
  if (!ms) { if (!document.querySelector('.cofre')) render(); return; }
  els.forEach(e => { e.textContent = penCd(ms); });
}, 20000);
const cofreN0 = () => (game.cofres || { keys: [] }).keys.includes('am:' + isoToday());
function rollPremio() {
  const roll = Math.random() * 100;
  let acc = 0, r = 'comun';
  for (const [k, , w] of RAREZAS) { acc += w; if (roll < acc) { r = k; break; } }
  const pool = ESTILOS.filter(x => x.r === r && !estOwned(x.id));
  if (!pool.length) return { r, coins: RAR[r].m };
  return { r, item: pool[Math.floor(Math.random() * pool.length)] };
}
const ZONAS = [['ei', 'Escuadra izquierda'], ['ed', 'Escuadra derecha'], ['bi', 'Abajo a la izquierda'], ['bd', 'Abajo a la derecha']];
function goalFx(rink, side, scoreEl, boardP, at) {
  if (!rink || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  rink.classList.remove('shake'); void rink.offsetWidth; rink.classList.add('shake');
  const b = document.createElement('div'); b.className = 'fx-burst'; b.style.left = at ? at[0] + '%' : side === 'a' ? '95%' : '5%'; b.style.top = at ? at[1] + '%' : '50%';
  const cols = side === 'a' ? ['var(--accent)', '#ffc800', '#ffffff', '#ff4fa3'] : ['var(--team-b)', '#1cb0f6', '#ffffff', '#58cc02'];
  for (let i = 0; i < 22; i++) {
    const ang = at ? Math.random() * Math.PI * 2 : (side === 'a' ? Math.PI / 2 : -Math.PI / 2) + (Math.random() * Math.PI), r = 50 + Math.random() * 110;
    const s = document.createElement('i');
    s.style.cssText = `--dx:${Math.round(Math.sin(ang) * r)}px;--dy:${Math.round(-Math.cos(ang) * r * .7)}px;--rt:${Math.round(Math.random() * 720 - 360)}deg;background:${cols[i % 4]};animation-delay:${Math.round(Math.random() * 90)}ms;${i % 3 ? '' : 'border-radius:50%;'}`;
    b.appendChild(s);
  }
  rink.appendChild(b); setTimeout(() => b.remove(), 1500);
  [scoreEl, boardP].forEach(e => { if (!e) return; e.classList.remove('bump', 'bump-a', 'bump-b'); void e.offsetWidth; e.classList.add('bump', 'bump-' + side); setTimeout(() => e.classList.remove('bump', 'bump-a', 'bump-b'), 1300); });
  try { if (navigator.vibrate) navigator.vibrate([50, 40, 80]); } catch (e) {}
}
const CF_PIQUES = ['A ver qué sabes hacer', 'Esta la paro seguro', 'Tira, que no tengo todo el día', 'Tengo arriba… y abajo', 'Hoy no pasa ni una', '¿Seguro que quieres tirar tú?', 'Mírame a los ojos', 'Te la he visto venir'];
const CF_T = { ei: [-88, -148], ed: [88, -148], bi: [-88, -72], bd: [88, -72] };
const CF_R = { ei: [-170, -70], ed: [170, -70], bi: [-170, -30], bd: [170, -30] };
function cfKeeperHead(c) {
  if (c && c.avatar) {
    const s = 23 / 78, x = 150 - 140 * s, y = 68 - 104 * s;
    return `<clipPath id="cf-hc"><circle cx="150" cy="68" r="22"/></clipPath><circle cx="150" cy="68" r="23.5" fill="#fff" stroke="#1b1b1b" stroke-width="2"/><g clip-path="url(#cf-hc)">${avatarSVG(c.avatar).replace(/^<svg /, `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(280 * s).toFixed(1)}" height="${(280 * s).toFixed(1)}" `)}</g>`;
  }
  return '<circle cx="150" cy="74" r="15" class="cf-helmet"/><rect x="140" y="70" width="20" height="12" rx="3" class="cf-visor"/>';
}
function openCofre() {
  if (!readAuthor()) { toast('Antes, pon tu nombre en Mi cuenta.'); return; }
  const el = document.createElement('div'); el.className = 'cofre'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Cofre: tira el penalti');
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  let busy = false, gk = null, pique = '', pago = false;
  const fuente = () => cofresN() ? 'cofre' : penFree() ? 'gratis' : pago ? 'pago' : '';
  const reduce = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pickGk = () => {
    const me = normName(readAuthor()), cs = (bank.coaches || []).filter(c => c.avatar && normName(c.name) !== me);
    gk = cs.length ? cs[Math.floor(Math.random() * cs.length)] : null;
    pique = CF_PIQUES[Math.floor(Math.random() * CF_PIQUES.length)];
  };
  const gkName = () => gk ? gk.name.split(' ')[0] : 'el portero';
  const close = () => { el.remove(); document.removeEventListener('keydown', key); if (!document.getElementById('live')) document.body.style.overflow = ''; render(); };
  const key = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  const draw = (res) => {
    const n = cofresN(), src = fuente(), puede = !!src;
    if (!res) pickGk();
    const bt = res && res.gol ? `transform:translate(${CF_T[res.zona][0]}px,${CF_T[res.zona][1]}px) scale(.62)` : '';
    el.innerHTML = `<div class="cf-in"><div class="cf-top"><b>Cofre</b><span>${n ? `${n} ${n === 1 ? 'cofre' : 'cofres'} por abrir` : src === 'gratis' ? 'Penalti gratis' : src === 'pago' ? `Penalti de pago · ${PEN_PRICE} monedas` : `Gratis en <b data-pencd>${penCd(penFreeIn())}</b>`}</span><button class="lv-x" type="button" data-cf="x" aria-label="Cerrar">×</button></div>
      <p class="cf-gkname">${gk ? `En la portería: <b>${esc(gk.name)}</b>` : 'En la portería: el portero del club'}</p>
      <div class="cf-goal${res ? (res.gol ? ' end gol' : ' end parada') : ' idle'}">
        <svg viewBox="0 0 300 220" aria-hidden="true"><defs><pattern id="cf-mesh" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0L10 10M10 0L0 10" stroke="currentColor" stroke-width=".6" opacity=".35"/></pattern></defs>
          <rect x="0" y="0" width="300" height="20" class="cf-stands"/>${Array.from({ length: 30 }, (_, i) => `<circle cx="${5 + i * 10}" cy="${6 + (i % 3) * 4}" r="3.2" class="cf-fan f${i % 4}" style="animation-delay:${(i % 5) * 60}ms"/>`).join('')}
          <g class="cf-netg"><rect x="10" y="20" width="280" height="140" class="cf-net"/><rect x="10" y="20" width="280" height="140" fill="url(#cf-mesh)" class="cf-meshr"/></g><path d="M10 160V20h280v140" class="cf-post"/><line x1="0" y1="160" x2="300" y2="160" class="cf-line"/><ellipse cx="150" cy="186" rx="60" ry="6" class="cf-spot"/>
          ${res && res.gol ? `<circle cx="${150 + CF_T[res.zona][0]}" cy="${200 + CF_T[res.zona][1]}" r="14" class="cf-imp"/>` : '<circle cx="0" cy="0" r="14" class="cf-imp" id="cf-imp"/>'}
          <g class="cf-gk${res ? ' dive-' + res.dive : ''}"><g class="cf-gkb"><rect x="128" y="132" width="16" height="26" rx="6" class="cf-pad"/><rect x="156" y="132" width="16" height="26" rx="6" class="cf-pad"/><rect x="132" y="88" width="36" height="50" rx="10" class="cf-body"/><text x="150" y="121" class="cf-num">1</text><rect x="104" y="94" width="30" height="10" rx="5" class="cf-body"/><rect x="166" y="94" width="30" height="10" rx="5" class="cf-body"/><circle cx="100" cy="99" r="9" class="cf-glove"/><circle cx="200" cy="99" r="9" class="cf-glove"/>${cfKeeperHead(gk)}</g></g>
          <g class="cf-ball${res && !res.gol ? ' gone' : ''}" style="${bt}"><circle cx="150" cy="200" r="9" class="cf-ballc"/><path d="M144 196a8 8 0 0 1 10 -2" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/></g></svg>
        ${!res && puede ? `<div class="cf-bubble">${esc(pique)}</div>` : ''}
        <div class="cf-big" id="cf-big" aria-hidden="true">${res ? (res.gol ? '¡GOL!' : '¡PARADÓN!') : ''}</div>
        ${ZONAS.map(([k, l]) => `<button class="cf-z cf-${k}" type="button" data-cf="${k}" aria-label="${l}"${puede && !res ? '' : ' disabled'}></button>`).join('')}
      </div>
      <div class="cf-res" aria-live="polite">${res ? resHTML(res) : puede ? '<p class="cf-hint">Elige esquina y tira.</p>' : waitHTML()}</div></div>`;
  };
  const waitHTML = () => `<div class="cf-wait"><p class="cf-cd">Próximo penalti gratis en<b data-pencd>${penCd(penFreeIn())}</b></p>
      ${balance() >= PEN_PRICE ? `<button class="btn primary" type="button" data-cf="pagar">Tirar ya por ${PEN_PRICE} monedas</button><p class="cf-hint">Tienes ${balance()}.</p>` : `<p class="cf-hint">Para tirarlo ya hacen falta ${PEN_PRICE} monedas y tienes ${balance()}.</p>`}
      <p class="cf-hint">Más cofres: misiones del día, amistosos, la jornada y ejercicios que entran en el banco.</p></div>`;
  const rays = r => ['epico', 'legendario', 'mitico'].includes(r) ? '<span class="cf-rays" aria-hidden="true"></span>' : '';
  const resHTML = res => {
    if (!res.gol) return `<p class="cf-k">¡Paradón de ${esc(gkName())}!</p><p>Se tira a tu lado. Te llevas ${res.coins} monedas.</p>${btns()}`;
    if (res.coins) return `<div class="cf-reveal r-${res.r}">${rays(res.r)}<div class="cf-card r-${res.r}"><span class="cf-rar">${RAR[res.r].n}</span><b>${res.coins} monedas</b><small>Ya tenías todo lo ${RAR[res.r].n.toLowerCase()}.</small></div></div>${btns()}`;
    const it = res.item, cat = EST_CATS.find(([k]) => k === it.c)[1];
    return `<div class="cf-reveal r-${res.r}">${rays(res.r)}<div class="cf-card r-${res.r}"><span class="cf-rar">${RAR[res.r].n}</span>${estPreview(it)}${it.c === 'cel' || it.c === 'tit' ? '' : `<b>${esc(it.n)}</b>`}<small>${esc(cat)}</small></div></div>${btns(it)}`;
  };
  const btns = it => `<div class="row">${it ? `<button class="btn primary" type="button" data-cf="poner" data-id="${it.id}">Ponérmelo</button>` : ''}${cofresN() || penFree() ? '<button class="btn" type="button" data-cf="otro">Otro penalti</button>' : balance() >= PEN_PRICE ? `<button class="btn" type="button" data-cf="pagar">Otro por ${PEN_PRICE} monedas</button>` : ''}<button class="btn" type="button" data-cf="x">Cerrar</button></div>`;
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-cf]'); if (!b) return;
    const a = b.dataset.cf;
    if (a === 'x') { close(); return; }
    if (a === 'otro') { pago = false; draw(null); return; }
    if (a === 'pagar') { if (balance() < PEN_PRICE) { toast('No te llegan las monedas.'); return; } pago = true; draw(null); return; }
    if (a === 'poner') { const it = estItem(b.dataset.id); if (it) { game.estilo = Object.assign({}, game.estilo, { [it.c]: it.id }); saveGame(); toast(`Puesto: ${it.n}`); } close(); return; }
    const src = fuente();
    if (busy || !src) return;
    busy = true;
    const zona = a, dive = ZONAS[Math.floor(Math.random() * 4)][0], gol = dive !== zona;
    if (src === 'cofre') game.cofres.n--;
    else if (src === 'gratis') game.penAt = Date.now();
    else { game.spent = (game.spent || 0) + PEN_PRICE; game.log.push({ key: 'penpago:' + Date.now(), pts: 0, why: `Penalti de pago (−${PEN_PRICE} monedas)`, date: isoToday() }); pago = false; }
    const res = { zona, dive, gol };
    if (gol) { Object.assign(res, rollPremio()); if (res.item) game.col = [...(game.col || []), res.item.id]; else game.log.push({ key: 'cofre:' + Date.now(), pts: res.coins, why: 'Cofre: ' + RAR[res.r].n.toLowerCase() + ' repetido', date: isoToday() }); }
    else { res.coins = 5; game.log.push({ key: 'cofre:' + Date.now(), pts: 5, why: 'Cofre: paradón de ' + gkName(), date: isoToday() }); }
    saveGame();
    el.querySelectorAll('.cf-z').forEach(z => { z.disabled = true; });
    if (reduce()) { busy = false; draw(res); return; }
    const g = el.querySelector('.cf-goal'), ball = g.querySelector('.cf-ball'), big = g.querySelector('#cf-big'), bub = g.querySelector('.cf-bubble');
    if (bub) bub.remove();
    g.classList.remove('idle'); g.classList.add('shoot');
    ball.style.setProperty('--tx', CF_T[zona][0] + 'px'); ball.style.setProperty('--ty', CF_T[zona][1] + 'px');
    ball.style.setProperty('--rx', CF_R[zona][0] + 'px'); ball.style.setProperty('--ry', CF_R[zona][1] + 'px');
    ball.classList.add(gol ? 'go' : 'sv');
    setTimeout(() => g.querySelector('.cf-gk').classList.add('dive-' + dive), 260);
    setTimeout(() => {
      const imp = g.querySelector('#cf-imp');
      if (gol && imp) { imp.setAttribute('cx', 150 + CF_T[zona][0]); imp.setAttribute('cy', 200 + CF_T[zona][1]); }
      g.classList.add(gol ? 'gol' : 'parada');
      big.textContent = gol ? '¡GOL!' : '¡PARADÓN!';
      if (gol) goalFx(g, 'a', null, null, [(150 + CF_T[zona][0]) / 3, (200 + CF_T[zona][1]) / 2.2]);
      try { if (navigator.vibrate) navigator.vibrate(gol ? [40, 30, 90] : 120); } catch (e) {}
    }, 720);
    setTimeout(() => { busy = false; draw(res); }, 2100);
  });
  draw(null);
  el.querySelector('.lv-x').focus();
}
function estPreview(it) {
  if (it.c === 'fic') return `<svg class="est-fic" viewBox="0 0 120 34" aria-hidden="true">${[0, 1, 2, 3].map(i => fichaSVG(it, i, 16 + i * 29, 17, 'a', false)).join('')}</svg>`;
  if (it.c === 'bal') return `<span class="est-sw ball" style="background:${it.sw || it.col}"></span>`;
  if (it.c === 'pis') return `<span class="est-sw rink" style="background:${it.col}"></span>`;
  if (it.c === 'cel') return `<span class="est-cel">${esc(it.n)}</span>`;
  if (it.c === 'efx') return `<span class="est-fx fx-${it.id}" aria-hidden="true"></span>`;
  return `<span class="est-tit">${esc(it.n)}</span>`;
}
function coleccionHTML() {
  const E = game.estilo || {}, tot = ESTILOS.length, mine = ESTILOS.filter(x => estOwned(x.id)).length, n = cofresN();
  return `<div class="col-head"><div><b>${mine} de ${tot}</b><span class="sub"> en tu colección</span> ${infoBtn('coleccion')} ${infoBtn('cofres')}</div><button class="btn${n || penFree() ? ' primary' : ''}" type="button" data-cofre>${penBtnLabel()}</button></div>
    <p class="sub">Se ven en tus partidos. ${infoBtn('coleccion')}</p>
    ${EST_CATS.map(([c, l]) => `<h3 class="h-sub">${esc(l)}</h3><div class="col-grid">${ESTILOS.filter(x => x.c === c).map(x => estOwned(x.id)
      ? `<button class="col-it r-${x.r}" type="button" data-est="${x.id}" aria-pressed="${(E[c] || (x.base ? x.id : '')) === x.id || (!E[c] && x.base)}" aria-label="${esc(x.n)}">${estPreview(x)}${x.c === 'cel' || x.c === 'tit' ? '' : `<b>${esc(x.n)}</b>`}<small>${RAR[x.r].n}</small></button>`
      : `<div class="col-it locked r-${x.r}" aria-label="Sin conseguir, ${RAR[x.r].n.toLowerCase()}"><span class="col-q">?</span><small>${RAR[x.r].n}</small></div>`).join('')}${c === 'tit' ? `<button class="col-it" type="button" data-est="tit-none" aria-pressed="${!E.tit}"><span class="est-tit">—</span><b>Sin título</b><small>&nbsp;</small></button>` : ''}</div>`).join('')}
    <p class="sub credit">Dibujos de las fichas y de los objetos: Microsoft Fluent Emoji (MIT). Planetas, pistas y equipaciones: SMB.</p>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cofre], [data-est]'); if (!b) return;
  if (b.hasAttribute('data-cofre')) { openCofre(); return; }
  const id = b.dataset.est;
  if (id === 'tit-none') { game.estilo = Object.assign({}, game.estilo); delete game.estilo.tit; }
  else { const it = estItem(id); if (!it || !estOwned(id)) return; game.estilo = Object.assign({}, game.estilo, { [it.c]: id }); }
  saveGame(); render();
});

// ---------- el partido por posesiones: repetición, en directo contra la pizarra o a la vez con el rival ----------
function openLive(x) { if (x.r && x.r.v === 3) openMatch({ replay: x }); else openMatchV2({ replay: x }); }
function openMatch(cfg) {
  closeLive(false);
  const replay = cfg.replay || null, mySide = cfg.side || 'a', me = normName(readAuthor());
  const id = replay ? replay.id : cfg.id;
  const d0 = replay ? replay.r : playDuel(cfg.PA, cfg.PB, id);
  const A = d0.a.name, B = d0.b.name, N = { a: A, b: B }, rivalName = mySide === 'a' ? B : A, other = mySide === 'a' ? 'b' : 'a';
  const E = { a: d0.a.est || {}, b: d0.b.est || {} };
  const R = rng(id + '|narra'), pick = arr => arr[Math.floor(R() * arr.length)];
  const pw = p => `${esc(poderOf(p.poder).n)}${p.uses !== p.poder ? ` (copia ${esc(poderOf(p.uses).n)})` : ''}`;
  const tit = k => E[k].tit && estItem(E[k].tit) ? `<i class="lv-tit r-${estItem(E[k].tit).r}">${esc(estItem(E[k].tit).n)}</i>` : '';
  const el = document.createElement('div'); el.id = 'live'; el.className = 'live';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Amistoso: ${A} contra ${B}`);
  const tagTxt = replay ? 'Amistoso · repetición' : cfg.online ? 'Amistoso · a la vez' : 'Amistoso · en directo';
  el.innerHTML = `<div class="lv-in">
    <div class="lv-top"><span class="lv-tag"><i class="lv-rec" aria-hidden="true"></i><span id="lv-tag">${tagTxt}</span></span><button class="lv-x" type="button" data-lv="close" aria-label="Cerrar">×</button></div>
    <div class="lv-board">
      <div class="lv-p"><span class="duel-av">${avatarSVG(normName(A) === me ? game.av : (coachOf(A) || {}).avatar, d0.a.lvl)}</span><b class="lv-na">${esc(A)}</b>${tit('a')}<small>${pw(d0.a)}</small></div>
      <div class="lv-mid"><output class="lv-score" id="lv-score">0–0</output><span class="lv-clock" id="lv-clock">Calentamiento</span></div>
      <div class="lv-p"><span class="duel-av">${avatarSVG(normName(B) === me ? game.av : (coachOf(B) || {}).avatar, d0.b.lvl)}</span><b class="lv-nb">${esc(B)}</b>${tit('b')}<small>${pw(d0.b)}</small></div>
    </div>
    <div class="lv-rink${estDark(E.a)}" style="${estStyle(E.a)}">${rinkSVG(E.a.fic, E.b.fic)}<div class="lv-flash" id="lv-flash" aria-hidden="true"></div><div class="lv-pops" id="lv-pops" aria-live="polite"></div></div>
    <div class="lv-dice"><div class="lv-die"><span class="die a" id="lv-da">·</span><small id="lv-ca">&nbsp;</small></div><span class="lv-phase" id="lv-phase">Saque inicial</span><div class="lv-die"><span class="die b" id="lv-db">·</span><small id="lv-cb">&nbsp;</small></div></div>
    <div class="lv-act" id="lv-act"></div>
    <ol class="lv-feed" id="lv-feed" aria-live="polite"></ol>
    <div class="lv-skip"><button class="btn small ghost" type="button" data-lv="skip">Sin animaciones</button></div>
  </div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  const $ = q => el.querySelector('#' + q);
  const ball = $('lv-ball'), feed = $('lv-feed'), flash = $('lv-flash'), ta = $('lv-ta'), tb = $('lv-tb'), pops = $('lv-pops');
  let instant = false, closed = false;
  const say = (min, txt, cls) => { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = `<span class="lv-min">${esc(min)}</span><span>${txt}</span>`; feed.prepend(li); };
  const ballTo = pt => { ball.style.transform = `translate(${pt[0]}px,${pt[1]}px)`; };
  const shift = s => { ta.style.transform = s === 'a' ? `translateX(${RINK.shift}px)` : s === 'b' ? 'translateX(-40px)' : ''; tb.style.transform = s === 'b' ? `translateX(-${RINK.shift}px)` : s === 'a' ? 'translateX(40px)' : ''; };
  const pos = (s, i) => { const p = (s === 'a' ? RINK.A : RINK.B)[i]; return [p[0] + (s === 'a' ? RINK.shift : -RINK.shift), p[1]]; };
  const lastDice = {};
  const spin = (n, fin, cls) => { lastDice[n] = fin; const e = $(n); e.className = 'die ' + cls; if (instant) { e.textContent = fin; return; } e.classList.add('roll'); let k = 0; const iv = setInterval(() => { e.textContent = 1 + Math.floor(Math.random() * 20); if (++k > 9) { clearInterval(iv); e.textContent = fin; e.classList.remove('roll'); } }, 60); liveT.push(iv); };
  const pop = (k, t) => { if (instant || !t) return; const c = document.createElement('span'); c.className = 'lv-pop ' + k; c.textContent = t; pops.appendChild(c); liveT.push(setTimeout(() => c.remove(), 1900)); };
  const goal = k => {
    if (instant) return;
    const cel = estItem((E[k] || {}).cel), fx = (E[k] || {}).efx || '';
    flash.textContent = cel ? cel.n : '¡GOL!'; flash.className = `lv-flash on ${k} fx-${fx}`;
    const g = $(k === 'a' ? 'lv-goal-b' : 'lv-goal-a'); g.classList.add('hit');
    goalFx(el.querySelector('.lv-rink'), k, $('lv-score'), el.querySelectorAll('.lv-p')[k === 'a' ? 0 : 1]);
    liveT.push(setTimeout(() => { flash.className = 'lv-flash'; g.classList.remove('hit'); }, 1700));
  };
  const score = (ga, gb) => { $('lv-score').textContent = `${ga}–${gb}`; };
  // reproductor por tramos
  let cur = [], curDone = null;
  const finishCur = () => { cur.forEach(c => { if (!c.done) { c.done = true; c.fn(); } }); const dn = curDone; curDone = null; if (dn) dn(); };
  const play = (steps, done) => {
    cur = steps.map(s => ({ fn: s.fn, done: false })); curDone = done || null;
    if (instant) { finishCur(); return; }
    let t = 0; steps.forEach((s, k) => { t += s.dt; liveT.push(setTimeout(() => { const c = cur[k]; if (c && !c.done) { c.done = true; c.fn(); } }, t)); });
    liveT.push(setTimeout(() => { if (curDone) finishCur(); }, t + 40));
  };
  const seg = () => { const S = []; S.at = (dt, fn) => S.push({ dt, fn }); return S; };
  const GOAL = ['A la escuadra.', 'Por bajo, entre las piernas.', 'Disparo seco desde la frontal.', 'Remata el rechace.'];
  function segIntro() { const S = seg(); S.at(300, () => say("0'", replay ? `Repetición: <b>${esc(A)}</b> contra <b>${esc(B)}</b>.` : `<b>${esc(A)}</b> reta a <b>${esc(B)}</b>. 8 posesiones, 4 cada uno.`)); return S; }
  function segPos(d, x) {
    const S = seg(), at = x.at, df = at === 'a' ? 'b' : 'a', min = MIN3[x.p] + "'";
    const dA = at === 'a' ? 'lv-da' : 'lv-db', dD = at === 'a' ? 'lv-db' : 'lv-da', cA = at === 'a' ? 'lv-ca' : 'lv-cb', cD = at === 'a' ? 'lv-cb' : 'lv-ca';
    const pv = d.P[x.p - 1], sc = { a: pv ? pv.ga : 0, b: pv ? pv.gb : 0 }, inc = k => { sc[k]++; score(sc.a, sc.b); };
    const goalPt = at === 'a' ? [380, 100] : [20, 100], keeper = at === 'a' ? [356, 112] : [44, 112], wide = at === 'a' ? [392, 40] : [8, 40];
    S.at(500, () => { $('lv-clock').textContent = min; $('lv-phase').innerHTML = `${esc(PARTE3(x.p))}<br><b>${at === 'a' ? '→' : '←'} ataca ${esc(N[at].split(' ')[0])}</b>`; ['lv-da', 'lv-db'].forEach(n => { $(n).textContent = '·'; }); $('lv-ca').innerHTML = '&nbsp;'; $('lv-cb').innerHTML = '&nbsp;'; ballTo(pos(at, pick([0, 1]))); shift(null); });
    S.at(500, () => say(min, `${jugIcon((JUG3[x.oa] || {}).ic)} <b>${esc(N[at])}</b>: ${esc(jugN(x.oa))} · ${jugIcon((JUG3[x.od] || {}).ic)} <b>${esc(N[df])}</b>: ${esc(jugN(x.od))}`, 'pl'));
    if (x.ev && x.ev.k === 'azul') S.at(500, () => { pop(x.ev.s, 'Tarjeta azul: uno más'); say(min, esc(evLine(d, x)), 'pw'); });
    S.at(500, () => { spin(dA, x.ra, at); spin(dD, x.rd, df); });
    S.at(900, () => {
      $(cA).innerHTML = `${esc(jugN(x.oa))} · <b>${x.ta}</b>`; $(cD).innerHTML = `${esc(jugN(x.od))} · <b>${x.td}</b>`;
      x.pw.forEach((z, k) => liveT.push(setTimeout(() => pop(z.s, z.t), instant ? 0 : k * 350)));
      shift(at); ballTo(pos(at, 2 + pick([0, 1])));
    });
    S.at(700 + x.pw.length * 250, () => {
      if (x.res === 'gol') { ballTo(goalPt); goal(at); inc(at); say(min, `<b>¡Gol de ${esc(N[at])}!</b> ${pick(GOAL)}`, 'gol'); }
      else if (x.res === 'fuera') { ballTo(wide); say(min, 'Tiro fuera.'); }
      else if (x.res === 'parada') { ballTo(keeper); say(min, `Para ${esc(N[df])}.`); }
      else { ballTo(pos(df, 2)); shift(df); say(min, esc(posLine(d, x)), x.contra && x.contra.gol ? 'gol' : ''); }
    });
    if (x.contra) S.at(800, () => { const g2 = df === 'a' ? [380, 100] : [20, 100]; ballTo(x.contra.gol ? g2 : (df === 'a' ? [356, 112] : [44, 112])); if (x.contra.gol) { goal(df); inc(df); } });
    if (x.ev && x.ev.k !== 'azul') {
      const right = x.ev.s === 'a', spot = x.ev.k === 'penalti' ? (right ? [322, 100] : [78, 100]) : (right ? [300, 70] : [100, 70]);
      S.at(1000, () => { shift(null); ballTo(spot); say(min, `${x.ev.k === 'falta' ? 'Falta directa' : 'Penalti'} para <b>${esc(N[x.ev.s])}</b>.`); });
      S.at(900, () => { ballTo(x.ev.gol ? (right ? [380, 100] : [20, 100]) : (right ? [358, 92] : [42, 92])); if (x.ev.gol) { goal(x.ev.s); inc(x.ev.s); } say(min, esc(evLine(d, x)), x.ev.gol ? 'gol' : ''); });
    }
    S.at(300, () => score(x.ga, x.gb));
    return S;
  }
  function segEnd(d, rec) {
    const S = seg();
    if (d.pen) {
      S.at(500, () => { $('lv-clock').textContent = 'Penaltis'; $('lv-phase').textContent = 'Penaltis'; shift(null); say("50'", `Empate a ${d.ga}. <b>Penaltis</b>.`); });
      d.pens.forEach(([pa, pb], k) => {
        S.at(700, () => { ballTo([322, 100]); spin('lv-da', pa, 'a'); spin('lv-db', pb, 'b'); $('lv-ca').innerHTML = `penalti ${k + 1}`; $('lv-cb').innerHTML = `penalti ${k + 1}`; });
        S.at(1000, () => { const sw = pa > pb ? 'a' : pb > pa ? 'b' : null; ballTo(sw === 'b' ? [20, 100] : [380, 100]); if (sw) goal(sw); say('Pen.', sw ? `<b>${esc(N[sw])}</b> marca (${pa}–${pb}).` : `Los dos marcan (${pa}–${pb}). Otro.`, sw ? 'gol' : ''); });
      });
    }
    S.at(800, () => {
      $('lv-score').textContent = scoreTxt(d); $('lv-clock').textContent = 'Final'; $('lv-phase').textContent = 'Final'; shift(null); ballTo([200, 100]);
      const meIn = normName(A) === me || normName(B) === me, won = normName(d.win) === me;
      say('Final', `<b>${esc(d.win)}</b> gana ${scoreTxt(d)}.`, 'fin');
      $('lv-act').innerHTML = `<p class="lv-res">${meIn ? (won ? `<b>¡Has ganado!</b>${rec && rec.coins ? ` +${rec.coins} monedas.` : ''}${rec && rec.cofre ? ' <b>+1 cofre.</b>' : ''}` : '<b>Has perdido.</b> Pide la revancha.') : `<b>Gana ${esc(d.win)}</b>`}</p>
        <div class="row">${meIn ? `<button class="btn" type="button" data-lv="rev" data-name="${esc(rivalName)}">Revancha</button>` : ''}${rec && rec.cofre && !replay ? '<button class="btn" type="button" data-lv="cofre">Tirar el penalti del cofre</button>' : ''}<button class="btn primary" type="button" data-lv="close">Cerrar</button></div>`;
    });
    return S;
  }
  // ---- decisiones del míster, posesión a posesión ----
  const myPlan = { at: 'J', de: 'P', desesp: false, o: [], charla: -1, estrella: -1 }, rivPicks = {};
  let rivPlan = cfg.online ? null : (cfg.rivalPlan || null);
  const planOf = k => k === mySide ? myPlan : (rivPlan || { at: 'J', de: 'P', desesp: false, o: Array.from({ length: POS_N }, (_, i) => (rivPicks[i] || {}).o || ''), charla: Object.keys(rivPicks).map(Number).find(i => rivPicks[i].c) ?? -1, estrella: Object.keys(rivPicks).map(Number).find(i => rivPicks[i].e) ?? -1 });
  const duelNow = () => playDuel(Object.assign({}, cfg.PA, { plan: planOf('a') }), Object.assign({}, cfg.PB, { plan: planOf('b') }), id);
  let sel = { c: false, e: false }, step = 0, waiting = false, unsub = null, fallbackT = null, finished = false, lastD = null;
  function promptHTML(p, wait) {
    if (wait) return `<p class="lv-wait">Esperando a ${esc(rivalName.split(' ')[0])}…</p><div class="row"><button class="btn small ghost" type="button" data-lv="vspiz">Jugar contra su pizarra</button></div>`;
    const atk = posAtk(p) === mySide, prev = lastD && lastD.P[p - 1], g = prev ? { a: prev.ga, b: prev.gb } : { a: 0, b: 0 };
    const losingLast = atk && p >= POS_N - 2 && g[mySide] < g[other];
    const used = myPlan.o.slice(0, p);
    const L = (atk ? ATAQUES : DEFENSAS).filter(j => !j.last || losingLast);
    const canE = myPlan.estrella < 0 && balance() >= PRECIO_ESTRELLA, canC = myPlan.charla < 0;
    return `<p class="lv-q"><b>${atk ? 'Tienes la bola' : 'Defiendes'}</b> <span class="sub">· posesión ${p + 1} de ${POS_N}</span></p>
      <div class="lv-ord">${L.map(j => { const off = j.once && used.includes(j.id); return `<button class="lv-o${j.last ? ' hot' : ''}" type="button" data-lv-o="${j.id}"${off ? ' disabled' : ''}>${jugIcon(j.ic)}<b>${esc(j.n)}</b><span class="dz">${esc(j.dado)}</span><small>${esc(off ? 'Ya la has usado.' : j.d)}</small></button>`; }).join('')}</div>
      <div class="lv-cards"><button class="chip" type="button" data-lv-card="c" aria-pressed="${sel.c}"${canC ? '' : ' disabled'}>Charla +2${canC ? '' : ' · usada'}</button>
        <button class="chip" type="button" data-lv-card="e" aria-pressed="${sel.e}"${canE || sel.e ? '' : ' disabled'}>Jugador estrella · ${PRECIO_ESTRELLA} monedas${myPlan.estrella >= 0 ? ' · usada' : ''}</button></div>`;
  }
  const showPrompt = () => { sel = { c: false, e: false }; $('lv-act').innerHTML = promptHTML(step, false); };
  function runPos(p) {
    const d = duelNow(); lastD = d;
    $('lv-act').innerHTML = '';
    play(segPos(d, d.P[p]), () => { if (p < POS_N - 1) { step = p + 1; showPrompt(); } else finish(d); });
  }
  function finish(d) {
    if (finished) return; finished = true;
    const x = { id, ts: Date.now(), fecha: isoToday(), r: d };
    saveAmResult(x, mySide);
    if (cfg.online && window.SMB_CLOUD) window.SMB_CLOUD.match.update(id, { estado: 'fin' }).catch(() => {});
    if (unsub) { unsub(); unsub = null; }
    play(segEnd(d, x));
  }
  const tryResolve = () => { if (waiting && rivPicks[step]) { waiting = false; clearTimeout(fallbackT); runPos(step); } };
  function vsPizarra() {
    if (rivPlan) return;
    rivPlan = pizarraDe(rivalName) || planAzar(id + '|rv');
    rivPlan.o = Array.from({ length: POS_N }, (_, i) => (rivPicks[i] || {}).o || '');
    $('lv-tag').textContent = 'Amistoso · contra su pizarra';
    if (cfg.online && window.SMB_CLOUD) window.SMB_CLOUD.match.update(id, { estado: 'pizarra' }).catch(() => {});
    if (unsub) { unsub(); unsub = null; }
    if (waiting) { waiting = false; clearTimeout(fallbackT); runPos(step); }
  }
  function choose(o) {
    myPlan.o[step] = o; if (sel.c) myPlan.charla = step; if (sel.e) { myPlan.estrella = step; game.spent += PRECIO_ESTRELLA; saveGame(); }
    if (!cfg.online || rivPlan) { runPos(step); return; }
    window.SMB_CLOUD.match.update(id, { [mySide + step]: `${o}|${sel.c ? 1 : 0}|${sel.e ? 1 : 0}` }).catch(() => {});
    waiting = true; $('lv-act').innerHTML = promptHTML(step, true);
    fallbackT = setTimeout(() => { if (waiting) vsPizarra(); }, 60000);
    tryResolve();
  }
  // ---- arranque según el modo ----
  if (replay) {
    const d = replay.r, steps = [...segIntro(), ...d.P.flatMap(x => segPos(d, x)), ...segEnd(d, replay)];
    $('lv-act').innerHTML = '';
    play(steps);
  } else if (cfg.online) {
    unsub = window.SMB_CLOUD.match.listen(id, m => {
      if (!m || closed) return;
      for (let i = 0; i < POS_N; i++) { const v = m[other + i]; if (v && !rivPicks[i]) { const [o, c, e] = v.split('|'); rivPicks[i] = { o, c: c === '1', e: e === '1' }; } }
      if (mySide === 'a' && step === 0 && !cfg.online.accepted) {
        if (m.estado === 'jugando') { cfg.online.accepted = true; clearTimeout(fallbackT); $('lv-tag').textContent = 'Amistoso · a la vez'; say("0'", `<b>${esc(B)}</b> acepta. ¡A jugar a la vez!`); showPrompt(); }
        else if (m.estado === 'rechazado') { clearTimeout(fallbackT); say("0'", `${esc(B)} no puede ahora: juegas contra su pizarra.`); vsPizarra(); showPrompt(); }
      }
      if (m.estado === 'pizarra' && !rivPlan && mySide === 'b') { say('—', `${esc(A)} se ha ido: sigues contra su pizarra.`); rivPlan = pizarraDe(A) || planAzar(id + '|rv'); rivPlan.o = Array.from({ length: POS_N }, (_, i) => (rivPicks[i] || {}).o || ''); if (waiting) { waiting = false; clearTimeout(fallbackT); runPos(step); } }
      tryResolve();
    });
    play(segIntro(), () => {
      if (mySide === 'a' && !cfg.online.accepted) {
        $('lv-act').innerHTML = `<p class="lv-wait">Le ha llegado el reto a ${esc(B.split(' ')[0])}. Si tiene la app abierta, jugáis a la vez.</p><div class="row"><button class="btn small" type="button" data-lv="vspiz">No esperar: jugar contra su pizarra</button></div>`;
        fallbackT = setTimeout(() => { if (!cfg.online.accepted && !rivPlan) { say("0'", `${esc(B)} no contesta: juegas contra su pizarra.`); vsPizarra(); showPrompt(); } }, 60000);
      } else showPrompt();
    });
  } else play(segIntro(), showPrompt);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-lv], [data-lv-o], [data-lv-card]'); if (!b) return;
    if (b.dataset.lvO) { if (!waiting && !b.disabled) choose(b.dataset.lvO); return; }
    if (b.dataset.lvCard) { sel[b.dataset.lvCard] = !sel[b.dataset.lvCard]; $('lv-act').innerHTML = promptHTML(step, false); return; }
    const a = b.dataset.lv;
    if (a === 'close') { closed = true; if (unsub) unsub(); clearTimeout(fallbackT); if (cfg.online && !finished && window.SMB_CLOUD) window.SMB_CLOUD.match.update(id, { estado: 'pizarra' }).catch(() => {}); closeLive(); }
    else if (a === 'skip') { liveT.forEach(clearTimeout); liveT = []; instant = true; el.classList.add('instant'); flash.className = 'lv-flash'; pops.innerHTML = ''; finishCur(); ['lv-da', 'lv-db'].forEach(n => { const q = $(n); q.classList.remove('roll'); if (lastDice[n] != null) q.textContent = lastDice[n]; }); }
    else if (a === 'vspiz') { clearTimeout(fallbackT); const first = step === 0 && !waiting && mySide === 'a' && cfg.online && !cfg.online.accepted; vsPizarra(); if (first) showPrompt(); }
    else if (a === 'rev') { const n = b.dataset.name; closed = true; if (unsub) unsub(); closeLive(false); retar(n); }
    else if (a === 'cofre') { closed = true; if (unsub) unsub(); closeLive(false); openCofre(); }
  });
  liveKey = e => { if (e.key === 'Escape') el.querySelector('[data-lv="close"]').click(); };
  document.addEventListener('keydown', liveKey);
  el.querySelector('.lv-x').focus();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { instant = true; el.classList.add('instant'); }
}

const amClick = e => {
  const b = e.target.closest('[data-am]'); if (!b) return;
  if (b.dataset.am === 'retar') retar(b.dataset.name);
  else if (b.dataset.am === 'ver') { const x = amistosos().find(y => y.id === b.dataset.id); if (x) openLive(x, false); }
};
['v-liga', 'v-inicio'].forEach(id => document.getElementById(id).addEventListener('click', amClick));

