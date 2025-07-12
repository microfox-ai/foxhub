"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="flex flex-col items-center justify-center h-full p-4">
                    <h1 className="text-2xl font-bold text-red-500">Something went wrong.</h1>
                    <p className="text-gray-500">Please try refreshing the page.</p>
                    {this.state.error && (
                        <details className="mt-4 w-full">
                            <summary className="cursor-pointer">Error Details</summary>
                            <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto w-full max-w-full text-sm">
                                {this.state.error.stack || this.state.error.toString()}
                            </pre>
                        </details>
                    )}
                </div>
            )
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 