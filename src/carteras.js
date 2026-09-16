// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// GESTION DE CARTERAS: añadir otra, renombrar y quitar.
//
// Varias carteras en el mismo aparato es lo normal en cuanto alguien lleva un
// tiempo: la de diario, la de los ahorros, la de un proyecto. Todas viven en la
// MISMA boveda y se abren con la MISMA contrasena; lo que las separa es la
// semilla, que es lo que de verdad separa el dinero.

import { boveda, contrasenaDebil } from './boveda/contrato.js';
import { t } from './idioma.js';
import { nombreCartera } from './nombres.js';
import { selectorRed } from './cartera-activa.js';
import { corta } from './direccion.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function boton(texto, alPulsar, clase) {
    const b = document.createElement('button');
    b.textContent = texto;
    if (clase) b.className = clase;
    b.addEventListener('click', alPulsar);
    return b;
}

function campoTexto(etiqueta, id, valor = '') {
    const c = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiqueta;
    const i = document.createElement('input');
    i.id = id;
    i.value = valor;
    i.spellcheck = false;
    c.append(l, i);
    return c;
}

function campoClave(etiqueta, id) {
    const c = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiqueta;
    const fila = elemento('div', null, 'pwd');
    const i = document.createElement('input');
    i.type = 'password';
    i.id = id;
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
    c.append(l, fila);
    return c;
}

function error(donde, texto) {
    donde.innerHTML = '';
    donde.append(elemento('p', texto, 'malo'));
}

// --- Lista de carteras ------------------------------------------------------

/**
 * Seccion "Carteras": que carteras hay en este aparato y que se puede hacer con
 * cada una. Aqui NO se enseñan saldos a proposito: eso es el Panel. Esta pantalla
 * es la de administrar, y mezclar dinero con botones de borrar invita al susto.
 *
 * @param ctx { motor, cuentas, alTerminar, alVolver }
 */
export function pintarListaCarteras(raiz, ctx) {
    raiz.innerHTML = '';

    // Las cuentas vienen planas (una por cartera); se agrupan por cartera.
    const porCartera = new Map();
    ctx.cuentas.forEach((cu) => {
        const id = cu.carteraId || 'c1';
        if (!porCartera.has(id)) porCartera.set(id, { id, nombre: nombreCartera(cu.cartera), cuentas: [] });
        porCartera.get(id).cuentas.push(cu);
    });
    const todas = [...porCartera.values()].map((g) => ({ ...g, red: redDe(g) }));

    const volver = () => pintarListaCarteras(raiz, ctx);
    const anadir = () => pintarAnadirCartera(raiz, {
        motor: ctx.motor, red: pestanaGuardada(),
        alVolver: volver, alTerminar: ctx.alTerminar,
    });

    // Cabecera: la red que se está mirando y el botón de añadir. Arriba, porque es
    // lo primero que se busca al entrar aquí.
    const cab = elemento('div', null, 'cab-seccion');
    const mas = boton(t('Añadir wallet'), anadir, 'anadir');
    cab.append(elemento('span', t('Wallets'), 'cab-titulo'), mas);
    raiz.append(cab);

    const pestanas = elemento('div', null, 'pestanas');
    let red = pestanaGuardada();
    [['kda', 'Kadena'], ['evm', 'Ethereum']].forEach(([v, nombre]) => {
        const b = boton(nombre, () => {
            guardarPestana(v);
            pintarListaCarteras(raiz, ctx);
        }, 'pestana' + (v === red ? ' on' : ''));
        pestanas.append(b);
    });
    raiz.append(pestanas);

    const lista = todas.filter((g) => g.red === red);
    if (!lista.length) {
        const c = elemento('div', null, 'caja');
        c.append(elemento('p', t('Todavía no tienes ninguna wallet en esta red.'), 'nota'));
        c.append(boton(t('Añadir wallet'), anadir));
        raiz.append(c);
        return;
    }

    // Una wallet, una fila: el punto de su red, el nombre con la dirección
    // acortada debajo, y «Ver» a la derecha. La dirección entera está a un toque,
    // dentro; aquí lo que hace falta es reconocer cuál es cada una de un vistazo.
    lista.forEach((grupo) => {
        const cuenta = grupo.cuentas[0];
        const f = elemento('div', null, 'wallet-fila' + (grupo.red === 'evm' ? ' eth' : ''));
        f.append(elemento('span', grupo.red === 'evm' ? 'E' : 'K', 'wallet-punto'));

        const medio = elemento('div', null, 'wallet-medio');
        medio.append(elemento('div', grupo.nombre, 'nombre-wallet'));
        if (cuenta) medio.append(elemento('div', corta(cuenta.cuenta), 'dir'));
        f.append(medio);

        f.append(boton(t('Ver'), () => pintarCartera(raiz, {
            ...ctx, grupo, puedeQuitar: todas.length > 1, alVolver: volver,
        }), 'ver-wallet'));
        raiz.append(f);
    });
}

