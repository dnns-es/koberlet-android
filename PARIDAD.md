# Paridad entre sistemas

Koberlet es **un producto** repartido en dos códigos: el escritorio (Electron,
`F:\APP\koberlet`) y el móvil (Capacitor + Kotlin + Swift,
`F:\APP\koberlet-android`, que lleva Android e iPhone dentro).

Eso son **cuatro sistemas publicados**: Windows, Mac, Android e iPhone. **Linux
no existe**: no hay script de compilación (`build-portable.sh` y
`build-instalador.sh` son de Windows, `build-mac.sh` y `package-dmg.sh` de Mac),
ni se nombra en el código ni en el README. Si algún día se añade, es una fila
más aquí.

Hasta el 18/09/2026 cada uno se actualizó por su cuenta. El resultado es que hoy
**la misma operación se comporta distinto según el aparato** — el caso más caro:
un cambio en el Mercado de 5 USDC o más sale gratis de gas en Android y lo paga
el usuario en el ordenador y en el iPhone.

## La norma

**Todo cambio que se haga en un sistema se apunta aquí, en "Pendiente de
nivelar", con los otros dos sistemas marcados.** No se cierra hasta que esté en
los tres o hasta que se escriba por qué no debe estar.

El motivo no es el orden por el orden: cuando dos monederos que se llaman igual
firman distinto, el que se equivoca es el usuario, y aquí el error se paga con
dinero. Además, el número de versión unificado (3.0.0) promete que los tres son
lo mismo; si no lo son, el número miente.

**Una diferencia puede quedarse**, pero entonces se escribe el motivo en
"Diferencias a propósito". Lo que no vale es que exista y nadie sepa por qué.

---

## Pendiente de nivelar

Cada fila: qué se hizo, dónde está ya, dónde falta. Se añade fila **al hacer el
cambio**, no después.

