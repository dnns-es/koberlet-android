// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import org.bouncycastle.crypto.digests.KeccakDigest
import org.bouncycastle.crypto.digests.SHA512Digest
import org.bouncycastle.crypto.macs.HMac
import org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters
import org.bouncycastle.crypto.params.KeyParameter
import org.bouncycastle.crypto.generators.PKCS5S2ParametersGenerator
import org.bouncycastle.crypto.PBEParametersGenerator
import org.bouncycastle.math.ec.rfc8032.Ed25519
import org.bouncycastle.asn1.sec.SECNamedCurves
import java.math.BigInteger
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * DERIVACION DE CLAVES - el nucleo del monedero.
 *
 * Se ha reimplementado en Kotlin a proposito. La alternativa era derivar en
 * JavaScript con @kadena/hd-wallet y pasarle al plugin las claves ya hechas,
 * pero eso obligaria a que la semilla cruzara al WebView, que es justo lo que
 * este diseño quiere evitar. Aqui la semilla nace, vive y muere en Kotlin.
 *
 * Se puede reimplementar porque Kadena no inventa nada: usa estandares.
 *   - Semilla: BIP-39 (PBKDF2-HMAC-SHA512, 2048 vueltas, sal "mnemonic").
 *   - Kadena:  SLIP-0010 sobre Ed25519, ruta m'/44'/626'/<indice>'
 *              (comprobado en el fuente de @kadena/hd-wallet 0.6.2, que deriva
 *              con HDKey de ed25519-keygen; es la derivacion de eckoWallet, Koala
 *              y las carteras modernas de Kadena).
 *   - Kadena "Chainweaver": OTRA derivacion, la de la cartera original de Kadena
 *              (y la que Linx y eckoWallet aceptan al importar). No es una ruta
 *              distinta: es el BIP32-Ed25519 de Cardano (libreria cardano-crypto,
 *              esquema v2), empaquetado en @kadena/hd-wallet/chainweaver. Da
 *              cuentas DISTINTAS de la misma semilla, y por eso existe aqui: hay
 *              gente cuyo dinero esta en esa cuenta y no en la otra. Se elige al
 *              importar; una cartera nueva siempre usa la de arriba.
 *   - EVM:     BIP-32 sobre secp256k1, ruta m/44'/60'/0'/0/0, como MetaMask.
 *
 * Nada de esto vale si no da EXACTAMENTE las mismas cuentas que las carteras de
 * siempre: una derivacion distinta significa que el dinero de alguien aparece en
 * una cuenta que no es la suya. Por eso hay tests con los vectores publicos, y
 * ahi esta la prueba de que esto es correcto y no "parece correcto".
 */
object Derivacion {

    private const val DURO = 0x80000000.toInt()   // indice endurecido de BIP-32/SLIP-0010

    // --- BIP-39 -------------------------------------------------------------

    private val palabras: List<String> by lazy {
        val flujo = Derivacion::class.java.getResourceAsStream("/bip39-english.txt")
            ?: throw IllegalStateException("Falta la lista de palabras BIP-39.")
        flujo.bufferedReader().readLines().map { it.trim() }.filter { it.isNotEmpty() }
    }

    /** Genera una semilla de 12 palabras con 128 bits de entropia del sistema. */
    fun generarSemilla(): String {
        val entropia = ByteArray(16)
        SecureRandom().nextBytes(entropia)
        return entropiaAPalabras(entropia)
    }

    fun entropiaAPalabras(entropia: ByteArray): String {
        val resumen = MessageDigest.getInstance("SHA-256").digest(entropia)
        val bitsSuma = entropia.size * 8 / 32          // 128 bits -> 4 bits de control
        val bits = StringBuilder()
        entropia.forEach { bits.append(String.format("%8s", Integer.toBinaryString(it.toInt() and 0xff)).replace(' ', '0')) }
        val bitsResumen = String.format("%8s", Integer.toBinaryString(resumen[0].toInt() and 0xff)).replace(' ', '0')
        bits.append(bitsResumen.substring(0, bitsSuma))

        return (0 until bits.length / 11).joinToString(" ") { i ->
            palabras[Integer.parseInt(bits.substring(i * 11, (i + 1) * 11), 2)]
        }
    }

