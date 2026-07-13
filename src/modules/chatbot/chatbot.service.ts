import { cohereClient } from "../../services/cohere.client.js";
import { ChatbotRepository } from "./chatbot.repository.js";
import { classifyByKeywords, classifyWithCohere } from "./intent-classifier.js";
import { buildContext } from "./context-builder.js";
import { searchChatMessages } from "./chat-search.js";
import type { ChatbotIntent, ChatbotMessageRow, ChatbotSessionRow } from "./chatbot.types.js";
import type { AskInput } from "./chatbot.schemas.js";

const CLASSIFY_TIMEOUT_MS = 500;

export class ChatbotService {
  constructor(
    private readonly repository: ChatbotRepository,
  ) {}

  async createSession(studentId: number): Promise<ChatbotSessionRow> {
    return this.repository.createSession(studentId);
  }

  async listSessions(studentId: number): Promise<ChatbotSessionRow[]> {
    return this.repository.listSessions(studentId);
  }

  async getSession(sessionId: string, studentId: number): Promise<{ session: ChatbotSessionRow; messages: ChatbotMessageRow[] } | null> {
    const session = await this.repository.findSessionById(sessionId, studentId);
    if (!session) return null;
    const messages = await this.repository.getMessages(sessionId);
    return { session, messages };
  }

  async deleteSession(sessionId: string, studentId: number): Promise<boolean> {
    return this.repository.deleteSession(sessionId, studentId);
  }

  async ask(sessionId: string, studentId: number, input: AskInput): Promise<{ answer: string; sessionId: string }> {
    const session = await this.repository.findSessionById(sessionId, studentId);
    if (!session) {
      throw Object.assign(new Error("SESSION_NOT_FOUND"), { statusCode: 404 });
    }

    await this.repository.saveMessage(sessionId, "user", input.question);
    await this.repository.touchSession(sessionId);

    const intents = await this.classifyIntent(input.question);
    const history = await this.repository.getMessages(sessionId);
    const studentInfo = await this.repository.getStudentInfo(studentId);

    const [
      scheduleData,
      curriculumData,
      alertsData,
      announcementsData,
      classmatesData,
      chatSearchResults,
    ] = await Promise.all([
      intents.includes("schedule") ? this.getScheduleData(studentId) : Promise.resolve(null),
      intents.includes("curriculum") ? this.getCurriculumData(studentId) : Promise.resolve(null),
      intents.includes("alerts") ? this.getAlertsData(studentId) : Promise.resolve(null),
      intents.includes("announcements") ? this.getAnnouncementsData(studentId) : Promise.resolve(null),
      intents.includes("classmates") ? this.getClassmatesData(studentId) : Promise.resolve(null),
      intents.includes("chat") ? this.getChatResults(studentId, input.question) : Promise.resolve(null),
    ]);

    const { preamble, message: contextMessage } = buildContext({
      studentName: studentInfo?.fullName ?? "Alumno",
      careerName: studentInfo?.careerName ?? "Desconocida",
      currentLevel: studentInfo?.currentLevel ?? null,
      history,
      intents,
      scheduleData,
      curriculumData,
      alertsData,
      announcementsData,
      classmatesData,
      chatSearchResults,
      localGrades: input.localGrades,
      question: input.question,
    });

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000);

    let answer: string;
    try {
      const historyMessages = history.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      answer = await cohereClient.chatWithHistory(
        [...historyMessages, { role: "user", content: contextMessage }],
        {
          preamble,
          temperature: 0.3,
          maxTokens: 1000,
          signal: abortController.signal,
        },
      );
    } catch (error) {
      clearTimeout(timeout);
      const cohereErr = error instanceof Error ? error.message : String(error);
      console.error("Cohere Chat error:", cohereErr);
      throw Object.assign(new Error("CHATBOT_UNAVAILABLE"), { statusCode: 503 });
    }
    clearTimeout(timeout);

    await this.repository.saveMessage(sessionId, "assistant", answer);
    await this.repository.touchSession(sessionId);

    const isFirstMessage = history.filter((m) => m.role === "user").length === 1;
    if (isFirstMessage) {
      try {
        const title = await cohereClient.generateTitle(input.question);
        await this.repository.updateSessionTitle(sessionId, title);
      } catch {
        // Keep default title
      }
    }

    return { answer, sessionId };
  }

  private async classifyIntent(question: string): Promise<ChatbotIntent[]> {
    try {
      const result = await Promise.race([
        classifyWithCohere(question, cohereClient),
        new Promise<ChatbotIntent[]>((resolve) =>
          setTimeout(() => resolve(classifyByKeywords(question)), CLASSIFY_TIMEOUT_MS),
        ),
      ]);
      return result;
    } catch {
      return classifyByKeywords(question);
    }
  }

  private async getScheduleData(studentId: number) {
    const [sessions, assessments] = await Promise.all([
      this.repository.getSchedule(studentId),
      this.repository.getAssessments(studentId),
    ]);
    return { sessions, assessments };
  }

  private async getCurriculumData(studentId: number) {
    return this.repository.getCurriculum(studentId);
  }

  private async getAlertsData(studentId: number) {
    return this.repository.getAlerts(studentId);
  }

  private async getAnnouncementsData(studentId: number) {
    return this.repository.getAnnouncements(studentId);
  }

  private async getClassmatesData(studentId: number) {
    return this.repository.getClassmates(studentId);
  }

  private async getChatResults(studentId: number, question: string) {
    const sectionDetails = await this.repository.getActiveSectionDetails(studentId);
    if (sectionDetails.length === 0) return null;
    const results = await searchChatMessages(question, sectionDetails);
    return results.length > 0 ? results : null;
  }
}
