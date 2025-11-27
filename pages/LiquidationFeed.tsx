import React, { useState, useEffect, useRef } from 'react';
import { Skull, TrendingDown, TrendingUp, AlertTriangle, Zap, Activity, Droplets } from 'lucide-react';

// 定義爆倉單的結構
interface LiquidationOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL'; // BUY = 空頭回補(空軍爆倉), SELL = 多頭賣出(多軍爆倉)
  amount: number;       // 數量
  price: number;        // 爆倉價格
  value: number;        // 總價值 (USD)
  time: number;
}

export const LiquidationFeed: React.FC = () => {
  const [orders, setOrders] = useState<LiquidationOrder[]>([]);
  const [stats, setStats] = useState({ totalValue: 0, longRekts: 0, shortRekts: 0 });
  const [isConnected, setIsConnected] = useState(false);
  
  // 使用 Ref 來避免 useEffect 閉包問題
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 連接 Binance 合約 WebSocket (全市場強制平倉推播)
    const ws = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to Liquidation Stream');
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      // msg.o 是 Order 詳情
      // o.s = Symbol, o.S = Side, o.q = Original Quantity, o.p = Price, o.ap = Average Price
      
      const newOrders: LiquidationOrder[] = msg.o ? [{
        id: Math.random().toString(36).substr(2, 9),
        symbol: msg.o.s.replace('USDT', ''), // 去掉 USDT 顯示比較乾淨
        side: msg.o.S, 
        amount: parseFloat(msg.o.q),
        price: parseFloat(msg.o.p),
        value: parseFloat(msg.o.q) * parseFloat(msg.o.p), // 計算總價值
        time: msg.E
      }] : [];

      if (newOrders.length > 0) {
        const order = newOrders[0];
        
        // 更新統計數據
        setStats(prev => ({
          totalValue: prev.totalValue + order.value,
          longRekts: prev.longRekts + (order.side === 'SELL' ? 1 : 0), // 多單被強平是賣出
          shortRekts: prev.shortRekts + (order.side === 'BUY' ? 1 : 0), // 空單被強平是買入
        }));

        // 更新列表 (只保留最近 50 筆)
        setOrders(prev => {
          const updated = [...newOrders, ...prev];
          return updated.slice(0, 50);
        });
      }
    };

    ws.onclose = () => setIsConnected(false);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // 格式化數字
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Skull className="text-rose-500" />
            Live Liquidation Feed
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span>Binance Futures WebSocket • Real-time</span>
          </div>
        </div>

        {/* Session Stats Cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 w-full md:w-auto">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center">
            <p className="text-[10px] text-slate-500 uppercase">Session Volume</p>
            <p className="text-lg font-bold text-white">{formatMoney(stats.totalValue)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center">
            <p className="text-[10px] text-slate-500 uppercase">Longs Rekt</p>
            <p className="text-lg font-bold text-rose-500">{stats.longRekts}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center">
            <p className="text-[10px] text-slate-500 uppercase">Shorts Rekt</p>
            <p className="text-lg font-bold text-emerald-500">{stats.shortRekts}</p>
          </div>
        </div>
      </div>

      {/* Main Feed Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Latest Liquidations List */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-blue-400" />
              Latest Casualties
            </h3>
            <span className="text-xs text-slate-500">Auto-updating...</span>
          </div>
          
          <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <div className="animate-spin mb-2"><Zap size={24} /></div>
                Waiting for liquidations...
              </div>
            ) : (
              orders.map((item) => {
                const isBigRekt = item.value > 50000; // 超過 5萬美金算大爆倉
                // SELL = Longs Liquidated (Price went down) -> Red
                // BUY = Shorts Liquidated (Price went up) -> Green
                const isLongRekt = item.side === 'SELL'; 

                return (
                  <div key={item.id} className={`p-4 flex justify-between items-center transition-colors hover:bg-slate-800/40 ${isBigRekt ? 'bg-slate-800/20' : ''} animate-in slide-in-from-top-2 duration-300`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${isLongRekt ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {isLongRekt ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-lg">{item.symbol}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${isLongRekt ? 'border-rose-500/30 text-rose-400' : 'border-emerald-500/30 text-emerald-400'}`}>
                            {isLongRekt ? 'Long Liquidated' : 'Short Liquidated'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          @ ${item.price.toLocaleString()} • {formatTime(item.time)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-mono font-bold text-lg ${isBigRekt ? 'text-yellow-400' : 'text-slate-200'}`}>
                         {formatMoney(item.value)}
                         {isBigRekt && <span className="ml-1">🔥</span>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.amount.toFixed(3)} {item.symbol}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Info / Explanation */}
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-blue-300 font-bold mb-2 flex items-center gap-2">
                 <Zap size={18} /> Market Insight
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                 Watching liquidations is key to understanding market volatility. 
                 <br/><br/>
                 <span className="text-rose-400 font-bold">Red (Longs Rekt):</span> Price crashed, forcing buyers to sell. Too many of these can trigger a <strong>Long Squeeze</strong> (price dropping further).
                 <br/><br/>
                 <span className="text-emerald-400 font-bold">Green (Shorts Rekt):</span> Price pumped, forcing sellers to buy back. This fuels a <strong>Short Squeeze</strong> (price rocketing up).
              </p>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2">
                 <AlertTriangle size={18} className="text-yellow-500" />
                 High Risk Zone
              </h3>
              <div className="text-xs text-slate-400 space-y-2">
                 <p>Large liquidations ({'>'}$50k) often mark local tops or bottoms.</p>
                 <div className="h-1 w-full bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-yellow-500/50 w-2/3"></div>
                 </div>
                 <p>Current Stream Status: <span className="text-emerald-400">Active</span></p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
