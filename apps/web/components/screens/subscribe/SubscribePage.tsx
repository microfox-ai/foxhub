"use client";

import { useState, FormEvent } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { AtSignIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SubscribePage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const source = searchParams.get("source");
    const [emailSent, setEmailSent] = useState(false);

    const generateCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");
        setEmailSent(false);

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            setError("Please enter a valid email address.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: generateCode(),
                    email,
                    source: source && source.length > 0 ? source : "email_verification",
                    sendEmail: true,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                setEmail("");
                setEmailSent(true);
            } else {
                setError(data.error || "Something went wrong. Please try again.");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    if (!source || source.length === 0) {
        return redirect("/404");
    }

    return (
        <div className="flex relative min-h-screen min-w-screen items-center justify-center bg-gray-100 p-4">
            <div className="absolute inset-0 bg-white flex flex-row">
                <img className="w-1/2 h-full object-cover object-right" src="/images/BetaMicrofox.png" alt="Subscribe Background" />
                <img className="w-1/2 h-full object-cover object-left" src={`/images/Beta_${source}.png`} alt="Subscribe Background" />
            </div>
            <div className="absolute inset-0  flex flex-col items-center justify-center">
                <div className="w-full max-w-lg rounded-xl bg-white p-16 shadow-xl">
                    <div className="mb-6 text-center text-left">
                        <h1 className="text-4xl font-bold text-gray-800">
                            {emailSent ? "Thank you!" : "Join the Beta"}
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            {emailSent ? "We have sent you an email for the verification code & the instructions for ealy access." : "Enter your Google Account email to receive a early access-code invite."}
                        </p>
                    </div>

                    {!emailSent && <form onSubmit={handleSubmit} className="space-y-2 flex flex-col items-start justify-start">
                        <div className="flex flex-row gap-2 items-center w-full">
                            <AtSignIcon className="w-4 h-4 min-w-4 min-h-4" />
                            <Input
                                id="email"
                                placeholder="your email"
                                value={email}
                                onChange={(e: any) => setEmail(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>
                        <p className="text-xs text-gray-600 whitespace-nowrap">Please join with your google email</p>

                        <Button
                            variant="default"
                            type="submit" className="mt-4" disabled={loading}>
                            {loading ? <Loader2Icon className="w-4 h-4 animate-spin" /> : null}
                            {loading ? "Sending..." : "Send Me Invite"}
                            <ChevronRightIcon className="w-4 h-4" />
                        </Button>
                    </form>}

                    {message && (
                        <div className="mt-4 text-center text-sm text-green-600">{message}</div>
                    )}
                    {error && (
                        <div className="mt-4 text-center text-sm text-red-600">{error}</div>
                    )}
                </div>
            </div>
        </div>
    );
} 