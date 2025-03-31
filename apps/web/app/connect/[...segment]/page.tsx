import OAuthConnectCallback from "@/components/screens/connect/OAuthConnectCallback";
import { GoogleOAuthInstance } from "@repo/oauth-google/src";
import { cookies } from "next/headers";
import { notFound, redirect, RedirectType } from "next/navigation";

// NOTE:edit this whenever new provider is added
type Provider = "google";

const mapProviderToAuthFunction: Record<string, any> = {
  google: GoogleOAuthInstance,
};

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
  const provider = segment[0];
  if (!provider) {
    return <div>Invalid Provider</div>;
  }

  if (provider && !mapProviderToAuthFunction[provider]) {
    return <div>Invalid Provider</div>;
  }

  if (segment.length === 2 && segment[1] === "callback") {
    const code = searchParamsAwaited.code as string;
    const state = searchParamsAwaited.state as string;
    if (!code) {
      throw new Error("Authorization code not found in URL");
    }

    const tokenResponse =
      await mapProviderToAuthFunction[provider].exchangeCodeForTokens(code);

    // get DOCUMENT_ID from cookie
    const cookieStore = await cookies();
    const DOCUMENT_ID = cookieStore.get(`connect/${provider}`)?.value;

    if (!DOCUMENT_ID) {
      return <div>Authorization Failed!</div>;
    }

    return <OAuthConnectCallback docId={DOCUMENT_ID} keys={tokenResponse} />;
  }

  if (segment.length === 1) {
    const authUrl = await mapProviderToAuthFunction[provider].getAuthUrl();
    if (!authUrl) {
      throw new Error("Invalid provider");
    }

    redirect(authUrl, RedirectType.replace);
  }
};

export default AuthPopupWindow;
