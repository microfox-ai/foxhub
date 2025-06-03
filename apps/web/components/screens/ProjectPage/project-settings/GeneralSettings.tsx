import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useAuth } from "@/components/auth/AuthProvider";
import { BotProject } from "@prisma/client";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useDebouncedEffect } from "@/utils/hooks/useDebouncedHook";

const formSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().min(1, "Description is required"),
    slug: z
        .string()
        .transform((val) => val || null)
        .nullable()
        .optional()
        .refine(
            (val) => !val || /^[a-z-]+$/.test(val),
            "Slug can only contain lowercase letters and hyphens"
        ),
    imageUrl: z
        .string()
        .transform((val) => val || null)
        .nullable()
        .optional(),
    homepageUrl: z
        .string()
        .transform((val) => val || null)
        .nullable()
        .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GeneralSettingsProps {
    selectedProject: BotProject;
    projectId: string;
}

const GeneralSettings = ({ selectedProject, projectId }: GeneralSettingsProps) => {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
    const [currentSlug, setCurrentSlug] = useState<string>("");

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: selectedProject.name,
            description: selectedProject.description || "",
            slug: selectedProject.slug || null,
            imageUrl: selectedProject.imageUrl || null,
            homepageUrl: selectedProject.homepageUrl || "",
        },
    });

    useDebouncedEffect(
        () => {
            const checkSlugAvailability = async () => {
                if (!currentSlug) {
                    setIsSlugAvailable(null);
                    return;
                }

                if (selectedProject?.slug === currentSlug) {
                    setIsSlugAvailable(true);
                    return;
                }

                setIsCheckingSlug(true);
                try {
                    const response = await fetch(
                        `/api/bot-project/check-slug?slug=${currentSlug}&projectId=${projectId}`
                    );
                    const data = await response.json();
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
        [currentSlug, selectedProject?.slug, projectId],
        500
    );

    const onSubmit = async (values: FormValues) => {
        if (!selectedProject) {
            toast.error("Project not found");
            return;
        }

        if (
            values.slug &&
            values.slug !== selectedProject.slug &&
            !isSlugAvailable
        ) {
            toast.error(
                "The chosen slug is already taken. Please choose a different one."
            );
            return;
        }

        setIsSaving(true);
        try {
            const updatedProject = await PortalSdk.putData(`/api/bot-project`, {
                ...selectedProject,
                ...values,
                imageUrl: previewUrl || null,
            });
            toast.success("Project settings updated successfully!");
        } catch (error) {
            console.error("Error updating project:", error);
            toast.error("Failed to update project settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (previewUrl) {
            removeImage();
        }

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (!allowedTypes.includes(file.type)) {
            form.setError("imageUrl", {
                type: "manual",
                message: "Please upload a JPG or PNG file",
            });
            return;
        }

        try {
            const toastId = toast.loading("Uploading image...");

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
                form.setValue("imageUrl", imageUrl);
                setPreviewUrl(imageUrl);
                form.clearErrors("imageUrl");
                toast.dismiss(toastId);
                toast.success("Image uploaded successfully");
            } else {
                throw new Error("No image URL returned");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            form.setError("imageUrl", {
                type: "manual",
                message: "Failed to upload image. Please try again.",
            });
            toast.error("Failed to upload image");
        }

        e.target.value = "";
    };

    const removeImage = () => {
        form.setValue("imageUrl", null);
        setPreviewUrl(null);
    };

    return (
        <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Project Information
                </CardTitle>
                <CardDescription className="text-base">
                    Update your project details and settings
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8 mb-20"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="space-y-6"
                        >
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="group">
                                        <FormLabel className="text-base font-medium transition-colors group-hover:text-primary">
                                            Project Name
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter project name"
                                                {...field}
                                                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-sm" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="group">
                                        <FormLabel className="text-base font-medium transition-colors group-hover:text-primary">
                                            Description
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe your project"
                                                {...field}
                                                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50 min-h-[100px]"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-sm" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="slug"
                                render={({
                                    field: { value, onChange, ...field },
                                }) => (
                                    <FormItem className="group">
                                        <FormLabel className="text-base font-medium transition-colors group-hover:text-primary">
                                            Slug
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    placeholder="project-slug"
                                                    {...field}
                                                    value={value || ""}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value.toLowerCase();
                                                        onChange(newValue || null);
                                                        setCurrentSlug(newValue);
                                                    }}
                                                    className={cn(
                                                        "transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50",
                                                        value && isSlugAvailable !== null
                                                            ? isSlugAvailable
                                                                ? "border-green-500 focus-visible:ring-green-500 focus-visible:border-green-500"
                                                                : "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500"
                                                            : ""
                                                    )}
                                                />
                                                <AnimatePresence>
                                                    {value && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2"
                                                        >
                                                            {isCheckingSlug ? (
                                                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                            ) : isSlugAvailable !== null ? (
                                                                isSlugAvailable ? (
                                                                    <Check className="h-4 w-4 text-green-500" />
                                                                ) : (
                                                                    <X className="h-4 w-4 text-red-500" />
                                                                )
                                                            ) : null}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-sm" />
                                        <AnimatePresence>
                                            {value && !isCheckingSlug && isSlugAvailable === false && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="text-xs text-red-500 mt-1"
                                                >
                                                    This slug is already taken
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="homepageUrl"
                                render={({ field }) => (
                                    <FormItem className="group">
                                        <FormLabel className="text-base font-medium transition-colors group-hover:text-primary">
                                            Homepage URL
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://your-company.com or https://your-ai-agent.com"
                                                {...field}
                                                value={field.value ?? ""}
                                                onChange={(e) => field.onChange(e.target.value || null)}
                                                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-sm" />
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Optional: Link to your company website, AI agent, or web application
                                        </p>
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4 group">
                                <FormLabel className="text-base font-medium transition-colors group-hover:text-primary">
                                    Project Icon
                                </FormLabel>
                                <div className="flex items-center gap-4">
                                    <AnimatePresence>
                                        {previewUrl && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="relative w-20 h-20 group/image"
                                            >
                                                <img
                                                    src={previewUrl}
                                                    alt="Project preview"
                                                    className="rounded-lg object-cover w-20 h-20 transition-transform duration-200 group-hover/image:scale-105"
                                                />
                                                <button
                                                    onClick={removeImage}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity duration-200"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="max-w-xs transition-all duration-200 hover:border-primary/50"
                                    />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                        >
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="transition-all duration-200 hover:scale-105"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </motion.div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default GeneralSettings; 