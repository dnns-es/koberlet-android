package es.dnns.koberlet

import org.bouncycastle.asn1.sec.SECNamedCurves
import org.bouncycastle.crypto.digests.KeccakDigest
import org.bouncycastle.crypto.params.ECPrivateKeyParameters
import org.bouncycastle.crypto.params.ECDomainParameters
import org.bouncycastle.crypto.signers.ECDSASigner
import org.bouncycastle.crypto.signers.HMacDSAKCalculator
import org.bouncycastle.crypto.digests.SHA256Digest
import java.math.BigInteger

/**
 * FIRMAR TRANSACCIONES DE ETHEREUM, AQUI DENTRO.
 *
 * Es el hermano de [FirmaKda] y sigue su misma regla, que es la regla de toda la
 * boveda: **el WebView no manda nada que decida donde va el dinero**. No llega un
 * `data` ya montado ni un hash que firmar a ciegas; llegan numeros y una cuenta, y
 * la transaccion se arma aqui con plantillas fijas. Si un dia alguien mete codigo
 * en la parte web -pintando el nombre de un token, por ejemplo-, lo mas que puede
 * hacer es pedir un envio; no puede cambiar a que contrato va ni que funcion llama.
 *
 * Lo que hay aqui, en orden:
 *
 *   1. RLP, que es como Ethereum serializa. Tonto pero con trampa en los bordes.
 *   2. La firma ECDSA sobre secp256k1, con **s canonica** y **recovery id**. Sin la
 *      s baja la red la rechaza (EIP-2); sin el recovery id nadie sabe que
 *      direccion firmo.
 *   3. La transaccion EIP-1559 (tipo 2), que es la que se usa hoy.
 *   4. Los datos de las dos llamadas que hacen falta: `approve` del ERC-20 y el
 *      `transferRemote` del puente.
 *
 * TODO lo que decide el destino es constante de este fichero. Lo que viene de
 * fuera son cantidades, el nonce y el gas -y hasta eso va acotado-.
 */
object FirmaEvm {

    // --- Lo que NO se negocia ------------------------------------------------

    /** Ethereum de verdad. Otra cadena significa otro contrato y otro dinero. */
    const val CHAIN_ID = 1L

    /** USDC en Ethereum. Con las mayusculas de EIP-55, que son su suma de verificacion. */
    const val TOKEN_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

    /** USDT en Ethereum. Tambien de seis decimales. */
    const val TOKEN_USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

    /** El router del puente (el del FORK, no el de Hyperlane oficial). */
    const val ROUTER = "0x81C2813aa88F66bca1e55838045Aaceb72FEbFc1"

    /** Kadena, en la numeracion de dominios del puente. */
    const val DOMINIO_KDA = 626

    /** El puente vive en la chain 2 de Kadena. */
    const val CHAIN_PUENTE = 2

    /** USDC tiene 6 decimales, no 18. Confundirlos es un factor de un billon. */
    const val DECIMALES_USDC = 6

    // Selectores: los primeros 4 bytes del keccak de la firma de la funcion.
    // Se comprueban en las pruebas calculandolos, no se copian de un papel.
    private const val SEL_APPROVE = "095ea7b3"          // approve(address,uint256)
    private const val SEL_TRANSFER = "a9059cbb"         // transfer(address,uint256)
    private const val SEL_TRANSFER_REMOTE = "80eefc06"  // transferRemote(uint32,bytes,uint256,uint16)

    /**
     * Tope del peaje que se paga en ETH, en wei. El peaje lo dice el contrato y
     * puede cambiar; lo que no puede es dispararse. 0,05 ETH es muchisimo mas de lo
     * que ha costado nunca este viaje, y aun asi es una perdida acotada si el nodo
     * al que se pregunto contesta cualquier cosa.
     */
    val PEAJE_MAXIMO_WEI: BigInteger = BigInteger("50000000000000000")   // 0,05 ETH

