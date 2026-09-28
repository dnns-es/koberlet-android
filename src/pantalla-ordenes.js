// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SECCION ORDENES: ordenes limite de KoberluSW (`free.ksw2`).
//
// Vender KDA cuando suba a un precio, o comprarlo cuando baje a otro. Se crea la
// orden con su deposito y se olvida: la dispara un vigilante externo, que paga su
// propio gas, y el contrato vuelve a mirar el precio antes de soltar nada. Desde
// aqui solo se CREA y se CANCELA, como en el escritorio.
//
// Todo lo que mueve dinero se firma en el plugin, con la contraseña o la huella;
// esta pantalla junta numeros y reenvia al nodo el comando ya firmado.

import { cotizar, reservas, ordenesAbiertas, enPausa, KDA, USDC, SLIPPAGE_DEFECTO } from './lib/ordenes.js';
import { gasolineraLista, motivoGas, GAS_GASOLINERA, MARGEN_GAS } from './lib/dca.js';
import { Capacitor } from '@capacitor/core';
import { saldoEnMercado } from './lib/dex.js';
import { enviarComando, esperarResultado } from './lib/kda.js';
import { boveda } from './boveda/contrato.js';
import { selectorCartera } from './cartera-activa.js';
import { t } from './idioma.js';
import { nombreBio } from './biometria.js';
import { pasos, parteDelNodo } from './pasos.js';
import { lineaCopiable } from './copiable.js';
import { recorta } from './cifras.js';

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

const numero = (n, d = 5) => recorta(n, Math.min(d, 5));
// El precio con sus seis decimales: redondearlo a cuatro seria proponer un precio
// que no es el del mercado.
const precio6 = (n) => Number(n).toFixed(6);

/**
 * @param raiz  donde pintar
 * @param ctx   { cuentas, red }
 */
export function pintarOrdenes(raiz, ctx, opciones = {}) {
    raiz.innerHTML = '';

    const c = caja();
    const cabecera = elemento('div', null, 'cab-seccion');
    const verMias = document.createElement('button');
    verMias.type = 'button';
    verMias.className = 'enlace';
    verMias.textContent = t('Mis órdenes');
    cabecera.append(elemento('h2', t('Órdenes límite')), verMias);
    c.append(cabecera);

    const elige = selectorCartera(ctx.cuentas, 'kda', t('Cartera'), () => pintarOrdenes(raiz, ctx));
    c.append(elige.caja);
    const kda = elige.cuenta;
    if (!kda) {
        raiz.append(elemento('p', t('No hay ninguna cartera con cuenta de Kadena.'), 'nota'));
        return;
    }

    // EL PRECIO DE AHORA, a la vista y diciendo de donde sale: es el del pool del
    // Mercado de Kadena, que es contra el que se ejecuta la orden, no el de
    // CoinGecko. Poner un limite sin saber a cuanto esta es tirar a ciegas.
    const lineaPrecio = elemento('p', t('Leyendo el precio del pool…'), 'nota');
    const avisoPausa = elemento('div');
    const donde = elemento('div');
    c.append(lineaPrecio, avisoPausa, donde);
    raiz.append(c);

    const nueva = bloqueNuevaOrden(raiz, ctx, kda);
    raiz.append(nueva.caja);

    reservas(ctx.red).then((r) => {
        lineaPrecio.textContent = t('Ahora: 1 KDA = {0} kb-USDC (pool KDA/kb-USDC del Mercado de Kadena).', precio6(r.precio));
        nueva.alPrecio(r.precio);
    }).catch(() => {
        lineaPrecio.textContent = t('No se pudo leer el precio del pool ahora mismo.');
        lineaPrecio.className = 'malo';
    });

    enPausa(ctx.red).then((p) => {
        if (p === true) avisoPausa.append(elemento('p', t('El contrato de órdenes está parado: ahora mismo no se ejecuta ninguna orden.'), 'malo'));
    });

    let abierto = false;
    verMias.addEventListener('click', () => {
        abierto = !abierto;
        donde.innerHTML = '';
        verMias.textContent = abierto ? t('Ocultar') : t('Mis órdenes');
        if (!abierto) return;
        donde.append(elemento('p', t('Preguntando a la cadena…'), 'nota'));
        ordenesAbiertas(ctx.red, kda.cuenta).then(({ mias, libro }) => {
            donde.innerHTML = '';
            if (!mias.length) donde.append(elemento('p', t('No tienes ninguna orden abierta.'), 'nota'));
            mias.forEach((o) => donde.append(tarjetaOrden(o, raiz, ctx, kda)));
            donde.append(bloqueLibro(libro));
        }).catch((e) => {
            donde.innerHTML = '';
            donde.append(elemento('p', t(String(e.message || e)), 'malo'));
        });
    });
    if (opciones.verMias) verMias.click();
}

