// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import org.json.JSONArray
import org.json.JSONObject

/**
 * EL CONTENIDO DE LA BOVEDA - varias carteras en el mismo aparato.
 *
 * Formato v3 - UNA CARTERA, UNA RED:
 *   { v:3, carteras:[ { id, etiqueta, semilla, red:"kda"|"evm", cuentas:[una] } ],
 *     activa:"id" }
 *
 * Antes (v2) cada cartera derivaba de su semilla DOS cuentas, una de Kadena y
 * otra de Ethereum, y se enseñaban juntas. Es tecnicamente correcto -son dos
 * caminos BIP-44 de la misma semilla, `m/44'/626'/0'` y `m/44'/60'/0'/0/0`- pero
 * como modelo mental es malo: quien tiene tres carteras ve seis, y en el Puente
 * hay que elegir dos cosas que la app presentaba como una sola. El Koberlet de
 * escritorio ya lo cambio en julio de 2026 por el mismo motivo; esto alinea el
 * movil con aquello.
 *
 * Formatos anteriores:
 *   v1: { v:1, semilla:"...", cuentas:[...] }              (una sola semilla suelta)
 *   v2: { v:2, carteras:[{id,etiqueta,semilla,cuentas:[kda,evm]}], activa }
 *
 * Los dos **se migran al abrir**, sin perder nada. Esto importa mas de lo que
 * parece: quien ya tenga una version vieja instalada con su cartera dentro no
 * puede encontrarse con que la nueva "no ve" su dinero. Por eso la migracion
 * tiene sus propios tests.
 *
 * Esta clase no toca ficheros ni Android: es solo la forma de los datos, para
 * poder probarla entera en el ordenador.
 */
object Carteras {

    const val VERSION = 3

    /** Devuelve el contenido en el formato de hoy, migrando si hace falta. */
    fun normalizar(datos: JSONObject): JSONObject = partirPorRed(aVarias(datos))

    /** v1 -> v2: la semilla suelta pasa a ser la primera cartera. */
    private fun aVarias(datos: JSONObject): JSONObject {
        if (datos.optInt("v", 1) >= 2 && datos.has("carteras")) return datos
        val cartera = JSONObject()
            .put("id", "c1")
            .put("etiqueta", "Mi cartera")
            .put("semilla", datos.getString("semilla"))
            .put("cuentas", datos.optJSONArray("cuentas") ?: JSONArray())
        return JSONObject()
            .put("v", 2)
            .put("carteras", JSONArray().put(cartera))
            .put("activa", "c1")
    }

    /**
     * v2 -> v3: la cartera con dos cuentas se PARTE EN DOS, «X KDA» y «X EVM»,
     * compartiendo la misma semilla.
     *
     * No se pierde ni se mueve nada: las direcciones son exactamente las que ya
     * habia, porque salen de la misma semilla por el mismo camino. Lo unico que
     * cambia es como se agrupan.
     *
     * La de Kadena se queda con el id de la cartera original -asi la que estaba
     * marcada como activa, y la preferencia guardada en el aparato, siguen
     * valiendo- y la de Ethereum estrena id. El id de cada cuenta se rehace para
     * que siga siendo `<carteraId>-<tipo>`: de esa forma depende el exportar
     * claves privadas.
     */
    private fun partirPorRed(datos: JSONObject): JSONObject {
        if (datos.optInt("v", 1) >= VERSION) return datos
        val viejas = datos.getJSONArray("carteras")
        val nuevas = JSONArray()
        val usados = mutableSetOf<String>()
        for (i in 0 until viejas.length()) usados.add(viejas.getJSONObject(i).getString("id"))

        for (i in 0 until viejas.length()) {
            val c = viejas.getJSONObject(i)
            val cuentas = c.optJSONArray("cuentas") ?: JSONArray()
            val porTipo = mutableMapOf<String, JSONObject>()
            for (j in 0 until cuentas.length()) {
                val cu = cuentas.getJSONObject(j)
                porTipo[cu.optString("tipo")] = cu
            }
            // Una cartera con una sola cuenta ya es de una red: solo hay que decirlo.
            if (porTipo.size <= 1) {
                val tipo = porTipo.keys.firstOrNull() ?: "kda"
                nuevas.put(JSONObject(c.toString()).put("red", tipo))
                continue
            }
            val nombre = c.getString("etiqueta")
            var primera = true
            for (tipo in listOf("kda", "evm")) {
                val cu = porTipo[tipo] ?: continue
                val id = if (primera) c.getString("id") else libre(usados)
                primera = false
                usados.add(id)
                nuevas.put(JSONObject()
                    .put("id", id)
                    .put("etiqueta", nombre + " " + tipo.uppercase())
                    .put("semilla", c.getString("semilla"))
                    .put("red", tipo)
                    .put("cuentas", JSONArray().put(JSONObject(cu.toString()).put("id", "$id-$tipo"))))
            }
        }
        val activa = datos.optString("activa")
        return JSONObject()
            .put("v", VERSION)
            .put("carteras", nuevas)
            .put("activa", if (nuevas.length() == 0) "" else activa.ifEmpty { nuevas.getJSONObject(0).getString("id") })
    }

