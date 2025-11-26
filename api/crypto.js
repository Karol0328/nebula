// api/crypto.js
export const runtime = 'edge'; // <--- 關鍵：這行會讓代碼在離你最近的地方(亞洲)執行

export default async function handler(req) {
  // 從請求 URL 中解析參數 (Edge Runtime 的寫法稍微不同)
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Symbol is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    // 直接請求 Binance (因為 Edge 在亞洲，所以通常不會被擋)
    const [fundingRes, oiRes, lsRes] = await Promise.all([
      fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`),
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
      fetch(`https://fapi.binance.com/fapi/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`)
    ]);

    // 檢查回應狀態
    if (!fundingRes.ok || !oiRes.ok) {
        throw new Error(`Binance API Error: ${fundingRes.status}`);
    }

    const fundingData = await fundingRes.json();
    const oiData = await oiRes.json();
    const lsData = await lsRes.json();

    // 回傳 JSON
    return new Response(JSON.stringify({
      funding: fundingData,
      oi: oiData,
      ls: lsData
    }), {
      status: 200,
      headers: { 
        'content-type': 'application/json',
        // 加這個表頭防止瀏覽器緩存，確保數據最新
        'Cache-Control': 'no-store, max-age=0' 
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
