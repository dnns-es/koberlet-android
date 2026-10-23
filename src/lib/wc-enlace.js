// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// ENLACE koberlet://wc?uri=<wc:...> (issue #7 del escritorio, Alex, 22/10/2026).
// Copia de lib/wc-enlace.js del escritorio: PARIDAD.md.
//
// Una web pone un boton «Abrir en Koberlet» y la app se abre en Conectar con el enlace
// YA PEGADO. Solo eso: no conecta ni aprueba nada. La conexion se sigue aprobando a mano
// y cada firma pide la contraseña o la huella.
//
// Se admite el `uri` codificado (lo normal, `wc%3A...`) y sin codificar. Lo que no sea un
// enlace wc: de WalletConnect v2 bien formado se ignora.

export function wcDeEnlace(arg) {
    const s = String(arg || '');
    if (!/^koberlet:\/\/wc\/?\?/i.test(s) || s.length > 4096) return null;
    const i = s.indexOf('uri=');
    if (i < 0) return null;
    let uri = s.slice(i + 4);
    try { if (/^wc%3a/i.test(uri)) uri = decodeURIComponent(uri.split('&')[0]); } catch (_) { return null; }
    return /^wc:[0-9a-f]{64}@2\?[^\s"'<>\\`]+$/i.test(uri) ? uri : null;
}
