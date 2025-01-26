import axios from 'axios'
import { createWriteStream } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import ffmpeg from 'fluent-ffmpeg'
import installer from '@ffmpeg-installer/ffmpeg'
import { removeFile } from './utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

class OggConverter {
  constructor() {
    ffmpeg.setFfmpegPath(installer.path)
  }

  async create(url, filename) {
    const oggPath = resolve(__dirname, '../voices', `${filename}.ogg`)
    try {
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
      })
      return new Promise((resolve) => {
        const stream = createWriteStream(oggPath)
        response.data.pipe(stream)
        stream.on('finish', () => resolve(oggPath))
      })
    } catch (e) {
      console.log('Ошибка создания аудиофайла', e.message)
    }
  }

  async toMp3(path, id) {
    try {
      const outputPath = resolve(__dirname, '../voices', `${id}.mp3`)
      return new Promise((resolve, reject) => {
        ffmpeg(path)
          .inputOption('-t 30')
          .output(outputPath)
          .on('end', () => {
            removeFile(path)
            resolve(outputPath)
          })
          .on('error', (e) => reject(e.message))
          .run()
      })
    } catch (e) {
      console.log('Ошибка конвертации аудиофайла в формат mp3:', e.message)
    }
  }
}

export const ogg = new OggConverter()
