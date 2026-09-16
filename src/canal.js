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
