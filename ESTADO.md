# Koberlet Android — estado

Actualizado: 2026-09-16 · Versión publicada: **0.53.0** (hash y firma cotejados por HTTPS) · En preparación: **0.54.0** · Plan: `PLAN.md` · Fase 1: `FASE1.md`

Proyecto: `F:\APP\koberlet-android`
APK y `latest.json`: `https://descargas.dnns.es/kob7t2m9x4/koberlet-android/`
Maqueta web (misma compilación, bóveda simulada): `https://descargas.dnns.es/kob7t2m9x4/koberlet-web/index.html`

---

## Por dónde va cada fase

| Fase | Qué | Estado |
|---|---|---|
| 0 | Verificación previa | Cerrada (5/5 en el móvil) |
| 1 | Esqueleto y capa de red | Cerrada — ver `FASE1.md` |
| 2 | Bóveda nativa Kotlin | Hecha y **probada en el móvil** (12/09/2026) |
| 3 | Firma y envío | Hecha y **confirmada con envíos reales en la cadena** (12/09/2026) |
| 4 | UI móvil y cámara | Hecha; cámara y QR de cobro **probados en el móvil** |
| 5 | Resto de funciones | Empezada: precio, historial, copias, navegación por secciones |
| 6 | Distribución y actualización | **Adelantada y hecha** |
| 7 | Auditoría | Empezada: repaso de la checklist propia; falta la externa |
| 8 | Google Play | Empezada: preparado todo lo técnico — ver `play/` |

---

## Google Play (15/09/2026)

La app se reparte ahora por **dos canales de la misma base**, no por uno. El de
siempre —`descargas.dnns.es`— no se ha tocado y sigue siendo donde se prueba
cada versión antes de mandarla a ningún lado. El de Play va detrás.

La diferencia no es cosmética: Google Play **prohíbe** que una app descargue
código e invoque al instalador, así que la variante de la tienda se compila sin
`KoberletUpdate`, sin el permiso `REQUEST_INSTALL_PACKAGES` y sin el JavaScript
de actualización. Comprobado sobre el binario: en el `.aab` no está el permiso,
no está la clase en el dex y no está la URL en el bundle.

```bash
npm run apk:directa    # APK con actualización propia -> descargas.dnns.es
npm run aab:play       # .aab sin ella                -> Google Play
```

Gradle se niega a compilar si los assets web puestos no son los del canal que se
está construyendo, para que no se cuele un bundle mezclado sin que nadie lo note.

Hecho además: `targetSdk` 35 → **36** (obligatorio desde el 31/08/2026, ya
vencido), AGP 8.7.2 → 8.9.3 para poder compilarlo, y los gráficos de la ficha.

**Lo que falta para poder enviar**, todo en `play/PUBLICAR.md`: las capturas de
pantalla, decidir qué se hace con los swaps ante la política de exchanges, crear
la cuenta, y —importante y sin vuelta atrás— subir la clave de firma propia al
crear la app en la Consola, o los dos canales quedan incompatibles para siempre.

---

## Lo que ya está probado en un móvil de verdad (12/09/2026)

Lo cuenta Antonio después de usarlo; no lo he visto yo, así que queda escrito como lo que
es —su palabra, no una traza— pero es lo que cierra el agujero grande del proyecto:

- **Enviar y recibir KDA desde el móvil, probado y correcto.** Es lo que faltaba desde la
  Fase 3: hasta ahora la firma del plugin solo estaba probada contra vectores de
  laboratorio y en simulaciones contra el nodo (`/local`). Ya no. El ciclo entero —sale de
  una cuenta y entra en otra— se ha recorrido en el aparato.
- La bóveda nativa, por tanto, cifra, descifra y firma de verdad en el aparato.
- El QR de cobro leído con la **cámara del sistema** abre la app y rellena el envío.
- Por tanto también se han visto en el móvil, aunque no se anotaran una por una: el Panel
  con saldos de verdad, la cartera abriéndose y cerrándose, y la navegación tocada con el
  dedo. Lo que NO consta es un repaso sistemático de esas pantallas buscando fallos: se han
  usado, que no es lo mismo que haberlas revisado.

Sigue sin confirmarse, y conviene decirlo aparte: envío **entre chains** desde el móvil,
plan de **DCA** real (crear, parar, recargar, cerrar), envío por el **puente**, y la
**actualización dentro de la app** de una versión a la siguiente.

## El APK se servía como un binario cualquiera (15/09/2026)

A un probador se le quedó la notificación de Chrome en «descargando» **siete minutos con el
fichero ya entero**: la foto marcaba `6,57 Mo/6,57 Mo` y la barra llena, pero seguía
ofreciendo «Suspender / Cancelar».

Lo primero que hay que decir, porque cambia lo que uno hace: **el APK ya estaba bajado**.
No era una descarga rota. Se abre desde *Archivos → Descargas* y se instala igual.

Comprobado en el servidor: `HTTP 200`, `Content-Length: 6565311` -los 6,57 MB exactos-,
`Accept-Ranges: bytes`, y al rebajarlo entero la huella SHA-256 coincide con la publicada.
El fichero y el servidor estaban bien.

Lo que SÍ estaba mal: se servía con `Content-Type: application/octet-stream`. Con ese tipo,
Chrome lo trata como un archivo suelto —lo guarda y ahí se queda—; con
`application/vnd.android.package-archive` el sistema entiende que es un paquete y ofrece
instalarlo. Arreglado en `/etc/nginx/sites-enabled/descargas` con un `location ~* \.apk$`
propio (copia previa en `/root/backups/`, `nginx -t` antes de recargar, y comprobado
después que `latest.json`, la maqueta web y las políticas siguen sirviéndose bien).

**Honestidad sobre el alcance**: eso quita un paso, pero no está demostrado que fuera la
causa de la notificación pegada. Chrome también retiene los APK desconocidos mientras los
analiza, y eso pasa en el móvil, no aquí. Si vuelve a ocurrir con el tipo correcto, ya
sabemos que por ahí no era.

Y el recordatorio de siempre: quien ya tiene Koberlet instalado **no necesita el navegador**
para actualizarse —la propia app descarga, comprueba huella y firma, y abre el instalador—.
El navegador es para la primera instalación.

## Sin publicar todavía (para la próxima)

- **Políticas de uso, y hay que aceptarlas** (`src/politicas.js`). Lo pidió Antonio: se
  aceptan al instalar y tras cada actualización que las cambie, se pueden releer dentro
  de la app cuando se quiera, y se pueden leer antes de instalar nada.
  - La puerta va en `arrancarSegunEstado()`, **delante de todo**: antes de la cartera,
    antes de la contraseña y antes de un solo saldo.
  - El texto **no se escribe aquí**. Sale de `POLITICAS.md` del monedero de escritorio
    (`herramientas-politicas.js` lo genera en `src/politicas-texto.js`): es el mismo
    texto en las dos apps, porque es lo mismo que se acepta. Dos copias garantizan que
    una envejezca.
  - Llega como **bloques** `{t, x}`, no como HTML: aquí el `innerHTML` está prohibido y
    lo vigila una prueba. La pantalla los monta con `createElement`.
  - Lo aceptado -**qué versión y cuándo**- se guarda en `koberlet.politicas` del
    aparato, no en la bóveda: es una preferencia, no un secreto, y tiene que poder
    mirarse sin contraseña.
  - Se releen en **Más → Info**, plegadas al final, sin conexión. No se pone un enlace a
    una web: lo que se acepta no puede depender de que un servidor siga en pie.
  - Si el texto cambia se sube `POLITICAS_VERSION` y se vuelven a pedir. Por eso **no se
    sube por una coma**: obligar a leer lo mismo otra vez enseña a no leer.
  - También publicadas en `https://descargas.dnns.es/kob7t2m9x4/politicas.html`, para
    leerlas antes de instalar.
  - **Versión 1.1**: a petición de Antonio, el texto habla ahora de **los permisos del
    APK** y de **la copia de seguridad**. Los permisos salen del manifiesto YA
    FUSIONADO del release, no del que escribimos: son **cinco**, porque `USE_BIOMETRIC`
    y `USE_FINGERPRINT` los mete la librería de biometría. Decir tres cuando Android
    enseña cinco es lo que hace desconfiar del resto del texto. (Esto corrige de paso
    lo que decía este mismo documento sobre «solo tres permisos».)
  - Comprobado en el navegador: sale la puerta, el botón no se activa sin marcar, al
    aceptar se guarda versión y fecha y se sigue a desbloquear, y en Info aparece la
    versión aceptada. Y con la 1.1 se vio funcionar el mecanismo: el aparato tenía
    aceptada la 1.0 y **la puerta volvió a salir sola**.


## 0.54.0 (16/09/2026) — el Mercado también sostiene la app, en las dos redes

«Mercado necesitamos también ese %, la app debe mantenerse de alguna manera.» Y era
verdad: mirando la cadena se vio que el DCA y las órdenes límite **ya cobraban su
0,5 %** dentro de sus contratos, pero el cambio del Mercado no cobraba **nada**. El
pool se quedaba su 0,3 % y el proyecto, cero.

Desde esta versión el cambio de Kadena cobra **el mismo 0,5 %** que el resto.

- **Cómo está hecho** (`FirmaKda.cambioAmm`, en Kotlin y en Swift): la comisión se
  aparta de lo que entra, **antes** del cambio, y la transferencia viaja en la
  **misma transacción**, dentro de un `let`. Si el cambio revierte no se cobra nada;
  si la comisión no se puede pagar, no hay cambio. No hay contrato nuevo ni custodia.
- **La cuenta que cobra la pone el código nativo**, no la pantalla. La pantalla dice
  cuánto; a dónde va no sale del WebView. Y el propio `FirmaKda` **rechaza firmar**
  una comisión por encima del 0,5 %, aunque se la manden.
- **El usuario lo ve dos veces** antes de firmar: en la cotización, con la cifra
  exacta en el token que entrega, y en el aviso de debajo.
- **El mínimo se calcula sobre el neto.** Calcularlo sobre el bruto dejaría un
  mínimo por encima de lo que el pool puede dar y el cambio revertiría siempre.
- **La simulación prueba el comando de verdad** (`src/lib/dex.js`): el mismo código,
  los mismos datos y las mismas capabilities que luego se firman, cobro incluido.
  Si simulara el comando viejo no estaría probando nada.
- **Pruebas**: `test/comision-mercado.test.js` (el reparto cuadra, no se cobra de
  más, decimales del token, y que JS, Kotlin y Swift cobran en la misma cuenta) y
  `CambioAmmTest.kt` / `FirmaKdaTests.swift` (19 y 6 casos: el `let`, el TRANSFER
  acotado, el tope del 0,5 %, y que sin comisión el comando es exactamente el de antes).
- Las **políticas** suben a la **1.2** con el apartado «Lo que cuesta usar Koberlet».

El gas del cambio sube 4.000 unidades: la transacción lleva una transferencia más.

**En Ethereum se cobra lo mismo, pero de otra manera**, y hay que decirlo tal cual: allí
la comisión **sale de lo que recibes**, no de lo que das. La aparta el propio router de
Uniswap con `unwrapWETH9WithFee` y `sweepTokenWithFee`, dentro del mismo `multicall`
(`SwapEvm.kt` y su gemelo Swift). Es código suyo, auditado, y **no admite pasar del 1%**,
así que ni por error se puede cobrar de más. Las cuatro rutas —USDC↔ETH y USDT↔USDC—
reparten igual; el `usdt2usdc`, que antes era una sola llamada, ahora va en `multicall`
para poder repartir. No queda nada dentro del router: la llamada que reparte lo saca todo.

Probado contra Ethereum de verdad con `eth_simulateV1`, sin firmar y con saldo simulado:
cambiando 1 ETH, al usuario le llegan 2.394,92 USDC y a la cuenta de servicio 12,034788,
que es el **0,5000 %** exacto, y el router se queda en cero.

Los vectores de `SwapEvmTest.kt` y `SwapEvmTests.swift` se han vuelto a generar con
**ethers v6**, que es el contraste de fuera de siempre.

En el móvil, **sin probar todavía**.

## 0.53.0 (15/09/2026) — enviar desde Ethereum

Antonio, con la app abierta en una cartera de Ethereum y una foto de la hoja de excusa:
«me da este error». Y tenía razón: el botón **Enviar** sacaba una hoja diciendo que
mandar desde Ethereum se hacía en el escritorio, y esa frase se había quedado **vieja**.
La bóveda ya firmaba en Ethereum desde la 0.50.0 -el puente- y desde la 0.51.0 el
mercado; lo único que faltaba era el envío de toda la vida.

Ahora se puede mandar **ETH, USDC y USDT** desde el móvil.

- **Kotlin** (`FirmaEvm.datosEnvioToken` + `KoberletVault.firmarEnvioEvm`). El ETH viaja
  como `value` con el `data` vacío; un ERC-20 es un `transfer(a, cantidad)`. De la
  pantalla sale el **nombre** del token -ETH, USDC, USDT-, nunca la dirección de un
  contrato: eso lo pone el plugin. La dirección de destino sí viene de la pantalla,
  porque es lo que se está haciendo, y se valida en los dos lados.
- **Pruebas**: el selector `a9059cbb` se **calcula** con keccak, no se copia, y las dos
  transacciones -el ETH suelto y el `transfer` del USDC- salen **byte a byte iguales** a
  las que firma **ethers v6** con la misma clave y los mismos números. Es dinero saliendo
  de una cuenta: no vale «parece que funciona».
- **Pantalla** (`src/enviar-eth.js`), con la **misma forma** que el envío de Kadena:
  agenda filtrada por red, lector de QR (entiende `ethereum:0x…@1`), MÁX, resumen antes
  de firmar, contraseña o huella y la escalera de pasos.
- **Lo que evita perder dinero**, comprobado antes de pedir la contraseña: el gas se paga
  en ETH **también para mandar un token**; mandando ETH, MÁX descuenta el gas **de ahora**
  -preguntado, no una cifra fija-; y el nonce y el precio se piden **al firmar**, no al
  pintar el resumen, porque entre una cosa y otra el usuario ha tecleado su contraseña.
- Se va `hojaAvisa()`: era la hoja de «esto todavía se hace en el escritorio» y ya no
  tiene clientes. Los cuatro botones de una cartera de Ethereum llevan a alguna parte.

