import React, { useState } from "react";
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

const DeployTrigger = () => {
  const { selectedClientDeployment } = useClientProject();
  const { deployment } = useDeployStatus({
    clientRequestId: selectedClientDeployment?.originClientRequestId || "",
    sha: selectedClientDeployment?.sha || "",
  });
  console.log("deployment", deployment);
  const { append } = useMicrofoxChat();

  // If no clientDeployment, show deploy button
  if (!selectedClientDeployment) {
    return (
      <Button
        variant="outline"
        className="mx-2 flex items-center gap-2"
        onClick={() => handleDeploy("staging")}
      >
        <RocketIcon className="h-4 w-4" />
        <span>Deploy</span>
      </Button>
    );
  }

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
          return { text: "Local", color: "border-yellow-600 text-yellow-600" };
        }
      } else {
        return {
          text:
            deployment.status?.charAt(0)?.toUpperCase() +
            deployment.status?.slice(1),
          color: "border-blue-600 text-blue-600",
        };
      }
    } else {
      return {
        text: localState?.charAt(0)?.toUpperCase() + localState?.slice(1),
        color: "border-blue-600 text-blue-600",
      };
    }
  };

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
      case "local":
        deployStage = DEPLOY_STAGE.STAGING;
        buttonText = "Start Local Automation";
        break;
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
            value: targetStage === "local",
          },
        ]
      ),
      constructAppendBody("deployfox", {
        stage: deployStage,
        is_local: targetStage === "local",
      })
    );
  };

  const deploymentOptions = [
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
    {
      value: "local",
      label: "Local Testing",
      shortLabel: "Local",
      color: "border-yellow-600 text-yellow-600",
    },
  ];

  const currentDisplay = getCurrentDeploymentDisplay();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
            <RocketIcon className="h-4 w-4 mr-2" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DeployTrigger;
