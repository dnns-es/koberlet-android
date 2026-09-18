// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// MERCADO DE KADENA (el AMM del fork). AQUI NO SE FIRMA NADA.
//
// Portado de `lib/dex.js` del Koberlet de escritorio: se lee el mercado entero de
// la cadena, se cotiza el cambio y se le pregunta al nodo si saldria bien. Cambiar
// de verdad hay que firmarlo, y eso se monta en Kotlin como los envios de KDA; no
// aqui.
//
// Dos cosas que hay que tener claras de este mercado, y que la pantalla enseña sin
// suavizar (van tal cual del escritorio, medidas en la cadena):
//
//   1. Casi todo son charcos. De los 82 pares, la mayoria no llega a 1.000 KDA de
//      fondo. Con ese fondo, un cambio normal mueve el precio una barbaridad.
//   2. Hay precios sin ningun sentido. `cBTC` cotiza a 104 KDA la unidad cuando un
//      bitcoin de verdad son cientos de miles. Nadie garantiza que el precio de un
//      pool tenga algo que ver con el del mundo real.
//
// Por eso no hay catalogo de tokens elegidos a mano: se lee lo que hay, se enseña
// el fondo y el precio que sale, y se FRENA por encima del 10 % de impacto.

import { local, simular, exigirCuentaKda } from './kda.js';

const AMM = 'kaddex.exchange';
const KDA = 'coin';
const FEE = 0.003;              // comisión del pool, 0,3 %
export const IMPACTO_MAX = 10;  // el freno, en %

// Comision de servicio de Koberlet: la misma que ya cobran el DCA y las ordenes
// limite dentro de sus contratos, y la misma que el Koberlet de escritorio. Se
// descuenta de lo que ENTRA, antes del cambio, y viaja en la misma transaccion:
// si el cambio revierte no se cobra nada, y si la comision no se puede pagar no
// hay cambio. La cuenta que cobra la pone el codigo nativo, no esta pantalla; aqui
// esta solo para poder enseñar la cifra y para simular el mismo comando que se
// firmara luego.
export const FEE_KOBERLET = 0.005;
export const CUENTA_KOBERLET = 'k:e5b947889c87fc5057ed35fa31302f57a248c33d0bbdb20a9c81500e2f3748df';
export const CLAVE_KOBERLET = 'e5b947889c87fc5057ed35fa31302f57a248c33d0bbdb20a9c81500e2f3748df';
export const FONDO_MIN = 1000;  // por debajo de esto es un charco y no se lista
const CHAIN = '2';              // el AMM del fork vive en la chain 2

// --- La gasolinera de KoberluSW ---------------------------------------------
//
// `free.ksw-gasolinera` paga el gas de las operaciones de KoberluSW. Lo usaba solo
// la web; desde 0.57.0 tambien el movil.
//
// EL UMBRAL DE 5 kb-USDC LO DECIDE ESTA CAPA, no la cadena, y no es un descuido:
// al comprar el gas, Chainweb no le pasa al contrato el `envData` del usuario, asi
// que alli el minimo no se puede comprobar. Esta escrito en el propio contrato. Lo
// peor que pasa si esta capa se equivoca es que se subvencione una operacion
// pequeña -gasta gas de DNNS, no dinero de nadie-, y el freno duro contra
// operaciones de polvo vive donde si se conoce el importe: los minimos por orden y
// por plan dentro de `free.ksw2` y `free.ksw-dca2`.
export const MIN_GRATIS_USDC = 5;
export const GAS_TOPE_GRATIS = 8000;   // tope del contrato; por encima, rechaza
const USDC = 'n_e595727b657fbbb3b8e362a05a7bb8d12865c1ff.kb-USDC';

/**
 * Lo que vale la operacion en kb-USDC, si se puede saber SIN preguntar un precio.
 *
 * Se mira la pata que ya esta en kb-USDC: si se compra, lo que entra; si se vende,
 * el MINIMO garantizado que sale -no lo esperado-. Usar el minimo es lo prudente:
 * es la unica cifra que la cadena promete, y de las dos es la que no puede caerse
 * entre la cotizacion y el bloque.
 *
 * Si ninguna pata es kb-USDC, devuelve 0: no hay forma de valorarla aqui sin
 * meter un precio de mercado en una decision que debe ser simple y comprobable.
 */
export function valorEnUsdc({ de, a, cantidad, minimo }) {
    if (de === USDC) return Number(cantidad) || 0;
    if (a === USDC) return Number(minimo) || 0;
    return 0;
}

const num = (v) => (v && typeof v === 'object') ? Number(v.decimal != null ? v.decimal : v.int) : Number(v);

