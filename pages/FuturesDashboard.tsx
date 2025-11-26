import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { getMockFuturesData } from '../services/marketData';
import { FuturesOIData } from '../types';
import { AlertCircle, TrendingUp, DollarSign, Scale } from 'lucide-react';

export const FuturesDashboard: React.FC = () => {
  const [data, setData] = useState<FuturesOIData[]>([]);

  useEffect(() => {
    // Simulate API fetch delay
    setTimeout(() => {
      setData(getMockFuturesData());
    }, 500);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as FuturesOIData;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="font-bold text-white mb-2">{d.symbol}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-400 flex justify-between gap-4"><span>OI (USD):</span> <span className="text-yellow-400">${(d.openInterestUsd / 1000000).toFixed(1)}M</span></p>
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Futures Analytics</h2>
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-blue-200">
            Showcasing Open Interest (OI) and Long/Short ratios for top assets. 
            High OI paired with Funding Rates often indicates volatility. 
            <span className="opacity-50 block mt-1 text-xs">*Data simulated for demo purposes due to API CORS restrictions.</span>
          </p>
        </div>
      </div>

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
            <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">Global Accounts</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.slice(0, 4).map((item) => (
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};