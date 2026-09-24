#!/usr/bin/env node
// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// MIRAR APP STORE CONNECT DESDE AQUI, SIN ABRIR LA WEB NI ESPERAR UN CORREO.
//
// Cuando Actions dice que ha subido el build, Apple todavia tiene que
// procesarlo, y hasta que termina NO APARECE EN TESTFLIGHT. Sin esto, la unica
// forma de saber si va, si esta hecho o si Apple lo ha rechazado es entrar en la
// web o esperar a que llegue el correo. Es el gemelo de `play-api.js`, que hace
// lo mismo con Google Play.
//
// La clave de la API vive en `.keys/` (ignorado por git) y en los secretos de
// GitHub; aqui solo se lee. Se autentica con un JWT ES256 de 20 minutos, que es
// lo que pide Apple.
//
//   node herramientas/asc-api.js builds [cuantos]   los ultimos builds y su estado
//   node herramientas/asc-api.js reparto            a que grupo ha ido el ultimo
//   node herramientas/asc-api.js grupos             los grupos de probadores
//
// El estado que importa de cada build:
//   PROCESSING  Apple todavia lo esta masticando; no esta en TestFlight aun.
//   VALID       listo. Ya se puede instalar (o falta que lo repartas a un grupo).
//   FAILED      Apple lo ha rechazado; el motivo llega por correo.
//   INVALID     subido mal (firma, perfil, permisos que faltan...).

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLAVES = join(RAIZ, '.keys');
const BUNDLE = 'es.dnns.koberlet';

function datosClave() {
    const txt = readFileSync(join(CLAVES, 'asc-api.txt'), 'utf8');
    const issuer = /issuer=(\S+)/.exec(txt)?.[1];
    const keyid = /keyid=(\S+)/.exec(txt)?.[1];
    if (!issuer || !keyid) throw new Error('`.keys/asc-api.txt` no trae issuer y keyid.');
    return { issuer, keyid, p8: readFileSync(join(CLAVES, `AuthKey_${keyid}.p8`), 'utf8') };
}

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

/**
 * El JWT que pide Apple. La firma va en crudo (r||s, `ieee-p1363`) y NO en DER,
 * que es lo que sale por defecto: con DER la API contesta 401 y no dice por que.
 */
