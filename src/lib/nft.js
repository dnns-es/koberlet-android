// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// PIEZAS NFT DE UNA CUENTA KADENA. Todo lectura: aqui no se firma nada.
//
// Portado de `lib/nft.js` del Koberlet de escritorio, con su misma regla de oro:
// **la cadena manda**. De un catalogo, de un indexador o de lo que el dueño haya
// apuntado a mano solo salen CANDIDATOS; que una pieza sea suya lo dice el ledger
// y nadie mas.
//
// El ledger de Kadena sabe contestar "cuantas unidades del token X tiene la
// cuenta Y", pero NO "que tokens tiene Y". Por eso hacen falta candidatos: o los
// da un descubridor (un servicio que indexa la cadena) o los apunta el dueño por
// su identificador. En la red del fork no hay descubridor, asi que de momento es
// lo segundo, y tiene una ventaja: nadie de fuera necesita saber -ni contar- que
// tiene cada cuenta.
//
// Las imagenes NO se enlazan: se descargan y se convierten en data URL. Motivo:
// la CSP de la app solo admite `img-src 'self' data:`, y aflojarla para pintar
// una miniatura significaria dejar que la uri de una pieza -que elige quien la
// acuña- haga peticiones desde dentro del monedero.

import { local } from './kda.js';
import { getTexto, esNativo } from '../red.js';

// Un identificador de pieza acaba DENTRO de codigo Pact, entre comillas. Nunca
// puede llevar comillas ni barras: eso es lo unico capaz de escapar del literal
// (hallazgo #5 de la auditoria de Alex, el mismo criterio que en los envios).
const ID_OK = /^[A-Za-z0-9_\-.:]{1,120}$/;
const MODULO_OK = /^[A-Za-z0-9_\-.]{3,120}$/;

const MAX_IMAGEN = 3 * 1024 * 1024;   // 3 MB: de sobra para una miniatura
const A_LA_VEZ = 4;                   // consultas simultaneas; un movil no es un servidor

export function idValido(id) {
    return typeof id === 'string' && ID_OK.test(id);
}

/** Direcciones a las que NO se va, aunque lo diga la pieza (auditoria M-1). */
function destinoPermitido(url) {
    let u;
    try { u = new URL(url); } catch (_) { return false; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.localhost') || h === '::1') return false;
    // La uri la elige quien acuña la pieza. Sin esto, la app haria de sonda
    // contra la red de casa del dueño (su router, un panel interno) a peticion
    // de un tercero.
    const privadas = [/^127\./, /^10\./, /^192\.168\./, /^169\.254\./, /^0\./, /^172\.(1[6-9]|2\d|3[01])\./];
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h) && privadas.some((re) => re.test(h))) return false;
    if (/^(fc|fd)[0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h)) return false;
    return true;
}

