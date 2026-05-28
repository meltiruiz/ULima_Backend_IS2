# Feature Index

This index connects real user stories, product requirements, backend modules, and specs.

| Priority | Feature | Spec | User Stories | Requirements | Backend target | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Auth | `specs/features/auth/auth.spec.md` | US01, US02 | R1, R2, RNF6, RNF7 | `src/modules/auth` | Rewrite first; architecture scaffold ready, endpoint implementation pending |
| 2 | Academic Profile | `specs/features/academic-profile/academic-profile.spec.md` | US05 | R12, R13 | `src/modules/academic-profile` | Rewrite second; architecture scaffold ready, endpoint implementation pending |
| 3 | Curriculum | `specs/features/curriculum/curriculum.spec.md` | US03, US04 | R4, R5, R10, R11 | `src/modules/curriculum` | Rewrite third; architecture scaffold ready, endpoint implementation pending |
| 4 | Grades | `specs/features/grades/grades.spec.md` | US06, US07 | R6, R9 | `src/modules/grades` | Rewrite fourth; architecture scaffold ready, endpoint implementation pending |
| 5 | Schedule | `specs/features/schedule/schedule.spec.md` | US09 | R19 | `src/modules/schedule` | Rewrite fifth; architecture scaffold ready, endpoint implementation pending |
| 6 | Course Detail | `specs/features/course-detail/course-detail.spec.md` | US13, US14 | R20 | `src/modules/course-detail` | Rewrite sixth; architecture scaffold ready, endpoint implementation pending |
| 7 | Alerts | `specs/features/alerts/alerts.spec.md` | US15 | R15, R16, R22, R23 | `src/modules/alerts` | Rewrite seventh; architecture scaffold ready, endpoint implementation pending |
| 8 | Section Management | `specs/features/section-management/section-management.spec.md` | US16, US17, US18 | R14, R17, R18, R21 | `src/modules/section-management` | Rewrite eighth; architecture scaffold ready, endpoint implementation pending |

## Workflow

1. Read `KNOWLEDGE.md` and this index before updating a spec.
2. Update or create the feature spec before code changes.
3. Confirm API contract changes in `docs/specs/api-contracts.md`.
4. Implement inside the module named in the spec `targets` using `routes -> controller -> service -> repository`.
5. Add tests and link them from the spec using `[@test]`.
6. Review the implementation against the spec before closing the task.

## Data Rules

- PostgreSQL is definitive.
- Do not use frontend JSON files as backend data.
- Do not run migrations, push, generate, or seed without explicit approval.
- Include `src/db/schema/schema.ts` in targets only for an approved database change.
- Include `src/events/**` in targets only when implementing real observers or event contracts.