    /**
     * Comprueba que la semilla existe de verdad: todas las palabras de la lista y
     * el control cuadra. Una semilla con una palabra mal escrita deriva cuentas
     * distintas SIN avisar, y el dueño creeria que ha perdido el dinero.
     */
    fun semillaValida(semilla: String): Boolean {
        val lista = semilla.trim().lowercase().split(Regex("\\s+"))
        if (lista.size !in listOf(12, 15, 18, 21, 24)) return false
        val bits = StringBuilder()
        for (p in lista) {
            val i = palabras.indexOf(p)
            if (i < 0) return false
            bits.append(String.format("%11s", Integer.toBinaryString(i)).replace(' ', '0'))
        }
        val bitsEntropia = lista.size * 11 * 32 / 33
        val bitsSuma = bits.length - bitsEntropia
        val entropia = ByteArray(bitsEntropia / 8)
        for (i in entropia.indices) {
            entropia[i] = Integer.parseInt(bits.substring(i * 8, i * 8 + 8), 2).toByte()
        }
        val resumen = MessageDigest.getInstance("SHA-256").digest(entropia)
        val esperado = String.format("%8s", Integer.toBinaryString(resumen[0].toInt() and 0xff))
            .replace(' ', '0').substring(0, bitsSuma)
        return bits.substring(bitsEntropia) == esperado
    }

    /** BIP-39: de palabras a semilla binaria de 64 bytes. */
    fun semillaABytes(semilla: String, contrasenaSemilla: String = ""): ByteArray {
        val gen = PKCS5S2ParametersGenerator(SHA512Digest())
        gen.init(
            PBEParametersGenerator.PKCS5PasswordToUTF8Bytes(semilla.trim().lowercase().replace(Regex("\\s+"), " ").toCharArray()),
            ("mnemonic$contrasenaSemilla").toByteArray(Charsets.UTF_8),
            2048,
        )
        return (gen.generateDerivedParameters(512) as KeyParameter).key
    }

    // --- SLIP-0010 (Ed25519) - Kadena ---------------------------------------

    private fun hmacSha512(clave: ByteArray, datos: ByteArray): ByteArray {
        val mac = HMac(SHA512Digest())
        mac.init(KeyParameter(clave))
        mac.update(datos, 0, datos.size)
        val salida = ByteArray(mac.macSize)
        mac.doFinal(salida, 0)
        return salida
    }

    /**
     * Clave privada Kadena del indice pedido. En SLIP-0010 sobre Ed25519 TODOS los
     * pasos son endurecidos: no existe derivacion publica, y por eso una cuenta no
     * permite calcular las hermanas.
     */
    fun privadaKadena(semillaBytes: ByteArray, indice: Int): ByteArray {
        var i = hmacSha512("ed25519 seed".toByteArray(Charsets.UTF_8), semillaBytes)
        var clave = i.copyOfRange(0, 32)
        var cadena = i.copyOfRange(32, 64)

        for (paso in intArrayOf(44 or DURO, 626 or DURO, indice or DURO)) {
            val datos = ByteArray(37)
            datos[0] = 0                                  // el 0x00 delante es lo que distingue Ed25519 en SLIP-0010
            System.arraycopy(clave, 0, datos, 1, 32)
            datos[33] = (paso ushr 24).toByte()
            datos[34] = (paso ushr 16).toByte()
            datos[35] = (paso ushr 8).toByte()
            datos[36] = paso.toByte()
            i = hmacSha512(cadena, datos)
            clave = i.copyOfRange(0, 32)
            cadena = i.copyOfRange(32, 64)
        }
        return clave
    }

    /**
     * Clave publica Ed25519 en hexadecimal: lo que en Kadena va detras de "k:".
     *
     * Admite las dos formas de clave privada que maneja la app: los 32 bytes de
     * una semilla Ed25519 normal, y los 64 bytes de una clave EXTENDIDA de
     * Chainweaver (escalar + prefijo), cuya publica no sale de hashear nada sino
     * de multiplicar el escalar tal cual.
     */
    fun publicaKadena(privada: ByteArray): String = when (privada.size) {
        32 -> aHex(Ed25519PrivateKeyParameters(privada, 0).generatePublicKey().encoded)
        64 -> aHex(publicaDeEscalar(privada.copyOfRange(0, 32)))
        else -> throw IllegalArgumentException("Una clave privada de Kadena son 32 o 64 bytes.")
    }