Comprobado en el navegador entrando por donde entra Antonio -Panel → tarjeta de Ethereum
→ Enviar-: saldo, dirección mal escrita rechazada, «No tienes tanto USDC», MÁX dejando
el gas justo, el resumen con su fila de gas y la escalera fallando en el primer peldaño
con el mensaje de la bóveda simulada. En el móvil, **sin probar todavía**.

APK `koberlet-0.53.0.apk`, SHA-256 `4c474f00e0d69c388c2c624452d45967b6a071d7a3fa54eb3561bdff4689f0d7`.

## 0.52.2 (15/09/2026)

«El apartado de comprobar, bajo el botón de firmar, toda esa zona debería ser desplegable
como Info y estar plegada por defecto, dando más amplitud a lo que es realmente el puente.»

Hecho: «¿Llegó mi envío a Ethereum?» es ahora un plegable cerrado de fábrica, igual que
«Cómo funciona un puente». Se usa después -cuando uno vuelve a mirar un envío de hace un
rato-, no al enviar, y abierto se comía media pantalla justo debajo del botón de firmar.

APK `koberlet-0.52.2.apk`, SHA-256 `d80a0d8c18ba352dae5d3418172dcf6a9ff511ab3192153c08afe9952b523ea3`.

## 0.52.1 (14/09/2026)

Antonio, probando el mercado de Ethereum: «me pide 2 veces firma», «me pide autorizar el
token y firmar el cambio dos veces». Son dos cosas distintas y las dos tenían arreglo.

**La primera era de forma**: había un botón que sacaba otro botón. Se pulsaba «Comprobar
el cambio» / «Firmar el cambio» y aparecía la contraseña con OTRO «Firmar». Pedir dos
veces lo mismo no protege de nada. Ahora, en los DOS mercados, la contraseña aparece en
cuanto hay un cambio que firmar y el botón firma del tirón, con la huella al lado. La
comprobación del mercado de Kadena no se ha perdido: es el **primer peldaño de la
escalera**, y si dice que no, ahí se para sin firmar nada.

**La segunda era de fondo**: vendiendo ETH pedía «autorizar el token». No hace falta: el
ETH viaja DENTRO de la transacción -es el `value`-, y no hay nada que un contrato tenga
que sacar de tu cuenta. El permiso es cosa de los ERC-20 (USDC, USDT), donde sí son dos
transacciones y no hay forma de que sea una. Ahora se descarta explícitamente por la ruta
(`!r.entraEth`) en vez de fiarse de que el saldo consultado devuelva `null`.

De paso, un fallo tonto que encontré al comprobarlo en el navegador: la zona de firma del
mercado de Kadena se construía pero **no se colgaba de la pantalla** -el `append` final
seguía poniendo el botón viejo-, así que se veía un «Firmar el cambio» suelto que no
respetaba el «no tienes tanto». Cazado porque la comprobación se hizo mirando el DOM y no
la pantalla.

APK `koberlet-0.52.1.apk`, SHA-256 `25b9baee1a049acf83115c6f57b62de1fa8503b53bb4c065dfd7a3113f53ff8c`.

## 0.52.0 (14/09/2026)

Dos cosas, las dos cazadas con el móvil en la mano.

**El Puente ya no simula delante.** Antonio: «nada de simular, Firmar, igual que en todo
para meter passwd o huella da igual la primera que metas». Ahora se pone la cantidad,
**abajo se ve lo que llega** -en un puente es lo mismo que sale; el peaje se paga aparte-
y el botón único es «Firmar el envío»: pide contraseña o huella y va del tirón. La
comprobación **no se ha quitado**, se ha metido dentro: corre después de la contraseña y
antes de firmar, y si no cuadra para ahí sin que el dinero salga. Es lo que trae el peaje
y la cuenta a la que se paga, así que quitarla de verdad no era posible. El aviso de que
«la simulación no comprueba el destinatario» pasa a verse ANTES de firmar, que es cuando
sirve de algo.

**El mercado de Ethereum se quedó sin gas.** Antonio tenía 0,00200986 ETH, puso 0,002 a
cambiar, firmó, y el nodo le contestó esto en pantalla:

    Insufficient funds for gas * price + value: have 2009867520525932 want 2205954455000000

Dos fallos en uno. El de fondo: **con ETH, lo que se cambia y lo que paga el gas salen del
mismo saldo**, y la pantalla no lo miraba -solo decía «deja algo para el gas», que es un
consejo, no un freno-. El de forma: el mensaje del nodo llegaba tal cual, en inglés y en
wei, después de haber puesto la contraseña.

Arreglado: se pregunta el gas de verdad (`maxFeePerGas × gasLimit`), y si no cabe **no se
deja firmar**, diciendo cuánto se puede cambiar como mucho. MÁX descuenta esa reserva de
verdad en vez de un 0,003 ETH fijo -que con este saldo dejaba MÁX en cero-. Y los errores
del nodo de Ethereum se traducen a castellano en `lib/puente.js` (`errorDelNodo`), que vale
para el puente y para el mercado.

APK `koberlet-0.52.0.apk`, SHA-256 `6ed0f969361706363b9b4229b14683bb9827661fe34e573f680fe2d87e737662`.
Comprobado en el navegador: en el puente el campo de abajo se rellena solo, el botón pide
la contraseña y la comprobación para el envío en llano («esta cuenta no tiene KDA en la
chain 2…») sin firmar nada. Verificado rebajándolo por HTTPS.

## 0.51.2 (14/09/2026)

El Mercado ya no enseña los dos mercados a la vez. Antonio: «me abre a la vez la zona de
kda», «en mercado se debería poder seleccionar la zona de kda o la zona de eth», «como en
carteras». Son **dos pestañas** con el mismo aspecto que las de Wallets, se ve una cada
vez, y quien entra desde la tarjeta de una cartera entra por la suya (`mercado-red.js`
guarda cual). Con carteras de una sola red no se pintan las pestañas: un selector de uno
no elige nada.

Y el mercado de Ethereum se maneja **igual que el de Kadena**, que es como lo pidió: el
token que vendes arriba con su MÁX, el que recibes abajo calculándose solo mientras
tecleas, el botón de darle la vuelta en medio y un botón de firmar que pide contraseña o
huella. Los pasos de la operación se quedan como estaban -eso le gustaba-. El trozo de
«un lado del cambiador» sale a `lado-cambio.js` para que los dos mercados usen el mismo y
no se separen solos con el tiempo.

Lo que **no** se puede hacer de una vez es ETH con USDT: no hay ruta de esas cuatro. Se
dice el camino («pasa por USDC») en vez de dejar un botón que no hace nada.

APK `koberlet-0.51.2.apk`, SHA-256 `c9ecf93f3517285c40a9254d7f8d898192ef1a065ff5f5ce2656af9c2a8d37b8`.
Comprobado en el navegador con dos carteras -una de cada red-: las pestañas cambian de
mercado, el de Ethereum cotiza de verdad contra Uniswap (5 USDC → 0,00195818 ETH), la
vuelta funciona y el par imposible avisa. Verificado también rebajándolo por HTTPS.

## 0.51.1 (14/09/2026)

Un arreglo solo: el botón **Mercado** de la cartera de Ethereum seguía enseñando el cartel
de «para cambiar en Ethereum, de momento, el escritorio» y no abría nada. Lo cazo Antonio
en cuanto instalo la 0.51.0. El mercado de Ethereum estaba hecho y publicado; lo que no se
había tocado era el botón que lleva a él -quedó el aviso de cuando se pusieron los cuatro
botones en la tarjeta de Ethereum-.

La leccion, que ya ha pasado otras veces: **una pantalla nueva no está entregada hasta que
se entra en ella por donde entra el usuario.** Probar el módulo no es probar el camino.

De paso, el mercado de Kadena ya no se pinta cuando la cartera solo tiene Ethereum -esa
caja no podía cambiar nada- y las cantidades de Ethereum se enseñan con 8 decimales como
mucho en vez de con los 18 enteros. Lo que se firma no cambia: sigue siendo el número
entero.

APK `koberlet-0.51.1.apk`, SHA-256 `9fe8cb1df52854683d163b4bccd3692260cb837cd092dd80b5bc7a76b84d0fba`.
Comprobado rebajándolo por HTTPS y con el certificado de siempre. En el servidor quedan la
0.51.1 y la 0.51.0.

## 0.51.0 (14/09/2026)

Sube lo que estaba acumulado desde la 0.50.1:

- **Enviar cualquier token de Kadena, no solo KDA** (`src/enviar.js`, `FirmaKda.envioToken`).
  La pantalla trae ahora un selector de «qué envías» con lo que se tenga, cada token con
  sus chains y su precisión. El módulo Pact viaja desde la pantalla —no hay catálogo
  posible de tokens de Kadena— pero se valida con un patrón estrecho (`moduloValido`) y
  la capability acota a quién y cuánto, así que aunque el módulo fuera mentira no se
  puede mover otra cosa. Cross-chain sigue siendo solo de KDA, y si no hay KDA en esa
  chain para el gas se avisa antes.
- **Mercado de Ethereum** (`src/mercado-eth.js`, `src/lib/ethswap.js`, `SwapEvm.kt`):
  USDC↔ETH y USDT↔USDC por Uniswap v3, como en el escritorio. Se prueban las tres
  comisiones de pool y se coge la que mejor pague. Lo que se firma es **el mínimo que se
  enseñó**, nunca uno recalculado. El `multicall` se arma en Kotlin y hay prueba que lo
  compara byte a byte con lo que produce ethers.
- **El mercado de Kadena ya firma** (`FirmaKda.cambioAmm`, `firmarCambioAmm`,
  `ofrecerCambio()` en `src/pantalla-mercado.js`). Antes se quedaba en «comprobar el
  cambio» y ahí moría. Ahora, **después** de una simulación buena —que es gratis, y aquí
  un error no se devuelve—, se ofrece firmar con contraseña o huella y se ve la escalera
  de pasos con su referencia copiable. El camino del cambio lo trae la pantalla porque
  los pares se descubren en la cadena; contra eso hay pruebas de que por el camino no se
  cuela código Pact y de que solo se firman `coin.GAS` y el `TRANSFER` del primer salto
  hacia el pool.
- Pruebas: 9 en JS, 97 en Kotlin, todas en verde.
- **Sin probar en hardware**: envío de un token que no sea KDA, y la firma del cambio en
  cualquiera de los dos mercados.

APK `koberlet-0.51.0.apk`, SHA-256 `b5fbe1a5cbc67678286f2349bf2aa08ca2bff4ec46249ca3e27b1016f4433ec1`,
mismo certificado de siempre (`75194f6a…`). Comprobado rebajándolo por HTTPS: la huella
coincide con la compilada. En el servidor quedan la 0.51.0 y la 0.50.1.

---

## Un fallo que contó la 0.50.0 y arregló la 0.50.1

El seguimiento del envío por el puente **no se veía**: al firmar seguía ahí el botón de
simular y no aparecían ni los pasos ni el circulito, y al volver a la pantalla tampoco.
Lo cazo Antonio con una foto, y el motivo merece quedar escrito porque es de los que se
repiten:

`pintarEnMarcha()` empezaba comprobando `salida.isConnected` para darse de baja de los
avisos si la pantalla ya se había ido. Pero **al construir la pantalla ese trozo todavía
no está colgado del documento** -se cuelga después, cuando el llamador hace `append`-,
así que la primera llamada, la de «mira si hay algo en marcha», creía que la pantalla ya
no existía y **se daba de baja para siempre**. Desde ese momento ningún aviso llegaba a
nadie.

La comprobación va en el OYENTE, que es donde de verdad puede haberse ido la pantalla, no
en la función que pinta. Y la lección de fondo: `isConnected` no significa «esto está
vivo», significa «esto está colgado del documento AHORA MISMO», que durante el montaje es
falso aunque todo vaya bien.

Comprobado en el navegador, no a ojo: se monta la pantalla, se arranca una operación, se
tira la pantalla y se pinta otra, y la escalera vuelve con el reloj contando desde donde
iba (10 s), el botón de simular oculto y los controles desactivados.

- **LA BOVEDA YA FIRMA TRANSACCIONES DE ETHEREUM** (`FirmaEvm.kt`). Es la pieza que
  faltaba desde el principio y la que desbloquea todo lo demás de esa red.
  - **Puente Ethereum → Kadena desde el móvil**, que es lo que pedía Antonio. Son
    **dos** transacciones: `approve` del USDC al router y luego `transferRemote`. La
    pantalla lo cuenta como cuatro pasos para que nadie se pregunte por qué firma dos
    veces.
  - Se autoriza **la cantidad justa**, no el infinito de costumbre: si el contrato del
    puente tuviera un fallo, con permiso infinito se lleva todo el USDC de la cuenta.
    El precio es que cambiar la cantidad obliga a autorizar otra vez.
  - El **custodio** (esa tira de bytes que, mal formada, deja el dinero bloqueado en
    Ethereum para siempre —hallazgo R1, costó 1 USDC aprenderlo—) se calcula **en
    Kotlin** a partir de la cuenta. No llega hecho desde el WebView, como no llega
    nada que decida dónde va el dinero.
  - **Cómo se ha comprobado que la firma es buena**, que aquí no vale «parece que va»:
    - El `rawTransaction` sale **byte a byte igual** que el que firma **ethers v6** con
      la misma clave y los mismos números. Está congelado como prueba: si alguien
      toca el RLP, el hash, la `s` canónica o el bit de paridad, esa prueba se cae.
    - El `data` del `transferRemote` que arma Kotlin es **idéntico** al que arma el JS
      que ya funciona en el escritorio (cotejado hex contra hex).
    - Los selectores se **calculan** con keccak en la propia prueba, no se copian.
    - La firma es determinista (RFC 6979): sin fuente de azar que pueda salir mal. Un
      `k` repetido en ECDSA no es un fallo cualquiera, **revela la clave privada**.
    - 19 pruebas nuevas en Kotlin (65 en total, todas pasan).
  - **Topes**, por si un nodo contesta cualquier cosa: peaje máximo 0,05 ETH, gas
    máximo 900.000, precio del gas máximo 500 gwei. Fuera de ahí no se firma.
  - La **propina** lleva un suelo de 0,1 gwei: los nodos públicos contestan hoy 38.817
    wei (0,00004 gwei) y con eso una transacción puede quedarse esperando para siempre,
    porque el bloque se ordena por propina. Con el suelo, el envío sale por ~0,00018
    ETH de tope.
  - ⚠️ **Sin probar con dinero de verdad todavía.** Lo que está comprobado es que la
    firma es correcta y que la llamada es la misma que la del escritorio; lo que falta
    es verla salir. El primer envío real es la prueba.

