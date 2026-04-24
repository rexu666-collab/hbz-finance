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
      try {
        console.log(`Processing ${uf.fund_code}...`);
        await page.goto(`https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${uf.fund_code}`, {
          waitUntil: 'load',
          timeout: 60000
        });
        await new Promise(r => setTimeout(r, 4000));
        
        const priceText = await page.evaluate(() => {
          const lis = document.querySelectorAll('.top-list li, .main-indicators li');
          for (const li of lis) {
            const text = li.innerText.trim();
            if (text.includes('Son Fiyat (TL)')) {
              const match = text.match(/[\d,.]+/);
              return match ? match[0] : null;
            }
          }
          return null;
        });
        
        if (priceText && priceText !== '0') {
          // Parse Turkish number format
          // Examples: "0,087251" -> 0.087251, "1.234,56" -> 1234.56, "7.680.944.982" -> 7680944982
          let normalized = priceText;
          
          // If there's a comma, it's the decimal separator
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
          } else {
            console.log(`Invalid price for ${uf.fund_code}: "${priceText}" -> ${price}`);
          }
        } else {
          console.log(`No price found for ${uf.fund_code}`);
        }
      } catch (err) {
        console.error(`Error processing ${uf.fund_code}:`, err.message);
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
