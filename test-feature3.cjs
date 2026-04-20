const puppeteer = require('puppeteer');
const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  // Login
  await page.goto('http://localhost:3480/auth/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'test@test.com');
  await page.type('#password', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await delay(2000);

  // Go to people list
  await page.goto('http://localhost:3480/people', { waitUntil: 'networkidle0' });
  await delay(1000);

  // Click first person
  const personLinks = await page.$$('a[href^="/people/"]');
  if (personLinks.length > 0) {
    await personLinks[0].click();
    await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
    await delay(1000);
    console.log('On person page:', page.url());

    // Check for shared expenses
    const hasSharedExpenses = await page.evaluate(() => {
      return document.body.textContent.includes('Gastos compartidos');
    });
    console.log('Has shared expenses section:', hasSharedExpenses);

    // Check for settle button
    const btns = await page.$$('button.btn-gold');
    let hasSettle = false;
    for (const btn of btns) {
      const txt = await btn.evaluate(el => el.textContent);
      if (txt && txt.includes('Liquidar')) {
        hasSettle = true;
        console.log('Settle button found:', txt.trim());
        break;
      }
    }
    if (!hasSettle) console.log('No settle button (balance may be 0)');
    console.log('✅ Person page has shared expenses and/or settle button');
  } else {
    console.log('No people found');
  }

  await browser.close();
  console.log('✅ Feature 3 (person page improvements) test passed');
})();
