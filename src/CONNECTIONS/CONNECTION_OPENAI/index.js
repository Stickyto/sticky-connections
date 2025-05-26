const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_OPENAI',
  type: 'CONNECTION_TYPE_AI',
  name: 'OpenAI',
  color: '#000000',
  logo: cdn => `${cdn}/connections/CONNECTION_OPENAI.svg`,
  configNames: ['Model', 'API key'],
  configDefaults: ['gpt-4-turbo', 'sk-proj-'],
  methods: {
    magic: {
      name: 'Magic',
      logic: async ({ connectionContainer, config, body }) => {
        const [configModel, configApiKey] = config
        const r1 = await await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${configApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: configModel,
              temperature: 0,
              messages: [
                { role: 'system', content: body.systemMessage },
                { role: 'user', content: body.userMessage }
              ]
            })
          }
        )

        const data1 = await r1.json()
        global.rdic.logger.log({}, '[CONNECTION_OPENAI]', { body, configModel, data1 })
        return data1?.choices?.[0]?.message?.content && typeof data1.choices[0].message.content === 'string' ? data1.choices[0].message.content : "Sorry, I can't answer that."
      }
    }
  }
})

// {
//   "id": "chatcmpl-BahpP6yfPk8Xez25u8CWilAinyQiX",
//   "object": "chat.completion",
//   "created": 1748087983,
//   "model": "gpt-4-0613",
//   "choices": [
//     {
//       "index": 0,
//       "message": {
//         "role": "assistant",
//         "content": "I'm sorry, but I can't provide the answer because I don't have any information about X.",
//         "refusal": null,
//         "annotations": []
//       },
//       "logprobs": null,
//       "finish_reason": "stop"
//     }
//   ],
//   "usage": {
//     "prompt_tokens": 55,
//     "completion_tokens": 23,
//     "total_tokens": 78,
//     "prompt_tokens_details": {
//       "cached_tokens": 0,
//       "audio_tokens": 0
//     },
//     "completion_tokens_details": {
//       "reasoning_tokens": 0,
//       "audio_tokens": 0,
//       "accepted_prediction_tokens": 0,
//       "rejected_prediction_tokens": 0
//     }
//   },
//   "service_tier": "default",
//   "system_fingerprint": null
// }