/** Una linea de orden en llano: «Vende 100 KDA a 0,55 (mínimo 54,1 kb-USDC)». */
function lineaOrden(o) {
    return o.venta
        ? t('Vende {0} KDA a {1} (recibes al menos {2} kb-USDC)', numero(o.cantidad), precio6(o.precio), numero(o.minimo))
        : t('Compra KDA con {0} kb-USDC a {1} (recibes al menos {2} KDA)', numero(o.cantidad), precio6(o.precio), numero(o.minimo));
}

// El libro publico: se ve QUE hay, nunca de quien. Ventas y compras, de la mas
// barata a la mas cara, que es como se lee un libro de ordenes.
function bloqueLibro(libro) {
    const d = elemento('div');
    d.style.borderTop = '1px solid var(--linea)';
    d.style.paddingTop = '10px';
    d.append(elemento('h3', t('Libro de órdenes')));
    if (!libro.length) {
        d.append(elemento('p', t('No hay ninguna orden abierta ahora mismo.'), 'nota'));
        return d;
    }
    const orden = libro.slice().sort((a, b) => a.precio - b.precio);
    for (const o of orden.filter((x) => x.venta).concat(orden.filter((x) => !x.venta))) {
        d.append(elemento('p', (o.venta ? '🔴 ' : '🟢 ') + lineaOrden(o), 'nota'));
    }
    return d;
}

function campoFirma(salida, id, alFirmar) {
    const campo = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = t('Contraseña de la cartera');
    const i = document.createElement('input');
    i.type = 'password';
    i.id = id;
    i.autocomplete = 'off';
    campo.append(l, i);
    salida.append(campo);
    const firmar = document.createElement('button');
    firmar.textContent = t('Firmar');
    firmar.addEventListener('click', () => alFirmar({ contrasena: i.value }));
    salida.append(firmar);
    boveda.bioEstado().then((b) => {
        if (!b || !b.activada) return;
        const h = document.createElement('button');
        h.className = 'secundario';
        h.textContent = t('Firmar con {0}', nombreBio(b));
        h.addEventListener('click', () => alFirmar({ huella: true }));
        salida.append(h);
    }).catch(() => { /* si no se puede preguntar, se firma con la contraseña */ });
}

/**
 * Firma, manda y espera al bloque, con la escalera de pasos. `firmar()` devuelve
 * el comando firmado; `alAcabar(salida)` pinta lo de despues si salio bien.
 */
async function firmarYMandar(salida, ctx, firmar, textoBien, alAcabar) {
    const esc = pasos([
        t('Firmar en el móvil'),
        t('Mandar la transacción al nodo'),
        { que: t('Esperar a que entre en un bloque'), tarda: true },
    ]);
    salida.append(esc.caja);
    const detras = elemento('div');
    salida.append(detras);
    esc.empieza(0);
    try {
        const firmado = await firmar();
        esc.empieza(1);
        const rk = await enviarComando(ctx.red.nodo, ctx.red.networkId, '2', firmado);
        detras.append(lineaCopiable(t('Referencia de la transacción'), rk,
            t('Con ella se mira luego en qué quedó, aquí o en el explorador.')));
        esc.empieza(2);
        const r = await esperarResultado(ctx.red.nodo, ctx.red.networkId, '2', rk, { alMirar: parteDelNodo(esc) });
        if (!r) {
            esc.falla();
            detras.append(elemento('p', t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), 'malo'));
        } else if (r.result && r.result.status === 'success') {
            esc.acaba();
            salida.append(elemento('p', textoBien));
            alAcabar(salida);
        } else {
            esc.falla();
            const motivo = (r.result && r.result.error && r.result.error.message) || t('el contrato lo rechazó');
            detras.append(elemento('p', t('La transacción entró en un bloque pero falló: {0}', motivo), 'malo'));
        }
    } catch (e) {
        esc.falla();
        const m = String(e.message || e);
        const gas = motivoGas(m);
        detras.append(elemento('p', gas === 'sin-kda'
            ? t('El nodo no pudo cobrar el gas: tu cuenta no tiene KDA en la chain 2. Mándate un poco de KDA (con 0,05 sobra) a esta misma cuenta en la chain 2 y vuelve a intentarlo.')
            : gas === 'otro'
                ? t('El nodo no pudo cobrar el gas de la operación. Prueba otra vez en un momento.')
                : t(m), 'malo'));
    }
}

