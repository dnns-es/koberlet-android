// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// CAPA DE RED - Fase 1 del portado.
//
// En Electron el fetch salia desde Node: sin CORS y con control total del tiempo
// de espera. En un WebView manda el navegador, asi que aqui se centraliza TODA la
// salida a la red con dos caminos:
//
//   - En el movil: CapacitorHttp, que hace la peticion en Java. No pasa por CORS
//     y permite fijar el tiempo de espera de verdad.
//   - En el navegador (desarrollo): fetch normal con AbortController.
//
// Deliberadamente NO se activa el parche global de fetch de Capacitor
// (`CapacitorHttp: { enabled: true }`). Ese parche reemplaza window.fetch para
// toda la app, incluidas las librerias de terceros: ethers hace sus propias
// peticiones y el fetch parcheado no respeta ni `signal` ni las respuestas por
// trozos. Mejor una funcion explicita que se ve en el codigo y se puede auditar.

import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Tiempo maximo de una peticion. El nodo Chainweb suele contestar en menos de un
// segundo; 20 s es margen de sobra para una red movil mala sin dejar la app colgada.
const ESPERA_MS = 20000;

// --- Cuantas peticiones pueden ir en el aire A LA VEZ -----------------------
//
// Lanzarlas todas de golpe no es mas rapido: es MUCHO mas lento y ademas pierde
// respuestas. El panel pide el saldo de KDA en las 20 chains y el de cada token
// de la red en las 20: con los dos de fabrica son 60 peticiones simultaneas.
// Medido contra api.chainweb-community.org el 17/09/2026, las mismas 60:
//
//      4 a la vez -> 2,6 s, 0 fallos      10 a la vez ->  1,8 s, 0 fallos
//      6 a la vez -> 1,3 s, 0 fallos      16 a la vez ->  0,7 s, 0 fallos
//      8 a la vez -> 1,1 s, 0 fallos      60 a la vez -> 10,4 s, 6 FALLOS
//
// De 4 a 16 va fino; a 60 se desploma. Algo delante del nodo penaliza al cliente
// que abre demasiadas conexiones a la vez, y de ahi salian las dos quejas que
// se veian en el movil: que el saldo tardaba una eternidad y que «siempre falla
// alguna chain». Una chain que no contesta no se pinta como cero -eso ya estaba
// bien resuelto- pero si como «faltan chains por contestar», que asusta y encima
// era culpa nuestra.
//
// Esto NO estaba roto en la app y luego se arreglo: las 60 peticiones se hacian
// desde el primer commit. Lo que cambio fue el nodo, que antes aguantaba el
// aluvion. Por eso el limite se pone aqui, en el unico sitio por donde sale todo,
// en vez de en quien llama: asi tambien queda protegido lo que se escriba manana.
//
// 8 y no 16 a proposito: 16 fue lo mas rapido en la prueba, pero esta mas cerca
// del escalon y no se sabe donde cae exactamente ni si es el mismo en otro nodo.
// La diferencia entre 8 y 16 son cuatro decimas; la diferencia entre acertar y
// pasarse son diez segundos y respuestas perdidas.
const A_LA_VEZ = 8;

let enElAire = 0;
const cola = [];

async function pedirTurno() {
    if (enElAire < A_LA_VEZ) { enElAire++; return; }
    await new Promise((seguir) => cola.push(seguir));
    // Al despertar el hueco ya viene contado: quien lo solto nos lo cedio sin
    // pasar por cero, que si no se colaria otro entre medias.
}

function soltarTurno() {
    const siguiente = cola.shift();
    if (siguiente) siguiente();
    else enElAire--;
}

/** ¿Corremos dentro del APK (true) o en el navegador de desarrollo (false)? */
export function esNativo() {
    return Capacitor.isNativePlatform();
}

/** Nombre del camino de red en uso, para poder ENSEÑARLO en pantalla y no suponerlo. */
export function caminoRed() {
    return esNativo() ? 'CapacitorHttp (nativo, sin CORS)' : 'fetch del navegador (sujeto a CORS)';
}

