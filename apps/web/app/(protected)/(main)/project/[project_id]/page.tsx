import ProtectedPage from "@/components/auth/ProtectedPage";
import { ProjectPage } from "@/components/screens/ProjectPage/ProjectPage";

export default function ProjectDashbaordPage() {
  return (
    <ProtectedPage>
      <ProjectPage />
    </ProtectedPage>
  );
}
