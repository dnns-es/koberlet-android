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
        assertEquals(
            "ac9650d8" +
                "0000000000000000000000000000000000000000000000000000000000000020" +
                "0000000000000000000000000000000000000000000000000000000000000002" +
                "0000000000000000000000000000000000000000000000000000000000000040" +
                "0000000000000000000000000000000000000000000000000000000000000160" +
                "00000000000000000000000000000000000000000000000000000000000000e4" +
                "04e45aaf000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" +
                "000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" +
                "00000000000000000000000000000000000000000000000000000000000001f4" +
                "0000000000000000000000000000000000000000000000000000000000000002" +
                "00000000000000000000000000000000000000000000000000000000004c4b40" +
                "0000000000000000000000000000000000000000000000000000000000000000" +
                "0000000000000000000000000000000000000000000000000000000000000000" +
                "00000000000000000000000000000000000000000000000000000000" +
                "0000000000000000000000000000000000000000000000000000000000000044" +
                "49404b7c00000000000000000000000000000000000000000000000000044364c5bb0000" +
                "000000000000000000000000dc1972770cf114525e938f39ce4959d26e9c7234" +
                "00000000000000000000000000000000000000000000000000000000",
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
    fun `token por token es una sola llamada, sin envolver nada`() {
        val c = SwapEvm.cambio(
            claveRuta = "usdt2usdc", comision = 100, cuenta = cuenta,
            cantidadEntra = BigInteger.valueOf(10_000_000),
            salidaMinima = BigInteger.valueOf(9_950_000),
        )
        val hex = FirmaEvm.aHex(c.datos)
        assertEquals(BigInteger.ZERO, c.valorWei)
        assertTrue("no hace falta multicall", hex.startsWith("04e45aaf"))
        // Y el destinatario es el dueño, no el router.
        assertTrue(hex.contains(cuenta.removePrefix("0x").lowercase()))
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
}
