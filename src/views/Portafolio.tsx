import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { Proyecto, Trimestre } from '../types'
import { addDays, diffDays, duracion, fmt, mesCorto, parse, relativo, toIso } from '../lib/dates'
import { estadoHito, estadoProyecto, hitoAvance, label, proyAvance, rango } from '../lib/status'

const TL_INI = parse('2026-11-01')
const TL_FIN = parse('2027-12-31')
const PX_ANIO = 2.6 // px por día, vista de todo el periodo
const PX_TRIM = 8 // px por día, vista de detalle
const LEFT = 760

function meses(PX: number) {
  const x = (iso: string) => diffDays(TL_INI, parse(iso)) * PX
  const out: { label: string; left: number; width: number; anio: boolean }[] = []
  let d = new Date(Date.UTC(2026, 10, 1))
  while (d <= TL_FIN) {
    const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    out.push({ label: mesCorto(d.getUTCMonth()), left: x(toIso(d)), width: diffDays(d, n) * PX, anio: d.getUTCMonth() === 0 || out.length === 0 })
    d = n
  }
  return out
}

export default function Portafolio({ proyectos, trimestres, hoy }: { proyectos: Proyecto[]; trimestres: Trimestre[]; hoy: Date }) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState<'anio' | 'trim'>('anio')
  const PX = zoom === 'anio' ? PX_ANIO : PX_TRIM
  const x = (iso: string) => diffDays(TL_INI, parse(iso)) * PX
  const TLW = (diffDays(TL_INI, TL_FIN) + 1) * PX
  const ms = useMemo(() => meses(PX), [PX])
  const sc = useRef<HTMLDivElement>(null)
  useEffect(() => { if (sc.current) sc.current.scrollLeft = zoom === 'trim' ? Math.max(0, x(toIso(hoy)) - 40) : 0 }, [zoom])
  const toggle = (id: string) => setAbiertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const todos = () => setAbiertos(new Set(proyectos.flatMap(p => [p.id, ...p.hitos.map(h => h.id)])))
  const nada = () => setAbiertos(new Set())
  const hoyX = x(toIso(hoy))
  const hoyVisible = hoyX >= 0 && hoyX <= TLW

  const renderProyecto = (p: Proyecto) => {
            const est = estadoProyecto(p, hoy)
            const av = proyAvance(p)
            const r = rango(p)
            const open = abiertos.has(p.id)
            return (
              <Fragment key={p.id}>
                <div className="row proj">
                  <div className="rl" style={{ width: LEFT }}>
                    <button className="c-name name" onClick={() => toggle(p.id)} aria-expanded={open}>
                      <span className={`caret ${open ? 'open' : ''}`} />
                      <span><b>{p.nombre}</b><small>{p.resp ? `${p.resp} · ` : ''}{p.alcance}{p.provisional ? ' · fechas por validar' : ''}</small></span>
                    </button>
                    <span className="c-team">{p.equipo}</span>
                    <span className="c-av"><Meter v={av} e={est} /></span>
                    <span className="c-fin">{r ? <>{fmt(r.fin)}<small>{label(est)}</small></> : <small>{label(est)}</small>}</span>
                    <span className="c-dur">{r ? duracion(r.inicio, r.fin) : '—'}</span>
                  </div>
                  <div className="rr" style={{ width: TLW }}>
                    {r && (
                      <>
                        <div className={`track ${est} ${p.provisional ? 'prov' : ''}`} style={{ left: x(r.inicio), width: x(r.fin) - x(r.inicio) + PX }}>
                          <div className="fill" style={{ width: `${av ?? 0}%` }} />
                        </div>
                        {p.hitos.filter(h => h.fin).map(h => <Diamond key={h.id} left={x(h.fin) + PX / 2} e={estadoHito(h, hoy)} title={`${h.nombre} · ${fmt(h.fin)}`} />)}
                      </>
                    )}
                    {!r && <span className="nodate">Sin fecha programada</span>}
                  </div>
                </div>

                {open && p.hitos.map(h => {
                  const eh = estadoHito(h, hoy)
                  const ah = hitoAvance(h)
                  const hopen = abiertos.has(h.id)
                  const tiene = h.reqs.length > 0
                  return (
                    <Fragment key={h.id}>
                      <div className="row hito">
                        <div className="rl" style={{ width: LEFT }}>
                          <button className="c-name name" onClick={() => tiene && toggle(h.id)} disabled={!tiene} aria-expanded={hopen}>
                            <span className={`caret ${hopen ? 'open' : ''} ${tiene ? '' : 'none'}`} />
                            <span>{h.nombre}{(h.fase || tiene) && <small>{[h.fase, tiene ? `${h.reqs.filter(q => q.hecho).length} de ${h.reqs.length} requerimientos` : ''].filter(Boolean).join(' · ')}</small>}</span>
                          </button>
                          <span className="c-team" />
                          <span className="c-av"><Meter v={ah} e={eh} thin /></span>
                          <span className="c-fin">{h.fin ? <>{fmt(h.fin)}<small>{eh === 'completado' ? 'listo' : relativo(h.fin, hoy)}</small></> : <small>Sin fecha</small>}</span>
                          <span className="c-dur">{h.inicio && h.fin ? duracion(h.inicio, h.fin) : '—'}</span>
                        </div>
                        <div className="rr" style={{ width: TLW }}>
                          {h.inicio && h.fin && <div className={`tbar ${eh} ${p.provisional ? 'prov' : ''}`} style={{ left: x(h.inicio), width: Math.max(8, x(h.fin) - x(h.inicio) + PX) }} />}
                          {h.fin && <Diamond left={x(h.fin) + PX / 2} e={eh} title={`${h.nombre} · ${fmt(h.fin)}`} />}
                        </div>
                      </div>
                      {hopen && h.reqs.map(q => (
                        <div className="row req" key={q.id}>
                          <div className="rl" style={{ width: LEFT }}>
                            <span className="c-name name"><span className={`check ${q.hecho ? 'ok' : ''}`} aria-label={q.hecho ? 'Hecho' : 'Pendiente'} /><span className="txt" title={q.nombre}>{q.nombre}</span></span>
                            <span className="c-team">{q.resp}</span>
                            <span className="c-av" />
                            <span className="c-fin">{q.fin ? fmt(q.fin) : '—'}</span>
                            <span className="c-dur">{q.inicio && q.fin ? duracion(q.inicio, q.fin) : '—'}</span>
                          </div>
                          <div className="rr" style={{ width: TLW }}>
                            {q.inicio && q.fin && <div className={`tbar sm ${q.hecho ? 'completado' : 'req'}`} style={{ left: x(q.inicio), width: Math.max(6, x(q.fin) - x(q.inicio) + PX) }} />}
                          </div>
                        </div>
                      ))}
                    </Fragment>
                  )
                })}
              </Fragment>
            )
  }

  return (
    <section className="port">
      <div className="port-tools">
        <button onClick={todos}>Expandir todo</button>
        <button onClick={nada}>Contraer todo</button>
        <div className="seg" role="group" aria-label="Escala"><button className={zoom === 'anio' ? 'on' : ''} onClick={() => setZoom('anio')}>Todo el periodo</button><button className={zoom === 'trim' ? 'on' : ''} onClick={() => setZoom('trim')}>Detalle</button></div>
        <span className="hint">Abre un proyecto para ver sus hitos, y un hito para ver sus requerimientos.</span>
      </div>
      <div className="scroll" ref={sc}>
        <div className="grid" style={{ width: LEFT + TLW }}>
          {/* Cabecera */}
          <div className="head">
            <div className="hl" style={{ width: LEFT }}>
              <span className="c-name">Proyecto / hito</span><span className="c-team">Área</span><span className="c-av">Avance</span><span className="c-fin">Fecha objetivo</span><span className="c-dur">Duración</span>
            </div>
            <div className="hr" style={{ width: TLW }}>
              <div className="qrow">
                {trimestres.map(t => (
                  <div key={t.id} className="q" style={{ left: x(t.inicio), width: x(t.fin) - x(t.inicio) + PX }}>{t.id}</div>
                ))}
              </div>
              <div className="mrow">
                {ms.map((m, i) => <div key={i} className="m" style={{ left: m.left, width: m.width }}>{m.label}{m.anio ? ` ${i === 0 ? '26' : '27'}` : ''}</div>)}
              </div>
            </div>
          </div>

          {/* Líneas de mes y hoy */}
          <div className="gridlines" style={{ left: LEFT, width: TLW }} aria-hidden>
            {ms.map((m, i) => <i key={i} style={{ left: m.left }} />)}
            {hoyVisible && <b className="hoy" style={{ left: hoyX }}><span>Hoy</span></b>}
          </div>

          {/* Filas */}
          {proyectos.length === 0 && <p className="vacio">Todavía no hay proyectos con estos filtros. Las áreas los suben desde el menú Gestión.</p>}
          {trimestres.map(t => {
            const ps = proyectos.filter(p => p.trimestre === t.id)
            if (!ps.length) return null
            return (
              <Fragment key={t.id}>
                <div className="row qg">
                  <div className="rl" style={{ width: LEFT }}><b>{t.id}</b><small>{fmt(t.inicio)} – {fmt(t.fin)} · {ps.length} {ps.length === 1 ? 'proyecto' : 'proyectos'}</small></div>
                  <div className="rr" style={{ width: TLW }}><div className="qband" style={{ left: x(t.inicio), width: x(t.fin) - x(t.inicio) + PX }} /></div>
                </div>
                {ps.map(renderProyecto)}
              </Fragment>
            )
          })}

        </div>
      </div>
    </section>
  )
}

function Meter({ v, e, thin }: { v: number | null; e: string; thin?: boolean }) {
  return (
    <span className={`meter ${thin ? 'thin' : ''}`}>
      <span className="rail"><span className={`fillbar ${e}`} style={{ width: `${v ?? 0}%` }} /></span>
      <em>{v === null ? '—' : `${v}%`}</em>
    </span>
  )
}
function Diamond({ left, e, title }: { left: number; e: string; title: string }) {
  return <i className={`dia ${e}`} style={{ left }} title={title} />
}

export { addDays }
