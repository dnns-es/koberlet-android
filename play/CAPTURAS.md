# Capturas de pantalla para la ficha

Es lo único de la ficha que no se puede generar desde el ordenador: tienen que
salir de la app corriendo en un móvil. Play pide **mínimo 2 y máximo 8**.

## Requisitos de Google

| Requisito | Valor |
|---|---|
| Formato | PNG o JPEG |
| Lado menor | mínimo 320 px |
| Lado mayor | máximo 3840 px |
| Proporción | entre 16:9 y 9:16 |
| Cantidad | 2 a 8 (con menos de 2, la ficha no se puede publicar) |

Una captura normal de un móvil actual (por ejemplo 1080×2400) cumple todo sin
tocar nada. **No hay que quitarles el canal alfa**: eso solo lo exigen el icono
y el gráfico de funciones.

## Cuáles hacer, y en qué orden

El orden importa: en la ficha se ven de izquierda a derecha y la primera es la
que sale en el listado.

1. **Panel con saldos.** Es la pantalla que explica de qué va la app de un
   vistazo.
2. **Enviar**, con el resumen de la operación antes de firmar. Enseña que hay una
   confirmación de verdad antes de que se mueva nada.
3. **Recibir / QR de cobro.** Se entiende sin leer nada.
4. **Desbloqueo con huella.** Comunica la seguridad mejor que cualquier frase.
5. **Info / políticas.** Enseña que la app dice lo que hace y lo que no.

Con las dos primeras basta para publicar. Las otras tres suman.

## Cómo hacerlas

Con la app instalada desde `descargas.dnns.es` (el canal directo), que es idéntica
en pantallas a la de Play:

```bash
F:\APP\_tools\Android\Sdk\platform-tools\adb.exe exec-out screencap -p > play/assets/captura-1.png
```

O la captura normal del móvil (bajar volumen + encendido) y pasarlas después.

## Antes de subirlas: mirar qué sale en la pantalla

Esto es lo importante y es fácil olvidarlo. Una captura de un monedero enseña
cosas que no deberían quedar publicadas para siempre en una tienda:

- **Nada de direcciones reales tuyas con saldo.** Quien las vea puede seguir en
  la cadena todo lo que has movido, para siempre. Usa un monedero de pruebas.
- **Nada de frases de recuperación.** Ni un trozo, ni borroso. No hagas captura
  de esa pantalla.
- **Saldos inventados o de pruebas**, no los de verdad.
- **Ojo a la barra de estado**: hora, notificaciones, nombre de la operadora.
  Activa el modo avión o limpia las notificaciones antes.

> Las capturas de la ficha no se pueden "despublicar" del todo: quedan cacheadas
> y reproducidas por sitios que copian fichas de Play. Trátalas como algo
> definitivo.

## Gráfico destacado y vídeo

Opcionales. El **gráfico de funciones** (1024×500) ya está hecho en
`assets/grafico-funciones-1024x500.png`. El vídeo de YouTube no hace falta y, en
una app financiera, es una superficie más donde un reclamo mal medido puede dar
problemas. Sin vídeo, de momento.
