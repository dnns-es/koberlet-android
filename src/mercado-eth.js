// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// EL MERCADO DE ETHEREUM: cambiar USDC por ETH y al reves, y USDT por USDC.
//
// Lo pidio Antonio para tener en el movil lo mismo que ya hacia en el escritorio,
// y con LA MISMA FORMA que el mercado de Kadena: un token arriba -lo que vendes-,
// otro abajo que se calcula solo, el boton de darle la vuelta en medio y un boton
// de firmar que pide contraseña o huella.
//
// Por debajo es Uniswap v3, y lo que se firma lo arma `SwapEvm.kt`: de aqui salen
// la RUTA por su nombre, la comision del pool que mejor cotizo, cuanto entra y el
// minimo que se acepta. Ninguna direccion de contrato viaja desde esta pantalla.
//
// EL MINIMO ES LO IMPORTANTE. Lo que se enseña abajo es una simulacion: entre
// mirarlo y firmar, el precio puede moverse -y hay quien se dedica a moverlo a
// proposito justo entonces-. Lo que protege es el suelo, que va DENTRO de lo
// firmado: si el cambio fuera a dar menos, la transaccion revierte y no se pierde
// mas que el gas.
//
// NO todos los pares se pueden hacer de una vez: hay cuatro rutas y ETH con USDT
// no es una de ellas. Cuando se elige un par que no existe se dice el camino, en
// vez de dejar un boton que no hace nada.

import { boveda } from './boveda/contrato.js';
import { t } from './idioma.js';
import { pasos, parteDelNodo } from './pasos.js';
import { lineaCopiable } from './copiable.js';
import { selectorCartera } from './cartera-activa.js';
import { lado } from './lado-cambio.js';
import {
    RUTAS, cotizar, estadoDeRuta, aUnidades, aTexto, DESLIZAMIENTO,
} from './lib/ethswap.js';
import { sobreEvm, mandarRaw, esperarReciboEvm } from './lib/puente.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function fila(izq, der) {
    const f = elemento('div', null, 'fila');
    f.append(elemento('span', izq, 'izq'), elemento('span', der, 'der'));
    return f;
}

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', alPulsar);
    return b;
}

/** Los tres tokens que se pueden cambiar, y sus decimales. */
const TOKENS = [
    { modulo: 'ETH', simbolo: 'ETH', dec: 18 },
    { modulo: 'USDC', simbolo: 'USDC', dec: 6 },
    { modulo: 'USDT', simbolo: 'USDT', dec: 6 },
];

const decDe = (k) => (TOKENS.find((x) => x.modulo === k) || { dec: 18 }).dec;

/** La ruta que va de uno a otro, si existe. */
function rutaEntre(de, a) {
    return RUTAS.find((r) => r.de === de && r.a === a) || null;
}

/**
 * Para enseñar, no para firmar. Un ETH con 18 decimales en pantalla no lo lee
 * nadie; lo que se firma sigue siendo el número entero, intacto.
 */
function corto(texto) {
    const [ent, dec] = String(texto).split('.');
    if (!dec) return ent;
    const d = dec.slice(0, 8).replace(/0+$/, '');
    return d ? `${ent}.${d}` : ent;
}

/** Cuánto gas se pide para cada paso. Sobrado: en Ethereum lo que no se usa no se cobra. */
const GAS_PERMISO = 80000;
const GAS_CAMBIO = 300000;

/**
 * Lo que puede costar el gas del cambio, en wei.
 *
 * Hace falta para dos cosas y las dos aprendidas a golpes: que MÁX no te deje sin
 * con qué pagar la transacción, y que se avise ANTES de firmar en vez de que lo
 * diga el nodo en inglés cuando ya has puesto la contraseña. Se pide el `gasLimit`
 * entero aunque casi nunca se gaste: lo que no se usa no se cobra, pero para
 * mandarla tiene que estar disponible.
 */
async function costeGas(direccion) {
    const sobre = await sobreEvm(direccion, { gasLimit: GAS_CAMBIO });
    return BigInt(sobre.maxFeePerGas) * BigInt(GAS_CAMBIO);
}

