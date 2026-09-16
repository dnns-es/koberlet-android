// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// NAVEGACION POR SECCIONES.
//
// El Koberlet de escritorio tiene un menu lateral con doce secciones (Panel,
// Wallets, NFT, Red, Mercado, Launch, DCA, Ordenes, Puente, Seguridad, Ajustes,
// Info). En un movil ese menu no cabe de lado, asi que va abajo, que ademas es
// donde llega el pulgar.
//
// De momento hay cuatro secciones con contenido; las demas se iran añadiendo y
// el sitio ya esta hecho. Lo que NO se hace es enseñar una pestaña vacia de algo
// que todavia no funciona: una app llena de botones que no hacen nada es peor
// que una app pequeña.

// Los nombres se declaran en español y se traducen AL PINTAR, nunca aquí: si se
// tradujeran al declararlos, cambiar de idioma no cambiaría la barra.
import { t } from './idioma.js';

// El catalogo de secciones. `barra:true` = va abajo siempre; el resto vive
// detras del boton "Más". Añadir NFT, Mercado, Puente, DCA, Ordenes, Launch o
// Info es meter una linea aqui y su funcion de pintado: la navegacion no se
// queda corta segun crezca la app, que es lo que pasa cuando se clavan cuatro
// botones fijos y no caben mas.
// El orden de la barra es el orden de esta lista. Eran cinco fijas (Panel,
// Mercado, Puente, DCA, Carteras); desde la 0.45.5 son tres, porque Mercado y
// Puente se han subido a los circulos del Panel, al lado de Enviar y Recibir:
// cambiar o puentear es lo que uno hace con su dinero, no un sitio al que ir.
//
// Siguen en la lista -sin `barra`- y por tanto detras de "Más": los circulos solo
// existen en la tarjeta del Panel, y la de una cartera EVM no pinta Mercado. Sin
// esa segunda puerta, desde una cartera de Ethereum el Mercado no tendria camino.
//
// ADELGAZADO el 14/09/2026, a peticion de Antonio al verlo en el movil: "Más"
// tenia OCHO botones y eso ya no es un menu, es una lista. Quien abre "Más" no
// esta buscando entre ocho cosas, esta buscando una.
//
//   - NFT sale de la lista. La seccion existe y funciona, pero es de solo lectura
//     y no hay ninguna pieza que mirar: un boton para ver una lista vacia. El
//     codigo se queda; volver a enseñarla es devolver su linea aqui.
//   - Copias se va DENTRO de Seguridad y de Ajustes, que es donde ya estaba
//     enlazada y donde la busca la gente. Una copia de seguridad es seguridad.
//   - Red se va dentro de Ajustes, al lado de donde se añaden las redes a mano.
//     Se mira de higos a brevas y no merecia una puerta propia.
//
// Ninguna pantalla se ha tocado ni se ha perdido: lo que cambia es la puerta.
// `ir(id)` sigue valiendo para cualquier id, este o no en esta lista.
//
// Seguridad, Ajustes y las demas viven detras de "Más" a proposito: son de entrar
// de vez en cuando, y lo que esta a un toque en la pantalla del dinero tiene que
// ser lo que se usa a diario.
const SECCIONES = [
    { id: 'panel', nombre: 'Panel', barra: true, icono: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { id: 'dca', nombre: 'DCA', barra: true, icono: 'M12 8v8M8 12h8M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
    { id: 'carteras', nombre: 'Carteras', barra: true, icono: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 12h3' },
    { id: 'mercado', nombre: 'Mercado', icono: 'M4 19V9M10 19V5M16 19v-7M22 19H2' },
    { id: 'puente', nombre: 'Puente', icono: 'M3 16c0-5 4-8 9-8s9 3 9 8M3 16h18M7 16v-3M17 16v-3M12 16V9' },
    { id: 'seguridad', nombre: 'Seguridad', icono: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z' },
    { id: 'info', nombre: 'Info', icono: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5v.5' },
    { id: 'ajustes', nombre: 'Ajustes', icono: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.5L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h5l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z' },
];

const MAS = { id: '__mas', nombre: 'Más', icono: 'M4 6h16M4 12h16M4 18h16' };

// La seccion en la que estabas tambien aguanta el refresco: volver siempre al
// Panel despues de cada F5 obliga a rehacer el camino a mano. Es una preferencia
// de pantalla, no un dato de nadie, y muere al cerrar la pestaña o la app.
const RECUERDO = 'koberlet-seccion';

function recordada() {
    try {
        const id = sessionStorage.getItem(RECUERDO);
        return SECCIONES.some((s) => s.id === id) ? id : 'panel';
    } catch (_) {
        return 'panel';
    }
}

let actual = recordada();
let alCambiar = null;

function icono(d) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    svg.append(p);
    return svg;
}

/** Monta la barra de abajo. `alPulsar(id)` decide que se pinta. */
export function montarBarra(alPulsar) {
    alCambiar = alPulsar;
    let barra = document.getElementById('barra');
    if (barra) barra.remove();

    barra = document.createElement('nav');
    barra.id = 'barra';

    const fijas = SECCIONES.filter((s) => s.barra);
    const otras = SECCIONES.filter((s) => !s.barra);

    fijas.forEach((s) => barra.append(botonSeccion(s, () => ir(s.id))));
    if (otras.length) barra.append(botonSeccion(MAS, () => abrirMas(otras)));

    document.body.append(barra);
    document.body.classList.add('con-barra');
}

function botonSeccion(s, alPulsar) {
    const b = document.createElement('button');
    b.dataset.seccion = s.id;
    const enBarra = SECCIONES.some((x) => x.barra && x.id === actual);
    b.className = s.id === (enBarra ? actual : MAS.id) ? 'activa' : '';
    b.append(icono(s.icono));
    const etiqueta = document.createElement('span');
    etiqueta.textContent = t(s.nombre);
    b.append(etiqueta);
    b.addEventListener('click', alPulsar);
    return b;
}

/** Hoja con las secciones que no caben abajo. Se cierra tocando fuera. */
function abrirMas(otras) {
    const fondo = document.createElement('div');
    fondo.className = 'hoja-fondo';
    const hoja = document.createElement('div');
    hoja.className = 'hoja';

    otras.forEach((s) => {
        const b = document.createElement('button');
        b.className = 'secundario';
        b.textContent = t(s.nombre);
        b.addEventListener('click', () => { fondo.remove(); ir(s.id); });
        hoja.append(b);
    });

    const cerrar = document.createElement('button');
    cerrar.className = 'secundario';
    cerrar.textContent = t('Cerrar');
    cerrar.addEventListener('click', () => fondo.remove());
    hoja.append(cerrar);

    fondo.append(hoja);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) fondo.remove(); });
    document.body.append(fondo);
}

export function ir(id) {
    actual = id;
    try { sessionStorage.setItem(RECUERDO, id); } catch (_) { /* navegación privada */ }
    const barra = document.getElementById('barra');
    if (barra) {
        // Si la seccion vive detras de "Más", se marca "Más": estar en una pantalla
        // sin que ningun boton lo diga deja a uno sin saber donde esta.
        const enBarra = SECCIONES.some((s) => s.barra && s.id === id);
        const marcado = enBarra ? id : MAS.id;
        barra.querySelectorAll('button').forEach((b) => {
            b.className = b.dataset.seccion === marcado ? 'activa' : '';
        });
    }
    // Al cambiar de seccion se vuelve arriba: si no, entras en una pantalla nueva
    // ya desplazada por donde estabas en la anterior.
    window.scrollTo(0, 0);
    if (alCambiar) alCambiar(id);
}

export function seccionActual() { return actual; }

/** Quita la barra: en el primer uso y con la cartera bloqueada no pinta nada. */
export function quitarBarra() {
    const barra = document.getElementById('barra');
    if (barra) barra.remove();
    document.body.classList.remove('con-barra');
    // Al bloquear se vuelve al Panel: la proxima vez que se abra la cartera, lo
    // primero que hay que ver es el saldo, no la pantalla de borrar una cartera.
    actual = 'panel';
    try { sessionStorage.removeItem(RECUERDO); } catch (_) { /* navegación privada */ }
}
