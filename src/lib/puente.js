// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// PUENTE KINESIS (Hyperlane v3 del fork). AQUI NO SE FIRMA NADA.
//
// Este es el trozo mas delicado de todo el monedero, y se porta al movil por
// partes, empezando por las que no pueden perder dinero de nadie:
//
//   1. VER los saldos de los tokens puenteados (kb-USDC, kb-USDT, kb-DAI,
//      kb-WBTC) que ya tiene la cuenta en Kadena.
//   2. SIMULAR un envio Kadena -> Ethereum: el nodo dice si saldria bien, cuanto
//      gas costaria y cuanto peaje cobra el puente. Sin firma y sin mover nada.
//   3. Dar el CUSTODIO de la cuenta, que es el dato exacto que hay que poner como
//      destinatario al mandar desde Ethereum. Ver mas abajo por que esto es
//      justo lo que salva dinero.
//   4. COMPROBAR si un mensaje ya lo entrego el relayer en la otra orilla.
//
// Firmar el envio de verdad NO esta aqui a proposito: son tres capabilities
// (TRANSFER_REMOTE del token, coin.TRANSFER del peaje y coin.GAS), y eso se monta
// en Kotlin, como los envios de KDA, no en la pantalla. Mientras no este hecho y
// probado, esta seccion lo dice por escrito en vez de ofrecer un boton.
//
// LO QUE SE SABE DEL PUENTE, DE PRIMERA MANO (auditoria propia, julio-agosto 2026,
// compartida en privado con los desarrolladores del fork). Va escrito aqui porque
// quien lee este fichero tiene que saber a que esta ayudando:
//
//   - G2 (critico): en Ethereum, el dueño de los contratos del puente y del
//     proxy que se puede actualizar es UNA sola llave suelta (no un multisig).
//     Reproducido en laboratorio: con esa llave se vacia el colateral de una ruta
//     en una sola transaccion. O sea: kb-USDC no es "USDC seguro"; su respaldo
//     entero cuelga de esa clave.
//   - R1 (perdida permanente): si el destinatario que se manda desde Ethereum no
//     es el CUSTODIO de la cuenta Kadena con el formato exacto, el token queda
//     bloqueado en Ethereum y no se acuña en Kadena. No hay revert, ni rescate, ni
//     aviso: se pierde. Nos paso con 1 USDC de prueba, y esta confirmado por un
//     desarrollador del nucleo. Por eso el punto 3 de arriba no es un adorno.
//   - I1: un importe negativo por el cable podia acuñar sin tope en la orilla
//     sintetica (arreglado en el nodo; la auditoria sigue abierta en lo demas).
//
// Con eso sobre la mesa, lo unico responsable que puede decir una app es: esto es
// experimental, y con importes pequeños.

import { local, simular, exigirCuentaKda } from './kda.js';
import { postJsonParseado } from '../red.js';

// El namespace del puente en la cadena del fork. Va en el CODIGO, nunca en datos
// que pueda tocar la pantalla (hallazgo #4 de la auditoria de Alex).
export const NS = 'n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff';

// Las dos orillas. 626 es el dominio Hyperlane de esta Kadena; 1, el de Ethereum.
export const DOMINIO_KDA = 626;
export const DOMINIO_EVM = 1;
export const CHAIN_PUENTE = 2;        // el puente vive en la chain 2 de Kadena

