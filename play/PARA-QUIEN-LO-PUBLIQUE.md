# Si la publica otra persona desde su cuenta

Este paquete lo ha preparado DNNS.es (Oberluss), autor de Koberlet, para que
alguien con cuenta de Google Play Console pueda subir la app. Aquí está todo lo
que hace falta y, sobre todo, lo que hay que hablar **antes** de subir nada.

Léete esto entero antes de abrir la Consola. Son cinco minutos y hay dos cosas
aquí que no tienen vuelta atrás.

---

## Lo que hay en el paquete

| Fichero | Qué es |
|---|---|
| `bundle/koberlet-0.52.2-play.aab` | El Android App Bundle listo para subir |
| `FICHA.md` | Título, descripción breve y completa, categoría — para pegar tal cual |
| `SEGURIDAD-DATOS.md` | El formulario de Seguridad de los Datos respondido campo por campo |
| `CAPTURAS.md` | Cómo hacer las capturas y qué no debe salir en ellas |
| `PUBLICAR.md` | El plan técnico completo, con lo que ya está resuelto |
| `assets/` | Icono 512×512 y gráfico de funciones 1024×500, ya sin canal alfa |

Lo que **no** está en el paquete, y es a propósito: la clave de firma
(`koberlet-release.jks`) y su contraseña. Ver más abajo.

---

## 1. Lo que hay que decidir entre los dos, antes de subir

### Quién figura como desarrollador

El nombre de la cuenta que sube la app **sale público en la ficha**, y es esa
cuenta la que responde ante Google de lo que hace la app. Si la sube tu cuenta:

- Koberlet aparecerá publicada a tu nombre, no al de DNNS.es.
- Las políticas de Play te obligan a ti: si Google considera que la app las
  incumple, el aviso, la suspensión o la baja **caen sobre tu cuenta**, no sobre
  la del autor.
- Si tienes otras apps publicadas en esa cuenta, una sanción por esta puede
  arrastrarlas.

Eso no es motivo para no hacerlo, pero sí para saberlo antes. Koberlet es un
monedero de criptomonedas: es una categoría que Google mira con lupa. Lee el
punto 3 antes de aceptar.

### La clave de firma — esto no tiene marcha atrás

La app ya se reparte por otro canal (`descargas.dnns.es`) firmada con la clave
de DNNS.es. Android solo deja instalar una app encima de otra si van firmadas
con la **misma** clave.

Al crear la app, la Consola activa Play App Signing y por defecto **genera una
clave nueva de Google**. Si se acepta eso:

- El APK que instale Play y el que la gente tenga de `descargas.dnns.es` serán
  **incompatibles**.
- Quien tenga uno no podrá pasarse al otro sin desinstalar, y **desinstalar
  borra la bóveda con las claves del monedero**.

Hay dos salidas, y hay que elegirla **al crear la app**, no después:

1. **Que Play use la clave de DNNS.es.** En la Consola:
   *Configuración → Firma de aplicaciones → «Exportar y subir una clave desde un
   almacén de claves Java»*. Requiere que el autor procese el keystore con la
   herramienta PEPK que la propia Consola facilita. **El keystore no se envía
   por correo ni por mensajería**: lo procesa el autor en su máquina y lo que
   viaja es el fichero cifrado que genera PEPK, con la clave de cifrado que da
   la Consola.

2. **Aceptar la clave de Google** y asumir que los dos canales quedan separados
   para siempre. Si se elige esto, hay que avisarlo en la web de descargas para
   que nadie pierda una bóveda intentando cambiarse de canal.

Habladlo antes. Cambiar de idea después no es posible.

---

## 2. El bundle ya cumple lo técnico

Comprobado sobre el binario, no sobre el código fuente:

- Es un `.aab`, no un APK. 6,3 MB.
- `targetSdk` **36**, que es lo que Google exige desde el 31/08/2026.
- Permisos que declara: `INTERNET`, `CAMERA`, `USE_BIOMETRIC`, `USE_FINGERPRINT`.
  Ninguno más.
- **No** declara `REQUEST_INSTALL_PACKAGES` y **no** contiene código de
  autoactualización. La versión que se reparte por la web del autor sí lo hace
  —Play no lo permite—, así que para la tienda se compila una variante distinta
  donde ese código no existe. Si lo miras, no está: ni el permiso, ni la clase
  en el dex, ni la URL en el JavaScript.
