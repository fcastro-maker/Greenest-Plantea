import { useEffect, useState } from 'react'
import type { Area, Hito, Perfil, Proyecto, Req } from '../types'
import { FASES, TRIMESTRES } from '../types'
import { addDays, diffDays, parse, toIso } from '../lib/dates'
import * as D from '../lib/datos'
import { textoActualizacion } from '../lib/actualizacion'

interface Props {
  proyectos: Proyecto[]; areas: Area[]; perfil: Perfil
  recargar: () => Promise<void>; error: (s: string) => void
}

function Campo({ value, onCommit, type = 'text', placeholder, disabled, list, min, className }: {
  value: string; onCommit: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean; list?: string; min?: number; className?: string
}) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <input className={className} type={type} value={v} placeholder={placeholder} disabled={disabled} list={list} min={min}
      onChange={e => setV(e.target.value)}
      onBlur={() => { if (v !== value) onCommit(v) }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
  )
}

export default function Gestion({ proyectos, areas, perfil, recargar, error }: Props) {
  const puede = (areaId: string) => perfil.rol === 'admin' || (perfil.rol === 'area' && perfil.area_id === areaId)
  const editables = proyectos.filter(p => puede(p.areaId))
  const [sel, setSel] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const act = async (fn: () => Promise<void>) => { try { await fn(); await recargar() } catch (e) { error((e as Error).message) } }
  const p = proyectos.find(x => x.id === sel) ?? null
  const areasPermitidas = perfil.rol === 'admin' ? areas : areas.filter(a => a.id === perfil.area_id)
  const puedeCrear = areasPermitidas.length > 0

  return (
    <section className="gestion">
      <aside className="panel lista">
        <div className="lista-head">
          <h2>{perfil.rol === 'admin' ? 'Todos los proyectos' : 'Proyectos de tu área'}</h2>
          {puedeCrear && <button className="primary" onClick={() => { setNuevo(true); setSel(null) }}>+ Proyecto</button>}
        </div>
        {!puedeCrear && <p className="sub">Tu cuenta aún no tiene un área asignada. Pídele a un administrador que te la asigne para poder subir proyectos.</p>}
        {editables.length === 0 && puedeCrear && <p className="sub">Todavía no hay proyectos. Crea el primero.</p>}
        <ul>
          {editables.map(x => (
            <li key={x.id}><button className={x.id === sel ? 'on' : ''} onClick={() => { setSel(x.id); setNuevo(false) }}>
              <b>{x.nombre}</b><small>{x.equipo} · {x.trimestre} · {x.hitos.length} hito(s)</small><small>Actualizado {textoActualizacion(x.actualizado, x.actualizadoPor)}</small>
            </button></li>
          ))}
        </ul>
      </aside>

      <div className="panel editor">
        {nuevo && <FormNuevo areas={areasPermitidas} onCancel={() => setNuevo(false)} onCrear={d => act(async () => { const id = await D.crearProyecto({ area_id: d.area_id, nombre: d.nombre, trimestre: d.trimestre }); if (d.fases) for (let i = 0; i < FASES.length; i++) await D.crearHito({ proyecto_id: id, nombre: FASES[i], fase: FASES[i], orden: i }); setNuevo(false); setSel(id) })} />}
        {!nuevo && !p && <p className="sub">Elige un proyecto de la lista o crea uno nuevo.</p>}
        {!nuevo && p && <EditorProyecto key={p.id} p={p} areas={areasPermitidas} act={act} onBorrado={() => setSel(null)} />}
      </div>
    </section>
  )
}

