"use client";

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Image as ImageIcon,
    Video as VideoIcon,
    Settings,
    ChartBar,
    Heading1,
    FileText,
    List,
    Tag,
    Image,
    Video,
    Code2,
    Wrench,
    Edit,
} from "lucide-react";
import { useForm } from "react-hook-form";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useClientProject } from "../../providers/ClientProjectProvider";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import isEqual from "lodash/isEqual";
import { EnvVariablesDialog } from "../configuration/EnvVariablesDialog";
import { ExtraEnvVariable } from "@/server/convertfox/types";

const STATUS_OPTIONS = [
    { value: "UNPUBLISHED", label: "Unpublished" },
    { value: "PUBLISHED", label: "Published" },
];

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    miniDescription: z.string().min(1, "Mini description is required"),
    description: z.string().min(1, "Description is required"),
    status: z.enum(["PUBLISHED", "UNPUBLISHED"]),
    category: z.array(z.string()),
    version: z.string().min(1, "Version is required"),
    versionNumber: z.string().min(1, "Version number is required"),
    thumbnail_url: z.string().nullable(),
    banner_url: z.string().nullable(),
    video_url: z
        .string()
        .nullable()
        .refine(
            (url) => {
                if (!url) return true;
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            },
            {
                message: "Please enter a valid URL (e.g., https://example.com/video.mp4)",
            }
        ),
});

type FormValues = z.infer<typeof formSchema>;