| Cambio | Escritorio | Android | iOS | Notas |
|---|---|---|---|---|
| DCA: resumen de cada plan con precio medio (estado, bote, gastado, recibido, compras, precio medio, próxima compra) | **Hecho en código (sin publicar)** | **Falta** | **Falta** | Pedido por un usuario el 26/09/2026 («al menos el precio medio»), comparando con la web de KoberluSW. Precio medio en la moneda de cotización del par: kb-USDC si está, si no KDA («1 bro = 478.000 KDA»). Escritorio: `dcaResumenPlan()` en `renderer/app.js`. |
| Errores del escritorio en inglés | **Hecho en código (sin publicar)** | Comprobar | Comprobar | Los errores de main.js y lib/*.js salían en español con la app en inglés (caso real: DCA sin gas). En el escritorio se traducen en el renderer con `renderer/errores-en.js` y `test/errores-en.test.js` falla si se añade un error sin traducción. El móvil tiene pruebas en test/ para claves sin traducir, pero los errores que vienen del código nativo Kotlin/Swift pueden seguir saliendo solo en español. |
| Chain 2 por defecto en todos los selectores de chain (Enviar: origen y destino; Recibir, QR, cross-chain…) | **Falta** | **Falta** | **Falta** | Pedido por Antonio el 26/09/2026 para la próxima versión de todas las plataformas. Hoy el Enviar del escritorio arranca en chain 0/0. La chain 2 es donde vive todo lo de KoberluSW (Mercado, DCA, órdenes). |
| Gasolinera en el Mercado (`free.ksw-gasolinera`) | **Sí (2.10.0)** | Sí (0.57.0) | **Falta** | Cerrado el 18/09/2026. Hubo que enseñarle a medir el gas: iba con `preflight=false`, que no devuelve consumo, y declaraba topes fijos de 8000/14000 que no caben en el contrato. **Probado en cadena** — ver abajo. |
| Umbral de 5 kb-USDC para subvencionar | **Sí, en el Mercado (2.10.0)**; el DCA y las órdenes siguen sin umbral | Sí | — | Queda una diferencia dentro del propio escritorio: el Mercado exige 5 USDC y el DCA subvenciona cualquier importe. Hay que decidir si se unifica. |
| DCA con kb-ETH, FLUX y bro (`free.ksw-dca3`, siempre contra KDA) | **Sí (2.13.0, sin publicar)** | **Hecho en código (sin publicar)** | **Hecho en código (sin compilar ni publicar)** | KDA↔kb-USDC sigue en `ksw-dca2`; los tres nuevos van al dca3, que lo elige main por el par. La gasolinera **no** paga dca3 (solo admite dca2/ksw2): el gas lo pone el usuario. Mínimos por compra: 0,0004 kb-ETH, 15 FLUX, 0,0002 bro. Los planes se leen de los dos contratos. **Móvil (25/09/2026):** la pantalla solo manda CLAVES (`token`: kb-USDC/kb-ETH/FLUX/bro; `contrato`: dca2/dca3; `entra` del bote) y `FirmaKda.kt`/`FirmaKda.swift` las traducen con mapas fijos (módulo, precisión, mínimo, custodia `c:egWEeU7r…gr8` del dca3, leída de la cadena). Kotlin rechaza gratis+dca3. Importes con los decimales del token (máx. 12, como el escritorio). Mínimos comprobados en pantalla y en nativo. Tests: `FirmaKdaTest.kt`, `FirmaKdaTests.swift` (sin ejecutar: no hay Swift en Windows) y `test/dca.test.js`, que ata las tres tablas. |
| Tarjeta: tokens del Mercado con saldo | **Sí (2.13.0)** | **Hecho en código (sin publicar)** | **Hecho en código (es JS, va igual)** | Pools de la chain 2 con ≥1000 KDA de fondo en los que la cuenta tenga saldo, valorados al precio de su pool (reservaKDA/reservaToken × KDA). `saldosMercado` de `src/lib/dex.js`, portado del escritorio: de 12 en 12, cada uno en su `try`, y el contrato que tumba su tanda se aparta para la sesión. El mercado se recuerda 5 min. El Panel dice que esas líneas van al precio del pool. |
| Gasolinera en el DCA | Sí | **Cable sin conectar** | **Falta** | El Kotlin ya lo acepta (`crearPlanDca`/`gestionarPlanDca` con `gratis`, solo dca2), pero la pantalla no lo manda (`boveda.firmarCrearDca` en `pantalla-dca.js`). |
| Órdenes límite (`free.ksw2`) | Sí | **Falta** | **Falta** | El contrato está vivo: quitarlo del escritorio dejaría órdenes abiertas sin poder gestionar. |
| Moneda fiat aplicada a todo | **Sí (2.10.0)** | Sí, 4 divisas | Sí | Cerrado el 18/09/2026. Las mismas cuatro (EUR, USD, GBP, CHF) y el mismo comportamiento. **Por defecto el euro**, como el móvil: quien tuviera el total en dólares lo verá cambiar. |
| QR de cobro con importe y chain | **Sí (2.10.0)** | Sí | Sí | Cerrado el 18/09/2026, con `test/cobro-qr.test.js` atando el texto del QR letra a letra al que lee el móvil. |
| Devnet y grifo de pruebas | **Quitados (2.10.0)** | No los tuvo | No | Eran herramienta de desarrollo dentro de un monedero: activar la casilla **ocultaba las redes reales y el saldo**. |
| Biometría | **No va** | Sí | Sí | Descartada para el escritorio el 18/09/2026. Ver "Diferencias a propósito". |
| Redes EVM (5 frente a 1) | Sí | **Falta** (solo Ethereum) | **Falta** | Son RPC y chainId. |
| Enviar NFT | Sí | **Falta** (solo ver, y oculto del menú) | **Falta** | |
| Historial con EVM y puente, y CSV | Sí | **Falta** | **Falta** | El del móvil solo trae Kadena. |
| Modo visor / direcciones observadas | Sí | **Falta** | **Falta** | |
| Cross-chain juntando varias chains | Sí | **Falta** | **Falta** | |
| Volver a ver la semilla | **No deja** | Sí | Sí | **Decisión de seguridad sin tomar**: uno de los dos criterios está mal y hay que elegir cuál. Es la diferencia con más consecuencias de la lista. |
| Sin linter que cace variables inexistentes | **Falta** | **Falta** | **Falta** | Abierto el 22/09/2026 por el fallo de la 0.58.1: `cantidad` no existía en `cotizarYa()` y el Mercado de Kadena estuvo cuatro días sin poder firmar. Ningún código de los dos tiene `eslint`; con `no-undef` bastaba. La llamada gemela del escritorio (`lib/dex.js:439`) sí estaba bien, por suerte, no por tenerlo vigilado. |
| La versión sale del `package.json` | Sí | Sí (`build.gradle:9`) | Sí, al compilar en Actions | En el `.pbxproj` sigue poniendo `MARKETING_VERSION = 1.0`, pero eso solo lo ve quien compile a mano en un Mac: el workflow (`.github/workflows/ios.yml`) pasa `MARKETING_VERSION` desde el `package.json` y `CURRENT_PROJECT_VERSION` desde el número de ejecución, que siempre crece, como exige TestFlight. Como todas las subidas salen de ahí, no se descuelga. |
| Cross-chain: esperar sin cantar un fallo falso | **Sí (24/09/2026)** | Sí (24/09/2026) | Sí (24/09/2026) | Abierto por quejas de usuarios: «no se puede mandar KDA de una chain a otra». El envío funcionaba —comprobado en mainnet, los 5 KDA estaban en la chain destino—, pero el escritorio esperaba solo 60 s (`tries: 20` × 3 s) y al vencer decía «El paso de salida no se minó», con el `pactId` tirado sin enseñarlo. Ahora espera 5 min y separa «sin respuesta» (⏳ va en camino, aviso naranja) de «failure» (fallo de verdad). El móvil ya enseñaba la referencia por adelantado (`src/enviar.js:533`) y ya distinguía las dos cosas en `lib/kda.js`, pero esperaba 90 s y **pintaba de rojo lo que iba en camino**, que es lo que hacía reenviar. Cerrado: 5 min en los dos pasos del cross-chain (`src/enviar.js`), paso nuevo `enCamino()` en `src/pasos.js` (⏳ naranja, no ✗) y clase `.paso.camino`. La espera dentro de una misma chain se queda en 90 s: ahí sí es rápido. |
| Conectar con webs (WalletConnect) | **Sí (2.12.0)** | Sí (0.59.0), **fuera de Google Play** | Sí (0.59.0) | El escritorio pide pegar el enlace; el móvil **lee el QR con la cámara**, que es el camino natural. Los dos enseñan lo mismo antes de firmar: cuánto se autoriza mover y a quién en grande, y debajo qué se ejecuta, red, chain y gas máximo. La firma sale de la bóveda nativa (`firmarComandoExterno`, gemelo en Kotlin y Swift) y pide contraseña o huella. **En el canal de Play no viaja el código** (`HAY_WALLETCONNECT` en `src/canal.js`): Play mete el acceso a juego con dinero real en una política aparte con licencia por país. |
| WalletConnect: aprobar TODAS las redes que pide la web | **Falta** (`lib/walletconnect.js:133`, aprueba `[CADENA]` a secas) | Sí (0.59.4) | Sí (0.59.4) | Abierto el 25/09/2026 con el iPhone delante: `mercatusdex.fun` pide `mainnet01`, `testnet04` y `development`, el monedero aprobaba solo mainnet y el SDK tiraba la conexión entera («Non conforming namespaces… chains don't satisfy required»). El escritorio tiene **el mismo código y el mismo fallo**; con `play.smartpacts.io` no se ve porque solo pide mainnet. El arreglo del móvil está aislado en `src/lib/wc-namespaces.js` (sin SDK) con `test/walletconnect.test.js`: se puede copiar casi tal cual. |
| WalletConnect: `kadena_sign_v1` (el monedero monta el comando) | **Falta** | Sí (0.59.5) | Sí (0.59.5) | mercatusdex.fun lo **exige** y sin él no deja conectar. El escritorio solo sabe `quicksign`. Pieza aislada en `src/lib/wc-comando.js` con `test/wc-comando.test.js`: se copia casi tal cual. |
| Lista de webs autorizadas | **Falta** | **Falta** | **Falta** | Pedido por Antonio: autorizar a mano las páginas con las que se puede conectar, en vez de aceptar cualquiera que enseñe un QR. Hoy la defensa es que el QR hay que leerlo a propósito y que cada firma se aprueba una a una. |
| Sesiones de WalletConnect entre arranques | **Falta** | **Falta** | **Falta** | Al cerrar la app se pierde la sesión y hay que volver a leer el QR. En el móvil, además, sin notificaciones push la petición solo llega con la pantalla «Conectar» abierta; se dice en pantalla en vez de prometerlo. |

## Para una actualización futura (decidido el 18/09/2026)

Ni TRON ni Bitcoin entran en la 2.10.0. Se apuntan aquí con lo que costaría cada
uno, para no volver a estudiarlo desde cero:

**TRON** es asequible. Misma curva (secp256k1) y misma librería que EVM; cambian
el camino de derivación (`m/44'/195'/…`) y la dirección, que es la misma cuenta
en base58 con prefijo. Lo que de verdad hay que resolver es que **no tiene gas**
como tal: va de *bandwidth* y *energy*, y sin ellos quema TRX —un envío de USDT
TRC-20 puede costar 13-27 TRX—. Eso hay que estimarlo y enseñarlo antes de
firmar. Tiene sentido si lo que se busca es USDT, que es para lo que se usa.

**Bitcoin es otro proyecto**, no una red más. El modelo UTXO cambia todo: no hay
saldo sino monedas sueltas, hay que elegir entradas y calcular el cambio, estimar
comisión en sat/vB, derivar **muchas direcciones por cartera** y escanearlas con
gap limit, y soportar tipos de dirección distintos. Necesita además un indexador
externo que vea todas las direcciones del usuario, que es una dependencia nueva y
una decisión de privacidad. Sin contratos: ni puente ni Mercado.

Y las dos tienen el coste que impone esta misma norma: **lo que se añada al
escritorio hay que llevarlo al móvil**, donde la firma es Kotlin y Swift, no
JavaScript. Multiplica el trabajo por tres.

## Diferencias a propósito

Estas **no** se nivelan, y aquí está el porqué para no volver a discutirlo:

- **Ledger, solo en el escritorio.** Es USB-HID. No es una decisión, es el
  aparato.
- **Biometría, solo en el móvil.** Decidido el 18/09/2026 (Antonio: «la E en
  escritorios lo veo ridícula»). En un teléfono la huella sustituye a teclear la
  contraseña cada vez y por eso se usa; en un ordenador aporta comodidad, no
  seguridad, y costaría meter un **módulo nativo nuevo en el proceso que guarda
  las claves**, compilado por plataforma y con Touch ID por un camino distinto
  al de Windows Hello. Mucho riesgo donde ya hay contraseña.
- **Nodos de Kadena fijos en el escritorio, configurables en el móvil.** El
  escritorio los fija a propósito (`renderer/index.html:217`): un nodo que
  miente puede enseñar un saldo falso. Son dos criterios opuestos y conscientes.
- **Revalidación nativa del 0,5 %, solo en el móvil.** Kotlin y Swift rechazan
  una comisión que pase del tope aunque la pantalla mienta. El escritorio no
  tiene capa nativa donde poner ese segundo cerrojo.
- **Actualización propia.** El escritorio se actualiza solo (con sha256 y firma
  Ed25519, e instalación in-place únicamente en Windows). Android solo en el
  canal `directa`; en Play y en iOS lo hace la tienda porque no dejan otra cosa.

## Lo que sí está igual en los tres

Enviar y recibir KDA, cross-chain de KDA, tokens fungibles de Kadena, envío EVM,
Mercado de Kadena, Uniswap, puente en los dos sentidos, DCA, agenda, copias
cifradas, exportar clave privada, multi-cartera, idioma ES/EN, tema, y la
comisión del 0,5 % con las mismas dos cuentas de cobro
(`comision.js:30/34` ≡ `src/lib/dex.js:38` ≡ `FirmaKda.swift:279`).

---

## La trampa de la gasolinera, escrita para no repetirla

Va aquí porque la van a sufrir el escritorio y iOS cuando les toque, y porque el
contrato **no dice nunca qué le molestó**: gas de más, forma del código o
comisión mal puesta salen todos como **«Failed to buy gas»**.

1. **El tope es 8000** y cuenta el gas *firmado*, no el consumido. El móvil mide
   con preflight y firma `ceil(medido × 1,3)`; el gas real medido en cadena iba
   de 668 a 2312.
2. **Las llamadas van sueltas al nivel de arriba**, nunca dentro de un
   `(let ((r ...)) ... r)`. El contrato mira que cada llamada de primer nivel
   empiece por un módulo permitido, y el `let` se las esconde. El escritorio hoy
   usa siempre `let` (`lib/dex.js:223`).
3. **`gasPrice` exactamente `0.00000001`**, escrito sin notación exponencial.
4. **Pausar, reanudar y cerrar un plan no pueden ir subvencionados**: el contrato
   hace `enforce-guard` directo y una firma acotada deja de valer.

Vigilado por `test/gasolinera.test.js` en el móvil y `test/gasolinera-dex.test.js`
en el escritorio. Cuando iOS lo lleve, necesita su propia copia.

### Probado en cadena el 18/09/2026

Primera vez que la gasolinera paga un cambio del Mercado desde Koberlet, en
ninguno de los dos sistemas. Desde el escritorio 2.10.0, bloque **7.240.591**,
requestKey `w1gRqFNRYYiJdZreGW4Nd2ntzh9F3bYVan7aNzuCka8`:

```
coin.TRANSFER ["c:Mq0gKlGBdjKvkBJLr4ECCu3_OxQ4_GJOzlYS0Ems-CY", "<minero>", 0.0000224]
```

El gas —2.240, muy por debajo del tope de 8.000— salió de la cuenta de la
gasolinera, no del usuario. En la misma transacción: 5,97 kb-USDC cambiados por
1.501,258 KDA y la comisión de 0,03 kb-USDC a `k:e5b9…48df`.

Queda demostrado lo que no se podía demostrar leyendo: que las dos llamadas
sueltas pasan el filtro del contrato y que la comisión viaja dentro. **El móvil
usa la misma forma, así que esto lo valida también** —aunque en el móvil no se ha
ejecutado todavía.

## Lo que ha salido de nivelar (18/09/2026)

Nivelar encontró un fallo que llevaba escondido porque **nadie generaba el caso**:

`cobroDeQr` del móvil (`src/qr.js`) leía la chain con
`Number(parametros.get('chain'))`. Cuando el parámetro no viene, `get` devuelve
`null`, y **`Number(null)` es 0**, que pasa la comprobación de «entero entre 0 y
19». O sea: un QR con importe y **sin** chain se leía como **chain 0**.

No se notaba porque el único que generaba QR de cobro era el propio móvil, y
siempre ponía las dos cosas. El escritorio, desde la 2.10.0, genera QR con
importe y sin chain —que es el caso normal: pides 20 KDA y te da igual dónde—.
Arreglado en el móvil y con prueba en los dos lados.

Es el argumento de esta norma en una línea: **la diferencia no era el fallo, pero
la diferencia lo escondía.**

### Y una duda sin resolver, apuntada para no perderla

El móvil **prohíbe** que pausar, reanudar y cerrar un plan de DCA vayan por la
gasolinera (`FirmaKda.kt`, `if (gratis && accion != "recargar")`), y el motivo
escrito es que el contrato hace `enforce-guard` directo sobre el guard del dueño,
y una firma acotada por `clist` deja de valer para eso.

Pero el escritorio **sí** las manda por la gasolinera: `accion()` de `lib/dca.js`
pasa por `firmarYEnviar`, que mete la `GAS_PAYER` a todo lo que le llega.

Sólo una de las dos cosas puede ser cierta. O el escritorio tiene un fallo latente
ahí desde agosto, o la restricción del móvil sobra. **No se puede saber leyendo**:
hace falta pausar un plan de verdad desde el escritorio y mirar si el bloque lo
acepta. Hasta entonces no se toca ninguno de los dos.

## Aviso: hay documentación que miente dentro de la app

`src/info.js:33-40` (la lista "por llegar", que se le pinta al usuario) dice que
todavía no se puede firmar un cambio en el Mercado ni enviar desde una cartera
EVM. Las dos cosas están hechas desde la 0.53.0 y la 0.54.0.

## Aviso: la política declara una conexión que dos de los tres canales no hacen

19/09/2026. `src/politicas-texto.js` tiene un renglón que dice «comprobación de
actualizaciones a descargas.dnns.es» (y su equivalente en inglés). Es cierto solo
en el canal **directo**: `src/actualizar.js` está limitado a la compilación
`directa`, y así lo dice su propio comentario de cabecera.

El texto, en cambio, **no se filtra por canal**. Al usuario de Google Play y al de
iOS se le declara una conexión que su app no hace.

Declarar de más suena inofensivo y no lo es: en la ficha de la App Store la
declaración de privacidad tiene que cuadrar con lo que hace el binario, y ahí no
cuadra. Hay que condicionar ese renglón al canal **antes** de enviar Koberlet a
revisión en Apple.

No se toca todavía porque el mismo fichero sirve al escritorio, donde la frase sí
es cierta: el arreglo es condicionar, no borrar.
