import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

try {
  const awsAccessKeyId = process.env.AGENT_AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AGENT_AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AGENT_AWS_REGION;

  if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion) {
    console.error(`Error: AWS credentials (AGENT_AWS_ACCESS_KEY_ID, AGENT_AWS_SECRET_ACCESS_KEY, AGENT_AWS_REGION) not found in vault for ${environment}.`);
    process.exit(1);
  }

  const jsonConfigPath = path.resolve(process.cwd(), 'env.json');
  const envConfig = {};
  const excludeKeys = ['AGENT_AWS_ACCESS_KEY_ID', 'AGENT_AWS_SECRET_ACCESS_KEY', 'AGENT_AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_DEFAULT_REGION'];

  for (const key in process.env) {
    if (!excludeKeys.includes(key)) {
      envConfig[key] = process.env[key];
    }
  }

  fs.writeFileSync(jsonConfigPath, JSON.stringify(envConfig, null, 2));

  console.log(`Successfully created env.json.`);

  // Append AWS credentials to the GITHUB_ENV file to make them available to subsequent steps
  const githubEnvPath = process.env.GITHUB_ENV;
  if (githubEnvPath) {
    const awsCreds = [
      `AWS_ACCESS_KEY_ID=${awsAccessKeyId}`,
      `AWS_SECRET_ACCESS_KEY=${awsSecretAccessKey}`,
      `AWS_REGION=${awsRegion}`
    ].join('\n');
    fs.appendFileSync(githubEnvPath, awsCreds + '\n');
  } else {
    console.error('Error: GITHUB_ENV variable not found. This script is designed to run within a GitHub Actions environment.');
    process.exit(1);
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`Error: env.json not found at ${jsonConfigPath}. Did 'npx dotenv-vault pull' run successfully before this script?`);
  } else {
    console.error('An unexpected error occurred:', error);
  }
  process.exit(1);
} 