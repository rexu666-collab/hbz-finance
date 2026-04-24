export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const fonKod = url.searchParams.get('fon') || 'TTE';
  
  try {
    const response = await fetch(`https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${fonKod}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    const html = await response.text();
    
    return new Response(JSON.stringify({
      status: response.status,
      htmlLength: html.length,
      hasFonKod: html.includes('FonKod'),
      hasSonFiyat: html.includes('Son Fiyat'),
      title: html.match(/<title>(.*?)<\/title>/)?.[1] || 'No title',
      htmlStart: html.substring(0, 300)
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
