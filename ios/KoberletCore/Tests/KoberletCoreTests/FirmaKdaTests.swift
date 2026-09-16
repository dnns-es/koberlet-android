// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import XCTest
import CryptoKit
@testable import KoberletCore

/// Los mismos casos que EnvioTokenTest.kt y CambioAmmTest.kt, mas los vectores
/// del RFC 7693 para el BLAKE2b escrito a mano.
final class FirmaKdaTests: XCTestCase {

    private let privada = [UInt8](repeating: 0, count: 32)
    private var publica: String { try! Derivacion.publicaKadena(privada) }
    private let de = "k:" + String(repeating: "ab", count: 32)
    private let para = "k:" + String(repeating: "cd", count: 32)
    private let pco = "n_57fcd6f7b72e8949af51a8d6f17fe12cc7719d10.pco"
    private let pool = "c:pZ8x9nQrLm3vT7yKdWs2Hf5JgEaRt1UiOp4AsDfGhIj"

    private func cmdDe(_ o: JSON) -> JSON {
        (try! JSONSerialization.jsonObject(with: Data((o["cmd"] as! String).utf8))) as! JSON
    }
    private func code(_ cmd: JSON) -> String {
        ((cmd["payload"] as! JSON)["exec"] as! JSON)["code"] as! String
    }
    private func data(_ cmd: JSON) -> JSON {
        ((cmd["payload"] as! JSON)["exec"] as! JSON)["data"] as! JSON
    }
    private func clist(_ cmd: JSON) -> [JSON] {
        ((cmd["signers"] as! [JSON])[0])["clist"] as! [JSON]
    }
    private func sig(_ o: JSON) -> String { (o["sigs"] as! [JSON])[0]["sig"] as! String }

    // --- BLAKE2b ------------------------------------------------------------

    func testBlake2bVectoresConocidos() {
        XCTAssertEqual("0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8", Hex.aHex(Blake2b.hash([], size: 32)))
        XCTAssertEqual("bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319", Hex.aHex(Blake2b.hash(Array("abc".utf8), size: 32)))
        // Vector del RFC 7693 (apendice A): blake2b-512 de "abc".
        XCTAssertEqual(
            "ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923",
            Hex.aHex(Blake2b.hash(Array("abc".utf8), size: 64))
        )
    }

    func testBlake2bConMensajesQueCruzanElBloque() {
        // 128 bytes justos, 129 y 300: los bordes del bloque son donde se equivoca uno.
        for largo in [127, 128, 129, 255, 256, 300] {
            let m = [UInt8](repeating: 0x61, count: largo)
            XCTAssertEqual(32, Blake2b.hash(m, size: 32).count)
            XCTAssertNotEqual(Blake2b.hash(m, size: 32), Blake2b.hash(m + [0x61], size: 32))
        }
    }

    // --- Firma --------------------------------------------------------------

    func testLaFirmaSeVerificaConLaPublica() throws {
        let cmd = "{\"hola\":1}"
        let hash = FirmaKda.hashComando(cmd)
        let firma = try Hex.deHex(try FirmaKda.firmar(privada, hash))
        let pub = try Curve25519.Signing.PublicKey(rawRepresentation: Data(try Hex.deHex(publica)))
        XCTAssertTrue(pub.isValidSignature(Data(firma), for: Data(hash)))
        XCTAssertEqual(64, firma.count)
    }

    func testHashEnBase64UrlSinRelleno() {
        let h = Base64Url.codificar(FirmaKda.hashComando("x"))
        XCTAssertEqual(43, h.count)
        XCTAssertFalse(h.contains("="))
        XCTAssertFalse(h.contains("+"))
        XCTAssertFalse(h.contains("/"))
    }

    func testDecimalCanonico() {
        XCTAssertEqual("1.500000000000", FirmaKda.decimalCanonico(1.5))
        XCTAssertEqual("0.000000100000", FirmaKda.decimalCanonico(1e-7))
    }

