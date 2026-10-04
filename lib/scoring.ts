import { cosineSimilarity } from './embeddings';

export interface ScoreBreakdown {
  rawRelevance: number;      // 0.000 to 1.000 (Cosine similarity)
  decayMultiplier: number;   // Recency decay factor based on age & lambda
  finalScore: number;        // Blended score
  ageInHours: number;        // Age in hours
}

/**
 * Calculates hybrid score based on PRD FR-3.3:
 * Score = S_cosine(V_user, V_post) * (1 / (Age in Hours + 2))^lambda
 * 
 * @param userEmbedding Vector embedding of user interest lens
 * @param postEmbedding Vector embedding of post (title + summary)
 * @param publishedAt ISO timestamp string or Date of publication
 * @param lambda Freshness decay factor (default: 0.35, range 0.0 to 1.0)
 * @param now Reference timestamp (default: Date.now())
 */
export function calculateHybridScore(
  userEmbedding: number[] | null,
  postEmbedding: number[] | null,
  publishedAt: string | Date,
  lambda: number = 0.35,
  now: number = Date.now()
): ScoreBreakdown {
  // If no embeddings, provide fallback relevance
  let rawRelevance = 0.5;
  if (userEmbedding && postEmbedding && userEmbedding.length > 0 && postEmbedding.length > 0) {
    rawRelevance = cosineSimilarity(userEmbedding, postEmbedding);
  }

  // Calculate age in hours
  const publishedTime = new Date(publishedAt).getTime();
  const ageMs = Math.max(0, now - publishedTime);
  const ageInHours = parseFloat((ageMs / (1000 * 60 * 60)).toFixed(1));

  // Age decay factor: (1 / (Age + 2))^lambda
  // To keep scores intuitive (e.g. 0.0 - 1.0), we normalize by (1 / 2)^lambda
  // so that an article published right now has decayMultiplier = 1.0
  const baseDecay = Math.pow(1 / (ageInHours + 2), lambda);
  const maxDecay = Math.pow(1 / 2, lambda);
  const normalizedDecay = baseDecay / maxDecay;

  // Hybrid score blending
  const finalScore = parseFloat((rawRelevance * normalizedDecay).toFixed(4));

  return {
    rawRelevance: parseFloat(rawRelevance.toFixed(3)),
    decayMultiplier: parseFloat(normalizedDecay.toFixed(3)),
    finalScore,
    ageInHours,
  };
}
