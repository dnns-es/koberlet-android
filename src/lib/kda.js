// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// KADENA - SOLO LECTURA.
//
// Portado del `lib/kda.js` del Koberlet de escritorio, con dos cambios a proposito:
//
//   1. De CommonJS (require/module.exports) a modulos ES, que es lo que entiende
//      el empaquetador del WebView.
//   2. Aqui NO viaja ni una sola funcion que firme. En escritorio la firma vivia
//      en el proceso principal, fuera del alcance de la interfaz; en Android ese
//      papel lo hara el plugin Kotlin de la Fase 3. Si las funciones de firma se
//      copiaran ahora al WebView, un XSS en la pantalla -que pinta datos venidos
//      de la red- podria pedir firmas. Por eso este fichero se queda en consultas.
//
// La validacion de cuentas SI se trae entera: se usa antes de interpolar la cuenta
// en el codigo Pact de una consulta, y ese riesgo existe igual en lectura.

import { blake2b } from 'blakejs';
import { postJson, postJsonParseado, getJson } from '../red.js';

// --- Validacion de cuentas (hallazgo #5 de la auditoria de Alex) -------------
// Regla contrastada contra la propia cadena: charset LATIN1, longitud 3..256, y
// los 7 tipos de principal que reconoce Pact. Se acepta todo lo que la cadena
// acepta salvo lo que podria escapar del literal "..." donde se interpola.
const HASH43 = '[A-Za-z0-9_-]{43}';
const PNAME = '[A-Za-z0-9_-]+(?:[.][A-Za-z0-9_-]+)*';
const PRINCIPAL = {
    k: new RegExp('^k:[0-9a-fA-F]{64}$'),
    w: new RegExp('^w:' + HASH43 + ':' + PNAME + '$'),
    r: new RegExp('^r:' + PNAME + '$'),
    u: new RegExp('^u:' + PNAME + ':' + HASH43 + '$'),
    c: new RegExp('^c:' + HASH43 + '$'),
    p: new RegExp('^p:' + HASH43 + ':' + PNAME + '$'),
    m: new RegExp('^m:' + PNAME + ':' + PNAME + '$'),
};

export function cuentaKdaValida(cuenta) {
    if (typeof cuenta !== 'string') return false;
    if (cuenta.length < 3 || cuenta.length > 256) return false;
    for (let i = 0; i < cuenta.length; i++) {
        const c = cuenta.charCodeAt(i);
        // Comillas y barra invertida son lo unico capaz de escapar del literal Pact.
        // Los de control ensucian el JSON; por encima de 0xff la cadena lo rechaza.
        if (c < 0x20 || c === 0x22 || c === 0x5c || c === 0x7f || c > 0xff) return false;
    }
    const m = /^([A-Za-z]):/.exec(cuenta);
    if (m) {
        const re = PRINCIPAL[m[1]];
        return re ? re.test(cuenta) : false;   // prefijo de una letra sin principal valido
    }
    return true;                                // cuenta antigua con nombre
}

export function exigirCuentaKda(cuenta, papel) {
    if (!cuentaKdaValida(cuenta)) {
        throw new Error(`Cuenta Kadena ${papel || 'destino'} no valida o con caracteres no permitidos.`);
    }
}

// --- Consulta /local --------------------------------------------------------
function hashCmd(cmdStr) {
    return Buffer.from(blake2b(Buffer.from(cmdStr, 'utf8'), null, 32)).toString('base64url');
}

function base(nodo, networkId, chain) {
    return `${nodo}/chainweb/0.0/${networkId}/chain/${chain}/pact/api/v1`;
}

/**
 * Ejecuta codigo Pact en modo consulta. No firma, no gasta y no cambia nada en
 * la cadena: el nodo lo evalua y devuelve el resultado.
 */
export async function local(nodo, networkId, chain, code) {
    const cmd = {
        networkId,
        payload: { exec: { code, data: {} } },
        signers: [],
        meta: {
            chainId: String(chain), sender: '', gasLimit: 150000, gasPrice: 1e-8, ttl: 60,
            // 90 s de margen: el reloj del movil puede ir adelantado y el nodo
            // rechaza los comandos que dicen venir del futuro.
            creationTime: Math.floor(Date.now() / 1000) - 90,
        },
        nonce: String(Date.now()),
    };
    const cmdStr = JSON.stringify(cmd);
    const url = base(nodo, networkId, chain) + '/local?signatureVerification=false&preflight=false';
    const { json } = await postJsonParseado(url, { cmd: cmdStr, hash: hashCmd(cmdStr), sigs: [] });
    return json.result;
}

