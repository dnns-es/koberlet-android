// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// SUBIR EL BUNDLE A GOOGLE PLAY SIN PASAR POR LA CONSOLA.
//
// Habla con la Google Play Developer API usando la cuenta de servicio
// `koberlet-publisher`, cuya clave privada esta en `.keys/play-service-account.json`
// (esa carpeta no se versiona). La cuenta tiene permisos de versiones, canales de
// pruebas y ficha, y ninguno de datos financieros: si esa clave se filtrara, no da
// acceso al dinero.
//
// Lo que NO hace, porque la API no lo permite: crear la aplicacion. Eso es a mano
// en la Consola una sola vez, y ya esta hecho (es.dnns.koberlet).
//
// Como funciona una subida en esta API: no se sube el fichero y ya. Se abre una
// "edicion" (un borrador con todos los cambios), se le van colgando cosas dentro y
// al final se confirma de una vez con commit. Si algo falla por el camino, la
// edicion se queda sin confirmar y en Play no ha cambiado nada, que es justo lo que
// se quiere: o entra todo o no entra nada.
//
// Uso:
//   node herramientas/play-api.js estado
//   node herramientas/play-api.js subir <canal> [ruta.aab]
//   node herramientas/play-api.js testers <canal>
//
//   canal: internal | alpha (pruebas cerradas) | beta (abiertas) | production
//
// El canal por defecto para probar es `internal`: llega a los probadores en
// minutos, no cuenta para los 14 dias de la prueba cerrada y no lo ve nadie mas.
// Para el requisito de los 12 probadores durante 14 dias hay que usar `alpha`.

import { google } from 'googleapis';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLAVE = join(RAIZ, '.keys', 'play-service-account.json');
const PAQUETE = 'es.dnns.koberlet';
const CANALES = ['internal', 'alpha', 'beta', 'production'];

// La version sale del package.json igual que en Gradle, para que el nombre de la
// version en Play sea el mismo numero que se ve dentro de la app.
function versionDelProyecto() {
    const paquete = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
    return paquete.version;
}

// El versionCode se calcula como en `android/app/build.gradle`: mayor*10000 +
// menor*100 + parche. Se repite aqui a proposito, para poder avisar ANTES de subir
// de que el bundle que se manda no es el de la version que dice el proyecto.
function versionCodeDe(version) {
    const [mayor, menor, parche] = version.split('.').map(Number);
    return mayor * 10000 + menor * 100 + parche;
}

