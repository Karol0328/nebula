import React from 'react';
import { LayoutDashboard, LineChart, CandlestickChart, Wallet } from 'lucide-react';
import { MarketTab } from '../types';

interface NavigationProps {
  activeTab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: MarketTab.SPOT, label: 'Spot Market', icon: CandlestickChart },
    { id: MarketTab.FUTURES, label: 'Futures Data', icon: LineChart },
    { id: MarketTab.ETF, label: 'ETF Flows', icon: Wallet },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-50 flex items-center px-4 md:px-6">
      <div className="flex items-center gap-3 mr-8">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/50">
          <LayoutDashboard className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">
          Nebula<span className="text-purple-400">Terminal</span>
        </h1>
      </div>

      <div className="flex gap-1 md:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 
                ${isActive 
                  ? 'bg-slate-800 text-purple-400 shadow-sm ring-1 ring-slate-700' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Connected
        </span>
      </div>
    </nav>
  );
};