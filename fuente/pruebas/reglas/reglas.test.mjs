// Pruebas de firestore.rules contra el emulador oficial de Firebase (las corre GitHub Actions:
// desde el entorno de trabajo no se puede descargar el emulador). Mismos casos que web_fase1 con fakefb.js.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const DT = 'NoNYMRFvk4UoVEr4z9qscsxXXFI3', JAC = 'ujacobo', NADIE = 'uintruso';
const env = await initializeTestEnvironment({
  projectId: 'demo-smb',
  firestore: { rules: readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, 'club/state'), { j: '{}', memberUids: [JAC], memberEmails: [], dtUids: [DT],
    eqUids: { 'Benjamín D': [JAC] }, uidEqs: { [JAC]: ['Benjamín D'] } });
  await setDoc(doc(db, 'jugadores/ada'), { n: 'Ada', a: '2016', p: false, nt: '', eq: 'Benjamín A', otros: [], temp: '2026/27', por: DT, ts: 1 });
  await setDoc(doc(db, 'jugadores/dario'), { n: 'Darío', a: '2017', p: false, nt: '', eq: 'Benjamín D', otros: [], temp: '2026/27', por: DT, ts: 1 });
});
const como = uid => env.authenticatedContext(uid, { email_verified: true, email: uid + '@x.es' }).firestore();
const dt = como(DT), jac = como(JAC), nadie = como(NADIE);
const base = { a: '2016', p: false, nt: '', otros: [], temp: '2026/27', ts: 2 };
const casos = [];
const caso = async (nombre, prom) => { try { await prom; casos.push(['ok', nombre]); } catch (e) { casos.push(['MAL', nombre + ' · ' + (e.message || e)]); } };

await caso('la DT crea en cualquier equipo', assertSucceeds(setDoc(doc(dt, 'jugadores/n1'), { ...base, n: 'Uno', eq: 'Benjamín A', por: DT })));
await caso('Jacobo crea en su equipo', assertSucceeds(setDoc(doc(jac, 'jugadores/n2'), { ...base, n: 'Dos', eq: 'Benjamín D', por: JAC })));
await caso('Jacobo no crea en otro equipo', assertFails(setDoc(doc(jac, 'jugadores/n3'), { ...base, n: 'Tres', eq: 'Benjamín A', por: JAC })));
await caso('Jacobo cambia a uno de su equipo', assertSucceeds(setDoc(doc(jac, 'jugadores/dario'), { ...base, n: 'Darío R', a: '2017', eq: 'Benjamín D', por: JAC })));
await caso('Jacobo mete a uno ajeno en su equipo (solo «otros»)', assertSucceeds(setDoc(doc(jac, 'jugadores/ada'), { n: 'Ada', a: '2016', p: false, nt: '', eq: 'Benjamín A', otros: ['Benjamín D'], temp: '2026/27', por: JAC, ts: 3 })));
await caso('Jacobo no cambia el nombre de uno ajeno', assertFails(setDoc(doc(jac, 'jugadores/ada'), { n: 'Ada X', a: '2016', p: false, nt: '', eq: 'Benjamín A', otros: ['Benjamín D'], temp: '2026/27', por: JAC, ts: 4 })));
await caso('Jacobo saca a uno ajeno de su equipo', assertSucceeds(setDoc(doc(jac, 'jugadores/ada'), { n: 'Ada', a: '2016', p: false, nt: '', eq: 'Benjamín A', otros: [], temp: '2026/27', por: JAC, ts: 5 })));
await caso('Jacobo no borra a uno ajeno', assertFails(deleteDoc(doc(jac, 'jugadores/ada'))));
await caso('Jacobo borra a uno suyo', assertSucceeds(deleteDoc(doc(jac, 'jugadores/n2'))));
await caso('un miembro lee jugadores', assertSucceeds(getDoc(doc(jac, 'jugadores/ada'))));
await caso('quien no es miembro no lee jugadores', assertFails(getDoc(doc(nadie, 'jugadores/ada'))));
await caso('un entrenador no escribe club/state', assertFails(setDoc(doc(jac, 'club/state'), { j: '{}' })));
await caso('un miembro crea una ficha de partido suya', assertSucceeds(setDoc(doc(jac, 'fichas/p1'), { uid: JAC, j: '{}', ts: 1 })));
await caso('no se crea una ficha a nombre de otro', assertFails(setDoc(doc(jac, 'fichas/p2'), { uid: DT, j: '{}', ts: 1 })));
await caso('otro miembro corrige la ficha', assertSucceeds(setDoc(doc(dt, 'fichas/p1'), { uid: JAC, j: '{"x":1}', ts: 2 })));

await env.cleanup();
casos.forEach(([e, n]) => console.log(e.padEnd(4), n));
const mal = casos.filter(([e]) => e !== 'ok').length;
console.log(mal ? `\n${mal} reglas no hacen lo que deben` : `\nLas ${casos.length} pruebas de reglas, bien`);
process.exit(mal ? 1 : 0);
