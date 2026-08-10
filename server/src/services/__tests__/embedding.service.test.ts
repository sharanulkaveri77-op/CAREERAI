import { describe, expect, it } from '@jest/globals';
import { cosineSimilarity, generateEmbedding } from '../embedding.service';

describe('Embedding Service', () => {
  
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [0, 1];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      expect(cosineSimilarity(vec1, vec2)).toBe(-1);
    });

    it('should handle zero vectors gracefully by returning 0', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should return correct fractional similarity', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 1, 0];
      // dot product = 1
      // magA = 1
      // magB = sqrt(2) = 1.414
      // similarity = 1 / 1.414 = 0.707
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.707, 3);
    });
  });

  describe('generateEmbedding', () => {
    it('should return a fixed length mock embedding when no API key is provided', async () => {
      const text = "React TypeScript Node";
      const embedding = await generateEmbedding(text);
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(50); // mock embedding size
    });
    
    it('should produce identical embeddings for identical text in mock mode', async () => {
      const text1 = "React TypeScript Node";
      const text2 = "React TypeScript Node";
      const emb1 = await generateEmbedding(text1);
      const emb2 = await generateEmbedding(text2);
      expect(cosineSimilarity(emb1, emb2)).toBeCloseTo(1, 1);
    });
  });
});
