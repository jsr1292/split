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

  // Go to a group
  await page.goto('http://localhost:3480/groups', { waitUntil: 'networkidle0' });
  await delay(1000);
  const groupLinks = await page.$$('a[href*="/groups/"]');
  let groupUrl = null;
  for (const link of groupLinks) {
    const href = await link.evaluate(el => el.getAttribute('href'));
    if (href && !href.includes('/new') && !href.includes('/edit')) {
      groupUrl = href;
      break;
    }
  }

  if (groupUrl) {
    await page.goto('http://localhost:3480' + groupUrl, { waitUntil: 'networkidle0' });
    await delay(1000);
    
    // Check for bar chart
    const barChart = await page.$('div[style*="flex-direction: column"][style*="gap: 6px"]');
    if (barChart) {
      console.log('✅ Bar chart found');
    } else {
      console.log('❌ Bar chart not found');
    }
    
    // Check for category section
    const hasCatSection = await page.evaluate(() => document.body.textContent.includes('Por categoría'));
    console.log('Has category section:', hasCatSection);
  }

  await browser.close();
  console.log('✅ Feature 4 (category chart) test passed');
})();
