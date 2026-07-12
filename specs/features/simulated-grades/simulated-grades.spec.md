---
name: Simulated Grades
description: Persistencia en backend de las notas simuladas que el alumno ingresa en la calculadora
targets:
  - ../../../src/modules/simulated-grades/**
  - ../../../src/db/schema/schema.ts
  - ../../../src/modules/index.ts
---

# Simulated Grades

## Contexto

La calculadora del alumno (frontend Flutter, `CalculadoraController` + `NotasService`) permite ingresar notas por evaluación para proyectar el promedio ponderado. Antes esas notas vivían **solo** en `shared_preferences` (local del dispositivo), por lo que se perdían al reinstalar y no seguían al alumno entre dispositivos.

Esta feature persiste esas notas en el backend. Son **auto-reportadas** (no oficiales); por eso se guardan en una tabla nueva `simulated_grades`, separada de `student_score` (notas seed de referencia). El cálculo del promedio se mantiene en el cliente.

## Modelo de datos

- Tabla `simulated_grades`: `id`, `enrollment_id` (FK `enrollment`), `assessment_id` (FK `assessment`), `value` `numeric(5,2)` **NOT NULL**, `updated_at`.
- Único `(enrollment_id, assessment_id)`: una nota simulada por matrícula+evaluación.
- CHECK `value BETWEEN 0 AND 20`.
- Índice por `enrollment_id`.

## Requisitos

- Todos los endpoints requieren JWT de alumno (`STUDENT_ROLES`); el `studentId` sale del token, nunca del body.
- El alumno solo puede leer/escribir/borrar sus propias notas simuladas.
- Al guardar, cada `assessmentId` se valida: debe pertenecer a un curso donde el alumno tenga matrícula. El `enrollment` se deriva de `studentId` + `assessmentId` (es unívoco: una matrícula por oferta). Si no corresponde ⇒ `404 ASSESSMENT_NOT_ENROLLED`.
  `[@test] ../../../test/simulated-grades.logic.test.ts`
- `PUT /simulated-grades/me` hace upsert por lote; valida TODO el lote antes de escribir, de modo que una evaluación ajena aborta la operación sin persistir parcialmente.
  `[@test] ../../../test/simulated-grades.logic.test.ts`
- `value` fuera de 0..20 ⇒ rechazado por Zod (400) y por CHECK en BD.
- `GET /simulated-grades/me` devuelve la lista del alumno con `assessmentId`, `sectionId`, `value` (número).
  `[@test] ../../../test/simulated-grades.logic.test.ts`
- `DELETE /simulated-grades/me/:assessmentId` borra la nota del alumno; si no existía ⇒ `404 SIMULATED_GRADE_NOT_FOUND`.
  `[@test] ../../../test/simulated-grades.logic.test.ts`

## API

Ver `docs/specs/api-contracts.md`, sección **Simulated Grades**.

## Fuera de alcance

- No modifica `student_score` ni las notas oficiales/seed.
- No calcula el promedio en servidor (sigue en el cliente).
- No expone las notas de un alumno a otro ni al docente.