let guardado = null;
function testigo() {
    // UNO para toda la ejecucion. Generando uno nuevo por peticion, Apple empieza
    // a contestar 401 en cuanto se encadenan varias: su documentacion pide
    // reutilizar el testigo mientras siga vivo, no firmar uno cada vez.
    if (guardado && guardado.hasta > Date.now() + 60000) return guardado.jwt;
    const { issuer, keyid, p8 } = datosClave();
    const ahora = Math.floor(Date.now() / 1000);
    const cabeza = b64u({ alg: 'ES256', kid: keyid, typ: 'JWT' });
    const cuerpo = b64u({ iss: issuer, iat: ahora, exp: ahora + 1200, aud: 'appstoreconnect-v1' });
    const firma = createSign('SHA256').update(`${cabeza}.${cuerpo}`).end()
        .sign({ key: p8, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    guardado = { jwt: `${cabeza}.${cuerpo}.${firma}`, hasta: (ahora + 1200) * 1000 };
    return guardado.jwt;
}

async function pedir(ruta) {
    const r = await fetch('https://api.appstoreconnect.apple.com' + ruta, {
        headers: { Authorization: 'Bearer ' + testigo() },
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
        const q = j?.errors?.[0];
        throw new Error(`Apple dice ${r.status}: ${q ? q.title + ' — ' + q.detail : 'sin detalle'}`);
    }
    return j;
}

async function idApp() {
    const j = await pedir(`/v1/apps?filter[bundleId]=${BUNDLE}`);
    const app = j.data?.[0];
    if (!app) throw new Error(`No hay ninguna app con el bundle ${BUNDLE} en esta cuenta.`);
    return app.id;
}

function cuandoFue(iso) {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    return h < 48 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`;
}

/**
 * Los ultimos builds POR FECHA DE SUBIDA, no por numero.
 *
 * El numero de build se repite entre versiones -es el de la ejecucion de
 * Actions- y ordenando por el, el recien subido puede quedar enterrado debajo de
 * otro mas antiguo con numero mayor. Lo que se quiere saber es que llego lo
 * ultimo, asi que se ordena por cuando llego. La version de marketing (0.59.0)
 * viene de `preReleaseVersion`, que es lo que de verdad distingue un build de
 * otro con el mismo numero.
 */
async function builds(cuantos) {
    const j = await pedir(`/v1/builds?filter[app]=${await idApp()}&sort=-uploadedDate&limit=${cuantos}`
        + '&fields[builds]=version,processingState,uploadedDate,expired,preReleaseVersion'
        + '&include=preReleaseVersion&fields[preReleaseVersions]=version');
    if (!j.data?.length) return console.log('No hay ningún build subido.');
    const versiones = new Map((j.included || []).map((x) => [x.id, x.attributes.version]));
    for (const b of j.data) {
        const a = b.attributes;
        const v = versiones.get(b.relationships?.preReleaseVersion?.data?.id) || '?';
        const nota = a.processingState === 'PROCESSING' ? '  (Apple lo está procesando; aún no está en TestFlight)'
            : a.expired ? '  (caducado)' : '';
        console.log(`${v} (${a.version})\t${a.processingState}\t${cuandoFue(a.uploadedDate)}${nota}`);
    }
}

/**
 * A quien se le ha repartido el ultimo build.
 *
 * Que un build este VALID no quiere decir que nadie pueda instalarlo: hasta que
 * no esta asignado a un grupo de probadores, en el iPhone no sale. Es la
 * pregunta de «ya se ha subido pero no lo veo».
 */
async function reparto() {
    const j = await pedir(`/v1/builds?filter[app]=${await idApp()}&sort=-uploadedDate&limit=1`
        + '&fields[builds]=version,processingState,preReleaseVersion'
        + '&include=preReleaseVersion&fields[preReleaseVersions]=version');
    const b = j.data?.[0];
    if (!b) return console.log('No hay ningún build subido.');
    const v = j.included?.[0]?.attributes?.version || '?';
    console.log(`Último build: ${v} (${b.attributes.version}) — ${b.attributes.processingState}`);
    // Se pregunta grupo por grupo y no al reves: Apple NO deja leer los grupos de
    // un build (la relacion solo admite crear y borrar), solo los builds de un
    // grupo. Son dos o tres grupos, asi que sale barato.
    const g = await pedir(`/v1/apps/${await idApp()}/betaGroups?limit=20&fields[betaGroups]=name,isInternalGroup`);
    const tienen = [];
    for (const grupo of g.data || []) {
        const bs = await pedir(`/v1/betaGroups/${grupo.id}/builds?limit=200&fields[builds]=version`);
        if ((bs.data || []).some((x) => x.id === b.id)) tienen.push(grupo.attributes.name);
    }
    if (!tienen.length) {
        return console.log('Repartido a: NADIE todavía. Por eso no aparece en TestFlight.');
    }
    console.log('Repartido a: ' + tienen.join(', '));
}

async function grupos() {
    const j = await pedir(`/v1/apps/${await idApp()}/betaGroups?limit=20`);
    for (const g of j.data || []) {
        const a = g.attributes;
        console.log(`${a.name}\t${a.isInternalGroup ? 'interno' : 'externo'}\t${a.publicLinkEnabled ? 'con enlace público' : 'sin enlace'}`);
    }
}

const [orden = 'builds', arg] = process.argv.slice(2);
const acciones = {
    builds: () => builds(Math.min(Number(arg) || 5, 50)),
    reparto,
    grupos,
};
const hacer = acciones[orden];
if (!hacer) {
    console.error('uso: node herramientas/asc-api.js [builds [cuantos] | grupos]');
    process.exit(2);
}
hacer().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
