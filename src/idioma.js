// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// IDIOMA: español e inglés.
//
// La clave del diccionario es el texto EN ESPAÑOL, no un código tipo
// `panel.boton.copiar`. Dos motivos, los dos prácticos:
//
//   - El código se sigue leyendo solo: `t('Copiar dirección')` dice lo que pinta.
//   - Si una frase no está traducida, sale en español. Nunca sale una clave
//     cruda ni un hueco: media pantalla en español se entiende, `app.x.y3` no.
//
// Para frases con datos dentro se usa `{0}`, `{1}`…: `t('Chain {0}', ch)`. Se
// numeran porque en inglés el orden de la frase cambia y las piezas tienen que
// poder moverse con ella.

const LLAVE = 'koberlet.idioma';
const VALIDOS = ['es', 'en', 'sistema'];

// Inglés. Lo que no esté aquí se queda en español, a la vista, y se traduce
// cuando toque; eso es preferible a inventarse una traducción a medias.
const EN = {
    // --- Secciones y navegación
    'Panel': 'Dashboard',
    'Carteras': 'Wallets',
    'Seguridad': 'Security',
    'Red': 'Network',
    'Mercado': 'Market',
    'Ajustes': 'Settings',
    'Info': 'About',
    'Más': 'More',
    'Cerrar': 'Close',
    'Volver': 'Back',
    'Atrás': 'Back',
    'Mejor no': 'Cancel',
    'Guardar': 'Save',
    'Mostrar': 'Show',
    'Ocultar': 'Hide',
    'Refrescar': 'Refresh',
    'Continuar': 'Continue',
    'Comprobar': 'Check',
    'Cargando…': 'Loading…',
    'Consultando…': 'Loading…',
    'Consultando el saldo…': 'Checking the balance…',

    // --- Primer uso
    'Primer uso': 'First run',
    'Todavía no hay ninguna cartera': 'There is no wallet yet',
    'Crear una cartera nueva': 'Create a new wallet',
    'Ya tengo una: importarla': 'I already have one: import it',
    'Desbloquear': 'Unlock',
    'Tu monedero multi-cadena': 'Your multi-chain wallet',
    'Ver una cuenta sin entrar': 'Check an account without signing in',
    'Restaurar desde una copia de seguridad': 'Restore from a backup',
    'Cifrado local AES-256': 'AES-256, encrypted on this device',
    'Solo mira el saldo en la cadena. No abre tu cartera ni toca nada.':
        'It only reads the balance from the chain. It does not open your wallet or touch anything.',
    'Contraseña de la cartera': 'Wallet password',
    'Contraseña de la bóveda': 'Vault password',
    'Crear la cartera': 'Create the wallet',
    'Tu semilla de recuperación': 'Your recovery phrase',
    'Comprobación': 'Check',
    'Contraseña incorrecta.': 'Wrong password.',
    'La cartera está bloqueada.': 'The wallet is locked.',

    // --- Panel
    'Copiar dirección': 'Copy address',
    '✓ Copiada': '✓ Copied',
    'Mostrar código QR para recibir': 'Show QR code to receive',
    'Últimos movimientos': 'Recent activity',
    'Cuándo': 'When',
    'No consta': 'Not recorded',
    'Bloque': 'Block',
    'De': 'From',
    'Esta cuenta': 'This account',
    'Sale de esta chain: es la primera mitad de un envío entre chains. La otra mitad aparece en la chain de destino.': 'It leaves this chain: this is the first half of a cross-chain transfer. The other half shows up on the destination chain.',
    'Por lo que se ve, esto es el gas: lo que cobra el minero por meter tu envío en un bloque. Va aparte del envío.': 'This looks like the gas: what the miner charges for putting your transfer into a block. It shows up separately from the transfer.',
    'Clave de la transacción': 'Transaction key',
    'Copiar la clave': 'Copy the key',
    'Verlo en el explorador': 'See it in the explorer',
    'No se pudieron leer los movimientos: ': 'The activity could not be read: ',
    'Consultar otra cuenta': 'Check another account',
    'Cuenta Kadena': 'Kadena account',
    'Consultar saldo': 'Check balance',
    'Recibido': 'Received',
    'Enviado': 'Sent',
    // Panel
    'Mis carteras': 'My wallets',
    'Enviar': 'Send',
    'Recibir': 'Receive',
    'Puenteado': 'Bridged',
    'no se sabe': 'not known',
    'Detalle de la cartera': 'Wallet details',
    'No se pudo consultar: ': 'Could not be queried: ',
    'No se pudo generar el código: ': 'The code could not be generated: ',
    'Total': 'Total',
    'Chain {0}': 'Chain {0}',
    '{0} · suma de {1} chains': '{0} · across {1} chains',
    'Esta cuenta todavía no tiene KDA. Es normal en una cartera recién creada.':
        'This account has no KDA yet. That is normal in a brand new wallet.',
    'Esa cuenta no es válida para Kadena.': 'That is not a valid Kadena account.',
    'Sin KDA en ninguna de las 20 chains.': 'No KDA on any of the 20 chains.',
    'Saldos de las redes EVM: pendiente de la Fase 5.': 'EVM network balances: coming in phase 5.',
    'Esta cuenta todavía no tiene movimientos.': 'This account has no activity yet.',

    // --- Envío
    // Envio entre chains (crosschain): dos pasos.
    'k:…': 'k:…',
    'Hasta': 'To chain',
    'El destino es esta misma cuenta y la misma chain: no tiene sentido y pagarías gas para nada.':
        'The destination is this same account on the same chain: it makes no sense and you would pay gas for nothing.',
    'Entre chains solo se puede enviar a una cuenta k:: hace falta saber la llave de quien recibe.':
        'Between chains you can only send to a k: account: the receiver\u2019s key has to be known.',
    'Entre chains solo se puede enviar a una cuenta k:.': 'Between chains you can only send to a k: account.',
    'De una chain a otra son dos pasos y tarda un par de minutos. No cierres la app hasta que diga que ha llegado; si se corta, el dinero no se pierde: se queda a medio camino y se puede rematar después con la referencia.':
        'From one chain to another takes two steps and a couple of minutes. Do not close the app until it says it arrived; if it is cut short the money is not lost: it stays halfway and can be finished later with the reference.',
    '✓ Ha llegado a la chain {0}.': '✓ It arrived on chain {0}.',
    'El dinero salió de la chain {0} pero el segundo paso no ha entrado todavía. No se ha perdido: se queda a medio camino y se puede rematar con esta referencia, desde aquí o desde el escritorio.':
        'The money left chain {0} but the second step has not landed yet. It is not lost: it stays halfway and can be finished with this reference, from here or from the desktop.',
    'La prueba del primer paso todavía no está lista. El dinero no se ha perdido: prueba otra vez en un minuto.':
        'The proof of the first step is not ready yet. The money is not lost: try again in a minute.',
    'Origen y destino son la misma chain.': 'Source and destination are the same chain.',
    'Esa chain no existe.': 'That chain does not exist.',
    'Falta la chain de destino.': 'The destination chain is missing.',
    'Enviar desde la chain': 'Send from chain',
    'Falta la acción.': 'The action is missing.',
    'Falta el plan.': 'The plan is missing.',
    'Cómo está protegida': 'How it is protected',
    'Cifrado': 'Encryption',
    'AES-256 en este aparato': 'AES-256 on this device',
    'AES-256 en el navegador': 'AES-256 in the browser',
    'Huella o cara': 'Fingerprint or face',
    'Se cierra sola': 'Locks itself',
    'Nunca': 'Never',
    'Activada': 'On',
    'Sin activar': 'Not set up',
    'No disponible': 'Not available',
    'No se pudo consultar': 'Could not be checked',
    'La contraseña no se guarda en ningún sitio: sin ella no hay forma de abrir la bóveda, tampoco para nosotros.':
        'The password is not stored anywhere: without it there is no way to open the vault, not for us either.',
    'Tus claves': 'Your keys',
    'Lo que salga aquí da control TOTAL sobre el dinero de esa cartera. Que no haya nadie mirando, y no lo escribas en ningún chat, correo ni foto.':
        'What comes up here gives TOTAL control over that wallet’s money. Make sure nobody is watching, and never write it in a chat, an email or a photo.',
    'Todavía no hay ninguna cartera en este aparato.': 'There is no wallet on this device yet.',
    'Ver la semilla': 'Show the recovery phrase',
    'Clave privada · {0}': 'Private key · {0}',
    'Esta cartera se metió por su clave privada: no tiene palabras que enseñar.':
        'This wallet was imported from its private key: there are no words to show.',
    'Parar': 'Pause',
    'Reanudar': 'Resume',
    'Recargar': 'Top up',
    'Firmar': 'Sign',
    'Cuánto añades al bote, en {0}': 'How much you add to the pot, in {0}',
    'El plan deja de comprar. El bote se queda donde está y puedes reanudarlo cuando quieras.':
        'The plan stops buying. The pot stays where it is and you can resume whenever you want.',
    'El plan vuelve a comprar, y la cuenta para la siguiente compra empieza ahora.':
        'The plan starts buying again, and the countdown to the next buy starts now.',
    'Se ingresan {0} {1} más en el contrato ahora mismo.': '{0} {1} more go into the contract right now.',
    'Se cierra el plan y te devuelve {0} {1} a tu cuenta. Un plan cerrado no se reabre: para seguir comprando habría que crear otro.':
        'The plan is closed and {0} {1} go back to your account. A closed plan cannot be reopened: to keep buying you would create another one.',
    '✓ Plan parado.': '✓ Plan paused.',
    '✓ Plan reanudado.': '✓ Plan resumed.',
    '✓ Bote recargado.': '✓ Pot topped up.',
    '✓ Plan cerrado. El bote que quedaba vuelve a tu cuenta.':
        '✓ Plan closed. The remaining pot goes back to your account.',
    'Ese plan no es de esta cartera.': 'That plan does not belong to this wallet.',
    'El identificador del plan no vale.': 'The plan identifier is not valid.',
    'Esa acción sobre el plan no existe.': 'There is no such action on a plan.',
    'Tocar un plan de compras solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Changing a buying plan only works in the installed app: here the vault is a development stand-in and does not sign.',
    'Agenda': 'Address book',
    'Todavía no has guardado ninguna cuenta. Se guardan desde la pantalla de enviar.':
        'You have not saved any account yet. They are saved from the send screen.',
    'Salen en el desplegable de «Cuenta de destino» al enviar.':
        'They show up in the “Destination account” dropdown when sending.',
    'Quitar de la agenda': 'Remove from the address book',
    'Escribir la cuenta a mano': 'Type the account by hand',
    'La agenda está vacía: escribe la cuenta y guárdala':
        'The address book is empty: type the account and save it',
    'Guardar esta cuenta en la agenda': 'Save this account to the address book',
    'Nombre para esta cuenta': 'Name for this account',
    'Casa de cambio, Juan…': 'Exchange, John…',
    'Guardada en la agenda como «{0}».': 'Saved to the address book as “{0}”.',
    'Esa cuenta la tienes guardada como «{0}».': 'You have that account saved as “{0}”.',
    'Ponle un nombre a la cuenta.': 'Give the account a name.',
    'El nombre es demasiado largo.': 'That name is too long.',
    'Esa cuenta no es válida para Kadena.': 'That account is not valid for Kadena.',
    'La agenda está llena.': 'The address book is full.',
    'El código pide {0} KDA en la chain {1}. Repásalo: lo envías tú.':
        'The code asks for {0} KDA on chain {1}. Check it: you are the one sending.',
    'El código pide cobrar en la chain {0}.': 'The code asks to be paid on chain {0}.',
    'Cantidad (opcional)': 'Amount (optional)',
    'Copiar el QR': 'Copy the QR',
    '✓ QR copiado': '✓ QR copied',
    'Aquí no se puede copiar la imagen: copiado el cobro en texto':
        'Images cannot be copied here: the request was copied as text instead',
    'No se pudo copiar: haz una captura de pantalla': 'Could not copy: take a screenshot',
    'El código pide {0} KDA en la chain {1}.': 'The code asks for {0} KDA on chain {1}.',

    // Cobrar poniendo el precio en dinero del mundo. El aviso largo es a
    // proposito: lo que se congela en el codigo son KDA, no el importe.
    'El código pide {0} KDA en la chain {1} — son {2} al cambio de ahora ({3} por KDA). Si el precio se mueve antes de que te paguen, cobrarás esos KDA, no ese importe.':
        'The code asks for {0} KDA on chain {1} — that is {2} at the current rate ({3} per KDA). If the price moves before you get paid, you will receive those KDA, not that amount.',
    'Ojo: no se ha podido actualizar el cambio desde hace {0} min.':
        'Careful: the rate has not been updated for {0} min.',
    'k:… o el nombre de una cuenta': 'k:… or an account name',
    // Tokens puestos a mano. Se insiste en dos cosas: que aqui solo se miran, y
    // que un contrato cualquiera puede mentir en el saldo.
    'Tokens puestos a mano': 'Tokens you added',
    'Los de la red {0}. Cada red lleva los suyos.': 'The ones on {0}. Each network keeps its own.',
    'Todavía no has añadido ninguno.': 'You have not added any yet.',
    'Quitar este token': 'Remove this token',
    'Importar un token': 'Import a token',
    'Para ver en el panel un token que la app no trae de fábrica.':
        'To see a token the app does not ship with on your dashboard.',
    'Contrato del token': 'Token contract',
    'Símbolo': 'Symbol',
    'Añadir el token': 'Add the token',
    'Un token añadido a mano solo se VE: desde el móvil se envía KDA, no tokens. El contrato que pongas no llega a firmar nada.':
        'A token you add is only DISPLAYED: this phone sends KDA, not tokens. The contract you enter never gets to sign anything.',
    'Y ojo: un contrato cualquiera puede devolver el saldo que le dé la gana. Añade solo los que conozcas; ver un número aquí no prueba que tengas ese dinero.':
        'And careful: any contract can return whatever balance it likes. Only add ones you know; seeing a number here is no proof that the money is yours.',
    'puesto por ti': 'added by you',
    'visto en tus movimientos': 'seen in your activity',
    'El contrato se escribe como n_algo.NOMBRE: letras, números, guion y guion bajo, con al menos un punto.':
        'The contract looks like n_something.NAME: letters, numbers, hyphen and underscore, with at least one dot.',
    'El símbolo son 10 letras o números como mucho.': 'The symbol is 10 letters or numbers at most.',
    'Ese símbolo es el de la moneda de la red: ponle otro.': 'That symbol belongs to the network currency: pick another.',
    'Ese contrato ya está en la lista.': 'That contract is already on the list.',
    'Ya hay un token con ese símbolo.': 'There is already a token with that symbol.',
    'Moneda': 'Currency',
    'Moneda de referencia': 'Reference currency',
    'Solo cambia en qué moneda se te enseña lo que vale. El dinero sigue siendo KDA.':
        'This only changes the currency used to show you what things are worth. The money is still KDA.',
    'Euro': 'Euro',
    'Dólar estadounidense': 'US dollar',
    'Libra esterlina': 'Pound sterling',
    'Franco suizo': 'Swiss franc',
    'El código lleva solo tu cuenta: quien pague elige cuánto y en qué chain.':
        'The code carries only your account: whoever pays chooses how much and on which chain.',
    'Chain': 'Chain',
    'Cuenta de destino': 'Destination account',
    'Cantidad en {0}': 'Amount in {0}',
    'Escanear un código QR': 'Scan a QR code',
    'Máx.': 'Max',
    'Todo lo que hay en esta chain, dejando lo justo para el gas': 'Everything on this chain, keeping just enough for the gas',
    'Confirmar el envío': 'Confirm the transfer',
    'Firmar y enviar': 'Sign and send',
    'Envías': 'You send',
    'Desde': 'From',
    'A': 'To',
    'Repasa esto con calma: una transferencia en la cadena no se puede deshacer ni reclamar a nadie.':
        'Read this carefully: a transfer on the chain cannot be undone, and there is nobody to claim it from.',
    'Esa cuenta de destino no es válida para Kadena.': 'That destination account is not valid for Kadena.',
    'Escribe una cantidad mayor que cero.': 'Enter an amount greater than zero.',
    'Firmar en el móvil': 'Sign on the phone',
    'Políticas de uso':
        'Terms of use',
    'Antes de empezar, lee esto':
        'Before you start, read this',
    'He leído las políticas y las acepto':
        'I have read the terms and I accept them',
    'Aceptar y continuar':
        'Accept and continue',
    'Se pueden volver a leer en Más, sin conexión.':
        'You can read them again under More, offline.',
    'Versión de las políticas: {0}':
        'Terms version: {0}',
    'Aceptaste la versión {0}.':
        'You accepted version {0}.',
    'Todavía no hay ninguna versión aceptada en este aparato.':
        'No version has been accepted on this device yet.',
    'Comprobar que saldría bien': 'Check that it would go through',
    'No cabe el gas: cambiando eso te quedarías sin con qué pagar la transacción. Con el gas de ahora puedes cambiar como mucho {0} ETH.':
        'The gas does not fit: swapping that would leave you unable to pay for the transaction. With the current gas you can swap at most {0} ETH.',
    'El gas de este cambio ronda {0} ETH y sale de este mismo saldo.':
        'The gas for this swap is around {0} ETH and comes out of this same balance.',
    'No hay ETH suficiente para pagar el gas de esta transacción. Deja algo de ETH sin gastar.':
        'There is not enough ETH to pay for this transaction’s gas. Leave some ETH unspent.',
    'Esa transacción ya se había mandado. Mira el saldo antes de repetirla.':
        'That transaction was already sent. Check the balance before repeating it.',
    'Hay otra transacción tuya en cola y esta paga menos. Espera a que entre la anterior.':
        'You have another transaction queued and this one pays less. Wait for the earlier one to go through.',
    'La transacción necesita más gas del que se le ha puesto.':
        'The transaction needs more gas than it was given.',
    'Pon cuánto quieres enviar.': 'Enter how much you want to send.',
    'Comprobando que saldría bien…': 'Checking that it would go through…',
    'Peaje del puente: {0} KDA': 'Bridge toll: {0} KDA',
    'Ese par no se cambia de una vez. Pasa por USDC: primero a USDC y luego a lo que quieras.':
        'That pair cannot be swapped in one go. Go through USDC: first to USDC and then to whatever you want.',
    'Firmar con la contraseña': 'Sign with the password',
    'No se pudo abrir el mercado de Ethereum.':
        'The Ethereum market could not be opened.',
    'Esto SÍ cambia el dinero. Como mínimo recibirás {0}; si el pool diera menos, la transacción se cae y solo se pierde el gas.':
        'This DOES move the money. You will get at least {0}; if the pool gave less, the transaction fails and only the gas is lost.',
    'Ese camino de cambio no tiene sentido.':
        'That swap path makes no sense.',
    'La cuenta del pool no es válida.':
        'The pool account is not valid.',
    'Falta la cuenta del pool.':
        'The pool account is missing.',
    'Falta el camino del cambio.':
        'The swap path is missing.',
    'Cambiar en el mercado solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Swapping on the market only works in the installed app: here the vault is a development stand-in and does not sign.',
    'Preguntando a Uniswap…':
        'Asking Uniswap…',
    'Comisión del pool':
        'Pool fee',
    'Comisión de Koberlet ({0} %)':
        'Koberlet fee ({0} %)',
    'De lo que das se aparta antes el {0} % para Koberlet: {1} {2}. Va en la misma transacción, así que si el cambio falla no se cobra nada.':
        'Before the swap, {0} % of what you give goes to Koberlet: {1} {2}. It travels in the same transaction, so if the swap fails nothing is charged.',
    'Esa cantidad es demasiado pequeña para este token.':
        'That amount is too small for this token.',
    'La comisión no puede ser mayor que la parte que le toca.':
        'The fee cannot be larger than the share it is due.',
    'La comisión no puede ser negativa.':
        'The fee cannot be negative.',
    'La comisión no puede pasar del 1 %.':
        'The fee cannot go above 1%.',
    'Koberlet se queda el {0} % de lo que recibes: {1} {2}. Lo aparta el propio Uniswap en la misma transacción, así que si el cambio falla no se cobra nada.':
        'Koberlet takes {0} % of what you receive: {1} {2}. Uniswap itself sets it aside in the same transaction, so if the swap fails nothing is charged.',
    'El mínimo es lo que se firma: si en el momento del cambio fuera a dar menos, la transacción se cae y solo se pierde el gas. Se tolera un {0} % de diferencia.':
        'The minimum is what gets signed: if at swap time it would give less, the transaction fails and only the gas is lost. A {0} % difference is tolerated.',
    'No tienes tanto {0}.':
        'You do not have that much {0}.',
    'Primero hay que autorizar el {0} a Uniswap. Son dos transacciones y las dos gastan gas.':
        'First the {0} has to be authorised to Uniswap. That is two transactions and both cost gas.',
    'Firmar el cambio':
        'Sign the swap',
    'Autorizar el token':
        'Authorise the token',
    'La autorización entró en un bloque pero falló. No se ha cambiado nada.':
        'The authorisation got into a block but failed. Nothing was swapped.',
    'El cambio entró en un bloque pero falló: puede que el precio se moviera más de lo tolerado. El gas se ha pagado igual.':
        'The swap got into a block but failed: the price may have moved more than tolerated. The gas was paid all the same.',
    '✓ Cambiado. Mira el saldo en el Panel.':
        '✓ Swapped. Check the balance on the Panel.',
    'No se sabe a quién habría que autorizar.':
        'It is not known who should be authorised.',
    'Falta el cambio que se quiere hacer.':
        'The swap to make is missing.',
    'Falta la comisión del pool.':
        'The pool fee is missing.',
    'Falta el mínimo que aceptas recibir.':
        'The minimum you accept to receive is missing.',
    'Ese cambio no está entre los que sabe hacer la app.':
        'That swap is not one the app knows how to do.',
    'Esa comisión de pool no es una de las que se usan.':
        'That pool fee is not one of the ones in use.',
    'El mínimo no puede ser negativo.':
        'The minimum cannot be negative.',
    'Un multicall sin llamadas no hace nada.':
        'A multicall with no calls does nothing.',
    'Esa llamada no son bytes enteros.':
        'That call is not whole bytes.',
    'La cantidad no puede ser negativa.':
        'The amount cannot be negative.',
    'Enviar {0}':
        'Send {0}',
    'Qué envías':
        'What you send',
    'Esta cartera no tiene {0} en ninguna chain, así que no hay nada que enviar.':
        'This wallet has no {0} on any chain, so there is nothing to send.',
    'En la chain {0} solo hay {1} {2}.':
        'Chain {0} only has {1} {2}.',
    'Para mandar {0} desde la chain {1} hace falta algo de KDA ahí para el gas, y solo hay {2}.':
        'To send {0} from chain {1} you need some KDA there for gas, and there is only {2}.',
    'De momento solo el KDA se puede pasar de una chain a otra desde el móvil. Elige la misma chain de destino.':
        'For now only KDA can be moved from one chain to another from the phone. Pick the same destination chain.',
    'Ese token no tiene un contrato con forma válida.':
        'That token does not have a validly shaped contract.',
    'Esa cantidad es más pequeña que lo que admite este token.':
        'That amount is smaller than what this token allows.',
    'Falta el contrato del token.':
        'The token contract is missing.',
    'Falta la cuenta de destino.':
        'The destination account is missing.',
    'Desde Ethereum el viaje son dos transacciones: primero autorizar el token y después enviar. Las dos se firman aquí y las dos gastan gas.':
        'From Ethereum the trip is two transactions: first authorise the token, then send. Both are signed here and both cost gas.',
    'Autorizar el token en Ethereum':
        'Authorise the token on Ethereum',
    'Firmar el envío':
        'Sign the transfer',
    'Transacción del permiso':
        'Authorisation transaction',
    'La autorización entró en un bloque pero falló. No se ha enviado nada.':
        'The authorisation got into a block but failed. Nothing has been sent.',
    'Transacción en Ethereum':
        'Ethereum transaction',
    'La transacción entró en un bloque pero falló. El gas se ha pagado igual.':
        'The transaction got into a block but failed. The gas was paid all the same.',
    '✓ Salió de Ethereum. Ahora lo tiene que entregar el relayer en Kadena, y eso tarda.':
        '✓ It left Ethereum. Now the relayer has to deliver it on Kadena, and that takes a while.',
    'Cuando llegue, aparecerá como kb-{0} en la chain 2 de esa cuenta.':
        'When it arrives it will show up as kb-{0} on chain 2 of that account.',
    'En una transacción no hay números negativos.':
        'A transaction has no negative numbers.',
    'Lo que se firma son 32 bytes.':
        'What gets signed is 32 bytes.',
    'Clave privada fuera de rango.':
        'Private key out of range.',
    'No se pudo determinar el recovery id de la firma.':
        'The recovery id of the signature could not be determined.',
    'El valor no puede ser negativo.':
        'The value cannot be negative.',
    'El nonce no puede ser negativo.':
        'The nonce cannot be negative.',
    'El límite de gas está fuera de lo razonable.':
        'The gas limit is outside anything reasonable.',
    'El precio del gas está fuera de lo razonable.':
        'The gas price is outside anything reasonable.',
    'La propina no puede pasar del precio máximo del gas.':
        'The tip cannot exceed the maximum gas price.',
    'Aquí no hay números negativos.':
        'There are no negative numbers here.',
    'El número no cabe en 32 bytes.':
        'The number does not fit in 32 bytes.',
    'Eso no es una cantidad.':
        'That is not an amount.',
    'Ese token no tiene tantos decimales.':
        'That token does not have that many decimals.',
    'El peaje no puede ser negativo.':
        'The toll cannot be negative.',
    'El peaje que dice el contrato es disparatado; no se firma.':
        'The toll the contract reports is absurd; this will not be signed.',
    'Falta el nonce de la cuenta.':
        'The account nonce is missing.',
    'Falta el límite de gas.':
        'The gas limit is missing.',
    'Falta el precio del gas.':
        'The gas price is missing.',
    'Falta la propina del gas.':
        'The gas tip is missing.',
    'Esa cartera no es de Ethereum.':
        'That wallet is not an Ethereum one.',
    'Falta la cuenta de Kadena.':
        'The Kadena account is missing.',
    'El nodo no devolvió un hash de transacción.':
        'The node did not return a transaction hash.',
    // Mensajes que solo salen del plugin de iPhone (Huella.swift, KoberletVault.swift, KoberletCore).
    'Este iPhone no tiene Face ID ni Touch ID.':
        'This iPhone has no Face ID or Touch ID.',
    'No hay ninguna cara ni huella configurada en este iPhone. Añádela en Ajustes.':
        'No face or fingerprint is set up on this iPhone. Add one in Settings.',
    'Face ID / Touch ID está bloqueado. Desbloquéalo con el código del iPhone.':
        'Face ID / Touch ID is locked. Unlock it with the iPhone passcode.',
    'Este iPhone no tiene código. Ponle uno para poder usar la identificación.':
        'This iPhone has no passcode. Set one to be able to use biometric unlock.',
    'Este iPhone no admite identificación segura.':
        'This iPhone does not support secure biometric unlock.',
    'No se pudo preparar la protección biométrica.':
        'Could not set up biometric protection.',
    'No se pudo leer la contraseña guardada.':
        'Could not read the stored password.',
    'La identificación ya no vale en este iPhone. Vuelve a activarla con tu contraseña.':
        'Biometric unlock is no longer valid on this iPhone. Enable it again with your password.',
    'No se puede abrir la hoja de compartir ahora mismo.':
        'The share sheet cannot be opened right now.',
    'No se pudo preparar la copia.':
        'Could not prepare the backup.',
    'El peaje no es un número.':
        'The toll is not a number.',
    'El contenido de la bóveda no es una cartera de Koberlet.':
        'The vault contents are not a Koberlet wallet.',
    'No se pudo derivar la clave de la bóveda.':
        'Could not derive the vault key.',
    'No se pudo cifrar la bóveda.':
        'Could not encrypt the vault.',
    'El fichero de la bóveda no tiene la forma esperada.':
        'The vault file does not have the expected format.',
    'La clave pública no tiene la forma esperada.':
        'The public key does not have the expected format.',
    'La firma no tiene 64 bytes.':
        'The signature is not 64 bytes long.',
    'Historial':
        'History',
    'Solo {0} → {1}':
        'Only {0} → {1}',
    'Entregado en Ethereum':
        'Delivered on Ethereum',
    'Entregado en Kadena':
        'Delivered on Kadena',
    'Salió de Kadena':
        'Left Kadena',
    'Salió de Ethereum':
        'Left Ethereum',
    'Esto vino de Ethereum. Cuando el relayer lo entregue, aparece en la chain 2 de esa cuenta de Kadena: aquí no hay nada que comprobar.':
        'This one came from Ethereum. When the relayer delivers it, it shows up on chain 2 of that Kadena account: there is nothing to check here.',
    'Lo rechazó el contrato':
        'The contract rejected it',
    'Sin confirmar':
        'Unconfirmed',
    'Mandado al nodo':
        'Sent to the node',
    'Envíos por el puente':
        'Bridge transfers',
    'Todavía no has mandado nada por el puente desde este aparato.':
        'You have not sent anything through the bridge from this device yet.',
    'Guardado en este aparato. En otro móvil no aparece.':
        'Stored on this device. It does not show up on another phone.',
    'Hacia {0}':
        'To {0}',
    'Comprobar si ya llegó':
        'Check whether it arrived',
    'Entregado en Ethereum. Lo dice {0}.':
        'Delivered on Ethereum. {0} says so.',
    'Borrar esta lista no deshace ningún envío: lo que pasó en la cadena se queda.':
        'Clearing this list undoes no transfer: what happened on the chain stays.',
    'Borrar el historial':
        'Clear the history',
    'Enviar desde Ethereum': 'Send from Ethereum',
    // El envío desde Ethereum (0.53.0). Hasta entonces aquí solo había una hoja
    // diciendo que eso se hacía en el escritorio.
    'Dirección de destino': 'Destination address',
    'Esa dirección de destino no es válida para Ethereum.':
        'That destination address is not valid for Ethereum.',
    'Ese código no lleva una dirección de Ethereum válida. Repásalo antes de enviar nada.':
        'That code does not carry a valid Ethereum address. Check it before sending anything.',
    'El destino es esta misma cuenta: no tiene sentido y pagarías gas para nada.':
        'The destination is this very account: it makes no sense and you would pay gas for nothing.',
    'Preguntando el gas…': 'Asking what the gas costs…',
    'No cabe el gas: enviando eso te quedarías sin con qué pagar la transacción. Con el gas de ahora puedes enviar como mucho {0} ETH.':
        'The gas does not fit: sending that would leave you unable to pay for the transaction. With gas as it is now you can send at most {0} ETH.',
    'Para mandar {0} hace falta ETH en la cuenta para el gas, y con el de ahora harían falta unos {1} ETH.':
        'To send {0} you need ETH in the account for the gas, and as things stand that would take about {1} ETH.',
    'Gas, como mucho': 'Gas, at most',
    'El gas se paga en ETH y es un máximo: lo que no se gaste no se cobra.':
        'Gas is paid in ETH and this is a maximum: what is not used is not charged.',
    'El envío entró en un bloque pero falló. El gas se ha pagado igual.':
        'The transfer made it into a block but failed. The gas was paid anyway.',
    'Falta qué se envía.': 'You have not said what to send.',
    'Ese token no está entre los que sabe enviar la app.':
        'That token is not one of the ones the app knows how to send.',
    'Envío en marcha': 'Transfer under way',
    'El último envío': 'The last transfer',
    'El nodo no contestó a la última consulta. Se sigue intentando.':
        'The node did not answer the last check. It keeps trying.',
    'Preguntado {0} veces al nodo: todavía no está en un bloque.':
        'Asked the node {0} times: it is not in a block yet.',
    'Mandar la transacción al nodo':
        'Send the transaction to the node',
    'Recoger la prueba para la otra chain':
        'Fetch the proof for the other chain',
    'Entregarlo en la chain de destino':
        'Deliver it on the destination chain',
    'Con ella se mira luego en qué quedó, aquí o en el explorador.':
        'With it you can check later how it ended up, here or in the explorer.',
    'El dinero ha salido de la chain {0}.':
        'The money has left chain {0}.',
    'Esta es la que se pega abajo, en «¿Llegó mi envío a Ethereum?».':
        'This is the one you paste below, in «Did my transfer reach Ethereum?».',
    'Identificador del mensaje (para el explorador)':
        'Message identifier (for the explorer)',
    'Para seguirlo en el explorador del puente. Para el comprobador de abajo se usa la referencia.':
        'To follow it in the bridge explorer. The checker below uses the reference.',
    'Ten paciencia: esto suele tardar uno o dos minutos. No cierres la app ni vuelvas a pulsar; sigue en marcha.':
        'Be patient: this usually takes a minute or two. Do not close the app or press again; it is still going.',
    'Está tardando más de lo normal. No se ha perdido: sigue preguntando, y aunque se cierre la app queda la referencia para mirarlo luego.':
        'It is taking longer than usual. It is not lost: it keeps asking, and even if the app closes the reference is there to check later.',
    'Mandar la transacción a Kadena': 'Send the transaction to Kadena',
    'Esperar a que entre en un bloque': 'Wait for it to get into a block',
    '✓ Enviado y confirmado en la cadena.': '✓ Sent and confirmed on the chain.',

    // --- Seguridad
    'Ver la semilla o una clave privada': 'Show the recovery phrase or a private key',
    'Qué quieres ver': 'What do you want to see',
    'Tu semilla': 'Your recovery phrase',
    'Clave privada': 'Private key',

    // --- Ajustes
    'Aspecto': 'Appearance',
    'Tema': 'Theme',
    'Claro': 'Light',
    'Oscuro': 'Dark',
    'El del sistema': 'Same as the system',
    'Idioma': 'Language',
    'Español': 'Spanish',
    'Inglés': 'English',
    'Privacidad': 'Privacy',
    'Ocultar los saldos': 'Hide the balances',
    'Volver a mostrar los saldos': 'Show the balances again',
    'Copia de seguridad': 'Backup',
    'Abrir copias de seguridad': 'Open backups',
    'Bloquear': 'Lock',
    'Bloquear ahora': 'Lock now',
    'Bloquear y salir': 'Lock and leave',
    'Bloquear sola si no la tocas': 'Lock itself if you do not touch it',
    'Nunca (no recomendado)': 'Never (not recommended)',
    '1 minuto': '1 minute',
    'Cuenta igual con la app delante que en segundo plano: el tiempo sin tocarla es tiempo sin tocarla.':
        'It counts the same with the app in front or in the background: time untouched is time untouched.',
    'Así la cartera se queda abierta hasta que la bloquees a mano o cierres la app del todo.':
        'This leaves the wallet open until you lock it by hand or close the app completely.',
    'Versión': 'Version',
    'Tapa las cantidades en pantalla. No bloquea la cartera ni cambia nada: solo deja de enseñar el dinero.':
        'Covers the amounts on screen. It does not lock the wallet or change anything: it just stops showing the money.',
    'Guarda o restaura el fichero cifrado de la bóveda.': 'Save or restore the encrypted vault file.',
    'Cierra la cartera. Para volver a abrirla hará falta la contraseña.':
        'Closes the wallet. Opening it again will need the password.',

    // --- Red
    'Red a la que se conecta la app': 'Network the app connects to',
    // Los nodos de Kadena: la app los mide sola y usa el mejor de los que van al dia.
    'Nodos de Kadena': 'Kadena nodes',
    'La app los mide sola cada diez minutos y usa el más rápido DE LOS QUE VAN AL DÍA. No hay nada que hacer aquí, salvo que quieras poner el tuyo o mandar sobre uno concreto.':
        'The app measures them on its own every ten minutes and uses the fastest ONE THAT IS UP TO DATE. There is nothing to do here, unless you want to add your own or force a particular one.',
    'Todavía sin medir.': 'Not measured yet.',
    'en uso': 'in use',
    'no contesta': 'no answer',
    'Va {0} bloques atrasado: se aparta aunque sea rápido.':
        'It is {0} blocks behind: set aside even if it is fast.',
    'Al día ({0} bloque(s) del más adelantado).': 'Up to date ({0} block(s) from the most advanced one).',
    'Al día.': 'Up to date.',
    'Usar siempre este': 'Always use this one',
    'Volver al automático': 'Back to automatic',
    'Quitar': 'Remove',
    'Hay un nodo fijado a mano: se sigue midiendo, pero no se cambia solo aunque otro vaya mejor.':
        'A node is pinned by hand: it is still measured, but it will not change on its own even if another one does better.',
    'Medido hace {0} s.': 'Measured {0} s ago.',
    'Medir ahora': 'Measure now',
    'Midiendo…': 'Measuring…',
    'Añadir un nodo tuyo': 'Add a node of your own',
    'Añadir el nodo': 'Add the node',
    'Solo https: por http cualquiera en la misma wifi podría cambiarte un saldo o un precio por el camino. Un nodo ve las direcciones que consultas y puede mentirte, pero no puede sacarte las claves: la firma se hace dentro del móvil.':
        'https only: over http anyone on the same wifi could change a balance or a price on the way. A node sees the addresses you look up and can lie to you, but it cannot take your keys: signing happens inside the phone.',
    'sin altura en la respuesta': 'no block height in the answer',
    'La dirección del nodo tiene que empezar por https:// y no llevar usuario, ? ni #.':
        'The node address has to start with https:// and carry no username, ? or #.',
    'Ese nodo ya está en la lista.': 'That node is already on the list.',
    'Los nodos de fábrica no se quitan.': 'Factory nodes cannot be removed.',
    '(desactivada por defecto)': '(off by default)',
    // Redes puestas a mano (una devnet de pruebas, por ejemplo).
    '(puesta a mano)': '(added by hand)',
    'Redes puestas a mano': 'Networks added by hand',
    'Todavía no has añadido ninguna.': 'You have not added any yet.',
    'Quitar esta red': 'Remove this network',
    'Añadir una red': 'Add a network',
    'Añadir la red': 'Add the network',
    'Dirección del nodo': 'Node address',
    'networkId': 'networkId',
    'Para apuntar la app a tu propio nodo, por ejemplo una devnet de pruebas.':
        'To point the app at your own node, a test devnet for example.',
    'Un nodo puesto a mano ve las direcciones que consultas y puede mentirte en los saldos y en el estado de un envío. No puede sacarte las claves: la firma se hace dentro del móvil. Aun así, pon solo nodos que sean tuyos o de quien te fíes.':
        'A node added by hand sees the addresses you look up and can lie to you about balances and about whether a transfer went through. It cannot take your keys: signing happens inside the phone. Even so, only add nodes that are yours or that you trust.',
    'En una red puesta a mano solo se ve el saldo de KDA: los contratos de token y de NFT van en el código de la app y no se pueden escribir aquí.':
        'On a network added by hand you only see the KDA balance: token and NFT contracts live in the app code and cannot be typed in here.',
    'Ponle un nombre a la red (40 letras como mucho).': 'Give the network a name (40 characters at most).',
    'El networkId solo admite letras, números, punto, guion y guion bajo.':
        'The networkId only accepts letters, digits, dot, dash and underscore.',
    'La dirección del nodo no es una dirección válida.': 'The node address is not a valid address.',
    'La dirección del nodo tiene que empezar por https:// o http://.':
        'The node address has to start with https:// or http://.',
    'La dirección del nodo no puede llevar usuario ni contraseña.':
        'The node address cannot carry a username or a password.',
    'La dirección del nodo no puede llevar ni ? ni #.': 'The node address cannot carry ? or #.',
    'Esa red ya está en la lista.': 'That network is already on the list.',
    'Estado': 'Status',
    'responde': 'responding',
    'Chains': 'Chains',
    'Altura': 'Height',
    'Tarda': 'Takes',
    'Comprobando el nodo…': 'Checking the node…',
    'Por dónde salen las consultas': 'How the queries leave the app',

    // --- Mercado
    'Se cerró sola por seguridad: llevaba un rato sin tocarse. Se cambia en Ajustes.':
        'It locked itself for safety: it had not been touched for a while. You can change that in Settings.',
    'La sección está hecha y ve las piezas, pero se ha quitado del menú de momento: mover una pieza todavía no se puede, y una pantalla que solo mira ocupaba un botón sin dar nada.':
        'The screen is built and shows the pieces, but it is out of the menu for now: moving a piece is not possible yet, and a screen that only looks was taking up a button for nothing.',
    'Cambiar en Mercado':
        'Swapping in Market',
    'El cálculo y la simulación ya están; falta firmar el cambio desde el móvil.':
        'The quote and the dry run are there; signing the swap on the phone is missing.',
    'Enviar desde Ethereum':
        'Sending from Ethereum',
    'Por el puente se puede mandar de Kadena a Ethereum. Al revés no: eso es firmar una transacción de Ethereum, que es otra criptografía y todavía no está.':
        'The bridge can send from Kadena to Ethereum. Not the other way round: that means signing an Ethereum transaction, which is different cryptography and is not there yet.',
    'Enviar desde una cartera de Ethereum':
        'Sending from an Ethereum wallet',
    'Por lo mismo: una cartera EVM aquí solo mira.':
        'Same reason: an EVM wallet here only looks.',
    'Ver el estado de la red': 'See the network status',
    'A qué nodo se pregunta, si contesta y por qué altura va la cadena.':
        'Which node is asked, whether it answers, and what block height the chain is at.',
    '{0} · valor de la cartera': '{0} · wallet value',
    '{0} · lo que hay en KDA': '{0} · how much KDA there is',
    'el KDA {0} % en 24 h': 'KDA {0}% in 24 h',
    '{0} contado a {1} KDA, que es su precio de venta: todavía no cotiza en ningún mercado.':
        '{0} counted at {1} KDA, which is its sale price: it is not traded on any market yet.',
    'sin contar lo que no tiene precio conocido': 'not counting what has no known price',
    'sin precio conocido': 'no known price',
    'En qué chains está': 'Which chains it is on',
    'Chain {0}': 'Chain {0}',
    'No se sabe en qué chain está: la consulta no devolvió el reparto.':
        'It is not known which chain it is on: the query did not return the breakdown.',
    'Está repartido en {0} chains. Para enviar hay que elegir de cuál sale, y cada una va por su cuenta.':
        'It is spread across {0} chains. To send, you have to pick which one it leaves from, and each one goes on its own.',

    // --- Info
    'Dónde corre': 'Running on',
    'Navegador': 'Browser',
    'APK de Android': 'Android APK',
    'Bóveda': 'Vault',
    'nativa (Android)': 'native (Android)',
    'nativa (iPhone)': 'native (iPhone)',
    'App de iPhone': 'iPhone app',
    'simulada (pruebas)': 'simulated (testing)',
    'Lo que todavía no está': 'Not here yet',
    'Lo que conviene saber': 'Worth knowing',
    'Quién lo hace': 'Who makes it',
    'Datos técnicos': 'Technical details',
    'Copiar los datos técnicos': 'Copy the technical details',
    '✓ Copiados': '✓ Copied',
    'Banco de pruebas (Fase 0)': 'Test bench (phase 0)',
    'Comprobar si hay versión nueva': 'Check for a new version',
    'Descargar e instalar': 'Download and install',

    'Contraseña': 'Password',
    'Repítela': 'Repeat it',
    'Desbloquear': 'Unlock',
    'Descifrando…': 'Decrypting…',
    'Creando y cifrando…': 'Creating and encrypting…',
    'Derivando y cifrando…': 'Deriving and encrypting…',
    'Comprobando…': 'Checking…',
    'Descargando…': 'Downloading…',
    'Las dos contraseñas no son iguales.': 'The two passwords are not the same.',
    'Con esta contraseña se cifra todo lo que se guarda en el aparato. Mínimo {0} caracteres, y no hay forma de recuperarla si se te olvida.':
        'This password encrypts everything kept on the device. At least {0} characters, and there is no way to recover it if you forget it.',
    'Koberlet no trae ningún monedero dentro: la cartera la creas tú, y las claves se quedan en este aparato. Nadie más las tiene, así que nadie más puede recuperarlas por ti.':
        'Koberlet ships with no wallet inside: you create it yourself, and the keys stay on this device. Nobody else has them, so nobody else can recover them for you.',
    'La app instalada está usando la bóveda de desarrollo. Esto no debería pasar: no metas aquí ninguna semilla y avísame.': 'The installed app is using the development vault. This should never happen: do not put any seed phrase in here, and tell me.',
    'Apunta estas palabras EN PAPEL y guárdalas donde nadie las vea. Son la cartera entera: quien las tenga se lleva el dinero, y si las pierdes no hay forma de recuperarlo. No se volverán a enseñar.':
        'Write these words down ON PAPER and keep them where nobody can see them. They are the whole wallet: whoever has them takes the money, and if you lose them there is no way to get it back. They will not be shown again.',
    'Apunta estas palabras EN PAPEL. Son esa cartera entera: quien las tenga se lleva su dinero, y si las pierdes no hay forma de recuperarlo.':
        'Write these words down ON PAPER. They are that whole wallet: whoever has them takes its money, and if you lose them there is no way to get it back.',
    'Copiar': 'Copy',
    '✓ Copiada al portapapeles': '✓ Copied to the clipboard',
    'No se pudo copiar': 'Could not copy',
    'No se pudo copiar: selecciónala a mano': 'Could not copy: select it by hand',
    'No se pudo copiar: mantén pulsado el texto': 'Could not copy: press and hold the text',
    'Ya la he apuntado': 'I have written it down',
    'Volver a verlas': 'Show them again',
    'Escribe las dos palabras que te pido, para asegurar que las tienes bien apuntadas.':
        'Type the two words I ask for, to make sure you wrote them down correctly.',
    'Palabra número {0}': 'Word number {0}',
    'Alguna no coincide. Míralas otra vez en el papel.':
        'One of them does not match. Check the paper again.',
    'Importar': 'Import',
    // Importar por clave privada suelta.
    'Semilla o clave privada': 'Seed or private key',
    'O importa una clave privada (64 caracteres)': 'Or import a private key (64 characters)',
    'Importar esa clave': 'Import that key',
    'Una cartera metida por su clave privada no tiene palabras y nunca las tendrá: su única copia de seguridad es esa clave.':
        'A wallet added by its private key has no words and never will: that key is its only backup.',
    'También vale una clave privada suelta, en hexadecimal: se reconoce sola. Ojo, esa cartera no tendrá palabras.':
        'A bare private key in hexadecimal also works: it is recognised on its own. Careful, that wallet will have no words.',
    'Esta cartera se metió por su clave privada: no tiene 12 palabras. Su única copia de seguridad es esa clave.':
        'This wallet was added by its private key: it has no 12 words. That key is its only backup.',
    'Una clave privada son 64 caracteres del 0 al 9 y de la a a la f.':
        'A private key is 64 characters from 0 to 9 and a to f.',
    'Esos 128 caracteres no son una clave privada seguida de su pública.':
        'Those 128 characters are not a private key followed by its public one.',
    'Esa clave no vale: son todo ceros.': 'That key is no good: it is all zeros.',
    'Esa cartera se metió con su clave privada: no tiene palabras.':
        'That wallet was added with its private key: it has no words.',
    'Falta la clave privada.': 'The private key is missing.',
    'Esa cuenta ya está en este aparato, metida con su semilla.':
        'That account is already on this device, added with its seed.',
    'Esa clave privada no vale.': 'That private key is no good.',
    'Eso no es hexadecimal.': 'That is not hexadecimal.',
    'Importar una cartera': 'Import a wallet',
    'Las 12 o 24 palabras de tu semilla, separadas por espacios. Vale la de Chainweaver, eckoWallet o el Koberlet de escritorio: la derivación es la misma.':
        'The 12 or 24 words of your recovery phrase, separated by spaces. One from Chainweaver, eckoWallet or desktop Koberlet works: the derivation is the same.',
    'Contraseña para cifrarla en este aparato': 'Password to encrypt it on this device',
    'Cartera nueva': 'New wallet',
    'Ese código no lleva una cuenta Kadena válida. Repásalo antes de enviar nada.':
        'That code does not contain a valid Kadena account. Check it before sending anything.',
    'En la chain {0} hay {1} KDA y hay que dejar {2} para el gas. Como mucho puedes enviar {3}.':
        'Chain {0} holds {1} KDA and {2} must be left for gas. You can send at most {3}.',
    'La cuenta de destino se creará si no existe todavía.':
        'The destination account will be created if it does not exist yet.',
    'Esta cuenta tiene que existir ya en esa chain; si no, el envío fallará y perderás solo el gas.':
        'This account must already exist on that chain; otherwise the transfer fails and you only lose the gas.',
    'Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.':
        'It still has not appeared in a block. That does not mean it failed: write down the reference and check again later.',
    'Gas gastado: {0}': 'Gas used: {0}',
    'el contrato lo rechazó': 'the contract rejected it',
    'La transacción entró en un bloque pero falló: {0}':
        'The transaction entered a block but failed: {0}',
    'Apunta al código QR de la dirección': 'Point at the address QR code',
    'Cancelar': 'Cancel',
    'No se pudo abrir la cámara: {0}': 'Could not open the camera: {0}',
    'Lo que salga aquí da control TOTAL sobre el dinero de esta cartera. Que no haya nadie mirando, y no lo escribas en ningún chat, correo ni foto.':
        'What appears here gives FULL control over the money in this wallet. Make sure nobody is watching, and never write it into a chat, an email or a photo.',
    'Apúntala en papel. En el móvil no se copia al portapapeles a propósito: otras apps pueden leerlo.':
        'Write it on paper. On the phone it is deliberately not copied to the clipboard: other apps can read it.',
    'Apúntala en papel. Aquí puedes copiarla para llevártela al móvil, pero no la dejes en ningún fichero ni chat.':
        'Write it on paper. Here you can copy it to move it to the phone, but do not leave it in any file or chat.',
    'Añadir otra cartera': 'Add another wallet',
    'Se guarda en la misma bóveda y se abre con la misma contraseña. Cada cartera es de una sola red; la misma semilla puede tener una de Kadena y otra de Ethereum.':
        'It goes in the same vault and opens with the same password. Each wallet belongs to a single network; the same seed can have one on Kadena and another on Ethereum.',
    'Red de esta cartera': 'Network for this wallet',
    // Mensajes que vienen del plugin Kotlin (la bóveda y el actualizador).
    // Llegan en español y se pintan con t(String(e.message)); sin estas líneas,
    // la app en inglés soltaría español justo cuando algo va mal.
    'Falta la contraseña.': 'The password is missing.',
    'Fallo en la bóveda.': 'Vault failure.',
    'No se pudo descargar la actualización.': 'The update could not be downloaded.',
    'El fichero descargado no es un paquete de Android válido.':
        'The downloaded file is not a valid Android package.',
    'El paquete descargado está firmado con otra clave: NO es de DNNS. Se ha borrado.':
        'The downloaded package is signed with a different key: it is NOT from DNNS. It has been deleted.',
    'Ese paquete es más viejo que el instalado; no se instala.':
        'That package is older than the installed one; it will not be installed.',
    'Falta la semilla.': 'The seed is missing.',
    'Falta la cartera.': 'The wallet is missing.',
    'Falta el nombre.': 'The name is missing.',
    'Falta la red.': 'The network is missing.',
    'Falta la chain.': 'The chain is missing.',
    'Falta el destinatario.': 'The recipient is missing.',
    'Falta la dirección de Ethereum.': 'The Ethereum address is missing.',
    'Falta el peaje del puente.': 'The bridge toll is missing.',
    'Falta la cuenta del peaje.': 'The toll account is missing.',
    'Por el puente solo se envía desde una cuenta k:.': 'The bridge only sends from a k: account.',
    'La cuenta del peaje no es válida; el nodo puede estar manipulado.':
        'The toll account is not valid; the node may have been tampered with.',
    'Falta la cantidad.': 'The amount is missing.',
    'Falta qué exportar.': 'It is not clear what to export.',
    'No sé qué es eso que quieres exportar.': 'I do not know what you are trying to export.',
    'Falta el fichero de la copia.': 'The backup file is missing.',
    'El fichero se abre, pero no tiene dentro una cartera de Koberlet.':
        'The file opens, but there is no Koberlet wallet inside it.',
    'No hay ninguna cartera en este aparato.': 'There is no wallet on this device.',
    'Esa cartera ya está metida en este aparato.': 'That wallet is already on this device.',
    'Esa semilla no es válida: repasa las palabras, alguna no cuadra.':
        'That seed is not valid: check the words, one of them does not add up.',
    'Falta la lista de palabras BIP-39.': 'The BIP-39 word list is missing.',
    'La cuenta de origen no es válida.': 'The sending account is not valid.',
    'La cuenta de destino no es válida.': 'The receiving account is not valid.',
    'Los parámetros de cifrado de esta bóveda están por debajo del mínimo de seguridad.':
        'This vault\u2019s encryption parameters are below the security minimum.',
    'Falta la dirección del paquete.': 'The package address is missing.',
    'Falta la huella del paquete.': 'The package fingerprint is missing.',
    'Ese paquete no viene del servidor de DNNS; no se descarga.':
        'That package does not come from the DNNS server; it will not be downloaded.',
    'La huella del paquete descargado no cuadra: se ha descartado.':
        'The downloaded package fingerprint does not match: it has been discarded.',
    // La identificacion sin contrasena. Como se llame en el aparato lo dice el
    // sistema y entra por {0} (ver `biometria.js`): «Face ID» en un iPhone, «la
    // huella» en un movil con lector. Face ID y Touch ID no se traducen.
    'Huella o cara': 'Fingerprint or face',
    'huella': 'fingerprint',
    'la huella': 'fingerprint',
    'la cara': 'face recognition',
    'la huella o la cara': 'fingerprint or face',
    'Abrir con {0}': 'Open with {0}',
    'Firmar con {0}': 'Sign with {0}',
    'Activar {0}': 'Turn on {0}',
    'Dejar de usar {0}': 'Stop using {0}',
    'Contraseña de la cartera (o firma con {0})': 'Wallet password (or sign with {0})',
    'Activada: se te pide {0} en lugar de la contraseña, que se sigue admitiendo siempre.':
        'On: you are asked for {0} instead of the password, which still works at any time.',
    'Para no teclear la contraseña en cada firma. Al activarlo, tu contraseña queda guardada en este móvil, cifrada con una clave del chip que solo se abre con {0}.':
        'So you do not type the password on every signature. Turning it on stores your password on this phone, encrypted with a key in the secure chip that only opens with {0}.',
    'Ver u ocultar la contraseña': 'Show or hide the password',
    // Lo que pone en el dialogo del sistema al identificarse. Lo saca iOS o Android,
    // no la app, pero el texto se le manda ya traducido desde `boveda/nativa.js`.
    'Abre tu cartera': 'Open your wallet',
    'Confirma que eres tú para activarlo': 'Confirm it is you to turn it on',
    'Firma el envío': 'Sign the transfer',
    'Firma el envío entre chains': 'Sign the cross-chain transfer',
    'Firma el envío por el puente': 'Sign the bridge transfer',
    'Firma el permiso del token': 'Sign the token approval',
    'Firma el cambio': 'Sign the swap',
    'Firma el plan de compras': 'Sign the recurring plan',
    'Firma el cambio en el plan': 'Sign the change to the plan',

    // --- WalletConnect: firmar en paginas web de Kadena
    'Firma lo que te pide la web': 'Sign what the website is asking for',
    'Conectar': 'Connect',
    'Lee el código QR que te enseña la web y firma aquí lo que te pida. Mientras esta pantalla esté abierta, Koberlet escucha.':
        'Scan the QR code the website shows you and sign here whatever it asks for. Koberlet listens while this screen is open.',
    'Leer código QR': 'Scan QR code',
    'Pegar enlace': 'Paste link',
    'Enlace aceptado. Esperando a que la web pida la conexión…': 'Link accepted. Waiting for the website to request the connection…',
    'Eso no es un enlace de conexión. Tiene que empezar por «wc:» y lo da la propia web junto al código QR.':
        'That is not a connection link. It must start with "wc:" and the website gives it to you next to the QR code.',
    'Abriendo la conexión…': 'Opening the connection…',
    'Leyendo el enlace…': 'Reading the link…',
    'Listo para leer el código.': 'Ready to scan the code.',
    'No se ha podido abrir la conexión con el servidor de enlace. Comprueba que tienes internet y vuelve a intentarlo; si estás en una wifi de hotel o de oficina, prueba con los datos del móvil.':
        'The connection to the relay server could not be opened. Check that you have internet and try again; if you are on a hotel or office wifi, try your mobile data.',
    'El enlace no ha respondido. Suele ser que el código QR ya había caducado: vuelve a sacarlo en la web, que cambia cada vez, y léelo otra vez.':
        'The link did not respond. Usually the QR code had already expired: show it again on the website —it changes every time— and scan it again.',
    'Esa web quiere firmar de una forma que Koberlet todavía no sabe: {0}. No se ha conectado.':
        'That website wants to sign in a way Koberlet does not know yet: {0}. It has not been connected.',
    'Esa web pide avisos que Koberlet todavía no sabe mandar: {0}. No se ha conectado.':
        'That website asks for events Koberlet does not know how to send yet: {0}. It has not been connected.',
    'Webs conectadas': 'Connected websites',
    'Desconectar': 'Disconnect',
    'Una web quiere conectarse': 'A website wants to connect',
    'El nombre y la dirección los dice la propia web: son una pista, no una prueba de quién es. Conecta solo si acabas de leer su código QR. Conectar no firma nada ni mueve dinero.':
        'The name and address are declared by the website itself: they are a hint, not proof of who it is. Connect only if you have just scanned its QR code. Connecting signs nothing and moves no money.',
    'Conectar con esta cuenta': 'Connect with this account',
    'No tienes ninguna cuenta de Kadena en este aparato.': 'You have no Kadena account on this device.',
    'Conectado.': 'Connected.',
    'Rechazar': 'Reject',
    'Te piden firmar': 'You are asked to sign',
    'No se entiende lo que te piden firmar. No lo firmes.': 'What you are being asked to sign cannot be understood. Do not sign it.',
    'Autorizas mover {0} KDA': 'You authorise moving {0} KDA',
    'de': 'from',
    'a': 'to',
    'Lo que se ejecuta:': 'What it runs:',
    'Otros permisos: {0}': 'Other permissions: {0}',
    'Firmando…': 'Signing…',
    'Firmado y devuelto a la web.': 'Signed and returned to the website.',
    'Falta el comando.': 'The command is missing.',
    'Lo que manda la web no es un comando válido.': 'What the website sent is not a valid command.',
    'Lo que manda la web no parece un comando de Kadena.': 'What the website sent does not look like a Kadena command.',
    'La web no dice con qué clave hay que firmar.': 'The website does not say which key should sign.',
    'La web pide firmar con otra cuenta distinta de la elegida.': 'The website is asking to sign with an account other than the one you chose.',
    'Firmar para una web solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Signing for a website only works in the installed app: here the vault is a development stand-in and does not sign.',
    'El transporte no está arrancado.': 'The connection is not started.',
    'WC_URI_MALA': 'That link is not a valid connection link.',
    // Estos tres van a la WEB, no a la pantalla: son una `kadena_sign_v1` mal
    // formada. Se traducen igual para que quien lea el código sepa qué significan.
    'WC_SIN_CODIGO': 'The signing request carries no Pact code.',
    'WC_SIN_CUENTA': 'The signing request does not say which account signs.',
    'WC_SIN_CHAIN': 'The signing request carries no valid chain.',
    'No hay ninguna cuenta que ofrecer.': 'There is no account to offer.',
    'La web pide firmar con una cuenta que no está en este aparato.': 'The website asks to sign with an account that is not on this device.',
    'Gas, como mucho': 'Gas, at most',
    'No se pudo consultar el lector de este aparato.': 'This device\u2019s reader could not be queried.',
    'La huella solo funciona en la app instalada.': 'Fingerprint only works in the installed app.',
    'Este móvil no admite identificación segura.': 'This phone does not support secure identification.',
    'Este móvil no tiene lector de huella ni reconocimiento facial.': 'This phone has no fingerprint reader or face recognition.',
    'El lector no está disponible ahora mismo.': 'The reader is not available right now.',
    'No hay ninguna huella, cara ni código configurado en este móvil. Añádelo en los ajustes de Android.':
        'There is no fingerprint, face or PIN set up on this phone. Add one in the Android settings.',
    'No se pudo abrir el lector de este móvil. Entra con la contraseña.':
        'This phone’s reader could not be opened. Sign in with your password.',
    'El lector de este móvil no llega al nivel que exige el chip para guardar una contraseña.':
        'This phone\u2019s reader does not reach the level the secure chip requires to store a password.',
    'Android no sabe decir si el lector de este móvil sirve; no se activa por si acaso.':
        'Android cannot tell whether this phone\u2019s reader is good enough; it is not turned on, just in case.',
    'Android pide una actualización de seguridad antes de poder usar el lector.':
        'Android requires a security update before the reader can be used.',
    'La identificación ya no vale en este móvil. Vuelve a activarla con tu contraseña.':
        'Identification is no longer valid on this phone. Turn it on again with your password.',
    'La identificación no está activada.': 'Identification is not turned on.',
    'Se canceló la identificación.': 'Identification was cancelled.',
    'No se pudo identificar.': 'Could not identify you.',
    'No se puede pedir la huella ahora mismo.': 'The fingerprint prompt cannot be shown right now.',
    'No se pudo activar la identificación.': 'Identification could not be turned on.',
    // Sección Carteras
    'Wallets': 'Wallets',
    'Añadir wallet': 'Add wallet',
    'Todavía no tienes ninguna wallet en esta red.': 'You have no wallet on this network yet.',
    'Ver': 'Open',
    'Ver la semilla (12 o 24 palabras)': 'Show the seed (12 or 24 words)',
    'Ver la clave privada': 'Show the private key',
    'Semilla de «{0}» (12 o 24 palabras)': 'Seed of “{0}” (12 or 24 words)',
    'Kadena': 'Kadena',
    'Ethereum': 'Ethereum',
    'Dirección de Ethereum': 'Ethereum address',
    'Kadena (KDA)': 'Kadena (KDA)',
    'Ethereum (ETH)': 'Ethereum (ETH)',
    'Esa red no existe.': 'That network does not exist.',
    'Nombre para reconocerla': 'A name to recognise it by',
    'Nombre': 'Name',
    'O importa una que ya tengas (12 o 24 palabras)':
        'Or import one you already have (12 or 24 words)',
    'Importar esa semilla': 'Import that recovery phrase',
    'Semilla de la cartera nueva': 'Recovery phrase of the new wallet',
    'Cambiar el nombre': 'Rename',
    'Cambiarle el nombre': 'Rename it',
    'El nombre es solo para que la reconozcas tú; no viaja a ninguna parte ni cambia nada de la cadena.':
        'The name is only so you recognise it; it goes nowhere and changes nothing on the chain.',
    'Quitarla de este aparato': 'Remove it from this device',
    'Quitar la cartera': 'Remove the wallet',
    'Quitarla definitivamente': 'Remove it for good',
    'Entiendo: la he apuntado o está vacía': 'I understand: I wrote it down, or it is empty',
    'Si no estás seguro, primero ve a «Ver la semilla» y apúntala. Se puede volver a importar después con esas palabras.':
        'If you are not sure, go to “Show the recovery phrase” first and write it down. It can be imported again later with those words.',
    'Vas a quitar «{0}» de este aparato. Se borra su semilla: si no la tienes apuntada en papel, el dinero que haya en sus cuentas se queda inalcanzable para siempre. Nadie puede recuperarlo, ni tú ni nosotros.':
        'You are about to remove “{0}” from this device. Its recovery phrase is erased: if you have not written it on paper, any money in its accounts is out of reach for ever. Nobody can recover it, neither you nor us.',
    'Guardar una copia': 'Save a backup',
    'Restaurar': 'Restore',
    'Restaurar una copia': 'Restore a backup',
    'Restaurar una copia de seguridad': 'Restore a backup file',
    'Guardar copia': 'Save backup',
    'Descargar copia': 'Download backup',
    'Saca el fichero cifrado de la cartera para guardarlo fuera del móvil. Sale tal cual está aquí: cifrado, y sin la contraseña no lo abre nadie.':
        'Take the encrypted wallet file out to keep it off the phone. It leaves exactly as it is here: encrypted, and without the password nobody opens it.',
    'Descarga el fichero cifrado de esta cartera del navegador.':
        'Download the encrypted file of this browser wallet.',
    'Listo. Guárdala donde no la pierdas, pero recuerda: el fichero sin la contraseña no vale para nada, y la contraseña sin el fichero tampoco.':
        'Done. Keep it somewhere you will not lose it, but remember: the file without the password is useless, and so is the password without the file.',
    'Elige el fichero y escribe la contraseña con la que se guardó. Si ya hay una cartera en este aparato, se aparta antes de tocarla; nunca se borra la única copia que tengas.':
        'Pick the file and type the password it was saved with. If there is already a wallet on this device, it is set aside first; the only copy you have is never deleted.',
    'Fichero de la copia (vault.json)': 'Backup file (vault.json)',
    'Contraseña de esa copia': 'Password of that backup',
    'Elige primero el fichero.': 'Pick the file first.',
    'La copia que de verdad importa son las 12 palabras en papel: valen en cualquier cartera Kadena y no dependen de este programa. El fichero es una comodidad, no un sustituto.':
        'The backup that really matters is the 12 words on paper: they work in any Kadena wallet and do not depend on this program. The file is a convenience, not a replacement.',
    'No se ha podido preguntar el saldo': 'The balance could not be checked',
    'Mi cartera': 'My wallet',
    'Mi cartera KDA': 'My KDA wallet',
    'Mi cartera EVM': 'My EVM wallet',
    'No ha contestado ninguna chain. Mira si tienes conexión (¿modo avión?, ¿wifi sin internet?) y dale a Refrescar. Tu dinero sigue donde estaba: lo que falla es la consulta.':
        'No chain answered. Check your connection (airplane mode? wifi with no internet?) and press Refresh. Your money is still where it was: what failed is the query.',
    'No ha contestado ninguna chain. Mira si tienes conexión (¿modo avión?, ¿wifi sin internet?) y vuelve a probar.':
        'No chain answered. Check your connection (airplane mode? wifi with no internet?) and try again.',
    'Faltan {0} chains por contestar: puede que tengas más de lo que se ve aquí.':
        '{0} chains have not answered: you may have more than what is shown here.',
    'Un monedero de Kadena para el móvil. Las claves se crean en este aparato y se quedan aquí, cifradas con tu contraseña: no hay servidor nuestro que las tenga ni que pueda devolvértelas si las pierdes.':
        'A Kadena wallet for the phone. The keys are created on this device and stay here, encrypted with your password: no server of ours holds them or can give them back if you lose them.',
    'Esto es la maqueta del navegador. Aquí la bóveda es un doble de desarrollo que guarda en el propio navegador: sirve para ver cómo queda la app, no para guardar dinero.':
        'This is the browser mock-up. Here the vault is a development stand-in that stores inside the browser itself: it is for seeing how the app looks, not for keeping money.',
    'El Koberlet de escritorio hace además esto. Se irá portando al móvil, y cada parte aparecerá cuando funcione de verdad, no antes.':
        'Desktop Koberlet also does the following. It will be ported to the phone, and each part will show up when it actually works, not before.',
    'Comprar en las preventas de Smart Pacts.': 'Buy into Smart Pacts presales.',
    // Sección DCA
    // Plan de compras nuevo (DCA).
    'Plan nuevo': 'New plan',
    'Entregas': 'You pay',
    'Compras': 'You buy',
    'Bote inicial': 'Starting pot',
    'Cuota por compra': 'Amount per buy',
    'Cada': 'Every',
    'Deslizamiento máximo': 'Maximum slippage',
    'Crear el plan': 'Create the plan',
    'Firmar y crear': 'Sign and create',
    'Ver mis planes': 'See my plans',
    'Cambiar el sentido': 'Swap the direction',
    '1 semana': '1 week',
    '{0} semanas': '{0} weeks',
    '1 día': '1 day',
    '{0} días': '{0} days',
    '1 hora': '1 hour',
    '{0} horas': '{0} hours',
    '{0} minutos': '{0} minutes',
    'No se pudo leer tu saldo de {0} en la chain 2.': 'Could not read your {0} balance on chain 2.',
    'Tienes {0} {1} en la chain 2.': 'You have {0} {1} on chain 2.',
    'Escribe el bote y la cuota para ver cuántas compras salen.':
        'Enter the pot and the amount per buy to see how many buys come out.',
    'Salen {0} compras de {1} {2}, una cada {3}: {4} en total. El servicio se lleva el 0,5 % de cada compra, unos {5} {2}.':
        'That is {0} buys of {1} {2}, one every {3}: {4} in total. The service takes 0.5 % of each buy, about {5} {2}.',
    'Escribe el bote y la cuota.': 'Enter the pot and the amount per buy.',
    'La cuota no puede ser mayor que el bote.': 'The amount per buy cannot be larger than the pot.',
    'Cada compra tiene que ser de al menos {0} {1}.': 'Each buy has to be at least {0} {1}.',
    'Se ingresa el bote entero ({0} {1}) en el contrato ahora mismo. Lo que no se llegue a gastar se recupera al cerrar el plan.':
        'The whole pot ({0} {1}) goes into the contract right now. Whatever is left unspent comes back when you close the plan.',
    '✓ Plan creado y confirmado en la cadena.': '✓ Plan created and confirmed on the chain.',
    'Un plan de compras solo se puede crear a nombre de la propia cartera.':
        'A buying plan can only be created in the wallet\u2019s own name.',
    'Entre compra y compra tienen que pasar de 5 minutos a un año.':
        'Between buys there has to be from 5 minutes to a year.',
    'El deslizamiento va de 0 a 50 %.': 'Slippage goes from 0 to 50 %.',
    'Falta el sentido de la compra.': 'The buying direction is missing.',
    'Falta cada cuánto se compra.': 'How often it buys is missing.',
    'Falta el deslizamiento.': 'The slippage is missing.',
    'Los planes de compra son de Kadena: elige una cartera de Kadena.':
        'Buying plans are on Kadena: pick a Kadena wallet.',
    'Crear un plan de compras solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Creating a buying plan only works in the installed app: here the vault is a development stand-in and does not sign.',
    'Compras periódicas': 'Recurring buys',
    'El contrato está parado: ahora mismo no compra ningún plan.':
        'The contract is paused: no plan is buying right now.',
    'No tienes ningún plan de compras.': 'You have no buying plans.',
    'No se pudieron leer tus planes de compra.': 'Your buying plans could not be read.',
    'Queda en el bote': 'Left in the pot',
    'Compras que quedan': 'Buys left',
    'Compras hechas': 'Buys done',
    'Comprado': 'Bought',
    'Siguiente compra': 'Next buy',
    'cada {0} días': 'every {0} days',
    'cada {0} horas': 'every {0} hours',
    'cada {0} minutos': 'every {0} minutes',
    'Activo': 'Active',
    'En pausa': 'Paused',
    'Cerrado': 'Closed',
    'Órdenes de compra y venta a un precio puesto por ti.':
        'Buy and sell orders at a price you set.',
    'NFT': 'NFT',
    'Launch': 'Launch',
    'DCA': 'DCA',
    'Órdenes': 'Orders',
    'Puente': 'Bridge',
    // Sección Mercado: el cambiador
    'Leyendo el mercado…': 'Reading the market…',
    'Ahora mismo no hay ningún par con fondo suficiente en este mercado.':
        'Right now there is no pair with enough depth in this market.',
    'Mueves el precio': 'You move the price by',
    'Comisión de red (gas)': 'Network fee (gas)',
    'la paga Koberlet': 'paid by Koberlet',
    'Esa acción sobre el plan no va por la gasolinera.':
        'That action on the plan does not go through the gas station.',
    'Esta operación no cabe en el gas que paga la gasolinera.':
        'This operation does not fit within the gas the station pays.',
    'La gasolinera solo paga un cambio si lleva la comisión del servicio.':
        'The gas station only pays for a swap if it carries the service fee.',
    'Pasa por KDA: no hay par directo entre esos dos.':
        'It goes through KDA: there is no direct pair between those two.',
    'esta cuenta no tiene KDA en la chain 2, que es donde está el mercado y de donde sale el gas.':
        'this account has no KDA on chain 2, which is where the market is and where the gas comes from.',
    'esta cuenta no tiene ese token en la chain 2.': 'this account does not hold that token on chain 2.',
    'Ese token no responde: su contrato está roto o no existe.':
        'That token does not answer: its contract is broken or does not exist.',
    'Ese token devuelve una precisión rara.': 'That token returns an odd precision.',
    'No se pudo leer el mercado.': 'The market could not be read.',
    'Son el mismo token.': 'They are the same token.',
    'No hay camino entre esos dos tokens en este mercado.':
        'There is no route between those two tokens in this market.',
    'Para el mercado la cuenta Kadena tiene que ser k: y 64 caracteres.':
        'For the market the Kadena account has to be k: plus 64 characters.',
    'Cambio detenido: moverías el precio más del 10 %. En este pool no hay fondo para tanto; prueba con menos cantidad.':
        'Swap stopped: you would move the price by more than 10 %. This pool is not deep enough for that; try a smaller amount.',

    // Sección Mercado y Puente: el cambiador y el viaje
    'Demasiado impacto: más del {0} %. Prueba con menos.':
        'Too much impact: over {0} %. Try less.',
    'La simulación no comprueba el destinatario.':
        'The simulation does not check the recipient.',
    // Elegir cartera (Panel, Mercado, Puente, DCA)
    'Cartera': 'Wallet',
    'Otra dirección': 'Another address',
    'No hay ninguna cartera con cuenta de Kadena.': 'No wallet has a Kadena account.',
    'No hay ninguna cartera con cuenta de Ethereum.': 'No wallet has an Ethereum account.',
    'No tienes tanto en la chain 2.':
        'You do not have that much on chain 2.',
    'Esto SÍ mueve el dinero. El puente no tiene vuelta atrás: si algo va mal, no hay quien lo devuelva.':
        'This one DOES move your money. The bridge has no way back: if something goes wrong, nobody can return it.',
    '✓ Salió de Kadena. Ahora lo tiene que entregar el relayer en Ethereum, y eso tarda.':
        '✓ It left Kadena. Now the relayer has to deliver it on Ethereum, and that takes a while.',
    'Identificador del mensaje': 'Message id',
    'No se pudo sacar el identificador del mensaje; guarda la referencia de arriba.':
        'The message id could not be read; keep the reference above.',
    'El puente solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'The bridge only works in the installed app: here the vault is a development stand-in and does not sign.',
    'Pega la referencia del envío. Tarda entre 2 y 10 minutos.':
        'Paste the transfer reference. It takes between 2 and 10 minutes.',
    'Cambiar': 'Swap',
    'Doy': 'I give',
    'Recibo': 'I get',
    'Darle la vuelta': 'Flip it round',
    'Tienes {0}': 'You have {0}',
    'Cotizando…': 'Getting a quote…',
    'Como mínimo recibes': 'At the very least you get',
    'MÁX': 'MAX',
    'Hacia': 'To',
    'Desde': 'From',
    'Copiar el destinatario': 'Copy the recipient',
    'Cambiar el sentido': 'Switch direction',
    'no se pudo preguntar': 'could not ask',

    // Sección Puente
    'no se pudo preguntar': 'could not ask',
    'Así no saldría: ': 'It would not go through: ',
    'Lo que contestó el nodo': 'What the node answered',
    'esta cuenta no tiene KDA en la chain 2, que es de donde sale el gas y el peaje del puente.':
        'this account has no KDA on chain 2, which is where the gas and the bridge toll come from.',
    'esta cuenta no tiene ese token puenteado en la chain 2.':
        'this account does not hold that bridged token on chain 2.',
    'te faltan KDA en la chain 2. El peaje del puente se paga en KDA, así que tener el token no basta.':
        'you are short of KDA on chain 2. The bridge toll is paid in KDA, so holding the token is not enough.',
    'no hay saldo suficiente para esa cantidad.': 'there is not enough balance for that amount.',
    'el permiso que se firmaría no cubre esta operación; esto es un fallo nuestro, avisa.':
        'the permission that would be signed does not cover this operation; this one is our bug, please tell us.',
    'el nodo lo rechazó.': 'the node rejected it.',
    'Permiso dado al puente': 'Permission given to the bridge',
    'Peaje en Ethereum': 'Toll on Ethereum',
    'ninguno': 'none',
    'No tienes tanto USDC en Ethereum.': 'You do not have that much USDC on Ethereum.',
    'el puente todavía no tiene permiso para coger tu USDC.':
        'the bridge does not have permission to take your USDC yet.',
    '✓ Copiado': '✓ Copied',
    '¿Llegó mi envío a Ethereum?': 'Did my transfer reach Ethereum?',
    'Referencia de la transacción': 'Transaction reference',
    'Comprobar': 'Check',
    'Preguntando…': 'Asking…',
    'Entregado en Ethereum.': 'Delivered on Ethereum.',
    'Todavía no está entregado. Si acabas de enviarlo es normal; si lleva horas, avisa.':
        'Not delivered yet. If you have just sent it that is normal; if it has been hours, tell us.',
    'Respondió {0}': '{0} answered',
    'Cómo funciona un puente, en llano': 'How a bridge works, plainly',
    'Un puente no manda monedas de una cadena a otra: eso no existe. Lo que hace es guardar las tuyas en un lado y crear un vale por la misma cantidad en el otro.':
        'A bridge does not send coins from one chain to another: that does not exist. What it does is hold yours on one side and create a voucher for the same amount on the other.',
    'Cuando traes USDC a Kadena, tu USDC de verdad se queda bloqueado en un contrato de Ethereum y en Kadena aparece kb-USDC. Al volver, se destruye el kb-USDC y se suelta el original.':
        'When you bring USDC to Kadena, your real USDC stays locked in an Ethereum contract and kb-USDC appears on Kadena. On the way back, the kb-USDC is destroyed and the original is released.',
    'Por eso el kb- vale lo que valga la promesa de que ese contrato devolverá el original. Quien controle ese contrato controla tu dinero, y aquí lo controla una sola llave.':
        'That is why kb- is worth whatever the promise that this contract will return the original is worth. Whoever controls that contract controls your money, and here one single key controls it.',
    'Quien mueve los mensajes de una orilla a otra es un relayer, y se le paga en KDA al enviar: ese es el peaje.':
        'The one moving messages from one side to the other is a relayer, and it is paid in KDA when you send: that is the toll.',
    'Esa ruta del puente no existe.': 'That bridge route does not exist.',
    'La cantidad tiene que ser mayor que cero.': 'The amount has to be greater than zero.',
    'La dirección de Ethereum tiene que ser 0x y 40 caracteres.':
        'The Ethereum address has to be 0x plus 40 characters.',
    'Para el puente la cuenta Kadena tiene que ser k: y 64 caracteres.':
        'For the bridge the Kadena account has to be k: plus 64 characters.',
    'No se pudo leer el peaje del puente.': 'The bridge toll could not be read.',
    'La cuenta del peaje del puente no es válida (el nodo puede estar manipulado).':
        'The bridge toll account is not valid (the node may be tampered with).',
    'El peaje del puente está fuera de lo razonable; mejor no seguir.':
        'The bridge toll is outside anything reasonable; better not to go on.',
    'Esa referencia de transacción no tiene la forma de una de Kadena.':
        'That transaction reference does not have the shape of a Kadena one.',
    'Esa transacción todavía no está en un bloque, o no es de esta chain.':
        'That transaction is not in a block yet, or it is not from this chain.',
    'Esa transacción falló en Kadena, así que no salió ningún mensaje.':
        'That transaction failed on Kadena, so no message went out.',
    'Esa transacción no devolvió un identificador de mensaje: puede que no fuera un envío por el puente.':
        'That transaction returned no message id: it may not have been a bridge transfer.',
    'El identificador del mensaje tiene que ser 0x y 64 caracteres.':
        'The message id has to be 0x plus 64 characters.',

    // Sección NFT
    'El servicio de piezas no respondió: solo se ven las apuntadas a mano.':
        'The piece service did not answer: only the ones added by hand are shown.',
    'De {0} piezas no se ha podido preguntar a la cadena, así que no se sabe si siguen aquí.':
        'For {0} pieces the chain could not be reached, so there is no telling whether they are still here.',
    'Esta cartera no tiene ninguna cuenta de Kadena.': 'This wallet has no Kadena account.',
    'Buscando tus piezas…': 'Looking for your pieces…',
    'Sobre esta sección': 'About this section',
    'Esta red no tiene ningún servicio que diga qué piezas hay en cada cuenta, así que se apuntan por su identificador y es la cadena la que confirma de quién son. Lo que la cadena no confirme, aquí no se enseña.':
        'This network has no service that says which pieces each account holds, so they are added by their id and the chain is what confirms whose they are. Whatever the chain does not confirm is not shown here.',
    'Mover una pieza todavía no se puede desde el móvil: hace falta firmarla, y esa firma se monta en la parte nativa igual que la de los envíos de KDA. Llegará cuando esté probada.':
        'Moving a piece is not possible from the phone yet: it has to be signed, and that signature is built in the native side just like the one for KDA transfers. It will arrive once it is tested.',
    'Ninguna de las piezas apuntadas está ahora mismo en esta cuenta.':
        'None of the added pieces is in this account right now.',
    'Todavía no hay ninguna pieza apuntada en esta cuenta.':
        'No piece has been added to this account yet.',
    'Tienes {0} unidades': 'You hold {0} units',
    'Quitarla de la lista': 'Remove it from the list',
    'Apuntar una pieza por su identificador': 'Add a piece by its id',
    'Identificador de la pieza': 'Piece id',
    'Comprobar y apuntar': 'Check and add',
    'Preguntando a la cadena…': 'Asking the chain…',
    'Ese identificador de pieza no es válido.': 'That piece id is not valid.',
    'Esta cuenta no tiene esa pieza en esta red.': 'This account does not hold that piece on this network.',
    'No se pudo preguntar a la cadena. Prueba otra vez.': 'The chain could not be reached. Try again.',
    'El descubridor de esta red no es una dirección admitida.':
        'The discovery service for this network is not an allowed address.',

    'Apunta la semilla en papel. Es lo único que recupera la cartera si pierdes el móvil, y nadie más la tiene.':
        'Write the recovery phrase on paper. It is the only thing that brings the wallet back if you lose the phone, and nobody else has it.',
    'La contraseña se pide en cada envío, aunque la cartera esté abierta.':
        'The password is asked for on every transfer, even with the wallet open.',
    'En el móvil la semilla no se copia al portapapeles a propósito: otras apps pueden leerlo.':
        'On the phone the recovery phrase is deliberately not copied to the clipboard: other apps can read it.',
    'Una transferencia en la cadena no se puede deshacer ni reclamar a nadie.':
        'A transfer on the chain cannot be undone, and there is nobody to claim it from.',
    'DNNS.es — Antonio Morillo. Software libre, licencia Apache-2.0.':
        'DNNS.es — Antonio Morillo. Free software, Apache-2.0 licence.',
    'Koberlet no está asociado a Kadena Eco: es un monedero independiente para la red de la comunidad.':
        'Koberlet is not affiliated with Kadena Eco: it is an independent wallet for the community network.',
    'La app lo mira sola cada vez que se abre; aquí puedes forzarlo.':
        'The app checks by itself every time it opens; here you can force it.',
    'En el navegador no hay nada que instalar: basta con recargar la página.':
        'In the browser there is nothing to install: just reload the page.',
    // Solo salen en la compilacion de Google Play, donde actualiza la tienda.
    'Esta versión se actualiza sola desde Google Play.':
        'This version updates itself from Google Play.',
    'Esta versión se actualiza desde Google Play.':
        'This version is updated from Google Play.',
    // Y estas en la de iPhone, donde actualiza TestFlight o la App Store.
    'Esta versión se actualiza sola desde TestFlight o la App Store.':
        'This version updates itself from TestFlight or the App Store.',
    'Esta versión se actualiza desde TestFlight o la App Store.':
        'This version is updated from TestFlight or the App Store.',
    'No se pudo comprobar: sin conexión con el servidor de descargas.':
        'Could not check: no connection to the download server.',
    'Estás al día: versión {0}.': 'You are up to date: version {0}.',
    'Hay una versión nueva: {0} (tienes la {1}).': 'There is a new version: {0} (you have {1}).',
    'Confirma la instalación en el aviso de Android': 'Confirm the install in the Android prompt',
    'Por el canal nativo de Android (CapacitorHttp): sin CORS y con tiempo de espera de verdad.':
        'Through the native Android channel (CapacitorHttp): no CORS and real timeouts.',
    'Por el navegador (fetch). En el móvil van por el canal nativo.':
        'Through the browser (fetch). On the phone they go through the native channel.',

    // Mensajes de error: se lanzan en español y se traducen al pintarlos.
    'No hay ninguna cartera creada en este navegador.':
        'There is no wallet created in this browser.',
    'Esa cartera no existe.': 'That wallet does not exist.',
    'Ponle un nombre.': 'Give it a name.',
    'Es la única cartera que hay. Para empezar de cero, usa borrar todo.':
        'It is the only wallet there is. To start from scratch, use erase everything.',
    'Los envíos solo funcionan en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Transfers only work in the installed app: here the vault is a development stand-in and does not sign.',
    'Esa copia viene de la app del móvil y aquí no se puede abrir: el navegador cifra de otra forma. Impórtala en el móvil.':
        'That backup comes from the phone app and cannot be opened here: the browser encrypts differently. Import it on the phone.',
    'Esa cartera ya está metida en este navegador.': 'That wallet is already in this browser.',
    'La bóveda de desarrollo no se ejecuta dentro de la app instalada.':
        'The development vault does not run inside the installed app.',
    'El nodo no devolvio un cut reconocible.': 'The node did not return a recognisable cut.',
};

