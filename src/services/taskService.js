import s3 from '../aws.js'

// Функция добавления задачи в S3
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
    console.log('✅ Задача успешно добавлена:', task)
    return task
  } catch (error) {
    console.error('❌ Ошибка при добавлении задачи:', error)
    throw new Error('Не удалось добавить задачу.')
  }
}

// Функция получения списка задач из S3
export const listTasks = async () => {
  try {
    const params = {
      Bucket: 'task-manager-bucket',
      Prefix: 'tasks/',
    }

    const data = await s3.listObjectsV2(params).promise()
    const tasks = await Promise.all(
      data.Contents.map(async (file) => {
        const taskData = await s3.getObject({ Bucket: params.Bucket, Key: file.Key }).promise()
        return JSON.parse(taskData.Body.toString())
      })
    )

    return tasks
  } catch (error) {
    console.error('❌ Ошибка получения задач:', error)
    return []
  }
}

// Функция удаления задачи по её описанию
export const removeTask = async (description) => {
  try {
    const tasks = await listTasks()
    const taskToDelete = tasks.find((task) => task.description === description)

    if (!taskToDelete) {
      return false
    }

    const params = {
      Bucket: 'task-manager-bucket',
      Key: `tasks/${taskToDelete.timestamp}.json`,
    }

    await s3.deleteObject(params).promise()
    console.log(`✅ Задача удалена: ${description}`)
    return true
  } catch (error) {
    console.error('❌ Ошибка при удалении задачи:', error)
    return false
  }
}
