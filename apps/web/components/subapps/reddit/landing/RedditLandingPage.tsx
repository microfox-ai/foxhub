"use client"

import { FooterSection } from "@/components/screens/landing/Footer"
import { BlogSection } from "@/components/screens/landing/Blog/BlogSection"
import useSWR from "swr"
import { AgentInfo } from "@microfox/types"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import { getAgentNameFromPath, useAgentData } from "../../common/helper"
import { useParams, usePathname, useRouter } from "next/navigation"
import { BookADemoSection } from "../../common/BookDemo"
import { HeaderSection } from "./HeaderSection"
import { VideoSection } from "../../common/VideoSection"


export const RedditLandingPage = () => {

    const { data: agentData } = useAgentData();

    const [isMuted, setIsMuted] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)

    const handleToggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted
            setIsMuted(!isMuted)
        }
    }

    const thisAgent = agentData?.[0];

    if (!thisAgent) {
        return <div>Loading...</div>
    }

    return (
        <div>
            <HeaderSection />
            <VideoSection />
            <BookADemoSection />
            <BlogSection category="Reddit" />
            <FooterSection />
        </div>
    )
}