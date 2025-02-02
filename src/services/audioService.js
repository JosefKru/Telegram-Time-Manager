import fs from 'fs'
import config from 'config'
import client from '../openai.js'
import { unlink } from 'fs/promises'

export async function processAudio(mp3Path) {
  try {
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(mp3Path),
      model: 'whisper-1',
    })

    console.log(`🎙 Распознанный текст: ${transcription.text}`)

    // Анализируем текст и определяем, что хочет сделать пользователь
    return analyzeIntent(transcription.text)
  } catch (error) {
    console.error('❌ Ошибка обработки аудио:', error.message)
    throw error
  }
}

// Анализ текста через OpenAI
export async function analyzeIntent(userMessage) {
  try {
    const response = await client.chat.completions.create({
      model: config.get('openai.model'),
      messages: [
        {
          role: 'system',
          content: `
            Ты помощник по управлению задачами. Определи, что хочет сделать пользователь:
            - Если он хочет добавить задачу, ответь: "add_task:<описание задачи>:<тип задачи>".
            - Если он хочет удалить задачу, ответь: "remove_task:<описание задачи>".
            - Если он хочет узнать список задач, ответь: "list_tasks".
            Отвечай только инструкцией, без пояснений.
          `,
        },
        { role: 'user', content: userMessage },
      ],
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('❌ Ошибка OpenAI API:', error)
    throw new Error('Ошибка анализа намерений через OpenAI API.')
  }
}

// Удаление временных файлов
export async function removeFile(path) {
  try {
    await unlink(path)
    console.log(`🗑️ Файл удален: ${path}`)
  } catch (error) {
    console.error('❌ Ошибка удаления файла:', error.message)
  }
}
