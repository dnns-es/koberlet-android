// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import Foundation

/// CAMBIAR UNAS MONEDAS POR OTRAS EN ETHEREUM (Uniswap v3). Port de SwapEvm.kt.
///
/// La pantalla NO pasa direcciones de contratos: elige entre CUATRO RUTAS con
/// nombre y cada una sabe que token entra, cual sale y sus decimales. El SUELO
/// (`amountOutMinimum`) es el que el dueño vio en la pantalla y va DENTRO de lo
/// firmado; recalcularlo aqui dejaria que un nodo hostil mintiera dos veces.
public enum SwapEvm {

    public static let router = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"    // SwapRouter02
    public static let weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    public static let usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    public static let usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

    /// Dos direcciones de mentira que el router entiende como ordenes:
    /// «pagalo a quien firma» y «quedatelo tu».
    private static let msgSender = "0x0000000000000000000000000000000000000001"
    private static let addressThis = "0x0000000000000000000000000000000000000002"

    /// La comision de servicio de Koberlet, igual que en Kotlin: 0,5% que reparte el
    /// propio router de Uniswap dentro del mismo multicall. En Kadena se aparta de lo
    /// que ENTRA; aqui sale de lo que SE RECIBE, que es lo que el router sabe hacer.
    /// La cuenta esta en el codigo, como los contratos: la pantalla nunca la manda.
    public static let comisionBips = 50
    public static let comisionMaxBips = 100
    public static let comisionCuenta = "0x4A31148aD2BF0355C93bf7C9218Bb723F15c901c"

    private static let selExactInputSingle = "04e45aaf"
    private static let selUnwrapWeth9 = "49404b7c"
    private static let selUnwrapWeth9ConComision = "9b2c0a37"
    private static let selBarrerConComision = "e0e189a0"
    private static let selRefundEth = "12210e8a"
    private static let selMulticall = "ac9650d8"
    private static let selApprove = "095ea7b3"

    public struct Ruta {
        public let clave: String
        public let tokenIn: String
        public let tokenOut: String
        public let decIn: Int
        public let decOut: Int
        public let entraEth: Bool
        public let saleEth: Bool
    }

    private static let rutas: [Ruta] = [
        Ruta(clave: "usdc2eth", tokenIn: usdc, tokenOut: weth, decIn: 6, decOut: 18, entraEth: false, saleEth: true),
        Ruta(clave: "eth2usdc", tokenIn: weth, tokenOut: usdc, decIn: 18, decOut: 6, entraEth: true, saleEth: false),
        Ruta(clave: "usdt2usdc", tokenIn: usdt, tokenOut: usdc, decIn: 6, decOut: 6, entraEth: false, saleEth: false),
        Ruta(clave: "usdc2usdt", tokenIn: usdc, tokenOut: usdt, decIn: 6, decOut: 6, entraEth: false, saleEth: false),
    ]

    public static func ruta(_ clave: String) throws -> Ruta {
        guard let r = rutas.first(where: { $0.clave == clave }) else {
            throw FalloBoveda.argumento("Ese cambio no está entre los que sabe hacer la app.")
        }
        return r
    }

    /// Las comisiones de pool que se prueban, de mas probable a menos.
    public static let comisiones = [500, 3000, 100]

    /// `exactInputSingle((tokenIn,tokenOut,fee,recipient,amountIn,amountOutMinimum,sqrtPriceLimitX96))`:
    /// tupla de tipos estaticos, siete palabras seguidas, sin punteros.
    public static func datosCambio(tokenIn: String, tokenOut: String, comision: Int, destinatario: String,
                                   cantidadEntra: BigUInt, salidaMinima: BigUInt) throws -> String {
        if !comisiones.contains(comision) { throw FalloBoveda.argumento("Esa comisión de pool no es una de las que se usan.") }
        if cantidadEntra.isZero { throw FalloBoveda.argumento("La cantidad tiene que ser mayor que cero.") }
        return selExactInputSingle
            + (try FirmaEvm.palabraDireccion(tokenIn))
            + (try FirmaEvm.palabraDireccion(tokenOut))
            + (try FirmaEvm.palabra(BigUInt(UInt64(comision))))
            + (try FirmaEvm.palabraDireccion(destinatario))
            + (try FirmaEvm.palabra(cantidadEntra))
            + (try FirmaEvm.palabra(salidaMinima))
            + (try FirmaEvm.palabra(BigUInt.cero))            // sqrtPriceLimitX96: sin limite
    }

    /// `unwrapWETH9(uint256 minimo, address para)`.
    public static func datosDesenvolver(_ minimo: BigUInt, _ para: String) throws -> String {
        selUnwrapWeth9 + (try FirmaEvm.palabra(minimo)) + (try FirmaEvm.palabraDireccion(para))
    }

    /// `unwrapWETH9WithFee(minimo, para, bips, quienCobra)`: lo mismo, apartando antes
    /// la comision de Koberlet.
    public static func datosDesenvolverConComision(_ minimo: BigUInt, _ para: String) throws -> String {
        try exigirComisionSensata()
        return selUnwrapWeth9ConComision + (try FirmaEvm.palabra(minimo)) + (try FirmaEvm.palabraDireccion(para))
            + (try FirmaEvm.palabra(BigUInt(UInt64(comisionBips)))) + (try FirmaEvm.palabraDireccion(comisionCuenta))
    }

