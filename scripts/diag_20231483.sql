-- Diagnostico para codigo 20231483 (read-only, no modifica nada)
-- Ejecutar con: psql "$DATABASE_URL" -f scripts/diag_20231483.sql

\echo '=== 1) Identificar al alumno por codigo ==='
SELECT au.code, au.id AS user_id, st.id AS student_id, au.full_name, ca.name AS career, st.current_level
FROM app_user au
JOIN student st ON st.user_id = au.id
JOIN career ca ON ca.id = st.career_id
WHERE au.code = '20231483';

\echo '=== 2) Periodo academico activo ==='
SELECT id, code, start_date, end_date, is_active
FROM academic_period
WHERE is_active = true;

\echo '=== 3) Semana actual (contiene HOY) y siguiente ==='
SELECT week_number, start_date, end_date
FROM academic_week
WHERE academic_period_id = (SELECT id FROM academic_period WHERE is_active = true LIMIT 1)
  AND end_date >= CURRENT_DATE
ORDER BY week_number
LIMIT 4;

\echo '=== 4) Matriculas activas del alumno ==='
SELECT e.id AS enrollment_id, e.section_id, s.code AS section_code, c.name AS course_name,
       co.id AS course_offering_id, ap.code AS period_code
FROM enrollment e
JOIN section s ON s.id = e.section_id
JOIN course_offering co ON co.id = s.course_offering_id
JOIN course c ON c.id = co.course_id
JOIN academic_period ap ON ap.id = co.academic_period_id
JOIN student st ON st.id = e.student_id
JOIN app_user au ON au.id = st.user_id
WHERE au.code = '20231483'
  AND e.status = 'active'
  AND ap.is_active = true;

\echo '=== 5) Evaluaciones del alumno (todas las del periodo activo) ==='
SELECT a.week_number, a.code AS assessment_code, a.name AS assessment_name,
       aw.start_date, c.name AS course_name, s.code AS section_code
FROM assessment a
JOIN syllabus sy ON sy.id = a.syllabus_id
JOIN course_offering co ON co.id = sy.course_offering_id
JOIN course c ON c.id = co.course_id
JOIN section s ON s.course_offering_id = co.id
JOIN enrollment e ON e.section_id = s.id AND e.status = 'active'
JOIN student st ON st.id = e.student_id
JOIN app_user au ON au.id = st.user_id
JOIN academic_period ap ON ap.id = co.academic_period_id
JOIN academic_week aw ON aw.academic_period_id = ap.id AND aw.week_number = a.week_number
WHERE au.code = '20231483'
  AND ap.is_active = true
ORDER BY aw.start_date, a.code;

\echo '=== 6) Evaluaciones de la semana actual ± 1 (lo que el chatbot recibira) ==='
SELECT a.week_number, a.code AS assessment_code, a.name AS assessment_name,
       aw.start_date, aw.end_date, c.name AS course_name, s.code AS section_code
FROM assessment a
JOIN syllabus sy ON sy.id = a.syllabus_id
JOIN course_offering co ON co.id = sy.course_offering_id
JOIN course c ON c.id = co.course_id
JOIN section s ON s.course_offering_id = co.id
JOIN enrollment e ON e.section_id = s.id AND e.status = 'active'
JOIN student st ON st.id = e.student_id
JOIN app_user au ON au.id = st.user_id
JOIN academic_period ap ON ap.id = co.academic_period_id
JOIN academic_week aw ON aw.academic_period_id = ap.id AND aw.week_number = a.week_number
WHERE au.code = '20231483'
  AND ap.is_active = true
  AND aw.week_number BETWEEN
    (SELECT week_number FROM academic_week
     WHERE academic_period_id = ap.id
       AND CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1) - 1
    AND
    (SELECT week_number FROM academic_week
     WHERE academic_period_id = ap.id
       AND CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1) + 1
ORDER BY aw.start_date, a.code;
