// api/crypto.js
export const runtime = 'nodejs';

export default async function handler(req, res) {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  const fetchWithFakeHeaders = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://app.hyperliquid.xyz',
          'Referer': 'https://app.hyperliquid.xyz/'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const coin = symbol.replace('USDT', '');
    
    // 方案 A: Hyperliquid
    const hlData = await fetchWithFakeHeaders('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: "metaAndAssetCtxs" })
    });

    if (hlData && Array.isArray(hlData)) {
      const universe = hlData[0].universe;
      const assetCtxs = hlData[1];
      const coinIndex = universe.findIndex(u => u.name === coin);

      if (coinIndex !== -1) {
        const asset = assetCtxs[coinIndex];
        return res.status(200).json({
          source: 'Hyperliquid', // <--- 這裡加了標籤
          funding: { lastFundingRate: asset.funding, markPrice: asset.markPx },
          oi: { openInterest: asset.openInterest },
          ls: [{ longShortRatio: "1.00" }]
        });
      }
    }

    // 方案 B: OKX
    console.log(`Switching to OKX for ${symbol}...`);
    const okxInstId = `${coin}-USDT-SWAP`;
    const [okxFunding, okxTicker, okxOI] = await Promise.all([
      fetchWithFakeHeaders(`https://www.okx.com/api/v5/public/funding-rate?instId=${okxInstId}`),
      fetchWithFakeHeaders(`https://www.okx.com/api/v5/market/ticker?instId=${okxInstId}`),
      fetchWithFakeHeaders(`https://www.okx.com/api/v5/public/open-interest?instId=${okxInstId}`)
    ]);

    if (okxTicker && okxTicker.data && okxTicker.data[0]) {
        return res.status(200).json({
          source: 'OKX', // <--- 這裡加了標籤
          funding: { lastFundingRate: okxFunding?.data?.[0]?.fundingRate || "0", markPrice: okxTicker.data[0].last },
          oi: { openInterest: okxOI?.data?.[0]?.oi || "0" },
          ls: [{ longShortRatio: "1.00" }]
        });
    }

    // 方案 C: 保底
    return res.status(200).json({
        source: 'MockData', // <--- 這裡加了標籤
        funding: { lastFundingRate: "0.0001", markPrice: "0" },
        oi: { openInterest: "0" },
        ls: [{ longShortRatio: "1.00" }]
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
