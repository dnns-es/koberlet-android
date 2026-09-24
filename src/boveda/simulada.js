// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// BOVEDA SIMULADA - DOBLE DE DESARROLLO. NO ES LA BOVEDA DE VERDAD.
//
// Existe por un motivo concreto: poder construir y mirar las pantallas en el
// navegador, donde no hay plugin Kotlin ni Android Keystore. Cumple el mismo
// contrato que la nativa, asi que la interfaz es exactamente la misma.
//
// En que se diferencia de la buena, y por que importa:
//
//   - Cifra con PBKDF2-SHA256 (WebCrypto) en vez de scrypt. WebCrypto no trae
//     scrypt, y meter criptografia en JavaScript sin auditar dentro de un
//     monedero, solo para el doble, seria peor remedio que enfermedad. Por eso
//     sus copias NO las abre la app del movil, y se avisa al intentarlo.
//   - Guarda en localStorage, que cualquier script de la pagina puede leer.
//   - Las semillas pasan por el WebView. En la nativa no salen de Kotlin.
//
// La pantalla enseña una banda roja cuando corre sobre este doble, y `index.js`
// solo lo carga fuera del APK.

import { ethers } from 'ethers';

// CERROJO: este fichero no puede ejecutarse dentro del APK. Nunca.
//
// `boveda/index.js` solo lo carga fuera de Android, y el empaquetador lo deja en
// un trozo aparte que la app instalada no llega a pedir. Pero "no se pide" no es
// "no está": el trozo viaja dentro del APK, y si algún día la detección de
// plataforma fallara -Capacitor que no arranca, un WebView raro-, la app se
// abriría con este doble y guardaría la semilla en el almacenamiento del
// WebView en vez de en la bóveda cifrada del aparato. Eso es exactamente el
// accidente que no puede pasar en un monedero.
//
// Por eso la comprobación se repite AQUÍ, en el sitio donde se haría el daño, y
// revienta en vez de seguir: más vale una app que no abre que una que guarda la
// semilla donde no debe.
// Se miran DOS señales distintas y basta una: el puente de Capacitor que inyecta
// el WebView, y el esquema de la página, que dentro del APK no es http normal.
// Si una falla, la otra sigue cerrando la puerta.
if (typeof window !== 'undefined') {
    const puente = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const esquema = window.location && window.location.protocol === 'capacitor:';
    if (puente || esquema) {
        throw new Error('La bóveda de desarrollo no se ejecuta dentro de la app instalada.');
    }
}

const LLAVE = 'koberlet-boveda-simulada';
const VUELTAS = 600000;          // PBKDF2: lo que recomienda OWASP para SHA-256

// Sesion abierta: se retiene la CLAVE derivada, nunca la contrasena. Mismo
// criterio que el hallazgo L-2 de la auditoria interna del escritorio.
let sesion = null;

// --- Aguantar el refresco de la pagina --------------------------------------
//
// Recargar la pagina mata las variables, asi que la sesion se perdia y habia que
// volver a escribir la contrasena en cada F5. Al desarrollar sobre la maqueta eso
// es un peaje constante.
//
// Lo que se guarda para sobrevivir al refresco son SOLO las cuentas publicas: la
// direccion que cualquiera puede ver en el explorador de bloques. Ni la
// contrasena, ni la clave derivada, ni la semilla salen de la memoria. Por eso
// "seguir abierta" aqui significa nada mas que se ven las cuentas y los saldos;
// para ver una semilla o firmar hay que escribir la contrasena igual que antes.
//
// Va en `sessionStorage`, que muere al cerrar la pestaña (en el APK, al cerrar la
// app), y ademas caduca sola a los 15 minutos.
const SESION = 'koberlet-sesion';
const CADUCA_MS = 15 * 60 * 1000;

function recordarSesion(publicas) {
    try {
        sessionStorage.setItem(SESION, JSON.stringify({ hasta: Date.now() + CADUCA_MS, cuentas: publicas }));
    } catch (_) { /* navegacion privada: se queda sin recordar, que no es grave */ }
}

function olvidarSesion() {
    try { sessionStorage.removeItem(SESION); } catch (_) { /* ídem */ }
}

