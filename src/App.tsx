import { useMemo, useState } from 'react'
import data from './data/portfolio.json'
import type { Estado, Portfolio } from './types'
import { ESTADOS } from './lib/status'
import { fmtLargo, hoy as getHoy, toIso } from './lib/dates'
import Portafolio from './views/Portafolio'
import Calendario from './views/Calendario'

const portfolio = data as unknown as Portfolio
// Nombre de la plataforma: se cambia solo aquí.
const NOMBRE = 'Plantea'

export default function App() {
  const [vista, setVista] = useState<'portafolio' | 'calendario'>('portafolio')
  const [equipo, setEquipo] = useState('Todos')
  const [trim, setTrim] = useState('Todos')
  const hoy = useMemo(() => getHoy(), [])
  const equipos = ['Todos', ...Array.from(new Set(portfolio.proyectos.map(p => p.equipo)))]
  const proyectos = portfolio.proyectos.filter(p => (equipo === 'Todos' || p.equipo === equipo) && (trim === 'Todos' || p.trimestre.includes(trim)))

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="mark" aria-hidden />
          <div>
            <h1>{NOMBRE}</h1>
            <p>Green Initiative · Área de TI · actualizado al {fmtLargo(portfolio.actualizado)}</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Vista">
          <button className={vista === 'portafolio' ? 'on' : ''} onClick={() => setVista('portafolio')}>Portafolio</button>
          <button className={vista === 'calendario' ? 'on' : ''} onClick={() => setVista('calendario')}>Calendario</button>
        </nav>
      </header>

      <div className="bar">
        <label>Equipo
          <select value={equipo} onChange={e => setEquipo(e.target.value)}>{equipos.map(e => <option key={e}>{e}</option>)}</select>
        </label>
        <label>Trimestre
          <select value={trim} onChange={e => setTrim(e.target.value)}>{['Todos', 'Q0', 'Q1', 'Q2', 'Q3', 'Q4'].map(e => <option key={e}>{e}</option>)}</select>
        </label>
        <ul className="legend" aria-label="Leyenda de estados">
          {ESTADOS.map(e => <li key={e.id}><i className={`dot ${e.id}`} />{e.label}</li>)}
        </ul>
        <span className="today">Hoy: {fmtLargo(toIso(hoy))}</span>
      </div>

      <main>
        {vista === 'portafolio'
          ? <Portafolio proyectos={proyectos} trimestres={portfolio.trimestres} hoy={hoy} />
          : <Calendario proyectos={proyectos} hoy={hoy} />}
      </main>
    </div>
  )
}

export type { Estado }
