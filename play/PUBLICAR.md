# Publicar Koberlet en Google Play — plan completo

Todo lo que hay que hacer, en orden, con lo que ya está resuelto marcado. Pensado
para cuenta **personal** (sin empresa), que es lo decidido.

Estado a **17/09/2026** · versión **0.56.0** · bundle en `bundle/koberlet-0.56.0-play.aab`

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
| 9 | Capturas de pantalla | ⏳ **faltan** — hay que hacerlas en el móvil |
| 10 | Swaps / puente / DCA | 🛑 **decisión pendiente** — puede tumbar el envío |
| 11 | Cuenta de desarrollador y verificación | ✅ **hecha y verificada** (oberdnns@gmail.com) |
| 12 | Prueba cerrada, 12 testers, 14 días | ⏳ pendiente |
| 13 | App creada en la Consola | ✅ `es.dnns.koberlet` |
| 14 | Publicación por API sin abrir la Consola | ✅ montada (ver punto 13) |

---

## 1. El bundle ✅

Ya no se genera un APK para Play: se genera un **Android App Bundle**, que es lo
único que admite la tienda desde 2021.

```bash
npm run aab:play
```

Deja el `.aab` en `android/app/build/outputs/bundle/playRelease/`. El que está
en `bundle/koberlet-0.52.2-play.aab` es esa misma salida, copiada aquí para
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

- En el `.aab` de Play: `REQUEST_INSTALL_PACKAGES` **no aparece**, la clase
  `KoberletUpdate` **no está en el dex**, y la URL de `descargas.dnns.es` **no
  está en el JavaScript**.
- En el APK directo: los tres siguen ahí, intactos.

Y hay un cepo para que no se cuele un despiste: Gradle **se niega a compilar** si
los assets web puestos no son los del canal que se está construyendo. Si alguien
hace `npm run build` a secas y luego intenta el bundle de Play, el build para con
un mensaje diciendo qué comando hay que usar.

## 9. Capturas ⏳ FALTA

Mínimo 2. Hay que hacerlas en el móvil. Instrucciones y avisos en `CAPTURAS.md`
— sobre todo el de no publicar direcciones reales con saldo.

## 10. Swaps, puente y DCA 🛑 DECISIÓN PENDIENTE

Está explicado en `SEGURIDAD-DATOS.md`, apartado 3. En corto:

Google clasifica como *exchange de criptomonedas* las apps que permiten
intercambiar cripto, y a esas les pide acreditar registro ante la autoridad
competente (en España, MiCA/CASP). Una cuenta personal no puede aportarlo.

Koberlet no custodia fondos y el intercambio lo hace un contrato en la cadena,
lo cual es un argumento razonable para decir que no es un exchange. Pero lo
decide el revisor.

**El bundle que hay en `bundle/` lleva los swaps dentro.** Antes de enviarlo hay
que decidir si se manda así o si se hace una variante solo-monedero. La tubería
de canales ya está montada, así que recortar es rápido si se decide eso.

## 11. Cuenta de desarrollador ✅ — hecha el 17/09/2026

Cuenta **personal**, a nombre de Oberlus, con `oberdnns@gmail.com` como cuenta
propietaria (ojo: eso no se puede cambiar después). Identidad ya verificada.

La app está creada en la Consola como **`es.dnns.koberlet`**, que es el mismo
`applicationId` del `build.gradle`. Tiene que serlo: si no coincide, Play rechaza
el bundle sin más explicación.

## 12. Prueba cerrada ⏳

Requisito obligatorio para cuentas personales creadas después de noviembre de
2023, y es lo que marca el calendario real:

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

- **Los permisos tardan en propagarse.** Recién invitada la cuenta de servicio, la
  API contesta `403 The caller does not have permission` aunque en la Consola se
  vea «Activo». Suelen ser minutos; Google se reserva hasta 24 h. No es un fallo de
  configuración y no hay nada que arreglar: es esperar.
- **La API no puede crear la app.** Eso es a mano en la Consola, una vez. Todo lo
  demás (subir, mover de canal, publicar) sí.

Lo que el script **no** hace, y es a propósito: no toca la ficha ni las capturas.
Eso se sube una vez y no compensa automatizarlo.

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
6. Subir el `.aab` a **prueba cerrada** y meter a los 12 testers.
7. Esperar los 14 días sin que se salga nadie.
8. Solicitar producción.

## Cómo regenerar todo esto

```bash
npm test                              # 9 pruebas, las 9 pasan
npm run aab:play                      # bundle para la tienda
npm run apk:directa                   # APK para descargas.dnns.es
node herramientas/assets-play.js      # icono y gráfico de la ficha
```
