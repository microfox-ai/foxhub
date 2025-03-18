'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientRequest } from '@prisma/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMicrofoxChat } from '../hooks/useMicrofoxChat'
import { useClientSecrets } from '../providers/ClientSecretProvider'
import {
  FileUploadProvider,
  useFileUpload,
} from '../providers/FileUploadProvider'
import { AddClientSecretModal } from './AddClientSecretModal'
import ChatHeader from './ChatHeader'
import ChatInputBox from './ChatInputBox'
import { SlashModal } from './SlashModal'
import TabMessages from './TabMessages'
import UpdateHistoryTab from './UpdateHistoryTab'

export type AttachedMedia = {
  file: File
  preview: string
}

export default function ChatWindow({
  userId,
  clientRequest,
}: {
  userId: string
  clientRequest: ClientRequest
}) {
  // Chat state
  const [activeTab, setActiveTab] = useState('chat')
  // const [requestStatus, setRequestStatus] = useState(
  //   clientRequest?.requestStatus,
  // );
  // Global add bot modal states (for selecting a template and filling variables)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { mediaPayload, resetMedia } = useFileUpload()
  const {
    input,
    mutate,
    append,
    messages,
    isValidating,
    isLoading,
    messageStatus,
    handleInputChange,
    ...rest
  } = useMicrofoxChat({
    clientRequest,
    resetInputState: () => {
      resetMedia()
    },
  })

  // Reload client data when specific operations are completed
  const reloadClientData = async () => {
    try {
      await mutate()
    } catch (error) {
      console.error('Error reloading client data:', error)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Scroll to the bottom of the chat window
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = useCallback(async () => {
    await append(undefined, {
      //githubUrl: ((clientRequest as any)?.botProject as BotProject).githubRepoUrl,
      media: mediaPayload,
    })
  }, [append, mediaPayload])

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto">
      <ChatHeader
        clientRequest={clientRequest}
        mutate={mutate}
        isLoading={isLoading}
        isValidating={isValidating}
      />
      {/* Chat Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="relative flex h-full max-h-[75vh] flex-1 flex-col overflow-y-auto"
      >
        <div className="w-full px-4">
          <TabsList className="text-md flex w-full justify-evenly gap-4">
            <TabsTrigger className="w-full" value="chat">
              Chat
            </TabsTrigger>
            <TabsTrigger className="w-full" value="history">
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="chat"
          className="h-full max-h-[75vh] flex-1 space-y-4 overflow-y-auto p-4 pb-[100px]"
        >
          <TabMessages
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
        </TabsContent>

        <TabsContent
          value="history"
          className="flex-1 space-y-4 overflow-y-auto"
        >
          <UpdateHistoryTab messages={messages} isLoading={isLoading} />
        </TabsContent>

        {activeTab === 'chat' && (
          <ChatInputBox
            input={input}
            messageStatus={messageStatus}
            userId={userId}
            sendMessage={sendMessage}
            handleInputChange={handleInputChange}
          />
        )}
      </Tabs>

      {/* Slash Modal: Opened when input starts with '/' */}
      <SlashModal
        clientRequest={clientRequest}
        onSuccess={reloadClientData}
        onClose={() => {}}
      />

      {/* Global Add ClientSecret Modal */}
      <AddClientSecretModal
        clientRequest={clientRequest}
        userId={userId}
        onSuccess={reloadClientData}
      />
    </div>
  )
}
