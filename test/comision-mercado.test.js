// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LA COMISIÓN DE SERVICIO DEL MERCADO.
//
// El cambio del Mercado era lo único que no sostenía el proyecto: el pool se
// quedaba su 0,3 % y Koberlet no cobraba nada, mientras el DCA y las órdenes
// límite ya cobraban su 0,5 % dentro de sus contratos. Desde la 0.54 el cambio
// cobra lo mismo, y aquí se vigila lo que solo se notaría con dinero puesto:
//
//   1. EL REPARTO CUADRA. Comisión + lo que va al pool no puede pasarse de lo que
//      el usuario dijo que daba: pasarse es quedarse bloqueado o que la
//      transferencia falle por fondos insuficientes.
//   2. NO SE COBRA DE MÁS. Ni un decimal por encima del 0,5 %: eso es cobrar lo
//      que no es tuyo.
//   3. LOS DECIMALES SON LOS DEL TOKEN. Mandar más decimales de los que el token
//      admite hace que el contrato tire la transacción entera.
//   4. LAS TRES COPIAS DICEN LO MISMO. La pantalla (JS), la firma de Android
//      (Kotlin) y la de iPhone (Swift) tienen que llevar la MISMA cuenta y el
//      MISMO tope; si una se desviara, el dinero iría a otro sitio en un aparato
//      y no en el otro.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { reparto, FEE_KOBERLET, CUENTA_KOBERLET, CLAVE_KOBERLET } from '../src/lib/dex.js';
import { COMISION_KOB_PCT } from '../src/lib/ethswap.js';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lee = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');

const decimalesDe = (x) => {
    const s = String(x);
    if (s.includes('e-')) return Number(s.split('e-')[1]) + (s.split('e-')[0].split('.')[1] || '').length;
    return (s.split('.')[1] || '').length;
};

test('el reparto cuadra y no se cobra de más', () => {
    const casos = [
        { entra: 100, dec: 12 },                    // KDA
        { entra: 1234.567891234567, dec: 12 },
        { entra: 25, dec: 6 },                      // kb-USDC
        { entra: 1.999999, dec: 6 },
        { entra: 0.01, dec: 6 },
        { entra: 7, dec: 0 },                       // un token sin decimales
    ];
    for (const c of casos) {
        const { comision, alPool, comisionStr, alPoolStr } = reparto(c.entra, c.dec);
        const suma = Number((comision + alPool).toFixed(c.dec));
        assert.ok(suma <= Number(c.entra.toFixed(c.dec)) + Number.EPSILON,
            `${c.entra}: se reparte más de lo que entra (${comision} + ${alPool})`);
        assert.ok(suma > Number(c.entra.toFixed(c.dec)) - 2 * Math.pow(10, -c.dec),
            `${c.entra}: se pierde por el camino (${comision} + ${alPool})`);
        assert.ok(comision <= c.entra * FEE_KOBERLET + 1e-12,
            `${c.entra}: cobra de más (${comision} > ${c.entra * FEE_KOBERLET})`);
        assert.ok(decimalesDe(comision) <= c.dec && decimalesDe(alPool) <= c.dec,
            `${c.entra}: más decimales de los que admite el token`);
        // El texto es lo que acaba dentro del comando firmado: lo que se enseña y
        // lo que se firma tienen que ser el mismo número.
        assert.equal(Number(comisionStr), comision);
        assert.equal(Number(alPoolStr), alPool);
    }
});

test('una cantidad ridícula no genera una comisión de cero que se firme igual', () => {
    // Con 6 decimales, 0,0001 da una comisión de 0,0000005 -> al suelo, cero. Que
    // salga cero está bien; lo que no puede es salir negativo ni comerse el neto.
    const { comision, alPool } = reparto(0.0001, 6);
    assert.equal(comision, 0);
    assert.equal(alPool, 0.0001);
});

test('la comisión es la acordada y la cuenta es una k: válida', () => {
    assert.equal(FEE_KOBERLET, 0.005);
    assert.match(CUENTA_KOBERLET, /^k:[0-9a-f]{64}$/);
    assert.equal(CUENTA_KOBERLET, 'k:' + CLAVE_KOBERLET);
});

