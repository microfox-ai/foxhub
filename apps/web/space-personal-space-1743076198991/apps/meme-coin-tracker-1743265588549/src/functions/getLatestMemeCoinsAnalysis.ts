import { SESClient, SendEmailCommand } from '@microfox/aws-ses';
import { WebClient } from '@microfox/slack-web-tiny';
import dotenv from 'dotenv';

dotenv.config();

// Coingecko API base URL
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Top 4 meme coins to track (you can adjust this list as needed)
const TOP_MEME_COINS = ['dogecoin', 'shiba-inu', 'pepe', 'floki'];

// Threshold for significant price change (in percentage)
const SIGNIFICANT_PRICE_CHANGE = 5;

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
}

/**
 * Fetch data for a specific coin from Coingecko API
 */
async function fetchCoinData(coinId: string): Promise<CoinData> {
  const response = await fetch(`${COINGECKO_API_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${coinId}`);
  }
  const data = await response.json();
  return {
    id: data.id,
    symbol: data.symbol,
    name: data.name,
    current_price: data.market_data.current_price.usd,
    price_change_percentage_24h: data.market_data.price_change_percentage_24h,
    total_volume: data.market_data.total_volume.usd,
  };
}

/**
 * Analyze coin data and generate a report
 */
function analyzeCoinData(coinData: CoinData[]): string {
  let report = "Meme Coins Analysis Report:\n\n";

  for (const coin of coinData) {
    report += `${coin.name} (${coin.symbol.toUpperCase()}):\n`;
    report += `  Current Price: $${coin.current_price.toFixed(4)}\n`;
    report += `  24h Change: ${coin.price_change_percentage_24h.toFixed(2)}%\n`;
    report += `  Trading Volume: $${coin.total_volume.toLocaleString()}\n`;

    if (Math.abs(coin.price_change_percentage_24h) >= SIGNIFICANT_PRICE_CHANGE) {
      report += `  ALERT: Significant price change in the last 24 hours!\n`;
    }

    report += "\n";
  }

  return report;
}

/**
 * Send report via email using AWS SES
 */
async function sendEmailReport(report: string) {
  const sesClient = new SESClient({ region: process.env.AWS_REGION });

  const params = {
    Destination: {
      ToAddresses: [process.env.REPORT_EMAIL_RECIPIENT],
    },
    Message: {
      Body: {
        Text: { Data: report },
      },
      Subject: { Data: "Meme Coins Analysis Report" },
    },
    Source: process.env.REPORT_EMAIL_SENDER,
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

/**
 * Send report to Slack
 */
async function sendSlackReport(report: string) {
  const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

  try {
    await slackClient.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: report,
    });
    console.log("Slack message sent successfully");
  } catch (error) {
    console.error("Error sending Slack message:", error);
  }
}

/**
 * Main function to get the latest meme coins analysis
 */
export const getLatestMemeCoinsAnalysis = async (event: any) => {
  try {
    // Fetch data for top meme coins
    const coinDataPromises = TOP_MEME_COINS.map(fetchCoinData);
    const coinData = await Promise.all(coinDataPromises);

    // Analyze the data
    const report = analyzeCoinData(coinData);

    // Send report via email and Slack
    await sendEmailReport(report);
    await sendSlackReport(report);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Analysis completed and reports sent successfully" }),
    };
  } catch (error) {
    console.error("Error in getLatestMemeCoinsAnalysis:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
    };
  }
}

/**
 * Documentation for the getLatestMemeCoinsAnalysis endpoint
 */
export const getLatestMemeCoinsAnalysisDocs = {
  title: 'Get Latest Meme Coins Analysis',
  description: 'Retrieve the latest meme coins analysis, send reports via email and Slack',
  method: 'GET',
  path: '/api/memeCoins/latestAnalysis',
  responses: {
    200: {
      description: 'Analysis completed and reports sent successfully',
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
};