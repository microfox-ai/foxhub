import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { MicrofoxUsagePricing } from "@microfox/usage-pricing";
import { fetchPackageInfo } from "@/server/convertfox/gitFetchers";

//export const dynamic = "force-dynamic";
export const revalidate = 0;

const fullPackageName = (pkg: string) =>
  pkg.startsWith("@microfox/") ? pkg : `@microfox/${pkg}`;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const clientRequestId = searchParams.get("clientRequestId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "30");

    if (!clientRequestId) {
      return NextResponse.json(
        { error: "clientRequestId is required" },
        { status: 400 }
      );
    }

    // const clientSecrets = await prisma.clientSecret.findMany({
    //   where: {
    //     clientRequestIds: {
    //       has: clientRequestId,
    //     },
    //   },
    // });

    const microfoxUsagePricing = new MicrofoxUsagePricing({
      prefix: clientRequestId,
    });

    const usage = await microfoxUsagePricing.getUsage(undefined, undefined, {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    if (!usage) {
      return NextResponse.json({
        results: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }

    const packages = usage?.data
      .map((usage) => usage?.package)
      ?.filter((pkg) => pkg !== undefined);
    const uniquePackages = [...new Set(packages)];

    const packageInfos = await Promise.all(
      uniquePackages.map(async (pkg) => {
        const packageInfo = await fetchPackageInfo(fullPackageName(pkg));
        return packageInfo;
      })
    );
    // TODO: fetch & attach package Infos.

    return NextResponse.json({
      results: usage.data
        ?.filter((usage) => usage != undefined)
        .map((usage) => {
          const packageInfo = packageInfos.find(
            (packageInfo) =>
              packageInfo?.name === fullPackageName(usage?.package)
          );
          return { ...usage, packageInfo };
        })
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      total: usage.data?.length,
      page,
      pageSize,
      totalPages: 100,
    });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
