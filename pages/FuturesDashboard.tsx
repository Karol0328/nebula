import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { AlertCircle, TrendingUp, DollarSign, Scale, RefreshCw } from 'lucide-react';

// 定義數據結構
interface FuturesOIData {
  symbol: string;
  openInterestUsd: number;
  longShortRatio: number;
  fundingRate: number;
  price: number;
}

export const FuturesDashboard: React.FC = () => {
  const [data, setData] = useState<FuturesOIData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 我們要監控的幣種列表
  const targetSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 使用 allorigins 作為臨時 proxy 繞過 CORS
      // 注意：正式上線建議使用 Next.js API Route 或自己的 Backend 做 Proxy
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      
      const promises = targetSymbols.map(async (symbol) => {
        // 1. 獲取 OI 和 價格
        // Binance API: https://fapi.binance.com/fapi/v1/openInterest
        const oiUrl = encodeURIComponent(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`);
        const oiRes = await fetch(`${proxyUrl}${oiUrl}`);
        const oiJson = await oiRes.json();
        const oiData = JSON.parse(oiJson.contents);

        // 2. 獲取 多空比 (Top Trader Long/Short Ratio)
        // Binance API: https://fapi.binance.com/fapi/data/topLongShortAccountRatio
        const lsUrl = encodeURIComponent(`https://fapi.binance.com/fapi/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`);
        const lsRes = await fetch(`${proxyUrl}${lsUrl}`);
        const lsJson = await lsRes.json();
        const lsDataRaw = JSON.parse(lsJson.contents);
        const lsData = lsDataRaw && lsDataRaw.length > 0 ? lsDataRaw[0] : { longShortRatio: '1' };

        // 3. 獲取 資金費率
        // Binance API: https://fapi.binance.com/fapi/v1/premiumIndex
        const fundUrl = encodeURIComponent(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`);
        const fundRes = await fetch(`${proxyUrl}${fundUrl}`);
        const fundJson = await fundRes.json();
        const fundData = JSON.parse(fundJson.contents);

        return {
          symbol: symbol.replace('USDT', ''), // 顯示名稱去掉 USDT
          openInterestUsd: parseFloat(oiData.openInterest) * parseFloat(fundData.markPrice), // OI 數量 * 價格 = 美金價值
          longShortRatio: parseFloat(lsData.longShortRatio),
          fundingRate: parseFloat(fundData.lastFundingRate),
          price: parseFloat(fundData.markPrice)
        };
      });

      const results = await Promise.all(promises);
      
      // 依照 OI 大小排序
      results.sort((a, b) => b.openInterestUsd - a.openInterestUsd);
      
      setData(results);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setError("無法抓取 Binance 數據，請檢查網絡或 CORS 設定。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    // 設置每 30 秒自動刷新一次
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as FuturesOIData;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl z-50">
          <p className="font-bold text-white mb-2">{d.symbol} <span className="text-slate-500 text-xs font-normal">Current: ${d.price.toFixed(2)}</span></p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-400 flex justify-between gap-4"><span>OI (USD):</span> <span className="text-yellow-400">${(d.openInterestUsd / 1000000).toFixed(2)}M</span></p>
            <p className="text-slate-400 flex justify-between gap-4"><span>L/S Ratio:</span> <span className={d.longShortRatio > 1 ? 'text-emerald-400' : 'text-rose-400'}>{d.longShortRatio.toFixed(2)}</span></p>
            <p className="text-slate-400 flex justify-between gap-4"><span>Funding:</span> <span className={d.fundingRate > 0 ? 'text-emerald-400' : 'text-rose-400'}>{(d.fundingRate * 100).toFixed(4)}%</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Futures Analytics (Binance Data)</h2>
          <div className="flex items-center gap-2 text-sm text-blue-200">
            <AlertCircle size={16} />
            <span>Real-time data from Binance API via Proxy</span>
          </div>
        </div>
        <button 
          onClick={fetchMarketData} 
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 以下 Chart 區域代碼保持不變，直接使用 data 變數 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Open Interest Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <DollarSign className="text-yellow-500" size={18} />
              Open Interest (USD)
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="symbol" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={60} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.2}} />
                <Bar dataKey="openInterestUsd" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#fbbf24" /> 
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Long/Short Ratio Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Scale className="text-blue-500" size={18} />
              Long/Short Ratio
            </h3>
            <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">Top Accounts</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.2}} />
                <Bar dataKey="longShortRatio" radius={[4, 4, 0, 0]} barSize={30}>
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.longShortRatio >= 1 ? '#10b981' : '#f43f5e'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Detailed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item) => (
          <div key={item.symbol} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-white">{item.symbol}</span>
              <TrendingUp size={16} className="text-slate-500" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Funding Rate</span>
                <span className={item.fundingRate > 0 ? "text-emerald-400" : "text-rose-400"}>
                  {(item.fundingRate * 100).toFixed(4)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">L/S Ratio</span>
                <span className="text-slate-200">{item.longShortRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Price</span>
                <span className="text-slate-200">${item.price.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
