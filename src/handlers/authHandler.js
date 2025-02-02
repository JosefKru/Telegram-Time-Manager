import { getAuthUrl, saveUserToken } from '../services/googleCalendarService.js'

export const authHandler = async (ctx) => {
  const authUrl = getAuthUrl()
  ctx.reply(`Для авторизации перейдите по ссылке и отправьте код:\n${authUrl}`)
}

export const authCodeHandler = async (ctx) => {
  const userId = ctx.from.id
  const text = decodeURIComponent(ctx.message.text.split(' ')[1])

  if (!text) {
    return ctx.reply('❌ Ошибка: отправьте код в формате /authcode ВАШ_КОД')
  }

  const response = await saveUserToken(userId, text)
  ctx.reply(response)
}
