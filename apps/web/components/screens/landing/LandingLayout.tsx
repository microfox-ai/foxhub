import { FilloutPopupProvider } from "./FilloutPopupProvider"
import { FooterSection } from "./Footer"
import NewHeader from "./Header/NewHeader"


export const LandingLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <FilloutPopupProvider
            formParams={{
                formId: ``,
            }}
        >
            <NewHeader />
            <main>{children}</main>
            <FooterSection />
        </FilloutPopupProvider>
    )
}