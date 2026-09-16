// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// GENERADOR DE LOS GRAFICOS DE LA FICHA DE GOOGLE PLAY.
//
// Play pide dos imagenes con medidas exactas y SIN CANAL ALFA:
//
//   - icono:  512x512 PNG de 32 bits... pero opaco. Si lleva transparencia, la
//             Consola lo rechaza al subirlo. Es el error mas comun de la ficha.
//   - grafico de funciones: 1024x500, tambien opaco. Es la banda que sale arriba
//             del todo en la ficha y en las promociones.
//
// Se generan desde el icono del propio proyecto (`ic_launcher_foreground.png`, el
// de 432 px, que es el mas grande que hay) en vez de dibujarlos aparte: asi la
// ficha de la tienda enseña EXACTAMENTE el icono que luego aparece en el movil. Un
// icono de tienda distinto del instalado es de las cosas que hacen dudar a alguien
// que esta a punto de guardar dinero en una app.
//
// No usa ninguna dependencia. Node trae zlib, que es lo unico que hace falta para
// leer y escribir PNG; meter `sharp` o `canvas` en un monedero para recortar dos
// imagenes seria añadir codigo nativo de terceros al proyecto a cambio de nada.
//
// Uso:  node herramientas/assets-play.js

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inflateSync, deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(RAIZ, 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png');
const DESTINO = join(RAIZ, 'play/assets');

// El verde de fondo del icono adaptativo, el mismo de `values/ic_launcher_background.xml`.
const VERDE = [0x63, 0xE0, 0x38];

// --- Leer un PNG -------------------------------------------------------------
// Solo hace falta el caso que usa este proyecto: 8 bits por canal, RGBA o RGB, sin
// entrelazado. Si algun dia el icono se guarda de otra forma, esto avisa en vez de
// sacar una imagen rara.

function leerPng(ruta) {
    const b = readFileSync(ruta);
    if (b.readUInt32BE(0) !== 0x89504E47) throw new Error(`${ruta} no es un PNG.`);

    let ancho = 0, alto = 0, canales = 0;
    const trozos = [];
    let i = 8;
    while (i < b.length) {
        const largo = b.readUInt32BE(i);
        const tipo = b.toString('ascii', i + 4, i + 8);
        const datos = b.subarray(i + 8, i + 8 + largo);
        if (tipo === 'IHDR') {
            ancho = datos.readUInt32BE(0);
            alto = datos.readUInt32BE(4);
            const bits = datos[8], color = datos[9], entrelazado = datos[12];
            if (bits !== 8) throw new Error('Solo se leen PNG de 8 bits por canal.');
            if (entrelazado !== 0) throw new Error('No se leen PNG entrelazados.');
            if (color === 6) canales = 4;
            else if (color === 2) canales = 3;
            else throw new Error(`Tipo de color ${color} no soportado (se esperaba RGB o RGBA).`);
        } else if (tipo === 'IDAT') {
            trozos.push(datos);
        } else if (tipo === 'IEND') break;
        i += 12 + largo;
    }

    const crudo = inflateSync(Buffer.concat(trozos));
    const porFila = ancho * canales;
    const pix = Buffer.alloc(alto * porFila);

    // Deshacer los filtros por fila. Cada fila del PNG empieza por un byte que dice
    // con que filtro se codifico; sin deshacerlo la imagen sale como un barrido.
    for (let y = 0; y < alto; y++) {
        const filtro = crudo[y * (porFila + 1)];
        const orig = crudo.subarray(y * (porFila + 1) + 1, (y + 1) * (porFila + 1));
        const fila = pix.subarray(y * porFila, (y + 1) * porFila);
        const arriba = y > 0 ? pix.subarray((y - 1) * porFila, y * porFila) : null;
        for (let x = 0; x < porFila; x++) {
            const a = x >= canales ? fila[x - canales] : 0;      // pixel de la izquierda
            const c = arriba ? arriba[x] : 0;                     // pixel de encima
            const d = arriba && x >= canales ? arriba[x - canales] : 0;
            let v = orig[x];
            if (filtro === 1) v += a;
            else if (filtro === 2) v += c;
            else if (filtro === 3) v += (a + c) >> 1;
            else if (filtro === 4) {
                const p = a + c - d;
                const pa = Math.abs(p - a), pb = Math.abs(p - c), pc = Math.abs(p - d);
                v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? c : d);
            }
            fila[x] = v & 0xFF;
        }
    }
    return { ancho, alto, canales, pix };
}

