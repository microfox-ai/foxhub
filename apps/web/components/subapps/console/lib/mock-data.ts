"use client"

import { ProjectRuntimeType, ProjectSourceType, ProjectTechnologyType, type DeploymentDto, type DeploymentLogsDto, type OrganizationDto, type ProjectDto } from "@/components/subapps/console/lib/console-api"

const staticUserId = "df19ddf5-2db0-441c-91bf-bd11c676b6a9"

// Example data from the prompt adapted to our DTO shapes
export const mockOrganizations: OrganizationDto[] = [
  {
    _id: "6895b2fdddbb9f35c97988e9",
    name: "Microfox",
    description: "Microfox Org",
    avatar: "/organization-avatar.png",
    ownerId: staticUserId,
    members: [staticUserId],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const mockProjects: ProjectDto[] = [
  {
    _id: "6895b2fdddbb9f35c97988ea",
    name: "hello-world-api",
    organizationId: "6895b2fdddbb9f35c97988e9",
    userId: staticUserId,
    source: { type: ProjectSourceType.LOCAL },
    technology: { language: ProjectTechnologyType.NODEJS, version: "18.x", isTypeSafe: true },
    runtimes: [
      {
        type: ProjectRuntimeType.SERVERLESS,
        provider: "aws",
        region: "us-east-1",
        memory: 512,
        functions: [
          {
            name: "reply-bots-prod-getDocs",
            arn: "arn:aws:lambda:us-east-1:035837222000:function:reply-bots-prod-getDocs",
            region: "us-east-1",
          },
          {
            name: "reply-bots-prod-sendTemplateEmail",
            arn: "arn:aws:lambda:us-east-1:035837222000:function:reply-bots-prod-sendTemplateEmail",
            region: "us-east-1",
          },
        ],
      },
    ],
    services: [
      {
        type: "api",
        framework: "express",
        endpoints: [
          { path: "/send-template-email", method: "POST" },
          { path: "/send-bulk-template-email", method: "POST" },
          { path: "/send-text-email", method: "POST" },
          { path: "/send-html-email", method: "POST" },
        ],
        openapiUri: "https://3lpj8yeqcg.execute-api.us-east-1.amazonaws.com/prod/docs.json",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function makeLogs(prefix: string): DeploymentLogsDto {
  const now = Date.now()
  const mk = (n: number, step: string) =>
    Array.from({ length: n }).map((_, i) => ({
      timestamp: new Date(now - (n - i) * 1000).toISOString(),
      message: `${step.toUpperCase()} ${prefix} line ${i + 1} - all good`,
    }))
  return {
    compiling: mk(6, "compiling"),
    deploying: mk(8, "deploying"),
    post_deployment: mk(4, "post_deployment"),
  }
}

export const mockDeploymentsByProject: Record<string, DeploymentDto[]> = {
  ["6895b2fdddbb9f35c97988ea"]: [
    {
      _id: "dpl_001",
      projectId: "6895b2fdddbb9f35c97988ea",
      organizationId: "6895b2fdddbb9f35c97988e9",
      userId: staticUserId,
      status: "completed",
      baseUrl: "https://reply-bots.microfox.app",
      metrics: {
        timing: {
          startTime: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          endTime: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
          totalDurationMs: 2 * 60 * 1000,
          stepDurationsMs: { compiling: 30_000, deploying: 60_000, post_deployment: 30_000 },
        },
        resources: { cpu: { peakPercent: 82, averagePercent: 41 }, memory: { peakMb: 512, averageMb: 320 } },
        network: { deploymentDataTransfer: { ingressMb: 45, egressMb: 12 } },
      },
      createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    },
    {
      _id: "dpl_002",
      projectId: "6895b2fdddbb9f35c97988ea",
      organizationId: "6895b2fdddbb9f35c97988e9",
      userId: staticUserId,
      status: "deploying",
      baseUrl: undefined,
      metrics: {
        timing: {
          startTime: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          totalDurationMs: undefined,
          stepDurationsMs: { compiling: 25_000, deploying: 30_000 },
        },
      },
      createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
}

export const mockLogsByDeployment: Record<string, DeploymentLogsDto> = {
  dpl_001: makeLogs("#1"),
  dpl_002: makeLogs("#2"),
}