function sesionRecordada() {
    try {
        const c = JSON.parse(sessionStorage.getItem(SESION) || 'null');
        if (!c || !Array.isArray(c.cuentas) || Date.now() > c.hasta) {
            olvidarSesion();
            return null;
        }
        return c.cuentas;
    } catch (_) {
        return null;
    }
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derivarClave(contrasena, sal) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: sal, iterations: VUELTAS, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

async function guardarCifrado(clave, sal, datos) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, new TextEncoder().encode(JSON.stringify(datos)));
    localStorage.setItem(LLAVE, JSON.stringify({
        // `v` es la versión del SOBRE (cómo está cifrado); `migrado`, la de los
        // datos de dentro. Son cosas distintas y por eso son dos números: el sobre
        // no ha cambiado nunca, el contenido sí.
        v: 1, motor: 'simulada', migrado: VERSION, kdf: { sal: b64(sal), vueltas: VUELTAS },
        iv: b64(iv), ct: b64(ct),
    }));
}

async function leer(contrasena) {
    const crudo = localStorage.getItem(LLAVE);
    if (!crudo) throw new Error('No hay ninguna cartera creada en este navegador.');
    const raw = JSON.parse(crudo);
    const sal = deB64(raw.kdf.sal);
    const clave = await derivarClave(contrasena, sal);
    let plano;
    try {
        plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(raw.iv) }, clave, deB64(raw.ct));
    } catch (_) {
        // AES-GCM falla igual con contrasena mala que con fichero manipulado: no
        // se puede distinguir, y decir "contrasena incorrecta" es lo util.
        throw new Error('Contraseña incorrecta.');
    }
    return { datos: normalizar(JSON.parse(new TextDecoder().decode(plano))), clave, sal };
}

// --- Estructura de datos (la misma que Carteras.kt) -------------------------
//
// v3 = UNA CARTERA, UNA RED. Lo de antes (una cartera con cuenta de Kadena y de
// Ethereum a la vez) se parte en dos al abrir. Aquí se hace igual que en Kotlin
// porque las dos bóvedas tienen que entender los mismos datos; si divergieran,
// lo que se prueba en el navegador no sería lo que corre en el móvil.
const VERSION = 3;

function normalizar(datos) {
    return partirPorRed(aVarias(datos));
}

function aVarias(datos) {
    if (datos.v >= 2 && Array.isArray(datos.carteras)) return datos;
    return {
        v: 2,
        carteras: [{ id: 'c1', etiqueta: 'Mi cartera', semilla: datos.semilla, cuentas: datos.cuentas || [] }],
        activa: 'c1',
    };
}

/**
 * v2 -> v3: la cartera con dos cuentas pasa a ser dos carteras con la misma
 * semilla. Las direcciones no cambian -salen de la misma semilla por el mismo
 * camino-, solo cambia cómo se agrupan.
 */
function partirPorRed(datos) {
    if (datos.v >= VERSION) return datos;
    const usados = new Set(datos.carteras.map((c) => c.id));
    const libre = () => {
        let n = 1;
        while (usados.has('c' + n)) n++;
        return 'c' + n;
    };

    const nuevas = [];
    datos.carteras.forEach((c) => {
        const cuentas = c.cuentas || [];
        if (cuentas.length <= 1) {
            nuevas.push({ ...c, red: cuentas.length ? cuentas[0].tipo : 'kda' });
            return;
        }
        let primera = true;
        ['kda', 'evm'].forEach((tipo) => {
            const cu = cuentas.find((x) => x.tipo === tipo);
            if (!cu) return;
            const id = primera ? c.id : libre();
            primera = false;
            usados.add(id);
            nuevas.push({
                id,
                etiqueta: c.etiqueta + ' ' + tipo.toUpperCase(),
                semilla: c.semilla,
                red: tipo,
                // El id de la cuenta sigue siendo <carteraId>-<tipo>: de eso
                // depende exportar la clave privada.
                cuentas: [{ ...cu, id: `${id}-${tipo}` }],
            });
        });
    });
    return { v: VERSION, carteras: nuevas, activa: datos.activa || (nuevas[0] && nuevas[0].id) || '' };
}

/** La red de una cartera; las de antes de la v3 no la traen y se deduce. */
function redDe(cartera) {
    if (cartera.red === 'kda' || cartera.red === 'evm') return cartera.red;
    return (cartera.cuentas && cartera.cuentas[0] && cartera.cuentas[0].tipo) || 'kda';
}

function idNuevo(datos) {
    let n = 1;
    const usados = new Set(datos.carteras.map((c) => c.id));
    while (usados.has('c' + n)) n++;
    return 'c' + n;
}

