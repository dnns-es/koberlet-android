// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// WALLETCONNECT: firmar en paginas web de Kadena desde el movil.
//
// El movil es el sitio natural de esto: la pagina saca un codigo QR en el
// ordenador, lo lees con la camara y firmas aqui. Es el flujo para el que se
// invento WalletConnect, y la camara y el lector de QR ya estaban hechos.
//
// QUE SE HABLA (KIP-017, el estandar de Kadena sobre WalletConnect):
//   - la sesion se abre sobre `kadena:mainnet01`;
//   - las cuentas viajan como `kadena:mainnet01:<clave publica>`, y la pagina
//     deduce de ahi la cuenta `k:<clave publica>`. Ese formato exacto se comprobo
//     contra play.smartpacts.io el 24/09/2026 desde el Koberlet de escritorio: con
//     otro, la web dice que el monedero "conecto para otra red" y corta;
//   - `kadena_getAccounts_v1` se contesta aqui: no mueve dinero y son cuentas que
//     el dueño ya acepto enseñar al conectar;
//   - `kadena_quicksign_v1` es "firma esto", y NO se contesta solo jamas: sale por
//     `alPedirFirma` para que la pantalla lo desmenuce y lo apruebe una persona.
//   - `kadena_sign_v1` es lo mismo pero la web manda las piezas en vez del comando
//     hecho; se monta en `wc-comando.js` y a partir de ahi va por el mismo camino.
//
// La clave nunca pasa por aqui: esto recibe el comando, la pantalla lo enseña y la
// boveda nativa lo firma tras pedir contrasena o huella.

import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';
// Lo que se le ofrece a la web vive aparte, sin SDK, para poder probarlo sin
// navegador: es justo la pieza que fallaba con mercatusdex.fun.
import { loQuePide, namespacesParaAprobar, claveDeCuenta } from './wc-namespaces.js';
import { comandoDeFirma } from './wc-comando.js';

// El identificador del proyecto en el rele. No es un secreto -viaja dentro de todos
// los monederos, se lee del propio paquete- pero va en el codigo y no en los ajustes
// para que no se pueda desviar el trafico cambiandolo desde fuera.
const PROJECT_ID = 'b0e3e11cc9ca4e31921e2ff7228a0f44';

export const CADENA = 'kadena:mainnet01';
// `kadena_sign_v1` desde la 0.59.5: mercatusdex.fun lo exige y sin el no conecta.
export const METODOS = ['kadena_getAccounts_v1', 'kadena_quicksign_v1', 'kadena_sign_v1'];

/**
 * Lo que pidio cada propuesta que sigue en el aire, guardado hasta que se acepta
 * o se rechaza.
 *
 * Hace falta porque **lo que se aprueba tiene que cubrir lo que se pidio**: el
 * SDK compara una cosa con otra y, si falta una sola red, tira la conexion entera
 * con un «Non conforming namespaces» en ingles. Es lo que le paso a Antonio el
 * 25/09/2026 con mercatusdex.fun: la web pedia mainnet01, testnet04 y development,
 * y aqui se aprobaba siempre mainnet01 a secas.
 */
const pendientes = new Map();

const METADATOS = {
    name: 'Koberlet',
    description: 'Monedero Kadena de DNNS',
    url: 'https://descargas.dnns.es',
    icons: [],
};

let kit = null;
let arrancando = null;

/**
 * Cuanto se espera a cada cosa antes de decir que no va.
 *
 * Sin esto, cuando el socket con el rele no llega a abrirse -cobertura mala, una
 * wifi con portal cautivo, el rele caido- NADA falla: el SDK se queda esperando
 * para siempre y la pantalla se queda con un «Conectando…» eterno que no dice
 * nada. Un limite convierte eso en una frase que se puede leer y actuar.
 */
const ESPERA_MS = 25000;

function conLimite(promesa, codigo) {
    let reloj;
    return Promise.race([
        promesa.finally(() => clearTimeout(reloj)),
        new Promise((_, no) => { reloj = setTimeout(() => no(new Error(codigo)), ESPERA_MS); }),
    ]);
}

/** ¿Hay socket abierto con el relé ahora mismo? Para poder decirlo en pantalla. */
export function conectadoAlRele() {
    try { return !!(kit && kit.core && kit.core.relayer && kit.core.relayer.connected); }
    catch (_) { return false; }
}

/**
 * Arranca el transporte. Se llama cuando el dueño entra en la seccion, no al abrir
 * la app: mantener un socket abierto todo el rato gasta bateria y no sirve de nada
 * mientras no haya ninguna web conectada.
 *
 * La promesa se guarda mientras arranca: si se entra y se pulsa enseguida, la
 * segunda llamada espera a la primera en vez de montar OTRO transporte a la vez.
 * Dos `init` en paralelo dejaban dos juegos de manejadores sobre el mismo
 * almacen y la pantalla podia quedarse esperando a la que no era.
 */
