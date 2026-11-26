import { Fragment, useState } from 'react'
import type { Proyecto } from '../types'
import { fmt, fmtLargo, relativo, toIso } from '../lib/dates'
import { cargaPorResponsable } from '../lib/resumen'
import { descargarCsv, imprimir } from '../lib/exportar'

export default function Carga({ proyectos, hoy }: { proyectos: Proyecto[]; hoy: Date }) {
  const filas = cargaPorResponsable(proyectos, hoy)
  const [abierto, setAbierto] = useState<string | null>(null)
  const max = Math.max(1, ...filas.map(f => f.abiertos))
  const tot = filas.reduce((t, f) => ({ v: t.v + f.vencidos, s: t.s + f.semana, m: t.m + f.mes, a: t.a + f.abiertos }), { v: 0, s: 0, m: 0, a: 0 })

  const exportar = () => descargarCsv(`carga-por-responsable-${toIso(hoy)}.csv`, [
    ['Responsable', 'Vencidos', 'Esta semana (7 días)', 'Próximo mes (8–30 días)', 'Abiertos en total'],
    ...filas.map(f => [f.resp, f.vencidos, f.semana, f.mes, f.abiertos]),
    [],
    ['Detalle', 'Responsable', 'Requerimiento', 'Proyecto', 'Vence'],
    ...filas.flatMap(f => f.items.map(i => ['', f.resp, i.nombre, i.proyecto, i.fin])),
  ])

  return (
    <section className="resumen">
      <div className="res-head">
        <div><h2>Carga por responsable</h2><small>Requerimientos sin terminar · al {fmtLargo(toIso(hoy))}</small></div>
        <div className="export">
          <button className="ghost" onClick={exportar}>Exportar CSV</button>
          <button className="ghost" onClick={imprimir}>Imprimir / PDF</button>
        </div>
      </div>

      <p className="kpis">
        <span className={tot.v ? 'alerta atras' : ''}><b>{tot.v}</b> vencidos</span>
        <span><b>{tot.s}</b> esta semana</span>
        <span><b>{tot.m}</b> el resto del mes</span>
        <span><b>{tot.a}</b> abiertos en total</span>
        <span><b>{filas.filter(f => f.resp !== 'Sin responsable').length}</b> personas</span>
      </p>

      {!filas.length ? <p className="vacio">No hay requerimientos abiertos. Los requerimientos se agregan dentro de cada hito, en Gestión.</p> : (
        <table className="res-tabla">
          <thead><tr><th>Responsable</th><th className="n">Vencidos</th><th className="n">Esta semana</th><th className="n">Próximo mes</th><th>Abiertos</th><th /></tr></thead>
          <tbody>
            {filas.map(f => (
              <Fragment key={f.resp}>
                <tr className={f.resp === 'Sin responsable' ? 'sin-resp' : ''}>
                  <td>{f.resp}</td>
                  <td className={`n ${f.vencidos ? 'atras' : ''}`}>{f.vencidos || '·'}</td>
                  <td className="n">{f.semana || '·'}</td>
                  <td className="n">{f.mes || '·'}</td>
                  <td><span className="barra"><i style={{ width: `${(f.abiertos / max) * 100}%` }} /></span> <small className="inl">{f.abiertos}</small></td>
                  <td><button className="link" onClick={() => setAbierto(abierto === f.resp ? null : f.resp)}>{abierto === f.resp ? 'Ocultar' : 'Ver detalle'}</button></td>
                </tr>
                {abierto === f.resp && (
                  <tr className="detalle"><td colSpan={6}>
                    <ul className="res-lista">
                      {f.items.slice(0, 30).map((i, k) => (
                        <li key={k}>
                          <span className={`fecha ${i.dias < 0 ? 'atras' : ''}`}>{i.fin ? fmt(i.fin) : 'Sin fecha'}</span>
                          <div><b>{i.nombre}</b><small>{i.proyecto}{i.fin ? ` · ${relativo(i.fin, hoy)}` : ''}</small></div>
                        </li>
                      ))}
                    </ul>
                    {f.items.length > 30 && <small>Y {f.items.length - 30} más (están en el CSV).</small>}
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      <p className="nota-pie">«Esta semana» cuenta lo que vence en los próximos 7 días; «Próximo mes», de 8 a 30 días. Los requerimientos sin responsable aparecen aparte para repartirlos.</p>
    </section>
  )
}
