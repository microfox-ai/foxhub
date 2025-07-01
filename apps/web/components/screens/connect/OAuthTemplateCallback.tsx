"use client";

import { Identity } from "@microfox/oauth-kit";
import { CLIENTSECRETSTATUS } from "@prisma/client";
import { useEffect } from "react";
import { toast } from "sonner";

interface OAuthTemplateCallbackProps {
    docId: string;
    keys: Array<{
        key: string;
        value: string;
        isOptional: boolean;
    }>;
    tokenResponse: any;
    identityMetadata: (Identity | undefined | {}) & { providerInfo?: { icon?: string, name?: string } };
}

const OAuthTemplateCallback = ({ docId, keys, tokenResponse, identityMetadata }: OAuthTemplateCallbackProps) => {

    useEffect(() => {
        const updateClientSecret = async () => {
            try {
                localStorage.setItem(docId, JSON.stringify({
                    keys,
                    tokenResponse,
                    identityMetadata,
                }));

                // Close the popup window after successful connection
                if (window.opener) {
                    window.opener.postMessage("oauth-success", "*");
                    window.close();
                }
            } catch (error) {
                console.error("Error updating client secret:", error);
                toast.error("Failed to connect Google account");
            }
        };
        updateClientSecret();
    }, [docId, keys, tokenResponse, identityMetadata]);

    // @ts-ignore
    const { name, email, avatar_url, team_name, team_icon, providerInfo } = identityMetadata || {};

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="relative mb-6">
                    <video
                        src="/videos/microfox-hurray.mp4" // Placeholder video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full rounded-lg shadow-lg"
                    />
                    {providerInfo?.icon && (
                        <img
                            src={providerInfo.icon}
                            alt={providerInfo.name}
                            className="absolute -top-5 -right-5 h-20 w-20 rounded-full border-4 border-white bg-white shadow-md"
                        />
                    )}
                </div>

                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Connecting to {providerInfo?.name || 'your account'}...
                    </h1>
                    <p className="text-gray-600">Please wait while we complete the setup. This window will close automatically.</p>
                </div>

                {Object.keys(identityMetadata || {}).length > 1 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm animate-fade-in">
                        <div className="flex items-center">
                            {(avatar_url || team_icon) && (
                                <img
                                    src={avatar_url || team_icon}
                                    alt="Identity"
                                    className="mr-4 h-16 w-16 rounded-full"
                                />
                            )}
                            <div className="flex-1">
                                {(name || team_name) && (
                                    <p className="font-semibold text-gray-900">{name || team_name}</p>
                                )}
                                {email && (
                                    <p className="text-sm text-gray-500">{email}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OAuthTemplateCallback;
