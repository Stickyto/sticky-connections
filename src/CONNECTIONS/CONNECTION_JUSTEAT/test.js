const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const { executablePath } = require('puppeteer')

async function justEat() {
  console.log('danesh 0')
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  console.log('danesh 1', browser)
  const page = await browser.newPage()
  console.log('danesh 2', page)
  const wait = async (time) => await new Promise(r => setTimeout(r, time))

  await page.setViewport({ width: 1080, height: 1024 })

  await page.goto('https://www.just-eat.co.uk/restaurants-cheatmeals-west-hampstead/menu')

  const accept = await page.$('button[data-test-id="accept-all-cookies-button"]')

  const extractedText = await page.$eval('*', (el) => el.innerText)
  console.log('danesh 2.5 ', extractedText)
  if (accept) {
    await accept.click()
  }

  //start with sections here - array of object key name of cateogry array of products 
  const sections = await page.$$('.c-menuItems-category')
  const menu = []

  for (let i = 0; i < sections.length; i++) {
    console.log('danesh 3', page)

    const categoryNameElement = await sections[i].$('h2[data-test-id="menu-category-heading"]')
    const categoryName = await categoryNameElement.evaluate(y => {
      return y.innerText
    })

    const buttons = await sections[i].$$('.c-menuItems-item')
    // console.log('danesh 4', buttons)
    const category = {
      category: categoryName,
      products: []
    }

    for (let i = 0; i < buttons.length; i++) {
      console.log('Danesh LOOP 1')
      const isUnavailable = await buttons[i].evaluate(b => {
        b.click()
        return b.querySelector('.c-menuItems-price--offline')
      })

      if (isUnavailable) {
        continue
      }

      await page.waitForSelector('.c-modal-title')

      await wait(500)

      const preOrderModal = await page.$('[data-test-id=collection-and-delivery-preorder-modal]')
      const orderForLater = preOrderModal ? await preOrderModal.$('[data-test-id=action-button-component]') : undefined

      if (orderForLater) {
        await orderForLater.click()
        await wait(500)
      }

      const itemElement = await page.$('.c-modal-titleContainer')
      const item = await itemElement.evaluate(y => {
        return y.innerText
      })

      const descriptionElement = await page.$('.c-itemSelector-description')
      let description
      if (descriptionElement) {
        description = await descriptionElement.evaluate(_ => _.innerText)
      }

      const itemLabels = await page.$('.c-itemSelector-labels')

      const isVegetarian = (await (itemLabels ? itemLabels.$('.c-pieIcon--VegetarianSmall') : false)) ? true : null
      const isSpicy = (await (itemLabels ? itemLabels.$('.c-pieIcon--SpicySmall') : false)) ? true : null

      const priceElement = await page.$('.c-itemSelector-price')

      const price = priceElement ? await priceElement.evaluate(_ => {
        return parseInt(Array.from(_.childNodes).filter(child => child.nodeName === '#text')[0].wholeText.replace(/\D+/g, ''), 10)
      }) : 0

      const imageElement = await page.$('.c-itemSelector-imageContainer img')
      let imageSrc

      if (imageElement) {
        imageSrc = await imageElement.evaluate(y => {
          return y.src
        })
      }

      let itemSelctionElements = await page.$$('.c-itemSelector-section')

      itemSelctionElements.map(async itemSelctionElement => {
        const options = await itemSelctionElement.$$('.c-itemSelector-section-label')
        if (options[0]) {
          await options[0].evaluate(option => { option.click() })
        }
      })

      await wait(500)

      itemSelctionElements = await page.$$('.c-itemSelector-section')

      const cutomOptions = await Promise.resolve(itemSelctionElements.reduce(async (acc, itemSelctionElement, i) => {
        let optionsList
        if (itemSelctionElement) {
          optionsList = await itemSelctionElement.evaluate(_ => {
            const options = Array.from(_.querySelectorAll('.c-itemSelector-section-name')).map(singleOptionNode => {
              const optionText = Array.from(singleOptionNode.querySelectorAll('span'))[0].innerText

              const priceNode = singleOptionNode.querySelector('.c-itemSelector-section-cost')

              const price = priceNode ? parseInt(priceNode.innerText.replace(/\D+/g, ''), 10) : 0

              return {
                option: optionText, additionalPrice: price
              }
            })

            return options
          })
        }

        return {
          [i + 1]: optionsList, ...await Promise.resolve(acc)
        }
      }, {}))

      category.products.push({
        item,
        description,
        price,
        cutomOptions,
        imageSrc,
        allergies: {
          isVegetarian,
          isSpicy,

        }
      })

      await page.click('[data-test-id=\'close-modal\']')
      console.log('Danesh LOOP 2')
    }

    menu.push(category)
  }



  browser.close()
  console.log('Danesh menu: ', JSON.stringify(menu, null, 2))
  return menu
}

justEat()