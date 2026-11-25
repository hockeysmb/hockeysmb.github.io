// ================= amistosos: retar cuando quieras y verlo en directo =================
// No cuentan para la liga. Se juegan al momento con el mismo motor que la jornada (sin forma).
// Cada uno guarda los suyos (en la web van en su perfil y los ve todo el cuerpo técnico).
const PTS_AM = 5, AM_DAY = 3, LS_AMV = 'smb-amis-visto';
const BALL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18.5 12.5 9M12.5 9l2-2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M14.5 7c1.5-1.5 3.6-1.9 4.8-.7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="17.5" cy="16.5" r="2.6" fill="currentColor"/></svg>';
const amSeenKey = () => LS_AMV + ':' + normName(readAuthor());
const amSeen = () => { try { return +localStorage.getItem(amSeenKey()) || 0; } catch (e) { return 0; } };
const amShownNew = new Set();
function amistosos() {
  const all = new Map();
  [...(bank.amistosos || []), ...(game.amis || [])].forEach(x => { if (x && x.id && x.r && x.r.a && x.r.b) all.set(x.id, x); });
  return [...all.values()].sort((a, b) => b.ts - a.ts);
}
const amIn = (x, n) => normName(x.r.a.name) === n || normName(x.r.b.name) === n;
const amMine = () => { const me = normName(readAuthor()); return me ? amistosos().filter(x => amIn(x, me)) : []; };
const amNew = () => { const me = normName(readAuthor()), s = amSeen(); return me ? amistosos().filter(x => normName(x.r.b.name) === me && x.ts > s) : []; };
function amTeaserTxt() {
  const n = amNew(); if (n.length) return `${[...new Set(n.map(x => x.r.a.name))].join(', ')} te ${n.length === 1 ? 'ha retado' : 'han retado'}: mira el partido`;
  return 'Reta a quien quieras, cuando quieras, y míralo en directo';
}
function amPlayer(name, mine) {
  const lvl = levelOf(clubPoints(name)), c = coachOf(name), p = mine ? (game.poder || (c && c.poder)) : (c && c.poder);
  return { name: (c && c.name) || name, lvl: duelLvl(lvl), forma: 0, sq: sqOf(name), est: estiloDe(name), poder: p && poderOf(p).lv <= lvl ? poderOf(p).id : 'garra' };
}
const amCoinsToday = () => (game.log || []).filter(l => String(l.key).startsWith('am:' + isoToday())).length;
function amRowHTML(x) {
  const d = x.r, me = normName(readAuthor()), nw = amShownNew.has(x.id);
  const when = x.fecha === isoToday() ? 'Hoy' : fmtShort(x.fecha || new Date(x.ts).toISOString().slice(0, 10));
  return `<li class="duel${amIn(x, me) ? ' mine' : ''}"><button type="button" data-am="ver" data-id="${esc(x.id)}" aria-label="Ver el amistoso ${esc(d.a.name)} contra ${esc(d.b.name)}">
    <span class="duel-side${normName(d.win) === normName(d.a.name) ? ' w' : ''}">${miniAv(d.a.name)}<span>${esc(d.a.name)}</span></span>
    <span class="duel-score">${scoreTxt(d)}<small>${nw ? '<i class="am-new">Nuevo</i>' : esc(when)}</small></span>
    <span class="duel-side r${normName(d.win) === normName(d.b.name) ? ' w' : ''}"><span>${esc(d.b.name)}</span>${miniAv(d.b.name)}</span></button></li>`;
}
function amHTML() {
  const name = readAuthor(), me = normName(name), cs = [...(bank.coaches || [])].filter(c => normName(c.name) !== me).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (!name || !cs.length) return '';
  amNew().forEach(x => amShownNew.add(x.id));
  try { localStorage.setItem(amSeenKey(), String(Date.now())); } catch (e) {}
  const mineL = amMine().slice(0, 8), hot = mineL.some(x => amShownNew.has(x.id)), mineHTML = mineL.length ? `<h3 class="h-sub">${hot ? 'Te han retado' : 'Tus amistosos'}</h3><ul class="duels">${mineL.map(amRowHTML).join('')}</ul>` : '', others = amistosos().filter(x => !amIn(x, me)).slice(0, 5), left = AM_DAY - amCoinsToday();
  return `<section class="ses-sec amis"><div class="j-head"><h2 class="h-sec">Cuerpo técnico · amistosos ${infoBtn('amistosos')}</h2><span class="sub">No cuentan para la liga</span></div>
    <p class="sub">Reta a quien quieras y juégalo en directo: 8 posesiones, 4 cada uno, y en cada una eliges qué hacer. ${retosHoy() < RETOS_GRATIS ? `Te quedan ${RETOS_GRATIS - retosHoy()} retos gratis hoy.` : `Hoy cada reto cuesta ${PRECIO_RETO} monedas.`} ${left > 0 ? `Ganar: +${PTS_AM} monedas` : 'Hoy ya no dan monedas'}${cofreN0() ? '' : ' y un cofre (el primero del día)'}.</p>
    ${hot ? mineHTML : ''}
    <div class="am-rivals" role="group" aria-label="Elige a quién retar">${cs.map(c => `<button class="am-rival" type="button" data-am="retar" data-name="${esc(c.name)}"><span class="duel-av">${avatarSVG(c.avatar, levelOf(clubPoints(c.name)))}</span><b>${esc(c.name)}</b><span class="badge">${esc(LEVELS[levelOf(clubPoints(c.name))].n)}</span><small>${esc(poderOf(c.poder).n)}${record(c.name) ? ' · ' + esc(record(c.name)) : ''}</small><span class="am-go">Retar</span></button>`).join('')}</div>
    ${hot ? '' : mineHTML}
    ${others.length ? `<h3 class="h-sub">En el vestuario</h3><ul class="duels">${others.map(amRowHTML).join('')}</ul>` : ''}
  </section>`;
}

// ---------- el partido en directo ----------
let liveT = [], liveKey = null;
function closeLive(rerender = true) {
  liveT.forEach(clearTimeout); liveT = [];
  const el = document.getElementById('live'); if (el) el.remove();
  if (liveKey) { document.removeEventListener('keydown', liveKey); liveKey = null; }
  document.body.style.overflow = '';
  if (rerender) render();
}
