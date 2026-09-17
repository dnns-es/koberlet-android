// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SECCION PUENTE.
//
// Pasar monedas entre Kadena y Ethereum. Es la parte mas peligrosa del monedero,
// asi que se porta al reves de como se suele: primero lo que no puede perder
// dinero -ver, simular, comprobar y dar el dato que salva un envio- y solo
// despues, cuando este probado en Kotlin, firmar.
//
// La forma es la del cambiador del Mercado -dos lados y el boton de darle la
// vuelta- pero lo que hay a cada lado no son dos monedas: son las dos ORILLAS. Y
// el lado de destino no lleva una cantidad, lleva a quien va: una direccion de
// Ethereum en un sentido, y el custodio de tu cuenta Kadena en el otro.
//
// El aviso de arriba no es una formula legal: dice lo que encontro nuestra propia
// auditoria. Un monedero que te deja usar un puente sin contarte que su respaldo
// cuelga de una llave suelta no te esta cuidando.

import {
    RUTAS, saldosKb, simularHaciaEvm, custodioDe, idMensajeDe, entregadoEnEvm,
    estadoEvm, simularHaciaKadena,
    sobreEvm, peajeWei, mandarRaw, esperarReciboEvm,
} from './lib/puente.js';
import { selectorCartera, selectorDestino, cuentaElegida } from './cartera-activa.js';
import { enviarComando, esperarResultado } from './lib/kda.js';
import { boveda } from './boveda/contrato.js';
import { t, locale } from './idioma.js';
import { nombreBio } from './biometria.js';
import { recorta } from './cifras.js';
import { pasos, parteDelNodo } from './pasos.js';
import { lineaCopiable } from './copiable.js';
import { arrancar, enMarcha, alCambiar, olvidar } from './enmarcha.js';
import { historial, apuntar, apuntarCambio, olvidarHistorial } from './historial-puente.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function caja() { return elemento('div', null, 'caja'); }

function fila(izquierda, derecha) {
    const f = elemento('div', null, 'fila');
    f.append(elemento('span', izquierda, 'izq'), elemento('span', derecha, 'der'));
    return f;
}

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', alPulsar);
    return b;
}

// Cinco decimales como mucho en todo lo que se lee, y recortando (ver
// `cifras.js`).
function numero(n, decimales = 5) {
    return recorta(n, Math.min(decimales, 5));
}

const RUTA = RUTAS[0];

/**
 * @param raiz  donde pintar
 * @param ctx   { cuentas, red }
 */
export function pintarPuente(raiz, ctx) {
    raiz.innerHTML = '';

    if (!cuentaElegida(ctx.cuentas, 'kda')) {
        raiz.append(elemento('p', t('No hay ninguna cartera con cuenta de Kadena.'), 'nota'));
        return;
    }

    raiz.append(bloqueViaje(raiz, ctx));
    raiz.append(bloqueEntrega(ctx.red));
    raiz.append(bloqueComoVa());
}

// --- El viaje: dos orillas y el botón de cambiar el sentido -----------------

