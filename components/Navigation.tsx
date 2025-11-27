import React from 'react';
import { LayoutDashboard, LineChart, CandlestickChart, Skull } from 'lucide-react';
import { MarketTab } from '../types';

interface NavigationProps {
  activeTab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: MarketTab.SPOT, label: 'Spot Market', icon: CandlestickChart },
    { id: MarketTab.FUTURES, label: 'Futures Data', icon: LineChart },
    // 這裡改成新的 LIQUIDATION，並使用 Skull 圖示
    { id: MarketTab.LIQUIDATION, label: 'Liquidations', icon: Skull },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 flex items-center px-4 md:px-6">
      {/* Logo 區域 */}
      <div className="flex items-center gap-3 mr-8">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
          <LayoutDashboard className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">
          Nebula<span className="text-purple-400">Terminal</span>
        </h1>
      </div>

      {/* 導覽按鈕區域 */}
      <div className="flex gap-1 md:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          // 特別判斷：如果是「爆倉」頁籤，選中時顯示紅色；其他顯示原本的紫色
          const isLiquidation = item.id === MarketTab.LIQUIDATION;
          
          let activeClass = '';
          if (isActive) {
            if (isLiquidation) {
              // 爆倉頁籤的選中樣式 (紅色系)
              activeClass = 'bg-rose-900/20 text-rose-200 shadow-sm ring-1 ring-rose-900/50';
            } else {
              // 一般頁籤的選中樣式 (原本的紫色系)
              activeClass = 'bg-slate-800 text-purple-400 shadow-sm ring-1 ring-slate-700';
            }
          } else {
            // 未選中時的樣式
            activeClass = isLiquidation 
              ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-900/10' // 爆倉頁籤 hover 變紅
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'; // 一般頁籤 hover 變白
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeClass}`}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* 右側狀態指示燈 */}
      <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-900/10 border border-emerald-900/20 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-emerald-500/80">System Online</span>
        </span>
      </div>
    </nav>
  );
};
