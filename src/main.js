// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// Arranque de la app.
//
// Fase 1: capa de red y lectura de saldos reales (hecho).
// Fase 2: boveda y primer uso - al instalar, la app pide crear o importar la
//         cartera del dueño. Las claves viven en el plugin Kotlin; esta pantalla
//         solo ve cuentas publicas.

import './polyfill-buffer.js';
import { REDES_KDA, CHAINS, redPorClave, todasLasRedes, anadirRed, borrarRed, tokensPropios, tokensDeRed, anadirToken, borrarToken } from './config.js';
import { saldoKda, saldoTokens, tokensDelHistorial, cuentaKdaValida, alturaCadena } from './lib/kda.js';
import { caminoRed, esNativo } from './red.js';
import { prepararBoveda } from './boveda/index.js';
import { boveda } from './boveda/contrato.js';
import { pintarBienvenida, pintarDesbloqueo } from './primeruso.js';
import { avisarSiHay } from './actualizar.js';
import { pintarEnvio } from './enviar.js';
import { pintarEnvioEth } from './enviar-eth.js';
import { pintarSeguridad } from './seguridad.js';
import { precioKda, movimientos } from './lib/mercado.js';
import { montarBarra, quitarBarra, seccionActual, ir } from './navegacion.js';
import { arrancarTema, fijarTema, temaElegido } from './tema.js';
import { MONEDAS, CODIGOS, monedaElegida, fijarMoneda, formateaDinero, formateaPrecio, aKda } from './moneda.js';
import { valorDeToken, precioPuestoAMano, PRECIO_EN_KDA } from './valor.js';
import { arrancarIdioma, fijarIdioma, idiomaElegido, t, locale } from './idioma.js';
import { carteraActiva, fijarCarteraActiva, agrupaCarteras } from './cartera-activa.js';
import { corta } from './direccion.js';
import { hayQueAceptar, pintarPoliticas } from './politicas.js';
import { CANAL } from './canal.js';
import { fijarRedMercado } from './mercado-red.js';
import { formatea, recorta } from './cifras.js';
import { nombreCartera } from './nombres.js';
import { vigilarCerrojo, vigilarAtras, alFondo, TIEMPOS, minutosCerrojo, fijarMinutosCerrojo } from './salir.js';
import { contactos, borrarContacto } from './agenda.js';
import { vigilarEnlaces, recogerEnlace } from './enlace.js';

const $ = (id) => document.getElementById(id);
const app = () => $('app');

let motor = 'simulada';
let redActiva = REDES_KDA[0];

// Cada cuánto se vuelve a preguntar el precio con una hoja de cobro abierta, y a
// partir de cuándo un precio deja de poder llamarse «de ahora». Lo que se
// congela en un QR son KDA: con un cobro puesto en euros, el tiempo que pasa
// entre calcularlos y que alguien pague es dinero que se gana o se pierde.
const REFRESCO_PRECIO_MS = 30000;
const VIEJO_PRECIO_MS = 90000;
// Las cuentas de la sesion abierta, para poder volver a la pantalla principal
// desde el envio sin tener que descifrar la boveda otra vez.
let cuentasActuales = [];

// --- Piezas comunes ---------------------------------------------------------
function caja(clase) {
    const d = document.createElement('div');
    d.className = 'caja' + (clase ? ' ' + clase : '');
    return d;
}

function fila(izquierda, derecha) {
    const f = document.createElement('div');
    f.className = 'fila';
    const a = document.createElement('span'); a.className = 'izq'; a.textContent = izquierda;
    const b = document.createElement('span'); b.className = 'der'; b.textContent = derecha;
    f.append(a, b);
    return f;
}

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', alPulsar);
    return b;
}

/** Un desplegable con su etiqueta. `opciones` = [[valor, texto], …]. */
function desplegable(id, etiqueta, opciones, elegido, alCambiar) {
    const c = document.createElement('div');
    c.className = 'campo';
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiqueta;
    const sel = document.createElement('select');
    sel.id = id;
    opciones.forEach(([v, txt]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = txt;
        if (v === elegido) o.selected = true;
        sel.append(o);
    });
    sel.addEventListener('change', () => alCambiar(sel.value));
    c.append(l, sel);
    return c;
}

/**
 * Boton de copiar al portapapeles.
 *
 * Con respaldo a proposito: `navigator.clipboard` necesita contexto seguro y en
 * algunos WebView de Android no esta. Quedarse sin copiar una direccion de 66
 * caracteres obliga a teclearla a mano, y ahi es donde la gente pierde dinero.
 */
async function copiarTexto(valor) {
    try {
        await navigator.clipboard.writeText(valor);
        return true;
    } catch (_) {
        // Respaldo de toda la vida: un campo temporal y el comando de copiar.
        const campo = document.createElement('textarea');
        campo.value = valor;
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.append(campo);
        campo.select();
        let bien = false;
        try { bien = document.execCommand('copy'); } catch (_) { bien = false; }
        campo.remove();
        return bien;
    }
}

function botonCopiar(valor, rotulo) {
    const b = document.createElement('button');
    b.className = 'copiar';
    const puesto = rotulo || t('Copiar dirección');
    b.textContent = puesto;
    b.addEventListener('click', async () => {
        const bien = await copiarTexto(valor);
        b.textContent = bien ? t('✓ Copiada') : t('No se pudo copiar: mantén pulsado el texto');
        setTimeout(() => { b.textContent = puesto; }, 2500);
    });
    return b;
}

/**
 * Enseña el QR de la direccion para que otro la lea con su movil, en vez de
 * dictarla. Se pliega por defecto: el QR de tu cuenta no tiene por que estar a
 * la vista de quien mire la pantalla por encima del hombro.
 */
function botonRecibir(direccion) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Mostrar código QR para recibir');
    det.append(sum);

    let pintado = false;
    det.addEventListener('toggle', async () => {
        if (!det.open || pintado) return;
        pintado = true;
        const hueco = document.createElement('div');
        hueco.className = 'qr';
        det.append(hueco);
        try {
            const { pintarQr } = await import('./qr.js');
            hueco.append(await pintarQr(direccion));
        } catch (e) {
            hueco.append(texto('p', 'No se pudo generar el código: ' + t(String(e.message || e)), 'malo'));
        }
    });
    return det;
}

// Todo lo que viene de la red se pinta con textContent, nunca con innerHTML.
function texto(tag, contenido, clase) {
    const e = document.createElement(tag);
    e.textContent = contenido;
    if (clase) e.className = clase;
    return e;
}

// --- Pantalla principal -----------------------------------------------------
/** Punto de entrada de la app abierta: monta la barra y pinta la sección. */
async function pintarApp(cuentas) {
    cuentasActuales = cuentas;
    cabecera(true);                 // la portada la esconde; al entrar, vuelve
    montarBarra(pintarSeccion);
    await pintarSeccion(seccionActual());
}

async function pintarSeccion(id) {
    const cuentas = cuentasActuales;
    switch (id) {
        case 'carteras': {
            const { pintarListaCarteras } = await import('./carteras.js');
            $('sub').textContent = t('Carteras');
            pintarListaCarteras(app(), { motor, cuentas, alTerminar: pintarApp, alVolver: () => pintarSeccion('panel') });
            return;
        }
        case 'seguridad':
            $('sub').textContent = t('Seguridad');
            pintarSeguridad(app(), { cuentas, alVolver: () => pintarSeccion('panel') });
            return;
        case 'copias': {
            const { pintarCopias } = await import('./copias.js');
            $('sub').textContent = t('Copia de seguridad');
            pintarCopias(app(), { alVolver: () => pintarSeccion('panel'), alTerminar: pintarApp });
            return;
        }
        case 'mercado': {
            const { pintarMercado } = await import('./pantalla-mercado.js');
            $('sub').textContent = t('Mercado');
            pintarMercado(app(), { cuentas, red: redActiva });
            return;
        }
        case 'dca': {
            const { pintarDca } = await import('./pantalla-dca.js');
            $('sub').textContent = t('DCA');
            pintarDca(app(), { cuentas, red: redActiva });
            return;
        }
        case 'puente': {
            const { pintarPuente } = await import('./pantalla-puente.js');
            $('sub').textContent = t('Puente');
            pintarPuente(app(), { cuentas, red: redActiva });
            return;
        }
        case 'nft': {
            const { pintarNft } = await import('./pantalla-nft.js');
            $('sub').textContent = t('NFT');
            pintarNft(app(), { cuentas, red: redActiva });
            return;
        }
        case 'red':
            $('sub').textContent = t('Red');
            pintarRed();
            return;
        case 'info': {
            const { pintarInfo } = await import('./info.js');
            $('sub').textContent = t('Info');
            pintarInfo(app(), { version: __VERSION__, motor, red: redActiva });
            return;
        }
        case 'ajustes':
            $('sub').textContent = t('Ajustes');
            pintarAjustes();
            return;
        default:
            await pintarPanel(cuentas);
    }
}

// --- Que cartera se esta mirando --------------------------------------------
//
// Hasta 0.21.0 el Panel enseñaba TODAS las carteras una debajo de otra. En un
// movil eso se hace larguisimo en cuanto hay tres, y obliga a bajar para ver lo
// de siempre. Ahora se mira UNA, la que elijas, y se cambia desde el nombre de
// arriba. Cual es se guarda en `cartera-activa.js`, que es el mismo sitio del que
// tiran Mercado, Puente, DCA y NFT: elegir la cartera aqui la elige para todo.

async function pintarPanel(cuentas) {
    app().innerHTML = '';

    const porCartera = agrupaCarteras(cuentas);
    const guardada = carteraActiva();
    const grupo = (guardada && porCartera.get(guardada)) || porCartera.values().next().value;
    if (!grupo) return;

    // La cabecera dice la red de LA CARTERA que se está mirando. Poner siempre la
    // de Kadena encima de una cartera de Ethereum es dar por buena una cosa que no
    // lo es, y en un monedero la red importa.
    const esEvm = grupo.cuentas.every((cu) => cu.tipo === 'evm');
    const donde = esEvm ? 'Ethereum' : redActiva.nombre;
    // En la app instalada se dice la bóveda que hay debajo, que es lo que dice
    // que las claves están en el chip. En el navegador no se repite en cada
    // pantalla que la bóveda es de pruebas: eso ya se sabe, y sigue estando en
    // Info y en Seguridad para quien lo quiera comprobar.
    const nativa = CANAL === 'ios' ? t('nativa (iPhone)') : t('nativa (Android)');
    $('sub').textContent = motor === 'nativa'
        ? `${donde} · ${t('Bóveda')} ${nativa}`
        : donde;

    app().append(chipCartera(grupo, porCartera));
    app().append(tarjetaCartera(grupo));
    app().append(bloqueConsultaLibre());
    app().append(boton(t('Refrescar'), () => pintarSeccion('panel'), 'secundario'));
}

/**
 * El nombre de la cartera arriba, con el ojito al lado.
 *
 * El ojito esta aqui y no solo en Ajustes por un motivo practico: se tapan los
 * saldos cuando hay alguien mirando por encima del hombro, y eso pasa justo
 * cuando ya tienes la pantalla del dinero abierta, no tres menus mas adentro.
 */