function bloqueViaje(raiz, ctx) {
    const c = caja();
    // Sin titulo: el aviso de arriba ya dice donde estamos, y dos veces "Puente"
    // en la misma pantalla es una linea que no informa de nada.
    // Los otros pares (USDT, DAI, WBTC) tienen contratos pero nadie ha recorrido
    // ese camino, y aqui un error no se devuelve. No se ofrecen.
    //
    // El aviso de la auditoria ya no ocupa media pantalla en rojo, pero no
    // desaparece: el respaldo en Ethereum cuelga de una sola llave, y eso no se
    // puede omitir en la pantalla donde se decide cruzar. Queda en una linea.
    // El par se escribe en el orden del viaje y gira con él: si dijera siempre
    // «USDC ↔ kb-USDC», al cambiar el sentido quedaría contando lo contrario de lo
    // que va a pasar, y en un puente el orden ES la operación.
    // Arriba: a la izquierda el par y el sentido, a la derecha el historial. Lo de
    // «experimental, cantidades pequeñas» se cae por petición de Antonio; el aviso
    // que de verdad hace falta -que el respaldo cuelga de una sola llave- sigue en
    // «Cómo funciona un puente», al pie de la pantalla.
    const cabecera = elemento('div', null, 'cab-seccion');
    const linea = elemento('p', null, 'nota');
    const verHistorial = document.createElement('button');
    verHistorial.type = 'button';
    verHistorial.className = 'enlace';
    verHistorial.textContent = t('Historial');
    verHistorial.addEventListener('click', () => hojaHistorial(ctx));
    cabecera.append(linea, verHistorial);
    c.append(cabecera);

    // 'salida' = de Kadena a Ethereum; 'entrada' = de Ethereum a Kadena.
    let sentido = 'salida';

    // Las dos cabeceras: de qué cartera sale y a cuál va. Con tres carteras de
    // Kadena y tres de Ethereum, esto no es un adorno: es lo único que dice con
    // qué cuenta se va a operar. Se rehacen al cambiar el sentido, porque origen y
    // destino cambian de red.
    const cabOrigen = elemento('div');
    const cabDestino = elemento('div');

    const origen = orilla(t('Desde'), true);
    const destino = orilla(t('Hacia'), false);

    // El botón de girar NO es un círculo con una flecha, como en el Mercado: aquí
    // dice hacia dónde va el dinero ahora mismo («⇄ Kadena → Ethereum») y por eso
    // se ve de un vistazo que el puente va en los dos sentidos. Con el círculo
    // solo, el sentido había que deducirlo de las dos orillas, y no se deducía.
    const vuelta = elemento('div', null, 'da-la-vuelta');
    const bVuelta = document.createElement('button');
    bVuelta.type = 'button';
    bVuelta.className = 'pastilla-vuelta';
    bVuelta.setAttribute('aria-label', t('Cambiar el sentido'));
    vuelta.append(bVuelta);

    const aQuien = elemento('div', null, 'a-quien');
    const datos = elemento('div');
    const salida = elemento('div');
    // El botón firma. No simula: la comprobación sigue estando -es gratis y aquí
    // un error no se devuelve- pero pasó a ser un paso de dentro, entre pedir la
    // contraseña y firmar, en vez de una pantalla previa en la que uno se quedaba.
    const accion = boton(t('Firmar el envío'), () => pedirFirma());

    let cuentaOrigen = null;   // la cuenta que paga: Kadena o Ethereum según el sentido
    let elegirDestino = null;  // el selector de destino, que sabe dar la dirección
    let notaFirma = null;      // el aviso de lo que todavía no se puede firmar aquí

    function pinta() {
        const haciaEvm = sentido === 'salida';

        origen.red.textContent = haciaEvm ? 'Kadena' : 'Ethereum';
        origen.token.textContent = haciaEvm ? 'kb-' + RUTA.simbolo : RUTA.simbolo;
        destino.red.textContent = haciaEvm ? 'Ethereum' : 'Kadena';
        destino.token.textContent = haciaEvm ? RUTA.simbolo : 'kb-' + RUTA.simbolo;
        bVuelta.textContent = '⇄  ' + origen.red.textContent + ' → ' + destino.red.textContent;
        linea.textContent = t('Solo {0} → {1}',
            origen.token.textContent, destino.token.textContent);
        origen.entrada.value = '';
        cabOrigen.textContent = '';
        cabDestino.textContent = '';
        aQuien.textContent = '';
        datos.textContent = '';
        salida.textContent = '';
        if (notaFirma) {
            // Desde la 0.50.0 los DOS sentidos se firman aquí. Lo que cambia es que
            // el de vuelta son dos transacciones de Ethereum -permiso y envío- y
            // eso conviene saberlo antes de empezar, no al ver el segundo botón.
            notaFirma.textContent = haciaEvm
                ? ''
                : t('Desde Ethereum el viaje son dos transacciones: primero autorizar el token y después enviar. Las dos se firman aquí y las dos gastan gas.');
        }

        // De dónde sale. Cambiar de cartera aquí repinta: los saldos, el permiso y
        // la simulación son de esa cuenta y no valen para otra.
        const tipoOrigen = haciaEvm ? 'kda' : 'evm';
        const eligeOrigen = selectorCartera(
            ctx.cuentas, tipoOrigen, t('Desde'),
            () => pintarPuente(raiz, ctx));
        cuentaOrigen = eligeOrigen.cuenta;
        cabOrigen.append(eligeOrigen.caja);

        if (!cuentaOrigen) {
            cabOrigen.append(elemento('p', t('No hay ninguna cartera con cuenta de Ethereum.'), 'nota'));
            accion.disabled = true;
            return;
        }
        accion.disabled = false;

        // A dónde va: otra de tus carteras, o una dirección de fuera.
        const tipoDestino = haciaEvm ? 'evm' : 'kda';
        const comoEmpieza = haciaEvm ? '0x…' : 'k:…';
        elegirDestino = selectorDestino(
            ctx.cuentas, tipoDestino, t('A'), comoEmpieza,
            () => pintaCustodio());
        cabDestino.append(elegirDestino.caja);

        pintaCustodio();
        cargaEstado();
    }

    /**
     * Hacia Kadena, el destinatario NO es la cuenta: es su CUSTODIO, un texto con
     * el keyset que hay que mandar tal cual. Se genera aquí a partir de la cuenta
     * elegida -nunca se teclea- porque un carácter de más y el dinero se queda
     * bloqueado en Ethereum para siempre.
     */
    function pintaCustodio() {
        aQuien.textContent = '';
        if (sentido === 'salida' || !elegirDestino) return;
        const cuenta = elegirDestino.valor();
        if (!cuenta) return;
        let custodio;
        try {
            custodio = custodioDe(cuenta);
        } catch (e) {
            aQuien.append(elemento('p', t(String(e.message || e)), 'malo'));
            return;
        }
        // El texto del destinatario NO se pinta: es un keyset en JSON de dos
        // líneas que nadie tiene que leer, porque lo genera la app a partir de la
        // cartera elegida. Lo único que hace falta es podérselo llevar, y para eso
        // está el botón. Copiar aquí SÍ: es público -tu propia cuenta, la que
        // cualquiera lee en el explorador- y teclearlo a mano en un móvil es justo
        // la forma de equivocarse en el carácter que cuesta el dinero entero.
        const copiar = boton(t('Copiar el destinatario'), async () => {
            let bien = false;
            try { await navigator.clipboard.writeText(custodio.json); bien = true; } catch (_) { bien = false; }
            copiar.textContent = bien ? t('✓ Copiado') : t('No se pudo copiar: mantén pulsado el texto');
            setTimeout(() => { copiar.textContent = t('Copiar el destinatario'); }, 2500);
        }, 'secundario');
        aQuien.append(copiar);
    }

    async function cargaEstado() {
        origen.saldo.textContent = '…';
        try {
            if (sentido === 'salida') {
                const lista = await saldosKb(cuentaOrigen.cuenta, ctx.red);
                const r = lista.find((x) => x.simbolo === RUTA.simbolo);
                origen.disponible = r ? r.saldo : null;
                origen.saldo.textContent = origen.disponible === null
                    ? t('no se pudo preguntar')
                    : t('Tienes {0}', numero(origen.disponible, RUTA.decimales));
            } else {
                const e = await estadoEvm(cuentaOrigen.cuenta);
                origen.disponible = e.saldo;
                origen.saldo.textContent = t('Tienes {0}', numero(e.saldo, RUTA.decimales));
                datos.append(fila(t('Permiso dado al puente'), numero(e.permiso, RUTA.decimales)));
                datos.append(fila(t('Peaje en Ethereum'), e.peajeEth ? numero(e.peajeEth, 6) + ' ETH' : t('ninguno')));
            }
        } catch (e) {
            origen.saldo.textContent = t('no se pudo preguntar');
            datos.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
    }

    /**
     * Deja quieta la pantalla mientras hay algo en marcha.
     *
     * No es cosmética. Cambiar de cartera, girar el sentido o tocar la cantidad
     * mientras se está firmando repinta todo por debajo, y lo que se envía ya no
     * es lo que se simuló. Con el botón de MÁX es aún más tonto: se toca sin
     * querer al ir a mirar los pasos. Como el puente no tiene vuelta atrás, lo
     * que aquí no se puede pulsar no se puede estropear.
     */
    function congelar(si) {
        [cabOrigen, cabDestino, aQuien, origen.caja, destino.caja, vuelta].forEach((z) => {
            z.querySelectorAll('button, input, select, textarea').forEach((el) => { el.disabled = si; });
        });
        // El de simular no se desactiva: DESAPARECE. Un botón gris sigue pareciendo
        // el sitio donde hay que pulsar, y lo que se quiere es que la vista se vaya
        // a los pasos, que es lo único que está pasando.
        accion.hidden = si;
    }

    /**
     * Lo que llega al otro lado. En un puente es LO MISMO que sale: no hay
     * mercado ni comisión sobre el token; el peaje se paga aparte -en KDA saliendo,
     * en ETH volviendo- y por eso no se descuenta de esta cifra.
     */
    function loQueLlega() {
        destino.entrada.value = origen.entrada.value;
        salida.textContent = '';
    }

    /**
     * Contraseña o huella, la que se ponga. Se pide antes de tocar la cadena, y
     * después viene la comprobación y la firma sin parar por el camino.
     */
    function pedirFirma() {
        salida.textContent = '';
        if (!(Number(origen.entrada.value) > 0)) {
            salida.append(elemento('p', t('Pon cuánto quieres enviar.'), 'malo'));
            return;
        }
        if (elegirDestino && !elegirDestino.valor()) {
            salida.append(elemento('p', t('Falta la cuenta de destino.'), 'malo'));
            return;
        }
        accion.disabled = true;

        const aviso = elemento('p', t('Esto SÍ mueve el dinero. El puente no tiene vuelta atrás: si algo va mal, no hay quien lo devuelva.'), 'malo');
        salida.append(aviso);
        // Volviendo de Ethereum, el contrato acepta CUALQUIER destinatario sin
        // quejarse: quien lo valida es Kadena al entregar, y para entonces el
        // dinero ya ha salido. Así que el aviso va antes de firmar, no después.
        if (sentido === 'entrada') {
            salida.append(elemento('p', t('La simulación no comprueba el destinatario.'), 'nota'));
        }
        const cClave = elemento('div', null, 'campo');
        const l = document.createElement('label');
        l.setAttribute('for', 'pnt-clave');
        l.textContent = t('Contraseña de la cartera');
        const i = document.createElement('input');
        i.type = 'password';
        i.id = 'pnt-clave';
        i.autocomplete = 'off';
        cClave.append(l, i);

        const b = document.createElement('button');
        b.className = 'peligro';
        b.textContent = t('Firmar con la contraseña');
        b.addEventListener('click', () => viajar({ contrasena: i.value }));
        salida.append(cClave, b);

        boveda.bioEstado().then((e) => {
            if (!e || !e.activada) return;
            const h = document.createElement('button');
            h.className = 'secundario';
            h.textContent = t('Firmar con {0}', nombreBio(b));
            h.addEventListener('click', () => viajar({ huella: true }));
            salida.append(h);
        }).catch(() => { /* si no se puede preguntar, queda la contraseña */ });
    }

    /**
     * Comprobar y, si sale bien, firmar del tirón. La comprobación no es un lujo:
     * es lo que trae el peaje y la cuenta a la que se paga, y lo único que puede
     * decir que NO antes de que el dinero salga.
     */
    async function viajar(comoFirmar) {
        salida.textContent = '';
        congelar(true);
        salida.append(elemento('p', t('Comprobando que saldría bien…'), 'nota'));
        const aDonde = elegirDestino ? elegirDestino.valor() : '';
        // Si se llega a firmar, la pantalla se queda congelada a propósito: lo que
        // manda entonces es la escalera de pasos, no los controles.
        let sigue = false;
        try {
            if (sentido === 'salida') {
                const r = await simularHaciaEvm({
                    cuenta: cuentaOrigen.cuenta, red: ctx.red, simbolo: RUTA.simbolo,
                    cantidad: origen.entrada.value,
                    destino: aDonde,
                });
                if (!r.bien) {
                    salida.textContent = '';
                    salida.append(elemento('p', t('Así no saldría: ') + enLlano(r.motivo), 'malo'));
                    salida.append(plegado(r.motivo));
                    return;
                }
                salida.textContent = '';
                sigue = true;
                ofrecerEnvio({
                    destino: aDonde,
                    cantidad: Number(origen.entrada.value),
                    peaje: r.peaje,
                    cuentaPeaje: r.cuentaPeaje,
                    comoFirmar,
                });
            } else {
                const r = await simularHaciaKadena({
                    direccionEvm: cuentaOrigen.cuenta, cuentaKda: aDonde,
                    cantidad: origen.entrada.value,
                });
                if (!r.saldoSuficiente) {
                    salida.textContent = '';
                    salida.append(elemento('p', t('No tienes tanto USDC en Ethereum.'), 'malo'));
                    return;
                }
                // Sin permiso dado el contrato revierte SIEMPRE: eso no es un fallo,
                // es el primer paso del viaje, y por eso no frena aquí.
                if (!r.faltaPermiso && !r.bien) {
                    salida.textContent = '';
                    salida.append(elemento('p', t('Así no saldría: ') + enLlano(r.motivo), 'malo'));
                    salida.append(plegado(r.motivo));
                    return;
                }
                salida.textContent = '';
                sigue = true;
                ofrecerEnvioDesdeEvm({
                    cuentaKda: aDonde,
                    cantidad: origen.entrada.value,
                    faltaPermiso: r.faltaPermiso,
                    comoFirmar,
                });
            }
        } catch (e) {
            salida.textContent = '';
            salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        } finally {
            if (!sigue) congelar(false);
            accion.disabled = false;
        }
    }

    /**
     * El viaje de vuelta: Ethereum → Kadena, firmado aquí desde la 0.50.0.
     *
     * Son DOS transacciones de Ethereum, no una, y por eso hay dos pasos de firma:
     *
     *   1. AUTORIZAR. Un ERC-20 no deja que un contrato mueva tu dinero si no se lo
     *      has permitido antes. Se autoriza la cantidad JUSTA —no el infinito que
     *      reparte medio Ethereum—, así que cambiar la cantidad obliga a autorizar
     *      otra vez. Es a propósito: con permiso infinito, un fallo en el contrato
     *      del puente se llevaría todo el USDC de la cuenta.
     *   2. ENVIAR. Ya con el permiso dado, el `transferRemote` de verdad.
     *
     * Las dos las firma el plugin. De aquí salen la cantidad, la cuenta de destino
     * y los números que dice la red (nonce y gas); el contrato al que se llama, la
     * función y el custodio los pone Kotlin.
     */
    function ofrecerEnvioDesdeEvm({ cuentaKda, cantidad, faltaPermiso, comoFirmar }) {
        mandar(comoFirmar);

        async function mandar(comoFirmar) {
            salida.textContent = '';

            // Cuando falta permiso el viaje son dos transacciones, y así se cuenta:
            // ver cuatro pasos en vez de dos ahorra la pregunta de «por qué me pide
            // firmar otra vez si ya he firmado».
            const escalera = faltaPermiso
                ? [
                    t('Autorizar el token en Ethereum'),
                    { que: t('Esperar a que entre en un bloque'), tarda: true },
                    t('Firmar el envío'),
                    { que: t('Esperar a que entre en un bloque'), tarda: true },
                ]
                : [
                    t('Firmar el envío'),
                    { que: t('Esperar a que entre en un bloque'), tarda: true },
                ];
            const p = arrancar({ donde: 'puente', pasos: escalera });

            try {
                const comun = { ...comoFirmar, carteraId: cuentaOrigen.carteraId, cantidad: String(cantidad) };
                let paso = 0;

                if (faltaPermiso) {
                    // El gas de un `approve` es de sobra conocido: no se estima,
                    // porque estimar aquí no aporta nada y sí puede fallar.
                    const sobre = await sobreEvm(cuentaOrigen.cuenta, { gasLimit: 80000 });
                    const { raw } = await boveda.firmarPermisoEvm({ ...comun, ...sobre });
                    const hash = await mandarRaw(raw);
                    p.linea({
                        tipo: 'copiable',
                        que: t('Transacción del permiso'),
                        valor: hash,
                        nota: t('Con ella se mira luego en qué quedó, aquí o en el explorador.'),
                    });
                    p.paso(++paso);

                    const rec = await esperarReciboEvm(hash, { alMirar: parteDelNodo(p) });
                    if (!rec) {
                        p.falla();
                        p.linea({ tipo: 'texto', texto: t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), clase: 'malo' });
                        return;
                    }
                    if (!rec.bien) {
                        p.falla();
                        p.linea({ tipo: 'texto', texto: t('La autorización entró en un bloque pero falló. No se ha enviado nada.'), clase: 'malo' });
                        return;
                    }
                    p.paso(++paso);
                }

                // El peaje lo dice el contrato, y el plugin le pone tope antes de
                // firmarlo: si el nodo contestara un disparate, no se firma.
                const peaje = await peajeWei();
                const sobre = await sobreEvm(cuentaOrigen.cuenta, { gasLimit: 400000 });
                const { raw } = await boveda.firmarPuenteHaciaKadena({
                    ...comun, cuentaKda, peajeWei: peaje, ...sobre,
                });
                const hash = await mandarRaw(raw);

                apuntar({ rk: hash, cantidad, simbolo: RUTA.simbolo, destino: cuentaKda, red: 'ethereum' });
                p.linea({
                    tipo: 'copiable',
                    que: t('Transacción en Ethereum'),
                    valor: hash,
                    nota: t('Con ella se mira luego en qué quedó, aquí o en el explorador.'),
                });
                p.paso(++paso);

                const rec = await esperarReciboEvm(hash, { alMirar: parteDelNodo(p) });
                if (!rec) {
                    apuntarCambio(hash, { estado: 'sin-saber' });
                    p.falla();
                    p.linea({ tipo: 'texto', texto: t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), clase: 'malo' });
                    return;
                }
                if (!rec.bien) {
                    apuntarCambio(hash, { estado: 'fallo' });
                    p.falla();
                    p.linea({ tipo: 'texto', texto: t('La transacción entró en un bloque pero falló. El gas se ha pagado igual.'), clase: 'malo' });
                    return;
                }
                apuntarCambio(hash, { estado: 'en-bloque' });
                p.acaba();
                p.linea({ tipo: 'texto', texto: t('✓ Salió de Ethereum. Ahora lo tiene que entregar el relayer en Kadena, y eso tarda.') });
                p.linea({ tipo: 'texto', texto: t('Cuando llegue, aparecerá como kb-{0} en la chain 2 de esa cuenta.', RUTA.simbolo), clase: 'nota' });
            } catch (e) {
                p.falla();
                p.linea({ tipo: 'texto', texto: t(String(e.message || e)), clase: 'malo' });
            }
        }
    }

    /**
     * El paso de verdad: firmar y mandar, de Kadena hacia Ethereum. La contraseña
     * (o la huella) ya viene puesta desde `pedirFirma`.
     */
    function ofrecerEnvio({ destino, cantidad, peaje, cuentaPeaje, comoFirmar }) {
        mandar(comoFirmar);

        async function mandar(comoFirmar) {
            // Lo primero, vaciar: con esto se van la contraseña, el botón de firmar
            // y el de la huella, así que no hay forma de pulsar dos veces mientras
            // el primer envío está en el aire.
            salida.textContent = '';

            // El seguimiento NO vive en esta pantalla, vive en `enmarcha.js`: así
            // sale uno a mirar el saldo, vuelve, y el envío sigue contado desde
            // donde iba. Aquí solo se cuenta lo que va pasando; pintarlo es cosa de
            // `pintarEnMarcha`, que puede no estar delante.
            const p = arrancar({
                donde: 'puente',
                pasos: [
                    t('Firmar en el móvil'),
                    t('Mandar la transacción a Kadena'),
                    { que: t('Esperar a que entre en un bloque'), tarda: true },
                ],
            });
            p.linea({
                tipo: 'texto',
                texto: t('Peaje del puente: {0} KDA', numero(peaje, 2)),
                clase: 'nota',
            });
            try {
                // A Kotlin le llegan numeros y una direccion. El namespace, el
                // modulo, el dominio y la chain los pone el plugin desde su propio
                // codigo, y el destinatario de 32 bytes lo calcula alli: aqui no se
                // arma nada que decida donde va el dinero.
                const firmado = await boveda.firmarPuenteEvm({
                    ...comoFirmar,
                    carteraId: cuentaOrigen.carteraId,
                    networkId: ctx.red.networkId,
                    destinoEth: destino,
                    cantidad,
                    peaje,
                    cuentaPeaje,
                });
                p.paso(1);
                const rk = await enviarComando(ctx.red.nodo, ctx.red.networkId, '2', firmado);

                // La referencia se pinta EN CUANTO el nodo la acepta, no al final.
                // A partir de aquí el dinero ya se ha movido: si el móvil se apaga
                // ahora mismo, con esa referencia se recupera lo que pasó. Dejarla
                // para el final sería dejarla justo para cuando ya no hace falta.
                // Esta es LA que se pega en el comprobador de abajo -el que dice si
                // ya ha llegado a Ethereum-, y por eso lleva botón de copiar y dice
                // para qué vale. El identificador del mensaje, que se saca luego, se
                // le parece mucho y NO sirve ahí: es para el explorador del puente.
                // Al historial en cuanto existe, no al final: si se apuntara al
                // terminar, el caso que importa -que la app se cierre a mitad- sería
                // justo el que no queda escrito.
                apuntar({ rk, cantidad, simbolo: 'kb-' + RUTA.simbolo, destino, red: ctx.red.networkId });
                p.linea({
                    tipo: 'copiable',
                    que: t('Referencia de la transacción'),
                    valor: rk,
                    nota: t('Esta es la que se pega abajo, en «¿Llegó mi envío a Ethereum?».'),
                });
                p.paso(2);

                const r = await esperarResultado(ctx.red.nodo, ctx.red.networkId, '2', rk, { alMirar: parteDelNodo(p) });
                if (!r) {
                    apuntarCambio(rk, { estado: 'sin-saber' });
                    p.falla();
                    p.linea({ tipo: 'texto', texto: t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), clase: 'malo' });
                    return;
                }
                if (r.result && r.result.status === 'success') {
                    apuntarCambio(rk, { estado: 'en-bloque' });
                    p.acaba();
                    p.linea({ tipo: 'texto', texto: t('✓ Salió de Kadena. Ahora lo tiene que entregar el relayer en Ethereum, y eso tarda.') });
                    // El identificador del mensaje es lo que permite preguntar si ya
                    // llego a la otra orilla. Sin el, el envio se pierde de vista.
                    // Si no se puede sacar, el envio NO se deshace: se dice y se deja
                    // la referencia, que es con lo que se recupera luego.
                    try {
                        const id = await idMensajeDe(rk, ctx.red);
                        apuntarCambio(rk, { id });
                        p.linea({
                            tipo: 'copiable',
                            plegado: t('Identificador del mensaje (para el explorador)'),
                            que: t('Identificador del mensaje'),
                            valor: id,
                            nota: t('Para seguirlo en el explorador del puente. Para el comprobador de abajo se usa la referencia.'),
                        });
                    } catch (_) {
                        p.linea({ tipo: 'texto', texto: t('No se pudo sacar el identificador del mensaje; guarda la referencia de arriba.'), clase: 'nota' });
                    }
                    return;
                }
                apuntarCambio(rk, { estado: 'fallo' });
                p.falla();
                const motivo = (r.result && r.result.error && r.result.error.message) || t('el contrato lo rechazó');
                p.linea({ tipo: 'texto', texto: t('La transacción entró en un bloque pero falló: {0}', motivo), clase: 'malo' });
            } catch (e) {
                // Los pasos NO se borran cuando algo falla: ahí está en cuál se
                // torció, que es lo primero que hay que saber. Fallar antes de
                // mandar la transacción no es lo mismo que fallar después, porque
                // en el segundo caso el dinero ya ha salido.
                p.falla();
                p.linea({ tipo: 'texto', texto: t(String(e.message || e)), clase: 'malo' });
            }
        }
    }

    /**
     * Pinta lo que hay en marcha -o lo último que hubo, si aún no se ha cerrado-.
     *
     * Se llama al entrar en la pantalla y cada vez que la operación avanza.
     *
     * OJO con mirar aquí si la pantalla sigue en el documento, que es lo que hacía
     * la 0.50.0 y por eso no funcionaba NADA de esto: cuando se construye la
     * pantalla, este trozo todavía no está colgado del documento -se cuelga después,
     * cuando el llamador hace `append`-, así que la primera llamada creía que la
     * pantalla ya se había ido y se daba de baja de los avisos para siempre. La
     * comprobación va en el oyente, que es donde de verdad puede haberse ido.
     */
    function pintarEnMarcha(op) {
        if (!op) return;

        salida.textContent = '';
        salida.append(elemento('h3', op.fin ? t('El último envío') : t('Envío en marcha')));

        const esc = pasos(op.pasos);
        salida.append(esc.caja);
        esc.empieza(op.i, op.desdePaso);
        if (op.fin) {
            if (op.fin.bien) esc.acaba(); else esc.falla();
        } else if (op.parte) {
            esc.cuenta(op.parte);
        }

        op.lineas.forEach((l) => {
            if (l.tipo === 'copiable') {
                const cop = lineaCopiable(l.que, l.valor, l.nota);
                if (!l.plegado) { salida.append(cop); return; }
                // Lo secundario, plegado: el identificador del mensaje se parece
                // tanto a la referencia que enseñados a la vez se confunden.
                const det = document.createElement('details');
                const sum = document.createElement('summary');
                sum.textContent = l.plegado;
                det.append(sum, cop);
                salida.append(det);
                return;
            }
            salida.append(elemento('p', l.texto, l.clase || null));
        });

        // Mientras hay dinero en el aire no se puede empezar otro envío: es la
        // misma razón de siempre, que el puente no tiene vuelta atrás.
        congelar(!op.fin);

        if (op.fin) {
            salida.append(boton(t('Cerrar'), () => {
                olvidar();
                pintarPuente(raiz, ctx);
            }, 'secundario'));
        }
    }

    // El aviso llega mientras esta pantalla siga puesta. Si ya no lo está -se
    // cambió de sección, o se repintó el puente entero-, esta copia se da de baja
    // y deja el sitio a la nueva.
    const dejaDeEscuchar = alCambiar((op) => {
        if (!salida.isConnected) { dejaDeEscuchar(); return; }
        pintarEnMarcha(op);
    });

    origen.maximo.addEventListener('click', () => {
        if (origen.disponible === null || !(origen.disponible > 0)) return;
        origen.entrada.value = String(origen.disponible);
        loQueLlega();
    });

    origen.entrada.addEventListener('input', loQueLlega);

    bVuelta.addEventListener('click', () => {
        sentido = sentido === 'salida' ? 'entrada' : 'salida';
        pinta();
    });

    c.append(cabOrigen, origen.caja, vuelta, cabDestino, destino.caja, aQuien, datos, accion, salida);
    // Desde 0.47.0 el sentido Kadena → Ethereum SÍ se firma aquí. El contrario
    // todavía no: mandar desde Ethereum es firmar una transacción de Ethereum, que
    // es otra criptografía y no está hecha en el plugin. Se dice solo cuando toca.
    notaFirma = elemento('p', '', 'nota');
    c.append(notaFirma);
    pinta();
    // Y si se salió de la pantalla con un envío a medias, aquí está otra vez, con
    // su reloj contando desde donde iba.
    pintarEnMarcha(enMarcha('puente'));
    return c;
}

