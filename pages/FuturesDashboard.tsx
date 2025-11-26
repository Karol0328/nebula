import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Activity, TrendingUp, TrendingDown, DollarSign, BarChart2, RefreshCw, Zap, Globe, ArrowUpRight, ArrowDownRight, Filter, Clock, X, AlertTriangle, Flame } from 'lucide-react';

// --- 類型定義 ---
interface FuturesOIData {
  symbol: string;
  openInterestUsd: number;
  volume24h: number;
  fundingRate: number;
  price: number;
  priceChange24h: number;
  source: string;
}

// --- 子組件：TradingView K線圖 Modal ---
const ChartModal = ({ symbol, onClose }: { symbol: string; onClose: () => void }) => {
  if (!symbol) return null;
  // 為了圖表穩定，我們統一用 BINANCE 的數據源顯示 K 線 (TradingView 支援最好)
  const tvSymbol = `BINANCE:${symbol}PERP`; 

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-5xl h-[80vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-blue-400" />
            {symbol} Perpetual Chart
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 bg-black">
          {/* TradingView Widget iframe */}
          <iframe
            className="w-full h-full"
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${tvSymbol}&interval=15&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Asia%2FTaipei`}
            allowTransparency={true}
            scrolling="no"
            frameBorder="0"
          />
        </div>
      </div>
    </div>
  );
};

// --- 子組件：資金費率倒數計時器 ---
const FundingTimer = () => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      // 資金費率通常是 UTC 00:00, 08:00, 16:00 結算
      const hours = now.getUTCHours();
      const nextFundingHour = Math.ceil((hours + 1) / 8) * 8; // 找到下一個 8 的倍數
      
      const target = new Date(now);
      target.setUTCHours(nextFundingHour % 24, 0, 0, 0);
      if (nextFundingHour >= 24) target.setDate(target.getDate() + 1);

      const diff = target.getTime() - now.getTime();
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded text-slate-300 border border-slate-700">
      <Clock size={12} className="text-blue-400" />
      <span>Next Funding: <span className="text-white font-bold">{timeLeft}</span></span>
    </div>
  );
};

// --- 主組件 ---
export const FuturesDashboard: React.FC = () => {
  const [data, setData] = useState<FuturesOIData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [sortBy, setSortBy] = useState<'oi' | 'vol' | 'fund' | 'ratio'>('oi');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null); // 控制彈出視窗

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
        
        // 模擬 24h 漲跌幅 (視覺用)
        const mockChange = (Math.random() * 10 - 5); 

        return {
          symbol: symbol.replace('USDT', ''),
          price: markPrice,
          openInterestUsd: openInterest * markPrice,
          volume24h: vol24h,
          fundingRate: parseFloat(funding.lastFundingRate),
          priceChange24h: mockChange, 
          source: source || 'Unknown',
        } as FuturesOIData;
      });

      const results = await Promise.all(requests);
      const validResults = results.filter((item): item is FuturesOIData => item !== null);
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

  const sortedData = useMemo(() => {
    const sorted = [...data];
    switch (sortBy) {
      case 'oi': return sorted.sort((a, b) => b.openInterestUsd - a.openInterestUsd);
      case 'vol': return sorted.sort((a, b) => b.volume24h - a.volume24h);
      case 'fund': return sorted.sort((a, b) => b.fundingRate - a.fundingRate);
      case 'ratio': return sorted.sort((a, b) => (b.volume24h / b.openInterestUsd) - (a.volume24h / a.openInterestUsd));
      default: return sorted;
    }
  }, [data, sortBy]);

  const marketSentiment = useMemo(() => {
    if (data.length === 0) return { text: 'Analyzing...', color: 'text-slate-400', bg: 'bg-slate-800' };
    const avgFunding = data.reduce((acc, cur) => acc + cur.fundingRate, 0) / data.length;
    if (avgFunding > 0.005) return { text: 'Extremely Bullish', color: 'text-emerald-400', bg: 'bg-emerald-900/30' };
    if (avgFunding > 0) return { text: 'Bullish', color: 'text-emerald-300', bg: 'bg-emerald-900/20' };
    if (avgFunding < -0.005) return { text: 'Extremely Bearish', color: 'text-rose-400', bg: 'bg-rose-900/30' };
    return { text: 'Bearish', color: 'text-rose-300', bg: 'bg-rose-900/20' };
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as FuturesOIData;
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
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto bg-slate-950 min-h-screen">
      {/* 彈出視窗：K線圖 */}
      {selectedSymbol && <ChartModal symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} />}

      {/* Header Area */}
      <div className="flex flex-col gap-6 mb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">Futures War Room</h2>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border border-white/10 ${marketSentiment.bg} ${marketSentiment.color} flex items-center gap-1.5`}>
                <Activity size={12} />
                {marketSentiment.text}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-emerald-400/80">
                <Zap size={14} />
                <span>Source: {data.length > 0 ? [...new Set(data.map(d => d.source))].join(' & ') : 'Scanning...'}</span>
              </div>
              {/* 倒數計時器 */}
              <FundingTimer />
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

        {/* Sorting Toolbar */}
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
           {/* 按鈕樣式保持不變 */}
           <button onClick={() => setSortBy('oi')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border ${sortBy === 'oi' ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}><DollarSign size={14} /> Highest OI</button>
           <button onClick={() => setSortBy('vol')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border ${sortBy === 'vol' ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}><BarChart2 size={14} /> Highest Volume</button>
           <button onClick={() => setSortBy('ratio')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border ${sortBy === 'ratio' ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}><Filter size={14} /> Top Turnover</button>
           <button onClick={() => setSortBy('fund')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border ${sortBy === 'fund' ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}><TrendingUp size={14} /> Funding Rate</button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2"><DollarSign className="text-yellow-500" size={18} /> Open Interest (USD)</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis dataKey="symbol" type="category" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} width={50} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.3}} />
                <Bar dataKey="openInterestUsd" radius={[0, 4, 4, 0]} barSize={20} animationDuration={500}>
                  {sortedData.map((entry, index) => (<Cell key={`cell-${index}`} fill="#fbbf24" />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2"><BarChart2 className="text-blue-500" size={18} /> 24h Volume (USD)</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.3}} />
                <Bar dataKey="volume24h" radius={[4, 4, 0, 0]} barSize={30} animationDuration={500}>
                  {sortedData.map((entry, index) => (<Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.6 + (index * 0.05)} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Detailed Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedData.map((item) => {
          const turnover = item.openInterestUsd > 0 ? item.volume24h / item.openInterestUsd : 0;
          const isPositiveChange = item.priceChange24h >= 0;
          
          // --- 狙擊信號邏輯 ---
          // 1. 軋空風險：費率為負 (大家在做空) + 價格在上漲
          const isSqueezeRisk = item.fundingRate < -0.0005 && isPositiveChange;
          // 2. 過熱：費率很高 (>0.01%) + 週轉率極高
          const isOverheated = item.fundingRate > 0.01 && turnover > 5;

          return (
            <div 
              key={item.symbol} 
              onClick={() => setSelectedSymbol(item.symbol)} // 點擊開啟 K 線圖
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/80 hover:border-blue-500/50 hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* 信號標籤 */}
              {isSqueezeRisk && (
                <div className="absolute top-0 right-0 bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-l border-b border-rose-500/20 flex items-center gap-1">
                  <AlertTriangle size={10} /> Short Squeeze
                </div>
              )}
              {isOverheated && (
                <div className="absolute top-0 right-0 bg-orange-500/20 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-l border-b border-orange-500/20 flex items-center gap-1">
                  <Flame size={10} /> Overheated
                </div>
              )}

              <div className="flex justify-between items-center mb-3 mt-1">
                <div className="flex items-start flex-col gap-0.5">
                  <span className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    {item.symbol}
                    {/* Hover 時顯示小圖示提示可以點擊 */}
                    <Activity size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">${item.price.toLocaleString()}</span>
                    <span className={`text-[10px] flex items-center ${isPositiveChange ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositiveChange ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(item.priceChange24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-400">Funding</span>
                  <span className={`font-mono font-medium ${item.fundingRate > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(item.fundingRate * 100).toFixed(4)}%
                  </span>
                </div>
                
                <div className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-1 text-slate-400">
                     <span>Vol/OI</span>
                  </div>
                  <span className={`font-mono font-medium ${turnover > 5 ? "text-yellow-400" : "text-slate-300"}`}>
                    {turnover.toFixed(2)}x
                  </span>
                </div>
                
                <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full ${item.fundingRate > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(Math.abs(item.fundingRate) * 5000, 100)}%` }} 
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
