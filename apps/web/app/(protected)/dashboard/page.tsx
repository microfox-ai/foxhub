import ProtectedPage from "@/components/auth/ProtectedPage";
import { CustomBotsHomePage } from "@/components/screens/HomePage";

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <CustomBotsHomePage />
    </ProtectedPage>
  );
}
