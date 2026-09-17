# Formulario de Seguridad de los Datos — Koberlet

Lo que hay que responder en **Política → Contenido de la aplicación → Seguridad
de los datos** de la Consola de Play. Va campo por campo, en el orden en que
Google los pregunta.

La respuesta corta es que Koberlet **no recoge ni comparte ningún dato**. Pero
esa casilla hay que saber defenderla, porque el formulario obliga a declarar
también lo que la app manda a terceros aunque no sea tuyo. Abajo está el
razonamiento de cada respuesta, que es lo que hace falta si alguien pregunta.

Verificado sobre el código en la versión **0.52.2**.

---

## 1. Recogida y envío de datos

> **¿Tu app recoge o comparte alguno de los tipos de datos de usuario
> obligatorios?**

### **NO**

Justificación, para tenerla por escrito:

- **No hay cuentas de usuario, ni registro, ni correo, ni contraseña de
  servidor.** Nada que asociar a una persona.
- **No hay telemetría, ni analítica, ni SDK de publicidad.** Comprobado: no hay
  Firebase, ni Analytics, ni Sentry, ni ninguna traza equivalente en el código.
- **No hay servidor propio que reciba datos.** El único servicio de DNNS.es que
  se consulta es un índice de lectura de la cadena (`kdaindex.dnns.es`), y solo
  para leer saldos públicos.
- **Las claves privadas y la frase de recuperación no salen del aparato.** Viven
  cifradas en la bóveda nativa y se usan ahí dentro. No se envían a ningún sitio,
  ni siquiera para firmar.

### Lo que sí sale del móvil, y por qué no cuenta como recogida

Google distingue entre *recoger* (que llegue a un servidor tuyo o de un tercero
con el que trabajas) y que la app haga peticiones normales de red. Koberlet
consulta estos servicios públicos, y en todos manda **direcciones públicas de
blockchain**, nunca claves:

| Servicio | Para qué | Qué se le manda |
|---|---|---|
| `api.chainweb-community.org` | Nodo de Kadena: saldos y envío de transacciones | Dirección pública, transacción firmada |
| `kdaindex.dnns.es` | Índice de historial de Kadena | Dirección pública |
| `explorer.chainweb-community.org` | Enlaces al explorador | Nada (se abre fuera) |
| `ethereum-rpc.publicnode.com`, `eth.drpc.org` | Nodos EVM: saldos y envío | Dirección pública, transacción firmada |
| `api.coingecko.com` | Precio de KDA y ETH | Nada del usuario |
| `ipfs.io` | Imágenes de NFT | Identificador del contenido |

Una dirección pública de blockchain no es un dato personal en el sentido del
formulario: es pública por definición y está en la cadena para que cualquiera la
lea. Pero **conviene decirlo en la ficha igualmente** —ya está dicho en las
políticas de la app— porque quien consulta un saldo revela a ese nodo qué
dirección le interesa, y eso es información aunque no sea un dato recogido.

> La variante que se sube a Play **no** consulta `descargas.dnns.es`: el módulo
> de actualización propia no viaja en ella. Ver `../play/README.md`.

---

## 2. Prácticas de seguridad

Este bloque se rellena aunque la respuesta anterior sea "no recoge datos".

| Pregunta | Respuesta | Por qué |
|---|---|---|
| ¿Se cifran los datos en tránsito? | **Sí** | Todo va por HTTPS. `allowMixedContent` está en `false` y la CSP del WebView no admite `http:`. |
| ¿Puede el usuario pedir que se borren sus datos? | **Sí** | Desinstalar borra la bóveda. Además, dentro de la app se puede borrar el monedero. No hay copia en ningún servidor que pedir borrar. |
| ¿Se ha sometido la app a una revisión de seguridad independiente? | **No** | La auditoría externa está pendiente (Fase 7 del proyecto). No marcar que sí hasta que exista y se pueda enseñar. |
| ¿Cumple la Política de Familias? | **No aplica** | La app no está dirigida a menores. |

---

## 3. Declaración de aplicación financiera

Aparte del formulario de datos, en **Contenido de la aplicación → Aplicaciones
financieras** hay que declarar qué tipo de app financiera es.

| Campo | Respuesta |
|---|---|
| ¿Ofrece productos o servicios financieros? | Sí — monedero de criptomonedas |
| Tipo | **Monedero de software de criptomonedas (no custodial)** |
| ¿Custodias fondos de los usuarios? | **NO** |
| ¿Eres un exchange de criptomonedas? | **NO** — ver el razonamiento de abajo |
| ¿Minas criptomonedas en el dispositivo? | **NO** |

### Lo que se marcó de verdad en la Consola (17/09/2026)

En **Contenido de la aplicación → Funciones financieras**, dentro de *Trading y
fondos*, se marcó **solo «Cartera de criptomonedas»**. No se marcó «Mercado de
criptomonedas», que es el *crypto exchange* al que Google exige registro MiCA/CASP.

Y se marcó **«Otro»**, que abre un campo de texto libre, para **contar el swap por
delante en vez de esperar a que lo encuentre el revisor**. Ese es el punto: declarar
solo «monedero» y que luego vean el intercambio parece ocultación, y la ocultación
es lo que pone en riesgo **la cuenta**, no solo la app. Contándolo, el peor caso es
que rechacen la app, que es el escenario que ya estaba aceptado.

El texto, en inglés porque el equipo de revisión trabaja en inglés:

