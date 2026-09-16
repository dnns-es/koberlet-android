// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import XCTest
@testable import KoberletCore

/// La forma de los datos y, sobre todo, las migraciones: una copia hecha en un
/// Android viejo tiene que abrirse en el iPhone sin perder nada.
final class CarterasTests: XCTestCase {

    private let semilla = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    private let kda = "k:60ec71ef5df37ee922b272edf60590158938d6a6e0d385d506de913ad3f2be3d"

    func testMontarUnaCarteraKadenaDerivaSuCuenta() throws {
        let c = try Carteras.montar("c1", "Mi cartera", semilla, "kda")
        XCTAssertEqual("kda", Carteras.redDe(c))
        let cuentas = c["cuentas"] as! [JSON]
        XCTAssertEqual(1, cuentas.count)
        XCTAssertEqual(kda, cuentas[0]["cuenta"] as? String)
        XCTAssertEqual("c1-kda", cuentas[0]["id"] as? String)
        XCTAssertTrue(Carteras.esDeSemilla(c))
    }

    func testMigraUnaBovedaV1() throws {
        let v1: JSON = ["v": 1, "semilla": semilla, "cuentas": [["id": "kda", "tipo": "kda", "etiqueta": "Kadena", "cuenta": kda]]]
        let d = Carteras.normalizar(v1)
        XCTAssertEqual(3, d["v"] as? Int)
        let l = d["carteras"] as! [JSON]
        XCTAssertEqual(1, l.count)
        XCTAssertEqual("c1", l[0]["id"] as? String)
        XCTAssertEqual("kda", l[0]["red"] as? String)
        XCTAssertEqual("c1", d["activa"] as? String)
    }

    func testMigraUnaBovedaV2PartiendoPorRed() throws {
        let v2: JSON = ["v": 2, "activa": "c1", "carteras": [[
            "id": "c1", "etiqueta": "Casa", "semilla": semilla,
            "cuentas": [["id": "kda", "tipo": "kda", "etiqueta": "Kadena", "cuenta": kda],
                        ["id": "evm", "tipo": "evm", "etiqueta": "EVM", "cuenta": "0x9858EfFD232B4033E47d90003D41EC34EcaEda94"]],
        ]]]
        let d = Carteras.normalizar(v2)
        let l = d["carteras"] as! [JSON]
        XCTAssertEqual(2, l.count)
        XCTAssertEqual("c1", l[0]["id"] as? String)
        XCTAssertEqual("Casa KDA", l[0]["etiqueta"] as? String)
        XCTAssertEqual("c2", l[1]["id"] as? String)
        XCTAssertEqual("Casa EVM", l[1]["etiqueta"] as? String)
        XCTAssertEqual("c2-evm", (l[1]["cuentas"] as! [JSON])[0]["id"] as? String)
        XCTAssertEqual(semilla, l[1]["semilla"] as? String)
        XCTAssertEqual("c1", d["activa"] as? String)
    }

    func testAnadirQuitarRenombrar() throws {
        var d: JSON = ["v": 3, "carteras": [try Carteras.montar("c1", "Una", semilla, "kda")], "activa": "c1"]
        XCTAssertEqual("c2", Carteras.idNuevo(d))
        d = Carteras.anadir(d, try Carteras.montar("c2", "Dos", semilla, "kda"))
        XCTAssertEqual("c2", d["activa"] as? String)
        XCTAssertTrue(Carteras.yaExiste(d, semilla, "kda"))
        XCTAssertFalse(Carteras.yaExiste(d, semilla, "evm"))
        XCTAssertTrue(Carteras.yaExisteCuenta(d, kda))

        d = try Carteras.renombrar(d, "c1", "  Renombrada  ")
        XCTAssertEqual("Renombrada", Carteras.buscar(d, "c1")?["etiqueta"] as? String)
        XCTAssertThrowsError(try Carteras.renombrar(d, "c1", "   "))
        XCTAssertThrowsError(try Carteras.renombrar(d, "c9", "x"))

        d = try Carteras.quitar(d, "c2")
        XCTAssertEqual("c1", d["activa"] as? String)
        XCTAssertThrowsError(try Carteras.quitar(d, "c1"))       // la ultima no se quita
    }

    func testClavePrivadaSuelta() throws {
        let priv = String(repeating: "11", count: 32)
        XCTAssertEqual(priv, try Carteras.normalizarClave("0x" + priv.uppercased(), "kda"))
        XCTAssertThrowsError(try Carteras.normalizarClave(String(repeating: "0", count: 64), "kda"))
        XCTAssertThrowsError(try Carteras.normalizarClave("zz", "kda"))
        let pub = try Derivacion.publicaKadena(try Hex.deHex(priv))
        XCTAssertEqual(priv, try Carteras.normalizarClave(priv + pub, "kda"))
        XCTAssertThrowsError(try Carteras.normalizarClave(priv + String(repeating: "22", count: 32), "kda"))

        let c = try Carteras.montarConClave("c1", "Suelta", priv, "kda")
        XCTAssertFalse(Carteras.esDeSemilla(c))
        XCTAssertEqual("k:" + pub, (c["cuentas"] as! [JSON])[0]["cuenta"] as? String)
        XCTAssertEqual(try Hex.deHex(priv), try Carteras.privadaDe(c))
    }

    func testPrivadaDeUnaCarteraConSemilla() throws {
        let c = try Carteras.montar("c1", "x", semilla, "kda")
        let priv = try Carteras.privadaDe(c)
        XCTAssertEqual(32, priv.count)
        XCTAssertEqual(String(kda.dropFirst(2)), try Derivacion.publicaKadena(priv))
    }
}
