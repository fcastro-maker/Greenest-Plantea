export interface Req { id: string; nombre: string; resp: string; inicio: string; fin: string; hecho: boolean }
export interface Hito { id: string; nombre: string; inicio: string; fin: string; hecho?: boolean; reqs: Req[] }
export interface Proyecto {
  id: string; nombre: string; equipo: string; resp: string
  alcance: 'Interno' | 'Externo'; trimestre: string; nota?: string
  /** Fechas aproximadas (ventana del trimestre) mientras no se aprueba el EPOC */
  provisional?: boolean
  /** Avance manual 0-100. Si falta, se calcula con los requerimientos de los hitos */
  avance?: number
  hitos: Hito[]
}
export interface Trimestre { id: string; inicio: string; fin: string }
export interface Portfolio { actualizado: string; trimestres: Trimestre[]; proyectos: Proyecto[] }
export type Estado = 'completado' | 'en-curso' | 'en-riesgo' | 'atrasado' | 'por-iniciar' | 'por-programar'
