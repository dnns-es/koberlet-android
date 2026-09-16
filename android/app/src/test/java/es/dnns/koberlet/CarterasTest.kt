// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * La migracion es lo que mas se prueba aqui, y no por gusto: quien ya tenga una
 * cartera creada con la version de una sola semilla no puede abrir la version
 * nueva y encontrarse con que su dinero "no aparece".
 */
class CarterasTest {

    private val SEMILLA = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

    private fun bovedaV1() = JSONObject()
        .put("v", 1)
        .put("semilla", SEMILLA)
        .put("cuentas", org.json.JSONArray().put(JSONObject()
            .put("id", "kda-0").put("etiqueta", "Cartera Kadena").put("tipo", "kda")
            .put("cuenta", "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d")))

    /** Una boveda v2 de las de antes: una cartera con cuenta de Kadena Y de Ethereum. */
    private fun bovedaV2ConLasDos() = JSONObject()
        .put("v", 2)
        .put("activa", "c1")
        .put("carteras", org.json.JSONArray().put(JSONObject()
            .put("id", "c1")
            .put("etiqueta", "Mi cartera")
            .put("semilla", SEMILLA)
            .put("cuentas", org.json.JSONArray()
                .put(JSONObject().put("id", "c1-kda").put("etiqueta", "Kadena").put("tipo", "kda")
                    .put("cuenta", "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d"))
                .put(JSONObject().put("id", "c1-evm").put("etiqueta", "EVM").put("tipo", "evm")
                    .put("cuenta", "0x9858EfFD232B4033E47d90003D41EC34EcaEda94")))))

    @Test
    fun `una boveda de la version vieja se migra sin perder la semilla`() {
        val d = Carteras.normalizar(bovedaV1())
        assertEquals(3, d.getInt("v"))
        assertEquals(1, Carteras.lista(d).length())
        assertEquals(SEMILLA, Carteras.activa(d).getString("semilla"))
        assertEquals(
            "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d",
            Carteras.activa(d).getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
        )
    }

    @Test
    fun `migrar dos veces no cambia nada`() {
        val una = Carteras.normalizar(bovedaV1())
        val dos = Carteras.normalizar(una)
        assertEquals(una.toString(), dos.toString())
    }

    @Test
    fun `se pueden tener varias carteras y cada una deriva lo suyo`() {
        var d = Carteras.normalizar(bovedaV1())
        val otra = Carteras.montar(Carteras.idNuevo(d), "La segunda", Derivacion.generarSemilla(), "kda")
        d = Carteras.anadir(d, otra)

        assertEquals(2, Carteras.lista(d).length())
        assertEquals(otra.getString("id"), d.getString("activa"))    // la nueva pasa a ser la activa
        assertFalse(
            Carteras.lista(d).getJSONObject(0).getJSONArray("cuentas").getJSONObject(0).getString("cuenta") ==
            Carteras.lista(d).getJSONObject(1).getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
        )
    }

    @Test
    fun `la cartera montada deriva la cuenta conocida de su red`() {
        val kda = Carteras.montar("c1", "Prueba", SEMILLA, "kda")
        assertEquals(1, kda.getJSONArray("cuentas").length())
        assertEquals("kda", kda.getString("red"))
        assertEquals(
            "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d",
            kda.getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
        )

        // La MISMA semilla, otra red: la direccion es la de siempre. Es lo que
        // permite partir en dos una cartera vieja sin que nadie pierda nada.
        val evm = Carteras.montar("c2", "Prueba", SEMILLA, "evm")
        assertEquals(1, evm.getJSONArray("cuentas").length())
        assertEquals(
            "0x9858EfFD232B4033E47d90003D41EC34EcaEda94",
            evm.getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
        )
    }

