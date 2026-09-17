// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// COMO SE LLAMA AQUI LO DE IDENTIFICARSE SIN TECLEAR LA CONTRASENA.
//
// En un iPhone o un iPad no hay lector de huella: lo que hay es Face ID, o Touch
// ID en los que lo llevan. Decir "huella" en esas pantallas es describir algo que
// el aparato no tiene, y lo aviso un probador el 17/09/2026 desde un iPad.
//
// El nombre NO se adivina por la plataforma: lo dice el sistema (`LAContext` en
// iOS, lo que el aparato declare tener en Android) y llega en `bioEstado().tipo`.
// Si no lo dice -o la version instalada del plugin es de antes que esto-, se usa
// la palabra que vale para los dos, que es lo que habia hasta ahora.
//
// Face ID y Touch ID NO se traducen: son nombres propios, y Apple los llama igual
// en todos los idiomas.

import { t } from './idioma.js';

/**
 * Para meterlo detras de una preposicion: «Firmar con {0}», «Abrir con {0}».
 * @param estado lo que devuelve boveda.bioEstado()
 */
export function nombreBio(estado) {
    const tipo = (estado && estado.tipo) || '';
    if (tipo === 'faceid') return 'Face ID';
    if (tipo === 'touchid') return 'Touch ID';
    if (tipo === 'huella') return t('huella');
    if (tipo === 'cara') return t('la cara');
    return t('la huella o la cara');
}

/**
 * Lo mismo, pero para cuando la frase pide articulo: «Activar {0}», «se te pide
 * {0}». Con Face ID no cambia -es un nombre propio- y con la huella si.
 */
export function bioConArticulo(estado) {
    const tipo = (estado && estado.tipo) || '';
    if (tipo === 'faceid') return 'Face ID';
    if (tipo === 'touchid') return 'Touch ID';
    if (tipo === 'cara') return t('la cara');
    if (tipo === 'huella') return t('la huella');
    return t('la huella o la cara');
}

/** Para un titulo suelto, donde no hay frase que arrastre: «Face ID», «Huella o cara». */
export function tituloBio(estado) {
    const tipo = (estado && estado.tipo) || '';
    if (tipo === 'faceid') return 'Face ID';
    if (tipo === 'touchid') return 'Touch ID';
    return t('Huella o cara');
}
