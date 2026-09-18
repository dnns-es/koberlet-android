# Publicar Koberlet en Google Play — plan completo

Todo lo que hay que hacer, en orden, con lo que ya está resuelto marcado. Pensado
para cuenta **personal** (sin empresa), que es lo decidido.

Estado a **17/09/2026** · versión **0.56.1** · bundle en `bundle/koberlet-0.56.1-play.aab`,
**enviado a revisión** en el canal `alpha`

---

## Resumen de por dónde va

| # | Cosa | Estado |
|---|---|---|
| 1 | `.aab` en vez de APK | ✅ hecho y verificado |
| 2 | `targetSdk` 36 | ✅ hecho |
| 3 | Política de privacidad en URL pública | ✅ responde 200 |
| 4 | Icono 512×512 y gráfico 1024×500 | ✅ generados |
| 5 | Textos de la ficha | ✅ escritos (`FICHA.md`) |
| 6 | Formulario de Seguridad de los Datos | ✅ respondido (`SEGURIDAD-DATOS.md`) |
| 7 | Firma de la app | ✅ **hecho** — Play firma con la clave de DNNS (ver punto 7) |
| 8 | Actualización OTA incompatible con Play | ✅ resuelto con dos canales |
| 9 | Capturas de pantalla | ✅ hechas y subidas (mejorables, ver punto 9) |
| 10 | Swaps / puente / DCA | ✅ **decidido**: se envía completo, con la verdad por delante |
| 11 | Cuenta de desarrollador y verificación | ✅ **hecha y verificada** (oberdnns@gmail.com) |
| 12 | Prueba cerrada, 12 testers, 14 días | ⏳ **12 dentro el 18/09** — se cumplen el 2/10 |
| 13 | App creada en la Consola | ✅ `es.dnns.koberlet` |
| 14 | Publicación por API sin abrir la Consola | ✅ montada (ver punto 13) |
| 15 | Licencias de cripto país por país | ✅ **resuelto** con la exención de cartera sin custodia (punto 14) |

---

## 1. El bundle ✅

Ya no se genera un APK para Play: se genera un **Android App Bundle**, que es lo
único que admite la tienda desde 2021.

```bash
npm run aab:play
```

Deja el `.aab` en `android/app/build/outputs/bundle/playRelease/`. El que está
en `bundle/koberlet-0.56.1-play.aab` es esa misma salida, copiada aquí para
tenerla localizada.

Comprobado sobre el bundle generado:

- Pesa 6,3 MB.
- Va firmado con la clave de release (RSA 4096).
- Permisos que pide: `INTERNET`, `CAMERA`, `USE_BIOMETRIC`, `USE_FINGERPRINT`.
  Y nada más.

## 2. targetSdk 36 ✅

Estaba en 35. Google exige **36** para subir apps nuevas o actualizaciones desde
el **31 de agosto de 2026**, plazo que ya ha vencido: con 35 la Consola rechaza
la subida directamente.

Cambiado en `android/variables.gradle` (`compileSdkVersion` y `targetSdkVersion`).
Para que AGP aceptara compileSdk 36 hubo que subir el plugin de Android de 8.7.2
a **8.9.3**; el wrapper de Gradle (8.11.1) ya valía y no se ha tocado.

`minSdk` sigue en **26** (Android 8.0). Eso está bien y no hay que cambiarlo:
Play no pone mínimo, y bajar el mínimo no cuesta nada mientras la bóveda funcione
ahí.

## 3. Política de privacidad ✅

**`https://descargas.dnns.es/koberlet/politicas.html`** — comprobado: responde
**HTTP 200**, 15 KB, sin pedir contraseña. Es la que va en la ficha.

Es el mismo texto que se acepta dentro de la app, que es como tiene que ser.

Cambiada el 16/09/2026: estaba en `…/kob7t2m9x4/politicas.html` y se ha movido a
una URL limpia. **La antigua sigue respondiendo** —es un enlace al mismo
fichero— porque las versiones ya instaladas la llevan escrita dentro.

> ⏳ Queda un fleco: el enlace que la app enseña dentro de las políticas
> (`src/politicas-texto.js`, línea 22 y su equivalente en inglés) todavía apunta
> a la dirección vieja. No está roto y no corre prisa, pero conviene arreglarlo
> en la próxima versión. Ese fichero **se genera** desde el `POLITICAS.md` del
> monedero de escritorio con `herramientas-politicas.js`: hay que cambiarlo allí,
> no a mano aquí, o el siguiente regenerado lo revierte.

