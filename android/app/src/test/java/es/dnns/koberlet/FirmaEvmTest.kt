package es.dnns.koberlet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.math.BigInteger

/**
 * PRUEBAS DE LA FIRMA DE ETHEREUM.
 *
 * Esto firma dinero, asi que aqui no vale «parece que funciona». Casi todo se
 * comprueba contra algo que existe fuera de este proyecto:
 *
 *   - RLP, contra los ejemplos del propio libro amarillo de Ethereum.
 *   - Los selectores, CALCULANDO el keccak de la firma de la funcion en vez de
 *     copiar cuatro bytes de un papel.
 *   - La firma, recuperando la direccion a partir de ella: si la firma o el
 *     recovery id estuvieran mal, saldria otra direccion, que es exactamente lo
 *     que le pasaria a la red.
 *   - La clave de ejemplo es la del EIP-155, que viene con su direccion publicada.
 */
class FirmaEvmTest {

    /** La privada del ejemplo del EIP-155, con direccion conocida. */
    private val privadaEjemplo = FirmaEvm.deHex(
        "4646464646464646464646464646464646464646464646464646464646464646")
    private val direccionEjemplo = "0x9d8a62f656a8d1615c1294fd71e9cfb3e4855a4f"

    private fun direccionDe(publicaSinPrefijo: ByteArray): String =
        "0x" + FirmaEvm.aHex(FirmaEvm.keccak256(publicaSinPrefijo).copyOfRange(12, 32))

    // --- RLP -----------------------------------------------------------------

    @Test
    fun `RLP, los ejemplos del libro amarillo`() {
        assertEquals("83646f67", FirmaEvm.aHex(FirmaEvm.rlpBytes("dog".toByteArray())))
        assertEquals("80", FirmaEvm.aHex(FirmaEvm.rlpBytes(ByteArray(0))))
        assertEquals("c0", FirmaEvm.aHex(FirmaEvm.rlpLista(emptyList())))
        assertEquals("00", FirmaEvm.aHex(FirmaEvm.rlpBytes(byteArrayOf(0))))
        assertEquals(
            "c88363617483646f67",
            FirmaEvm.aHex(FirmaEvm.rlpLista(listOf(
                FirmaEvm.rlpBytes("cat".toByteArray()),
                FirmaEvm.rlpBytes("dog".toByteArray()),
            ))),
        )
    }

    @Test
    fun `RLP, los enteros van sin ceros por delante y el cero es vacio`() {
        assertEquals("80", FirmaEvm.aHex(FirmaEvm.rlpEntero(0L)))
        assertEquals("0f", FirmaEvm.aHex(FirmaEvm.rlpEntero(15L)))
        assertEquals("820400", FirmaEvm.aHex(FirmaEvm.rlpEntero(1024L)))
        // BigInteger mete un 00 delante cuando el bit alto esta puesto: 128 no
        // puede salir como "8080" sino como "8180".
        assertEquals("8180", FirmaEvm.aHex(FirmaEvm.rlpEntero(128L)))
        assertEquals("81ff", FirmaEvm.aHex(FirmaEvm.rlpEntero(255L)))
    }

    @Test
    fun `RLP, las cosas largas llevan la longitud de la longitud`() {
        val largo = "Lorem ipsum dolor sit amet, consectetur adipisicing elit"   // 56
        assertEquals(56, largo.length)
        val hex = FirmaEvm.aHex(FirmaEvm.rlpBytes(largo.toByteArray()))
        assertTrue(hex.startsWith("b838"))
    }

    // --- Selectores ----------------------------------------------------------

    @Test
    fun `los selectores son el keccak de la firma de la funcion`() {
        val approve = FirmaEvm.aHex(
            FirmaEvm.keccak256("approve(address,uint256)".toByteArray())).substring(0, 8)
        assertEquals("095ea7b3", approve)

        val remoto = FirmaEvm.aHex(
            FirmaEvm.keccak256("transferRemote(uint32,bytes,uint256,uint16)".toByteArray())).substring(0, 8)
        assertEquals("80eefc06", remoto)

        val transfer = FirmaEvm.aHex(
            FirmaEvm.keccak256("transfer(address,uint256)".toByteArray())).substring(0, 8)
        assertEquals("a9059cbb", transfer)

        // Y los datos que se montan empiezan por ellos de verdad.
        assertTrue(FirmaEvm.aHex(FirmaEvm.datosPermiso(BigInteger.ONE)).startsWith("095ea7b3"))
        assertTrue(FirmaEvm.aHex(
            FirmaEvm.datosPuenteHaciaKadena("k:" + "ab".repeat(32), BigInteger.TEN),
        ).startsWith("80eefc06"))
    }

    // --- Firma ---------------------------------------------------------------

