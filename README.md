# Koberlet · móvil

[![Licencia: Apache 2.0](https://img.shields.io/badge/licencia-Apache%202.0-blue.svg)](LICENSE)

Monedero **no custodial** multi-cadena (Kadena + EVM) para **Android y iPhone**. Las claves
privadas se generan y se guardan en el teléfono; no hay servidor de Koberlet que las vea, ni
cuenta que abrir, ni nada que registrar.

Es la misma app que [Koberlet de escritorio](https://github.com/dnns-es/koberlet), con el
mismo formato de bóveda: una copia de seguridad hecha en el ordenador se restaura en el móvil
y al revés.

## Por qué este repositorio está abierto

Un monedero le pide a alguien que meta dentro la frase que da acceso a su dinero. Pedir eso y
no dejar mirar el código es pedir un acto de fe. Aquí está todo lo que se ejecuta en el
teléfono: cómo se deriva la semilla, cómo se cifra la bóveda, qué se firma y qué se envía por
la red. Cualquiera puede comprobar que la frase no sale de ahí.

Lo que se publica es **el código**, no la infraestructura. En DNNS.es lo normal es lo
contrario —los repositorios son privados—, y los dos monederos son la excepción, a propósito.

## Lo que NO está aquí, y no va a estar

- La clave que firma los APK (`koberlet-release.jks`) ni su contraseña.
- Los certificados de Apple ni la clave de App Store Connect.
- La cuenta de servicio de Google Play.
- La clave que firma las actualizaciones del escritorio.
- Datos de ninguna cartera: ni bóvedas, ni direcciones, ni saldos.

Todo eso vive fuera del repositorio (ver [`.gitignore`](.gitignore)) y existe en un solo
sitio. Poder leer este código no permite firmar nada en nombre de DNNS.es.

**Las únicas compilaciones oficiales son las publicadas por DNNS.es**: Google Play, TestFlight
/ App Store y `descargas.dnns.es`. Si te llega un APK de Koberlet por cualquier otra vía, no
es nuestro, aunque se llame igual y se vea igual.

## Qué hace

- **Varias carteras**, cada una en su red: Kadena (oficial y fork comunitario) o EVM
  (Ethereum, Arbitrum, Base, BNB Chain, Polygon).
- **Crear o importar**: semilla BIP-39 compatible con eckoWallet, Chainweaver y MetaMask, o
  clave privada suelta.
- **Enviar y recibir** con firma ed25519 (Kadena) y secp256k1 (EVM). Todo envío pide
  contraseña o huella.
- **Códigos QR**: leer una dirección con la cámara —66 caracteres tecleados a mano es la forma
  más habitual de mandar dinero a ninguna parte— y generar el propio, con importe y chain si
  se quiere. Se lee con jsQR sobre la cámara del navegador, no con el lector de Google: la
  imagen no sale del teléfono y funciona en cualquier Android, con o sin servicios de Play.
- **Mercado**: cambio KDA ⇄ kb-USDC no custodial contra el pool `kaddex.exchange` del fork.
  A partir de 5 kb-USDC el gas lo paga la gasolinera de KoberluSW y a ti no te cuesta nada.
- **Órdenes límite** y **planes DCA** sobre los contratos `free.ksw2` y `free.ksw-dca2`. Las
  dispara el vigilante de KoberluSW pagando su propio gas; la app solo crea y cancela.
- **Puente Kinesis** (experimental): Kadena ⇄ EVM, con simulación antes de firmar.
- **NFT**, agenda de direcciones, historial on-chain, copias de seguridad, tema claro/oscuro
  e idioma ES/EN.

## Seguridad (lo que interesa revisar)

- **Las privadas no viven en JavaScript.** Dentro del APK la bóveda es nativa
  (`android/…/Cofre.kt`, y su equivalente en Swift); el JavaScript pide firmas y recibe
  firmas, nunca la clave. El doble de desarrollo que sí guarda en el navegador
  (`src/boveda/simulada.js`) se carga con un `import()` dentro del `if`, para que el
  empaquetador lo deje en un trozo aparte **que el APK no llega a pedir nunca**.
- **Bóveda cifrada** con AES-256-GCM y clave derivada por scrypt (N=2¹⁵, los mismos
  parámetros que el escritorio). El IV es nuevo en cada escritura. Los parámetros van dentro
  del fichero pero se comprueban al abrirlo: si no, bastaría con editar una bóveda robada y
  poner N=2 para poder probar contraseñas a toda velocidad.
- **Huella y Face ID** son una comodidad para desbloquear, no otra capa de cifrado: apoyados
  en Android Keystore y en el llavero de iOS (`Huella.kt`, `Huella.swift`).
- Revelar una clave privada o firmar cualquier envío exige volver a identificarse.
- **Sin backend propio.** La app habla directamente con los nodos Chainweb, con RPC EVM
  públicos, con CoinGecko y con el indexador `kdaindex.dnns.es`. Eso tiene una consecuencia de
  privacidad que conviene saber: esos servidores ven qué direcciones consultas.

### Fallos de seguridad

**No abras un issue público.** Pestaña **Security** → *Report a vulnerability*. Llega solo al
mantenedor. Un fallo aquí no es un error de programa: es dinero de alguien.

## Estructura

```
src/             la app (JavaScript plano, sin frameworks)
  boveda/        contrato de bóveda, versión nativa y doble de desarrollo
  lib/           kda, dex, dca, puente, nft, mercado, ethswap
android/         proyecto Android; lo nativo en Kotlin (bóveda, firma, derivación, huella)
ios/             proyecto iOS; lo mismo en Swift
test/            pruebas que se ejecutan con `npm test`
herramientas/    utilidades de desarrollo
play/            ficha y procedimiento de publicación en Google Play
```

Capacitor + Vite. `PARIDAD.md` lleva la cuenta de lo que hay en cada sistema y de lo que falta
por nivelar; `ESTADO.md` es el cuaderno de qué se cambió y por qué.

## Compilar

```
npm install
npm test          # las comprobaciones, antes que nada
npm run build     # empaqueta el web
npx cap sync
```

Después, `android/` se abre con Android Studio y `ios/` con Xcode. Sin la clave de firma —que
no está aquí— saldrá un APK de depuración, que es lo correcto para un fork: **fírmalo con la
tuya y ponle otro nombre.**

## Licencia y nombre

El **código** es libre, bajo [Apache 2.0](LICENSE). El **nombre** no: «Koberlet» y «DNNS» son
marcas de DNNS.es y no se licencian con el software. Puedes hacer un fork y distribuirlo, con
otro nombre. El porqué y los límites, en [TRADEMARK.md](TRADEMARK.md).

## Aviso

Esto custodia claves privadas y firma transacciones con dinero real. Se publica **tal cual**,
sin garantía de ningún tipo, como dice la licencia. Prueba con cantidades pequeñas, guarda tu
frase de recuperación fuera del teléfono y no confíes en ningún monedero —este incluido— más
de lo que estés dispuesto a perder.