/**
 * Como `local`, pero PIDIENDO AL NODO QUE HAGA DE CUENTA QUE ESTA FIRMADO.
 *
 * `preflight=true` hace que el nodo compruebe lo que comprobaria de verdad: que
 * la cuenta tiene gas, que las capabilities que se declaran cubren lo que el
 * codigo hace, y cuanto gas gastaria. Sin firma ninguna: `signatureVerification`
 * sigue apagado, asi que esto NO mueve nada y NO necesita la clave.
 *
 * Es la unica forma honesta de decirle a alguien "esto saldria bien" antes de
 * pedirle la contraseña, y es con lo que empieza el Puente: primero ver que
 * pasaria, y solo despues -cuando este probado- firmar.
 *
 * @param firmantes  [{ pubKey, clist }] tal cual los espera Chainweb
 */
export async function simular(nodo, networkId, chain, code, firmantes, remitente, { gasLimit = 150000, data = {} } = {}) {
    const cmd = {
        networkId,
        payload: { exec: { code, data } },
        signers: firmantes || [],
        meta: {
            chainId: String(chain), sender: remitente || '', gasLimit, gasPrice: 1e-8, ttl: 600,
            creationTime: Math.floor(Date.now() / 1000) - 90,
        },
        nonce: String(Date.now()),
    };
    const cmdStr = JSON.stringify(cmd);
    const url = base(nodo, networkId, chain) + '/local?signatureVerification=false&preflight=true';
    const { json } = await postJsonParseado(url, { cmd: cmdStr, hash: hashCmd(cmdStr), sigs: [] });
    const pf = json.preflightResult;
    return { resultado: pf ? pf.result : json.result, gas: pf ? pf.gas : json.gas, code };
}

/**
 * Altura de la cadena (el "cut" del nodo). Es una peticion GET, asi que de paso
 * ejercita ese camino de la capa de red, que es el que usaran el historial y los
 * metadatos de NFT. Devuelve { altura, chains } o lanza.
 *
 * Tambien sirve de comprobacion honesta de a que nos hemos conectado: si el nodo
 * contesta un cut con 20 chains y altura creciente, es un Chainweb vivo.
 */
export async function alturaCadena(nodo, networkId) {
    const { json, ms } = await getJson(`${nodo}/chainweb/0.0/${networkId}/cut`);
    const alturas = Object.values(json.hashes || {}).map((h) => Number(h.height)).filter((n) => !isNaN(n));
    if (!alturas.length) throw new Error('El nodo no devolvio un cut reconocible.');
    return { altura: Math.max(...alturas), chains: alturas.length, ms };
}

// Chainweb devuelve los decimales como {decimal: "12.3"} o como numero suelto.
function aNumero(dato) {
    if (dato === null || dato === undefined) return NaN;
    if (typeof dato === 'object') return Number(dato.decimal !== undefined ? dato.decimal : dato);
    return Number(dato);
}

/**
 * Saldo de KDA nativo sumando las chains indicadas (por defecto las 20).
 * Devuelve { total, porChain, consultadas, fallos }.
 *
 * `fallos` importa: una chain que no contesta NO es lo mismo que una chain con
 * saldo cero, y ensenar un total mas bajo del real sin avisar seria mentir.
 */
export async function saldoKda(cuenta, { nodo, networkId, chains }) {
    exigirCuentaKda(cuenta, 'consultada');
    const lista = chains || Array.from({ length: 20 }, (_, i) => i);
    const porChain = {};
    const fallos = [];
    let total = 0;

    await Promise.all(lista.map(async (ch) => {
        try {
            const r = await local(nodo, networkId, ch, `(coin.get-balance "${cuenta}")`);
            if (r && r.status === 'success') {
                const v = aNumero(r.data);
                if (!isNaN(v) && v > 0) { porChain[ch] = v; total += v; }
            }
            // status 'failure' con "row not found" = la cuenta no existe en esa
            // chain. Es lo normal y no es un fallo de red.
        } catch (e) {
            fallos.push({ chain: ch, motivo: String(e.message || e) });
        }
    }));

    return { total, porChain, consultadas: lista.length, fallos };
}

/**
 * Manda al nodo un comando YA FIRMADO por el plugin ({cmd, hash, sigs}).
 * Aqui no hay nada secreto: esto es solo red. Devuelve el requestKey.
 */
export async function enviarComando(nodo, networkId, chain, firmado) {
    const url = base(nodo, networkId, chain) + '/send';
    const { json } = await postJsonParseado(url, { cmds: [firmado] });
    if (!json.requestKeys || !json.requestKeys.length) {
        throw new Error('El nodo no aceptó la transacción: ' + JSON.stringify(json).slice(0, 200));
    }
    return json.requestKeys[0];
}

/**
 * Espera a que la transaccion entre en un bloque. Devuelve el resultado, o null
 * si se acaban los intentos: que no aparezca a tiempo NO significa que haya
 * fallado, asi que el aviso al usuario tiene que decir eso mismo y darle el
 * requestKey para que lo mire despues.
 */
