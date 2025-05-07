import { Constructor, Package } from "../../Chat/message/types";
import BotConfigUI from "../BotConfigUI";
import { componentMap } from "../components/map";

interface ConfigurationTabProps {
  packageName: string;
  mode: "create" | "edit";
  botToEdit: any;
  selectedConstructor?: Constructor;
}

const ConfigDetailsForm = ({
  packageName,
  mode,
  botToEdit,
  selectedConstructor,
}: ConfigurationTabProps) => {

  const botConfig =
    mode === "create"
      ? selectedConstructor?.botConfig
      : botToEdit?.packageInfo?.constructors[0]?.botConfig;

  if (!botConfig || botConfig.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No configuration options available
      </div>
    );
  }

  if (selectedConstructor?.botConfigComponent && componentMap[selectedConstructor?.botConfigComponent as keyof typeof componentMap]) {
    const Component = componentMap[selectedConstructor?.botConfigComponent as keyof typeof componentMap];
    return (
      <div className="space-y-2">
        <Component config={botConfig} packageConstructor={selectedConstructor} />
      </div>
    )
  }


  return (
    <div className="space-y-2">
      <BotConfigUI
        packageName={
          mode === "create"
            ? packageName?.split("/")[1]
            : botToEdit?.packageInfo?.name.split("/")[1]
        }
        config={botConfig}
      />
    </div>
  );
};

export default ConfigDetailsForm;