// LA UNICA RUTA QUE HAY. El puente tiene contratos desplegados para USDT, DAI y
// WBTC -estan en el escritorio, con sus direcciones-, pero el par que de verdad
// esta contemplado en los dos sentidos es USDC <-> kb-USDC (Antonio, 12/09/2026).
// Enseñar las otras tres aqui solo serviria para que alguien mandara dinero por
// un camino que nadie ha recorrido; en un puente donde un error no se devuelve,
// eso no es "dar opciones", es dejar una trampa abierta.
//
// Las mayusculas de la direccion EVM son su suma de verificacion (EIP-55):
// copiarla mal no es un detalle de estilo, es otra direccion.
export const RUTAS = [
    { simbolo: 'USDC', modulo: 'kb-USDC', decimales: 6, evmToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', evmRouter: '0x81C2813aa88F66bca1e55838045Aaceb72FEbFc1' },
];

// El mailbox del puente en Ethereum. OJO: es el del FORK, no el oficial de
// Hyperlane. Solo se usa para PREGUNTAR si un mensaje ya se entrego.
const MAILBOX_EVM = '0x82A729A4c7B2aeBDdbFCCF533e7B75c61c45c23c';
const SELECTOR_DELIVERED = '0xe495f1d4';   // delivered(bytes32)

// Nodos publicos de Ethereum, solo para esa pregunta de lectura. Se prueban en
// orden: uno puede estar vivo y aun asi no servir para esta llamada.
const RPC_EVM = ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'];

export function rutaPorSimbolo(simbolo) {
    return RUTAS.find((r) => r.simbolo === simbolo) || null;
}

/**
 * Saldos de los tokens puenteados en Kadena.
 *
 * Importa la diferencia entre un cero de verdad y un "no se sabe": que la cuenta
 * no tenga aun ese token da un error de "row not found", y ESO si es un cero. Un
 * nodo que no contesta, no. Pintar los dos igual haria que un fallo de red se
 * leyera como "no tienes nada", y con eso se toman decisiones.
 */
export async function saldosKb(cuenta, red) {
    exigirCuentaKda(cuenta, 'consultada');
    return Promise.all(RUTAS.map(async (ruta) => {
        try {
            const r = await local(red.nodo, red.networkId, CHAIN_PUENTE, `(${NS}.${ruta.modulo}.get-balance "${cuenta}")`);
            if (r && r.status === 'success') {
                const d = r.data;
                const v = typeof d === 'object' && d !== null ? Number(d.decimal ?? d.int ?? 0) : Number(d);
                return { ...ruta, saldo: isNaN(v) ? null : v };
            }
            const err = JSON.stringify((r && r.error) || r || '');
            if (/row not found|No value found|does not exist/i.test(err)) return { ...ruta, saldo: 0 };
            return { ...ruta, saldo: null, motivo: err.slice(0, 200) };
        } catch (e) {
            return { ...ruta, saldo: null, motivo: String(e.message || e).slice(0, 200) };
        }
    }));
}

// --- El peaje ---------------------------------------------------------------
//
// El puente cobra en KDA por el gas de la otra orilla, y lo cotiza el nodo. Ese
// numero no viene firmado por nadie: un nodo manipulado podria inflarlo. Como en
// el escritorio, se pone un techo absoluto muy por encima del peaje real (~37 KDA
// hacia Ethereum) para que la simulacion no acabe pidiendo firmar una capability
// de coin.TRANSFER desorbitada, y se comprueba que la cuenta del peaje tiene
// forma de cuenta Kadena.
const PEAJE_MAX = 100;

export async function peaje(red, dominio = DOMINIO_EVM) {
    const code = `[${NS}.igp.IGP_ACCOUNT (${NS}.igp.quote-gas-payment ${dominio})]`;
    const r = await local(red.nodo, red.networkId, CHAIN_PUENTE, code);
    if (!r || r.status !== 'success' || !Array.isArray(r.data)) {
        throw new Error('No se pudo leer el peaje del puente.');
    }
    const cuentaPeaje = r.data[0];
    const q = r.data[1];
    const cuanto = typeof q === 'object' && q !== null ? Number(q.decimal ?? q.int) : Number(q);
    if (typeof cuentaPeaje !== 'string' || !cuentaPeaje || cuentaPeaje.length > 200) {
        throw new Error('La cuenta del peaje del puente no es válida (el nodo puede estar manipulado).');
    }
    if (!Number.isFinite(cuanto) || cuanto < 0 || cuanto > PEAJE_MAX) {
        throw new Error('El peaje del puente está fuera de lo razonable; mejor no seguir.');
    }
    return { cuentaPeaje, cuanto };
}

// --- Destinatarios ----------------------------------------------------------

/** Direccion EVM -> los 32 bytes que viajan por el cable, en base64url. */
export function destinoEvm(direccion) {
    const a = String(direccion).trim().replace(/^0x/i, '');
    if (!/^[0-9a-fA-F]{40}$/.test(a)) throw new Error('La dirección de Ethereum tiene que ser 0x y 40 caracteres.');
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 20; i++) bytes[12 + i] = parseInt(a.slice(i * 2, i * 2 + 2), 16);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * El CUSTODIO de una cuenta Kadena: lo que hay que poner como destinatario al
 * mandar desde Ethereum hacia aqui.
 *
 * No es la cuenta ni la clave publica a secas: es el guardian de la cuenta escrito
 * en JSON, tal cual, sin espacios y con `pred` delante. Lo confirmo un
 * desarrollador del nucleo del fork despues de que perdieramos 1 USDC de prueba
 * mandando la clave suelta. Si esto va mal, el token se queda bloqueado en
 * Ethereum para siempre.
 */
export function custodioDe(cuentaKda) {
    const pk = String(cuentaKda).trim().replace(/^k:/, '');
    if (!/^[0-9a-fA-F]{64}$/.test(pk)) throw new Error('Para el puente la cuenta Kadena tiene que ser k: y 64 caracteres.');
    const json = `{"pred":"keys-all","keys":["${pk}"]}`;
    let hex = '0x';
    for (let i = 0; i < json.length; i++) hex += json.charCodeAt(i).toString(16).padStart(2, '0');
    return { json, hex };
}

// --- Simulacion Kadena -> Ethereum ------------------------------------------

/**
 * Le pregunta al nodo que pasaria si se enviara, sin firmar y sin mover nada.
 *
 * Las capabilities son las mismas que llevaria el envio de verdad, y el `int` del
 * dominio va tipado a proposito: escrito "a pelo" el nodo lo lee como decimal y la
 * capability no encaja ("Keyset failure"). Ese detalle costo un rato en el
 * escritorio y aqui viene ya aprendido.
 */
export async function simularHaciaEvm({ cuenta, red, simbolo, cantidad, destino }) {
    exigirCuentaKda(cuenta, 'remitente');
    const ruta = rutaPorSimbolo(simbolo);
    if (!ruta) throw new Error('Esa ruta del puente no existe.');
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n <= 0) throw new Error('La cantidad tiene que ser mayor que cero.');
    const pubKey = String(cuenta).replace(/^k:/, '');
    if (!/^[0-9a-fA-F]{64}$/.test(pubKey)) throw new Error('Para el puente la cuenta Kadena tiene que ser k: y 64 caracteres.');

    const rec = destinoEvm(destino);
    const { cuentaPeaje, cuanto } = await peaje(red, DOMINIO_EVM);
    const tope = Number((cuanto * 1.05).toFixed(12));   // 5% de margen por si el oráculo se mueve

    // Los decimales van como TEXTO dentro de {decimal: "..."}, igual que en el
    // resto de la app y -sobre todo- igual que en el comando que firma Kotlin.
    //
    // Que aquí fuera un número suelto costó una simulación entera: el nodo
    // respondía «Type check failed. The argument is object but the expected type
    // is decimal» (visto en el móvil el 14/09/2026). `{decimal: 58.42}` con un
    // número dentro NO es la forma literal que Pact reconoce; la forma es con el
    // número escrito. Y con un importe redondo era peor todavía: escribir `5` a
    // pelo hace que el nodo lo lea como entero y la capability tampoco encaja.
    //
    // No se arregla solo por que funcione: simular sirve para saber qué va a pasar
    // al firmar, y eso exige que los dos manden EXACTAMENTE lo mismo. Los 12
    // decimales son los de `decimalCanonico` en Kotlin.
    const monto = n.toFixed(12);
    const code = `(${NS}.mailbox.dispatch ${NS}.${ruta.modulo} ${DOMINIO_EVM} "${rec}" ${monto})`;
    const clist = [
        { name: 'coin.GAS', args: [] },
        { name: `${NS}.${ruta.modulo}.TRANSFER_REMOTE`, args: [{ int: DOMINIO_EVM }, cuenta, rec, { decimal: monto }] },
        { name: 'coin.TRANSFER', args: [cuenta, cuentaPeaje, { decimal: tope.toFixed(12) }] },
    ];

    const { resultado, gas } = await simular(red.nodo, red.networkId, CHAIN_PUENTE, code, [{ pubKey, clist }], cuenta);
    return {
        code,
        bien: !!resultado && resultado.status === 'success',
        motivo: resultado && resultado.status !== 'success'
            ? JSON.stringify(resultado.error || resultado).slice(0, 300)
            : null,
        gas,
        peaje: cuanto,
        cuentaPeaje,
        destinoCable: rec,
    };
}

