// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SECCION MERCADO.
//
// El cambiador y nada mas: dos lados -lo que doy y lo que recibo- con el boton de
// darle la vuelta en medio.
//
// Aqui NO hay precios en euros ni en dolares, a proposito. Lo que importa al
// cambiar es cuanto sale por cuanto entra, el fondo del par y cuanto mueve el
// precio tu propio cambio; una cifra en euros al lado solo distrae y encima
// depende de un servicio de fuera que puede no contestar.
//
// El mercado se lee de la cadena cada vez, se cotiza el cambio y se le pregunta al
// nodo si saldria bien. Y solo DESPUES de esa pregunta se ofrece firmar: simular es
// gratis, y lo otro no se deshace.
//
// Desde 0.51.2 esta pantalla tiene dos mercados con pestañas -el de Kadena y el de
// Ethereum-, y se enseña uno cada vez. Quien llega desde la tarjeta de una cartera
// entra por el suyo (`mercado-red.js`).

import {
    mercado, cotizar, simularCambio, saldoEnMercado, IMPACTO_MAX,
    valorEnUsdc, MIN_GRATIS_USDC,
} from './lib/dex.js';
import { selectorCartera } from './cartera-activa.js';
import { redMercado, fijarRedMercado } from './mercado-red.js';
import { lado } from './lado-cambio.js';
import { t } from './idioma.js';
import { nombreBio } from './biometria.js';
import { recorta } from './cifras.js';
import { boveda } from './boveda/contrato.js';
import { enviarComando, esperarResultado } from './lib/kda.js';
import { pasos, parteDelNodo } from './pasos.js';
import { lineaCopiable } from './copiable.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function fila(izquierda, derecha) {
    const f = elemento('div', null, 'fila');
    f.append(elemento('span', izquierda, 'izq'), elemento('span', derecha, 'der'));
    return f;
}

function caja() { return elemento('div', null, 'caja'); }

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', alPulsar);
    return b;
}

// Cinco decimales como mucho en todo lo que se lee, y recortando (ver
// `cifras.js`). Los que piden menos -porcentajes- se respetan.
function numero(n, decimales = 5) {
    return recorta(n, Math.min(decimales, 5));
}

/**
 * @param raiz  donde pintar
 * @param ctx   { cuentas, red }
 */
export function pintarMercado(raiz, ctx) {
    raiz.innerHTML = '';

    // Son DOS mercados, no uno con dos secciones: otra cadena, otros pools y otra
    // firma. Se enseña el que se esté mirando y no los dos a la vez.
    const hayKda = (ctx.cuentas || []).some((cu) => cu.tipo === 'kda');
    const hayEvm = (ctx.cuentas || []).some((cu) => cu.tipo === 'evm');
    let red = redMercado();
    if (red === 'evm' && !hayEvm) red = 'kda';
    if (red === 'kda' && !hayKda) red = 'evm';

    // Las pestañas solo si de verdad hay donde elegir: con carteras de una sola
    // red, un selector de uno es un adorno que no elige nada.
    if (hayKda && hayEvm) {
        const pestanas = elemento('div', null, 'pestanas');
        [['kda', 'Kadena'], ['evm', 'Ethereum']].forEach(([v, nombre]) => {
            pestanas.append(boton(nombre, () => {
                fijarRedMercado(v);
                pintarMercado(raiz, ctx);
            }, 'pestana' + (v === red ? ' on' : '')));
        });
        raiz.append(pestanas);
    }

    if (red === 'evm') {
        import('./mercado-eth.js').then(({ bloqueMercadoEth }) => {
            raiz.append(bloqueMercadoEth(raiz, ctx, () => pintarMercado(raiz, ctx)));
        }).catch(() => {
            raiz.append(elemento('p', t('No se pudo abrir el mercado de Ethereum.'), 'malo'));
        });
        return;
    }
    if (hayKda) raiz.append(bloqueCambio(raiz, ctx));
}

// --- El cambiador -----------------------------------------------------------
//
// Dos lados y el boton de darle la vuelta en medio, que es como funciona cualquier
// cambiador. Lo que NO es como en los demas: aqui se enseña el fondo del pool y
// cuanto mueve el precio tu propio cambio, y por encima del 10 % de impacto no se
// deja seguir. En este mercado eso no es un lujo: la mayoria de los pares son
// charcos y un cambio normal los mueve una barbaridad.

