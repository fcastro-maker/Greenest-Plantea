import type { Estado, Hito, Proyecto } from '../types'
import { diffDays, parse } from './dates'

export const ESTADOS: { id: Estado; label: string }[] = [
  { id: 'completado', label: 'Completado' },
  { id: 'en-curso', label: 'En curso' },
  { id: 'en-riesgo', label: 'En riesgo' },
  { id: 'atrasado', label: 'Atrasado' },
  { id: 'por-iniciar', label: 'Por iniciar' },
  { id: 'por-programar', label: 'Sin fecha' },
]
export const label = (e: Estado) => ESTADOS.find(x => x.id === e)!.label

/** Avance de un hito: requerimientos hechos / total; si no tiene, 100 o 0 según `hecho`. null = sin medir. */
export function hitoAvance(h: Hito): number | null {
  if (h.reqs.length) return Math.round((h.reqs.filter(r => r.hecho).length / h.reqs.length) * 100)
  return h.hecho ? 100 : null
}
export function proyAvance(p: Proyecto): number | null {
  if (typeof p.avance === 'number') return p.avance
  const vals = p.hitos.map(h => hitoAvance(h))
  if (vals.every(v => v === null)) return null
  const nums = vals.map(v => v ?? 0)
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}
export function rango(p: Proyecto): { inicio: string; fin: string } | null {
  const fs = p.hitos.flatMap(h => [h.inicio, h.fin]).filter(Boolean).sort()
  return fs.length ? { inicio: fs[0], fin: fs[fs.length - 1] } : null
}
function calc(inicio: string, fin: string, avance: number | null, hoy: Date): Estado {
  if (avance === 100) return 'completado'
  const a = parse(inicio), b = parse(fin)
  if (hoy < a) return 'por-iniciar'
  if (hoy > b) return 'atrasado'
  if (avance !== null) {
    const total = Math.max(1, diffDays(a, b))
    const esperado = (diffDays(a, hoy) / total) * 100
    if (avance < esperado - 20) return 'en-riesgo'
  }
  return 'en-curso'
}
const hitoAbierto = (h: Hito) => h.hecho !== true && hitoAvance(h) !== 100
/** Hitos bloqueados que siguen sin terminar */
export const bloqueos = (p: Proyecto) => p.hitos.filter(h => h.bloqueado && hitoAbierto(h))
/** Proyectos de los que depende que están atrasados o bloqueados */
export const dependenciasEnRiesgo = (p: Proyecto) => (p.depende ?? []).filter(d => !d.completado && (d.atrasado || d.bloqueado))

export function estadoProyecto(p: Proyecto, hoy: Date): Estado {
  const r = rango(p)
  if (!r) return 'por-programar'
  const base = calc(r.inicio, r.fin, proyAvance(p), hoy)
  // Un bloqueo o una dependencia en problemas pone en riesgo lo que iba bien
  if ((base === 'en-curso' || base === 'por-iniciar') && (bloqueos(p).length || dependenciasEnRiesgo(p).length)) return 'en-riesgo'
  return base
}
export function estadoHito(h: Hito, hoy: Date): Estado {
  if (!h.inicio || !h.fin) return 'por-programar'
  const base = calc(h.inicio, h.fin, hitoAvance(h), hoy)
  if (h.bloqueado && hitoAbierto(h) && (base === 'en-curso' || base === 'por-iniciar')) return 'en-riesgo'
  return base
}
