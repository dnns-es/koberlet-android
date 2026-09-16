// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import XCTest
@testable import KoberletCore

/// PRUEBAS DE LA FIRMA DE ETHEREUM: las mismas que FirmaEvmTest.kt. Los `raw`
/// los firmo ethers v6 con la misma clave (la del ejemplo del EIP-155): si el
/// RLP, el keccak, la firma, la s canonica o la paridad fallaran, la cadena
/// seria distinta byte a byte.
final class FirmaEvmTests: XCTestCase {

    private let privadaEjemplo = try! Hex.deHex("4646464646464646464646464646464646464646464646464646464646464646")
    private let direccionEjemplo = "0x9d8a62f656a8d1615c1294fd71e9cfb3e4855a4f"

    private func sobre(nonce: Int64 = 7, gas: Int64 = 60_000) -> FirmaEvm.Sobre {
        FirmaEvm.Sobre(nonce: nonce, gasLimit: gas,
                       maxFeePerGas: BigUInt(decimal: "30000000000")!,
                       maxPriorityFeePerGas: BigUInt(decimal: "1000000000")!)
    }

    // --- Keccak ------------------------------------------------------------

    func testKeccakVectoresConocidos() {
        XCTAssertEqual("c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470", Hex.aHex(Keccak.hash256([])))
        XCTAssertEqual("4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45", Hex.aHex(Keccak.hash256(Array("abc".utf8))))
        // Mensajes que cruzan el bloque de 136 bytes.
        for largo in [135, 136, 137, 271, 272, 300] {
            let m = [UInt8](repeating: 0x61, count: largo)
            XCTAssertNotEqual(Keccak.hash256(m), Keccak.hash256(m + [0x61]))
        }
    }

    func testLosSelectoresSonElKeccakDeLaFirma() throws {
        func sel(_ f: String) -> String { String(Hex.aHex(Keccak.hash256(Array(f.utf8))).prefix(8)) }
        XCTAssertEqual("095ea7b3", sel("approve(address,uint256)"))
        XCTAssertEqual("80eefc06", sel("transferRemote(uint32,bytes,uint256,uint16)"))
        XCTAssertEqual("a9059cbb", sel("transfer(address,uint256)"))
        XCTAssertTrue(Hex.aHex(try FirmaEvm.datosPermiso(BigUInt(1))).hasPrefix("095ea7b3"))
        XCTAssertTrue(Hex.aHex(try FirmaEvm.datosPuenteHaciaKadena("k:" + String(repeating: "ab", count: 32), BigUInt(10))).hasPrefix("80eefc06"))
    }

    // --- BigUInt -----------------------------------------------------------

    func testBigUInt() {
        XCTAssertEqual("4c4b40", BigUInt(decimal: "5000000")!.hex)
        XCTAssertEqual("0", BigUInt(decimal: "0")!.hex)
        XCTAssertEqual("de0b6b3a7640000", BigUInt(decimal: "1000000000000000000")!.hex)
        XCTAssertEqual("ff", BigUInt(255).hex)
        XCTAssertEqual([0x01, 0x00], BigUInt(256).bytes)
        XCTAssertNil(BigUInt(decimal: "-1"))
        XCTAssertNil(BigUInt(decimal: "1e6"))
        XCTAssertNil(BigUInt(decimal: ""))
        XCTAssertTrue(BigUInt(decimal: "500000000000")! < BigUInt(decimal: "900000000000")!)
        XCTAssertTrue(BigUInt(255) < BigUInt(256))
        XCTAssertEqual(BigUInt([0, 0, 5]), BigUInt(5))
    }

    // --- RLP ---------------------------------------------------------------

