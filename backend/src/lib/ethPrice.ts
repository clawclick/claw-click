/**
 * ETH price fetcher — caches CoinGecko price, refreshes every 10 minutes.
 * Import { getETHPrice } from './ethPrice' anywhere in the backend.
 */

let cachedPrice = 0
let lastFetched = 0
const REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes
const FALLBACK_PRICE = 2800 // reasonable fallback if API fails

async function fetchPrice(): Promise<number> {
  try {
    // CoinGecko free API — no key required
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    const data = await res.json() as { ethereum?: { usd?: number } }
    const price = data?.ethereum?.usd
    if (!price || price <= 0) throw new Error('Invalid price data')
    return price
  } catch (err) {
    console.warn(`⚠️  ETH price fetch failed, trying fallback...`, (err as Error).message)
    // Try CryptoCompare as backup
    try {
      const res = await fetch(
        'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD',
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) throw new Error(`CryptoCompare ${res.status}`)
      const data = await res.json() as { USD?: number }
      if (data?.USD && data.USD > 0) return data.USD
    } catch { /* fall through */ }
    return 0 // return 0 so caller knows it failed
  }
}

/**
 * Get the current cached ETH price in USD.
 * Returns the cached value (refreshed every 10 min).
 * On first call or if cache expired, fetches synchronously.
 */
export async function getETHPrice(): Promise<number> {
  const now = Date.now()
  if (cachedPrice > 0 && (now - lastFetched) < REFRESH_INTERVAL) {
    return cachedPrice
  }
  const price = await fetchPrice()
  if (price > 0) {
    cachedPrice = price
    lastFetched = now
    console.log(`💰 ETH price updated: $${price.toLocaleString()}`)
  }
  return cachedPrice || FALLBACK_PRICE
}

/**
 * Get cached price synchronously (non-blocking). Returns last known price or fallback.
 */
export function getETHPriceSync(): number {
  return cachedPrice || FALLBACK_PRICE
}

// Start background refresh loop
async function startPriceLoop() {
  // Initial fetch
  await getETHPrice()
  // Refresh every 10 minutes
  setInterval(async () => {
    await getETHPrice()
  }, REFRESH_INTERVAL)
}

startPriceLoop()
