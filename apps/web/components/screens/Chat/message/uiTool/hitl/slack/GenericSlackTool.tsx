import React from "react";
import { StringInput, BooleanInput } from "./InputHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GenericSlackToolProps {
  input: {
    body: any;
  };
  onInputChange: (input: any) => void;
  fields: Array<{
    key: string;
    label: string;
    type: "string" | "boolean" | "number";
    placeholder?: string;
  }>;
}

const GenericSlackTool: React.FC<GenericSlackToolProps> = ({
  input,
  onInputChange,
  fields,
}) => {
  const handleFieldChange = (key: string, value: any) => {
    onInputChange({
      ...input,
      body: {
        ...input?.body,
        [key]: value,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        switch (field.type) {
          case "string":
            return (
              <StringInput
                key={field.key}
                label={field.label}
                value={input?.body[field.key] || ""}
                onChange={(value) => handleFieldChange(field.key, value)}
                placeholder={field.placeholder}
              />
            );
          case "boolean":
            return (
              <BooleanInput
                key={field.key}
                label={field.label}
                value={input?.body[field.key] || false}
                onChange={(value) => handleFieldChange(field.key, value)}
              />
            );
          case "number":
            return (
              <div key={field.key} className="flex flex-col gap-2">
                <Label>{field.label}</Label>
                <Input
                  type="number"
                  value={input?.body[field.key] || ""}
                  onChange={(e) =>
                    handleFieldChange(field.key, parseInt(e.target.value) || 0)
                  }
                  placeholder={field.placeholder}
                />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};

export default GenericSlackTool;
