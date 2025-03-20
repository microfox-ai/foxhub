import { PageProps } from "@/.next/types/app/layout";
import ProtectedPage from "@/components/auth/ProtectedPage";
import { ProjectPage } from "@/components/screens/ProjectPage/ProjectPage";

export default function ProjectDashbaordPage({
  params,
}: PageProps) {
  return (
    <ProtectedPage>
      <ProjectPage />
    </ProtectedPage>
  );
}
