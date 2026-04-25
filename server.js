const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TEFAS Render Test API' });
});

app.get('/test-tefas', async (req, res) => {
  const fonKod = req.query.fon || 'TTE';
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(`https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${fonKod}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    
    await new Promise(r => setTimeout(r, 5000));
    
    const html = await page.content();
    const hasFonKod = html.includes('FonKod');
    const hasSonFiyat = html.includes('Son Fiyat');
    
    res.json({
      fonKod,
      htmlLength: html.length,
      hasFonKod,
      hasSonFiyat,
      sample: html.substring(0, 500),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
