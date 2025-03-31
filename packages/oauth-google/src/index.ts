import { googleOAuth } from "@microfox/google-sdk";
import dotenv from "dotenv";

dotenv.config();

class GoogleOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes: string[];
  private state: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI!;
    this.state = process.env.GOOGLE_STATE!;
    this.scopes = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.force-ssl",
      "https://www.googleapis.com/auth/youtube.upload",
    ];
    this.state =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }
  public async getState() {
    return this.state;
  }

  private async getAccessAndRefreshTokens(code: string) {
    const tokenResponse = await googleOAuth.exchangeCodeForTokens({
      code,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.redirectUri,
    });

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token!,
    };
  }

  public async exchangeCodeForTokens(code: string) {
    const getAccessAndRefreshTokens =
      await this.getAccessAndRefreshTokens(code);
    return {
      GOOGLE_ACCESS_TOKEN: getAccessAndRefreshTokens.accessToken,
      GOOGLE_REFRESH_TOKEN: getAccessAndRefreshTokens.refreshToken,
      GOOGLE_CLIENT_ID: this.clientId,
      GOOGLE_CLIENT_SECRET: this.clientSecret,
      GOOGLE_REDIRECT_URI: this.redirectUri,
      GOOGLE_SCOPES: this.scopes.join(","),
    };
  }

  public async getAuthUrl() {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    const authSearchParams = authUrl.searchParams;
    authSearchParams.append("client_id", this.clientId);
    authSearchParams.append("redirect_uri", this.redirectUri);
    authSearchParams.append("response_type", "code");
    authSearchParams.append("scope", this.scopes.join(" "));
    authSearchParams.append("access_type", "offline");
    authSearchParams.append("prompt", "consent");
    authSearchParams.append("state", this.state);
    return authUrl.toString();
  }
}

export const GoogleOAuthInstance = new GoogleOAuth();
