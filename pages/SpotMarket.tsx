import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Search, ArrowUp, ArrowDown, Activity, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { binanceService, fetchCoinGeckoMemeCoins, searchCoinGeckoCoin } from '../services/marketData';
import { TickerData } from '../types';

const formatPrice = (price: number) => {
  if (!price) return '0.00';
  if (price < 0.0001) return price.toExponential(4);
  if (price < 1) return price.toFixed(6);
  if (price < 10) return price.toFixed(4);
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatVolume = (vol: number) => {
  if (!vol) return '$0';
  if (vol > 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol > 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
  return `$${(vol / 1_000).toFixed(0)}K`;
};

interface TickerRowProps {
  ticker: TickerData;
  isFav: boolean;
  toggleFavorite: (symbol: string) => void;
}

const TickerRow: React.FC<TickerRowProps> = ({ ticker, isFav, toggleFavorite }) => {
  const isPositive = ticker.priceChangePercent >= 0;
  const isCG = ticker.source === 'COINGECKO';

  return (
    <tr className="hover:bg-slate-800/30 transition-colors group border-b border-slate-800/50 last:border-0">
      <td className="p-4">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleFavorite(ticker.symbol); }}
          className={`p-1 rounded-md transition-colors ${isFav ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Star size={18} fill={isFav ? "currentColor" : "none"} />
        </button>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ring-1 ring-slate-700
             ${isCG ? 'bg-indigo-900/30 text-indigo-300' : 'bg-slate-800 text-slate-300'}`}>
            {ticker.symbol.substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">{ticker.symbol.replace(/USDT$/i, '')}</span>
              {isCG && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">GECKO</span>}
            </div>
            <div className="text-xs text-slate-500">USDT</div>
          </div>
        </div>
      </td>
      <td className={`p-4 text-right font-mono font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {formatPrice(ticker.lastPrice)}
      </td>
      <td className="p-4 text-right">
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(ticker.priceChangePercent ?? 0).toFixed(2)}%
        </div>
      </td>
      <td className="p-4 text-right font-mono text-slate-400 hidden md:table-cell text-sm">
        {formatPrice(ticker.highPrice)}
      </td>
      <td className="p-4 text-right font-mono text-slate-400 hidden md:table-cell text-sm">
        {formatPrice(ticker.lowPrice)}
      </td>
      <td className="p-4 text-right font-mono text-slate-200 font-medium">
        {formatVolume(ticker.volume)}
      </td>
    </tr>
  );
};

export const SpotMarket: React.FC = () => {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [cgTickers, setCgTickers] = useState<TickerData[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof TickerData>('volume');
  const [sortDesc, setSortDesc] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);

  // Debounce ref
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load favorites from local storage on mount
  useEffect(() => {
    const savedFavs = localStorage.getItem('nebula_favorites');
    if (savedFavs) {
      setFavorites(new Set(JSON.parse(savedFavs)));
    }
  }, []);

  // Update favorites in local storage
  const toggleFavorite = (symbol: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(symbol)) {
      newFavs.delete(symbol);
    } else {
      newFavs.add(symbol);
    }
    setFavorites(newFavs);
    localStorage.setItem('nebula_favorites', JSON.stringify(Array.from(newFavs)));
  };

  // Connect to Binance WebSocket
  useEffect(() => {
    binanceService.connect();
    const unsubscribe = binanceService.subscribe((dataMap) => {
      setTickers(Array.from(dataMap.values()));
    });
    return () => unsubscribe();
  }, []);

  // Fetch CoinGecko Default List
  useEffect(() => {
    const getCgData = async () => {
      const data = await fetchCoinGeckoMemeCoins();
      setCgTickers(data);
    };
    getCgData();
    const interval = setInterval(getCgData, 60000); // Update every 60s
    return () => clearInterval(interval);
  }, []);

  // Combine Data
  const allTickers = useMemo(() => {
    // Deduplicate: if Binance has it, ignore CoinGecko (Binance is faster)
    // Actually, simply merging but prioritizing Binance if we keyed them by symbol would be better.
    // For now, simple concat, filtering duplicates might be needed if lists overlap.
    
    // Create a map to ensure unique symbols (prefer Binance)
    const map = new Map<string, TickerData>();
    
    // Add CoinGecko first
    cgTickers.forEach(t => map.set(t.symbol, t));
    // Overwrite with Binance (real-time)
    tickers.forEach(t => map.set(t.symbol, t));

    return Array.from(map.values());
  }, [tickers, cgTickers]);

  // Handle Search & Dynamic Fetch
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!search || search.length < 2) return;

    // Check if we already have it
    const exists = allTickers.some(t => t.symbol.toLowerCase().includes(search.toLowerCase()));
    
    if (!exists) {
      // If not found locally, trigger external search after delay
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearchingExternal(true);
        const newCoin = await searchCoinGeckoCoin(search);
        setIsSearchingExternal(false);
        
        if (newCoin) {
          // Add to cgTickers if not already present
          setCgTickers(prev => {
            if (prev.find(p => p.symbol === newCoin.symbol)) return prev;
            return [...prev, newCoin];
          });
        }
      }, 800); // 800ms debounce
    }
  }, [search, allTickers]);

  const { watchlist, marketList } = useMemo(() => {
    const filtered = allTickers
      .filter((t) => t.symbol.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const valA = a[sortBy] ?? 0;
        const valB = b[sortBy] ?? 0;
        return sortDesc ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
      });

    const watch = filtered.filter(t => favorites.has(t.symbol));
    const market = filtered.filter(t => !favorites.has(t.symbol));

    return { watchlist: watch, marketList: market };
  }, [allTickers, search, sortBy, sortDesc, favorites]);

  const displayedMarketList = showAll || search ? marketList : marketList.slice(0, 10);

  const handleSort = (key: keyof TickerData) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  const TableHeader = () => (
    <thead>
      <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
        <th className="p-4 w-12"></th>
        <th className="p-4 font-medium cursor-pointer hover:text-white text-left" onClick={() => handleSort('symbol')}>Pair</th>
        <th className="p-4 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('lastPrice')}>Price</th>
        <th className="p-4 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('priceChangePercent')}>24h Change</th>
        <th className="p-4 font-medium text-right hidden md:table-cell cursor-pointer hover:text-white" onClick={() => handleSort('highPrice')}>24h High</th>
        <th className="p-4 font-medium text-right hidden md:table-cell cursor-pointer hover:text-white" onClick={() => handleSort('lowPrice')}>24h Low</th>
        <th className="p-4 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('volume')}>24h Vol (USDT)</th>
      </tr>
    </thead>
  );

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Market Overview <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">Live</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">Aggregated data from Binance & CoinGecko</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Search Name or Paste Address" 
            className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isSearchingExternal && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
               <Loader2 className="animate-spin text-purple-500 h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Watchlist Section */}
      {watchlist.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Star size={14} className="text-yellow-500 fill-yellow-500" /> Watchlist
          </h3>
          <div className="bg-slate-900 border border-yellow-500/20 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <TableHeader />
                <tbody className="divide-y divide-slate-800">
                  {watchlist.map(t => (
                    <TickerRow 
                      key={t.symbol} 
                      ticker={t} 
                      isFav={true} 
                      toggleFavorite={toggleFavorite} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Main Market List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
           All Markets {search ? `(Searching: ${search})` : '(Top 10 Volume)'}
        </h3>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <TableHeader />
              <tbody className="divide-y divide-slate-800">
                {displayedMarketList.length === 0 ? (
                   <tr>
                     <td colSpan={7} className="p-12 text-center text-slate-500">
                       <div className="flex flex-col items-center justify-center gap-3">
                         {isSearchingExternal ? (
                           <>
                              <Loader2 className="animate-spin text-purple-500 h-8 w-8" />
                              <p>Searching CoinGecko global database for "{search}"...</p>
                           </>
                         ) : tickers.length === 0 ? (
                           <>
                             <Activity className="animate-spin text-purple-500 h-8 w-8" />
                             <p>Connecting to Nebula Feed...</p>
                           </>
                         ) : (
                           <p>No tickers found matching "{search}". <br/> <span className="text-xs opacity-70">Try pasting the specific contract address.</span></p>
                         )}
                       </div>
                     </td>
                   </tr>
                ) : (
                  displayedMarketList.map((ticker) => (
                    <TickerRow 
                      key={ticker.symbol} 
                      ticker={ticker} 
                      isFav={favorites.has(ticker.symbol)} 
                      toggleFavorite={toggleFavorite} 
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Show More / Show Less Button */}
          {!search && marketList.length > 10 && (
            <button 
              onClick={() => setShowAll(!showAll)}
              className="w-full py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 border-t border-slate-800"
            >
              {showAll ? (
                <>Show Less <ChevronUp size={16} /></>
              ) : (
                <>Load More Markets <ChevronDown size={16} /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
