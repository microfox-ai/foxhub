'use client'

import {
  BotTemplate,
  useBotTemplateContext,
} from '@/components/screens/providers/BotTemplateProvider'
import { useState } from 'react'
import { toast } from 'sonner'
import { PortalSdk } from '@/utils/services/PortalSdk'
import { getTemplateIcon } from './helpers/ui'
interface AddClientSecretModalProps {
  clientRequest: {
    id: string
    botProjectId: string
  }
  userId: string
  onSuccess: () => Promise<void>
}

export function AddClientSecretModal({
  clientRequest,
  userId,
  onSuccess,
}: AddClientSecretModalProps) {
  const { templates, showAddBotModal, setShowAddBotModal } =
    useBotTemplateContext()
  // States moved from ChatWindow
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(
    null
  )
  const [newClientSecretName, setNewClientSecretName] = useState('')
  const [botVariables, setBotVariables] = useState<
    Array<{
      mode: Array<'DEV' | 'PROD' | 'STAGING'>
      key: string
      value: string
      isOptional: boolean
    }>
  >([])
  const [customVariables, setCustomVariables] = useState<
    Array<{
      mode: Array<'DEV' | 'PROD' | 'STAGING'>
      key: string
      value: string
      isOptional: boolean
    }>
  >([])

  // Handlers moved from ChatWindow
  const handleSelectTemplate = (template: BotTemplate) => {
    setSelectedTemplate(template)
    const initialVariables = template.requiredKeys.map((req) => ({
      mode: req.mode,
      key: req.key,
      value: '',
      isOptional: req.isOptional,
    }))
    setBotVariables(initialVariables)
  }

  const handleVariableChange = (
    index: number,
    field: 'value' | 'mode' | 'isOptional',
    newValue: any
  ) => {
    setBotVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: newValue } : v))
    )
  }

  const handleAddCustomVariable = () => {
    setCustomVariables((prev) => [
      ...prev,
      {
        mode: ['DEV', 'PROD', 'STAGING'],
        key: '',
        value: '',
        isOptional: false,
      },
    ])
  }

  const handleCustomVariableChange = (
    index: number,
    field: 'key' | 'value' | 'mode' | 'isOptional',
    newValue: any
  ) => {
    setCustomVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: newValue } : v))
    )
  }

  const handleRemoveCustomVariable = (index: number) => {
    setCustomVariables((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveClientSecret = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template.')
      return
    }

    // Merge template-defined variables with custom ones
    const allVariables = [...botVariables, ...customVariables]

    // Ensure unique keys
    const keysSet = new Set()
    for (const varObj of allVariables) {
      if (!varObj.key.trim()) {
        toast.error(`Please provide a key name for all variables.`)
        return
      }
      if (keysSet.has(varObj.key)) {
        toast.error(`Duplicate key found: ${varObj.key}`)
        return
      }
      keysSet.add(varObj.key)
    }

    try {
      await PortalSdk.postData('/api/client-secrets', {
        botProjectId: clientRequest.botProjectId,
        userId,
        type: selectedTemplate.type,
        variables: allVariables,
        name: newClientSecretName || selectedTemplate.name,
        clientRequestId: clientRequest.id,
      })
      toast.success('New Bot keys added successfully!')
      setShowAddBotModal(false)
      setSelectedTemplate(null)
      setBotVariables([])
      setCustomVariables([])
      await onSuccess()
    } catch (error) {
      toast.error('Error creating client bot.')
      console.error(error)
    }
  }

  if (!showAddBotModal) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
      <div className="w-11/12 max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h4 className="mb-4 text-lg font-bold">Add New ClientSecret</h4>
        {!selectedTemplate ? (
          // Template selection view
          <>
            <p className="mb-2">Select a template:</p>
            <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
              {templates && templates.length > 0 ? (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-100"
                    onClick={() => handleSelectTemplate(tpl)}
                  >
                    {getTemplateIcon(tpl.type)} {tpl.name}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">
                  No templates available.
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded bg-gray-200 px-4 py-2"
                onClick={() => setShowAddBotModal(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          // Template configuration view
          <>
            <label className="block font-medium">Bot Name</label>
            <input
              type="text"
              className="mt-1 w-full rounded border p-2"
              placeholder={selectedTemplate.name}
              value={newClientSecretName || selectedTemplate.name || ''}
              onChange={(e) => setNewClientSecretName(e.target.value)}
            />
            <h5 className="my-2 font-semibold">Fill in variables</h5>
            {selectedTemplate.requiredKeys.map((req, index) => (
              <div key={req.key} className="mb-4">
                <label className="block font-medium">{req.key}</label>
                <small className="block text-xs text-gray-500">
                  Example: {req.placeholder} (Modes: {req.mode.join(', ')})
                </small>
                <input
                  type="text"
                  className="mt-1 w-full rounded border p-2"
                  placeholder={req.placeholder}
                  value={botVariables[index]?.value || ''}
                  onChange={(e) =>
                    handleVariableChange(index, 'value', e.target.value)
                  }
                />
                <div className="mt-1">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={botVariables[index]?.isOptional}
                      onChange={(e) =>
                        handleVariableChange(
                          index,
                          'isOptional',
                          e.target.checked
                        )
                      }
                    />
                    Optional
                  </label>
                </div>
              </div>
            ))}
            <div className="mb-4">
              <h5 className="mb-2 font-semibold">Custom Variables</h5>
              {customVariables.map((customVar, index) => (
                <div key={index} className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    className="w-1/3 rounded border p-2"
                    placeholder="Key"
                    value={customVar.key}
                    onChange={(e) =>
                      handleCustomVariableChange(index, 'key', e.target.value)
                    }
                  />
                  <input
                    type="text"
                    className="w-1/2 rounded border p-2"
                    placeholder="Value"
                    value={customVar.value}
                    onChange={(e) =>
                      handleCustomVariableChange(index, 'value', e.target.value)
                    }
                  />
                  <button
                    className="rounded bg-red-500 px-2 py-1 text-white"
                    onClick={() => handleRemoveCustomVariable(index)}
                  >
                    X
                  </button>
                </div>
              ))}
              <button
                className="mt-2 rounded bg-gray-300 p-2"
                onClick={handleAddCustomVariable}
              >
                + Add Custom Variable
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="rounded bg-gray-200 px-4 py-2"
                onClick={() => {
                  setSelectedTemplate(null)
                  setBotVariables([])
                }}
              >
                Back
              </button>
              <button
                className="rounded bg-green-500 px-4 py-2 text-white"
                onClick={handleSaveClientSecret}
              >
                Save ClientSecret
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
