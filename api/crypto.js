// api/crypto.js
// 切換至 Bybit API (使用 api.bytick.com 繞過區域限制)

export default async function handler(req, res) {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  try {
    // Bybit 的 API 需要的 Symbol 格式也是 BTCUSDT
    // 使用 api.bytick.com 網域，這通常比 api.bybit.com 更穩定且不易被擋
    
    // 1. 獲取行情數據 (包含 價格, OI, 資金費率)
    const tickerUrl = `https://api.bytick.com/v5/market/tickers?category=linear&symbol=${symbol}`;
    
    // 2. 獲取多空比 (Account Ratio)
    const ratioUrl = `https://api.bytick.com/v5/market/account-ratio?category=linear&symbol=${symbol}&period=5min&limit=1`;

    const [tickerRes, ratioRes] = await Promise.all([
      fetch(tickerUrl),
      fetch(ratioUrl)
    ]);

    const tickerData = await tickerRes.json();
    const ratioData = await ratioRes.json();

    // 檢查 API 是否成功
    if (tickerData.retCode !== 0) {
      throw new Error(`Bybit API Error: ${tickerData.retMsg}`);
    }

    const ticker = tickerData.result.list[0];
    
    // 處理多空比數據 (有些幣種可能沒有多空比數據，做個防呆)
    let longShortRatio = 1.0;
    if (ratioData.retCode === 0 && ratioData.result.list && ratioData.result.list.length > 0) {
      const r = ratioData.result.list[0];
      // Bybit 給的是 buyRatio 和 sellRatio，我們自己算
      longShortRatio = parseFloat(r.buyRatio) / parseFloat(r.sellRatio);
    }

    // 組裝成前端原本需要的格式 (偽裝成 Binance 的格式讓前端不用大改)
    const responseData = {
      funding: {
        lastFundingRate: ticker.fundingRate,
        markPrice: ticker.lastPrice
      },
      oi: {
        // Bybit 的 OI 是 "顆數" 或 "USD"，通常 Linear 合約回傳的是顆數，需要乘上價格
        // openInterestValue 更是直接給出了 USD 價值，我們優先用這個
        openInterest: ticker.openInterestValue 
          ? (parseFloat(ticker.openInterestValue) / parseFloat(ticker.lastPrice)).toString() // 還原成顆數給前端算
          : ticker.openInterest 
      },
      ls: [
        { longShortRatio: longShortRatio.toString() }
      ]
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('API Error:', error);
    // 萬一真的失敗，回傳一個空的結構防止前端崩潰
    res.status(200).json({
      funding: { lastFundingRate: "0", markPrice: "0" },
      oi: { openInterest: "0" },
      ls: [{ longShortRatio: "1" }]
    });
  }
}
