// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// PRECIO E HISTORIAL. Todo lectura, nada que firmar.

import { getJson } from '../red.js';
import { CODIGOS, monedaElegida } from '../moneda.js';
import { reservas } from './ordenes.js';

// Se piden TODAS las monedas que la app sabe enseñar, no solo la elegida: caben
// en la misma llamada y asi cambiar de moneda en Ajustes no obliga a volver a
// preguntar el precio ni deja la caché inservible.
//
// Y se piden las DOS monedas, kadena y ethereum, por lo mismo: cuesta igual que
// pedir uno y sin el del ETH la tarjeta de una cartera de Ethereum no puede decir
// lo que vale, que es justo lo que se mira en un monedero.
const COINGECKO = 'https://api.coingecko.com/api/v3/simple/price?ids=kadena,ethereum'
    + '&vs_currencies=' + CODIGOS.join(',') + '&include_24hr_change=true';
const KDAINDEX = 'https://kdaindex.dnns.es/txs/account/';

// El precio se guarda un rato: abrir la app no tiene por que pedirlo cada vez, y
// CoinGecko corta el grifo si se le llama demasiado desde la misma IP.
let cache = null;
const VIGENCIA_MS = 60000;

// --- Respaldo: el pool KDA/kb-USDC del Mercado de Kadena --------------------
//
// CoinGecko es un solo sitio, y ademas su precio del KDA se alimenta de solo dos
// mercados (CoinEx y Gate a 29/09/2026; CoinEx cerro ese mismo mes). Cuando no
// contesta -corta por cuota, o bloquea la IP con un 403- el Panel se quedaba en
// 0,00 con los saldos bien. El respaldo es el pool KDA/kb-USDC de la chain 2, que
// la app ya lee para las ordenes y que no depende de ningun exchange: 1 kb-USDC
// se toma por 1 dolar, que es lo que es.
//
// Para pasar de dolar a la moneda elegida hace falta el cambio, y no se pide a
// un tercero mas: se recuerda la razon eur/usd, gbp/usd y chf/usd de la ultima
// vez que CoinGecko contesto (cambia poco de un dia a otro). Si nunca contesto y
// la moneda no es el dolar, no hay precio en esa moneda: se dice, no se inventa.
const LLAVE_CAMBIOS = 'koberlet.cambios';
const VIGENCIA_CAMBIOS_MS = 7 * 86400000;

function recordarCambios(k) {
    const usd = Number(k.usd);
    if (!(usd > 0)) return;
    const razones = { cuando: Date.now() };
    for (const c of CODIGOS) {
        const v = Number(k[c]);
        if (v > 0) razones[c] = v / usd;
    }
    try { localStorage.setItem(LLAVE_CAMBIOS, JSON.stringify(razones)); } catch (_) { /* sin almacen */ }
}

function cambiosRecordados() {
    try {
        const r = JSON.parse(localStorage.getItem(LLAVE_CAMBIOS) || 'null');
        if (r && Date.now() - Number(r.cuando) < VIGENCIA_CAMBIOS_MS) return r;
    } catch (_) { /* sin almacen o roto */ }
    return null;
}

/**
 * El precio del KDA a partir del pool, en todas las monedas que se puedan: el
 * dolar siempre; las demas solo con un cambio recordado. Va suelto y sin red para
 * poderlo probar: `precioUsd` es kb-USDC por KDA y `razones` lo que devuelve
 * `cambiosRecordados()` (o null).
 */
export function valorDesdePool(precioUsd, razones) {
    const p = Number(precioUsd);
    if (!(p > 0)) return null;
    const valor = { eth: null, fuente: 'pool' };
    for (const c of CODIGOS) {
        const razon = c === 'usd' ? 1 : (razones && Number(razones[c]));
        valor[c] = razon > 0 ? p * razon : null;
        valor[c + '_24h'] = null;                  // el pool no sabe de ayer
    }
    return valor;
}

/**
 * Precio del KDA en todas las monedas que la app sabe enseñar.
 *
 * Devuelve { eur, usd, gbp, chf, cambio24h, unidad, fuente, cuando } o null:
 *  - `unidad` es el precio en la moneda ELEGIDA, que es el que usan el Panel y
 *    el conversor de Recibir; asi quien llama no tiene que saber cuál es. Puede
 *    ser null si esa moneda no se sabe (respaldo sin cambio recordado).
 *  - `cambio24h` es el de esa misma moneda; null cuando viene del pool.
 *  - `fuente` es 'coingecko' o 'pool': el Panel dice de donde sale el numero.
 *  - `cuando` es la marca de tiempo de la consulta, para poder decir de cuándo
 *    es el cambio. En un cobro eso no es adorno: quien lo lee decide si le vale.
 *
 * `red` es la red de Kadena activa: con ella, si CoinGecko falla, se lee el pool.
 * Solo tiene sentido en mainnet, que es donde vive el Mercado.
 *
 * Null no es un fallo que haya que gritar: es un monedero, y el saldo en KDA es
 * el dato de verdad. Si el precio no llega, se enseña el saldo sin convertir y
 * ya esta; lo que NO se hace es enseñar un precio viejo como si fuera de ahora.
 */
