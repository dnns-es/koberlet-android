// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation
import UIKit
import Capacitor
import KoberletCore

/// LA BOVEDA - plugin nativo, version iPhone.
///
/// Hace exactamente lo que KoberletVault.kt en Android, con el mismo nombre de
/// plugin y los mismos metodos: la parte web (src/boveda/nativa.js) no distingue
/// en que movil corre. Lo que cruza al WebView son cuentas PUBLICAS, la semilla
/// una sola vez al crearla, y una privada concreta solo por `exportar` con la
/// contraseña. Lo que NO cruza nunca: las semillas guardadas, las privadas
/// derivadas y la clave de cifrado.
///
/// El fichero es `vault.json`, con el MISMO formato que Android y escritorio, en
/// la carpeta privada de la app, fuera de las copias de iCloud.
@objc(KoberletVault)
public class KoberletVault: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "KoberletVault"
    public let jsName = "KoberletVault"
    public let pluginMethods: [CAPPluginMethod] = [
        "estado", "crear", "importar", "importarClave", "renombrarCartera", "borrarCartera",
        "abrir", "cerrar", "cuentas", "exportar", "borrarTodo", "exportarBoveda", "importarBoveda",
        "firmarEnvioKda", "firmarEnvioCrossKda", "firmarPuenteEvm", "firmarEnvioToken", "firmarCambioAmm",
        "firmarCrearDca", "firmarGestionDca",
        "firmarPermisoEvm", "firmarEnvioEvm", "firmarCambioEvm", "firmarPuenteHaciaKadena",
        "bioEstado", "bioActivar", "bioBorrar",
    ].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }

    /// Sesion abierta. Vive SOLO en memoria y muere con el proceso.
    private var sesion: JSON?

    // --- Fichero ------------------------------------------------------------

    private var carpeta: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }
    private var fichero: URL { carpeta.appendingPathComponent("vault.json") }
    private var existe: Bool { FileManager.default.fileExists(atPath: fichero.path) }

    private func leer() throws -> String {
        try String(contentsOf: fichero, encoding: .utf8)
    }

    /// Escritura atomica, fuera de las copias de iCloud y protegida por el
    /// cifrado del sistema hasta el primer desbloqueo. Lo de iCloud no es
    /// desconfianza del cifrado propio: es que la boveda no tiene que salir del
    /// aparato sin que el dueño lo pida (para eso esta `exportarBoveda`).
    private func escribir(_ url: URL, _ texto: String) throws {
        try texto.write(to: url, atomically: true, encoding: .utf8)
        var u = url
        var v = URLResourceValues()
        v.isExcludedFromBackup = true
        try? u.setResourceValues(v)
        try? FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
    }

    // --- Estado -------------------------------------------------------------

    @objc func estado(_ call: CAPPluginCall) {
        call.resolve(["existe": existe, "abierta": sesion != nil])
    }

    // --- Crear / importar ---------------------------------------------------

    @objc func crear(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        let etiqueta = call.getString("etiqueta") ?? "Mi cartera"
        let red = call.getString("red") ?? "kda"
        hilo(call) {
            let semilla = Derivacion.generarSemilla()
            let datos = try self.anadirCartera(contrasena, semilla, etiqueta, red)
            return ["semilla": semilla, "cuentas": self.cuentasPublicas(datos)]
        }
    }

    @objc func importar(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        let etiqueta = call.getString("etiqueta") ?? "Cartera importada"
        let red = call.getString("red") ?? "kda"
        guard let cruda = call.getString("semilla") else { return call.reject("Falta la semilla.") }
        let semilla = cruda.lowercased()
            .split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "\t" || $0 == "\r" })
            .joined(separator: " ")
        // Se comprueba el control de la semilla ANTES de guardar nada.
        if !Derivacion.semillaValida(semilla) {
            return call.reject("Esa semilla no es válida: repasa las palabras, alguna no cuadra.")
        }
        hilo(call) {
            let datos = try self.anadirCartera(contrasena, semilla, etiqueta, red)
            return ["cuentas": self.cuentasPublicas(datos)]
        }
    }

    @objc func importarClave(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        let etiqueta = call.getString("etiqueta") ?? "Cartera importada"
        let red = call.getString("red") ?? "kda"
        guard let cruda = call.getString("privada") else { return call.reject("Falta la clave privada.") }
        let privada: String
        do {
            privada = try Carteras.normalizarClave(cruda, red)
        } catch let e as FalloBoveda {
            return call.reject(e.mensaje)
        } catch {
            return call.reject("Esa clave privada no vale.")
        }
        hilo(call) {
            let datos = try self.anadirCarteraConClave(contrasena, privada, etiqueta, red)
            return ["cuentas": self.cuentasPublicas(datos)]
        }
    }

    // --- Abrir / cerrar -----------------------------------------------------

    @objc func abrir(_ call: CAPPluginCall) {
        if !existe { return call.reject("No hay ninguna cartera en este aparato.") }
        conContrasena(call, "Abre tu cartera") { contrasena in self.abrirCon(call, contrasena) }
    }

    private func abrirCon(_ call: CAPPluginCall, _ contrasena: String) {
        hilo(call) {
            let crudo = try self.parsear(try Cofre.descifrar(try self.leer(), contrasena))
            let datos = Carteras.normalizar(crudo)
            let viejo = (crudo["v"] as? Int) ?? 1
            // Formato viejo: se guarda migrado, con copia previa del fichero tal
            // cual estaba. Si no se puede guardar, se sigue en memoria.
            if viejo < Carteras.VERSION {
                do {
                    let copia = self.carpeta.appendingPathComponent("boveda-antes-de-v\(Carteras.VERSION).bak")
                    try? FileManager.default.removeItem(at: copia)
                    try FileManager.default.copyItem(at: self.fichero, to: copia)
                    try self.guardar(contrasena, datos)
                } catch { }
            }
            self.sesion = datos
            return ["cuentas": self.cuentasPublicas(datos)]
        }
    }

    @objc func cerrar(_ call: CAPPluginCall) {
        sesion = nil
        call.resolve()
    }

    @objc func cuentas(_ call: CAPPluginCall) {
        guard let datos = sesion else { return call.reject("La cartera está bloqueada.") }
        call.resolve(["cuentas": cuentasPublicas(datos)])
    }

    // --- Gestion de carteras ------------------------------------------------

    @objc func renombrarCartera(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        guard let id = call.getString("id") else { return call.reject("Falta la cartera.") }
        guard let etiqueta = call.getString("etiqueta") else { return call.reject("Falta el nombre.") }
        hilo(call) {
            let datos = try Carteras.renombrar(try self.abrirFichero(contrasena), id, etiqueta)
            try self.guardar(contrasena, datos)
            self.sesion = datos
            return ["cuentas": self.cuentasPublicas(datos)]
        }
    }

    @objc func borrarCartera(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        guard let id = call.getString("id") else { return call.reject("Falta la cartera.") }
        hilo(call) {
            let datos = try Carteras.quitar(try self.abrirFichero(contrasena), id)
            try self.guardar(contrasena, datos)
            self.sesion = datos
            return ["cuentas": self.cuentasPublicas(datos)]
        }
    }

    // --- Exportar / borrar todo ---------------------------------------------

    @objc func exportar(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        guard let id = call.getString("id") else { return call.reject("Falta qué exportar.") }
        if !existe { return call.reject("No hay ninguna cartera en este aparato.") }
        hilo(call) {
            let datos = try self.abrirFichero(contrasena)
            let privada: String
            if id.hasPrefix("semilla:") {
                guard let c = Carteras.buscar(datos, String(id.dropFirst("semilla:".count))) else {
                    throw FalloBoveda.argumento("Esa cartera no existe.")
                }
                if !Carteras.esDeSemilla(c) {
                    throw FalloBoveda.argumento("Esa cartera se metió con su clave privada: no tiene palabras.")
                }
                privada = (c["semilla"] as? String) ?? ""
            } else if id.hasSuffix("-kda") || id.hasSuffix("-evm") {
                let carteraId = String(id.dropLast(4))
                guard let c = Carteras.buscar(datos, carteraId) else { throw FalloBoveda.argumento("Esa cartera no existe.") }
                var bytes = try Carteras.privadaDe(c)
                defer { for i in bytes.indices { bytes[i] = 0 } }
                privada = id.hasSuffix("-kda") ? Hex.aHex(bytes) : "0x" + Hex.aHex(bytes)
            } else {
                throw FalloBoveda.argumento("No sé qué es eso que quieres exportar.")
            }
            return ["privada": privada]
        }
    }

    @objc func borrarTodo(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        if !existe { return call.reject("No hay ninguna cartera en este aparato.") }
        hilo(call) {
            _ = try self.abrirFichero(contrasena)          // no se borra nada sin demostrar que eres el dueño
            try FileManager.default.removeItem(at: self.fichero)
            self.sesion = nil
            return [:]
        }
    }

    // --- Copia de seguridad -------------------------------------------------

    /// Saca el fichero de la boveda TAL CUAL (cifrado) por la hoja de compartir
    /// del sistema, para guardarlo en Archivos, mandarlo por AirDrop, etc.
    @objc func exportarBoveda(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        if !existe { return call.reject("No hay ninguna cartera en este aparato.") }
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let contenido = try self.leer()
                _ = try Cofre.descifrar(contenido, contrasena)     // solo para comprobar que es el dueño
                let copia = FileManager.default.temporaryDirectory.appendingPathComponent("koberlet-vault.json")
                try contenido.write(to: copia, atomically: true, encoding: .utf8)
                DispatchQueue.main.async {
                    guard let vc = self.bridge?.viewController else {
                        return call.reject("No se puede abrir la hoja de compartir ahora mismo.")
                    }
                    let hoja = UIActivityViewController(activityItems: [copia], applicationActivities: nil)
                    hoja.popoverPresentationController?.sourceView = vc.view
                    vc.present(hoja, animated: true)
                    call.resolve(["compartido": true])
                }
            } catch FalloBoveda.contrasenaIncorrecta {
                call.reject("Contraseña incorrecta.")
            } catch let e as FalloBoveda {
                call.reject(e.mensaje)
            } catch {
                call.reject("No se pudo preparar la copia.")
            }
        }
    }

    /// Mete una copia hecha en otro sitio. Antes de pisar nada se comprueba que
    /// abre con la contraseña que dan, y si ya habia cartera se guarda a un lado.
    @objc func importarBoveda(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        guard let contenido = call.getString("contenido") else { return call.reject("Falta el fichero de la copia.") }
        hilo(call) {
            let claro = try Cofre.descifrar(contenido, contrasena)
            guard let crudo = (try? JSONSerialization.jsonObject(with: Data(claro.utf8))) as? JSON else {
                throw FalloBoveda.estado("El fichero se abre, pero no tiene dentro una cartera de Koberlet.")
            }
            let datos = Carteras.normalizar(crudo)
            if self.existe {
                let aparte = self.carpeta.appendingPathComponent("vault-anterior-\(Int64(Date().timeIntervalSince1970 * 1000)).json")
                try self.escribir(aparte, try self.leer())
            }
            try self.escribir(self.fichero, contenido)
            self.sesion = datos
            return ["cuentas": self.cuentasPublicas(datos)]
        }
    }

    // --- Firmar en Kadena ---------------------------------------------------
    //
    // Como en Android: el WebView manda los datos del envio y el comando Pact se
    // monta en FirmaKda desde una plantilla fija; la cuenta de origen es la de la
    // cartera, derivada aqui; y la contraseña (o Face ID) se exige en CADA firma.

    /// La hora la pone el nodo, no el movil. Si lo que llega no es creible, la
    /// local con margen.
    private func creation(_ call: CAPPluginCall) -> Int64 {
        let ahora = Int64(Date().timeIntervalSince1970)
        if let s = call.getString("creationTime"), let nodo = Int64(s), abs(nodo - ahora) < 86400 { return nodo }
        return ahora - 90
    }

    /// Lo comun a toda firma Kadena: abrir, buscar la cartera, sacar privada y
    /// publica, firmar con ellas y borrar la privada al terminar.
    private func firmaKda(_ call: CAPPluginCall, _ titulo: String,
                          _ montar: @escaping (_ privada: [UInt8], _ publica: String, _ creation: Int64, _ cartera: JSON) throws -> JSON) {
        guard let carteraId = call.getString("carteraId") else { return call.reject("Falta la cartera.") }
        if !existe { return call.reject("No hay ninguna cartera en este aparato.") }
        let creation = self.creation(call)
        conContrasena(call, titulo) { contrasena in
            self.hilo(call) {
                let datos = try self.abrirFichero(contrasena)
                guard let cartera = Carteras.buscar(datos, carteraId) else { throw FalloBoveda.argumento("Esa cartera no existe.") }
                var privada = try Carteras.privadaDe(cartera)
                defer { for i in privada.indices { privada[i] = 0 } }
                let publica = try Derivacion.publicaKadena(privada)
                return try montar(privada, publica, creation, cartera)
            }
        }
    }

    @objc func firmarEnvioKda(_ call: CAPPluginCall) {
        guard let networkId = call.getString("networkId") else { return call.reject("Falta la red.") }
        guard let chain = call.getString("chain") else { return call.reject("Falta la chain.") }
        guard let para = call.getString("para") else { return call.reject("Falta el destinatario.") }
        guard let cantidad = call.getDouble("cantidad") else { return call.reject("Falta la cantidad.") }
        firmaKda(call, "Firma el envío") { privada, publica, creation, _ in
            try FirmaKda.envioKda(networkId: networkId, chain: chain, de: "k:\(publica)", para: para, cantidad: cantidad,
                                  privada: privada, publica: publica, creationTime: creation)
        }
    }

    @objc func firmarEnvioCrossKda(_ call: CAPPluginCall) {
        guard let networkId = call.getString("networkId") else { return call.reject("Falta la red.") }
        guard let chain = call.getString("chain") else { return call.reject("Falta la chain.") }
        guard let chainDestino = call.getString("chainDestino") else { return call.reject("Falta la chain de destino.") }
        guard let para = call.getString("para") else { return call.reject("Falta el destinatario.") }
        guard let cantidad = call.getDouble("cantidad") else { return call.reject("Falta la cantidad.") }
        firmaKda(call, "Firma el envío entre chains") { privada, publica, creation, _ in
            try FirmaKda.envioCrossChain(networkId: networkId, chainOrigen: chain, chainDestino: chainDestino,
                                         de: "k:\(publica)", para: para, cantidad: cantidad,
                                         privada: privada, publica: publica, creationTime: creation)
        }
    }

    @objc func firmarPuenteEvm(_ call: CAPPluginCall) {
        guard let networkId = call.getString("networkId") else { return call.reject("Falta la red.") }
        guard let destinoEth = call.getString("destinoEth") else { return call.reject("Falta la dirección de Ethereum.") }
        guard let cantidad = call.getDouble("cantidad") else { return call.reject("Falta la cantidad.") }
        guard let peaje = call.getDouble("peaje") else { return call.reject("Falta el peaje del puente.") }
        guard let cuentaPeaje = call.getString("cuentaPeaje") else { return call.reject("Falta la cuenta del peaje.") }
        firmaKda(call, "Firma el envío por el puente") { privada, publica, creation, _ in
            try FirmaKda.envioPuenteEvm(networkId: networkId, de: "k:\(publica)", destinoEth: destinoEth, cantidad: cantidad,
                                        peaje: peaje, cuentaPeaje: cuentaPeaje, privada: privada, publica: publica, creationTime: creation)
        }
    }

    @objc func firmarEnvioToken(_ call: CAPPluginCall) {
        guard let networkId = call.getString("networkId") else { return call.reject("Falta la red.") }
        guard let chain = call.getString("chain") else { return call.reject("Falta la chain.") }
        guard let modulo = call.getString("modulo") else { return call.reject("Falta el contrato del token.") }
        guard let para = call.getString("para") else { return call.reject("Falta la cuenta de destino.") }
        guard let cantidad = call.getDouble("cantidad") else { return call.reject("Falta la cantidad.") }
        let precision = call.getInt("precision") ?? 12
        firmaKda(call, "Firma el envío") { privada, publica, creation, _ in
            try FirmaKda.envioToken(networkId: networkId, chain: chain, modulo: modulo, de: "k:\(publica)", para: para,
                                    cantidad: cantidad, precision: precision, privada: privada, publica: publica, creationTime: creation)
        }
    }

    @objc func firmarCambioAmm(_ call: CAPPluginCall) {
        guard let networkId = call.getString("networkId") else { return call.reject("Falta la red.") }
        guard let pool = call.getString("pool") else { return call.reject("Falta la cuenta del pool.") }
        guard let cantidad = call.getString("cantidad") else { return call.reject("Falta la cantidad.") }
        guard let minimo = call.getString("minimo") else { return call.reject("Falta el mínimo que aceptas recibir.") }
        guard let caminoJs = call.getArray("camino") else { return call.reject("Falta el camino del cambio.") }
        let camino = caminoJs.compactMap { $0 as? String }
        // La comisión de servicio: la pantalla dice cuánto, `FirmaKda` dice a dónde
        // y comprueba que no pase del 0,5 %. Si no viene, no se cobra nada.
        let comision = call.getString("comision") ?? "0.0"
        firmaKda(call, "Firma el cambio") { privada, publica, creation, _ in
            try FirmaKda.cambioAmm(networkId: networkId, camino: camino, cuenta: "k:\(publica)", poolPrimerSalto: pool,
                                   cantidad: cantidad, minimo: minimo, privada: privada, publica: publica, creationTime: creation,
                                   comision: comision)
        }
    }

    @objc func firmarCrearDca(_ call: CAPPluginCall) {
        guard let networkId = call.getString("networkId") else { return call.reject("Falta la red.") }
        guard let haciaUsdc = call.getBool("haciaUsdc") else { return call.reject("Falta el sentido de la compra.") }
        guard let deposito = call.getDouble("deposito") else { return call.reject("Falta la cantidad.") }
        guard let cuota = call.getDouble("cuota") else { return call.reject("Falta la cantidad.") }
        guard let periodo = call.getString("periodo").flatMap({ Int64($0) }) else { return call.reject("Falta cada cuánto se compra.") }
        guard let deslizamiento = call.getDouble("deslizamiento") else { return call.reject("Falta el deslizamiento.") }
        firmaKda(call, "Firma el plan de compras") { privada, publica, creation, cartera in
            if Carteras.redDe(cartera) != "kda" {
                throw FalloBoveda.argumento("Los planes de compra son de Kadena: elige una cartera de Kadena.")
            }
            return try FirmaKda.crearPlanDca(networkId: networkId, owner: "k:\(publica)", haciaUsdc: haciaUsdc, deposito: deposito,
                                             cuota: cuota, periodo: periodo, deslizamiento: deslizamiento,
                                             privada: privada, publica: publica, creationTime: creation)
        }
    }

    @objc func firmarGestionDca(_ call: CAPPluginCall) {
        guard let networkId = call.getString("networkId") else { return call.reject("Falta la red.") }
        guard let accion = call.getString("accion") else { return call.reject("Falta la acción.") }
        guard let id = call.getString("id") else { return call.reject("Falta el plan.") }
        let cantidad = call.getDouble("cantidad") ?? 0.0
        let entraEsUsdc = call.getBool("entraEsUsdc") ?? false
        firmaKda(call, "Firma el cambio en el plan") { privada, publica, creation, cartera in
            if Carteras.redDe(cartera) != "kda" {
                throw FalloBoveda.argumento("Los planes de compra son de Kadena: elige una cartera de Kadena.")
            }
            return try FirmaKda.gestionarPlanDca(networkId: networkId, accion: accion, id: id, owner: "k:\(publica)",
                                                 cantidad: cantidad, entraEsUsdc: entraEsUsdc,
                                                 privada: privada, publica: publica, creationTime: creation)
        }
    }

    // --- Ethereum ------------------------------------------------------------
    //
    // Mismo reparto: de la pantalla vienen cantidades y una cuenta de destino;
    // el contrato al que se llama, la funcion y la cadena los pone FirmaEvm.
    // Lo que devuelve es un `rawTransaction` ya firmado que la pantalla reenvia.

    /// Lo que la pantalla puede decir del gas, comprobado luego en FirmaEvm.
    private func sobreDe(_ call: CAPPluginCall) throws -> FirmaEvm.Sobre {
        guard let nonce = call.getString("nonce").flatMap({ Int64($0) }) else { throw FalloBoveda.argumento("Falta el nonce de la cuenta.") }
        guard let gasLimit = call.getString("gasLimit").flatMap({ Int64($0) }) else { throw FalloBoveda.argumento("Falta el límite de gas.") }
        guard let maxFee = call.getString("maxFeePerGas").flatMap({ BigUInt(decimal: $0) }) else { throw FalloBoveda.argumento("Falta el precio del gas.") }
        guard let propina = call.getString("maxPriorityFeePerGas").flatMap({ BigUInt(decimal: $0) }) else { throw FalloBoveda.argumento("Falta la propina del gas.") }
        return FirmaEvm.Sobre(nonce: nonce, gasLimit: gasLimit, maxFeePerGas: maxFee, maxPriorityFeePerGas: propina)
    }

    /// Lo comun a toda firma Ethereum: abrir, exigir que la cartera sea de
    /// Ethereum, sacar la privada, firmar y borrarla.
    private func firmaEvm(_ call: CAPPluginCall, _ titulo: String,
                          _ montar: @escaping (_ privada: [UInt8], _ sobre: FirmaEvm.Sobre) throws -> String) {
        guard let carteraId = call.getString("carteraId") else { return call.reject("Falta la cartera.") }
        if !existe { return call.reject("No hay ninguna cartera en este aparato.") }
        conContrasena(call, titulo) { contrasena in
            self.hilo(call) {
                let sobre = try self.sobreDe(call)
                let datos = try self.abrirFichero(contrasena)
                guard let cartera = Carteras.buscar(datos, carteraId) else { throw FalloBoveda.argumento("Esa cartera no existe.") }
                if Carteras.redDe(cartera) != "evm" { throw FalloBoveda.argumento("Esa cartera no es de Ethereum.") }
                var privada = try Carteras.privadaDe(cartera)
                defer { for i in privada.indices { privada[i] = 0 } }
                return ["raw": try montar(privada, sobre)]
            }
        }
    }

    /// El PERMISO para que el puente (o Uniswap) pueda mover tu USDC. A quien se
    /// autoriza sale de una lista CERRADA de dos nombres; la cantidad es la justa.
    @objc func firmarPermisoEvm(_ call: CAPPluginCall) {
        guard let cantidad = call.getString("cantidad") else { return call.reject("Falta la cantidad.") }
        let paraQue = call.getString("para") ?? "puente"
        let decimales = call.getInt("decimales") ?? FirmaEvm.decimalesUsdc
        let claveRuta = call.getString("ruta") ?? ""
        firmaEvm(call, "Autoriza el token en Ethereum") { privada, sobre in
            let unidades = try FirmaEvm.aUnidades(cantidad, decimales)
            let contrato: String
            let datosPermiso: [UInt8]
            switch paraQue {
            case "puente":
                contrato = FirmaEvm.tokenUsdc
                datosPermiso = try FirmaEvm.datosPermiso(unidades)
            case "mercado":
                let ruta = try SwapEvm.ruta(claveRuta)
                contrato = ruta.tokenIn
                datosPermiso = try Hex.deHex(try SwapEvm.datosPermiso(unidades))
            default:
                throw FalloBoveda.argumento("No se sabe a quién habría que autorizar.")
            }
            return try FirmaEvm.transaccionFirmada(a: contrato, valorWei: BigUInt.cero, datos: datosPermiso, sobre: sobre, privada: privada)
        }
    }

    /// Un ENVIO normal en Ethereum: ETH, USDC o USDT. El token llega por su
    /// nombre de una lista de tres; el contrato lo pone este fichero.
    @objc func firmarEnvioEvm(_ call: CAPPluginCall) {
        guard let token = call.getString("token") else { return call.reject("Falta qué se envía.") }
        guard let para = call.getString("para") else { return call.reject("Falta la cuenta de destino.") }
        guard let cantidad = call.getString("cantidad") else { return call.reject("Falta la cantidad.") }
        firmaEvm(call, "Firma el envío") { privada, sobre in
            let destino = try FirmaEvm.direccionValida(para)
            switch token {
            case "ETH":
                return try FirmaEvm.transaccionFirmada(a: destino, valorWei: try FirmaEvm.aUnidades(cantidad, 18),
                                                       datos: [], sobre: sobre, privada: privada)
            case "USDC", "USDT":
                let contrato = token == "USDC" ? FirmaEvm.tokenUsdc : FirmaEvm.tokenUsdt
                let unidades = try FirmaEvm.aUnidades(cantidad, FirmaEvm.decimalesUsdc)
                return try FirmaEvm.transaccionFirmada(a: contrato, valorWei: BigUInt.cero,
                                                       datos: try FirmaEvm.datosEnvioToken(destino, unidades), sobre: sobre, privada: privada)
            default:
                throw FalloBoveda.argumento("Ese token no está entre los que sabe enviar la app.")
            }
        }
    }

    /// Un CAMBIO en Uniswap. La ruta por su nombre, la comision del pool, cuanto
    /// entra y el minimo que se acepta recibir, que va dentro de lo firmado.
    @objc func firmarCambioEvm(_ call: CAPPluginCall) {
        guard let claveRuta = call.getString("ruta") else { return call.reject("Falta el cambio que se quiere hacer.") }
        guard let comision = call.getInt("comision") else { return call.reject("Falta la comisión del pool.") }
        guard let cantidad = call.getString("cantidad") else { return call.reject("Falta la cantidad.") }
        guard let minimo = call.getString("minimo") else { return call.reject("Falta el mínimo que aceptas recibir.") }
        firmaEvm(call, "Firma el cambio") { privada, sobre in
            let ruta = try SwapEvm.ruta(claveRuta)
            let cuenta = try Derivacion.direccionEvm(privada)
            let entra = try FirmaEvm.aUnidades(cantidad, ruta.decIn)
            let sale = try FirmaEvm.aUnidades(minimo, ruta.decOut)
            let cambio = try SwapEvm.cambio(claveRuta: claveRuta, comision: comision, cuenta: cuenta, cantidadEntra: entra, salidaMinima: sale)
            return try FirmaEvm.transaccionFirmada(a: SwapEvm.router, valorWei: cambio.valorWei, datos: cambio.datos, sobre: sobre, privada: privada)
        }
    }

    /// El ENVIO por el puente desde Ethereum hacia Kadena. El custodio se
    /// calcula aqui dentro a partir de la cuenta, nunca se recibe hecho.
    @objc func firmarPuenteHaciaKadena(_ call: CAPPluginCall) {
        guard let cuentaKda = call.getString("cuentaKda") else { return call.reject("Falta la cuenta de Kadena.") }
        guard let cantidad = call.getString("cantidad") else { return call.reject("Falta la cantidad.") }
        guard let peajeWei = call.getString("peajeWei") else { return call.reject("Falta el peaje del puente.") }
        firmaEvm(call, "Firma el envío por el puente") { privada, sobre in
            guard let peaje = BigUInt(decimal: peajeWei) else { throw FalloBoveda.argumento("El peaje no es un número.") }
            let unidades = try FirmaEvm.aUnidades(cantidad, FirmaEvm.decimalesUsdc)
            return try FirmaEvm.transaccionFirmada(a: FirmaEvm.router, valorWei: try FirmaEvm.peajeComprobado(peaje),
                                                   datos: try FirmaEvm.datosPuenteHaciaKadena(cuentaKda, unidades),
                                                   sobre: sobre, privada: privada)
        }
    }

    // --- Face ID / Touch ID en lugar de teclear la contraseña -------------------

    @objc func bioEstado(_ call: CAPPluginCall) {
        let motivo = Huella.disponible()
        call.resolve(["disponible": motivo == nil, "motivo": motivo ?? "", "activada": Huella.activada()])
    }

    /// Activa Face ID. Pide la contraseña UNA vez y, antes de guardarla,
    /// comprueba que abre la boveda de verdad.
    @objc func bioActivar(_ call: CAPPluginCall) {
        guard let contrasena = call.getString("contrasena") else { return call.reject("Falta la contraseña.") }
        if !existe { return call.reject("No hay ninguna cartera en este aparato.") }
        hilo(call) {
            _ = try self.abrirFichero(contrasena)
            try Huella.guardar(contrasena)
            return ["activada": true]
        }
    }

    @objc func bioBorrar(_ call: CAPPluginCall) {
        Huella.borrar()
        call.resolve(["activada": false])
    }

    /// De donde sale la contraseña de una operacion: escrita, o desenvuelta con
    /// Face ID. Una de las dos SIEMPRE, tambien para firmar.
    private func conContrasena(_ call: CAPPluginCall, _ titulo: String, _ alTener: @escaping (String) -> Void) {
        if let escrita = call.getString("contrasena") { return alTener(escrita) }
        if call.getBool("huella") != true { return call.reject("Falta la contraseña.") }
        if !Huella.activada() { return call.reject("La identificación no está activada.") }
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                alTener(try Huella.recuperar(titulo))
            } catch let e as FalloBoveda {
                call.reject(e.mensaje)
            } catch {
                call.reject("No se pudo identificar.")
            }
        }
    }

    // --- Tripas -------------------------------------------------------------

    private func parsear(_ claro: String) throws -> JSON {
        guard let o = (try? JSONSerialization.jsonObject(with: Data(claro.utf8))) as? JSON else {
            throw FalloBoveda.bovedaCorrupta("El contenido de la bóveda no es una cartera de Koberlet.")
        }
        return o
    }

    private func abrirFichero(_ contrasena: String) throws -> JSON {
        Carteras.normalizar(try parsear(try Cofre.descifrar(try leer(), contrasena)))
    }

    /// Crea la boveda si no existe, o añade una cartera mas si ya la hay.
    private func anadirCartera(_ contrasena: String, _ semilla: String, _ etiqueta: String, _ red: String) throws -> JSON {
        let datos: JSON
        if existe {
            let d = try abrirFichero(contrasena)
            if Carteras.yaExiste(d, semilla, red) { throw FalloBoveda.estado("Esa cartera ya está metida en este aparato.") }
            datos = Carteras.anadir(d, try Carteras.montar(Carteras.idNuevo(d), etiqueta, semilla, red))
        } else {
            datos = ["v": Carteras.VERSION, "carteras": [try Carteras.montar("c1", etiqueta, semilla, red)], "activa": "c1"]
        }
        try guardar(contrasena, datos)
        sesion = datos
        return datos
    }

    private func anadirCarteraConClave(_ contrasena: String, _ privada: String, _ etiqueta: String, _ red: String) throws -> JSON {
        let datos: JSON
        if existe {
            let d = try abrirFichero(contrasena)
            if Carteras.yaExisteClave(d, privada, red) { throw FalloBoveda.estado("Esa cartera ya está metida en este aparato.") }
            let nueva = try Carteras.montarConClave(Carteras.idNuevo(d), etiqueta, privada, red)
            let cuenta = ((nueva["cuentas"] as? [JSON])?.first?["cuenta"] as? String) ?? ""
            if Carteras.yaExisteCuenta(d, cuenta) { throw FalloBoveda.estado("Esa cuenta ya está en este aparato, metida con su semilla.") }
            datos = Carteras.anadir(d, nueva)
        } else {
            datos = ["v": Carteras.VERSION, "carteras": [try Carteras.montarConClave("c1", etiqueta, privada, red)], "activa": "c1"]
        }
        try guardar(contrasena, datos)
        sesion = datos
        return datos
    }

    /// Del contenido cifrado solo salen las cuentas, cada una diciendo de que
    /// cartera es. Las semillas se quedan aqui.
    private func cuentasPublicas(_ datos: JSON) -> [JSON] {
        var salida = [JSON]()
        for cartera in Carteras.lista(de: datos) {
            for c in (cartera["cuentas"] as? [JSON]) ?? [] {
                salida.append([
                    "id": (c["id"] as? String) ?? "",
                    "carteraId": (cartera["id"] as? String) ?? "",
                    "cartera": (cartera["etiqueta"] as? String) ?? "",
                    "etiqueta": (c["etiqueta"] as? String) ?? "",
                    "tipo": (c["tipo"] as? String) ?? "",
                    "conSemilla": Carteras.esDeSemilla(cartera),
                    "cuenta": (c["cuenta"] as? String) ?? "",
                ])
            }
        }
        return salida
    }

    private func guardar(_ contrasena: String, _ datos: JSON) throws {
        let sal = Cofre.salNueva()
        var clave = try Cofre.derivar(contrasena, sal)
        defer { for i in clave.indices { clave[i] = 0 } }
        let texto = String(data: try JSONSerialization.data(withJSONObject: datos), encoding: .utf8) ?? "{}"
        try escribir(fichero, try Cofre.cifrar(clave, sal, texto))
    }

    /// Todo lo que lleva scrypt va fuera del hilo de la interfaz.
    private func hilo(_ call: CAPPluginCall, _ trabajo: @escaping () throws -> JSON) {
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                call.resolve(try trabajo())
            } catch FalloBoveda.contrasenaIncorrecta {
                call.reject("Contraseña incorrecta.")
            } catch let e as FalloBoveda {
                call.reject(e.mensaje)
            } catch {
                call.reject("Fallo en la bóveda: \(error.localizedDescription)")
            }
        }
    }
}
