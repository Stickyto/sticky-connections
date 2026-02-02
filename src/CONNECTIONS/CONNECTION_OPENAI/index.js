const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_OPENAI',
  type: 'CONNECTION_TYPE_AI',
  name: 'OpenAI',
  color: '#000000',
  logo: cdn => `${cdn}/connections/CONNECTION_OPENAI.svg`,
  configNames: ['Model', 'API key'],
  configDefaults: ['gpt-5', 'sk-proj-'],
  methods: {
    magic: {
      name: 'Magic',
      logic: async ({ connectionContainer, config, body }) => {
        const [configModel, configApiKey] = config
        const r1 = await await fetch(
          'https://api.openai.com/v1/responses',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${configApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: configModel,
              instructions: body.systemMessage,
              input: body.userMessage
            })
          }
        )

        const data1 = await r1.json()
        global.rdic.logger.log({}, '[CONNECTION_OPENAI] 1', { body, configModel })
        global.rdic.logger.log({}, '[CONNECTION_OPENAI] 2', data1)

        const text = data1?.output
          ?.find(o => o.type === 'message')
          ?.content
          ?.find(c => c.type === 'output_text')
          ?.text

        return typeof text === 'string'
          ? text
          : "Sorry, I can't answer that."

      }
    }
  }
})
