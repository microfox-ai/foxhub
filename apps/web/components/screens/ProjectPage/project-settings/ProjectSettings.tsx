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
import { Loader2, Trash2, UserPlus, Check, X } from "lucide-react";
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
  console.log("Selected Project:", selectedProject);

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

  return (
    <div className="container px-8 pt-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
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
            </BreadcrumbList>
          </Breadcrumb>

          <LogoutElement />
        </div>
      </div>
      <div className="h-screen w-full overflow-y-auto thin-scrollbar">
        <div className=" max-w-4xl pt-10 pb-20 mx-auto">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList>
              <TabsTrigger value="general">General Settings</TabsTrigger>
              <TabsTrigger value="team">Team Members</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                  <CardDescription>
                    Update your project details and settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter project name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe your project"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="slug"
                          render={({
                            field: { value, onChange, ...field },
                          }) => (
                            <FormItem>
                              <FormLabel>Slug</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="project-slug"
                                    {...field}
                                    value={value || ""}
                                    onChange={(e) => {
                                      const newValue =
                                        e.target.value.toLowerCase();
                                      onChange(newValue || null);
                                    }}
                                    className={`${
                                      value && isSlugAvailable !== null
                                        ? isSlugAvailable
                                          ? "border-green-500 focus-visible:ring-green-500 focus-visible:border-green-500"
                                          : "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500"
                                        : ""
                                    }`}
                                  />
                                  {value && (
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
                              <FormMessage />
                              {value &&
                                !isCheckingSlug &&
                                isSlugAvailable === false && (
                                  <p className="text-xs text-red-500 mt-1">
                                    This slug is already taken
                                  </p>
                                )}
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="homepageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Homepage URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://your-company.com or https://your-ai-agent.com"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(e.target.value || null)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-sm text-muted-foreground">
                                Optional: Link to your company website, AI
                                agent, or web application
                              </p>
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                          <FormLabel>Project Icon</FormLabel>
                          <div className="flex items-center gap-4">
                            {previewUrl && (
                              <div className="relative w-20 h-20">
                                <img
                                  src={previewUrl}
                                  alt="Project preview"
                                  className="rounded-lg object-cover"
                                />
                              </div>
                            )}
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="max-w-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage who has access to this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex gap-2">
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
                        />
                        {showUserSuggestions && (
                          <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground shadow-md rounded-md border">
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
                                      className="flex w-full items-center gap-3 p-3 hover:bg-accent"
                                      onClick={() => handleUserSelect(user)}
                                      onMouseDown={(e) => e.preventDefault()} // Prevent blur
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
                                        <span className="text-sm text-muted-foreground">
                                          {user.email}
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
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleInviteMember}
                        disabled={isInviting || !inviteEmail}
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
                    </div>

                    <div className="space-y-4">
                      {selectedProject?.permissions.map((member: any) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage
                                src={member.user.avatar || undefined}
                              />
                              <AvatarFallback>
                                {member.user.name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.user.name}</p>
                              <p className="text-sm text-gray-500">
                                {member.user.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">
                              {member.role}
                            </span>
                            {member.userId !== user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleRemoveMember(
                                    member.userId,
                                    member.user.name
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
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
    </div>
  );
};

export default ProjectSettings;
