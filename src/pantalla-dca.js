// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SECCION DCA: compras periodicas.
//
// Ver los planes, crear uno y tocar los que ya hay: pararlos, reanudarlos,
// recargarlos y cerrarlos recuperando el bote. Todo lo que mueve dinero se firma
// en el plugin, con la contrasena o la huella; esta pantalla solo junta numeros y
// reenvia al nodo el comando ya firmado.

import { planesDe, enPausa, TOKENS, PERIODOS, LIMITES, COMISION, cuentasDelPlan } from './lib/dca.js';
import { saldoEnMercado } from './lib/dex.js';
import { enviarComando, esperarResultado } from './lib/kda.js';
import { boveda } from './boveda/contrato.js';
import { selectorCartera } from './cartera-activa.js';
import { t, locale } from './idioma.js';
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

// Cinco decimales como mucho en todo lo que se lee, y recortando (ver
// `cifras.js`). Los que piden menos -porcentajes, comisiones- se respetan.
const numero = (n, d = 5) => recorta(n, Math.min(d, 5));

/**
 * El estado viene del contrato en inglés («active»). Se traduce aquí, a mano, y
 * no con t(estado): lo que llega de la cadena no puede decidir qué frases tiene
 * que haber en el diccionario, y así la prueba de traducciones lo ve.
 */
function estadoEnClaro(estado) {
    if (estado === 'active') return t('Activo');
    if (estado === 'paused') return t('En pausa');
    if (estado === 'closed') return t('Cerrado');
    return estado;
}

/** «cada 7 días», «cada 12 horas»: en segundos no se entiende nada. */
function cadaCuanto(segundos) {
    const s = Number(segundos) || 0;
    if (s % 86400 === 0 && s >= 86400) return t('cada {0} días', s / 86400);
    if (s % 3600 === 0 && s >= 3600) return t('cada {0} horas', s / 3600);
    return t('cada {0} minutos', Math.round(s / 60));
}

/**
 * @param raiz  donde pintar
 * @param ctx   { cuentas, red }
 */
