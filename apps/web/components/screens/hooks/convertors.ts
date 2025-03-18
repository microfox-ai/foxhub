import { ChatUIMessage } from '@prisma/client';
import { JSONValue, UIMessage } from 'ai';
import { extraMetadata } from './useMicrofoxChat';

export interface ChatUIMessageWithTypes
  extends Omit<ChatUIMessage, 'role' | 'context' | 'minionType'> {
  role: UIMessage['role'] | 'gitComment' | 'sysUpdate';
  context: 'chat' | 'server';
  minionType?:
    | 'hello'
    | 'convert'
    | 'build'
    | 'test'
    | 'deploy'
    | 'review'
    | 'package'
    | null;
}

export const mapChatUIMessageToVercelUIMessage = (
  apiResponse: ChatUIMessageWithTypes,
): UIMessage => {
  const { id, role, content, createdAt, ...rest } = apiResponse;

  // If role is not a standard UIMessage role type, default to 'assistant'
  const uiMessageRole = ['user', 'assistant', 'system', 'function'].includes(
    role,
  )
    ? (role as UIMessage['role'])
    : 'assistant';

  return {
    id,
    role: uiMessageRole,
    content,
    createdAt,
    parts: rest.parts as any,
    annotations: [rest.metadata as any],
  };
};

export const mapVercelUIMessageToChatUIMessage = (
  vercelUIMessage: UIMessage,
  options: {
    extraData?: extraMetadata;
    minionType?: ChatUIMessageWithTypes['minionType'];
    userId: string;
    originClientRequestId: string;
  },
): ChatUIMessageWithTypes => {
  return {
    ...vercelUIMessage,
    metadata: options.extraData ? (options.extraData as any) : null,
    context: 'chat',
    minionType: options.minionType,
    attachments: [],
    userId: options.userId,
    originClientRequestId: options.originClientRequestId,
    updatedAt: new Date(),
  } as any;
};
