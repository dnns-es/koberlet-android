# Pruebas en el móvil — Koberlet Android 0.22.0

Lo que sigue son las catorce cosas que **no se pueden comprobar sin un aparato**. Todo lo
demás ya está verificado en el PC y en el navegador (ver `ESTADO.md`).

Se tarda unos veinte minutos. No hace falta saber nada técnico: cada paso dice qué hacer y
qué tiene que salir. Si algo sale distinto, eso es el hallazgo — apúntalo tal cual,
aunque parezca una tontería.

**Antes de empezar:** usa una cartera nueva y sin dinero para los pasos 1 a 8. Solo el
paso 9 mueve KDA de verdad, y con 0,1 basta.

Descarga: `https://descargas.dnns.es/kob7t2m9x4/koberlet-android/koberlet-0.44.0.apk`

---

## 1. Instalar

Abre el enlace en el móvil y acepta instalar de origen desconocido si lo pide.

- [ ] La app se instala y abre.
- [ ] Arriba NO aparece ninguna banda roja. Desde la 0.45.6 esa banda solo sale en un
      caso: que la **app instalada** esté usando la bóveda de desarrollo. Si aparece, para
      aquí y avísame — es lo que el cerrojo de la versión 0.18.0 tiene que impedir. (En el
      navegador ya no se pinta: allí la bóveda simulada es lo normal.)
- [ ] En **Info → Datos técnicos** pone `bóveda: nativa` y `red: CapacitorHttp`.

## 2. Crear la cartera

- [ ] Pide contraseña dos veces y no deja seguir con una floja.
- [ ] Enseña las 12 palabras y pide confirmar dos al azar.
- [ ] **La semilla NO se puede copiar**: en el móvil no hay botón de copiar, a propósito.
- [ ] Al terminar aparecen dos cuentas: una Kadena (`k:…`) y una EVM (`0x…`).

## 3. Cerrar y volver a abrir

Cierra la app del todo (quitarla de las recientes) y ábrela otra vez.

- [ ] Pide la contraseña.
- [ ] Con la contraseña buena entra y salen las mismas cuentas.
- [ ] Con una mala dice «Contraseña incorrecta.» y no entra.

Esto es lo que prueba que la bóveda nativa cifra y descifra de verdad en el aparato.

## 4. Leer saldos

- [ ] En el Panel aparece el saldo (0 KDA en una cartera nueva, es lo normal).
- [ ] En **Red** el nodo responde y da una altura parecida a 7.2xx.xxx.

## 5. La cámara

Ve a una cuenta con saldo → **Enviar KDA** → **Escanear un código QR**.

- [ ] Pide permiso de cámara la primera vez.
- [ ] Se ve la imagen de la cámara a pantalla completa.
- [ ] Al apuntar a un QR de una cuenta Kadena, lo lee y rellena el destino solo.
- [ ] Al cancelar, **el piloto de la cámara se apaga**.

## 6. La barra de abajo, con el dedo

- [ ] Se llega a todos los botones con el pulgar, sin estirar la mano.
- [ ] La barra no tapa el último botón de ninguna pantalla (mira sobre todo Ajustes e Info,
      que son las largas).
- [ ] **Más** abre la hoja de abajo, y se cierra tocando fuera.

## 7. Tema e idioma

- [ ] **Ajustes → Tema → Oscuro**: cambia toda la app, incluida la barra de estado de
      arriba del móvil (la de la hora y la batería).
- [ ] Con **El del sistema** puesto, cambia el modo noche del móvil desde los ajustes de
      Android: la app tiene que cambiar sola, sin cerrarla.
- [ ] **Ajustes → Idioma → English**: todo en inglés, también los errores (prueba a meter
      una contraseña mala: debe decir «Wrong password.»).

## 8. La copia de seguridad

- [ ] **Ajustes → Copia de seguridad → Guardar copia**: pide la contraseña y sale el
      compartir de Android. Guárdala en Drive o mándatela por correo.
- [ ] Desinstala la app, vuelve a instalarla, y en la pantalla de bienvenida usa
      **Restaurar una copia de seguridad** con ese fichero y su contraseña.
