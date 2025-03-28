import {
  CoreMessage,
  createDataStreamResponse,
  DataStreamWriter,
  Message,
} from "ai";

//RULES - omit finish on 1st merge
// result1.mergeIntoDataStream(dataStream, {
//     experimental_sendFinish: false, // omit the finish event
//   });

// RULES - omit start & finish on every other merge
// result1.mergeIntoDataStream(dataStream, {
//     experimental_sendStart: false, // omit the start event
//     experimental_sendFinish: false, // omit the finish event
//   });

// RULES - send only finish on last merge
// result1.mergeIntoDataStream(dataStream, {
//     experimental_sendFinish: true, // send the finish event
//   });

// HOW?: how to end data stream? - when a particular tool call is triggered ?

export interface defaultRequestBody {
  messages: CoreMessage[] | Omit<Message, "id">[] | undefined;
}

export interface defaultCallbackResultBody {
  isLast: boolean;
  isFirst: boolean;
  blockNextSteps: boolean;
}

export interface StreamingFucntionProps<T, W> {
  dataStream: DataStreamWriter;
  requestBody: T & defaultRequestBody;
  responseBody: W & defaultCallbackResultBody;
}

export interface ServerStreamingFunction<T, W> {
  (
    stuff: StreamingFucntionProps<T, W>
  ): Promise<ServerStreamingCallbackResult<T, W>>;
}

export type ServerStreamingCallbackResult<T, W> = {
  responseBody: W & defaultCallbackResultBody;
  appendRequestBody: T & defaultRequestBody;
};

export class ServerStreamingRouter<T, W> {
  private paths: Record<string, ServerStreamingFunction<T, W>> = {};
  private routing: (requestBody: T & defaultRequestBody) => string[] = () => [];

  private _onError: (_error: unknown) => string = () => "Unknown error";

  addPath(path: string, callback: ServerStreamingFunction<T, W>) {
    this.paths[path] = callback;
  }

  setRouting(routing: (requestBody: T & defaultRequestBody) => string[]) {
    this.routing = routing;
  }

  onError(error: (_error: unknown) => string) {
    this._onError = error;
  }

  execute(requestBody: T & defaultRequestBody, response?: ResponseInit) {
    return createDataStreamResponse({
      ...(response && { ...response }),
      execute: async (dataStream) => {
        let responseBody: W & defaultCallbackResultBody = {
          isLast: false,
          isFirst: true,
        } as W & defaultCallbackResultBody;
        let appendRequestBody = requestBody;
        const pathsInSequence = this.routing(requestBody);
        for (let i = 0; i < pathsInSequence.length; i++) {
          const path = pathsInSequence[i];
          if (!path) continue;
          const callback = this.paths[path];
          if (callback) {
            const responseBodyFull = await callback({
              dataStream,
              requestBody: { ...requestBody, ...appendRequestBody },
              responseBody: {
                ...responseBody,
                isLast: i === pathsInSequence.length - 1,
              },
            });
            if (responseBodyFull?.responseBody?.blockNextSteps) {
              break;
            }
            if (responseBodyFull) {
              responseBody = responseBodyFull?.responseBody;
              appendRequestBody = responseBodyFull?.appendRequestBody;
            }
          }
        }
        return;
      },
      onError: (error) => {
        return this._onError(error as unknown);
      },
    });
  }
}
