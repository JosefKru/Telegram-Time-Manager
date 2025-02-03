import { code } from 'telegraf/format'
import { analyzeIntent, processAudio } from '../services/audioService.js'
import { ogg } from '../services/oggService.js'
import { addEventHandler } from '../handlers/addEventHandler.js'

export default async function voiceHandler(ctx) {
  try {
    await ctx.reply(code('Сообщение принято. Жду ответа от сервера...'))

    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)

    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    const transcription = await processAudio(mp3Path)
    await ctx.reply(`🎙 Распознанный текст: "${transcription}"`)

    if (
      /\b(добавь событие|запланируй|создай встречу|назначь встречу|поставь напоминание|добавь в календарь|поставь событие|поставь встречу|запиши в календарь|создай напоминание|добавь встречу)\b/i.test(
        transcription
      )
    ) {
      ctx.message.text = transcription
        .replace(
          /\b(добавь событие|запланируй|создай встречу|назначь встречу|поставь напоминание|добавь в календарь|поставь событие|поставь встречу|запиши в календарь|создай напоминание|добавь встречу)\b/gi,
          ''
        )
        .replace(/^[,.\s]+|[,.\s]+$/g, '') // Удаляем лишние знаки и пробелы
        .replace(/[«»"]/g, '') // Убираем кавычки
        .trim()

      ctx.message.text = `/addevent ${ctx.message.text}`
      await addEventHandler(ctx)
      return
    }

    // Дополнительная проверка, если Whisper добавил "add_task"
    if (transcription.toLowerCase().includes('add_task')) {
      ctx.message.text = transcription.replace('add_task:', '/addevent ').trim()
      await addEventHandler(ctx)
      return
    }

    await ctx.reply('❌ Не понял команду. Попробуйте еще раз.')
  } catch (error) {
    console.error('Ошибка обработки голосового сообщения:', error)
    await ctx.reply('❌ Ошибка обработки голосового сообщения. Попробуйте еще раз.')
  }
}