    private fun libre(usados: Set<String>): String {
        var n = 1
        while (usados.contains("c$n")) n++
        return "c$n"
    }

    fun lista(datos: JSONObject): JSONArray = normalizar(datos).getJSONArray("carteras")

    fun buscar(datos: JSONObject, id: String): JSONObject? {
        val l = lista(datos)
        for (i in 0 until l.length()) {
            val c = l.getJSONObject(i)
            if (c.getString("id") == id) return c
        }
        return null
    }

    /** La cartera activa, o la primera si la marcada ya no existe. */
    fun activa(datos: JSONObject): JSONObject {
        val d = normalizar(datos)
        return buscar(d, d.optString("activa")) ?: lista(d).getJSONObject(0)
    }

    /** Identificador libre: c1, c2, c3... Nunca se reutiliza uno ya usado. */
    fun idNuevo(datos: JSONObject): String {
        val l = lista(datos)
        var n = 1
        val usados = mutableSetOf<String>()
        for (i in 0 until l.length()) usados.add(l.getJSONObject(i).getString("id"))
        while (usados.contains("c$n")) n++
        return "c$n"
    }

    fun anadir(datos: JSONObject, cartera: JSONObject): JSONObject {
        val d = normalizar(datos)
        d.getJSONArray("carteras").put(cartera)
        d.put("activa", cartera.getString("id"))     // la recien creada pasa a ser la activa
        return d
    }

    /**
     * Quita una cartera. Se niega a quitar la ultima: una boveda sin carteras
     * dejaria la app en un estado raro -ni primer uso ni cartera- y lo que quiere
     * quien borra la unica que tiene es empezar de cero, que es otra cosa
     * (`borrarTodo`) y avisa de lo que hace.
     */
    fun quitar(datos: JSONObject, id: String): JSONObject {
        val d = normalizar(datos)
        val l = d.getJSONArray("carteras")
        if (l.length() <= 1) throw IllegalStateException("Es la única cartera que hay. Para empezar de cero, usa borrar todo.")
        val nueva = JSONArray()
        for (i in 0 until l.length()) {
            val c = l.getJSONObject(i)
            if (c.getString("id") != id) nueva.put(c)
        }
        if (nueva.length() == l.length()) throw IllegalArgumentException("Esa cartera no existe.")
        d.put("carteras", nueva)
        if (d.optString("activa") == id) d.put("activa", nueva.getJSONObject(0).getString("id"))
        return d
    }

    fun renombrar(datos: JSONObject, id: String, etiqueta: String): JSONObject {
        val d = normalizar(datos)
        val c = buscar(d, id) ?: throw IllegalArgumentException("Esa cartera no existe.")
        val limpia = etiqueta.trim().take(40)
        if (limpia.isEmpty()) throw IllegalArgumentException("Ponle un nombre.")
        c.put("etiqueta", limpia)
        return d
    }

    /**
     * ¿Ya hay una cartera con esta misma semilla PARA ESA RED? Evita duplicados
     * sin sentido, pero permite lo que ahora es legitimo: la misma semilla en dos
     * carteras, una de Kadena y otra de Ethereum. De hecho es exactamente lo que
     * deja la migracion v2 -> v3.
     */
    fun yaExiste(datos: JSONObject, semilla: String, red: String): Boolean {
        val l = lista(datos)
        for (i in 0 until l.length()) {
            val c = l.getJSONObject(i)
            // optString: las carteras metidas por su clave privada no tienen semilla.
            if (c.optString("semilla") == semilla && redDe(c) == red) return true
        }
        return false
    }

    /** ¿Ya esta metida esta clave privada para esa red? */
    fun yaExisteClave(datos: JSONObject, privada: String, red: String): Boolean {
        val l = lista(datos)
        for (i in 0 until l.length()) {
            val c = l.getJSONObject(i)
            if (c.optString("privada") == privada && redDe(c) == red) return true
        }
        return false
    }

    /**
     * ¿Hay ya una cartera con ESA MISMA direccion? Importar la clave privada de
     * una cartera que ya esta por su semilla dejaria dos entradas con la misma
     * cuenta y el mismo dinero: confuso y sin ninguna ventaja.
     */
    fun yaExisteCuenta(datos: JSONObject, cuenta: String): Boolean {
        val l = lista(datos)
        for (i in 0 until l.length()) {
            val cuentas = l.getJSONObject(i).optJSONArray("cuentas") ?: continue
            for (j in 0 until cuentas.length()) {
                if (cuentas.getJSONObject(j).optString("cuenta") == cuenta) return true
            }
        }
        return false
    }

    /** ¿Esta cartera viene de unas palabras, o de una clave suelta? */
    fun esDeSemilla(cartera: JSONObject): Boolean = cartera.optString("semilla").isNotEmpty()

