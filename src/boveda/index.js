// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// Elige que boveda usar. La regla es sencilla y no admite excepciones:
//
//   dentro del APK  -> boveda nativa (plugin Kotlin). Siempre.
//   en el navegador -> doble de desarrollo.
//
// El doble se carga con un import() dinamico DENTRO del `if`, no arriba del
// fichero. Asi el empaquetador lo deja en un trozo aparte que el APK no llega a
// pedir nunca: el codigo que guarda claves en localStorage no viaja en el camino
// de la app de verdad.

import { fijarBoveda } from './contrato.js';
import { esNativo } from '../red.js';

export async function prepararBoveda() {
    if (esNativo()) {
        const { bovedaNativa } = await import('./nativa.js');
        fijarBoveda(bovedaNativa);
        return 'nativa';
    }
    const { bovedaSimulada } = await import('./simulada.js');
    fijarBoveda(bovedaSimulada);
    return 'simulada';
}
