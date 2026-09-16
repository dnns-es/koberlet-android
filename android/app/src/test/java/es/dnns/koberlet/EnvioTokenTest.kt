package es.dnns.koberlet

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * PRUEBAS DEL ENVIO DE UN TOKEN QUE NO ES KDA.
 *
 * Lo que se vigila aqui, por orden de lo que costaria:
 *
 *   1. Que el modulo no pueda escaparse de la plantilla y colar codigo Pact. Es la
 *      unica pieza de toda la boveda que viene de la parte web, asi que es la que
 *      hay que apretar.
 *   2. Que las capabilities acoten el dano: `coin.GAS` y el `TRANSFER` de ESE
 *      modulo, con destinatario e importe exactos. Nunca `coin.TRANSFER`.
 *   3. Que el importe se escriba con los decimales del token y el mismo texto en
 *      el codigo y en la capability. Si no coinciden, Pact lo rechaza.
 */
class EnvioTokenTest {

    private val privada = ByteArray(32)
    private val publica = Derivacion.publicaKadena(privada)
    private val de = "k:" + "ab".repeat(32)
    private val para = "k:" + "cd".repeat(32)
    private val PCO = "n_57fcd6f7b72e8949af51a8d6f17fe12cc7719d10.pco"

    private fun firmado(
        modulo: String = PCO,
        destino: String = para,
        cantidad: Double = 1.5,
        precision: Int = 12,
    ): JSONObject = FirmaKda.envioToken(
        networkId = "mainnet01", chain = "2", modulo = modulo, de = de, para = destino,
        cantidad = cantidad, precision = precision, privada = privada, publica = publica,
        creationTime = 1_700_000_000,
    )

    private fun cmdDe(o: JSONObject) = JSONObject(o.getString("cmd"))

    @Test
    fun `el comando llama al transfer del modulo pedido`() {
        val cmd = cmdDe(firmado())
        val code = cmd.getJSONObject("payload").getJSONObject("exec").getString("code")
        // El destino es k:, asi que crea la cuenta si no existe.
        assertEquals("""($PCO.transfer-create "$de" "$para" (read-keyset "ks") 1.500000000000)""", code)

        val ks = cmd.getJSONObject("payload").getJSONObject("exec")
            .getJSONObject("data").getJSONObject("ks")
        assertEquals("keys-all", ks.getString("pred"))
        assertEquals(para.substring(2), ks.getJSONArray("keys").getString(0))
    }

    @Test
    fun `a una cuenta que no es k se usa transfer a secas`() {
        val code = cmdDe(firmado(destino = "r:alguien")).getJSONObject("payload")
            .getJSONObject("exec").getString("code")
        assertTrue(code.startsWith("($PCO.transfer \"$de\" \"r:alguien\""))
        assertTrue("no puede llevar keyset: la cuenta tiene que existir ya", !code.contains("read-keyset"))
    }

    @Test
    fun `las capabilities son el gas y el TRANSFER de ese modulo, y nada mas`() {
        val clist = cmdDe(firmado()).getJSONArray("signers").getJSONObject(0).getJSONArray("clist")
        assertEquals(2, clist.length())
        assertEquals("coin.GAS", clist.getJSONObject(0).getString("name"))

        val tr = clist.getJSONObject(1)
        assertEquals("$PCO.TRANSFER", tr.getString("name"))
        val args = tr.getJSONArray("args")
        assertEquals(de, args.getString(0))
        assertEquals(para, args.getString(1))
        assertEquals("1.500000000000", args.getJSONObject(2).getString("decimal"))

        // Lo que NO esta es lo que protege el KDA: sin `coin.TRANSFER` firmado, el
        // contrato del token no puede tocar el saldo de KDA de la cuenta.
        val nombres = (0 until clist.length()).map { clist.getJSONObject(it).getString("name") }
        assertTrue("no se firma coin.TRANSFER", !nombres.contains("coin.TRANSFER"))
    }

    @Test
    fun `el importe se escribe con los decimales del token`() {
        val code = cmdDe(firmado(cantidad = 2.0, precision = 6)).getJSONObject("payload")
            .getJSONObject("exec").getString("code")
        assertTrue(code.endsWith("2.000000)"))

        // Y el mismo texto en la capability: si difieren, Pact lo rechaza.
        val cmd = cmdDe(firmado(cantidad = 2.0, precision = 6))
        val dec = cmd.getJSONArray("signers").getJSONObject(0).getJSONArray("clist")
            .getJSONObject(1).getJSONArray("args").getJSONObject(2).getString("decimal")
        assertEquals("2.000000", dec)
    }

    @Test
    fun `una cantidad que se redondea a cero no se firma`() {
        try {
            firmado(cantidad = 0.0000001, precision = 2)
            fail("0,0000001 con 2 decimales es cero: no se puede firmar")
        } catch (e: IllegalArgumentException) { /* eso se quería */ }
    }

    // --- Lo que de verdad importa: el modulo ---------------------------------

    @Test
    fun `un modulo con comillas, parentesis o espacios no se acepta`() {
        val trampas = listOf(
            """free.x" "k:otro") (coin.transfer "victima" "ladron" 1.0)(free.x.transfer""",
            "free.x (coin.transfer)",
            "free.x'",
            "free x",
            "free.x\\",
            "(coin.transfer)",
            "free.x;coin",
            "",
            "ab",
            "coin",                                   // el KDA tiene su propia función
        )
        for (m in trampas) {
            assertTrue("debería rechazar «$m»", !FirmaKda.moduloValido(m))
            try {
                firmado(modulo = m)
                fail("debería haber rechazado «$m»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }

    @Test
    fun `los modulos de verdad si se aceptan`() {
        for (m in listOf(
            PCO,
            "n_48867b242317a0216a67f8c7ca26696b5878e0e3.SPT",
            "n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC",
            "free.crankk01",
            "kdlaunch.token",
        )) {
            assertTrue("debería aceptar «$m»", FirmaKda.moduloValido(m))
        }
    }

    @Test
    fun `el comando sigue siendo JSON valido con un modulo raro pero legal`() {
        // Guiones y subrayados dentro: es lo normal en los tokens del fork.
        val cmd = cmdDe(firmado(modulo = "n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC"))
        assertEquals("mainnet01", cmd.getString("networkId"))
        assertEquals("2", cmd.getJSONObject("meta").getString("chainId"))
        assertEquals(de, cmd.getJSONObject("meta").getString("sender"))
    }

    @Test
    fun `la firma cambia si cambia cualquier cosa del comando`() {
        val a = firmado().getJSONArray("sigs").getJSONObject(0).getString("sig")
        val b = firmado(cantidad = 1.6).getJSONArray("sigs").getJSONObject(0).getString("sig")
        assertTrue(a != b)
    }

    @Test
    fun `cuentas mal escritas no se firman`() {
        for (mala in listOf("k:abc", "", "  ", "k:" + "zz".repeat(32))) {
            try {
                firmado(destino = mala)
                fail("debería haber rechazado «$mala»")
            } catch (e: IllegalArgumentException) { /* eso se quería */ }
        }
    }
}
