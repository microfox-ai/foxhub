"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Activity,
  Info,
  Download,
  FunctionSquare,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Box,
  Plus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PackageStatus } from "@/server/types";
import { MySlackChannels, slackBotSdk } from "@/utils/services/slackBotSdk";
import { toast } from "sonner";

// Interface for package data
interface PackageData {
  name: string;
  icon: string;
  status: PackageStatus
  version: string;
  description: string;
  installs: string;
  inUse: string;
  readme_map: any;
  documentation: string;
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch packages: ${response.statusText}`);
  }
  return response.json();
};

const Status = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    platform: "",
    description: "",
  });

  // Use SWR for data fetching
  const { data, error, isLoading } = useSWR<{ packages: PackageData[] }>(
    "/api/packages",
    fetcher,
    {
      // Refresh data every 5 minutes
      refreshInterval: 300000,
      // Revalidate on focus
      revalidateOnFocus: true,
    }
  );

  console.log("data", data);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Sort packages by status and inUse count
  const sortedPackages = useMemo(() => {
    if (!data?.packages) return [];

    return [...data.packages].sort((a, b) => {
      // Define status priority
      const statusPriority: Record<PackageData["status"], number> = {
        stable: 0,
        external: 1,
        partial: 2,
        oauthConnector: 3,
        semiStable: 4,
        internal: 5,
      };

      // Compare status first
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      // If status is the same, compare inUse count
      const aInUse = a.inUse === "-" ? 0 : parseInt(a.inUse);
      const bInUse = b.inUse === "-" ? 0 : parseInt(b.inUse);
      return bInUse - aInUse; // Sort in descending order
    });
  }, [data?.packages]);

  // Calculate pagination values
  const totalItems = sortedPackages.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentData = sortedPackages.slice(startIndex, endIndex);

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSubmitRequest = async () => {
    try {
      slackBotSdk.sendMessage({
        channel: MySlackChannels.microfox_feedback,
        text: `New platform integration request:
        Platform: ${requestForm.platform}
        Description: ${requestForm.description}
        `
      });

      toast.success("Request submitted", {
        description: "Your request has been received. We'll finish it in 24hrs.",
      });

      setIsDialogOpen(false);
      setRequestForm({ platform: "", description: "" });
      // You might want to add a toast notification here
    } catch (error) {
      console.error("Error submitting request:", error);
      // Handle error (show error message to user)
    }
  };

  return (
    <div className="flex flex-col h-full w-full justify-center items-center">
      <div className="w-full">
        <div className="mx-auto w-full flex items-center justify-tart gap-8 mb-2 sticky top-0 bg-white/20 backdrop-blur-sm z-10 p-6">
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6">
              <Box className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <h1 className="text-2xl font-bold">Status</h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Request Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Request Platform Integration</DialogTitle>
                <DialogDescription>
                  Tell us about the platform you'd like to integrate with our system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="platform">Platform Name</Label>
                  <Input
                    id="platform"
                    value={requestForm.platform}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, platform: e.target.value })
                    }
                    placeholder="e.g., Slack, Discord, GitHub"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={requestForm.description}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, description: e.target.value })
                    }
                    placeholder="Describe what you'd like to achieve with this integration..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitRequest}>Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 animate-spin" />
              <p className="text-lg">Loading package data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <Info className="w-5 h-5" />
            <p>Failed to load package data. Please try again later.</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border max-w-screen-lg mx-auto overflow-y-auto max-h-[80vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Supported Package Name</TableHead>
                    <TableHead className="">Stats</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((item, index) => (
                    <TableRow key={index} className="cursor-pointer">
                      <TableCell>
                        <div className="flex items-start gap-3 p-3">
                          <img
                            src={item.icon}
                            alt=""
                            className="w-10 h-10 rounded-lg"
                          />
                          <div className="space-y-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  item.status === "stable"
                                    ? "success"
                                    : item.status === "external"
                                      ? "default"
                                      : item.status === "partial"
                                        ? "secondary"
                                        : item.status === "oauthConnector"
                                          ? "destructive"
                                          : "secondary"
                                }
                                className={item.status === "stable" ? "text-xs px-1.5 py-0" : ""}
                              >
                                {item.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                v{item.version}
                              </span>
                              <a
                                href={item.documentation}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm cursor-pointer hover:opacity-50 flex items-center gap-1"
                              >
                                <Package className="w-3 h-3" />
                                NPM
                              </a>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="">
                        <div className="flex items-center justify-start gap-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-pointer">
                                  <FunctionSquare className="w-5 h-5 text-muted-foreground" />
                                  <span className="font-medium text-lg">
                                    {item.readme_map?.functionalities?.length}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Available functionalities</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {item.inUse != "-" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-pointer">
                                    <PlayCircle className="w-5 h-5 text-green-500" />
                                    <span className="font-medium text-lg">{item.inUse}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Active instances</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="space-y-2 flex flex-col gap-2">
                          <p className="text-sm text-muted-foreground gap-2 line-clamp-3 whitespace-normal">
                            {item.description}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 max-w-screen-lg mx-auto">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{endIndex} of {totalItems} items
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Status;
