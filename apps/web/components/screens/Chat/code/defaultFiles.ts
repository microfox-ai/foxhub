import { ClientSecretVariable } from "@/server/types";
import { ClientRequest } from "@prisma/client";

export const generateDefaultEnvFile = (variables: ClientSecretVariable[]) => {
  return variables
    .map(
      (variable: ClientSecretVariable) => `${variable.key}=${variable.value}`
    )
    .join("\n");
};

export const generateDefaultReadmeFile = (request: ClientRequest) => {
  return `# ${request.title}

This is a README file for the ${request.repoName} repository.

## Usage

\`\`\`bash
cd ${request.requestDir}
npm install
npm run build
\`\`\`

## Code Syntax Rules

1. all functions must be exported in index.ts file & also shpuld match in serverless.yml file.
2. all function must export OPEN Api Docs respective to them.
3. imports of helper functions should always follow the format of .js ending.

## Commit Changes
Commit Message Must start with \`updatefox:\`

\`\`\`bash
git add .
git commit -m "updatefox: add ${request.title}"
git push
\`\`\`

## License
MIT
`;
};

export const generateDefaultEnvJsonFile = (
  variables: ClientSecretVariable[]
) => {
  const envObject = variables.reduce(
    (acc, variable) => {
      acc[variable.key] = variable.value;
      return acc;
    },
    {} as Record<string, string>
  );

  return JSON.stringify(envObject, null, 2);
};
