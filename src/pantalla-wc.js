// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SECCION CONECTAR: firmar en paginas web de Kadena (WalletConnect).
//
// El camino es el que espera cualquiera con un movil en la mano: la pagina saca
// un codigo QR en el ordenador, se lee con la camara, se eligen las apuestas o lo
// que sea EN LA WEB, y cuando pide firmar la firma sale de aqui.
//
// POR QUE EL TRANSPORTE VIVE MIENTRAS ESTA PANTALLA ESTA ABIERTA Y NO SIEMPRE:
// mantener el socket del rele abierto todo el rato gasta bateria y no sirve de
// nada mientras no haya nada que firmar. Sin notificaciones push -que son un
// proyecto aparte- una peticion solo puede llegar con la app delante, asi que se
// dice claramente en pantalla en vez de prometer algo que no se cumple.
//
// LO QUE DE VERDAD IMPORTA DE ESTE FICHERO es lo que se enseña antes de firmar:
// cuanto se autoriza mover y a quien, en grande; debajo, que se ejecuta, en que
// red y chain y cuanto gas como maximo. Si el comando no se entiende, se dice y
// se pide que no se firme. Un monedero que enseña un churro hexadecimal y un
// boton verde no esta pidiendo permiso: esta pidiendo un clic.

import { t } from './idioma.js';
import { escanear } from './qr.js';
import { boveda } from './boveda/contrato.js';
import { nombreCartera } from './nombres.js';
import { corta } from './direccion.js';
import * as wc from './lib/walletconnect.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function caja() { return elemento('div', null, 'caja'); }

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', alPulsar);
    return b;
}

function fila(etiqueta, valor) {
    const f = elemento('div', null, 'fila');
    f.append(elemento('span', etiqueta), elemento('span', valor, 'der'));
    return f;
}

