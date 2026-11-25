// ================= Liga: la parte lúdica en su propia pestaña =================
const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5a3 3 0 0 1-3 3M12 14v3.5M8.5 20.5h7M9.5 17.5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function nextJornadaTxt() {
  const n = liga().length + 1;
  if (thisWeekPlayed()) { const d = new Date(mondayISO()); d.setDate(d.getDate() + 7); return `Jornada ${n}: el ${fmtDay(d.toISOString().slice(0, 10))}`; }
  return `Jornada ${n}: pendiente, la juega la Dirección Técnica el lunes`;
}
function standings() {
  const T = {};
  (bank.coaches || []).forEach(c => { T[normName(c.name)] = { name: c.name, pj: 0, g: 0, p: 0, gf: 0, gc: 0 }; });
  liga().forEach(j => j.duels.forEach(d => {
    [[d.a, d.ga, d.gb], [d.b, d.gb, d.ga]].forEach(([x, f, c]) => {
      const r = T[normName(x.name)]; if (!r) return;
      r.pj++; r.gf += f; r.gc += c; if (normName(d.win) === normName(x.name)) r.g++; else r.p++;
    });
  }));
  return Object.values(T).map(r => Object.assign(r, { pts: r.g * 3 }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || a.name.localeCompare(b.name, 'es'));
}
function myDuelTxt() {
  const me = normName(readAuthor()), J = lastJornada(); if (!me || !J) return '';
  const d = J.duels.find(x => normName(x.a.name) === me || normName(x.b.name) === me);
  if (!d) return J.rest.some(r => normName(r) === me) ? `Descansaste en la jornada ${J.n}` : '';
  const won = normName(d.win) === me, rival = normName(d.a.name) === me ? d.b.name : d.a.name;
  return `Jornada ${J.n}: ${won ? 'ganaste' : 'perdiste'} ${scoreTxt(d)} contra ${rival}`;
}
function ligaTeaserHTML() {
  const nCo = (bank.coaches || []).length, jTxt = lgTeaserTxt();
  return `<section class="ses-sec liga-teaser"><div class="lt-head"><h2 class="h-sec">Esta semana en el SMB</h2><button class="btn small" type="button" data-go="liga">Ir a la Liga →</button></div>
    <div class="lt-rows">
      <button class="lt-row" type="button" data-lgtab="hoy">${TROPHY}<span><b>Liga</b><small>${esc(jTxt)}</small></span><span aria-hidden="true">→</span></button>
      ${nCo >= 2 && readAuthor() ? `<button class="lt-row${amNew().length ? ' hot' : ''}" type="button" data-go="liga">${BALL}<span><b>Amistosos</b><small>${esc(amTeaserTxt())}</small></span><span aria-hidden="true">→</span></button>` : ''}
      ${readAuthor() && game.club ? (() => { const c = game.club, l = clTrainsLeft(c), n = clOffersIn().length; return `<button class="lt-row${n ? ' hot' : ''}" type="button" data-club="${n ? 'ofertas' : l ? 'entrenar' : 'mercado'}">${TROPHY}<span><b>Tu plantilla</b><small>${esc(n ? `${n} ${n === 1 ? 'oferta' : 'ofertas'} por tus jugadores` : l ? 'Entrenamiento disponible hoy' : 'Mira los fichajes libres de hoy')}</small></span><span aria-hidden="true">→</span></button>`; })() : ''}
    </div></section>`;
}
function standingsHTML() {
  const rows = standings(), me = normName(readAuthor());
  if (!rows.length) return '';
  return `<section class="ses-sec"><h2 class="h-sec">Clasificación</h2>
    <div class="tbl-wrap"><table class="clasif"><thead><tr><th scope="col">#</th><th scope="col">Entrenador</th><th scope="col" title="Jugados">PJ</th><th scope="col" title="Ganados">G</th><th scope="col" title="Perdidos">P</th><th scope="col" title="Goles a favor y en contra">Goles</th><th scope="col">Pts</th></tr></thead>
    <tbody>${rows.map((r, i) => `<tr${normName(r.name) === me ? ' class="cl-me"' : ''}><td>${i + 1}</td><td><span class="cl-n">${miniAv(r.name)}<span><b>${esc(r.name)}</b><small>${esc(poderOf((coachOf(r.name) || {}).poder).n)}</small></span></span></td><td>${r.pj}</td><td>${r.g}</td><td>${r.p}</td><td>${r.gf}–${r.gc}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div>
    <p class="sub">3 puntos de liga por duelo ganado. Empate a puntos: diferencia de goles y luego goles a favor.</p></section>`;
}
function oldJornadasHTML() {
  const old = liga().slice(0, -1).reverse(); if (!old.length) return '';
  return `<section class="ses-sec"><h2 class="h-sec">Jornadas anteriores</h2>${old.map(J => `<details class="old-j"><summary>Jornada ${J.n} · ${esc(fmtDay(J.fecha))}</summary>
    <ul class="duels">${J.duels.map((d, i) => `<li class="duel"><button type="button" data-wk="duel" data-j="${J.n}" data-i="${i}"><span class="duel-side${normName(d.win) === normName(d.a.name) ? ' w' : ''}">${miniAv(d.a.name)}<span>${esc(d.a.name)}</span></span><span class="duel-score">${scoreTxt(d)}<small>Ver</small></span><span class="duel-side r${normName(d.win) === normName(d.b.name) ? ' w' : ''}"><span>${esc(d.b.name)}</span>${miniAv(d.b.name)}</span></button></li>`).join('')}</ul></details>`).join('')}</section>`;
}
function palmaresHTML() {
  const h = (bank.historial || []).filter(x => x.ej || x.ses).slice().reverse(); if (!h.length) return '';
  return `<section class="ses-sec"><h2 class="h-sec">Elegidos de la semana</h2>
    <p class="sub">El palmarés del cuerpo técnico. Los puntos que dieron siguen contando.</p>
    <ul class="pts-list">${h.map(x => `<li><span>Semana del ${esc(fmtDay(x.desde))}${x.ej ? ` · Ejercicio: ${esc(x.ej.title)}` : ''}${x.ses ? ` · Sesión: ${esc(x.ses.title)} (${esc(x.ses.autor)})` : ''}</span>${x.ses && x.ses.s ? `<button class="btn small" type="button" data-wk="see-pal" data-h="${esc(x.id || '')}">Ver la sesión</button>` : ''}</li>`).join('')}</ul></section>`;
}
function myLigaHTML() {
  const name = readAuthor(); if (!name) return '';
  const c = coachOf(name), rows = standings(), pos = rows.findIndex(r => normName(r.name) === normName(name));
  const lvl = levelOf(clubPoints(name)), pw = poderOf(game.poder || (c && c.poder));
  return `<section class="ses-sec my-liga"><div class="ml-av">${avatarSVG(game.av, lvl)}</div>
    <div class="ml-info"><h2>${esc(name)}</h2>
      ${c ? `<p class="ml-line">${pos >= 0 && liga().length ? `<b>${pos + 1}º</b> de ${rows.length} · ` : ''}${esc(record(name) || 'Sin duelos todavía')}</p>` : `<p class="ml-line">${AUTO_PJ() ? 'Entrando en el vestuario del club…' : pjSentNow() ? 'Personaje enviado a la DT: entras en la liga en cuanto lo añada.' : 'Todavía no estás en el vestuario del club: manda tu personaje a la DT desde Mi perfil para entrar en la liga.'}</p>`}
      <p class="sub">Poder: <b>${esc(pw.n)}</b> · nivel ${lvl}${myDuelTxt() ? ' · ' + esc(myDuelTxt()) : ''}</p>
      ${(game.estilo || {}).tit && estItem(game.estilo.tit) ? `<p class="ml-tit r-${estItem(game.estilo.tit).r}">${esc(estItem(game.estilo.tit).n)}</p>` : ''}
      <div class="actions"><button class="btn small${cofresN() || penFree() ? ' primary' : ''}" type="button" data-cofre>${penBtnLabel()}</button><button class="btn small" type="button" data-liga="poderes">Cambiar mi poder</button><button class="btn small" type="button" data-liga="coleccion">Mi colección</button>${infoBtn('cofres')}${!c && !AUTO_PJ() && !pjSentNow() ? '<button class="btn small primary" type="button" data-liga="vest">Ir a mi perfil</button>' : ''}</div></div></section>`;
}
let lgScroll = false;
// ================= el pabellón (12 nov): la Liga es un pabellón con salas =================
// Cada sala es un botón con su dibujo (SVG propio). La pista lleva a la liga (hoy, calendario, clasificación); el vestuario, a la
// alineación y la plantilla; la sala de pizarra, a la pizarra y el poder; el gimnasio, el despacho y la taquilla abren la plantilla
// (entrenar, mercado y ciudad deportiva); además, pista de amistosos, recreativa y sala de trofeos (votación y palmarés).
const PB_SVG = (vb, inner) => `<svg class="pb-art" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}</svg>`;
const pbFig = (x, y, col, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="0" cy="9" rx="5" ry="1.6" fill="rgba(0,0,0,.18)"/><rect x="-3.2" y="-2" width="6.4" height="9" rx="2.6" fill="${col}"/><circle cx="0" cy="-5" r="3" fill="#f2c9a5"/><path d="M-3 -6.2a3 3 0 0 1 6 0z" fill="#2b2024"/><path d="M3 2l5 5" stroke="#7a4a1e" stroke-width="1.2" stroke-linecap="round"/></g>`;
const pbCup = (x, y, s = 1, c = '#ffcf33') => `<g transform="translate(${x},${y}) scale(${s})"><path d="M-5 -8h10v3a5 5 0 0 1-10 0z" fill="${c}"/><path d="M-5 -7h-2.5a2 2 0 0 0 2.5 3.4M5 -7h2.5a2 2 0 0 1-2.5 3.4" fill="none" stroke="${c}" stroke-width="1.2"/><rect x="-1" y="0" width="2" height="3" fill="${c}"/><rect x="-3.5" y="3" width="7" height="2" rx=".6" fill="#a87800"/><path d="M-3 -7v2.5" stroke="#fff" stroke-opacity=".6" stroke-width=".9"/></g>`;
const PB_ART = {
  pista: () => { let crowd = ''; const cols = ['#681825', '#f6dfe3', '#ffcf33', '#8e2236', '#e9c7a8', '#fff'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 34; i++) crowd += `<circle cx="${8 + i * 10 + (r % 2) * 5}" cy="${20 + r * 8}" r="2.6" fill="${cols[(i * 7 + r * 3) % cols.length]}"/>`;
    return PB_SVG('0 0 340 170', `<defs><linearGradient id="pbg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1218"/><stop offset="1" stop-color="#4a1622"/></linearGradient><linearGradient id="pbg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <rect width="340" height="170" fill="url(#pbg1)"/>
      <rect x="0" y="12" width="340" height="34" fill="#3a1820"/>${crowd}
      <rect x="0" y="44" width="340" height="7" fill="#fff"/><rect x="0" y="44" width="340" height="2.2" fill="#d93a3a"/>
      <text x="60" y="50" font-size="5" font-weight="800" fill="#681825" font-family="sans-serif">SANTA MARÍA LA BLANCA</text><text x="215" y="50" font-size="5" font-weight="800" fill="#681825" font-family="sans-serif">SANTA MARÍA LA BLANCA</text>
      <path d="M28 51h284l28 119H0z" fill="#eef3f8"/>
      <path d="M170 51v119" stroke="#d93a3a" stroke-opacity=".55" stroke-width="1.6"/><ellipse cx="170" cy="104" rx="30" ry="12" fill="none" stroke="#d93a3a" stroke-opacity=".55" stroke-width="1.6"/>
      <path d="M40 78h46l-6 50H24z" fill="#dfe8f2" stroke="#c9d6e4"/><path d="M300 78h-46l6 50h56z" fill="#dfe8f2" stroke="#c9d6e4"/>
      <g stroke="#d93a3a" stroke-width="2.2" fill="rgba(255,255,255,.75)"><path d="M26 92h14v22H22z"/><path d="M314 92h-14v22h18z"/></g>
      ${pbFig(120, 96, '#681825', 1.5)}${pbFig(196, 84, '#24426e', 1.3)}${pbFig(228, 122, '#681825', 1.7)}${pbFig(92, 128, '#24426e', 1.7)}${pbFig(36, 104, '#2e6b46', 1.4)}${pbFig(304, 104, '#c26a1b', 1.4)}
      <circle cx="150" cy="112" r="2.6" fill="#ff7a1a"/>
      <path d="M40 0l40 60H10zM300 0l30 60h-70z" fill="url(#pbg2)"/><path d="M170 0l36 70h-72z" fill="url(#pbg2)"/>`); },
  vestuario: () => PB_SVG('0 0 160 110', `<rect width="160" height="110" fill="#f3e6e1"/><rect y="78" width="160" height="32" fill="#c9a27c"/><path d="M0 78h160" stroke="#a8825e" stroke-width="2"/>
      ${[0, 1, 2, 3, 4].map(i => `<g transform="translate(${8 + i * 30},14)"><rect width="26" height="62" rx="2" fill="${i % 2 ? '#8e2236' : '#681825'}"/><path d="M5 8h16M5 12h16M5 16h16" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/><circle cx="21" cy="36" r="1.6" fill="#ffcf33"/><text x="13" y="54" text-anchor="middle" font-size="9" font-weight="800" fill="rgba(255,255,255,.85)" font-family="sans-serif">${[4, 7, 9, 10, 1][i]}</text></g>`).join('')}
      <rect x="10" y="84" width="140" height="6" rx="2" fill="#7a4a1e"/><path d="M22 90v12M138 90v12M80 90v12" stroke="#5a3513" stroke-width="3"/>
      <g transform="translate(52,60)"><path d="M0 4l6-4h12l6 4-4 6-3-2v18H7V8l-3 2z" fill="#fff" stroke="#681825" stroke-width="1.2"/><path d="M8 0q4 4 8 0" fill="none" stroke="#681825" stroke-width="1.2"/></g>
      <path d="M150 30l-10 62" stroke="#7a4a1e" stroke-width="2.4" stroke-linecap="round"/><path d="M140 92q-4 1-6-3" fill="none" stroke="#1d1418" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="112" cy="98" rx="9" ry="5" fill="#24426e"/><ellipse cx="112" cy="96" rx="9" ry="5" fill="#3b6aa8"/>`),
  pizarra: () => PB_SVG('0 0 160 110', `<rect width="160" height="110" fill="#e8eef0"/><rect y="84" width="160" height="26" fill="#b9c4c9"/>
      <rect x="18" y="10" width="124" height="64" rx="3" fill="#fff" stroke="#6f6365" stroke-width="2.4"/>
      <rect x="28" y="18" width="104" height="48" rx="8" fill="none" stroke="#c9d6e4" stroke-width="1.6"/><path d="M80 18v48" stroke="#d93a3a" stroke-opacity=".6"/><circle cx="80" cy="42" r="7" fill="none" stroke="#d93a3a" stroke-opacity=".6"/>
      <g fill="none" stroke="#681825" stroke-width="2" stroke-linecap="round"><circle cx="46" cy="32" r="3.4"/><circle cx="52" cy="54" r="3.4"/><circle cx="72" cy="42" r="3.4"/></g>
      <g stroke="#24426e" stroke-width="2" stroke-linecap="round"><path d="M98 28l6 6M104 28l-6 6M108 50l6 6M114 50l-6 6"/></g>
      <path d="M50 32q20-12 44 4" fill="none" stroke="#1d1418" stroke-width="1.6" stroke-dasharray="3 2.4"/><path d="M94 36l-5 0 2-4z" fill="#1d1418"/>
      <path d="M56 54q22 10 46 0" fill="none" stroke="#681825" stroke-width="1.6"/><path d="M102 54l-5 2 0-4z" fill="#681825"/>
      <rect x="60" y="74" width="40" height="3" fill="#6f6365"/><rect x="64" y="71" width="9" height="3" rx="1" fill="#d93a3a"/><rect x="76" y="71" width="9" height="3" rx="1" fill="#24426e"/>
      ${[30, 66, 102].map(x => `<g transform="translate(${x},86)"><rect width="24" height="4" rx="1.5" fill="#681825"/><rect y="-12" width="24" height="10" rx="2" fill="#8e2236"/><path d="M3 4v14M21 4v14" stroke="#3a2a2e" stroke-width="2"/></g>`).join('')}`),
  gimnasio: () => PB_SVG('0 0 160 110', `<rect width="160" height="110" fill="#e4ebe6"/><rect y="80" width="160" height="30" fill="#3d4a44"/><rect x="8" y="10" width="64" height="56" rx="2" fill="#cfe3ee" stroke="#9fb4bf" stroke-width="2"/><path d="M14 60l20-44M30 60l14-30" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>
      <g transform="translate(86,26)"><rect width="62" height="5" rx="2" fill="#6f6365"/><rect y="20" width="62" height="5" rx="2" fill="#6f6365"/><path d="M4 0v52M58 0v52" stroke="#4a4144" stroke-width="3"/>
        ${[0, 1, 2].map(i => `<g transform="translate(${8 + i * 18},-7)"><rect x="2" y="2" width="10" height="3" fill="#2b2024"/><rect width="4" height="7" rx="1" fill="#681825"/><rect x="10" width="4" height="7" rx="1" fill="#681825"/></g><g transform="translate(${8 + i * 18},13)"><rect x="2" y="2" width="10" height="3" fill="#2b2024"/><rect width="4" height="7" rx="1" fill="#24426e"/><rect x="10" width="4" height="7" rx="1" fill="#24426e"/></g>`).join('')}</g>
      <rect x="14" y="88" width="70" height="10" rx="3" fill="#2f6fd6"/><rect x="14" y="88" width="70" height="3" rx="1.5" fill="#5a8fe6"/>
      ${[100, 118, 136].map((x, i) => `<path d="M${x} 78l6 20h-12z" fill="#ff8a1f"/><rect x="${x - 2.6}" y="87" width="5.2" height="2.4" fill="#fff"/><rect x="${x - 8}" y="97" width="16" height="2.4" fill="#d96a10"/>`).join('')}
      <g transform="translate(40,74)"><path d="M0 0a8 8 0 1 1 0.1 0z" fill="#1d1418"/><path d="M-4 -12a4 4 0 0 1 8 0" fill="none" stroke="#1d1418" stroke-width="3"/></g>`),
  despacho: () => PB_SVG('0 0 160 110', `<rect width="160" height="110" fill="#efe6d8"/><rect y="84" width="160" height="26" fill="#8a6a4a"/>
      <rect x="10" y="10" width="78" height="50" rx="2" fill="#c79a66" stroke="#8a6a4a" stroke-width="2.4"/>
      ${[[16, 15, '#681825'], [41, 15, '#24426e'], [66, 15, '#2e6b46'], [16, 38, '#c26a1b'], [41, 38, '#681825'], [66, 38, '#7a4fb3']].map(([x, y, c]) => `<g transform="translate(${x},${y})"><rect width="18" height="19" rx="2" fill="#fff"/><circle cx="9" cy="7" r="4" fill="${c}"/><rect x="3" y="13" width="12" height="2" rx="1" fill="#c9b8bb"/><circle cx="9" cy="0" r="1.4" fill="#d93a3a"/></g>`).join('')}
      <rect x="104" y="12" width="44" height="34" rx="2" fill="#bfe0f2" stroke="#8a6a4a" stroke-width="2.4"/><path d="M126 12v34M104 29h44" stroke="#8a6a4a" stroke-width="1.6"/>
      <rect x="20" y="72" width="120" height="8" rx="2" fill="#5a3513"/><path d="M30 80v24M130 80v24" stroke="#3d2410" stroke-width="5"/>
      <rect x="62" y="52" width="36" height="20" rx="2" fill="#2b2024"/><rect x="65" y="55" width="30" height="14" fill="#7fd0ff"/><rect x="56" y="72" width="48" height="2.4" fill="#6f6365"/>
      <rect x="112" y="64" width="16" height="8" rx="2" fill="#681825"/><path d="M114 64q6-8 12 0" fill="none" stroke="#681825" stroke-width="2"/>
      <rect x="28" y="62" width="22" height="10" rx="1" fill="#fff"/><path d="M31 65h16M31 68h11" stroke="#c9b8bb" stroke-width="1.2"/>`),
  taquilla: pct => PB_SVG('0 0 160 110', `<rect width="160" height="110" fill="#fbe8dc"/><rect y="86" width="160" height="24" fill="#b89a86"/>
      <rect x="34" y="34" width="92" height="56" rx="3" fill="#fff" stroke="#681825" stroke-width="2.4"/>
      <path d="M26 34l10-20h88l10 20z" fill="#681825"/>${[0, 1, 2, 3].map(i => `<path d="M${46 + i * 22} 14l-5 20h12l3-20z" fill="#fff"/>`).join('')}
      <rect x="48" y="2" width="64" height="12" rx="3" fill="#1d1418"/><text x="80" y="11" text-anchor="middle" font-size="8" font-weight="800" fill="#ffcf33" font-family="sans-serif">TAQUILLA</text>
      <rect x="48" y="44" width="64" height="26" rx="3" fill="#2b2024"/><circle cx="80" cy="54" r="6" fill="#f2c9a5"/><path d="M70 70a10 9 0 0 1 20 0z" fill="#8e2236"/><path d="M74 52a6 6 0 0 1 12 0z" fill="#3a2a2e"/>
      <rect x="48" y="76" width="64" height="8" rx="4" fill="#eadfe1"/><rect x="48" y="76" width="${Math.max(4, Math.round(64 * pct))}" height="8" rx="4" fill="#ffcf33"/>
      ${[0, 1, 2].map(i => `<ellipse cx="140" cy="${92 - i * 5}" rx="10" ry="3.4" fill="#ffcf33" stroke="#a87800" stroke-width=".8"/>`).join('')}${pct >= 1 ? [0, 1].map(i => `<ellipse cx="18" cy="${92 - i * 5}" rx="10" ry="3.4" fill="#ffcf33" stroke="#a87800" stroke-width=".8"/>`).join('') : ''}`),
  amistosos: () => PB_SVG('0 0 160 110', `<rect width="160" height="110" fill="#cfe6f5"/><path d="M0 44q40-18 80-4t80-8v78H0z" fill="#9fcf9a"/><circle cx="132" cy="20" r="10" fill="#ffe27a"/>
      <rect x="16" y="54" width="128" height="48" rx="10" fill="#eef3f8" stroke="#fff" stroke-width="3"/><path d="M80 54v48" stroke="#d93a3a" stroke-opacity=".5" stroke-width="1.4"/><circle cx="80" cy="78" r="9" fill="none" stroke="#d93a3a" stroke-opacity=".5" stroke-width="1.4"/>
      ${pbFig(56, 74, '#681825', 1.6)}<g transform="translate(104,74) scale(-1.6,1.6)"><ellipse cx="0" cy="9" rx="5" ry="1.6" fill="rgba(0,0,0,.18)"/><rect x="-3.2" y="-2" width="6.4" height="9" rx="2.6" fill="#24426e"/><circle cx="0" cy="-5" r="3" fill="#e9b98f"/><path d="M-3 -6.2a3 3 0 0 1 6 0z" fill="#5a3513"/><path d="M3 2l5 5" stroke="#7a4a1e" stroke-width="1.2" stroke-linecap="round"/></g>
      <circle cx="80" cy="88" r="3" fill="#ff7a1a"/><path d="M70 60l4 6M90 60l-4 6M80 58v7" stroke="#ffcf33" stroke-width="2.2" stroke-linecap="round"/>`),
  recreativa: () => PB_SVG('0 0 160 110', `<rect width="160" height="110" fill="#1b1030"/><rect y="88" width="160" height="22" fill="#2b1a48"/>
      ${[[18, '#ff4d8d', '#7fd0ff'], [62, '#ffcf33', '#9dff8a'], [106, '#7fd0ff', '#ff9a4d']].map(([x, c, s], i) => `<g transform="translate(${x},14)"><path d="M0 8q0-8 8-8h20q8 0 8 8v72H0z" fill="#3a2360" stroke="${c}" stroke-width="1.6"/><rect x="5" y="10" width="26" height="22" rx="2" fill="#0d0718"/><rect x="7" y="12" width="22" height="18" rx="1" fill="${s}" opacity=".85"/>${i === 0 ? '<path d="M10 16h4v3h-4zM16 16h4v3h-4zM22 16h4v3h-4zM13 21h4v3h-4zM19 21h4v3h-4z" fill="#681825"/><circle cx="18" cy="27" r="1.4" fill="#fff"/>' : i === 1 ? '<path d="M12 14h4v4h4v4h-4v4h-4zM22 22h4v8h-4z" fill="#681825"/>' : '<path d="M10 26h3v-3h3v-3h3v-3h3" fill="none" stroke="#681825" stroke-width="2.4"/><circle cx="25" cy="15" r="1.6" fill="#fff"/>'}<rect x="3" y="2" width="30" height="5" rx="2" fill="${c}"/><path d="M0 38l36 0-4 10H4z" fill="#4a2f7a"/><circle cx="11" cy="42" r="2.2" fill="#d93a3a"/><path d="M11 42v-5" stroke="#eee" stroke-width="1.4"/><circle cx="22" cy="43" r="1.8" fill="#ffcf33"/><circle cx="28" cy="42" r="1.8" fill="#7fd0ff"/><rect x="12" y="58" width="12" height="3" rx="1" fill="#0d0718"/></g>`).join('')}
      <circle cx="12" cy="8" r="1.4" fill="#ff4d8d"/><circle cx="56" cy="6" r="1.2" fill="#ffcf33"/><circle cx="150" cy="10" r="1.4" fill="#7fd0ff"/><circle cx="100" cy="5" r="1" fill="#9dff8a"/>`),
  trofeos: () => PB_SVG('0 0 160 110', `<rect width="160" height="110" fill="#2a1218"/><rect y="90" width="160" height="20" fill="#1d0c11"/>
      <rect x="12" y="10" width="136" height="76" rx="3" fill="#4a1622" stroke="#ffcf33" stroke-opacity=".5" stroke-width="1.4"/><rect x="12" y="46" width="136" height="3" fill="#7a4a1e"/><rect x="12" y="83" width="136" height="3" fill="#7a4a1e"/>
      ${pbCup(40, 38, 2.2)}${pbCup(80, 36, 2.8)}${pbCup(120, 38, 2.2, '#d9dde2')}${pbCup(34, 76, 1.8, '#c98a4d')}${pbCup(126, 76, 1.8)}
      <g transform="translate(80,66)"><circle r="9" fill="#ffcf33" stroke="#a87800" stroke-width="1.4"/><path d="M-4 -9l-4 -10h6l2 6 2-6h6l-4 10" fill="#681825"/><text y="3.5" text-anchor="middle" font-size="9" font-weight="800" fill="#681825" font-family="sans-serif">1</text></g>
      <path d="M56 58l8 14h-16zM104 58l8 14H96z" fill="#681825" stroke="#f6dfe3" stroke-width="1"/>`),
};
// las salas: [pestaña o acción, nombre, dibujo, clase]
const PB_ROOMS = [['lgtab:hoy', 'Pista', 'pista', 'r-pista'], ['lgtab:equipo', 'Vestuario', 'vestuario', ''], ['lgtab:pizarra', 'Sala de pizarra', 'pizarra', ''],
  ['club:entrenar', 'Gimnasio', 'gimnasio', ''], ['club:mercado', 'Despacho', 'despacho', ''], ['club:ciudad', 'Taquilla', 'taquilla', ''],
  ['lgtab:recreativa', 'Recreativa', 'recreativa', '']];
const PB_DE = { hoy: 'hoy', calendario: 'hoy', clasificacion: 'hoy', amistosos: 'hoy', equipo: 'equipo', pizarra: 'pizarra', recreativa: 'recreativa' };
// El vestíbulo (12 nov): una sola ilustración y las zonas encima, medidas sobre vestibulo.webp.
// [destino, nombre, estado, izquierda %, arriba %, ancho %, alto %]. Mínimo 56 px de lado en un móvil de 390.
const VB_Z = [
  ['lgtab:equipo', 'Vestuario', 'vestuario', 0, 46.8, 15.1, 19.3],
  ['lgtab:pizarra', 'Pizarra', 'pizarra', 15.1, 46.8, 14.4, 19.3],
  ['lgtab:hoy', 'Pista', 'pista', 29.5, 43.9, 30.9, 23.6],
  ['club:entrenar', 'Gimnasio', 'gimnasio', 60.4, 46.8, 14.4, 19.3],
  ['club:mercado', 'Despacho', 'despacho', 83.5, 46.8, 16.5, 19.3],
  ['club:ciudad', 'Taquilla', 'taquilla', 0, 68.0, 38.6, 24.8, 1],
  ['lgtab:recreativa', 'Recreativa', 'recreativa', 75.4, 66.2, 23.4, 25.9, 1],
];
// en la web, cada sala lleva encima su ilustración (fuente/web/pabellon/*.webp); si no carga, se queda el dibujo de debajo
const pbImg = art => window.SMB_CLOUD ? `<img class="pb-img" src="pabellon/${art}.webp" alt="" decoding="async" onerror="this.remove()">` : '';
function pbEstado(N) {
  const me = readAuthor(), out = {}; if (!me) return out;
  const c = clubOf(), d = cdOf(c), T = cdTaq(d), left = clTrainsLeft(c), inc = clOffersIn().length, nAm = amNew().length;
  out.pista = N.cur && N.next ? [N.next.date === isoToday() ? `Hoy · ${LG_HOUR}:00` : `Jornada ${N.next.k}`, N.next.date === isoToday()] : N.upcoming ? [`Empieza el ${fmtShort(N.upcoming.nextStart || N.upcoming.start)}`, false] : null;
  out.gimnasio = left ? [`${left} ${left === 1 ? 'entreno' : 'entrenos'}`, true] : ['Entrenado', false];
  out.despacho = inc ? [`${inc} ${inc === 1 ? 'oferta' : 'ofertas'}`, true] : null;
  out.taquilla = T.h >= CD_HORAS ? ['Llena: cobra', true] : [`${Math.round(T.h / CD_HORAS * 100)} %`, false];
  out.amistosos = nAm ? [`${nAm} ${nAm === 1 ? 'nuevo' : 'nuevos'}`, true] : null;
  if (nAm) out.pista = [`${nAm} ${nAm === 1 ? 'amistoso' : 'amistosos'}`, true];
  out.vestuario = [`${c.squad.length} jugadores`, false];
  const cf = typeof cofresN === 'function' ? cofresN() : 0; out.pizarra = cf ? [`${cf} ${cf === 1 ? 'cofre' : 'cofres'}`, true] : null;
  out._taq = T.h / CD_HORAS;
  return out;
}
function vestibuloHTML(N) {
  const me = readAuthor(), E = pbEstado(N);
  const Z = VB_Z.filter(z => z[2] !== 'recreativa' || window.SMB_CLOUD);
  const zonas = Z.map(([to, n, art, x, y, w, h, suelo]) => {
    const [k, v] = to.split(':'), st = E[art], hot = !!(st && st[1]);
    return `<button class="vb-z${art === 'pista' ? ' z-grande' : ''}${suelo ? ' z-suelo' : ''}${hot ? ' hot' : ''}" type="button" data-${k}="${v}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%"
      aria-label="${esc(n)}${st ? ' · ' + esc(st[0]) : ''}">${st && suelo ? `<i class="vb-st${hot ? ' on' : ''}">${esc(st[0])}</i>` : ''}<span class="vb-lb">${esc(n)}</span>${st && !suelo ? `<i class="vb-st${hot ? ' on' : ''}">${esc(st[0])}</i>` : ''}</button>`;
  }).join('');
  const chips = Z.map(([to, n, art]) => {
    const [k, v] = to.split(':'), st = E[art];
    return `<li><button type="button" data-${k}="${v}" class="${st && st[1] ? 'hot' : ''}"><b>${esc(n)}</b><small>${esc((st && st[0]) || VB_SUB[art] || '')}</small></button></li>`;
  }).join('');
  return `<div class="vb"><div class="vb-esc">
      <img class="vb-bg" src="pabellon/vestibulo.webp" alt="El vestíbulo del pabellón" decoding="async" onerror="this.closest('.vb').classList.add('sin')">
      <div class="vb-sign vhead"><span class="vb-av">${me ? avatarSVG(game.av, myLevel()) : ''}</span><span><b>Pabellón ${esc(me ? me.split(' ')[0] : 'SMB')}</b><small class="sub">${esc(lgSubTxt(N))}</small></span></div>
      ${zonas}
    </div><ul class="vb-chips">${chips}</ul></div>`;
}
const VB_SUB = { pista: 'Liga, calendario y amistosos', vestuario: 'Tu plantilla y la alineación', pizarra: 'Prepara el duelo y abre cofres', gimnasio: 'Entrena a tus jugadores', despacho: 'Fichajes y mercado', taquilla: 'Tu ciudad deportiva', recreativa: 'Cinco juegos de siempre' };
function pabellonHTML(N) {
  if (window.SMB_CLOUD) return vestibuloHTML(N);
  const me = readAuthor(), E = pbEstado(N), web = !!window.SMB_CLOUD;
  const rooms = PB_ROOMS.filter(r => r[2] !== 'recreativa' || web).map(([to, n, art, cls]) => { const [k, v] = to.split(':'), st = E[art];
    return `<button class="pb-room ${cls}" type="button" data-${k}="${v}">${PB_ART[art](E._taq || 0)}${pbImg(art)}${st ? `<span class="pb-st${st[1] ? ' on' : ''}">${esc(st[0])}</span>` : ''}<span class="pb-n">${n}</span></button>`; }).join('');
  if (web) return `<div class="pb"><div class="pb-roof img"><img class="pb-fach" src="pabellon/fachada.webp" alt="" onerror="this.closest('.pb-roof').classList.add('sin')">
      <div class="pb-sign vhead"><span class="pb-av">${me ? avatarSVG(game.av, myLevel()) : ''}</span><span><b>Pabellón ${esc(me ? me.split(' ')[0] : 'SMB')}</b><small class="sub">${esc(lgSubTxt(N))}</small></span></div></div>
    <div class="pb-grid">${rooms}</div><div class="pb-base"><span></span><span></span><span></span></div></div>`;
  return `<div class="pb"><div class="pb-roof"><svg viewBox="0 0 360 74" preserveAspectRatio="none" aria-hidden="true"><path d="M0 74V46Q180 -26 360 46v28z" fill="#681825"/><path d="M0 50Q180 -22 360 50" fill="none" stroke="#ffcf33" stroke-width="3"/><path d="M0 60Q180 -8 360 60" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.4"/></svg>
      <div class="pb-sign vhead"><span class="pb-av">${me ? avatarSVG(game.av, myLevel()) : ''}</span><span><b>Pabellón ${esc(me ? me.split(' ')[0] : 'SMB')}</b><small class="sub">${esc(lgSubTxt(N))}</small></span></div></div>
    <div class="pb-grid">${rooms}</div><div class="pb-base"><span></span><span></span><span></span></div></div>`;
}
function pbCabecera(N) {
  const cur = PB_DE[ligaTab], room = PB_ROOMS.find(r => r[0] === 'lgtab:' + cur) || PB_ROOMS[0], E = pbEstado(N), web = !!window.SMB_CLOUD;
  const sub = cur === 'hoy' ? `<div class="seg lg-tabs" role="group" aria-label="En la pista">${[['hoy', 'Hoy'], ['calendario', 'Calendario'], ['clasificacion', 'Clasificación'], ['amistosos', 'Amistosos']].map(([k, l]) => `<button type="button" data-lgtab="${k}" aria-pressed="${ligaTab === k}">${l}</button>`).join('')}</div>` : '';
  return `<div class="pb-top"><button class="pb-back" type="button" data-lgtab="pabellon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Pabellón</button><div class="vhead"><div><h1>${room[1]} ${cur === 'hoy' ? infoBtn('liga') : ''}</h1>${cur === 'hoy' ? `<p class="sub">${esc(lgSubTxt(N))}</p>` : ''}</div></div></div>
    <div class="pb-mini" role="group" aria-label="Ir a otra sala">${PB_ROOMS.filter(r => r[2] !== 'recreativa' || web).map(([to, n, art]) => { const [k, v] = to.split(':'), st = E[art]; return `<button type="button" data-${k}="${v}" aria-label="${n}" aria-pressed="${k === 'lgtab' && v === cur}"><span class="pm-fig">${PB_ART[art](E._taq || 0)}${pbImg(art)}${st && st[1] ? '<i></i>' : ''}</span><span class="pm-n">${esc(n)}</span></button>`; }).join('')}</div>${sub}`;
}
function renderLiga() {
  const box = document.getElementById('v-liga'), N = lgNow();
  const inc = clOffersIn().length;
  if (!(ligaTab in PB_DE)) ligaTab = 'pabellon';
  if (ligaTab === 'recreativa' && !window.SMB_CLOUD) ligaTab = 'pabellon';
  if (ligaTab === 'pabellon') { box.innerHTML = pabellonHTML(N); lgScroll = false; return; }
  let body = '';
  if (ligaTab === 'hoy') body = lgHoyHTML(N);
  else if (ligaTab === 'calendario') body = lgCalHTML(N);
  else if (ligaTab === 'clasificacion') body = `${lgClasHTML(N)}${palmaresHTML()}`;
  else if (ligaTab === 'equipo') { const al = alineacionHTML(); body = al || clubTeaserHTML(); }   // 13 nov: «Tu plantilla» repetía lo de Alineación; solo sale si no hay alineación
  else if (ligaTab === 'pizarra') body = `${pizarraHTML()}${myLigaHTML()}`;
  else if (ligaTab === 'amistosos') body = amHTML() || teamHTML();
  else if (ligaTab === 'recreativa') body = recreativaHTML();
  box.innerHTML = `${pbCabecera(N)}
    ${inc && ligaTab !== 'equipo' ? `<button class="notice" type="button" data-club="ofertas">Tienes ${inc} ${inc === 1 ? 'oferta' : 'ofertas'} por tus jugadores <span aria-hidden="true">→</span></button>` : ''}
    ${body}`;
  if (ligaTab === 'calendario' && N.next && !lgScroll) { lgScroll = true; const el = document.getElementById('lgmd-' + N.next.k); if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({ block: 'center' }), 0); }
  if (ligaTab !== 'calendario') lgScroll = false;
}
document.getElementById('v-liga').addEventListener('click', e => {
  const b = e.target.closest('[data-liga]'); if (!b) return;
  vest.tab = b.dataset.liga === 'poderes' ? 'poderes' : b.dataset.liga === 'coleccion' ? 'coleccion' : 'personalizar'; navigate('vestuario');
});

