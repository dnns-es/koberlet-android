// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation
import secp256k1

/// FIRMAR TRANSACCIONES DE ETHEREUM, AQUI DENTRO.
///
/// Hermano de FirmaKda y port de FirmaEvm.kt, con su misma regla: el WebView no
/// manda nada que decida donde va el dinero. Llegan numeros y una cuenta; la
/// transaccion se arma aqui con plantillas fijas.
///
///   1. RLP, que es como Ethereum serializa.
///   2. La firma ECDSA sobre secp256k1 (libsecp256k1, la de Bitcoin Core):
///      determinista (RFC 6979), con s baja (EIP-2) y recovery id.
///   3. La transaccion EIP-1559 (tipo 2).
///   4. Los datos de las llamadas: `approve`, `transfer` y `transferRemote`.
///
/// Los vectores de los tests son los que firmo ethers v6 con la misma clave:
/// si cualquier pieza estuviera mal, la cadena de bytes seria distinta.
public enum FirmaEvm {

    // --- Lo que NO se negocia ------------------------------------------------

    public static let chainId: UInt64 = 1
    public static let tokenUsdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    public static let tokenUsdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    /// El router del puente (el del FORK, no el de Hyperlane oficial).
    public static let router = "0x81C2813aa88F66bca1e55838045Aaceb72FEbFc1"
    public static let dominioKda: UInt64 = 626
    public static let chainPuente: UInt64 = 2
    public static let decimalesUsdc = 6

    private static let selApprove = "095ea7b3"          // approve(address,uint256)
    private static let selTransfer = "a9059cbb"         // transfer(address,uint256)
    private static let selTransferRemote = "80eefc06"   // transferRemote(uint32,bytes,uint256,uint16)

    /// Tope del peaje en wei: 0,05 ETH. Perdida acotada si el nodo miente.
    public static let peajeMaximoWei = BigUInt(decimal: "50000000000000000")!
    public static let gasMaximo: Int64 = 900_000
    public static let precioGasMaximoWei = BigUInt(decimal: "500000000000")!   // 500 gwei

    // --- Keccak y direcciones ------------------------------------------------

    public static func keccak256(_ datos: [UInt8]) -> [UInt8] { Keccak.hash256(datos) }

    /// Una direccion de Ethereum, comprobada y en minusculas. 39 caracteres en
    /// vez de 40 no dan error en la red: dan una direccion distinta, de nadie.
    public static func direccionValida(_ direccion: String) throws -> String {
        let a = direccion.trimmingCharacters(in: .whitespacesAndNewlines)
        if !a.casa("^0x[0-9a-fA-F]{40}$") {
            throw FalloBoveda.argumento("La dirección de Ethereum tiene que ser 0x y 40 caracteres.")
        }
        return a.lowercased()
    }

    // --- RLP -----------------------------------------------------------------

    static func rlpBytes(_ datos: [UInt8]) -> [UInt8] {
        if datos.count == 1 && datos[0] < 0x80 { return datos }
        return cabecera(0x80, datos.count) + datos
    }

    static func rlpLista(_ partes: [[UInt8]]) -> [UInt8] {
        let cuerpo = partes.flatMap { $0 }
        return cabecera(0xc0, cuerpo.count) + cuerpo
    }

    private static func cabecera(_ base: Int, _ largo: Int) -> [UInt8] {
        if largo <= 55 { return [UInt8(base + largo)] }
        let l = BigUInt(UInt64(largo)).bytes
        return [UInt8(base + 55 + l.count)] + l
    }

    /// Los enteros van SIN ceros por delante, y el cero es la cadena vacia.
    static func rlpEntero(_ n: BigUInt) -> [UInt8] { rlpBytes(n.bytes) }
    static func rlpEntero(_ n: UInt64) -> [UInt8] { rlpEntero(BigUInt(n)) }

    // --- Firma ---------------------------------------------------------------

    /// Una firma: las dos mitades y el bit que dice cual de las dos claves es.
    public struct Firma {
        public let r: [UInt8]
        public let s: [UInt8]
        public let yParity: Int
    }

