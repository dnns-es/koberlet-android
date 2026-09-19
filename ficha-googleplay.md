# Koberlet — ficha de Google Play

Los textos que hay publicados en la ficha de Google Play, tal cual los sirve la API el
19/09/2026.

**Por qué se guardan aquí y no solo en la Play Console.** Dentro de la consola de Google no se
pueden comparar con la versión anterior, ni recuperar si alguien los pisa, ni revisar sin
entrar. Aquí sí, y además el cambio queda en el historial de git junto al código que describe.

Idioma principal: **es-ES**. Es el único que hay: no hay ficha en inglés.

El protocolo común de publicación está en `_control/PROTOCOLO.md`.

---

## Título (26 de 30 caracteres)

```
Koberlet · Monedero Kadena
```

## Descripción corta (72 de 80)

Es lo que se lee en la lista de resultados, antes de entrar. Dice lo único que de verdad
distingue a Koberlet de las demás: que las claves no las tiene nadie más.

```
Monedero no custodial de Kadena y EVM. Tus claves se quedan en tu móvil.
```

## Descripción larga (2272 de 4000)

```
Koberlet es un monedero de criptomonedas no custodial para Kadena (KDA) y redes compatibles con EVM. No custodial quiere decir lo que parece: las claves se crean en tu aparato, se quedan en tu aparato y nadie más las tiene. Ni DNNS.es, ni el desarrollador, ni ningún servidor. Si pierdes tu frase de recuperación, nadie puede devolvértela.

QUÉ HACE

• Crea un monedero nuevo o recupera uno que ya tengas con tu frase de 12 o 24 palabras.
• Consulta tus saldos en las distintas chains de Kadena y en redes EVM.
• Envía y recibe KDA y tokens.
• Cobra con un código QR: lo enfocas con la cámara y la app rellena los datos.
• Lee direcciones con la cámara para no teclearlas a mano.
• Ve el valor en euros o dólares, y el historial de lo que has movido.
• Exporta una copia de seguridad cifrada de tu monedero.

DÓNDE SE GUARDAN LAS CLAVES

En una bóveda dentro del propio teléfono, cifrada con tu contraseña. El cifrado y la firma de las operaciones no los hace la parte web de la app: los hace un módulo nativo escrito para eso, y las claves no salen de ahí ni siquiera para firmar. La pantalla nunca ve una clave privada.

Puedes abrir la bóveda con tu huella o tu cara si tu móvil lo permite. La copia de seguridad automática de Android está desactivada a propósito: no queremos que tu bóveda acabe subida a una cuenta de Google sin que lo hayas pedido.

QUÉ NO HACE

• No tiene cuentas de usuario ni registro. No hay que dar un correo.
• No recoge datos tuyos. No lleva telemetría, ni analítica, ni publicidad.
• No guarda tus claves en ningún servidor, porque no las tiene.
• No compra ni vende criptomonedas por ti, y no es un servicio de inversión.
• No promete rendimientos. Las criptomonedas pueden perder todo su valor.

CÓDIGO ABIERTO

Koberlet es software libre con licencia Apache 2.0. El código está publicado y se puede leer entero, incluida la parte que maneja las claves. En un monedero, poder comprobar lo que hace el programa no es un extra: es el único motivo razonable para confiarle dinero.

AVISO

Guardar criptomonedas es tu responsabilidad. Apunta tu frase de recuperación en papel y guárdala fuera del móvil. Si pierdes el aparato y la frase, el dinero se pierde: no hay forma de recuperarlo y nadie puede hacerlo por ti.

Desarrollado por DNNS.es.
```

---

## Datos de contacto de la ficha

| Campo | Valor |
|---|---|
| Sitio web | `https://descargas.dnns.es/koberlet/politicas.html` |
| Correo | `oberdnns@gmail.com` |
| Idioma por defecto | `es-ES` |

La misma política responde también en `https://koberlet.dnns.es/politicas.html`. Las dos
direcciones dan 200; la que ve el usuario en Play es la primera.

---

## Lo que NO se toca aquí

Estas casillas se rellenan en la Play Console y tienen consecuencias que no se deshacen:

- **«Mercado de criptomonedas»** en la declaración financiera: **no se marca nunca**. Obliga a
  licencias que no tenemos.
- **Exención de restricción geográfica**: **no se marca nunca**.
- El **`versionCode`** no puede bajar jamás. Un número puesto por error se queda puesto.

El razonamiento completo está en `_control/PROTOCOLO.md`.
