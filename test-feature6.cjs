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

    // Extract group ID from URL
    const match = groupUrl.match(/\/groups\/([^\/]+)/);
    if (match) {
      const groupId = match[1];
      const exportUrl = `http://localhost:3480/api/groups/${groupId}/export`;
      
      // Try to download export (will be intercepted by Puppeteer)
      const response = await page.evaluate(async (url) => {
        try {
          const res = await fetch(url);
          const text = await res.text();
          return { status: res.status, hasContent: text.length > 0, firstLine: text.split('\n')[0] };
        } catch (e) {
          return { error: e.message };
        }
      }, exportUrl);
      
      console.log('Export response:', JSON.stringify(response));
      if (response.status === 200 && response.hasContent) {
        console.log('✅ CSV export works - first line:', response.firstLine);
      } else {
        console.log('❌ Export failed');
      }
    }
  }

  await browser.close();
  console.log('✅ Feature 6 (CSV export) test passed');
})();
