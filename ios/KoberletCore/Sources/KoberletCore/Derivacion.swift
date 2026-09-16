// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation
import CryptoKit
import secp256k1

/// DERIVACION DE CLAVES - el nucleo del monedero.
///
/// Reimplementado en Swift por lo mismo que en Android se hizo en Kotlin: la
/// semilla no puede cruzar al WebView. Aqui nace, vive y muere en nativo.
///
/// Estandares, los mismos que en Android (ver Derivacion.kt):
///   - Semilla: BIP-39 (PBKDF2-HMAC-SHA512, 2048 vueltas, sal "mnemonic").
///   - Kadena:  SLIP-0010 sobre Ed25519, ruta m'/44'/626'/<indice>'.
///   - EVM:     BIP-32 sobre secp256k1, ruta m/44'/60'/0'/0/0, como MetaMask.
///
/// Nada de esto vale si no da EXACTAMENTE las mismas cuentas que Android y el
/// escritorio. Por eso los tests llevan los mismos vectores publicos.
public enum Derivacion {

    private static let duro: UInt32 = 0x8000_0000

    // --- BIP-39 -------------------------------------------------------------

    static let palabras: [String] = {
        guard let url = Bundle.module.url(forResource: "bip39-english", withExtension: "txt"),
              let texto = try? String(contentsOf: url, encoding: .utf8)
        else { fatalError("Falta la lista de palabras BIP-39.") }
        return texto.split(whereSeparator: { $0 == "\n" || $0 == "\r" })
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }()

    /// Genera una semilla de 12 palabras con 128 bits de entropia del sistema.
    public static func generarSemilla() -> String {
        entropiaAPalabras(Aleatorio.bytes(16))
    }

    private static func bits(_ byte: UInt8) -> String {
        let s = String(byte, radix: 2)
        return String(repeating: "0", count: 8 - s.count) + s
    }

    public static func entropiaAPalabras(_ entropia: [UInt8]) -> String {
        let resumen = Array(SHA256.hash(data: Data(entropia)))
        let bitsSuma = entropia.count * 8 / 32
        var cadena = entropia.map(bits).joined()
        cadena += String(bits(resumen[0]).prefix(bitsSuma))
        var salida = [String]()
        let chars = Array(cadena)
        for i in 0..<(chars.count / 11) {
            let trozo = String(chars[(i * 11)..<((i + 1) * 11)])
            salida.append(palabras[Int(trozo, radix: 2)!])
        }
        return salida.joined(separator: " ")
    }

