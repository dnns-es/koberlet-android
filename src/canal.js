// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// CANAL DE DISTRIBUCION.
//
// La misma app se reparte por dos sitios y no pueden llevar lo mismo dentro:
//
//   'directa' -> descargas.dnns.es. Es el canal de siempre y el banco de pruebas:
//                aqui se estrena cada version antes de mandarla a ningun lado.
//                Lleva la comprobacion de version y el instalador propio.
//
//   'play'    -> Google Play. SIN actualizacion propia. No es una manía nuestra:
//                Play prohibe que una app descargue codigo e invoque al instalador
//                (politica de Codigo Ejecutable / Abuso de Dispositivo), y saltarsela
//                cuesta la app y la cuenta. Ahi actualiza la tienda, sola y sin que
//                el dueño tenga que aceptar nada.
//
//   'ios'     -> iPhone, por TestFlight o App Store. Tampoco lleva actualizacion
//                propia: en iOS no existe siquiera "instalar un paquete" fuera de
//                la tienda, y Apple lo prohibe igual que Play. Actualiza TestFlight
//                (o la App Store) por su cuenta.
//
// El valor lo fija Vite al compilar (`vite build --mode play|ios`), asi que
// estas comparaciones son constantes y el empaquetador se lleva por delante el
// codigo de la rama que no toca. En las compilaciones de tienda no queda ni la
// URL de descargas: el codigo no viaja, no es que este apagado.

export const CANAL = __CANAL__;

/** Cierto solo en la compilacion que se cuelga en descargas.dnns.es. */
export const HAY_ACTUALIZACION_PROPIA = __CANAL__ === 'directa';

/**
 * Conectar con paginas web (WalletConnect). Fuera de Google Play a proposito.
 *
 * No es un problema de WalletConnect en si, sino de a donde lleva: buena parte de
 * las dApps de Kadena que lo usan son de apuestas, y Play mete las apps que dan
 * acceso a juego con dinero real en una politica aparte -con licencia por pais y
 * declaracion previa- que Koberlet no tiene. Una app financiera tumbada por eso
 * se lleva por delante la cuenta entera, no solo la funcion.
 *
 * Como la comparacion es constante, en la compilacion de Play NO VIAJA el codigo:
 * ni la seccion, ni el SDK del rele (unos 700 kB). En la de iPhone si va: Apple
 * revisa a mano y las demas billeteras de la App Store lo llevan.
 */
export const HAY_WALLETCONNECT = __CANAL__ !== 'play';
