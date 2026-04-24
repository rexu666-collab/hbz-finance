import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const fonKod = url.searchParams.get('fon') || 'TTE'
    
    console.log(`Testing TEFAS access for ${fonKod}...`)
    
    // Test 1: Can we reach TEFAS at all?
    const response = await fetch(`https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${fonKod}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    })
    
    const html = await response.text()
    
    // Test 2: Does the HTML contain fund links (meaning page loaded properly)?
    const hasFonKod = html.includes('FonKod')
    const hasSonFiyat = html.includes('Son Fiyat')
    
    // Test 3: Try to extract price with regex
    // Look for "Son Fiyat" followed by numbers
    const priceMatch = html.match(/Son Fiyat \(TL\)[\s\S]*?([\d,.]+)/)
    const extractedPrice = priceMatch ? priceMatch[1] : null
    
    // Test 4: Check if price is 0 (meaning JS needs to load it)
    const isZeroPrice = html.includes('Son Fiyat (TL)</span>\s*0\s*<') || 
                        html.includes('Son Fiyat (TL)</div>\s*0\s*<') ||
                        html.match(/Son Fiyat.*?\b0\b/s) !== null
    
    return new Response(JSON.stringify({
      status: response.status,
      htmlLength: html.length,
      hasFonKod,
      hasSonFiyat,
      extractedPrice,
      isZeroPrice,
      headers: Object.fromEntries(response.headers.entries()),
      sample: html.substring(
        Math.max(0, html.indexOf('Son Fiyat') - 100),
        Math.min(html.length, html.indexOf('Son Fiyat') + 200)
      )
    }, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }, null, 2), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