---

## Lo último (0.49.0)

Publicada el 14/09/2026. SHA-256 `169d4e3a579d07b572ce00a70ca821a04cde896d52b78134866f2fe6185b0b44`,
firma y certificado idénticos a los de la 0.48.0 (cotejado con `apksigner` antes de subir),
hash verificado por HTTPS tras la subida. En el servidor quedan las **dos últimas**
(0.49.0 y 0.48.0); la 0.47.1 se borró de ahí y sigue en `salida/`.

- **El SPT se cuenta a 200 KDA**, que es lo que dijo Antonio el 14/09/2026, y la pantalla
  dice de dónde sale ese número: «SPT contado a 200 KDA, que es su precio de venta:
  todavía no cotiza en ningún mercado.»
  - Va en `PRECIO_EN_KDA` de `src/valor.js`, **aparte** de los pegados al dólar, porque no
    es lo mismo: un kb-USDC vale un dólar porque es un dólar; el SPT vale 200 KDA porque
    lo dice su dueño, que es quien lo vende. Es un precio con fundamento -no hay otro
    sitio donde mirarlo- pero **no es un precio de mercado**, y meterlo en un total sin
    avisar sería exactamente lo que este módulo existe para no hacer.
  - ⚠️ Antonio dijo «de momento». Ese número **se va a mover**, y si el día que se mueva
    nadie toca esa línea, la app estará enseñando un valor viejo con cara de dato.
- **Quitado el `chain: 0` muerto de PCO y SPT** en `config.js`. No lo usaba nadie:
  `saldoTokens` pregunta por los tokens en **las 20 chains** y suma. Comprobado en la
  cadena con la cuenta del móvil, que tiene **PCO en la chain 2 y SPT en la chain 0**, o
  sea que la chain declarada ni siquiera era la buena. Un campo que no se usa y además
  miente solo sirve para que alguien se fíe de él algún día.
- **Al picar en un activo sale su ficha**: cuánto hay exactamente, cuánto vale y **en qué
  chains está repartido, con la cantidad de cada una**. Lo pidió Antonio el 14/09/2026
  viéndolo en el móvil. Hasta ahora ese reparto solo se veía para el KDA; el saldo de un
  token es la suma de las 20 chains y con la suma sola no se puede enviar, porque para
  enviar hay que saber de qué chain sale. Si está en más de una, la ficha lo advierte.
  - Los tokens puenteados (`kb-*`) viven **solo en la chain 2**, y así se pinta.
  - Si la consulta no devolvió el reparto, la ficha lo dice en vez de inventárselo.
- **La lista de activos se queda en 5 filas y el resto se ve subiendo dentro de ella.**
  También de Antonio: «se deberían ver máximo 5, para ver más se debería correr hacia
  arriba… como una ventana dentro, que se pueda correr sin mover los botones verdes».
  Los botones de acción van **encima** de la lista, así que el scroll interno no los
  mueve. La altura se **mide** sobre la quinta fila en vez de escribirse a mano (un
  nombre largo se parte en dos líneas y una altura fija cortaría filas por la mitad), y
  se le dejan 10 px de propina para que asome el filo de la sexta: si corta limpio,
  nadie va a intentar subir en algo que no da ninguna señal de tener más.
- **El envío por el puente enseña por dónde va**, en tres pasos: firmar en el móvil,
  mandar la transacción a Kadena, esperar a que entre en un bloque. El que está en
  marcha va en negrita con un **circulito girando** y un **segundero** al lado (un emoji
  de reloj de arena es un dibujo quieto: no demuestra nada), los hechos en verde con ✓ y el que
  falla en rojo con ✗, y los pasos **no se borran** al fallar: saber si se torció antes o
  después de mandar la transacción es saber si el dinero ha salido o no.
  - Lo pidió Antonio: «el no ver nada cuando se mueve dinero causa nerviosismo, y más si
    es proceso largo». Entre la firma y el bloque puede pasar un minuto, y una pantalla
    callada un minuto no parece que trabaje, parece colgada. Quien cree que se ha colgado
    vuelve a pulsar, y en un puente sin vuelta atrás eso es mandar el dinero dos veces.
  - Mientras hay algo en marcha, el botón de simular **desaparece** (no se queda gris: un
    botón gris sigue pareciendo el sitio donde pulsar) y se **desactivan** cantidad, MÁX,
    los selectores de cartera y el de girar el sentido. Tocar cualquiera de ellos durante
    la firma repinta por debajo y lo que se enviaría ya no sería lo que se simuló.
  - La **referencia se pinta en cuanto el nodo acepta**, no al final: a partir de ahí el
    dinero ya se ha movido y esa referencia es lo único con lo que recuperar qué pasó.
  - **Aviso de paciencia por delante**, no cuando ya está uno nervioso: «esto suele
    tardar uno o dos minutos, no cierres la app ni vuelvas a pulsar». Y pasados **tres
    minutos** se dice lo otro, que a esas alturas la duda ya no es cuánto queda sino si
    se ha perdido.
  - **Parte del nodo cada 15 segundos** mientras se espera («preguntado N veces:
    todavía no está en un bloque»), que es lo que pidió Antonio. `esperarResultado()`
    consulta cada 5 s y ahora acepta un `alMirar`; la pantalla habla cada tres vueltas
    —una línea que cambiase cada 5 s se leería como nerviosismo—, salvo si el nodo no
    contesta, que eso se dice en cuanto pasa: «todavía no está» y «no se puede
    preguntar» no son lo mismo.
  - La misma escalera va ya en el **envío de KDA** (tres pasos, y **cinco** si es entre
    chains: recoger la prueba y entregarla en la otra) y en el **DCA** (crear plan,
    pausar, reanudar, recargar, cerrar). Vive en `src/pasos.js`.
  - ⚠️ Visto solo en código: falta verlo correr en el móvil con un envío de verdad, que
    sigue esperando a tener ~59 KDA en la chain 2. El aspecto sí está comprobado en el
    navegador.
- **Las referencias llevan botón de copiar** (`src/copiable.js`), y dicen para qué
  sirven. En el Puente se enseñaban dos cosas parecidas y solo una vale para el
  comprobador de «¿Llegó mi envío a Ethereum?»: la que se pega ahí es la **referencia de
  la transacción**, así que es la que sale con el botón y con esa frase debajo. El
  identificador del mensaje pasa a un desplegable aparte, marcado como lo que es —para
  el explorador del puente—. Lo pidió Antonio, y con razón: 43 caracteres tecleados a
  mano en un móvil no dan un error claro, dan un «no existe» que parece que el dinero
  no está.
- **El envío del puente sobrevive a salir de la pantalla.** El seguimiento ya no vive en
  el DOM sino en `src/enmarcha.js`; la pantalla solo pinta lo que hay allí y se apunta
  para que la avisen. Se sale a mirar el saldo, se vuelve, y está la escalera con el
  circulito girando, **el reloj contando desde donde iba** y las líneas ya salidas
  (referencia incluida). Mientras hay algo en marcha la pantalla sigue congelada, así
  que no se puede empezar un segundo envío; al terminar sale un botón de Cerrar.
  - Lo pidió Antonio, y el motivo de fondo es el de siempre: quien vuelve y no ve nada
    da por perdido el envío, y lo siguiente que hace es mandarlo otra vez.
  - ⚠️ **Lo que NO hace**: si la app se cierra del todo, el seguimiento no se reanuda
    solo. La transacción sigue su camino —eso no depende del móvil—, pero hay que
    retomarla a mano con la referencia. Por eso la referencia se enseña y se puede
    copiar en cuanto existe.
- **El número grande del Panel cambia de cara al tocarlo**: dinero ↔ moneda de la red, y
  otro toque y vuelve. Lo pidió Antonio viendo su cartera de Ethereum encabezada por
  «0,00139 ETH»: un número así no dice si es mucho o poco. La cantidad exacta tampoco
  sobra —es la que se envía—, así que no se elige por él: se enseñan las dos y manda el
  dedo. El renglón de debajo dice de qué es el número de arriba, y la elección aguanta
  los repintados.
  - Para eso ahora se pide **también el precio del ETH**, en la misma llamada a CoinGecko
    que ya traía el del KDA (`ids=kadena,ethereum`): cuesta lo mismo. Con eso la tarjeta
    de Ethereum enseña además el valor de cada línea (ETH y USDC).
  - Si no se sabe el precio no hay dos caras: se queda en moneda y la cifra ni se marca
    como tocable. Prometer un cambio que luego no pasa es peor que no ofrecerlo.
- **Historial del puente** (`src/historial-puente.js`), con el botón **Historial** en la
  esquina de arriba a la derecha de la pantalla. Un envío por el puente no se ve en
  ningún sitio —no sale en los movimientos de la cuenta, es una llamada a un contrato— y
  lo único con que preguntar por él es una referencia que hasta ahora moría al salir de
  la pantalla. Ahora se apunta **en cuanto el nodo acepta**, no al terminar: el caso que
  importa, que la app se cierre a mitad, es justo el que no quedaría escrito.
  - Cada fila lleva cantidad, fecha, destino, estado y su propia referencia copiable, más
    un botón de **comprobar si ya llegó** que pregunta al relayer en el momento.
  - Va en `localStorage` en claro y a propósito: ahí no hay ningún secreto —cantidades,
    direcciones y referencias son públicas— y cifrarlo obligaría a pedir la contraseña
    para ver una lista, que es lo que uno quiere mirar cuando su dinero no aparece.
  - La hoja dice que **está guardado en este aparato** y que borrarlo **no deshace ningún
    envío**, para que nadie crea que está cancelando algo.
  - Fuera lo de «experimental, cantidades pequeñas», por petición de Antonio. El aviso
    que sí hace falta —el respaldo cuelga de una sola llave— sigue en «Cómo funciona un
    puente».
- **La cartera de Ethereum enseña los cuatro botones**, como la de Kadena: cambiar de
  cartera no debería cambiar la forma de la pantalla. Los dos que aún no se pueden hacer
  (Enviar, Mercado) lo explican al pulsarlos en vez de quedarse apagados sin decir por
  qué.
- **Puente, retoques de pantalla** (Antonio): el botón que gira el sentido es ~50 % más
  grande y va con borde verde —es el control que decide hacia dónde va el dinero, tiene
  que verse antes que nada y ser difícil de fallar con el dedo; el verde relleno no se
  usa porque en esta app es el botón de la acción de verdad—, y las etiquetas «Desde qué
  cartera» / «A qué cartera» se quedan en **«Desde»** y **«A»**, con lo que los
  desplegables de cartera se alargan y ya cabe el nombre entero con su trozo de cuenta.

---

## La anterior (0.48.0)

Publicada el 14/09/2026. Es la primera que sale con varios cambios juntos en vez de uno
por versión: sacar una por arreglo le cuesta a Antonio instalar y probar cada vez.

- **El número grande del Panel pasa a ser lo que VALE la cartera**, no cuántos KDA hay.
  Con tokens dentro, el KDA es solo una parte, y encabezar con él deja el número
  principal contando un trozo. La cantidad de KDA sigue entera en su línea. El renglón
  de debajo deja de decir «suma de 20 chains» -que era el pie del KDA- y dice de qué es
  el número de arriba.
- **ARREGLADO: kb-USDC salía sin valor y fuera del total.** Lo vio Antonio en el móvil:
  22 kb-USDC, la columna del dinero en blanco y el total diciendo 0,01 €. El valor se
  calculaba **al insertar** cada línea, y lo puenteado llega antes que el precio: se
  valoraba contra un precio que todavía era `null`, se quedaba en «no se sabe» y nadie
  volvía a mirarlo. Ahora se guardan las CANTIDADES y el valor se saca entero en cada
  repintado, que es lo único que aguanta que las piezas lleguen en cualquier orden.
- **Lo que no tiene precio conocido se pinta en 0,00**, no en blanco. Lo pidió Antonio al
  verlo: un hueco vacío en una columna de dinero se lee como que falta por cargar. Sigue
  fuera de la suma, y el pie sigue diciendo que el total no lo lleva dentro.
- ⭐ **ARREGLADA la restauración de copias, el fallo de Jesús.** Guardar la copia le iba
  bien y restaurarla le devolvía a la pantalla de entrar, sin decir nada y perdiendo el
  fichero recién elegido. La causa era el **cerrojo por inactividad**: para elegir el
  fichero hay que salir de la app e irse a Drive, y ese rato contaba como abandono; al
  volver, la comprobación saltaba en el acto. Exportar sí funcionaba porque ahí sales y
  no vuelves. Restaurar obliga a volver, y era volver lo que la app castigaba.
  - `abriendoDialogoDelSistema()` en `salir.js` perdona ese viaje. La regla es estrecha a
    propósito: solo cuando ha sido LA APP la que abrió el diálogo del sistema, solo un
    rato acotado (10 min), y se acaba en cuanto el dueño vuelve a tocar la pantalla.
    Irse a Inicio o que te llamen siguen contando como siempre.
  - El permiso NO lo gasta el latido de 15 s, que corre también en segundo plano: lo gasta
    el primer toque de vuelta. Gastarlo en el latido dejaba al dueño sin él justo al volver.
- **Y cuando el cerrojo sí salta, ahora lo dice.** La portada enseña «Se cerró sola por
  seguridad: llevaba un rato sin tocarse. Se cambia en Ajustes.» Volver a la pantalla de
  entrar sin explicación es lo que hizo creer a Jesús que la restauración estaba rota.
- **«Más» adelgaza de ocho botones a cinco**, a petición de Antonio al verlo en el móvil.
  Quedan Mercado, Puente, Seguridad, Info y Ajustes.
  - **NFT sale del menú.** La sección está hecha y ve las piezas, pero es de solo lectura
    y mover una todavía no se puede: era un botón para mirar una lista vacía. El código se
    queda entero; devolverla es devolver su línea a `SECCIONES`.
  - **Copias se va dentro de Seguridad y de Ajustes**, donde ya estaba enlazada desde la
    0.45.1 y donde la busca la gente. Una copia de seguridad es seguridad.
  - **Red se va dentro de Ajustes**, al lado de donde se añaden redes a mano. Se mira de
    higos a brevas y no merecía puerta propia. Hubo que añadirle el enlace: era la única
    de las tres que no tenía otra forma de llegar, y sin eso se quedaba inalcanzable.
  - Ninguna pantalla se ha tocado ni perdido: lo que cambia es la puerta. `ir(id)` vale
    para cualquier id, esté o no en la lista del menú.
