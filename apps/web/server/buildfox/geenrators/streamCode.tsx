import { models } from "@/server/models";
import { AiContext } from "@repo/ai-utils/router";
import { CallSettings, LanguageModel, PrepareStepFunction, Prompt, ProviderOptions, StopCondition, streamText, StreamTextOnChunkCallback, StreamTextOnErrorCallback, StreamTextOnFinishCallback, StreamTextTransform, TelemetrySettings, ToolCallRepairFunction, ToolChoice, ToolSet, StreamTextOnStepFinishCallback, IdGenerator, Output } from "ai";
import { codingSystemPrompt } from "../prompt.coding";
import { writeToFileSystemAndUpdateSteps } from "../tool/writeToFile";
import { ClientRequest } from "@prisma/client";


type StreamCodeProps<TOOLS extends ToolSet, OUTPUT = never, PARTIAL_OUTPUT = never> = CallSettings & Prompt & {
    /**
The language model to use.
     */
    model: LanguageModel;
    /**
The tools that the model can call. The model needs to support calling tools.
    */
    tools?: TOOLS;
    /**
The tool choice strategy. Default: 'auto'.
     */
    toolChoice?: ToolChoice<TOOLS>;
    /**
Condition for stopping the generation when there are tool results in the last step.
When the condition is an array, any of the conditions can be met to stop the generation.

@default stepCountIs(1)
     */
    stopWhen?: StopCondition<NoInfer<TOOLS>> | Array<StopCondition<NoInfer<TOOLS>>>;
    /**
Optional telemetry configuration (experimental).
     */
    experimental_telemetry?: TelemetrySettings;
    /**
Additional provider-specific options. They are passed through
to the provider from the AI SDK and enable provider-specific
functionality that can be fully encapsulated in the provider.
 */
    providerOptions?: ProviderOptions;
    /**
     * @deprecated Use `activeTools` instead.
     */
    experimental_activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
   Limits the tools that are available for the model to call without
   changing the tool call and result types in the result.
        */
    activeTools?: Array<keyof NoInfer<TOOLS>>;
    /**
Optional specification for parsing structured outputs from the LLM response.
     */
    experimental_output?: any;
    /**
Optional function that you can use to provide different settings for a step.

@param options - The options for the step.
@param options.steps - The steps that have been executed so far.
@param options.stepNumber - The number of the step that is being executed.
@param options.model - The model that is being used.

@returns An object that contains the settings for the step.
If you return undefined (or for undefined settings), the settings from the outer level will be used.
    */
    prepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    /**
A function that attempts to repair a tool call that failed to parse.
     */
    experimental_repairToolCall?: ToolCallRepairFunction<TOOLS>;
    /**
Optional stream transformations.
They are applied in the order they are provided.
The stream transformations must maintain the stream structure for streamText to work correctly.
     */
    experimental_transform?: StreamTextTransform<TOOLS> | Array<StreamTextTransform<TOOLS>>;
    /**
Whether to include raw chunks from the provider in the stream.
When enabled, you will receive raw chunks with type 'raw' that contain the unprocessed data from the provider.
This allows access to cutting-edge provider features not yet wrapped by the AI SDK.
Defaults to false.
     */
    includeRawChunks?: boolean;
    /**
Callback that is called for each chunk of the stream.
The stream processing will pause until the callback promise is resolved.
     */
    onChunk?: StreamTextOnChunkCallback<TOOLS>;
    /**
Callback that is invoked when an error occurs during streaming.
You can use it to log errors.
The stream processing will pause until the callback promise is resolved.
     */
    onError?: StreamTextOnErrorCallback;
    /**
Callback that is called when the LLM response and all request tool executions
(for tools that have an `execute` function) are finished.

The usage is the combined usage of all steps.
     */
    onFinish?: StreamTextOnFinishCallback<TOOLS>;
    /**
Callback that is called when each step (LLM call) is finished, including intermediate steps.
    */
    onStepFinish?: StreamTextOnStepFinishCallback<TOOLS>;
    /**
Internal. For test use only. May change without notice.
     */
    _internal?: {
        now?: () => number;
        generateId?: IdGenerator;
        currentDate?: () => Date;
    };
}

