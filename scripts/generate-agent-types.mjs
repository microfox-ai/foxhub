import fs from "node:fs/promises";
import path from "node:path";
import openapiTS, { astToString } from "openapi-typescript";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY;

/**
 * A script to generate TypeScript types from an agent's OpenAPI schema.
 * It preprocesses the schema to remove any vendor extensions ('x-*')
 * from the components.schemas section, which can cause errors in openapi-typescript.
 *
 * Usage:
 * node scripts/generate-agent-types.mjs <agent-name> [output-file]
 *
 * Example:
 * node scripts/generate-agent-types.mjs sparkboard
 * node scripts/generate-agent-types.mjs sparkboard apps/web/components/subapps/sparkboard/sparkboard.d.ts
 */

async function getApiMcpsByPackageName(packageNames) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase
    .from("api_mcps")
    .select("*")
    .in("package_name", packageNames);
  if (error) {
    console.error("Error querying Supabase:", error);
    throw new Error(`Error finding similar packages: ${error.message}`);
  }
  if (!data || data.length === 0) {
    console.log("No similar packages found.");
    return [];
  }
  return data;
}

async function getAgentSchema(agentName) {
  const agents = await getApiMcpsByPackageName([agentName]);
  const agent = agents?.[0];

  if (!agent) {
    throw new Error(`Agent '${agentName}' not found.`);
  }

  // Prefer the schema from metadata if it exists
  if (agent.metadata?.docs_data) {
    console.log(`Using OpenAPI schema from metadata for agent '${agentName}'.`);
    return agent.metadata.docs_data;
  }

  // Fallback to fetching from URL
  if (agent.base_url) {
    const schemaUrl = new URL("/docs.json", agent.base_url).href;
    console.log(`Fetching OpenAPI schema from ${schemaUrl}...`);
    const response = await fetch(schemaUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch schema from ${schemaUrl}: ${response.status} ${response.statusText}`
      );
    }
    return await response.json();
  }

  throw new Error(
    `Could not retrieve OpenAPI schema for agent '${agentName}'. Neither metadata.docs_data nor a base_url is available.`
  );
}

async function generate() {
  const agentName = process.argv[2];
  let outputFile = process.argv[3];

  if (!agentName) {
    console.error(
      "Usage: node scripts/generate-agent-types.mjs <agent-name> [output-file]"
    );
    process.exit(1);
  }

  // If no output file is provided, create a default path
  if (!outputFile) {
    outputFile = path.join(
      "apps",
      "web",
      "components",
      "subapps",
      agentName,
      `${agentName}.d.ts`
    );
    console.log(`No output file specified. Using default: ${outputFile}`);
  }

  try {
    const schema = await getAgentSchema(agentName);

    // Pre-process the schema to remove problematic 'x-*' keys from components.schemas
    if (schema.components && schema.components.schemas) {
      for (const key in schema.components.schemas) {
        if (key.startsWith("x-")) {
          console.log(
            `Removing vendor extension from schema: '#/components/schemas/${key}'`
          );
          delete schema.components.schemas[key];
        }
      }
    }

    console.log("Generating TypeScript types...");
    const ast = await openapiTS(schema, {
      // You can add other openapi-typescript options here if needed
    });

    // Ensure the output directory exists
    const outputDir = path.dirname(outputFile);
    await fs.mkdir(outputDir, { recursive: true });

    // THE FIX: Import and use the `astToString` helper to convert the AST object.
    const fileContents = astToString(ast);
    await fs.writeFile(outputFile, fileContents);

    console.log(`✅ Successfully generated types at ${outputFile}`);
  } catch (error) {
    console.error("Error generating types:", error);
    process.exit(1);
  }
}

generate();