    func testRlpLosEjemplosDelLibroAmarillo() {
        XCTAssertEqual("83646f67", Hex.aHex(FirmaEvm.rlpBytes(Array("dog".utf8))))
        XCTAssertEqual("80", Hex.aHex(FirmaEvm.rlpBytes([])))
        XCTAssertEqual("c0", Hex.aHex(FirmaEvm.rlpLista([])))
        XCTAssertEqual("00", Hex.aHex(FirmaEvm.rlpBytes([0])))
        XCTAssertEqual("c88363617483646f67", Hex.aHex(FirmaEvm.rlpLista([FirmaEvm.rlpBytes(Array("cat".utf8)), FirmaEvm.rlpBytes(Array("dog".utf8))])))
    }

    func testRlpEnterosSinCerosYElCeroVacio() {
        XCTAssertEqual("80", Hex.aHex(FirmaEvm.rlpEntero(0)))
        XCTAssertEqual("0f", Hex.aHex(FirmaEvm.rlpEntero(15)))
        XCTAssertEqual("820400", Hex.aHex(FirmaEvm.rlpEntero(1024)))
        XCTAssertEqual("8180", Hex.aHex(FirmaEvm.rlpEntero(128)))
        XCTAssertEqual("81ff", Hex.aHex(FirmaEvm.rlpEntero(255)))
    }

    func testRlpLasCosasLargasLlevanLaLongitudDeLaLongitud() {
        let largo = "Lorem ipsum dolor sit amet, consectetur adipisicing elit"
        XCTAssertEqual(56, largo.count)
        XCTAssertTrue(Hex.aHex(FirmaEvm.rlpBytes(Array(largo.utf8))).hasPrefix("b838"))
    }

    // --- Firma -------------------------------------------------------------

    func testLaFirmaEsDeterministaYConLaSBaja() throws {
        let hash = Keccak.hash256(Array("dos veces lo mismo".utf8))
        let a = try FirmaEvm.firmar(hash, privadaEjemplo)
        let b = try FirmaEvm.firmar(hash, privadaEjemplo)
        XCTAssertEqual(a.r, b.r)
        XCTAssertEqual(a.s, b.s)
        XCTAssertEqual(a.yParity, b.yParity)
        let medioN = BigUInt(hex: "7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0")!
        XCTAssertTrue(BigUInt(a.s) <= medioN)
        XCTAssertTrue(a.yParity == 0 || a.yParity == 1)
    }

    func testFirmarOtraCosaDaOtraFirma() throws {
        let uno = try FirmaEvm.firmar(Keccak.hash256(Array("uno".utf8)), privadaEjemplo)
        let otro = try FirmaEvm.firmar(Keccak.hash256(Array("otro".utf8)), privadaEjemplo)
        XCTAssertNotEqual(uno.r, otro.r)
    }

    func testLaDireccionDeLaClaveDelEip155() throws {
        XCTAssertEqual(direccionEjemplo, try Derivacion.direccionEvm(privadaEjemplo).lowercased())
    }

    // --- La transaccion ----------------------------------------------------

    func testClavadaConLoQueFirmaEthers() throws {
        let raw = try FirmaEvm.transaccionFirmada(
            a: FirmaEvm.tokenUsdc, valorWei: BigUInt.cero,
            datos: try FirmaEvm.datosPermiso(BigUInt(5_000_000)),
            sobre: sobre(), privada: privadaEjemplo)
        XCTAssertEqual(
            "0x02f8b00107843b9aca008506fc23ac0082ea6094a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" +
                "80b844095ea7b300000000000000000000000081c2813aa88f66bca1e55838045aaceb72febfc1" +
                "00000000000000000000000000000000000000000000000000000000004c4b40c001a0b45b1faa" +
                "7d5e16f5e42163056dee307ed6f1821822aa6553a8c3d347f7c90624a00cf679c63e467f63bd50" +
                "a6fa2d75454bbe12f9e7a1fe30437a25ddc5ba368ca0",
            raw)
    }

