"use client"

import { FooterSection } from "@/components/screens/landing/Footer"
import { BookADemoSection } from "./BookDemo"
import { HeaderSection } from "./HeaderSection"
import { BlogSection } from "@/components/screens/landing/Blog/BlogSection"
import useSWR from "swr"
import { AgentInfo } from "@microfox/types"
import { DemoSections } from "./DemoSections"
import { UseCaseSection } from "./UseCaseseSection"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const SlackLandingPage = () => {
    const { data: agentData } = useSWR<AgentInfo[]>("/api/agents/infos?agentNames=slack", fetcher)
    const [isMuted, setIsMuted] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)

    const handleToggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted
            setIsMuted(!isMuted)
        }
    }

    const thisAgent = agentData?.[0]
    return (
        <div>
            <HeaderSection />
            <UseCaseSection />
            <section className="w-full h-screen py-12 flex flex-col items-center justify-center bg-background">
                <div className="relative max-w-3xl w-full">
                    <video
                        ref={videoRef}
                        className="w-full rounded-xl shadow-xl"
                        src="/videos/slack/microfox-slack.mp4"
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
                    Slack'd is a 1-stop desk to operate all your slack workspace.
                </p>
            </section>
            <DemoSections />
            <BookADemoSection />
            <BlogSection category="Community Management" />
            <FooterSection />
        </div>
    )
}