/** La red de una cartera, mirando la cuenta que tiene. */
function redDe(grupo) {
    const cu = grupo.cuentas[0];
    return cu && cu.tipo === 'evm' ? 'evm' : 'kda';
}

const PESTANA = 'koberlet.carteras.red';

function pestanaGuardada() {
    try {
        const v = localStorage.getItem(PESTANA);
        return v === 'evm' ? 'evm' : 'kda';
    } catch (_) { return 'kda'; }
}

function guardarPestana(v) {
    try { localStorage.setItem(PESTANA, v); } catch (_) { /* navegación privada */ }
}

// --- Una cartera por dentro --------------------------------------------------

/**
 * Lo que se puede hacer con UNA cartera. Vive en su propia pantalla y no en la
 * lista por un motivo: «Quitarla de este aparato» borra la semilla, y un botón
 * así no debe estar a un dedo de distancia mientras uno repasa la lista.
 */
function pintarCartera(raiz, ctx) {
    raiz.innerHTML = '';
    const grupo = ctx.grupo;
    const cuenta = grupo.cuentas[0];

    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', grupo.nombre));
    c.append(elemento('div', t(grupo.red === 'evm' ? 'Ethereum' : 'Kadena'), 'nota'));
    c.append(elemento('div', cuenta ? cuenta.cuenta : '', 'dir'));

    if (cuenta) {
        const copiar = boton(t('Copiar dirección'), async () => {
            let bien = false;
            try { await navigator.clipboard.writeText(cuenta.cuenta); bien = true; } catch (_) { bien = false; }
            copiar.textContent = bien ? t('✓ Copiada') : t('No se pudo copiar: mantén pulsado el texto');
            setTimeout(() => { copiar.textContent = t('Copiar dirección'); }, 2500);
        }, 'secundario');
        c.append(copiar);
    }

    c.append(boton(t('Cambiarle el nombre'), () => pintarRenombrar(raiz, {
        carteraId: grupo.id, nombre: grupo.nombre,
        alVolver: () => pintarCartera(raiz, ctx),
        alTerminar: ctx.alTerminar,
    }), 'secundario'));

    // Quitar solo tiene sentido si queda otra: la bóveda no se queda sin carteras,
    // y enseñar un botón que siempre falla no ayuda a nadie.
    if (ctx.puedeQuitar) {
        c.append(boton(t('Quitarla de este aparato'), () => pintarBorrarCartera(raiz, {
            carteraId: grupo.id, nombre: grupo.nombre,
            alVolver: () => pintarCartera(raiz, ctx),
            alTerminar: ctx.alTerminar,
        }), 'secundario'));
    }

    // La semilla y la clave privada de ESTA cartera, aquí mismo y cada una por su
    // lado: son dos secretos distintos y quien viene a por uno no tiene por qué
    // pasar por un desplegable. La pantalla es la de siempre (`revelar.js`): pide
    // la contraseña aunque la cartera esté abierta, y en el móvil no deja copiar
    // la semilla al portapapeles.
    const conSemilla = grupo.cuentas.every((cu) => cu.conSemilla !== false);

    const revelar = async (cual) => {
        const { pintarRevelar, opcionesDe } = await import('./revelar.js');
        const opciones = opcionesDe(grupo);
        const elegida = opciones.find((o) =>
            cual === 'semilla' ? o[0].startsWith('semilla:') : !o[0].startsWith('semilla:'));
        pintarRevelar(raiz, {
            opciones: elegida ? [elegida] : opciones,
            alVolver: () => pintarCartera(raiz, ctx),
        });
    };
    // El botón de la semilla solo si esta cartera tiene semilla: las que se
    // metieron por su clave privada no la tienen ni la pueden tener.
    if (conSemilla) c.append(boton(t('Ver la semilla (12 o 24 palabras)'), () => revelar('semilla'), 'secundario'));
    c.append(boton(t('Ver la clave privada'), () => revelar('clave'), 'secundario'));
    if (!conSemilla) {
        c.append(elemento('p', t('Esta cartera se metió por su clave privada: no tiene 12 palabras. Su única copia de seguridad es esa clave.'), 'nota'));
    }

    c.append(boton(t('Volver'), () => ctx.alVolver(), 'secundario'));
    raiz.append(c);
}