- Va firmado con la clave de release del autor (RSA 4096, válida hasta 2056).
  Esa firma sirve como clave de subida aunque luego Play firme con otra.

## 3. Lo que puede hacer que la rechacen — léelo antes de aceptar

Es información honesta, no un trámite. Si vas a poner tu cuenta, decide con esto
delante.

### Es un monedero de criptomonedas

Google tiene política específica para esto. Un monedero **no custodial** (las
claves las tiene el usuario en su móvil, no hay servidor que guarde fondos) está
permitido y no necesita licencia. Koberlet es eso, y está declarado así en
`SEGURIDAD-DATOS.md`.

### ⚠️ Pero la app incluye intercambio, puente y compras programadas

Y esto es lo que hay que decidir. Google clasifica como **exchange de
criptomonedas** las apps que permiten intercambiar cripto, y a esas les exige
acreditar registro ante la autoridad competente (en España, el registro de
proveedores de servicios de criptoactivos, MiCA/CASP). Eso es un trámite de
empresa, no algo que se aporte con una cuenta personal.

Hay argumento razonable para sostener que Koberlet no es un exchange: no custodia
fondos, no casa órdenes, y el intercambio lo ejecuta un contrato público en la
cadena; la app solo firma. Pero **lo decide el revisor**.

Las dos opciones:

| | Enviar completo | Enviar solo-monedero |
|---|---|---|
| Qué lleva | Todo: swap, puente, DCA | Guardar, enviar, recibir |
| Riesgo | Si el revisor lo ve como exchange: rechazo. Y si considera que la declaración financiera era incorrecta, puede ir contra la cuenta | Bajo: es el caso que Google acepta sin discusión |
| Coste | Ninguno, ya está hecho | El autor tiene la separación por canales montada; recortar es rápido |

**El bundle de este paquete es el completo, con swaps.** Si prefieres la versión
recortada, pídesela al autor antes de subir nada.

### Lo demás

- **Público objetivo: mayores de 18**. Es lo que corresponde a una app financiera
  y evita que caiga bajo la Política de Familias.
- **Categoría: Finanzas.** No la pongas en "Herramientas" para esquivar los
  controles: Google reclasifica y eso cuenta como tergiversación.
- **Nada de reclamos de rentabilidad** en la ficha ni en las capturas. Los textos
  de `FICHA.md` ya están escritos con ese cuidado.

## 4. Lo que todavía falta

- **Capturas de pantalla.** Mínimo 2, y no se pueden generar desde el ordenador:
  hay que hacerlas con la app en un móvil. Instrucciones en `CAPTURAS.md`.
  Importante: que no salgan direcciones reales con saldo ni frases de
  recuperación.
- **El correo de contacto** de la ficha: hay que poner uno.
- **La decisión sobre los swaps** (punto 3).

## 5. La prueba cerrada, según cómo sea tu cuenta

Si tu cuenta de desarrollador es **personal y se creó después de noviembre de
2023**, Google exige antes de producción: 12 testers reales, en dispositivos
físicos, 14 días seguidos. Si alguno se sale, el contador vuelve a empezar.

Si tu cuenta es **de organización**, o **personal pero anterior a esa fecha**,
ese requisito **no se aplica** y se puede ir a producción directamente. Eso
ahorra tres semanas largas, y es la razón principal por la que tiene sentido que
la subas tú.

Míralo en la Consola antes de planificar nada.

## 6. Orden sugerido

1. Hablar los dos puntos del apartado 1: **de quién es la cuenta** y **qué clave
   de firma se usa**.
2. Decidir lo de los swaps (punto 3).
3. Pedir las capturas al autor, o hacerlas.
4. Crear la app en la Consola — y ahí, **antes de nada**, configurar la firma
   como se haya decidido.
5. Rellenar ficha (`FICHA.md`), Seguridad de los Datos (`SEGURIDAD-DATOS.md`),
   clasificación y declaración de app financiera.
6. Subir el `.aab` a prueba cerrada o a producción, según el punto 5.

---

## Contacto

Cualquier duda técnica sobre el bundle o el código, al autor: DNNS.es
(Oberluss). El código es abierto (Apache 2.0) y se puede leer entero, incluida
la parte que maneja las claves.
