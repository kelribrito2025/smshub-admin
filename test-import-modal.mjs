import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Navigate to catalog page
  await page.goto('http://localhost:3000/catalog', { waitUntil: 'networkidle2' });
  
  // Wait for page to load
  await page.waitForSelector('button:has-text("Importar Serviços")', { timeout: 5000 });
  
  // Click import button
  await page.click('button:has-text("Importar Serviços")');
  
  // Wait for modal to appear
  await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
  
  // Wait a bit for modal animation
  await page.waitForTimeout(500);
  
  // Screenshot before selecting API
  await page.screenshot({ path: '/home/ubuntu/screenshots/import-modal-empty.png', fullPage: false });
  
  // Select first API
  await page.click('button[role="combobox"]:has-text("Selecione a API")');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  
  // Screenshot after selecting API
  await page.screenshot({ path: '/home/ubuntu/screenshots/import-modal-with-api.png', fullPage: false });
  
  console.log('Screenshots captured successfully!');
  
  await browser.close();
})();
