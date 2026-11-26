import { useState } from 'react'
import type { Area, Perfil, Proyecto } from '../types'
import { fmt, fmtLargo, relativo, toIso } from '../lib/dates'
import { label } from '../lib/status'
import { textoActualizacion } from '../lib/actualizacion'
import { contar, DIAS_PROXIMOS, DIAS_SIN_ACTUALIZAR, filas, proximosHitos, requerimientosPendientes, requierenAtencion, sinActualizar } from '../lib/resumen'
import { descargarCsv, imprimir } from '../lib/exportar'

interface Props {
  proyectos: Proyecto[]; areas: Area[]; perfil: Perfil; hoy: Date
  alDia: (p: Proyecto) => void
}

/** Muestra los primeros elementos y deja ver el resto con un clic */
function Lista<T>({ items, vacio, fila, max = 6 }: { items: T[]; vacio: string; fila: (x: T, i: number) => JSX.Element; max?: number }) {
  const [todo, setTodo] = useState(false)
  if (!items.length) return <p className="vacio">{vacio}</p>
  const ver = todo ? items : items.slice(0, max)
  return (
    <>
      <ul className="res-lista">{ver.map(fila)}</ul>
      {items.length > max && <button className="link" onClick={() => setTodo(!todo)}>{todo ? 'Ver menos' : `Ver ${items.length - max} más`}</button>}
    </>
  )
}