export function pintarDca(raiz, ctx) {
    raiz.innerHTML = '';

    const c = caja();
    c.append(elemento('h2', t('Compras periódicas')));

    // Los planes son de una cuenta concreta, así que lo primero es decir de cuál.
    const elige = selectorCartera(ctx.cuentas, 'kda', t('Cartera'), () => pintarDca(raiz, ctx));
    c.append(elige.caja);
    const kda = elige.cuenta;
    if (!kda) {
        raiz.append(elemento('p', t('No hay ninguna cartera con cuenta de Kadena.'), 'nota'));
        return;
    }

    const donde = elemento('div');
    donde.append(elemento('p', t('Preguntando a la cadena…'), 'nota'));
    c.append(donde);
    raiz.append(c);
    raiz.append(bloqueNuevoPlan(raiz, ctx, kda));

    (async () => {
        try {
            const [planes, pausa] = await Promise.all([
                planesDe(kda.cuenta, ctx.red),
                enPausa(ctx.red),
            ]);
            donde.innerHTML = '';

            // Un plan «activo» en un contrato parado no compra nada. Eso se dice
            // antes de la lista, no después.
            if (pausa === true) {
                donde.append(elemento('p', t('El contrato está parado: ahora mismo no compra ningún plan.'), 'malo'));
            }

            if (!planes.length) {
                donde.append(elemento('p', t('No tienes ningún plan de compras.'), 'nota'));
                return;
            }
            planes.forEach((p) => donde.append(tarjetaPlan(p, raiz, ctx, kda)));
        } catch (e) {
            donde.innerHTML = '';
            donde.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
    })();
}

function tarjetaPlan(p, raiz, ctx, kda) {
    const d = elemento('div');
    d.style.borderTop = '1px solid var(--linea)';
    d.style.padding = '12px 0 2px';

    d.append(elemento('h3', p.simboloEntra + ' → ' + p.simboloSale));
    d.append(elemento('p', numero(p.cuota) + ' ' + p.simboloEntra + ' ' + cadaCuanto(p.periodo), 'nota'));

    d.append(fila(t('Estado'), estadoEnClaro(p.estado)));
    d.append(fila(t('Queda en el bote'), numero(p.bote) + ' ' + p.simboloEntra));
    d.append(fila(t('Compras que quedan'), String(p.quedan)));
    d.append(fila(t('Compras hechas'), String(p.compras)));
    if (p.recibido) d.append(fila(t('Comprado'), numero(p.recibido) + ' ' + p.simboloSale));
    if (p.proxima && p.estado === 'active') {
        d.append(fila(t('Siguiente compra'), p.proxima.toLocaleString(locale(), {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })));
    }
    d.append(elemento('div', p.id, 'dir'));
    if (p.estado !== 'closed') d.append(botonesPlan(p, raiz, ctx, kda));
    return d;
}

// --- Tocar un plan que ya existe ---------------------------------------------
//
// Cuatro cosas se pueden hacer con un plan vivo: pararlo, reanudarlo, meterle mas
// dinero y cerrarlo. Las tres primeras no sacan nada del contrato; cerrar SI
// devuelve el bote que quede, y por eso se dice cuanto vuelve antes de firmar.
//
// El contrato exige el guard del dueño, asi que un plan de otro no se puede tocar
// aunque se conozca su identificador. Aqui, ademas, se firma con la cartera que
// esta elegida arriba: si no es la dueña, el nodo lo rechaza sin gastar el bote.

function botonesPlan(p, raiz, ctx, kda) {
    const c = elemento('div');
    c.style.marginTop = '8px';
    const salida = elemento('div');
    const fila = elemento('div', null, 'fila-campo');

    const boton = (texto, clase, alPulsar) => {
        const b = document.createElement('button');
        b.textContent = texto;
        if (clase) b.className = clase;
        b.addEventListener('click', alPulsar);
        return b;
    };

    if (p.estado === 'active') {
        fila.append(boton(t('Parar'), 'secundario', () => confirmar('pausar')));
    } else if (p.estado === 'paused') {
        fila.append(boton(t('Reanudar'), 'secundario', () => confirmar('reanudar')));
    }
    fila.append(boton(t('Recargar'), 'secundario', () => pedirRecarga()));
    fila.append(boton(t('Cerrar'), 'peligro', () => confirmar('cerrar')));
    c.append(fila, salida);
    return c;

    /** Cuanto se añade al bote. Se pregunta antes de la contraseña. */
    function pedirRecarga() {
        salida.innerHTML = '';
        const campo = elemento('div', null, 'campo');
        const l = document.createElement('label');
        l.setAttribute('for', 'recarga-' + p.id);
        l.textContent = t('Cuánto añades al bote, en {0}', p.simboloEntra);
        const i = document.createElement('input');
        i.id = 'recarga-' + p.id;
        i.type = 'text';
        i.inputMode = 'decimal';
        i.placeholder = '0.0';
        campo.append(l, i);
        const seguir = document.createElement('button');
        seguir.textContent = t('Continuar');
        seguir.addEventListener('click', () => {
            const cantidad = Number(String(i.value).replace(',', '.'));
            if (!(cantidad > 0)) {
                salida.append(elemento('p', t('Escribe una cantidad mayor que cero.'), 'malo'));
                return;
            }
            confirmar('recargar', cantidad);
        });
        salida.append(campo, seguir);
    }

    /** Lo que va a pasar, en una frase, y despues la contraseña. */
    function confirmar(accion, cantidad = 0) {
        salida.innerHTML = '';
        let aviso;
        if (accion === 'pausar') {
            aviso = t('El plan deja de comprar. El bote se queda donde está y puedes reanudarlo cuando quieras.');
        } else if (accion === 'reanudar') {
            aviso = t('El plan vuelve a comprar, y la cuenta para la siguiente compra empieza ahora.');
        } else if (accion === 'recargar') {
            aviso = t('Se ingresan {0} {1} más en el contrato ahora mismo.', numero(cantidad), p.simboloEntra);
        } else {
            aviso = t('Se cierra el plan y te devuelve {0} {1} a tu cuenta. Un plan cerrado no se reabre: para seguir comprando habría que crear otro.', numero(p.bote), p.simboloEntra);
        }
        salida.append(elemento('p', aviso, 'nota'));

        const campo = elemento('div', null, 'campo');
        const l = document.createElement('label');
        l.setAttribute('for', 'clave-' + p.id);
        l.textContent = t('Contraseña de la cartera');
        const i = document.createElement('input');
        i.type = 'password';
        i.id = 'clave-' + p.id;
        i.autocomplete = 'off';
        campo.append(l, i);
        salida.append(campo);

        const firmar = document.createElement('button');
        firmar.textContent = t('Firmar');
        firmar.addEventListener('click', () => mandar({ contrasena: i.value }, accion, cantidad));
        salida.append(firmar);
        boveda.bioEstado().then((b) => {
            if (!b || !b.activada) return;
            const h = document.createElement('button');
            h.className = 'secundario';
            h.textContent = t('Firmar con huella');
            h.addEventListener('click', () => mandar({ huella: true }, accion, cantidad));
            salida.append(h);
        }).catch(() => { /* si no se puede preguntar, se firma con la contraseña */ });
    }

    async function mandar(comoFirmar, accion, cantidad) {
        salida.innerHTML = '';
        // La escalera de pasos: con el dinero en el aire hay que ver por dónde va.
        // Ver `pasos.js` para el porqué.
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
            const firmado = await boveda.firmarGestionDca({
                ...comoFirmar,
                carteraId: kda.carteraId,
                networkId: ctx.red.networkId,
                accion,
                id: p.id,
                cantidad,
                // De que token es el bote lo dice la cadena, pero al plugin va como
                // un si/no: los nombres de los modulos viven en el codigo.
                entraEsUsdc: p.simboloEntra !== 'KDA',
            });
            esc.empieza(1);
            const rk = await enviarComando(ctx.red.nodo, ctx.red.networkId, '2', firmado);
            // La referencia, en cuanto el nodo acepta y con botón de copiar: a
            // partir de aquí es lo único con lo que averiguar en qué quedó esto.
            detras.append(lineaCopiable(t('Referencia de la transacción'), rk,
                t('Con ella se mira luego en qué quedó, aquí o en el explorador.')));
            esc.empieza(2);

            const r = await esperarResultado(ctx.red.nodo, ctx.red.networkId, '2', rk, { alMirar: parteDelNodo(esc) });
            if (!r) {
                esc.falla();
                detras.append(elemento('p', t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), 'malo'));
            } else if (r.result && r.result.status === 'success') {
                esc.acaba();
                salida.append(elemento('p', accion === 'pausar' ? t('✓ Plan parado.')
                    : accion === 'reanudar' ? t('✓ Plan reanudado.')
                    : accion === 'recargar' ? t('✓ Bote recargado.')
                    : t('✓ Plan cerrado. El bote que quedaba vuelve a tu cuenta.')));
                const ver = document.createElement('button');
                ver.className = 'secundario';
                ver.textContent = t('Ver mis planes');
                ver.addEventListener('click', () => pintarDca(raiz, ctx));
                salida.append(ver);
            } else {
                esc.falla();
                const motivo = (r.result && r.result.error && r.result.error.message) || t('el contrato lo rechazó');
                detras.append(elemento('p', t('La transacción entró en un bloque pero falló: {0}', motivo), 'malo'));
            }
        } catch (e) {
            // Sin borrar la escalera: en qué paso se torció es lo que dice si el
            // dinero llegó a salir o no.
            esc.falla();
            detras.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
    }
}

