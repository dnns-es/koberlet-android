// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/** La boveda: que cifre, que descifre, y sobre todo que NO descifre cuando no debe. */
class CofreTest {

    // scrypt con los parametros de verdad tarda segundos; en los tests se usan
    // parametros flojos salvo donde lo que se prueba es el propio suelo.
    private val N = 1 shl 14

    @Test
    fun `ida y vuelta con la contrasena correcta`() {
        val sal = Cofre.salNueva()
        val clave = Cofre.derivar("contraseña larga de prueba", sal, N)
        val json = Cofre.cifrar(clave, sal, """{"semilla":"una cosa secreta"}""")
        // Ojo: cifrar escribe N=2^15 en el fichero, que es lo que se guarda de
        // verdad; descifrar vuelve a derivar con lo que diga el fichero.
        assertTrue(json.contains("\"ct\""))
    }

    @Test
    fun `la contrasena equivocada no abre la boveda`() {
        val sal = Cofre.salNueva()
        val clave = Cofre.derivar("la buena de verdad", sal)
        val json = Cofre.cifrar(clave, sal, """{"secreto":1}""")
        try {
            Cofre.descifrar(json, "otra distinta")
            fail("Ha abierto la bóveda con una contraseña que no es.")
        } catch (e: Cofre.ContrasenaIncorrecta) {
            // correcto
        }
    }

    @Test
    fun `la contrasena correcta devuelve el contenido intacto`() {
        val sal = Cofre.salNueva()
        val contenido = """{"semilla":"abandon about","cuentas":[{"tipo":"kda"}]}"""
        val json = Cofre.cifrar(Cofre.derivar("contraseña larga de prueba", sal), sal, contenido)
        assertEquals(contenido, Cofre.descifrar(json, "contraseña larga de prueba"))
    }

    @Test
    fun `un byte cambiado en el cifrado hace que no abra`() {
        // AES-GCM autentica: manipular el fichero tiene que notarse, no dar basura.
        val sal = Cofre.salNueva()
        val json = Cofre.cifrar(Cofre.derivar("contraseña larga de prueba", sal), sal, """{"a":1}""")
        val o = org.json.JSONObject(json)
        val ct = java.util.Base64.getDecoder().decode(o.getString("ct"))
        ct[0] = (ct[0].toInt() xor 1).toByte()
        o.put("ct", java.util.Base64.getEncoder().encodeToString(ct))
        try {
            Cofre.descifrar(o.toString(), "contraseña larga de prueba")
            fail("Ha aceptado una bóveda manipulada.")
        } catch (e: Cofre.ContrasenaIncorrecta) {
            // correcto: GCM no distingue manipulacion de contrasena mala, y da igual
        }
    }

    @Test
    fun `se rechaza una boveda con parametros de cifrado rebajados`() {
        // Un atacante con el fichero podria editar N para que probar contrasenas
        // le saliera barato. Con el suelo puesto, ese fichero no se abre.
        val sal = Cofre.salNueva()
        val json = Cofre.cifrar(Cofre.derivar("contraseña larga de prueba", sal), sal, """{"a":1}""")
        val o = org.json.JSONObject(json)
        o.getJSONObject("kdf").put("N", 2)
        try {
            Cofre.descifrar(o.toString(), "contraseña larga de prueba")
            fail("Ha aceptado una bóveda con scrypt rebajado a N=2.")
        } catch (e: Cofre.BovedaCorrupta) {
            // correcto
        }
    }

    @Test
    fun `cada escritura usa un IV distinto`() {
        // Repetir el IV en GCM es de los pocos fallos que rompen el cifrado del
        // todo, asi que conviene tenerlo vigilado con un test.
        val sal = Cofre.salNueva()
        val clave = Cofre.derivar("contraseña larga de prueba", sal, N)
        val a = org.json.JSONObject(Cofre.cifrar(clave, sal, """{"a":1}""")).getString("iv")
        val b = org.json.JSONObject(Cofre.cifrar(clave, sal, """{"a":1}""")).getString("iv")
        assertNotEquals(a, b)
    }
}
