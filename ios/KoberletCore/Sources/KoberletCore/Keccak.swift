// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation

/// Keccak-256, el hash de Ethereum. OJO: es el Keccak original, con relleno
/// 0x01...0x80, NO el SHA3-256 del NIST (relleno 0x06). CryptoKit no trae
/// ninguno de los dos, y esto son 90 lineas: se escribe y se prueba con los
/// selectores de las funciones, que son el keccak de su firma.
public enum Keccak {

    private static let rc: [UInt64] = [
        0x0000000000000001, 0x0000000000008082, 0x800000000000808a, 0x8000000080008000,
        0x000000000000808b, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
        0x000000000000008a, 0x0000000000000088, 0x0000000080008009, 0x000000008000000a,
        0x000000008000808b, 0x800000000000008b, 0x8000000000008089, 0x8000000000008003,
        0x8000000000008002, 0x8000000000000080, 0x000000000000800a, 0x800000008000000a,
        0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
    ]
    private static let rotc: [UInt64] = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44]
    private static let piln: [Int] = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1]

    @inline(__always)
    private static func rotl(_ x: UInt64, _ n: UInt64) -> UInt64 { (x << n) | (x >> (64 - n)) }

    private static func permutar(_ st: inout [UInt64]) {
        var bc = [UInt64](repeating: 0, count: 5)
        for ronda in 0..<24 {
            // theta
            for i in 0..<5 { bc[i] = st[i] ^ st[i + 5] ^ st[i + 10] ^ st[i + 15] ^ st[i + 20] }
            for i in 0..<5 {
                let t = bc[(i + 4) % 5] ^ rotl(bc[(i + 1) % 5], 1)
                for j in stride(from: 0, to: 25, by: 5) { st[j + i] ^= t }
            }
            // rho y pi
            var t = st[1]
            for i in 0..<24 {
                let j = piln[i]
                let guardado = st[j]
                st[j] = rotl(t, rotc[i])
                t = guardado
            }
            // chi
            for j in stride(from: 0, to: 25, by: 5) {
                for i in 0..<5 { bc[i] = st[j + i] }
                for i in 0..<5 { st[j + i] ^= (~bc[(i + 1) % 5]) & bc[(i + 2) % 5] }
            }
            // iota
            st[0] ^= rc[ronda]
        }
    }

    /// keccak256 del mensaje (32 bytes).
    public static func hash256(_ mensaje: [UInt8]) -> [UInt8] {
        let rate = 136                                   // 1600 - 2*256 bits, en bytes
        var st = [UInt64](repeating: 0, count: 25)
        var relleno = mensaje
        relleno.append(0x01)
        while relleno.count % rate != 0 { relleno.append(0) }
        relleno[relleno.count - 1] |= 0x80

        for inicio in stride(from: 0, to: relleno.count, by: rate) {
            for i in 0..<(rate / 8) {
                var palabra: UInt64 = 0
                for j in 0..<8 { palabra |= UInt64(relleno[inicio + i * 8 + j]) << (8 * UInt64(j)) }
                st[i] ^= palabra
            }
            permutar(&st)
        }

        var salida = [UInt8]()
        salida.reserveCapacity(32)
        for i in 0..<4 {
            for j in 0..<8 { salida.append(UInt8((st[i] >> (8 * UInt64(j))) & 0xff)) }
        }
        return salida
    }
}
