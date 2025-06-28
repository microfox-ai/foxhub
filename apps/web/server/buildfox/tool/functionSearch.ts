// scripts/src/queryDocs.ts

import { embed } from "@/utils/services/embeddings/geminiEmbed";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!;

const TABLE = "docs_embeddings";

async function listByPackage(pkg: string, limit = 10) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

export async function getPackageFunctions(
  pkg: string,
  type: "constructor" | "function" | "rule" | "all" | "main" = "all"
): Promise<
  {
    package: string;
    function: string;
    type: string;
    docs: string;
  }[]
> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const pkgName = pkg.startsWith("@microfox/")
    ? pkg
    : `@ext_${pkg.replaceAll("/", "#")}`;
  let packagesToSearch = [pkgName];

  // Fetch linked packages to search within them as well
  const { data: linkedData, error: linkedError } = await supabase
    .from("docs_embeddings")
    .select("linked_packages")
    .eq("package_name", pkgName)
    .limit(1);

  if (linkedError) {
    console.error(`Error fetching linked packages for ${pkg}:`, linkedError);
  } else if (
    linkedData &&
    linkedData.length > 0 &&
    linkedData[0]?.linked_packages
  ) {
    const linked = linkedData[0]?.linked_packages?.map((p: string) =>
      p.replace("@microfox/", "")
    );
    packagesToSearch.push(...linked);
  }
  const uniquePackagesToSearch = [...new Set(packagesToSearch)];
  console.log(
    `\n📚 Searching for docs in packages: ${uniquePackagesToSearch.join(", ")}`
  );

  console.log("\n🕵️  Checking doc counts per package...");
  for (const pkgName of uniquePackagesToSearch) {
    const { count, error } = await supabase
      .from("docs_embeddings")
      .select("*", { count: "exact", head: true })
      .eq("package_name", pkgName);
    if (error) {
      console.error(`Error counting docs for ${pkgName}:`, error.message);
    } else {
      console.log(`  - ${pkgName}: ${count} doc(s)`);
    }
  }

  const query = supabase
    .from("docs_embeddings")
    .select("*")
    .in("package_name", uniquePackagesToSearch);

  if (type !== "all") {
    query.eq("doc_type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching package functions:", error);
    return [];
  }

  console.log(`\nFound ${data.length} results.`);
  console.table(
    data.map((d) => ({
      package: d.package_name,
      function: d.function_name,
      type: d.doc_type,
      docs: d.doc_text,
      file_path: d.file_path,
    }))
  );

  return data;
}

export async function semanticFunctionSearch(
  pkg: string,
  query: string,
  type: "constructor" | "function" | "rule" | "all" | "main" = "all",
  limit = 10
): Promise<
  {
    package: string;
    function: string;
    type: string;
    docs: string;
    similarity: number;
    file_path: string;
  }[]
> {
  console.log(`\n🔍 Embedding query: "${query}"…`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const qEmb = await embed(query);
  console.log("🧠 Query embedding obtained");
  const doc_type_filter = type === "all" ? null : type;

  if (pkg === "*") {
    console.log("🌍 Global search (all packages)…");
    const { data, error } = await supabase.rpc("match_docs", {
      query_embedding: qEmb,
      k: limit,
      doc_type_filter,
    });
    if (error) throw error;
    console.log(`\n🎯 Top ${limit} global results for "${query}":`);
    if (data) {
      console.table(
        data.map((r: any) => ({
          package: r.package_name,
          function: r.function_name,
          similarity: r.similarity,
          docs: r.doc_text,
        }))
      );
    }
    return data;
  } else {
    const pkgName = pkg.startsWith("@microfox/")
      ? pkg
      : `@ext_${pkg.replaceAll("/", "#")}`;
    let packagesToSearch = [pkgName];

    // Fetch linked packages to search within them as well
    const { data: linkedData, error: linkedError } = await supabase
      .from("docs_embeddings")
      .select("linked_packages")
      .eq("package_name", pkgName)
      .limit(1);

    if (linkedError) {
      console.error(`Error fetching linked packages for ${pkg}:`, linkedError);
    } else if (
      linkedData &&
      linkedData.length > 0 &&
      linkedData[0]?.linked_packages
    ) {
      const linked = linkedData[0]?.linked_packages?.map((p: string) =>
        p.replace("@microfox/", "")
      );
      packagesToSearch.push(...linked);
    }

    const uniquePackagesToSearch = [...new Set(packagesToSearch)];
    console.log(`📦 Package search in: "${uniquePackagesToSearch.join(", ")}"`);

    const { data, error } = await supabase.rpc("match_docs_in_packages", {
      query_embedding: qEmb,
      pkg_names: uniquePackagesToSearch,
      k: limit,
      doc_type_filter,
    });
    if (error) throw error;
    console.log(
      `\n🎯 Top ${limit} results for "${query}" in relevant packages:`
    );
    if (data) {
      console.table(
        data.map((r: any) => ({
          package: r.package_name,
          function: r.function_name,
          similarity: r.similarity,
          docs: r.doc_text,
          file_path: r.file_path,
        }))
      );
    }
    return data;
  }
}
