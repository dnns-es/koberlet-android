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
 * La firma se comprueba contra los MISMOS vectores que la pagina de la Fase 0 dio
 * en el movil con tweetnacl y blakejs. Si Kotlin firma igual que aquello, firma
 * igual que el Koberlet de escritorio y que cualquier cartera Kadena.
 */
class FirmaKdaTest {

    @Test
    fun `el hash blake2b coincide con el de la pagina de pruebas`() {
        // Vector obtenido en el aparato el 11-09-2026 con blakejs.
        assertEquals(
            "VnSuKqh-3iJgoT_LuaM89KrGF3oXhO1sAucRS1ipYfM",
            FirmaKda.aBase64Url(FirmaKda.hashComando("""{"prueba":"koberlet-android"}""")),
        )
    }

    @Test
    fun `la clave publica de la semilla de ceros es la conocida`() {
        // Mismo par de claves de juguete que usa la pagina de la Fase 0.
        assertEquals(
            "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29",
            Derivacion.publicaKadena(ByteArray(32)),
        )
    }

    @Test
    fun `la firma se verifica y una manipulada no`() {
        val privada = ByteArray(32)
        val hash = FirmaKda.hashComando("""{"prueba":"koberlet-android"}""")
        val firma = FirmaKda.firmar(privada, hash)
        assertEquals(128, firma.length)          // 64 bytes en hexadecimal

        val v = org.bouncycastle.crypto.signers.Ed25519Signer()
        val pub = org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters(privada, 0).generatePublicKey()
        v.init(false, pub)
        v.update(hash, 0, hash.size)
        val bytes = firma.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        assertTrue(v.verifySignature(bytes))

        // Control negativo: con un byte cambiado la verificacion TIENE que fallar.
        bytes[0] = (bytes[0].toInt() xor 1).toByte()
        val v2 = org.bouncycastle.crypto.signers.Ed25519Signer()
        v2.init(false, pub)
        v2.update(hash, 0, hash.size)
        assertFalse(v2.verifySignature(bytes))
    }

    @Test
    fun `el comando de envio es JSON valido y su hash corresponde al texto`() {
        val r = comandoDePrueba("k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d")
        val cmd = r.getString("cmd")

        // Que sea JSON valido no es evidente: el codigo Pact va escapado dentro y
        // el keyset no, y es justo donde es facil equivocarse.
        val o = JSONObject(cmd)
        assertEquals("mainnet01", o.getString("networkId"))

        // El hash tiene que ser el del texto EXACTO que se manda, no el de una
        // version reconstruida: si no, la firma no vale.
        assertEquals(r.getString("hash"), FirmaKda.aBase64Url(FirmaKda.hashComando(cmd)))
    }

    @Test
    fun `a una cuenta k se usa transfer-create y el keyset sale de la propia cuenta`() {
        val destino = "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d"
        val o = JSONObject(comandoDePrueba(destino).getString("cmd"))
        val exec = o.getJSONObject("payload").getJSONObject("exec")
        assertTrue(exec.getString("code").contains("coin.transfer-create"))
        assertEquals(
            destino.substring(2),
            exec.getJSONObject("data").getJSONObject("ks").getJSONArray("keys").getString(0),
        )
    }

    @Test
    fun `la capability lleva el destinatario y el importe exactos`() {
        // Esto es lo que impide que una firma sirva para mover otra cantidad u otro
        // destino: la capability firmada los fija.
        val destino = "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d"
        val o = JSONObject(comandoDePrueba(destino).getString("cmd"))
        val clist = o.getJSONArray("signers").getJSONObject(0).getJSONArray("clist")
        val transfer = clist.getJSONObject(1)
        assertEquals("coin.TRANSFER", transfer.getString("name"))
        assertEquals(destino, transfer.getJSONArray("args").getString(1))
        assertEquals("1.500000000000", transfer.getJSONArray("args").getJSONObject(2).getString("decimal"))
    }

    @Test
    fun `el importe se escribe igual en el codigo y en la capability`() {
        // Hallazgo #8 de la auditoria de Alex: "1e-7" en un sitio y
        // "0.000000100000" en el otro hacen que el nodo tumbe la transaccion.
        val o = JSONObject(comandoDePrueba(
            "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d",
            0.0000001,
        ).getString("cmd"))
        val codigo = o.getJSONObject("payload").getJSONObject("exec").getString("code")
        val enCap = o.getJSONArray("signers").getJSONObject(0).getJSONArray("clist")
            .getJSONObject(1).getJSONArray("args").getJSONObject(2).getString("decimal")
        assertTrue(codigo.contains(enCap))
        assertEquals("0.000000100000", enCap)
    }

