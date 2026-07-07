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

- Todas las rutas, salvo `GET /`, `GET /health`, `POST /auth/login`, `POST /auth/google`, `POST /auth/password-reset/request` y `POST /auth/password-reset/confirm`, usan `Authorization: Bearer <token>`. Este requisito está **enforced** por `authMiddleware` en cada módulo (incluidos `course-detail`, `grades` y `section-management`).
- El usuario autenticado es estudiante **o docente** (HU18).
- Roles permitidos: `student`, `delegate`, `subdelegate`, `teacher`.
- `teacher` es el rol técnico compartido por profesor y jefe de práctica (JP); su etiqueta se deriva de `section.teacher_id` vs `section.jp_id`. El JWT docente lleva `teacherId` en vez de `studentId`.
- Los módulos de alumno aplican `requireRole('student','delegate','subdelegate')` y el módulo `advising` aplica `requireRole('teacher')`; el rol equivocado recibe `403 FORBIDDEN`.
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
  - HU18: si el `code` no es de un `student` pero sí de un `teacher` (vía `teacher.user_id`), inicia sesión como docente. El `user` docente es `{ id, teacherId, code, fullName, institutionalEmail, role: "teacher", teacherLabel: "Profesor"|"Jefe de Práctica", setupComplete: true }` (sin `studentId`). No exige matrícula activa. El JWT lleva `teacherId` en vez de `studentId`. El login de alumnos no cambia.
- `GET /auth/me`
  - Response: `{ "user": User }` (shape de estudiante o de docente según el rol del token).
- `POST /auth/logout`
  - Response: `{ "message": "Session closed" }`
- `POST /auth/password-reset/request` (público)
  - Request: `{ "identifier": "string" }` (código de alumno o correo institucional)
  - Response (siempre `200`, exista o no la cuenta): `{ "message": "Si la cuenta existe, enviamos un código a tu correo institucional." }`
- `POST /auth/password-reset/confirm` (público)
  - Request: `{ "identifier": "string", "code": "string", "newPassword": "string" }`
  - Response `200`: `{ "message": "Contraseña actualizada correctamente." }`
  - Errores: `400 WEAK_PASSWORD` (menos de 8 caracteres), `400 INVALID_RESET_CODE` ("Código inválido o expirado.", genérico a propósito)
- `POST /auth/password-reset/request-me` (Bearer token)
  - Response `200`: `{ "message": "Enviamos un código a tu correo institucional.", "email": "2023****@aloe.ulima.edu.pe" }`

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
  "currentLevel": 5,
  "setupComplete": false,
  "specialties": [
    { "specialtyId": 1, "name": "Ingeniería de Software", "selectionType": "primary" }
  ]
}
```

Errores de login: `401 USER_NOT_FOUND`, `401 INVALID_PASSWORD`, `403 NOT_ENROLLED`.

## Academic Profile

### GET /academic-profile/me

Perfil completo del estudiante autenticado.

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
        { "specialtyId": 1, "name": "Ingeniería de Software", "selectionType": "primary" },
        { "specialtyId": 2, "name": "Ciencia de Datos", "selectionType": "interest" }
      ]
    }
  }
  ```
- **Errors**: `401` `MISSING_TOKEN`, `401` `INVALID_TOKEN`, `404` `USER_NOT_FOUND`

### GET /academic-profile/careers

Todas las carreras disponibles.

- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "careers": [
      { "id": 1, "code": "ING-INF", "name": "Ingeniería de Sistemas", "faculty": "Facultad de Ingeniería" }
    ]
  }
  ```

### GET /academic-profile/specialties

Especialidades filtradas por carrera. Si `careerId` se omite, usa la carrera del estudiante autenticado.

- **Auth**: Bearer token
- **Query**: `?careerId={id}` (opcional)
- **Response** `200 OK`:
  ```json
  {
    "specialties": [
      { "id": 1, "careerId": 1, "name": "Ingeniería de Software", "description": "..." }
    ]
  }
  ```

### PUT /academic-profile/me/specialties

Reemplaza las especialidades activas del estudiante autenticado. Escribe en `student_specialty`.

- **Auth**: Bearer token
- **Request body**:
  ```json
  {
    "primarySpecialtyId": 1,
    "interestSpecialtyIds": [2, 3]
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "message": "Specialties updated",
    "setupComplete": true,
    "specialties": [
      { "specialtyId": 1, "selectionType": "primary" },
      { "specialtyId": 2, "selectionType": "interest" }
    ]
  }
  ```
- **Errors**: `400` `INVALID_BODY`, `404` `SPECIALTY_NOT_FOUND`, `409` `DUPLICATE_PRIMARY`

Notas:

- No existe endpoint para cambiar carrera/curriculum en v1.
- `PUT /academic-profile/me/specialties` marca `student.specialty_setup_completed = true` incluso con listas vacías.

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

- `GET /grades/me/courses` — **IMPLEMENTADO**. Devuelve cursos + evaluaciones del sílabo con sus pesos, para la calculadora del alumno.
- ~~`PUT /grades/me/scores`~~ — **NO IMPLEMENTADO** (ver nota de arquitectura).
- ~~`GET /grades/me/courses/:sectionId/average`~~ — **NO IMPLEMENTADO** (ver nota de arquitectura).

Notas:

- **Arquitectura real (HU06/HU07)**: el backend `grades` es **solo lectura** (`GET /grades/me/courses`). El **guardado de notas del alumno es local en el cliente** (`shared_preferences`, servicio Flutter `NotasService`) y el **cálculo del promedio ponderado ocurre en el frontend** (calculadora). Son notas personales no oficiales; por eso no se persisten en `student_score` desde la app ni se calcula el promedio en servidor. Los endpoints `PUT /grades/me/scores` y `.../average` quedaron documentados pero **nunca se implementaron**; se listan como no implementados para que el contrato refleje la realidad.
- `student_score` existe en el esquema (notas oficiales de referencia) pero la app no lo escribe.
- `POST /grades/syllabi` queda fuera de v1 salvo spec aprobada; la tabla `syllabus` ya existe.

## Schedule

### GET /schedule/me/sessions
Retorna el horario semanal por bloques de tiempo para las secciones donde el estudiante se encuentra matriculado activamente.
- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "days": [
      {
        "dayName": "Lunes",
        "dateText": "12 de Enero",
        "weekText": "Semana 2 del ciclo"
      }
    ],
    "secciones": [
      {
        "idSeccion": "1",
        "codigoSeccion": "856",
        "docenteCode": "T001",
        "promedioSeccion": 0,
        "idCurso": "10",
        "curso": "INGENIERÍA DE SOFTWARE II",
        "asistido": 12,
        "inasistencia": 2,
        "total": 30,
        "horarios": [
          {
            "dia": "Lunes",
            "inicio": "08:00:00",
            "hora_inicio": "08:00 am",
            "fin": "10:00:00",
            "hora_fin": "10:00 am",
            "aula": "L3-402",
            "salon": "L3-402",
            "color": "#F94B3F"
          }
        ]
      }
    ]
  }
  ```

