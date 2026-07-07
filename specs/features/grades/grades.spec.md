---
name: Grades
description: Consulta de cursos, sílabos y evaluaciones del alumno autenticado
targets:
  - ../../../src/modules/grades/**
  - ../../../src/shared/middleware/auth-middleware.ts
---

# Grades

## Scope

Endpoints relacionados a cursos y evaluaciones del alumno. Payloads en `docs/specs/api-contracts.md`; esta spec fija la **autorización**.

## Business Rules

### BR-GRADES-01: Autenticación y rol
- Todas las rutas de `grades` requieren `Authorization: Bearer <JWT>` (`authMiddleware`) y rol de alumno (`requireRole('student','delegate','subdelegate')`); un token docente recibe `403 FORBIDDEN`.
- Si falta el token → `401 MISSING_TOKEN`; si es inválido/expirado/revocado → `401 INVALID_TOKEN`.

### BR-GRADES-02: Alcance al alumno autenticado
- `GET /grades/me/courses` retorna cursos, secciones, sílabos y evaluaciones del periodo activo.
- El filtro por `code` (query) es un parámetro de negocio, **no** un mecanismo de autenticación.
- Deuda pendiente: derivar el alumno desde `c.get("studentId")`/`code` del JWT en lugar de confiar en el `?code=` del cliente.

### BR-GRADES-03: El backend es solo lectura (HU06/HU07 — decisión de diseño)
- El módulo `grades` **no** guarda notas ni calcula promedios del lado servidor: `grades.service/controller/repository.ts` no tienen lógica (la ruta ejecuta el `GET` inline).
- El **guardado de notas del alumno es local en el cliente** (`shared_preferences`, `NotasService` en Flutter) y el **cálculo del promedio ponderado ocurre en el frontend** (calculadora). Son notas personales no oficiales.
- Por eso **no existen** `PUT /grades/me/scores` ni `GET /grades/me/courses/:sectionId/average` (aparecían en `api-contracts.md` como deuda; ya se marcaron como no implementados). `student_score` no se escribe desde la app.

## Endpoints

Bajo `Authorization: Bearer <token>` (rol alumno):

- `GET /grades/me/courses`

## Test Links

*(La lógica de cálculo de notas vive en el frontend; ver `test/` del repo Flutter.)*
