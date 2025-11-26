// api/crypto.js (如果是 Next.js)
export default async function handler(req, res) {
  const { symbol } = req.query;
  const response = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`);
  const data = await response.json();
  res.status(200).json(data);
}
