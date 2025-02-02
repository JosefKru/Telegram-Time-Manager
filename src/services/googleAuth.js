import { google } from 'googleapis'
import fs from 'fs'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']
const CREDENTIALS_PATH = './credentials.json'
const TOKEN_PATH = 'src/data/tokens/token.json'

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'))
    oAuth2Client.setCredentials(token)
    console.log('✅ Авторизация уже выполнена.')
    return oAuth2Client
  } else {
    return getNewToken(oAuth2Client)
  }
}

function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })
  console.log(`🟢 Перейди по ссылке для авторизации: ${authUrl}`)
}

// ✅ Запускаем авторизацию при старте скрипта
authorize()