**Requisito duro:** la URL debe seguir respondiendo sin autenticación mientras la
app esté publicada. Google la comprueba de vez en cuando y una política caída es
motivo de retirada.

## 4 y 5. Ficha y gráficos ✅

Textos en `FICHA.md`, gráficos en `assets/`. Se regeneran con:

```bash
node herramientas/assets-play.js
```

El icono sale del icono real de la app, así que la tienda enseña exactamente lo
que se verá luego en el móvil. Los dos van **sin canal alfa**, que es el error
más común al subir la ficha.

## 6. Seguridad de los datos ✅

En `SEGURIDAD-DATOS.md`, campo por campo. La respuesta es que la app no recoge
ni comparte datos, y ahí está el razonamiento por si alguien pregunta.

## 7. Firma de la app ✅ — resuelto el 17/09/2026

**Ya está hecho y verificado.** Play firma con la clave de DNNS, no con una suya,
así que los dos canales quedan intercambiables y nadie va a perder una bóveda por
cambiarse de uno a otro.

Cómo se comprobó, que en esto no vale fiarse del mensaje de «guardado»: se sacó la
huella del certificado del keystore local con `keytool` y se cotejó con la que
enseña la Consola en *Clave de firma de aplicación*. Coinciden las dos:

```
SHA-1    AE:AE:6D:26:5E:A0:31:09:11:5E:6D:5B:52:84:64:F4:40:31:BC:A5
SHA-256  75:19:4F:6A:46:4D:0E:58:72:72:9D:E5:E5:F3:FE:A9:A1:3E:27:D7:FD:04:2A:95:16:58:91:D3:12:3E:88:9B
```

Detalle de cómo fue, por si hay que repetirlo en otra app: al crear la app, Google
**ya había generado su propia clave** por defecto. Se cambió desde *Protegida con
Play → Protección de Play Store → Gestiona la firma de aplicaciones de Play →
Cambiar clave → Exportar y subir una clave del almacén de claves de Java*, con el
ZIP de PEPK. Se pudo cambiar porque la base instalada era 0 %; con usuarios ya
dentro, esto no se toca.

No se generó clave de subida aparte (paso 5 del asistente, opcional): se firma y se
sube con la misma, que es lo que mantiene simple el canal directo.

El keystore: `.keys/koberlet-release.jks`, RSA 4096, válido hasta **2056** (Play
exige que pase de octubre de 2033). Firma v1+v2+v3.

**Por qué importaba tanto:** si se hubiera aceptado la clave de Google, el APK que
instala Play y el de `descargas.dnns.es` irían firmados por manos distintas, y
Android **no deja instalar uno encima del otro**. Quien tuviera uno no podría
pasarse al otro sin desinstalar, y desinstalar **borra la bóveda**. Con los dos
canales vivos a la vez, eso no era un riesgo teórico.

El comando de PEPK que se usó, para dejarlo escrito (la clave pública de cifrado
la da la propia Consola y es de un solo uso, hay que volver a descargarla si se
repite):

```bash
java -jar pepk.jar --keystore=.keys/koberlet-release.jks --alias=koberlet \
  --output=koberlet-pepk-upload.zip --include-cert \
  --rsa-aes-encryption --encryption-key-path=encryption_public_key.pem
```

> Y lo de siempre, que en esto no hay red de seguridad: si se pierde
> `koberlet-release.jks` o su contraseña, no hay forma de publicar una
> actualización de esta app **nunca más**. Ni Google puede arreglarlo. Guarda una
> copia fuera del ordenador.

### Coordinar los `versionCode` entre los dos canales

Con la misma firma y el mismo `applicationId`, las dos variantes son la misma app
para Android. El `versionCode` sale del `package.json`
(`mayor*10000 + menor*100 + parche`), así que 0.52.2 → **5202**.

Regla práctica: **sube siempre la versión antes de publicar en cualquiera de los
dos canales**. Si publicas 0.53.0 en tu web y luego mandas 0.52.2 a Play, quien
tenga la de tu web no recibirá la de Play (es más vieja) y quedan descuadrados.

## 8. La actualización dentro de la app ✅ resuelto

Google Play **prohíbe** que una app descargue código e invoque al instalador
(política de Código Ejecutable / Abuso de Dispositivo). No es interpretable y no
depende de que funcione bien: es motivo de rechazo y, si se detecta después,
de suspensión de la app y de la cuenta.

