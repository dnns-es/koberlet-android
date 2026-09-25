// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// COMO SE ESCRIBEN LAS CANTIDADES.
//
// Un solo sitio para esto: si cada pantalla formatea a su manera, la misma
// cantidad sale distinta en dos sitios y el dueño se queda sin saber cual es la
// buena. Eso, en un monedero, es de las cosas que mas confianza quitan.

import { locale } from './idioma.js';

/** Un numero tal cual, con los decimales que le quepan. */
export function formatea(n, decimales = 8) {
    return Number(n).toLocaleString(locale(), { maximumFractionDigits: decimales });
}

/**
 * Una cantidad para enseñar: 5 decimales como mucho.
 *
 * Se RECORTA, no se redondea. Redondear hacia arriba enseñaria mas de lo que hay
 * -9,999999 saldria como 10- y esa es la unica direccion que no se puede permitir
 * un monedero: nadie tiene que descubrir al firmar que no le llega.
 *
 * Y lo que no alcanza el ultimo decimal que se enseña sale como `< 0,00001`, no
 * como `0`: decir cero cuando hay algo es la otra forma de mentir.
 */
export function recorta(n, decimales = 5) {
    const x = Number(n);
    if (!isFinite(x)) return formatea(x);
    const paso = Math.pow(10, decimales);
    // El `toPrecision(15)` quita el ruido de la coma flotante antes de cortar:
    // 0,0003 × 100000 da 29,999999999999996 y, sin esto, 0,0003 kb-ETH se pintaba
    // «0,00029». Con los importes del DCA de kb-ETH (mínimo 0,0004) se veía.
    const cortado = Math.floor(Number((Math.abs(x) * paso).toPrecision(15))) / paso;
    if (x > 0 && cortado === 0) return '< ' + formatea(1 / paso, decimales);
    return formatea(x < 0 ? -cortado : cortado, decimales);
}
