import { NextRequest, NextResponse } from "next/server";

export type MiddlewareFunction = (
  request: NextRequest,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

export function chain(middlewares: MiddlewareFunction[]) {
  return async function middleware(request: NextRequest) {
    let index = 0;

    async function next(): Promise<NextResponse> {
      if (index >= middlewares.length) {
        return NextResponse.next();
      }

      const middleware = middlewares[index];
      index++;

      return middleware?.(request, next) ?? NextResponse.next();
    }

    return next();
  };
}