    /// Firma 32 bytes con la privada. libsecp256k1 hace RFC 6979 (sin azar que
    /// pueda salir mal), baja la `s` (EIP-2) y da el recovery id.
    public static func firmar(_ hash: [UInt8], _ privada: [UInt8]) throws -> Firma {
        if hash.count != 32 { throw FalloBoveda.argumento("Lo que se firma son 32 bytes.") }
        let clave: secp256k1.Recovery.PrivateKey
        do {
            clave = try secp256k1.Recovery.PrivateKey(dataRepresentation: Data(privada))
        } catch {
            throw FalloBoveda.argumento("Clave privada fuera de rango.")
        }
        let firma = try clave.signature(for: HashDigest(hash))
        let compacta = try firma.compactRepresentation
        let bytes = Array(compacta.signature)
        if bytes.count != 64 { throw FalloBoveda.estado("La firma no tiene 64 bytes.") }
        return Firma(r: Array(bytes[0..<32]), s: Array(bytes[32..<64]), yParity: Int(compacta.recoveryId))
    }

    // --- La transaccion ------------------------------------------------------

    /// Lo que hace falta saber de la red para poder firmar.
    public struct Sobre {
        public var nonce: Int64
        public var gasLimit: Int64
        public var maxFeePerGas: BigUInt
        public var maxPriorityFeePerGas: BigUInt
        public init(nonce: Int64, gasLimit: Int64, maxFeePerGas: BigUInt, maxPriorityFeePerGas: BigUInt) {
            self.nonce = nonce; self.gasLimit = gasLimit
            self.maxFeePerGas = maxFeePerGas; self.maxPriorityFeePerGas = maxPriorityFeePerGas
        }
    }

    /// Arma y firma una transaccion EIP-1559 y devuelve el `rawTransaction`.
    /// Se firma `keccak(0x02 || rlp([...]))` SIN las tres ultimas casillas; se
    /// manda lo mismo con la firma dentro.
    public static func transaccionFirmada(a: String, valorWei: BigUInt, datos: [UInt8], sobre: Sobre, privada: [UInt8]) throws -> String {
        let destino = try Hex.deHex(try direccionValida(a))
        try comprobarSobre(sobre)

        let campos: [[UInt8]] = [
            rlpEntero(chainId),
            rlpEntero(UInt64(sobre.nonce)),
            rlpEntero(sobre.maxPriorityFeePerGas),
            rlpEntero(sobre.maxFeePerGas),
            rlpEntero(UInt64(sobre.gasLimit)),
            rlpBytes(destino),
            rlpEntero(valorWei),
            rlpBytes(datos),
            rlpLista([]),                              // accessList vacia
        ]
        let paraFirmar: [UInt8] = [0x02] + rlpLista(campos)
        let f = try firmar(keccak256(paraFirmar), privada)
        let conFirma = campos + [rlpEntero(UInt64(f.yParity)), rlpEntero(BigUInt(f.r)), rlpEntero(BigUInt(f.s))]
        return "0x02" + Hex.aHex(rlpLista(conFirma))
    }

    private static func comprobarSobre(_ s: Sobre) throws {
        if s.nonce < 0 { throw FalloBoveda.argumento("El nonce no puede ser negativo.") }
        if s.gasLimit <= 0 || s.gasLimit > gasMaximo {
            throw FalloBoveda.argumento("El límite de gas está fuera de lo razonable.")
        }
        if s.maxFeePerGas.isZero || s.maxFeePerGas > precioGasMaximoWei {
            throw FalloBoveda.argumento("El precio del gas está fuera de lo razonable.")
        }
        if s.maxPriorityFeePerGas > s.maxFeePerGas {
            throw FalloBoveda.argumento("La propina no puede pasar del precio máximo del gas.")
        }
    }

    // --- Los datos de cada llamada -------------------------------------------

    /// Un entero en la palabra de 32 bytes que pide la ABI.
    static func palabra(_ n: BigUInt) throws -> String {
        let h = n.hex
        if h.count > 64 { throw FalloBoveda.argumento("El número no cabe en 32 bytes.") }
        return String(repeating: "0", count: 64 - h.count) + h
    }

