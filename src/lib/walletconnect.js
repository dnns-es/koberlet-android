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
//
// La clave nunca pasa por aqui: esto recibe el comando, la pantalla lo enseña y la
// boveda nativa lo firma tras pedir contrasena o huella.

import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';

// El identificador del proyecto en el rele. No es un secreto -viaja dentro de todos
// los monederos, se lee del propio paquete- pero va en el codigo y no en los ajustes
// para que no se pueda desviar el trafico cambiandolo desde fuera.
const PROJECT_ID = 'b0e3e11cc9ca4e31921e2ff7228a0f44';

export const CADENA = 'kadena:mainnet01';
export const METODOS = ['kadena_getAccounts_v1', 'kadena_quicksign_v1'];

const METADATOS = {
    name: 'Koberlet',
    description: 'Monedero Kadena de DNNS',
    url: 'https://descargas.dnns.es',
    icons: [],
};

let kit = null;

/**
 * Arranca el transporte. Se llama cuando el dueño entra en la seccion, no al abrir
 * la app: mantener un socket abierto todo el rato gasta bateria y no sirve de nada
 * mientras no haya ninguna web conectada.
 */
export async function arrancar({ alProponer, alPedirFirma, alCerrar }) {
    if (kit) return kit;
    const core = new Core({ projectId: PROJECT_ID });
    kit = await WalletKit.init({ core, metadata: METADATOS });

    kit.on('session_proposal', (p) => {
        const m = (p.params && p.params.proposer && p.params.proposer.metadata) || {};
        const ns = Object.assign({}, p.params.requiredNamespaces, p.params.optionalNamespaces);
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
                id, topic,
                nombre: String(quien.name || '?'),
                url: String(quien.url || '?'),
                comandos: comandos.map((c) => ({ cmd: String(c.cmd || '') })),
            });
            return;
        }
        await fallar(topic, id, 'método no soportado: ' + metodo);
    });

    kit.on('session_delete', (ev) => { try { alCerrar && alCerrar(ev.topic); } catch (_) { /* pintar no puede romper esto */ } });
    return kit;
}

function cuentasDeSesion(sesion) {
    const lista = ((sesion && sesion.namespaces && sesion.namespaces.kadena) || {}).accounts || [];
    return {
        accounts: lista.map((caip) => {
            const pub = caip.slice(CADENA.length + 1);
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
    return kit.pair({ uri: limpia });
}

export async function aprobarSesion(id, claves) {
    if (!kit) throw new Error('El transporte no está arrancado.');
    const buenas = (claves || []).filter((k) => /^[0-9a-f]{64}$/i.test(k));
    if (!buenas.length) throw new Error('No hay ninguna cuenta que ofrecer.');
    return kit.approveSession({
        id,
        namespaces: {
            kadena: {
                chains: [CADENA],
                methods: METODOS,
                events: [],
                // EL ORDEN IMPORTA: las webs se quedan con la primera cuenta de la
                // lista. La elegida va delante.
                accounts: buenas.map((k) => CADENA + ':' + k.toLowerCase()),
            },
        },
    });
}

export async function rechazarSesion(id) {
    if (!kit) throw new Error('El transporte no está arrancado.');
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
