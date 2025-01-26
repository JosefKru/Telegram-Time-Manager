import config from 'config'

import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: config.get('OPENAI_API_KEY'),
})

export default client


