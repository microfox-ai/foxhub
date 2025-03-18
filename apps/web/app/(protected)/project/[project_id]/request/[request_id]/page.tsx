import ProtectedPage from '@/components/auth/ProtectedPage'
import { RequestPage } from '@/components/screens/RequestPage/RequestPage'

export default function RequestWindow({
  params,
}: {
  params: {
    request_id: string
    project_id: string
  }
}) {
  return (
    <ProtectedPage>
      <RequestPage />
    </ProtectedPage>
  )
}
