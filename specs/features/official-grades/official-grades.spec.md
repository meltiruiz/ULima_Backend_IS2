---
name: Official Grades
description: Calificación oficial del profesor/JP por evaluación y lectura de notas oficiales del alumno
targets:
  - ../../../src/modules/official-grades/**
  - ../../../src/modules/index.ts
---

# Official Grades

## Contexto

El profesor titular o JP de una sección puede **calificar oficialmente** a sus alumnos por evaluación. Estas notas son las **oficiales** y viven en `student_score` (una fila por `enrollment_id` + `assessment_id`, `value` 0..20). Se distinguen de las notas **no oficiales** de la calculadora del alumno, que viven en `simulated_grades` (ver `simulated-grades.spec.md`).

La **nota final** se define como el **promedio ponderado** de las evaluaciones (Σ nota×peso/100) y se calcula en el cliente (mismo criterio que la calculadora); no se almacena.

## Autorización

- Rutas docentes: `requireRole("teacher")`; el `teacherId` sale del JWT.
- Un docente solo puede ver/calificar secciones donde es **profesor titular o JP** (`section.teacher_id = teacherId OR section.jp_id = teacherId`). En caso contrario ⇒ `403 NOT_SECTION_TEACHER`.
  `[@test] ../../../test/official-grades.logic.test.ts`
- Ruta de alumno: `requireRole(student|delegate|subdelegate)`; el `studentId` sale del JWT; solo ve sus propias notas.

## Requisitos

- `GET /official-grades/teacher/sections`: lista las secciones del período activo que el docente dicta (profesor/JP).
- `GET /official-grades/teacher/sections/:sectionId/scores`: grilla de la sección — alumnos (matrícula no retirada) × evaluaciones del sílabo + notas ya cargadas. Exige ser docente de la sección.
- `PUT /official-grades/teacher/sections/:sectionId/scores`: upsert por lote de `{enrollmentId, assessmentId, value}`. Valida ownership y que cada matrícula y evaluación pertenezcan a la sección; valida TODO el lote antes de escribir (no persiste parcialmente). `value` 0..20.
  `[@test] ../../../test/official-grades.logic.test.ts`
- Errores de pertenencia: `404 ENROLLMENT_NOT_IN_SECTION`, `404 ASSESSMENT_NOT_IN_SECTION`.
  `[@test] ../../../test/official-grades.logic.test.ts`
- `GET /official-grades/me`: notas oficiales del alumno agrupadas por sección/curso, con `weight` y `value` (nullable) por evaluación, para que el cliente calcule la nota final.
  `[@test] ../../../test/official-grades.logic.test.ts`

## API

Ver `docs/specs/api-contracts.md`, sección **Official Grades**.

## Fuera de alcance

- No almacena la nota final (se calcula en el cliente por ponderación).
- No modifica `simulated_grades` (notas no oficiales del alumno).
- No permite a un docente calificar secciones ajenas.
