// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// PRIMER USO Y DESBLOQUEO.
//
// Tres situaciones y una pantalla para cada una:
//
//   no hay cartera  -> bienvenida: crear o importar
//   hay y cerrada   -> desbloqueo
//   hay y abierta   -> la app (la lleva main.js)
//
// La semilla se enseña UNA vez, al crearla, y despues se pide confirmar dos
// palabras sueltas. No es burocracia: quien no la apunta pierde el dinero el dia
// que se le rompe el movil, y a esas alturas ya no hay nada que hacer.

import { boveda, contrasenaDebil, MIN_CONTRASENA } from './boveda/contrato.js';
import { nombreBio } from './biometria.js';
import { t, locale, idiomaActual, fijarIdioma } from './idioma.js';
import { selectorRed } from './cartera-activa.js';
import { REDES_KDA, CHAINS } from './config.js';
import { saldoKda, cuentaKdaValida } from './lib/kda.js';
import { esNativo } from './red.js';

const $ = (id) => document.getElementById(id);

// --- Piezas de interfaz -----------------------------------------------------
function caja(clase) {
    const d = document.createElement('div');
    d.className = 'caja' + (clase ? ' ' + clase : '');
    return d;
}

function titulo(texto, nivel = 'h2') {
    const h = document.createElement(nivel);
    h.textContent = texto;
    return h;
}

function parrafo(texto, clase) {
    const p = document.createElement('p');
    if (clase) p.className = clase;
    p.textContent = texto;
    return p;
}

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    // Se le pasa el evento al manejador: algunos botones cambian su propio texto
    // para avisar de lo que acaban de hacer.
    b.addEventListener('click', (e) => alPulsar(e));
    return b;
}

// Campo de contraseña con el ojito de ver/ocultar, como en el resto de las
// aplicaciones DNNS: escribir una contraseña larga a ciegas en un movil es la
// mejor forma de equivocarse dos veces seguidas.
function campoClave(etiqueta, id) {
    const envoltura = document.createElement('div');
    envoltura.className = 'campo';
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiqueta;
    const fila = document.createElement('div');
    fila.className = 'pwd';
    const i = document.createElement('input');
    i.type = 'password';
    i.id = id;
    i.autocomplete = 'off';
    const ojo = document.createElement('button');
    ojo.type = 'button';
    ojo.className = 'ojo';
    ojo.textContent = '👁';
    ojo.setAttribute('aria-label', t('Ver u ocultar la contraseña'));
    ojo.addEventListener('click', () => {
        i.type = i.type === 'password' ? 'text' : 'password';
        ojo.textContent = i.type === 'password' ? '👁' : '🙈';
    });
    fila.append(i, ojo);
    envoltura.append(l, fila);
    return envoltura;
}

function aviso(texto) {
    const c = caja('avisa');
    c.textContent = texto;
    return c;
}

function error(contenedor, texto) {
    let e = contenedor.querySelector('.malo');
    if (!e) {
        e = document.createElement('p');
        e.className = 'malo';
        contenedor.append(e);
    }
    e.textContent = texto;
}

// --- Pantallas --------------------------------------------------------------
export function pintarBienvenida(raiz, { motor, alTerminar }) {
    raiz.innerHTML = '';
    if (delata(motor)) raiz.append(bandaSimulada());

    // El mismo interruptor de idioma que en la portada, y por el mismo motivo:
    // esta es la primera pantalla que ve alguien que estrena la app.
    const c = caja('portada');
    c.append(botonIdioma(() => pintarBienvenida(raiz, { motor, alTerminar })));
    c.append(
        titulo(t('Todavía no hay ninguna cartera')),
        parrafo(t('Koberlet no trae ningún monedero dentro: la cartera la creas tú, y las claves se quedan en este aparato. Nadie más las tiene, así que nadie más puede recuperarlas por ti.'), 'nota'),
    );
    c.append(
        boton(t('Crear una cartera nueva'), () => pintarCrear(raiz, { motor, alTerminar })),
        boton(t('Ya tengo una: importarla'), () => pintarImportar(raiz, { motor, alTerminar }), 'secundario'),
    );

    // Restaurar desde el fichero de la bóveda TIENE que estar aquí. Quien
    // reinstala la app o estrena móvil se encuentra justo esta pantalla, y si la
    // única puerta a la copia estuviera dentro de la cartera abierta, el fichero
    // no serviría de nada exactamente el día que hace falta.
    c.append(boton(t('Restaurar una copia de seguridad'), async () => {
        const { pintarCopias } = await import('./copias.js');
        pintarCopias(raiz, {
            soloRestaurar: true,
            alVolver: () => pintarBienvenida(raiz, { motor, alTerminar }),
            alTerminar,
        });
    }, 'secundario'));
    raiz.append(c);
}

