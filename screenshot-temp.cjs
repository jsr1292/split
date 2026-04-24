const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  
  const BASE = 'http://localhost:3480';
  
  try {
    await page.goto(BASE + '/auth/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'qatest@test.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/groups', { timeout: 5000 }).catch(() => {});
    console.log('Logged in, URL:', page.url());
  } catch(e) {
    console.log('Login error:', e.message);
  }
  
  try {
    await page.goto(BASE + '/groups', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '/tmp/splitrr-groups.png', fullPage: false });
    console.log('Groups screenshot saved');
  } catch(e) {
    console.log('Groups error:', e.message);
  }
  
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '/tmp/splitrr-dashboard.png', fullPage: false });
    console.log('Dashboard screenshot saved');
  } catch(e) {
    console.log('Dashboard error:', e.message);
  }

  await browser.close();
  console.log('Done');
})();
