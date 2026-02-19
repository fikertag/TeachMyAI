import { GoogleGenAI } from "@google/genai";

export async function embedTextGemini({
  contents,
  apiKey,
}: {
  contents: string[];
  apiKey?: string;
}) {
  const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;

  const ai = new GoogleGenAI(resolvedApiKey ? { apiKey: resolvedApiKey } : {});

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents,
  });

  if (!response.embeddings) {
    throw new Error("Gemini API did not return embeddings.");
  }

  return response.embeddings;
}