/**
 * La banda roja SOLO cuando la delata: app instalada usando la boveda de
 * desarrollo. Eso no deberia pasar nunca -el cerrojo de la 0.18.0 lo impide- y
 * si pasa hay que verlo en la primera pantalla.
 *
 * En el navegador ya no se pinta. Ahi la boveda simulada es lo normal y lo sabe
 * quien la usa; una banda roja permanente que siempre dice lo mismo no avisa de
 * nada, solo enseña a no leer las bandas rojas.
 */
function delata(motor) { return motor === 'simulada' && esNativo(); }

function bandaSimulada() {
    const b = document.createElement('div');
    b.className = 'banda-peligro';
    b.textContent = t('La app instalada está usando la bóveda de desarrollo. Esto no debería pasar: no metas aquí ninguna semilla y avísame.');
    return b;
}

function pintarCrear(raiz, ctx) {
    raiz.innerHTML = '';
    if (delata(ctx.motor)) raiz.append(bandaSimulada());

    const c = caja();
    c.append(
        titulo(t('Contraseña de la cartera')),
        parrafo(t('Con esta contraseña se cifra todo lo que se guarda en el aparato. Mínimo {0} caracteres, y no hay forma de recuperarla si se te olvida.', MIN_CONTRASENA), 'nota'),
        campoClave(t('Contraseña'), 'c1'),
        campoClave(t('Repítela'), 'c2'),
    );
    // Una cartera es de una red. La primera suele ser de Kadena, pero quien viene
    // a por el puente puede querer empezar por la de Ethereum.
    const red = selectorRed('red1');
    c.append(red.caja);
    const seguir = boton(t('Crear la cartera'), async () => {
        const a = $('c1').value, b = $('c2').value;
        const flojo = contrasenaDebil(a);
        if (flojo) return error(c, flojo);
        if (a !== b) return error(c, t('Las dos contraseñas no son iguales.'));

        seguir.disabled = true;
        seguir.textContent = t('Creando y cifrando…');
        try {
            const { semilla, cuentas } = await boveda.crear(a, undefined, red.valor());
            pintarSemilla(raiz, { ...ctx, semilla, cuentas });
        } catch (e) {
            seguir.disabled = false;
            seguir.textContent = t('Crear la cartera');
            error(c, t(String(e.message || e)));
        }
    });
    c.append(seguir, boton(t('Atrás'), () => pintarBienvenida(raiz, ctx), 'secundario'));
    raiz.append(c);
}

function pintarSemilla(raiz, ctx) {
    raiz.innerHTML = '';
    const palabras = ctx.semilla.split(' ');

    raiz.append(aviso(t('Apunta estas palabras EN PAPEL y guárdalas donde nadie las vea. Son la cartera entera: quien las tenga se lleva el dinero, y si las pierdes no hay forma de recuperarlo. No se volverán a enseñar.')));

    const c = caja();
    c.append(titulo(t('Tu semilla de recuperación')));
    const lista = document.createElement('ol');
    lista.className = 'semilla';
    palabras.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        lista.append(li);
    });
    c.append(lista);

    // En el navegador se puede copiar; en el movil no (ver seguridad.js).
    if (ctx.motor === 'simulada') {
        c.append(boton(t('Copiar'), async (e) => {
            const b = e.currentTarget;
            try {
                await navigator.clipboard.writeText(ctx.semilla);
                b.textContent = t('✓ Copiada al portapapeles');
            } catch (_) {
                b.textContent = t('No se pudo copiar: selecciónala a mano');
            }
            setTimeout(() => { b.textContent = t('Copiar'); }, 3000);
        }, 'secundario'));
    }

    c.append(boton(t('Ya la he apuntado'), () => pintarConfirmar(raiz, ctx)));
    raiz.append(c);
}

