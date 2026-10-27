"use client";

import { useConsole } from "@/components/subapps/console/context/console-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrgMembers } from "@/components/subapps/console/components/org-members";
import Link from "next/link";
import { useParams } from "next/navigation";
import { timeAgo } from "@/lib/utils";
import { Globe, Code, Box, Server, Plus } from "lucide-react";
import {
  ProjectSourceType,
  ProjectTechnologyType,
} from "@/components/subapps/console/lib/console-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function CreateProjectCard() {
  const { createProject } = useConsole();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [technology, setTechnology] = useState(ProjectTechnologyType.NODEJS);
  const [version, setVersion] = useState("18.x");
  const [source, setSource] = useState<ProjectSourceType>(
    ProjectSourceType.LOCAL
  );
  const [repository, setRepository] = useState("");
  const [branch, setBranch] = useState("");
  const [image, setImage] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="flex items-center justify-center h-full w-full cursor-pointer hover:bg-muted/50">
          <div className="text-center">
            <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">New Project</p>
          </div>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            placeholder="Agent Name"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
          />
          <Input
            placeholder="Subdomain"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
          />
          <Select
            value={technology}
            onValueChange={(value) =>
              setTechnology(value as ProjectTechnologyType)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Technology" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ProjectTechnologyType).map((tech) => (
                <SelectItem key={tech} value={tech}>
                  {tech}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <Select
            value={source}
            onValueChange={(value) => setSource(value as ProjectSourceType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Source" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ProjectSourceType).map((src) => (
                <SelectItem key={src} value={src}>
                  {src}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {source === ProjectSourceType.GITHUB && (
            <>
              <Input
                placeholder="Repository URL"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
              />
              <Input
                placeholder="Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </>
          )}
          {source === ProjectSourceType.DOCKER_IMAGE && (
            <Input
              placeholder="Image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          )}
          <Button
            onClick={async () => {
              let sourceData: any = { type: source };
              if (source === ProjectSourceType.GITHUB) {
                sourceData = { ...sourceData, repository, branch };
              } else if (source === ProjectSourceType.DOCKER_IMAGE) {
                sourceData = { ...sourceData, image };
              }
              await createProject({
                displayName,
                technology: { language: technology, version },
                source: sourceData,
                agentName,
                subdomain,
                urlsMap: [],
              });
              setOpen(false);
            }}
          >
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getTechnologyIcon(tech: string) {
  switch (tech) {
    case ProjectTechnologyType.NODEJS:
      return <Code className="w-4 h-4" />;
    case ProjectTechnologyType.PYTHON:
      return <Code className="w-4 h-4" />;
    case ProjectTechnologyType.GO:
      return <Code className="w-4 h-4" />;
    case ProjectTechnologyType.RUBY:
      return <Code className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
}

function ProjectsBody() {
  const { state } = useConsole();
  const params = useParams();
  const organizationId = params.organizationId as string;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{"Projects"}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.loadingProjects && state.projects.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={`sk-${i}`}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))
          : null}
        {state.projects.map((p) => (
          <Link
            href={`/dashboard/${organizationId}/${p.id}`}
            key={p.id}
          >
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar>
                  <AvatarFallback>{p.agentName.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-base">{p.displayName}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  {getTechnologyIcon(p.technology.language)}
                  <span>
                    {p.technology.language} v{p.technology.version}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  <span>Source: {p.source.type}</span>
                </div>
                <p className="mt-2 text-xs">
                  Updated {timeAgo(p.updatedAt.toString())}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        <CreateProjectCard />
      </div>
      <OrgMembers organizationId={organizationId} />
    </div>
  );
}

export default function OrganizationPage() {
  return <ProjectsBody />;
}
