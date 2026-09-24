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
import { t } from '../idioma.js';

const Vault = registerPlugin('KoberletVault');

/**
 * LO QUE PONE EN EL DIALOGO DE FACE ID / DE LA HUELLA.
 *
 * Van como funciones y no como texto suelto por dos cosas: el idioma puede
 * cambiarse sin reiniciar, y asi cada frase queda escrita dentro de una llamada de
 * verdad a la funcion de traducir, que es lo que mira la prueba que las vigila.
 *
 * Ese texto lo saca el SISTEMA, no la app, y hasta ahora venia escrito en
 * castellano dentro de Kotlin y de Swift: con la app en ingles, el dialogo salia
 * en español igual (lo aviso un probador el 17/09/2026). Se manda ya traducido
 * desde aqui, que es el unico sitio que sabe en que idioma esta la app -el idioma
 * se elige DENTRO de Koberlet, asi que el del aparato no sirve-.
 *
 * Si algun dia llega un metodo nuevo sin frase, el nativo pone la suya: se vera
 * en castellano, pero nunca vacio.
 */
const MOTIVOS = {
    abrir: () => t('Abre tu cartera'),
    bioActivar: () => t('Confirma que eres tú para activarlo'),
    firmarEnvioKda: () => t('Firma el envío'),
    firmarEnvioToken: () => t('Firma el envío'),
    firmarEnvioCrossKda: () => t('Firma el envío entre chains'),
    firmarEnvioEvm: () => t('Firma el envío'),
    firmarPuenteEvm: () => t('Firma el envío por el puente'),
    firmarPuenteHaciaKadena: () => t('Firma el envío por el puente'),
    firmarPermisoEvm: () => t('Firma el permiso del token'),
    firmarCambioAmm: () => t('Firma el cambio'),
    firmarCambioEvm: () => t('Firma el cambio'),
    firmarCrearDca: () => t('Firma el plan de compras'),
    firmarGestionDca: () => t('Firma el cambio en el plan'),
    firmarComandoExterno: () => t('Firma lo que te pide la web'),
};

// Los errores del plugin llegan como excepciones con `message`; se reenvian tal
// cual para que la pantalla enseñe el motivo de verdad y no un "algo ha fallado".
async function llamar(metodo, datos) {
    let payload = datos || {};
    // Solo cuando se va a identificar: si se teclea la contraseña no sale ningún
    // diálogo y el texto no pinta nada.
    // `bioActivar` no lleva `huella`: la contraseña se teclea, pero guardarla
    // exige identificarse y el sistema saca su diálogo igual.
    const vaAPedirlo = payload.huella === true || metodo === 'bioActivar';
    if (vaAPedirlo && !payload.motivo && MOTIVOS[metodo]) {
        payload = { ...payload, motivo: MOTIVOS[metodo]() };
    }
    try {
        return await Vault[metodo](payload);
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
    // WalletConnect: firma un comando que llega de una web. El unico que no monta
    // la boveda; por eso el nativo comprueba aparte que la clave pedida sea la de
    // la cartera elegida, y la pantalla enseña antes que se autoriza.
    async firmarComandoExterno(datos) { return llamar('firmarComandoExterno', datos); },
    async exportarBoveda(contrasena) { return llamar('exportarBoveda', { contrasena }); },
    async importarBoveda(contrasena, contenido) { return llamar('importarBoveda', { contrasena, contenido }); },
    async borrarTodo(contrasena) { await llamar('borrarTodo', { contrasena }); },
};