export function bloqueMercadoEth(raiz, ctx, repintar) {
    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Cambiar')));

    const elige = selectorCartera(ctx.cuentas, 'evm', t('Cartera'), () => repintar());
    c.append(elige.caja);
    const cuenta = elige.cuenta;
    if (!cuenta) {
        c.append(elemento('p', t('No hay ninguna cartera con cuenta de Ethereum.'), 'nota'));
        return c;
    }

    // De fábrica, USDC arriba y ETH abajo: es el cambio que más se hace.
    const doy = lado('eth-doy', t('Doy'), TOKENS, 'USDC', true);
    const recibo = lado('eth-recibo', t('Recibo'), TOKENS, 'ETH', false);

    const vuelta = elemento('div', null, 'da-la-vuelta');
    const bVuelta = document.createElement('button');
    bVuelta.type = 'button';
    bVuelta.className = 'circulo-vuelta';
    bVuelta.textContent = '⇅';
    bVuelta.setAttribute('aria-label', t('Darle la vuelta'));
    vuelta.append(bVuelta);

    const datos = elemento('div');
    const salida = elemento('div');

    // La contraseña está puesta desde el principio y el botón firma de una vez.
    // Antes había un botón que sacaba otro botón, y Antonio lo dijo: «me pide 2
    // veces firma». Pedir dos veces lo mismo no protege de nada; lo que protege es
    // que la contraseña solo aparezca cuando hay un cambio de verdad que firmar.
    const zonaFirma = elemento('div');
    zonaFirma.hidden = true;
    const cClave = elemento('div', null, 'campo');
    const lClave = document.createElement('label');
    lClave.setAttribute('for', 'eth-clave');
    lClave.textContent = t('Contraseña de la cartera');
    const clave = document.createElement('input');
    clave.type = 'password';
    clave.id = 'eth-clave';
    clave.autocomplete = 'off';
    cClave.append(lClave, clave);
    const accion = boton(t('Firmar el cambio'), () => cambiar({ contrasena: clave.value }), 'peligro');
    zonaFirma.append(cClave, accion);

    boveda.bioEstado().then((e) => {
        if (!e || !e.activada) return;
        zonaFirma.append(boton(t('Firmar con huella'), () => cambiar({ huella: true }), 'secundario'));
    }).catch(() => { /* si no se puede preguntar, queda la contraseña */ });

    c.append(doy.caja, vuelta, recibo.caja, datos, zonaFirma, salida);

    /** La cotización que hay ahora mismo en pantalla, y el estado de la cuenta. */
    let q = null;
    let est = null;

    /** Lo que hay en la cuenta del token de arriba. */
    async function pintaSaldo() {
        const k = doy.select.value;
        const r = rutaEntre(k, recibo.select.value) || RUTAS.find((x) => x.de === k);
        doy.saldo.textContent = '…';
        try {
            const e = await estadoDeRuta(r.clave, cuenta.cuenta);
            doy.disponible = e.saldo;
            doy.saldo.textContent = t('Tienes {0}', corto(aTexto(e.saldo, decDe(k))));
        } catch (_) {
            doy.disponible = null;
            doy.saldo.textContent = t('no se sabe');
        }
    }

    let espera = null;
    const cotizarPronto = () => { clearTimeout(espera); espera = setTimeout(cotizarYa, 500); };

    async function cotizarYa() {
        datos.innerHTML = '';
        salida.innerHTML = '';
        q = null; est = null;
        recibo.entrada.value = '';
        zonaFirma.hidden = true;

        if (doy.select.value === recibo.select.value) {
            datos.append(elemento('p', t('Son el mismo token.'), 'malo'));
            return;
        }
        const r = rutaEntre(doy.select.value, recibo.select.value);
        if (!r) {
            // ETH con USDT no tiene ruta directa. Se dice el camino, que son dos
            // cambios y se pueden hacer: no es un callejón sin salida.
            datos.append(elemento('p', t('Ese par no se cambia de una vez. Pasa por USDC: primero a USDC y luego a lo que quieras.'), 'malo'));
            return;
        }
        const n = Number(doy.entrada.value);
        if (!(n > 0)) return;

        datos.append(elemento('p', t('Preguntando a Uniswap…'), 'nota'));
        try {
            const cot = await cotizar(r.clave, doy.entrada.value);
            const e = await estadoDeRuta(r.clave, cuenta.cuenta);
            const entra = aUnidades(doy.entrada.value, r.decIn);
            q = cot; est = e;

            // Lo que se enseña es lo que le llega a él: la comisión de Koberlet ya
            // está descontada y se dice aparte, con su cifra.
            recibo.entrada.value = corto(cot.netoTexto);
            datos.innerHTML = '';
            datos.append(fila(t('Como mínimo recibes'), `${corto(cot.netoMinimoTexto)} ${r.a}`));
            datos.append(fila(t('Comisión de Koberlet ({0} %)', String(cot.comisionKobPct)),
                `${corto(cot.comisionKobTexto)} ${r.a}`));
            datos.append(fila(t('Comisión del pool'), (cot.comision / 10000) + ' %'));
            datos.append(elemento('p', t('El mínimo es lo que se firma: si en el momento del cambio fuera a dar menos, la transacción se cae y solo se pierde el gas. Se tolera un {0} % de diferencia.', String(DESLIZAMIENTO * 100)), 'nota'));
            datos.append(elemento('p', t('Koberlet se queda el {0} % de lo que recibes: {1} {2}. Lo aparta el propio Uniswap en la misma transacción, así que si el cambio falla no se cobra nada.',
                String(cot.comisionKobPct), corto(cot.comisionKobTexto), r.a), 'nota'));

            if (e.saldo < entra) {
                datos.append(elemento('p', t('No tienes tanto {0}.', r.de), 'malo'));
                return;
            }
            if (r.entraEth) {
                // Con ETH, lo que se cambia y lo que paga el gas salen del MISMO
                // saldo. Se mira aquí, con el gas de ahora, y si no cabe no se deja
                // firmar: el nodo lo rechazaría igual, pero después de la contraseña
                // y en inglés.
                const gas = await costeGas(cuenta.cuenta);
                if (e.saldo < entra + gas) {
                    const sobra = e.saldo > gas ? e.saldo - gas : 0n;
                    datos.append(elemento('p', t('No cabe el gas: cambiando eso te quedarías sin con qué pagar la transacción. Con el gas de ahora puedes cambiar como mucho {0} ETH.', corto(aTexto(sobra, 18))), 'malo'));
                    return;
                }
                datos.append(elemento('p', t('El gas de este cambio ronda {0} ETH y sale de este mismo saldo.', corto(aTexto(gas, 18))), 'nota'));
            }
            if (!r.entraEth && e.permiso !== null && e.permiso < entra) {
                datos.append(elemento('p', t('Primero hay que autorizar el {0} a Uniswap. Son dos transacciones y las dos gastan gas.', r.de), 'nota'));
            }
            zonaFirma.hidden = false;
        } catch (err) {
            datos.innerHTML = '';
            datos.append(elemento('p', t(String(err.message || err)), 'malo'));
        }
    }

    function congelar(si) {
        [doy.entrada, doy.select, recibo.select, bVuelta, doy.maximo].forEach((el) => {
            if (el) el.disabled = si;
        });
        zonaFirma.hidden = si;
        elige.caja.querySelectorAll('select, button, input').forEach((el) => { el.disabled = si; });
    }

    async function cambiar(comoFirmar) {
        const r = q.ruta;
        const entra = aUnidades(doy.entrada.value, r.decIn);
        // Con ETH no hay nada que autorizar: el ETH va DENTRO de la transacción,
        // no lo mueve nadie de tu cuenta. El permiso es cosa de los ERC-20, y por
        // eso vendiendo ETH el viaje es una sola firma y no dos.
        const faltaPermiso = !r.entraEth && !!(est && est.permiso !== null && est.permiso < entra);

        salida.innerHTML = '';
        congelar(true);

        const escalera = faltaPermiso
            ? [
                t('Autorizar el token'),
                { que: t('Esperar a que entre en un bloque'), tarda: true },
                t('Firmar el cambio'),
                { que: t('Esperar a que entre en un bloque'), tarda: true },
            ]
            : [
                t('Firmar el cambio'),
                { que: t('Esperar a que entre en un bloque'), tarda: true },
            ];
        const p = pasos(escalera);
        salida.append(p.caja);
        const detras = elemento('div');
        salida.append(detras);
        p.empieza(0);

        try {
            const comun = { ...comoFirmar, carteraId: cuenta.carteraId };
            let paso = 0;

            if (faltaPermiso) {
                const sobre = await sobreEvm(cuenta.cuenta, { gasLimit: GAS_PERMISO });
                const { raw } = await boveda.firmarPermisoEvm({
                    ...comun, para: 'mercado', ruta: r.clave,
                    cantidad: aTexto(entra, r.decIn), decimales: r.decIn, ...sobre,
                });
                const hash = await mandarRaw(raw);
                detras.append(lineaCopiable(t('Transacción del permiso'), hash));
                p.empieza(++paso);
                const rec = await esperarReciboEvm(hash, { alMirar: parteDelNodo(p) });
                if (!rec || !rec.bien) {
                    p.falla();
                    detras.append(elemento('p', rec
                        ? t('La autorización entró en un bloque pero falló. No se ha cambiado nada.')
                        : t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), 'malo'));
                    return;
                }
                p.empieza(++paso);
            }

            const sobre = await sobreEvm(cuenta.cuenta, { gasLimit: GAS_CAMBIO });
            const { raw } = await boveda.firmarCambioEvm({
                ...comun,
                ruta: r.clave,
                comision: q.comision,
                cantidad: aTexto(entra, r.decIn),
                // El mínimo que se firma es EL QUE SE ENSEÑÓ, no uno recalculado.
                minimo: q.minimoTexto,
                ...sobre,
            });
            const hash = await mandarRaw(raw);
            detras.append(lineaCopiable(
                t('Transacción en Ethereum'), hash,
                t('Con ella se mira luego en qué quedó, aquí o en el explorador.')));
            p.empieza(++paso);

            const rec = await esperarReciboEvm(hash, { alMirar: parteDelNodo(p) });
            if (!rec) {
                p.falla();
                detras.append(elemento('p', t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), 'malo'));
                return;
            }
            if (!rec.bien) {
                p.falla();
                detras.append(elemento('p', t('El cambio entró en un bloque pero falló: puede que el precio se moviera más de lo tolerado. El gas se ha pagado igual.'), 'malo'));
                return;
            }
            p.acaba();
            detras.append(elemento('p', t('✓ Cambiado. Mira el saldo en el Panel.')));
        } catch (e) {
            p.falla();
            detras.append(elemento('p', t(String(e.message || e)), 'malo'));
        } finally {
            congelar(false);
            // Los números de antes ya no valen: para volver a firmar, se cotiza otra vez.
            zonaFirma.hidden = true;
            clave.value = '';
            pintaSaldo();
        }
    }

    doy.entrada.addEventListener('input', cotizarPronto);
    doy.select.addEventListener('change', () => { pintaSaldo(); cotizarYa(); });
    recibo.select.addEventListener('change', () => { cotizarYa(); });

    doy.maximo.addEventListener('click', async () => {
        if (doy.disponible === null || !(doy.disponible > 0n)) return;
        let s = doy.disponible;
        // Con ETH hay que dejar para el gas, y la reserva se pregunta: una cifra
        // fija se queda corta cuando la red está cara y se pasa cuando está
        // barata, y con saldos pequeños la de antes -0,003 ETH- dejaba MÁX en cero.
        if (doy.select.value === 'ETH') {
            try {
                const gas = await costeGas(cuenta.cuenta);
                s = s > gas ? s - gas : 0n;
            } catch (_) {
                const reserva = 1000000000000000n;      // 0,001 ETH si no se pudo preguntar
                s = s > reserva ? s - reserva : 0n;
            }
        }
        if (!(s > 0n)) return;
        doy.entrada.value = aTexto(s, decDe(doy.select.value));
        cotizarYa();
    });

    bVuelta.addEventListener('click', () => {
        const d = doy.select.value;
        doy.select.value = recibo.select.value;
        recibo.select.value = d;
        doy.entrada.value = '';
        cotizarYa();
        pintaSaldo();
    });

    pintaSaldo();
    return c;
}
