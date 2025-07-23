import React, { useEffect, useState } from "react";
import { SelectInput, StringInput } from "../InputHelpers";
import { getChannelsIds, getChannelInfo } from '../dataFetchers';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import ImageUpload from "./ImageUpload";
import { Button } from "@/components/ui/button";

interface MessageChannelProps {
  input: {
    body: {
      channelId: string;
      text: string;
      username?: string;
      icon_url?: string;
    };
  };
  onInputChange: (input: any) => void;
}

const MessageChannel: React.FC<MessageChannelProps> = ({
  input,
  onInputChange,
}) => {
  const [channels, setChannels] = useState<{ value: string; label: string }[]>(
    []
  );
  const { clientRequestId } = useClientProject();
  const [loading, setLoading] = useState(true);
  const [showBotConfig, setShowBotConfig] = useState(false);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const channelsData = await getChannelsIds(selectedRequest.id);

        if (channelsData?.channels) {
          const channelOptions = channelsData.channels.map((c: any) => ({
            value: c.id,
            label: c.name
          }));

          if (input.body.channelId && !channelOptions.some(c => c.value === input.body.channelId)) {
            try {
              const channelInfo = await getChannelInfo(input.body.channelId, selectedRequest.id);
              if (channelInfo) {
                channelOptions.unshift({
                  value: channelInfo.id!,
                  label: channelInfo.name!
                });
              }
            } catch (error) {
              console.warn(`Failed to fetch info for channel ${input.body.channelId}:`, error);
            }
          }

          setChannels(channelOptions);
        }
      } catch (error) {
        console.error("Failed to fetch channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [input.body.channelId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading channels...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectInput
        label="Channel"
        value={input.body.channelId}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, channelId: value },
          })
        }
        options={channels}
        placeholder="Select a channel to message"
      />
      <div className="flex flex-col gap-2">
        <Label>Message</Label>
        <Textarea
          value={input.body.text}
          onChange={(e) =>
            onInputChange({
              ...input,
              body: { ...input.body, text: e.target.value },
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
            value={input.body.icon_url}
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

export default MessageChannel;
