# Instrucciones Para Agentes Backend

Este repositorio usa Tessl con Spec Driven Development. No implementes comportamiento nuevo sin spec aprobada.

## Contexto Obligatorio

- Backend: Bun, TypeScript, Hono, Drizzle ORM, PostgreSQL, Zod, JWT y bcryptjs.
- Frontend consumidor: Flutter, Dart, GetX y `shared_preferences`.
- Base de datos: PostgreSQL definitivo ya creado. No crear tablas ni insertar datos mock.
- `src/db/schema/schema.ts` ya representa el esquema definitivo.
- `src/events` queda como infraestructura base sin observers de negocio implementados.
- `src/modules/**` está preparado para implementar feature por feature.
- Contrato REST local: `docs/specs/api-contracts.md`.

## Flujo Obligatorio

1. Lee `.tessl/RULES.md`.
2. Lee `KNOWLEDGE.md`.
3. Lee `docs/specs/workflow.md` y `docs/specs/feature-index.md`.
4. Ubica la spec en `specs/features/<feature>/<feature>.spec.md`.
5. Si la spec no existe o no cubre el cambio, actualízala primero.
6. Si hay API nueva o cambiada, actualiza `docs/specs/api-contracts.md`.
7. Espera aprobación explícita de la spec.
8. Implementa solo archivos incluidos en `targets`.
9. Ejecuta `bun run build`.
10. Si agregas tests, enlázalos en la spec con `[@test]`.

## Reglas De Base De Datos

- No ejecutar `bun run db:push`, `bun run db:migrate`, `bun run db:generate` ni `bun run db:seed` sin aprobación explícita.
- No subir JSON del frontend a PostgreSQL.
- No escribir seed ni inserts manuales para completar datos faltantes.
- Si faltan datos en PostgreSQL, reporta el dato faltante; no uses mocks como fallback.
- No agregues columnas/tablas nuevas sin spec aprobada y aprobación de cambio de BD.

## Reglas De Implementación

- Usa `routes -> controller -> service -> repository`.
- Usa Zod para validar body, params y query.
- Controllers adaptan HTTP; services contienen reglas; repositories consultan PostgreSQL.
- Los services reciben repositories y `EventBus`; no importan `db` directamente.
- Los repositories pueden usar Drizzle schema o SQL parametrizado con Drizzle.
- No exponer `password_hash`, tokens, secretos ni variables `.env`.
- No agregar Facade, Generic Repository, Service Locator ni framework DI salvo que la spec lo pida.

## Reglas De Dominio

- App centrada en estudiantes: no hay admin screens ni teacher login.
- `teacher` es dato referencial para secciones y asesorías.
- Roles válidos: `student`, `delegate`, `subdelegate`.
- Representantes se derivan desde `section_representative`.
- `student_score` contiene notas personales no oficiales.
- Alertas `academic_risk` usan solo promedio personal: avance evaluado > 55% y promedio < 10.5.
- Alertas `high_load` usan 3+ evaluaciones en una misma semana académica.
- `student_course_progress` es progreso real de malla.
- `student_curriculum_simulation` no debe modificar matrícula, notas ni progreso real.

## Targets En Specs

Incluye targets precisos:

- Feature normal: `../../../src/modules/<feature>/**`.
- Auth compartido: agrega `../../../src/shared/middleware/auth-middleware.ts` si aplica.
- Eventos: agrega `../../../src/events/**` solo si la spec implementa observers/eventos reales.
- Schema: agrega `../../../src/db/schema/schema.ts` solo si hay cambio aprobado de modelo.

## Verificación

- Siempre correr `bun run build` tras cambios TS.
- Reportar warnings o errores preexistentes por separado.
- No terminar una feature si spec, contrato e implementación no coinciden.

# Agent Rules <!-- tessl-managed -->

@.tessl/RULES.md follow the [instructions](.tessl/RULES.md)
