import { FilloutFormIds, InviteLinks, useFilloutPopup } from "@/components/screens/landing/FilloutPopupProvider"
import { Button } from "@/components/ui/button"
import { AgentInfo } from "@microfox/types"
import { CheckIcon, ChevronRightIcon, PlusIcon } from "lucide-react"
import { Quando } from "next/font/google"
import useSWR from "swr"
import { getFilloutFormIdFromAgentName, getInviteLinkFromAgentName, useAgentData } from "../../common/helper"

const quicksand = Quando({
    subsets: ['latin'],
    weight: ['400'],
})

export const HeaderSection = () => {

    const { data: agentData } = useAgentData()

    const thisAgent = agentData?.[0]

    const { openForm } = useFilloutPopup()

    return (
        <div className="flex relative min-h-screen min-w-screen items-center justify-center bg-gray-100 p-4">
            <div className="absolute inset-0 bg-white flex flex-row">
                <img className="w-full h-full object-cover object-left" src={`/images/${thisAgent?.agentName}/header.png`} alt="Subscribe Background" />
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-full flex flex-col items-center justify-start gap-8">
                    <h3 className={`text-8xl font-bold text-white  ${quicksand.className}`}>{thisAgent?.title}</h3>
                    <p className="text-3xl max-w-lg text-white/80 ml-4">
                        Research & find the <span className="border-b border-white/80 pb-1 px-1">current</span> trends, active users, and more.
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
                            window.open("https://staging.microfox.app/subscribe?source=ragreddit", "_blank")
                        }}
                    >
                        Get Started
                    </Button>
                    <Button
                        variant="default"
                        color="white"
                        onClick={() => openForm(getFilloutFormIdFromAgentName(thisAgent?.agentName ?? ""))}
                        type="submit" className="mt-4 bg-white text-black hover:bg-white/80 hover:text-black">
                        Book Demo
                        <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            <div className="absolute bottom-8 left-8 right-8 flex flex-row items-center justify-center">
                <div className="flex flex-col items-center justify-center gap-4">
                    <Button
                        variant="default"
                        type="submit"
                        size={"lg"}
                        className="mt-4 py-4! px-8! text-xl bg-white text-black hover:bg-white/80 hover:text-black"
                        onClick={() => {
                            window.open("https://staging.microfox.app/subscribe?source=ragreddit", "_blank")
                        }}
                    >
                        Get Started
                        <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                    <p className="text-white/50 text-lg">
                        Beta access is now available for Free testing.
                    </p>
                </div>
            </div>
        </div>
    )
}