function chipCartera(grupo, porCartera) {
    const c = texto('div', null, 'chip');

    const ojo = document.createElement('button');
    ojo.className = 'ojo-chip';
    ojo.type = 'button';
    ojo.setAttribute('aria-label', t('Ocultar los saldos'));
    const pinta = () => { ojo.textContent = document.body.classList.contains('sinsaldos') ? '🙈' : '👁'; };
    pinta();
    ojo.addEventListener('click', () => {
        const tapado = !document.body.classList.contains('sinsaldos');
        document.body.classList.toggle('sinsaldos', tapado);
        try { localStorage.setItem('koberlet.sinsaldos', tapado ? '1' : '0'); } catch (_) { /* ídem */ }
        pinta();
    });

    const nombre = document.createElement('button');
    nombre.className = 'nombre-cartera';
    nombre.type = 'button';
    nombre.textContent = grupo.nombre;
    nombre.append(texto('span', '▾', 'flecha'));
    // Con una sola cartera el selector no lleva a ninguna parte, pero SI lleva a
    // añadir otra, que es lo que uno busca ahi.
    nombre.addEventListener('click', () => hojaCarteras(porCartera, grupo.id));

    // El historial, al otro lado de la misma pastilla. Estaba dentro de «Detalle
    // de la cartera», tres pliegues adentro, y es de las cosas que mas se miran:
    // ¿me ha llegado?, ¿lo mande?
    const reloj = document.createElement('button');
    reloj.className = 'reloj-chip';
    reloj.type = 'button';
    reloj.textContent = '\u{1F553}';
    reloj.setAttribute('aria-label', t('Últimos movimientos'));
    const kda = grupo.cuentas.find((cu) => cu.tipo === 'kda');
    reloj.addEventListener('click', () => hojaHistorial((kda || grupo.cuentas[0]).cuenta));

    c.append(ojo, nombre, reloj);
    return c;
}

/** El historial en una hoja de abajo, para verlo sin salir del panel. */
function hojaHistorial(cuenta) {
    const fondo = texto('div', null, 'hoja-fondo');
    const hoja = texto('div', null, 'hoja');
    hoja.append(texto('h3', t('Últimos movimientos')));
    hoja.append(texto('div', corta(cuenta), 'dir'));

    const hueco = texto('div');
    hoja.append(hueco);
    hoja.append(boton(t('Cerrar'), () => fondo.remove(), 'secundario'));
    fondo.append(hoja);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) fondo.remove(); });
    document.body.append(fondo);

    pintarMovimientos(hueco, cuenta);
}

/**
 * Deja la lista de activos en CINCO filas y el resto se ve subiendo dentro.
 *
 * Lo pidió Antonio con cuatro tokens en pantalla: la lista crece sin freno y
 * empuja fuera de la vista todo lo que hay debajo -el detalle de la cartera, el
 * botón de refrescar-, así que a partir de unos cuantos la tarjeta deja de caber.
 *
 * La altura se MIDE en vez de escribirse: una fila no siempre ocupa lo mismo
 * -un nombre largo se parte en dos líneas- y una altura fija a ojo corta las
 * filas por la mitad justo en los móviles donde eso pasa. Se mide desde el borde
 * de arriba de la lista hasta el final de la quinta fila, que es exactamente lo
 * que se quiere enseñar.
 */
/**
 * Si el número grande enseña la moneda de la red (KDA, ETH) en vez de lo que vale
 * en dinero. Se toca la cifra y cambia; se vuelve a tocar y vuelve.
 *
 * Lo pidió Antonio viendo su cartera de Ethereum, que encabezaba con 0,00139 ETH:
 * un número así no dice si eso es mucho o poco, y el dato que uno busca al abrir un
 * monedero es cuánto tiene. Pero la cantidad exacta tampoco sobra -es la que se
 * envía-, así que no se elige por el usuario: se enseñan las dos, una detrás de la
 * otra, y manda el dedo.
 *
 * Vive fuera de las tarjetas para que la elección aguante los repintados y el
 * cambio de cartera: quien lo puso en moneda no quiere volver a ponerlo cada vez
 * que la lista de activos termina de cargar.
 */
let cifraEnCripto = false;

/**
 * El número grande, con sus dos caras. `datos` trae { fiat, cripto, unidad,
 * subFiat, subCripto }; `sub` es el renglón de debajo, que cuenta de qué es el
 * número de arriba -sin eso, un total en euros y una cantidad de KDA se parecen
 * demasiado-.
 *
 * Con `fiat` en null no hay nada que alternar: no se sabe el precio, así que se
 * queda en moneda y la cifra ni siquiera se marca como tocable. Prometer un cambio
 * que luego no pasa es peor que no ofrecerlo.
 */
function cifraDoble(cifra, sub, datos) {
    const hayDosCaras = datos.fiat !== null && Number.isFinite(datos.fiat)
        && datos.cripto !== null && Number.isFinite(Number(datos.cripto));

    const pinta = () => {
        cifra.textContent = '';
        if (cifraEnCripto || !hayDosCaras) {
            cifra.textContent = recorta(datos.cripto);
            cifra.append(texto('small', datos.unidad));
            if (sub && datos.subCripto) sub.textContent = datos.subCripto;
        } else {
            cifra.textContent = formateaDinero(datos.fiat, locale());
            if (sub && datos.subFiat) sub.textContent = datos.subFiat;
        }
    };
    pinta();

    cifra.classList.toggle('tocable', hayDosCaras);
    cifra.onclick = hayDosCaras ? () => { cifraEnCripto = !cifraEnCripto; pinta(); } : null;
}

function limitarLista(lista, max = 5) {
    const filas = lista.querySelectorAll('.activo');
    if (filas.length <= max) {
        lista.classList.remove('recortada');
        lista.style.maxHeight = '';
        return;
    }
    const arriba = lista.getBoundingClientRect().top;
    const quinta = filas[max - 1].getBoundingClientRect();
    if (!(quinta.bottom > arriba)) return;   // aún sin pintar: ya se llamará otra vez

    // Los 10 px de propina dejan asomar el filo de la sexta fila. Sin eso la lista
    // corta limpia justo donde acaba una fila y parece que ahí se acaba todo: nadie
    // va a intentar subir en algo que no da ninguna señal de tener más.
    lista.style.maxHeight = (quinta.bottom - arriba + 10) + 'px';
    lista.classList.add('recortada');
}

/**
 * La ficha de un activo: en qué chains está y cuánto hay en cada una.
 *
 * En Kadena el mismo token vive repartido en 20 cadenas y el saldo que se enseña
 * es la suma. Eso está bien para saber cuánto tienes y no vale para nada a la hora
 * de mover: para enviar hace falta saber de qué chain sale, y hasta ahora ese
 * reparto solo se veía para el KDA, plegado al fondo de la tarjeta. Lo pidió
 * Antonio al verlo en el móvil: «cuando pique en un token quiero ver la info,
 * cadenas donde están y cuántos en cada cadena».
 *
 * @param porChain  {chain: cantidad}. Si llega vacío se dice, en vez de enseñar
 *                  una lista vacía que parece un fallo.
 */
// Aquí vivía `hojaAvisa`, la hoja de «esto todavía se hace en el escritorio».
// Se ha ido con su último cliente: desde la 0.53.0 los cuatro botones de una
// cartera de Ethereum hacen algo. Una función que solo servía para excusarse no
// se guarda «por si acaso».

function hojaActivo({ simbolo, sub, cantidad, porChain, valor, decimales = 5 }) {
    const fondo = texto('div', null, 'hoja-fondo');
    const hoja = texto('div', null, 'hoja');
    hoja.append(texto('h3', simbolo));
    if (sub) hoja.append(texto('p', sub, 'nota'));

    const cab = texto('div', null, 'total');
    // Aquí la cantidad va ENTERA, sin recortar a 5 decimales: esta es la pantalla
    // a la que se viene a mirar el número de verdad.
    cab.append(texto('div', String(cantidad), 'cifra'));
    cab.append(texto('div', valor || t('sin precio conocido'), 'pie'));
    hoja.append(cab);

    const chs = Object.keys(porChain || {}).map(Number).sort((a, b) => a - b);
    if (!chs.length) {
        hoja.append(texto('p', t('No se sabe en qué chain está: la consulta no devolvió el reparto.'), 'nota'));
    } else {
        hoja.append(texto('h4', t('En qué chains está')));
        const lista = texto('div', null, 'activos');
        for (const ch of chs) {
            const f = texto('div', null, 'activo');
            f.append(texto('span', String(ch), 'ficha'));
            const nom = texto('span', null, 'nom');
            nom.append(texto('b', t('Chain {0}', String(ch))));
            const val = texto('span', null, 'val');
            val.append(texto('b', recorta(porChain[ch], decimales), 'der'));
            f.append(nom, val);
            lista.append(f);
        }
        hoja.append(lista);
        if (chs.length > 1) {
            hoja.append(texto('p', t('Está repartido en {0} chains. Para enviar hay que elegir de cuál sale, y cada una va por su cuenta.', String(chs.length)), 'nota'));
        }
    }

    hoja.append(boton(t('Cerrar'), () => fondo.remove(), 'secundario'));
    fondo.append(hoja);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) fondo.remove(); });
    document.body.append(fondo);
}

/** La hoja de abajo con las carteras del aparato. */
function hojaCarteras(porCartera, activa) {
    const fondo = texto('div', null, 'hoja-fondo');
    const hoja = texto('div', null, 'hoja');
    hoja.append(texto('h3', t('Mis carteras')));

    // Cada cartera es de una red y solo de una (bóveda v3). Mezclarlas en una
    // lista sola obliga a leer la dirección para saber cuál es cuál, así que van
    // en dos bloques, con su título. Si solo hay de una red, el título sobra.
    const porRed = { kda: [], evm: [] };
    porCartera.forEach((g) => {
        porRed[g.cuentas.some((cu) => cu.tipo === 'kda') ? 'kda' : 'evm'].push(g);
    });
    const dosRedes = porRed.kda.length > 0 && porRed.evm.length > 0;

    const pintaGrupo = (g) => {
        const f = texto('div', null, 'cartera-fila');

        const elegir = document.createElement('button');
        elegir.className = 'cartera-elegir';
        elegir.type = 'button';
        const kda = g.cuentas.find((cu) => cu.tipo === 'kda') || g.cuentas[0];
        elegir.append(texto('b', g.nombre));
        elegir.append(texto('span', kda ? corta(kda.cuenta) : '', 'dir'));
        elegir.addEventListener('click', () => {
            fijarCarteraActiva(g.id);
            fondo.remove();
            pintarSeccion('panel');
        });

        const lapiz = document.createElement('button');
        lapiz.className = 'lapiz';
        lapiz.type = 'button';
        lapiz.textContent = '✎';
        lapiz.setAttribute('aria-label', t('Cambiarle el nombre'));
        lapiz.addEventListener('click', async () => {
            fondo.remove();
            const { pintarRenombrar } = await import('./carteras.js');
            pintarRenombrar(app(), {
                carteraId: g.id, nombre: g.nombre,
                alVolver: () => pintarSeccion('panel'),
                alTerminar: pintarApp,
            });
        });

        const marca = texto('span', g.id === activa ? '✓' : '', 'marca');
        f.append(elegir, lapiz, marca);
        hoja.append(f);
    };

    if (porRed.kda.length) {
        if (dosRedes) hoja.append(texto('h4', t('Kadena'), 'grupo-hoja'));
        porRed.kda.forEach(pintaGrupo);
    }
    if (porRed.evm.length) {
        if (dosRedes) hoja.append(texto('h4', t('Ethereum'), 'grupo-hoja'));
        porRed.evm.forEach(pintaGrupo);
    }

    hoja.append(boton(t('Añadir otra cartera'), async () => {
        fondo.remove();
        const { pintarAnadirCartera } = await import('./carteras.js');
        pintarAnadirCartera(app(), {
            motor,
            alVolver: () => pintarSeccion('panel'),
            alTerminar: pintarApp,
        });
    }));
    hoja.append(boton(t('Cerrar'), () => fondo.remove(), 'secundario'));

    fondo.append(hoja);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) fondo.remove(); });
    document.body.append(fondo);
}