function FormNuevo({ areas, onCrear, onCancel }: { areas: Area[]; onCrear: (d: { area_id: string; nombre: string; trimestre: string; fases: boolean }) => void; onCancel: () => void }) {
  const [area, setArea] = useState(areas[0]?.id ?? '')
  const [nombre, setNombre] = useState('')
  const [q, setQ] = useState('Q1')
  const [fases, setFases] = useState(true)
  return (
    <form className="form" onSubmit={e => { e.preventDefault(); if (nombre.trim() && area) onCrear({ area_id: area, nombre: nombre.trim(), trimestre: q, fases }) }}>
      <h2>Nuevo proyecto</h2>
      <label>Nombre<input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus required /></label>
      <div className="dos">
        <label>Área<select value={area} onChange={e => setArea(e.target.value)}>{areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>
        <label>Trimestre<select value={q} onChange={e => setQ(e.target.value)}>{TRIMESTRES.map(t => <option key={t.id}>{t.id}</option>)}</select></label>
      </div>
      <label className="check-l"><input type="checkbox" checked={fases} onChange={e => setFases(e.target.checked)} /> Empezar con las 6 fases estándar ({FASES.join(', ')}) para completar solo las fechas</label>
      <div className="acciones"><button type="button" className="ghost" onClick={onCancel}>Cancelar</button><button className="primary">Crear y continuar</button></div>
    </form>
  )
}

function EditorProyecto({ p, areas, act, onBorrado }: { p: Proyecto; areas: Area[]; act: (fn: () => Promise<void>) => Promise<void>; onBorrado: () => void }) {
  const [verAv, setVerAv] = useState(false)
  return (
    <div className="form">
      <div className="lista-head">
        <div><h2>{p.nombre}</h2><small>Última actualización: {textoActualizacion(p.actualizado, p.actualizadoPor)}</small></div>
        <button className="peligro" onClick={() => { if (confirm(`¿Eliminar "${p.nombre}" con todos sus hitos y requerimientos?`)) act(async () => { await D.borrarProyecto(p.id); onBorrado() }) }}>Eliminar</button>
      </div>
      <label>Nombre<Campo value={p.nombre} onCommit={v => v.trim() && act(() => D.editarProyecto(p.id, { nombre: v.trim() }))} /></label>
      <div className="cuatro">
        <label>Área<select value={p.areaId} onChange={e => act(() => D.editarProyecto(p.id, { area_id: e.target.value }))}>{areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>
        <label>Trimestre<select value={p.trimestre} onChange={e => act(() => D.editarProyecto(p.id, { trimestre: e.target.value }))}>{TRIMESTRES.map(t => <option key={t.id}>{t.id}</option>)}</select></label>
        <label>Alcance<select value={p.alcance} onChange={e => act(() => D.editarProyecto(p.id, { alcance: e.target.value }))}><option>Interno</option><option>Externo</option></select></label>
        <label>Responsable<Campo value={p.resp} onCommit={v => act(() => D.editarProyecto(p.id, { responsable: v }))} /></label>
      </div>
      <label>Nota<Campo value={p.nota ?? ''} onCommit={v => act(() => D.editarProyecto(p.id, { nota: v }))} placeholder="Contexto breve (opcional)" /></label>
      <div className="checks">
        <label className="check-l"><input type="checkbox" checked={!!p.provisional} onChange={e => act(() => D.editarProyecto(p.id, { provisional: e.target.checked }))} /> Fechas por validar</label>
        <label className="check-l"><input type="checkbox" checked={verAv || typeof p.avance === 'number'} onChange={e => { setVerAv(e.target.checked); if (!e.target.checked) act(() => D.editarProyecto(p.id, { avance: null })) }} /> Avance manual</label>
        {(verAv || typeof p.avance === 'number') && <Campo type="number" min={0} className="num" value={String(p.avance ?? 0)} onCommit={v => act(() => D.editarProyecto(p.id, { avance: Math.max(0, Math.min(100, Number(v) || 0)) }))} />}
      </div>

      <div className="lista-head sec"><h3>Hitos por fase</h3>
        <button className="ghost" onClick={() => act(() => D.crearHito({ proyecto_id: p.id, nombre: 'Nuevo hito', orden: p.hitos.length }))}>+ Hito</button>
      </div>
      <datalist id="fases">{FASES.map(f => <option key={f} value={f} />)}</datalist>
      {p.hitos.length === 0 && <p className="sub">Agrega los hitos del proyecto con su fase, fecha de inicio y duración.</p>}
      {p.hitos.map(h => <FilaHito key={h.id} h={h} act={act} />)}
    </div>
  )
}

function FilaHito({ h, act }: { h: Hito; act: (fn: () => Promise<void>) => Promise<void> }) {
  const dias = h.inicio && h.fin ? diffDays(parse(h.inicio), parse(h.fin)) + 1 : null
  const mover = (inicio: string) => {
    if (!inicio) return act(() => D.editarHito(h.id, { inicio: '' }))
    const fin = dias && h.inicio ? toIso(addDays(parse(inicio), dias - 1)) : h.fin
    return act(() => D.editarHito(h.id, { inicio, fin: fin && fin >= inicio ? fin : '' }))
  }
  const durar = (v: string) => {
    const n = Math.max(1, Math.floor(Number(v) || 0))
    if (!h.inicio || !n) return
    return act(() => D.editarHito(h.id, { fin: toIso(addDays(parse(h.inicio), n - 1)) }))
  }
  return (
    <div className="hito-ed">
      <div className="fila-h">
        <Campo className="nom" value={h.nombre} onCommit={v => v.trim() && act(() => D.editarHito(h.id, { nombre: v.trim() }))} />
        <Campo className="fase" list="fases" placeholder="Fase" value={h.fase} onCommit={v => act(() => D.editarHito(h.id, { fase: v }))} />
        <label>Inicio<Campo type="date" value={h.inicio} onCommit={mover} /></label>
        <label>Días<Campo type="number" min={1} className="num" value={dias ? String(dias) : ''} onCommit={durar} /></label>
        <label>Fin<Campo type="date" value={h.fin} onCommit={v => act(() => D.editarHito(h.id, { fin: v }))} /></label>
        <label className="check-l"><input type="checkbox" checked={!!h.hecho} onChange={e => act(() => D.editarHito(h.id, { hecho: e.target.checked }))} /> Listo</label>
        <button className="x" title="Eliminar hito" onClick={() => { if (confirm(`¿Eliminar el hito "${h.nombre}"?`)) act(() => D.borrarHito(h.id)) }}>✕</button>
      </div>
      {h.reqs.map(r => <FilaReq key={r.id} r={r} act={act} />)}
      <button className="link" onClick={() => act(() => D.crearReq({ hito_id: h.id, nombre: 'Nuevo requerimiento', inicio: h.inicio, fin: h.fin }))}>+ Requerimiento</button>
    </div>
  )
}

function FilaReq({ r, act }: { r: Req; act: (fn: () => Promise<void>) => Promise<void> }) {
  return (
    <div className="fila-r">
      <input type="checkbox" checked={r.hecho} onChange={e => act(() => D.editarReq(r.id, { hecho: e.target.checked }))} aria-label="Hecho" />
      <Campo className="nom" value={r.nombre} onCommit={v => v.trim() && act(() => D.editarReq(r.id, { nombre: v.trim() }))} />
      <Campo className="resp" placeholder="Responsable" value={r.resp} onCommit={v => act(() => D.editarReq(r.id, { resp: v }))} />
      <Campo type="date" value={r.inicio} onCommit={v => act(() => D.editarReq(r.id, { inicio: v }))} />
      <Campo type="date" value={r.fin} onCommit={v => act(() => D.editarReq(r.id, { fin: v }))} />
      <button className="x" title="Eliminar" onClick={() => act(() => D.borrarReq(r.id))}>✕</button>
    </div>
  )
}
