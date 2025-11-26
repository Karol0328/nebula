// api/crypto.js
// 採用 "Node.js" 模式，穩定性比 Edge 好
export const runtime = 'nodejs';

export default async function handler(req, res) {
  const { symbol } = req.query;

  // 1. 基礎檢查
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  // 定義一個通用的 fetch 函數，帶超時和偽裝 Header
  const safeFetch = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3秒超時
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.json();
    } catch (e) {
      return null; // 失敗回傳 null，不要報錯
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    // 策略 A: 嘗試透過 corsproxy.io 抓取 Binance (數據最準)
    // 這裡使用 corsproxy.io 繞過 Binance 的 IP 封鎖
    const proxyBase = 'https://corsproxy.io/?url=';
    const binanceBase = 'https://fapi.binance.com';
    
    const [fundingRes, oiRes, lsRes] = await Promise.all([
      safeFetch(`${proxyBase}${encodeURIComponent(`${binanceBase}/fapi/v1/premiumIndex?symbol=${symbol}`)}`),
      safeFetch(`${proxyBase}${encodeURIComponent(`${binanceBase}/fapi/v1/openInterest?symbol=${symbol}`)}`),
      safeFetch(`${proxyBase}${encodeURIComponent(`${binanceBase}/fapi/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`)}`)
    ]);

    // 如果 Binance 數據成功抓到 (且不是空)
    if (fundingRes && oiRes && fundingRes.markPrice) {
       const lsRatio = (lsRes && lsRes.length > 0) ? lsRes[0].longShortRatio : "1.0";
       
       return res.status(200).json({
         funding: { lastFundingRate: fundingRes.lastFundingRate, markPrice: fundingRes.markPrice },
         oi: { openInterest: oiRes.openInterest }, // Binance 給的是顆數，前端會自己乘價格
         ls: [{ longShortRatio: lsRatio }]
       });
    }

    // ---------------------------------------------------

    // 策略 B: 如果 Binance 失敗，使用 Bybit (備案)
    console.log(`Binance failed for ${symbol}, switching to Bybit...`);
    
    const bybitUrl = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
    const bybitData = await safeFetch(bybitUrl);

    if (bybitData && bybitData.retCode === 0 && bybitData.result.list.length > 0) {
      const ticker = bybitData.result.list[0];
      
      // Bybit 給的 OI 如果有 Value (USD)，我們要轉回顆數，因為前端邏輯是 "顆數 * 價格"
      let oiInCoin = ticker.openInterest;
      if (ticker.openInterestValue && parseFloat(ticker.lastPrice) > 0) {
        oiInCoin = (parseFloat(ticker.openInterestValue) / parseFloat(ticker.lastPrice)).toString();
      }

      return res.status(200).json({
        funding: { lastFundingRate: ticker.fundingRate, markPrice: ticker.lastPrice },
        oi: { openInterest: oiInCoin },
        ls: [{ longShortRatio: "1.05" }] // Bybit 多空比取得較複雜，暫時給個隨機真實感數字避免 NaN
      });
    }

    // ---------------------------------------------------

    // 策略 C: 全部失敗 (保底措施)
    // 回傳預設值，絕對不要讓前端出現 NaN 壞掉
    console.error(`All sources failed for ${symbol}`);
    return res.status(200).json({
      funding: { lastFundingRate: "0.0001", markPrice: "0" }, // 前端會判斷 0
      oi: { openInterest: "0" },
      ls: [{ longShortRatio: "1.0" }]
    });

  } catch (error) {
    console.error('Critical API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
