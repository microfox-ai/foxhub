/* eslint-disable @next/next/no-img-element */
'use client'
import Image from "next/image";
import { APP_ROUTES, SOCIAL_ROUTES } from "@/utils/constants/appInfo";
import { Tooltip } from "@mui/material";
import Link from "next/link";
import { FilloutFormIds, useFilloutPopup } from "@/components/screens/landing/FilloutPopupProvider";

const Company = [
    {
        name: "About Microfox",
        link: "/",
    },
    {
        name: "The Moon Devs",
        link: "https://themoondevs.com",
    },
    // {
    //     name: "Founders",
    //     link: "https://themoondevs.com/team/founder",
    // }
    // {
    //     name: "Why Choose Us ?",
    //     link: "/why-choose-us",
    // },
    // {
    //     name: "Testimonials",
    //     link: "/industries",
    // },
    // {
    //     name: "Pricing",
    //     link: "/pricing",
    // },
    // {
    //     name: "What's Complexity",
    //     link: "/complexity",
    // },
];

const Legal = [
    {
        name: "Privacy Policy",
        link: APP_ROUTES.privacyPolicy,
    },
    {
        name: "Terms & Conditions",
        link: APP_ROUTES.termsOfService,
    },
    {
        name: "Cancellation & Refund",
        link: APP_ROUTES.cancellationPolicy,
    },
    {
        name: "Service Delivery",
        link: APP_ROUTES.serviceDeliveryPolicy,
    }
];

// const JoinUs = [
//   // {
//   //   name: "Become a Moon Dev",
//   //   link: APP_ROUTES.careers,
//   // },
//   // {
//   //   name: "Refer and Earn",
//   //   link: APP_ROUTES.refer_earn,
//   // },
// ];

const SocialLinks = [
    // {
    //     name: "Twitter",
    //     link: SOCIAL_ROUTES.twitter,
    //     icon: "/filled-icons/twitter.svg",
    //     helperText: "Connect with us on Twitter",
    // },
    // {
    //     name: "LinkedIn",
    //     link: SOCIAL_ROUTES.linkedin,
    //     icon: "/filled-icons/linkedin.svg",
    //     helperText: "Connect with us on LinkedIn",
    // },
    {
        name: "LinkedIn",
        link: SOCIAL_ROUTES.linkedin,
        icon: "https://cdn.svgporn.com/logos/linkedin-icon.svg",
        helperText: "Connect with us on LinkedIn",
    },
    {
        name: "X",
        link: SOCIAL_ROUTES.twitter,
        icon: "https://cdn.svgporn.com/logos/x.svg",
        helperText: "Connect with us on X",
    },
    {
        name: "YouTube",
        link: SOCIAL_ROUTES.youtube,
        icon: "https://cdn.svgporn.com/logos/youtube-icon.svg",
        helperText: "Watch our videos on YouTube",
    },
    {
        name: "Discord",
        link: SOCIAL_ROUTES.discord,
        icon: "https://cdn.svgporn.com/logos/discord-icon.svg",
        helperText: "Join Discord",
    },
    // {
    //     name: "Telegram",
    //     link: SOCIAL_ROUTES.telegram,
    //     icon: "/filled-icons/telegram.svg",
    //     helperText: "Join Telegram",
    // },
    // {
    //     name: "Instagram",
    //     link: SOCIAL_ROUTES.instagram,
    //     icon: "/filled-icons/instagram.svg",
    //     helperText: "Follow us on Instagram",
    // },
];

export const FooterSection = () => {
    const { openForm } = useFilloutPopup();

    return (
        <footer className="w-full relative overflow-hidden text-black">
            {/* Logo Bar */}
            <div className="relative w-full flex flex-row justify-between items-center p-6 md:p-8 lg:p-12 pb-4 md:pb-6">
                <div className="flex flex-row items-center gap-4">
                    <Image src="/logo-filled.png" alt="Microfox" width={40} height={40} />
                    <span className="text-lg font-light uppercase tracking-[0.5em] cursor-pointer md:text-base">
                        Microfox
                    </span>
                </div>
                <p className="text-lg md:text-base hidden sm:block">Saving Time for Startups & Agencies.</p>

                {/* Divider */}
                <div className="absolute h-px left-0 right-0 bottom-0 w-[97%] mx-auto bg-black"></div>
            </div>

            {/* Footer Links */}
            <div className="flex flex-col md:flex-row justify-between p-6 md:p-8 lg:p-12 pt-4 md:pt-6 gap-8 md:gap-0">
                {/* Product Links */}
                <div className="flex flex-col sm:flex-row justify-between gap-8 w-full md:w-1/2 md:flex-wrap lg:gap-4">
                    {/* Company Links */}
                    <div className="flex flex-col gap-2">
                        <span className="text-base font-medium">Company</span>
                        <ul className="flex flex-col gap-2">
                            {Company.map((item, index) => (
                                <li key={index} className="text-base font-light opacity-70 hover:opacity-100 cursor-pointer">
                                    <Link href={item.link}>{item.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div className="flex flex-col gap-2">
                        <span className="text-base font-medium">Legal</span>
                        <ul className="flex flex-col gap-2">
                            {Legal.map((item, index) => (
                                <li key={index} className="text-base font-light opacity-70 hover:opacity-100 cursor-pointer">
                                    <Link href={item.link}>{item.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Join Us Links */}
                    <div className="flex flex-col gap-2">
                        <span className="text-base font-medium">Developers</span>
                        <ul className="flex flex-col gap-2">
                            <li
                                className="text-base font-light opacity-70 hover:opacity-100 cursor-pointer"
                            >
                                <Link href={"https://github.com/microfox-ai/microfox"}>Micro SDKs</Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Social Links & CTA */}
                <div className="flex flex-col sm:flex-row gap-6 h-fit items-start sm:items-center md:w-1/2 md:justify-end">
                    {/* Sign Up Button */}
                    <div
                        className="text-base font-normal h-fit py-1 px-4 cursor-pointer bg-transparent border border-black transition-all duration-300 ease-in-out hover:bg-black hover:text-white whitespace-nowrap"
                        onClick={() => openForm(FilloutFormIds.BookCall)}
                    >
                        Sign up for free trial
                    </div>

                    {/* Social Icons */}
                    <div className="flex items-center gap-4">
                        {SocialLinks.map((item, index) => (
                            <Link href={item.link} key={index}>
                                <Tooltip
                                    title={item.helperText}
                                    placement="bottom"
                                >
                                    <div className="cursor-pointer">
                                        <Image
                                            src={item.icon}
                                            alt={item.name}
                                            width={22}
                                            height={22}
                                        />
                                    </div>
                                </Tooltip>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Copyright */}
            <div className="w-full text-center py-4 border-t border-black">
                <p className="text-sm font-light opacity-70">
                    © {new Date().getFullYear()} TheMoonDevs. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