export function pintarWalletConnect(raiz, ctx) {
    raiz.innerHTML = '';

    // Las cuentas llegan PLANAS (una fila por cuenta, con su carteraId y el nombre
    // de la cartera al lado), no agrupadas por cartera: es la misma forma que usan
    // el envio y el puente.
    const cuentasKadena = () => (ctx.cuentas || []).filter((x) => x.tipo === 'kda' && x.cuenta);
    const c = caja();
    raiz.append(c);

    const estado = elemento('p', '', 'nota');
    const listaSesiones = elemento('div');
    const zonaPeticion = elemento('div');

    c.append(elemento('p', t('Lee el código QR que te enseña la web y firma aquí lo que te pida. Mientras esta pantalla esté abierta, Koberlet escucha.'), 'nota'));

    const leer = boton(t('Leer código QR'), async () => {
        try {
            const texto = await escanear();
            if (!texto) return;
            await conectar(texto);
        } catch (e) {
            estado.textContent = t(String(e.message || e));
            estado.className = 'malo';
        }
    }, 'principal');
    c.append(leer);

    // Pegar a mano sigue estando: hay webs que dan el enlace y no el QR, y cuando
    // el codigo se lee mal por reflejos, poder pegarlo salva la situacion.
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.placeholder = 'wc:…';
    campo.autocapitalize = 'off';
    campo.spellcheck = false;
    c.append(campo);
    c.append(boton(t('Pegar enlace'), () => conectar(campo.value), 'secundario'));
    c.append(estado, listaSesiones, zonaPeticion);

    // Los fallos que se pueden explicar sin jerga. Los tres primeros son los que
    // antes salian todos como un «Conectando…» que no acababa nunca.
    const EXPLICACION = {
        WC_URI_MALA: () => t('Eso no es un enlace de conexión. Tiene que empezar por «wc:» y lo da la propia web junto al código QR.'),
        WC_SIN_RELE: () => t('No se ha podido abrir la conexión con el servidor de enlace. Comprueba que tienes internet y vuelve a intentarlo; si estás en una wifi de hotel o de oficina, prueba con los datos del móvil.'),
        WC_SIN_RESPUESTA: () => t('El enlace no ha respondido. Suele ser que el código QR ya había caducado: vuelve a sacarlo en la web, que cambia cada vez, y léelo otra vez.'),
    };

    function explica(e) {
        const m = String((e && e.message) || e);
        const codigo = Object.keys(EXPLICACION).find((k) => m.includes(k));
        return codigo ? EXPLICACION[codigo]() : t(m);
    }

    async function conectar(uri) {
        estado.className = 'nota';
        try {
            // Se dice en qué paso va y no un «Conectando…» para todo: cuando algo
            // se atasca, saber si fue al abrir la conexión o al leer el enlace es
            // la diferencia entre arreglarlo y volver a probar a ciegas.
            estado.textContent = t('Abriendo la conexión…');
            await arrancarSiHaceFalta();
            estado.textContent = t('Leyendo el enlace…');
            await wc.emparejar(uri);
            campo.value = '';
            estado.textContent = t('Enlace aceptado. Esperando a que la web pida la conexión…');
        } catch (e) {
            estado.className = 'malo';
            estado.textContent = explica(e);
        }
    }

    let arrancado = false;
    async function arrancarSiHaceFalta() {
        if (arrancado) return;
        await wc.arrancar({ alProponer: pintarPropuesta, alPedirFirma: pintarFirma, alCerrar: pintarSesiones });
        arrancado = true;
    }

    function pintarSesiones() {
        listaSesiones.innerHTML = '';
        const lista = wc.sesiones();
        if (!lista.length) return;
        listaSesiones.append(elemento('h3', t('Webs conectadas')));
        for (const s of lista) {
            const f = caja();
            f.append(elemento('b', s.nombre), elemento('p', s.url, 'nota'));
            f.append(boton(t('Desconectar'), async () => {
                await wc.desconectar(s.topic);
                pintarSesiones();
            }, 'secundario'));
            listaSesiones.append(f);
        }
    }

    // --- Una web quiere conectarse -----------------------------------------
    function pintarPropuesta(p) {
        zonaPeticion.innerHTML = '';
        const k = caja();
        k.append(elemento('h3', t('Una web quiere conectarse')));
        k.append(elemento('b', p.nombre), elemento('p', p.url, 'nota'));
        k.append(elemento('p', t('El nombre y la dirección los dice la propia web: son una pista, no una prueba de quién es. Conecta solo si acabas de leer su código QR. Conectar no firma nada ni mueve dinero.'), 'avisa'));

        // Con que cuenta se conecta lo elige el dueño: las webs se quedan con la
        // PRIMERA que se les manda, asi que sin elegir te conectaban con la que
        // cayera y la pagina decia que tu cuenta no existe.
        const kadena = cuentasKadena();
        const sel = document.createElement('select');
        for (const x of kadena) {
            const o = document.createElement('option');
            o.value = x.carteraId;
            o.dataset.cuenta = x.cuenta;
            o.textContent = nombreCartera(x.cartera) + ' — ' + corta(x.cuenta);
            sel.append(o);
        }
        if (!kadena.length) {
            k.append(elemento('p', t('No tienes ninguna cuenta de Kadena en este aparato.'), 'malo'));
        } else {
            k.append(elemento('label', t('Conectar con esta cuenta')), sel);
        }

        k.append(boton(t('Conectar'), async () => {
            try {
                const elegida = sel.selectedOptions[0];
                if (!elegida) throw new Error('No tienes ninguna cuenta de Kadena en este aparato.');
                const publica = String(elegida.dataset.cuenta).slice(2);
                const otras = kadena.map((x) => String(x.cuenta).slice(2)).filter((x) => x !== publica);
                await wc.aprobarSesion(p.id, [publica, ...otras]);
                zonaPeticion.innerHTML = '';
                pintarSesiones();
                estado.className = 'bueno';
                estado.textContent = t('Conectado.');
            } catch (e) {
                k.append(elemento('p', t(String(e.message || e)), 'malo'));
            }
        }, 'principal'));
        k.append(boton(t('Rechazar'), async () => {
            try { await wc.rechazarSesion(p.id); } catch (_) { /* si ya caduco, da igual */ }
            zonaPeticion.innerHTML = '';
        }, 'secundario'));
        zonaPeticion.append(k);
    }

    // --- Una web pide una firma --------------------------------------------
    function pintarFirma(f) {
        zonaPeticion.innerHTML = '';
        const k = caja();
        k.append(elemento('h3', t('Te piden firmar')));
        k.append(elemento('b', f.nombre), elemento('p', f.url, 'nota'));

        for (const comando of f.comandos) {
            const d = wc.explicar(comando.cmd);
            if (!d.legible) {
                k.append(elemento('p', t('No se entiende lo que te piden firmar. No lo firmes.'), 'malo'));
                const pre = elemento('pre', d.crudo, 'mono');
                k.append(pre);
                continue;
            }
            // El dinero, primero y en grande. Lo demas es contexto.
            for (const p of d.permisos.filter((x) => x.mueveDinero)) {
                const dinero = caja();
                dinero.append(elemento('b', t('Autorizas mover {0} KDA', String(p.args[2] !== undefined ? p.args[2] : '?'))));
                dinero.append(fila(t('de'), String(p.args[0] || '')));
                dinero.append(fila(t('a'), String(p.args[1] || '')));
                k.append(dinero);
            }
            k.append(elemento('p', t('Lo que se ejecuta:'), 'nota'));
            k.append(elemento('pre', d.codigo, 'mono'));
            k.append(fila(t('Red'), d.red + ' · chain ' + d.chain));
            k.append(fila(t('Gas, como mucho'), String(d.gasMax) + ' KDA'));
            const otros = d.permisos.filter((x) => !x.mueveDinero).map((x) => x.nombre);
            if (otros.length) k.append(elemento('p', t('Otros permisos: {0}', otros.join(', ')), 'nota'));
        }

        const aviso = elemento('p', '', 'nota');
        k.append(aviso);
        k.append(boton(t('Firmar'), async () => {
            aviso.className = 'nota';
            aviso.textContent = t('Firmando…');
            try {
                const respuestas = [];
                for (const comando of f.comandos) {
                    // La cuenta con la que se firma la dice el propio comando; aqui se
                    // busca cual de las carteras de este aparato tiene esa clave.
                    const d = wc.explicar(comando.cmd);
                    const pedida = String((d.firmantes || [])[0] || '').toLowerCase();
                    const mia = cuentasKadena().find((x) => String(x.cuenta).slice(2).toLowerCase() === pedida);
                    if (!mia) throw new Error('La web pide firmar con una cuenta que no está en este aparato.');
                    const r = await boveda.firmarComandoExterno({ carteraId: mia.carteraId, cmd: comando.cmd });
                    respuestas.push({
                        commandSigData: { cmd: comando.cmd, sigs: [{ pubKey: r.pubKey, sig: r.sig }] },
                        outcome: { result: 'success', hash: r.hash },
                    });
                }
                await wc.responder(f.topic, f.id, { responses: respuestas });
                zonaPeticion.innerHTML = '';
                estado.className = 'bueno';
                estado.textContent = t('Firmado y devuelto a la web.');
            } catch (e) {
                aviso.className = 'malo';
                aviso.textContent = t(String(e.message || e));
            }
        }, 'principal'));
        k.append(boton(t('Rechazar'), async () => {
            try { await wc.fallar(f.topic, f.id, 'rechazado en el monedero'); } catch (_) { /* la sesion pudo caerse */ }
            zonaPeticion.innerHTML = '';
        }, 'secundario'));
        zonaPeticion.append(k);
    }

    // Se arranca al entrar: si quedaba una sesion viva de antes, se ve enseguida,
    // y sobre todo el socket ya esta abierto cuando se lee el QR, que es cuando
    // corre prisa -el codigo caduca-.
    estado.textContent = t('Abriendo la conexión…');
    arrancarSiHaceFalta().then(() => {
        pintarSesiones();
        estado.className = 'nota';
        estado.textContent = wc.conectadoAlRele() ? t('Listo para leer el código.') : '';
    }).catch((e) => {
        estado.className = 'malo';
        estado.textContent = explica(e);
    });
}