function bloqueCambio(raiz, ctx) {
    const c = caja();
    c.append(elemento('h2', t('Cambiar')));

    // Con qué cuenta se cambia. Si hay varias carteras, se elige aquí; cambiarla
    // repinta la pantalla entera, porque los saldos y la simulación son de esa
    // cuenta y no valen para otra.
    const elige = selectorCartera(ctx.cuentas, 'kda', t('Cartera'), () => pintarMercado(raiz, ctx));
    c.append(elige.caja);

    const donde = elemento('div');
    donde.append(elemento('p', t('Leyendo el mercado…'), 'nota'));
    c.append(donde);

    const kda = elige.cuenta;

    mercado(ctx.red).then((m) => {
        donde.innerHTML = '';
        if (!m.tokens.length) {
            donde.append(elemento('p', t('Ahora mismo no hay ningún par con fondo suficiente en este mercado.'), 'nota'));
            return;
        }
        const lista = [m.kda, ...m.tokens];
        donde.append(cambiador(ctx, m, lista, kda));
    }).catch((e) => {
        donde.innerHTML = '';
        donde.append(elemento('p', t(String(e.message || e)), 'malo'));
    });

    // Aqui no hay "conectar cartera" como en una web de swap: la cartera ES la app.
    // Y tampoco hay un aviso fijo de que falta firmar: lo dice el resultado de la
    // comprobacion, que es cuando importa («Saldria bien. No se ha cambiado nada»).
    return c;
}

/**
 * Se cotiza solo mientras se teclea, con medio segundo de espera para no
 * preguntarle a la cadena en cada tecla. El lado de «recibo» no se escribe: lo
 * rellena la cotizacion, porque lo que sale de un AMM no lo elige uno.
 */
