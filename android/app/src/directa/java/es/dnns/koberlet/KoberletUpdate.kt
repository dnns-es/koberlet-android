// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * ACTUALIZACION DE LA APP.
 *
 * En Android no se puede sustituir una app en silencio, y esta bien que sea asi:
 * el instalador del sistema sale siempre y lo confirma el dueño. Lo que si se
 * puede es enterarse, descargar y dejarselo a un toque.
 *
 * Que protege de que te cuelen un APK falso, por orden de importancia:
 *
 *   1. La FIRMA. Android se niega a sustituir la app instalada por otra que no
 *      este firmada con la misma clave. Esa clave esta en el PC de Antonio y no
 *      ha salido de ahi. Es la defensa de verdad.
 *      Ademas se comprueba AQUI, antes de enseñar el instalador: se lee el
 *      certificado del APK descargado y se compara con el de la app que ya esta
 *      puesta. Si no es el mismo, el fichero se borra y no se enseña ningun
 *      dialogo. El motivo es que un dialogo de instalacion que sale solo se
 *      acepta por inercia, y no se le puede pedir a nadie que distinga ahi si la
 *      firma cuadra.
 *   2. El origen fijo: solo se descarga de descargas.dnns.es y solo por https.
 *      Ni aunque el `latest.json` dijera otra cosa.
 *   3. La huella sha256, que ademas pilla las descargas a medias.
 *
 * Por que la huella no basta y la firma si: el `latest.json` con la huella y el
 * APK viven en el MISMO servidor. Quien pueda cambiar uno puede cambiar el otro,
 * asi que la huella demuestra que la descarga esta entera, no que venga de
 * nosotros. Lo unico que no se puede falsificar desde ese servidor es la clave de
 * firma, que no esta alli.
 *
 * Lo que NO se hace: bajar un "paquete web" y cargarlo dentro del WebView sin
 * pasar por el instalador. Seria mas comodo, pero es un camino por el que entra
 * codigo nuevo a la pantalla que pide firmas al dueño; en un monedero, eso es
 * regalar una via de robo. Aqui se actualiza con un APK firmado o no se actualiza.
 */
@CapacitorPlugin(name = "KoberletUpdate")
class KoberletUpdate : Plugin() {

    private val ORIGEN = "https://descargas.dnns.es/"

    /** Version instalada de verdad (la del APK, no la que diga el JavaScript). */
    @PluginMethod
    fun version(call: PluginCall) {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        call.resolve(JSObject()
            .put("version", info.versionName)
            .put("versionCode", @Suppress("DEPRECATION") info.versionCode))
    }