async function montarCartera(id, etiqueta, semilla, red) {
    if (red !== 'kda' && red !== 'evm') throw new Error('Esa red no existe.');
    if (red === 'evm') {
        const evm = ethers.HDNodeWallet.fromPhrase(semilla, '', "m/44'/60'/0'/0/0");
        return {
            id, etiqueta, semilla, red,
            cuentas: [{ id: `${id}-evm`, etiqueta: 'EVM', tipo: 'evm', cuenta: evm.address }],
        };
    }
    const hd = await import('@kadena/hd-wallet');
    const efimera = 'efimera-' + crypto.randomUUID();     // la libreria exige contrasena; aqui no guarda nada
    const seed = await hd.kadenaMnemonicToSeed(efimera, semilla);
    const [pub] = await hd.kadenaGenKeypairFromSeed(efimera, seed, 0);
    return {
        id, etiqueta, semilla, red,
        cuentas: [{ id: `${id}-kda`, etiqueta: 'Kadena', tipo: 'kda', cuenta: 'k:' + pub }],
    };
}

/**
 * Deja una clave privada como se guarda: 64 caracteres hex en minúsculas.
 *
 * Espejo de `Carteras.normalizarClave` del plugin Kotlin; si aquí y allí no
 * cuadraran, la misma clave daría dos cuentas distintas según el motor.
 */
async function normalizarClave(texto, red) {
    let h = String(texto).trim().replace(/^0x/i, '').toLowerCase();
    if (!/^[0-9a-f]+$/.test(h)) {
        throw new Error('Una clave privada son 64 caracteres del 0 al 9 y de la a a la f.');
    }
    if (h.length === 128 && red === 'kda') {
        const nacl = (await import('tweetnacl')).default;
        const privada = h.slice(0, 64);
        const publica = Buffer.from(nacl.sign.keyPair.fromSeed(Buffer.from(privada, 'hex')).publicKey).toString('hex');
        if (publica !== h.slice(64)) {
            throw new Error('Esos 128 caracteres no son una clave privada seguida de su pública.');
        }
        h = privada;
    }
    if (h.length !== 64) {
        throw new Error('Una clave privada son 64 caracteres del 0 al 9 y de la a a la f.');
    }
    if (/^0+$/.test(h)) throw new Error('Esa clave no vale: son todo ceros.');
    return h;
}

/** Una cartera hecha con una clave privada suelta: sin semilla, y sin poderla tener. */
async function montarConClave(id, etiqueta, privada, red) {
    if (red !== 'kda' && red !== 'evm') throw new Error('Esa red no existe.');
    if (red === 'evm') {
        const w = new ethers.Wallet('0x' + privada);
        return {
            id, etiqueta, privada, red,
            cuentas: [{ id: `${id}-evm`, etiqueta: 'EVM', tipo: 'evm', cuenta: w.address }],
        };
    }
    const nacl = (await import('tweetnacl')).default;
    const pub = Buffer.from(nacl.sign.keyPair.fromSeed(Buffer.from(privada, 'hex')).publicKey).toString('hex');
    return {
        id, etiqueta, privada, red,
        cuentas: [{ id: `${id}-kda`, etiqueta: 'Kadena', tipo: 'kda', cuenta: 'k:' + pub }],
    };
}

function cuentasPublicas(datos) {
    return datos.carteras.flatMap((c) =>
        c.cuentas.map((cu) => ({ ...cu, carteraId: c.id, cartera: c.etiqueta, conSemilla: !!c.semilla })));
}

async function guardarDatos(contrasena, datos) {
    const sal = crypto.getRandomValues(new Uint8Array(16));
    const clave = await derivarClave(contrasena, sal);
    await guardarCifrado(clave, sal, datos);
    sesion = { clave, sal, datos };
    recordarSesion(cuentasPublicas(datos));
    return datos;
}