/** Circulo con icono para las tres acciones de cabecera. */
function accion(etiqueta, camino, alPulsar) {
    const b = document.createElement('button');
    b.className = 'accion';
    b.type = 'button';
    const circulo = texto('span', null, 'circulo');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', camino);
    svg.append(p);
    circulo.append(svg);
    b.append(circulo, texto('span', etiqueta));
    b.addEventListener('click', alPulsar);
    return b;
}

/** Una linea de la lista de activos: ficha, nombre, cantidad y valor. */
function lineaActivo(simbolo, red, cantidad, valor, decimales = 5) {
    const f = texto('div', null, 'activo');
    f.append(texto('span', simbolo.replace(/^kb-/, '').slice(0, 4), 'ficha'));
    const nom = texto('span', null, 'nom');
    nom.append(texto('b', simbolo), texto('span', red));
    const val = texto('span', null, 'val');
    val.append(texto('b', cantidad === null ? t('no se sabe') : recorta(cantidad, decimales), 'der'));
    // El hueco del valor en euros se crea siempre, aunque este vacio: el precio
    // llega despues que el saldo y tiene que caber sin mover la linea de sitio.
    val.append(texto('span', valor || '', 'der'));
    f.append(nom, val);
    return f;
}

/**
 * El QR para recibir, en una hoja de abajo.
 *
 * Va en una hoja y no siempre a la vista por lo de siempre: el QR de tu cuenta
 * es tu cuenta, y no tiene por que estar en pantalla mientras alguien mira.
 */
async function hojaRecibir(cuenta, chainSugerida = 2) {
    const fondo = texto('div', null, 'hoja-fondo');
    const hoja = texto('div', null, 'hoja');
    hoja.append(texto('h3', t('Recibir')));

    // La cuenta, acortada. Entera son 66 caracteres que se parten por donde caiga
    // y se comen dos lineas de la hoja sin que nadie los lea letra a letra; asi
    // se lee de un vistazo, igual que en el resto de la app. Un toque la enseña
    // completa para el que SI quiere comprobarla, y el boton de copiar de abajo
    // sigue copiando siempre la de verdad.
    const dir = texto('div', corta(cuenta), 'dir tocable');
    dir.title = cuenta;
    dir.addEventListener('click', () => {
        dir.textContent = dir.textContent === cuenta ? corta(cuenta) : cuenta;
    });
    hoja.append(dir);

    // COBRAR UNA CANTIDAD CONCRETA, como quien marca un precio en el datafono.
    // Las dos casillas son opcionales: vacias, el QR lleva la cuenta a secas y lo
    // entiende cualquier monedero. Con algo escrito lleva ademas cuanto y en que
    // chain, y el monedero de enfrente -si sabe leerlo- rellena esas casillas
    // solo. Nadie paga por escanear: quien paga sigue viendo el resumen y firmando.
    //
    // Solo para Kadena: en EVM el QR de un cobro es otro formato (EIP-681) y
    // enseñar aqui una chain de Kadena no significaria nada.
    const esKda = !/^0x/i.test(cuenta);
    const hueco = texto('div', null, 'qr');
    const pie = texto('p', null, 'nota');
    let iCant = null;
    let sCh = null;

    // Cobrar en dinero del mundo: eliges €, escribes 10 y el código sale pidiendo
    // los KDA que valen 10 € ahora. Es el caso del camarero al que le deben diez
    // euros y le pagan en KDA. Quien paga ve KDA, porque es lo único que entiende
    // la cadena; el euro es solo la vara con la que tú pones el precio.
    //
    // De fábrica la unidad es KDA: esto es un monedero de Kadena, y el que solo
    // quiere cobrar cinco KDA no tiene por qué pasar por ninguna divisa.
    let unidad = 'kda';                        // 'kda' | 'eur' | 'usd' | 'gbp' | 'chf'
    let precio = null;                         // { eur, usd, gbp, chf, cuando } o null
    let relojPrecio = null;                    // el refresco mientras la hoja esté abierta
    // Precio de un KDA en la unidad que toque. En KDA no hay precio que valga: un
    // KDA es un KDA, y devolver 1 aquí seria invitar a multiplicar por nada.
    const precioDe = (u) => {
        if (!precio || u === 'kda') return null;
        const p = Number(precio[u]);
        return isFinite(p) && p > 0 ? p : null;
    };

    if (esKda) {
        const fila = texto('div', null, 'fila-campo');

        // Las tres cosas de un cobro en una sola fila y en el orden en que se
        // piensan: en qué mido, cuánto, y en qué chain lo quiero.
        const cUni = texto('div', null, 'campo unidad');
        const lUni = document.createElement('label');
        lUni.setAttribute('for', 'cobro-unidad');
        lUni.textContent = t('Moneda');
        const sUni = document.createElement('select');
        sUni.id = 'cobro-unidad';
        const oKda = document.createElement('option');
        oKda.value = 'kda';
        oKda.textContent = 'KDA';
        oKda.selected = true;
        sUni.append(oKda);
        // Las divisas nacen apagadas y se encienden cuando llega el precio. Que
        // estén a la vista desde el principio evita que la fila pegue un salto al
        // llegar el cambio; que estén apagadas evita prometer una conversión que
        // todavía no se puede hacer.
        const opcionesMoneda = CODIGOS.map((c) => {
            const o = document.createElement('option');
            o.value = c;
            o.textContent = MONEDAS[c].iso + ' ' + MONEDAS[c].simbolo;
            o.disabled = true;
            sUni.append(o);
            return o;
        });
        cUni.append(lUni, sUni);

        const cCant = texto('div', null, 'campo crece');
        const lCant = document.createElement('label');
        lCant.setAttribute('for', 'cobro-cantidad');
        lCant.textContent = t('Cantidad (opcional)');

        iCant = document.createElement('input');
        iCant.id = 'cobro-cantidad';
        iCant.type = 'text';
        iCant.inputMode = 'decimal';
        iCant.placeholder = '0.0';
        cCant.append(lCant, iCant);

        // Cambiar de moneda NO toca la cifra escrita. El que apunta 10 porque la
        // cuenta son diez euros y se da cuenta de que queria dolares, quiere 10
        // dolares: reescribirle el numero a 11,60 seria decidir por el. Lo que
        // cambia es en que se mide, y eso ya lo dice el desplegable.
        sUni.addEventListener('change', () => {
            unidad = sUni.value;
            iCant.placeholder = unidad === 'kda' ? '0.0' : '10';
            repintar();
        });

        // El precio se pide al abrir la hoja. Si no llega, la unidad se queda en
        // KDA y el cobro funciona igual: un desplegable que promete convertir y no
        // convierte es peor que no tenerlo.
        //
        // Y se vuelve a pedir mientras la hoja siga abierta. Lo que se congela en
        // el QR son KDA: una hoja abierta veinte minutos pediria los KDA que
        // valian diez euros hace veinte minutos, y en una cuenta grande eso ya no
        // son céntimos. Refrescando, el codigo pide siempre lo que valen ahora.
        const traerPrecio = () => precioKda({ maxEdadMs: REFRESCO_PRECIO_MS }).then((p) => {
            if (!p) return;                    // sin red se conserva el anterior y el pie lo dira
            precio = p;
            for (const o of opcionesMoneda) o.disabled = precioDe(o.value) === null;
            if (unidad !== 'kda') repintar();
        });
        traerPrecio();
        relojPrecio = setInterval(traerPrecio, REFRESCO_PRECIO_MS);

        const cCh = texto('div', null, 'campo chain');
        const lCh = document.createElement('label');
        lCh.setAttribute('for', 'cobro-chain');
        lCh.textContent = t('Chain');
        sCh = document.createElement('select');
        sCh.id = 'cobro-chain';
        for (let ch = 0; ch < 20; ch++) {
            const o = document.createElement('option');
            o.value = String(ch);
            o.textContent = String(ch);
            if (ch === Number(chainSugerida)) o.selected = true;
            sCh.append(o);
        }
        cCh.append(lCh, sCh);
        fila.append(cUni, cCant, cCh);
        hoja.append(fila);
    }

    // Copiar el QR como IMAGEN Y NADA MAS, para pegarlo en un WhatsApp, un correo
    // o una factura: el que cobra a distancia manda el codigo, no la pantalla.
    //
    // Solo la imagen, a peticion de Antonio: la cantidad y la chain ya viajan
    // DENTRO del codigo, y quien lo escanee las vera en su pantalla de envio. El
    // que quiera decirlas con palabras las escribe en el mensaje, que para eso
    // esta escribiendo un mensaje.
    let ultimoContenido = cuenta;
    const bQr = document.createElement('button');
    bQr.className = 'copiar';
    bQr.textContent = t('Copiar el QR');
    bQr.addEventListener('click', async () => {
        const lienzo = hueco.querySelector('canvas');
        let bien = false;
        try {
            // Copiar imagenes necesita ClipboardItem y contexto seguro. En los
            // WebView viejos no esta, asi que hay respaldo: se copia el enlace
            // del cobro, que lleva la misma informacion en texto.
            const trozo = await new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('sin imagen'))), 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': trozo })]);
            bien = true;
        } catch (_) {
            bien = false;
        }
        if (bien) {
            bQr.textContent = t('✓ QR copiado');
        } else {
            const conEnlace = await copiarTexto(ultimoContenido);
            bQr.textContent = conEnlace
                ? t('Aquí no se puede copiar la imagen: copiado el cobro en texto')
                : t('No se pudo copiar: haz una captura de pantalla');
        }
        setTimeout(() => { bQr.textContent = t('Copiar el QR'); }, 2500);
    });

    hoja.append(hueco);
    if (esKda) hoja.append(pie);
    hoja.append(botonCopiar(cuenta));
    hoja.append(bQr);
    // Cerrar apaga el refresco del precio: una hoja cerrada que sigue preguntando
    // el cambio cada treinta segundos es bateria y una llamada que CoinGecko
    // acabaria cortando.
    const cerrar = () => {
        if (relojPrecio) clearInterval(relojPrecio);
        relojPrecio = null;
        fondo.remove();
    };
    hoja.append(boton(t('Cerrar'), cerrar, 'secundario'));
    fondo.append(hoja);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
    document.body.append(fondo);

    let qr;
    try {
        qr = await import('./qr.js');
    } catch (e) {
        hueco.append(texto('p', t('No se pudo generar el código: ') + t(String(e.message || e)), 'malo'));
        return;
    }

    const repintar = async () => {
        let contenido = cuenta;
        if (esKda) {
            const escrito = Number(String(iCant.value).replace(',', '.'));
            const p = precioDe(unidad);

            // Lo que va DENTRO del código es siempre KDA: el formato de cobro de
            // Kadena no sabe de euros, y el monedero de enfrente tampoco.
            const enKda = p ? aKda(escrito, p) : escrito;
            const pide = enKda !== null && isFinite(enKda) && enKda > 0;

            contenido = qr.qrDeCobro(cuenta, pide ? enKda : 0, pide ? sCh.value : null);

            if (!pide) {
                pie.textContent = t('El código lleva solo tu cuenta: quien pague elige cuánto y en qué chain.');
            } else if (p) {
                // Se dice el cambio usado y de cuándo es. La cifra que se cobra
                // queda CONGELADA en KDA al generar el código: si el precio se
                // mueve antes de que te paguen, lo que entra vale otra cosa en
                // euros. Callarlo seria vender una certeza que no existe.
                pie.textContent = t('El código pide {0} KDA en la chain {1} — son {2} al cambio de ahora ({3} por KDA). Si el precio se mueve antes de que te paguen, cobrarás esos KDA, no ese importe.',
                    recorta(enKda),
                    sCh.value,
                    formateaDinero(escrito, locale(), unidad),
                    formateaPrecio(p, locale(), unidad));

                // El refresco se apoya en la red, y la red falla. Un cambio viejo
                // presentado como «de ahora» es lo unico de esta pantalla que
                // puede costar dinero de verdad, asi que se dice.
                const edad = Date.now() - Number(precio.cuando || 0);
                if (edad > VIEJO_PRECIO_MS) {
                    pie.textContent += ' ' + t('Ojo: no se ha podido actualizar el cambio desde hace {0} min.', String(Math.floor(edad / 60000)));
                    pie.classList.add('malo');
                } else {
                    pie.classList.remove('malo');
                }
            } else {
                pie.textContent = t('El código pide {0} KDA en la chain {1}.', recorta(enKda), sCh.value);
            }
        }
        ultimoContenido = contenido;
        hueco.innerHTML = '';
        try {
            hueco.append(await qr.pintarQr(contenido));
        } catch (e) {
            hueco.append(texto('p', t('No se pudo generar el código: ') + t(String(e.message || e)), 'malo'));
        }
    };
    if (esKda) {
        iCant.addEventListener('input', repintar);
        sCh.addEventListener('change', repintar);
    }
    await repintar();
}