- [ ] Vuelven las mismas cuentas.
- [ ] En **Seguridad**, con la contraseña, la semilla es la misma que apuntaste.

Este es el paso que más importa de los ocho: es el que demuestra que un móvil perdido no
es dinero perdido.

## 9. Un envío de verdad ⚠️

Esto mueve dinero real y no se puede deshacer. Con **0,1 KDA sobra**.

- [ ] Manda 0,1 KDA a una cuenta tuya (por ejemplo, la del Koberlet de escritorio).
- [ ] Antes de firmar, la pantalla de confirmación dice **a quién, cuánto y desde qué
      chain**, y **pide la contraseña** aunque la cartera esté abierta.
- [ ] Sale la referencia de la transacción y, al cabo de un minuto, «✓ Enviado y
      confirmado en la cadena».
- [ ] El dinero llega a la otra cuenta.

Es lo más importante que falta por verificar: hasta que esto salga bien, la firma del
plugin solo está probada contra vectores de laboratorio, no contra el nodo de verdad.

## 10. La actualización dentro de la app

Cuando publique la siguiente versión, sin desinstalar nada:

- [ ] Al abrir la app, sale arriba el aviso de versión nueva.
- [ ] **Descargar e instalar** baja el paquete y sale el instalador de Android.
- [ ] Al terminar, en **Info** pone la versión nueva y **la cartera sigue ahí**, con su
      contraseña de siempre.

## 11. El ojito de privacidad

- [ ] **Ajustes → Ocultar los saldos**: las cantidades se tapan con puntos.
- [ ] Sigue tapado después de cerrar y abrir la app.

## 12. La sección NFT

Está en **Más → NFT**, y de momento es solo para ver: mover una pieza necesita firma, y eso
aún no está.

- [ ] Con una cuenta sin piezas apuntadas, dice que todavía no hay ninguna. No se queda
      cargando para siempre.
- [ ] **Apuntar una pieza por su identificador** con algo inventado (`t:loquesea123`):
      responde «Esta cuenta no tiene esa pieza en esta red» y **no la apunta**.
- [ ] Con el móvil en modo avión, el mismo botón dice «No se pudo preguntar a la cadena»,
      **no** «no tienes esa pieza». Esa diferencia importa: lo primero es un problema de
      cobertura, lo segundo sería una mentira.
- [ ] Si tienes una pieza de Marmalade de verdad, al apuntar su identificador sale con su
      nombre y, si su ficha lleva imagen, con la imagen.

## 13. El Panel nuevo

- [ ] Arriba sale el nombre de la cartera con el ojito al lado; el ojito tapa las cifras
      y sigue tapando después de cerrar y abrir la app.
- [ ] Tocando el nombre se abre **Mis carteras**, con la activa marcada. Si tienes más de
      una, al elegir otra el Panel cambia — y sigue en esa al volver a abrir la app.
- [ ] El lápiz de cada cartera lleva a cambiarle el nombre (pide la contraseña).
- [ ] **Con una cartera con fondos**: la lista de activos enseña KDA con su cantidad y, al
      cabo de un segundo, su valor en euros; y debajo los tokens que tengas (PCO, SPT,
      kb-USDC…). Esto es lo que no he podido ver yo: las carteras de prueba están a cero.
- [ ] **Enviar** abre el envío, **Recibir** abre el QR de tu cuenta y **Puente** lleva al
      Puente.
- [ ] **Detalle de la cartera** (plegado, al fondo) tiene el reparto por chains, las dos
      direcciones con su QR y los últimos movimientos.

## 14. El Puente ⚠️

Está en la barra de abajo. **Solo para mirar**: desde el móvil todavía no se firma nada.

- [ ] Solo hay un par, **USDC ↔ kb-USDC**, y el ⇄ cambia el sentido.
- [ ] **Simular un envío**: pon 1 y tu dirección de Ethereum. Tiene que salir el peaje
      (unos 55-60 KDA) y, si la cuenta no tiene KDA en la chain 2, decirlo con esas
      palabras, no con la jerga del nodo.
