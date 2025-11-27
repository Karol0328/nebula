import React, { useState } from 'react';
import { LayoutDashboard, LineChart, Skull, Zap, Terminal } from 'lucide-react';
import { SpotMarket } from './pages/SpotMarket';
import { FuturesDashboard } from './pages/FuturesDashboard';
import { LiquidationFeed } from './pages/LiquidationFeed';

function App() {
  const [activeTab, setActiveTab] = useState<'spot' | 'futures' | 'liquidation'>('futures');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* 導覽列 (高度 h-16 = 64px) */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0"> {/* 加入 shrink-0 防止 Logo 被擠壓 */}
              <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-2 rounded-lg">
                <Terminal size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
                NebulaTerminal
              </span>
            </div>

            {/* 中間的按鈕區 (加入 overflow-x-auto 防止手機版切到) */}
            <div className="flex items-center gap-1 mx-4 overflow-x-auto no-scrollbar">
              
              <button
                onClick={() => setActiveTab('spot')}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'spot'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">Spot Market</span>
              </button>

              <button
                onClick={() => setActiveTab('futures')}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'futures'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <LineChart size={16} />
                <span className="hidden sm:inline">Futures Data</span>
              </button>

              <button
                onClick={() => setActiveTab('liquidation')}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'liquidation'
                    ? 'bg-rose-900/20 text-rose-200 shadow-sm ring-1 ring-rose-900/50'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-rose-900/10'
                }`}
              >
                <Skull size={16} />
                <span className="hidden sm:inline">Liquidations</span>
              </button>

            </div>

            {/* 右側狀態 */}
            <div className="hidden md:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-900/50 shrink-0">
              <Zap size={12} fill="currentColor" />
              <span>System Online</span>
            </div>

          </div>
        </div>
      </nav>

      {/* 關鍵修改在這裡： 
         1. pt-20 (padding-top: 80px) -> 確保內容不會被 h-16 (64px) 的導覽列蓋住
         2. pb-12 (padding-bottom: 48px) -> 底部留白
      */}
      <main className="pt-24 pb-12 px-4 sm:px-6 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'spot' && <SpotMarket />}
          {activeTab === 'futures' && <FuturesDashboard />}
          {activeTab === 'liquidation' && <LiquidationFeed />}
        </div>
      </main>

    </div>
  );
}

export default App;