// --- Plan nuevo --------------------------------------------------------------
//
// Crear un plan mueve el BOTE ENTERO de una vez: el contrato se lo queda en
// custodia y luego va comprando la cuota. Por eso esta pantalla enseña, antes de
// firmar, las tres cosas que de verdad importan: cuántas compras salen, cuánto
// dura el plan y cuánto se lleva el servicio en total.
//
// Lo que se firma no lo decide esta pantalla. El contrato, la chain, la cuenta de
// custodia y los dos tokens viven en `FirmaKda.kt`; de aquí solo salen números y
// el sentido de la compra.

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
    return { caja: c, input: i };
}

function desplegable(id, etiqueta, opciones, elegido, alCambiar) {
    const c = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiqueta;
    const sel = document.createElement('select');
    sel.id = id;
    opciones.forEach(([v, txt]) => {
        const o = document.createElement('option');
        o.value = String(v);
        o.textContent = txt;
        if (String(v) === String(elegido)) o.selected = true;
        sel.append(o);
    });
    if (alCambiar) sel.addEventListener('change', alCambiar);
    c.append(l, sel);
    return { caja: c, sel };
}

/**
 * Cuanto dura el plan entero. Aqui el numero no cae en horas redondas casi nunca
 * -20 compras cada 5 minutos son 100 minutos- asi que se redondea a la unidad
 * que se entiende de un vistazo, que es lo que se quiere de un total.
 */
