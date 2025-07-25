"use client"

import { FooterSection } from "@/components/screens/landing/Footer"
import { BookADemoSection } from "./BookDemo"
import { HeaderSection } from "./HeaderSection"
import { BlogSection } from "@/components/screens/landing/Blog/BlogSection"
import useSWR from "swr"
import { AgentInfo } from "@microfox/types"
import { DemoSections } from "./DemoSections"
import { UseCaseSection } from "./UseCaseseSection"

const fetcher = (url: string) => fetch(url).then((res) => res.json());


export const SlackLandingPage = () => {
    const { data: agentData } = useSWR<AgentInfo[]>("/api/agents/infos?agentNames=slack", fetcher)

    const thisAgent = agentData?.[0]
    return (
        <div>
            <HeaderSection />
            <UseCaseSection />
            <DemoSections />
            <BookADemoSection />
            <BlogSection category="Community Management" />
            <FooterSection />
        </div>
    )
}