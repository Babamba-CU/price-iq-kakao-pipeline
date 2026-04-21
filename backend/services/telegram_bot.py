import base64
import logging
from typing import Optional

from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

from config import settings

logger = logging.getLogger(__name__)

_app: Optional[Application] = None


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if str(update.effective_chat.id) != str(settings.telegram_group_id):
        return
    text = update.message.text
    logger.info(f"텔레그램 텍스트 수신: {text[:50]}")
    # TODO: DB 세션 생성 후 ParserService.parse_text 호출
    await update.message.reply_text("✅ 단가 데이터 수신 완료")


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if str(update.effective_chat.id) != str(settings.telegram_group_id):
        return
    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    image_bytes = await file.download_as_bytearray()
    logger.info(f"텔레그램 이미지 수신: {len(image_bytes)} bytes")
    # TODO: DB 세션 생성 후 ParserService.parse_image 호출
    await update.message.reply_text("✅ 이미지 단가 데이터 수신 완료")


def get_application() -> Application:
    global _app
    if _app is None and settings.telegram_bot_token:
        _app = (
            Application.builder()
            .token(settings.telegram_bot_token)
            .build()
        )
        _app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
        _app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    return _app
