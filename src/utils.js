import { unlink } from 'fs/promises'
import fs from 'fs'
import client from './openai.js'
import config from 'config'
import s3 from './aws.js'

export const addTask = async (description, category) => {
  try {
    const task = { description, category, completed: false, timestamp: Date.now() }
    const params = {
      Bucket: 'task-manager-bucket',
      Key: `tasks/${task.timestamp}.json`,
      Body: JSON.stringify(task),
      ContentType: 'application/json',
    }

    await s3.putObject(params).promise()
    console.log('Задача успешно добавлена:', task)
    return task
  } catch (error) {
    console.error('Ошибка при добавлении задачи:', error)
    throw new Error('Не удалось добавить задачу.')
  }
}

export const analyzeIntent = async (userMessage) => {
  try {
    const response = await client.chat.completions.create({
      model: config.get('openai.model'),
      messages: [
        {
          role: 'system',
          content: `
                You are a task management assistant. Analyze the user's input and decide what action to take:
                - If the user describes a new task, respond with: "add_task:<task_description>:<task_type>".
                - If the user mentions completing a task, respond with: "remove_task:<task_description>".
                - If the user asks about tasks, respond with: "list_tasks".
                Only respond with the exact instruction, without explanations or additional text.
              `,
        },
        { role: 'user', content: userMessage },
      ],
    })
    return response.choices[0].message.content
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw new Error('Ошибка взаимодействия с OpenAI API')
  }
}

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
