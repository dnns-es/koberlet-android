// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// QUE CARTERA SE ESTA USANDO, Y EL SELECTOR PARA CAMBIARLA.
//
// Hasta 0.24.0 cada pantalla que movia saldos cogia la PRIMERA cuenta del tipo
// que necesitaba: `cuentas.find((c) => c.tipo === 'kda')`. Con una cartera eso
// funciona; con tres, la app decide por ti con cual operas, y en un monedero eso
// no es un detalle de comodidad: es firmar con la cuenta equivocada.
//
// Aqui vive el unico selector, y la eleccion se guarda POR TIPO DE CUENTA:
//
//   - la de Kadena en `koberlet.cartera`, la misma que usa el Panel;
//   - la de Ethereum en `koberlet.cartera.evm`, aparte.
//
// Que sean dos y no una importa en el Puente, donde hacen falta las dos a la vez:
// si compartieran memoria, elegir la cuenta de Ethereum te cambiaria la de Kadena
// por detras. Y con carteras que solo tienen uno de los dos tipos -tres de KDA y
// tres de ETH, por ejemplo- una sola memoria no podria ni representar el caso.
//
// Es una preferencia de pantalla, no un dato de nadie: vive en el almacenamiento
// del aparato, nunca en la boveda.

import { t } from './idioma.js';
import { nombreCartera } from './nombres.js';
import { corta } from './direccion.js';

const CLAVES = { kda: 'koberlet.cartera', evm: 'koberlet.cartera.evm' };

function clave(tipo) { return CLAVES[tipo] || CLAVES.kda; }

export function carteraActiva(tipo = 'kda') {
    try { return localStorage.getItem(clave(tipo)); } catch (_) { return null; }
}

export function fijarCarteraActiva(id, tipo = 'kda') {
    try { localStorage.setItem(clave(tipo), id); } catch (_) { /* navegación privada */ }
}

/** Las cuentas planas agrupadas por cartera, en el orden en que vinieron. */
export function agrupaCarteras(cuentas) {
    const porCartera = new Map();
    (cuentas || []).forEach((cu) => {
        const id = cu.carteraId || 'c1';
        if (!porCartera.has(id)) porCartera.set(id, { id, nombre: nombreCartera(cu.cartera), cuentas: [] });
        porCartera.get(id).cuentas.push(cu);
    });
    return porCartera;
}

/** Las carteras que tienen cuenta del tipo pedido. */
function conTipo(cuentas, tipo) {
    return [...agrupaCarteras(cuentas).values()]
        .map((g) => ({ id: g.id, nombre: g.nombre, cuenta: g.cuentas.find((c) => c.tipo === tipo) }))
        .filter((g) => g.cuenta);
}

/** La cuenta de ese tipo en la cartera elegida; si ya no existe, la primera. */
export function cuentaElegida(cuentas, tipo = 'kda') {
    const lista = conTipo(cuentas, tipo);
    if (!lista.length) return null;
    const guardada = carteraActiva(tipo);
    return (lista.find((g) => g.id === guardada) || lista[0]).cuenta;
}

/**
 * El selector. Devuelve { caja, cuenta }: `cuenta` es la elegida ahora mismo, y
 * `alElegir` se llama con la nueva cada vez que cambia.
 *
 * Con una sola cartera no se pinta un desplegable de un elemento -seria un adorno
 * que no elige nada-: se dice de quien es la cuenta y a operar.
 */