- **La lista de «lo que falta» de Info estaba mentira y se ha rehecho.** Decía que crear
  planes de DCA y enviar por el puente no se podía, y las dos cosas llevan hechas desde la
  0.37.0 y la 0.47.0. Ahora dice lo que de verdad falta: firmar el cambio en Mercado,
  Launch, Órdenes, mover un NFT, y enviar desde Ethereum (las dos últimas por lo mismo:
  falta firmar secp256k1 en Kotlin). Esa lista es la página donde esta app dice lo que no
  sabe hacer; dejarla vieja la convierte en lo contrario de lo que pretende.
- **Pendiente de este mismo camino**: leer el fichero desde Kotlin en vez de con el campo
  de la página. Si Android destruye la pantalla web mientras está al fondo -y en un
  Android 9 con poca memoria pasa-, al volver se recarga y el fichero elegido se pierde
  igual. El cerrojo era la causa probada; esto sigue siendo un agujero posible.

---

## Lo último (0.47.1)

- **Arreglada la simulación del puente, que llevaba mal escrito el peaje.** Lo encontró
  Antonio en el móvil (14/09/2026): «Type check failed. The argument is object but the
  expected type is decimal», en `coin.transfer`. En `simularHaciaEvm` el importe del peaje
  viajaba como `{decimal: 58.42}` con un **número** dentro, y esa no es la forma literal
  que Pact reconoce; el resto de la app ya lo mandaba como texto. De paso, el importe del
  token iba como número suelto: con una cantidad redonda —él puso 5— el nodo lo lee como
  **entero** y la capability tampoco encaja.
- **Por qué no se había visto hasta hoy**: hasta esta semana la cuenta de pruebas no tenía
  KDA en la chain 2, así que el nodo se paraba antes, al comprar el gas, y nunca llegaba a
  evaluar la capability. Con 1,5 KDA dentro llegó, y salió el fallo. Los fondos no eran
  para probar esto y son los que lo han destapado.
- Ahora la simulación manda **exactamente el mismo texto** que el comando que firma Kotlin,
  con los mismos 12 decimales. No se arregla solo por que funcione: simular sirve para
  saber qué va a pasar al firmar, y eso exige que los dos manden lo mismo. Verificado
  contra la cadena con la cuenta del móvil: ya no hay error de tipos y se para en
  `coin.debit` por fondos, que es lo cierto.
- **«Insufficient funds» del `coin` ya no dice «no hay saldo suficiente».** Cuando lo que
  falta son KDA para el peaje, con los 22 kb-USDC delante, ese mensaje manda a buscar donde
  no es. Ahora dice: «te faltan KDA en la chain 2. El peaje del puente se paga en KDA, así
  que tener el token no basta.»

## Lo último (0.47.0)

- **El puente ya se firma desde el móvil, de Kadena a Ethereum.** Era la sección que
  miraba, calculaba el peaje y simulaba, y luego decía «esto se hace en el escritorio».
  Ya no. `FirmaKda.envioPuenteEvm` monta el comando en Kotlin con las **tres
  capabilities**: `TRANSFER_REMOTE` del token con el dominio, el remitente, el
  destinatario y el importe exactos; `coin.TRANSFER` del peaje, con un 5 % de margen
  sobre lo cotizado y ni un céntimo más; y `coin.GAS`.
- **El destinatario de 32 bytes lo calcula Kotlin, no la pantalla.** Es el hallazgo R1 de
  la auditoría propia: si ese formato va mal, el token se queda bloqueado en Ethereum y
  no hay revert, ni rescate, ni aviso. Nos costó 1 USDC aprenderlo. Que lo arme el lado
  que firma quita de en medio la única forma de perder el dinero sin que nadie robe nada.
- **El peaje se acota también en Kotlin**, aunque el JavaScript ya lo acotara: es el
  único número que viene de fuera y acaba dentro de una capability que mueve KDA. Un nodo
  manipulado podría inflarlo.
- **Solo se puede enviar lo que se acaba de simular bien**, y con los números que se han
  enseñado. Simular es gratis y aquí un error no se devuelve.
- ⭐ **Comprobado contra la cadena** (14/09/2026): el comando **exacto** que monta Kotlin
  —volcado desde un test y mandado a `/local`— pasa el código, el módulo, el `{int}` del
  dominio y las tres capabilities, y se para en `coin.debit` con «Insufficient funds»,
  que es justo donde tiene que pararse: el peaje son 55,64 KDA y la cuenta de pruebas
  tiene 1,5. No falló por «Keyset failure», que es la señal de capabilities mal tipadas.
- De esa prueba salió un fallo real: el **gas iba a 4.000** y un dispatch del puente no
  es una transferencia. Se sube a **60.000**, el mismo que usa el Koberlet de escritorio
  en este mismo envío, que es un número ya probado en la cadena. Con 4.000 el envío se
  habría caído y el gas se paga igual.
- **El sentido Ethereum → Kadena sigue sin firmarse** y ahora lo dice solo cuando toca,
  en vez de un aviso fijo: mandar desde allí es firmar una transacción de Ethereum, que
  es otra criptografía y no está en el plugin.

- **El total de la cartera cuenta lo que vale, no solo los KDA.** Antes el número en
  dinero era el del KDA y los tokens no sumaban: con 22 kb-USDC dentro, el total decía
  0,01 €. Ahora suman los que se pueden valorar y cada uno enseña su valor en su línea.
  - Qué se valora y qué no lo decide `src/valor.js`: **solo los tokens pegados al
    dólar** (kb-USDC, kb-USDT, y USDC/USDT en una cuenta de Ethereum). PCO, SPT o cBTC
    **no** se valoran, porque no hay de dónde sacar su precio con fundamento: el del pool
    del mercado no vale, que ahí cBTC cotiza a 104 KDA. Un número inventado dentro de un
    total es peor que un hueco, porque quien lo mira decide con él.
  - Y si hay algo sin precio conocido, el total **lo dice**: «sin contar lo que no tiene
    precio conocido». Sin esa coletilla se lee como «esto es todo lo que tengo».
  - El cambio dólar → moneda elegida sale de dividir el precio del KDA por sí mismo en
    las dos monedas, que ya vienen en la misma llamada. Sin pedir nada a nadie más.
  - El «% en 24 h» pasa a decir **«el KDA»** delante: es el del KDA, y un total con
    dólares dentro no se mueve lo que se mueve el KDA.
  - El total se arma por piezas y se repinta según llegan: el KDA viene con el saldo, lo
    puenteado tarda otro viaje y el precio es un tercero que puede no contestar.
- **Sin probar en el aparato todavía**: 47 pruebas de Kotlin y 9 de JavaScript en verde,
  y el comando del puente validado contra la cadena, pero ni el envío real por el puente
  ni el total en dinero se han visto en un móvil.

## Lo último (0.46.0)

- **Cobrar poniendo el precio en dinero, no en KDA.** En Ajustes se elige la moneda de
  referencia (euro, dólar, libra, franco) y en la pantalla de Recibir un botón conmuta la
  casilla entre KDA y esa moneda: escribes 10 €, el QR pide los KDA que valen 10 € al
  cambio de ese momento. El conversor vive en `src/moneda.js` (`aKda`, `aDinero`,
  `formateaDinero`), con el mismo patrón que `tema.js`, y devuelve `null` —no cero, no
  infinito— cuando la entrada no vale.
- **El QR congela KDA, nunca dinero.** Es la decisión de diseño que sostiene la pantalla:
  lo que viaja en el código es una cantidad de KDA, y el pie dice a qué cambio se calculó y
  avisa de que si el precio se mueve antes de que te paguen cobrarás esos KDA, no ese
  importe. Si el precio no llega, el botón de conmutar ni aparece: no se enseña un cambio
  que no se tiene.
- `precioKda()` pide ahora las cuatro monedas en la misma llamada a CoinGecko, así que
  cambiar de moneda no gasta otra consulta ni invalida la caché.
- **La cuenta ya no ocupa dos líneas en Recibir.** Los 66 caracteres se partían por donde
  caía y nadie los leía; sale acortada, un toque la enseña entera para quien sí quiere
  comprobarla, y el botón de copiar sigue copiando la de verdad.
- Publicado el 13/09/2026; `sha256` del APK cotejado por HTTPS: `facc417c…`. La pantalla se
  dio por revisada en la sesión del 12/09, pero **no consta la traza** de esa revisión, y
  **no se ha probado en un móvil de verdad**.

## Lo último (0.45.12)

- **Encontrado y arreglado por qué la huella cerraba la app en Android 9 y 10.** Al diálogo
  del lector le faltaba el botón de cancelar: `BiometricPrompt` lo exige cuando no se
  admite el código del móvil como alternativa, y sin él `build()` lanza excepción. En
  Android 11 y siguientes el código del móvil va incluido —el diálogo pone su propio
  botón— y por eso allí funcionaba: el fallo solo salía en los móviles viejos, que son
  justo los que no teníamos delante. El texto del botón se coge del sistema, así que sale
  en el idioma del móvil.
- Lo destapó el guard de la 0.45.10: en vez de morirse, la app dijo «No se pudo abrir el
  lector de este móvil» y con eso ya se podía buscar. Un fallo que se ve es medio fallo.
- **Los cinco decimales, en todas las pantallas.** El formateo vive ahora en `cifras.js`
  (`formatea` y `recorta`) y de ahí tiran el Panel, el envío, el historial, Mercado, Puente
  y DCA. Donde una pantalla pedía menos decimales —porcentajes, comisiones— se respeta;
  donde pedía más (8, 6) se baja a 5.
- **Lo que se ve y lo que se firma son cosas distintas, y siguen siéndolo.** Recortar es
  solo pintura: el «Máx.» sigue metiendo en la casilla el número exacto con 8 decimales,
  la confirmación enseña tal cual lo que has escrito, y lo que se firma y se manda al nodo
  no pasa por ninguna de estas funciones.

## Lo último (0.45.11)

- **Cinco decimales como mucho en la lista de activos y en el total.** Los tokens llegaban
  con doce y la lista era una fila de números ilegibles. Se **recorta, no se redondea**:
  redondear hacia arriba enseñaría más de lo que hay, y eso en un monedero no se hace.
  Y lo que no llega al quinto decimal se pinta `< 0,00001`, nunca `0`: decir cero cuando
  hay algo es la otra forma de mentir.
- Lo exacto sigue donde se actúa sobre ello: el reparto por chains, la pantalla de envío
  («Chain 2 — 15,99999755 KDA») y la ficha de cada movimiento. Ahí el último decimal es la
  diferencia entre que una transacción entre o se caiga.

## Lo último (0.45.10)

- **La huella ya no puede cerrar la app.** En `Huella.kt` el diálogo se montaba fuera del
  `try`: `PromptInfo.Builder().build()` y el propio constructor lanzan excepción en algunos
  móviles —combinaciones de autenticadores que ese Android no admite, fabricantes con su
  propia versión del diálogo— y una excepción suelta dentro de `runOnUiThread` no la recoge
  nadie: se lleva la app por delante. Ahora todo el montaje va dentro del `try`, el detalle
  técnico se escribe en el log del sistema y al dueño se le dice **«No se pudo abrir el
  lector de este móvil. Entra con la contraseña.»**
- Motivo: un probador reporta que la app se le cierra al tocar la huella o la cara. Esto
  tapa el agujero —la app ya no puede morirse por ahí— pero **no está confirmado** que
  fuera esa la causa en su teléfono: haría falta el logcat de ese aparato para saberlo.

## Lo último (0.45.9)

- **Fuera el bloque «Esta app» de Ajustes.** Era una tarjeta con la versión y un botón
  «Abrir Info»: un cajón cuyo único contenido es un enlace a otra pantalla que ya está a un
  toque en «Más». La versión sigue en Info y en la portada.

## Lo último (0.45.8)

- **Arreglado: en Seguridad el valor de una fila se iba volando a la esquina.** La clase
  del estado «esto falta» se llamaba `ojo`, y `ojo` es también el ojito de las contraseñas,
  que va `position: absolute; right: 0; top: 0`. Cualquier fila en ese estado —el cifrado
  en el navegador, la huella sin activar en el móvil— se pintaba fuera de la tarjeta, en
  la esquina de arriba a la derecha, partida letra a letra. Ahora la clase se llama
  `flojo`. Lo vio Antonio en la maqueta; afectaba igual al APK.
- De paso, en el navegador el cifrado se dice en corto: **«AES-256 en el navegador»**.

## 0.45.7

- **El «Máx.» deja de estar en el camino del pulgar.** Era un botón ancho («Enviar el
  máximo (deja gas)») justo encima de «Continuar»; un roce ahí y la cantidad pasaba a ser
  todo el saldo de la chain. Ahora es un botón pequeño en la **etiqueta del campo de la
  cantidad**, a la derecha. Un botón que vacía la cuenta no se pone donde va el dedo a
  seguir. Lo pidió Antonio al verlo en el móvil.
- **Confirmado en hardware**: enfocar el QR de cobro con la cámara del móvil abre Koberlet
  y llega a Enviar con la cuenta, la cantidad y la chain puestas (0.45.3). Es la primera
  vez que se ve funcionando en un aparato de verdad.

## 0.45.6

- **Fuera los avisos de simulación en el navegador.** La banda roja ya no sale por estar
  en la maqueta: ahora **solo** aparece si la delata de verdad —app instalada usando la
  bóveda de desarrollo— y con ese texto. Una banda roja permanente que siempre dice lo
  mismo no avisa de nada: enseña a no leer las bandas rojas, y el día que importe pasará
  desapercibida. El canario se conserva donde sirve.
- La cabecera del Panel ya no repite «· Bóveda simulada (pruebas)»; en la app instalada
  sigue diciendo «· Bóveda nativa (Android)», que es lo que informa. El dato sigue en
  **Info → Datos técnicos** y en **Seguridad → Cómo está protegida**, que es donde se va a
  comprobar.
- Los botones «Copiar (solo en el navegador)» pasan a decir **«Copiar»**: solo existen en
  el navegador, así que la coletilla no informaba de nada.

## 0.45.5

- **Mercado sube a los círculos del Panel** (Enviar · Recibir · Puente · Mercado) y, con
  Puente, **sale de la barra de abajo**, que queda en tres: Panel, DCA, Carteras, más
  «Más». Cambiar o puentear es lo que uno hace con su dinero, no un sitio al que ir; y la
  barra del dinero se queda con menos ruido y botones más anchos.