    /// Comprueba que la semilla existe de verdad: todas las palabras de la lista
    /// y el control cuadra. Una palabra mal escrita deriva otras cuentas SIN
    /// avisar, y el dueño creeria que ha perdido el dinero.
    public static func semillaValida(_ semilla: String) -> Bool {
        let lista = semilla.lowercased().split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "\t" || $0 == "\r" }).map(String.init)
        guard [12, 15, 18, 21, 24].contains(lista.count) else { return false }
        var cadena = ""
        for p in lista {
            guard let i = palabras.firstIndex(of: p) else { return false }
            let s = String(i, radix: 2)
            cadena += String(repeating: "0", count: 11 - s.count) + s
        }
        let chars = Array(cadena)
        let bitsEntropia = lista.count * 11 * 32 / 33
        let bitsSuma = chars.count - bitsEntropia
        var entropia = [UInt8]()
        for i in 0..<(bitsEntropia / 8) {
            entropia.append(UInt8(String(chars[(i * 8)..<(i * 8 + 8)]), radix: 2)!)
        }
        let resumen = Array(SHA256.hash(data: Data(entropia)))
        let esperado = String(bits(resumen[0]).prefix(bitsSuma))
        return String(chars[bitsEntropia...]) == esperado
    }

    /// BIP-39: de palabras a semilla binaria de 64 bytes.
    ///
    /// PBKDF2-HMAC-SHA512 escrito con CryptoKit: son 2048 HMAC de un solo bloque,
    /// no hace falta CommonCrypto.
    public static func semillaABytes(_ semilla: String, contrasenaSemilla: String = "") -> [UInt8] {
        let normal = semilla.lowercased()
            .split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "\t" || $0 == "\r" })
            .joined(separator: " ")
        let clave = SymmetricKey(data: Data(normal.utf8))
        let sal = Array(("mnemonic" + contrasenaSemilla).utf8) + [0, 0, 0, 1]
        var u = Array(HMAC<SHA512>.authenticationCode(for: Data(sal), using: clave))
        var t = u
        for _ in 1..<2048 {
            u = Array(HMAC<SHA512>.authenticationCode(for: Data(u), using: clave))
            for i in 0..<64 { t[i] ^= u[i] }
        }
        return t
    }

    // --- SLIP-0010 (Ed25519) - Kadena ---------------------------------------

    static func hmacSha512(_ clave: [UInt8], _ datos: [UInt8]) -> [UInt8] {
        Array(HMAC<SHA512>.authenticationCode(for: Data(datos), using: SymmetricKey(data: Data(clave))))
    }

    /// Clave privada Kadena del indice pedido. En SLIP-0010 sobre Ed25519 TODOS
    /// los pasos son endurecidos.
    public static func privadaKadena(_ semillaBytes: [UInt8], _ indice: UInt32) -> [UInt8] {
        var i = hmacSha512(Array("ed25519 seed".utf8), semillaBytes)
        var clave = Array(i[0..<32])
        var cadena = Array(i[32..<64])
        for paso in [44 | duro, 626 | duro, indice | duro] {
            var datos = [UInt8](repeating: 0, count: 37)
            datos[0] = 0                       // el 0x00 delante distingue Ed25519 en SLIP-0010
            datos.replaceSubrange(1..<33, with: clave)
            datos[33] = UInt8(paso >> 24)
            datos[34] = UInt8((paso >> 16) & 0xff)
            datos[35] = UInt8((paso >> 8) & 0xff)
            datos[36] = UInt8(paso & 0xff)
            i = hmacSha512(cadena, datos)
            clave = Array(i[0..<32])
            cadena = Array(i[32..<64])
        }
        return clave
    }

    /// Clave publica Ed25519 en hexadecimal: lo que en Kadena va detras de "k:".
    public static func publicaKadena(_ privada: [UInt8]) throws -> String {
        guard let k = try? Curve25519.Signing.PrivateKey(rawRepresentation: Data(privada)) else {
            throw FalloBoveda.argumento("Esa clave privada no vale.")
        }
        return Hex.aHex(Array(k.publicKey.rawRepresentation))
    }

    public static func cuentaKadena(_ semillaBytes: [UInt8], _ indice: UInt32) throws -> String {
        "k:" + (try publicaKadena(privadaKadena(semillaBytes, indice)))
    }

    // --- BIP-32 (secp256k1) - EVM -------------------------------------------
    //
    // La aritmetica de la curva la hace libsecp256k1 (la de Bitcoin Core):
    // (IL + k) mod n es su `tweak add`, y la publica comprimida su serializacion.

    /// Ruta BIP-44 estandar de Ethereum: m/44'/60'/0'/0/<indice>.
    public static func privadaEvm(_ semillaBytes: [UInt8], _ indice: UInt32) throws -> [UInt8] {
        var i = hmacSha512(Array("Bitcoin seed".utf8), semillaBytes)
        var clave = Array(i[0..<32])
        var cadena = Array(i[32..<64])
        for paso in [44 | duro, 60 | duro, 0 | duro, 0, indice] {
            var datos = [UInt8](repeating: 0, count: 37)
            if paso & duro != 0 {                              // endurecido: se usa la privada
                datos[0] = 0
                datos.replaceSubrange(1..<33, with: clave)
            } else {                                           // normal: la publica comprimida
                datos.replaceSubrange(0..<33, with: try publicaComprimida(clave))
            }
            datos[33] = UInt8(paso >> 24)
            datos[34] = UInt8((paso >> 16) & 0xff)
            datos[35] = UInt8((paso >> 8) & 0xff)
            datos[36] = UInt8(paso & 0xff)
            i = hmacSha512(cadena, datos)
            clave = try sumarModN(clave, Array(i[0..<32]))
            cadena = Array(i[32..<64])
        }
        return clave
    }

    private static func publicaComprimida(_ privada: [UInt8]) throws -> [UInt8] {
        guard let k = try? secp256k1.Signing.PrivateKey(dataRepresentation: Data(privada)) else {
            throw FalloBoveda.argumento("Clave privada fuera de rango.")
        }
        return Array(k.publicKey.dataRepresentation)
    }

    private static func sumarModN(_ clave: [UInt8], _ sumando: [UInt8]) throws -> [UInt8] {
        guard let k = try? secp256k1.Signing.PrivateKey(dataRepresentation: Data(clave)),
              let suma = try? k.add(sumando)
        else { throw FalloBoveda.argumento("Clave privada fuera de rango.") }
        return Array(suma.dataRepresentation)
    }

    /// Direccion Ethereum con la suma de verificacion EIP-55 (las mayusculas SON la suma).
    public static func direccionEvm(_ privada: [UInt8]) throws -> String {
        guard let k = try? secp256k1.Signing.PrivateKey(dataRepresentation: Data(privada), format: .uncompressed) else {
            throw FalloBoveda.argumento("Clave privada fuera de rango.")
        }
        let punto = Array(k.publicKey.dataRepresentation)          // 65 bytes, 0x04 delante
        if punto.count != 65 { throw FalloBoveda.estado("La clave pública no tiene la forma esperada.") }
        let hash = Keccak.hash256(Array(punto[1...]))
        let cuerpo = Hex.aHex(Array(hash[12..<32]))
        let hashCuerpo = Array(Hex.aHex(Keccak.hash256(Array(cuerpo.utf8))))
        var s = "0x"
        for (i, c) in cuerpo.enumerated() {
            let nibble = Int(String(hashCuerpo[i]), radix: 16) ?? 0
            s.append(c.isNumber || nibble < 8 ? c : Character(c.uppercased()))
        }
        return s
    }
}
