// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// BOVEDA NATIVA - puente al plugin Kotlin `KoberletVault`.
//
// Aqui no hay criptografia: solo llamadas. Todo lo que importa -generar la
// semilla, derivar las claves, cifrar, descifrar y firmar- ocurre en Kotlin, y
// este fichero no llega a ver ni la semilla ni una privada. Lo unico que cruza
// de vuelta al WebView son datos publicos, mas la semilla UNA sola vez cuando se
// crea la cartera, porque el dueño tiene que poder apuntarla.
//
// El plugin vive en:
//   android/app/src/main/java/es/dnns/koberlet/KoberletVault.kt

import { registerPlugin } from '@capacitor/core';

const Vault = registerPlugin('KoberletVault');

// Los errores del plugin llegan como excepciones con `message`; se reenvian tal
// cual para que la pantalla enseñe el motivo de verdad y no un "algo ha fallado".
async function llamar(metodo, datos) {
    try {
        return await Vault[metodo](datos || {});
    } catch (e) {
        throw new Error(e && e.message ? e.message : `Fallo en la bóveda (${metodo}).`);
    }
}

export const bovedaNativa = {
    async estado() {
        const r = await llamar('estado');
        return { existe: !!r.existe, abierta: !!r.abierta, motor: 'nativa' };
    },
    async crear(contrasena, etiqueta, red) { return llamar('crear', { contrasena, etiqueta, red }); },
    async importar(contrasena, semilla, etiqueta, red) { return llamar('importar', { contrasena, semilla, etiqueta, red }); },
    async importarClave(contrasena, privada, etiqueta, red) { return llamar('importarClave', { contrasena, privada, etiqueta, red }); },
    async renombrarCartera(contrasena, id, etiqueta) { return llamar('renombrarCartera', { contrasena, id, etiqueta }); },
    async borrarCartera(contrasena, id) { return llamar('borrarCartera', { contrasena, id }); },
    // `abrir` y `firmarEnvioKda` admiten contrasena escrita O {huella:true}: la
    // huella no sustituye a la contrasena, la desenvuelve en el chip (Huella.kt).
    async abrir(contrasena) { return llamar('abrir', { contrasena }); },
    async abrirConHuella() { return llamar('abrir', { huella: true }); },
    async bioEstado() { return llamar('bioEstado'); },
    async bioActivar(contrasena) { return llamar('bioActivar', { contrasena }); },
    async bioBorrar() { return llamar('bioBorrar'); },
    async cerrar() { await llamar('cerrar'); },
    async cuentas() { return (await llamar('cuentas')).cuentas; },
    async exportar(contrasena, id) { return llamar('exportar', { contrasena, id }); },
    // Devuelve {cmd, hash, sigs}: el comando YA firmado, listo para mandarlo al
    // nodo. La pantalla no ve la clave en ningun momento.
    async firmarEnvioKda(datos) { return llamar('firmarEnvioKda', datos); },
    async firmarEnvioCrossKda(datos) { return llamar('firmarEnvioCrossKda', datos); },
    async firmarPuenteEvm(datos) { return llamar('firmarPuenteEvm', datos); },
    async firmarEnvioToken(datos) { return llamar('firmarEnvioToken', datos); },
    async firmarEnvioEvm(datos) { return llamar('firmarEnvioEvm', datos); },
    async firmarPermisoEvm(datos) { return llamar('firmarPermisoEvm', datos); },
    async firmarPuenteHaciaKadena(datos) { return llamar('firmarPuenteHaciaKadena', datos); },
    async firmarCambioEvm(datos) { return llamar('firmarCambioEvm', datos); },
    async firmarCambioAmm(datos) { return llamar('firmarCambioAmm', datos); },
    async firmarCrearDca(datos) { return llamar('firmarCrearDca', datos); },
    async firmarGestionDca(datos) { return llamar('firmarGestionDca', datos); },
    async exportarBoveda(contrasena) { return llamar('exportarBoveda', { contrasena }); },
    async importarBoveda(contrasena, contenido) { return llamar('importarBoveda', { contrasena, contenido }); },
    async borrarTodo(contrasena) { await llamar('borrarTodo', { contrasena }); },
};