- Las dos siguen listadas detrás de **«Más»**, a propósito: los círculos solo existen en
  la tarjeta del Panel y la de una cartera **EVM** no pinta Mercado. Sin esa segunda
  puerta, desde una cartera de Ethereum el Mercado no tendría camino.
- El hueco entre círculos es ahora `clamp(14px, 5vw, 26px)`: con cuatro, a 320 px de ancho
  se estrecha solo en vez de sacar el último fuera de la tarjeta. Comprobado a 320 y 375.

## 0.45.4

- **Cada movimiento se abre y cuenta lo que pasó.** En el historial, tocar una línea abre
  su ficha: cantidad, fecha y hora exactas, chain, número de bloque, las **dos cuentas
  enteras** y la clave de la transacción, que se copia. En la red principal hay además
  enlace al explorador de la comunidad (un `<a target="_blank">`, para que lo abra el
  navegador del móvil y no el WebView).
- Dos cosas que descolocan a cualquiera la primera vez, ahora explicadas en la propia
  ficha: el movimiento pequeño hacia una cuenta sin `k:` («esto es el gas, lo que cobra el
  minero») y el que sale sin destino a la vista («la primera mitad de un envío entre
  chains»). Se dicen como sospecha razonada, no como certeza: el indexador da lo que da.
- `movimientos()` devuelve ahora también `de`, `para` y `altura`.

## 0.45.3

- **«Copiar el QR» copia solo el QR.** Se quitó el texto que se pegaba con la imagen
  (0.45.2): la cantidad y la chain ya viajan dentro del propio código, y quien lo escanee
  las ve en su pantalla de envío. El que quiera decirlas con palabras las escribe en el
  mensaje.
- **El QR abre la app desde la cámara del móvil.** El manifiesto declara el esquema
  `kadena:`, así que al enfocar un código de cobro Android ofrece abrir Koberlet.
  `src/enlace.js` recoge el enlace (de `appUrlOpen`, del arranque, o de `#kadena:…` en la
  maqueta), comprueba que sea un cobro Kadena con cuenta válida y lo guarda; el Panel lo
  recoge al tener los saldos y abre **Enviar con las casillas puestas**.
  - **Abrir no es pagar, y no se hará en segundo plano.** Un enlace lo puede lanzar
    cualquier app o cualquier página, no solo una cámara apuntando a un papel. La huella
    dice «soy yo», no dice «acepto pagar esto»: lo segundo solo lo dice alguien que ha
    leído a quién y cuánto. Por eso el enlace llega hasta el resumen de siempre, con
    contraseña o huella detrás, y ni un paso más.
  - Con la cartera cerrada el enlace espera guardado: no la abre él.
  - El mismo `aplicarCobro()` sirve para el botón de escanear y para el enlace, para que
    un cobro que entra por la cámara del sistema no tenga menos comprobaciones.

## 0.45.2

- **La cantidad y la chain van pintadas DENTRO de la imagen del QR.** En 0.45.1 el texto
  viajaba como formato aparte del portapapeles, y ahí se perdía: los chats se quedan con
  la foto y tiran el resto, que es justo donde más se usa esto. Ahora `lienzoDeCobro()`
  compone un PNG al doble de tamaño con el QR arriba (sin suavizar, un QR borroso no se
  lee) y debajo, en grande, lo que pide y la cuenta entera partida en dos líneas. Se
  siguen copiando las versiones HTML y de texto para el correo y el bloc de notas.

## 0.45.1

- **Seguridad reorganizada.** Era un desplegable único que mezclaba las semillas y las
  claves privadas de todas las carteras en la misma lista: seis líneas casi iguales para
  elegir, en la única pantalla donde un despiste se paga con el dinero. Ahora son dos
  bloques: **Cómo está protegida** (cifrado, huella, cada cuánto se cierra sola, con
  atajos a Ajustes y Copias) y **Tus claves**, una tarjeta por cartera con su nombre, su
  dirección corta y sus botones. Del estado solo se afirma lo que consta: de la copia de
  seguridad no se dice que esté hecha, porque la app no lo sabe.
- **Botón de historial** junto al nombre de la cartera, al otro lado del ojito. Los
  movimientos estaban dentro de «Detalle de la cartera», tres pliegues adentro, y es de
  lo que más se mira. Se pintan desde una sola función (`pintarMovimientos`) para el
  detalle y para la hoja.
- **Al copiar el QR va también lo que pide, escrito**: se copian tres versiones a la vez
  —HTML (imagen + cantidad, chain y cuenta debajo), imagen sola y texto solo— y cada app
  coge la que entiende. Un QR pegado a secas no dice cuánto era, y quien lo recibe por
  chat no siempre puede escanear una imagen que ya tiene en la pantalla.
- `button.peligro`, `.botonera` y el valor de las filas ya no se salen de la tarjeta.

---

## 0.45.0

- **Los planes de compra (DCA) ya se manejan desde el móvil**: parar, reanudar, recargar
  el bote y cerrar recuperando lo que quede. Hasta ahora la sección solo miraba y había
  que ir al escritorio para tocar nada.
- La firma vive en `FirmaKda.gestionarPlanDca` y sale por `firmarGestionDca`. Dos detalles
  que importan:
  - **Parar, reanudar y cerrar van SIN `clist`.** El contrato hace `enforce-guard` del
    keyset del plan, y una firma acotada a capabilities solo vale dentro de las que
    concede: con clist, el guard no se cumple. No es un agujero — se firma ese comando
    exacto, montado en Kotlin, con su hash.
  - **Recargar sí lleva clist**, porque ahí sale dinero: `TRANSFER` del dueño a la cuenta
    de custodia por el importe exacto, y nada más. Qué token es lo dice la cadena, pero al
    plugin llega como un sí/no: los nombres de los módulos siguen viviendo en el código.
  - El **id del plan** se revisa en Kotlin con la misma vara que el contrato
    (`enforce-safe-id`) antes de meterlo en el código Pact, con prueba unitaria de lo que
    se rechaza: comillas, paréntesis, barras, espacios, ids de otro dueño o demasiado largos.
- **Probado contra la cadena de verdad** (12/09/2026), en `/local` y sin gastar nada, con un
  plan activo real: `pause-plan` y `close-plan` pasan enteros («closed, 44.000000 returned»),
  `resume-plan` se para donde debe («plan is not paused») y `topup` llega hasta el `DEBIT`
  con la capability correcta. Lo que NO está probado es una firma de verdad enviada a la
  cadena desde el móvil: eso sigue pendiente de hardware.
- `button.peligro` por fin existe en el CSS: cerrar un plan o quitar una red se veían con el
  mismo botón verde que la acción principal, y eso se pulsa por inercia.

---

## 0.44.3

- **Sin conexión ya no se enseña «0 KDA».** Cuando NINGUNA de las 20 chains contesta,
  el total sale como «—», el pie dice «No se ha podido preguntar el saldo» y debajo se
  explica qué mirar (modo avión, wifi sin internet) y, sobre todo, que el dinero sigue
  donde estaba. Antes ponía «Total incompleto: 20 consultas no respondieron» encima de
  un 0 grande: a un móvil en modo avión eso se lee como «me he quedado sin nada».
  Lo mismo en «Ver una cuenta sin entrar». Con fallos parciales: «Faltan {0} chains por
  contestar: puede que tengas más de lo que se ve aquí».
- **El nombre por defecto de la cartera se traduce** (`src/nombres.js`). Sigue en pie que
  el nombre que pone el dueño NO se toca; pero «Mi cartera» no lo puso nadie, lo escribe
  la app al crearla, y con la app en inglés era una pantalla a medio traducir. Solo esos
  tres: «Mi cartera», «Mi cartera KDA» y «Mi cartera EVM». En cuanto el dueño la renombra,
  su nombre se queda tal cual.

---

## 0.44.2

- **Copiar el QR** en la hoja de Recibir: copia la IMAGEN del código tal y como se
  ve, con la cantidad y la chain que tenga puestas, para pegarlo en un mensaje o
  una factura. Si el WebView no sabe copiar imágenes (`ClipboardItem` necesita
  contexto seguro y no está en todos), copia el enlace del cobro y lo dice: la
  misma información en texto.
- Un solo `copiarTexto()` para los dos botones de copiar, con el respaldo de
  `execCommand` que ya tenía el de la dirección.

---

## 0.44.1

- **Recibir como un datáfono.** En la hoja de Recibir hay dos casillas nuevas:
  cuánto pides y en qué chain quieres cobrarlo. El QR se rehace al escribir y
  pasa a llevar `kadena:<cuenta>?amount=…&chain=…`; debajo lo dice en palabras.
  Vacías, el QR sigue siendo la cuenta a secas, que es lo que entiende cualquier
  monedero. Solo en cuentas Kadena: en EVM el formato de cobro es otro (EIP-681).
  La chain que se ofrece por defecto es donde ya hay más KDA.
- **Al escanear se rellenan cantidad y chain** (`cobroDeQr` en `src/qr.js`). Se
  RELLENAN: no se envía nada por escanear, sigue habiendo resumen, contraseña y
  firma. Lo que viene de la cámara se revisa: cantidad > 0 y chain entera 0-19; lo
  que no cuadre se ignora.
- **Agenda de cuentas** (`src/agenda.js`). Cuentas ajenas guardadas con un mote,
  en el desplegable de Enviar como `nombre — k:xxxxxx…xxxx`. Se guardan desde la
  propia pantalla de envío y se quitan desde Ajustes. Aquí no hay ninguna llave:
  solo cuentas públicas y motes, y elegir un contacto no autoriza nada.
  Lo guardado se vuelve a revisar SIEMPRE al leerlo: es dato editable desde fuera
  de la app y un destino de pago es justo lo que un atacante querría cambiar. Lo
  que no pasa el filtro se tira (probado con entradas envenenadas).
- `[hidden] { display: none !important; }` en el CSS: sin eso, una fila en flex
  marcada como oculta se veía igual.

---

## 0.44.0

- **Una sola forma de enseñar una dirección**, en `src/direccion.js`: prefijo + 6
  caracteres + … + 4 — `k:d0439a…fc4f`, `0x9858Ef…da94`. Había **cuatro** versiones
  repartidas por las pantallas (unas cortaban por 12 y 6, otras por 10 y 6) y la misma
  cuenta se veía distinta según dónde se mirara. No es estética: uno compara
  direcciones a ojo para saber si está mandando a donde cree, y para compararlas tienen
  que estar cortadas siempre por el mismo sitio. El prefijo (`k:`, `0x`, `w:`…) se
  respeta porque dice de qué tipo es la cuenta.

  Siguen enteras las tres pantallas donde la dirección **es** el contenido y hay botón
  de copiar: el QR de recibir, el detalle de la cartera y el detalle de una wallet. Ahí
  acortarla sería peor: no se podría comprobar lo que se copia.

---

## Lo último (0.43.0)

- **En Enviar se ve de dónde sale el dinero**: el nombre de la cartera a la derecha del
  título y la cuenta acortada a la derecha de «Enviar desde la chain». Con varias
  carteras en el aparato, mandar desde la que no era estaba a un despiste de distancia.
- **Todos los campos miden lo mismo de alto.** Un `select` y un `input` con el mismo
  padding no salen igual de altos -cada uno calcula su línea a su manera- y puestos en
  la misma fila se notaba. Ahora la altura la fija el CSS, no el navegador.

---

## Lo último (0.41.0)

- **La chain de destino, al lado de la cuenta.** La fila de origen se queda como estaba
  -el desplegable con la chain y su saldo- y la cuenta de destino se acorta para dejar
  sitio a una casilla estrecha que solo lleva el número de la chain. En 0.41.0 había
  probado a poner también la cartera que envía en esa fila y ocupaba demasiado; fuera.

---

## Lo último (0.40.0)

- **Enviar KDA de una chain a otra.** Hasta ahora el envío era siempre dentro de la
  misma chain -no era automático: es que no existía- y para mover saldo entre cadenas
  había que ir al escritorio. Ahora se elige chain de origen y chain de destino.

  Pasar KDA entre chains es un `defpact` de **dos pasos**:

  1. `coin.transfer-crosschain` en la chain de origen, **firmado** por el plugin
     (`FirmaKda.envioCrossChain`), con la capability `coin.TRANSFER_XCHAIN` atada al
     destinatario, al importe y a la chain de destino exactos.
  2. La continuación en la chain de destino, que **no lleva firma**: lo que la
     autoriza es la prueba SPV del paso uno. Por eso se monta en JavaScript -no hay
     secreto que tocar y el destinatario ya quedó fijado- y el gas lo paga
     `kadena-xchain-gas`, la gasolinera pública de la red, cuyo guard exige gas-only,
     precio 1e-8 y límite 850: por eso esos números son los que son.

  Solo se admite destino `k:`: `transfer-crosschain` necesita el guard de quien recibe
  y de una cuenta con nombre cualquiera no se puede deducir. Si el segundo paso no
  entra, **el dinero no se pierde**: se queda a medio camino y lo remata cualquiera con
  el identificador del pacto. La pantalla lo dice antes de firmar y también si falla.

  **Comprobado contra la cadena** (12/09/2026) igual que el DCA: el comando exacto que
  monta el plugin pasa el análisis y llega hasta `coin.DEBIT`, y ahí se para solo
  porque la cuenta de pruebas no tiene fondos. **Ningún envío entre chains hecho de
  verdad todavía.**

---

## Lo último (0.39.0)

- **Salir de la app, que no existía.** En Android no hay botón de cerrar: se pulsa
  Inicio y la app se queda detrás, viva, **con la cartera abierta**. Ese es el agujero
  de siempre en un monedero, y hasta ahora lo teníamos. Tres piezas, en `src/salir.js`:

  - **Cerrojo por inactividad, configurable** en Ajustes: 1, 5, 15, 30 minutos o nunca.
    Por defecto 5. Mide desde el último toque, y **cuenta igual con la app delante que
    en segundo plano**: así el límite es uno solo y volver a la app no regala tiempo.
    Sin plugin -un latido cada 15 s más `visibilitychange`-, así que también se prueba
    en la maqueta. Ojo con el `0`: es una opción válida («nunca») y a la vez lo que da
    `Number(null)`; leerlo mal dejaba una instalación nueva SIN cerrojo, y por eso se
    mira si hay algo guardado antes de convertirlo.
  - **Botón de atrás** de Android: desde cualquier sección vuelve al Panel; en el Panel
    manda la app al fondo. Antes no hacía nada y la app se quedaba muerta.
  - **«Bloquear y salir»** en Ajustes: cierra la cartera y pierde la app de vista de un
    gesto. Solo sale en el APK.

  Dependencia nueva: `@capacitor/app` (oficial, `npm audit` sigue en 0). El botón de
  atrás y «salir» **no se pueden probar en el navegador**: hace falta el aparato.
