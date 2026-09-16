// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SECCION NFT.
//
// Enseña las piezas que la cadena confirma que son de esta cuenta. De momento
// SOLO VER: mover una pieza necesita firmar, y esa firma se monta en Kotlin como
// la de los envios de KDA, con su capability atada a la pieza y al destinatario.
// Hasta que eso este hecho y probado, aqui no hay boton de enviar: un boton que
// promete mover un NFT y no lo hace es peor que no tenerlo.
//
// Como el fork no tiene quien indexe los NFT, las piezas se apuntan por su
// identificador y la cadena dice de quien son.

import { piezasDe, comprobarPieza, idsGuardados, guardarId, olvidarId } from './lib/nft.js';
import { t } from './idioma.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function caja() { return elemento('div', null, 'caja'); }

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', alPulsar);
    return b;
}

/**
 * @param raiz  donde pintar
 * @param ctx   { cuentas, red }
 */
export function pintarNft(raiz, ctx) {
    raiz.innerHTML = '';

    const kda = ctx.cuentas.filter((c) => c.tipo === 'kda');
    if (!kda.length) {
        raiz.append(elemento('p', t('Esta cartera no tiene ninguna cuenta de Kadena.'), 'nota'));
        return;
    }

    kda.forEach((cuenta) => {
        const c = caja();
        if (kda.length > 1) c.append(elemento('h2', cuenta.cartera || cuenta.etiqueta));
        c.append(elemento('div', cuenta.cuenta, 'dir'));

        const donde = elemento('div');
        donde.append(elemento('p', t('Buscando tus piezas…'), 'nota'));
        c.append(donde);
        c.append(bloqueAnadir(cuenta.cuenta, ctx.red, () => pintarNft(raiz, ctx)));
        raiz.append(c);

        cargar(donde, cuenta.cuenta, ctx, () => pintarNft(raiz, ctx));
    });

    const nota = caja();
    nota.append(elemento('h3', t('Sobre esta sección')));
    nota.append(elemento('p',
        t('Esta red no tiene ningún servicio que diga qué piezas hay en cada cuenta, así que se apuntan por su identificador y es la cadena la que confirma de quién son. Lo que la cadena no confirme, aquí no se enseña.'),
        'nota'));
    nota.append(elemento('p',
        t('Mover una pieza todavía no se puede desde el móvil: hace falta firmarla, y esa firma se monta en la parte nativa igual que la de los envíos de KDA. Llegará cuando esté probada.'),
        'nota'));
    raiz.append(nota);
}

async function cargar(donde, cuenta, ctx, refrescar) {
    const ids = idsGuardados(cuenta);
    try {
        const { piezas, aviso, sinRespuesta } = await piezasDe(cuenta, ctx.red, ids);
        donde.innerHTML = '';
        if (sinRespuesta.length) {
            donde.append(elemento('p',
                t('De {0} piezas no se ha podido preguntar a la cadena, así que no se sabe si siguen aquí.', sinRespuesta.length),
                'malo'));
        }
        if (aviso) {
            // El motivo se enseña tal cual: si el descubridor de la red está mal
            // puesto, esconderlo detrás de un "no respondió" genérico solo hace
            // que nadie se entere nunca.
            donde.append(elemento('p', t('El servicio de piezas no respondió: solo se ven las apuntadas a mano.'), 'nota'));
            donde.append(elemento('p', t(String(aviso)), 'nota'));
        }

        if (!piezas.length) {
            // Si no se ha podido preguntar por ninguna, el aviso de arriba ya lo
            // dice: añadir "no tienes nada" debajo seria contradecirlo.
            if (ids.length && sinRespuesta.length >= ids.length) return;
            donde.append(elemento('p',
                ids.length
                    ? t('Ninguna de las piezas apuntadas está ahora mismo en esta cuenta.')
                    : t('Todavía no hay ninguna pieza apuntada en esta cuenta.'),
                'nota'));
            return;
        }
        piezas.forEach((p) => donde.append(tarjetaPieza(p, cuenta, refrescar)));
    } catch (e) {
        donde.innerHTML = '';
        donde.append(elemento('p', t(String(e.message || e)), 'malo'));
    }
}

function tarjetaPieza(p, cuenta, refrescar) {
    const d = elemento('div');
    d.style.borderTop = '1px solid var(--linea)';
    d.style.padding = '12px 0 4px';

    if (p.imagen) {
        const img = document.createElement('img');
        img.src = p.imagen;                       // data URL: nunca un enlace de fuera
        img.alt = p.nombre;
        img.style.width = '100%';
        img.style.borderRadius = '10px';
        img.style.display = 'block';
        img.style.marginBottom = '8px';
        d.append(img);
    }

    d.append(elemento('h3', p.nombre));
    if (p.coleccion) d.append(elemento('p', p.coleccion, 'nota'));
    if (p.descripcion) d.append(elemento('p', p.descripcion, 'nota'));
    if (p.saldo !== 1) d.append(elemento('p', t('Tienes {0} unidades', p.saldo), 'nota'));
    d.append(elemento('div', p.id, 'dir'));

    d.append(boton(t('Quitarla de la lista'), () => {
        olvidarId(cuenta, p.id);
        refrescar();
    }, 'secundario'));
    return d;
}

function bloqueAnadir(cuenta, red, refrescar) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Apuntar una pieza por su identificador');
    det.append(sum);

    const campo = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', 'nft-' + cuenta.slice(2, 10));
    l.textContent = t('Identificador de la pieza');
    const i = document.createElement('input');
    i.id = 'nft-' + cuenta.slice(2, 10);
    i.spellcheck = false;
    i.autocapitalize = 'off';
    i.placeholder = 't:…';
    campo.append(l, i);

    const salida = elemento('div');
    const añadir = boton(t('Comprobar y apuntar'), async () => {
        salida.innerHTML = '';
        añadir.disabled = true;
        salida.append(elemento('p', t('Preguntando a la cadena…'), 'nota'));
        try {
            // Se comprueba ANTES de apuntarla: una lista llena de piezas que no
            // son tuyas no ayuda a nadie.
            const p = await comprobarPieza(cuenta, red, i.value.trim());
            guardarId(cuenta, p.id);
            refrescar();
        } catch (e) {
            salida.innerHTML = '';
            salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        } finally {
            añadir.disabled = false;
        }
    });

    det.append(campo, añadir, salida);
    return det;
}
