// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation
import CryptoKit

/// FIRMA DE TRANSACCIONES KADENA.
///
/// La misma decision que sostiene la version Android (ver FirmaKda.kt):
///
///   El WebView NO manda codigo Pact ni un hash para firmar a ciegas. Manda los
///   datos del envio (a quien, cuanto, en que chain) y **el comando lo monta
///   aqui**, en Swift, a partir de una plantilla fija.
///
/// El JSON del comando se construye a mano porque **el hash es del texto**: si
/// cambiara el orden de una clave o un espacio, el hash cambia y el nodo lo
/// rechaza. El texto es identico, caracter a caracter, al que produce Kotlin.
public enum FirmaKda {

    /// Lo que devuelve cada firma: {cmd, hash, sigs} listo para /send.
    public static func resultado(_ cmd: String, _ privada: [UInt8], extra: JSON = [:]) throws -> JSON {
        let hash = hashComando(cmd)
        var r: JSON = [
            "cmd": cmd,
            "hash": Base64Url.codificar(hash),
            "sigs": [["sig": try firmar(privada, hash)]],
        ]
        for (k, v) in extra { r[k] = v }
        return r
    }

    /// blake2b-256 del texto del comando: el "hash" de Pact.
    public static func hashComando(_ cmd: String) -> [UInt8] {
        Blake2b.hash(Array(cmd.utf8), size: 32)
    }

    /// Firma Ed25519 del hash, en hexadecimal, que es como la quiere Chainweb.
    public static func firmar(_ privada: [UInt8], _ hash: [UInt8]) throws -> String {
        guard let k = try? Curve25519.Signing.PrivateKey(rawRepresentation: Data(privada)) else {
            throw FalloBoveda.argumento("Esa clave privada no vale.")
        }
        return Hex.aHex(Array(try k.signature(for: Data(hash))))
    }

    /// Decimal canonico: el MISMO texto en el codigo y en la capability.
    public static func decimalCanonico(_ cantidad: Double) -> String {
        String(format: "%.12f", cantidad)
    }

    static func nonce(_ prefijo: String = "koberlet-android") -> String {
        "\(prefijo):\(Int64(Date().timeIntervalSince1970 * 1000))"
    }

    /// Monta y firma una transferencia de KDA dentro de una misma chain.
    public static func envioKda(
        networkId: String, chain: String, de: String, para: String, cantidad: Double,
        privada: [UInt8], publica: String, creationTime: Int64,
        gasLimit: Int = 2500, gasPrice: String = "1e-8"
    ) throws -> JSON {
        if !cuentaValida(de) { throw FalloBoveda.argumento("La cuenta de origen no es válida.") }
        if !cuentaValida(para) { throw FalloBoveda.argumento("La cuenta de destino no es válida.") }
        if cantidad <= 0 { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }

        let monto = decimalCanonico(cantidad)
        let esK = para.hasPrefix("k:")
        let codigo = esK
            ? "(coin.transfer-create \\\"\(de)\\\" \\\"\(para)\\\" (read-keyset \\\"ks\\\") \(monto))"
            : "(coin.transfer \\\"\(de)\\\" \\\"\(para)\\\" \(monto))"
        let datos = esK ? "{\"ks\":{\"keys\":[\"\(para.dropFirst(2))\"],\"pred\":\"keys-all\"}}" : "{}"

        let cmd = "{\"networkId\":\"\(networkId)\",\"payload\":{\"exec\":{\"code\":\"\(codigo)\",\"data\":\(datos)}}," +
            "\"signers\":[{\"pubKey\":\"\(publica)\",\"clist\":[{\"name\":\"coin.GAS\",\"args\":[]}," +
            "{\"name\":\"coin.TRANSFER\",\"args\":[\"\(de)\",\"\(para)\",{\"decimal\":\"\(monto)\"}]}]}]," +
            "\"meta\":{\"chainId\":\"\(chain)\",\"sender\":\"\(de)\",\"gasLimit\":\(gasLimit),\"gasPrice\":\(gasPrice),\"ttl\":600,\"creationTime\":\(creationTime)}," +
            "\"nonce\":\"\(nonce())\"}"
        return try resultado(cmd, privada)
    }

