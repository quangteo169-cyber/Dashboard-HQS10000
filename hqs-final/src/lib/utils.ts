export function fmt(v: number, d = 1): string {
  const a = Math.abs(v)
  if (a >= 1e9) return (v / 1e9).toFixed(d) + ' tỷ'
  if (a >= 1e6) return (v / 1e6).toFixed(d) + ' triệu'
  if (a >= 1e3) return (v / 1e3).toFixed(0) + ' nghìn'
  return Math.round(v).toLocaleString('vi-VN')
}

export function fmtFull(v: number): string {
  return Math.round(v).toLocaleString('vi-VN') + ' đ'
}

export function pct(v: number, total: number): string {
  if (!total) return '0.0%'
  return (v / total * 100).toFixed(1) + '%'
}

export const BU_COLORS: Record<string, string> = {
  BU1: '#818cf8',
  BU2: '#22d3ee',
  BU3: '#34d399',
  BU4: '#fb923c',
  BU5: '#c084fc',
}

export const CHART = {
  gmv:  '#22d3ee',
  re2:  '#fb923c',
  re1:  '#818cf8',
  pl1b: '#34d399',
  grid: '#111827',
  axis: '#4b5563',
}

export const BU_TAG: Record<string, string> = {
  BU1:   'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  BU2:   'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  BU3:   'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  BU4:   'bg-orange-500/15 text-orange-300 border-orange-500/20',
  BU5:   'bg-purple-500/15 text-purple-300 border-purple-500/20',
  BD10F: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
}
