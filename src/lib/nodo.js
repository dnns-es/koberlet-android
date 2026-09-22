// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// El unico sitio donde se decide a que nodo de Kadena se le pregunta.
//
// Puerto del lib/kdanodo.js del Koberlet de escritorio (version 2.11.0). Existe
// por lo del 22-09-2026: la app tenia escrito a fuego el nodo publico de la
// comunidad, que esa tarde:
//
//   - tardaba 1.625 ms de mediana en una lectura, con un pico de 12.343 ms,
//     mientras otros dos nodos de la misma cadena contestaban en 81 y 90 ms, y
//   - servia datos VIEJOS: su balanceador tiene al menos un nodo pegado detras y
//     en 1 de cada 10 peticiones contestaba con una altura 19 bloques atrasada,
//     unos diez minutos.
//
// Lo segundo es lo peligroso, y ademas no se ve: un nodo rapido con datos viejos
// te pinta saldos que ya no son, sin dar un solo error. Por eso aqui NO se mide
// solo la latencia: se mide tambien la frescura, y un nodo atrasado se aparta
// aunque sea el mas rapido.
//
// Lo que se ofrece fuera es `mejor()`, que devuelve una URL. Asi los 25 sitios
// que leen `red.nodo` no se enteran de nada: siguen viendo un texto.
//
// Diferencia con el escritorio: aqui la medida sale por `red.js` (CapacitorHttp
// en el APK), no por `fetch` a pelo. Dentro del WebView un fetch a otro dominio
// se lo come el CORS y el tiempo de espera no se respeta.

import { NODOS_KDA } from '../config.js';

// `red.js` se carga cuando hace falta, no al importar este fichero: arrastra
// `@capacitor/core`, que necesita un navegador de verdad, y con eso encima este
// modulo no se podria probar con `node --test`. Lo que se prueba es lo que
// decide -ordenar, apartar al atrasado, la lista- y eso no toca la red.
let _getJson = null;
async function traerGetJson() {
    if (!_getJson) ({ getJson: _getJson } = await import('../red.js'));
    return _getJson;
}

// Cuantos bloques de retraso se le toleran a un nodo antes de apartarlo. La
// cadena 2 saca un bloque cada ~30 s, asi que 3 bloques son minuto y medio: de
// sobra para un desfase normal entre nodos sanos, y muy lejos de los 19 bloques
// que se midieron en el que estaba roto.
export const TOLERANCIA_BLOQUES = 3;

// Lo que se espera a un nodo en la sonda. Corto a proposito: los buenos
// contestan en menos de 150 ms, y aqui no estamos operando, estamos midiendo.
const ESPERA_SONDA_MS = 5000;

// Cada cuanto se vuelve a medir. Un nodo no se pone lento de un segundo para
// otro, y sondear mas a menudo es molestar a tres servidores para nada.
export const CADA_MS = 10 * 60 * 1000;

// La cadena por la que se mide la frescura. Es donde vive todo (Mercatus, el
// puente, el DCA), asi que es la que importa que este al dia.
const CADENA_TESTIGO = '2';

// Los de fabrica viven en config.js, con el resto de la configuracion de red y
// por la misma razon (hallazgo #4 de la auditoria de Alex): la lista esta en el
// CODIGO, no en datos que pueda tocar la interfaz.
export const DE_FABRICA = NODOS_KDA;

export const CLAVE_NODOS = 'koberlet.nodos';

const estado = {
    networkId: 'mainnet01',
    lista: DE_FABRICA.slice(),   // candidatos actuales (fabrica + los que añada el dueño)
    fijo: null,                  // si el dueño elige uno a mano, manda y no se le cambia
    medidas: [],                 // ultima sonda, para enseñarla en Red
    cuando: null,                // cuando se midio
    elegido: DE_FABRICA[0],      // el que se esta usando ahora mismo
    temporizador: null,
    alCambiar: null,             // aviso al que quiera enterarse de que cambio el nodo
};

/**
 * Un nodo vale si es https y nada mas.
 *
 * Solo https: por http cualquiera en la misma wifi puede cambiarte la respuesta
 * al vuelo, y un saldo o un precio alterado es exactamente lo que mas duele. Las
 * «redes puestas a mano» de config.js si admiten http porque ahi se esta
 * apuntando a una devnet de la LAN a proposito; esta lista es otra cosa: son los
 * nodos de la red de verdad.
 */
