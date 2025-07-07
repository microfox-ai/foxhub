import { UIMessage } from "@ai-sdk/react";

export const findLastElement = <T>(array: T[]) => {
  return array[array.length - 1];
};

export const findFirstElement = <T>(array: T[]) => {
  return array[0];
};

export const findLastElementWith = <T>(
  array: T[],
  predicate: (element: T) => boolean
) => {
  let new_array = array.filter(predicate);
  if (!new_array) {
    return null;
  }
  return new_array?.[new_array.length - 1];
};

export const cleanUiMessageParts = (
  messages: UIMessage<any, any>[],
  options?: {
    removeToolCalls?: boolean;
    onlyLastText?: boolean;
  }
) => {
  let processedMessages = messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => ("input" in p ? p : { ...p, input: {} })),
  }));

  //processedMessages = processedMessages.filter((m) => );

  if (options?.removeToolCalls) {
    processedMessages = processedMessages.map((m) => ({
      ...m,
      parts: m.parts.filter((p) => !p.type?.startsWith("tool-")),
    }));
  }

  if (options?.onlyLastText) {
    processedMessages = processedMessages.map((m) => ({
      ...m,
      parts: [
        findLastElementWith(m.parts, (p) => p.type === "text") || {
          type: "text",
          text: "",
          input: {},
        },
      ],
    }));
  }

  return processedMessages;
};
