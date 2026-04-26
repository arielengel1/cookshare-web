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

// LLM re-ranking: filters embedding results by actual contextual relevance
export const rerankWithLLM = async (
  query: string,
  candidates: { id: string; text: string }[]
): Promise<string[]> => {
  if (!candidates.length) return [];
  if (!aiClient) {
    try {
      if (process.env.GEMINI_API_KEY) {
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } else {
        return candidates.map(c => c.id); // fallback: return all
      }
    } catch {
      return candidates.map(c => c.id);
    }
  }

  const numbered = candidates.map((c, i) => `${i + 1}. "${c.text}"`).join('\n');
  const prompt = `You are a search relevance judge for a recipe app.

User query: "${query}"

Candidate results:
${numbered}

Return ONLY the numbers of results that are genuinely relevant to the query, as a comma-separated list (e.g. "1,3").
If a result contradicts the query intent (e.g. "adults only" when searching for children, or completely unrelated topics), exclude it.
If no results are relevant, return "none".`;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    const text = response?.text?.trim() || '';
    
    if (text.toLowerCase() === 'none') return [];
    
    const indices = text.match(/\d+/g);
    if (!indices) return candidates.map(c => c.id);
    
    return indices
      .map(n => parseInt(n) - 1)
      .filter(i => i >= 0 && i < candidates.length)
      .map(i => candidates[i].id);
  } catch (err: any) {
    console.error('[LLM Rerank] Failed:', err?.message, err?.status, err?.statusText);
    return candidates.map(c => c.id); // fallback: return all
  }
};
