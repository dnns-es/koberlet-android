// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LO QUE SE LE OFRECE A UNA WEB AL CONECTAR (WalletConnect).
//
// El fallo que obliga a esta prueba, encontrado el 25/09/2026 y arreglado en la
// 0.59.4: Antonio leyo el QR de mercatusdex.fun y la conexion murio con
//
//   Non conforming namespaces. approve() namespaces chains don't satisfy required
//   namespaces. Required: kadena:mainnet01,kadena:testnet04,kadena:development.
//   Approved: kadena:mainnet01
//
// La web pedia tres redes y el monedero aprobaba siempre una. No hay forma de
// verlo antes de tener el movil delante y una web que pida mas de una red, asi
// que se comprueba aqui.
//
// Las dos mitades importan por igual:
//   - lo que se puede dar sin mentir, SE DA   (las redes: la misma clave vale en
//     todas, y la red de verdad va dentro del comando que se firma)
//   - lo que no se sabe hacer, NO se promete  (metodos y avisos: mejor un «no» a
//     tiempo que una sesion que se cae al primer uso)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loQuePide, namespacesParaAprobar, claveDeCuenta } from '../src/lib/wc-namespaces.js';

// Los métodos se leen del fichero de verdad, no se copian: `walletconnect.js`
// carga el SDK y no se puede importar aquí, pero si esta lista fuera una copia a
// mano, la prueba seguiría pasando el día que la de verdad cambie.
const FUENTE = readFileSync(new URL('../src/lib/walletconnect.js', import.meta.url), 'utf8');
const METODOS = JSON.parse(FUENTE.match(/export const METODOS = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));
const BASE = { cadena: 'kadena:mainnet01', metodos: METODOS };
const CLAVE = 'a'.repeat(64);
const OTRA = 'b'.repeat(64);

const pide = (req, opc) => ({ obliga: loQuePide(req), suelta: loQuePide(opc) });

test('el caso de mercatusdex: se aprueban LAS TRES redes que pide', () => {
    const p = pide({
        kadena: {
            chains: ['kadena:mainnet01', 'kadena:testnet04', 'kadena:development'],
            // Y los tres métodos que exige: el tercero, `kadena_sign_v1`, fue el
            // segundo tropiezo con esta web (0.59.4 decía «no sé hacerlo»).
            methods: ['kadena_getAccounts_v1', 'kadena_quicksign_v1', 'kadena_sign_v1'],
            events: [],
        },
    });
    const ns = namespacesParaAprobar(p, [CLAVE], BASE);
    assert.deepEqual(ns.kadena.chains, ['kadena:mainnet01', 'kadena:testnet04', 'kadena:development']);
    // Y una cuenta por red, que es lo que mira el SDK: sin ellas, las redes
    // aprobadas no cuentan.
    assert.deepEqual(ns.kadena.accounts, [
        'kadena:mainnet01:' + CLAVE,
        'kadena:testnet04:' + CLAVE,
        'kadena:development:' + CLAVE,
    ]);
});

test('mainnet va la primera aunque la web la pida la última', () => {
    const p = pide({ kadena: { chains: ['kadena:development', 'kadena:mainnet01'], methods: [], events: [] } });
    const ns = namespacesParaAprobar(p, [CLAVE], BASE);
    assert.equal(ns.kadena.chains[0], 'kadena:mainnet01');
    // Las webs se quedan con la PRIMERA cuenta de la lista: tiene que ser la de
    // mainnet y la cartera elegida.
    assert.equal(ns.kadena.accounts[0], 'kadena:mainnet01:' + CLAVE);
});

test('la cartera elegida va delante dentro de cada red', () => {
    const p = pide({ kadena: { chains: ['kadena:mainnet01', 'kadena:testnet04'], methods: [], events: [] } });
    const ns = namespacesParaAprobar(p, [CLAVE, OTRA], BASE);
    assert.deepEqual(ns.kadena.accounts, [
        'kadena:mainnet01:' + CLAVE, 'kadena:mainnet01:' + OTRA,
        'kadena:testnet04:' + CLAVE, 'kadena:testnet04:' + OTRA,
    ]);
});

