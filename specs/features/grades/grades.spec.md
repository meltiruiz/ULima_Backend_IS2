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

### BR-GRADES-01: Autenticación obligatoria
- Todas las rutas de `grades` requieren `Authorization: Bearer <JWT>` y pasan por `authMiddleware` (`app.use("*", authMiddleware)`).
- Si falta el token → `401 MISSING_TOKEN`; si es inválido/expirado/revocado → `401 INVALID_TOKEN`.

### BR-GRADES-02: Alcance al alumno autenticado
- `GET /grades/me/courses` retorna cursos, secciones, sílabos y evaluaciones del periodo activo.
- El filtro por `code` (query) es un parámetro de negocio, **no** un mecanismo de autenticación.
- Deuda pendiente: derivar el alumno desde `c.get("studentId")`/`code` del JWT en lugar de confiar en el `?code=` del cliente.

## Endpoints

Bajo `Authorization: Bearer <token>`:

- `GET /grades/me/courses`

## Test Links

*(No hay tests automatizados enlazados aún.)*
