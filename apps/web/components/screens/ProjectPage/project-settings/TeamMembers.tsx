import { useState } from "react";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useAuth } from "@/components/auth/AuthProvider";
import { BotProject, ProjectPermission, User } from "@prisma/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, UserPlus, Check, X, Calendar, UserX, Crown, Shield, UserCog, UserCheck } from "lucide-react";
import { useDebouncedEffect } from "@/utils/hooks/useDebouncedHook";

interface TeamMembersProps {
    selectedProject: BotProject;
    projectId: string;
}

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

const TeamMembers = ({ selectedProject, projectId }: TeamMembersProps) => {
    const { user } = useAuth();
    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
            toast.success("Team member removed successfully!");
            setMemberToDelete(null);
        } catch (error) {
            toast.error("Failed to remove team member");
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
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

    return (
        <>
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
        </>
    );
};

export default TeamMembers; 