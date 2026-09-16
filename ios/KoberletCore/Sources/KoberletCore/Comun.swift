// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation
import Security

/// Un objeto JSON tal como lo da Foundation. Se usa en toda la boveda para el
/// contenido de `vault.json`, igual que en Android se usa JSONObject.
public typealias JSON = [String: Any]

/// Los fallos de la boveda. El plugin los convierte en el texto que ve el dueño:
/// por eso cada uno lleva su mensaje ya escrito, en español, como en Kotlin.
public enum FalloBoveda: Error {
    case contrasenaIncorrecta
    case bovedaCorrupta(String)
    case argumento(String)
    case estado(String)

    public var mensaje: String {
        switch self {
        case .contrasenaIncorrecta: return "Contraseña incorrecta."
        case .bovedaCorrupta(let m), .argumento(let m), .estado(let m): return m
        }
    }
}

public enum Hex {
    public static func aHex(_ bytes: [UInt8]) -> String {
        bytes.map { String(format: "%02x", $0) }.joined()
    }

    /// El camino de vuelta de `aHex`. Exige pares completos y solo hex.
    public static func deHex(_ texto: String) throws -> [UInt8] {
        var h = texto.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if h.hasPrefix("0x") { h = String(h.dropFirst(2)) }
        guard h.count % 2 == 0, h.range(of: "^[0-9a-f]*$", options: .regularExpression) != nil else {
            throw FalloBoveda.argumento("Eso no es hexadecimal.")
        }
        var salida = [UInt8]()
        salida.reserveCapacity(h.count / 2)
        var i = h.startIndex
        while i < h.endIndex {
            let j = h.index(i, offsetBy: 2)
            salida.append(UInt8(h[i..<j], radix: 16)!)
            i = j
        }
        return salida
    }
}

public enum Aleatorio {
    /// Bytes del generador del sistema. Si el sistema no puede darlos -no pasa-
    /// se aborta: una semilla sin entropia es peor que ninguna semilla.
    public static func bytes(_ n: Int) -> [UInt8] {
        var b = [UInt8](repeating: 0, count: n)
        let r = SecRandomCopyBytes(kSecRandomDefault, n, &b)
        precondition(r == errSecSuccess, "El sistema no ha dado bytes aleatorios")
        return b
    }
}

extension String {
    /// ¿Casa entera con este patron? Los patrones de la boveda llevan ^ y $.
    func casa(_ patron: String) -> Bool {
        range(of: patron, options: .regularExpression) != nil
    }
}

public enum Base64Url {
    /// base64url sin relleno, como lo quiere Pact para el hash.
    public static func codificar(_ bytes: [UInt8]) -> String {
        Data(bytes).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
