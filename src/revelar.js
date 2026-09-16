// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// REVELAR UN SECRETO: la semilla o una clave privada.
//
// Es la unica puerta por la que sale un secreto de la boveda, asi que hay UNA
// sola y vive aqui. La usan dos pantallas -Seguridad, con todas las carteras, y
// el detalle de una cartera, con la suya- y las dos pasan por estas mismas
// reglas:
//
//   - Siempre pide la contrasena, aunque la cartera este abierta. Tener el movil
//     desbloqueado en la mano no puede bastar para llevarse las claves.
//   - Sale en pantalla y punto: en el movil NO hay boton de copiar. El
//     portapapeles de Android lo puede leer cualquier otra app instalada, y una
//     semilla ahi dentro es una semilla regalada. En el navegador si, porque la
//     boveda de ahi ya es un doble de desarrollo.
//   - Se tapa con un boton, y la contrasena se borra del campo en cuanto sirve.

import { boveda } from './boveda/contrato.js';
import { esNativo } from './red.js';
import { t } from './idioma.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function botonCopiarSecreto(valor) {
    if (esNativo()) return null;
    const b = document.createElement('button');
    b.className = 'secundario';
    b.textContent = t('Copiar');
    b.addEventListener('click', async () => {
        let bien = false;
        try {
            await navigator.clipboard.writeText(valor);
            bien = true;
        } catch (_) {
            const campo = document.createElement('textarea');
            campo.value = valor;
            campo.style.position = 'fixed';
            campo.style.opacity = '0';
            document.body.append(campo);
            campo.select();
            try { bien = document.execCommand('copy'); } catch (_) { bien = false; }
            campo.remove();
        }
        b.textContent = bien ? t('✓ Copiada al portapapeles') : t('No se pudo copiar: selecciónala a mano');
        setTimeout(() => { b.textContent = t('Copiar'); }, 3000);
    });
    return b;
}

/**
 * Las opciones que se pueden pedir de una cartera: su semilla y la clave privada
 * de su cuenta. Se arma aqui para que Seguridad y el detalle de la cartera digan
 * exactamente lo mismo.
 *
 * @param grupo { id, nombre, cuentas:[{id, etiqueta}] }
 */
export function opcionesDe(grupo) {
    const o = [];
    // Una cartera metida por su clave privada no tiene palabras que enseñar, y
    // ofrecerlas para que luego falle sería peor que no ofrecerlas.
    if (tieneSemilla(grupo)) o.push(['semilla:' + grupo.id, t('Semilla de «{0}» (12 o 24 palabras)', grupo.nombre)]);
    grupo.cuentas.forEach((cu) => o.push([cu.id, `${t('Clave privada')} · ${grupo.nombre} ${cu.etiqueta}`.trim()]));
    return o;
}

/** Las bóvedas viejas no mandaban la marca; si no viene, se supone que sí. */
export function tieneSemilla(grupo) {
    return grupo.cuentas.every((cu) => cu.conSemilla !== false);
}

/**
 * La pantalla. `opciones` es [[valor, etiqueta], …] con lo que se puede pedir:
 * una cartera sola (desde su detalle) o todas (desde Seguridad).
 */
export function pintarRevelar(raiz, ctx) {
    raiz.innerHTML = '';

    const aviso = elemento('div', null, 'caja avisa');
    aviso.textContent = t('Lo que salga aquí da control TOTAL sobre el dinero de esta cartera. Que no haya nadie mirando, y no lo escribas en ningún chat, correo ni foto.');
    raiz.append(aviso);

    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Ver la semilla o una clave privada')));

    // Con una sola cosa que enseñar -se entra desde la cartera pidiendo la semilla
    // o la clave- no se pone un desplegable de un elemento: se dice qué va a salir
    // y ya está. El desplegable es para Seguridad, donde están todas.
    const cQue = elemento('div', null, 'campo');
    const sel = document.createElement('select');
    sel.id = 'que';
    ctx.opciones.forEach(([valor, etiqueta]) => {
        const o = document.createElement('option');
        o.value = valor;
        o.textContent = etiqueta;
        sel.append(o);
    });
    if (ctx.opciones.length === 1) {
        sel.hidden = true;
        cQue.append(elemento('div', ctx.opciones[0][1], 'nombre-wallet'), sel);
    } else {
        const lQue = document.createElement('label');
        lQue.setAttribute('for', 'que');
        lQue.textContent = t('Qué quieres ver');
        cQue.append(lQue, sel);
    }

    const cp = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', 'clave');
    l.textContent = t('Contraseña de la cartera');
    const fila = elemento('div', null, 'pwd');
    const i = document.createElement('input');
    i.type = 'password';
    i.id = 'clave';
    i.autocomplete = 'off';
    const ojo = document.createElement('button');
    ojo.type = 'button';
    ojo.className = 'ojo';
    ojo.textContent = '👁';
    ojo.addEventListener('click', () => {
        i.type = i.type === 'password' ? 'text' : 'password';
        ojo.textContent = i.type === 'password' ? '👁' : '🙈';
    });
    fila.append(i, ojo);
    cp.append(l, fila);

    const salida = elemento('div');

    const ver = document.createElement('button');
    ver.textContent = t('Mostrar');
    ver.addEventListener('click', async () => {
        salida.innerHTML = '';
        ver.disabled = true;
        ver.textContent = t('Descifrando…');
        try {
            const { privada } = await boveda.exportar(i.value, sel.value);
            const esSemilla = sel.value.startsWith('semilla:');
            salida.append(elemento('h3', t(esSemilla ? 'Tu semilla' : 'Clave privada')));

            if (esSemilla) {
                // Numeradas: al apuntarlas en papel, el orden es tan importante
                // como las palabras, y de memoria se baila una sin darse cuenta.
                const lista = document.createElement('ol');
                lista.className = 'semilla';
                privada.split(' ').forEach((p) => lista.append(elemento('li', p)));
                salida.append(lista);
            } else {
                salida.append(elemento('div', privada, 'dir'));
            }
            salida.append(elemento('p',
                t(esNativo() && esSemilla
                    ? 'Apúntala en papel. En el móvil no se copia al portapapeles a propósito: otras apps pueden leerlo.'
                    : 'Apúntala en papel. Aquí puedes copiarla para llevártela al móvil, pero no la dejes en ningún fichero ni chat.'),
                'nota'));

            const copiar = botonCopiarSecreto(privada);
            if (copiar) salida.append(copiar);

            const tapar = document.createElement('button');
            tapar.className = 'secundario';
            tapar.textContent = t('Ocultar');
            tapar.addEventListener('click', () => { salida.innerHTML = ''; });
            salida.append(tapar);
            i.value = '';
        } catch (e) {
            salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        } finally {
            ver.disabled = false;
            ver.textContent = t('Mostrar');
        }
    });

    const atras = document.createElement('button');
    atras.className = 'secundario';
    atras.textContent = t('Volver');
    atras.addEventListener('click', () => ctx.alVolver());

    c.append(cQue, cp, ver, salida, atras);
    raiz.append(c);
}