/** Un lado del viaje: la orilla, el token y -solo en el de salida- la cantidad. */
function orilla(etiqueta, conCantidad) {
    const c = elemento('div', null, 'lado');

    const cab = elemento('div', null, 'lado-cab');
    const saldo = elemento('span', '', 'lado-saldo');
    cab.append(elemento('span', etiqueta, 'lado-que'), saldo);

    const linea = elemento('div', null, 'lado-linea');
    const entrada = document.createElement('input');
    entrada.className = 'cantidad';
    // El lado de destino NO se escribe: se rellena solo con lo que va a llegar.
    // Antonio lo pidió así, como en el Mercado, y tiene sentido: en un puente la
    // cantidad que llega no la elige uno.
    entrada.type = conCantidad ? 'number' : 'text';
    entrada.step = 'any';
    entrada.inputMode = 'decimal';
    entrada.placeholder = '0';
    if (!conCantidad) entrada.readOnly = true;

    const maximo = document.createElement('button');
    maximo.type = 'button';
    maximo.className = 'max';
    maximo.textContent = t('MÁX');
    if (!conCantidad) maximo.style.visibility = 'hidden';

    // La pastilla del lado de destino lleva el nombre de la cadena: es la forma de
    // que se lea "hacia Ethereum · USDC".
    const pastilla = elemento('span', null, 'pastilla-fija');
    const red = elemento('b', '', 'orilla-red');
    const token = elemento('span', '', 'orilla-token');
    pastilla.append(red, token);

    linea.append(entrada, maximo, pastilla);
    c.append(cab, linea);
    return { caja: c, entrada, maximo, saldo, red, token, disponible: null };
}

