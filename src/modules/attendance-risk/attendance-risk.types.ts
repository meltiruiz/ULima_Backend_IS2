export type StudentRiskStatus = "impedido" | "en_riesgo";

export type AttendanceRiskRawRow = {
  code: string;
  full_name: string;
  current_level: number | null;
  absent_hours: string;
  total_section_hours: string;
};

export type StudentNotifyRow = {
  student_id: number;
  code: string;
  full_name: string;
  current_level: number | null;
  absent_hours: string;
  total_section_hours: string;
  course_name: string;
  section_code: string;
};

export type NotifyResult = {
  notified: number;
  message: string;
};

export type AttendanceRiskStudentResponse = {
  code: string;
  firstName: string;
  lastName: string;
  currentLevel: number | null;
  absentHours: number;
  totalHours: number;
  absencePercentage: number;
  status: StudentRiskStatus;
  missingFaltas: number | null;
};

export type AttendanceRiskSummary = {
  impedido: number;
  en_riesgo: number;
  total: number;
};

export type AttendanceRiskResponse = {
  students: AttendanceRiskStudentResponse[];
  summary: AttendanceRiskSummary;
};
