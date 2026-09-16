// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// PRUEBAS SOBRE EL CODIGO, NO SOBRE EL NAVEGADOR.
//
// Cada una de estas comprobaciones existe porque el fallo que caza ya ha pasado
// una vez en este proyecto. No son reglas de estilo: son cepos puestos donde ya
// hubo un tropiezo, para que el siguiente no llegue al movil de nadie.
//
// Se ejecutan con `npm test`, sin navegador ni aparato.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(RAIZ, 'src');

/** Todos los .js de src/, incluidos los de subcarpetas. */
function ficheros(dir = SRC, acc = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) ficheros(p, acc);
        else if (e.name.endsWith('.js')) acc.push(p);
    }
    return acc;
}

const FUENTES = ficheros().map((f) => ({ ruta: f, nombre: f.slice(SRC.length + 1), texto: readFileSync(f, 'utf8') }));

/**
 * El fuente del plugin Kotlin, si está. Sus mensajes acaban en la pantalla.
 *
 * Se miran las TRES carpetas de fuentes, no solo `main`: desde que hay dos canales
 * de reparto, `KoberletUpdate.kt` vive en `directa/` -Google Play no admite que una
 * app se instale a si misma-. Sus mensajes de error se siguen enseñando y se siguen
 * traduciendo, asi que si solo se leyera `main` este fichero pareceria muerto y sus
 * traducciones, huerfanas.
 */
function ficherosKotlin() {
    const base = join(RAIZ, 'android', 'app', 'src');
    const textos = [];
    for (const variante of ['main', 'directa', 'play']) {
        const dir = join(base, variante, 'java', 'es', 'dnns', 'koberlet');
        try {
            for (const n of readdirSync(dir)) {
                if (n.endsWith('.kt')) textos.push(readFileSync(join(dir, n), 'utf8'));
            }
        } catch (_) {
            // Una variante puede no tener fuentes Kotlin propios: no es un fallo.
        }
    }
    return textos;
}
const IDIOMA = readFileSync(join(SRC, 'idioma.js'), 'utf8');
const INDEX = readFileSync(join(RAIZ, 'index.html'), 'utf8');

// Una cadena entre comillas simples, con sus escapes.
const CADENA = "'((?:[^'\\\\]|\\\\.)*)'";

/**
 * Las cadenas que acaban pasando por t().
 *
 * No basta con buscar `t('…')`: hay textos que se declaran en una lista y se
 * traducen luego con `t(variable)` —los nombres de las secciones, las listas de
 * Info—. Si no se leyeran esas listas, sus frases parecerían no traducidas por un
 * lado y sus traducciones, huérfanas por el otro.
 */
function cadenasTraducidas() {
    const vistas = new Set();
    for (const f of FUENTES) {
        if (f.nombre === 'idioma.js') continue;
        for (const m of f.texto.matchAll(new RegExp('\\bt\\(\\s*' + CADENA, 'g'))) vistas.add(m[1]);
        // t(cond ? 'a' : 'b'), admitiendo una llamada corta dentro de la condición
        // —t(esNativo() ? … : …) es el caso habitual—. La condición se limita a
        // 60 caracteres sin salto de línea: sin ese tope, el patrón se come medio
        // fichero y da por traducidas cadenas que no lo están.
        for (const m of f.texto.matchAll(new RegExp('\\bt\\(\\s*[^?]{0,80}?\\?\\s*' + CADENA + '\\s*:\\s*\\n?\\s*' + CADENA, 'gs'))) {
            vistas.add(m[1]);
            vistas.add(m[2]);
        }
    }

    // Los mensajes que vienen de KOTLIN. El plugin rechaza en español («Contraseña
    // incorrecta.», «La identificación ya no vale en este móvil…») y la pantalla
    // los pinta con `t(String(e.message))`. Sin leerlos aquí, sus traducciones
    // parecerían huérfanas y alguien las borraría, dejando la app en inglés
    // soltando frases en español justo cuando algo va mal.
    //
    // Se buscan FRASES: cadenas entre comillas dobles que empiezan por mayúscula y
    // acaban en punto o en dos puntos. Es una heurística, sí, pero en Kotlin el
    // resto de cadenas son nombres de algoritmo, rutas y código Pact, y ninguna
    // tiene esa forma. Si el plugin no está (nadie compila Android para correr los
    // tests), esto no falla y ya está.
    for (const kt of ficherosKotlin()) {
        const patron = /"([A-ZÁÉÍÓÚÑ¿¡][^"\\]{10,}?[.:…])"/g;
        for (const m of kt.matchAll(patron)) {
            // Las que llevan `${…}` dentro no pueden ser claves del diccionario:
            // cada ejecución produce un texto distinto. Son mensajes de
            // diagnóstico («El servidor respondió 503»), y se quedan fuera.
            if (m[1].trim() && !m[1].includes('${')) vistas.add(m[1]);
        }
    }

    // Nombres de sección: `{ id: 'panel', nombre: 'Panel', … }` → t(s.nombre).
    const navegacion = FUENTES.find((f) => f.nombre === 'navegacion.js').texto;
    for (const m of navegacion.matchAll(new RegExp('nombre:\\s*' + CADENA, 'g'))) vistas.add(m[1]);

    // Listas de Info: pares ['NFT', 'Ver y mover…'] y frases sueltas, todas
    // dentro de constantes en MAYÚSCULAS que después pasan por t().
    const info = FUENTES.find((f) => f.nombre === 'info.js').texto;
    for (const bloque of info.matchAll(/const [A-Z_]+ = \[([\s\S]*?)\n\];/g)) {
        for (const m of bloque[1].matchAll(new RegExp(CADENA, 'g'))) vistas.add(m[1]);
    }

    // Los mensajes de error se lanzan en español desde la bóveda y la capa de
    // red, y se pintan con `t(String(e.message))`. Cuentan como traducibles: si
    // no, la app en inglés soltaría los errores en español y nadie se enteraría
    // hasta verlo en pantalla.
    // `fase0.js` queda fuera: es el banco de pruebas, y sus mensajes («ida y
    // vuelta hex no coincide») son para quien depura, no para quien usa la app.
    for (const f of FUENTES) {
        if (f.nombre === 'fase0.js') continue;
        for (const m of f.texto.matchAll(new RegExp('throw new Error\\(\\s*' + CADENA + '\\s*\\)', 'g'))) {
            vistas.add(m[1]);
        }
    }
    return vistas;
}

