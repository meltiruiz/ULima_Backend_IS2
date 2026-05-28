---
name: Academic Profile
description: View student profile, list careers and specialties, and manage specialty selection for ULima++ students
targets:
  - ../../../src/modules/academic-profile/**
---

# Academic Profile

## User Stories

| ID | Description |
| --- | --- |
| US05 | Seleccionar especialidad. |

## Business Rules

### BR-AP-01: GET /academic-profile/me — Full profile
- Retorna el perfil completo del estudiante autenticado.
- Consulta `app_user` + `student` + `career` + `curriculum` + `student_specialty` activas.
- Incluye el objeto `career` con `id`, `code`, `name`, `faculty`.
- Incluye el objeto `curriculum` con `id`, `name`.
- Incluye el array `specialties` con las especialidades activas del estudiante.
- **Auth**: Bearer token (vía `authMiddleware`).

### BR-AP-02: GET /academic-profile/careers — List careers
- Retorna todas las carreras ordenadas por nombre.
- **Auth**: Bearer token.

### BR-AP-03: GET /academic-profile/specialties — List specialties
- Retorna especialidades filtradas por `careerId` (query param).
- Si `careerId` no se envía, retorna especialidades de la carrera del estudiante autenticado.
- **Auth**: Bearer token.

### BR-AP-04: PUT /academic-profile/me/specialties — Replace specialties
- Reemplaza las especialidades activas del estudiante autenticado.
- **Auth**: Bearer token.
- El body incluye `primarySpecialtyId` (opcional, nullable) y `interestSpecialtyIds` (array, puede ser vacío).
- Solo una especialidad puede tener `selectionType = 'primary'` por estudiante (garantizado por `uq_student_specialty_active_primary`).
- Especialidades previas del estudiante que NO estén en la nueva lista → `isActive = false`.
- Especialidades que ya existían para el estudiante y están en la nueva lista → se reactivan (`isActive = true`).
- Nuevas combinaciones → se insertan.
- Si `primarySpecialtyId` es `null` y el estudiante tenía una primary activa, esa primary se desactiva.

### BR-AP-05: Self-only constraint
- El estudiante autenticado solo puede leer/modificar su propio perfil y sus propias especialidades.
- No existe un endpoint para ver/modificar perfiles de otros estudiantes.

## Endpoints

### GET /academic-profile/me

Retorna el perfil completo del estudiante autenticado.

- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "profile": {
      "id": 1,
      "studentId": 10,
      "code": "20201234",
      "fullName": "Nombre Apellido",
      "institutionalEmail": "user@aloe.ulima.edu.pe",
      "role": "student",
      "currentLevel": 5,
      "career": {
        "id": 1,
        "code": "ING-INF",
        "name": "Ingeniería de Sistemas",
        "faculty": "Facultad de Ingeniería"
      },
      "curriculum": {
        "id": 1,
        "name": "Currículo 2023"
      },
      "specialties": [
        {
          "specialtyId": 1,
          "name": "Ingeniería de Software",
          "selectionType": "primary"
        },
        {
          "specialtyId": 2,
          "name": "Ciencia de Datos",
          "selectionType": "interest"
        }
      ]
    }
  }
  ```
- **Errors**:
  - `401` `MISSING_TOKEN`: No se envió el token
  - `401` `INVALID_TOKEN`: Token inválido o expirado
  - `404` `USER_NOT_FOUND`: El usuario autenticado no existe en `app_user`/`student`

### GET /academic-profile/careers

Retorna todas las carreras disponibles.

- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "careers": [
      {
        "id": 1,
        "code": "ING-INF",
        "name": "Ingeniería de Sistemas",
        "faculty": "Facultad de Ingeniería"
      },
      {
        "id": 2,
        "code": "ING-IND",
        "name": "Ingeniería Industrial",
        "faculty": "Facultad de Ingeniería"
      }
    ]
  }
  ```

### GET /academic-profile/specialties

Retorna especialidades. Si `careerId` no se envía, usa la carrera del estudiante autenticado.

- **Auth**: Bearer token
- **Query params**: `?careerId={id}` (opcional)
- **Response** `200 OK`:
  ```json
  {
    "specialties": [
      {
        "id": 1,
        "careerId": 1,
        "name": "Ingeniería de Software",
        "description": "Especialidad en desarrollo de software"
      }
    ]
  }
  ```
- **Errors**:
  - `401` `MISSING_TOKEN` / `INVALID_TOKEN`
  - `400` `INVALID_CAREER_ID`: Si `careerId` se envía pero no es un número positivo

### PUT /academic-profile/me/specialties

Reemplaza las especialidades activas del estudiante autenticado.

- **Auth**: Bearer token
- **Request body**:
  ```json
  {
    "primarySpecialtyId": 1,
    "interestSpecialtyIds": [2, 3]
  }
  ```
- **Validation** (Zod):
  - `primarySpecialtyId`: `z.number().int().positive().nullable().optional()`
  - `interestSpecialtyIds`: `z.array(z.number().int().positive()).optional().default([])`
- **Response** `200 OK`:
  ```json
  {
    "message": "Specialties updated",
    "specialties": [
      { "specialtyId": 1, "selectionType": "primary" },
      { "specialtyId": 2, "selectionType": "interest" },
      { "specialtyId": 3, "selectionType": "interest" }
    ]
  }
  ```
- **Errors**:
  - `401` `MISSING_TOKEN` / `INVALID_TOKEN`
  - `400` `INVALID_BODY`: Body no pasa validación Zod
  - `404` `SPECIALTY_NOT_FOUND`: Algún `specialtyId` no existe en la tabla `specialty`
  - `409` `DUPLICATE_PRIMARY`: Se intenta tener más de una primary activa (violación del unique index)

## Types

### ProfileResponse

```typescript
type ProfileResponse = {
  id: number;
  studentId: number;
  code: string;
  fullName: string;
  institutionalEmail: string;
  role: 'student' | 'delegate' | 'subdelegate';
  currentLevel: number | null;
  career: {
    id: number;
    code: string;
    name: string;
    faculty: string;
  };
  curriculum: {
    id: number;
    name: string;
  };
  specialties: Array<{
    specialtyId: number;
    name: string;
    selectionType: 'primary' | 'interest';
  }>;
};
```

### CareerResponse

```typescript
type CareerResponse = {
  id: number;
  code: string;
  name: string;
  faculty: string;
};
```

### SpecialtyResponse

```typescript
type SpecialtyResponse = {
  id: number;
  careerId: number;
  name: string;
  description: string | null;
};
```

### UpdateSpecialtiesRequest

```typescript
type UpdateSpecialtiesRequest = {
  primarySpecialtyId?: number | null;
  interestSpecialtyIds?: number[];
};
```

### UpdateSpecialtiesResult

```typescript
type UpdateSpecialtiesResult = {
  specialtyId: number;
  selectionType: 'primary' | 'interest';
};
```

## Schemas (Zod)

### `updateSpecialtiesSchema`

```typescript
export const updateSpecialtiesSchema = z.object({
  primarySpecialtyId: z.number().int().positive().nullable().optional(),
  interestSpecialtyIds: z.array(z.number().int().positive()).optional().default([]),
});
```

## Implementation Plan

### academic-profile.repository.ts

Agregar métodos:

- `findProfileByUserId(userId: number): Promise<ProfileResponse | null>`
  - JOIN `app_user` → `student` → `career` → `curriculum`
  - Retorna datos básicos del perfil (sin specialties).

- `findActiveSpecialties(studentId: number): Promise<Array<{ specialtyId: number; name: string; selectionType: 'primary' | 'interest' }>>`
  - JOIN `student_specialty` con `specialty` donde `student_specialty.studentId = studentId` y `student_specialty.isActive = true`.

- `findAllCareers(): Promise<CareerResponse[]>`
  - SELECT `id`, `code`, `name`, `faculty` FROM `career` ORDER BY `name`.

- `findSpecialtiesByCareerId(careerId: number): Promise<SpecialtyResponse[]>`
  - SELECT FROM `specialty` WHERE `careerId = careerId` ORDER BY `name`.

- `findSpecialtiesByStudentCareer(studentId: number): Promise<SpecialtyResponse[]>`
  - Obtiene el `careerId` del estudiante y luego las specialties de esa carrera.

- `findStudentSpecialty(studentId: number, specialtyId: number): Promise<{ selectionType: string; isActive: boolean } | null>`
  - Verifica si existe el registro en `student_specialty`.

- `deactivateAllStudentSpecialties(studentId: number): Promise<void>`
  - UPDATE `student_specialty` SET `isActive = false` WHERE `studentId = studentId` AND `isActive = true`.

- `upsertStudentSpecialty(studentId: number, specialtyId: number, selectionType: 'primary' | 'interest'): Promise<void>`
  - INSERT ON CONFLICT (studentId, specialtyId) DO UPDATE SET `selectionType = excluded.selectionType`, `isActive = true`.

- `specialtyExists(specialtyId: number): Promise<boolean>`
  - Verifica que el `specialtyId` exista en la tabla `specialty`.

### academic-profile.service.ts

Agregar métodos:

- `getProfile(userId: number)`:
  1. Llama a `repository.findProfileByUserId(userId)`.
  2. Si no existe → `HttpError(404, 'USER_NOT_FOUND')`.
  3. Obtiene specialties activas con `repository.findActiveSpecialties(profile.studentId)`.
  4. Combina y retorna `{ profile: { ...profile, specialties } }`.

- `getCareers()`:
  1. Retorna `{ careers: await repository.findAllCareers() }`.

- `getSpecialties(userId: number, careerId?: number)`:
  1. Si `careerId` está presente → valida que sea positivo.
  2. Si no → obtiene el `careerId` del perfil del estudiante.
  3. Retorna `{ specialties: await repository.findSpecialtiesByCareerId(careerId) }`.

- `updateSpecialties(userId: number, input: UpdateSpecialtiesRequest)`:
  1. Obtiene el perfil para conocer `studentId`.
  2. Si `primarySpecialtyId` no es null, verifica que exista (`repository.specialtyExists`).
  3. Para cada `specialtyId` en `interestSpecialtyIds`, verifica que exista.
  4. Si `primarySpecialtyId` está presente, verifica que no esté duplicado en `interestSpecialtyIds`.
  5. Llama a `repository.deactivateAllStudentSpecialties(studentId)`.
  6. Si `primarySpecialtyId` no es null, upsert con `selectionType = 'primary'`.
  7. Para cada `interestSpecialtyId`, upsert con `selectionType = 'interest'`.
  8. Captura error del unique index y relanza como `HttpError(409, 'DUPLICATE_PRIMARY')`.
  9. Retorna la lista actualizada.

### academic-profile.controller.ts

Agregar handlers:

- `getProfile(c)`:
  - Extrae `userId` de `c.get('userId')`.
  - Llama a `service.getProfile(userId)`.
  - Retorna `c.json(result)`.

- `getCareers(c)`:
  - Llama a `service.getCareers()`.
  - Retorna `c.json(result)`.

- `getSpecialties(c)`:
  - Extrae `userId` de `c.get('userId')`.
  - Extrae `careerId` de `c.req.query('careerId')` (parseado a number).
  - Llama a `service.getSpecialties(userId, careerId)`.
  - Retorna `c.json(result)`.

- `updateSpecialties(c)`:
  - Extrae `userId` de `c.get('userId')`.
  - Valida body con `updateSpecialtiesSchema`.
  - Llama a `service.updateSpecialties(userId, parsedBody)`.
  - Retorna `c.json(result)`.

### academic-profile.routes.ts

Reemplazar rutas inline actuales:

- `GET /me` → `authMiddleware`, `controller.getProfile`
- `GET /careers` → `authMiddleware`, `controller.getCareers`
- `GET /specialties` → `authMiddleware`, `controller.getSpecialties`
- `PUT /me/specialties` → `authMiddleware`, `controller.updateSpecialties`
- **Eliminar** `GET /users` (no está en el contrato API)

### academic-profile.schemas.ts

Conservar y expandir:

```typescript
export const updateSpecialtiesSchema = z.object({
  primarySpecialtyId: z.number().int().positive().nullable().optional(),
  interestSpecialtyIds: z.array(z.number().int().positive()).optional().default([]),
});
```

Eliminar `selectCareerSchema` y `selectSpecialtiesSchema` si no se usan en el nuevo diseño.

### academic-profile.types.ts

Reemplazar el tipo actual con los DTOs definidos arriba (`ProfileResponse`, `CareerResponse`, `SpecialtyResponse`, `UpdateSpecialtiesRequest`, `UpdateSpecialtiesResult`).

Eliminar `AcademicProfileStatus` si no se usa.

## Test Links

*(No hay tests existentes aún. Cuando se agreguen, enlazarlos aquí con `[@test]`.)*