    /// ENVIO ENTRE CHAINS (paso 1 de 2). Solo a cuentas `k:`.
    public static func envioCrossChain(
        networkId: String, chainOrigen: String, chainDestino: String, de: String, para: String,
        cantidad: Double, privada: [UInt8], publica: String, creationTime: Int64,
        gasLimit: Int = 3000, gasPrice: String = "1e-8"
    ) throws -> JSON {
        if !cuentaValida(de) { throw FalloBoveda.argumento("La cuenta de origen no es válida.") }
        if !cuentaValida(para) { throw FalloBoveda.argumento("La cuenta de destino no es válida.") }
        if !para.hasPrefix("k:") { throw FalloBoveda.argumento("Entre chains solo se puede enviar a una cuenta k:.") }
        if cantidad <= 0 { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
        if chainOrigen == chainDestino { throw FalloBoveda.argumento("Origen y destino son la misma chain.") }
        if !chainDestino.casa("^([0-9]|1[0-9])$") { throw FalloBoveda.argumento("Esa chain no existe.") }

        let monto = decimalCanonico(cantidad)
        let codigo = "(coin.transfer-crosschain \\\"\(de)\\\" \\\"\(para)\\\" (read-keyset \\\"ks\\\") \\\"\(chainDestino)\\\" \(monto))"
        let datos = "{\"ks\":{\"keys\":[\"\(para.dropFirst(2))\"],\"pred\":\"keys-all\"}}"

        let cmd = "{\"networkId\":\"\(networkId)\",\"payload\":{\"exec\":{\"code\":\"\(codigo)\",\"data\":\(datos)}}," +
            "\"signers\":[{\"pubKey\":\"\(publica)\",\"clist\":[{\"name\":\"coin.GAS\",\"args\":[]}," +
            "{\"name\":\"coin.TRANSFER_XCHAIN\",\"args\":[\"\(de)\",\"\(para)\",{\"decimal\":\"\(monto)\"},\"\(chainDestino)\"]}]}]," +
            "\"meta\":{\"chainId\":\"\(chainOrigen)\",\"sender\":\"\(de)\",\"gasLimit\":\(gasLimit),\"gasPrice\":\(gasPrice),\"ttl\":600,\"creationTime\":\(creationTime)}," +
            "\"nonce\":\"\(nonce())\"}"
        return try resultado(cmd, privada)
    }

    // --- PUENTE: Kadena -> Ethereum -----------------------------------------

    private static let puenteNs = "n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff"
    private static let puenteModulo = "kb-USDC"
    private static let puenteDominioEvm = 1
    public static let puenteChain = "2"
    private static let puentePeajeMax = 100.0

    /// Los 32 bytes que viajan por el cable para una direccion de Ethereum: la
    /// direccion de 20 bytes alineada a la derecha, en base64url. Se calcula
    /// AQUI y no se acepta ya hecho (hallazgo R1 del puente).
    public static func destinoEvm(_ direccion: String) throws -> String {
        var a = direccion.trimmingCharacters(in: .whitespacesAndNewlines)
        if a.hasPrefix("0x") || a.hasPrefix("0X") { a = String(a.dropFirst(2)) }
        if !a.casa("^[0-9a-fA-F]{40}$") {
            throw FalloBoveda.argumento("La dirección de Ethereum tiene que ser 0x y 40 caracteres.")
        }
        let bytes = [UInt8](repeating: 0, count: 12) + (try Hex.deHex(a))
        return Base64Url.codificar(bytes)
    }

    public static func envioPuenteEvm(
        networkId: String, de: String, destinoEth: String, cantidad: Double, peaje: Double,
        cuentaPeaje: String, privada: [UInt8], publica: String, creationTime: Int64,
        gasLimit: Int = 60000, gasPrice: String = "1e-8"
    ) throws -> JSON {
        if !cuentaValida(de) { throw FalloBoveda.argumento("La cuenta de origen no es válida.") }
        if !de.hasPrefix("k:") { throw FalloBoveda.argumento("Por el puente solo se envía desde una cuenta k:.") }
        if cantidad <= 0 { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
        if !cuentaValida(cuentaPeaje) {
            throw FalloBoveda.argumento("La cuenta del peaje no es válida; el nodo puede estar manipulado.")
        }
        if peaje < 0 || peaje > puentePeajeMax || !peaje.isFinite {
            throw FalloBoveda.argumento("El peaje del puente está fuera de lo razonable; mejor no seguir.")
        }

        let rec = try destinoEvm(destinoEth)
        let monto = decimalCanonico(cantidad)
        let tope = decimalCanonico(peaje * 1.05)
        let codigo = "(\(puenteNs).mailbox.dispatch \(puenteNs).\(puenteModulo) \(puenteDominioEvm) \\\"\(rec)\\\" \(monto))"

        let cmd = "{\"networkId\":\"\(networkId)\",\"payload\":{\"exec\":{\"code\":\"\(codigo)\",\"data\":{}}}," +
            "\"signers\":[{\"pubKey\":\"\(publica)\",\"clist\":[{\"name\":\"coin.GAS\",\"args\":[]}," +
            "{\"name\":\"\(puenteNs).\(puenteModulo).TRANSFER_REMOTE\",\"args\":[{\"int\":\(puenteDominioEvm)},\"\(de)\",\"\(rec)\",{\"decimal\":\"\(monto)\"}]}," +
            "{\"name\":\"coin.TRANSFER\",\"args\":[\"\(de)\",\"\(cuentaPeaje)\",{\"decimal\":\"\(tope)\"}]}]}]," +
            "\"meta\":{\"chainId\":\"\(puenteChain)\",\"sender\":\"\(de)\",\"gasLimit\":\(gasLimit),\"gasPrice\":\(gasPrice),\"ttl\":600,\"creationTime\":\(creationTime)}," +
            "\"nonce\":\"\(nonce())\"}"
        return try resultado(cmd, privada)
    }

    // --- DCA ------------------------------------------------------------------

    private static let dcaModulo = "free.ksw-dca2"
    public static let dcaChain = "2"
    private static let dcaCustodia = "c:QiDAEP0E7hUoDWWxntmLK5LKvAeJm1SHJMAWcBmOZM8"
    private static let dcaKda = "coin"
    private static let dcaUsdc = "n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC"

    public static func crearPlanDca(
        networkId: String, owner: String, haciaUsdc: Bool, deposito: Double, cuota: Double,
        periodo: Int64, deslizamiento: Double, privada: [UInt8], publica: String, creationTime: Int64,
        gasLimit: Int = 20000, gasPrice: String = "1e-8"
    ) throws -> JSON {
        if owner != "k:\(publica)" {
            throw FalloBoveda.argumento("Un plan de compras solo se puede crear a nombre de la propia cartera.")
        }
        if deposito <= 0 || cuota <= 0 { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
        if cuota > deposito { throw FalloBoveda.argumento("La cuota no puede ser mayor que el bote.") }
        if periodo < 300 || periodo > 31_536_000 { throw FalloBoveda.argumento("Entre compra y compra tienen que pasar de 5 minutos a un año.") }
        if deslizamiento < 0.0 || deslizamiento > 0.5 { throw FalloBoveda.argumento("El deslizamiento va de 0 a 50 %.") }

        let entra = haciaUsdc ? dcaKda : dcaUsdc
        let sale = haciaUsdc ? dcaUsdc : dcaKda
        let id = String(owner.prefix(10)) + "-\(Int64(Date().timeIntervalSince1970 * 1000))"

        let dep = decimalCanonico(deposito)
        let cuo = decimalCanonico(cuota)
        let per = decimalCanonico(Double(periodo))
        let des = decimalCanonico(deslizamiento)

        let codigo = "(\(dcaModulo).create-plan \\\"\(id)\\\" \\\"\(owner)\\\" (read-keyset \\\"ks\\\") \(entra) \(sale) \(dep) \(cuo) \(per) \(des))"
        let datos = "{\"ks\":{\"keys\":[\"\(publica)\"],\"pred\":\"keys-all\"}}"

        let cmd = "{\"networkId\":\"\(networkId)\",\"payload\":{\"exec\":{\"code\":\"\(codigo)\",\"data\":\(datos)}}," +
            "\"signers\":[{\"pubKey\":\"\(publica)\",\"clist\":[{\"name\":\"coin.GAS\",\"args\":[]}," +
            "{\"name\":\"\(entra).TRANSFER\",\"args\":[\"\(owner)\",\"\(dcaCustodia)\",{\"decimal\":\"\(dep)\"}]}]}]," +
            "\"meta\":{\"chainId\":\"\(dcaChain)\",\"sender\":\"\(owner)\",\"gasLimit\":\(gasLimit),\"gasPrice\":\(gasPrice),\"ttl\":600,\"creationTime\":\(creationTime)}," +
            "\"nonce\":\"\(nonce())\"}"
        return try resultado(cmd, privada, extra: ["id": id])
    }

    /// El id de un plan, revisado con la misma vara que el contrato.
    public static func idPlanValido(_ id: String, _ owner: String) -> Bool {
        if id.count < 1 || id.count > 64 { return false }
        let n = min(owner.count, 10)
        if id.count < n || id.prefix(n) != owner.prefix(n) { return false }
        return id.casa("^[A-Za-z0-9:_.-]+$")
    }

    public static func gestionarPlanDca(
        networkId: String, accion: String, id: String, owner: String, cantidad: Double,
        entraEsUsdc: Bool, privada: [UInt8], publica: String, creationTime: Int64,
        gasLimit: Int = 20000, gasPrice: String = "1e-8"
    ) throws -> JSON {
        if owner != "k:\(publica)" { throw FalloBoveda.argumento("Ese plan no es de esta cartera.") }
        if !idPlanValido(id, owner) { throw FalloBoveda.argumento("El identificador del plan no vale.") }

        let codigo: String
        let clist: String
        switch accion {
        case "pausar":
            codigo = "(\(dcaModulo).pause-plan \\\"\(id)\\\")"; clist = ""
        case "reanudar":
            codigo = "(\(dcaModulo).resume-plan \\\"\(id)\\\")"; clist = ""
        case "cerrar":
            codigo = "(\(dcaModulo).close-plan \\\"\(id)\\\")"; clist = ""
        case "recargar":
            if cantidad <= 0 { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
            let entra = entraEsUsdc ? dcaUsdc : dcaKda
            let monto = decimalCanonico(cantidad)
            codigo = "(\(dcaModulo).topup \\\"\(id)\\\" \(monto))"
            clist = ",\"clist\":[{\"name\":\"coin.GAS\",\"args\":[]}," +
                "{\"name\":\"\(entra).TRANSFER\",\"args\":[\"\(owner)\",\"\(dcaCustodia)\",{\"decimal\":\"\(monto)\"}]}]"
        default:
            throw FalloBoveda.argumento("Esa acción sobre el plan no existe.")
        }

        let cmd = "{\"networkId\":\"\(networkId)\",\"payload\":{\"exec\":{\"code\":\"\(codigo)\",\"data\":{}}}," +
            "\"signers\":[{\"pubKey\":\"\(publica)\"\(clist)}]," +
            "\"meta\":{\"chainId\":\"\(dcaChain)\",\"sender\":\"\(owner)\",\"gasLimit\":\(gasLimit),\"gasPrice\":\(gasPrice),\"ttl\":600,\"creationTime\":\(creationTime)}," +
            "\"nonce\":\"\(nonce())\"}"
        return try resultado(cmd, privada)
    }

    // --- Enviar un token que no es KDA ---------------------------------------

    /// Envio de un FUNGIBLE que no es el KDA. El modulo viene de la pantalla y
    /// se acota con un regex estrecho; la capability es solo `<modulo>.TRANSFER`
    /// con destinatario e importe exactos, nunca `coin.TRANSFER`.
    public static func envioToken(
        networkId: String, chain: String, modulo: String, de: String, para: String,
        cantidad: Double, precision: Int, privada: [UInt8], publica: String, creationTime: Int64,
        gasLimit: Int = 3000, gasPrice: String = "1e-8"
    ) throws -> JSON {
        if !moduloValido(modulo) { throw FalloBoveda.argumento("Ese token no tiene un contrato con forma válida.") }
        if !cuentaValida(de) { throw FalloBoveda.argumento("La cuenta de origen no es válida.") }
        if !cuentaValida(para) { throw FalloBoveda.argumento("La cuenta de destino no es válida.") }
        if cantidad <= 0 { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
        if precision < 0 || precision > 12 { throw FalloBoveda.argumento("Ese token no tiene tantos decimales.") }

        let monto = String(format: "%.\(precision)f", cantidad)
        if (Double(monto) ?? 0) <= 0 { throw FalloBoveda.argumento("Esa cantidad es más pequeña que lo que admite este token.") }

        let esK = para.hasPrefix("k:")
        let codigo = esK
            ? "(\(modulo).transfer-create \\\"\(de)\\\" \\\"\(para)\\\" (read-keyset \\\"ks\\\") \(monto))"
            : "(\(modulo).transfer \\\"\(de)\\\" \\\"\(para)\\\" \(monto))"
        let datos = esK ? "{\"ks\":{\"keys\":[\"\(para.dropFirst(2))\"],\"pred\":\"keys-all\"}}" : "{}"

        let cmd = "{\"networkId\":\"\(networkId)\",\"payload\":{\"exec\":{\"code\":\"\(codigo)\",\"data\":\(datos)}}," +
            "\"signers\":[{\"pubKey\":\"\(publica)\",\"clist\":[{\"name\":\"coin.GAS\",\"args\":[]}," +
            "{\"name\":\"\(modulo).TRANSFER\",\"args\":[\"\(de)\",\"\(para)\",{\"decimal\":\"\(monto)\"}]}]}]," +
            "\"meta\":{\"chainId\":\"\(chain)\",\"sender\":\"\(de)\",\"gasLimit\":\(gasLimit),\"gasPrice\":\(gasPrice),\"ttl\":600,\"creationTime\":\(creationTime)}," +
            "\"nonce\":\"\(nonce("koberlet-android-tok"))\"}"
        return try resultado(cmd, privada)
    }

    // --- El Mercado de Kadena ------------------------------------------------

    private static let amm = "kaddex.exchange"
    public static let ammChain = "2"

    /// La comision de servicio de Koberlet y la cuenta que la cobra, igual que en
    /// Kotlin. Estan aqui y no en la pantalla: la pantalla dice cuanto, no a donde.
    /// Aunque el WebView estuviera comprometido, la comision no se puede desviar.
    public static let comisionCuenta = "k:e5b947889c87fc5057ed35fa31302f57a248c33d0bbdb20a9c81500e2f3748df"
    public static let comisionClave = "e5b947889c87fc5057ed35fa31302f57a248c33d0bbdb20a9c81500e2f3748df"
    /// 0,005 escrito sin pasar por un `Double`: en decimal exacto, como la cadena.
    public static let comisionTope = Decimal(sign: .plus, exponent: -3, significand: 5)

    /// Cambio en el AMM (`swap-exact-in`). Solo se firma `coin.GAS` y el
    /// `TRANSFER` del token que SALE, por la cantidad exacta y hacia el pool.
    public static func cambioAmm(
        networkId: String, camino: [String], cuenta: String, poolPrimerSalto: String,
        cantidad: String, minimo: String, privada: [UInt8], publica: String, creationTime: Int64,
        comision: String = "0.0", gasLimit: Int = 14000, gasPrice: String = "1e-8"
    ) throws -> JSON {
        if camino.count < 2 || camino.count > 3 { throw FalloBoveda.argumento("Ese camino de cambio no tiene sentido.") }
        for mod in camino where mod != "coin" && !moduloValido(mod) {
            throw FalloBoveda.argumento("Ese token no tiene un contrato con forma válida.")
        }
        if !cuentaValida(cuenta) { throw FalloBoveda.argumento("La cuenta de origen no es válida.") }
        if !cuentaValida(poolPrimerSalto) { throw FalloBoveda.argumento("La cuenta del pool no es válida.") }
        let entra = try decimalValido(cantidad)
        let sale = try decimalValido(minimo)
        if (Double(entra) ?? 0) <= 0 { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }

        let pubKey = cuenta.hasPrefix("k:") ? String(cuenta.dropFirst(2)) : cuenta
        if !pubKey.casa("^[0-9a-fA-F]{64}$") {
            throw FalloBoveda.argumento("Para el mercado la cuenta Kadena tiene que ser k: y 64 caracteres.")
        }

        // `cantidad` es el NETO que entra en el pool; la comision se aparto antes y
        // va aparte, en esta misma transaccion. Se comprueba que no pase del 0,5 %
        // de lo que el usuario entrega en total.
        let cuota = try decimalValido(comision)
        let cuotaD = Decimal(string: cuota) ?? 0
        if cuotaD < 0 { throw FalloBoveda.argumento("La comisión no puede ser negativa.") }
        let hayComision = cuotaD > 0
        if hayComision {
            var tope = ((Decimal(string: entra) ?? 0) + cuotaD) * comisionTope
            var topeRedondeado = Decimal()
            NSDecimalRound(&topeRedondeado, &tope, -cuotaD.exponent, .up)
            if cuotaD > topeRedondeado {
                throw FalloBoveda.argumento("La comisión no puede ser mayor que la parte que le toca.")
            }
        }

        let cambio = "(\(amm).swap-exact-in (read-decimal \\\"amountIn\\\") (read-decimal \\\"amountOutMin\\\") [" +
            camino.joined(separator: " ") + "] \\\"\(cuenta)\\\" \\\"\(cuenta)\\\" (read-keyset \\\"ks\\\"))"
        // El cambio y el cobro atados: si el cambio revierte no se cobra nada, y si
        // la comision no se puede pagar no hay cambio.
        let codigo = hayComision
            ? "(let ((r \(cambio))) (\(camino[0]).transfer-create \\\"\(cuenta)\\\" \\\"\(comisionCuenta)\\\"" +
              " (read-keyset \\\"ks-koberlet\\\") (read-decimal \\\"comision\\\")) r)"
            : cambio
        let extraDatos = hayComision
            ? ",\"comision\":{\"decimal\":\"\(cuota)\"},\"ks-koberlet\":{\"keys\":[\"\(comisionClave)\"],\"pred\":\"keys-all\"}"
            : ""
        let datos = "{\"amountIn\":{\"decimal\":\"\(entra)\"},\"amountOutMin\":{\"decimal\":\"\(sale)\"}\(extraDatos)," +
            "\"ks\":{\"keys\":[\"\(pubKey)\"],\"pred\":\"keys-all\"}}"
        let extraClist = hayComision
            ? ",{\"name\":\"\(camino[0]).TRANSFER\",\"args\":[\"\(cuenta)\",\"\(comisionCuenta)\",{\"decimal\":\"\(cuota)\"}]}"
            : ""
        let gas = hayComision ? gasLimit + 4000 : gasLimit   // una transferencia mas = mas gas

        let cmd = "{\"networkId\":\"\(networkId)\",\"payload\":{\"exec\":{\"code\":\"\(codigo)\",\"data\":\(datos)}}," +
            "\"signers\":[{\"pubKey\":\"\(publica)\",\"clist\":[{\"name\":\"coin.GAS\",\"args\":[]}," +
            "{\"name\":\"\(camino[0]).TRANSFER\",\"args\":[\"\(cuenta)\",\"\(poolPrimerSalto)\",{\"decimal\":\"\(entra)\"}]}\(extraClist)]}]," +
            "\"meta\":{\"chainId\":\"\(ammChain)\",\"sender\":\"\(cuenta)\",\"gasLimit\":\(gas),\"gasPrice\":\(gasPrice),\"ttl\":600,\"creationTime\":\(creationTime)}," +
            "\"nonce\":\"\(nonce("koberlet-android-swap"))\"}"
        return try resultado(cmd, privada)
    }

    /// Un decimal escrito como texto, tal cual va a ir dentro del JSON: solo
    /// digitos y un punto, para que por aqui no se cuele nada en el comando.
    public static func decimalValido(_ n: String) throws -> String {
        let limpio = n.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: ".")
        if !limpio.casa("^[0-9]+(\\.[0-9]+)?$") { throw FalloBoveda.argumento("Eso no es una cantidad.") }
        if limpio.count > 40 { throw FalloBoveda.argumento("Eso no es una cantidad.") }
        return limpio.contains(".") ? limpio : limpio + ".0"     // Pact quiere el punto en los `decimal`
    }

    /// Un nombre de modulo Pact: `namespace.contrato`, y nada mas. Sin comillas,
    /// parentesis ni espacios: nada que permita salirse de la plantilla.
    public static func moduloValido(_ modulo: String) -> Bool {
        if modulo.count < 3 || modulo.count > 128 { return false }
        if !modulo.casa("^[A-Za-z0-9_-]+(\\.[A-Za-z0-9_-]+)*$") { return false }
        return modulo != "coin"        // el KDA tiene su propia funcion
    }

    /// Misma regla que `validKdaAccount` del escritorio y que Kotlin.
    public static func cuentaValida(_ cuenta: String) -> Bool {
        if cuenta.count < 3 || cuenta.count > 256 { return false }
        for c in cuenta.unicodeScalars {
            let v = c.value
            if v < 0x20 || v == 0x22 || v == 0x5c || v == 0x7f || v > 0xff { return false }
        }
        guard cuenta.casa("^[A-Za-z]:") else { return true }
        let h43 = "[A-Za-z0-9_-]{43}"
        let nom = "[A-Za-z0-9_-]+(?:[.][A-Za-z0-9_-]+)*"
        let patron: String
        switch cuenta.first! {
        case "k": patron = "^k:[0-9a-fA-F]{64}$"
        case "w": patron = "^w:\(h43):\(nom)$"
        case "r": patron = "^r:\(nom)$"
        case "u": patron = "^u:\(nom):\(h43)$"
        case "c": patron = "^c:\(h43)$"
        case "p": patron = "^p:\(h43):\(nom)$"
        case "m": patron = "^m:\(nom):\(nom)$"
        default: return false          // prefijo de una letra reservado y sin forma valida
        }
        return cuenta.casa(patron)
    }
}
