# Koberlet — ficha de la App Store

Estado a **19/09/2026**: la versión 1.0 está en *Preparar para enviar* y **la ficha está
prácticamente vacía**. Lo único que hay puesto es el nombre.

Esto no es un olvido que se arregle en cinco minutos el día que se quiera enviar: son doce
casillas, y varias dependen de cosas de fuera (páginas web publicadas, capturas sin saldos
reales). Se deja escrito aquí para que el día que toque no haya que averiguarlo otra vez.

El protocolo común de publicación —el orden, las trampas de Apple, qué se pierde si se pierde
cada llave— está en `_control/PROTOCOLO.md`.

---

## Lo que SÍ está puesto

### Nombre

```
Koberlet
```

### Descripción de TestFlight (262 caracteres)

Es lo que leen los testers al abrir TestFlight, no la ficha de la App Store.

```
Koberlet es un monedero de Kadena y Ethereum sin servidor: las claves se crean y se guardan cifradas en el propio iPhone. Prueba a crear o importar una cartera, ver saldos, enviar KDA y desbloquear con Face ID. No hace falta cuenta: la app funciona sin registro.
```

Correo para comentarios de los testers: `admin@dnns.es`

### Notas de la revisión beta (1236 caracteres)

Están en inglés a propósito: la revisión beta la hace el mismo equipo que la de la App Store.
Es el texto que evita el malentendido de la regla 4.2 —que el revisor abra un monedero vacío,
no pueda mover nada y concluya que la app no funciona—.

```
Koberlet is a self-custody crypto wallet (Kadena and Ethereum). There is no account and no
sign-up, so no demo account is needed: on first launch you create a local wallet with a
password you choose, and the app shows the 12 recovery words. The private keys are generated
and stored on the device and never leave it.

What can be checked without spending any money:
- Create a wallet (any password, 8 characters or more) and write down the 12 words.
- "Receive" ("Recibir") shows the QR and the address of the wallet you just created.
- "Market", "DCA" and "Bridge" show live quotes read from the Kadena and Ethereum networks.
  Nothing is signed until you press the sign button and type the password.
- The balances are zero because the wallet is new. Sending, swapping or creating a recurring
  plan needs funds. If you would like a funded test address, write to admin@dnns.es and we
  will send a small amount.

Fees and terms: the app charges a 0.5% service fee on Market swaps, recurring buys and limit
orders. The exact amount is shown on screen before signing. Terms of use, including the fee:
https://koberlet.dnns.es/politicas.html

The app does not include any account creation, advertising, tracking or third-party analytics.
```

Los datos de contacto del revisor (nombre, teléfono, correo) están rellenos en App Store
Connect y **no se copian aquí**: este repositorio es público.

---

## Lo que FALTA

| Casilla | Estado |
|---|---|
| Subtítulo (máx. 30) | vacío |
| Palabras clave (máx. 100) | vacías |
| Descripción | **vacía** |
| Texto promocional | vacío |
| Copyright | vacío |
| Categoría principal y secundaria | sin poner |
| URL de soporte | sin poner |
| URL de política de privacidad | sin poner |
| Capturas de pantalla | ninguna |
| Notas para el revisor (las de la App Store, no las beta) | vacías |
| Declaración de privacidad de la app | sin contestar |
| Precio y disponibilidad | sin configurar |

---

## Antes de rellenarlo, tres cosas

1. **Las capturas.** No puede salir una dirección real con saldo, ni ninguna parte de una
   frase de recuperación. Las actuales de la web se hicieron con el monedero vacío y se ven
   pobres; hay que rehacerlas con saldo de prueba.

2. **Las páginas de soporte y privacidad.** Apple las **abre durante la revisión**. Si ese día
   no responden, el rechazo no es por el contenido: es por un enlace caído, y se pierde otra
   vuelta entera. Las políticas ya responden en dos sitios:
   `https://koberlet.dnns.es/politicas.html` y
   `https://descargas.dnns.es/koberlet/politicas.html`. Falta decidir cuál va en la ficha y si
   hace falta una página de soporte aparte, como la de EcuaDNNS.

3. **La política declara una conexión que la app de iOS no hace.** El texto dice «comprobación
   de actualizaciones a descargas.dnns.es», y eso solo pasa en el canal directo:
   `src/actualizar.js` está limitado a la compilación `directa`. Pero `src/politicas-texto.js`
   **no filtra por canal**, así que ese mismo renglón se le enseña también al usuario de Google
   Play y al de iOS, donde la app no se actualiza sola ni puede.

   Declarar de más no es un descuido inocente en una ficha de Apple: la declaración de
   privacidad tiene que cuadrar con lo que hace el binario. Hay que condicionar ese renglón al
   canal antes de enviar la app a revisión.

---

## Los textos de Google Play

Están en [`ficha-googleplay.md`](ficha-googleplay.md). Sirven de punto de partida, pero **no
se copian tal cual**: Apple tiene límites distintos (subtítulo de 30, palabras clave de 100) y
sus propias reglas sobre criptomonedas.
