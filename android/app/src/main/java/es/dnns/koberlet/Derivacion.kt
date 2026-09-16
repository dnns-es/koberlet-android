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
 *              con HDKey de ed25519-keygen; es la derivacion de Chainweaver y
 *              eckoWallet).
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

    /** Clave publica Ed25519 en hexadecimal: lo que en Kadena va detras de "k:". */
    fun publicaKadena(privada: ByteArray): String {
        val p = Ed25519PrivateKeyParameters(privada, 0)
        return aHex(p.generatePublicKey().encoded)
    }

    fun cuentaKadena(semillaBytes: ByteArray, indice: Int): String =
        "k:" + publicaKadena(privadaKadena(semillaBytes, indice))

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
