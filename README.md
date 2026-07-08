# ULima++ Backend

Backend oficial de ULima++: API REST en Bun/TypeScript/Hono para la app Flutter de estudiantes de la Universidad de Lima.

## Estado Actual

- La base de datos PostgreSQL definitiva ya existe y ya fue creada fuera del proyecto.
- `src/db/schema/schema.ts` modela esa base definitiva con Drizzle.
- `src/db/relations/index.ts` queda vacío por ahora; las relaciones se implementarán cuando una spec lo pida.
- `src/events` queda listo como infraestructura mínima, sin observers de negocio activos.
- Los módulos en `src/modules/**` están estructurados como stubs para que el equipo implemente feature por feature con specs.
- No se deben crear tablas nuevas, ejecutar seeds ni cargar datos de JSON.
- Los JSON del frontend son descartables y no se migran a PostgreSQL.

## Stack

- Bun
- TypeScript
- Hono
- Drizzle ORM
- PostgreSQL
- Zod
- JWT
- bcryptjs

## Arquitectura

Cada feature debe seguir esta separación:

```text
routes -> controller -> service -> repository -> db
```

Responsabilidades:

- `routes`: registra endpoints Hono y middlewares.
- `controller`: adapta HTTP, valida DTOs y arma respuestas.
- `service`: reglas de negocio y coordinación.
- `repository`: consultas Drizzle/PostgreSQL.
- `schemas`: validaciones Zod de entrada.
- `types`: DTOs y tipos del módulo.

`src/server.ts` debe mantenerse delgado: middleware global, health check y registro de módulos.

## Base De Datos Definitiva

El backend debe usar estas tablas como fuente de verdad:

- `app_user`, `student`, `teacher`
- `career`, `specialty`, `student_specialty`, `curriculum`
- `course`, `curriculum_course`, `curriculum_course_specialty`, `course_prerequisite`
- `student_curriculum_simulation`, `student_course_progress`
- `academic_period`, `course_offering`, `syllabus`, `section`, `enrollment`
- `section_representative`, `academic_week`, `schedule_session`
- `course_advising_session`, `assessment_type`, `assessment`, `student_score`
- `announcement`, `alert`

Reglas importantes:

- `app_user` solo representa cuentas que inician sesión.
- `teacher` puede iniciar sesión si está vinculado a `app_user` vía `teacher.user_id` (HU18).
- Roles válidos de app: `student`, `delegate`, `subdelegate`, `teacher`.
- Delegado/subdelegado se deriva desde `section_representative`, no desde `app_user`.
- `student_score` guarda notas personales no oficiales.
- `academic_risk`: avance evaluado mayor a 55% y promedio personal menor a 10.5.
- `high_load`: 3 o más evaluaciones en la misma semana académica.
- `student_course_progress` es la fuente real para pintar avance de malla.
- `student_curriculum_simulation` es solo capa visual/proyectada.

## Reglas De Datos

No hacer:

- No ejecutar `db:push`, `db:migrate`, `db:seed` sin aprobación explícita.
- No crear nuevas tablas para resolver una feature sin spec aprobada.
- No cargar datos desde `assets/data/*.json`.
- No insertar datos mock en PostgreSQL.
- No usar promedios de sección para alertas de riesgo académico.

Sí hacer:

- Consultar la base definitiva con repositorios.
- Validar entradas HTTP con Zod.
- Usar `enrollment.status = 'active'` para vistas del ciclo actual.
- Preservar escrituras reales del usuario cuando la feature lo requiera: notas personales, anuncios de representantes, alertas leídas, etc.

## Módulos

| Módulo | Objetivo |
| --- | --- |
| `auth` | Login, JWT, usuario actual y rol efectivo. |
| `academic-profile` | Carrera, currículo y especialidades del estudiante. |
| `curriculum` | Malla, prerrequisitos, progreso real y simulación visual. |
| `grades` | Evaluaciones, notas personales y promedio calculado. |
| `schedule` | Horario y evaluaciones por semana. |
| `course-detail` | Detalle de sección, asesorías, anuncios y contactos. |
| `alerts` | Alertas personales de riesgo académico y alta carga. |
| `section-management` | Funciones de delegado/subdelegado. |
| `advising` | Gestión de asesorías extra para docentes (HU18). |

## Specs

Las specs viven en:

```text
specs/features/<feature>/<feature>.spec.md
```

El contrato REST del backend vive dentro del repo:

```text
docs/specs/api-contracts.md
```

Antes de implementar una feature:

1. Revisar `AGENTS.md`.
2. Revisar `KNOWLEDGE.md`.
3. Revisar `docs/specs/feature-index.md`.
4. Actualizar o crear la spec de la feature.
5. Actualizar el contrato REST si cambia API.
6. Esperar aprobación explícita.
7. Implementar solo dentro de los `targets` de la spec.

## Variables De Entorno

```env
DATABASE_URL=postgresql://user:password@host:5432/postgres?sslmode=require
JWT_SECRET=your-super-secret-jwt-key
PORT=3000
NODE_ENV=development
```

## Comandos

```bash
bun install
bun run dev
bun run build
bun run start
```

## Despliegue En Vercel

- El backend expone `src/server.ts` como `default export` de Hono.
- No usa `Bun.serve()`, `app.listen()` ni un servidor persistente manual.
- Vercel puede desplegarlo como funciones serverless sin cambiar los paths publicos actuales.

Configuracion recomendada:

- Framework Preset: `Hono`
- Install Command: `bun install`
- Build Command: `bun run build`
- Output Directory: dejar vacio

Comandos restringidos:

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:seed
```

Solo usarlos con aprobación explícita del equipo porque la base ya existe.

## Verificación

Después de cambios TypeScript:

```bash
bun run build
```

Cuando existan tests backend, la spec debe enlazarlos con `[@test]`.
