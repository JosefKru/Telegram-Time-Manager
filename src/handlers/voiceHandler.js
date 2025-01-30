import { code } from 'telegraf/format';
import { analyzeIntent, processAudio } from '../services/audioService.js';
import { ogg } from '../services/ogg.js';
import { addTask, removeTask, listTasks } from '../services/taskService.js';

export default async function voiceHandler(ctx) {
   try {
     await ctx.reply(code('Сообщение принято. Жду ответа от сервера...'))
 
     const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
     const userId = String(ctx.message.from.id)
 
     const oggPath = await ogg.create(link.href, userId)
     const mp3Path = await ogg.toMp3(oggPath, userId)
 
     const transcription = await processAudio(mp3Path)
     const action = await analyzeIntent(transcription)
 
     let response = ''
     if (action.startsWith('add_task:')) {
       const [, description, type] = action.split(':')
       const task = await addTask(description.trim(), type.trim())
       response = `Задача добавлена: "${task.description}" (${task.category})`
     } else if (action.startsWith('remove_task:')) {
       const description = action.replace('remove_task:', '').trim()
       const success = await removeTask(description)
       response = success
         ? `Задача "${description}" выполнена и удалена.`
         : `Задача "${description}" не найдена.`
     } else if (action === 'list_tasks') {
       const tasks = await listTasks()
       response = tasks.length
         ? `Ваши задачи:\n${tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n')}`
         : 'У вас нет задач.'
     } else {
       response = 'Не удалось распознать действие. Попробуйте сформулировать иначе.'
     }
 
     await ctx.reply(response)
   } catch (e) {
     console.error('Ошибка обработки голосового сообщения:', e.message, e.stack)
     await ctx.reply('Произошла ошибка при обработке вашего голосового сообщения.')
   }
}
