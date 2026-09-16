// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// COMPROBACION DE ACTUALIZACIONES.
//
// Mira `latest.json` en el servidor de descargas y, si hay una version mas nueva,
// saca un aviso con un boton. La descarga, la comprobacion de la huella y la
// llamada al instalador las hace el plugin nativo; aqui solo se compara y se
// avisa.
//
// La comparacion va por `versionCode`, que es el numero entero que mira Android,
// y la version instalada se le pregunta al SISTEMA, no al JavaScript: lo que
// cuenta es el APK que hay puesto, no lo que diga la pagina.
//
// TODO ESTO ES SOLO DEL CANAL 'directa' (descargas.dnns.es). En la compilacion de
// Google Play no se ejecuta ni se empaqueta: ver `canal.js`. Alli actualiza la
// tienda. El codigo no se toca por eso: sigue siendo el mismo fichero y el mismo
// mecanismo, simplemente no viaja en esa variante.

import { registerPlugin } from '@capacitor/core';
import { getJson } from './red.js';
import { esNativo } from './red.js';
import { t } from './idioma.js';
import { CANAL, HAY_ACTUALIZACION_PROPIA } from './canal.js';

// El registro va en diferido a proposito. Si se hiciera al cargar el modulo, seria
// un efecto secundario que el empaquetador no puede quitar, y la compilacion de
// Play acabaria nombrando un plugin nativo que ahi no existe.
let Update = null;
function plugin() {
    if (!Update) Update = registerPlugin('KoberletUpdate');
    return Update;
}

const ORIGEN = 'https://descargas.dnns.es/kob7t2m9x4/koberlet-android/latest.json';

/**
 * Devuelve { hay, version, versionCode, url, sha256, notas } o null si no se pudo
 * comprobar. No se considera un error grave: quedarse sin actualizar por estar
 * sin cobertura no puede romper la app.
 */
export async function comprobar() {
    if (!HAY_ACTUALIZACION_PROPIA) return null;   // en Play actualiza la tienda
    if (!esNativo()) return null;              // en el navegador no hay nada que instalar
    try {
        const actual = await plugin().version();
        const { json } = await getJson(ORIGEN + '?t=' + Date.now());   // sin cache: se pregunta de verdad
        const hay = Number(json.versionCode) > Number(actual.versionCode);
        return { hay, instalada: actual.version, ...json };
    } catch (_) {
        return null;
    }
}

/** Descarga, comprueba la huella y abre el instalador del sistema. */
export async function instalar(info) {
    if (CANAL === 'ios') throw new Error('Esta versión se actualiza desde TestFlight o la App Store.');
    if (!HAY_ACTUALIZACION_PROPIA) throw new Error('Esta versión se actualiza desde Google Play.');
    return plugin().instalar({ url: info.url, sha256: info.sha256 });
}

/**
 * Pinta el aviso arriba del todo. Se llama al arrancar; si no hay nada nuevo, no
 * enseña nada: una app que avisa de que esta al dia es una app que molesta.
 */
export async function avisarSiHay(donde) {
    if (!HAY_ACTUALIZACION_PROPIA) return;
    const info = await comprobar();
    if (!info || !info.hay) return;

    const c = document.createElement('div');
    c.className = 'caja avisa';

    const linea = document.createElement('p');
    linea.style.margin = '0 0 6px';
    linea.textContent = t('Hay una versión nueva: {0} (tienes la {1}).', info.version, info.instalada);
    c.append(linea);

    if (info.notas) {
        const n = document.createElement('p');
        n.className = 'nota';
        n.textContent = info.notas;
        c.append(n);
    }

    const b = document.createElement('button');
    b.textContent = t('Descargar e instalar');
    b.addEventListener('click', async () => {
        b.disabled = true;
        b.textContent = t('Descargando…');
        try {
            await instalar(info);
            b.textContent = t('Confirma la instalación en el aviso de Android');
        } catch (e) {
            b.disabled = false;
            b.textContent = t('Descargar e instalar');
            const err = document.createElement('p');
            err.className = 'malo';
            err.textContent = t(String(e.message || e));
            c.append(err);
        }
    });
    c.append(b);

    donde.prepend(c);
}