function duracionTotal(segundos) {
    const s = Number(segundos) || 0;
    const casi = (n) => Number(n.toFixed(1)).toLocaleString(locale());
    if (s < 5400) return t('{0} minutos', Math.round(s / 60));
    if (s < 172800) return t('{0} horas', casi(s / 3600));
    return t('{0} días', casi(s / 86400));
}

/** «5 minutos», «1 hora», «7 días»: en segundos no lo entiende nadie. */
function duracion(segundos) {
    const s = Number(segundos) || 0;
    if (s % 604800 === 0 && s >= 604800) return s === 604800 ? t('1 semana') : t('{0} semanas', s / 604800);
    if (s % 86400 === 0 && s >= 86400) return s === 86400 ? t('1 día') : t('{0} días', s / 86400);
    if (s % 3600 === 0 && s >= 3600) return s === 3600 ? t('1 hora') : t('{0} horas', s / 3600);
    return t('{0} minutos', Math.round(s / 60));
}

function bloqueNuevoPlan(raiz, ctx, kda) {
    const c = caja();
    c.append(elemento('h3', t('Plan nuevo')));

    // El sentido: qué entregas y qué compras. Girarlo cambia las dos cosas y los
    // mínimos, así que se repinta entero.
    let haciaUsdc = true;
    const entra = () => (haciaUsdc ? TOKENS.kda : TOKENS.usdc);
    const sale = () => (haciaUsdc ? TOKENS.usdc : TOKENS.kda);

    // Aquí no se escriben cantidades -eso va abajo, en el bote y la cuota-, así
    // que el par cabe en UNA fila: lo que entregas a la izquierda, lo que compras
    // a la derecha y el botón de girar en medio. Dos cajas apiladas para dos
    // palabras era mucho sitio para poca cosa.
    const par = elemento('div', null, 'par-fila');
    const izq = elemento('div', null, 'par-lado');
    const der = elemento('div', null, 'par-lado der');
    const girar = document.createElement('button');
    girar.type = 'button';
    girar.className = 'circulo-vuelta';
    girar.textContent = '⇅';
    girar.setAttribute('aria-label', t('Cambiar el sentido'));

    const disponible = elemento('div', null, 'nota');

    const unLado = (donde, que, simbolo) => {
        donde.innerHTML = '';
        donde.append(elemento('span', que, 'lado-que'), elemento('b', simbolo, 'pastilla'));
    };
    const pintaPar = () => {
        unLado(izq, t('Entregas'), entra().simbolo);
        unLado(der, t('Compras'), sale().simbolo);
    };
    pintaPar();
    par.append(izq, girar, der);
    c.append(par, disponible);

    const bote = campoNumero('dca-bote', t('Bote inicial'));
    const cuota = campoNumero('dca-cuota', t('Cuota por compra'));
    c.append(bote.caja, cuota.caja);

    const periodos = PERIODOS.map((p) => [p, duracion(p)]);
    const cada = desplegable('dca-cada', t('Cada'), periodos, 3600, () => resumir());
    const desliz = desplegable('dca-desliz', t('Deslizamiento máximo'), [
        [0.01, '1 %'], [0.03, '3 %'], [0.05, '5 %'], [0.1, '10 %'],
    ], 0.05);
    c.append(cada.caja, desliz.caja);

    const resumen = elemento('p', null, 'nota');
    const salida = elemento('div');
    c.append(resumen);

    const crear = document.createElement('button');
    crear.textContent = t('Crear el plan');
    c.append(crear, salida);

    // El saldo que cuenta es el de la chain 2, que es donde vive el contrato: un
    // total de las 20 chains aquí sería un número que no se puede depositar.
    const pintaSaldo = async () => {
        disponible.textContent = t('Consultando el saldo…');
        const s = await saldoEnMercado(ctx.red, entra().modulo, kda.cuenta);
        disponible.textContent = s == null
            ? t('No se pudo leer tu saldo de {0} en la chain 2.', entra().simbolo)
            : t('Tienes {0} {1} en la chain 2.', numero(s), entra().simbolo);
    };

    const resumir = () => {
        const { compras, segundos, comision } = cuentasDelPlan(bote.input.value, cuota.input.value, cada.sel.value);
        if (!compras) {
            resumen.textContent = t('Escribe el bote y la cuota para ver cuántas compras salen.');
            return;
        }
        resumen.textContent = t('Salen {0} compras de {1} {2}, una cada {3}: {4} en total. El servicio se lleva el 0,5 % de cada compra, unos {5} {2}.',
            compras, numero(cuota.input.value), entra().simbolo, duracion(cada.sel.value), duracionTotal(segundos), numero(comision, 4));
    };
    bote.input.addEventListener('input', resumir);
    cuota.input.addEventListener('input', resumir);
    resumir();
    pintaSaldo();

    girar.addEventListener('click', () => {
        haciaUsdc = !haciaUsdc;
        pintaPar();
        resumir();
        pintaSaldo();
    });

    crear.addEventListener('click', () => pedirContrasena());

    /**
     * Antes de pedir la contraseña se repasa lo que el contrato va a exigir. Que
     * lo rechace la cadena también protege, pero cuesta gas y un minuto de espera.
     */
    function pedirContrasena() {
        salida.innerHTML = '';
        const dep = Number(bote.input.value);
        const cuo = Number(cuota.input.value);
        const min = entra().min;
        if (!(dep > 0) || !(cuo > 0)) return malo(t('Escribe el bote y la cuota.'));
        if (cuo > dep) return malo(t('La cuota no puede ser mayor que el bote.'));
        if (cuo < min) return malo(t('Cada compra tiene que ser de al menos {0} {1}.', min, entra().simbolo));

        const cClave = elemento('div', null, 'campo');
        const l = document.createElement('label');
        l.setAttribute('for', 'dca-clave');
        l.textContent = t('Contraseña de la cartera');
        const i = document.createElement('input');
        i.type = 'password';
        i.id = 'dca-clave';
        i.autocomplete = 'off';
        cClave.append(l, i);
        salida.append(
            elemento('p', t('Se ingresa el bote entero ({0} {1}) en el contrato ahora mismo. Lo que no se llegue a gastar se recupera al cerrar el plan.', numero(dep), entra().simbolo), 'nota'),
            cClave,
        );
        const firmar = document.createElement('button');
        firmar.textContent = t('Firmar y crear');
        firmar.addEventListener('click', () => mandar({ contrasena: i.value }, dep, cuo));
        salida.append(firmar);
        boveda.bioEstado().then((b) => {
            if (!b || !b.activada) return;
            const h = document.createElement('button');
            h.className = 'secundario';
            h.textContent = t('Firmar con huella');
            h.addEventListener('click', () => mandar({ huella: true }, dep, cuo));
            salida.append(h);
        }).catch(() => { /* si no se puede preguntar, se firma con la contraseña */ });
    }

    async function mandar(comoFirmar, dep, cuo) {
        salida.innerHTML = '';
        // La escalera de pasos: con el dinero en el aire hay que ver por dónde va.
        // Ver `pasos.js` para el porqué.
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
            const firmado = await boveda.firmarCrearDca({
                ...comoFirmar,
                carteraId: kda.carteraId,
                networkId: ctx.red.networkId,
                haciaUsdc,
                deposito: dep,
                cuota: cuo,
                periodo: String(cada.sel.value),
                deslizamiento: Number(desliz.sel.value),
            });
            esc.empieza(1);
            const rk = await enviarComando(ctx.red.nodo, ctx.red.networkId, '2', firmado);
            // La referencia, en cuanto el nodo acepta y con botón de copiar: a
            // partir de aquí es lo único con lo que averiguar en qué quedó esto.
            detras.append(lineaCopiable(t('Referencia de la transacción'), rk,
                t('Con ella se mira luego en qué quedó, aquí o en el explorador.')));
            esc.empieza(2);

            const r = await esperarResultado(ctx.red.nodo, ctx.red.networkId, '2', rk, { alMirar: parteDelNodo(esc) });
            if (!r) {
                esc.falla();
                detras.append(elemento('p', t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), 'malo'));
            } else if (r.result && r.result.status === 'success') {
                esc.acaba();
                salida.append(elemento('p', t('✓ Plan creado y confirmado en la cadena.')));
                const ver = document.createElement('button');
                ver.className = 'secundario';
                ver.textContent = t('Ver mis planes');
                ver.addEventListener('click', () => pintarDca(raiz, ctx));
                salida.append(ver);
            } else {
                esc.falla();
                const motivo = (r.result && r.result.error && r.result.error.message) || t('el contrato lo rechazó');
                detras.append(elemento('p', t('La transacción entró en un bloque pero falló: {0}', motivo), 'malo'));
            }
        } catch (e) {
            esc.falla();
            detras.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
    }

    function malo(texto) {
        salida.append(elemento('p', texto, 'malo'));
    }

    return c;
}
