"use client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Skeleton } from "@mui/material";
import { BotProject } from "@prisma/client";
import { CommandInput } from "cmdk";
import {
  ChevronRight,
  ChevronsUpDown,
  CircleChevronRightIcon,
  CircleDotIcon,
  CirclePlusIcon,
  DotIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import NewProjectCreation from "./NewProjectCreation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/AuthProvider";

export const ProjectDropdown = ({
  className,
  isCollapsed,
}: {
  className?: string;
  isCollapsed?: boolean;
}) => {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const { user } = useAuth();
  const router = useRouter();

  const params = useParams<{
    project_id?: string;
  }>();
  const projectParamId = params?.project_id;

  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const {
    data: projects,
    error,
    isLoading,
  } = useSWR<BotProject[], any, string | null>(
    user?.id ? `/api/bot-project?userId=${user?.id}` : null,
    async (url) => await fetch(url).then((res) => res.json())
  );

  //console.log("projects", projects);
  useEffect(() => {
    if (projectParamId) {
      const project = projects?.find((p: any) => p.id === projectParamId);
      setSelectedProject(project);
      setValue(projectParamId);
    } else {
      setSelectedProject(null);
      setValue("");
    }
  }, [projectParamId, projects]);

  if (isLoading || !projects || !user) {
    return (
      <Skeleton
        variant="rectangular"
        className="w-[200px] rounded-full"
        height={40}
      />
    );
  }
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div
        className={cn(
          "flex items-center justify-between text-sm w-[200px]",
          className
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className="w-full">
            {!isCollapsed ? (
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between border border-neutral-100 rounded-lg  p-2 px-4 flex items-center "
              >
                {value
                  ? projects?.find((_project) => _project.id === value)?.name
                  : "Select project..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="outline" className="w-fit">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-white !text-black border border-gray-300 text-xs rounded-full"
                  sideOffset={10}
                  showArrow={false}
                >
                  <p>Select Project</p>
                </TooltipContent>
              </Tooltip>
            )}
          </PopoverTrigger>
          <PopoverContent
            className="w-[200px] p-1"
            side={isCollapsed ? "right" : "bottom"}
            sideOffset={isCollapsed ? 16 : 0}
            align={isCollapsed ? "end" : "start"}
          >
            <Command>
              <CommandInput
                // value={search}
                // onInputCapture={(e) => {
                //     setSearch(e.target.value)
                // }}
                className="outline-none p-2"
                placeholder="Search projects..."
              />
              <CommandList>
                <CommandEmpty>No projects found.</CommandEmpty>
                <CommandGroup>
                  {projects?.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.id}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? "" : currentValue);
                        setOpen(false);
                        if (selectedProject?.id !== currentValue) {
                          setSelectedProject(
                            projects.find(
                              (_project) => _project.id === currentValue
                            )
                          );
                          router.push(`/project/${currentValue}`);
                        }
                      }}
                      className={`${value === project.id ? "font-bold" : ""}`}
                    >
                      <ChevronRight
                        className={cn(
                          "h-4 w-4",
                          value === project.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {project.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <DialogTrigger className="w-full flex">
                  <div
                    onClick={() => setOpen(false)}
                    className="flex opacity-[0.5] items-center py-2 flex-1 justify-start gap-2 px-2 text-sm mx-1 mb-1"
                  >
                    <CirclePlusIcon className="h-4 w-4" />
                    New Project
                  </div>
                </DialogTrigger>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <DialogContent>
        <DialogTitle className="sr-only">Create a new project</DialogTitle>
        <NewProjectCreation
          userId={user?.id}
          onProjectCreated={(newProject) => {
            setSelectedProject(newProject);
            setDialogOpen(false);
            router.push(
              `/project/${newProject.id}/request/${newProject.clientRequests[0].id}`
            );
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
