'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { PortalSdk } from '@/utils/services/PortalSdk';
import useSWR from 'swr';
import { ChatUIMessageWithTypes } from '../hooks/convertors';

interface Message {
    id: string;
    role: string;
    content: string;
    createdAt: string;
    minionType?: string;
}

interface ClientRequest {
    id: string;
    title: string;
    description: string;
    createdAt: string;
}

interface MessageHistoryResponse {
    clientRequest: ClientRequest;
    messages: Message[];
}

export function MessageHistoryPage() {
    const searchParams = useSearchParams();
    const clientRequestId = searchParams.get('id');
    const [activeTab, setActiveTab] = useState<'messages' | 'json'>('messages');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied'>('idle');

    const {
        data: serverMessages,
        mutate,
        isValidating,
        isLoading,
        error,
    } = useSWR<ChatUIMessageWithTypes[]>(
        `/api/chat/message?requestId=${clientRequestId}`,
        async (url: string) => {
            const res = await PortalSdk.getData(url, {});
            return res;
        }
    );

    const handleCopy = async () => {
        if (!serverMessages) return;

        setCopyStatus('copying');
        try {
            await navigator.clipboard.writeText(JSON.stringify(serverMessages, null, 2));
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            setCopyStatus('idle');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading message history...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-8 bg-red-50 rounded-lg max-w-md">
                    <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!serverMessages) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-8 bg-yellow-50 rounded-lg max-w-md">
                    <h2 className="text-xl font-semibold text-yellow-700 mb-2">No Data</h2>
                    <p className="text-yellow-600">No message history found for this request.</p>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        if (activeTab === 'messages') {
            return (
                <div className="space-y-6 flex flex-col gap-4 h-[calc(100vh-80px)] overflow-y-auto">
                    {serverMessages.map((message) => (
                        <div
                            key={message.id}
                            className={`p-4 rounded-lg ${message.role === 'user'
                                ? 'bg-blue-50 ml-auto max-w-3xl'
                                : message.role === 'assistant'
                                    ? 'bg-gray-50 max-w-3xl'
                                    : 'bg-gray-100 text-center text-sm text-gray-600 max-w-2xl mx-auto'
                                }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">
                                    {message.role === 'user'
                                        ? 'User'
                                        : message.role === 'assistant'
                                            ? `Assistant (${message.minionType || 'Unknown'})`
                                            : 'System'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {dayjs(message.createdAt).format('h:mm A')}
                                </span>
                            </div>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="h-[calc(100vh-80px)] overflow-y-auto">
                <div className="relative">
                    <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors duration-200 flex items-center gap-2"
                    >
                        {copyStatus === 'copying' ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Copying...
                            </>
                        ) : copyStatus === 'copied' ? (
                            <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copy JSON
                            </>
                        )}
                    </button>
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code>{JSON.stringify(serverMessages, null, 2)}</code>
                    </pre>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'messages'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Message History
                    </button>
                    <button
                        onClick={() => setActiveTab('json')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'json'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        JSON View
                    </button>
                </nav>
            </div>
            {renderTabContent()}
        </div>
    );
} 