function tarjetaOrden(o, raiz, ctx, kda) {
    const d = elemento('div');
    d.style.borderTop = '1px solid var(--linea)';
    d.style.padding = '12px 0 2px';
    d.append(elemento('h3', o.simIn + ' → ' + o.simOut));
    d.append(elemento('p', lineaOrden(o), 'nota'));
    d.append(fila(t('Depósito'), numero(o.cantidad) + ' ' + o.simIn));
    d.append(fila(t('Precio'), precio6(o.precio) + ' kb-USDC/KDA'));
    d.append(elemento('div', o.id, 'dir'));

    const salida = elemento('div');
    const cancelar = document.createElement('button');
    cancelar.className = 'peligro';
    cancelar.textContent = t('Cancelar la orden');
    let enMarcha = false;
    cancelar.addEventListener('click', () => {
        if (enMarcha) return;
        salida.innerHTML = '';
        salida.append(elemento('p', t('Se cancela la orden y te devuelve los {0} {1} del depósito, enteros. El gas de cancelar lo pagas tú, en KDA.', numero(o.cantidad), o.simIn), 'nota'));
        campoFirma(salida, 'clave-' + o.id, async (comoFirmar) => {
            if (enMarcha) return;
            enMarcha = true;
            cancelar.disabled = true;
            salida.innerHTML = '';
            // Cancelar no puede ir por la gasolinera (ver FirmaKda.cancelarOrden):
            // sin KDA en la chain 2 el nodo lo rechaza con un mensaje que no se entiende.
            const kdaSuelto = await saldoEnMercado(ctx.red, 'coin', kda.cuenta);
            if (kdaSuelto != null && kdaSuelto < MARGEN_GAS) {
                enMarcha = false;
                cancelar.disabled = false;
                salida.append(elemento('p', t('Para cancelar hace falta un poco de KDA en la chain 2 para el gas (con 0,05 KDA sobra). Ahora tienes {0}.', numero(kdaSuelto, 4)), 'malo'));
                return;
            }
            await firmarYMandar(salida, ctx, () => boveda.firmarCancelarOrden({
                ...comoFirmar,
                carteraId: kda.carteraId,
                networkId: ctx.red.networkId,
                id: o.id,
            }), t('✓ Orden cancelada. El depósito vuelve a tu cuenta.'), (s) => {
                const ver = document.createElement('button');
                ver.className = 'secundario';
                ver.textContent = t('Ver mis órdenes');
                ver.addEventListener('click', () => pintarOrdenes(raiz, ctx, { verMias: true }));
                s.append(ver);
            });
            enMarcha = false;
            cancelar.disabled = false;
        });
    });
    d.append(cancelar, salida);
    return d;
}

// --- Orden nueva ---------------------------------------------------------------

function campoNumero(id, etiqueta) {
    const c = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiqueta;
    const i = document.createElement('input');
    i.id = id;
    i.type = 'number';
    i.inputMode = 'decimal';
    i.min = '0';
    c.append(l, i);
    return { caja: c, input: i, etiqueta: l };
}

