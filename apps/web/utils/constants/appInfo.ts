export enum APP_ROUTES {}

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
export const APP_BASE_FOR_SITES = "https://www.microfox.app";
export const APP_BASE_URL = IN_DEV
  ? "http://localhost:3000"
  : process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000";
export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === "true";
export const SERVER_SECRET_API_KEY = process.env
  .NEXT_PUBLIC_SERVER_SECRET_API_KEY as string;

export const APP_BASE_FOR_SHARD = IN_DEV
  ? "staging.microfox.app"
  : "microfox.app";
