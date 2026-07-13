import { firebaseService } from "../../services/firebase.service.js";

export interface ChatSearchResult {
  sectionName: string;
  messages: Array<{
    senderName: string;
    body: string;
    createdAt: number;
  }>;
}

export async function searchChatMessages(
  question: string,
  sectionDetails: Array<{ sectionId: number; courseName: string; sectionCode: string }>,
): Promise<ChatSearchResult[]> {
  const results: ChatSearchResult[] = [];

  const matchedSections = filterSections(question, sectionDetails);

  for (const section of matchedSections) {
    try {
      const messages = await firebaseService.getRecentMessages(section.sectionId, 200);

      if (messages.length === 0) continue;

      results.push({
        sectionName: `${section.courseName} (${section.sectionCode})`,
        messages: messages.map((m) => ({
          senderName: m.senderName,
          body: m.body,
          createdAt: m.createdAt,
        })),
      });
    } catch (error) {
      console.warn(`Failed to search chat for section ${section.sectionId}:`, error);
    }
  }

  return results;
}

export function filterSections(
  question: string,
  sections: Array<{ sectionId: number; courseName: string; sectionCode: string }>,
): Array<{ sectionId: number; courseName: string; sectionCode: string }> {
  const lower = question.toLowerCase();
  const mentioned = sections.filter((s) => {
    if (lower.includes(s.sectionCode.toLowerCase())) return true;
    if (lower.includes(s.courseName.toLowerCase())) return true;
    const tokens = s.courseName
      .toLowerCase()
      .split(/[^a-záéíóúñü0-9]+/)
      .filter((t) => t.length > 3 && !/^(ii|iii|iv|vi|vii|viii|ix|x)$/i.test(t));
    return tokens.some((t) => lower.includes(t));
  });
  return mentioned.length > 0 ? mentioned : sections.slice(0, 3);
}
