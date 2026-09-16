// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation
import LocalAuthentication
import Security
import KoberletCore

/// FACE ID O TOUCH ID EN LUGAR DE LA CONTRASEÑA.
///
/// Mismo planteamiento que Huella.kt en Android: la contraseña ES la llave que
/// descifra la boveda, asi que "no teclearla" solo puede ser guardarla en el
/// aparato envuelta por algo que exija identificarse. Aqui ese algo es el
/// Llavero con control de acceso `biometryCurrentSet`:
///
///   - el dato solo se lee tras Face ID / Touch ID, y el sistema saca el dialogo;
///   - si el dueño añade una cara o una huella nuevas, el dato se invalida solo
///     (es lo que hace `biometryCurrentSet` frente a `biometryAny`), que es lo
///     que quieres si te roban el telefono desbloqueado;
///   - solo existe mientras haya codigo en el iPhone (`WhenPasscodeSetThisDeviceOnly`)
///     y no viaja en copias de seguridad.
///
/// La pantalla lo dice con todas las letras: activar esto guarda la contraseña
/// en el aparato, cifrada y detras del chip, pero guardada.
enum Huella {

    private static let servicio = "es.dnns.koberlet.biometria.v1"
    private static let cuenta = "contrasena"

    private static var base: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: servicio,
         kSecAttrAccount as String: cuenta]
    }

    /// ¿Hay algo con lo que identificarse en este iPhone? nil = si; texto = por que no.
    static func disponible() -> String? {
        let ctx = LAContext()
        var error: NSError?
        if ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) { return nil }
        switch LAError.Code(rawValue: error?.code ?? 0) {
        case .biometryNotAvailable: return "Este iPhone no tiene Face ID ni Touch ID."
        case .biometryNotEnrolled: return "No hay ninguna cara ni huella configurada en este iPhone. Añádela en Ajustes."
        case .biometryLockout: return "Face ID / Touch ID está bloqueado. Desbloquéalo con el código del iPhone."
        case .passcodeNotSet: return "Este iPhone no tiene código. Ponle uno para poder usar la identificación."
        default: return "Este iPhone no admite identificación segura."
        }
    }

    /// ¿Esta activada? Se pregunta al Llavero SIN sacar el dialogo: si el dato
    /// esta pero exige identificarse, responde "no se permite interaccion", y
    /// eso es un si.
    static func activada() -> Bool {
        var q = base
        q[kSecUseAuthenticationUI as String] = kSecUseAuthenticationUIFail
        let st = SecItemCopyMatching(q as CFDictionary, nil)
        return st == errSecSuccess || st == errSecInteractionNotAllowed
    }

    static func borrar() {
        SecItemDelete(base as CFDictionary)
    }

    /// Guarda la contraseña envuelta. Una entrada nueva por cada activacion.
    static func guardar(_ contrasena: String) throws {
        if let motivo = disponible() { throw FalloBoveda.estado(motivo) }
        borrar()
        var error: Unmanaged<CFError>?
        guard let acl = SecAccessControlCreateWithFlags(
            nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, &error
        ) else {
            throw FalloBoveda.estado("No se pudo preparar la protección biométrica.")
        }
        var q = base
        q[kSecAttrAccessControl as String] = acl
        q[kSecValueData as String] = Data(contrasena.utf8)
        let st = SecItemAdd(q as CFDictionary, nil)
        guard st == errSecSuccess else {
            throw FalloBoveda.estado("No se pudo activar la identificación (\(st)).")
        }
    }

    /// Devuelve la contraseña guardada, tras identificarse. El dialogo lo saca el
    /// sistema al leer el Llavero; `titulo` es lo que se ve en el.
    ///
    /// Si el dato ya no vale -porque se añadio una cara o huella nueva- se borra
    /// y se dice: eso NO es un fallo, es la proteccion funcionando.
    static func recuperar(_ titulo: String) throws -> String {
        if !activada() { throw FalloBoveda.estado("La identificación no está activada.") }
        let ctx = LAContext()
        ctx.localizedReason = titulo
        var q = base
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        q[kSecUseAuthenticationContext as String] = ctx
        var salida: CFTypeRef?
        let st = SecItemCopyMatching(q as CFDictionary, &salida)
        switch st {
        case errSecSuccess:
            guard let d = salida as? Data, let s = String(data: d, encoding: .utf8) else {
                throw FalloBoveda.estado("No se pudo leer la contraseña guardada.")
            }
            return s
        case errSecUserCanceled:
            throw FalloBoveda.estado("Se canceló la identificación.")
        case errSecAuthFailed, errSecItemNotFound:
            borrar()
            throw FalloBoveda.estado("La identificación ya no vale en este iPhone. Vuelve a activarla con tu contraseña.")
        default:
            throw FalloBoveda.estado("No se pudo identificar (\(st)).")
        }
    }
}
