import { LinkedInOAuthSdk } from "@microfox/linkedin-oauth";
import { GoogleOAuthSdk } from "@microfox/google-oauth";

// const LinkedInOAuthInstance = (scopes: string[]) =>

// const GoogleOAuthInstance = (scopes: string[]) =>
//   new GoogleOAuthSdk({
//     clientId: process.env.GOOGLE_CLIENT_ID!,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     redirectUri: process.env.GOOGLE_REDIRECT_URI!,
//     scopes: scopes,
//   });

// NOTE:edit this whenever new provider is added

// export const mapProviderToAuthFunction: Record<string, any> = {
//   "google-oauth-sdk": GoogleOAuthInstance,
//   "linkedin-oauth-sdk": LinkedInOAuthInstance,
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
        redirectUri: process.env.GOOGLE_REDIRECT_URI!,
        ...(scopes && { scopes: scopes }),
      });
    case "linkedin-oauth":
      return new LinkedInOAuthSdk({
        clientId: process.env.LINKEDIN_CLIENT_ID!,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirectUri: process.env.LINKEDIN_REDIRECT_URI!,
        ...(scopes && { scopes: scopes }),
      });
    default:
      return null;
  }
};