    static func palabraDireccion(_ a: String) throws -> String {
        let h = String(try direccionValida(a).dropFirst(2))
        return String(repeating: "0", count: 64 - h.count) + h
    }

    /// `approve(router, cantidad)` sobre el USDC. El spender es el router del
    /// puente, constante; y la cantidad JUSTA, no el infinito de costumbre.
    public static func datosPermiso(_ cantidadBase: BigUInt) throws -> [UInt8] {
        if cantidadBase.isZero { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
        return try Hex.deHex(selApprove + (try palabraDireccion(router)) + (try palabra(cantidadBase)))
    }

    /// `transfer(para, cantidad)` de un ERC-20.
    public static func datosEnvioToken(_ para: String, _ cantidadBase: BigUInt) throws -> [UInt8] {
        if cantidadBase.isZero { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
        return try Hex.deHex(selTransfer + (try palabraDireccion(para)) + (try palabra(cantidadBase)))
    }

    /// El CUSTODIO de una cuenta Kadena: el guardian en JSON, tal cual. Se
    /// calcula AQUI y nunca llega hecho (hallazgo R1 del puente: un caracter de
    /// mas y el token se queda bloqueado en Ethereum para siempre).
    public static func custodioDe(_ cuentaKda: String) throws -> [UInt8] {
        var pk = cuentaKda.trimmingCharacters(in: .whitespacesAndNewlines)
        if pk.hasPrefix("k:") { pk = String(pk.dropFirst(2)) }
        if !pk.casa("^[0-9a-fA-F]{64}$") {
            throw FalloBoveda.argumento("Para el puente la cuenta Kadena tiene que ser k: y 64 caracteres.")
        }
        return Array("{\"pred\":\"keys-all\",\"keys\":[\"\(pk.lowercased())\"]}".utf8)
    }

    /// `transferRemote(uint32 dominio, bytes destinatario, uint256 cantidad, uint16 chain)`.
    public static func datosPuenteHaciaKadena(_ cuentaKda: String, _ cantidadBase: BigUInt) throws -> [UInt8] {
        if cantidadBase.isZero { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
        let custodio = try custodioDe(cuentaKda)
        let relleno = (32 - custodio.count % 32) % 32
        var s = selTransferRemote
        s += try palabra(BigUInt(dominioKda))
        s += try palabra(BigUInt(0x80))                 // donde empieza el destinatario: 4 palabras
        s += try palabra(cantidadBase)
        s += try palabra(BigUInt(chainPuente))
        s += try palabra(BigUInt(UInt64(custodio.count)))
        s += Hex.aHex(custodio)
        s += String(repeating: "00", count: relleno)
        return try Hex.deHex(s)
    }

    /// De «5,25 USDC» a las unidades enteras del contrato, sin coma flotante.
    public static func aUnidades(_ cantidad: String, _ decimales: Int) throws -> BigUInt {
        let limpio = cantidad.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: ".")
        if !limpio.casa("^[0-9]+(\\.[0-9]*)?$") { throw FalloBoveda.argumento("Eso no es una cantidad.") }
        let partes = limpio.split(separator: ".", omittingEmptySubsequences: false).map(String.init)
        let enteros = partes[0]
        let decs = partes.count > 1 ? partes[1] : ""
        if decs.count > decimales { throw FalloBoveda.argumento("Ese token no tiene tantos decimales.") }
        let todo = enteros + decs + String(repeating: "0", count: decimales - decs.count)
        guard let n = BigUInt(decimal: todo), !n.isZero else {
            throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.")
        }
        return n
    }

    /// El peaje que se manda como `value`, acotado.
    public static func peajeComprobado(_ peajeWei: BigUInt) throws -> BigUInt {
        if peajeWei > peajeMaximoWei {
            throw FalloBoveda.argumento("El peaje que dice el contrato es disparatado; no se firma.")
        }
        return peajeWei
    }
}
