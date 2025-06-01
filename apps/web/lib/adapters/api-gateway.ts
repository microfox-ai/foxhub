import { NextRequest, NextResponse } from "next/server";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export class ApiGatewayAdapter {
  /**
   * Converts an AWS API Gateway event to a Next.js Request
   * @param event The AWS API Gateway event
   * @returns NextRequest object
   */
  static toNextRequest(event: APIGatewayProxyEvent): NextRequest {
    const url = new URL(
      event.path,
      `https://${event.requestContext.domainName}`
    );

    // Add query parameters
    if (event.queryStringParameters) {
      Object.entries(event.queryStringParameters).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
    }

    // Add multi-value query parameters
    if (event.multiValueQueryStringParameters) {
      Object.entries(event.multiValueQueryStringParameters).forEach(
        ([key, values]) => {
          if (Array.isArray(values)) {
            values.forEach((value) => {
              if (value) url.searchParams.append(key, value);
            });
          }
        }
      );
    }

    // Create headers
    const headers = new Headers();
    if (event.headers) {
      Object.entries(event.headers).forEach(([key, value]) => {
        if (value) headers.set(key, value);
      });
    }

    // Add multi-value headers
    if (event.multiValueHeaders) {
      Object.entries(event.multiValueHeaders).forEach(([key, values]) => {
        if (Array.isArray(values)) {
          values.forEach((value) => {
            if (value) headers.append(key, value);
          });
        }
      });
    }

    // Create the request
    return new NextRequest(url, {
      method: event.httpMethod,
      headers,
      body: event.body ? event.body : undefined,
    });
  }

  /**
   * Converts a Next.js Request to an AWS API Gateway event
   * @param request The Next.js Request
   * @returns APIGatewayProxyEvent object
   */
  static async toApiGatewayEvent(
    request: NextRequest
  ): Promise<APIGatewayProxyEvent> {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    const multiValueHeaders: Record<string, string[]> = {};

    // Convert headers
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = await request.json();

    return {
      httpMethod: request.method,
      path: url.pathname,
      headers,
      multiValueHeaders,
      queryStringParameters: Object.fromEntries(url.searchParams),
      multiValueQueryStringParameters: Object.fromEntries(
        Array.from(url.searchParams.entries()).map(([key, value]) => [
          key,
          [value],
        ])
      ),
      pathParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: "",
        apiId: "",
        authorizer: null,
        protocol: "HTTP/1.1",
        httpMethod: request.method,
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          clientCert: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: "",
          user: null,
          userAgent: request.headers.get("user-agent") || "",
          userArn: null,
        },
        path: url.pathname,
        stage: "",
        requestId: "",
        requestTimeEpoch: Date.now(),
        resourceId: "",
        resourcePath: url.pathname,
      },
      resource: url.pathname,
      body: body ? JSON.stringify(body) : null,
      isBase64Encoded: false,
    };
  }

  /**
   * Converts an AWS API Gateway response to a Next.js Response
   * @param awsResponse The AWS API Gateway response
   * @returns NextResponse object
   */
  static toNextResponse(awsResponse: APIGatewayProxyResult): NextResponse {
    const headers = new Headers();

    // Handle single-value headers
    if (awsResponse.headers) {
      Object.entries(awsResponse.headers).forEach(([key, value]) => {
        headers.set(key, String(value));
      });
    }

    // Handle multi-value headers
    if (awsResponse.multiValueHeaders) {
      Object.entries(awsResponse.multiValueHeaders).forEach(([key, values]) => {
        if (Array.isArray(values)) {
          values.forEach((value) => {
            headers.append(key, String(value));
          });
        }
      });
    }

    // Create the response with the appropriate body
    const response = NextResponse.json(
      awsResponse.body ? JSON.parse(awsResponse.body) : null,
      {
        status: awsResponse.statusCode,
        headers,
      }
    );

    return response;
  }

  /**
   * Converts a Next.js Response to an AWS API Gateway response
   * @param nextResponse The Next.js Response
   * @returns APIGatewayProxyResult object
   */
  static toApiGatewayResponse(
    nextResponse: NextResponse
  ): APIGatewayProxyResult {
    const headers: Record<string, string> = {};
    const multiValueHeaders: Record<string, string[]> = {};

    // Convert headers to API Gateway format
    nextResponse.headers.forEach((value, key) => {
      // Since we can't use getAll, we'll treat all headers as single-value
      // This is a limitation of the Headers API in Next.js
      headers[key] = value;
    });

    return {
      statusCode: nextResponse.status,
      headers,
      multiValueHeaders,
      body: JSON.stringify(nextResponse.body),
      isBase64Encoded: false,
    };
  }
}
