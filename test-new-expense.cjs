const puppeteer = require('puppeteer');
const delay = ms => new Promise(r => setTimeout(r, ms));
const screenshotDir = '/home/jsr12/.openclaw/workspace/';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3480/auth/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'test@test.com');
  await page.type('#password', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await delay(2000);

  // Navigate to new expense page
  await page.goto('http://localhost:3480/expense/new', { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: screenshotDir + 'split-new-expense.png', fullPage: true });
  console.log('Saved: split-new-expense.png');

  // Check if recurring dropdown exists
  const recurringSelect = await page.$('#recurring');
  console.log('Recurring select found:', !!recurringSelect);

  // Check if split mode toggle exists
  const totalBtn = await page.$$('button');
  let foundToggle = false;
  for (const btn of totalBtn) {
    const text = await btn.evaluate(el => el.textContent);
    if (text && text.includes('Importe total')) { foundToggle = true; break; }
  }
  console.log('Split mode toggle found:', foundToggle);

  await browser.close();
  console.log('Done');
})();
