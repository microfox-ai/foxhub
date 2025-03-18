'use client'

import { useUser } from '@/utils/hooks/useUser'
import { createContext, useContext, useState } from 'react'
import useSWR from 'swr'

export const BotTemplateContext = createContext<
  ReturnType<typeof useBotTemplateInit>
>(null as unknown as ReturnType<typeof useBotTemplateInit>)

export const useBotTemplateContext = () => {
  return useContext(BotTemplateContext)
}

// Provider component
export const BotTemplateProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const botTemplateValue = useBotTemplateInit()

  return (
    <BotTemplateContext.Provider value={botTemplateValue}>
      {children}
    </BotTemplateContext.Provider>
  )
}
export type BotTemplate = {
  id: string
  userId?: string
  type: string
  name: string
  requiredKeys: Array<{
    mode: Array<'DEV' | 'PROD' | 'STAGING'>
    isOptional: boolean
    key: string
    placeholder: string
  }>
}
const useBotTemplateInit = () => {
  const { user } = useUser()
  const [showAddBotModal, setShowAddBotModal] = useState(false)
  // Fetch client bot templates for the current client.
  const { data: templates } = useSWR<BotTemplate[]>(
    user?.id
      ? `/api/client-secrets/template?userId=${user.id}`
      : null, //Prevents fetch when user is not available
    (url: string) => fetch(url).then((res) => res.json())
  )

  return { templates, showAddBotModal, setShowAddBotModal }
}
