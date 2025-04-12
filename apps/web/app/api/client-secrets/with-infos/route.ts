import { PortalSdk } from "@/utils/services/PortalSdk";
import { NextRequest, NextResponse } from "next/server";

const BASE_PACKAGE_URL =
  "https://raw.githubusercontent.com/microfox-ai/microfox/refs/heads/main/packages";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const packageName = searchParams.get("packageName");
  console.log(packageName);

  const packageUrl = `${BASE_PACKAGE_URL}/${packageName}/package-info.json`;

  const response = await fetch(packageUrl);
  const data = await response.json();
  return NextResponse.json(data);
}
