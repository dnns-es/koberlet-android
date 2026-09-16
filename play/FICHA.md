# Ficha de Google Play — Koberlet

Textos listos para pegar en la Consola de Play, en **Presencia en Play → Ficha
de Play principal**. Cada bloque lleva su cuenta de caracteres: los límites los
impone Google y no deja guardar si te pasas ni por uno.

Versión de referencia: **0.52.2** · Idioma principal: **Español (España)**

> Si cambias un texto aquí, cámbialo también en la Consola. Este fichero es el
> original; la Consola es una copia. Al revés se pierde el rastro de qué se
> mandó exactamente en cada revisión.

---

## Nombre de la aplicación

Límite: **30 caracteres**.

```
Koberlet · Monedero Kadena
```

26 caracteres. ✅

Alternativa si se prefiere sin el punto medio (18 caracteres):

```
Koberlet Monedero
```

---

## Descripción breve

Límite: **80 caracteres**. Es lo que se lee en los listados y en las búsquedas,
antes de entrar en la ficha.

```
Monedero no custodial de Kadena y EVM. Tus claves se quedan en tu móvil.
```

72 caracteres. ✅

---

## Descripción completa

Límite: **4000 caracteres**. Esta ocupa 2.310.

```
Koberlet es un monedero de criptomonedas no custodial para Kadena (KDA) y redes
compatibles con EVM. No custodial quiere decir lo que parece: las claves se
crean en tu aparato, se quedan en tu aparato y nadie más las tiene. Ni DNNS.es,
ni el desarrollador, ni ningún servidor. Si pierdes tu frase de recuperación,
nadie puede devolvértela.

QUÉ HACE

• Crea un monedero nuevo o recupera uno que ya tengas con tu frase de 12 o 24
  palabras.
• Consulta tus saldos en las distintas chains de Kadena y en redes EVM.
• Envía y recibe KDA y tokens.
• Cobra con un código QR: lo enfocas con la cámara y la app rellena los datos.
• Lee direcciones con la cámara para no teclearlas a mano.
• Ve el valor en euros o dólares, y el historial de lo que has movido.
• Exporta una copia de seguridad cifrada de tu monedero.

DÓNDE SE GUARDAN LAS CLAVES

En una bóveda dentro del propio teléfono, cifrada con tu contraseña. El cifrado
y la firma de las operaciones no los hace la parte web de la app: los hace un
módulo nativo escrito para eso, y las claves no salen de ahí ni siquiera para
firmar. La pantalla nunca ve una clave privada.

Puedes abrir la bóveda con tu huella o tu cara si tu móvil lo permite. La copia
de seguridad automática de Android está desactivada a propósito: no queremos que
tu bóveda acabe subida a una cuenta de Google sin que lo hayas pedido.

QUÉ NO HACE

• No tiene cuentas de usuario ni registro. No hay que dar un correo.
• No recoge datos tuyos. No lleva telemetría, ni analítica, ni publicidad.
• No guarda tus claves en ningún servidor, porque no las tiene.
• No compra ni vende criptomonedas por ti, y no es un servicio de inversión.
• No promete rendimientos. Las criptomonedas pueden perder todo su valor.

CÓDIGO ABIERTO

Koberlet es software libre con licencia Apache 2.0. El código está publicado y
se puede leer entero, incluida la parte que maneja las claves. En un monedero,
poder comprobar lo que hace el programa no es un extra: es el único motivo
razonable para confiarle dinero.

AVISO

Guardar criptomonedas es tu responsabilidad. Apunta tu frase de recuperación en
papel y guárdala fuera del móvil. Si pierdes el aparato y la frase, el dinero se
pierde: no hay forma de recuperarlo y nadie puede hacerlo por ti.

Desarrollado por DNNS.es.
```

---

## Datos de contacto

Obligatorios en la ficha.

| Campo | Valor |
|---|---|
| Correo electrónico | (poner el de contacto público de DNNS.es) |
| Sitio web | `https://descargas.dnns.es/koberlet/politicas.html` |
| Política de privacidad | **`https://descargas.dnns.es/koberlet/politicas.html`** |

> ✅ **Resuelto el 16/09/2026.** La política estaba en
> `…/kob7t2m9x4/politicas.html`, con el segmento aleatorio que venía de tener las
> descargas poco a la vista. Para una ficha pública quedaba raro y ataba la
> política a una ruta pensada para otra cosa.
>
> Ahora el fichero vive en `/koberlet/politicas.html`, y **la dirección antigua
> sigue funcionando**: se ha dejado como enlace al mismo fichero, porque las
> versiones de la app ya instaladas la llevan escrita dentro y romperles el
> enlace a las políticas sería peor que la URL fea. Un solo fichero, dos
> direcciones: no pueden divergir.
>
> El directorio no se lista (`autoindex off`), así que la ruta nueva no deja a la
> vista nada de `kob7t2m9x4`.
>
> **Requisito que no se puede descuidar:** la URL tiene que seguir respondiendo
> sin contraseña mientras la app esté publicada. Google la comprueba de vez en
> cuando y una política caída es motivo de retirada.

---

## Categoría y etiquetas

| Campo | Valor |
|---|---|
| Tipo de aplicación | Aplicación |
| Categoría | **Finanzas** |
| Etiquetas | Criptomonedas, Monedero, Finanzas personales |

No marcar la app como "Herramientas" para esquivar los controles de finanzas:
Google reclasifica, y una categoría puesta para despistar cuenta como
tergiversación.

---

## Elementos gráficos

Están en `play/assets/`, generados con `node herramientas/assets-play.js`.

| Elemento | Fichero | Medidas | Estado |
|---|---|---|---|
| Icono | `icono-512.png` | 512×512, PNG sin alfa | ✅ generado |
| Gráfico de funciones | `grafico-funciones-1024x500.png` | 1024×500, sin alfa | ✅ generado |
| Capturas de teléfono | — | mín. 2, máx. 8 | ⏳ **faltan** |

Las capturas hay que hacerlas en el móvil de verdad. Ver `CAPTURAS.md`.
