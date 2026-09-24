// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// PANTALLA DE ENVIO.
//
// Aqui no se firma nada: se recogen los datos, se enseña un resumen y se le pide
// al plugin que firme. Lo que vuelve es un comando ya firmado que esta pantalla
// solo reenvia al nodo.
//
// El orden importa y es deliberado: primero el resumen con lo que va a pasar,
// despues la contrasena, y solo entonces se firma. Un monedero que manda dinero
// antes de enseñar a donde va es un monedero que acabara mandandolo mal.

import { boveda } from './boveda/contrato.js';
import { cuentaKdaValida, enviarComando, esperarResultado, pruebaSpv, rematarEntreChains } from './lib/kda.js';
import { t, locale } from './idioma.js';
import { nombreBio } from './biometria.js';
import { corta } from './direccion.js';
import { recorta } from './cifras.js';
import { pasos, parteDelNodo } from './pasos.js';
import { lineaCopiable } from './copiable.js';
import { contactosDe, guardarContacto, nombreDe } from './agenda.js';
// El lector de QR se carga solo cuando se pulsa el boton: son ~400 kB entre
// jsQR y el generador, y no tienen por que retrasar el arranque de la app.

const RESERVA_GAS = 0.11;      // lo que se deja en la chain para poder pagar el gas

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

/**
 * @param raiz       donde pintar
 * @param ctx        { cuenta, nombre, red, porChain, activos?, activo?, alVolver }
 *
 * `activos` es lo que la cuenta tiene: KDA y los fungibles que se le hayan visto,
 * cada uno con su reparto por chains. `activo` es el que se está enviando ahora.
 * Si no vienen -porque quien llama solo sabe del KDA-, se arma la lista con el KDA
 * y ya está: así esta pantalla sigue valiendo para quien la llamaba antes.
 */
