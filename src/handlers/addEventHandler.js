import * as chrono from 'chrono-node'
import { addEventToCalendar, findAvailableSlot, getEventsForDate } from '../services/googleCalendarService.js'


export const addEventHandler = async (ctx) => {
  const userId = ctx.from.id
  let text = ctx.message.text.replace('/addevent', '').trim()

  if (!text) {
    return ctx.reply(
      '❌ Ошибка: напишите название события и дату, например: `/addevent Помыть машину в четверг`'
    )
  }

  const replacements = {
    завтра: 'tomorrow',
    послезавтра: 'in 2 days',
    понедельник: 'next Monday',
    вторник: 'next Tuesday',
    среду: 'next Wednesday',
    четверг: 'next Thursday',
    пятницу: 'next Friday',
    субботу: 'next Saturday',
    воскресенье: 'next Sunday',
  }

  for (const [key, value] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`\\b${key}\\b`, 'gi'), value)
  }

  console.log('📌 Входящий текст:', text)
  let parsedDate = chrono.ru.parseDate(text)

  if (!parsedDate) {
    console.error('❌ Ошибка: Chrono-node не смог распознать дату из текста:', text)
    return ctx.reply('❌ Ошибка: не удалось определить дату. Попробуйте написать дату по-другому!')
  }

  const now = new Date()
  if (parsedDate < now) {
    parsedDate.setDate(parsedDate.getDate() + 7)
  }

  console.log('📌 Распознанная дата:', parsedDate)
  const summary = text
    .replace(/(завтра|послезавтра|понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)/gi, '')
    .trim()

  const date = parsedDate.toISOString().split('T')[0]

  // Получаем список событий на эту дату
  const events = await getEventsForDate(userId, date)
  let startDateTime = parsedDate.toISOString()
  let endDateTime = new Date(parsedDate.getTime() + 60 * 60 * 1000).toISOString()

  let conflict = events.find(
    (event) =>
      (startDateTime >= event.start && startDateTime < event.end) ||
      (endDateTime > event.start && endDateTime <= event.end)
  )

  if (conflict) {
    // Ищем ближайшее свободное время
    const availableSlot = await findAvailableSlot(userId, date)
    startDateTime = availableSlot.startDateTime
    endDateTime = availableSlot.endDateTime

    ctx.reply(`⚠️ Время **${parsedDate.toLocaleTimeString()}** уже занято событием: **"${
      conflict.summary
    }"**. 
  Я перенес вашу задачу на **${new Date(startDateTime).toLocaleTimeString()}**.`)
  }

  const response = await addEventToCalendar(userId, { summary, startDateTime, endDateTime })
  ctx.reply(response)
}