/**
 * La cartera que se esta mirando: total, acciones y activos.
 *
 * El orden no es casual. Primero cuanto tienes, luego los tres botones que uno
 * viene a pulsar, y solo despues el detalle. Lo tecnico -el reparto por chains,
 * las direcciones, el historial- se queda plegado al fondo: esta ahi para cuando
 * hace falta, no ocupando la pantalla del dinero.
 */
function tarjetaCartera(grupo) {
    const c = caja();
    const kda = grupo.cuentas.find((cu) => cu.tipo === 'kda');
    const evm = grupo.cuentas.find((cu) => cu.tipo === 'evm');

    const bloqueTotal = texto('div', null, 'total');
    const cifra = texto('div', '…', 'cifra');
    bloqueTotal.append(cifra, texto('div', t('Consultando el saldo…'), 'pie'));
    c.append(bloqueTotal);

    const acciones = texto('div', null, 'acciones');
    c.append(acciones);

    const lista = texto('div', null, 'activos');
    c.append(lista);

    const detalle = texto('div', null, 'detalle');
    c.append(detalle);

    // Una cartera de Ethereum tiene su propia tarjeta: aquí no hay 20 chains ni
    // tokens de Kadena, y presentarla con la misma plantilla dejaría media
    // pantalla mintiendo. Es solo lectura: desde el móvil todavía no se firma
    // nada de Ethereum.
    if (!kda && evm) {
        tarjetaEvm(c, evm, bloqueTotal, cifra, acciones, lista, detalle);
        return c;
    }

    if (!kda) {
        bloqueTotal.remove();
        c.append(texto('p', t('Esta cartera no tiene ninguna cuenta de Kadena.'), 'nota'));
        return c;
    }

    (async () => {
        try {
            const [saldo, tokens] = await Promise.all([
                saldoKda(kda.cuenta, { nodo: redActiva.nodo, networkId: redActiva.networkId, chains: CHAINS }),
                saldoTokens(kda.cuenta, { nodo: redActiva.nodo, networkId: redActiva.networkId, tokens: tokensDeRed(redActiva), chains: CHAINS }),
            ]);
            const chs = Object.keys(saldo.porChain).map(Number).sort((a, b) => a - b);

            // Si NO ha contestado ninguna chain no hay saldo que enseñar: hay un
            // problema de red. Pintar «0 KDA» ahi seria decirle a alguien que su
            // cartera esta vacia cuando lo unico vacio es la conexion, y eso -en
            // un monedero- es de las peores cosas que se pueden enseñar.
            const mudas = saldo.fallos.length >= saldo.consultadas;
            // El total en KDA se sabe ya; el de euros depende del precio, que puede
            // no llegar. Se pinta lo que se sabe y se corrige cuando llega lo otro:
            // nunca al contrario.
            cifra.textContent = mudas ? '—' : recorta(saldo.total);
            if (!mudas) cifra.append(texto('small', 'KDA'));
            bloqueTotal.lastChild.textContent = mudas
                ? t('No se ha podido preguntar el saldo')
                : t('{0} · suma de {1} chains', redActiva.nombre, saldo.consultadas);

            // `cobro` viene de un QR que ha abierto la app desde la camara: son
            // casillas ya rellenas, nada mas. El resumen y la firma no cambian.
            const abrirEnvio = (cobro) => {
                if (!chs.length) {
                    // Sin saldo el envio no puede salir bien; se dice aqui en vez
                    // de dejar que lo descubra el nodo tres pantallas despues.
                    lista.prepend(texto('p', t('Esta cuenta todavía no tiene KDA. Es normal en una cartera recién creada.'), 'malo'));
                    return;
                }
                pintarEnvio(app(), {
                    cuenta: kda.cuenta,
                    nombre: kda.cartera,
                    carteraId: kda.carteraId || 'c1',
                    red: redActiva,
                    porChain: saldo.porChain,
                    // Todo lo que tiene esta cuenta, para poder elegir qué se manda.
                    activos: enviables,
                    cobro: cobro || null,
                    alVolver: () => pintarApp(cuentasActuales),
                });
            };

            acciones.append(
                accion(t('Enviar'), 'M12 19V5M6 11l6-6 6 6', () => abrirEnvio(null)),
                accion(t('Recibir'), 'M12 5v14M6 13l6 6 6-6', () => hojaRecibir(
                    kda.cuenta,
                    chs.length ? chs.slice().sort((x, y) => saldo.porChain[y] - saldo.porChain[x])[0] : 2,
                )),
                accion(t('Puente'), 'M3 16c0-5 4-8 9-8s9 3 9 8M3 16h18M7 16v-3M17 16v-3M12 16V9', () => ir('puente')),
                // Mercado esta aqui y ya no en la barra de abajo: cambiar KDA por
                // otra cosa es lo que uno hace con su dinero, como enviarlo o
                // recibirlo, no una seccion aparte a la que se va.
                // Se deja dicho por qué mercado se entra: desde una cartera de
                // Kadena, el de Kadena. Dentro se puede cambiar de pestaña.
                accion(t('Mercado'), 'M4 19V9M10 19V5M16 19v-7M22 19H2', () => {
                    fijarRedMercado('kda');
                    ir('mercado');
                }),
            );

            // Si la app se ha abierto con un QR de cobro (la camara del movil),
            // se salta a Enviar con las casillas puestas. Se hace aqui, al tener
            // los saldos, porque la pantalla de envio los necesita para saber de
            // que chain puede salir el dinero.
            const cobro = recogerEnlace();
            if (cobro) abrirEnvio(cobro);

            // EL TOTAL EN DINERO se arma por piezas y ninguna llega a la vez: el
            // KDA viene con el saldo, lo puenteado tarda otro viaje y el precio lo
            // da un tercero que puede no contestar. Por eso no se pinta una vez:
            // cada vez que aparece una pieza se vuelve a sumar lo que se sabe.
            // Se guardan las CANTIDADES, no los valores ya calculados, y el valor se
            // saca entero en cada repintado. Al revés no funcionaba y se vio en el
            // móvil (14/09/2026): lo puenteado llega antes que el precio, así que
            // kb-USDC se valoraba con un precio que todavía era null, se quedaba en
            // «no se sabe» y ya nadie volvía a mirarlo. 22 kb-USDC sin valor al lado
            // y fuera del total. Calcular al final es lo único que aguanta que las
            // piezas lleguen en cualquier orden.
            const enDinero = { precio: null, kdaCantidad: null, activos: new Map() };
            const lineaDinero = texto('div', null, 'pie');
            let lineaPuesta = false;
            const lineaAMano = texto('div', null, 'pie');
            let notaPuesta = false;

            const pintarDinero = () => {
                const p = enDinero.precio;
                if (!p) return;

                const ponValor = (sim, txt) => {
                    const el = lista.querySelector(`[data-simbolo="${sim}"] .val span`);
                    if (el) el.textContent = txt;
                };

                let suma = 0;
                let sinPrecio = false;
                const aMano = [];               // los que van a precio puesto por nosotros

                if (enDinero.kdaCantidad !== null) {
                    const v = enDinero.kdaCantidad * p.unidad;
                    suma += v;
                    ponValor('KDA', formateaDinero(v, locale()));
                }
                for (const [sim, cant] of enDinero.activos) {
                    const v = valorDeToken(sim, cant, p);
                    // Lo que no se puede valorar se pinta en cero, que es lo que pidió
                    // Antonio al verlo: un hueco en blanco en una columna de dinero se
                    // lee como que falta por cargar. Va en cero Y fuera de la suma, y
                    // el pie dice que el total no lo lleva dentro.
                    ponValor(sim, formateaDinero(v === null ? 0 : v, locale()));
                    if (v === null) sinPrecio = true;
                    else {
                        suma += v;
                        if (precioPuestoAMano(sim)) aMano.push([sim, PRECIO_EN_KDA[sim]]);
                    }
                }
                if (enDinero.kdaCantidad === null && !enDinero.activos.size) return;

                // EL NÚMERO GRANDE ES LO QUE VALE LA CARTERA, no cuántos KDA hay.
                // Con tokens dentro, el KDA solo es una parte, y encabezar con él
                // deja el número principal contando una porción de lo que tienes.
                // La cantidad de KDA sigue entera en su línea de la lista.
                // Y el renglón de debajo deja de hablar de las 20 chains, que era el
                // pie del KDA, para decir de qué es el número que hay encima.
                cifraDoble(cifra, bloqueTotal.children[1], {
                    fiat: suma,
                    cripto: enDinero.kdaCantidad,
                    unidad: 'KDA',
                    subFiat: t('{0} · valor de la cartera', redActiva.nombre),
                    subCripto: t('{0} · lo que hay en KDA', redActiva.nombre),
                });

                const signo = p.cambio24h >= 0 ? '+' : '';
                // El «en 24 h» es del KDA, no del total: un total con dólares dentro
                // no se mueve lo que se mueve el KDA, y colgarle ese porcentaje al
                // lado sería dar por bueno un dato que no es de lo que se enseña.
                let txt = t('el KDA {0} % en 24 h', signo + p.cambio24h.toFixed(1));
                // Si hay algo en la cartera a lo que no se le sabe el precio, el
                // total NO lo lleva dentro y hay que decirlo: si no, se lee como
                // «esto es todo lo que tengo» y no lo es.
                if (sinPrecio) txt += ' · ' + t('sin contar lo que no tiene precio conocido');
                lineaDinero.textContent = txt;
                if (!lineaPuesta) { bloqueTotal.append(lineaDinero); lineaPuesta = true; }

                // Un precio que hemos puesto nosotros NO puede ir dentro de un total
                // sin decirlo. El SPT no cotiza en ningún sitio: los 200 KDA son su
                // precio de venta, no lo que alguien esté pagando por él. Quien mire
                // el total tiene que poder distinguir una cosa de la otra.
                if (aMano.length) {
                    for (const [sim, kda] of aMano) {
                        lineaAMano.textContent = t(
                            '{0} contado a {1} KDA, que es su precio de venta: todavía no cotiza en ningún mercado.',
                            sim, String(kda));
                    }
                    if (!notaPuesta) { bloqueTotal.append(lineaAMano); notaPuesta = true; }
                }
            };

            precioKda().then((p) => {
                if (!p) return;
                enDinero.precio = p;
                pintarDinero();
            });

            // Los activos, de mas a menos: primero KDA, luego los fungibles de la
            // red y al final lo puenteado. Solo lo que tiene saldo: una lista de
            // ceros no informa de nada.
            // Con las chains mudas tampoco se pinta «0» en la linea del KDA: no
            // se sabe, y decir «no se sabe» es lo unico cierto.
            // Todo activo entra por aqui: asi cada linea queda marcada con su
            // simbolo -que es como se le encuentra luego para ponerle el valor- y
            // el total se entera de que existe, sepa o no lo que vale.
            // Lo que se puede enviar, que se va llenando según llega. El KDA
            // primero porque es lo que se manda el 90 % de las veces; los demás en
            // el orden en que aparecen.
            const enviables = [{ simbolo: 'KDA', modulo: null, precision: 12, porChain: saldo.porChain }];

            const añadirActivo = (simbolo, sub, cantidad, porChain = null, envio = null) => {
                if (envio && envio.modulo && porChain && Object.keys(porChain).length) {
                    enviables.push({ simbolo, modulo: envio.modulo, precision: envio.precision || 12, porChain });
                }
                const l = lineaActivo(simbolo, sub, cantidad, '');
                l.dataset.simbolo = simbolo;
                // Tocar la línea abre su ficha: dónde está repartido y cuánto hay en
                // cada chain, que es lo que hace falta saber para poder moverlo.
                l.classList.add('tocable');
                l.addEventListener('click', () => hojaActivo({
                    simbolo,
                    sub,
                    cantidad,
                    porChain,
                    valor: (l.querySelector('.val span') || {}).textContent || '',
                }));
                lista.append(l);
                limitarLista(lista);
                if (cantidad === null || !(cantidad > 0)) return l;
                enDinero.activos.set(simbolo, cantidad);
                pintarDinero();                 // por si el precio ya estaba
                return l;
            };

            const laKda = lineaActivo('KDA', redActiva.nombre, mudas ? null : saldo.total, '');
            laKda.dataset.simbolo = 'KDA';
            // El KDA también se abre: su reparto por chains estaba solo en el
            // desplegable del fondo de la tarjeta, y ahora se llega igual que a
            // los demás. Es el mismo dato, en el sitio donde uno lo busca.
            laKda.classList.add('tocable');
            laKda.addEventListener('click', () => hojaActivo({
                simbolo: 'KDA',
                sub: redActiva.nombre,
                cantidad: mudas ? t('no se sabe') : saldo.total,
                porChain: mudas ? null : saldo.porChain,
                valor: (laKda.querySelector('.val span') || {}).textContent || '',
            }));
            lista.append(laKda);
            if (!mudas && saldo.total > 0) enDinero.kdaCantidad = saldo.total;

            // Los puestos a mano se dicen. Un contrato que uno mismo ha pegado
            // puede devolver el numero que quiera, y en una lista de dinero eso
            // no puede ir sin etiqueta.
            tokens.filter((tk) => tk.cantidad > 0)
                .forEach((tk) => añadirActivo(
                    tk.simbolo,
                    tk.propio ? redActiva.nombre + ' · ' + t('puesto por ti') : redActiva.nombre,
                    tk.cantidad,
                    tk.porChain,
                    { modulo: tk.modulo, precision: tk.precision || 12 }));

            if (mudas) {
                // Ninguna respuesta: casi siempre es el móvil, no la cadena. Se
                // dice qué mirar y, sobre todo, que la cartera NO está a cero.
                lista.append(texto('p',
                    t('No ha contestado ninguna chain. Mira si tienes conexión (¿modo avión?, ¿wifi sin internet?) y dale a Refrescar. Tu dinero sigue donde estaba: lo que falla es la consulta.'),
                    'malo'));
            } else if (saldo.fallos.length) {
                lista.append(texto('p',
                    t('Faltan {0} chains por contestar: puede que tengas más de lo que se ve aquí.', saldo.fallos.length),
                    'malo'));
            }

            // Los tokens que la cuenta ha movido alguna vez. Van aparte y despues,
            // igual que el puente: hacen falta dos viajes -el historial y luego el
            // saldo- y el KDA no tiene por que esperarlos.
            movimientos(kda.cuenta, { limite: 200 }).then(async (movs) => {
                // Fuera los que ya pinta otro: los de la red y los del puente,
                // que se enseñan como «Puenteado» y saldrian dos veces.
                const pnt = await import('./lib/puente.js');
                const yaEstan = tokensDeRed(redActiva).map((tk) => tk.modulo)
                    .concat(pnt.RUTAS.map((r) => pnt.NS + '.' + r.modulo));
                const vistos = await tokensDelHistorial(kda.cuenta, {
                    nodo: redActiva.nodo, networkId: redActiva.networkId, movs, yaEstan,
                });
                vistos.forEach((tk) => añadirActivo(
                    tk.simbolo, redActiva.nombre + ' · ' + t('visto en tus movimientos'),
                    tk.cantidad, tk.porChain,
                    { modulo: tk.modulo, precision: 12 }));
            }).catch(() => { /* sin indexador no hay descubrimiento, y el panel sigue */ });

            // Lo puenteado se pregunta aparte y no retrasa el saldo: es el añadido
            // de 0.21.0 y vive en una sola chain.
            const pnt2 = await import('./lib/puente.js');
            const { saldosKb } = pnt2;
            saldosKb(kda.cuenta, redActiva).then((kbs) => {
                kbs.filter((r) => r.saldo).forEach((r) => {
                    // Lo puenteado vive en una sola chain, la 2: el reparto es
                    // ese y no hay que preguntarlo.
                    añadirActivo('kb-' + r.simbolo, t('Puenteado'), r.saldo, { 2: r.saldo },
                        { modulo: pnt2.NS + '.' + r.modulo, precision: 12 });
                });
            }).catch(() => { /* el puente no es el saldo: si falla, el panel sigue */ });

            detalle.append(bloqueDetalle(kda, evm, saldo, chs));
        } catch (e) {
            cifra.textContent = '—';
            bloqueTotal.lastChild.textContent = '';
            lista.append(texto('p', t('No se pudo consultar: ') + t(String(e.message || e)), 'malo'));
        }
    })();

    return c;
}

