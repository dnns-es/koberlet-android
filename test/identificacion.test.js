// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LO QUE AVISO UN PROBADOR DESDE UN IPAD (17/09/2026).
//
// Cinco notas por TestFlight, y tres de ellas se pueden vigilar desde aqui:
//
//   - en un iPhone o un iPad no hay lector de huella, asi que la app no puede
//     llamarlo «huella»: lo dice el sistema y se pinta lo que diga;
//   - el dialogo del sistema lo escribia el codigo nativo en castellano, y con la
//     app en ingles salia en castellano igual;
//   - el boton de firmar se quedaba puesto mientras la transaccion estaba en el
//     aire, y con el de la identificacion se podia firmar dos veces.
//
// Son pruebas de LECTURA del codigo, no de navegador: aqui no hay DOM. Lo que
// comprueban es que nadie vuelva a escribir la version de antes sin enterarse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const leer = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');

const PANTALLAS = readdirSync(join(RAIZ, 'src'))
    .filter((n) => n.endsWith('.js'))
    .map((n) => ({ nombre: n, texto: leer('src', n) }));

// --- 1. Como se llama la identificacion --------------------------------------

test('ninguna pantalla llama «huella» a lo que puede ser Face ID', () => {
    // El nombre sale de `biometria.js`, que lo saca de lo que diga el aparato.
    // Una pantalla que escriba «Firmar con huella» a pelo vuelve a mentir en un
    // iPhone, y encima sin que nadie lo note hasta tener uno delante.
    const culpables = PANTALLAS
        .filter((f) => f.nombre !== 'biometria.js' && f.nombre !== 'idioma.js')
        .filter((f) => /t\('(Firmar|Abrir|Activar|Dejar de usar)[^']*huella/.test(f.texto))
        .map((f) => f.nombre);
    assert.deepEqual(culpables, [],
        'Estas pantallas escriben «huella» en vez de preguntar qué hay en el aparato:\n  '
        + culpables.join('\n  '));
});

test('el nombre de la identificación sale de lo que diga el sistema', () => {
    const bio = leer('src', 'biometria.js');
    // Face ID y Touch ID son nombres propios: no se traducen ni se inventan.
    assert.match(bio, /tipo === 'faceid'\) return 'Face ID'/);
    assert.match(bio, /tipo === 'touchid'\) return 'Touch ID'/);
    // Y los dos nativos tienen que contestar ese campo, o no hay nada que leer.
    assert.match(leer('ios', 'App', 'App', 'Huella.swift'), /case \.faceID: return "faceid"/);
    assert.match(leer('ios', 'App', 'App', 'KoberletVault.swift'), /"tipo": Huella\.tipo\(\)/);
    assert.match(leer('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'Huella.kt'),
        /FEATURE_FINGERPRINT\) -> "huella"/);
    assert.match(leer('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'KoberletVault.kt'),
        /\.put\("tipo", Huella\.tipo\(context\)\)/);
});

// --- 2. El texto del dialogo del sistema -------------------------------------

test('cada firma que puede pedir la identificación manda su texto traducido', () => {
    const nativa = leer('src', 'boveda', 'nativa.js');
    // Los metodos del plugin que firman algo: todos pueden llegar con
    // {huella:true}, asi que todos necesitan su frase para el dialogo.
    const metodos = [...nativa.matchAll(/llamar\('(firmar[A-Za-z]+)'/g)].map((m) => m[1]);
    assert.ok(metodos.length >= 10, 'no se han encontrado los métodos de firma');
    const motivos = nativa.slice(nativa.indexOf('const MOTIVOS'), nativa.indexOf('async function llamar'));
    const sinFrase = [...new Set(metodos)].filter((m) => !motivos.includes(`${m}:`));
    assert.deepEqual(sinFrase, [],
        'Estas firmas sacarían el diálogo del sistema en castellano:\n  ' + sinFrase.join('\n  '));
    // Y abrir la cartera con la identificación, que no es una firma pero también
    // saca diálogo.
    assert.ok(motivos.includes('abrir:'));
    assert.ok(motivos.includes('bioActivar:'));
});

test('los dos nativos usan el texto que les manda la pantalla', () => {
    const kt = leer('android', 'app', 'src', 'main', 'java', 'es', 'dnns', 'koberlet', 'KoberletVault.kt');
    const swift = leer('ios', 'App', 'App', 'KoberletVault.swift');
    // Si el nativo se queda con su cadena fija, da igual lo que mande la pantalla.
    assert.match(kt, /call\.getString\("motivo"\)/);
    assert.match(swift, /call\.getString\("motivo"\)/);
});

// --- 3. Firmar dos veces lo mismo --------------------------------------------

test('el botón de la identificación se esconde mientras la firma está en el aire', () => {
    // El de la contraseña ya se escondia; el de la identificacion se quedaba, y
    // encima se añade DESPUES -sale de una promesa-, asi que tambien hay que
    // taparlo si la respuesta llega con la firma ya empezada.
    for (const n of ['enviar.js', 'enviar-eth.js']) {
        const s = leer('src', n);
        assert.match(s, /if \(conBio\) conBio\.hidden = true;/, n);
        assert.match(s, /conBio\.hidden = enMarcha/, n);
        assert.match(s, /if \(enMarcha\) return;/, n);
    }
});

test('el DCA no deja firmar dos veces ni arrastra el error del plan anterior', () => {
    const dca = leer('src', 'pantalla-dca.js');
    assert.match(dca, /const olvidarAviso = \(\) => \{ if \(!enMarcha\) salida\.innerHTML = ''; \};/);
    // El aviso se borra al cambiar cualquiera de las cuatro cosas del plan.
    assert.match(dca, /girar\.addEventListener\('click', \(\) => \{\s*\n\s*if \(enMarcha\) return;/);
    assert.match(dca, /cada\.sel\.addEventListener\('change', olvidarAviso\);/);
    assert.ok((dca.match(/olvidarAviso\(\);/g) || []).length >= 3);
    // Y crear un plan dos veces ingresaria el bote dos veces.
    assert.ok((dca.match(/if \(enMarcha\) return;/g) || []).length >= 2);
});

// --- 4. El comprobador del puente --------------------------------------------

test('el comprobador del puente no se ofrece donde no puede contestar', () => {
    const pu = leer('src', 'pantalla-puente.js');
    // Pregunta por el mensaje del puente con la referencia de KADENA. En un envío
    // de vuelta lo guardado es el hash de Ethereum, y contestaba que el
    // identificador no tiene buena pinta.
    assert.match(pu, /const desdeEthereum = \(e\) => e\.red === 'ethereum';/);
    assert.match(pu, /if \(desdeEthereum\(e\)\) \{[\s\S]{0,400}?hoja\.append\(f\);\s*\n\s*return;/);
    // Y en uno ya entregado no queda nada que comprobar.
    assert.match(pu, /if \(e\.estado === 'entregado'\) \{\s*\n\s*hoja\.append\(f\);/);
    // El estado se cuenta en el sentido del viaje, no siempre como si saliera de Kadena.
    assert.match(pu, /deEth \? t\('Salió de Ethereum'\) : t\('Salió de Kadena'\)/);
});
