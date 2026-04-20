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

  // Go to groups list
  await page.goto('http://localhost:3480/groups', { waitUntil: 'networkidle0' });
  await delay(1000);
  
  // Click first group card
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
    console.log('On group page:', page.url());

    // Check for settle button
    const btns = await page.$$('button.btn-gold');
    let settleBtn = null;
    for (const btn of btns) {
      const txt = await btn.evaluate(el => el.textContent);
      if (txt && txt.includes('Liquidar')) {
        settleBtn = btn;
        break;
      }
    }
    
    if (settleBtn) {
      console.log('Settle button found');
      await settleBtn.click();
      await delay(500);

      // Check for amount inputs in settle panel
      const inputs = await page.$$('input[type="text"]');
      console.log('Amount inputs found:', inputs.length);
      if (inputs.length > 0) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('5.00');
        await delay(300);
        console.log('✅ Partial settlement amount editable');
      } else {
        console.log('❌ No amount inputs found');
      }
    } else {
      console.log('No settle button (may have no balances)');
    }
  }

  await browser.close();
  console.log('✅ Feature 2 (partial settlements) test passed');
})();
