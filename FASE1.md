# Koberlet Android — Fase 1 cerrada

Fecha: 2026-09-11 · Versión: 0.2.1 · Base del plan: `PLAN.md`

Objetivo de la fase: esqueleto Capacitor + Vite y **capa de red propia**, con el hito
de leer un saldo real de mainnet desde el aparato.

---

## Qué se ha hecho

### Capa de red (`src/red.js`)
Todas las salidas a internet pasan por aquí, con dos caminos:

- **En el APK**: `CapacitorHttp`. La petición la hace Java, así que no pasa por CORS
  y el tiempo de espera (20 s) es real.
- **En el navegador**: `fetch` con `AbortController`.

Cuatro funciones: `postJson` / `postJsonParseado` (consultas Pact) y
`getTexto` / `getJson` (el camino que en escritorio hacía `lib/nft.js` con
`require('https')`, que en un WebView no existe).

**Decisión: NO se activa el parche global de fetch de Capacitor**
(`CapacitorHttp: { enabled: true }`). Ese parche sustituye `window.fetch` para toda
la app, librerías de terceros incluidas; `ethers` hace sus propias peticiones y el
fetch parcheado no respeta `signal` ni las respuestas por trozos. Una función
explícita se lee en el código y se puede auditar.

### Kadena (`src/lib/kda.js`)
Portado del escritorio **solo lo que consulta**: `local`, `saldoKda`, `saldoTokens`,
`alturaCadena` y la validación de cuentas (`cuentaKdaValida`), que es el hallazgo #5
de la auditoría de Alex y se aplica antes de interpolar una cuenta en código Pact.

**Ni una función que firme.** En Electron la firma vivía en el proceso principal,
fuera del alcance de la interfaz. Aquí ese papel es del plugin Kotlin de la Fase 2/3.
Copiar ahora las funciones de firma al WebView sería regalar el aislamiento que
justifica todo el diseño.

### Honestidad en los saldos
`saldoKda` devuelve también las chains que **no contestaron**, y la pantalla lo avisa:
un total incompleto presentado como bueno es un saldo falso.

### Firma del APK y actualizaciones
- Keystore propia (`.keys/koberlet-release.jks`, RSA 4096, 30 años), fuera del repo.
  La contraseña vive en `android/firma.properties`, tampoco versionado.
- Firma **v1 + v2 + v3**. El v3 es el que permitiría rotar la clave si se comprometiera,
  sin obligar a nadie a desinstalar (desinstalar en Android borra la bóveda).
- `versionCode` y `versionName` salen del `package.json`: una sola fuente de verdad,
  y el número sube solo (Android rechaza instalar un `versionCode` menor).
- Si falta `firma.properties`, el release sale **sin firmar** a propósito, en vez de
  caer en la clave de depuración y repartir un APK que luego no se podría actualizar.
- `latest.json` publicado junto al APK, listo para el comprobador de la Fase 6.

---

## Qué se ha verificado, y cómo

| Comprobación | Resultado | Dónde |
|---|---|---|
| Saldo KDA real sumando 20 chains | 10.447,05355498 KDA en chains 0, 2 y 14 · 271 ms | navegador, dev server |
| Tokens fungibles (PCO, SPT) | PCO 1200 (chains 0 y 2), SPT 50 (chain 0) | navegador |
| Cuenta sin fondos | "no tiene KDA en ninguna de las 20 chains" | navegador, sobre la web publicada |
| Camino GET (`/cut`) | nodo vivo, 20 chains, altura 7.220.551 · 165 ms | navegador |
| Camino de error | `api.chainweb.com` → "sin respuesta — Failed to fetch" | navegador |
| Validación de cuentas | rechaza lo que no es cuenta Kadena antes de consultar | navegador |
| APK firmado | `CN=DNNS.es`, RSA 4096, v1+v2+v3 verificados con `apksigner` | PC oficina |
| Descarga por HTTPS | SHA-256 del fichero descargado = SHA-256 local | curl contra descargas.dnns.es |

---

## Límites: lo que NO queda probado

1. **El hito de la fase, en el aparato, está pendiente de confirmación.** Todo lo de
   arriba se ha comprobado en el navegador, que **no es Android**: no hay WebView de
   Android, ni plugins nativos, ni `CapacitorHttp`. En el navegador las consultas van
   por `fetch` y funcionan porque el nodo de la comunidad manda
   `Access-Control-Allow-Origin: *`. Que en el APK salgan por HTTP nativo solo lo
   confirma la línea de diagnóstico del móvil: debe decir
   **"CapacitorHttp (nativo, sin CORS)"**.
2. **El emulador de Android no está montado** (falta la imagen del sistema y el AVD),
   así que no hay un tercer punto de prueba intermedio.
3. **La compilación sale sin minificar y con sourcemaps** (`vite.config.js`), a
   propósito mientras se desarrolla: los errores en el móvil se leen. Antes de
   publicar de verdad hay que quitarlo.
4. **`api.chainweb.com` (Kadena Inc) no responde** desde aquí. Está en la lista de
   redes pero desactivada; si alguien la activa, verá el error.
5. **No hay actualización dentro de la app todavía.** El `latest.json` está publicado,
   pero el comprobador que lo lee es de la Fase 6. Hasta entonces, APK por enlace.
6. `src/boveda/contrato.js` está escrito pero **no se importa desde ningún sitio**:
   es el arranque de la Fase 2 y no entra en la compilación.

---

## Dónde está

- Proyecto: `F:\APP\koberlet-android`
- APK: `salida\Koberlet-fase1-0.2.1.apk` y en
  `https://descargas.dnns.es/kob7t2m9x4/koberlet-android/`
- Maqueta web (la misma compilación, en el navegador):
  `https://descargas.dnns.es/kob7t2m9x4/koberlet-web/index.html`
- Compilar y firmar, desde `android/`:
  `JAVA_HOME=/f/APP/_tools/jdk21 ANDROID_HOME=/f/APP/_tools/Android/Sdk GRADLE_USER_HOME=/f/APP/_tools/gradle-home ./gradlew assembleRelease`

## Siguiente

Fase 2: bóveda nativa en Kotlin (AES-256-GCM + scrypt, mismo formato de fichero que
el escritorio) y **primer uso**: al instalar, la app pide crear o importar la cartera
del dueño. Punto de diseño a decidir ahí: dónde se deriva la semilla, porque
`@kadena/hd-wallet` es JavaScript y el plugin es Kotlin.
