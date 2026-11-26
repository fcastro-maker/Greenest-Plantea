import { supabase } from './supabase'
import type { Area, Cambio, Dependencia, Hito, Perfil, Proyecto, Req } from '../types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const ok = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}
const nul = (s: string | undefined | null) => (s && s.trim() ? s.trim() : null)

export async function cargarAreas(): Promise<Area[]> {
  return ok(await supabase.from('areas').select('id,nombre').order('nombre')) ?? []
}

export async function cargarPerfil(id: string): Promise<Perfil | null> {
  return ok(await supabase.from('perfiles').select('*').eq('id', id).maybeSingle())
}
export async function cargarPerfiles(): Promise<Perfil[]> {
  return ok(await supabase.from('perfiles').select('*').order('correo')) ?? []
}
export async function actualizarPerfil(id: string, cambios: Partial<Pick<Perfil, 'nombre' | 'area_id' | 'rol' | 'activo'>>) {
  ok(await supabase.from('perfiles').update(cambios).eq('id', id).select('id'))
}
export async function crearArea(nombre: string) {
  ok(await supabase.from('areas').insert({ nombre: nombre.trim() }).select('id'))
}

export async function cargarProyectos(areas: Area[]): Promise<Proyecto[]> {
  const rows: any[] = ok(await supabase.from('proyectos').select('*, hitos(*, requerimientos(*))').order('created_at')) ?? []
  const nombreArea = new Map(areas.map(a => [a.id, a.nombre]))
  const deps = await cargarDependencias()
  return rows.map(p => ({
    id: p.id, nombre: p.nombre, areaId: p.area_id, equipo: nombreArea.get(p.area_id) ?? '—',
    resp: p.responsable ?? '', alcance: p.alcance, trimestre: p.trimestre, nota: p.nota ?? undefined,
    provisional: p.provisional, avance: p.avance ?? undefined,
    actualizado: p.actualizado_en ?? undefined, actualizadoPor: p.actualizado_por ?? undefined,
    depende: deps.filter(d => d.proyecto_id === p.id).map((d): Dependencia => ({ id: d.depende_id, nombre: d.depende_nombre, area: d.depende_area, atrasado: d.atrasado, bloqueado: d.bloqueado, completado: d.completado })),
    hitos: [...(p.hitos ?? [])]
      .sort((a: any, b: any) => a.orden - b.orden || (a.inicio ?? '').localeCompare(b.inicio ?? ''))
      .map((h: any): Hito => ({
        id: h.id, nombre: h.nombre, fase: h.fase ?? '', inicio: h.inicio ?? '', fin: h.fin ?? '', hecho: h.hecho, bloqueado: h.bloqueado, motivoBloqueo: h.motivo_bloqueo ?? undefined,
        reqs: [...(h.requerimientos ?? [])]
          .sort((a: any, b: any) => (a.inicio ?? '').localeCompare(b.inicio ?? '') || a.created_at.localeCompare(b.created_at))
          .map((r: any): Req => ({ id: r.id, nombre: r.nombre, resp: r.responsable ?? '', inicio: r.inicio ?? h.inicio ?? '', fin: r.fin ?? h.fin ?? '', hecho: r.hecho })),
      })),
  }))
}

export async function crearProyecto(d: { area_id: string; nombre: string; trimestre: string }): Promise<string> {
  const r: any = ok(await supabase.from('proyectos').insert(d).select('id').single())
  return r.id
}
export async function editarProyecto(id: string, c: { nombre?: string; area_id?: string; responsable?: string; alcance?: string; trimestre?: string; nota?: string; provisional?: boolean; avance?: number | null }) {
  const cambios: Record<string, unknown> = { ...c }
  if ('responsable' in c) cambios.responsable = nul(c.responsable)
  if ('nota' in c) cambios.nota = nul(c.nota)
  ok(await supabase.from('proyectos').update(cambios).eq('id', id).select('id'))
}
export async function borrarProyecto(id: string) { ok(await supabase.from('proyectos').delete().eq('id', id).select('id')) }