export function urlValida(u) {
    try {
        const url = new URL(u);
        return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
    } catch (_) {
        return false;
    }
}

/**
 * Una medida de un nodo: cuanto tarda y por que altura va.
 *
 * Se pregunta por /cut y no por la cabecera de la cadena: `header?limit=1`
 * devuelve el bloque en base64 salvo que se pida la codificacion en objeto, y
 * esa cabecera no la sirven todos igual (probado el 22-09: eckowallet contesta
 * con una cadena base64 y revienta si se le pide el objeto). /cut es JSON llano,
 * lo entienden los tres y cuesta 26-39 ms.
 */
export async function medir(url, networkId) {
    try {
        const getJson = await traerGetJson();
        const { json, status, ms } = await getJson(
            `${url}/chainweb/0.0/${networkId}/cut`,
            { esperaMs: ESPERA_SONDA_MS },
        );
        if (status !== 200) throw new Error('HTTP ' + status);
        const testigo = json && json.hashes && json.hashes[CADENA_TESTIGO];
        const altura = testigo ? Number(testigo.height) : NaN;
        if (!Number.isFinite(altura)) throw new Error('sin altura en la respuesta');
        return { url, ms, altura, ok: true, error: null };
    } catch (e) {
        return {
            url,
            ms: null,
            altura: null,
            ok: false,
            error: String((e && e.message) || e).slice(0, 80),
        };
    }
}

/**
 * Ordena las medidas: primero se apartan los que van atrasados, luego se ordena
 * por latencia. Devuelve la lista entera (tambien los apartados, marcados) para
 * poder enseñarla tal cual en la pantalla de Red.
 */
export function ordenar(medidas) {
    const vivos = medidas.filter((m) => m.ok);
    const puntaAltura = vivos.length ? Math.max(...vivos.map((m) => m.altura)) : null;
    const conRetraso = medidas.map((m) => ({
        ...m,
        retraso: (m.ok && puntaAltura !== null) ? puntaAltura - m.altura : null,
        atrasado: !!(m.ok && puntaAltura !== null && (puntaAltura - m.altura) > TOLERANCIA_BLOQUES),
    }));
    // Orden: los sanos por latencia, despues los atrasados, y al final los caidos.
    return conRetraso.sort((a, b) => {
        const rango = (m) => (!m.ok ? 2 : (m.atrasado ? 1 : 0));
        if (rango(a) !== rango(b)) return rango(a) - rango(b);
        if (!a.ok && !b.ok) return 0;
        return a.ms - b.ms;
    });
}

/**
 * Mide todos los candidatos a la vez y se queda con el mejor.
 *
 * Si el dueño ha fijado uno a mano, se mide igual (para poder enseñarle como va)
 * pero no se le cambia: fijar significa fijar.
 */
export async function sondear() {
    const lista = estado.lista.filter(urlValida);
    if (!lista.length) return estado.medidas;
    const medidas = ordenar(await Promise.all(lista.map((u) => medir(u, estado.networkId))));
    estado.medidas = medidas;
    estado.cuando = Date.now();
    const antes = estado.elegido;
    if (estado.fijo && lista.includes(estado.fijo)) {
        estado.elegido = estado.fijo;
    } else {
        const sano = medidas.find((m) => m.ok && !m.atrasado);
        // Si TODOS van atrasados no hay nada mejor que hacer que coger el mas
        // adelantado: quedarse sin nodo es peor que tener uno con un minuto de
        // retraso, y la pantalla de Red lo enseña.
        const apano = medidas.find((m) => m.ok);
        estado.elegido = (sano || apano || { url: lista[0] }).url;
    }
    if (estado.elegido !== antes && typeof estado.alCambiar === 'function') {
        try {
            estado.alCambiar(estado.elegido, antes);
        } catch (_) { /* que un aviso falle no rompe la sonda */ }
    }
    return medidas;
}

/** La URL del nodo que toca usar ahora mismo. */
export function mejor() {
    return estado.elegido;
}

export function verEstado() {
    return {
        elegido: estado.elegido,
        fijo: estado.fijo,
        cuando: estado.cuando,
        lista: estado.lista.slice(),
        deFabrica: DE_FABRICA.slice(),
        medidas: estado.medidas.slice(),
        sondeando: estado.temporizador !== null,
    };
}

