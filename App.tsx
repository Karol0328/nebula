import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { SpotMarket } from './pages/SpotMarket';
import { FuturesDashboard } from './pages/FuturesDashboard';
import { EtfTracker } from './pages/LiquidationFeed';
import { MarketTab } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<MarketTab>(MarketTab.SPOT);

  const renderContent = () => {
    switch (activeTab) {
      case MarketTab.SPOT:
        return <SpotMarket />;
      case MarketTab.FUTURES:
        return <FuturesDashboard />;
      case MarketTab.ETF:
        return <EtfTracker />;
      default:
        return <SpotMarket />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-yellow-500/30">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="pt-20 pb-12">
        {renderContent()}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-600 text-sm">
          <p className="mb-2">Binance Pro Terminal Demo</p>
          <p className="text-xs">
            Market Data provided by Binance WebSocket. 
            Futures & ETF flows are simulated for demonstration as public APIs require specific CORS configurations.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
