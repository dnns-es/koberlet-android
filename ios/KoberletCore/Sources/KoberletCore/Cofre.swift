// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation
import CryptoKit
import CryptoSwift

/// EL COFRE - cifrado y descifrado de la boveda.
///
/// Mismo formato de fichero que el Koberlet de escritorio y que el de Android:
///
///   { v, kdf: { salt, N, r, p }, iv, tag, ct }   todo en base64
///
/// AES-256-GCM con clave derivada por scrypt. Que el formato sea EL MISMO es lo
/// que permite llevar una copia del ordenador al iPhone, del iPhone al Android y
/// al reves. Si aqui se usara otro "porque en iOS es mas comodo", esa puerta se
/// cerraba para siempre.
public enum Cofre {

    // scrypt: mismos parametros que el escritorio y Android. En un iPhone
    // moderno tarda entre uno y tres segundos, y es tiempo bien gastado: es lo
    // que hace inviable probar contrasenas a lo bruto sobre una boveda robada.
    public static let N = 1 << 15
    public static let R = 8
    public static let P = 1
    private static let largoClave = 32

    // Suelo anti-rebaja: una boveda que llegue con parametros flojos se rechaza.
    // Si no, bastaria con editar el fichero robado y poner N=2 para que probar
    // contrasenas saliera gratis.
    private static let nMinimo = 1 << 14

    public static func derivar(_ contrasena: String, _ sal: [UInt8], n: Int = N, r: Int = R, p: Int = P) throws -> [UInt8] {
        do {
            return try Scrypt(password: Array(contrasena.utf8), salt: sal, dkLen: largoClave, N: n, r: r, p: p).calculate()
        } catch {
            throw FalloBoveda.bovedaCorrupta("No se pudo derivar la clave de la bóveda.")
        }
    }

    /// Cifra `claro` y devuelve el JSON de la boveda. El IV es NUEVO en cada
    /// escritura: en GCM repetirlo destruye la seguridad.
    ///
    /// `n` existe solo para los tests, que usan scrypt flojo para no tardar
    /// segundos por prueba; la app escribe siempre con N.
    public static func cifrar(_ clave: [UInt8], _ sal: [UInt8], _ claro: String, n: Int = N) throws -> String {
        let iv = Aleatorio.bytes(12)
        let sellado: CryptoKit.AES.GCM.SealedBox
        do {
            sellado = try CryptoKit.AES.GCM.seal(
                Data(claro.utf8),
                using: SymmetricKey(data: clave),
                nonce: try CryptoKit.AES.GCM.Nonce(data: iv)
            )
        } catch {
            throw FalloBoveda.bovedaCorrupta("No se pudo cifrar la bóveda.")
        }
        let b64 = { (d: Data) in d.base64EncodedString() }
        return "{\"v\":1,\"kdf\":{\"salt\":\"\(b64(Data(sal)))\",\"N\":\(n),\"r\":\(R),\"p\":\(P)}," +
            "\"iv\":\"\(b64(Data(iv)))\",\"tag\":\"\(b64(sellado.tag))\",\"ct\":\"\(b64(sellado.ciphertext))\"}"
    }

    /// Descifra. Lanza `contrasenaIncorrecta` si no cuadra (en GCM no se puede
    /// distinguir de un fichero manipulado, y da igual).
    public static func descifrar(_ json: String, _ contrasena: String) throws -> String {
        guard let o = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? JSON,
              let kdf = o["kdf"] as? JSON,
              let n = kdf["N"] as? Int, let r = kdf["r"] as? Int, let p = kdf["p"] as? Int,
              let salB64 = kdf["salt"] as? String, let sal = Data(base64Encoded: salB64),
              let ivB64 = o["iv"] as? String, let iv = Data(base64Encoded: ivB64),
              let tagB64 = o["tag"] as? String, let tag = Data(base64Encoded: tagB64),
              let ctB64 = o["ct"] as? String, let ct = Data(base64Encoded: ctB64)
        else {
            throw FalloBoveda.bovedaCorrupta("El fichero de la bóveda no tiene la forma esperada.")
        }
        if n < nMinimo || r < 8 || p < 1 {
            throw FalloBoveda.bovedaCorrupta("Los parámetros de cifrado de esta bóveda están por debajo del mínimo de seguridad.")
        }
        var clave = try derivar(contrasena, Array(sal), n: n, r: r, p: p)
        defer { for i in clave.indices { clave[i] = 0 } }
        do {
            let caja = try CryptoKit.AES.GCM.SealedBox(nonce: CryptoKit.AES.GCM.Nonce(data: iv), ciphertext: ct, tag: tag)
            let claro = try CryptoKit.AES.GCM.open(caja, using: SymmetricKey(data: clave))
            guard let texto = String(data: claro, encoding: .utf8) else { throw FalloBoveda.contrasenaIncorrecta }
            return texto
        } catch {
            throw FalloBoveda.contrasenaIncorrecta
        }
    }

    public static func salNueva() -> [UInt8] { Aleatorio.bytes(16) }
}
