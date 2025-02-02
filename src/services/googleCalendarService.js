import fs from 'fs'
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']
const CREDENTIALS_PATH = './credentials.json'
const TOKENS_DIR = 'src/data/tokens'

if (!fs.existsSync(TOKENS_DIR)) {
  fs.mkdirSync(TOKENS_DIR, { recursive: true })
}

// Функция авторизации пользователя
export const authorizeUser = async (userId) => {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

  const tokenPath = `${TOKENS_DIR}/${userId}.json`
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath))
    oAuth2Client.setCredentials(token)
    return oAuth2Client
  } else {
    return null
  }
}

// 🔹 Поиск ближайшего свободного времени
export const findAvailableSlot = async (userId, date) => {
  const auth = await authorizeUser(userId)
  if (!auth) {
    throw new Error('❌ Вы не авторизованы. Используйте команду /auth')
  }

  const calendar = google.calendar({ version: 'v3', auth })
  const startOfDay = new Date(`${date}T00:00:00Z`)
  const endOfDay = new Date(`${date}T23:59:59Z`)

  const events = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  const busySlots = events.data.items.map((event) => ({
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date),
  }))

  let startTime = new Date(`${date}T09:00:00+03:00`)
  let endTime = new Date(`${date}T10:00:00+03:00`)

  // Проверяем занято ли время
  for (let slot of busySlots) {
    if (startTime >= slot.start && endTime <= slot.end) {
      // Если занято, сдвигаем на следующий час
      startTime.setHours(startTime.getHours() + 1)
      endTime.setHours(endTime.getHours() + 1)
    }
  }

  return {
    startDateTime: startTime.toISOString(),
    endDateTime: endTime.toISOString(),
  }
}

// Функция генерации ссылки для авторизации
export const getAuthUrl = () => {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH))
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })
}

// Функция обработки полученного кода от пользователя
export const saveUserToken = async (userId, code) => {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH))
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

  const { tokens } = await oAuth2Client.getToken(code)
  oAuth2Client.setCredentials(tokens)

  const tokenPath = `${TOKENS_DIR}/${userId}.json`
  fs.writeFileSync(tokenPath, JSON.stringify(tokens))

  return '✅ Авторизация успешна! Теперь вы можете добавлять события в календарь.'
}

// **Получить список событий на указанную дату**
export const getEventsForDate = async (userId, date) => {
  const auth = await authorizeUser(userId)
  if (!auth) return []

  const calendar = google.calendar({ version: 'v3', auth })
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  try {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    return res.data.items.map((event) => ({
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }))
  } catch (error) {
    console.error('Ошибка получения событий:', error)
    return []
  }
}

// 🔹 Функция добавления события
export const addEventToCalendar = async (userId, eventData) => {
  try {
    const auth = await authorizeUser(userId)
    if (!auth) return '❌ Вы не авторизованы. Используйте команду /auth'

    const calendar = google.calendar({ version: 'v3', auth })
    const event = {
      summary: eventData.summary || 'Новое событие',
      start: { dateTime: eventData.startDateTime, timeZone: 'Europe/Moscow' },
      end: { dateTime: eventData.endDateTime, timeZone: 'Europe/Moscow' },
    }

    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    })

    return `✅ Событие создано: ${res.data.htmlLink}`
  } catch (error) {
    console.error('Ошибка добавления события:', error)
    return '❌ Ошибка при добавлении события'
  }
}