export default function Resumen({ proyectos, areas, perfil, hoy, alDia }: Props) {
  const verAreas = perfil.rol === 'admin' || perfil.rol === 'gerencia'
  const puedeEditar = (p: Proyecto) => perfil.rol === 'admin' || (perfil.rol === 'area' && perfil.area_id === p.areaId)
  const fs = filas(proyectos, hoy)
  const c = contar(fs)
  const atencion = requierenAtencion(fs)
  const proximos = proximosHitos(proyectos, hoy)
  const viejos = sinActualizar(fs)
  const pendientes = perfil.rol === 'area' ? requerimientosPendientes(proyectos, hoy) : []
  const nombreArea = areas.find(a => a.id === perfil.area_id)?.nombre

  const exportar = () => descargarCsv(`resumen-${toIso(hoy)}.csv`, [
    ['Área', 'Proyecto', 'Trimestre', 'Responsable', 'Estado', 'Avance %', 'Inicio', 'Fin', 'Próximo hito pendiente', 'Vence', 'Última actualización', 'Actualizado por'],
    ...fs.map(f => [f.p.equipo, f.p.nombre, f.p.trimestre, f.p.resp, label(f.estado), f.avance, f.inicio, f.fin, f.hito?.nombre, f.hito?.fin, f.p.actualizado ? f.p.actualizado.slice(0, 16).replace('T', ' ') : '', f.p.actualizadoPor]),
  ])

  const porArea = areas.map(a => ({ a, c: contar(fs.filter(f => f.p.areaId === a.id)) })).filter(x => x.c.total > 0)

  return (
    <section className="resumen">
      <div className="res-head">
        <div>
          <h2>{verAreas ? 'Resumen ejecutivo' : `Resumen de ${nombreArea ?? 'tu área'}`}</h2>
          <small>Al {fmtLargo(toIso(hoy))}</small>
        </div>
        <div className="export">
          <button className="ghost" onClick={exportar}>Exportar CSV</button>
          <button className="ghost" onClick={imprimir}>Imprimir / PDF</button>
        </div>
      </div>

      <p className="kpis">
        <span><b>{c.total}</b> proyectos</span>
        <span><b>{c.enCurso}</b> en curso</span>
        <span className={c.enRiesgo ? 'alerta riesgo' : ''}><b>{c.enRiesgo}</b> en riesgo</span>
        <span className={c.atrasado ? 'alerta atras' : ''}><b>{c.atrasado}</b> atrasados</span>
        <span><b>{c.completado}</b> completados</span>
        <span>Avance promedio <b>{c.avance === null ? '—' : `${c.avance}%`}</b></span>
      </p>

      {verAreas ? (
        <>
          <h3>Por área</h3>
          <table className="res-tabla">
            <thead><tr><th>Área</th><th className="n">Proyectos</th><th className="n">En curso</th><th className="n">En riesgo</th><th className="n">Atrasados</th><th className="n">Completados</th><th>Avance</th></tr></thead>
            <tbody>
              {porArea.map(({ a, c: k }) => (
                <tr key={a.id}>
                  <td>{a.nombre}</td><td className="n">{k.total}</td><td className="n">{k.enCurso}</td>
                  <td className={`n ${k.enRiesgo ? 'riesgo' : ''}`}>{k.enRiesgo}</td><td className={`n ${k.atrasado ? 'atras' : ''}`}>{k.atrasado}</td><td className="n">{k.completado}</td>
                  <td><span className="barra"><i style={{ width: `${k.avance ?? 0}%` }} /></span> <small className="inl">{k.avance === null ? '—' : `${k.avance}%`}</small></td>
                </tr>
              ))}
              {!porArea.length && <tr><td colSpan={7} className="vacio">Aún no hay proyectos cargados.</td></tr>}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <h3>Tus proyectos</h3>
          <table className="res-tabla">
            <thead><tr><th>Proyecto</th><th>Q</th><th>Estado</th><th>Avance</th><th>Próximo hito</th><th>Actualizado</th></tr></thead>
            <tbody>
              {fs.map(f => (
                <tr key={f.p.id}>
                  <td>{f.p.nombre}</td><td>{f.p.trimestre}</td>
                  <td><i className={`dot ${f.estado}`} /> {label(f.estado)}</td>
                  <td><span className="barra"><i style={{ width: `${f.avance ?? 0}%` }} /></span> <small className="inl">{f.avance === null ? '—' : `${f.avance}%`}</small></td>
                  <td>{f.hito ? <>{f.hito.nombre} <small className="inl">{relativo(f.hito.fin, hoy)}</small></> : '—'}</td>
                  <td>{f.p.actualizado ? textoActualizacion(f.p.actualizado) : 'Nunca'}</td>
                </tr>
              ))}
              {!fs.length && <tr><td colSpan={6} className="vacio">Todavía no tienes proyectos. Créalos en Gestión.</td></tr>}
            </tbody>
          </table>
        </>
      )}

      <div className="res-cols">
        <div>
          <h3>Requiere atención</h3>
          <Lista items={atencion} vacio="Nada atrasado ni en riesgo. Buen momento." fila={f => (
            <li key={f.p.id}>
              <i className={`dot ${f.estado}`} />
              <div><b>{f.p.nombre}</b>{verAreas && <small className="inl"> · {f.p.equipo}</small>}
                <small>{label(f.estado)}{f.hito ? ` · ${f.hito.nombre}, vence ${fmt(f.hito.fin)} (${relativo(f.hito.fin, hoy)})` : ''}</small></div>
            </li>
          )} />
        </div>
        <div>
          <h3>Próximos {DIAS_PROXIMOS} días</h3>
          <Lista items={proximos} vacio="No hay hitos por vencer en este periodo." fila={x => (
            <li key={x.hito.id}>
              <span className="fecha">{fmt(x.hito.fin)}</span>
              <div><b>{x.hito.nombre}</b><small>{x.p.nombre}{verAreas ? ` · ${x.p.equipo}` : ''} · {relativo(x.hito.fin, hoy)}</small></div>
            </li>
          )} />
        </div>
      </div>

      <h3>Sin actualizar <small className="inl">más de {DIAS_SIN_ACTUALIZAR} días sin cambios</small></h3>
      <Lista items={viejos} vacio="Todos los planes se han actualizado recientemente." max={5} fila={f => (
        <li key={f.p.id} className="con-accion">
          <div><b>{f.p.nombre}</b>{verAreas && <small className="inl"> · {f.p.equipo}</small>}
            <small>{f.diasSin === null ? 'Nunca se ha actualizado' : `Último cambio hace ${f.diasSin} días${f.p.actualizadoPor ? ` · ${f.p.actualizadoPor}` : ''}`}</small></div>
          {puedeEditar(f.p) && <button className="ghost" onClick={() => alDia(f.p)} title="Registra que revisaste el plan y sigue igual">Está al día</button>}
        </li>
      )} />

      {perfil.rol === 'area' && (
        <>
          <h3>Pendientes de esta semana <small className="inl">vencidos o que vencen en 7 días</small></h3>
          <Lista items={pendientes} vacio="No tienes requerimientos vencidos ni por vencer esta semana." max={8} fila={(r, i) => (
            <li key={i}>
              <span className={`fecha ${r.dias < 0 ? 'atras' : ''}`}>{fmt(r.fin)}</span>
              <div><b>{r.nombre}</b><small>{r.proyecto}{r.resp ? ` · ${r.resp}` : ''} · {relativo(r.fin, hoy)}</small></div>
            </li>
          )} />
        </>
      )}
    </section>
  )
}