test('la pantalla, Android y iPhone cobran en la misma cuenta y con el mismo tope', () => {
    const kotlin = lee('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'FirmaKda.kt');
    const swift = lee('ios', 'KoberletCore', 'Sources', 'KoberletCore', 'FirmaKda.swift');
    for (const [nombre, texto] of [['Kotlin', kotlin], ['Swift', swift]]) {
        assert.ok(texto.includes(CUENTA_KOBERLET), `${nombre} no lleva la cuenta que cobra`);
        assert.ok(texto.includes(CLAVE_KOBERLET), `${nombre} no lleva la clave del keyset`);
        assert.ok(texto.includes('transfer-create'), `${nombre} no cobra dentro del cambio`);
        assert.ok(texto.includes('ks-koberlet'), `${nombre} no manda el keyset del cobro`);
    }
    // El tope del 0,5 % está escrito en los dos, cada uno a su manera.
    assert.ok(kotlin.includes('COMISION_TOPE = "0.005"'), 'Kotlin no tiene el tope del 0,5 %');
    assert.ok(swift.includes('exponent: -3, significand: 5'), 'Swift no tiene el tope del 0,5 %');
});

test('la cuenta que cobra NO viaja desde la pantalla al firmar', () => {
    // La pantalla dice cuánto, nunca a dónde: si `pantalla-mercado.js` mandara una
    // cuenta de destino, un XSS en el WebView podría desviar la comisión.
    const pantalla = lee('src', 'pantalla-mercado.js');
    assert.ok(!pantalla.includes(CUENTA_KOBERLET), 'la pantalla no debe llevar la cuenta de la comisión');
    assert.match(pantalla, /comision: q\.comisionStr/, 'la pantalla debe mandar la comisión que enseñó');
    assert.match(pantalla, /cantidad: q\.alPoolStr/, 'al pool se firma el neto, no lo que se entrega');
});

test('en Ethereum reparte el propio Uniswap, y siempre a la misma cuenta', () => {
    // Aquí no hay contrato nuestro: el router sabe apartar una parte dentro del mismo
    // multicall. La cuenta que cobra vive en el código nativo, como los contratos, y
    // los dos aparatos tienen que llevar la MISMA, o el dinero iría a sitios distintos.
    const kotlin = lee('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'SwapEvm.kt');
    const swift = lee('ios', 'KoberletCore', 'Sources', 'KoberletCore', 'SwapEvm.swift');
    const CUENTA = '0x4A31148aD2BF0355C93bf7C9218Bb723F15c901c';
    for (const [nombre, texto] of [['Kotlin', kotlin], ['Swift', swift]]) {
        assert.ok(texto.includes(CUENTA), `${nombre} no lleva la cuenta que cobra`);
        assert.ok(texto.includes('9b2c0a37'), `${nombre} no desenvuelve repartiendo`);
        assert.ok(texto.includes('e0e189a0'), `${nombre} no barre el token repartiendo`);
        assert.ok(/50/.test(texto) && texto.includes('100'), `${nombre} no lleva los bips ni el tope`);
    }
    // La pantalla dice cuánto se cambia, nunca a dónde va la comisión.
    assert.ok(!lee('src', 'mercado-eth.js').includes(CUENTA), 'la pantalla no debe llevar la cuenta');
    assert.ok(!lee('src', 'lib', 'ethswap.js').includes(CUENTA), 'la parte web no debe llevar la cuenta');
    assert.equal(COMISION_KOB_PCT, 0.5);
});

test('en Ethereum lo que se enseña es lo que se recibe', () => {
    // El suelo que se firma va contra lo que da el POOL; lo que se enseña es eso menos
    // la comisión. Enseñar el bruto sería prometer más de lo que llega.
    const fuente = lee('src', 'lib', 'ethswap.js');
    assert.match(fuente, /const neto = mejor\.salida - comisionKob/);
    assert.match(fuente, /netoMinimo = minimo - \(minimo \* COMISION_KOB_BIPS\) \/ 10000n/);
    const pantalla = lee('src', 'mercado-eth.js');
    assert.match(pantalla, /cot\.netoMinimoTexto/, 'el mínimo que se enseña tiene que ser el neto');
    assert.match(pantalla, /minimo: q\.minimoTexto/, 'el que se firma sigue siendo el del pool');
});

test('lo que se simula es lo mismo que luego se firma', () => {
    // La simulación es lo último que puede decir que NO antes de que salga el
    // dinero: si simulara el comando viejo -sin el cobro-, no estaría probando nada.
    const dex = lee('src', 'lib', 'dex.js');
    assert.match(dex, /transfer-create/);
    assert.match(dex, /ks-koberlet/);
    assert.match(dex, /amountIn: \{ decimal: q\.alPoolStr \}/);
});
