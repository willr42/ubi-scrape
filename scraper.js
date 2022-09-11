const URL = 'https://www.ubisoft.com/en-us/company/press';
const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');

// generate list of years, we'll need this later.
const YEAR_LIST = [];

for (let index = 2012; index <= 2022; index++) {
  YEAR_LIST.push(index);
}

async function run() {
  // establish a browser
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
  });

  // create a page object and wait for the content
  let page = await browser.newPage();
  await page.goto(URL, {
    waitUntil: 'domcontentloaded',
  });

  // There's a privacy modal that messes with our logic. Here we wait for it and then remove it.
  const selectorShowing = await page.waitForSelector('#privacy__modal__accept');
  await page.click('#privacy__modal__accept');

  // set an initial
  //   await page.select('select#pressYear', '2012');

  for (let index = 0; index < YEAR_LIST.length; index++) {
    const element = YEAR_LIST[index];
    // select the year in the dropdown
    console.log(`Downloading: ${element}`);
    await page.select('select#pressYear', element.toString());
    await downloadPage(page);
  }
}

async function downloadPage(page) {
  // required pages; -2 for the forward and back buttons.
  let pageAmount = (await page.$$('.pagination-list li')).length;

  // if it's less than 1, we just need one page
  if (pageAmount < 1) {
    pageAmount = 1;
  } else {
    pageAmount = pageAmount - 2;
  }

  // the overall array of every PDF in the year
  let totalElements = [];

  for (let index = 0; index < pageAmount; index++) {
    let pageElements = [];

    // get the initial information we need
    pageElements = await page.$$eval('.file-listing-wrap > a', (divs) =>
      divs.map((n) => {
        return {
          name: n.innerText,
          url: n.getAttribute('href'),
        };
      })
    );

    // push it onto the overall array
    totalElements.push(pageElements);

    // go to the next page, unless there's only one page needed
    if (pageAmount === 1) {
    } else {
      await page.click('.pagination-list .pl-next');
    }
  }

  // We've created an array of arrays, we just need one.
  const flattened = totalElements.flat();

  // The innertext is returning every element, we just want the first. There's probably a better way to do this...
  fixedNameElements = flattened.map((element) => {
    const nameArray = element.name.split('\n');
    const fixedName = nameArray[0].replace('/', '');
    return { name: fixedName, url: element.url };
  });

  // Finally, for each element in the final array, we download it.
  for (let index = 0; index < fixedNameElements.length; index++) {
    const element = fixedNameElements[index];

    await download(element.url, `output/${element.name}.pdf`);
  }
}

async function download(url, destination) {
  const file = fs.createWriteStream(destination);
  https.get(url, (res) => {
    res.pipe(file);
    file.on('finish', () => {
      file.close();
    });
  });
}

run();