- [ ] **Con una cuenta con KDA y con kb-USDC en la chain 2**: la simulación dice «Saldría
      bien» y **no envía nada** (mira el saldo después: igual).
- [ ] En el sentido Ethereum → Kadena, **Copiar el destinatario** copia el texto
      `{"pred":"keys-all","keys":["…"]}` de la cartera elegida. Ese es el dato que hay que
      pegar al mandar desde fuera; compáralo con el que da el Koberlet de escritorio:
      tienen que ser idénticos.
- [ ] **¿Llegó mi envío?**: pega la referencia de un envío por el puente hecho desde el
      escritorio. Con uno viejo tiene que decir que está entregado.

## 15. Elegir cartera (0.25.0)

Hace falta tener **dos carteras o más** (Carteras → Añadir otra cartera).

- [ ] En **Mercado**, arriba sale «CARTERA» con el desplegable y, debajo, la dirección
      entera. Al cambiar de cartera, el saldo de «Doy» cambia con ella.
- [ ] En **DCA** igual: los planes que se listan son los de la cartera elegida.
- [ ] En el **Puente** hay dos: «DESDE QUÉ CARTERA» y «A QUÉ CARTERA». Con el ⇄ se
      intercambian las redes y cada selector lista solo las carteras que tienen cuenta de
      esa red.
- [ ] Hacia Kadena, al cambiar la cartera de destino, el texto del custodio
      `{"pred":"keys-all",...}` cambia con ella. **Eso es lo importante de este paso**: es
      el dato que decide dónde cae el dinero.
- [ ] «Otra dirección» abre un campo para escribirla a mano.
- [ ] La cartera elegida se recuerda al salir y volver a entrar en la sección.

## 16. Una cartera, una red (0.26.0) ⚠️

Este paso importa más que los demás: la app **reorganiza tu bóveda** al abrirla.

- [ ] Al abrir la app por primera vez con esta versión, cada cartera que tenías aparece
      ahora como **dos**: «X KDA» y «X EVM».
- [ ] **Las direcciones tienen que ser LAS MISMAS de antes.** Compara la `k:` y la `0x`
      con las que tenías apuntadas. Si alguna cambia, para y avísame: no toques nada más.
- [ ] Los saldos siguen siendo los mismos (es la misma cuenta, solo cambia cómo se agrupa).
- [ ] **Ver la semilla** de la cartera KDA y la de la EVM: son la misma, y es la de antes.
- [ ] En **Carteras → Añadir otra cartera** hay un desplegable «Red de esta cartera».
      Crea una de Ethereum y comprueba que sale con su dirección `0x`.
- [ ] Al mirar una cartera de Ethereum, el Panel enseña su saldo de ETH y USDC, y arriba
      pone «Ethereum», no «Kadena». No hay botón de enviar, y es a propósito.

## 17. Huella o cara (0.34.0)

- [ ] **Ajustes → Huella o cara**. Si el móvil no tiene lector o no hay huella configurada,
      lo dice y no ofrece nada. Si lo tiene, pide la contraseña y luego el dedo.
- [ ] Con una **contraseña mal escrita** NO se activa: tiene que decir «Contraseña
      incorrecta» antes de pedir la huella.
- [ ] Bloquea la cartera y vuelve a abrirla: sale **«Abrir con huella»**. Con el dedo
      correcto entra; **cancelando el diálogo NO entra**.
- [ ] Prueba con **otro dedo no registrado**: no debe entrar.
- [ ] En un envío sale **«Firmar con huella»** y firma sin teclear la contraseña. La
      contraseña escrita tiene que seguir funcionando igual.
- [ ] **La prueba que de verdad importa**: añade una huella NUEVA en los ajustes de Android.
      Al volver, la app tiene que decir que la identificación ya no vale y pedir la
      contraseña para volver a activarla. Si entrara con la huella nueva, PARA y avísame:
      significa que la clave del chip no se invalidó y eso es un agujero de verdad.
- [ ] «Dejar de usar la huella» y comprobar que vuelve a pedir contraseña siempre.

## 18. Redes a mano (0.36.0)

