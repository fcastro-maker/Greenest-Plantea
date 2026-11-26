import type { Area, Proyecto } from '../types'
import { TRIMESTRES } from '../types'
import { fmtLargo, toIso } from '../lib/dates'
import { contar, filas } from '../lib/resumen'
import { descargarCsv, imprimir } from '../lib/exportar'

interface Props { proyectos: Proyecto[]; areas: Area[]; hoy: Date; verAreas: boolean }

export default function Comparativo({ proyectos, areas, hoy, verAreas }: Props) {
  const fs = filas(proyectos, hoy)
  const porQ = TRIMESTRES.map(t => {
    const f = fs.filter(x => x.p.trimestre === t.id)
    const hitos = f.flatMap(x => x.p.hitos)
    const reqs = hitos.flatMap(h => h.reqs)
    return {
      t, c: contar(f),
      hitos: hitos.length, hitosListos: hitos.filter(h => h.hecho || (h.reqs.length > 0 && h.reqs.every(r => r.hecho))).length,
      reqs: reqs.length, reqsHechos: reqs.filter(r => r.hecho).length,
    }
  })
  const areasConDatos = areas.filter(a => fs.some(f => f.p.areaId === a.id))
  const max = Math.max(1, ...porQ.map(x => x.c.total))

  const exportar = () => descargarCsv(`comparativo-q-${toIso(hoy)}.csv`, [
    ['Trimestre', 'Inicio', 'Fin', 'Proyectos', 'Completados', 'En curso', 'En riesgo', 'Atrasados', 'Avance promedio %', 'Hitos', 'Hitos listos', 'Requerimientos', 'Requerimientos hechos'],
    ...porQ.map(x => [x.t.id, x.t.inicio, x.t.fin, x.c.total, x.c.completado, x.c.enCurso, x.c.enRiesgo, x.c.atrasado, x.c.avance, x.hitos, x.hitosListos, x.reqs, x.reqsHechos]),
    [],
    ['Proyectos por área y trimestre', ...TRIMESTRES.map(t => t.id)],
    ...areasConDatos.map(a => [a.nombre, ...TRIMESTRES.map(t => fs.filter(f => f.p.areaId === a.id && f.p.trimestre === t.id).length)]),
  ])

  return (
    <section className="resumen">
      <div className="res-head">
        <div><h2>Comparativo por trimestre</h2><small>Al {fmtLargo(toIso(hoy))}</small></div>
        <div className="export">
          <button className="ghost" onClick={exportar}>Exportar CSV</button>
          <button className="ghost" onClick={imprimir}>Imprimir / PDF</button>
        </div>
      </div>

      <table className="res-tabla">
        <thead><tr><th>Trimestre</th><th className="n">Proyectos</th><th>Carga</th><th className="n">En riesgo</th><th className="n">Atrasados</th><th className="n">Completados</th><th>Avance promedio</th><th className="n">Hitos listos</th><th className="n">Requerimientos</th></tr></thead>
        <tbody>
          {porQ.map(x => (
            <tr key={x.t.id}>
              <td><b>{x.t.id}</b> <small className="inl">{x.t.inicio.slice(5).replace('-', '/')} – {x.t.fin.slice(5).replace('-', '/')}</small></td>
              <td className="n">{x.c.total}</td>
              <td><span className="barra ancha"><i style={{ width: `${(x.c.total / max) * 100}%` }} /></span></td>
              <td className={`n ${x.c.enRiesgo ? 'riesgo' : ''}`}>{x.c.enRiesgo}</td>
              <td className={`n ${x.c.atrasado ? 'atras' : ''}`}>{x.c.atrasado}</td>
              <td className="n">{x.c.completado}</td>
              <td><span className="barra"><i style={{ width: `${x.c.avance ?? 0}%` }} /></span> <small className="inl">{x.c.avance === null ? '—' : `${x.c.avance}%`}</small></td>
              <td className="n">{x.hitosListos}/{x.hitos}</td>
              <td className="n">{x.reqsHechos}/{x.reqs}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {verAreas && areasConDatos.length > 0 && (
        <>
          <h3>Proyectos por área y trimestre</h3>
          <table className="res-tabla">
            <thead><tr><th>Área</th>{TRIMESTRES.map(t => <th key={t.id} className="n">{t.id}</th>)}<th className="n">Total</th></tr></thead>
            <tbody>
              {areasConDatos.map(a => {
                const fila = TRIMESTRES.map(t => fs.filter(f => f.p.areaId === a.id && f.p.trimestre === t.id).length)
                return <tr key={a.id}><td>{a.nombre}</td>{fila.map((n, i) => <td key={i} className="n">{n || '·'}</td>)}<td className="n"><b>{fila.reduce((s, n) => s + n, 0)}</b></td></tr>
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
