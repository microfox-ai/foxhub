import { Inter } from "next/font/google"

const inter = Inter({
    subsets: ["latin"],
    weight: ["400"],
})


const USE_CASES = [
    "Message 10,000+ users on slack with templates",
    "Summarize the happenings from your channels",
    "Onboard & offboard employees with ease",
    "Interconnect with Other AI Agents",
    "Set User Reminders that trigger X mins before meet.",
    "Take Feedback with Emojis",
    "Create Private Channels & add users to them"
] as const;

export const UseCaseSection = () => {
    return (
        <div className="w-full h-screen flex flex-row items-stretch">
            <div className="w-1/2 h-full bg-black text-white p-20 flex flex-col">
                <h1 className="text-4xl font-bold">What can Slack'd do ?</h1>
                <p className="text-2xl text-white/50">
                    A 1-stop desk to operate all your slack workspace.
                </p>
                <div className="space-y-4 mt-auto">
                    {USE_CASES.map((useCase, index) => (
                        <div
                            key={index}
                            className={`text-2xl font-light cursor-pointer hover:text-white/50 transition-colors ${inter.className}`}
                        >
                            {useCase}
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-1/2 h-full bg-black">
                <img src="/images/slack/usecases.png" alt="Slack'd Use Cases" className="w-full h-full object-cover" />
                {/* Right side content can be added here */}
            </div>
        </div>
    )
}