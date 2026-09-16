// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import org.bouncycastle.crypto.generators.SCrypt
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import java.security.SecureRandom

/**
 * EL COFRE - cifrado y descifrado de la boveda.
 *
 * Mismo formato de fichero que el Koberlet de escritorio (`lib/vault.js`):
 *
 *   { v, kdf: { salt, N, r, p }, iv, tag, ct }   todo en base64
 *
 * AES-256-GCM con clave derivada por scrypt. Que el formato sea EL MISMO no es
 * capricho: permite que una copia hecha en el ordenador se restaure en el movil
 * y al reves. Si aqui se hubiera usado otro formato "porque es mas comodo en
 * Android", esa puerta se cerraba para siempre.
 *
 * Esta clase no toca ficheros ni Android a proposito: asi se puede probar entera
 * en el ordenador, con tests normales, sin emulador ni movil.
 */
object Cofre {

    // scrypt: mismos parametros que el escritorio. En un movil de gama media esto
    // tarda entre 2 y 4 segundos, y es tiempo bien gastado: es justo lo que hace
    // inviable probar contrasenas a lo bruto sobre una boveda robada.
    const val N = 1 shl 15
    const val R = 8
    const val P = 1
    private const val LARGO_CLAVE = 32
    private const val LARGO_TAG = 128          // bits

    // Suelo anti-rebaja: una boveda que llegue con parametros flojos se rechaza.
    // Si no, bastaria con editar el fichero robado y poner N=2 para que probar
    // contrasenas saliera gratis.
    private const val N_MINIMO = 1 shl 14

    class BovedaCorrupta(mensaje: String) : Exception(mensaje)
    class ContrasenaIncorrecta : Exception("Contraseña incorrecta.")

    fun derivar(contrasena: String, sal: ByteArray, n: Int = N, r: Int = R, p: Int = P): ByteArray =
        SCrypt.generate(contrasena.toByteArray(Charsets.UTF_8), sal, n, r, p, LARGO_CLAVE)

    /** Cifra `claro` y devuelve el JSON de la boveda. El IV es NUEVO en cada escritura: en GCM repetirlo destruye la seguridad. */
    fun cifrar(clave: ByteArray, sal: ByteArray, claro: String): String {
        val iv = ByteArray(12)
        SecureRandom().nextBytes(iv)
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.ENCRYPT_MODE, SecretKeySpec(clave, "AES"), GCMParameterSpec(LARGO_TAG, iv))
        val salida = c.doFinal(claro.toByteArray(Charsets.UTF_8))
        // Java pega el tag al final del cifrado; el formato del escritorio los
        // guarda separados, asi que aqui se parten para que cuadren los dos.
        val corte = salida.size - 16
        val ct = salida.copyOfRange(0, corte)
        val tag = salida.copyOfRange(corte, salida.size)
        val b = Base64.getEncoder()
        return """{"v":1,"kdf":{"salt":"${b.encodeToString(sal)}","N":$N,"r":$R,"p":$P},""" +
               """"iv":"${b.encodeToString(iv)}","tag":"${b.encodeToString(tag)}","ct":"${b.encodeToString(ct)}"}"""
    }

    /** Descifra. Lanza ContrasenaIncorrecta si no cuadra (en GCM no se puede distinguir de un fichero manipulado). */
    fun descifrar(json: String, contrasena: String): String {
        val o = org.json.JSONObject(json)
        val kdf = o.getJSONObject("kdf")
        val n = kdf.getInt("N"); val r = kdf.getInt("r"); val p = kdf.getInt("p")
        if (n < N_MINIMO || r < 8 || p < 1) {
            throw BovedaCorrupta("Los parámetros de cifrado de esta bóveda están por debajo del mínimo de seguridad.")
        }
        val d = Base64.getDecoder()
        val clave = derivar(contrasena, d.decode(kdf.getString("salt")), n, r, p)
        val ct = d.decode(o.getString("ct"))
        val tag = d.decode(o.getString("tag"))
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.DECRYPT_MODE, SecretKeySpec(clave, "AES"), GCMParameterSpec(LARGO_TAG, d.decode(o.getString("iv"))))
        return try {
            String(c.doFinal(ct + tag), Charsets.UTF_8)
        } catch (e: Exception) {
            throw ContrasenaIncorrecta()
        } finally {
            clave.fill(0)
        }
    }

    fun salNueva(): ByteArray = ByteArray(16).also { SecureRandom().nextBytes(it) }
}
