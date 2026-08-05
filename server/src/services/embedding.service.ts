// Define a fixed vocabulary of skills to create a deterministic mock embedding
const VOCABULARY = [
  'javascript', 'typescript', 'react', 'node', 'node.js', 'express', 'mongodb', 
  'sql', 'postgresql', 'python', 'django', 'flask', 'java', 'spring', 'c++', 
  'c#', '.net', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 
  'git', 'html', 'css', 'tailwind', 'sass', 'redux', 'graphql', 'rest api',
  'agile', 'scrum', 'machine learning', 'data science', 'pandas', 'numpy',
  'figma', 'ui/ux', 'linux', 'bash', 'go', 'rust', 'ruby', 'ruby on rails',
  'php', 'laravel', 'vue', 'angular', 'svelte'
];

/**
 * Generates a mock embedding vector by creating a bag-of-words representation
 * against a fixed vocabulary. This perfectly simulates the mathematical properties
 * needed to test cosine similarity without requiring a paid API.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const lowerText = text.toLowerCase();
  
  // Create a base vector of the vocabulary size, initialized to 0
  const vector = new Array(VOCABULARY.length).fill(0);
  
  // Set 1 for any skill found in the text
  VOCABULARY.forEach((skill, index) => {
    if (lowerText.includes(skill)) {
      vector[index] = 1;
    }
  });
  
  // Add some random noise to prevent identical scores and simulate real dense embeddings (optional but helps with ranking ties)
  const noisyVector = vector.map(val => val === 1 ? (0.8 + Math.random() * 0.2) : (Math.random() * 0.1));

  // Normalize the vector (divide by magnitude) so cosine similarity just becomes a dot product, 
  // but we'll do standard cosine similarity anyway.
  return noisyVector;
};

/**
 * Calculates the cosine similarity between two vectors.
 * Returns a value between -1 and 1 (or 0 and 1 for positive vectors like ours).
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must be of the same length');
  }

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