    /**
     * Deja la clave privada como se guarda: 64 caracteres hex en minusculas.
     *
     * Se admite el `0x` de delante -las de Ethereum se copian asi de todas partes-
     * y tambien el formato de 128 caracteres de algunas herramientas de Kadena,
     * que pegan la privada y la publica seguidas: la publica se recalcula, asi que
     * la segunda mitad sobra... pero solo si de verdad es la publica de esa
     * privada. Si no cuadra, no se acepta: sera otra cosa.
     */
    fun normalizarClave(texto: String, red: String): String {
        var h = texto.trim().removePrefix("0x").removePrefix("0X").lowercase()
        if (!Regex("^[0-9a-f]+$").matches(h)) {
            throw IllegalArgumentException("Una clave privada son 64 caracteres del 0 al 9 y de la a a la f.")
        }
        if (h.length == 128 && red == "kda") {
            val privada = h.substring(0, 64)
            val publica = h.substring(64)
            val calculada = Derivacion.publicaKadena(Derivacion.deHex(privada))
            if (calculada != publica) {
                throw IllegalArgumentException("Esos 128 caracteres no son una clave privada seguida de su pública.")
            }
            h = privada
        }
        if (h.length != 64) {
            throw IllegalArgumentException("Una clave privada son 64 caracteres del 0 al 9 y de la a a la f.")
        }
        if (h == "0".repeat(64)) throw IllegalArgumentException("Esa clave no vale: son todo ceros.")
        return h
    }

    /**
     * Monta una cartera a partir de una clave privada suelta, sin semilla.
     *
     * Esa cartera NO tiene palabras y no se pueden inventar: quien la meta asi
     * solo podra sacar de aqui su clave privada, y la pantalla lo dice.
     */
    fun montarConClave(id: String, etiqueta: String, privada: String, red: String): JSONObject {
        if (red != "kda" && red != "evm") throw IllegalArgumentException("Esa red no existe.")
        val bytes = Derivacion.deHex(privada)
        val cuenta = try {
            if (red == "kda") {
                JSONObject().put("id", "$id-kda").put("etiqueta", "Kadena").put("tipo", "kda")
                    .put("cuenta", "k:" + Derivacion.publicaKadena(bytes))
            } else {
                JSONObject().put("id", "$id-evm").put("etiqueta", "EVM").put("tipo", "evm")
                    .put("cuenta", Derivacion.direccionEvm(bytes))
            }
        } finally {
            bytes.fill(0)
        }
        return JSONObject()
            .put("id", id).put("etiqueta", etiqueta).put("privada", privada).put("red", red)
            .put("cuentas", JSONArray().put(cuenta))
    }

    /**
     * Los 32 bytes de la clave privada de esa cartera, venga de donde venga.
     *
     * Quien la pida se la lleva en un array que puede -y debe- borrar despues.
     */
    fun privadaDe(cartera: JSONObject): ByteArray {
        val suelta = cartera.optString("privada")
        if (suelta.isNotEmpty()) return Derivacion.deHex(suelta)
        val bytes = Derivacion.semillaABytes(cartera.getString("semilla"))
        return try {
            if (redDe(cartera) == "kda") Derivacion.privadaKadena(bytes, 0)
            else Derivacion.privadaEvm(bytes, 0)
        } finally {
            bytes.fill(0)
        }
    }

    /** La red de una cartera. Las de antes de la v3 no la traen: se deduce. */
    fun redDe(cartera: JSONObject): String {
        val r = cartera.optString("red")
        if (r == "kda" || r == "evm") return r
        val cuentas = cartera.optJSONArray("cuentas") ?: return "kda"
        return if (cuentas.length() > 0) cuentas.getJSONObject(0).optString("tipo", "kda") else "kda"
    }

    /**
     * Monta una cartera nueva a partir de una semilla, derivando SU cuenta.
     *
     * Una cartera, una red. La semilla sirve para las dos -son dos caminos BIP-44
     * distintos- asi que quien quiera las dos crea dos carteras con las mismas
     * palabras, y la app no se lo impide.
     */
    fun montar(id: String, etiqueta: String, semilla: String, red: String): JSONObject {
        if (red != "kda" && red != "evm") throw IllegalArgumentException("Esa red no existe.")
        val bytes = Derivacion.semillaABytes(semilla)
        val cuenta = try {
            if (red == "kda") {
                JSONObject().put("id", "$id-kda").put("etiqueta", "Kadena").put("tipo", "kda")
                    .put("cuenta", Derivacion.cuentaKadena(bytes, 0))
            } else {
                JSONObject().put("id", "$id-evm").put("etiqueta", "EVM").put("tipo", "evm")
                    .put("cuenta", Derivacion.direccionEvm(Derivacion.privadaEvm(bytes, 0)))
            }
        } finally {
            bytes.fill(0)
        }
        return JSONObject()
            .put("id", id).put("etiqueta", etiqueta).put("semilla", semilla).put("red", red)
            .put("cuentas", JSONArray().put(cuenta))
    }
}
