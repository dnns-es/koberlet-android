package es.dnns.koberlet

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * PRUEBAS DEL CAMBIO EN EL MERCADO DE KADENA.
 *
 * Aqui la pantalla trae el CAMINO -que token pasa por que pool-, porque los pares
 * se descubren en la cadena y no hay catalogo posible. Asi que lo que se vigila es
 * justo eso: que por el camino no se pueda colar codigo Pact, y que la capability
 * acote lo que se puede mover aunque el camino fuera mentira.
 */
class CambioAmmTest {

    private val privada = ByteArray(32)
    private val publica = Derivacion.publicaKadena(privada)
    private val cuenta = "k:$publica"
    private val pool = "c:pZ8x9nQrLm3vT7yKdWs2Hf5JgEaRt1UiOp4AsDfGhIj"
    private val PCO = "n_57fcd6f7b72e8949af51a8d6f17fe12cc7719d10.pco"

    private fun firmado(
        camino: List<String> = listOf("coin", PCO),
        cantidad: String = "10",
        minimo: String = "1234.5",
        poolPrimerSalto: String = pool,
        comision: String = "0.0",
    ): JSONObject = FirmaKda.cambioAmm(
        networkId = "mainnet01", camino = camino, cuenta = cuenta,
        poolPrimerSalto = poolPrimerSalto, cantidad = cantidad, minimo = minimo,
        privada = privada, publica = publica, creationTime = 1_700_000_000,
        comision = comision,
    )

    private fun cmdDe(o: JSONObject) = JSONObject(o.getString("cmd"))

    @Test
    fun `el comando es un swap-exact-in del AMM con su camino`() {
        val cmd = cmdDe(firmado())
        val code = cmd.getJSONObject("payload").getJSONObject("exec").getString("code")
        assertEquals(
            """(kaddex.exchange.swap-exact-in (read-decimal "amountIn") (read-decimal "amountOutMin") """ +
                """[coin $PCO] "$cuenta" "$cuenta" (read-keyset "ks"))""",
            code,
        )
        assertEquals("2", cmd.getJSONObject("meta").getString("chainId"))
    }

    @Test
    fun `las cantidades van en el data, con punto decimal`() {
        val data = cmdDe(firmado(cantidad = "10", minimo = "1234.5"))
            .getJSONObject("payload").getJSONObject("exec").getJSONObject("data")
        // Un "10" pelado seria un entero para Pact: tiene que llevar su punto.
        assertEquals("10.0", data.getJSONObject("amountIn").getString("decimal"))
        assertEquals("1234.5", data.getJSONObject("amountOutMin").getString("decimal"))
        assertEquals(publica, data.getJSONObject("ks").getJSONArray("keys").getString(0))
        assertEquals("keys-all", data.getJSONObject("ks").getString("pred"))
    }

    @Test
    fun `solo se firma el gas y el TRANSFER del token que sale`() {
        val clist = cmdDe(firmado()).getJSONArray("signers").getJSONObject(0).getJSONArray("clist")
        assertEquals(2, clist.length())
        assertEquals("coin.GAS", clist.getJSONObject(0).getString("name"))

        val tr = clist.getJSONObject(1)
        assertEquals("coin.TRANSFER", tr.getString("name"))
        val args = tr.getJSONArray("args")
        assertEquals(cuenta, args.getString(0))
        assertEquals(pool, args.getString(1))          // va al pool, no a cualquiera
        assertEquals("10.0", args.getJSONObject(2).getString("decimal"))
    }

    @Test
    fun `con dos saltos el TRANSFER sigue siendo el del primero`() {
        val otro = "n_48867b242317a0216a67f8c7ca26696b5878e0e3.SPT"
        val clist = cmdDe(firmado(camino = listOf(PCO, "coin", otro)))
            .getJSONArray("signers").getJSONObject(0).getJSONArray("clist")
        assertEquals("$PCO.TRANSFER", clist.getJSONObject(1).getString("name"))
    }

