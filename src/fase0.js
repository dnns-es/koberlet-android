// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// FASE 0 - Verificacion previa del plan de portado.
//
// Comprueba en el propio aparato las tres cosas que pueden hundir el enfoque
// Capacitor antes de escribir la app entera:
//
//   1. Buffer         - lo usan 8 ficheros de lib/ del escritorio.
//   2. Criptografia   - tweetnacl (ed25519) + blakejs (blake2b) + ethers (secp256k1)
//                       y @kadena/hd-wallet (derivacion de semilla estilo Chainweaver).
//   3. Red            - fetch contra el nodo Chainweb. En Electron sale sin CORS;
//                       en un WebView lo controla el navegador. Este es el punto
//                       que solo se puede dar por bueno probandolo.
//
// Cada prueba se pinta con su resultado real, nunca con un "OK" de adorno.

import './polyfill-buffer.js';
import nacl from 'tweetnacl';
import * as blake from 'blakejs';
import { ethers } from 'ethers';
import { NODOS_KDA } from './config.js';

// Semilla BIP-39 de JUGUETE, la de los vectores de prueba publicos del estandar.
// No es de nadie y no custodia nada: sirve para comprobar que la derivacion da
// siempre el mismo resultado, que es lo unico que queremos verificar aqui.
const SEMILLA_PRUEBA = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Nodo por defecto de Koberlet. La prueba va contra mainnet en SOLO LECTURA:
// /local es una consulta, no firma ni gasta.
//
// 22-09-2026: era api.chainweb-community.org a fuego. Ahora se coge el primero
// de la lista del codigo, para que esta pagina pruebe el mismo nodo con el que
// arranca la app de verdad y no uno suyo aparte.
//
// Comprobado el 11/09/2026 sobre el de la comunidad: responde al preflight con
// Access-Control-Allow-Origin: * — es decir, el WebView podra llamarlo
// directamente y CapacitorHttp queda como plan B, no como necesidad.
const NODO = NODOS_KDA[0];
const RED = 'mainnet01';
const CHAIN = '2';

// Guarda: este fichero es la pagina de pruebas y arranca solo al cargarse. Si
// alguna vez el empaquetador lo mete de rebote en otra pantalla -ya paso una
// vez-, aqui no hace nada en vez de reventar buscando botones que no existen.
const salida = document.getElementById('salida');
const enSuPagina = !!(salida && document.getElementById('lanzar'));

function apunta(titulo, ok, detalle) {
    const fila = document.createElement('div');
    fila.className = 'prueba ' + (ok === null ? 'curso' : ok ? 'bien' : 'mal');
    fila.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = (ok === null ? '· ' : ok ? '✓ ' : '✗ ') + titulo;
    const p = document.createElement('pre');
    p.textContent = detalle;              // textContent, nunca innerHTML: aqui entran datos de red
    fila.append(h, p);
    salida.append(fila);
    return fila;
}

// --- 1. Buffer -------------------------------------------------------------
function pruebaBuffer() {
    try {
        const b = Buffer.from('koberlet', 'utf8');
        const hex = b.toString('hex');
        const vuelta = Buffer.from(hex, 'hex').toString('utf8');
        if (vuelta !== 'koberlet') throw new Error('ida y vuelta hex no coincide');

        // base64url con vector conocido: 32 bytes 0xff..0xff. Se comprueba que sale
        // con el alfabeto correcto (- y _ en vez de + y /), sin relleno, y que la
        // vuelta reconstruye los mismos bytes. Sin esto, ningun comando Kadena se
        // puede firmar (el hash del comando viaja asi).
        const crudo = Buffer.alloc(32, 0xfb);
        const b64u = crudo.toString('base64url');
        const b64 = crudo.toString('base64');
        const regreso = Buffer.from(b64u, 'base64url');
        if (/[+/=]/.test(b64u)) throw new Error('base64url con alfabeto o relleno de base64: ' + b64u);
        if (!regreso.equals(crudo)) throw new Error('la vuelta de base64url no reconstruye los bytes');

        apunta('Buffer disponible en el WebView', true,
            `hex: ${hex}\nvuelta: ${vuelta}\n` +
            `base64    : ${b64}\n` +
            `base64url : ${b64u}\n` +
            `ida y vuelta base64url: correcta`);
        return true;
    } catch (e) {
        apunta('Buffer disponible en el WebView', false, String(e));
        return false;
    }
}

// --- 2a. blake2b + ed25519 (el nucleo de la firma Kadena) ------------------
function pruebaFirmaKda() {
    try {
        const cmd = '{"prueba":"koberlet-android"}';
        const h = blake.blake2b(Buffer.from(cmd, 'utf8'), null, 32);
        const hashB64 = Buffer.from(h).toString('base64url');

        // Par de claves derivado de una semilla fija de juguete (32 bytes a cero).
        const par = nacl.sign.keyPair.fromSeed(new Uint8Array(32));
        const firma = nacl.sign.detached(h, par.secretKey);
        const valida = nacl.sign.detached.verify(h, firma, par.publicKey);

        // Control negativo: con un byte cambiado la firma TIENE que fallar.
        const rota = firma.slice();
        rota[0] ^= 1;
        const invalida = nacl.sign.detached.verify(h, rota, par.publicKey);

        if (!valida || invalida) throw new Error('la verificacion no se comporta como debe');
        apunta('Firma Kadena: blake2b + ed25519', true,
            `hash blake2b-256 (base64url): ${hashB64}\n` +
            `clave publica: ${Buffer.from(par.publicKey).toString('hex')}\n` +
            `firma valida: si · firma manipulada rechazada: si`);
        return true;
    } catch (e) {
        apunta('Firma Kadena: blake2b + ed25519', false, String(e));
        return false;
    }
}

