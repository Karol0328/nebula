import React, { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Info, RefreshCw, Server } from 'lucide-react';
import { EtfFlowData } from '../types';

export const EtfTracker: React.FC = () => {
  const [data, setData] = useState<EtfFlowData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEtfData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/etf');
      if (!res.ok) throw new Error('Failed');
      const realData = await res.json();
      setData(realData);
    } catch (error) {
      console.error("Failed to load ETF data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEtfData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs md:text-sm z-50">
          <p className="font-bold text-slate-200 mb-2">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-400 capitalize">{entry.name}:</span>
              <span className="font-mono text-slate-100">
                {entry.name.includes('Inflow') 
                  ? `$${entry.value}M` 
                  : `$${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const calculateTotalInflow = (key: keyof EtfFlowData) => {
    if (data.length === 0) return "0.0";
    return data.reduce((acc, curr) => acc + (curr[key] as number), 0).toFixed(1);
  };

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">ETF Flows Tracker</h2>
          <div className="flex items-center gap-2 text-sm text-emerald-400/80 mt-1">
            <Server size={14} />
            <span>Synced with Binance Historical Data</span>
          </div>
        </div>
        <button 
          onClick={fetchEtfData} 
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Syncing..." : "Refresh"}
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Info size={48} className="text-orange-500" /></div>
          <h3 className="text-orange-400 font-medium text-sm uppercase tracking-wider mb-1">Total BTC ETF Net Inflow (30d)</h3>
          <div className="text-3xl font-bold text-white mb-2">
            {loading ? "..." : `$${calculateTotalInflow('btcInflow')}M`}
          </div>
          <div className="flex items-center gap-2 text-xs text-orange-300/60">
             Includes IBIT, FBTC, ARKB
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Info size={48} className="text-indigo-500" /></div>
          <h3 className="text-indigo-400 font-medium text-sm uppercase tracking-wider mb-1">Total ETH ETF Net Inflow (30d)</h3>
          <div className="text-3xl font-bold text-white mb-2">
            {loading ? "..." : `$${calculateTotalInflow('ethInflow')}M`}
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-300/60">
             Includes ETHE, ETHA, FETH
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-8">
        {/* BTC Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Bitcoin (BTC) Flows vs Price</h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis yAxisId="left" orientation="left" stroke="#f97316" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#e2e8f0" domain={['auto', 'auto']} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Bar yAxisId="left" dataKey="btcInflow" name="Net Inflow ($M)" barSize={12} fill="#f97316" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="btcPrice" name="BTC Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ETH Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Ethereum (ETH) Flows vs Price</h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis yAxisId="left" orientation="left" stroke="#6366f1" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#e2e8f0" domain={['auto', 'auto']} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Bar yAxisId="left" dataKey="ethInflow" name="Net Inflow ($M)" barSize={12} fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ethPrice" name="ETH Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
