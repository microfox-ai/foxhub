import OAuthConnectCallback from "@/components/screens/connect/OAuthConnectCallback";
import { cookies } from "next/headers";
import { notFound, redirect, RedirectType } from "next/navigation";
import { mapProviderToAuthFunction } from "./providerInstances";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { ClientSecretVariable } from "@/server/types";

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

  if (!DOCUMENT_ID) {
    return <div>Authorization Failed!</div>;
  }

  const clientSecretData = await PortalSdk.getData(
    `${APP_BASE_URL}/api/client-secrets?id=${DOCUMENT_ID}`,
    {}
  );

  const clientSecret = clientSecretData.clientSecrets[0];

  const scopes = (clientSecret.variables as ClientSecretVariable[]).find(
    (variable: any) => variable.key === "SCOPES"
  )?.value;

  const providerInstance = mapProviderToAuthFunction(
    packageName,
    scopes ? scopes.split(",") : []
  );

  if (!providerInstance) {
    return <div>Invalid Provider</div>;
  }

  if (segment.length === 2 && segment[1] === "callback") {
    const code = searchParamsAwaited.code as string;
    const state = searchParamsAwaited.state as string;
    if (!code) {
      throw new Error("Authorization code not found in URL");
    }

    const tokenResponse = await providerInstance.exchangeCodeForTokens(code);

    if (!DOCUMENT_ID) {
      return <div>Authorization Failed!</div>;
    }

    const keyValuePairs = clientSecret.variables.map((variable: ClientSecretVariable) => {
      if ((variable.key as string).includes("_ACCESS_TOKEN")) {
        return {
          key: variable.key,
          value: tokenResponse.accessToken,
          isOptional: false,
        };
      }
      if ((variable.key as string).includes("_REFRESH_TOKEN")) {
        return {
          key: variable.key,
          value: tokenResponse.refreshToken,
          isOptional: false,
        };
      }
      if (variable.key === "SCOPES") {
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

    return <OAuthConnectCallback docId={DOCUMENT_ID} keys={keyValuePairs} />;
  }

  if (segment.length === 1) {
    const authUrl = providerInstance.getAuthUrl();
    if (!authUrl) {
      throw new Error("Invalid provider");
    }

    redirect(authUrl, RedirectType.replace);
  }
};

export default AuthPopupWindow;
