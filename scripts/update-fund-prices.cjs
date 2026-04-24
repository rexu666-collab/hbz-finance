const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: userFunds, error } = await supabase
    .from('user_funds')
    .select('id, fund_code');
  
  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }
  
  if (!userFunds || userFunds.length === 0) {
    console.log('No user funds found to update');
    return;
  }
  
  console.log(`Found ${userFunds.length} funds to update`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    for (let i = 0; i < userFunds.length; i++) {
      const uf = userFunds[i];
      
      // Wait between funds to avoid rate limiting
      if (i > 0) {
        console.log('Waiting 10s before next fund...');
        await new Promise(r => setTimeout(r, 10000));
      }
      
      let lastError = null;
      let success = false;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        let page = null;
        try {
          if (attempt > 1) {
            console.log(`Retrying ${uf.fund_code} (attempt ${attempt}/3)...`);
            await new Promise(r => setTimeout(r, 15000 * attempt));
          } else {
            console.log(`Processing ${uf.fund_code}...`);
          }
          
          // Fresh page for each fund attempt
          page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          page.setDefaultNavigationTimeout(180000);
          page.setDefaultTimeout(180000);
          
          // Step 1: Go to main page with shorter wait
          console.log(`  Loading main page...`);
          await page.goto('https://www.tefas.gov.tr/FonAnaliz.aspx', {
            waitUntil: 'domcontentloaded',
            timeout: 180000
          });
          await new Promise(r => setTimeout(r, 8000));
          
          // Step 2: Find and click fund link
          const linkSelector = `a[href*="FonKod=${uf.fund_code}"]`;
          const link = await page.$(linkSelector);
          
          if (!link) {
            console.log(`  Fund link not found for ${uf.fund_code}`);
            await page.close();
            break;
          }
          
          console.log(`  Clicking fund link...`);
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 180000 }),
            link.click()
          ]);
          
          await new Promise(r => setTimeout(r, 8000));
          
          // Step 3: Extract price
          const priceText = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const text = el.innerText?.trim();
              if (text && text.includes('Son Fiyat')) {
                const parent = el.closest('li') || el.closest('div');
                if (parent) {
                  const match = parent.innerText.match(/[\d,.]+/);
                  if (match) return match[0];
                }
              }
            }
            // Fallback: search all text
            const bodyText = document.body.innerText;
            const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes('Son Fiyat')) {
                for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                  const match = lines[j].match(/^[\d,.]+$/);
                  if (match) return match[0];
                }
              }
            }
            return null;
          });
          
          await page.close();
          
          if (priceText && priceText !== '0') {
            let normalized = priceText;
            if (normalized.includes(',')) {
              normalized = normalized.replace(/\./g, '').replace(',', '.');
            }
            
            const price = parseFloat(normalized);
            
            if (!isNaN(price) && price > 0) {
              const { error: updateError } = await supabase
                .from('user_funds')
                .update({ 
                  current_price: price, 
                  last_price_update: new Date().toISOString() 
                })
                .eq('id', uf.id);
              
              if (updateError) {
                console.error(`  Failed to update ${uf.fund_code}:`, updateError.message);
              } else {
                console.log(`  Updated ${uf.fund_code}: ${price}`);
              }
              success = true;
              break;
            } else {
              console.log(`  Invalid price for ${uf.fund_code}: "${priceText}" -> ${price}`);
              success = true;
              break;
            }
          } else {
            console.log(`  No price found for ${uf.fund_code}`);
            success = true;
            break;
          }
        } catch (err) {
          lastError = err;
          console.error(`  Attempt ${attempt} failed for ${uf.fund_code}:`, err.message);
          if (page) {
            try { await page.close(); } catch (_) {}
          }
        }
      }
      
      if (!success && lastError) {
        console.error(`  Giving up on ${uf.fund_code} after 3 attempts`);
      }
    }
    
    console.log('Fund price update completed');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
