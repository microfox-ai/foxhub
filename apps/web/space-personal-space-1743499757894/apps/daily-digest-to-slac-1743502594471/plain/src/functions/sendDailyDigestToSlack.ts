import { Octokit } from '@microfox/github';
import { createSlackSDK } from '@microfox/slack-web-tiny';
import dotenv from 'dotenv';

dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const slackSDK = createSlackSDK({
  botToken: process.env.SLACK_BOT_TOKEN,
  authType: 'header',
  baseUrl: 'https://slack.com/api',
});

/**
 * Fetches recent repository activity from GitHub
 * @param owner The repository owner
 * @param repo The repository name
 * @returns A string containing the formatted activity summary
 */
async function fetchRepoActivity(owner: string, repo: string): Promise<string> {
  const [commits, pullRequests, issues] = await Promise.all([
    octokit.rest.repos.listCommits({ owner, repo, per_page: 5 }),
    octokit.rest.pulls.list({ owner, repo, state: 'open', per_page: 5 }),
    octokit.rest.issues.listForRepo({ owner, repo, state: 'open', per_page: 5 }),
  ]);

  let summary = '*Recent Repository Activity*\n\n';

  summary += '*Latest Commits:*\n';
  commits.data.forEach((commit) => {
    summary += `• ${commit.commit.message.split('\n')[0]} (${commit.sha.substring(0, 7)})\n`;
  });

  summary += '\n*Open Pull Requests:*\n';
  pullRequests.data.forEach((pr) => {
    summary += `• ${pr.title} (#${pr.number})\n`;
  });

  summary += '\n*Open Issues:*\n';
  issues.data.forEach((issue) => {
    summary += `• ${issue.title} (#${issue.number})\n`;
  });

  return summary;
}

/**
 * Sends a daily digest of GitHub repository activity to a Slack channel
 * @param event The Lambda event object
 * @returns A response object with status code and message
 */
export const sendDailyDigestToSlack = async (event: any) => {
  try {
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;
    const slackChannel = process.env.SLACK_CHANNEL;

    if (!owner || !repo || !slackChannel) {
      throw new Error('Missing required environment variables');
    }

    const activitySummary = await fetchRepoActivity(owner, repo);

    const message = `Daily Digest for ${owner}/${repo}\n\n${activitySummary}`;

    await slackSDK.sendMessage({
      channel: slackChannel,
      text: message,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily digest sent successfully to Slack',
      }),
    };
  } catch (error) {
    console.error('Error sending daily digest:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

/**
 * Documentation for the sendDailyDigestToSlack function
 */
export const sendDailyDigestToSlackDocs = {
  title: 'Send Daily Digest to Slack',
  description: 'Cron job that runs every day at 9:00 AM to fetch repository activity and send a daily digest to a specified Slack channel',
  method: 'GET',
  path: '/cron/send-daily-digest',
  schedule: 'cron(0 9 * * ? *)',
  responses: {
    200: {
      description: 'Daily digest sent successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Server error',
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  setup: `
To set up this cron job as a GitHub Action:

1. Create a new file in your repository at .github/workflows/daily-digest.yml
2. Add the following content to the file:

name: Daily Digest
on:
  schedule:
    - cron: '0 9 * * *'
jobs:
  send-digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm ci
      - run: npm run build
      - run: npm run send-daily-digest
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          GITHUB_REPO_OWNER: ${{ github.repository_owner }}
          GITHUB_REPO_NAME: ${{ github.event.repository.name }}
          SLACK_CHANNEL: '#your-slack-channel'

3. Make sure to set up the SLACK_BOT_TOKEN secret in your repository's settings.
4. Adjust the SLACK_CHANNEL value to match your desired Slack channel.

This setup will run the cron job every day at 9:00 AM UTC.
`,
};