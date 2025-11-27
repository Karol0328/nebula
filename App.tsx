import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { SpotMarket } from './pages/SpotMarket';
import { FuturesDashboard } from './pages/FuturesDashboard';
import { LiquidationFeed } from './pages/LiquidationFeed'; // 改為引入爆倉組件
import { MarketTab } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<MarketTab>(MarketTab.FUTURES); // 預設可以改為 FUTURES

  const renderContent = () => {
    switch (activeTab) {
      case MarketTab.SPOT:
        return <SpotMarket />;
      case MarketTab.FUTURES:
        return <FuturesDashboard />;
      case MarketTab.LIQUIDATION: // 這裡改用 LIQUIDATION
        return <LiquidationFeed />;
      default:
        return <FuturesDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* 傳遞 activeTab 給 Navigation 組件 */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="pt-6 pb-12">
        {renderContent()}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-600 text-sm">
          <p className="mb-2">NebulaTerminal Pro Demo</p>
          <p className="text-xs">
            Market Data provided by Binance WebSocket. 
            Liquidation data represents real-time market events.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
