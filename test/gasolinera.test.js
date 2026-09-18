// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LA GASOLINERA: QUIÉN PAGA EL GAS.
//
// `free.ksw-gasolinera` paga el gas de las operaciones de KoberluSW. La web lo
// usaba desde agosto; el móvil no, así que el mismo cambio salía gratis en el
// ordenador y de pago en el teléfono.
//
// De todo lo que hay que acertar para que funcione, esto vigila lo que NO avisa
// cuando se rompe. El contrato, si algo no le cuadra, no dice «te has pasado de
// gas» ni «esa llamada no me vale»: la transacción muere comprando el gas y al
// usuario le llega «Failed to buy gas». Por eso se comprueba aquí y no en el
// móvil de alguien:
//
//   1. EL TOPE DE GAS. El contrato rechaza por encima de 8000, y el que se firma
//      sale de multiplicar el medido por el margen. Si el margen creciera sin que
//      nadie mire, las operaciones grandes empezarían a fallar.
//   2. LA FORMA DEL CÓDIGO. El contrato mira que cada llamada EMPIECE por un
//      módulo permitido. Envolverlas en un `(let ...)` —que es como se firmaban
//      antes, y como se siguen firmando cuando paga el usuario— las esconde.
//   3. EL UMBRAL. 5 kb-USDC, y medido sobre la pata que de verdad está en
//      kb-USDC: al vender KDA, el mínimo garantizado, nunca lo esperado.
//   4. LAS DOS COPIAS DICEN LO MISMO. La pantalla (JS) y la firma (Kotlin) tienen
//      que llevar el mismo tope y la misma cuenta; si una se desviara, se firmaría
//      contra una gasolinera que no es.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { valorEnUsdc, MIN_GRATIS_USDC, GAS_TOPE_GRATIS } from '../src/lib/dex.js';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lee = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');

const USDC = 'n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC';
const KDA = 'coin';

// Lo que hace la pantalla con el gas medido, escrito una sola vez para poder
// probarlo: el 1,3 es el margen sobre la simulación.
const gasAFirmar = (medido) => Math.ceil(medido * 1.3);

test('el gas que se firma cabe en el tope del contrato', () => {
    // Medido en cadena sobre los 100 últimos pagos de la gasolinera (agosto y
    // septiembre de 2026): de 668 a 2312.
    for (const medido of [668, 836, 1961, 2312]) {
        assert.ok(
            gasAFirmar(medido) <= GAS_TOPE_GRATIS,
            `con ${medido} de gas real se firmarían ${gasAFirmar(medido)}, y el tope es ${GAS_TOPE_GRATIS}`,
        );
    }
});

test('por encima del tope no se pide gasolinera: se paga y ya', () => {
    // 6154 * 1,3 = 8001. Un punto por encima y el contrato lo rechaza entero.
    const medido = 6155;
    assert.ok(gasAFirmar(medido) > GAS_TOPE_GRATIS);
    // La pantalla tiene que decidir por el gas ya multiplicado, no por el medido:
    // 6155 cabría en 8000 y llevaría a firmar algo que el contrato tira.
    assert.ok(medido < GAS_TOPE_GRATIS, 'el medido solo engaña si se mira sin el margen');
});

test('el umbral se mide sobre la pata que está en kb-USDC', () => {
    // Comprando: lo que se entrega ya son kb-USDC.
    assert.equal(valorEnUsdc({ de: USDC, a: KDA, cantidad: '7.5', minimo: '900' }), 7.5);

    // Vendiendo KDA: vale el MÍNIMO garantizado, no lo esperado. Es la única cifra
    // que la cadena promete; entre la cotización y el bloque, lo esperado se cae.
    assert.equal(valorEnUsdc({ de: KDA, a: USDC, cantidad: '1000', minimo: '5.2' }), 5.2);

    // Sin ninguna pata en kb-USDC no se puede valorar sin meter un precio de
    // mercado aquí, así que no se subvenciona.
    assert.equal(valorEnUsdc({ de: KDA, a: 'kaddex.kdx', cantidad: '1000', minimo: '30' }), 0);
});

test('justo en 5 entra, justo por debajo no', () => {
    const vale = (v) => v >= MIN_GRATIS_USDC;
    assert.equal(vale(valorEnUsdc({ de: USDC, a: KDA, cantidad: '5', minimo: '0' })), true);
    assert.equal(vale(valorEnUsdc({ de: USDC, a: KDA, cantidad: '4.999999', minimo: '0' })), false);
    // Vendiendo, el que manda es el mínimo: aunque se esperen 6, si solo se
    // garantizan 4,9 no se subvenciona.
    assert.equal(vale(valorEnUsdc({ de: KDA, a: USDC, cantidad: '1000', minimo: '4.9' })), false);
});

test('con gasolinera las llamadas van sueltas, nunca dentro de un (let', () => {
    const js = lee('src', 'lib', 'dex.js');
    // La forma con `let` tiene que seguir existiendo: es la que se firma cuando
    // paga el usuario, y ahí sí conviene devolver el resultado del cambio.
    assert.ok(js.includes('(let ((r ${cambio})) ${cobro} r)'), 'falta la forma con let');
    assert.ok(js.includes('`${cambio} ${cobro}`'), 'falta la forma de dos llamadas sueltas');

    const kt = lee('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'FirmaKda.kt');
    assert.ok(kt.includes('gratis -> "$cambio $cobro"'), 'la firma nativa no parte las llamadas');
});

test('la pantalla y la firma nativa hablan de la misma gasolinera', () => {
    const kt = lee('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'FirmaKda.kt');

    // La cuenta sale del propio contrato, `(free.ksw-gasolinera.cuenta)`. Si se
    // tocara, el gas se pediría a una cuenta que no es y no lo pagaría nadie.
    assert.ok(
        kt.includes('c:Mq0gKlGBdjKvkBJLr4ECCu3_OxQ4_GJOzlYS0Ems-CY'),
        'la cuenta de la gasolinera no es la del contrato',
    );
    assert.ok(kt.includes('free.ksw-gasolinera'), 'falta el módulo de la gasolinera');

    // El tope tiene que ser el mismo a los dos lados: si el JS creyera que caben
    // 12000, mandaría a firmar transacciones que el contrato rechaza.
    const topeKt = /GASOLINERA_GASLIMIT\s*=\s*(\d+)/.exec(kt);
    assert.ok(topeKt, 'no se encuentra el tope de gas en Kotlin');
    assert.equal(Number(topeKt[1]), GAS_TOPE_GRATIS);

    // gasPrice: el contrato exige 1e-8 o menos, y se escribe sin notación
    // exponencial para no depender de cómo la interprete el JSON de Pact.
    assert.ok(kt.includes('GASOLINERA_GASPRICE = "0.00000001"'), 'el gasPrice no es el del contrato');
});

test('pausar, reanudar y cerrar no van por la gasolinera', () => {
    // Firman SIN clist, porque el contrato hace `enforce-guard` directo sobre el
    // guard del dueño y una firma acotada deja de valer para eso. Meterles la
    // capability del gas les rompería la comprobación de dueño, y el fallo saldría
    // como «Failed to buy gas», que no se parece en nada a la causa.
    const kt = lee('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'FirmaKda.kt');
    assert.ok(
        kt.includes('if (gratis && accion != "recargar")'),
        'falta el freno que deja fuera a pausar, reanudar y cerrar',
    );
});