test('una web que no diga nada sigue conectando a mainnet', () => {
    const ns = namespacesParaAprobar(pide(null, null), [CLAVE], BASE);
    assert.deepEqual(ns.kadena.chains, ['kadena:mainnet01']);
    assert.deepEqual(ns.kadena.methods, BASE.metodos);
});

test('las redes opcionales también se ofrecen, sin repetirse', () => {
    const p = pide(
        { kadena: { chains: ['kadena:mainnet01'], methods: [], events: [] } },
        { kadena: { chains: ['kadena:mainnet01', 'kadena:testnet04'], methods: [], events: [] } },
    );
    const ns = namespacesParaAprobar(p, [CLAVE], BASE);
    assert.deepEqual(ns.kadena.chains, ['kadena:mainnet01', 'kadena:testnet04']);
});

test('la otra forma de pedir: una clave por red, sin lista de chains', () => {
    const p = pide({
        'kadena:mainnet01': { methods: ['kadena_quicksign_v1'], events: [] },
        'kadena:testnet04': { methods: ['kadena_quicksign_v1'], events: [] },
    });
    const ns = namespacesParaAprobar(p, [CLAVE], BASE);
    assert.deepEqual(ns.kadena.chains, ['kadena:mainnet01', 'kadena:testnet04']);
});

test('lo de otras cadenas ni se mira', () => {
    const p = pide({
        eip155: { chains: ['eip155:1'], methods: ['eth_sendTransaction'], events: ['chainChanged'] },
        kadena: { chains: ['kadena:mainnet01'], methods: [], events: [] },
    });
    const ns = namespacesParaAprobar(p, [CLAVE], BASE);
    assert.deepEqual(ns.kadena.chains, ['kadena:mainnet01']);
    assert.deepEqual(Object.keys(ns), ['kadena']);
});

test('un método EXIGIDO que no sabemos hacer no se promete: no se conecta', () => {
    const p = pide({ kadena: { chains: ['kadena:mainnet01'], methods: ['kadena_inventado_v9'], events: [] } });
    assert.throws(() => namespacesParaAprobar(p, [CLAVE], BASE), /WC_METODO_RARO: kadena_inventado_v9/);
});

test('un método solo OPCIONAL que no sabemos hacer no impide conectar, y no se promete', () => {
    const p = pide(
        { kadena: { chains: ['kadena:mainnet01'], methods: ['kadena_quicksign_v1'], events: [] } },
        { kadena: { chains: [], methods: ['kadena_inventado_v9'], events: [] } },
    );
    const ns = namespacesParaAprobar(p, [CLAVE], BASE);
    assert.ok(!ns.kadena.methods.includes('kadena_inventado_v9'), JSON.stringify(ns.kadena.methods));
    assert.ok(ns.kadena.methods.includes('kadena_quicksign_v1'));
});

test('avisos exigidos: tampoco se prometen', () => {
    const p = pide({ kadena: { chains: ['kadena:mainnet01'], methods: [], events: ['accountsChanged'] } });
    assert.throws(() => namespacesParaAprobar(p, [CLAVE], BASE), /WC_AVISOS_RAROS: accountsChanged/);
});

test('sin ninguna clave válida no se aprueba nada', () => {
    for (const malas of [[], ['no-es-una-clave'], ['ab']]) {
        assert.throws(() => namespacesParaAprobar(pide(null, null), malas, BASE), /ninguna cuenta/);
    }
});

test('la clave se saca de la cuenta sea cual sea el largo de la red', () => {
    assert.equal(claveDeCuenta('kadena:mainnet01:' + CLAVE), CLAVE);
    assert.equal(claveDeCuenta('kadena:development:' + CLAVE), CLAVE);
});