export async function crearHito(d: { proyecto_id: string; nombre: string; orden: number; inicio?: string; fin?: string; fase?: string }) {
  ok(await supabase.from('hitos').insert({ ...d, inicio: nul(d.inicio), fin: nul(d.fin), fase: nul(d.fase) }).select('id'))
}
export async function editarHito(id: string, c: { nombre?: string; fase?: string; inicio?: string; fin?: string; hecho?: boolean; bloqueado?: boolean; motivo_bloqueo?: string; motivo_cambio?: string }) {
  const cambios: Record<string, unknown> = { ...c }
  for (const k of ['fase', 'inicio', 'fin', 'motivo_bloqueo', 'motivo_cambio'] as const) if (k in c) cambios[k] = nul(c[k])
  ok(await supabase.from('hitos').update(cambios).eq('id', id).select('id'))
}
export async function borrarHito(id: string) { ok(await supabase.from('hitos').delete().eq('id', id).select('id')) }

export async function crearReq(d: { hito_id: string; nombre: string; inicio?: string; fin?: string }) {
  ok(await supabase.from('requerimientos').insert({ ...d, inicio: nul(d.inicio), fin: nul(d.fin) }).select('id'))
}
export async function editarReq(id: string, c: { nombre?: string; resp?: string; inicio?: string; fin?: string; hecho?: boolean }) {
  const cambios: Record<string, unknown> = {}
  if ('nombre' in c) cambios.nombre = c.nombre
  if ('resp' in c) cambios.responsable = nul(c.resp)
  if ('inicio' in c) cambios.inicio = nul(c.inicio)
  if ('fin' in c) cambios.fin = nul(c.fin)
  if ('hecho' in c) cambios.hecho = c.hecho
  ok(await supabase.from('requerimientos').update(cambios).eq('id', id).select('id'))
}
export async function borrarReq(id: string) { ok(await supabase.from('requerimientos').delete().eq('id', id).select('id')) }

/** "Está al día": registra que el plan se revisó sin cambios (el sello de actualización lo pone la base de datos) */
export async function confirmarAlDia(id: string, trimestre: string) {
  ok(await supabase.from('proyectos').update({ trimestre }).eq('id', id).select('id'))
}

/* ---------- Dependencias, historial y duplicado ---------- */
interface FilaDep { proyecto_id: string; depende_id: string; depende_nombre: string; depende_area: string; atrasado: boolean; bloqueado: boolean; completado: boolean }
export async function cargarDependencias(): Promise<FilaDep[]> {
  const r = await supabase.rpc('dependencias_visibles')
  return r.error ? [] : ((r.data ?? []) as FilaDep[])
}
export interface ProyectoElegible { id: string; nombre: string; area_id: string; area: string }
export async function proyectosParaDependencia(): Promise<ProyectoElegible[]> {
  return ok(await supabase.rpc('proyectos_para_dependencia')) ?? []
}
export async function agregarDependencia(proyecto_id: string, depende_de: string) {
  ok(await supabase.from('dependencias').insert({ proyecto_id, depende_de }).select('id'))
}
export async function quitarDependencia(proyecto_id: string, depende_de: string) {
  ok(await supabase.from('dependencias').delete().eq('proyecto_id', proyecto_id).eq('depende_de', depende_de).select('id'))
}
export async function cargarHistorial(proyecto_id: string): Promise<Cambio[]> {
  return ok(await supabase.from('historial').select('*').eq('proyecto_id', proyecto_id).order('creado_en', { ascending: false }).limit(40)) ?? []
}
export async function duplicarProyecto(id: string, trimestre: string, desplazar: number, reqs: boolean): Promise<string> {
  return ok(await supabase.rpc('duplicar_proyecto', { p_id: id, p_trimestre: trimestre, p_desplazar: desplazar, p_reqs: reqs })) as string
}
