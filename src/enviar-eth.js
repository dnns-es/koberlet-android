// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// MANDAR DINERO DESDE ETHEREUM: ETH, USDC o USDT.
//
// Hasta la 0.52.2 el boton «Enviar» de una cartera de Ethereum sacaba una hoja
// diciendo que eso se hacia en el escritorio. Se habia quedado vieja: la boveda ya
// firmaba el puente y el mercado en Ethereum, asi que lo unico que faltaba era
// esto. Antonio se la encontro de frente -«me da este error»- y tenia razon.
//
// La forma es la MISMA que la del envio de Kadena (`enviar.js`), a proposito:
// casillas, «Continuar», resumen y firma. Cambiar de red no deberia cambiar donde
// esta cada cosa. Lo que cambia por debajo es todo: aqui no hay chains, el gas se
// paga en ETH y lo que se firma es una transaccion EIP-1559.
//
// TRES COSAS QUE CUESTAN DINERO SI SE IGNORAN, y por eso se comprueban antes de
// dejar firmar:
//
//   - El gas se paga en ETH SIEMPRE, tambien mandando USDC. Sin ETH en la cuenta
//     no sale ni la transaccion del token.
//   - Mandando ETH, lo que se manda y lo que paga el gas salen del mismo saldo:
//     por eso MAX descuenta el gas de ahora, preguntado, y no una cifra fija.
//   - Una direccion de Ethereum mal copiada no da error: da otra direccion, que no
//     es de nadie. Se comprueba aqui y se vuelve a comprobar en Kotlin.
//
// Y lo de siempre: de esta pantalla NO sale ninguna direccion de contrato. Viaja
// el NOMBRE del token -ETH, USDC, USDT- y el plugin elige el contrato.

import { boveda } from './boveda/contrato.js';
import { t } from './idioma.js';
import { pasos, parteDelNodo } from './pasos.js';
import { lineaCopiable } from './copiable.js';
import { contactosDe, guardarContacto, nombreDe } from './agenda.js';
import { TOKENS, aTexto, aUnidades, saldoDeToken } from './lib/ethswap.js';
import { sobreEvm, mandarRaw, esperarReciboEvm } from './lib/puente.js';
import { cuentaDeQr } from './qr.js';

/** Gas de cada envio. Sobrado: en Ethereum lo que no se usa no se cobra. */
const GAS_ETH = 21000;          // un envio de ETH son exactamente 21.000
const GAS_TOKEN = 100000;       // un `transfer` de ERC-20 anda por 50-70.000

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto !== undefined && texto !== null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function campo(etiqueta, id, opciones = {}) {
    const c = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiqueta;
    const i = document.createElement('input');
    i.id = id;
    i.spellcheck = false;
    i.autocapitalize = 'off';
    Object.assign(i, opciones);
    c.append(l, i);
    return c;
}

const direccionValida = (a) => /^0x[0-9a-fA-F]{40}$/.test(String(a || '').trim());

/**
 * Para enseñar, no para firmar. Un ETH con 18 decimales no lo lee nadie; lo que
 * se firma sigue siendo la cantidad entera.
 */
function corto(texto) {
    const [ent, dec] = String(texto).split('.');
    if (!dec) return ent;
    const d = dec.slice(0, 8).replace(/0+$/, '');
    return d ? `${ent}.${d}` : ent;
}

/**
 * Lo que puede costar el gas, en wei: el precio maximo por el limite entero.
 *
 * Se pide el `gasLimit` completo aunque casi nunca se gaste, porque para mandar
 * la transaccion tiene que estar disponible. Lo que no se usa se devuelve.
 */
async function costeGas(direccion, gasLimit) {
    const sobre = await sobreEvm(direccion, { gasLimit });
    return BigInt(sobre.maxFeePerGas) * BigInt(gasLimit);
}

/** Un QR de Ethereum puede venir pelado o como `ethereum:0x…@1`. */
function direccionDeQr(texto) {
    let leido = cuentaDeQr(texto);
    if (/^ethereum:/i.test(leido)) leido = leido.slice(9);
    const arroba = leido.indexOf('@');
    if (arroba > 0) leido = leido.slice(0, arroba);
    return leido.trim();
}

