export type ChatbotIntent =
  | "grades"
  | "schedule"
  | "curriculum"
  | "alerts"
  | "announcements"
  | "classmates"
  | "chat";

export interface ChatMessage {
  id: string;
  senderName: string;
  body: string;
  createdAt: number;
}

export interface ChatbotSessionRow {
  id: string;
  studentId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatbotMessageRow {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ScheduleData {
  dayName: string;
  startTime: string;
  endTime: string;
  courseName: string;
  sectionCode: string;
  classroom: string;
}

export interface AssessmentData {
  courseName: string;
  sectionCode: string;
  name: string;
  date: string;
  startTime: string;
  classroom: string;
}

export interface CurriculumData {
  courseName: string;
  cycle: number;
  status: string;
  credit: number;
}

export interface AlertData {
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface AnnouncementData {
  title: string;
  message: string;
  courseName: string;
  sectionCode: string;
  publishedAt: Date;
}

export interface ClassmateData {
  fullName: string;
  role: string;
}
