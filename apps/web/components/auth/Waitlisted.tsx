/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function WaitlistedInfo({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("flex flex-col gap-6 w-full max-w-3xl", className)}
            {...props}
        >
            <Card className="overflow-hidden py-0">
                <CardContent className="grid p-0 md:grid-cols-2 ">
                    <div className="p-6 md:p-8 h-full flex flex-col justify-center items-center">
                        <div className="flex flex-col items-center text-center">
                            <h1 className="text-2xl font-bold py-4">
                                You&apos;re on the waitlist!
                            </h1>
                            <p className="text-balance text-md text-muted-foreground">
                                We will get back to you with your personal Microfox details and
                                account on your email within the next 10 days.
                            </p>
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
                Thank you for your patience! We are working hard to get your microfox built.
            </div>
        </div>
    );
} 