export async function arrancar({ alProponer, alPedirFirma, alCerrar }) {
    if (kit) return kit;
    if (arrancando) return arrancando;
    arrancando = arrancarDeVerdad({ alProponer, alPedirFirma, alCerrar })
        .finally(() => { arrancando = null; });
    return arrancando;
}

async function arrancarDeVerdad({ alProponer, alPedirFirma, alCerrar }) {
    const core = new Core({ projectId: PROJECT_ID });
    kit = await conLimite(WalletKit.init({ core, metadata: METADATOS }), 'WC_SIN_RELE');

    kit.on('session_proposal', (p) => {
        const m = (p.params && p.params.proposer && p.params.proposer.metadata) || {};
        const ns = Object.assign({}, p.params.requiredNamespaces, p.params.optionalNamespaces);
        pendientes.set(p.id, {
            obliga: loQuePide(p.params.requiredNamespaces),
            suelta: loQuePide(p.params.optionalNamespaces),
        });
        alProponer({
            id: p.id,
            // OJO: nombre y direccion los declara la propia web. Son una pista para
            // reconocerla, NO una prueba de quien es. La pantalla lo dice.
            nombre: String(m.name || '?'),
            url: String(m.url || '?'),
            metodos: (ns.kadena || {}).methods || [],
        });
    });

    kit.on('session_request', async (ev) => {
        const { topic, params, id } = ev;
        const metodo = params && params.request && params.request.method;
        const sesion = kit.getActiveSessions()[topic];
        const quien = (sesion && sesion.peer && sesion.peer.metadata) || {};

        if (metodo === 'kadena_getAccounts_v1') {
            try { await responder(topic, id, cuentasDeSesion(sesion)); }
            catch (e) { await fallar(topic, id, e.message); }
            return;
        }
        if (metodo === 'kadena_quicksign_v1') {
            const comandos = (params.request.params && params.request.params.commandSigDatas) || [];
            alPedirFirma({
                id, topic, metodo,
                nombre: String(quien.name || '?'),
                url: String(quien.url || '?'),
                comandos: comandos.map((c) => ({ cmd: String(c.cmd || '') })),
            });
            return;
        }
        if (metodo === 'kadena_sign_v1') {
            // Aqui la web manda las piezas y el comando se monta en `wc-comando.js`.
            // Lo que sale de ahi pasa por la MISMA pantalla que un quicksign: se
            // desmenuza, se enseña y lo aprueba una persona.
            let cmd;
            try {
                const pet = (params.request && params.request.params) || {};
                const cuerpo = pet.body || pet;
                // Con que clave se firma: la del `sender` si es una cuenta k:, y si
                // no, la primera de la sesion. Si esa clave no esta en este aparato
                // lo dice la pantalla, que es donde se busca la cartera.
                const sender = String(cuerpo.sender || '');
                const clave = /^k:[0-9a-f]{64}$/i.test(sender)
                    ? sender.slice(2).toLowerCase()
                    : (cuentasDeSesion(sesion).accounts[0] || {}).publicKey;
                // La red la manda la SESION, no el mensaje: se aprobo para unas
                // redes concretas y la peticion dice en cual de ellas va.
                const red = String(params.chainId || CADENA).split(':')[1] || 'mainnet01';
                cmd = comandoDeFirma(pet, red, clave);
            } catch (e) {
                // Esto le llega a la WEB: que diga que metodo y que falto, para que
                // quien la programa pueda arreglarlo sin adivinar.
                await fallar(topic, id, 'kadena_sign_v1 mal formado: ' + e.message);
                return;
            }
            alPedirFirma({
                id, topic, metodo,
                nombre: String(quien.name || '?'),
                url: String(quien.url || '?'),
                comandos: [{ cmd }],
            });
            return;
        }
        await fallar(topic, id, 'método no soportado: ' + metodo);
    });

    kit.on('session_delete', (ev) => { try { alCerrar && alCerrar(ev.topic); } catch (_) { /* pintar no puede romper esto */ } });
    return kit;
}

/**
 * Las cuentas que se le contestan a `kadena_getAccounts_v1`.
 *
 * Se quita la red de delante por el ÚLTIMO `:`, no contando letras: desde que una
 * sesion puede llevar varias redes, las cuentas ya no miden todas lo mismo
 * (`kadena:mainnet01:…` y `kadena:development:…`). Y se deduplica por clave: la
 * misma cuenta repetida una vez por red no es informacion, es ruido.
 */
function cuentasDeSesion(sesion) {
    const lista = ((sesion && sesion.namespaces && sesion.namespaces.kadena) || {}).accounts || [];
    const vistas = new Set();
    const unicas = lista.filter((caip) => {
        const pub = claveDeCuenta(caip);
        if (vistas.has(pub)) return false;
        vistas.add(pub);
        return true;
    });
    return {
        accounts: unicas.map((caip) => {
            const pub = claveDeCuenta(caip);
            return {
                account: caip,
                publicKey: pub,
                kadenaAccounts: [{ name: 'k:' + pub, contract: 'coin', chains: [] }],
            };
        }),
    };
}

