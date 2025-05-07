import {
  ClientSecretVariable,
  ClientSecretWithPackageInfo,
  ClientSecretPackageType,
} from "@/server/types";
import { Constructor } from "../../Chat/message/types";

export interface Bot extends ClientSecretWithPackageInfo {
  botConfigMapped: Record<string, any>;
  defaultConfig: ClientSecretVariable[];
  image?: string;
}

export const mapClientSecretToBot = (d: ClientSecretWithPackageInfo): Bot => ({
  ...d,
  image: (d.botConfig as any[]).find(
    (c: ClientSecretVariable) => c?.ui?.type === "image"
  )?.value as string,
  botConfigMapped: (d.botConfig as any[]).reduce(
    (acc, curr: ClientSecretVariable) => {
      acc[curr.key] = curr.value;
      return acc;
    },
    {} as Record<string, any>
  ),
  defaultConfig:
    (d.packageInfo?.constructors.find(
      (c: Constructor) =>
        c.auth.toLowerCase() === ClientSecretPackageType.APIKEY
    )?.botConfig as any[]) ?? [],
});
