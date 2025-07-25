import React, { useEffect, useState } from "react";
import { SelectInput, StringInput } from "../InputHelpers";
import { getChannelsIds, getChannelInfo } from '../dataFetchers';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { SlackChannel } from "../objects";
import { BotIdentity } from "./BotIdentity";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    if (channels.length > 0) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      if (!selectedRequest) return;
      try {
        setLoading(true);
        const channelsData = await getChannelsIds(selectedRequest.id);

        if (channelsData?.channels) {
          const channelsList = channelsData.channels.map((c: any) => ({
            id: c.id,
            name: c.name,
            value: c.id,
            label: c.name,
          }));

          // If a channelId is provided in the input, make sure it's in the list
          if (input.body.channelId && !channelsList.some(c => c.id === input.body.channelId)) {
            try {
              const channelInfo = await getChannelInfo(input.body.channelId, selectedRequest.id);
              if (channelInfo) {
                channelsList.unshift({
                  id: channelInfo.id,
                  name: channelInfo.name,
                  value: channelInfo.id,
                  label: channelInfo.name,
                });
              }
            } catch (error) {
              console.warn(`Failed to fetch info for channel ${input.body.channelId}:`, error);
            }
          }
          setChannels(channelsList);
        }
      } catch (error) {
        console.error("Failed to fetch channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [input.body.channelId]);

  const selectedId = channels.find(channel => channel.id === input.body.channelId)?.id;
  const setSelectedId = (value: string) => {
    const selectedChannel = channels.find(channel => channel.id === value);
    if (selectedChannel) {
      onInputChange({
        ...input,
        body: { ...input.body, channelId: selectedChannel.id },
      });
    }
  };

  if (!selectedRequest) {
    return <div className="text-sm text-gray-500">No request selected...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <BotIdentity
        iconUrl={input?.body?.icon_url ?? `${APP_BASE_URL}/logo-mini-color.png`}
        username={input.body.username ?? "Microfox"}
        onIconChange={(imageUrl) =>
          onInputChange({
            ...input,
            body: { ...input.body, icon_url: imageUrl?.trim() || undefined },
          })
        }
        onUsernameChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, username: value },
          })
        }
      />
      {loading ? (
        <div className="h-10 bg-gray-100 animate-pulse rounded-md" />
      ) : (
        <SelectInput<SlackChannel>
          label="Channel"
          value={selectedId || ""}
          onChange={setSelectedId}
          options={channels}
          getOptionValue={(channel) => channel.id}
          searchKeys={['name', 'id']}
          renderOption={(channel, isSelected) => (
            <div className="flex text-black/80 items-center gap-2">
              <div>
                <div>#{channel.name || channel.id}</div>
              </div>
              {isSelected && <Check className="ml-auto" />}
            </div>
          )}
          renderTrigger={(channel, placeholder) => (
            <Button variant="outline" className="w-full justify-start flex-nowrap">
              {channel ? (
                <div className="flex items-center justify-start gap-2">
                  <span>#{channel.name || channel.id}</span>
                </div>
              ) : (
                placeholder
              )}
            </Button>
          )}
          placeholder="Select a channel to message"
        />
      )}
      <div className="flex flex-col gap-2">
        <Label>Message</Label>
        <Textarea
          value={input.body.text || ""}
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
    </div>
  );
};

export default MessageChannel;
