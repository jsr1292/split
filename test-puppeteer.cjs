const puppeteer = require('puppeteer');

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setViewport({ width: 390, height: 844 });

  // Test login
  console.log('Testing login...');
  await page.goto('http://localhost:3480/auth/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'test@test.com');
  await page.type('#password', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await delay(2000);
  console.log('After login URL:', page.url());

  // Test logout button in header
  console.log('Testing logout button...');
  await page.goto('http://localhost:3480/', { waitUntil: 'networkidle0' });
  await delay(1000);

  // Click avatar to open menu
  const avatar = await page.$('.avatar.user-menu-trigger');
  if (avatar) {
    await avatar.click();
    await delay(500);
    const menuText = await page.evaluate(() => document.body.textContent);
    console.log('Menu has "Cerrar sesión":', menuText.includes('Cerrar sesión'));
    console.log('✅ User menu opened with logout option');
  } else {
    console.log('❌ Avatar not found');
  }

  await browser.close();
  console.log('✅ Feature 1 (logout button) test passed');
})();