// --- Añadir otra cartera ----------------------------------------------------

export function pintarAnadirCartera(raiz, ctx) {
    raiz.innerHTML = '';
    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Añadir wallet')));
    c.append(elemento('p', t('Se guarda en la misma bóveda y se abre con la misma contraseña. Cada cartera es de una sola red; la misma semilla puede tener una de Kadena y otra de Ethereum.'), 'nota'));
    c.append(campoTexto(t('Nombre para reconocerla'), 'nombre', t('Cartera nueva')));
    // La red va aquí arriba porque vale para las dos puertas de abajo: crear una
    // cartera nueva o importar una semilla que ya tienes.
    const red = selectorRed('red', ctx.red);
    c.append(red.caja);
    c.append(campoClave(t('Contraseña de la bóveda'), 'clave'));

    const salida = elemento('div');

    c.append(boton(t('Crear una cartera nueva'), async () => {
        const nombre = document.getElementById('nombre').value.trim() || 'Cartera nueva';
        const clave = document.getElementById('clave').value;
        salida.innerHTML = '';
        try {
            const { semilla, cuentas } = await boveda.crear(clave, nombre, red.valor());
            pintarSemillaNueva(raiz, { ...ctx, semilla, cuentas });
        } catch (e) {
            error(salida, t(String(e.message || e)));
        }
    }));

    // Importar: aqui NO se valida la fortaleza de la contrasena, porque es la de
    // la boveda que ya existe; el suelo se puso al crearla.
    const cSemilla = elemento('div', null, 'campo');
    const l = document.createElement('label');
    l.setAttribute('for', 'semilla');
    l.textContent = t('O importa una que ya tengas (12 o 24 palabras)');
    const ta = document.createElement('textarea');
    ta.id = 'semilla';
    ta.rows = 3;
    ta.autocapitalize = 'off';
    ta.spellcheck = false;
    cSemilla.append(l, ta);
    c.append(cSemilla);

    c.append(boton(t('Importar esa semilla'), async () => {
        const nombre = document.getElementById('nombre').value.trim() || 'Cartera importada';
        salida.innerHTML = '';
        try {
            const { cuentas } = await boveda.importar(document.getElementById('clave').value, ta.value, nombre, red.valor());
            ctx.alTerminar(cuentas);
        } catch (e) {
            error(salida, t(String(e.message || e)));
        }
    }, 'secundario'));

    // Tercera puerta: una CLAVE PRIVADA suelta. Hay cuentas que solo existen así
    // -salieron de otra herramienta, o alguien las apuntó en hex en su día- y sin
    // esto no hay forma de traerlas. Lo que no se puede es fingir que tienen
    // semilla: de una privada no se vuelve a las 12 palabras, y la pantalla lo
    // avisa antes de que nadie tire el papel pensando que ya la tiene aquí.
    const cClave = elemento('div', null, 'campo');
    const lc = document.createElement('label');
    lc.setAttribute('for', 'privada');
    lc.textContent = t('O importa una clave privada (64 caracteres)');
    const tc = document.createElement('textarea');
    tc.id = 'privada';
    tc.rows = 2;
    tc.autocapitalize = 'off';
    tc.spellcheck = false;
    cClave.append(lc, tc);
    c.append(cClave);
    c.append(elemento('p', t('Una cartera metida por su clave privada no tiene palabras y nunca las tendrá: su única copia de seguridad es esa clave.'), 'nota'));

    c.append(boton(t('Importar esa clave'), async () => {
        const nombre = document.getElementById('nombre').value.trim() || 'Cartera importada';
        salida.innerHTML = '';
        try {
            const { cuentas } = await boveda.importarClave(
                document.getElementById('clave').value, tc.value, nombre, red.valor());
            ctx.alTerminar(cuentas);
        } catch (e) {
            error(salida, t(String(e.message || e)));
        }
    }, 'secundario'));

    c.append(salida, boton(t('Volver'), () => ctx.alVolver(), 'secundario'));
    raiz.append(c);
}

