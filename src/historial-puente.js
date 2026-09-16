// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LO QUE SE HA MANDADO POR EL PUENTE.
//
// Un envío por el puente no se ve en ningún sitio. No sale en los movimientos de
// la cuenta como una transferencia normal -es una llamada a un contrato-, tarda
// minutos en llegar a la otra orilla, y lo único con lo que se puede preguntar por
// él es una referencia de 43 caracteres que hasta ahora vivía en una pantalla que
// se borraba al salir. Quien cerrara la app perdía el rastro de su propio dinero.
//
// Esto lo apunta. Lo pidió Antonio y es de las pocas cosas de este proyecto que
// arreglan un problema de verdad y no de comodidad.
//
// Se guarda en el aparato y en claro, a propósito: aquí no hay ningún secreto
// -cantidades, direcciones y referencias son PÚBLICAS, cualquiera las lee en el
// explorador- y cifrarlo obligaría a pedir la contraseña para ver una lista, que
// es justo lo que uno quiere mirar cuando está nervioso porque su dinero no
// aparece. Lo que NO se guarda aquí, ni se guardará: nada de claves.

const CLAVE = 'koberlet.puente.historial';

/** Cuántos se guardan. Más no hace falta y el almacenamiento del WebView es finito. */
const CUANTOS = 50;

function leerTodo() {
    try {
        const crudo = localStorage.getItem(CLAVE);
        const l = crudo ? JSON.parse(crudo) : [];
        return Array.isArray(l) ? l : [];
    } catch (_) {
        // Un historial ilegible no puede impedir usar el puente: se empieza de
        // cero y a seguir. Perder la lista es malo; no poder enviar, peor.
        return [];
    }
}

function guardar(lista) {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, CUANTOS)));
    } catch (_) { /* sin sitio o sin permiso: el envío no se para por esto */ }
}

/** Los envíos, del más nuevo al más viejo. */
export function historial() {
    return leerTodo();
}

/**
 * Apunta un envío recién aceptado por el nodo.
 *
 * Se llama en cuanto hay referencia, NO al final: si se apuntara al terminar, el
 * caso que importa -la app se cierra a mitad- sería justo el que no queda escrito.
 */
export function apuntar({ rk, cantidad, simbolo, destino, red }) {
    if (!rk) return;
    const lista = leerTodo();
    lista.unshift({
        rk,
        cantidad: Number(cantidad),
        simbolo: String(simbolo || ''),
        destino: String(destino || ''),
        red: String(red || ''),
        cuando: Date.now(),
        estado: 'enviado',
        id: null,
    });
    guardar(lista);
}

/**
 * Cambia lo que se sabe de un envío ya apuntado.
 *
 * `estado` es uno de: 'enviado' (el nodo lo aceptó), 'en-bloque' (salió de Kadena),
 * 'fallo' (entró en un bloque y lo rechazó el contrato), 'sin-saber' (se acabó la
 * espera sin verlo) y 'entregado' (ya está en Ethereum, lo dice el comprobador).
 */
export function apuntarCambio(rk, campos) {
    const lista = leerTodo();
    const i = lista.findIndex((x) => x.rk === rk);
    if (i < 0) return;
    lista[i] = { ...lista[i], ...campos };
    guardar(lista);
}

/** Borra la lista entera. */
export function olvidarHistorial() {
    try { localStorage.removeItem(CLAVE); } catch (_) { /* nada que hacer */ }
}
