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

- `GET /version`
  - Response: `{ "commit": "string", "ref": "string|null", "deployment": "string|null" }`
  - Expone el commit desplegado (Vercel inyecta `VERCEL_GIT_COMMIT_SHA`).

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

### GET /grades/me/courses

Devuelve cursos + evaluaciones del sílabo con sus pesos, para la calculadora del alumno.

- **Auth**: Bearer token, rol `student|delegate|subdelegate`
- **Response** `200 OK`:
  ```json
  {
    "cursos": [
      {
        "id": "1",
        "nombre": "INGENIERÍA DE SOFTWARE II",
        "ciclo": "2026-1",
        "silaboUrl": "https://drive.google.com/...",
        "secciones": [
          { "idSeccion": "1", "codigoSeccion": "856" }
        ]
      }
    ],
    "syllabi": [
      {
        "cursoId": "1",
        "cursoNombre": "INGENIERÍA DE SOFTWARE II",
        "evaluaciones": [
          {
            "id": "1",
            "nombre": "Examen Escrito 1",
            "sigla": "EE1",
            "peso": 30,
            "tipo": "Examen"
          }
        ]
      }
    ]
  }
  ```

### POST /grades/me/calculate

Calcula el promedio ponderado de una lista de notas ingresadas por el alumno. No persiste datos.

- **Auth**: Bearer token, rol `student|delegate|subdelegate`
- **Request body**:
  ```json
  {
    "notas": [
      { "valor": 15, "peso": 30 },
      { "valor": 12, "peso": 50 },
      { "valor": 18, "peso": 20 }
    ]
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "promedio": 14.1,
    "sumaPesos": 100
  }
  ```
- **Errors**: `400` `INVALID_REQUEST_BODY` (si `valor` no está entre 0-20 o `peso` no está entre 0-100)

### POST /grades/me/notes

Guarda las notas personales del alumno en `student_score`. Cada nota se asocia al `enrollment` activo del alumno en la sección. Si ya existe una nota para la misma evaluación, se actualiza (upsert).

- **Auth**: Bearer token, rol `student|delegate|subdelegate`
- **Request body**:
  ```json
  {
    "cursos": [
      {
        "sectionId": 1,
        "notas": [
          { "assessmentId": 1, "valor": 15 },
          { "assessmentId": 2, "valor": 0 }
        ]
      }
    ]
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "message": "Notas guardadas correctamente"
  }
  ```
- **Errors**: `400` `INVALID_REQUEST_BODY`, `500` error interno

### GET /grades/me/notes

Recupera las notas personales del alumno autenticado desde `student_score`.

- **Auth**: Bearer token, rol `student|delegate|subdelegate`
- **Response** `200 OK`:
  ```json
  {
    "cursos": [
      {
        "sectionId": 1,
        "notas": [
          { "assessmentId": 1, "valor": 15 },
          { "assessmentId": 2, "valor": 0 }
        ]
      }
    ]
  }
  ```

### Endpoints no implementados

- ~~`PUT /grades/me/scores`~~ — **NO IMPLEMENTADO** (reemplazado por `POST /grades/me/notes`).
- ~~`GET /grades/me/courses/:sectionId/average`~~ — **NO IMPLEMENTADO** (el cálculo se hace vía `POST /grades/me/calculate`).
- ~~`POST /grades/syllabi`~~ — **NO IMPLEMENTADO** (fuera de v1; la tabla `syllabus` ya existe).

Notas:

- `student_score` es la tabla de persistencia de notas personales del alumno.
- El cálculo de promedio ponderado se delega al backend vía `POST /grades/me/calculate`.
- Ya no existe `NotasService` en el frontend: toda la lógica de almacenamiento y cálculo está en el backend.

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

- `GET /section-management/representatives` — lista las secciones donde el alumno autenticado es delegado/subdelegado activo. Roles de alumno. Response: `{ "sectionRepresentatives": [{ "id": "1", "enrollmentId": "10", "idSeccion": "754", "codigoSeccion": "754", "idCurso": "45", "nombreCurso": "Sistemas de Inteligencia Empresarial", "role": "delegado", "alumnosMatriculados": 32 }] }`.
- `GET /section-management/sections/:sectionId/announcements` — lista anuncios activos de la sección para su delegado/subdelegado, ordenados por fecha descendente. Response: `{ "anuncios": Announcement[] }`.
- `POST /section-management/sections/:sectionId/announcements` — crea un anuncio en `announcement`. Rol requerido: `delegate`/`subdelegate` activo de la sección. Body: `{ "title": "string<=150", "message": "string<=5000" }`. Response `201`: `{ "message": "Anuncio publicado correctamente.", "anuncio": Announcement }`.
- `PUT /section-management/announcements/:id` — edita título y mensaje de un anuncio propio. Body: `{ "title": "string<=150", "message": "string<=5000" }`. Response: `{ "message": "Cambios guardados correctamente.", "anuncio": Announcement }`.
- `DELETE /section-management/announcements/:id` — soft delete (`is_active=false`) de un anuncio propio. Response: `{ "message": "Anuncio eliminado correctamente." }`.
- ~~`GET /section-management/me/sections`~~ — **NO IMPLEMENTADO**.
- ~~`GET /section-management/sections/:sectionId/progress`~~ — **NO IMPLEMENTADO** (HU11, pendiente).

Notas:

- Anuncios: el backend deriva `section_representative_id` desde el JWT del alumno y la sección; el frontend no lo envía.
- Errores principales: `403 SECTION_FORBIDDEN`, `403 ANNOUNCEMENT_FORBIDDEN`, `404 ANNOUNCEMENT_NOT_FOUND`, `400 INVALID_REQUEST_BODY`.
- Estadísticas/progreso de sección siguen fuera de alcance de esta implementación y no exponen notas individuales.

## Chat (HU23 — chat en vivo por sección)

Puente de auth entre el JWT propio y Firebase para el chat en vivo (Firebase RTDB). Detalle y reglas en `specs/features/chat/chat.spec.md`. Puede pedir token cualquier miembro de la sección (alumno/delegado/subdelegado con rol `student` en el JWT, o docente/JP con rol `teacher`); un no-miembro recibe `403`.

- `POST /chat/token` — verifica el JWT propio, deriva el rol/pertenencia del solicitante en la sección (desde `enrollment` + `section_representative`, o `section.teacher_id`/`jp_id`), escribe el espejo de membresía `/members/{sectionId}/{uid}` en RTDB (el backend es el ÚNICO que lo escribe) y firma un **custom token** de Firebase (`uid = app_user.id`). Body: `{ "sectionId": number }` (acepta string; se coacciona con `z.coerce.number()`). Response: `{ "token", "uid", "displayName", "role", "roleLabel", "isModerator", "weight" }`. `role ∈ {teacher, jp, delegate, subdelegate, student}`; `weight` = 100/90/70/60/10; `isModerator` = true salvo alumno raso.
- Error principal: `403 CHAT_SECTION_FORBIDDEN` (no pertenece a la sección, o el `userId` del JWT no coincide con el participante).

Notas:

- Las reglas de seguridad de RTDB (lectura/escritura/borrado por membresía) viven en Firebase y se validan con **Firebase Emulator** (fuera de la suite Bun).
- Requiere `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL` en el entorno; si faltan, el servicio no firma tokens (chat deshabilitado). ⚠️ Fijar `firebase-admin@12.1.0` (v13/v14 rompen Vercel con `ERR_REQUIRE_ESM`).
