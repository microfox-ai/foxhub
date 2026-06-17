"use client";

import type React from "react";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
} from "react";
import { API_BASE } from "@/components/subapps/console/lib/console-api";

export type IApiEndpoint = {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
};
type AwsLambdaResource = {
  type: "lambda";
  logicalName?: string;
  name: string;
  group?: string;
  region?: string;
  arn?: string;
  memorySize?: number;
  timeout?: number;
  apiEndpoints?: IApiEndpoint[];
};
type AwsS3Resource = {
  type: "s3";
  name: string;
  bucket: string;
  region: string;
};
type AwsSqsResource = {
  type: "sqs";
  name: string;
  queueUrl?: string;
  arn?: string;
};
export type AwsResource = AwsLambdaResource | AwsS3Resource | AwsSqsResource;
export type UrlMap = {
  type: "agent" | "public" | "openapi" | "ui" | "docs";
  path: string;
  url: string;
  group?: string;
  service?: {
    runtime: "serverless" | "static" | "edge" | "server";
    framework?: string;
    name?: string;
    endpoints?: IApiEndpoint[];
    schedule?: string;
    port?: number;
    healthCheckPath?: string;
    providerConfig?: {
      provider: "aws";
      resources: AwsResource[];
    };
  };
};
export type AwsFunctionRef = {
  arn?: string;
  region: string;
  name: string;
  group?: string;
  apiEndpoints?: IApiEndpoint[];
};
export type LambdaConfig = {
  FunctionName?: string;
  FunctionArn?: string;
  Runtime?: string;
  Handler?: string;
  MemorySize?: number;
  Timeout?: number;
  LastModified?: string;
  TracingConfig?: { Mode?: string };
  Architectures?: string[];
  PackageType?: string;
  EphemeralStorage?: { Size?: number };
  KMSKeyArn?: string;
  Environment?: { Variables?: Record<string, string> };
  Version?: string;
};
export type LambdaMetrics = {
  invocations?: { timestamp: number; value: number }[];
  errors?: { timestamp: number; value: number }[];
  throttles?: { timestamp: number; value: number }[];
  duration?: { timestamp: number; value: number }[];
  concurrentExecutions?: { timestamp: number; value: number }[];
};
export type LambdaAnalyticsItem = {
  ref: AwsFunctionRef;
  config: LambdaConfig;
  metrics: LambdaMetrics;
  tags?: Record<string, string>;
};
export type CloudWatchLogEvent = {
  id?: string;
  timestamp: number;
  message: string;
  ingestionTime?: number;
};
export type LogsResponse = {
  byFunction: Record<string, CloudWatchLogEvent[]>;
  combined: CloudWatchLogEvent[];
};

type State = {
  loadingAnalytics: boolean;
  analyticsError?: string | null;
  analyticsByProject: Record<string, LambdaAnalyticsItem[]>;
  loadingLogs: boolean;
  logsError?: string | null;
  logsByProject: Record<string, LogsResponse>;
};

type Action =
  | { type: "SET_LOADING_ANALYTICS"; value: boolean }
  | { type: "SET_ANALYTICS_ERROR"; error?: string | null }
  | { type: "SET_ANALYTICS"; projectId: string; items: LambdaAnalyticsItem[] }
  | { type: "SET_LOADING_LOGS"; value: boolean }
  | { type: "SET_LOGS_ERROR"; error?: string | null }
  | { type: "SET_LOGS"; projectId: string; logs: LogsResponse };

const initialState: State = {
  loadingAnalytics: false,
  analyticsByProject: {},
  loadingLogs: false,
  logsByProject: {},
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_LOADING_ANALYTICS":
      return { ...state, loadingAnalytics: action.value };
    case "SET_ANALYTICS_ERROR":
      return { ...state, analyticsError: action.error };
    case "SET_ANALYTICS":
      return {
        ...state,
        analyticsByProject: {
          ...state.analyticsByProject,
          [action.projectId]: action.items,
        },
      };
    case "SET_LOADING_LOGS":
      return { ...state, loadingLogs: action.value };
    case "SET_LOGS_ERROR":
      return { ...state, logsError: action.error };
    case "SET_LOGS":
      return {
        ...state,
        logsByProject: {
          ...state.logsByProject,
          [action.projectId]: action.logs,
        },
      };
    default:
      return state;
  }
}

type Ctx = {
  state: State;
  loadAnalytics: (
    projectId: string,
    fns: AwsFunctionRef[],
    opts: { rangeHours?: number; startTime?: number; endTime?: number },
  ) => Promise<void>;
  loadLogs: (
    projectId: string,
    fns: AwsFunctionRef[],
    opts: {
      rangeHours?: number;
      rangeMinutes?: number;
      startTime?: number;
      endTime?: number;
      filterPattern?: string;
      functionName?: string | "ALL";
    },
  ) => Promise<void>;
};

const AwsContext = createContext<Ctx | undefined>(undefined);

function hasApiBase() {
  return !!(API_BASE && API_BASE.trim().length > 0);
}