No se ha quitado nada. Se ha partido en **dos canales** de la misma base:

| | `directa` | `play` |
|---|---|---|
| Dónde | descargas.dnns.es | Google Play |
| Formato | APK | `.aab` |
| `KoberletUpdate` (descarga e instala) | ✅ sí | ❌ no se compila |
| `REQUEST_INSTALL_PACKAGES` | ✅ sí | ❌ no se declara |
| JavaScript de actualización | ✅ sí | ❌ no viaja en el bundle |
| Cómo se actualiza | la app avisa y tú instalas | la tienda, sola |
| Para qué sirve | **probar antes de mandar nada a Play** | público general |

Comprobado sobre los binarios, no sobre el código:

- En el `.aab` de Play: `REQUEST_INSTALL_PACKAGES` **no aparece** y la clase
  `KoberletUpdate` **no está en el dex**. Comprobado otra vez sobre el bundle de
  la 0.56.1.

> Matiz, porque aquí antes ponía que `descargas.dnns.es` no estaba en el
> JavaScript y **eso no es exacto**: sale tres veces, y las tres son del **texto de
> las políticas** (`src/politicas-texto.js`), no del actualizador. Una es el enlace
> para ver las políticas en la web y las otras dos son la frase que dice que la app
> hace «comprobación de actualizaciones a descargas.dnns.es».
>
> Lo que importa es que **no hay código de actualización**, y no lo hay. Pero esa
> frase **es falsa en la variante de Play**, que no lleva actualizador: la política
> declara una conexión que esa versión no hace. Declarar de más no es un problema
> de política de Google -el problema es declarar de menos-, pero no es verdad, y
> este proyecto no deja pasar cosas que no son verdad.
>
> El fichero **se genera** desde el `POLITICAS.md` del monedero de escritorio con
> `herramientas-politicas.js`: hay que arreglarlo allí, no aquí, o el siguiente
> regenerado lo revierte. Y de paso, ese enlace sigue apuntando a la URL vieja
> (`…/kob7t2m9x4/politicas.html`) en vez de a la limpia que va en la ficha
> (`…/koberlet/politicas.html`); las dos responden, pero no dicen lo mismo.
- En el APK directo: los tres siguen ahí, intactos.

Y hay un cepo para que no se cuele un despiste: Gradle **se niega a compilar** si
los assets web puestos no son los del canal que se está construyendo. Si alguien
hace `npm run build` a secas y luego intenta el bundle de Play, el build para con
un mensaje diciendo qué comando hay que usar.

## 9. Capturas ✅ — hechas el 17/09/2026

Cinco, tomadas en el Xiaomi con la cartera desechable «Play». Instrucciones y
avisos en `CAPTURAS.md` — sobre todo el de no publicar direcciones reales con
saldo, que en la primera tanda sí se coló y hubo que rehacer dos.

**Defecto conocido, que no bloquea:** las cinco llegaron al repositorio pegadas
en un chat, y ese camino las recomprimió. Son **JPEG de 757×1600 px** aunque se
llamen `.png`. Play las acepta (admite JPEG y mira el contenido, no la
extensión), pero se quedan por debajo del **mínimo de 1080×1080** que Google pide
para poder promocionar la app en sus listas.

Cuando se rehagan la 1, la 3 y la 5 con saldo, pasarlas **por cable USB** desde
`DCIM/Screenshots`, no por mensajería. La ficha se edita sin volver a pasar
revisión, así que esto se cambia cuando se quiera.

## 10. Swaps, puente y DCA ✅ — decidido el 17/09/2026

**Se envía la app completa, con swap, puente y DCA, y se declara lo que es.**
Decisión de Antonio: ir con la verdad por delante y, si Google no la quiere
publicar, seguir repartiendo por APK desde `descargas.dnns.es`.

El fondo del asunto: Google clasifica como *exchange de criptomonedas* las apps
que permiten intercambiar cripto, y a esas les pide acreditar registro ante la
autoridad competente (en España, MiCA/CASP). Una cuenta personal no puede
aportarlo.

Lo que se declara, que no es una postura de conveniencia sino lo que hace la app:
**monedero no custodial, no exchange**. No custodia fondos, no casa órdenes, el
intercambio lo ejecuta un contrato público de la cadena y la app solo firma. Es
una lectura defendible, está razonada en `SEGURIDAD-DATOS.md` apartado 3, y si el
revisor no la comparte el resultado es un rechazo — que se recurre o se acata,
pero no es falsear una declaración.

