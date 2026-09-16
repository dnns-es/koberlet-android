package es.dnns.koberlet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.math.BigInteger

/**
 * PRUEBAS DEL CAMBIO EN ETHEREUM.
 *
 * Igual que con la firma: lo que vale es contrastar contra algo de fuera. Los
 * `data` de este fichero se cotejan con lo que produce **ethers v6**, que es lo que
 * usa el monedero de escritorio y lo que ha hecho estos cambios de verdad.
 *
 * Reproducir los vectores:
 *   node -e "import('ethers').then(({Interface}) => { ... encodeFunctionData ... })"
 * con el router de Uniswap, USDC->WETH, comisión 500, 5 USDC y un mínimo de
 * 0,0012 ETH.
 */
class SwapEvmTest {

    private val cuenta = "0xDC1972770Cf114525E938f39Ce4959D26E9C7234"

    @Test
    fun `los selectores son el keccak de la firma de la funcion`() {
        fun sel(firma: String) =
            FirmaEvm.aHex(FirmaEvm.keccak256(firma.toByteArray())).substring(0, 8)

        assertEquals("04e45aaf", sel(
            "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))"))
        assertEquals("49404b7c", sel("unwrapWETH9(uint256,address)"))
        assertEquals("12210e8a", sel("refundETH()"))
        assertEquals("ac9650d8", sel("multicall(bytes[])"))
        // Las dos que reparten. Se calculan igual que las demás: un selector copiado
        // de cualquier sitio y mal, y el router no reconocería la llamada.
        assertEquals("9b2c0a37", sel("unwrapWETH9WithFee(uint256,address,uint256,address)"))
        assertEquals("e0e189a0", sel("sweepTokenWithFee(address,uint256,address,uint256,address)"))
    }

    @Test
    fun `exactInputSingle sale igual que con ethers`() {
        assertEquals(
            "04e45aaf000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" +
                "000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" +
                "00000000000000000000000000000000000000000000000000000000000001f4" +
                "0000000000000000000000000000000000000000000000000000000000000002" +
                "00000000000000000000000000000000000000000000000000000000004c4b40" +
                "0000000000000000000000000000000000000000000000000000000000000000" +
                "0000000000000000000000000000000000000000000000000000000000000000",
            SwapEvm.datosCambio(
                SwapEvm.USDC, SwapEvm.WETH, 500,
                "0x0000000000000000000000000000000000000002",
                BigInteger.valueOf(5_000_000), BigInteger.ZERO,
            ),
        )
    }

    @Test
    fun `unwrapWETH9 sale igual que con ethers`() {
        assertEquals(
            "49404b7c00000000000000000000000000000000000000000000000000044364c5bb0000" +
                "000000000000000000000000dc1972770cf114525e938f39ce4959d26e9c7234",
            SwapEvm.datosDesenvolver(BigInteger("1200000000000000"), cuenta),
        )
    }

    /**
     * LA PRUEBA GORDA: el multicall entero, que es donde esta la codificacion fea
     * del ABI -punteros relativos, longitudes y relleno-. Byte a byte con ethers.
     */
    @Test
    fun `el multicall de usdc a eth sale igual que con ethers`() {
        val c = SwapEvm.cambio(
            claveRuta = "usdc2eth",
            comision = 500,
            cuenta = cuenta,
            cantidadEntra = BigInteger.valueOf(5_000_000),
            salidaMinima = BigInteger("1200000000000000"),
        )
        assertEquals(BigInteger.ZERO, c.valorWei)
        // El segundo paso es `unwrapWETH9WithFee`: desenvuelve y reparte en la misma
        // llamada. Cotejado con ethers v6, incluidos los 50 bips y la cuenta que cobra.
        assertEquals(
                "ac9650d8" +
                    "0000000000000000000000000000000000000000000000000000000000000020" +
                    "0000000000000000000000000000000000000000000000000000000000000002" +
                    "0000000000000000000000000000000000000000000000000000000000000040" +
                    "0000000000000000000000000000000000000000000000000000000000000160" +
                    "00000000000000000000000000000000000000000000000000000000000000e4" +
                    "04e45aaf000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce" +
                    "3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead908" +
                    "3c756cc200000000000000000000000000000000000000000000000000000000" +
                    "000001f400000000000000000000000000000000000000000000000000000000" +
                    "0000000200000000000000000000000000000000000000000000000000000000" +
                    "004c4b4000000000000000000000000000000000000000000000000000000000" +
                    "0000000000000000000000000000000000000000000000000000000000000000" +
                    "0000000000000000000000000000000000000000000000000000000000000000" +
                    "0000000000000000000000000000000000000000000000000000000000000084" +
                    "9b2c0a3700000000000000000000000000000000000000000000000000044364" +
                    "c5bb0000000000000000000000000000dc1972770cf114525e938f39ce4959d2" +
                    "6e9c723400000000000000000000000000000000000000000000000000000000" +
                    "000000320000000000000000000000004a31148ad2bf0355c93bf7c9218bb723" +
                    "f15c901c00000000000000000000000000000000000000000000000000000000",
            FirmaEvm.aHex(c.datos),
        )
    }

