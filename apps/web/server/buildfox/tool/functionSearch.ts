// scripts/src/queryDocs.ts

import { embed } from "@/utils/services/embeddings/geminiEmbed";
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
