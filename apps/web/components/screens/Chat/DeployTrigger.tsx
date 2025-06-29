import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useClientProject } from "../providers/ClientProjectProvider";
import { useDeployStatus } from "../providers/useDeployStatus";
import { useMicrofoxChat } from "./MicrofoxChatProvider";
import { DEPLOY_STAGE } from "@prisma/client";
import { RocketIcon } from "lucide-react";
import {
  constructMessageFromButton,
  constructAppendBody,
} from "./message/messageHelpers";
import { IN_DEV } from "@/utils/constants/appInfo";
import { IN_STAGING } from "../../../utils/constants/appInfo";

const DeployTrigger = () => {
  const { selectedClientDeployment } = useClientProject();
  const { deployment } = useDeployStatus({
    clientRequestId: selectedClientDeployment?.originClientRequestId || "",
    sha: selectedClientDeployment?.sha || "",
  });
  const [currentDisplay, setCurrentDisplay] = useState<{
    text: string;
    color: string;
  } | null>({
    text: "Deploy",
    color: "border-gray-500 text-gray-600",
  });
  const { append } = useMicrofoxChat();

  useEffect(() => {
    // Determine current deployment status and display text
    const getCurrentDeploymentDisplay = () => {
      if (!deployment?._id) {
        return { text: "Deploy", color: "border-gray-500 text-gray-600" };
      }
      const localState = deployment.localState;
      const stage = deployment.stage;
      const status = deployment.status;
      console.log(localState, stage, status);
      if (!localState || localState === "awsLambda") {
        if (status === "deployed") {
          if (stage === "STAGING") {
            return { text: "Staging", color: "border-blue-600 text-blue-600" };
          } else if (stage === "PROD") {
            return {
              text: "Production",
              color: "border-green-500 text-green-600",
            };
          } else if (stage === "DEV") {
            return {
              text: "Local",
              color: "border-yellow-600 text-yellow-600",
            };
          }
        } else if (status === "failed") {
          return { text: "Failed", color: "border-red-500 text-red-600" };
        } else {
          return {
            text: status?.charAt(0)?.toUpperCase() + status?.slice(1),
            color: "border-blue-600 text-blue-600",
          };
        }
      } else if (localState === "active") {
        return {
          text: "Active",
          color: "border-green-500 text-green-600",
        };
      } else if (localState === "errored") {
        return {
          text: "Errored",
          color: "border-red-500 text-red-600",
        };
      } else if (localState === "stopped") {
        return {
          text: "Stopped",
          color: "border-gray-500 text-gray-600",
        };
      } else {
        return {
          text: localState?.charAt(0)?.toUpperCase() + localState?.slice(1),
          color: "border-blue-600 text-blue-600",
        };
      }
    };
    setCurrentDisplay(getCurrentDeploymentDisplay() || null);
  }, [deployment?.status, deployment?.localState, deployment?.stage]);

  const handleDeploy = (targetStage: string) => {
    let deployStage: DEPLOY_STAGE;
    let buttonText: string;

    switch (targetStage) {
      case "production":
        deployStage = DEPLOY_STAGE.PROD;
        buttonText = "Deploy to Production";
        break;
      case "staging":
        deployStage = DEPLOY_STAGE.STAGING;
        buttonText = "Deploy to Staging";
        break;
      // case "local":
      //   deployStage = DEPLOY_STAGE.STAGING;
      //   buttonText = "Deploy to Local";
      //   break;
      default:
        return;
    }

    append(
      constructMessageFromButton(
        {
          text: buttonText,
          minionType: "deployfox",
        },
        [
          {
            type: "attachment",
            key: "stage",
            value: deployStage,
          },
          {
            type: "attachment",
            key: "is_local",
            value: false, //targetStage === "local",
          },
        ]
      ),
      constructAppendBody("deployfox", {
        stage: deployStage,
        is_local: false, //targetStage === "local",
      })
    );
  };

  let deploymentOptions = [
    {
      value: "production",
      label: "Deploy to Production",
      shortLabel: "Production",
      color: "border-green-500 text-green-600",
    },
    {
      value: "staging",
      label: "Deploy to Staging",
      shortLabel: "Staging",
      color: "border-blue-600 text-blue-600",
    },
  ];

  // if (IN_STAGING) {
  //   deploymentOptions.push({
  //     value: "local",
  //     label: "Deploy to Local",
  //     shortLabel: "Local",
  //     color: "border-yellow-600 text-yellow-600",
  //   });
  // }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={!deployment?._id} asChild>
        <Button
          variant="outline"
          className={`mx-2 flex items-center gap-2 ${currentDisplay?.color}`}
        >
          <span>{currentDisplay?.text}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {deploymentOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleDeploy(option.value)}
            className={`cursor-pointer ${option.color}`}
          >
            <RocketIcon className={`h-4 w-4 mr-2 ${option.color}`} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DeployTrigger;
