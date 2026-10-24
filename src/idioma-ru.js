// Koberlet Android - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

// RUSO. La clave es la frase ESPAÑOLA, igual que en `idioma.js`: ese fichero
// manda, y este solo trae el otro lado de cada frase.
//
// Lo que falte aquí NO sale en español: `t()` lo busca antes en inglés (ver el
// comentario de arriba de `idioma.js`). Quien usa la app en ruso es mucho más
// probable que lea inglés que castellano.
//
// Las políticas de uso NO están aquí a propósito: son texto legal y solo hay
// versión española e inglesa, que son las que podemos responder (ver
// `politicas.js`).
//
// Pedido por un usuario del grupo de Telegram el 24/10/2026. La traducción está
// pendiente de que la repase alguien que hable ruso; hasta entonces, cuidado con
// dar por buena una frase de las pantallas que mueven dinero.

export const RU = {
    // --- Secciones y navegación
    'Panel': 'Панель',
    'Carteras': 'Кошельки',
    'Seguridad': 'Безопасность',
    'Red': 'Сеть',
    'Mercado': 'Рынок',
    'Ajustes': 'Настройки',
    'Info': 'О приложении',
    'Más': 'Ещё',
    'Cerrar': 'Закрыть',
    'Volver': 'Назад',
    'Atrás': 'Назад',
    'Mejor no': 'Отмена',
    'Guardar': 'Сохранить',
    'Mostrar': 'Показать',
    'Ocultar': 'Скрыть',
    'Refrescar': 'Обновить',
    'Continuar': 'Продолжить',
    'Comprobar': 'Проверить',
    'Cargando…': 'Загрузка…',
    'Consultando…': 'Загрузка…',
    'Consultando el saldo…': 'Проверяем баланс…',

    // --- Primer uso
    'Primer uso': 'Первый запуск',
    'Todavía no hay ninguna cartera': 'Кошелька пока нет',
    'Crear una cartera nueva': 'Создать новый кошелёк',
    'Ya tengo una: importarla': 'У меня уже есть: импортировать',
    'Desbloquear': 'Разблокировать',
    'Tu monedero multi-cadena': 'Ваш кошелёк для нескольких сетей',
    'Ver una cuenta sin entrar': 'Посмотреть счёт, не входя',
    'Restaurar desde una copia de seguridad': 'Восстановить из резервной копии',
    'Cifrado local AES-256': 'AES-256, шифрование на этом устройстве',
    'Solo mira el saldo en la cadena. No abre tu cartera ni toca nada.':
        'Только читает баланс из блокчейна. Не открывает ваш кошелёк и ничего не меняет.',
    'Contraseña de la cartera': 'Пароль кошелька',
    'Contraseña de la bóveda': 'Пароль хранилища',
    'Crear la cartera': 'Создать кошелёк',
    'Tu semilla de recuperación': 'Ваша фраза восстановления',
    'Comprobación': 'Проверка',
    'Contraseña incorrecta.': 'Неверный пароль.',
    'La cartera está bloqueada.': 'Кошелёк заблокирован.',

    // --- Panel
    'Copiar dirección': 'Копировать адрес',
    '✓ Copiada': '✓ Скопировано',
    'Mostrar código QR para recibir': 'Показать QR-код для получения',
    'Últimos movimientos': 'Последние операции',
    'Cuándo': 'Когда',
    'No consta': 'Не указано',
    'Bloque': 'Блок',
    'De': 'От',
    'Esta cuenta': 'Этот счёт',
    'Sale de esta chain: es la primera mitad de un envío entre chains. La otra mitad aparece en la chain de destino.': 'Уходит из этого чейна: это первая половина перевода между чейнами. Вторая половина появится в чейне получателя.',
    'Por lo que se ve, esto es el gas: lo que cobra el minero por meter tu envío en un bloque. Va aparte del envío.': 'Судя по всему, это газ: плата майнеру за включение вашего перевода в блок. Он идёт отдельно от перевода.',
    'Clave de la transacción': 'Ключ транзакции',
    'Copiar la clave': 'Копировать ключ',
    'Verlo en el explorador': 'Посмотреть в обозревателе',
    'No se pudieron leer los movimientos: ': 'Не удалось прочитать операции: ',
    'Consultar otra cuenta': 'Проверить другой счёт',
    'Cuenta Kadena': 'Счёт Kadena',
    'Consultar saldo': 'Проверить баланс',
    'Recibido': 'Получено',
    'Enviado': 'Отправлено',
    // Panel
    'Mis carteras': 'Мои кошельки',
    'Enviar': 'Отправить',
    'Recibir': 'Получить',
    'Puenteado': 'Через мост',
    'no se sabe': 'неизвестно',
    'Detalle de la cartera': 'Подробности кошелька',
    'No se pudo consultar: ': 'Не удалось запросить: ',
    'No se pudo generar el código: ': 'Не удалось создать код: ',
    'Total': 'Всего',
    'Chain {0}': 'Чейн {0}',
    '{0} · suma de {1} chains': '{0} · в сумме по {1} чейнам',
    'Esta cuenta todavía no tiene KDA. Es normal en una cartera recién creada.':
        'На этом счёте пока нет KDA. Для только что созданного кошелька это нормально.',
    'Esa cuenta no es válida para Kadena.': 'Это недействительный счёт Kadena.',
    'Sin KDA en ninguna de las 20 chains.': 'Нет KDA ни в одном из 20 чейнов.',
    'Saldos de las redes EVM: pendiente de la Fase 5.': 'Балансы сетей EVM: появятся на этапе 5.',
    'Esta cuenta todavía no tiene movimientos.': 'По этому счёту пока нет операций.',

    // --- Envío
    'k:…': 'k:…',
    'Hasta': 'В чейн',
    'El destino es esta misma cuenta y la misma chain: no tiene sentido y pagarías gas para nada.':
        'Получатель — тот же счёт и тот же чейн: смысла нет, а газ вы заплатите впустую.',
    'Entre chains solo se puede enviar a una cuenta k:: hace falta saber la llave de quien recibe.':
        'Между чейнами можно отправлять только на счёт k:: нужно знать ключ получателя.',
    'Entre chains solo se puede enviar a una cuenta k:.': 'Между чейнами можно отправлять только на счёт k:.',
    'De una chain a otra son dos pasos y tarda un par de minutos. No cierres la app hasta que diga que ha llegado; si se corta, el dinero no se pierde: se queda a medio camino y se puede rematar después con la referencia.':
        'Перевод из чейна в чейн идёт в два шага и занимает пару минут. Не закрывайте приложение, пока оно не скажет, что перевод дошёл; если он прервётся, деньги не потеряются: они останутся на полпути, и их можно будет довести до конца позже по номеру операции.',
    '✓ Ha llegado a la chain {0}.': '✓ Дошло до чейна {0}.',
    'El dinero salió de la chain {0} pero el segundo paso no ha entrado todavía. No se ha perdido: se queda a medio camino y se puede rematar con esta referencia, desde aquí o desde el escritorio.':
        'Деньги ушли из чейна {0}, но второй шаг пока не прошёл. Они не потеряны: они на полпути, и операцию можно завершить по этому номеру — здесь или в версии для компьютера.',
    'La prueba del primer paso todavía no está lista. El dinero no se ha perdido: prueba otra vez en un minuto.':
        'Доказательство первого шага пока не готово. Деньги не потеряны: попробуйте ещё раз через минуту.',
    'Origen y destino son la misma chain.': 'Отправитель и получатель в одном чейне.',
    'Esa chain no existe.': 'Такого чейна нет.',
    'Falta la chain de destino.': 'Не указан чейн получателя.',
    'Enviar desde la chain': 'Отправить из чейна',
    'Falta la acción.': 'Не указано действие.',
    'Falta el plan.': 'Не указан план.',
    'Cómo está protegida': 'Как защищён кошелёк',
    'Cifrado': 'Шифрование',
    'AES-256 en este aparato': 'AES-256 на этом устройстве',
    'AES-256 en el navegador': 'AES-256 в браузере',
    'Huella o cara': 'Отпечаток или лицо',
    'Se cierra sola': 'Блокируется сам',
    'Nunca': 'Никогда',
    'Activada': 'Включено',
    'Sin activar': 'Не настроено',
    'No disponible': 'Недоступно',
    'No se pudo consultar': 'Не удалось проверить',
    'La contraseña no se guarda en ningún sitio: sin ella no hay forma de abrir la bóveda, tampoco para nosotros.':
        'Пароль нигде не хранится: без него открыть хранилище невозможно — и нам тоже.',
    'Tus claves': 'Ваши ключи',
    'Lo que salga aquí da control TOTAL sobre el dinero de esa cartera. Que no haya nadie mirando, y no lo escribas en ningún chat, correo ni foto.':
        'То, что здесь появится, даёт ПОЛНЫЙ контроль над деньгами этого кошелька. Убедитесь, что никто не смотрит, и никогда не пишите это в чате, в письме и не фотографируйте.',
    'Todavía no hay ninguna cartera en este aparato.': 'На этом устройстве пока нет ни одного кошелька.',
    'Ver la semilla': 'Показать фразу восстановления',
    'Clave privada · {0}': 'Приватный ключ · {0}',
    'Esta cartera se metió por su clave privada: no tiene palabras que enseñar.':
        'Этот кошелёк добавлен по приватному ключу: показывать слова нечего.',
    'Parar': 'Остановить',
    'Reanudar': 'Возобновить',
    'Recargar': 'Пополнить',
    'Firmar': 'Подписать',
    'Cuánto añades al bote, en {0}': 'Сколько добавить в банк, в {0}',
    'El plan deja de comprar. El bote se queda donde está y puedes reanudarlo cuando quieras.':
        'План перестаёт покупать. Банк остаётся на месте, и вы можете возобновить план когда захотите.',
    'El plan vuelve a comprar, y la cuenta para la siguiente compra empieza ahora.':
        'План снова начинает покупать, и отсчёт до следующей покупки начинается сейчас.',
    'Se ingresan {0} {1} más en el contrato ahora mismo.': 'Прямо сейчас в контракт вносится ещё {0} {1}.',
    'Se cierra el plan y te devuelve {0} {1} a tu cuenta. Un plan cerrado no se reabre: para seguir comprando habría que crear otro.':
        'План закрывается, и {0} {1} возвращаются на ваш счёт. Закрытый план снова не открыть: чтобы продолжать покупки, нужно создать новый.',
    '✓ Plan parado.': '✓ План остановлен.',
    '✓ Plan reanudado.': '✓ План возобновлён.',
    '✓ Bote recargado.': '✓ Банк пополнен.',
    '✓ Plan cerrado. El bote que quedaba vuelve a tu cuenta.':
        '✓ План закрыт. Остаток банка возвращается на ваш счёт.',
    'Ese plan no es de esta cartera.': 'Этот план не принадлежит этому кошельку.',
    'El identificador del plan no vale.': 'Неверный идентификатор плана.',
    'Esa acción sobre el plan no existe.': 'Такого действия с планом не существует.',
    'Tocar un plan de compras solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Менять план покупок можно только в установленном приложении: здесь хранилище — это заглушка для разработки, и она не подписывает.',
    'Agenda': 'Адресная книга',
    'Todavía no has guardado ninguna cuenta. Se guardan desde la pantalla de enviar.':
        'Вы пока не сохранили ни одного счёта. Они сохраняются на экране отправки.',
    'Salen en el desplegable de «Cuenta de destino» al enviar.':
        'Они появляются в списке «Счёт получателя» при отправке.',
    'Quitar de la agenda': 'Убрать из адресной книги',
    'Escribir la cuenta a mano': 'Ввести счёт вручную',
    'La agenda está vacía: escribe la cuenta y guárdala':
        'Адресная книга пуста: введите счёт и сохраните его',
    'Guardar esta cuenta en la agenda': 'Сохранить этот счёт в адресной книге',
    'Nombre para esta cuenta': 'Название для этого счёта',
    'Casa de cambio, Juan…': 'Биржа, Иван…',
    'Guardada en la agenda como «{0}».': 'Сохранено в адресной книге как «{0}».',
    'Esa cuenta la tienes guardada como «{0}».': 'Этот счёт у вас сохранён как «{0}».',
    'Ponle un nombre a la cuenta.': 'Дайте счёту название.',
    'El nombre es demasiado largo.': 'Название слишком длинное.',
    'Esa cuenta no es válida para Kadena.': 'Этот счёт недействителен для Kadena.',
    'La agenda está llena.': 'Адресная книга заполнена.',
    'El código pide {0} KDA en la chain {1}. Repásalo: lo envías tú.':
        'Код запрашивает {0} KDA в чейне {1}. Проверьте: отправляете вы.',
    'El código pide cobrar en la chain {0}.': 'Код запрашивает оплату в чейне {0}.',
    'Cantidad (opcional)': 'Сумма (необязательно)',
    'Copiar el QR': 'Копировать QR',
    '✓ QR copiado': '✓ QR скопирован',
    'Aquí no se puede copiar la imagen: copiado el cobro en texto':
        'Здесь нельзя скопировать картинку: запрос скопирован как текст',
    'No se pudo copiar: haz una captura de pantalla': 'Не удалось скопировать: сделайте снимок экрана',
    'El código pide {0} KDA en la chain {1}.': 'Код запрашивает {0} KDA в чейне {1}.',

    'El código pide {0} KDA en la chain {1} — son {2} al cambio de ahora ({3} por KDA). Si el precio se mueve antes de que te paguen, cobrarás esos KDA, no ese importe.':
        'Код запрашивает {0} KDA в чейне {1} — это {2} по текущему курсу ({3} за KDA). Если курс изменится до того, как вам заплатят, вы получите именно эти KDA, а не эту сумму.',
    'Ojo: no se ha podido actualizar el cambio desde hace {0} min.':
        'Внимание: курс не обновлялся {0} мин.',
    'k:… o el nombre de una cuenta': 'k:… или название счёта',
    'Tokens puestos a mano': 'Токены, добавленные вами',
    'Los de la red {0}. Cada red lleva los suyos.': 'Токены сети {0}. У каждой сети свои.',
    'Todavía no has añadido ninguno.': 'Вы пока не добавили ни одного.',
    'Quitar este token': 'Убрать этот токен',
    'Importar un token': 'Импортировать токен',
    'Para ver en el panel un token que la app no trae de fábrica.':
        'Чтобы видеть на панели токен, которого нет в приложении по умолчанию.',
    'Contrato del token': 'Контракт токена',
    'Símbolo': 'Символ',
    'Añadir el token': 'Добавить токен',
    'Un token añadido a mano solo se VE: desde el móvil se envía KDA, no tokens. El contrato que pongas no llega a firmar nada.':
        'Добавленный вручную токен только ОТОБРАЖАЕТСЯ: с телефона отправляется KDA, а не токены. Указанный вами контракт ничего не подписывает.',
    'Y ojo: un contrato cualquiera puede devolver el saldo que le dé la gana. Añade solo los que conozcas; ver un número aquí no prueba que tengas ese dinero.':
        'И будьте внимательны: любой контракт может вернуть какой угодно баланс. Добавляйте только те, которые знаете; число на экране не доказывает, что эти деньги ваши.',
    'puesto por ti': 'добавлено вами',
    'visto en tus movimientos': 'замечено в ваших операциях',
    'El contrato se escribe como n_algo.NOMBRE: letras, números, guion y guion bajo, con al menos un punto.':
        'Контракт пишется как n_что-то.ИМЯ: буквы, цифры, дефис и подчёркивание, и хотя бы одна точка.',
    'El símbolo son 10 letras o números como mucho.': 'Символ — не более 10 букв или цифр.',
    'Ese símbolo es el de la moneda de la red: ponle otro.': 'Этот символ принадлежит основной монете сети: выберите другой.',
    'Ese contrato ya está en la lista.': 'Этот контракт уже в списке.',
    'Ya hay un token con ese símbolo.': 'Токен с таким символом уже есть.',
    'Moneda': 'Валюта',
    'Moneda de referencia': 'Валюта для пересчёта',
    'Solo cambia en qué moneda se te enseña lo que vale. El dinero sigue siendo KDA.':
        'Меняется только валюта, в которой показывается стоимость. Деньги остаются в KDA.',
    'Euro': 'Евро',
    'Dólar estadounidense': 'Доллар США',
    'Libra esterlina': 'Фунт стерлингов',
    'Franco suizo': 'Швейцарский франк',
    'El código lleva solo tu cuenta: quien pague elige cuánto y en qué chain.':
        'В коде только ваш счёт: тот, кто платит, сам выбирает сумму и чейн.',
    'Chain': 'Чейн',
    'Cuenta de destino': 'Счёт получателя',
    'Cantidad en {0}': 'Сумма в {0}',
    'Escanear un código QR': 'Сканировать QR-код',
    'Máx.': 'Макс.',
    'Todo lo que hay en esta chain, dejando lo justo para el gas': 'Всё, что есть в этом чейне, оставив ровно столько, сколько нужно на газ',
    'Confirmar el envío': 'Подтвердить перевод',
    'Firmar y enviar': 'Подписать и отправить',
    'Envías': 'Вы отправляете',
    'Desde': 'Откуда',
    'A': 'Куда',
    'Repasa esto con calma: una transferencia en la cadena no se puede deshacer ni reclamar a nadie.':
        'Проверьте всё внимательно: перевод в блокчейне нельзя отменить, и спросить за него не с кого.',
    'Esa cuenta de destino no es válida para Kadena.': 'Этот счёт получателя недействителен для Kadena.',
    'Escribe una cantidad mayor que cero.': 'Введите сумму больше нуля.',
    'Firmar en el móvil': 'Подписать на телефоне',
    'Políticas de uso': 'Условия использования',
    'Antes de empezar, lee esto': 'Прежде чем начать, прочитайте это',
    'He leído las políticas y las acepto': 'Я прочитал условия и принимаю их',
    'Aceptar y continuar': 'Принять и продолжить',
    'Se pueden volver a leer en Más, sin conexión.':
        'Их можно перечитать в разделе «Ещё», без интернета.',
    'Versión de las políticas: {0}': 'Версия условий: {0}',
    'Aceptaste la versión {0}.': 'Вы приняли версию {0}.',
    'Todavía no hay ninguna versión aceptada en este aparato.':
        'На этом устройстве пока не принята ни одна версия.',
    'Comprobar que saldría bien': 'Проверить, пройдёт ли операция',
    'No cabe el gas: cambiando eso te quedarías sin con qué pagar la transacción. Con el gas de ahora puedes cambiar como mucho {0} ETH.':
        'На газ не хватит: обменяв столько, вам будет нечем заплатить за транзакцию. При нынешней цене газа можно обменять не больше {0} ETH.',
    'El gas de este cambio ronda {0} ETH y sale de este mismo saldo.':
        'Газ за этот обмен — около {0} ETH, и он берётся из этого же баланса.',
    'No hay ETH suficiente para pagar el gas de esta transacción. Deja algo de ETH sin gastar.':
        'Недостаточно ETH, чтобы заплатить за газ этой транзакции. Оставьте немного ETH нетронутым.',
    'Esa transacción ya se había mandado. Mira el saldo antes de repetirla.':
        'Эта транзакция уже была отправлена. Проверьте баланс, прежде чем повторять.',
    'Hay otra transacción tuya en cola y esta paga menos. Espera a que entre la anterior.':
        'У вас в очереди есть другая транзакция, а эта платит меньше. Дождитесь, пока пройдёт предыдущая.',
    'La transacción necesita más gas del que se le ha puesto.':
        'Транзакции нужно больше газа, чем ей выделено.',
    'Pon cuánto quieres enviar.': 'Укажите, сколько хотите отправить.',
    'Comprobando que saldría bien…': 'Проверяем, пройдёт ли операция…',
    'Peaje del puente: {0} KDA': 'Сбор моста: {0} KDA',
    'Ese par no se cambia de una vez. Pasa por USDC: primero a USDC y luego a lo que quieras.':
        'Эта пара не обменивается напрямую. Пройдите через USDC: сначала в USDC, а потом во что нужно.',
    'Firmar con la contraseña': 'Подписать паролем',
    'No se pudo abrir el mercado de Ethereum.': 'Не удалось открыть рынок Ethereum.',
    'Esto SÍ cambia el dinero. Como mínimo recibirás {0}; si el pool diera menos, la transacción se cae y solo se pierde el gas.':
        'Это ДЕЙСТВИТЕЛЬНО меняет деньги. Вы получите не меньше {0}; если пул даст меньше, транзакция отменится и потеряется только газ.',
    'Ese camino de cambio no tiene sentido.': 'Этот путь обмена не имеет смысла.',
    'La cuenta del pool no es válida.': 'Счёт пула недействителен.',
    'Falta la cuenta del pool.': 'Не указан счёт пула.',
    'Falta el camino del cambio.': 'Не указан путь обмена.',
    'Cambiar en el mercado solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Обмен на рынке работает только в установленном приложении: здесь хранилище — это заглушка для разработки, и она не подписывает.',
    'Preguntando a Uniswap…': 'Запрашиваем Uniswap…',
    'Comisión del pool': 'Комиссия пула',
    'Comisión de Koberlet ({0} %)': 'Комиссия Koberlet ({0} %)',
    'De lo que das se aparta antes el {0} % para Koberlet: {1} {2}. Va en la misma transacción, así que si el cambio falla no se cobra nada.':
        'Из того, что вы отдаёте, сначала удерживается {0} % для Koberlet: {1} {2}. Это идёт в той же транзакции, поэтому, если обмен не удастся, ничего не спишется.',
    'Esa cantidad es demasiado pequeña para este token.': 'Эта сумма слишком мала для этого токена.',
    'La comisión no puede ser mayor que la parte que le toca.':
        'Комиссия не может быть больше причитающейся доли.',
    'La comisión no puede ser negativa.': 'Комиссия не может быть отрицательной.',
    'La comisión no puede pasar del 1 %.': 'Комиссия не может превышать 1 %.',
    'Koberlet se queda el {0} % de lo que recibes: {1} {2}. Lo aparta el propio Uniswap en la misma transacción, así que si el cambio falla no se cobra nada.':
        'Koberlet удерживает {0} % того, что вы получаете: {1} {2}. Это делает сам Uniswap в той же транзакции, поэтому, если обмен не удастся, ничего не спишется.',
    'El mínimo es lo que se firma: si en el momento del cambio fuera a dar menos, la transacción se cae y solo se pierde el gas. Se tolera un {0} % de diferencia.':
        'Подписывается именно минимум: если в момент обмена вышло бы меньше, транзакция отменится и потеряется только газ. Допускается расхождение {0} %.',
    'No tienes tanto {0}.': 'У вас нет столько {0}.',
    'Primero hay que autorizar el {0} a Uniswap. Son dos transacciones y las dos gastan gas.':
        'Сначала нужно разрешить Uniswap доступ к {0}. Это две транзакции, и обе расходуют газ.',
    'Firmar el cambio': 'Подписать обмен',
    'Autorizar el token': 'Разрешить токен',
    'La autorización entró en un bloque pero falló. No se ha cambiado nada.':
        'Разрешение попало в блок, но не прошло. Ничего не обменялось.',
    'El cambio entró en un bloque pero falló: puede que el precio se moviera más de lo tolerado. El gas se ha pagado igual.':
        'Обмен попал в блок, но не прошёл: возможно, курс сдвинулся сильнее допустимого. Газ всё равно списан.',
    '✓ Cambiado. Mira el saldo en el Panel.': '✓ Обменяно. Проверьте баланс на Панели.',
    'No se sabe a quién habría que autorizar.': 'Неизвестно, кому нужно выдать разрешение.',
    'Falta el cambio que se quiere hacer.': 'Не указан обмен, который нужно сделать.',
    'Falta la comisión del pool.': 'Не указана комиссия пула.',
    'Falta el mínimo que aceptas recibir.': 'Не указан минимум, который вы готовы получить.',
    'Ese cambio no está entre los que sabe hacer la app.':
        'Этот обмен не из тех, которые умеет делать приложение.',
    'Esa comisión de pool no es una de las que se usan.':
        'Такая комиссия пула не используется.',
    'El mínimo no puede ser negativo.': 'Минимум не может быть отрицательным.',
    'Un multicall sin llamadas no hace nada.': 'Multicall без вызовов ничего не делает.',
    'Esa llamada no son bytes enteros.': 'Этот вызов — не целое число байтов.',
    'La cantidad no puede ser negativa.': 'Сумма не может быть отрицательной.',
    'Enviar {0}': 'Отправить {0}',
    'Qué envías': 'Что вы отправляете',
    'Esta cartera no tiene {0} en ninguna chain, así que no hay nada que enviar.':
        'В этом кошельке нет {0} ни в одном чейне, так что отправлять нечего.',
    'En la chain {0} solo hay {1} {2}.': 'В чейне {0} есть только {1} {2}.',
    'Para mandar {0} desde la chain {1} hace falta algo de KDA ahí para el gas, y solo hay {2}.':
        'Чтобы отправить {0} из чейна {1}, там нужно немного KDA на газ, а есть только {2}.',
    'De momento solo el KDA se puede pasar de una chain a otra desde el móvil. Elige la misma chain de destino.':
        'Пока с телефона между чейнами можно переводить только KDA. Выберите тот же чейн получателя.',
    'Ese token no tiene un contrato con forma válida.':
        'У этого токена контракт неверного вида.',
    'Esa cantidad es más pequeña que lo que admite este token.':
        'Эта сумма меньше, чем допускает этот токен.',
    'Falta el contrato del token.': 'Не указан контракт токена.',
    'Falta la cuenta de destino.': 'Не указан счёт получателя.',

    'Desde Ethereum el viaje son dos transacciones: primero autorizar el token y después enviar. Las dos se firman aquí y las dos gastan gas.':
        'Из Ethereum путь состоит из двух транзакций: сначала разрешить токен, потом отправить. Обе подписываются здесь и обе расходуют газ.',
    'Autorizar el token en Ethereum': 'Разрешить токен в Ethereum',
    'Firmar el envío': 'Подписать перевод',
    'Transacción del permiso': 'Транзакция разрешения',
    'La autorización entró en un bloque pero falló. No se ha enviado nada.':
        'Разрешение попало в блок, но не прошло. Ничего не отправлено.',
    'Transacción en Ethereum': 'Транзакция в Ethereum',
    'La transacción entró en un bloque pero falló. El gas se ha pagado igual.':
        'Транзакция попала в блок, но не прошла. Газ всё равно списан.',
    '✓ Salió de Ethereum. Ahora lo tiene que entregar el relayer en Kadena, y eso tarda.':
        '✓ Ушло из Ethereum. Теперь релеер должен доставить это в Kadena, и на это нужно время.',
    'Cuando llegue, aparecerá como kb-{0} en la chain 2 de esa cuenta.':
        'Когда дойдёт, появится как kb-{0} в чейне 2 этого счёта.',
    'En una transacción no hay números negativos.': 'В транзакции не бывает отрицательных чисел.',
    'Lo que se firma son 32 bytes.': 'Подписывается ровно 32 байта.',
    'Clave privada fuera de rango.': 'Приватный ключ вне допустимого диапазона.',
    'No se pudo determinar el recovery id de la firma.':
        'Не удалось определить recovery id подписи.',
    'El valor no puede ser negativo.': 'Значение не может быть отрицательным.',
    'El nonce no puede ser negativo.': 'Nonce не может быть отрицательным.',
    'El límite de gas está fuera de lo razonable.': 'Лимит газа выходит за разумные пределы.',
    'El precio del gas está fuera de lo razonable.': 'Цена газа выходит за разумные пределы.',
    'La propina no puede pasar del precio máximo del gas.':
        'Чаевые не могут превышать максимальную цену газа.',
    'Aquí no hay números negativos.': 'Здесь не бывает отрицательных чисел.',
    'El número no cabe en 32 bytes.': 'Число не помещается в 32 байта.',
    'Eso no es una cantidad.': 'Это не сумма.',
    'Ese token no tiene tantos decimales.': 'У этого токена нет столько знаков после запятой.',
    'El peaje no puede ser negativo.': 'Сбор не может быть отрицательным.',
    'El peaje que dice el contrato es disparatado; no se firma.':
        'Сбор, который называет контракт, абсурден; подписи не будет.',
    'Falta el nonce de la cuenta.': 'Не указан nonce счёта.',
    'Falta el límite de gas.': 'Не указан лимит газа.',
    'Falta el precio del gas.': 'Не указана цена газа.',
    'Falta la propina del gas.': 'Не указаны чаевые за газ.',
    'Esa cartera no es de Ethereum.': 'Этот кошелёк не от Ethereum.',
    'Falta la cuenta de Kadena.': 'Не указан счёт Kadena.',
    'El nodo no devolvió un hash de transacción.': 'Узел не вернул хеш транзакции.',
    'Este iPhone no tiene Face ID ni Touch ID.': 'На этом iPhone нет ни Face ID, ни Touch ID.',
    'No hay ninguna cara ni huella configurada en este iPhone. Añádela en Ajustes.':
        'На этом iPhone не настроено ни лицо, ни отпечаток. Добавьте их в настройках.',
    'Face ID / Touch ID está bloqueado. Desbloquéalo con el código del iPhone.':
        'Face ID / Touch ID заблокирован. Разблокируйте его код-паролем iPhone.',
    'Este iPhone no tiene código. Ponle uno para poder usar la identificación.':
        'На этом iPhone нет код-пароля. Задайте его, чтобы пользоваться биометрией.',
    'Este iPhone no admite identificación segura.':
        'Этот iPhone не поддерживает безопасную биометрию.',
    'No se pudo preparar la protección biométrica.': 'Не удалось настроить биометрическую защиту.',
    'No se pudo leer la contraseña guardada.': 'Не удалось прочитать сохранённый пароль.',
    'La identificación ya no vale en este iPhone. Vuelve a activarla con tu contraseña.':
        'Биометрия больше не действует на этом iPhone. Включите её снова с помощью пароля.',
    'No se puede abrir la hoja de compartir ahora mismo.':
        'Сейчас нельзя открыть меню «Поделиться».',
    'No se pudo preparar la copia.': 'Не удалось подготовить резервную копию.',
    'El peaje no es un número.': 'Сбор — не число.',
    'El contenido de la bóveda no es una cartera de Koberlet.':
        'Содержимое хранилища — не кошелёк Koberlet.',
    'No se pudo derivar la clave de la bóveda.': 'Не удалось получить ключ хранилища.',
    'No se pudo cifrar la bóveda.': 'Не удалось зашифровать хранилище.',
    'El fichero de la bóveda no tiene la forma esperada.':
        'Файл хранилища имеет не тот вид, который ожидался.',
    'La clave pública no tiene la forma esperada.':
        'Публичный ключ имеет не тот вид, который ожидался.',
    'La firma no tiene 64 bytes.': 'Длина подписи не равна 64 байтам.',
    'Historial': 'История',
    'Solo {0} → {1}': 'Только {0} → {1}',
    'Entregado en Ethereum': 'Доставлено в Ethereum',
    'Entregado en Kadena': 'Доставлено в Kadena',
    'Salió de Kadena': 'Ушло из Kadena',
    'Salió de Ethereum': 'Ушло из Ethereum',
    'Esto vino de Ethereum. Cuando el relayer lo entregue, aparece en la chain 2 de esa cuenta de Kadena: aquí no hay nada que comprobar.':
        'Это пришло из Ethereum. Когда релеер доставит перевод, он появится в чейне 2 этого счёта Kadena: здесь проверять нечего.',
    'Lo rechazó el contrato': 'Контракт отклонил это',
    'Sin confirmar': 'Не подтверждено',
    'Mandado al nodo': 'Отправлено на узел',
    'Envíos por el puente': 'Переводы через мост',
    'Todavía no has mandado nada por el puente desde este aparato.':
        'С этого устройства вы пока ничего не отправляли через мост.',
    'Guardado en este aparato. En otro móvil no aparece.':
        'Хранится на этом устройстве. На другом телефоне не появится.',
    'Hacia {0}': 'В {0}',
    'Comprobar si ya llegó': 'Проверить, дошло ли',
    'Entregado en Ethereum. Lo dice {0}.': 'Доставлено в Ethereum. Так сообщает {0}.',
    'Borrar esta lista no deshace ningún envío: lo que pasó en la cadena se queda.':
        'Очистка этого списка не отменяет ни одного перевода: то, что произошло в блокчейне, остаётся.',
    'Borrar el historial': 'Очистить историю',
    'Enviar desde Ethereum': 'Отправить из Ethereum',
    'Dirección de destino': 'Адрес получателя',
    'Esa dirección de destino no es válida para Ethereum.':
        'Этот адрес получателя недействителен для Ethereum.',
    'Ese código no lleva una dirección de Ethereum válida. Repásalo antes de enviar nada.':
        'В этом коде нет действительного адреса Ethereum. Проверьте его, прежде чем что-то отправлять.',
    'El destino es esta misma cuenta: no tiene sentido y pagarías gas para nada.':
        'Получатель — этот же самый счёт: смысла нет, а газ вы заплатите впустую.',
    'Preguntando el gas…': 'Узнаём цену газа…',
    'No cabe el gas: enviando eso te quedarías sin con qué pagar la transacción. Con el gas de ahora puedes enviar como mucho {0} ETH.':
        'На газ не хватит: отправив столько, вам будет нечем заплатить за транзакцию. При нынешней цене газа можно отправить не больше {0} ETH.',
    'Para mandar {0} hace falta ETH en la cuenta para el gas, y con el de ahora harían falta unos {1} ETH.':
        'Чтобы отправить {0}, на счёте нужен ETH на газ, а при нынешней цене понадобится около {1} ETH.',
    'Gas, como mucho': 'Газ, не более',
    'El gas se paga en ETH y es un máximo: lo que no se gaste no se cobra.':
        'Газ платится в ETH, и это максимум: неиспользованное не списывается.',
    'El envío entró en un bloque pero falló. El gas se ha pagado igual.':
        'Перевод попал в блок, но не прошёл. Газ всё равно списан.',
    'Falta qué se envía.': 'Вы не указали, что отправлять.',
    'Ese token no está entre los que sabe enviar la app.':
        'Этот токен не из тех, которые приложение умеет отправлять.',
    'Envío en marcha': 'Перевод выполняется',
    'El último envío': 'Последний перевод',
    'El nodo no contestó a la última consulta. Se sigue intentando.':
        'Узел не ответил на последний запрос. Попытки продолжаются.',
    'Preguntado {0} veces al nodo: todavía no está en un bloque.':
        'Узел опрошен {0} раз: транзакции пока нет в блоке.',
    'Mandar la transacción al nodo': 'Отправить транзакцию на узел',
    'Recoger la prueba para la otra chain': 'Получить доказательство для другого чейна',
    'Entregarlo en la chain de destino': 'Доставить в чейн получателя',
    'Con ella se mira luego en qué quedó, aquí o en el explorador.':
        'По нему можно потом посмотреть, чем всё кончилось — здесь или в обозревателе.',
    'El dinero ha salido de la chain {0}.': 'Деньги ушли из чейна {0}.',
    'Esta es la que se pega abajo, en «¿Llegó mi envío a Ethereum?».':
        'Именно его вставляют ниже, в «Дошёл ли мой перевод до Ethereum?».',
    'Identificador del mensaje (para el explorador)': 'Идентификатор сообщения (для обозревателя)',
    'Para seguirlo en el explorador del puente. Para el comprobador de abajo se usa la referencia.':
        'Чтобы следить за переводом в обозревателе моста. Для проверки ниже используется номер операции.',
    'Ten paciencia: esto suele tardar uno o dos minutos. No cierres la app ni vuelvas a pulsar; sigue en marcha.':
        'Потерпите: обычно это занимает одну-две минуты. Не закрывайте приложение и не нажимайте снова; процесс идёт.',
    'Está tardando más de lo normal. No se ha perdido: sigue preguntando, y aunque se cierre la app queda la referencia para mirarlo luego.':
        'Это занимает больше времени, чем обычно. Перевод не потерян: опросы продолжаются, и даже если приложение закроется, останется номер операции, чтобы проверить позже.',
    'Mandar la transacción a Kadena': 'Отправить транзакцию в Kadena',
    'Esperar a que entre en un bloque': 'Дождаться попадания в блок',
    '✓ Enviado y confirmado en la cadena.': '✓ Отправлено и подтверждено в блокчейне.',

    // --- Seguridad
    'Ver la semilla o una clave privada': 'Показать фразу восстановления или приватный ключ',
    'Qué quieres ver': 'Что вы хотите увидеть',
    'Tu semilla': 'Ваша фраза восстановления',
    'Clave privada': 'Приватный ключ',

    // --- Ajustes
    'Aspecto': 'Внешний вид',
    'Tema': 'Тема',
    'Claro': 'Светлая',
    'Oscuro': 'Тёмная',
    'El del sistema': 'Как в системе',
    'Idioma': 'Язык',
    'Privacidad': 'Приватность',
    'Ocultar los saldos': 'Скрыть балансы',
    'Volver a mostrar los saldos': 'Снова показывать балансы',
    'Copia de seguridad': 'Резервная копия',
    'Abrir copias de seguridad': 'Открыть резервные копии',
    'Bloquear': 'Заблокировать',
    'Bloquear ahora': 'Заблокировать сейчас',
    'Bloquear y salir': 'Заблокировать и выйти',
    'Bloquear sola si no la tocas': 'Блокировать само, если не трогать',
    'Nunca (no recomendado)': 'Никогда (не рекомендуется)',
    '1 minuto': '1 минута',
    'Cuenta igual con la app delante que en segundo plano: el tiempo sin tocarla es tiempo sin tocarla.':
        'Считается одинаково, открыто приложение или свёрнуто: время без касаний — это время без касаний.',
    'Así la cartera se queda abierta hasta que la bloquees a mano o cierres la app del todo.':
        'Так кошелёк остаётся открытым, пока вы не заблокируете его вручную или не закроете приложение совсем.',
    'Versión': 'Версия',
    'Tapa las cantidades en pantalla. No bloquea la cartera ni cambia nada: solo deja de enseñar el dinero.':
        'Скрывает суммы на экране. Кошелёк не блокируется и ничего не меняется: просто деньги больше не показываются.',
    'Guarda o restaura el fichero cifrado de la bóveda.':
        'Сохраняет или восстанавливает зашифрованный файл хранилища.',
    'Cierra la cartera. Para volver a abrirla hará falta la contraseña.':
        'Закрывает кошелёк. Чтобы открыть его снова, понадобится пароль.',

    // --- Red
    'Red a la que se conecta la app': 'Сеть, к которой подключается приложение',
    'Nodos de Kadena': 'Узлы Kadena',
    'La app los mide sola cada diez minutos y usa el más rápido DE LOS QUE VAN AL DÍA. No hay nada que hacer aquí, salvo que quieras poner el tuyo o mandar sobre uno concreto.':
        'Приложение само замеряет их каждые десять минут и использует самый быстрый ИЗ ТЕХ, ЧТО НЕ ОТСТАЮТ. Здесь ничего делать не нужно, если только вы не хотите добавить свой узел или принудительно выбрать конкретный.',
    'Todavía sin medir.': 'Пока не замерено.',
    'en uso': 'используется',
    'no contesta': 'не отвечает',
    'Va {0} bloques atrasado: se aparta aunque sea rápido.':
        'Отстаёт на {0} блоков: исключается, даже если он быстрый.',
    'Al día ({0} bloque(s) del más adelantado).': 'Не отстаёт ({0} блок(ов) от самого передового).',
    'Al día.': 'Не отстаёт.',
    'Usar siempre este': 'Всегда использовать этот',
    'Volver al automático': 'Вернуться к автоматическому выбору',
    'Quitar': 'Убрать',
    'Hay un nodo fijado a mano: se sigue midiendo, pero no se cambia solo aunque otro vaya mejor.':
        'Узел выбран вручную: замеры продолжаются, но сам он не поменяется, даже если другой окажется лучше.',
    'Medido hace {0} s.': 'Замерено {0} с назад.',
    'Medir ahora': 'Замерить сейчас',
    'Midiendo…': 'Замеряем…',
    'Añadir un nodo tuyo': 'Добавить свой узел',
    'Añadir el nodo': 'Добавить узел',
    'Solo https: por http cualquiera en la misma wifi podría cambiarte un saldo o un precio por el camino. Un nodo ve las direcciones que consultas y puede mentirte, pero no puede sacarte las claves: la firma se hace dentro del móvil.':
        'Только https: по http любой в той же сети Wi-Fi мог бы подменить баланс или курс по пути. Узел видит адреса, которые вы запрашиваете, и может вам соврать, но добыть ваши ключи он не может: подпись происходит внутри телефона.',
    'sin altura en la respuesta': 'в ответе нет высоты блока',
    'La dirección del nodo tiene que empezar por https:// y no llevar usuario, ? ni #.':
        'Адрес узла должен начинаться с https:// и не содержать имени пользователя, ? или #.',
    'Ese nodo ya está en la lista.': 'Этот узел уже в списке.',
    'Los nodos de fábrica no se quitan.': 'Встроенные узлы убрать нельзя.',
    '(desactivada por defecto)': '(по умолчанию отключено)',
    '(puesta a mano)': '(добавлено вручную)',
    'Redes puestas a mano': 'Сети, добавленные вручную',
    'Todavía no has añadido ninguna.': 'Вы пока не добавили ни одной.',
    'Quitar esta red': 'Убрать эту сеть',
    'Añadir una red': 'Добавить сеть',
    'Añadir la red': 'Добавить сеть',
    'Dirección del nodo': 'Адрес узла',
    'networkId': 'networkId',
    'Para apuntar la app a tu propio nodo, por ejemplo una devnet de pruebas.':
        'Чтобы направить приложение на свой узел, например на тестовую devnet.',
    'Un nodo puesto a mano ve las direcciones que consultas y puede mentirte en los saldos y en el estado de un envío. No puede sacarte las claves: la firma se hace dentro del móvil. Aun así, pon solo nodos que sean tuyos o de quien te fíes.':
        'Узел, добавленный вручную, видит адреса, которые вы запрашиваете, и может соврать о балансах и о состоянии перевода. Добыть ваши ключи он не может: подпись происходит внутри телефона. И всё же добавляйте только свои узлы или те, которым доверяете.',
    'En una red puesta a mano solo se ve el saldo de KDA: los contratos de token y de NFT van en el código de la app y no se pueden escribir aquí.':
        'В сети, добавленной вручную, виден только баланс KDA: контракты токенов и NFT заданы в коде приложения, и здесь их вписать нельзя.',
    'Ponle un nombre a la red (40 letras como mucho).':
        'Дайте сети название (не более 40 символов).',
    'El networkId solo admite letras, números, punto, guion y guion bajo.':
        'В networkId допустимы только буквы, цифры, точка, дефис и подчёркивание.',
    'La dirección del nodo no es una dirección válida.': 'Адрес узла недействителен.',
    'La dirección del nodo tiene que empezar por https:// o http://.':
        'Адрес узла должен начинаться с https:// или http://.',
    'La dirección del nodo no puede llevar usuario ni contraseña.':
        'Адрес узла не может содержать имя пользователя или пароль.',
    'La dirección del nodo no puede llevar ni ? ni #.':
        'Адрес узла не может содержать ни ?, ни #.',
    'Esa red ya está en la lista.': 'Эта сеть уже в списке.',
    'Estado': 'Состояние',
    'responde': 'отвечает',
    'Chains': 'Чейны',
    'Altura': 'Высота',
    'Tarda': 'Задержка',
    'Comprobando el nodo…': 'Проверяем узел…',
    'Por dónde salen las consultas': 'Через что идут запросы',

    // --- Mercado
    'Se cerró sola por seguridad: llevaba un rato sin tocarse. Se cambia en Ajustes.':
        'Кошелёк заблокировался сам для безопасности: его давно не трогали. Это меняется в настройках.',
    'La sección está hecha y ve las piezas, pero se ha quitado del menú de momento: mover una pieza todavía no se puede, y una pantalla que solo mira ocupaba un botón sin dar nada.':
        'Раздел готов и показывает предметы, но пока убран из меню: перемещать предмет ещё нельзя, а экран, который только смотрит, занимал кнопку без всякой пользы.',
    'Cambiar en Mercado': 'Обмен на Рынке',
    'El cálculo y la simulación ya están; falta firmar el cambio desde el móvil.':
        'Расчёт и пробный прогон уже есть; не хватает подписи обмена с телефона.',
    'Enviar desde Ethereum': 'Отправка из Ethereum',
    'Por el puente se puede mandar de Kadena a Ethereum. Al revés no: eso es firmar una transacción de Ethereum, que es otra criptografía y todavía no está.':
        'Через мост можно отправлять из Kadena в Ethereum. Обратно — нет: для этого нужно подписывать транзакцию Ethereum, а это другая криптография, и её пока нет.',
    'Enviar desde una cartera de Ethereum': 'Отправка из кошелька Ethereum',

    'Por lo mismo: una cartera EVM aquí solo mira.':
        'По той же причине: кошелёк EVM здесь только смотрит.',
    'Ver el estado de la red': 'Посмотреть состояние сети',
    'A qué nodo se pregunta, si contesta y por qué altura va la cadena.':
        'Какой узел опрашивается, отвечает ли он и на какой высоте блокчейн.',
    '{0} · valor de la cartera': '{0} · стоимость кошелька',
    '{0} · lo que hay en KDA': '{0} · сколько есть в KDA',
    '1 KDA = {0} ({1} % en 24 h) · CoinGecko, {2}': '1 KDA = {0} ({1} % за 24 ч) · CoinGecko, {2}',
    '1 KDA = {0} · pool KDA/kb-USDC del Mercado, {1}': '1 KDA = {0} · пул KDA/kb-USDC на Рынке, {1}',
    '{0} contado a {1} KDA, que es su precio de venta: todavía no cotiza en ningún mercado.':
        '{0} считается по {1} KDA — это цена продажи: на рынках он пока не торгуется.',
    'sin contar lo que no tiene precio conocido': 'не считая того, у чего нет известной цены',
    'sin precio conocido': 'цена неизвестна',
    'En qué chains está': 'В каких чейнах находится',
    'No se sabe en qué chain está: la consulta no devolvió el reparto.':
        'Неизвестно, в каком чейне: запрос не вернул разбивку.',
    'Está repartido en {0} chains. Para enviar hay que elegir de cuál sale, y cada una va por su cuenta.':
        'Распределено по {0} чейнам. Для отправки нужно выбрать, из какого уходит, и каждый работает сам по себе.',

    // --- Info
    'Dónde corre': 'Где работает',
    'Navegador': 'Браузер',
    'APK de Android': 'APK для Android',
    'Bóveda': 'Хранилище',
    'nativa (Android)': 'нативное (Android)',
    'nativa (iPhone)': 'нативное (iPhone)',
    'App de iPhone': 'Приложение для iPhone',
    'simulada (pruebas)': 'имитация (тесты)',
    'Lo que todavía no está': 'Чего пока нет',
    'Lo que conviene saber': 'Что полезно знать',
    'Quién lo hace': 'Кто это делает',
    'Datos técnicos': 'Технические данные',
    'Copiar los datos técnicos': 'Копировать технические данные',
    '✓ Copiados': '✓ Скопировано',
    'Banco de pruebas (Fase 0)': 'Тестовый стенд (этап 0)',
    'Comprobar si hay versión nueva': 'Проверить наличие новой версии',
    'Descargar e instalar': 'Скачать и установить',

    'Contraseña': 'Пароль',
    'Repítela': 'Повторите',
    'Descifrando…': 'Расшифровываем…',
    'Creando y cifrando…': 'Создаём и шифруем…',
    'Derivando y cifrando…': 'Вычисляем ключи и шифруем…',
    'Comprobando…': 'Проверяем…',
    'Descargando…': 'Скачиваем…',
    'Las dos contraseñas no son iguales.': 'Пароли не совпадают.',
    'Con esta contraseña se cifra todo lo que se guarda en el aparato. Mínimo {0} caracteres, y no hay forma de recuperarla si se te olvida.':
        'Этим паролем шифруется всё, что хранится на устройстве. Минимум {0} символов, и восстановить его при утрате невозможно.',
    'Koberlet no trae ningún monedero dentro: la cartera la creas tú, y las claves se quedan en este aparato. Nadie más las tiene, así que nadie más puede recuperarlas por ti.':
        'В Koberlet нет встроенного кошелька: кошелёк создаёте вы, и ключи остаются на этом устройстве. Больше ни у кого их нет, поэтому никто не сможет их за вас восстановить.',
    'La app instalada está usando la bóveda de desarrollo. Esto no debería pasar: no metas aquí ninguna semilla y avísame.':
        'Установленное приложение использует хранилище для разработки. Такого быть не должно: не вводите здесь никакую сид-фразу и сообщите мне.',
    'Apunta estas palabras EN PAPEL y guárdalas donde nadie las vea. Son la cartera entera: quien las tenga se lleva el dinero, y si las pierdes no hay forma de recuperarlo. No se volverán a enseñar.':
        'Запишите эти слова НА БУМАГЕ и храните там, где их никто не увидит. Это весь кошелёк: у кого они есть, тот забирает деньги, а если вы их потеряете, вернуть деньги будет невозможно. Снова они показаны не будут.',
    'Apunta estas palabras EN PAPEL. Son esa cartera entera: quien las tenga se lleva su dinero, y si las pierdes no hay forma de recuperarlo.':
        'Запишите эти слова НА БУМАГЕ. Это весь тот кошелёк: у кого они есть, тот забирает его деньги, а если вы их потеряете, вернуть их будет невозможно.',
    'Copiar': 'Копировать',
    '✓ Copiada al portapapeles': '✓ Скопировано в буфер обмена',
    'No se pudo copiar': 'Не удалось скопировать',
    'No se pudo copiar: selecciónala a mano': 'Не удалось скопировать: выделите вручную',
    'No se pudo copiar: mantén pulsado el texto': 'Не удалось скопировать: нажмите и удерживайте текст',
    'Ya la he apuntado': 'Я записал',
    'Volver a verlas': 'Показать снова',
    'Escribe las dos palabras que te pido, para asegurar que las tienes bien apuntadas.':
        'Введите два слова, которые я спрошу, чтобы убедиться, что вы записали их правильно.',
    'Palabra número {0}': 'Слово номер {0}',
    'Alguna no coincide. Míralas otra vez en el papel.':
        'Одно из них не совпадает. Посмотрите ещё раз на бумагу.',
    'Importar': 'Импортировать',
    'Semilla o clave privada': 'Сид-фраза или приватный ключ',
    'O importa una clave privada (64 caracteres, o la larga de Chainweaver y Linx)':
        'Или импортируйте приватный ключ (64 символа либо длинный из Chainweaver и Linx)',
    '¿De qué cartera viene la semilla?': 'Из какого кошелька эта сид-фраза?',
    'eckoWallet, Koala, Koberlet… (la normal)': 'eckoWallet, Koala, Koberlet… (обычный вариант)',
    'Chainweaver o Linx': 'Chainweaver или Linx',
    'Las mismas palabras dan una cuenta distinta en Chainweaver. Si al importar no aparece tu saldo, prueba con la otra opción.':
        'Те же слова дают в Chainweaver другой счёт. Если после импорта ваш баланс не появился, попробуйте другой вариант.',
    'Cuenta derivada al estilo Chainweaver / Linx: con estas mismas palabras, eckoWallet o Koala enseñarían otra cuenta.':
        'Счёт получен по схеме Chainweaver / Linx: с теми же словами eckoWallet или Koala показали бы другой счёт.',
    'Las 12 o 24 palabras de tu semilla, separadas por espacios. Vale la de eckoWallet, Koala, Chainweaver, Linx o el Koberlet de escritorio.':
        '12 или 24 слова вашей сид-фразы через пробел. Подойдёт фраза из eckoWallet, Koala, Chainweaver, Linx или Koberlet для компьютера.',
    'Esa derivación no existe.': 'Такой схемы получения ключей не существует.',
    'Una clave privada de Kadena son 32 o 64 bytes.': 'Приватный ключ Kadena — это 32 или 64 байта.',
    'No sale una raíz Chainweaver de esta semilla.':
        'Из этой сид-фразы не получается корневой ключ Chainweaver.',
    'Esos 256 caracteres no son una clave de Chainweaver o Linx: la pública de dentro no cuadra.':
        'Эти 256 символов — не ключ Chainweaver или Linx: публичный ключ внутри не сходится.',
    'Importar esa clave': 'Импортировать этот ключ',
    'Una cartera metida por su clave privada no tiene palabras y nunca las tendrá: su única copia de seguridad es esa clave.':
        'У кошелька, добавленного по приватному ключу, нет слов и никогда не будет: этот ключ — его единственная резервная копия.',
    'También vale una clave privada suelta, en hexadecimal: se reconoce sola. Ojo, esa cartera no tendrá palabras.':
        'Подойдёт и отдельный приватный ключ в шестнадцатеричном виде: он распознаётся сам. Учтите, у такого кошелька не будет слов.',
    'Esta cartera se metió por su clave privada: no tiene 12 palabras. Su única copia de seguridad es esa clave.':
        'Этот кошелёк добавлен по приватному ключу: у него нет 12 слов. Этот ключ — его единственная резервная копия.',
    'Una clave privada son 64 caracteres del 0 al 9 y de la a a la f.':
        'Приватный ключ — это 64 символа от 0 до 9 и от a до f.',
    'Esos 128 caracteres no son una clave privada seguida de su pública.':
        'Эти 128 символов — не приватный ключ с публичным ключом за ним.',
    'Esa clave no vale: son todo ceros.': 'Этот ключ не годится: он весь из нулей.',
    'Esa cartera se metió con su clave privada: no tiene palabras.':
        'Этот кошелёк добавлен по приватному ключу: у него нет слов.',
    'Falta la clave privada.': 'Не указан приватный ключ.',
    'Esa cuenta ya está en este aparato, metida con su semilla.':
        'Этот счёт уже есть на устройстве, добавленный по сид-фразе.',
    'Esa clave privada no vale.': 'Этот приватный ключ не годится.',
    'Eso no es hexadecimal.': 'Это не шестнадцатеричный вид.',
    'Importar una cartera': 'Импортировать кошелёк',
    'Contraseña para cifrarla en este aparato': 'Пароль для шифрования на этом устройстве',
    'Cartera nueva': 'Новый кошелёк',
    'Ese código no lleva una cuenta Kadena válida. Repásalo antes de enviar nada.':
        'В этом коде нет действительного счёта Kadena. Проверьте его, прежде чем что-то отправлять.',
    'En la chain {0} hay {1} KDA y hay que dejar {2} para el gas. Como mucho puedes enviar {3}.':
        'В чейне {0} есть {1} KDA, и {2} нужно оставить на газ. Отправить можно не больше {3}.',
    'La cuenta de destino se creará si no existe todavía.':
        'Счёт получателя будет создан, если его ещё нет.',
    'Esta cuenta tiene que existir ya en esa chain; si no, el envío fallará y perderás solo el gas.':
        'Этот счёт должен уже существовать в том чейне; иначе перевод не пройдёт и вы потеряете только газ.',
    'Sigue sin aparecer en un bloque. No significa que haya fallado: apunta la referencia y míralo en un rato.':
        'В блоке так и не появилось. Это не значит, что операция не прошла: запишите номер операции и проверьте позже.',
    'Gas gastado: {0}': 'Израсходовано газа: {0}',
    'el contrato lo rechazó': 'контракт это отклонил',
    'La transacción entró en un bloque pero falló: {0}':
        'Транзакция попала в блок, но не прошла: {0}',
    'Apunta al código QR de la dirección': 'Наведите на QR-код адреса',
    'Cancelar': 'Отмена',
    'No se pudo abrir la cámara: {0}': 'Не удалось открыть камеру: {0}',
    'Lo que salga aquí da control TOTAL sobre el dinero de esta cartera. Que no haya nadie mirando, y no lo escribas en ningún chat, correo ni foto.':
        'То, что здесь появится, даёт ПОЛНЫЙ контроль над деньгами этого кошелька. Убедитесь, что никто не смотрит, и никогда не пишите это в чате, в письме и не фотографируйте.',
    'Apúntala en papel. En el móvil no se copia al portapapeles a propósito: otras apps pueden leerlo.':
        'Запишите на бумаге. На телефоне копирование в буфер обмена отключено специально: другие приложения могут его прочитать.',
    'Apúntala en papel. Aquí puedes copiarla para llevártela al móvil, pero no la dejes en ningún fichero ni chat.':
        'Запишите на бумаге. Здесь можно скопировать, чтобы перенести на телефон, но не оставляйте это ни в файле, ни в чате.',
    'Añadir otra cartera': 'Добавить ещё кошелёк',
    'Se guarda en la misma bóveda y se abre con la misma contraseña. Cada cartera es de una sola red; la misma semilla puede tener una de Kadena y otra de Ethereum.':
        'Он хранится в том же хранилище и открывается тем же паролем. Каждый кошелёк относится к одной сети; из одной сид-фразы может быть один кошелёк Kadena и другой Ethereum.',
    'Red de esta cartera': 'Сеть этого кошелька',
    'Falta la contraseña.': 'Не указан пароль.',
    'Fallo en la bóveda.': 'Сбой в хранилище.',
    'No se pudo descargar la actualización.': 'Не удалось скачать обновление.',
    'El fichero descargado no es un paquete de Android válido.':
        'Скачанный файл не является корректным пакетом Android.',
    'El paquete descargado está firmado con otra clave: NO es de DNNS. Se ha borrado.':
        'Скачанный пакет подписан другим ключом: он НЕ от DNNS. Он удалён.',
    'Ese paquete es más viejo que el instalado; no se instala.':
        'Этот пакет старее установленного; он не будет установлен.',
    'Falta la semilla.': 'Не указана сид-фраза.',
    'Falta la cartera.': 'Не указан кошелёк.',
    'Falta el nombre.': 'Не указано название.',
    'Falta la red.': 'Не указана сеть.',
    'Falta la chain.': 'Не указан чейн.',
    'Falta el destinatario.': 'Не указан получатель.',
    'Falta la dirección de Ethereum.': 'Не указан адрес Ethereum.',
    'Falta el peaje del puente.': 'Не указан сбор моста.',
    'Falta la cuenta del peaje.': 'Не указан счёт для сбора.',
    'Por el puente solo se envía desde una cuenta k:.': 'Через мост отправка возможна только со счёта k:.',
    'La cuenta del peaje no es válida; el nodo puede estar manipulado.':
        'Счёт для сбора недействителен; узел может быть подменён.',
    'Falta la cantidad.': 'Не указана сумма.',
    'Falta qué exportar.': 'Не указано, что экспортировать.',
    'No sé qué es eso que quieres exportar.': 'Непонятно, что вы хотите экспортировать.',
    'Falta el fichero de la copia.': 'Не указан файл резервной копии.',
    'El fichero se abre, pero no tiene dentro una cartera de Koberlet.':
        'Файл открывается, но кошелька Koberlet внутри нет.',
    'No hay ninguna cartera en este aparato.': 'На этом устройстве нет ни одного кошелька.',
    'Esa cartera ya está metida en este aparato.': 'Этот кошелёк уже добавлен на это устройство.',
    'Esa semilla no es válida: repasa las palabras, alguna no cuadra.':
        'Эта сид-фраза недействительна: проверьте слова, одно из них не сходится.',
    'Falta la lista de palabras BIP-39.': 'Отсутствует список слов BIP-39.',
    'La cuenta de origen no es válida.': 'Счёт отправителя недействителен.',
    'La cuenta de destino no es válida.': 'Счёт получателя недействителен.',
    'Los parámetros de cifrado de esta bóveda están por debajo del mínimo de seguridad.':
        'Параметры шифрования этого хранилища ниже минимума безопасности.',
    'Falta la dirección del paquete.': 'Не указан адрес пакета.',
    'Falta la huella del paquete.': 'Не указан отпечаток пакета.',
    'Ese paquete no viene del servidor de DNNS; no se descarga.':
        'Этот пакет не с сервера DNNS; он не будет скачан.',
    'La huella del paquete descargado no cuadra: se ha descartado.':
        'Отпечаток скачанного пакета не совпадает: он отброшен.',
    'huella': 'отпечаток',
    'la huella': 'отпечаток',
    'la cara': 'распознавание лица',
    'la huella o la cara': 'отпечаток или лицо',
    'Abrir con {0}': 'Открыть с помощью {0}',
    'Firmar con {0}': 'Подписать с помощью {0}',
    'Activar {0}': 'Включить {0}',
    'Dejar de usar {0}': 'Больше не использовать {0}',
    'Contraseña de la cartera (o firma con {0})': 'Пароль кошелька (или подпись через {0})',
    'Activada: se te pide {0} en lugar de la contraseña, que se sigue admitiendo siempre.':
        'Включено: вместо пароля запрашивается {0}, но пароль по-прежнему работает всегда.',
    'Para no teclear la contraseña en cada firma. Al activarlo, tu contraseña queda guardada en este móvil, cifrada con una clave del chip que solo se abre con {0}.':
        'Чтобы не вводить пароль при каждой подписи. При включении ваш пароль сохраняется на этом телефоне, зашифрованный ключом защищённого чипа, который открывается только через {0}.',
    'Ver u ocultar la contraseña': 'Показать или скрыть пароль',
    'Abre tu cartera': 'Откройте свой кошелёк',
    'Confirma que eres tú para activarlo': 'Подтвердите, что это вы, чтобы включить',
    'Firma el envío': 'Подпишите перевод',
    'Firma el envío entre chains': 'Подпишите перевод между чейнами',
    'Firma el envío por el puente': 'Подпишите перевод через мост',
    'Firma el permiso del token': 'Подпишите разрешение на токен',
    'Firma el cambio': 'Подпишите обмен',
    'Firma el plan de compras': 'Подпишите план покупок',
    'Firma el cambio en el plan': 'Подпишите изменение плана',

    // --- WalletConnect
    'Firma lo que te pide la web': 'Подпишите то, что просит сайт',
    'Conectar': 'Подключить',
    'Lee el código QR que te enseña la web y firma aquí lo que te pida. Mientras esta pantalla esté abierta, Koberlet escucha.':
        'Отсканируйте QR-код, который показывает сайт, и подпишите здесь то, что он попросит. Пока этот экран открыт, Koberlet слушает.',
    'Leer código QR': 'Сканировать QR-код',
    'Pegar enlace': 'Вставить ссылку',
    'Enlace aceptado. Esperando a que la web pida la conexión…':
        'Ссылка принята. Ждём, когда сайт запросит подключение…',
    'Eso no es un enlace de conexión. Tiene que empezar por «wc:» y lo da la propia web junto al código QR.':
        'Это не ссылка для подключения. Она должна начинаться с «wc:», и её даёт сам сайт рядом с QR-кодом.',
    'Abriendo la conexión…': 'Открываем подключение…',
    'Leyendo el enlace…': 'Читаем ссылку…',
    'Listo para leer el código.': 'Готов к сканированию кода.',
    'No se ha podido abrir la conexión con el servidor de enlace. Comprueba que tienes internet y vuelve a intentarlo; si estás en una wifi de hotel o de oficina, prueba con los datos del móvil.':
        'Не удалось подключиться к серверу-ретранслятору. Проверьте интернет и попробуйте снова; если вы в гостиничном или офисном Wi-Fi, попробуйте мобильный интернет.',
    'El enlace no ha respondido. Suele ser que el código QR ya había caducado: vuelve a sacarlo en la web, que cambia cada vez, y léelo otra vez.':
        'Ссылка не ответила. Обычно это значит, что QR-код уже истёк: откройте его на сайте снова — он меняется каждый раз — и отсканируйте ещё раз.',
    'Esa web quiere firmar de una forma que Koberlet todavía no sabe: {0}. No se ha conectado.':
        'Этот сайт хочет подписывать способом, который Koberlet пока не знает: {0}. Подключение не выполнено.',
    'Esa web pide avisos que Koberlet todavía no sabe mandar: {0}. No se ha conectado.':
        'Этот сайт запрашивает события, которые Koberlet пока не умеет отправлять: {0}. Подключение не выполнено.',
    'Koberlet no se conecta con esta web. Para cambiar tokens usa el Mercado de Koberlet: mismos pools y lo firmas aquí.':
        'Koberlet не подключается к этому сайту. Для обмена токенов используйте Рынок Koberlet: те же пулы, и подпись здесь же.',
    'Webs conectadas': 'Подключённые сайты',
    'Desconectar': 'Отключить',
    'Una web quiere conectarse': 'Сайт хочет подключиться',
    'El nombre y la dirección los dice la propia web: son una pista, no una prueba de quién es. Conecta solo si acabas de leer su código QR. Conectar no firma nada ni mueve dinero.':
        'Название и адрес сообщает сам сайт: это подсказка, а не доказательство того, кто он. Подключайтесь только если вы только что отсканировали его QR-код. Подключение ничего не подписывает и не переводит деньги.',
    'Conectar con esta cuenta': 'Подключиться с этим счётом',
    'No tienes ninguna cuenta de Kadena en este aparato.':
        'На этом устройстве у вас нет ни одного счёта Kadena.',
    'Conectado.': 'Подключено.',
    'Rechazar': 'Отклонить',
    'Te piden firmar': 'Вас просят подписать',
    'No se entiende lo que te piden firmar. No lo firmes.':
        'Непонятно, что вас просят подписать. Не подписывайте.',
    'Autorizas mover {0} KDA': 'Вы разрешаете перевести {0} KDA',
    'de': 'от',
    'a': 'к',
    'Lo que se ejecuta:': 'Что будет выполнено:',
    'Firmando…': 'Подписываем…',
    'Firmado y devuelto a la web.': 'Подписано и отправлено сайту.',
    'Falta el comando.': 'Не указана команда.',
    'Lo que manda la web no es un comando válido.':
        'То, что присылает сайт, не является корректной командой.',
    'Lo que manda la web no parece un comando de Kadena.':
        'То, что присылает сайт, не похоже на команду Kadena.',
    'La web no dice con qué clave hay que firmar.':
        'Сайт не указывает, каким ключом нужно подписать.',
    'La web pide firmar con otra cuenta distinta de la elegida.':
        'Сайт просит подписать другим счётом, не тем, который вы выбрали.',
    'Firmar para una web solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Подпись для сайта работает только в установленном приложении: здесь хранилище — это заглушка для разработки, и она не подписывает.',
    'El transporte no está arrancado.': 'Подключение не запущено.',
    'WC_URI_MALA': 'Эта ссылка не является корректной ссылкой для подключения.',
    'WC_WEB_BLOQUEADA': 'Koberlet не подключается к этому сайту.',
    'WC_SIN_CODIGO': 'В запросе на подпись нет кода Pact.',
    'WC_SIN_CUENTA': 'В запросе на подпись не указано, какой счёт подписывает.',
    'WC_SIN_CHAIN': 'В запросе на подпись нет корректного чейна.',
    'No hay ninguna cuenta que ofrecer.': 'Нет ни одного счёта, который можно предложить.',
    'La web pide firmar con una cuenta que no está en este aparato.':
        'Сайт просит подписать счётом, которого нет на этом устройстве.',
    'No se pudo consultar el lector de este aparato.':
        'Не удалось опросить сканер этого устройства.',
    'La huella solo funciona en la app instalada.':
        'Отпечаток работает только в установленном приложении.',
    'Este móvil no admite identificación segura.':
        'Этот телефон не поддерживает безопасную биометрию.',
    'Este móvil no tiene lector de huella ni reconocimiento facial.':
        'На этом телефоне нет сканера отпечатка и распознавания лица.',
    'El lector no está disponible ahora mismo.': 'Сканер сейчас недоступен.',
    'No hay ninguna huella, cara ni código configurado en este móvil. Añádelo en los ajustes de Android.':
        'На этом телефоне не настроен ни отпечаток, ни лицо, ни PIN-код. Добавьте их в настройках Android.',
    'No se pudo abrir el lector de este móvil. Entra con la contraseña.':
        'Не удалось открыть сканер этого телефона. Войдите с помощью пароля.',
    'El lector de este móvil no llega al nivel que exige el chip para guardar una contraseña.':
        'Сканер этого телефона не дотягивает до уровня, который требует защищённый чип для хранения пароля.',
    'Android no sabe decir si el lector de este móvil sirve; no se activa por si acaso.':
        'Android не может определить, годится ли сканер этого телефона; на всякий случай функция не включается.',
    'Android pide una actualización de seguridad antes de poder usar el lector.':
        'Android требует обновление безопасности, прежде чем можно будет использовать сканер.',
    'La identificación ya no vale en este móvil. Vuelve a activarla con tu contraseña.':
        'Биометрия больше не действует на этом телефоне. Включите её снова с помощью пароля.',
    'La identificación no está activada.': 'Биометрия не включена.',
    'Se canceló la identificación.': 'Биометрия отменена.',

    'No se pudo identificar.': 'Не удалось распознать.',
    'No se puede pedir la huella ahora mismo.': 'Сейчас нельзя запросить отпечаток.',
    'No se pudo activar la identificación.': 'Не удалось включить биометрию.',
    // Sección Carteras
    'Wallets': 'Кошельки',
    'Añadir wallet': 'Добавить кошелёк',
    'Todavía no tienes ninguna wallet en esta red.': 'В этой сети у вас пока нет ни одного кошелька.',
    'Ver': 'Открыть',
    'Ver la semilla (12 o 24 palabras)': 'Показать сид-фразу (12 или 24 слова)',
    'Ver la clave privada': 'Показать приватный ключ',
    'Semilla de «{0}» (12 o 24 palabras)': 'Сид-фраза «{0}» (12 или 24 слова)',
    'Kadena': 'Kadena',
    'Ethereum': 'Ethereum',
    'Dirección de Ethereum': 'Адрес Ethereum',
    'Kadena (KDA)': 'Kadena (KDA)',
    'Ethereum (ETH)': 'Ethereum (ETH)',
    'Esa red no existe.': 'Такой сети не существует.',
    'Nombre para reconocerla': 'Название, чтобы его узнавать',
    'Nombre': 'Название',
    'O importa una que ya tengas (12 o 24 palabras)':
        'Или импортируйте тот, который у вас уже есть (12 или 24 слова)',
    'Importar esa semilla': 'Импортировать эту сид-фразу',
    'Semilla de la cartera nueva': 'Сид-фраза нового кошелька',
    'Cambiar el nombre': 'Переименовать',
    'Cambiarle el nombre': 'Переименовать его',
    'El nombre es solo para que la reconozcas tú; no viaja a ninguna parte ni cambia nada de la cadena.':
        'Название нужно только вам, чтобы узнавать кошелёк; оно никуда не передаётся и ничего не меняет в блокчейне.',
    'Quitarla de este aparato': 'Убрать с этого устройства',
    'Quitar la cartera': 'Убрать кошелёк',
    'Quitarla definitivamente': 'Убрать окончательно',
    'Entiendo: la he apuntado o está vacía': 'Понимаю: я её записал или кошелёк пуст',
    'Si no estás seguro, primero ve a «Ver la semilla» y apúntala. Se puede volver a importar después con esas palabras.':
        'Если вы не уверены, сначала зайдите в «Показать фразу восстановления» и запишите её. Позже кошелёк можно будет снова импортировать по этим словам.',
    'Vas a quitar «{0}» de este aparato. Se borra su semilla: si no la tienes apuntada en papel, el dinero que haya en sus cuentas se queda inalcanzable para siempre. Nadie puede recuperarlo, ni tú ni nosotros.':
        'Вы собираетесь убрать «{0}» с этого устройства. Его сид-фраза будет удалена: если она не записана у вас на бумаге, деньги на его счетах станут недоступны навсегда. Их не сможет вернуть никто — ни вы, ни мы.',
    'Guardar una copia': 'Сохранить резервную копию',
    'Restaurar': 'Восстановить',
    'Restaurar una copia': 'Восстановить из копии',
    'Restaurar una copia de seguridad': 'Восстановить из файла резервной копии',
    'Guardar copia': 'Сохранить копию',
    'Descargar copia': 'Скачать копию',
    'Saca el fichero cifrado de la cartera para guardarlo fuera del móvil. Sale tal cual está aquí: cifrado, y sin la contraseña no lo abre nadie.':
        'Выгружает зашифрованный файл кошелька, чтобы хранить его вне телефона. Он выходит таким, как здесь: зашифрованным, и без пароля его никто не откроет.',
    'Descarga el fichero cifrado de esta cartera del navegador.':
        'Скачивает зашифрованный файл этого браузерного кошелька.',
    'Listo. Guárdala donde no la pierdas, pero recuerda: el fichero sin la contraseña no vale para nada, y la contraseña sin el fichero tampoco.':
        'Готово. Храните копию там, где не потеряете, но помните: файл без пароля бесполезен, как и пароль без файла.',
    'Elige el fichero y escribe la contraseña con la que se guardó. Si ya hay una cartera en este aparato, se aparta antes de tocarla; nunca se borra la única copia que tengas.':
        'Выберите файл и введите пароль, с которым он был сохранён. Если на устройстве уже есть кошелёк, он сначала отодвигается в сторону; ваша единственная копия никогда не удаляется.',
    'Fichero de la copia (vault.json)': 'Файл копии (vault.json)',
    'Contraseña de esa copia': 'Пароль этой копии',
    'Elige primero el fichero.': 'Сначала выберите файл.',
    'La copia que de verdad importa son las 12 palabras en papel: valen en cualquier cartera Kadena y no dependen de este programa. El fichero es una comodidad, no un sustituto.':
        'По-настоящему важная копия — это 12 слов на бумаге: они работают в любом кошельке Kadena и не зависят от этой программы. Файл — это удобство, а не замена.',
    'No se ha podido preguntar el saldo': 'Не удалось запросить баланс',
    'Mi cartera': 'Мой кошелёк',
    'Cartera importada': 'Импортированный кошелёк',
    'La contraseña debe tener al menos {0} caracteres.': 'Пароль должен быть не короче {0} символов.',
    'Esa contraseña es de las primeras que se prueban. Pon otra.':
        'Этот пароль — из первых, которые перебирают. Выберите другой.',
    'Mi cartera KDA': 'Мой кошелёк KDA',
    'Mi cartera EVM': 'Мой кошелёк EVM',
    'No ha contestado ninguna chain. Mira si tienes conexión (¿modo avión?, ¿wifi sin internet?) y dale a Refrescar. Tu dinero sigue donde estaba: lo que falla es la consulta.':
        'Ни один чейн не ответил. Проверьте связь (режим полёта? Wi-Fi без интернета?) и нажмите «Обновить». Ваши деньги там, где были: не удался только запрос.',
    'No ha contestado ninguna chain. Mira si tienes conexión (¿modo avión?, ¿wifi sin internet?) y vuelve a probar.':
        'Ни один чейн не ответил. Проверьте связь (режим полёта? Wi-Fi без интернета?) и попробуйте снова.',
    'Faltan {0} chains por contestar: puede que tengas más de lo que se ve aquí.':
        '{0} чейнов пока не ответили: возможно, у вас больше, чем здесь показано.',
    'Un monedero de Kadena para el móvil. Las claves se crean en este aparato y se quedan aquí, cifradas con tu contraseña: no hay servidor nuestro que las tenga ni que pueda devolvértelas si las pierdes.':
        'Кошелёк Kadena для телефона. Ключи создаются на этом устройстве и остаются здесь, зашифрованные вашим паролем: нашего сервера, который бы их хранил или мог вернуть при утрате, не существует.',
    'Esto es la maqueta del navegador. Aquí la bóveda es un doble de desarrollo que guarda en el propio navegador: sirve para ver cómo queda la app, no para guardar dinero.':
        'Это браузерный макет. Здесь хранилище — заглушка для разработки, которая сохраняет данные в самом браузере: она нужна, чтобы посмотреть, как выглядит приложение, а не чтобы хранить деньги.',
    'El Koberlet de escritorio hace además esto. Se irá portando al móvil, y cada parte aparecerá cuando funcione de verdad, no antes.':
        'Koberlet для компьютера умеет ещё вот это. Со временем всё перенесётся на телефон, и каждая часть появится, когда будет действительно работать, не раньше.',
    'Comprar en las preventas de Smart Pacts.': 'Участвовать в предпродажах Smart Pacts.',
    // Sección DCA
    'Plan nuevo': 'Новый план',
    'Entregas': 'Вы отдаёте',
    'Compras': 'Вы покупаете',
    'Bote inicial': 'Начальный банк',
    'Cuota por compra': 'Сумма одной покупки',
    'Cada': 'Каждые',
    'Deslizamiento máximo': 'Максимальное проскальзывание',
    'Crear el plan': 'Создать план',
    'Firmar y crear': 'Подписать и создать',
    'Ver mis planes': 'Посмотреть мои планы',
    'Cambiar el sentido': 'Поменять направление',
    '1 semana': '1 неделя',
    '{0} semanas': '{0} нед.',
    '1 día': '1 день',
    '{0} días': '{0} дн.',
    '1 hora': '1 час',
    '{0} horas': '{0} ч.',
    '{0} minutos': '{0} мин.',
    'No se pudo leer tu saldo de {0} en la chain 2.':
        'Не удалось прочитать ваш баланс {0} в чейне 2.',
    'Tienes {0} {1} en la chain 2.': 'У вас {0} {1} в чейне 2.',
    'Escribe el bote y la cuota para ver cuántas compras salen.':
        'Укажите банк и сумму покупки, чтобы увидеть, сколько покупок получится.',
    'Salen {0} compras de {1} {2}, una cada {3}: {4} en total. El servicio se lleva el 0,5 % de cada compra, unos {5} {2}.':
        'Получается {0} покупок по {1} {2}, по одной каждые {3}: всего {4}. Сервис берёт 0,5 % с каждой покупки — примерно {5} {2}.',
    'Escribe el bote y la cuota.': 'Укажите банк и сумму покупки.',
    'La cuota no puede ser mayor que el bote.': 'Сумма покупки не может быть больше банка.',
    'Cada compra tiene que ser de al menos {0} {1}.':
        'Каждая покупка должна быть не меньше {0} {1}.',
    'Se ingresa el bote entero ({0} {1}) en el contrato ahora mismo. Lo que no se llegue a gastar se recupera al cerrar el plan.':
        'Весь банк ({0} {1}) вносится в контракт прямо сейчас. Неизрасходованное вернётся при закрытии плана.',
    '✓ Plan creado y confirmado en la cadena.': '✓ План создан и подтверждён в блокчейне.',
    'Un plan de compras solo se puede crear a nombre de la propia cartera.':
        'План покупок можно создать только на имя самого кошелька.',
    'Entre compra y compra tienen que pasar de 5 minutos a un año.':
        'Между покупками должно проходить от 5 минут до года.',
    'El deslizamiento va de 0 a 50 %.': 'Проскальзывание — от 0 до 50 %.',
    'Falta el sentido de la compra.': 'Не указано направление покупки.',
    'Falta cada cuánto se compra.': 'Не указано, как часто покупать.',
    'Falta el deslizamiento.': 'Не указано проскальзывание.',
    'Los planes de compra son de Kadena: elige una cartera de Kadena.':
        'Планы покупок работают в Kadena: выберите кошелёк Kadena.',
    'Crear un plan de compras solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Создать план покупок можно только в установленном приложении: здесь хранилище — это заглушка для разработки, и она не подписывает.',
    'Compras periódicas': 'Регулярные покупки',
    // --- WalletConnect: sesión, Verify, caducadas y enlace koberlet://
    'La web cerró la conexión. Esta petición ya no la espera nadie.':
        'Сайт закрыл подключение. Этот запрос больше никто не ждёт.',
    'La web dejó caducar esta petición. Ya no se puede firmar.':
        'Сайт дал этому запросу истечь. Подписать его уже нельзя.',
    '✔ WalletConnect confirma que la petición viene de {0}.':
        '✔ WalletConnect подтверждает, что запрос пришёл с {0}.',
    '⚠ La dirección de esta web no coincide con la que declara. Puede ser una copia falsa: no conectes si no estás seguro.':
        '⚠ Адрес этого сайта не совпадает с тем, который он заявляет. Это может быть поддельная копия: не подключайтесь, если не уверены.',
    '⛔ WalletConnect marca esta web como ESTAFA conocida. No conectes.':
        '⛔ WalletConnect помечает этот сайт как известное МОШЕННИЧЕСТВО. Не подключайтесь.',
    'WalletConnect no ha podido confirmar de qué web viene esto.':
        'WalletConnect не смог подтвердить, с какого сайта это пришло.',
    'Redes que pide': 'Запрашиваемые сети',
    'Cerrar las {0} conexiones anteriores de esta web (si recargaste la página, ya no sirven y se quedan con tus peticiones)':
        'Закрыть {0} прежних подключений этого сайта (если вы перезагрузили страницу, они уже не работают и задерживают ваши запросы)',
    'Koberlet ha rechazado una petición de {0}: {1}.':
        'Koberlet отклонил запрос с {0}: {1}.',
    'Koberlet no firma esto: {0}.': 'Koberlet это не подписывает: {0}.',
    'pide firmar con una cuenta que no se compartió con esta web':
        'запрос просит подписать счётом, который не был передан этому сайту',
    'el comando no se entiende': 'команда непонятна',
    'la sesion no tiene ninguna cuenta': 'в сессии нет ни одного счёта',
    'la red {0} no se aprobó al conectar': 'сеть {0} не была одобрена при подключении',
    'La petición llegó a las {0}.': 'Запрос пришёл в {0}.',
    'La web ya cerró esta conexión: esta petición ya no la espera nadie.':
        'Сайт уже закрыл это подключение: этот запрос больше никто не ждёт.',
    'La web te ha pasado su enlace de conexión. Comprueba que lo has pedido tú y pulsa «Pegar enlace».':
        'Сайт передал вам свою ссылку для подключения. Убедитесь, что запрашивали её вы, и нажмите «Вставить ссылку».',
    // --- WalletConnect: firma sin límites
    '⚠ Esta web pide una firma sin límites': '⚠ Этот сайт просит подпись без ограничений',
    'Una firma sin permisos concretos no vale solo para lo que pone abajo: sirve para cualquier contrato que se fíe de tu clave. Una web honrada pide los permisos que necesita. Si no sabes por qué la pide sin límites, no firmes.':
        'Подпись без конкретных разрешений действует не только на то, что показано ниже: её примет любой контракт, который доверяет вашему ключу. Честный сайт запрашивает именно те разрешения, которые ему нужны. Если вы не понимаете, зачем он просит подпись без ограничений, не подписывайте.',
    'Lo entiendo y quiero firmarla igualmente': 'Я понимаю и всё равно хочу подписать',
    'Paga el gas': 'Газ платит',
    'Creado': 'Создано',
    'Esta firma va sin límites: marca la casilla del aviso rojo si de verdad quieres firmarla.':
        'Эта подпись без ограничений: отметьте галочку в красном предупреждении, если действительно хотите её поставить.',
    // --- Órdenes límite
    'Firma la orden': 'Подпишите заявку',
    'Firma cancelar la orden': 'Подпишите отмену заявки',
    'Mis órdenes': 'Мои заявки',
    'Órdenes límite': 'Лимитные заявки',
    'Leyendo el precio del pool…': 'Читаем цену пула…',
    'Ahora: 1 KDA = {0} kb-USDC (pool KDA/kb-USDC del Mercado de Kadena).':
        'Сейчас: 1 KDA = {0} kb-USDC (пул KDA/kb-USDC на Рынке Kadena).',
    'No se pudo leer el precio del pool ahora mismo.': 'Сейчас не удалось прочитать цену пула.',
    'El contrato de órdenes está parado: ahora mismo no se ejecuta ninguna orden.':
        'Контракт заявок приостановлен: сейчас ни одна заявка не исполняется.',
    'No tienes ninguna orden abierta.': 'У вас нет открытых заявок.',
    'Vende {0} KDA a {1} (recibes al menos {2} kb-USDC)':
        'Продаёт {0} KDA по {1} (вы получаете не менее {2} kb-USDC)',
    'Compra KDA con {0} kb-USDC a {1} (recibes al menos {2} KDA)':
        'Покупает KDA на {0} kb-USDC по {1} (вы получаете не менее {2} KDA)',
    'Libro de órdenes': 'Книга заявок',
    'No hay ninguna orden abierta ahora mismo.': 'Сейчас нет ни одной открытой заявки.',
    'El nodo no pudo cobrar el gas: tu cuenta no tiene KDA en la chain 2. Mándate un poco de KDA (con 0,05 sobra) a esta misma cuenta en la chain 2 y vuelve a intentarlo.':
        'Узел не смог списать газ: на вашем счёте нет KDA в чейне 2. Отправьте себе немного KDA (0,05 более чем достаточно) на этот же счёт в чейне 2 и попробуйте снова.',
    'Depósito': 'Залог',
    'Precio': 'Цена',
    'Cancelar la orden': 'Отменить заявку',
    'Se cancela la orden y te devuelve los {0} {1} del depósito, enteros. El gas de cancelar lo pagas tú, en KDA.':
        'Заявка отменяется, и залог {0} {1} возвращается вам полностью. Газ за отмену платите вы, в KDA.',
    'Para cancelar hace falta un poco de KDA en la chain 2 para el gas (con 0,05 KDA sobra). Ahora tienes {0}.':
        'Для отмены нужно немного KDA в чейне 2 на газ (0,05 KDA более чем достаточно). Сейчас у вас {0}.',
    '✓ Orden cancelada. El depósito vuelve a tu cuenta.':
        '✓ Заявка отменена. Залог возвращается на ваш счёт.',
    'Ver mis órdenes': 'Посмотреть мои заявки',
    'Orden nueva': 'Новая заявка',
    'Recibes': 'Вы получаете',
    'Precio de disparo, en kb-USDC por KDA': 'Цена срабатывания, в kb-USDC за KDA',
    'Cuánto entregas, en {0}': 'Сколько вы отдаёте, в {0}',
    'Crear orden de venta': 'Создать заявку на продажу',
    'Crear orden de compra': 'Создать заявку на покупку',
    'Escribe cuánto entregas y a qué precio.': 'Укажите, сколько отдаёте и по какой цене.',
    'Calculando…': 'Считаем…',
    'Esta orden mueve más del {0} % del pool: el contrato no la dejaría ejecutarse y se quedaría abierta para siempre. Pártela en varias más pequeñas.':
        'Эта заявка двигает больше {0} % пула: контракт не дал бы ей исполниться, и она осталась бы открытой навсегда. Разбейте её на несколько поменьше.',
    'Cuando 1 KDA llegue a {0} kb-USDC, se venden {1} KDA y recibes al menos {2} kb-USDC. El servicio se lleva {3} KDA (0,5 %).':
        'Когда 1 KDA достигнет {0} kb-USDC, будет продано {1} KDA, и вы получите не менее {2} kb-USDC. Сервис берёт {3} KDA (0,5 %).',
    'Cuando 1 KDA baje a {0} kb-USDC, se compran KDA con {1} kb-USDC y recibes al menos {2} KDA. El servicio se lleva {3} kb-USDC (0,5 %).':
        'Когда 1 KDA опустится до {0} kb-USDC, на {1} kb-USDC будет куплен KDA, и вы получите не менее {2} KDA. Сервис берёт {3} kb-USDC (0,5 %).',
    'Ojo: ese precio ya se cumple ahora mismo, así que la orden se ejecutará en cuanto el vigilante la vea.':
        'Внимание: эта цена уже достигнута, так что заявка исполнится, едва её увидит смотритель.',
    'La orden mínima es de {0} {1}.': 'Минимальная заявка — {0} {1}.',
    'Espera a que salga el resumen de la orden antes de firmar.':
        'Дождитесь сводки по заявке, прежде чем подписывать.',
    'Se ingresan {0} {1} en el contrato ahora mismo. Se quedan ahí hasta que la orden se ejecute o la canceles; cancelar te los devuelve enteros.':
        '{0} {1} вносятся в контракт прямо сейчас. Они остаются там, пока заявка не исполнится или вы её не отмените; при отмене возвращаются полностью.',
    'Te falta KDA en la chain 2: la orden son {0} KDA y hay que dejar además algo para el gas (al menos {1} en total). Tienes {2}.':
        'Не хватает KDA в чейне 2: заявка — это {0} KDA, и нужно оставить ещё немного на газ (всего не менее {1}). У вас {2}.',
    'Para crear esta orden hace falta un poco de KDA en la chain 2 para el gas (con 0,05 KDA sobra). Ahora tienes {0}.':
        'Для создания этой заявки нужно немного KDA в чейне 2 на газ (0,05 KDA более чем достаточно). Сейчас у вас {0}.',
    '✓ Orden creada y confirmada en la cadena.': '✓ Заявка создана и подтверждена в блокчейне.',
    'Esa cantidad lleva más decimales de los que admite el token.':
        'В этой сумме больше знаков после запятой, чем допускает токен.',
    'Una orden solo se puede crear a nombre de la propia cartera.':
        'Заявку можно создать только на имя самого кошелька.',
    'La orden está por debajo del mínimo del contrato.':
        'Заявка ниже минимума, установленного контрактом.',
    'Esa orden no es de esta cartera.': 'Эта заявка не принадлежит этому кошельку.',
    'El identificador de la orden no vale.': 'Неверный идентификатор заявки.',
    'Falta el sentido de la orden.': 'Не указано направление заявки.',
    'Falta el precio.': 'Не указана цена.',
    'Falta el mínimo a recibir.': 'Не указан минимум к получению.',
    'Las órdenes son de Kadena: elige una cartera de Kadena.':
        'Заявки работают в Kadena: выберите кошелёк Kadena.',
    'Falta la orden.': 'Не указана заявка.',
    'Crear una orden solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Создать заявку можно только в установленном приложении: здесь хранилище — это заглушка для разработки, и она не подписывает.',
    'Cancelar una orden solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Отменить заявку можно только в установленном приложении: здесь хранилище — это заглушка для разработки, и она не подписывает.',
    'No pude leer la liquidez del pool.': 'Не удалось прочитать ликвидность пула.',
    'El precio tiene que ser mayor que cero.': 'Цена должна быть больше нуля.',
    'La cantidad es demasiado pequeña.': 'Сумма слишком мала.',
    'El mínimo a recibir sale a cero: el pool es demasiado fino para esta orden.':
        'Минимум к получению выходит нулевым: пул слишком тонкий для этой заявки.',
    'El contrato {0} está parado: ahora mismo no compra ninguno de sus planes.':
        'Контракт {0} приостановлен: сейчас ни один его план не покупает.',
    'No se pudieron leer los planes de {0}: puede que tengas más de los que se ven.':
        'Не удалось прочитать планы в {0}: возможно, у вас больше, чем показано.',
    'Contrato': 'Контракт',
    'Los tokens del Mercado se cuentan al precio de su pool contra KDA.':
        'Токены Рынка считаются по цене их пула против KDA.',
    'Token del plan': 'Токен плана',
    'Falta el token del plan.': 'Не указан токен плана.',
    'Falta el contrato del plan.': 'Не указан контракт плана.',
    'Ese token no está en los planes de compra.': 'Этого токена нет в планах покупок.',
    'Ese contrato de compras no existe.': 'Такого контракта покупок не существует.',
    'Ese token no va en ese contrato de compras.':
        'Этот токен не относится к этому контракту покупок.',
    'La gasolinera solo paga los planes de kb-USDC: en este el gas lo pagas tú.':
        'Заправка оплачивает только планы в kb-USDC: в этом газ платите вы.',
    'La cuota por compra está por debajo del mínimo del contrato.':
        'Сумма одной покупки ниже минимума, установленного контрактом.',
    'No tienes ningún plan de compras.': 'У вас нет ни одного плана покупок.',
    'No se pudieron leer tus planes de compra.': 'Не удалось прочитать ваши планы покупок.',
    'Queda en el bote': 'Осталось в банке',
    'Compras que quedan': 'Осталось покупок',
    'Compras hechas': 'Покупок сделано',
    'Comprado': 'Куплено',
    'Siguiente compra': 'Следующая покупка',
    'Precio límite': 'Предельная цена',
    'sin leer': 'не прочитано',
    'Sin límite': 'Без ограничения',
    'Como mucho {0} {1} por cada {2}': 'Не более {0} {1} за каждый {2}',
    'Solo compra si cada {2} te cuesta {0} {1} o menos. Si sale más caro, esa cuota se salta y se prueba en la siguiente.':
        'Покупает только если каждый {2} стоит вам {0} {1} или меньше. Если дороже, эта покупка пропускается и повторяется в следующий раз.',
    'Como mucho, ¿cuántos {0} pagas por cada {1}? 0 para quitar el límite.':
        'Сколько максимум {0} вы платите за каждый {1}? 0 — убрать ограничение.',
    'Ese precio límite no vale: tiene que ser mayor que 0.':
        'Такая предельная цена не годится: она должна быть больше 0.',
    'El precio límite va de 0 a 1000.': 'Предельная цена — от 0 до 1000.',
    'Se quita el precio límite: el plan compra al precio que haya.':
        'Предельная цена снимается: план покупает по той цене, которая есть.',
    '✓ Precio límite fijado.': '✓ Предельная цена установлена.',
    'Pagas como mucho ({0} por cada {1})': 'Вы платите не более ({0} за каждый {1})',
    'Ahora, con esta cuota: {0} {1} por cada {2}.':
        'Сейчас, при такой сумме: {0} {1} за каждый {2}.',
    'Sin límite: compra al precio que haya.': 'Без ограничения: покупает по той цене, которая есть.',
    'Ahora se pone el límite: como mucho {0} {1} por cada {2}.':
        'Сейчас устанавливается ограничение: не более {0} {1} за каждый {2}.',
    'El plan se creó, pero no se pudo fijar el precio límite: {0}. Ponlo desde el historial.':
        'План создан, но предельную цену установить не удалось: {0}. Задайте её из истории.',
    'cada {0} días': 'каждые {0} дн.',
    'cada {0} horas': 'каждые {0} ч.',
    'cada {0} minutos': 'каждые {0} мин.',
    'Activo': 'Активен',
    'En pausa': 'Приостановлен',
    'Cerrado': 'Закрыт',
    'Órdenes de compra y venta a un precio puesto por ti.':
        'Заявки на покупку и продажу по цене, которую задаёте вы.',
    'NFT': 'NFT',
    'Launch': 'Launch',
    'DCA': 'DCA',
    'Órdenes': 'Заявки',
    'Puente': 'Мост',
    // Sección Mercado
    'Leyendo el mercado…': 'Читаем рынок…',
    'Ahora mismo no hay ningún par con fondo suficiente en este mercado.':
        'Сейчас на этом рынке нет ни одной пары с достаточной глубиной.',
    'Mueves el precio': 'Вы сдвигаете цену на',
    'Comisión de red (gas)': 'Сетевой сбор (газ)',
    'la paga Koberlet': 'платит Koberlet',
    'Esa acción sobre el plan no va por la gasolinera.':
        'Это действие с планом не проходит через заправку.',
    'Esta operación no cabe en el gas que paga la gasolinera.':
        'Эта операция не укладывается в газ, который оплачивает заправка.',
    'La gasolinera solo paga un cambio si lleva la comisión del servicio.':
        'Заправка оплачивает обмен только если в нём есть комиссия сервиса.',
    'Pasa por KDA: no hay par directo entre esos dos.':
        'Идёт через KDA: прямой пары между этими двумя нет.',

    'esta cuenta no tiene KDA en la chain 2, que es donde está el mercado y de donde sale el gas.':
        'на этом счёте нет KDA в чейне 2, а именно там находится рынок и оттуда берётся газ.',
    'esta cuenta no tiene ese token en la chain 2.': 'на этом счёте нет этого токена в чейне 2.',
    'Ese token no responde: su contrato está roto o no existe.':
        'Этот токен не отвечает: его контракт сломан или не существует.',
    'Ese token devuelve una precisión rara.': 'Этот токен возвращает странную точность.',
    'No se pudo leer el mercado.': 'Не удалось прочитать рынок.',
    'Son el mismo token.': 'Это один и тот же токен.',
    'No hay camino entre esos dos tokens en este mercado.':
        'На этом рынке нет пути между этими двумя токенами.',
    'Para el mercado la cuenta Kadena tiene que ser k: y 64 caracteres.':
        'Для рынка счёт Kadena должен быть k: плюс 64 символа.',
    'Cambio detenido: moverías el precio más del 10 %. En este pool no hay fondo para tanto; prueba con menos cantidad.':
        'Обмен остановлен: вы сдвинули бы цену больше чем на 10 %. В этом пуле нет такой глубины; попробуйте меньшую сумму.',

    'Demasiado impacto: más del {0} %. Prueba con menos.':
        'Слишком большое влияние на цену: больше {0} %. Попробуйте меньше.',
    'La simulación no comprueba el destinatario.': 'Пробный прогон не проверяет получателя.',
    'Cartera': 'Кошелёк',
    'Otra dirección': 'Другой адрес',
    'No hay ninguna cartera con cuenta de Kadena.': 'Нет ни одного кошелька со счётом Kadena.',
    'No hay ninguna cartera con cuenta de Ethereum.': 'Нет ни одного кошелька со счётом Ethereum.',
    'No tienes tanto en la chain 2.': 'У вас нет столько в чейне 2.',
    'Esto SÍ mueve el dinero. El puente no tiene vuelta atrás: si algo va mal, no hay quien lo devuelva.':
        'Это ДЕЙСТВИТЕЛЬНО переводит деньги. У моста нет обратного хода: если что-то пойдёт не так, вернуть их будет некому.',
    '✓ Salió de Kadena. Ahora lo tiene que entregar el relayer en Ethereum, y eso tarda.':
        '✓ Ушло из Kadena. Теперь релеер должен доставить это в Ethereum, и на это нужно время.',
    'Identificador del mensaje': 'Идентификатор сообщения',
    'No se pudo sacar el identificador del mensaje; guarda la referencia de arriba.':
        'Не удалось получить идентификатор сообщения; сохраните номер операции выше.',
    'El puente solo funciona en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Мост работает только в установленном приложении: здесь хранилище — это заглушка для разработки, и она не подписывает.',
    'Pega la referencia del envío. Tarda entre 2 y 10 minutos.':
        'Вставьте номер операции перевода. Это занимает от 2 до 10 минут.',
    'Cambiar': 'Обменять',
    'Doy': 'Отдаю',
    'Recibo': 'Получаю',
    'Darle la vuelta': 'Поменять местами',
    'Tienes {0}': 'У вас {0}',
    'Cotizando…': 'Запрашиваем курс…',
    'Como mínimo recibes': 'Как минимум вы получите',
    'MÁX': 'МАКС',
    'Hacia': 'Куда',
    'Copiar el destinatario': 'Копировать получателя',

    'no se pudo preguntar': 'не удалось запросить',
    'Así no saldría: ': 'Так не получится: ',
    'Lo que contestó el nodo': 'Что ответил узел',
    'esta cuenta no tiene KDA en la chain 2, que es de donde sale el gas y el peaje del puente.':
        'на этом счёте нет KDA в чейне 2, а оттуда берётся газ и сбор моста.',
    'esta cuenta no tiene ese token puenteado en la chain 2.':
        'на этом счёте нет этого токена, переведённого через мост, в чейне 2.',
    'te faltan KDA en la chain 2. El peaje del puente se paga en KDA, así que tener el token no basta.':
        'вам не хватает KDA в чейне 2. Сбор моста платится в KDA, поэтому одного токена недостаточно.',
    'no hay saldo suficiente para esa cantidad.': 'баланса на эту сумму не хватает.',
    'Te falta KDA en la chain 2: el bote son {0} KDA y hay que dejar además algo para el gas (al menos {1} en total). Tienes {2}.':
        'Не хватает KDA в чейне 2: банк — это {0} KDA, и нужно оставить ещё немного на газ (всего не менее {1}). У вас {2}.',
    'Para crear este plan hace falta un poco de KDA en la chain 2 para el gas (con 0,05 KDA sobra). Ahora tienes {0}. Mándate algo de KDA a esta misma cuenta en la chain 2 y vuelve a intentarlo.':
        'Для создания этого плана нужно немного KDA в чейне 2 на газ (0,05 KDA более чем достаточно). Сейчас у вас {0}. Отправьте себе немного KDA на этот же счёт в чейне 2 и попробуйте снова.',
    'El nodo no pudo cobrar el gas: tu cuenta no tiene KDA en la chain 2. El gas se paga siempre en KDA, aunque el plan sea de otro token. Mándate un poco de KDA (con 0,05 sobra) a esta misma cuenta en la chain 2 y vuelve a intentarlo.':
        'Узел не смог списать газ: на вашем счёте нет KDA в чейне 2. Газ всегда платится в KDA, даже если план в другом токене. Отправьте себе немного KDA (0,05 более чем достаточно) на этот же счёт в чейне 2 и попробуйте снова.',
    'El nodo no pudo cobrar el gas de la operación. Prueba otra vez en un momento.':
        'Узел не смог списать газ за операцию. Попробуйте ещё раз через минуту.',
    'el permiso que se firmaría no cubre esta operación; esto es un fallo nuestro, avisa.':
        'разрешение, которое было бы подписано, не покрывает эту операцию; это наша ошибка, сообщите нам.',
    'el nodo lo rechazó.': 'узел это отклонил.',
    'Permiso dado al puente': 'Разрешение, выданное мосту',
    'Peaje en Ethereum': 'Сбор в Ethereum',
    'ninguno': 'нет',
    'No tienes tanto USDC en Ethereum.': 'У вас нет столько USDC в Ethereum.',
    'el puente todavía no tiene permiso para coger tu USDC.':
        'у моста пока нет разрешения брать ваш USDC.',
    '✓ Copiado': '✓ Скопировано',
    '¿Llegó mi envío a Ethereum?': 'Дошёл ли мой перевод до Ethereum?',
    'Referencia de la transacción': 'Номер транзакции',
    'Preguntando…': 'Запрашиваем…',
    'Entregado en Ethereum.': 'Доставлено в Ethereum.',
    'Todavía no está entregado. Si acabas de enviarlo es normal; si lleva horas, avisa.':
        'Пока не доставлено. Если вы только что отправили — это нормально; если прошли часы, сообщите нам.',
    'Respondió {0}': 'Ответил {0}',
    'Cómo funciona un puente, en llano': 'Как работает мост, простыми словами',
    'Un puente no manda monedas de una cadena a otra: eso no existe. Lo que hace es guardar las tuyas en un lado y crear un vale por la misma cantidad en el otro.':
        'Мост не пересылает монеты из одного блокчейна в другой: такого не бывает. Он запирает ваши монеты на одной стороне и создаёт расписку на ту же сумму на другой.',
    'Cuando traes USDC a Kadena, tu USDC de verdad se queda bloqueado en un contrato de Ethereum y en Kadena aparece kb-USDC. Al volver, se destruye el kb-USDC y se suelta el original.':
        'Когда вы переводите USDC в Kadena, ваш настоящий USDC остаётся запертым в контракте Ethereum, а в Kadena появляется kb-USDC. При обратном переводе kb-USDC уничтожается, а оригинал освобождается.',
    'Por eso el kb- vale lo que valga la promesa de que ese contrato devolverá el original. Quien controle ese contrato controla tu dinero, y aquí lo controla una sola llave.':
        'Поэтому kb- стоит ровно столько, сколько стоит обещание, что этот контракт вернёт оригинал. Кто управляет этим контрактом, управляет вашими деньгами, а здесь им управляет один единственный ключ.',
    'Quien mueve los mensajes de una orilla a otra es un relayer, y se le paga en KDA al enviar: ese es el peaje.':
        'Сообщения с одного берега на другой переносит релеер, и ему платят в KDA при отправке: это и есть сбор.',
    'Esa ruta del puente no existe.': 'Такого маршрута моста не существует.',
    'La cantidad tiene que ser mayor que cero.': 'Сумма должна быть больше нуля.',
    'La dirección de Ethereum tiene que ser 0x y 40 caracteres.':
        'Адрес Ethereum должен быть 0x плюс 40 символов.',
    'Para el puente la cuenta Kadena tiene que ser k: y 64 caracteres.':
        'Для моста счёт Kadena должен быть k: плюс 64 символа.',
    'No se pudo leer el peaje del puente.': 'Не удалось прочитать сбор моста.',
    'La cuenta del peaje del puente no es válida (el nodo puede estar manipulado).':
        'Счёт для сбора моста недействителен (узел может быть подменён).',
    'El peaje del puente está fuera de lo razonable; mejor no seguir.':
        'Сбор моста выходит за разумные пределы; лучше не продолжать.',
    'Esa referencia de transacción no tiene la forma de una de Kadena.':
        'Этот номер транзакции не похож на номер из Kadena.',
    'Esa transacción todavía no está en un bloque, o no es de esta chain.':
        'Эта транзакция пока не в блоке, либо она не из этого чейна.',
    'Esa transacción falló en Kadena, así que no salió ningún mensaje.':
        'Эта транзакция не прошла в Kadena, поэтому никакого сообщения не ушло.',
    'Esa transacción no devolvió un identificador de mensaje: puede que no fuera un envío por el puente.':
        'Эта транзакция не вернула идентификатор сообщения: возможно, это был не перевод через мост.',
    'El identificador del mensaje tiene que ser 0x y 64 caracteres.':
        'Идентификатор сообщения должен быть 0x плюс 64 символа.',

    // Sección NFT
    'El servicio de piezas no respondió: solo se ven las apuntadas a mano.':
        'Сервис предметов не ответил: видны только добавленные вручную.',
    'De {0} piezas no se ha podido preguntar a la cadena, así que no se sabe si siguen aquí.':
        'По {0} предметам не удалось обратиться к блокчейну, поэтому неизвестно, на месте ли они.',
    'Esta cartera no tiene ninguna cuenta de Kadena.': 'У этого кошелька нет ни одного счёта Kadena.',
    'Buscando tus piezas…': 'Ищем ваши предметы…',
    'Sobre esta sección': 'Об этом разделе',
    'Esta red no tiene ningún servicio que diga qué piezas hay en cada cuenta, así que se apuntan por su identificador y es la cadena la que confirma de quién son. Lo que la cadena no confirme, aquí no se enseña.':
        'В этой сети нет сервиса, который сообщал бы, какие предметы есть на каждом счёте, поэтому они добавляются по идентификатору, а блокчейн подтверждает, чьи они. Чего блокчейн не подтвердил, здесь не показывается.',
    'Mover una pieza todavía no se puede desde el móvil: hace falta firmarla, y esa firma se monta en la parte nativa igual que la de los envíos de KDA. Llegará cuando esté probada.':
        'Перемещать предмет с телефона пока нельзя: это нужно подписывать, а такая подпись собирается в нативной части, как и для переводов KDA. Это появится, когда будет проверено.',
    'Ninguna de las piezas apuntadas está ahora mismo en esta cuenta.':
        'Ни одного из добавленных предметов сейчас на этом счёте нет.',
    'Todavía no hay ninguna pieza apuntada en esta cuenta.':
        'На этот счёт пока не добавлено ни одного предмета.',
    'Tienes {0} unidades': 'У вас {0} шт.',
    'Quitarla de la lista': 'Убрать из списка',
    'Apuntar una pieza por su identificador': 'Добавить предмет по идентификатору',
    'Identificador de la pieza': 'Идентификатор предмета',
    'Comprobar y apuntar': 'Проверить и добавить',
    'Preguntando a la cadena…': 'Запрашиваем блокчейн…',
    'Ese identificador de pieza no es válido.': 'Этот идентификатор предмета недействителен.',
    'Esta cuenta no tiene esa pieza en esta red.':
        'На этом счёте в этой сети такого предмета нет.',
    'No se pudo preguntar a la cadena. Prueba otra vez.':
        'Не удалось обратиться к блокчейну. Попробуйте снова.',
    'El descubridor de esta red no es una dirección admitida.':
        'Сервис поиска для этой сети находится по недопустимому адресу.',

    'Apunta la semilla en papel. Es lo único que recupera la cartera si pierdes el móvil, y nadie más la tiene.':
        'Запишите сид-фразу на бумаге. Это единственное, что вернёт кошелёк, если вы потеряете телефон, и больше ни у кого её нет.',
    'La contraseña se pide en cada envío, aunque la cartera esté abierta.':
        'Пароль запрашивается при каждом переводе, даже если кошелёк открыт.',
    'En el móvil la semilla no se copia al portapapeles a propósito: otras apps pueden leerlo.':
        'На телефоне сид-фраза специально не копируется в буфер обмена: другие приложения могут его прочитать.',
    'Una transferencia en la cadena no se puede deshacer ni reclamar a nadie.':
        'Перевод в блокчейне нельзя отменить, и спросить за него не с кого.',
    'DNNS.es — Antonio Morillo. Software libre, licencia Apache-2.0.':
        'DNNS.es — Antonio Morillo. Свободное программное обеспечение, лицензия Apache-2.0.',
    'Koberlet no está asociado a Kadena Eco: es un monedero independiente para la red de la comunidad.':
        'Koberlet не связан с Kadena Eco: это независимый кошелёк для сети сообщества.',
    'La app lo mira sola cada vez que se abre; aquí puedes forzarlo.':
        'Приложение проверяет это само при каждом запуске; здесь можно проверить принудительно.',
    'En el navegador no hay nada que instalar: basta con recargar la página.':
        'В браузере ничего устанавливать не нужно: достаточно перезагрузить страницу.',
    'Esta versión se actualiza sola desde Google Play.':
        'Эта версия обновляется сама через Google Play.',
    'Esta versión se actualiza desde Google Play.': 'Эта версия обновляется через Google Play.',
    'Esta versión se actualiza sola desde TestFlight o la App Store.':
        'Эта версия обновляется сама через TestFlight или App Store.',
    'Esta versión se actualiza desde TestFlight o la App Store.':
        'Эта версия обновляется через TestFlight или App Store.',
    'No se pudo comprobar: sin conexión con el servidor de descargas.':
        'Не удалось проверить: нет связи с сервером загрузок.',
    'Estás al día: versión {0}.': 'У вас последняя версия: {0}.',
    'Hay una versión nueva: {0} (tienes la {1}).': 'Есть новая версия: {0} (у вас {1}).',
    'Confirma la instalación en el aviso de Android':
        'Подтвердите установку в запросе Android',
    'Por el canal nativo de Android (CapacitorHttp): sin CORS y con tiempo de espera de verdad.':
        'Через нативный канал Android (CapacitorHttp): без CORS и с настоящим таймаутом.',
    'Por el navegador (fetch). En el móvil van por el canal nativo.':
        'Через браузер (fetch). На телефоне запросы идут нативным каналом.',

    // Mensajes de error
    'No hay ninguna cartera creada en este navegador.':
        'В этом браузере не создано ни одного кошелька.',
    'Esa cartera no existe.': 'Такого кошелька не существует.',
    'Ponle un nombre.': 'Дайте ему название.',
    'Es la única cartera que hay. Para empezar de cero, usa borrar todo.':
        'Это единственный кошелёк. Чтобы начать с нуля, используйте полное удаление.',
    'Los envíos solo funcionan en la app instalada: aquí la bóveda es un doble de desarrollo y no firma.':
        'Переводы работают только в установленном приложении: здесь хранилище — это заглушка для разработки, и она не подписывает.',
    'Esa copia viene de la app del móvil y aquí no se puede abrir: el navegador cifra de otra forma. Impórtala en el móvil.':
        'Эта копия сделана приложением на телефоне, и здесь её не открыть: браузер шифрует иначе. Импортируйте её на телефоне.',
    'Esa cartera ya está metida en este navegador.': 'Этот кошелёк уже добавлен в этот браузер.',
    'La bóveda de desarrollo no se ejecuta dentro de la app instalada.':
        'Хранилище для разработки не работает внутри установленного приложения.',
    'El nodo no devolvio un cut reconocible.': 'Узел не вернул распознаваемый cut.',

};
