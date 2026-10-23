// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// AVISO PRIVADO DE ALEX (GHSA-wj7g-5v28-pj92, 23/10/2026), hallazgo 1: por
// WalletConnect se podia firmar SIN LIMITES (firmante sin clist) sin aviso, y en
// `kadena_sign_v1` sin caps la montaba el propio monedero. Es el mismo trozo que en el
// escritorio, asi que el arreglo es el mismo, y aqui ademas lo para el nativo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { comandoDeFirma } from '../src/lib/wc-comando.js';
import { explicar } from '../src/lib/walletconnect.js';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lee = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');
const CLAVE = 'ab'.repeat(32);

test('sign_v1 sin caps se acota a coin.GAS, nunca sin limites', () => {
    const j = JSON.parse(comandoDeFirma({ code: '(free.hello.greet "hi")', chainId: '2' }, 'mainnet01', CLAVE));
    assert.deepEqual(j.signers[0].clist, [{ name: 'coin.GAS', args: [] }]);
});

test('explicar marca las claves sin limites y solo coin.TRANSFER es KDA', () => {
    const cmd = JSON.stringify({
        networkId: 'mainnet01', nonce: 'n1',
        payload: { exec: { code: '(x)', data: { a: 1 } } },
        signers: [
            { pubKey: CLAVE },
            { pubKey: 'cd'.repeat(32), clist: [
                { name: 'marmalade-v2.ledger.TRANSFER', args: ['t:1', 'k:a', 'k:b', 1] },
                { name: 'coin.TRANSFER', args: ['k:a', 'k:b', { decimal: '5.0' }] },
            ] },
        ],
        meta: { chainId: '2', sender: 'k:a', gasLimit: 1000, gasPrice: 1e-8, ttl: 600, creationTime: 1790000000 },
    });
    const d = explicar(cmd);
    assert.deepEqual(d.sinLimite, [CLAVE]);
    assert.deepEqual(d.permisos.map((p) => p.mueveDinero), [false, true]);
    assert.equal(d.ttl, 600);
    assert.equal(d.nonce, 'n1');
    assert.deepEqual(d.datos, { a: 1 });
});

test('Kotlin y Swift no firman sin limites sin la casilla', () => {
    const kt = lee('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'KoberletVault.kt');
    const sw = lee('ios', 'App', 'App', 'KoberletVault.swift');
    assert.match(kt, /if \(sinLimite\.contains\(publica\.lowercase\(\)\) && !aceptaSinLimite\)/);
    assert.match(sw, /if sinLimite\.contains\(publica\.lowercased\(\)\) && !aceptaSinLimite/);
    // Y la casilla solo vale marcada de verdad.
    const p = lee('src', 'pantalla-wc.js');
    assert.match(p, /const aceptaSinLimite = casillas\.length > 0 && casillas\.every\(\(c\) => c\.checked\);/);
});