    // --- Envio de KDA -------------------------------------------------------

    func testEnvioKdaAUnaCuentaK() throws {
        let f = try FirmaKda.envioKda(networkId: "mainnet01", chain: "2", de: de, para: para, cantidad: 1.5,
                                      privada: privada, publica: publica, creationTime: 1_700_000_000)
        let cmd = cmdDe(f)
        XCTAssertEqual("(coin.transfer-create \"\(de)\" \"\(para)\" (read-keyset \"ks\") 1.500000000000)", code(cmd))
        let tr = clist(cmd)[1]
        XCTAssertEqual("coin.TRANSFER", tr["name"] as? String)
        XCTAssertEqual("1.500000000000", ((tr["args"] as! [Any])[2] as! JSON)["decimal"] as? String)
        XCTAssertEqual(Base64Url.codificar(FirmaKda.hashComando(f["cmd"] as! String)), f["hash"] as? String)
    }

    // --- Envio de un token --------------------------------------------------

    private func token(modulo: String? = nil, destino: String? = nil, cantidad: Double = 1.5, precision: Int = 12) throws -> JSON {
        try FirmaKda.envioToken(networkId: "mainnet01", chain: "2", modulo: modulo ?? pco, de: de, para: destino ?? para,
                                cantidad: cantidad, precision: precision, privada: privada, publica: publica,
                                creationTime: 1_700_000_000)
    }

    func testElComandoLlamaAlTransferDelModuloPedido() throws {
        let cmd = cmdDe(try token())
        XCTAssertEqual("(\(pco).transfer-create \"\(de)\" \"\(para)\" (read-keyset \"ks\") 1.500000000000)", code(cmd))
        let ks = data(cmd)["ks"] as! JSON
        XCTAssertEqual("keys-all", ks["pred"] as? String)
        XCTAssertEqual(String(para.dropFirst(2)), (ks["keys"] as! [String])[0])
    }

    func testAUnaCuentaQueNoEsKSeUsaTransferASecas() throws {
        let c = code(cmdDe(try token(destino: "r:alguien")))
        XCTAssertTrue(c.hasPrefix("(\(pco).transfer \"\(de)\" \"r:alguien\""))
        XCTAssertFalse(c.contains("read-keyset"))
    }

    func testLasCapabilitiesSonElGasYElTransferDeEseModulo() throws {
        let cl = clist(cmdDe(try token()))
        XCTAssertEqual(2, cl.count)
        XCTAssertEqual("coin.GAS", cl[0]["name"] as? String)
        XCTAssertEqual("\(pco).TRANSFER", cl[1]["name"] as? String)
        let args = cl[1]["args"] as! [Any]
        XCTAssertEqual(de, args[0] as? String)
        XCTAssertEqual(para, args[1] as? String)
        XCTAssertEqual("1.500000000000", (args[2] as! JSON)["decimal"] as? String)
        XCTAssertFalse(cl.map { $0["name"] as! String }.contains("coin.TRANSFER"))
    }

    func testElImporteSeEscribeConLosDecimalesDelToken() throws {
        let cmd = cmdDe(try token(cantidad: 2.0, precision: 6))
        XCTAssertTrue(code(cmd).hasSuffix("2.000000)"))
        XCTAssertEqual("2.000000", ((clist(cmd)[1]["args"] as! [Any])[2] as! JSON)["decimal"] as? String)
    }

    func testUnaCantidadQueSeRedondeaACeroNoSeFirma() {
        XCTAssertThrowsError(try token(cantidad: 0.0000001, precision: 2))
    }