function cambiador(ctx, m, lista, kda) {
    const raiz = elemento('div');

    // De fábrica, KDA arriba y kb-USDC abajo: es el cambio que se hace el 90 % de
    // las veces en este mercado. Si algún día no hubiera par de kb-USDC, se cae al
    // primero con fondo en vez de dejar el lado vacío.
    const usdc = m.tokens.find((x) => x.simbolo === 'kb-USDC') || m.tokens[0];
    const doy = lado('mk-doy', t('Doy'), lista, 'coin', true);
    const recibo = lado('mk-recibo', t('Recibo'), lista, usdc.modulo, false);

    const vuelta = elemento('div', null, 'da-la-vuelta');
    const bVuelta = document.createElement('button');
    bVuelta.type = 'button';
    bVuelta.className = 'circulo-vuelta';
    bVuelta.textContent = '⇅';
    bVuelta.setAttribute('aria-label', t('Darle la vuelta'));
    vuelta.append(bVuelta);

    const datos = elemento('div');
    const salida = elemento('div');
    // La contraseña está puesta y el botón firma de una vez. Antes había que pulsar
    // «Comprobar» y luego «Firmar», y Antonio lo dijo claro: «me pide 2 veces firma».
    // La comprobación sigue haciéndose -es gratis y aquí un error no se devuelve-,
    // pero por dentro, después de la contraseña y antes de firmar.
    const zonaFirma = elemento('div');
    zonaFirma.hidden = true;
    const cClave = elemento('div', null, 'campo');
    const lClave = document.createElement('label');
    lClave.setAttribute('for', 'mk-clave');
    lClave.textContent = t('Contraseña de la cartera');
    const clave = document.createElement('input');
    clave.type = 'password';
    clave.id = 'mk-clave';
    clave.autocomplete = 'off';
    cClave.append(lClave, clave);
    const accion = boton(t('Firmar el cambio'), () => mandar({ contrasena: clave.value }), 'peligro');
    zonaFirma.append(cClave, accion);

    boveda.bioEstado().then((e) => {
        if (!e || !e.activada) return;
        zonaFirma.append(boton(t('Firmar con {0}', nombreBio(e)), () => mandar({ huella: true }), 'secundario'));
    }).catch(() => { /* si no se puede preguntar, queda la contraseña */ });

    let cotizacion = null;

    async function pintaSaldo(l) {
        if (!kda) { l.saldo.textContent = ''; return; }
        l.saldo.textContent = '…';
        const s = await saldoEnMercado(ctx.red, l.select.value, kda.cuenta);
        l.disponible = s;
        l.saldo.textContent = s === null ? t('no se sabe') : t('Tienes {0}', numero(s, 8));
    }

    let espera = null;
    const cotizarPronto = () => { clearTimeout(espera); espera = setTimeout(cotizarYa, 500); };

    async function cotizarYa() {
        datos.innerHTML = '';
        salida.innerHTML = '';
        cotizacion = null;
        recibo.entrada.value = '';
        zonaFirma.hidden = true;

        const n = Number(doy.entrada.value);
        if (!(n > 0)) return;
        if (doy.select.value === recibo.select.value) {
            datos.append(elemento('p', t('Son el mismo token.'), 'malo'));
            return;
        }
        datos.append(elemento('p', t('Cotizando…'), 'nota'));
        try {
            const q = await cotizar(ctx.red, m, doy.select.value, recibo.select.value, n);
            cotizacion = q;
            recibo.entrada.value = numero(q.esperada, 8);
            datos.innerHTML = '';
            datos.append(fila(t('Como mínimo recibes'), numero(q.minimo, 8) + ' ' + simbolo(lista, recibo.select.value)));

            // La comisión se enseña aquí y otra vez al confirmar: se ve antes de
            // firmar, con la cifra exacta y en el token que se entrega.
            datos.append(fila(
                t('Comisión de Koberlet ({0} %)', numero(q.comisionPct, 2)),
                numero(q.comision, 8) + ' ' + simbolo(lista, doy.select.value)));

            // El gas lo paga la gasolinera a partir de 5 kb-USDC. Se dice aquí, con
            // la cotización delante, porque es justo cuando alguien decide si le
            // compensa subir la cantidad.
            const enUsdc = valorEnUsdc({
                de: doy.select.value, a: recibo.select.value,
                cantidad, minimo: q.minimoStr,
            });
            if (q.comision > 0 && enUsdc >= MIN_GRATIS_USDC) {
                datos.append(fila(t('Comisión de red (gas)'), t('la paga Koberlet')));
            }

            const impacto = fila(t('Mueves el precio'), numero(q.impacto, 2) + ' %');
            // Por encima del 3 % ya se paga de más lo suficiente para que se vea.
            if (q.impacto > 3) impacto.querySelector('.der').style.color = 'var(--mal)';
            datos.append(impacto);

            if (q.camino.length > 2) {
                datos.append(elemento('p', t('Pasa por KDA: no hay par directo entre esos dos.'), 'nota'));
            }
            if (q.frenado) {
                datos.append(elemento('p',
                    t('Demasiado impacto: más del {0} %. Prueba con menos.', IMPACTO_MAX),
                    'malo'));
                return;
            }
            if (doy.disponible !== null && n > doy.disponible) {
                datos.append(elemento('p', t('No tienes tanto en la chain 2.'), 'malo'));
                return;
            }
            if (!kda) {
                datos.append(elemento('p', t('Esta cartera no tiene ninguna cuenta de Kadena.'), 'nota'));
                return;
            }
            // El aviso va ANTES de firmar, que es cuando sirve: lo de abajo ya no
            // es una consulta, es dinero moviéndose.
            datos.append(elemento('p', t('Esto SÍ cambia el dinero. Como mínimo recibirás {0}; si el pool diera menos, la transacción se cae y solo se pierde el gas.', q.minimoStr), 'nota'));
            datos.append(elemento('p', t('De lo que das se aparta antes el {0} % para Koberlet: {1} {2}. Va en la misma transacción, así que si el cambio falla no se cobra nada.',
                numero(q.comisionPct, 2), q.comisionStr, simbolo(lista, doy.select.value)), 'nota'));
            zonaFirma.hidden = false;
        } catch (e) {
            datos.innerHTML = '';
            datos.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
    }

    /**
     * Mientras se firma y se manda no se puede tocar nada más: ver el dinero
     * moverse pone nervioso, y un dedo nervioso es el que pulsa dos veces.
     */
    function congelar(si) {
        [doy.entrada, doy.select, recibo.select, bVuelta, doy.maximo].forEach((el) => {
            if (el) el.disabled = si;
        });
        zonaFirma.hidden = si;
    }

    /**
     * Comprobar y firmar, del tirón. La comprobación es el primer paso de la
     * escalera y no un botón aparte: no cuesta nada, no mueve nada, y es lo único
     * que puede decir que NO antes de que el dinero salga.
     */
    async function mandar(comoFirmar) {
            const q = cotizacion;
            const cantidad = doy.entrada.value;
            if (!q || !kda) return;
            salida.innerHTML = '';
            congelar(true);

            const p = pasos([
                t('Comprobar que saldría bien'),
                t('Firmar en el móvil'),
                t('Mandar la transacción al nodo'),
                { que: t('Esperar a que entre en un bloque'), tarda: true },
            ]);
            salida.append(p.caja);
            const detras = elemento('div');
            salida.append(detras);
            p.empieza(0);

            try {
                const sim = await simularCambio({
                    cuenta: kda.cuenta, red: ctx.red, m,
                    de: doy.select.value, a: recibo.select.value, cantidad,
                });
                if (!sim.bien) {
                    p.falla();
                    detras.append(elemento('p', t('Así no saldría: ') + enLlano(sim.motivo), 'malo'));
                    const det = document.createElement('details');
                    const sum = document.createElement('summary');
                    sum.textContent = t('Lo que contestó el nodo');
                    det.append(sum, elemento('div', sim.motivo || '', 'diag'));
                    detras.append(det);
                    return;
                }
                p.empieza(1);

                const firmado = await boveda.firmarCambioAmm({
                    ...comoFirmar,
                    carteraId: kda.carteraId,
                    networkId: ctx.red.networkId,
                    camino: q.camino,
                    pool: q.cuentaPrimerPar,
                    // Lo que entra en el pool es el NETO; la comisión va aparte y en
                    // la misma transacción. Las dos cifras son las que se enseñaron.
                    cantidad: q.alPoolStr,
                    comision: q.comisionStr,
                    // El mínimo que se firma es EL QUE SE ENSEÑÓ.
                    minimo: q.minimoStr,
                    // Gas gratis: lo decide la simulación, que es la que conoce el
                    // importe y el gas medido. `gasLimit` va con ella porque el
                    // contrato rechaza cualquier techo por encima de 8000.
                    gratis: sim.gratis,
                    gasLimit: sim.gratis ? sim.gasGratis : undefined,
                    creationTime: String(Math.floor(Date.now() / 1000) - 90),
                });

                p.empieza(2);
                const rk = await enviarComando(ctx.red.nodo, ctx.red.networkId, '2', firmado);
                detras.append(lineaCopiable(
                    t('Referencia de la transacción'), rk,
                    t('Con ella se mira luego en qué quedó, aquí o en el explorador.')));
                p.empieza(3);

                const r = await esperarResultado(ctx.red.nodo, ctx.red.networkId, '2', rk, { alMirar: parteDelNodo(p) });
                if (!r) {
                    p.falla();
                    detras.append(elemento('p', t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), 'malo'));
                    return;
                }
                if (r.result && r.result.status === 'success') {
                    p.acaba();
                    detras.append(elemento('p', t('✓ Cambiado. Mira el saldo en el Panel.')));
                    return;
                }
                p.falla();
                const motivo = (r.result && r.result.error && r.result.error.message) || t('el contrato lo rechazó');
                detras.append(elemento('p', t('La transacción entró en un bloque pero falló: {0}', motivo), 'malo'));
            } catch (e) {
                p.falla();
                detras.append(elemento('p', t(String(e.message || e)), 'malo'));
            } finally {
                congelar(false);
                zonaFirma.hidden = true;
                clave.value = '';
            }
    }

    doy.entrada.addEventListener('input', cotizarPronto);
    doy.select.addEventListener('change', () => { pintaSaldo(doy); cotizarYa(); });
    recibo.select.addEventListener('change', () => { pintaSaldo(recibo); cotizarYa(); });

    doy.maximo.addEventListener('click', () => {
        const s = doy.disponible;
        if (s === null || !(s > 0)) return;
        // El máximo de KDA deja algo para el gas: gastarlo entero es quedarse sin
        // poder firmar la siguiente operación.
        doy.entrada.value = String(doy.select.value === 'coin' ? Math.max(0, s - 0.02) : s);
        cotizarYa();
    });

    bVuelta.addEventListener('click', () => {
        const d = doy.select.value;
        doy.select.value = recibo.select.value;
        recibo.select.value = d;
        doy.entrada.value = '';
        cotizarYa();
        pintaSaldo(doy);
        pintaSaldo(recibo);
    });

    raiz.append(doy.caja, vuelta, recibo.caja, datos, zonaFirma, salida);
    pintaSaldo(doy);
    pintaSaldo(recibo);
    return raiz;
}

/** Lo mismo que en el Puente: el error del nodo, dicho para personas. */
function enLlano(motivo) {
    const m = String(motivo || '');
    if (/Failed to buy gas|coin_coin-table/i.test(m)) {
        return t('esta cuenta no tiene KDA en la chain 2, que es donde está el mercado y de donde sale el gas.');
    }
    if (/row not found|No value found in table/i.test(m)) {
        return t('esta cuenta no tiene ese token en la chain 2.');
    }
    if (/insufficient|balance/i.test(m)) {
        return t('no hay saldo suficiente para esa cantidad.');
    }
    if (/Keyset failure|not granted/i.test(m)) {
        return t('el permiso que se firmaría no cubre esta operación; esto es un fallo nuestro, avisa.');
    }
    return t('el nodo lo rechazó.');
}

function simbolo(lista, modulo) {
    const x = lista.find((y) => y.modulo === modulo);
    return x ? x.simbolo : String(modulo).split('.').pop();
}
