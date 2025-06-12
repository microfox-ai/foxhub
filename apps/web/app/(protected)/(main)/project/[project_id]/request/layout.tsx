import { WebContainerProvider } from "@/components/screens/Chat/message/WebContainerProvider";

export default function RequestLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <WebContainerProvider initializeWebContainer={true}>
            {children}
        </WebContainerProvider>
    );
}
