import { useState } from 'react'
import { DOMINIO, supabase } from '../lib/supabase'

export default function Login({ nombre }: { nombre: string }) {
  const [modo, setModo] = useState<'entrar' | 'crear' | 'olvide'>('entrar')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [nom, setNom] = useState('')
  const [msg, setMsg] = useState<{ t: 'error' | 'ok'; s: string } | null>(null)
  const [cargando, setCargando] = useState(false)

  const volver = location.origin + location.pathname

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const c = correo.trim().toLowerCase()
    if (!c.endsWith(DOMINIO)) return setMsg({ t: 'error', s: `Usa tu correo de Green Initiative (${DOMINIO}).` })
    setCargando(true); setMsg(null)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: c, password: clave })
        if (error) throw error
      } else if (modo === 'crear') {
        if (clave.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
        const { data, error } = await supabase.auth.signUp({ email: c, password: clave, options: { data: { nombre: nom.trim() }, emailRedirectTo: volver } })
        if (error) throw error
        if (!data.session) setMsg({ t: 'ok', s: 'Cuenta creada. Revisa tu correo y confirma el enlace para entrar.' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(c, { redirectTo: volver })
        if (error) throw error
        setMsg({ t: 'ok', s: 'Te enviamos un enlace para restablecer la contraseña.' })
      }
    } catch (err) {
      setMsg({ t: 'error', s: traducir((err as Error).message) })
    } finally { setCargando(false) }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={enviar}>
        <div className="brand"><span className="mark" aria-hidden /><div><h1>{nombre}</h1><p>Portafolio de proyectos · Green Initiative</p></div></div>
        <h2>{modo === 'entrar' ? 'Ingresa' : modo === 'crear' ? 'Crea tu cuenta' : 'Recupera tu contraseña'}</h2>
        {modo === 'crear' && <label>Nombre<input value={nom} onChange={e => setNom(e.target.value)} autoComplete="name" required /></label>}
        <label>Correo de Green<input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder={`nombre${DOMINIO}`} autoComplete="email" required /></label>
        {modo !== 'olvide' && <label>Contraseña<input type="password" value={clave} onChange={e => setClave(e.target.value)} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required /></label>}
        {msg && <p className={`msg ${msg.t}`} role="alert">{msg.s}</p>}
        <button className="primary" disabled={cargando}>{cargando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : modo === 'crear' ? 'Crear cuenta' : 'Enviar enlace'}</button>
        <div className="login-links">
          {modo !== 'entrar' && <button type="button" onClick={() => { setModo('entrar'); setMsg(null) }}>Ya tengo cuenta</button>}
          {modo === 'entrar' && <button type="button" onClick={() => { setModo('crear'); setMsg(null) }}>Crear cuenta</button>}
          {modo === 'entrar' && <button type="button" onClick={() => { setModo('olvide'); setMsg(null) }}>Olvidé mi contraseña</button>}
        </div>
      </form>
    </div>
  )
}

function traducir(m: string) {
  if (/invalid login/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/not confirmed/i.test(m)) return 'Aún no confirmas tu correo: revisa tu bandeja.'
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Ingresa o recupera tu contraseña.'
  if (/greeninitiative/i.test(m)) return 'Solo se permiten correos @greeninitiative.eco.'
  if (/rate limit/i.test(m)) return 'Demasiados intentos de envío de correo. Espera unos minutos.'
  return m
}
