"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { sendMicrofoxNotification, generateMicrofoxEmailTemplate } from "@/utils/services/sesSdk";
import { toast } from "sonner";

export default function EmailTemplatePage() {
    const [template, setTemplate] = useState({
        title: "Welcome to Microfox",
        content: "Thank you for joining Microfox! We're excited to have you on board.",
        ctaText: "Get Started",
        ctaLink: "https://microfox.ai/dashboard",
        footerText: "© 2024 Microfox. All rights reserved.",
    });

    const [testEmail, setTestEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");

    // Update preview when template changes
    useEffect(() => {
        const html = generateMicrofoxEmailTemplate(template);
        setPreviewHtml(html);
    }, [template]);

    const handleSendTest = async () => {
        if (!testEmail) {
            toast.error("Please enter a test email address");
            return;
        }

        try {
            setIsSending(true);
            await sendMicrofoxNotification(
                testEmail,
                "Test Email from Microfox",
                template
            );
            toast.success("Test email sent successfully!");
        } catch (error) {
            toast.error("Failed to send test email");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Email Template Editor</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Editor Section */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Template Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={template.title}
                                    onChange={(e) =>
                                        setTemplate((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content">Content</Label>
                                <Textarea
                                    id="content"
                                    value={template.content}
                                    onChange={(e) =>
                                        setTemplate((prev) => ({ ...prev, content: e.target.value }))
                                    }
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ctaText">CTA Button Text</Label>
                                <Input
                                    id="ctaText"
                                    value={template.ctaText}
                                    onChange={(e) =>
                                        setTemplate((prev) => ({ ...prev, ctaText: e.target.value }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ctaLink">CTA Button Link</Label>
                                <Input
                                    id="ctaLink"
                                    value={template.ctaLink}
                                    onChange={(e) =>
                                        setTemplate((prev) => ({ ...prev, ctaLink: e.target.value }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="footerText">Footer Text</Label>
                                <Input
                                    id="footerText"
                                    value={template.footerText}
                                    onChange={(e) =>
                                        setTemplate((prev) => ({ ...prev, footerText: e.target.value }))
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Send Test Email</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="testEmail">Test Email Address</Label>
                                <Input
                                    id="testEmail"
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="Enter email address"
                                />
                            </div>
                            <Button
                                onClick={handleSendTest}
                                disabled={isSending}
                                className="w-full"
                            >
                                {isSending ? "Sending..." : "Send Test Email"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-hidden">
                            <iframe
                                srcDoc={previewHtml}
                                className="w-full h-[600px] border-0"
                                title="Email Preview"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 