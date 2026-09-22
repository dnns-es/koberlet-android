// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LA ELECCION DE NODO DE KADENA (src/lib/nodo.js).
//
// Esto existe por la tarde del 22-09-2026. El nodo publico de la comunidad, que
// era el unico que la app conocia y estaba escrito a fuego:
//
//   1. IBA LENTO: 1.625 ms de mediana por lectura, con un pico de 12.343 ms,
//      mientras otros dos nodos de la MISMA cadena contestaban en 81 y 90 ms.
//   2. Y LO GRAVE: SERVIA DATOS VIEJOS. Su balanceador tenia al menos un nodo
//      pegado detras y en 1 de cada 10 peticiones contestaba con una altura 19
//      bloques atrasada, unos diez minutos. Eso NO da ningun error: te pinta
//      saldos que ya no son.
//
// De ahi la regla que se comprueba aqui y que es facil de romper sin querer al
// tocar el orden: UN NODO ATRASADO SE APARTA AUNQUE SEA EL MAS RAPIDO DE TODOS.
// Si alguien simplifica esto a «ordenar por latencia», vuelve el fallo
// silencioso.
//
// Lo que NO se prueba aqui es `medir()`: sale por `red.js`, que arrastra
// `@capacitor/core` y necesita un navegador. Por eso `medir()` carga red.js
// cuando hace falta y no al importar el modulo; asi todo lo que DECIDE se puede
// probar aqui, que es lo que se rompe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenar, configurar, urlValida, leerGuardado, DE_FABRICA, TOLERANCIA_BLOQUES } from '../src/lib/nodo.js';

test('un nodo atrasado no gana por ser el más rápido', () => {
    // El rapido va 19 bloques atrasado (justo lo que se midio en el nodo roto) y
    // el lento va al dia. Tiene que ganar el LENTO.
    const orden = ordenar([
        { url: 'https://rapido-pero-viejo', ms: 30, altura: 7251509, ok: true },
        { url: 'https://lento-pero-al-dia', ms: 900, altura: 7251528, ok: true },
    ]);
    assert.equal(orden[0].url, 'https://lento-pero-al-dia');
    assert.equal(orden[1].atrasado, true);
    assert.equal(orden[1].retraso, 19, 'el retraso en bloques hace falta para poder enseñarlo');
});

test('entre dos que van al día manda la latencia', () => {
    const orden = ordenar([
        { url: 'https://b', ms: 400, altura: 100, ok: true },
        { url: 'https://a', ms: 80, altura: 100, ok: true },
    ]);
    assert.equal(orden[0].url, 'https://a');
});

test('un desfase pequeño no aparta a nadie', () => {
    // Entre nodos sanos hay siempre un bloque de diferencia. Si eso descalificara,
    // la app estaria cambiando de nodo cada diez minutos sin motivo.
    const orden = ordenar([
        { url: 'https://rapido', ms: 50, altura: 100 - TOLERANCIA_BLOQUES, ok: true },
        { url: 'https://lento', ms: 900, altura: 100, ok: true },
    ]);
    assert.equal(orden[0].url, 'https://rapido');
    assert.equal(orden[0].atrasado, false);
});

test('el orden completo es: al día, atrasado, caído', () => {
    // Un dato viejo es peor que uno fresco, pero mejor que ningun dato.
    const orden = ordenar([
        { url: 'https://caido', ms: 5000, altura: null, ok: false, error: 'no contestó' },
        { url: 'https://viejo', ms: 20, altura: 80, ok: true },
        { url: 'https://bueno', ms: 300, altura: 100, ok: true },
    ]);
    assert.deepEqual(orden.map((m) => m.url.replace('https://', '')), ['bueno', 'viejo', 'caido']);
});

test('si TODOS van atrasados se coge el más adelantado, no se queda sin nodo', () => {
    // Con un solo nodo vivo no hay con quien compararlo: no puede salir atrasado.
    const orden = ordenar([
        { url: 'https://unico', ms: 200, altura: 50, ok: true },
        { url: 'https://caido', ms: null, altura: null, ok: false, error: 'no contestó' },
    ]);
    assert.equal(orden[0].url, 'https://unico');
    assert.equal(orden[0].atrasado, false);
});

test('en la lista no cuela lo que no sea https', () => {
    // Por http cualquiera en la misma wifi cambia la respuesta al vuelo, y un
    // saldo alterado es justo lo que mas duele.
    const e = configurar({
        networkId: 'mainnet01',
        lista: ['http://127.0.0.1:1', 'javascript:alert(1)', 'https://u:p@nodo.example',
            'https://nodo.example/?x=1', 'https://nodo.propio.example'],
    });
    assert.equal(e.lista.includes('http://127.0.0.1:1'), false);
    assert.equal(e.lista.some((u) => u.startsWith('javascript')), false);
    assert.equal(e.lista.some((u) => u.includes('@')), false);
    assert.equal(e.lista.some((u) => u.includes('?')), false);
    assert.equal(e.lista.includes('https://nodo.propio.example'), true);
});

test('los de fábrica van siempre y van los primeros', () => {
    // Que una lista guardada vieja no pueda dejar la app sin nodos.
    const e = configurar({ lista: ['https://solo-el-mio.example'] });
    assert.equal(e.lista[0], DE_FABRICA[0]);
    DE_FABRICA.forEach((u) => assert.equal(e.lista.includes(u), true));
});

test('la lista no se duplica al reconfigurar', () => {
    assert.equal(configurar({ lista: DE_FABRICA.slice() }).lista.length, DE_FABRICA.length);
});

test('fijar a mano manda sobre la medida', () => {
    const e = configurar({ fijo: DE_FABRICA[2] });
    assert.equal(e.elegido, DE_FABRICA[2]);
    assert.equal(e.fijo, DE_FABRICA[2]);
});

test('fijar uno que no está en la lista no cuela', () => {
    const e = configurar({ fijo: 'https://este-no-esta.example' });
    assert.equal(e.fijo, null);
});

test('urlValida es quien dice que sí y que no', () => {
    assert.equal(urlValida('https://chainweb.eckowallet.com'), true);
    assert.equal(urlValida('http://chainweb.eckowallet.com'), false);
    assert.equal(urlValida('chainweb.eckowallet.com'), false);
    assert.equal(urlValida(''), false);
    assert.equal(urlValida(null), false);
});

test('sin almacenamiento, lo guardado se lee vacío en vez de reventar', () => {
    // En este test no hay `localStorage`: es exactamente lo que pasa en un
    // navegador con el almacenamiento bloqueado, y la app tiene que arrancar
    // igual con los nodos de fábrica.
    const g = leerGuardado();
    assert.deepEqual(g, { lista: [], fijo: null });
});