// Se piden dos palabras al azar. Si no las tiene apuntadas, aqui se entera -que
// es el momento bueno- y no dentro de dos años con el movil roto.
function pintarConfirmar(raiz, ctx) {
    const palabras = ctx.semilla.split(' ');
    const pedir = [];
    while (pedir.length < 2) {
        const n = Math.floor(Math.random() * palabras.length);
        if (!pedir.includes(n)) pedir.push(n);
    }
    pedir.sort((a, b) => a - b);

    raiz.innerHTML = '';
    const c = caja();
    c.append(titulo(t('Comprobación')), parrafo(t('Escribe las dos palabras que te pido, para asegurar que las tienes bien apuntadas.'), 'nota'));
    pedir.forEach((n, i) => {
        const campo = document.createElement('div');
        campo.className = 'campo';
        const l = document.createElement('label');
        l.setAttribute('for', 'p' + i);
        l.textContent = t('Palabra número {0}', n + 1);
        const inp = document.createElement('input');
        inp.id = 'p' + i;
        inp.autocapitalize = 'off';
        inp.spellcheck = false;
        campo.append(l, inp);
        c.append(campo);
    });
    c.append(boton(t('Comprobar'), () => {
        const bien = pedir.every((n, i) => $('p' + i).value.trim().toLowerCase() === palabras[n]);
        if (!bien) return error(c, t('Alguna no coincide. Míralas otra vez en el papel.'));
        ctx.alTerminar(ctx.cuentas);
    }));
    c.append(boton(t('Volver a verlas'), () => pintarSemilla(raiz, ctx), 'secundario'));
    raiz.append(c);
}

function pintarImportar(raiz, ctx) {
    raiz.innerHTML = '';
    if (delata(ctx.motor)) raiz.append(bandaSimulada());

    const c = caja();
    c.append(
        titulo(t('Importar una cartera')),
        parrafo(t('Las 12 o 24 palabras de tu semilla, separadas por espacios. Vale la de Chainweaver, eckoWallet o el Koberlet de escritorio: la derivación es la misma.'), 'nota'),
        parrafo(t('También vale una clave privada suelta, en hexadecimal: se reconoce sola. Ojo, esa cartera no tendrá palabras.'), 'nota'),
    );
    const campo = document.createElement('div');
    campo.className = 'campo';
    const l = document.createElement('label');
    l.setAttribute('for', 'sem');
    l.textContent = t('Semilla o clave privada');
    const ta = document.createElement('textarea');
    ta.id = 'sem';
    ta.rows = 3;
    ta.autocapitalize = 'off';
    ta.spellcheck = false;
    campo.append(l, ta);
    const red = selectorRed('red2');
    c.append(campo, red.caja, campoClave(t('Contraseña para cifrarla en este aparato'), 'c1'));

    const seguir = boton(t('Importar'), async () => {
        const flojo = contrasenaDebil($('c1').value);
        if (flojo) return error(c, flojo);
        seguir.disabled = true;
        seguir.textContent = t('Derivando y cifrando…');
        try {
            // Palabras o clave privada: se distingue por la forma, no por un
            // botón más. Una clave son 64 caracteres hex -128 en el formato de
            // algunas herramientas de Kadena- y una semilla nunca lo es.
            const escrito = ta.value.trim();
            const esClave = /^(0x)?[0-9a-fA-F]{64}$/.test(escrito) || /^(0x)?[0-9a-fA-F]{128}$/.test(escrito);
            const { cuentas } = esClave
                ? await boveda.importarClave($('c1').value, escrito, undefined, red.valor())
                : await boveda.importar($('c1').value, escrito, undefined, red.valor());
            ctx.alTerminar(cuentas);
        } catch (e) {
            seguir.disabled = false;
            seguir.textContent = t('Importar');
            error(c, t(String(e.message || e)));
        }
    });
    c.append(seguir, boton(t('Atrás'), () => pintarBienvenida(raiz, ctx), 'secundario'));
    raiz.append(c);
}

/**
 * EL EMBLEMA: el hexagono con la K.
 *
 * Va en SVG y no como imagen por dos motivos: pesa unos cientos de bytes y toma
 * el color del tema, asi que se ve igual de bien en claro que en oscuro. Es el
 * mismo dibujo que el icono del lanzador (`icono.py`).
 */
