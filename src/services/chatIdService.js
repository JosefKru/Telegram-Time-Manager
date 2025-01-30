import fs from 'fs'
import path from 'path'

const chatIdFile = path.resolve('data/chatId.json')

export const loadChatId = () => {
  try {
    if (!fs.existsSync(chatIdFile)) {
      console.log('⚠️ chatId.json не найден. Напишите /start боту, чтобы установить chatId.')
      return null
    }

    const data = fs.readFileSync(chatIdFile, 'utf8')
    const parsedData = JSON.parse(data)

    if (!parsedData.chatId) {
      console.error('⚠️ Ошибка: chatId отсутствует в файле.')
      return null
    }

    return parsedData.chatId
  } catch (error) {
    console.error('❌ Ошибка загрузки chatId:', error)
    return null
  }
}