// Todo el mercado en UNA sola llamada: el objeto del par ya trae las reservas
// dentro, asi que los 82 pares caben en una peticion en vez de 164. Medido en la
// cadena el 12/09/2026: 45.580 de gas, dentro del limite de una consulta.
//
// El `try` no es adorno: hay pares rotos cuyo modulo ni siquiera carga, y sin el se
// caeria la lectura entera por culpa de uno. Salen con r0 = -1 y se descartan.
const CODE_MERCADO = '(map (lambda (k)'
    + ' (try { "k": k, "cuenta": "", "r0": -1.0, "r1": -1.0 }'
    + '   (let ((p (' + AMM + '.get-pair-by-key k)))'
    + '     { "k": k, "cuenta": (at \'account p),'
    + '       "r0": (at \'reserve (at \'leg0 p)), "r1": (at \'reserve (at \'leg1 p)) })))'
    + ' (' + AMM + '.get-pairs))';

// La precision de cada token, preguntada suelta y recordada: en el escritorio se
// aprendio que pedirla dentro del mapa grande revienta la consulta entera cuando
// uno de los tokens esta roto.
const PREC = new Map();

async function precisionDe(red, modulo) {
    if (modulo === KDA) return 12;
    if (PREC.has(modulo)) return PREC.get(modulo);
    const r = await local(red.nodo, red.networkId, CHAIN, `(${modulo}.precision)`);
    if (!r || r.status !== 'success') {
        throw new Error('Ese token no responde: su contrato está roto o no existe.');
    }
    const p = Number(num(r.data));
    if (!(p >= 0 && p <= 30)) throw new Error('Ese token devuelve una precisión rara.');
    PREC.set(modulo, p);
    return p;
}

/** El mercado tal y como esta ahora: que se puede cambiar por que y con cuanto fondo. */
export async function mercado(red) {
    const r = await local(red.nodo, red.networkId, CHAIN, CODE_MERCADO);
    if (!r || r.status !== 'success') {
        throw new Error('No se pudo leer el mercado.');
    }
    const pares = [];
    for (const x of (r.data || [])) {
        const [a, b] = String(x.k).split(':');
        if (!a || !b) continue;
        const ra = num(x.r0);
        const rb = num(x.r1);
        if (!(ra > 0) || !(rb > 0)) continue;
        pares.push({ clave: x.k, cuenta: String(x.cuenta), t0: a, t1: b, r0: ra, r1: rb });
    }

    // Un token por cada par contra KDA: son los que permiten enrutar cualquier
    // cosa con cualquier cosa pasando por el medio.
    const tokens = [];
    for (const p of pares) {
        const conKda = p.t0 === KDA ? 1 : (p.t1 === KDA ? 0 : -1);
        if (conKda < 0) continue;
        const modulo = conKda === 1 ? p.t1 : p.t0;
        const reservaKda = conKda === 1 ? p.r0 : p.r1;
        const reservaTok = conKda === 1 ? p.r1 : p.r0;
        if (reservaKda < FONDO_MIN) continue;
        tokens.push({
            modulo, simbolo: modulo.split('.').pop(),
            fondoKda: reservaKda, reservaTok,
            precioKda: reservaKda / reservaTok,
            par: p.clave, cuentaPar: p.cuenta,
        });
    }
    tokens.sort((x, y) => y.fondoKda - x.fondoKda);
    return { tokens, pares, kda: { modulo: KDA, simbolo: 'KDA', precision: 12 } };
}

/**
 * Saldo de un token del mercado en la chain 2, que es donde vive el AMM.
 *
 * Va aparte del saldo del Panel (que suma las 20 chains) por un motivo practico:
 * para cambiar algo aqui, lo que cuenta es lo que tengas EN ESTA chain. Un total
 * de las 20 chains puesto al lado del boton MAX seria un numero que no se puede
 * cambiar de golpe.
 *
 * Devuelve null cuando no se ha podido preguntar; cero solo cuando la cadena dice
 * que no hay nada.
 */
export async function saldoEnMercado(red, modulo, cuenta) {
    exigirCuentaKda(cuenta, 'consultada');
    if (!/^[A-Za-z0-9_.-]+$/.test(String(modulo))) return null;
    try {
        const r = await local(red.nodo, red.networkId, CHAIN, `(${modulo}.get-balance "${cuenta}")`);
        if (r && r.status === 'success') {
            const v = num(r.data);
            return isNaN(v) ? null : v;
        }
        const err = JSON.stringify((r && r.error) || r || '');
        // Sin fila en la tabla = no tiene ese token aqui, y eso es un cero de verdad.
        if (/row not found|No value found|does not exist/i.test(err)) return 0;
        return null;
    } catch (_) {
        return null;
    }
}

