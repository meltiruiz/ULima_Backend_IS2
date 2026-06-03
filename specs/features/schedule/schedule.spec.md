---
name: Schedule
description: Academic schedule, evaluations calendar mapping, and weekly load calculations.
targets:
  - ../../../src/modules/schedule/**
---

# Schedule

## User Stories

| ID | Description |
| --- | --- |
| US09 | Visualizar horario y evaluaciones del ciclo. |

## Business Rules

### BR-SCH-01: GET /schedule/me/sessions — Weekly class schedule
- Retorna el horario semanal agrupado por bloques de tiempo (Lunes a Domingo) para las secciones activas del estudiante.
- Formatea la hora de clase en `hora_inicio` y `hora_fin` (p. ej., "08:00 am") además de `inicio` y `fin` (p. ej., "08:00:00") para total compatibilidad con el frontend.
- Identifica dinámicamente la semana académica actual correspondiente a la fecha de hoy, poblando los textos de los días con sus fechas reales en español (p. ej., "12 de Enero") y la descripción de la semana (p. ej., "Semana 2 del ciclo").
- **Auth**: Bearer token (vía `authMiddleware`).

### BR-SCH-02: GET /schedule/me/assessments — Evaluation calendar
- Mapea las evaluaciones programadas en el sílabo a fechas reales del calendario.
- **Ecuación de fecha**: Dado que un examen está asignado a `week_number` (semana X) y la clase de esa sección se dicta en un día de la semana `day_of_week` (1 = Lunes, ..., 7 = Domingo), la fecha de la evaluación se calcula sumando la diferencia de días al inicio de esa semana académica:
  $$FechaExamen = WeekX.startDate + (day\_of\_week - 1) dias$$
- Si la sección tiene múltiples sesiones semanales (p. ej., Lunes y Miércoles), se asocia el examen a la primera sesión de esa semana para evitar duplicidades.
- **Auth**: Bearer token.

### BR-SCH-03: GET /schedule/me/load — Academic load calculation
- Calcula la carga de evaluaciones para cada semana académica activa del ciclo.
- **Alta Carga**: Si una semana académica tiene **3 o más evaluaciones**, se marca con `isHighLoad = true`.
- **Auth**: Bearer token.

- `GET /schedule/me/sessions` retorna `aula`/`salon` desde `schedule_session.classroom` por sesiÃ³n y `color` desde `schedule_session.color_hex`, permitiendo aulas distintas por dÃ­a y colores hex por curso.

## Endpoints

### GET /schedule/me/sessions
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