// --- 2b. ethers: derivacion EVM -------------------------------------------
function pruebaEthers() {
    try {
        const nodo = ethers.HDNodeWallet.fromPhrase(SEMILLA_PRUEBA, '', "m/44'/60'/0'/0/0");
        // Direccion conocida de los vectores publicos de esa semilla de prueba.
        const esperada = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';
        const cuadra = nodo.address.toLowerCase() === esperada.toLowerCase();
        apunta('Derivacion EVM (ethers v6)', cuadra,
            `direccion derivada: ${nodo.address}\nesperada (vector publico): ${esperada}`);
        return cuadra;
    } catch (e) {
        apunta('Derivacion EVM (ethers v6)', false, String(e));
        return false;
    }
}

// --- 2c. @kadena/hd-wallet: el punto dudoso del plan -----------------------
// Es la unica dependencia que podria no funcionar fuera de Node (usa WASM y
// primitivas de crypto). Si falla, el plan B ya esta escrito: el metodo 'ecko'
// de lib/wallets.js deriva por SLIP-0010 sin esta libreria.
async function pruebaHdWallet() {
    const fila = apunta('Derivacion Kadena (@kadena/hd-wallet)', null, 'cargando la libreria...');
    try {
        const h = await import('@kadena/hd-wallet');
        const pw = 'efimera-' + Date.now();
        const semilla = await h.kadenaMnemonicToSeed(pw, SEMILLA_PRUEBA);
        const [pub] = await h.kadenaGenKeypairFromSeed(pw, semilla, 0);
        fila.className = 'prueba bien';
        fila.querySelector('h3').textContent = '✓ Derivacion Kadena (@kadena/hd-wallet)';
        fila.querySelector('pre').textContent =
            `cuenta indice 0: k:${pub}\n` +
            `(misma derivacion que Chainweaver y eckoWallet)`;
        return true;
    } catch (e) {
        fila.className = 'prueba mal';
        fila.querySelector('h3').textContent = '✗ Derivacion Kadena (@kadena/hd-wallet)';
        fila.querySelector('pre').textContent =
            String(e && e.stack ? e.stack : e) +
            '\n\nPlan B previsto: derivacion SLIP-0010 (metodo "ecko" de lib/wallets.js), sin esta libreria.';
        return false;
    }
}

// --- 3. Red: /local contra el nodo Chainweb (la prueba de CORS) ------------
async function pruebaRed(cuenta) {
    const fila = apunta('Red: consulta de saldo al nodo Chainweb', null,
        `POST ${NODO}/chainweb/0.0/${RED}/chain/${CHAIN}/pact/api/v1/local\ncuenta: ${cuenta}\n\nconsultando...`);
    const t0 = performance.now();
    try {
        // Mismo comando que lib/kda.js: una consulta /local, sin firma y sin gasto.
        const code = `(coin.get-balance "${cuenta}")`;
        const cmd = {
            networkId: RED,
            payload: { exec: { code, data: {} } },
            signers: [],
            meta: { chainId: CHAIN, sender: '', gasLimit: 150000, gasPrice: 1e-8, ttl: 60, creationTime: Math.floor(Date.now() / 1000) - 90 },
            nonce: String(Date.now()),
        };
        const cmdStr = JSON.stringify(cmd);
        const hash = Buffer.from(blake.blake2b(Buffer.from(cmdStr, 'utf8'), null, 32)).toString('base64url');

        const res = await fetch(`${NODO}/chainweb/0.0/${RED}/chain/${CHAIN}/pact/api/v1/local?signatureVerification=false&preflight=false`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cmd: cmdStr, hash, sigs: [] }),
        });
        const txt = await res.text();
        const ms = Math.round(performance.now() - t0);

        let r;
        try { r = JSON.parse(txt).result; } catch { throw new Error('respuesta no JSON: ' + txt.slice(0, 200)); }

        const saldo = r && r.status === 'success'
            ? (typeof r.data === 'object' ? (r.data.decimal ?? JSON.stringify(r.data)) : r.data)
            : null;

        fila.className = 'prueba bien';
        fila.querySelector('h3').textContent = '✓ Red: consulta de saldo al nodo Chainweb';
        fila.querySelector('pre').textContent =
            `HTTP ${res.status} en ${ms} ms\n` +
            `estado Pact: ${r ? r.status : '?'}\n` +
            (saldo !== null
                ? `saldo en chain ${CHAIN}: ${saldo} KDA`
                : `la cuenta no existe en chain ${CHAIN} (normal) — lo que importa es que el nodo respondio`) +
            `\n\nCORS: la peticion salio y volvio, no la bloqueo el navegador.`;
        return true;
    } catch (e) {
        fila.className = 'prueba mal';
        fila.querySelector('h3').textContent = '✗ Red: consulta de saldo al nodo Chainweb';
        fila.querySelector('pre').textContent =
            String(e) +
            '\n\nSi el fallo dice "Failed to fetch" es CORS: el nodo no manda las cabeceras que\n' +
            'el navegador exige. Solucion prevista: CapacitorHttp (peticion nativa, sin CORS).\n' +
            'En el APK esto se resuelve; en el navegador de escritorio puede fallar igual.';
        return false;
    }
}

