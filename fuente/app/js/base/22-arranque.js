// ================= ganchos para la versión web =================
window.SMB = {
  edDiagram: () => ed ? JSON.parse(JSON.stringify(ed.task.diagram)) : null,
  renameCoach: (uid, from, to, okText) => renameCoach(uid, from, to, okText),
  renameDeep: (v, from, to) => renameDeep(v, from, to),
  getBank: () => bank,
  setBank: b => { bank = b; render(); repintarEquipo(); },
  reloadLocal: () => { mine = loadMine(); sessions = loadSes(); game = loadGame(); plan = loadPlan(); render(); },
  render: () => render(),
  saveBankExtra: (extra, okText) => saveBank(bank.tasks, okText, null, extra),
  review: code => { dtTab = 'banco'; navigate('dt'); document.getElementById('review').open = true; const ta = document.getElementById('review-code'); ta.value = code; document.getElementById('btn-review').click(); document.getElementById('review').scrollIntoView({ block: 'start' }); },
  toast: t => toast(t),
  goalFx: (...a) => goalFx(...a),
  clubPublic: () => clPublic(),
  ligaPublic: () => lgTouch(),
  duel: (A, B, seed) => playDuel(A, B, seed),
  avatarSVG: (a, l) => avatarSVG(a, l),
  cat: () => CAT,
  invite: m => inviteReto(m),
};
// ================= arranque =================
const askedZone = (location.hash || '').replace('#', '');
navigate(askedZone === 'dt' ? 'inicio' : askedZone || 'inicio');
let bankReady = false, ownerReady = false;
const maybeResume = () => { if (bankReady && ownerReady && canWriteBank && serieGet()) continueSerie(); };
(window.SMB_CLOUD ? Promise.resolve() : fetch('data/banco.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => { if (j && Array.isArray(j.tasks)) { bank = j; render(); } }).catch(() => {})).finally(() => { bankReady = true; maybeResume(); });
if (window.claude && typeof window.claude.use === 'function') {
  Promise.all([window.claude.use('artifact'), window.claude.use('user')]).then(([art, user]) => {
    artifactApi = art;
    if (!art || !user) return;
    Promise.all([user.isOwner(), user.canEdit()]).then(([o]) => { canWriteBank = !!o; ownerReady = true; if (canWriteBank && askedZone === 'dt') navigate('dt'); else render(); maybeResume(); }).catch(() => {});
  }).catch(() => {});
}
