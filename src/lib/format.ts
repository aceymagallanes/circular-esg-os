export function compact(n: number, digits = 1): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + "K";
  return Math.round(n).toString();
}

export function int(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function pct(n: number, digits = 1): string {
  return (n * 100).toFixed(digits) + "%";
}

export function usd(n: number, digits = 1): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return "$" + (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function tonnes(n: number): string {
  if (Math.abs(n) >= 1000) return compact(n, 1) + " t";
  return Math.round(n).toLocaleString("en-US") + " t";
}

export function kpiValue(format: string, value: number): string {
  switch (format) {
    case "pct":
      return pct(value);
    case "int":
      return compact(value, 1);
    case "tonne":
      return tonnes(value);
    case "usd":
      return usd(value);
    case "kg":
      return compact(value, 0) + " kg";
    default:
      return String(value);
  }
}

export function signed(n: number, digits = 1): string {
  const s = n >= 0 ? "+" : "−";
  return s + Math.abs(n).toFixed(digits);
}
