import React, { useEffect, useState } from "react";
import { MultiSelectInput, StringInput } from "../InputHelpers";
import { getChannelsIds } from "../dataFetchers";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { Button } from "@/components/ui/button";
import ImageUpload from "./ImageUpload";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { CheckCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BotIdentity } from "./BotIdentity";

interface SlackChannel {
  id: string;
  name: string;
}

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
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const channelsData = await getChannelsIds(selectedRequest?.id);

        if (channelsData?.channels) {
          setChannels(
            channelsData.channels.map((c: any) => ({
              id: c.id,
              name: c.name,
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
  }, [selectedRequest?.id]);

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="flex flex-col gap-2">
          <Label>Channels to Message</Label>
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ) : (
        <MultiSelectInput<SlackChannel>
          label="Channels to Message"
          values={channels.filter((channel) => input?.body?.channelIds?.includes(channel.id)) || []}
          onChange={(values) =>
            onInputChange({
              ...input,
              body: { ...input?.body, channelIds: values.map(v => v.id).filter(Boolean) },
            })
          }
          options={channels}
          placeholder="Select channels to send messages to"
          getOptionValue={(channel) => channel.id}
          searchKeys={['name', 'id']}
          renderOption={(channel, isSelected) => (
            <div className="text-sm text-black flex flex-row items-center gap-2">
              <span>#{channel.name}</span>
              {isSelected && <CheckCircle className="w-3 h-3" />}
            </div>
          )}
          renderBadge={(channel, remove) => (
            <div className="text-sm text-white flex flex-row items-center gap-2 border border-neutral-400 rounded-md p-1">
              <span>#{channel.name}</span>
              <div className="cursor-pointer rounded-md" onClick={() => remove()}>
                <X className="w-3 h-3" />
              </div>
            </div>
          )}
        />
      )}
      <p className="text-xs opacity-50">
        Can't see your channel? Make sure to add microfox to channel to give it access ( Slack disables us by default )
      </p>
      <div className="flex flex-col gap-2 mt-6">
        <BotIdentity
          iconUrl={input?.body?.icon_url ?? `${APP_BASE_URL}/logo-mini-color.png`}
          username={input.body.username || "Microfox"}
          onIconChange={(imageUrl) =>
            onInputChange({
              ...input,
              body: { ...input.body, icon_url: imageUrl || undefined },
            })
          }
          onUsernameChange={(value) =>
            onInputChange({
              ...input,
              body: { ...input.body, username: value },
            })
          }
        />
        <Textarea
          value={input?.body?.text ?? ""}
          onChange={(e) =>
            onInputChange({
              ...input,
              body: { ...input?.body, text: e.target.value },
            })
          }
          className="bg-white text-black p-2"
          placeholder="Enter your message"
          rows={3}
        />
      </div>
    </div>
  );
};

export default MessageChannels;
