"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubdomainRedirect } from "@prisma/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Checkbox } from "@/components/ui/checkbox";

export const SubdomainRedirects = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRedirect, setSelectedRedirect] = useState<SubdomainRedirect | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Omit<SubdomainRedirect, "id" | "createdAt" | "updatedAt" | "userId">>({
        subdomain: "",
        rewritePath: "",
        rewriteType: "REWRITE",
        hostedOn: "INTERNAL",
        description: "",
        enabled: true,
    });

    const { user } = useAuth();

    const { data, mutate } = useSWR<{ redirects: SubdomainRedirect[] }>(
        "/api/admin/subdomains",
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch subdomain redirects");
            return res.json();
        }
    );

    const openEditDialog = (redirect: SubdomainRedirect) => {
        setSelectedRedirect(redirect);
        setFormData({
            subdomain: redirect.subdomain,
            rewritePath: redirect.rewritePath,
            rewriteType: redirect.rewriteType,
            hostedOn: redirect.hostedOn,
            description: redirect.description || "",
            enabled: redirect.enabled,
        });
        setIsEditing(true);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const url = isEditing
                ? `/api/admin/subdomains?id=${selectedRedirect?.id}`
                : "/api/admin/subdomains";

            const method = isEditing ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} redirect`);

            await mutate();
            setIsDialogOpen(false);
            setSelectedRedirect(null);
            setIsEditing(false);
            setFormData({
                subdomain: "",
                rewritePath: "",
                rewriteType: "REWRITE",
                hostedOn: "INTERNAL",
                description: "",
                enabled: true,
            });
            toast.success(`Redirect ${isEditing ? 'updated' : 'created'} successfully`);
        } catch (error) {
            toast.error(`Failed to ${isEditing ? 'update' : 'create'} redirect`);
        }
    };

    const handleDelete = async () => {
        if (!selectedRedirect) return;

        try {
            const response = await fetch(`/api/admin/subdomains?id=${selectedRedirect.id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Failed to delete redirect");

            await mutate();
            setIsDeleteDialogOpen(false);
            setSelectedRedirect(null);
            toast.success("Redirect deleted successfully");
        } catch (error) {
            toast.error("Failed to delete redirect");
        }
    };

    if (!user?.isAdmin) {
        return <div>You are not authorized to view this page.</div>;
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Subdomain Redirects</h1>
                <Button onClick={() => {
                    setIsEditing(false);
                    setSelectedRedirect(null);
                    setFormData({
                        subdomain: "",
                        rewritePath: "",
                        rewriteType: "REWRITE",
                        hostedOn: "INTERNAL",
                        description: "",
                        enabled: true,
                    });
                    setIsDialogOpen(true);
                }}>
                    <Plus className="mr-2" /> Add Redirect
                </Button>
            </div>

            <div className="rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subdomain</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rewrite Path</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hosted On</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enabled</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data?.redirects?.map((redirect) => (
                            <tr key={redirect.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{redirect.subdomain}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{redirect.rewritePath}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{redirect.rewriteType}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{redirect.hostedOn}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{redirect.enabled ? 'Yes' : 'No'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(redirect)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setSelectedRedirect(redirect);

                                        setIsDeleteDialogOpen(true);
                                    }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit' : 'Add'} Redirect</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Update the details of your subdomain redirect.' : 'Add a new subdomain redirect to your project.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subdomain" className="text-right">Subdomain</Label>
                            <Input id="subdomain" value={formData.subdomain} onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="rewritePath" className="text-right">Rewrite Path</Label>
                            <Input id="rewritePath" value={formData.rewritePath} onChange={(e) => setFormData({ ...formData, rewritePath: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="rewriteType" className="text-right">Rewrite Type</Label>
                            <Input id="rewriteType" value={formData.rewriteType} onChange={(e) => setFormData({ ...formData, rewriteType: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hostedOn" className="text-right">Hosted On</Label>
                            <Input id="hostedOn" value={formData.hostedOn} onChange={(e) => setFormData({ ...formData, hostedOn: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Textarea id="description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="enabled" className="text-right">Enabled</Label>
                            <Checkbox id="enabled" checked={formData.enabled} onCheckedChange={(checked) => setFormData({ ...formData, enabled: !!checked })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Redirect</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this subdomain redirect? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}; 