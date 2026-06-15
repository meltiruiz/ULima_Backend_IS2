---
name: Authentication
description: Login, logout and session management with JWT for ULima++ students
targets:
  - ../../../src/modules/auth/**
  - ../../../src/shared/middleware/auth-middleware.ts
  - ../../../src/db/schema/schema.ts
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
- El usuario solo inicia sesión si existe como `student` y tiene al menos una matrícula `enrollment.status = 'active'`.
- Si no tiene matrícula activa → `403 NOT_ENROLLED`.

### BR-AUTH-02: Role derivation
- El rol del estudiante se determina al momento del login consultando `section_representative`.
- Si existe fila activa (`isActive = true`) para el `studentId` con `position = 'delegate'` → rol `delegate`.
- Si no, si existe fila activa con `position = 'subdelegate'` → rol `subdelegate`.
- Si no hay representación activa → rol `student`.
- `delegate` tiene precedencia sobre `subdelegate`.

### BR-AUTH-03: JWT session token
- El token se firma con `HS256` usando `config.auth.jwtSecret`.
- Expira en `config.auth.jwtExpiresIn` segundos (default `86400`, configurable vía `JWT_EXPIRES_IN`).
- Payload mínimo del JWT:

```json
{
  "sub": 1,
  "studentId": 10,
  "code": "20201234",
  "role": "student",
  "tokenVersion": 1,
  "iat": 1680000000,
  "exp": 1680086400
}
```

- Para asegurar "Single Active Session", el sistema implementa **Token Versioning**. El JWT es semi-stateless y se valida contra la versión actual en base de datos.

### BR-AUTH-04: Protected routes
- `GET /auth/me` y `POST /auth/logout` requieren `Authorization: Bearer <token>`.
- El middleware `authMiddleware` valida el JWT en cada request.
- Si el token falta → `401 MISSING_TOKEN`.
- Si el token es inválido o expiró → `401 INVALID_TOKEN`.

### BR-AUTH-05: GET /auth/me
- Retorna los datos del usuario autenticado a partir del `sub` (userId) del JWT.
- Incluye el rol que viaja en el JWT (no se reconsulta `section_representative` en cada request).

### BR-AUTH-06: POST /auth/logout
- Incrementa en `1` el campo `tokenVersion` en la base de datos (`app_user`). Esto invalida automáticamente cualquier JWT existente asociado al usuario.
- Retorna confirmación. El frontend debe descartar el token localmente.

### BR-AUTH-07: No registration
- No existe endpoint de registro. Todos los usuarios están precargados en `app_user`.

### BR-AUTH-08: Autenticación exclusivamente por JWT
- El `authMiddleware` autentica **únicamente** mediante `Authorization: Bearer <JWT>`.
- Queda **prohibido** autenticar a partir de:
  - el query param `?code=`,
  - el header `X-User-Code`,
  - el prefijo `Bearer dev-<code>`.
- Estas vías de "modo desarrollo" permitían suplantar a cualquier estudiante con solo su código (sin contraseña ni token) y fueron eliminadas.

### BR-AUTH-09: Fallo seguro ante errores de base de datos
- Si una operación de autenticación falla por un error de base de datos, el servicio responde `500 INTERNAL_ERROR`.
- **Nunca** se devuelve un usuario "mock"/sintético (p. ej. `id = 0`, `code = "00000000"`) ni se firma un JWT en una ruta de error.
- Aplica a `login`, `loginWithGoogle`, `me` y a la validación de `tokenVersion` del middleware.

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
      "currentLevel": 5,
      "setupComplete": false,
      "specialties": []
    }
  }
  ```
- **Errors**:
  - `401` `USER_NOT_FOUND`: Código no registrado
  - `401` `INVALID_PASSWORD`: Contraseña incorrecta
  - `403` `NOT_ENROLLED`: El estudiante no tiene matrícula activa

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
      "currentLevel": 5,
      "setupComplete": false,
      "specialties": []
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
| `tokenVersion` | `number` | Versión actual de la sesión |
| `iat` | `number` | Issued at (Unix epoch seconds) |
| `exp` | `number` | Expiration (Unix epoch seconds) |

- Algorithm: `HS256`
- Signing key: `config.auth.jwtSecret`
- Expiration: `config.auth.jwtExpiresIn` (default `86400` seconds / 24h)

## Auth Middleware

El middleware `authMiddleware` en `src/shared/middleware/auth-middleware.ts` debe (ver BR-AUTH-08: solo JWT, sin atajos `code`/`X-User-Code`/`dev-`):

1. Extraer el header `Authorization`.
2. Verificar formato `Bearer <token>`.
3. Validar la firma del JWT con el secreto configurado.
4. Verificar que el token no haya expirado.
5. Extraer `sub` (userId), `role` y `tokenVersion` del payload.
6. Consultar en base de datos el `app_user` asociado al `userId` y comparar las versiones. Si `payload.tokenVersion` no coincide con el `tokenVersion` de la BD, rechazar.
7. Inyectar `userId` y `role` en el contexto de Hono mediante `c.set('userId', payload.sub)` y `c.set('role', payload.role)`.
8. Si falta el header → `401 MISSING_TOKEN`.
9. Si el token es inválido, expiró, o fue revocado por versión → `401 INVALID_TOKEN`.

## Implementation Plan

### auth.repository.ts

Agregar métodos:

- `incrementTokenVersion(userId: number): Promise<number>`
  - Ejecuta `UPDATE app_user SET tokenVersion = tokenVersion + 1 WHERE id = userId` y retorna el nuevo valor.

- `findByCodeWithPassword(code: string): Promise<AuthUserWithPassword | null>`
  - JOIN `app_user` con `student` donde `app_user.code = code`.
  - Retorna datos de usuario, `tokenVersion`, `passwordHash`, `setupComplete` desde `student.specialty_setup_completed`, especialidades activas y cursos activos.

- `hasActiveEnrollment(studentId: number): Promise<boolean>`
  - Verifica al menos una fila en `enrollment` con `student_id = studentId` y `status = 'active'`.

- `findActiveRepresentation(studentId: number): Promise<{ position: 'delegate' | 'subdelegate' } | null>`
  - JOIN `enrollment` con `section_representative` donde `enrollment.studentId = studentId`, `enrollment.status = 'active'`, `section_representative.isActive = true`.
  - Si hay múltiples, prioriza `delegate`.

- `findById(userId: number): Promise<AuthUser | null>`
  - JOIN `app_user` con `student` donde `app_user.id = userId`.
  - Retorna datos de usuario, `setupComplete`, especialidades activas y cursos activos.

### auth.service.ts

Reemplazar implementación actual:

- `login(input: { code: string; password: string })`:
  1. Llama a `repository.findByCodeWithPassword(code)`.
  2. Si no existe → `HttpError(401, ..., 'USER_NOT_FOUND')`.
  3. Compara password con `bcryptjs.compare(input.password, user.passwordHash)`.
  4. Si no coincide → `HttpError(401, ..., 'INVALID_PASSWORD')`.
  5. Verifica matrícula activa con `repository.hasActiveEnrollment(user.studentId)`.
  6. Si no tiene matrícula activa → `HttpError(403, ..., 'NOT_ENROLLED')`.
  7. Llama a `repository.incrementTokenVersion(user.id)` para conseguir la nueva versión e invalidar sesiones previas.
  8. Consulta `repository.findActiveRepresentation(user.studentId)` para determinar rol.
  9. Firma JWT con `sub: user.id`, `studentId: user.studentId`, `code: user.code`, `role`, y la nueva `tokenVersion`.
  10. Retorna `{ token, tokenType: 'Bearer', expiresIn, user }`.

- `logout(userId: number)`:
  1. Llama a `repository.incrementTokenVersion(userId)` para forzar la expiración en otros dispositivos.

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

*(No hay tests existentes aún. Cuando se agreguen, enlazarlos aquí con `[@test]`.)*
