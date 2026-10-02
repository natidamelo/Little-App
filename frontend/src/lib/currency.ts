/**
 * Format amount in Ethiopian Birr (ETB)
 */
export function formatETB(amount: number, decimals = 2): string {
  const num = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return `ETB ${num.toFixed(decimals)}`;
}

export function formatETBShort(amount: number): string {
  const num = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return `ETB ${Math.round(num)}`;
}

export const CURRENCY_CODE = "ETB";
export const CURRENCY_SYMBOL = "ETB";
