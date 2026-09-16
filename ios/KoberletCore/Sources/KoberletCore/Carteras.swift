// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation

/// EL CONTENIDO DE LA BOVEDA - varias carteras en el mismo aparato.
///
/// Formato v3 - UNA CARTERA, UNA RED (el mismo que Android y escritorio):
///   { v:3, carteras:[ { id, etiqueta, semilla|privada, red:"kda"|"evm", cuentas:[una] } ],
///     activa:"id" }
///
/// Los formatos v1 y v2 se migran al abrir, igual que en Carteras.kt: una copia
/// hecha en el Android viejo tiene que abrirse aqui sin perder nada.
///
/// A diferencia de Kotlin, los diccionarios de Swift son valores: cada funcion
/// DEVUELVE el contenido modificado y quien llama tiene que quedarse con lo que
/// devuelve, no con lo que le paso.
public enum Carteras {

    public static let VERSION = 3

    static func version(_ d: JSON) -> Int { (d["v"] as? Int) ?? 1 }
    static func lista(_ d: JSON) -> [JSON] { (d["carteras"] as? [JSON]) ?? [] }
    static func texto(_ d: JSON, _ clave: String) -> String { (d[clave] as? String) ?? "" }

    /// Devuelve el contenido en el formato de hoy, migrando si hace falta.
    public static func normalizar(_ datos: JSON) -> JSON { partirPorRed(aVarias(datos)) }

    /// v1 -> v2: la semilla suelta pasa a ser la primera cartera.
    private static func aVarias(_ datos: JSON) -> JSON {
        if version(datos) >= 2 && datos["carteras"] != nil { return datos }
        let cartera: JSON = [
            "id": "c1", "etiqueta": "Mi cartera",
            "semilla": texto(datos, "semilla"),
            "cuentas": (datos["cuentas"] as? [JSON]) ?? [],
        ]
        return ["v": 2, "carteras": [cartera], "activa": "c1"]
    }

    /// v2 -> v3: la cartera con dos cuentas se PARTE EN DOS, «X KDA» y «X EVM»,
    /// compartiendo la misma semilla. La de Kadena se queda con el id original.
    private static func partirPorRed(_ datos: JSON) -> JSON {
        if version(datos) >= VERSION { return datos }
        let viejas = lista(datos)
        var nuevas = [JSON]()
        var usados = Set<String>()
        for c in viejas { usados.insert(texto(c, "id")) }

        for c in viejas {
            let cuentas = (c["cuentas"] as? [JSON]) ?? []
            var porTipo = [String: JSON]()
            for cu in cuentas { porTipo[texto(cu, "tipo")] = cu }
            if porTipo.count <= 1 {
                var copia = c
                copia["red"] = porTipo.keys.first ?? "kda"
                nuevas.append(copia)
                continue
            }
            let nombre = texto(c, "etiqueta")
            var primera = true
            for tipo in ["kda", "evm"] {
                guard var cu = porTipo[tipo] else { continue }
                let id = primera ? texto(c, "id") : libre(usados)
                primera = false
                usados.insert(id)
                cu["id"] = "\(id)-\(tipo)"
                nuevas.append([
                    "id": id, "etiqueta": nombre + " " + tipo.uppercased(),
                    "semilla": texto(c, "semilla"), "red": tipo, "cuentas": [cu],
                ])
            }
        }
        let activa = texto(datos, "activa")
        let activaFinal = nuevas.isEmpty ? "" : (activa.isEmpty ? texto(nuevas[0], "id") : activa)
        return ["v": VERSION, "carteras": nuevas, "activa": activaFinal]
    }

    private static func libre(_ usados: Set<String>) -> String {
        var n = 1
        while usados.contains("c\(n)") { n += 1 }
        return "c\(n)"
    }

    public static func lista(de datos: JSON) -> [JSON] { lista(normalizar(datos)) }

    public static func buscar(_ datos: JSON, _ id: String) -> JSON? {
        lista(de: datos).first { texto($0, "id") == id }
    }

    /// La cartera activa, o la primera si la marcada ya no existe.
    public static func activa(_ datos: JSON) -> JSON? {
        let d = normalizar(datos)
        return buscar(d, texto(d, "activa")) ?? lista(d).first
    }

    /// Identificador libre: c1, c2, c3... Nunca se reutiliza uno ya usado.
    public static func idNuevo(_ datos: JSON) -> String {
        libre(Set(lista(de: datos).map { texto($0, "id") }))
    }

    public static func anadir(_ datos: JSON, _ cartera: JSON) -> JSON {
        var d = normalizar(datos)
        var l = lista(d)
        l.append(cartera)
        d["carteras"] = l
        d["activa"] = texto(cartera, "id")       // la recien creada pasa a ser la activa
        return d
    }

    /// Quita una cartera. Se niega a quitar la ultima: para empezar de cero esta
    /// `borrarTodo`, que avisa de lo que hace.
    public static func quitar(_ datos: JSON, _ id: String) throws -> JSON {
        var d = normalizar(datos)
        let l = lista(d)
        if l.count <= 1 { throw FalloBoveda.estado("Es la única cartera que hay. Para empezar de cero, usa borrar todo.") }
        let nueva = l.filter { texto($0, "id") != id }
        if nueva.count == l.count { throw FalloBoveda.argumento("Esa cartera no existe.") }
        d["carteras"] = nueva
        if texto(d, "activa") == id { d["activa"] = texto(nueva[0], "id") }
        return d
    }

