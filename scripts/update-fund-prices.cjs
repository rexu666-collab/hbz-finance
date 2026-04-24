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
  
  // Get all unique fund codes from user_funds
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
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    for (const uf of userFunds) {
      let lastError = null;
      let success = false;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`Retrying ${uf.fund_code} (attempt ${attempt}/3)...`);
            await new Promise(r => setTimeout(r, 5000 * attempt));
          } else {
            console.log(`Processing ${uf.fund_code}...`);
          }
          
          // Step 1: Go to main page
          await page.goto('https://www.tefas.gov.tr/FonAnaliz.aspx', {
            waitUntil: 'load',
            timeout: 90000
          });
          await new Promise(r => setTimeout(r, 5000));
          
          // Step 2: Click on the fund link in the list
          const linkSelector = `a[href*="FonKod=${uf.fund_code}"]`;
          const link = await page.$(linkSelector);
          
          if (!link) {
            console.log(`Fund link not found for ${uf.fund_code} on main page`);
            // Take screenshot for debugging
            await page.screenshot({ path: `debug-${uf.fund_code}.png` });
            break;
          }
          
          // Click the link and wait for navigation
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'load', timeout: 90000 }),
            link.click()
          ]);
          
          await new Promise(r => setTimeout(r, 5000));
          
          // Step 3: Extract price from the loaded page
          const priceText = await page.evaluate(() => {
            const strategies = [
              // Strategy 1: Common list containers
              () => {
                const selectors = [
                  '.top-list li',
                  '.main-indicators li',
                  '.price-indicators li',
                  '.fund-info li',
                  '.indicators li',
                  '[class*="indicator"] li',
                  '[class*="fiyat"]',
                  '[class*="price"]',
                ];
                for (const sel of selectors) {
                  const els = document.querySelectorAll(sel);
                  for (const el of els) {
                    const text = el.innerText.trim();
                    if (text.includes('Son Fiyat') || text.includes('Son Fiyat (TL)')) {
                      const match = text.match(/[\d,.]+/);
                      if (match) return match[0];
                    }
                  }
                }
                return null;
              },
              // Strategy 2: Walk all elements containing "Son Fiyat"
              () => {
                const allElements = document.querySelectorAll('*');
                for (const el of allElements) {
                  const text = el.innerText?.trim();
                  if (text && (text.includes('Son Fiyat (TL)') || text === 'Son Fiyat (TL)')) {
                    const parent = el.parentElement;
                    if (parent) {
                      const parentText = parent.innerText.trim();
                      const match = parentText.match(/[\d,.]+/);
                      if (match) return match[0];
                    }
                    const next = el.nextElementSibling;
                    if (next) {
                      const match = next.innerText.trim().match(/[\d,.]+/);
                      if (match) return match[0];
                    }
                  }
                }
                return null;
              },
              // Strategy 3: Search page text line by line
              () => {
                const bodyText = document.body.innerText;
                const lines = bodyText.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].includes('Son Fiyat')) {
                    for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                      const match = lines[j].match(/[\d,.]+/);
                      if (match) return match[0];
                    }
                  }
                }
                return null;
              }
            ];
            
            for (const strategy of strategies) {
              const result = strategy();
              if (result) return result;
            }
            return null;
          });
          
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
                console.error(`Failed to update ${uf.fund_code}:`, updateError.message);
              } else {
                console.log(`Updated ${uf.fund_code}: ${price}`);
              }
              success = true;
              break;
            } else {
              console.log(`Invalid price for ${uf.fund_code}: "${priceText}" -> ${price}`);
              success = true;
              break;
            }
          } else {
            console.log(`No price found for ${uf.fund_code}, taking debug screenshot`);
            await page.screenshot({ path: `debug-${uf.fund_code}.png` });
            success = true;
            break;
          }
        } catch (err) {
          lastError = err;
          console.error(`Attempt ${attempt} failed for ${uf.fund_code}:`, err.message);
        }
      }
      
      if (!success && lastError) {
        console.error(`Giving up on ${uf.fund_code} after 3 attempts. Last error:`, lastError.message);
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
