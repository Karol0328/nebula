// api/crypto.js
// 使用 Hyperliquid API (DEX) - 最穩定，無須 Proxy，不擋 IP
export const runtime = 'edge'; // 使用 Edge 讓速度更快

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = searchParams.get('symbol'); // 例如 BTCUSDT

  if (!symbolRaw) {
    return new Response(JSON.stringify({ error: 'Symbol is required' }), { status: 400 });
  }

  // Hyperliquid 的幣種名稱沒有 "USDT"，例如 "BTC", "ETH"
  // 所以我們要去掉 USDT 後綴
  const coin = symbolRaw.replace('USDT', '');

  try {
    // Hyperliquid 的 API 是 POST 請求，一次拿所有幣種的數據 (metaAndAssetCtxs)
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: "metaAndAssetCtxs"
      })
    });

    if (!response.ok) {
      throw new Error('Hyperliquid API Error');
    }

    const data = await response.json();
    
    // data[0] 是宇宙資訊 (Universe) - 包含幣種名稱
    // data[1] 是資產內容 (AssetCtxs) - 包含價格、OI、資金費率
    const universe = data[0].universe;
    const assetCtxs = data[1];

    // 找到目標幣種的 index
    const coinIndex = universe.findIndex(u => u.name === coin);

    if (coinIndex === -1) {
      throw new Error('Coin not found in Hyperliquid');
    }

    // 獲取該幣種的數據
    const assetData = assetCtxs[coinIndex];

    // 整理數據回傳
    // 1. Funding Rate: HL 給的是每小時費率，通常我們轉成跟幣安類似的格式
    // 2. OI: HL 給的是 Open Interest (顆數)，前端會自己乘價格
    // 3. Price: markPx
    
    const result = {
      funding: {
        // Hyperliquid 的 funding 欄位就是當前預測費率
        lastFundingRate: assetData.funding, 
        markPrice: assetData.markPx
      },
      oi: {
        // 這裡直接給顆數
        openInterest: assetData.openInterest
      },
      ls: [
        // Hyperliquid 沒有多空比數據，我們回傳 1.0 (中性) 防止前端壞掉
        // 或者我們可以給一個 0.98 ~ 1.02 的隨機波動讓畫面看起來活潑一點，但這裡先給 1.0
        { longShortRatio: "1.00" } 
      ]
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        'content-type': 'application/json',
        'Cache-Control': 'no-store, max-age=0' // 不緩存，確保即時
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    // 失敗時回傳安全值
    return new Response(JSON.stringify({
      funding: { lastFundingRate: "0", markPrice: "0" },
      oi: { openInterest: "0" },
      ls: [{ longShortRatio: "1" }]
    }), {
      status: 200, // 這裡給 200 避免前端炸開，顯示 0 總比 error 好
      headers: { 'content-type': 'application/json' }
    });
  }
}
