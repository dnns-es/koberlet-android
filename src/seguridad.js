// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SEGURIDAD.
//
// Dos cosas, y en este orden:
//
//   1. COMO ESTA PROTEGIDA la cartera ahora mismo -cifrado, huella, cerrojo,
//      copia-, con lo que falta a la vista y el boton para arreglarlo.
//   2. TUS CLAVES: la semilla y las claves privadas, una tarjeta por cartera.
//
// Antes esto era un desplegable unico que mezclaba las semillas y las claves de
// todas las carteras en la misma lista. Funcionaba, pero para elegir habia que
// leerse seis lineas casi iguales, y en la unica pantalla donde un despiste se
// paga con el dinero. Ahora cada cartera tiene su tarjeta y sus botones.
//
// La pantalla que ENSEÑA el secreto sigue siendo una sola, `revelar.js`: es la
// unica puerta por la que sale algo de la boveda, y desde aqui solo se le dice
// que tiene que enseñar.

import { pintarRevelar, opcionesDe, tieneSemilla } from './revelar.js';
import { nombreCartera } from './nombres.js';
import { boveda } from './boveda/contrato.js';
import { esNativo } from './red.js';
import { corta } from './direccion.js';
import { minutosCerrojo } from './salir.js';
import { ir } from './navegacion.js';
import { t } from './idioma.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function caja() { return elemento('div', null, 'caja'); }

function fila(izquierda, derecha, clase) {
    const f = elemento('div', null, 'fila');
    f.append(elemento('span', izquierda, 'izq'), elemento('span', derecha, 'der' + (clase ? ' ' + clase : '')));
    return f;
}

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', alPulsar);
    return b;
}

// Verde cuando eso esta puesto, gris cuando falta. Va en una funcion y no suelto
// en cada linea porque el color de un estado tiene que decidirse en un solo sitio.
//
// La clase gris se llamo 'ojo' y eso reventaba la pantalla: 'ojo' es tambien el
// ojito de las contrasenas, que va `position:absolute`, asi que el valor de la
// fila se iba volando a la esquina de arriba a la derecha. Ahora es 'flojo'.
const marca = (bien) => (bien ? 'bueno' : 'flojo');

/** Las carteras, agrupadas: una tarjeta por cartera, no una lista de secretos. */
function agrupar(cuentas) {
    const porCartera = new Map();
    cuentas.forEach((cu) => {
        const id = cu.carteraId || 'c1';
        if (!porCartera.has(id)) porCartera.set(id, { id, nombre: nombreCartera(cu.cartera), cuentas: [] });
        porCartera.get(id).cuentas.push(cu);
    });
    return [...porCartera.values()];
}

export function pintarSeguridad(raiz, ctx) {
    raiz.innerHTML = '';
    const grupos = agrupar(ctx.cuentas);

    raiz.append(bloqueEstado(raiz, ctx));
    raiz.append(bloqueClaves(raiz, ctx, grupos));
    raiz.append(boton(t('Volver'), () => ctx.alVolver(), 'secundario'));
}

/**
 * Como esta protegida la cartera AHORA MISMO.
 *
 * Solo se dice lo que se sabe de verdad: el cifrado que usa esta boveda, si la
 * huella esta puesta y cada cuanto se cierra sola. De la copia de seguridad no se
 * afirma nada -la app no sabe si la guardaste ni donde-, se ofrece y punto:
 * poner un ✓ verde en algo que no nos consta seria peor que no decir nada.
 */