/**
 * La tarjeta de una cartera de Ethereum: ETH, USDC, enviar, recibir y el puente.
 *
 * Los CUATRO botones son los mismos, en el mismo orden y en el mismo sitio que en
 * una cartera de Kadena (lo pidió Antonio): cambiar de cartera no debería cambiar
 * la forma de la pantalla, porque entonces hay que volver a buscar dónde está
 * cada cosa. Y desde la 0.53.0 los cuatro llevan a alguna parte.
 */
function tarjetaEvm(c, evm, bloqueTotal, cifra, acciones, lista, detalle) {
    acciones.append(
        // «Enviar» sacaba una hoja diciendo que eso se hacía en el escritorio.
        // Se había quedado vieja -la bóveda ya firmaba el puente y el mercado en
        // Ethereum- y Antonio se la encontró de frente: «me da este error».
        accion(t('Enviar'), 'M12 19V5M6 11l6-6 6 6', () => pintarEnvioEth(app(), {
            cuenta: evm.cuenta,
            nombre: evm.cartera,
            carteraId: evm.carteraId || 'c1',
            alVolver: () => pintarApp(cuentasActuales),
        })),
        accion(t('Recibir'), 'M12 5v14M6 13l6 6 6-6', () => hojaRecibir(evm.cuenta)),
        accion(t('Puente'), 'M3 16c0-5 4-8 9-8s9 3 9 8M3 16h18M7 16v-3M17 16v-3M12 16V9', () => ir('puente')),
        // Desde 0.51.0 el Mercado también cambia en Ethereum -USDC, ETH y USDT por
        // Uniswap-, así que este botón ya lleva a alguna parte en vez de excusarse.
        // Y entra por el mercado de Ethereum, que es de donde se viene.
        accion(t('Mercado'), 'M4 19V9M10 19V5M16 19v-7M22 19H2', () => {
            fijarRedMercado('evm');
            ir('mercado');
        }),
    );

    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Detalle de la cartera');
    det.append(sum, texto('div', t('Dirección de Ethereum'), 'izq'), texto('div', evm.cuenta, 'dir'), botonCopiar(evm.cuenta));
    detalle.append(det);

    (async () => {
        try {
            const { saldosEvm } = await import('./lib/puente.js');
            const saldos = await saldosEvm(evm.cuenta);
            const eth = saldos.find((s) => s.simbolo === 'ETH');
            cifra.textContent = eth && eth.saldo !== null ? recorta(eth.saldo) : '—';
            cifra.append(texto('small', 'ETH'));
            bloqueTotal.lastChild.textContent = 'Ethereum';
            const filas = new Map();
            saldos.forEach((s) => {
                if (s.saldo === null) {
                    lista.append(lineaActivo(s.simbolo, t('no se pudo preguntar'), 0, ''));
                } else if (s.saldo > 0 || s.simbolo === 'ETH') {
                    const l = lineaActivo(s.simbolo, 'Ethereum', s.saldo, '');
                    lista.append(l);
                    filas.set(s.simbolo, l);
                }
            });

            // El precio llega después y por su cuenta; hasta entonces la tarjeta ya
            // es útil con las cantidades. Cuando llega, cada línea dice lo que vale y
            // el número grande puede enseñar el total en dinero -de un toque-.
            precioKda().then((p) => {
                if (!p) return;
                let suma = 0;
                let sinPrecio = false;
                for (const s of saldos) {
                    if (s.saldo === null) continue;
                    const v = valorDeToken(s.simbolo, s.saldo, p);
                    if (v === null) { if (s.saldo > 0) sinPrecio = true; }
                    else suma += v;
                    const cel = filas.get(s.simbolo);
                    const el = cel && cel.querySelector('.val span');
                    if (el) el.textContent = formateaDinero(v === null ? 0 : v, locale());
                }
                cifraDoble(cifra, bloqueTotal.children[1], {
                    fiat: suma,
                    cripto: eth && eth.saldo !== null ? eth.saldo : null,
                    unidad: 'ETH',
                    subFiat: sinPrecio
                        ? 'Ethereum · ' + t('sin contar lo que no tiene precio conocido')
                        : t('{0} · valor de la cartera', 'Ethereum'),
                    subCripto: 'Ethereum',
                });
            });
        } catch (e) {
            cifra.textContent = '—';
            bloqueTotal.lastChild.textContent = '';
            lista.append(texto('p', t('No se pudo consultar: ') + t(String(e.message || e)), 'malo'));
        }
    })();
}