export function selectorCartera(cuentas, tipo, etiqueta, alElegir) {
    const todo = document.createElement('div');
    const lista = conTipo(cuentas, tipo);
    if (!lista.length) return { caja: todo, cuenta: null };

    const guardada = carteraActiva(tipo);
    let grupo = lista.find((g) => g.id === guardada) || lista[0];

    const barra = document.createElement('div');
    barra.className = 'elige-cartera';
    const et = document.createElement('span');
    et.className = 'elige-que';
    et.textContent = etiqueta;
    barra.append(et);

    // La dirección debajo SOLO cuando no hay desplegable. Con varias carteras el
    // propio desplegable ya enseña el nombre y el trozo de dirección que hace
    // falta para saber cuál es; repetirla entera debajo es una línea de ruido
    // encima de la pantalla donde se mueve el dinero.
    const dir = document.createElement('div');
    dir.className = 'dir';
    dir.textContent = grupo.cuenta.cuenta;

    if (lista.length === 1) {
        // Con una sola cartera no hay desplegable, así que el nombre lleva al lado
        // el trozo de dirección: el mismo dato que daría el desplegable, ni más ni
        // menos. La entera está en Carteras, que es donde se va a comprobarla.
        const solo = document.createElement('span');
        solo.className = 'elige-sola';
        solo.textContent = grupo.nombre + ' · ' + corta(grupo.cuenta.cuenta);
        barra.append(solo);
        dir.hidden = true;
    } else {
        const sel = document.createElement('select');
        sel.className = 'pastilla';
        sel.setAttribute('aria-label', etiqueta);
        lista.forEach((g) => {
            const o = document.createElement('option');
            o.value = g.id;
            o.textContent = g.nombre + ' · ' + corta(g.cuenta.cuenta);
            sel.append(o);
        });
        sel.value = grupo.id;
        sel.addEventListener('change', () => {
            grupo = lista.find((g) => g.id === sel.value) || lista[0];
            fijarCarteraActiva(grupo.id, tipo);
            dir.textContent = grupo.cuenta.cuenta;
            if (alElegir) alElegir(grupo.cuenta);
        });
        barra.append(sel);
        dir.hidden = true;
    }

    todo.append(barra, dir);
    return { caja: todo, cuenta: grupo.cuenta };
}

/**
 * Selector de RED al crear o importar una cartera.
 *
 * Desde la 0.26.0 una cartera es de UNA red. La misma semilla sirve para las dos
 * -son dos caminos BIP-44 distintos-, asi que quien quiera las dos crea dos
 * carteras con las mismas palabras; la app no lo impide y lo dice aqui mismo.
 */
export function selectorRed(id, elegida = 'kda') {
    const c = document.createElement('div');
    c.className = 'campo';
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = t('Red de esta cartera');
    const sel = document.createElement('select');
    sel.id = id;
    [['kda', t('Kadena (KDA)')], ['evm', t('Ethereum (ETH)')]].forEach(([v, txt]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = txt;
        if (v === elegida) o.selected = true;
        sel.append(o);
    });
    c.append(l, sel);
    return { caja: c, valor: () => sel.value };
}

/**
 * Selector de DESTINO: a cual de tus carteras va, o a una direccion de fuera.
 *
 * Es el patron del escritorio, y esta bien traido: lo normal es mandarse el dinero
 * a otra cartera propia -que es justo el caso del Puente-, y eso no se deberia
 * teclear nunca. Teclear queda para el caso raro, y entonces se avisa.
 *
 * Devuelve { caja, valor(), esPropia() }: `valor()` da la direccion elegida en ese
 * momento, ya sea la de una cartera o la escrita a mano.
 */
export function selectorDestino(cuentas, tipo, etiqueta, hueco, alCambiar) {
    const lista = conTipo(cuentas, tipo);
    const todo = document.createElement('div');

    const barra = document.createElement('div');
    barra.className = 'elige-cartera';
    const et = document.createElement('span');
    et.className = 'elige-que';
    et.textContent = etiqueta;

    const sel = document.createElement('select');
    sel.className = 'pastilla';
    sel.setAttribute('aria-label', etiqueta);
    lista.forEach((g) => {
        const o = document.createElement('option');
        o.value = g.cuenta.cuenta;
        o.textContent = g.nombre + ' · ' + corta(g.cuenta.cuenta);
        sel.append(o);
    });
    const otra = document.createElement('option');
    otra.value = 'otra';
    otra.textContent = t('Otra dirección');
    sel.append(otra);
    barra.append(et, sel);

    const campo = document.createElement('input');
    campo.spellcheck = false;
    campo.autocapitalize = 'off';
    campo.placeholder = hueco || '';
    campo.hidden = true;

    // Sin la dirección entera debajo: el desplegable ya la lleva acortada, y
    // cuando se escribe a mano está en el propio campo. Repetirla era una línea
    // de ruido en la pantalla más delicada de la app.
    sel.addEventListener('change', () => {
        campo.hidden = sel.value !== 'otra';
        if (alCambiar) alCambiar();
    });
    campo.addEventListener('input', () => { if (alCambiar) alCambiar(); });

    todo.append(barra, campo);
    if (!lista.length) { sel.value = 'otra'; campo.hidden = false; }

    return {
        caja: todo,
        valor: () => (sel.value === 'otra' ? campo.value.trim() : sel.value),
        esPropia: () => sel.value !== 'otra',
    };
}