// --- ¿Llego a la otra orilla? ------------------------------------------------

/**
 * El identificador del mensaje que salio de un dispatch en Kadena.
 *
 * Es el resultado de la transaccion: 32 bytes en base64url que hay que leer en
 * hexadecimal, que es como los conoce Ethereum.
 */
export async function idMensajeDe(requestKey, red) {
    const rk = String(requestKey).trim();
    if (!/^[A-Za-z0-9_-]{43}$/.test(rk)) throw new Error('Esa referencia de transacción no tiene la forma de una de Kadena.');
    const url = `${red.nodo}/chainweb/0.0/${red.networkId}/chain/${CHAIN_PUENTE}/pact/api/v1/poll`;
    const { json } = await postJsonParseado(url, { requestKeys: [rk] });
    const r = json && json[rk] && json[rk].result;
    if (!r) throw new Error('Esa transacción todavía no está en un bloque, o no es de esta chain.');
    if (r.status !== 'success') throw new Error('Esa transacción falló en Kadena, así que no salió ningún mensaje.');
    const dato = typeof r.data === 'string' ? r.data : null;
    if (!dato || !/^[A-Za-z0-9_-]{43}$/.test(dato)) {
        throw new Error('Esa transacción no devolvió un identificador de mensaje: puede que no fuera un envío por el puente.');
    }
    const bin = atob(dato.replace(/-/g, '+').replace(/_/g, '/') + '=');
    let hex = '0x';
    for (let i = 0; i < bin.length; i++) hex += bin.charCodeAt(i).toString(16).padStart(2, '0');
    return hex;
}

