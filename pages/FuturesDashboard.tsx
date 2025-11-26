import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Activity, TrendingUp, DollarSign, BarChart2, RefreshCw, Zap, Globe } from 'lucide-react';

interface FuturesOIData {
  symbol: string;
  openInterestUsd: number;
  volume24h: number; // 新增成交量
  fundingRate: number;
  price: number;
  source: string;
}

export const FuturesDashboard: React.FC = () => {
  const [data, setData] = useState<FuturesOIData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const targetSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const requests = targetSymbols.map(async (symbol) => {
        const response = await fetch(`/api/crypto?symbol=${symbol}`);
        if (!response.ok) return null;

        const { funding, oi, volume, source } = await response.json();

        const markPrice = parseFloat(funding.markPrice);
        const openInterest = parseFloat(oi.openInterest);
        const vol24h = parseFloat(volume.volume24h);

        return {
          symbol: symbol.replace('USDT', ''),
          price: markPrice,
          openInterestUsd: openInterest * markPrice,
          volume24h: vol24h,
          fundingRate: parseFloat(funding.lastFundingRate),
          source: source || 'Unknown',
        } as FuturesOIData;
      });

      const results = await Promise.all(requests);
      const validResults = results.filter((item): item is FuturesOIData => item !== null);
      
      // 依照 OI 大小排序
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as FuturesOIData;
      // 計算成交量與持倉量的比率 (Vol/OI)
      const turnover = d.openInterestUsd > 0 ? (d.volume24h / d.openInterestUsd).toFixed(2) : "0";
      
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl z-50">
          <div className="flex justify-between items-center mb-2 gap-4">
            <p className="font-bold text-white">{d.symbol}</p>
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded border border-blue-500/30">{d.source}</span>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-slate-400 flex justify-between gap-4"><span>Price:</span> <span className="text-white font-mono">${d.price.toLocaleString()}</span></p>
            <p className="text-slate-400 flex justify-between gap-4"><span>OI:</span> <span className="text-yellow-400 font-mono">${(d.openInterestUsd / 1000000).toFixed(1)}M</span></p>
            <p className="text-slate-400 flex justify-between gap-4"><span>24h Vol:</span> <span className="text-blue-400 font-mono">${(d.volume24h / 1000000).toFixed(1)}M</span></p>
            <p className="text-slate-400 flex justify-between gap-4"><span>Vol/OI:</span> <span className="text-slate-200 font-mono">{turnover}x</span></p>
            <p className="text-slate-400 flex justify-between gap-4"><span>Funding:</span> <span className={`font-mono ${d.fundingRate > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(d.fundingRate * 100).toFixed(4)}%</span></p>
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
            <Zap size={14} />
            <span>
               Live Data via {data.length > 0 ? [...new Set(data.map(d => d.source))].join(' & ') : 'Scanning...'}
            </span>
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
            <h3 className="font-semibold text-slate-100 flex items-center gap-2"><DollarSign className="text-yellow-500" size={18} /> Open Interest (USD)</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis dataKey="symbol" type="category" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} width={50} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.3}} />
                <Bar dataKey="openInterestUsd" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1000}>
                  {data.map((entry, index) => (<Cell key={`cell-${index}`} fill="#fbbf24" />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24h Volume Chart (取代原本的 Long/Short Ratio) */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <BarChart2 className="text-blue-500" size={18} /> 
              24h Volume (USD)
            </h3>
            <span className="text-[10px] text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">Market Activity</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.3}} />
                <Bar dataKey="volume24h" radius={[4, 4, 0, 0]} barSize={32} animationDuration={1000}>
                  {data.map((entry, index) => (
                    // 根據成交量大小給不同深淺的藍色
                    <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.6 + (index * 0.05)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Detailed Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((item) => {
          // 計算 Vol/OI Ratio (周轉率)
          const turnover = item.openInterestUsd > 0 ? item.volume24h / item.openInterestUsd : 0;
          
          return (
            <div key={item.symbol} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/60 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-lg text-white">{item.symbol}</span>
                  <span className="text-xs text-slate-500">${item.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-md border border-slate-600/50">
                  <Globe size={10} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase">{item.source}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-400">Funding Rate</span>
                  <span className={`font-mono font-medium ${item.fundingRate > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(item.fundingRate * 100).toFixed(4)}%
                  </span>
                </div>
                
                {/* 顯示 Vol/OI Ratio */}
                <div className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-1 text-slate-400">
                     <span>Vol/OI Ratio</span>
                     <Activity size={12} />
                  </div>
                  <span className={`font-mono font-medium ${turnover > 5 ? "text-yellow-400" : "text-slate-300"}`}>
                    {turnover.toFixed(2)}x
                  </span>
                </div>
                
                {/* 簡單的成交量佔比條 */}
                <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full" 
                    // 這裡只是視覺效果，隨機顯示一個活躍度
                    style={{ width: `${Math.min(turnover * 10, 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {lastUpdated && <div className="text-center text-xs text-slate-600 mt-8">Last updated: {lastUpdated}</div>}
    </div>
  );
};