    fun cuentaKadena(semillaBytes: ByteArray, indice: Int): String =
        "k:" + publicaKadena(privadaKadena(semillaBytes, indice))

    // --- BIP32-Ed25519 de Cardano - la derivacion de Chainweaver ---------------
    //
    // Reescrito a partir de `cbits/encrypted_sign.c` de cardano-crypto (el C que
    // Chainweaver y @kadena/hd-wallet/chainweaver ejecutan compilado a WASM), y
    // comprobado byte a byte contra ese paquete en DerivacionTest. Lo que hace:
    //
    //   Raiz:  para i = 1, 2, ...: d = HMAC-SHA512(semilla BIP-39, "Root Seed Chain i")
    //          k = SHA-512(d[0..32]) con los bits ajustados de Ed25519
    //          (k[0] &= 248, k[31] &= 127, k[31] |= 64); si el bit 0x20 de k[31]
    //          queda puesto, esa i no vale y se prueba la siguiente.
    //          La clave extendida son los 64 bytes de k; el chain code, d[32..64].
    //   Hijo:  indice endurecido (0x80000000 + n) DIRECTO desde la raiz -aqui no
    //          hay 44'/626'-, con el indice en little-endian (esquema v2):
    //          z  = HMAC-SHA512(cc, 0x00 || k || indice)
    //          kL = kL + 8 * z[0..28]           (sin reducir modulo el orden)
    //          kR = kR + z[32..64]  (modulo 2^256)
    //          cc = HMAC-SHA512(cc, 0x01 || k || indice)[32..64]
    //
    // El resultado no es una semilla Ed25519 sino un escalar ya hecho, y por eso
    // la publica y la firma tienen su propio camino (`publicaDeEscalar`,
    // `FirmaKda.firmarExtendida`).

    private class NodoCw(val clave: ByteArray, val cadena: ByteArray)

    private fun raizChainweaver(semillaBytes: ByteArray): NodoCw {
        for (i in 1..1000) {
            val d = hmacSha512(semillaBytes, "Root Seed Chain $i".toByteArray(Charsets.US_ASCII))
            val k = MessageDigest.getInstance("SHA-512").digest(d.copyOfRange(0, 32))
            k[0] = (k[0].toInt() and 248).toByte()
            k[31] = (k[31].toInt() and 127).toByte()
            k[31] = (k[31].toInt() or 64).toByte()
            if (k[31].toInt() and 0x20 != 0) continue
            return NodoCw(k, d.copyOfRange(32, 64))
        }
        throw IllegalStateException("No sale una raíz Chainweaver de esta semilla.")
    }

    private fun hijoChainweaver(padre: NodoCw, indice: Int): NodoCw {
        val datos = ByteArray(69)
        System.arraycopy(padre.clave, 0, datos, 1, 64)
        datos[65] = indice.toByte()                       // little-endian: asi lo hace el esquema v2
        datos[66] = (indice ushr 8).toByte()
        datos[67] = (indice ushr 16).toByte()
        datos[68] = (indice ushr 24).toByte()

        datos[0] = 0
        val z = hmacSha512(padre.cadena, datos)
        datos[0] = 1
        val cadena = hmacSha512(padre.cadena, datos).copyOfRange(32, 64)

        // 8 * z[0..28]: multiply8_v2 del C, que deja 29 bytes utiles y por eso no
        // desborda al sumarlo al escalar del padre.
        val zl8 = ByteArray(32)
        var acarreo = 0
        for (i in 0 until 28) {
            val b = z[i].toInt() and 0xff
            zl8[i] = (((b shl 3) and 0xff) + (acarreo and 7)).toByte()
            acarreo = b ushr 5
        }
        zl8[28] = ((z[27].toInt() and 0xff) ushr 5).toByte()

        val hijo = ByteArray(64)
        var r = 0
        for (i in 0 until 32) {
            r = (zl8[i].toInt() and 0xff) + (padre.clave[i].toInt() and 0xff) + r
            hijo[i] = r.toByte()
            r = r ushr 8
        }
        r = 0
        for (i in 0 until 32) {
            r = (z[32 + i].toInt() and 0xff) + (padre.clave[32 + i].toInt() and 0xff) + r
            hijo[32 + i] = r.toByte()
            r = r ushr 8
        }
        return NodoCw(hijo, cadena)
    }

