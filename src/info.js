// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SECCION INFO.
//
// Que es esto, quien lo hace, de que version se trata y - lo que casi ninguna app
// pone - que NO hace todavia. Decirlo por escrito evita que alguien guarde aqui
// algo esperando una funcion que aun no existe.

import { esNativo } from './red.js';
import { t } from './idioma.js';
import { comprobar, avisarSiHay } from './actualizar.js';
import { bloquePoliticas } from './politicas.js';
import { CANAL, HAY_ACTUALIZACION_PROPIA } from './canal.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function fila(izquierda, derecha) {
    const f = elemento('div', null, 'fila');
    f.append(elemento('span', izquierda, 'izq'), elemento('span', derecha, 'der'));
    return f;
}

function caja() { return elemento('div', null, 'caja'); }

// Lo que el escritorio tiene y el movil todavia no. Se enseña la lista entera a
// proposito: es mas honesto que una pestaña que se abre y esta vacia.
const POR_LLEGAR = [
    ['NFT', 'La sección está hecha y ve las piezas, pero se ha quitado del menú de momento: mover una pieza todavía no se puede, y una pantalla que solo mira ocupaba un botón sin dar nada.'],
    ['Cambiar en Mercado', 'El cálculo y la simulación ya están; falta firmar el cambio desde el móvil.'],
    ['Launch', 'Comprar en las preventas de Smart Pacts.'],
    ['Órdenes', 'Órdenes de compra y venta a un precio puesto por ti.'],
    ['Enviar desde Ethereum', 'Por el puente se puede mandar de Kadena a Ethereum. Al revés no: eso es firmar una transacción de Ethereum, que es otra criptografía y todavía no está.'],
    ['Enviar desde una cartera de Ethereum', 'Por lo mismo: una cartera EVM aquí solo mira.'],
];

const CONVIENE_SABER = [
    'Apunta la semilla en papel. Es lo único que recupera la cartera si pierdes el móvil, y nadie más la tiene.',
    'La contraseña se pide en cada envío, aunque la cartera esté abierta.',
    'En el móvil la semilla no se copia al portapapeles a propósito: otras apps pueden leerlo.',
    'Una transferencia en la cadena no se puede deshacer ni reclamar a nadie.',
];