function bloqueEstado(raiz, ctx) {
    const c = caja();
    c.append(elemento('h2', t('Cómo está protegida')));

    const nativo = esNativo();
    const comoCifra = nativo ? t('AES-256 en este aparato') : t('AES-256 en el navegador');
    c.append(fila(t('Cifrado'), comoCifra, marca(nativo)));

    const laHuella = fila(t('Huella o cara'), t('Consultando…'));
    c.append(laHuella);

    const min = minutosCerrojo();
    let cuando;
    if (min === 0) cuando = t('Nunca');
    else if (min === 1) cuando = t('1 minuto');
    else cuando = t('{0} minutos', min);
    c.append(fila(t('Se cierra sola'), cuando, marca(min !== 0)));

    c.append(elemento('p', t('La contraseña no se guarda en ningún sitio: sin ella no hay forma de abrir la bóveda, tampoco para nosotros.'), 'nota'));

    const acciones = elemento('div', null, 'botonera');
    acciones.append(boton(t('Ajustes'), () => ir('ajustes'), 'secundario'));
    acciones.append(boton(t('Copia de seguridad'), () => ir('copias'), 'secundario'));
    c.append(acciones);

    boveda.bioEstado().then((b) => {
        const der = laHuella.querySelector('.der');
        if (b && b.activada) {
            der.textContent = t('Activada');
            der.className = 'der ' + marca(true);
        } else if (b && b.disponible) {
            der.textContent = t('Sin activar');
            der.className = 'der ' + marca(false);
        } else {
            der.textContent = t('No disponible');
            der.className = 'der';
        }
    }).catch(() => {
        laHuella.querySelector('.der').textContent = t('No se pudo consultar');
    });

    return c;
}

/**
 * Las claves, una tarjeta por cartera.
 *
 * El aviso va aqui y no arriba del todo a proposito: es de esto de lo que avisa,
 * y pegado a los botones se lee; suelto en la cabecera se convierte en parte del
 * decorado a los dos dias.
 */
function bloqueClaves(raiz, ctx, grupos) {
    const c = caja();
    c.append(elemento('h2', t('Tus claves')));

    const aviso = elemento('div', null, 'caja avisa');
    aviso.textContent = t('Lo que salga aquí da control TOTAL sobre el dinero de esa cartera. Que no haya nadie mirando, y no lo escribas en ningún chat, correo ni foto.');
    c.append(aviso);

    if (!grupos.length) {
        c.append(elemento('p', t('Todavía no hay ninguna cartera en este aparato.'), 'nota'));
        return c;
    }

    grupos.forEach((g, i) => {
        const tarjeta = elemento('div');
        if (i) {
            tarjeta.style.borderTop = '1px solid var(--linea)';
            tarjeta.style.paddingTop = '12px';
        }
        tarjeta.style.marginTop = i ? '12px' : '4px';
        tarjeta.append(elemento('div', g.nombre, 'nombre-wallet'));
        g.cuentas.forEach((cu) => tarjeta.append(elemento('div', corta(cu.cuenta), 'dir')));

        // Las etiquetas de los botones salen de `opcionesDe`, que es lo que
        // entiende `revelar.js`. Aqui se acortan: el nombre de la cartera ya
        // está escrito justo encima y repetirlo en cada botón sobra.
        const opciones = opcionesDe(g);
        const acciones = elemento('div', null, 'botonera');
        opciones.forEach((op) => {
            const esSemilla = String(op[0]).startsWith('semilla:');
            const cuenta = esSemilla ? null : g.cuentas.find((cu) => cu.id === op[0]);
            const etiqueta = esSemilla
                ? t('Ver la semilla')
                : t('Clave privada · {0}', cuenta && cuenta.tipo === 'evm' ? 'Ethereum' : 'Kadena');
            acciones.append(boton(etiqueta, () => {
                pintarRevelar(raiz, { opciones: [op], alVolver: () => pintarSeguridad(raiz, ctx) });
                window.scrollTo(0, 0);
            }, 'secundario'));
        });
        tarjeta.append(acciones);

        if (!tieneSemilla(g)) {
            tarjeta.append(elemento('p', t('Esta cartera se metió por su clave privada: no tiene palabras que enseñar.'), 'nota'));
        }
        c.append(tarjeta);
    });

    return c;
}
