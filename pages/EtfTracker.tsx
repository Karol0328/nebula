import React, { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { getMockEtfData } from '../services/marketData';
import { EtfFlowData } from '../types';
import { Info } from 'lucide-react';

export const EtfTracker: React.FC = () => {
  const [data, setData] = useState<EtfFlowData[]>([]);

  useEffect(() => {
    setData(getMockEtfData(30)); // Last 30 days
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs md:text-sm">
          <p className="font-bold text-slate-200 mb-2">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-400 capitalize">{entry.name}:</span>
              <span className="font-mono text-slate-100">
                {entry.name.includes('Inflow') 
                  ? `$${entry.value}M` 
                  : `$${entry.value.toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const calculateTotalInflow = (key: keyof EtfFlowData) => {
    return data.reduce((acc, curr) => acc + (curr[key] as number), 0).toFixed(1);
  };

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">ETF Flows Tracker</h2>
        <p className="text-slate-400 text-sm mt-1">Daily Net Inflow/Outflow for US Spot ETFs (Mock Data Presentation)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
          <h3 className="text-orange-400 font-medium text-sm uppercase tracking-wider mb-1">Total BTC ETF Net Inflow (30d)</h3>
          <div className="text-3xl font-bold text-white mb-2">${calculateTotalInflow('btcInflow')}M</div>
          <div className="flex items-center gap-2 text-xs text-orange-300/60">
             <Info size={12} /> Includes IBIT, FBTC, ARKB, etc.
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-xl p-6">
          <h3 className="text-indigo-400 font-medium text-sm uppercase tracking-wider mb-1">Total ETH ETF Net Inflow (30d)</h3>
          <div className="text-3xl font-bold text-white mb-2">${calculateTotalInflow('ethInflow')}M</div>
          <div className="flex items-center gap-2 text-xs text-indigo-300/60">
             <Info size={12} /> Includes ETHE, ETHA, FETH, etc.
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* BTC Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Bitcoin (BTC) Flows vs Price</h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false} 
                  minTickGap={30}
                  tickFormatter={(val) => val.slice(5)}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  stroke="#f97316" 
                  tick={{ fill: '#9ca3af', fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}M`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#e2e8f0" 
                  domain={['auto', 'auto']} 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Bar yAxisId="left" dataKey="btcInflow" name="Net Inflow ($M)" barSize={20} fill="#f97316" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="btcPrice" name="BTC Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ETH Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Ethereum (ETH) Flows vs Price</h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false} 
                  minTickGap={30}
                  tickFormatter={(val) => val.slice(5)}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  stroke="#6366f1" 
                  tick={{ fill: '#9ca3af', fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}M`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#e2e8f0" 
                  domain={['auto', 'auto']} 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Bar yAxisId="left" dataKey="ethInflow" name="Net Inflow ($M)" barSize={20} fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ethPrice" name="ETH Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};