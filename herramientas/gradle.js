// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// LLAMAR A GRADLE DESDE UN SCRIPT DE NPM.
//
// Parece una tonteria y no lo es: `cd android && gradlew.bat ...` dentro de un
// script de npm no funciona igual segun el shell que tenga configurado quien lo
// ejecute (cmd, PowerShell o el bash de Git), y el fallo que sale -"gradlew.bat no
// se reconoce"- no dice nada de eso. Desde Node se elige el ejecutable a mano y el
// comportamiento es el mismo en los tres.
//
// Ademas resuelve el JDK. Este proyecto usa el de `F:\APP\_tools\jdk21` y no hay
// JAVA_HOME puesto en el sistema; sin esto, Gradle falla con un error que suena a
// problema de Android cuando lo unico que pasa es que no encuentra Java.
//
// Uso:  node herramientas/gradle.js bundlePlayRelease

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(RAIZ, 'android');

const tareas = process.argv.slice(2);
if (!tareas.length) {
    console.error('Falta la tarea. Ejemplo: node herramientas/gradle.js bundlePlayRelease');
    process.exit(1);
}

// El JDK: primero el que diga el entorno, y si no hay, los sitios conocidos.
const JDKS = [
    process.env.JAVA_HOME,
    'F:\\APP\\_tools\\jdk21',
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio', 'jbr'),
].filter(Boolean);

const jdk = JDKS.find((p) => existsSync(join(p, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')));
if (!jdk) {
    console.error('No se encuentra un JDK. Pon JAVA_HOME o instala uno en F:\\APP\\_tools\\jdk21.');
    process.exit(1);
}

const gradlew = join(ANDROID, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const r = spawnSync(gradlew, tareas, {
    cwd: ANDROID,
    env: { ...process.env, JAVA_HOME: jdk },
    stdio: 'inherit',
    shell: process.platform === 'win32',      // gradlew.bat necesita interprete de comandos
});
process.exit(r.status ?? 1);
