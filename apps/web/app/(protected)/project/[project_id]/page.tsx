import ProtectedPage from '@/components/auth/ProtectedPage'
import { ProjectPage } from '@/components/screens/ProjectPage/ProjectPage'

export default function ProjectDashbaordPage({
  params,
}: {
  params: {
    project_id: string
  }
}) {
  return (
    <ProtectedPage>
      <ProjectPage />
    </ProtectedPage>
  )
}