    @Test
    fun `se rechazan las cuentas invalidas antes de firmar`() {
        assertTrue(FirmaKda.cuentaValida("k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d"))
        assertTrue(FirmaKda.cuentaValida("cuenta-antigua-con-nombre"))
        assertTrue(FirmaKda.cuentaValida("c:HZ7wYjxK5T4JmY_5BUn1pUXkxaXKrX9JVqTMDRDrwQY"))
        assertFalse(FirmaKda.cuentaValida("k:60ec71ef"))                       // k: mal formada
        assertFalse(FirmaKda.cuentaValida("x:loquesea"))                       // prefijo inventado
        assertFalse(FirmaKda.cuentaValida("""cuenta" (coin.transfer "a" "b" 999.0) """"))  // intento de colarse en el codigo Pact
        assertFalse(FirmaKda.cuentaValida("ab"))                               // demasiado corta
    }

    @Test
    fun `no se firma una cantidad de cero o negativa`() {
        for (mala in listOf(0.0, -1.0)) {
            try {
                comandoDePrueba("k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d", mala)
                fail("Ha firmado un envío de $mala KDA.")
            } catch (e: IllegalArgumentException) {
                // correcto
            }
        }
    }

    // --- Gestion de planes DCA ----------------------------------------------
    //
    // El id del plan se mete DENTRO del codigo Pact entre comillas. Si se colara
    // uno con comillas o parentesis, se estaria escribiendo Pact desde fuera: por
    // eso se prueba lo que se rechaza, no solo lo que se acepta.

    @Test
    fun `un id de plan con comillas, parentesis o espacios no se firma`() {
        val owner = "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d"
        val malos = listOf(
            "k:60ec71ef\" (coin.transfer \"a\" \"b\" 1.0) \"",
            "k:60ec71ef(x)",
            "k:60ec71ef con espacio",
            "k:60ec71ef\\barra",
            "otro-dueño-1789",                       // no empieza por el dueño
            "k:60ec71ef" + "x".repeat(80),           // demasiado largo
        )
        for (id in malos) {
            assertFalse("Ha dado por bueno el id: " + id, FirmaKda.idPlanValido(id, owner))
        }
        assertTrue(FirmaKda.idPlanValido("k:60ec71ef-1789016588825", owner))
    }

    @Test
    fun `parar un plan se firma sin clist y recargar con el TRANSFER exacto`() {
        val privada = Derivacion.privadaKadena(
            Derivacion.semillaABytes("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"), 0)
        val publica = Derivacion.publicaKadena(privada)
        val owner = "k:" + publica
        val id = owner.take(10) + "-1789016588825"

        val parar = FirmaKda.gestionarPlanDca(
            networkId = "mainnet01", accion = "pausar", id = id, owner = owner,
            cantidad = 0.0, entraEsUsdc = false, privada = privada, publica = publica,
            creationTime = 1789000000L,
        ).getString("cmd")
        assertTrue(parar.contains("pause-plan"))
        // Sin clist: una firma acotada no satisface el enforce-guard del contrato.
        assertFalse(parar.contains("clist"))

        val recarga = FirmaKda.gestionarPlanDca(
            networkId = "mainnet01", accion = "recargar", id = id, owner = owner,
            cantidad = 2.5, entraEsUsdc = false, privada = privada, publica = publica,
            creationTime = 1789000000L,
        ).getString("cmd")
        assertTrue(recarga.contains("topup"))
        assertTrue(recarga.contains("coin.TRANSFER"))
        assertTrue(recarga.contains("c:QiDAEP0E7hUoDWWxntmLK5LKvAeJm1SHJMAWcBmOZM8"))
        assertTrue(recarga.contains("2.500000000000"))
    }

    // --- Puente: Kadena -> Ethereum -----------------------------------------

    @Test
    fun `el destinatario del cable son los 20 bytes de la direccion alineados a la derecha`() {
        // Vector calculado con la misma regla que `destinoEvm` de lib/puente.js, que
        // es la que confirmo un desarrollador del nucleo del fork. Si esto cambia,
        // el token se queda bloqueado en Ethereum y NO se recupera.
        val rec = FirmaKda.destinoEvm("0x9858EfFD232B4033E47d90003D41EC34EcaEda94")
        val bytes = java.util.Base64.getUrlDecoder().decode(rec)
        assertEquals(32, bytes.size)
        // Los 12 primeros bytes son cero: la direccion va pegada a la derecha.
        for (i in 0 until 12) assertEquals(0, bytes[i].toInt())
        assertEquals("9858effd232b4033e47d90003d41ec34ecaeda94", Derivacion.aHex(bytes.copyOfRange(12, 32)))
        // Da igual como venga escrita: lo que viaja es la misma direccion.
        assertEquals(rec, FirmaKda.destinoEvm("9858effd232b4033e47d90003d41ec34ecaeda94"))
    }

    @Test
    fun `una direccion de Ethereum mal formada no llega a firmarse`() {
        for (mala in listOf("0x123", "", "0xZZ58EfFD232B4033E47d90003D41EC34EcaEda94",
                            "0x9858EfFD232B4033E47d90003D41EC34EcaEda9", "k:abc")) {
            try {
                FirmaKda.destinoEvm(mala)
                fail("Se aceptó una dirección inválida: $mala")
            } catch (_: IllegalArgumentException) { /* es lo que tiene que pasar */ }
        }
    }

    @Test
    fun `el envio por el puente lleva las tres capabilities y el dominio va tipado`() {
        val cmd = puenteDePrueba().getString("cmd")
        val o = JSONObject(cmd)                       // JSON valido pese al codigo escapado
        assertEquals("2", o.getJSONObject("meta").getString("chainId"))

        assertTrue(cmd.contains("mailbox.dispatch"))
        assertTrue(cmd.contains("n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC"))
        assertTrue(cmd.contains("coin.GAS"))
        assertTrue(cmd.contains("TRANSFER_REMOTE"))
        assertTrue(cmd.contains("coin.TRANSFER"))

        // El detalle que costo un rato en el escritorio: el dominio va como entero.
        // Escrito a pelo el nodo lo lee como decimal y responde "Keyset failure".
        assertTrue(cmd.contains("""{"int":1}"""))
    }

    @Test
    fun `por el puente el importe se escribe igual en el codigo y en la capability`() {
        // Hallazgo 8 de la auditoria de Alex, aplicado tambien aqui.
        val cmd = puenteDePrueba(cantidad = 0.0000001).getString("cmd")
        assertFalse(cmd.contains("1e-7"))
        assertTrue(cmd.contains("0.000000100000"))
    }

    @Test
    fun `el peaje se acota y una cuenta de peaje rara no se firma`() {
        // Un nodo manipulado podria inflar el peaje: es el unico numero de fuera que
        // acaba en una capability que mueve KDA.
        try {
            puenteDePrueba(peaje = 5000.0)
            fail("Se firmó un peaje desorbitado.")
        } catch (_: IllegalArgumentException) { }

        try {
            puenteDePrueba(cuentaPeaje = """malo" (coin.transfer "x""")
            fail("Se firmó una cuenta de peaje con comillas dentro.")
        } catch (_: IllegalArgumentException) { }

        // El tope que se firma lleva el 5% de margen sobre lo cotizado, ni un céntimo más.
        val cmd = puenteDePrueba(peaje = 40.0).getString("cmd")
        assertTrue(cmd.contains("42.000000000000"))
    }

    @Test
    fun `no se firma un envio por el puente de cero o negativo`() {
        for (mala in listOf(0.0, -1.0)) {
            try {
                puenteDePrueba(cantidad = mala)
                fail("Se firmó una cantidad $mala")
            } catch (_: IllegalArgumentException) { }
        }
    }

    private fun puenteDePrueba(
        cantidad: Double = 20.0,
        peaje: Double = 57.66,
        cuentaPeaje: String = "k:f5f4e5e0e2e3b1a9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5",
    ): JSONObject {
        val privada = Derivacion.privadaKadena(
            Derivacion.semillaABytes("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"), 0)
        return FirmaKda.envioPuenteEvm(
            networkId = "mainnet01",
            de = "k:" + Derivacion.publicaKadena(privada),
            destinoEth = "0x9858EfFD232B4033E47d90003D41EC34EcaEda94",
            cantidad = cantidad,
            peaje = peaje,
            cuentaPeaje = cuentaPeaje,
            privada = privada,
            publica = Derivacion.publicaKadena(privada),
            creationTime = 1789000000L,
        )
    }

    private fun comandoDePrueba(destino: String, cantidad: Double = 1.5): JSONObject {
        val privada = Derivacion.privadaKadena(
            Derivacion.semillaABytes("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"), 0)
        return FirmaKda.envioKda(
            networkId = "mainnet01",
            chain = "2",
            de = "k:" + Derivacion.publicaKadena(privada),
            para = destino,
            cantidad = cantidad,
            privada = privada,
            publica = Derivacion.publicaKadena(privada),
            creationTime = 1789000000L,
        )
    }
}
