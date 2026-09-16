import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// La version sale del package.json y de ningun otro sitio: es la misma que Gradle
// mete en el APK (versionCode/versionName), asi que lo que se ve en pantalla y lo
// que mira Android para actualizar no pueden descuadrar.
const paquete = JSON.parse(readFileSync('./package.json', 'utf8'));

// Canal de distribucion. Son dos compilaciones de la MISMA base, no dos apps:
//
//   directa -> la de siempre, la que se cuelga en descargas.dnns.es. Lleva la
//              comprobacion de version y el instalador propio. Es donde se
//              prueba una version antes de mandarla a ningun sitio.
//   play    -> la de Google Play. SIN actualizacion propia, porque Play prohibe
//              que una app descargue e instale codigo por su cuenta (politica
//              de Codigo Ejecutable). Ahi actualiza la tienda, y lo hace sola.
//   ios     -> la de iPhone (TestFlight / App Store). Como la de Play: sin
//              actualizacion propia, actualiza la tienda.
//
// El canal entra por el modo de Vite (`vite build --mode play|ios`), que es de la
// propia herramienta y funciona igual en Windows y en Linux: una variable de
// entorno delante del comando no es portable y habria que meter una dependencia
// solo para eso.
//
// El valor sale como `__CANAL__` y las comparaciones quedan constantes, asi que
// en la compilacion de Play el bloque entero de actualizacion desaparece del
// bundle: no es que se esconda el boton, es que el codigo no viaja.
//
// Por defecto, 'directa': quien compile sin pensar se lleva la de siempre, no la
// de la tienda. Equivocarse hacia el canal conocido es menos grave.
function canalDe(mode) {
    return mode === 'play' || mode === 'ios' ? mode : 'directa';
}

// Configuracion de Vite para el WebView de Android.
//
// Por que hace falta: las librerias de lib/ del Koberlet de escritorio son codigo
// de Node (usan require y Buffer). En un WebView no existe ni lo uno ni lo otro,
// asi que Vite las empaqueta y aqui le damos el unico polyfill que necesitamos.
//
// Deliberadamente NO usamos vite-plugin-node-polyfills: arrastra crypto-browserify
// y elliptic (criptografia en JS con fallos conocidos) al bundle de un monedero.
// ethers y tweetnacl ya traen su propia criptografia; de Node solo nos falta Buffer.
// La CSP del HTML es la de produccion: cerrada, sin WebSocket. Pero la recarga en
// caliente de Vite (y el live-reload contra el movil) va justo por un WebSocket, y
// la CSP lo bloquea. En vez de aflojar la CSP del APK, se le anade el permiso SOLO
// al HTML que sirve el servidor de desarrollo. Lo que se empaqueta no se toca.
const cspDesarrollo = {
    name: 'csp-solo-desarrollo',
    apply: 'serve',
    transformIndexHtml(html) {
        return html.replace('connect-src https: http://localhost:*',
            'connect-src https: http://localhost:* ws://localhost:* ws://*:5180 http://*:5180');
    },
};

// Deja escrito en la compilacion de QUE canal es. No es informativo: Gradle lo lee
// antes de empaquetar y se niega a construir la variante de Play si los assets que
// hay puestos son los del canal directo (ver android/app/build.gradle).
//
// El fallo que evita es tonto y silencioso: compilar la web sin el modo,
// olvidarse, y subir a Play un bundle cuyo JavaScript todavia trae el modulo de
// descarga de APK. El plugin nativo ya no estaria, asi que no reventaria nada -
// simplemente iria a la tienda codigo que Play no admite, y eso lo mira el revisor.
const marcaDeCanal = (canal) => ({
    name: 'marca-de-canal',
    apply: 'build',
    generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'canal.txt', source: canal });
    },
});

export default defineConfig(({ mode }) => {
const canal = canalDe(mode);
return {
    // Rutas RELATIVAS en el HTML generado. Dentro del APK da igual, pero asi la
    // misma compilacion se puede colgar en un subdirectorio de un servidor para
    // enseñarla en el navegador, sin que los assets se busquen en la raiz del dominio.
    base: './',
    plugins: [cspDesarrollo, marcaDeCanal(canal)],
    resolve: {
        alias: {
            // El paquete 'buffer' de npm es la implementacion para navegador.
            buffer: 'buffer/',
        },
    },
    define: {
        // Algunas dependencias miran process.env.NODE_ENV aunque no corran en Node.
        'process.env': {},
        // global no existe en el navegador; varias libs de Node lo dan por hecho.
        global: 'globalThis',
        __VERSION__: JSON.stringify(paquete.version),
        __CANAL__: JSON.stringify(canal),
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            // Dos pantallas: la app y, aparte, el banco de pruebas de la Fase 0.
            // Se mantiene dentro del APK porque es el diagnostico que dice si el
            // fallo esta en el aparato o en nuestro codigo.
            input: {
                app: resolve('index.html'),
                fase0: resolve('fase0.html'),
            },
            output: {
                // Las librerias gordas y COMPARTIDAS van a su propio trozo.
                //
                // Esto no es afinar el tamaño: es un fallo real que costo una
                // tarde. Sin esto, Rollup vio que la app y la pagina de pruebas
                // importan las dos @kadena/hd-wallet y decidio usar el trozo de
                // fase0 como sitio comun. Resultado: al crear una cartera, la app
                // cargaba el trozo de fase0 y ejecutaba SU codigo de arranque, que
                // busca botones que en la app no existen -> "Cannot read properties
                // of null (reading 'addEventListener')". En el servidor de
                // desarrollo no pasa, porque ahi no se agrupa nada: solo salia en
                // la compilacion de verdad.
                manualChunks(id) {
                    if (id.includes('@kadena/')) return 'kadena';
                    if (id.includes('/ethers/') || id.includes('@noble/') || id.includes('@adraffy/')) return 'evm';
                    if (id.includes('tweetnacl') || id.includes('blakejs')) return 'cripto';
                    if (id.includes('jsqr') || id.includes('/qrcode/')) return 'qr';
                },
            },
        },
        // Minificado y SIN mapas de codigo.
        //
        // Durante el desarrollo iba al reves, para poder leer los errores del
        // movil. Se cambia ahora porque los mapas rehacen el fuente entero dentro
        // del APK: cualquiera que lo descomprima se lleva el codigo tal cual, con
        // los comentarios incluidos. El codigo es libre y esta publicado, asi que
        // no es un secreto; lo que sobra es el peso y la invitacion a trastear.
        //
        // Que se minifique NO es una medida de seguridad: ofuscar no protege
        // nada. Lo que protege es que las claves no esten aqui dentro.
        minify: 'esbuild',
        sourcemap: false,
    },
    server: {
        port: 5180,
    },
};
});
