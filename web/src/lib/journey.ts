export function computeYearsToFI({
  balance,
  target,
  annualContrib,
  realReturnPct,
  maxYears = 60,
}: {
  balance: number
  target: number
  annualContrib: number
  realReturnPct: number
  maxYears?: number
}): number {
  const r = realReturnPct / 100
  if (balance >= target) return 0
  if (r <= 0) {
    if (annualContrib <= 0) return maxYears
    const years = Math.ceil((target - balance) / Math.max(annualContrib, 1e-9))
    return Math.min(years, maxYears)
  }
  // Try closed form; fall back to loop if unstable
  try {
    const num = target * r + annualContrib
    const den = balance * r + annualContrib
    if (den <= 0) throw new Error('invalid')
    const n = Math.log(num / den) / Math.log(1 + r)
    const years = Math.max(0, Math.ceil(n))
    if (!isFinite(years) || years < 0) throw new Error('invalid')
    return Math.min(years, maxYears)
  } catch {
    let b = balance
    for (let y = 1; y <= maxYears; y++) {
      b = b * (1 + r) + annualContrib
      if (b >= target) return y
    }
    return maxYears
  }
}

export function fireTargetFromSpend(spend: number, wr = 0.04): number {
  if (wr <= 0) return Infinity
  return spend / wr
}

