// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// QUÉ LE OFRECEMOS A UNA WEB QUE QUIERE CONECTARSE (WalletConnect).
//
// Esto es la parte de WalletConnect que no habla con nadie: entra lo que pidio la
// web y sale lo que se le aprueba. Vive aparte del resto (`walletconnect.js`) por
// una razon muy concreta: aquel fichero carga el SDK entero -sockets, cripto,
// almacenamiento- y no se puede probar sin navegador. Esto si, y esto es lo que
// se rompio.
//
// EL FALLO QUE OBLIGA A QUE ESTO EXISTA (25/09/2026). Antonio leyo el QR de
// mercatusdex.fun y la conexion murio con «Non conforming namespaces. approve()
// namespaces chains don't satisfy required namespaces. Required:
// kadena:mainnet01,kadena:testnet04,kadena:development. Approved:
// kadena:mainnet01». La web pedia TRES redes y aqui se aprobaba siempre una, la
// nuestra. El SDK compara lo aprobado con lo pedido y, si falta algo, no conecta:
// y hace bien, porque una sesion a medias es una web llamando a una red que el
// monedero nunca acepto.
//
// LO QUE SE PUEDE OFRECER SIN MENTIR Y LO QUE NO:
//
//   - REDES: todas las que pida. En Kadena la misma clave es la misma cuenta en
//     mainnet, en testnet y en una red de pruebas; y la red en la que se firma de
//     verdad va DENTRO del comando, que se enseña entero antes de la contraseña.
//     Ofrecerlas no regala nada.
//   - METODOS Y AVISOS: solo los que sabemos atender. Si la web EXIGE uno que no
//     esta, no se conecta y se dice cual. Aprobar prometiendo algo que no se sabe
//     hacer cambia un «no» inmediato por una sesion que se cae al primer uso, con
//     el dueño delante creyendo que va.

/**
 * Qué redes, métodos y avisos pide un bloque de namespaces.
 *
 * Se admiten las DOS formas que permite el estándar: `kadena: {chains: [...]}` y
 * una clave por red -`kadena:mainnet01: {…}`-. Las webs usan una u otra según con
 * qué librería estén hechas, y dar por supuesta la primera es quedarse sin leer
 * lo que pide media Internet.
 */
export function loQuePide(mapa) {
    const cadenas = [];
    const metodos = [];
    const eventos = [];
    for (const [clave, v] of Object.entries(mapa || {})) {
        if (!/^kadena(:|$)/.test(clave)) continue;
        const suyas = (v && v.chains && v.chains.length) ? v.chains : (clave.includes(':') ? [clave] : []);
        cadenas.push(...suyas.filter((x) => /^kadena:[A-Za-z0-9_-]+$/.test(x)));
        metodos.push(...((v && v.methods) || []));
        eventos.push(...((v && v.events) || []));
    }
    return { cadenas, metodos, eventos };
}

const sinRepetir = (lista) => [...new Set(lista)];

/**
 * Lo que se le aprueba a la web, listo para `approveSession`.
 *
 * @param pedido  { obliga, suelta } tal como los devuelve `loQuePide`
 * @param claves  las públicas en hex, LA ELEGIDA LA PRIMERA
 * @param base    { cadena, metodos } lo nuestro: la red de siempre y lo que sabemos hacer
 *
 * Revienta con un código -`WC_METODO_RARO`, `WC_AVISOS_RAROS`- cuando lo que se
 * exige no se puede cumplir, para que la pantalla lo cuente en cristiano.
 */
export function namespacesParaAprobar(pedido, claves, base) {
    const obliga = (pedido && pedido.obliga) || { cadenas: [], metodos: [], eventos: [] };
    const suelta = (pedido && pedido.suelta) || { cadenas: [], metodos: [], eventos: [] };

    const buenas = (claves || []).filter((k) => /^[0-9a-f]{64}$/i.test(k)).map((k) => k.toLowerCase());
    if (!buenas.length) throw new Error('No hay ninguna cuenta que ofrecer.');

    const raros = sinRepetir(obliga.metodos.filter((m) => !base.metodos.includes(m)));
    if (raros.length) throw new Error('WC_METODO_RARO: ' + raros.join(', '));
    const avisos = sinRepetir(obliga.eventos);
    if (avisos.length) throw new Error('WC_AVISOS_RAROS: ' + avisos.join(', '));

    // Mainnet SIEMPRE la primera: es la red donde hay dinero de verdad y, como las
    // webs se quedan con la primera cuenta que se les manda, tiene que ser la suya.
    const cadenas = sinRepetir([base.cadena, ...obliga.cadenas, ...suelta.cadenas]);
    // Los métodos opcionales que no sabemos hacer NO se prometen; los que sí, sí.
    const metodos = sinRepetir([...base.metodos, ...obliga.metodos]);

    // EL ORDEN IMPORTA también aquí: dentro de cada red, la cuenta elegida delante.
    const accounts = [];
    for (const c of cadenas) for (const k of buenas) accounts.push(c + ':' + k);

    return { kadena: { chains: cadenas, methods: metodos, events: [], accounts } };
}

/** La clave pública de una cuenta CAIP-10, sea cual sea el largo de la red. */
export const claveDeCuenta = (caip) => String(caip).slice(String(caip).lastIndexOf(':') + 1);
