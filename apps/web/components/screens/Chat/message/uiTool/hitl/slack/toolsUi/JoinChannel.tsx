import React, { useEffect, useState } from "react";
import { SelectInput } from "../InputHelpers";
import { getChannelsIds } from "../dataFetchers";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { SlackChannel } from "../objects";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JoinChannelProps {
  input: {
    body: {
      channelId: string;
    };
  };
  onInputChange: (input: any) => void;
}

const JoinChannel: React.FC<JoinChannelProps> = ({ input, onInputChange }) => {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedRequest) return;
      try {
        setLoading(true);
        const channelsData = await getChannelsIds(selectedRequest.id);

        if (channelsData?.channels) {
          setChannels(
            channelsData.channels.map((c: any) => ({
              id: c.id,
              name: c.name,
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
  }, [selectedRequest]);

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

  if (loading) {
    return <div className="h-10 bg-gray-100 animate-pulse rounded-md" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectInput<SlackChannel>
        label="Channel to Join"
        value={selectedId || ""}
        onChange={setSelectedId}
        options={channels}
        getOptionValue={(channel) => channel.id}
        searchKeys={['name', 'id']}
        renderOption={(channel, isSelected) => (
          <div className="flex text-black/80 items-center gap-2">
            <div>
              <div>{channel.name || channel.id}</div>
            </div>
            {isSelected && <Check className="ml-auto" />}
          </div>
        )}
        renderTrigger={(channel, placeholder) => (
          <Button variant="outline" className="w-full justify-start flex-nowrap">
            {channel ? (
              <div className="flex items-center justify-start gap-2">
                <span>{channel.name || channel.id}</span>
              </div>
            ) : (
              placeholder
            )}
          </Button>
        )}
        placeholder="Select a channel to join"
      />
    </div>
  );
};

export default JoinChannel;
