// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import java.io.File

/**
 * LA BOVEDA - plugin nativo.
 *
 * Hace el papel que en el Koberlet de escritorio hacia el proceso principal de
 * Electron: guardar las claves donde la interfaz no llega. En Android la pantalla
 * es un WebView que pinta datos venidos de la red, y un fallo de los que dejan
 * ejecutar codigo ajeno en esa pantalla no puede poder pedir "dame la semilla".
 *
 * Lo que cruza al WebView:
 *   - cuentas PUBLICAS (k:... y 0x...)
 *   - la semilla, UNA sola vez al crearla, porque el dueño tiene que apuntarla
 *   - una privada concreta solo por `exportar`, y volviendo a pedir la contrasena
 *
 * Lo que NO cruza nunca: las semillas guardadas, las privadas derivadas y la
 * clave de cifrado.
 *
 * El fichero es `vault.json`, con el MISMO formato que el del escritorio, para
 * que una copia se pueda llevar de un sitio a otro. Dentro puede haber VARIAS
 * carteras (ver Carteras.kt), y las bovedas de una sola se migran al abrirlas.
 */
@CapacitorPlugin(name = "KoberletVault")
class KoberletVault : Plugin() {

    private val fichero: File
        get() = File(context.filesDir, "vault.json")

    /**
     * Sesion abierta. Vive SOLO en memoria y muere con el proceso. Guarda las
     * semillas porque firmar sin volver a descifrar el fichero entero es lo que
     * hace que la app no tarde cuatro segundos en cada pantalla; lo que no guarda
     * nunca es la contrasena en claro.
     */
    private var sesion: JSONObject? = null

    // --- Estado -------------------------------------------------------------

    @PluginMethod
    fun estado(call: PluginCall) {
        call.resolve(JSObject().put("existe", fichero.exists()).put("abierta", sesion != null))
    }

    // --- Crear / importar ---------------------------------------------------

    /**
     * Crea una cartera. Si no habia boveda, la crea tambien; si ya habia, añade
     * una mas (y entonces la contrasena tiene que ser la de la boveda, claro).
     */
    @PluginMethod
    fun crear(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        val etiqueta = call.getString("etiqueta") ?: "Mi cartera"
        // Una cartera, una red. Si la llamada no dice cual, Kadena: es la red de
        // esta app, y una cartera de Ethereum siempre se pide a proposito.
        val red = call.getString("red") ?: "kda"
        hilo(call) {
            val semilla = Derivacion.generarSemilla()
            val datos = anadirCartera(contrasena, semilla, etiqueta, red)
            JSObject().put("semilla", semilla).put("cuentas", cuentasPublicas(datos))
        }
    }

    @PluginMethod
    fun importar(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        val etiqueta = call.getString("etiqueta") ?: "Cartera importada"
        val red = call.getString("red") ?: "kda"
        val semilla = call.getString("semilla")?.trim()?.lowercase()?.replace(Regex("\\s+"), " ")
            ?: return call.reject("Falta la semilla.")
        // Se comprueba el control de la semilla ANTES de guardar nada: una palabra
        // mal escrita deriva otras cuentas sin avisar, y el dueño creeria que ha
        // perdido el dinero.
        if (!Derivacion.semillaValida(semilla)) {
            return call.reject("Esa semilla no es válida: repasa las palabras, alguna no cuadra.")
        }
        hilo(call) {
            val datos = anadirCartera(contrasena, semilla, etiqueta, red)
            JSObject().put("cuentas", cuentasPublicas(datos))
        }
    }

    /**
     * Meter una cartera por su CLAVE PRIVADA, sin palabras.
     *
     * Hace falta porque hay cuentas que solo existen asi: las que salieron de otra
     * herramienta, las de un contrato, las que alguien apunto en su dia en hex. Lo
     * que se guarda es la clave tal cual; esa cartera no tiene semilla y nunca la
     * tendra -de una privada no se puede volver a las 12 palabras-, y la pantalla
     * lo dice para que nadie crea que tiene una copia de seguridad que no tiene.
     */
    @PluginMethod
    fun importarClave(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        val etiqueta = call.getString("etiqueta") ?: "Cartera importada"
        val red = call.getString("red") ?: "kda"
        val cruda = call.getString("privada") ?: return call.reject("Falta la clave privada.")
        val privada = try {
            Carteras.normalizarClave(cruda, red)
        } catch (e: Exception) {
            return call.reject(e.message ?: "Esa clave privada no vale.")
        }
        hilo(call) {
            val datos = anadirCarteraConClave(contrasena, privada, etiqueta, red)
            JSObject().put("cuentas", cuentasPublicas(datos))
        }
    }

    // --- Abrir / cerrar -----------------------------------------------------

    @PluginMethod
    fun abrir(call: PluginCall) {
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")
        conContrasena(call, "Abre tu cartera") { contrasena -> abrirCon(call, contrasena) }
    }

    private fun abrirCon(call: PluginCall, contrasena: String) {
        hilo(call) {
            val crudo = JSONObject(Cofre.descifrar(fichero.readText(), contrasena))
            val datos = Carteras.normalizar(crudo)
            val viejo = crudo.optInt("v", 1)

            // Si el formato ha cambiado, se guarda ya migrado -y ANTES se hace una
            // copia del fichero tal como estaba-. La copia no es paranoia de manual:
            // aqui dentro estan las semillas, y un fallo a medio escribir dejaria a
            // alguien sin su dinero. Se queda en la carpeta privada de la app, que
            // es donde vive la boveda, y sigue cifrada con la misma contraseña.
            if (viejo < Carteras.VERSION) {
                try {
                    fichero.copyTo(java.io.File(fichero.parentFile, "boveda-antes-de-v${Carteras.VERSION}.bak"), overwrite = true)
                    guardar(contrasena, datos)
                } catch (e: Exception) {
                    // Si no se puede guardar la migración, se sigue con ella en
                    // memoria: la app funciona igual y se reintentará al abrir otra
                    // vez. Lo que no se hace es dejar de abrir la cartera por esto.
                }
            }
            sesion = datos
            JSObject().put("cuentas", cuentasPublicas(datos))
        }
    }