export async function emparejar(uri) {
    if (!kit) throw new Error('El transporte no está arrancado.');
    const limpia = String(uri || '').trim();
    // Se valida antes de dársela al SDK para poder decir algo util: casi todos los
    // fallos aqui son haber leido otro QR cualquiera, no un problema de red.
    if (!/^wc:[0-9a-f]{64}@2\?/i.test(limpia)) throw new Error('WC_URI_MALA');
    // Con limite por lo mismo que el arranque: sin socket, `pair` no falla, se
    // queda esperando. Y un enlace caducado tampoco se queja: la web ya no esta
    // escuchando al otro lado, asi que el aviso tiene que decir las dos cosas.
    return conLimite(kit.pair({ uri: limpia }), 'WC_SIN_RESPUESTA');
}

/**
 * Aprueba la sesion OFRECIENDO LO QUE LA WEB PIDIO, no lo que nos venga bien.
 *
 * Antes se aprobaba `kadena:mainnet01` y punto. Con las webs que solo piden esa
 * red funcionaba; con una que pida ademas testnet04 y development -mercatusdex.fun,
 * por ejemplo- el SDK rechaza la conexion entera antes de que llegue a ninguna
 * parte. No es capricho suyo: una sesion que no cubre lo que se pidio dejaria a la
 * web llamando a una red que el monedero nunca acepto.
 *
 * Ofrecer las tres redes es HONESTO y no regala nada: en Kadena la misma clave es
 * la misma cuenta en cualquier red, y la red en la que se firma de verdad va
 * dentro del comando que se firma, que se enseña entero antes de pedir la
 * contraseña. Lo que NO se hace es prometer metodos o avisos que no sabemos
 * atender: eso se dice aqui y no se conecta, porque una sesion que se cae al
 * primer uso es peor que un «no» a tiempo.
 */
export async function aprobarSesion(id, claves) {
    if (!kit) throw new Error('El transporte no está arrancado.');
    const namespaces = namespacesParaAprobar(
        pendientes.get(id), claves, { cadena: CADENA, metodos: METODOS },
    );
    const sesion = await kit.approveSession({ id, namespaces });
    pendientes.delete(id);
    return sesion;
}

export async function rechazarSesion(id) {
    if (!kit) throw new Error('El transporte no está arrancado.');
    pendientes.delete(id);
    return kit.rejectSession({ id, reason: { code: 5000, message: 'rechazado en el monedero' } });
}

export async function responder(topic, id, result) {
    return kit.respondSessionRequest({ topic, response: { id, jsonrpc: '2.0', result } });
}

export async function fallar(topic, id, mensaje) {
    return kit.respondSessionRequest({
        topic,
        response: { id, jsonrpc: '2.0', error: { code: 5000, message: String(mensaje || 'rechazado') } },
    });
}

export function sesiones() {
    if (!kit) return [];
    const act = kit.getActiveSessions();
    return Object.keys(act).map((topic) => {
        const s = act[topic];
        const m = (s.peer && s.peer.metadata) || {};
        return {
            topic,
            nombre: String(m.name || '?'),
            url: String(m.url || '?'),
            cuentas: ((s.namespaces && s.namespaces.kadena) || {}).accounts || [],
        };
    });
}

export async function desconectar(topic) {
    if (!kit) return;
    try { await kit.disconnectSession({ topic, reason: { code: 6000, message: 'cerrado por el usuario' } }); }
    catch (_) { /* si ya no existe, no hay nada que cerrar */ }
}

/**
 * Desmenuza un comando para poder enseñarlo. Si no se entiende se dice que no se
 * entiende: adornar un comando ilegible con un resumen bonito es justo como se
 * cuela una firma que nadie ha leido.
 */
export function explicar(cmdStr) {
    try {
        const j = JSON.parse(cmdStr);
        const exec = (j.payload && j.payload.exec) || {};
        const cont = (j.payload && j.payload.cont) || null;
        const permisos = [];
        for (const s of (j.signers || [])) {
            for (const c of (s.clist || [])) {
                const args = (c.args || []).map((a) => (a && typeof a === 'object' && a.decimal !== undefined) ? a.decimal : a);
                permisos.push({ nombre: String(c.name || ''), args, mueveDinero: /\.TRANSFER/i.test(String(c.name || '')) });
            }
        }
        return {
            legible: true,
            red: String(j.networkId || ''),
            chain: String((j.meta && j.meta.chainId) || ''),
            pagaGas: String((j.meta && j.meta.sender) || ''),
            // Coste maximo del gas ya multiplicado: dos numeros raros que hay que
            // multiplicar en la cabeza es como no decirlo.
            gasMax: Number(((j.meta && j.meta.gasLimit) || 0) * ((j.meta && j.meta.gasPrice) || 0)),
            codigo: String(exec.code || (cont ? 'continuación de un pacto (' + cont.pactId + ')' : '')),
            firmantes: (j.signers || []).map((s) => String(s.pubKey || '')),
            permisos,
        };
    } catch (e) {
        return { legible: false, crudo: String(cmdStr).slice(0, 2000) };
    }
}
