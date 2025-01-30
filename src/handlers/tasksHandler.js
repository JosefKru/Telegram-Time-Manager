import { listTasks } from '../services/taskService.js';

export default async function tasksHandler(ctx) {
  try {
    await ctx.reply('📋 Получаю список задач...');

    const tasks = await listTasks();
    if (!tasks.length) {
      await ctx.reply('У вас нет задач.');
      return;
    }

    const formattedTasks = tasks.map((t, i) => `${i + 1}. ${t.description} (${t.category})`).join('\n');
    await ctx.reply(`Ваши задачи:\n${formattedTasks}`);
  } catch (error) {
    console.error('Ошибка при выводе задач:', error);
    await ctx.reply('❌ Не удалось получить список задач.');
  }
}
