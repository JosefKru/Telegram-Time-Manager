import fs from 'fs'

export default async function startHandler(ctx) {
  const chatId = ctx.chat.id
  fs.writeFileSync('data/chatId.json', JSON.stringify({ chatId }))

  await ctx.reply(
    'Привет! Я бот, который поможет вам управлять временем и задачами. ' +
      'Отправьте текстовое или голосовое сообщение, чтобы я помог вам организовать ваш день или решить задачи. ' +
      'Пример: "Добавить задачу прибраться дома в срочные и сложные". Давайте начнём!'
  )
}