    @PluginMethod
    fun cerrar(call: PluginCall) {
        sesion = null
        call.resolve(JSObject())
    }

    @PluginMethod
    fun cuentas(call: PluginCall) {
        val datos = sesion ?: return call.reject("La cartera está bloqueada.")
        call.resolve(JSObject().put("cuentas", cuentasPublicas(datos)))
    }

    // --- Gestion de carteras ------------------------------------------------

    /** Renombrar no toca ningun secreto, asi que basta con la sesion abierta. */
    @PluginMethod
    fun renombrarCartera(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        val id = call.getString("id") ?: return call.reject("Falta la cartera.")
        val etiqueta = call.getString("etiqueta") ?: return call.reject("Falta el nombre.")
        hilo(call) {
            val datos = Carteras.renombrar(abrirFichero(contrasena), id, etiqueta)
            guardar(contrasena, datos)
            sesion = datos
            JSObject().put("cuentas", cuentasPublicas(datos))
        }
    }

    /**
     * Quita una cartera de la boveda. Esto BORRA su semilla de este aparato: si no
     * esta apuntada en papel, el dinero que tenga se queda inalcanzable. Por eso
     * exige la contrasena y la pantalla avisa antes con todas las letras.
     */
    @PluginMethod
    fun borrarCartera(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        val id = call.getString("id") ?: return call.reject("Falta la cartera.")
        hilo(call) {
            val datos = Carteras.quitar(abrirFichero(contrasena), id)
            guardar(contrasena, datos)
            sesion = datos
            JSObject().put("cuentas", cuentasPublicas(datos))
        }
    }

    // --- Exportar / borrar todo ---------------------------------------------

    /**
     * Devuelve una clave privada o una semilla. Vuelve a pedir la contrasena
     * SIEMPRE, aunque la sesion este abierta: tener el movil desbloqueado en la
     * mano no puede bastar para llevarse las claves.
     *
     * `id` es "semilla:<carteraId>" para las palabras, o el id de una cuenta
     * ("c1-kda", "c1-evm") para su clave privada.
     */
    @PluginMethod
    fun exportar(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        val id = call.getString("id") ?: return call.reject("Falta qué exportar.")
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")
        hilo(call) {
            val datos = abrirFichero(contrasena)
            val privada = when {
                id.startsWith("semilla:") -> {
                    val c = Carteras.buscar(datos, id.removePrefix("semilla:"))
                        ?: throw IllegalArgumentException("Esa cartera no existe.")
                    // Una cartera metida por su clave privada no tiene palabras, y no
                    // se pueden inventar: de una privada no se vuelve a la semilla.
                    if (!Carteras.esDeSemilla(c)) {
                        throw IllegalArgumentException("Esa cartera se metió con su clave privada: no tiene palabras.")
                    }
                    c.getString("semilla")
                }
                id.endsWith("-kda") || id.endsWith("-evm") -> {
                    val carteraId = id.substringBeforeLast('-')
                    val c = Carteras.buscar(datos, carteraId)
                        ?: throw IllegalArgumentException("Esa cartera no existe.")
                    val bytes = Carteras.privadaDe(c)
                    try {
                        if (id.endsWith("-kda")) Derivacion.aHex(bytes) else "0x" + Derivacion.aHex(bytes)
                    } finally {
                        bytes.fill(0)
                    }
                }
                else -> throw IllegalArgumentException("No sé qué es eso que quieres exportar.")
            }
            JSObject().put("privada", privada)
        }
    }

    @PluginMethod
    fun borrarTodo(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")
        hilo(call) {
            abrirFichero(contrasena)              // no se borra nada sin demostrar que eres el dueño
            fichero.delete()
            sesion = null
            JSObject()
        }
    }

    // --- Copia de seguridad -------------------------------------------------

