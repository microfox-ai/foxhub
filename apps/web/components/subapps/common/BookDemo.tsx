import { FilloutFormIds, InviteLinks, useFilloutPopup } from "@/components/screens/landing/FilloutPopupProvider"
import { Button } from "@/components/ui/button"
import { ChevronRightIcon } from "lucide-react"
import { getFilloutFormIdFromAgentName, getInviteLinkFromAgentName, useAgentData } from "./helper";


export const BookADemoSection = ({ subdomain }: { subdomain: string | null }) => {

    const { openForm } = useFilloutPopup();
    const { data: agentData } = useAgentData(undefined, subdomain ?? undefined);

    const thisAgent = agentData?.[0];

    return (
        <div className="flex relative min-h-screen min-w-screen items-center justify-center bg-gray-100 p-4">
            <div className="absolute inset-0 bg-white flex flex-row">
                <img className="w-1/2 h-full object-cover object-right" src="/images/BetaMicrofox.png" alt="Subscribe Background" />
                <img className="w-1/2 h-full object-cover object-left" src={`/images/${thisAgent?.agentName}/beta.png`} alt="Subscribe Background" />
            </div>
            <div className="absolute inset-0  flex flex-col items-center justify-center">
                <div className="w-full max-w-lg rounded-xl bg-white p-16 shadow-xl">
                    <div className="text-center text-left">
                        <h1 className="text-4xl font-bold text-gray-800">
                            Try {thisAgent?.title} for free
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            We can set you up within 15mins.
                        </p>
                        <p className="text-md text-gray-600 mt-4 border-l-4 border-black pl-4">
                            In the age of AI, we know you are busy, and we are too, but great beginnings might start with a single call.
                        </p>
                        <div className="mt-4 gap-4 flex flex-row">
                            <Button
                                variant="outline"
                                type="submit" className="mt-4"
                                onClick={() => {
                                    window.open(getInviteLinkFromAgentName(thisAgent?.agentName ?? ""), "_blank")
                                }}
                            >
                                # Join Community
                            </Button>
                            <Button
                                variant="default"
                                type="submit" className="mt-4"
                                onClick={() => openForm(getFilloutFormIdFromAgentName(thisAgent?.agentName ?? ""))}
                            >
                                Book Full Demo
                                <ChevronRightIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}