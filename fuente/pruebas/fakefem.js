// Backend simulado de la app de jugadoras (femenino/): misma interfaz que firebaseBackend() de femenino/app.js
// y las mismas reglas que femenino/firestore.rules. Guarda en localStorage('__fakefem').
(function () {
  const ADMIN = ['adminuid0000000000000000001'];
  const load = () => { try { return JSON.parse(localStorage.getItem('__fakefem') || '{}'); } catch (e) { return {}; } };
  let db = load();
  const save = () => localStorage.setItem('__fakefem', JSON.stringify(db));
  const users = JSON.parse(localStorage.getItem('__fakefemusers') || '{}');
  let cur = JSON.parse(localStorage.getItem('__fakefemcur') || 'null');
  const authSubs = [], subs = [];
  const perm = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  const isAdmin = u => !!u && ADMIN.includes(u.uid);
  const acc = u => u && db['acceso/' + u.uid];
  const activa = u => !!acc(u) && acc(u).activa === true;
  function canRead(p, u) {
    const s = p.split('/');
    if (s[0] === 'jugadoras' || s[0] === 'acceso') return isAdmin(u) || (!!u && u.uid === s[1]);
    if (s[0] === 'equipos') return isAdmin(u) || (activa(u) && acc(u).equipo === s[1]);
    if (s[0] === 'registros') return isAdmin(u) || (!!u && u.uid === s[1]);
    if (s[0] === 'valoraciones') return isAdmin(u);
    if (s[0] === 'juego' || s[0] === 'duelos') return activa(u) || isAdmin(u);
    return false;
  }
  function canWrite(p, u, data) {
    const s = p.split('/'), del = data === undefined;
    if (s[0] === 'jugadoras') return del ? (isAdmin(u) || (!!u && u.uid === s[1])) : (!!u && u.uid === s[1]);
    if (s[0] === 'acceso' || s[0] === 'equipos' || s[0] === 'valoraciones') return isAdmin(u);
    if (s[0] === 'registros') return del ? (isAdmin(u) || (!!u && u.uid === s[1])) : (activa(u) && u.uid === s[1]);
    const reto = activa(u) || isAdmin(u);
    if (s[0] === 'juego') return del ? (isAdmin(u) || (!!u && u.uid === s[1])) : (reto && u.uid === s[1]);
    if (s[0] === 'duelos') { const old = db[p];
      if (del) return isAdmin(u) || (!!u && !!old && (old.a === u.uid || old.b === u.uid));
      if (!old) return reto && data.a === u.uid;
      const nu = Object.assign({}, old, data);   // merge
      return reto && (u.uid === old.a || u.uid === old.b) && nu.a === old.a && nu.b === old.b && nu.seed === old.seed; }
    return false;
  }
  // listar una colección: la regla se mira sobre un documento cualquiera de ella (como hace Firestore con las consultas)
  const canList = p => p.split('/').length % 2 === 1 && (isAdmin(cur) || canRead(p + '/x', cur));
  const colDocs = p => Object.keys(db).filter(k => k.startsWith(p + '/') && k.split('/').length === p.split('/').length + 1).map(k => ({ id: k.split('/').pop(), data: JSON.parse(JSON.stringify(db[k])) }));
  function notify() {
    save();
    subs.slice().forEach(sb => {
      if (sb.dead) return;
      if (sb.kind === 'col' ? !canList(sb.p) : !canRead(sb.p, cur)) { sb.dead = true; sb.er && sb.er(perm()); return; }
      const v = sb.kind === 'col' ? JSON.stringify(colDocs(sb.p)) : JSON.stringify(db[sb.p] ?? null);
      if (v !== sb.last) { sb.last = v; sb.cb(JSON.parse(v)); }
    });
  }
  function listen(kind, p, cb, er) {
    const sb = { kind, p, cb, er, last: undefined };
    setTimeout(() => { if (kind === 'col' ? !canList(p) : !canRead(p, cur)) { sb.dead = true; er && er(perm()); return; } subs.push(sb); notify(); }, 5);
    return () => { sb.dead = true; };
  }
  const writeOne = (p, data, merge) => { if (!canWrite(p, cur, data)) throw perm(); db[p] = merge ? Object.assign({}, db[p] || {}, data) : data; };
  function signIn(u) { cur = u; localStorage.setItem('__fakefemcur', JSON.stringify(cur)); authSubs.forEach(f => setTimeout(() => f(cur), 5)); }
  window.SMBF_BACKEND = {
    onAuth: cb => { authSubs.push(cb); setTimeout(() => cb(cur), 5); },
    google: async () => { const u = window.__nextGoogle; if (!u) throw { code: 'auth/popup-closed-by-user' }; signIn(u); },
    emailIn: async (email, pass) => { const u = users[email]; if (!u || u.pass !== pass) throw { code: 'auth/invalid-credential' }; signIn({ uid: u.uid, email, name: '' }); },
    emailUp: async (email, pass) => { if (users[email]) throw { code: 'auth/email-already-in-use' }; if (pass.length < 6) throw { code: 'auth/weak-password' }; users[email] = { uid: 'u' + Math.random().toString(36).slice(2, 12), pass }; localStorage.setItem('__fakefemusers', JSON.stringify(users)); signIn({ uid: users[email].uid, email, name: '' }); },
    reset: async () => {},
    signOut: async () => { subs.forEach(s => s.dead = true); signIn(null); },
    listenDoc: (p, cb, er) => listen('doc', p, cb, er),
    listenCol: (p, cb, er) => listen('col', p, cb, er),
    getDoc: async p => { if (!canRead(p, cur)) throw perm(); return db[p] ? JSON.parse(JSON.stringify(db[p])) : null; },
    getCol: async p => { if (!canList(p)) throw perm(); return colDocs(p); },
    set: async (p, d) => { writeOne(p, JSON.parse(JSON.stringify(d))); notify(); },
    merge: async (p, d) => { writeOne(p, JSON.parse(JSON.stringify(d)), true); notify(); },
    del: async p => { if (!canWrite(p, cur)) throw perm(); delete db[p]; notify(); },
    batch: async ops => {
      const snap = JSON.stringify(db);
      try { ops.forEach(o => { if (o.op === 'del') { if (!canWrite(o.path, cur)) throw perm(); delete db[o.path]; } else writeOne(o.path, JSON.parse(JSON.stringify(o.data))); }); }
      catch (e) { db = JSON.parse(snap); throw e; }
      notify();
    },
  };
  window.__fake = { put: (p, patch) => { db[p] = Object.assign({}, db[p] || {}, patch); notify(); }, db: () => db, uidOf: email => (users[email] || {}).uid };
})();
