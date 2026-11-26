/** "26 nov, 09:41 · por Fabiana" */
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function textoActualizacion(iso?: string, por?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MES[d.getMonth()]}, ${hh}:${mm}${por ? ` · por ${por}` : ''}`
}
