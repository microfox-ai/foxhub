/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import {
  FolderPlus,
  X,
  FileText,
  Hash,
  Image as ImageIcon,
  CloudUpload,
  Globe,
  Loader2,
  Plus,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";
import { useDebouncedEffect } from "@/utils/hooks/useDebouncedHook";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";

const formSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  slug: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[a-z-]+$/.test(val),
      "Slug can only contain lowercase letters and hyphens"
    ),
  description: z.string().min(1, "Description is required"),
  image: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NewProject = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string>("");

  useDebouncedEffect(
    () => {
      const checkSlugAvailability = async () => {
        if (!currentSlug) {
          setIsSlugAvailable(null);
          return;
        }

        setIsCheckingSlug(true);
        try {
          const response = await fetch(
            `/api/bot-project/check-slug?slug=${currentSlug}`
          );
          const data = await response.json();
          console.log(data);
          setIsSlugAvailable(data.isAvailable);
        } catch (error) {
          console.error("Error checking slug availability:", error);
          setIsSlugAvailable(null);
        } finally {
          setIsCheckingSlug(false);
        }
      };

      checkSlugAvailability();
    },
    [currentSlug],
    500
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      slug: "",
      description: "",
      image: null,
    },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "slug" && value.slug !== undefined) {
        setCurrentSlug(value.slug as string);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (values: FormValues) => {
    console.log(values);
    try {
      if (!user?.id) {
        toast.error("You must be logged in to create a project.");
        return;
      }

      // Check if slug is available before proceeding
      if (values.slug && !isSlugAvailable) {
        toast.error(
          "The chosen slug is already taken. Please choose a different one."
        );
        return;
      }

      // Show loading toast
      const toastId = toast.loading("Setting up your project...");

      try {
        // Call the API endpoint
        const response = await fetch("/api/bot-project/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectName: values.projectName,
            projectDescription: values.description,
            userId: user.id,
            slug: values.slug || null,
            imageUrl: values.image || null,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create project");
        }

        const data = await response.json();

        // Dismiss loading toast and show success
        toast.dismiss(toastId);
        toast.success(
          "Project created successfully! Redirecting to project..."
        );

        // Redirect to the project page
        router.push(`/project/${data.id}`);
      } catch (error) {
        // Dismiss loading toast and show error
        toast.dismiss(toastId);
        throw error; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create project. Please try again."
      );
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If there's already an image, remove it first
    if (previewUrl) {
      removeImage();
    }

    // Check if file type is allowed
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      form.setError("image", {
        type: "manual",
        message: "Please upload a JPG or PNG file",
      });
      return;
    }

    try {
      // Show loading state
      const toastId = toast.loading("Uploading image...");

      // Create FormData and upload file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user?.id || "");
      formData.append("folderName", "customBots/clientProjects");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const uploadData = await uploadResponse.json();
      if (uploadData.media && uploadData.media.length > 0) {
        const imageUrl = uploadData.media[0].mediaUrl;
        // Set the image URL in the form
        form.setValue("image", imageUrl);
        setPreviewUrl(imageUrl);
        form.clearErrors("image");
        toast.dismiss(toastId);
        toast.success("Image uploaded successfully");
      } else {
        throw new Error("No image URL returned");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      form.setError("image", {
        type: "manual",
        message: "Failed to upload image. Please try again.",
      });
      toast.error("Failed to upload image");
    }

    // Reset the input value to allow selecting the same file again
    e.target.value = "";
  };

  const removeImage = async () => {
    try {
      if (!previewUrl || !user?.id) return;

      // Show loading toast
      const toastId = toast.loading("Removing image...");

      // Extract filename from the preview URL
      const fileName = previewUrl.split("/").pop();
      if (!fileName) return;

      // Delete from S3
      const response = await fetch(
        `/api/upload?fileName=${encodeURIComponent(fileName)}&userId=${user.id}&folderName=customBots/clientProjects`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Clear the preview and form value only after successful deletion
      form.setValue("image", null);
      setPreviewUrl(null);

      // Dismiss loading toast and show success
      toast.dismiss(toastId);
      toast.success("Image removed successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col justify-center p-8">
        <div className="w-[80%] mx-auto grid grid-cols-2 gap-16">
          {/* Left Column - Header */}
          <motion.div
            className="flex flex-col justify-center"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="space-y-5">
              <motion.span
                className="text-gray-600 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                Create Project
              </motion.span>
              <motion.h1
                className="text-5xl font-semibold text-gray-900"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                Let&apos;s Build Your
                <br />
                New Project.
              </motion.h1>
              <motion.p
                className="text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                Set up your project workspace and customize its appearance.
                <br />
                We&apos;ll help you get started with everything you need.
              </motion.p>
            </div>
          </motion.div>

          {/* Right Column - Form */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col justify-center h-full"
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 "
              >
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                      },
                    },
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      variants={{
                        hidden: { y: 20, opacity: 0 },
                        visible: { y: 0, opacity: 1 },
                      }}
                    >
                      <FormField
                        control={form.control}
                        name="projectName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium mb-1 block text-sm">
                              Project Name{" "}
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Enter project name"
                                  className="pl-9 h-12 bg-white border-gray-200 rounded-2xl focus-visible:ring-1 focus-visible:ring-gray-500 focus-visible:border-gray-500"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs mt-1" />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { y: 20, opacity: 0 },
                        visible: { y: 0, opacity: 1 },
                      }}
                    >
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium mb-1 block text-sm">
                              Project Slug
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="project-slug"
                                  className={`pl-9 pr-9 h-12 bg-white border-gray-200 rounded-2xl focus-visible:ring-1 focus-visible:ring-gray-500 focus-visible:border-gray-500 ${
                                    field.value && isSlugAvailable !== null
                                      ? isSlugAvailable
                                        ? "border-green-500 focus-visible:ring-green-500 focus-visible:border-green-500"
                                        : "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500"
                                      : ""
                                  }`}
                                  {...field}
                                />
                                {field.value && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {isCheckingSlug ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    ) : isSlugAvailable !== null ? (
                                      isSlugAvailable ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <X className="h-4 w-4 text-red-500" />
                                      )
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs mt-1" />
                            {field.value &&
                              !isCheckingSlug &&
                              isSlugAvailable === false && (
                                <p className="text-xs text-red-500 mt-1">
                                  This slug is already taken
                                </p>
                              )}
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  </div>

                  {/* Description Field */}
                  <motion.div
                    variants={{
                      hidden: { y: 20, opacity: 0 },
                      visible: { y: 0, opacity: 1 },
                    }}
                  >
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium mb-1 block text-sm">
                            Description <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Textarea
                                placeholder="What's this project about?"
                                className="pl-9 min-h-[80px] bg-white border-gray-200 rounded-2xl focus-visible:ring-1 focus-visible:ring-gray-500 focus-visible:border-gray-500"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  {/* Image Field */}
                  <motion.div
                    variants={{
                      hidden: { y: 20, opacity: 0 },
                      visible: { y: 0, opacity: 1 },
                    }}
                  >
                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium mb-1 block text-sm">
                            Project Icon
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              {previewUrl ? (
                                <div className="relative">
                                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                                    <img
                                      src={previewUrl}
                                      alt="Project icon"
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={removeImage}
                                      className="absolute top-1.5 right-1.5 p-0.5 bg-white/80 rounded-full hover:bg-white"
                                    >
                                      <X className="h-3 w-3 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center w-full">
                                  <label className="flex flex-col items-center justify-center w-full h-36 border border-gray-200 border-dashed rounded-2xl cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-4 pb-5">
                                      <CloudUpload className="w-7 h-7 mb-3 text-gray-400" />
                                      <p className="mb-1 text-sm text-gray-500">
                                        <span className="font-medium">
                                          Click to upload
                                        </span>{" "}
                                        or drag and drop
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        JPG or PNG only
                                      </p>
                                    </div>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/jpeg,image/jpg,image/png"
                                      onChange={handleImageChange}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                >
                  <Button
                    type="submit"
                    className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-medium"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                        Processing. Please wait...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </div>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default NewProject;
