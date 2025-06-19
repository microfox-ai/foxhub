import OAuthConnectCallback from "@/components/screens/connect/OAuthConnectCallback";
import { cookies } from "next/headers";
import { notFound, redirect, RedirectType } from "next/navigation";
import { mapProviderToAuthFunction } from "./providerInstances";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { ClientSecretVariable } from "@/server/types";
import { prisma } from "@/prisma/prisma";
import { OauthKit } from "@microfox/oauth-kit";

const AuthPopupWindow = async ({
  params,
  searchParams,
}: {
  params: Promise<{ segment: string | string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { segment } = await params;
  const searchParamsAwaited = await searchParams;
  console.log("params", segment, searchParamsAwaited);
  if (
    !segment ||
    segment.length > 2 ||
    (segment.length === 2 && segment[1] !== "callback")
  ) {
    notFound();
  }

  const packageName = segment[0];
  // const providerName = packageName?.split("-")[0];

  if (!packageName) {
    return <div>Invalid Provider</div>;
  }


  // get DOCUMENT_ID from cookie
  const cookieStore = await cookies();
  const DOCUMENT_ID = cookieStore.get(`connect/${packageName}`)?.value;

  if (segment.length === 2 && segment[1] === "callback") {
    const code = searchParamsAwaited.code as string;
    const state = searchParamsAwaited.state as string;
    if (!code) {
      return <div>Authorization code not found in URL</div>;
    }

    if (!DOCUMENT_ID) {
      const providerInstance = mapProviderToAuthFunction(
        packageName,
        []
      );

      if (!providerInstance) {
        return <div>Invalid Provider</div>;
      }

      const tokenResponse = await providerInstance.exchangeCodeForTokens(code);
      if ("accessToken" in tokenResponse || "access_token" in tokenResponse) {
        const accessToken =
          "accessToken" in tokenResponse ? tokenResponse.accessToken : tokenResponse.access_token;
        const refreshToken =
          "refreshToken" in tokenResponse ? tokenResponse.refreshToken : null;
        return <div>Authorization succesful! - {JSON.stringify(tokenResponse)}</div>;
      }
      else {
        return <div>Authorization Failed!</div>;
      }
    }

    const clientSecret = await prisma.clientSecret.findUnique({
      where: {
        id: DOCUMENT_ID,
      },
    });

    if (!clientSecret) {
      return <div>Client Secret Not Found</div>;
    }

    const scopes = (clientSecret.variables as any[] as ClientSecretVariable[]).find(
      (variable: any) => (variable.key as string).includes("SCOPES")
    )?.value;

    const providerInstance = mapProviderToAuthFunction(
      packageName,
      scopes ? scopes.split(",") : []
    );

    if (!providerInstance) {
      return <div>Invalid Provider</div>;
    }

    const tokenResponse = await providerInstance.exchangeCodeForTokens(code);

    const accessToken =
      "accessToken" in tokenResponse ? tokenResponse.accessToken : tokenResponse.access_token;
    const refreshToken =
      "refreshToken" in tokenResponse ? tokenResponse.refreshToken : null;

    const keyValuePairs = (clientSecret.variables as any[] as ClientSecretVariable[]).map((variable: ClientSecretVariable) => {
      if ((variable.key as string).includes("_ACCESS_TOKEN") || (variable.key as string).includes("_BOT_TOKEN") || (variable.key as string).includes("_OAUTH_TOKEN")) {
        return {
          key: variable.key,
          value: accessToken,
          isOptional: false,
        };
      }
      if ((variable.key as string).includes("_REFRESH_TOKEN") && refreshToken) {
        return {
          key: variable.key,
          value: refreshToken,
          isOptional: false,
        };
      }
      if ((variable.key as string).includes("SCOPES")) {
        return {
          key: variable.key,
          value: scopes,
          isOptional: false,
        };
      }
      return {
        key: variable.key,
        value: process.env[variable.key],
        isOptional: false,
      };
    });

    try {
      const identityMetadata = await OauthKit.exchangeTokenResponseForIdentity(packageName.replace("-oauth", ""), tokenResponse);
      return <OAuthConnectCallback docId={DOCUMENT_ID} keys={keyValuePairs} tokenResponse={tokenResponse} identityMetadata={identityMetadata} />;
    } catch (error) {
      console.error("Error exchanging token response for identity:", error);
      return <div>Error exchanging token response for identity</div>;
    }
  }
  else if (segment.length === 1) {

    if (!DOCUMENT_ID) {
      return <div>Authorization Failed! - Authentication not initiated from a valid source</div>;
    }

    const clientSecret = await prisma.clientSecret.findUnique({
      where: {
        id: DOCUMENT_ID,
      },
    });

    if (!clientSecret) {
      return <div>Client Secret Not Found</div>;
    }


    const scopes = (clientSecret.variables as any[] as ClientSecretVariable[]).find(
      (variable: any) => (variable.key as string).includes("SCOPES")
    )?.value;

    const providerInstance = mapProviderToAuthFunction(
      packageName,
      scopes ? scopes.split(",") : []
    );

    if (!providerInstance) {
      return <div>Invalid Provider</div>;
    }

    const authUrl = providerInstance.getAuthUrl();
    if (!authUrl) {
      throw new Error("Invalid provider");
    }

    redirect(authUrl, RedirectType.replace);
  }
};

export default AuthPopupWindow;
