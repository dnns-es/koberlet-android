// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import XCTest
@testable import KoberletCore

/// PRUEBAS DEL CAMBIO EN ETHEREUM: los `data` se cotejan con los que produce
/// ethers v6 (SwapEvmTest.kt).
final class SwapEvmTests: XCTestCase {

    private let cuenta = "0xDC1972770Cf114525E938f39Ce4959D26E9C7234"

    func testLosSelectoresSonElKeccakDeLaFirma() {
        func sel(_ f: String) -> String { String(Hex.aHex(Keccak.hash256(Array(f.utf8))).prefix(8)) }
        XCTAssertEqual("04e45aaf", sel("exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))"))
        XCTAssertEqual("49404b7c", sel("unwrapWETH9(uint256,address)"))
        XCTAssertEqual("12210e8a", sel("refundETH()"))
        XCTAssertEqual("ac9650d8", sel("multicall(bytes[])"))
        XCTAssertEqual("9b2c0a37", sel("unwrapWETH9WithFee(uint256,address,uint256,address)"))
        XCTAssertEqual("e0e189a0", sel("sweepTokenWithFee(address,uint256,address,uint256,address)"))
    }

    func testExactInputSingleSaleIgualQueConEthers() throws {
        XCTAssertEqual(
            "04e45aaf000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" +
                "000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" +
                "00000000000000000000000000000000000000000000000000000000000001f4" +
                "0000000000000000000000000000000000000000000000000000000000000002" +
                "00000000000000000000000000000000000000000000000000000000004c4b40" +
                "0000000000000000000000000000000000000000000000000000000000000000" +
                "0000000000000000000000000000000000000000000000000000000000000000",
            try SwapEvm.datosCambio(tokenIn: SwapEvm.usdc, tokenOut: SwapEvm.weth, comision: 500,
                                    destinatario: "0x0000000000000000000000000000000000000002",
                                    cantidadEntra: BigUInt(5_000_000), salidaMinima: BigUInt.cero))
    }

    func testUnwrapWeth9SaleIgualQueConEthers() throws {
        XCTAssertEqual(
            "49404b7c00000000000000000000000000000000000000000000000000044364c5bb0000" +
                "000000000000000000000000dc1972770cf114525e938f39ce4959d26e9c7234",
            try SwapEvm.datosDesenvolver(BigUInt(decimal: "1200000000000000")!, cuenta))
    }

    func testElMulticallDeUsdcAEthSaleIgualQueConEthers() throws {
        let c = try SwapEvm.cambio(claveRuta: "usdc2eth", comision: 500, cuenta: cuenta,
                                   cantidadEntra: BigUInt(5_000_000), salidaMinima: BigUInt(decimal: "1200000000000000")!)
        XCTAssertEqual(BigUInt.cero, c.valorWei)
        // El segundo paso es `unwrapWETH9WithFee`: desenvuelve y reparte de una vez.
        // Mismo vector que Kotlin, cotejado con ethers v6.
        XCTAssertEqual(
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
            Hex.aHex(c.datos))
    }

    func testConEthDeEntradaElDineroVaEnElValueYSePideLaDevolucion() throws {
        let c = try SwapEvm.cambio(claveRuta: "eth2usdc", comision: 500, cuenta: cuenta,
                                   cantidadEntra: BigUInt(decimal: "1000000000000000")!, salidaMinima: BigUInt(3_900_000))
        XCTAssertEqual(BigUInt(decimal: "1000000000000000")!, c.valorWei)
        let hex = Hex.aHex(c.datos)
        XCTAssertTrue(hex.hasPrefix("ac9650d8"))
        XCTAssertTrue(hex.contains("12210e8a"))
        XCTAssertTrue(hex.contains(try FirmaEvm.palabra(BigUInt(3_900_000))))
    }