const PublishTab = () => {
    const params = useParams();
    const { selectedRequest } = useClientProject();
    const { taskInstanceMeta, updateTaskInstanceMeta } = useTaskInstanceMetaContext();
    const [uploading, setUploading] = React.useState(false);
    const [categoryInput, setCategoryInput] = React.useState("");
    const [saving, setSaving] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState("details");
    const [initialValues, setInitialValues] = React.useState<FormValues | null>(null);
    const [showEnvDialog, setShowEnvDialog] = React.useState(false);
    const [isPublishing, setIsPublishing] = React.useState(false);

    const publishTabs = [
        {
            label: "Details",
            value: "details",
            icon: <Settings className="h-4 w-4 mr-2" />,
        },
        {
            label: "Media",
            value: "media",
            icon: <ImageIcon className="h-4 w-4 mr-2" />,
        },
        {
            label: "Version",
            value: "version",
            icon: <ChartBar className="h-4 w-4 mr-2" />,
        },
        {
            label: "Configuration",
            value: "configuration",
            icon: <Wrench className="h-4 w-4 mr-2" />,
        },
    ];

    const { data: shardPage, error, isLoading, mutate } = useSWR(
        selectedRequest ? `/api/shard-page?clientRequestId=${selectedRequest?.id}` : null,
        async (url) => {
            const res = await fetch(url);
            const data = await res.json();
            return data[0];
        }
    );


    const hasVersionUpdate = React.useMemo(() => {
        if (shardPage && taskInstanceMeta) {
            const shardMeta = shardPage.taskInstanceMeta;
            const currentMeta = taskInstanceMeta;

            return !isEqual(shardMeta, currentMeta);
        }
        return false;
    }, [shardPage, taskInstanceMeta]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            miniDescription: "",
            status: "UNPUBLISHED",
            category: [],
            version: "",
            versionNumber: "",
            thumbnail_url: null,
            banner_url: null,
            video_url: null,
        },
    });

    // Track form changes
    const hasChanges = React.useMemo(() => {
        if (!initialValues) return false;
        const currentValues = form.getValues();
        return !isEqual(initialValues, currentValues);
    }, [form.watch(), initialValues]);

    useEffect(() => {
        if (shardPage) {
            const values = {
                title: shardPage.title || "",
                description: shardPage.description || "",
                miniDescription: shardPage.miniDescription || "",
                status: shardPage.status,
                category: shardPage.category || [],
                version: shardPage.version,
                versionNumber: shardPage.versionNumber,
                thumbnail_url: shardPage.thumbnail_url,
                banner_url: shardPage.banner_url,
                video_url: shardPage.video_url,
            };
            form.reset(values);
            setInitialValues(values);
        }
    }, [shardPage, form]);

    const handleStartPublishing = async () => {
        setIsPublishing(true);
        try {
            const emptyShardPage = {
                title: selectedRequest?.title,
                description: "",
                miniDescription: "",
                status: "UNPUBLISHED",
                category: [],
                version: "1.0.0",
                versionNumber: "1",
                thumbnail_url: null,
                banner_url: null,
                video_url: null,
                clientRequestId: selectedRequest?.id,
            };

            const res = await fetch("/api/shard-page", {
                method: "POST",
                body: JSON.stringify(emptyShardPage),
            });

            if (!res.ok) {
                toast.error("Failed to start publishing workflow. Please try again.");
                return;
            }

            const data = await res.json();

            console.log("data", data);

            // Mutate the SWR cache with the empty shard page
            await mutate();
        } catch (error) {
            console.error("Error starting publishing workflow:", error);
            toast.error("Failed to start publishing workflow. Please try again.");
        } finally {
            setIsPublishing(false);
        }
    };

    // Handle category add/remove
    const addCategory = () => {
        if (
            categoryInput.trim() &&
            !form.getValues("category").includes(categoryInput.trim())
        ) {
            const currentCategories = form.getValues("category");
            form.setValue("category", [...currentCategories, categoryInput.trim()]);
            setCategoryInput("");
        }
    };

    const removeCategory = (cat: string) => {
        const currentCategories = form.getValues("category");
        form.setValue(
            "category",
            currentCategories.filter((c) => c !== cat)
        );
    };

    // File upload handler
    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: "thumbnail" | "banner" | "video"
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", "demo-user"); // Replace with real userId
        formData.append("folderName", "shardPages");
        const toastId = toast.loading("Uploading...");
        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success && data.media?.[0]?.mediaUrl) {
                if (type === "thumbnail")
                    form.setValue("thumbnail_url", data.media[0].mediaUrl);
                if (type === "banner")
                    form.setValue("banner_url", data.media[0].mediaUrl);
                if (type === "video")
                    form.setValue("video_url", data.media[0].mediaUrl);
                toast.success(
                    `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`,
                    {
                        id: toastId,
                    }
                );
            } else {
                toast.error(`Failed to upload ${type}. Please try again.`, {
                    id: toastId,
                });
            }
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            toast.error(`Failed to upload ${type}. Please try again.`, {
                id: toastId,
            });
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async ({ version, versionNumber, ...values }: FormValues) => {
        setSaving(true);
        const toastId = toast.loading(shardPage ? "Updating shard..." : "Publishing shard...");
        try {
            const response = await fetch("/api/shard-page", {
                method: shardPage ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...(shardPage && { id: shardPage.id }),
                    ...values,
                    clientRequestId: selectedRequest?.id,
                }),
            });

            if (!response.ok) {
                throw new Error(shardPage ? "Failed to update shard" : "Failed to publish shard");
            }

            toast.success(
                shardPage ? "Sahrd updated successfully!" : "Sahrd published successfully!",
                {
                    id: toastId,
                }
            );
        } catch (error) {
            console.error("Error publishing shard:", error);
            toast.error(
                shardPage ? "Failed to update shard. Please try again." : "Failed to publish shard. Please try again.",
                {
                    id: toastId,
                }
            );
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container px-5 py-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                    <div className="space-y-4">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!shardPage) {
        return (
            <div className="container px-5 py-6">
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4">Publish Your Workflow</h2>
                    <p className="text-gray-500 mb-8">
                        Share your workflow with the community by publishing it to the store.
                    </p>
                    <Button
                        onClick={handleStartPublishing}
                        className="px-8 py-2 text-base font-semibold"
                        disabled={isPublishing}
                    >
                        {isPublishing ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Starting Publishing...
                            </div>
                        ) : (
                            "Start Publishing"
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container px-5 ">
            {/* Header Section */}
            <div className="w-full h-[calc(100vh-10rem)] overflow-y-auto">
                <Tabs onValueChange={(value) => setActiveTab(value)} orientation="vertical" defaultValue="details" className="grid grid-cols-12 max-w-6xl mx-auto h-full">
                    <div className="sticky top-4 col-span-2 h-fit">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="col-span-2 h-full"
                        >
                            <TabsList className="flex flex-col items-start w-full gap-2 h-fit p-2">
                                {publishTabs.map((tab) => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="transition-all duration-200 hover:scale-105 w-full justify-start"
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {hasChanges && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-4 px-2"
                                >
                                    <Button
                                        type="submit"
                                        disabled={uploading || saving}
                                        className="w-full px-8 py-2 text-base font-semibold"
                                        onClick={form.handleSubmit(onSubmit)}
                                    >
                                        {saving ? "Saving..." : shardPage?.id ? "Save Changes" : "Create Shard"}
                                    </Button>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="col-span-10 mb-20 m-4"
                    >
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="max-w-3xl mr-auto bg-white px-8 py-4 pl-0"
                            >
                                <TabsContent value="details">
                                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-8 gap-y-6 items-start">
                                        {hasVersionUpdate && (
                                            <div className="col-span-2 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-blue-700">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                        <p className="font-medium">Task details have been updated</p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (taskInstanceMeta?.taskInfo) {
                                                                form.setValue("title", taskInstanceMeta.taskInfo.name || "");
                                                                form.setValue("miniDescription", taskInstanceMeta.taskInfo.goal || "");
                                                                form.setValue("description", taskInstanceMeta.taskInfo.summary || "");
                                                            }
                                                        }}
                                                    >
                                                        Update from Task
                                                    </Button>
                                                </div>
                                                <p className="mt-2 text-sm text-blue-600">
                                                    The task details have been modified. You can update the title and description from the task.
                                                </p>
                                            </div>
                                        )}
                                        {/* Status */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Settings className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Status</FormLabel>
                                            </div>
                                            {taskInstanceMeta?.taskInfo?.name && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const name = taskInstanceMeta?.taskInfo?.name;
                                                        if (name) form.setValue("title", name);
                                                    }}
                                                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                                >
                                                    Reset from task
                                                </button>
                                            )}
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {STATUS_OPTIONS.map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Title */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Heading1 className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Title</FormLabel>
                                            </div>
                                            {taskInstanceMeta?.taskInfo?.name && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const name = taskInstanceMeta?.taskInfo?.name;
                                                        if (name) form.setValue("title", name);
                                                    }}
                                                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                                >
                                                    Reset from task
                                                </button>
                                            )}
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input {...field} placeholder="Enter title" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Mini Description */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Mini Description</FormLabel>
                                            </div>
                                            {taskInstanceMeta?.taskInfo?.goal && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const goal = taskInstanceMeta?.taskInfo?.goal;
                                                        if (goal) form.setValue("miniDescription", goal);
                                                    }}
                                                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                                >
                                                    Reset from task
                                                </button>
                                            )}
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="miniDescription"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Textarea
                                                            {...field}
                                                            placeholder="Enter a brief description (max 200 characters)"
                                                            className="max-h-[100px] overflow-y-auto resize-none"
                                                            maxLength={200}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Description */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <List className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Description</FormLabel>
                                            </div>
                                            {taskInstanceMeta?.taskInfo?.summary && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const summary = taskInstanceMeta?.taskInfo?.summary;
                                                        if (summary) form.setValue("description", summary);
                                                    }}
                                                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                                >
                                                    Reset from task
                                                </button>
                                            )}
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Textarea
                                                            {...field}
                                                            placeholder="Enter description"
                                                            className="max-h-[200px] overflow-y-auto resize-none"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Category */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Tag className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Category</FormLabel>
                                            </div>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div>
                                                        <div className="flex gap-2 mb-2 flex-wrap">
                                                            {field?.value?.map((cat) => (
                                                                <Badge
                                                                    key={cat}
                                                                    className="flex items-center gap-1 bg-gray-100 text-gray-700"
                                                                >
                                                                    {cat}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeCategory(cat)}
                                                                        className="ml-1 text-xs"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={categoryInput}
                                                                onChange={(e) => setCategoryInput(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        e.preventDefault();
                                                                        addCategory();
                                                                    }
                                                                }}
                                                                placeholder="Add category"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={addCategory}
                                                                size="icon"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="media">
                                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-8 gap-y-6 items-start">
                                        {/* Thumbnail Upload */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Image className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Thumbnail</FormLabel>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-1 mb-2">
                                                Add a thumbnail image that represents your workflow (recommended size: 300×300px)
                                            </span>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="thumbnail_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center border rounded-lg bg-white p-4 gap-4 max-w-lg">
                                                        {/* Image Preview */}
                                                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                                                            {field.value ? (
                                                                <img
                                                                    src={field.value}
                                                                    alt="Preview"
                                                                    className="object-cover w-full h-full"
                                                                />
                                                            ) : (
                                                                <ImageIcon className="w-8 h-8 text-gray-400" />
                                                            )}
                                                        </div>
                                                        {/* Text and Button */}
                                                        <div className="flex-1 flex flex-col gap-2">
                                                            <div>
                                                                <div className="font-semibold">
                                                                    Upload a thumbnail image
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    SVG, PNG, JPG or GIF (max. 250px x 250px)
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    id="thumbnail-upload"
                                                                    onChange={(e) => handleFileUpload(e, "thumbnail")}
                                                                />
                                                                <label htmlFor="thumbnail-upload">
                                                                    <Button
                                                                        asChild
                                                                        variant="outline"
                                                                        className="border-black text-black hover:bg-black hover:text-white transition-colors"
                                                                        disabled={uploading}
                                                                    >
                                                                        <span>Choose Image</span>
                                                                    </Button>
                                                                </label>
                                                                {field.value && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => field.onChange("")}
                                                                        className="text-gray-500 hover:text-gray-700"
                                                                    >
                                                                        Clear
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Banner Upload */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Image className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Banner</FormLabel>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-1 mb-2">
                                                Add a banner image for your workflow's header (recommended size: 1200×300px)
                                            </span>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="banner_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center border rounded-lg bg-white p-4 gap-4 max-w-lg">
                                                        {/* Image Preview */}
                                                        <div className="w-32 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                                                            {field.value ? (
                                                                <img
                                                                    src={field.value}
                                                                    alt="Preview"
                                                                    className="object-cover w-full h-full"
                                                                />
                                                            ) : (
                                                                <ImageIcon className="w-6 h-6 text-gray-400" />
                                                            )}
                                                        </div>
                                                        {/* Text and Button */}
                                                        <div className="flex-1 flex flex-col gap-2">
                                                            <div>
                                                                <div className="font-semibold">
                                                                    Upload a banner image
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    SVG, PNG, JPG or GIF (max. 1200×300px)
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    id="banner-upload"
                                                                    onChange={(e) => handleFileUpload(e, "banner")}
                                                                />
                                                                <label htmlFor="banner-upload">
                                                                    <Button
                                                                        asChild
                                                                        variant="outline"
                                                                        className="border-black text-black hover:bg-black hover:text-white transition-colors"
                                                                        disabled={uploading}
                                                                    >
                                                                        <span>Choose Image</span>
                                                                    </Button>
                                                                </label>
                                                                {field.value && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => field.onChange("")}
                                                                        className="text-gray-500 hover:text-gray-700"
                                                                    >
                                                                        Clear
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Video Upload */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Video className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Youtube Video</FormLabel>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-1 mb-2">
                                                Add a youtube video for your shard explaining how it works, and why its awesome. (e.g. YouTube, Vimeo, etc.)
                                            </span>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="video_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                value={field.value ?? ""}
                                                                onChange={(e) => {
                                                                    field.onChange(e.target.value);
                                                                }}
                                                                placeholder="Paste video URL (e.g. https://youtube.com/...)"
                                                                className="flex-1"
                                                            />
                                                            {field.value && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => field.onChange("")}
                                                                >
                                                                    Clear
                                                                </Button>
                                                            )}
                                                        </div>
                                                        {field.value && (
                                                            <div className="text-xs text-gray-500">
                                                                {field.value.startsWith("http")
                                                                    ? "Video URL is set"
                                                                    : "Please enter a valid URL starting with http:// or https://"}
                                                            </div>
                                                        )}
                                                        {field.value && field.value.includes("youtube.com/watch?v=") && (
                                                            <div className="relative aspect-video w-full mt-2 rounded-lg overflow-hidden border">
                                                                <iframe
                                                                    className="w-full h-full"
                                                                    src={field.value.replace("watch?v=", "embed/")}
                                                                    title="YouTube video player"
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                    allowFullScreen
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="version">
                                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-8 gap-y-6 items-start">
                                        {hasVersionUpdate && (
                                            <div className="col-span-2 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-blue-700">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                    <p className="font-medium">New version available</p>
                                                </div>
                                                <p className="mt-2 text-sm text-blue-600">
                                                    Changes have been detected in your workflow. A new version will be created when you publish.
                                                </p>
                                            </div>
                                        )}
                                        {/* Version */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Code2 className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Version</FormLabel>
                                            </div>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="version"
                                            disabled={true}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input {...field} disabled placeholder="Enter version" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Version Number */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Code2 className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Version Number</FormLabel>
                                            </div>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            disabled={true}
                                            name="versionNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input {...field} disabled placeholder="Enter version number" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="configuration">
                                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-8 gap-y-6 items-start">
                                        {hasVersionUpdate && (
                                            <div className="col-span-2 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-blue-700">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                    <p className="font-medium">Configuration has been updated</p>
                                                </div>
                                                <p className="mt-2 text-sm text-blue-600">
                                                    Changes have been detected in your configuration. A new version will be created when you publish.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-1 col-span-2">
                                            <div className="flex items-center gap-2">
                                                <Settings className="h-4 w-4 text-gray-500" />
                                                <FormLabel className="font-medium">Configure Variables</FormLabel>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-1 mb-2">
                                                Configure how the reuire variables should be collected from the user when he install this shard.
                                            </span>
                                        </div>
                                        <div className="space-y-4 col-span-2">
                                            <div className="rounded-sm border border-gray-200 flex flex-col gap-2">
                                                {taskInstanceMeta?.taskRequiredInfo?.customEnvVariables && taskInstanceMeta.taskRequiredInfo.customEnvVariables.length > 0 ? (
                                                    <ul className="flex flex-wrap gap-4 p-4">
                                                        {taskInstanceMeta.taskRequiredInfo.customEnvVariables.map((env: ExtraEnvVariable) => (
                                                            <li key={env.env}
                                                                className="cursor-pointer h-fit flex justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-50">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-xs text-gray-900">{env.name || env.env}</span>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={() => setShowEnvDialog(true)}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="p-4 text-center text-gray-500">
                                                        No environment variables configured
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </form>
                        </Form>
                    </motion.div>
                </Tabs>
            </div>

            <EnvVariablesDialog
                isOpen={showEnvDialog}
                onClose={() => setShowEnvDialog(false)}
                envVariables={taskInstanceMeta?.taskRequiredInfo?.customEnvVariables || []}
                onSave={async (values) => {
                    if (!taskInstanceMeta) return;
                    await updateTaskInstanceMeta({
                        ...taskInstanceMeta,
                        taskRequiredInfo: {
                            ...taskInstanceMeta.taskRequiredInfo,
                            customEnvVariables: taskInstanceMeta.taskRequiredInfo?.customEnvVariables || []
                        }
                    });
                    setShowEnvDialog(false);
                }}
                initialValues={{}}
            />
        </div>
    );
};

export default PublishTab;

