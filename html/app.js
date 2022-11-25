const app_url = "https://yaroslavlitvin.github.io/tgWebAppTest/"
// const goodsPath = "goods.json"; // Путь к файлу с товарами (local debug)
const goodsPath = `${app_url}goods.json`; // Путь к файлу с товарами
const goodsItemMaxCount = 10; // Максимальное разрешенное количество одного товара
const botToken = "5830489641:AAE1iABsbBGApZvdoAVuT4qQqTfHaMWKPjU";
const paymentToken = "401643678:TEST:fc43621f-7afa-4da9-912f-936e9a94417d";


var goodsGlobal;
var userOrder_dict = {}; // Корзина пользователя

var orderNumber = 0;

// Информирует о том есть ли в корзине пользователя товар с заданным id.
function isItemInOrder(id)
{
    for(var key in userOrder_dict)
    {
        if(key == id)
        {
            return true;
        }
    }

    return false;
}

// Устанавливает количество товара с заданным id в корзине пользователя в заданное количество count.
// Если новое количество имеющегося товара в корзине равно 0, то товар удаляется из корзины.
// Если товар с заданным id еще не в корзине то создается новая запись.
function setItemCountInOrder(id, count)
{
    if(id < 0)
    {
        console.error(`id < 0 (${id})`);
    }

    if(count < 0)
    {
        console.error(`count < 0 (${count})`);
    }

    if(isItemInOrder(id))
    {
        if(count > 0)
        {
            userOrder_dict[id] = count;
        }
        else
        {
            delete userOrder_dict[id];
        }
    }
    else
    {
        userOrder_dict[id] = 1;
    }

    if(Object.keys(userOrder_dict).length > 0)
    {
        window.Telegram.WebApp.MainButton.show();
    }
    else
    {
        window.Telegram.WebApp.MainButton.hide();
    }
}

// Включение виброотклика при нажатии на кнопки (telegram API)
function tgButtonVibration()
{
    window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
}

// Обработчик события нажатия кнопки
function addBtn_clickEventHandler(event)
{
    var parent = event.currentTarget.parentNode;
    var goodsID = parent.closest(".card").id;
    var counter = parent.querySelector(".itemCounter");
    var counterValue = Number(counter.innerText);

    if(counterValue == 0)
    {
        event.currentTarget.innerText = "+";
        event.currentTarget.style.width = "46%";
        counter.style.visibility = "visible";
    }
    if(counterValue < goodsItemMaxCount)
        counterValue += 1;
    counter.innerText = counterValue;

    setItemCountInOrder(goodsID, counterValue);

    tgButtonVibration();
}

function subtractBtn_clickEventHandler(event)
{
    var parent = event.currentTarget.parentNode;
    var goodsID = parent.closest(".card").id;
    var counter = parent.querySelector(".itemCounter");
    var counterValue = Number(counter.innerText);

    counterValue -= 1;
    if(counterValue == 0)
    {
        parent.querySelector(".addBtn").innerText = "ADD";
        parent.querySelector(".addBtn").style.width = "100%";
        counter.style.visibility = "hidden";

    }
    counter.innerText = counterValue;

    setItemCountInOrder(goodsID, counterValue);

    tgButtonVibration();
}

