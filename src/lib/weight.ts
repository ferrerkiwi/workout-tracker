export const MAX_WEIGHT = 5000
export type WeightUnit = 'lbs' | 'kg'

export function isValidWeight(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_WEIGHT)
}

export function convertWeight(value: number, from: string, to: string): number {
  if (from === to) return value
  return from === 'kg' ? value * 2.2046226218 : value / 2.2046226218
}
