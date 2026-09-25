// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// EL DCA CON DOS CONTRATOS, Y LOS TOKENS DEL MERCADO EN LA TARJETA.
//
// Desde la 2.13.0 del escritorio el DCA no es solo KDA <-> kb-USDC: kb-ETH, FLUX y
// bro van a otro contrato, `free.ksw-dca3`, con otra cuenta de custodia. Lo que
// vigila esto:
//
//   1. QUE EL TOKEN ELIGE EL CONTRATO. kb-USDC -> dca2, el resto -> dca3. Si se
//      cruzaran, el deposito iria a una custodia que no guarda ese plan.
//   2. QUE LAS COPIAS DICEN LO MISMO. La pantalla (JS), la firma de Android
//      (Kotlin) y la de iPhone (Swift) llevan cada una su tabla de tokens y de
//      contratos. Si una se desviara, se firmaria contra lo que no es.
//   3. QUE LA PANTALLA SOLO MANDA CLAVES. Ni modulos ni cuentas hacia la boveda.
//   4. QUE LA LISTA DE PLANES LEE LOS DOS CONTRATOS y marca cada plan con el suyo.
//   5. QUE LOS SALDOS DEL MERCADO aguantan un contrato roto sin perder a los demas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOKENS, OTROS, CONTRATOS, contratoDeToken, claveDeModulo, planesDe } from '../src/lib/dca.js';
import { saldosMercado } from '../src/lib/dex.js';
import { valorPorPool } from '../src/valor.js';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lee = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');

