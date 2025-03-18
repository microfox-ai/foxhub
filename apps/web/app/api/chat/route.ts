import { microfoxRouter } from "@/server/microfoxRouter";

export const maxDuration = 90;

export async function POST(req: Request) {
  const body = await req.json();
  //console.log("body", body);
  return microfoxRouter.execute(body);
}
