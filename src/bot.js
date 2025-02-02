import { Telegraf } from 'telegraf'
import config from 'config'
import { registerHandlers } from './handlers/index.js'
import { startScheduler } from './scheduler.js'
import { loadChatId } from './services/chatIdService.js'

export const bot = new Telegraf(config.TELEGRAM_TOKEN)

const chatId = loadChatId()
console.log(`🔹 Загруженный chatId: ${chatId}`)

registerHandlers(bot)

bot.launch().then(() => {
  console.log('✅ Бот запущен!')
})

// Планировщик
startScheduler(chatId)

process.on('SIGINT', () => bot.stop('SIGINT'))
process.on('SIGTERM', () => bot.stop('SIGTERM'))
