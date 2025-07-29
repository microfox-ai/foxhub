"use client"

import { useRef, useState } from "react";
import { useAgentData } from "./helper";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";


export const VideoSection = ({ description }: { description?: string }) => {
    const { data: agentData } = useAgentData();

    const thisAgent = agentData?.[0];

    const [isMuted, setIsMuted] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)

    const handleToggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted
            setIsMuted(!isMuted)
        }
    }

    return (
        <section className="w-full h-screen py-12 flex flex-col items-center justify-center bg-background">
            <div className="relative max-w-3xl w-full">
                <video
                    ref={videoRef}
                    className="w-full rounded-xl shadow-xl"
                    src={`/videos/${thisAgent?.agentName}/demo-1.mp4`}
                    autoPlay
                    loop
                    muted
                />
                <Button
                    onClick={handleToggleMute}
                    size="icon"
                    variant="secondary"
                    className="absolute text-white bottom-4 right-4 rounded-full bg-black/50 hover:bg-black/60"
                >
                    {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                    ) : (
                        <Volume2 className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle mute</span>
                </Button>
            </div>
            <p className="text-center text-md text-black/50 mt-4">
                {description ?? thisAgent?.description}
            </p>
        </section>
    )
}