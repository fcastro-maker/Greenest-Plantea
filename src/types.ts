export interface Req { id: string; nombre: string; resp: string; inicio: string; fin: string; hecho: boolean }
export interface Hito { id: string; nombre: string; fase: string; inicio: string; fin: string; hecho?: boolean; reqs: Req[] }
export interface Proyecto {
  id: string; nombre: string; equipo: string; areaId: string; resp: string
  alcance: 'Interno' | 'Externo'; trimestre: string; nota?: string
  /** Fechas aproximadas mientras no se validan */
  provisional?: boolean
  /** Avance manual 0-100. Si falta, se calcula con los requerimientos de los hitos */
  avance?: number
  hitos: Hito[]
}
export interface Trimestre { id: string; inicio: string; fin: string }
export interface Area { id: string; nombre: string }
export type Rol = 'admin' | 'editor' | 'lector'
export interface Perfil { id: string; correo: string; nombre: string | null; area_id: string | null; rol: Rol; activo: boolean }
export type Estado = 'completado' | 'en-curso' | 'en-riesgo' | 'atrasado' | 'por-iniciar' | 'por-programar'

export const TRIMESTRES: Trimestre[] = [
  { id: 'Q0', inicio: '2026-11-23', fin: '2026-12-22' },
  { id: 'Q1', inicio: '2027-01-04', fin: '2027-03-26' },
  { id: 'Q2', inicio: '2027-04-05', fin: '2027-06-25' },
  { id: 'Q3', inicio: '2027-07-05', fin: '2027-09-24' },
  { id: 'Q4', inicio: '2027-10-04', fin: '2027-12-24' },
]
export const FASES = ['Planificación', 'Diseño', 'Desarrollo', 'Pruebas', 'Despliegue', 'Cierre']
