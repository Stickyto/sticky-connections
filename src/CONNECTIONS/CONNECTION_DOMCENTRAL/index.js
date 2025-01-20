/* eslint-disable quotes */
/* eslint-disable max-len */
const { getNow } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')
// const makeRequest = require('./makeRequest')

const HEADERS = {
  'accept-language': 'en-GB,en;q=0.9',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
}

const DATA = {
  getStore: require('./data/getStore.json'),
  getMenu: require('./data/getMenu.json')
}

function getHeaders(configStoreId) {
  return {
    ...HEADERS,
    'cookie': `akacd_prod_uk_pr=1675196071~rv=19~id=9128eb3d8217729bffdb6b78d000daa4; aka_supported_browser=true; DPGDC=DC5; akaalb_alb01=~op=ProdUK:produk_origin1|~rv=35~m=produk_origin1:0|~os=44d4d9335661eb2014d9e1271072b451~id=6b7fc97ac01e3401adff4d105cb04798; Y-XSRF-TOKEN=sbp8efDIEfxD5EOjydKGteFt0N+pHCNXwDAClEf1WGs=; akavpau_vpc=1675110277~id=2738c30bd2c953a3f33f7ad9f15cfe48; DPG=tjgjwl4ioffkbaqmshcnemx3; BasicInformation=eMml36Y8aI2WMIXDKFJYPiBTzAfs78q5rn+FaZhpKNM=; DPGStore={"storeId":${configStoreId},"seoUrl":"${configStoreId}"}; DPGFulfilmentMethod=Collection; __RequestVerificationToken=d5DaWvt6fbEJwaH8fTm4zPKXPR-1ZyKRKvIqNHVTaZtaZAEjbRdzLTjqHXJFGS_5KN2JUsYVWTMYI5lL--TzDRJtaUU1; XSRF-TOKEN=auWHYViLVmOnbV63lgxAJG_6dTZejJxn7JHZdSkxbBK3ETXKJpEDIqw5znXmeCgXHWovWtgJAA3RAYETdS8-ppy63Rc1; AKA_A2=A; _abck=C72A538AE57273AB238F7268E884D119~0~YAAQnofdWIjxqMGFAQAALVxlBQl+H+CTTEdD+nzU+mzOmHSttuXMVYPt+4lQSFoGSvuJqzCAY+vWe9KSo8JOaw+mkoyORA63+MFRWAloniZ/mjF+2G2EBuC0Agf/ubMn59qk8ArgTLfHoYp4XDqUu4pGGkPbucVl6kUer5iAiakBkkqo7OIDCZe0r4AHnZvqsjqxZmWTZGmnDvfS8ssQ2fXU28KFwvSByjQTgGfbZtdXiWQuBAc6kSi3wCjqaQbF55bF7GhlrT85X5H81rN6rBN94taKWBfZV+UEQkWkFEkGZ9EhwB84oo79Qv0FngUWErVQrcOr/xw9xSGdCQHX+SS2138HbGj0szoPPfjLMRQcYUB7sEdqsaSOVDJseLh7+MwnTgktjYeDVbd0wY/b7sjihZw07L0K0RcR~-1~-1~-1; bm_sz=09C6CABB70AC043D6EA862933106239C~YAAQnofdWIvxqMGFAQAALVxlBRJZuswgufL1RSIbKPzSVBnQs2weFS7jWTxud59PJDuchQdICPHYUuBaISDfdkRq5mcY6rmV+U7WvyoYRiTnk+gzlaRZFOYxPC8H8oX5eSHAdlLxkrTJOwbPUoZgA9rPEKwM1wxRZTHA1KmxPGpuJ4k4WSbCm9D2DESCObuTM3Av+LK8JbYIIni71WjMfdcRnjMX7gP2ifAtDcyp68l2oJAopZSJ/sPNxsmnqDaK2o9aF8voPdkJCvItqa5QM3c5rMGXB7FqyTJMmQJI0Spm35Oi36M=~4473157~4339010; bm_mi=64507D428B15F68F0C76BDC91B343F55~YAAQnofdWKr4qMGFAQAAuLtlBRLkYgqkOpRgvVheekeE5nQkupjpMnbNMjLD2iX8HIlp2cRFmnPduWdSszfePI7PcajaCeH0tWzgWsnzpSC9TYVExjfpaxGPVeON/9FY8yjGANyBvEC6YbsXfh/yHp4PvRS5PMGZ+gDKggxpYIUo1Mp52nlrLcYLlJBVTN3ZIxOlrFeRJLwRSqwuZo+e51l0IwBWi3GceiwnAUsS87aX0pB0W6lCW6ieYMNdLSN09eRl9AMqwx06HCI3X3fVlRWhTfWwxqXvar639aB03PUa+XuueaYP+ViPsH/MdNKFev0iTjsGiRPJmRM4QY6aqTQc776v8ZTCJX8=~1; ak_bmsc=C2B38429A814186942370AB172A0DF87~000000000000000000000000000000~YAAQnofdWAH5qMGFAQAA+L9lBRK6aK2M4nZ06JWUTyK6Ha58EtH8JpeFTP7T4NB4s6DcFEhf0WACmiKo/kYBE2BnvWAp3QI61WgfjSjorLI4u6RSsVOeREDsE7b8viJHNqGcJra6e+5AyubN+tVJsFhh/bF/FSiv7UACUr03iJvp4NYj/QG9Cw0xOlw43LmzAWgL1L1kLQiWmQ9X9EALjutq4bs2vFqk4hhGnsdlw03hjmEw6KRkgIuTa8N7PzC7tzTyjLmp1DglW1It73BfsUEf4BYave5RYX22HuO7fPhpCKE420CTjQM/IcMMcyCbFAKkiN++lSZ+QnrsybJMCyAjSj+Mj95XJz3KPukU0tAoG5AJzolZqI3educ6SmBfUdlVQutzQP++r0xFimT/N9ZEaDfhxr6c9pHoCSVZ9J3nCZiSY49huFkKRD3JHJt86Ll5zHHXYfHi; DPGSessionExp=1675129011827; bm_sv=EC4B91E24839A43CDDF01400150F2E38~YAAQnofdWGH9qMGFAQAAL/FlBRKz/gic2gJSbzYA3lVOjLj7snSNmR7Spg+nnZ3gpQyYZlhIpMPHr4rANRj8Hv3SyCMtNjE9xfJigIocaB57nAsTz1rx6ahvq6/wsy8Soi26ahSBbE0r450UT23HwEqMuZyGxnrxd+RYIWTT214rT+iZl4s3PBIqPY/ssgbMZYxcYCIzSZvtDHcQykc9+J7MIOFQ3UNtHyqLTglVzAxXhg0JOaDrFN0ChO8ncE+/G8YNCA==~1`
  }
}