// --- Escribir un PNG RGB (sin alfa) -----------------------------------------

function crc32(buf) {
    let c = ~0;
    for (const byte of buf) {
        c ^= byte;
        for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
    return ~c >>> 0;
}

function trozo(tipo, datos) {
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(cuerpo));
    return Buffer.concat([largo, cuerpo, crc]);
}

/** Guarda RGB de 8 bits, tipo de color 2: sin canal alfa, que es lo que exige Play. */
function escribirPngRgb(ruta, ancho, alto, rgb) {
    const porFila = ancho * 3;
    const conFiltro = Buffer.alloc(alto * (porFila + 1));
    for (let y = 0; y < alto; y++) {
        conFiltro[y * (porFila + 1)] = 0;                   // filtro 0: ninguno
        rgb.copy(conFiltro, y * (porFila + 1) + 1, y * porFila, (y + 1) * porFila);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(ancho, 0);
    ihdr.writeUInt32BE(alto, 4);
    ihdr[8] = 8;    // bits por canal
    ihdr[9] = 2;    // tipo de color 2 = RGB, SIN alfa
    writeFileSync(ruta, Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        trozo('IHDR', ihdr),
        trozo('IDAT', deflateSync(conFiltro, { level: 9 })),
        trozo('IEND', Buffer.alloc(0)),
    ]));
}

// --- Componer ----------------------------------------------------------------

/** Color de un punto del origen, en coordenadas reales, con interpolacion bilineal. */
function muestra(img, fx, fy) {
    const { ancho, alto, canales, pix } = img;
    const x0 = Math.max(0, Math.min(ancho - 1, Math.floor(fx)));
    const y0 = Math.max(0, Math.min(alto - 1, Math.floor(fy)));
    const x1 = Math.min(ancho - 1, x0 + 1);
    const y1 = Math.min(alto - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const en = (x, y, c) => pix[(y * ancho + x) * canales + c];
    const sal = [];
    for (let c = 0; c < canales; c++) {
        const a = en(x0, y0, c) * (1 - tx) + en(x1, y0, c) * tx;
        const b = en(x0, y1, c) * (1 - tx) + en(x1, y1, c) * tx;
        sal.push(a * (1 - ty) + b * ty);
    }
    return sal;                              // [R,G,B,A] o [R,G,B]
}

/**
 * Pinta el icono centrado en un lienzo de fondo liso.
 *
 * `escala` es cuanto del lado menor del lienzo ocupa el icono. Para el icono de la
 * tienda va a 1 (el icono llena el cuadro, como en el movil); para la banda va mas
 * pequeño, porque ahi el icono es un elemento dentro de una composicion.
 */
function componer(origen, ancho, alto, fondo, escala, centroX = 0.5) {
    const rgb = Buffer.alloc(ancho * alto * 3);
    for (let i = 0; i < ancho * alto; i++) {
        rgb[i * 3] = fondo[0];
        rgb[i * 3 + 1] = fondo[1];
        rgb[i * 3 + 2] = fondo[2];
    }
    const lado = Math.min(ancho, alto) * escala;
    const x0 = centroX * ancho - lado / 2;
    const y0 = alto / 2 - lado / 2;

    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(alto, Math.ceil(y0 + lado)); y++) {
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(ancho, Math.ceil(x0 + lado)); x++) {
            const fx = ((x + 0.5 - x0) / lado) * origen.ancho - 0.5;
            const fy = ((y + 0.5 - y0) / lado) * origen.alto - 0.5;
            const c = muestra(origen, fx, fy);
            // El origen es el icono adaptativo: lleva alfa, y donde es transparente
            // tiene que verse el fondo. Sin mezclar aqui, los bordes salen con una
            // orla oscura que en un icono de tienda canta muchisimo.
            const a = (origen.canales === 4 ? c[3] : 255) / 255;
            if (a <= 0) continue;
            const i = (y * ancho + x) * 3;
            for (let k = 0; k < 3; k++) {
                rgb[i + k] = Math.round(c[k] * a + rgb[i + k] * (1 - a));
            }
        }
    }
    return rgb;
}

