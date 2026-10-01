// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// DCA DE KOBERLUSW: compras periodicas. SOLO LECTURA.
//
// Un plan DCA es un bote que un contrato custodia y del que va comprando una cuota
// cada cierto tiempo. Hay DOS contratos:
//
//   - `free.ksw-dca2`: KDA <-> kb-USDC, el que ya esta probado con dinero.
//   - `free.ksw-dca3`: kb-ETH, FLUX y bro, siempre contra KDA.
//
// Reparto de papeles, que conviene tener claro antes de tocar nada:
//
//   - el CONTRATO guarda el bote y hace la compra;
//   - un VIGILANTE externo dispara las compras y paga SU propio gas;
//   - el monedero NO ejecuta compras: solo crea, recarga, pausa y cierra.
//
// De todo eso, aqui solo esta lo que se puede hacer sin firmar: VER tus planes y
// como van. Crear, pausar o cerrar mueve dinero, y esa firma se monta en Kotlin
// (o Swift) con sus PROPIOS mapas. A la boveda solo se le mandan claves cortas
// -"kb-ETH", "dca3"-, nunca un modulo ni una cuenta.

import { local, exigirCuentaKda } from './kda.js';
import { MIN_GRATIS_USDC } from './dex.js';

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

/**
 * Los dos contratos, por su clave. La clave es lo que viaja a la boveda para
 * tocar un plan; el modulo se usa aqui solo para LEER.
 */
export const CONTRATOS = {
    dca2: { modulo: 'free.ksw-dca2' },
    dca3: { modulo: 'free.ksw-dca3' },
};

/**
 * Los tokens del DCA, por su clave. `min` es el MIN-IN del contrato por compra y
 * `contrato` dice donde vive el plan: lo decide el token, no la pantalla. Aqui
 * solo se usan para PREGUNTAR saldos y para pintar; lo que se firma lo monta
 * Kotlin con sus propias constantes, asi que esto no puede desviar dinero.
 */
export const TOKENS = {
    KDA: { clave: 'KDA', simbolo: 'KDA', modulo: 'coin', precision: 12, min: LIMITES.minKda },
    'kb-USDC': { clave: 'kb-USDC', simbolo: 'kb-USDC', modulo: 'n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC', precision: 6, min: LIMITES.minUsdc, contrato: 'dca2' },
    'kb-ETH': { clave: 'kb-ETH', simbolo: 'kb-ETH', modulo: 'n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-ETH', precision: 18, min: 0.0004, contrato: 'dca3' },
    FLUX: { clave: 'FLUX', simbolo: 'FLUX', modulo: 'runonflux.flux', precision: 8, min: 15, contrato: 'dca3' },
    bro: { clave: 'bro', simbolo: 'bro', modulo: 'n_582fed11af00dc626812cd7890bb88e72067f28c.bro', precision: 12, min: 0.0002, contrato: 'dca3' },
};

/** Los que pueden ir en el lado que no es KDA, en el orden del desplegable. */
export const OTROS = ['kb-USDC', 'kb-ETH', 'FLUX', 'bro'];

/** En que contrato vive un plan de ese token. Un token que no conozca: null. */
export function contratoDeToken(clave) {
    const t = Object.prototype.hasOwnProperty.call(TOKENS, clave) ? TOKENS[clave] : null;
    return t && t.contrato ? t.contrato : null;
}

/** La clave de un token a partir de su modulo, como lo devuelve la cadena. */
export function claveDeModulo(modulo) {
    const t = Object.values(TOKENS).find((x) => x.modulo === modulo);
    return t ? t.clave : null;
}

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
 * ¿Esta parado un contrato? Lo puede parar su administracion, y entonces ningun
 * plan suyo compra. Se enseña porque un plan «activo» en un contrato en pausa no
 * esta comprando nada, y quien lo mire tiene que saberlo.
 */
export async function enPausa(red, contrato = 'dca2') {
    const c = CONTRATOS[contrato];
    if (!c) return null;
    const r = await local(red.nodo, red.networkId, CHAIN, `(${c.modulo}.paused)`);
    if (!r || r.status !== 'success') return null;
    return r.data === true;
}

