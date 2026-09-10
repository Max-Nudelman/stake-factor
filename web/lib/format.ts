// Formatting helpers. Money is in pounds because the market layer prices are
// football-data.co.uk average prices for European leagues.

export function percent(value: number, digits: number = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPercent(value: number, digits: number = 1): string {
  const sign: string = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function money(value: number): string {
  const sign: string = value < 0 ? "−" : "";
  const magnitude: number = Math.abs(value);
  if (magnitude >= 1_000_000) {
    return `${sign}£${(magnitude / 1_000_000).toFixed(2)}m`;
  }
  if (magnitude >= 1_000) {
    return `${sign}£${Math.round(magnitude / 1_000)}k`;
  }
  return `${sign}£${magnitude.toFixed(0)}`;
}

export function signedMoney(value: number): string {
  return value > 0 ? `+${money(value)}` : money(value);
}

export function count(value: number): string {
  return value.toLocaleString("en-GB");
}

export function auc(value: number): string {
  return Number.isNaN(value) ? "—" : value.toFixed(3);
}
