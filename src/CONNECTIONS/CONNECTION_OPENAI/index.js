const path = require('node:path')

const { assert, uuid } = require('@stickyto/openbox-node-utils')
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
    magicBucketAdd: {
      name: 'Knowledge pack -> Add',
      logic: async ({ connectionContainer, config, body }) => {
        const [configModel, configApiKey] = config
        const r1Body = {
          name: body.name,
          metadata: {
            magicBucketId: body.magicBucketId
          }
        }
        const r1 = await fetch(
          'https://api.openai.com/v1/vector_stores',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${configApiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify(r1Body)
          }
        )
        const data1 = await r1.json()
        return data1.id
      }
    },
    magicBucketDelete: {
      name: 'Knowledge pack -> Delete',
      logic: async ({ connectionContainer, config, body }) => {
        const [configModel, configApiKey] = config
        const r1 = await fetch(
          `https://api.openai.com/v1/vector_stores/${body.magicConnectionId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${configApiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        )
        const data1 = await r1.json()
        assert(r1.ok, [data1.error?.message, data1.error?.type, data1.error?.code].filter(Boolean).join(' / '))
      }
    },
    magicBucketAddItem: {
      name: 'Knowledge pack -> Add item',
      logic: async ({ connectionContainer, config, body }) => {
        const SUPPORTED_EXTENSIONS = new Set([
          '.pdf',
          '.txt',
          '.md',
          '.html',
          '.docx',
          '.pptx',
          '.json',
          '.csv'
        ])

        const [configModel, configApiKey] = config

        const urlObject = new URL(body.url)
        const fileName = path.basename(urlObject.pathname) || `upload---${Date.now()}`
        const extension = path.extname(fileName).toLowerCase()
        assert(
          SUPPORTED_EXTENSIONS.has(extension),
          `Unsupported vector store file extension: ${extension || '(none)'}.`
        )

        const asDownloaded = await fetch(body.url)
        if (!asDownloaded.ok) {
          throw new Error(`Download failed ${asDownloaded.status}: ${await asDownloaded.text()}`)
        }

        const form = new FormData()
        form.append(
          'file',
          await asDownloaded.blob(),
          fileName
        )
        form.append('purpose', 'user_data')

        const r1 = await fetch(
          'https://api.openai.com/v1/files',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${configApiKey}`
            },
            body: form
          }
        )

        const text1 = await r1.text()
        const data1 = text1 ? JSON.parse(text1) : {}
        assert(r1.ok, [data1.error?.message, data1.error?.type, data1.error?.code].filter(Boolean).join(' / '))

        const r2 = await fetch(
          `https://api.openai.com/v1/vector_stores/${body.magicBucket.magicConnectionId}/files`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${configApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file_id: data1.id
            })
          }
        )

        const text2 = await r2.text()
        const data2 = text2 ? JSON.parse(text2) : {}
        assert(r1.ok, [data2.error?.message, data2.error?.type, data2.error?.code].filter(Boolean).join(' / '))

        return data1.id
      }
    },
    magic: {
      name: 'Magic',
      logic: async ({ connectionContainer, config, body }) => {
        const [configModel, configApiKey] = config
        const r1 = await fetch(
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
