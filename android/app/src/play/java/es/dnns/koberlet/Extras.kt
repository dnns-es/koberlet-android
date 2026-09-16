// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import com.getcapacitor.Plugin

/**
 * PLUGINS EXTRA DEL CANAL GOOGLE PLAY: ninguno. A proposito.
 *
 * La lista esta vacia porque aqui NO entra `KoberletUpdate`. Esa clase vive en
 * `src/directa/` y no se compila en esta variante, asi que el APK que sube a Play
 * no contiene el codigo de descarga ni la llamada al instalador, y el manifiesto
 * no pide REQUEST_INSTALL_PACKAGES.
 *
 * En Play actualiza la tienda: se sube un bundle con versionCode mayor y Google lo
 * reparte solo. La bóveda, las claves y los datos del aparato no se tocan, igual
 * que en cualquier otra actualizacion de Android.
 *
 * El resto de la app - boveda, firma, envio - es EXACTAMENTE el mismo codigo que
 * el canal directo. Lo unico que cambia es por donde llegan las versiones nuevas.
 */
object Extras {
    fun plugins(): List<Class<out Plugin>> = emptyList()
}