    func testUnModuloConComillasParentesisOEspaciosNoSeAcepta() {
        let trampas = [
            "free.x\" \"k:otro\") (coin.transfer \"victima\" \"ladron\" 1.0)(free.x.transfer",
            "free.x (coin.transfer)", "free.x'", "free x", "free.x\\", "(coin.transfer)", "free.x;coin", "", "ab", "coin",
        ]
        for m in trampas {
            XCTAssertFalse(FirmaKda.moduloValido(m), "debería rechazar «\(m)»")
            XCTAssertThrowsError(try token(modulo: m), "debería haber rechazado «\(m)»")
        }
    }

    func testLosModulosDeVerdadSiSeAceptan() {
        for m in [pco, "n_48867b242317a0216a67f8c7ca26696b5878e0e3.SPT",
                  "n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC", "free.crankk01", "kdlaunch.token"] {
            XCTAssertTrue(FirmaKda.moduloValido(m), "debería aceptar «\(m)»")
        }
    }

    func testLaFirmaCambiaSiCambiaCualquierCosa() throws {
        XCTAssertNotEqual(sig(try token()), sig(try token(cantidad: 1.6)))
    }

    func testCuentasMalEscritasNoSeFirman() {
        for mala in ["k:abc", "", "  ", "k:" + String(repeating: "zz", count: 32)] {
            XCTAssertThrowsError(try token(destino: mala), "debería haber rechazado «\(mala)»")
        }
    }

    func testCuentaValida() {
        XCTAssertTrue(FirmaKda.cuentaValida(de))
        XCTAssertTrue(FirmaKda.cuentaValida("alice"))
        XCTAssertTrue(FirmaKda.cuentaValida(pool))
        XCTAssertFalse(FirmaKda.cuentaValida("k:abc"))
        XCTAssertFalse(FirmaKda.cuentaValida("x:algo"))
        XCTAssertFalse(FirmaKda.cuentaValida("con\"comilla"))
        XCTAssertFalse(FirmaKda.cuentaValida("ab"))
    }

    // --- Mercado ------------------------------------------------------------

    private func cambio(camino: [String]? = nil, cantidad: String = "10", minimo: String = "1234.5", pool p: String? = nil) throws -> JSON {
        let cuenta = "k:\(publica)"
        return try FirmaKda.cambioAmm(networkId: "mainnet01", camino: camino ?? ["coin", pco], cuenta: cuenta,
                                      poolPrimerSalto: p ?? pool, cantidad: cantidad, minimo: minimo,
                                      privada: privada, publica: publica, creationTime: 1_700_000_000)
    }

    func testElComandoEsUnSwapExactInConSuCamino() throws {
        let cmd = cmdDe(try cambio())
        let cuenta = "k:\(publica)"
        XCTAssertEqual(
            "(kaddex.exchange.swap-exact-in (read-decimal \"amountIn\") (read-decimal \"amountOutMin\") [coin \(pco)] \"\(cuenta)\" \"\(cuenta)\" (read-keyset \"ks\"))",
            code(cmd)
        )
        XCTAssertEqual("2", (cmd["meta"] as! JSON)["chainId"] as? String)
    }

    func testLasCantidadesVanEnElDataConPunto() throws {
        let d = data(cmdDe(try cambio(cantidad: "10", minimo: "1234.5")))
        XCTAssertEqual("10.0", (d["amountIn"] as! JSON)["decimal"] as? String)
        XCTAssertEqual("1234.5", (d["amountOutMin"] as! JSON)["decimal"] as? String)
        XCTAssertEqual(publica, ((d["ks"] as! JSON)["keys"] as! [String])[0])
    }

    func testSoloSeFirmaElGasYElTransferDelTokenQueSale() throws {
        let cl = clist(cmdDe(try cambio()))
        XCTAssertEqual(2, cl.count)
        XCTAssertEqual("coin.TRANSFER", cl[1]["name"] as? String)
        let args = cl[1]["args"] as! [Any]
        XCTAssertEqual(pool, args[1] as? String)
        XCTAssertEqual("10.0", (args[2] as! JSON)["decimal"] as? String)
    }