function plegado(motivo) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Lo que contestó el nodo');
    det.append(sum, elemento('div', motivo || '', 'diag'));
    return det;
}

/**
 * Traduce a persona los motivos con los que las dos orillas tumban esto casi
 * siempre.
 *
 * No es maquillaje: «No value found in table coin_coin-table» quiere decir «no
 * tienes KDA en la chain 2», y sin esa frase nadie sabe qué hacer con el error.
 * Lo que no se reconoce se dice tal cual, sin inventar.
 */
function enLlano(motivo) {
    const m = String(motivo || '');
    if (/Failed to buy gas|coin_coin-table/i.test(m)) {
        return t('esta cuenta no tiene KDA en la chain 2, que es de donde sale el gas y el peaje del puente.');
    }
    if (/row not found|No value found in table/i.test(m)) {
        return t('esta cuenta no tiene ese token puenteado en la chain 2.');
    }
    if (/exceeds allowance|insufficient allowance/i.test(m)) {
        return t('el puente todavía no tiene permiso para coger tu USDC.');
    }
    // Ojo con el orden: este va ANTES del «no hay saldo» general. Cuando el fallo
    // es de `coin`, lo que falta son KDA -el gas y el peaje-, y NO el token que se
    // manda. Decir «no hay saldo suficiente» a quien tiene los 22 kb-USDC delante
    // le manda a buscar donde no es.
    if (/Insufficient funds/i.test(m) && /coin\.debit|coin\.transfer/i.test(m)) {
        return t('te faltan KDA en la chain 2. El peaje del puente se paga en KDA, así que tener el token no basta.');
    }
    if (/Insufficient funds|transfer amount exceeds balance|balance/i.test(m)) {
        return t('no hay saldo suficiente para esa cantidad.');
    }
    if (/Keyset failure|not granted/i.test(m)) {
        return t('el permiso que se firmaría no cubre esta operación; esto es un fallo nuestro, avisa.');
    }
    return t('el nodo lo rechazó.');
}

