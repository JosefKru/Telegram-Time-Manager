import * as chrono from 'chrono-node'
import { getEventsForDate } from '../services/googleCalendarService.js'

export const eventsHandler = async (ctx) => {
  const userId = ctx.from.id
  let text = ctx.message.text.replace('/events', '').trim()

  if (!text) {
    text = 'сегодня'
  }

  console.log('📌 Входящий текст:', text)
  let parsedDate = chrono.ru.parseDate(text, new Date())
  if (!parsedDate) {
    return ctx.reply('❌ Ошибка: не удалось определить дату. Попробуйте написать дату по-другому!')
  }

  // Фикс проблемы со сдвигом даты
  parsedDate.setHours(12, 0, 0, 0)

  // Обработка дней недели (всегда на следующую неделю, если день уже прошел)
  const today = new Date()
  if (text.match(/понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье/i)) {
    if (parsedDate < today) {
      parsedDate.setDate(parsedDate.getDate() + 7)
    }
  }

  // Принудительно устанавливаем 00:00 для корректного поиска событий
  const localDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())

  const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const formattedDate = localDate.toLocaleDateString('ru-RU', dateOptions)

  // Получаем существующие события
  const events = await getEventsForDate(
    userId,
    `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(
      localDate.getDate()
    ).padStart(2, '0')}`
  )

  if (!events || events.length === 0) {
    return ctx.reply(`❌ На ${formattedDate} нет запланированных событий.`)
  }

  // Формируем список событий
  let response = `📅 Расписание на ${formattedDate}:
`
  events.forEach((event) => {
    const startTime = new Date(event.start).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
    response += `- ${startTime} – ${event.summary}\n`
  })

  ctx.reply(response)
}