/** Un plan tal y como lo devuelve la cadena, pasado a algo que se pueda pintar. */
function planEnClaro(p, contrato) {
    const entra = refMod(p['token-in']);
    const sale = refMod(p['token-out']);
    const cuota = num(p.quota);
    const bote = num(p.balance);
    return {
        id: String(p.id || ''),
        estado: String(p.status || ''),
        // De que contrato es: las acciones sobre el plan van a ese y no a otro.
        contrato,
        entra, sale,
        // La clave del token del bote, que es lo que se le manda a la boveda
        // para recargar. null si la cadena devuelve un token que no conocemos.
        claveEntra: claveDeModulo(entra),
        // El nombre de la clave si es uno de los nuestros: `runonflux.flux`
        // acabaria en «flux» y en el desplegable se llama «FLUX».
        simboloEntra: claveDeModulo(entra) || simbolo(entra),
        simboloSale: claveDeModulo(sale) || simbolo(sale),
        cuota, bote,
        periodo: num(p.period),
        compras: num(p.buys) || 0,
        gastado: num(p.spent) || 0,
        recibido: num(p.received) || 0,
        proxima: aFecha(p['next-buy']),
        // Cuantas compras quedan con lo que hay en el bote: es el dato que
        // de verdad dice cuanto le queda de vida al plan.
        quedan: cuota > 0 ? Math.floor(bote / cuota) : 0,
        // El precio limite vive en otra tabla del contrato y se lee aparte
        // (`leerLimites`). null = sin leer; 0 = sin limite.
        limite: null,
    };
}

// --- Precio limite ([P8] del contrato) ------------------------------------------
//
// Por plan, un precio en TOKEN por KDA, siendo TOKEN el lado que no es KDA (kb-USDC
// casi siempre). Comprando KDA solo se ejecuta si el precio neto queda por debajo o
// igual; vendiendo, por encima o igual. 0 = sin limite; si no se cumple, esa cuota
// no sale y se prueba en la siguiente. Lo pidio Antonio el 30/09/2026.

/** MAX-LIMIT-PRICE del contrato. */
export const LIMITE_MAX = 1000;

// En pantalla el limite se dice SIEMPRE como techo de lo que pagas: «como mucho P de lo
// que entregas por cada unidad de lo que compras» (Antonio, 01/10/2026: «es mucho lio
// de palabras»). El contrato guarda L = TOKEN por KDA:
//   entregas TOKEN, compras KDA:  P = TOKEN por KDA   -> L = P
//   entregas KDA, compras TOKEN:  P = KDA por TOKEN   -> L = 1 / P
// En los dos casos P = neto / esperado, que es justo lo que compara el contrato. Las
// mismas funciones que el escritorio (lib/dca.js), con las mismas pruebas.
const COMISION_POOL = 0.003;

/** L (lo que firma el contrato) a partir de P (lo que se escribe en pantalla). */
export function limiteDesdePago(pago, entregaKda) {
    const p = Number(pago);
    if (!(p > 0)) return 0;
    return entregaKda ? 1 / p : p;
}

/** P (lo que se enseña) a partir de L (lo que guarda el contrato). */
export function pagoDesdeLimite(limite, entregaKda) {
    const l = Number(limite);
    if (!(l > 0)) return 0;
    return entregaKda ? 1 / l : l;
}

/**
 * Lo que pagarias AHORA por cada unidad de lo que compras, con esa cuota: comision
 * del contrato, la del pool y el empujon de la propia compra. La cuenta de
 * `execute-dca`. Sin cuota, la de una compra minima.
 */
export function pagoActual({ rk, rt, entregaKda, cuota }) {
    const rin = entregaKda ? rk : rt;
    const rout = entregaKda ? rt : rk;
    if (!(rin > 0) || !(rout > 0)) return 0;
    const q = Number(cuota) > 0 ? Number(cuota) : 0;
    if (!q) return rin / (rout * (1 - COMISION_POOL));
    const net = q * (1 - COMISION);
    const inFee = net * (1 - COMISION_POOL);
    const esperado = inFee * rout / (rin + inFee);
    return esperado > 0 ? net / esperado : 0;
}

/**
 * Hacia arriba a 4 cifras significativas, con un 0,1 % de holgura: lo que se propone
 * tiene que dejar comprar al precio de ahora, no quedarse corto por un bloque.
 */
export function redondeoArriba(n, cifras = 4) {
    const v = Number(n) * 1.001;
    if (!(v > 0)) return 0;
    const e = Math.pow(10, Math.floor(Math.log10(v)) - cifras + 1);
    return Number((Math.ceil(v / e) * e).toPrecision(cifras));
}

/** Reservas del pool KDA/TOKEN del AMM que usa el contrato (kaddex.exchange). */
export async function reservasPar(red, modToken) {
    if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{1,120}$/.test(String(modToken))) throw new Error('No pude leer la liquidez del pool.');
    const r = await local(red.nodo, red.networkId, CHAIN, `(let ((p (kaddex.exchange.get-pair coin ${modToken}))) `
        + `[(kaddex.exchange.reserve-for p coin) (kaddex.exchange.reserve-for p ${modToken})])`).catch(() => null);
    const l = r && r.status === 'success' ? r.data : null;
    const rk = num(l && l[0]);
    const rt = num(l && l[1]);
    if (!(rk > 0) || !(rt > 0)) throw new Error('No pude leer la liquidez del pool.');
    return { rk, rt };
}

