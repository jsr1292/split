const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const delay = ms => new Promise(r => setTimeout(r, ms));

const screenshotDir = '/home/jsr12/.openclaw/workspace/';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Login first
  await page.goto('http://localhost:3480/auth/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'test@test.com');
  await page.type('#password', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await delay(2000);

  // Screenshot 1: Home page
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3480/', { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: screenshotDir + 'split-home.png', fullPage: false });
  console.log('Saved: split-home.png');

  // Screenshot 2: Groups list
  await page.goto('http://localhost:3480/groups', { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: screenshotDir + 'split-groups.png', fullPage: false });
  console.log('Saved: split-groups.png');

  // Screenshot 3: Group detail with charts
  const groupLinks = await page.$$('a[href*="/groups/"]');
  for (const link of groupLinks) {
    const href = await link.evaluate(el => el.getAttribute('href'));
    if (href && !href.includes('/new') && !href.includes('/edit')) {
      await page.goto('http://localhost:3480' + href, { waitUntil: 'networkidle0' });
      await delay(1000);
      await page.screenshot({ path: screenshotDir + 'split-group-detail.png', fullPage: false });
      console.log('Saved: split-group-detail.png');
      break;
    }
  }

  // Screenshot 4: Person page
  const personLinks = await page.$$('a[href^="/people/"]');
  if (personLinks.length > 0) {
    await personLinks[0].click();
    await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
    await delay(1000);
    await page.screenshot({ path: screenshotDir + 'split-person.png', fullPage: false });
    console.log('Saved: split-person.png');
  }

  // Screenshot 5: Light theme
  await page.goto('http://localhost:3480/', { waitUntil: 'networkidle0' });
  await delay(500);
  const themeBtn = await page.$('.theme-toggle');
  if (themeBtn) {
    await themeBtn.click(); // light
    await themeBtn.click(); // back to dark
  }
  await page.screenshot({ path: screenshotDir + 'split-light-theme.png', fullPage: false });
  console.log('Saved: split-light-theme.png');

  await browser.close();
  console.log('All screenshots saved to', screenshotDir);
})();