/**
 * @param raiz  donde pintar
 * @param ctx   { cuenta, nombre, carteraId, alVolver }
 */
export function pintarEnvioEth(raiz, ctx) {
    raiz.innerHTML = '';

    const c = elemento('div', null, 'caja');
    const cab = elemento('div', null, 'cab-envio');
    cab.append(elemento('h2', t('Enviar desde Ethereum')));
    if (ctx.nombre) cab.append(elemento('h2', ctx.nombre, 'cab-envio-quien'));
    c.append(cab);

    // QUE se envia. La lista es fija -las tres monedas que sabe firmar el plugin-,
    // y el saldo de cada una se pregunta al elegirla, no de golpe: son tres
    // consultas a la red y solo hace falta la de la que se manda.
    const cTok = elemento('div', null, 'campo');
    const lTok = document.createElement('label');
    lTok.setAttribute('for', 'eth-que');
    lTok.textContent = t('Qué envías');
    const selTok = document.createElement('select');
    selTok.id = 'eth-que';
    TOKENS.forEach((x) => {
        const o = document.createElement('option');
        o.value = x.simbolo;
        o.textContent = x.simbolo;
        selTok.append(o);
    });
    const saldo = elemento('span', '…', 'dir');
    lTok.classList.add('con-cuenta');
    lTok.append(saldo);
    cTok.append(lTok, selTok);

    const cDestino = campo(t('Dirección de destino'), 'eth-para', { placeholder: '0x…' });

    // LA AGENDA, la misma de siempre, filtrada por red. Elegir un contacto solo
    // RELLENA la casilla: sigue habiendo resumen, contraseña y firma.
    const cAgenda = elemento('div', null, 'campo');
    const lAgenda = document.createElement('label');
    lAgenda.setAttribute('for', 'eth-agenda');
    lAgenda.textContent = t('Agenda');
    const selAgenda = document.createElement('select');
    selAgenda.id = 'eth-agenda';
    const pintaAgenda = (elegida) => {
        const guardadas = contactosDe('evm');
        selAgenda.innerHTML = '';
        const vacia = document.createElement('option');
        vacia.value = '';
        vacia.textContent = guardadas.length
            ? t('Escribir la cuenta a mano')
            : t('La agenda está vacía: escribe la cuenta y guárdala');
        selAgenda.append(vacia);
        guardadas.forEach((g) => {
            const o = document.createElement('option');
            o.value = g.cuenta;
            o.textContent = `${g.nombre} — ${g.cuenta.slice(0, 6)}…${g.cuenta.slice(-4)}`;
            if (g.cuenta === elegida) o.selected = true;
            selAgenda.append(o);
        });
        selAgenda.disabled = !guardadas.length;
    };
    pintaAgenda(null);
    selAgenda.addEventListener('change', () => {
        if (!selAgenda.value) return;
        cDestino.querySelector('input').value = selAgenda.value;
        salida.innerHTML = '';
    });
    cAgenda.append(lAgenda, selAgenda);

    // Escanear es lo que evita el error caro: 42 caracteres tecleados a mano.
    const escanea = document.createElement('button');
    escanea.className = 'secundario';
    escanea.textContent = t('Escanear un código QR');
    escanea.addEventListener('click', async () => {
        const { escanear } = await import('./qr.js');
        const leido = await escanear();
        if (!leido) return;                       // el usuario canceló
        const a = direccionDeQr(leido);
        salida.innerHTML = '';
        cDestino.querySelector('input').value = a;
        selAgenda.value = '';
        if (!direccionValida(a)) {
            salida.append(elemento('p', t('Ese código no lleva una dirección de Ethereum válida. Repásalo antes de enviar nada.'), 'malo'));
        } else {
            const quien = nombreDe(a);
            if (quien) salida.append(elemento('p', t('Esa cuenta la tienes guardada como «{0}».', quien), 'nota'));
        }
    });

    const guarda = document.createElement('button');
    guarda.className = 'secundario';
    guarda.textContent = t('Guardar esta cuenta en la agenda');
    const filaGuarda = elemento('div', null, 'fila-campo');
    filaGuarda.hidden = true;
    const cNombre = campo(t('Nombre para esta cuenta'), 'eth-agenda-nombre', { placeholder: t('Casa de cambio, Juan…'), maxLength: 40 });
    cNombre.classList.add('crece');
    const acepta = document.createElement('button');
    acepta.textContent = t('Guardar');
    const cAcepta = elemento('div', null, 'campo');
    cAcepta.append(elemento('label', ' '), acepta);
    filaGuarda.append(cNombre, cAcepta);
    guarda.addEventListener('click', () => {
        salida.innerHTML = '';
        const para = cDestino.querySelector('input').value.trim();
        if (!direccionValida(para)) {
            return salida.append(elemento('p', t('Esa dirección de destino no es válida para Ethereum.'), 'malo'));
        }
        filaGuarda.hidden = false;
        const previo = nombreDe(para);
        if (previo) cNombre.querySelector('input').value = previo;
        cNombre.querySelector('input').focus();
    });
    acepta.addEventListener('click', () => {
        salida.innerHTML = '';
        try {
            const g = guardarContacto({
                nombre: cNombre.querySelector('input').value,
                cuenta: cDestino.querySelector('input').value.trim(),
            });
            filaGuarda.hidden = true;
            cNombre.querySelector('input').value = '';
            pintaAgenda(g.cuenta);
            salida.append(elemento('p', t('Guardada en la agenda como «{0}».', g.nombre), 'bueno'));
        } catch (e) {
            salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
    });

    const cCantidad = campo(t('Cantidad en {0}', selTok.value), 'eth-cantidad',
        { type: 'text', inputMode: 'decimal', placeholder: '0.0' });

    // MÁX va PEQUEÑO y arriba, en la etiqueta, y no de botón ancho encima de
    // «Continuar»: un botón que vacía la cuenta no se pone en el camino del dedo.
    const max = document.createElement('button');
    max.type = 'button';
    max.className = 'mini';
    max.textContent = t('Máx.');
    const lCantidad = cCantidad.querySelector('label');
    lCantidad.classList.add('con-cuenta');
    lCantidad.append(max);

    const salida = elemento('div');

    /** Lo que hay de la moneda elegida, en unidades enteras, o null si no se pudo. */
    let disponible = null;

    async function pintaSaldo() {
        const tk = TOKENS.find((x) => x.simbolo === selTok.value);
        saldo.textContent = '…';
        disponible = null;
        lCantidad.firstChild.textContent = t('Cantidad en {0}', tk.simbolo);
        try {
            const s = await saldoDeToken(tk.simbolo, ctx.cuenta);
            disponible = s;
            saldo.textContent = t('Tienes {0}', corto(aTexto(s, tk.decimales)));
        } catch (_) {
            // Saldo desconocido NO es cero: se dice, y se deja seguir. Quien manda
            // de verdad es la red, y un cero inventado se lee como «no tienes nada».
            saldo.textContent = t('no se sabe');
        }
    }

    selTok.addEventListener('change', () => { salida.innerHTML = ''; pintaSaldo(); });

    max.addEventListener('click', async () => {
        const tk = TOKENS.find((x) => x.simbolo === selTok.value);
        if (disponible === null || !(disponible > 0n)) return;
        let s = disponible;
        if (tk.simbolo === 'ETH') {
            // Mandando ETH hay que dejar para el gas, y la reserva se PREGUNTA: una
            // cifra fija se queda corta cuando la red está cara y deja MÁX en cero
            // cuando el saldo es pequeño.
            try {
                const gas = await costeGas(ctx.cuenta, GAS_ETH);
                s = s > gas ? s - gas : 0n;
            } catch (_) {
                const reserva = 1000000000000000n;      // 0,001 ETH si no se pudo preguntar
                s = s > reserva ? s - reserva : 0n;
            }
        }
        if (!(s > 0n)) return;
        cCantidad.querySelector('input').value = aTexto(s, tk.decimales);
    });

    const seguir = document.createElement('button');
    seguir.textContent = t('Continuar');
    seguir.addEventListener('click', async () => {
        salida.innerHTML = '';
        const tk = TOKENS.find((x) => x.simbolo === selTok.value);
        const para = cDestino.querySelector('input').value.trim();
        const cantidad = cCantidad.querySelector('input').value.trim();

        if (!direccionValida(para)) {
            return salida.append(elemento('p', t('Esa dirección de destino no es válida para Ethereum.'), 'malo'));
        }
        if (para.toLowerCase() === String(ctx.cuenta).toLowerCase()) {
            return salida.append(elemento('p', t('El destino es esta misma cuenta: no tiene sentido y pagarías gas para nada.'), 'malo'));
        }
        let manda;
        try {
            manda = aUnidades(cantidad, tk.decimales);
        } catch (e) {
            return salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
        if (disponible !== null && manda > disponible) {
            return salida.append(elemento('p', t('No tienes tanto {0}.', tk.simbolo), 'malo'));
        }

        // El gas, ANTES de la contraseña. Que lo diga el nodo en inglés después de
        // firmar es justo lo que Antonio se encontró en el Mercado.
        salida.append(elemento('p', t('Preguntando el gas…'), 'nota'));
        const gasLimit = tk.simbolo === 'ETH' ? GAS_ETH : GAS_TOKEN;
        let gas;
        let eth;
        try {
            [gas, eth] = await Promise.all([
                costeGas(ctx.cuenta, gasLimit),
                saldoDeToken('ETH', ctx.cuenta),
            ]);
        } catch (e) {
            salida.innerHTML = '';
            return salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
        salida.innerHTML = '';

        if (tk.simbolo === 'ETH') {
            if (disponible !== null && disponible < manda + gas) {
                const sobra = disponible > gas ? disponible - gas : 0n;
                return salida.append(elemento('p', t('No cabe el gas: enviando eso te quedarías sin con qué pagar la transacción. Con el gas de ahora puedes enviar como mucho {0} ETH.', corto(aTexto(sobra, 18))), 'malo'));
            }
        } else if (eth < gas) {
            // El gas de Ethereum se paga en ETH, tambien para mandar un token.
            return salida.append(elemento('p', t('Para mandar {0} hace falta ETH en la cuenta para el gas, y con el de ahora harían falta unos {1} ETH.', tk.simbolo, corto(aTexto(gas, 18))), 'malo'));
        }

        pintarConfirmacion(raiz, ctx, {
            token: tk, para, cantidad: aTexto(manda, tk.decimales), gasLimit, gas,
        });
    });

    const volver = document.createElement('button');
    volver.className = 'secundario';
    volver.textContent = t('Volver');
    volver.addEventListener('click', () => ctx.alVolver());

    c.append(cTok, cAgenda, cDestino, escanea, guarda, filaGuarda, cCantidad, seguir, salida, volver);
    raiz.append(c);
    pintaSaldo();
}

function pintarConfirmacion(raiz, ctx, envio) {
    raiz.innerHTML = '';

    const aviso = elemento('div', null, 'caja avisa');
    aviso.append(elemento('p', t('Repasa esto con calma: una transferencia en la cadena no se puede deshacer ni reclamar a nadie.')));
    raiz.append(aviso);

    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Confirmar el envío')));

    [
        [t('Envías'), `${corto(envio.cantidad)} ${envio.token.simbolo}`],
        [t('A'), envio.para],
        [t('Red'), 'Ethereum'],
        [t('Gas, como mucho'), `${corto(aTexto(envio.gas, 18))} ETH`],
    ].forEach(([izq, der]) => {
        const f = elemento('div', null, 'fila');
        f.append(elemento('span', izq, 'izq'), elemento('span', der, 'der'));
        c.append(f);
    });
    c.append(elemento('p', t('El gas se paga en ETH y es un máximo: lo que no se gaste no se cobra.'), 'nota'));

    const quien = nombreDe(envio.para);
    if (quien) c.append(elemento('p', t('Esa cuenta la tienes guardada como «{0}».', quien), 'nota'));

    // La contraseña se pide en CADA envío, aunque la cartera esté abierta: es lo
    // único que separa «tengo el móvil en la mano» de «puedo mover el dinero».
    const cp = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', 'eth-clave-envio');
    l.textContent = t('Contraseña de la cartera');
    const fila = elemento('div', null, 'pwd');
    const i = document.createElement('input');
    i.type = 'password';
    i.id = 'eth-clave-envio';
    i.autocomplete = 'off';
    const ojo = document.createElement('button');
    ojo.type = 'button';
    ojo.className = 'ojo';
    ojo.textContent = '👁';
    ojo.addEventListener('click', () => {
        i.type = i.type === 'password' ? 'text' : 'password';
        ojo.textContent = i.type === 'password' ? '👁' : '🙈';
    });
    fila.append(i, ojo);
    cp.append(l, fila);
    c.append(cp);

    const estado = elemento('div');
    const enviar = document.createElement('button');
    enviar.textContent = t('Firmar y enviar');
    enviar.addEventListener('click', () => mandar({ contrasena: i.value }));

    boveda.bioEstado().then((bio) => {
        if (!bio || !bio.activada) return;
        const conHuella = document.createElement('button');
        conHuella.className = 'secundario';
        conHuella.textContent = t('Firmar con huella');
        conHuella.addEventListener('click', () => mandar({ huella: true }));
        enviar.after(conHuella);
        l.textContent = t('Contraseña de la cartera (o firma con huella)');
    }).catch(() => { /* sin huella, todo sigue como siempre */ });

    async function mandar(comoFirmar) {
        estado.innerHTML = '';
        // Los botones DESAPARECEN mientras esto corre, no se quedan grises: un botón
        // gris sigue pareciendo el sitio donde hay que pulsar.
        enviar.hidden = true;
        atras.disabled = true;

        const p = pasos([
            t('Firmar en el móvil'),
            t('Mandar la transacción al nodo'),
            { que: t('Esperar a que entre en un bloque'), tarda: true },
        ]);
        estado.append(p.caja);
        const detras = elemento('div');
        estado.append(detras);
        p.empieza(0);

        try {
            // El nonce y el precio del gas se piden AHORA, no cuando se pintó el
            // resumen: entre una cosa y otra el usuario ha tecleado su contraseña, y
            // un nonce viejo es una transacción que el nodo rechaza de plano.
            const sobre = await sobreEvm(ctx.cuenta, { gasLimit: envio.gasLimit });
            const { raw } = await boveda.firmarEnvioEvm({
                ...comoFirmar,
                carteraId: ctx.carteraId,
                token: envio.token.simbolo,
                para: envio.para,
                cantidad: envio.cantidad,
                ...sobre,
            });

            p.empieza(1);
            const hash = await mandarRaw(raw);
            // El hash se pinta EN CUANTO el nodo lo acepta. A partir de aquí el
            // dinero ya se ha movido: si el móvil se apaga ahora, ese hash es lo
            // único con lo que averiguar qué pasó.
            detras.append(lineaCopiable(t('Transacción en Ethereum'), hash,
                t('Con ella se mira luego en qué quedó, aquí o en el explorador.')));
            p.empieza(2);

            const rec = await esperarReciboEvm(hash, { alMirar: parteDelNodo(p) });
            if (!rec) {
                p.falla();
                detras.append(elemento('p', t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), 'malo'));
            } else if (!rec.bien) {
                p.falla();
                detras.append(elemento('p', t('El envío entró en un bloque pero falló. El gas se ha pagado igual.'), 'malo'));
            } else {
                p.acaba();
                detras.append(elemento('p', t('✓ Enviado y confirmado en la cadena.')));
            }
            enviar.textContent = t('Volver');
            enviar.hidden = false;
            enviar.onclick = () => ctx.alVolver();
        } catch (e) {
            // La escalera NO se borra al fallar: en cuál se torció es la diferencia
            // entre que el dinero haya salido o no.
            p.falla();
            detras.append(elemento('p', t(String(e.message || e)), 'malo'));
            enviar.hidden = false;
        } finally {
            atras.disabled = false;
        }
    }

    c.append(enviar, estado);
    const atras = document.createElement('button');
    atras.className = 'secundario';
    atras.textContent = t('Atrás');
    atras.addEventListener('click', () => pintarEnvioEth(raiz, ctx));
    c.append(atras);
    raiz.append(c);
}