    @Test
    fun `la firma recupera la direccion que firmo`() {
        val hash = FirmaEvm.keccak256("lo que sea".toByteArray())
        val f = FirmaEvm.firmar(hash, privadaEjemplo)
        val publica = FirmaEvm.recuperarPublica(f.yParity, f.r, f.s, hash)
            ?: return fail("el recovery id no recupera ninguna clave")
        assertEquals(direccionEjemplo, direccionDe(publica.copyOfRange(1, publica.size)))
    }

    @Test
    fun `la firma es determinista y con la s baja`() {
        val hash = FirmaEvm.keccak256("dos veces lo mismo".toByteArray())
        val a = FirmaEvm.firmar(hash, privadaEjemplo)
        val b = FirmaEvm.firmar(hash, privadaEjemplo)
        assertEquals(a.r, b.r)
        assertEquals(a.s, b.s)
        assertEquals(a.yParity, b.yParity)

        // EIP-2: por encima de n/2 la red la rechaza.
        val n = BigInteger("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16)
        assertTrue(a.s <= n.shiftRight(1))
    }

    @Test
    fun `firmar otra cosa da otra firma`() {
        val uno = FirmaEvm.firmar(FirmaEvm.keccak256("uno".toByteArray()), privadaEjemplo)
        val otro = FirmaEvm.firmar(FirmaEvm.keccak256("otro".toByteArray()), privadaEjemplo)
        assertTrue(uno.r != otro.r)
    }

    // --- La transaccion ------------------------------------------------------

    @Test
    fun `la transaccion firmada es de tipo 2 y se puede volver a leer`() {
        val raw = FirmaEvm.transaccionFirmada(
            a = FirmaEvm.TOKEN_USDC,
            valorWei = BigInteger.ZERO,
            datos = FirmaEvm.datosPermiso(BigInteger.valueOf(5_000_000)),
            sobre = FirmaEvm.Sobre(
                nonce = 7,
                gasLimit = 60_000,
                maxFeePerGas = BigInteger("30000000000"),
                maxPriorityFeePerGas = BigInteger("1000000000"),
            ),
            privada = privadaEjemplo,
        )
        assertTrue(raw.startsWith("0x02"))

        // El chainId va el primero dentro de la lista, y es 1: si esto saliera con
        // otro numero, la firma valdria en OTRA cadena. Se comprueba mirando los
        // primeros bytes: 0x02, cabecera de lista larga (f8 xx o f9 xx xx) y luego
        // el chainId como entero de un byte.
        val cuerpo = raw.removePrefix("0x02")
        val prefijo = cuerpo.substring(0, 2).toInt(16)
        val saltar = when {
            prefijo <= 0xf7 -> 2                       // lista corta
            else -> 2 + (prefijo - 0xf7) * 2           // lista larga: tantos bytes de longitud
        }
        assertEquals("01", cuerpo.substring(saltar, saltar + 2))
    }

    /**
     * LA PRUEBA QUE DE VERDAD IMPORTA.
     *
     * Este `raw` no lo ha sacado este proyecto: lo firmo **ethers v6** -la libreria
     * que usa el monedero de escritorio y medio Ethereum- con la misma clave, el
     * mismo destino y los mismos numeros. Que salga byte a byte lo mismo quiere
     * decir que coinciden el RLP, el hash, la firma, la `s` canonica y el bit de
     * paridad, todo a la vez: si cualquiera de esas piezas estuviera mal, esta
     * cadena seria distinta.
     *
     * Reproducirlo:
     *   node -e "import('ethers').then(async({Wallet,Interface})=>{ ... })"
     * con la clave del EIP-155 y approve(router, 5000000) sobre el USDC.
     */
    @Test
    fun `clavada con lo que firma ethers`() {
        val raw = FirmaEvm.transaccionFirmada(
            a = FirmaEvm.TOKEN_USDC,
            valorWei = BigInteger.ZERO,
            datos = FirmaEvm.datosPermiso(BigInteger.valueOf(5_000_000)),
            sobre = FirmaEvm.Sobre(
                nonce = 7,
                gasLimit = 60_000,
                maxFeePerGas = BigInteger("30000000000"),
                maxPriorityFeePerGas = BigInteger("1000000000"),
            ),
            privada = privadaEjemplo,
        )
        assertEquals(
            "0x02f8b00107843b9aca008506fc23ac0082ea6094a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" +
                "80b844095ea7b300000000000000000000000081c2813aa88f66bca1e55838045aaceb72febfc1" +
                "00000000000000000000000000000000000000000000000000000000004c4b40c001a0b45b1faa" +
                "7d5e16f5e42163056dee307ed6f1821822aa6553a8c3d347f7c90624a00cf679c63e467f63bd50" +
                "a6fa2d75454bbe12f9e7a1fe30437a25ddc5ba368ca0",
            raw,
        )
    }

    @Test
    fun `la misma transaccion con otro nonce se firma distinto`() {
        fun raw(nonce: Long) = FirmaEvm.transaccionFirmada(
            FirmaEvm.TOKEN_USDC, BigInteger.ZERO, FirmaEvm.datosPermiso(BigInteger.ONE),
            FirmaEvm.Sobre(nonce, 60_000, BigInteger("30000000000"), BigInteger("1000000000")),
            privadaEjemplo,
        )
        assertTrue(raw(1) != raw(2))
    }

    // --- Lo que no se firma --------------------------------------------------

    @Test
    fun `no se firma con gas ni precios disparatados`() {
        val bien = FirmaEvm.Sobre(1, 60_000, BigInteger("30000000000"), BigInteger("1000000000"))
        for (malo in listOf(
            bien.copy(gasLimit = 5_000_000),                                  // pasa del tope
            bien.copy(gasLimit = 0),
            bien.copy(nonce = -1),
            bien.copy(maxFeePerGas = BigInteger("900000000000")),             // 900 gwei
            bien.copy(maxPriorityFeePerGas = BigInteger("40000000000")),      // propina > precio
        )) {
            try {
                FirmaEvm.transaccionFirmada(
                    FirmaEvm.TOKEN_USDC, BigInteger.ZERO,
                    FirmaEvm.datosPermiso(BigInteger.ONE), malo, privadaEjemplo,
                )
                fail("tendría que haber rechazado $malo")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `no se firma hacia una direccion mal escrita`() {
        for (mala in listOf("0x1234", "1234567890123456789012345678901234567890", "0x" + "z".repeat(40))) {
            try {
                FirmaEvm.transaccionFirmada(
                    mala, BigInteger.ZERO, FirmaEvm.datosPermiso(BigInteger.ONE),
                    FirmaEvm.Sobre(1, 60_000, BigInteger("30000000000"), BigInteger("1000000000")),
                    privadaEjemplo,
                )
                fail("tendría que haber rechazado «$mala»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `el peaje tiene tope`() {
        FirmaEvm.peajeComprobado(BigInteger("1000000000000000"))     // 0,001 ETH: pasa
        try {
            FirmaEvm.peajeComprobado(BigInteger("500000000000000000"))   // 0,5 ETH
            fail("un peaje de medio ETH no se puede firmar sin más")
        } catch (e: IllegalArgumentException) { /* eso se quería */ }
    }

    // --- El custodio, que es lo que bloquea el dinero si va mal ---------------

    @Test
    fun `el custodio es el keyset en JSON, exacto`() {
        val pk = "e595727b657fbbb3b8e362a05a7bb8d12865c1ff0a1b2c3d4e5f60718293a4b5"
        val esperado = "{\"pred\":\"keys-all\",\"keys\":[\"$pk\"]}"
        assertEquals(esperado, String(FirmaEvm.custodioDe("k:$pk"), Charsets.US_ASCII))
        // Con o sin el «k:» delante, lo mismo.
        assertEquals(esperado, String(FirmaEvm.custodioDe(pk), Charsets.US_ASCII))
    }

    @Test
    fun `una cuenta Kadena que no sea una clave publica no se acepta`() {
        for (mala in listOf("k:abc", "r:" + "ab".repeat(32), "", "k:" + "zz".repeat(32))) {
            try {
                FirmaEvm.custodioDe(mala)
                fail("tendría que haber rechazado «$mala»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `los datos del puente llevan cabecera, longitud y relleno`() {
        val pk = "ab".repeat(32)
        val datos = FirmaEvm.aHex(FirmaEvm.datosPuenteHaciaKadena("k:$pk", BigInteger.valueOf(5_250_000)))
        val custodio = FirmaEvm.custodioDe("k:$pk")

        var i = 8                                       // el selector
        assertEquals(BigInteger.valueOf(626), BigInteger(datos.substring(i, i + 64), 16)); i += 64
        assertEquals(BigInteger.valueOf(0x80), BigInteger(datos.substring(i, i + 64), 16)); i += 64
        assertEquals(BigInteger.valueOf(5_250_000), BigInteger(datos.substring(i, i + 64), 16)); i += 64
        assertEquals(BigInteger.valueOf(2), BigInteger(datos.substring(i, i + 64), 16)); i += 64
        assertEquals(BigInteger.valueOf(custodio.size.toLong()), BigInteger(datos.substring(i, i + 64), 16)); i += 64
        assertEquals(FirmaEvm.aHex(custodio), datos.substring(i, i + custodio.size * 2))

        // Y el total, relleno incluido, es multiplo de 32 bytes tras el selector.
        assertEquals(0, (datos.length - 8) % 64)
    }

    @Test
    fun `el permiso se da al router del puente y por la cantidad justa`() {
        val datos = FirmaEvm.aHex(FirmaEvm.datosPermiso(BigInteger.valueOf(20_000_000)))
        assertEquals(FirmaEvm.ROUTER.removePrefix("0x").lowercase(), datos.substring(8 + 24, 8 + 64))
        assertEquals(BigInteger.valueOf(20_000_000), BigInteger(datos.substring(8 + 64), 16))
    }

    // --- El envio normal: ETH suelto y ERC-20 --------------------------------

    @Test
    fun `el envio de un token lleva a quien y cuanto, cada uno en su palabra`() {
        val para = "0x1111111111111111111111111111111111111111"
        val datos = FirmaEvm.aHex(FirmaEvm.datosEnvioToken(para, BigInteger.valueOf(5_000_000)))
        assertTrue(datos.startsWith("a9059cbb"))
        assertEquals(para.removePrefix("0x"), datos.substring(8 + 24, 8 + 64))
        assertEquals(BigInteger.valueOf(5_000_000), BigInteger(datos.substring(8 + 64), 16))
        assertEquals(8 + 128, datos.length)
    }

    @Test
    fun `no se envia un token a una direccion mal escrita ni por cero`() {
        for (mala in listOf("0x1234", "0x" + "11".repeat(19), "")) {
            try {
                FirmaEvm.datosEnvioToken(mala, BigInteger.ONE)
                fail("tendría que haber rechazado «$mala»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
        try {
            FirmaEvm.datosEnvioToken("0x" + "11".repeat(20), BigInteger.ZERO)
            fail("un envío de cero no se firma")
        } catch (e: IllegalArgumentException) { /* eso se quería */ }
    }

    /**
     * Otra vez clavada con **ethers v6**, ahora para las dos formas de enviar: el
     * ETH suelto -que va como `value` y con el `data` vacio- y un ERC-20 con su
     * `transfer`. Son las dos que firma `firmarEnvioEvm`, y es dinero saliendo de
     * la cuenta de alguien: que coincidan byte a byte con lo que firma la libreria
     * que usa medio Ethereum es la unica comprobacion que vale.
     */
    @Test
    fun `el envio de ETH y el de USDC salen como los firma ethers`() {
        val sobre = FirmaEvm.Sobre(
            nonce = 7,
            gasLimit = 21_000,
            maxFeePerGas = BigInteger("30000000000"),
            maxPriorityFeePerGas = BigInteger("1000000000"),
        )
        val para = "0x1111111111111111111111111111111111111111"

        assertEquals(
            "0x02f8730107843b9aca008506fc23ac00825208941111111111111111111111111111111111111111" +
                "8803782dace9d9000080c080a01408daa4e7dbf6455012c52bcbfdff365e00ee123d9eba33413fec" +
                "7783a1b474a05802a535a039774a71a6b1e322a58b6aa16f477da61a9ff9c4abcfb2d82e0db9",
            FirmaEvm.transaccionFirmada(
                a = para,
                valorWei = FirmaEvm.aUnidades("0.25", 18),
                datos = ByteArray(0),
                sobre = sobre,
                privada = privadaEjemplo,
            ),
        )

        assertEquals(
            "0x02f8b00107843b9aca008506fc23ac0082ea6094a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" +
                "80b844a9059cbb000000000000000000000000111111111111111111111111111111111111111100" +
                "000000000000000000000000000000000000000000000000000000004c4b40c001a00257a5da39f6" +
                "5ae3d2e94ae986534302296f4c08de4ccd9f50121cda64f85430a02efa7c02f9967f67a9cc63f96b" +
                "d78ecd6bfc7da0f91b4729f7a34be04d97273f",
            FirmaEvm.transaccionFirmada(
                a = FirmaEvm.TOKEN_USDC,
                valorWei = BigInteger.ZERO,
                datos = FirmaEvm.datosEnvioToken(para, FirmaEvm.aUnidades("5", 6)),
                sobre = sobre.copy(gasLimit = 60_000),
                privada = privadaEjemplo,
            ),
        )
    }

    // --- Cantidades ----------------------------------------------------------

    @Test
    fun `las cantidades pasan a unidades sin coma flotante`() {
        assertEquals(BigInteger.valueOf(5_250_000), FirmaEvm.aUnidades("5.25", 6))
        assertEquals(BigInteger.valueOf(5_250_000), FirmaEvm.aUnidades("5,25", 6))
        assertEquals(BigInteger.valueOf(1), FirmaEvm.aUnidades("0.000001", 6))
        assertEquals(BigInteger("1000000000000000000"), FirmaEvm.aUnidades("1", 18))
    }

    @Test
    fun `no se aceptan cantidades imposibles`() {
        for (mala in listOf("0", "-1", "0.0000001", "", "cinco", "1e6", "0.0")) {
            try {
                FirmaEvm.aUnidades(mala, 6)
                fail("tendría que haber rechazado «$mala»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }
}