// --- Y a generar -------------------------------------------------------------

mkdirSync(DESTINO, { recursive: true });
const icono = leerPng(ORIGEN);
console.log(`Origen: ${ORIGEN.split(/[\\/]/).pop()} ${icono.ancho}x${icono.alto}, ${icono.canales} canales`);

// 1. Icono de la ficha: 512x512, el icono llenando el cuadro sobre su verde.
escribirPngRgb(join(DESTINO, 'icono-512.png'), 512, 512,
    componer(icono, 512, 512, VERDE, 1));
console.log('play/assets/icono-512.png          512x512  RGB sin alfa');

// 1b. Icono de iPhone: 1024x1024 opaco, el unico que pide Xcode (los tamaños
// pequeños los saca el sistema). Android recorta el icono adaptativo a sus 72 dp
// centrales de 108, asi que 108/72 = 1.5 deja el hexagono del mismo tamaño que
// se ve en el movil. iOS le redondea las esquinas el solo: no hay que hacerlo aqui.
const ICONO_IOS = join(RAIZ, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
if (existsSync(dirname(ICONO_IOS))) {
    escribirPngRgb(ICONO_IOS, 1024, 1024, componer(icono, 1024, 1024, VERDE, 108 / 72));
    console.log('ios/.../AppIcon-512@2x.png          1024x1024 RGB sin alfa');
}

// 2. Grafico de funciones: 1024x500, la banda de arriba de la ficha.
//
// Esta lleva texto, y el texto se dibuja donde se sabe dibujar texto: en HTML.
// `grafico-funciones.html` tiene el diseño y Chrome sin ventana lo convierte a PNG
// con la medida exacta. Chrome ya escribe RGB sin alfa, que es justo lo que pide
// Play, asi que no hay que tocar nada despues.
//
// Si no hay Chrome, no se para todo: el icono ya esta hecho y se avisa de lo que
// falta. Esto se ejecuta una vez cada muchos meses y es peor que reviente entero.
const HTML = join(RAIZ, 'herramientas/grafico-funciones.html');
const SALIDA_BANDA = join(DESTINO, 'grafico-funciones-1024x500.png');
const CHROMES = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = CHROMES.find((p) => existsSync(p));
if (!chrome) {
    console.warn('\nAVISO: no se ha encontrado Chrome ni Edge.');
    console.warn('El grafico de funciones no se ha regenerado. Abre a mano');
    console.warn('herramientas/grafico-funciones.html y guarda la captura a 1024x500.');
} else {
    execFileSync(chrome, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        `--screenshot=${SALIDA_BANDA}`, '--window-size=1024,500', HTML,
    ], { stdio: 'ignore' });
    const hecho = leerPng(SALIDA_BANDA);
    if (hecho.ancho !== 1024 || hecho.alto !== 500) {
        throw new Error(`La banda ha salido ${hecho.ancho}x${hecho.alto} y Play exige 1024x500.`);
    }
    if (hecho.canales !== 3) {
        // Chrome la da opaca, pero si algun dia cambiara, se aplana aqui en vez de
        // que la Consola de Play rechace la subida sin explicar por que.
        const plano = Buffer.alloc(1024 * 500 * 3);
        for (let i = 0; i < 1024 * 500; i++) {
            const a = hecho.pix[i * 4 + 3] / 255;
            for (let k = 0; k < 3; k++) {
                plano[i * 3 + k] = Math.round(hecho.pix[i * 4 + k] * a + VERDE[k] * (1 - a));
            }
        }
        escribirPngRgb(SALIDA_BANDA, 1024, 500, plano);
    }
    console.log('play/assets/grafico-funciones-1024x500.png  1024x500  RGB sin alfa');
}
