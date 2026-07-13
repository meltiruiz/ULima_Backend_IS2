import { config } from "../config/app-config.js";

const COHERE_BASE = "https://api.cohere.com";

interface CohereChatResponse {
  message?: {
    content?: Array<{ type: string; text: string }>;
  };
  text?: string;
}

interface CohereClassifyResponse {
  classifications: Array<{
    input: string;
    prediction: string;
    confidence: number;
    labels: Record<string, { confidence: number }>;
  }>;
}

interface CohereRerankResponse {
  results: Array<{
    index: number;
    relevance_score: number;
  }>;
}

class CohereClient {
  private static instance: CohereClient;
  private apiKey: string;

  private constructor() {
    this.apiKey = config.chatbot.cohereApiKey;
  }

  public static getInstance(): CohereClient {
    if (!CohereClient.instance) {
      CohereClient.instance = new CohereClient();
    }
    return CohereClient.instance;
  }

  public async chat(
    message: string,
    model: string = "command-a-03-2025",
    options?: {
      preamble?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    const res = await fetch(`${COHERE_BASE}/v1/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        message,
        preamble: options?.preamble,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cohere Chat error ${res.status}: ${err}`);
    }

    const json = await res.json() as CohereChatResponse;
    return json.text ?? json.message?.content?.[0]?.text ?? "";
  }

  public async chatWithHistory(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    options?: {
      preamble?: string;
      temperature?: number;
      maxTokens?: number;
      signal?: AbortSignal;
    },
  ): Promise<string> {
    const last = messages[messages.length - 1];
    if (!last) return "";

    const chatHistory = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "CHATBOT" : "USER",
      message: m.content,
    }));

    const res = await fetch(`${COHERE_BASE}/v1/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: options?.signal,
      body: JSON.stringify({
        model: "command-a-03-2025",
        message: last.content,
        chat_history: chatHistory,
        preamble: options?.preamble,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cohere Chat error ${res.status}: ${err}`);
    }

    const json = await res.json() as CohereChatResponse;
    return json.text ?? json.message?.content?.[0]?.text ?? "";
  }

  public async classify(
    inputs: string[],
    examples: Array<{ text: string; label: string }>,
  ): Promise<
    Array<{
      input: string;
      labels: Record<string, { confidence: number }>;
    }>
  > {
    const res = await fetch(`${COHERE_BASE}/v1/classify`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embed-multilingual-v3.0",
        inputs,
        examples,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cohere Classify error ${res.status}: ${err}`);
    }

    const json = await res.json() as CohereClassifyResponse;
    return json.classifications.map((c) => ({
      input: c.input,
      labels: c.labels,
    }));
  }

  public async rerank(
    query: string,
    documents: string[],
    topN: number = 10,
  ): Promise<Array<{ index: number; score: number }>> {
    if (documents.length === 0) return [];

    const res = await fetch(`${COHERE_BASE}/v2/rerank`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "rerank-multilingual-v3.0",
        query,
        documents,
        top_n: topN,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cohere Rerank error ${res.status}: ${err}`);
    }

    const json = await res.json() as CohereRerankResponse;
    return json.results.map((r) => ({
      index: r.index,
      score: r.relevance_score,
    }));
  }

  public async generateTitle(question: string): Promise<string> {
    const prompt = `Genera un titulo breve (maximo 100 caracteres) en espanol para una conversacion de chatbot academico que empieza con esta pregunta: "${question}". Responde solo con el titulo, sin comillas ni explicaciones.`;

    const res = await fetch(`${COHERE_BASE}/v1/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command-a-03-2025",
        message: prompt,
        temperature: 0.7,
        max_tokens: 50,
      }),
    });

    if (!res.ok) {
      throw new Error(`Cohere title generation failed: ${res.status}`);
    }

    const json = await res.json() as CohereChatResponse;
    const title = (json.text ?? json.message?.content?.[0]?.text ?? "Nueva conversacion").trim();
    return title.length > 100 ? title.substring(0, 97) + "..." : title;
  }
}

export const cohereClient = CohereClient.getInstance();