export function pintarEnvio(raiz, ctx) {
    raiz.innerHTML = '';

    const activos = (ctx.activos && ctx.activos.length)
        ? ctx.activos
        : [{ simbolo: 'KDA', modulo: null, precision: 12, porChain: ctx.porChain || {} }];
    const act = ctx.activo && activos.find((x) => x.simbolo === ctx.activo.simbolo)
        ? activos.find((x) => x.simbolo === ctx.activo.simbolo)
        : activos[0];
    const esKda = !act.modulo;
    const porChain = act.porChain || {};
    // El KDA de la cuenta, que hace falta aunque se envíe otra cosa: el gas de
    // Kadena se paga en KDA SIEMPRE, y en la chain desde la que se manda.
    const kdaPorChain = (activos.find((x) => !x.modulo) || {}).porChain || {};

    const chains = Object.keys(porChain).map(Number).sort((a, b) => porChain[b] - porChain[a]);
    const c = elemento('div', null, 'caja');

    // De que cartera sale el dinero, en la misma linea del titulo. Antes no se
    // decia en ningun sitio: con varias carteras en el aparato, mandar desde la
    // que no era estaba a un despiste de distancia.
    const cab = elemento('div', null, 'cab-envio');
    cab.append(elemento('h2', t('Enviar {0}', act.simbolo)));
    if (ctx.nombre) cab.append(elemento('h2', ctx.nombre, 'cab-envio-quien'));
    c.append(cab);

    // QUÉ se envía. Solo se pinta si hay más de una cosa que enviar: un desplegable
    // de un elemento no elige nada y ocupa una línea.
    if (activos.length > 1) {
        const cTok = elemento('div', null, 'campo');
        const lTok = document.createElement('label');
        lTok.setAttribute('for', 'que-token');
        lTok.textContent = t('Qué envías');
        const selTok = document.createElement('select');
        selTok.id = 'que-token';
        activos.forEach((x) => {
            const o = document.createElement('option');
            o.value = x.simbolo;
            const total = Object.values(x.porChain || {}).reduce((n, v) => n + Number(v || 0), 0);
            o.textContent = `${x.simbolo} — ${recorta(total, Math.min(5, x.precision || 12))}`;
            if (x.simbolo === act.simbolo) o.selected = true;
            selTok.append(o);
        });
        // Cambiar de token repinta entero: el reparto por chains, el saldo y hasta
        // si se puede mandar a otra chain dependen de cuál sea.
        selTok.addEventListener('change', () => pintarEnvio(raiz, {
            ...ctx, activos, activo: activos.find((x) => x.simbolo === selTok.value),
        }));
        cTok.append(lTok, selTok);
        c.append(cTok);
    }

    if (!chains.length) {
        c.append(elemento('p', t('Esta cartera no tiene {0} en ninguna chain, así que no hay nada que enviar.', act.simbolo), 'nota'));
        c.append(botonVolver(ctx));
        raiz.append(c);
        return;
    }

    // Chain de origen: Kadena tiene 20 cadenas y el saldo vive en una concreta.
    // Se ofrece la que mas tiene, porque es lo que quiere el 90% de las veces.
    const cCh = elemento('div', null, 'campo');
    const lCh = document.createElement('label');
    lCh.setAttribute('for', 'chain');
    lCh.textContent = t('Enviar desde la chain');
    // La direccion entera no cabe y tampoco hace falta: con el principio y el
    // final se reconoce, y esta justo encima del desplegable de su chain.
    lCh.classList.add('con-cuenta');
    const dirCorta = elemento('span', corta(ctx.cuenta), 'dir');
    lCh.append(dirCorta);
    const sel = document.createElement('select');
    sel.id = 'chain';
    chains.forEach((ch) => {
        const o = document.createElement('option');
        o.value = String(ch);
        o.textContent = `${t('Chain {0}', ch)} — ${recorta(porChain[ch], Math.min(5, act.precision || 12))} ${act.simbolo}`;
        sel.append(o);
    });
    cCh.append(lCh, sel);

    // Chain de DESTINO. Hasta la 0.40.0 esto no se preguntaba y todo iba dentro
    // de la misma chain; quien queria mover KDA de una a otra tenia que hacerlo
    // en el escritorio. Si es distinta de la de origen, el envio pasa a ser un
    // «crosschain», que son dos pasos y tarda mas (ver `pintarConfirmacion`).
    const cDest = elemento('div', null, 'campo chain');
    const lDest = document.createElement('label');
    lDest.setAttribute('for', 'chain-destino');
    lDest.textContent = t('Chain');
    const selDest = document.createElement('select');
    selDest.id = 'chain-destino';
    const pintaDestinos = () => {
        selDest.innerHTML = '';
        for (let ch = 0; ch < 20; ch++) {
            const o = document.createElement('option');
            o.value = String(ch);
            // Solo el numero: la casilla va al lado de la cuenta y tiene que ser
            // estrecha. Cual es «la misma» ya lo dice la fila de arriba.
            o.textContent = String(ch);
            if (ch === Number(sel.value)) o.selected = true;
            selDest.append(o);
        }
    };
    pintaDestinos();
    sel.addEventListener('change', pintaDestinos);
    cDest.append(lDest, selDest);

    const cDestino = campo(t('Cuenta de destino'), 'para', { placeholder: t('k:…') });
    cDestino.classList.add('crece');
    const filaDestino = elemento('div', null, 'fila-campo');
    filaDestino.append(cDestino, cDest);

    // LA AGENDA. Las cuentas guardadas con nombre salen aqui arriba para no
    // tener que pegarlas cada vez. Elegir una solo RELLENA la casilla: no salta
    // ningun paso, sigue habiendo resumen, contraseña y firma.
    const cAgenda = elemento('div', null, 'campo');
    const lAgenda = document.createElement('label');
    lAgenda.setAttribute('for', 'agenda');
    lAgenda.textContent = t('Agenda');
    const selAgenda = document.createElement('select');
    selAgenda.id = 'agenda';
    const pintaAgenda = (elegida) => {
        const guardadas = contactosDe('kda');
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
            // `nombre — k:xxxxxx…xxxx`: el mote para reconocerla y el trozo de
            // cuenta para comprobar que es la que uno cree.
            o.textContent = `${g.nombre} — ${corta(g.cuenta)}`;
            if (g.cuenta === elegida) o.selected = true;
            selAgenda.append(o);
        });
        selAgenda.disabled = !guardadas.length;
    };
    pintaAgenda(null);
    selAgenda.addEventListener('change', () => {
        if (!selAgenda.value) return;
        document.getElementById('para').value = selAgenda.value;
        salida.innerHTML = '';
    });
    cAgenda.append(lAgenda, selAgenda);

    // Escanear es lo que evita el error caro: 66 caracteres tecleados a mano.
    const escanea = document.createElement('button');
    escanea.className = 'secundario';
    escanea.textContent = t('Escanear un código QR');
    escanea.addEventListener('click', async () => {
        const { escanear, cobroDeQr } = await import('./qr.js');
        const leido = await escanear();
        if (!leido) return;                       // el usuario cancelo
        aplicarCobro(cobroDeQr(leido));
    });

    // El QR puede traer, ademas de la cuenta, cuanto piden y en que chain (los que
    // genera la pantalla de Recibir). Se rellenan las casillas y ya esta: se
    // rellena, no se envia. El resumen, la contraseña y la firma siguen igual.
    //
    // Lo usan dos: el boton de escanear de aqui y el QR que abre la app desde la
    // camara del movil. El mismo codigo para los dos, para que un cobro que entra
    // por la camara del sistema no tenga menos comprobaciones que el otro.
    function aplicarCobro(cobro) {
        document.getElementById('para').value = cobro.cuenta;
        selAgenda.value = '';
        salida.innerHTML = '';
        if (cobro.cantidad !== null) document.getElementById('cantidad').value = String(cobro.cantidad);
        if (cobro.chain !== null) selDest.value = String(cobro.chain);
        if (!cuentaKdaValida(cobro.cuenta)) {
            salida.append(elemento('p', t('Ese código no lleva una cuenta Kadena válida. Repásalo antes de enviar nada.'), 'malo'));
        } else if (cobro.cantidad !== null || cobro.chain !== null) {
            const quien = nombreDe(cobro.cuenta);
            salida.append(elemento('p', cobro.cantidad !== null
                ? t('El código pide {0} KDA en la chain {1}. Repásalo: lo envías tú.', cobro.cantidad, cobro.chain !== null ? cobro.chain : selDest.value)
                : t('El código pide cobrar en la chain {0}.', cobro.chain), 'nota'));
            if (quien) salida.append(elemento('p', t('Esa cuenta la tienes guardada como «{0}».', quien), 'nota'));
        }
    }

    // Guardar en la agenda lo que hay escrito en el destino. Se pide el nombre
    // aqui mismo, sin sacar al usuario de la pantalla a medio envio.
    const guarda = document.createElement('button');
    guarda.className = 'secundario';
    guarda.textContent = t('Guardar esta cuenta en la agenda');
    const filaGuarda = elemento('div', null, 'fila-campo');
    filaGuarda.hidden = true;
    const cNombre = campo(t('Nombre para esta cuenta'), 'agenda-nombre', { placeholder: t('Casa de cambio, Juan…'), maxLength: 40 });
    cNombre.classList.add('crece');
    const acepta = document.createElement('button');
    acepta.textContent = t('Guardar');
    const cAcepta = elemento('div', null, 'campo');
    cAcepta.append(elemento('label', ' '), acepta);
    filaGuarda.append(cNombre, cAcepta);
    guarda.addEventListener('click', () => {
        salida.innerHTML = '';
        const para = document.getElementById('para').value.trim();
        if (!cuentaKdaValida(para)) {
            return salida.append(elemento('p', t('Esa cuenta de destino no es válida para Kadena.'), 'malo'));
        }
        filaGuarda.hidden = false;
        const previo = nombreDe(para);
        if (previo) document.getElementById('agenda-nombre').value = previo;
        document.getElementById('agenda-nombre').focus();
    });
    acepta.addEventListener('click', () => {
        salida.innerHTML = '';
        const para = document.getElementById('para').value.trim();
        const nombre = document.getElementById('agenda-nombre').value;
        try {
            const g = guardarContacto({ nombre, cuenta: para });
            filaGuarda.hidden = true;
            document.getElementById('agenda-nombre').value = '';
            pintaAgenda(g.cuenta);
            salida.append(elemento('p', t('Guardada en la agenda como «{0}».', g.nombre), 'bueno'));
        } catch (e) {
            salida.append(elemento('p', t(String(e.message || e)), 'malo'));
        }
    });
    // El QR va DEBAJO de la fila, no dentro del campo: metido en la mitad
    // izquierda se queda del ancho de un sello.

    const cCantidad = campo(t('Cantidad en {0}', act.simbolo), 'cantidad', { type: 'text', inputMode: 'decimal', placeholder: '0.0' });

    // MAX: el saldo de la chain menos el colchon del gas. Existe porque sin el la
    // gente escribe el saldo entero, no queda para el gas y la transaccion se cae
    // despues de firmarla.
    //
    // Va PEQUEÑO y arriba, en la etiqueta de la cantidad. Estaba de boton ancho
    // justo encima de «Continuar», que es el sitio donde uno va con el pulgar a
    // seguir: un roce ahi y te cambia la cantidad por todo lo que tienes. Un boton
    // que vacia la cuenta no se pone en el camino del dedo.
    const max = document.createElement('button');
    max.type = 'button';
    max.className = 'mini';
    max.textContent = t('Máx.');
    max.title = t('Todo lo que hay en esta chain, dejando lo justo para el gas');
    max.addEventListener('click', () => {
        // La reserva de gas solo se le quita al KDA: el gas se paga en KDA, así que
        // de un token se puede mandar TODO lo que hay -lo que hace falta es que
        // quede KDA en esa chain, y de eso avisa el botón de continuar-.
        const hay = porChain[Number(sel.value)] || 0;
        const disponible = esKda ? Math.max(0, hay - RESERVA_GAS) : hay;
        document.getElementById('cantidad').value = String(Math.floor(disponible * 1e8) / 1e8);
    });
    const lCantidad = cCantidad.querySelector('label');
    lCantidad.classList.add('con-cuenta');
    lCantidad.append(max);

    const salida = elemento('div');

    const seguir = document.createElement('button');
    seguir.textContent = t('Continuar');
    seguir.addEventListener('click', () => {
        salida.innerHTML = '';
        const para = document.getElementById('para').value.trim();
        const cantidad = Number(String(document.getElementById('cantidad').value).replace(',', '.'));
        const chain = Number(sel.value);

        if (!cuentaKdaValida(para)) return salida.append(elemento('p', t('Esa cuenta de destino no es válida para Kadena.'), 'malo'));
        if (!(cantidad > 0)) return salida.append(elemento('p', t('Escribe una cantidad mayor que cero.'), 'malo'));
        const disponible = porChain[chain] || 0;
        if (esKda) {
            if (cantidad > disponible - RESERVA_GAS + 1e-9) {
                return salida.append(elemento('p',
                    // El «como mucho» va con los 8 decimales de verdad: es un numero
                    // para copiar en la casilla, no para leer de pasada, y recortado
                    // por arriba mandaria mas de lo que se puede.
                    t('En la chain {0} hay {1} KDA y hay que dejar {2} para el gas. Como mucho puedes enviar {3}.',
                        chain, recorta(disponible), RESERVA_GAS, Math.floor(Math.max(0, disponible - RESERVA_GAS) * 1e8) / 1e8),
                    'malo'));
            }
        } else {
            if (cantidad > disponible + 1e-9) {
                return salida.append(elemento('p',
                    t('En la chain {0} solo hay {1} {2}.', chain, recorta(disponible, Math.min(5, act.precision || 12)), act.simbolo),
                    'malo'));
            }
            // El gas se paga en KDA y en ESTA chain. Sin él la transacción ni
            // arranca, y el error que devuelve el nodo -«no value found in
            // coin_coin-table»- no se lo explica a nadie.
            const gas = kdaPorChain[chain] || 0;
            if (gas < RESERVA_GAS) {
                return salida.append(elemento('p',
                    t('Para mandar {0} desde la chain {1} hace falta algo de KDA ahí para el gas, y solo hay {2}.',
                        act.simbolo, chain, recorta(gas)),
                    'malo'));
            }
        }
        if (para === ctx.cuenta && Number(selDest.value) === chain) {
            return salida.append(elemento('p', t('El destino es esta misma cuenta y la misma chain: no tiene sentido y pagarías gas para nada.'), 'malo'));
        }

        const chainDestino = Number(selDest.value);
        if (chainDestino !== chain && !esKda) {
            // Pasar un token de una chain a otra es otro contrato distinto -cada
            // fungible tiene el suyo- y no está hecho. Decirlo es mejor que firmar
            // algo que se quedaría a medias.
            return salida.append(elemento('p',
                t('De momento solo el KDA se puede pasar de una chain a otra desde el móvil. Elige la misma chain de destino.'), 'malo'));
        }
        if (chainDestino !== chain && !para.startsWith('k:')) {
            return salida.append(elemento('p', t('Entre chains solo se puede enviar a una cuenta k:: hace falta saber la llave de quien recibe.'), 'malo'));
        }
        if (chainDestino !== chain && para === ctx.cuenta) {
            // Mandarse a uno mismo a otra chain SI tiene sentido: es como se
            // reparte el saldo entre cadenas.
            salida.innerHTML = '';
        }

        pintarConfirmacion(raiz, { ...ctx, activos, activo: act }, { para, cantidad, chain, chainDestino, activo: act });
    });

    c.append(cCh, cAgenda, filaDestino, escanea, guarda, filaGuarda, cCantidad, seguir, salida, botonVolver(ctx));
    raiz.append(c);

    // Un cobro que llega de fuera (el QR que abre la app) se aplica al final, con
    // los campos ya puestos en la pagina.
    if (ctx.cobro) aplicarCobro(ctx.cobro);
}

