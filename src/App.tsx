import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Area, Perfil, Proyecto } from './types'
import { TRIMESTRES } from './types'
import { ESTADOS } from './lib/status'
import { fmtLargo, hoy as getHoy, toIso } from './lib/dates'
import { supabase } from './lib/supabase'
import { cargarAreas, cargarPerfil, cargarPerfiles, cargarProyectos } from './lib/datos'
import Portafolio from './views/Portafolio'
import Calendario from './views/Calendario'
import Gestion from './views/Gestion'
import Usuarios from './views/Usuarios'
import Login from './views/Login'
import { IconCalendario, IconGestion, IconPortafolio, IconSalir, IconUsuarios } from './views/Iconos'

// Nombre de la plataforma: se cambia solo aquí.
const NOMBRE = 'Plantea'
type Vista = 'portafolio' | 'calendario' | 'gestion' | 'usuarios'

export default function App() {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [listo, setListo] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSesion(data.session); setListo(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!listo) return <div className="centro">Cargando…</div>
  if (!sesion) return <Login nombre={NOMBRE} />
  return <Plataforma key={sesion.user.id} userId={sesion.user.id} correo={sesion.user.email ?? ''} />
}

function Plataforma({ userId, correo }: { userId: string; correo: string }) {
  const [vista, setVista] = useState<Vista>('portafolio')
  const [area, setArea] = useState('Todas')
  const [trim, setTrim] = useState('Todos')
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const hoy = useMemo(() => getHoy(), [])

  const recargar = useCallback(async () => {
    try {
      const p = await cargarPerfil(userId)
      setPerfil(p)
      if (!p || !p.activo) return
      const as = await cargarAreas()
      setAreas(as)
      setProyectos(await cargarProyectos(as))
      if (p.rol === 'admin') setPerfiles(await cargarPerfiles())
    } catch (e) { setAviso((e as Error).message) }
  }, [userId])
  useEffect(() => { recargar().finally(() => setCargando(false)) }, [recargar])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t) }, [aviso])

  const salir = () => supabase.auth.signOut()
  if (cargando) return <div className="centro">Cargando…</div>
  if (!perfil || !perfil.activo) {
    return <div className="centro bloque"><h2>Tu cuenta está desactivada</h2><p>{correo} no tiene acceso por ahora. Pide a un administrador que la active.</p><button className="primary" onClick={salir}>Salir</button></div>
  }

  const admin = perfil.rol === 'admin'
  const visibles = proyectos.filter(p => (area === 'Todas' || p.equipo === area) && (trim === 'Todos' || p.trimestre === trim))
  const gerencia = perfil.rol === 'gerencia'
  const menu: { id: Vista; t: string; i: JSX.Element }[] = [
    { id: 'portafolio', t: 'Portafolio', i: <IconPortafolio /> },
    { id: 'calendario', t: 'Calendario', i: <IconCalendario /> },
    ...(gerencia ? [] : [{ id: 'gestion' as Vista, t: 'Gestión', i: <IconGestion /> }]),
    ...(admin ? [{ id: 'usuarios' as Vista, t: 'Usuarios', i: <IconUsuarios /> }] : []),
  ]
  const rolTexto = admin ? 'Administrador' : gerencia ? 'Gerencia' : 'Área interna'
  const verAreas = admin || gerencia
  const filtros = vista === 'portafolio' || vista === 'calendario'
  const miArea = areas.find(a => a.id === perfil.area_id)?.nombre

  return (
    <div className="shell">
      <aside className="side">
        <span className="mark" aria-hidden title={NOMBRE} />
        <nav aria-label="Menú">
          {menu.map(m => (
            <button key={m.id} className={vista === m.id ? 'on' : ''} onClick={() => setVista(m.id)} title={m.t} aria-label={m.t} aria-current={vista === m.id ? 'page' : undefined}>
              {m.i}<span>{m.t}</span>
            </button>
          ))}
        </nav>
        <button className="out" onClick={salir} title="Salir" aria-label="Salir">{<IconSalir />}<span>Salir</span></button>
      </aside>

      <div className="app">
        <header className="top">
          <div className="brand">
            <div><h1>{NOMBRE}</h1><p>Green Initiative · Portafolio por áreas · {fmtLargo(toIso(hoy))}</p></div>
          </div>
          <div className="yo">
            <span>{perfil.nombre || correo}<small>{rolTexto}{miArea ? ` · ${miArea}` : ''}</small></span>
          </div>
        </header>

        {filtros && (
          <div className="filtros">
            {verAreas && (
              <label>Área
                <select value={area} onChange={e => setArea(e.target.value)}>{['Todas', ...areas.map(a => a.nombre)].map(e => <option key={e}>{e}</option>)}</select>
              </label>
            )}
            <label>Trimestre
              <select value={trim} onChange={e => setTrim(e.target.value)}>{['Todos', ...TRIMESTRES.map(t => t.id)].map(e => <option key={e}>{e}</option>)}</select>
            </label>
            <ul className="legend" aria-label="Leyenda de estados">
              {ESTADOS.map(e => <li key={e.id}><i className={`dot ${e.id}`} />{e.label}</li>)}
            </ul>
          </div>
        )}

      <main>
        {vista === 'portafolio' && <Portafolio proyectos={visibles} trimestres={TRIMESTRES} hoy={hoy} />}
        {vista === 'calendario' && <Calendario proyectos={visibles} hoy={hoy} />}
        {vista === 'gestion' && <Gestion proyectos={proyectos} areas={areas} perfil={perfil} recargar={recargar} error={setAviso} />}
        {vista === 'usuarios' && admin && <Usuarios perfiles={perfiles} areas={areas} yo={perfil.id} recargar={recargar} error={setAviso} />}
      </main>
      {aviso && <div className="toast" role="status" onClick={() => setAviso(null)}>{aviso}</div>}
      </div>
    </div>
  )
}
