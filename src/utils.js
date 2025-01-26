import { unlink } from 'fs/promises'
import fs from 'fs'
import client from './openai.js'

export async function removeFile(path) {
  try {
    await unlink(path)
  } catch (e) {
    console.log('Ошибка удаления файла', e.message)
  }
}

export async function processAudio(mp3Path) {
  try {
    // Расшифровка аудио в текст
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(mp3Path),
      model: 'whisper-1',
    })

    // Взаимодействие с ChatGPT на основе расшифрованного текста
    const chatResponse = await client.chat.completions.create({
      model: config.get('openai.model'), 
      messages: [
        { role: 'system', content: config.get('openai.instruction') },
        { role: 'user', content: transcription.text },
      ],
    })

    return chatResponse.choices[0].message.content 
  } catch (error) {
    console.error('Ошибка обработки аудио:', error.message)
    throw error
  }
}

// Функция для ограничения длины истории (не превышаем лимит токенов)
export function limitSessionLength(session, maxTokens = 3000) {
  while (session.reduce((sum, msg) => sum + msg.content.length, 0) > maxTokens) {
    session.shift() // Удаляем самое старое сообщение
  }
}