    public static func renombrar(_ datos: JSON, _ id: String, _ etiqueta: String) throws -> JSON {
        var d = normalizar(datos)
        var l = lista(d)
        guard let i = l.firstIndex(where: { texto($0, "id") == id }) else {
            throw FalloBoveda.argumento("Esa cartera no existe.")
        }
        let limpia = String(etiqueta.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40))
        if limpia.isEmpty { throw FalloBoveda.argumento("Ponle un nombre.") }
        l[i]["etiqueta"] = limpia
        d["carteras"] = l
        return d
    }

    /// ¿Ya hay una cartera con esta misma semilla PARA ESA RED?
    public static func yaExiste(_ datos: JSON, _ semilla: String, _ red: String) -> Bool {
        lista(de: datos).contains { texto($0, "semilla") == semilla && redDe($0) == red }
    }

    /// ¿Ya esta metida esta clave privada para esa red?
    public static func yaExisteClave(_ datos: JSON, _ privada: String, _ red: String) -> Bool {
        lista(de: datos).contains { texto($0, "privada") == privada && redDe($0) == red }
    }

    /// ¿Hay ya una cartera con ESA MISMA direccion?
    public static func yaExisteCuenta(_ datos: JSON, _ cuenta: String) -> Bool {
        for c in lista(de: datos) {
            for cu in (c["cuentas"] as? [JSON]) ?? [] where texto(cu, "cuenta") == cuenta { return true }
        }
        return false
    }

    /// ¿Esta cartera viene de unas palabras, o de una clave suelta?
    public static func esDeSemilla(_ cartera: JSON) -> Bool { !texto(cartera, "semilla").isEmpty }

    /// Deja la clave privada como se guarda: 64 caracteres hex en minusculas.
    /// Admite el `0x` delante y el formato de 128 caracteres (privada + publica)
    /// de algunas herramientas de Kadena, solo si la publica cuadra de verdad.
    public static func normalizarClave(_ texto: String, _ red: String) throws -> String {
        var h = texto.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if h.hasPrefix("0x") { h = String(h.dropFirst(2)) }
        if !h.casa("^[0-9a-f]+$") {
            throw FalloBoveda.argumento("Una clave privada son 64 caracteres del 0 al 9 y de la a a la f.")
        }
        if h.count == 128 && red == "kda" {
            let privada = String(h.prefix(64))
            let publica = String(h.suffix(64))
            let calculada = try Derivacion.publicaKadena(try Hex.deHex(privada))
            if calculada != publica {
                throw FalloBoveda.argumento("Esos 128 caracteres no son una clave privada seguida de su pública.")
            }
            h = privada
        }
        if h.count != 64 {
            throw FalloBoveda.argumento("Una clave privada son 64 caracteres del 0 al 9 y de la a a la f.")
        }
        if h == String(repeating: "0", count: 64) { throw FalloBoveda.argumento("Esa clave no vale: son todo ceros.") }
        return h
    }

    /// Monta una cartera a partir de una clave privada suelta, sin semilla.
    public static func montarConClave(_ id: String, _ etiqueta: String, _ privada: String, _ red: String) throws -> JSON {
        if red != "kda" && red != "evm" { throw FalloBoveda.argumento("Esa red no existe.") }
        var bytes = try Hex.deHex(privada)
        defer { for i in bytes.indices { bytes[i] = 0 } }
        let cuenta: JSON
        if red == "kda" {
            cuenta = ["id": "\(id)-kda", "etiqueta": "Kadena", "tipo": "kda",
                      "cuenta": "k:" + (try Derivacion.publicaKadena(bytes))]
        } else {
            cuenta = ["id": "\(id)-evm", "etiqueta": "EVM", "tipo": "evm",
                      "cuenta": try Derivacion.direccionEvm(bytes)]
        }
        return ["id": id, "etiqueta": etiqueta, "privada": privada, "red": red, "cuentas": [cuenta]]
    }

    /// Los 32 bytes de la clave privada de esa cartera, venga de donde venga.
    /// Quien la pida se la lleva en un array que puede -y debe- borrar despues.
    public static func privadaDe(_ cartera: JSON) throws -> [UInt8] {
        let suelta = texto(cartera, "privada")
        if !suelta.isEmpty { return try Hex.deHex(suelta) }
        var bytes = Derivacion.semillaABytes(texto(cartera, "semilla"))
        defer { for i in bytes.indices { bytes[i] = 0 } }
        return redDe(cartera) == "kda"
            ? Derivacion.privadaKadena(bytes, 0)
            : try Derivacion.privadaEvm(bytes, 0)
    }

    /// La red de una cartera. Las de antes de la v3 no la traen: se deduce.
    public static func redDe(_ cartera: JSON) -> String {
        let r = texto(cartera, "red")
        if r == "kda" || r == "evm" { return r }
        guard let cuentas = cartera["cuentas"] as? [JSON], let primera = cuentas.first else { return "kda" }
        let tipo = texto(primera, "tipo")
        return tipo.isEmpty ? "kda" : tipo
    }

    /// Monta una cartera nueva a partir de una semilla, derivando SU cuenta.
    public static func montar(_ id: String, _ etiqueta: String, _ semilla: String, _ red: String) throws -> JSON {
        if red != "kda" && red != "evm" { throw FalloBoveda.argumento("Esa red no existe.") }
        var bytes = Derivacion.semillaABytes(semilla)
        defer { for i in bytes.indices { bytes[i] = 0 } }
        let cuenta: JSON
        if red == "kda" {
            cuenta = ["id": "\(id)-kda", "etiqueta": "Kadena", "tipo": "kda",
                      "cuenta": try Derivacion.cuentaKadena(bytes, 0)]
        } else {
            cuenta = ["id": "\(id)-evm", "etiqueta": "EVM", "tipo": "evm",
                      "cuenta": try Derivacion.direccionEvm(try Derivacion.privadaEvm(bytes, 0))]
        }
        return ["id": id, "etiqueta": etiqueta, "semilla": semilla, "red": red, "cuentas": [cuenta]]
    }
}
