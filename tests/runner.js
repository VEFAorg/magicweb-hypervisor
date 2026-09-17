import assert from "node:assert";
import { computeEmbedding, cosineSimilarity, murmur32, chunkCode, VECTOR_DIM } from "../src/ai/embeddings.js";
import { classifyWorkload } from "../src/planes/classifier.js";

console.log("══════════════════════════════════════════════════════════");
console.log("▶ RUNNING MAGICWEB v3.2 AUTOMATED TEST SUITE");
console.log("══════════════════════════════════════════════════════════\n");

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${desc}\n    ${err.message}`);
  }
}

// 1. Vector Dimension Test
it("Vectors must be strictly 384 dimensions and L2-normalized", () => {
  const vec = computeEmbedding("export async function handleRequest()");
  assert.strictEqual(vec.length, VECTOR_DIM, `Expected ${VECTOR_DIM}, got ${vec.length}`);
  
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  assert(Math.abs(Math.sqrt(norm) - 1.0) < 0.001, "Vector must have unit length");
});

// 2. Cosine Similarity Semantic Test
it("Semantically related functions must exhibit high cosine similarity", () => {
  const v1 = computeEmbedding("function authenticateUser(jwtToken)");
  const v2 = computeEmbedding("export const verifyToken = (bearerJwt) => {}");
  const vUnrelated = computeEmbedding("const computeMatrixMultiplication = (dim) => {}");

  const simRel = cosineSimilarity(v1, v2);
  const simUnrel = cosineSimilarity(v1, vUnrelated);

  assert(simRel > simUnrel, `Expected simRel (${simRel}) > simUnrel (${simUnrel})`);
  assert(simRel > 0.05, "Related tokens should have significant score");
});

// 3. Code Chunking Bounds Test
it("Code chunker splits code across line boundaries within length limits", () => {
  const sampleCode = Array.from({ length: 50 }, (_, i) => `const line${i} = ${i * 42};`).join("\n");
  const chunks = chunkCode("test.js", sampleCode, 200);
  assert(chunks.length >= 2, "Should create multiple chunks");
  assert.strictEqual(chunks[0].startLine, 1);
});

// 4. Dual-Plane Classification Tests
it("Correctly classifies Rust WASI 0.3 component with WIT IDL", () => {
  const res = classifyWorkload([{ path: "wit/compute.wit" }, { path: "Cargo.toml" }, { path: "src/lib.rs" }]);
  assert.strictEqual(res.plane, "wasi");
  assert.strictEqual(res.runtime, "wasm");
});

it("Correctly classifies PHP Slim application to Linux Plane", () => {
  const res = classifyWorkload([{ path: "composer.json" }, { path: "public/index.php" }]);
  assert.strictEqual(res.plane, "linux");
  assert.strictEqual(res.runtime, "php");
});

it("Correctly classifies Node.js Express application to Linux Plane", () => {
  const res = classifyWorkload([{ path: "package.json" }, { path: "server.js" }]);
  assert.strictEqual(res.plane, "linux");
  assert.strictEqual(res.runtime, "node");
});

console.log("\n──────────────────────────────────────────────────────────");
console.log(`TOTAL: ${passed}/${total} tests passing.`);
console.log("══════════════════════════════════════════════════════════");

if (passed !== total) process.exit(1);
