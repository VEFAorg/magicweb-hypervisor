// src/ai/embeddings.js
// MagicWeb v3.2 Semantic Embeddings & Math

export const VECTOR_DIM = 384;

// 32-bit MurmurHash3 variant for fast deterministic projection
export function murmur32(key, seed = 0) {
  let h = seed ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

// Synonyms & semantic clusters to bridge vocabulary gaps without 50MB model download
const SEMANTIC_CLUSTERS = {
  auth: ["auth", "authenticate", "authentication", "login", "jwt", "bearer", "token", "password", "claims", "session"],
  billing: ["billing", "invoice", "payment", "ledger", "price", "cents", "charge", "checkout", "stripe"],
  compute: ["compute", "matmul", "matrix", "linear", "algebra", "multiply", "calculation", "wasi", "simd"],
  network: ["http", "request", "response", "fetch", "router", "route", "endpoint", "url", "port"],
  data: ["database", "postgres", "sql", "datastore", "record", "query", "indexeddb", "storage"]
};

/**
 * Encodes text into an L2-normalized 384-dimensional vector.
 * Maps lexical tokens and concept clusters into vector space.
 */
export function computeEmbedding(text) {
  const vec = new Float32Array(VECTOR_DIM);
  const clean = text.toLowerCase();
  const rawTokens = clean.split(/[^a-z0-9_$/.-]+/g).filter(t => t.length > 1);

  if (rawTokens.length === 0) {
    return Array.from(vec);
  }

  // Token expansion via semantic clusters
  const tokens = [...rawTokens];
  for (const t of rawTokens) {
    for (const [cluster, words] of Object.entries(SEMANTIC_CLUSTERS)) {
      if (words.some(w => t.includes(w) || w.includes(t))) {
        tokens.push(`__concept_${cluster}__`);
      }
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const weight = 1.0 / Math.sqrt(i + 1);

    const h1 = murmur32(token, 0x1a3b) % VECTOR_DIM;
    const h2 = murmur32(token, 0x5c7d) % VECTOR_DIM;
    const h3 = murmur32(token, 0x9e1f) % VECTOR_DIM;

    vec[h1] += weight * 1.0;
    vec[h2] += weight * 0.65;
    vec[h3] -= weight * 0.35;

    // Bigram context
    if (i + 1 < tokens.length) {
      const bigram = `${token}_${tokens[i + 1]}`;
      const hb = murmur32(bigram, 0x42ef) % VECTOR_DIM;
      vec[hb] += weight * 0.85;
    }
  }

  // L2 Normalization
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;

  const result = new Array(VECTOR_DIM);
  for (let i = 0; i < VECTOR_DIM; i++) {
    result[i] = vec[i] / norm;
  }
  return result;
}

/**
 * Computes cosine similarity between two normalized vectors
 */
export function cosineSimilarity(vecA, vecB) {
  const len = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Splits source file text into manageable semantic code chunks
 */
export function chunkCode(filePath, content, maxChunkLen = 800) {
  const lines = content.split("\n");
  const chunks = [];
  let buffer = [];
  let startLine = 1;
  let currentLen = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push({
      path: filePath,
      startLine: startLine,
      text: buffer.join("\n").slice(0, maxChunkLen * 2)
    });
    buffer = [];
    currentLen = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (currentLen + line.length > maxChunkLen && buffer.length > 0) {
      flush();
      startLine = i + 1;
    }
    buffer.push(line);
    currentLen += line.length + 1;
  }
  flush();

  return chunks.slice(0, 32);
}