var goodsSerializedForPayment = "";
var goodsListForUser = "";
var goodsListForManager = "";
function updateOrderList()
{
    // clearOrderList
    var orderList = document.getElementById("orderList");
    orderList.replaceChildren();

    // fill order list

    var good = {};
    goodsArray = [];
    good.label = "";
    good.amount = 0;

    var value;
    var toPayByGood = 0;
    var toPay = 0.0;
    const orderItemTemplate = document.getElementById("orderListItemTemplate");
    const orderItemTemplate_img = orderItemTemplate.content.querySelector("img");
    const orderItemTemplate_orderItemNameName = orderItemTemplate.content.querySelector(".orderItemNameName");
    const orderItemTemplate_orderItemNameCount = orderItemTemplate.content.querySelector(".orderItemNameCount");
    const orderItemTemplate_orderItemTotalPrice = orderItemTemplate.content.querySelector(".orderItemTotalPrice");

    goodsListForUser = "";
    for(var index = 0; index < Object.keys(goodsGlobal.items).length; index++)
    {
        value = userOrder_dict[goodsGlobal.items[index].id];
        if(value != null)
        {
            orderItemTemplate_img.src = goodsGlobal.items[index].image;
            orderItemTemplate_orderItemNameName.innerText = goodsGlobal.items[index].name;
            orderItemTemplate_orderItemNameCount.innerText = `${value}x`;
            toPayByGood = value * goodsGlobal.currencyCoef * goodsGlobal.items[index].price;
            toPay += toPayByGood;
            orderItemTemplate_orderItemTotalPrice.innerText = `${goodsGlobal.currency}${toPayByGood * 0.01}`;

            goodsListForUser += `\n- ${goodsGlobal.items[index].name} ${value}x`;
            goodsListForManager += `\n- ${goodsGlobal.items[index].name} ${value}x (id: ${goodsGlobal.items[index].id})`;

            good.label = `${goodsGlobal.items[index].name} ${value}x`;
            good.amount = toPayByGood;

            let goodCopied = Object.assign({}, good);
            goodsArray.push(goodCopied);

            var clone = orderItemTemplate.content.cloneNode(true);
            orderList.appendChild(clone);
        }
    }

    goodsSerializedForPayment = JSON.stringify(goodsArray);

    return toPay;
}

// отправляет http get запрос
function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function()
    { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send();
}

// обрабатывает ответ на запрос формирования ссылки оплаты и
// выводит окно оплаты пользователю
function formPayLink_response(resposeText)
{
    console.info(resposeText);
    var response = JSON.parse(resposeText);
    if(response.ok)
    {
        window.Telegram.WebApp.openInvoice(response.result);
        // getUpdates_init();
        // getUpdates_new_precheckout();
    }
    else
    {
        console.error("payment error");
    }
}

// отправляет запрос на формирование ссылки оплаты
function formPayLink_request()
{
    orderNumber = Math.floor(Math.random() * 1000000000);

    var InvoiceTitle = `Order №${orderNumber}`;
    var InvoiceDescription = "Here will be an awesome order description!";

    // var url = `https://api.telegram.org/bot${botToken}/createInvoiceLink?title=${InvoiceTitle}&description=${InvoiceDescription}&payload=0&provider_token=${paymentToken}&currency=${goodsGlobal.currencyCode}&prices=${goodsSerializedForPayment}`;
    var url = `/createInvoiceLink?title=${InvoiceTitle}&description=${InvoiceDescription}&currency=${goodsGlobal.currencyCode}&prices=${goodsSerializedForPayment}`;
    httpGetAsync(url, formPayLink_response);
}

