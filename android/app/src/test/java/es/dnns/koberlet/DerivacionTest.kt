// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * La prueba que decide si el plugin sirve o no sirve.
 *
 * La derivacion se ha reescrito en Kotlin para que la semilla no salga nunca al
 * WebView. Eso solo vale si da EXACTAMENTE las mismas cuentas que las carteras de
 * siempre: si se desviara aunque fuera un bit, el dueño metiera su semilla de
 * eckoWallet y le apareceria una cuenta vacia que no es la suya, con su dinero
 * "perdido" (en realidad en la cuenta buena, inalcanzable desde aqui).
 *
 * Los vectores son publicos y ya estaban comprobados en el aparato con la pagina
 * de la Fase 0, que usa @kadena/hd-wallet y ethers: son la referencia.
 *
 * Esto corre en el ordenador con `gradlew test`, sin movil ni emulador.
 */
class DerivacionTest {

    // Semilla de los vectores publicos de BIP-39. No es de nadie: existe en todos
    // los manuales del estandar y no custodia nada.
    private val SEMILLA = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

    @Test
    fun `la semilla de prueba da la seed BIP-39 conocida`() {
        // Vector publico de BIP-39 con contrasena de semilla vacia.
        assertEquals(
            "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4",
            Derivacion.aHex(Derivacion.semillaABytes(SEMILLA)),
        )
    }

    @Test
    fun `la cuenta Kadena coincide con Chainweaver y eckoWallet`() {
        // Comprobado en el movil el 11-09-2026 con @kadena/hd-wallet (pagina Fase 0).
        assertEquals(
            "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d",
            Derivacion.cuentaKadena(Derivacion.semillaABytes(SEMILLA), 0),
        )
    }

    @Test
    fun `la direccion EVM coincide con MetaMask, con las mayusculas EIP-55`() {
        // Las mayusculas no son estetica: son la suma de verificacion del estandar.
        assertEquals(
            "0x9858EfFD232B4033E47d90003D41EC34EcaEda94",
            Derivacion.direccionEvm(Derivacion.privadaEvm(Derivacion.semillaABytes(SEMILLA), 0)),
        )
    }

    @Test
    fun `la entropia a cero da la semilla de los manuales`() {
        assertEquals(SEMILLA, Derivacion.entropiaAPalabras(ByteArray(16)))
    }

    @Test
    fun `una semilla generada es valida y tiene doce palabras`() {
        val s = Derivacion.generarSemilla()
        assertEquals(12, s.split(" ").size)
        assertTrue(Derivacion.semillaValida(s))
    }

    @Test
    fun `dos semillas seguidas nunca son iguales`() {
        assertFalse(Derivacion.generarSemilla() == Derivacion.generarSemilla())
    }

    @Test
    fun `se rechaza una semilla con una palabra cambiada`() {
        // Este es el caso de verdad peligroso: 12 palabras validas pero con el
        // control mal. Sin comprobarlo, se derivarian cuentas distintas en
        // silencio y el dueño creeria que ha perdido el dinero.
        assertTrue(Derivacion.semillaValida(SEMILLA))
        assertFalse(Derivacion.semillaValida(SEMILLA.replace("about", "zoo")))
        assertFalse(Derivacion.semillaValida(SEMILLA.replace("about", "koberlet")))
        assertFalse(Derivacion.semillaValida("abandon abandon"))
    }

    @Test
    fun `indices distintos dan cuentas distintas`() {
        val seed = Derivacion.semillaABytes(SEMILLA)
        assertFalse(Derivacion.cuentaKadena(seed, 0) == Derivacion.cuentaKadena(seed, 1))
    }
}
