

const DataDemos = [
    {
        title: (
            <span>
                Fine tuned <br /><i className="border-b-[5px] border-[#87008A]">Ai Control</i> with Human loop
            </span>
        ),
        description: "All Ai actions approved & directed by you, reducing the risk of Ai hallucinations.",
        video: "/videos/slack/microfox-singlecut-humanloop.mp4",
        icon: "/images/slack/microfox-singlecut-humanloop.png",
        videoHeight: "50vh"
    },
    {
        title: (
            <span>
                <i className="border-b-[5px] border-[#87008A]">Style & Appear</i> as needed when messaging
            </span>
        ),
        description: "Design your community & workspace to your brand style - Change the bot name & icon.",
        video: "/videos/slack/microfox-singlecut-appear.mp4",
        icon: "/images/slack/microfox-singlecut-humanloop.png",
        videoHeight: "50vh"
    },
    {
        title: (
            <span>
                Switch between <i className="border-b-[5px] border-[#87008A] -pb-2">Slack Teams</i> with ease
            </span>
        ),
        description: "Connect with a click & use as you see fit.",
        video: "/videos/slack/microfox-singlecut-oauth.mp4",
        icon: "/images/slack/microfox-singlecut-oauth.png",
        videoHeight: "50vh"
    },
    // {
    //     title: "Fine Crafted Tools to suit your needs.",
    //     description: "Tools to suit your needs, from simple to complex - repeat tested.",
    //     video: "/videos/slack/microfox-singlecut-tools.mp4",
    //     icon: "/images/slack/microfox-singlecut-humanloop.png",
    //     videoHeight: "50vh"
    // },
]

export const DemoSections = () => {
    return (
        <div className="w-full flex flex-col items-stretch">
            {DataDemos.map((demo, index) => (
                <div className={`w-full relative flex items-stretch ${index % 2 === 0 ? "flex-row-reverse" : "flex-row"}`}>
                    <div className="w-1/2 bg-black flex flex-col items-stretch justify-center">
                        <video autoPlay loop muted className={`w-full object-cover object-center ${demo.videoHeight ? `h-[${demo.videoHeight}]` : "h-auto"}`} >
                            <source src={demo.video} type="video/mp4" />
                        </video>
                    </div>
                    <div className="w-1/2">
                        <div className={`p-10 m-10 h-[${demo.videoHeight ? "90vh" : "100%"}] border border-[20px] border-black 4A154B flex flex-col gap-4 items-stretch justify-center`}>
                            <h2 className="text-6xl font-bold">
                                {demo.title}
                            </h2>
                            <p className="text-2xl text-black/80">
                                {demo.description}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}