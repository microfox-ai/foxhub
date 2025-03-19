import { Message, UIMessage } from 'ai'
import { FileText } from 'lucide-react'
import dayjs from 'dayjs'
import { Skeleton } from '@mui/material'
import { getMessageClass } from './helpers/ui'
import { AnnotationType, ChatUIMessageWithTypes, MessageMetadata } from '../hooks/convertors'


interface TabMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}
export const MessageRenderer = ({ message, index, renderDateSeperator }: {
  message: UIMessage, index: number,
  renderDateSeperator: (currentDate: string) => React.ReactNode
}) => {

  const annotations = message.annotations;
  const core = annotations?.find((a) => (a as any).type === 'core');
  const metadata = (annotations?.find((a) => (a as any).type === 'metadata') as any)?.metadata as MessageMetadata;
  const systemType = annotations?.find((a) => (a as any).type === 'systemType');
  const minion = annotations?.find((a) => (a as any).type === 'minion');

  return (
    <div key={message.id}>
      {renderDateSeperator(
        new Date(message.createdAt!).toISOString()!)}
      {message.role === 'system' ? (
        <div className="my-2 text-center text-xs text-gray-600">
          {message.content} • {dayjs(message.createdAt).format('h:mm A')}
        </div>
      ) : (
        <div
          className={`flex items-start gap-3 ${(message.role as any) === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`relative max-w-xs rounded-lg p-3 pb-4 sm:max-w-md ${getMessageClass(message.role as any)}`}
          >
            <p>{message.content}</p>
            {metadata?.media && (
              <div className="mt-2 flex flex-wrap justify-evenly gap-2">
                {metadata.media.map((m: any, idx: number) =>
                  m?.mediaType?.startsWith('image') ? (
                    <img
                      key={idx}
                      src={m.mediaUrl}
                      alt={m.mediaName}
                      className={`rounded object-cover ${(message.role as any) === 'user' ? 'max-h-60' : 'max-h-20'}`}
                    />
                  ) : (
                    <a key={idx} href={m.mediaUrl} target="_blank">
                      <span className="flex items-center gap-1">
                        <FileText className="h-12 w-12 text-gray-600" />
                        {m.mediaName}
                      </span>
                    </a>
                  )
                )}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-2 text-[10px] ${(message.role as any) === 'user' ? 'text-white' : 'text-gray-500'}`}
            >
              {dayjs(message.createdAt).format('h:mm A')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TabMessages({
  messages,
  isLoading,
  messagesEndRef,
}: TabMessagesProps) {

  const renderDateSeparator = (currentDate: string, prevDate?: string) => {
    if (!prevDate || !dayjs(currentDate).isSame(prevDate, 'day')) {
      return (
        <div className="my-2 text-center text-xs font-semibold text-gray-500">
          {dayjs(currentDate).format('DD MMM YYYY')}
        </div>
      )
    }
    return null
  }



  return (
    <>
      {isLoading ? (
        <Skeleton variant="rectangular" width="100%" height={200} />
      ) : messages?.length > 0 ? (
        messages.map((update, index) => {
          return (
            <MessageRenderer
              message={update}
              index={index}
              renderDateSeperator={(currDate) => renderDateSeparator(
                currDate,
                index > 0
                  ? new Date(messages?.[index - 1]?.createdAt!).toISOString()!
                  : ''
              )}
            />
          )
        })
      ) : (
        <div className="text-center text-gray-500">
          No messages yet. Start the conversation!
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  )
}
