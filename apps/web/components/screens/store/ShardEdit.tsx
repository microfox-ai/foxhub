/* eslint-disable @next/next/no-img-element */
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
  UploadCloud,
  Image as ImageIcon,
  Video as VideoIcon,
} from "lucide-react";
import Image from "next/image";
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

const STATUS_OPTIONS = [
  { value: "UNPUBLISHED", label: "Unpublished" },
  { value: "PUBLISHED", label: "Published" },
];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
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
        if (!url) return true; // Allow null/empty values
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      {
        message:
          "Please enter a valid URL (e.g., https://example.com/video.mp4)",
      }
    ),
});

type FormValues = z.infer<typeof formSchema>;

const ShardEdit = ({ shardPageId }: { shardPageId: string }) => {
  const [uploading, setUploading] = React.useState(false);
  const [categoryInput, setCategoryInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "UNPUBLISHED",
      category: [],
      version: "",
      versionNumber: "",
      thumbnail_url: null,
      banner_url: null,
      video_url: null,
    },
  });

  useEffect(() => {
    const fetchShardPage = async () => {
      try {
        const response = await fetch(`/api/shard-page?id=${shardPageId}`);
        const data = await response.json();
        if (data && data[0]) {
          const shard = data[0];
          form.reset({
            title: shard.title,
            description: shard.description,
            status: shard.status,
            category: shard.category || [],
            version: shard.version,
            versionNumber: shard.versionNumber,
            thumbnail_url: shard.thumbnail_url,
            banner_url: shard.banner_url,
            video_url: shard.video_url,
          });
        }
      } catch (error) {
        console.error("Error fetching shard page:", error);
      }
    };

    fetchShardPage();
  }, [shardPageId, form]);

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

  const onSubmit = async (values: FormValues) => {
    console.log(values);
    setSaving(true);
    const toastId = toast.loading("Saving changes...");
    try {
      const response = await fetch("/api/shard-page", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: shardPageId,
          ...values,
          thumbnail_url: values.thumbnail_url,
          banner_url: values.banner_url,
          video_url: values.video_url,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update shard page");
      }

      toast.success("Shard page updated successfully!", {
        id: toastId,
      });
    } catch (error) {
      console.error("Error updating shard page:", error);
      toast.error("Failed to update shard page. Please try again.", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container px-5 py-6">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Edit Workflow</h2>
        <p className="text-sm text-gray-500">
          Discover and deploy powerful AI-powered applications
        </p>
      </div>
      <div className="w-full h-[calc(100vh-10rem)] overflow-y-auto">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="max-w-3xl mr-auto bg-white p-8 pl-0"
          >
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-8 gap-y-6 items-start">
              {/* Status */}
              <FormLabel className="font-medium ">Status</FormLabel>
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
              <FormLabel className="font-medium ">Title</FormLabel>
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

              {/* Description */}
              <FormLabel className="font-medium ">Description</FormLabel>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter description"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormLabel className="font-medium ">Category</FormLabel>
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

              {/* Version */}
              <FormLabel className="font-medium ">Version</FormLabel>
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} placeholder="Enter version" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Version Number */}
              <FormLabel className="font-medium ">Version Number</FormLabel>
              <FormField
                control={form.control}
                name="versionNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} placeholder="Enter version number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Thumbnail Upload */}
              <FormLabel className="font-medium ">Thumbnail</FormLabel>
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
                            Upload a category image
                          </div>
                          <div className="text-xs text-gray-500">
                            SVG, PNG, JPG or GIF (max. 300×300px)
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="category-image-upload"
                            onChange={(e) => handleFileUpload(e, "thumbnail")}
                          />
                          <label htmlFor="category-image-upload">
                            <Button
                              asChild
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded"
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
              <FormLabel className="font-medium ">Banner</FormLabel>
              <FormField
                control={form.control}
                name="banner_url"
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
                            Upload a banner image
                          </div>
                          <div className="text-xs text-gray-500">
                            SVG, PNG, JPG or GIF (max. 300×300px)
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="banner-image-upload"
                            onChange={(e) => handleFileUpload(e, "banner")}
                          />
                          <label htmlFor="banner-image-upload">
                            <Button
                              asChild
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded"
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
              <div className="flex flex-col">
                <FormLabel className="font-medium ">Video</FormLabel>
                <span className="text-xs text-gray-500 mt-1 mb-2">
                  This will be the tutorial video for your workflow. You can
                  upload a file or provide an external video URL.
                </span>
              </div>
              <FormField
                control={form.control}
                name="video_url"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col gap-2">
                      {/* External URL input */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                          placeholder="Paste external video URL (e.g. https://...)"
                          className="flex-1"
                          disabled={Boolean(
                            uploading ||
                              (field.value && field.value.startsWith("http"))
                          )}
                        />
                        {field.value && field.value.startsWith("http") && (
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
                      <div className="text-xs text-gray-500 mb-2">
                        {field.value && field.value.startsWith("http")
                          ? "Video URL is set. Clear the URL to enable file upload."
                          : field.value && !field.value.startsWith("http")
                            ? "Please enter a valid URL starting with http:// or https://"
                            : "Paste a video URL above, or upload a file below."}
                      </div>
                      <div
                        className={`flex items-center border rounded-lg bg-white p-4 gap-4 max-w-lg ${field.value ? "opacity-50" : ""}`}
                      >
                        {/* Video Preview */}
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                          {field.value && field.value.startsWith("http") ? (
                            <video
                              src={field.value}
                              controls
                              className="w-full h-full"
                            />
                          ) : (
                            <VideoIcon className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        {/* Text and Button */}
                        <div className="flex-1 flex flex-col gap-2">
                          <div>
                            <div className="font-semibold">Upload a video</div>
                            <div className="text-xs text-gray-500">
                              MP4, MOV, AVI, MKV (max. 10 minutes)
                            </div>
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              id="video-upload"
                              onChange={(e) => handleFileUpload(e, "video")}
                              disabled={uploading || Boolean(field.value)}
                            />
                            <label htmlFor="video-upload">
                              <Button
                                asChild
                                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded ${
                                  field.value
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                disabled={uploading || Boolean(field.value)}
                              >
                                <span>Choose Video</span>
                              </Button>
                            </label>
                            {field.value && !field.value.startsWith("http") && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => field.onChange("")}
                                className="ml-2"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Save Button (spans both columns) */}
              <div></div>
              <div className="flex justify-end mt-8">
                <Button
                  type="submit"
                  disabled={uploading || saving}
                  className="px-8 py-2 text-base font-semibold"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ShardEdit;
