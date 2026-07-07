---
name: Section Management
description: Consulta de representantes (delegados/subdelegados) activos por sección
targets:
  - ../../../src/modules/section-management/**
  - ../../../src/shared/middleware/auth-middleware.ts
---

# Section Management

## Scope

Endpoints relacionados a la gestión/lectura de representantes de sección. Payloads en `docs/specs/api-contracts.md`; esta spec fija la **autorización**.

## Business Rules

### BR-SECTION-MGMT-01: Autenticación y rol
- Todas las rutas de `section-management` requieren `Authorization: Bearer <JWT>` (`authMiddleware`) y rol de alumno (`requireRole('student','delegate','subdelegate')`); un token docente recibe `403 FORBIDDEN`.
- Si falta el token → `401 MISSING_TOKEN`; si es inválido/expirado/revocado → `401 INVALID_TOKEN`.

### BR-SECTION-MGMT-02: Representantes activos
- `GET /section-management/representatives` retorna las filas de `section_representative` con `is_active = true`, mapeando `position` a `delegado`/`subdelegado`.

### BR-SECTION-MGMT-03: Alcance real vs pendiente
- **Implementado**: solo `GET /representatives`.
- **Pendiente (no implementado)**: el registro de anuncios por delegado (`POST /sections/:id/announcements`, **HU10**) y las estadísticas de sección (`GET /sections/:id/progress`, **HU11**). Ambas HU siguen en ToDo. Hay scaffolding sin uso (`createAnnouncementSchema`, tabla `announcement`, observer stub). Cuando se implementen: restringir a `delegate`/`subdelegate` de la sección y no exponer notas individuales en las métricas.

## Endpoints

Bajo `Authorization: Bearer <token>` (rol alumno):

- `GET /section-management/representatives`

## Test Links

*(No hay tests automatizados enlazados aún.)*
