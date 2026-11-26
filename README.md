# Greenest · Plantea

Plantea: vista gerencial del portafolio del área de TI de Green Initiative: avance de cada proyecto, sus hitos, cuánto dura cada hito y sus requerimientos, más un calendario con las fechas de cierre.

## Cómo se usa

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # genera la carpeta dist/
```

Para simular otra fecha de "hoy" (por ejemplo en una demo): `http://localhost:5173/?hoy=2026-12-15`.

## Dónde se edita

Todo el contenido está en `src/data/portfolio.json`:

- `proyectos[]`: nombre, equipo, responsable, alcance (Interno/Externo), trimestre.
- `hitos[]` de cada proyecto: `inicio` y `fin` (fecha objetivo).
- `reqs[]` de cada hito: los requerimientos o tareas. Marca `"hecho": true` cuando se cumpla.
- `provisional: true` en un proyecto marca fechas aproximadas (ventana del trimestre) hasta que se apruebe su EPOC.
- `avance` (0 a 100) es opcional: si no existe, el avance se calcula con los requerimientos hechos.

El estado de cada proyecto e hito se calcula solo: completado, en curso, en riesgo (avance 20 puntos o más por debajo de lo esperado), atrasado (pasó su fecha sin terminar), por iniciar o sin fecha.

## Nombre y colores

- El nombre de la plataforma está en `src/App.tsx` (constante `NOMBRE`).
- La paleta está en las variables del inicio de `src/styles.css`.

## Publicación

Cuando exista el flujo `.github/workflows/pages.yml`, se publica en GitHub Pages en cada push a `main` (hay que activar Pages con origen "GitHub Actions" en la configuración del repositorio).
