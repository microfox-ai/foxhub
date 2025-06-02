/* eslint-disable @next/next/no-img-element */
"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useAuth } from "@/components/auth/AuthProvider";
import { BotProject, ProjectPermission, User } from "@prisma/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, UserPlus, Check, X, Settings, Users, Key, CreditCard, ChartBar, Bell, Shield, Crown, UserCog, UserCheck, Mail, Calendar, UserX } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { useDebouncedEffect } from "@/utils/hooks/useDebouncedHook";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LogoutElement from "@/components/auth/LogoutElement";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const settingsTabs = [
  {
    label: "General Settings",
    value: "general",
    icon: <Settings className="h-4 w-4 mr-2" />,
  },
  {
    label: "Members & Roles",
    value: "team",
    icon: <Users className="h-4 w-4 mr-2" />,
  },
  {
    label: "Billing",
    value: "billing",
    icon: <CreditCard className="h-4 w-4 mr-2" />,
  },
  {
    label: "Analytics",
    value: "analytics",
    icon: <ChartBar className="h-4 w-4 mr-2" />,
  },
  {
    label: "Notifications",
    value: "notifications",
    icon: <Bell className="h-4 w-4 mr-2" />,
  },
  {
    label: "Security",
    value: "security",
    icon: <Shield className="h-4 w-4 mr-2" />,
  },
];

const getRoleIcon = (role: string) => {
  switch (role) {
    case "OWNER":
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case "ADMIN":
      return <Shield className="h-4 w-4 text-blue-500" />;
    case "EDITOR":
      return <UserCog className="h-4 w-4 text-purple-500" />;
    case "VIEWER":
      return <UserCheck className="h-4 w-4 text-green-500" />;
    default:
      return <UserCheck className="h-4 w-4 text-gray-500" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case "OWNER":
      return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
    case "ADMIN":
      return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
    case "EDITOR":
      return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
    case "VIEWER":
      return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
  }
};