    func testElEnvioDeEthYElDeUsdcSalenComoLosFirmaEthers() throws {
        let para = "0x1111111111111111111111111111111111111111"
        XCTAssertEqual(
            "0x02f8730107843b9aca008506fc23ac00825208941111111111111111111111111111111111111111" +
                "8803782dace9d9000080c080a01408daa4e7dbf6455012c52bcbfdff365e00ee123d9eba33413fec" +
                "7783a1b474a05802a535a039774a71a6b1e322a58b6aa16f477da61a9ff9c4abcfb2d82e0db9",
            try FirmaEvm.transaccionFirmada(a: para, valorWei: try FirmaEvm.aUnidades("0.25", 18), datos: [],
                                            sobre: sobre(gas: 21_000), privada: privadaEjemplo))
        XCTAssertEqual(
            "0x02f8b00107843b9aca008506fc23ac0082ea6094a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" +
                "80b844a9059cbb000000000000000000000000111111111111111111111111111111111111111100" +
                "000000000000000000000000000000000000000000000000000000004c4b40c001a00257a5da39f6" +
                "5ae3d2e94ae986534302296f4c08de4ccd9f50121cda64f85430a02efa7c02f9967f67a9cc63f96b" +
                "d78ecd6bfc7da0f91b4729f7a34be04d97273f",
            try FirmaEvm.transaccionFirmada(a: FirmaEvm.tokenUsdc, valorWei: BigUInt.cero,
                                            datos: try FirmaEvm.datosEnvioToken(para, try FirmaEvm.aUnidades("5", 6)),
                                            sobre: sobre(), privada: privadaEjemplo))
    }

    func testLaMismaTransaccionConOtroNonceSeFirmaDistinto() throws {
        func raw(_ nonce: Int64) throws -> String {
            try FirmaEvm.transaccionFirmada(a: FirmaEvm.tokenUsdc, valorWei: BigUInt.cero,
                                            datos: try FirmaEvm.datosPermiso(BigUInt(1)), sobre: sobre(nonce: nonce), privada: privadaEjemplo)
        }
        XCTAssertNotEqual(try raw(1), try raw(2))
    }

    func testNoSeFirmaConGasNiPreciosDisparatados() throws {
        var malos = [FirmaEvm.Sobre]()
        var s = sobre(); s.gasLimit = 5_000_000; malos.append(s)
        s = sobre(); s.gasLimit = 0; malos.append(s)
        s = sobre(); s.nonce = -1; malos.append(s)
        s = sobre(); s.maxFeePerGas = BigUInt(decimal: "900000000000")!; malos.append(s)
        s = sobre(); s.maxPriorityFeePerGas = BigUInt(decimal: "40000000000")!; malos.append(s)
        for malo in malos {
            XCTAssertThrowsError(try FirmaEvm.transaccionFirmada(a: FirmaEvm.tokenUsdc, valorWei: BigUInt.cero,
                                                                  datos: try FirmaEvm.datosPermiso(BigUInt(1)), sobre: malo, privada: privadaEjemplo))
        }
    }

    func testNoSeFirmaHaciaUnaDireccionMalEscrita() throws {
        for mala in ["0x1234", "1234567890123456789012345678901234567890", "0x" + String(repeating: "z", count: 40)] {
            XCTAssertThrowsError(try FirmaEvm.transaccionFirmada(a: mala, valorWei: BigUInt.cero,
                                                                  datos: try FirmaEvm.datosPermiso(BigUInt(1)), sobre: sobre(), privada: privadaEjemplo))
        }
    }

    func testElPeajeTieneTope() throws {
        XCTAssertNoThrow(try FirmaEvm.peajeComprobado(BigUInt(decimal: "1000000000000000")!))
        XCTAssertThrowsError(try FirmaEvm.peajeComprobado(BigUInt(decimal: "500000000000000000")!))
    }

    // --- El custodio ---------------------------------------------------------