// --- ¿Llegó? ----------------------------------------------------------------

// --- Historial ---------------------------------------------------------------

/**
 * ¿Este apunte salió de Ethereum hacia Kadena? Los de vuelta se guardaron con
 * `red: 'ethereum'`; los de ida, con el networkId de Kadena.
 */
const desdeEthereum = (e) => e.red === 'ethereum';

/**
 * Cómo se lee cada estado, en persona. Y en el sentido que toca: un apunte de
 * vuelta no «salió de Kadena», salió de Ethereum, y decirlo al revés hace dudar
 * de un envío que está bien.
 */
function comoVa(e) {
    const deEth = desdeEthereum(e);
    if (e.estado === 'entregado') {
        return { txt: deEth ? t('Entregado en Kadena') : t('Entregado en Ethereum'), clase: 'bueno-fuerte' };
    }
    if (e.estado === 'en-bloque') {
        return { txt: deEth ? t('Salió de Ethereum') : t('Salió de Kadena'), clase: null };
    }
    if (e.estado === 'fallo') return { txt: t('Lo rechazó el contrato'), clase: 'malo' };
    if (e.estado === 'sin-saber') return { txt: t('Sin confirmar'), clase: 'malo' };
    return { txt: t('Mandado al nodo'), clase: 'nota' };
}

