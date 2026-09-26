// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// EL NOMBRE DE UNA CARTERA EN PANTALLA.
//
// El nombre que le pone el dueño a su cartera NO se traduce: es un dato suyo, y
// traducirlo seria cambiarselo. Pero «Mi cartera» no lo puso nadie: es el nombre
// que pone la app cuando se crea la primera y el dueño no eligio ninguno. Con la
// app en ingles, ver «Mi cartera» en la cabecera no es respetar un dato: es una
// pantalla a medio traducir.
//
// Asi que solo se traducen ESOS nombres, los que escribe el propio codigo
// (aqui y en `Carteras.kt`). En cuanto el dueño renombra la cartera, deja de
// coincidir y su nombre se queda tal cual lo escribio, en el idioma que sea.

import { t } from './idioma.js';

export function nombreCartera(etiqueta) {
    const e = String(etiqueta || '').trim();
    if (!e || e === 'Mi cartera') return t('Mi cartera');
    if (e === 'Mi cartera KDA') return t('Mi cartera KDA');
    if (e === 'Mi cartera EVM') return t('Mi cartera EVM');
    // Tambien los que pone la app al importar o añadir sin nombre (26/09/2026: en
    // ingles salia «Cartera importada» en la cabecera).
    if (e === 'Cartera importada') return t('Cartera importada');
    if (e === 'Cartera nueva') return t('Cartera nueva');
    return e;
}
