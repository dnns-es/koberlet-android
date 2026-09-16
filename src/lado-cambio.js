// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// UN LADO DEL CAMBIADOR: que token es, cuanto tienes, la cantidad, MAX y la
// pastilla para elegir.
//
// Vivia dentro de la pantalla del mercado de Kadena. Se saca aqui porque el de
// Ethereum tiene que ser IGUAL: Antonio lo pidio asi -un token arriba, otro abajo,
// el de abajo se calcula solo- y dos copias del mismo trozo acaban siendo dos
// pantallas distintas sin que nadie lo decida.
//
// `lista` son objetos { modulo, simbolo }: en Kadena el modulo es el del contrato
// («coin»), en Ethereum es la clave del token («ETH»). Aqui da igual: es el valor
// que devuelve el desplegable.

import { t } from './idioma.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

export function lado(id, etiqueta, lista, elegido, editable) {
    const c = elemento('div', null, 'lado');

    const cab = elemento('div', null, 'lado-cab');
    const saldo = elemento('span', '', 'lado-saldo');
    cab.append(elemento('span', etiqueta, 'lado-que'), saldo);

    const linea = elemento('div', null, 'lado-linea');
    const entrada = document.createElement('input');
    entrada.id = id;
    entrada.className = 'cantidad';
    entrada.type = editable ? 'number' : 'text';
    entrada.step = 'any';
    entrada.inputMode = 'decimal';
    entrada.placeholder = '0';
    if (!editable) entrada.readOnly = true;

    const maximo = document.createElement('button');
    maximo.type = 'button';
    maximo.className = 'max';
    maximo.textContent = t('MÁX');
    if (!editable) maximo.style.visibility = 'hidden';

    const select = document.createElement('select');
    select.className = 'pastilla';
    select.setAttribute('aria-label', etiqueta);
    lista.forEach((x) => {
        const o = document.createElement('option');
        o.value = x.modulo;
        o.textContent = x.simbolo;
        select.append(o);
    });
    select.value = elegido;

    linea.append(entrada, maximo, select);
    c.append(cab, linea);
    return { caja: c, entrada, select, saldo, maximo, disponible: null };
}
