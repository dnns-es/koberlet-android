// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// CODIGOS QR - leer con la camara y pintar el propio.
//
// Es la mejora grande del movil frente al escritorio: una cuenta Kadena son 66
// caracteres y teclearla a mano es la forma mas habitual de mandar dinero a
// ninguna parte.
//
// Se lee con jsQR sobre la camara del navegador (getUserMedia), NO con el lector
// de codigos de Google. Motivos: el de Google (ML Kit) obliga a tener los
// servicios de Play instalados, que no estan en todos los aparatos, y mete una
// dependencia de Google en un monedero. Con jsQR la imagen no sale del telefono
// y funciona en cualquier Android.

import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { t } from './idioma.js';

/**
 * Abre la camara a pantalla completa y resuelve con el texto del primer codigo
 * que lea, o con null si el usuario cierra.
 */
export function escanear() {
    return new Promise((resolve) => {
        const capa = document.createElement('div');
        capa.className = 'camara';

        const video = document.createElement('video');
        video.setAttribute('playsinline', '');   // sin esto, algunos Android abren el reproductor a pantalla completa
        video.muted = true;

        const marco = document.createElement('div');
        marco.className = 'camara-marco';

        const pie = document.createElement('div');
        pie.className = 'camara-pie';
        pie.textContent = t('Apunta al código QR de la dirección');

        const cerrar = document.createElement('button');
        cerrar.className = 'camara-cerrar';
        cerrar.textContent = t('Cancelar');

        capa.append(video, marco, pie, cerrar);
        document.body.append(capa);

        const lienzo = document.createElement('canvas');
        const ctx = lienzo.getContext('2d', { willReadFrequently: true });
        let flujo = null;
        let vivo = true;

        function terminar(valor) {
            if (!vivo) return;
            vivo = false;
            // Apagar la camara SIEMPRE, tambien al cancelar: dejar el piloto
            // encendido despues de salir es de las cosas que mas mosquean.
            if (flujo) flujo.getTracks().forEach((pista) => pista.stop());
            capa.remove();
            resolve(valor);
        }

        cerrar.addEventListener('click', () => terminar(null));

        function mirar() {
            if (!vivo) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                lienzo.width = video.videoWidth;
                lienzo.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
                const imagen = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
                const codigo = jsQR(imagen.data, imagen.width, imagen.height, { inversionAttempts: 'dontInvert' });
                if (codigo && codigo.data) return terminar(codigo.data.trim());
            }
            requestAnimationFrame(mirar);
        }

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then((f) => {
                flujo = f;
                video.srcObject = f;
                video.play();
                requestAnimationFrame(mirar);
            })
            .catch((e) => {
                pie.textContent = t('No se pudo abrir la cámara: {0}', e.message || e);
                pie.classList.add('malo');
            });
    });
}

/**
 * Lo que llega de un QR puede venir como direccion pelada o como enlace
 * `kadena:k:...`. Se queda con la cuenta y descarta lo demas; quien decide si es
 * valida es el validador de cuentas, no esto.
 */
export function cuentaDeQr(texto) {
    if (!texto) return '';
    let leido = texto.trim();
    if (leido.toLowerCase().startsWith('kadena:')) leido = leido.slice(7);
    const corte = leido.indexOf('?');
    if (corte > 0) leido = leido.slice(0, corte);
    return leido.trim();
}

/**
 * Un COBRO leido de un QR: a quien, cuanto y en que chain.
 *
 * El formato es el de toda la vida en monederos: `kadena:<cuenta>?amount=1.5&chain=2`.
 * Todo lo que no sea la cuenta es OPCIONAL, y un QR con la cuenta a secas -que es
 * lo que generan Chainweaver, eckoWallet y esta misma app cuando no se pide una
 * cantidad- se sigue leyendo igual.
 *
 * Lo que llega de una camara es dato ajeno, asi que aqui no se da nada por bueno:
 * la cantidad tiene que ser un numero positivo y la chain un entero de 0 a 19. Lo
 * que no cuadre se ignora y se queda en null, que la pantalla trata como «no lo
 * dijeron». Nunca se envia nada solo porque lo diga un codigo: esto rellena
 * casillas, y el dueño sigue viendo el resumen y firmando.
 */
export function cobroDeQr(texto) {
    const cuenta = cuentaDeQr(texto);
    const salida = { cuenta, cantidad: null, chain: null };
    const crudo = String(texto || '');
    const corte = crudo.indexOf('?');
    if (corte < 0) return salida;
    let parametros;
    try {
        parametros = new URLSearchParams(crudo.slice(corte + 1));
    } catch (_) {
        return salida;
    }
    const cantidad = Number(String(parametros.get('amount') || '').replace(',', '.'));
    if (isFinite(cantidad) && cantidad > 0) salida.cantidad = cantidad;
    // El texto del parametro, ANTES de convertirlo. Cuando no viene, `get`
    // devuelve null, y `Number(null)` es 0 -que es un entero entre 0 y 19 y
    // colaba como chain buena-. Un QR con importe y sin chain se leia entonces
    // como «chain 0», rellenando una casilla que el que cobra no habia dicho.
    // Hasta la 0.58.0 no se notaba porque nadie generaba ese QR; el Koberlet de
    // escritorio si lo genera desde su 2.10.0.
    const textoChain = parametros.get('chain');
    if (textoChain !== null && textoChain.trim() !== '') {
        const chain = Number(textoChain);
        if (Number.isInteger(chain) && chain >= 0 && chain <= 19) salida.chain = chain;
    }
    return salida;
}

/**
 * El texto que se mete en el QR para cobrar. Sin cantidad ni chain, la cuenta a
 * secas: asi lo entiende cualquier monedero, tambien los que no saben de esto.
 */
export function qrDeCobro(cuenta, cantidad, chain) {
    const partes = [];
    if (cantidad > 0) partes.push('amount=' + cantidad);
    if (chain !== null && chain !== undefined && chain !== '') partes.push('chain=' + chain);
    if (!partes.length) return cuenta;
    return 'kadena:' + cuenta + '?' + partes.join('&');
}

/** Pinta el QR de una direccion para que otro la lea con su movil. */
export async function pintarQr(texto, tamano = 220) {
    const lienzo = document.createElement('canvas');
    await QRCode.toCanvas(lienzo, texto, {
        width: tamano,
        margin: 1,
        errorCorrectionLevel: 'M',
        // color-fijo: un QR se lee por contraste, no por estética. Va siempre
        // oscuro sobre blanco, también con el tema oscuro puesto: pintarlo con
        // los colores del tema es la forma de que la cámara de enfrente no lo pille.
        color: { dark: '#1a1c20', light: '#ffffff' },
    });
    lienzo.style.maxWidth = '100%';
    lienzo.style.height = 'auto';
    return lienzo;
}