export async function esperarResultado(nodo, networkId, chain, requestKey,
                                       { intentos = 18, esperaMs = 5000, alMirar = null } = {}) {
    const url = base(nodo, networkId, chain) + '/poll';
    for (let i = 0; i < intentos; i++) {
        await new Promise((r) => setTimeout(r, esperaMs));
        let respondio = false;
        try {
            const { json } = await postJsonParseado(url, { requestKeys: [requestKey] });
            respondio = true;
            if (json && json[requestKey]) return json[requestKey];
        } catch (_) { /* el nodo puede fallar un intento suelto; se reintenta */ }
        // `alMirar` es para que la pantalla pueda contar lo que está pasando
        // mientras espera. Quien llama decide cada cuántas vueltas dice algo; aquí
        // solo se avisa de cada una, con cuál va y si el nodo contestó. Un fallo
        // suelto del nodo no para la espera, pero sí merece decirse: no es lo mismo
        // «todavía no está» que «no se puede preguntar».
        if (alMirar) {
            try { alMirar(i + 1, intentos, respondio); } catch (_) { /* pintar no puede romper la espera */ }
        }
    }
    return null;
}

// --- Envio entre chains: el segundo paso ------------------------------------
//
// Pasar KDA de una chain a otra es un `defpact` de DOS pasos. El primero se firma
// (lo hace el plugin Kotlin) y quita el dinero de la chain de origen. El segundo
// lo entrega en la de destino y **no lleva firma**: lo que lo autoriza es una
// PRUEBA SPV -un recibo criptografico de que el primer paso ocurrio de verdad-.
//
// Que no lleve firma tiene dos consecuencias buenas:
//
//   - se puede montar aqui, en JavaScript, sin tocar claves: no hay nada que
//     firmar y el destinatario ya quedo fijado en el paso uno;
//   - si el segundo paso no llega a salir, el dinero NO se pierde: se queda a
//     medio camino y lo puede rematar cualquiera -esta app la proxima vez, o el
//     escritorio- con el identificador del pacto.
//
// El gas del segundo paso lo paga `kadena-xchain-gas`, la gasolinera publica de
// la red, que existe justo para esto. Su guard solo admite pagar gas, a 1e-8 y
// con un limite de 850, asi que esos numeros no son decorativos: por encima de
// ahi rechaza pagar.
const GASOLINERA = 'kadena-xchain-gas';
const GAS_CONTINUACION = 850;

/**
 * Pide al nodo la prueba SPV del primer paso.
 *
 * Tarda: la chain de destino tiene que haber "visto" el bloque de la de origen, y
 * eso son unos cuantos bloques. Mientras no la ve, el nodo contesta que no puede,
 * y eso NO es un error: es que todavia no toca. Por eso se reintenta.
 */
export async function pruebaSpv(nodo, networkId, chainOrigen, requestKey, chainDestino, { intentos = 20, esperaMs = 6000 } = {}) {
    const url = base(nodo, networkId, chainOrigen) + '/spv';
    let ultimo = '';
    for (let i = 0; i < intentos; i++) {
        try {
            const { status, texto } = await postJson(url, { requestKey, targetChainId: String(chainDestino) });
            if (status === 200) {
                // Viene como un texto JSON entrecomillado.
                const limpio = texto.trim();
                return limpio.startsWith('"') ? JSON.parse(limpio) : limpio;
            }
            ultimo = texto;
        } catch (e) {
            ultimo = String(e.message || e);
        }
        await new Promise((r) => setTimeout(r, esperaMs));
    }
    // El detalle del nodo no se pega al mensaje a proposito: asi la frase es una
    // sola y se puede traducir. Lo que le sirve a quien mira la pantalla es saber
    // que hay que esperar, no el texto interno del nodo.
    if (ultimo) console.warn('SPV:', String(ultimo).slice(0, 200));
    throw new Error('La prueba del primer paso todavía no está lista. El dinero no se ha perdido: prueba otra vez en un minuto.');
}

/**
 * Monta y manda el segundo paso. Sin firma, con la prueba dentro.
 *
 * `pactId` es el requestKey del primer paso: en Kadena el pacto se llama igual
 * que la transaccion que lo abrio.
 */
export async function rematarEntreChains(nodo, networkId, chainDestino, pactId, prueba) {
    const cmd = JSON.stringify({
        networkId,
        payload: { cont: { pactId, step: 1, rollback: false, data: {}, proof: prueba } },
        signers: [],
        meta: {
            chainId: String(chainDestino),
            sender: GASOLINERA,
            gasLimit: GAS_CONTINUACION,
            gasPrice: 1e-8,
            ttl: 600,
            creationTime: Math.floor(Date.now() / 1000) - 90,
        },
        nonce: 'koberlet-android:' + Date.now(),
    });
    const url = base(nodo, networkId, chainDestino) + '/send';
    const { json } = await postJsonParseado(url, { cmds: [{ cmd, hash: hashCmd(cmd), sigs: [] }] });
    if (!json.requestKeys || !json.requestKeys.length) {
        throw new Error('El nodo no aceptó el segundo paso: ' + JSON.stringify(json).slice(0, 200));
    }
    return json.requestKeys[0];
}

