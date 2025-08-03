// const EMBEDDING_MODEL = 'gemini-embedding-exp-03-07';  // 3072-dim
// const EMBEDDING_MODEL = 'text-embedding-004'; // 768 dims
const EMBEDDING_MODEL = 'gemini-embedding-001'; // 768 dims
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export interface TaskType {
  SEMANTIC_SIMILARITY: "SEMANTIC_SIMILARITY",
  CLASSIFICATION: "CLASSIFICATION",
  CLUSTERING: "CLUSTERING",
  RETRIEVAL_DOCUMENT: "RETRIEVAL_DOCUMENT",
  RETRIEVAL_QUERY: "RETRIEVAL_QUERY",
  QUESTION_ANSWERING: "QUESTION_ANSWERING",
  FACT_VERIFICATION: "FACT_VERIFICATION",
  CODE_RETRIEVAL_QUERY: "CODE_RETRIEVAL_QUERY",
}

export async function embed(text: string, taskType?: TaskType): Promise<number[]> {
  const url = `${GEMINI_BASE_URL}/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text }],
      },
      taskType: taskType || 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
    }),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(
      `Gemini error: ${payload.error?.message || res.statusText}`,
    );
  }

  return payload.embedding.values as number[];
}
