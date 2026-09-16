// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// GENERADO desde POLITICAS.md del monedero de escritorio (herramientas-politicas.js).
// No editar a mano: se edita el .md y se vuelve a generar. El texto tiene que ser el
// MISMO en las dos apps, porque es lo mismo que se acepta.

export const POLITICAS_VERSION = "1.1";

export const POLITICAS = {
    es: [
    {
        "t": "h3",
        "x": "Políticas de uso de Koberlet"
    },
    {
        "t": "p",
        "x": "Versión 1.1 — 15/09/2026"
    },
    {
        "t": "p",
        "x": "(English below · Ver en la web (https://descargas.dnns.es/kob7t2m9x4/politicas.html))"
    },
    {
        "t": "p",
        "x": "Este es el texto que hay que aceptar para instalar o actualizar Koberlet, en el escritorio y en el móvil. Está escrito para leerse, no para que nadie lo salte: si algo de aquí no te parece bien, no instales la app."
    },
    {
        "t": "p",
        "x": "Se puede volver a leer en cualquier momento, sin conexión, dentro de la propia app (escritorio: Info → Políticas de uso; móvil: Más → Políticas de uso), y antes de instalar nada en la dirección de arriba."
    },
    {
        "t": "h4",
        "x": "1. Qué es Koberlet y qué no es"
    },
    {
        "t": "p",
        "x": "Koberlet es un monedero no custodial. Las claves se crean en tu aparato y se quedan en tu aparato, cifradas con tu contraseña. DNNS.es no las tiene, no puede verlas y no puede devolvértelas."
    },
    {
        "t": "p",
        "x": "No es un banco, ni una casa de cambio, ni un servicio financiero. No hay cuenta que abrir, ni saldo que nosotros guardemos, ni nadie a quien reclamar un reintegro."
    },
    {
        "t": "h4",
        "x": "2. La semilla, que solo tienes tú"
    },
    {
        "t": "p",
        "x": "La semilla —esas 12 o 24 palabras— es la única forma de recuperar una cartera. Si la pierdes, el dinero se pierde para siempre: no hay «recuperar contraseña», y nosotros tampoco podemos hacer nada. Si alguien más la ve, puede vaciarte la cartera desde cualquier parte del mundo y sin que te enteres."
    },
    {
        "t": "p",
        "x": "Apúntala en papel. Guárdala donde guardarías algo que no se puede volver a conseguir."
    },
    {
        "t": "h4",
        "x": "3. Lo que se firma no se deshace"
    },
    {
        "t": "p",
        "x": "Una transacción en una cadena pública es definitiva. No hay devolución, ni anulación, ni servicio de atención que la revierta. Una dirección mal copiada es dinero perdido."
    },
    {
        "t": "p",
        "x": "Comprueba a quién y cuánto antes de firmar. La app te lo enseña siempre antes de pedirte la contraseña."
    },
    {
        "t": "h4",
        "x": "4. Lo que Koberlet no controla"
    },
    {
        "t": "p",
        "x": "Koberlet habla con cosas que no son suyas y que no opera:"
    },
    {
        "t": "li",
        "x": "contratos de terceros: el pool de kaddex.exchange, el DCA y las órdenes de KoberluSW (free.ksw-dca2, free.ksw2), Uniswap en Ethereum;"
    },
    {
        "t": "li",
        "x": "el puente entre Kadena y Ethereum, y los relayers que entregan al otro lado;"
    },
    {
        "t": "li",
        "x": "nodos públicos de Kadena y de Ethereum;"
    },
    {
        "t": "li",
        "x": "los precios, que vienen de CoinGecko y son orientativos."
    },
    {
        "t": "p",
        "x": "Si alguno de ellos falla, cambia sus reglas, se queda a medias o resulta tener un fallo, el dinero puede perderse y no está en nuestra mano recuperarlo. El puente, en particular, es experimental: úsalo con importes que puedas permitirte perder."
    },
    {
        "t": "h4",
        "x": "5. Nada de esto es consejo financiero"
    },
    {
        "t": "p",
        "x": "La app enseña números y ejecuta lo que tú le pidas. No recomienda comprar, vender ni mantener nada, y un DCA no es una promesa de ganar dinero. Las criptomonedas pueden perder todo su valor."
    },
    {
        "t": "h4",
        "x": "6. Tus datos"
    },
    {
        "t": "p",
        "x": "Koberlet no tiene cuentas de usuario, ni registro, ni telemetría. No mandamos a ningún servidor nuestro tus claves, tus direcciones, tus saldos ni lo que haces con la app."
    },
    {
        "t": "p",
        "x": "Lo que sí sale de tu aparato, porque no hay otra forma de funcionar:"
    },
    {
        "t": "li",
        "x": "consultas a nodos públicos de Kadena y Ethereum (saldos, envíos, precios de los pools);"
    },
    {
        "t": "li",
        "x": "precios a CoinGecko;"
    },
    {
        "t": "li",
        "x": "comprobación de actualizaciones a descargas.dnns.es."
    },
    {
        "t": "p",
        "x": "Esos servicios ven tu dirección IP y lo que consultas. En el escritorio puedes poner tus propios nodos en Red."
    },
    {
        "t": "p",
        "x": "Y algo que no depende de nadie: la cadena es pública. Cualquiera que conozca tu cuenta puede ver su saldo y todos sus movimientos, para siempre. Nadie puede tocarlos sin tu clave, pero verlos sí."
    },
    {
        "t": "h4",
        "x": "7. Permisos que pide la app en el móvil"
    },
    {
        "t": "p",
        "x": "El APK de Android declara cinco permisos, y ninguno es para nosotros:"
    },
    {
        "t": "li",
        "x": "Internet. Para hablar con los nodos de las cadenas, con CoinGecko y con el servidor de descargas. Sin esto la app no puede ni mirar un saldo."
    },
    {
        "t": "li",
        "x": "Cámara. Solo para leer códigos QR de direcciones y de cobros. La imagen se analiza dentro del aparato y no se guarda ni se manda a ninguna parte. Se pide la primera vez que abres el lector, y si dices que no, la app sigue funcionando: la dirección se pega a mano."
    },
    {
        "t": "li",
        "x": "Instalar aplicaciones. Para abrir el instalador de Android con la actualización ya descargada y comprobada. No instala nada por su cuenta: Android enseña su propio diálogo y tú aceptas, además de haber tenido que permitir antes que esta app instale."
    },
    {
        "t": "li",
        "x": "Huella / biométrico (dos permisos, USE_BIOMETRIC y USE_FINGERPRINT). Para poder abrir la cartera y firmar con la huella si tú lo activas. La huella no sale del aparato ni la ve Koberlet: quien la comprueba es Android, y lo único que recibe la app es un sí o un no."
    },
    {
        "t": "p",
        "x": "Lo que no pide, y conviene saberlo porque otras apps sí lo piden: ni contactos, ni ubicación, ni SMS, ni almacenamiento, ni fotos, ni la lista de apps instaladas."
    },
    {
        "t": "p",
        "x": "En el escritorio no hay permisos que aceptar: es un programa normal de Windows, y lo que hace con tus archivos lo haces tú al guardar o abrir una copia de seguridad."
    },
    {
        "t": "h4",
        "x": "8. La copia de seguridad"
    },
    {
        "t": "p",
        "x": "La copia de seguridad es un archivo con tus carteras dentro, cifrado con tu contraseña. Ni se sube a ninguna nube nuestra ni pasa por ningún servidor: la guardas tú donde tú decidas."
    },
    {
        "t": "p",
        "x": "Eso tiene tres consecuencias que hay que tener claras:"
    },
    {
        "t": "li",
        "x": "Quien tenga el archivo y la contraseña, tiene el dinero. No lo dejes en un chat, en un correo ni en una carpeta compartida."
    },
    {
        "t": "li",
        "x": "Si pierdes la contraseña, la copia no sirve para nada. No hay forma de abrirla sin ella, ni nosotros ni nadie."
    },
    {
        "t": "li",
        "x": "Una copia es de un momento dado. Las carteras que añadas después no están dentro; para tenerlas, hay que hacer una copia nueva."
    },
    {
        "t": "p",
        "x": "La copia protege del aparato roto, perdido o formateado. No sustituye a la semilla en papel: si el archivo se corrompe o se pierde con el aparato, la semilla sigue siendo lo único que recupera una cartera desde cero."
    },
    {
        "t": "h4",
        "x": "9. Sin garantía"
    },
    {
        "t": "p",
        "x": "Koberlet es software libre bajo licencia Apache 2.0, y se entrega «tal cual», sin garantía de ningún tipo, expresa o implícita. Usarlo es decisión y responsabilidad tuya. El código es público y cualquiera puede auditarlo."
    },
    {
        "t": "h4",
        "x": "10. Uso legal"
    },
    {
        "t": "p",
        "x": "Eres responsable de usar Koberlet conforme a la ley del país donde estés, incluidas tus obligaciones fiscales. Koberlet no declara nada por ti ni informa a nadie de lo que haces."
    },
    {
        "t": "h4",
        "x": "11. Actualizaciones"
    },
    {
        "t": "p",
        "x": "Las actualizaciones que la app se descarga van firmadas, y la firma se comprueba antes de aplicarlas: si no cuadra, no se instala. Si estas políticas cambian, se te vuelven a enseñar y hay que aceptarlas otra vez; hasta entonces la app no sigue."
    },
    {
        "t": "h4",
        "x": "12. Quién hay detrás"
    },
    {
        "t": "p",
        "x": "DNNS.es (Oberluss). Los fallos de seguridad se reportan en privado, como explica SECURITY.md: pestaña Security del repositorio → Report a vulnerability. No abras un issue público con un fallo que afecte a fondos."
    }
],
    en: [
    {
        "t": "h3",
        "x": "Koberlet terms of use"
    },
    {
        "t": "p",
        "x": "Version 1.1 — 15/09/2026"
    },
    {
        "t": "p",
        "x": "This is the text you have to accept in order to install or update Koberlet, on the desktop and on the phone. It is written to be read, not to be skipped: if something here does not suit you, do not install the app."
    },
    {
        "t": "p",
        "x": "You can read it again at any time, offline, inside the app itself (desktop: Info → Terms of use; phone: More → Terms of use), and before installing anything at the address above."
    },
    {
        "t": "h4",
        "x": "1. What Koberlet is and is not"
    },
    {
        "t": "p",
        "x": "Koberlet is a non-custodial wallet. Keys are created on your device and stay on your device, encrypted with your password. DNNS.es does not have them, cannot see them and cannot give them back to you."
    },
    {
        "t": "p",
        "x": "It is not a bank, an exchange or a financial service. There is no account to open, no balance that we hold, and nobody to claim a refund from."
    },
    {
        "t": "h4",
        "x": "2. The seed, which only you have"
    },
    {
        "t": "p",
        "x": "The seed phrase — those 12 or 24 words — is the only way to recover a wallet. If you lose it, the money is gone for good: there is no «reset password», and we cannot do anything about it either. If somebody else sees it, they can empty your wallet from anywhere in the world without you noticing."
    },
    {
        "t": "p",
        "x": "Write it down on paper. Keep it where you would keep something that cannot be obtained again."
    },
    {
        "t": "h4",
        "x": "3. What is signed cannot be undone"
    },
    {
        "t": "p",
        "x": "A transaction on a public chain is final. There is no chargeback, no cancellation and no support desk that can reverse it. A mistyped address is money lost."
    },
    {
        "t": "p",
        "x": "Check who and how much before signing. The app always shows you that before asking for your password."
    },
    {
        "t": "h4",
        "x": "4. What Koberlet does not control"
    },
    {
        "t": "p",
        "x": "Koberlet talks to things that are not ours and that we do not operate:"
    },
    {
        "t": "li",
        "x": "third-party contracts: the kaddex.exchange pool, KoberluSW's DCA and limit orders (free.ksw-dca2, free.ksw2), Uniswap on Ethereum;"
    },
    {
        "t": "li",
        "x": "the bridge between Kadena and Ethereum, and the relayers that deliver on the other side;"
    },
    {
        "t": "li",
        "x": "public Kadena and Ethereum nodes;"
    },
    {
        "t": "li",
        "x": "prices, which come from CoinGecko and are indicative."
    },
    {
        "t": "p",
        "x": "If any of them fails, changes its rules, stops halfway or turns out to have a bug, the money can be lost and it is not in our hands to recover it. The bridge in particular is experimental: use it with amounts you can afford to lose."
    },
    {
        "t": "h4",
        "x": "5. None of this is financial advice"
    },
    {
        "t": "p",
        "x": "The app shows numbers and does what you ask it to. It does not recommend buying, selling or holding anything, and a DCA plan is not a promise of profit. Crypto-assets can lose all of their value."
    },
    {
        "t": "h4",
        "x": "6. Your data"
    },
    {
        "t": "p",
        "x": "Koberlet has no user accounts, no sign-up and no telemetry. We do not send your keys, your addresses, your balances or what you do with the app to any server of ours."
    },
    {
        "t": "p",
        "x": "What does leave your device, because there is no other way to work:"
    },
    {
        "t": "li",
        "x": "queries to public nodes on Kadena and Ethereum (balances, transactions, pool prices);"
    },
    {
        "t": "li",
        "x": "prices from CoinGecko;"
    },
    {
        "t": "li",
        "x": "update checks to descargas.dnns.es."
    },
    {
        "t": "p",
        "x": "Those services see your IP address and what you query. On the desktop you can set your own nodes under Network."
    },
    {
        "t": "p",
        "x": "And something nobody controls: the chain is public. Anyone who knows your account can see its balance and every movement it ever made. They cannot touch them without your key, but they can see them."
    },
    {
        "t": "h4",
        "x": "7. Permissions the app asks for on the phone"
    },
    {
        "t": "p",
        "x": "The Android APK declares five permissions, and none of them is for us:"
    },
    {
        "t": "li",
        "x": "Internet. To talk to the chain nodes, to CoinGecko and to the download server. Without it the app cannot even look up a balance."
    },
    {
        "t": "li",
        "x": "Camera. Only to read QR codes of addresses and payment requests. The image is analysed on the device and is neither stored nor sent anywhere. It is asked for the first time you open the scanner, and if you say no the app still works: you paste the address by hand."
    },
    {
        "t": "li",
        "x": "Install packages. To open Android's installer with an update that has already been downloaded and verified. It installs nothing on its own: Android shows its own dialog and you accept, and you must have allowed this app to install beforehand."
    },
    {
        "t": "li",
        "x": "Biometrics (two permissions, USE_BIOMETRIC and USE_FINGERPRINT). So you can unlock and sign with your fingerprint, if you turn that on. The fingerprint never leaves the device and Koberlet never sees it: Android checks it, and all the app gets back is a yes or a no."
    },
    {
        "t": "p",
        "x": "What it does not ask for, worth saying because other apps do: no contacts, no location, no SMS, no storage, no photos, no list of installed apps."
    },
    {
        "t": "p",
        "x": "On the desktop there are no permissions to accept: it is an ordinary Windows program, and what it does with your files is what you do when saving or opening a backup."
    },
    {
        "t": "h4",
        "x": "8. The backup"
    },
    {
        "t": "p",
        "x": "The backup is a file with your wallets inside, encrypted with your password. It is not uploaded to any cloud of ours and does not go through any server: you keep it wherever you decide."
    },
    {
        "t": "p",
        "x": "That has three consequences worth being clear about:"
    },
    {
        "t": "li",
        "x": "Whoever has the file and the password has the money. Do not leave it in a chat, in an email or in a shared folder."
    },
    {
        "t": "li",
        "x": "If you lose the password, the backup is useless. There is no way to open it without it, not for us and not for anyone."
    },
    {
        "t": "li",
        "x": "A backup is a snapshot. Wallets you add later are not in it; to have them, make a new backup."
    },
    {
        "t": "p",
        "x": "The backup protects you from a broken, lost or wiped device. It does not replace the seed phrase on paper: if the file is corrupted or lost along with the device, the seed is still the only thing that recovers a wallet from scratch."
    },
    {
        "t": "h4",
        "x": "9. No warranty"
    },
    {
        "t": "p",
        "x": "Koberlet is free software under the Apache 2.0 licence, provided «as is», without warranty of any kind, express or implied. Using it is your decision and your responsibility. The code is public and anyone can audit it."
    },
    {
        "t": "h4",
        "x": "10. Lawful use"
    },
    {
        "t": "p",
        "x": "You are responsible for using Koberlet in accordance with the law of the country you are in, including your tax obligations. Koberlet files nothing on your behalf and reports nothing about you to anyone."
    },
    {
        "t": "h4",
        "x": "11. Updates"
    },
    {
        "t": "p",
        "x": "Updates downloaded by the app are signed, and the signature is checked before they are applied: if it does not match, it is not installed. If these terms change, you will be shown them again and will have to accept them again; until then the app does not go on."
    },
    {
        "t": "h4",
        "x": "12. Who is behind this"
    },
    {
        "t": "p",
        "x": "DNNS.es (Oberluss). Security issues are reported privately, as explained in SECURITY.md: the repository's Security tab → Report a vulnerability. Do not open a public issue for a bug that affects funds."
    }
],
};
