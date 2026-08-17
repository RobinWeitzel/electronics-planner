export function formatRuntime(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return '—';
  if (hours <= 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function formatCurrentMa(ma: number): string {
  if (Math.abs(ma) >= 1000) return `${(ma / 1000).toFixed(2)} A`;
  if (Math.abs(ma) < 1) return `${(ma * 1000).toFixed(0)} µA`;
  return `${ma.toFixed(ma < 10 ? 2 : 1)} mA`;
}

export function formatVoltage(v: number): string {
  return `${v.toFixed(2)} V`;
}

export function formatPowerMw(mw: number): string {
  if (Math.abs(mw) >= 1000) return `${(mw / 1000).toFixed(2)} W`;
  return `${mw.toFixed(mw < 10 ? 2 : 1)} mW`;
}
