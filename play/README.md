# play/ — todo lo de Google Play

Carpeta aparte para que nada de la tienda se mezcle con el proyecto. Aquí está el
bundle que se sube, los gráficos de la ficha, los textos y el plan.

**El proyecto no se ha tocado para esto.** La app de siempre —la de
`descargas.dnns.es`— sigue igual, con su actualización dentro, y sigue siendo
donde se prueba cada versión antes de mandarla a ningún sitio.

---

## Qué hay aquí

| Fichero | Qué es |
|---|---|
| `PARA-QUIEN-LO-PUBLIQUE.md` | **Si la sube otra persona desde su cuenta, empieza por aquí.** Lo que hay que acordar antes, y lo que no tiene marcha atrás |
| `PUBLICAR.md` | **Empieza por aquí.** El plan completo, en orden, con lo hecho y lo que falta |
| `FICHA.md` | Los textos de la ficha listos para pegar: título, descripciones, categoría |
| `SEGURIDAD-DATOS.md` | El formulario de Seguridad de los Datos respondido campo por campo |
| `CAPTURAS.md` | Cómo hacer las capturas y qué no debe salir en ellas |
| `bundle/koberlet-0.52.2-play.aab` | El bundle que se sube a la Consola |
| `assets/icono-512.png` | Icono de la ficha, 512×512 sin alfa |
| `assets/grafico-funciones-1024x500.png` | La banda de arriba de la ficha |

---

## Los dos canales

Misma base, mismo código, misma bóveda. Lo único que cambia es por dónde llegan
las versiones nuevas:

```
                    src/  +  plugin Kotlin
                            │
              ┌─────────────┴─────────────┐
              │                           │
      npm run apk:directa          npm run aab:play
              │                           │
      APK firmado                  .aab firmado
              │                           │
   descargas.dnns.es              Google Play
              │                           │
   Se actualiza sola             La actualiza la tienda
   desde la propia app           (Play no permite otra cosa)
              │
   ► Aquí se prueba cada
     versión antes de nada
```

Google Play **prohíbe** que una app descargue código e invoque al instalador. Por
eso la variante `play` se compila sin ese módulo: no es que el botón esté
escondido, es que el código no viaja. Está comprobado sobre el binario, no sobre
el fuente —ver `PUBLICAR.md`, punto 8—.

## Flujo de trabajo

El de siempre, con un paso más al final:

1. Se trabaja y se prueba en local.
2. `npm run apk:directa` → se sube a `descargas.dnns.es` → **se prueba en el
   móvil de verdad**.
3. Cuando esa versión está dada por buena, y solo entonces:
   `npm run aab:play` → se sube a la Consola de Play.

Play va siempre por detrás del canal directo, que es lo que quieres: a la tienda
no llega nada que no haya pasado antes por tu móvil.

## Comandos

```bash
npm run apk:directa                   # APK con actualización propia, para tu web
npm run aab:play                      # bundle para la tienda, sin ella
node herramientas/assets-play.js      # regenera icono y gráfico de la ficha
npm test                              # 9 pruebas estáticas
```

Si alguien se equivoca de canal, el build **para**: Gradle comprueba que los
assets web puestos sean los del canal que se está compilando y, si no cuadran,
falla diciendo qué comando hay que usar. El fallo que evita es silencioso —subir
a la tienda un bundle cuyo JavaScript todavía trae el módulo de descarga— y no se
vería hasta que lo mirase el revisor.

## Lo que falta antes de poder enviar

- **Capturas de pantalla** (mínimo 2). Hay que hacerlas en el móvil → `CAPTURAS.md`
- **Decidir qué se hace con los swaps, el puente y el DCA** → `SEGURIDAD-DATOS.md` §3
- **Crear la cuenta** y verificar identidad → `PUBLICAR.md` §11
- **Subir tu propia clave de firma** al crear la app, no la que genera Google.
  Es irreversible y, si se hace mal, los dos canales dejan de ser compatibles
  para siempre → `PUBLICAR.md` §7
