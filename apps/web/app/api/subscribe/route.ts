import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { z } from "zod";
import { APP_DOMAIN, ALLOWED_API_ORIGINS } from "@/utils/constants/appInfo";

// Validation schema for request body
const createAccessCodeSchema = z.object({
  code: z.string().min(6), // Minimum 6 characters for access code
  email: z.string().email(), // Required email
  source: z.string(), // Required source
  sendEmail: z.boolean().default(false), // Optional boolean with default false
});

// OpenAPI documentation
const openApiDocs = {
  openapi: "3.0.0",
  info: {
    title: "Access Code API",
    version: "1.0.0",
    description: "API endpoints for managing access codes",
  },
  paths: {
    "/api/subscribe": {
      post: {
        summary: "Create a new access code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "email", "source"],
                properties: {
                  code: {
                    type: "string",
                    minLength: 6,
                    description: "Unique access code (minimum 6 characters)",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    description: "Email address associated with the code",
                  },
                  source: {
                    type: "string",
                    description: "Source identifier for tracking purposes",
                  },
                  sendEmail: {
                    type: "boolean",
                    default: false,
                    description: "Whether to send the access code via email",
                  },
                },
              },
              example: {
                code: "ACCESS123",
                email: "user@example.com",
                source: "signup_page",
                sendEmail: true,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Access code created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    code: { type: "string" },
                    isActive: { type: "boolean" },
                    usedBy: { type: "string", nullable: true },
                    usedAt: {
                      type: "string",
                      format: "date-time",
                      nullable: true,
                    },
                    source: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    email: { type: "string" },
                    emailSent: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid request data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    details: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid domain",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
          "409": {
            description: "Access code already exists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        summary: "Get API documentation",
        responses: {
          "200": {
            description: "OpenAPI documentation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
  },
};

// TODO: Create an email service interface
interface EmailService {
  sendAccessCode(email: string, code: string): Promise<boolean>;
}

// TODO: Implement the actual email service
class MockEmailService implements EmailService {
  async sendAccessCode(email: string, code: string): Promise<boolean> {
    console.log(`TODO: Send email to ${email} with access code ${code}`);
    return true;
  }
}

// TODO: Initialize email service with proper configuration
const emailService = new MockEmailService();

export async function GET() {
  return NextResponse.json(openApiDocs, { status: 200 });
}

export async function POST(request: Request) {
  try {
    // Validate request origin
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    // Check if the request is coming from an allowed origin or host
    const isAllowedOrigin = origin && ALLOWED_API_ORIGINS.includes(origin);
    const isAllowedHost = host?.includes(APP_DOMAIN);

    if (!isAllowedOrigin && !isAllowedHost) {
      console.log("Unauthorized - Invalid domain", host, origin);
      return NextResponse.json(
        { error: "Unauthorized - Invalid domain" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validatedData = createAccessCodeSchema.parse(body);

    // Check if code already exists
    const existingCode = await prisma.accessCode.findUnique({
      where: { code: validatedData.code },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "Access code already exists" },
        { status: 409 }
      );
    }

    // Create new access code
    const accessCode = await prisma.accessCode.create({
      data: {
        code: validatedData.code,
        email: validatedData.email,
        source: validatedData.source,
        isActive: true,
      },
    });

    let emailSent = false;
    if (validatedData.sendEmail) {
      try {
        // TODO: Add proper error handling and email templates
        emailSent = await emailService.sendAccessCode(
          validatedData.email,
          validatedData.code
        );
      } catch (error) {
        console.error("Failed to send access code email:", error);
        // Continue execution even if email fails
      }
    }

    return NextResponse.json({ ...accessCode, emailSent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating access code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