// Redondeo HACIA ABAJO a los decimales del token. Dos motivos, los dos serios:
// cobrar de más, aunque sea un decimal, es cobrar lo que no es tuyo; y mandar más
// decimales de los que admite el token hace que el contrato tire la transacción.
function piso(x, decimales) {
    const f = Math.pow(10, decimales);
    return Math.floor(x * f) / f;
}

/**
 * Lo que se parte de la cantidad que entra: comision para Koberlet y resto al pool.
 *
 * Se devuelven tambien en texto porque es ese texto, y no el numero, lo que acaba
 * dentro del comando firmado: asi lo que se enseña y lo que se firma son lo mismo.
 */
export function reparto(cantidad, decimales) {
    const comision = piso(Number(cantidad) * FEE_KOBERLET, decimales);
    const alPool = piso(Number(cantidad) - comision, decimales);
    return {
        comision, alPool,
        comisionStr: comision.toFixed(decimales),
        alPoolStr: alPool.toFixed(decimales),
    };
}

// AMM x*y=k con la comisión del pool ya descontada.
function salidaSalto(entrada, rin, rout) {
    const ef = entrada * (1 - FEE);
    return ef * rout / (rin + ef);
}

function buscaPar(m, a, b) {
    const p = m.pares.find((x) => (x.t0 === a && x.t1 === b) || (x.t0 === b && x.t1 === a));
    if (!p) return null;
    const directo = p.t0 === a;
    return { par: p, rin: directo ? p.r0 : p.r1, rout: directo ? p.r1 : p.r0 };
}

/**
 * Cotizacion. Si hay par directo se va por el; si no, se pasa por KDA en dos
 * saltos, que el `swap-exact-in` admite un camino entero en una sola transaccion.
 *
 * El impacto se mide contra el precio que tendria el pool si el cambio fuese
 * infinitamente pequeño: es lo que de verdad se paga de mas por mover el precio,
 * comision aparte. No es una estimacion prudente ni un adorno: es el numero que
 * decide si el cambio tiene sentido o si el pool es demasiado pequeño.
 */
export async function cotizar(red, m, de, a, cantidad, slippage) {
    const cant = Number(cantidad);
    if (!(cant > 0)) throw new Error('La cantidad tiene que ser mayor que cero.');
    if (de === a) throw new Error('Son el mismo token.');
    const slip = slippage == null ? 0.005 : Number(slippage);

    let camino;
    let saltos;
    const directo = buscaPar(m, de, a);
    if (directo) {
        camino = [de, a];
        saltos = [directo];
    } else {
        const s1 = buscaPar(m, de, KDA);
        const s2 = buscaPar(m, KDA, a);
        if (!s1 || !s2) throw new Error('No hay camino entre esos dos tokens en este mercado.');
        camino = [de, KDA, a];
        saltos = [s1, s2];
    }

    // La comisión de Koberlet se aparta ANTES: al pool entra lo que queda. Si el
    // mínimo se calculase sobre el bruto quedaría por encima de lo que el pool
    // puede dar con el neto, y el cambio revertiría siempre.
    const decimalesEntrada = await precisionDe(red, de);
    const { comision, alPool, comisionStr, alPoolStr } = reparto(cant, decimalesEntrada);
    if (!(alPool > 0)) throw new Error('Esa cantidad es demasiado pequeña para este token.');

    let spot = 1;
    for (const s of saltos) spot *= s.rout / s.rin;
    let x = alPool;
    for (const s of saltos) x = salidaSalto(x, s.rin, s.rout);

    // El impacto se mide sobre lo que de verdad entra en el pool: la comisión ya
    // se enseña aparte y meterla aquí la contaría dos veces, además de acercar el
    // freno del 10 % sin que el pool tenga nada que ver.
    const ideal = alPool * spot;
    const impacto = ideal > 0 ? Math.max(0, (1 - x / ideal) * 100) : 100;
    // El minimo de salida tiene que caber en la precision del token o el contrato
    // lo rechaza por `enforce-unit`: doce decimales para un token de seis no valen.
    const decimalesSalida = await precisionDe(red, a);
    const minimo = x * (1 - slip);
    return {
        camino, esperada: x, minimo, minimoStr: minimo.toFixed(decimalesSalida), decimalesSalida,
        impacto, impactoMax: IMPACTO_MAX, frenado: impacto > IMPACTO_MAX,
        comision, alPool, comisionStr, alPoolStr, decimalesEntrada,
        comisionPct: FEE_KOBERLET * 100, cuentaComision: CUENTA_KOBERLET,
        precioEfectivo: x / cant, precioSpot: spot, slippagePct: slip * 100,
        cuentaPrimerPar: saltos[0].par.cuenta, saltos: saltos.length,
        fondoEntrada: saltos[0].rin,
    };
}

