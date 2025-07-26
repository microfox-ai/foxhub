import { FilloutFormIds, InviteLinks, useFilloutPopup } from "@/components/screens/landing/FilloutPopupProvider"
import { Button } from "@/components/ui/button"
import { AgentInfo } from "@microfox/types"
import { ChevronRightIcon } from "lucide-react"
import { Quicksand } from "next/font/google"
import useSWR from "swr"

const quicksand = Quicksand({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
})

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const HeaderSection = () => {

    const { data: agentData } = useSWR<AgentInfo[]>("/api/agents/infos?agentNames=slack", fetcher)

    const thisAgent = agentData?.[0]

    const { openForm } = useFilloutPopup()

    return (
        <div className="flex relative min-h-screen min-w-screen items-center justify-center bg-gray-100 p-4">
            <div className="absolute inset-0 bg-white flex flex-row">
                <img className="w-full h-full object-cover object-left" src={`/images/slack/header.png`} alt="Subscribe Background" />
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-full flex flex-row items-center justify-center gap-8">
                    <h3 className={`text-8xl font-bold text-white  ${quicksand.className}`}>Slack'd</h3>
                    <p className="text-3xl max-w-lg text-white/80 ml-4">
                        Observe, operate & automate your internal <span className="border-b border-white/80 pb-1 px-1">slack</span> systems.
                    </p>
                </div>
            </div>
            <div className="absolute top-8 left-8 right-8 flex flex-row items-center justify-between">
                <div className="flex flex-row items-center justify-center gap-4">
                    <img src={thisAgent?.iconUrl} alt="Slack'd Logo" className="w-12 h-12 rounded-full" />
                </div>
                <div className="flex flex-row items-center justify-center gap-4">
                    <Button
                        variant="outline"
                        type="submit" className="mt-4 bg-transparent text-white hover:bg-white/10 hover:text-white"
                        onClick={() => {
                            window.open(InviteLinks.Slack, "_blank")
                        }}
                    >
                        # Join Community
                    </Button>
                    <Button
                        variant="default"
                        color="white"
                        onClick={() => openForm(FilloutFormIds.SlackDDemo)}
                        type="submit" className="mt-4 bg-white text-black hover:bg-white/80 hover:text-black">
                        Book Demo
                        <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}