- [ ] **Más → Red → Añadir una red**. Con una dirección mal escrita (`ftp://algo`, o con
      `?` detrás) tiene que negarse y decir por qué.
- [ ] Añade tu devnet (nombre, `http://IP:1848`, `development`). Aparece en el desplegable
      marcada como «puesta a mano».
- [ ] Selecciónala: la cabecera pasa a decir su nombre y el saldo se consulta contra ese
      nodo. **Ojo**: en la maqueta del navegador un nodo `http://` de la LAN lo bloquea la
      política de contenido; en la app instalada va por el canal nativo y sí llega.
- [ ] «Quitar esta red» la borra y devuelve la app a Kadena.

## 19. Huella en Android 9 o 10 (0.36.0)

- [ ] En un móvil con Android 9 o 10 y huella configurada, **Ajustes → Huella o cara** ya
      NO debe decir «este móvil no admite identificación segura»: tiene que dejar
      activarla. Si sigue negando, apúntame el modelo y la versión de Android.

## 20. Importar por clave privada (0.37.0)

- [ ] **Carteras → Añadir wallet → Importar esa clave** con una clave de 64 caracteres.
      La cuenta que sale tiene que ser la MISMA que da esa clave en el escritorio.
- [ ] Dentro de esa wallet **no** debe salir «Ver la semilla», y sí el aviso de que su
      única copia es la clave.
- [ ] Intenta meter la clave privada de una wallet que ya tengas por su semilla: tiene
      que negarse diciendo que esa cuenta ya está.

## 21. Plan de compras desde el móvil (0.37.0) — CUIDADO, ESTO MUEVE DINERO

- [ ] Primero con **el mínimo**: bote 200 KDA, cuota 100 KDA, cada 5 minutos. No empieces
      por 20.000.
- [ ] Repasa el resumen antes de firmar: número de compras, duración y comisión.
- [ ] Firma. Cuando entre en un bloque, el plan tiene que aparecer arriba, en la lista.
- [ ] Comprueba en el escritorio que el plan es el mismo y que el bote llegó a la cuenta
      de custodia del contrato.
- [ ] Si algo falla, apúntame la referencia (request key): con eso se ve en la cadena qué
      pasó exactamente.

## 22. Portada e icono (0.37.0)

- [ ] Al abrir la app con la cartera cerrada sale la portada nueva, y **solo un**
      «Koberlet» en pantalla.
- [ ] «Ver una cuenta sin entrar» enseña el saldo de una cuenta cualquiera sin pedir la
      contraseña.
- [ ] **Ajustes → Bloquear ahora** devuelve a esa portada.
- [ ] El icono del lanzador es el hexagono verde con la K, no el de Capacitor.

## 23. Salir de la app y cerrojo automático (0.39.0)

- [ ] **Ajustes → Bloquear sola si no la tocas**: pónlo en 1 minuto para probar.
- [ ] Con la cartera abierta, vete a Inicio, espera **más de ese minuto** y vuelve:
      tiene que pedir la contraseña otra vez.
- [ ] Sal y vuelve **enseguida**: NO debe pedirla.
- [ ] Déjala **abierta y quieta** en el Panel ese minuto, sin salir: también tiene que
      bloquearse sola.
- [ ] Apaga la pantalla, espera y enciéndela: mismo resultado.
- [ ] Vuelve a ponerlo en 5 minutos (o lo que te vaya bien) y comprueba que se acuerda
      al reabrir la app.
- [ ] Botón de **atrás** en Mercado, Puente, DCA o Carteras: vuelve al Panel.
- [ ] Botón de **atrás en el Panel**: la app se va al fondo (no se cierra del todo,
      es lo que hace Inicio). Al volver a entrar, si ha pasado el minuto, pide la
      contraseña.
- [ ] **Ajustes → Bloquear y salir**: cierra la cartera y desaparece la app.

## 24. Enviar entre chains (0.40.0) — CUIDADO, ESTO MUEVE DINERO

- [ ] Empieza **mandándote a ti mismo** una cantidad pequeña de una chain a otra:
      destino = tu propia cuenta `k:`, chain distinta. Es la prueba que menos duele
      si algo sale mal.
