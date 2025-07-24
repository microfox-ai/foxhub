import React, { useState } from "react";
import { StringInput, BooleanInput } from "./InputHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUpload from "./toolsUi/ImageUpload";
import { Button } from "@/components/ui/button";

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
    isIconUrl?: boolean;
  }>;
}

const GenericSlackTool: React.FC<GenericSlackToolProps> = ({
  input,
  onInputChange,
  fields,
}) => {
  const [showBotConfig, setShowBotConfig] = useState(false);
  const handleFieldChange = (key: string, value: any) => {
    onInputChange({
      ...input,
      body: {
        ...input?.body,
        [key]: value,
      },
    });
  };

  const botConfigFields = fields.filter(f => f.key === 'username' || f.key === 'icon_url');
  const regularFields = fields.filter(f => f.key !== 'username' && f.key !== 'icon_url');

  return (
    <div className="flex flex-col gap-4">
      {regularFields.map((field) => {
        if (field.isIconUrl) {
          return (
            <ImageUpload
              key={field.key}
              value={input?.body[field.key]}
              onImageSelect={(imageUrl: string | null) => handleFieldChange(field.key, imageUrl)}
            />
          );
        }
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
      {botConfigFields.length > 0 && (
        <>
          <Button variant="outline" onClick={() => setShowBotConfig(!showBotConfig)}>
            {showBotConfig ? "Hide Bot Config" : "Add Bot Config"}
          </Button>
          {showBotConfig && (
            <div className="flex flex-col gap-4 pt-4 border-t">
              {botConfigFields.map((field) => {
                if (field.isIconUrl) {
                  return (
                    <ImageUpload
                      key={field.key}
                      value={input?.body[field.key]}
                      onImageSelect={(imageUrl: string | null) => handleFieldChange(field.key, imageUrl)}
                    />
                  );
                }
                return (
                  <StringInput
                    key={field.key}
                    label={field.label}
                    value={input?.body[field.key] || ""}
                    onChange={(value) => handleFieldChange(field.key, value)}
                    placeholder={field.placeholder}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GenericSlackTool;
