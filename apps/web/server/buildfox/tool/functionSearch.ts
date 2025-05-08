// scripts/src/queryDocs.ts

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE = "docs_embeddings";

async function listByPackage(pkg: string, limit = 10) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("file_path,package_name,updated_at")
    .eq("package_name", pkg)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  console.log(`\n📦  Files in package "${pkg}":`);
  console.table(data);
}

// const EMBEDDING_MODEL = 'gemini-embedding-exp-03-07';  // 3072-dim
const EMBEDDING_MODEL = "text-embedding-004"; // 768 dims
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function embed(text: string): Promise<number[]> {
  const url = `${GEMINI_BASE_URL}/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
      `Gemini error: ${payload.error?.message || res.statusText}`
    );
  }

  return payload.embedding.values as number[];
}

export async function semanticFunctionSearch(
  pkg: string,
  query: string,
  limit = 10
) {
  console.log(`\n🔍 Embedding query: "${query}"…`);
  const qEmb = await embed(query);
  console.log("🧠 Query embedding obtained");

  if (pkg === "*") {
    console.log("🌍 Global search (all packages)…");
    const { data, error } = await supabase.rpc("match_docs", {
      query_embedding: qEmb,
      k: limit,
    });
    if (error) throw error;
    console.log(`\n🎯 Top ${limit} global results for "${query}":`);
    console.table(
      data.map((r: any) => ({
        package_name: r.package_name,
        function_name: r.function_name,
        file_path: r.file_path,
        similarity: r.similarity,
      }))
    );
    return data;
  } else {
    let finalPkg = pkg;
    if (pkg.startsWith("@microfox/")) {
      finalPkg = pkg.slice(10);
    }
    console.log(`📦 Package search in "${finalPkg}"…`);
    const { data, error } = await supabase.rpc("match_docs_in_package", {
      query_embedding: qEmb,
      pkg_name: finalPkg,
      k: limit,
    });
    if (error) throw error;
    console.log(`\n🎯 Top ${limit} results for "${query}" in "${finalPkg}":`);
    console.table(
      data.map((r: any) => ({
        package_name: r.package_name,
        function_name: r.function_name,
        file_path: r.file_path,
        similarity: r.similarity,
      }))
    );
    return data;
  }
}
