import { addEventToCalendar } from '../services/googleCalendarService.js'
import { listTasks } from '../services/taskService.js'

export default async function tasksHandler(ctx) {
  try {
    await ctx.reply('📋 Получаю список задач...')

    const tasks = await listTasks()
    if (!tasks.length) {
      await ctx.reply('У вас нет задач.')
      return
    }

    const formattedTasks = tasks.map((t, i) => `${i + 1}. ${t.description} (${t.category})`).join('\n')
    await ctx.reply(`Ваши задачи:\n${formattedTasks}`)
  } catch (error) {
    console.error('Ошибка при выводе задач:', error)
    await ctx.reply('❌ Не удалось получить список задач.')
  }
}

export const addEventHandler = async (ctx) => {
  const userId = ctx.from.id
  const text = ctx.message.text.split(' ').slice(1).join(' ')
  const [summary, startDateTime, endDateTime] = text.split(';')

  if (!summary || !startDateTime || !endDateTime) {
    return ctx.reply(
      'Использование: /addevent Название; 2025-02-02T10:00:00+03:00; 2025-02-02T11:00:00+03:00'
    )
  }

  const response = await addEventToCalendar(userId, { summary, startDateTime, endDateTime })
  ctx.reply(response)
}
