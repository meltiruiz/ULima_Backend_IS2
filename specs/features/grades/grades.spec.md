---
name: Grades
description: Consulta de cursos, sílabos y evaluaciones, cálculo de promedio ponderado y persistencia de notas personales
targets:
  - ../../../src/modules/grades/**
  - ../../../src/shared/middleware/auth-middleware.ts
---

# Grades

## Scope

Endpoints relacionados a cursos, evaluaciones, cálculo de notas y persistencia de notas personales del alumno. Payloads en `docs/specs/api-contracts.md`.

## Business Rules

### BR-GRADES-01: Autenticación y rol
- Todas las rutas requieren `Authorization: Bearer <JWT>` y rol de alumno (`requireRole('student','delegate','subdelegate')`).

### BR-GRADES-02: Alcance al alumno autenticado
- `GET /grades/me/courses` retorna cursos, secciones, sílabos y evaluaciones del periodo activo.

### BR-GRADES-03: Persistencia de notas en `student_score`
- `POST /grades/me/notes` guarda notas personales en `student_score` usando upsert (ON CONFLICT DO UPDATE).
- `GET /grades/me/notes` recupera las notas guardadas.
- El `enrollment_id` se resuelve desde el `studentId` del JWT y el `sectionId` del body.
- No existe `PUT /grades/me/scores` (reemplazado por este endpoint).

### BR-GRADES-04: Cálculo de promedio ponderado en backend
- `POST /grades/me/calculate` recibe `{ valor, peso }[]` y devuelve `{ promedio, sumaPesos }`.
- La lógica de cálculo está en `grades.logic.ts` como funciones puras testeables.

## Endpoints

Bajo `Authorization: Bearer <token>` (rol alumno):

- `GET /grades/me/courses`
- `POST /grades/me/calculate`
- `GET /grades/me/notes`
- `POST /grades/me/notes`

## Test Links

- [grades.logic.test.ts](../../../test/grades.logic.test.ts) — Tests del cálculo puro
