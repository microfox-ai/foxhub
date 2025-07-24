import React, { useEffect, useState } from "react";
import { MultiSelectInput, StringInput } from "../InputHelpers";
import { getChannelsIds } from "../dataFetchers";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { Button } from "@/components/ui/button";
import ImageUpload from "./ImageUpload";

interface MessageChannelsProps {
  input: {
    body: {
      channelIds: string[];
      text: string;
      username?: string;
      icon_url?: string;
    };
  };
  onInputChange: (input: any) => void;
}

const MessageChannels: React.FC<MessageChannelsProps> = ({
  input,
  onInputChange,
}) => {
  const [channels, setChannels] = useState<{ value: string; label: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showBotConfig, setShowBotConfig] = useState(false);
  const { selectedRequest } = useClientProject();
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const channelsData = await getChannelsIds(selectedRequest?.id);

        if (channelsData?.channels) {
          setChannels(
            channelsData.channels.map((c: any) => ({
              value: c.id,
              label: c.name,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to fetch channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading channels...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <MultiSelectInput
        label="Channels to Message"
        values={input?.body?.channelIds ?? []}
        onChange={(values) =>
          onInputChange({
            ...input,
            body: { ...input?.body, channelIds: values },
          })
        }
        options={channels}
        placeholder="Select channels to send messages to"
      />
      <div className="flex flex-col gap-2">
        <Label>Message</Label>
        <Textarea
          value={input?.body?.text ?? ""}
          onChange={(e) =>
            onInputChange({
              ...input,
              body: { ...input?.body, text: e.target.value },
            })
          }
          placeholder="Enter your message"
          rows={3}
        />
      </div>
      <Button variant="outline" onClick={() => setShowBotConfig(!showBotConfig)}>
        {showBotConfig ? "Hide Bot Config" : "Add Bot Config"}
      </Button>
      {showBotConfig && (
        <div className="flex flex-col gap-4 pt-4 border-t">
          <StringInput
            label="Username (optional)"
            value={input.body.username || ""}
            onChange={(value) =>
              onInputChange({
                ...input,
                body: { ...input.body, username: value },
              })
            }
            placeholder="Enter a username to override the default"
          />
          <ImageUpload
            onImageSelect={(imageUrl) =>
              onInputChange({
                ...input,
                body: { ...input.body, icon_url: imageUrl },
              })
            }
          />
        </div>
      )}
    </div>
  );
};

export default MessageChannels;
