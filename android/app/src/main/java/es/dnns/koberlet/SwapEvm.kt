package es.dnns.koberlet

import java.math.BigInteger

/**
 * CAMBIAR UNAS MONEDAS POR OTRAS EN ETHEREUM (Uniswap v3).
 *
 * Es el Mercado del escritorio, traido al movil ahora que la boveda sabe firmar en
 * Ethereum. Lo pidio Antonio: «en mercado de eth quiero poder pasar usdc a eth y de
 * reves, y de usdt a usdc y de reves, como en la app de escritorio».
 *
 * LA REGLA DE SIEMPRE, aplicada aqui: la pantalla NO pasa direcciones de contratos.
 * Elige entre CUATRO RUTAS con nombre -«usdc2eth», «eth2usdc», «usdt2usdc»,
 * «usdc2usdt»- y cada una sabe de memoria que token entra, cual sale y cuantos
 * decimales tienen. Asi lo peor que puede pedir una parte web comprometida es un
 * cambio entre monedas conocidas, nunca mandar el dinero a un contrato suyo.
 *
 * DOS COSAS QUE NO SON OBVIAS Y CUESTAN DINERO SI SE IGNORAN:
 *
 *   - Uniswap no conoce el ETH suelto: sus pools son de WETH, el ETH envuelto. Por
 *     eso el cambio con ETH va dentro de un `multicall`, que hace el cambio y
 *     ademas envuelve o desenvuelve en la misma transaccion. Si no, el usuario se
 *     queda con WETH y sin saber que es eso.
 *   - El SUELO (`amountOutMinimum`) es lo unico que protege de que te cambien el
 *     precio entre que miras y firmas. Va DENTRO de lo firmado, y es el que el
 *     dueño vio en la pantalla: recalcularlo al firmar dejaria que un nodo hostil
 *     mintiera dos veces. Es el hallazgo #3 de la revision del escritorio de
 *     julio de 2026, y viene aprendido.
 */
object SwapEvm {

    // --- Los contratos, que no se negocian -----------------------------------

    /** SwapRouter02 de Uniswap en Ethereum. */
    const val ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"

    const val WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const val USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    const val USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

    /**
     * Dos direcciones de mentira que el router entiende como ordenes:
     * «pagalo a quien firma» y «quedatelo tu». La segunda es la que permite que el
     * router conserve el WETH para desenvolverlo en el mismo multicall.
     */
    private const val MSG_SENDER = "0x0000000000000000000000000000000000000001"
    private const val ADDRESS_THIS = "0x0000000000000000000000000000000000000002"

    // Selectores. Las pruebas los recalculan con keccak en vez de creerselos.
    private const val SEL_EXACT_INPUT_SINGLE = "04e45aaf"
    private const val SEL_UNWRAP_WETH9 = "49404b7c"
    private const val SEL_REFUND_ETH = "12210e8a"
    private const val SEL_MULTICALL = "ac9650d8"
    private const val SEL_APPROVE = "095ea7b3"

    /** Una ruta: que entra, que sale y con cuantos decimales cada uno. */
    data class Ruta(
        val clave: String,
        val tokenIn: String,
        val tokenOut: String,
        val decIn: Int,
        val decOut: Int,
        /** El ETH suelto entra como `value` de la transaccion, no como token. */
        val entraEth: Boolean,
        /** Al salir hay que desenvolver el WETH para devolver ETH de verdad. */
        val saleEth: Boolean,
    )

    private val RUTAS = listOf(
        Ruta("usdc2eth", USDC, WETH, 6, 18, entraEth = false, saleEth = true),
        Ruta("eth2usdc", WETH, USDC, 18, 6, entraEth = true, saleEth = false),
        Ruta("usdt2usdc", USDT, USDC, 6, 6, entraEth = false, saleEth = false),
        Ruta("usdc2usdt", USDC, USDT, 6, 6, entraEth = false, saleEth = false),
    )

    fun ruta(clave: String): Ruta =
        RUTAS.find { it.clave == clave }
            ?: throw IllegalArgumentException("Ese cambio no está entre los que sabe hacer la app.")

    /** Las comisiones de pool que se prueban, de mas probable a menos. */
    val COMISIONES = listOf(500, 3000, 100)

    // --- Trozos de ABI -------------------------------------------------------

    private fun palabra(n: BigInteger): String {
        if (n.signum() < 0) throw IllegalArgumentException("Aquí no hay números negativos.")
        val h = n.toString(16)
        if (h.length > 64) throw IllegalArgumentException("El número no cabe en 32 bytes.")
        return h.padStart(64, '0')
    }

    private fun palabraDireccion(a: String): String =
        FirmaEvm.direccionValida(a).removePrefix("0x").padStart(64, '0')

