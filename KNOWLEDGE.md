# Backend Knowledge

## Producto

ULima++ es una app académica móvil para estudiantes de la Universidad de Lima. El backend expone una API REST consumida por Flutter.

## Alcance Actual

- App centrada en estudiantes.
- No hay pantallas admin.
- No hay login docente.
- PostgreSQL es la única fuente de verdad.
- Los JSON del frontend son descartables y no se migran.
- La base ya está creada; el backend no debe crear ni poblar tablas.

## Stack

- Bun
- TypeScript
- Hono
- Drizzle ORM
- PostgreSQL
- Zod
- JWT
- bcryptjs

## Esquema Definitivo

Tablas principales:

- Identidad: `app_user`, `student`, `teacher`
- Estructura académica: `career`, `specialty`, `student_specialty`, `curriculum`
- Malla: `course`, `curriculum_course`, `curriculum_course_specialty`, `course_prerequisite`
- Progreso: `student_course_progress`, `student_curriculum_simulation`
- Ciclo y matrícula: `academic_period`, `course_offering`, `section`, `enrollment`
- Horario: `academic_week`, `schedule_session`
- Asesorías: `course_advising_session`
- Evaluaciones: `syllabus`, `assessment_type`, `assessment`, `student_score`
- Comunicación: `section_representative`, `announcement`, `alert`

Tablas que no pertenecen al esquema definitivo:

- `study_plan`
- `attendance`
- `class_session`
- `assessment_event`
- cualquier tabla de admin o teacher login

## Reglas De Dominio

- `app_user` almacena cuentas que inician sesión.
- `teacher` es información referencial, no usuario de app.
- `enrollment.status = 'active'` alimenta cursos actuales, horario, calculadora, asesorías y alertas.
- `enrollment.status = 'completed'` no equivale a curso aprobado.
- La aprobación real viene de `student_course_progress.status = 'approved'`.
- `student_score` son notas personales no oficiales.
- Las notas personales no se usan para promedios oficiales de sección salvo que una spec defina una métrica agregada explícita.
- Riesgo académico: avance evaluado > 55% y promedio personal < 10.5.
- Alta carga: 3 o más evaluaciones en la misma semana académica.
- La simulación de malla es visual y nunca modifica matrícula, notas ni progreso real.

## Roles

- `student`
- `delegate`
- `subdelegate`

`delegate` y `subdelegate` se derivan desde filas activas de `section_representative`. Si un estudiante califica para ambos, `delegate` tiene precedencia.

## Features

| Feature | Historias |
| --- | --- |
| Auth | US01, US02 |
| Academic profile | US05 |
| Curriculum | US03, US04 |
| Grades | US06, US07 |
| Schedule | US09 |
| Course detail | US13, US14, US17 |
| Alerts | US15 |
| Section management | US16, US18 |

## Historias Reales

| ID | Historia |
| --- | --- |
| US01 | Iniciar sesión con código y contraseña. |
| US02 | Cerrar sesión. |
| US03 | Visualizar malla curricular interactiva. |
| US04 | Actualizar/simular estados visuales de cursos. |
| US05 | Seleccionar especialidad. |
| US06 | Registrar notas personales por evaluación. |
| US07 | Visualizar promedio personal por curso. |
| US09 | Visualizar horario y evaluaciones del ciclo. |
| US13 | Visualizar horario de asesoría. |
| US14 | Visualizar contactos de sección. |
| US15 | Recibir alertas de riesgo académico y alta carga. |
| US16 | Registrar anuncios como delegado/subdelegado. |
| US17 | Visualizar anuncios de sección. |
| US18 | Visualizar métricas agregadas de sección sin notas individuales. |

## Arquitectura

Módulos en `src/modules/<feature>`:

- `routes`: endpoints Hono.
- `controller`: HTTP, validación y respuesta.
- `service`: reglas de negocio.
- `repository`: acceso a PostgreSQL.
- `schemas`: Zod.
- `types`: DTOs y tipos.
- `index`: composición del módulo.

Shared:

- `src/shared`: errores, middleware, tipos compartidos.
- `src/events`: EventBus base. Observers reales se agregan solo con spec aprobada.
- `src/db`: schema definitivo y cliente Drizzle.

## Prioridad Recomendada De Specs

1. Auth.
2. Academic profile.
3. Curriculum.
4. Grades.
5. Schedule.
6. Course detail.
7. Alerts.
8. Section management.

## Decisiones No Negociables

- No mocks JSON como fallback.
- No seeds.
- No migraciones sin aprobación.
- No lógica fuera de spec.
- No endpoints fuera de `docs/specs/api-contracts.md`.
- No modificar `src/db` salvo cambio de BD aprobado.
