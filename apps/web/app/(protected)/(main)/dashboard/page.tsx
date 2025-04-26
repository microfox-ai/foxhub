import ProtectedPage from "@/components/auth/ProtectedPage";
// import { CustomBotsHomePage } from "@/components/screens/HomePage";
import Dashboard from "@/components/screens/dashboard/Dashboard";
export default function DashboardPage() {
  return (
    <ProtectedPage>
      {/* <CustomBotsHomePage /> */}
      <Dashboard />
    </ProtectedPage>
  );
}
