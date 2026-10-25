import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent } from "@prisma/client";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { rejectUnauthorizedCron } from "../auth";

interface TriggerRoute {
  path: string;
  method?: string;
  body?: any;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

export const maxDuration = 300;
const BATCH_SIZE = 10;
// A new run starts every minute: stop claiming batches before then so overlapping
// runs never pick up the same pending events. Leftovers go to the next run.
const CLAIM_WINDOW_MS = 50_000;

export async function GET(req: NextRequest) {
  const unauthorized = rejectUnauthorizedCron(req);
  if (unauthorized) return unauthorized;

  try {
    const startedAt = Date.now();
    const results = [];
    let hasMoreEvents = true;
    let lastProcessedId: string | undefined;

    while (hasMoreEvents && Date.now() - startedAt < CLAIM_WINDOW_MS) {
      // Get a batch of pending webhook events
      const pendingEvents = await prisma.webhookEvent.findMany({
        where: {
          status: "pending",
          ...(lastProcessedId && {
            id: {
              gt: lastProcessedId,
            },
          }),
        },
        take: BATCH_SIZE,
        orderBy: {
          createdAt: "asc",
        },
      });

      if (pendingEvents.length === 0) {
        hasMoreEvents = false;
        continue;
      }

      // Process events in parallel
      const processingPromises = pendingEvents.map(async (event) => {
        try {
          if (!event.triggerRoute) {
            console.log(`No trigger route found for event ${event.id}`);
            return {
              eventId: event.id,
              status: "failed",
              error: "No trigger route found",
            };
          }

          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              status: "processing",
            },
          });

          const triggerRoute = event.triggerRoute as unknown as TriggerRoute;
          const { path, method, body, params, timeout = 30000 } = triggerRoute;

          // Construct the full URL
          const baseUrl = APP_BASE_URL + "/api";
          const url = new URL(`${baseUrl}${path}`);

          // Add query parameters if they exist
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              url.searchParams.append(key, String(value));
            });
          }

          console.log("url", url.toString());
          console.log("body", body);
          console.log("method", method);

          // Make the API call
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url.toString(), {
            method: method || "POST",
            headers: {
              "Content-Type": "application/json",
              "microfox-api-key": process.env.MICROFOX_API_KEY || "",
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const json = await response.json();
            console.log("json", json);
          }

          // Update event status based on response
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              status: response.ok ? "completed" : "failed",
            },
          });

          return {
            eventId: event.id,
            status: response.ok ? "success" : "failed",
            statusCode: response.status,
          };
        } catch (error) {
          console.error(`Error processing webhook event ${event.id}:`, error);

          // Update event status to failed
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              status: "failed",
            },
          });

          return {
            eventId: event.id,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      // Wait for all events in the batch to complete
      const batchResults = await Promise.all(processingPromises);
      results.push(...batchResults);

      // Update the last processed ID for pagination
      if (pendingEvents.length > 0) {
        lastProcessedId = pendingEvents?.[pendingEvents.length - 1]?.id;
      }
    }

    return NextResponse.json({
      message: "Webhook events processed",
      results,
    });
  } catch (error) {
    console.error("Error processing webhook events:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