async function conectar() {
    if (!existsSync(CLAVE)) {
        console.error(`No esta la clave de la cuenta de servicio en ${CLAVE}`);
        console.error('Se descarga de Google Cloud > IAM > Cuentas de servicio > koberlet-publisher > Claves.');
        process.exit(1);
    }
    const auth = new google.auth.GoogleAuth({
        keyFile: CLAVE,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    return google.androidpublisher({ version: 'v3', auth: await auth.getClient() });
}

// Que hay publicado ahora mismo en cada canal. Es de solo lectura: abre una
// edicion para poder preguntar y la deja sin confirmar, que equivale a tirarla.
async function estado(play) {
    const { data: edicion } = await play.edits.insert({ packageName: PAQUETE });
    const { data } = await play.edits.tracks.list({ packageName: PAQUETE, editId: edicion.id });

    console.log(`\n${PAQUETE} - proyecto en la version ${versionDelProyecto()}\n`);
    const canales = data.tracks ?? [];
    if (!canales.length) {
        console.log('No hay nada publicado en ningun canal todavia.');
        return;
    }
    for (const canal of canales) {
        const versiones = canal.releases ?? [];
        if (!versiones.length) {
            console.log(`  ${canal.track.padEnd(12)} vacio`);
            continue;
        }
        for (const version of versiones) {
            const codigos = (version.versionCodes ?? []).join(', ');
            console.log(`  ${canal.track.padEnd(12)} ${version.status.padEnd(10)} ${version.name ?? ''} (versionCode ${codigos})`);
        }
    }
}

// Busca el .aab del canal de Play. Se prefiere el que deja Gradle en su carpeta de
// salida, que es siempre el recien compilado; `play/bundle/` es solo la copia que
// se guarda para tenerla localizada.
function buscarBundle() {
    const deGradle = join(RAIZ, 'android', 'app', 'build', 'outputs', 'bundle', 'playRelease', 'app-play-release.aab');
    if (existsSync(deGradle)) return deGradle;

    const guardados = join(RAIZ, 'play', 'bundle');
    if (existsSync(guardados)) {
        const aabs = readdirSync(guardados).filter((f) => f.endsWith('.aab'));
        if (aabs.length) return join(guardados, aabs.sort().at(-1));
    }
    return null;
}

async function subir(play, canal, rutaPedida) {
    const ruta = rutaPedida ?? buscarBundle();
    if (!ruta || !existsSync(ruta)) {
        console.error('No encuentro ningun .aab. Compilalo antes con:  npm run aab:play');
        process.exit(1);
    }

    const version = versionDelProyecto();
    const esperado = versionCodeDe(version);

    console.log(`Subiendo ${ruta}`);
    console.log(`  canal:   ${canal}`);
    console.log(`  version: ${version} (se espera versionCode ${esperado})\n`);

    const { data: edicion } = await play.edits.insert({ packageName: PAQUETE });

    const { data: subido } = await play.edits.bundles.upload({
        packageName: PAQUETE,
        editId: edicion.id,
        media: { mimeType: 'application/octet-stream', body: readFileSync(ruta) },
    });
    console.log(`Bundle aceptado por Play: versionCode ${subido.versionCode}`);

    // Si el bundle no es el de la version del proyecto, el numero no cuadra. No es
    // fatal -Play lo acepta igual-, pero casi siempre significa que se ha olvidado
    // recompilar despues de subir la version, y descuadra los dos canales.
    if (subido.versionCode !== esperado) {
        console.warn(`\n  AVISO: el bundle es el versionCode ${subido.versionCode} y el proyecto va por la ${version} (${esperado}).`);
        console.warn('  Si no era lo que querias, no confirmes: cancela y recompila con `npm run aab:play`.\n');
    }

    await play.edits.tracks.update({
        packageName: PAQUETE,
        editId: edicion.id,
        track: canal,
        requestBody: {
            track: canal,
            releases: [{
                name: version,
                versionCodes: [String(subido.versionCode)],
                status: 'completed',
            }],
        },
    });

    await play.edits.commit({ packageName: PAQUETE, editId: edicion.id });
    console.log(`\nHecho. La ${version} esta en el canal ${canal}.`);
    if (canal === 'internal') console.log('Los probadores internos la tendran en unos minutos.');
}

// Quien esta apuntado a cada canal de pruebas. Util para el requisito de los 12
// probadores: Play pide 12 dentro durante 14 dias seguidos y si uno se sale, el
// contador vuelve a empezar, asi que conviene poder mirarlo sin abrir la Consola.
async function testers(play, canal) {
    const { data: edicion } = await play.edits.insert({ packageName: PAQUETE });
    const { data } = await play.edits.tracks.get({ packageName: PAQUETE, editId: edicion.id, track: canal });

    console.log(`\nCanal ${canal}:`);
    console.log(JSON.stringify(data, null, 2));
    console.log('\nOjo: esto es lo que la API cuenta del canal (versiones y reparto por pais).');
    console.log('El quien esta apuntado como probador NO sale aqui: las listas se ven y se');
    console.log('editan en la Consola, en Pruebas > Prueba cerrada > Probadores.');
}

const [orden, ...resto] = process.argv.slice(2);

if (!orden || !['estado', 'subir', 'testers'].includes(orden)) {
    console.error('Uso: node herramientas/play-api.js estado | subir <canal> [ruta.aab] | testers <canal>');
    console.error(`Canales: ${CANALES.join(', ')}`);
    process.exit(1);
}

// Los errores de esta API llegan como un volcado de treinta lineas donde la unica
// frase util va enterrada. Se traducen los dos que salen de verdad y del resto se
// enseña el mensaje, no la pila.
function explicar(error) {
    const codigo = error?.status ?? error?.response?.status;
    const mensaje = error?.message ?? String(error);

    if (codigo === 403) {
        console.error('\nPlay dice que esta cuenta de servicio no tiene permiso.');
        console.error('Si los permisos se acaban de dar en la Consola, es NORMAL: tardan en');
        console.error('propagarse. Suelen ser minutos y Google se reserva hasta 24 h. Espera y');
        console.error('vuelve a probar; no hay nada que arreglar.');
        console.error('\nSi lleva asi mas de un dia, mirar en la Consola > Usuarios y permisos que');
        console.error('koberlet-publisher@... siga activo y con los permisos de versiones.');
    } else if (codigo === 401) {
        console.error('\nLa clave de .keys/play-service-account.json no vale (401).');
        console.error('Puede estar caducada, revocada o ser de otro proyecto. Se saca una nueva en');
        console.error('Google Cloud > IAM > Cuentas de servicio > koberlet-publisher > Claves.');
    } else {
        console.error(`\nLa API ha fallado${codigo ? ` (${codigo})` : ''}: ${mensaje}`);
    }
    process.exit(1);
}

try {
    const play = await conectar();

    if (orden === 'estado') {
        await estado(play);
    } else {
        const canal = resto[0];
        if (!CANALES.includes(canal)) {
            console.error(`Canal no valido: ${canal ?? '(ninguno)'}. Tiene que ser uno de: ${CANALES.join(', ')}`);
            process.exit(1);
        }
        if (orden === 'subir') await subir(play, canal, resto[1]);
        else await testers(play, canal);
    }
} catch (error) {
    explicar(error);
}
