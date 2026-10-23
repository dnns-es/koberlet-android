// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// WalletConnect: lo que se firma tiene que caber en lo que se aprobo al conectar.
// Aviso privado de Alex (GHSA-wj7g-5v28-pj92, contra el escritorio; el movil comparte
// estas piezas), hallazgos 3a, 3c, 3d, 3e y 3f, y el issue #7 (enlace koberlet://).
// Es la misma prueba que test/wc-sesion.test.js del escritorio: PARIDAD.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ns from '../src/lib/wc-namespaces.js';
import { wcDeEnlace } from '../src/lib/wc-enlace.js';
import { CADENA, METODOS } from '../src/lib/walletconnect.js';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lee = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');
const MIA = 'ab'.repeat(32), OTRA_MIA = 'cd'.repeat(32), AJENA = 'ef'.repeat(32);
const base = { cadena: CADENA, metodos: METODOS };

test('3d: solo las redes que pide la web', () => {
    const soloTest = { obliga: ns.loQuePide({ kadena: { chains: ['kadena:testnet04'] } }), suelta: ns.loQuePide({}) };
    assert.deepEqual(ns.namespacesParaAprobar(soloTest, [MIA], base).kadena.chains, ['kadena:testnet04']);
    const nada = { obliga: ns.loQuePide({}), suelta: ns.loQuePide({}) };
    assert.deepEqual(ns.namespacesParaAprobar(nada, [MIA], base).kadena.chains, ['kadena:mainnet01']);
    const mezcla = { obliga: ns.loQuePide({ kadena: { chains: ['kadena:testnet04', 'kadena:mainnet01'] } }), suelta: ns.loQuePide({}) };
    assert.equal(ns.namespacesParaAprobar(mezcla, [MIA], base).kadena.chains[0], 'kadena:mainnet01');
});

test('3a y 3d: lo que se pide firmar, contra la sesion', () => {
    const sesion = { namespaces: { kadena: { chains: ['kadena:mainnet01'], accounts: ['kadena:mainnet01:' + MIA] } } };
    const cmd = (net, ks) => JSON.stringify({ networkId: net, signers: ks.map((k) => ({ pubKey: k, clist: [{ name: 'coin.GAS', args: [] }] })) });
    const mias = [MIA, OTRA_MIA];
    assert.equal(ns.motivoFueraDeSesion(cmd('mainnet01', [MIA]), sesion, mias), '');
    assert.equal(ns.motivoFueraDeSesion(cmd('mainnet01', [MIA, AJENA]), sesion, mias), '');
    assert.match(ns.motivoFueraDeSesion(cmd('mainnet01', [OTRA_MIA]), sesion, mias), /no se compartió/);
    assert.match(ns.motivoFueraDeSesion(cmd('mainnet01', [MIA, OTRA_MIA]), sesion, mias), /no se compartió/);
    assert.match(ns.motivoFueraDeSesion(cmd('testnet04', [MIA]), sesion, mias), /testnet04/);
    assert.notEqual(ns.motivoFueraDeSesion(cmd('mainnet01', [MIA]), null, mias), '');
});

test('3e: Verify', () => {
    assert.equal(ns.verificacion({ verified: { validation: 'VALID' } }), 'ok');
    assert.equal(ns.verificacion({ verified: { validation: 'INVALID' } }), 'mal');
    assert.equal(ns.verificacion({ verified: { validation: 'VALID', isScam: true } }), 'estafa');
    assert.equal(ns.verificacion(undefined), 'sin');
});

test('3c, 3f e issue #7 en la pantalla y el transporte', () => {
    const p = lee('src', 'pantalla-wc.js');
    const w = lee('src', 'lib', 'walletconnect.js');
    assert.match(p, /await wc\.aprobarSesion\(p\.id, \[publica\]\);/, '3c: una sola cuenta');
    assert.match(w, /session_request_expire/, '3f');
    assert.match(p, /if \(!sesion\) throw new Error\('La web ya cerró esta conexión/, 'issue #7: sesion cerrada no firma');
    assert.match(p, /motivoFueraDeSesion\(comando\.cmd, sesion, misClaves\(\)\)/, '3a: se mira otra vez al firmar');
    assert.doesNotMatch(p, /emparejar\(delEnlace\)/, 'el enlace no conecta solo');
});

test('issue #7: enlace koberlet://', () => {
    const WC = 'wc:' + 'a1'.repeat(32) + '@2?relay-protocol=irn&symKey=' + 'b2'.repeat(32);
    assert.equal(wcDeEnlace('koberlet://wc?uri=' + encodeURIComponent(WC)), WC);
    assert.equal(wcDeEnlace('koberlet://wc?uri=' + WC), WC);
    assert.equal(wcDeEnlace('koberlet://otra?uri=' + encodeURIComponent(WC)), null);
    assert.equal(wcDeEnlace('kadena:k:' + MIA), null);
    assert.equal(wcDeEnlace('koberlet://wc?uri=' + encodeURIComponent(WC + '"><img>')), null);
    assert.match(lee('android', 'app', 'src', 'main', 'AndroidManifest.xml'), /android:scheme="koberlet" android:host="wc"/);
    assert.match(lee('ios', 'App', 'App', 'Info.plist'), /<string>koberlet<\/string>/);
});

test('5 (M-1): los NFT no se cargan de la red de casa', async () => {
    const { destinoPermitido, ipPrivada } = await import('../src/lib/nft.js');
    for (const u of ['http://[::ffff:127.0.0.1]/', 'http://100.64.0.1/', 'http://2130706433/', 'http://[::1]/', 'http://[fe80::1]/', 'http://192.168.1.1/', 'http://localhost/']) {
        assert.equal(destinoPermitido(u), false, u);
    }
    assert.equal(destinoPermitido('https://ipfs.io/ipfs/x'), true);
    assert.ok(ipPrivada('10.1.2.3') && !ipPrivada('8.8.8.8'));
});