### GET /schedule/me/assessments
Retorna la lista de evaluaciones programadas en el sílabo mapeadas a fechas y horarios reales basados en el cronograma semanal de clases del estudiante.
- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "assessments": [
      {
        "id": "1",
        "courseName": "INGENIERÍA DE SOFTWARE II",
        "sectionCode": "856",
        "code": "EE1",
        "name": "Examen Escrito 1",
        "weekNumber": 2,
        "date": "2026-01-12",
        "startTime": "08:00:00",
        "endTime": "10:00:00",
        "classroom": "L3-402",
        "color": "#F94B3F"
      }
    ]
  }
  ```

### GET /schedule/me/load
Retorna la carga académica por semana para el periodo académico activo, identificando semanas con alta carga académica.
- **Auth**: Bearer token
- **Response** `200 OK`:
  ```json
  {
    "weeks": [
      {
        "weekNumber": 2,
        "startDate": "2026-01-12",
        "endDate": "2026-01-18",
        "assessmentCount": 3,
        "isHighLoad": true
      }
    ]
  }
  ```

Notas:

- Horario usa `schedule_session` de secciones con enrollment activo.
- Evaluaciones usan `assessment.week_number` mapeado dinámicamente a fechas reales de la clase en esa semana académica.
- Alta carga es 3+ evaluaciones en una misma semana académica.

- `GET /schedule/me/sessions` expone `schedule_session.classroom` por sesiÃ³n como `aula`/`salon`; `color` puede venir como nombre legacy o como hexadecimal desde `schedule_session.color_hex`.

## Course Detail

- `GET /course-detail/sections/:sectionId`
- `GET /course-detail/sections/:sectionId/announcements`
- `GET /course-detail/sections/:sectionId/advising`
- `GET /course-detail/sections/:sectionId/contacts`

Notas:

- Solo roles de alumno (`requireRole('student','delegate','subdelegate')`); un token docente recibe `403 FORBIDDEN`.
- El estudiante solo ve secciones donde está matriculado.
- Asesorías visibles: `section_id IS NULL` para el curso ofertado o `section_id` igual a su sección. Se incluyen las extras (`kind='extra'`) de la sección cuya `session_date` no sea pasada.
- Cada asesoría agrega (HU18): `kind` (`recurring`/`extra`), `fecha` (`YYYY-MM-DD`, solo extras; `null` en recurrentes), `dictanteRol` (`"Profesor"` o `"JP"` según sea `section.teacher_id` o `section.jp_id`), `asistentes` (conteo de `advising_rsvp`). Los campos previos (`id, courseId, docenteCode, docente, dia, inicio, fin, aula, zoom`) no cambian.
- Contactos agrega la clave top-level `jefePractica` (`{ code, lastName, firstName }` o `null`) desde `section.jp_id`, entre `docente` y `alumnos`.
- Anuncios visibles solo si pertenecen a la sección del estudiante.

## Advising (HU18 — docentes)

Rol requerido: `teacher` (`requireRole('teacher')`). Detalle y reglas en `specs/features/advising/advising.spec.md`.

- `GET /advising/me/sections` — secciones del docente (como profesor o JP) en el período activo, para el formulario. Response: `{ secciones: [ { sectionId, courseOfferingId, courseName, sectionCode, rol } ] }`.
- `GET /advising/me/sessions` — asesorías del docente (recurrentes + extras) con `asistentes` y `rol`. Response: `{ sesiones: [ { id, sectionId, courseOfferingId, courseName, sectionCode, kind, dia, fecha, inicio, fin, modality, aula, zoom, nota, cupo, asistentes, rol } ] }`.
- `POST /advising/me/sessions` — crea asesoría extra. Body: `{ sectionId, sessionDate: "YYYY-MM-DD", startTime: "HH:MM", endTime: "HH:MM", modality: "classroom"|"virtual"|"hybrid", classroom?, meetingUrl?, note?, capacity? }`. Response `201`: `{ sesion }`. Errores: `403 SECTION_FORBIDDEN`, `400 INVALID_TIME_RANGE`, `400 DATE_OUT_OF_PERIOD`, `400 DATE_IN_PAST`, `409 ADVISING_OVERLAP`, `400 MISSING_LOCATION`, `409 NO_ACTIVE_PERIOD`.
- `DELETE /advising/me/sessions/:id` — elimina una extra propia. Errores: `404 ADVISING_NOT_FOUND`, `403 FORBIDDEN`, `409 ONLY_EXTRA_DELETABLE`.
- `GET /advising/me/sessions/:id/attendees` — conteo + lista de confirmados de una sesión propia. Response: `{ total, asistentes: [ { code, firstName, lastName } ] }`.

Notas:

- Todo el módulo comparte la guarda defensiva `401 TEACHER_NOT_FOUND` (contexto sin `teacherId`; no ocurre tras `authMiddleware`+`requireRole('teacher')`).
- Los endpoints de RSVP del alumno (`POST/DELETE /advising/sessions/:id/rsvp`) pertenecen a HU17 y se documentan en su spec; HU18 solo lee `advising_rsvp` (conteo/lista).

## Alerts

- `GET /alerts/me`
- `PUT /alerts/me/:alertId/read`

Notas:

- Tipos válidos: `academic_risk`, `high_load`.
- Recalcular alertas es interno; no hay endpoint público de recalculo en v1.
- `academic_risk` no compara contra promedio de sección.

## Section Management

- `GET /section-management/representatives` — **IMPLEMENTADO** (único endpoint real). Lista los representantes (delegado/subdelegado) activos por sección.
- ~~`GET /section-management/me/sections`~~ — **NO IMPLEMENTADO**.
- ~~`POST /section-management/sections/:sectionId/announcements`~~ — **NO IMPLEMENTADO** (HU10, pendiente).
- ~~`GET /section-management/sections/:sectionId/progress`~~ — **NO IMPLEMENTADO** (HU11, pendiente).

Notas:

- **Estado real**: el módulo solo expone `GET /representatives`. Los endpoints de **registro de anuncios (HU10)** y **estadísticas/progreso (HU11)** están documentados pero **no implementados** — ambas HU siguen pendientes (ver tablero). Existe scaffolding sin uso (`createAnnouncementSchema`, tabla `announcement`, observer stub).
- Cuando se implementen: solo `delegate`/`subdelegate` activos en `section_representative`; los anuncios escriben en `announcement`; las métricas agregadas no exponen notas individuales.
