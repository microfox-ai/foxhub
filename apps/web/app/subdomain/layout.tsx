import { FilloutPopupProvider } from "@/components/screens/landing/FilloutPopupProvider"
import { FooterSection } from "@/components/screens/landing/Footer"
import NewHeader from "@/components/screens/landing/Header/NewHeader"

const LandingLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <FilloutPopupProvider
            formParams={{
                formId: ``,
            }}
        >
            <main>{children}</main>
        </FilloutPopupProvider>
    )
}

export default function LandingPageLayout({ children }: { children: React.ReactNode }) {
    return (
        <LandingLayout>
            {children}
        </LandingLayout>
    )
}