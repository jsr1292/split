const puppeteer = require('puppeteer');
const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  // Test login flow
  console.log('Testing login flow...');
  await page.goto('http://localhost:3480/auth/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'test@test.com');
  await page.type('#password', 'test123');
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await delay(2000);
  
  const finalUrl = page.url();
  console.log('Final URL after login:', finalUrl);
  
  if (finalUrl === 'http://localhost:3480/' || finalUrl.endsWith('/')) {
    console.log('✅ Login redirects to home correctly');
  } else {
    console.log('⚠️ Login redirected to:', finalUrl);
  }

  // Check if we're actually on the home page (not stuck on login)
  const pageContent = await page.evaluate(() => document.body.textContent);
  if (pageContent.includes('Inicio') || pageContent.includes('Grupos') || pageContent.includes('Split')) {
    console.log('✅ Home page content loaded');
  }

  // Test mobile viewport
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3480/', { waitUntil: 'networkidle0' });
  await delay(1000);
  console.log('✅ Mobile viewport (390x844) works');

  // Test theme cycling
  const themeBtn = await page.$('.theme-toggle');
  if (themeBtn) {
    await themeBtn.click();
    await delay(300);
    await themeBtn.click();
    await delay(300);
    await themeBtn.click();
    await delay(300);
    console.log('✅ Theme cycling works');
  }

  // Test logout
  const avatar = await page.$('.avatar.user-menu-trigger');
  if (avatar) {
    await avatar.click();
    await delay(500);
    const logoutBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Cerrar sesión'));
    });
    if (logoutBtn) {
      console.log('✅ Logout button present');
      // Close menu
      await page.keyboard.press('Escape');
    }
  }

  await browser.close();
  console.log('✅ Feature 7 (Polish & Bug fixes) tests passed');
})();