    /**
     * Saca el fichero de la boveda para guardarlo fuera del movil, TAL CUAL:
     * cifrado y con el mismo formato que el del escritorio. Quien lo intercepte
     * se encuentra lo mismo que hay en el aparato.
     */
    @PluginMethod
    fun exportarBoveda(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")
        hilo(call) {
            Cofre.descifrar(fichero.readText(), contrasena)     // solo para comprobar que es el dueño
            val copia = File(context.cacheDir, "koberlet-vault.json")
            copia.writeText(fichero.readText())
            val uri = androidx.core.content.FileProvider.getUriForFile(
                context, context.packageName + ".fileprovider", copia)
            val envio = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "application/json"
                putExtra(android.content.Intent.EXTRA_STREAM, uri)
                putExtra(android.content.Intent.EXTRA_SUBJECT, "Copia de la cartera Koberlet")
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(android.content.Intent.createChooser(envio, "Guardar la copia")
                .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
            JSObject().put("compartido", true)
        }
    }

    /**
     * Mete una copia hecha en otro sitio. Antes de pisar nada se comprueba que
     * abre con la contrasena que dan: restaurar una copia mala y quedarse sin las
     * dos es exactamente lo que no puede pasar.
     */
    @PluginMethod
    fun importarBoveda(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        val contenido = call.getString("contenido") ?: return call.reject("Falta el fichero de la copia.")
        hilo(call) {
            val datos = try {
                Carteras.normalizar(JSONObject(Cofre.descifrar(contenido, contrasena)))
            } catch (e: org.json.JSONException) {
                throw Exception("El fichero se abre, pero no tiene dentro una cartera de Koberlet.")
            }

            // Si ya habia cartera, se guarda a un lado antes de pisarla. Nunca se
            // borra la unica copia que el dueño tenia.
            if (fichero.exists()) {
                File(context.filesDir, "vault-anterior-${System.currentTimeMillis()}.json")
                    .writeText(fichero.readText())
            }
            fichero.writeText(contenido)
            sesion = datos
            JSObject().put("cuentas", cuentasPublicas(datos))
        }
    }

    // --- Firmar un envio ----------------------------------------------------

    /**
     * Monta y firma una transferencia de KDA. Devuelve {cmd, hash, sigs} listo
     * para que el WebView lo mande al nodo.
     *
     * Tres cosas que el WebView NO decide, y por eso estan aqui:
     *
     *   1. El codigo Pact. Lo monta FirmaKda desde una plantilla fija; desde la
     *      pantalla no se puede pedir la firma de un comando cualquiera.
     *   2. La cuenta de origen. Es la de la cartera que se envia, derivada aqui,
     *      no la que diga la llamada.
     *   3. La contrasena. Se exige en CADA envio, aunque la cartera este abierta.
     *      Desde la 0.34.0 puede llegar escrita o desbloqueada con la huella o la
     *      cara: lo que NO puede es no llegar. La huella no sustituye a la
     *      contrasena, la desenvuelve (ver `Huella.kt`).
     */
    @PluginMethod
    fun firmarEnvioKda(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val networkId = call.getString("networkId") ?: return call.reject("Falta la red.")
        val chain = call.getString("chain") ?: return call.reject("Falta la chain.")
        val para = call.getString("para") ?: return call.reject("Falta el destinatario.")
        val cantidad = call.getDouble("cantidad") ?: return call.reject("Falta la cantidad.")
        val horaNodo = call.getString("creationTime")?.toLongOrNull()
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el envío") { contrasena ->
        hilo(call) {
            val datos = abrirFichero(contrasena)
            val cartera = Carteras.buscar(datos, carteraId)
                ?: throw IllegalArgumentException("Esa cartera no existe.")
            val privada = Carteras.privadaDe(cartera)
            val publica = Derivacion.publicaKadena(privada)

            // La hora la pone el nodo, no el movil: un reloj adelantado hace que
            // Chainweb rechace el comando por venir "del futuro". Si lo que llega
            // no es creible, se usa la local con margen.
            val ahora = System.currentTimeMillis() / 1000
            val creation = if (horaNodo != null && Math.abs(horaNodo - ahora) < 86400) horaNodo else ahora - 90

            try {
                FirmaKda.envioKda(
                    networkId = networkId,
                    chain = chain,
                    de = "k:$publica",
                    para = para,
                    cantidad = cantidad,
                    privada = privada,
                    publica = publica,
                    creationTime = creation,
                ).let { JSObject.fromJSONObject(it) }
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma el PRIMER paso de un envio entre chains.
     *
     * El segundo paso no se firma: lo autoriza la prueba SPV, no una clave. Por
     * eso ese lo monta la pantalla y aqui no hay nada que hacer -y por eso el
     * dinero de un envio a medias lo puede rematar cualquiera, incluida la propia
     * app la proxima vez-.
     */
    @PluginMethod
    fun firmarEnvioCrossKda(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val networkId = call.getString("networkId") ?: return call.reject("Falta la red.")
        val chain = call.getString("chain") ?: return call.reject("Falta la chain.")
        val chainDestino = call.getString("chainDestino") ?: return call.reject("Falta la chain de destino.")
        val para = call.getString("para") ?: return call.reject("Falta el destinatario.")
        val cantidad = call.getDouble("cantidad") ?: return call.reject("Falta la cantidad.")
        val horaNodo = call.getString("creationTime")?.toLongOrNull()
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el envío entre chains") { contrasena ->
        hilo(call) {
            val datos = abrirFichero(contrasena)
            val cartera = Carteras.buscar(datos, carteraId)
                ?: throw IllegalArgumentException("Esa cartera no existe.")
            val privada = Carteras.privadaDe(cartera)
            val publica = Derivacion.publicaKadena(privada)
            val ahora = System.currentTimeMillis() / 1000
            val creation = if (horaNodo != null && Math.abs(horaNodo - ahora) < 86400) horaNodo else ahora - 90

            try {
                FirmaKda.envioCrossChain(
                    networkId = networkId,
                    chainOrigen = chain,
                    chainDestino = chainDestino,
                    de = "k:$publica",
                    para = para,
                    cantidad = cantidad,
                    privada = privada,
                    publica = publica,
                    creationTime = creation,
                ).let { JSObject.fromJSONObject(it) }
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma un envio por el PUENTE, de Kadena hacia Ethereum.
     *
     * De la pantalla llegan la cantidad, la direccion de Ethereum y el peaje que ha
     * cotizado el nodo. El namespace, el modulo del token, el dominio de la otra
     * orilla y la chain los pone `FirmaKda` desde el codigo, y el destinatario de 32
     * bytes se calcula alli: mandarlo ya hecho seria dejar en manos de la pantalla
     * justo el dato cuyo formato, si va mal, pierde el dinero para siempre.
     *
     * El peaje se vuelve a acotar en Kotlin aunque el JavaScript ya lo acote: es el
     * unico numero que viene de fuera y termina dentro de una capability que mueve
     * KDA, y la comprobacion que vale es la del lado que tiene la llave.
     */
    @PluginMethod
    fun firmarPuenteEvm(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val networkId = call.getString("networkId") ?: return call.reject("Falta la red.")
        val destinoEth = call.getString("destinoEth") ?: return call.reject("Falta la dirección de Ethereum.")
        val cantidad = call.getDouble("cantidad") ?: return call.reject("Falta la cantidad.")
        val peaje = call.getDouble("peaje") ?: return call.reject("Falta el peaje del puente.")
        val cuentaPeaje = call.getString("cuentaPeaje") ?: return call.reject("Falta la cuenta del peaje.")
        val horaNodo = call.getString("creationTime")?.toLongOrNull()
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el envío por el puente") { contrasena ->
        hilo(call) {
            val datos = abrirFichero(contrasena)
            val cartera = Carteras.buscar(datos, carteraId)
                ?: throw IllegalArgumentException("Esa cartera no existe.")
            val privada = Carteras.privadaDe(cartera)
            val publica = Derivacion.publicaKadena(privada)
            val ahora = System.currentTimeMillis() / 1000
            val creation = if (horaNodo != null && Math.abs(horaNodo - ahora) < 86400) horaNodo else ahora - 90

            try {
                FirmaKda.envioPuenteEvm(
                    networkId = networkId,
                    de = "k:$publica",
                    destinoEth = destinoEth,
                    cantidad = cantidad,
                    peaje = peaje,
                    cuentaPeaje = cuentaPeaje,
                    privada = privada,
                    publica = publica,
                    creationTime = creation,
                ).let { JSObject.fromJSONObject(it) }
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma el envio de un fungible de Kadena que NO es el KDA.
     *
     * Aqui la pantalla si dice cual es el contrato del token, y es la unica vez en
     * toda la boveda: los tokens de Kadena no son una lista cerrada. El porque y lo
     * que lo acota -regex estrecho y capabilities atadas a ese modulo- esta
     * explicado en `FirmaKda.envioToken`, que es donde se decide.
     */
    @PluginMethod
    fun firmarEnvioToken(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val networkId = call.getString("networkId") ?: return call.reject("Falta la red.")
        val chain = call.getString("chain") ?: return call.reject("Falta la chain.")
        val modulo = call.getString("modulo") ?: return call.reject("Falta el contrato del token.")
        val para = call.getString("para") ?: return call.reject("Falta la cuenta de destino.")
        val cantidad = call.getDouble("cantidad") ?: return call.reject("Falta la cantidad.")
        val precision = call.getInt("precision") ?: 12
        val horaNodo = call.getString("creationTime")?.toLongOrNull()
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el envío") { contrasena ->
        hilo(call) {
            val datos = abrirFichero(contrasena)
            val cartera = Carteras.buscar(datos, carteraId)
                ?: throw IllegalArgumentException("Esa cartera no existe.")
            val privada = Carteras.privadaDe(cartera)
            val publica = Derivacion.publicaKadena(privada)
            val ahora = System.currentTimeMillis() / 1000
            val creation = if (horaNodo != null && Math.abs(horaNodo - ahora) < 86400) horaNodo else ahora - 90

            try {
                FirmaKda.envioToken(
                    networkId = networkId,
                    chain = chain,
                    modulo = modulo,
                    de = "k:$publica",
                    para = para,
                    cantidad = cantidad,
                    precision = precision,
                    privada = privada,
                    publica = publica,
                    creationTime = creation,
                ).let { JSObject.fromJSONObject(it) }
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma un cambio en el Mercado de Kadena.
     *
     * Hasta la 0.50.1 esta pantalla solo SIMULABA: se veia lo que saldria y ahi se
     * quedaba, porque el plugin no sabia firmar un `swap-exact-in`. Lo pidio Antonio
     * -«me dice comprobar el cambio y asi se queda, yo quiero firmar para que se
     * realice la operacion»- y tenia toda la razon: una pantalla que solo ensaya no
     * sirve para nada.
     */
    @PluginMethod
    fun firmarCambioAmm(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val networkId = call.getString("networkId") ?: return call.reject("Falta la red.")
        val pool = call.getString("pool") ?: return call.reject("Falta la cuenta del pool.")
        val cantidad = call.getString("cantidad") ?: return call.reject("Falta la cantidad.")
        val minimo = call.getString("minimo") ?: return call.reject("Falta el mínimo que aceptas recibir.")
        // La comisión de servicio: la pantalla dice cuánto, `FirmaKda` dice a dónde
        // y comprueba que no pase del 0,5 %. Si no viene, no se cobra nada.
        val comision = call.getString("comision") ?: "0.0"
        // Si la pantalla pide gasolinera, manda tambien el gas que MIDIO simulando
        // el cambio: sin ese numero habria que inventarse un techo, y el contrato
        // rechaza cualquier cosa por encima de 8000.
        val gratis = call.getBoolean("gratis", false) ?: false
        val gasPedido = call.getInt("gasLimit")
        val caminoJs = call.getArray("camino") ?: return call.reject("Falta el camino del cambio.")
        val horaNodo = call.getString("creationTime")?.toLongOrNull()
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        val camino = ArrayList<String>()
        for (i in 0 until caminoJs.length()) camino.add(caminoJs.getString(i))

        conContrasena(call, "Firma el cambio") { contrasena ->
        hilo(call) {
            val datos = abrirFichero(contrasena)
            val cartera = Carteras.buscar(datos, carteraId)
                ?: throw IllegalArgumentException("Esa cartera no existe.")
            val privada = Carteras.privadaDe(cartera)
            val publica = Derivacion.publicaKadena(privada)
            val ahora = System.currentTimeMillis() / 1000
            val creation = if (horaNodo != null && Math.abs(horaNodo - ahora) < 86400) horaNodo else ahora - 90

            try {
                FirmaKda.cambioAmm(
                    networkId = networkId,
                    camino = camino,
                    cuenta = "k:$publica",
                    poolPrimerSalto = pool,
                    cantidad = cantidad,
                    minimo = minimo,
                    privada = privada,
                    publica = publica,
                    creationTime = creation,
                    comision = comision,
                    gratis = gratis,
                    gasLimit = if (gratis && gasPedido != null) gasPedido else 14000,
                ).let { JSObject.fromJSONObject(it) }
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    // --- Ethereum ------------------------------------------------------------
    //
    // Mismo reparto de siempre, ahora en la otra red: de la pantalla vienen
    // cantidades y una cuenta de destino; el contrato al que se llama, la funcion
    // y la cadena los pone `FirmaEvm` desde su propio codigo. Lo que devuelve es
    // un `rawTransaction` ya firmado, que la pantalla solo reenvia.

    /** Lo que la pantalla puede decir del gas, comprobado luego en `FirmaEvm`. */
    private fun sobreDe(call: PluginCall): FirmaEvm.Sobre {
        val nonce = call.getString("nonce")?.toLongOrNull()
            ?: throw IllegalArgumentException("Falta el nonce de la cuenta.")
        val gasLimit = call.getString("gasLimit")?.toLongOrNull()
            ?: throw IllegalArgumentException("Falta el límite de gas.")
        val maxFee = call.getString("maxFeePerGas")
            ?: throw IllegalArgumentException("Falta el precio del gas.")
        val propina = call.getString("maxPriorityFeePerGas")
            ?: throw IllegalArgumentException("Falta la propina del gas.")
        return FirmaEvm.Sobre(
            nonce = nonce,
            gasLimit = gasLimit,
            maxFeePerGas = java.math.BigInteger(maxFee),
            maxPriorityFeePerGas = java.math.BigInteger(propina),
        )
    }

    /** La cartera, exigiendo que sea de Ethereum: con una de Kadena esto no va. */
    private fun carteraEvm(datos: org.json.JSONObject, carteraId: String): org.json.JSONObject {
        val cartera = Carteras.buscar(datos, carteraId)
            ?: throw IllegalArgumentException("Esa cartera no existe.")
        if (Carteras.redDe(cartera) != "evm") {
            throw IllegalArgumentException("Esa cartera no es de Ethereum.")
        }
        return cartera
    }

    /**
     * Firma el PERMISO para que el puente pueda mover tu USDC.
     *
     * Es el primer paso obligatorio del viaje Ethereum -> Kadena: un ERC-20 no deja
     * que un contrato te mueva el dinero si no se lo has autorizado antes. A quien
     * se autoriza -el router del puente- y por cuanto -la cantidad justa, no el
     * infinito de costumbre- lo decide `FirmaEvm`, no la pantalla.
     */
    @PluginMethod
    fun firmarPermisoEvm(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val cantidad = call.getString("cantidad") ?: return call.reject("Falta la cantidad.")
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Autoriza el token en Ethereum") { contrasena ->
        hilo(call) {
            val sobre = sobreDe(call)
            val datos = abrirFichero(contrasena)
            val privada = Carteras.privadaDe(carteraEvm(datos, carteraId))
            try {
                // A quien se autoriza sale de una lista CERRADA de dos: el router
                // del puente o el de Uniswap. La pantalla elige entre esos dos
                // nombres, nunca pone una direccion.
                val paraQue = call.getString("para") ?: "puente"
                val decimales = call.getInt("decimales") ?: FirmaEvm.DECIMALES_USDC
                val unidades = FirmaEvm.aUnidades(cantidad, decimales)
                val (contrato, datosPermiso) = when (paraQue) {
                    "puente" -> FirmaEvm.TOKEN_USDC to FirmaEvm.datosPermiso(unidades)
                    "mercado" -> {
                        val ruta = SwapEvm.ruta(call.getString("ruta") ?: "")
                        ruta.tokenIn to FirmaEvm.deHex(SwapEvm.datosPermiso(unidades))
                    }
                    else -> throw IllegalArgumentException("No se sabe a quién habría que autorizar.")
                }
                val raw = FirmaEvm.transaccionFirmada(
                    a = contrato,
                    valorWei = java.math.BigInteger.ZERO,
                    datos = datosPermiso,
                    sobre = sobre,
                    privada = privada,
                )
                JSObject().put("raw", raw)
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma un ENVIO normal en Ethereum: mandarle a alguien ETH, USDC o USDT.
     *
     * Es lo que faltaba para que el boton «Enviar» de una cartera de Ethereum
     * hiciera algo. Hasta la 0.52.2 sacaba una hoja diciendo que eso se hacia en
     * el escritorio, y Antonio se lo encontro de frente: la boveda ya firmaba el
     * puente y el mercado, asi que la excusa se habia quedado vieja.
     *
     * Aqui la direccion de destino SI viene de la pantalla -no hay envio sin
     * destinatario-, pero el token NO: llega su nombre de una lista de tres y el
     * contrato lo pone este fichero. Asi, lo peor que puede pedir una parte web
     * comprometida es mandar una moneda conocida a una direccion; no puede
     * inventarse el contrato al que se llama.
     *
     * Con ETH no hay contrato ninguno: la cantidad viaja como `value` y el `data`
     * va vacio, que es lo que distingue un envio de ETH de todo lo demas.
     */
    @PluginMethod
    fun firmarEnvioEvm(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val token = call.getString("token") ?: return call.reject("Falta qué se envía.")
        val para = call.getString("para") ?: return call.reject("Falta la cuenta de destino.")
        val cantidad = call.getString("cantidad") ?: return call.reject("Falta la cantidad.")
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el envío") { contrasena ->
        hilo(call) {
            val sobre = sobreDe(call)
            val datos = abrirFichero(contrasena)
            val privada = Carteras.privadaDe(carteraEvm(datos, carteraId))
            try {
                val destino = FirmaEvm.direccionValida(para)
                val raw = when (token) {
                    "ETH" -> FirmaEvm.transaccionFirmada(
                        a = destino,
                        valorWei = FirmaEvm.aUnidades(cantidad, 18),
                        datos = ByteArray(0),
                        sobre = sobre,
                        privada = privada,
                    )
                    "USDC", "USDT" -> {
                        val contrato = if (token == "USDC") FirmaEvm.TOKEN_USDC else FirmaEvm.TOKEN_USDT
                        val unidades = FirmaEvm.aUnidades(cantidad, FirmaEvm.DECIMALES_USDC)
                        FirmaEvm.transaccionFirmada(
                            a = contrato,
                            valorWei = java.math.BigInteger.ZERO,
                            datos = FirmaEvm.datosEnvioToken(destino, unidades),
                            sobre = sobre,
                            privada = privada,
                        )
                    }
                    else -> throw IllegalArgumentException("Ese token no está entre los que sabe enviar la app.")
                }
                JSObject().put("raw", raw)
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma un CAMBIO en Uniswap: USDC por ETH y al reves, USDT por USDC y al reves.
     *
     * La pantalla dice la RUTA por su nombre -no direcciones-, la comision del pool
     * que salio mejor al cotizar, cuanto entra y **el minimo que se acepta recibir**.
     * Ese minimo es el que el dueño vio en la pantalla, y va dentro de lo que se
     * firma: recalcularlo aqui con lo que diga el nodo en ese momento seria dejar
     * que un nodo hostil mintiera dos veces y se llevara la diferencia.
     */
    @PluginMethod
    fun firmarCambioEvm(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val claveRuta = call.getString("ruta") ?: return call.reject("Falta el cambio que se quiere hacer.")
        val comision = call.getInt("comision") ?: return call.reject("Falta la comisión del pool.")
        val cantidad = call.getString("cantidad") ?: return call.reject("Falta la cantidad.")
        val minimo = call.getString("minimo") ?: return call.reject("Falta el mínimo que aceptas recibir.")
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el cambio") { contrasena ->
        hilo(call) {
            val sobre = sobreDe(call)
            val datos = abrirFichero(contrasena)
            val cartera = carteraEvm(datos, carteraId)
            val privada = Carteras.privadaDe(cartera)
            try {
                val ruta = SwapEvm.ruta(claveRuta)
                val cuenta = Derivacion.direccionEvm(privada)
                val entra = FirmaEvm.aUnidades(cantidad, ruta.decIn)
                val sale = FirmaEvm.aUnidades(minimo, ruta.decOut)
                val cambio = SwapEvm.cambio(claveRuta, comision, cuenta, entra, sale)
                val raw = FirmaEvm.transaccionFirmada(
                    a = SwapEvm.ROUTER,
                    valorWei = cambio.valorWei,
                    datos = cambio.datos,
                    sobre = sobre,
                    privada = privada,
                )
                JSObject().put("raw", raw)
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma el ENVIO por el puente desde Ethereum hacia Kadena.
     *
     * De fuera llegan la cuenta Kadena de destino y la cantidad. El custodio -esa
     * tira de bytes que, mal formada, deja el dinero bloqueado para siempre- se
     * calcula aqui dentro a partir de la cuenta, nunca se recibe hecho. Es el
     * hallazgo R1 del puente y la razon de que esto no se monte en el WebView.
     */
    @PluginMethod
    fun firmarPuenteHaciaKadena(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val cuentaKda = call.getString("cuentaKda") ?: return call.reject("Falta la cuenta de Kadena.")
        val cantidad = call.getString("cantidad") ?: return call.reject("Falta la cantidad.")
        val peajeWei = call.getString("peajeWei") ?: return call.reject("Falta el peaje del puente.")
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el envío por el puente") { contrasena ->
        hilo(call) {
            val sobre = sobreDe(call)
            val datos = abrirFichero(contrasena)
            val privada = Carteras.privadaDe(carteraEvm(datos, carteraId))
            try {
                val unidades = FirmaEvm.aUnidades(cantidad, FirmaEvm.DECIMALES_USDC)
                val raw = FirmaEvm.transaccionFirmada(
                    a = FirmaEvm.ROUTER,
                    valorWei = FirmaEvm.peajeComprobado(java.math.BigInteger(peajeWei)),
                    datos = FirmaEvm.datosPuenteHaciaKadena(cuentaKda, unidades),
                    sobre = sobre,
                    privada = privada,
                )
                JSObject().put("raw", raw)
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma la creacion de un plan de compras periodicas (DCA).
     *
     * Mismo reparto que en el envio: la pantalla dice cuanto, cada cuanto y en que
     * sentido; el contrato, la chain, la cuenta de custodia y los dos tokens los
     * pone `FirmaKda` desde el codigo. Y la contrasena se pide igual, porque esto
     * mueve el bote entero de una vez.
     */
    @PluginMethod
    fun firmarCrearDca(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val networkId = call.getString("networkId") ?: return call.reject("Falta la red.")
        val haciaUsdc = call.getBoolean("haciaUsdc") ?: return call.reject("Falta el sentido de la compra.")
        val deposito = call.getDouble("deposito") ?: return call.reject("Falta la cantidad.")
        val cuota = call.getDouble("cuota") ?: return call.reject("Falta la cantidad.")
        val periodo = call.getString("periodo")?.toLongOrNull() ?: return call.reject("Falta cada cuánto se compra.")
        val deslizamiento = call.getDouble("deslizamiento") ?: return call.reject("Falta el deslizamiento.")
        val gratis = call.getBoolean("gratis", false) ?: false
        val gasPedido = call.getInt("gasLimit")
        val horaNodo = call.getString("creationTime")?.toLongOrNull()
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el plan de compras") { contrasena ->
        hilo(call) {
            val datos = abrirFichero(contrasena)
            val cartera = Carteras.buscar(datos, carteraId)
                ?: throw IllegalArgumentException("Esa cartera no existe.")
            if (Carteras.redDe(cartera) != "kda") {
                throw IllegalArgumentException("Los planes de compra son de Kadena: elige una cartera de Kadena.")
            }
            val privada = Carteras.privadaDe(cartera)
            val publica = Derivacion.publicaKadena(privada)
            val ahora = System.currentTimeMillis() / 1000
            val creation = if (horaNodo != null && Math.abs(horaNodo - ahora) < 86400) horaNodo else ahora - 90

            try {
                FirmaKda.crearPlanDca(
                    networkId = networkId,
                    owner = "k:$publica",
                    haciaUsdc = haciaUsdc,
                    deposito = deposito,
                    cuota = cuota,
                    periodo = periodo,
                    deslizamiento = deslizamiento,
                    privada = privada,
                    publica = publica,
                    creationTime = creation,
                    gratis = gratis,
                    gasLimit = if (gratis && gasPedido != null) gasPedido else 20000,
                ).let { JSObject.fromJSONObject(it) }
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    /**
     * Firma parar, reanudar, cerrar o recargar un plan de compras.
     *
     * Se pide la contraseña igual que para crearlo: cerrar mueve el bote que
     * quede y recargar mete más dinero. Parar y reanudar no mueven nada, pero van
     * por el mismo camino porque también hay que abrir la bóveda para firmar.
     */
    @PluginMethod
    fun firmarGestionDca(call: PluginCall) {
        val carteraId = call.getString("carteraId") ?: return call.reject("Falta la cartera.")
        val networkId = call.getString("networkId") ?: return call.reject("Falta la red.")
        val accion = call.getString("accion") ?: return call.reject("Falta la acción.")
        val id = call.getString("id") ?: return call.reject("Falta el plan.")
        val cantidad = call.getDouble("cantidad") ?: 0.0
        val entraEsUsdc = call.getBoolean("entraEsUsdc") ?: false
        val gratis = call.getBoolean("gratis", false) ?: false
        val gasPedido = call.getInt("gasLimit")
        val horaNodo = call.getString("creationTime")?.toLongOrNull()
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")

        conContrasena(call, "Firma el cambio en el plan") { contrasena ->
        hilo(call) {
            val datos = abrirFichero(contrasena)
            val cartera = Carteras.buscar(datos, carteraId)
                ?: throw IllegalArgumentException("Esa cartera no existe.")
            if (Carteras.redDe(cartera) != "kda") {
                throw IllegalArgumentException("Los planes de compra son de Kadena: elige una cartera de Kadena.")
            }
            val privada = Carteras.privadaDe(cartera)
            val publica = Derivacion.publicaKadena(privada)
            val ahora = System.currentTimeMillis() / 1000
            val creation = if (horaNodo != null && Math.abs(horaNodo - ahora) < 86400) horaNodo else ahora - 90

            try {
                FirmaKda.gestionarPlanDca(
                    networkId = networkId,
                    accion = accion,
                    id = id,
                    owner = "k:$publica",
                    cantidad = cantidad,
                    entraEsUsdc = entraEsUsdc,
                    privada = privada,
                    publica = publica,
                    creationTime = creation,
                    gratis = gratis,
                    gasLimit = if (gratis && gasPedido != null) gasPedido else 20000,
                ).let { JSObject.fromJSONObject(it) }
            } finally {
                privada.fill(0)
            }
        }
        }
    }

    // --- Huella o cara en lugar de teclear la contraseña ---------------------
    //
    // El detalle que decide si esto es serio o es teatro esta en `Huella.kt`: la
    // contrasena se guarda envuelta por una clave del chip que solo se deja usar
    // tras identificarse. Aqui solo se enchufa.

    @PluginMethod
    fun bioEstado(call: PluginCall) {
        val motivo = Huella.disponible(context)
        call.resolve(JSObject()
            .put("disponible", motivo == null)
            .put("motivo", motivo ?: "")
            .put("activada", Huella.activada(context))
            .put("tipo", Huella.tipo(context)))
    }

    /**
     * Activa la huella. Pide la contrasena UNA vez y, antes de guardarla,
     * comprueba que abre la boveda de verdad: guardar una contrasena que no vale
     * solo serviria para que la huella fallara siempre y nadie supiera por que.
     */
    @PluginMethod
    fun bioActivar(call: PluginCall) {
        val contrasena = call.getString("contrasena") ?: return call.reject("Falta la contraseña.")
        if (!fichero.exists()) return call.reject("No hay ninguna cartera en este aparato.")
        Thread {
            try {
                abrirFichero(contrasena)
            } catch (e: Cofre.ContrasenaIncorrecta) {
                call.reject("Contraseña incorrecta.")
                return@Thread
            } catch (e: Exception) {
                call.reject(e.message ?: "Fallo en la bóveda.")
                return@Thread
            }
            val act = activity
            if (act == null) {
                call.reject("No se puede pedir la huella ahora mismo.")
                return@Thread
            }
            val loQuePone = call.getString("motivo")?.takeIf { it.isNotBlank() }
            Huella.guardar(act, contrasena, loQuePone) { error ->
                if (error != null) call.reject(error.message ?: "No se pudo activar la identificación.")
                else call.resolve(JSObject().put("activada", true))
            }
        }.start()
    }

    /** Apaga la huella: borra lo guardado y la clave del chip. */
    @PluginMethod
    fun bioBorrar(call: PluginCall) {
        Huella.borrar(context)
        call.resolve(JSObject().put("activada", false))
    }

    /**
     * De donde sale la contrasena de una operacion: escrita, o desenvuelta con la
     * huella. Una de las dos SIEMPRE, tambien para firmar: que la cartera este
     * abierta nunca ha bastado en esta app y sigue sin bastar.
     */
    private fun conContrasena(call: PluginCall, titulo: String, alTener: (String) -> Unit) {
        val escrita = call.getString("contrasena")
        if (escrita != null) return alTener(escrita)
        if (call.getBoolean("huella", false) != true) return call.reject("Falta la contraseña.")
        if (!Huella.activada(context)) return call.reject("La identificación no está activada.")
        val act = activity ?: return call.reject("No se puede pedir la huella ahora mismo.")
        // El texto del dialogo lo pone la pantalla, que es la que sabe en que idioma
        // esta la app -el idioma se elige DENTRO de Koberlet, no en el movil-. Si no
        // lo manda, se queda el de aqui: en castellano, pero nunca vacio.
        val loQuePone = call.getString("motivo")?.takeIf { it.isNotBlank() } ?: titulo
        Huella.recuperar(act, loQuePone) { contrasena, error ->
            if (contrasena == null) call.reject(error?.message ?: "No se pudo identificar.")
            else alTener(contrasena)
        }
    }

    // --- Tripas -------------------------------------------------------------

    private fun abrirFichero(contrasena: String): JSONObject =
        Carteras.normalizar(JSONObject(Cofre.descifrar(fichero.readText(), contrasena)))

    /** Crea la boveda si no existe, o añade una cartera mas si ya la hay. */
    private fun anadirCartera(contrasena: String, semilla: String, etiqueta: String, red: String): JSONObject {
        val datos = if (fichero.exists()) {
            val d = abrirFichero(contrasena)
            if (Carteras.yaExiste(d, semilla, red)) throw Exception("Esa cartera ya está metida en este aparato.")
            Carteras.anadir(d, Carteras.montar(Carteras.idNuevo(d), etiqueta, semilla, red))
        } else {
            val c = Carteras.montar("c1", etiqueta, semilla, red)
            JSONObject().put("v", Carteras.VERSION)
                .put("carteras", org.json.JSONArray().put(c))
                .put("activa", "c1")
        }
        guardar(contrasena, datos)
        sesion = datos
        return datos
    }

    /** Como `anadirCartera`, pero con una clave privada suelta en lugar de semilla. */
    private fun anadirCarteraConClave(contrasena: String, privada: String, etiqueta: String, red: String): JSONObject {
        val datos = if (fichero.exists()) {
            val d = abrirFichero(contrasena)
            if (Carteras.yaExisteClave(d, privada, red)) throw Exception("Esa cartera ya está metida en este aparato.")
            val nueva = Carteras.montarConClave(Carteras.idNuevo(d), etiqueta, privada, red)
            val cuenta = nueva.getJSONArray("cuentas").getJSONObject(0).getString("cuenta")
            if (Carteras.yaExisteCuenta(d, cuenta)) throw Exception("Esa cuenta ya está en este aparato, metida con su semilla.")
            Carteras.anadir(d, nueva)
        } else {
            val c = Carteras.montarConClave("c1", etiqueta, privada, red)
            JSONObject().put("v", Carteras.VERSION)
                .put("carteras", org.json.JSONArray().put(c))
                .put("activa", "c1")
        }
        guardar(contrasena, datos)
        sesion = datos
        return datos
    }

    /**
     * Del contenido cifrado solo salen las cuentas, cada una diciendo de que
     * cartera es. Las semillas se quedan aqui.
     */
    private fun cuentasPublicas(datos: JSONObject): JSArray {
        val salida = JSArray()
        val carteras = Carteras.lista(datos)
        for (i in 0 until carteras.length()) {
            val cartera = carteras.getJSONObject(i)
            val cuentas = cartera.getJSONArray("cuentas")
            for (j in 0 until cuentas.length()) {
                val c = cuentas.getJSONObject(j)
                salida.put(JSObject()
                    .put("id", c.getString("id"))
                    .put("carteraId", cartera.getString("id"))
                    .put("cartera", cartera.getString("etiqueta"))
                    .put("etiqueta", c.getString("etiqueta"))
                    .put("tipo", c.getString("tipo"))
                    // Para que la pantalla no ofrezca «ver la semilla» de una cartera
                    // que no la tiene. El secreto no cruza; solo el si/no.
                    .put("conSemilla", Carteras.esDeSemilla(cartera))
                    .put("cuenta", c.getString("cuenta")))
            }
        }
        return salida
    }

    private fun guardar(contrasena: String, datos: JSONObject) {
        val sal = Cofre.salNueva()
        val clave = Cofre.derivar(contrasena, sal)
        try {
            fichero.writeText(Cofre.cifrar(clave, sal, datos.toString()))
        } finally {
            clave.fill(0)
        }
    }

    /**
     * Todo lo que lleva scrypt va fuera del hilo de la interfaz: son 2-4 segundos
     * en un movil de gama media y dejaria la pantalla congelada, que es como se
     * gana una fama de app rota.
     */
    private fun hilo(call: PluginCall, trabajo: () -> JSObject) {
        Thread {
            try {
                call.resolve(trabajo())
            } catch (e: Cofre.ContrasenaIncorrecta) {
                call.reject("Contraseña incorrecta.")
            } catch (e: Cofre.BovedaCorrupta) {
                call.reject(e.message)
            } catch (e: Exception) {
                call.reject(e.message ?: "Fallo en la bóveda.")
            }
        }.start()
    }
}
