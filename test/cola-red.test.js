// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LA COLA DE PETICIONES DE `src/red.js`.
//
// Por que se vigila esto y no se da por bueno: la cola es un contador y una lista
// de esperas, y si un hueco se pierde -porque una peticion fallo y nadie lo
// solto-, la app se queda SIN RED para siempre y sin decir nada. No se cae, no
// avisa: simplemente deja de cargar. Es de los fallos mas caros de encontrar
// mirando la pantalla, y de los mas baratos de cazar aqui.
//
// El limite existe porque el nodo castiga el aluvion: 60 peticiones de golpe
// tardaban 10,4 s y perdian 6 respuestas, y de 8 en 8 tardan 1,1 s y no pierden
// ninguna (medido el 17/09/2026, ver el comentario de `src/red.js`).
//
// `red.js` no se puede importar aqui: arrastra `@capacitor/core`, que necesita un
// navegador. Lo que se prueba es la MISMA maquinaria de cola, copiada abajo; si
// se toca la de red.js hay que tocar esta, y por eso el ultimo test comprueba que
// las dos siguen diciendo lo mismo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const A_LA_VEZ = 8;

function hacerCola(limite) {
    let enElAire = 0;
    const cola = [];
    let maxVisto = 0;

    async function pedirTurno() {
        if (enElAire < limite) { enElAire++; maxVisto = Math.max(maxVisto, enElAire); return; }
        await new Promise((seguir) => cola.push(seguir));
        maxVisto = Math.max(maxVisto, enElAire);
    }
    function soltarTurno() {
        const siguiente = cola.shift();
        if (siguiente) siguiente();
        else enElAire--;
    }
    // `tarea` puede resolver o lanzar: las dos cosas tienen que soltar el hueco.
    async function conCola(tarea) {
        await pedirTurno();
        try {
            return await tarea();
        } finally {
            soltarTurno();
        }
    }
    return { conCola, vistas: () => ({ maxVisto, enElAire, esperando: cola.length }) };
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

test('nunca hay mas peticiones en el aire que el limite', async () => {
    const { conCola, vistas } = hacerCola(A_LA_VEZ);
    await Promise.all(Array.from({ length: 60 }, () => conCola(() => dormir(5))));
    const v = vistas();
    assert.ok(v.maxVisto <= A_LA_VEZ, `llegaron a haber ${v.maxVisto} a la vez, y el tope es ${A_LA_VEZ}`);
    assert.equal(v.enElAire, 0, 'al terminar no puede quedar ningun hueco cogido');
    assert.equal(v.esperando, 0, 'al terminar no puede quedar nadie esperando');
});

test('las 60 peticiones se hacen todas, no se pierde ninguna por el camino', async () => {
    const { conCola } = hacerCola(A_LA_VEZ);
    let hechas = 0;
    await Promise.all(Array.from({ length: 60 }, () => conCola(async () => { await dormir(1); hechas++; })));
    assert.equal(hechas, 60);
});

// ESTE es el que importa de verdad. Una peticion que falla es lo normal -una
// chain que no contesta, el movil sin cobertura-, y si eso se comiera el hueco,
// a la octava la app se quedaria muda del todo.
test('una peticion que falla suelta su hueco igual', async () => {
    const { conCola, vistas } = hacerCola(2);
    const intentos = Array.from({ length: 20 }, (_, i) =>
        conCola(async () => {
            await dormir(1);
            if (i % 2 === 0) throw new Error('esta chain no contesta');
            return i;
        }).catch(() => 'fallo'));

    const salidas = await Promise.all(intentos);
    assert.equal(salidas.filter((x) => x === 'fallo').length, 10, 'tienen que fallar 10');
    assert.equal(vistas().enElAire, 0, 'un fallo no puede dejarse un hueco cogido');
    assert.equal(vistas().esperando, 0);

    // Y despues de 10 fallos la cola tiene que seguir sirviendo.
    assert.equal(await conCola(async () => 'sigue viva'), 'sigue viva');
});

test('el limite de red.js es el que se prueba aqui', () => {
    const fuente = readFileSync(new URL('../src/red.js', import.meta.url), 'utf8');
    const m = /const A_LA_VEZ = (\d+);/.exec(fuente);
    assert.ok(m, 'no se encuentra A_LA_VEZ en src/red.js');
    assert.equal(Number(m[1]), A_LA_VEZ,
        `red.js va de ${m[1]} en ${m[1]} y este fichero prueba de ${A_LA_VEZ} en ${A_LA_VEZ}`);
});

test('red.js suelta el hueco en un finally, no solo cuando sale bien', () => {
    const fuente = readFileSync(new URL('../src/red.js', import.meta.url), 'utf8');
    // Dos salidas a la red -postJson y getTexto- y las dos tienen que soltar
    // pase lo que pase. Sin el finally, la cola se seca en cuanto falle algo.
    const finallys = (fuente.match(/finally\s*\{\s*(?:\/\/[^\n]*\n\s*)*soltarTurno\(\);/g) || []).length;
    assert.equal(finallys, 2, 'postJson y getTexto tienen que soltar el turno en un finally');
});
