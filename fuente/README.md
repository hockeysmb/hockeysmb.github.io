# Código fuente

| Archivo | Qué es |
|---|---|
| `plantilla.html` | La app entera. `__BANK__`, `__AVATAR_LIB__` y `__LOGO__` se rellenan al construir. |
| `construir_web.py [carpeta]` | Genera la web (por defecto, en la raíz del repositorio). Lleva un banco vacío: el de verdad está en Firestore. |
| `construir_artifact.py [banco.json] [salida]` | Genera la página del artifact con un banco dentro (por defecto, el de prueba). |
| `web/` | `cloud.js` (Firebase), `cloud.css`, `sw.js`, manifiesto e iconos. |
| `lib/` | `avatar.bundle.js` (DiceBear Avataaars empaquetado con esbuild desde `entry.js`) y el logo. |
| `pruebas/` | Pruebas Playwright. `correr.py` las pasa todas. |
| `NOTAS_TECNICAS.md` | Mapa del código. |

## Pruebas

Necesitan Python 3 con `playwright` y Chromium (`pip install playwright && playwright install chromium`).

| Prueba | Qué comprueba | Antes se llamaba |
|---|---|---|
| `web_general` | Entrada, accesos, perfil, bandeja, vestuario | `t6/web_test.py` |
| `web_altas` | Alta previa de entrenadores por email | `t6/prereg_test.py` |
| `web_directo` | Amistoso en directo entre dos navegadores | `t6/live_test.py` |
| `web_auditoria` | Recorrido visual de las pantallas | `lav/audit2.py` |
| `web_penalti` | Penalti gratis y de pago | `fx/pen2.py` |
| `web_plantilla` | Fichajes y ofertas entre entrenadores | `club/test_web.py` |
| `web_liga` | Liga diaria: calendario, resultados, premios, congelar | `lg/test_web.py` |
| `web_revisar` | Mesa de revisión: devolver con nota, aviso al entrenador, corregida y validada | nueva |
| `web_cuentas` | Cuenta repetida: aviso, descartar y recuperar | nueva |
| `web_nombres` | Cambiar el nombre de un entrenador (DT y propio) | `rn/test.py` |
| `art_agenda` | Agenda semanal y preparar sesión | `t5/agenda.py` |
| `art_planificacion` | Planificación por entrenos | `t5/plan.py` |
| `art_tecnica` | Técnica y táctica individual por categoría | `tec2/test.py` |
| `art_autoguardado` | Sesiones que se guardan solas | `tec2/auto_test.py` |
| `art_pizarra` | Pizarra a pantalla completa en el móvil | `bd/test.py` |
| `art_equipos` | Equipos y entrenadores: resumen, aviso de días que no coinciden y cambio | nueva |
| `art_revisar` | Mesa de revisión de la DT y semáforo en el editor | nueva |
| `art_flechas` | Flechas arrastrando, pegadas a los jugadores, a dos clics y curvadas con el asa del medio | nueva |
| `art_pizarra_pc` | Pizarra en el ordenador (panel lateral, Esc, aviso de pista vacía) | nueva |
| `art_plantilla` | Plantilla, entrenar, mercado | `club/test_art.py` |
| `art_alineacion` | Alineación y formaciones | `al/test.py` |

Las web fijan el reloj del navegador cuando necesitan una fecha concreta. Los errores `ERR_FAILED` de fuentes y Firebase son ruido del entorno de prueba (sin red) y `correr.py` los ignora.