/** El detalle plegado: reparto por chains, direcciones y movimientos. */
function bloqueDetalle(kda, evm, saldo, chs) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Detalle de la cartera');
    det.append(sum);

    if (chs.length) {
        chs.forEach((ch) => det.append(fila('Chain ' + ch, recorta(saldo.porChain[ch]) + ' KDA')));
    }

    const tKda = texto('h3', nombreCartera(kda.etiqueta));
    tKda.style.margin = '14px 0 4px';
    det.append(tKda, texto('div', kda.cuenta, 'dir'), botonCopiar(kda.cuenta), botonRecibir(kda.cuenta));

    if (evm) {
        const tEvm = texto('h3', nombreCartera(evm.etiqueta));
        tEvm.style.margin = '14px 0 4px';
        det.append(tEvm, texto('div', evm.cuenta, 'dir'), botonCopiar(evm.cuenta), botonRecibir(evm.cuenta));
        det.append(texto('p', t('Saldos de las redes EVM: pendiente de la Fase 5.'), 'nota'));
    }

    det.append(bloqueMovimientos(kda.cuenta));
    return det;
}

/**
 * Ultimos movimientos de la cuenta, del indexador propio. Plegado y cargado solo
 * al abrirlo: el saldo es lo que la gente viene a ver, el historial es curiosidad.
 */
function bloqueMovimientos(cuenta) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Últimos movimientos');
    det.append(sum);

    let cargado = false;
    det.addEventListener('toggle', () => {
        if (!det.open || cargado) return;
        cargado = true;
        const hueco = document.createElement('div');
        det.append(hueco);
        pintarMovimientos(hueco, cuenta);
    });
    return det;
}

/**
 * Los movimientos de una cuenta, dentro del hueco que le den.
 *
 * Lo pintan dos sitios -el detalle plegado y la hoja del reloj- y por eso vive en
 * una sola funcion: dos copias acabarian enseñando dos cosas distintas del mismo
 * historial, que es de las peores formas de perder la confianza en un monedero.
 */
async function pintarMovimientos(hueco, cuenta) {
    hueco.innerHTML = '';
    hueco.append(texto('p', t('Consultando…'), 'nota'));
    try {
        const lista = await movimientos(cuenta);
        hueco.innerHTML = '';
        if (!lista.length) {
            hueco.append(texto('p', t('Esta cuenta todavía no tiene movimientos.'), 'nota'));
            return;
        }
        lista.forEach((m) => {
            const f = document.createElement('div');
            f.className = 'fila';
            const izq = document.createElement('span');
            izq.className = 'izq';
            const cuando = m.cuando ? m.cuando.toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            // Se dice con quien fue el movimiento, recortado: la cuenta entera
            // no cabe y de todas formas lo que importa es reconocerla.
            izq.textContent = `${t(m.entra ? 'Recibido' : 'Enviado')} · ${cuando} · ${t('Chain {0}', m.chain)}\n${corta(m.otra)}`;
            izq.style.whiteSpace = 'pre-line';
            izq.style.fontSize = '12px';
            const der = document.createElement('span');
            der.className = 'der';
            der.textContent = (m.entra ? '+' : '−') + recorta(m.cantidad) + ' ' + m.token;
            if (m.entra) der.style.color = 'var(--activo)';
            f.append(izq, der);

            // La linea es corta a proposito, pero el movimiento entero tiene mas:
            // las dos cuentas completas, la hora exacta, el bloque y la clave de
            // la transaccion. Se abre tocandola.
            f.classList.add('pulsable');
            f.setAttribute('role', 'button');
            f.tabIndex = 0;
            const abrir = () => hojaMovimiento(m, cuenta);
            f.addEventListener('click', abrir);
            f.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
            });
            hueco.append(f);
        });
    } catch (e) {
        hueco.innerHTML = '';
        hueco.append(texto('p', t('No se pudieron leer los movimientos: ') + t(String(e.message || e)), 'malo'));
    }
}

/**
 * La ficha completa de UN movimiento.
 *
 * En la lista solo cabe lo justo para reconocerlo. Aqui esta lo que hace falta
 * para comprobarlo de verdad -las dos cuentas enteras, la hora exacta, el bloque
 * y la clave de la transaccion- y para enseñarselo a otro: la clave se copia y,
 * en la red principal, se abre en el explorador de la comunidad.
 *
 * Tambien se explican los dos movimientos que descolocan a cualquiera la primera
 * vez: el pellizco que se lleva el minero por el gas, y la mitad de un envio
 * entre chains, que sale de una cadena sin destino a la vista.
 */
function hojaMovimiento(m, cuenta) {
    const fondo = texto('div', null, 'hoja-fondo');
    const hoja = texto('div', null, 'hoja');

    hoja.append(texto('h3', t(m.entra ? 'Recibido' : 'Enviado')));
    const cifra = texto('div', (m.entra ? '+' : '−') + recorta(m.cantidad) + ' ' + m.token, 'cifra-mov');
    if (m.entra) cifra.classList.add('bueno-fuerte');
    hoja.append(cifra);

    const fila = (etiqueta, valor) => {
        const f = texto('div', null, 'fila');
        f.append(texto('span', etiqueta, 'izq'), texto('span', valor, 'der'));
        hoja.append(f);
    };

    // La hora, entera y en la del movil: en la lista va recortada, y para
    // reclamar algo o buscarlo en un explorador hace falta la de verdad.
    fila(t('Cuándo'), m.cuando ? m.cuando.toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'medium' }) : t('No consta'));
    fila(t('Chain'), String(m.chain));
    if (m.altura) fila(t('Bloque'), String(m.altura));
    fila(t('De'), m.de === cuenta ? t('Esta cuenta') : (m.de || t('No consta')));
    fila(t('A'), m.para === cuenta ? t('Esta cuenta') : (m.para || t('No consta')));

    if (!m.para) {
        hoja.append(texto('p', t('Sale de esta chain: es la primera mitad de un envío entre chains. La otra mitad aparece en la chain de destino.'), 'nota'));
    } else if (!m.entra && !/^k:/.test(m.para) && m.cantidad < 0.01) {
        hoja.append(texto('p', t('Por lo que se ve, esto es el gas: lo que cobra el minero por meter tu envío en un bloque. Va aparte del envío.'), 'nota'));
    }

    if (m.requestKey) {
        fila(t('Clave de la transacción'), m.requestKey);
        hoja.append(botonCopiar(m.requestKey, t('Copiar la clave')));
        // El explorador es de la comunidad y solo sirve para la red principal;
        // en una red de pruebas o puesta a mano el enlace no llevaria a nada.
        if (redActiva && redActiva.networkId === 'mainnet01') {
            const a = document.createElement('a');
            a.className = 'boton-enlace';
            a.href = 'https://explorer.chainweb-community.org/mainnet/txdetail/' + encodeURIComponent(m.requestKey);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = t('Verlo en el explorador');
            hoja.append(a);
        }
    }

    hoja.append(boton(t('Cerrar'), () => fondo.remove(), 'secundario'));
    fondo.append(hoja);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) fondo.remove(); });
    document.body.append(fondo);
}

function bloqueConsultaLibre() {
    const c = caja();
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = t('Consultar otra cuenta');
    det.append(sum);

    const campo = document.createElement('div');
    campo.className = 'campo';
    const l = document.createElement('label');
    l.setAttribute('for', 'otra');
    l.textContent = t('Cuenta Kadena');
    const i = document.createElement('input');
    i.id = 'otra';
    i.spellcheck = false;
    i.autocapitalize = 'off';
    i.placeholder = t('k:… o el nombre de una cuenta');
    campo.append(l, i);

    const salida = document.createElement('div');

    const btn = boton(t('Consultar saldo'), async () => {
        const cuenta = i.value.trim();
        salida.innerHTML = '';
        if (!cuentaKdaValida(cuenta)) {
            salida.append(texto('p', t('Esa cuenta no es válida para Kadena.'), 'malo'));
            return;
        }
        btn.disabled = true;
        btn.textContent = t('Consultando…');
        try {
            const kda = await saldoKda(cuenta, { nodo: redActiva.nodo, networkId: redActiva.networkId, chains: CHAINS });
            salida.append(fila(t('Total'), recorta(kda.total) + ' KDA'));
            Object.keys(kda.porChain).map(Number).sort((a, b) => a - b)
                .forEach((ch) => salida.append(fila('Chain ' + ch, recorta(kda.porChain[ch]) + ' KDA')));
            if (!Object.keys(kda.porChain).length) salida.append(texto('p', t('Sin KDA en ninguna de las 20 chains.'), 'nota'));
        } catch (e) {
            salida.append(texto('p', t(String(e.message || e)), 'malo'));
        } finally {
            btn.disabled = false;
            btn.textContent = t('Consultar saldo');
        }
    });

    det.append(campo, btn, salida);
    c.append(det);
    return c;
}

// --- Seccion Red ------------------------------------------------------------
// A que nodo se esta hablando y contra que red. Cambiar de red vuelve al Panel
// porque lo primero que quiere ver uno despues es el saldo en la red nueva.
function pintarRed() {
    app().innerHTML = '';

    const c = caja();
    c.append(texto('h2', t('Red')));

    const campo = document.createElement('div');
    campo.className = 'campo';
    const l = document.createElement('label');
    l.setAttribute('for', 'red');
    l.textContent = t('Red a la que se conecta la app');
    const sel = document.createElement('select');
    sel.id = 'red';
    const propias = [];
    todasLasRedes().forEach((r) => {
        if (r.propia) propias.push(r);
        const o = document.createElement('option');
        o.value = r.clave;
        let cola = '';
        if (r.propia) cola = ' ' + t('(puesta a mano)');
        else if (!r.activa) cola = ' ' + t('(desactivada por defecto)');
        o.textContent = r.nombre + cola;
        if (r.clave === redActiva.clave) o.selected = true;
        sel.append(o);
    });
    sel.addEventListener('change', () => {
        redActiva = redPorClave(sel.value);
        comprobarNodo();
        ir('panel');
    });
    campo.append(l, sel);
    c.append(campo);
    c.append(texto('div', redActiva.nodo, 'dir'));

    // Estado del nodo, consultado en el momento: es la unica forma honesta de
    // decir si hay conexion o no.
    const estado = document.createElement('div');
    estado.append(texto('p', t('Comprobando el nodo…'), 'nota'));
    c.append(estado);
    app().append(c);

    (async () => {
        try {
            const { altura, chains, ms } = await alturaCadena(redActiva.nodo, redActiva.networkId);
            estado.innerHTML = '';
            estado.append(fila(t('Estado'), t('responde')));
            estado.append(fila(t('Chains'), String(chains)));
            estado.append(fila(t('Altura'), altura.toLocaleString(locale())));
            estado.append(fila(t('Tarda'), ms + ' ms'));
        } catch (e) {
            estado.innerHTML = '';
            estado.append(texto('p', 'El nodo no contesta: ' + t(String(e.message || e)), 'malo'));
        }
    })();

    app().append(bloqueRedesPropias(propias));
    app().append(bloqueAnadirRed());
    app().append(bloqueTokensPropios());
    app().append(bloqueAnadirToken());

    const cVia = caja();
    cVia.append(texto('h3', t('Por dónde salen las consultas')));
    cVia.append(texto('p', t(esNativo()
        ? 'Por el canal nativo de Android (CapacitorHttp): sin CORS y con tiempo de espera de verdad.'
        : 'Por el navegador (fetch). En el móvil van por el canal nativo.'), 'nota'));
    app().append(cVia);
}

