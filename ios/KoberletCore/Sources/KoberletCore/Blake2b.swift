// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation

/// BLAKE2b, el hash de los comandos Pact (Chainweb usa blake2b-256).
///
/// Escrito a mano porque CryptoKit no lo trae y no compensa arrastrar una
/// dependencia mas para 80 lineas de RFC 7693. Sin clave y sin arbol: solo lo
/// que Kadena usa. Los vectores del RFC estan en los tests.
public enum Blake2b {

    private static let iv: [UInt64] = [
        0x6a09e667f3bcc908, 0xbb67ae8584caa73b, 0x3c6ef372fe94f82b, 0xa54ff53a5f1d36f1,
        0x510e527fade682d1, 0x9b05688c2b3e6c1f, 0x1f83d9abfb41bd6b, 0x5be0cd19137e2179,
    ]

    private static let sigma: [[Int]] = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
        [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
        [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
        [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
        [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
        [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
        [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
        [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
        [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    ]

    /// Resumen de `size` bytes (1...64) del mensaje.
    public static func hash(_ mensaje: [UInt8], size: Int = 32) -> [UInt8] {
        precondition(size >= 1 && size <= 64)
        var h = iv
        h[0] ^= 0x01010000 ^ UInt64(size)           // sin clave: kk = 0

        var contados: UInt64 = 0
        var desde = 0
        let total = mensaje.count
        while total - desde > 128 {
            contados += 128
            comprimir(&h, Array(mensaje[desde..<desde + 128]), contados, ultimo: false)
            desde += 128
        }
        var bloque = Array(mensaje[desde..<total])
        contados += UInt64(bloque.count)
        bloque += [UInt8](repeating: 0, count: 128 - bloque.count)
        comprimir(&h, bloque, contados, ultimo: true)

        var salida = [UInt8]()
        salida.reserveCapacity(64)
        for palabra in h {
            for i in 0..<8 { salida.append(UInt8((palabra >> (8 * UInt64(i))) & 0xff)) }
        }
        return Array(salida[0..<size])
    }

    private static func comprimir(_ h: inout [UInt64], _ bloque: [UInt8], _ t: UInt64, ultimo: Bool) {
        var v = h + iv
        v[12] ^= t                                   // contador, parte baja; la alta es 0
        if ultimo { v[14] = ~v[14] }

        var m = [UInt64](repeating: 0, count: 16)
        for i in 0..<16 {
            var palabra: UInt64 = 0
            for j in 0..<8 { palabra |= UInt64(bloque[i * 8 + j]) << (8 * UInt64(j)) }
            m[i] = palabra
        }

        for ronda in 0..<12 {
            let s = sigma[ronda]
            mezclar(&v, 0, 4, 8, 12, m[s[0]], m[s[1]])
            mezclar(&v, 1, 5, 9, 13, m[s[2]], m[s[3]])
            mezclar(&v, 2, 6, 10, 14, m[s[4]], m[s[5]])
            mezclar(&v, 3, 7, 11, 15, m[s[6]], m[s[7]])
            mezclar(&v, 0, 5, 10, 15, m[s[8]], m[s[9]])
            mezclar(&v, 1, 6, 11, 12, m[s[10]], m[s[11]])
            mezclar(&v, 2, 7, 8, 13, m[s[12]], m[s[13]])
            mezclar(&v, 3, 4, 9, 14, m[s[14]], m[s[15]])
        }
        for i in 0..<8 { h[i] ^= v[i] ^ v[i + 8] }
    }

    @inline(__always)
    private static func rotar(_ x: UInt64, _ n: UInt64) -> UInt64 {
        (x >> n) | (x << (64 - n))
    }

    @inline(__always)
    private static func mezclar(_ v: inout [UInt64], _ a: Int, _ b: Int, _ c: Int, _ d: Int, _ x: UInt64, _ y: UInt64) {
        v[a] = v[a] &+ v[b] &+ x
        v[d] = rotar(v[d] ^ v[a], 32)
        v[c] = v[c] &+ v[d]
        v[b] = rotar(v[b] ^ v[c], 24)
        v[a] = v[a] &+ v[b] &+ y
        v[d] = rotar(v[d] ^ v[a], 16)
        v[c] = v[c] &+ v[d]
        v[b] = rotar(v[b] ^ v[c], 63)
    }
}
