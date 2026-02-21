/**
 * Format large numbers with k/m suffixes and round to 2 decimal places
 * @param value - Number to format
 * @returns Formatted string (e.g., "$1.56k", "$54.34k", "$1.99m")
 */
export function formatLargeNumber(value: number): string {
  if (value === 0) return '$0'
  
  const absValue = Math.abs(value)
  
  // Millions (1,000,000+)
  if (absValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}m`
  }
  
  // Thousands (1,000+)
  if (absValue >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}k`
  }
  
  // Less than 1,000 - show whole dollars
  return `$${Math.round(value).toLocaleString()}`
}