    func testConDosSaltosElTransferSigueSiendoElDelPrimero() throws {
        let otro = "n_48867b242317a0216a67f8c7ca26696b5878e0e3.SPT"
        XCTAssertEqual("\(pco).TRANSFER", clist(cmdDe(try cambio(camino: [pco, "coin", otro])))[1]["name"] as? String)
    }

    func testUnCaminoConCodigoPactDentroNoSeFirma() {
        let trampas: [[String]] = [
            ["coin", "x\") (coin.transfer \"victima\" \"ladron\" 999.0) ("],
            ["coin", "free.x (read-keyset)"], ["coin", "free.x\""], ["coin"], ["coin", pco, "coin", pco], ["coin", ""],
        ]
        for c in trampas { XCTAssertThrowsError(try cambio(camino: c), "debería haber rechazado \(c)") }
    }

    func testUnaCantidadQueNoEsUnNumeroNoSeFirma() {
        for mala in ["1e6", "0x10", "1,5,5", "diez", "", "-3", "10."] {
            XCTAssertThrowsError(try cambio(cantidad: mala), "debería haber rechazado «\(mala)»")
        }
        XCTAssertThrowsError(try cambio(cantidad: "0"))
        XCTAssertThrowsError(try cambio(pool: "pool\" \"otra"))
    }

    func testElHashCuadraConElComandoYEsJson() throws {
        let f = try cambio()
        let cmd = f["cmd"] as! String
        XCTAssertEqual(Base64Url.codificar(FirmaKda.hashComando(cmd)), f["hash"] as? String)
        XCTAssertNoThrow(try JSONSerialization.jsonObject(with: Data(cmd.utf8)))
    }

    // --- Puente y DCA: lo que acota -------------------------------------------

    func testDestinoEvmSonLos32BytesAlineados() throws {
        let rec = try FirmaKda.destinoEvm("0x" + String(repeating: "ab", count: 20))
        let bytes = Data(base64Encoded: rec.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/") + "=")!
        XCTAssertEqual(32, bytes.count)
        XCTAssertEqual(0, bytes[0])
        XCTAssertEqual(0xab, bytes[12])
        XCTAssertThrowsError(try FirmaKda.destinoEvm("0x1234"))
    }

    func testElPeajeDelPuenteTieneTecho() {
        XCTAssertThrowsError(try FirmaKda.envioPuenteEvm(networkId: "mainnet01", de: "k:\(publica)", destinoEth: "0x" + String(repeating: "ab", count: 20),
                                                          cantidad: 1, peaje: 1000, cuentaPeaje: de, privada: privada, publica: publica, creationTime: 1))
        XCTAssertNoThrow(try FirmaKda.envioPuenteEvm(networkId: "mainnet01", de: "k:\(publica)", destinoEth: "0x" + String(repeating: "ab", count: 20),
                                                     cantidad: 1, peaje: 0.5, cuentaPeaje: de, privada: privada, publica: publica, creationTime: 1))
    }

    func testUnPlanDcaSoloANombreDeLaPropiaCartera() {
        XCTAssertThrowsError(try FirmaKda.crearPlanDca(networkId: "mainnet01", owner: de, haciaUsdc: true, deposito: 10, cuota: 1,
                                                        periodo: 3600, deslizamiento: 0.01, privada: privada, publica: publica, creationTime: 1))
        XCTAssertNoThrow(try FirmaKda.crearPlanDca(networkId: "mainnet01", owner: "k:\(publica)", haciaUsdc: true, deposito: 10, cuota: 1,
                                                   periodo: 3600, deslizamiento: 0.01, privada: privada, publica: publica, creationTime: 1))
        XCTAssertTrue(FirmaKda.idPlanValido("k:\(publica.prefix(8))-123", "k:\(publica)"))
        XCTAssertFalse(FirmaKda.idPlanValido("otro-123", "k:\(publica)"))
    }
}