const ProjectSettings = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<BotProject | null>(null);
  const [teamMembers, setTeamMembers] = useState<
    (ProjectPermission & { user: User })[]
  >([]);
  //   const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      slug: null,
      imageUrl: null,
      homepageUrl: "",
    },
  });

  const { selectedProject, projectId } = useClientProject();

  useEffect(() => {
    if (selectedProject) {
      form.reset({
        name: selectedProject.name,
        description: selectedProject.description || "",
        slug: selectedProject.slug || null,
        imageUrl: selectedProject.imageUrl || null,
        homepageUrl: selectedProject.homepageUrl || "",
      });
      if (selectedProject.imageUrl) {
        setPreviewUrl(selectedProject.imageUrl);
      }
    }
  }, [selectedProject, form]);

  useDebouncedEffect(
    () => {
      const checkSlugAvailability = async () => {
        if (!currentSlug) {
          setIsSlugAvailable(null);
          return;
        }

        // If the slug hasn't changed from the current project's slug, it's available
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

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "slug" && value.slug !== undefined) {
        setCurrentSlug(value.slug as string);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (values: FormValues) => {
    console.log("Submitting form with values:", values);
    if (!selectedProject) {
      toast.error("Project not found");
      return;
    }

    // Only check slug availability if it's different from the current project's slug
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
      setProject(updatedProject);
      toast.success("Project settings updated successfully!");
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!projectId || !inviteEmail || !user?.id) return;

    setIsInviting(true);
    try {
      const response = await PortalSdk.postData(`/api/permissions`, {
        projectId,
        email: inviteEmail,
        role: "VIEWER",
        userId: user.id,
      });
      console.log("Invitation Response:", response);
      toast.success("Invitation sent successfully!");
      setInviteEmail("");
    } catch (error) {
      toast.error("Failed to send invitation");
      console.error(error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    setMemberToDelete({ id: userId, name: userName });
  };

  const confirmDeleteMember = async () => {
    if (!projectId || !memberToDelete || !user?.id) return;

    setIsDeleting(true);
    try {
      await PortalSdk.deleteData(
        `/api/permissions?projectId=${projectId}&targetUserId=${memberToDelete.id}&userId=${user.id}`,
        {}
      );
      setTeamMembers((prev) =>
        prev.filter((member) => member.userId !== memberToDelete.id)
      );
      toast.success("Team member removed successfully!");
      setMemberToDelete(null);
    } catch (error) {
      toast.error("Failed to remove team member");
      console.error(error);
    } finally {
      setIsDeleting(false);
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
      form.setError("imageUrl", {
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

    // Reset the input value to allow selecting the same file again
    e.target.value = "";
  };

  const removeImage = () => {
    form.setValue("imageUrl", null);
    setPreviewUrl(null);
  };

  const searchUsers = async (query: string) => {
    if (!query) {
      setUserSuggestions([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const response = await fetch(
        `/api/users/search?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      console.log("User Suggestions:", data.users);
      setUserSuggestions(data.users || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setUserSuggestions([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  useDebouncedEffect(
    () => {
      searchUsers(inviteEmail);
    },
    [inviteEmail],
    300
  );

  const handleUserSelect = (user: User) => {
    setInviteEmail(user.email);
    setShowUserSuggestions(false);
  };

  //   if (isLoading) {
  //     return (
  //       <div className="flex items-center justify-center h-screen">
  //         <Loader2 className="h-8 w-8 animate-spin" />
  //       </div>
  //     );
  //   }

  const [activeTab, setActiveTab] = useState("general");
  return (
    <div className="container px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between h-12"
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => router.push(`/project/${projectId}`)}
                className="cursor-pointer hover:text-primary"
              >
                {selectedProject?.name || "Project"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{settingsTabs.find(tab => tab.value === activeTab)?.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </motion.div>
      <div className="h-screen w-full overflow-y-auto thin-scrollbar">
        <Tabs onValueChange={(value) => {
          setActiveTab(value);
        }} orientation="vertical" defaultValue="general" className="grid grid-cols-12 max-w-6xl mx-auto h-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="col-span-2 h-full"
          >
            <TabsList className="flex flex-col items-start w-full gap-2 h-fit p-2 sticky top-4">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="transition-all duration-200 hover:scale-105 w-full justify-start "
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="col-span-10 mb-20"
          >
            <TabsContent value="general">
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
            </TabsContent>

            <TabsContent value="team">
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Team Members
                  </CardTitle>
                  <CardDescription className="text-base">
                    Manage who has access to this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="flex gap-2"
                    >
                      <div className="relative flex-1">
                        <Input
                          placeholder="Enter email address"
                          value={inviteEmail}
                          onChange={(e) => {
                            setInviteEmail(e.target.value);
                            setShowUserSuggestions(true);
                          }}
                          onFocus={() => setShowUserSuggestions(true)}
                          onBlur={() =>
                            setTimeout(() => setShowUserSuggestions(false), 200)
                          }
                          type="email"
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                        />
                        <AnimatePresence>
                          {showUserSuggestions && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground shadow-md rounded-md border"
                            >
                              <div className="max-h-[300px] overflow-y-auto">
                                {isSearchingUsers ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : userSuggestions.length > 0 ? (
                                  <div className="divide-y">
                                    {userSuggestions.map((user) => (
                                      <button
                                        key={user.id}
                                        className="flex w-full items-center gap-3 p-3 hover:bg-accent transition-colors duration-200"
                                        onClick={() => handleUserSelect(user)}
                                        onMouseDown={(e) => e.preventDefault()}
                                      >
                                        <Avatar>
                                          <AvatarImage
                                            src={user.avatar || undefined}
                                          />
                                          <AvatarFallback>
                                            {user.name?.[0]?.toUpperCase() || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col items-start">
                                          <span className="font-medium">
                                            {user.name}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    No users found
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <Button
                        onClick={handleInviteMember}
                        disabled={isInviting || !inviteEmail}
                        className="transition-all duration-200 hover:scale-105"
                      >
                        {isInviting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Inviting...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite
                          </>
                        )}
                      </Button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="space-y-4"
                    >
                      {(selectedProject as any)?.permissions.map((member: any) => (
                        <motion.div
                          key={member.userId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group flex items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:border-primary/50"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="transition-transform duration-200 group-hover:scale-105">
                              <AvatarImage
                                src={member.user.avatar || undefined}
                              />
                              <AvatarFallback>
                                {member.user.name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{member.user.name}</p>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "flex items-center gap-1 px-2 py-0.5",
                                          getRoleColor(member.role)
                                        )}
                                      >
                                        {getRoleIcon(member.role)}
                                        {member.role}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Role: {member.role}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {member.userId !== user?.id && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleRemoveMember(
                                          member.userId,
                                          member.user.name
                                        )
                                      }
                                      className="transition-all duration-200 hover:bg-red-500/10 hover:text-red-500"
                                    >
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Remove member</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </motion.div>
        </Tabs>

        <Dialog
          open={!!memberToDelete}
          onOpenChange={(open) => {
            if (!open) {
              setMemberToDelete(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Team Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {memberToDelete?.name} from
                this project? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  setMemberToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteMember}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ProjectSettings;