/**
 * Pregunta al mailbox de Ethereum si ese mensaje ya se entrego.
 *
 * Esto contesta la pregunta que de verdad se hace uno cuando manda algo por un
 * puente: "¿ha llegado?". El escritorio lo resolvia esperando seis minutos y
 * escribiendo "pendiente" para siempre si no le cuadraban los saldos; asi es la
 * cadena la que responde, y se puede volver a preguntar mañana.
 */
export async function entregadoEnEvm(idMensaje) {
    const id = String(idMensaje).trim().toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(id)) throw new Error('El identificador del mensaje tiene que ser 0x y 64 caracteres.');
    const { valor, nodo } = await ethCall({ to: MAILBOX_EVM, data: SELECTOR_DELIVERED + id.slice(2) });
    return { entregado: /[1-9a-f]/i.test(valor.slice(2)), nodo };
}

// --- El lado de Ethereum -----------------------------------------------------
//
// Todo esto es LECTURA: saber si tienes USDC, si el puente tiene permiso para
// cogerlo, cuanto cobra por el viaje, y si la llamada pasaria. Ni una firma.
//
// Se hace a pelo, sin libreria de Ethereum, por tres motivos: la codificacion de
// estas cuatro llamadas cabe en veinte lineas, meter `ethers` aqui sumaria 180 kB
// al APK, y su proveedor tiene la costumbre de quedarse reintentando para siempre
// si el nodo no contesta -eso ya nos paso en el escritorio-.
//
// Los selectores estan calculados con el keccak de las herramientas de la
// auditoria y comprobados contra el de `delivered`, que ya se sabia bueno.
const SEL = {
    balanceOf: '0x70a08231',                 // balanceOf(address)
    allowance: '0xdd62ed3e',                 // allowance(address,address)
    quoteGasPayment: '0xf2ed8c53',           // quoteGasPayment(uint32)
    transferRemote: '0x80eefc06',            // transferRemote(uint32,bytes,uint256,uint16)
};

/** Un numero o una direccion en los 32 bytes que pide la ABI. */
function palabra(v) {
    if (typeof v === 'bigint' || typeof v === 'number') return BigInt(v).toString(16).padStart(64, '0');
    return String(v).replace(/^0x/i, '').toLowerCase().padStart(64, '0');
}

function exigirDireccionEvm(d) {
    const a = String(d).trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error('La dirección de Ethereum tiene que ser 0x y 40 caracteres.');
    return a;
}