```
The wallet also lets the user sign three kinds of on-chain operations, all of them non-custodial:

1. Token swaps executed by public AMM smart contracts (Kadena DEX, Uniswap on Ethereum).
2. A bridge to move assets between Kadena and Ethereum.
3. Scheduled recurring buys (DCA) run by a public smart contract.

Koberlet is not an exchange. It never takes custody of funds, holds no order book and is never a counterparty. Private keys stay encrypted on the device and never leave it. The app builds the transaction, signs it locally and sends it to a public node; the swap itself is executed by a smart contract that anyone can inspect on-chain. No Koberlet server takes part in any of this.
```

### Cómo se sostiene ese "NO", si preguntan

Decidido el 17/09/2026: **se envía la app completa y se declara lo que es.** El
detalle de por qué, y por qué no se recortó, está en `PUBLICAR.md` punto 10.

La app incluye **intercambio (swap) vía DEX, puente entre redes y compras
programadas (DCA)**, y eso hay que decirlo sin rodeos si sale el tema. Google
clasifica como *exchange de criptomonedas* las apps que permiten intercambiar
criptomonedas, y a esas les exige acreditar registro ante la autoridad
competente. En España, el registro de proveedores de servicios de criptoactivos
(MiCA/CASP, Banco de España), que una cuenta personal sin sociedad no puede
aportar.

El argumento de por qué Koberlet no es eso, en tres puntos que son verificables
en el código, no opiniones:

1. **No custodia fondos.** Las claves privadas viven cifradas en la bóveda del
   propio aparato y no salen de ahí, ni siquiera para firmar. No hay servidor
   que pueda mover el dinero de nadie.
2. **No casa órdenes.** No hay libro de órdenes, ni contrapartida, ni liquidez
   propia. La app no es parte de la operación.
3. **El intercambio lo ejecuta un contrato público de la cadena.** Koberlet monta
   la transacción, la firma con la clave del usuario y la manda al nodo. Lo mismo
   que hace al enviar KDA, solo que el destinatario es un contrato.

Es zona gris y **la decide el revisor**. Si dice que no, el plan es el APK de
`descargas.dnns.es`, no forzar la máquina.

**El bundle de `play/bundle/` es el completo, con swaps**, que es lo que se
manda.

---

## 4. Contenido y clasificación

| Campo | Respuesta |
|---|---|
| Cuestionario de clasificación | Categoría "Finanzas". Sin violencia, sin contenido sexual, sin apuestas. Debería salir PEGI 3 / apto para todos. |
| ¿Contiene anuncios? | **NO** |
| ¿Tiene compras en la aplicación? | **NO** |
| Público objetivo | **Mayores de 18 años** — es lo que corresponde a una app financiera, y evita que caiga bajo la Política de Familias |
| Acceso a la app | Sin restricciones: no hace falta cuenta ni credenciales para que el revisor la pruebe |

### Instrucciones para el revisor ("Datos de inicio de sesión")

La declaración que antes se llamaba «Acceso a la aplicación». Dos cosas que se
aprendieron rellenándola el 17/09/2026:

**Se marca «Sí», aunque no haya login.** Parece lo contrario de la verdad —nada
está restringido: el monedero lo crea el revisor y la contraseña la elige él— pero
el campo para escribirle instrucciones **solo aparece marcando «Sí»**. Y un revisor
que abre un monedero de criptomonedas, se topa con «apunta estas 12 palabras» y una
contraseña que no sabe para qué sirve, y no tiene ni una línea de explicación, es un
rechazo esperando a pasar. Además, la lista del «Sí» que enseña Google incluye
literalmente **autenticación biométrica** y **códigos QR**, y la app tiene las dos.

**El texto va en inglés y cabe en 500 caracteres.** Las dos cosas las pide la
propia pantalla, y el límite no se ve hasta que pegas y te lo pinta en rojo: la
primera versión ocupaba 992. Los campos de usuario y contraseña se dejan
**vacíos**: no hay ninguna cuenta que dar.

Nombre del conjunto: `No login required - local wallet`

Esto son 472 caracteres, con 28 de margen (conviene dejarlo, porque no está claro
cómo cuenta Google los saltos de línea):

```
No credentials needed. Accept the terms, choose "create a new wallet", note the 12-word phrase and set any password: it only encrypts the vault on the device and is never sent anywhere.

All screens work with a zero balance: Panel, Send, Receive, Market, Bridge, Recurring buys, Settings, Info.

Biometric unlock is optional and the password always works, so no part of the app is ever locked. There is no Koberlet server: it only queries public Kadena and Ethereum nodes.
```

Lo que tiene que sobrevivir a cualquier recorte futuro, que es lo que el revisor
necesita para no atascarse: que **no hace falta cuenta**, qué tiene que pulsar,
que **la contraseña se la inventa él**, que puede recorrerlo **todo sin fondos**, y
que **la huella nunca le bloquea el paso**.

El mismo texto en español, que es como se escribió y sirve para releerlo:

```
La app no requiere cuenta ni credenciales.

Al abrirla por primera vez hay que aceptar las políticas de uso y crear un
monedero. Se puede crear uno nuevo (la app enseña una frase de recuperación de
12 palabras) o recuperar uno existente. Hay que poner una contraseña: es la que
cifra la bóveda en el propio dispositivo, no es una cuenta de ningún servicio y
no se envía a ningún servidor.

Después de crearlo, la app muestra los saldos (cero en un monedero nuevo) y se
pueden recorrer todas las pantallas sin necesidad de tener fondos.

No hay ningún servidor de Koberlet que guarde datos de usuario: la app solo
consulta nodos públicos de las redes Kadena y Ethereum.
```