/**
 * La lista de lo que se ha mandado por el puente.
 *
 * Cada fila se puede comprobar en el momento: lo que dice la lista es lo que se
 * sabía cuando se mandó, y entre medias el relayer ha podido entregarlo. Que el
 * botón esté en cada fila, y no solo en el bloque de abajo, ahorra el paso de
 * copiar la referencia y pegarla dos centímetros más abajo.
 */
function hojaHistorial(ctx) {
    const fondo = elemento('div', null, 'hoja-fondo');
    const hoja = elemento('div', null, 'hoja');
    hoja.append(elemento('h3', t('Envíos por el puente')));

    const lista = historial();
    if (!lista.length) {
        hoja.append(elemento('p', t('Todavía no has mandado nada por el puente desde este aparato.'), 'nota'));
    } else {
        // Se dice de dónde sale la lista: está guardada en el móvil, no en la cadena.
        // Quien cambie de aparato no se la encuentra, y es mejor saberlo aquí que
        // deducirlo el día que le falte.
        hoja.append(elemento('p', t('Guardado en este aparato. En otro móvil no aparece.'), 'nota'));
    }

    lista.forEach((e) => {
        const f = elemento('div', null, 'envio');
        const arriba = elemento('div', null, 'fila');
        arriba.append(
            elemento('span', recorta(e.cantidad, 6) + ' ' + (e.simbolo || ''), 'izq'),
            elemento('span', new Date(e.cuando).toLocaleString(locale()), 'der'),
        );
        f.append(arriba);

        const est = comoVa(e);
        f.append(elemento('p', est.txt, est.clase));
        if (e.destino) f.append(elemento('div', t('Hacia {0}', e.destino), 'dir'));
        f.append(lineaCopiable(
            desdeEthereum(e) ? t('Transacción en Ethereum') : t('Referencia de la transacción'),
            e.rk));

        // El comprobador es SOLO del viaje Kadena -> Ethereum: pregunta por el
        // mensaje del puente usando la referencia de Kadena. En un apunte de vuelta
        // lo que hay guardado es el hash de Ethereum, y al pulsar contestaba que el
        // identificador no tiene buena pinta -un probador se lo encontro el
        // 17/09/2026-. Y en uno ya entregado no queda nada que preguntar.
        if (desdeEthereum(e)) {
            f.append(elemento('p', t('Esto vino de Ethereum. Cuando el relayer lo entregue, aparece en la chain 2 de esa cuenta de Kadena: aquí no hay nada que comprobar.'), 'nota'));
            hoja.append(f);
            return;
        }
        if (e.estado === 'entregado') {
            hoja.append(f);
            return;
        }

        const dice = elemento('p', '', 'nota');
        f.append(dice, boton(t('Comprobar si ya llegó'), async (ev) => {
            const b = ev.currentTarget;
            b.disabled = true;
            dice.className = 'nota';
            dice.textContent = t('Preguntando…');
            try {
                const id = e.id || await idMensajeDe(e.rk, ctx.red);
                if (!e.id) apuntarCambio(e.rk, { id });
                const { entregado, nodo } = await entregadoEnEvm(id);
                if (entregado) apuntarCambio(e.rk, { estado: 'entregado' });
                dice.className = entregado ? null : 'nota';
                dice.textContent = entregado
                    ? t('Entregado en Ethereum. Lo dice {0}.', nodo)
                    : t('Todavía no está entregado. Si acabas de enviarlo es normal; si lleva horas, avisa.');
            } catch (err) {
                dice.className = 'malo';
                dice.textContent = t(String(err.message || err));
            } finally {
                b.disabled = false;
            }
        }, 'secundario'));

        hoja.append(f);
    });

    if (lista.length) {
        // Borrar el historial NO borra nada de la cadena, y hay que decirlo: si no,
        // alguien puede creer que está cancelando un envío.
        hoja.append(elemento('p', t('Borrar esta lista no deshace ningún envío: lo que pasó en la cadena se queda.'), 'nota'));
        hoja.append(boton(t('Borrar el historial'), () => {
            olvidarHistorial();
            fondo.remove();
            hojaHistorial(ctx);
        }, 'secundario'));
    }

    hoja.append(boton(t('Cerrar'), () => fondo.remove(), 'secundario'));
    fondo.append(hoja);
    fondo.addEventListener('click', (ev) => { if (ev.target === fondo) fondo.remove(); });
    document.body.append(fondo);
}