/**
 * Saldo de fungibles KDA (PCO, SPT...). Los modulos vienen del codigo, nunca de
 * datos del usuario, pero se acotan igual antes de meterlos en el codigo Pact.
 */
export async function saldoTokens(cuenta, { nodo, networkId, tokens, chains }) {
    if (!Array.isArray(tokens) || !tokens.length) return [];
    exigirCuentaKda(cuenta, 'consultada');
    const lista = chains || Array.from({ length: 20 }, (_, i) => i);

    return Promise.all(tokens.map(async (tk) => {
        const modulo = /^[A-Za-z0-9_.-]+$/.test(String(tk.modulo)) ? String(tk.modulo) : null;
        const porChain = {};
        const fallos = [];
        let cantidad = 0;

        if (modulo) {
            await Promise.all(lista.map(async (ch) => {
                try {
                    const r = await local(nodo, networkId, ch, `(${modulo}.get-balance "${cuenta}")`);
                    if (r && r.status === 'success') {
                        const v = aNumero(r.data);
                        if (!isNaN(v) && v > 0) { porChain[ch] = v; cantidad += v; }
                    }
                } catch (e) {
                    fallos.push({ chain: ch, motivo: String(e.message || e) });
                }
            }));
        }

        // `propio` viaja de vuelta para que quien lo pinte pueda decir de donde
        // sale: los que trae la app no son lo mismo que los que ha pegado uno.
        return { simbolo: tk.simbolo, modulo: tk.modulo, propio: !!tk.propio, cantidad, porChain, fallos };
    }));
}

/**
 * Los tokens que esta cuenta ha MOVIDO, sacados de su historial.
 *
 * Es la forma de que el panel enseñe lo que uno tiene sin que nadie mantenga una
 * lista ni pegue contratos a mano: cada movimiento dice su modulo y su chain, asi
 * que se pregunta el saldo justo ahi en vez de barrer las 20 chains. Un token
 * que te han mandado tambien cuenta, porque recibirlo es un movimiento.
 *
 * Lo que NO ve: un token que este en la cuenta sin haber pasado nunca por el
 * indexador. Para eso estan los de fabrica y los puestos a mano.
 *
 * @param movs  lo que devuelve movimientos(): cada uno con { token, chain }
 * @param yaEstan  modulos que ya se enseñan, para no preguntarlos dos veces
 */
export async function tokensDelHistorial(cuenta, { nodo, networkId, movs, yaEstan = [] }) {
    if (!Array.isArray(movs) || !movs.length) return [];
    exigirCuentaKda(cuenta, 'consultada');

    // Un modulo por chain: si el mismo token se movio en la 1 y en la 3, se
    // pregunta en las dos.
    const vistos = new Map();
    for (const m of movs) {
        const mod = String(m && m.token || '');
        if (!mod || mod === 'coin' || mod === 'KDA') continue;
        // La misma regla que en el resto del fichero: lo que entra en un codigo
        // Pact no puede traer comillas, espacios ni parentesis.
        if (!/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$/.test(mod)) continue;
        if (yaEstan.includes(mod)) continue;
        vistos.set(mod + '|' + m.chain, { modulo: mod, chain: String(m.chain) });
    }

    const encontrados = new Map();
    await Promise.all([...vistos.values()].map(async (v) => {
        try {
            const r = await local(nodo, networkId, v.chain, `(${v.modulo}.get-balance "${cuenta}")`);
            if (!r || r.status !== 'success') return;
            const n = aNumero(r.data);
            if (isNaN(n) || n <= 0) return;
            const ya = encontrados.get(v.modulo);
            if (ya) {
                ya.cantidad += n;
                ya.porChain[v.chain] = n;
            } else {
                encontrados.set(v.modulo, {
                    // El simbolo es la ultima parte del modulo, que es como se
                    // llama el token en la cadena. No hay nombre mas fiable: el
                    // bonito se lo pone cada web.
                    simbolo: v.modulo.split('.').pop(),
                    modulo: v.modulo,
                    descubierto: true,
                    cantidad: n,
                    porChain: { [v.chain]: n },
                    fallos: [],
                });
            }
        } catch (_) {
            // Esa cuenta ya no tiene fila en ese token: no es un fallo que contar.
        }
    }));
    return [...encontrados.values()];
}
