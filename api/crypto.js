// api/crypto.js
// Vercel Serverless Function (with Proxy to bypass Geo-blocking)

export default async function handler(req, res) {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  // 定義一個內部函數，透過 Proxy 抓取數據
  // 我們使用 api.allorigins.win 作為跳板，因為它沒有地區限制
  const fetchWithProxy = async (targetUrl) => {
    try {
      // 這裡使用了 encodeURIComponent 確保網址正確編碼
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl, {
        // 加一點 Headers 偽裝成普通瀏覽器，雖然用 Proxy 時通常不需要，但保險起見
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Proxy responded with ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Fetch failed for ${targetUrl}:`, error);
      return null; // 失敗回傳 null
    }
  };

  try {
    // 平行請求 Binance 的三個接口 (透過 Proxy)
    const [fundingData, oiData, lsRaw] = await Promise.all([
      fetchWithProxy(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`),
      fetchWithProxy(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
      fetchWithProxy(`https://fapi.binance.com/fapi/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`)
    ]);

    // 檢查是否有數據失敗
    if (!fundingData || !oiData) {
      // 如果主要數據失敗，回傳 500 讓前端知道
      return res.status(502).json({ error: 'Failed to fetch data from Binance via Proxy' });
    }

    // 將整理好的數據回傳給前端
    res.status(200).json({
      funding: fundingData,
      oi: oiData,
      ls: lsRaw || [] // 多空比如果失敗給空陣列，前端有防呆
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
