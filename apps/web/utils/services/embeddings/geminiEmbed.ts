// const EMBEDDING_MODEL = 'gemini-embedding-exp-03-07';  // 3072-dim
const EMBEDDING_MODEL = 'text-embedding-004'; // 768 dims
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function embed(text: string): Promise<number[]> {
  const url = `${GEMINI_BASE_URL}/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text }],
      },
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
