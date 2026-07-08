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
- Incluye `setupComplete` desde `student.specialty_setup_completed`.
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
- Siempre marca `student.specialty_setup_completed = true`, incluso si `primarySpecialtyId` es `null` y `interestSpecialtyIds` está vacío.

### BR-AP-05: Specialty setup completion
- `student.specialty_setup_completed` indica que el estudiante ya pasó por el wizard de especialidades.
- Este flag permite distinguir “todavía no configuró” de “configuró y eligió no seleccionar especialidad por ahora”.

### BR-AP-06: Self-only constraint
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
      "setupComplete": true,
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
    "setupComplete": true,
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
  setupComplete: boolean;
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
  message: 'Specialties updated';
  setupComplete: true;
  specialties: Array<{
    specialtyId: number;
    selectionType: 'primary' | 'interest';
  }>;
};
```

### Student schema change

```typescript
student.specialtySetupCompleted: boolean;
```

- DB column: `student.specialty_setup_completed boolean not null default false`
- Existing students default to `false` until `PUT /academic-profile/me/specialties` succeeds.

### ActiveSpecialty

```typescript
type ActiveSpecialty = {
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

## Test Links

*(No hay tests existentes aún. Cuando se agreguen, enlazarlos aquí con `[@test]`.)*
