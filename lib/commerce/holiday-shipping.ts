// Printify: https://help.printify.com/hc/en-us/articles/28893325248145
// Our committed shipping tables predate this per-order adjustment. Callers
// using an actual provider order quote must explicitly mark it as included.
export function peakShippingSurchargeCents(input: { now?: Date; country?: string; alreadyIncluded?: boolean } = {}) {
  const day = (input.now ?? new Date()).toISOString().slice(0, 10);
  return (input.country ?? 'US') === 'US' && !input.alreadyIncluded && day >= '2026-10-15' && day <= '2027-01-17' ? 40 : 0;
}
