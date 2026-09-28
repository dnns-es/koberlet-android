// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// ORDENES LIMITE DE KOBERLUSW (`free.ksw2`). LECTURA Y CUENTAS.
//
// Una orden limite es un deposito que el contrato custodia hasta que el precio
// llega al que pusiste; entonces un vigilante externo la dispara, pagando SU
// propio gas, y el contrato hace el cambio en el AMM. Mismo contrato y mismas
// cuentas que la web y el escritorio: una orden creada aqui y otra creada en
// koberlusw.dnns.es son indistinguibles.
//
// Aqui vive lo que no firma: leer el precio del pool, las ordenes abiertas y
// sacar las cuentas de una orden antes de firmarla. Es un calco de
// `lib/ordenes.js` del escritorio. La firma la montan Kotlin y Swift con sus
// propias constantes (contrato, tokens, custodia): a la boveda solo le llegan el
// sentido y tres numeros.

import { local, exigirCuentaKda } from './kda.js';

const CHAIN = '2';
export const MODULO = 'free.ksw2';
const AMM = 'kaddex.exchange';

export const KDA = { simbolo: 'KDA', modulo: 'coin', precision: 12 };
export const USDC = { simbolo: 'kb-USDC', modulo: 'n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC', precision: 6 };

// Comision del pool de kaddex. Vive en el contrato del AMM, no la fija Koberlet.
const FEE_POOL = 0.003;
// El mismo que usa KoberluSW para ordenes. Holgado a proposito: el disparo ocurre
// horas o dias despues de firmar, y para entonces el pool se ha movido.
export const SLIPPAGE_DEFECTO = 0.05;

// Valores del contrato, leidos de la cadena el 28/09/2026. Se vuelven a leer en
// cada visita; esto es solo el suelo si el nodo no contesta.
const SUELO = { fee: 0.005, poolFrac: 0.1, minKda: 100, minUsdc: 1 };

const num = (v) => {
    const n = Number(v && typeof v === 'object' ? (v.decimal != null ? v.decimal : v.int) : v);
    return isFinite(n) ? n : 0;
};

/**
 * Decimal en notacion fija, SIEMPRE truncando hacia abajo. Si el minimo a recibir
 * se redondeara hacia arriba, aunque fuera en el ultimo decimal, la ejecucion
 * revertiria y el vigilante la reintentaria sin fin.
 */
export function fijo(n, precision) {
    const p = Math.max(1, Math.min(12, precision | 0));
    const f = Math.pow(10, p);
    const t = Math.floor(Number(n) * f) / f;
    return t.toFixed(p);
}

async function leer(red, code) {
    const r = await local(red.nodo, red.networkId, CHAIN, code);
    if (!r || r.status !== 'success') {
        throw new Error(String((r && r.error && r.error.message) || 'La cadena no respondió.').slice(0, 200));
    }
    return r.data;
}

/** Lo que exige el contrato: comision, minimos y tope de pool. */
export async function limites(red) {
    const pide = async (nombre, suelo) => {
        try {
            const n = num(await leer(red, MODULO + '.' + nombre));
            return n > 0 ? n : suelo;
        } catch (_) { return suelo; }
    };
    const [fee, poolFrac, minKda, minUsdc] = await Promise.all([
        pide('DNNS-FEE', SUELO.fee), pide('MAX-POOL-FRACTION', SUELO.poolFrac),
        pide('MIN-IN-KDA', SUELO.minKda), pide('MIN-IN-USDC', SUELO.minUsdc),
    ]);
    return { fee, poolFrac, minKda, minUsdc };
}

/** ¿Esta parado el contrato? null si no se pudo preguntar. */
export async function enPausa(red) {
    try { return (await leer(red, `(${MODULO}.paused)`)) === true; } catch (_) { return null; }
}

/**
 * Reservas del par KDA / kb-USDC en el AMM y el precio de ahora (kb-USDC por KDA).
 * El AMM va fijo porque el contrato de ordenes tambien lo lleva fijo.
 */
export async function reservas(red) {
    const code = `(let ((p (${AMM}.get-pair-by-key "${KDA.modulo}:${USDC.modulo}"))) `
        + `[(${AMM}.reserve-for p ${KDA.modulo}) (${AMM}.reserve-for p ${USDC.modulo})])`;
    let l = null;
    try { l = await leer(red, code); } catch (_) { /* abajo se dice en llano */ }
    const rk = num(l && l[0]);
    const ru = num(l && l[1]);
    if (!(rk > 0) || !(ru > 0)) throw new Error('No pude leer la liquidez del pool.');
    return { rk, ru, precio: ru / rk };
}

function salida(venta, entrada, rk, ru, slippage) {
    const [rin, rout] = venta ? [rk, ru] : [ru, rk];
    const ef = entrada * (1 - FEE_POOL);
    const esperada = ef * rout / (rin + ef);
    return { esperada, minimo: esperada * (1 - slippage) };
}

