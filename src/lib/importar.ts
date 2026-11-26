import { supabase } from './supabase'
import { TRIMESTRES } from '../types'

/** Columnas de la plantilla, en este orden. Se reconocen por nombre (sin tildes ni mayúsculas) y en cualquier orden. */
export const COLUMNAS = ['Proyecto', 'Trimestre', 'Responsable', 'Hito', 'Fase', 'Inicio', 'Fin', 'Requerimiento', 'Responsable requerimiento', 'Inicio requerimiento', 'Fin requerimiento'] as const
export const EJEMPLO: string[][] = [
  ['Portal de clientes', 'Q1', 'Ana Pérez', 'Diseño de pantallas', 'Diseño', '2027-01-04', '2027-01-22', 'Mapa de navegación', 'Luis Soto', '2027-01-04', '2027-01-08'],
  ['Portal de clientes', '', '', 'Diseño de pantallas', '', '', '', 'Prototipo aprobado', 'Ana Pérez', '2027-01-11', '2027-01-22'],
  ['Portal de clientes', '', '', 'Desarrollo del módulo de pagos', 'Desarrollo', '2027-01-25', '2027-03-12', '', '', '', ''],
]

const clave = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const texto = (v: unknown) => (v === null || v === undefined ? '' : v instanceof Date ? '' : String(v).trim())

/** Acepta fechas de Excel, 2027-01-04, 4/1/2027 y 04-01-2027 (día primero). Devuelve null si no se entiende. */
export function normalizarFecha(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return ''
  if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v.getTime() + 12 * 3600e3).toISOString().slice(0, 10)
  const s = String(v).trim()
  if (!s) return ''
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  let y: number, mo: number, d: number
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3] }
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; if (y < 100) y += 2000 }
  else return null
  const f = new Date(Date.UTC(y, mo - 1, d))
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== mo - 1 || f.getUTCDate() !== d) return null
  return f.toISOString().slice(0, 10)
}

export interface ReqImp { nombre: string; resp: string; inicio: string; fin: string }
export interface HitoImp { nombre: string; fase: string; inicio: string; fin: string; reqs: ReqImp[] }
export interface PlanImp { nombre: string; trimestre: string; responsable: string; hitos: HitoImp[] }

/** Convierte una matriz (primera fila = encabezados) en proyectos con hitos y requerimientos. Una fila vacía en Proyecto/Hito repite el anterior. */
export function leerMatriz(matriz: unknown[][]): { planes: PlanImp[]; errores: string[] } {
  const errores: string[] = []
  const filas = matriz.filter(f => f.some(c => texto(c) !== '' || c instanceof Date))
  if (!filas.length) return { planes: [], errores: ['El archivo está vacío.'] }
  const enc = filas[0].map(clave)
  const col = (n: string) => enc.indexOf(clave(n))
  const idx = Object.fromEntries(COLUMNAS.map(n => [n, col(n)])) as Record<(typeof COLUMNAS)[number], number>
  if (idx.Proyecto < 0) return { planes: [], errores: ['No encuentro la columna «Proyecto». Usa la plantilla (botón «Descargar plantilla»).'] }
  const get = (f: unknown[], n: (typeof COLUMNAS)[number]) => (idx[n] >= 0 ? f[idx[n]] : '')
  const planes: PlanImp[] = []
  let plan: PlanImp | undefined, hito: HitoImp | undefined
  filas.slice(1).forEach((f, i) => {
    const linea = i + 2
    const fecha = (n: (typeof COLUMNAS)[number]) => {
      const r = normalizarFecha(get(f, n))
      if (r === null) errores.push(`Fila ${linea}: la fecha de «${n}» no se entiende (${texto(get(f, n))}). Usa AAAA-MM-DD o DD/MM/AAAA.`)
      return r ?? ''
    }
    const nomPlan = texto(get(f, 'Proyecto'))
    if (nomPlan && nomPlan !== plan?.nombre) {
      const tri = texto(get(f, 'Trimestre')).toUpperCase()
      if (tri && !TRIMESTRES.some(t => t.id === tri)) errores.push(`Fila ${linea}: el trimestre «${tri}» no existe (usa ${TRIMESTRES.map(t => t.id).join(', ')}).`)
      plan = { nombre: nomPlan, trimestre: TRIMESTRES.some(t => t.id === tri) ? tri : '', responsable: texto(get(f, 'Responsable')), hitos: [] }
      planes.push(plan); hito = undefined
    }
    if (!plan) { errores.push(`Fila ${linea}: falta el nombre del proyecto.`); return }
    const nomHito = texto(get(f, 'Hito'))
    if (nomHito && nomHito !== hito?.nombre) {
      const ini = fecha('Inicio'), fin = fecha('Fin')
      if (ini && fin && fin < ini) errores.push(`Fila ${linea}: el hito «${nomHito}» termina antes de empezar.`)
      hito = { nombre: nomHito, fase: texto(get(f, 'Fase')), inicio: ini, fin, reqs: [] }
      plan.hitos.push(hito)
    }
    const nomReq = texto(get(f, 'Requerimiento'))
    if (nomReq) {
      if (!hito) { errores.push(`Fila ${linea}: el requerimiento «${nomReq}» no tiene hito.`); return }
      const ini = fecha('Inicio requerimiento'), fin = fecha('Fin requerimiento')
      if (ini && fin && fin < ini) errores.push(`Fila ${linea}: el requerimiento «${nomReq}» termina antes de empezar.`)
      hito.reqs.push({ nombre: nomReq, resp: texto(get(f, 'Responsable requerimiento')), inicio: ini || hito.inicio, fin: fin || hito.fin })
    }
  })
  if (!planes.length && !errores.length) errores.push('No encontré proyectos en el archivo.')
  return { planes, errores }
}