### Por qué no se recortó, que el documento antes decía que era barato

Lo era sobre el papel y no lo es en el código. Las funciones de intercambio no son
un módulo que se desenchufe:

- ~2.570 líneas de JS en siete módulos (`pantalla-mercado`, `pantalla-puente`,
  `pantalla-dca`, `mercado-eth`, `mercado-red`, `lado-cambio`, `historial-puente`)
- `SwapEvm.kt` entero
- Y, lo que pesa de verdad: `cambioAmm`, `envioPuenteEvm`, `crearPlanDca` y
  `gestionarPlanDca` viven **dentro de `FirmaKda.kt`**, mezclados con el resto de
  la firma. Ese es el fichero de las plantillas fijas de Pact y las capabilities
  acotadas, o sea la pieza que impide que el WebView cuele algo a firmar.

Recortar bien obliga a operar ese fichero, y un fallo ahí no es un rechazo de
Google: es dinero. Cambiar un riesgo de política por un riesgo de seguridad no
sale a cuenta cuando el primero se recupera reenviando.

Y esconder solo la interfaz **no vale**: las clases seguirían en el dex, y una
función oculta pero presente es justo lo que Google llama comportamiento
engañoso. O se quita de verdad, o se manda entera.

### Si al final la rechazan

El plan B sigue siendo el recorte, pero entonces se hará sabiendo **qué** molestó,
en vez de adivinando. Y cuesta poco al usuario: como Play y `descargas.dnns.es`
comparten clave de firma (punto 7), quien quiera el swap puede instalarse el APK
de la web encima del de Play sin perder la bóveda.

> Eso **no se anuncia en la ficha de Play**. Dirigir a los usuarios fuera de la
> tienda para conseguir funciones que allí no están es incumplimiento, y sería
> tropezar en la salida con algo que no hacía falta decir.

## 11. Cuenta de desarrollador ✅ — hecha el 17/09/2026

Cuenta **personal**, a nombre de Oberlus, con `oberdnns@gmail.com` como cuenta
propietaria (ojo: eso no se puede cambiar después). Identidad ya verificada.

La app está creada en la Consola como **`es.dnns.koberlet`**, que es el mismo
`applicationId` del `build.gradle`. Tiene que serlo: si no coincide, Play rechaza
el bundle sin más explicación.

## 12. Prueba cerrada ⏳ — los 12 dentro el 18/09/2026

**Dónde está ahora:** la 0.56.1 (versionCode 5601) está **publicada y repartida al
100 %** en el canal `alpha`, y los **12 testers han aceptado**. Google da por
cumplidos los dos primeros requisitos; queda el tercero, que es solo esperar.

> **El reloj arrancó el 18/09/2026.** Los 14 días se cumplen el **2 de octubre de
> 2026**, y ese día se puede pulsar *Solicitar acceso a producción*.
>
> Lo único que lo puede estropear es que alguien **se salga o desinstale**: el
> contador vuelve a cero y se empieza otra vez. Conviene avisarlo por escrito al
> grupo, porque nadie se imagina que desinstalar una app de prueba tenga efecto
> sobre los demás.

Tres cosas que se aprendieron montándola y que no son evidentes:

- **El enlace de aceptación no funciona hasta que hay una versión aprobada** en el
  canal. Antes de eso, a todo el mundo le sale «App not available», y ese mismo
  mensaje cubre también el caso de «no estás en la lista». Repartirlo antes de
  tiempo solo genera doce personas mandando la misma captura.
- **Google no manda ninguna invitación.** El enlace
  (`https://play.google.com/apps/testing/es.dnns.koberlet`) lo reparte uno mismo.
  Se puede publicar en un grupo abierto sin riesgo: con listas de correo, quien no
  esté en la lista no puede instalar nada.
- **El correo tiene que ser el que el móvil tiene en Play.** Si alguien da otro,
  la aceptación se apunta en la cuenta equivocada, no cuenta, y no salta ningún
  aviso. Es el fallo que más veces rompe estas pruebas.

El contador de los 12 se mira en **Probar y publicar → Producción → acceso a
producción**, no en la pestaña de testers (ahí solo se ve a quién has invitado,
no quién ha entrado). Va con retraso: cuenta **aceptaciones**, no instalaciones, y
puede tardar un día en reflejar a alguien que acaba de aceptar.

