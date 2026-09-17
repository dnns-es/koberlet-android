// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import java.io.File
import java.security.KeyStore
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * HUELLA O CARA EN LUGAR DE LA CONTRASEÑA.
 *
 * Que hace falta entender antes de leer el codigo:
 *
 * La contrasena de Koberlet no es un "control de acceso": ES LA LLAVE que
 * descifra la boveda (scrypt -> AES-GCM). No hay forma de firmar sin ella. Asi
 * que "no pedirla en cada firma" solo puede significar una de dos cosas:
 *
 *   a) quedarsela en memoria mientras la app este abierta -y entonces cualquiera
 *      que coja el movil desbloqueado firma envios-, o
 *   b) guardarla en este aparato, envuelta por una clave que vive en el chip y
 *      que SOLO se puede usar tras identificarse con la cara, la huella o el
 *      codigo del movil.
 *
 * Aqui se hace (b), que es lo que hacen los bancos y lo unico que no baja el
 * liston. La clave envolvente:
 *
 *   - se genera DENTRO del Android Keystore y no sale de ahi nunca;
 *   - exige autenticacion del dueño en cada uso (`setUserAuthenticationRequired`);
 *   - se invalida sola si alguien añade una huella o una cara nuevas al movil
 *     (`setInvalidatedByBiometricEnrollment`), que es justo lo que quieres si te
 *     roban el telefono desbloqueado.
 *
 * Lo que SI hay que decirle al dueño con todas las letras, y la pantalla lo dice:
 * activar esto guarda su contrasena en el aparato. Cifrada y detras del chip,
 * pero guardada. Quien no quiera eso, no lo activa y sigue teclendola.
 */
object Huella {

    private const val ALIAS = "koberlet.biometria.v1"
    private const val FICHERO = "bio.json"
    private const val TAG_BITS = 128

