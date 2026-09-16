// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// QUE MERCADO SE ESTA MIRANDO: el de Kadena o el de Ethereum.
//
// Son dos mercados distintos -otra cadena, otros pools, otra firma- y hasta la
// 0.51.1 se pintaban los dos, uno debajo del otro. Antonio lo dijo claro: entrar
// desde la cartera de Ethereum y que se abra tambien la zona de Kadena sobra.
//
// Asi que hay pestañas, y quien llega desde una tarjeta deja dicho por cual entra.
// Es una preferencia de pantalla, no un dato de nadie: vive en el aparato.

const CLAVE = 'koberlet.mercado.red';

export function redMercado() {
    try {
        return localStorage.getItem(CLAVE) === 'evm' ? 'evm' : 'kda';
    } catch (_) { return 'kda'; }
}

export function fijarRedMercado(v) {
    try { localStorage.setItem(CLAVE, v === 'evm' ? 'evm' : 'kda'); } catch (_) { /* navegación privada */ }
}
