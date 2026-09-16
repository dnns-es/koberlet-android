// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import XCTest
@testable import KoberletCore

/// La prueba que decide si el port sirve o no sirve: los MISMOS vectores que en
/// DerivacionTest.kt. Si el iPhone diera otra cuenta para la misma semilla, el
/// dueño veria una cartera vacia que no es la suya.
final class DerivacionTests: XCTestCase {

    // Semilla de los vectores publicos de BIP-39. No custodia nada.
    private let semilla = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

    func testSemillaDePruebaDaLaSeedBip39Conocida() {
        XCTAssertEqual(
            "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4",
            Hex.aHex(Derivacion.semillaABytes(semilla))
        )
    }

    func testCuentaKadenaCoincideConChainweaverYEcko() throws {
        XCTAssertEqual(
            "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d",
            try Derivacion.cuentaKadena(Derivacion.semillaABytes(semilla), 0)
        )
    }

    func testEntropiaCeroDaLaSemillaDeLosManuales() {
        XCTAssertEqual(semilla, Derivacion.entropiaAPalabras([UInt8](repeating: 0, count: 16)))
    }

    func testSemillaGeneradaEsValidaYTieneDocePalabras() {
        let s = Derivacion.generarSemilla()
        XCTAssertEqual(12, s.split(separator: " ").count)
        XCTAssertTrue(Derivacion.semillaValida(s))
    }

    func testDosSemillasSeguidasNuncaSonIguales() {
        XCTAssertNotEqual(Derivacion.generarSemilla(), Derivacion.generarSemilla())
    }

    func testSeRechazaUnaSemillaConUnaPalabraCambiada() {
        XCTAssertTrue(Derivacion.semillaValida(semilla))
        XCTAssertFalse(Derivacion.semillaValida(semilla.replacingOccurrences(of: "about", with: "zoo")))
        XCTAssertFalse(Derivacion.semillaValida(semilla.replacingOccurrences(of: "about", with: "koberlet")))
        XCTAssertFalse(Derivacion.semillaValida("abandon abandon"))
    }

    func testIndicesDistintosDanCuentasDistintas() throws {
        let seed = Derivacion.semillaABytes(semilla)
        XCTAssertNotEqual(try Derivacion.cuentaKadena(seed, 0), try Derivacion.cuentaKadena(seed, 1))
    }

    func testLasPalabrasSonLas2048DelEstandar() {
        XCTAssertEqual(2048, Derivacion.palabras.count)
        XCTAssertEqual("abandon", Derivacion.palabras.first)
        XCTAssertEqual("zoo", Derivacion.palabras.last)
    }

    func testHexIdaYVuelta() throws {
        XCTAssertEqual([0x00, 0xab, 0xff], try Hex.deHex("0x00ABff"))
        XCTAssertEqual("00abff", Hex.aHex([0x00, 0xab, 0xff]))
        XCTAssertThrowsError(try Hex.deHex("abc"))
        XCTAssertThrowsError(try Hex.deHex("zz"))
    }

    func testEthereumTodaviaNoEnIphone() {
        // Fase 2. Mientras, tiene que negarse con un mensaje, no derivar mal.
        XCTAssertThrowsError(try Carteras.montar("c1", "x", semilla, "evm"))
    }
}