/** `ipfs://algo` -> una direccion http que se pueda pedir. */
function aHttp(uri, pasarela) {
    if (!uri || typeof uri !== 'string') return null;
    if (uri.startsWith('ipfs://')) return pasarela + uri.slice(7).replace(/^ipfs\//, '');
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
    if (uri.startsWith('data:')) return uri;
    return null;
}

/** Metadatos de una pieza (el JSON que cuelga de su uri). Nunca lanza. */
async function metadatosDe(uri, pasarela) {
    const url = aHttp(uri, pasarela);
    if (!url || (!url.startsWith('data:') && !destinoPermitido(url))) return {};
    try {
        if (url.startsWith('data:')) {
            const coma = url.indexOf(',');
            const cuerpo = decodeURIComponent(url.slice(coma + 1));
            return JSON.parse(cuerpo);
        }
        const { texto } = await getTexto(url, { esperaMs: 15000 });
        return JSON.parse(texto);
    } catch (_) {
        return {};
    }
}

/**
 * Descarga una imagen y la devuelve como data URL, o null si no se puede.
 *
 * Se hace con `fetch` en los dos sitios a proposito: en el APK esta peticion va a
 * un servidor de imagenes cualquiera, no al nodo, y no necesita el canal nativo;
 * lo que importa es que acabe convertida en data URL antes de tocar el DOM.
 */
async function imagenDataUrl(uri, pasarela) {
    const url = aHttp(uri, pasarela);
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    if (!destinoPermitido(url)) return null;
    try {
        const respuesta = await fetch(url, { mode: 'cors' });
        if (!respuesta.ok) return null;
        const tipo = (respuesta.headers.get('content-type') || '').split(';')[0].trim();
        if (!/^image\/(png|jpeg|webp|gif|avif|svg\+xml)$/.test(tipo)) return null;
        const trozo = await respuesta.blob();
        if (trozo.size > MAX_IMAGEN) return null;
        return await new Promise((resolver) => {
            const lector = new FileReader();
            lector.onload = () => resolver(String(lector.result));
            lector.onerror = () => resolver(null);
            lector.readAsDataURL(trozo);
        });
    } catch (_) {
        return null;                 // sin imagen se enseña igual: la pieza es suya
    }
}

/** Candidatos del descubridor de la red, si lo hay. De el solo salen candidatos. */
async function candidatosDelDescubridor(descubridor, cuenta) {
    if (!descubridor) return { ids: [], error: null };
    const url = descubridor.endsWith('=') ? descubridor + encodeURIComponent(cuenta) : descubridor;
    try {
        if (!destinoPermitido(url)) throw new Error('El descubridor de esta red no es una dirección admitida.');
        const { texto } = await getTexto(url, { esperaMs: 15000 });
        return { ids: recolectarIds(JSON.parse(texto)), error: null };
    } catch (e) {
        return { ids: [], error: String(e.message || e) };
    }
}

/** Saca identificadores de una respuesta con forma desconocida, sin fiarse de ella. */
function recolectarIds(valor, salida = [], hondo = 0) {
    if (hondo > 4 || salida.length > 500) return salida;
    if (typeof valor === 'string') {
        if (idValido(valor) && valor.length > 8) salida.push(valor);
    } else if (Array.isArray(valor)) {
        valor.forEach((v) => recolectarIds(v, salida, hondo + 1));
    } else if (valor && typeof valor === 'object') {
        for (const clave of ['id', 'tokenId', 'token-id']) {
            if (typeof valor[clave] === 'string' && idValido(valor[clave])) salida.push(valor[clave]);
        }
        Object.values(valor).forEach((v) => recolectarIds(v, salida, hondo + 1));
    }
    return salida;
}

/** De `A_LA_VEZ` en `A_LA_VEZ`, para no abrir veinte conexiones desde un móvil. */
async function porLotes(lista, tarea) {
    const salida = [];
    for (let i = 0; i < lista.length; i += A_LA_VEZ) {
        salida.push(...await Promise.all(lista.slice(i, i + A_LA_VEZ).map(tarea)));
    }
    return salida;
}

/**
 * Las piezas que la CADENA confirma que tiene esa cuenta.
 *
 * @param cuenta  cuenta Kadena
 * @param red     entrada de REDES_KDA, con su `nft`
 * @param ids     identificadores apuntados a mano
 * @returns { piezas, aviso }
 */
export async function piezasDe(cuenta, red, ids = []) {
    const conf = (red && red.nft) || {};
    if (!conf.ledger || !MODULO_OK.test(conf.ledger)) return { piezas: [], aviso: null };
    const pasarela = conf.pasarela || 'https://ipfs.io/ipfs/';
    const chain = conf.chain || '0';
    const nodo = red.nodo;
    const networkId = red.networkId;

    const desc = await candidatosDelDescubridor(conf.descubridor, cuenta);
    const candidatos = [...new Set([...desc.ids, ...ids.filter(idValido)])].slice(0, 200);

    // 1) La cadena dice cuales son suyas de verdad. Lo demas se cae aqui.
    //
    // Ojo a la diferencia: que el nodo diga "esa cuenta no tiene esa pieza" y que
    // el nodo NO CONTESTE no son lo mismo. Si se juntaran, quedarse sin cobertura
    // se enseñaria como "no tienes nada", que es lo contrario de la verdad.
    const consultadas = await porLotes(candidatos, async (id) => {
        try {
            const r = await local(nodo, networkId, chain, `(${conf.ledger}.get-balance "${id}" "${cuenta}")`);
            // Un `failure` SI es respuesta: get-balance falla cuando la cuenta no
            // tiene fila para esa pieza, que es justo el caso de "no es tuya".
            const dato = r && r.status === 'success' ? r.data : null;
            const saldo = typeof dato === 'object' && dato !== null
                ? Number(dato.decimal ?? dato.int ?? 0)
                : Number(dato || 0);
            return { id, saldo };
        } catch (_) {
            return { id, sinRespuesta: true };
        }
    });

    const sinRespuesta = consultadas.filter((x) => x.sinRespuesta).map((x) => x.id);
    const mias = consultadas.filter((x) => !x.sinRespuesta && x.saldo > 0);

    // 2) Solo de esas se piden ficha, metadatos e imagen.
    const piezas = await porLotes(mias, async ({ id, saldo }) => {
        let uri = null;
        try {
            const info = await local(nodo, networkId, chain, `(${conf.ledger}.get-token-info "${id}")`);
            if (info && info.status === 'success' && info.data) uri = info.data.uri || null;
        } catch (_) { /* sin uri se enseña igual, sin imagen */ }

        const meta = uri ? await metadatosDe(uri, pasarela) : {};
        return {
            id,
            saldo,
            nombre: meta.name || (id.length > 18 ? id.slice(0, 18) + '…' : id),
            descripcion: typeof meta.description === 'string' ? meta.description.slice(0, 400) : '',
            coleccion: meta.collection || '',
            imagen: await imagenDataUrl(meta.image, pasarela),
            uri,
        };
    });

    return { piezas, aviso: desc.error, sinRespuesta };
}

/** Comprueba un identificador suelto: sirve para añadir una pieza a mano. */
export async function comprobarPieza(cuenta, red, id) {
    if (!idValido(id)) throw new Error('Ese identificador de pieza no es válido.');
    const { piezas, sinRespuesta } = await piezasDe(cuenta, red, [id]);
    const p = piezas.find((x) => x.id === id);
    if (p) return p;
    // Antes de decir que no es suya hay que estar seguro de haber preguntado.
    if (sinRespuesta.includes(id)) throw new Error('No se pudo preguntar a la cadena. Prueba otra vez.');
    throw new Error('Esta cuenta no tiene esa pieza en esta red.');
}

// --- Piezas apuntadas a mano -------------------------------------------------
//
// Son identificadores publicos, no secretos: se guardan tal cual, por cuenta, en
// el almacenamiento del propio aparato.
const LLAVE = 'koberlet.nft';

export function idsGuardados(cuenta) {
    try {
        const todo = JSON.parse(localStorage.getItem(LLAVE) || '{}');
        const lista = todo[cuenta];
        return Array.isArray(lista) ? lista.filter(idValido) : [];
    } catch (_) {
        return [];
    }
}

export function guardarId(cuenta, id) {
    if (!idValido(id)) return;
    try {
        const todo = JSON.parse(localStorage.getItem(LLAVE) || '{}');
        const lista = new Set(Array.isArray(todo[cuenta]) ? todo[cuenta] : []);
        lista.add(id);
        todo[cuenta] = [...lista].slice(0, 200);
        localStorage.setItem(LLAVE, JSON.stringify(todo));
    } catch (_) { /* sin almacenamiento: se pierde al cerrar, no es grave */ }
}

export function olvidarId(cuenta, id) {
    try {
        const todo = JSON.parse(localStorage.getItem(LLAVE) || '{}');
        todo[cuenta] = (todo[cuenta] || []).filter((x) => x !== id);
        localStorage.setItem(LLAVE, JSON.stringify(todo));
    } catch (_) { /* ídem */ }
}

/** Solo para que la pantalla pueda decir por dónde salen las imágenes. */
export function enAparato() { return esNativo(); }