/**
 * POST de JSON. Devuelve { status, texto, ms } con el cuerpo SIN parsear.
 *
 * Se devuelve texto a proposito: Chainweb contesta texto plano -no JSON- cuando
 * rechaza un comando ("One or more of the following errors occurred: ..."), y si
 * aqui se hiciera .json() ese motivo se perderia tras un "Unexpected token".
 */
export async function postJson(url, cuerpo, opciones = {}) {
    await pedirTurno();
    try {
        return await postJsonSinCola(url, cuerpo, opciones);
    } finally {
        // En el finally y no al terminar bien: un hueco que no se suelta porque
        // la peticion fallo deja la cola atascada para siempre.
        soltarTurno();
    }
}

async function postJsonSinCola(url, cuerpo, { esperaMs = ESPERA_MS } = {}) {
    const t0 = performance.now();
    const body = JSON.stringify(cuerpo);

    if (esNativo()) {
        const res = await CapacitorHttp.request({
            method: 'POST',
            url,
            headers: { 'Content-Type': 'application/json' },
            data: body,
            // El plugin parsea solo si el servidor dice JSON; con 'text' mandamos
            // siempre el cuerpo crudo y lo interpretamos nosotros.
            responseType: 'text',
            connectTimeout: esperaMs,
            readTimeout: esperaMs,
        });
        const texto = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        return { status: res.status, texto, ms: Math.round(performance.now() - t0) };
    }

    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), esperaMs);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: corte.signal,
        });
        const texto = await res.text();
        return { status: res.status, texto, ms: Math.round(performance.now() - t0) };
    } catch (e) {
        if (e && e.name === 'AbortError') throw new Error(`El nodo no contesto en ${esperaMs / 1000} s.`);
        throw e;
    } finally {
        clearTimeout(reloj);
    }
}

/**
 * GET de texto. Devuelve { status, texto, ms }.
 *
 * Hace falta aparte del POST porque en el Koberlet de escritorio habia un fichero
 * -lib/nft.js- que hablaba HTTP a mano con `require('https')`: eso no existe en un
 * WebView. Todo lo que ahi pedia por su cuenta (metadatos de piezas, pasarelas
 * ipfs, el historial de kdaindex) pasa por aqui cuando se porte.
 */
export async function getTexto(url, opciones = {}) {
    await pedirTurno();
    try {
        return await getTextoSinCola(url, opciones);
    } finally {
        soltarTurno();
    }
}

async function getTextoSinCola(url, { esperaMs = ESPERA_MS } = {}) {
    const t0 = performance.now();

    if (esNativo()) {
        const res = await CapacitorHttp.request({
            method: 'GET',
            url,
            responseType: 'text',
            connectTimeout: esperaMs,
            readTimeout: esperaMs,
        });
        const texto = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        return { status: res.status, texto, ms: Math.round(performance.now() - t0) };
    }

    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), esperaMs);
    try {
        const res = await fetch(url, { signal: corte.signal });
        const texto = await res.text();
        return { status: res.status, texto, ms: Math.round(performance.now() - t0) };
    } catch (e) {
        if (e && e.name === 'AbortError') throw new Error(`El servidor no contesto en ${esperaMs / 1000} s.`);
        throw e;
    } finally {
        clearTimeout(reloj);
    }
}

/** GET devolviendo JSON ya parseado. */
export async function getJson(url, opciones) {
    const { status, texto, ms } = await getTexto(url, opciones);
    try {
        return { json: JSON.parse(texto), status, ms };
    } catch (_) {
        const limpio = String(texto).replace(/\s+/g, ' ').trim().slice(0, 220);
        throw new Error(`El servidor respondio HTTP ${status} con algo que no es JSON: ${limpio}`);
    }
}

/**
 * Igual que postJson pero devolviendo el objeto ya parseado.
 * Si el cuerpo no es JSON, lanza con el texto del nodo recortado: ese texto es
 * justo el motivo del rechazo y es lo unico util para diagnosticar.
 */
export async function postJsonParseado(url, cuerpo, opciones) {
    const { status, texto, ms } = await postJson(url, cuerpo, opciones);
    try {
        return { json: JSON.parse(texto), status, ms };
    } catch (_) {
        const limpio = String(texto).replace(/\s+/g, ' ').trim().slice(0, 220);
        throw new Error(`El nodo respondio HTTP ${status} con algo que no es JSON: ${limpio}`);
    }
}
