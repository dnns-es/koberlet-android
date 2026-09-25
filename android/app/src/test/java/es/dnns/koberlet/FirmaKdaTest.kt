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

    // Claves de juguete de la frase de prueba de BIP39, las mismas del resto de
    // pruebas. Nunca una clave de verdad.
    private val privadaDca = Derivacion.privadaKadena(
        Derivacion.semillaABytes("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"), 0)
    private val publicaDca = Derivacion.publicaKadena(privadaDca)
    private val ownerDca = "k:$publicaDca"
    private val idDca = ownerDca.take(10) + "-1789016588825"

    private val custodiaDca2 = "c:QiDAEP0E7hUoDWWxntmLK5LKvAeJm1SHJMAWcBmOZM8"
    private val custodiaDca3 = "c:egWEeU7rKLxU57GgY8Y1ZBWv0_GFQww0DOj9CBlYgr8"
    private val kbEth = "n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-ETH"

    private fun gestion(accion: String, contrato: String, entra: String = "", cantidad: Double = 0.0, gratis: Boolean = false) =
        JSONObject(FirmaKda.gestionarPlanDca(
            networkId = "mainnet01", accion = accion, id = idDca, owner = ownerDca,
            cantidad = cantidad, contrato = contrato, entra = entra, privada = privadaDca, publica = publicaDca,
            creationTime = 1789000000L, gasLimit = if (gratis) 8000 else 20000, gratis = gratis,
        ).getString("cmd"))

    private fun crear(token: String, haciaToken: Boolean, deposito: Double, cuota: Double, gratis: Boolean = false) =
        JSONObject(FirmaKda.crearPlanDca(
            networkId = "mainnet01", owner = ownerDca, token = token, haciaToken = haciaToken,
            deposito = deposito, cuota = cuota, periodo = 3600, deslizamiento = 0.05,
            privada = privadaDca, publica = publicaDca, creationTime = 1789000000L,
            gasLimit = if (gratis) 8000 else 20000, gratis = gratis,
        ).getString("cmd"))

    private fun codigoDe(o: JSONObject) = o.getJSONObject("payload").getJSONObject("exec").getString("code")
    private fun transferDe(o: JSONObject) = o.getJSONArray("signers").getJSONObject(0).getJSONArray("clist").getJSONObject(1)
    private fun montoDe(o: JSONObject) = transferDe(o).getJSONArray("args").getJSONObject(2).getString("decimal")
    private fun custodiaDe(o: JSONObject) = transferDe(o).getJSONArray("args").getString(1)

    private fun rechaza(motivo: String, bloque: () -> Unit) {
        try {
            bloque()
            fail(motivo)
        } catch (e: IllegalArgumentException) {
            // correcto
        }
    }

    @Test
    fun `parar un plan se firma sin clist y recargar con el TRANSFER exacto`() {
        val parar = gestion("pausar", "dca2").toString()
        assertTrue(parar.contains("free.ksw-dca2.pause-plan"))
        // Sin clist: una firma acotada no satisface el enforce-guard del contrato.
        assertFalse(parar.contains("clist"))

        val recarga = gestion("recargar", "dca2", "KDA", 2.5)
        assertTrue(codigoDe(recarga).startsWith("(free.ksw-dca2.topup"))
        assertEquals("coin.TRANSFER", transferDe(recarga).getString("name"))
        assertEquals(custodiaDca2, custodiaDe(recarga))
        assertEquals("2.500000000000", montoDe(recarga))
    }

    @Test
    fun `un plan de kb-ETH va al dca3 con su custodia y el importe igual en codigo y capability`() {
        val o = crear("kb-ETH", haciaToken = false, deposito = 0.004, cuota = 0.0004)
        val codigo = codigoDe(o)
        assertTrue(codigo.startsWith("(free.ksw-dca3.create-plan"))
        assertTrue(codigo.contains(" $kbEth coin "))
        assertEquals("$kbEth.TRANSFER", transferDe(o).getString("name"))
        assertEquals(ownerDca, transferDe(o).getJSONArray("args").getString(0))
        assertEquals(custodiaDca3, custodiaDe(o))
        val dep = montoDe(o)
        assertEquals("0.004000000000", dep)
        // Hallazgo #8 de Alex: el mismo texto en el codigo y en la capability.
        assertTrue(codigo.contains(" $dep 0.000400000000 "))
        // El gas lo paga el dueño: el dca3 no va por la gasolinera.
        assertEquals(ownerDca, o.getJSONObject("meta").getString("sender"))
    }

    @Test
    fun `comprar FLUX o bro con KDA tambien va al dca3, y kb-USDC sigue en el dca2`() {
        val flux = crear("FLUX", haciaToken = true, deposito = 1000.0, cuota = 100.0)
        assertTrue(codigoDe(flux).startsWith("(free.ksw-dca3.create-plan"))
        assertTrue(codigoDe(flux).contains(" coin runonflux.flux "))
        assertEquals("coin.TRANSFER", transferDe(flux).getString("name"))
        assertEquals(custodiaDca3, custodiaDe(flux))

        val bro = crear("bro", haciaToken = false, deposito = 0.002, cuota = 0.0002)
        assertEquals("n_582fed11af00dc626812cd7890bb88e72067f28c.bro.TRANSFER", transferDe(bro).getString("name"))
        assertEquals(custodiaDca3, custodiaDe(bro))

        val usdc = crear("kb-USDC", haciaToken = false, deposito = 10.0, cuota = 1.0)
        assertTrue(codigoDe(usdc).startsWith("(free.ksw-dca2.create-plan"))
        assertEquals(custodiaDca2, custodiaDe(usdc))
        // kb-USDC admite 6 decimales: el importe va con 6, no con 12.
        assertEquals("10.000000", montoDe(usdc))
    }

    @Test
    fun `un token o un contrato que no estan en el mapa no se firman`() {
        rechaza("Ha firmado un plan con un token inventado.") { crear("PCO", true, 1000.0, 100.0) }
        rechaza("Ha firmado un plan con un modulo en vez de una clave.") { crear(kbEth, true, 1000.0, 100.0) }
        rechaza("Ha firmado un plan con KDA a los dos lados.") { crear("KDA", true, 1000.0, 100.0) }
        rechaza("Ha firmado sobre un contrato inventado.") { gestion("pausar", "free.ksw-dca3") }
        rechaza("Ha firmado sobre un contrato inventado.") { gestion("cerrar", "dca4") }
        rechaza("Ha recargado con un token inventado.") { gestion("recargar", "dca3", "PCO", 1.0) }
        // Un token de verdad, pero en el contrato que no es: tampoco.
        rechaza("Ha recargado kb-ETH en el dca2.") { gestion("recargar", "dca2", "kb-ETH", 1.0) }
        rechaza("Ha recargado kb-USDC en el dca3.") { gestion("recargar", "dca3", "kb-USDC", 1.0) }
    }

    @Test
    fun `la gasolinera no paga el dca3`() {
        rechaza("Ha firmado un plan de dca3 por la gasolinera.") { crear("kb-ETH", false, 0.004, 0.0004, gratis = true) }
        rechaza("Ha firmado una recarga de dca3 por la gasolinera.") { gestion("recargar", "dca3", "FLUX", 20.0, gratis = true) }
        // El dca2 sigue pudiendo ir por ella.
        val usdc = crear("kb-USDC", false, 10.0, 1.0, gratis = true)
        assertEquals(FirmaKda.GASOLINERA_CUENTA, usdc.getJSONObject("meta").getString("sender"))
        val recarga = gestion("recargar", "dca2", "kb-USDC", 5.0, gratis = true)
        assertEquals(FirmaKda.GASOLINERA_CUENTA, recarga.getJSONObject("meta").getString("sender"))
    }

    @Test
    fun `pausar, reanudar y cerrar un plan de dca3 van sin clist a su modulo`() {
        for ((accion, fn) in listOf("pausar" to "pause-plan", "reanudar" to "resume-plan", "cerrar" to "close-plan")) {
            val o = gestion(accion, "dca3")
            assertEquals("(free.ksw-dca3.$fn \"$idDca\")", codigoDe(o))
            assertFalse(o.getJSONArray("signers").getJSONObject(0).has("clist"))
        }
    }

    @Test
    fun `recargar un plan de dca3 lleva el TRANSFER de su token a la custodia del dca3`() {
        val o = gestion("recargar", "dca3", "kb-ETH", 0.0004)
        assertEquals("(free.ksw-dca3.topup \"$idDca\" 0.000400000000)", codigoDe(o))
        assertEquals("$kbEth.TRANSFER", transferDe(o).getString("name"))
        assertEquals(custodiaDca3, custodiaDe(o))
        assertEquals("0.000400000000", montoDe(o))

        // FLUX admite 8 decimales: con 12 el contrato tiraria la recarga.
        assertEquals("15.50000000", montoDe(gestion("recargar", "dca3", "FLUX", 15.5)))

        // Un bote de KDA en dca3 se recarga con coin.TRANSFER, tambien a la custodia del dca3.
        val kda = gestion("recargar", "dca3", "KDA", 100.0)
        assertEquals("coin.TRANSFER", transferDe(kda).getString("name"))
        assertEquals(custodiaDca3, custodiaDe(kda))
    }

    @Test
    fun `una cuota por debajo del minimo del contrato no se firma`() {
        rechaza("Ha firmado 0,0003 kb-ETH por compra.") { crear("kb-ETH", false, 0.003, 0.0003) }
        rechaza("Ha firmado 14 FLUX por compra.") { crear("FLUX", false, 140.0, 14.0) }
        rechaza("Ha firmado 0,0001 bro por compra.") { crear("bro", false, 0.001, 0.0001) }
        rechaza("Ha firmado 99 KDA por compra.") { crear("FLUX", true, 990.0, 99.0) }
        rechaza("Ha firmado 0,5 kb-USDC por compra.") { crear("kb-USDC", false, 5.0, 0.5) }
        // Justo en el minimo, si.
        crear("FLUX", false, 150.0, 15.0)
        crear("bro", false, 0.002, 0.0002)
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
