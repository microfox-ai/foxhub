import ProtectedPage from "@/components/auth/ProtectedPage";
import { ProjectPage } from "@/components/screens/ProjectPage/ProjectPage";
import Dashboard from "@/components/screens/dashboard/Dashboard";

export default function ProjectDashbaordPage() {
    return (
        <ProtectedPage>
            <Dashboard defaultTab="tasks" />
        </ProtectedPage>
    );
}