/**
 * Le pregunta al nodo si el cambio saldria bien, con el MISMO comando que llevaria
 * el cambio de verdad -codigo, datos y capabilities- pero sin firma.
 *
 * El freno del 10 % se comprueba tambien aqui, no solo en la pantalla: la pantalla
 * se puede equivocar, y esto es lo ultimo que se toca antes de la cadena.
 */
export async function simularCambio({ cuenta, red, m, de, a, cantidad, slippage }) {
    exigirCuentaKda(cuenta, 'remitente');
    const pubKey = String(cuenta).replace(/^k:/, '');
    if (!/^[0-9a-fA-F]{64}$/.test(pubKey)) throw new Error('Para el mercado la cuenta Kadena tiene que ser k: y 64 caracteres.');

    const q = await cotizar(red, m, de, a, cantidad, slippage);
    if (q.frenado) {
        throw new Error('Cambio detenido: moverías el precio más del 10 %. En este pool no hay fondo para tanto; prueba con menos cantidad.');
    }

    const cambio = `(${AMM}.swap-exact-in (read-decimal "amountIn") (read-decimal "amountOutMin") [`
        + q.camino.join(' ') + `] "${cuenta}" "${cuenta}" (read-keyset "ks"))`;
    // Las dos cosas van juntas dentro de la misma transacción: si el cambio falla no
    // se cobra comisión, y al revés. `transfer-create` porque la cuenta que cobra
    // puede no existir todavía en el token que entra.
    const cobro = `(${de}.transfer-create "${cuenta}" "${CUENTA_KOBERLET}"`
        + ` (read-keyset "ks-koberlet") (read-decimal "comision"))`;
    // ¿Puede pagar la gasolinera? Por importe se sabe ya; por gas, hasta después de
    // simular no. Se simula con la forma que se va a firmar si toca —las dos
    // llamadas sueltas— para que el gas medido sea el del comando de verdad.
    const usdc = valorEnUsdc({ de, a, cantidad, minimo: q.minimoStr });
    const cabePorImporte = q.comision > 0 && usdc >= MIN_GRATIS_USDC;
    // Sueltas, no dentro de un `let`: la gasolinera comprueba que cada llamada
    // EMPIECE por un módulo permitido, y `(let` no empieza por ninguno.
    const code = q.comision > 0
        ? (cabePorImporte ? `${cambio} ${cobro}` : `(let ((r ${cambio})) ${cobro} r)`)
        : cambio;
    const data = {
        amountIn: { decimal: q.alPoolStr },
        amountOutMin: { decimal: q.minimoStr },
        ks: { keys: [pubKey], pred: 'keys-all' },
    };
    const clist = [
        { name: 'coin.GAS', args: [] },
        // La primera pata sale de la cuenta y entra en el pool del primer salto.
        { name: de + '.TRANSFER', args: [cuenta, q.cuentaPrimerPar, { decimal: q.alPoolStr }] },
    ];
    if (q.comision > 0) {
        data.comision = { decimal: q.comisionStr };
        data['ks-koberlet'] = { keys: [CLAVE_KOBERLET], pred: 'keys-all' };
        clist.push({ name: de + '.TRANSFER', args: [cuenta, CUENTA_KOBERLET, { decimal: q.comisionStr }] });
    }

    // Con la comisión la transacción lleva una transferencia más: el gas sube con ella.
    const gasLimit = (q.saltos === 1 ? 8000 : 14000) + (q.comision > 0 ? 4000 : 0);
    const { resultado, gas } = await simular(
        red.nodo, red.networkId, CHAIN, code, [{ pubKey, clist }], cuenta,
        { gasLimit, data },
    );
    // Un 30 % de margen sobre lo medido: el gas de un swap cambia un poco según el
    // estado del pool, y quedarse corto no es un aviso, es la transacción perdida.
    const gasGratis = Math.ceil((gas || 0) * 1.3);
    const bien = !!resultado && resultado.status === 'success';
    return {
        cotizacion: q,
        code,
        bien,
        motivo: resultado && resultado.status !== 'success'
            ? JSON.stringify(resultado.error || resultado).slice(0, 300)
            : null,
        gas,
        // Solo si la simulación salió bien: un gas medido sobre un cambio que falla
        // no dice nada, y con él se firmaría un límite inventado.
        gratis: bien && cabePorImporte && gasGratis > 0 && gasGratis <= GAS_TOPE_GRATIS,
        gasGratis,
        usdc,
    };
}
