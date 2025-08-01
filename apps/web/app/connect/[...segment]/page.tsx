import OAuthConnectCallback from "@/components/screens/connect/OAuthConnectCallback";
import { cookies } from "next/headers";
import { notFound, redirect, RedirectType } from "next/navigation";
import { mapProviderToAuthFunction } from "./providerInstances";
import { ClientSecretVariable } from "@/server/types";
import { prisma } from "@/prisma/prisma";
import { Identity, OauthKit, SupportedProviders } from "@microfox/oauth-kit";
import { WhatsappOAuthSdk } from "@microfox/whatsapp-oauth";

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
      const providerInstance = mapProviderToAuthFunction(packageName, []);

      if (!providerInstance) {
        return <div>Invalid Provider</div>;
      }

      if (providerInstance instanceof WhatsappOAuthSdk) {
        const userIdentity = providerInstance.exchangeCodeForUserIdentity(code);
        if (!userIdentity) {
          throw new Error("User Identity not found");
        }
        return (
          <div>Authorization succesful! - {JSON.stringify(userIdentity)}</div>
        );
      }

      const tokenResponse = await providerInstance.exchangeCodeForTokens(code);
      if ("accessToken" in tokenResponse || "access_token" in tokenResponse) {
        const accessToken =
          "accessToken" in tokenResponse
            ? tokenResponse.accessToken
            : tokenResponse.access_token;
        const refreshToken =
          "refreshToken" in tokenResponse ? tokenResponse.refreshToken : null;
        return (
          <div>Authorization succesful! - {JSON.stringify(tokenResponse)}</div>
        );
      } else {
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

    const scopes = (
      clientSecret.variables as any[] as ClientSecretVariable[]
    ).find((variable: any) =>
      (variable.key as string).includes("SCOPES")
    )?.value;

    const providerInstance = mapProviderToAuthFunction(
      packageName,
      scopes ? scopes.split(",") : []
    );

    if (!providerInstance) {
      return <div>Invalid Provider</div>;
    }

    if (providerInstance instanceof WhatsappOAuthSdk) {
      const userInfo = await providerInstance.exchangeCodeForUserIdentity(code);
      const keyValuePairs = [
        {
          key: "WHATSAPP_BUSINESS_PHONE_NUMBER",
          value: `${userInfo.phoneNumber}`,
          isOptional: false,
        },
        {
          key: "WHATSAPP_BUSINESS_PHONE_NUMBER_ID",
          value: `${userInfo.userProfile.metadata.phone_number_id}`,
          isOptional: false,
        },
        {
          key: "WHATSAPP_BUSINESS_ACCOUNT_ID",
          value: "",
          isOptional: false,
        },
        {
          key: "WHATSAPP_BUSINESS_ACCESS_TOKEN",
          value: "",
          isOptional: false,
        },
      ];
      const identityMetadata: Identity =
        await OauthKit.exchangeTokenResponseForIdentity("whatsapp", userInfo);

      return (
        <OAuthConnectCallback
          docId={DOCUMENT_ID}
          keys={keyValuePairs}
          tokenResponse={userInfo?.userProfile}
          identityMetadata={identityMetadata}
        />
      );
    }

    const tokenResponse = await providerInstance.exchangeCodeForTokens(code);

    const accessToken =
      "accessToken" in tokenResponse
        ? tokenResponse?.accessToken
        : tokenResponse?.access_token || null;
    const refreshToken =
      "refreshToken" in tokenResponse
        ? tokenResponse?.refreshToken
        : (tokenResponse as any)?.refresh_token || null;

    const keyValuePairs = (
      clientSecret.variables as any[] as ClientSecretVariable[]
    ).map((variable: ClientSecretVariable) => {
      if (
        (variable.key as string).includes("_ACCESS_TOKEN") ||
        (variable.key as string).includes("_BOT_TOKEN") ||
        (variable.key as string).includes("_OAUTH_TOKEN")
      ) {
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

    const providerName = packageName
      .replace("-oauth", "")
      .replace("oauth-", "");
    console.log("tokenResponse for", providerName, tokenResponse);
    if (SupportedProviders.includes(providerName as any)) {
      try {
        const identityMetadata =
          await OauthKit.exchangeTokenResponseForIdentity(
            providerName,
            tokenResponse
          );
        return (
          <OAuthConnectCallback
            docId={DOCUMENT_ID}
            keys={keyValuePairs}
            tokenResponse={tokenResponse}
            identityMetadata={identityMetadata}
          />
        );
      } catch (error) {
        console.error("Error exchanging token response for identity:", error);
        return <div>Error exchanging token response for identity</div>;
      }
    } else {
      return (
        <OAuthConnectCallback
          docId={DOCUMENT_ID}
          keys={keyValuePairs}
          tokenResponse={tokenResponse}
          identityMetadata={{}}
        />
      );
    }
  } else if (segment.length === 1) {
    if (!DOCUMENT_ID) {
      return (
        <div>
          Authorization Failed! - Authentication not initiated from a valid
          source
        </div>
      );
    }

    const clientSecret = await prisma.clientSecret.findUnique({
      where: {
        id: DOCUMENT_ID,
      },
    });

    if (!clientSecret) {
      return <div>Client Secret Not Found</div>;
    }

    const scopes = (
      clientSecret.variables as any[] as ClientSecretVariable[]
    ).find((variable: any) =>
      (variable.key as string).includes("SCOPES")
    )?.value;

    const providerInstance = mapProviderToAuthFunction(
      packageName,
      scopes ? scopes.split(",") : []
    );

    if (!providerInstance) {
      return <div>Invalid Provider</div>;
    }
    if (providerInstance instanceof WhatsappOAuthSdk) {
      const authUrl = providerInstance.getWidgetUrl(
        clientSecret.id,
        "microfox"
      );
      if (!authUrl) {
        throw new Error("Invalid provider");
      }
      redirect(authUrl, RedirectType.replace);
    }

    const authUrl = providerInstance.getAuthUrl();
    if (!authUrl) {
      throw new Error("Invalid provider");
    }

    redirect(authUrl, RedirectType.replace);
  }
};

export default AuthPopupWindow;
