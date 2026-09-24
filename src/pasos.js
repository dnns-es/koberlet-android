// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LA ESCALERA DE PASOS DE ALGO QUE MUEVE DINERO.
//
// Lo pidió Antonio: «el no ver nada cuando se mueve dinero causa nerviosismo, y
// más si es proceso largo». Y tiene razón en lo que importa. Entre que se firma y
// la transacción aparece en un bloque de Kadena puede pasar un minuto largo, y una
// pantalla callada durante un minuto no parece que esté trabajando: parece que se
// ha colgado.
//
// Eso no es solo incomodidad. Quien cree que la app se ha colgado vuelve a pulsar,
// y volver a pulsar cuando el dinero ya ha salido es la forma de mandarlo dos
// veces. Enseñar por dónde va es, antes que una cortesía, el freno.
//
// Tres cosas hacen falta, y las tres por motivos distintos:
//
//   - EL PASO en el que se está, para saber si el dinero ya ha salido o todavía no.
//   - EL SEGUNDERO, porque un texto fijo que diga «esperando» tampoco distingue
//     esperar de estar muerto; un número que sube, sí.
//   - EL AVISO DE QUE ESTO TARDA, dicho ANTES de que la gente se ponga nerviosa y
//     no después. Si nadie dice cuánto es normal esperar, cualquier espera parece
//     demasiada.

import { t } from './idioma.js';

