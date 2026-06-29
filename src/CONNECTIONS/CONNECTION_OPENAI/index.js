const path = require('node:path')

const { assert, uuid, getNow } = require('@stickyto/openbox-node-utils')
const { FederatedUser, Event, MagicBucket } = require('openbox-entities')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_OPENAI',
  type: 'CONNECTION_TYPE_AI',
  name: 'OpenAI',
  color: '#000000',
  logo: cdn => `${cdn}/connections/CONNECTION_OPENAI.svg`,
  configNames: ['Model', 'API key'],
  configDefaults: ['gpt-5', 'sk-proj-'],

  eventHooks: {
    'MESSAGE': async function (config, connectionContainer) {
      const { rdic, user, application, thing, customData, createEvent } = connectionContainer
      const [configModel, configApiKey] = config

      assert(user, 'There is no dashboard attached to this MESSAGE event. You have been warned.')
      assert(application, 'There is no flow attached to this MESSAGE event. You have been warned.')

      const rawRecentEvents = await rdic.get('datalayerRelational').read(
        'events',
        {
          user_id: user.id,
          application_id: application.id,
          type: 'MESSAGE'
        },
        'created_at ASC',
        10
      )

      const allMagicBuckets = (await rdic.get('datalayerRelational').read('magic_buckets', {}, 'created_at ASC')).map(_ => new MagicBucket().fromDatalayerRelational(_))

      const recentEvents = rawRecentEvents.map(_ => new Event().fromDatalayerRelational(_))

      const chatFederatedUsersQuery = { user_id: user.id, id: customData.chatFederatedUserIds, magic_buckets: '!!!{}' }
      const rawChatFederatedUsers = await rdic.get('datalayerRelational').read(
        'federated_users',
        chatFederatedUsersQuery,
        'created_at ASC'
      )
      const chatFederatedUsers = rawChatFederatedUsers.map(rawFu => new FederatedUser().fromDatalayerRelational(rawFu))

      for (let i = 0; i < chatFederatedUsers.length; i++) {
        const currentFu = chatFederatedUsers[i]
        const executeBody = {
          "model": configModel,
          "instructions": `You are a conversational assistant.

The attached vector stores are the authoritative source of information. When answering questions about their contents, rely exclusively on the information contained within them.

Do not supplement, expand, correct, normalize, or "fill in" missing details using your own general knowledge, training data, assumptions, or common industry practices.

When the attached vector stores contain structured information such as menus, specifications, procedures, product details, recipes or reference material, preserve the original content as closely as possible. Keep the original quantities, units, terminology, ordering, abbreviations, and formatting where practical.

Do not convert units, standardize terminology, or rewrite instructions into a canonical form. Do not add ingredients, steps, explanations, variations, or background information that are not present in the vector stores.

If the retrieved information is abbreviated or incomplete, present it as-is and, if necessary, explain that no further information was available.

Treat the vector stores as intentionally authored, even if their contents differ from common practice or your prior knowledge.

Respond naturally and conversationally, but ensure that every factual statement about the subject is supported by the attached vector stores.`,
          "tools": [
            {
              "type": "file_search",
              "vector_store_ids": currentFu.magicBuckets.toArray().map(_ => allMagicBuckets.find(__ => __.id === _)).filter(_ => _).map(_ => _.magicConnectionId),
              "max_num_results": 10
            }
          ],
          input: [
            ...recentEvents.map(re => ({
              role: re.customData.get('align') === 'right' ? 'user' : 'assistant',
              content: `Previous message from ${re.customData.get('fromName')}: ${re.customData.get('message')}`
            })),
            {
              role: 'user',
              content: `Current message from ${customData.fromName}: ${customData.message}`
            }
          ]
        }
        console.warn('[DebugLater70] executeBody', JSON.stringify(executeBody, null, 2))

        const r1 = await fetch(
          'https://api.openai.com/v1/responses',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${configApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(executeBody)
          }
        )

        const data1 = await r1.json()
        const output = Array.isArray(data1.output) ? data1.output : []
        const texts = []

        for (const item of output) {
          if (!item || item.type !== 'message') continue
          if (item.role && item.role !== 'assistant') continue

          const content = Array.isArray(item.content)
            ? item.content
            : []

          for (const part of content) {
            if (!part || part.type !== 'output_text') continue
            if (typeof part.text !== 'string') continue
            texts.push(part.text)
          }
        }

        const finalMessage = texts.join('\n\n').trim()

        console.warn('[DebugLater70] finalMessage', finalMessage)

        createEvent(
          {
            type: 'MESSAGE',
            userId: user.id,
            applicationId: application.id,
            thingId: thing ? thing.id : undefined,
            federatedUserId: currentFu.id,
            customData: {
              'fromName': currentFu.name,
              'fromColorForeground': customData.fromColorForeground,
              'fromColorBackground': customData.fromColorBackground,
              'align': 'left',
              'message': finalMessage,
              'showResponseCorrect': false,
              'showResponseNotCorrect': false
            }
          }
        )
      }
    }
  },

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
          `https://api.openai.com/v1/vector_stores/${body.magicBucket.magicConnectionId}`,
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