function bloqueEntrega(red) {
    const c = caja();
    // Plegado de fábrica, como «Cómo funciona un puente». Lo pidió Antonio y tiene
    // razón: esto se usa DESPUÉS, cuando se viene a mirar un envío de hace un rato,
    // y desplegado se comía media pantalla justo debajo del botón de firmar. Lo que
    // manda en esta pantalla es el puente.
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('¿Llegó mi envío a Ethereum?');
    det.append(sum);
    c.append(det);
    det.append(elemento('p', t('Pega la referencia del envío. Tarda entre 2 y 10 minutos.'), 'nota'));

    const campo = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', 'pu-rk');
    l.textContent = t('Referencia de la transacción');
    const i = document.createElement('input');
    i.id = 'pu-rk';
    i.spellcheck = false;
    i.autocapitalize = 'off';
    i.placeholder = 'J5q6cJScCi4S…';
    campo.append(l, i);

    const salida = elemento('div');
    const b = boton(t('Comprobar'), async () => {
        salida.innerHTML = '';
        b.disabled = true;
        salida.append(elemento('p', t('Preguntando…'), 'nota'));
        try {
            const id = await idMensajeDe(i.value, red);
            const { entregado, nodo } = await entregadoEnEvm(id);
            salida.innerHTML = '';
            salida.append(lineaCopiable(t('Identificador del mensaje'), id));
            salida.append(elemento('p',
                entregado
                    ? t('Entregado en Ethereum.')
                    : t('Todavía no está entregado. Si acabas de enviarlo es normal; si lleva horas, avisa.'),
                entregado ? 'nota' : 'malo'));
            salida.append(elemento('p', t('Respondió {0}', nodo), 'nota'));
        } catch (e) {
            salida.innerHTML = '';
            salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        } finally {
            b.disabled = false;
        }
    });

    det.append(campo, b, salida);
    return c;
}

// --- Como funciona, en llano -------------------------------------------------

function bloqueComoVa() {
    const c = caja();
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Cómo funciona un puente, en llano');
    det.append(sum);
    // Las frases van ya traducidas dentro de la lista, no con t(variable): asi la
    // prueba que vigila las traducciones las ve, y no hay forma de añadir una
    // cuarta frase y que se cuele sin version inglesa.
    [
        t('Un puente no manda monedas de una cadena a otra: eso no existe. Lo que hace es guardar las tuyas en un lado y crear un vale por la misma cantidad en el otro.'),
        t('Cuando traes USDC a Kadena, tu USDC de verdad se queda bloqueado en un contrato de Ethereum y en Kadena aparece kb-USDC. Al volver, se destruye el kb-USDC y se suelta el original.'),
        t('Por eso el kb- vale lo que valga la promesa de que ese contrato devolverá el original. Quien controle ese contrato controla tu dinero, y aquí lo controla una sola llave.'),
        t('Quien mueve los mensajes de una orilla a otra es un relayer, y se le paga en KDA al enviar: ese es el peaje.'),
    ].forEach((frase) => det.append(elemento('p', frase, 'nota')));
    c.append(det);
    return c;
}
