import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import config from 'config'
import { ogg } from './ogg.js'
import { limitSessionLength, processAudio } from './utils.js'
import client from './openai.js'
import { code } from 'telegraf/format'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))
const sessions = new Map()

bot.on(message('voice'), async (ctx) => {
  try {
    await ctx.reply(code('Сообщение принято. Жду ответа от сервера...'))

    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)

    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    const transcription = await processAudio(mp3Path)

    // Проверяем, есть ли уже история для пользователя
    if (!sessions.has(userId)) {
      sessions.set(userId, [
        {
          role: 'system',
          content: config.get('openai.instruction'),
        },
      ])
    }

    // Получаем текущую историю
    const userSession = sessions.get(userId)

    // Добавляем расшифрованное сообщение в историю
    userSession.push({ role: 'user', content: transcription })

    // Ограничиваем длину истории
    limitSessionLength(userSession)

    // Отправляем запрос в OpenAI
    const chatResponse = await client.chat.completions.create({
      model: config.get('openai.model'),
      messages: userSession,
    })

    const response = chatResponse.choices[0].message.content

    // Добавляем ответ бота в историю
    userSession.push({ role: 'assistant', content: response })
    sessions.set(userId, userSession) // Сохраняем обновлённую историю

    // Отправляем ответ пользователю
    await ctx.reply(response)
  } catch (e) {
    console.error('Ошибка обработки голосового сообщения:', e.message)
    await ctx.reply('Произошла ошибка при обработке вашего голосового сообщения.')
  }
})

bot.on(message('text'), async (ctx) => {
  try {
    await ctx.reply(code('Сообщение принято. Жду ответа от сервера...'))

    const userId = String(ctx.message.from.id)
    const userMessage = ctx.message.text

    // Инициализируем историю, если её ещё нет
    if (!sessions.has(userId)) {
      sessions.set(userId, [
        {
          role: 'system',
          content: config.get('openai.instruction'),
        },
      ])
    }

    const userSession = sessions.get(userId)
    userSession.push({ role: 'user', content: userMessage })

    limitSessionLength(userSession) // Ограничиваем длину истории

    // Отправляем запрос в OpenAI
    const chatResponse = await client.chat.completions.create({
      model: config.get('openai.model'),
      messages: userSession,
    })

    const response = chatResponse.choices[0].message.content

    // Добавляем ответ бота в историю
    userSession.push({ role: 'assistant', content: response })
    sessions.set(userId, userSession) // Сохраняем обновлённую историю

    await ctx.reply(response)
  } catch (e) {
    console.error('Ошибка обработки текстового сообщения:', e.message)
    await ctx.reply('Произошла ошибка при обработке вашего сообщения.')
  }
})

bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Я бот, который поможет вам управлять временем и задачами. ' +
      'Отправьте текстовое или голосовое сообщение, чтобы я помог вам организовать ваш день или решить задачи. ' +
      'Давайте начнём!'
  )
})

bot.launch()

process.on('SIGINT', () => bot.stop('SIGINT'))
process.on('SIGTERM', () => bot.stop('SIGTERM'))