export function pintarInfo(raiz, ctx) {
    raiz.innerHTML = '';

    const c = caja();
    c.append(elemento('h2', 'Koberlet'));
    c.append(elemento('p',
        t('Un monedero de Kadena para el móvil. Las claves se crean en este aparato y se quedan aquí, cifradas con tu contraseña: no hay servidor nuestro que las tenga ni que pueda devolvértelas si las pierdes.'),
        'nota'));
    c.append(fila(t('Versión'), ctx.version));
    c.append(fila(t('Dónde corre'), t(esNativo() ? 'APK de Android' : 'Navegador')));
    c.append(fila(t('Bóveda'), t(ctx.motor === 'nativa' ? 'nativa (Android)' : 'simulada (pruebas)')));
    c.append(fila(t('Red'), ctx.red.nombre));

    // Las actualizaciones van aqui, junto a la version, igual que en el escritorio:
    // es donde uno mira cuando se pregunta "¿tengo la ultima?".
    const estado = elemento('div');
    if (!HAY_ACTUALIZACION_PROPIA) {
        // Compilacion de tienda (Google Play o iPhone): actualiza sola y en segundo
        // plano. Poner aqui un boton que no hace nada seria peor que no ponerlo.
        c.append(elemento('p', t(CANAL === 'ios'
            ? 'Esta versión se actualiza sola desde TestFlight o la App Store.'
            : 'Esta versión se actualiza sola desde Google Play.'), 'nota'));
    } else if (esNativo()) {
        const b = document.createElement('button');
        b.className = 'secundario';
        b.textContent = t('Comprobar si hay versión nueva');
        b.addEventListener('click', async () => {
            estado.innerHTML = '';
            b.disabled = true;
            estado.append(elemento('p', t('Comprobando…'), 'nota'));
            const info = await comprobar();
            estado.innerHTML = '';
            b.disabled = false;
            if (!info) {
                estado.append(elemento('p', t('No se pudo comprobar: sin conexión con el servidor de descargas.'), 'malo'));
            } else if (!info.hay) {
                estado.append(elemento('p', t('Estás al día: versión {0}.', info.instalada), 'nota'));
            } else {
                await avisarSiHay(estado);
            }
        });
        c.append(b, estado);
        c.append(elemento('p', t('La app lo mira sola cada vez que se abre; aquí puedes forzarlo.'), 'nota'));
    } else {
        c.append(elemento('p', t('En el navegador no hay nada que instalar: basta con recargar la página.'), 'nota'));
    }
    raiz.append(c);

    if (!esNativo()) {
        const a = elemento('div', null, 'caja avisa');
        a.append(elemento('p',
            t('Esto es la maqueta del navegador. Aquí la bóveda es un doble de desarrollo que guarda en el propio navegador: sirve para ver cómo queda la app, no para guardar dinero.'),
            null));
        raiz.append(a);
    }

    const cFalta = caja();
    cFalta.append(elemento('h2', t('Lo que todavía no está')));
    cFalta.append(elemento('p', t('El Koberlet de escritorio hace además esto. Se irá portando al móvil, y cada parte aparecerá cuando funcione de verdad, no antes.'), 'nota'));
    POR_LLEGAR.forEach(([que, para]) => {
        const titulo = elemento('h3', t(que));
        titulo.style.margin = '12px 0 2px';
        cFalta.append(titulo, elemento('p', t(para), 'nota'));
    });
    raiz.append(cFalta);

    const cSeg = caja();
    cSeg.append(elemento('h2', t('Lo que conviene saber')));
    CONVIENE_SABER.forEach((frase) => cSeg.append(elemento('p', '· ' + t(frase), 'nota')));
    raiz.append(cSeg);

    // Datos técnicos, plegados. Sirven para que alguien pueda decirnos qué le
    // pasa sin tener que adivinarlo, y para que el diagnóstico no ocupe la
    // portada del monedero.
    const cTec = caja();
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Datos técnicos');
    det.append(sum);
    const diag = document.getElementById('diag');
    const contenido = diag ? diag.textContent : '';
    const texto = elemento('div', contenido, 'diag');
    texto.style.marginTop = '8px';
    det.append(texto);

    // Copiar sí, porque aquí no hay ningún secreto: versión, camino de red, nodo
    // y modelo de aparato. Es justo lo que hace falta para que alguien pueda
    // contar qué le pasa sin teclear cuatro líneas a mano en un móvil.
    const copiar = document.createElement('button');
    copiar.className = 'secundario';
    copiar.textContent = t('Copiar los datos técnicos');
    copiar.addEventListener('click', async () => {
        let bien = false;
        try {
            await navigator.clipboard.writeText(contenido);
            bien = true;
        } catch (_) { bien = false; }
        copiar.textContent = bien ? t('✓ Copiados') : t('No se pudo copiar: mantén pulsado el texto');
        setTimeout(() => { copiar.textContent = t('Copiar los datos técnicos'); }, 2500);
    });
    det.append(copiar);
    const enlace = document.createElement('a');
    enlace.href = 'fase0.html';
    enlace.textContent = t('Banco de pruebas (Fase 0)');
    enlace.style.fontSize = '12px';
    det.append(enlace);
    cTec.append(det);
    raiz.append(cTec);

    const cQuien = caja();
    cQuien.append(elemento('h3', t('Quién lo hace')));
    cQuien.append(elemento('p', t('DNNS.es — Antonio Morillo. Software libre, licencia Apache-2.0.'), 'nota'));
    cQuien.append(elemento('p', t('Koberlet no está asociado a Kadena Eco: es un monedero independiente para la red de la comunidad.'), 'nota'));
    raiz.append(cQuien);

    // Las políticas, plegadas y al final: se aceptan una vez y se releen de tarde en
    // tarde, pero tienen que estar SIEMPRE y sin conexión. Un enlace a una web no
    // valdría: lo que se acepta no puede depender de que un servidor siga en pie.
    raiz.append(bloquePoliticas());
}
