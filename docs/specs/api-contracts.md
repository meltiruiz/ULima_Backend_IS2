# API Contracts

Contrato REST local del backend ULima++. Mantener alineado manualmente con `ULima_Frontend_IS2/docs/specs/api-contracts.md`.

## Reglas

- Todo endpoint, payload, respuesta, error o permiso debe actualizarse aquí antes de implementar backend.
- Las specs backend deben referenciar este archivo.
- PostgreSQL definitivo es la fuente de verdad.
- No existe fallback final a JSON.
- No se crean tablas, seeds ni migraciones desde el contrato.
- Cada sección debe ser refinada por la spec de feature antes de implementar.

## Principios Globales

- Todas las rutas, salvo `GET /`, `GET /health` y `POST /auth/login`, usan `Authorization: Bearer <token>`.
- Usuario autenticado siempre es estudiante.
- Roles permitidos: `student`, `delegate`, `subdelegate`.
- `teacher` nunca produce sesión.
- IDs numéricos pueden viajar como number o string según DTO final aprobado; cada spec debe fijarlo antes de implementar.
- Errores siguen forma general:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Auth

## Public

- `GET /`
  - Response: metadata básica del backend y módulos disponibles.
- `GET /health`
  - Response: `{ "status": "ok", "timestamp": "ISO-8601 string" }`

## Auth

- `POST /auth/login`
  - Request: `{ "code": "string", "password": "string" }`
  - Response: `{ "token": "string", "tokenType": "Bearer", "expiresIn": 86400, "user": User }`
- `GET /auth/me`
  - Response: `{ "user": User }`
- `POST /auth/logout`
  - Response: `{ "message": "Session closed" }`

`User` mínimo:

```json
{
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
```

## Academic Profile

- `GET /academic-profile/me`
- `GET /academic-profile/careers`
- `GET /academic-profile/specialties?careerId={id}`
- `PUT /academic-profile/me/specialties`

Notas:

- `PUT /academic-profile/me/specialties` escribe en `student_specialty`.
- Si se permite cambiar carrera/curriculum, la spec debe definir reglas de compatibilidad antes de implementar.

## Curriculum

- `GET /curriculum/me`
- `PUT /curriculum/me/simulation`
- `DELETE /curriculum/me/simulation/:curriculumCourseId`

Notas:

- Progreso real viene de `student_course_progress`.
- Cursos actuales vienen de `enrollment.status = 'active'`.
- Simulación visual viene de `student_curriculum_simulation`.
- La simulación no escribe `student_course_progress`, `enrollment` ni `student_score`.

## Grades

- `GET /grades/me/courses`
- `PUT /grades/me/scores`
- `GET /grades/me/courses/:sectionId/average`

Notas:

- `student_score` almacena notas personales no oficiales.
- `PUT /grades/me/scores` solo puede afectar scores del estudiante autenticado.
- Assessment debe pertenecer al syllabus del `course_offering` de la sección matriculada.
- `POST /grades/syllabi` queda fuera de v1 salvo spec aprobada; la tabla `syllabus` ya existe.

## Schedule

- `GET /schedule/me/sessions`
- `GET /schedule/me/assessments`
- `GET /schedule/me/load`

Notas:

- Horario usa `schedule_session` de secciones con enrollment activo.
- Evaluaciones usan `assessment.week_number`.
- Alta carga es 3+ evaluaciones en una misma semana académica.

## Course Detail

- `GET /course-detail/sections/:sectionId`
- `GET /course-detail/sections/:sectionId/announcements`
- `GET /course-detail/sections/:sectionId/advising`
- `GET /course-detail/sections/:sectionId/contacts`

Notas:

- El estudiante solo ve secciones donde está matriculado.
- Asesorías visibles: `section_id IS NULL` para el curso ofertado o `section_id` igual a su sección.
- Anuncios visibles solo si pertenecen a la sección del estudiante.

## Alerts

- `GET /alerts/me`
- `PUT /alerts/me/:alertId/read`

Notas:

- Tipos válidos: `academic_risk`, `high_load`.
- Recalcular alertas es interno; no hay endpoint público de recalculo en v1.
- `academic_risk` no compara contra promedio de sección.

## Section Management

- `GET /section-management/me/sections`
- `POST /section-management/sections/:sectionId/announcements`
- `GET /section-management/sections/:sectionId/progress`

Notas:

- Solo `delegate` o `subdelegate` activos en `section_representative`.
- Anuncios escriben en `announcement`.
- Métricas agregadas no deben exponer notas individuales.