/**
 * Rellena `limite` en los planes vivos con UNA lectura para todos: una lista de
 * `limit-of`, cada uno en su contrato. Si la lectura falla, se quedan en null,
 * que la pantalla pinta como «sin leer» y no como «sin limite».
 */
async function leerLimites(planes, red) {
    const vivos = planes.filter((p) => p.estado !== 'closed' && /^[A-Za-z0-9:_.-]{1,64}$/.test(p.id));
    planes.forEach((p) => { if (p.estado === 'closed') p.limite = 0; });
    if (!vivos.length) return;
    const code = '[' + vivos.map((p) => `(${CONTRATOS[p.contrato].modulo}.limit-of "${p.id}")`).join(' ') + ']';
    const r = await local(red.nodo, red.networkId, CHAIN, code).catch(() => null);
    if (!r || r.status !== 'success' || !Array.isArray(r.data)) return;
    vivos.forEach((p, i) => {
        const v = num(r.data[i]);
        p.limite = Number.isFinite(v) ? v : null;
    });
}

/**
 * Los planes de una cuenta, en cualquier estado, de LOS DOS contratos y cada uno
 * marcado con el suyo.
 *
 * Si un contrato no contesta, se enseña lo del otro y se dice cual falta en
 * `fallidos`: esconder los planes de dca2 porque el dca3 no responde dejaria a
 * alguien sin ver un bote que si existe. Solo si fallan los dos se lanza error.
 */
export async function planesDe(cuenta, red) {
    exigirCuentaKda(cuenta, 'consultada');
    const claves = Object.keys(CONTRATOS);
    const lecturas = await Promise.all(claves.map((k) =>
        local(red.nodo, red.networkId, CHAIN, `(${CONTRATOS[k].modulo}.plans-of "${cuenta}")`).catch(() => null)));
    const planes = [];
    const fallidos = [];
    lecturas.forEach((r, i) => {
        if (!r || r.status !== 'success') {
            fallidos.push(CONTRATOS[claves[i]].modulo);
            return;
        }
        (r.data || []).forEach((p) => planes.push(planEnClaro(p, claves[i])));
    });
    if (fallidos.length === claves.length) {
        throw new Error('No se pudieron leer tus planes de compra.');
    }
    await leerLimites(planes, red);
    planes.fallidos = fallidos;
    return planes;
}


// --- Gas del plan ------------------------------------------------------------
//
// Caso real (26/09/2026): un usuario con 20 kb-USDC y CERO KDA en la chain 2 no
// pudo crear un plan. El gas se paga siempre en KDA, y el nodo contesta «Failed to
// buy gas: No value found…», que en pantalla salía cortado como «No». El
// escritorio ya lo resolvía con la gasolinera de KoberluSW; aquí el cable estaba
// sin conectar (PARIDAD.md).

// Por debajo de esto la gasolinera se da por seca y paga el usuario. El mismo
// criterio que el escritorio (`GASO_MIN` de su lib/dca.js).
const GASOLINERA_MIN = 0.05;
// El tope de gas que admite su GAS_PAYER. Crear un plan cabe; el escritorio firma
// con este mismo límite.
export const GAS_GASOLINERA = 8000;
// Lo mínimo de KDA suelto para pagar el gas uno mismo (una operación del DCA
// gasta del orden de 0,0001 KDA; esto deja margen).
export const MARGEN_GAS = 0.01;

/**
 * DECISIÓN DE ANTONIO (28/09/2026), la misma en todas las versiones: la gasolinera
 * solo paga a partir de 5 kb-USDC de operación, también en el DCA y en las órdenes.
 * Por debajo, el gas lo pone el usuario. El umbral es el del Mercado (`dex.js`).
 */
export function llegaAlUmbral(valorUsdc) {
    return Number(valorUsdc) >= MIN_GRATIS_USDC;
}

/** ¿Puede pagar la gasolinera ahora? Si no contesta, se da por que no: paga el usuario. */
export async function gasolineraLista(red) {
    try {
        const r = await local(red.nodo, red.networkId, CHAIN, '(free.ksw-gasolinera.saldo)');
        if (!r || r.status !== 'success') return false;
        const v = typeof r.data === 'object' && r.data ? Number(r.data.decimal) : Number(r.data);
        return v >= GASOLINERA_MIN;
    } catch (_) {
        return false;
    }
}

/**
 * Lo que dice el nodo, en llano, cuando el gas no se pudo cobrar. Devuelve null si
 * el error es otro: entonces se enseña tal cual.
 */
export function motivoGas(mensaje) {
    const m = String(mensaje || '');
    if (!/buy gas/i.test(m)) return null;
    if (/No value found|row not found|Insufficient funds|insufficient/i.test(m)) return 'sin-kda';
    return 'otro';
}