    func testTokenPorTokenTambienReparte() throws {
        let c = try SwapEvm.cambio(claveRuta: "usdt2usdc", comision: 100, cuenta: cuenta,
                                   cantidadEntra: BigUInt(10_000_000), salidaMinima: BigUInt(9_950_000))
        XCTAssertEqual(BigUInt.cero, c.valorWei)
        // Antes era una sola llamada; ahora son dos, para poder repartir lo que sale.
        XCTAssertEqual(
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
            Hex.aHex(c.datos))
    }

    func testElSueloQueSeFirmaEsElQueSeAcepto() throws {
        let suelo = BigUInt(3_900_000)
        let c = try SwapEvm.cambio(claveRuta: "eth2usdc", comision: 500, cuenta: cuenta,
                                   cantidadEntra: BigUInt(decimal: "1000000000000000")!, salidaMinima: suelo)
        let hex = Hex.aHex(c.datos)
        XCTAssertTrue(hex.contains(try FirmaEvm.palabra(suelo)))
        let otro = try SwapEvm.cambio(claveRuta: "eth2usdc", comision: 500, cuenta: cuenta,
                                      cantidadEntra: BigUInt(decimal: "1000000000000000")!, salidaMinima: BigUInt(1))
        XCTAssertNotEqual(Hex.aHex(otro.datos), hex)
    }

    func testLoQueNoSeAcepta() {
        for mala in ["usdc2dai", "eth2eth", "", "usdc2eth ", "cualquiera"] {
            XCTAssertThrowsError(try SwapEvm.cambio(claveRuta: mala, comision: 500, cuenta: cuenta, cantidadEntra: BigUInt(10), salidaMinima: BigUInt(1)))
        }
        for mala in [0, 1, 250, 10000, -500] {
            XCTAssertThrowsError(try SwapEvm.cambio(claveRuta: "usdc2eth", comision: mala, cuenta: cuenta, cantidadEntra: BigUInt(10), salidaMinima: BigUInt(1)))
        }
        for mala in ["0x1234", "DC1972770Cf114525E938f39Ce4959D26E9C7234", ""] {
            XCTAssertThrowsError(try SwapEvm.cambio(claveRuta: "usdc2eth", comision: 500, cuenta: mala, cantidadEntra: BigUInt(10), salidaMinima: BigUInt(1)))
        }
        XCTAssertThrowsError(try SwapEvm.cambio(claveRuta: "usdc2eth", comision: 500, cuenta: cuenta, cantidadEntra: BigUInt.cero, salidaMinima: BigUInt(1)))
    }

    func testElPermisoSeDaAlRouterDeUniswap() throws {
        let d = try SwapEvm.datosPermiso(BigUInt(5_000_000))
        XCTAssertTrue(d.hasPrefix("095ea7b3"))
        XCTAssertTrue(d.contains(SwapEvm.router.dropFirst(2).lowercased()))
    }

    // --- La comisión de servicio de Koberlet ---------------------------------

    func testLaComisionEsDelMedioPorCientoYNoLlegaAlTope() {
        XCTAssertEqual(50, SwapEvm.comisionBips)
        XCTAssertEqual(100, SwapEvm.comisionMaxBips)
        XCTAssertTrue(SwapEvm.comisionBips <= SwapEvm.comisionMaxBips)
    }

    func testLasTresRutasRepartenYSiempreALaMismaCuenta() throws {
        let cobra = SwapEvm.comisionCuenta.dropFirst(2).lowercased()
        let bips = try FirmaEvm.palabra(BigUInt(50))
        for ruta in ["usdc2eth", "eth2usdc", "usdt2usdc"] {
            let c = try SwapEvm.cambio(claveRuta: ruta, comision: ruta == "usdt2usdc" ? 100 : 500,
                                       cuenta: cuenta, cantidadEntra: BigUInt(1_000_000), salidaMinima: BigUInt(900_000))
            let hex = Hex.aHex(c.datos)
            XCTAssertTrue(hex.contains("9b2c0a37") || hex.contains("e0e189a0"), ruta)
            XCTAssertTrue(hex.contains(cobra), ruta)
            XCTAssertTrue(hex.contains(bips), ruta)
            XCTAssertTrue(hex.contains(cuenta.dropFirst(2).lowercased()), ruta)
        }
    }
}
