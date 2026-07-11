---
name: Authentication
description: Login, logout and session management with JWT for ULima++ students and teachers
targets:
  - ../../../src/modules/auth/**
  - ../../../src/shared/middleware/auth-middleware.ts
  - ../../../test/auth.google-login.test.ts
---

# Authentication

## User Stories

| ID | Description |
| --- | --- |
| US01 | Iniciar sesión con código y contraseña. |
| US02 | Cerrar sesión. |
| HU18 | Iniciar sesión como docente y acceder al flujo de asesorías. |
| HU20 | Restablecer la contraseña con un código OTP enviado al correo institucional. |

## Business Rules

### BR-AUTH-01: Login credentials
- `POST /auth/login` recibe `code` y `password`.
- `code` corresponde a `app_user.code`.
- `password` se verifica contra `app_user.password_hash` usando `bcryptjs.compare`.
- Si `code` no existe → `401 USER_NOT_FOUND`.
- Si `password` no coincide → `401 INVALID_PASSWORD`.
- El usuario solo inicia sesión si existe como `student` y tiene al menos una matrícula `enrollment.status = 'active'`. Excepción: si el `code` pertenece a un `teacher` vinculado a `app_user` vía `teacher.user_id`, inicia sesión como docente sin requerir matrícula activa (HU18).
- Si no tiene matrícula activa ni es docente → `403 NOT_ENROLLED`.

### BR-AUTH-02: Role derivation
- Si el login es docente (vía `teacher.user_id`), el rol es `teacher` y no aplica la derivación de `section_representative`.
- Para estudiantes, el rol se determina al momento del login consultando `section_representative`.
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

### BR-AUTH-10: Google SSO institucional y vinculación (`google_id`)
- `POST /auth/google` normaliza el correo del token con `trim().toLowerCase()` y acepta cuentas institucionales cuyo valor termine exactamente en `@aloe.ulima.edu.pe` (alumno) o `@ulima.edu.pe` (docente). Cualquier otro dominio recibe `403 INVALID_DOMAIN`.
  `[@test] ../../../test/auth.google-login.test.ts`
- El dominio habilita el tipo de perfil que debe existir; no concede el rol por sí solo:
  - `@aloe.ulima.edu.pe` debe resolver `app_user` ↔ `student.user_id` mediante `app_user.institutional_email` y conserva el flujo actual de matrícula activa y derivación de representante.
  - `@ulima.edu.pe` debe resolver `app_user` ↔ `teacher.user_id` mediante `app_user.institutional_email`; devuelve rol `teacher`, no exige matrícula ni consulta `section_representative`, y deriva `teacherLabel` igual que el login con código y contraseña.
  `[@test] ../../../test/auth.google-login.test.ts`
- Una cuenta de dominio permitido que no tenga el perfil correspondiente vinculado recibe `401 USER_NOT_FOUND`. Google SSO no crea usuarios ni perfiles automáticamente.
  `[@test] ../../../test/auth.google-login.test.ts`
- Tras verificar el `idToken` y ubicar el perfil, se **guarda el `sub` de Google** (ID único de la cuenta) en `app_user.google_id`.
- La columna `app_user.google_id` (`varchar(255)`, nullable) existe en la BD.
- El guardado es idempotente (solo escribe si cambió) y no bloquea el login si el usuario ya estaba vinculado.
- Ambos flujos incrementan `tokenVersion` y emiten el JWT correspondiente: el alumno lleva `studentId`; el docente lleva `teacherId`, `role: "teacher"` y no lleva `studentId`.
  `[@test] ../../../test/auth.google-login.test.ts`
- Este cambio no requiere migración ni seed y no altera el login con código y contraseña.

### BR-AUTH-11: Restablecimiento de contraseña (HU20)

- Tabla `password_reset_token`: `id`, `user_id` (FK `app_user`), `token_hash` (SHA-256 hex del OTP, `varchar(64)`), `expires_at` (timestamptz), `used_at` (timestamptz, null), `attempts` (default 0), `created_at` (timestamptz, default now). Índice por `user_id`.
- OTP de 6 dígitos generado con crypto seguro; solo se persiste su hash SHA-256.
  `[@test] ../../../test/password-reset.logic.test.ts`
- Política: expiración 30 minutos, máximo 5 intentos, un solo uso.
  `[@test] ../../../test/password-reset.logic.test.ts`
- La nueva contraseña debe tener mínimo 8 caracteres (`validateNewPassword`).
  `[@test] ../../../test/password-reset.logic.test.ts`
- `POST /auth/password-reset/request` es público y **siempre** responde `200` con el mensaje genérico "Si la cuenta existe, enviamos un código a tu correo institucional.", exista o no la cuenta (no permite enumeración de usuarios).
- Rate limit: máximo 3 tokens creados por usuario en la última hora; al exceder se responde el mismo `200` genérico sin enviar correo.
- Al emitir un token nuevo se invalidan (marcan usados) los tokens activos previos del usuario.
- `POST /auth/password-reset/confirm` responde `400 INVALID_RESET_CODE` con el mensaje genérico "Código inválido o expirado." ante mismatch/expirado/usado/intentos agotados o cuenta inexistente, sin distinguir el caso. Cada intento fallido incrementa `attempts` (persistido).
- En éxito: se hashea la nueva contraseña con `bcryptjs` (costo 10, igual que los hashes existentes), se actualiza `password_hash`, se incrementa `token_version` (cierra todas las sesiones) y se marca el token como usado.
- `POST /auth/password-reset/request-me` requiere JWT y responde el correo institucional enmascarado (ej. `2023****@aloe.ulima.edu.pe`).
  `[@test] ../../../test/password-reset.logic.test.ts`
- Envío de correo vía Resend (`src/shared/email/resend-client.ts`, `RESEND_API_KEY` / `RESEND_FROM`). Si `RESEND_API_KEY` está vacía y `NODE_ENV != production`, el OTP se loguea en consola con prefijo `[DEV ONLY]`. Un fallo de envío se loguea del lado servidor y **nunca** se propaga al cliente.
- El correo se envía **multipart** (`html` + `text/plain`) para mejorar la entregabilidad (menos probabilidad de spam). El remitente (`RESEND_FROM`) usa el **dominio verificado** del proyecto (`no-reply@mail.grupo5app.lat`, con DKIM/SPF/DMARC); ese es también el default en `env.ts` para no caer nunca en `onboarding@resend.dev`.

### BR-AUTH-12: Rol docente (HU18)

- `AppRole` incorpora `"teacher"`. Profesor y JP comparten este único rol técnico; la etiqueta ("Profesor"/"Jefe de Práctica") se deriva de `section.teacher_id` vs `section.jp_id` (ver spec de advising, BR-ADV-01).
- **Detección en login** (`POST /auth/login`): si el `code` no corresponde a ningún perfil `student`, se busca un perfil docente: `app_user` ↔ `teacher.user_id`. Si existe → rol `teacher`; el flujo NO exige matrícula activa ni consulta `section_representative`. Si el `app_user` no tiene ni perfil student ni teacher → `401 USER_NOT_FOUND` (cuenta huérfana).
- Una cuenta (`app_user`) es de estudiante **o** de docente, nunca ambas: el perfil student tiene precedencia en el lookup y el seed de docentes crea cuentas separadas.
- **JWT de docente**: `{ sub, teacherId, code, role: "teacher", tokenVersion }` — **sin `studentId`**. El de estudiante no cambia.
- **Middleware**: exige `studentId` entero cuando `role != "teacher"` y `teacherId` entero cuando `role == "teacher"`; setea `c.set("teacherId", …)` en ese caso. La validación de `tokenVersion` contra `app_user` es idéntica para ambos.
- **Helper `requireRole(...roles)`** (en `src/shared/middleware/auth-middleware.ts`): middleware que corre después de `authMiddleware` y responde `403 FORBIDDEN` ("No tiene permisos para acceder a este recurso.") si el rol del contexto no está en la lista. Los módulos de alumno (`schedule`, `curriculum`, `alerts`, `grades`, `academic-profile`, `course-detail`, `section-management`) lo aplican con los roles de alumno; el módulo `advising` con `teacher`.
- **`GET /auth/me`** con token docente: devuelve el shape docente (ver Endpoints), incluida la etiqueta `teacherLabel`.
- **Google SSO docente**: una cuenta `@ulima.edu.pe` vinculada a `teacher.user_id` puede iniciar sesión mediante `POST /auth/google` con el mismo shape y JWT docente definidos en esta regla. El acceso por código/contraseña permanece disponible.
- **Login de estudiantes: cero cambios observables.** Criterio de aceptación del issue #30: smoke test de login de alumno antes del merge.
- La respuesta de login/me para docentes incluye `"setupComplete": true` fijo (no aplica el setup de carrera) para no romper el routing del frontend.

**Shape del user docente** (login y `/auth/me`):
```json
{
  "id": 42,
  "teacherId": 7,
  "code": "T0123",
  "fullName": "Apellido Apellido, Nombre",
  "institutionalEmail": "docente@ulima.edu.pe",
  "role": "teacher",
  "teacherLabel": "Profesor",
  "setupComplete": true
}
```

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

### POST /auth/google

Canjea un `idToken` de Google por un JWT de ULima++ para un alumno o docente institucional preaprovisionado.

- **Auth**: None (público)
- **Request body**:
  ```json
  {
    "idToken": "google-id-token"
  }
  ```
- **Response** `200 OK`: el mismo envelope de `POST /auth/login`. `user` usa el shape de alumno para `@aloe.ulima.edu.pe` o el shape docente para `@ulima.edu.pe`.
- **Errors**:
  - `401` `INVALID_TOKEN`: el token no contiene un correo válido
  - `401` `USER_NOT_FOUND`: el correo es institucional, pero no existe una cuenta con el perfil correspondiente
  - `403` `INVALID_DOMAIN`: el correo no termina en uno de los dos dominios institucionales admitidos
  - `403` `NOT_ENROLLED`: el alumno existe, pero no tiene matrícula activa; no aplica a docentes
  `[@test] ../../../test/auth.google-login.test.ts`

### GET /auth/me

Retorna los datos del alumno o docente autenticado.

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

### POST /auth/password-reset/request

Solicita un código OTP de restablecimiento (público).

- **Auth**: None (público)
- **Request body**: `{ "identifier": "20201234" }` (código de alumno o correo institucional)
- **Response** `200 OK` (siempre, exista o no la cuenta):
  ```json
  { "message": "Si la cuenta existe, enviamos un código a tu correo institucional." }
  ```

### POST /auth/password-reset/confirm

Confirma el OTP y establece la nueva contraseña (público).

- **Auth**: None (público)
- **Request body**: `{ "identifier": "20201234", "code": "123456", "newPassword": "nuevaClave123" }`
- **Response** `200 OK`:
  ```json
  { "message": "Contraseña actualizada correctamente." }
  ```
- **Errors**:
  - `400` `WEAK_PASSWORD`: La nueva contraseña tiene menos de 8 caracteres
  - `400` `INVALID_RESET_CODE`: "Código inválido o expirado." (mismatch, expirado, usado, intentos agotados o cuenta inexistente — indistinguibles a propósito)

### POST /auth/password-reset/request-me

Solicita el código para el usuario autenticado (envía directo a su correo).

- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "message": "Enviamos un código a tu correo institucional.",
    "email": "2023****@aloe.ulima.edu.pe"
  }
  ```

## JWT Specification

| Field | Type | Description |
| --- | --- | --- |
| `sub` | `number` | `app_user.id` |
| `studentId` | `number` | `student.id` — **solo tokens de alumno**; ausente en tokens de docente (HU18) |
| `teacherId` | `number` | `teacher.id` — **solo tokens de docente** (HU18); ausente en tokens de alumno |
| `code` | `string` | `app_user.code` |
| `role` | `string` | `student` / `delegate` / `subdelegate` / `teacher` |
| `tokenVersion` | `number` | Versión actual de la sesión |
| `iat` | `number` | Issued at (Unix epoch seconds) |
| `exp` | `number` | Expiration (Unix epoch seconds) |

Cada token lleva `studentId` **o** `teacherId` según el rol, nunca ambos (ver BR-AUTH-12).

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

## Test Links

- `[@test] ../../../test/password-reset.logic.test.ts` (BR-AUTH-11)