function botonVolver(ctx) {
    const b = document.createElement('button');
    b.className = 'secundario';
    b.textContent = t('Volver');
    b.addEventListener('click', () => ctx.alVolver());
    return b;
}

function pintarConfirmacion(raiz, ctx, envio) {
    raiz.innerHTML = '';

    const aviso = elemento('div', null, 'caja avisa');
    aviso.append(elemento('p', t('Repasa esto con calma: una transferencia en la cadena no se puede deshacer ni reclamar a nadie.'), null));
    raiz.append(aviso);

    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Confirmar el envío')));

    const entreChains = envio.chainDestino !== undefined && envio.chainDestino !== envio.chain;
    const resumen = [
        [t('Envías'), `${envio.cantidad} ${(envio.activo && envio.activo.simbolo) || 'KDA'}`],
        [t('Desde'), t('Chain {0}', envio.chain)],
        [t('Hasta'), t('Chain {0}', entreChains ? envio.chainDestino : envio.chain)],
        [t('A'), envio.para],
        [t('Red'), ctx.red.nombre],
    ];
    resumen.forEach(([izq, der]) => {
        const f = elemento('div', null, 'fila');
        f.append(elemento('span', izq, 'izq'), elemento('span', der, 'der'));
        c.append(f);
    });

    if (entreChains) {
        // Que esto son DOS pasos hay que decirlo ANTES, no cuando se quede a
        // medias: el primero saca el dinero de la chain de origen y el segundo lo
        // entrega en la de destino, y entre uno y otro pasan un par de minutos.
        c.append(elemento('p', t('De una chain a otra son dos pasos y tarda un par de minutos. No cierres la app hasta que diga que ha llegado; si se corta, el dinero no se pierde: se queda a medio camino y se puede rematar después con la referencia.'), 'nota'));
    }
    if (envio.para.startsWith('k:')) {
        c.append(elemento('p', t('La cuenta de destino se creará si no existe todavía.'), 'nota'));
    } else {
        c.append(elemento('p', t('Esta cuenta tiene que existir ya en esa chain; si no, el envío fallará y perderás solo el gas.'), 'nota'));
    }

    // La contrasena se pide en CADA envio, aunque la cartera este abierta: es lo
    // unico que separa "tengo el movil en la mano" de "puedo mover el dinero".
    const cp = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', 'clave');
    l.textContent = t('Contraseña de la cartera');
    const fila = elemento('div', null, 'pwd');
    const i = document.createElement('input');
    i.type = 'password';
    i.id = 'clave';
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

    // Con la identificación activada, la contraseña no hace falta teclearla: el
    // chip la desenvuelve tras identificarte. Se pide igual en CADA envío -no es
    // «ya estás dentro, pasa»-, solo que ahora se pide con el dedo o con la cara.
    let conBio = null;
    let enMarcha = false;
    boveda.bioEstado().then((bio) => {
        if (!bio || !bio.activada) return;
        conBio = document.createElement('button');
        conBio.className = 'secundario';
        conBio.textContent = t('Firmar con {0}', nombreBio(bio));
        conBio.addEventListener('click', () => mandar({ huella: true }));
        // Si la firma ya iba en marcha cuando llegó la respuesta, este botón NO
        // puede aparecer: seria una segunda firma del mismo envio a un toque.
        conBio.hidden = enMarcha;
        enviar.after(conBio);
        // Con la identificación, la contraseña queda de respaldo y no como paso obligatorio.
        l.textContent = t('Contraseña de la cartera (o firma con {0})', nombreBio(bio));
    }).catch(() => { /* sin identificación, todo sigue como siempre */ });

    async function mandar(comoFirmar) {
        // Dos toques seguidos no son dos envios. El de la contraseña se escondia,
        // pero el de la huella se quedaba puesto y encima ENCIMA: se podia firmar
        // el mismo envio dos veces mientras el primero estaba en el aire
        // (lo aviso un probador el 17/09/2026).
        if (enMarcha) return;
        enMarcha = true;
        estado.innerHTML = '';

        // Los botones DESAPARECEN mientras esto corre, no se quedan grises. Un botón
        // gris sigue pareciendo el sitio donde hay que pulsar, y aquí lo que se
        // quiere es que se mire la escalera de pasos, que es lo único que pasa. Y
        // «Atrás» a mitad de una firma es cerrar la pantalla sin saber si el dinero
        // ha salido.
        enviar.hidden = true;
        if (conBio) conBio.hidden = true;
        atras.disabled = true;

        const p = pasos(entreChains ? [
            t('Firmar en el móvil'),
            t('Mandar la transacción al nodo'),
            { que: t('Esperar a que entre en un bloque'), tarda: true },
            { que: t('Recoger la prueba para la otra chain'), tarda: true },
            t('Entregarlo en la chain de destino'),
        ] : [
            t('Firmar en el móvil'),
            t('Mandar la transacción al nodo'),
            { que: t('Esperar a que entre en un bloque'), tarda: true },
        ]);
        estado.append(p.caja);
        const detras = elemento('div');
        estado.append(detras);
        p.empieza(0);

        try {
            const comun = {
                ...comoFirmar,
                carteraId: ctx.carteraId,
                networkId: ctx.red.networkId,
                chain: String(envio.chain),
                para: envio.para,
                cantidad: envio.cantidad,
            };
            // Tres caminos distintos y cada uno su firma: entre chains es un
            // «defpact» de dos pasos, un token es otro contrato, y el KDA en la
            // misma chain es el caso de siempre.
            const act = envio.activo;
            const firmado = entreChains
                ? await boveda.firmarEnvioCrossKda({ ...comun, chainDestino: String(envio.chainDestino) })
                : (act && act.modulo)
                    ? await boveda.firmarEnvioToken({
                        ...comun, modulo: act.modulo, precision: act.precision || 12,
                    })
                    : await boveda.firmarEnvioKda(comun);

            p.empieza(1);
            const requestKey = await enviarComando(ctx.red.nodo, ctx.red.networkId, String(envio.chain), firmado);

            // La referencia se pinta EN CUANTO el nodo la acepta. A partir de aquí
            // el dinero ya se ha movido: si el móvil se apaga ahora, esa referencia
            // es lo único con lo que averiguar qué pasó.
            detras.append(lineaCopiable(t('Referencia de la transacción'), requestKey,
                t('Con ella se mira luego en qué quedó, aquí o en el explorador.')));
            p.empieza(2);

            // Entre chains se espera 5 minutos y no 90 segundos. Un bloque de
            // Kadena son unos 30 s, y con la red cargada el primer paso puede
            // tardar varios: con la espera corta la app cantaba un fallo que no
            // existía y la gente volvía a enviar. Dentro de una misma chain la
            // espera se queda como estaba, que ahí sí es rápido.
            const r = await esperarResultado(ctx.red.nodo, ctx.red.networkId, String(envio.chain), requestKey,
                { alMirar: parteDelNodo(p), ...(entreChains ? { intentos: 60 } : {}) });
            if (!r) {
                // Importante no mentir aqui: que no aparezca a tiempo no quiere
                // decir que haya fallado.
                p.enCamino();
                detras.append(elemento('p', '⏳ ' + t('Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.'), 'avisa'));
            } else if (r.result && r.result.status === 'success') {
                if (entreChains) {
                    await segundoPaso(requestKey, p, detras);
                } else {
                    p.acaba();
                    detras.append(elemento('p', t('✓ Enviado y confirmado en la cadena.'), null));
                    detras.append(elemento('p', t('Gas gastado: {0}', r.gas ?? '—'), 'nota'));
                }
            } else {
                p.falla();
                const motivo = (r.result && r.result.error && r.result.error.message) || t('el contrato lo rechazó');
                detras.append(elemento('p', t('La transacción entró en un bloque pero falló: {0}', motivo), 'malo'));
            }
            // Aquí ya no se firma nada: el botón pasa a ser «Volver», así que el de
            // la identificación se queda fuera y `enMarcha` sigue puesto.
            enviar.textContent = t('Volver');
            enviar.hidden = false;
            enviar.onclick = () => ctx.alVolver();
        } catch (e) {
            // La escalera NO se borra al fallar: en cuál se torció es lo primero que
            // hay que saber, porque fallar antes de mandar la transacción y fallar
            // después es la diferencia entre que el dinero haya salido o no.
            p.falla();
            detras.append(elemento('p', t(String(e.message || e)), 'malo'));
            // Esto sí se puede volver a intentar: aquí no ha salido nada, así que
            // vuelven los dos botones de firmar y se suelta el cerrojo.
            enMarcha = false;
            enviar.hidden = false;
            if (conBio) conBio.hidden = false;
        } finally {
            atras.disabled = false;
        }
    }

    /**
     * El segundo paso de un envio entre chains: recoger la prueba y entregarlo.
     *
     * Aqui ya no hay nada que firmar -la prueba es la autorizacion- y el gas lo
     * paga la gasolinera de la red. Lo importante de esta funcion es lo que dice
     * cuando algo se tuerce: el dinero NO se ha perdido, se ha quedado a medio
     * camino, y con la referencia se remata luego.
     */
    async function segundoPaso(pactId, p, detras) {
        const destino = String(envio.chainDestino);
        detras.append(elemento('p', t('El dinero ha salido de la chain {0}.', envio.chain), 'nota'));
        p.empieza(3);

        try {
            const prueba = await pruebaSpv(ctx.red.nodo, ctx.red.networkId, String(envio.chain), pactId, destino);
            p.empieza(4);
            const rk2 = await rematarEntreChains(ctx.red.nodo, ctx.red.networkId, destino, pactId, prueba);
            const r2 = await esperarResultado(ctx.red.nodo, ctx.red.networkId, destino, rk2, { alMirar: parteDelNodo(p), intentos: 60 });
            if (r2 && r2.result && r2.result.status === 'success') {
                p.acaba();
                detras.append(elemento('p', t('✓ Ha llegado a la chain {0}.', destino)));
            } else {
                // Tampoco esto es un fallo: el dinero está a medio camino, que es
                // justo lo que dice el texto. En rojo, nadie lo lee así.
                p.enCamino();
                detras.append(elemento('p', '⏳ ' + t('El dinero salió de la chain {0} pero el segundo paso no ha entrado todavía. No se ha perdido: se queda a medio camino y se puede rematar con esta referencia, desde aquí o desde el escritorio.', envio.chain), 'avisa'));
            }
        } catch (e) {
            p.enCamino();
            detras.append(elemento('p', t(String(e.message || e)), 'malo'));
            detras.append(elemento('p', '⏳ ' + t('El dinero salió de la chain {0} pero el segundo paso no ha entrado todavía. No se ha perdido: se queda a medio camino y se puede rematar con esta referencia, desde aquí o desde el escritorio.', envio.chain), 'avisa'));
        }
    }

    c.append(enviar, estado);
    const atras = document.createElement('button');
    atras.className = 'secundario';
    atras.textContent = t('Atrás');
    atras.addEventListener('click', () => pintarEnvio(raiz, ctx));
    c.append(atras);
    raiz.append(c);
}
