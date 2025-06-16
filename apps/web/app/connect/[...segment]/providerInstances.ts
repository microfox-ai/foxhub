import { LinkedInOAuthSdk } from "@microfox/linkedin-oauth";
import { GoogleOAuthSdk } from "@microfox/google-oauth";
import { SlackOAuthSdk } from "@microfox/slack-oauth";
import { RedditOAuthSdk } from "@microfox/reddit-oauth";
import { NotionOAuthSdk } from "@microfox/notion-oauth";
import { APP_BASE_URL } from "@/utils/constants/appInfo";

// NOTE:edit this whenever new provider is added

// export const mapProviderToAuthFunction: Record<string, any> = {
//   "google-oauth-sdk": GoogleOAuthInstance,
//   "linkedin-oauth-sdk": LinkedInOAuthInstance,
//   "slack-oauth-sdk": SlackOAuthInstance,
// };
export const mapProviderToAuthFunction = (
  packageName: string,
  scopes: string[]
) => {
  switch (packageName) {
    case "google-oauth":
      return new GoogleOAuthSdk({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri: process.env.GOOGLE_REDIRECT_URI
          ? APP_BASE_URL + process.env.GOOGLE_REDIRECT_URI
          : APP_BASE_URL + `/connect/${packageName}/callback`,
        ...(scopes && { scopes: scopes }),
      });
    case "linkedin-oauth":
      return new LinkedInOAuthSdk({
        clientId: process.env.LINKEDIN_CLIENT_ID!,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirectUri: process.env.LINKEDIN_REDIRECT_URI
          ? APP_BASE_URL + process.env.LINKEDIN_REDIRECT_URI
          : APP_BASE_URL + `/connect/${packageName}/callback`,
        ...(scopes && { scopes: scopes }),
      });
    case "slack-oauth":
      return new SlackOAuthSdk({
        clientId: process.env.SLACK_CLIENT_ID!,
        clientSecret: process.env.SLACK_CLIENT_SECRET!,
        redirectUri: process.env.SLACK_REDIRECT_URI
          ? APP_BASE_URL + process.env.SLACK_REDIRECT_URI
          : APP_BASE_URL + `/connect/${packageName}/callback`,
        ...(scopes && { scopes: scopes }),
      });
    case "reddit-oauth":
      return new RedditOAuthSdk({
        clientId: process.env.REDDIT_CLIENT_ID!,
        clientSecret: process.env.REDDIT_CLIENT_SECRET!,
        redirectUri: process.env.REDDIT_REDIRECT_URI
          ? APP_BASE_URL + process.env.REDDIT_REDIRECT_URI
          : APP_BASE_URL + `/connect/${packageName}/callback`,
        ...(scopes && { scopes: scopes }),
      });
    case "notion-oauth":
      return new NotionOAuthSdk({
        clientId: process.env.NOTION_CLIENT_ID!,
        clientSecret: process.env.NOTION_CLIENT_SECRET!,
        redirectUri: process.env.NOTION_REDIRECT_URI
          ? APP_BASE_URL + process.env.NOTION_REDIRECT_URI
          : APP_BASE_URL + `/connect/${packageName}/callback`,
        ...(scopes && { scopes: scopes }),
      });
    default:
      return null;
  }
};
