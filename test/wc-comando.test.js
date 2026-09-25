// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// `kadena_sign_v1`: EL COMANDO LO MONTA EL MONEDERO.
//
// Con quicksign la web manda el comando hecho; con sign_v1 manda piezas y aqui se
// arma. Lo que se comprueba es lo que, si sale mal, se firma algo distinto de lo
// que se enseño o la web no entiende la respuesta:
//
//   - los permisos van TAL CUAL: ni uno menos ni uno mas;
//   - la clave firmante es la nuestra, y los extraSigners van SIN permisos;
//   - la red la pone la sesion, no la peticion;
//   - la respuesta de cada metodo tiene SU forma (`body` o `responses`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comandoDeFirma, respuestaFirmada } from '../src/lib/wc-comando.js';

const CLAVE = 'a'.repeat(64);
const OTRA = 'b'.repeat(64);

// Una peticion como la de un DEX: transferir al pool y pagar el gas.
const PETICION = {
    code: '(kaddex.exchange.swap-exact-in 1.0 0.9 [coin free.token] "k:aaa" "k:aaa" (read-keyset "ks"))',
    data: { ks: { keys: [CLAVE], pred: 'keys-all' } },
    caps: [
        { role: 'Gas', description: 'paga el gas', cap: { name: 'coin.GAS', args: [] } },
        { role: 'Transfer', description: 'al pool', cap: { name: 'coin.TRANSFER', args: ['k:' + CLAVE, 'pool', { decimal: '1.0' }] } },
    ],
    nonce: 'n-1',
    chainId: '2',
    gasLimit: 3000,
    gasPrice: 1e-8,
    ttl: 600,
    sender: 'k:' + CLAVE,
};

test('monta un comando de Kadena con todas sus piezas', () => {
    const c = JSON.parse(comandoDeFirma(PETICION, 'mainnet01', CLAVE));
    assert.equal(c.networkId, 'mainnet01');
    assert.equal(c.payload.exec.code, PETICION.code);
    assert.deepEqual(c.payload.exec.data, PETICION.data);
    assert.equal(c.meta.chainId, '2');
    assert.equal(c.meta.sender, 'k:' + CLAVE);
    assert.equal(c.meta.gasLimit, 3000);
    assert.equal(c.meta.gasPrice, 1e-8);
    assert.equal(c.meta.ttl, 600);
    assert.equal(c.nonce, 'n-1');
    // Un poco en el pasado, nunca en el futuro: el nodo rechaza lo que viene de él.
    assert.ok(c.meta.creationTime <= Math.floor(Date.now() / 1000));
});

test('los permisos van tal cual los pidió la web: ni uno menos ni uno más', () => {
    const c = JSON.parse(comandoDeFirma(PETICION, 'mainnet01', CLAVE));
    assert.equal(c.signers.length, 1);
    assert.equal(c.signers[0].pubKey, CLAVE);
    assert.deepEqual(c.signers[0].clist, [
        { name: 'coin.GAS', args: [] },
        { name: 'coin.TRANSFER', args: ['k:' + CLAVE, 'pool', { decimal: '1.0' }] },
    ]);
});

test('los extraSigners van sin permisos, y nuestra clave no se repite', () => {
    const c = JSON.parse(comandoDeFirma({ ...PETICION, extraSigners: [OTRA, CLAVE, 'basura'] }, 'mainnet01', CLAVE));
    assert.deepEqual(c.signers.map((s) => s.pubKey), [CLAVE, OTRA]);
    assert.equal(c.signers[1].clist, undefined);
});

test('la red la pone la sesión, aunque la petición diga otra', () => {
    const c = JSON.parse(comandoDeFirma({ ...PETICION, networkId: 'testnet04' }, 'mainnet01', CLAVE));
    assert.equal(c.networkId, 'mainnet01');
});

test('también se entiende la petición envuelta en «body»', () => {
    const c = JSON.parse(comandoDeFirma({ body: PETICION }, 'mainnet01', CLAVE));
    assert.equal(c.payload.exec.code, PETICION.code);
});

test('sin gas, precio ni vida, los de siempre de Kadena', () => {
    const { gasLimit, gasPrice, ttl, ...resto } = PETICION;
    const c = JSON.parse(comandoDeFirma(resto, 'mainnet01', CLAVE));
    assert.equal(c.meta.gasLimit, 2000);
    assert.equal(c.meta.gasPrice, 1e-8);
    assert.equal(c.meta.ttl, 600);
});

test('lo que no se puede montar no se monta', () => {
    assert.throws(() => comandoDeFirma({ ...PETICION, code: '' }, 'mainnet01', CLAVE), /WC_SIN_CODIGO/);
    assert.throws(() => comandoDeFirma(PETICION, 'mainnet01', 'no-es-clave'), /WC_SIN_CUENTA/);
    assert.throws(() => comandoDeFirma({ ...PETICION, chainId: undefined }, 'mainnet01', CLAVE), /WC_SIN_CHAIN/);
    assert.throws(() => comandoDeFirma({ ...PETICION, chainId: 'dos' }, 'mainnet01', CLAVE), /WC_SIN_CHAIN/);
});

test('sign_v1 contesta UN comando dentro de «body»', () => {
    const r = respuestaFirmada('kadena_sign_v1', [{ cmd: '{}', pubKey: CLAVE, sig: 'S', hash: 'H' }]);
    assert.deepEqual(r, { body: { cmd: '{}', hash: 'H', sigs: [{ sig: 'S' }] } });
});

test('quicksign contesta una lista en «responses», como antes', () => {
    const r = respuestaFirmada('kadena_quicksign_v1', [{ cmd: '{}', pubKey: CLAVE, sig: 'S', hash: 'H' }]);
    assert.deepEqual(r, {
        responses: [{
            commandSigData: { cmd: '{}', sigs: [{ pubKey: CLAVE, sig: 'S' }] },
            outcome: { result: 'success', hash: 'H' },
        }],
    });
});
