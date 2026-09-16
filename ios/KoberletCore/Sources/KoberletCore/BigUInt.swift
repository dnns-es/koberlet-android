// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation

/// Un entero SIN signo y sin limite, lo justo para las cantidades de Ethereum:
/// wei, unidades de un token, r y s de una firma. Swift no lo trae y Kotlin
/// tenia BigInteger; aqui solo hace falta leer de decimal o hex, comparar y
/// escribir en bytes o hex, asi que no se arrastra una libreria entera.
///
/// Guardado en bytes big-endian SIN ceros por delante; vacio es cero. Es
/// exactamente la forma que piden RLP y la ABI, que es de donde sale todo esto.
public struct BigUInt: Equatable, Comparable, CustomStringConvertible {

    public private(set) var bytes: [UInt8]

    public init(_ bytes: [UInt8]) { self.bytes = BigUInt.recortar(bytes) }

    public init(_ n: UInt64) {
        var b = [UInt8]()
        var x = n
        while x > 0 { b.insert(UInt8(x & 0xff), at: 0); x >>= 8 }
        bytes = b
    }

    /// Solo digitos: "-1", "1e6" o "" no son numeros aqui.
    public init?(decimal texto: String) {
        guard !texto.isEmpty else { return nil }
        var acc = [UInt8]()
        for c in texto {
            guard let a = c.asciiValue, a >= 48, a <= 57 else { return nil }
            var acarreo = UInt16(a - 48)                    // acc = acc * 10 + digito
            var i = acc.count - 1
            while i >= 0 {
                let v = UInt16(acc[i]) * 10 + acarreo
                acc[i] = UInt8(v & 0xff)
                acarreo = v >> 8
                i -= 1
            }
            while acarreo > 0 { acc.insert(UInt8(acarreo & 0xff), at: 0); acarreo >>= 8 }
        }
        bytes = BigUInt.recortar(acc)
    }

    public init?(hex texto: String) {
        var h = texto.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if h.hasPrefix("0x") { h = String(h.dropFirst(2)) }
        if h.count % 2 == 1 { h = "0" + h }
        guard let b = try? Hex.deHex(h) else { return nil }
        bytes = BigUInt.recortar(b)
    }

    public static let cero = BigUInt([])

    public var isZero: Bool { bytes.isEmpty }

    /// Hex sin 0x y sin ceros por delante; el cero es "0".
    public var hex: String {
        if isZero { return "0" }
        let h = Hex.aHex(bytes)
        return h.hasPrefix("0") ? String(h.dropFirst()) : h
    }

    public var description: String { "0x" + hex }

    /// Los bytes alineados a la derecha en `n` posiciones, o nil si no cabe.
    public func bytes(alineadoA n: Int) -> [UInt8]? {
        if bytes.count > n { return nil }
        return [UInt8](repeating: 0, count: n - bytes.count) + bytes
    }

    public static func < (a: BigUInt, b: BigUInt) -> Bool {
        if a.bytes.count != b.bytes.count { return a.bytes.count < b.bytes.count }
        return a.bytes.lexicographicallyPrecedes(b.bytes)
    }

    static func recortar(_ b: [UInt8]) -> [UInt8] {
        var i = 0
        while i < b.count && b[i] == 0 { i += 1 }
        return Array(b[i...])
    }
}
