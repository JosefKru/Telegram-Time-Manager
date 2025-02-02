import AWS from 'aws-sdk'
import config from 'config'

const s3 = new AWS.S3({
  endpoint: 'https://storage.yandexcloud.net',
  accessKeyId: config.get('aws.accessKeyId'),
  secretAccessKey: config.get('aws.secretAccessKey'),
  region: 'ru-central1',
})

export const listTasks = async () => {
  try {
    const params = {
      Bucket: 'task-manager-bucket',
      Prefix: 'tasks/',
    }

    // Получение списка объектов из бакета
    const data = await s3.listObjectsV2(params).promise()

    if (!data.Contents || data.Contents.length === 0) {
      return 'Нет задач.'
    }

    const tasks = []
    for (const file of data.Contents) {
      const getObjectParams = {
        Bucket: 'task-manager-bucket',
        Key: file.Key,
      }

      const object = await s3.getObject(getObjectParams).promise()
      const task = JSON.parse(object.Body.toString('utf-8'))
      tasks.push(task)
    }

    return tasks
  } catch (error) {
    console.error('Ошибка получения задач:', error)
    throw new Error('Не удалось получить список задач.')
  }
}

export const removeTask = async (identifier) => {
  try {
    const params = {
      Bucket: 'task-manager-bucket',
      Prefix: 'tasks/',
    }

    // Получаем список задач
    const data = await s3.listObjectsV2(params).promise()
    if (!data.Contents || data.Contents.length === 0) {
      return false
    }

    const tasks = []
    for (const file of data.Contents) {
      const getObjectParams = {
        Bucket: 'task-manager-bucket',
        Key: file.Key,
      }
      const object = await s3.getObject(getObjectParams).promise()
      const task = JSON.parse(object.Body.toString('utf-8'))
      tasks.push({ ...task, Key: file.Key })
    }

    // Удаление по номеру
    if (!isNaN(identifier)) {
      const taskIndex = parseInt(identifier) - 1
      if (taskIndex >= 0 && taskIndex < tasks.length) {
        const taskToDelete = tasks[taskIndex]
        await s3.deleteObject({ Bucket: 'task-manager-bucket', Key: taskToDelete.Key }).promise()
        console.log(`Задача "${taskToDelete.description}" удалена.`)
        return true
      }
    }

    // Удаление по описанию
    const taskToDelete = tasks.find((task) => task.description === identifier)
    if (taskToDelete) {
      await s3.deleteObject({ Bucket: 'task-manager-bucket', Key: taskToDelete.Key }).promise()
      console.log(`Задача "${taskToDelete.description}" удалена.`)
      return true
    }

    return false
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error)
    throw new Error('Не удалось удалить задачу.')
  }
}

export default s3