/** eth_call contra los nodos publicos, en orden. Devuelve { valor, nodo }. */
async function ethCall(llamada) {
    const cuerpo = { jsonrpc: '2.0', id: 1, method: 'eth_call', params: [llamada, 'latest'] };
    let ultimo = null;
    for (const rpc of RPC_EVM) {
        try {
            const { json } = await postJsonParseado(rpc, cuerpo, { esperaMs: 20000 });
            if (json && typeof json.result === 'string' && /^0x[0-9a-f]*$/i.test(json.result)) {
                return { valor: json.result, nodo: rpc };
            }
            // Un `revert` SI es respuesta del contrato: se devuelve como tal para
            // que quien pregunte pueda distinguirlo de un nodo que no contesta.
            if (json && json.error) {
                const e = new Error(String(json.error.message || 'revert').slice(0, 200));
                e.revert = true;
                throw e;
            }
            ultimo = JSON.stringify(json || '').slice(0, 200);
        } catch (e) {
            if (e.revert) throw e;
            ultimo = String(e.message || e).slice(0, 200);
        }
    }
    throw new Error('No se pudo preguntar a Ethereum. ' + (ultimo || ''));
}

const aNumero = (hex, decimales) => Number(BigInt(hex || '0x0')) / Math.pow(10, decimales);

/**
 * Lo que tiene una cuenta de Ethereum: ETH y USDC.
 *
 * Vive aqui, y no en un `lib/evm.js` aparte, porque los nodos publicos y el
 * decodificado de respuestas ya estan resueltos en este fichero. Es solo lectura:
 * en el movil todavia no se firma nada de Ethereum.
 */
export async function saldosEvm(direccion) {
    const a = exigirDireccionEvm(direccion);
    const ruta = RUTAS[0];
    const salida = [];

    // El ETH nativo no es una llamada a un contrato: es eth_getBalance.
    try {
        const cuerpo = { jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [a, 'latest'] };
        let hex = null;
        for (const rpc of RPC_EVM) {
            try {
                const { json } = await postJsonParseado(rpc, cuerpo, { esperaMs: 20000 });
                if (json && typeof json.result === 'string') { hex = json.result; break; }
            } catch (_) { /* se prueba el siguiente nodo */ }
        }
        // Saldo null = «no se pudo preguntar», que NO es cero. La pantalla lo dice
        // así: un cero inventado se lee como «no tienes nada».
        salida.push({ simbolo: 'ETH', saldo: hex === null ? null : aNumero(hex, 18), decimales: 18 });
    } catch (_) {
        salida.push({ simbolo: 'ETH', saldo: null, decimales: 18 });
    }

    try {
        const r = await ethCall({ to: ruta.evmToken, data: SEL.balanceOf + palabra(a) });
        salida.push({ simbolo: ruta.simbolo, saldo: aNumero(r.valor, ruta.decimales), decimales: ruta.decimales });
    } catch (_) {
        salida.push({ simbolo: ruta.simbolo, saldo: null, decimales: ruta.decimales });
    }
    return salida;
}

/**
 * Como esta el lado de Ethereum para traer USDC: lo que tienes, el permiso que el
 * puente ya tiene sobre tu USDC, y el peaje que cobra por el viaje.
 */
export async function estadoEvm(direccion) {
    const a = exigirDireccionEvm(direccion);
    const ruta = RUTAS[0];
    const [saldo, permiso, peajeWei] = await Promise.all([
        ethCall({ to: ruta.evmToken, data: SEL.balanceOf + palabra(a) }),
        ethCall({ to: ruta.evmToken, data: SEL.allowance + palabra(a) + palabra(ruta.evmRouter) }),
        ethCall({ to: ruta.evmRouter, data: SEL.quoteGasPayment + palabra(DOMINIO_KDA) }).catch(() => ({ valor: '0x0' })),
    ]);
    return {
        simbolo: ruta.simbolo,
        saldo: aNumero(saldo.valor, ruta.decimales),
        permiso: aNumero(permiso.valor, ruta.decimales),
        peajeEth: Number(BigInt(peajeWei.valor || '0x0')) / 1e18,
        nodo: saldo.nodo,
    };
}

/**
 * Simula el viaje Ethereum -> Kadena: el mismo `transferRemote` que se firmaria,
 * con el custodio bien formado, preguntado sin firmar.
 *
 * OJO CON LO QUE ESTO **NO** DICE, que es lo que costo 1 USDC en el escritorio: el
 * contrato de Solidity acepta como destinatario CUALQUIER secuencia de bytes y no
 * se queja. Quien valida el custodio es la orilla Kadena al entregar, y si esta
 * mal el token ya se ha quedado bloqueado alli. Que esta simulacion salga bien
 * dice que la llamada pasaria, no que el destinatario sea correcto; por eso el
 * custodio lo genera la app y no se teclea.
 */