    @Test
    fun `un camino con codigo Pact dentro no se firma`() {
        val trampas = listOf(
            listOf("coin", """x") (coin.transfer "victima" "ladron" 999.0) ("""),
            listOf("coin", "free.x (read-keyset)"),
            listOf("coin", "free.x\""),
            listOf("coin"),                                    // un solo salto no es un cambio
            listOf("coin", PCO, "coin", PCO),                  // demasiados
            listOf("coin", ""),
        )
        for (c in trampas) {
            try {
                firmado(camino = c)
                fail("debería haber rechazado $c")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `una cantidad que no es un numero no se firma`() {
        for (mala in listOf("1e6", "0x10", "1,5,5", "diez", "", "-3", "10.")) {
            try {
                firmado(cantidad = mala)
                fail("debería haber rechazado «$mala»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `cambiar cero no se firma`() {
        try {
            firmado(cantidad = "0")
            fail("cambiar cero no tiene sentido")
        } catch (e: IllegalArgumentException) { /* eso se quería */ }
    }

    @Test
    fun `una cuenta de pool mal escrita no se firma`() {
        try {
            firmado(poolPrimerSalto = "pool\" \"otra")
            fail("debería haber rechazado una cuenta con comillas")
        } catch (e: IllegalArgumentException) { /* eso se quería */ }
    }

    @Test
    fun `el minimo firmado es el que se pasa, y cambia la firma`() {
        val a = firmado(minimo = "1234.5").getJSONArray("sigs").getJSONObject(0).getString("sig")
        val b = firmado(minimo = "1.0").getJSONArray("sigs").getJSONObject(0).getString("sig")
        assertTrue("con otro suelo, otra firma", a != b)
    }

    @Test
    fun `el comando es JSON valido y el hash cuadra con el comando`() {
        val f = firmado()
        val cmd = f.getString("cmd")
        assertEquals(FirmaKda.aBase64Url(FirmaKda.hashComando(cmd)), f.getString("hash"))
        JSONObject(cmd)                                  // si no fuera JSON, esto revienta
    }

    // --- La comision de servicio de Koberlet ---------------------------------
    //
    // El cambio del Mercado era lo unico que no sostenia el proyecto: el pool se
    // quedaba su 0,3 % y Koberlet no cobraba nada, mientras el DCA y las ordenes
    // limite ya cobraban su 0,5 % dentro del contrato. Aqui se cobra lo mismo, y
    // lo que se vigila es que el cobro no pueda irse de las manos: ni a otra
    // cuenta, ni por mas de lo que toca, ni por su cuenta sin el cambio.

    @Test
    fun `sin comision el comando es exactamente el de siempre`() {
        // La pantalla vieja -o una que no la mande- no cambia de comportamiento.
        val code = cmdDe(firmado()).getJSONObject("payload").getJSONObject("exec").getString("code")
        assertTrue("sin comisión no se envuelve en un let", code.startsWith("(kaddex.exchange.swap-exact-in"))
        assertEquals(2, cmdDe(firmado()).getJSONArray("signers").getJSONObject(0).getJSONArray("clist").length())
    }

    @Test
    fun `con comision el cambio y el cobro van en la misma transaccion`() {
        val code = cmdDe(firmado(comision = "0.05"))
            .getJSONObject("payload").getJSONObject("exec").getString("code")
        // Un solo `let`: o pasan las dos cosas o no pasa ninguna. Si el cobro fuera
        // una transaccion aparte, podria cobrarse sin que el cambio llegue a hacerse.
        assertTrue("el swap va dentro del let", code.startsWith("(let ((r (kaddex.exchange.swap-exact-in"))
        assertTrue(
            "el cobro es un transfer-create a la cuenta de Koberlet",
            code.contains("""(coin.transfer-create "$cuenta" "${FirmaKda.COMISION_CUENTA}" """ +
                """(read-keyset "ks-koberlet") (read-decimal "comision"))"""),
        )
        assertTrue("el let devuelve lo que devolvio el swap", code.endsWith(" r)"))
    }

    @Test
    fun `lo que entra en el pool es el neto y la comision va aparte`() {
        val data = cmdDe(firmado(cantidad = "9.95", comision = "0.05"))
            .getJSONObject("payload").getJSONObject("exec").getJSONObject("data")
        assertEquals("9.95", data.getJSONObject("amountIn").getString("decimal"))
        assertEquals("0.05", data.getJSONObject("comision").getString("decimal"))
        assertEquals(
            FirmaKda.COMISION_CLAVE,
            data.getJSONObject("ks-koberlet").getJSONArray("keys").getString(0),
        )
    }

    @Test
    fun `se firma un TRANSFER acotado a la cuenta de la comision`() {
        val clist = cmdDe(firmado(cantidad = "9.95", comision = "0.05"))
            .getJSONArray("signers").getJSONObject(0).getJSONArray("clist")
        assertEquals(3, clist.length())
        val tr = clist.getJSONObject(2)
        assertEquals("coin.TRANSFER", tr.getString("name"))
        // Cuenta exacta y cantidad exacta: la firma no cubre ni un centimo mas.
        assertEquals(FirmaKda.COMISION_CUENTA, tr.getJSONArray("args").getString(1))
        assertEquals("0.05", tr.getJSONArray("args").getJSONObject(2).getString("decimal"))
    }

    @Test
    fun `la cuenta que cobra no la pone la pantalla`() {
        // Aunque el WebView estuviera comprometido, no hay por donde decir "cobra
        // aqui": la cuenta es constante de este fichero y sale en todos los comandos.
        val cmd = cmdDe(firmado(comision = "0.05")).toString()
        assertTrue(cmd.contains(FirmaKda.COMISION_CUENTA))
        assertTrue("la cuenta es una k: de 64", Regex("^k:[0-9a-f]{64}$").matches(FirmaKda.COMISION_CUENTA))
        assertEquals("k:" + FirmaKda.COMISION_CLAVE, FirmaKda.COMISION_CUENTA)
    }

    @Test
    fun `una comision por encima del 0,5 por ciento no se firma`() {
        // 10 al pool + 1 de comision seria un 9 %: eso no es la comision acordada.
        try {
            firmado(cantidad = "10", comision = "1.0")
            fail("debería haber rechazado cobrar de más")
        } catch (e: IllegalArgumentException) { /* eso se quería */ }
    }

    @Test
    fun `el cero de la derecha no abre la mano`() {
        // El gemelo de Swift falló justo aquí: `Decimal` normaliza y «1.0» perdía su
        // decimal, con lo que el tope se redondeaba a la unidad y una comisión del 9 %
        // colaba. Aquí `BigDecimal` conserva la escala, pero el caso se fija en los dos
        // para que no vuelvan a separarse.
        for ((entra, cuota) in listOf("10" to "1.0", "10" to "0.50", "100" to "5.00", "1" to "1.000")) {
            try {
                firmado(cantidad = entra, comision = cuota)
                fail("$cuota sobre $entra no es el 0,5 %")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
        // Y con el cero de la derecha puesto, lo que sí toca se sigue firmando.
        firmado(cantidad = "99.50", comision = "0.50")
    }

    @Test
    fun `el 0,5 por ciento justo si se firma`() {
        // 99,5 al pool + 0,5 de comision = 100 entregados: exactamente el 0,5 %.
        val data = cmdDe(firmado(cantidad = "99.5", comision = "0.5"))
            .getJSONObject("payload").getJSONObject("exec").getJSONObject("data")
        assertEquals("0.5", data.getJSONObject("comision").getString("decimal"))
    }

    @Test
    fun `la comision no puede colar codigo Pact`() {
        try {
            firmado(comision = """0.05" (coin.transfer "a" "b" 1.0) "''')""")
            fail("debería haber rechazado eso como cantidad")
        } catch (e: IllegalArgumentException) { /* eso se quería */ }
    }

    @Test
    fun `con comision hay mas gas, porque hay una transferencia mas`() {
        val sin = cmdDe(firmado()).getJSONObject("meta").getInt("gasLimit")
        val con = cmdDe(firmado(comision = "0.05")).getJSONObject("meta").getInt("gasLimit")
        assertTrue("el gas sube con el cobro", con > sin)
    }
}