    func testElCustodioEsElKeysetEnJsonExacto() throws {
        let pk = "e595727b657fbbb3b8e362a05a7bb8d12865c1ff0a1b2c3d4e5f60718293a4b5"
        let esperado = "{\"pred\":\"keys-all\",\"keys\":[\"\(pk)\"]}"
        XCTAssertEqual(esperado, String(bytes: try FirmaEvm.custodioDe("k:\(pk)"), encoding: .ascii))
        XCTAssertEqual(esperado, String(bytes: try FirmaEvm.custodioDe(pk), encoding: .ascii))
        for mala in ["k:abc", "r:" + String(repeating: "ab", count: 32), "", "k:" + String(repeating: "zz", count: 32)] {
            XCTAssertThrowsError(try FirmaEvm.custodioDe(mala))
        }
    }

    func testLosDatosDelPuenteLlevanCabeceraLongitudYRelleno() throws {
        let pk = String(repeating: "ab", count: 32)
        let datos = Hex.aHex(try FirmaEvm.datosPuenteHaciaKadena("k:\(pk)", BigUInt(5_250_000)))
        let custodio = try FirmaEvm.custodioDe("k:\(pk)")
        func palabra(_ i: Int) -> BigUInt {
            let desde = datos.index(datos.startIndex, offsetBy: i)
            return BigUInt(hex: String(datos[desde..<datos.index(desde, offsetBy: 64)]))!
        }
        var i = 8
        XCTAssertEqual(BigUInt(626), palabra(i)); i += 64
        XCTAssertEqual(BigUInt(0x80), palabra(i)); i += 64
        XCTAssertEqual(BigUInt(5_250_000), palabra(i)); i += 64
        XCTAssertEqual(BigUInt(2), palabra(i)); i += 64
        XCTAssertEqual(BigUInt(UInt64(custodio.count)), palabra(i)); i += 64
        let desde = datos.index(datos.startIndex, offsetBy: i)
        XCTAssertEqual(Hex.aHex(custodio), String(datos[desde..<datos.index(desde, offsetBy: custodio.count * 2)]))
        XCTAssertEqual(0, (datos.count - 8) % 64)
    }

    func testElPermisoSeDaAlRouterDelPuenteYPorLaCantidadJusta() throws {
        let datos = Hex.aHex(try FirmaEvm.datosPermiso(BigUInt(20_000_000)))
        XCTAssertTrue(datos.contains(FirmaEvm.router.dropFirst(2).lowercased()))
        XCTAssertTrue(datos.hasSuffix(BigUInt(20_000_000).bytes(alineadoA: 32).map(Hex.aHex)!))
    }

    func testElEnvioDeUnTokenLlevaAQuienYCuanto() throws {
        let para = "0x1111111111111111111111111111111111111111"
        let datos = Hex.aHex(try FirmaEvm.datosEnvioToken(para, BigUInt(5_000_000)))
        XCTAssertTrue(datos.hasPrefix("a9059cbb"))
        XCTAssertTrue(datos.contains(String(para.dropFirst(2))))
        XCTAssertEqual(8 + 128, datos.count)
        for mala in ["0x1234", "0x" + String(repeating: "11", count: 19), ""] {
            XCTAssertThrowsError(try FirmaEvm.datosEnvioToken(mala, BigUInt(1)))
        }
        XCTAssertThrowsError(try FirmaEvm.datosEnvioToken(para, BigUInt.cero))
    }

    // --- Cantidades ------------------------------------------------------------

    func testLasCantidadesPasanAUnidadesSinComaFlotante() throws {
        XCTAssertEqual(BigUInt(5_250_000), try FirmaEvm.aUnidades("5.25", 6))
        XCTAssertEqual(BigUInt(5_250_000), try FirmaEvm.aUnidades("5,25", 6))
        XCTAssertEqual(BigUInt(1), try FirmaEvm.aUnidades("0.000001", 6))
        XCTAssertEqual(BigUInt(decimal: "1000000000000000000")!, try FirmaEvm.aUnidades("1", 18))
        for mala in ["0", "-1", "0.0000001", "", "cinco", "1e6", "0.0"] {
            XCTAssertThrowsError(try FirmaEvm.aUnidades(mala, 6), "debería haber rechazado «\(mala)»")
        }
    }
}
