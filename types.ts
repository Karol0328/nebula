// WebSocket Ticker Payload from Binance
export interface BinanceTickerPayload {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w: string; // Weighted average price
  x: string; // First trade(F)-1 price (previous close)
  c: string; // Last price
  Q: string; // Last quantity
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade Id
  n: number; // Total number of trades
}

export interface TickerData {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number; // Quote volume (USDT)
  source: 'BINANCE' | 'COINGECKO'; // Identify where data comes from
}

// [已刪除] EtfFlowData - 不再需要

// 新增：爆倉單定義
export interface LiquidationOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL'; // BUY = 空頭回補(空軍爆倉), SELL = 多頭賣出(多軍爆倉)
  amount: number;       // 數量
  price: number;        // 爆倉價格
  value: number;        // 總價值 (USD)
  time: number;
}

export interface FuturesOIData {
  symbol: string;
  openInterest: number; // In Token amount
  openInterestUsd: number; // In USD
  volume24h: number; // 之前新增的成交量欄位
  longShortRatio: number;
  price: number;
  fundingRate: number;
  priceChange24h: number; // 之前新增的漲跌幅欄位
  source: string; // 之前新增的數據來源
}

export enum MarketTab {
  SPOT = 'SPOT',
  FUTURES = 'FUTURES',
  LIQUIDATION = 'LIQUIDATION' // 這裡改成了 LIQUIDATION
}
