import { BinanceTickerPayload, EtfFlowData, FuturesOIData, TickerData } from '../types';

// --- WebSocket Service for Spot Data ---

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private subscribers: ((data: Map<string, TickerData>) => void)[] = [];
  private tickerMap: Map<string, TickerData> = new Map();
  private isConnected = false;

  connect() {
    if (this.isConnected || this.ws) return;

    // Connect to Binance Stream for all tickers
    this.ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

    this.ws.onopen = () => {
      console.log('Connected to Binance WebSocket');
      this.isConnected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const payload: BinanceTickerPayload[] = JSON.parse(event.data);
        
        // Process only USDT pairs to save memory/rendering
        payload.forEach((t) => {
          if (t.s.endsWith('USDT')) {
            this.tickerMap.set(t.s, {
              symbol: t.s,
              lastPrice: parseFloat(t.c),
              priceChangePercent: parseFloat(t.P),
              highPrice: parseFloat(t.h),
              lowPrice: parseFloat(t.l),
              volume: parseFloat(t.q), // Using Quote Volume for ranking
              source: 'BINANCE'
            });
          }
        });

        // Notify subscribers (throttled slightly by React state updates usually)
        this.notify();
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

    this.ws.onclose = () => {
      console.log('Binance WS Closed');
      this.isConnected = false;
      this.ws = null;
      // Simple reconnect logic
      setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (err) => {
      console.error('Binance WS Error', err);
      this.ws?.close();
    };
  }

  subscribe(callback: (data: Map<string, TickerData>) => void) {
    this.subscribers.push(callback);
    // Send immediate cache if available
    if (this.tickerMap.size > 0) {
      callback(this.tickerMap);
    }
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((callback) => callback(new Map(this.tickerMap)));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const binanceService = new BinanceWebSocket();

// --- CoinGecko Service (For Memecoins/Missing Data) ---

// Expanded default list including user requests like M and BUNANA
// Added 'meme-core' variant to ensure coverage for 0x22b1... address
const DEFAULT_IDS = [
  'brett', 'mog-coin', 'popcat', 'myro', 'wen', 'toshi', 'degen-base', 'coq-inu',
  'm-token', 'bunana', 'pepe', 'bonk', 'dogwifhat', 'floki', 'turbo', 'cat-in-a-dogs-world',
  'memecore', 'meme-core'
].join(',');

export const fetchCoinGeckoMemeCoins = async (): Promise<TickerData[]> => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${DEFAULT_IDS}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
        console.warn('CoinGecko API rate limit or error');
        return [];
    }

    const data = await response.json();
    
    return data.map((coin: any) => ({
      symbol: (coin.symbol + 'USDT').toUpperCase(), // Normalize to mimic Binance format
      lastPrice: coin.current_price,
      priceChangePercent: coin.price_change_percentage_24h,
      highPrice: coin.high_24h,
      lowPrice: coin.low_24h,
      volume: coin.total_volume,
      source: 'COINGECKO'
    }));
  } catch (error) {
    console.error('Failed to fetch CoinGecko data', error);
    return [];
  }
};

// Dynamic Search for CoinGecko
export const searchCoinGeckoCoin = async (query: string): Promise<TickerData | null> => {
  try {
    // 1. Search for the coin ID
    // Note: CoinGecko's /search endpoint supports Contract Addresses (0x...) automatically
    const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${query}`);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    if (!searchData.coins || searchData.coins.length === 0) return null;

    // Take the top result
    const topCoinId = searchData.coins[0].id;

    // 2. Fetch market data for that specific ID
    const marketRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${topCoinId}&sparkline=false&price_change_percentage=24h`
    );

    if (!marketRes.ok) return null;
    const marketData = await marketRes.json();

    if (marketData.length > 0) {
      const coin = marketData[0];
      return {
        symbol: (coin.symbol + 'USDT').toUpperCase(),
        lastPrice: coin.current_price,
        priceChangePercent: coin.price_change_percentage_24h,
        highPrice: coin.high_24h,
        lowPrice: coin.low_24h,
        volume: coin.total_volume,
        source: 'COINGECKO'
      };
    }
    return null;

  } catch (error) {
    console.error('Error searching CoinGecko:', error);
    return null;
  }
};


// --- Mock Data Generators (Since Futures/ETF APIs have CORS/Auth restrictions) ---

export const getMockEtfData = (days = 30): EtfFlowData[] => {
  const data: EtfFlowData[] = [];
  let currentBtcPrice = 64000;
  let currentEthPrice = 34000;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Randomize movements
    const btcMove = (Math.random() - 0.48) * 1500;
    const ethMove = (Math.random() - 0.48) * 100;
    currentBtcPrice += btcMove;
    currentEthPrice += ethMove;

    // Correlate inflow with price slightly
    const btcInflow = (Math.random() - 0.4) * 500 * (btcMove > 0 ? 1.2 : 0.8);
    const ethInflow = (Math.random() - 0.45) * 150 * (ethMove > 0 ? 1.2 : 0.8);

    data.push({
      date: date.toISOString().split('T')[0],
      btcInflow: parseFloat(btcInflow.toFixed(2)),
      ethInflow: parseFloat(ethInflow.toFixed(2)),
      btcPrice: Math.abs(currentBtcPrice),
      ethPrice: Math.abs(currentEthPrice)
    });
  }
  return data;
};

export const getMockFuturesData = (): FuturesOIData[] => {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT'];
  
  return symbols.map(sym => {
    const isBullish = Math.random() > 0.45;
    return {
      symbol: sym,
      openInterest: Math.floor(Math.random() * 1000000),
      openInterestUsd: Math.floor(Math.random() * 5000000000) + 100000000,
      longShortRatio: parseFloat((Math.random() * (2.5 - 0.5) + 0.5).toFixed(4)),
      price: Math.random() * 1000, // Placeholder, usually synced with spot
      fundingRate: (Math.random() * 0.02) - 0.005 // -0.005% to +0.015%
    };
  });
};