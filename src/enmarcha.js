// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LA OPERACION QUE ESTA EN MARCHA, FUERA DE LA PANTALLA QUE LA EMPEZO.
//
// Un envío por el puente dura minutos. Durante esos minutos la gente hace lo que
// hace cualquiera: se va a mirar el saldo, vuelve, se va a Carteras. Hasta ahora
// eso borraba la pantalla y con ella todo rastro del envío -los pasos, la
// referencia, el reloj-, así que al volver parecía que no había pasado nada.
//
// Lo pidió Antonio: «si hay una operación en marcha y sales de esa pantalla y
// vuelves, estaría bien que marque que hay una operación en marcha». Tiene razón
// y no es comodidad: quien vuelve y no ve nada da por hecho que se perdió, y lo
// siguiente que hace es mandarlo otra vez.
//
// La idea es simple: el envío NO vive en la pantalla, vive aquí. La pantalla solo
// PINTA lo que hay aquí, y se apunta para que la avisen cuando cambia. Por eso lo
// que se guarda son DATOS (textos, referencias), nunca elementos del DOM: los
// elementos se mueren con la pantalla, los datos no.
//
// Lo que esto NO hace, dicho claro: si la app se cierra del todo, la operación se
// pierde de vista. La transacción sigue su camino en la cadena -eso no depende del
// móvil- pero el seguimiento no se reanuda solo. De ahí que la referencia se
// enseñe y se pueda copiar en cuanto existe: es lo que permite retomarla a mano.

/** La única operación en curso. Una cada vez: no se firma nada en paralelo. */
let op = null;

const oyentes = new Set();

function avisar() {
    for (const fn of [...oyentes]) {
        try { fn(op); } catch (_) { /* una pantalla rota no puede tumbar al resto */ }
    }
}

/** Lo que hay en marcha (o terminado y sin cerrar) en esa pantalla, si es que hay algo. */
export function enMarcha(donde) {
    if (!op) return null;
    if (donde && op.donde !== donde) return null;
    return op;
}

/** Avisa cuando cambia. Devuelve la función para dejar de escuchar. */
export function alCambiar(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
}

/** Cierra la ficha de la última operación: ya se ha visto el resultado. */
export function olvidar() {
    op = null;
    avisar();
}

/**
 * Arranca el seguimiento y devuelve con qué contarlo. Quien manda el dinero llama
 * a estos métodos en vez de pintar: pintar es cosa de la pantalla, que puede no
 * estar delante.
 *
 * @param donde  la pantalla a la que pertenece ('puente')
 * @param pasos  la escalera, tal cual la entiende `pasos.js`
 */
export function arrancar({ donde, pasos }) {
    op = {
        donde,
        pasos,
        i: 0,
        desdePaso: Date.now(),
        desde: Date.now(),
        parte: '',
        lineas: [],
        fin: null,
    };
    avisar();

    // El identificador atrapa esta operación concreta: si alguien arranca otra, la
    // vieja ya no puede escribir encima de la nueva.
    const mia = op;
    const viva = () => op === mia;

    return {
        paso(i) {
            if (!viva()) return;
            op.i = i;
            op.desdePaso = Date.now();
            op.parte = '';
            avisar();
        },
        cuenta(texto) {
            if (!viva()) return;
            op.parte = texto;
            avisar();
        },
        /** Una línea de resultado: { tipo: 'texto'|'copiable', ... }. */
        linea(l) {
            if (!viva()) return;
            op.lineas.push(l);
            avisar();
        },
        acaba() {
            if (!viva()) return;
            op.fin = { bien: true };
            avisar();
        },
        falla() {
            if (!viva()) return;
            op.fin = { bien: false };
            avisar();
        },
    };
}
