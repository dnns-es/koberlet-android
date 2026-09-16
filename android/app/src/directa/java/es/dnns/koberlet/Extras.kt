// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import com.getcapacitor.Plugin

/**
 * PLUGINS QUE SOLO EXISTEN EN EL CANAL DIRECTO (descargas.dnns.es).
 *
 * Aqui va `KoberletUpdate`: descargar el APK nuevo, cotejar su huella y abrir el
 * instalador del sistema. Es lo que permite estrenar una version en el movil sin
 * pasar por ninguna tienda, que es como se prueba todo antes de mandarlo a Play.
 *
 * La variante `play` tiene su propia copia de este fichero, vacia. No es que alli
 * el plugin este apagado: es que no se compila. Google Play prohibe que una app
 * descargue codigo e invoque al instalador (politica de Codigo Ejecutable), y el
 * revisor mira el bytecode y el manifiesto, no lo que haga la pantalla.
 *
 * MainActivity es la misma para los dos canales y solo pregunta por esta lista:
 * asi no hay dos copias de la actividad que puedan envejecer por separado.
 */
object Extras {
    fun plugins(): List<Class<out Plugin>> = listOf(KoberletUpdate::class.java)
}
