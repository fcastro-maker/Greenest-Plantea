import { useEffect, useState } from 'react'
import type { Cambio, Proyecto } from '../types'
import { TRIMESTRES } from '../types'
import { diffDays, fmt, parse } from '../lib/dates'
import { textoActualizacion } from '../lib/actualizacion'
import * as D from '../lib/datos'

type Act = (fn: () => Promise<void>) => Promise<void>

/** Proyectos de los que depende este. Si alguno se atrasa o se bloquea, este pasa a «en riesgo». */
export function Dependencias({ p, act }: { p: Proyecto; act: Act }) {
  const [opciones, setOpciones] = useState<D.ProyectoElegible[]>([])
  useEffect(() => { D.proyectosParaDependencia().then(setOpciones).catch(() => setOpciones([])) }, [])
  const ya = new Set((p.depende ?? []).map(d => d.id))
  const libres = opciones.filter(o => o.id !== p.id && !ya.has(o.id))
  return (
    <div className="bloque-ed">
      <h3>Depende de</h3>
      {(p.depende ?? []).length === 0 && <p className="sub">Sin dependencias. Agrega un proyecto (de tu área o de otra) del que este necesite resultados.</p>}
      <ul className="deps">
        {(p.depende ?? []).map(d => (
          <li key={d.id}>
            <span><b>{d.nombre}</b> <small className="inl">· {d.area}{d.completado ? ' · completado' : d.bloqueado ? ' · bloqueado' : d.atrasado ? ' · atrasado' : ''}</small></span>
            <button className="x" title="Quitar dependencia" onClick={() => act(() => D.quitarDependencia(p.id, d.id))}>✕</button>
          </li>
        ))}
      </ul>
      {libres.length > 0 && (
        <select value="" onChange={e => e.target.value && act(() => D.agregarDependencia(p.id, e.target.value))} aria-label="Agregar dependencia">
          <option value="">+ Agregar dependencia…</option>
          {libres.map(o => <option key={o.id} value={o.id}>{o.area} · {o.nombre}</option>)}
        </select>
      )}
    </div>
  )
}

const fechaCorta = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmt(v) : v || '—')
function describir(c: Cambio): string {
  const que = c.entidad === 'proyecto' ? 'Proyecto' : c.entidad === 'hito' ? `Hito «${c.nombre}»` : `Requerimiento «${c.nombre}»`
  if (c.campo === 'hecho') return `${que}: ${c.despues === 'true' ? 'marcado como hecho' : 'vuelto a pendiente'}`
  if (c.campo === 'bloqueado') return c.despues === 'true' ? `${que}: bloqueado` : `${que}: desbloqueado`
  if (c.campo === 'inicio' || c.campo === 'fin') return `${que}: ${c.campo === 'inicio' ? 'inicio' : 'fin'} ${fechaCorta(c.antes)} → ${fechaCorta(c.despues)}`
  return `${que}: ${c.campo} ${c.antes || '—'} → ${c.despues || '—'}`
}

/** Quién cambió qué y por qué (se carga al abrirlo) */
export function Historial({ p }: { p: Proyecto }) {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState<Cambio[] | null>(null)
  useEffect(() => {
    if (!abierto) return
    let vivo = true
    D.cargarHistorial(p.id).then(r => vivo && setItems(r)).catch(() => vivo && setItems([]))
    return () => { vivo = false }
  }, [abierto, p.id, p.actualizado])
  return (
    <div className="bloque-ed">
      <div className="lista-head"><h3>Historial de cambios</h3>
        <button className="link" onClick={() => setAbierto(!abierto)}>{abierto ? 'Ocultar' : 'Ver historial'}</button>
      </div>
      {abierto && (items === null ? <p className="sub">Cargando…</p> : items.length === 0 ? <p className="sub">Aún no hay cambios registrados.</p> : (
        <ul className="hist">
          {items.map(c => (
            <li key={c.id}>
              <small>{textoActualizacion(c.creado_en, c.por ?? undefined)}</small>
              <span>{describir(c)}</span>
              {c.motivo && <small className="mot">Motivo: {c.motivo}</small>}
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}

/** Copia el proyecto (hitos y, si se quiere, requerimientos) a otro trimestre, moviendo las fechas */
export function Duplicar({ p, act, onCreado }: { p: Proyecto; act: Act; onCreado: (id: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const idx = TRIMESTRES.findIndex(t => t.id === p.trimestre)
  const [q, setQ] = useState(TRIMESTRES[Math.min(idx + 1, TRIMESTRES.length - 1)]?.id ?? 'Q1')
  const [mover, setMover] = useState(true)
  const [reqs, setReqs] = useState(true)
  if (!abierto) return <button className="ghost" onClick={() => setAbierto(true)}>Duplicar como plantilla</button>
  const desplazar = mover && idx >= 0 ? diffDays(parse(TRIMESTRES[idx].inicio), parse(TRIMESTRES.find(t => t.id === q)!.inicio)) : 0
  return (
    <form className="duplicar" onSubmit={e => { e.preventDefault(); act(async () => { const id = await D.duplicarProyecto(p.id, q, desplazar, reqs); setAbierto(false); onCreado(id) }) }}>
      <label>Copiar a<select value={q} onChange={e => setQ(e.target.value)}>{TRIMESTRES.map(t => <option key={t.id}>{t.id}</option>)}</select></label>
      <label className="check-l"><input type="checkbox" checked={mover} onChange={e => setMover(e.target.checked)} /> Mover las fechas al nuevo trimestre ({desplazar >= 0 ? '+' : ''}{desplazar} días)</label>
      <label className="check-l"><input type="checkbox" checked={reqs} onChange={e => setReqs(e.target.checked)} /> Copiar también los requerimientos</label>
      <small>La copia queda sin avance, sin bloqueos y con las fechas marcadas «por validar».</small>
      <div className="acciones"><button type="button" className="ghost" onClick={() => setAbierto(false)}>Cancelar</button><button className="primary">Crear copia</button></div>
    </form>
  )
}
