import fs from 'fs'

const logFile = 'error.log'

export const logError = (message, error) => {
  const logMessage = `[${new Date().toISOString()}] ${message} - ${error.message}\n`
  console.error(logMessage)
  fs.appendFileSync(logFile, logMessage)
}
