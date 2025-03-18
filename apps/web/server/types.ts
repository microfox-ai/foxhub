export interface IMediaPayloadType {
  mediaName: string;
  mediaType: string;
  mediaFormat: string;
  mediaUrl: string;
}
[];

export enum dataStreamType {
  STATUS = "status",
  MESSAGE = "message",
  LOG = "log",
}
