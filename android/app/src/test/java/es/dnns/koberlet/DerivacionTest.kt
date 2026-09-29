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
    fun `la cuenta Kadena coincide con eckoWallet`() {
        // Comprobado en el movil el 11-09-2026 con @kadena/hd-wallet (pagina Fase 0).
        // OJO: es la derivacion de eckoWallet y Koala, NO la de Chainweaver, que es
        // otra (abajo). Durante meses el comentario decia que eran la misma.
        assertEquals(
            "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d",
            Derivacion.cuentaKadena(Derivacion.semillaABytes(SEMILLA), 0),
        )
    }

    // --- Chainweaver ----------------------------------------------------------
    //
    // Vectores sacados el 29/09/2026 ejecutando @kadena/hd-wallet@0.6.2
    // (`@kadena/hd-wallet/chainweaver`, que es el WASM de la propia Chainweaver) en
    // node, con contrasena vacia y descifrando el resultado. Dos semillas publicas
    // y tres indices: si esto cuadra, la derivacion es la de Chainweaver y Linx.

    private val SEMILLA_MAMMAL = "mammal east oxygen romance wheel chimney frequent brain spawn owner announce sell"

    @Test
    fun `la derivacion Chainweaver da cuentas distintas de la de eckoWallet`() {
        val seed = Derivacion.semillaABytes(SEMILLA)
        assertFalse(Derivacion.cuentaKadena(seed, 0) == Derivacion.cuentaChainweaver(seed, 0))
    }

    @Test
    fun `las cuentas Chainweaver coinciden con el paquete oficial`() {
        val seed = Derivacion.semillaABytes(SEMILLA)
        assertEquals("k:2c6a7b0a7524e5e3fdbe5da0b561f67fbc69883a4e5fe4aacdffe0df88a66793", Derivacion.cuentaChainweaver(seed, 0))
        assertEquals("k:496df34a8987589a900f93fb91dd0857543555308bf23e11f38ceb2e99a9c4b9", Derivacion.cuentaChainweaver(seed, 1))
        assertEquals("k:e87a48fe68cc1924f814e271ac61125b2dca55346c8c29ac2bd127960b3f2ccc", Derivacion.cuentaChainweaver(seed, 2))

        val seed2 = Derivacion.semillaABytes(SEMILLA_MAMMAL)
        assertEquals("k:7eab1d324a565020417164335600f24f6d18619d6d49e6c1a13c629ce8f835a1", Derivacion.cuentaChainweaver(seed2, 0))
        assertEquals("k:83a185400b2fdaaacf44afe93e126ba528900ec66cd31a9e5b104ffe92d96976", Derivacion.cuentaChainweaver(seed2, 1))
    }

    @Test
    fun `la clave completa Chainweaver es byte a byte la del paquete oficial`() {
        // 128 bytes: privada extendida (64) + publica (32) + chain code (32). Es el
        // formato que exportan Chainweaver y Linx, y el que se acepta al importar.
        assertEquals(
            "500f853c39f4a02b43f80b8dca354e5288984dd1e3d7762867ce5e29d376f741" +
                "b05b80fd989a2dc76923cc99c16348ddfa955c4f2857aa8ab77f5a9688f1ce6d" +
                "2c6a7b0a7524e5e3fdbe5da0b561f67fbc69883a4e5fe4aacdffe0df88a66793" +
                "89f2d8ac3a083029b262b0f7e50b2f341c0b2365093c397427292168440270b0",
            Derivacion.aHex(Derivacion.claveCompletaChainweaver(Derivacion.semillaABytes(SEMILLA), 0)),
        )
        assertEquals(
            "f808a8fe7aeedfe1f4bb5bc6822ef18a5a9ba111358fe83298942b228739554b" +
                "a0932b7e98ca7bb531568e35652e25a71482f48f002cd8aa2746bd5066e3238f" +
                "83a185400b2fdaaacf44afe93e126ba528900ec66cd31a9e5b104ffe92d96976" +
                "20d2b56d37b951f5fad9f0a3d0c227313e924851a9d33de9681675c2b39eb4a8",
            Derivacion.aHex(Derivacion.claveCompletaChainweaver(Derivacion.semillaABytes(SEMILLA_MAMMAL), 1)),
        )
    }

    @Test
    fun `una firma hecha por la propia Chainweaver se verifica con la publica de aqui`() {
        // Del test del paquete oficial: firma del mensaje base64 "abc" con la
        // clave 1 de la semilla "mammal...". Si nuestra publica la verifica, la
        // publica es la suya, por una via independiente de la de arriba.
        val publica = Derivacion.deHex(Derivacion.cuentaChainweaver(Derivacion.semillaABytes(SEMILLA_MAMMAL), 1).removePrefix("k:"))
        val mensaje = java.util.Base64.getDecoder().decode("abc")
        val firma = Derivacion.deHex(
            "bedd0722d330f063266b4b72b2987856c9c7bc0f5f894eb490541441c59bf4c2" +
                "1dba3d35e5214050c90e727b16617c885cb74b2d3fbcd0ebb723f524c8679805",
        )
        val v = org.bouncycastle.crypto.signers.Ed25519Signer()
        v.init(false, org.bouncycastle.crypto.params.Ed25519PublicKeyParameters(publica, 0))
        v.update(mensaje, 0, mensaje.size)
        assertTrue(v.verifySignature(firma))
    }

    @Test
    fun `una clave extendida firma y cualquier Ed25519 normal lo verifica`() {
        val privada = Derivacion.privadaChainweaver(Derivacion.semillaABytes(SEMILLA), 0)
        assertEquals(64, privada.size)
        val publica = Derivacion.deHex(Derivacion.publicaKadena(privada))
        val hash = FirmaKda.hashComando("""{"prueba":"chainweaver"}""")
        val firma = Derivacion.deHex(FirmaKda.firmar(privada, hash))

        val v = org.bouncycastle.crypto.signers.Ed25519Signer()
        v.init(false, org.bouncycastle.crypto.params.Ed25519PublicKeyParameters(publica, 0))
        v.update(hash, 0, hash.size)
        assertTrue(v.verifySignature(firma))

        // Control negativo: manipulada, no vale.
        firma[5] = (firma[5].toInt() xor 1).toByte()
        val v2 = org.bouncycastle.crypto.signers.Ed25519Signer()
        v2.init(false, org.bouncycastle.crypto.params.Ed25519PublicKeyParameters(publica, 0))
        v2.update(hash, 0, hash.size)
        assertFalse(v2.verifySignature(firma))
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
    fun `las cuentas 2, 3 y 4 de MetaMask tambien coinciden`() {
        // Importar desde MetaMask no es solo traer la primera cuenta: quien tenga
        // varias en MetaMask espera encontrarlas todas aqui. Sus "Cuenta 2, 3, 4"
        // son los indices 1, 2 y 3 de la misma semilla.
        //
        // Las direcciones de referencia salen de ethers.js, que es una
        // implementacion independiente de la de este fichero: si las dos coinciden
        // a partir de la misma semilla, o las dos estan bien o las dos estan mal
        // igual, y eso ultimo no pasa con un estandar de 2017.
        val esperadas = listOf(
            1 to "0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0",
            2 to "0xb6716976A3ebe8D39aCEB04372f22Ff8e6802D7A",
            3 to "0xF3f50213C1d2e255e4B2bAD430F8A38EEF8D718E",
        )
        for ((indice, direccion) in esperadas) {
            assertEquals(
                direccion,
                Derivacion.direccionEvm(Derivacion.privadaEvm(Derivacion.semillaABytes(SEMILLA), indice)),
            )
        }
    }

    @Test
    fun `una semilla de 24 palabras deriva igual que una de 12`() {
        // MetaMask reparte semillas de 12, pero acepta y restaura las de 24, y hay
        // gente que llega con una de esas desde otra cartera. El numero de palabras
        // solo cambia cuanta entropia hay dentro; la derivacion es la misma.
        val larga = "abandon abandon abandon abandon abandon abandon abandon abandon " +
            "abandon abandon abandon abandon abandon abandon abandon abandon " +
            "abandon abandon abandon abandon abandon abandon abandon art"
        assertTrue(Derivacion.semillaValida(larga))
        assertEquals(
            "0xF278cF59F82eDcf871d630F28EcC8056f25C1cdb",
            Derivacion.direccionEvm(Derivacion.privadaEvm(Derivacion.semillaABytes(larga), 0)),
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
