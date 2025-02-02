import startHandler from './startHandler.js'
import tasksHandler from './tasksHandler.js'
import voiceHandler from './voiceHandler.js'
import textHandler from './textHandler.js'
import { authHandler, authCodeHandler } from './authHandler.js'
import { addEventHandler } from './addEventHandler.js'

export function registerHandlers(bot) {
  bot.command('auth', authHandler)
  bot.command('authcode', authCodeHandler)
  bot.command('addevent', addEventHandler)
  bot.command('start', startHandler)
  bot.command('tasks', tasksHandler)
  bot.on('voice', voiceHandler)
  bot.on('text', textHandler)
}
