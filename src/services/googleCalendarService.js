import fs from 'fs'
import { google } from 'googleapis'
import path from 'path'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']
const CREDENTIALS_PATH = './credentials.json'
const TOKENS_DIR = 'src/data/tokens'

export let googleAuthClient = null

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

  const startOfDay = new Date(`${date}T07:00:00+03:00`) // 07:00
  const endOfDay = new Date(`${date}T23:59:00+03:00`) // 23:59

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

  // Минимальная длительность события (30 минут)
  const eventDuration = 30 * 60 * 1000

  let availableStart = startOfDay

  for (let slot of busySlots) {
    if (availableStart.getTime() + eventDuration <= slot.start.getTime()) {
      // Нашли свободное время
      return {
        startDateTime: availableStart.toISOString(),
        endDateTime: new Date(availableStart.getTime() + eventDuration).toISOString(),
      }
    }
    availableStart = new Date(slot.end.getTime()) // Сдвигаем на конец текущего события
  }

  // Если весь день занят, возвращаем null
  if (availableStart.getTime() + eventDuration > endOfDay.getTime()) {
    throw new Error('❌ Нет доступного времени в этот день.')
  }

  // Если после всех событий есть место — берем его
  return {
    startDateTime: availableStart.toISOString(),
    endDateTime: new Date(availableStart.getTime() + eventDuration).toISOString(),
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
  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH))
    const { client_secret, client_id, redirect_uris } = credentials.installed
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

    const { tokens } = await oAuth2Client.getToken(code)
    oAuth2Client.setCredentials(tokens)

    const tokenPath = `${TOKENS_DIR}/${userId}.json`
    fs.writeFileSync(tokenPath, JSON.stringify(tokens))

    return '✅ Авторизация успешна! Теперь вы можете добавлять события в календарь.'
  } catch (error) {
    console.error('Ошибка при сохранении токена:', error)

    if (error.message.includes('invalid_grant')) {
      throw new Error('❌ Ошибка: неверный код авторизации.')
    } else {
      throw new Error('❌ Внутренняя ошибка сервера.')
    }
  }
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

export const getAuthClient = async (userId) => {
  const tokenPath = path.join(TOKENS_DIR, `${userId}.json`)

  if (!fs.existsSync(tokenPath)) {
    throw new Error('❌ Ошибка: пользователь не авторизован.')
  }

  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'))
  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'))

  const { client_secret, client_id, redirect_uris } = credentials.installed
  const authClient = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

  authClient.setCredentials(token)

  // Проверяем, если токен истек и есть refresh_token → обновляем access_token
  if (token.expiry_date && token.expiry_date < Date.now()) {
    try {
      const { credentials: newToken } = await authClient.refreshAccessToken()
      authClient.setCredentials(newToken)

      // Сохраняем обновленный токен
      fs.writeFileSync(tokenPath, JSON.stringify(newToken))
      console.log(`🔄 Токен обновлен для пользователя ${userId}`)
    } catch (error) {
      console.error('Ошибка обновления токена:', error)
      throw new Error('❌ Ошибка: не удалось обновить токен. Авторизуйтесь заново с помощью /auth')
    }
  }

  return authClient
}

// Функция добавления события
export const addEventToCalendar = async (userId, event) => {
  try {
    const auth = await getAuthClient(userId)
    const calendar = google.calendar({ version: 'v3', auth })

    const eventStartTime = new Date(event.startDateTime)
    const eventEndTime = new Date(event.endDateTime)

    const minTime = new Date(eventStartTime)
    minTime.setHours(7, 0, 0, 0) // 07:00 - минимальное время начала событий

    // Проверяем, не раньше ли событие 07:00
    if (eventStartTime < minTime) {
      return `❌ Ошибка: нельзя добавлять события раньше 07:00. Выберите другое время.`
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: event.summary,
        start: { dateTime: event.startDateTime, timeZone: 'Europe/Moscow' },
        end: { dateTime: event.endDateTime, timeZone: 'Europe/Moscow' },
      },
    })

    return `✅ Событие создано: ${response.data.htmlLink}`
  } catch (error) {
    console.error('Ошибка при добавлении события:', error)
    return `❌ Ошибка: ${error.message}`
  }
}