- [ ] Antes de firmar, el resumen tiene que decir **Desde chain X / Hasta chain Y** y
      avisar de que son dos pasos.
- [ ] Tras firmar: «el dinero ha salido de la chain X», luego «esperando la prueba» y
      al final «ha llegado a la chain Y». Puede tardar un par de minutos.
- [ ] Comprueba el saldo en las dos chains: tiene que haber bajado en una y subido en
      la otra.
- [ ] Si se queda en «esperando la prueba», **apúntame la referencia** y no repitas el
      envío: el dinero está a medio camino, no perdido, y se remata con esa referencia.
- [ ] Con una cuenta de destino que NO empiece por `k:` y chain distinta, la app tiene
      que negarse antes de firmar.

---

## 25. Cobrar una cantidad concreta (Recibir, 0.44.1)

- [ ] Panel → **Recibir**. Escribe **25** en «Cantidad que pides» y elige una chain.
      El QR tiene que **cambiar** al escribir, y debajo poner «El código pide 25 KDA
      en la chain X».
- [ ] Borra la cantidad: el texto vuelve a «el código lleva solo tu cuenta» y el QR
      vuelve a ser el de antes.
- [ ] Con OTRO móvil con Koberlet: Enviar → **Escanear** ese QR. Tienen que quedar
      rellenas la cuenta, la cantidad y la chain de destino. **No debe enviarse nada
      solo por escanear**: hasta que no pulses Continuar, resumen y contraseña, no
      sale un euro.
- [ ] Escanea el mismo QR con otro monedero cualquiera (eckoWallet, Chainweaver):
      al menos la cuenta tiene que leerla bien.
- [ ] En una cartera de Ethereum, la hoja de Recibir NO enseña las casillas.

- [ ] Con una cantidad puesta, **Copiar el QR** y pégalo en un WhatsApp: tiene que
      salir la imagen del código. Si el móvil no sabe copiar imágenes, el botón
      avisa y deja copiado el enlace del cobro; pégalo y comprueba que lleva la
      cantidad y la chain.

## 26. Agenda de cuentas (0.44.1)

- [ ] Enviar → escribe una cuenta → **Guardar esta cuenta en la agenda**, ponle un
      nombre → Guardar. Tiene que aparecer arriba en el desplegable **Agenda** como
      `nombre — k:xxxxxx…xxxx`.
- [ ] Cierra la app del todo, ábrela y vuelve a Enviar: la cuenta sigue en la lista.
- [ ] Elige el contacto en el desplegable: rellena la casilla de destino y **nada
      más** (no salta ningún paso).
- [ ] Guarda la misma cuenta otra vez con otro nombre: no se duplica, se le cambia
      el nombre.
- [ ] Intenta guardar una cuenta mal escrita: tiene que negarse.
- [ ] Ajustes → **Agenda**: están las guardadas, con Kadena o Ethereum al lado.
      **Quitar de la agenda** la borra y no toca ningún saldo.

## 27. Qué pasa sin conexión (0.44.3)

- [ ] Pon el móvil en **modo avión** y abre la app. El total tiene que salir como
      «—», NO como 0 KDA, y debajo el aviso de que no ha contestado ninguna chain y
      de que el dinero sigue donde estaba.
- [ ] Quita el modo avión, dale a **Refrescar**: vuelve el saldo de verdad.
- [ ] Con la app en inglés, la cabecera tiene que poner **My wallet**, no «Mi cartera»
      (si la renombraste, sale tu nombre, y eso es correcto).

## 28. Tocar un plan de compras (0.45.0)

Con un plan de verdad, y con poco dinero la primera vez.

- [ ] DCA → en un plan activo, **Parar**. Lee lo que avisa, mete la contraseña y firma.
      Al confirmarse, el estado tiene que pasar a **En pausa**.
- [ ] **Reanudar** el mismo plan: vuelve a **Activo** y la siguiente compra se cuenta
      desde ese momento.
- [ ] **Recargar** con una cantidad pequeña: el bote tiene que subir esa cantidad exacta.
- [ ] **Cerrar** un plan: comprueba que el aviso dice cuánto te devuelve, y que después
      ese dinero está en tu cuenta en la chain 2.