function bloqueNuevaOrden(raiz, ctx, kda) {
    const c = caja();
    c.append(elemento('h3', t('Orden nueva')));

    // Por defecto, vender KDA cuando suba: es la orden que mas se pone.
    let venta = true;
    const entra = () => (venta ? KDA : USDC);

    const par = elemento('div', null, 'par-fila');
    const izq = elemento('div', null, 'par-lado');
    const der = elemento('div', null, 'par-lado der');
    const girar = document.createElement('button');
    girar.type = 'button';
    girar.className = 'circulo-vuelta';
    girar.textContent = '⇅';
    girar.setAttribute('aria-label', t('Cambiar el sentido'));
    const pintaPar = () => {
        izq.innerHTML = '';
        der.innerHTML = '';
        izq.append(elemento('span', t('Entregas'), 'lado-que'), elemento('b', entra().simbolo, 'pastilla'));
        der.append(elemento('span', t('Recibes'), 'lado-que'), elemento('b', (venta ? USDC : KDA).simbolo, 'pastilla'));
    };
    pintaPar();
    par.append(izq, girar, der);
    const disponible = elemento('div', null, 'nota');
    c.append(par, disponible);

    const cant = campoNumero('ord-cant', '');
    const precio = campoNumero('ord-precio', t('Precio de disparo, en kb-USDC por KDA'));
    c.append(cant.caja, precio.caja);
    const pintaEtiqueta = () => {
        cant.etiqueta.textContent = t('Cuánto entregas, en {0}', entra().simbolo);
    };
    pintaEtiqueta();

    const desliz = elemento('div', null, 'campo');
    const lDes = document.createElement('label');
    lDes.setAttribute('for', 'ord-desliz');
    lDes.textContent = t('Deslizamiento máximo');
    const sDes = document.createElement('select');
    sDes.id = 'ord-desliz';
    for (const [v, txt] of [[0.01, '1 %'], [0.02, '2 %'], [0.05, '5 %'], [0.1, '10 %'], [0.2, '20 %']]) {
        const o = document.createElement('option');
        o.value = String(v);
        o.textContent = txt;
        if (v === SLIPPAGE_DEFECTO) o.selected = true;
        sDes.append(o);
    }
    desliz.append(lDes, sDes);
    c.append(desliz);

    const resumen = elemento('p', null, 'nota');
    const crear = document.createElement('button');
    const salida = elemento('div');
    c.append(resumen, crear, salida);
    const pintaBoton = () => {
        crear.textContent = venta ? t('Crear orden de venta') : t('Crear orden de compra');
    };
    pintaBoton();

    let precioAhora = null;
    let ultima = null;          // la ultima cotizacion buena
    let turno = 0;              // descarta cotizaciones viejas que lleguen tarde
    let reloj = null;
    let enMarcha = false;

    const pintaSaldo = async () => {
        disponible.textContent = t('Consultando el saldo…');
        const s = await saldoEnMercado(ctx.red, entra().modulo, kda.cuenta);
        disponible.textContent = s == null
            ? t('No se pudo leer tu saldo de {0} en la chain 2.', entra().simbolo)
            : t('Tienes {0} {1} en la chain 2.', numero(s), entra().simbolo);
    };

    // La cotizacion pregunta a la cadena (reservas del pool): se espera a que se
    // deje de teclear en vez de preguntar en cada tecla.
    const resumir = () => {
        if (!enMarcha) salida.innerHTML = '';
        if (reloj) clearTimeout(reloj);
        ultima = null;
        resumen.className = 'nota';
        if (!(Number(cant.input.value) > 0) || !(Number(precio.input.value) > 0)) {
            resumen.textContent = t('Escribe cuánto entregas y a qué precio.');
            return;
        }
        resumen.textContent = t('Calculando…');
        reloj = setTimeout(async () => {
            const mio = ++turno;
            try {
                const q = await cotizar(ctx.red, {
                    venta, cantidad: cant.input.value, precio: precio.input.value, slippage: Number(sDes.value),
                });
                if (mio !== turno) return;
                if (q.demasiado) {
                    resumen.className = 'malo';
                    resumen.textContent = t('Esta orden mueve más del {0} % del pool: el contrato no la dejaría ejecutarse y se quedaría abierta para siempre. Pártela en varias más pequeñas.', q.demasiado);
                    return;
                }
                ultima = q;
                let txt = venta
                    ? t('Cuando 1 KDA llegue a {0} kb-USDC, se venden {1} KDA y recibes al menos {2} kb-USDC. El servicio se lleva {3} KDA (0,5 %).', precio6(q.precio), numero(q.cantidad), numero(q.minimo), numero(q.comision))
                    : t('Cuando 1 KDA baje a {0} kb-USDC, se compran KDA con {1} kb-USDC y recibes al menos {2} KDA. El servicio se lleva {3} kb-USDC (0,5 %).', precio6(q.precio), numero(q.cantidad), numero(q.minimo), numero(q.comision));
                if (q.yaSeCumple) {
                    txt += ' ' + t('Ojo: ese precio ya se cumple ahora mismo, así que la orden se ejecutará en cuanto el vigilante la vea.');
                    resumen.className = 'malo';
                }
                resumen.textContent = txt;
            } catch (e) {
                if (mio !== turno) return;
                resumen.className = 'malo';
                resumen.textContent = e.minimo
                    ? t('La orden mínima es de {0} {1}.', e.minimo.cantidad, e.minimo.simbolo)
                    : t(String(e.message || e));
            }
        }, 450);
    };

    cant.input.addEventListener('input', resumir);
    precio.input.addEventListener('input', resumir);
    sDes.addEventListener('change', resumir);
    girar.addEventListener('click', () => {
        if (enMarcha) return;
        venta = !venta;
        pintaPar();
        pintaEtiqueta();
        pintaBoton();
        pintaSaldo();
        resumir();
    });
    resumir();
    pintaSaldo();

    crear.addEventListener('click', () => {
        if (enMarcha) return;          // con una firma en marcha, la escalera no se toca
        salida.innerHTML = '';
        // Lo que se enseña es la ultima cotizacion; el nativo firma exactamente
        // esos numeros. Sin cotizacion buena no se firma nada.
        if (!ultima) {
            salida.append(elemento('p', t('Espera a que salga el resumen de la orden antes de firmar.'), 'malo'));
            return;
        }
        const q = ultima;
        salida.append(elemento('p', t('Se ingresan {0} {1} en el contrato ahora mismo. Se quedan ahí hasta que la orden se ejecute o la canceles; cancelar te los devuelve enteros.', numero(q.cantidad), q.tIn.simbolo), 'nota'));
        campoFirma(salida, 'ord-clave', (comoFirmar) => mandar(comoFirmar, q));
    });

    async function mandar(comoFirmar, q) {
        // Dos toques seguidos no son dos ordenes: cada una ingresa su deposito.
        if (enMarcha) return;
        enMarcha = true;
        crear.disabled = true;
        girar.disabled = true;
        salida.innerHTML = '';
        const soltar = () => { enMarcha = false; crear.disabled = false; girar.disabled = false; };

        // ¿Quien paga el gas? Si puede, la gasolinera de KoberluSW, como en el
        // escritorio. Solo en Android: en iPhone todavia no firma con ella.
        const gratis = Capacitor.getPlatform() === 'android' && await gasolineraLista(ctx.red);
        if (!gratis) {
            const kdaSuelto = await saldoEnMercado(ctx.red, 'coin', kda.cuenta);
            const falta = (q.venta ? Number(q.cantidad) : 0) + MARGEN_GAS;
            if (kdaSuelto != null && kdaSuelto < falta) {
                soltar();
                salida.append(elemento('p', q.venta
                    ? t('Te falta KDA en la chain 2: la orden son {0} KDA y hay que dejar además algo para el gas (al menos {1} en total). Tienes {2}.', numero(q.cantidad), numero(falta, 4), numero(kdaSuelto, 4))
                    : t('Para crear esta orden hace falta un poco de KDA en la chain 2 para el gas (con 0,05 KDA sobra). Ahora tienes {0}.', numero(kdaSuelto, 4)), 'malo'));
                return;
            }
        }
        await firmarYMandar(salida, ctx, () => boveda.firmarCrearOrden({
            ...comoFirmar,
            carteraId: kda.carteraId,
            networkId: ctx.red.networkId,
            // El sentido y tres numeros en texto. Nada de contratos ni cuentas.
            venta: q.venta,
            cantidad: q.cantidad,
            disparo: q.disparo,
            minimo: q.minimo,
            ...(gratis ? { gratis: true, gasLimit: GAS_GASOLINERA } : {}),
        }), t('✓ Orden creada y confirmada en la cadena.'), (s) => {
            const ver = document.createElement('button');
            ver.className = 'secundario';
            ver.textContent = t('Ver mis órdenes');
            ver.addEventListener('click', () => pintarOrdenes(raiz, ctx, { verMias: true }));
            s.append(ver);
            cant.input.value = '';
        });
        soltar();
    }

    return {
        caja: c,
        // El precio de ahora se escribe en la casilla para no tener que buscarlo,
        // pero solo si esta vacia: lo que haya tecleado el usuario no se pisa.
        alPrecio(p) {
            precioAhora = p;
            if (String(precio.input.value).trim() === '' && precioAhora > 0) {
                precio.input.value = precio6(precioAhora);
                resumir();
            }
        },
    };
}
