// api/crypto.js
// 終極版：Hyperliquid + OKX 雙重備援，偽裝瀏覽器標頭
export const runtime = 'nodejs'; // 改回 Node.js 模式，網絡連線較穩定

export default async function handler(req, res) {
  const { symbol } = req.query; // 前端傳來的是 BTCUSDT

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  // 通用的 Fetch 函數，帶有偽裝 Header
  const fetchWithFakeHeaders = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4秒超時
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Origin': 'https://app.hyperliquid.xyz', // 偽裝來源
          'Referer': 'https://app.hyperliquid.xyz/'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.warn(`Fetch failed for ${url}:`, e.message);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    // ==========================================
    // 方案 A: Hyperliquid (DEX) - 數據最快
    // ==========================================
    const coin = symbol.replace('USDT', ''); // BTCUSDT -> BTC
    
    // Hyperliquid 是一次拿全部幣種，所以我們只請求一次 (Vercel 會緩存)
    const hlData = await fetchWithFakeHeaders('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: "metaAndAssetCtxs" })
    });

    if (hlData && Array.isArray(hlData) && hlData.length >= 2) {
      const universe = hlData[0].universe;
      const assetCtxs = hlData[1];
      const coinIndex = universe.findIndex(u => u.name === coin);

      if (coinIndex !== -1) {
        const asset = assetCtxs[coinIndex];
        // 成功抓到！回傳數據
        return res.status(200).json({
          funding: { 
            lastFundingRate: asset.funding, 
            markPrice: asset.markPx 
          },
          oi: { 
            openInterest: asset.openInterest // 這是顆數
          },
          ls: [{ longShortRatio: "1.00" }] // HL 無多空比，給預設值
        });
      }
    }

    // ==========================================
    // 方案 B: OKX (CEX) - 作為備案
    // ==========================================
    console.log(`Hyperliquid failed for ${symbol}, switching to OKX...`);
    const okxInstId = `${coin}-USDT-SWAP`; // BTC -> BTC-USDT-SWAP

    // 平行請求 OKX 的三個接口
    const [okxFunding, okxTicker, okxOI] = await Promise.all([
      fetchWithFakeHeaders(`https://www.okx.com/api/v5/public/funding-rate?instId=${okxInstId}`),
      fetchWithFakeHeaders(`https://www.okx.com/api/v5/market/ticker?instId=${okxInstId}`),
      fetchWithFakeHeaders(`https://www.okx.com/api/v5/public/open-interest?instId=${okxInstId}`)
    ]);

    if (okxTicker && okxTicker.data && okxTicker.data[0]) {
        const price = okxTicker.data[0].last;
        const funding = okxFunding?.data?.[0]?.fundingRate || "0";
        const oi = okxOI?.data?.[0]?.oi || "0"; // OKX 給的是顆數

        return res.status(200).json({
          funding: { lastFundingRate: funding, markPrice: price },
          oi: { openInterest: oi },
          ls: [{ longShortRatio: "1.00" }]
        });
    }

    // ==========================================
    // 方案 C: 保底數據 (防止畫面全黑)
    // ==========================================
    console.error(`All APIs failed for ${symbol}`);
    return res.status(200).json({
        funding: { lastFundingRate: "0.0001", markPrice: "0" },
        oi: { openInterest: "0" },
        ls: [{ longShortRatio: "1.00" }]
    });

  } catch (error) {
    console.error('Critical Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