// Отправляет заданное стрококвое сообщение в чат с заданным id(не обязательный параметр).
function sendMessageToChat(message, id = 0)
{
    var url = "";
    if(id == 0)
    {
        id = window.Telegram.WebApp.initDataUnsafe.user.id;
    }

    url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${id}&text=${message}`;
    httpGetAsync(url, (resposeText) => {});
}

// обрабатывает событие закрытия окна оплаты
function invoiceClosed_Handler(callbackData)
{
    console.log(`invoiceClosed_Handler in. callbackData.status = ${callbackData.status}`);
    // eventHandler receives an object with the two fields:
    // * url – invoice link provided;
    // * status – one of the invoice statuses:
    //   - paid – invoice was paid successfully,
    //   - cancelled – user closed this invoice without paying,
    //   - failed – user tried to pay, but the payment was failed,
    //   - pending – the payment is still processing. The bot will receive a service message about
    if(callbackData.status == "paid")
    {
        var response = `Заказ №${orderNumber} оплачен!\nСпасибо за покупку!\nВы заказали:${goodsListForUser}`;
        sendMessageToChat(response);

        response = `Поступил новый заказ №${orderNumber}.\nЗаказали:${goodsListForManager}`;
        sendMessageToChat(response, 190809350);
    }
    else
    {
        console.error(`invoiceClosed_Handler: ${callbackData.status}`);
    }
}

var MainButton_state = 0;
function MainButton_setState(new_state, value = 0.0)
{
    if(new_state < 0)
        return;

    MainButton_state = new_state;

    var mainBtnText = "";

    switch(MainButton_state)
    {
        case 0:
            mainBtnText = "View order";
          break;
        case 1:
            mainBtnText = `Pay ${goodsGlobal.currency}${value * 0.01}`;
          break;
        default:
            MainButton_state = 0;
    }

    window.Telegram.WebApp.MainButton.setText(mainBtnText);
}

function BackButton_clickEventHandler()
{
    switch(MainButton_state)
    {
        case 0:
            window.Telegram.WebApp.close();
        break;
        case 1:
            MainButton_setState(0);
            setPage(1);
        break;
        default:
    }
}

function MainButton_clickEventHandler()
{
    switch(MainButton_state)
    {
        case 0:
            window.Telegram.WebApp.expand();
            MainButton_setState(1, updateOrderList());
            setPage(2);
          break;
        case 1:
            formPayLink_request();
          break;
        default:
            MainButton_state = 0;
    }    
}

// Функция автоматического увеличения поля комментария к заказу
function textarea_autoGrow(oField)
{
    if (oField.scrollHeight != oField.clientHeight)
    {
      oField.style.height = `${oField.scrollHeight}px`;
    }
  }

// Добавляет в html код карточки товаров
function loadItemList()
{
    window.Telegram.WebApp.ready();
    
    // инициализация основной кнопки (telegram API)
    window.Telegram.WebApp.MainButton.color = "#31B545";
    window.Telegram.WebApp.MainButton.onClick(MainButton_clickEventHandler);
    MainButton_setState(0);

    // инициализациия кнопки назад (telegram API)
    window.Telegram.WebApp.BackButton.onClick(BackButton_clickEventHandler);
    window.Telegram.WebApp.BackButton.show();

    window.Telegram.WebApp.onEvent("invoiceClosed", invoiceClosed_Handler);

    // Загружаем на страничку товары
    fetch(goodsPath)
    .then(response => response.json())
    .then(goods =>
    {
        goodsGlobal = goods;
        const cardList = document.querySelector("#cardList");
        const template = document.querySelector("#cardListItemTemplate");

        const card_img = template.content.querySelector("img");
        const card_name = template.content.querySelector(".cardName");
        const card_cardCurrency = template.content.querySelector(".cardCurrency");
        const card_price = template.content.querySelector(".cardPrice");

        var index = 0;
        for (index = 0; index < Object.keys(goods.items).length; index++)
        {
            if(goods.items[index].available)
            {
                card_img.src = goods.items[index].image;
                card_name.innerText = goods.items[index].name;
                card_cardCurrency.innerText = goods.currency;
                card_price.innerText = goods.currencyCoef * goods.items[index].price * 0.01;
                let templateCopy = template.content.cloneNode(true);

                cardList.append(templateCopy);
                let card = cardList.lastElementChild;
                let card_addBtn = cardList.lastElementChild.querySelector(".addBtn");
                let card_subBtn = cardList.lastElementChild.querySelector(".subtractBtn");

                card.id = `${goods.items[index].id}`;
                card_addBtn.addEventListener("click", addBtn_clickEventHandler);
                card_subBtn.addEventListener("click", subtractBtn_clickEventHandler);
            }
        }
        setPage(1);
    });
}

// Добавляет в html код карточки товаров когда базовый код загружен
window.addEventListener("load", loadItemList);

