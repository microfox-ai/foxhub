import { Button } from "@/components/ui/button";
import { useMicrofox } from "../../providers/MicrofoxProvider";
import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UIAnnotation {
    objectType: string;
    object: Record<string, any>;
    text?: string;
    persona?: string;
    buttons?: any[];
}

const ActionButtons = (props: any) => {
    const { status, append, setInput, setMinionType } = useMicrofox();

    if (status === "streaming") {
        return null;
    }
    return (
        <div className="flex flex-col gap-2 my-4">
            <div className="flex flex-wrap gap-2">
                {props?.buttons?.map((button: any) => (
                    <Button
                        variant={"default"}
                        key={button.text} className={`text-sm text-black px-2 py-2 rounded-xl cursor-pointer ${button.className}`}
                        onClick={() => {
                            console.log("button", button);
                            if (button.action === "highlightInput") {
                            }
                            if (button.action === "appendMessage") {
                                setInput("")
                                append({
                                    id: crypto.randomUUID(),
                                    content: button.value ?? button.text,
                                    role: "user",
                                    parts: [{
                                        type: "text",
                                        text: button.value ?? button.text,
                                    }]
                                })
                            }
                            if (button.action === "shiftMinion") {
                                console.log("shiftMinion", button.value);
                                setMinionType(button.value);
                                setInput("");
                                append({
                                    id: crypto.randomUUID(),
                                    content: button.actionText ?? button.text ?? "Changing gears..",
                                    role: "user",
                                    parts: [{
                                        type: "text",
                                        text: button.actionText ?? button.text ?? "Changing gears..",
                                    }],
                                    annotations: [{
                                        type: "minion",
                                        value: button.value,
                                    }]
                                });
                            }
                        }}
                    >
                        {button.text}
                    </Button>
                ))}
            </div>
        </div>
    );
}

const TaskInfo = ({ uiAnnotation, idx }: { uiAnnotation: UIAnnotation, idx: number }) => {
    const object = uiAnnotation.object;
    return (
        <div key={uiAnnotation.objectType + idx} className="flex flex-col gap-2 p-2 px-4 bg-gray-100 my-2 rounded-lg">
            <h3 className="text-md uppercase font-bold tracking-widest text-gray-500">{uiAnnotation.objectType}</h3>
            {Object.keys(object).map((key: string) => {
                return (
                    <div key={key} className="flex flex-col">
                        <span className="font-bold text-xs tracking-wide text-gray-500">{key}</span>
                        <span className="text-sm">{object[key]}</span>
                    </div>
                );
            })}
            <ActionButtons buttons={uiAnnotation.buttons} />
        </div>
    );
}