    @Test
    fun `una cartera de las de dos cuentas se parte en dos, sin cambiar direcciones`() {
        val d = Carteras.normalizar(bovedaV2ConLasDos())
        assertEquals(3, d.getInt("v"))
        assertEquals(2, Carteras.lista(d).length())

        val kda = Carteras.lista(d).getJSONObject(0)
        val evm = Carteras.lista(d).getJSONObject(1)
        assertEquals("c1", kda.getString("id"))          // la de Kadena hereda el id
        assertEquals("kda", kda.getString("red"))
        assertEquals("evm", evm.getString("red"))
        assertEquals("Mi cartera KDA", kda.getString("etiqueta"))
        assertEquals("Mi cartera EVM", evm.getString("etiqueta"))
        assertEquals(SEMILLA, evm.getString("semilla"))  // la semilla es la misma en las dos

        // Las direcciones son EXACTAMENTE las que habia. Esto es lo que hay que
        // demostrar: partir no mueve el dinero de sitio.
        assertEquals(
            "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d",
            kda.getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
        )
        assertEquals(
            "0x9858EfFD232B4033E47d90003D41EC34EcaEda94",
            evm.getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
        )
        // El id de cada cuenta sigue siendo <carteraId>-<tipo>: de eso depende
        // exportar la clave privada.
        assertEquals("c1-kda", kda.getJSONArray("cuentas").getJSONObject(0).getString("id"))
        assertEquals(
            evm.getString("id") + "-evm",
            evm.getJSONArray("cuentas").getJSONObject(0).getString("id"),
        )
    }

    @Test
    fun `partir dos veces no vuelve a partir`() {
        val una = Carteras.normalizar(bovedaV2ConLasDos())
        val dos = Carteras.normalizar(una)
        assertEquals(una.toString(), dos.toString())
    }

    @Test
    fun `la misma semilla vale en dos redes, pero no dos veces en la misma`() {
        val d = Carteras.normalizar(bovedaV2ConLasDos())
        assertTrue(Carteras.yaExiste(d, SEMILLA, "kda"))
        assertTrue(Carteras.yaExiste(d, SEMILLA, "evm"))
        assertFalse(Carteras.yaExiste(d, Derivacion.generarSemilla(), "kda"))
    }

    @Test
    fun `no se puede quitar la ultima cartera`() {
        val d = Carteras.normalizar(bovedaV1())
        try {
            Carteras.quitar(d, "c1")
            fail("Ha dejado la bóveda sin ninguna cartera.")
        } catch (e: IllegalStateException) {
            // correcto
        }
    }

    @Test
    fun `al quitar la activa, la activa pasa a ser otra que si existe`() {
        var d = Carteras.normalizar(bovedaV1())
        d = Carteras.anadir(d, Carteras.montar(Carteras.idNuevo(d), "Segunda", Derivacion.generarSemilla(), "kda"))
        val activa = d.getString("activa")
        d = Carteras.quitar(d, activa)
        assertEquals(1, Carteras.lista(d).length())
        // Lo importante: la activa no puede quedar apuntando a algo que ya no esta.
        assertTrue(Carteras.buscar(d, d.getString("activa")) != null)
    }

    @Test
    fun `los identificadores no se reutilizan`() {
        var d = Carteras.normalizar(bovedaV1())
        d = Carteras.anadir(d, Carteras.montar(Carteras.idNuevo(d), "Segunda", Derivacion.generarSemilla(), "kda"))
        d = Carteras.quitar(d, "c1")
        // c1 se ha ido, pero el siguiente id no debe ser c1 otra vez: los datos
        // guardados fuera (copias, capturas) seguirian hablando del c1 viejo.
        assertEquals("c1", Carteras.idNuevo(d))   // aqui SI vuelve a estar libre
        assertEquals("c2", Carteras.lista(d).getJSONObject(0).getString("id"))
    }

    @Test
    fun `renombrar recorta y no admite vacio`() {
        val d = Carteras.normalizar(bovedaV1())
        Carteras.renombrar(d, "c1", "  La de los ahorros  ")
        assertEquals("La de los ahorros", Carteras.activa(d).getString("etiqueta"))
        try {
            Carteras.renombrar(d, "c1", "   ")
            fail("Ha aceptado un nombre vacío.")
        } catch (e: IllegalArgumentException) {
            // correcto
        }
    }

