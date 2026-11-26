import type { Estado, Hito, Proyecto } from '../types'
import { addDays, diffDays, parse, toIso } from './dates'
import { estadoHito, estadoProyecto, hitoAvance, proyAvance, rango } from './status'

/** Días sin tocar un plan antes de pedir que se actualice */
export const DIAS_SIN_ACTUALIZAR = 14
export const DIAS_PROXIMOS = 30

export interface Fila {
  p: Proyecto
  estado: Estado
  avance: number | null
  inicio?: string
  fin?: string
  /** Hito pendiente más cercano a vencer (o ya vencido) */
  hito?: Hito
  diasSin: number | null
}

const pendiente = (h: Hito) => h.hecho !== true && hitoAvance(h) !== 100

export function filas(proyectos: Proyecto[], hoy: Date): Fila[] {
  return proyectos.map(p => {
    const r = rango(p)
    const hito = p.hitos.filter(h => pendiente(h) && h.fin).sort((a, b) => a.fin.localeCompare(b.fin))[0]
    return {
      p, estado: estadoProyecto(p, hoy), avance: proyAvance(p), inicio: r?.inicio, fin: r?.fin, hito,
      diasSin: p.actualizado ? Math.floor((hoy.getTime() - new Date(p.actualizado).getTime()) / 86400000) : null,
    }
  })
}

export interface Conteo { total: number; completado: number; enCurso: number; enRiesgo: number; atrasado: number; otros: number; avance: number | null }
export function contar(fs: Fila[]): Conteo {
  const c = { total: fs.length, completado: 0, enCurso: 0, enRiesgo: 0, atrasado: 0, otros: 0, avance: null as number | null }
  for (const f of fs) {
    if (f.estado === 'completado') c.completado++
    else if (f.estado === 'en-curso') c.enCurso++
    else if (f.estado === 'en-riesgo') c.enRiesgo++
    else if (f.estado === 'atrasado') c.atrasado++
    else c.otros++
  }
  const av = fs.map(f => f.avance).filter((v): v is number => v !== null)
  if (av.length) c.avance = Math.round(av.reduce((a, b) => a + b, 0) / av.length)
  return c
}

/** Proyectos atrasados o en riesgo, los atrasados primero */
export const requierenAtencion = (fs: Fila[]) =>
  fs.filter(f => f.estado === 'atrasado' || f.estado === 'en-riesgo')
    .sort((a, b) => (a.estado === b.estado ? (a.fin ?? '').localeCompare(b.fin ?? '') : a.estado === 'atrasado' ? -1 : 1))

export interface Proximo { hito: Hito; p: Proyecto; dias: number }
/** Hitos sin terminar que vencen dentro de la ventana, del más cercano al más lejano */
export function proximosHitos(proyectos: Proyecto[], hoy: Date, ventana = DIAS_PROXIMOS): Proximo[] {
  const tope = toIso(addDays(hoy, ventana)), desde = toIso(hoy)
  const out: Proximo[] = []
  for (const p of proyectos) for (const h of p.hitos) {
    if (pendiente(h) && h.fin && h.fin >= desde && h.fin <= tope) out.push({ hito: h, p, dias: diffDays(hoy, parse(h.fin)) })
  }
  return out.sort((a, b) => a.dias - b.dias)
}

/** Proyectos sin terminar cuyo último movimiento es más viejo que el umbral (o nunca tuvieron) */
export const sinActualizar = (fs: Fila[], umbral = DIAS_SIN_ACTUALIZAR) =>
  fs.filter(f => f.estado !== 'completado' && (f.diasSin === null || f.diasSin >= umbral))
    .sort((a, b) => (b.diasSin ?? 9999) - (a.diasSin ?? 9999))

export interface Pendiente { nombre: string; resp: string; fin: string; dias: number; proyecto: string }
/** Requerimientos sin hacer que vencieron o vencen en la ventana */
export function requerimientosPendientes(proyectos: Proyecto[], hoy: Date, ventana = 7): Pendiente[] {
  const tope = toIso(addDays(hoy, ventana))
  const out: Pendiente[] = []
  for (const p of proyectos) for (const h of p.hitos) for (const r of h.reqs) {
    if (!r.hecho && r.fin && r.fin <= tope) out.push({ nombre: r.nombre, resp: r.resp, fin: r.fin, dias: diffDays(hoy, parse(r.fin)), proyecto: p.nombre })
  }
  return out.sort((a, b) => a.dias - b.dias)
}

export const hitoEstado = (h: Hito, hoy: Date) => estadoHito(h, hoy)
export { toIso }