/**
 * Las cuentas guardadas con nombre, con su boton de quitar.
 *
 * Aqui no hay dinero: son cuentas ajenas apuntadas para no teclearlas. Quitar
 * una no deshace ningun envio ni toca ningun saldo, solo borra el apunte.
 */
function bloqueAgenda() {
    const c = caja();
    c.append(texto('h2', t('Agenda')));
    const lista = contactos();
    if (!lista.length) {
        c.append(texto('p', t('Todavía no has guardado ninguna cuenta. Se guardan desde la pantalla de enviar.'), 'nota'));
        return c;
    }
    c.append(texto('p', t('Salen en el desplegable de «Cuenta de destino» al enviar.'), 'nota'));
    lista.forEach((g) => {
        c.append(fila(g.nombre, g.red === 'evm' ? 'Ethereum' : 'Kadena'));
        c.append(texto('div', corta(g.cuenta), 'dir'));
        c.append(boton(t('Quitar de la agenda'), () => {
            borrarContacto(g.cuenta);
            pintarAjustes();
        }, 'peligro'));
    });
    return c;
}

/** Las redes que ha puesto el dueño, con su botón de quitar. */
function bloqueRedesPropias(propias) {
    const c = caja();
    c.append(texto('h3', t('Redes puestas a mano')));
    if (!propias.length) {
        c.append(texto('p', t('Todavía no has añadido ninguna.'), 'nota'));
        return c;
    }
    propias.forEach((r) => {
        c.append(fila(r.nombre, r.networkId));
        c.append(texto('div', r.nodo, 'dir'));
        c.append(boton(t('Quitar esta red'), () => {
            borrarRed(r.clave);
            if (redActiva.clave === r.clave) {
                redActiva = REDES_KDA[0];
                comprobarNodo();
            }
            pintarRed();
        }, 'peligro'));
    });
    return c;
}

/**
 * Añadir una red a mano, para probar contra una devnet propia.
 *
 * Solo se pide el sitio al que llamar: nombre, nodo y networkId. Los contratos
 * -tokens y NFT- NO se piden y no se pueden poner: siguen viviendo en el codigo
 * (hallazgo #4 de la auditoria de Alex). Por eso una red puesta a mano enseña el
 * saldo de KDA y poco mas.
 */
function bloqueAnadirRed() {
    const c = caja();
    c.append(texto('h3', t('Añadir una red')));
    c.append(texto('p', t('Para apuntar la app a tu propio nodo, por ejemplo una devnet de pruebas.'), 'nota'));

    const campos = [
        ['red-nombre', t('Nombre'), 'Devnet'],
        ['red-nodo', t('Dirección del nodo'), 'http://192.168.1.184:1848'],
        ['red-networkid', t('networkId'), 'development'],
    ].map(([id, etiqueta, pista]) => {
        const d = document.createElement('div');
        d.className = 'campo';
        const l = document.createElement('label');
        l.setAttribute('for', id);
        l.textContent = etiqueta;
        const i = document.createElement('input');
        i.id = id;
        i.spellcheck = false;
        i.placeholder = pista;
        d.append(l, i);
        c.append(d);
        return i;
    });

    const salida = document.createElement('div');
    c.append(boton(t('Añadir la red'), () => {
        salida.innerHTML = '';
        try {
            anadirRed({ nombre: campos[0].value, nodo: campos[1].value, networkId: campos[2].value });
            pintarRed();
        } catch (e) {
            salida.append(texto('p', t(String(e.message || e)), 'malo'));
        }
    }, 'primario'));
    c.append(salida);

    // Lo que hay que decir antes de que alguien pegue aqui el nodo de un tercero.
    c.append(texto('p', t('Un nodo puesto a mano ve las direcciones que consultas y puede mentirte en los saldos y en el estado de un envío. No puede sacarte las claves: la firma se hace dentro del móvil. Aun así, pon solo nodos que sean tuyos o de quien te fíes.'), 'nota'));
    c.append(texto('p', t('En una red puesta a mano solo se ve el saldo de KDA: los contratos de token y de NFT van en el código de la app y no se pueden escribir aquí.'), 'nota'));
    return c;
}

/** Los tokens que ha puesto el dueño EN LA RED ACTIVA, con su botón de quitar. */
function bloqueTokensPropios() {
    const c = caja();
    c.append(texto('h3', t('Tokens puestos a mano')));
    c.append(texto('p', t('Los de la red {0}. Cada red lleva los suyos.', redActiva.nombre), 'nota'));
    const mios = tokensPropios(redActiva.clave);
    if (!mios.length) {
        c.append(texto('p', t('Todavía no has añadido ninguno.'), 'nota'));
        return c;
    }
    mios.forEach((tk) => {
        c.append(fila(tk.simbolo, ''));
        c.append(texto('div', tk.modulo, 'dir'));
        c.append(boton(t('Quitar este token'), () => {
            borrarToken(redActiva.clave, tk.modulo);
            pintarRed();
        }, 'peligro'));
    });
    return c;
}

/**
 * Importar un token a mano: el contrato y el simbolo, nada mas.
 *
 * Ni chain ni decimales: el saldo se busca en las 20 chains y se suma, igual que
 * el de KDA, y los decimales se recortan al enseñarlos como en el resto de la
 * app. Pedir dos datos que la app puede averiguar sola es pedirle al dueño que
 * haga de programador.
 */
function bloqueAnadirToken() {
    const c = caja();
    c.append(texto('h3', t('Importar un token')));
    c.append(texto('p', t('Para ver en el panel un token que la app no trae de fábrica.'), 'nota'));

    const campos = [
        ['token-modulo', t('Contrato del token'), 'n_48867b242317a0216a67f8c7ca26696b5878e0e3.SPT'],
        ['token-simbolo', t('Símbolo'), 'SPT'],
    ].map(([id, etiqueta, pista]) => {
        const d = document.createElement('div');
        d.className = 'campo';
        const l = document.createElement('label');
        l.setAttribute('for', id);
        l.textContent = etiqueta;
        const i = document.createElement('input');
        i.id = id;
        i.spellcheck = false;
        i.placeholder = pista;
        d.append(l, i);
        c.append(d);
        return i;
    });

    const salida = document.createElement('div');
    c.append(boton(t('Añadir el token'), () => {
        salida.innerHTML = '';
        try {
            anadirToken(redActiva.clave, { modulo: campos[0].value, simbolo: campos[1].value });
            pintarRed();
        } catch (e) {
            salida.append(texto('p', t(String(e.message || e)), 'malo'));
        }
    }, 'primario'));
    c.append(salida);

    // Lo que hay que decir antes de que alguien pegue aqui el contrato de un
    // tercero. Lo primero es lo que mas sorprende: aqui los tokens se miran.
    c.append(texto('p', t('Un token añadido a mano solo se VE: desde el móvil se envía KDA, no tokens. El contrato que pongas no llega a firmar nada.'), 'nota'));
    c.append(texto('p', t('Y ojo: un contrato cualquiera puede devolver el saldo que le dé la gana. Añade solo los que conozcas; ver un número aquí no prueba que tengas ese dinero.'), 'nota'));
    return c;
}

// --- Seccion Ajustes --------------------------------------------------------
/**
 * El interruptor de la huella.
 *
 * Lo que hay que contarle al dueño, y se le cuenta con todas las letras: activar
 * esto GUARDA su contraseña en este aparato. Cifrada, y detrás de una clave del
 * chip que solo se deja usar tras identificarse -y que se invalida sola si
 * alguien añade una huella nueva al móvil-, pero guardada. Quien no quiera eso,
 * no lo activa y sigue tecleándola. Por eso viene apagado de fábrica.
 */
function bloqueHuella() {
    const c = caja();
    c.append(texto('h2', t('Huella o cara')));
    const donde = texto('div');
    c.append(donde);

    const pinta = async () => {
        donde.innerHTML = '';
        let bio;
        try {
            bio = await boveda.bioEstado();
        } catch (_) {
            donde.append(texto('p', t('No se pudo consultar el lector de este aparato.'), 'nota'));
            return;
        }
        if (!bio.disponible && !bio.activada) {
            donde.append(texto('p', t(String(bio.motivo || 'Este móvil no admite identificación segura.')), 'nota'));
            return;
        }
        if (bio.activada) {
            donde.append(texto('p', t('Activada: se te pide la huella o la cara en lugar de la contraseña, que se sigue admitiendo siempre.'), 'nota'));
            donde.append(boton(t('Dejar de usar la huella'), async () => {
                await boveda.bioBorrar();
                pinta();
            }, 'secundario'));
            return;
        }
        donde.append(texto('p', t('Para no teclear la contraseña en cada firma. Al activarlo, tu contraseña queda guardada en este móvil, cifrada con una clave del chip que solo se abre con tu huella o tu cara.'), 'nota'));
        const campo = document.createElement('div');
        campo.className = 'campo';
        const l = document.createElement('label');
        l.setAttribute('for', 'huella-clave');
        l.textContent = t('Contraseña de la cartera');
        const i = document.createElement('input');
        i.type = 'password';
        i.id = 'huella-clave';
        i.autocomplete = 'off';
        campo.append(l, i);
        donde.append(campo);
        const b = boton(t('Activar la huella'), async () => {
            b.disabled = true;
            try {
                await boveda.bioActivar(i.value);
                pinta();
            } catch (e) {
                b.disabled = false;
                donde.append(texto('p', t(String(e.message || e)), 'malo'));
            }
        });
        donde.append(b);
    };
    pinta();
    return c;
}

