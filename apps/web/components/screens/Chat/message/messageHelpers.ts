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
    annotations: [
      {
        type: "minion",
        value: button.minionType,
      },
    ],
  };
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
    annotations: [
      {
        type: "minion",
        value: button.value,
      },
    ],
  };
};

/**
 * Constructs the body object for append function
 */
export const constructAppendBody = (minionType: string) => {
  return {
    body: {
      minionType,
    },
  };
};
