// Unit tests for aiService — pure functions tested directly, API functions tested with mocked GoogleGenAI.

// Mock @google/genai before any imports
const mockEmbedContent = jest.fn();
const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      embedContent: mockEmbedContent,
      generateContent: mockGenerateContent,
    },
  })),
}));

import { chunkText, cosineSimilarity } from '../src/services/aiService';

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== chunkText =====
  describe('chunkText', () => {
    it('should chunk text with default params', () => {
      const text = 'a'.repeat(100);
      const chunks = chunkText(text);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBe(50); // default maxChars
    });

    it('should return single chunk for short text', () => {
      const chunks = chunkText('hello');
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe('hello');
    });

    it('should respect custom maxChars and overlap', () => {
      const text = 'abcdefghijklmnopqrst'; // 20 chars
      const chunks = chunkText(text, 10, 5);
      // Step size = 10 - 5 = 5
      // Chunks: [0..10], [5..15], [10..20], [15..20]
      expect(chunks.length).toBe(4);
      expect(chunks[0]).toBe('abcdefghij');
      expect(chunks[1]).toBe('fghijklmno');
    });

    it('should handle empty string', () => {
      const chunks = chunkText('');
      expect(chunks).toEqual([]);
    });
  });

  // ===== cosineSimilarity =====
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    });

    it('should return 0 for mismatched lengths', () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it('should return 0 for empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('should return 0 for zero vectors', () => {
      expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
    });

    it('should return 0 when one vector is zero', () => {
      expect(cosineSimilarity([1, 2], [0, 0])).toBe(0);
    });

    it('should compute correct similarity for known vectors', () => {
      // cos([1,0], [1,1]) = 1 / (1 * sqrt(2)) ≈ 0.7071
      expect(cosineSimilarity([1, 0], [1, 1])).toBeCloseTo(0.7071, 3);
    });
  });

  // ===== generateEmbedding =====
  describe('generateEmbedding', () => {
    // Need fresh module for each test to reset the module-level aiClient
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
      // Re-setup the mock after resetModules
      jest.mock('@google/genai', () => ({
        GoogleGenAI: jest.fn().mockImplementation(() => ({
          models: {
            embedContent: mockEmbedContent,
            generateContent: mockGenerateContent,
          },
        })),
      }));
    });

    it('should return null when GEMINI_API_KEY is not set', async () => {
      delete process.env.GEMINI_API_KEY;
      const { generateEmbedding } = require('../src/services/aiService');
      const result = await generateEmbedding('hello');
      expect(result).toBeNull();
    });

    it('should return embedding when API key is set and call succeeds', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: [0.1, 0.2, 0.3] }],
      });

      const { generateEmbedding } = require('../src/services/aiService');
      const result = await generateEmbedding('hello', 'RETRIEVAL_DOCUMENT');
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it('should return null when embeddings response is empty', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockEmbedContent.mockResolvedValue({ embeddings: [] });

      const { generateEmbedding } = require('../src/services/aiService');
      const result = await generateEmbedding('hello');
      expect(result).toBeNull();
    });

    it('should throw when API call fails', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockEmbedContent.mockRejectedValue(new Error('API error'));

      const { generateEmbedding } = require('../src/services/aiService');
      await expect(generateEmbedding('hello')).rejects.toThrow('API error');
    });

    it('should return null when GoogleGenAI constructor throws', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      jest.resetModules();
      jest.mock('@google/genai', () => ({
        GoogleGenAI: jest.fn().mockImplementation(() => {
          throw new Error('Constructor error');
        }),
      }));

      const { generateEmbedding } = require('../src/services/aiService');
      const result = await generateEmbedding('hello');
      expect(result).toBeNull();
    });

    it('should use RETRIEVAL_QUERY task type', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: [0.5] }],
      });

      const { generateEmbedding } = require('../src/services/aiService');
      await generateEmbedding('query text', 'RETRIEVAL_QUERY');
      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: 'gemini-embedding-001',
        contents: 'query text',
        config: { taskType: 'RETRIEVAL_QUERY' },
      });
    });
  });

  // ===== rerankWithLLM =====
  describe('rerankWithLLM', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
      jest.mock('@google/genai', () => ({
        GoogleGenAI: jest.fn().mockImplementation(() => ({
          models: {
            embedContent: mockEmbedContent,
            generateContent: mockGenerateContent,
          },
        })),
      }));
    });

    it('should return empty array for empty candidates', async () => {
      const { rerankWithLLM } = require('../src/services/aiService');
      const result = await rerankWithLLM('query', []);
      expect(result).toEqual([]);
    });

    it('should return all IDs when no API key (fallback)', async () => {
      delete process.env.GEMINI_API_KEY;
      const { rerankWithLLM } = require('../src/services/aiService');
      const candidates = [
        { id: 'a', text: 'Apple' },
        { id: 'b', text: 'Banana' },
      ];
      const result = await rerankWithLLM('fruit', candidates);
      expect(result).toEqual(['a', 'b']);
    });

    it('should return filtered IDs from LLM response', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue({ text: '1,3' });

      const { rerankWithLLM } = require('../src/services/aiService');
      const candidates = [
        { id: 'a', text: 'Apple pie' },
        { id: 'b', text: 'Car parts' },
        { id: 'c', text: 'Cherry cake' },
      ];
      const result = await rerankWithLLM('dessert', candidates);
      expect(result).toEqual(['a', 'c']);
    });

    it('should return empty when LLM says "none"', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue({ text: 'none' });

      const { rerankWithLLM } = require('../src/services/aiService');
      const candidates = [{ id: 'a', text: 'Car parts' }];
      const result = await rerankWithLLM('dessert', candidates);
      expect(result).toEqual([]);
    });

    it('should return all IDs when LLM returns no digits', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue({ text: 'all of them' });

      const { rerankWithLLM } = require('../src/services/aiService');
      const candidates = [{ id: 'a', text: 'Apple' }];
      const result = await rerankWithLLM('fruit', candidates);
      expect(result).toEqual(['a']);
    });

    it('should return all IDs when LLM call throws (fallback)', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockGenerateContent.mockRejectedValue(new Error('API fail'));

      const { rerankWithLLM } = require('../src/services/aiService');
      const candidates = [{ id: 'a', text: 'Apple' }];
      const result = await rerankWithLLM('fruit', candidates);
      expect(result).toEqual(['a']);
    });

    it('should handle null/empty LLM response text', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue({ text: null });

      const { rerankWithLLM } = require('../src/services/aiService');
      const candidates = [{ id: 'a', text: 'Apple' }];
      const result = await rerankWithLLM('fruit', candidates);
      // text is null → '' → doesn't match 'none' → no digits → fallback returns all
      expect(result).toEqual(['a']);
    });

    it('should filter out-of-range indices', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue({ text: '1,5,0' }); // 5 and 0 are out of range

      const { rerankWithLLM } = require('../src/services/aiService');
      const candidates = [
        { id: 'a', text: 'Apple' },
        { id: 'b', text: 'Banana' },
      ];
      const result = await rerankWithLLM('fruit', candidates);
      expect(result).toEqual(['a']); // Only index 1 (0-based: 0) is valid
    });

    it('should return all IDs when GoogleGenAI constructor throws in rerank', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      jest.resetModules();
      jest.mock('@google/genai', () => ({
        GoogleGenAI: jest.fn().mockImplementation(() => {
          throw new Error('Constructor error');
        }),
      }));

      const { rerankWithLLM } = require('../src/services/aiService');
      const candidates = [{ id: 'a', text: 'Apple' }];
      const result = await rerankWithLLM('fruit', candidates);
      expect(result).toEqual(['a']);
    });
  });
});