module.exports = new Connection({
  id: 'CONNECTION_DOMCENTRAL',
  name: 'Domino\'s Pizza',
  color: '#393336',
  logo: cdn => `${cdn}/connections/CONNECTION_DOMCENTRAL.svg`,
  configNames: ['Store ID'],
  configDefaults: [''],
  partnerNames: ['Domino\'s Pizza'],
  // crons: [
  //   {
  //     id: 'generic',
  //     frequency: '*/2 * * * *',
  //     logic: async function (user, cronContainer) {
  //       const { rdic } = cronContainer
  //       global.rdic.logger.log({}, '[job-CONNECTION_DOMCENTRAL] [go]', { userId: user.id })
  //       try {
  //         const theirData = DATA.getMenu

  //         const allPcsToday = await cronContainer.getProductCategories(rdic, user, { connection: 'CONNECTION_DOMCENTRAL' })
  //         if (allPcsToday.length > 0) {
  //           // already configured product categories; exit early
  //           return
  //         }
  //         for (let tdI = 0; tdI < theirData.length; tdI++) {
  //           const td = theirData[tdI]
  //           const subMenus = td.subcategories.filter(_ => !(_.hasHalfAndHalf || _.hasCreateYourOwn))
  //           for (let tdI2 = 0; tdI2 < subMenus.length; tdI2++) {
  //             const td2 = subMenus[tdI2]
  //             const createdPis = []
  //             for (let pI = 0; pI < td2.products.length; pI++) {
  //               const p = td2.products[pI]

  //               const howManySizes = p.productSkus.length

  //               const tags = []
  //               p.isVegetarian && tags.push('vegan')
  //               p.isVegan && tags.push('vegetarian')
  //               p.isHot && tags.push('allergy--spicy')
  //               p.isGlutenFree && tags.push('gluten-free-really')
  //               const { id: createdPId } = await cronContainer.createProduct({
  //                 categories: Array.from(new Set(tags)),
  //                 userId: user.id,
  //                 theirId: p.productId,
  //                 createdAt: getNow() + pI,
  //                 connection: 'CONNECTION_DOMCENTRAL',
  //                 currency: user.currency,
  //                 name: p.name,
  //                 price: howManySizes === 1 ? Math.ceil(p.productSkus[0].price * 100, 10) : 0,
  //                 media: [
  //                   {
  //                     type: 'image',
  //                     url: p.imageUrl
  //                   }
  //                 ],
  //                 questions: howManySizes === 1 ? [] : [
  //                   {
  //                     type: 'option',
  //                     question: 'What size?',
  //                     answer: p.productSkus[0].name,
  //                     options: p.productSkus.map(_ => ({
  //                       type: 'option',
  //                       name: _.name,
  //                       theirId: _.productSkuId,
  //                       delta: Math.ceil(_.price * 100),
  //                       media: [
  //                         {
  //                           type: 'image',
  //                           url: `https://www.dominos.co.uk${_.iconUrl}`
  //                         }
  //                       ],
  //                       description: typeof _.calorie === 'number' ? `${_.calorie} calories` : undefined
  //                     }))
  //                   }
  //                 ],
  //                 description: p.description,
  //                 oneTapCheckout: p.description.length === 0
  //               })
  //               createdPis.push(createdPId)
  //             }
  //             await cronContainer.createProductCategory(
  //               {
  //                 userId: user.id,
  //                 name: td2.name,
  //                 // name: `${td.name} → ${td2.name}`,
  //                 color: '#1a1a18',
  //                 theirId: [td.name, td2.name].join('--__--'),
  //                 createdAt: getNow() + tdI,
  //                 connection: 'CONNECTION_DOMCENTRAL',
  //                 view: 'grid-name',
  //                 products: createdPis
  //               },
  //               user
  //             )
  //           }
  //         }
  //       } catch ({ message }) {
  //         const payload = {
  //           type: 'CONNECTION_BAD',
  //           userId: user.id,
  //           customData: { id: 'CONNECTION_DOMCENTRAL', message }
  //         }
  //         await cronContainer.createEvent(payload)
  //         global.rdic.logger.error({ user }, { message })
  //       }
  //     }
  //   }
  // ],
  methods: {
    getStore: {
      name: 'Get store',
      logic: async ({ config }) => {
        return DATA.getStore.data
      }
    }
  }
})
