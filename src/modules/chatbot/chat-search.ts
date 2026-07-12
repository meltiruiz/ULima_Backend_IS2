import { firebaseService } from "../../services/firebase.service.js";
import { cohereClient } from "../../services/cohere.client.js";

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

      const bodies = messages.map((m) => m.body);
      const rerankResults = await cohereClient.rerank(question, bodies, 10);

      const relevantMessages = rerankResults
        .filter((r) => r.score > 0.3)
        .sort((a, b) => a.index - b.index)
        .map((r) => messages[r.index]);

      if (relevantMessages.length > 0) {
        results.push({
          sectionName: `${section.courseName} (${section.sectionCode})`,
          messages: relevantMessages.map((m) => ({
            senderName: m.senderName,
            body: m.body,
            createdAt: m.createdAt,
          })),
        });
      }
    } catch (error) {
      console.warn(`Failed to search chat for section ${section.sectionId}:`, error);
    }
  }

  return results;
}

function filterSections(
  question: string,
  sections: Array<{ sectionId: number; courseName: string; sectionCode: string }>,
) {
  const lower = question.toLowerCase();
  const mentioned = sections.filter(
    (s) => lower.includes(s.courseName.toLowerCase()) || lower.includes(s.sectionCode.toLowerCase()),
  );
  return mentioned.length > 0 ? mentioned : sections.slice(0, 3);
}