    /**
     * `exactInputSingle((tokenIn,tokenOut,fee,recipient,amountIn,amountOutMinimum,sqrtPriceLimitX96))`.
     *
     * La tupla es toda de tipos estaticos, asi que va en linea: siete palabras
     * seguidas, sin punteros. Es lo que hace que esto se pueda escribir a mano sin
     * un codificador de ABI entero.
     */
    fun datosCambio(
        tokenIn: String,
        tokenOut: String,
        comision: Int,
        destinatario: String,
        cantidadEntra: BigInteger,
        salidaMinima: BigInteger,
    ): String {
        if (comision !in COMISIONES) throw IllegalArgumentException("Esa comisión de pool no es una de las que se usan.")
        if (cantidadEntra.signum() <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        if (salidaMinima.signum() < 0) throw IllegalArgumentException("El mínimo no puede ser negativo.")
        return SEL_EXACT_INPUT_SINGLE +
            palabraDireccion(tokenIn) +
            palabraDireccion(tokenOut) +
            palabra(BigInteger.valueOf(comision.toLong())) +
            palabraDireccion(destinatario) +
            palabra(cantidadEntra) +
            palabra(salidaMinima) +
            palabra(BigInteger.ZERO)                 // sqrtPriceLimitX96: sin límite
    }

    /** `unwrapWETH9(uint256 minimo, address para)`: devuelve ETH de verdad al dueño. */
    fun datosDesenvolver(minimo: BigInteger, para: String): String =
        SEL_UNWRAP_WETH9 + palabra(minimo) + palabraDireccion(para)

    /** `refundETH()`: devuelve el ETH que sobre, que si no se queda en el router. */
    fun datosDevolverEth(): String = SEL_REFUND_ETH

    /**
     * `multicall(bytes[] datos)`: varias llamadas en una transaccion.
     *
     * La codificacion de un array dinamico de `bytes` es la parte fea del ABI: un
     * puntero al array, su longitud, luego un puntero por elemento -relativo al
     * principio del array, no de todo- y por ultimo cada elemento con su longitud
     * delante y rellenado a multiplo de 32.
     */
    fun datosMulticall(llamadas: List<String>): String {
        if (llamadas.isEmpty()) throw IllegalArgumentException("Un multicall sin llamadas no hace nada.")
        val cuerpos = llamadas.map { hex ->
            val limpio = hex.removePrefix("0x")
            if (limpio.length % 2 != 0) throw IllegalArgumentException("Esa llamada no son bytes enteros.")
            val relleno = (64 - limpio.length % 64) % 64
            palabra(BigInteger.valueOf((limpio.length / 2).toLong())) + limpio + "0".repeat(relleno)
        }

        val sb = StringBuilder(SEL_MULTICALL)
        sb.append(palabra(BigInteger.valueOf(32)))                      // puntero al array
        sb.append(palabra(BigInteger.valueOf(llamadas.size.toLong())))  // cuántas

        // Los punteros de cada elemento se cuentan desde el final de la lista de
        // punteros: por eso se arranca en 32 × n.
        var desplazamiento = 32L * llamadas.size
        for (c in cuerpos) {
            sb.append(palabra(BigInteger.valueOf(desplazamiento)))
            desplazamiento += (c.length / 2).toLong()
        }
        for (c in cuerpos) sb.append(c)
        return sb.toString()
    }

    /** `approve(router, cantidad)` sobre el token que entra. */
    fun datosPermiso(cantidad: BigInteger): String {
        if (cantidad.signum() < 0) throw IllegalArgumentException("La cantidad no puede ser negativa.")
        return SEL_APPROVE + palabraDireccion(ROUTER) + palabra(cantidad)
    }

    /**
     * Lo que hay que firmar para hacer el cambio: el `data` del router y el `value`
     * en ETH, listos para `FirmaEvm.transaccionFirmada`.
     *
     * `salidaMinima` es el suelo que el dueño acepto en la pantalla, ya en unidades
     * del token que sale. No se recalcula aqui: eso es justo lo que no hay que
     * hacer.
     */
    data class Cambio(val datos: ByteArray, val valorWei: BigInteger)

    fun cambio(
        claveRuta: String,
        comision: Int,
        cuenta: String,
        cantidadEntra: BigInteger,
        salidaMinima: BigInteger,
    ): Cambio {
        val r = ruta(claveRuta)
        val mia = FirmaEvm.direccionValida(cuenta)

        if (r.saleEth) {
            // El router se queda el WETH y lo desenvuelve. El suelo se aplica en el
            // desenvolver, que revierte si sale menos; por eso el cambio va con
            // minimo 0: quien manda es la segunda llamada.
            val datos = datosMulticall(listOf(
                datosCambio(r.tokenIn, r.tokenOut, comision, ADDRESS_THIS, cantidadEntra, BigInteger.ZERO),
                datosDesenvolver(salidaMinima, mia),
            ))
            return Cambio(FirmaEvm.deHex(datos), BigInteger.ZERO)
        }

        if (r.entraEth) {
            // El ETH viaja como `value` y el router lo envuelve solo. `refundETH`
            // devuelve lo que sobre, que si no se queda atrapado en el contrato.
            val datos = datosMulticall(listOf(
                datosCambio(r.tokenIn, r.tokenOut, comision, MSG_SENDER, cantidadEntra, salidaMinima),
                datosDevolverEth(),
            ))
            return Cambio(FirmaEvm.deHex(datos), cantidadEntra)
        }

        // Token por token: una sola llamada, sin envolver nada.
        val datos = datosCambio(r.tokenIn, r.tokenOut, comision, mia, cantidadEntra, salidaMinima)
        return Cambio(FirmaEvm.deHex(datos), BigInteger.ZERO)
    }
}
