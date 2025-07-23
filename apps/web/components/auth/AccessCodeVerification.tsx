/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AccessCodeVerification({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [accessCode, setAccessCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const router = useRouter();

    const handleVerifyAccess = async () => {
        if (!accessCode.trim()) {
            toast.error("Please enter an access code");
            return;
        }

        setIsVerifying(true);
        try {
            const response = await fetch("/api/users/verify-access", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ accessCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to verify access code");
            }

            toast.success("Access code verified successfully!");
            router.push("/dashboard");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Invalid access code");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div
            className={cn("flex flex-col gap-6 w-full max-w-3xl", className)}
            {...props}
        >
            <Card className="overflow-hidden py-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <div className="p-6 md:p-8 h-full flex flex-col justify-center items-center">
                        <div className="flex flex-col items-center text-center">
                            <h1 className="text-2xl font-bold py-4">
                                Enter Access Code
                            </h1>
                            <p className="text-balance text-md text-muted-foreground mb-6">
                                Please enter your access code to continue using Microfox.
                            </p>
                            <div className="w-full max-w-xs space-y-4">
                                <Input
                                    type="text"
                                    placeholder="Enter your access code"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    className="text-center"
                                />
                                <Button
                                    className="w-full"
                                    onClick={handleVerifyAccess}
                                    disabled={isVerifying || !accessCode.trim()}
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify Access"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="relative hidden bg-muted md:block min-h-[500px]">
                        <img
                            src="/images/fox.png"
                            alt="Image"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="text-balance text-center text-xs text-muted-foreground">
                If you don't have an access code, please join our waitlist or contact support.
            </div>
        </div>
    );
} 