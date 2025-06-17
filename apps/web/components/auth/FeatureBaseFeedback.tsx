"use client"; // NextJS 13 requires this. Remove if you are using NextJS 12 or lower
import { useEffect } from "react";
import Script from "next/script";

export const openFeedbackWidget = () => {
    return window.postMessage({
        target: 'FeaturebaseWidget',
        data: {
            action: 'openFeedbackWidget',
            //setBoard: 'feedback', // optional - preselect a board
        }
    })
}

const FeaturebaseFeedback = () => {
    useEffect(() => {
        const win = window as any;

        if (typeof win.Featurebase !== "function") {
            win.Featurebase = function () {
                // eslint-disable-next-line prefer-rest-params
                (win.Featurebase.q = win.Featurebase.q || []).push(arguments);
            };
        }
        win.Featurebase("initialize_feedback_widget", {
            organization: "microfox", // Replace this with your organization name, copy-paste the subdomain part from your Featurebase workspace url (e.g. https://*yourorg*.featurebase.app)
            theme: "light",
            placement: "right", // optional - remove to hide the floating button
            //email: "youruser@example.com", // optional
            //defaultBoard: "reportbug", // optional - preselect a board
            locale: "en", // Change the language, view all available languages from https://help.featurebase.app/en/articles/8879098-using-featurebase-in-my-language 
            //metadata: null // Attach session-specific metadata to feedback. Refer to the advanced section for the details: https://help.featurebase.app/en/articles/3774671-advanced#7k8iriyap66
        });
    }, []);

    return (
        <>
            <Script src="https://do.featurebase.app/js/sdk.js" id="featurebase-sdk" />
            {/* <div className="fixed bottom-4 right-4 rotate-90">
                <button data-featurebase-feedback className="bg-black text-white px-4 py-2 rounded-md">Open Widget</button>
            </div> */}
        </>
    );
};

export default FeaturebaseFeedback;