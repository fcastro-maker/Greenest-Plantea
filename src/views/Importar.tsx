import { useState } from 'react'
import type { Area } from '../types'
import { TRIMESTRES } from '../types'
import { descargarCsv } from '../lib/exportar'
import { COLUMNAS, EJEMPLO, importarPlanes, leerCsv, leerMatriz, resumenPlanes } from '../lib/importar'
import type { PlanImp } from '../lib/importar'

interface Props { areas: Area[]; onListo: (n: number) => void; onCancel: () => void; error: (s: string) => void }

export default function Importar({ areas, onListo, onCancel, error }: Props) {
  const [area, setArea] = useState(areas[0]?.id ?? '')
  const [q, setQ] = useState('Q1')
  const [planes, setPlanes] = useState<PlanImp[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [archivo, setArchivo] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  async function leer(f: File) {
    setArchivo(f.name); setPlanes([]); setErrores([])
    try {
      let matriz: unknown[][]
      if (/\.csv$/i.test(f.name)) matriz = leerCsv(await f.text())
      else if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import('read-excel-file/browser')
        matriz = (await readSheet(f)) as unknown[][]
      } else { setErrores(['Sube un archivo .xlsx o .csv.']); return }
      const r = leerMatriz(matriz)
      setPlanes(r.planes); setErrores(r.errores)
    } catch (e) { setErrores([`No pude leer el archivo: ${(e as Error).message}`]) }
  }
  const r = resumenPlanes(planes)
  const importar = async () => {
    setTrabajando(true)
    try { onListo(await importarPlanes(planes, area, q)) } catch (e) { error((e as Error).message) } finally { setTrabajando(false) }
  }

  return (
    <div className="form importar">
      <h2>Importar desde Excel</h2>
      <p className="sub">Una fila por requerimiento. Si un proyecto o un hito tiene varias filas, basta escribir su nombre en la primera y dejarlo vacío (o repetirlo) en las siguientes. Las fechas pueden ir como AAAA-MM-DD o DD/MM/AAAA.</p>
      <div className="acciones izq">
        <button type="button" className="ghost" onClick={() => descargarCsv('plantilla-importacion-plantea.csv', [[...COLUMNAS], ...EJEMPLO])}>Descargar plantilla</button>
        <label className="archivo">Elegir archivo (.xlsx o .csv)<input type="file" accept=".xlsx,.csv" onChange={e => e.target.files?.[0] && leer(e.target.files[0])} /></label>
      </div>
      {archivo && <small>Archivo: {archivo}</small>}

      {errores.length > 0 && (
        <div className="errores"><b>Revisa estos puntos:</b><ul>{errores.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>{errores.length > 10 && <small>Y {errores.length - 10} más.</small>}</div>
      )}
      {planes.length > 0 && (
        <>
          <p className="kpis"><span><b>{r.proyectos}</b> proyecto(s)</span><span><b>{r.hitos}</b> hito(s)</span><span><b>{r.reqs}</b> requerimiento(s)</span></p>
          <ul className="prev">
            {planes.slice(0, 8).map((p, i) => <li key={i}><b>{p.nombre}</b> <small className="inl">· {p.trimestre || `${q} (por defecto)`} · {p.hitos.length} hito(s)</small></li>)}
          </ul>
          {planes.length > 8 && <small>Y {planes.length - 8} proyecto(s) más.</small>}
          <div className="dos">
            <label>Área<select value={area} onChange={e => setArea(e.target.value)}>{areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>
            <label>Trimestre si el archivo no lo indica<select value={q} onChange={e => setQ(e.target.value)}>{TRIMESTRES.map(t => <option key={t.id}>{t.id}</option>)}</select></label>
          </div>
        </>
      )}
      <div className="acciones">
        <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        <button className="primary" disabled={!planes.length || errores.length > 0 || !area || trabajando} onClick={importar}>{trabajando ? 'Importando…' : `Importar ${r.proyectos || ''} proyecto(s)`}</button>
      </div>
    </div>
  )
}
