---
name: Course Detail
description: Consulta de secciones, docentes, matrículas, anuncios, asesorías y contactos de curso (solo lectura)
targets:
  - ../../../src/modules/course-detail/**
  - ../../../src/shared/middleware/auth-middleware.ts
---

# Course Detail

## Scope

Endpoints de solo lectura que exponen el detalle académico de cursos/secciones. Los payloads de request/response están definidos en `docs/specs/api-contracts.md`; esta spec fija la **autorización** requerida.

## Business Rules

### BR-COURSE-DETAIL-01: Autenticación obligatoria
- Todas las rutas de `course-detail` requieren `Authorization: Bearer <JWT>` y pasan por `authMiddleware` (`app.use("*", authMiddleware)`).
- Exponen datos sensibles (secciones, docentes, matrículas con códigos de alumno, contactos): no deben ser accesibles sin sesión válida.
- Si falta el token → `401 MISSING_TOKEN`; si es inválido/expirado/revocado → `401 INVALID_TOKEN`.

### BR-COURSE-DETAIL-02: Sub-petición interna autenticada
- `GET /course-detail/sections/:sectionId` resuelve su data reutilizando `GET /course-detail/sections` mediante una sub-petición interna; ésta debe **reenviar el header `Authorization`** para no fallar el `authMiddleware`.

## Endpoints

Todos bajo `Authorization: Bearer <token>` (ver detalle de payloads en `docs/specs/api-contracts.md`):

- `GET /course-detail/sections`
- `GET /course-detail/sections/:sectionId`
- `GET /course-detail/sections/:sectionId/announcements`
- `GET /course-detail/sections/:sectionId/advising`
- `GET /course-detail/sections/:sectionId/contacts`
- `GET /course-detail/teachers`
- `GET /course-detail/enrollments`

## Notes

- La autorización fina por usuario/rol (que cada alumno solo vea lo que le corresponde) queda como deuda pendiente; esta spec solo garantiza autenticación.

## Test Links

*(No hay tests automatizados enlazados aún.)*