// --- 6. El socket del rele de WalletConnect --------------------------------
//
// Se añade el 25/09/2026 por el «Conectando…» eterno del iPhone: la pantalla
// Conectar se quedaba leyendo el enlace sin conectar ni fallar, y desde fuera no
// habia forma de saber si el aparato podia siquiera ABRIR el socket. Desde Safari
// del mismo iPhone abria en 0,3 s, asi que el sospechoso era el WebView, y esa
// diferencia solo se puede medir DENTRO de la app. Para eso existe esta pagina.
//
// Aqui no se empareja ni se firma nada: solo se abre el socket y se cierra. El
// rele pide un testigo firmado, que lo genera la propia libreria de WalletConnect
// en el momento, con un par de claves de usar y tirar.
async function pruebaRele() {
    const fila = apunta('WalletConnect: abrir el socket del rele', null, 'conectando…');
    const t0 = Date.now();
    try {
        const [{ generateKeyPair, signJWT }] = await Promise.all([import('@walletconnect/relay-auth')]);
        const par = generateKeyPair(crypto.getRandomValues(new Uint8Array(32)));
        const sub = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
        const jwt = await signJWT(sub, 'wss://relay.walletconnect.org', 3600, par);
        const url = 'wss://relay.walletconnect.org/?auth=' + jwt
            + '&projectId=b0e3e11cc9ca4e31921e2ff7228a0f44&ua=koberlet-fase0';

        const q = await new Promise((acaba) => {
            let hecho = false;
            const fin = (t) => { if (!hecho) { hecho = true; acaba(t); try { ws.close(); } catch (_) { /* ya estaba */ } } };
            const ws = new WebSocket(url);
            ws.onopen = () => fin('ABRE');
            ws.onerror = () => fin('FALLA');
            ws.onclose = (e) => fin('SE CIERRA, codigo ' + e.code);
            setTimeout(() => fin('SE QUEDA COLGADO'), 20000);
        });

        const ms = Date.now() - t0;
        const bien = q === 'ABRE';
        fila.className = 'prueba ' + (bien ? 'bien' : 'mal');
        fila.querySelector('h3').textContent = (bien ? '✓ ' : '✗ ') + 'WalletConnect: abrir el socket del rele';
        fila.querySelector('pre').textContent =
            `resultado: ${q} en ${ms} ms\n` +
            `origen de esta pagina: ${location.origin}\n` +
            `contexto seguro: ${window.isSecureContext ? 'si' : 'NO'} · cifrado del navegador: ${(window.crypto && window.crypto.subtle) ? 'si' : 'NO'}\n\n` +
            (bien
                ? 'El aparato puede hablar con el rele. Si aun asi «Conectar» se queda\ncolgado, el problema no es la red ni el WebView: es el codigo de la pantalla.'
                : 'El aparato NO puede abrir el socket desde dentro de la app.\n\n'
                  + 'Lo primero que hay que mirar es la CSP de index.html: si `connect-src`\n'
                  + 'no nombra `wss://relay.walletconnect.org`, el socket se cae aqui mismo,\n'
                  + 'sin salir del aparato y sin decir nada. Un fallo en menos de 50 ms es\n'
                  + 'justo eso; uno de varios segundos es la red.');
        return bien;
    } catch (e) {
        fila.className = 'prueba mal';
        fila.querySelector('h3').textContent = '✗ WalletConnect: abrir el socket del rele';
        fila.querySelector('pre').textContent = String(e);
        return false;
    }
}

// --- Orquestacion ----------------------------------------------------------
async function lanzar() {
    salida.innerHTML = '';
    const cuenta = document.getElementById('cuenta').value.trim();

    const r = [];
    r.push(pruebaBuffer());
    r.push(pruebaFirmaKda());
    r.push(pruebaEthers());
    r.push(await pruebaHdWallet());
    r.push(await pruebaRed(cuenta));
    r.push(await pruebaRele());

    const bien = r.filter(Boolean).length;
    const res = document.createElement('div');
    res.className = 'resumen ' + (bien === r.length ? 'bien' : 'mal');
    res.textContent = `${bien} de ${r.length} pruebas superadas`;
    salida.append(res);
}

if (enSuPagina) {
    document.getElementById('lanzar').addEventListener('click', lanzar);
    document.getElementById('entorno').textContent =
        `${navigator.userAgent}\npantalla: ${window.innerWidth}×${window.innerHeight}`;
    lanzar();
}