// Lightweight mock for previews without backend
function mockAnalytics(fns: AwsFunctionRef[]): LambdaAnalyticsItem[] {
  const now = Date.now();
  return fns.map((f, i) => {
    const timestamps = Array.from({ length: 12 }).map(
      (_, j) => now - (12 - j) * 3600_000,
    );
    const invocations = timestamps.map((ts) => ({
      timestamp: ts,
      value: 120 + i * 7 + Math.round(Math.random() * 10),
    }));
    const errors = timestamps.map((ts) => ({
      timestamp: ts,
      value: i % 3 === 0 && Math.random() > 0.7 ? 1 : 0,
    }));
    const throttles = timestamps.map((ts) => ({
      timestamp: ts,
      value: Math.random() > 0.9 ? 1 : 0,
    }));
    const duration = timestamps.map((ts) => ({
      timestamp: ts,
      value: 85 + i * 5 + Math.round(Math.random() * 20),
    }));
    const concurrentExecutions = timestamps.map((ts) => ({
      timestamp: ts,
      value: 5 + i + Math.floor(Math.random() * 5),
    }));

    return {
      ref: f,
      config: {
        FunctionName: f.name,
        FunctionArn: f.arn,
        Runtime: "nodejs18.x",
        Handler: "index.handler",
        MemorySize: 512,
        Timeout: 10,
        LastModified: new Date(now - (i + 1) * 3600_000).toISOString(),
        TracingConfig: { Mode: "PassThrough" },
        Architectures: ["x86_64"],
        PackageType: "Zip",
        EphemeralStorage: { Size: 512 },
        Version: "$LATEST",
      },
      metrics: {
        invocations,
        errors,
        throttles,
        duration,
        concurrentExecutions,
      },
      tags: { service: "mock", env: "preview" },
    };
  });
}

function mockLogs(fns: AwsFunctionRef[]): LogsResponse {
  const byFunction: Record<string, CloudWatchLogEvent[]> = {};
  const base = Date.now();
  for (const f of fns) {
    byFunction[f.name] = Array.from({ length: 12 }).map((_, i) => ({
      id: `${f.name}-${i}`,
      timestamp: base - (12 - i) * 15_000,
      message: `[${f.name}] mock log line ${i + 1}`,
      ingestionTime: base,
    }));
  }
  const combined = Object.values(byFunction)
    .flat()
    .sort((a, b) => a.timestamp - b.timestamp);
  return { byFunction, combined };
}

export function AwsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAnalytics = useCallback(
    async (
      projectId: string,
      fns: AwsFunctionRef[],
      opts: { rangeHours?: number; startTime?: number; endTime?: number },
    ) => {
      if (!fns.length) {
        dispatch({ type: "SET_ANALYTICS", projectId, items: [] });
        return;
      }
      dispatch({ type: "SET_LOADING_ANALYTICS", value: true });
      dispatch({ type: "SET_ANALYTICS_ERROR", error: null });
      try {
        if (API_BASE) {
          // SECURITY: the server resolves the allowed function list from the project's
          // urlsMap; we send projectId (function names are no longer trusted).
          const payload: Record<string, unknown> = { projectId, items: fns };
          if (opts.startTime != null && opts.endTime != null) {
            payload.startTime = opts.startTime;
            payload.endTime = opts.endTime;
          } else {
            payload.rangeHours = opts.rangeHours ?? 24;
          }
          const res = await fetch(`/api/aws/lambda/analytics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok)
            throw new Error(`External analytics request failed: ${res.status}`);
          const data = (await res.json()) as { items: LambdaAnalyticsItem[] };
          dispatch({
            type: "SET_ANALYTICS",
            projectId,
            items: data.items || [],
          });
        } else {
          const items = mockAnalytics(fns);
          dispatch({ type: "SET_ANALYTICS", projectId, items });
        }
      } catch (e: any) {
        const items = mockAnalytics(fns);
        dispatch({ type: "SET_ANALYTICS", projectId, items });
        dispatch({
          type: "SET_ANALYTICS_ERROR",
          error: e?.message || "Failed to load analytics",
        });
      } finally {
        dispatch({ type: "SET_LOADING_ANALYTICS", value: false });
      }
    },
    [],
  );

  const loadLogs = useCallback(
    async (
      projectId: string,
      fns: AwsFunctionRef[],
      opts: {
        rangeHours?: number;
        rangeMinutes?: number;
        startTime?: number;
        endTime?: number;
        filterPattern?: string;
        functionName?: string | "ALL";
      },
    ) => {
      dispatch({ type: "SET_LOADING_LOGS", value: true });
      dispatch({ type: "SET_LOGS_ERROR", error: null });
      const payload = JSON.stringify({
        projectId,
        items: fns,
        rangeHours: opts.rangeHours ?? 6,
        rangeMinutes: opts.rangeMinutes,
        startTime: opts.startTime,
        endTime: opts.endTime,
        filterPattern: opts.filterPattern,
        functionName: opts.functionName || "ALL",
      });
      try {
        if (API_BASE) {
          const res = await fetch(`/api/aws/lambda/logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
          if (!res.ok)
            throw new Error(`External logs request failed: ${res.status}`);
          const logs = (await res.json()) as LogsResponse;
          dispatch({ type: "SET_LOGS", projectId, logs });
        } else {
          dispatch({ type: "SET_LOGS", projectId, logs: mockLogs(fns) });
        }
      } catch (e: any) {
        dispatch({ type: "SET_LOGS", projectId, logs: mockLogs(fns) });
        dispatch({
          type: "SET_LOGS_ERROR",
          error: e?.message || "Failed to load logs",
        });
      } finally {
        dispatch({ type: "SET_LOADING_LOGS", value: false });
      }
    },
    [],
  );

  const value = useMemo<Ctx>(
    () => ({ state, loadAnalytics, loadLogs }),
    [state, loadAnalytics, loadLogs],
  );

  return <AwsContext.Provider value={value}>{children}</AwsContext.Provider>;
}

export function useAws() {
  const ctx = useContext(AwsContext);
  if (!ctx) throw new Error("useAws must be used within AwsProvider");
  return ctx;
}
