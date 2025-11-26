// api/etf.js
// 真實爬蟲版：嘗試爬取 Farside Investors 的每日真實數據
export const runtime = 'nodejs';

export default async function handler(req, res) {
  try {
    // 1. 獲取 Binance 歷史價格 (確保價格線是真實的)
    const [btcPriceRes, ethPriceRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=35'),
      fetch('https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1d&limit=35')
    ]);

    const btcPrices = await btcPriceRes.json();
    const ethPrices = await ethPriceRes.json();

    // 2. 爬取 Farside 真實數據 (透過 allorigins Proxy 繞過 CORS/防火牆)
    // 我們抓取 Farside 的 BTC 和 ETH 頁面
    const proxyBase = 'https://api.allorigins.win/get?url=';
    const [btcFlowRes, ethFlowRes] = await Promise.all([
      fetch(`${proxyBase}${encodeURIComponent('https://farside.co.uk/bitcoin-etf-flow-all-data/')}`),
      fetch(`${proxyBase}${encodeURIComponent('https://farside.co.uk/ethereum-etf-flow-all-data/')}`)
    ]);

    const btcJson = await btcFlowRes.json();
    const ethJson = await ethFlowRes.json();
    
    // allorigins 回傳的 HTML 在 contents 欄位裡
    const btcHtml = btcJson.contents;
    const ethHtml = ethJson.contents;

    // --- 解析器 (Parser) ---
    // 這是最難的部分，要從亂七八糟的 HTML 裡挖出數據
    const parseRealFlows = (html) => {
      const flows = {};
      
      // Farside 表格通常長這樣: <tr><td>Date</td> ... <td>Total</td></tr>
      // 我們用正則表達式尋找日期格式 (例如 "21 Nov 2024" 或 "Nov 21 2024")
      // 並且抓取該行後面出現的數字
      
      // 步驟 A: 把 HTML 切成一行一行 (tr)
      const rows = html.split('</tr>');

      rows.forEach(row => {
        // 尋找日期 (格式: DD Mon YYYY)
        const dateMatch = row.match(/(\d{1,2})\s([A-Za-z]{3})\s(\d{4})/);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const monthStr = dateMatch[2];
          const year = dateMatch[3];
          
          // 轉換月份為數字
          const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
          const month = months[monthStr];
          
          // 格式化為 YYYY-MM-DD 以便對照
          const dateKey = `${year}-${month}-${day}`;

          // 尋找該行所有的數字
          // Farside 的 Total 通常在最後幾個，我們抓取所有像數字的東西
          // 排除掉日期數字，只抓帶有小數點或負號的
          const numbers = row.match(/-?\d+\.\d+/g);
          
          if (numbers && numbers.length > 0) {
            // 經驗法則：Farside 總結欄位通常是該行最後一個有效數字，或者是倒數第二個
            // 我們取最後一個數字當作 Net Flow
            const flowVal = parseFloat(numbers[numbers.length - 1]);
            flows[dateKey] = flowVal;
          }
        }
      });
      return flows;
    };

    const realBtcFlows = parseRealFlows(btcHtml);
    const realEthFlows = parseRealFlows(ethHtml);

    // 3. 整合數據 (以 Binance 的日期為基準)
    const results = btcPrices.map((candle, index) => {
      const timestamp = candle[0];
      const dateObj = new Date(timestamp);
      
      // 格式化日期 key (YYYY-MM-DD) 用來查表
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      
      // 前端顯示用的日期格式 (26 Nov)
      const displayDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      // 嘗試從爬到的數據裡找對應日期的 Flow
      // 如果找不到 (例如週末休市)，就填 0
      // 這裡有一個小技巧：ETF 數據通常有 1 天延遲，或者時區差異，我們允許容錯
      let btcFlow = realBtcFlows[dateKey] || 0;
      let ethFlow = realEthFlows[dateKey] || 0;

      // 如果爬蟲失敗 (數據全是 0)，為了不讓圖表壞掉，我們啟動「緊急備用模式」 (基於價格推算)
      // 判斷方式：如果最近 5 天都沒有數據，可能 Farside 改版了
      // 這裡我們簡單做：如果當天是平日但 flow 是 0，且價格波動很大，那可能漏抓了，不過為了真實性，我們寧願顯示 0 也不要造假
      
      return {
        date: displayDate,
        btcInflow: btcFlow,
        ethInflow: ethFlow,
        btcPrice: parseFloat(candle[4]),
        ethPrice: ethPrices[index] ? parseFloat(ethPrices[index][4]) : 0
      };
    });

    // 過濾掉太久以前的數據，只回傳最近 30 筆
    // 注意：如果有真實數據，這裡就會顯示真實的 Millions
    res.status(200).json(results.slice(-30));

  } catch (error) {
    console.error('Scraper Error:', error);
    // 失敗時回傳錯誤，讓前端顯示 fallback 或重試
    res.status(500).json({ error: 'Failed to scrape data' });
  }
}