    /**
     * Descarga el APK, comprueba la huella y abre el instalador del sistema.
     * A partir de ahi manda el usuario: Android le enseña que va a instalar.
     */
    @PluginMethod
    fun instalar(call: PluginCall) {
        val url = call.getString("url") ?: return call.reject("Falta la dirección del paquete.")
        val sha = call.getString("sha256")?.lowercase() ?: return call.reject("Falta la huella del paquete.")
        if (!url.startsWith(ORIGEN)) {
            return call.reject("Ese paquete no viene del servidor de DNNS; no se descarga.")
        }

        Thread {
            try {
                val destino = File(context.cacheDir, "koberlet-update.apk")
                descargar(url, destino)

                val real = huella(destino)
                if (real != sha) {
                    destino.delete()
                    call.reject("La huella del paquete descargado no cuadra: se ha descartado.")
                    return@Thread
                }

                // Fail-closed: si el certificado no cuadra, o ni siquiera se puede
                // leer, no se instala. Ante la duda, no se instala.
                val motivo = porQueNoEsNuestro(destino)
                if (motivo != null) {
                    destino.delete()
                    call.reject(motivo)
                    return@Thread
                }

                // Se reutiliza el FileProvider que ya trae Capacitor, cuyas rutas
                // (res/xml/file_paths.xml) incluyen la cache donde cae el APK.
                val uri: Uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", destino)
                val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
                    data = uri
                    flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK
                    putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
                    putExtra(Intent.EXTRA_RETURN_RESULT, true)
                }
                context.startActivity(intent)
                call.resolve(JSObject().put("lanzado", true).put("sha256", real))
            } catch (e: Exception) {
                call.reject(e.message ?: "No se pudo descargar la actualización.")
            }
        }.start()
    }

    private fun descargar(url: String, destino: File) {
        val con = URL(url).openConnection() as HttpURLConnection
        con.connectTimeout = 20000
        con.readTimeout = 60000
        con.instanceFollowRedirects = true
        try {
            if (con.responseCode != 200) throw Exception("El servidor respondió ${con.responseCode}.")
            con.inputStream.use { entrada -> destino.outputStream().use { salida -> entrada.copyTo(salida) } }
        } finally {
            con.disconnect()
        }
    }

    /**
     * Mira si el APK descargado es de verdad una version de ESTA app: mismo
     * paquete, mismo certificado de firma y version mas nueva.
     *
     * Devuelve `null` si todo cuadra, o la frase que hay que enseñar si no. Se
     * devuelve un motivo y no un booleano porque cada caso significa una cosa
     * distinta y el dueño merece saber cual.
     */
    private fun porQueNoEsNuestro(apk: File): String? {
        val pm = context.packageManager
        // Se piden LAS DOS formas de leer la firma, la nueva y la vieja.
        //
        // No es cinturón y tirantes por gusto: al leer un APK que está en disco
        // -no instalado-, hay Android que devuelve `signingInfo` a null y solo
        // rellena el `signatures` de siempre. Con la bandera nueva a secas, la
        // comprobación no fallaba por firma mala sino por no poder leerla, y como
        // esto es fail-closed, la actualización quedaba bloqueada en ese aparato.
        // Lo vio el amigo de Antonio en un móvil real con la 0.25.0 (12/09/2026).
        val banderas = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES or @Suppress("DEPRECATION") PackageManager.GET_SIGNATURES
        } else {
            @Suppress("DEPRECATION") PackageManager.GET_SIGNATURES
        }

        val bajado = pm.getPackageArchiveInfo(apk.absolutePath, banderas)
            ?: return "El fichero descargado no es un paquete de Android válido."
        val puesto = pm.getPackageInfo(context.packageName, banderas)

        if (bajado.packageName != context.packageName) {
            return "Ese paquete es de otra aplicación (${bajado.packageName}); no se instala."
        }

        val firmasBajadas = certificados(bajado)
        val firmasPuestas = certificados(puesto)
        // Los dos casos se cuentan por separado: si el que no se deja leer es el
        // paquete instalado, el problema es de este Android y no del fichero, y con
        // un mensaje común no había forma de saberlo desde una captura.
        if (firmasBajadas.isEmpty()) {
            return "No se ha podido leer la firma del paquete descargado (Android ${Build.VERSION.SDK_INT}); no se instala."
        }
        if (firmasPuestas.isEmpty()) {
            return "No se ha podido leer la firma de la app instalada (Android ${Build.VERSION.SDK_INT}); no se instala."
        }
        if (firmasBajadas != firmasPuestas) {
            return "El paquete descargado está firmado con otra clave: NO es de DNNS. Se ha borrado."
        }

        // Volver atras a una version vieja es una forma conocida de reintroducir
        // un fallo ya arreglado. Android lo impide al instalar, pero es mejor
        // decirlo aqui que despues de una descarga entera.
        val codigoBajado = @Suppress("DEPRECATION") bajado.versionCode
        val codigoPuesto = @Suppress("DEPRECATION") puesto.versionCode
        if (codigoBajado < codigoPuesto) {
            return "Ese paquete es más viejo que el instalado; no se instala."
        }
        return null
    }

    /** Huellas SHA-256 de los certificados que firman un paquete, ordenadas. */
    private fun certificados(info: android.content.pm.PackageInfo): List<String> {
        val nuevas: Array<android.content.pm.Signature>? =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                // El historial de rotacion NO se usa a proposito: aqui interesa
                // quien firma el APK ahora mismo, no quien lo firmo alguna vez.
                info.signingInfo?.apkContentsSigners
            } else {
                null
            }

        // Si la forma nueva no da nada -pasa al leer un APK de disco en varios
        // Android-, se usa la de siempre. `signatures` esta obsoleto y se sabe: lo
        // que no se puede es no leer la firma, porque entonces no se instala nada.
        val crudas = if (!nuevas.isNullOrEmpty()) {
            nuevas
        } else {
            @Suppress("DEPRECATION") info.signatures
        }
        if (crudas == null || crudas.isEmpty()) return emptyList()
        val d = MessageDigest.getInstance("SHA-256")
        return crudas.map { Derivacion.aHex(d.digest(it.toByteArray())) }.sorted()
    }

    private fun huella(f: File): String {
        val d = MessageDigest.getInstance("SHA-256")
        f.inputStream().use { e ->
            val buf = ByteArray(8192)
            while (true) {
                val n = e.read(buf)
                if (n <= 0) break
                d.update(buf, 0, n)
            }
        }
        return Derivacion.aHex(d.digest())
    }
}
