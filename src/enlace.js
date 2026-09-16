// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// ENLACES QUE ABREN LA APP  (kadena:k:...?amount=..&chain=..)
//
// Con la camara del movil enfocando un QR de cobro, Android ofrece abrir la app
// que entienda ese enlace. Aqui se recoge y se guarda hasta que la cartera este
// abierta; entonces el Panel lo usa para RELLENAR la pantalla de envio.
//
// Lo que NO hace, y es a proposito: no envia nada, ni con la huella puesta. Un
// enlace lo puede disparar cualquier aplicacion o cualquier pagina web, no solo
// una camara apuntando a un papel. Si un enlace pudiera cobrar, bastaria con
// colar uno para vaciarle la cartera a alguien que pone el dedo por costumbre.
// La huella dice «soy yo», no dice «acepto pagar esto»: lo segundo solo lo dice
// alguien que ha leido a quien y cuanto. Por eso el enlace llega hasta el
// resumen de siempre, con la contrasena o la huella detras, y ni un paso mas.
//
// Y solo se acepta el enlace de la primera vez o el de una app abierta y
// desbloqueada: con la cartera cerrada se queda esperando, no la abre el.

import { cobroDeQr } from './qr.js';
import { cuentaKdaValida } from './lib/kda.js';

let pendiente = null;

/**
 * Guarda un enlace recibido, si es un cobro Kadena con una cuenta valida.
 * Devuelve true si se ha quedado con el.
 */
export function anotarEnlace(url) {
    const crudo = String(url || '').trim();
    if (!/^kadena:/i.test(crudo)) return false;
    const cobro = cobroDeQr(crudo);
    if (!cuentaKdaValida(cobro.cuenta)) return false;
    pendiente = cobro;
    return true;
}

/** Devuelve el cobro pendiente UNA vez: al leerlo se borra. */
export function recogerEnlace() {
    const p = pendiente;
    pendiente = null;
    return p;
}

export function hayEnlace() { return pendiente !== null; }

/**
 * Se engancha a los avisos de Android (`appUrlOpen`) y mira con que enlace se
 * abrio la app. En el navegador no hay plugin: ahi vale `#kadena:...` en la
 * barra de direcciones, que es como se prueba la maqueta sin compilar nada.
 */
export async function vigilarEnlaces(alLlegar) {
    const avisa = () => { if (pendiente && alLlegar) alLlegar(); };

    try {
        const hash = decodeURIComponent(String(location.hash || '').replace(/^#/, ''));
        if (anotarEnlace(hash)) {
            // Se limpia la barra: un enlace de cobro no tiene por que quedarse
            // en el historial ni reaparecer al recargar.
            history.replaceState(null, '', location.pathname + location.search);
        }
    } catch (_) { /* la maqueta puede correr desde file:// */ }

    try {
        const { App } = await import('@capacitor/app');
        const arranque = await App.getLaunchUrl();
        if (arranque && arranque.url) anotarEnlace(arranque.url);
        App.addListener('appUrlOpen', (dato) => {
            if (anotarEnlace(dato && dato.url)) avisa();
        });
    } catch (_) { /* en el navegador no hay plugin de Capacitor */ }

    avisa();
}