/** Las claves del diccionario inglés. */
function clavesDiccionario() {
    const claves = new Map();
    for (const m of IDIOMA.matchAll(new RegExp('^\\s*' + CADENA + ':\\s*\\n?\\s*' + CADENA + ',', 'gm'))) {
        claves.set(m[1], m[2]);
    }
    return claves;
}

// --- 1. Idioma ---------------------------------------------------------------

test('toda frase que pasa por t() tiene su versión inglesa', () => {
    const dic = clavesDiccionario();
    const sinTraducir = [...cadenasTraducidas()].filter((c) => !dic.has(c));
    assert.deepEqual(sinTraducir, [],
        'Estas frases saldrían en español con la app en inglés:\n  ' + sinTraducir.join('\n  '));
});

test('los huecos {0} son los mismos en español y en inglés', () => {
    // Si una traducción pierde un hueco, la frase sale coja: «Chain» sin número,
    // «Gas used:» sin cantidad. Es de los fallos que nadie mira hasta que lo ve
    // un usuario.
    const malas = [];
    for (const [es, en] of clavesDiccionario()) {
        const huecos = (s) => [...s.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(',');
        if (huecos(es) !== huecos(en)) malas.push(`${es}  ->  ${en}`);
    }
    assert.deepEqual(malas, [], 'Traducciones con huecos distintos:\n  ' + malas.join('\n  '));
});

test('el diccionario no arrastra frases que ya no usa nadie', () => {
    // Una traducción huérfana no rompe nada, pero engaña: parece que esa pantalla
    // está traducida cuando el texto que se pinta es otro.
    const usadas = cadenasTraducidas();
    const huerfanas = [...clavesDiccionario().keys()].filter((c) => !usadas.has(c));
    assert.deepEqual(huerfanas, [], 'Sobran en idioma.js:\n  ' + huerfanas.join('\n  '));
});

// --- 2. La función t() tapada por una variable local -------------------------

test('ninguna variable local se llama t en un fichero que importa t()', () => {
    // Pasó dos veces al traducir: `const t = document.createElement(...)` dentro
    // de una función deja sin traductor a todo ese bloque, y JavaScript no se
    // queja: simplemente intenta llamar a un <div>.
    const malos = [];
    for (const f of FUENTES) {
        if (!/import \{[^}]*\bt\b[^}]*\} from '.*idioma\.js'/.test(f.texto)) continue;
        // Declararla, y también recibirla como parámetro: `([v, t]) => …` tapa el
        // traductor igual de bien, y ese apareció de verdad en seguridad.js.
        const sospechas = [
            /\b(?:const|let|var)\s+t\s*=/g,
            /\(\s*t\s*\)\s*=>/g,
            /\(\s*\[[^\]]*,\s*t\s*\]\s*\)\s*=>/g,
            /function\s*\w*\s*\([^)]*\bt\b[^)]*\)/g,
        ];
        for (const patron of sospechas) {
            for (const m of f.texto.matchAll(patron)) {
                const linea = f.texto.slice(0, m.index).split('\n').length;
                malos.push(`${f.nombre}:${linea}  ${m[0].trim()}`);
            }
        }
    }
    assert.deepEqual(malos, [], 'Variables que tapan el traductor:\n  ' + malos.join('\n  '));
});

