// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// UN DATO LARGO QUE HAY QUE PODER LLEVARSE.
//
// Las referencias de transacción y los identificadores de mensaje son cadenas de
// 43 o 66 caracteres sin sentido para nadie. Se enseñan porque son lo único con lo
// que averiguar qué pasó con un envío, y por eso mismo tienen que poder COPIARSE:
// quien las teclea a mano en un móvil se equivoca, y una referencia mal tecleada
// no da un error claro, da un «no existe» que parece que el dinero no está.
//
// El botón dice además PARA QUÉ sirve el dato, porque en el Puente se enseñan dos
// cosas parecidas -la referencia y el identificador del mensaje- y solo una vale
// para el comprobador de abajo. Sin decirlo, se prueba con la que no es.

import { t } from './idioma.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

/**
 * @param etiqueta  qué es este dato
 * @param valor     el dato, tal cual
 * @param nota      para qué sirve (opcional, va debajo en letra pequeña)
 */
export function lineaCopiable(etiqueta, valor, nota) {
    const c = elemento('div', null, 'copiable');
    c.append(elemento('div', etiqueta, 'copiable-que'));
    c.append(elemento('div', valor, 'dir'));
    if (nota) c.append(elemento('p', nota, 'nota'));

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'secundario';
    b.textContent = t('Copiar');
    b.addEventListener('click', async () => {
        let bien = false;
        try { await navigator.clipboard.writeText(valor); bien = true; } catch (_) { bien = false; }
        // Si el portapapeles no deja -pasa en WebView sin permiso-, no se miente:
        // se dice qué hacer en su lugar, que es mantener pulsado el texto.
        b.textContent = bien ? t('✓ Copiado') : t('No se pudo copiar: mantén pulsado el texto');
        setTimeout(() => { b.textContent = t('Copiar'); }, 2500);
    });
    c.append(b);
    return c;
}
