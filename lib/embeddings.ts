// Dense semantic embedding engine supporting built-in zero-dependency vectorization and optional OpenAI embedding API

export const VECTOR_DIMENSION = 384;

// Stop words to filter out for semantic vectorization
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing',
  'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in',
  'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s',
  'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
  'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t',
  'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
  'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
  'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself',
  'yourselves'
]);

// Deterministic hashing helper for feature hashing into fixed dimensional vector
function hashString(str: string, seed: number = 0): number {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Tokenize text into words, bi-grams, and character n-grams for semantic capture
export function tokenize(text: string): { tokens: string[]; ngrams: string[] } {
  const clean = text
    .toLowerCase()
    .replace(/[^\w\s\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean
    .split(' ')
    .map(w => w.replace(/^[\.-]+|[\.-]+$/g, ''))
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  const ngrams: string[] = [];

  // Add word bigrams
  for (let i = 0; i < words.length - 1; i++) {
    ngrams.push(`${words[i]}_${words[i + 1]}`);
  }

  // Add character 3-5 subgrams for compound technical words (e.g. 'concurrency', 'ebpf', 'lsm')
  for (const word of words) {
    if (word.length >= 3) {
      for (let len = 3; len <= Math.min(5, word.length); len++) {
        for (let i = 0; i <= word.length - len; i++) {
          ngrams.push(`_sub_${word.substring(i, i + len)}`);
        }
      }
    }
  }

  return { tokens: words, ngrams };
}

/**
 * Generate a dense L2-normalized 384-dimensional vector from text using feature hashing
 * and subword semantic projection.
 */
export function generateLocalEmbedding(text: string): number[] {
  const vec = new Float64Array(VECTOR_DIMENSION);
  const { tokens, ngrams } = tokenize(text);

  if (tokens.length === 0 && ngrams.length === 0) {
    return Array.from(vec);
  }

  // 1. Single word features (weight 1.0)
  for (const token of tokens) {
    const idx = hashString(token, 42) % VECTOR_DIMENSION;
    const sign = (hashString(token, 1337) % 2 === 0) ? 1 : -1;
    // Extra boost for technical jargon
    const boost = token.length > 5 ? 1.4 : 1.0;
    vec[idx] += sign * boost;
  }

  // 2. Bigram features (weight 1.5 - high semantic phrase value)
  for (const ngram of ngrams) {
    if (!ngram.startsWith('_sub_')) {
      const idx = hashString(ngram, 99) % VECTOR_DIMENSION;
      const sign = (hashString(ngram, 777) % 2 === 0) ? 1 : -1;
      vec[idx] += sign * 1.5;
    } else {
      // Subword features (weight 0.4 - structural morphological similarity)
      const idx = hashString(ngram, 23) % VECTOR_DIMENSION;
      const sign = (hashString(ngram, 88) % 2 === 0) ? 1 : -1;
      vec[idx] += sign * 0.4;
    }
  }

  // 3. Normalize vector to unit length (L2 norm)
  let normSq = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    normSq += vec[i] * vec[i];
  }

  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

/**
 * Compute Cosine Similarity between two L2-normalized vectors.
 * Since vectors are normalized, dot product == cosine similarity.
 * Returns a score between 0.0 and 1.0 (clamped).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }

  // Cosine of similarity is typically in [-1, 1].
  // We map it to [0, 1] for relevance percentage: (dot + 1) / 2 or max(0, dot)
  // In search scoring, max(0, dot) or clamped positive works best:
  const sim = Math.max(0, Math.min(1, (dot + 0.1) / 1.1));
  return parseFloat(sim.toFixed(4));
}

/**
 * Universal embedding generator that supports OpenAI API if configured,
 * otherwise falls back seamlessly to the fast local dense semantic vectorizer.
 */
export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    return new Array(VECTOR_DIMENSION).fill(0);
  }

  const key = apiKey || process.env.OPENAI_API_KEY;
  if (key && key.startsWith('sk-')) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-ID': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: trimmed.substring(0, 8000),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].embedding) {
          return data.data[0].embedding;
        }
      }
    } catch (err) {
      console.warn('OpenAI embedding failed, falling back to local embedding:', err);
    }
  }

  // Default to built-in high-performance local semantic vectorizer
  return generateLocalEmbedding(trimmed);
}
