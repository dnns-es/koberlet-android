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
    ): JSONObject = FirmaKda.cambioAmm(
        networkId = "mainnet01", camino = camino, cuenta = cuenta,
        poolPrimerSalto = poolPrimerSalto, cantidad = cantidad, minimo = minimo,
        privada = privada, publica = publica, creationTime = 1_700_000_000,
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
}
