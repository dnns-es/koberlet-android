// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// TEMA CLARO / OSCURO.
//
// Tres posturas: claro, oscuro y "el del sistema". Por defecto, claro.
//
// El CSS solo tiene dos juegos de colores (`:root` y `:root[data-tema="oscuro"]`).
// Cuando la elección es "el del sistema", quien decide cuál de los dos se pone es
// este fichero, mirando `prefers-color-scheme`. Mantener las variables en un solo
// sitio evita lo de siempre: añadir un color al tema claro y olvidarlo en el
// oscuro, y que alguien acabe con texto blanco sobre fondo blanco.

const LLAVE = 'koberlet.tema';
const VALIDOS = ['claro', 'oscuro', 'sistema'];

// Se guarda el MediaQueryList en el módulo, no se crea uno nuevo en cada llamada:
// uno sin referencia fuerte lo puede recoger el basurero y entonces deja de avisar
// de los cambios, que es justo lo que hacía que la app no se enterara de que el
// móvil había pasado a modo noche.
const media = window.matchMedia('(prefers-color-scheme: dark)');

/** Lo que ha elegido el dueño: 'claro' | 'oscuro' | 'sistema'. */
export function temaElegido() {
    try {
        const t = localStorage.getItem(LLAVE);
        return VALIDOS.includes(t) ? t : 'claro';
    } catch (_) {
        return 'claro';
    }
}

/** El que se está viendo de verdad: 'claro' | 'oscuro'. */
export function temaEfectivo() {
    const e = temaElegido();
    if (e !== 'sistema') return e;
    return media.matches ? 'oscuro' : 'claro';
}

function pintar() {
    const efectivo = temaEfectivo();
    document.documentElement.dataset.tema = efectivo;

    // La barra de estado de Android se tiñe con esto; sin ello queda una franja
    // blanca encima de una app oscura.
    //
    // El color se LEE del tema que acaba de aplicarse, no se repite aquí: si se
    // copiara, el día que alguien retoque el fondo en el CSS tendríamos una barra
    // de estado de un color y una app de otro, y nadie lo relacionaría.
    const color = getComputedStyle(document.documentElement)
        .getPropertyValue('--fondo').trim() || 'transparent';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.append(meta);
    }
    meta.content = color;
}

/** Guarda la elección y la aplica al momento. */
export function fijarTema(t) {
    if (!VALIDOS.includes(t)) return;
    try { localStorage.setItem(LLAVE, t); } catch (_) { /* navegación privada */ }
    pintar();
}

/**
 * Se llama una vez al arrancar. Además queda escuchando el cambio del sistema:
 * si el móvil pasa a modo noche por la tarde y la elección es "el del sistema",
 * la app cambia sola sin tener que reabrirla.
 */
export function arrancarTema() {
    pintar();
    const alCambiar = () => { if (temaElegido() === 'sistema') pintar(); };
    if (media.addEventListener) media.addEventListener('change', alCambiar);
    else if (media.addListener) media.addListener(alCambiar);      // WebView antiguo
}
