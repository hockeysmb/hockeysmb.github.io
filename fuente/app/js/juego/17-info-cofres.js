// ================= botón «i»: poco texto a la vista y la explicación completa para quien la quiera =================
const infoBtn = k => `<button class="info-b" type="button" data-info="${k}" aria-label="Más información">i</button>`;
const INFO = {
  liga: () => ['Liga', `<p>Una liga entre todo el cuerpo técnico, a lo Online Soccer Manager: <b>un partido cada día a las ${LG_HOUR}:00</b>, contra cada entrenador a ida y vuelta.</p><ul><li><b>Antes de las ${LG_HOUR}:00</b> deja lista tu alineación, tu pizarra y tu poder (pestaña Equipo). Lo que tengas a esa hora es lo que juega.</li><li><b>Puntos:</b> victoria 3; si se decide en los penaltis, 2 al que gana y 1 al que pierde.</li><li><b>Monedas:</b> +${LG_WIN} por victoria (+${LG_WINP} en los penaltis, +${LG_LOSSP} si pierdes en los penaltis). Al acabar la temporada: ${LG_PRIZE.join(', ')} a los tres primeros y un cofre al campeón.</li><li><b>Temporada:</b> dura lo que tarda en jugar todos contra todos dos veces; la siguiente empieza el lunes. Entra todo el que haya abierto la liga antes de que empiece.</li><li><b>Amistosos:</b> cuando quieras, contra quien quieras, aparte de la liga.</li></ul>`],
  partido: () => ['Cómo es un partido', `<ul><li><b>8 posesiones</b>, 4 para cada uno, alternas.</li>
    <li><b>Con bola</b> eliges cómo atacar y <b>sin bola</b> cómo defender. Cada jugada tira su dado.</li>
    <li><b>Gol</b> si tu ataque suma más que su defensa. Si no, para el portero (o algo peor, según la jugada).</li>
    <li>Al atacar sumas la mitad de tu nivel (de +0 a +4). Tu plantilla suma o resta hasta 2: tu ataque contra su defensa.</li>
    <li><b>Garra del que pierde:</b> +1 al atacar por cada gol que vas perdiendo (máximo +2).</li>
    <li>Puede haber <b>tarjeta azul</b> (el que juega con uno más tira dos dados y se queda el mejor), <b>falta directa</b> (gol con 8 o más) o <b>penalti</b> (gol con 6 o más).</li>
    <li><b>Empate:</b> tanda de penaltis a un dado.</li></ul>`],
  jugadas: () => ['Qué hace cada jugada', `<ul class="jug-legend">${[...ATAQUES, ...DEFENSAS].map(j => `<li>${jugIcon(j.ic)}<b>${esc(j.n)}</b><span class="dz">${ATAQUES.includes(j) ? 'Con bola' : 'Sin bola'} · dado ${esc(j.dado)}</span><small>${esc(j.d)}</small></li>`).join('')}</ul>
    <p class="sub">Ninguna gana siempre: la presión castiga el tiro exterior, el directo se salta la presión, la zona frena el directo y el tiro, la individual anula la ensayada…</p>`],
  pizarra: () => ['Tu pizarra', `<p>Es lo que juega tu equipo cuando no estás delante: en el <b>partido de liga de cada día</b> (a las ${LG_HOUR}:00) y cuando alguien te <b>reta</b> y no contestas.</p>
    <ul><li><b>Con bola:</b> tu ataque de siempre. La jugada ensayada solo se usa una vez; después, posicional.</li>
    <li><b>Sin bola:</b> tu defensa de siempre. Tengo arriba, una vez; después, presión alta.</li>
    <li><b>Si vas perdiendo al final:</b> «A la desesperada» se la juega en tu último ataque.</li></ul><p class="sub">Sin pizarra tu personaje juega variado al azar.</p>`],
  amistosos: () => ['Amistosos', `<ul><li>Retas a cualquiera del cuerpo técnico. Si tiene la app abierta, jugáis <b>a la vez</b>; si no contesta en 60 segundos, juegas contra su pizarra.</li>
    <li><b>${RETOS_GRATIS} retos gratis al día</b>; desde el cuarto, ${PRECIO_RETO} monedas.</li>
    <li>Ganar: +${PTS_AM} monedas (máximo ${AM_DAY} premios al día) y un <b>cofre</b> con el primer amistoso ganado del día.</li>
    <li>En cada posesión puedes usar la <b>charla</b> (+2, gratis, una vez) o el <b>jugador estrella</b> (${PRECIO_ESTRELLA} monedas, repites tu dado, una vez).</li>
    <li>No cuentan para la clasificación.</li></ul>`],
  jornada: () => ['La jornada del lunes', `<ul><li>Cada lunes la DT juega la jornada: todos contra todos a lo largo de la temporada, un partido por semana.</li>
    <li>Juega tu pizarra con tu nivel, tu poder y tu <b>forma</b>: +2 por cada partido del fin de semana ganado o, en formación, con el objetivo cumplido (máximo +4). La apunta la DT.</li>
    <li>Ganar: +${PTS_SEM.duelo} puntos del club y un cofre.</li></ul>`],
  poderes: () => ['Poderes', `<p>Un poder actúa solo en tus partidos y sale en la pista cuando se activa. Se desbloquean con el nivel.</p><ul>${PODERES.map(p => `<li><b>${esc(p.n)}</b> (desde «${esc(LEVELS[p.lv].n)}»): ${esc(p.d)}</li>`).join('')}</ul>`],
  alineacion: () => ['Alineación', `<p>Como en Online Soccer Manager: eliges formación y quién juega en cada puesto. Toca un jugador de la pista para cambiarlo.</p><p>En cada jugador, el <b>número</b> es su media en ese puesto (en naranja si juega fuera de su mejor puesto) y la <b>barra</b> es su forma.</p><ul><li><b>Puestos:</b> el <b>cierre</b> defiende (pesa su defensa), el <b>ala</b> hace de todo y el <b>pivote</b> ataca (pesan su disparo y su técnica). El portero, sus reflejos.</li><li><b>Formaciones:</b> Rombo (equilibrada), Cuadrado (+1 defensa), Ofensiva (+3 ataque, −3 defensa) y Defensiva (+3 defensa, −3 ataque).</li><li>El número de cada jugador es su media <b>en ese puesto</b>. Si sale en naranja, no es su mejor puesto.</li><li>Los huecos que dejes se rellenan solos con el mejor para el puesto. «Automática» lo pone todo así.</li><li>Lo que tengas a las ${LG_HOUR}:00 es lo que juega en la liga.</li></ul>`],
  plantilla: () => ['Tu plantilla', `<p>Eres el míster de una plantilla de jugadores inventados. Juegan 4 de pista y el portero.</p><ul><li><b>Medias:</b> patinaje, técnica, disparo y defensa (el portero, reflejos). Cada jugador sube hasta su <b>potencial</b>.</li><li><b>En los partidos:</b> el ataque de tus titulares contra la defensa del rival suma o resta hasta 2 al dado. El dado sigue mandando.</li><li><b>Entrenar:</b> uno al día. Si das tu entreno de verdad en el <b>modo pista</b>, ganas uno extra y doble.</li><li><b>Forma:</b> baja al jugar y sube al entrenar y con los días.</li><li><b>Fichajes:</b> cada día salen jugadores libres y, a veces, la carta de un entrenador del club. Puedes vender al club al momento o, en la web, poner jugadores a la venta y recibir ofertas del cuerpo técnico.</li></ul>`],
  cofres: () => ['Cofres', `<p>Cada cofre es un <b>penalti</b>: eliges esquina y el portero, que es otro entrenador del club elegido al azar, se tira a un lado también al azar.</p><p>Además, cada 12 horas tienes un <b>penalti gratis</b>, y si no quieres esperar puedes tirarlo por 50 monedas.</p>
    <ul><li><b>Si marcas</b>, premio al azar: ${RAREZAS.map(([, n, w]) => `${n.toLowerCase()} ${w} %`).join(' · ')}. Si ya tienes todo lo de esa rareza, monedas.</li>
    <li><b>Si te lo para</b>, 5 monedas.</li>
    <li><b>Se ganan:</b> uno de bienvenida, uno por nivel, las tres misiones del día, el primer amistoso ganado del día, ganar tu partido de la jornada, cada ejercicio nuevo en el banco y el entreno en pista del día.</li></ul>`],
  coleccion: () => ['Tu colección', `<ul><li><b>Fichas:</b> cómo se ven tus jugadores en la pista. Las ve tu rival.</li><li><b>Celebración y efecto de gol:</b> lo que sale cuando marcas.</li>
    <li><b>Balón y pista:</b> los del que reta.</li><li><b>Título:</b> sale bajo tu nombre en los partidos y en la Liga.</li></ul><p class="sub">Solo se consiguen con cofres. Pulsa uno para ponértelo.</p>`],
  monedas: () => ['Puntos y monedas', `<ul><li><b>Puntos del club:</b> los da lo que aportas (ejercicios en el banco, «En SMB» validado, elegidos de la semana, jornada). Marcan tu nivel y los ve todo el cuerpo técnico.</li>
    <li><b>Monedas:</b> cada punto es una moneda, y ganas más con misiones, amistosos, entrenos en pista y cofres. Se gastan en la tienda del personaje.</li>
    <li>Lo de <b>«De broma»</b> es carísimo a propósito: hay que ahorrar.</li></ul>`],
  equipos: () => ['Equipos', `<ul><li>Los equipos salen del <b>horario</b>: quien aparece en una franja es su entrenador.</li>
    <li>Cada tarjeta dice el próximo partido, el último resultado y cuántas <b>fichas de partido</b> se han hecho de los últimos cuatro.</li>
    <li>Dentro de un equipo: <b>Resumen</b>, <b>Plantilla</b> (cada entrenador cambia la de sus equipos), <b>Partidos</b> y <b>Entrenos</b>.</li>
    <li>Toca una persona, en Entrenadores, para ver lo suyo: sus equipos, cómo va en la liga, sus sesiones y sus ejercicios.</li></ul>`],
  misiones: () => ['Misiones de hoy', `<ul><li>Cada día salen 3 misiones distintas.</li><li>+${PTS_MISION} monedas por cada una y, si haces las tres, +${PTS_MISIONES} y un cofre.</li><li>Se marcan solas al hacerlas.</li></ul>`],
  agenda: () => ['Tu semana', `<ul><li>Los entrenos salen del horario del club, con tus equipos; los partidos, del calendario de la federación.</li><li>En un partido, <b>Prepararlo</b> abre su ficha: convocatoria, el plan, cómo fue y uno a uno. Casi todo es tocar, y se guarda sola.</li><li><b>Prepararla</b> abre una sesión nueva con el equipo, la fecha y, si lo has planificado, lo que querías trabajar.</li>
    <li>Cuenta como preparada cuando hay una sesión con ese equipo y esa fecha (tuya o de un compañero del mismo grupo).</li></ul>`],
  planificar: () => ['Planificar', `<p>Tu mesociclo: qué quieres trabajar en cada entreno del mes.</p><ul><li>Escribe el foco y marca la fase del juego (y, si quieres, contenidos del modelo de juego).</li>
    <li>Se guarda solo y lo puedes cambiar cuando quieras. «Copiar la semana anterior» rellena una semana con la previa.</li><li>Al pulsar «Preparar la sesión», la sesión sale con esto puesto.</li></ul>`],
  ejercicios: () => ['Ejercicios', `<ul><li><b>Del club:</b> el banco, validado por la DT.</li><li><b>Mis ejercicios:</b> los que creas y tus versiones de los del club. Los ve el cuerpo técnico (los borradores no).</li>
    <li><b>Cuerpo técnico:</b> los de tus compañeros. La DT puede meterlos en el banco.</li></ul>`],
  sesiones: () => ['Sesiones', `<ul><li><b>Mis sesiones:</b> en calendario o en lista. «Empezar entrenamiento» abre el modo pista.</li><li><b>Planificar:</b> tu mesociclo.</li>
    <li><b>Cuerpo técnico:</b> las de tus compañeros, para verlas o copiarlas.</li><li>Si no te da tiempo, «Guardar a medias» y la sigues otro día.</li></ul>`],
  seguimiento: () => ['Seguimiento', `<ul><li>Una fila por entrenador del horario.</li><li><b>Preparadas esta semana</b>, <b>sin preparar en 7 días</b>, <b>planificados en 14 días</b> y <b>ejercicios en el banco</b>.</li>
    <li>Pulsa una fila para ver sus entrenos. Si alguien entra con un nombre que no se reconoce, vincúlalo en su fila.</li><li>Solo lo ve la DT.</li></ul>`],
  horario: () => ['Horario', `<ul><li>Pulsa un entreno para cambiarlo o quitarlo.</li><li>Los entrenadores van con el nombre corto del horario.</li>
    <li>Avisa de <b>choques</b>: el mismo entrenador en dos entrenos que se pisan más de 20 minutos.</li><li>Los días sin entreno no generan entrenos en la agenda.</li></ul>`],
  resumen: () => ['Resumen de la DT', `<ul><li><b>Te toca:</b> lo pendiente, con su botón.</li><li><b>Qué puedes hacer:</b> todos los atajos de la DT.</li></ul>`],
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-info]'); if (!b) return;
  e.stopPropagation();
  const f = INFO[b.dataset.info]; if (!f) return;
  const [t, h] = f();
  openModal(`<h2>${esc(t)}</h2><div class="info-txt">${h}</div><div class="row"><button class="btn primary" id="m-no" type="button">Entendido</button></div>`);
  modalCard.querySelector('#m-no').onclick = closeModal;
}, true);
// ================= cofres: un penalti por cofre; si marcas, premio de rareza al azar =================
// Los premios personalizan lo que pasa en tus partidos: celebración, efecto de gol, balón, pista y título.
const RAREZAS = [['comun', 'Común', 60, 5], ['raro', 'Raro', 25, 10], ['epico', 'Épico', 10, 20], ['legendario', 'Legendario', 4, 40], ['mitico', 'Mítico', 1, 80]];
const RAR = Object.fromEntries(RAREZAS.map(([k, n, w, m]) => [k, { n, w, m }]));
const EST_CATS = [['fic', 'Fichas del partido'], ['cel', 'Celebración de gol'], ['efx', 'Efecto de gol'], ['bal', 'Balón'], ['pis', 'Pista'], ['tit', 'Título']];
const ESTILOS = [
  { id: 'fic-clasica', c: 'fic', n: 'Clásicas', r: 'comun', base: 1 }, { id: 'fic-numeros', c: 'fic', n: 'Dorsales grandes', r: 'comun', sym: ['7', '10', '4', '9', '1'] },
  { id: 'fic-granja', c: 'fic', n: 'La granja', r: 'raro', sym: ['🐮', '🐷', '🐔', '🐑', '🐴'] }, { id: 'fic-frutas', c: 'fic', n: 'Frutería', r: 'raro', sym: ['🍉', '🍍', '🍓', '🍋', '🥥'] },
  { id: 'fic-deporte', c: 'fic', n: 'Polideportivo', r: 'raro', sym: ['⚽', '🏀', '🎾', '🏐', '🥅'] },
  { id: 'fic-selva', c: 'fic', n: 'La selva', r: 'epico', sym: ['🦁', '🐯', '🐵', '🐘', '🦒'] }, { id: 'fic-mar', c: 'fic', n: 'Fondo del mar', r: 'epico', sym: ['🦈', '🐙', '🐬', '🦀', '🐢'] },
  { id: 'fic-bosque', c: 'fic', n: 'El bosque', r: 'epico', sym: ['🦊', '🐻', '🦉', '🐺', '🦌'] },
  { id: 'fic-dinos', c: 'fic', n: 'Dinosaurios', r: 'legendario', sym: ['🦖', '🦕', '🐊', '🦎', '🐉'] }, { id: 'fic-espacio', c: 'fic', n: 'Sistema solar', r: 'legendario', planets: ['mercurio', 'tierra', 'marte', 'jupiter', 'saturno'] },
  { id: 'fic-monstruos', c: 'fic', n: 'Monstruos', r: 'mitico', sym: ['👾', '👻', '🤖', '👽', '🎃'] }, { id: 'fic-fantasia', c: 'fic', n: 'Personajes de leyenda', r: 'mitico', sym: ['🧙', '🥷', '🦸', '🧛', '🤠'] },
  { id: 'cel-gol', c: 'cel', n: '¡GOL!', r: 'comun', base: 1 }, { id: 'cel-dentro', c: 'cel', n: '¡DENTRO!', r: 'comun' }, { id: 'cel-toma', c: 'cel', n: '¡TOMA!', r: 'comun' },
  { id: 'cel-golazo', c: 'cel', n: '¡GOLAZO!', r: 'raro' }, { id: 'cel-escuadra', c: 'cel', n: '¡A LA ESCUADRA!', r: 'raro' }, { id: 'cel-clase', c: 'cel', n: '¡QUÉ CLASE!', r: 'raro' },
  { id: 'cel-entrena', c: 'cel', n: '¡SE JUEGA COMO SE ENTRENA!', r: 'epico' }, { id: 'cel-magia', c: 'cel', n: '¡MAGIA!', r: 'epico' },
  { id: 'cel-smb', c: 'cel', n: '¡SMB, SMB, SMB!', r: 'legendario' }, { id: 'cel-historico', c: 'cel', n: '¡HISTÓRICO!', r: 'mitico' },
  { id: 'efx-normal', c: 'efx', n: 'Normal', r: 'comun', base: 1 }, { id: 'efx-destello', c: 'efx', n: 'Destello', r: 'comun' },
  { id: 'efx-confeti', c: 'efx', n: 'Confeti', r: 'raro' }, { id: 'efx-humo', c: 'efx', n: 'Humo granate', r: 'raro' },
  { id: 'efx-fuego', c: 'efx', n: 'Fuego', r: 'epico' }, { id: 'efx-rayo', c: 'efx', n: 'Rayo', r: 'epico' },
  { id: 'efx-fuegos', c: 'efx', n: 'Fuegos artificiales', r: 'legendario' }, { id: 'efx-oro', c: 'efx', n: 'Lluvia de oro', r: 'mitico' },
  { id: 'bal-naranja', c: 'bal', n: 'Naranja', r: 'comun', base: 1, col: '#f08a24' }, { id: 'bal-blanco', c: 'bal', n: 'Blanco', r: 'comun', col: '#f7f7f7' }, { id: 'bal-amarillo', c: 'bal', n: 'Amarillo', r: 'comun', col: '#f4d03f' },
  { id: 'bal-rosa', c: 'bal', n: 'Rosa flúor', r: 'raro', col: '#ff4fa3' }, { id: 'bal-verde', c: 'bal', n: 'Verde flúor', r: 'raro', col: '#5cf03c' },
  { id: 'bal-granate', c: 'bal', n: 'Granate SMB', r: 'epico', col: '#7a1f2e' }, { id: 'bal-azul', c: 'bal', n: 'Azul eléctrico', r: 'epico', col: '#2f7bff' },
  { id: 'bal-oro', c: 'bal', n: 'Dorado', r: 'legendario', col: '#d4a72c' }, { id: 'bal-arcoiris', c: 'bal', n: 'Arcoíris', r: 'mitico', col: 'url(#bal-rb)', sw: 'linear-gradient(90deg,#ff4d4d,#ffb84d,#f4f04d,#4dff88,#4db8ff,#a64dff)' },
  { id: 'pis-azul', c: 'pis', n: 'Azul', r: 'comun', base: 1, col: '#cfe0f2' }, { id: 'pis-gris', c: 'pis', n: 'Gris', r: 'comun', col: '#d9dadc' },
  { id: 'pis-verde', c: 'pis', n: 'Verde', r: 'raro', col: '#bfe3c5' }, { id: 'pis-parquet', c: 'pis', n: 'Parquet', r: 'raro', col: '#e2c49a' },
  { id: 'pis-granate', c: 'pis', n: 'Granate SMB', r: 'epico', col: '#ecc9d0' }, { id: 'pis-noche', c: 'pis', n: 'Noche', r: 'epico', col: '#2b3240', dark: 1 },
  { id: 'pis-final', c: 'pis', n: 'Pabellón de la final', r: 'legendario', col: '#f3e1a8' }, { id: 'pis-mundial', c: 'pis', n: 'Mundial', r: 'mitico', col: '#14254a', dark: 1 },
  { id: 'tit-mister', c: 'tit', n: 'Míster', r: 'comun' }, { id: 'tit-currante', c: 'tit', n: 'Currante', r: 'comun' }, { id: 'tit-pizarrin', c: 'tit', n: 'Pizarrín', r: 'comun' },
  { id: 'tit-muro', c: 'tit', n: 'El Muro', r: 'raro' }, { id: 'tit-pizarra', c: 'tit', n: 'Pizarra de oro', r: 'raro' }, { id: 'tit-presion', c: 'tit', n: 'Rey de la presión', r: 'raro' },
  { id: 'tit-arriba', c: 'tit', n: 'Señor del Tengo arriba', r: 'epico' }, { id: 'tit-ensayo', c: 'tit', n: 'Maestro del ensayo', r: 'epico' },
  { id: 'tit-banquillo', c: 'tit', n: 'Leyenda del banquillo', r: 'legendario' }, { id: 'tit-inmortal', c: 'tit', n: 'Inmortal del SMB', r: 'mitico' },
];
const estItem = id => ESTILOS.find(x => x.id === id) || null;
const estiloDe = name => normName(name) === normName(readAuthor()) ? (game.estilo || null) : ((coachOf(name) || {}).estilo || null);
const estStyle = e => { const p = estItem((e || {}).pis), b = estItem((e || {}).bal); return [p ? `--rk:${p.col}` : '', b ? `--bl:${b.col}` : ''].filter(Boolean).join(';'); };
const estDark = e => { const p = estItem((e || {}).pis); return p && p.dark ? ' rk-dark' : ''; };
const estOwned = id => { const x = estItem(id); return !!x && (x.base || (game.col || []).includes(id)); };
function cofreGrant(key, why, quiet) {
  const C = game.cofres = game.cofres || { n: 0, keys: [] };
  if (C.keys.includes(key)) return false;
  C.keys.push(key); C.n++; if (!quiet) toast(`+1 cofre · ${why}`);
  return true;
}
// los que se ganan solos: bienvenida, cada nivel, ganar tu duelo de la jornada y cada ejercicio nuevo en el banco
