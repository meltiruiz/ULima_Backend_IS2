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

### BR-SECTION-MGMT-01: Autenticación obligatoria
- Todas las rutas de `section-management` requieren `Authorization: Bearer <JWT>` y pasan por `authMiddleware` (`app.use("*", authMiddleware)`).
- Si falta el token → `401 MISSING_TOKEN`; si es inválido/expirado/revocado → `401 INVALID_TOKEN`.

### BR-SECTION-MGMT-02: Representantes activos
- `GET /section-management/representatives` retorna las filas de `section_representative` con `is_active = true`, mapeando `position` a `delegado`/`subdelegado`.

## Endpoints

Bajo `Authorization: Bearer <token>`:

- `GET /section-management/representatives`

## Test Links

*(No hay tests automatizados enlazados aún.)*
