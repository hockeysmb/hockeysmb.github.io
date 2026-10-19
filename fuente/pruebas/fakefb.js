// Backend simulado para probar la versión web sin Firebase: misma interfaz que firebaseBackend() en cloud.js
// y las mismas reglas de acceso que firestore.rules. Guarda en localStorage('__fakedb') para sobrevivir a recargas.
(function () {
  const DT = ['dtuid000000000000000000000001'];
  const load = () => { try { return JSON.parse(localStorage.getItem('__fakedb') || '{}'); } catch (e) { return {}; } };
  let db = load();
  const save = () => localStorage.setItem('__fakedb', JSON.stringify(db));
  const users = JSON.parse(localStorage.getItem('__fakeusers') || '{}');   // email -> {uid, pass, name}
  let cur = JSON.parse(localStorage.getItem('__fakecur') || 'null');
  const authSubs = [], subs = [];
  const perm = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  const isDT = u => !!u && DT.includes(u.uid);
  const isMember = u => !!u && (isDT(u) || ((db['club/state'] || {}).memberUids || []).includes(u.uid) || (u.verified && ((db['club/state'] || {}).memberEmails || []).includes(String(u.email).toLowerCase())));
  function canRead(p, u) {
    const s = p.split('/');
    if (['club', 'tasks', 'historial', 'liga'].includes(s[0])) return isMember(u);
    if (s[0] === 'profiles') return isMember(u) || (u && u.uid === s[1]);
    if (s[0] === 'users') return u && u.uid === s[1];
    if (s[0] === 'votes') return isMember(u);
    if (s[0] === 'shared') return isMember(u);
    if (s[0] === 'partidas') return isMember(u);
    if (s[0] === 'inbox') return isDT(u) || (isMember(u) && s.length === 2 && db[p] && db[p].uid === u.uid);
    return false;
  }
  function canWrite(p, u, data) {
    const s = p.split('/');
    if (['club', 'tasks', 'historial', 'liga'].includes(s[0])) return isDT(u);
    if (s[0] === 'profiles' || s[0] === 'users') return u && u.uid === s[1];
    if (s[0] === 'votes') return isMember(u) && u.uid === s[1];
    if (s[0] === 'partidas') return db[p] ? (!!u && isMember(u) && (db[p].a === u.uid || db[p].b === u.uid)) : (isMember(u) && !!data && data.a === u.uid);
    if (s[0] === 'shared') return db[p] ? (!!u && (db[p].uid === u.uid || isDT(u)) && (!data || data.uid === db[p].uid)) : (isMember(u) && !!data && data.uid === u.uid);
    if (s[0] === 'inbox') return db[p] ? (isDT(u) || (isMember(u) && db[p].uid === u.uid)) : (isMember(u) && data && data.uid === u.uid);
    return false;
  }
  const colDocs = p => Object.keys(db).filter(k => k.startsWith(p + '/') && k.split('/').length === p.split('/').length + 1).map(k => ({ id: k.split('/').pop(), data: JSON.parse(JSON.stringify(db[k])) }));
  function notify() {
    save();
    subs.slice().forEach(sb => {
      if (sb.dead) return;
      if (sb.kind === 'col' ? !canRead(sb.p + '/x', cur) && !(sb.p === 'inbox' && isDT(cur)) : !canRead(sb.p, cur)) { sb.dead = true; sb.er && sb.er(perm()); return; }
      const v = sb.kind === 'col' ? JSON.stringify(colDocs(sb.p)) : JSON.stringify(db[sb.p] ?? null);
      if (v !== sb.last) { sb.last = v; sb.cb(JSON.parse(v)); }
    });
  }
  function listen(kind, p, cb, er) {
    const sb = { kind, p, cb, er, last: undefined };
    setTimeout(() => {
      const ok = kind === 'col' ? (canRead(p + '/x', cur) || (p === 'inbox' && isDT(cur))) : canRead(p, cur);
      if (!ok) { sb.dead = true; er && er(perm()); return; }
      subs.push(sb); notify();
    }, 5);
    return () => { sb.dead = true; };
  }
  const writeOne = (p, data, merge) => {
    if (!canWrite(p, cur, data)) throw perm();
    db[p] = merge ? Object.assign({}, db[p] || {}, data) : data;
  };
  function signIn(u) { cur = u; localStorage.setItem('__fakecur', JSON.stringify(cur)); authSubs.forEach(f => setTimeout(() => f(cur), 5)); }
  window.SMB_BACKEND = {
    onAuth: cb => { authSubs.push(cb); setTimeout(() => cb(cur), 5); },
    google: async () => { const u = window.__nextGoogle; if (!u) throw { code: 'auth/popup-closed-by-user' }; signIn(u); },
    emailIn: async (email, pass) => { const u = users[email]; if (!u || u.pass !== pass) throw { code: 'auth/invalid-credential' }; signIn({ uid: u.uid, email, name: '', verified: !!u.verified, password: true }); },
    emailUp: async (email, pass) => { if (users[email]) throw { code: 'auth/email-already-in-use' }; if (pass.length < 6) throw { code: 'auth/weak-password' }; users[email] = { uid: 'u' + Math.random().toString(36).slice(2, 12), pass, verified: false }; localStorage.setItem('__fakeusers', JSON.stringify(users)); signIn({ uid: users[email].uid, email, name: '', verified: false, password: true }); },
    verify: async () => {},
    refresh: async () => { if (cur && users[cur.email]) { cur = Object.assign({}, cur, { verified: !!users[cur.email].verified }); localStorage.setItem('__fakecur', JSON.stringify(cur)); } return cur; },
    reset: async () => {},
    signOut: async () => { subs.forEach(s => s.dead = true); signIn(null); },
    listenDoc: (p, cb, er) => listen('doc', p, cb, er),
    listenCol: (p, cb, er) => listen('col', p, cb, er),
    getDoc: async p => { if (!canRead(p, cur)) throw perm(); return db[p] ? JSON.parse(JSON.stringify(db[p])) : null; },
    getCol: async p => { if (!canRead(p + '/x', cur)) throw perm(); return colDocs(p); },
    set: async (p, d) => { writeOne(p, JSON.parse(JSON.stringify(d))); notify(); },
    merge: async (p, d) => { writeOne(p, JSON.parse(JSON.stringify(d)), true); notify(); },
    del: async p => { if (!canWrite(p, cur)) throw perm(); delete db[p]; notify(); },
    batch: async ops => {
      // como en Firestore: si una falla, no se aplica ninguna
      const snap = JSON.stringify(db);
      try { ops.forEach(o => { if (o.op === 'del') { if (!canWrite(o.path, cur)) throw perm(); delete db[o.path]; } else writeOne(o.path, JSON.parse(JSON.stringify(o.data))); }); }
      catch (e) { db = JSON.parse(snap); throw e; }
      notify();
    },
  };
  window.__fake = { put: (p, patch) => { db[p] = Object.assign({}, db[p] || {}, patch); notify(); }, db: () => db, verify: email => { users[email].verified = true; localStorage.setItem('__fakeusers', JSON.stringify(users)); } };
})();