    /** Clave privada extendida (64 bytes) de Chainweaver para ese indice. */
    fun privadaChainweaver(semillaBytes: ByteArray, indice: Int): ByteArray =
        hijoChainweaver(raizChainweaver(semillaBytes), indice or DURO).clave

    /**
     * La clave en el formato completo de Chainweaver y Linx: 128 bytes = privada
     * extendida (64) + publica (32) + chain code (32). Es lo que esas carteras
     * exportan como "clave privada", y lo que aqui se acepta al importar.
     */
    fun claveCompletaChainweaver(semillaBytes: ByteArray, indice: Int): ByteArray {
        val nodo = hijoChainweaver(raizChainweaver(semillaBytes), indice or DURO)
        val salida = ByteArray(128)
        System.arraycopy(nodo.clave, 0, salida, 0, 64)
        System.arraycopy(publicaDeEscalar(nodo.clave.copyOfRange(0, 32)), 0, salida, 64, 32)
        System.arraycopy(nodo.cadena, 0, salida, 96, 32)
        return salida
    }

    fun cuentaChainweaver(semillaBytes: ByteArray, indice: Int): String =
        "k:" + publicaKadena(privadaChainweaver(semillaBytes, indice))

    /** Orden del grupo de Ed25519: 2^252 + 27742317777372353535851937790883648493. */
    val ORDEN_ED25519: BigInteger = BigInteger("7237005577332262213973186563042994240857116359379907606001950938285454250989")

    /** Un escalar en little-endian de 32 bytes, ya reducido modulo el orden. */
    fun escalarBytes(n: BigInteger): ByteArray {
        val be = aBytes32(n.mod(ORDEN_ED25519))
        return ByteArray(32) { be[31 - it] }
    }

    fun escalarDe(le: ByteArray): BigInteger = BigInteger(1, ByteArray(le.size) { le[le.size - 1 - it] })

    // La aritmetica de la curva, a mano con BigInteger. Bouncy Castle tiene la
    // multiplicacion por el punto base pero solo para semillas (la hashea antes),
    // y la que vale para un escalar suelto es privada. Son 30 lineas de RFC 8032
    // (seccion 5.1) en coordenadas afines: lentas (unos milisegundos por firma,
    // que en un movil no se notan) y sin tiempo constante, cosa que aqui se
    // asume: el escalar solo se usa en el propio aparato, para las carteras
    // Chainweaver, y el riesgo de medir tiempos desde fuera no existe en un
    // telefono que firma una vez cada mucho.
    private val P_ED25519: BigInteger = BigInteger.TWO.pow(255) - BigInteger.valueOf(19)
    private val D_ED25519: BigInteger =
        BigInteger.valueOf(-121665).multiply(BigInteger.valueOf(121666).modInverse(P_ED25519)).mod(P_ED25519)
    private val BASE_X = BigInteger("15112221349535400772501151409588531511454012693041857206046113283949847762202")
    private val BASE_Y = BigInteger("46316835694926478169428394003475163141307993866256225615783033603165251855960")

    private fun sumaEd(p1: Array<BigInteger>, p2: Array<BigInteger>): Array<BigInteger> {
        val (x1, y1) = p1
        val (x2, y2) = p2
        val x1x2 = x1 * x2
        val y1y2 = y1 * y2
        val dxy = D_ED25519 * x1x2 * y1y2
        val x3 = (x1 * y2 + x2 * y1) * (BigInteger.ONE + dxy).modInverse(P_ED25519)
        val y3 = (y1y2 + x1x2) * (BigInteger.ONE - dxy).modInverse(P_ED25519)
        return arrayOf(x3.mod(P_ED25519), y3.mod(P_ED25519))
    }

