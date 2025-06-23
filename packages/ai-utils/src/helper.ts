import { UIMessageStreamWriter } from "ai";

export const findLastElement = <T>(array: T[]) => {
  return array[array.length - 1];
};

export const findFirstElement = <T>(array: T[]) => {
  return array[0];
};

export class StreamWriter {
  static writeMessageAnnotation(annotation: any) {
    return {
      type: "message-metadata",
      messageMetadata: annotation,
    } as { type: "message-metadata"; messageMetadata: any };
  }
}