El requisito, que es lo que marca el calendario real:

- **12 testers como mínimo**, cada uno con su cuenta de Google.
- **En un dispositivo Android físico** (los emuladores no cuentan).
- **14 días seguidos** con esos 12 dentro. Si uno se sale, el contador se
  reinicia.
- Después de los 14 días, se solicita el acceso a producción y hay otra revisión.

O sea: desde que empieza la prueba cerrada hasta estar en la tienda, **no menos
de tres semanas**, y eso yendo todo bien.

Está previsto contratar un servicio de testers (~25 USD). Dos avisos, porque de
esto se han caído cuentas:

- Que sean **testers reales con dispositivos reales**. Los servicios que dan
  cuentas de granja son detectables y el resultado es la baja de la cuenta.
- Guarda constancia de lo que has contratado. Si Google pregunta, tiene que
  cuadrar.

## 13. Publicar por API, sin abrir la Consola ✅

Montado el 17/09/2026 en `herramientas/play-api.js`. Sirve para subir el bundle y
mirar en qué anda cada canal sin pasar por la web.

```bash
node herramientas/play-api.js estado            # que hay publicado en cada canal
node herramientas/play-api.js subir internal    # sube el .aab al canal que se diga
node herramientas/play-api.js testers alpha     # lo que la API cuenta del canal
```

Canales: `internal` (probadores propios, llega en minutos, **no** cuenta para los
14 días), `alpha` (prueba cerrada, la que **sí** cuenta), `beta`, `production`.

Cómo está autenticado: cuenta de servicio `koberlet-publisher` del proyecto de
Google Cloud `tactical-curve-160511`, con la *Google Play Android Developer API*
habilitada. La clave privada está en **`.keys/play-service-account.json`**, que no
se versiona (`.keys/` está en `.gitignore`). Los permisos se dieron a nivel de
cuenta, no por app, así que valen también para apps futuras:

- Crear, editar y eliminar borradores de aplicaciones
- Lanzar a producción, excluir dispositivos y usar la firma de Play
- Lanzar aplicaciones en canales de pruebas
- Gestionar canales de pruebas y editar listas de testers
- Gestionar presencia en Play Store

**Deliberadamente NO tiene** ninguno de datos financieros ni de gestión de pedidos:
si esa clave se filtrara algún día, no da acceso al dinero.

Dos cosas que conviene saber antes de pelearse con ella:

- **El `403` casi nunca es propagación, aunque lo parezca.** Esto costó un día
  entero de espera inútil el 17/09/2026. La cuenta de servicio salía **Activo** en
  *Usuarios y permisos*, tenía todos los permisos **de cuenta** (incluido «Lanzar
  aplicaciones en canales de pruebas»), y aun así contestaba
  `403 The caller does not have permission`.

  La causa: en la ficha del usuario, la pestaña **«Permisos de la aplicación»
  estaba vacía**. Faltaba marcar, para Koberlet, **«Ver información de la
  aplicación (solo lectura)»**. Los permisos de cuenta conceden en gris casi todo
  lo demás, y ese hueco no salta a la vista.

  Tiene sentido: cada operación de la API empieza con `edits.insert`, que es abrir
  una edición sobre la app, y para eso hace falta poder **leerla**. Sin ese
  permiso, no hay subida posible por muchos permisos de publicación que haya.

  **Cómo diagnosticarlo sin adivinar.** El mensaje del script no distingue causas;
  el error crudo sí. Un `403 PERMISSION_DENIED` **sin `details`** es denegación de
  la Consola de Play. Si fuera la API de Cloud sin habilitar, el mensaje diría que
  la API «has not been used in project … or it is disabled». Para verlo:

  ```js
  catch (e) { console.log(e.code, JSON.stringify(e.response?.data, null, 2)); }
  ```

  Así que, ante un 403: **mirar primero los permisos de la aplicación**, no
  esperar. Si de verdad fuera propagación, se resolvería en minutos, no en días.
- **La API no puede crear la app.** Eso es a mano en la Consola, una vez. Todo lo
  demás (subir, mover de canal, publicar) sí.

Lo que el script **no** hace, y es a propósito: no toca la ficha ni las capturas.
Eso se sube una vez y no compensa automatizarlo.

---

## 14. Licencias de cripto país por país ✅ — resuelto el 17/09/2026