// --- 3. Colores fuera de los temas -------------------------------------------

test('los colores viven en index.html, no sueltos por el JavaScript', () => {
    // El tema oscuro se rompe justo así: un color escrito a mano en un .js que
    // nadie vuelve a mirar, y que en el tema oscuro queda negro sobre negro.
    //
    // Dos excepciones, y las dos tienen que estar escritas:
    //   - `config.js` guarda el color de marca de cada red y cada token. Eso es
    //     un dato, como el nombre: no cambia porque el usuario ponga modo noche.
    //   - una línea marcada con `color-fijo:` y su motivo, para los sitios donde
    //     el color NO debe seguir al tema (el QR, que se lee por contraste).
    const malos = [];
    for (const f of FUENTES) {
        if (f.nombre === 'config.js') continue;
        const lineas = f.texto.split('\n');
        for (const m of f.texto.matchAll(/['"]#[0-9a-fA-F]{3,8}['"]/g)) {
            const n = f.texto.slice(0, m.index).split('\n').length;
            const alrededor = lineas.slice(Math.max(0, n - 5), n).join('\n');
            if (alrededor.includes('color-fijo:')) continue;
            malos.push(`${f.nombre}:${n}  ${m[0]}`);
        }
    }
    assert.deepEqual(malos, [], 'Colores a pelo (usa var(--…)):\n  ' + malos.join('\n  '));
});

test('cada color del tema claro tiene su pareja en el oscuro', () => {
    const variables = (bloque) => new Set([...bloque.matchAll(/--([a-z-]+):/g)].map((m) => m[1]));
    const claro = INDEX.match(/:root \{([\s\S]*?)\}/);
    const oscuro = INDEX.match(/:root\[data-tema="oscuro"\] \{([\s\S]*?)\}/);
    assert.ok(claro && oscuro, 'No encuentro los dos bloques de tema en index.html');
    const faltan = [...variables(claro[1])].filter((v) => !variables(oscuro[1]).has(v));
    assert.deepEqual(faltan, [], 'Sin valor en el tema oscuro:\n  ' + faltan.join('\n  '));
});

// --- 4. Datos de la red al DOM -----------------------------------------------

test('nada de innerHTML salvo para vaciar', () => {
    // Todo lo que llega del nodo o del indexador se pinta con textContent. Un
    // innerHTML con un dato remoto es la puerta del XSS y, aun con la CSP puesta,
    // la del phishing dentro de la propia pantalla.
    const malos = [];
    for (const f of FUENTES) {
        for (const m of f.texto.matchAll(/\.innerHTML\s*=\s*(.*)/g)) {
            if (/^''\s*;/.test(m[1].trim()) || m[1].trim() === "''") continue;   // vaciar es seguro
            const linea = f.texto.slice(0, m.index).split('\n').length;
            malos.push(`${f.nombre}:${linea}  ${m[1].trim()}`);
        }
    }
    assert.deepEqual(malos, [], 'innerHTML con contenido:\n  ' + malos.join('\n  '));
});

// --- 5. Secciones sin pantalla ------------------------------------------------

test('cada sección de la barra tiene su pantalla', () => {
    // Una entrada en SECCIONES sin su caso en el router es una pestaña que se
    // pulsa y no lleva a ninguna parte, o peor: que cae en el `default` y enseña
    // el panel como si nada.
    const navegacion = readFileSync(join(SRC, 'navegacion.js'), 'utf8');
    const main = readFileSync(join(SRC, 'main.js'), 'utf8');
    const ids = [...navegacion.matchAll(/\{ id: '([a-z]+)'/g)].map((m) => m[1]);
    assert.ok(ids.length >= 4, 'No he sabido leer las secciones de navegacion.js');

    const router = main.match(/async function pintarSeccion[\s\S]*?\n\}/);
    assert.ok(router, 'No encuentro pintarSeccion en main.js');
    const sinPantalla = ids.filter((id) => id !== 'panel' && !router[0].includes(`case '${id}'`));
    assert.deepEqual(sinPantalla, [], 'Secciones sin pantalla:\n  ' + sinPantalla.join('\n  '));
});

// --- 6. La bóveda de desarrollo no puede acabar abierta en el móvil ----------

test('la bóveda simulada lleva su cerrojo', () => {
    const simulada = readFileSync(join(SRC, 'boveda', 'simulada.js'), 'utf8');
    assert.match(simulada, /isNativePlatform/,
        'La bóveda de desarrollo tiene que negarse a arrancar dentro del APK');
    assert.match(simulada, /throw new Error/,
        'El cerrojo tiene que lanzar, no avisar');
});