- **El par del plan de DCA, en una sola fila**: lo que entregas a la izquierda, lo que
  compras a la derecha y el botón de girar en medio. Dos cajas apiladas para dos
  palabras era mucho sitio para poca cosa.

---

## Lo último (0.38.0)

- **Interruptor ES/EN en la portada y en el primer uso**, arriba a la derecha. Estaba
  solo en Ajustes, y Ajustes está DENTRO de la cartera: quien abriera la app en un
  idioma que no entiende no tenía forma de llegar hasta allí. Enseña el idioma al que
  salta, no el que hay puesto.

---

## Lo último (0.37.0)

- **Se pueden crear planes de compra (DCA) desde el móvil.** Es la primera firma que
  no es un envío de KDA. El formulario es el del escritorio -qué entregas, qué compras,
  bote, cuota, cada cuánto y deslizamiento- y antes de pedir la contraseña dice las tres
  cosas que importan: cuántas compras salen, cuánto dura el plan y cuánto se lleva el
  servicio (0,5 % de cada compra). Crear un plan **ingresa el bote entero de una vez**, y
  eso la pantalla lo dice con esas palabras.

  Reparto igual que en el envío: `FirmaKda.crearPlanDca` lleva **fijos en el código** el
  módulo (`free.ksw-dca2`), la chain (2), los dos tokens de la allowlist del contrato y la
  **cuenta de custodia** `c:QiDAEP0E7hUoDWWxntmLK5LKvAeJm1SHJMAWcBmOZM8`, que es el
  destinatario del depósito. De la pantalla solo llegan números y el sentido. Además el
  plugin exige que el dueño sea `k:<la pública de esa misma cartera>`: un plan a nombre de
  otro no se puede firmar ni por error. El identificador del plan lo pone Kotlin.

  **Comprobado contra la cadena** (12/09/2026) mandando a `/local` el comando exacto que
  monta el plugin: pasa `enforce-safe-id`, la allowlist de tokens, `enforce-par`,
  `enforce-owner-guard` y los rangos, y solo se para en `coin.DEBIT` porque la cuenta de
  pruebas no tiene fondos. Es toda la validación que se puede hacer sin gastar dinero.
  **Sin ningún plan creado de verdad todavía.**
- **Importar por clave privada.** Hay cuentas que solo existen así. Se admite en el primer
  uso -se reconoce sola por la forma: 64 caracteres hex- y con un botón propio en «Añadir
  wallet». También el formato de 128 caracteres de algunas herramientas de Kadena, pero
  solo si la segunda mitad es de verdad la pública de la primera. Esa cartera **no tiene
  semilla y nunca la tendrá**: la pantalla lo dice y le quita el botón de «ver la semilla».
  Y si la clave es la de una cartera que ya está por su semilla, no se mete dos veces.
- **Portada nueva al abrir la app**, la del escritorio: emblema, nombre, contraseña,
  «Desbloquear», y debajo las dos cosas que se pueden hacer sin abrir la cartera -mirar el
  saldo de una cuenta cualquiera y restaurar una copia-. La cabecera de la app se esconde
  ahí: dos «Koberlet» seguidos era ruido.
- **Icono propio en el lanzador**: el hexagono con la K, en el verde de la casa. Icono
  adaptativo, generado con `scratchpad/icono.py`.

---

## Lo último (0.36.0)

- **Se pueden añadir redes a mano**, en Ajustes → Red. Sirve para apuntar la app a una
  devnet propia y probar sin tocar mainnet. Lo que se deja escribir es SOLO el sitio al que
  se llama: nombre, dirección del nodo y `networkId`. **Ningún nombre de módulo Pact**: las
  redes puestas a mano nacen con `tokens: []` y `nft: null` y no hay manera de rellenarlos
  desde la pantalla, así que sigue en pie el hallazgo #4 de la auditoría de Alex -la lista
  de contratos vive en el código-. Un nodo puesto a mano ve tus direcciones y puede mentir
  en los saldos; no puede sacar claves, porque el comando se arma en Kotlin con plantilla
  fija. La pantalla lo dice con esas palabras. Se guardan en `localStorage` bajo
  `koberlet.redes` y se revisan al leerlas (URL, protocolo, sin usuario ni contraseña, sin
  `?` ni `#`, `networkId` acotado); lo que no pase la revisión se tira sin ruido.
- **Arreglada la huella en Android 9 y 10.** Un probador con un móvil con lector recibía
  «este móvil no admite identificación segura». La causa: en API 28-29 la pareja
  `BIOMETRIC_STRONG | DEVICE_CREDENTIAL` **no está soportada** y `canAuthenticate()`
  devuelve `ERROR_UNSUPPORTED`, que caía en el «else». Ahora en esas versiones se pide solo
  biometría fuerte -que además es lo único que desbloquea una clave del Keystore antes de
  Android 11- y los códigos `ERROR_UNSUPPORTED` y `STATUS_UNKNOWN` tienen su propio mensaje
  en lugar del genérico. **Sin verificar en ese aparato todavía.**
- **Las carteras del selector van separadas por red.** Kadena arriba, Ethereum debajo, cada
  bloque con su titulillo. Con la bóveda v3 cada cartera es de una sola red, y mezclarlas
  obligaba a leer la dirección para saber cuál era cuál.

---

## Decisiones que sostienen el diseño

**La semilla no entra nunca en el WebView.** Se reimplementó la derivación en Kotlin
(BIP-39 + SLIP-0010 sobre Ed25519, ruta `m'/44'/626'/<i>'` para Kadena; BIP-32 sobre
secp256k1 y EIP-55 para EVM). La alternativa —derivar en JavaScript y pasarle las claves
al plugin— habría obligado a que la semilla cruzara a la pantalla, que es justo lo que
este diseño evita.

**El WebView no manda código Pact ni hashes para firmar a ciegas.** Manda a quién, cuánto
y en qué chain; el comando lo monta `FirmaKda` en Kotlin desde una plantilla fija, con la
capability atada al destinatario y al importe exactos. Aunque algún día se cuele código en
la pantalla, no hay camino para hacer firmar otra cosa.

**La contraseña se pide en cada envío y en cada exportación**, aunque la cartera esté
abierta. Tener el móvil desbloqueado en la mano no puede bastar para mover dinero.

**«Abierta» sólo significa que se ven las cuentas y los saldos** (0.13.0). Recargar la
pantalla ya no bloquea: la bóveda del navegador deja en `sessionStorage` las cuentas
públicas —la dirección que cualquiera puede leer en el explorador de bloques— con
caducidad de 15 minutos, y muere al cerrar la pestaña o la app. Ni la contraseña, ni la
clave derivada, ni la semilla salen de la memoria, así que lo que exige contraseña la
sigue exigiendo igual. Verificado: tras recargar, «Ver la semilla» sin contraseña responde
que es incorrecta; al caducar y al bloquear, la sesión se borra y se vuelve a pedir.

**La actualización se comprueba por FIRMA, no por huella** (0.16.0). El `latest.json` con
el sha256 y el APK viven en el mismo servidor: quien pueda cambiar uno puede cambiar el
otro, así que la huella demuestra que la descarga está entera, no que venga de nosotros
(clase 1 de la checklist de auditoría). Antes de enseñar el instalador, `KoberletUpdate`
lee el certificado del APK descargado y lo compara con el de la app instalada; si no es el
mismo, o no se puede leer, borra el fichero y no sale ningún diálogo. También rechaza un
paquete de otro `packageName` o con `versionCode` más viejo. Fail-closed a propósito: un
diálogo de instalación que aparece solo se acepta por inercia.

**Nada de actualización OTA del paquete web.** Sería más cómodo que pasar por el
instalador, pero abre un camino por el que entra código nuevo a la pantalla que pide
firmas. Se actualiza con un APK firmado o no se actualiza.

**El lector de QR es jsQR, no el de Google.** ML Kit exige los servicios de Play y mete
una dependencia de Google en un monedero. La imagen se analiza en el aparato.

**La copia de seguridad de verdad son las 12 palabras en papel.** El fichero de la bóveda
es una comodidad; se exporta cifrado tal cual, con el mismo formato que el Koberlet de
escritorio.

---

## Qué está verificado, y cómo

- **9 pruebas sobre el código** (`npm test`, sin navegador ni aparato). Cada una caza una
  clase de fallo que YA se dio en este proyecto, no son reglas de estilo:
  toda frase que pasa por el traductor tiene versión inglesa · los huecos `{0}` coinciden
  en los dos idiomas · el diccionario no arrastra frases muertas · ninguna variable local
  se llama `t` en un fichero que importa `t()` · no hay colores escritos a mano fuera de
  los temas · cada color del tema claro tiene pareja en el oscuro · nada de `innerHTML`
  salvo para vaciar · cada sección de la barra tiene su pantalla · la bóveda de desarrollo
  lleva su cerrojo.
  Escribirlas sacó tres fallos reales: **los mensajes de error no pasaban por el
  traductor** (con la app en inglés saltaba «Contraseña incorrecta.»; ahora dice «Wrong
  password.», comprobado), y dos sitios más donde una variable llamada `t` tapaba al
  traductor (`qr.js`, `seguridad.js`).
