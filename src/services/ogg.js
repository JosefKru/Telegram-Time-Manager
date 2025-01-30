import axios from 'axios'
import fs from 'fs'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const AUDIO_DIR = path.resolve('data/audio')
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true })
}

export const ogg = {
  async create(url, userId) {
    const oggPath = path.resolve(AUDIO_DIR, `${userId}.ogg`)
    const response = await axios({ url, responseType: 'stream' })
    const writer = fs.createWriteStream(oggPath)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(oggPath))
      writer.on('error', reject)
    })
  },

  toMp3(oggPath, userId) {
    return new Promise((resolve, reject) => {
      const mp3Path = path.resolve(AUDIO_DIR, `${userId}.mp3`)
      ffmpeg(oggPath)
        .output(mp3Path)
        .on('end', () => {
          fs.unlinkSync(oggPath)
          resolve(mp3Path)
        })
        .on('error', reject)
        .run()
    })
  },
}