    /** escalar * B, codificado como en RFC 8032: la publica de una clave extendida. */
    fun publicaDeEscalar(escalarLe: ByteArray): ByteArray {
        var n = escalarDe(escalarLe).mod(ORDEN_ED25519)
        var acumulado = arrayOf(BigInteger.ZERO, BigInteger.ONE)      // el punto neutro
        var base = arrayOf(BASE_X, BASE_Y)
        while (n.signum() > 0) {
            if (n.testBit(0)) acumulado = sumaEd(acumulado, base)
            base = sumaEd(base, base)
            n = n.shiftRight(1)
        }
        val (x, y) = acumulado
        val salida = ByteArray(32)
        val yBytes = aBytes32(y)
        for (i in 0 until 32) salida[i] = yBytes[31 - i]
        if (x.testBit(0)) salida[31] = (salida[31].toInt() or 0x80).toByte()
        return salida
    }

    // --- BIP-32 (secp256k1) - EVM -------------------------------------------

    private val curva = SECNamedCurves.getByName("secp256k1")

    /** Ruta BIP-44 estandar de Ethereum: m/44'/60'/0'/0/<indice>. */
    fun privadaEvm(semillaBytes: ByteArray, indice: Int): ByteArray {
        var i = hmacSha512("Bitcoin seed".toByteArray(Charsets.UTF_8), semillaBytes)
        var clave = BigInteger(1, i.copyOfRange(0, 32))
        var cadena = i.copyOfRange(32, 64)

        for (paso in intArrayOf(44 or DURO, 60 or DURO, 0 or DURO, 0, indice)) {
            val datos = ByteArray(37)
            if (paso < 0) {                                // endurecido: se usa la privada
                datos[0] = 0
                System.arraycopy(aBytes32(clave), 0, datos, 1, 32)
            } else {                                       // normal: se usa la publica comprimida
                System.arraycopy(publicaComprimida(clave), 0, datos, 0, 33)
            }
            datos[33] = (paso ushr 24).toByte()
            datos[34] = (paso ushr 16).toByte()
            datos[35] = (paso ushr 8).toByte()
            datos[36] = paso.toByte()
            i = hmacSha512(cadena, datos)
            clave = (BigInteger(1, i.copyOfRange(0, 32)) + clave).mod(curva.n)
            cadena = i.copyOfRange(32, 64)
        }
        return aBytes32(clave)
    }

    private fun aBytes32(n: BigInteger): ByteArray {
        val crudo = n.toByteArray()
        val salida = ByteArray(32)
        // BigInteger mete un 0x00 delante si el bit alto esta puesto, y puede
        // devolver menos de 32 bytes: hay que alinear a la derecha siempre.
        val desde = maxOf(0, crudo.size - 32)
        System.arraycopy(crudo, desde, salida, 32 - (crudo.size - desde), crudo.size - desde)
        return salida
    }

    private fun publicaComprimida(privada: BigInteger): ByteArray =
        curva.g.multiply(privada).normalize().getEncoded(true)

    /** Direccion Ethereum con la suma de verificacion EIP-55 (las mayusculas SON la suma). */
    fun direccionEvm(privada: ByteArray): String {
        val punto = curva.g.multiply(BigInteger(1, privada)).normalize().getEncoded(false)
        val sinPrefijo = punto.copyOfRange(1, punto.size)          // fuera el 0x04
        val hash = keccak256(sinPrefijo)
        val cuerpo = aHex(hash.copyOfRange(12, 32))
        val hashCuerpo = aHex(keccak256(cuerpo.toByteArray(Charsets.UTF_8)))
        val sb = StringBuilder("0x")
        cuerpo.forEachIndexed { i, c ->
            sb.append(if (c.isDigit() || hashCuerpo[i].digitToInt(16) < 8) c else c.uppercaseChar())
        }
        return sb.toString()
    }

    private fun keccak256(datos: ByteArray): ByteArray {
        val d = KeccakDigest(256)
        d.update(datos, 0, datos.size)
        val salida = ByteArray(32)
        d.doFinal(salida, 0)
        return salida
    }

    fun aHex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

    /** El camino de vuelta de `aHex`. Exige pares completos y solo hex. */
    fun deHex(texto: String): ByteArray {
        val h = texto.trim().removePrefix("0x").removePrefix("0X").lowercase()
        if (h.length % 2 != 0 || !Regex("^[0-9a-f]*$").matches(h)) {
            throw IllegalArgumentException("Eso no es hexadecimal.")
        }
        return ByteArray(h.length / 2) { h.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
    }
}
