import { useState } from 'react'
import type { Area, Perfil, Rol } from '../types'
import { ROLES } from '../types'
import { actualizarPerfil, crearArea } from '../lib/datos'

interface Props { perfiles: Perfil[]; areas: Area[]; yo: string; recargar: () => Promise<void>; error: (s: string) => void }

export default function Usuarios({ perfiles, areas, yo, recargar, error }: Props) {
  const [nueva, setNueva] = useState('')
  const act = async (fn: () => Promise<void>) => { try { await fn(); await recargar() } catch (e) { error((e as Error).message) } }
  return (
    <section className="admin">
      <div className="panel">
        <h2>Usuarios</h2>
        <p className="sub">Cada persona crea su cuenta con su correo de Green. Aquí le asignas su área y su rol.</p>
        <table className="tabla">
          <thead><tr><th>Correo</th><th>Nombre</th><th>Área</th><th>Rol</th><th>Activo</th></tr></thead>
          <tbody>
            {perfiles.map(p => (
              <tr key={p.id} className={p.activo ? '' : 'off'}>
                <td>{p.correo}</td>
                <td>{p.nombre ?? '—'}</td>
                <td>
                  <select value={p.area_id ?? ''} onChange={e => act(() => actualizarPerfil(p.id, { area_id: e.target.value || null }))}>
                    <option value="">Sin área</option>{areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </td>
                <td>
                  <select value={p.rol} disabled={p.id === yo} onChange={e => act(() => actualizarPerfil(p.id, { rol: e.target.value as Rol }))}>
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.t}</option>)}
                  </select>
                </td>
                <td><input type="checkbox" checked={p.activo} disabled={p.id === yo} onChange={e => act(() => actualizarPerfil(p.id, { activo: e.target.checked }))} aria-label={`Activo: ${p.correo}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h2>Áreas</h2>
        <ul className="chips">{areas.map(a => <li key={a.id}>{a.nombre}</li>)}</ul>
        <form className="inline" onSubmit={e => { e.preventDefault(); if (!nueva.trim()) return; act(async () => { await crearArea(nueva); setNueva('') }) }}>
          <input value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Nueva área (ej. Finanzas)" />
          <button className="primary">Agregar área</button>
        </form>
      </div>
    </section>
  )
}
