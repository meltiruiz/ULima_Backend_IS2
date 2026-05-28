---
name: Authentication
description: Login, logout and session management with JWT for ULima++ students
targets:
  - ../../../src/modules/auth/**
  - ../../../src/shared/middleware/auth-middleware.ts
---

# Authentication

## User Stories

| ID | Description |
| --- | --- |
| US01 | Iniciar sesión con código y contraseña. |
| US02 | Cerrar sesión. |

## Business Rules

### BR-AUTH-01: Login credentials
- `POST /auth/login` recibe `code` y `password`.
- `code` corresponde a `app_user.code`.
- `password` se verifica contra `app_user.password_hash` usando `bcryptjs.compare`.
- Si `code` no existe → `401 USER_NOT_FOUND`.
- Si `password` no coincide → `401 INVALID_PASSWORD`.

### BR-AUTH-02: Role derivation
- El rol del estudiante se determina al momento del login consultando `section_representative`.
- Si existe fila activa (`isActive = true`) para el `studentId` con `position = 'delegate'` → rol `delegate`.
- Si no, si existe fila activa con `position = 'subdelegate'` → rol `subdelegate`.
- Si no hay representación activa → rol `student`.
- `delegate` tiene precedencia sobre `subdelegate`.

### BR-AUTH-03: JWT session token
- El token se firma con `HS256` usando `config.auth.jwtSecret`.
- Expira en 24 horas (configurable vía `JWT_EXPIRES_IN` en entorno).
- Payload mínimo del JWT:

```json
{
  "sub": 1,
  "studentId": 10,
  "code": "20201234",
  "role": "student",
  "iat": 1680000000,
  "exp": 1680086400
}
```

- El token no se persiste ni se blackliste. Es stateless.

### BR-AUTH-04: Protected routes
- `GET /auth/me` y `POST /auth/logout` requieren `Authorization: Bearer <token>`.
- El middleware `authMiddleware` valida el JWT en cada request.
- Si el token falta → `401 MISSING_TOKEN`.
- Si el token es inválido o expiró → `401 INVALID_TOKEN`.

### BR-AUTH-05: GET /auth/me
- Retorna los datos del usuario autenticado a partir del `sub` (userId) del JWT.
- Incluye el rol que viaja en el JWT (no se reconsulta `section_representative` en cada request).

### BR-AUTH-06: POST /auth/logout
- No invalida el token (stateless).
- Solo retorna confirmación. El frontend debe descartar el token localmente.

### BR-AUTH-07: No registration
- No existe endpoint de registro. Todos los usuarios están precargados en `app_user`.

## Endpoints

### POST /auth/login

Autentica al estudiante y devuelve un JWT.

- **Auth**: None (público)
- **Request body**:
  ```json
  {
    "code": "20201234",
    "password": "miPassword123"
  }
  ```
- **Validation** (Zod):
  - `code`: `z.string().min(1)`
  - `password`: `z.string().min(1)`
- **Response** `200 OK`:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": 1,
      "studentId": 10,
      "code": "20201234",
      "fullName": "Nombre Apellido",
      "institutionalEmail": "user@aloe.ulima.edu.pe",
      "role": "student",
      "careerId": 1,
      "curriculumId": 1,
      "currentLevel": 5
    }
  }
  ```
- **Errors**:
  - `401` `USER_NOT_FOUND`: Código no registrado
  - `401` `INVALID_PASSWORD`: Contraseña incorrecta

### GET /auth/me

Retorna los datos del estudiante autenticado.

- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "user": {
      "id": 1,
      "studentId": 10,
      "code": "20201234",
      "fullName": "Nombre Apellido",
      "institutionalEmail": "user@aloe.ulima.edu.pe",
      "role": "student",
      "careerId": 1,
      "curriculumId": 1,
      "currentLevel": 5
    }
  }
  ```
- **Errors**:
  - `401` `MISSING_TOKEN`: No se envió el token
  - `401` `INVALID_TOKEN`: Token inválido o expirado

### POST /auth/logout

Cierra la sesión del lado del frontend.

- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "message": "Session closed"
  }
  ```

## JWT Specification

| Field | Type | Description |
| --- | --- | --- |
| `sub` | `number` | `app_user.id` |
| `studentId` | `number` | `student.id` |
| `code` | `string` | `app_user.code` |
| `role` | `string` | `student` / `delegate` / `subdelegate` |
| `iat` | `number` | Issued at (Unix epoch seconds) |
| `exp` | `number` | Expiration (Unix epoch seconds) |

- Algorithm: `HS256`
- Signing key: `config.auth.jwtSecret`
- Expiration: `config.auth.jwtExpiresIn` (default `86400` seconds / 24h)

## Auth Middleware

El middleware `authMiddleware` en `src/shared/middleware/auth-middleware.ts` debe:

1. Extraer el header `Authorization`.
2. Verificar formato `Bearer <token>`.
3. Validar la firma del JWT con el secreto configurado.
4. Verificar que el token no haya expirado.
5. Extraer `sub` (userId) y `role` del payload.
6. Inyectar `userId` y `role` en el contexto de Hono mediante `c.set('userId', payload.sub)` y `c.set('role', payload.role)`.
7. Si falta el header → `401 MISSING_TOKEN`.
8. Si el token es inválido → `401 INVALID_TOKEN`.

## Implementation Plan

### auth.repository.ts

Agregar métodos:

- `findByCodeWithPassword(code: string): Promise<{ id: number; userId: number; code: string; fullName: string; institutionalEmail: string; passwordHash: string; studentId: number; careerId: number; curriculumId: number; currentLevel: number | null } | null>`
  - JOIN `app_user` con `student` donde `app_user.code = code`.
  - Retorna todos los campos incluyendo `passwordHash`.

- `findActiveRepresentation(studentId: number): Promise<{ position: 'delegate' | 'subdelegate' } | null>`
  - JOIN `enrollment` con `section_representative` donde `enrollment.studentId = studentId`, `enrollment.status = 'active'`, `section_representative.isActive = true`.
  - Si hay múltiples, prioriza `delegate`.

- `findById(userId: number): Promise<{ id: number; studentId: number; code: string; fullName: string; institutionalEmail: string; careerId: number; curriculumId: number; currentLevel: number | null } | null>`
  - JOIN `app_user` con `student` donde `app_user.id = userId`.

### auth.service.ts

Reemplazar implementación actual:

- `login(input: { code: string; password: string })`:
  1. Llama a `repository.findByCodeWithPassword(code)`.
  2. Si no existe → `HttpError(401, ..., 'USER_NOT_FOUND')`.
  3. Compara password con `bcryptjs.compare(input.password, user.passwordHash)`.
  4. Si no coincide → `HttpError(401, ..., 'INVALID_PASSWORD')`.
  5. Consulta `repository.findActiveRepresentation(user.studentId)` para determinar rol.
  6. Firma JWT con `sub: user.id`, `studentId: user.studentId`, `code: user.code`, `role`.
  7. Retorna `{ token, tokenType: 'Bearer', expiresIn: 86400, user }`.

- `me(userId: number)`:
  1. Llama a `repository.findById(userId)`.
  2. Si no existe → `HttpError(404, ..., 'USER_NOT_FOUND')`.
  3. Retorna `{ user }`.

### auth.controller.ts

- `login(input)`: sin cambios de firma.
- `me(code)`: cambiar a `me(userId: number)` — recibe `userId` del contexto en vez de `code`.

### auth.routes.ts

- `POST /login`: sin cambios estructurales.
- `GET /me`: quitar lógica de headers dev-mode. Agregar `authMiddleware`. Extraer `userId` de `c.get('userId')`.
- `POST /logout`: agregar `authMiddleware`.

### auth-middleware.ts

Implementar la lógica completa de validación JWT (descrita en sección Auth Middleware).

## Test Links

- Login con credenciales válidas retorna 200 con token y usuario
  `[@test] ../../../tests/auth/login-valid-credentials.test.ts`
- Login con código inexistente retorna 401 USER_NOT_FOUND
  `[@test] ../../../tests/auth/login-user-not-found.test.ts`
- Login con contraseña incorrecta retorna 401 INVALID_PASSWORD
  `[@test] ../../../tests/auth/login-invalid-password.test.ts`
- GET /me con token válido retorna 200 con datos del usuario
  `[@test] ../../../tests/auth/me-valid-token.test.ts`
- GET /me sin token retorna 401 MISSING_TOKEN
  `[@test] ../../../tests/auth/me-missing-token.test.ts`
- GET /me con token inválido retorna 401 INVALID_TOKEN
  `[@test] ../../../tests/auth/me-invalid-token.test.ts`
- POST /logout con token válido retorna 200
  `[@test] ../../../tests/auth/logout-valid-token.test.ts`