// ================= recreativa (10 nov): cinco juegos arcade de hockey (femenino/arcade.js, los mismos que en la app de jugadoras) =================
// Solo en la web. No dan puntos ni monedas: el récord de cada uno va en su perfil (pj.arc) y todo el cuerpo técnico ve el top 3.
const ARC = [['muro', 'Rompe la defensa', 'Rebota la bola con el stick, tumba la defensa y marca', '🧱'], ['cruza', 'Cruza la pista', 'Llega a la portería sin chocar con las rivales', '🛼'],
  ['conduce', 'Conduce y recoge', 'Recoge bolas sueltas sin chocar con las vallas', '🏒'], ['invasion', 'Invasión rival', 'Para la oleada de rivales antes de que lleguen a tu portería', '🥅'], ['tetris', 'Tetris de hockey', 'Encaja las piezas y limpia líneas', '🟥']];
let arcP = null;
function arcCarga() {
  if (window.SMBArcade) return Promise.resolve();
  if (!arcP) arcP = new Promise((ok, mal) => { const sc = document.createElement('script'); sc.src = 'femenino/arcade.js?v=20261112b'; sc.onload = () => ok(); sc.onerror = () => { arcP = null; mal(new Error('arcade')); }; document.head.appendChild(sc); });
  return arcP;
}
const arcDe = n => normName(n) === normName(readAuthor()) ? (game.arc || {}) : ((coachOf(n) || {}).arc || {});
function arcTop(modo) {
  const names = (bank.coaches || []).map(c => c.name); if (readAuthor() && !names.some(n => normName(n) === normName(readAuthor()))) names.push(readAuthor());
  return names.map(n => [n, arcDe(n)[modo] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
}
function recreativaHTML() {
  const me = readAuthor(), fmt = v => Math.round(v).toLocaleString('es-ES');
  return `<section class="ses-sec"><h2 class="h-sec">Recreativa</h2><p class="sub">Cinco clásicos de recreativa con hockey. Partidas sin límite. No dan puntos ni monedas: solo el récord, y el top 3 lo ve todo el cuerpo técnico. Son los mismos juegos que tienen las jugadoras en su app.</p>
    <div class="arc-grid">${ARC.map(([k, n, d, ic]) => { const top = arcTop(k), mio = arcDe(me)[k] || 0;
      return `<article class="arc-card"><span class="arc-ic" aria-hidden="true">${ic}</span><div><h3>${esc(n)}</h3><p>${esc(d)}</p>
        <div class="arc-rec"><span>Tu récord <b>${mio ? fmt(mio) : '—'}</b></span></div>
        ${top.length ? `<ol class="arc-top">${top.map(([nm, v], i) => `<li><span>${i + 1}. ${esc(nm)}</span><b>${fmt(v)}</b></li>`).join('')}</ol>` : '<p class="sub">Nadie ha jugado todavía.</p>'}
        <div class="actions" style="margin-top:10px"><button class="btn primary" type="button" data-arc="${k}">Jugar</button></div></div></article>`; }).join('')}</div></section>`;
}
async function arcJugar(modo) {
  try { await arcCarga(); } catch (e) { toast('No se ha podido cargar el juego. Revisa la conexión.'); return; }
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSVG(game.av, myLevel()).replace('<svg viewBox', '<svg width="280" height="280" viewBox'));
  window.SMBArcade.jugar({ modo, avatarSrc: src, seed: Math.floor(Math.random() * 2e9), titulo: (ARC.find(x => x[0] === modo) || [])[1] || 'Recreativa', cele: '¡GOL!', sonido: 'smb-arcade-sonido', onEnd: r => {
    const prev = (game.arc || {})[modo] || 0;
    if (r.puntos > prev) { game.arc = Object.assign({}, game.arc || {}, { [modo]: r.puntos }); saveGame(); }
    render(); toast(r.puntos > prev && prev ? `¡Récord nuevo! ${r.puntos.toLocaleString('es-ES')} puntos.` : `${r.puntos.toLocaleString('es-ES')} puntos.`);
  } });
}
document.getElementById('v-liga').addEventListener('click', e => { const b = e.target.closest('[data-arc]'); if (b) arcJugar(b.dataset.arc); });

