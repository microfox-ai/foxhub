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

## License
MIT
`;
};