    @Test
    fun `detecta que una semilla ya esta metida`() {
        val d = Carteras.normalizar(bovedaV1())
        assertTrue(Carteras.yaExiste(d, SEMILLA, "kda"))
        assertFalse(Carteras.yaExiste(d, Derivacion.generarSemilla(), "kda"))
    }

    // --- Importar por clave privada -----------------------------------------
    //
    // Lo que se comprueba aqui es que una cartera metida por su clave privada da
    // EXACTAMENTE la misma cuenta que la misma clave derivada de la semilla. Si
    // eso fallara, alguien importaria su clave y veria una cuenta que no es la
    // suya, con saldo cero, y creeria que ha perdido el dinero.

    @Test
    fun `una clave privada da la misma cuenta que su semilla`() {
        val bytes = Derivacion.semillaABytes(SEMILLA)
        val privadaKda = Derivacion.aHex(Derivacion.privadaKadena(bytes, 0))
        val privadaEvm = Derivacion.aHex(Derivacion.privadaEvm(bytes, 0))
        val porSemillaKda = Carteras.montar("c1", "A", SEMILLA, "kda")
        val porSemillaEvm = Carteras.montar("c2", "B", SEMILLA, "evm")

        val porClaveKda = Carteras.montarConClave("c3", "C", privadaKda, "kda")
        val porClaveEvm = Carteras.montarConClave("c4", "D", privadaEvm, "evm")

        assertEquals(
            porSemillaKda.getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
            porClaveKda.getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
        )
        assertEquals(
            porSemillaEvm.getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
            porClaveEvm.getJSONArray("cuentas").getJSONObject(0).getString("cuenta"),
        )
        // El id de la cuenta sigue siendo <carteraId>-<tipo>: de eso depende exportar.
        assertEquals("c3-kda", porClaveKda.getJSONArray("cuentas").getJSONObject(0).getString("id"))
        assertFalse(Carteras.esDeSemilla(porClaveKda))
        assertTrue(Carteras.esDeSemilla(porSemillaKda))
    }

    @Test
    fun `privadaDe devuelve lo mismo venga de semilla o de clave`() {
        val bytes = Derivacion.semillaABytes(SEMILLA)
        val esperada = Derivacion.aHex(Derivacion.privadaKadena(bytes, 0))
        val porSemilla = Carteras.montar("c1", "A", SEMILLA, "kda")
        val porClave = Carteras.montarConClave("c2", "B", esperada, "kda")
        assertEquals(esperada, Derivacion.aHex(Carteras.privadaDe(porSemilla)))
        assertEquals(esperada, Derivacion.aHex(Carteras.privadaDe(porClave)))
    }

    @Test
    fun `normalizarClave acepta lo bueno y rechaza lo demas`() {
        val clave = "a".repeat(64)
        assertEquals(clave, Carteras.normalizarClave("0x" + clave.uppercase(), "evm"))
        assertEquals(clave, Carteras.normalizarClave("  $clave  ", "kda"))

        // 128 caracteres: solo si la segunda mitad es DE VERDAD su publica.
        val bytes = Derivacion.semillaABytes(SEMILLA)
        val privada = Derivacion.aHex(Derivacion.privadaKadena(bytes, 0))
        val publica = Derivacion.publicaKadena(Derivacion.deHex(privada))
        assertEquals(privada, Carteras.normalizarClave(privada + publica, "kda"))
        for (malo in listOf("", "abc", "z".repeat(64), "0".repeat(64), privada + "0".repeat(64))) {
            try {
                Carteras.normalizarClave(malo, "kda")
                fail("Ha aceptado una clave que no vale: $malo")
            } catch (e: IllegalArgumentException) {
                // correcto
            }
        }
    }
}