    /// `sweepTokenWithFee(token, minimo, para, bips, quienCobra)`: saca del router todo
    /// lo que salio del pool y lo reparte. No queda nada dentro.
    public static func datosBarrerConComision(_ token: String, _ minimo: BigUInt, _ para: String) throws -> String {
        try exigirComisionSensata()
        return selBarrerConComision + (try FirmaEvm.palabraDireccion(token)) + (try FirmaEvm.palabra(minimo))
            + (try FirmaEvm.palabraDireccion(para))
            + (try FirmaEvm.palabra(BigUInt(UInt64(comisionBips)))) + (try FirmaEvm.palabraDireccion(comisionCuenta))
    }

    /// El router no admite mas del 1%; esto lo comprueba antes de llegar alli.
    private static func exigirComisionSensata() throws {
        if comisionBips < 0 || comisionBips > comisionMaxBips {
            throw FalloBoveda.argumento("La comisión no puede pasar del 1 %.")
        }
    }

    /// `refundETH()`.
    public static func datosDevolverEth() -> String { selRefundEth }

    /// `multicall(bytes[] datos)`: puntero al array, longitud, un puntero por
    /// elemento relativo al principio del array, y cada elemento con su longitud
    /// delante y rellenado a multiplo de 32.
    public static func datosMulticall(_ llamadas: [String]) throws -> String {
        if llamadas.isEmpty { throw FalloBoveda.argumento("Un multicall sin llamadas no hace nada.") }
        var cuerpos = [String]()
        for hex in llamadas {
            let limpio = hex.hasPrefix("0x") ? String(hex.dropFirst(2)) : hex
            if limpio.count % 2 != 0 { throw FalloBoveda.argumento("Esa llamada no son bytes enteros.") }
            let relleno = (64 - limpio.count % 64) % 64
            cuerpos.append((try FirmaEvm.palabra(BigUInt(UInt64(limpio.count / 2)))) + limpio + String(repeating: "0", count: relleno))
        }
        var s = selMulticall
        s += try FirmaEvm.palabra(BigUInt(32))                            // puntero al array
        s += try FirmaEvm.palabra(BigUInt(UInt64(llamadas.count)))        // cuantas
        var desplazamiento = UInt64(32 * llamadas.count)
        for c in cuerpos {
            s += try FirmaEvm.palabra(BigUInt(desplazamiento))
            desplazamiento += UInt64(c.count / 2)
        }
        for c in cuerpos { s += c }
        return s
    }

    /// `approve(router, cantidad)` sobre el token que entra.
    public static func datosPermiso(_ cantidad: BigUInt) throws -> String {
        selApprove + (try FirmaEvm.palabraDireccion(router)) + (try FirmaEvm.palabra(cantidad))
    }

    public struct Cambio {
        public let datos: [UInt8]
        public let valorWei: BigUInt
    }

    /// Lo que hay que firmar: el `data` del router y el `value` en ETH.
    public static func cambio(claveRuta: String, comision: Int, cuenta: String,
                              cantidadEntra: BigUInt, salidaMinima: BigUInt) throws -> Cambio {
        let r = try ruta(claveRuta)
        let mia = try FirmaEvm.direccionValida(cuenta)

        // En los tres casos lo que sale del pool va primero al ROUTER y de ahi se
        // reparte en la misma transaccion: al dueño lo suyo y a Koberlet su 0,5 %.
        if r.saleEth {
            // El router se queda el WETH y lo desenvuelve; el suelo se aplica al
            // desenvolver, por eso el cambio va con minimo 0.
            let datos = try datosMulticall([
                try datosCambio(tokenIn: r.tokenIn, tokenOut: r.tokenOut, comision: comision, destinatario: addressThis,
                                cantidadEntra: cantidadEntra, salidaMinima: BigUInt.cero),
                try datosDesenvolverConComision(salidaMinima, mia),
            ])
            return Cambio(datos: try Hex.deHex(datos), valorWei: BigUInt.cero)
        }
        if r.entraEth {
            // El ETH viaja como `value`; `refundETH` devuelve lo que sobre.
            let datos = try datosMulticall([
                try datosCambio(tokenIn: r.tokenIn, tokenOut: r.tokenOut, comision: comision, destinatario: addressThis,
                                cantidadEntra: cantidadEntra, salidaMinima: salidaMinima),
                try datosBarrerConComision(r.tokenOut, salidaMinima, mia),
                datosDevolverEth(),
            ])
            return Cambio(datos: try Hex.deHex(datos), valorWei: cantidadEntra)
        }
        // Token por token: en dos pasos, para poder repartir lo que sale.
        let datos = try datosMulticall([
            try datosCambio(tokenIn: r.tokenIn, tokenOut: r.tokenOut, comision: comision, destinatario: addressThis,
                            cantidadEntra: cantidadEntra, salidaMinima: salidaMinima),
            try datosBarrerConComision(r.tokenOut, salidaMinima, mia),
        ])
        return Cambio(datos: try Hex.deHex(datos), valorWei: BigUInt.cero)
    }
}