    /** Tope del gas que se puede comprometer, tambien por si acaso. */
    const val GAS_MAXIMO = 900_000L
    val PRECIO_GAS_MAXIMO_WEI: BigInteger = BigInteger("500000000000")   // 500 gwei

    private val curva = SECNamedCurves.getByName("secp256k1")
    private val dominio = ECDomainParameters(curva.curve, curva.g, curva.n, curva.h)

    /** La mitad del orden de la curva: por encima, la firma no es canonica. */
    private val MEDIO_N: BigInteger = curva.n.shiftRight(1)

    // --- Keccak y hex --------------------------------------------------------

    fun keccak256(datos: ByteArray): ByteArray {
        val d = KeccakDigest(256)
        d.update(datos, 0, datos.size)
        val salida = ByteArray(32)
        d.doFinal(salida, 0)
        return salida
    }

    fun aHex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

    fun deHex(texto: String): ByteArray {
        val h = texto.trim().removePrefix("0x").removePrefix("0X").lowercase()
        if (h.length % 2 != 0 || !Regex("^[0-9a-f]*$").matches(h)) {
            throw IllegalArgumentException("Eso no es hexadecimal.")
        }
        return ByteArray(h.length / 2) { h.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
    }

    /**
     * Una direccion de Ethereum, comprobada y en minusculas.
     *
     * No se acepta nada que no sean 40 caracteres hex con su 0x. Una direccion a
     * medias no da error en la red: da una direccion distinta, que es de nadie.
     */
    fun direccionValida(direccion: String): String {
        val a = direccion.trim()
        if (!Regex("^0x[0-9a-fA-F]{40}$").matches(a)) {
            throw IllegalArgumentException("La dirección de Ethereum tiene que ser 0x y 40 caracteres.")
        }
        return a.lowercase()
    }

    // --- RLP -----------------------------------------------------------------
    //
    // Serializacion de Ethereum. Dos casos: una tira de bytes o una lista. Los
    // bordes son lo unico delicado: un solo byte por debajo de 0x80 va tal cual, y
    // la longitud se escribe SIN ceros por delante.

    internal fun rlpBytes(datos: ByteArray): ByteArray {
        if (datos.size == 1 && (datos[0].toInt() and 0xff) < 0x80) return datos
        return cabecera(0x80, datos.size) + datos
    }

    internal fun rlpLista(partes: List<ByteArray>): ByteArray {
        val cuerpo = partes.fold(ByteArray(0)) { a, b -> a + b }
        return cabecera(0xc0, cuerpo.size) + cuerpo
    }

    private fun cabecera(base: Int, largo: Int): ByteArray {
        if (largo <= 55) return byteArrayOf((base + largo).toByte())
        val l = sinCerosDelante(BigInteger.valueOf(largo.toLong()).toByteArray())
        return byteArrayOf((base + 55 + l.size).toByte()) + l
    }

    /**
     * Los enteros van en RLP **sin ceros por delante**, y el cero es la cadena
     * vacia. No es un capricho de estilo: un cero de mas cambia la codificacion y
     * con ella el hash, asi que el nodo rechazaria la transaccion.
     */
    private fun sinCerosDelante(bytes: ByteArray): ByteArray {
        var i = 0
        while (i < bytes.size && bytes[i].toInt() == 0) i++
        return bytes.copyOfRange(i, bytes.size)
    }

    internal fun rlpEntero(n: BigInteger): ByteArray {
        if (n.signum() < 0) throw IllegalArgumentException("En una transacción no hay números negativos.")
        if (n.signum() == 0) return rlpBytes(ByteArray(0))
        return rlpBytes(sinCerosDelante(n.toByteArray()))
    }

    internal fun rlpEntero(n: Long): ByteArray = rlpEntero(BigInteger.valueOf(n))

    // --- Firma ---------------------------------------------------------------

    /** Una firma: las dos mitades y el bit que dice cual de las dos claves es. */
    data class Firma(val r: BigInteger, val s: BigInteger, val yParity: Int)

    /**
     * Firma 32 bytes con la privada, en ECDSA determinista (RFC 6979).
     *
     * Determinista significa que la misma clave y el mismo mensaje dan siempre la
     * misma firma: no hace falta una fuente de azar, y por tanto no hay una fuente
     * de azar que pueda salir mal. Un `k` repetido o predecible con ECDSA no es un
     * fallo cualquiera: **revela la clave privada**.
     *
     * La `s` se baja a la mitad inferior (EIP-2) y el `recovery id` se calcula
     * probando: se recupera la publica de cada candidato y se queda el que
     * coincide con la de verdad. Es lo honesto -no hay que fiarse de una formula
     * copiada- y son dos multiplicaciones de curva, que aqui no cuestan nada.
     */
    fun firmar(hash: ByteArray, privada: ByteArray): Firma {
        if (hash.size != 32) throw IllegalArgumentException("Lo que se firma son 32 bytes.")
        val d = BigInteger(1, privada)
        if (d.signum() <= 0 || d >= curva.n) throw IllegalArgumentException("Clave privada fuera de rango.")

        val firmador = ECDSASigner(HMacDSAKCalculator(SHA256Digest()))
        firmador.init(true, ECPrivateKeyParameters(d, dominio))
        val rs = firmador.generateSignature(hash)
        val r = rs[0]
        var s = rs[1]
        var bajada = false
        if (s > MEDIO_N) { s = curva.n.subtract(s); bajada = true }

        val publica = curva.g.multiply(d).normalize().getEncoded(false)
        for (v in 0..1) {
            val cand = recuperarPublica(v, r, s, hash) ?: continue
            if (cand.contentEquals(publica)) return Firma(r, s, v)
        }
        // Si no encaja ninguno es que algo va muy mal en la curva o en el hash. No
        // se devuelve una firma "a ver si cuela": se para.
        throw IllegalStateException("No se pudo determinar el recovery id de la firma." + if (bajada) "" else "")
    }

    /** La clave publica que produciria esa firma con ese `v`, o null si no sale. */
    internal fun recuperarPublica(v: Int, r: BigInteger, s: BigInteger, hash: ByteArray): ByteArray? {
        val n = curva.n
        val x = r                                   // el caso r > n es despreciable y aqui se ignora
        val comprimida = ByteArray(33)
        comprimida[0] = (0x02 + (v and 1)).toByte()
        System.arraycopy(aBytes32(x), 0, comprimida, 1, 32)
        val R = try { curva.curve.decodePoint(comprimida) } catch (e: Exception) { return null }
        if (!R.multiply(n).isInfinity) return null

        val e = BigInteger(1, hash)
        val rInv = r.modInverse(n)
        val q = R.multiply(s).add(curva.g.multiply(e.negate().mod(n))).multiply(rInv).normalize()
        return q.getEncoded(false)
    }

    private fun aBytes32(n: BigInteger): ByteArray {
        val crudo = n.toByteArray()
        val salida = ByteArray(32)
        val desde = maxOf(0, crudo.size - 32)
        System.arraycopy(crudo, desde, salida, 32 - (crudo.size - desde), crudo.size - desde)
        return salida
    }

    // --- La transaccion ------------------------------------------------------

    /** Lo que hace falta saber de la red para poder firmar. */
    data class Sobre(
        val nonce: Long,
        val gasLimit: Long,
        val maxFeePerGas: BigInteger,
        val maxPriorityFeePerGas: BigInteger,
    )

    /**
     * Arma y firma una transaccion EIP-1559 (tipo 2) y devuelve el `rawTransaction`
     * listo para `eth_sendRawTransaction`.
     *
     * Lo que se firma es `keccak(0x02 || rlp([...]))` **sin** las tres ultimas
     * casillas; lo que se manda es lo mismo pero con la firma dentro. Esa
     * diferencia es justo lo que hace que una firma no valga para otra transaccion.
     */
    fun transaccionFirmada(
        a: String,
        valorWei: BigInteger,
        datos: ByteArray,
        sobre: Sobre,
        privada: ByteArray,
    ): String {
        val destino = deHex(direccionValida(a))
        comprobarSobre(sobre)
        if (valorWei.signum() < 0) throw IllegalArgumentException("El valor no puede ser negativo.")

        val campos = listOf(
            rlpEntero(CHAIN_ID),
            rlpEntero(sobre.nonce),
            rlpEntero(sobre.maxPriorityFeePerGas),
            rlpEntero(sobre.maxFeePerGas),
            rlpEntero(sobre.gasLimit),
            rlpBytes(destino),
            rlpEntero(valorWei),
            rlpBytes(datos),
            rlpLista(emptyList()),                 // accessList vacia
        )

        val paraFirmar = byteArrayOf(0x02) + rlpLista(campos)
        val f = firmar(keccak256(paraFirmar), privada)

        val conFirma = campos + listOf(
            rlpEntero(f.yParity.toLong()),
            rlpEntero(f.r),
            rlpEntero(f.s),
        )
        return "0x02" + aHex(rlpLista(conFirma))
    }

    private fun comprobarSobre(s: Sobre) {
        if (s.nonce < 0) throw IllegalArgumentException("El nonce no puede ser negativo.")
        if (s.gasLimit <= 0 || s.gasLimit > GAS_MAXIMO) {
            throw IllegalArgumentException("El límite de gas está fuera de lo razonable.")
        }
        if (s.maxFeePerGas.signum() <= 0 || s.maxFeePerGas > PRECIO_GAS_MAXIMO_WEI) {
            throw IllegalArgumentException("El precio del gas está fuera de lo razonable.")
        }
        if (s.maxPriorityFeePerGas.signum() < 0 || s.maxPriorityFeePerGas > s.maxFeePerGas) {
            throw IllegalArgumentException("La propina no puede pasar del precio máximo del gas.")
        }
    }

    // --- Los datos de cada llamada -------------------------------------------

    /** Un entero o una direccion en la palabra de 32 bytes que pide la ABI. */
    private fun palabra(n: BigInteger): String {
        if (n.signum() < 0) throw IllegalArgumentException("Aquí no hay números negativos.")
        val h = n.toString(16)
        if (h.length > 64) throw IllegalArgumentException("El número no cabe en 32 bytes.")
        return h.padStart(64, '0')
    }

    private fun palabraDireccion(a: String): String =
        direccionValida(a).removePrefix("0x").padStart(64, '0')

    /**
     * `approve(router, cantidad)` sobre el USDC.
     *
     * El `spender` NO viene de fuera: es el router del puente, constante de este
     * fichero. Dar permiso es dejar que otro contrato mueva tu dinero, asi que a
     * quien se le da es exactamente lo que no puede decidir la parte web.
     *
     * Y se aprueba la cantidad JUSTA, no el infinito que reparte medio Ethereum:
     * si el contrato del puente resulta tener un fallo, con permiso infinito se
     * lleva todo el USDC de la cuenta; con el justo, solo lo que ibas a mandar.
     */
    fun datosPermiso(cantidadBase: BigInteger): ByteArray {
        if (cantidadBase.signum() <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        return deHex(SEL_APPROVE + palabraDireccion(ROUTER) + palabra(cantidadBase))
    }

    /**
     * `transfer(para, cantidad)` de un ERC-20: mandarle el token a alguien.
     *
     * Aqui SI viene de fuera a donde va el dinero, porque eso es justo lo que se
     * esta haciendo: un envio. Lo que no viene de fuera es el CONTRATO al que se
     * llama -lo elige [KoberletVault.firmarEnvioEvm] de una lista de dos- ni la
     * funcion. Y la direccion pasa por [direccionValida] antes de entrar en la
     * palabra de 32 bytes: 39 caracteres en vez de 40 no dan error en la red, dan
     * una direccion distinta que no es de nadie.
     */
    fun datosEnvioToken(para: String, cantidadBase: BigInteger): ByteArray {
        if (cantidadBase.signum() <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        return deHex(SEL_TRANSFER + palabraDireccion(para) + palabra(cantidadBase))
    }

    /**
     * El CUSTODIO de una cuenta Kadena: el guardian escrito en JSON, tal cual, sin
     * espacios y con `pred` delante.
     *
     * Esto se calcula AQUI y nunca se teclea ni llega hecho. Es el hallazgo R1 del
     * puente: el contrato de Solidity acepta como destinatario cualquier secuencia
     * de bytes sin rechistar, y quien la valida es la orilla Kadena al entregar,
     * cuando el dinero ya ha salido. Un caracter de mas y el token se queda
     * bloqueado en Ethereum **para siempre**. Costo 1 USDC aprenderlo.
     */
    fun custodioDe(cuentaKda: String): ByteArray {
        val pk = cuentaKda.trim().removePrefix("k:")
        if (!Regex("^[0-9a-fA-F]{64}$").matches(pk)) {
            throw IllegalArgumentException("Para el puente la cuenta Kadena tiene que ser k: y 64 caracteres.")
        }
        val json = "{\"pred\":\"keys-all\",\"keys\":[\"${pk.lowercase()}\"]}"
        return json.toByteArray(Charsets.US_ASCII)
    }

    /**
     * `transferRemote(uint32 dominio, bytes destinatario, uint256 cantidad, uint16 chain)`.
     *
     * El dominio y la chain son constantes: este puente va a Kadena y el puente
     * vive en la chain 2. De fuera solo entran la cuenta de destino -que se
     * convierte aqui en custodio- y la cantidad.
     *
     * La cabecera son cuatro palabras; la tercera dice donde empieza el
     * destinatario, que va al final con su longitud delante y rellenado a multiplo
     * de 32. Ese 0x80 no es magia: son esas cuatro palabras.
     */
    fun datosPuenteHaciaKadena(cuentaKda: String, cantidadBase: BigInteger): ByteArray {
        if (cantidadBase.signum() <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        val custodio = custodioDe(cuentaKda)
        val relleno = (32 - custodio.size % 32) % 32

        val sb = StringBuilder(SEL_TRANSFER_REMOTE)
        sb.append(palabra(BigInteger.valueOf(DOMINIO_KDA.toLong())))
        sb.append(palabra(BigInteger.valueOf(0x80)))
        sb.append(palabra(cantidadBase))
        sb.append(palabra(BigInteger.valueOf(CHAIN_PUENTE.toLong())))
        sb.append(palabra(BigInteger.valueOf(custodio.size.toLong())))
        sb.append(aHex(custodio))
        repeat(relleno) { sb.append("00") }
        return deHex(sb.toString())
    }

    /**
     * De «5,25 USDC» a las unidades enteras del contrato, sin pasar por coma
     * flotante.
     *
     * Un `Double` con 6 decimales todavia aguanta, pero el habito de redondear
     * dinero con flotantes es el que acaba mandando 0,999999 en vez de 1. Se parte
     * el texto por la coma y se cuenta.
     */
    fun aUnidades(cantidad: String, decimales: Int): BigInteger {
        val limpio = cantidad.trim().replace(',', '.')
        if (!Regex("^[0-9]+(\\.[0-9]*)?$").matches(limpio)) {
            throw IllegalArgumentException("Eso no es una cantidad.")
        }
        val partes = limpio.split('.')
        val enteros = partes[0]
        val decs = if (partes.size > 1) partes[1] else ""
        if (decs.length > decimales) {
            throw IllegalArgumentException("Ese token no tiene tantos decimales.")
        }
        val todo = enteros + decs.padEnd(decimales, '0')
        val n = BigInteger(todo)
        if (n.signum() <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        return n
    }

    /** El peaje que se manda como `value`, acotado. */
    fun peajeComprobado(peajeWei: BigInteger): BigInteger {
        if (peajeWei.signum() < 0) throw IllegalArgumentException("El peaje no puede ser negativo.")
        if (peajeWei > PEAJE_MAXIMO_WEI) {
            throw IllegalArgumentException("El peaje que dice el contrato es disparatado; no se firma.")
        }
        return peajeWei
    }
}