let actual = null;              // se calcula la primera vez que se pide

/** Lo elegido: 'es' | 'en' | 'sistema'. */
export function idiomaElegido() {
    try {
        const v = localStorage.getItem(LLAVE);
        return VALIDOS.includes(v) ? v : 'sistema';
    } catch (_) {
        return 'sistema';
    }
}

/** El que se está usando de verdad: 'es' | 'en'. */
export function idiomaActual() {
    if (actual) return actual;
    const e = idiomaElegido();
    if (e !== 'sistema') { actual = e; return actual; }
    // Del móvil. Cualquier cosa que no sea inglés cae en español, que es el
    // idioma en el que está escrita la app.
    const del = (navigator.language || 'es').toLowerCase();
    actual = del.startsWith('en') ? 'en' : 'es';
    return actual;
}

export function fijarIdioma(v) {
    if (!VALIDOS.includes(v)) return;
    try { localStorage.setItem(LLAVE, v); } catch (_) { /* navegación privada */ }
    actual = null;
    document.documentElement.lang = idiomaActual();
}

/**
 * Traduce. `t('Chain {0}', 3)` rellena los huecos.
 * Lo que no esté traducido sale tal cual, en español.
 */
export function t(texto, ...datos) {
    const base = idiomaActual() === 'en' ? (EN[texto] ?? texto) : texto;
    if (!datos.length) return base;
    return base.replace(/\{(\d+)\}/g, (crudo, i) => (datos[i] !== undefined ? String(datos[i]) : crudo));
}

export function arrancarIdioma() {
    document.documentElement.lang = idiomaActual();
}

/**
 * Con qué reglas se escriben los números y las fechas.
 *
 * No es un adorno: en español «0,0045» es cuatro milésimas y pico, y en inglés
 * esa misma coma se lee como separador de miles. Un saldo mal puntuado en un
 * monedero es un saldo malentendido.
 */
export function locale() {
    return idiomaActual() === 'en' ? 'en-GB' : 'es-ES';
}
