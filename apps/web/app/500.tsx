"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Error500() {
    const router = useRouter();

    return (
        <div className="flex h-screen flex-col items-center justify-center">
            <h1 className="mb-4 text-4xl font-bold">500</h1>
            <p className="mb-8 text-lg text-muted-foreground">
                Oops! Something went wrong on our end.
            </p>
            <Button
                onClick={() => {
                    router.refresh();
                    router.push("/");
                }}
            >
                Try again
            </Button>
        </div>
    );
}
