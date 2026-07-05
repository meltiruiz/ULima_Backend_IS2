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

### BR-COURSE-DETAIL-03: Implementacion en capas para tabs de detalle
- Los tabs `announcements`, `advising` y `contacts` deben mantener sus rutas publicas actuales, pero su implementacion debe estar distribuida en `routes -> controller -> service -> repository`.
- `course-detail.routes.ts` solo define el endpoint y delega al controller.
- `course-detail.controller.ts` valida `sectionId` con `sectionIdParamSchema`.
- `course-detail.service.ts` transforma las filas de base de datos al contrato que consume Flutter.
- `course-detail.repository.ts` contiene las consultas SQL a la base de datos.

### BR-COURSE-DETAIL-04: Anuncios academicos de seccion
- `GET /course-detail/sections/:sectionId/announcements` obtiene anuncios desde la tabla `announcement`, asociados al delegado/subdelegado mediante `section_representative`.
- Solo se devuelven anuncios activos (`announcement.is_active = true`) de la seccion solicitada.
- La lista debe venir ordenada por fecha de publicacion descendente (`published_at desc`), del anuncio mas reciente al mas antiguo.
- Si no hay anuncios, el backend responde `anuncios: []`; el frontend es responsable de mostrar `Aún no hay publicaciones`.

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
