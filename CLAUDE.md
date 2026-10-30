# Banco de situaciones SMB

App web del cuerpo técnico de hockey sobre patines del Colegio Santa María la Blanca (banco de ejercicios, sesiones, agenda, planificación, juego del vestuario, liga diaria y panel de la Dirección Técnica). La usa la Dirección Técnica (Carlos Manzano, sin formación técnica en programación) y unos ocho entrenadores jóvenes, casi siempre desde el móvil.

## Dónde está cada cosa

- Raíz del repositorio = **lo publicado** en GitHub Pages (https://hockeysmb.github.io). No se edita a mano: se genera.
- `fuente/plantilla.html` = **el código de la app** (HTML, CSS y JS en un solo archivo, con las imágenes incrustadas). Genera la web y el artifact de claude.ai.
- `fuente/web/` = capa web: `cloud.js` (Firebase: cuentas, datos, perfiles, compartido), `cloud.css`, `sw.js`, manifiesto e iconos.
- `fuente/lib/` = librería de personajes (DiceBear Avataaars, ya empaquetada) y logo.
- `fuente/pruebas/` = pruebas con Playwright, un Firebase falso (`fakefb.js`) y un banco inventado.
- `fuente/NOTAS_TECNICAS.md` = mapa del código (funciones, estructuras de datos, decisiones). Léelo antes de tocar una parte que no conozcas.
- `firestore.rules` y `firebase-config.js` en la raíz son los reales.

## Cómo trabajar

1. Cambiar `fuente/plantilla.html` o `fuente/web/*`.
2. Probar: `python3 fuente/pruebas/correr.py` (todas) o `python3 fuente/pruebas/correr.py web_liga art_agenda` (algunas). Construye la web en `fuente/_web/` y el artifact en `fuente/_artifact/` y deja capturas en `fuente/_capturas/`. Mira las capturas cuando cambies algo visual.
3. Publicar: `python3 fuente/construir_web.py` (escribe en la raíz), commit y push a `main`. GitHub Pages tarda uno o dos minutos; `sw.js` cambia de versión en cada build y los móviles se actualizan solos.
4. Si cambias algo que afecte a otra persona (cómo se usa una pantalla, datos que se guardan), apúntalo en `fuente/NOTAS_TECNICAS.md`.

## App de jugadoras (`femenino/`)

- Otra app, para todas las jugadoras de la sección femenina, de Sub-15 para arriba: bienestar antes del entreno, esfuerzo después (carga = esfuerzo × minutos), diario de hockey de cada día (qué tal, lo mejor, lo que cambiaría y cómo lo va a hacer) y un compromiso semanal y un personaje que sube de nivel por responder (los puntos nunca dependen de lo que contestan). Se publica en https://hockeysmb.github.io/femenino/.
- **No tiene paso de construcción:** `femenino/index.html` + `femenino/app.js` son lo publicado. Usa su propio proyecto de Firebase (`femenino/firebase-config.js`, `femenino/firestore.rules`), no el del banco.
- **Un solo grupo, «Femenino»** (sin separar por categorías); los días de entreno los pone la DT en «Mi perfil» → «Días de entreno».
- **Solo la DT (`SMBF_ADMIN`) ve los datos de todas** y puede contestarles desde su ficha; cada jugadora ve y borra los suyos. La DT tiene cuatro pestañas: Equipo (solo datos del equipo), Jugadoras (con el Buzón dentro), Calendario (entrenos y partidos; cada día con su antes y después) y Reto (con sus monedas y las de las jugadoras, en la cantidad que quiera). Altas, días de entreno, datos y salir están en «Mi perfil», tocando su personaje arriba a la derecha. El «atrás» del móvil funciona en toda la app (historial del navegador). Las cuentas se activan a mano cuando hay consentimiento firmado (en menores, por la familia). Los datos se borran el 30 de junio de 2027.
- **Son datos de salud y hay menores:** no añadas campos nuevos de salud (ciclo menstrual, lesiones, medicación…) sin que la DT lo pida y sin actualizar la hoja de información y el consentimiento.
- **El reto:** tres minijuegos con su personaje (`femenino/juegos.js`, hechos con el motor Phaser 4 en `femenino/lib/phaser.min.js`, que se carga al jugar), una mascota que cuidar (tamagotchi con habitación decorable, en «Mi mundo»), uno distinto cada día, partidas sin límite y todas dan monedas, solo después de contestar lo de hoy (antes y después del entreno si hay entreno, y el diario; los partidos no bloquean); duelos 1 contra 1, liga de la semana y tienda. La DT puede mandar monedas con un mensaje (`acceso/{uid}.regalos`, solo lo ve esa jugadora). Las compañeras se ven entre ellas solo el nombre de pila, el personaje y los puntos del juego (colecciones `juego` y `duelos`); nunca nada de bienestar.
- **Dibujos:** `femenino/img/` son Fluent Emoji 3D de Microsoft (licencia MIT, ver `img/LICENCIA.txt`); se usan con `fx('nombre')`. Las mascotas son dibujos propios en `mascotas.js`.
- **Prueba:** `fem_flujo`, `fem_dt` (panel con doce jugadoras inventadas), `fem_reto` (backend simulado `fuente/pruebas/fakefem.js`, con las mismas reglas) y `fem_juegos` (los tres juegos jugados hasta el final en un móvil).

## Reglas

- **El banco real no se sube nunca.** El repositorio es público. El banco vive en Firestore y lleva ejercicios del libro de Marc Oller (uso interno). Las pruebas usan `fuente/pruebas/banco_prueba.json`, inventado.
- **Ni datos de jugadores (menores) ni emails o datos personales** en el repositorio.
- **Las reglas de Firestore** se publican a mano en la consola de Firebase (Firestore → Reglas). Cambiar `firestore.rules` aquí no basta. Si un cambio necesita reglas nuevas, dilo claramente.
- **No mandes nada a nadie.** Correos o mensajes a entrenadores o familias: se preparan como borrador y los manda Carlos.
- Textos de la app en español de España, cortos y claros, para entrenadores jóvenes. Sin emojis en los textos de interfaz salvo en el juego.
- Cambios que borren o reescriban datos del club (banco, liga, plantillas): pruébalos con el Firebase falso antes y avisa de qué cambia.
- Antes de publicar, que pasen las pruebas.

## El artifact de claude.ai

Hay una copia de la app como artifact en claude.ai («Banco de situaciones SMB»). Solo se puede publicar desde una conversación de claude.ai con la herramienta de artifacts. La web es la versión de verdad. Si el artifact deja de usarse, no hace falta mantenerlo.
