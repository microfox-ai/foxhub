export enum APP_ROUTES {
  index = "/",
  cancellationPolicy = "/policies/refund",
  contactPolicy = "/policies/contact",
  dataDeletionPolicy = "/policies/data-deletion",
  privacyPolicy = "/policies/privacy",
  serviceDeliveryPolicy = "/policies/shipping",
  termsOfService = "/policies/terms",
}

export const SOCIAL_ROUTES = {
  telegram: "/",
  twitter: "https://x.com/_Microfox_",
  youtube: "https://www.youtube.com/@MicroFox-v4f",
  instagram: "https://www.instagram.com/themoondevs/",
  linkedin: "https://www.linkedin.com/company/microfoxautomates",
  discord: "https://discord.gg/kUuJFvEtJ6",
};

export enum GLOBAL_ROUTES {
  applicationForm = "/application/position/",
}

export const AppRoutesHelper = {};

export enum APP_SOCIAL {}

export enum LOCAL_STORAGE {
  user = "microfox_user",
  passphrase = "local_passphrase",
}
export const IN_DEV = process.env.NODE_ENV === "development";
// Vercel previews leave NEXT_PUBLIC_APP_BASE_URL unset and use the branch URL Vercel exposes.
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
    : "http://localhost:3000");
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "microfox.app";
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "microfox.app";
export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === "true";
export const SERVER_SECRET_API_KEY = process.env
  .NEXT_PUBLIC_SERVER_SECRET_API_KEY as string;

export const APP_BASE_URL_PROD = "https://microfox.app";
export const APP_BASE_URL_STAGING = "https://staging.microfox.app";

export type AppEnv = "production" | "staging" | "preview" | "development";
const APP_ENVS: AppEnv[] = ["production", "staging", "preview", "development"];

/**
 * NEXT_PUBLIC_APP_ENV is inlined at build time, so set it per deployment environment.
 * Without it, the env is inferred from NEXT_PUBLIC_APP_BASE_URL (the droplet builds).
 * Local dev always resolves to "development" so a copied env file can't reach production.
 */
const resolveAppEnv = (): AppEnv => {
  if (IN_DEV) return "development";
  const explicitEnv = process.env.NEXT_PUBLIC_APP_ENV as AppEnv | undefined;
  if (explicitEnv && APP_ENVS.includes(explicitEnv)) return explicitEnv;
  if (process.env.NEXT_PUBLIC_APP_BASE_URL === APP_BASE_URL_PROD) {
    return "production";
  }
  if (process.env.NEXT_PUBLIC_APP_BASE_URL === APP_BASE_URL_STAGING) {
    return "staging";
  }
  return "preview";
};

export const APP_ENV = resolveAppEnv();
export const IN_PRODUCTION = APP_ENV === "production";
// Staging, previews and local dev share the staging DB, GitHub org and beta features.
export const IN_STAGING = !IN_PRODUCTION;

export const APP_BASE_FOR_SHARD = IN_STAGING
  ? APP_BASE_URL_STAGING
  : APP_BASE_URL_PROD;

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/auth",
  "/auth/callback",
];

export const ALLOWED_API_ORIGINS = [
  "https://microfox.app",
  "https://staging.microfox.app",
];