export async function precioKda({ maxEdadMs = VIGENCIA_MS, red = null } = {}) {
    const elegida = monedaElegida();
    // La caché guarda el precio en todas las monedas, asi que sigue valiendo
    // aunque la elegida haya cambiado desde que se pidió: solo se recalcula cuál
    // de ellas es «la unidad».
    //
    // `maxEdadMs` lo baja quien no se puede permitir un precio de hace un minuto:
    // la hoja de Recibir con un cobro puesto en euros, donde ese minuto es dinero
    // ajeno. El resto de la app se conforma con la vigencia normal.
    if (cache && Date.now() - cache.cuando < maxEdadMs) return conMoneda(cache.valor, elegida, cache.cuando);
    try {
        const { json } = await getJson(COINGECKO, { esperaMs: 8000 });
        const k = json.kadena;
        // Un 200 sin precio de KDA (o con un cero) vale lo mismo que un fallo:
        // al respaldo.
        if (!k || !(Number(k.usd) > 0)) return desdePool(red, elegida);
        const valor = { fuente: 'coingecko' };
        for (const c of CODIGOS) {
            valor[c] = Number(k[c]);
            valor[c + '_24h'] = Number(k[c + '_24h_change']);
        }
        recordarCambios(k);
        // El del ETH va aparte y con la misma forma. Si CoinGecko no lo manda -o
        // manda algo que no es un número-, se queda en null: eso significa «no lo
        // sé» y quien pinte lo tiene que decir, no dar un cero por precio.
        valor.eth = null;
        if (json.ethereum) {
            valor.eth = {};
            for (const c of CODIGOS) {
                valor.eth[c] = Number(json.ethereum[c]);
                valor.eth[c + '_24h'] = Number(json.ethereum[c + '_24h_change']);
            }
        }
        const cuando = Date.now();
        cache = { cuando, valor };
        return conMoneda(valor, elegida, cuando);
    } catch (_) {
        return desdePool(red, elegida);
    }
}

/** El respaldo. Sin red de mainnet no hay pool que leer, y se queda en null. */
async function desdePool(red, elegida) {
    if (!red || red.networkId !== 'mainnet01') return null;
    try {
        const { precio } = await reservas(red);
        const valor = valorDesdePool(precio, cambiosRecordados());
        if (!valor) return null;
        const cuando = Date.now();
        cache = { cuando, valor };
        return conMoneda(valor, elegida, cuando);
    } catch (_) {
        return null;
    }
}

function conMoneda(valor, elegida, cuando) {
    return {
        ...valor,
        unidad: valor[elegida],
        cambio24h: valor[elegida + '_24h'],
        fuente: valor.fuente || 'coingecko',
        // El ETH también trae su `unidad` ya resuelta, para que quien lo use no
        // tenga que saber qué moneda hay elegida.
        eth: valor.eth
            ? { ...valor.eth, unidad: valor.eth[elegida], cambio24h: valor.eth[elegida + '_24h'] }
            : null,
        moneda: elegida,
        cuando,
    };
}

/**
 * Movimientos de una cuenta, del indexador propio (kdaindex.dnns.es), porque el
 * fork de la comunidad no tiene chainweb-data.
 *
 * Devuelve [{ entra, cantidad, otra, de, para, chain, cuando, altura, requestKey, token }]:
 * `entra` dice si el dinero viene o va, que es lo primero que quiere saber
 * cualquiera al mirar una lista de movimientos.
 *
 * Se guardan las dos cuentas enteras y no solo «la otra»: la ficha de cada
 * movimiento las enseña las dos, y ahi es donde uno comprueba de verdad que el
 * dinero fue a donde tenia que ir.
 */
export async function movimientos(cuenta, { limite = 25 } = {}) {
    const { json } = await getJson(KDAINDEX + encodeURIComponent(cuenta), { esperaMs: 15000 });
    if (!Array.isArray(json)) return [];
    return json.slice(0, limite).map((m) => {
        const entra = m.toAccount === cuenta;
        return {
            entra,
            cantidad: Number(m.amount),
            otra: entra ? m.fromAccount : m.toAccount,
            de: m.fromAccount || '',
            para: m.toAccount || '',
            chain: m.chain,
            cuando: m.blockTime ? new Date(m.blockTime) : null,
            altura: m.height,
            requestKey: m.requestKey,
            token: m.token === 'coin' ? 'KDA' : m.token,
        };
    });
}
