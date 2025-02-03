import fs from 'fs'
import path from 'path'

const TOKENS_DIR = 'src/data/tokens';

export const logoutHandler = async (ctx) => {
    try {
      const userId = ctx.from.id
      const tokenPath = path.join(TOKENS_DIR, `${userId}.json`)
  
      if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath)
        ctx.reply('✅ Вы успешно вышли из аккаунта Google.')
      } else {
        ctx.reply('⚠️ Вы уже не авторизованы.')
      }
    } catch (error) {
      console.error('Ошибка при выходе:', error)
      ctx.reply('❌ Произошла ошибка при выходе.')
    }
  }
  