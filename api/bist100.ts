export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=2d', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      return new Response(JSON.stringify({ error: 'No data' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    return new Response(JSON.stringify({ price, change }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
