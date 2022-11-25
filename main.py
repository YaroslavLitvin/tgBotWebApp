import json
import ssl

import aiofiles as aiofiles
from aiogram.dispatcher.filters import Command
from config import BOT_TOKEN, PROVIDER_TOKEN
import asyncio
from aiogram import Bot, Dispatcher, executor
from aiogram.types import Message, PreCheckoutQuery, ContentType, WebAppInfo, ReplyKeyboardMarkup, KeyboardButton
from aiohttp import web

SITE_FOLDER = "C:/Users/litvi/OneDrive/Документы/HTML/tgWebAppTest/{0}"


async def handler(request: web.BaseRequest):
    result = ''
    content_type = ''
    print(request.path)
    if request.path == '/createInvoiceLink':
        print(request.query.getone(key='title'))
        print(request.query.getone(key='description'))
        print(request.query.getone(key='currency'))
        print(request.query.getone(key='prices'))
        print(PROVIDER_TOKEN)
        print(0)
        prices = json.loads(request.query.getone(key='prices'))
        print(prices)
        result = await bot.create_invoice_link(title=request.query.getone(key='title'),
                                               description=request.query.getone(key='description'),
                                               currency=request.query.getone(key='currency'),
                                               prices=prices,
                                               provider_token=PROVIDER_TOKEN,
                                               payload=0)
        result = "{{\"ok\":true,\"result\":\"{0}\"}}".format(result)
        content_type = 'application/json'
        print(result)
    else:
        # https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
        if "/" == request.path:
            content_type = 'text/html'
        elif ".css" in request.path:
            content_type = 'text/css'
        elif ".js" in request.path:
            content_type = 'text/javascript'
        elif ".png" in request.path:
            content_type = 'image/png'
        else:  # ".gif"  in request.path:
            content_type = 'image/gif'

        if "text" in content_type:
            async with aiofiles.open(
                    file=SITE_FOLDER.format(f"{'/index.html' if request.path == '/' else request.path}"),
                    mode='r',
                    encoding="utf-8") as f:
                result = await f.read()
        elif "image" in content_type:
            async with aiofiles.open(
                    file=SITE_FOLDER.format(f"{'/index.html' if request.path == '/' else request.path}"),
                    mode='r') as f:
                result = await f.read()

    return web.Response(content_type=content_type, body=result)


async def server_start():
    server = web.Server(handler)
    runner = web.ServerRunner(server)
    await runner.setup()
    # ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
    # ssl_context.load_cert_chain('domain_srv.crt', 'domain_srv.key')
    site = web.TCPSite(runner=runner, host='localhost', port=80
                       # ssl_context=ssl_context
                       )
    await site.start()
    print("======= Serving on http://127.0.0.1:80/ ======")
    # pause here for very long time by serving HTTP requests and
    # waiting for keyboard interruption
    # await asyncio.sleep(100 * 3600)


loop = asyncio.new_event_loop()
bot = Bot(token=BOT_TOKEN, parse_mode='HTML')
dp = Dispatcher(bot, loop=loop)
# web_app = WebAppInfo(url="https://yaroslavlitvin.github.io/tgWebAppTest/")
web_app = WebAppInfo(url="https://samfruits.ru/")
app_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="store", web_app=web_app)]
    ],
    resize_keyboard=True
)


@dp.message_handler(Command('start'))
async def send_web_button(msg: Message):
    await msg.answer(text="Click btn", reply_markup=app_keyboard)


@dp.message_handler(content_types=ContentType.WEB_APP_DATA)
async def web_app_data_handler(web_app_msg):
    print(f'web app data: {web_app_msg.web_app_data.data}')


@dp.message_handler()
async def echo_send(msg: Message):
    await msg.answer(msg.text)


@dp.pre_checkout_query_handler()
async def confirm_pre_checkout(pcq: PreCheckoutQuery):
    print('new payment\n')
    await bot.answer_pre_checkout_query(pcq.id, ok=True)


if __name__ == '__main__':
    executor.start(dp, server_start())
    executor.start_polling(dp, skip_updates=False)
    print("bot stopped")
