// 這個檔案會在 Vercel 的伺服器端運行，專門用來跟幣安拿數據
// 這樣你的前端只要跟這個檔案拿資料，就不會有 CORS 問題

export default async function handler(req, res) {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  try {
    // 平行請求 Binance 的三個接口
    const [fundingRes, oiRes, lsRes] = await Promise.all([
      fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`),
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
      fetch(`https://fapi.binance.com/fapi/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`)
    ]);

    const fundingData = await fundingRes.json();
    const oiData = await oiRes.json();
    const lsData = await lsRes.json();

    // 將整理好的數據回傳給前端
    res.status(200).json({
      funding: fundingData,
      oi: oiData,
      ls: lsData
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
