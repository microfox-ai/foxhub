import { PortalSdk } from '@/utils/services/PortalSdk'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getTemplateIcon } from './helpers/ui'
import { ClientRequest } from '@prisma/client'
import { useClientSecrets } from '../providers/ClientSecretProvider'

interface SlashModalProps {
  clientRequest: ClientRequest
  onClose: () => void
  onSuccess: () => Promise<void>
}

export function SlashModal({
  clientRequest,
  onClose,
  onSuccess,
}: SlashModalProps) {
  // --- Handlers for the slash modal ---
  // When user clicks a client bot from the slash modal, you could attach its info to the message.
  const {
    showSlashModal,
    clientSecrets,
    refreshClientSecrets,
    isLoading: clientSecretsLoading,
    setShowSlashModal,
  } = useClientSecrets()

  const handleSelectClientSecret = async (botId: string) => {
    try {
      await PortalSdk.putData('/api/client-secrets', {
        id: botId,
        clientRequestId: clientRequest.id,
      })
      toast.success('Bot added to this request successfully!')
      setShowSlashModal(false)
      onClose()
      await refreshClientSecrets()
      await onSuccess()
    } catch (error) {
      toast.error('Failed to add bot to request.')
      console.error('Error:', error)
    }
  }

  // Handle removing a client bot from the request (not deleting the bot itself)
  const handleRemoveClientSecret = async (botId: string) => {
    try {
      await PortalSdk.deleteData(
        `/api/client-secrets?id=${botId}&clientRequestId=${clientRequest.id}&removeOnly=true`,
        {}
      )
      toast.success('Bot removed from this request successfully!')
      setShowSlashModal(false)
      onClose()
      await refreshClientSecrets()
      await onSuccess()
    } catch (error) {
      toast.error('Failed to remove bot from request.')
      console.error('Error removing bot from request:', error)
    }
  }

  if (!showSlashModal) return null

  return (
    <div className="absolute bottom-20 left-4 z-20 w-11/12 max-w-md rounded-lg bg-white p-4 shadow-lg">
      <div className="flex flex-col gap-2">
        {clientSecretsLoading ? (
          <div className="flex justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2">Loading bots...</span>
          </div>
        ) : clientSecrets && clientSecrets.length > 0 ? (
          <>
            <h2 className="text-sm">Bots used in this request</h2>
            {clientSecrets
              .filter((bot) => bot.clientRequestIds.includes(clientRequest?.id))
              .map((bot) => (
                <div
                  key={`${bot.id}`}
                  className="flex items-center justify-between gap-2 rounded bg-gray-200 p-2"
                >
                  <div className="flex items-center gap-2">
                    {getTemplateIcon(bot.type)} {bot.name}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveClientSecret(bot.id)
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                      <path
                        fillRule="evenodd"
                        d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            <h2 className="text-sm">Add your Bots to this request</h2>
            {clientSecrets
              .filter(
                (bot) => !bot.clientRequestIds.includes(clientRequest?.id)
              )
              .map((bot) => (
                <div
                  key={`${bot.id}`}
                  className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-100"
                  onClick={() => handleSelectClientSecret(bot.id)}
                >
                  {getTemplateIcon(bot.type)} {bot.name}
                </div>
              ))}
          </>
        ) : (
          <div className="text-sm text-gray-500">No bots found.</div>
        )}
        <button
          className="mt-2 rounded bg-blue-500 p-2 text-white"
          onClick={onClose}
        >
          + Create New Bot
        </button>
      </div>
    </div>
  )
}
