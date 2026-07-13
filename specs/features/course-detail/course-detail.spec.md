---
name: Course Detail
description: Consulta de secciones, docentes, matriculas, anuncios y contactos de curso (solo lectura)
targets:
  - ../../../src/modules/course-detail/**
  - ../../../src/shared/middleware/auth-middleware.ts
---

# Course Detail

## Scope

Endpoints de solo lectura que exponen el detalle academico de cursos/secciones.
El modulo incluye secciones, docentes, matriculas, anuncios academicos visibles y
contactos de la seccion. Las asesorias del alumno viven en
`src/modules/advising/student/` y se documentan en
`specs/features/advising-student/advising-student.spec.md`.

## Business Rules

### BR-COURSE-DETAIL-01: Autenticacion obligatoria
- Todas las rutas de `course-detail` requieren `Authorization: Bearer <JWT>` y pasan por `authMiddleware`.
- Si falta el token -> `401 MISSING_TOKEN`; si es invalido/expirado/revocado -> `401 INVALID_TOKEN`.

### BR-COURSE-DETAIL-02: Roles permitidos
- El modulo aplica `requireRole(...STUDENT_ROLES, "teacher")`.
- Los alumnos consumen el detalle desde descripcion de cursos.
- El rol docente puede leer contactos de una seccion desde el resumen del horario docente.

### BR-COURSE-DETAIL-03: Asesorias fuera de este modulo
- `GET /course-detail/sections/:sectionId/advising` esta eliminado.
- Listado y RSVP usan `/advising/section/:sectionId` y `/advising/:sessionId/rsvp`.

### BR-COURSE-DETAIL-04: JP y carnet de networking en contactos
- `GET /course-detail/sections/:sectionId/contacts` devuelve:
  - `docente`
  - `jefePractica`
  - `alumnos`
- `docente`, `jefePractica` y cada alumno incluyen `networking` cuando existe informacion de carnet.
- Si el usuario marco su carnet como oculto, `networking.optIn` llega como `false`.

## Endpoints

Todos bajo `Authorization: Bearer <token>`:

- `GET /course-detail/sections`
- `GET /course-detail/sections/:sectionId`
- `GET /course-detail/sections/:sectionId/announcements`
- `GET /course-detail/sections/:sectionId/contacts`
- `GET /course-detail/teachers`
- `GET /course-detail/enrollments`

## Architecture

### Repository Pattern
- `course-detail.repository.ts` concentra SQL y acceso a BD.
- No atrapa errores de BD; los deja subir al `errorHandler` global.

### Service Layer
- `course-detail.service.ts` coordina casos de lectura y conserva los contratos HTTP.
- No contiene SQL ni helpers privados de transformacion.

### Mapper Pattern
- `course-detail.mapper.ts` centraliza las transformaciones:
  - filas SQL de secciones -> `SectionResponse`
  - filas SQL de docentes -> `TeacherResponse`
  - filas SQL de matriculas -> `EnrollmentResponse`
  - anuncios -> `AnnouncementResponse`
  - contactos agrupados por docente/JP/alumno -> `ContactsResult`
- Tambien concentra normalizacion de nombres, fechas, roles y carnet de networking.

### DTO Validation
- `course-detail.schemas.ts` usa Zod para validar `sectionId` en rutas parametrizadas.

## Test Links

- `test/HU14_mel/contactos.cajanegra.test.ts`
- `test/HU14_mel/contactos.cajablanca.test.ts`
- `test/HU14_mel/contactos.unit.test.ts`
