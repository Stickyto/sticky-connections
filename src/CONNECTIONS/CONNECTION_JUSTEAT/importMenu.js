const puppeteer = require('puppeteer')

const importMenu = async (link) => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  const wait = async (time) => await new Promise(r => setTimeout(r, time))

  await page.setViewport({ width: 1080, height: 1024 })

  await page.goto(link)

  const [accept] = await page.$x('//button[contains(., \' Accept all cookies \')]')
  if (accept) {
    await accept.click()
  }

  const buttons = await page.$$('.c-menuItems-item')

  const menu = []

  for (let i = 0; i < buttons.length; i++) {
    const isAvailable = await buttons[i].evaluate(b => {
      b.click()
      return b.innerText.indexOf('Unavailable') === -1
    })

    if (!isAvailable) {
      continue
    }

    await page.waitForSelector('.c-modal-title')

    if (i === 0) {
      const [orderForLater] = await page.$x('//button[contains(., \'Order for later\')]')
      if (orderForLater) {
        await orderForLater.click()
        await wait(500)
      }
    }

    const itemElement = await page.$('.c-modal-titleContainer')
    const item = await itemElement.evaluate(y => {
      return y.innerText
    })

    const descriptionElement = await page.$('.c-itemSelector-description')
    let description
    if (descriptionElement) {
      description = await descriptionElement.evaluate(x => {
        return x.innerText
      })
    }

    const priceElement = await page.$('.c-itemSelector-price')
    let price
    if (priceElement) {
      price = await priceElement.evaluate(x => {
        return x.innerText
      })
    }

    const imageElement = await page.$('.c-itemSelector-imageContainer img')
    let imageSrc

    if (imageElement) {
      imageSrc = await imageElement.evaluate(y => {
        console.log('Danesh Y: ', y)
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
        optionsList = await itemSelctionElement.evaluate(x => {
          const options = Array.from(x.querySelectorAll('.c-itemSelector-section-name')).map(singleOptionNode => singleOptionNode.innerText)

          return options
        })
      }

      return {
        [i + 1]: optionsList, ...await Promise.resolve(acc)
      }
    }, {}))

    menu.push({
      item,
      description,
      price,
      cutomOptions,
      imageSrc
    })

    await page.click('[data-test-id=\'close-modal\']')
  }

  browser.close()
  return menu
}

module.exports = importMenu