export async function simularHaciaKadena({ direccionEvm, cuentaKda, cantidad }) {
    const a = exigirDireccionEvm(direccionEvm);
    const ruta = RUTAS[0];
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n <= 0) throw new Error('La cantidad tiene que ser mayor que cero.');

    const { hex } = custodioDe(cuentaKda);
    const bytes = hex.slice(2);
    const cantidadBase = BigInt(Math.round(n * Math.pow(10, ruta.decimales)));

    // Cabecera: dominio, donde empieza el destinatario, cantidad y chain. Y detras,
    // el destinatario con su longitud. Las cuatro palabras de cabecera hacen 0x80.
    const datos = SEL.transferRemote
        + palabra(DOMINIO_KDA)
        + palabra(0x80)
        + palabra(cantidadBase)
        + palabra(CHAIN_PUENTE)
        + palabra(BigInt(bytes.length / 2))
        + bytes.padEnd(Math.ceil(bytes.length / 64) * 64, '0');

    const { peajeEth, saldo, permiso } = await estadoEvm(a);
    const peajeWei = '0x' + BigInt(Math.round(peajeEth * 1e18)).toString(16);

    let bien = false;
    let motivo = null;
    try {
        await ethCall({ to: ruta.evmRouter, from: a, data: datos, value: peajeWei });
        bien = true;
    } catch (e) {
        motivo = String(e.message || e);
    }

    return {
        bien, motivo, peajeEth, saldo, permiso,
        faltaPermiso: permiso < n,
        saldoSuficiente: saldo >= n,
        custodio: custodioDe(cuentaKda).json,
        simbolo: ruta.simbolo,
    };
}

// --- Mandar de verdad por Ethereum -------------------------------------------
//
// Hasta la 0.49.0 este fichero solo LEIA de Ethereum: firmar una transaccion de
// Ethereum no lo sabia hacer la boveda, asi que el sentido Ethereum -> Kadena
// habia que rematarlo en el escritorio. Desde que `FirmaEvm.kt` existe, lo que
// falta es esto: preguntar lo que hace falta para firmar (el nonce y el gas) y
// mandar lo que devuelve firmado.
//
// Aqui no se arma NADA que decida donde va el dinero. El `data` y el destino los
// pone el plugin; de aqui salen solo numeros que la propia red dice.

/** Una llamada JSON-RPC cualquiera, probando los nodos en orden. */
/**
 * Los errores que contesta un nodo de Ethereum vienen en ingles y en su jerga. Los
 * que salen de verdad se dicen en llano, porque el que los lee esta a punto de
 * mover dinero y no tiene por que saber que es «gas * price + value».
 */
function errorDelNodo(mensaje) {
    const m = mensaje.toLowerCase();
    if (m.includes('insufficient funds')) {
        throw new Error('No hay ETH suficiente para pagar el gas de esta transacción. Deja algo de ETH sin gastar.');
    }
    if (m.includes('nonce too low') || m.includes('already known')) {
        throw new Error('Esa transacción ya se había mandado. Mira el saldo antes de repetirla.');
    }
    if (m.includes('underpriced')) {
        throw new Error('Hay otra transacción tuya en cola y esta paga menos. Espera a que entre la anterior.');
    }
    if (m.includes('gas required exceeds') || m.includes('intrinsic gas too low')) {
        throw new Error('La transacción necesita más gas del que se le ha puesto.');
    }
    throw new Error(mensaje);
}

async function rpcEvm(method, params) {
    const cuerpo = { jsonrpc: '2.0', id: 1, method, params };
    let ultimo = null;
    for (const nodo of RPC_EVM) {
        try {
            const { json } = await postJsonParseado(nodo, cuerpo, { esperaMs: 20000 });
            if (json && json.error) {
                // Un error del nodo con mensaje SI es una respuesta: dice por que no
                // se puede hacer, y repetirlo en otro nodo daria lo mismo.
                try {
                    errorDelNodo(String(json.error.message || 'error').slice(0, 200));
                } catch (e) {
                    e.delNodo = true;
                    throw e;
                }
            }
            if (json && json.result !== undefined) return { valor: json.result, nodo };
            ultimo = JSON.stringify(json || '').slice(0, 200);
        } catch (e) {
            if (e.delNodo) throw e;
            ultimo = String(e.message || e).slice(0, 200);
        }
    }
    throw new Error('No se pudo hablar con Ethereum. ' + (ultimo || ''));
}

