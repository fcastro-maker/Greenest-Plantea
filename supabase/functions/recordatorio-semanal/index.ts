// Recordatorio semanal de Plantea: un correo por usuario de área interna con lo que debe actualizar.
// Autenticación propia: solo responde si llega el secreto del cron (guardado en Vault, nunca en el código).
// Envío con Resend. Sin RESEND_API_KEY solo simula (no envía nada).
// Programación: pg_cron, lunes 14:00 UTC (9:00 Lima). Prueba sin enviar: ?modo=prueba
import { createClient } from 'npm:@supabase/supabase-js@2'

const SITIO = 'https://fcastro-maker.github.io/Greenest-Plantea/'
const DIAS_SIN_CAMBIOS = 7
const DIAS_PROXIMOS = 14
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const dia = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MES[m - 1]}` }

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: autorizado } = await sb.rpc('verificar_cron', { s: req.headers.get('x-cron-secret') ?? '' })
  if (autorizado !== true) return new Response('No autorizado', { status: 401 })

  const prueba = new URL(req.url).searchParams.get('modo') === 'prueba'
  const lima = new Date(Date.now() - 5 * 3600_000)
  const hoy = lima.toISOString().slice(0, 10)
  const sumar = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10)
  const tope = sumar(hoy, DIAS_PROXIMOS)
  const umbral = Date.now() - DIAS_SIN_CAMBIOS * 86400000

  const [{ data: areas }, { data: perfiles }, { data: proyectos }] = await Promise.all([
    sb.from('areas').select('id,nombre'),
    sb.from('perfiles').select('correo,nombre,area_id').eq('rol', 'area').eq('activo', true).not('area_id', 'is', null),
    sb.from('proyectos').select('id,nombre,area_id,actualizado_en,hitos(id,nombre,fin,hecho,requerimientos(hecho,fin))'),
  ])

  const hitoListo = (h: any) => h.hecho === true || (h.requerimientos?.length > 0 && h.requerimientos.every((r: any) => r.hecho))
  const mensajes: { para: string; asunto: string; html: string; resumen: Record<string, number> }[] = []

  for (const a of areas ?? []) {
    const destinos = (perfiles ?? []).filter(p => p.area_id === a.id)
    if (!destinos.length) continue
    const ps = (proyectos ?? []).filter(p => p.area_id === a.id)
      .filter(p => !(p.hitos?.length && p.hitos.every(hitoListo)))
    const viejos = ps.filter(p => !p.actualizado_en || Date.parse(p.actualizado_en) < umbral)
    const vencidos = ps.flatMap(p => (p.hitos ?? []).filter((h: any) => !hitoListo(h) && h.fin && h.fin < hoy).map((h: any) => ({ p, h })))
    const proximos = ps.flatMap(p => (p.hitos ?? []).filter((h: any) => !hitoListo(h) && h.fin && h.fin >= hoy && h.fin <= tope).map((h: any) => ({ p, h })))
      .sort((x, y) => x.h.fin.localeCompare(y.h.fin))
    const reqsVencidos = ps.flatMap(p => (p.hitos ?? []).flatMap((h: any) => (h.requerimientos ?? []).filter((r: any) => !r.hecho && r.fin && r.fin < hoy))).length

    const lista = (titulo: string, items: string[]) => items.length
      ? `<h3 style="margin:18px 0 6px;font-size:14px;color:#0A4A2B">${titulo}</h3><ul style="margin:0;padding-left:18px">${items.slice(0, 8).map(i => `<li style="margin:3px 0">${i}</li>`).join('')}</ul>${items.length > 8 ? `<p style="color:#627066;margin:4px 0">y ${items.length - 8} más…</p>` : ''}`
      : ''
    const pendiente = viejos.length + vencidos.length + reqsVencidos > 0
    const cuerpo = [
      lista('Planes sin cambios en más de una semana', viejos.map(p => esc(p.nombre))),
      lista('Hitos vencidos sin terminar', vencidos.map(({ p, h }) => `${esc(h.nombre)} <span style="color:#627066">· ${esc(p.nombre)} · venció el ${dia(h.fin)}</span>`)),
      reqsVencidos ? `<p style="margin:14px 0 0">Tienes <b>${reqsVencidos}</b> requerimiento(s) con fecha vencida sin marcar como hechos.</p>` : '',
      lista(`Vence en los próximos ${DIAS_PROXIMOS} días`, proximos.map(({ p, h }) => `${esc(h.nombre)} <span style="color:#627066">· ${esc(p.nombre)} · ${dia(h.fin)}</span>`)),
    ].join('')
    const inicio = pendiente
      ? 'Antes de que termine la semana, revisa y actualiza los planes de tu área en Plantea. Esto es lo que encontramos:'
      : ps.length ? 'Tu área está al día. Si esta semana hubo avances o cambios de fecha, regístralos en Plantea.' : 'Todavía no hay proyectos de tu área en Plantea. Puedes crearlos desde Gestión.'
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#14261C;max-width:560px">
<p style="margin:0 0 4px">Hola,</p><p style="margin:0 0 8px">${inicio}</p>${cuerpo}
<p style="margin:22px 0"><a href="${SITIO}" style="background:#0E6B3C;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">Abrir Plantea</a></p>
<p style="color:#627066;font-size:12px;margin:0">En Gestión, el botón «Está al día» (en Resumen) registra que revisaste un plan y no cambió. Recordatorio automático de los lunes · Área de ${esc(a.nombre)}.</p></div>`
    const [, m, d] = hoy.split('-').map(Number)
    for (const p of destinos) {
      mensajes.push({ para: p.correo, asunto: `Plantea · actualiza el plan de ${a.nombre} (semana del ${d} ${MES[m - 1]})`, html,
        resumen: { sinCambios: viejos.length, hitosVencidos: vencidos.length, reqsVencidos, proximos: proximos.length } })
    }
  }

  const clave = Deno.env.get('RESEND_API_KEY')
  if (prueba || !clave) {
    return Response.json({ enviados: 0, motivo: prueba ? 'modo prueba' : 'falta el secreto RESEND_API_KEY', correos: mensajes.map(({ para, asunto, resumen }) => ({ para, asunto, resumen })) })
  }
  const de = Deno.env.get('MAIL_FROM') ?? 'Plantea <plantea@greeninitiative.eco>'
  let enviados = 0; const errores: string[] = []
  for (const m of mensajes) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: de, to: [m.para], subject: m.asunto, html: m.html }),
    })
    if (r.ok) enviados++; else errores.push(`${m.para}: ${r.status} ${(await r.text()).slice(0, 120)}`)
  }
  return Response.json({ enviados, errores })
})