function logoKoberlet() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'logo-marca');
    svg.setAttribute('aria-hidden', 'true');

    const hex = document.createElementNS(NS, 'polygon');
    hex.setAttribute('points', '50,12 17,31 17,69 50,88 83,69 83,31');
    hex.setAttribute('fill', 'none');
    hex.setAttribute('stroke', 'currentColor');
    hex.setAttribute('stroke-width', '7');
    hex.setAttribute('stroke-linejoin', 'round');

    const k = document.createElementNS(NS, 'path');
    k.setAttribute('d', 'M38,32 h8 v13 l13,-13 h11 l-16,17 l17,19 h-11 l-14,-16 v16 h-8 z');
    k.setAttribute('fill', 'currentColor');

    svg.append(hex, k);
    return svg;
}

/**
 * El interruptor ES/EN, arriba a la derecha.
 *
 * Va AQUI y no solo en Ajustes porque Ajustes esta dentro de la cartera: quien
 * abre la app en un idioma que no entiende no puede llegar hasta alli para
 * cambiarlo. Ensena el idioma al que va a saltar, no el que hay puesto.
 */
function botonIdioma(alCambiar) {
    const otro = idiomaActual() === 'en' ? 'es' : 'en';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'idioma-portada';
    b.textContent = otro.toUpperCase();
    b.setAttribute('aria-label', otro === 'en' ? 'Switch to English' : 'Cambiar a español');
    b.addEventListener('click', () => {
        fijarIdioma(otro);
        alCambiar();
    });
    return b;
}

/** La cabecera de la portada: emblema, nombre y para que sirve esto. */
function marca() {
    const d = document.createElement('div');
    d.className = 'marca';
    const caja = document.createElement('div');
    caja.className = 'marca-caja';
    caja.append(logoKoberlet());
    const nombre = document.createElement('div');
    nombre.className = 'marca-nombre';
    const a = document.createElement('span');
    a.textContent = 'Koberl';
    const b = document.createElement('span');
    b.className = 'marca-verde';
    b.textContent = 'et';
    nombre.append(a, b);
    d.append(caja, nombre, parrafo(t('Tu monedero multi-cadena'), 'marca-lema'));
    return d;
}

/**
 * LA PORTADA: la unica pantalla que se ve con la cartera cerrada.
 *
 * Se parece a la del escritorio a proposito: es la cara de la app, la que se ve
 * cada vez que se abre y la que hay que reconocer de un vistazo -si un dia
 * apareciera otra distinta, eso ya seria una señal-.
 *
 * Debajo del boton van las dos cosas que se pueden hacer SIN abrir la carteral:
 * mirar el saldo de una cuenta cualquiera y restaurar una copia. La segunda
 * tiene que estar aqui si o si: quien estrena movil o reinstala se encuentra
 * justo esta pantalla.
 */
// `avisoCierre` y no `aviso`: en este fichero `aviso()` ya es una función, y un
// parámetro con ese nombre la tapa dentro de toda la función.
export function pintarDesbloqueo(raiz, { motor, alTerminar, avisoCierre = null }) {
    raiz.innerHTML = '';
    if (delata(motor)) raiz.append(bandaSimulada());

    const c = caja('portada');
    c.append(botonIdioma(() => pintarDesbloqueo(raiz, { motor, alTerminar, avisoCierre })));
    c.append(marca());
    // Si la app se ha cerrado sola, lo dice. Llegar aquí sin explicación se lee
    // como que algo ha fallado, y quien lo lea así dejará de fiarse de la app en
    // el momento justo en que necesita fiarse.
    if (avisoCierre) {
        const p = document.createElement('p');
        p.className = 'nota';
        p.textContent = avisoCierre;
        c.append(p);
    }
    c.append(campoClave(t('Contraseña'), 'c1'));

    const seguir = boton(t('Desbloquear'), async () => {
        seguir.disabled = true;
        seguir.textContent = t('Descifrando…');
        try {
            const { cuentas } = await boveda.abrir($('c1').value);
            alTerminar(cuentas);
        } catch (e) {
            seguir.disabled = false;
            seguir.textContent = t('Desbloquear');
            error(c, t(String(e.message || e)));
        }
    });
    c.append(seguir);

    // Si la huella está activada, se ofrece aquí -pero NO se dispara sola: un
    // diálogo de huella que salta al abrir la app enseña a la gente a poner el
    // dedo sin mirar qué le están pidiendo, y eso es justo lo que aprovecha una
    // app falsa. Lo pide quien quiere entrar.
    boveda.bioEstado().then((bio) => {
        if (!bio || !bio.activada) return;
        const conHuella = boton(t('Abrir con {0}', nombreBio(bio)), async () => {
            conHuella.disabled = true;
            try {
                const { cuentas } = await boveda.abrirConHuella();
                alTerminar(cuentas);
            } catch (e) {
                conHuella.disabled = false;
                error(c, t(String(e.message || e)));
            }
        }, 'secundario');
        seguir.after(conHuella);
    }).catch(() => { /* si no se puede preguntar, queda la contraseña de siempre */ });

    const abajo = document.createElement('div');
    abajo.className = 'portada-pies';
    abajo.append(
        enlace('👁  ' + t('Ver una cuenta sin entrar'), () => pintarMirarCuenta(raiz, { motor, alTerminar })),
        enlace('↺  ' + t('Restaurar desde una copia de seguridad'), async () => {
            const { pintarCopias } = await import('./copias.js');
            pintarCopias(raiz, {
                soloRestaurar: true,
                alVolver: () => pintarDesbloqueo(raiz, { motor, alTerminar }),
                alTerminar,
            });
        }),
    );
    c.append(abajo);

    // El pie dice con qué está cifrado y qué versión es. No es decoración: son
    // las dos cosas que hay que poder mirar sin entrar.
    c.append(parrafo('🔒  ' + t('Cifrado local AES-256') + '  ·  v' + __VERSION__, 'portada-pie'));

    raiz.append(c);
    // Enter también abre: en el móvil el teclado tapa el botón.
    c.querySelector('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') seguir.click(); });
}

