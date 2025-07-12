import { ShardPage } from "@prisma/client";
import {
  ExtraEnvVariable,
  TaskInstanceMetaType,
  TaskIntegrationPlatform,
} from "../convertfox/helpers/types";
import { uiHitlMap } from "./uiHitl";

export interface Button {
  type: "confirm" | "deny";
  text: string;
  action?: {
    id: string;
    props?: any;
    actionText: string;
  };
  className?: string;
}

export type CardObject =
  | {
      objectType: "task_info";
      object: TaskInstanceMetaType["taskInfo"];
    }
  | {
      objectType: "task_integrations";
      object: TaskInstanceMetaType["taskIntegrations"];
    }
  | {
      objectType: "task_structure";
      object: TaskInstanceMetaType["taskStructure"];
    }
  | {
      objectType: "env_collector";
      object: {
        envVariables: Omit<ExtraEnvVariable, "ui">[];
      };
    }
  | {
      objectType: "deployments_info";
      object: {
        pingerInterval: number;
        stage: string;
        sha?: string;
      };
    }
  | {
      objectType: "hotfixes";
      object: {
        filesFixed: any[];
      };
    }
  | {
      objectType: "install_setup";
      object: {
        platforms: TaskIntegrationPlatform[];
        envVariablesUsed: string[];
        envVariablesCollect: Omit<ExtraEnvVariable, "ui">[];
      };
    }
  | {
      objectType: "publication_info";
      object: {
        shardPage: ShardPage;
      };
    };

export interface UiComponentProps {
  buttons_list: {
    uiType: "buttons_list";
    isUISticky?: boolean;
    buttonHeaderText?: string;
    buttons: Button[];
  };
  card: {
    uiType: "card";
    isUISticky?: boolean;
    text: string;
    description?: string;
    reason?: string;
    buttons?: Button[];
    object?: CardObject;
  };
  hitl: {
    uiType: "hitl";
  };
  hitl_output: {
    uiType: "hitl_output";
    object?: {
      [key in keyof uiHitlMap]?: uiHitlMap[key];
    };
  };
}
