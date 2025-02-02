import cron from 'node-cron'
import { logError } from './logger.js'
import { bot } from './bot.js'

export const startScheduler = (chatId) => {
  cron.schedule(
    '0 9 * * *',
    async () => {
      if (!chatId) {
        await bot.telegram.sendMessage(chatId, '❌ Ошибка: chatId не установлен. Напишите команду /start')
        console.error('❌ Ошибка: chatId не установлен.')
        return
      }

      try {
        const fakeUpdate = {
          update_id: Date.now(),
          message: {
            message_id: Date.now(),
            from: { id: chatId, is_bot: false, first_name: 'Auto', username: 'AutoUser' },
            chat: { id: chatId, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '/tasks',
            entities: [{ offset: 0, length: 6, type: 'bot_command' }],
          },
        }

        await bot.handleUpdate(fakeUpdate)
      } catch (error) {
        logError('Ошибка выполнения cron-задачи', error)
        await bot.telegram.sendMessage(chatId, '❌ Ошибка при автоматическом запуске /tasks.')
      }
    },
    {
      scheduled: true,
      timezone: 'Europe/Moscow',
    }
  )
}