const codeParsingPrompt = `
The following is the format for yout to write code whenever you are requested/required to write code.


    - to write the code, use the following tools:
       - file_name is the name of the file to write to (MUST required)
       - file_name is the The complete file path to write to - relative to the project root (MUST required)
       - file_type is the type of the file to write  - ts, tsx, json, etc (MUST required)
       - file_content is the content of the file to write and is a MUST required in tool arguments, as it holds the actual code

    CRITICAL: The fileContent parameter is ABSOLUTELY MANDATORY and must contain the complete, actual code content of the file. 
    NEVER call write_code without providing the full fileContent parameter with the actual code inside it.
    The fileContent should contain the entire TypeScript/JavaScript code that you want to write to the file.


<code_parsing_prompt>
    <file_name>code.tsx</file_name>
    <file_name>src/components/code.tsx</file_path>
    <file_type>tsx</file_type>
    <file_content>
        import React from 'react';
        const App = () => {
            return (
                <div>
                    <h1>Hello, World!</h1>
                </div>
            );
        };
    </file_content>
</code_parsing_prompt>
`

export const streamCode = (props: StreamCodeProps<any, any, any>) => {

    return streamText({
        ...props,
        system: `${props.system}\n\n${codeParsingPrompt}`,
    });
}

export interface FileToWrite {
    fileName: string;
    filePath: string;
    fileType: string;
    fileContent: string;
}

export const parseGeneratedCode = (text: string): FileToWrite[] => {

    try {
        const files: FileToWrite[] = [];
        const pattern = /<code_parsing_prompt>([\s\S]*?)<\/code_parsing_prompt>/g;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            const block = match[1];

            if (!block) {
                continue;
            }

            const fileNameMatch = block.match(/<file_name>([\s\S]*?)<\/file_name>/);
            const filePathMatch = block.match(/<file_path>([\s\S]*?)<\/file_path>/);
            const fileTypeMatch = block.match(/<file_type>([\s\S]*?)<\/file_type>/);
            const fileContentMatch = block.match(/<file_content>([\s\S]*?)<\/file_content>/);

            const fileName = fileNameMatch?.[1]?.trim();
            const filePath = filePathMatch?.[1]?.trim();
            const fileType = fileTypeMatch?.[1]?.trim();
            const fileContent = fileContentMatch?.[1];

            if (fileName && filePath && fileType && typeof fileContent === 'string') {
                files.push({
                    fileName,
                    filePath,
                    fileType,
                    fileContent,
                });
            }
        }

        return files;
    } catch (error) {
        console.log("error", error);
        throw new Error("Failed to parse generated code");
    }
};


const writeToFile = async (file: FileToWrite, clientRequest: ClientRequest) => {
    try {
        // Validate fileContent is not empty or placeholder
        if (!file.fileContent || file.fileContent.trim().length === 0) {
            throw new Error(
                "fileContent parameter is required and cannot be empty. You must provide the complete, actual code content."
            );
        }

        console.log("file", file);
        // Check for common placeholder patterns
        const placeholderPatterns = [
            /\/\/\s*code\s*goes\s*here/i,
            /\/\/\s*todo/i,
            /\/\/\s*implement/i,
            /\/\/\s*placeholder/i,
            /\/\*\s*code\s*goes\s*here\s*\*\//i,
            /\/\*\s*todo\s*\*\//i,
        ];

        const hasPlaceholders = placeholderPatterns.some((pattern) =>
            pattern.test(file.fileContent)
        );
        // console.log(
        //   "hasPlaceholders",
        //   placeholderPatterns.map((p) => file.fileContent.match(p))
        // );
        if (hasPlaceholders) {
            throw new Error(
                "fileContent contains placeholder text. You must provide complete, working code, not placeholders or TODO comments."
            );
        }

        console.log(
            "updatedFileContent",
            //updatedFileContent,
            file.fileName,
            file.filePath,
            file.fileType
        );
        await writeToFileSystemAndUpdateSteps(
            {
                fileName: file.fileName,
                filePath: file.filePath,
                fileType: file.fileType,
                content: file.fileContent, //.replace(/\\`/g, "`").replace(/\\'/g, "'"),
                meta: {
                    //packagesUsed,
                    timestamp: new Date().toISOString(),
                },
            },
            clientRequest
        );
    } catch (error) {
        console.log("error", error);
        throw new Error("Failed to add file");
    }
    return {
        success: true,
        message: `File ${file.fileName} updated successfully`,
        filePath: file.filePath,
        fileType: file.fileType,
    };
}

export const writeGeneratedCodeToFs = async (files: FileToWrite[], clientRequest: ClientRequest) => {
    await Promise.all(files.map(file => writeToFile(file, clientRequest)));
}