// --- Contrato ---------------------------------------------------------------
export const bovedaSimulada = {
    async estado() {
        return {
            existe: !!localStorage.getItem(LLAVE),
            abierta: !!sesion || !!sesionRecordada(),
            motor: 'simulada',
        };
    },

    async crear(contrasena, etiqueta = 'Mi cartera', red = 'kda') {
        const hd = await import('@kadena/hd-wallet');
        const semilla = hd.kadenaGenMnemonic();
        const datos = await conCarteraNueva(contrasena, semilla, etiqueta, red);
        // La semilla sale UNA vez, para que el dueño la apunte. Despues hay que
        // volver a pedirla con `exportar` y la contrasena.
        return { semilla, cuentas: cuentasPublicas(datos) };
    },

    async importar(contrasena, semilla, etiqueta = 'Cartera importada', red = 'kda') {
        const limpia = String(semilla).trim().toLowerCase().replace(/\s+/g, ' ');
        const palabras = limpia.split(' ');
        if (![12, 15, 18, 21, 24].includes(palabras.length)) {
            throw new Error(`Una semilla tiene 12 o 24 palabras; has escrito ${palabras.length}.`);
        }
        const datos = await conCarteraNueva(contrasena, limpia, etiqueta, red);
        return { cuentas: cuentasPublicas(datos) };
    },

    async importarClave(contrasena, privada, etiqueta = 'Cartera importada', red = 'kda') {
        const limpia = await normalizarClave(privada, red);
        const datos = await conClaveNueva(contrasena, limpia, etiqueta, red);
        return { cuentas: cuentasPublicas(datos) };
    },

    async abrir(contrasena) {
        const crudo = localStorage.getItem(LLAVE);
        const { datos, clave, sal } = await leer(contrasena);
        // Si el formato ha cambiado, se guarda ya migrado, y antes se aparta una
        // copia de lo que había. Aquí es menos grave que en el móvil -esto es un
        // doble de desarrollo- pero se hace igual para probar el mismo camino.
        if (datos.v === VERSION && crudo && JSON.parse(crudo).migrado !== VERSION) {
            try {
                localStorage.setItem(LLAVE + '-antes-de-v' + VERSION, crudo);
                await guardarDatos(contrasena, datos);
            } catch (_) { /* si no se puede guardar, se sigue con la migración en memoria */ }
        }
        sesion = { clave, sal, datos };
        recordarSesion(cuentasPublicas(datos));
        return { cuentas: cuentasPublicas(datos) };
    },

    async cerrar() {
        sesion = null;
        olvidarSesion();
    },

    async cuentas() {
        if (sesion) return cuentasPublicas(sesion.datos);
        // Tras un refresco no queda la clave derivada, pero si las cuentas
        // publicas: bastan para enseñar el panel y los saldos. Lo que hace falta
        // la contrasena (firmar, exportar, renombrar) la vuelve a pedir igual.
        const recordadas = sesionRecordada();
        if (recordadas) return recordadas;
        throw new Error('La cartera está bloqueada.');
    },

    async renombrarCartera(contrasena, id, etiqueta) {
        const { datos } = await leer(contrasena);
        const c = datos.carteras.find((x) => x.id === id);
        if (!c) throw new Error('Esa cartera no existe.');
        const limpia = String(etiqueta).trim().slice(0, 40);
        if (!limpia) throw new Error('Ponle un nombre.');
        c.etiqueta = limpia;
        await guardarDatos(contrasena, datos);
        return { cuentas: cuentasPublicas(datos) };
    },

    async borrarCartera(contrasena, id) {
        const { datos } = await leer(contrasena);
        if (datos.carteras.length <= 1) throw new Error('Es la única cartera que hay. Para empezar de cero, usa borrar todo.');
        const quedan = datos.carteras.filter((c) => c.id !== id);
        if (quedan.length === datos.carteras.length) throw new Error('Esa cartera no existe.');
        datos.carteras = quedan;
        if (datos.activa === id) datos.activa = quedan[0].id;
        await guardarDatos(contrasena, datos);
        return { cuentas: cuentasPublicas(datos) };
    },

    // Exportar SIEMPRE re-pide la contrasena, aunque la sesion este abierta.
    async exportar(contrasena, id) {
        const { datos } = await leer(contrasena);
        if (id.startsWith('semilla:')) {
            const c = datos.carteras.find((x) => x.id === id.slice(8));
            if (!c) throw new Error('Esa cartera no existe.');
            if (!c.semilla) throw new Error('Esa cartera se metió con su clave privada: no tiene palabras.');
            return { privada: c.semilla };
        }
        const carteraId = id.replace(/-(kda|evm)$/, '');
        const c = datos.carteras.find((x) => x.id === carteraId);
        if (!c) throw new Error('Esa cartera no existe.');
        // Si la cartera se metió por su clave, no hay nada que derivar.
        if (c.privada) return { privada: id.endsWith('-evm') ? '0x' + c.privada : c.privada };
        if (id.endsWith('-evm')) {
            return { privada: ethers.HDNodeWallet.fromPhrase(c.semilla, '', "m/44'/60'/0'/0/0").privateKey };
        }
        const hd = await import('@kadena/hd-wallet');
        const efimera = 'efimera-' + crypto.randomUUID();
        const seed = await hd.kadenaMnemonicToSeed(efimera, c.semilla);
        const [, privCifrada] = await hd.kadenaGenKeypairFromSeed(efimera, seed, 0);
        const bytes = await hd.kadenaDecrypt(efimera, privCifrada);
        return { privada: Buffer.from(bytes).toString('hex') };
    },

    // La huella no existe en el navegador: no hay Keystore ni lector, y fingirla
    // con un «si» de mentira aquí daría una falsa idea de cómo protege en el móvil.
    async bioEstado() {
        return { disponible: false, activada: false, motivo: 'La huella solo funciona en la app instalada.' };
    },

    async bioActivar() {
        throw new Error('La huella solo funciona en la app instalada.');
    },

    async bioBorrar() { return { activada: false }; },

    async abrirConHuella() {
        throw new Error('La huella solo funciona en la app instalada.');
    },

    // El doble NO firma envios, a proposito. Dos motivos: no duplicar en
    // JavaScript el montaje del comando Pact -si las dos copias se separaran, la
    // que se prueba no seria la que se usa- y que desde una pantalla de navegador
    // no se pueda mover dinero de verdad.
    async firmarEnvioKda() {
        throw new Error('Los envíos solo funcionan en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarEnvioCrossKda() {
        throw new Error('Los envíos solo funcionan en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarPuenteEvm() {
        throw new Error('El puente solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarEnvioToken() {
        throw new Error('Los envíos solo funcionan en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarEnvioEvm() {
        throw new Error('Los envíos solo funcionan en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarPermisoEvm() {
        throw new Error('El puente solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarPuenteHaciaKadena() {
        throw new Error('El puente solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarCambioEvm() {
        throw new Error('Cambiar en el mercado solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarCambioAmm() {
        throw new Error('Cambiar en el mercado solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarCrearDca() {
        throw new Error('Crear un plan de compras solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarGestionDca() {
        throw new Error('Tocar un plan de compras solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    async firmarComandoExterno() {
        throw new Error('Firmar para una web solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.');
    },

    // La copia se baja como fichero. OJO: aqui el cifrado es PBKDF2 y en el movil
    // scrypt, asi que las copias no son intercambiables. Se avisa al importar.
    async exportarBoveda(contrasena) {
        await leer(contrasena);
        const crudo = localStorage.getItem(LLAVE);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([crudo], { type: 'application/json' }));
        a.download = 'koberlet-vault-navegador.json';
        a.click();
        URL.revokeObjectURL(a.href);
        return { compartido: true };
    },

    async importarBoveda(contrasena, contenido) {
        const raw = JSON.parse(contenido);
        if (raw.motor !== 'simulada') {
            throw new Error('Esa copia viene de la app del móvil y aquí no se puede abrir: el navegador cifra de otra forma. Impórtala en el móvil.');
        }
        localStorage.setItem(LLAVE, contenido);
        const { datos, clave, sal } = await leer(contrasena);
        sesion = { clave, sal, datos };
        recordarSesion(cuentasPublicas(datos));
        return { cuentas: cuentasPublicas(datos) };
    },

    async borrarTodo(contrasena) {
        await leer(contrasena);            // no se borra nada sin demostrar que eres el dueño
        localStorage.removeItem(LLAVE);
        sesion = null;
        olvidarSesion();
    },
};

/** Crea la boveda si no existe, o añade una cartera mas si ya la hay. */
async function conCarteraNueva(contrasena, semilla, etiqueta, red) {
    let datos;
    if (localStorage.getItem(LLAVE)) {
        datos = (await leer(contrasena)).datos;
        // La misma semilla puede estar dos veces, una por red: eso es justo lo que
        // deja la migración. Lo que no puede es repetirse en la misma red.
        if (datos.carteras.some((c) => c.semilla === semilla && redDe(c) === red)) {
            throw new Error('Esa cartera ya está metida en este navegador.');
        }
        const c = await montarCartera(idNuevo(datos), etiqueta, semilla, red);
        datos.carteras.push(c);
        datos.activa = c.id;
    } else {
        const c = await montarCartera('c1', etiqueta, semilla, red);
        datos = { v: VERSION, carteras: [c], activa: 'c1' };
    }
    return guardarDatos(contrasena, datos);
}

/** Lo mismo, pero con una clave privada suelta. */
async function conClaveNueva(contrasena, privada, etiqueta, red) {
    let datos;
    if (localStorage.getItem(LLAVE)) {
        datos = (await leer(contrasena)).datos;
        if (datos.carteras.some((c) => c.privada === privada && redDe(c) === red)) {
            throw new Error('Esa cartera ya está metida en este navegador.');
        }
        const c = await montarConClave(idNuevo(datos), etiqueta, privada, red);
        const cuenta = c.cuentas[0].cuenta;
        if (datos.carteras.some((x) => (x.cuentas || []).some((cu) => cu.cuenta === cuenta))) {
            throw new Error('Esa cuenta ya está en este aparato, metida con su semilla.');
        }
        datos.carteras.push(c);
        datos.activa = c.id;
    } else {
        const c = await montarConClave('c1', etiqueta, privada, red);
        datos = { v: VERSION, carteras: [c], activa: 'c1' };
    }
    return guardarDatos(contrasena, datos);
}
