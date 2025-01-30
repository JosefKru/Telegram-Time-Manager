import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import config from 'config'
import { ogg } from './ogg.js'
import { addTask, analyzeIntent, processAudio } from './utils.js'
import client from './openai.js'
import { code } from 'telegraf/format'
import { listTasks, removeTask } from './aws.js'

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
    const action = await analyzeIntent(transcription)

    let response = ''
    if (action.startsWith('add_task:')) {
      const [, description, type] = action.split(':')
      const task = await addTask(description.trim(), type.trim())
      response = `Задача добавлена: "${task.description}" (${task.category})`
    } else if (action.startsWith('remove_task:')) {
      const description = action.replace('remove_task:', '').trim()
      const success = await removeTask(description)
      response = success
        ? `Задача "${description}" выполнена и удалена.`
        : `Задача "${description}" не найдена.`
    } else if (action === 'list_tasks') {
      const tasks = await listTasks()
      response = tasks.length
        ? `Ваши задачи:\n${tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n')}`
        : 'У вас нет задач.'
    } else {
      response = 'Не удалось распознать действие. Попробуйте сформулировать иначе.'
    }

    await ctx.reply(response)
  } catch (e) {
    console.error('Ошибка обработки голосового сообщения:', e.message, e.stack)
    await ctx.reply('Произошла ошибка при обработке вашего голосового сообщения.')
  }
})

bot.on(message('text'), async (ctx) => {
  try {
    await ctx.reply(code('Сообщение принято. Жду ответа от сервера...'))

    const userMessage = ctx.message.text
    const action = await analyzeIntent(userMessage)

    let response = ''
    if (action.startsWith('add_task:')) {
      const [, description, type] = action.split(':')
      const task = await addTask(description.trim(), type.trim())
      response = `Задача добавлена: "${task.description}" (${task.category})`
    } else if (action.startsWith('remove_task:')) {
      const identifier = action.replace('remove_task:', '').trim()
      const success = await removeTask(identifier)
      response = success
        ? `Задача "${identifier}" выполнена и удалена.`
        : `Задача "${identifier}" не найдена.`
    } else if (action === 'list_tasks') {
      const tasks = await listTasks()
      response = tasks.length
        ? `Ваши задачи:\n${tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n')}`
        : 'У вас нет задач.'
    } else {
      response = 'Не удалось распознать действие. Попробуйте сформулировать иначе.'
    }


    await ctx.reply(action)
    await ctx.reply(response)
  } catch (e) {
    console.error('Ошибка обработки текстового сообщения:', e.message, e.stack)
    await ctx.reply('Произошла ошибка при обработке вашего сообщения.')
  }
})

bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Я бот, который поможет вам управлять временем и задачами. ' +
      'Отправьте текстовое или голосовое сообщение, чтобы я помог вам организовать ваш день или решить задачи. ' +
      'Пример: "Добавить задачу прибраться дома в срочные и сложные". Давайте начнём!'
  )
})

bot.command('tasks', async (ctx) => {
  try {
    await ctx.reply('Сообщение принято. Жду ответа от сервера...')

    const tasks = await listTasks() 
    if (typeof tasks === 'string') {
      await ctx.reply(tasks)
    } else {
      const formattedTasks = tasks.map((t, i) => `${i + 1}. ${t.description} (${t.category})`).join('\n')
      await ctx.reply(`Ваши задачи:\n${formattedTasks}`)
    }
  } catch (error) {
    console.error('Ошибка при выводе задач:', error)
    await ctx.reply('Не удалось получить список задач.')
  }
})

bot.launch()

process.on('SIGINT', () => bot.stop('SIGINT'))
process.on('SIGTERM', () => bot.stop('SIGTERM'))
