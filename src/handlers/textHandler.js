import { code } from 'telegraf/format'
import { analyzeIntent } from '../services/audioService.js'
import { addTask, removeTask, listTasks } from '../services/taskService.js'

export default async function textHandler(ctx) {
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
}
