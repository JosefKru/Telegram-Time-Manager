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
    console.error('❌ Chrono-node не смог распознать дату:', text)
    return ctx.reply('❌ Ошибка: не удалось определить дату. Попробуйте написать дату по-другому!')
  }

  const today = new Date().setHours(0, 0, 0, 0)
  const eventDay = new Date(parsedDate).setHours(0, 0, 0, 0)

  // Если дата в прошлом и не сегодня → переносим на будущую дату
  if (eventDay < today) {
    parsedDate.setDate(parsedDate.getDate() + 7)
  }

  // Если в тексте нет явного времени, ставим 09:00
  if (!/(\d{1,2}[:.]\d{2})/.test(text)) {
    parsedDate.setHours(9, 0, 0, 0)
  }

  console.log('📌 Итоговая дата:', parsedDate)

  const summary = text
    .replace(/(завтра|послезавтра|понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)/gi, '')
    .trim()
  const date = parsedDate.toISOString().split('T')[0]

  // Получаем существующие события
  const events = await getEventsForDate(userId, date)
  let startDateTime = parsedDate.toISOString()
  let endDateTime = new Date(parsedDate.getTime() + 60 * 60 * 1000).toISOString()

  // Проверяем конфликты
  let conflict = events.find((event) => {
    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)
    return (
      (new Date(startDateTime) >= eventStart && new Date(startDateTime) < eventEnd) ||
      (new Date(endDateTime) > eventStart && new Date(endDateTime) <= eventEnd)
    )
  })

  if (conflict) {
    // Если время занято, ищем ближайшее свободное
    const availableSlot = await findAvailableSlot(userId, date)
    startDateTime = availableSlot.startDateTime
    endDateTime = availableSlot.endDateTime

    ctx.reply(
      `⚠️ Время **${parsedDate.toLocaleTimeString()}** занято событием **"${
        conflict.summary
      }"**.\n  Я перенес вашу задачу на **${new Date(startDateTime).toLocaleTimeString()}**.`
    )
  }

  // Добавляем событие в календарь
  const response = await addEventToCalendar(userId, { summary, startDateTime, endDateTime })
  ctx.reply(response)
}
