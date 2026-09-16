// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// CUANTO DAN POR LO QUE QUIERES CAMBIAR, EN ETHEREUM.
//
// Esto es SOLO LECTURA: pregunta precios y saldos. Lo que mueve dinero -el cambio
// y el permiso- se firma en el plugin (`SwapEvm.kt`), y ni el contrato al que se
// llama ni la ruta salen de aqui.
//
// Se pregunta al QuoterV2 de Uniswap, que simula el cambio sin hacerlo, y se
// prueban las TRES comisiones de pool que existen para estos pares: no hay un
// pool "el bueno", depende del par y del momento, y coger el primero que conteste
// puede costar un 0,3% en cada cambio.
//
// Lo que se enseña es el resultado de esa simulacion MENOS el deslizamiento que se
// tolera. Ese numero -el minimo- es el que se firma: es lo unico que impide que
// entre mirar y firmar te cambien el precio.

import { postJsonParseado } from '../red.js';

const QUOTER = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';   // QuoterV2
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

/** El router al que hay que dar permiso. Lo mismo que hay en `SwapEvm.kt`. */
export const ROUTER = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

// quoteExactInputSingle((address,address,uint256,uint24,uint160))
const SEL_QUOTE = '0xc6a5026a';
const SEL_ALLOWANCE = '0xdd62ed3e';
const SEL_BALANCE = '0x70a08231';

/** Las cuatro rutas, iguales y en el mismo orden que las del plugin. */
export const RUTAS = [
    { clave: 'usdc2eth', de: 'USDC', a: 'ETH', tokenIn: USDC, tokenOut: WETH, decIn: 6, decOut: 18, entraEth: false },
    { clave: 'eth2usdc', de: 'ETH', a: 'USDC', tokenIn: WETH, tokenOut: USDC, decIn: 18, decOut: 6, entraEth: true },
    { clave: 'usdt2usdc', de: 'USDT', a: 'USDC', tokenIn: USDT, tokenOut: USDC, decIn: 6, decOut: 6, entraEth: false },
    { clave: 'usdc2usdt', de: 'USDC', a: 'USDT', tokenIn: USDC, tokenOut: USDT, decIn: 6, decOut: 6, entraEth: false },
];

/**
 * Las tres monedas que se pueden tener y mandar en Ethereum.
 *
 * Es la MISMA lista que conoce el plugin (`firmarEnvioEvm`), y por eso viaja el
 * nombre y no la direccion: aqui sirve para preguntar el saldo, y alli para
 * elegir a que contrato se llama. El ETH no tiene contrato porque no es un
 * token: es el dinero de la red.
 */
export const TOKENS = [
    { simbolo: 'ETH', decimales: 18, contrato: null },
    { simbolo: 'USDC', decimales: 6, contrato: USDC },
    { simbolo: 'USDT', decimales: 6, contrato: USDT },
];

export function tokenPorSimbolo(simbolo) {
    const tk = TOKENS.find((x) => x.simbolo === simbolo);
    if (!tk) throw new Error('Ese token no está entre los que sabe enviar la app.');
    return tk;
}

/** Lo que tiene la cuenta de ese token, en unidades enteras. */
export async function saldoDeToken(simbolo, direccion) {
    const tk = tokenPorSimbolo(simbolo);
    if (!tk.contrato) return BigInt(await rpc('eth_getBalance', [direccion, 'latest']) || '0x0');
    const r = await rpc('eth_call', [{ to: tk.contrato, data: SEL_BALANCE + palabra(direccion) }, 'latest']);
    return BigInt(r || '0x0');
}

export function rutaPorClave(clave) {
    const r = RUTAS.find((x) => x.clave === clave);
    if (!r) throw new Error('Ese cambio no está entre los que sabe hacer la app.');
    return r;
}

/** El 0,5 % de deslizamiento que se tolera, como en el escritorio. */
export const DESLIZAMIENTO = 0.005;

const COMISIONES = [500, 3000, 100];

const RPC_EVM = ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'];

