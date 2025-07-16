import ProtectedPage from "@/components/auth/ProtectedPage";
import { RequestPage } from "@/components/screens/RequestPage/RequestPage";

export default function RequestWindow() {
    return (
        <ProtectedPage>
            <RequestPage />
        </ProtectedPage>
    );
}