/**
 * Se le pasa lo que el dueño tenga guardado (su lista y su nodo fijo) y se deja
 * todo listo. Las URL que no valgan se tiran aqui.
 */
export function configurar({ networkId, lista, fijo } = {}) {
    if (networkId) estado.networkId = networkId;
    const suyas = Array.isArray(lista) ? lista.filter(urlValida) : [];
    // Los de fabrica van siempre; los del dueño se añaden detras, sin repetir.
    estado.lista = DE_FABRICA.concat(suyas.filter((u) => !DE_FABRICA.includes(u)));
    estado.fijo = (fijo && estado.lista.includes(fijo)) ? fijo : null;
    if (estado.fijo) estado.elegido = estado.fijo;
    else if (!estado.lista.includes(estado.elegido)) estado.elegido = estado.lista[0];
    return verEstado();
}

// --- Lo que se guarda en el aparato -----------------------------------------
//
// Solo dos cosas: los nodos que haya añadido el dueño y cual tiene fijado. Los
// de fabrica NO se guardan: viven en el codigo y asi una lista guardada vieja no
// puede dejar la app sin nodos.

/** Lo guardado, ya repasado. Si esta estropeado, se devuelve vacio. */
export function leerGuardado() {
    try {
        const crudo = JSON.parse(localStorage.getItem(CLAVE_NODOS) || '{}');
        const lista = Array.isArray(crudo.lista) ? crudo.lista.filter(urlValida) : [];
        const fijo = (typeof crudo.fijo === 'string' && urlValida(crudo.fijo)) ? crudo.fijo : null;
        return { lista, fijo };
    } catch (_) {
        return { lista: [], fijo: null };
    }
}

function guardar({ lista, fijo }) {
    try {
        localStorage.setItem(CLAVE_NODOS, JSON.stringify({
            lista: lista.filter((u) => !DE_FABRICA.includes(u)),
            fijo: fijo || null,
        }));
    } catch (_) { /* sin almacenamiento: se queda solo para esta sesion */ }
}

/** Añade un nodo a la lista y vuelve a medir. Lanza si la direccion no vale. */
export async function anadirNodo(url) {
    const limpia = String(url || '').trim().replace(/\/+$/, '');
    if (!urlValida(limpia)) {
        throw new Error('La dirección del nodo tiene que empezar por https:// y no llevar usuario, ? ni #.');
    }
    if (estado.lista.includes(limpia)) throw new Error('Ese nodo ya está en la lista.');
    configurar({ lista: estado.lista.concat([limpia]), fijo: estado.fijo });
    guardar({ lista: estado.lista, fijo: estado.fijo });
    await sondear();
    return verEstado();
}

/** Quita un nodo puesto a mano. Los de fabrica no se tocan. */
export async function quitarNodo(url) {
    if (DE_FABRICA.includes(url)) throw new Error('Los nodos de fábrica no se quitan.');
    const fijo = estado.fijo === url ? null : estado.fijo;
    configurar({ lista: estado.lista.filter((u) => u !== url), fijo });
    guardar({ lista: estado.lista, fijo: estado.fijo });
    await sondear();
    return verEstado();
}

/** Fija un nodo a mano, o lo suelta pasando null para volver al automatico. */
export async function fijarNodo(url) {
    configurar({ lista: estado.lista, fijo: url || null });
    guardar({ lista: estado.lista, fijo: estado.fijo });
    await sondear();
    return verEstado();
}

/**
 * Arranca la sonda periodica con lo que hubiera guardado.
 *
 * `alCambiar(nuevo, antes)` se llama cada vez que cambia el nodo elegido, que es
 * por donde el resto de la app se entera.
 */
export function arrancar(alCambiar, { networkId } = {}) {
    if (typeof alCambiar === 'function') estado.alCambiar = alCambiar;
    const guardado = leerGuardado();
    configurar({ networkId: networkId || estado.networkId, lista: guardado.lista, fijo: guardado.fijo });
    if (estado.temporizador) clearInterval(estado.temporizador);
    estado.temporizador = setInterval(() => { sondear().catch(() => {}); }, CADA_MS);
    return sondear().catch(() => estado.medidas);
}

export function parar() {
    if (estado.temporizador) {
        clearInterval(estado.temporizador);
        estado.temporizador = null;
    }
}
