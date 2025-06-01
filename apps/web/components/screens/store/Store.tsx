/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { motion } from "framer-motion";
import {
  Search,
  Grid as GridIcon,
  List as ListIcon,
  Edit,
  Check,
  ChevronsUpDown,
  Package,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ShardViewDialog from "./ShardViewDialog";
import { ShardPage } from "@prisma/client";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "ai", label: "AI & Machine Learning" },
  { value: "automation", label: "Automation" },
  { value: "productivity", label: "Productivity" },
  { value: "development", label: "Development" },
  { value: "utilities", label: "Utilities" },
];

const Store = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [shardPages, setShardPages] = useState<ShardPage[]>([]);
  const [userShardPages, setUserShardPages] = useState<ShardPage[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "you">("all");
  const [selectedShard, setSelectedShard] = useState<ShardPage | null>(null);

  useEffect(() => {
    const fetchShardPages = async () => {
      setLoading(true);
      try {
        const urlWithQuery =
          activeTab === "all" ? "?status=PUBLISHED" : `?userId=${user?.id}`;
        const response = await fetch(`/api/shard-page${urlWithQuery}`);
        const data = await response.json();
        setShardPages(data);

        if (user) {
          const userShards = data.filter(
            (shard: ShardPage) => shard.creatorId === user.id
          );
          setUserShardPages(userShards);
        }
      } catch (error) {
        console.error("Error fetching shard pages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShardPages();
  }, [user, activeTab]);

  const filteredShardPages = useMemo(() => {
    return shardPages.filter((shard) => {
      const matchesSearch =
        shard.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shard.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || shard.category.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [shardPages, searchQuery, selectedCategory]);

  const userPublishedApps = useMemo(() => {
    return userShardPages.filter((shard) => shard.status === "PUBLISHED");
  }, [userShardPages]);

  const userUnpublishedApps = useMemo(() => {
    return userShardPages.filter((shard) => shard.status === "UNPUBLISHED");
  }, [userShardPages]);

  const ShardCard = ({ shard }: { shard: ShardPage }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="h-full flex flex-col pt-0 pb-4 overflow-hidden relative group hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
        onClick={() => setSelectedShard(shard)}
      >
        <div className="relative aspect-video overflow-hidden">
          {shard.banner_url ? (
            <img
              src={shard.banner_url}
              alt={shard.title ?? ""}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          )}
        </div>
        <CardContent className="flex-grow px-4">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-lg font-semibold">
              {shard.title}{" "}
              <span className="px-2 w-fit py-1 bg-blue-50 text-blue-500 text-xs rounded-full border border-blue-100">
                v{shard.version}
              </span>
            </CardTitle>
          </div>
          <CardDescription className="line-clamp-3 mb-4">
            {shard.description}
          </CardDescription>
        </CardContent>

        <CardFooter className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {(shard as any)?.creator?.avatar ? (
              <img
                src={(shard as any)?.creator?.avatar}
                alt={(shard as any)?.creator?.name}
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="text-sm text-gray-500">
              {(shard as any)?.creator?.name}
            </span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">No apps found</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );

  return (
    <div className="container px-5 py-6">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Store</h2>
        <p className="text-sm text-gray-500">
          Discover and deploy powerful AI-powered applications
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-4">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "all" | "you")}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="you">You</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex justify-end items-center gap-4">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-[200px] justify-between"
                >
                  {categories.find(
                    (category) => category.value === selectedCategory
                  )?.label || "Select category"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandGroup>
                    {categories.map((category) => (
                      <CommandItem
                        key={category.value}
                        value={category.value}
                        onSelect={(currentValue) => {
                          setSelectedCategory(
                            currentValue === selectedCategory
                              ? "all"
                              : currentValue
                          );
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCategory === category.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {category.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <GridIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[calc(100dvh-12rem)] overflow-y-auto">
        {activeTab === "all" ? (
          <>
            {/* All Applications Grid */}
            <div>
              <h2 className="text-2xl mb-4 text-gray-800 font-bold">
                All Applications
              </h2>

              {filteredShardPages.length === 0 && (
                <EmptyState message="No apps found" />
              )}
              {filteredShardPages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {loading
                    ? Array.from(new Array(8)).map((_, index) => (
                        <Card key={index} className="h-full">
                          <Skeleton className="aspect-video w-full" />
                          <CardContent className="p-4">
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-full mb-4" />
                            <div className="flex gap-2">
                              <Skeleton className="h-6 w-20" />
                              <Skeleton className="h-6 w-20" />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    : filteredShardPages.map((shard) => (
                        <ShardCard key={shard.id} shard={shard} />
                      ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {/* Published Apps Section */}
            <div>
              <h2 className="text-2xl mb-4 text-gray-800 font-bold">
                Published
              </h2>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from(new Array(4)).map((_, index) => (
                    <Card key={index} className="h-full">
                      <Skeleton className="aspect-video w-full" />
                      <CardContent className="p-4">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : userPublishedApps.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {userPublishedApps.map((shard) => (
                    <ShardCard key={shard.id} shard={shard} />
                  ))}
                </div>
              ) : (
                <EmptyState message="You haven't published any apps yet. Start by creating your first app!" />
              )}
            </div>

            {/* Unpublished Apps Section */}
            <div>
              <h2 className="text-2xl mb-4 text-gray-800 font-bold">
                Unpublished
              </h2>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from(new Array(4)).map((_, index) => (
                    <Card key={index} className="h-full">
                      <Skeleton className="aspect-video w-full" />
                      <CardContent className="p-4">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : userUnpublishedApps.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {userUnpublishedApps.map((shard) => (
                    <ShardCard key={shard.id} shard={shard} />
                  ))}
                </div>
              ) : (
                <EmptyState message="You don't have any unpublished apps." />
              )}
            </div>
          </div>
        )}
      </div>

      <ShardViewDialog
        shard={selectedShard}
        isOpen={!!selectedShard}
        onClose={() => setSelectedShard(null)}
      />
    </div>
  );
};

export default Store;
