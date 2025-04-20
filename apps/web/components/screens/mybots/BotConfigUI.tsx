import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface ConfigField {
  label: string;
  type: "text" | "number" | "boolean" | "select" | "textarea";
  field: string;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
  value?: any;
}

interface SlackWebTinyConfigUIProps {
  configFields: ConfigField[];
}

const SlackWebTinyConfigUI: React.FC<SlackWebTinyConfigUIProps> = ({
  configFields,
}) => {
  const form = useFormContext();

  const renderFormControl = (field: ConfigField, formField: any) => {
    switch (field.type) {
      case "text":
        return (
          <Input {...formField} placeholder={field.placeholder} type="text" />
        );
      case "number":
        return (
          <Input {...formField} placeholder={field.placeholder} type="number" />
        );
      case "boolean":
        return (
          <Checkbox
            checked={formField.value}
            onCheckedChange={formField.onChange}
          />
        );
      case "select":
        return (
          <Select value={formField.value} onValueChange={formField.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "textarea":
        return <Textarea {...formField} placeholder={field.placeholder} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {configFields.map((field) => (
        <div key={field.field}>
          <FormField
            control={form.control}
            name={`config.${field.field}`}
            defaultValue={field.value}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>{renderFormControl(field, formField)}</FormControl>
                {field.description && (
                  <p className="text-xs text-gray-500">{field.description}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ))}
    </div>
  );
};

interface BotConfigUIProps {
  packageName: string | undefined | null;
  config?: ConfigField[];
}

const BotConfigUI: React.FC<BotConfigUIProps> = ({ packageName, config }) => {
  switch (packageName) {
    case "slack-web-tiny":
      return <SlackWebTinyConfigUI configFields={config || []} />;
    default:
      return null;
  }
};

export default BotConfigUI;
