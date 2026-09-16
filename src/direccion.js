// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// COMO SE ENSEÑA UNA DIRECCION ACORTADA, EN TODA LA APP.
//
// Habia cuatro versiones de esto repartidas por las pantallas -unas cortaban por
// 12 y 6, otras por 10 y 6- y el resultado era que la MISMA cuenta se veia
// distinta segun donde se mirara. En un monedero eso no es un detalle estetico:
// uno compara direcciones a ojo para saber si esta mandando a donde cree, y para
// poder compararlas tienen que estar siempre cortadas por el mismo sitio.
//
// Forma unica: prefijo + 6 caracteres + … + 4 caracteres.
//
//   k:d0439ab3…fc4f          0x9858…7a12
//
// El prefijo (`k:`, `0x`, `w:`, `c:`…) se respeta porque dice de que tipo es la
// cuenta, y perderlo cambiaria lo que se esta leyendo.

const DELANTE = 6;
const DETRAS = 4;

/**
 * La direccion tal y como se enseña en pantalla.
 *
 * Si es tan corta que acortarla no ahorra nada, se devuelve entera: es mejor
 * verla completa que ver puntos suspensivos en una cuenta de diez letras.
 */
export function corta(direccion) {
    const d = String(direccion || '');
    const m = /^(0x|[A-Za-z]:)/.exec(d);
    const prefijo = m ? m[1] : '';
    const cuerpo = d.slice(prefijo.length);
    if (cuerpo.length <= DELANTE + DETRAS + 1) return d;
    return prefijo + cuerpo.slice(0, DELANTE) + '…' + cuerpo.slice(-DETRAS);
}