function elemento(tag, texto, clase) {
    const e = document.createElement(tag);
    if (texto != null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

/** A partir de aquí la espera deja de ser normal y se dice. */
const TARDA_DE_MAS = 180;   // segundos

/**
 * @param nombres  lista de pasos. Cada uno es un texto, o `{ que, aviso, tarda }`:
 *                 `aviso` es lo que se pinta debajo mientras ese paso está en
 *                 marcha, y `tarda` (true) añade el recordatorio de paciencia.
 */
export function pasos(nombres) {
    const c = elemento('div', null, 'pasos');
    const lista = elemento('div');
    const pie = elemento('div', null, 'pasos-pie');
    c.append(lista, pie);

    const filas = nombres.map((n) => {
        const spec = typeof n === 'string' ? { que: n } : n;
        const f = elemento('div', null, 'paso');
        const marca = elemento('span', '·', 'paso-marca');
        const det = elemento('span', '', 'paso-det');
        f.append(marca, elemento('span', spec.que, 'paso-que'), det);
        lista.append(f);
        return { f, marca, det, spec };
    });

    let reloj = null;
    let enCurso = -1;
    // El parte de lo que va pasando mientras se espera. Es UNA línea que se
    // reescribe, no un rosario de mensajes: lo que importa es lo último, y una
    // lista que crece sola acaba empujando fuera de la pantalla todo lo demás.
    let parte = null;

    function paraReloj() {
        if (reloj) { clearInterval(reloj); reloj = null; }
    }

    function marcaHecho(i) {
        filas[i].f.className = 'paso hecho';
        filas[i].marca.textContent = '✓';
    }

    function limpiaPie() { pie.textContent = ''; parte = null; }

    return {
        caja: c,

        /**
         * Pone el paso `i` en marcha y da por hechos todos los anteriores.
         *
         * `desde` es desde cuándo lleva corriendo, para cuando la escalera se pinta
         * de nuevo a mitad de una operación -se salió de la pantalla y se volvió-:
         * el reloj tiene que seguir donde iba, no empezar de cero, que diría que
         * acaba de empezar algo que lleva dos minutos.
         */
        empieza(i, desdeCuando) {
            paraReloj();
            for (let k = 0; k < i; k++) marcaHecho(k);
            if (enCurso >= 0 && enCurso < i) filas[enCurso].det.textContent = '';
            enCurso = i;

            filas[i].f.className = 'paso ahora';
            // Un circulito girando en vez de un reloj de arena quieto: el emoji es
            // un dibujo que no se mueve, y lo que hace falta aquí es justo lo
            // contrario, algo que demuestre que la app sigue viva mientras espera.
            filas[i].marca.textContent = '';
            filas[i].marca.append(elemento('span', null, 'girando'));

            limpiaPie();
            if (filas[i].spec.aviso) pie.append(elemento('p', filas[i].spec.aviso, 'nota'));
            if (filas[i].spec.tarda) {
                pie.append(elemento('p', t('Ten paciencia: esto suele tardar uno o dos minutos. No cierres la app ni vuelvas a pulsar; sigue en marcha.'), 'nota'));
            }

            const desde = desdeCuando || Date.now();
            let avisadoDeMas = false;
            const pon = () => {
                const s = Math.round((Date.now() - desde) / 1000);
                filas[i].det.textContent = s < 60
                    ? s + ' s'
                    : Math.floor(s / 60) + ' min ' + (s % 60) + ' s';
                return s;
            };
            pon();
            reloj = setInterval(() => {
                const s = pon();
                // Pasados los tres minutos, callarse ya no vale: a esas alturas la
                // duda no es «cuánto queda» sino «se ha perdido esto». Se contesta
                // esa, que es distinta.
                if (s >= TARDA_DE_MAS && !avisadoDeMas) {
                    avisadoDeMas = true;
                    pie.append(elemento('p', t('Está tardando más de lo normal. No se ha perdido: sigue preguntando, y aunque se cierre la app queda la referencia para mirarlo luego.'), 'nota'));
                }
            }, 1000);
        },

        /**
         * Cuenta en una línea qué está pasando ahora mismo, sin tocar los pasos.
         * Sirve para el «sigo preguntando al nodo» de cada pocos segundos: sin eso,
         * entre que se manda y aparece en un bloque no hay forma de distinguir una
         * espera normal de una app que ya no está hablando con nadie.
         */
        cuenta(texto) {
            if (!parte) {
                parte = elemento('p', null, 'nota');
                pie.append(parte);
            }
            parte.textContent = texto;
        },

        /** Todo salió: los deja marcados y suelta el reloj. */
        acaba() {
            paraReloj();
            limpiaPie();
            for (let k = 0; k < filas.length; k++) marcaHecho(k);
            if (enCurso >= 0) filas[enCurso].det.textContent = '';
            enCurso = -1;
        },

        /**
         * Ni salió ni falló: va en camino y no se sabe cuándo entrará.
         *
         * Existe porque marcar esto como fallo es exactamente lo que hizo que la
         * gente reenviara KDA que ya estaba viajando: el envío iba bien, solo que
         * el bloque tardaba más que la espera. Un reloj naranja no es un ✗.
         */
        enCamino() {
            paraReloj();
            limpiaPie();
            if (enCurso < 0) return;
            filas[enCurso].f.className = 'paso camino';
            filas[enCurso].marca.textContent = '⏳';
            filas[enCurso].det.textContent = '';
            enCurso = -1;
        },

        /** Se torció en el paso que estuviera en marcha. */
        falla() {
            paraReloj();
            limpiaPie();
            if (enCurso < 0) return;
            filas[enCurso].f.className = 'paso mal';
            filas[enCurso].marca.textContent = '✗';
            filas[enCurso].det.textContent = '';
            enCurso = -1;
        },
    };
}

/**
 * El `alMirar` que espera `esperarResultado`, contando lo que pasa cada 15
 * segundos: tres vueltas de cinco. Lo pidió Antonio -«refréscame información cada
 * 15 segundos en la operación»- y es lo que separa una espera normal de una app
 * que ya no habla con nadie.
 *
 * Cada vuelta no: una línea que cambia cada cinco segundos se lee como nerviosismo
 * y no dice nada nuevo. Un fallo del nodo, en cambio, se dice en cuanto pasa,
 * porque «todavía no está» y «no se puede preguntar» son cosas distintas.
 */
export function parteDelNodo(esc, cada = 3) {
    return (vuelta, total, respondio) => {
        if (!respondio) {
            esc.cuenta(t('El nodo no contestó a la última consulta. Se sigue intentando.'));
            return;
        }
        if (vuelta % cada !== 0) return;
        esc.cuenta(t('Preguntado {0} veces al nodo: todavía no está en un bloque.', vuelta));
    };
}