const KOTLIN = lee('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'FirmaKda.kt');
const SWIFT = lee('ios', 'KoberletCore', 'Sources', 'KoberletCore', 'FirmaKda.swift');
const PANTALLA = lee('src', 'pantalla-dca.js');

const CUSTODIA = {
    dca2: 'c:QiDAEP0E7hUoDWWxntmLK5LKvAeJm1SHJMAWcBmOZM8',
    dca3: 'c:egWEeU7rKLxU57GgY8Y1ZBWv0_GFQww0DOj9CBlYgr8',
};

const RED = { nodo: 'https://nodo.prueba', networkId: 'mainnet01' };
const CUENTA = 'k:' + 'ab'.repeat(32);

/**
 * Un nodo de mentira: `responde(code)` decide que contesta cada consulta. Se
 * cambia `fetch` solo mientras dura la prueba.
 */
async function conNodo(responde, cuerpo) {
    const antes = globalThis.fetch;
    const vistos = [];
    globalThis.fetch = async (_url, o) => {
        const code = JSON.parse(JSON.parse(o.body).cmd).payload.exec.code;
        vistos.push(code);
        const result = responde(code);
        return { status: 200, text: async () => JSON.stringify({ result }) };
    };
    try {
        return await cuerpo(vistos);
    } finally {
        globalThis.fetch = antes;
    }
}

test('el token elige el contrato: kb-USDC al dca2 y kb-ETH, FLUX y bro al dca3', () => {
    assert.equal(contratoDeToken('kb-USDC'), 'dca2');
    assert.equal(contratoDeToken('kb-ETH'), 'dca3');
    assert.equal(contratoDeToken('FLUX'), 'dca3');
    assert.equal(contratoDeToken('bro'), 'dca3');
    // KDA va en los dos: no decide nada. Y lo que no se conoce, tampoco.
    assert.equal(contratoDeToken('KDA'), null);
    assert.equal(contratoDeToken('PCO'), null);
    assert.equal(contratoDeToken('__proto__'), null);
    assert.equal(contratoDeToken('toString'), null);
    assert.deepEqual(OTROS, ['kb-USDC', 'kb-ETH', 'FLUX', 'bro']);
    assert.deepEqual(Object.keys(CONTRATOS), ['dca2', 'dca3']);
});

test('los minimos por compra son los MIN-IN del contrato', () => {
    assert.equal(TOKENS.KDA.min, 100);
    assert.equal(TOKENS['kb-USDC'].min, 1);
    assert.equal(TOKENS['kb-ETH'].min, 0.0004);
    assert.equal(TOKENS.FLUX.min, 15);
    assert.equal(TOKENS.bro.min, 0.0002);
    // La clave vuelve del modulo, que es como lo devuelve la cadena.
    for (const k of Object.keys(TOKENS)) assert.equal(claveDeModulo(TOKENS[k].modulo), k);
    assert.equal(claveDeModulo('n_otro.kb-ETH'), null);
});

test('Kotlin y Swift llevan los mismos tokens, precisiones, minimos y contratos que la pantalla', () => {
    for (const k of OTROS) {
        const tk = TOKENS[k];
        const kt = `"${k}" to TokenDca("${tk.modulo}", ${tk.precision}, "${tk.min}", "${tk.contrato}")`;
        const sw = `"${k}": TokenDca(modulo: "${tk.modulo}", precision: ${tk.precision}, minimo: "${tk.min}", contrato: "${tk.contrato}")`;
        assert.ok(KOTLIN.includes(kt), 'Kotlin no lleva: ' + kt);
        assert.ok(SWIFT.includes(sw), 'Swift no lleva: ' + sw);
    }
    // KDA, con su minimo de 100.
    assert.match(KOTLIN, /DCA_KDA_TOKEN = TokenDca\(DCA_KDA, 12, "100", ""\)/);
    assert.match(SWIFT, /dcaKdaToken = TokenDca\(modulo: dcaKda, precision: 12, minimo: "100", contrato: ""\)/);
});

test('cada contrato lleva SU custodia, en Kotlin y en Swift', () => {
    for (const [k, c] of Object.entries(CONTRATOS)) {
        const kt = new RegExp(`"${k}" to ContratoDca\\("${c.modulo.replace('.', '\\.')}", "${CUSTODIA[k]}", gasolinera = (true|false)\\)`);
        const m = KOTLIN.match(kt);
        assert.ok(m, 'Kotlin no casa ' + k + ' con su custodia');
        // La gasolinera solo paga el dca2.
        assert.equal(m[1], k === 'dca2' ? 'true' : 'false');
        assert.ok(SWIFT.includes(`"${k}": ContratoDca(modulo: "${c.modulo}", custodia: "${CUSTODIA[k]}")`),
            'Swift no casa ' + k + ' con su custodia');
    }
    // Y ninguna otra cuenta c: suelta por el DCA del codigo nativo.
    const dcaKt = KOTLIN.slice(KOTLIN.indexOf('// --- DCA: crear'), KOTLIN.indexOf('// --- Enviar un token que no es KDA'));
    const cuentas = new Set(dcaKt.match(/c:[A-Za-z0-9_-]{43}/g));
    assert.deepEqual([...cuentas].sort(), Object.values(CUSTODIA).sort());
});

test('la pantalla solo manda claves a la boveda, nunca modulos ni cuentas', () => {
    for (const metodo of ['firmarCrearDca', 'firmarGestionDca']) {
        const i = PANTALLA.indexOf(`boveda.${metodo}({`);
        assert.ok(i > 0, 'no encuentro la llamada a ' + metodo);
        // Sin los comentarios, que hablan de modulos y custodias para explicarlo.
        const llamada = PANTALLA.slice(i, PANTALLA.indexOf('});', i)).replace(/\/\/.*$/gm, '');
        assert.doesNotMatch(llamada, /modulo|custodia|free\.ksw|c:|n_[0-9a-f]{10}/, metodo + ' manda algo que no es una clave');
    }
    assert.match(PANTALLA, /token: otro,/);
    assert.match(PANTALLA, /contrato: p\.contrato,/);
    assert.match(PANTALLA, /entra: p\.claveEntra \|\| '',/);
});

test('la lista de planes lee los dos contratos y marca cada plan con el suyo', async () => {
    const plan = (id, tin, tout) => ({
        id, status: 'active', 'token-in': tin, 'token-out': tout,
        quota: { decimal: '1.0' }, balance: { decimal: '5.0' }, period: { int: 3600 }, buys: { int: 0 },
    });
    await conNodo((code) => {
        if (code.startsWith('(free.ksw-dca2.plans-of')) {
            return { status: 'success', data: [plan('a-1', 'coin', TOKENS['kb-USDC'].modulo)] };
        }
        if (code.startsWith('(free.ksw-dca3.plans-of')) {
            return { status: 'success', data: [plan('a-2', { refName: { namespace: null, name: 'runonflux.flux' } }, 'coin')] };
        }
        return { status: 'failure', error: { message: 'no' } };
    }, async (vistos) => {
        const planes = await planesDe(CUENTA, RED);
        assert.equal(vistos.length, 2);
        assert.deepEqual(planes.map((p) => [p.id, p.contrato, p.claveEntra, p.simboloEntra]), [
            ['a-1', 'dca2', 'KDA', 'KDA'],
            ['a-2', 'dca3', 'FLUX', 'FLUX'],
        ]);
        assert.deepEqual(planes.fallidos, []);
    });
});

test('si un contrato no contesta se enseña el otro y se dice cual falta', async () => {
    await conNodo((code) => (code.startsWith('(free.ksw-dca2')
        ? { status: 'success', data: [] }
        : { status: 'failure', error: { message: 'roto' } }), async () => {
        const planes = await planesDe(CUENTA, RED);
        assert.equal(planes.length, 0);
        assert.deepEqual(planes.fallidos, ['free.ksw-dca3']);
    });
    await conNodo(() => ({ status: 'failure', error: { message: 'roto' } }), async () => {
        await assert.rejects(planesDe(CUENTA, RED), /No se pudieron leer tus planes/);
    });
});

test('saldos del Mercado: de 12 en 12, y un contrato roto no se lleva a los demas', async () => {
    const mods = Array.from({ length: 14 }, (_, i) => 'ns.tok' + i);
    mods.push('ns.roto');
    await conNodo((code) => {
        const pedidos = [...code.matchAll(/\((ns\.[a-z0-9]+)\.get-balance/g)].map((m) => m[1]);
        // El roto tumba su tanda entera, aunque vaya dentro de un `try`.
        if (pedidos.includes('ns.roto')) return { status: 'failure', error: { message: 'Cannot resolve ns.roto' } };
        return { status: 'success', data: pedidos.map((m) => (m === 'ns.tok3' ? { decimal: '2.5' } : (m === 'ns.tok13' ? 1 : -1.0))) };
    }, async (vistos) => {
        const s = await saldosMercado(RED, CUENTA, mods.concat(['coin', 'mal"formado']));
        assert.deepEqual(s, { 'ns.tok3': 2.5, 'ns.tok13': 1 });
        // Dos tandas (12 + 3), y la segunda repetida token a token.
        assert.equal(vistos.length, 2 + 3);
        assert.ok(vistos.every((c) => !c.includes('coin.get-balance') && !c.includes('mal"')));

        // El roto queda apartado para la sesion: la siguiente vez ni se pregunta.
        vistos.length = 0;
        await saldosMercado(RED, CUENTA, ['ns.roto', 'ns.tok3']);
        assert.equal(vistos.length, 1);
        assert.ok(!vistos[0].includes('ns.roto'));
    });
});

test('un token del Mercado vale su cantidad por el precio de su pool y el del KDA', () => {
    assert.equal(valorPorPool(10, 0.5, { unidad: 2 }), 10);
    assert.equal(valorPorPool(0, 0.5, { unidad: 2 }), null);
    assert.equal(valorPorPool(10, 0, { unidad: 2 }), null);
    assert.equal(valorPorPool(10, 0.5, null), null);
});
