import startHandler from './startHandler.js';
import tasksHandler from './tasksHandler.js';
import voiceHandler from './voiceHandler.js';
import textHandler from './textHandler.js';

export function registerHandlers(bot) {
  bot.command('start', startHandler);
  bot.command('tasks', tasksHandler);
  bot.on('voice', voiceHandler);
  bot.on('text', textHandler);
}