Esto no aparece hasta que subes el bundle, y es lo que más asusta de todo el
proceso. Al ir a confirmar la versión, la Consola da un error:

> Debes indicarnos si tu aplicación incluye funciones financieras.

Y detrás, en **Funciones financieras → paso 2, Documentación**, sale una tabla de
doce filas pidiendo **documentación de licencia** para cada territorio: Baréin,
Canadá, Unión Europea, Israel, Japón, Filipinas, Sudáfrica, Corea del Sur,
Emiratos Árabes Unidos, Reino Unido, Estados Unidos y «Todos los países o
regiones».

El texto de la fila de la UE es explícito: MiCA exige autorización como proveedor
de servicios de criptoactivos, y **las apps que no suban licencia válida se
retiran de Google Play**.

### La salida: la exención

Al abrir cada fila, además de los campos para la licencia hay **dos casillas**.
La segunda es la que resuelve el caso:

> ☑ Confirmo que mi aplicación es una cartera de software sin custodia

Se marca esa, se dejan **vacíos** «Entidad autorizada» y «Número de licencia», y
se guarda. Hay que repetirlo en las doce filas.

Es verdad literal y comprobable en el código: las claves se crean y se quedan
cifradas en la bóveda del aparato y no salen ni para firmar. Y encaja con la
regulación: MiCA regula la **custodia por cuenta de terceros**, que es justo lo
que Koberlet no hace.

### La casilla que NO se marca

> ☐ Confirmo que mi aplicación no ofrece la compra, tenencia ni intercambio de
> criptomonedas en este país o territorio, y que he aplicado las medidas de
> restricción geográfica necesarias

Dos afirmaciones falsas en el caso de Koberlet: la app **sí** ofrece intercambio
(el swap por DEX), y **no** hay ninguna restricción geográfica aplicada. Firmarla
sería una declaración falsa a Google, y eso se paga con la cuenta entera, no con
la app.

### Lo que queda abierto

**El swap es lo que puede sacar a la app de esa exención.** Un revisor puede
decidir que algo que además intercambia ya no es «solo una cartera sin custodia»
y retirarla de la UE. No es ocultación: el swap, el puente y el DCA se declararon
por escrito y por delante en el campo «Otro» de la declaración financiera (ver
`SEGURIDAD-DATOS.md` punto 3). La casilla que se marca es cierta, y lo que podría
matizarla lo cuenta uno mismo sin que se lo pregunten.

Si aun así dicen que no, el plan sigue siendo el de siempre: el APK de
`descargas.dnns.es`.

### Otra declaración que salta al enviar

**ID de publicidad.** Obligatoria para todo lo que apunte a Android 13+. La
respuesta es **No**, y se comprobó donde importa, que es el manifiesto ya
fusionado de la variante que va en el bundle:

```bash
grep -n "uses-permission" \
  android/app/build/intermediates/merged_manifest/playRelease/*/AndroidManifest.xml
```

No aparece `com.google.android.gms.permission.AD_ID`. Ese es el sitio donde hay
que mirar y no el manifiesto de `src/main`: si una dependencia usara el ID de
publicidad, su permiso se habría fusionado ahí aunque nadie lo escribiera a mano.

---

## El orden en que yo lo haría

1. Crear la cuenta y **verificar identidad el mismo día** (empieza el reloj de
   los 30 días).
2. Decidir lo de los swaps (punto 10). Condiciona el bundle y la ficha.
3. Hacer las capturas (punto 9).
4. Crear la app en la Consola y **subir tu propia clave de firma** (punto 7).
   Esto es irreversible: si te equivocas aquí, los dos canales quedan
   incompatibles para siempre.
5. Rellenar ficha, seguridad de los datos, clasificación y declaración
   financiera.
6. Subir el `.aab` a **prueba cerrada**. Aquí saltan las dos declaraciones que no
   se ven hasta este momento: **licencias de cripto por país** (punto 14) e **ID
   de publicidad**.
7. Enviar a revisión. **Hasta que Google apruebe, el enlace de testers no
   funciona**, así que no repartirlo antes.
8. Meter a los 12 testers y esperar los 14 días sin que se salga nadie.
9. Solicitar producción.

## Cómo regenerar todo esto

```bash
npm test                              # 9 pruebas, las 9 pasan
npm run aab:play                      # bundle para la tienda
npm run apk:directa                   # APK para descargas.dnns.es
node herramientas/assets-play.js      # icono y gráfico de la ficha
```