function pintarSemillaNueva(raiz, ctx) {
    raiz.innerHTML = '';
    raiz.append(elemento('div',
        t('Apunta estas palabras EN PAPEL. Son esa cartera entera: quien las tenga se lleva su dinero, y si las pierdes no hay forma de recuperarlo.'),
        'caja avisa'));

    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Semilla de la cartera nueva')));
    const lista = document.createElement('ol');
    lista.className = 'semilla';
    ctx.semilla.split(' ').forEach((p) => lista.append(elemento('li', p)));
    c.append(lista);

    if (ctx.motor === 'simulada') {
        c.append(boton(t('Copiar'), async (e) => {
            try { await navigator.clipboard.writeText(ctx.semilla); e.target.textContent = t('✓ Copiada'); }
            catch (_) { e.target.textContent = t('No se pudo copiar'); }
        }, 'secundario'));
    }

    c.append(boton(t('Ya la he apuntado'), () => ctx.alTerminar(ctx.cuentas)));
    raiz.append(c);
}

// --- Renombrar --------------------------------------------------------------

export function pintarRenombrar(raiz, ctx) {
    raiz.innerHTML = '';
    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Cambiar el nombre')));
    c.append(elemento('p', t('El nombre es solo para que la reconozcas tú; no viaja a ninguna parte ni cambia nada de la cadena.'), 'nota'));
    c.append(campoTexto(t('Nombre'), 'nombre', ctx.nombre));
    c.append(campoClave(t('Contraseña de la bóveda'), 'clave'));
    const salida = elemento('div');

    c.append(boton(t('Guardar'), async () => {
        try {
            const { cuentas } = await boveda.renombrarCartera(
                document.getElementById('clave').value, ctx.carteraId, document.getElementById('nombre').value);
            ctx.alTerminar(cuentas);
        } catch (e) {
            error(salida, t(String(e.message || e)));
        }
    }));
    c.append(salida, boton(t('Volver'), () => ctx.alVolver(), 'secundario'));
    raiz.append(c);
}

// --- Quitar -----------------------------------------------------------------

/**
 * Quitar una cartera borra su semilla de este aparato. Va en dos pasos y con el
 * aviso escrito con todas las letras, porque es de las cosas que no tienen
 * vuelta: si no esta apuntada en papel, el dinero que tenga se queda donde este
 * para siempre.
 */
export function pintarBorrarCartera(raiz, ctx) {
    raiz.innerHTML = '';
    raiz.append(elemento('div',
        t('Vas a quitar «{0}» de este aparato. Se borra su semilla: si no la tienes apuntada en papel, el dinero que haya en sus cuentas se queda inalcanzable para siempre. Nadie puede recuperarlo, ni tú ni nosotros.', ctx.nombre),
        'caja avisa'));

    const c = elemento('div', null, 'caja');
    c.append(elemento('h2', t('Quitar la cartera')));
    c.append(elemento('p', t('Si no estás seguro, primero ve a «Ver la semilla» y apúntala. Se puede volver a importar después con esas palabras.'), 'nota'));

    const salida = elemento('div');
    const paso2 = elemento('div');

    c.append(boton(t('Entiendo: la he apuntado o está vacía'), () => {
        paso2.innerHTML = '';
        paso2.append(campoClave(t('Contraseña de la bóveda'), 'clave'));
        const definitivo = boton(t('Quitarla definitivamente'), async () => {
            try {
                const { cuentas } = await boveda.borrarCartera(document.getElementById('clave').value, ctx.carteraId);
                ctx.alTerminar(cuentas);
            } catch (e) {
                error(salida, t(String(e.message || e)));
            }
        });
        definitivo.style.background = 'var(--mal)';
        definitivo.style.color = 'var(--sobre-mal)';
        paso2.append(definitivo);
    }, 'secundario'));

    c.append(paso2, salida, boton(t('Mejor no'), () => ctx.alVolver(), 'secundario'));
    raiz.append(c);
}
