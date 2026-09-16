// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// Unico polyfill de Node que necesita la app. Va en un modulo aparte y se importa
// EL PRIMERO porque los `import` se ejecutan antes que el cuerpo del modulo que los
// declara: si lo pusieramos dentro del punto de entrada, las librerias se cargarian
// antes de que Buffer existiera y algunas lo capturan al cargarse.
import { Buffer } from 'buffer';

// --- Por que hay codigo aqui y no solo una asignacion ----------------------
//
// El paquete 'buffer' de npm (la implementacion para navegador) NO soporta la
// codificacion 'base64url'. Node la anadio en la v15.7; la version de navegador
// se quedo atras y lanza "Unknown encoding: base64url".
//
// Para Kadena eso no es un detalle menor: el hash blake2b de cada comando firmado
// viaja en base64url, y lo mismo las firmas post-cuanticas SLH-DSA. Verificado en
// la Fase 0: sin esto fallan la firma, el hash y toda llamada al nodo.
//
// Se anade la codificacion al propio Buffer en vez de reescribir las librerias
// porque lib/*.js es codigo COMPARTIDO con el Koberlet de escritorio: si aqui
// cambiaramos las llamadas, las dos versiones divergirian y cada arreglo habria
// que hacerlo dos veces.

const esB64Url = (enc) => typeof enc === 'string' && enc.toLowerCase() === 'base64url';

// base64 estandar -> base64url: cambia el alfabeto y quita el relleno.
const aUrl = (s) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// base64url -> base64 estandar: alfabeto de vuelta y relleno restituido.
const deUrl = (s) => {
    const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
    return t + '='.repeat((4 - (t.length % 4)) % 4);
};

if (!Buffer.__base64urlParcheado) {
    const toStringOrig = Buffer.prototype.toString;
    Buffer.prototype.toString = function (enc, ...resto) {
        if (esB64Url(enc)) return aUrl(toStringOrig.call(this, 'base64'));
        return toStringOrig.call(this, enc, ...resto);
    };

    const fromOrig = Buffer.from.bind(Buffer);
    Buffer.from = function (valor, enc, ...resto) {
        if (esB64Url(enc) && typeof valor === 'string') return fromOrig(deUrl(valor), 'base64');
        return fromOrig(valor, enc, ...resto);
    };

    const isEncodingOrig = Buffer.isEncoding.bind(Buffer);
    Buffer.isEncoding = (enc) => (esB64Url(enc) ? true : isEncodingOrig(enc));

    Buffer.__base64urlParcheado = true;
}

if (!globalThis.Buffer) globalThis.Buffer = Buffer;

export { Buffer };
