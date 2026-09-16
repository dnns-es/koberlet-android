// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import XCTest
@testable import KoberletCore

/// La boveda: que cifre, que descifre, y sobre todo que NO descifre cuando no debe.
final class CofreTests: XCTestCase {

    // scrypt con los parametros de verdad tarda segundos; en los tests se usa el
    // minimo que el cofre acepta, salvo donde lo que se prueba es el propio suelo.
    private let n = 1 << 14

    private func json(_ s: String) -> JSON {
        (try! JSONSerialization.jsonObject(with: Data(s.utf8))) as! JSON
    }

    private func texto(_ o: JSON) -> String {
        String(data: try! JSONSerialization.data(withJSONObject: o), encoding: .utf8)!
    }

    func testIdaYVueltaConLaContrasenaCorrecta() throws {
        let sal = Cofre.salNueva()
        let contenido = "{\"semilla\":\"abandon about\",\"cuentas\":[{\"tipo\":\"kda\"}]}"
        let clave = try Cofre.derivar("contraseña larga de prueba", sal, n: n)
        let cifrado = try Cofre.cifrar(clave, sal, contenido, n: n)
        XCTAssertTrue(cifrado.contains("\"ct\""))
        XCTAssertEqual(contenido, try Cofre.descifrar(cifrado, "contraseña larga de prueba"))
    }

    func testLaContrasenaEquivocadaNoAbre() throws {
        let sal = Cofre.salNueva()
        let cifrado = try Cofre.cifrar(try Cofre.derivar("la buena de verdad", sal, n: n), sal, "{\"secreto\":1}", n: n)
        XCTAssertThrowsError(try Cofre.descifrar(cifrado, "otra distinta")) { e in
            guard case FalloBoveda.contrasenaIncorrecta = e else { return XCTFail("tenia que ser contraseña incorrecta: \(e)") }
        }
    }

    func testUnByteCambiadoEnElCifradoHaceQueNoAbra() throws {
        // AES-GCM autentica: manipular el fichero tiene que notarse, no dar basura.
        let sal = Cofre.salNueva()
        var o = json(try Cofre.cifrar(try Cofre.derivar("contraseña larga de prueba", sal, n: n), sal, "{\"a\":1}", n: n))
        var ct = Array(Data(base64Encoded: o["ct"] as! String)!)
        ct[0] ^= 1
        o["ct"] = Data(ct).base64EncodedString()
        XCTAssertThrowsError(try Cofre.descifrar(texto(o), "contraseña larga de prueba")) { e in
            guard case FalloBoveda.contrasenaIncorrecta = e else { return XCTFail("\(e)") }
        }
    }

    func testSeRechazaUnaBovedaConParametrosRebajados() throws {
        let sal = Cofre.salNueva()
        var o = json(try Cofre.cifrar(try Cofre.derivar("contraseña larga de prueba", sal, n: n), sal, "{\"a\":1}", n: n))
        var kdf = o["kdf"] as! JSON
        kdf["N"] = 2
        o["kdf"] = kdf
        XCTAssertThrowsError(try Cofre.descifrar(texto(o), "contraseña larga de prueba")) { e in
            guard case FalloBoveda.bovedaCorrupta = e else { return XCTFail("\(e)") }
        }
    }

    func testCadaEscrituraUsaUnIvDistinto() throws {
        let sal = Cofre.salNueva()
        let clave = try Cofre.derivar("contraseña larga de prueba", sal, n: n)
        let a = json(try Cofre.cifrar(clave, sal, "{\"a\":1}", n: n))["iv"] as! String
        let b = json(try Cofre.cifrar(clave, sal, "{\"a\":1}", n: n))["iv"] as! String
        XCTAssertNotEqual(a, b)
    }

    func testElFormatoDelFicheroEsElDeAndroidYEscritorio() throws {
        // Lo que comprueba es el FORMATO: nombres de campos, base64, IV de 12
        // bytes y tag de 16 aparte del cifrado. Es lo que hace que una copia
        // del Android o del ordenador se abra aqui tal cual.
        let sal = Cofre.salNueva()
        let cifrado = try Cofre.cifrar(try Cofre.derivar("contraseña larga de prueba", sal, n: n), sal, "{\"hola\":\"android\"}", n: n)
        let o = json(cifrado)
        XCTAssertEqual(1, o["v"] as? Int)
        let kdf = o["kdf"] as! JSON
        XCTAssertEqual(n, kdf["N"] as? Int)
        XCTAssertEqual(8, kdf["r"] as? Int)
        XCTAssertEqual(1, kdf["p"] as? Int)
        XCTAssertEqual(12, Data(base64Encoded: o["iv"] as! String)!.count)
        XCTAssertEqual(16, Data(base64Encoded: o["tag"] as! String)!.count)
    }
}