async function rpc(method, params) {
    let ultimo = null;
    for (const nodo of RPC_EVM) {
        try {
            const { json } = await postJsonParseado(nodo, { jsonrpc: '2.0', id: 1, method, params }, { esperaMs: 20000 });
            if (json && json.error) { ultimo = String(json.error.message || '').slice(0, 200); continue; }
            if (json && json.result !== undefined) return json.result;
        } catch (e) {
            ultimo = String(e.message || e).slice(0, 200);
        }
    }
    throw new Error('No se pudo preguntar a Ethereum. ' + (ultimo || ''));
}

const palabra = (v) => (typeof v === 'bigint' || typeof v === 'number')
    ? BigInt(v).toString(16).padStart(64, '0')
    : String(v).replace(/^0x/i, '').toLowerCase().padStart(64, '0');

/** De «5,25» a unidades enteras del token, sin pasar por coma flotante. */
export function aUnidades(cantidad, decimales) {
    const limpio = String(cantidad).trim().replace(',', '.');
    if (!/^[0-9]+(\.[0-9]*)?$/.test(limpio)) throw new Error('Eso no es una cantidad.');
    const [ent, dec = ''] = limpio.split('.');
    if (dec.length > decimales) throw new Error('Ese token no tiene tantos decimales.');
    const n = BigInt(ent + dec.padEnd(decimales, '0'));
    if (n <= 0n) throw new Error('La cantidad tiene que ser mayor que cero.');
    return n;
}

/** Y de vuelta, para pintarlo. */
export function aTexto(unidades, decimales) {
    const s = BigInt(unidades).toString().padStart(decimales + 1, '0');
    const ent = s.slice(0, s.length - decimales);
    const dec = s.slice(s.length - decimales).replace(/0+$/, '');
    return dec ? `${ent}.${dec}` : ent;
}

/**
 * Cuanto dan, probando los tres pools.
 *
 * Devuelve { comision, salida, minimo, salidaTexto, minimoTexto } con las
 * cantidades en unidades del token que sale. El `minimo` es lo que se va a firmar.
 */
export async function cotizar(clave, cantidad) {
    const r = rutaPorClave(clave);
    const entra = aUnidades(cantidad, r.decIn);

    let mejor = null;
    let ultimo = null;
    for (const comision of COMISIONES) {
        const datos = SEL_QUOTE
            + palabra(r.tokenIn) + palabra(r.tokenOut) + palabra(entra)
            + palabra(comision) + palabra(0);
        try {
            const res = await rpc('eth_call', [{ to: QUOTER, data: datos }, 'latest']);
            // La respuesta trae cuatro valores; el primero es lo que sale.
            const salida = BigInt('0x' + String(res).replace(/^0x/, '').slice(0, 64));
            if (salida > 0n && (!mejor || salida > mejor.salida)) mejor = { comision, salida };
        } catch (e) {
            ultimo = String(e.message || e).slice(0, 120);
        }
    }
    if (!mejor) throw new Error('Ningún pool de Uniswap contestó a ese cambio. ' + (ultimo || ''));

    // El suelo: lo cotizado menos el deslizamiento que se tolera.
    const minimo = mejor.salida - (mejor.salida * 5n) / 1000n;
    return {
        ...mejor,
        minimo,
        salidaTexto: aTexto(mejor.salida, r.decOut),
        minimoTexto: aTexto(minimo, r.decOut),
        ruta: r,
    };
}

/** Cuanto tiene la cuenta del token que entra, y cuanto permiso tiene dado. */
export async function estadoDeRuta(clave, direccion) {
    const r = rutaPorClave(clave);
    if (r.entraEth) {
        const saldo = await rpc('eth_getBalance', [direccion, 'latest']);
        return { saldo: BigInt(saldo || '0x0'), permiso: null, ruta: r };
    }
    const [saldo, permiso] = await Promise.all([
        rpc('eth_call', [{ to: r.tokenIn, data: SEL_BALANCE + palabra(direccion) }, 'latest']),
        rpc('eth_call', [{ to: r.tokenIn, data: SEL_ALLOWANCE + palabra(direccion) + palabra(ROUTER) }, 'latest']),
    ]);
    return { saldo: BigInt(saldo || '0x0'), permiso: BigInt(permiso || '0x0'), ruta: r };
}