/**
 * Las cuentas de una orden antes de firmarla.
 *
 * `venta` true = entregas KDA y recibes kb-USDC. `precio` es SIEMPRE kb-USDC por
 * KDA, que es como lo piensa cualquiera; al comprar KDA el contrato lo quiere al
 * reves (1 kb-USDC vale 1/precio KDA) y se le da la vuelta aqui.
 *
 * El minimo a recibir cuenta el empujon que el propio cambio le da al pool, no el
 * precio «de pizarra»: se estiman las reservas en el momento del disparo (k
 * constante, precio = el objetivo) y se aplica la formula del AMM sobre lo que de
 * verdad entra, que es lo depositado menos la comision del contrato.
 *
 * Sin liquidez legible NO se da cotizacion: con el precio de pizarra el minimo
 * saldria mas alto de lo que el cambio da, la orden no se ejecutaria nunca y el
 * deposito se quedaria esperando una cancelacion.
 */
export async function cotizar(red, { venta, cantidad, precio, slippage = SLIPPAGE_DEFECTO }) {
    const p = Number(precio);
    if (!(p > 0)) throw new Error('El precio tiene que ser mayor que cero.');
    if (!(slippage >= 0 && slippage <= 0.5)) throw new Error('El deslizamiento va de 0 a 50 %.');
    const L = await limites(red);
    const tIn = venta ? KDA : USDC;
    const tOut = venta ? USDC : KDA;
    const cant = fijo(cantidad, tIn.precision);
    if (!(Number(cant) > 0)) throw new Error('La cantidad es demasiado pequeña.');
    const minIn = venta ? L.minKda : L.minUsdc;
    if (Number(cant) < minIn) {
        const e = new Error('La orden mínima es de ' + minIn + ' ' + tIn.simbolo + '.');
        e.minimo = { cantidad: minIn, simbolo: tIn.simbolo };
        throw e;
    }

    const disparo = fijo(venta ? p : 1 / p, 12);
    const comision = Number(fijo(Number(cant) * L.fee, tIn.precision));
    const neta = Number(cant) - comision;

    const { rk, ru, precio: ahora } = await reservas(red);
    const k = rk * ru;
    const rkT = Math.sqrt(k / p);
    const ruT = Math.sqrt(k * p);
    const s = salida(venta, neta, rkT, ruT, slippage);
    const rin = venta ? rkT : ruT;
    const impacto = neta / (rin + neta) * 100;
    // El contrato no deja que lo que entra al pool pase de MAX-POOL-FRACTION de la
    // reserva: una orden mas gorda se quedaria abierta para siempre.
    const demasiado = neta > rin * L.poolFrac ? Math.round(L.poolFrac * 100) : null;

    const minimo = fijo(s.minimo, tOut.precision);
    if (!(Number(minimo) > 0)) throw new Error('El mínimo a recibir sale a cero: el pool es demasiado fino para esta orden.');

    // Que el precio ya se cumpla ahora no es un error, pero conviene decirlo: la
    // orden saldria enseguida, y quien pone un limite no suele buscar eso.
    const yaSeCumple = venta ? p <= ahora : p >= ahora;

    return {
        venta, cantidad: cant, disparo, minimo, comision, neta, precio: p, ahora,
        esperada: s.esperada, impacto, demasiado, yaSeCumple, tIn, tOut,
    };
}

/**
 * Una orden de la cadena pasada a algo que se pueda pintar. El precio sale
 * SIEMPRE en kb-USDC por KDA: en las compras el contrato guarda el disparo al
 * reves y ese numero no le dice nada a nadie.
 */
export function normalizar(o) {
    const tin = o['token-in'];
    const ref = typeof tin === 'string' ? tin : ((tin && tin.refName) || {});
    const modIn = typeof ref === 'string' ? ref : (ref.namespace ? ref.namespace + '.' : '') + ref.name;
    const venta = modIn === KDA.modulo;
    const trig = num(o['trigger-price']);
    return {
        id: String(o.id || ''),
        owner: String(o.owner || ''),
        venta,
        cantidad: num(o['amount-in']),
        precio: venta ? trig : (trig > 0 ? 1 / trig : 0),
        minimo: num(o['min-out']),
        simIn: venta ? KDA.simbolo : USDC.simbolo,
        simOut: venta ? USDC.simbolo : KDA.simbolo,
    };
}

/**
 * Las ordenes abiertas: las tuyas y el libro entero, ya normalizadas.
 * El contrato no tiene lectura por dueño, solo `list-open` con las de todo el
 * mundo; se pide UNA vez y se reparte aqui.
 */
export async function ordenesAbiertas(red, cuenta) {
    exigirCuentaKda(cuenta, 'consultada');
    const todas = ((await leer(red, `(${MODULO}.list-open)`)) || []).map(normalizar);
    return { mias: todas.filter((o) => o.owner === cuenta), libro: todas };
}