/** CSV sencillo: separador coma o punto y coma, comillas dobles */
export function leerCsv(textoCsv: string): unknown[][] {
  const t = textoCsv.replace(/^﻿/, '')
  const sep = (t.split('\n')[0].match(/;/g)?.length ?? 0) > (t.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const filas: string[][] = []
  let fila: string[] = [], celda = '', comillas = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') { celda += '"'; i++ } else if (c === '"') comillas = false; else celda += c
    } else if (c === '"') comillas = true
    else if (c === sep) { fila.push(celda); celda = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; fila.push(celda); filas.push(fila); fila = []; celda = '' }
    else celda += c
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila) }
  return filas
}

export const resumenPlanes = (planes: PlanImp[]) => ({
  proyectos: planes.length,
  hitos: planes.reduce((n, p) => n + p.hitos.length, 0),
  reqs: planes.reduce((n, p) => n + p.hitos.reduce((m, h) => m + h.reqs.length, 0), 0),
})

const nul = (s: string) => (s ? s : null)
/** Crea los proyectos en el área indicada. Si algo falla a medio camino, borra lo creado en esa corrida. */
export async function importarPlanes(planes: PlanImp[], areaId: string, trimestreDefecto: string): Promise<number> {
  const creados: string[] = []
  try {
    for (const p of planes) {
      const { data: proy, error: e1 } = await supabase.from('proyectos').insert({ area_id: areaId, nombre: p.nombre, trimestre: p.trimestre || trimestreDefecto, responsable: nul(p.responsable) }).select('id').single()
      if (e1 || !proy) throw new Error(e1?.message ?? 'No se pudo crear el proyecto')
      creados.push(proy.id)
      if (!p.hitos.length) continue
      const { data: hs, error: e2 } = await supabase.from('hitos')
        .insert(p.hitos.map((h, i) => ({ proyecto_id: proy.id, nombre: h.nombre, fase: nul(h.fase), inicio: nul(h.inicio), fin: nul(h.fin), orden: i }))).select('id, orden')
      if (e2 || !hs) throw new Error(e2?.message ?? 'No se pudieron crear los hitos')
      const porOrden = new Map(hs.map(h => [h.orden as number, h.id as string]))
      const reqs = p.hitos.flatMap((h, i) => h.reqs.map(r => ({ hito_id: porOrden.get(i)!, nombre: r.nombre, responsable: nul(r.resp), inicio: nul(r.inicio), fin: nul(r.fin) })))
      if (reqs.length) {
        const { error: e3 } = await supabase.from('requerimientos').insert(reqs)
        if (e3) throw new Error(e3.message)
      }
    }
    return creados.length
  } catch (e) {
    if (creados.length) await supabase.from('proyectos').delete().in('id', creados)
    throw e
  }
}
