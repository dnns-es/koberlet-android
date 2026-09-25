// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

package es.dnns.koberlet

import org.bouncycastle.crypto.digests.Blake2bDigest
import org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters
import org.bouncycastle.crypto.signers.Ed25519Signer
import org.json.JSONArray
import org.json.JSONObject
import java.util.Base64

/**
 * FIRMA DE TRANSACCIONES KADENA.
 *
 * Decision de diseño importante, y es la que sostiene toda la Fase 3:
 *
 *   El WebView NO manda codigo Pact ni un hash para firmar a ciegas.
 *   Manda los datos del envio (a quien, cuanto, en que chain) y **el comando lo
 *   monta aqui**, en Kotlin, a partir de una plantilla fija.
 *
 * La diferencia es toda. Si la pantalla pudiera mandar un hash y recibir su
 * firma, un fallo de los que dejan colar codigo en esa pantalla podria pedir la
 * firma de cualquier cosa -vaciar la cuenta, por ejemplo- y el plugin la daria
 * sin saber que estaba firmando. Montando el comando aqui, lo unico que se puede
 * firmar es una transferencia de `coin` con su capability acotada al importe y
 * al destinatario exactos, y no existe un camino para nada mas.
 *
 * El JSON del comando se construye a mano, sin ayudas, porque **el hash es del
 * texto**: si cambiara el orden de las claves o un espacio, el hash cambia, la
 * firma deja de valer y el nodo rechaza la transaccion. El orden es el mismo que
 * usa `lib/kda.js` del Koberlet de escritorio.
 */
object FirmaKda {

    /** blake2b-256 del texto del comando, en base64url sin relleno: el "hash" de Pact. */
    fun hashComando(cmd: String): ByteArray {
        val d = Blake2bDigest(256)
        val bytes = cmd.toByteArray(Charsets.UTF_8)
        d.update(bytes, 0, bytes.size)
        val salida = ByteArray(32)
        d.doFinal(salida, 0)
        return salida
    }

    fun aBase64Url(bytes: ByteArray): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    /** Firma Ed25519 del hash, en hexadecimal, que es como la quiere Chainweb. */
    fun firmar(privada: ByteArray, hash: ByteArray): String {
        val firmante = Ed25519Signer()
        firmante.init(true, Ed25519PrivateKeyParameters(privada, 0))
        firmante.update(hash, 0, hash.size)
        return Derivacion.aHex(firmante.generateSignature())
    }

    /**
     * Decimal canonico: el MISMO texto en el codigo y en la capability.
     *
     * Viene del hallazgo #8 de la auditoria de Alex en el escritorio: si el codigo
     * dice "1e-7" y la capability "0.000000100000", el nodo entiende que se firmo
     * permiso para una cosa distinta de la que se hace y tumba la transaccion.
     */
    fun decimalCanonico(cantidad: Double): String = String.format(java.util.Locale.US, "%.12f", cantidad)

