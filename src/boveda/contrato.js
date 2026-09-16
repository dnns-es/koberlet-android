// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// CONTRATO DE LA BOVEDA.
//
// Este fichero no guarda nada: define QUE se le puede pedir a la boveda y, sobre
// todo, que NO. Detras hay dos implementaciones que cumplen lo mismo:
//
//   - boveda/nativa.js    plugin Kotlin sobre Android Keystore. Es la de verdad.
//   - boveda/simulada.js  doble de desarrollo con WebCrypto, SOLO en el navegador.
//
// La pantalla habla siempre con este contrato, nunca con una implementacion
// concreta. Asi la interfaz se puede construir y probar en el ordenador sin que
// eso signifique tener las claves dentro del WebView cuando corre en el movil.
//
// Lo que la pantalla NUNCA puede pedir:
//   - "dame la clave privada" a secas. Solo `exportar`, y exige la contrasena.
//   - "dame la semilla". Sale una unica vez, al crearla, para que el dueno la
//     apunte, y se pide explicitamente con `semillaRecienCreada`.
//   - firmar sin decir que se firma. Eso llega en la Fase 3 y va con su resumen.

/**
 * @typedef {Object} EstadoBoveda
 * @property {boolean} existe   ya hay boveda creada en este aparato
 * @property {boolean} abierta  hay sesion abierta ahora mismo
 * @property {string}  motor    'nativa' | 'simulada' (se ensena en pantalla)
 */

/**
 * @typedef {Object} CuentaPublica
 * @property {string} id        identificador interno de la cartera
 * @property {string} etiqueta  nombre que le puso el dueno
 * @property {string} tipo      'kda' | 'evm'
 * @property {string} cuenta    k:... o 0x... - dato PUBLICO
 */

/**
 * La implementacion viva. La elige boveda/index.js segun donde corramos.
 * @type {{
 *   estado: () => Promise<EstadoBoveda>,
 *   crear: (contrasena: string, etiqueta?: string, red?: 'kda'|'evm') => Promise<{ semilla: string, cuentas: CuentaPublica[] }>,
 *   importar: (contrasena: string, semilla: string, etiqueta?: string, red?: 'kda'|'evm') => Promise<{ cuentas: CuentaPublica[] }>,
 *   importarClave: (contrasena: string, privada: string, etiqueta?: string, red?: 'kda'|'evm') => Promise<{ cuentas: CuentaPublica[] }>,
 *   abrir: (contrasena: string) => Promise<{ cuentas: CuentaPublica[] }>,
 *   cerrar: () => Promise<void>,
 *   cuentas: () => Promise<CuentaPublica[]>,
 *   exportar: (contrasena: string, id: string) => Promise<{ privada: string }>,
 *   borrarTodo: (contrasena: string) => Promise<void>,
 * }}
 */
export let boveda = null;

export function fijarBoveda(impl) { boveda = impl; }

// Suelo de seguridad de la contrasena. No es un adorno de interfaz: la boveda es
// un fichero que puede acabar en manos ajenas (copia, movil robado, backup), y
// ahi lo unico que protege el dinero es lo que cueste probar contrasenas.
export const MIN_CONTRASENA = 10;

export function contrasenaDebil(c) {
    if (typeof c !== 'string' || c.length < MIN_CONTRASENA) {
        return `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres.`;
    }
    // Sin reglas de "una mayúscula y un símbolo": obligan a contraseñas cortas y
    // retorcidas. Lo que de verdad ayuda es longitud y que no sea una frase hecha.
    const trivial = ['contrasena', 'contraseña', 'password', '1234567890', 'koberlet123'];
    if (trivial.some((t) => c.toLowerCase().includes(t))) {
        return 'Esa contraseña es de las primeras que se prueban. Pon otra.';
    }
    return null;
}