    @Test
    fun `con ETH de entrada el dinero va en el value y se pide la devolucion`() {
        val c = SwapEvm.cambio(
            claveRuta = "eth2usdc", comision = 500, cuenta = cuenta,
            cantidadEntra = BigInteger("1000000000000000"),        // 0,001 ETH
            salidaMinima = BigInteger.valueOf(3_900_000),          // 3,9 USDC
        )
        // El ETH viaja como valor de la transacción, no como token.
        assertEquals(BigInteger("1000000000000000"), c.valorWei)
        val hex = FirmaEvm.aHex(c.datos)
        assertTrue(hex.startsWith("ac9650d8"))
        assertTrue("lleva refundETH", hex.contains("12210e8a"))
        // Y el suelo va DENTRO del cambio, que es lo que impide que te lo muevan.
        assertTrue(hex.contains(BigInteger.valueOf(3_900_000).toString(16).padStart(64, '0')))
    }

    @Test
    fun `token por token tambien reparte, cotejado con ethers`() {
        val c = SwapEvm.cambio(
            claveRuta = "usdt2usdc", comision = 100, cuenta = cuenta,
            cantidadEntra = BigInteger.valueOf(10_000_000),
            salidaMinima = BigInteger.valueOf(9_950_000),
        )
        assertEquals(BigInteger.ZERO, c.valorWei)
        // Antes esto era una sola llamada. Ahora son dos: el cambio deja el token en el
        // router y `sweepTokenWithFee` lo saca entero, repartido. No queda nada dentro.
        assertEquals(
                "ac9650d8" +
                    "0000000000000000000000000000000000000000000000000000000000000020" +
                    "0000000000000000000000000000000000000000000000000000000000000002" +
                    "0000000000000000000000000000000000000000000000000000000000000040" +
                    "0000000000000000000000000000000000000000000000000000000000000160" +
                    "00000000000000000000000000000000000000000000000000000000000000e4" +
                    "04e45aaf000000000000000000000000dac17f958d2ee523a2206206994597c1" +
                    "3d831ec7000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce" +
                    "3606eb4800000000000000000000000000000000000000000000000000000000" +
                    "0000006400000000000000000000000000000000000000000000000000000000" +
                    "0000000200000000000000000000000000000000000000000000000000000000" +
                    "0098968000000000000000000000000000000000000000000000000000000000" +
                    "0097d33000000000000000000000000000000000000000000000000000000000" +
                    "0000000000000000000000000000000000000000000000000000000000000000" +
                    "00000000000000000000000000000000000000000000000000000000000000a4" +
                    "e0e189a0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce" +
                    "3606eb4800000000000000000000000000000000000000000000000000000000" +
                    "0097d330000000000000000000000000dc1972770cf114525e938f39ce4959d2" +
                    "6e9c723400000000000000000000000000000000000000000000000000000000" +
                    "000000320000000000000000000000004a31148ad2bf0355c93bf7c9218bb723" +
                    "f15c901c00000000000000000000000000000000000000000000000000000000",
            FirmaEvm.aHex(c.datos),
        )
    }

    @Test
    fun `el suelo que se firma es el que se acepto, no otro`() {
        val suelo = BigInteger.valueOf(3_900_000)
        val c = SwapEvm.cambio("eth2usdc", 500, cuenta, BigInteger("1000000000000000"), suelo)
        val hex = FirmaEvm.aHex(c.datos)
        assertTrue(hex.contains(suelo.toString(16).padStart(64, '0')))
        // Con otro suelo, otro `data`: no hay forma de colar uno por otro.
        val otro = SwapEvm.cambio("eth2usdc", 500, cuenta, BigInteger("1000000000000000"),
            BigInteger.valueOf(1))
        assertTrue(FirmaEvm.aHex(otro.datos) != hex)
    }

