import BotConfigUI from "../BotConfigUI";

interface ConfigurationTabProps {
  packageName: string;
  botConfig: any[];
  mode: "create" | "edit";
  botToEdit: any;
}

const ConfigurationTab = ({
  packageName,
  botConfig,
  mode,
  botToEdit,
}: ConfigurationTabProps) => {
  console.log(botConfig);
  if (!botConfig || botConfig.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No configuration options available
      </div>
    );
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

export default ConfigurationTab;
