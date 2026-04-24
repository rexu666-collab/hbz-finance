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
    
    // Test 2: Check what's in the HTML
    const hasFonKod = html.includes('FonKod')
    const hasSonFiyat = html.includes('Son Fiyat')
    const hasTitle = html.includes('<title>')
    
    // Try to extract title to see what page we got
    const titleMatch = html.match(/<title>(.*?)<\/title>/i)
    const pageTitle = titleMatch ? titleMatch[1] : 'No title'
    
    // Test 3: Try to extract price with regex
    const priceMatch = html.match(/Son Fiyat \(TL\)[\s\S]*?([\d,.]+)/)
    const extractedPrice = priceMatch ? priceMatch[1] : null
    
    return new Response(JSON.stringify({
      status: response.status,
      htmlLength: html.length,
      pageTitle,
      hasFonKod,
      hasSonFiyat,
      extractedPrice,
      headers: Object.fromEntries(response.headers.entries()),
      htmlStart: html.substring(0, 500)
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
