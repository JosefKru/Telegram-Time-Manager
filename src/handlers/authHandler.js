import { getAuthUrl, saveUserToken } from '../services/googleCalendarService.js'

export const authHandler = async (ctx) => {
  const authUrl = getAuthUrl()
  ctx.reply(`Для авторизации перейдите по ссылке и отправьте код:\n${authUrl}`)
}

export const authCodeHandler = async (ctx) => {
  const userId = ctx.from.id
  const text = ctx.message.text.split(' ')[1]

  if (!text) {
    return ctx.reply('❌ Ошибка: отправьте код в формате `/authcode ВАШ_КОД`')
  }

  try {
    const response = await saveUserToken(userId, text)
    ctx.reply(response)
  } catch (error) {
    console.error('Ошибка авторизации:', error)

    if (error.message.includes('invalid_grant')) {
      ctx.reply('❌ Ошибка: неверный код авторизации. Попробуйте снова.')
    } else {
      ctx.reply('❌ Внутренняя ошибка сервера. Повторите попытку позже.')
    }
  }
}
