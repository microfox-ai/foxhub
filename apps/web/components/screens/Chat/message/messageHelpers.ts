/**
 * Helper functions for constructing message objects for the chat interface
 */

/**
 * Constructs a message object from a button for appendMessage action
 */
export const constructMessageFromButton = (button: any) => {
  return {
    id: crypto.randomUUID(),
    content: button.value ?? button.text,
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: button.value ?? button.text,
      },
    ],
  };
};

export const constructAutoSubmitMessage = (autoSubmit: string) => {
  return {
    id: crypto.randomUUID(),
    content: autoSubmit,
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: autoSubmit,
      },
    ],
  };
};

export const constructAutoSubmitBody = (autoSubmitAnnotations: any[]) => {
  return autoSubmitAnnotations.reduce((acc: any, annotation: any) => {
    if (annotation.type === "body") {
      acc[annotation.key] = annotation.value;
      return acc;
    }
    return acc;
  }, {});
};

/**
 * Constructs a message object for shiftMinion action
 */
export const constructShiftMinionMessage = (button: any) => {
  return {
    id: crypto.randomUUID(),
    content: button.actionText ?? button.text ?? "Changing gears..",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: button.actionText ?? button.text ?? "Changing gears..",
      },
    ],
  };
};

/**
 * Constructs the body object for append function
 */
export const constructAppendBody = (minionType: string, extraProps?: any) => {
  return {
    body: {
      minionType,
      ...(extraProps ?? {}),
    },
  };
};
