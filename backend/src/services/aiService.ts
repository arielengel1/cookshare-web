import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export const generateEmbedding = async (
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'
): Promise<number[] | null> => {
  if (!aiClient) {
    try {
      if (process.env.GEMINI_API_KEY) {
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } else {
        console.warn("GEMINI_API_KEY is not set.");
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  try {
    const response = await aiClient.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: { taskType },
    });
    return response.embeddings?.[0]?.values || null;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const chunkText = (text: string, maxChars = 50, overlap = 25): string[] => {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + maxChars));
    i += maxChars - overlap;
  }
  return chunks;
};

// Cosine similarity between two vectors
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
