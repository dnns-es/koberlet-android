// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// DCA DE KOBERLUSW: compras periodicas. SOLO LECTURA.
//
// Un plan DCA es un bote que el contrato `free.ksw-dca2` custodia y del que va
// comprando una cuota cada cierto tiempo. Reparto de papeles, que conviene tener
// claro antes de tocar nada:
//
//   - el CONTRATO guarda el bote y hace la compra;
//   - un VIGILANTE externo dispara las compras y paga SU propio gas;
//   - el monedero NO ejecuta compras: solo crea, recarga, pausa y cierra.
//
// De todo eso, aqui solo esta lo que se puede hacer sin firmar: VER tus planes y
// como van. Crear, pausar o cerrar mueve dinero, y esa firma se monta en Kotlin.

import { local, exigirCuentaKda } from './kda.js';

const MODULO = 'free.ksw-dca2';
const CHAIN = '2';

// Lo que el contrato admite, leido de su fuente. Se repite aqui solo para poder
// avisar ANTES de firmar; la regla de verdad la pone el contrato.
export const LIMITES = {
    periodoMin: 300,          // 5 minutos
    periodoMax: 31536000,     // un año
    planesPorCuenta: 10,
    minKda: 100,
    minUsdc: 1,
};

// Los dos tokens que el contrato admite, leidos de su allowlist. Aqui solo se
// usan para PREGUNTAR saldos y para pintar; lo que se firma lo monta Kotlin con
// sus propias constantes, asi que esto no puede desviar dinero.
export const TOKENS = {
    kda: { simbolo: 'KDA', modulo: 'coin', min: LIMITES.minKda },
    usdc: { simbolo: 'kb-USDC', modulo: 'n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC', min: LIMITES.minUsdc },
};

/** Lo que el contrato se lleva de cada compra, sobre lo que entra. */
export const COMISION = 0.005;

/** Cada cuanto puede comprar. El suelo lo pone el contrato: 5 minutos. */
export const PERIODOS = [300, 900, 3600, 21600, 86400, 604800];

/**
 * Las cuentas del plan antes de firmarlo: cuantas compras salen, cuanto dura y
 * cuanto se lleva el servicio. Es lo que hay que poder ver ANTES de soltar el
 * bote entero.
 */
export function cuentasDelPlan(deposito, cuota, periodo) {
    const dep = Number(deposito) || 0;
    const cuo = Number(cuota) || 0;
    const compras = cuo > 0 ? Math.floor(dep / cuo) : 0;
    return { compras, segundos: compras * Number(periodo || 0), comision: dep * COMISION };
}

const num = (v) => (v && typeof v === 'object') ? Number(v.decimal != null ? v.decimal : v.int) : Number(v);

/** Pact devuelve las referencias a modulo como objeto o como texto, segun version. */
function refMod(v) {
    if (typeof v === 'string') return v;
    const r = (v && v.refName) || v;
    if (r && r.name) return (r.namespace ? r.namespace + '.' : '') + r.name;
    return '';
}

const simbolo = (modulo) => (modulo === 'coin' ? 'KDA' : String(modulo).split('.').pop());

/** El tiempo de Pact llega como {time: "..."} o como texto ISO. */
function aFecha(v) {
    const s = v && typeof v === 'object' ? (v.time || v.timep || '') : v;
    const d = new Date(String(s));
    return isNaN(d.getTime()) ? null : d;
}

/**
 * ¿Esta el contrato parado? Lo puede parar su administracion, y entonces ningun
 * plan compra. Se enseña porque un plan «activo» en un contrato en pausa no esta
 * comprando nada, y quien lo mire tiene que saberlo.
 */
export async function enPausa(red) {
    const r = await local(red.nodo, red.networkId, CHAIN, `(${MODULO}.paused)`);
    if (!r || r.status !== 'success') return null;
    return r.data === true;
}

/** Los planes de una cuenta, en cualquier estado. */
export async function planesDe(cuenta, red) {
    exigirCuentaKda(cuenta, 'consultada');
    const r = await local(red.nodo, red.networkId, CHAIN, `(${MODULO}.plans-of "${cuenta}")`);
    if (!r || r.status !== 'success') {
        throw new Error('No se pudieron leer tus planes de compra.');
    }
    return (r.data || []).map((p) => {
        const entra = refMod(p['token-in']);
        const sale = refMod(p['token-out']);
        const cuota = num(p.quota);
        const bote = num(p.balance);
        return {
            id: String(p.id || ''),
            estado: String(p.status || ''),
            entra, sale,
            simboloEntra: simbolo(entra), simboloSale: simbolo(sale),
            cuota, bote,
            periodo: num(p.period),
            compras: num(p.buys) || 0,
            gastado: num(p.spent) || 0,
            recibido: num(p.received) || 0,
            proxima: aFecha(p['next-buy']),
            // Cuantas compras quedan con lo que hay en el bote: es el dato que
            // de verdad dice cuanto le queda de vida al plan.
            quedan: cuota > 0 ? Math.floor(bote / cuota) : 0,
        };
    });
}