    // --- Lo que no se acepta -------------------------------------------------

    @Test
    fun `una ruta que no existe no se firma`() {
        for (mala in listOf("usdc2dai", "eth2eth", "", "usdc2eth ", "cualquiera")) {
            try {
                SwapEvm.cambio(mala, 500, cuenta, BigInteger.TEN, BigInteger.ONE)
                fail("debería haber rechazado «$mala»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `una comision de pool inventada no se firma`() {
        for (mala in listOf(0, 1, 250, 10000, -500)) {
            try {
                SwapEvm.cambio("usdc2eth", mala, cuenta, BigInteger.TEN, BigInteger.ONE)
                fail("debería haber rechazado la comisión $mala")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `una cuenta mal escrita no se firma`() {
        for (mala in listOf("0x1234", "DC1972770Cf114525E938f39Ce4959D26E9C7234", "")) {
            try {
                SwapEvm.cambio("usdc2eth", 500, mala, BigInteger.TEN, BigInteger.ONE)
                fail("debería haber rechazado «$mala»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `cantidad cero no se firma`() {
        try {
            SwapEvm.cambio("usdc2eth", 500, cuenta, BigInteger.ZERO, BigInteger.ONE)
            fail("cambiar cero no tiene sentido")
        } catch (e: IllegalArgumentException) { /* eso se quería */ }
    }

    @Test
    fun `el permiso se da al router de Uniswap`() {
        val d = SwapEvm.datosPermiso(BigInteger.valueOf(5_000_000))
        assertTrue(d.startsWith("095ea7b3"))
        assertEquals(SwapEvm.ROUTER.removePrefix("0x").lowercase(), d.substring(8 + 24, 8 + 64))
    }

    // --- La comisión de servicio de Koberlet ---------------------------------
    //
    // En Ethereum no hay contrato nuestro: reparte el propio router. Lo que hay que
    // vigilar es a quién va cada parte, porque son direcciones de 40 caracteres y una
    // letra cambiada no la ve nadie leyendo.

    @Test
    fun `la comision es del 0,5 por ciento y no llega al tope del router`() {
        assertEquals(50, SwapEvm.COMISION_BIPS)
        assertEquals(100, SwapEvm.COMISION_MAX_BIPS)
        assertTrue("el router no admite más del 1 %", SwapEvm.COMISION_BIPS <= SwapEvm.COMISION_MAX_BIPS)
    }

    @Test
    fun `las tres rutas reparten, y siempre a la misma cuenta`() {
        val cobra = SwapEvm.COMISION_CUENTA.removePrefix("0x").lowercase()
        val bips = BigInteger.valueOf(50).toString(16).padStart(64, '0')
        for (ruta in listOf("usdc2eth", "eth2usdc", "usdt2usdc")) {
            val hex = FirmaEvm.aHex(
                SwapEvm.cambio(ruta, if (ruta == "usdt2usdc") 100 else 500, cuenta,
                    BigInteger.valueOf(1_000_000), BigInteger.valueOf(900_000)).datos)
            assertTrue("$ruta: reparte dentro del multicall",
                hex.contains("9b2c0a37") || hex.contains("e0e189a0"))
            assertTrue("$ruta: la comisión va a la cuenta de DNNS", hex.contains(cobra))
            assertTrue("$ruta: son 50 bips", hex.contains(bips))
            // Y lo que queda sigue yendo al dueño, que es lo que de verdad importa.
            assertTrue("$ruta: el resto es para el dueño", hex.contains(cuenta.removePrefix("0x").lowercase()))
        }
    }

    @Test
    fun `la cuenta que cobra esta en el codigo, no la manda la pantalla`() {
        // Si la pantalla pudiera decir a dónde va la comisión, un XSS en el WebView
        // podría desviarla. Aquí es una constante y `cambio()` no la recibe.
        assertTrue(Regex("^0x[0-9a-fA-F]{40}$").matches(SwapEvm.COMISION_CUENTA))
        val firma = SwapEvm::class.java.methods.first { it.name == "cambio" }
        assertEquals("cambio(clave, comisión de pool, cuenta, entra, mínimo): cinco argumentos y ninguna dirección más",
            5, firma.parameterCount)
    }
}
