"use client"

import { FooterSection } from "@/components/screens/landing/Footer"
import { BookADemoSection } from "../../common/BookDemo"
import { HeaderSection } from "./HeaderSection"
import { BlogSection } from "@/components/screens/landing/Blog/BlogSection"
import useSWR from "swr"
import { AgentInfo } from "@microfox/types"
import { DemoSections } from "./DemoSections"
import { UseCaseSection } from "./UseCaseseSection"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import { getAgentNameFromPath, useAgentData } from "../../common/helper"
import { useParams, usePathname, useRouter } from "next/navigation"
import { VideoSection } from "../../common/VideoSection"


export const SlackLandingPage = () => {

    const { data: agentData } = useAgentData();



    const thisAgent = agentData?.[0];

    return (
        <div>
            <HeaderSection />
            <UseCaseSection />
            <VideoSection description="Slack'd is a 1-stop desk to operate all your slack workspace." />
            <DemoSections />
            <BookADemoSection />
            <BlogSection category="Community Management" />
            <FooterSection />
        </div>
    )
}