/**
 * El sobre de la transaccion: nonce y precios del gas, tal como los dice la red.
 *
 * `maxFeePerGas` se calcula como en cualquier monedero: el doble de la base del
 * ultimo bloque mas la propina. El doble es el colchon para que la transaccion
 * siga siendo valida si la base sube en los proximos bloques -y lo que no se
 * gasta se devuelve, porque en EIP-1559 se paga la base real, no el maximo-.
 *
 * `gasLimit` NO se estima con `eth_estimateGas` para el envio del puente: esa
 * estimacion falla mientras no haya permiso dado, y entonces no habria forma de
 * firmar el permiso y el envio seguidos. Se usa un valor fijo holgado, que en
 * EIP-1559 tampoco cuesta: el gas que no se usa no se cobra.
 */
export async function sobreEvm(direccion, { gasLimit }) {
    const a = exigirDireccionEvm(direccion);
    const [cuenta, bloque] = await Promise.all([
        rpcEvm('eth_getTransactionCount', [a, 'pending']),
        rpcEvm('eth_getBlockByNumber', ['latest', false]),
    ]);
    const base = BigInt((bloque.valor && bloque.valor.baseFeePerGas) || '0x0');

    // SUELO de la propina: 0,1 gwei. Lo que contestan hoy los nodos publicos es
    // ridiculo -38.817 wei, o sea 0,00004 gwei- y con eso una transaccion puede
    // quedarse esperando indefinidamente, porque quien construye el bloque ordena
    // por propina. Con 0,1 gwei, los 400.000 de gas del envio salen por 0,00004
    // ETH: unos centimos por no quedarse atras.
    const SUELO_PROPINA = 100000000n;                // 0,1 gwei
    let propina = SUELO_PROPINA;
    try {
        const p = await rpcEvm('eth_maxPriorityFeePerGas', []);
        const v = BigInt(p.valor || '0x0');
        if (v > propina) propina = v;
    } catch (_) { /* no todos los nodos lo tienen; el suelo vale */ }

    return {
        nonce: String(BigInt(cuenta.valor || '0x0')),
        gasLimit: String(gasLimit),
        maxFeePerGas: String(base * 2n + propina),
        maxPriorityFeePerGas: String(propina),
    };
}

/** El peaje del puente, en wei y como texto (que es como lo quiere el plugin). */
export async function peajeWei() {
    const ruta = RUTAS[0];
    const r = await ethCall({ to: ruta.evmRouter, data: SEL.quoteGasPayment + palabra(DOMINIO_KDA) })
        .catch(() => ({ valor: '0x0' }));
    return String(BigInt(r.valor || '0x0'));
}

/** Manda una transaccion ya firmada. Devuelve su hash. */
export async function mandarRaw(raw) {
    const { valor } = await rpcEvm('eth_sendRawTransaction', [raw]);
    if (typeof valor !== 'string' || !/^0x[0-9a-f]{64}$/i.test(valor)) {
        throw new Error('El nodo no devolvió un hash de transacción.');
    }
    return valor;
}

/**
 * Espera a que la transaccion entre en un bloque.
 *
 * Devuelve { bien, recibo } o null si se acaba la espera, con la misma regla que
 * en Kadena: que no aparezca a tiempo NO significa que haya fallado, y quien lo
 * cuente tiene que decir eso mismo y dar el hash.
 */
export async function esperarReciboEvm(hash, { intentos = 40, esperaMs = 5000, alMirar = null } = {}) {
    for (let i = 0; i < intentos; i++) {
        await new Promise((r) => setTimeout(r, esperaMs));
        let respondio = false;
        try {
            const { valor } = await rpcEvm('eth_getTransactionReceipt', [hash]);
            respondio = true;
            if (valor && valor.blockNumber) {
                // `status` 0x1 es que salio bien. Un 0x0 es una transaccion que
                // entro en un bloque y REVIRTIO: el gas se pago igual.
                return { bien: BigInt(valor.status || '0x0') === 1n, recibo: valor };
            }
        } catch (_) { /* un intento suelto puede fallar; se reintenta */ }
        if (alMirar) {
            try { alMirar(i + 1, intentos, respondio); } catch (_) { /* pintar no puede romper la espera */ }
        }
    }
    return null;
}
