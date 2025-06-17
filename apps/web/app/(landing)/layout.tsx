import { LandingLayout } from "@/components/screens/landing/LandingLayout";

export default function LandingLayoutThis({ children }: { children: React.ReactNode }) {
    return (
        <LandingLayout>
            {children}
        </LandingLayout>
    )
}