- **23 tests en verde** (`gradlew test`, sin móvil ni emulador):
  - la cuenta Kadena derivada coincide con Chainweaver/eckoWallet (vector público);
  - la dirección EVM coincide con MetaMask, con las mayúsculas EIP-55;
  - una semilla con una palabra cambiada se rechaza;
  - la bóveda no abre con contraseña equivocada ni con el fichero manipulado;
  - se rechaza una bóveda con scrypt rebajado (anti-rebaja);
  - cada escritura usa un IV distinto;
  - el hash blake2b coincide con el que dio el móvil en la Fase 0;
  - el importe se escribe igual en el código Pact y en la capability (hallazgo #8 de Alex);
  - una cuenta con comillas dentro no puede colarse en el código Pact (hallazgo #5).
- **En el navegador, sobre la web publicada**: crear cartera, abrir, rechazo de contraseña
  mala, exportar la semilla, borrar; saldo real de mainnet sumando 20 chains; precio en
  euros; movimientos leídos de kdaindex; QR generado y releído.
- **Navegación por secciones (0.11.0 y 0.12.0), en el navegador**: la barra de abajo sale
  al abrir la cartera y desaparece al bloquearla y en el primer uso; se recorrieron Panel,
  Carteras, Seguridad, Ajustes y, detrás de «Más», Mercado, Copias, Red e Info; estando en
  una sección del desplegable queda marcado «Más»; el ojito de privacidad tapa las cifras
  (`font-size:0` + `::after`) y se recuerda entre arranques; la sección Red leyó el nodo en
  vivo (20 chains, altura 7.220.690, 86 ms) y Mercado el precio de CoinGecko.
- **Tema oscuro (0.14.0), en el navegador**: al elegir «Oscuro» cambian fondo, texto y la
  etiqueta `theme-color` (la que tiñe la barra de estado de Android), y la elección se
  recuerda; con «El del sistema» y el navegador en modo oscuro, la app arranca oscura. Se
  recorrieron Panel, Carteras, Seguridad y Ajustes buscando colores sin tematizar: apareció
  uno real —el botón del ojito heredaba el texto casi negro de los botones verdes y se
  quedaba invisible— y está corregido.
- **Idioma español e inglés (0.15.0), en el navegador**: se recorrieron Panel, Carteras,
  Seguridad, Ajustes, Mercado, Copias, Red e Info en inglés, comparando con el español.
  Aparecieron dos fallos y están corregidos: la etiqueta «(desactivada por defecto)» de la
  red se quedaba sin traducir, y los números seguían escritos con reglas españolas dentro
  de la app en inglés («0,0045», que en inglés se lee como separador de miles). Ahora la
  puntuación de números y fechas va con el idioma: `7,220,766` y `0.0045` en inglés.
  204 frases pasan por el traductor y ninguna se queda sin su versión inglesa.
- **En el aparato**: la Fase 0 (5/5) y la lectura de saldos de la Fase 1.
- **Compilación de producción (0.16.0)**, sobre la web publicada ya minificada: se importó
  la semilla de prueba pública («abandon…about») y la app derivó
  `k:60ec71ef…3f2be3d` y `0x9858EfFD…EcaEda94`, las mismas que dan los tests de Kotlin y
  MetaMask. Es la prueba de que minificar no ha tocado la criptografía. Los mapas de código
  ya no se publican (404) y el APK baja de 6,85 MB a 6,35 MB.
- **Copia de seguridad, ciclo entero (0.17.0)**, en el navegador sobre la web publicada:
  se exportó la copia (fichero de 700 bytes con `{v, motor, kdf, iv, ct}`, sin la semilla
  en claro dentro), se borró la cartera del aparato para imitar una reinstalación, y se
  restauró desde la pantalla de primer uso. Con la contraseña equivocada responde
  «Contraseña incorrecta»; con la buena vuelven las mismas cuentas y la MISMA semilla
  (comprobada palabra por palabra en Seguridad, no solo las direcciones).
  Aquí apareció un fallo de diseño y está corregido: **restaurar solo se podía desde la
  cartera ya abierta**, o sea justo cuando no hace falta. Quien reinstalase la app o
  estrenara móvil se encontraba la bienvenida sin ninguna puerta hacia su copia. Ahora la
  bienvenida tiene «Restaurar una copia de seguridad».
- **Auditoría del APK que se distribuye (0.18.0)**, con `aapt2 dump badging` y el listado
  del zip: declara tres permisos EN NUESTRO MANIFIESTO (INTERNET, REQUEST_INSTALL_PACKAGES
  para actualizarse, CAMERA para el QR), no es `debuggable`, y dentro no viaja ningún mapa
  de código ni fuente.
  **Corregido el 15/09/2026**: en el APK acaban siendo **cinco**. `USE_BIOMETRIC` y
  `USE_FINGERPRINT` los añade la librería de biometría al fusionar manifiestos, y son los
  que enseña Android al instalar. Lo que cuenta es el manifiesto fusionado
  (`app/build/intermediates/merged_manifest/release/…`), no el nuestro. El paquete web son 561 kB sin comprimir.
  De ahí salió un hallazgo: **la bóveda de desarrollo viaja dentro del APK** (6 kB). No se
  pide nunca —solo se carga fuera de Android—, pero «no se pide» no es «no está»: si la
  detección de plataforma fallara, la app instalada guardaría la semilla en el
  almacenamiento del WebView en vez de en la bóveda cifrada. Ahora ese fichero lleva un
  cerrojo que mira dos señales distintas (el puente de Capacitor y el esquema de la
  página) y revienta antes de hacer nada si se le ejecuta dentro del APK.
- **Sección NFT, solo lectura (0.20.0)**, en el navegador contra el nodo del fork:
  `marmalade-v2.ledger` está desplegado de verdad en la chain 0 (comprobado con
  `describe-module`), así que la sección tiene contra qué preguntar. Un identificador con
  una comilla dentro se rechaza antes de tocar el código Pact; uno válido pero inventado
  responde «Esta cuenta no tiene esa pieza en esta red» y no se apunta en la lista.
  Aquí salió un fallo real y está corregido: **un nodo que no contesta se enseñaba como
  «esta cuenta no tiene esa pieza»**, que es lo contrario de la verdad. Ahora se distingue
  el «no» del ledger —`get-balance` falla cuando no hay fila, y eso SÍ es una respuesta— de
  no haber podido preguntar; verificado cortando la red en la pantalla: dice «No se pudo
  preguntar a la cadena. Prueba otra vez.».
  Las imágenes de las piezas no se enlazan: se descargan, se comprueba el tipo y el tamaño
  (3 MB), y se pintan como `data:` URL, porque la CSP de la app no admite imágenes de
  fuera. Las direcciones privadas y `localhost` se rechazan (hallazgo M-1 de la auditoría
  del escritorio): la uri la elige quien acuña la pieza, y sin ese filtro la app haría de
  sonda contra la red de casa del dueño a peticion de un tercero.
- **Sección Puente, solo lectura (0.21.0)**, en el navegador contra las dos orillas:
  el peaje leído del `igp` del puente coincide con lo que dice la cadena por otra vía
  (57,66 KDA hacia Ethereum el 12/09), y la simulación del `dispatch` con las tres
  capabilities (TRANSFER_REMOTE + coin.TRANSFER del peaje + coin.GAS) llega al nodo y es él
  quien decide: con una cuenta sin fondos responde «Failed to buy gas», **no** «Keyset
  failure», que es la señal de que las capabilities están bien tipadas —el `{int}` del
  dominio es justo el detalle que costó un rato en el escritorio—.
  `delivered(bytes32)` del mailbox del fork en Ethereum responde por `eth_call` desde el
  propio móvil (dos nodos públicos, en orden); comprobado además que un selector inventado
  revierte, así que la respuesta viene de esa función y no de un contrato que devuelve ceros.
  El custodio que hay que poner como destinatario al enviar desde Ethereum se genera aquí y
  sale byte a byte igual que el del escritorio (el formato que confirmó Pascal).
  Lo que el nodo contesta se traduce a persona en los cuatro casos habituales, y el texto
  crudo se queda plegado debajo: «no tienes KDA en la chain 2» dice qué hacer; «No value
  found in table coin_coin-table» no.
- **Panel nuevo (0.22.0)**, en el navegador a 375×812: se mira UNA cartera, la elegida, con
  su nombre arriba, el ojito al lado, el total, tres acciones en círculo (Enviar, Recibir,
  Puente) y la lista de activos; el detalle técnico —reparto por chains, direcciones, QR e
  historial— se queda plegado al fondo. Verificado: la hoja «Mis carteras» lista las dos
  carteras de prueba con la activa marcada, cambiar de cartera repinta el Panel y se
  recuerda entre arranques (`koberlet.cartera`), el lápiz lleva a renombrar, el ojito tapa
  las cifras y persiste, y «Recibir» abre el QR de la cuenta correcta.
  Es la estructura de las capturas que pasó Antonio, no una copia: colores y tipografía son
  los nuestros, la tercera acción es el Puente en vez de «Comprar», y el número grande es el
  saldo en KDA —el de euros va debajo, cuando llega el precio—, porque el saldo se sabe
  seguro y la conversión depende de un tercero.
- **Puente, los dos sentidos (0.23.0)**. Antonio avisó de que el puente solo contempla de
  verdad **un par, USDC ↔ kb-USDC**, en ambas direcciones: las rutas de USDT, DAI y WBTC se
  han quitado de la app. Tienen contratos, pero ese camino no está recorrido, y en un puente
  donde un error no se devuelve, ofrecer un camino sin recorrer no es dar opciones.
  El lado Ethereum se lee **sin `ethers`**, construyendo las llamadas a mano: pesa menos y
  evita el proveedor que se queda reintentando para siempre (lección del escritorio). Los
  selectores se calcularon con el keccak de las herramientas de la auditoría y se validaron
  contra `delivered`, que ya se sabía bueno. Verificado contra Ethereum real:
  `balanceOf` del router de kb-USDC devuelve 49.549 USDC de colateral (coincide con lo
  auditado en agosto), `quoteGasPayment(626)` responde 0, y el `transferRemote` codificado a
  mano **revierte con «ERC20: transfer amount exceeds allowance»**: llegó a ejecutar la
  transferencia, así que el selector y los bytes dinámicos del custodio están bien; un
  encoding mal hecho habría fallado antes y con otro error.
  La pantalla dice lo que la simulación **no** prueba: el contrato de Ethereum acepta
  cualquier destinatario sin quejarse, y el custodio lo valida Kadena al entregar, cuando el
  dinero ya ha salido. Por eso el custodio lo genera la app y no se teclea.
- **Mercado con cambiador (0.23.0)**, portado de `lib/dex.js` del escritorio. Lee el AMM
  entero de la cadena en una sola consulta (82 pares, 45.580 de gas, medido), lista los 34
  tokens con más de 1.000 KDA de fondo, cotiza el cambio con la comisión del 0,3 % y dice
  **cuánto mueve el precio tu propio cambio**, que es el número que decide si el cambio
  tiene sentido; por encima del 10 % de impacto no deja seguir. Verificado en el navegador:
  100 KDA → 0,51215262 kb-USDC con 0,31 % de impacto, que cuadra con el precio de CoinGecko
  (KDA a 0,0051 $) — o sea que la matemática del AMM está bien portada. La simulación en la
  cadena manda el mismo comando que el cambio real (mismo código, mismos datos, mismas
  capabilities) sin firma: con una cuenta sin fondos el nodo lo tumba por gas, no por
  keyset. Cambiar de verdad sigue siendo del escritorio.
  El fondo de cada par se enseña plegado, con el aviso de que el precio de un pool no tiene
  por qué parecerse al del mundo real (en este mercado `cBTC` cotiza a 104 KDA).
- **DCA de solo lectura (0.24.0)**: lee los planes de `free.ksw-dca2` en la chain 2 y dice
  cuánto queda en el bote, cuántas compras faltan y cuándo toca la siguiente. Si el contrato
  está parado se avisa ANTES de la lista: un plan «activo» en un contrato parado no compra
  nada. Crear, pausar o cerrar exige firma y sigue siendo del escritorio.
- **Elegir cartera donde se mueve dinero (0.25.0)**. Hasta la 0.24.0 cada pantalla cogía la
  PRIMERA cuenta del tipo que necesitaba, así que con varias carteras la app decidía por ti
  con cuál operabas. Ahora hay un solo selector (`src/cartera-activa.js`) en Mercado, DCA y
  Puente, y la elección se guarda **por tipo de cuenta**: la de Kadena en
  `koberlet.cartera` -la misma que usa el Panel- y la de Ethereum en
  `koberlet.cartera.evm`. Son dos memorias y no una a propósito: en el Puente hacen falta
  las dos a la vez, y con carteras que solo tienen uno de los dos tipos (tres de KDA y tres
  de ETH, el caso de Antonio) una sola no podría ni representarlo.
  El Puente copia el patrón del escritorio: **cartera origen + cartera destino**, con
  «Otra dirección» para mandar fuera. Hacia Kadena el destinatario sigue sin teclearse: se
  genera el custodio de la cartera destino elegida.
  Verificado en el navegador con dos carteras («Cartera importada» y «Ahorros»): los dos
  sentidos del Puente listan las carteras del tipo que toca, el custodio se rehace al
  cambiar el destino, y el estado de Ethereum (permiso 0, peaje ninguno) se leyó de verdad.
- **Mercado sin precios en euros ni dólares (0.25.0)**, por decisión de Antonio. Al cambiar
  lo que decide es cuánto sale por cuánto entra, el fondo del par y cuánto mueve el precio
  tu propio cambio; una cifra en euros al lado distrae y encima depende de un servicio de
  fuera. El precio de referencia sigue donde importa (Panel).
- **Una cartera, una red (0.26.0)**, alineado con el escritorio, que lo cambió en julio de
  2026. Hasta la 0.25.0 cada cartera derivaba de su semilla DOS cuentas -Kadena por
  `m/44'/626'/0'` y Ethereum por `m/44'/60'/0'/0/0`- y las enseñaba juntas: con tres
  carteras veías seis cuentas, y en el Puente había que elegir dos cosas que la app
  presentaba como una. Ahora la red se elige al crear o importar, y el formato de la
  bóveda pasa a **v3** (`{ v:3, carteras:[{id, etiqueta, semilla, red, cuentas:[una]}] }`).
  La migración **parte en dos** las carteras viejas, «X KDA» y «X EVM», con la misma
  semilla; la de Kadena hereda el id -para que la activa y la preferencia guardada sigan
  valiendo- y el id de cada cuenta se rehace como `<carteraId>-<tipo>`, porque de eso
  depende exportar la clave privada. Antes de guardar la migración, `abrir` **aparta una
  copia** del fichero (`boveda-antes-de-v3.bak`, cifrada igual); si guardar falla, se sigue
  con la migración en memoria y se reintenta al abrir otra vez, pero la cartera se abre.
  Verificado: 12 pruebas de `CarterasTest` en verde -incluidas partir, partir dos veces y
  la misma semilla en dos redes- y en el navegador, dos carteras de las viejas se
  convirtieron en cuatro **con las direcciones idénticas** (`k:60ec71ef…`, `0x9858EfFD…`).
  La misma semilla puede estar en dos carteras, una por red; en la misma red no.
- **Tarjeta propia para una cartera de Ethereum (0.26.0)**: saldo de ETH y de USDC leídos
  de los nodos públicos (`saldosEvm` en `lib/puente.js`), recibir con QR y acceso al
  Puente. **No hay botón de enviar**: firmar secp256k1 en Kotlin no está hecho, y un botón
  que no manda nada es peor que no tenerlo. Si el nodo no contesta se dice «no se pudo
  preguntar», nunca cero.
- **Mercado, solo el cambiador (0.35.0)**: fuera la lista plegada del fondo de cada par y
  el aviso fijo de «falta firmar». Lo que protege sigue dentro de la cotización -cuánto
  mueve el precio tu cambio y el freno del 10 %-, y que no se firma lo dice el resultado de
  la comprobación, que es cuando importa.
- **Huella o cara en lugar de teclear la contraseña (0.34.0)**. `Huella.kt` genera una clave
  AES **dentro del Android Keystore** con `setUserAuthenticationRequired(true)`, validez 0
  segundos -hay que identificarse en CADA uso- y `setInvalidatedByBiometricEnrollment(true)`,
  que la mata si alguien añade una huella nueva al teléfono. Con esa clave se envuelve la
  contraseña de la bóveda, y el `Cipher` va DENTRO del `CryptoObject` del `BiometricPrompt`:
  no es un «¿eres tú? pues pasa» que se salta parcheando la app, es que la clave no se
  desbloquea sin identificación. Se admite `BIOMETRIC_STRONG` o el código del propio móvil.

  Enchufado en tres sitios: interruptor en **Ajustes** (apagado de fábrica; al encenderlo se
  comprueba que la contraseña abre la bóveda ANTES de guardarla), **«Abrir con huella»** al
  desbloquear -que no salta solo a propósito: un diálogo de huella automático enseña a poner
  el dedo sin mirar qué se está firmando- y **«Firmar con huella»** al enviar.

  **La huella no sustituye a la contraseña: la desenvuelve.** La contraseña sigue siendo la
  llave (scrypt) y se exige en cada firma igual que antes; lo único que cambia es que ahora
  puede llegar del chip en vez del teclado. Y lo que hay que decir con todas las letras -y la
  pantalla lo dice-: activarlo **guarda la contraseña en el aparato**. Cifrada y detrás del
  chip, pero guardada. Quien no lo quiera, no lo activa.

  **Sin probar en un aparato**: en el navegador no hay Keystore ni lector, así que la bóveda
  simulada lo rechaza con todas las letras. Hace falta el móvil.
- **Las pruebas leen ya los mensajes del plugin Kotlin (0.34.0)**. La regla de traducciones
  solo miraba JavaScript, y el plugin rechaza en español: al añadir el Kotlin aparecieron
  **28 frases** que salían en español con la app en inglés -«Falta la cartera», «Ese paquete
  es más viejo que el instalado», todas las de la huella-. Traducidas. Es el tipo de agujero
  que no se ve mirando la pantalla en español, que es como se mira siempre.
- **El sentido del Puente, a la vista (0.32.0)**: el botón del medio dice «⇄ Kadena →
  Ethereum» y al tocarlo pasa a «⇄ Ethereum → Kadena». Los dos sentidos funcionaban desde
  la 0.23.0, pero con un círculo y una flecha el sentido había que deducirlo de las dos
  orillas -y Antonio, mirando la pantalla, entendió que el puente iba en una sola
  dirección-. Que algo funcione no sirve de nada si no se ve.
- **Puente (0.31.0)**: fuera el cuadro rojo, la dirección larga del destino y el bloque
  plegado del custodio. El aviso de la auditoría **no desaparece**, se resume en la línea del
  par: «Solo USDC ↔ kb-USDC · experimental, cantidades pequeñas». Y el custodio se sigue
  generando solo al traer hacia Kadena, con su botón de copiar en el propio flujo, que es lo
  único que hacía falta de aquel bloque.
- **Mercado (0.30.0)**: sin la dirección larga bajo el selector -el desplegable ya la lleva
  acortada; solo se enseña entera cuando hay UNA cartera y no hay desplegable, y esa regla
  vale también para el Puente-, con KDA y kb-USDC puestos de fábrica, y el botón diciendo
  **Cambiar**. No dice «Firmar» porque no firma: cuando la firma nativa esté, pasará a
  «Firmar el cambio».
- **Lista de wallets en una fila (0.29.0)**: punto con la inicial de la red -verde Kadena,
  azul Ethereum (`--eth`, con su pareja en el tema oscuro)-, nombre, dirección acortada y el
  botón Ver. La dirección entera se ve dentro.
- **Carteras, reordenada (0.27.0)**: cabecera con «Añadir wallet», pestañas de red
  (Kadena / Ethereum, la elegida se recuerda en el aparato) y, dentro, la lista de wallets
  con nombre y dirección. Gestionar una es entrar en ella con «Ver»: copiar la dirección,
  cambiarle el nombre y quitarla. **Quitar borra la semilla**, y por eso ese botón ya no
  vive en la lista: no puede estar a un dedo mientras uno repasa las carteras.
- **Revelar la semilla o la clave privada, dentro de cada wallet (0.28.0)**. La pantalla
  que enseña secretos se sacó a `src/revelar.js` y es **la única**: la usan Seguridad -con
  todas las wallets- y el detalle de una wallet -con la suya, en dos botones separados-.
  Se hizo así a propósito: dos copias del mismo formulario habrían acabado con dos
  criterios distintos sobre cuándo pedir la contraseña, y ese es justo el sitio donde no
  puede haber dos criterios. Reglas intactas: contraseña en cada revelado aunque la
  cartera esté abierta, y en el móvil sin botón de copiar. Verificado en el navegador:
  salen las 12 palabras y la privada de 64 hex de la semilla de test conocida.
- **Firma del APK**: `CN=DNNS.es`, RSA 4096, esquemas v2+v3 (v1 lo desactiva Gradle al ser
  `minSdk` 26). Comprobado con `apksigner`.
- **Descarga**: el SHA-256 del APK bajado por HTTPS coincide con el local.

### Primer fallo encontrado en un móvil real (12/09/2026)

Un amigo de Antonio, con la **0.25.0** instalada en un Android de verdad, pidió la
actualización a la 0.32.0 y la app respondió **«No se ha podido leer la firma del paquete
descargado; no se instala»**. La descarga estaba bien -la huella SHA-256 se comprueba
ANTES y pasó-, así que el APK era byte a byte el nuestro: lo que falló fue LEER su firma.

Causa: `getPackageArchiveInfo(ruta, GET_SIGNING_CERTIFICATES)` devuelve `signingInfo` a
null en varios Android cuando el paquete está en disco y no instalado; solo rellena el
`signatures` de siempre. Como la comprobación es **fail-closed** a propósito, no poder leer
la firma se trata igual que una firma mala, y el aparato se quedó sin poder actualizar.

Arreglado en **0.33.0**: se piden las dos banderas (`GET_SIGNING_CERTIFICATES or
GET_SIGNATURES`) y, si la nueva no da nada, se usa la vieja. Los mensajes ahora distinguen
si lo ilegible es el paquete descargado o la app instalada, y dicen la versión de Android.

⚠️ **El arreglo viaja dentro del APK**, así que un aparato con una versión anterior
bloqueada tiene que instalar la 0.33.0 **a mano** una vez; a partir de ahí la
actualización desde dentro vuelve a funcionar.

**Confirmado el 14/09/2026, en un Android 9**: el probador actualizó desde dentro de la app
hasta la 0.46.0 sin tocar nada a mano. Lo cuenta así: la app pide el permiso para instalar,
el sistema analiza el paquete y lo da por bueno, se instala, la app se cierra y al abrirla
está la versión nueva. Ese análisis es el de **Play Protect**, no el nuestro: el nuestro
—huella SHA-256 y certificado— no enseña nada cuando pasa, solo cuando falla.

Venía de **una versión por encima de la 0.40**, así que el arreglo de la 0.33.0 ya lo
llevaba puesto. Lo que queda probado, entonces, es que **una app al día se actualiza sola**.

El caso del aparato atascado por debajo de la 0.33.0 **se cierra por decisión de Antonio**
(14/09/2026): solo se reparte la última versión, así que nadie debería llegar a esa
situación. No se prueba porque no se va a dar, no porque funcione.

### Limpieza del servidor de descargas (14/09/2026)

Al comprobar la decisión de arriba apareció que el servidor no la acompañaba: había **59
APK publicados** (364 MB), de la 0.1.0 en adelante, **todos descargables por su URL
directa**. Lo único que faltaba era el índice de la carpeta, que da 404, pero los nombres
son adivinables y el token va en cada enlace que se comparte.

Por qué importaba: todas están firmadas con el certificado bueno de DNNS, así que se
instalan sin una queja y **parecen legítimas**. Entre ellas había versiones con la huella
que cierra la app (anteriores a 0.45.12), con el fallo que impide actualizarse (anteriores
a 0.33.0) y con menos defensas en general. Un monedero no debe dejar a mano sus propias
versiones viejas: quien tenga un enlace antiguo se instala un monedero peor sin enterarse.

Hecho, por decisión de Antonio: **en el servidor quedan dos, la 0.46.0 y la 0.45.12**, más
`latest.json`. Se dejan dos y no cinco a propósito —las cinco últimas por número incluirían
la 0.45.9, 0.45.10 y 0.45.11, que son justo las de la huella rota; un repuesto roto no es un
repuesto—. Las **57 retiradas viven en `F:\APP\koberlet-android\salida\`**, que ahora guarda
las 60 compilaciones (368 MB). Antes de borrarlas del servidor se cotejaron **las 57 por
SHA-256** contra la copia de F: y coincidían todas; 13 no estaban en F: y se bajaron
primero. Verificado después por HTTPS: las dos que quedan y `latest.json` dan 200, las
retiradas dan 404, el SHA-256 del APK que se reparte sigue siendo `facc417c…` y la maqueta
web sigue en pie.

La lección, apuntada porque volverá: **un fail-closed que no distingue «mal» de «no se
pudo mirar» bloquea a gente honrada.** El criterio sigue siendo correcto para la firma
-ante la duda, no se instala- pero el camino de «no se pudo mirar» tenía que haberse
probado en hardware antes de repartir la app, no después.

## Qué NO está verificado

1. **Enviar y recibir KDA: HECHO Y PROBADO en el móvil** (12/09/2026, lo confirma Antonio).
   Lo que sigue sin salir a la cadena desde el móvil es **todo lo demás que se firma**:
   envío entre chains, NFT, Mercado, Puente y DCA. De esos, lo único que consta es la
   simulación en `/local`, que prueba que el comando está bien montado y no que una firma
   real entre.
2. **La cámara: PROBADA** (el QR de cobro abre la app y rellena el envío). Lo que no se ha
   visto es el botón de escanear de dentro de la app leyendo un código con fondos reales.
3. ~~La actualización dentro de la app~~ **FUNCIONA, vista en un aparato (14/09/2026)**: un
   probador con una versión anterior instalada recibió el aviso, pulsó el botón y quedó con
   la 0.46.0 puesta y su cartera intacta. Con eso se confirma de una vez el camino entero
   —comprobación de `latest.json`, descarga, huella SHA-256, lectura del certificado del APK
   descargado y llamada al instalador—, que es lo que falló en el aparato del 12/09 y se
   arregló a ciegas en 0.33.0. **No consta de qué versión venía**, así que no se puede
   afirmar que el arreglo de 0.33.0 sea lo que lo desbloqueó; solo que hoy el camino
   funciona. Sigue sin verse el updater **rechazar** nada (punto 6).
5. **Las copias de seguridad solo se han probado en el navegador**, con su bóveda PBKDF2.
   En el móvil el cifrado es scrypt y la exportación sale por el compartir de Android:
   ese camino sigue sin verse funcionar.
6. **La comprobación de firma del updater no se ha visto actuar**: hace falta un APK
   firmado con otra clave y un móvil para probarlo de verdad. Compila y pasa los tests,
   pero eso no es haberlo visto rechazar nada.
7. **La navegación se ha usado en el móvil, pero no repasada.** Se ha manejado la app con
   el dedo para enviar y recibir, así que los caminos principales andan. Lo que no se ha
   hecho es el repaso pantalla por pantalla que sí se hizo en el navegador a 375×812:
   que la barra no tape el último botón de cada sección y que el desplegable de «Más» se
   cierre al tocar fuera siguen sin comprobarse a propósito en el aparato.
8. **El nombre que el dueño le puso a una cartera no se traduce**, y es deliberado: es un
   dato suyo. Desde 0.44.3 sí se traducen los tres nombres que pone la propia app cuando
   nadie eligió ninguno («Mi cartera», «Mi cartera KDA», «Mi cartera EVM»); en cuanto la
   renombras, tu nombre se queda como lo escribiste.
9. **Que el tema cambie solo al cambiarlo el móvil** (opción «El del sistema») no se ha
   podido comprobar: el navegador de pruebas cambia el valor de `prefers-color-scheme` pero
   no dispara el evento `change`, ni siquiera a un oyente puesto a mano. Lo que sí está
   verificado es que al arrancar toma el del sistema. Falta verlo en el aparato.
10. **Faltan cuatro secciones del escritorio**: Mercado (la parte de comprar y vender),
   Launch, DCA y Órdenes, más **mover un NFT** (la sección NFT de 0.20.0 solo ve) y
   **enviar por el Puente** (la sección de 0.21.0 mira, simula y comprueba; no firma).
   La sección Info las enumera a propósito, para que nadie espere aquí algo que todavía no
   está. Añadir cada una es una línea en `SECCIONES` (`src/navegacion.js`) más su función de
   pintado.
   Enviar un NFT no es pintar un botón: hay que montar el comando y la capability de
   `marmalade-v2.ledger.transfer-create` en `FirmaKda` (Kotlin), atada a la pieza, al
   importe y al destinatario, como ya se hizo con `coin`. Hasta que eso esté probado, la
   sección lo dice por escrito en vez de ofrecer un botón que no mueve nada.
11. **Bóveda simulada del navegador**: cifra con PBKDF2 y guarda en `localStorage`. Sus
   copias NO las abre el móvil y al revés tampoco (allí es scrypt). Es para mirar la
   interfaz, no para custodiar nada.
12. **De las piezas NFT no se ha visto ninguna de verdad**: en el fork no hay descubridor,
   así que se apuntan por identificador, y no tengo a mano una pieza acuñada para
   comprobar la ficha y la imagen de punta a punta. Está en la guía de pruebas (paso 12).
13. **El Panel se ha visto con saldos reales en el móvil** (12/09, al enviar y recibir). Lo
   que sigue sin comprobarse es el detalle de la lista de activos con **varios** tokens a la
   vez —KDA + PCO/SPT + kb-*—, el valor en euros de cada línea y el `%` de 24 h: las
   carteras del navegador están a cero y la del móvil no tiene esa variedad.
14. **La simulación del Puente no se ha visto salir bien**: con una cuenta sin KDA en la
   chain 2, el nodo la rechaza siempre —y eso es lo que se ha comprobado—. Para ver el
   camino bueno hace falta una cuenta con KDA y con kb-\* en la chain 2.
15. **`delivered` no se ha visto decir «sí»**: la llamada funciona y responde, pero el único
   mensaje Kadena→Ethereum con identificador completo a mano es de otra dirección del
   puente. Hace falta un envío real por el puente para verlo en verde.

16. ~~La huella~~ **CONFIRMADA CON TRAZA en Android 9 (14/09/2026)**, que es exactamente la
   versión diana de los dos arreglos hechos a ciegas. Ya no es la palabra de nadie: es el
   registro del sistema, guardado en `pruebas/huella-android9-20260914.log`.

   Aparato: **Redmi Note 6 Pro** (`tulip`), **Android 9 / API 28**, MIUI 12, con lector de
   huella y sin desbloqueo facial reconocido por el sistema. Lo que dice el registro:

   - `keystore: del USRPKEY_koberlet.biometria.v1` — la app crea y reemplaza su clave dentro
     del Android Keystore. Ese alias es nuestro y no lo toca nadie más.
   - `startAuthentication(es.dnns.koberlet)` → `onAuthenticated(owner=es.dnns.koberlet)`,
     **dos veces** (17:49:28 al encender el interruptor y 17:51:25 al usarla), con un intento
     rechazado por medio que tampoco tumbó nada.
   - **Cero excepciones** de la app en toda la captura.

   Qué queda probado con esto: que en API 28 el diálogo **se construye y se abre** (el
   arreglo de 0.45.12, el botón de cancelar que `BiometricPrompt` exige cuando no se admite
   el código del móvil) y que **`canAuthenticate()` deja pasar** (el arreglo de 0.36.0, la
   pareja `BIOMETRIC_STRONG|DEVICE_CREDENTIAL` que API 28-29 no soporta). Los dos arreglos
   iban a ciegas y los dos eran correctos.

   Qué NO prueba todavía: que la contraseña se desenvuelva bien y abra la bóveda. El registro
   ve la autenticación, no lo que la app hace después. Falta verlo enviando.

---

## Cartera de pruebas

`k:d0439ab37b47745f2a7a172ce73cd03097ae2dc661f3505ceb73f3c835d1fc4f` — creada en el
navegador (bóveda simulada), con 0,6 KDA en la chain 2.

⚠️ **Esa semilla ya no está**: el 12/09/2026, probando las secciones NFT y Puente, limpié el
`localStorage` de la maqueta (en local y en la publicada) para empezar de cero, y ahí es
donde vivía. Los 0,6 KDA de esa cuenta quedan inalcanzables. Son ~0,3 céntimos y la cartera
era desechable a propósito, pero queda apuntado por lo que es: la bóveda del navegador no
tiene copia en ninguna parte, y eso vale igual para cualquiera que la use.

Para las pruebas del navegador se usa ahora la semilla de test pública
(«abandon…about» → `k:60ec71ef…3f2be3d`) con la contraseña `maqueta-de-pruebas-2026`, que
son públicas a propósito: no hay nada que proteger en una cartera sin fondos.

## Cómo se compila y publica

```
cd F:/APP/koberlet-android
npx vite build && npx cap sync android
cd android && JAVA_HOME=/f/APP/_tools/jdk21 ANDROID_HOME=/f/APP/_tools/Android/Sdk \
  GRADLE_USER_HOME=/f/APP/_tools/gradle-home ./gradlew assembleRelease
```

La versión sale del `package.json` (`versionCode` = mayor*10000 + menor*100 + parche).
La clave de firma está en `.keys/koberlet-release.jks` y su contraseña en
`android/firma.properties`; ninguno de los dos se versiona. **Si se pierde esa clave,
ningún APK futuro se podrá instalar encima de los repartidos.**
