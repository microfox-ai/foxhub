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
import { ClientSecretVariable } from "@/server/types";
import { Button } from "@/components/ui/button";
import {
  ImageIcon,
  UploadIcon,
  XIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@/utils/hooks/useUser";

interface SlackWebTinyConfigUIProps {
  configFields: ClientSecretVariable[];
}

const SlackWebTinyConfigUI: React.FC<SlackWebTinyConfigUIProps> = ({
  configFields,
}) => {
  const form = useFormContext();
  const [imagePreview, setImagePreview] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const { user } = useUser();

  const uploadImage = async (file: File, fieldKey: string) => {
    try {
      setIsUploading((prev) => ({ ...prev, [fieldKey]: true }));

      // Create FormData with the required fields
      const formData = new FormData();
      // Add the file multiple times to match the API expectation
      formData.append("file", file);
      formData.append("userId", user?.id || ""); // Replace with actual user ID
      formData.append("folderName", "customBots/botConfigs");

      // Send the request
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      if (!data.success || !data.media || data.media.length === 0) {
        throw new Error("Invalid response format");
      }

      // Get the URL from the first media item
      const uploadedUrl = data.media[0].mediaUrl;

      // Update form with the returned URL
      form.setValue(`config.${fieldKey}`, uploadedUrl);

      // Show success message
      toast.success("Image uploaded successfully");

      return uploadedUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setIsUploading((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const renderFormControl = (field: ClientSecretVariable, formField: any) => {
    switch (field.ui.type) {
      case "text":
        return (
          <Input
            {...formField}
            placeholder={field.ui.placeholder}
            type="text"
          />
        );
      case "number":
        return (
          <Input
            {...formField}
            placeholder={field.ui.placeholder}
            type="number"
          />
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
              <SelectValue placeholder={field.ui.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.ui.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multiSelect":
        return (
          <Select value={formField.value} onValueChange={formField.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.ui.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.ui.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "textarea":
        return <Textarea {...formField} placeholder={field.ui.placeholder} />;
      case "password":
        return (
          <div className="relative">
            <Input
              {...formField}
              placeholder={field.ui.placeholder}
              type={showPassword[field.key] ? "text" : "password"}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowPassword((prev) => ({
                    ...prev,
                    [field.key]: !prev[field.key],
                  }));
                }}
              >
                {showPassword[field.key] ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(formField.value);
                  toast.success("Password copied to clipboard");
                }}
              >
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      case "image":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Show preview immediately
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64String = reader.result as string;
                      setImagePreview((prev) => ({
                        ...prev,
                        [field.key]: base64String,
                      }));
                    };
                    reader.readAsDataURL(file);

                    // Upload the file
                    const uploadedUrl = await uploadImage(file, field.key);
                    if (uploadedUrl) {
                      formField.onChange(uploadedUrl);
                    }
                  }
                }}
                className="hidden"
                id={`image-upload-${field.key}`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  document.getElementById(`image-upload-${field.key}`)?.click()
                }
                disabled={isUploading[field.key]}
              >
                {isUploading[field.key] ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>

              {imagePreview[field.key] && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setImagePreview((prev) => {
                      const newState = { ...prev };
                      delete newState[field.key];
                      return newState;
                    });
                    formField.onChange("");
                  }}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>

            {imagePreview[field.key] && (
              <div className="mt-2 border rounded-md p-2">
                <img
                  src={imagePreview[field.key]}
                  alt="Preview"
                  className="max-h-40 object-contain"
                />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {configFields.map((field) => (
        <div key={field.key}>
          <FormField
            control={form.control}
            name={`config.${field.key}`}
            defaultValue={field.value}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.ui.label}</FormLabel>
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
  config?: ClientSecretVariable[];
}

const BotConfigUI: React.FC<BotConfigUIProps> = ({ packageName, config }) => {
  // switch (packageName) {
  // case "slack-web-tiny":
  return <SlackWebTinyConfigUI configFields={config || []} />;
  // default:
  // return null;
  // }
};

export default BotConfigUI;
