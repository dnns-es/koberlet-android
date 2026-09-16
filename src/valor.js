// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LO QUE SABEMOS QUE VALE, Y LO QUE NO.
//
// Un monedero enseña dos cosas que no se saben igual de bien:
//
//   - CUANTAS unidades tienes. Eso lo dice la cadena y es un hecho.
//   - CUANTO valen. Eso lo dice alguien de fuera, y solo de algunas cosas.
//
// Aqui se decide de que se puede decir el precio con fundamento. La regla es que
// un numero inventado es peor que un hueco: quien mira un total se lo cree, y si
// ese total lleva dentro un precio de adorno esta tomando decisiones con el.
//
// De momento se le pone valor a los tokens PEGADOS AL DOLAR. Un kb-USDC es un
// USDC traido por el puente, y un USDC vale un dolar. PCO, SPT, cBTC y demas no
// tienen un precio que este programa pueda saber -el del pool del mercado no
// vale: ahi cBTC cotiza a 104 KDA- asi que se quedan SIN valor y FUERA del total,
// y el total lo dice en vez de callarselo.
//
// Lo que esto asume, dicho en voz alta: que un kb-USDC se puede canjear por un
// USDC. Es la convencion del mercado, pero el respaldo de esa ruta cuelga de una
// sola llave (hallazgo G2 de la auditoria propia del puente). O sea: es un precio,
// no una garantia.

/**
 * Los que valen un dolar cada uno. El nombre es el que se pinta en la lista de
 * activos: `kb-USDC` para lo puenteado a Kadena, `USDC` y `USDT` en una cuenta de
 * Ethereum.
 */
export const PEGADOS_AL_DOLAR = ['USDC', 'USDT', 'kb-USDC', 'kb-USDT'];

/**
 * Tokens con un precio PUESTO A MANO, en KDA por unidad.
 *
 * Esto es distinto de lo de arriba y por eso va aparte. Un kb-USDC vale un dólar
 * porque es un dólar; el SPT vale 200 KDA porque lo dice su dueño, que es quien lo
 * vende en su propia preventa. Es un precio con fundamento -no hay otro sitio
 * donde mirarlo, el token no cotiza en ningún mercado- pero **no es un precio de
 * mercado**, y quien vea el total tiene derecho a saberlo. Por eso el Panel lo
 * dice con todas las letras cuando cuenta uno de estos.
 *
 * Se cambia aquí y en un solo sitio. Antonio lo fijó en 200 KDA el 14/09/2026 y
 * dijo «de momento», así que este número va a moverse: si el día que se mueva
 * nadie toca esta línea, la app estará enseñando un valor viejo con cara de dato.
 */
export const PRECIO_EN_KDA = {
    SPT: 200,
};

/** ¿De esto sabemos el precio, de donde sea? */
export function tienePrecio(simbolo) {
    const s = String(simbolo);
    return s === 'ETH' || PEGADOS_AL_DOLAR.includes(s) || Object.prototype.hasOwnProperty.call(PRECIO_EN_KDA, s);
}

/** ¿Y ese precio lo hemos puesto nosotros, en vez de leerlo de un mercado? */
export function precioPuestoAMano(simbolo) {
    return Object.prototype.hasOwnProperty.call(PRECIO_EN_KDA, String(simbolo));
}

/**
 * Cuántos euros -o dólares, o lo que esté elegido- vale una cantidad de un token.
 *
 * Devuelve **null cuando no se sabe**, que no es cero: un cero dice «esto no vale
 * nada» y aquí lo cierto es «no lo sé». Quien pinte esto tiene que enseñar las
 * dos cosas distintas.
 *
 * `precio` es lo que devuelve `precioKda()`: trae el KDA en las cuatro monedas,
 * así que el cambio dólar→moneda elegida sale de dividir el precio del KDA por sí
 * mismo en las dos. Sin pedir nada más a nadie.
 */
export function valorDeToken(simbolo, cantidad, precio) {
    const s = String(simbolo);
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n <= 0) return null;

    // El ETH sí cotiza y su precio viene en la misma llamada que el del KDA, así
    // que aquí no hay nada que suponer: o está o no está.
    if (s === 'ETH') {
        const u = precio && precio.eth && Number(precio.eth.unidad);
        return Number.isFinite(u) && u > 0 ? n * u : null;
    }

    // Los que tienen precio puesto a mano se cuentan en KDA, así que basta con el
    // precio del KDA, que ya lo tenemos.
    if (precioPuestoAMano(s)) {
        const enKda = Number(PRECIO_EN_KDA[s]);
        const unidad = precio && Number(precio.unidad);
        if (!Number.isFinite(enKda) || enKda <= 0) return null;
        if (!Number.isFinite(unidad) || unidad <= 0) return null;
        return n * enKda * unidad;
    }

    if (!PEGADOS_AL_DOLAR.includes(s)) return null;
    const porDolar = cambioDesdeDolar(precio);
    if (porDolar === null) return null;
    return n * porDolar;
}

/** Cuánto vale un dólar en la moneda elegida, o null si no se puede saber. */
export function cambioDesdeDolar(precio) {
    if (!precio) return null;
    const enUsd = Number(precio.usd);
    const enLaSuya = Number(precio.unidad);
    if (!Number.isFinite(enUsd) || enUsd <= 0) return null;
    if (!Number.isFinite(enLaSuya) || enLaSuya <= 0) return null;
    return enLaSuya / enUsd;
}
