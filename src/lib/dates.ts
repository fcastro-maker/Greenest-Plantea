const DAY = 86400000
export const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
export const toIso = (d: Date) => d.toISOString().slice(0, 10)
export const diffDays = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY)
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const mesCorto = (m: number) => MES[m]
export const mesLargo = (m: number) => MES_L[m]
export const fmt = (iso: string) => { const d = parse(iso); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}` }
export const fmtLargo = (iso: string) => { const d = parse(iso); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
export function duracion(a: string, b: string) {
  const n = diffDays(parse(a), parse(b)) + 1
  if (n <= 1) return '1 día'
  if (n < 14) return `${n} días`
  const s = Math.round(n / 7)
  return `${s} sem`
}
export function hoy(): Date {
  const q = new URLSearchParams(location.search).get('hoy')
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return parse(q)
  const n = new Date()
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))
}
export function relativo(fin: string, h: Date) {
  const n = diffDays(h, parse(fin))
  if (n === 0) return 'hoy'
  if (n > 0) return n === 1 ? 'mañana' : `en ${n} d`
  return `hace ${-n} d`
}
