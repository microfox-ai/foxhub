import { Button } from "@/components/ui/button";
import { useMicrofox } from "../../providers/MicrofoxProvider";
import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Target,
  TextQuote,
  FileText,
  Package,
  GitFork,
  ExternalLink,
  Key,
  Link,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex flex-wrap gap-2">
        {props?.buttons?.map((button: any) => (
          <Button
            variant={"outline"}
            key={button.text}
            className={cn(
              `
              text-sm font-medium px-4 py-2 rounded-lg 
              bg-white hover:bg-gray-50 
              text-gray-700 hover:text-gray-900
              border border-gray-200 hover:border-gray-300
              transition-colors duration-200
            `,
              button.className
            )}
            onClick={() => {
              console.log("button", button);
              if (button.action === "highlightInput") {
              }
              if (button.action === "appendMessage") {
                setInput("");
                append({
                  id: crypto.randomUUID(),
                  content: button.value ?? button.text,
                  role: "user",
                  parts: [
                    {
                      type: "text",
                      text: button.value ?? button.text,
                    },
                  ],
                });
              }
              if (button.action === "shiftMinion") {
                console.log("shiftMinion", button.value);
                setMinionType(button.value);
                setInput("");
                append({
                  id: crypto.randomUUID(),
                  content:
                    button.actionText ?? button.text ?? "Changing gears..",
                  role: "user",
                  parts: [
                    {
                      type: "text",
                      text:
                        button.actionText ?? button.text ?? "Changing gears..",
                    },
                  ]
                },
                  {
                    body: {
                      minionType: button.value,
                    },
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
};

const TaskInfo = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const object = uiAnnotation.object;

  const getIconForKey = (key: string) => {
    switch (key.toLowerCase()) {
      case "goal":
        return <Target className="w-5 h-5 text-blue-500" />;
      case "name":
        return <TextQuote className="w-5 h-5 text-purple-500" />;
      case "summary":
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-4 p-4 bg-white shadow-lg my-4 rounded-xl border border-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg uppercase font-bold tracking-wider text-gray-700 border-b pb-2">
        {uiAnnotation.objectType}
      </h3>
      <div className="space-y-4">
        {Object.keys(object).map((key: string) => {
          const icon = getIconForKey(key);
          return (
            <div key={key} className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                {icon}
                <span className="font-semibold text-base tracking-wide text-gray-700 capitalize">
                  {key}
                </span>
              </div>
              <span className="tracking-base pl-7 text-sm text-gray-600">
                {object[key]}
              </span>
            </div>
          );
        })}
      </div>
      <ActionButtons buttons={uiAnnotation.buttons} />
    </motion.div>
  );
};

const TaskIntegrations = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const platforms = uiAnnotation.object?.platforms;
  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-6 p-4 bg-white my-4 rounded-xl border border-gray-100 shadow-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-gray-900">
        {uiAnnotation.text || "Finalised the Integrations"}
      </h3>
      <div className="space-y-6">
        {platforms?.map((platform: any) => (
          <div
            key={platform.name}
            className="flex rounded-lg border p-4 flex-col gap-2"
          >
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-500 mt-2" />
              <div className="flex-1">
                <div className="flex items-center  justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {platform.name}
                    </span>
                    {platform.package && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        {platform.package}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                            onClick={() => {
                              console.log(
                                "Open API key modal for",
                                platform.name
                              );
                            }}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">API Keys</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-medium"
                      onClick={() => {
                        console.log("Connect to", platform.name);
                      }}
                    >
                      Connect
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{platform.reason}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ActionButtons buttons={uiAnnotation.buttons} />
    </motion.div>
  );
};

const TaskStructure = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const object = uiAnnotation.object as TaskInstanceMetaType["taskStructure"];
  //console.log("object", object);
  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-2 p-0 px-4 bg-gray-100 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-bold">{uiAnnotation.text}</h3>
      <Tabs defaultValue="lambdaFunctions" className="w-full">
        <TabsList className="flex flex-wrap gap-2 justify-start items-center">
          <TabsTrigger value="lambdaFunctions">Webhooks</TabsTrigger>
          <TabsTrigger value="cronJobs">Scheduled-Jobs</TabsTrigger>
          {/* <TabsTrigger value="interactions" className="">User Interactions</TabsTrigger> */}
          <TabsTrigger value="schemas">Datatstore</TabsTrigger>
        </TabsList>
        <TabsContent value="schemas">
          <div className="flex flex-col gap-2">
            {object?.dbSchemas?.map((schema) => (
              <div key={schema.modelName} className="flex flex-col gap-1">
                <span className="font-bold text-xs tracking-wide text-gray-500">
                  {schema.modelName}
                </span>
                <pre className="text-xs bg-gray-50 p-2 rounded">
                  {JSON.stringify(schema.jsonSchema, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="lambdaFunctions">
          <div className="flex flex-col gap-4">
            {object?.lambdaFunctions?.map((fn) => (
              <div key={fn.name} className="flex flex-col gap-1">
                <span className="font-bold text-sm tracking-wide text-black">
                  {fn.name}
                </span>
                <span className="text-xs text-gray-800">
                  {fn.method} {fn.path}
                </span>
                <ul className="list-disc pl-4 text-xs text-gray-500">
                  <li>What it does: {fn.description}</li>
                  <li>Result: {fn.endResult}</li>
                </ul>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="cronJobs">
          <div className="flex flex-col gap-2">
            {object?.cronJobs?.map((job) => (
              <div key={job.name} className="flex flex-col gap-1">
                <span className="font-bold text-xs tracking-wide text-gray-500">
                  {job.name}
                </span>
                <span className="text-sm">{job.description}</span>
                <span className="text-xs text-gray-500">
                  Result: {job.endResult}
                </span>
                <span className="text-xs text-gray-500">
                  Cron: {job.cronExpression}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
        {/* <TabsContent value="endpoints">
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
                </TabsContent> */}
        {/* <TabsContent value="interactions">
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
                </TabsContent> */}
      </Tabs>
      <ActionButtons buttons={uiAnnotation.buttons} />
    </motion.div>
  );
};

const EnvCollector = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const annotation = uiAnnotation as any;
  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-2 p-4 bg-white shadow-lg my-4 rounded-xl border border-gray-100"
    >
      <h3 className="text-lg uppercase font-bold tracking-wider text-gray-700 border-b pb-2">
        {uiAnnotation.text}
      </h3>
      <div className="flex flex-col gap-2">
        {annotation?.envVariablesUsed?.map((env: any) => (
          <span key={env}>{env}</span>
        ))}
      </div>
      <ActionButtons buttons={uiAnnotation.buttons} />
    </motion.div>
  );
};

export const AnnotationUIList = ({
  uiAnnotations,
}: {
  uiAnnotations: UIAnnotation[];
}) => {
  return uiAnnotations.map((uiAnnotation: UIAnnotation, idx: number) => {
    if (uiAnnotation.objectType === "taskInfo") {
      return (
        <TaskInfo
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "taskIntegrations") {
      return (
        <TaskIntegrations
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "taskStructure") {
      return (
        <TaskStructure
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "buttons") {
      return (
        <ActionButtons
          key={uiAnnotation.objectType + idx}
          buttons={uiAnnotation.buttons}
        />
      );
    }
    if (uiAnnotation.objectType === "envCollector") {
      return (
        <EnvCollector
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
  });
};

