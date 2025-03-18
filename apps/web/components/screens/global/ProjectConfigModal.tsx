'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ButtonSCN } from '@/components/elements/Button'
import { PortalSdk } from '@/utils/services/PortalSdk'
import { toast } from 'sonner'
import Input from '@/components/elements/Input'

type Configs = Record<string, any>

export default function ProjectConfigModal({
  isOpen,
  onClose,
  projectId,
}: {
  isOpen: boolean
  onClose: () => void
  projectId: string
}) {
  const [configs, setConfigs] = useState<Configs>({})
  const [loading, setLoading] = useState(false)
  const [editingKey, setEditingKey] = useState('')
  const [editingValue, setEditingValue] = useState('')

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/bot-project/configs?id=${projectId}`
      )
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setConfigs(data?.prodConfigs || {})
      }
    } catch (error: any) {
      toast.error('Failed to fetch configurations.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchConfigs()
    }
  }, [isOpen, projectId])

  const handleUpdateConfig = async () => {
    if (!editingKey) return
    const newConfig = { [editingKey]: editingValue }
    try {
      const data = await PortalSdk.putData(
        '/api/bot-project/configs',
        {
          id: projectId,
          configs: newConfig,
          type: 'prod',
        }
      )
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success('Configuration updated!')
        setConfigs(data?.updatedProject?.prodConfigs || {})
        setEditingKey('')
        setEditingValue('')
      }
    } catch (error: any) {
      toast.error('Failed to update configuration.')
      console.error(error)
    }
  }

  const handleDeleteConfig = async (key: string) => {
    try {
      const data = await PortalSdk.deleteData(
        '/api/bot-project/configs',
        {
          id: projectId,
          keysToDelete: [key],
          type: 'prod',
        }
      )
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success('Configuration deleted!')
        setConfigs(data?.updatedProject?.prodConfigs || {})
      }
    } catch (error: any) {
      toast.error('Failed to delete configuration.')
      console.error(error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Project Configurations</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-center">Loading configurations...</p>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {Object.keys(configs).length === 0 ? (
                <p className="text-center text-sm text-gray-500">
                  No configurations found.
                </p>
              ) : (
                Object.entries(configs).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-1/3 font-bold">{key}:</span>
                    <span className="w-1/2 break-words">
                      {JSON.stringify(value)}
                    </span>
                    <ButtonSCN
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConfig(key)}
                    >
                      Delete
                    </ButtonSCN>
                  </div>
                ))
              )}
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 font-bold">Add / Update Config</p>
                <Input
                  id="key"
                  label="Key"
                  value={editingKey}
                  onChange={(e) => setEditingKey(e.target.value)}
                  disabled={loading}
                />
                <Input
                  id="value"
                  label="Value"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <DialogFooter>
              <ButtonSCN
                variant="default"
                onClick={handleUpdateConfig}
                disabled={!editingKey || !editingValue}
              >
                Save Config
              </ButtonSCN>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