function pintarAjustes() {
    app().innerHTML = '';

    // Tema. Claro por defecto; "el del sistema" sigue al móvil, que es lo que
    // espera quien tiene puesto el modo noche por horario.
    const cTema = caja();
    cTema.append(texto('h2', t('Aspecto')));
    cTema.append(desplegable('tema', t('Tema'), [
        ['claro', t('Claro')], ['oscuro', t('Oscuro')], ['sistema', t('El del sistema')],
    ], temaElegido(), (v) => fijarTema(v)));

    // Idioma. Por defecto se sigue al móvil; quien lo tenga en inglés no tiene
    // por que encontrarse una app en español sin poder cambiarla.
    cTema.append(desplegable('idioma', t('Idioma'), [
        ['es', t('Español')], ['en', t('Inglés')], ['sistema', t('El del sistema')],
    ], idiomaElegido(), (v) => {
        fijarIdioma(v);
        // Se repinta entero, barra incluida: media app en un idioma y media en
        // otro se ve a la legua.
        pintarApp(cuentasActuales);
    }));

    // Moneda de referencia. NO cambia en qué se cobra ni en qué se paga -eso es
    // siempre KDA-: cambia la vara de medir con la que se enseña lo que vale, en
    // el Panel y en el conversor de Recibir.
    // Los nombres van literales y no en moneda.js: ver el comentario de MONEDAS.
    const nombreMoneda = {
        eur: t('Euro'),
        usd: t('Dólar estadounidense'),
        gbp: t('Libra esterlina'),
        chf: t('Franco suizo'),
    };
    cTema.append(desplegable('moneda', t('Moneda de referencia'),
        CODIGOS.map((c) => [c, `${MONEDAS[c].iso} · ${nombreMoneda[c] || MONEDAS[c].iso}`]),
        monedaElegida(), (v) => {
            fijarMoneda(v);
            // Se repinta entero: el total del Panel lleva la moneda dentro y
            // quedarse con la anterior en pantalla es enseñar un precio falso.
            pintarApp(cuentasActuales);
        }));
    cTema.append(texto('p', t('Solo cambia en qué moneda se te enseña lo que vale. El dinero sigue siendo KDA.'), 'nota'));
    app().append(cTema);

    // Ojito de privacidad: tapa las cifras sin cerrar la cartera, para mirar el
    // movil delante de alguien. No cambia nada, solo lo que se ve.
    const cPriv = caja();
    cPriv.append(texto('h2', t('Privacidad')));
    const tapado = document.body.classList.contains('sinsaldos');
    cPriv.append(texto('p', t('Tapa las cantidades en pantalla. No bloquea la cartera ni cambia nada: solo deja de enseñar el dinero.'), 'nota'));
    const bPriv = boton(t(tapado ? 'Volver a mostrar los saldos' : 'Ocultar los saldos'), () => {
        const ahora = document.body.classList.toggle('sinsaldos');
        try { localStorage.setItem('koberlet.sinsaldos', ahora ? '1' : '0'); } catch (_) { /* modo incógnito */ }
        bPriv.textContent = t(ahora ? 'Volver a mostrar los saldos' : 'Ocultar los saldos');
    }, 'secundario');
    cPriv.append(bPriv);
    app().append(cPriv);

    // Huella o cara en lugar de teclear la contraseña.
    app().append(bloqueHuella());

    // La agenda. Se guarda desde la pantalla de envio, que es donde uno tiene la
    // cuenta delante; aqui se ve entera y se quita lo que sobra.
    app().append(bloqueAgenda());

    // Copia de seguridad y semilla: son de Ajustes tanto como de Seguridad, pero
    // se dejan enlazadas aqui porque es donde las busca la gente.
    const cCopia = caja();
    cCopia.append(texto('h2', t('Copia de seguridad')));
    cCopia.append(texto('p', t('Guarda o restaura el fichero cifrado de la bóveda.'), 'nota'));
    cCopia.append(boton(t('Abrir copias de seguridad'), () => ir('copias'), 'secundario'));
    app().append(cCopia);

    // El estado de la red se mira de higos a brevas y ocupaba un botón propio en
    // «Más». Aquí abajo está, y quien lo busca lo busca en Ajustes. Entrar es lo
    // mismo que antes: la pantalla no ha cambiado, solo la puerta.
    const cRed = caja();
    cRed.append(texto('h2', t('Red')));
    cRed.append(texto('p', t('A qué nodo se pregunta, si contesta y por qué altura va la cadena.'), 'nota'));
    cRed.append(boton(t('Ver el estado de la red'), () => ir('red'), 'secundario'));
    app().append(cRed);

    // Cerrar la cartera
    const cBloq = caja();
    cBloq.append(texto('h2', t('Bloquear')));
    cBloq.append(texto('p', t('Cierra la cartera. Para volver a abrirla hará falta la contraseña.'), 'nota'));
    cBloq.append(boton(t('Bloquear ahora'), () => bloquear()));
    // Lo que uno quiere de verdad al terminar: cerrar la cartera Y perder la app
    // de vista, en un gesto. En Android no hay boton de cerrar, asi que si no se
    // pone aqui no existe.
    if (esNativo()) {
        cBloq.append(boton(t('Bloquear y salir'), async () => {
            await bloquear();
            alFondo();
        }, 'secundario'));
    }
    // Cuanto aguanta abierta sin que la toques. Es lo unico de esta pantalla que
    // decide algo de seguridad, asi que se dice en claro lo que hace cada opcion.
    cBloq.append(desplegable('cerrojo', t('Bloquear sola si no la tocas'), TIEMPOS.map((m) => [
        String(m), m === 0 ? t('Nunca (no recomendado)') : (m === 1 ? t('1 minuto') : t('{0} minutos', m)),
    ]), String(minutosCerrojo()), (v) => {
        fijarMinutosCerrojo(Number(v));
        pintarAjustes();
    }));
    cBloq.append(texto('p', t(minutosCerrojo()
        ? 'Cuenta igual con la app delante que en segundo plano: el tiempo sin tocarla es tiempo sin tocarla.'
        : 'Así la cartera se queda abierta hasta que la bloquees a mano o cierres la app del todo.'), 'nota'));
    app().append(cBloq);

    // Aqui habia un bloque «Esta app» con la version y un boton a Info. Fuera: la
    // version ya esta en Info, e Info esta a un toque en «Más». Un cajon en
    // Ajustes cuyo unico contenido es un enlace a otra pantalla es un peldaño de
    // mas, no una comodidad.
}

// --- Sonda del nodo ---------------------------------------------------------
// Dice a que cadena estamos conectados de verdad, y de paso deja probado el
// camino GET de la capa de red.
async function comprobarNodo() {
    let linea = $('diag-nodo');
    if (!linea) {
        linea = document.createElement('div');
        linea.id = 'diag-nodo';
        $('diag').append(linea);
    }
    linea.textContent = `nodo ${redActiva.nodo}: comprobando…`;
    try {
        const { altura, chains, ms } = await alturaCadena(redActiva.nodo, redActiva.networkId);
        linea.textContent = `nodo ${redActiva.nodo}: vivo · ${chains} chains · altura ${altura.toLocaleString(locale())} · ${ms} ms (GET)`;
    } catch (e) {
        linea.textContent = `nodo ${redActiva.nodo}: sin respuesta — ${t(String(e.message || e))}`;
    }
}

/**
 * Cierra la cartera y vuelve a la portada.
 *
 * Un solo sitio para esto porque lo llaman tres: el boton de Ajustes, el de
 * «bloquear y salir» y el cerrojo automatico de segundo plano.
 */
/**
 * Por qué se cerró, para poder decirlo en la portada.
 *
 * Un cierre automático que te devuelve a la pantalla de entrar SIN decir nada se
 * lee como que la app ha fallado -pasó de verdad: un probador creyó que la
 * restauración de su copia no funcionaba, y lo que había ocurrido es esto-. Si la
 * app hace algo por su cuenta, tiene que contarlo.
 */
let porQueSeCerro = null;

async function bloquear(motivo = null) {
    porQueSeCerro = motivo;
    await boveda.cerrar();
    cuentasActuales = [];
    quitarBarra();
    await arrancarSegunEstado();
}

/** Enseña o esconde la cabecera de la app (la portada trae la suya). */
function cabecera(visible) {
    const h = document.querySelector('header');
    if (h) h.hidden = !visible;
}

// --- Arranque ---------------------------------------------------------------
async function arrancarSegunEstado() {
    // LAS POLITICAS VAN DELANTE DE TODO: antes de la cartera, antes de la contraseña
    // y antes de cualquier saldo. Se enseñan la primera vez y cada vez que cambie su
    // version, porque lo aceptado antes ya no es lo que pone ahora.
    if (hayQueAceptar()) {
        quitarBarra();
        cabecera(true);
        $('sub').textContent = t('Políticas de uso');
        pintarPoliticas(app(), () => { arrancarSegunEstado(); });
        return;
    }

    const estado = await boveda.estado();
    cabecera(true);
    if (!estado.existe) {
        // Sin cartera todavia no hay secciones que enseñar: la barra abajo solo
        // seria una fila de botones que llevan a pantallas vacias.
        quitarBarra();
        $('sub').textContent = t('Primer uso');
        pintarBienvenida(app(), { motor, alTerminar: pintarApp });
    } else if (!estado.abierta) {
        quitarBarra();
        // La portada lleva ya su propio nombre y su lema, asi que la cabecera de
        // la app sobra: dos «Koberlet» seguidos es ruido.
        cabecera(false);
        // El motivo se gasta al enseñarlo: es de este cierre, no del siguiente.
        const avisoCierre = porQueSeCerro;
        porQueSeCerro = null;
        pintarDesbloqueo(app(), { motor, alTerminar: pintarApp, avisoCierre });
    } else {
        pintarApp(await boveda.cuentas());
    }
}

async function arrancar() {
    arrancarTema();
    arrancarIdioma();
    $('sub').textContent = t('Cargando…');
    motor = await prepararBoveda();

    // El ojito de privacidad se recuerda entre arranques: quien lo pone es porque
    // no quiere enseñar el saldo, y tener que volver a ponerlo cada vez es lo que
    // hace que se deje de usar.
    try {
        if (localStorage.getItem('koberlet.sinsaldos') === '1') document.body.classList.add('sinsaldos');
    } catch (_) { /* sin almacenamiento: se queda visible */ }

    $('diag').textContent =
        `Koberlet ${__VERSION__} · ${esNativo() ? 'APK' : 'navegador'}\n` +
        `red: ${caminoRed()}\n` +
        `bóveda: ${motor}\n` +
        `${navigator.userAgent}`;

    comprobarNodo();

    // El cerrojo de segundo plano y el boton de atras se enchufan una sola vez,
    // al arrancar: son del aparato, no de la pantalla que se este pintando.
    vigilarCerrojo(
        () => bloquear(t('Se cerró sola por seguridad: llevaba un rato sin tocarse. Se cambia en Ajustes.')),
        async () => (await boveda.estado()).abierta,
    );
    vigilarAtras(() => seccionActual() === 'panel', () => ir('panel'));

    // Un QR de cobro leido con la camara del movil abre la app aqui. Si la
    // cartera esta cerrada no se hace nada especial: el enlace espera guardado y
    // lo recoge el Panel en cuanto se desbloquea, con la contraseña de siempre.
    await vigilarEnlaces(async () => {
        if (!(await boveda.estado()).abierta) return;
        if (seccionActual() !== 'panel') ir('panel');
        else await pintarSeccion('panel');
    });

    await arrancarSegunEstado();
    // El aviso de version nueva va despues de pintar: si el servidor de descargas
    // tarda o no contesta, la app ya esta usable y no se queda esperando.
    avisarSiHay(app());
}

arrancar();