    /**
     * Monta y firma una transferencia de KDA dentro de una misma chain.
     *
     * Si el destino es una cuenta `k:`, se usa `transfer-create`, que la crea si no
     * existe (el keyset sale del propio nombre de la cuenta). Para los demas tipos
     * se usa `transfer`, que exige que ya exista.
     *
     * Devuelve el objeto {cmd, hash, sigs} listo para mandar a /send. El envio lo
     * hace el WebView: eso es red, no es secreto.
     */
    fun envioKda(
        networkId: String,
        chain: String,
        de: String,
        para: String,
        cantidad: Double,
        privada: ByteArray,
        publica: String,
        creationTime: Long,
        gasLimit: Int = 2500,
        gasPrice: String = "1e-8",
    ): JSONObject {
        if (!cuentaValida(de)) throw IllegalArgumentException("La cuenta de origen no es válida.")
        if (!cuentaValida(para)) throw IllegalArgumentException("La cuenta de destino no es válida.")
        if (cantidad <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")

        val monto = decimalCanonico(cantidad)
        val esK = para.startsWith("k:")
        val codigo = if (esK)
            """(coin.transfer-create \"$de\" \"$para\" (read-keyset \"ks\") $monto)"""
        else
            """(coin.transfer \"$de\" \"$para\" $monto)"""

        // OJO: `code` es un TEXTO dentro del JSON y por eso sus comillas van
        // escapadas; `data` es un OBJETO del JSON y las suyas NO. Confundirlo deja
        // un comando que no es JSON valido y el nodo lo rechaza sin explicar nada.
        val datos = if (esK)
            """{"ks":{"keys":["${para.substring(2)}"],"pred":"keys-all"}}"""
        else "{}"

        // La capability se firma con el destinatario y el importe EXACTOS: aunque
        // alguien lograra colar otro comando, la firma no le valdria para mover
        // el dinero a otro sitio ni por otra cantidad.
        val cmd = """{"networkId":"$networkId","payload":{"exec":{"code":"$codigo","data":$datos}},""" +
            """"signers":[{"pubKey":"$publica","clist":[{"name":"coin.GAS","args":[]},""" +
            """{"name":"coin.TRANSFER","args":["$de","$para",{"decimal":"$monto"}]}]}],""" +
            """"meta":{"chainId":"$chain","sender":"$de","gasLimit":$gasLimit,"gasPrice":$gasPrice,"ttl":600,"creationTime":$creationTime},""" +
            """"nonce":"koberlet-android:${System.currentTimeMillis()}"}"""

        val hash = hashComando(cmd)
        val sigs = JSONArray().put(JSONObject().put("sig", firmar(privada, hash)))
        return JSONObject()
            .put("cmd", cmd)
            .put("hash", aBase64Url(hash))
            .put("sigs", sigs)
    }

    /**
     * ENVIO ENTRE CHAINS (paso 1 de 2).
     *
     * Kadena tiene 20 cadenas y el dinero vive en una. Pasarlo de una a otra no es
     * una transferencia normal: es un `defpact` de dos pasos. Aqui se firma el
     * PRIMERO, que quita el dinero de la chain de origen y lo deja "en el aire";
     * el segundo lo remata quien sea con la prueba SPV -no lleva firma- y es el
     * que lo entrega en la chain de destino.
     *
     * Solo se admite destino `k:`: `transfer-crosschain` necesita el guard de la
     * cuenta que recibe, y de una cuenta con nombre cualquiera no se puede saber.
     * Mandarlo a ciegas dejaria el dinero a medio camino.
     */
    fun envioCrossChain(
        networkId: String,
        chainOrigen: String,
        chainDestino: String,
        de: String,
        para: String,
        cantidad: Double,
        privada: ByteArray,
        publica: String,
        creationTime: Long,
        gasLimit: Int = 3000,
        gasPrice: String = "1e-8",
    ): JSONObject {
        if (!cuentaValida(de)) throw IllegalArgumentException("La cuenta de origen no es válida.")
        if (!cuentaValida(para)) throw IllegalArgumentException("La cuenta de destino no es válida.")
        if (!para.startsWith("k:")) {
            throw IllegalArgumentException("Entre chains solo se puede enviar a una cuenta k:.")
        }
        if (cantidad <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        if (chainOrigen == chainDestino) throw IllegalArgumentException("Origen y destino son la misma chain.")
        if (!Regex("^([0-9]|1[0-9])$").matches(chainDestino)) throw IllegalArgumentException("Esa chain no existe.")

        val monto = decimalCanonico(cantidad)
        val codigo = """(coin.transfer-crosschain \"$de\" \"$para\" (read-keyset \"ks\") \"$chainDestino\" $monto)"""
        val datos = """{"ks":{"keys":["${para.substring(2)}"],"pred":"keys-all"}}"""

        val cmd = """{"networkId":"$networkId","payload":{"exec":{"code":"$codigo","data":$datos}},""" +
            """"signers":[{"pubKey":"$publica","clist":[{"name":"coin.GAS","args":[]},""" +
            """{"name":"coin.TRANSFER_XCHAIN","args":["$de","$para",{"decimal":"$monto"},"$chainDestino"]}]}],""" +
            """"meta":{"chainId":"$chainOrigen","sender":"$de","gasLimit":$gasLimit,"gasPrice":$gasPrice,"ttl":600,"creationTime":$creationTime},""" +
            """"nonce":"koberlet-android:${System.currentTimeMillis()}"}"""

        val hash = hashComando(cmd)
        val sigs = JSONArray().put(JSONObject().put("sig", firmar(privada, hash)))
        return JSONObject()
            .put("cmd", cmd)
            .put("hash", aBase64Url(hash))
            .put("sigs", sigs)
    }

    // --- PUENTE: Kadena -> Ethereum -----------------------------------------
    //
    // El namespace, el modulo del token, el dominio de la otra orilla y la chain van
    // FIJOS aqui, como en el DCA. De la pantalla llegan tres cosas y ninguna elige
    // contra que contrato se firma: cuanto se manda, a que direccion de Ethereum, y
    // el peaje que ha cotizado el nodo.
    private const val PUENTE_NS = "n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff"
    private const val PUENTE_MODULO = "kb-USDC"       // la unica ruta recorrida en los dos sentidos
    private const val PUENTE_DOMINIO_EVM = 1          // dominio Hyperlane de Ethereum
    const val PUENTE_CHAIN = "2"                      // el puente vive en la chain 2

    /**
     * Techo absoluto del peaje, en KDA.
     *
     * El peaje lo cotiza el nodo y lo trae la pantalla: es el UNICO numero de este
     * comando que viene de fuera y que acaba dentro de una capability de
     * `coin.TRANSFER`. Un nodo manipulado -o una pantalla comprometida- podria
     * inflarlo y conseguir que se firmara una transferencia gorda a una cuenta
     * cualquiera. Por eso se corta aqui tambien, y no solo en el JavaScript: la
     * comprobacion que importa es la que esta del lado que tiene la llave.
     */
    private const val PUENTE_PEAJE_MAX = 100.0

    /**
     * Los 32 bytes que viajan por el cable para una direccion de Ethereum: la
     * direccion de 20 bytes alineada a la derecha, en base64url.
     *
     * Se calcula AQUI y no se acepta ya hecho a proposito. Si el destinatario va mal
     * formado, el token se queda bloqueado en la otra orilla y no hay revert, ni
     * rescate, ni aviso (hallazgo R1 de la auditoria propia del puente: nos costo
     * 1 USDC aprenderlo). Que ese formato lo arme el lado que firma y no la pantalla
     * quita de en medio la unica forma de perder el dinero sin que nadie robe nada.
     */
    fun destinoEvm(direccion: String): String {
        val a = direccion.trim().removePrefix("0x").removePrefix("0X")
        if (!Regex("^[0-9a-fA-F]{40}$").matches(a)) {
            throw IllegalArgumentException("La dirección de Ethereum tiene que ser 0x y 40 caracteres.")
        }
        val bytes = ByteArray(32)
        for (i in 0 until 20) {
            bytes[12 + i] = a.substring(i * 2, i * 2 + 2).toInt(16).toByte()
        }
        return aBase64Url(bytes)
    }

    /**
     * Monta y firma un envio por el puente, de Kadena hacia Ethereum.
     *
     * Son TRES capabilities y cada una acota una cosa distinta:
     *
     *   - `<ns>.kb-USDC.TRANSFER_REMOTE` con el dominio, el remitente, el
     *     destinatario del cable y el importe exactos. El `{int}` del dominio va
     *     tipado a proposito: escrito a pelo el nodo lo lee como decimal, la
     *     capability no encaja y responde "Keyset failure".
     *   - `coin.TRANSFER` del PEAJE, del remitente a la cuenta que cobra el gas de
     *     la otra orilla. Con un 5% de margen sobre lo cotizado, porque el oraculo
     *     se mueve entre que se cotiza y se manda, y ni un centimo mas.
     *   - `coin.GAS`, el gas de esta transaccion.
     *
     * Lo que NO se puede hacer con esta firma: mandar a otro sitio, mandar mas de lo
     * que dice el importe, ni pagar un peaje distinto del acotado.
     */
    fun envioPuenteEvm(
        networkId: String,
        de: String,
        destinoEth: String,
        cantidad: Double,
        peaje: Double,
        cuentaPeaje: String,
        privada: ByteArray,
        publica: String,
        creationTime: Long,
        // 60.000, el mismo que usa el Koberlet de escritorio en este mismo envio
        // (`lib/bridge.js`), que es un numero ya probado en la cadena. Un dispatch del
        // puente no se parece a una transferencia: bloquea el token, arma el mensaje y
        // paga el peaje. Con los 2.500 de un envio normal no llega ni a la mitad, y
        // quedarse sin gas cuesta el gas igual. A 1e-8 son 0,0006 KDA.
        gasLimit: Int = 60000,
        gasPrice: String = "1e-8",
    ): JSONObject {
        if (!cuentaValida(de)) throw IllegalArgumentException("La cuenta de origen no es válida.")
        if (!de.startsWith("k:")) throw IllegalArgumentException("Por el puente solo se envía desde una cuenta k:.")
        if (cantidad <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        if (!cuentaValida(cuentaPeaje)) {
            throw IllegalArgumentException("La cuenta del peaje no es válida; el nodo puede estar manipulado.")
        }
        if (peaje < 0 || peaje > PUENTE_PEAJE_MAX || !peaje.isFinite()) {
            throw IllegalArgumentException("El peaje del puente está fuera de lo razonable; mejor no seguir.")
        }

        val rec = destinoEvm(destinoEth)
        val monto = decimalCanonico(cantidad)
        val tope = decimalCanonico(peaje * 1.05)

        val codigo = """($PUENTE_NS.mailbox.dispatch $PUENTE_NS.$PUENTE_MODULO $PUENTE_DOMINIO_EVM \"$rec\" $monto)"""

        val cmd = """{"networkId":"$networkId","payload":{"exec":{"code":"$codigo","data":{}}},""" +
            """"signers":[{"pubKey":"$publica","clist":[{"name":"coin.GAS","args":[]},""" +
            """{"name":"$PUENTE_NS.$PUENTE_MODULO.TRANSFER_REMOTE","args":[{"int":$PUENTE_DOMINIO_EVM},"$de","$rec",{"decimal":"$monto"}]},""" +
            """{"name":"coin.TRANSFER","args":["$de","$cuentaPeaje",{"decimal":"$tope"}]}]}],""" +
            """"meta":{"chainId":"$PUENTE_CHAIN","sender":"$de","gasLimit":$gasLimit,"gasPrice":$gasPrice,"ttl":600,"creationTime":$creationTime},""" +
            """"nonce":"koberlet-android:${System.currentTimeMillis()}"}"""

        val hash = hashComando(cmd)
        val sigs = JSONArray().put(JSONObject().put("sig", firmar(privada, hash)))
        return JSONObject()
            .put("cmd", cmd)
            .put("hash", aBase64Url(hash))
            .put("sigs", sigs)
    }

    // --- DCA: crear un plan de compras periodicas ---------------------------
    //
    // TODO LO QUE PUEDE DECIDIR DONDE VA EL DINERO ESTA AQUI, EN EL CODIGO.
    //
    // Los modulos, la chain, las cuentas de custodia y los tokens son constantes
    // de este fichero. De la pantalla solo llegan numeros -cuanto, cada cuanto,
    // cuanto deslizamiento-, el sentido de la compra y una CLAVE corta: la del
    // token ("kb-USDC", "kb-ETH", "FLUX", "bro") y, para tocar un plan que ya
    // existe, la del contrato ("dca2", "dca3"). Esas claves se traducen con los
    // mapas de abajo y cualquier otra cosa se rechaza. Aunque alguien lograra
    // ejecutar codigo en el WebView, no puede hacer que la app firme un ingreso a
    // otra cuenta ni contra otro contrato: no hay hueco donde meterlo.
    const val DCA_CHAIN = "2"
    private const val DCA_KDA = "coin"

    /**
     * Un contrato de compras periodicas.
     *
     * `custodia` es la cuenta unica del modulo que guarda todos sus botes:
     * `(create-principal (create-capability-guard (CUSTODY)))`. Sale del hash de la
     * capability, asi que no cambia mientras el modulo sea el mismo, y va fija a
     * proposito: es EL destinatario del deposito.
     *
     * `gasolinera` dice si `free.ksw-gasolinera` paga su gas. Solo admite dca2 (y
     * ksw2): una transaccion de dca3 por la gasolinera muere comprando el gas con
     * «Failed to buy gas», asi que ahi se para antes de firmar.
     */
    class ContratoDca(val modulo: String, val custodia: String, val gasolinera: Boolean)

    /**
     * Un token del lado que no es KDA. `minimo` es el MIN-IN del contrato por
     * compra, escrito como texto para compararlo sin redondeos de `Double`.
     * `contrato` es la clave del contrato donde vive: lo decide el token, nunca la
     * pantalla.
     */
    class TokenDca(val modulo: String, val precision: Int, val minimo: String, val contrato: String)

    private val DCA_CONTRATOS = mapOf(
        // KDA <-> kb-USDC, el que ya esta probado con dinero. Custodia leida de la
        // cadena el 12/09/2026.
        "dca2" to ContratoDca("free.ksw-dca2", "c:QiDAEP0E7hUoDWWxntmLK5LKvAeJm1SHJMAWcBmOZM8", gasolinera = true),
        // kb-ETH, FLUX y bro, siempre contra KDA. Custodia leida de la cadena con
        // `(free.ksw-dca3.custody-account)`.
        "dca3" to ContratoDca("free.ksw-dca3", "c:egWEeU7rKLxU57GgY8Y1ZBWv0_GFQww0DOj9CBlYgr8", gasolinera = false),
    )

    private val DCA_TOKENS = mapOf(
        "kb-USDC" to TokenDca("n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC", 6, "1", "dca2"),
        "kb-ETH" to TokenDca("n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-ETH", 18, "0.0004", "dca3"),
        "FLUX" to TokenDca("runonflux.flux", 8, "15", "dca3"),
        "bro" to TokenDca("n_582fed11af00dc626812cd7890bb88e72067f28c.bro", 12, "0.0002", "dca3"),
    )

    /** El KDA vale en los dos contratos, y es siempre uno de los dos lados. */
    private val DCA_KDA_TOKEN = TokenDca(DCA_KDA, 12, "100", "")

    private fun tokenDca(clave: String): TokenDca =
        DCA_TOKENS[clave] ?: throw IllegalArgumentException("Ese token no está en los planes de compra.")

    private fun contratoDca(clave: String): ContratoDca =
        DCA_CONTRATOS[clave] ?: throw IllegalArgumentException("Ese contrato de compras no existe.")

    /** Solo dca2 va por la gasolinera. Se para aqui y no en la cadena, que cobra el intento. */
    private fun exigirGasolineraDca(gratis: Boolean, contrato: ContratoDca) {
        if (gratis && !contrato.gasolinera) {
            throw IllegalArgumentException("La gasolinera solo paga los planes de kb-USDC: en este el gas lo pagas tú.")
        }
    }

    /**
     * Un importe del DCA escrito con los decimales del token, 12 como mucho.
     *
     * Es el mismo texto el que va al codigo y a la capability `TRANSFER`, que es lo
     * que exige el nodo (hallazgo #8 de Alex). Con los decimales del token y no con
     * 12 fijos porque Pact rechaza un importe con mas cifras de las que admite el
     * token: 15,123456789 FLUX (8 decimales) tumbaria el plan en la cadena. El tope
     * de 12 es el del escritorio: kb-ETH admite 18, pero con 12 ya caben de sobra
     * los 0,0004 del minimo.
     */
    fun decimalDca(cantidad: Double, precision: Int): String {
        val d = minOf(12, maxOf(1, precision))
        val texto = String.format(java.util.Locale.US, "%." + d + "f", cantidad)
        // Redondear no puede dejar un cero firmado: se para y se dice.
        if (!(texto.toDouble() > 0.0)) {
            throw IllegalArgumentException("Esa cantidad es más pequeña que lo que admite este token.")
        }
        return texto
    }

    /**
     * Monta y firma la creacion de un plan DCA.
     *
     * `token` es la clave del lado que no es KDA; `haciaToken` dice el sentido:
     * true = se entrega KDA y se compra el token, false = al reves. El contrato
     * (dca2 o dca3) sale del token con el mapa de arriba.
     *
     * El dueño ingresa el bote entero en la misma transaccion: la capability que
     * se firma es `<token>.TRANSFER owner <custodia> <deposito>`, con el importe
     * exacto y la custodia DE ESE CONTRATO. A partir de ahi el contrato va
     * comprando su cuota, y el gas de cada compra lo paga un vigilante externo, no
     * este movil.
     *
     * `owner` tiene que ser la cuenta `k:` de esta misma clave: el contrato exige
     * que el dueño sea el principal de su propio guard, asi que un plan a nombre
     * de otro no se puede crear ni por error.
     */
    fun crearPlanDca(
        networkId: String,
        owner: String,
        token: String,
        haciaToken: Boolean,
        deposito: Double,
        cuota: Double,
        periodo: Long,
        deslizamiento: Double,
        privada: ByteArray,
        publica: String,
        creationTime: Long,
        gasLimit: Int = 20000,
        gasPrice: String = "1e-8",
        gratis: Boolean = false,
    ): JSONObject {
        if (owner != "k:$publica") {
            throw IllegalArgumentException("Un plan de compras solo se puede crear a nombre de la propia cartera.")
        }
        val otro = tokenDca(token)
        val contrato = contratoDca(otro.contrato)
        exigirGasolineraDca(gratis, contrato)
        // Una sola llamada, y empieza por `free.ksw-dca2.`: la gasolinera la acepta
        // sin mas. Aqui no hace falta comision porque el codigo no toca el AMM de
        // forma directa -que lo haga el contrato por dentro le da igual al filtro,
        // que solo mira el texto de las llamadas de primer nivel.
        if (gratis) exigirCabeEnGasolinera(gasLimit)
        if (deposito <= 0 || cuota <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        if (cuota > deposito) throw IllegalArgumentException("La cuota no puede ser mayor que el bote.")
        if (periodo < 300 || periodo > 31536000) throw IllegalArgumentException("Entre compra y compra tienen que pasar de 5 minutos a un año.")
        if (deslizamiento < 0.0 || deslizamiento > 0.5) throw IllegalArgumentException("El deslizamiento va de 0 a 50 %.")

        val entra = if (haciaToken) DCA_KDA_TOKEN else otro
        val sale = if (haciaToken) otro else DCA_KDA_TOKEN

        val dep = decimalDca(deposito, entra.precision)
        val cuo = decimalDca(cuota, entra.precision)
        // El MIN-IN del contrato, repetido aqui para no gastar gas en un plan que
        // la cadena va a tirar. Se compara el texto que se firma, no el `Double`.
        if (java.math.BigDecimal(cuo) < java.math.BigDecimal(entra.minimo)) {
            throw IllegalArgumentException("La cuota por compra está por debajo del mínimo del contrato.")
        }
        val per = decimalCanonico(periodo.toDouble())
        val des = decimalCanonico(deslizamiento)

        // El id lo pone la app, no la pantalla. El contrato exige que empiece por
        // los 10 primeros caracteres del dueño (anti-okupas) y que no lleve
        // comillas, parentesis, barras ni espacios.
        val id = owner.take(10) + "-" + System.currentTimeMillis()

        val codigo = """(${contrato.modulo}.create-plan \"$id\" \"$owner\" (read-keyset \"ks\") ${entra.modulo} ${sale.modulo} $dep $cuo $per $des)"""
        val datos = """{"ks":{"keys":["$publica"],"pred":"keys-all"}}"""

        val cmd = """{"networkId":"$networkId","payload":{"exec":{"code":"$codigo","data":$datos}},""" +
            """"signers":[{"pubKey":"$publica","clist":[${capGas(gratis, owner, gasLimit)},""" +
            """{"name":"${entra.modulo}.TRANSFER","args":["$owner","${contrato.custodia}",{"decimal":"$dep"}]}]}],""" +
            """"meta":{"chainId":"$DCA_CHAIN","sender":"${remitente(gratis, owner)}","gasLimit":$gasLimit,""" +
            """"gasPrice":${if (gratis) GASOLINERA_GASPRICE else gasPrice},"ttl":600,"creationTime":$creationTime},""" +
            """"nonce":"koberlet-android:${System.currentTimeMillis()}"}"""

        val hash = hashComando(cmd)
        val sigs = JSONArray().put(JSONObject().put("sig", firmar(privada, hash)))
        return JSONObject()
            .put("cmd", cmd)
            .put("hash", aBase64Url(hash))
            .put("sigs", sigs)
            .put("id", id)
    }

    /**
     * El id de un plan, revisado con la misma vara que el contrato.
     *
     * El id se mete DENTRO del codigo Pact entre comillas, asi que aqui no se da
     * por bueno lo que llegue de la pantalla aunque venga de leer la cadena: se
     * repite el `enforce-safe-id` del contrato (empieza por los 10 primeros
     * caracteres del dueño, hasta 64, sin comillas, parentesis, barra ni espacios)
     * y ademas se cierra a los caracteres que puede tener un id creado por la app.
     */
    fun idPlanValido(id: String, owner: String): Boolean {
        if (id.length !in 1..64) return false
        val n = minOf(owner.length, 10)
        if (id.length < n || id.take(n) != owner.take(n)) return false
        return Regex("^[A-Za-z0-9:_.-]+$").matches(id)
    }

    /**
     * Firma parar, reanudar, cerrar o recargar un plan de compras.
     *
     * `contrato` es la clave del contrato donde vive el plan ("dca2" o "dca3"),
     * que la pantalla sabe porque lo leyo de ahi. Poner la que no es no desvia
     * nada: el id no existe en el otro contrato y la transaccion revierte.
     *
     * Las tres primeras las autoriza el guard del dueño: el contrato hace
     * `enforce-guard` del keyset del plan, y eso NO lo satisface una firma
     * acotada a capabilities -una firma acotada solo vale dentro de las que
     * concede-. Por eso van SIN clist. No es un agujero: lo que se firma es este
     * comando exacto, montado aqui, con su hash; la firma no sirve para otro.
     *
     * Recargar si lleva clist, porque ahi si sale dinero: `TRANSFER` del token del
     * bote (`entra`: "KDA" o la clave del token) a la custodia DE ESE CONTRATO por
     * el importe exacto, y nada mas. El token tiene que ser uno de los que admite
     * ese contrato; si no, no se firma.
     *
     * Cerrar devuelve el bote que quede a la cuenta del dueño; eso lo hace el
     * contrato con su propia capability, no hace falta firmar nada para ello.
     */
    fun gestionarPlanDca(
        networkId: String,
        accion: String,
        id: String,
        owner: String,
        cantidad: Double,
        contrato: String,
        entra: String,
        privada: ByteArray,
        publica: String,
        creationTime: Long,
        gasLimit: Int = 20000,
        gasPrice: String = "1e-8",
        gratis: Boolean = false,
    ): JSONObject {
        if (owner != "k:$publica") {
            throw IllegalArgumentException("Ese plan no es de esta cartera.")
        }
        val c = contratoDca(contrato)
        // SOLO `recargar` puede ir por la gasolinera, y no es por capricho.
        //
        // Pausar, reanudar y cerrar se firman SIN clist -firma sin acotar- porque
        // el contrato hace `enforce-guard` directo sobre el guard del dueno. En
        // Pact, una firma acotada a una lista de capabilities deja de valer para un
        // `enforce-guard` suelto, asi que meterles la capability del gas les
        // romperia la comprobacion de dueno. Ademas no mueven dinero y su gas son
        // 668 unidades: 0,0000067 KDA. No compensa tocar esa firma.
        if (gratis && accion != "recargar") {
            throw IllegalArgumentException("Esa acción sobre el plan no va por la gasolinera.")
        }
        exigirGasolineraDca(gratis, c)
        if (gratis) exigirCabeEnGasolinera(gasLimit)
        if (!idPlanValido(id, owner)) {
            throw IllegalArgumentException("El identificador del plan no vale.")
        }

        val codigo: String
        val clist: String
        when (accion) {
            "pausar" -> {
                codigo = """(${c.modulo}.pause-plan \"$id\")"""
                clist = ""
            }
            "reanudar" -> {
                codigo = """(${c.modulo}.resume-plan \"$id\")"""
                clist = ""
            }
            "cerrar" -> {
                codigo = """(${c.modulo}.close-plan \"$id\")"""
                clist = ""
            }
            "recargar" -> {
                if (cantidad <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
                // El token del bote: KDA vale en los dos contratos; cualquier otro
                // tiene que vivir en ESTE. Firmar el TRANSFER de un token que el
                // plan no tiene revierte siempre (ya costo un fallo en KoberluSW).
                val t = if (entra == "KDA") DCA_KDA_TOKEN else tokenDca(entra)
                if (t !== DCA_KDA_TOKEN && t.contrato != contrato) {
                    throw IllegalArgumentException("Ese token no va en ese contrato de compras.")
                }
                val monto = decimalDca(cantidad, t.precision)
                codigo = """(${c.modulo}.topup \"$id\" $monto)"""
                clist = ""","clist":[${capGas(gratis, owner, gasLimit)},""" +
                    """{"name":"${t.modulo}.TRANSFER","args":["$owner","${c.custodia}",{"decimal":"$monto"}]}]"""
            }
            else -> throw IllegalArgumentException("Esa acción sobre el plan no existe.")
        }

        val cmd = """{"networkId":"$networkId","payload":{"exec":{"code":"$codigo","data":{}}},""" +
            """"signers":[{"pubKey":"$publica"$clist}],""" +
            """"meta":{"chainId":"$DCA_CHAIN","sender":"${remitente(gratis, owner)}","gasLimit":$gasLimit,""" +
            """"gasPrice":${if (gratis) GASOLINERA_GASPRICE else gasPrice},"ttl":600,"creationTime":$creationTime},""" +
            """"nonce":"koberlet-android:${System.currentTimeMillis()}"}"""

        val hash = hashComando(cmd)
        val sigs = JSONArray().put(JSONObject().put("sig", firmar(privada, hash)))
        return JSONObject()
            .put("cmd", cmd)
            .put("hash", aBase64Url(hash))
            .put("sigs", sigs)
    }

    // --- Enviar un token que no es KDA ---------------------------------------

    /**
     * Monta y firma el envio de un FUNGIBLE de Kadena que no es el KDA: kb-USDC,
     * PCO, SPT, cBTC o cualquier otro que la cuenta tenga.
     *
     * SOBRE EL MODULO, que es la decision delicada de esta funcion.
     *
     * En el resto de la boveda el contrato al que se llama es una constante del
     * codigo, precisamente para que la parte web no pueda elegirlo. Aqui no se
     * puede: los tokens de Kadena no son una lista cerrada -el Mercado los descubre
     * de la cadena, y el dueno puede anadir el suyo-, asi que exigir catalogo seria
     * decirle a Antonio que no puede mandar la mitad de lo que tiene.
     *
     * Lo que se hace en su lugar es acotar el DANO:
     *
     *   - El modulo se valida con un regex estrecho: letras, digitos, `_`, `-` y
     *     puntos. Ni comillas, ni parentesis, ni espacios. Con eso no se puede
     *     escapar de la plantilla: lo unico que se puede llamar es el `transfer` de
     *     algun modulo, nunca codigo Pact inventado.
     *   - Las capabilities que se firman son `coin.GAS` y `<modulo>.TRANSFER` con
     *     el destinatario y el importe EXACTOS. No se firma `coin.TRANSFER`, asi
     *     que ni el modulo mas malicioso del mundo puede tocar tu KDA.
     *
     * O sea: lo peor que podria conseguir una parte web comprometida es mover ESE
     * token, a ESA cuenta y por ESA cantidad -que es justo lo que el dueno esta
     * viendo en la pantalla de confirmacion y lo que autoriza con su contrasena-.
     *
     * `precision` es la del token, y el importe se escribe con ella: Pact rechaza
     * un decimal con mas cifras de las que el token admite, y ese error llega como
     * un fallo raro en vez de como "te has pasado de decimales".
     */
    fun envioToken(
        networkId: String,
        chain: String,
        modulo: String,
        de: String,
        para: String,
        cantidad: Double,
        precision: Int,
        privada: ByteArray,
        publica: String,
        creationTime: Long,
        gasLimit: Int = 3000,
        gasPrice: String = "1e-8",
    ): JSONObject {
        if (!moduloValido(modulo)) throw IllegalArgumentException("Ese token no tiene un contrato con forma válida.")
        if (!cuentaValida(de)) throw IllegalArgumentException("La cuenta de origen no es válida.")
        if (!cuentaValida(para)) throw IllegalArgumentException("La cuenta de destino no es válida.")
        if (cantidad <= 0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")
        if (precision < 0 || precision > 12) throw IllegalArgumentException("Ese token no tiene tantos decimales.")

        val monto = String.format(java.util.Locale.US, "%." + precision + "f", cantidad)
        // Redondear hacia abajo no vale: si de 0,0000001 sale "0.00", se estaria
        // firmando un envio de cero. Se para y se dice.
        if (monto.toDouble() <= 0.0) throw IllegalArgumentException("Esa cantidad es más pequeña que lo que admite este token.")

        val esK = para.startsWith("k:")
        val codigo = if (esK)
            """($modulo.transfer-create \"$de\" \"$para\" (read-keyset \"ks\") $monto)"""
        else
            """($modulo.transfer \"$de\" \"$para\" $monto)"""
        val datos = if (esK)
            """{"ks":{"keys":["${para.substring(2)}"],"pred":"keys-all"}}"""
        else "{}"

        val cmd = """{"networkId":"$networkId","payload":{"exec":{"code":"$codigo","data":$datos}},""" +
            """"signers":[{"pubKey":"$publica","clist":[{"name":"coin.GAS","args":[]},""" +
            """{"name":"$modulo.TRANSFER","args":["$de","$para",{"decimal":"$monto"}]}]}],""" +
            """"meta":{"chainId":"$chain","sender":"$de","gasLimit":$gasLimit,"gasPrice":$gasPrice,"ttl":600,"creationTime":$creationTime},""" +
            """"nonce":"koberlet-android-tok:${System.currentTimeMillis()}"}"""

        val hash = hashComando(cmd)
        val sigs = JSONArray().put(JSONObject().put("sig", firmar(privada, hash)))
        return JSONObject()
            .put("cmd", cmd)
            .put("hash", aBase64Url(hash))
            .put("sigs", sigs)
    }

    // --- El Mercado de Kadena ------------------------------------------------

    /** El AMM del fork. Como todo lo que decide donde va el dinero, constante. */
    private const val AMM = "kaddex.exchange"

    // --- La gasolinera de KoberluSW ------------------------------------------
    //
    // `free.ksw-gasolinera` implementa `gas-payer-v1` y paga el gas de las
    // operaciones de KoberluSW. Hasta ahora solo la usaba la web: en el movil el
    // usuario pagaba siempre, aunque la operacion fuera identica.
    //
    // COMO FUNCIONA, que no es evidente: el `sender` de la transaccion pasa a ser
    // la cuenta de la gasolinera -una cuenta sin llave, guardada por una capability
    // guard- y el usuario firma `GAS_PAYER` en su clist. Chainweb compra el gas de
    // esa cuenta si la capability se adquiere, y la capability mira el CODIGO que
    // lleva la transaccion.
    //
    // LO QUE EL CONTRATO EXIGE, comprobado en `tests/test-ksw-gasolinera.repl` del
    // proyecto de los contratos:
    //
    //   - `tx-type` exec, y de una a DOS llamadas de primer nivel.
    //   - cada llamada EMPIEZA por un modulo permitido: los nuestros, el AMM, o un
    //     `transfer` de comision. Empieza, no contiene: mencionar la cuenta de
    //     comisiones no basta (hallazgo A-1 de su auditoria del 26/08).
    //   - si se toca el AMM directamente, la comision TIENE que ir en la misma
    //     transaccion.
    //   - gasPrice <= 1e-8 y gasLimit <= 8000.
    //
    // Ese tope de 8000 es el que obliga a bajar los limites de aqui. No es un
    // problema: medido sobre las 100 ultimas operaciones que pago la gasolinera en
    // cadena, el gas real va de 668 a 2312. Los 14000-20000 que se declaraban eran
    // techo de sobra, no consumo.
    const val GASOLINERA = "free.ksw-gasolinera"
    const val GASOLINERA_CUENTA = "c:Mq0gKlGBdjKvkBJLr4ECCu3_OxQ4_GJOzlYS0Ems-CY"
    const val GASOLINERA_GASLIMIT = 8000
    const val GASOLINERA_GASPRICE = "0.00000001"

    /**
     * El `sender` y la capability de gas, segun quien pague.
     *
     * Van juntos a proposito: son las dos mitades de la misma decision, y si una se
     * cambia sin la otra la transaccion falla con «Failed to buy gas», que es un
     * mensaje que no dice nada de lo que pasa de verdad.
     */
    private fun remitente(gratis: Boolean, cuenta: String): String =
        if (gratis) GASOLINERA_CUENTA else cuenta

    private fun capGas(gratis: Boolean, cuenta: String, gasLimit: Int): String =
        if (gratis) {
            """{"name":"$GASOLINERA.GAS_PAYER","args":["$cuenta",$gasLimit,{"decimal":"$GASOLINERA_GASPRICE"}]}"""
        } else {
            """{"name":"coin.GAS","args":[]}"""
        }

    /**
     * Comprueba lo que protege al USUARIO y al presupuesto de gas, antes de firmar.
     *
     * El umbral comercial de 5 kb-USDC NO se comprueba aqui, y es deliberado: lo
     * decide la pantalla, igual que en la web. El motivo esta escrito en el propio
     * contrato -al comprar el gas, Chainweb no pasa el `envData` del usuario, asi
     * que el minimo no se puede validar en cadena- y la consecuencia de que la
     * pantalla mienta es que se subvencione una operacion pequeña: gasta gas de
     * DNNS, no dinero del usuario. La defensa dura contra operaciones de polvo vive
     * donde se conoce el importe: los minimos por orden y por plan de `free.ksw2` y
     * `free.ksw-dca2`.
     *
     * Lo que si se exige aqui es el tope de gas, porque pasarse es un fallo seguro.
     */
    private fun exigirCabeEnGasolinera(gasLimit: Int) {
        if (gasLimit > GASOLINERA_GASLIMIT) {
            throw IllegalArgumentException(
                "Esta operación no cabe en el gas que paga la gasolinera."
            )
        }
    }

    /** El AMM vive en la chain 2. */
    const val AMM_CHAIN = "2"

    /**
     * La comision de servicio de Koberlet y la cuenta que la cobra.
     *
     * Estan AQUI y no en la pantalla a proposito: la pantalla dice cuanto, pero no
     * a donde. Aunque el WebView estuviera comprometido, la comision no se puede
     * desviar a otra cuenta, y el tope del 0,5 % se comprueba abajo antes de firmar.
     * Es la misma que ya cobran el DCA y las ordenes limite dentro de sus contratos.
     */
    const val COMISION_CUENTA = "k:e5b947889c87fc5057ed35fa31302f57a248c33d0bbdb20a9c81500e2f3748df"
    const val COMISION_CLAVE = "e5b947889c87fc5057ed35fa31302f57a248c33d0bbdb20a9c81500e2f3748df"
    const val COMISION_TOPE = "0.005"

    /**
     * Firma un cambio en el AMM de Kadena (`swap-exact-in`).
     *
     * La pantalla trae el CAMINO -uno o dos saltos, descubiertos de la cadena-, el
     * pool del primer salto, cuanto entra y el MINIMO que se acepta recibir. El
     * contrato del AMM y la chain los pone este fichero.
     *
     * Del camino no se puede tener catalogo por lo mismo que en `envioToken`: los
     * pares se descubren en la cadena y cambian. Se valida cada modulo con el regex
     * estrecho -nada de comillas ni parentesis- y se acota el dano con la
     * capability: solo se firma `coin.GAS` y el `TRANSFER` del token que SALE, por
     * la cantidad exacta y hacia el pool. Aunque el camino fuera mentira, lo unico
     * que se puede mover es eso.
     *
     * El MINIMO es lo que protege del deslizamiento y va dentro de lo firmado: si
     * en el momento del cambio el pool diera menos, la transaccion revierte.
     */
    fun cambioAmm(
        networkId: String,
        camino: List<String>,
        cuenta: String,
        poolPrimerSalto: String,
        cantidad: String,
        minimo: String,
        privada: ByteArray,
        publica: String,
        creationTime: Long,
        comision: String = "0.0",
        gasLimit: Int = 14000,
        gasPrice: String = "1e-8",
        gratis: Boolean = false,
    ): JSONObject {
        if (camino.size < 2 || camino.size > 3) {
            throw IllegalArgumentException("Ese camino de cambio no tiene sentido.")
        }
        for (mod in camino) {
            if (mod != "coin" && !moduloValido(mod)) {
                throw IllegalArgumentException("Ese token no tiene un contrato con forma válida.")
            }
        }
        if (!cuentaValida(cuenta)) throw IllegalArgumentException("La cuenta de origen no es válida.")
        if (!cuentaValida(poolPrimerSalto)) throw IllegalArgumentException("La cuenta del pool no es válida.")
        val entra = decimalValido(cantidad)
        val sale = decimalValido(minimo)
        if (entra.toDouble() <= 0.0) throw IllegalArgumentException("La cantidad tiene que ser mayor que cero.")

        val pubKey = cuenta.removePrefix("k:")
        if (!Regex("^[0-9a-fA-F]{64}$").matches(pubKey)) {
            throw IllegalArgumentException("Para el mercado la cuenta Kadena tiene que ser k: y 64 caracteres.")
        }

        // `cantidad` es lo que entra en el pool: el NETO. La comision se aparto antes
        // y va aparte, en esta misma transaccion. Se comprueba aqui que no pase del
        // 0,5 % de lo que el usuario entrega en total, redondeando a favor de la
        // pantalla un solo decimal para no pelearse con el ultimo digito.
        val cuota = decimalValido(comision)
        val cuotaBD = java.math.BigDecimal(cuota)
        if (cuotaBD.signum() < 0) throw IllegalArgumentException("La comisión no puede ser negativa.")
        val hayComision = cuotaBD.signum() > 0
        if (hayComision) {
            val bruto = java.math.BigDecimal(entra).add(cuotaBD)
            val tope = bruto.multiply(java.math.BigDecimal(COMISION_TOPE))
                .setScale(cuotaBD.scale(), java.math.RoundingMode.CEILING)
            if (cuotaBD > tope) {
                throw IllegalArgumentException("La comisión no puede ser mayor que la parte que le toca.")
            }
        }

        val cambio = """($AMM.swap-exact-in (read-decimal \"amountIn\") (read-decimal \"amountOutMin\") [""" +
            camino.joinToString(" ") + """] \"$cuenta\" \"$cuenta\" (read-keyset \"ks\"))"""
        // El cambio y el cobro, atados: si el cambio revierte no se cobra nada, y si
        // la comision no se puede pagar no hay cambio. `transfer-create` porque la
        // cuenta que cobra puede no existir todavia en el token que entra.
        val cobro = """(${camino[0]}.transfer-create \"$cuenta\" \"$COMISION_CUENTA\"""" +
            """ (read-keyset \"ks-koberlet\") (read-decimal \"comision\"))"""
        val codigo = when {
            !hayComision -> cambio
            // CON GASOLINERA VAN SUELTAS, no dentro de un `let`.
            //
            // La gasolinera comprueba que cada llamada de primer nivel EMPIECE por
            // un modulo permitido. `(let ((r (kaddex...` empieza por `(let`, que no
            // esta en la lista, asi que la transaccion entera se rechaza -y el
            // mensaje que le llega al usuario es «Failed to buy gas», que no ayuda.
            //
            // Sueltas se pierde el valor de retorno del cambio, que pasa a ser el
            // del cobro. No importa: nadie lee ese resultado, la pantalla refresca
            // saldos. Y la garantia que si importa se mantiene, porque es de la
            // transaccion y no del `let`: las dos van en el mismo bloque o no va
            // ninguna.
            gratis -> "$cambio $cobro"
            else -> """(let ((r $cambio)) $cobro r)"""
        }
        val extraDatos = if (hayComision) {
            ""","comision":{"decimal":"$cuota"},"ks-koberlet":{"keys":["$COMISION_CLAVE"],"pred":"keys-all"}"""
        } else {
            ""
        }
        val datos = """{"amountIn":{"decimal":"$entra"},"amountOutMin":{"decimal":"$sale"}$extraDatos,""" +
            """"ks":{"keys":["$pubKey"],"pred":"keys-all"}}"""
        // Lo que se firma acota el dano: el TRANSFER del pool por el neto exacto y,
        // si la hay, el de la comision por su cifra exacta y hacia la cuenta de arriba.
        val extraClist = if (hayComision) {
            """,{"name":"${camino[0]}.TRANSFER","args":["$cuenta","$COMISION_CUENTA",{"decimal":"$cuota"}]}"""
        } else {
            ""
        }
        // Una transferencia mas = mas gas. Con gasolinera NO se suma nada: ahi el
        // `gasLimit` que llega es el total que la pantalla midio simulando el
        // cambio, y sumarle 4000 a ciegas es lo que lo sacaria del tope de 8000.
        val gas = if (hayComision && !gratis) gasLimit + 4000 else gasLimit
        if (gratis) {
            // El contrato lo exige: un swap directo contra el AMM solo se
            // subvenciona si paga la comision del servicio. Sin ella, la capability
            // no se adquiere y la transaccion muere comprando el gas.
            if (!hayComision) {
                throw IllegalArgumentException(
                    "La gasolinera solo paga un cambio si lleva la comisión del servicio."
                )
            }
            exigirCabeEnGasolinera(gas)
        }
        val precio = if (gratis) GASOLINERA_GASPRICE else gasPrice

        val cmd = """{"networkId":"$networkId","payload":{"exec":{"code":"$codigo","data":$datos}},""" +
            """"signers":[{"pubKey":"$publica","clist":[${capGas(gratis, cuenta, gas)},""" +
            """{"name":"${camino[0]}.TRANSFER","args":["$cuenta","$poolPrimerSalto",{"decimal":"$entra"}]}$extraClist]}],""" +
            """"meta":{"chainId":"$AMM_CHAIN","sender":"${remitente(gratis, cuenta)}","gasLimit":$gas,"gasPrice":$precio,"ttl":600,"creationTime":$creationTime},""" +
            """"nonce":"koberlet-android-swap:${System.currentTimeMillis()}"}"""

        val hash = hashComando(cmd)
        val sigs = JSONArray().put(JSONObject().put("sig", firmar(privada, hash)))
        return JSONObject()
            .put("cmd", cmd)
            .put("hash", aBase64Url(hash))
            .put("sigs", sigs)
    }

    /**
     * Un decimal escrito como texto, tal cual va a ir dentro del JSON.
     *
     * Se comprueba que sean solo digitos y un punto: es lo que impide que por aqui
     * se cuele nada dentro del comando firmado.
     */
    fun decimalValido(n: String): String {
        val limpio = n.trim().replace(',', '.')
        if (!Regex("""^[0-9]+(\.[0-9]+)?$""").matches(limpio)) {
            throw IllegalArgumentException("Eso no es una cantidad.")
        }
        if (limpio.length > 40) throw IllegalArgumentException("Eso no es una cantidad.")
        // Pact quiere un punto decimal en los `decimal`: "5" iria como entero.
        return if (limpio.contains('.')) limpio else "$limpio.0"
    }

    /**
     * Un nombre de modulo Pact: `namespace.contrato`, y nada mas.
     *
     * Lo que NO puede llevar es lo que importa: comillas, parentesis, espacios o
     * cualquier cosa que permita salirse de la plantilla y escribir codigo Pact.
     */
    fun moduloValido(modulo: String): Boolean {
        if (modulo.length < 3 || modulo.length > 128) return false
        if (!Regex("""^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$""").matches(modulo)) return false
        // `coin` es el KDA y tiene su propia funcion, con su gas y sus pruebas.
        return modulo != "coin"
    }

    /**
     * Misma regla que `validKdaAccount` del escritorio (hallazgo #5 de Alex): se
     * acepta lo que acepta la cadena, y se cierra lo unico que podria escapar del
     * literal "..." donde la cuenta se interpola en el codigo Pact.
     */
    fun cuentaValida(cuenta: String): Boolean {
        if (cuenta.length < 3 || cuenta.length > 256) return false
        for (c in cuenta) {
            val v = c.code
            if (v < 0x20 || v == 0x22 || v == 0x5c || v == 0x7f || v > 0xff) return false
        }
        val m = Regex("^([A-Za-z]):").find(cuenta) ?: return true
        val h43 = "[A-Za-z0-9_-]{43}"
        val nom = "[A-Za-z0-9_-]+(?:[.][A-Za-z0-9_-]+)*"
        val patron = when (m.groupValues[1]) {
            "k" -> "^k:[0-9a-fA-F]{64}$"
            "w" -> "^w:$h43:$nom$"
            "r" -> "^r:$nom$"
            "u" -> "^u:$nom:$h43$"
            "c" -> "^c:$h43$"
            "p" -> "^p:$h43:$nom$"
            "m" -> "^m:$nom:$nom$"
            else -> return false            // prefijo de una letra reservado y sin forma valida
        }
        return Regex(patron).matches(cuenta)
    }
}
