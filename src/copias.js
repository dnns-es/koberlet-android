// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// COPIA DE SEGURIDAD DE LA CARTERA.
//
// Dos caminos para no perder el dinero si el movil se pierde, se rompe o se
// queda sin bateria para siempre:
//
//   - La SEMILLA en papel. Es la copia de verdad: no caduca, no depende de
//     ningun formato y vale en cualquier cartera Kadena.
//   - El FICHERO de la boveda. Es comodo -se restaura de una vez, con su
//     contrasena- pero solo sirve mientras exista un Koberlet que lo entienda.
//
// Por eso la pantalla dice las dos cosas y no vende el fichero como sustituto de
// las palabras.

import { boveda } from './boveda/contrato.js';
import { esNativo } from './red.js';
import { abriendoDialogoDelSistema } from './salir.js';
import { t } from './idioma.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function campoClave(etiqueta, id) {
    const c = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiqueta;
    const fila = elemento('div', null, 'pwd');
    const i = document.createElement('input');
    i.type = 'password';
    i.id = id;
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
    c.append(l, fila);
    return c;
}

/**
 * @param ctx { alVolver, alTerminar, soloRestaurar }
 *
 * `soloRestaurar` es para el primer uso, cuando todavia no hay ninguna cartera en
 * el aparato: alli guardar una copia no significa nada, y lo unico que hace falta
 * es el camino de vuelta.
 */
export function pintarCopias(raiz, ctx) {
    raiz.innerHTML = '';

    // --- Guardar una copia ---
    const cSalida = elemento('div', null, 'caja');
    cSalida.append(elemento('h2', t('Guardar una copia')));
    cSalida.append(elemento('p',
        t(esNativo()
            ? 'Saca el fichero cifrado de la cartera para guardarlo fuera del móvil. Sale tal cual está aquí: cifrado, y sin la contraseña no lo abre nadie.'
            : 'Descarga el fichero cifrado de esta cartera del navegador.'),
        'nota'));
    cSalida.append(campoClave(t('Contraseña de la cartera'), 'c-exp'));

    const exportar = document.createElement('button');
    exportar.textContent = t(esNativo() ? 'Guardar copia' : 'Descargar copia');
    const salida = elemento('div');
    exportar.addEventListener('click', async () => {
        salida.innerHTML = '';
        exportar.disabled = true;
        try {
            // Compartir abre la hoja del sistema y manda la app al fondo: ese rato
            // no es abandono. Ver `abriendoDialogoDelSistema` en salir.js.
            abriendoDialogoDelSistema();
            await boveda.exportarBoveda(document.getElementById('c-exp').value);
            salida.append(elemento('p', t('Listo. Guárdala donde no la pierdas, pero recuerda: el fichero sin la contraseña no vale para nada, y la contraseña sin el fichero tampoco.'), 'nota'));
        } catch (e) {
            salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        } finally {
            exportar.disabled = false;
        }
    });
    cSalida.append(exportar, salida);

    // --- Restaurar ---
    const cEntrada = elemento('div', null, 'caja');
    cEntrada.append(elemento('h2', t('Restaurar una copia')));
    cEntrada.append(elemento('p', t('Elige el fichero y escribe la contraseña con la que se guardó. Si ya hay una cartera en este aparato, se aparta antes de tocarla; nunca se borra la única copia que tengas.'), 'nota'));

    const cf = elemento('div', null, 'campo');
    const lf = document.createElement('label');
    lf.setAttribute('for', 'fichero');
    lf.textContent = t('Fichero de la copia (vault.json)');
    const inputF = document.createElement('input');
    inputF.type = 'file';
    inputF.id = 'fichero';
    inputF.accept = 'application/json,.json';
    // Elegir el fichero saca al dueño de la app -al explorador, a Drive- y puede
    // tardar lo que tarde en encontrarlo. Ese viaje no cuenta como abandono: era
    // justo lo que cerraba la cartera a mitad de la restauración.
    inputF.addEventListener('click', () => abriendoDialogoDelSistema());
    cf.append(lf, inputF);

    cEntrada.append(cf, campoClave(t('Contraseña de esa copia'), 'c-imp'));

    const restaurar = document.createElement('button');
    restaurar.textContent = t('Restaurar');
    const salida2 = elemento('div');
    restaurar.addEventListener('click', async () => {
        salida2.innerHTML = '';
        const f = inputF.files && inputF.files[0];
        if (!f) return salida2.append(elemento('p', t('Elige primero el fichero.'), 'malo'));
        restaurar.disabled = true;
        restaurar.textContent = t('Descifrando…');
        try {
            const contenido = await f.text();
            const { cuentas } = await boveda.importarBoveda(document.getElementById('c-imp').value, contenido);
            ctx.alTerminar(cuentas);
        } catch (e) {
            salida2.append(elemento('p', t(String(e.message || e)), 'malo'));
        } finally {
            restaurar.disabled = false;
            restaurar.textContent = t('Restaurar');
        }
    });
    cEntrada.append(restaurar, salida2);

    // --- Recordatorio ---
    const nota = elemento('div', null, 'caja avisa');
    nota.textContent = t('La copia que de verdad importa son las 12 palabras en papel: valen en cualquier cartera Kadena y no dependen de este programa. El fichero es una comodidad, no un sustituto.');

    const atras = document.createElement('button');
    atras.className = 'secundario';
    atras.textContent = t('Volver');
    atras.addEventListener('click', () => ctx.alVolver());

    if (ctx.soloRestaurar) raiz.append(cEntrada, nota, atras);
    else raiz.append(cSalida, cEntrada, nota, atras);
}
