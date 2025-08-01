"use client"; // NextJS 13 requires this. Remove if you are using NextJS 12 or lower

import Script from "next/script";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import useSWR from "swr";
import FeaturebaseFeedback from "./FeatureBaseFeedback";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const FeatureBase = () => {

    const { user } = useAuth();

    const { data: userHashData } = useSWR(user?.email ? `/api/landing/featurebase/identity?email=${user?.email}` : null, fetcher);

    useEffect(() => {

        if (!user) return;
        if (!userHashData) return;
        const win = window as any;
        if (typeof win.Featurebase !== "function") {
            win.Featurebase = function () {
                (win.Featurebase.q = win.Featurebase.q || []).push(arguments);
            };
        }

        //console.log("Sending data to FeatureBase", user, userHashData);
        win.Featurebase(
            "identify",
            {
                // Each 'identify' call should include an "organization"
                // property, which is your Featurebase board's name before the
                // ".featurebase.app".
                organization: "microfox",
                // Required fields. Replace with your customers data.
                email: user.email,
                name: user.name,
                id: user.id,
                userHash: userHashData.userHash,
                // Both email and userId should be provided when possible
                // At minimum, either email or userId must be present

                // Optional - add a profile picture to the user
                profilePicture: user.avatar,
                // Optional - include other fields as needed
                customFields: {
                    admin: user.isAdmin ? "Admin" : "User",
                    beta: user.isBetaAccess ? "Beta" : "User",
                },
                // Optional, uncomment if you are looking to use multilingual changelog
                // locale: "en", // Will make sure the user receives the changelog email in the correct language
                // Optional - add user company information as needed
                // companies: [
                //   {
                //     id: "987654321", // required
                //     name: "Business Inc. 23", // required
                //     monthlySpend: 500, // optional
                //     createdAt: "2023-05-19T15:35:49.915Z", // optional
                //     customFields: {
                //       industry: "Fintech",
                //       location: "Canada",
                //     }, // optional
                //   },
                // ], // optional
            },
            (err: any) => {
                // Callback function. Called when identify completed.
                if (err) {
                    console.error(err);
                } else {
                    console.log("Data sent successfully!");
                }
            }
        );
    }, [user, userHashData]);

    return (
        <>
            <Script src="https://do.featurebase.app/js/sdk.js" id="featurebase-sdk" />
            <div></div>
        </>
    );
};

export default FeatureBase;

export const FeatureBaseLinkAttributes = {
    "data-featurebase-link": true,
    href: "https://microfox.featurebase.app",
    target: "_blank",
    rel: "noopener noreferrer"
};

export const FeatureBaseLink = ({ className, children }: { className?: string, children: React.ReactNode }) => {
    return (
        <a {...FeatureBaseLinkAttributes} className={className}>
            {children}
        </a>
    );
};

export const FeatureBaseEmbed = () => {
    useEffect(() => {
        const win = window as any;

        if (typeof win.Featurebase !== "function") {
            win.Featurebase = function () {
                // eslint-disable-next-line prefer-rest-params
                (win.Featurebase.q = win.Featurebase.q || []).push(arguments);
            };
        }
        win.Featurebase("init_embed_widget", {
            /* Required - Organization identifier */
            organization: "microfox", // Replace with your organization name (subdomain from your Featurebase workspace URL)

            embedOptions: {
                path: "/", // Initial page to load: '/' for feedback board, '/roadmap' for roadmap, '/changelog' for changelog, etc.
                filters: "", // Query params that can be used for default filters (e.g. 'b=63f827df2d62cb301468aac4&sortBy=upvotes:desc')
                // routeSyncingBasePath: "" // ADVANCED - Sync URLs between your website & the embed, read the documentation below for usage
            },

            /* Optional - Styling configuration */
            stylingOptions: {
                theme: "light", // Theme options: 'light', 'dark', or '' for auto-detection
                hideMenu: false, // Toggle visibility of the top navigation bar
                hideLogo: false, // Toggle visibility of the logo in the navigation bar
            },

            /* Optional - User authentication & data */
            // user: {
            //   jwt: "", // For SSO authentication, use jwt parameter here
            //   metadata: {} // Custom metadata to attach to feedback submissions
            // },
            // Note: When SDK identify is set up, the user will be automatically authenticated

            /* Optional - Localization */
            // locale: "en" // Language setting (all available at https://help.featurebase.app/en/articles/8879098)
        });
    }, []);

    return (
        <>
            <Script src="https://do.featurebase.app/js/sdk.js" id="featurebase-sdk" />
            <div data-featurebase-embed data-featurebase-theme="light" className="w-full h-full"></div>
        </>
    );
};
