// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// ORDENES LIMITE (`free.ksw2`). Lo que vigila esto:
//
//   1. LAS CUENTAS DE LA ORDEN salen igual que en el escritorio: el precio se
//      da la vuelta al comprar, el minimo se trunca y cuenta el empujon al pool.
//   2. LAS COPIAS DICEN LO MISMO: contrato, custodia y tokens en Kotlin y Swift.
//   3. LA PANTALLA SOLO MANDA el sentido y tres numeros, nunca modulos ni cuentas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cotizar, normalizar, fijo, KDA, USDC, MODULO } from '../src/lib/ordenes.js';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lee = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');
const KOTLIN = lee('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'FirmaKda.kt');
const SWIFT = lee('ios', 'KoberletCore', 'Sources', 'KoberletCore', 'FirmaKda.swift');
const PANTALLA = lee('src', 'pantalla-ordenes.js');

// Leida de la cadena el 28/09/2026 con `(free.ksw2.custody-account)`.
const CUSTODIA = 'c:aTPrDBF5HQWwLBXmMwNc3JF83cA5cBywkYbQdac5XaY';
const RED = { nodo: 'https://nodo.prueba', networkId: 'mainnet01' };

// Pool de mentira: 1.000.000 KDA contra 500.000 kb-USDC (1 KDA = 0,5).
async function conPool(cuerpo) {
    const antes = globalThis.fetch;
    globalThis.fetch = async (_url, o) => {
        const code = JSON.parse(JSON.parse(o.body).cmd).payload.exec.code;
        let data;
        if (code.includes('get-pair-by-key')) data = [{ decimal: '1000000.0' }, { decimal: '500000.0' }];
        else if (code === 'free.ksw2.DNNS-FEE') data = 0.005;
        else if (code === 'free.ksw2.MAX-POOL-FRACTION') data = 0.1;
        else if (code === 'free.ksw2.MIN-IN-KDA') data = 100;
        else if (code === 'free.ksw2.MIN-IN-USDC') data = 1;
        else return { status: 200, text: async () => JSON.stringify({ result: { status: 'failure', error: { message: 'no' } } }) };
        return { status: 200, text: async () => JSON.stringify({ result: { status: 'success', data } }) };
    };
    try { return await cuerpo(); } finally { globalThis.fetch = antes; }
}

test('fijo trunca hacia abajo, nunca redondea hacia arriba', () => {
    assert.equal(fijo(1.23456789, 6), '1.234567');
    assert.equal(fijo(0.9999999, 6), '0.999999');
    assert.equal(fijo(5, 6), '5.000000');
});

test('vender KDA: disparo tal cual, comision descontada y minimo por debajo de lo esperado', async () => {
    await conPool(async () => {
        const q = await cotizar(RED, { venta: true, cantidad: '200', precio: 0.6, slippage: 0.05 });
        assert.equal(q.cantidad, '200.000000000000');
        assert.equal(q.disparo, '0.600000000000');
        assert.equal(q.comision, 1);
        assert.equal(q.neta, 199);
        assert.ok(Number(q.minimo) < 199 * 0.6 && Number(q.minimo) > 199 * 0.6 * 0.9);
        assert.match(q.minimo, /^\d+\.\d{6}$/);           // decimales del kb-USDC
        assert.equal(q.yaSeCumple, false);                 // 0,6 esta por encima de 0,5
        assert.equal(q.demasiado, null);
    });
});

test('comprar KDA: el disparo va al reves (KDA por kb-USDC) y avisa si ya se cumple', async () => {
    await conPool(async () => {
        const q = await cotizar(RED, { venta: false, cantidad: '10', precio: 0.4 });
        assert.equal(q.disparo, fijo(1 / 0.4, 12));
        assert.match(q.minimo, /^\d+\.\d{12}$/);          // decimales del KDA
        const ya = await cotizar(RED, { venta: false, cantidad: '10', precio: 0.6 });
        assert.equal(ya.yaSeCumple, true);                 // comprar a 0,6 con el precio en 0,5
    });
});

test('por debajo del minimo del contrato no hay cotizacion, y se dice cual es', async () => {
    await conPool(async () => {
        await assert.rejects(cotizar(RED, { venta: true, cantidad: '99', precio: 0.6 }),
            (e) => e.minimo && e.minimo.cantidad === 100 && e.minimo.simbolo === 'KDA');
        await assert.rejects(cotizar(RED, { venta: false, cantidad: '0.5', precio: 0.6 }),
            (e) => e.minimo && e.minimo.cantidad === 1 && e.minimo.simbolo === 'kb-USDC');
    });
});

test('una orden que mueve mas del 10 % del pool se marca', async () => {
    await conPool(async () => {
        const q = await cotizar(RED, { venta: true, cantidad: '200000', precio: 0.5 });
        assert.equal(q.demasiado, 10);
    });
});

test('sin liquidez legible no hay cotizacion (el minimo saldria alto y la orden no entraria)', async () => {
    const antes = globalThis.fetch;
    globalThis.fetch = async () => ({ status: 200, text: async () => JSON.stringify({ result: { status: 'failure', error: { message: 'x' } } }) });
    try {
        await assert.rejects(cotizar(RED, { venta: true, cantidad: '200', precio: 0.6 }), /liquidez/);
    } finally { globalThis.fetch = antes; }
});

test('una orden de compra de la cadena se enseña con el precio en kb-USDC por KDA', () => {
    const o = normalizar({
        id: 'k:7113bfac-1', owner: 'k:x', 'amount-in': 99.92, 'trigger-price': 2,
        'min-out': { decimal: '190' }, 'token-in': { refName: { namespace: 'n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff', name: 'kb-USDC' } },
    });
    assert.equal(o.venta, false);
    assert.equal(o.precio, 0.5);
    assert.equal(o.simIn, 'kb-USDC');
    const v = normalizar({ id: 'a', owner: 'k:x', 'amount-in': 100, 'trigger-price': 0.7, 'min-out': 60, 'token-in': { refName: { namespace: null, name: 'coin' } } });
    assert.equal(v.venta, true);
    assert.equal(v.precio, 0.7);
});

test('Kotlin y Swift firman contra el mismo contrato, custodia y tokens', () => {
    assert.equal(MODULO, 'free.ksw2');
    assert.ok(KOTLIN.includes(`ORDENES_MODULO = "${MODULO}"`));
    assert.ok(KOTLIN.includes(`ORDENES_CUSTODIA = "${CUSTODIA}"`));
    assert.ok(KOTLIN.includes(`ORDENES_USDC = TokenDca("${USDC.modulo}", ${USDC.precision}, "1", "")`));
    assert.ok(KOTLIN.includes(`ORDENES_KDA = TokenDca(DCA_KDA, ${KDA.precision}, "100", "")`));
    assert.ok(SWIFT.includes(`ordenesModulo = "${MODULO}"`));
    assert.ok(SWIFT.includes(`ordenesCustodia = "${CUSTODIA}"`));
    assert.ok(SWIFT.includes(`ordenesUsdc = TokenDca(modulo: "${USDC.modulo}", precision: ${USDC.precision}, minimo: "1", contrato: "")`));
    // Mismo orden de argumentos que el escritorio: id, dueño, keyset, entra, sale,
    // cantidad, disparo, minimo y caducidad.
    assert.match(KOTLIN, /create-order \\"\$id\\" \\"\$owner\\" \(read-keyset \\"ks\\"\) \$\{entra\.modulo\} \$\{sale\.modulo\} \$monto \$trig \$minOut \$ORDENES_TTL/);
    assert.match(SWIFT, /create-order .*\\\(entra\.modulo\) \\\(sale\.modulo\) \\\(monto\) \\\(trig\) \\\(minOut\) \\\(ordenesTtl\)/);
    // Cancelar va SIN clist en los dos: el contrato hace enforce-guard del dueño.
    assert.match(KOTLIN, /cancel-order[\s\S]{0,300}"signers":\[\{"pubKey":"\$publica"\}\]/);
    assert.match(SWIFT, /cancel-order[\s\S]{0,300}\\"signers\\":\[\{\\"pubKey\\":\\"\\\(publica\)\\"\}\]/);
});

test('la pantalla solo manda el sentido y tres numeros a la boveda', () => {
    const i = PANTALLA.indexOf('boveda.firmarCrearOrden({');
    assert.ok(i > 0);
    const llamada = PANTALLA.slice(i, PANTALLA.indexOf('})', i)).replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(llamada, /modulo|custodia|free\.ksw|c:|n_[0-9a-f]{10}/);
    for (const k of ['venta: q.venta', 'cantidad: q.cantidad', 'disparo: q.disparo', 'minimo: q.minimo']) {
        assert.ok(llamada.includes(k), 'falta ' + k);
    }
});
