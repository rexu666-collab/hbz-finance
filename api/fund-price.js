export default async function handler(req, res) {
  const { code } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!code) {
    return res.status(400).json({ error: 'Fon kodu gerekli' });
  }

  try {
    // TEFAS'tan fetch et
    const tefasRes = await fetch(`https://www.tefas.gov.tr/FonAnaliz.aspx?FonKodu=${encodeURIComponent(code)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
    });

    if (!tefasRes.ok) {
      return res.status(502).json({ error: 'TEFAS yanıt vermedi' });
    }

    const html = await tefasRes.text();

    // 1. ASP.NET label'dan son fiyatı çıkar
    let priceMatch = html.match(/id="MainContent_FormView1_FiyatLabel"[^>]*>([\d.,]+)</);
    
    // 2. Alternatif: Son Fiyat metni
    if (!priceMatch) {
      priceMatch = html.match(/Son Fiyat[^>]*>([\d.,]+)</i);
    }

    // 3. Alternatif: herhangi bir fiyat deseni
    if (!priceMatch) {
      priceMatch = html.match(/>([\d.,]+)\s*TL</i);
    }

    if (priceMatch) {
      const raw = priceMatch[1].trim();
      // Virgül ondalık ayracı, nokta binlik ayracıdır (Türkçe format)
      const normalized = raw.replace(/\./g, '').replace(',', '.');
      const price = parseFloat(normalized);
      if (!isNaN(price) && price > 0) {
        return res.json({ code, price, source: 'tefas' });
      }
    }

    // Fallback: eğer TEFAS'ta veri yoksa (genelde 0 döner), fonsize'dan deneyelim
    try {
      const fsRes = await fetch(`https://fonsize.com/api/v1/funds/${code}/price`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (fsRes.ok) {
        const fsData = await fsRes.json();
        if (fsData.price) {
          return res.json({ code, price: fsData.price, source: 'fonsize' });
        }
      }
    } catch (_) {
      // fonsize fallback başarısız, devam et
    }

    return res.status(404).json({ error: 'Fiyat bulunamadı veya TEFAS verisi yok' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Sunucu hatası' });
  }
}