const TaskIntegrations = ({ uiAnnotation, idx }: { uiAnnotation: UIAnnotation, idx: number }) => {
    const platforms = uiAnnotation.object?.platforms;
    const alternativePlatforms = uiAnnotation.object?.alternativePlatforms;
    return (
        <div key={uiAnnotation.objectType + idx} className="flex flex-col gap-2 p-2 px-4 bg-gray-100 my-2 rounded-lg">
            <h3 className="text-lg font-bold my-3">{uiAnnotation.text}</h3>
            <div className="flex flex-col gap-2">
                {platforms?.map((platform: any) => (
                    <div key={platform.name} className="flex flex-col gap-2">
                        <span className="font-bold text-xs tracking-wide text-black">{platform.package} - {platform.name}</span>
                        <span className="text-sm">{platform.reason}</span>
                        {alternativePlatforms && alternativePlatforms.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <span className="font-bold text-xs tracking-wide text-gray-500">Alternatives</span>
                                {alternativePlatforms.filter((alternative: any) => alternative.alternativeFor === platform.name).map((alternative: any) => (
                                    <span key={alternative.name} className="text-sm">{alternative.name}</span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <ActionButtons buttons={uiAnnotation.buttons} />
        </div>
    );
}

const TaskStructure = ({ uiAnnotation, idx }: { uiAnnotation: UIAnnotation, idx: number }) => {
    const object = uiAnnotation.object as TaskInstanceMetaType["taskStructure"];
    //console.log("object", object);
    return (
        <div key={uiAnnotation.objectType + idx} className="flex flex-col gap-2 p-0 px-4 bg-gray-100 rounded-lg">
            <h3 className="text-lg font-bold">{uiAnnotation.text}</h3>
            <Tabs defaultValue="endpoints" className="w-full">
                <TabsList className="flex flex-wrap gap-2 mb-8 justify-start items-center">
                    <TabsTrigger value="endpoints" className="">Endpoints</TabsTrigger>
                    <TabsTrigger value="lambdaFunctions">Triggers</TabsTrigger>
                    <TabsTrigger value="cronJobs">Scheduled Jobs</TabsTrigger>
                    <TabsTrigger value="interactions" className="">User Interactions</TabsTrigger>
                    <TabsTrigger value="schemas">Datatstore</TabsTrigger>
                </TabsList>
                <TabsContent value="schemas">
                    <div className="flex flex-col gap-2">
                        {object?.dbSchemas?.map((schema) => (
                            <div key={schema.modelName} className="flex flex-col gap-1">
                                <span className="font-bold text-xs tracking-wide text-gray-500">{schema.modelName}</span>
                                <pre className="text-xs bg-gray-50 p-2 rounded">
                                    {JSON.stringify(schema.jsonSchema, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="lambdaFunctions">
                    <div className="flex flex-col gap-2">
                        {object?.lambdaFunctions?.map((fn) => (
                            <div key={fn.name} className="flex flex-col gap-1">
                                <span className="font-bold text-xs tracking-wide text-gray-500">{fn.name}</span>
                                <span className="text-sm">{fn.description}</span>
                                <span className="text-xs text-gray-500">Result: {fn.endResult}</span>
                            </div>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="cronJobs">
                    <div className="flex flex-col gap-2">
                        {object?.cronJobs?.map((job) => (
                            <div key={job.name} className="flex flex-col gap-1">
                                <span className="font-bold text-xs tracking-wide text-gray-500">{job.name}</span>
                                <span className="text-sm">{job.description}</span>
                                <span className="text-xs text-gray-500">Result: {job.endResult}</span>
                            </div>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="endpoints">
                    <div className="flex flex-col gap-2">
                        {object?.endpoints?.map((endpoint) => (
                            <div key={endpoint.path + endpoint.method} className="flex flex-col gap-1">
                                <span className="font-bold text-xs tracking-wide text-gray-500">
                                    {endpoint.method} {endpoint.path}
                                </span>
                                <span className="text-sm">{endpoint.description}</span>
                            </div>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="interactions">
                    <div className="flex flex-col gap-2">
                        {object?.userInteractions?.map((interaction) => (
                            <div key={interaction.name} className="flex flex-col gap-1">
                                <span className="font-bold text-xs tracking-wide text-gray-500">{interaction.name}</span>
                                <span className="text-sm">{interaction.description}</span>
                                <span className="text-xs text-gray-500">Result: {interaction.endResult}</span>
                                <div className="text-xs text-gray-500">
                                    Endpoints: {interaction.endpointCall.join(", ")}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
            <ActionButtons buttons={uiAnnotation.buttons} />
        </div>
    );
}

export const AnnotationUIList = ({ uiAnnotations }: { uiAnnotations: UIAnnotation[] }) => {

    return uiAnnotations.map((uiAnnotation: UIAnnotation, idx: number) => {
        if (uiAnnotation.objectType === "taskInfo") {
            return <TaskInfo uiAnnotation={uiAnnotation} idx={idx} />
        }
        if (uiAnnotation.objectType === "taskIntegrations") {
            return <TaskIntegrations uiAnnotation={uiAnnotation} idx={idx} />
        }
        if (uiAnnotation.objectType === "taskStructure") {
            return <TaskStructure uiAnnotation={uiAnnotation} idx={idx} />
        }
        if (uiAnnotation.objectType === "buttons") {
            return <ActionButtons buttons={uiAnnotation.buttons} />
        }
    });
} 