// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// MONEDA DE REFERENCIA.
//
// La moneda del mundo en la que se enseña lo que valen las cosas: el total del
// Panel y el conversor de la pantalla de Recibir. NO es la moneda en la que se
// mueve el dinero -eso siempre es KDA- sino la vara de medir de quien mira.
//
// Por defecto el euro, que es donde vive quien usa esto. Se cambia en Ajustes.
//
// Añadir una moneda es una linea en MONEDAS: CoinGecko las devuelve todas en la
// misma llamada, asi que no cuesta ni una peticion mas.

const LLAVE = 'koberlet.moneda';

// El codigo es el de CoinGecko (minusculas) Y el de ISO 4217 (mayusculas), que
// por suerte coinciden.
//
// Aqui NO va el nombre en castellano a proposito. Tendria que pasar por el
// traductor, y llamarlo con una variable -t(MONEDAS[c].nombre)- deja la frase
// fuera del alcance de la prueba que caza traducciones sin pareja inglesa: el
// diccionario acabaria con frases que nadie sabe si se usan. Los nombres se
// escriben literales donde se pintan, que es en Ajustes.
//
// El simbolo es para los sitios donde no cabe el nombre: el desplegable de
// unidad de la pantalla de Recibir, que comparte fila con la cantidad y la
// chain. Va junto al codigo -«EUR €»- porque el simbolo solo no basta: el
// dolar lo usan veinte paises y ahi se esta poniendo un precio.
export const MONEDAS = {
    eur: { iso: 'EUR', simbolo: '€' },
    usd: { iso: 'USD', simbolo: '$' },
    gbp: { iso: 'GBP', simbolo: '£' },
    chf: { iso: 'CHF', simbolo: 'Fr.' },
};

export const CODIGOS = Object.keys(MONEDAS);

/** La elegida: 'eur' | 'usd' | 'gbp' | 'chf'. Euro si no hay nada guardado. */
export function monedaElegida() {
    try {
        const m = localStorage.getItem(LLAVE);
        return CODIGOS.includes(m) ? m : 'eur';
    } catch (_) {
        return 'eur';                                  // navegación privada
    }
}

/** Guarda la elección. Quien la use tiene que repintarse: aquí no se toca el DOM. */
export function fijarMoneda(m) {
    if (!CODIGOS.includes(m)) return;
    try { localStorage.setItem(LLAVE, m); } catch (_) { /* navegación privada */ }
}

/**
 * Una cantidad de dinero del mundo, escrita como se escribe en el idioma que
 * tenga puesta la app: `1.234,56 €` en español, `€1,234.56` en inglés.
 *
 * `idioma` es el locale que da idioma.js. Se pasa en vez de importarlo para que
 * este módulo no dependa del de idioma y se pueda probar suelto.
 */
export function formateaDinero(cantidad, idioma, codigo = monedaElegida()) {
    const iso = (MONEDAS[codigo] || MONEDAS.eur).iso;
    return Number(cantidad).toLocaleString(idioma, { style: 'currency', currency: iso });
}

/**
 * Un PRECIO, que no es un importe. Un importe se paga y se redondea a céntimos;
 * un precio puede valer mucho menos que un céntimo, y ahí «0,00 € por KDA» no
 * informa de nada -es justo el dato que se estaba dando-. Se le dan decimales
 * hasta que enseñe cuatro cifras con contenido: 0,004601 € en vez de 0,00 €.
 */
export function formateaPrecio(precio, idioma, codigo = monedaElegida()) {
    const n = Number(precio);
    const iso = (MONEDAS[codigo] || MONEDAS.eur).iso;
    if (!isFinite(n) || n <= 0) return formateaDinero(0, idioma, codigo);
    const dec = n >= 1 ? 2 : Math.min(12, 3 - Math.floor(Math.log10(n)));
    return n.toLocaleString(idioma, {
        style: 'currency',
        currency: iso,
        minimumFractionDigits: 2,
        maximumFractionDigits: Math.max(2, dec),
    });
}

/**
 * Cuántos KDA son `dinero` de la moneda elegida, al precio dado.
 *
 * Devuelve null si no se puede saber -sin precio, o con un precio que no es un
 * número mayor que cero- en vez de un 0 o un Infinity. Aquí eso importa más de
 * lo normal: esta cifra acaba dentro de un código QR que alguien va a pagar, y
 * un 0 convertido en cobro es un cobro que no pide nada.
 */
export function aKda(dinero, precioUnidad) {
    const d = Number(dinero);
    const p = Number(precioUnidad);
    if (!isFinite(d) || d <= 0) return null;
    if (!isFinite(p) || p <= 0) return null;
    return d / p;
}

/** Lo contrario: lo que valen unos KDA. null por los mismos motivos. */
export function aDinero(kda, precioUnidad) {
    const k = Number(kda);
    const p = Number(precioUnidad);
    if (!isFinite(k) || k <= 0) return null;
    if (!isFinite(p) || p <= 0) return null;
    return k * p;
}
