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
export async function postJson(url, cuerpo, { esperaMs = ESPERA_MS } = {}) {
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
export async function getTexto(url, { esperaMs = ESPERA_MS } = {}) {
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