    /**
     * Lo que se admite como identificacion: biometria fuerte o el codigo del movil.
     *
     * OJO CON ANDROID 9 Y 10 (API 28-29). Ahi la pareja BIOMETRIC_STRONG +
     * DEVICE_CREDENTIAL no esta soportada: `canAuthenticate()` devuelve
     * ERROR_UNSUPPORTED y el dialogo tampoco la acepta. Con la constante fija que
     * habia antes, un movil con lector perfectamente valido recibia un «este movil
     * no admite identificacion segura» que era mentira -paso el 12/09/2026 en el
     * telefono de un probador-. En esas versiones se pide solo biometria fuerte,
     * que ademas es lo unico que sirve para desbloquear una clave del Keystore
     * antes de Android 11.
     */
    private val PERMITIDO: Int
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
        } else {
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        }

    class SinBiometria(mensaje: String) : Exception(mensaje)
    class Cancelado : Exception("Se canceló la identificación.")

    private fun fichero(context: Context) = File(context.filesDir, FICHERO)

    /** ¿Hay algo con lo que identificarse en este movil? */
    fun disponible(context: Context): String? {
        return when (BiometricManager.from(context).canAuthenticate(PERMITIDO)) {
            BiometricManager.BIOMETRIC_SUCCESS -> null
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE ->
                "Este móvil no tiene lector de huella ni reconocimiento facial."
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ->
                "El lector no está disponible ahora mismo."
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
                "No hay ninguna huella, cara ni código configurado en este móvil. Añádelo en los ajustes de Android."
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED ->
                "Android pide una actualización de seguridad antes de poder usar el lector."
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED ->
                "El lector de este móvil no llega al nivel que exige el chip para guardar una contraseña."
            BiometricManager.BIOMETRIC_STATUS_UNKNOWN ->
                "Android no sabe decir si el lector de este móvil sirve; no se activa por si acaso."
            else -> "Este móvil no admite identificación segura."
        }
    }

    fun activada(context: Context): Boolean = fichero(context).exists()

    /**
     * Como se llama en ESTE aparato, para que la pantalla no diga "huella" donde
     * no hay lector de huella. Android no dice cual de los sensores va a salir,
     * asi que aqui se contesta por lo que TIENE el aparato: si lleva lector de
     * huella se dice huella, y si solo tiene cara se deja en blanco y la pantalla
     * usa una palabra que vale para los dos.
     */
    fun tipo(context: Context): String = when {
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT) -> "huella"
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_FACE) -> "cara"
        else -> ""
    }

    fun borrar(context: Context) {
        fichero(context).delete()
        try {
            KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.deleteEntry(ALIAS)
        } catch (_: Exception) { /* si no estaba, ya esta borrada */ }
    }

    // --- La clave envolvente ---------------------------------------------------

    private fun keystore(): KeyStore =
        KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    private fun claveNueva(): SecretKey {
        val g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        val spec = KeyGenParameterSpec.Builder(
            ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    // 0 segundos de validez = hay que identificarse en CADA uso.
                    setUserAuthenticationParameters(0, PERMITIDO_KEYSTORE)
                } else {
                    // En Android 9-10 esto es lo equivalente: -1 significa "solo con
                    // autenticacion biometrica y una vez por operacion".
                    @Suppress("DEPRECATION")
                    setUserAuthenticationValidityDurationSeconds(-1)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    // Si alguien añade su huella al movil, esta clave muere y hay
                    // que volver a activar la biometria con la contrasena.
                    setInvalidatedByBiometricEnrollment(true)
                }
            }
            .build()
        g.init(spec)
        return g.generateKey()
    }

    private val PERMITIDO_KEYSTORE: Int
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL
        } else 0

    private fun clave(): SecretKey? =
        (keystore().getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.secretKey

    // --- Guardar y recuperar ---------------------------------------------------

    /**
     * Guarda la contrasena envuelta. Pide identificacion: el Keystore no deja ni
     * CIFRAR con esta clave sin ella, y eso es a proposito -si cifrar fuera libre,
     * cualquiera podria sustituir lo guardado por otra cosa-.
     */
    fun guardar(
        actividad: FragmentActivity,
        contrasena: String,
        loQuePone: String? = null,
        alTerminar: (Exception?) -> Unit,
    ) {
        disponible(actividad)?.let { return alTerminar(SinBiometria(it)) }
        try {
            borrar(actividad)                       // una clave nueva por cada activacion
            val c = Cipher.getInstance("AES/GCM/NoPadding")
            c.init(Cipher.ENCRYPT_MODE, claveNueva())
            pedir(actividad, c, loQuePone ?: "Confirma que eres tú para activarlo") { cifrador, error ->
                if (cifrador == null) return@pedir alTerminar(error ?: Cancelado())
                try {
                    val ct = cifrador.doFinal(contrasena.toByteArray(Charsets.UTF_8))
                    val b = Base64.getEncoder()
                    fichero(actividad).writeText(
                        """{"iv":"${b.encodeToString(cifrador.iv)}","ct":"${b.encodeToString(ct)}"}"""
                    )
                    alTerminar(null)
                } catch (e: Exception) {
                    alTerminar(e)
                }
            }
        } catch (e: Exception) {
            alTerminar(e)
        }
    }

    /**
     * Devuelve la contrasena guardada, tras identificarse. Si la clave del chip ya
     * no vale -porque se añadio una huella nueva- se borra lo guardado y se dice:
     * eso NO es un fallo, es la proteccion funcionando.
     */
    fun recuperar(actividad: FragmentActivity, titulo: String, alTerminar: (String?, Exception?) -> Unit) {
        if (!activada(actividad)) return alTerminar(null, SinBiometria("La identificación no está activada."))
        val k = try {
            clave()
        } catch (e: Exception) {
            null
        }
        if (k == null) {
            borrar(actividad)
            return alTerminar(null, SinBiometria("La identificación ya no vale en este móvil. Vuelve a activarla con tu contraseña."))
        }
        try {
            val o = org.json.JSONObject(fichero(actividad).readText())
            val d = Base64.getDecoder()
            val iv = d.decode(o.getString("iv"))
            val ct = d.decode(o.getString("ct"))
            val c = Cipher.getInstance("AES/GCM/NoPadding")
            c.init(Cipher.DECRYPT_MODE, k, GCMParameterSpec(TAG_BITS, iv))
            pedir(actividad, c, titulo) { descifrador, error ->
                if (descifrador == null) return@pedir alTerminar(null, error ?: Cancelado())
                try {
                    alTerminar(String(descifrador.doFinal(ct), Charsets.UTF_8), null)
                } catch (e: Exception) {
                    alTerminar(null, e)
                }
            }
        } catch (e: android.security.keystore.KeyPermanentlyInvalidatedException) {
            borrar(actividad)
            alTerminar(null, SinBiometria("La identificación ya no vale en este móvil. Vuelve a activarla con tu contraseña."))
        } catch (e: Exception) {
            alTerminar(null, e)
        }
    }

    // --- El dialogo ------------------------------------------------------------

    /**
     * Saca el dialogo del sistema. El Cipher va DENTRO del CryptoObject: asi no es
     * un "¿eres tu? vale, pasa", sino que la clave del chip no se desbloquea si no
     * hay identificacion. La diferencia importa: lo primero se puede saltar
     * parcheando la app, lo segundo no.
     */
    private fun pedir(
        actividad: FragmentActivity,
        cifrador: Cipher,
        titulo: String,
        alTerminar: (Cipher?, Exception?) -> Unit,
    ) {
        // TODO dentro del try, montaje incluido. `PromptInfo.Builder().build()` y el
        // propio constructor tiran excepcion en algunos moviles -combinaciones de
        // autenticadores que ese Android no admite, fabricantes con su propia
        // version del dialogo-, y una excepcion suelta dentro de runOnUiThread no la
        // recoge nadie: se lleva la app por delante. Un monedero que se cierra solo
        // al tocar la huella es un monedero que da miedo, aunque no pierda nada.
        actividad.runOnUiThread {
            try {
                val prompt = BiometricPrompt(
                    actividad,
                    androidx.core.content.ContextCompat.getMainExecutor(actividad),
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(resultado: BiometricPrompt.AuthenticationResult) {
                            alTerminar(resultado.cryptoObject?.cipher, null)
                        }

                        override fun onAuthenticationError(codigo: Int, mensaje: CharSequence) {
                            alTerminar(null, Exception(mensaje.toString()))
                        }
                    },
                )
                val constructor = BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Koberlet")
                    .setSubtitle(titulo)
                    .setAllowedAuthenticators(PERMITIDO)
                // EL BOTON DE CANCELAR ES OBLIGATORIO cuando no se admite el codigo
                // del movil, y sin el `build()` lanza excepcion. Eso es justo lo que
                // pasaba en Android 9 y 10 -donde PERMITIDO es solo biometria- y por
                // eso alli la app se cerraba al tocar la huella mientras en Android
                // 11 y siguientes funcionaba: alli el codigo del movil va incluido y
                // el dialogo pone su propio boton. Poner los dos a la vez tambien
                // seria un error, de ahi la condicion.
                //
                // El texto se coge del sistema para que salga en el idioma del movil.
                if (PERMITIDO and BiometricManager.Authenticators.DEVICE_CREDENTIAL == 0) {
                    constructor.setNegativeButtonText(actividad.getString(android.R.string.cancel))
                }
                prompt.authenticate(constructor.build(), BiometricPrompt.CryptoObject(cifrador))
            } catch (e: Throwable) {
                // El detalle tecnico va al log del sistema, no a la cara del dueño:
                // a el le sirve saber que puede entrar con la contraseña, que es lo
                // que siempre funciona. La huella es un atajo, nunca la unica puerta.
                android.util.Log.w("Koberlet", "el lector no se pudo abrir", e)
                alTerminar(null, Exception("No se pudo abrir el lector de este móvil. Entra con la contraseña."))
            }
        }
    }
}