function enlace(texto, alPulsar) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'enlace';
    b.textContent = texto;
    b.addEventListener('click', alPulsar);
    return b;
}

/**
 * Mirar el saldo de una cuenta SIN abrir la cartera.
 *
 * Es de solo lectura y no toca la bóveda para nada: sirve para comprobar si ha
 * llegado un pago sin tener que teclear la contraseña, que es justo lo que uno
 * no quiere hacer con gente delante.
 */
function pintarMirarCuenta(raiz, ctx) {
    raiz.innerHTML = '';
    if (delata(ctx.motor)) raiz.append(bandaSimulada());

    const red = REDES_KDA[0];
    const c = caja();
    c.append(titulo(t('Ver una cuenta sin entrar')));
    c.append(parrafo(t('Solo mira el saldo en la cadena. No abre tu cartera ni toca nada.'), 'nota'));

    const campo = document.createElement('div');
    campo.className = 'campo';
    const l = document.createElement('label');
    l.setAttribute('for', 'mirar');
    l.textContent = t('Cuenta Kadena');
    const i = document.createElement('input');
    i.id = 'mirar';
    i.spellcheck = false;
    i.autocapitalize = 'off';
    campo.append(l, i);
    c.append(campo);

    const salida = document.createElement('div');
    const ver = boton(t('Consultar saldo'), async () => {
        salida.innerHTML = '';
        const cuenta = i.value.trim();
        if (!cuentaKdaValida(cuenta)) return error(salida, t('Esa cuenta no es válida para Kadena.'));
        ver.disabled = true;
        salida.append(parrafo(t('Consultando el saldo…'), 'nota'));
        try {
            const s = await saldoKda(cuenta, { nodo: red.nodo, networkId: red.networkId, chains: CHAINS });
            salida.innerHTML = '';
            // Sin una sola respuesta no se enseña un cero: seria confundir «no
            // hay conexion» con «esta cuenta no tiene nada».
            if (s.fallos.length >= s.consultadas) {
                return error(salida, t('No ha contestado ninguna chain. Mira si tienes conexión (¿modo avión?, ¿wifi sin internet?) y vuelve a probar.'));
            }
            salida.append(parrafo(s.total.toLocaleString(locale(), { maximumFractionDigits: 6 }) + ' KDA'));
            salida.append(parrafo(t('{0} · suma de {1} chains', red.nombre, s.consultadas), 'nota'));
            if (s.fallos.length) {
                salida.append(parrafo(t('Faltan {0} chains por contestar: puede que tengas más de lo que se ve aquí.', s.fallos.length), 'malo'));
            }
        } catch (e) {
            salida.innerHTML = '';
            error(salida, t(String(e.message || e)));
        }
        ver.disabled = false;
    });
    c.append(ver, salida, boton(t('Atrás'), () => pintarDesbloqueo(raiz, ctx), 'secundario'));
    raiz.append(c);
}