- [ ] Un plan **cerrado** no debe enseñar ningún botón.
- [ ] Con la huella activada, cada una de esas cuatro cosas se tiene que poder firmar
      también con la huella.
- [ ] Si eliges arriba una cartera que NO es la dueña del plan, el nodo tiene que
      rechazarlo (y solo se pierde el gas).

## 29. Seguridad, historial y copiar el QR (0.45.1)

- [ ] **Más → Seguridad**: arriba tiene que decir la verdad de tu móvil — cifrado
      «AES-256 en este aparato», la huella «Activada» o «Sin activar» según la tengas,
      y cada cuánto se cierra sola.
- [ ] Cada cartera tiene su tarjeta. **Ver la semilla** y **Clave privada** piden la
      contraseña igual que antes, y en el móvil la semilla NO se puede copiar.
- [ ] Una cartera metida por clave privada no debe ofrecer semilla.
- [ ] En el panel, el **reloj** al lado del nombre de la cartera abre los últimos
      movimientos sin salir de la pantalla.
- [ ] En Recibir con una cantidad puesta, **Copiar el QR** y pega en WhatsApp: tiene que
      ir la imagen. Pega en un correo (Gmail): imagen y, debajo, la cantidad, la chain y
      la cuenta. Pega en un bloc de notas: solo el texto.

## 30. Copiar el QR y abrir la app desde la cámara (0.45.3)

- [ ] Recibir → pon 0,5 y chain 2 → **Copiar el QR** → pega en un WhatsApp: va la imagen
      del código y **nada más**, sin texto pegado debajo.
- [ ] Escanea esa imagen con **la cámara del propio móvil** (no con la app): Android tiene
      que ofrecer abrir Koberlet.
- [ ] Al abrirla: pide la contraseña o la huella como siempre y cae en **Enviar** con la
      cuenta, la cantidad (0,5) y la chain (2) ya puestas, y el aviso «Repásalo: lo envías
      tú». **No manda nada solo.**
- [ ] Con la cartera ya abierta y la app en segundo plano, repite: tiene que saltar igual
      a Enviar relleno.
- [ ] Escanea el mismo código con el botón **Escanear un código QR** de dentro: mismo
      resultado.
- [ ] Prueba de seguridad: escribe `kadena:k:<tu cuenta>?amount=1&chain=2` en el navegador
      del móvil y ábrelo. Tiene que llegar hasta el resumen y pararse ahí. Si alguna vez
      manda algo sin que tú confirmes, eso es un fallo grave: avisa.

## 31. La ficha de un movimiento (0.45.4)

- [ ] Reloj → toca una línea del historial: se abre la ficha con la cantidad, la fecha y
      hora completas, la chain, el bloque, las dos cuentas enteras y la clave.
- [ ] **Copiar la clave** y pégala en un bloc: tiene que salir entera.
- [ ] **Verlo en el explorador**: se abre el navegador del móvil (no dentro de la app) y
      sale esa misma transacción.
- [ ] Busca un movimiento pequeño hacia una cuenta que no empieza por `k:`: la ficha tiene
      que decir que eso es el gas del minero.
- [ ] Busca un envío entre chains: la mitad que sale dice que la otra mitad está en la
      chain de destino.

---

## Si algo falla

Manda una captura y, si puedes, lo que pone en **Info → Datos técnicos**: ahí está la
versión, el camino de red y el modelo de aparato, que es lo que hace falta para saber si
el fallo es del código o de ese Android en concreto.

## 32. Mercado en el Panel (0.45.5)

- [ ] En el Panel hay cuatro círculos: Enviar, Recibir, Puente y **Mercado**. Entran los
      cuatro sin apretujarse y se llega con el pulgar.
- [ ] La barra de abajo tiene Panel, DCA, Carteras y **Más**.
- [ ] **Más** sigue teniendo Mercado y Puente, y llevan a la misma pantalla.
- [ ] Con una cartera de **Ethereum** activa: la tarjeta no ofrece Mercado, pero se llega
      por «Más».
