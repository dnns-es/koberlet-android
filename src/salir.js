// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SALIR DE LA APP Y CERROJO POR INACTIVIDAD.
//
// En Android no hay un boton de "cerrar" como en el escritorio: se pulsa Inicio y
// la app se queda detras, viva. Eso, en un monedero, es el agujero de siempre:
// la cartera se queda ABIERTA en segundo plano, y quien coja el movil desbloqueado
// la encuentra tal cual se dejo.
//
// Aqui se arreglan las tres piezas que faltaban:
//
//   1. CERROJO POR INACTIVIDAD. Si no se toca la pantalla en X minutos, la cartera
//      se cierra sola. Cuenta igual con la app delante que detras: el tiempo en
//      segundo plano es tiempo sin tocar, y es justo cuando mas peligro hay.
//   2. EL BOTON DE ATRAS. En Android es el gesto de "salir", y sin atenderlo la
//      app se queda muerta: no hace nada estando en el Panel. Ahora vuelve al
//      Panel desde cualquier seccion, y en el Panel manda la app al fondo.
//   3. UN BOTON EXPLICITO de "bloquear y salir", que es lo que uno quiere cuando
//      termina: cerrar la cartera y perder la app de vista, en un solo gesto.
//
// El boton de atras y "salir" solo existen dentro del APK. El cerrojo funciona
// tambien en la maqueta, a proposito: asi se puede probar sin aparato.

import { esNativo } from './red.js';

const LLAVE = 'koberlet.cerrojo';

/**
 * Lo que se puede elegir, en minutos. El 0 es «nunca», y esta aqui porque hay a
 * quien le estorba de verdad -el que mira la app cada dos minutos en su propio
 * escritorio-, pero la pantalla dice lo que significa.
 */
export const TIEMPOS = [1, 5, 15, 30, 0];

/** Por defecto, 5 minutos: ni molesta leyendo una pantalla ni deja la cartera abierta media tarde. */
const POR_DEFECTO = 5;

export function minutosCerrojo() {
    try {
        // Ojo con el 0: es una opción válida («nunca») y a la vez lo que da
        // `Number(null)` cuando no hay nada guardado. Si se convirtiera antes de
        // mirar si existe, una instalación nueva nacería SIN cerrojo.
        const crudo = localStorage.getItem(LLAVE);
        if (crudo === null || crudo === '') return POR_DEFECTO;
        const v = Number(crudo);
        return TIEMPOS.includes(v) ? v : POR_DEFECTO;
    } catch (_) {
        return POR_DEFECTO;
    }
}

export function fijarMinutosCerrojo(m) {
    const v = Number(m);
    if (!TIEMPOS.includes(v)) return;
    try { localStorage.setItem(LLAVE, String(v)); } catch (_) { /* navegación privada */ }
    ultimo = Date.now();
}

let ultimo = Date.now();
let vigilando = false;

/**
 * Hasta cuándo se le perdona a la app estar en segundo plano.
 *
 * Esto arregla un fallo real, contado por un probador el 14/09/2026: guardaba la
 * copia de seguridad bien, pero al restaurarla la app le devolvía a la pantalla de
 * entrar sin decir nada y perdiendo el fichero que acababa de elegir.
 *
 * La causa era este mismo cerrojo. Para elegir el fichero hay que SALIR de la app
 * e irse al explorador o a Drive, y ese rato contaba como abandono; al volver, la
 * comprobación saltaba en el acto y cerraba la cartera. Exportar sí le funcionaba
 * porque ahí se sale y ya no se vuelve: no hay nada que recuperar. Restaurar
 * obliga a volver, y era volver lo que la app castigaba.
 *
 * La regla nueva es estrecha a propósito: solo se perdona cuando ha sido LA APP la
 * que ha abierto el diálogo del sistema, solo durante un rato acotado, y se acaba
 * en cuanto el dueño vuelve a tocar la pantalla. Irse a Inicio o que te llamen
 * siguen contando como siempre.
 */
let dialogoHasta = 0;

/** Cualquier toque cuenta como estar delante del móvil. */
function marcar() {
    ultimo = Date.now();
    dialogoHasta = 0;         // ya ha vuelto: el permiso se gasta aquí
}

/**
 * La app va a abrir un diálogo del SISTEMA -elegir un fichero, compartir- y eso la
 * manda al fondo sin que nadie la haya abandonado. Se llama JUSTO antes de abrirlo.
 *
 * @param minutos  cuánto se perdona como mucho. Acotado a propósito: si alguien se
 *                 deja el selector abierto y el móvil encima de la mesa, esto es
 *                 una cartera abierta, así que el perdón no puede ser eterno.
 */
export function abriendoDialogoDelSistema(minutos = 10) {
    dialogoHasta = Date.now() + minutos * 60000;
}

/**
 * Arranca el cerrojo. Se llama UNA vez, al arrancar la app.
 *
 * Mide inactividad de verdad -desde el ultimo toque- y no "tiempo desde que se
 * fue al fondo": asi el limite es el mismo se mire por donde se mire, y volver a
 * la app no regala tiempo. Al volver de segundo plano se comprueba en el acto,
 * sin esperar al siguiente latido.
 *
 * @param alBloquear  cerrar la boveda y repintar; solo se llama si estaba abierta
 * @param estaAbierta  para no bloquear -ni repintar- lo que ya esta cerrado
 */
export function vigilarCerrojo(alBloquear, estaAbierta) {
    if (vigilando) return;
    vigilando = true;
    marcar();

    for (const evento of ['pointerdown', 'keydown', 'touchstart', 'wheel']) {
        document.addEventListener(evento, marcar, { passive: true, capture: true });
    }

    const mirar = async () => {
        const m = minutosCerrojo();
        if (!m) return;                                   // «nunca»
        if (Date.now() - ultimo < m * 60000) return;
        // El rato que la app pasa fuera por un diálogo que abrió ella no cuenta.
        // Se reinicia el reloj SIN gastar el permiso: el latido corre también en
        // segundo plano, y gastarlo aquí dejaría al dueño sin él justo cuando
        // vuelve. Lo gasta `marcar()`, o sea, el primer toque de vuelta.
        if (dialogoHasta && Date.now() < dialogoHasta) { ultimo = Date.now(); return; }
        if (!(await estaAbierta())) { marcar(); return; }
        marcar();
        await alBloquear();
    };

    // Un latido lento basta: el limite es de minutos, y un temporizador cada
    // pocos segundos gasta bateria para nada.
    setInterval(mirar, 15000);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        mirar();
    });
}

let plugin = null;

/** Carga perezosa: en el navegador este import no hace falta para nada. */
async function app() {
    if (!esNativo()) return null;
    if (!plugin) plugin = (await import('@capacitor/app')).App;
    return plugin;
}

/**
 * El boton de atras de Android.
 *
 * @param enPanel   ¿estamos en la pantalla principal?
 * @param alPanel   volver a la pantalla principal
 */
export async function vigilarAtras(enPanel, alPanel) {
    const a = await app();
    if (!a) return;
    a.addListener('backButton', () => {
        if (enPanel()) a.minimizeApp();      // en el Panel, atras = salir
        else alPanel();
    });
}

/** Manda la app al fondo, como el boton de Inicio. Deja el proceso vivo. */
export async function alFondo() {
    const a = await app();
    if (a) a.minimizeApp();
}
