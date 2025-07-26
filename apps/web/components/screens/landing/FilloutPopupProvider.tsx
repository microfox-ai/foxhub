'use client';

import { createContext, useContext, useState } from 'react';
import { FilloutSliderEmbed } from '@fillout/react';

export const InviteLinks = {
    Slack: `https://join.slack.com/t/microfoxoss/shared_invite/zt-399vobsye-6VLae3jVUkRybJI5FEhO0A`,

}

export const FilloutFormIds = {
    BookCall: `iNbFWaZ8Xzus`,
    SimpletonGetStarted: `oXdihN68Kbus`,
    Partnerships: `v6xbNmfxoTus`,
    SlackDDemo: `5FDyfv7c9Kus`,
};

const FilloutPopupContext = createContext<ReturnType<
    typeof useFilloutPopupInternal
> | null>(null);

export interface FilloutFormParams {
    formId: string;
    parameters?: any;
}

const useFilloutPopupInternal = (formParams: FilloutFormParams) => {
    const [isOpen, setIsOpen] = useState(false);
    const [formId, setFormId] = useState(formParams.formId);
    const openForm = (_formId: string) => {
        setFormId(_formId);
        setIsOpen(true);
    };
    const closeForm = () => {
        setIsOpen(false);
    };

    return {
        isOpen,
        setIsOpen,
        formId,
        changeFormId: setFormId,
        openForm,
        closeForm,
    };
};

export const FilloutPopupProvider = ({
    children,
    formParams,
}: {
    children: React.ReactNode;
    formParams: FilloutFormParams;
}) => {
    const hook = useFilloutPopupInternal(formParams);
    return (
        <FilloutPopupContext.Provider value={hook}>
            {children}
            {hook.isOpen && (
                <FilloutSliderEmbed
                    filloutId={hook.formId}
                    inheritParameters
                    parameters={formParams.parameters}
                    onClose={() => hook.setIsOpen(false)}
                    sliderDirection="right"
                    isOpen={hook.isOpen}
                />
            )}
        </FilloutPopupContext.Provider>
    );
};

export const useFilloutPopup = () => {
    const context = useContext(FilloutPopupContext);
    if (!context) {
        throw new Error('useFilloutPopup must be used within a FilloutPopupProvider');
    }
    return context;
};
