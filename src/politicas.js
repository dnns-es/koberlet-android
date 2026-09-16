// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LAS POLITICAS DE USO: lo que hay que aceptar para usar la app.
//
// Se enseñan la PRIMERA VEZ y cada vez que cambie su version, antes de nada: antes de
// la contraseña, antes de la cartera, antes de ver un solo saldo. Quien no las acepta
// no pasa de aqui, porque no hay una version recortada de un monedero.
//
// El texto NO se escribe aqui. Viene de `politicas-texto.js`, que se genera desde el
// POLITICAS.md del monedero de escritorio: es el MISMO texto en las dos apps, porque es
// lo mismo que se acepta. Si hubiera dos copias, una envejeceria sin que nadie lo viera.
//
// Lo aceptado se guarda en el aparato, no en la boveda: es una preferencia de pantalla
// -que version se leyo y cuando-, no un secreto, y tiene que poder mirarse sin que
// nadie ponga la contraseña.

import { t, idiomaActual } from './idioma.js';
import { POLITICAS, POLITICAS_VERSION } from './politicas-texto.js';

const CLAVE = 'koberlet.politicas';

/** Que version se acepto, o null. */
export function politicaAceptada() {
    try {
        const v = JSON.parse(localStorage.getItem(CLAVE) || 'null');
        return v && v.version ? v.version : null;
    } catch (_) { return null; }
}

export function hayQueAceptar() {
    return politicaAceptada() !== POLITICAS_VERSION;
}

/**
 * Se apunta QUE version y CUANDO. La fecha no es adorno: es lo unico que dice que
 * texto estaba vigente para esta persona el dia que acepto.
 */
function apuntarAceptada() {
    try {
        localStorage.setItem(CLAVE, JSON.stringify({
            version: POLITICAS_VERSION, fecha: new Date().toISOString(),
        }));
    } catch (_) { /* navegación privada: se volverá a preguntar, que es lo correcto */ }
}

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

/**
 * El texto, montado nodo a nodo. Nada de `innerHTML`: en esta app está prohibido y
 * aquí no hace falta, son párrafos y títulos.
 */
export function textoPoliticas() {
    const c = elemento('div', null, 'politicas');
    const bloques = POLITICAS[idiomaActual() === 'en' ? 'en' : 'es'] || POLITICAS.es;
    let lista = null;
    for (const b of bloques) {
        if (b.t === 'li') {
            if (!lista) { lista = document.createElement('ul'); c.append(lista); }
            lista.append(elemento('li', b.x));
            continue;
        }
        lista = null;
        c.append(elemento(b.t === 'h3' ? 'h2' : b.t === 'h4' ? 'h3' : 'p', b.x));
    }
    return c;
}

/**
 * La pantalla de aceptación. `alAceptar` se llama cuando se acepta; hasta entonces no
 * se pinta nada más de la app.
 */
export function pintarPoliticas(raiz, alAceptar) {
    raiz.innerHTML = '';

    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Antes de empezar, lee esto')));

    const caja = elemento('div', null, 'politicas-caja');
    caja.append(textoPoliticas());
    c.append(caja);

    // El visto y el botón: el botón no se activa hasta marcar. No es un trámite legal
    // de cara a la galería, es que el texto dice cosas que importan -que la semilla no
    // la recupera nadie, que lo firmado no se deshace- y merece un gesto.
    const l = document.createElement('label');
    l.className = 'pol-check';
    const ch = document.createElement('input');
    ch.type = 'checkbox';
    ch.id = 'pol-leido';
    l.append(ch, elemento('span', t('He leído las políticas y las acepto')));

    const b = document.createElement('button');
    b.textContent = t('Aceptar y continuar');
    b.disabled = true;
    ch.addEventListener('change', () => { b.disabled = !ch.checked; });
    b.addEventListener('click', () => { apuntarAceptada(); alAceptar(); });

    c.append(l, b);
    c.append(elemento('p', t('Se pueden volver a leer en Más, sin conexión.'), 'nota'));
    c.append(elemento('p', t('Versión de las políticas: {0}', POLITICAS_VERSION), 'nota'));

    raiz.append(c);
}

/** El apartado para releerlas cuando se quiera, dentro de Más. */
export function bloquePoliticas() {
    const c = elemento('div', null, 'caja');
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Políticas de uso');
    det.append(sum);

    const caja = elemento('div', null, 'politicas-caja');
    caja.append(textoPoliticas());
    det.append(caja);

    c.append(det);
    const v = politicaAceptada();
    c.append(elemento('p', v
        ? t('Aceptaste la versión {0}.', v)
        : t('Todavía no hay ninguna versión aceptada en este aparato.'), 'nota'));
    return c;
}
