import { useMemo, useState } from 'react'
import type { Proyecto } from '../types'
import { addDays, fmt, mesLargo, parse, toIso } from '../lib/dates'
import { estadoHito, estadoProyecto, label, proyAvance, rango } from '../lib/status'

interface Ev { fecha: string; texto: string; proyecto: string; estado: string }

export default function Calendario({ proyectos, hoy }: { proyectos: Proyecto[]; hoy: Date }) {
  const [mes, setMes] = useState(() => new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)))
  const y = mes.getUTCFullYear(), m = mes.getUTCMonth()

  const eventos = useMemo(() => {
    const map = new Map<string, Ev[]>()
    for (const p of proyectos) {
      const ult = p.hitos.filter(h => h.fin).map(h => h.fin).sort().pop()
      for (const h of p.hitos) {
        if (!h.fin) continue
        const e: Ev = { fecha: h.fin, texto: h.fin === ult ? `Cierre · ${p.nombre}` : h.nombre, proyecto: p.nombre, estado: estadoHito(h, hoy) }
        map.set(h.fin, [...(map.get(h.fin) ?? []), e])
      }
    }
    return map
  }, [proyectos, hoy])

  // Semanas (lunes a domingo) que cubren el mes
  const primero = new Date(Date.UTC(y, m, 1))
  const inicio = addDays(primero, -((primero.getUTCDay() + 6) % 7))
  const ultimo = new Date(Date.UTC(y, m + 1, 0))
  const semanas = Math.ceil(((ultimo.getTime() - inicio.getTime()) / 86400000 + 1) / 7)
  const dias = Array.from({ length: semanas * 7 }, (_, i) => addDays(inicio, i))

  const terminan = proyectos
    .map(p => ({ p, r: rango(p) }))
    .filter(x => x.r && parse(x.r.fin).getUTCFullYear() === y && parse(x.r.fin).getUTCMonth() === m)
    .sort((a, b) => a.r!.fin.localeCompare(b.r!.fin))

  const cambiar = (n: number) => setMes(new Date(Date.UTC(y, m + n, 1)))

  return (
    <section className="cal">
      <div className="cal-main">
        <div className="cal-tools">
          <button onClick={() => cambiar(-1)} aria-label="Mes anterior">‹</button>
          <h2>{mesLargo(m)} {y}</h2>
          <button onClick={() => cambiar(1)} aria-label="Mes siguiente">›</button>
          <button className="ghost" onClick={() => setMes(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)))}>Hoy</button>
        </div>
        <div className="cal-grid">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="dow">{d}</div>)}
          {dias.map(d => {
            const iso = toIso(d)
            const fuera = d.getUTCMonth() !== m
            const evs = eventos.get(iso) ?? []
            const esHoy = iso === toIso(hoy)
            return (
              <div key={iso} className={`day ${fuera ? 'out' : ''} ${esHoy ? 'now' : ''} ${d.getUTCDay() % 6 === 0 ? 'we' : ''}`}>
                <span className="num">{d.getUTCDate()}</span>
                <ul>
                  {evs.slice(0, 3).map((e, i) => <li key={i} className={e.estado} title={`${e.proyecto} · ${e.texto}`}><i className={`dia ${e.estado}`} /><span>{e.texto}</span></li>)}
                  {evs.length > 3 && <li className="more">+{evs.length - 3} más</li>}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
      <aside className="cal-side">
        <h3>Proyectos que terminan en {mesLargo(m)}</h3>
        {terminan.length === 0 && <p className="vacio">Ningún proyecto cierra este mes.</p>}
        <ul>
          {terminan.map(({ p, r }) => {
            const e = estadoProyecto(p, hoy); const a = proyAvance(p)
            return (
              <li key={p.id}>
                <div><b>{p.nombre}</b><small>{fmt(r!.fin)} · {label(e)}</small></div>
                <span className="meter"><span className="rail"><span className={`fillbar ${e}`} style={{ width: `${a ?? 0}%` }} /></span><em>{a === null ? '—' : `${a}%`}</em></span>
              </li>
            )
          })}
        </ul>
      </aside>
    </section>
  )
}
