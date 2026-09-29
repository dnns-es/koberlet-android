// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// EL PRECIO DEL KDA Y SU RESPALDO. Lo que vigila esto:
//
//   1. Con CoinGecko vivo, el precio es el suyo y se RECUERDA el cambio a las
//      otras monedas (eur/usd, gbp/usd, chf/usd).
//   2. Con CoinGecko caido (403, o un 200 sin KDA), el precio sale del pool
//      KDA/kb-USDC de la chain 2, en dolares siempre y en las demas monedas solo
//      con el cambio recordado. Nunca un cero ni un NaN: null cuando no se sabe.
//   3. Sin red de mainnet no hay respaldo.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage de mentira: moneda.js y mercado.js lo usan si existe.
const almacen = new Map();
globalThis.localStorage = {
    getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v)),
    removeItem: (k) => almacen.delete(k),
};

const { precioKda, valorDesdePool } = await import('../src/lib/mercado.js');

const RED = { nodo: 'https://nodo.prueba', networkId: 'mainnet01' };

// Pool de mentira: 1.000.000 KDA contra 500.000 kb-USDC (1 KDA = 0,5 $).
function respuestaPool() {
    return { status: 200, text: async () => JSON.stringify({ result: { status: 'success', data: [{ decimal: '1000000.0' }, { decimal: '500000.0' }] } }) };
}

async function conRed(coingecko, cuerpo) {
    const antes = globalThis.fetch;
    globalThis.fetch = async (url, o) => {
        if (String(url).includes('coingecko')) return coingecko();
        if (o && o.body && String(o.body).includes('get-pair-by-key')) return respuestaPool();
        throw new Error('peticion inesperada: ' + url);
    };
    try { return await cuerpo(); } finally { globalThis.fetch = antes; }
}

const ok = () => ({
    status: 200,
    text: async () => JSON.stringify({
        kadena: { eur: 0.4, usd: 0.5, gbp: 0.35, chf: 0.45, eur_24h_change: 1.5, usd_24h_change: 1.2, gbp_24h_change: 1, chf_24h_change: 1.1 },
        ethereum: { eur: 2000, usd: 2500, gbp: 1750, chf: 2250 },
    }),
});
const bloqueado = () => ({ status: 403, text: async () => '<html>Request blocked</html>' });
const sinKda = () => ({ status: 200, text: async () => JSON.stringify({ ethereum: { usd: 2500 } }) });

test('valorDesdePool: dolares siempre, el resto solo con cambio recordado, nunca cero', () => {
    const solo = valorDesdePool(0.5, null);
    assert.equal(solo.usd, 0.5);
    assert.equal(solo.eur, null);
    assert.equal(solo.usd_24h, null);
    assert.equal(solo.fuente, 'pool');
    const con = valorDesdePool(0.5, { eur: 0.8, gbp: 0.7 });
    assert.equal(con.eur, 0.4);
    assert.equal(con.gbp, 0.35);
    assert.equal(con.chf, null);
    assert.equal(valorDesdePool(0, { eur: 0.8 }), null);
    assert.equal(valorDesdePool('nada', null), null);
});

test('con CoinGecko vivo el precio es el suyo y se recuerda el cambio', async () => {
    almacen.clear();
    almacen.set('koberlet.moneda', 'eur');
    await conRed(ok, async () => {
        const p = await precioKda({ maxEdadMs: 0, red: RED });
        assert.equal(p.fuente, 'coingecko');
        assert.equal(p.unidad, 0.4);
        assert.equal(p.cambio24h, 1.5);
        assert.equal(p.eth.unidad, 2000);
    });
    const r = JSON.parse(almacen.get('koberlet.cambios'));
    assert.equal(r.eur, 0.8);
    assert.equal(r.gbp, 0.7);
});

test('con CoinGecko bloqueado el precio sale del pool, con el cambio recordado', async () => {
    // El cambio lo dejo la prueba anterior (eur/usd = 0,8).
    await conRed(bloqueado, async () => {
        const p = await precioKda({ maxEdadMs: 0, red: RED });
        assert.equal(p.fuente, 'pool');
        assert.equal(p.usd, 0.5);
        assert.equal(p.unidad, 0.4);                  // 0,5 $ x 0,8
        assert.equal(p.cambio24h, null);
        assert.equal(p.eth, null);
    });
});

test('un 200 de CoinGecko sin KDA tambien va al pool', async () => {
    await conRed(sinKda, async () => {
        const p = await precioKda({ maxEdadMs: 0, red: RED });
        assert.equal(p.fuente, 'pool');
        assert.equal(p.usd, 0.5);
    });
});

test('sin cambio recordado, en euros no hay precio; en dolares si', async () => {
    almacen.delete('koberlet.cambios');
    await conRed(bloqueado, async () => {
        const p = await precioKda({ maxEdadMs: 0, red: RED });
        assert.equal(p.fuente, 'pool');
        assert.equal(p.unidad, null);                 // euros: no se inventa
        assert.equal(p.usd, 0.5);
    });
    almacen.set('koberlet.moneda', 'usd');
    await conRed(bloqueado, async () => {
        const p = await precioKda({ maxEdadMs: 0, red: RED });
        assert.equal(p.unidad, 0.5);
    });
});

test('sin red de mainnet no hay respaldo: null', async () => {
    await conRed(bloqueado, async () => {
        assert.equal(await precioKda({ maxEdadMs: 0 }), null);
        assert.equal(await precioKda({ maxEdadMs: 0, red: { nodo: 'x', networkId: 'testnet04' } }), null);
    });
});
