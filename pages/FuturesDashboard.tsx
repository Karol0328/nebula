import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { AlertCircle, TrendingUp, DollarSign, Scale, RefreshCw, Server } from 'lucide-react';

interface FuturesOIData {
  symbol: string;
  openInterestUsd: number;
  longShortRatio: number;
  fundingRate: number;
  price: number;
}

export const FuturesDashboard: React.FC = () => {
  const [data, setData] = useState<FuturesOIData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 設定要抓取的幣種
  const targetSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const requests = targetSymbols.map(async (symbol) => {
        // 改為呼叫我們自己的 Vercel API
        const response = await fetch(`/api/crypto?symbol=${symbol}`);
        
        if (!response.ok) {
            console.warn(`Failed to fetch ${symbol}`);
            return null;
        }

        const { funding, oi, ls } = await response.json();

        // 防呆：確認數據結構正確
        const lsRatio = ls && ls.length > 0 ? parseFloat(ls[0].longShortRatio) : 1;
        const markPrice = parseFloat(funding.markPrice);
        const openInterest = parseFloat(oi.openInterest);

        return {
          symbol: symbol.replace('USDT', ''),
          price: markPrice,
          openInterestUsd: openInterest * markPrice,
          fundingRate: parseFloat(funding.lastFundingRate),
          longShortRatio: lsRatio,
        } as FuturesOIData;
      });

      const results = await Promise.all(requests);
      
      // 過濾掉失敗的請求並排序
      const validResults = results.filter((item): item is FuturesOIData => item !== null);
      validResults.sort((a, b) => b.openInterestUsd - a.openInterestUsd);
      
      setData(validResults);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 每 30 秒自動更新一次 (因為是自己的後端，可以稍微頻繁一點)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as FuturesOIData;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl z-50">
          <p className="font-bold text-white mb-2 flex justify-between items-center">
            {d.symbol}
            <span className="text-xs font-normal text-slate-400">${d.price.toLocaleString()}</span>
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-400 flex justify-between gap-4">
              <span>OI (USD):</span> 
              <span className="text-yellow-400 font-mono">${(d.openInterestUsd / 1000000).toFixed(1)}M</span>
            </p>
            <p className="text-slate-400 flex justify-between gap-4">
              <span>L/S Ratio:</span> 
              <span className={`font-mono ${d.longShortRatio > 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {d.longShortRatio.toFixed(2)}
              </span>
            </p>
            <p className="text-slate-400 flex justify-between gap-4">
              <span>Funding:</span> 
              <span className={`font-mono ${d.fundingRate > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(d.fundingRate * 100).toFixed(4)}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Futures Live Analytics</h2>
          <div className="flex items-center gap-2 text-sm text-emerald-400/80">
            <Server size={14} />
            <span>Vercel Serverless API • Binance Real-time</span>
          </div>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Syncing..." : "Refresh"}
        </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Interest Chart */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <DollarSign className="text-yellow-500" size={18} />
              Open Interest (USD)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="symbol" 
                  type="category" 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                  width={50} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.3}} />
                <Bar dataKey="openInterestUsd" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1000}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#fbbf24" /> 
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Long/Short Ratio Chart */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Scale className="text-blue-500" size={18} />
              Long/Short Ratio
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">Top Accounts</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="symbol" 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.3}} />
                <Bar dataKey="longShortRatio" radius={[4, 4, 0, 0]} barSize={32} animationDuration={1000}>
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
      
      {/* Detailed Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((item) => (
          <div key={item.symbol} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/60 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-lg text-white">{item.symbol}</span>
                <span className="text-xs text-slate-500">${item.price.toLocaleString()}</span>
              </div>
              <TrendingUp size={16} className="text-slate-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-400">Funding Rate</span>
                <span className={`font-mono font-medium ${item.fundingRate > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {(item.fundingRate * 100).toFixed(4)}%
                </span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-400">L/S Ratio</span>
                <span className={`font-mono font-medium ${item.longShortRatio >= 1 ? "text-emerald-300" : "text-rose-300"}`}>
                  {item.longShortRatio.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full" 
                  style={{ width: `${(item.longShortRatio / (item.longShortRatio + 1)) * 100}%` }} 
                />
                <div 
                  className="bg-rose-500 h-full" 
                  style={{ width: `${(1 / (item.longShortRatio + 1)) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {lastUpdated && (
        <div className="text-center text-xs text-slate-600 mt-8">
          Last updated: {lastUpdated}
        </div>
      )}
    </div>
  );
};
